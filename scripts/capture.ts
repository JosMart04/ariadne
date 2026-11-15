/**
 * The screenshot rule (AC-15, C-D12): plays the Thread route in a real browser and saves one picture per beat.
 * Look at them. If one could be mistaken for a form, a quiz or a documentation page, that beat is not done.
 *
 *   npm run dev                      (in another terminal)
 *   npm run capture -- i1a           -> docs/captures/i1a/*.jpg
 *   npm run capture -- i1a reduce    -> the same route with reduced motion, into docs/captures/i1a-reduce/
 *
 * Uses the Chrome or Edge already installed on the machine (puppeteer-core downloads nothing).
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Page } from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2] ?? 'latest';
const reduce = process.argv.includes('reduce');
/** `explorer` or `accessible` runs one route only and keeps the other route's pictures. */
const only = ['explorer', 'accessible'].find((r) => process.argv.includes(r));
const BASE = process.env.CAPTURE_URL ?? 'http://localhost:5173/';
const OUT = join(ROOT, 'docs', 'captures', reduce ? `${name}-reduce` : name);

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p): p is string => !!p && existsSync(p));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;

async function shot(page: Page, label: string, settle = 1800) {
  await sleep(settle);
  const file = join(OUT, `${String(++n).padStart(2, '0')}-${label}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 84 });
  console.log(`  ${file.slice(ROOT.length + 1)}`);
}

const hasButton = (text: string) => [...document.querySelectorAll('main button')].some((b) => b.textContent?.includes(text) && !(b as HTMLButtonElement).disabled);
const clickButton = (text: string) => ([...document.querySelectorAll('main button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement).click();

/** Clicks the first button of the story whose text contains `text`. Waits for it to exist. */
async function press(page: Page, text: string, timeout = 120_000) {
  await page.waitForFunction(hasButton, { timeout }, text);
  await page.evaluate(clickButton, text);
  await sleep(250);
}

/** E02 Apollo 11, every beat, including one wrong turn of each kind (failing teaches, FR-23). */
async function e02(page: Page) {
  await page.goto(`${BASE}?q=high&dev#e02-apollo11`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.set3d--ready', { timeout: 60_000 });
  await shot(page, 'e02-passage', 2500);
  await press(page, 'Continue');
  await shot(page, 'e02-arrival');
  await press(page, 'Continue');
  await press(page, 'Continue');
  await shot(page, 'e02-arrival-alarm');
  await press(page, 'Continue');
  await shot(page, 'e02-operation-alarm');
  await press(page, 'ABORT');
  await shot(page, 'e02-operation-abort-teaches');
  await press(page, 'Continue');
  await press(page, 'Ask Mission Control');
  await shot(page, 'e02-operation-go');
  await press(page, 'Continue');
  await shot(page, 'e02-operation-where-to-land', 3000);
  await press(page, 'Stay on the computer');
  await shot(page, 'e02-flight-on-the-computers-path', 6000);
  await page.waitForFunction(hasButton, { timeout: 120_000 }, 'Continue');
  await shot(page, 'e02-operation-rocks-teach');
  await press(page, 'Continue');
  await press(page, 'Fly long');
  await shot(page, 'e02-flight-over-the-crater', 9000);
  await shot(page, 'e02-flight-final-approach', 12000);
  await page.waitForFunction(hasButton, { timeout: 120_000 }, 'Continue');
  await shot(page, 'e02-touchdown');
  await press(page, 'Continue');
  await shot(page, 'e02-landed', 3000);
  await press(page, 'Continue');
  await shot(page, 'e02-discovery', 3000);
  await press(page, 'Tell me more');
  for (let i = 1; i <= 8; i++) {
    const isMyth = await page.evaluate(() => !!document.querySelector('.cinema .myth'));
    await shot(page, isMyth ? 'e02-discovery-myth-check' : `e02-discovery-story-${i}`, 2600);
    await press(page, 'Continue');
    if (isMyth) break;
  }
  await shot(page, 'e02-silence-liftoff', 4500);
  await press(page, 'Continue');
  await shot(page, 'e02-silence-flag');
  await press(page, 'Continue');
  await shot(page, 'e02-silence-the-part-that-stayed', 3000);
  await press(page, 'Continue');
  await shot(page, 'e02-silence-last-message', 3000);
  await press(page, 'Catch it');
  await shot(page, 'e02-silence-caught', 2500);
  await press(page, 'Continue');
  await shot(page, 'e02-clew', 3000);
  await press(page, 'Continue');
  await shot(page, 'e02-status-now', 3500);
  await press(page, 'Open the Field File');
  await shot(page, 'e02-field-file', 3500);
}

/**
 * A stand-in for a player's hands: it reads the instruments and moves the on-screen stick and the
 * descent-rate switch, five times per second. PLAN is what this player is trying to do.
 * Kept as text so the build tool does not rewrite it before it runs in the page.
 */
const FLY_BY_HAND = `(function (plan) {
  clearInterval(window.__hand);
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  window.__hand = setInterval(function () {
    var s = window.__stage.getState().set.act('state');
    if (!s.flying) return clearInterval(window.__hand);
    var ahead = Math.abs(s.x);
    var wantVx = -Math.sign(s.x) * Math.min(14, 0.075 * ahead);
    window.__controls.setPitch('stick', clamp(-(wantVx - s.vx) * 0.55, -1, 1));
    var arrived = ahead < 5 && Math.abs(s.vx) < 0.9;
    var wantSink = plan === 'drop' ? 6 : arrived ? 0.9 : clamp((s.agl - Math.min(150, 7 + 0.21 * ahead)) * 0.4, -1.2, 4);
    if (wantSink - s.sink > 0.16) window.__controls.click(1);
    else if (wantSink - s.sink < -0.16) window.__controls.click(-1);
  }, 200);
})`;

/** E02 in Explorer: the player flies. First too hard (teach, retry from nearby), then a real landing. */
async function e02Explorer(page: Page) {
  await page.goto(`${BASE}?q=high&dev#e02-apollo11`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.set3d--ready', { timeout: 60_000 });
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await press(page, 'Ask Mission Control');
  await press(page, 'Continue');
  await shot(page, 'e02-explorer-take-control', 3000);
  await press(page, 'Take control');
  await page.evaluate(`${FLY_BY_HAND}('drop')`);
  await shot(page, 'e02-explorer-flying', 5000);
  await page.waitForFunction(hasButton, { timeout: 120_000 }, 'Try again');
  await shot(page, 'e02-explorer-hard-touchdown-teaches', 400);
  await press(page, 'Try again');
  await page.evaluate(`${FLY_BY_HAND}('land')`);
  await shot(page, 'e02-explorer-retry-from-nearby', 3000);
  await shot(page, 'e02-explorer-over-the-crater', 22_000);
  await shot(page, 'e02-explorer-final-approach', 30_000);
  await page.waitForFunction(hasButton, { timeout: 180_000 }, 'Continue');
  await shot(page, 'e02-explorer-touchdown');
}

async function main() {
  if (!BROWSERS.length) throw new Error('No Chrome or Edge found. Set CHROME_PATH.');
  if (existsSync(OUT)) for (const f of readdirSync(OUT)) if (!only || f.includes('-explorer-') === (only === 'explorer')) rmSync(join(OUT, f));
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: BROWSERS[0],
    headless: true,
    args: ['--window-size=1280,720', '--hide-scrollbars', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-webgl'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  // Start past the setup screen, in the settings this run is about. `__play` is switched between the two routes.
  const settings = (reduceMotion: boolean, play: string) => {
    if (sessionStorage.getItem('capture')) return;
    sessionStorage.setItem('capture', '1');
    localStorage.setItem('ariadne-v1', JSON.stringify({ state: { settings: { setupDone: true, reduceMotion, play }, progress: {} }, version: 0 }));
  };

  console.log(`capturing into ${OUT.slice(ROOT.length + 1)} (${reduce ? 'reduced motion' : 'full motion'})`);
  // Accessible: every beat, with choices made as targets in the scene.
  if (only !== 'explorer') {
    await page.evaluateOnNewDocument(settings, reduce, 'accessible');
    await e02(page);
  }
  await page.close();

  // Explorer: the same decision, flown by hand on the lunar module panel.
  if (!reduce && only !== 'accessible') {
    n = Math.max(n, 29);
    const pilot = await browser.newPage();
    await pilot.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    pilot.on('pageerror', (e) => errors.push(String(e)));
    await pilot.evaluateOnNewDocument(settings, false, 'explorer');
    await e02Explorer(pilot);
  }
  await browser.close();

  if (errors.length) {
    console.error(`\nconsole errors (${errors.length}):\n  - ${[...new Set(errors)].join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`\n${n} captures, no console errors. Now look at them (AC-15).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
