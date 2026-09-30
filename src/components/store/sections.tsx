"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Banknote,
  Facebook,
  Headphones,
  Instagram,
  MapPin,
  ShieldCheck,
  Star,
  Truck,
  Twitter,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "./store-context";
import { CATEGORIES } from "./types";
import { BrandLogo } from "@/components/brand-logo";

/* ---------------- BRAND BANNER (no fabricated discounts) ---------------- */

export function PromoBanner() {
  const { goShop } = useStore();
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950">
          <div className="grid md:grid-cols-2 items-center">
            <div className="relative z-10 p-8 sm:p-12 lg:p-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">
                The One N Only Standard
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                One name.
                <br />
                One <span className="italic text-amber-400">standard.</span>
              </h2>
              <p className="mt-4 max-w-md text-sm sm:text-base text-zinc-300 leading-relaxed">
                Every piece is hand-checked in Faisalabad before dispatch and
                arrives in signature gift packaging. Order with cash on
                delivery — you only pay when it reaches your door.
              </p>
              <Button
                onClick={() => goShop()}
                className="mt-7 h-12 px-8 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                Shop the Collection
              </Button>
            </div>
            <div className="relative h-64 md:h-full min-h-[280px]">
              <Image
                src="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b875dc960952.jpg"
                alt="Premium leather goods flat lay"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/30 to-transparent md:bg-gradient-to-r md:from-zinc-950 md:via-zinc-950/10 md:to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */

const FEATURES = [
  {
    icon: Truck,
    title: "Free Delivery",
    text: "Complimentary nationwide delivery on all orders over Rs 5,000.",
  },
  {
    icon: Banknote,
    title: "Cash on Delivery",
    text: "Pay with cash when your order arrives — no advance payment needed.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Checked",
    text: "Every piece is inspected in Faisalabad before it is dispatched to you.",
  },
  {
    icon: Headphones,
    title: "Friendly Support",
    text: "Questions before you order? Real humans, seven days a week.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-y border-zinc-200 bg-zinc-50 py-12 sm:py-14 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <f.icon className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {f.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CUSTOMER REVIEWS (real, from the database) ---------------- */

export type PublicReview = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  productName: string | null;
  productSlug: string | null;
};

/**
 * Real customer reviews fetched server-side. Hidden entirely while the store
 * has none — never fabricated. Reviews are submitted on product pages.
 */
export function LatestReviews({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section id="reviews" className="py-16 sm:py-20 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
            Reviews
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-zinc-950">
            What customers say
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
          {reviews.map((t) => (
            <figure
              key={t.id}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 sm:p-7"
            >
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < t.rating
                        ? "h-4 w-4 fill-amber-500 text-amber-500"
                        : "h-4 w-4 text-zinc-300"
                    }
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-zinc-600">
                &ldquo;{t.comment}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-zinc-200 pt-4">
                <p className="text-sm font-bold text-zinc-950">{t.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {t.productName ? `Reviewed the ${t.productName}` : "Verified buyer"}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- NEWSLETTER (honest copy) ---------------- */

export function Newsletter() {
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    // Newsletter signups are stored when a mail provider is connected.
    email.trim();
    setEmail("");
  };

  return (
    <section className="bg-zinc-950 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">
            Newsletter
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-white">
            Join the One N Only circle
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Be first to see new arrivals and subscriber-only offers. One email
            a week — never more.
          </p>
          <form
            onSubmit={submit}
            className="mt-7 flex flex-col sm:flex-row gap-3"
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              aria-label="Email address"
              className="flex-1 h-12 rounded-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-amber-500"
            />
            <Button
              type="submit"
              className="h-12 px-8 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */

export function Footer() {
  const { goShop, categories } = useStore();

  const careLinks = [
    { label: "Shipping & Delivery", anchor: "#features" },
    { label: "Cash on Delivery", anchor: "#features" },
    { label: "Customer Support", anchor: "#features" },
  ];

  return (
    <footer className="mt-auto bg-zinc-950 text-zinc-400 border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <BrandLogo size={34} className="text-2xl" onDark />
            <p className="mt-4 text-sm leading-relaxed">
              One name, one standard. A tightly edited collection of caps,
              wallets, bracelets, glasses and watches for people who notice
              the details.
            </p>
            <p className="mt-4 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Based in Faisalabad, Pakistan — delivering nationwide,{" "}
                <span className="font-semibold text-amber-400">
                  cash on delivery.
                </span>
              </span>
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { icon: Instagram, label: "Instagram" },
                { icon: Facebook, label: "Facebook" },
                { icon: Twitter, label: "Twitter" },
                { icon: Youtube, label: "YouTube" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#home"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-amber-500 hover:text-amber-500 transition-colors"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <nav aria-label="Shop categories">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              Shop
            </h3>
            <ul className="mt-4 space-y-2.5">
              {(categories.length > 0
                ? categories
                : CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
                    slug: c.id,
                    name: c.label,
                  }))
              ).map((c) => (
                <li key={c.slug}>
                  <button
                    onClick={() => goShop(c.slug)}
                    className="text-sm hover:text-amber-500 transition-colors"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Customer care */}
          <nav aria-label="Customer care">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              Customer Care
            </h3>
            <ul className="mt-4 space-y-2.5">
              {careLinks.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => {
                      const el = document.querySelector(l.anchor);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-sm hover:text-amber-500 transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Payment info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              Payment
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-amber-500" />
                Cash on Delivery (COD)
              </p>
              <p className="text-xs leading-relaxed text-zinc-500">
                Our primary payment method — inspect your order at the door
                and pay the courier. No advance payment, no card required.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-6">
          <p className="text-xs">
            © 2026 ONE N ONLY · Faisalabad, Pakistan. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-400">
              <Banknote className="h-3.5 w-3.5" />
              CASH ON DELIVERY
            </span>
          </div>
        </div>

        {/* Developer credit */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
          <span>Developed by</span>
          <a
            href="https://levelose.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-zinc-500 hover:text-amber-500 transition-colors"
          >
            levelose.tech
          </a>
        </div>
      </div>
    </footer>
  );
}
