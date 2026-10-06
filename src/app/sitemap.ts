import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Dynamic sitemap: static pages + every product page.
 * Product URLs use NEXT_PUBLIC_SITE_URL / VERCEL_URL when set.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
  ];

  try {
    const products = await db.product.findMany({
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    for (const p of products) {
      entries.push({
        url: `${base}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("Sitemap product query failed:", error);
  }

  return entries;
}
