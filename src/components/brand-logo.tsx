"use client";

import { useCallback, useState } from "react";

type BrandLogoProps = {
  /** Height of the logo box in px (image mode). */
  size?: number;
  /** Font size class for the fallback wordmark. */
  className?: string;
  /** Light-on-dark variant of the fallback wordmark. */
  onDark?: boolean;
};

/**
 * Brand logo for OneNOnly.
 * Renders /logo.webp (light contexts: charcoal + gold) or /logo-dark.webp
 * (dark contexts: all gold) when the files exist; otherwise falls back to
 * the "OnenOnly." wordmark so the brand never renders broken.
 * Drop replacement files into public/ and they appear everywhere.
 */
export function BrandLogo({
  size = 36,
  className = "text-2xl",
  onDark = false,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = onDark ? "/logo-dark.webp" : "/logo.webp";

  // The 404 error event can fire before React hydrates (SSR race), so also
  // check the image state synchronously when the <img> attaches.
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (!failed) {
    return (
      <span
        className="inline-flex items-center"
        style={{ height: size }}
        aria-label="OneNOnly"
      >
        { }
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt="OneNOnly logo"
          height={size}
          style={{ height: size, width: "auto", maxWidth: 160 }}
          className="object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`font-display font-bold tracking-tight ${className} ${
        onDark ? "text-white" : "text-zinc-950"
      }`}
    >
      Onen<span className="italic text-amber-600">Only</span>
      <span className="text-amber-600">.</span>
    </span>
  );
}
