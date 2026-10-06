/**
 * In-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance deployment (the common case for this
 * store). For multi-instance deployments swap the Map for Redis — the
 * call sites don't change.
 */
type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < 3_600_000);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export type RateResult = { ok: boolean; retryAfterSec: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers (Caddy sets X-Real-IP). */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
