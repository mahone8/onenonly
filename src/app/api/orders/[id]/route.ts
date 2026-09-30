import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES, OrderStatus } from "@/lib/store-config";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;

    let body: { status?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const status = String(body.status ?? "") as OrderStatus;
    if (!ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid order status." },
        { status: 400 }
      );
    }

    const existing = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Restock when an order that wasn't cancelled gets cancelled
    if (status === "cancelled" && existing.status !== "cancelled") {
      await db.$transaction(async (tx) => {
        for (const item of existing.items) {
          if (!item.productId) continue;
          await tx.product
            .update({
              where: { id: item.productId },
              data: { stock: { increment: item.qty } },
            })
            .catch(() => {
              /* product may have been deleted — ignore */
            });
        }
        await tx.order.update({ where: { id }, data: { status } });
      });
    } else {
      await db.order.update({ where: { id }, data: { status } });
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    await db.order.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
