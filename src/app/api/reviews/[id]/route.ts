import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/** Admin: delete a review and decrement the product's review counter. */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const review = await db.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    await db.$transaction([
      db.review.delete({ where: { id } }),
      db.product.update({
        where: { id: review.productId },
        data: { reviews: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/reviews/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
