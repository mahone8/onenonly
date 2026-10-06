import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  setSessionCookie,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/user-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/login — customer sign-in with phone (03XX…) or email.
 * Rate limited per IP; generic error message avoids account enumeration.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many attempts. Try again in ${Math.ceil(
          rl.retryAfterSec / 60
        )} minutes.`,
      },
      { status: 429 }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Enter your phone/email and password." },
        { status: 400 }
      );
    }

    // Accept either an email or a phone number as the identifier.
    const { value: phone } = normalizePhone(identifier);
    const email = identifier.includes("@")
      ? identifier.toLowerCase()
      : "␀not-an-email␀";

    const user = await db.user.findFirst({
      where: phone ? { phone } : { email },
    });

    if (!user || user.role === "admin" || !(await verifyPassword(password, user.passwordHash))) {
      // Constant-ish work + delay to blunt timing and brute-force attacks.
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        { success: false, error: "Incorrect phone/email or password." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true, user: toSafeUser(user) });
    setSessionCookie(res, user.id);
    return res;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "Sign in failed — please try again." },
      { status: 500 }
    );
  }
}
