/**
 * The screenshot rule (AC-15, C-D12): plays the Thread route in a real browser and saves one picture per beat.
 * Look at them. If one could be mistaken for a form, a quiz or a documentation page, that beat is not done.
 *
 *   npm run dev                            (in another terminal)
 *   npm run capture -- i1c                 -> every scene, both routes, into docs/captures/i1c/
 *   npm run capture -- i1c finale          -> only the finale (also: e02)
 *   npm run capture -- i1c explorer        -> only the Explorer route (also: accessible)
 *   npm run capture -- i1c reduce          -> reduced motion, into docs/captures/i1c-reduce/
 *
 * Two routes per scene:
 *   accessible  every beat; decisions are made as targets inside the scene; wrong turns are taken on purpose
 *   explorer    the decision that is played by hand, operated like a player would (stick, drag, wheel, buttons)
 *
 * Uses the Chrome or Edge already installed on the machine (puppeteer-core downloads nothing).
 * The run fails if the page logs any error.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const name = args.find((a) => !['reduce', 'explorer', 'accessible', 'e02', 'finale'].includes(a)) ?? 'latest';
const reduce = args.includes('reduce');
const route = ['explorer', 'accessible'].find((r) => args.includes(r));
const SCENES = ['e02', 'finale'] as const;
const wanted = SCENES.filter((s) => args.includes(s));
const scenes = wanted.length ? wanted : [...SCENES];
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
const errors: string[] = [];
let count = 0;

/** Saves `<scene>-<route>-<nn>-<label>.jpg`, so a partial run replaces only its own pictures. */
function shooter(page: Page, prefix: string) {
  let n = 0;
  return async (label: string, settle = 1800) => {
    await sleep(settle);
    const file = join(OUT, `${prefix}-${String(++n).padStart(2, '0')}-${label}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 84 });
    count++;
    console.log(`  ${file.slice(ROOT.length + 1)}`);
  };
}

const hasButton = (text: string) => [...document.querySelectorAll('main button')].some((b) => b.textContent?.includes(text) && !(b as HTMLButtonElement).disabled);
const clickButton = (text: string) => ([...document.querySelectorAll('main button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement).click();

/** Waits for a button of the story whose text contains `text`. */
const waitFor = (page: Page, text: string, timeout = 180_000) => page.waitForFunction(hasButton, { timeout }, text);

/** Clicks the first button of the story whose text contains `text`. Waits for it to exist. */
async function press(page: Page, text: string) {
  await waitFor(page, text);
  await page.evaluate(clickButton, text);
  await sleep(250);
}

async function open(page: Page, hash: string) {
  await page.goto(`${BASE}?q=high&dev#${hash}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.set3d--ready', { timeout: 60_000 });
  // One real click, so the page may start its sound (browsers require a gesture) and audio code is exercised too.
  await page.mouse.click(640, 250);
}

// ------------------------------------------------------------------ E02 Apollo 11

/** Every beat, including one wrong turn of each kind (failing teaches, FR-23). */
async function e02Accessible(page: Page) {
  const shot = shooter(page, 'e02-accessible');
  await open(page, 'e02-apollo11');
  await shot('passage', 2500);
  await press(page, 'Continue');
  await shot('arrival');
  await press(page, 'Continue');
  await press(page, 'Continue');
  await shot('arrival-alarm');
  await press(page, 'Continue');
  await shot('operation-alarm');
  await press(page, 'ABORT');
  await shot('operation-abort-teaches');
  await press(page, 'Continue');
  await press(page, 'Ask Mission Control');
  await shot('operation-go');
  await press(page, 'Continue');
  await shot('operation-where-to-land', 3000);
  await press(page, 'Stay on the computer');
  await shot('flight-on-the-computers-path', 6000);
  await waitFor(page, 'Continue');
  await shot('operation-rocks-teach');
  await press(page, 'Continue');
  await press(page, 'Fly long');
  await shot('flight-over-the-crater', 9000);
  await shot('flight-final-approach', 12000);
  await waitFor(page, 'Continue');
  await shot('touchdown');
  await press(page, 'Continue');
  await shot('landed', 3000);
  await press(page, 'Continue');
  await shot('discovery', 3000);
  await press(page, 'Tell me more');
  for (let i = 1; i <= 8; i++) {
    const isMyth = await page.evaluate(() => !!document.querySelector('.cinema .myth'));
    await shot(isMyth ? 'discovery-myth-check' : `discovery-story-${i}`, 2600);
    await press(page, 'Continue');
    if (isMyth) break;
  }
  await shot('silence-liftoff', 4500);
  await press(page, 'Continue');
  await shot('silence-flag');
  await press(page, 'Continue');
  await shot('silence-the-part-that-stayed', 3000);
  await press(page, 'Continue');
  await shot('silence-last-message', 3000);
  await press(page, 'Catch it');
  await shot('silence-caught', 2500);
  await press(page, 'Continue');
  await shot('clew', 3000);
  await press(page, 'Continue');
  await shot('status-now', 3500);
  await press(page, 'Open the Field File');
  await shot('field-file', 3500);
}

/**
 * A stand-in for a player's hands on the lunar module panel: it reads the instruments and moves the on-screen
 * stick and the descent-rate switch, five times per second. Kept as text so the build tool does not rewrite it
 * before it runs in the page.
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

/** The player flies. First too hard (teach, retry from nearby), then a real landing. */
async function e02Explorer(page: Page) {
  const shot = shooter(page, 'e02-explorer');
  await open(page, 'e02-apollo11');
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await press(page, 'Ask Mission Control');
  await press(page, 'Continue');
  await shot('take-control', 3000);
  await press(page, 'Take control');
  await page.evaluate(`${FLY_BY_HAND}('drop')`);
  await shot('flying', 5000);
  await waitFor(page, 'Try again');
  await shot('hard-touchdown-teaches', 400);
  await press(page, 'Try again');
  await page.evaluate(`${FLY_BY_HAND}('land')`);
  await shot('retry-from-nearby', 3000);
  await shot('over-the-crater', 22_000);
  await shot('final-approach', 30_000);
  await waitFor(page, 'Continue');
  await shot('touchdown');
}

// ------------------------------------------------------------------ Finale

/** Every beat of the finale; one wrong answer at each of the three decisions. */
async function finaleAccessible(page: Page) {
  const shot = shooter(page, 'finale-accessible');
  await open(page, 'finale');
  await shot('sky', 2500);
  await press(page, 'Continue');
  await shot('who-answers', 2500);
  await press(page, 'A rover on Mars');
  await shot('not-mars-teaches');
  await press(page, 'Continue');
  await press(page, 'A mirror on the Moon');
  await shot('the-telescope-turns', 4500);
  await press(page, 'Continue');
  await shot('aiming-map', 2500);
  await press(page, 'The big bright dot');
  await shot('telescope-slews', 1500);
  await waitFor(page, 'Continue');
  await shot('foil-scatters-teaches');
  await press(page, 'Continue');
  await press(page, 'The small dot just south');
  await waitFor(page, '384,400');
  await shot('light-leaves', 700);
  await shot('light-returns', 1500);
  await shot('clock-stops', 2500);
  await press(page, '38,400 km');
  await shot('too-near-teaches');
  await press(page, 'Continue');
  await press(page, '384,400 km');
  await shot('found', 3500);
  await press(page, 'Continue');
  for (let i = 1; i <= 5; i++) {
    await shot(`mirror-fact-${i}`, 1200);
    await press(page, 'Continue');
  }
  for (let i = 1; i <= 6; i++) {
    if (i === 1 || i === 5 || i === 6) await shot(`monologue-${i}`, 3000);
    await press(page, 'Continue');
  }
  await shot('daisy-bell', 4000);
  await press(page, 'Continue');
  await shot('midnight-pulse-leaves', 700);
  await shot('midnight-pulse-answers', 2300);
  await press(page, 'Continue');
  await shot('closing-line', 2500);
}

/** The player's own hands on the telescope: drag the map, turn the wheel, press FIRE. */
async function finaleExplorer(page: Page) {
  const shot = shooter(page, 'finale-explorer');
  await open(page, 'finale');
  await press(page, 'Continue');
  await press(page, 'A mirror on the Moon');
  await press(page, 'Continue');
  await shot('use-the-telescope', 2500);
  await press(page, 'Use the telescope');
  await shot('console', 1200);
  // Fire at once, without aiming: bare ground. Failing teaches.
  await press(page, 'Fire');
  await waitFor(page, 'Continue');
  await shot('bare-ground-teaches');
  await press(page, 'Continue');
  await press(page, 'Use the telescope');
  await sleep(600);
  // Drag the map so the hardware comes under the crosshair, in a few moves, the way a hand would.
  const state = () => page.evaluate(`window.__stage.getState().set.act('state')`) as Promise<{ x: number; z: number; zoom: number }>;
  const dragToward = async (tx: number, tz: number) => {
    const s = await state();
    const mpp = (2 * (560 / s.zoom) * Math.tan((40 * Math.PI) / 360)) / 720;
    const dx = Math.max(-420, Math.min(420, (s.x - tx) / mpp));
    const dy = Math.max(-200, Math.min(200, (s.z - tz) / mpp));
    await page.mouse.move(640, 300);
    await page.mouse.down();
    await page.mouse.move(640 + dx, 300 + dy, { steps: 14 });
    await page.mouse.up();
    await sleep(200);
  };
  await dragToward(2, 21);
  await dragToward(2, 21);
  await shot('found-the-site', 600);
  await page.mouse.move(640, 300);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel({ deltaY: -120 });
    await sleep(60);
  }
  await dragToward(2.1, 20.8);
  await dragToward(2.1, 20.8);
  await shot('on-the-mirror', 800);
  await press(page, 'Fire');
  await shot('fired', 500);
  await waitFor(page, '384,400');
  await shot('light-comes-home', 3200);
}

// ------------------------------------------------------------------

const ROUTES: Record<string, Record<'accessible' | 'explorer', (page: Page) => Promise<void>>> = {
  e02: { accessible: e02Accessible, explorer: e02Explorer },
  finale: { accessible: finaleAccessible, explorer: finaleExplorer },
};

async function run(browser: Browser, play: 'accessible' | 'explorer', scene: string) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${scene}/${play}: ${String(e)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${scene}/${play}: ${m.text()}`);
  });
  // Start past the setup screen, with every key memory restored, in the settings this run is about.
  await page.evaluateOnNewDocument(
    (reduceMotion: boolean, mode: string) => {
      if (sessionStorage.getItem('capture')) return;
      sessionStorage.setItem('capture', '1');
      const done = { 'e02-apollo11': { assisted: false }, 'e08-opportunity': { assisted: false }, 'e16-voyager1': { assisted: false } };
      const progress = { prologueDone: true, done, clews: ['clew-0', 'clew-1', 'clew-2', 'clew-3'], finaleDone: false };
      localStorage.setItem('ariadne-v1', JSON.stringify({ state: { settings: { setupDone: true, reduceMotion, play: mode }, progress }, version: 0 }));
    },
    reduce,
    play,
  );
  for (const f of readdirSync(OUT)) if (f.startsWith(`${scene}-${play}-`)) rmSync(join(OUT, f));
  await ROUTES[scene][play](page);
  await page.close();
}

async function main() {
  if (!BROWSERS.length) throw new Error('No Chrome or Edge found. Set CHROME_PATH.');
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: BROWSERS[0],
    headless: true,
    args: ['--window-size=1280,720', '--hide-scrollbars', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-webgl'],
  });
  console.log(`capturing ${scenes.join(', ')} into ${OUT.slice(ROOT.length + 1)} (${reduce ? 'reduced motion' : 'full motion'})`);
  for (const scene of scenes) {
    if (route !== 'explorer') await run(browser, 'accessible', scene);
    // With reduced motion the scripted runs are skipped, so the Explorer route is only captured in full motion.
    if (route !== 'accessible' && !reduce) await run(browser, 'explorer', scene);
  }
  await browser.close();

  if (errors.length) {
    console.error(`\nconsole errors (${errors.length}):\n  - ${[...new Set(errors)].join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`\n${count} captures, no console errors. Now look at them (AC-15).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
