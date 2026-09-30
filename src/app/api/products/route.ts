import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isValidImageRef, slugify } from "@/lib/validate";
import {
  cleanAttrs,
  getCategorySlugs,
  productInclude,
  serializeProduct,
  uniqueSlug,
  writeGallery,
} from "@/lib/catalog";

/**
 * GET /api/products — public catalogue.
 * Supports ?category= / ?q= / ?sort= as before, plus optional watch
 * attribute filters: ?brand= ?strap= ?caseSize= ?minPrice= ?maxPrice=
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const brand = searchParams.get("brand");
    const strap = searchParams.get("strap");
    const caseSize = searchParams.get("caseSize");
    // NB: Number(null) === 0 — parse price bounds explicitly to avoid
    // filtering out the whole catalogue when the params are absent.
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") ?? "featured";

    const where: Record<string, unknown> = {};
    if (category && category !== "all") where.categorySlug = category;
    if (brand) where.brand = brand;
    if (strap) where.strap = strap;
    if (caseSize) where.caseSize = caseSize;
    const min = minPrice !== null && minPrice !== "" ? Number(minPrice) : null;
    const max = maxPrice !== null && maxPrice !== "" ? Number(maxPrice) : null;
    if (Number.isFinite(min) || Number.isFinite(max)) {
      const price: Record<string, number> = {};
      if (min !== null && Number.isFinite(min)) price.gte = min;
      if (max !== null && Number.isFinite(max)) price.lte = max;
      where.price = price;
    }
    if (q && q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: "insensitive" } },
        { description: { contains: q.trim(), mode: "insensitive" } },
        { brand: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    let orderBy: Record<string, string> = { createdAt: "asc" };
    if (sort === "price-asc") orderBy = { price: "asc" };
    else if (sort === "price-desc") orderBy = { price: "desc" };
    else if (sort === "rating") orderBy = { rating: "desc" };

    const products = await db.product.findMany({ where, orderBy, include: productInclude });
    return NextResponse.json({
      success: true,
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products — create a product (admin only).
 * Category must exist in the categories table; gallery images are stored in
 * product_images; brand/strap/caseSize are optional watch attributes.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const categorySlugs = await getCategorySlugs();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) errors.push("Product name is required.");
    if (name.length > 120) errors.push("Product name is too long (max 120 chars).");

    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    if (!categorySlugs.includes(category))
      errors.push(
        `Category must be one of: ${categorySlugs.join(", ")}.`
      );

    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0)
      errors.push("Price must be a number greater than 0.");

    let comparePrice: number | null = null;
    if (body.comparePrice !== null && body.comparePrice !== undefined && body.comparePrice !== "") {
      const cp = Number(body.comparePrice);
      if (!Number.isFinite(cp) || cp <= 0)
        errors.push("Compare price must be a positive number.");
      else comparePrice = cp;
    }
    if (comparePrice !== null && comparePrice <= price)
      errors.push("Compare price should be higher than the selling price.");

    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    if (!description) errors.push("Description is required.");
    if (description.length < 10)
      errors.push("Description should be at least 10 characters.");

    const image = typeof body.image === "string" ? body.image.trim() : "";
    if (!image) errors.push("Main image is required.");
    if (image && !isValidImageRef(image))
      errors.push("Main image must be an http(s) URL or an uploaded file (/uploads/…).");

    const badge = typeof body.badge === "string" ? body.badge.trim() : "";
    const ratingRaw = Number(body.rating);
    const rating =
      Number.isFinite(ratingRaw) && ratingRaw >= 0 && ratingRaw <= 5
        ? Math.round(ratingRaw * 10) / 10
        : 0;
    const reviewsRaw = Number(body.reviews);
    const reviews = Number.isInteger(reviewsRaw) && reviewsRaw >= 0 ? reviewsRaw : 0;
    const stockRaw = Number(body.stock);
    const stock = Number.isInteger(stockRaw) && stockRaw >= 0 ? stockRaw : 0;
    const featured = body.featured === true || body.featured === "true";

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(" ") },
        { status: 400 }
      );
    }

    const slug = await uniqueSlug(slugify(name));
    const attrs = cleanAttrs(body);

    const created = await db.product.create({
      data: {
        slug,
        name,
        categorySlug: category,
        ...attrs,
        price,
        comparePrice,
        description,
        image,
        badge: badge ? badge.slice(0, 24) : null,
        rating,
        reviews,
        stock,
        featured,
      },
    });
    await writeGallery(created.id, body.images, image, errors);

    const product = await db.product.findUnique({
      where: { id: created.id },
      include: productInclude,
    });
    return NextResponse.json(
      { success: true, product: product ? serializeProduct(product) : null },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
