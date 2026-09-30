"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { CATEGORIES, CATEGORY_IMAGES } from "./types";
import { useStore } from "./store-context";

export function CategoryCards() {
  const { products, categories, goShop } = useStore();
  const cats =
    categories.length > 0
      ? categories
      : CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
          slug: c.id,
          name: c.label,
        }));

  return (
    <section id="categories" className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8 sm:mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
              Collections
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-zinc-950">
              Shop by category
            </h2>
          </div>
          <p className="text-sm text-zinc-500 max-w-sm">
            Five essentials, zero filler. Every piece is hand-picked and
            quality-checked before it earns a place here.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          {cats.map((c, i) => {
            const count = products.filter((p) => p.category === c.slug).length;
            return (
              <button
                key={c.slug}
                onClick={() => goShop(c.slug)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                aria-label={`Shop ${c.name}`}
              >
                <Image
                  src={CATEGORY_IMAGES[c.slug] ?? CATEGORY_IMAGES.watches}
                  alt={c.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  priority={i < 2}
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-display text-lg sm:text-xl font-bold text-white">
                    {c.name}
                  </p>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {count} {count === 1 ? "piece" : "pieces"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
