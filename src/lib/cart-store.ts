"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/store-config";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  category: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

export { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE };

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item, qty = 1) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          items[idx] = { ...items[idx], qty: items[idx].qty + qty };
        } else {
          items.push({ ...item, qty });
        }
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQty: (id, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
        } else {
          set({
            items: get().items.map((i) => (i.id === id ? { ...i, qty } : i)),
          });
        }
      },
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: "onenonly-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function cartCount(items: CartItem[]) {
  return items.reduce((acc, i) => acc + i.qty, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((acc, i) => acc + i.price * i.qty, 0);
}

export function cartShipping(items: CartItem[]) {
  const sub = cartSubtotal(items);
  return sub >= FREE_SHIPPING_THRESHOLD || sub === 0 ? 0 : SHIPPING_FEE;
}
