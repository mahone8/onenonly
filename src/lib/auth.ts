import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hydrateEnv } from "@/lib/env";

hydrateEnv();

/** Admin session cookie (signed, httpOnly). */
export const ADMIN_COOKIE = "ono_admin";
/** Customer session cookie (signed, httpOnly). */
export const SESSION_COOKIE = "ono_session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 12;

function secret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SECRET is missing or too short — set it in .env (openssl rand -hex 32)."
    );
  }
  return s;
}

/* ---------------- passwords (bcrypt, never stored in plain text) ------------- */

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Constant-time string comparison for bootstrap secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/* ---------------- signed session tokens ----------------
 * Token format: "<userId>.<expiryMs>.<hmac256(userId.expiryMs, secret)>"
 * The user's role is re-checked server-side on every request, so demoting
 * or deleting a user invalidates their admin access immediately.
 */

function sign(userId: string, exp: number): string {
  const sig = createHmac("sha256", secret())
    .update(`${userId}.${exp}`)
    .digest("hex");
  return `${userId}.${exp}.${sig}`;
}

function verifyToken(
  token: string | undefined | null
): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return null;
  const expected = createHmac("sha256", secret())
    .update(`${userId}.${expStr}`)
    .digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userId };
}

export function sessionCookieOptions(maxAgeSec = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
    secure: process.env.NODE_ENV === "production",
  };
}

export function setSessionCookie(res: NextResponse, userId: string) {
  const exp = Date.now() + SESSION_TTL_MS;
  res.cookies.set(SESSION_COOKIE, sign(userId, exp), sessionCookieOptions());
}

export function setAdminCookie(res: NextResponse, userId: string) {
  const exp = Date.now() + SESSION_TTL_MS;
  res.cookies.set(ADMIN_COOKIE, sign(userId, exp), sessionCookieOptions());
}

export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { ...sessionCookieOptions(0) });
}

/* ---------------- current user helpers ---------------- */

export type SafeUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  addressLine: string | null;
  city: string | null;
  emailVerified: boolean;
  createdAt: Date;
};

export function toSafeUser(u: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  addressLine: string | null;
  city: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}): SafeUser {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    role: u.role,
    addressLine: u.addressLine,
    city: u.city,
    emailVerified: u.emailVerifiedAt !== null,
    createdAt: u.createdAt,
  };
}

/** Customer (or admin) from the customer session cookie. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const parsed = verifyToken(store.get(SESSION_COOKIE)?.value);
  if (!parsed) return null;
  const user = await db.user.findUnique({ where: { id: parsed.userId } });
  if (!user) return null;
  return toSafeUser(user);
}

/**
 * Server-side admin check: resolves the admin cookie to a real user row and
 * verifies role === "admin" in the database on EVERY call — a stolen/old
 * cookie for a demoted or deleted account grants nothing.
 */
export async function getAdminUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const parsed = verifyToken(store.get(ADMIN_COOKIE)?.value);
  if (!parsed) return null;
  const user = await db.user.findUnique({ where: { id: parsed.userId } });
  if (!user || user.role !== "admin") return null;
  return toSafeUser(user);
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * Returns a 401 response when the caller is not an authenticated admin,
 * otherwise null (i.e. request may proceed).
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json(
    { success: false, error: "Unauthorized — admin sign-in required." },
    { status: 401 }
  );
}

/** Returns a 401 response when there is no signed-in user. */
export async function requireUser(): Promise<NextResponse | null> {
  if (await getCurrentUser()) return null;
  return NextResponse.json(
    { success: false, error: "Please sign in to continue." },
    { status: 401 }
  );
}

/* ---------------- first-admin bootstrap ---------------- */

/**
 * When the deployment has NO admin account yet, the first person to sign in
 * at /admin with the ADMIN_PASSWORD from .env claims the panel: an admin
 * user is created for the email they entered (bcrypt-hashed password).
 * Afterwards ADMIN_PASSWORD no longer grants access — change it in .env or
 * remove it once the admin password is set from the account page.
 */
export async function ensureBootstrapAdmin(
  email: string,
  password: string
): Promise<SafeUser | null> {
  const adminCount = await db.user.count({ where: { role: "admin" } });
  if (adminCount > 0) return null;

  const bootstrap = process.env.ADMIN_PASSWORD;
  if (!bootstrap || !safeEqual(password, bootstrap)) return null;

  const user = await db.user.create({
    data: {
      name: "Store Admin",
      email: email.toLowerCase(),
      phone: `admin-${randomBytes(6).toString("hex")}`,
      passwordHash: await hashPassword(password),
      role: "admin",
      emailVerifiedAt: new Date(),
    },
  });
  return toSafeUser(user);
}
