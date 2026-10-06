"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  Loader2,
  LogOut,
  MailWarning,
  Package,
  Save,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { fmtPrice } from "@/components/store/types";
import { useSession, type SessionUser } from "@/components/store/use-session";

type Order = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; name: string; qty: number; price: number; image: string | null }[];
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, setUser } = useSession();
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  // Redirect guests to sign-in
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Verification result banner (from /api/auth/verify redirect)
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("verification");
      if (v === "ok") toast.success("Email verified — thank you!");
      else if (v === "expired" || v === "invalid")
        toast.error("That verification link has expired. Request a new one from your profile.");
    } catch {
      /* ignore */
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders?mine=1", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setOrders(data.orders as Order[]);
    } catch {
      /* non-fatal */
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && tab === "orders") void loadOrders();
  }, [user, tab, loadOrders]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingProfile(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          addressLine: fd.get("addressLine"),
          city: fd.get("city"),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.fieldErrors)
          toast.error(Object.values(data.fieldErrors).join(" "));
        throw new Error(data.error || "Update failed.");
      }
      setUser(data.user as SessionUser);
      if (data.verificationUrl) {
        setVerifyMsg(data.verificationUrl);
        toast.success("Profile saved — verification link shown below.");
      } else {
        toast.success("Profile saved.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPassword(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: fd.get("currentPassword"),
          newPassword: fd.get("newPassword"),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.fieldErrors?.currentPassword ||
            data.fieldErrors?.newPassword ||
            data.error ||
            "Password change failed."
        );
      }
      toast.success("Password updated.");
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const inputCls = "h-11";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-display font-bold tracking-tight text-xl"
            aria-label="One N Only — home"
          >
            One<span className="italic text-amber-600">N</span>Only
            <span className="text-amber-600">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-950 px-2"
            >
              Store
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-10 text-zinc-500 hover:text-red-600 gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <UserRound className="h-6 w-6 text-amber-700" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">My account</h1>
            <p className="text-sm text-zinc-500">
              {user.name} · {user.phone}
            </p>
          </div>
        </div>

        {!user.emailVerified && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <MailWarning className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">
                Email not verified
              </p>
              <p className="mt-0.5 text-amber-800">
                {user.email
                  ? "Check your inbox for the verification link — it keeps your order updates flowing."
                  : "Add an email in your profile to receive order updates."}
              </p>
              {verifyMsg && (
                <a
                  href={verifyMsg}
                  className="mt-1 block break-all text-xs font-mono text-amber-900 underline"
                >
                  {verifyMsg}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          {(
            [
              { id: "profile", label: "Profile", icon: UserRound },
              { id: "orders", label: "Order history", icon: Package },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "bg-zinc-950 text-white"
                  : "bg-white border border-zinc-300 text-zinc-600 hover:border-zinc-950"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={saveProfile}
              className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold">
                Profile & saved address
              </h2>
              <p className="text-xs text-zinc-500 -mt-2">
                Saved details pre-fill your next checkout.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Full name</Label>
                <Input
                  id="acc-name"
                  name="name"
                  defaultValue={user.name}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-email">
                  Email{" "}
                  {user.emailVerified && (
                    <BadgeCheck className="inline h-4 w-4 text-green-600" />
                  )}
                </Label>
                <Input
                  id="acc-email"
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-phone">Mobile (sign-in ID)</Label>
                <Input
                  id="acc-phone"
                  value={user.phone}
                  disabled
                  className={`${inputCls} bg-zinc-50 text-zinc-500`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-address">Street address</Label>
                <Input
                  id="acc-address"
                  name="addressLine"
                  defaultValue={user.addressLine ?? ""}
                  placeholder="House 12, Street 4, Peoples Colony"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-city">City</Label>
                <Input
                  id="acc-city"
                  name="city"
                  defaultValue={user.city ?? ""}
                  placeholder="Faisalabad"
                  className={inputCls}
                />
              </div>
              <Button
                type="submit"
                disabled={savingProfile}
                className="w-full h-12 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save profile
                  </>
                )}
              </Button>
            </form>

            <form
              onSubmit={changePassword}
              className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4 self-start"
            >
              <h2 className="font-display text-lg font-bold">Change password</h2>
              <div className="space-y-1.5">
                <Label htmlFor="acc-curpass">Current password</Label>
                <Input
                  id="acc-curpass"
                  name="currentPassword"
                  type="password"
                  required
                  className={inputCls}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-newpass">New password</Label>
                <Input
                  id="acc-newpass"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className={inputCls}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                disabled={savingPassword}
                variant="outline"
                className="w-full h-12 rounded-full border-zinc-950"
              >
                {savingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update password"
                )}
              </Button>
              <Separator className="my-2" />
              <p className="text-xs leading-relaxed text-zinc-400">
                Passwords are stored bcrypt-hashed. Sessions last 7 days and
                are signed httpOnly cookies.
              </p>
            </form>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {ordersLoading ? (
              <div className="flex justify-center py-16 text-zinc-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white py-16 text-center">
                <Package className="mx-auto h-10 w-10 text-zinc-300" />
                <p className="mt-4 font-semibold">No orders yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  When you place an order it will appear here with live status.
                </p>
                <Link href="/#shop">
                  <Button className="mt-5 h-11 rounded-full bg-amber-600 hover:bg-amber-500 text-white">
                    Start shopping
                  </Button>
                </Link>
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{o.orderNo}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(o.createdAt).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          STATUS_STYLES[o.status] ?? "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {o.status}
                      </span>
                      <span className="font-bold text-sm flex items-center gap-1">
                        <Banknote className="h-4 w-4 text-amber-600" />
                        {fmtPrice(o.total)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.items.map((it) => (
                      <span
                        key={it.id}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
                      >
                        {it.qty} × {it.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
