import { db } from "@/lib/db";

export type PromoResolution =
  | {
      ok: true;
      code: string;
      type: "percent" | "fixed";
      value: number;
      discount: number;
    }
  | { ok: false; error: string };

/**
 * Validate a promo code against a subtotal and compute the discount.
 * Shared by the checkout validation endpoint and order placement.
 */
export async function resolvePromo(
  rawCode: unknown,
  subtotal: number
): Promise<PromoResolution> {
  if (rawCode === undefined || rawCode === null || rawCode === "") {
    return { ok: true, code: "", type: "percent", value: 0, discount: 0 };
  }

  const code = String(rawCode).trim().toUpperCase();
  if (!code) {
    return { ok: true, code: "", type: "percent", value: 0, discount: 0 };
  }

  const promo = await db.promoCode.findUnique({ where: { code } });
  if (!promo) {
    return { ok: false, error: `Promo code “${code}” does not exist.` };
  }
  if (!promo.active) {
    return { ok: false, error: `Promo code “${code}” is no longer active.` };
  }
  if (subtotal < promo.minOrder) {
    return {
      ok: false,
      error: `“${code}” requires a minimum order of Rs ${promo.minOrder.toLocaleString("en-US")}.`,
    };
  }

  const discount =
    promo.type === "percent"
      ? Math.round(subtotal * (promo.value / 100))
      : Math.min(promo.value, subtotal);

  return {
    ok: true,
    code: promo.code,
    type: promo.type as "percent" | "fixed",
    value: promo.value,
    discount,
  };
}
