"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { fmtPrice } from "@/components/store/types";

export type PromoCode = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  active: boolean;
  usedCount: number;
};

type Props = { onUnauthorized: () => void };

export function PromoTab({ onUnauthorized }: Props) {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PromoCode | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("percent");
  const [newValue, setNewValue] = useState("");
  const [newMin, setNewMin] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promo-codes", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to load promo codes.");
      setCodes(data.codes as PromoCode[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          type: newType,
          value: Number(newValue),
          minOrder: Number(newMin || 0),
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Could not create promo code.");
      toast.success(`Promo code ${data.promoCode.code} created.`);
      setNewCode("");
      setNewValue("");
      setNewMin("0");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(code: PromoCode, active: boolean) {
    setBusyId(code.id);
    try {
      const res = await fetch(`/api/promo-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Could not update code.");
      setCodes((prev) =>
        prev.map((c) => (c.id === code.id ? { ...c, active } : c))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await fetch(`/api/promo-codes/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Could not delete code.");
      toast.success(`Promo code ${deleting.code} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
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
    <div className="space-y-6">
      {/* Create form */}
      <form
        onSubmit={createCode}
        className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2">
          <TicketPercent className="h-4 w-4 text-amber-600" />
          <h3 className="font-bold">Create a promo code</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="EID25"
              className="uppercase"
              maxLength={24}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off (%)</SelectItem>
                <SelectItem value="fixed">Fixed amount (Rs)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-value">
              {newType === "percent" ? "Percent (1–90)" : "Amount (Rs)"}
            </Label>
            <Input
              id="promo-value"
              type="number"
              min="1"
              step="any"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={newType === "percent" ? "10" : "500"}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-min">Min. order (Rs)</Label>
            <Input
              id="promo-min"
              type="number"
              min="0"
              step="100"
              value={newMin}
              onChange={(e) => setNewMin(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={creating}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create promo code
        </Button>
      </form>

      {/* List */}
      {codes.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white py-14 text-center">
          <TicketPercent className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-4 font-medium">No promo codes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first discount code above — it works instantly at
            checkout.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 shrink-0">
                <TicketPercent className="h-5 w-5 text-amber-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold tracking-wide">{c.code}</p>
                <p className="text-xs text-zinc-500">
                  {c.type === "percent"
                    ? `${c.value}% off`
                    : `${fmtPrice(c.value)} off`}
                  {c.minOrder > 0
                    ? ` · min. order ${fmtPrice(c.minOrder)}`
                    : " · no minimum"}
                  {` · used ${c.usedCount} time${c.usedCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={c.active}
                    disabled={busyId === c.id}
                    onCheckedChange={(v) => toggleActive(c, v)}
                    aria-label={`Toggle ${c.code}`}
                  />
                  <span className="text-xs text-zinc-500 w-14">
                    {c.active ? "Active" : "Off"}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleting(c)}
                  aria-label={`Delete ${c.code}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.code}” will stop working at checkout immediately.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleting?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={busyId === deleting?.id}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {busyId === deleting?.id && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
