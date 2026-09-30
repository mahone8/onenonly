/** Update admin credentials: bun scripts/update-admin.mjs <email> <password> */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  const value = m[2].replace(/^["'](.*)["']$/, "$1");
  if (!value || value.startsWith("#")) continue;
  process.env[m[1]] = value; // always override — platform presets stale vars
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: bun scripts/update-admin.mjs <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("password must be at least 8 characters");
  process.exit(1);
}

const db = new PrismaClient();
const admin = await db.user.findFirst({ where: { role: "admin" } });
if (!admin) {
  console.error("no admin user found");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
await db.user.update({
  where: { id: admin.id },
  data: { email, passwordHash, emailVerifiedAt: new Date() },
});
console.log(`admin updated: ${admin.email} -> ${email}`);
await db.$disconnect();
