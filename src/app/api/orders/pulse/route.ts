import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/orders/pulse — public "social proof" counter.
 * Returns ONLY an aggregate count of real orders placed in the last 30
 * minutes (cancelled orders excluded). No customer data, no fake numbers —
 * the storefront hides the badge entirely when the count is 0.
 */
export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const count = await db.order.count({
      where: { createdAt: { gte: since }, NOT: { status: "cancelled" } },
    });
    return NextResponse.json(
      { success: true, count },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/orders/pulse error:", error);
    return NextResponse.json({ success: true, count: 0 });
  }
}
