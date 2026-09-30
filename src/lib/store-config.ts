/** Shared store configuration for OneNOnly (Faisalabad, Pakistan). */

export const STORE_NAME = "ONENONLY";
export const STORE_CITY = "Faisalabad";
export const STORE_COUNTRY = "Pakistan";
export const STORE_PHONE = "+92 300 000 0000";

/** Cash on Delivery is the primary payment method. */
export const PAYMENT_METHOD = "COD";

/** Delivery is free above this order subtotal (in PKR). */
export const FREE_SHIPPING_THRESHOLD = 5000;

/** Flat delivery fee (in PKR) applied below the free-shipping threshold. */
export const SHIPPING_FEE = 199;

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function shippingFor(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD
    ? 0
    : SHIPPING_FEE;
}
