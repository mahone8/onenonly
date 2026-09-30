import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/user-auth";

/**
 * GET /api/auth/verify?token=… — consume an email verification link and
 * redirect the user to their account page with the result.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) {
    return NextResponse.redirect(new URL("/account?verification=invalid", req.url));
  }
  try {
    const user = await consumeVerificationToken(token);
    if (!user) {
      return NextResponse.redirect(
        new URL("/account?verification=expired", req.url)
      );
    }
    return NextResponse.redirect(new URL("/account?verification=ok", req.url));
  } catch (error) {
    console.error("GET /api/auth/verify error:", error);
    return NextResponse.redirect(new URL("/account?verification=error", req.url));
  }
}
