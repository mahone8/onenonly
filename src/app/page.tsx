import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { productInclude, serializeProduct } from "@/lib/catalog";
import type { Category, Product } from "@/components/store/types";
import type { PublicReview } from "@/components/store/sections";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let latestReviews: PublicReview[] = [];

  try {
    const [rows, catRows, reviewRows] = await Promise.all([
      db.product.findMany({ orderBy: { createdAt: "asc" }, include: productInclude }),
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { product: { select: { name: true, slug: true } } },
      }),
    ]);

    products = rows.map(serializeProduct);
    categories = catRows.map((c) => ({ slug: c.slug, name: c.name }));
    latestReviews = reviewRows.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      productName: r.product?.name ?? null,
      productSlug: r.product?.slug ?? null,
    }));
  } catch (error) {
    console.error("Failed to load store data from database:", error);
  }

  return (
    <AppShell
      initialProducts={products}
      categories={categories}
      latestReviews={latestReviews}
    />
  );
}
