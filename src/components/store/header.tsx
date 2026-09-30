"use client";

import { useState, useSyncExternalStore } from "react";
import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart, cartCount } from "@/lib/cart-store";
import { CATEGORIES } from "./types";
import { useStore } from "./store-context";
import { BrandLogo } from "@/components/brand-logo";
import { useSession } from "./use-session";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Categories", href: "#categories" },
  { label: "Best Sellers", href: "#bestsellers" },
  { label: "Shop", href: "#shop" },
  { label: "Reviews", href: "#reviews" },
];

const emptySubscribe = () => () => {};

export function Header() {
  const { search, setSearch, goShop, categories } = useStore();
  const { user } = useSession();
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.openCart);
  // Hydration-safe mount flag: false during SSR & first paint, true after
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const count = mounted ? cartCount(items) : 0;

  const handleNav = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-zinc-950 text-zinc-100 text-[11px] sm:text-xs py-2 px-4 text-center tracking-wide">
        <span className="text-amber-500 font-semibold">CASH ON DELIVERY</span>{" "}
        nationwide — pay when your order arrives · free delivery over Rs 5,000
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Mobile menu */}
            <div className="lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open menu"
                    className="h-10 w-10"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="border-b border-zinc-200 py-4">
                    <SheetTitle className="text-left">
                      <BrandLogo size={30} className="text-xl" />
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Navigation menu
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col px-4 py-4">
                    {/* mobile search */}
                    <form
                      className="relative mb-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setMobileOpen(false);
                        goShop();
                      }}
                    >
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products…"
                        className="pl-9 h-11"
                      />
                    </form>
                    {NAV_LINKS.map((l) => (
                      <button
                        key={l.href}
                        onClick={() => handleNav(l.href)}
                        className="text-left px-2 py-3 text-base font-medium text-zinc-800 hover:text-amber-700 border-b border-zinc-100"
                      >
                        {l.label}
                      </button>
                    ))}
                    <p className="mt-4 px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Categories
                    </p>
                    {(categories.length > 0
                      ? categories
                      : CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
                          slug: c.id,
                          name: c.label,
                        }))
                    ).map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => {
                          setMobileOpen(false);
                          goShop(c.slug);
                        }}
                        className="text-left px-2 py-2.5 text-sm text-zinc-600 hover:text-amber-700"
                      >
                        {c.name}
                      </button>
                    ))}

                    <div className="mt-4 border-t border-zinc-200 pt-4">
                      <a
                        href={user ? "/account" : "/login"}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 transition-colors"
                      >
                        <UserRound className="h-4 w-4 text-amber-600" />
                        {user ? "My account" : "Sign in / Register"}
                        <span className="ml-auto text-xs font-normal text-zinc-400">
                          {user ? "orders & profile" : "track orders"}
                        </span>
                      </a>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <a
              href="#home"
              className="shrink-0 flex items-center"
              aria-label="OneNOnly — home"
            >
              <BrandLogo size={36} className="text-2xl" />
            </a>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8" aria-label="Main">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(l.href);
                  }}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <a
                href={user ? "/account" : "/login"}
                aria-label={user ? "My account" : "Sign in"}
                title={user ? `Signed in as ${user.name}` : "Sign in / Register"}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-amber-700"
              >
                <UserRound className="h-5 w-5" />
              </a>

              <form
                className="relative hidden md:block"
                onSubmit={(e) => {
                  e.preventDefault();
                  goShop();
                }}
              >
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search products"
                  className="w-44 focus:w-64 transition-all h-10 pl-9 rounded-full bg-zinc-100 border-transparent focus:bg-white"
                />
              </form>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Open cart"
                onClick={openCart}
                className="relative h-10 w-10"
              >
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
