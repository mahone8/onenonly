import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  setSessionCookie,
  toSafeUser,
} from "@/lib/auth";
import {
  issueEmailVerification,
  normalizePhone,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/user-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/signup — create a customer account.
 * Spam protections: honeypot field, per-IP rate limit (5/hour), validated
 * inputs, unique phone/email, bcrypt-hashed password (never stored plain).
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many sign-up attempts. Try again in ${Math.ceil(
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

    // Honeypot: real users never fill this hidden field — bots do. Drop silently.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true, user: null });
    }

    const nameErr = validateName(body.name);
    const { value: phone, error: phoneErr } = normalizePhone(body.phone);
    const { value: email, error: emailErr } = validateEmail(body.email);
    const passErr = validatePassword(body.password);

    const fieldErrors: Record<string, string> = {};
    if (nameErr) fieldErrors.name = nameErr;
    if (phoneErr) fieldErrors.phone = phoneErr;
    if (emailErr) fieldErrors.email = emailErr;
    if (passErr) fieldErrors.password = passErr;
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { success: false, error: "Please fix the highlighted fields.", fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ phone }, { email }] },
      select: { phone: true, email: true },
    });
    if (existing) {
      const clash: Record<string, string> = {};
      if (existing.phone === phone) clash.phone = "This number already has an account — sign in instead.";
      if (existing.email === email) clash.email = "This email is already registered — sign in instead.";
      return NextResponse.json(
        { success: false, error: "Account already exists.", fieldErrors: clash },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        name: String(body.name).trim(),
        phone,
        email,
        passwordHash: await hashPassword(String(body.password)),
        role: "customer",
      },
    });

    const { verificationUrl, emailed } = await issueEmailVerification(
      user.id,
      email,
      user.name
    );

    const res = NextResponse.json({
      success: true,
      user: toSafeUser(user),
      // Only expose the verification link while no mail provider is configured.
      verificationUrl: emailed ? undefined : verificationUrl,
      verificationEmailed: emailed,
    });
    setSessionCookie(res, user.id);
    return res;
  } catch (error) {
    console.error("POST /api/auth/signup error:", error);
    return NextResponse.json(
      { success: false, error: "Sign up failed — please try again." },
      { status: 500 }
    );
  }
}
