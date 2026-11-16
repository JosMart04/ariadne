/**
 * Makes the AR models: real size and miniature, in metres, from the models the game already ships.
 *
 *   npm run dev                                          (in another terminal: the tool reads through the dev server)
 *   npx tsx src/screens/ar/tools/derive-models.ts          writes src/screens/ar/models/*.glb and models.report.json
 *   npx tsx src/screens/ar/tools/derive-models.ts measure  only prints what each original measures, in its own units
 *
 * The originals in public/assets/models/ are read, never written. Sizes and their sources are in `../sizes.ts`;
 * `tests/ar/models.test.ts` measures every file this tool wrote, on every push.
 * No new dependency: three.js and a headless Chrome, both already used by `npm run capture`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { MACHINES, MINIATURE, type MachineSize } from '../sizes.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const OUT = join(HERE, '..', 'models');
const BASE = process.env.CAPTURE_URL ?? 'http://localhost:5173/';
const BROWSERS = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(
  (p): p is string => !!p && existsSync(p),
);

type Measure = { size: [number, number, number]; parts: { name: string; size: [number, number, number]; reach: number }[]; triangles: number };

/** What the original measures along the dimension NASA publishes, in the original's own units. */
function reference(m: MachineSize, got: Measure): number {
  if (m.reference.kind === 'height') return got.size[1];
  if (m.reference.kind === 'width') return Math.max(got.size[0], got.size[2]);
  // The span of a rotor: twice the reach of its farthest blade tip from the mast.
  const parts = got.parts.filter((p) => p.name.includes(m.reference.part ?? ''));
  if (!parts.length) throw new Error(`${m.id}: no part named ${m.reference.part}*`);
  return 2 * Math.max(...parts.map((p) => p.reach));
}

async function main() {
  if (!BROWSERS.length) throw new Error('No Chrome or Edge found. Set CHROME_PATH.');
  const only = process.argv.includes('measure');
  const browser = await puppeteer.launch({ executablePath: BROWSERS[0], headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-webgl'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', String(e)));
  await page.goto(`${BASE}#setup`, { waitUntil: 'networkidle2' });
  const call = <T>(fn: string, ...args: unknown[]) => page.evaluate(`import('/src/screens/ar/tools/derive.page.ts').then((m) => m.${fn}(${args.map((a) => JSON.stringify(a)).join(', ')}))`) as Promise<T>;

  mkdirSync(OUT, { recursive: true });
  const report: Record<string, unknown> = {};
  for (const m of MACHINES) {
    const before = await call<Measure>('measure', m.source);
    if (only) for (const p of before.parts) console.log(`   ${p.name.padEnd(30)} ${p.size.map((v) => v.toFixed(3)).join(' x ')}  reach ${p.reach.toFixed(3)}`);
    const ref = reference(m, before);
    const scale = m.reference.metres / ref;
    console.log(`${m.id}: original ${before.size.map((v) => v.toFixed(3)).join(' x ')} units, ${before.triangles} triangles; reference (${m.reference.kind}) ${ref.toFixed(4)} units = ${m.reference.metres} m, so 1 unit = ${scale.toFixed(5)} m`);
    if (only) {
      console.log(`   at that scale: ${before.size.map((v) => (v * scale).toFixed(3)).join(' x ')} m`);
      continue;
    }
    const files: Record<string, unknown> = {};
    for (const [name, k, texture] of [
      ['1to1', 1, 1024],
      ['mini', MINIATURE[m.id], 1024],
    ] as const) {
      const { glb, after } = await call<{ glb: string; after: Measure }>('derive', m.source, scale * k, texture);
      const bytes = Buffer.from(glb, 'base64');
      const file = `${m.id}-${name}.glb`;
      writeFileSync(join(OUT, file), bytes);
      files[file] = { scale: k, metres: after.size, bytes: bytes.length, triangles: after.triangles };
      console.log(`   ${file}: ${after.size.map((v) => v.toFixed(3)).join(' x ')} m, ${(bytes.length / 1e6).toFixed(2)} MB`);
    }
    report[m.id] = {
      source: `public/assets/models/${m.source}`,
      sourceSha256: createHash('sha256').update(readFileSync(join(ROOT, 'public', 'assets', 'models', m.source))).digest('hex'),
      reference: m.reference,
      unitInMetres: +scale.toFixed(6),
      files,
    };
  }
  if (!only) writeFileSync(join(OUT, 'models.report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}

await main();
