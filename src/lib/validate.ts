/**
 * Pure validation helpers (client-safe — no database, no node imports).
 * Server-only helpers (uniqueSlug) live in src/lib/catalog.ts.
 */

/** Fallback list; the source of truth is the categories table (server-side). */
export const VALID_CATEGORIES = [
  "caps",
  "wallets",
  "bracelets",
  "glasses",
  "watches",
];

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Accepts absolute http(s) URLs and site-relative paths
 * (e.g. /uploads/xxx.jpg produced by the device-upload endpoint).
 */
export function isValidImageRef(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  return /^https?:\/\/.+/i.test(url);
}

/** Normalize + validate an array of gallery image refs (max 8). */
export function sanitizeImages(
  raw: unknown,
  errors: string[]
): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push("Images must be an array of URLs.");
    return [];
  }
  const out: string[] = [];
  for (const item of raw.slice(0, 8)) {
    const url = typeof item === "string" ? item.trim() : "";
    if (!url) continue;
    if (!isValidImageRef(url)) {
      errors.push(
        "Gallery images must be http(s) URLs or uploaded files (/uploads/…)."
      );
      continue;
    }
    if (!out.includes(url)) out.push(url);
  }
  return out;
}
