import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productInclude, serializeProduct } from "@/lib/catalog";

/**
 * GET /api/admin/export
 * Admin-only. Downloads every product as a portable JSON file that can be
 * re-imported into any One N Only deployment via POST /api/admin/import —
 * this is how the catalogue moves between stores/databases.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "asc" },
      include: productInclude,
    });

    const payload = {
      app: "onenonly",
      version: 2,
      exportedAt: new Date().toISOString(),
      count: products.length,
      products: products.map(serializeProduct),
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="onenonly-products-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export products." },
      { status: 500 }
    );
  }
}
