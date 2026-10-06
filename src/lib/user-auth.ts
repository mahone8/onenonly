import { createHmac, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hydrateEnv } from "@/lib/env";
import { toSafeUser, type SafeUser } from "@/lib/auth";

hydrateEnv();

export type FieldErrors = Record<string, string>;

export function validateName(name: unknown): string {
  const n = typeof name === "string" ? name.trim() : "";
  if (n.length < 2 || n.length > 80) return "Please enter your full name.";
  return "";
}

/** Pakistani mobile numbers: 03XXXXXXXXX / +92 3XX XXXXXXX → stored as +92… */
export function normalizePhone(raw: unknown): { value: string; error: string } {
  const p = typeof raw === "string" ? raw.replace(/[\s-]/g, "") : "";
  if (!p) return { value: "", error: "Please enter your mobile number." };
  let normalized = p;
  if (normalized.startsWith("+92")) normalized = `0${normalized.slice(3)}`;
  if (!/^03\d{9}$/.test(normalized))
    return {
      value: "",
      error: "Enter a valid Pakistani mobile number (03XX XXXXXXX).",
    };
  return { value: `+92${normalized.slice(1)}`, error: "" };
}

export function validateEmail(email: unknown): { value: string; error: string } {
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!e) return { value: "", error: "Email is required for order updates." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 254)
    return { value: "", error: "Please enter a valid email address." };
  return { value: e, error: "" };
}

export function validatePassword(pw: unknown): string {
  const p = typeof pw === "string" ? pw : "";
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (p.length > 128) return "Password is too long.";
  return "";
}

/**
 * Creates the email verification token row update and returns the
 * verification URL. Delivery:
 *  - RESEND_API_KEY set  → sent via Resend HTTP API (no SDK needed)
 *  - otherwise           → logged to the server console (dev mode); the
 *                          signup/login response also carries the link so
 *                          it is testable until a mailer is configured.
 */
export async function issueEmailVerification(
  userId: string,
  email: string,
  name: string
): Promise<{ verificationUrl: string; emailed: boolean }> {
  const token = randomBytes(32).toString("hex");
  const hashed = createHmac("sha256", process.env.ADMIN_SECRET || "ono")
    .update(token)
    .digest("hex");
  await db.user.update({
    where: { id: userId },
    data: {
      emailVerifyToken: hashed,
      emailVerifyExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const verificationUrl = `${base}/api/auth/verify?token=${token}`;
  const subject = "Verify your One N Only account";
  const html = `<p>Hi ${name},</p><p>Confirm your email to finish setting up your One N Only account:</p><p><a href="${verificationUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`;

  let emailed = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || "One N Only <onboarding@resend.dev>",
          to: email,
          subject,
          html,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error("Resend error:", await res.text());
    } catch (err) {
      console.error("Verification email failed:", err);
    }
  }
  if (!emailed) {
    console.log(
      `[verify] Email delivery not configured — verification link for ${email}: ${verificationUrl}`
    );
  }
  return { verificationUrl, emailed };
}

/** Consume a verification token (hashed lookup). */
export async function consumeVerificationToken(
  token: string
): Promise<SafeUser | null> {
  const hashed = createHmac("sha256", process.env.ADMIN_SECRET || "ono")
    .update(token)
    .digest("hex");
  const user = await db.user.findUnique({
    where: { emailVerifyToken: hashed },
  });
  if (!user || !user.emailVerifyExp || user.emailVerifyExp < new Date())
    return null;
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      emailVerifyToken: null,
      emailVerifyExp: null,
    },
  });
  return toSafeUser(updated);
}
