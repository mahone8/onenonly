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
 *  - Vercel Blob when BLOB_READ_WRITE_TOKEN is present (production on
 *    Vercel — serverless disks are ephemeral, so files must live in Blob).
 *    Returns full https URLs served by Vercel's CDN.
 *  - Local disk (public/uploads/) otherwise (local dev / single server),
 *    returning /uploads/<name> references served statically.
 *
 * Original filenames are never trusted or preserved — every file gets a
 * random hex name. Returns { success: true, urls: [...] }.
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
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Vercel Blob — durable, CDN-backed (needs a Blob store connected to the
    // Vercel project so the token env var is injected). The products/ prefix
    // only organizes the blob store; disk mode stays flat in public/uploads.
    const blob = await put(`products/${name}`, buf, {
      access: "public",
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
      const readonlyFs =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "EROFS";
      return NextResponse.json(
        {
          success: false,
          error: readonlyFs
            ? "Server storage is read-only (Vercel) — connect a Vercel Blob store in the Storage tab, then redeploy."
            : process.env.BLOB_READ_WRITE_TOKEN
              ? "Blob storage upload failed — check the Blob store connection in Vercel."
              : "Could not save the file. Try again.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, urls });
}
