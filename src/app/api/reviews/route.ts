import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** GET /api/reviews?productId=… (public)  |  ?all=1 (admin: every review) */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("all") === "1") {
      if (!(await isAdmin())) {
        return NextResponse.json(
          { success: false, error: "Unauthorized — admin sign-in required." },
          { status: 401 }
        );
      }
      const reviews = await db.review.findMany({
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, slug: true } } },
      });
      return NextResponse.json({ success: true, reviews });
    }

    const productId = searchParams.get("productId");
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required." },
        { status: 400 }
      );
    }

    const reviews = await db.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

/** Public: submit a review (published instantly, moderated by admin). */
export async function POST(req: NextRequest) {
  // Basic spam throttle: 5 reviews per 10 minutes per IP
  const rl = rateLimit(`review:${clientIp(req)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Please wait a few minutes before reviewing again." },
      { status: 429 }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const productId = typeof body.productId === "string" ? body.productId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    const rating = Number(body.rating);

    const errors: string[] = [];
    if (!productId) errors.push("Product is required.");
    if (name.length < 2 || name.length > 60)
      errors.push("Your name must be between 2 and 60 characters.");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      errors.push("Rating must be between 1 and 5 stars.");
    if (comment.length < 5)
      errors.push("Review comment must be at least 5 characters.");
    if (comment.length > 1000)
      errors.push("Review comment is too long (max 1000 characters).");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(" ") },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const review = await db.$transaction(async (tx) => {
      const user = await getCurrentUser();
      const created = await tx.review.create({
        data: {
          productId,
          name,
          rating,
          comment,
          userId: user?.id ?? null,
        },
      });

      // Fold the new rating into the product's rolling average
      const newCount = product.reviews + 1;
      const newRating =
        Math.round(((product.rating * product.reviews + rating) / newCount) * 10) /
        10;

      await tx.product.update({
        where: { id: productId },
        data: { reviews: newCount, rating: Math.min(5, Math.max(0, newRating)) },
      });

      return created;
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
