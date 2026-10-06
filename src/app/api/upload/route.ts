import { NextResponse, NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/upload — admin-only image upload (multipart/form-data).
 *
 * Accepts one or more files under the field name "file" (the admin product
 * form appends every selected file under that name). Each file must be a
 * JPG / PNG / WEBP / AVIF / GIF image up to 5 MB; up to 8 files per request.
 *
 * Files are written to public/uploads/ with a random hex name (the original
 * filename is never trusted or preserved), so they are served statically at
 * /uploads/<name> — the same reference format the catalogue validators accept.
 * Returns { success: true, urls: ["/uploads/u-….jpg", …] }.
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

  // public/uploads — created on demand; dev serves it directly, and the
  // standalone build copies public/ so runtime uploads are served too.
  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Storage folder is not writable." },
      { status: 500 }
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
      await writeFile(path.join(dir, name), buf);
    } catch {
      return NextResponse.json(
        { success: false, error: "Could not save the file. Try again." },
        { status: 500 }
      );
    }
    urls.push(`/uploads/${name}`);
  }

  return NextResponse.json({ success: true, urls });
}
