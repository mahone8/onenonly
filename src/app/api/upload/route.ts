import { NextResponse, NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/upload — admin-only image upload (multipart/form-data).
 *
 * Accepts one or more files under the field name "file" (the admin product
 * form appends every selected file under that name). Each file must be a
 * JPG / PNG / WEBP / AVIF / GIF image up to 5 MB; up to 8 files per request.
 *
 * Storage backend (chosen automatically):
 *  - Vercel Blob when BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID is present
 *    (OIDC or Token) — Vercel injects either credential mode.
 *    Returns full https URLs served by Vercel's CDN.
 *  - Local disk (public/uploads/) otherwise (local dev / single server),
 *    returning /uploads/<name> references served statically.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_FILES = 8; // product gallery cap in the admin form

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

async function saveImage(
  buf: Buffer,
  name: string,
  contentType: string
): Promise<string> {
  // OIDC first (BLOB_STORE_ID), then token (BLOB_READ_WRITE_TOKEN), else disk
  if (process.env.BLOB_STORE_ID) {
    // Use BLOB_STORE_ID directly - the SDK auto-detects credentials
    // Try with explicit access mode detection
    const blob = await put(`products/${name}`, buf, {
      access: process.env.BLOB_ACCESS_MODE || "private",
      contentType,
    });
    return blob.url;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Classic token mode
    const blob = await put(`products/${name}`, buf, {
      access: "private",
      contentType,
    });
    return blob.url;
  }
  // Local disk fallback — dev serves public/ directly; the standalone build
  // copies public/ so single-server production uploads are served too.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid upload (expected multipart form data)." },
      { status: 400 }
    );
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: "No file received." },
      { status: 400 }
    );
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { success: false, error: `Too many files at once (max ${MAX_FILES}).` },
      { status: 400 }
    );
  }

  const urls: string[] = [];
  for (const file of files) {
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type (${file.type || "unknown"}). Use JPG, PNG, WEBP, AVIF or GIF.`,
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `"${file.name}" is over the 5 MB limit.` },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json(
        { success: false, error: `"${file.name}" is empty.` },
        { status: 400 }
      );
    }

    const name = `u-${randomBytes(10).toString("hex")}${ext}`;
    try {
      urls.push(await saveImage(buf, name, file.type));
    } catch (err) {
      console.error("POST /api/upload error:", err);
      const message =
        process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN
          ? "Blob upload failed — store ID present but token not injected. Create Vercel Blob store with Token credentials."
          : process.env.VERCEL
          ? "No image storage connected — create a Vercel Blob store (Storage tab) and redeploy, or paste an https:// image URL instead."
          : "Could not save the file. Try again.";
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, urls });
}