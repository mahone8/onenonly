"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  TicketPercent,
  Truck,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useCart,
  cartCount,
  cartSubtotal,
} from "@/lib/cart-store";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/store-config";
import { toast } from "sonner";
import Link from "next/link";
import { fmtPrice } from "./types";
import { useStore } from "./store-context";
import { useSession } from "./use-session";

type PlacedOrder = {
  orderNo: string;
  total: number;
  city: string;
};

type AppliedPromo = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  discount: number;
};

export function CheckoutDialog() {
  const { checkoutOpen, setCheckoutOpen } = useStore();
  const { user, loading: sessionLoading } = useSession();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const [city, setCity] = useState("Faisalabad");

  const subtotal = cartSubtotal(items);
  const discount = promo?.discount ?? 0;
  const shipping =
    subtotal - discount >= FREE_SHIPPING_THRESHOLD || subtotal === 0
      ? 0
      : SHIPPING_FEE;
  const total = subtotal - discount + shipping;

  // Reset promo when the cart is emptied or the dialog reopens
  useEffect(() => {
    if (!checkoutOpen) {
      setPromoInput("");
      setPromoError("");
    }
  }, [checkoutOpen]);

  const close = () => {
    setCheckoutOpen(false);
    // allow closing animation before resetting confirmation state
    setTimeout(() => setPlaced(null), 300);
  };

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoError("Enter a promo code first.");
      return;
    }
    setPromoBusy(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPromo(null);
        setPromoError(data.error || "This promo code cannot be applied.");
        return;
      }
      setPromo({
        code: data.code,
        type: data.type,
        value: data.value,
        discount: data.discount,
      });
      toast.success(
        `${data.code} applied — you save ${fmtPrice(data.discount)}!`
      );
    } catch {
      setPromoError("Could not check this code. Please try again.");
    } finally {
      setPromoBusy(false);
    }
  }

  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      address: fd.get("address"),
      city,
      notes: fd.get("notes"),
      items: items.map((i) => ({ productId: i.id, qty: i.qty })),
      promoCode: promo?.code ?? "",
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order failed");
      }
      setPlaced({
        orderNo: data.order.orderNo,
        total: data.order.total,
        city: String(payload.city),
      });
      clear();
      setPromo(null);
      setPromoInput("");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "h-11 rounded-lg";

  // Sign-in gate: only serious (signed-in) buyers check out.
  const authGate = !sessionLoading && !user;

  return (
    <Dialog
      open={checkoutOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-2xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        {authGate ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Lock className="h-8 w-8 text-amber-700" />
            </div>
            <DialogHeader className="items-center space-y-2 mt-4">
              <DialogTitle className="font-display text-2xl font-bold text-zinc-950">
                Sign in to place your order
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 max-w-sm mx-auto">
                Accounts keep your order history, saved address and let you
                track every delivery — it takes less than a minute.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                className="h-12 px-10 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                <Link href="/login?next=checkout">Sign in</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 px-10 rounded-full border-zinc-950"
              >
                <Link href="/signup?next=checkout">Create account</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-zinc-400">
              Your cart is saved — it will be waiting after you sign in.
            </p>
          </div>
        ) : placed ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader className="items-center space-y-2 mt-4">
              <DialogTitle className="font-display text-2xl font-bold text-zinc-950">
                Order placed!
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 max-w-sm mx-auto">
                Thank you for shopping with ONENONLY. We will call you shortly
                on your phone number to confirm the order.
              </DialogDescription>
            </DialogHeader>
            <div className="mx-auto mt-6 max-w-xs rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order number</span>
                <span className="font-bold text-zinc-950">{placed.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cash to pay on delivery</span>
                <span className="font-bold text-zinc-950">
                  {fmtPrice(placed.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment method</span>
                <span className="font-semibold text-zinc-950">
                  Cash on Delivery
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Est. delivery</span>
                <span className="font-semibold text-zinc-950">
                  {placed.city.toLowerCase() === "faisalabad"
                    ? "1–2 days"
                    : "2–4 days"}
                </span>
              </div>
            </div>
            <Button
              onClick={close}
              className="mt-6 h-12 px-10 rounded-full bg-zinc-950 text-white hover:bg-amber-600"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-bold">
                Checkout
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-xs">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                Your details are only used to deliver your order.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="mt-2 space-y-5">
              {/* Contact */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Contact
                </legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-name">Full name *</Label>
                    <Input
                      id="co-name"
                      name="name"
                      required
                      defaultValue={user?.name ?? ""}
                      placeholder="Ahmed Raza"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-phone">Phone *</Label>
                    <Input
                      id="co-phone"
                      name="phone"
                      type="tel"
                      required
                      defaultValue={user?.phone ?? ""}
                      placeholder="0300 1234567"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-email">Email (optional)</Label>
                  <Input
                    id="co-email"
                    name="email"
                    type="email"
                    defaultValue={user?.email ?? ""}
                    placeholder="you@email.com"
                    className={inputCls}
                  />
                </div>
              </fieldset>

              <Separator />

              {/* Shipping */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Delivery address
                </legend>
                <div className="space-y-1.5">
                  <Label htmlFor="co-address">Street address *</Label>
                  <Input
                    id="co-address"
                    name="address"
                    required
                    defaultValue={user?.addressLine ?? ""}
                    placeholder="House 12, Street 4, Peoples Colony"
                    className={inputCls}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-city">City *</Label>
                    <Input
                      id="co-city"
                      name="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Faisalabad"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-notes">Delivery notes</Label>
                    <Input
                      id="co-notes"
                      name="notes"
                      placeholder="Landmark, timing…"
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
                  We deliver nationwide across Pakistan from our Faisalabad
                  store.
                </p>
              </fieldset>

              <Separator />

              {/* Promo code */}
              <fieldset className="space-y-3">
                <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <TicketPercent className="h-3.5 w-3.5 text-amber-600" />
                  Promo code
                </legend>
                {promo ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeCheck className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-800">
                        {promo.code}
                      </span>
                      <span className="text-green-700">
                        {promo.type === "percent"
                          ? `−${promo.value}%`
                          : `−${fmtPrice(promo.value)}`}{" "}
                        applied
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removePromo}
                      aria-label="Remove promo code"
                      className="text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError("");
                        }}
                        placeholder="e.g. ONE10"
                        aria-label="Promo code"
                        className={`${inputCls} uppercase`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyPromo}
                        disabled={promoBusy || items.length === 0}
                        className="h-11 px-6 shrink-0"
                      >
                        {promoBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-600" role="alert">
                        {promoError}
                      </p>
                    )}
                  </>
                )}
              </fieldset>

              <Separator />

              {/* Payment: Cash on Delivery */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Payment
                </legend>
                <div className="flex items-start gap-3 rounded-xl border-2 border-amber-600 bg-amber-50 px-4 py-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                      Cash on Delivery
                      <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        RECOMMENDED
                      </span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      Pay in cash when your order arrives at your doorstep. Our
                      courier will call you before delivery — inspect your
                      order, then pay. No advance payment required.
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* Summary + submit */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">
                    Subtotal ({cartCount(items)} item{cartCount(items) === 1 ? "" : "s"})
                  </span>
                  <span className="font-semibold">{fmtPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount ({promo?.code})</span>
                    <span className="font-semibold">−{fmtPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Delivery</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-green-700">FREE</span>
                    ) : (
                      fmtPrice(shipping)
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total (cash on delivery)</span>
                  <span>{fmtPrice(total)}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full h-12 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Place Order · {fmtPrice(total)}
                  </>
                )}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                <Truck className="h-3.5 w-3.5" />
                Free delivery on orders over {fmtPrice(FREE_SHIPPING_THRESHOLD)}
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
