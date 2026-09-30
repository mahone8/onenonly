// Seed the Neon Postgres DB: migrate the 25 backed-up products with PKR
// pricing, seed promo codes and a few sample reviews.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RATE = 278; // USD -> PKR

// Convert a USD price to a realistic PKR retail price (ends in -990/-090…)
function pkr(usd: number): number {
  const raw = Math.floor((usd * RATE) / 100) * 100 - 10;
  return Math.max(490, raw);
}

type BackupProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  comparePrice: number | null;
  description: string;
  image: string;
  badge: string | null;
  rating: number;
  reviews: number;
  stock: number;
  featured: boolean;
  createdAt: string;
};

const PROMO_SEED = [
  { code: "ONE10", type: "percent", value: 10, minOrder: 0, active: true },
  { code: "WELCOME200", type: "fixed", value: 200, minOrder: 2000, active: true },
  { code: "EID25", type: "percent", value: 25, minOrder: 10000, active: true },
];

const REVIEW_SEED: Array<{
  slug: string;
  name: string;
  rating: number;
  comment: string;
}> = [
  {
    slug: "varsity-corduroy-cap",
    name: "Hamza A.",
    rating: 5,
    comment:
      "Topi ki quality zabardast hai — stitching perfect and the corduroy feels premium. Delivered in Faisalabad within two days.",
  },
  {
    slug: "varsity-corduroy-cap",
    name: "Bilal R.",
    rating: 4,
    comment:
      "Fits well and looks exactly like the photos. Colour is slightly darker in person but I actually prefer it.",
  },
  {
    slug: "heritage-bifold-wallet",
    name: "Usman T.",
    rating: 5,
    comment:
      "The leather has a lovely smell and the stitching is tight. Paid cash on delivery, everything was sealed and genuine.",
  },
  {
    slug: "heritage-bifold-wallet",
    name: "Areeba S.",
    rating: 5,
    comment:
      "Bought it as a gift for my brother — packaging was beautiful and he uses it every day. Highly recommended.",
  },
  {
    slug: "emerald-dial-automatic",
    name: "Daniyal K.",
    rating: 5,
    comment:
      "The dial catches light beautifully. Keeps accurate time so far. COD process was smooth, courier counted the cash twice even.",
  },
  {
    slug: "midnight-wayfarer",
    name: "Sana M.",
    rating: 4,
    comment:
      "Sturdy frame, dark lenses work great in this sun. Wish they included a hard case instead of the pouch, but great value.",
  },
];

async function main() {
  const backup = (await Bun.file(
    "/home/z/my-project/scripts/products-backup.json"
  ).json()) as BackupProduct[];

  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Products already seeded (${existing}). Skipping product seed.`);
  } else {
    for (const p of backup) {
      const price = pkr(p.price);
      let comparePrice = p.comparePrice != null ? pkr(p.comparePrice) : null;
      if (comparePrice !== null && comparePrice <= price)
        comparePrice = price + 490;

      await prisma.product.create({
        data: {
          slug: p.slug,
          name: p.name,
          category: p.category,
          price,
          comparePrice,
          description: p.description,
          image: p.image,
          images: [],
          badge: p.badge,
          rating: p.rating,
          reviews: p.reviews,
          stock: p.stock,
          featured: p.featured,
          createdAt: new Date(p.createdAt),
        },
      });
    }
    console.log(`Seeded ${backup.length} products with PKR pricing.`);
  }

  const promoCount = await prisma.promoCode.count();
  if (promoCount === 0) {
    await prisma.promoCode.createMany({ data: PROMO_SEED });
    console.log(`Seeded ${PROMO_SEED.length} promo codes.`);
  } else {
    console.log(`Promo codes already seeded (${promoCount}).`);
  }

  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    const products = await prisma.product.findMany({
      where: { slug: { in: REVIEW_SEED.map((r) => r.slug) } },
      select: { id: true, slug: true, reviews: true },
    });
    const byslug = new Map(products.map((p) => [p.slug, p]));
    for (const r of REVIEW_SEED) {
      const product = byslug.get(r.slug);
      if (!product) continue;
      await prisma.review.create({
        data: {
          productId: product.id,
          name: r.name,
          rating: r.rating,
          comment: r.comment,
          createdAt: new Date(Date.now() - Math.random() * 20 * 864e5),
        },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { reviews: { increment: 1 } },
      });
    }
    console.log(`Seeded ${REVIEW_SEED.length} sample reviews.`);
  } else {
    console.log(`Reviews already seeded (${reviewCount}).`);
  }

  const sample = await prisma.product.findFirst({
    orderBy: { createdAt: "asc" },
  });
  console.log(
    "Sample converted price:",
    sample?.name,
    "->",
    sample?.price,
    "PKR"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
