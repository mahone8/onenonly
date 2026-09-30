"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSession } from "./use-session";

type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export function ReviewStars({
  value,
  className = "h-3.5 w-3.5",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${className} ${
            i < Math.round(value)
              ? "fill-amber-500 text-amber-500"
              : "fill-zinc-200 text-zinc-200"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Reviews list + submission form for a product.
 * Real reviews only — shown as submitted; moderated by the admin.
 */
export function ProductReviews({
  productId,
  rating,
  reviewCount,
}: {
  productId: string;
  rating: number;
  reviewCount: number;
}) {
  const { user } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rName, setRName] = useState("");
  const [rRating, setRRating] = useState(5);
  const [rComment, setRComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.name) setRName(user.name);
  }, [user?.name]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) setReviews(data.reviews as Review[]);
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          name: rName,
          rating: rRating,
          comment: rComment,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not submit review.");
      }
      toast.success("Thanks! Your review has been published.");
      setRComment("");
      setRRating(5);
      setShowForm(false);
      await loadReviews();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not submit review."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="product-reviews" className="scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-950">
          Customer reviews
          <span className="ml-2 text-sm font-medium text-zinc-400">
            {reviewCount > 0
              ? `${rating.toFixed(1)} · ${reviewCount} review${
                  reviewCount === 1 ? "" : "s"
                }`
              : "No reviews yet"}
          </span>
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((s) => !s)}
          className="shrink-0 border-amber-700 text-amber-800 hover:bg-amber-50 hover:text-amber-900 rounded-full"
        >
          <MessageSquarePlus className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "Write a review"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submitReview}
          className="mt-4 space-y-3 rounded-xl border bg-zinc-50 p-4"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prv-name">Your name</Label>
              <Input
                id="prv-name"
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                placeholder="e.g. Ahmed"
                className="h-11"
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <div className="flex h-11 items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRRating(n)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        n <= rRating
                          ? "fill-amber-500 text-amber-500"
                          : "fill-zinc-200 text-zinc-200 hover:fill-amber-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prv-comment">Your review</Label>
            <Textarea
              id="prv-comment"
              value={rComment}
              onChange={(e) => setRComment(e.target.value)}
              placeholder="How was the quality, delivery, packaging…"
              rows={3}
              className="resize-none"
              maxLength={1000}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full sm:w-auto h-11 rounded-full bg-amber-600 hover:bg-amber-500 text-white px-8"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit review
              </>
            )}
          </Button>
        </form>
      )}

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-zinc-400 rounded-xl border border-dashed">
            <p className="text-sm">
              No reviews yet — be the first to review this product.
            </p>
          </div>
        ) : (
          reviews.map((r) => (
            <figure
              key={r.id}
              className="border-b border-zinc-100 pb-5 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-zinc-950">{r.name}</p>
                <ReviewStars value={r.rating} className="h-3 w-3" />
              </div>
              <blockquote className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                {r.comment}
              </blockquote>
              <figcaption className="mt-1 text-[11px] text-zinc-400">
                {new Date(r.createdAt).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </figcaption>
            </figure>
          ))
        )}
      </div>
    </section>
  );
}
