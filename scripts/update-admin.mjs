/** Create or update admin credentials: bun scripts/update-admin.mjs <email> <password> */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
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
const passwordHash = await bcrypt.hash(password, 12);
const admin = await db.user.findFirst({ where: { role: "admin" } });

if (admin) {
  await db.user.update({
    where: { id: admin.id },
    data: { email: email.toLowerCase(), passwordHash, emailVerifiedAt: new Date() },
  });
  console.log(`admin updated: ${admin.email} -> ${email.toLowerCase()}`);
} else {
  // Fresh database — create the admin (mirrors the app's bootstrap claim).
  await db.user.create({
    data: {
      name: "Store Admin",
      email: email.toLowerCase(),
      phone: `admin-${randomBytes(6).toString("hex")}`,
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`admin created: ${email.toLowerCase()}`);
}
await db.$disconnect();
