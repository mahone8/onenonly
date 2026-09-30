"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { fmtPrice, type Product } from "./types";

function badgeClasses(badge: string) {
  switch (badge) {
    case "NEW":
      return "bg-amber-500 text-zinc-950";
    case "BESTSELLER":
      return "bg-zinc-950 text-white";
    case "SALE":
      return "bg-red-600 text-white";
    default:
      return "bg-zinc-800 text-white";
  }
}

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round((1 - product.price / product.comparePrice) * 100)
      : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col"
      aria-label={`View ${product.name}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.badge && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClasses(
                product.badge
              )}`}
            >
              {product.badge}
            </span>
          )}
          {discount && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-zinc-950">
              −{discount}%
            </span>
          )}
        </div>

        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
          <Button
            onClick={handleAdd}
            className="w-full h-10 rounded-full bg-zinc-950/90 backdrop-blur text-white hover:bg-zinc-950 text-xs sm:text-sm"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>

      <div className="pt-3 pb-1 px-0.5">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          {product.brand || product.category}
        </p>
        <h3 className="mt-1 text-sm sm:text-base font-semibold text-zinc-950 leading-snug group-hover:text-amber-800 transition-colors">
          {product.name}
        </h3>
        {product.reviews > 0 ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="flex items-center gap-0.5"
              aria-label={`Rated ${product.rating} out of 5`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.round(product.rating)
                      ? "fill-amber-500 text-amber-500"
                      : "fill-zinc-200 text-zinc-200"
                  }`}
                />
              ))}
            </span>
            <span className="text-[11px] text-zinc-400">({product.reviews})</span>
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] font-semibold text-amber-700">New</p>
        )}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-zinc-950">
            {fmtPrice(product.price)}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs sm:text-sm text-zinc-400 line-through">
              {fmtPrice(product.comparePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
