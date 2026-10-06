import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/auth/me — current session user (or null). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ success: true, user: null });
  }
}
