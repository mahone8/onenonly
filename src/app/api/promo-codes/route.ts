import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** Admin: list promo codes */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const codes = await db.promoCode.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, codes });
  } catch (error) {
    console.error("GET /api/promo-codes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch promo codes" },
      { status: 500 }
    );
  }
}

/** Admin: create a promo code */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

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

    const errors: string[] = [];
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code))
      errors.push(
        "Code must be 3–24 characters (letters, numbers, hyphen or underscore)."
      );

    const type = String(body.type ?? "");
    if (!["percent", "fixed"].includes(type))
      errors.push("Type must be percent or fixed.");

    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0)
      errors.push("Value must be a positive number.");
    if (type === "percent" && Number.isFinite(value) && value > 90)
      errors.push("Percent discount cannot exceed 90%.");

    const minOrder = Number(body.minOrder ?? 0);
    if (!Number.isFinite(minOrder) || minOrder < 0)
      errors.push("Minimum order must be a non-negative number.");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(" ") },
        { status: 400 }
      );
    }

    const exists = await db.promoCode.findUnique({ where: { code } });
    if (exists) {
      return NextResponse.json(
        { success: false, error: `Code “${code}” already exists.` },
        { status: 409 }
      );
    }

    const promoCode = await db.promoCode.create({
      data: { code, type, value, minOrder, active: true },
    });

    return NextResponse.json({ success: true, promoCode }, { status: 201 });
  } catch (error) {
    console.error("POST /api/promo-codes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create promo code" },
      { status: 500 }
    );
  }
}
