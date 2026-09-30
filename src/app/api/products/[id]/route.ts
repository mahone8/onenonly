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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const product = await db.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

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
    const data: Record<string, unknown> = {};

    // Name
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) errors.push("Product name is required.");
      else if (name.length > 120)
        errors.push("Product name is too long (max 120 chars).");
      else data.name = name;
    }

    // Category (validated against the categories table)
    if (body.category !== undefined) {
      const category =
        typeof body.category === "string" ? body.category.trim() : "";
      const slugs = await getCategorySlugs();
      if (!slugs.includes(category))
        errors.push(`Category must be one of: ${slugs.join(", ")}.`);
      else data.categorySlug = category;
    }

    // Watch attributes (brand / strap / case size)
    Object.assign(data, cleanAttrs(body));

    // Price
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0)
        errors.push("Price must be a number greater than 0.");
      else data.price = price;
    }

    // Compare price
    if (body.comparePrice !== undefined) {
      const raw = body.comparePrice;
      if (raw === null || raw === "") {
        data.comparePrice = null;
      } else {
        const cp = Number(raw);
        if (!Number.isFinite(cp) || cp <= 0)
          errors.push("Compare price must be a positive number.");
        else data.comparePrice = cp;
      }
    }

    // Description
    if (body.description !== undefined) {
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      if (description.length < 10)
        errors.push("Description should be at least 10 characters.");
      else data.description = description;
    }

    // Main image
    let mainImage: string | null = null;
    if (body.image !== undefined) {
      const image = typeof body.image === "string" ? body.image.trim() : "";
      if (!image || !isValidImageRef(image))
        errors.push(
          "Main image must be an http(s) URL or an uploaded file (/uploads/…)."
        );
      else {
        data.image = image;
        mainImage = image;
      }
    }

    // Badge
    if (body.badge !== undefined) {
      const badge = typeof body.badge === "string" ? body.badge.trim() : "";
      data.badge = badge ? badge.slice(0, 24) : null;
    }

    // Stock
    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0)
        errors.push("Stock must be a non-negative integer.");
      else data.stock = stock;
    }

    // Featured
    if (body.featured !== undefined) {
      data.featured = body.featured === true || body.featured === "true";
    }

    // Cross-field: comparePrice must exceed price
    const finalPrice = (data.price as number | undefined) ?? existing.price;
    const finalCompare =
      (data.comparePrice as number | null | undefined) ?? existing.comparePrice;
    if (finalCompare !== null && finalCompare <= finalPrice) {
      errors.push("Compare price should be higher than the selling price.");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(" ") },
        { status: 400 }
      );
    }

    // Regenerate slug if the name changed
    if (typeof data.name === "string" && data.name !== existing.name) {
      data.slug = await uniqueSlug(slugify(data.name), id);
    }

    await db.product.update({ where: { id }, data });

    // Gallery rewrite when the client sent an images array
    if (body.images !== undefined) {
      const main = mainImage ?? existing.image;
      await writeGallery(id, body.images, main, errors);
    }

    const product = await db.product.findUnique({
      where: { id },
      include: productInclude,
    });
    return NextResponse.json({
      success: true,
      product: product ? serializeProduct(product) : null,
    });
  } catch (error) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
