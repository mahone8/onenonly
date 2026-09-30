import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ensureBootstrapAdmin,
  setAdminCookie,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/login — admin sign-in (email + password).
 *  - Password is bcrypt-hashed in the database; sessions are signed httpOnly
 *    cookies whose role is re-checked server-side on every admin request.
 *  - Rate limited: 5 attempts per 10 minutes per IP.
 *  - Bootstrap: while the store has NO admin account, signing in with the
 *    ADMIN_PASSWORD from .env claims the panel for the email entered.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`admin-login:${ip}`, 5, 10 * 60 * 1000);
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
    let body: { email?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !email.includes("@") || !password) {
      return NextResponse.json(
        { success: false, error: "Enter your admin email and password." },
        { status: 400 }
      );
    }

    const admin = await db.user.findFirst({
      where: { role: "admin", email },
    });

    if (admin) {
      if (!(await verifyPassword(password, admin.passwordHash))) {
        await new Promise((r) => setTimeout(r, 500));
        return NextResponse.json(
          { success: false, error: "Incorrect email or password." },
          { status: 401 }
        );
      }
      const res = NextResponse.json({ success: true, name: admin.name });
      setAdminCookie(res, admin.id);
      return res;
    }

    // No match among existing admins — allow first-run bootstrap claim.
    const claimed = await ensureBootstrapAdmin(email, password);
    if (claimed) {
      const res = NextResponse.json({
        success: true,
        name: claimed.name,
        bootstrapped: true,
      });
      setAdminCookie(res, claimed.id);
      return res;
    }

    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json(
      { success: false, error: "Incorrect email or password." },
      { status: 401 }
    );
  } catch (error) {
    console.error("POST /api/admin/login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed." },
      { status: 500 }
    );
  }
}
