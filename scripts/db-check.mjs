/** Quick DB inspection: bun scripts/db-check.mjs */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["'](.*)["']$/, "$1");
    if (!value || value.startsWith("#")) continue;
    process.env[m[1]] = value;
  }
} catch {
  /* shell env */
}

const db = new PrismaClient();
try {
  const products = await db.product.findMany({ include: { images: true } });
  console.log("DB product count:", products.length);
  for (const p of products)
    console.log(
      `- ${p.name} | brand: ${p.brand} | strap: ${p.strap} | case: ${p.caseSize} | images: ${p.images.length} | cat: ${p.categorySlug} | stock: ${p.stock}`
    );
  const [users, orders, reviews] = await Promise.all([
    db.user.findMany({ select: { name: true, role: true, phone: true } }),
    db.order.count(),
    db.review.count(),
  ]);
  console.log("users:", JSON.stringify(users), "| orders:", orders, "| reviews:", reviews);
} finally {
  await db.$disconnect();
}
