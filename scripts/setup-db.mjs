/**
 * One N Only — database setup script.
 * Seeds the store's real categories (the 5 niches of the catalogue).
 * Safe to re-run: it only inserts categories that are missing.
 *
 * Usage:  node scripts/setup-db.mjs   (or: bun scripts/setup-db.mjs)
 * Requires DATABASE_URL (Neon Postgres) in the environment or .env.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

// Standalone scripts don't get Next's automatic .env loading — parse it here
// (.env values override stale launcher exports, same policy as src/lib/env.ts).
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["'](.*)["']$/, "$1");
    if (!value || value.startsWith("#")) continue;
    process.env[m[1]] = value;
  }
} catch {
  /* .env optional when vars are exported in the shell */
}

const CATEGORIES = [
  { slug: "caps", name: "Caps", sortOrder: 1 },
  { slug: "wallets", name: "Wallets", sortOrder: 2 },
  { slug: "bracelets", name: "Bracelets", sortOrder: 3 },
  { slug: "glasses", name: "Glasses", sortOrder: 4 },
  { slug: "watches", name: "Watches", sortOrder: 5 },
];

const db = new PrismaClient();

try {
  for (const c of CATEGORIES) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
    console.log(`category ready: ${c.slug}`);
  }
  const [products, reviews, orders, promos, users] = await Promise.all([
    db.product.count(),
    db.review.count(),
    db.order.count(),
    db.promoCode.count(),
    db.user.count(),
  ]);
  console.log(
    `\nDB state — products: ${products}, reviews: ${reviews}, orders: ${orders}, promo codes: ${promos}, users: ${users}`
  );
  console.log("Setup complete.");
} catch (err) {
  console.error("Setup failed:", err.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
