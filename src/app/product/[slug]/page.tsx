import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { productInclude, serializeProduct } from "@/lib/catalog";
import { ProductDetail } from "@/components/store/product-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  const row = await db.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  return row ? serializeProduct(row) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getProduct(slug);
    if (!p) return { title: "Product not found — One N Only" };
    const title = `${p.name} — One N Only`;
    const description =
      p.description.length > 160 ? `${p.description.slice(0, 157)}…` : p.description;
    return {
      title,
      description,
      alternates: { canonical: `/product/${p.slug}` },
      openGraph: {
        title,
        description,
        images: [{ url: p.image }],
        type: "website",
        siteName: "ONE N ONLY",
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "One N Only" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product = null;
  try {
    product = await getProduct(slug);
  } catch (error) {
    console.error("Product page load failed:", error);
  }
  if (!product) notFound();

  return <ProductDetail product={JSON.parse(JSON.stringify(product))} />;
}
