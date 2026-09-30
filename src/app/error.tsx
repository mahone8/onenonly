"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl sm:text-8xl font-display font-bold tracking-tight">
        5<span className="italic text-amber-400">00</span>
      </p>
      <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm sm:text-base text-zinc-400 leading-relaxed">
        An unexpected error occurred on our side. Try again — if it keeps
        happening, please come back in a few minutes.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-white/40 text-white hover:bg-white hover:text-zinc-950 font-semibold transition-colors"
        >
          Back to the store
        </Link>
      </div>
      <p className="mt-10 text-xs text-zinc-600">
        ONE N ONLY · Faisalabad, Pakistan · Cash on Delivery
      </p>
    </div>
  );
}
