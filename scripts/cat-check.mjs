import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  const value = m[2].replace(/^["'](.*)["']$/, "$1");
  if (!value || value.startsWith("#")) continue;
  if (!process.env[m[1]]) process.env[m[1]] = value;
}
const db = new PrismaClient();
const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
console.log("categories:", cats.map(c => `${c.slug}(${c.name})`).join(", "));
const admins = await db.user.findMany({ where: { role: "admin" }, select: { email: true, name: true, phone: true } });
console.log("admins:", JSON.stringify(admins));
await db.$disconnect();
