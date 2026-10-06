"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

/**
 * Live social-proof badge: "N+ orders in the last 30 minutes".
 * Counted from REAL orders in the database (public aggregate endpoint) and
 * hidden completely when the count is 0 — never a fabricated number.
 *
 * tone="light" for white sections, tone="dark" for the dark hero.
 */
export function OrderPulse({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/orders/pulse", { cache: "no-store" });
        const data = await res.json();
        if (alive) setCount(Number(data.count) || 0);
      } catch {
        /* non-fatal */
      }
    }
    void poll();
    const id = window.setInterval(poll, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (!count || count <= 0) return null;

  const toneCls =
    tone === "dark"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700";

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${toneCls} ${className}`}
      role="status"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600" />
      </span>
      <Flame className="h-3.5 w-3.5 text-amber-600" />
      {count}+ order{count === 1 ? "" : "s"} in the last 30 minutes
    </p>
  );
}
