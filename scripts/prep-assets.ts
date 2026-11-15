/**
 * Turns the raw downloads in assets-src/raw/ into the files the game serves, driven by assets-src/manifest.yaml.
 *
 *   npx tsx scripts/prep-assets.ts            make what can be made from the raw files on this machine
 *   npx tsx scripts/prep-assets.ts --fetch    first download every raw file that is missing (NASA hosts only)
 *
 * **To add a model or an image, add a row to the manifest. This script needs no edit:**
 *   models:  `mdl_<name>.glb`  with `url` and `raw: models/<file>.glb`   -> copied as it is
 *   images:  `img_<episode>_<slot>.webp` with `url` and `raw: img/<file>` -> untouched, at most 1600 px wide
 *
 * One rule for every file: when its raw download is on this machine it is made again; when it is not, the committed
 * file is kept; when neither exists the run fails, so a build can never ship without a file the game asks for.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'assets-src', 'raw');
const OUT = join(ROOT, 'public', 'assets');
for (const d of ['img', 'tex', 'models']) mkdirSync(join(OUT, d), { recursive: true });
mkdirSync(join(ROOT, 'public', 'draco'), { recursive: true });

const raw = (p: string) => join(RAW, p);

type Row = { url?: string; raw?: string; width?: number };
type Manifest = { models?: Record<string, Row>; images?: Record<string, Row>; textures?: Record<string, Row> };
const manifest = parse(readFileSync(join(ROOT, 'assets-src', 'manifest.yaml'), 'utf8')) as Manifest;

/** Only NASA's own hosts are ever downloaded from. */
const HOSTS = ['raw.githubusercontent.com', 'images-assets.nasa.gov', 'svs.gsfc.nasa.gov', 'photojournal.jpl.nasa.gov'];

async function fetchRaw() {
  for (const [key, row] of Object.entries({ ...manifest.models, ...manifest.images, ...manifest.textures })) {
    if (!row.url || !row.raw || existsSync(raw(row.raw))) continue;
    const url = new URL(row.url);
    const nasa = HOSTS.includes(url.hostname) && (url.hostname !== 'raw.githubusercontent.com' || url.pathname.startsWith('/nasa/'));
    if (url.protocol !== 'https:' || !nasa) throw new Error(`${key}: ${row.url} is not on a NASA host this script may download from`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${key}: HTTP ${res.status} for ${row.url}`);
    mkdirSync(dirname(raw(row.raw)), { recursive: true });
    writeFileSync(raw(row.raw), Buffer.from(await res.arrayBuffer()));
    console.log(`fetched ${row.raw}`);
  }
}

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

const kept: string[] = [];
const missing: string[] = [];
async function make(out: string, from: string | undefined, build: () => Promise<unknown> | void) {
  if (from && existsSync(raw(from))) return void (await build());
  if (existsSync(join(OUT, out))) kept.push(out);
  else missing.push(`${out} (needs assets-src/raw/${from ?? '?'}: add \`url\` and \`raw\` to its manifest row and run with --fetch)`);
}

/** Files with a recipe of their own, below. Every other manifest row is made the standard way. */
const CUSTOM = new Set(['img_e02_site_noon.webp', 'img_e02_site_labels.webp', 'tex_tranquility_ground.webp', 'tex_moon_1k.webp', 'tex_earth_1k.webp']);

async function main() {
  if (process.argv.includes('--fetch')) await fetchRaw();

  // Evidence layer of E02: untouched NASA images, at their full size.
  await make('img/img_e02_site_noon.webp', 'img/PIA12925_orig.jpg', () => sharp(raw('img/PIA12925_orig.jpg')).webp({ quality: 86 }).toFile(join(OUT, 'img', 'img_e02_site_noon.webp')));
  await make('img/img_e02_site_labels.webp', 'img/PIA12909_orig.jpg', () => sharp(raw('img/PIA12909_orig.jpg')).webp({ quality: 88 }).toFile(join(OUT, 'img', 'img_e02_site_labels.webp')));

  // Terrain colour of E02: the same image with the three captions of the release painted out.
  await make('tex/tex_tranquility_ground.webp', 'img/PIA12925_orig.jpg', async () => {
    let ground: Buffer = await sharp(raw('img/PIA12925_orig.jpg')).png().toBuffer();
    ground = await patch(ground, { x: 28, y: 432, w: 246, h: 52 }, -58);
    ground = await patch(ground, { x: 1126, y: 924, w: 216, h: 52 }, 58);
    ground = await patch(ground, { x: 62, y: 1278, w: 396, h: 52 }, -60);
    // The real hardware shows in the image as bright dots. The 3D models stand there instead, so the dots are painted out.
    ground = await patch(ground, { x: 128, y: 548, w: 44, h: 44 }, 0, 52, 5);
    ground = await patch(ground, { x: 136, y: 594, w: 34, h: 40 }, 0, 44, 5);
    await sharp(ground).webp({ quality: 88 }).toFile(join(OUT, 'tex', 'tex_tranquility_ground.webp'));
  });
  await make('tex/tex_moon_1k.webp', 'img/moon_color_1k.jpg', () => sharp(raw('img/moon_color_1k.jpg')).webp({ quality: 84 }).toFile(join(OUT, 'tex', 'tex_moon_1k.webp')));
  await make('tex/tex_earth_1k.webp', 'img/earth_2k.png', () => sharp(raw('img/earth_2k.png')).resize(1024, 512).webp({ quality: 82 }).toFile(join(OUT, 'tex', 'tex_earth_1k.webp')));

  // Every other image of the manifest: untouched, only made smaller. A photograph is evidence.
  for (const [file, row] of Object.entries(manifest.images ?? {})) {
    if (CUSTOM.has(file)) continue;
    await make(`img/${file}`, row.raw, () =>
      sharp(raw(row.raw!))
        .resize({ width: row.width ?? 1600, withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(join(OUT, 'img', file)),
    );
  }

  // Every model of the manifest: official NASA files, served as they are.
  for (const [file, row] of Object.entries(manifest.models ?? {})) await make(`models/${file}`, row.raw, () => copyFileSync(raw(row.raw!), join(OUT, 'models', file)));

  const draco = join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
  for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) copyFileSync(join(draco, f), join(ROOT, 'public', 'draco', f));

  if (kept.length) console.log(`kept as committed (no raw file on this machine): ${kept.join(', ')}`);
  if (missing.length) throw new Error(['missing assets:', ...missing].join('\n  - '));
  console.log('assets ready in public/assets and public/draco');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
