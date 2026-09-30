"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { categoryLabel, fmtPrice, galleryOf, type Product } from "./types";
import { ProductReviews } from "./product-reviews";
import { OrderPulse } from "./order-pulse";

export function ProductDetail({ product }: { product: Product }) {
  const p = product;
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const gallery = galleryOf(p);
  const discount =
    p.comparePrice && p.comparePrice > p.price
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : null;

  function addToCart(openCheckout: boolean) {
    add(
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        image: p.image,
        category: p.category,
      },
      qty
    );
    if (openCheckout) {
      // Land on the storefront with the checkout already opening.
      try {
        sessionStorage.setItem("ono_open_checkout", "1");
      } catch {
        /* private mode */
      }
      router.push("/");
    } else {
      toast.success(`${qty} × ${p.name} added to cart`, {
        action: {
          label: "View cart",
          onClick: () => {
            try {
              sessionStorage.setItem("ono_open_cart", "1");
            } catch {
              /* private mode */
            }
            router.push("/");
          },
        },
      });
    }
  }

  const attrs = [
    p.brand ? { label: "Brand", value: p.brand } : null,
    p.strap ? { label: "Strap", value: p.strap } : null,
    p.caseSize ? { label: "Case size", value: p.caseSize } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {/* Mini header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link
            href="/#shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Continue shopping
          </Link>
          <Link
            href="/"
            className="font-display font-bold tracking-tight text-lg"
            aria-label="One N Only — home"
          >
            One<span className="italic text-amber-600">N</span>Only
            <span className="text-amber-600">.</span>
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 lg:pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-zinc-400 mb-5">
          <Link href="/" className="hover:text-zinc-600">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/#shop" className="hover:text-zinc-600">
            {categoryLabel(p.category)}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-zinc-600 font-medium">{p.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
              <Image
                src={gallery[activeImg] ?? p.image}
                alt={p.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              {discount && (
                <span className="absolute top-4 left-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                  −{discount}% OFF
                </span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {gallery.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === activeImg
                        ? "border-amber-600"
                        : "border-transparent hover:border-zinc-300"
                    }`}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="80px"
                      loading="lazy"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              {categoryLabel(p.category)}
            </p>
            <h1 className="mt-2 font-display text-2xl sm:text-4xl font-bold tracking-tight">
              {p.name}
            </h1>

            <div className="mt-3">
              <OrderPulse />
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                {fmtPrice(p.price)}
              </span>
              {p.comparePrice && p.comparePrice > p.price && (
                <span className="text-lg text-zinc-400 line-through">
                  {fmtPrice(p.comparePrice)}
                </span>
              )}
            </div>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-600">
              {p.description}
            </p>

            {attrs.length > 0 && (
              <dl className="mt-5 grid grid-cols-3 gap-3">
                {attrs.map((a) => (
                  <div
                    key={a.label}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3"
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                      {a.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-zinc-950">
                      {a.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Desktop quantity + add */}
            <div className="mt-7 hidden lg:flex items-center gap-3">
              <div className="flex items-center rounded-full border border-zinc-300">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span
                  className="w-8 text-center text-sm font-semibold"
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(p.stock || 1, q + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={() => addToCart(false)}
                disabled={p.stock === 0}
                className="flex-1 h-12 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {p.stock === 0 ? "Out of stock" : "Add to Cart"}
              </Button>
              <Button
                onClick={() => addToCart(true)}
                disabled={p.stock === 0}
                variant="outline"
                className="h-12 rounded-full border-zinc-950 px-8"
              >
                Buy Now · COD
              </Button>
            </div>

            {p.stock > 0 && p.stock < 10 && (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                Only {p.stock} left in stock
              </p>
            )}

            <Separator className="my-7" />

            <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-500">
              <li className="flex items-center gap-2.5">
                <Banknote className="h-4 w-4 text-amber-600 shrink-0" />
                Cash on Delivery — pay when your order arrives
              </li>
              <li className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-amber-600 shrink-0" />
                Free delivery over Rs 5,000 · 1–2 days in Faisalabad
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                Quality checked before dispatch · Nationwide shipping
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-10" />
        <ProductReviews
          productId={p.id}
          rating={p.rating}
          reviewCount={p.reviews}
        />
      </main>

      {/* Sticky mobile add-to-cart (touch-friendly, 56px) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-zinc-300 shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-11 w-10 items-center justify-center text-zinc-600"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(p.stock || 1, q + 1))}
              className="flex h-11 w-10 items-center justify-center text-zinc-600"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={() => addToCart(false)}
            disabled={p.stock === 0}
            className="flex-1 h-12 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white font-semibold"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {p.stock === 0 ? "Out of stock" : `Add · ${fmtPrice(p.price * qty)}`}
          </Button>
          <Button
            onClick={() => addToCart(true)}
            disabled={p.stock === 0}
            className="h-12 w-12 shrink-0 rounded-full bg-amber-600 hover:bg-amber-500 text-white p-0"
            aria-label="Buy now with cash on delivery"
          >
            <Banknote className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
