/** Dev helper: builds contact sheets of a capture folder so a reviewer can scan every beat at once.
 *  Run: npx tsx scripts/dev/contact.ts docs/captures/i1a <outDir> */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
const out = process.argv[3] ?? dir;
const files = readdirSync(dir).filter((f) => /^\d+.*\.jpg$/.test(f)).sort();
const W = 640, H = 360, COLS = 3, PER = 12;

async function main() {
  for (let p = 0; p * PER < files.length; p++) {
    const page = files.slice(p * PER, (p + 1) * PER);
    const rows = Math.ceil(page.length / COLS);
    const tiles = await Promise.all(page.map(async (f, i) => ({ input: await sharp(join(dir, f)).resize(W, H).toBuffer(), left: (i % COLS) * W, top: Math.floor(i / COLS) * H })));
    const file = join(out, `contact-${p + 1}.jpg`);
    await sharp({ create: { width: COLS * W, height: rows * H, channels: 3, background: '#000' } }).composite(tiles).jpeg({ quality: 80 }).toFile(file);
    console.log(file);
  }
}
main();
