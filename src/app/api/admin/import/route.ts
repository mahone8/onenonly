import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isValidImageRef, sanitizeImages } from "@/lib/validate";
import { baseSlug, getCategorySlugs, uniqueSlug } from "@/lib/catalog";

const MAX_PRODUCTS = 500;

type ImportRow = Record<string, unknown>;

type ParsedProduct = {
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  strap: string | null;
  caseSize: string | null;
  price: number;
  comparePrice: number | null;
  description: string;
  image: string;
  images: string[];
  badge: string | null;
  stock: number;
  featured: boolean;
};

function slugOk(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    slug.length <= 140
  );
}

function optText(v: unknown, max = 40): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
}

/** Same validation rules as manual product creation (POST /api/products). */
function parseRow(row: ImportRow, categorySlugs: string[]) {
  const errors: string[] = [];

  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) errors.push("name is required.");
  if (name.length > 120) errors.push("name is too long (max 120 chars).");

  const category = typeof row.category === "string" ? row.category.trim() : "";
  if (!categorySlugs.includes(category))
    errors.push(
      `category "${category || "(empty)"}" is not allowed — use one of: ${categorySlugs.join(", ")}.`
    );

  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0)
    errors.push("price must be a number greater than 0.");

  let comparePrice: number | null = null;
  if (row.comparePrice !== null && row.comparePrice !== undefined && row.comparePrice !== "") {
    const cp = Number(row.comparePrice);
    if (!Number.isFinite(cp) || cp <= 0) errors.push("comparePrice must be a positive number.");
    else comparePrice = cp;
  }
  if (comparePrice !== null && comparePrice <= price)
    errors.push("comparePrice should be higher than price.");

  const description =
    typeof row.description === "string" ? row.description.trim() : "";
  if (description.length < 10)
    errors.push("description must be at least 10 characters.");

  const image = typeof row.image === "string" ? row.image.trim() : "";
  if (!image) errors.push("main image is required.");
  else if (!isValidImageRef(image))
    errors.push("main image must be an http(s) URL or an uploaded file (/uploads/…).");

  const images = sanitizeImages(row.images, errors);

  const stockRaw = Number(row.stock);
  const stock = Number.isInteger(stockRaw) && stockRaw >= 0 ? stockRaw : 0;
  const featured = row.featured === true || row.featured === "true";

  const parsed: ParsedProduct = {
    slug: slugOk(row.slug) ? (row.slug as string) : "",
    name,
    category,
    brand: optText(row.brand),
    strap: optText(row.strap),
    caseSize: optText(row.caseSize),
    price,
    comparePrice,
    description,
    image,
    images,
    badge: optText(row.badge, 24),
    stock,
    featured,
  };

  return { errors, parsed };
}

/**
 * POST /api/admin/import
 * Admin-only. Bulk upsert of products from an export file:
 *  - existing slugs are UPDATED in place (prices, stock, images, …)
 *  - new slugs are CREATED (invalid/missing slugs are regenerated)
 * Ratings/review counts are NOT imported — they are aggregates of real
 * customer reviews. Orders and reviews are never touched.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    let body: { products?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const raw = body.products;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No products found. The file must contain a \"products\" array (exactly what Export downloads).",
        },
        { status: 400 }
      );
    }
    if (raw.length > MAX_PRODUCTS) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many products in one import (max ${MAX_PRODUCTS}). Split the file and import in batches.`,
        },
        { status: 400 }
      );
    }

    const categorySlugs = await getCategorySlugs();

    const rows: { parsed: ParsedProduct; errors: string[] }[] = [];
    for (const [index, item] of raw.entries()) {
      if (typeof item !== "object" || item === null) {
        rows.push({
          parsed: null as unknown as ParsedProduct,
          errors: [`row ${index + 1}: not an object.`],
        });
        continue;
      }
      const { parsed, errors } = parseRow(item as ImportRow, categorySlugs);
      rows.push({ parsed, errors: errors.map((e) => `row ${index + 1}: ${e}`) });
    }

    const valid = rows.filter((r) => r.errors.length === 0);
    if (valid.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid products in file.",
          errors: rows.flatMap((r) => r.errors).slice(0, 20),
        },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const importErrors: string[] = [];
    const seenSlugs = new Set<string>();

    for (const { parsed, errors } of rows) {
      if (errors.length > 0) {
        failed += 1;
        importErrors.push(...errors.slice(0, 3));
        continue;
      }
      try {
        let slug = parsed.slug;
        if (slug && seenSlugs.has(slug)) slug = "";

        const existing = slug
          ? await db.product.findUnique({ where: { slug } })
          : await db.product.findFirst({ where: { name: parsed.name } });

        if (!slug) slug = await uniqueSlug(baseSlug(parsed.name));
        seenSlugs.add(slug);

        const fields = {
          name: parsed.name,
          categorySlug: parsed.category,
          brand: parsed.brand,
          strap: parsed.strap,
          caseSize: parsed.caseSize,
          price: parsed.price,
          comparePrice: parsed.comparePrice,
          description: parsed.description,
          image: parsed.image,
          badge: parsed.badge,
          stock: parsed.stock,
          featured: parsed.featured,
        };

        let productId: string;
        if (existing) {
          await db.product.update({ where: { id: existing.id }, data: { ...fields, slug } });
          productId = existing.id;
          updated += 1;
        } else {
          const createdRow = await db.product.create({
            data: { ...fields, slug },
          });
          productId = createdRow.id;
          created += 1;
        }
        await writeImportGallery(productId, parsed.image, parsed.images);
      } catch (err) {
        failed += 1;
        importErrors.push(
          `${parsed.name || "(unnamed)"}: ${err instanceof Error ? err.message : "database error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      failed,
      totalInFile: raw.length,
      errors: importErrors.slice(0, 20),
    });
  } catch (error) {
    console.error("POST /api/admin/import error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import products." },
      { status: 500 }
    );
  }
}

async function writeImportGallery(
  productId: string,
  mainImage: string,
  images: string[]
) {
  await db.productImage.deleteMany({ where: { productId } });
  const ordered = [mainImage, ...images.filter((u) => u !== mainImage)];
  if (ordered.length > 0) {
    await db.productImage.createMany({
      data: ordered.map((url, i) => ({ productId, url, sortOrder: i })),
    });
  }
}
