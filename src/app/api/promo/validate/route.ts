import { NextRequest, NextResponse } from "next/server";
import { resolvePromo } from "@/lib/promo";

/** Public: validate a promo code against a subtotal (checkout "Apply"). */
export async function POST(req: NextRequest) {
  try {
    let body: { code?: unknown; subtotal?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid cart subtotal." },
        { status: 400 }
      );
    }

    const result = await resolvePromo(body.code, subtotal);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      type: result.type,
      value: result.value,
      discount: result.discount,
    });
  } catch (error) {
    console.error("POST /api/promo/validate error:", error);
    return NextResponse.json(
      { success: false, error: "Could not validate promo code." },
      { status: 500 }
    );
  }
}
