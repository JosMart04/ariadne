/**
 * Turns the raw downloads in assets-src/raw/ (see assets-src/manifest.yaml) into the files the game serves.
 * Run: npx tsx scripts/prep-assets.ts
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'assets-src', 'raw');
const OUT = join(ROOT, 'public', 'assets');
for (const d of ['img', 'tex', 'models']) mkdirSync(join(OUT, d), { recursive: true });
mkdirSync(join(ROOT, 'public', 'draco'), { recursive: true });

const raw = (p: string) => join(RAW, p);

/** Covers `rect` with the pixels found `dy` rows away, feathered at the edges. */
async function patch(base: Buffer, rect: { x: number; y: number; w: number; h: number }, dy: number, dx = 0, feather = 6): Promise<Buffer> {
  const src = await sharp(base).extract({ left: rect.x + dx, top: rect.y + dy, width: rect.w, height: rect.h }).ensureAlpha().toBuffer();
  const mask = Buffer.from(
    `<svg width="${rect.w}" height="${rect.h}"><rect x="${feather}" y="${feather}" width="${rect.w - 2 * feather}" height="${rect.h - 2 * feather}" rx="${feather}" fill="#fff"/></svg>`,
  );
  const soft = await sharp(mask).blur(feather / 2).toBuffer();
  const piece = await sharp(src).composite([{ input: soft, blend: 'dest-in' }]).png().toBuffer();
  return sharp(base).composite([{ input: piece, left: rect.x, top: rect.y }]).toBuffer();
}

async function main() {
  // Evidence layer: untouched NASA images.
  await sharp(raw('img/PIA12925_orig.jpg')).webp({ quality: 86 }).toFile(join(OUT, 'img', 'img_e02_site_noon.webp'));
  await sharp(raw('img/PIA12909_orig.jpg')).webp({ quality: 88 }).toFile(join(OUT, 'img', 'img_e02_site_labels.webp'));

  // Terrain colour: the same image with the three captions of the release painted out.
  let ground: Buffer = await sharp(raw('img/PIA12925_orig.jpg')).png().toBuffer();
  ground = await patch(ground, { x: 28, y: 432, w: 246, h: 52 }, -58);
  ground = await patch(ground, { x: 1126, y: 924, w: 216, h: 52 }, 58);
  ground = await patch(ground, { x: 62, y: 1278, w: 396, h: 52 }, -60);
  // The real hardware shows in the image as bright dots. The 3D models stand there instead, so the dots are painted out.
  ground = await patch(ground, { x: 128, y: 548, w: 44, h: 44 }, 0, 52, 5);
  ground = await patch(ground, { x: 136, y: 594, w: 34, h: 40 }, 0, 44, 5);
  await sharp(ground).webp({ quality: 88 }).toFile(join(OUT, 'tex', 'tex_tranquility_ground.webp'));

  if (existsSync(raw('img/moon_color_1k.jpg')))
    await sharp(raw('img/moon_color_1k.jpg')).webp({ quality: 84 }).toFile(join(OUT, 'tex', 'tex_moon_1k.webp'));
  if (existsSync(raw('img/earth_2k.png')))
    await sharp(raw('img/earth_2k.png')).resize(1024, 512).webp({ quality: 82 }).toFile(join(OUT, 'tex', 'tex_earth_1k.webp'));

  copyFileSync(raw('models/apollo_lm.glb'), join(OUT, 'models', 'mdl_apollo_lm.glb'));

  const draco = join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
  for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) copyFileSync(join(draco, f), join(ROOT, 'public', 'draco', f));
  console.log('assets ready in public/assets and public/draco');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
