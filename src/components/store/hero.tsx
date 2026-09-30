"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Banknote, MapPin, Truck } from "lucide-react";
import { useStore } from "./store-context";
import { OrderPulse } from "./order-pulse";

const HERO_IMG = "/hero-watches.jpg";

/** Real store policies — never fabricated numbers. */
const FACTS = [
  { icon: Banknote, value: "COD", label: "Cash on Delivery" },
  { icon: Truck, value: "Free", label: "Delivery over Rs 5,000" },
  { icon: MapPin, value: "Pakistan", label: "Nationwide Shipping" },
];

export function Hero() {
  const { goShop } = useStore();

  return (
    <section id="home" className="relative w-full bg-zinc-950">
      <div className="relative h-[86vh] min-h-[540px] max-h-[820px] w-full overflow-hidden">
        <Image
          src={HERO_IMG}
          alt="Premium chronograph wristwatch on dark slate"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="max-w-2xl py-20">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
              One N Only · Timepieces
            </p>
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] text-white">
              Time is the
              <br />
              ultimate <span className="italic text-amber-400">luxury.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-zinc-300">
              A tightly edited collection of wristwatches — steel, leather and
              chronograph — chosen for the ones who notice the details. One
              name, one standard.
            </p>
            <div className="mt-5">
              <OrderPulse tone="dark" />
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                size="lg"
                onClick={() => goShop("watches")}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-8 h-12 rounded-full"
              >
                Shop Watches
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById("categories");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-12 border-white/40 text-white hover:bg-white hover:text-zinc-950 rounded-full px-8 bg-transparent"
              >
                Explore Categories
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-3 max-w-md gap-6 border-t border-white/15 pt-6">
              {FACTS.map((s) => (
                <div key={s.label}>
                  <p className="flex items-center gap-1.5 text-lg sm:text-xl font-bold text-white">
                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
                    {s.value}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-zinc-400">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
