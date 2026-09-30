import type { Metadata } from "next";
import { db } from "@/lib/db";
import { AdminPageClient } from "@/components/admin/admin-page-client";
import { productInclude, serializeProduct } from "@/lib/catalog";
import type { Category, Product } from "@/components/store/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Panel — One N Only",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    const [rows, catRows] = await Promise.all([
      db.product.findMany({
        orderBy: { createdAt: "asc" },
        include: productInclude,
      }),
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);
    products = rows.map(serializeProduct);
    categories = catRows.map((c) => ({ slug: c.slug, name: c.name }));
  } catch (error) {
    console.error("Failed to load admin data from database:", error);
  }

  return (
    <AdminPageClient initialProducts={products} categories={categories} />
  );
}
