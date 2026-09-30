/**
 * Install the uploaded "One N Only" logo (silver ONO monogram on black).
 *
 * Produces:
 *  - public/logo-dark.webp : original silver letters, background keyed to
 *                            transparent (for dark header/footer/admin)
 *  - public/logo.webp      : same metallic shading recoloured charcoal so it
 *                            stays visible on light backgrounds
 *  - public/icon.webp      : square monogram-only favicon (black tile)
 */
import sharp from "sharp";
import fs from "fs";

const SRC =
  "/home/z/my-project/upload/ChatGPT Image Sep 30, 2026, 11_19_08 PM.png";
const OUT_LIGHT = "/home/z/my-project/public/logo.webp";
const OUT_DARK = "/home/z/my-project/public/logo-dark.webp";
const OUT_ICON = "/home/z/my-project/public/icon.webp";

async function keyBlackToAlpha(rawPath) {
  // The source is a silver logo on pure black. Luminance keying: black ->
  // transparent, metallic silver -> opaque, smooth anti-aliased edges.
  const img = sharp(rawPath).ensureAlpha();
  const { width, height } = await img.metadata();
  const raw = await img.raw().toBuffer();
  for (let i = 0; i < width * height * 4; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let a = 255;
    if (lum <= 18) a = 0;
    else if (lum < 60) a = Math.round(255 * ((lum - 18) / 42));
    raw[i + 3] = a;
  }
  return { raw, width, height };
}

async function main() {
  const { raw, width, height } = await keyBlackToAlpha(SRC);
  console.log(`source: ${width}x${height}`);

  // Dark variant: original silver, trimmed, transparent, 2x for sharpness.
  await sharp(raw, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 18 })
    .resize({ width: 640, height: 640, fit: "inside" })
    .webp({ quality: 92, alphaQuality: 90 })
    .toFile(OUT_DARK);
  console.log(`wrote ${OUT_DARK}`);

  // Light variant: keep the metallic sheen but darken the letters so they
  // read on white. map each pixel: v = 24 + lum * 0.24 (charcoal w/ shading)
  const img = sharp(raw, { raw: { width, height, channels: 4 } });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height * 4; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = Math.min(255, Math.round(24 + lum * 0.24));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 18 })
    .resize({ width: 640, height: 640, fit: "inside" })
    .webp({ quality: 92, alphaQuality: 90 })
    .toFile(OUT_LIGHT);
  console.log(`wrote ${OUT_LIGHT}`);

  // Favicon: square crop of the monogram (top ~62% of the trimmed artwork),
  // kept on its black tile — sharp and legible at 16-48px.
  const trimmed = await sharp(raw, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 18 })
    .png()
    .toBuffer();
  const meta = await sharp(trimmed).metadata();
  const monoH = Math.round(meta.height * 0.62);
  await sharp(trimmed)
    .extract({ left: 0, top: 0, width: meta.width, height: monoH })
    .resize(256, 256, { fit: "contain", background: "#000000" })
    .flatten({ background: "#000000" })
    .webp({ quality: 90 })
    .toFile(OUT_ICON);
  console.log(`wrote ${OUT_ICON}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
