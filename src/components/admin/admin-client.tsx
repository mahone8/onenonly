"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  DollarSign,
  Download,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Star,
  TicketPercent,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "./product-form";
import { OrdersTab } from "./orders-tab";
import { PromoTab } from "./promo-tab";
import { ReviewsTab } from "./reviews-tab";
import { ImportDialog } from "./import-dialog";
import { BrandLogo } from "@/components/brand-logo";
import { categoryLabel, fmtPrice, type Category, type Product } from "@/components/store/types";

type Props = {
  products: Product[];
  categories: Category[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
};

type AuthState = "checking" | "locked" | "open";

function goStore() {
  // Standalone /admin route: just navigate to the storefront.
  if (window.location.pathname === "/admin") {
    window.location.href = "/";
    return;
  }
  // Clear any ?view=admin query so modeFromUrl() doesn't flip straight back.
  if (window.location.search) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  // If the hash doesn't actually change, no hashchange fires — sync manually.
  if (window.location.hash === "#admin") {
    window.location.hash = "#home";
  } else {
    window.dispatchEvent(new Event("hashchange"));
  }
  window.scrollTo({ top: 0 });
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <Badge variant="destructive" className="font-medium">
        Out of stock
      </Badge>
    );
  if (stock < 10)
    return (
      <Badge className="bg-amber-100 text-amber-800 border border-amber-200 font-medium">
        Low · {stock}
      </Badge>
    );
  return (
    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
      {stock} in stock
    </Badge>
  );
}

/* ---------------- LOGIN GATE ---------------- */

function LoginScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }
      toast.success(
        data.bootstrapped
          ? "Admin account created — welcome! Keep this email & password safe."
          : `Welcome back${data.name ? ", " + data.name : ""}.`
      );
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <div className="flex justify-center">
              <BrandLogo size={44} className="text-2xl" />
            </div>
            <div className="mt-6 text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-950">
                Admin panel
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in with your admin email and password to manage the store.
              </p>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@yourstore.com"
                    className="pl-9 h-11"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-pass">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="admin-pass"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••••"
                    className="pl-9 h-11"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground text-center">
                First run? The account you sign up with becomes the store admin
                — keep the password safe.
              </p>
            </form>
          </div>
          <button
            onClick={goStore}
            className="mx-auto mt-5 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </button>
        </div>
      </main>
      <footer className="pb-6 text-center text-[11px] text-zinc-400">
        Developed by{" "}
        <a
          href="https://levelose.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-zinc-500 hover:text-amber-600 transition-colors"
        >
          levelose.tech
        </a>
      </footer>
    </div>
  );
}

/* ---------------- ADMIN PANEL ---------------- */

export function AdminClient({ products, categories, onRefresh, refreshing }: Props) {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Export: hit the admin-only endpoint; Content-Disposition triggers the
  // "Save file" dialog with a dated filename (onenonly-products-YYYY-MM-DD).
  function exportProducts() {
    const a = document.createElement("a");
    a.href = "/api/admin/export";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Preparing your product export — check your downloads.");
  }

  // Session check on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const data = await res.json();
        if (alive)
          setAuth(data.authenticated ? "open" : "locked");
      } catch {
        if (alive) setAuth("locked");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onUnauthorized = useCallback(() => {
    setAuth("locked");
    toast.error("Session expired — please sign in again.");
  }, []);

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuth("locked");
      toast.success("Signed out of the admin panel.");
    }
  }

  const stats = useMemo(() => {
    const total = products.length;
    const featured = products.filter((p) => p.featured).length;
    const lowStock = products.filter((p) => p.stock < 10).length;
    const value = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    return { total, featured, lowStock, value };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => category === "all" || p.category === category)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
  }, [products, search, category]);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/products/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to delete product.");
      toast.success(`“${deleting.name}” was removed from the store.`);
      setDeleting(null);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (auth === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (auth === "locked") {
    return <LoginScreen onUnlocked={() => setAuth("open")} />;
  }

  const statCards = [
    {
      label: "Total products",
      value: String(stats.total),
      icon: Package,
      tone: "text-zinc-700 bg-zinc-100",
    },
    {
      label: "Featured",
      value: String(stats.featured),
      icon: TrendingUp,
      tone: "text-amber-700 bg-amber-100",
    },
    {
      label: "Low / out of stock",
      value: String(stats.lowStock),
      icon: PackageSearch,
      tone: "text-red-700 bg-red-100",
    },
    {
      label: "Inventory value",
      value: fmtPrice(Math.round(stats.value)),
      icon: DollarSign,
      tone: "text-emerald-700 bg-emerald-100",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size={32} className="text-xl" />
              <span className="hidden sm:inline-flex text-[11px] font-bold uppercase tracking-widest text-zinc-400 border-l border-zinc-200 pl-3">
                Admin panel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setTab("add")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add product</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={goStore}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">View store</span>
                <span className="sm:hidden">Store</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="h-9 w-9 text-zinc-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Store dashboard
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage products, cash-on-delivery orders, promo codes and customer
            reviews — changes go live on the store instantly.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-white p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </p>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tone}`}
                >
                  <s.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="gap-6">
          <TabsList className="h-11 w-full sm:w-auto sm:h-10 bg-zinc-200/70 p-1 flex-wrap">
            <TabsTrigger
              value="products"
              className="px-3 sm:px-5 data-[state=active]:bg-white"
            >
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="px-3 sm:px-5 data-[state=active]:bg-white"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="promo"
              className="px-3 sm:px-5 data-[state=active]:bg-white"
            >
              <TicketPercent className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Promo
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="px-3 sm:px-5 data-[state=active]:bg-white"
            >
              Reviews
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="px-3 sm:px-5 data-[state=active]:bg-white"
            >
              Add product
            </TabsTrigger>
          </TabsList>

          {/* ---------- PRODUCTS TAB ---------- */}
          <TabsContent value="products" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="pl-9 h-11 bg-white"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  className="w-full sm:w-48 h-11 bg-white"
                  aria-label="Filter by category"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(categories.length > 0
                    ? categories
                    : ["caps", "wallets", "bracelets", "glasses", "watches"].map(
                        (slug) => ({ slug, name: categoryLabel(slug) })
                      )
                  ).map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-11 shrink-0 bg-white"
                onClick={exportProducts}
                aria-label="Export products as JSON"
                title="Download all products as a JSON backup file"
              >
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-11 shrink-0 bg-white"
                onClick={() => setImportOpen(true)}
                aria-label="Import products from JSON"
                title="Import / restore products from an export file"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden lg:inline">Import</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 bg-white"
                onClick={() => onRefresh()}
                disabled={refreshing}
                aria-label="Refresh product list"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 rotate-0" />
                )}
              </Button>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-white py-16 text-center">
                <Package className="mx-auto h-10 w-10 text-zinc-300" />
                <p className="mt-4 font-medium">No products found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {products.length === 0
                    ? "Add your first product to get started."
                    : "Try a different search or category filter."}
                </p>
                <Button
                  onClick={() => setTab("add")}
                  className="mt-5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="h-4 w-4" /> Add product
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                        <TableHead className="pl-5 w-20">Image</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-32">Category</TableHead>
                        <TableHead className="w-32">Price</TableHead>
                        <TableHead className="w-36">Stock</TableHead>
                        <TableHead className="w-16 text-center">Feat.</TableHead>
                        <TableHead className="w-28 pr-5 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="pl-5">
                            { }
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-12 w-12 rounded-lg object-cover border"
                              loading="lazy"
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium leading-tight">
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {p.images.length > 0
                                ? `+${p.images.length} gallery image${p.images.length === 1 ? "" : "s"}`
                                : "1 image"}
                            </p>
                            {p.badge && (
                              <span className="mt-1 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-600">
                                {p.badge}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-zinc-600">
                              {categoryLabel(p.category)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="leading-tight">
                              <p className="font-semibold">
                                {fmtPrice(p.price)}
                              </p>
                              {p.comparePrice != null && (
                                <p className="text-xs text-zinc-400 line-through">
                                  {fmtPrice(p.comparePrice)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StockBadge stock={p.stock} />
                          </TableCell>
                          <TableCell className="text-center">
                            {p.featured ? (
                              <Star className="mx-auto h-4 w-4 fill-amber-500 text-amber-500" />
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-5">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditing(p)}
                                aria-label={`Edit ${p.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleting(p)}
                                aria-label={`Delete ${p.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="grid gap-3 md:hidden">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      className="flex min-w-0 gap-3 rounded-xl border bg-white p-3 shadow-sm"
                    >
                      { }
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover border"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {categoryLabel(p.category)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold leading-tight">
                              {fmtPrice(p.price)}
                            </p>
                            {p.comparePrice != null && (
                              <p className="text-xs text-zinc-400 line-through">
                                {fmtPrice(p.comparePrice)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <StockBadge stock={p.stock} />
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              onClick={() => setEditing(p)}
                              aria-label={`Edit ${p.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleting(p)}
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {products.length} products
                </p>
              </>
            )}
          </TabsContent>

          {/* ---------- ORDERS TAB ---------- */}
          <TabsContent value="orders">
            <OrdersTab onUnauthorized={onUnauthorized} />
          </TabsContent>

          {/* ---------- PROMO TAB ---------- */}
          <TabsContent value="promo">
            <PromoTab onUnauthorized={onUnauthorized} />
          </TabsContent>

          {/* ---------- REVIEWS TAB ---------- */}
          <TabsContent value="reviews">
            <ReviewsTab onUnauthorized={onUnauthorized} />
          </TabsContent>

          {/* ---------- ADD PRODUCT TAB ---------- */}
          <TabsContent value="add">
            <div className="rounded-xl border bg-white shadow-sm p-4 sm:p-8">
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  New product
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill in the details below — your product appears in the shop
                  grid the moment you save.
                </p>
              </div>
              <ProductForm
                categories={categories}
                onSaved={async () => {
                  await onRefresh();
                  setTab("products");
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © 2026 ONE N ONLY · Faisalabad · Admin panel
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={goStore}
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              ← Back to storefront
            </button>
            <span className="text-[11px] text-zinc-400">
              Developed by{" "}
              <a
                href="https://levelose.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-500 hover:text-amber-600 transition-colors"
              >
                levelose.tech
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Bulk import dialog (pairs with the Export button) */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        products={products}
        onImported={onRefresh}
      />

      {/* Edit dialog */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Edit product
            </DialogTitle>
            <DialogDescription>
              Update the details for “{editing?.name}” and save your changes.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <ProductForm
              product={editing}
              categories={categories}
              onSaved={async () => {
                setEditing(null);
                await onRefresh();
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” will be permanently removed from your store.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteBusy}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
