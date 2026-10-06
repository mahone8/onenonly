import { db } from "@/lib/db";
import { sanitizeImages, slugify } from "@/lib/validate";
import type { Prisma } from "@prisma/client";

/**
 * Catalog helpers shared by the products API, import/export and pages:
 *  - DB-driven category validation (with a tiny TTL cache)
 *  - product_images table persistence behind the same `images: string[]`
 *    shape the UI already speaks
 */

let catCache: { slugs: string[]; at: number } | null = null;
const CAT_TTL_MS = 30_000;

export async function getCategorySlugs(): Promise<string[]> {
  if (catCache && Date.now() - catCache.at < CAT_TTL_MS) return catCache.slugs;
  const rows = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const slugs = rows.map((r) => r.slug);
  catCache = { slugs, at: Date.now() };
  return slugs;
}

export function clearCategoryCache() {
  catCache = null;
}

/** Validate one optional text attribute (brand / strap / case size). */
export function cleanAttr(raw: unknown, max = 40): string | null {
  if (raw === undefined || raw === null) return undefined as unknown as string | null;
  const s = typeof raw === "string" ? raw.trim() : "";
  return s ? s.slice(0, max) : null;
}

export function cleanAttrs(body: Record<string, unknown>) {
  const out: { brand?: string | null; strap?: string | null; caseSize?: string | null } = {};
  if (body.brand !== undefined) out.brand = cleanAttr(body.brand);
  if (body.strap !== undefined) out.strap = cleanAttr(body.strap);
  if (body.caseSize !== undefined) out.caseSize = cleanAttr(body.caseSize);
  return out;
}

type ProductWithImages = Prisma.ProductGetPayload<{ include: { images: true } }>;

/**
 * Serialize a Product (with its image rows) into the shape the storefront
 * and admin already consume: `category` (string slug) + `images` (string[]).
 */
export function serializeProduct(p: ProductWithImages) {
  const gallery = [...p.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => i.url);
  // Main image first; de-dup.
  const images = [p.image, ...gallery.filter((u) => u !== p.image)].filter(Boolean);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.categorySlug,
    brand: p.brand,
    strap: p.strap,
    caseSize: p.caseSize,
    price: p.price,
    comparePrice: p.comparePrice,
    description: p.description,
    image: p.image,
    images,
    badge: p.badge,
    rating: p.rating,
    reviews: p.reviews,
    stock: p.stock,
    featured: p.featured,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const productInclude = { images: true } satisfies Prisma.ProductInclude;

/**
 * Replace the product's gallery rows with the given list (max 8, validated).
 * Returns the sanitized list actually stored.
 */
export async function writeGallery(
  productId: string,
  rawImages: unknown,
  mainImage: string,
  errors: string[]
): Promise<string[]> {
  const list = sanitizeImages(rawImages, errors);
  await db.productImage.deleteMany({ where: { productId } });
  const ordered = [mainImage, ...list.filter((u) => u !== mainImage)];
  if (ordered.length > 0) {
    await db.productImage.createMany({
      data: ordered.map((url, i) => ({ productId, url, sortOrder: i })),
    });
  }
  return ordered;
}

export function baseSlug(name: string) {
  return slugify(name) || "product";
}

/** Generate a unique URL slug for a product name (server-only). */
export async function uniqueSlug(base: string, excludeId?: string) {
  let slug = baseSlug(base);
  let candidate = slug;
  let n = 2;
  for (;;) {
    const existing = await db.product.findUnique({
      where: { slug: candidate },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${slug}-${n}`;
    n += 1;
  }
}
