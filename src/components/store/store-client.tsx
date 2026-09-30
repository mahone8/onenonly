"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreContext } from "./store-context";
import type { Product } from "./types";
import { Header } from "./header";
import { Hero } from "./hero";
import { CategoryCards } from "./category-cards";
import { BestSellers } from "./best-sellers";
import { Shop } from "./shop";
import { CartDrawer } from "./cart-drawer";
import { CheckoutDialog } from "./checkout-dialog";
import {
  PromoBanner,
  Features,
  LatestReviews,
  Newsletter,
  Footer,
  type PublicReview,
} from "./sections";
import { useCart } from "@/lib/cart-store";
import type { Category } from "./types";
import { CATEGORIES } from "./types";

export function StoreClient({
  products,
  latestReviews,
  categories,
}: {
  products: Product[];
  latestReviews: PublicReview[];
  categories: Category[];
}) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const openCart = useCart((s) => s.openCart);

  // Cross-page flows: the product page sets sessionStorage flags before
  // navigating here so the cart drawer or checkout opens on arrival.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem("ono_open_checkout") === "1") {
          sessionStorage.removeItem("ono_open_checkout");
          setCheckoutOpen(true);
        } else if (sessionStorage.getItem("ono_open_cart") === "1") {
          sessionStorage.removeItem("ono_open_cart");
          openCart();
        }
      } catch {
        /* private mode */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [openCart]);

  const goShop = useCallback((cat?: string) => {
    if (cat) setCategory(cat);
    requestAnimationFrame(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const liveCategories =
    categories.length > 0
      ? categories
      : CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
          slug: c.id,
          name: c.label,
        }));

  const value = useMemo(
    () => ({
      products,
      categories: liveCategories,
      category,
      setCategory,
      search,
      setSearch,
      sort,
      setSort,
      checkoutOpen,
      setCheckoutOpen,
      goShop,
    }),
    [products, liveCategories, category, search, sort, checkoutOpen, goShop]
  );

  return (
    <StoreContext.Provider value={value}>
      <div className="min-h-screen flex flex-col bg-white text-zinc-950">
        <Header />
        <main className="flex-1">
          <Hero />
          <CategoryCards />
          <BestSellers />
          <Shop />
          <PromoBanner />
          <Features />
          <LatestReviews reviews={latestReviews} />
          <Newsletter />
        </main>
        <Footer />

        <CartDrawer />
        <CheckoutDialog />
      </div>
    </StoreContext.Provider>
  );
}
