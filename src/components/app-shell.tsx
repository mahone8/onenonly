"use client";

import { useCallback, useEffect, useState } from "react";
import { StoreClient } from "@/components/store/store-client";
import { AdminClient } from "@/components/admin/admin-client";
import type { Category, Product } from "@/components/store/types";
import type { PublicReview } from "@/components/store/sections";

type Mode = "store" | "admin";

function modeFromUrl(): Mode {
  if (typeof window === "undefined") return "store";
  // Fallbacks kept for backward compatibility: /#admin or /?view=admin still
  // open the panel; the primary entry point is the standalone /admin route.
  if (window.location.hash === "#admin") return "admin";
  try {
    if (new URLSearchParams(window.location.search).get("view") === "admin")
      return "admin";
  } catch {
    /* ignore malformed URLs */
  }
  return "store";
}

export function AppShell({
  initialProducts,
  categories,
  latestReviews,
}: {
  initialProducts: Product[];
  categories: Category[];
  latestReviews: PublicReview[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [mode, setMode] = useState<Mode>("store");
  const [refreshing, setRefreshing] = useState(false);

  // Hydration-safe: first render matches SSR (store), then sync to the URL
  // hash/query for the legacy fallback entry points.
  useEffect(() => {
    const sync = () => {
      const m = modeFromUrl();
      setMode(m);
      if (m === "admin") window.scrollTo({ top: 0 });
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    const interval = window.setInterval(sync, 1200);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      window.clearInterval(interval);
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setProducts(data.products as Product[]);
    } catch (error) {
      console.error("Failed to refresh products:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (mode === "admin") {
    return (
      <AdminClient
        products={products}
        categories={categories}
        onRefresh={refresh}
        refreshing={refreshing}
      />
    );
  }

  return (
    <StoreClient
      products={products}
      categories={categories}
      latestReviews={latestReviews}
    />
  );
}
