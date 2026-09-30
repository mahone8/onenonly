"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquareText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export type AdminReview = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  product?: { name: string; slug: string };
};

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 ${
            i < value ? "fill-amber-500 text-amber-500" : "fill-zinc-200 text-zinc-200"
          }`}
          aria-hidden
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

type Props = { onUnauthorized: () => void };

export function ReviewsTab({ onUnauthorized }: Props) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews?all=1", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to load reviews.");
      setReviews(data.reviews as AdminReview[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok || !data.success)
        throw new Error(data.error || "Could not delete review.");
      toast.success("Review removed.");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
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
      <p className="text-sm text-muted-foreground">
        Customer reviews publish instantly on the product page. Remove any that
        are spam or inappropriate — the product&apos;s review count updates
        automatically.
      </p>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white py-14 text-center">
          <MessageSquareText className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-4 font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reviews submitted by customers from product pages will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="flex min-w-0 gap-3 rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-zinc-950">{r.name}</p>
                  <Stars value={r.rating} />
                  <span className="text-xs text-zinc-400">
                    {new Date(r.createdAt).toLocaleDateString("en-PK", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {r.product ? r.product.name : "Product removed"}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {r.comment}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleting(r)}
                aria-label="Delete review"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name}&apos;s review will be permanently removed from
              the product page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={busy}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
