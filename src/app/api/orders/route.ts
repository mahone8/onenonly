import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { resolvePromo } from "@/lib/promo";
import { shippingFor } from "@/lib/store-config";

type IncomingItem = { productId?: unknown; qty?: unknown };

function generateOrderNo(): string {
  return `ONO-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 90 + 10
  )}`;
}

/* ---------------- Customer: place a COD order (sign-in required) ---------------- */

export async function POST(req: NextRequest) {
  try {
    // Only signed-in customers can place orders — keeps checkout serious.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to place your order." },
        { status: 401 }
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

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : null;
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim().slice(0, 500)
        : null;

    const errors: string[] = [];
    if (name.length < 2) errors.push("Full name is required.");
    if (phone.replace(/\D/g, "").length < 10)
      errors.push("A valid phone number is required (e.g. 0300 1234567).");
    if (address.length < 5) errors.push("A complete street address is required.");
    if (!city) errors.push("City is required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("Email address looks invalid.");

    const rawItems = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];
    const wanted = new Map<string, number>();
    for (const it of rawItems) {
      const productId = typeof it.productId === "string" ? it.productId : "";
      const qty = Number(it.qty);
      if (!productId || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
        errors.push("Cart contains an invalid item.");
        continue;
      }
      wanted.set(productId, (wanted.get(productId) ?? 0) + qty);
    }
    if (wanted.size === 0 && errors.length === 0)
      errors.push("Your cart is empty.");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(" ") },
        { status: 400 }
      );
    }

    // Everything price-related is computed server-side from the DB.
    const ids = [...wanted.keys()];
    const products = await db.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lineItems = [...wanted.entries()].map(([productId, qty]) => {
      const p = byId.get(productId);
      return { product: p, productId, qty };
    });

    const missing = lineItems.filter((li) => !li.product);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Some items in your cart are no longer available." },
        { status: 400 }
      );
    }

    const outOfStock = lineItems.filter(
      (li) => li.product!.stock < li.qty
    );
    if (outOfStock.length > 0) {
      const names = outOfStock
        .map((li) => `${li.product!.name} (${li.product!.stock} left)`)
        .join(", ");
      return NextResponse.json(
        { success: false, error: `Not enough stock for: ${names}.` },
        { status: 400 }
      );
    }

    const subtotal = lineItems.reduce(
      (acc, li) => acc + li.product!.price * li.qty,
      0
    );

    // Promo code (validated server-side)
    const promo = await resolvePromo(body.promoCode, subtotal);
    if (!promo.ok) {
      return NextResponse.json(
        { success: false, error: promo.error },
        { status: 400 }
      );
    }
    const discount = promo.discount;
    const shipping = shippingFor(subtotal - discount);
    const total = subtotal - discount + shipping;

    const orderNo = generateOrderNo();

    const order = await db.$transaction(async (tx) => {
      // Re-check and decrement stock atomically
      for (const li of lineItems) {
        const updated = await tx.product.updateMany({
          where: { id: li.productId, stock: { gte: li.qty } },
          data: { stock: { decrement: li.qty } },
        });
        if (updated.count === 0) {
          throw new Error(
            `Stock changed while placing your order — please retry (${li.product!.name}).`
          );
        }
      }

      if (promo.code) {
        await tx.promoCode.update({
          where: { code: promo.code },
          data: { usedCount: { increment: 1 } },
        });
      }

      return tx.order.create({
        data: {
          orderNo,
          userId: user.id,
          name,
          phone,
          email: email || user.email,
          address,
          city,
          notes,
          subtotal,
          discount,
          promoCode: promo.code || null,
          shipping,
          total,
          paymentMethod: "COD",
          status: "pending",
          items: {
            create: lineItems.map((li) => ({
              productId: li.productId,
              name: li.product!.name,
              price: li.product!.price,
              qty: li.qty,
              image: li.product!.image,
            })),
          },
        },
        include: { items: true },
      });
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Stock changed")
        ? error.message
        : "Failed to place order.";
    if (!(error instanceof Error && error.message.includes("Stock changed"))) {
      console.error("POST /api/orders error:", error);
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && error.message.includes("Stock changed") ? 409 : 500 }
    );
  }
}

/* ---------------- Account: list my orders ----------------
 * GET /api/orders?mine=1 → the signed-in customer's order history.
 * Without ?mine=1 the route stays admin-only (status filter supported).
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("mine") === "1") {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to continue." },
        { status: 401 }
      );
    }
    try {
      const orders = await db.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      });
      return NextResponse.json({ success: true, orders });
    } catch (error) {
      console.error("GET /api/orders?mine error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch your orders" },
        { status: 500 }
      );
    }
  }

  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — admin sign-in required." },
      { status: 401 }
    );
  }

  try {
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
