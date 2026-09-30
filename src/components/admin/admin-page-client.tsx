"use client";

import { useCallback, useState } from "react";
import { AdminClient } from "./admin-client";
import type { Category, Product } from "@/components/store/types";

/**
 * Client wrapper for the standalone /admin route.
 * Holds the shared products state (same pattern as AppShell) and renders
 * AdminClient directly — no hash routing involved, so the panel opens
 * reliably even in preview iframes / in-app browsers that strip hashes.
 */
export function AdminPageClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <AdminClient
      products={products}
      categories={categories}
      onRefresh={refresh}
      refreshing={refreshing}
    />
  );
}
