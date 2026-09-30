// Dump products from the current SQLite DB before switching provider.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });
  await Bun.write(
    "/home/z/my-project/scripts/products-backup.json",
    JSON.stringify(products, null, 2)
  );
  console.log(`Dumped ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
