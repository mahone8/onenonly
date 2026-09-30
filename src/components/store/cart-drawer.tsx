"use client";

import Image from "next/image";
import {
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  useCart,
  cartCount,
  cartSubtotal,
  cartShipping,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/cart-store";
import { fmtPrice } from "./types";
import { useStore } from "./store-context";

export function CartDrawer() {
  const { setCheckoutOpen } = useStore();
  const items = useCart((s) => s.items);
  const isOpen = useCart((s) => s.isOpen);
  const closeCart = useCart((s) => s.closeCart);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const count = cartCount(items);
  const subtotal = cartSubtotal(items);
  const shipping = cartShipping(items);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-zinc-200 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="font-display text-xl font-bold flex items-center gap-2">
            Your Cart
            {count > 0 && (
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Shopping cart items and checkout summary
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <ShoppingBag className="h-7 w-7 text-zinc-400" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-zinc-950">
              Your cart is empty
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Add something you love — caps, wallets, watches and more.
            </p>
            <Button
              onClick={closeCart}
              className="mt-6 h-11 px-8 rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200">
              {remaining > 0 ? (
                <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-amber-600 shrink-0" />
                  You&apos;re <b>{fmtPrice(remaining)}</b> away from{" "}
                  <b>free shipping</b>
                </p>
              ) : (
                <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  You&apos;ve unlocked free nationwide delivery
                </p>
              )}
              <Progress
                value={progress}
                className="mt-2 h-1.5 bg-zinc-200 [&>div]:bg-amber-600"
              />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {item.name}
                        </p>
                        <p className="text-xs text-zinc-400 capitalize">
                          {item.category}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-zinc-200">
                        <button
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-zinc-950"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => setQty(item.id, item.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-zinc-950"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-zinc-950">
                        {fmtPrice(item.price * item.qty)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t border-zinc-200 px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-semibold text-zinc-950">
                  {fmtPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Shipping</span>
                <span className="font-semibold text-zinc-950">
                  {shipping === 0 ? (
                    <span className="text-green-700">FREE</span>
                  ) : (
                    fmtPrice(shipping)
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{fmtPrice(subtotal + shipping)}</span>
              </div>
              <Button
                onClick={() => {
                  closeCart();
                  setCheckoutOpen(true);
                }}
                className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-amber-600 text-sm font-semibold"
              >
                Checkout · {fmtPrice(subtotal + shipping)}
              </Button>
              <button
                onClick={closeCart}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-950 py-1"
              >
                or continue shopping
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
