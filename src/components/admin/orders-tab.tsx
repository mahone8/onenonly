"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Eye,
  Loader2,
  MapPin,
  PackageSearch,
  RefreshCw,
  TicketPercent,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtPrice } from "@/components/store/types";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  type OrderStatus,
} from "@/lib/store-config";

export type AdminOrder = {
  id: string;
  orderNo: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  notes: string | null;
  subtotal: number;
  discount: number;
  promoCode: string | null;
  shipping: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    qty: number;
    image: string | null;
  }>;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  confirmed: "bg-zinc-200 text-zinc-800 border border-zinc-300",
  shipped: "bg-teal-100 text-teal-800 border border-teal-200",
  delivered: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border border-red-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={`font-medium capitalize ${STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {STATUS_LABELS[status as OrderStatus] ?? status}
    </Badge>
  );
}

type Props = { onUnauthorized: () => void };

export function OrdersTab({ onUnauthorized }: Props) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const data = await res.json();
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok || !data.success)
          throw new Error(data.error || "Failed to load orders.");
        setOrders(data.orders as AdminOrder[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load orders."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const active = orders.filter(
      (o) => o.status === "confirmed" || o.status === "shipped"
    ).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);
    return { pending, active, delivered, revenue };
  }, [orders]);

  async function updateStatus(order: AdminOrder, status: string) {
    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to update order.");
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o))
      );
      if (detail?.id === order.id) setDetail({ ...detail, status });
      toast.success(
        status === "cancelled"
          ? `Order ${order.orderNo} cancelled — stock restored.`
          : `Order ${order.orderNo} marked as ${status}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Order stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Pending", value: String(stats.pending), tone: "text-amber-700 bg-amber-100" },
          { label: "In progress", value: String(stats.active), tone: "text-teal-700 bg-teal-100" },
          { label: "Delivered", value: String(stats.delivered), tone: "text-emerald-700 bg-emerald-100" },
          {
            label: "COD revenue",
            value: fmtPrice(Math.round(stats.revenue)),
            tone: "text-zinc-700 bg-zinc-100",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {s.label}
              </p>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.tone}`}>
                <Banknote className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-full sm:w-48 h-11 bg-white"
            aria-label="Filter by status"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 bg-white"
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label="Refresh orders"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          Showing {filtered.length} of {orders.length} orders
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white py-16 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-4 font-medium">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New cash-on-delivery orders will appear here the moment customers
            check out.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                  <TableHead className="pl-5">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-24">Items</TableHead>
                  <TableHead className="w-32">Total</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-28 pr-5 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-5">
                      <p className="font-semibold text-zinc-950">{o.orderNo}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(o.createdAt).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium leading-tight">{o.name}</p>
                      <p className="text-xs text-zinc-500">{o.phone}</p>
                    </TableCell>
                    <TableCell>
                      {o.items.reduce((acc, i) => acc + i.qty, 0)}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{fmtPrice(o.total)}</p>
                      <p className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Banknote className="h-3 w-3" /> COD
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={o.status}
                          onValueChange={(v) => updateStatus(o, v)}
                          disabled={updatingId === o.id}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Change status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updatingId === o.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 ml-auto"
                        onClick={() => setDetail(o)}
                        aria-label={`View order ${o.orderNo}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((o) => (
              <div key={o.id} className="min-w-0 rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-950">{o.orderNo}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(o.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-sm space-y-0.5">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-zinc-500">{o.phone}</p>
                  <p className="flex items-center gap-1 text-zinc-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{o.city}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-400">
                      {o.items.reduce((acc, i) => acc + i.qty, 0)} items · COD
                    </p>
                    <p className="font-bold">{fmtPrice(o.total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() => setDetail(o)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Button>
                  </div>
                </div>
                <Select
                  value={o.status}
                  onValueChange={(v) => updateStatus(o, v)}
                  disabled={updatingId === o.id}
                >
                  <SelectTrigger className="h-9 text-xs" aria-label="Change status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail dialog */}
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {detail?.orderNo}
            </DialogTitle>
            <DialogDescription>
              {detail &&
                new Date(detail.createdAt).toLocaleString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              {" · "}
              {detail && <StatusBadge status={detail.status} />}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 text-sm">
              {/* Items */}
              <div className="space-y-3">
                {detail.items.map((i) => (
                  <div key={i.id} className="flex gap-3">
                    {i.image && (
                       
                      <img
                        src={i.image}
                        alt=""
                        className="h-12 w-12 rounded-lg border object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight truncate">{i.name}</p>
                      <p className="text-xs text-zinc-500">
                        {i.qty} × {fmtPrice(i.price)}
                      </p>
                    </div>
                    <p className="font-semibold shrink-0">
                      {fmtPrice(i.price * i.qty)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal</span>
                  <span>{fmtPrice(detail.subtotal)}</span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="flex items-center gap-1">
                      <TicketPercent className="h-3.5 w-3.5" />
                      {detail.promoCode}
                    </span>
                    <span>−{fmtPrice(detail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Delivery</span>
                  <span>
                    {detail.shipping === 0 ? "FREE" : fmtPrice(detail.shipping)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Cash on delivery</span>
                  <span>{fmtPrice(detail.total)}</span>
                </div>
              </div>

              <Separator />

              {/* Customer */}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Deliver to
                </p>
                <p className="font-medium">{detail.name}</p>
                <p>{detail.phone}</p>
                {detail.email && <p className="text-zinc-500">{detail.email}</p>}
                <p className="text-zinc-600">
                  {detail.address}, {detail.city}
                </p>
                {detail.notes && (
                  <p className="mt-1 rounded bg-zinc-50 border px-3 py-2 text-xs text-zinc-600">
                    “{detail.notes}”
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
