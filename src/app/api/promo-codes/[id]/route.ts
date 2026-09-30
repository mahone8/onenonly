import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/** Admin: update a promo code (activate/deactivate or edit value/minOrder) */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;

    const existing = await db.promoCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Promo code not found" },
        { status: 404 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    if (body.active !== undefined) {
      data.active = body.active === true || body.active === "true";
    }
    if (body.value !== undefined) {
      const value = Number(body.value);
      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        (existing.type === "percent" && value > 90)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              existing.type === "percent"
                ? "Percent discount must be between 0 and 90."
                : "Value must be a positive number.",
          },
          { status: 400 }
        );
      }
      data.value = value;
    }
    if (body.minOrder !== undefined) {
      const minOrder = Number(body.minOrder);
      if (!Number.isFinite(minOrder) || minOrder < 0) {
        return NextResponse.json(
          { success: false, error: "Minimum order must be non-negative." },
          { status: 400 }
        );
      }
      data.minOrder = minOrder;
    }

    const promoCode = await db.promoCode.update({ where: { id }, data });
    return NextResponse.json({ success: true, promoCode });
  } catch (error) {
    console.error("PATCH /api/promo-codes/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update promo code" },
      { status: 500 }
    );
  }
}

/** Admin: delete a promo code */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    await db.promoCode.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/promo-codes/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete promo code" },
      { status: 500 }
    );
  }
}
