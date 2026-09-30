/**
 * Generate + install the OneNOnly logo.
 * 1. AI-generate an "ONO" gold serif monogram on pure white (matches the
 *    store's premium monochrome + amber palette, no tagline).
 * 2. Post-process with sharp: key out the white background -> transparency,
 *    trim margins, resize for web, save as public/logo.webp.
 */
import ZAI from "z-ai-web-dev-sdk";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const RAW = "/home/z/my-project/image-data/ono-logo-raw.png";
const OUT = "/home/z/my-project/public/logo.webp";
const OUT_DARK = "/home/z/my-project/public/logo-dark.webp";
const SHARED =
  "Minimalist luxury fashion brand monogram logo, exactly the three letters O N O in order, elegant high-contrast serif typography, letters side by side on a single line, flat clean vector emblem style, perfectly centered on a pure white background, no tagline, no extra text, no border, no shadows, no gradients in background, crisp sharp edges, high quality";
const VARIANTS = [
  {
    // Light contexts: charcoal letters + gold N (current behaviour)
    prompt: `${SHARED}, the two outer letters O in deep charcoal black and the center letter N in metallic amber gold`,
    out: OUT,
  },
  {
    // Dark contexts: ivory letters + gold N so they stay visible on zinc-950
    prompt: `${SHARED}, the two outer letters O in warm ivory white and the center letter N in metallic amber gold`,
    out: OUT_DARK,
  },
];

async function generateVariant(zai, { prompt, out }, attempt = 1) {
  try {
    const res = await zai.images.generations.create({
      prompt,
      size: "1024x1024",
    });
    const b64 = res?.data?.[0]?.base64;
    if (!b64) throw new Error("no image data returned");
    const raw = "/home/z/my-project/image-data/" + path.basename(out).replace(".webp", "-raw.png");
    fs.writeFileSync(raw, Buffer.from(b64, "base64"));
    console.log(`generated raw logo -> ${raw}`);
    return raw;
  } catch (err) {
    console.error(`attempt ${attempt} failed: ${err.message}`);
    if (attempt === 3) throw err;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return generateVariant(zai, { prompt, out }, attempt + 1);
  }
}

async function processVariant(rawPath, outPath) {
  // Luminance keying: white -> transparent, smooth edges.
  // alpha = 0 for luminance >= 245, 255 for luminance <= 200, linear between.
  const img = sharp(rawPath).ensureAlpha();
  const { width, height } = await img.metadata();
  const raw = await img.raw().toBuffer();
  const px = width * height * 4;
  for (let i = 0; i < px; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let a = 255;
    if (lum >= 245) a = 0;
    else if (lum > 200) a = Math.round(255 * (1 - (lum - 200) / 45));
    raw[i + 3] = a;
  }

  await sharp(raw, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 12 }) // crop leftover white margins
    .resize({ width: 512, height: 512, fit: "inside" })
    .webp({ quality: 92, alphaQuality: 90 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(
    `processed -> ${outPath} (${meta.width}x${meta.height}, ${fs.statSync(outPath).size} bytes)`
  );
}

const zai = await ZAI.create();
for (const variant of VARIANTS) {
  const rawPath = await generateVariant(zai, variant);
  await processVariant(rawPath, variant.out);
}
