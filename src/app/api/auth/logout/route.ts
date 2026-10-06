import { NextResponse } from "next/server";
import { clearCookie, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearCookie(res, SESSION_COOKIE);
  return res;
}
