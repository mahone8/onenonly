"use client";

import { useMemo, useState } from "react";
import { PackageSearch, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useStore } from "./store-context";
import { ProductCard } from "./product-card";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

/** Watch-focused price bands (PKR). */
const PRICE_BANDS = [
  { value: "u2500", label: "Under Rs 2,500", min: 0, max: 2500 },
  { value: "2500-5000", label: "Rs 2,500 – 5,000", min: 2500, max: 5000 },
  { value: "5000-10000", label: "Rs 5,000 – 10,000", min: 5000, max: 10000 },
  { value: "o10000", label: "Rs 10,000+", min: 10000, max: 1e12 },
];

type FilterState = {
  brand: string;
  strap: string;
  caseSize: string;
  band: string;
};

const INITIAL_FILTERS: FilterState = {
  brand: "all",
  strap: "all",
  caseSize: "all",
  band: "all",
};

export function Shop() {
  const {
    products,
    categories,
    category,
    setCategory,
    search,
    setSearch,
    sort,
    setSort,
  } = useStore();

  // ---- Watch filters (visible when browsing watches) ----
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const setFilter = (key: keyof FilterState, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const watchAttrs = useMemo(() => {
    const watches = products.filter((p) => p.category === "watches");
    const uniq = (vals: (string | null | undefined)[]) =>
      [...new Set(vals.filter((v): v is string => !!v))].sort();
    return {
      count: watches.length,
      brands: uniq(watches.map((p) => p.brand)),
      straps: uniq(watches.map((p) => p.strap)),
      sizes: uniq(watches.map((p) => p.caseSize)),
    };
  }, [products]);

  const showWatchFilters = category === "watches" && watchAttrs.count > 0;

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (category === "watches") {
      if (filters.brand !== "all")
        list = list.filter((p) => p.brand === filters.brand);
      if (filters.strap !== "all")
        list = list.filter((p) => p.strap === filters.strap);
      if (filters.caseSize !== "all")
        list = list.filter((p) => p.caseSize === filters.caseSize);
      if (filters.band !== "all") {
        const band = PRICE_BANDS.find((b) => b.value === filters.band);
        if (band)
          list = list.filter((p) => p.price >= band.min && p.price <= band.max);
      }
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      default:
        list = [...list].sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) || b.rating - a.rating
        );
    }
    return list;
  }, [products, category, search, sort, filters]);

  const anyFilterActive =
    filters.brand !== "all" ||
    filters.strap !== "all" ||
    filters.caseSize !== "all" ||
    filters.band !== "all";

  return (
    <section id="shop" className="py-16 sm:py-20 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
            The Collection
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-zinc-950">
            {category === "watches" ? "Watches" : "Everything in the store"}
          </h2>
          {search.trim() && (
            <p className="mt-2 text-sm text-zinc-500">
              Showing results for{" "}
              <span className="font-semibold text-zinc-950">
                &ldquo;{search.trim()}&rdquo;
              </span>{" "}
              <button
                onClick={() => setSearch("")}
                className="ml-1 text-amber-700 underline underline-offset-2 hover:text-amber-800"
              >
                Clear
              </button>
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap no-scrollbar"
            role="tablist"
            aria-label="Product categories"
          >
            {[
              { id: "all", label: "All Products" },
              ...categories.map((c) => ({ id: c.slug, label: c.name })),
            ].map((c) => {
              const active = category === c.id;
              const count =
                c.id === "all"
                  ? products.length
                  : products.filter((p) => p.category === c.id).length;
              return (
                <Button
                  key={c.id}
                  variant={active ? "default" : "outline"}
                  onClick={() => setCategory(c.id)}
                  role="tab"
                  aria-selected={active}
                  className={`shrink-0 h-10 rounded-full px-4 sm:px-5 text-xs sm:text-sm ${
                    active
                      ? "bg-zinc-950 text-white hover:bg-zinc-800"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950 bg-white"
                  }`}
                >
                  {c.label}
                  <span className="ml-1.5 text-[10px] text-zinc-400">
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500 hidden sm:block">Sort by</span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[170px] sm:w-[190px] h-10 rounded-full border-zinc-300">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Watch filters: brand, price, strap type, case size */}
        {showWatchFilters && (
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <FilterSelect
                label="Brand"
                value={filters.brand}
                options={watchAttrs.brands}
                onChange={(v) => setFilter("brand", v)}
              />
              <FilterSelect
                label="Strap"
                value={filters.strap}
                options={watchAttrs.straps}
                onChange={(v) => setFilter("strap", v)}
              />
              <FilterSelect
                label="Case size"
                value={filters.caseSize}
                options={watchAttrs.sizes}
                onChange={(v) => setFilter("caseSize", v)}
              />
              <FilterSelect
                label="Price"
                value={filters.band}
                options={PRICE_BANDS.map((b) => b.value)}
                labels={Object.fromEntries(
                  PRICE_BANDS.map((b) => [b.value, b.label])
                )}
                onChange={(v) => setFilter("band", v)}
              />
              {anyFilterActive && (
                <button
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="inline-flex items-center gap-1 h-10 px-3 text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
                >
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <PackageSearch className="mx-auto h-12 w-12 text-zinc-300" />
            <h3 className="mt-4 font-display text-xl font-bold text-zinc-950">
              No products yet
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Our new collection is being prepared — check back very soon.
            </p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <PackageSearch className="mx-auto h-12 w-12 text-zinc-300" />
            <h3 className="mt-4 font-display text-xl font-bold text-zinc-950">
              Nothing found
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Try a different search term or browse all categories.
            </p>
            <Button
              onClick={() => {
                setSearch("");
                setCategory("all");
                setFilters(INITIAL_FILTERS);
              }}
              className="mt-5 h-11 rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
            >
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const active = value !== "all";
  const shown = active ? labels?.[value] ?? value : label;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={`h-10 rounded-full text-xs sm:text-sm w-[9.5rem] sm:w-auto ${
          active
            ? "bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-800"
            : "bg-white border-zinc-300"
        }`}
      >
        <SelectValue>{shown}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
