"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "./store-context";
import { fmtPrice } from "./types";

export function BestSellers() {
  const { products, goShop } = useStore();

  // Hidden entirely while there are no featured products — no fake data.
  const best = [...products]
    .filter((p) => p.featured)
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 4);
  if (best.length === 0) return null;

  return (
    <section id="bestsellers" className="py-16 sm:py-20 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-3 mb-8 sm:mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
              Customer Favorites
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-zinc-950">
              Best sellers
            </h2>
          </div>
          <Button
            variant="link"
            onClick={() => goShop()}
            className="hidden sm:inline-flex text-zinc-950 hover:text-amber-700 p-0"
          >
            View all <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {best.map((p, i) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-2xl"
              aria-label={`View ${p.name}`}
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-950">
                  #{i + 1} Best Seller
                </span>
              </div>
              <div className="pt-3">
                {p.reviews > 0 ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span className="text-xs font-semibold text-zinc-700">
                      {p.rating}
                    </span>
                    <span className="text-xs text-zinc-400">
                      ({p.reviews} review{p.reviews === 1 ? "" : "s"})
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-amber-700">New</p>
                )}
                <h3 className="mt-1 font-display text-lg font-bold text-zinc-950">
                  {p.name}
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-amber-800">
                  {fmtPrice(p.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Button
            onClick={() => goShop()}
            variant="outline"
            className="w-full h-11 rounded-full"
          >
            View all products <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
