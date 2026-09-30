"use client";

import { createContext, useContext } from "react";
import type { Category, Product } from "./types";

export type StoreContextValue = {
  products: Product[];
  /** Live categories from the database (fallback: static list). */
  categories: Category[];
  category: string;
  setCategory: (c: string) => void;
  search: string;
  setSearch: (s: string) => void;
  sort: string;
  setSort: (s: string) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (o: boolean) => void;
  goShop: (cat?: string) => void;
};

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreContext");
  return ctx;
}
