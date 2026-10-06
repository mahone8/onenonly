#!/usr/bin/env node
/**
 * One N Only — product import script (CSV or JSON → Neon Postgres).
 *
 * Migrate your catalogue without the admin UI:
 *   node scripts/import-products.mjs my-products.csv
 *   node scripts/import-products.mjs my-products.json
 *   node scripts/import-products.mjs my-products.csv --replace
 *
 * JSON format: the file downloaded from Admin → Export, OR a bare array:
 *   [{ "name": "...", "category": "watches", "price": 4990, "description":
 *      "…", "image": "https://…", "images": ["https://…"],
 *      "brand": "Casio", "strap": "Leather", "caseSize": "40mm",
 *      "comparePrice": 6990, "stock": 10, "featured": true, "badge": "New" }]
 *
 * CSV columns (header row required):
 *   name, category, price, description, image,
 *   comparePrice, brand, strap, caseSize, stock, featured, badge, images
 *   - images: gallery URLs separated by "|"
 *   - featured: true/false   ·   stock defaults to 0
 *
 * Behaviour: upsert by slug (existing products are updated, new ones are
 * created). --replace first deletes ALL existing products.
 * Ratings/review counts are managed by real customer reviews, not imports.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

// Load .env (DATABASE_URL) — .env values override stale launcher exports.
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["'](.*)["']$/, "$1");
    if (!value || value.startsWith("#")) continue;
    process.env[m[1]] = value;
  }
} catch {
  /* fall back to shell env */
}

const db = new PrismaClient();

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "product"
  );
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one product row.");
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    rows.push(row);
  }
  return rows;
}

/** Minimal CSV line splitter handling quoted fields. */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizeRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
  const name = get("name", "Name", "title");
  const category = get("category", "Category").toLowerCase();
  const price = Number(get("price", "Price"));
  const description = get("description", "Description");
  const image = get("image", "Image", "image_url", "imageUrl");
  const comparePriceRaw = get("comparePrice", "compare_price");
  const stockRaw = get("stock", "Stock");
  const imagesRaw = get("images", "gallery");
  const featuredRaw = get("featured", "Featured").toLowerCase();

  const errors = [];
  if (!name) errors.push("name is required");
  if (!category) errors.push("category is required");
  if (!Number.isFinite(price) || price <= 0) errors.push("price must be > 0");
  if (description.length < 10) errors.push("description must be at least 10 chars");
  if (!/^https?:\/\/.+/.test(image) && !image.startsWith("/uploads/"))
    errors.push("image must be an http(s) URL or /uploads/ path");

  const images = imagesRaw
    ? imagesRaw.split("|").map((u) => u.trim()).filter(Boolean)
    : [];

  return {
    errors,
    row: {
      name,
      category,
      price,
      comparePrice: comparePriceRaw ? Number(comparePriceRaw) : null,
      description,
      image,
      images,
      brand: get("brand", "Brand") || null,
      strap: get("strap", "strapType", "strap_type") || null,
      caseSize: get("caseSize", "case_size", "size") || null,
      stock: Number.isFinite(Number(stockRaw)) && stockRaw !== "" ? Number(stockRaw) : 0,
      featured: featuredRaw === "true" || featuredRaw === "1" || featuredRaw === "yes",
      badge: get("badge", "Badge") || null,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: node scripts/import-products.mjs <products.csv|products.json> [--replace]");
    process.exit(1);
  }

  const raw = readFileSync(path.resolve(file), "utf8");
  let rows;
  if (file.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(raw);
    rows = Array.isArray(parsed) ? parsed : parsed.products;
    if (!Array.isArray(rows)) throw new Error("JSON must be an array or {products: [...] }");
  } else {
    rows = parseCsv(raw);
  }

  const validCategories = new Set(
    (await db.category.findMany()).map((c) => c.slug)
  );
  if (validCategories.size === 0)
    throw new Error("No categories found — run scripts/setup-db.mjs first.");

  if (replace) {
    const count = await db.productImage.deleteMany();
    const n = await db.product.deleteMany();
    console.log(`--replace: removed ${n.count} products (${count.count} gallery rows)`);
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const r of rows) {
    const { row, errors } =
      r && typeof r === "object" && !Array.isArray(r) ? normalizeRow(r) : { errors: ["not an object"], row: null };
    if (errors.length > 0) {
      failed++;
      console.error(`✗ ${(row?.name || "(unnamed)")} — ${errors.join("; ")}`);
      continue;
    }
    if (!validCategories.has(row.category)) {
      failed++;
      console.error(
        `✗ ${row.name} — unknown category "${row.category}" (valid: ${[...validCategories].join(", ")})`
      );
      continue;
    }
    try {
      const slug = slugify(row.name);
      const fields = {
        name: row.name,
        categorySlug: row.category,
        brand: row.brand,
        strap: row.strap,
        caseSize: row.caseSize,
        price: row.price,
        comparePrice: row.comparePrice && row.comparePrice > row.price ? row.comparePrice : null,
        description: row.description,
        image: row.image,
        badge: row.badge,
        stock: row.stock,
        featured: row.featured,
      };
      const existing = await db.product.findUnique({ where: { slug } });
      if (existing) {
        await db.product.update({ where: { slug }, data: fields });
        await rewriteGallery(existing.id, row.image, row.images);
        updated++;
      } else {
        const createdRow = await db.product.create({ data: { ...fields, slug } });
        await rewriteGallery(createdRow.id, row.image, row.images);
        created++;
      }
    } catch (err) {
      failed++;
      console.error(`✗ ${row.name} — ${err.message}`);
    }
  }

  console.log(`\nDone — created: ${created}, updated: ${updated}, failed: ${failed}`);
  if (failed > 0) process.exitCode = 2;
}

async function rewriteGallery(productId, mainImage, images) {
  await db.productImage.deleteMany({ where: { productId } });
  const ordered = [mainImage, ...images.filter((u) => u !== mainImage)];
  if (ordered.length > 0) {
    await db.productImage.createMany({
      data: ordered.map((url, i) => ({ productId, url, sortOrder: i })),
    });
  }
}

main()
  .catch((err) => {
    console.error("Import failed:", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
