/**
 * The screenshot rule (AC-15, C-D12): plays the Thread route in a real browser and saves one picture per beat.
 * Look at them. If one could be mistaken for a form, a quiz or a documentation page, that beat is not done.
 *
 *   npm run dev                            (in another terminal)
 *   npm run capture -- i1c                 -> every scene, both routes, into docs/captures/i1c/
 *   npm run capture -- i1c finale          -> only the finale (also: prologue, e02, e08, e16)
 *   npm run capture -- i1c explorer        -> only the Explorer route (also: accessible)
 *   npm run capture -- i1c reduce          -> reduced motion, into docs/captures/i1c-reduce/
 *   npm run capture -- i1c thread          -> the whole Thread from a clean start, as a new player meets it (see `thread`)
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
/** `e11`, `e01`...: any file that has no route of its own is walked by the generic route (see `file`). */
const isFile = (a: string) => /^e\d\d$/.test(a);
const name = args.find((a) => !isFile(a) && !['reduce', 'explorer', 'accessible', 'prologue', 'e02', 'e08', 'e16', 'finale', 'thread'].includes(a)) ?? 'latest';
const reduce = args.includes('reduce');
const route = ['explorer', 'accessible'].find((r) => args.includes(r));
const SCENES = ['prologue', 'e02', 'e08', 'e16', 'finale', 'thread'] as const;
const wanted = SCENES.filter((s) => args.includes(s));
// `thread` is the whole route from a clean start. It is long, so it only runs when it is asked for.
const files = args.filter((a) => isFile(a) && !(SCENES as readonly string[]).includes(a));
const scenes: string[] = wanted.length || files.length ? [...wanted, ...files] : SCENES.filter((s) => s !== 'thread');
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
/** Inside the `thread` run the scenes are played, not photographed: waits are short and nothing is saved. */
let quick = false;

/** Saves `<scene>-<route>-<nn>-<label>.jpg`, so a partial run replaces only its own pictures. */
function shooter(page: Page, prefix: string) {
  let n = 0;
  return async (label: string, settle = 1800) => {
    if (quick) return void (await sleep(Math.min(settle, 350)));
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

// ------------------------------------------------------------------ Prologue

/** The last night: the note, the midnight pulse, the first clew, the thread. One mode: there is nothing to fly yet. */
async function prologue(page: Page) {
  const shot = shooter(page, 'prologue');
  await open(page, 'prologue');
  await shot('last-night', 2500);
  await press(page, 'Continue');
  await shot('the-note');
  await press(page, 'Continue');
  await shot('how-to-listen');
  await press(page, 'Read captions');
  await shot('the-old-coordinates');
  await press(page, 'Send the pulse');
  await shot('pulse-leaves', 900);
  await shot('something-answers', 2400);
  await press(page, 'Continue');
  await shot('clew-0');
  await press(page, 'Continue');
  await shot('the-old-machines-remember');
  await press(page, 'Continue');
  await shot('the-thread');
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
  window.__hand = setInterval(function () {
    var s = window.__stage.getState().set.act('state');
    if (!s.flying) return clearInterval(window.__hand);
    if (plan === 'drop') {
      // A player who only holds "fall faster".
      if (s.sink < 5.8) window.__controls.click(1);
      return;
    }
    // A beginner who reads the coach: never touches the descent rate, holds the brake past the crater, lets go.
    var brake = s.x < 300 && Math.abs(s.vx) > 2.8;
    window.__controls.setPitch('stick', brake ? -1 : 0);
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
  await page.evaluate(`${FLY_BY_HAND}('beginner')`);
  await shot('retry-from-higher-up', 3000);
  await shot('coach-fly-on', 14_000);
  await shot('coach-brake', 20_000);
  await shot('coach-come-down', 14_000);
  await waitFor(page, 'Continue');
  await shot('touchdown');
}

// ------------------------------------------------------------------ E16 Voyager 1

/** Every beat, with one wrong answer at each of the three decisions. */
async function e16Accessible(page: Page) {
  const shot = shooter(page, 'e16-accessible');
  await open(page, 'e16-voyager1');
  await shot('passage', 2500);
  await press(page, 'Continue');
  await shot('arrival', 2500);
  await press(page, 'Continue');
  await press(page, 'Continue');
  await shot('arrival-dish', 3500);
  await press(page, 'Continue');
  await shot('where-to-point', 3000);
  await press(page, 'The bright planet');
  await shot('dish-turns', 2000);
  await waitFor(page, 'Continue');
  await shot('planet-teaches');
  await press(page, 'Continue');
  await press(page, 'The predicted position');
  await waitFor(page, 'Move the lost code');
  await shot('heard-the-glitch', 1500);
  await press(page, 'Send someone to repair it');
  await shot('no-repair-teaches', 2500);
  await press(page, 'Continue');
  await press(page, 'Move the lost code');
  await shot('command-leaves', 3000);
  await press(page, 'In about 22 hours');
  await shot('one-way-teaches', 2500);
  await press(page, 'Continue');
  await press(page, 'In about 45 hours');
  await shot('answered', 3000);
  await press(page, 'Continue');
  await shot('discovery', 3000);
  await press(page, 'Tell me more');
  for (let i = 1; i <= 8; i++) {
    const done = await page.evaluate(() => !document.querySelector('.line__count'));
    if (done) break;
    await shot(`discovery-story-${i}`, 2600);
    await press(page, 'Continue');
  }
  await shot('silence-portrait', 3500);
  await press(page, 'Continue');
  await shot('silence-one-dot', 2500);
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

/** The operator's own hands on the antenna: drag the scene until the numbers match, then listen. */
async function e16Explorer(page: Page) {
  const shot = shooter(page, 'e16-explorer');
  await open(page, 'e16-voyager1');
  for (let i = 0; i < 4; i++) await press(page, 'Continue');
  await shot('take-the-controls', 3000);
  await press(page, 'Take the controls');
  await shot('console', 1500);
  // Listen at once, without pointing: only noise. Failing teaches.
  await press(page, 'Listen');
  await waitFor(page, 'Continue');
  await shot('noise-teaches');
  await press(page, 'Continue');
  await press(page, 'Take the controls');
  await sleep(500);
  const state = () => page.evaluate(`window.__stage.getState().set.act('state')`) as Promise<{ az: number; el: number; want: { az: number; el: number } }>;
  for (let i = 0; i < 6; i++) {
    const s = await state();
    const dx = Math.max(-300, Math.min(300, (s.want.az - s.az) / 0.12));
    const dy = Math.max(-200, Math.min(200, -(s.want.el - s.el) / 0.1));
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) break;
    await page.mouse.move(640, 300);
    await page.mouse.down();
    await page.mouse.move(640 + dx, 300 + dy, { steps: 12 });
    await page.mouse.up();
    await sleep(250);
  }
  await shot('dish-on-target', 4500);
  await press(page, 'Listen');
  await waitFor(page, 'Move the lost code');
  await shot('heard', 1500);
}

// ------------------------------------------------------------------ E08 Opportunity

/** Every beat. The winter plan is sent three times: flat ground and the shadow teach, the slope works. */
async function e08Accessible(page: Page) {
  const shot = shooter(page, 'e08-accessible');
  await open(page, 'e08-opportunity');
  await shot('passage', 2500);
  await press(page, 'Continue');
  await shot('arrival', 2500);
  await press(page, 'Continue');
  await press(page, 'Continue');
  await shot('arrival-planned-from-earth', 3000);
  await press(page, 'Continue');
  await press(page, 'Continue');
  await shot('sol1-what-to-send', 3000);
  await press(page, 'Science');
  await shot('science-blueberries', 5500);
  await press(page, 'Continue');
  await shot('wind-sweeps-the-panels', 4200);
  await shot('panels-clean', 5500);
  await press(page, 'Continue');
  await shot('winter-where-to-park', 3000);
  await press(page, 'Flat ground');
  await shot('command-travels', 900);
  await waitFor(page, 'Continue');
  await shot('flat-teaches', 2000);
  await press(page, 'Continue');
  await press(page, 'In the shadow');
  await shot('rover-drives-alone', 4200);
  await waitFor(page, 'Continue');
  await shot('shadow-teaches', 2000);
  await press(page, 'Continue');
  await press(page, 'A slope that faces the Sun');
  await waitFor(page, 'Continue');
  await shot('slope-enough-power', 2500);
  await press(page, 'Continue');
  await shot('storm-begins', 1200);
  await shot('storm-noon-like-night', 9000);
  await press(page, 'Continue');
  await shot('last-power', 2500);
  await press(page, 'Take one last picture');
  await shot('final-communication', 2500);
  await press(page, 'Continue');
  await shot('discovery', 3000);
  await press(page, 'Tell me more');
  for (let i = 1; i <= 8; i++) {
    const done = await page.evaluate(() => !document.querySelector('.line__count'));
    if (done) break;
    await shot(`discovery-story-${i}`, 2800);
    await press(page, 'Continue');
  }
  await shot('silence-last-pictures', 3500);
  await press(page, 'Continue');
  await shot('silence-rest-for-a-while', 2500);
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

/** The operator's own hands on the planning station: send a careless plan and skip the wait, then drag the waypoint to the slope. */
async function e08Explorer(page: Page) {
  const shot = shooter(page, 'e08-explorer');
  await open(page, 'e08-opportunity');
  for (let i = 0; i < 5; i++) await press(page, 'Continue');
  await press(page, 'Drive');
  await shot('sol1-drive', 3500);
  await press(page, 'Continue');
  await press(page, 'Continue');
  await shot('plan-the-sol', 3000);
  await press(page, 'Plan the sol');
  await shot('station', 1800);
  // Send at once, without planning: the waypoint is on flat ground. Skipping the wait does not change the answer.
  await press(page, 'Send');
  await shot('sent-plan-is-locked', reduce ? 250 : 1500);
  // With reduced motion the three phases are over in under two seconds, so there may be nothing left to skip.
  if (await page.evaluate(hasButton, 'Skip the wait')) await page.evaluate(clickButton, 'Skip the wait');
  await waitFor(page, 'Continue');
  await shot('flat-teaches', 1500);
  await press(page, 'Continue');
  await press(page, 'Plan the sol');
  await sleep(600);
  // Drag the scene until the waypoint sits on the wall that faces the Sun.
  const gap = () =>
    page.evaluate(`(function () {
      var s = window.__stage.getState();
      var a = s.host.project(s.set.hotspot('waypoint'));
      var b = s.host.project(s.set.hotspot('slope'));
      return { dx: b.x - a.x, dy: b.y - a.y, enough: s.set.act('state').enough };
    })()`) as Promise<{ dx: number; dy: number; enough: boolean }>;
  for (let i = 0; i < 8; i++) {
    const g = await gap();
    if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) break;
    await page.mouse.move(640, 300);
    await page.mouse.down();
    await page.mouse.move(640 + g.dx * 0.8, 300 + g.dy * 0.8, { steps: 12 });
    await page.mouse.up();
    await sleep(250);
  }
  await shot('waypoint-on-the-slope', 1200);
  await press(page, 'Send');
  await shot('command-travels', 1300);
  await shot('rover-drives-alone', 3600);
  await waitFor(page, 'Continue');
  await shot('enough-power', 2000);
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

// ------------------------------------------------------------------ Any other file

/**
 * A file without a route of its own (the diorama files): presses the main button of every beat and takes one picture
 * per beat. A new file never needs an edit here: `npm run capture -- i5 e11`.
 */
async function file(page: Page, key: string) {
  const id = readdirSync(join(ROOT, 'content', 'episodes')).find((f) => f.startsWith(`${key}-`))?.slice(0, -'.yaml'.length);
  if (!id) throw new Error(`no file in content/episodes starts with ${key}-`);
  const shot = shooter(page, `${key}-accessible`);
  await open(page, id);
  for (let n = 0; n < 40; n++) {
    const beat = await page.evaluate(() => [...(document.querySelector('.cinema')?.classList ?? [])].find((c) => c.startsWith('cinema--'))?.slice(8) ?? 'beat');
    await shot(beat, n ? 2600 : 3200);
    let more = false;
    for (const text of ['Catch it', 'Tell me more', 'Continue', 'Open the Field File']) {
      if (!(await page.evaluate(hasButton, text))) continue;
      await page.evaluate(clickButton, text);
      more = true;
      break;
    }
    if (!more) break;
    await sleep(250);
  }
}

// ------------------------------------------------------------------ The Thread, from a clean start

/**
 * What no other route proves: the progression. Nothing is saved when it starts. It goes the way a new player goes:
 * title, setup, prologue, then the map's own "Follow the thread" for each key memory, then the center, then the credits.
 * Every clew is earned by playing. It fails if the map sends the player to the wrong place, if a memory or a clew is
 * not saved, or if the page logs an error.
 *
 * Its duration is a technical minimum (a script does not read). The 12 minutes of AC-01 are timed with people (T-06).
 */
async function thread(page: Page) {
  const shot = shooter(page, 'thread');
  const started = Date.now();
  const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem('ariadne-v1') ?? '{}').state?.progress ?? {}) as Promise<{ prologueDone?: boolean; done?: Record<string, unknown>; clews?: string[]; finaleDone?: boolean }>;
  const hash = () => page.evaluate(() => location.hash);
  const expect = (ok: boolean, what: string) => {
    if (!ok) throw new Error(`thread: expected that ${what}`);
    console.log(`  ok  ${what}`);
  };

  await page.goto(`${BASE}?q=high&dev`, { waitUntil: 'networkidle2' });
  const p0 = await progress();
  expect(!p0.prologueDone && !Object.keys(p0.done ?? {}).length && !(p0.clews ?? []).length, 'nothing is saved at the start');
  await shot('title', 1200);
  await press(page, 'Begin');
  await page.waitForSelector('input[name="play"][value="accessible"]');
  await page.click('input[name="play"][value="accessible"]');
  await shot('setup', 600);
  await press(page, 'Start');
  expect((await hash()) === '#prologue', 'setup leads to the prologue');

  quick = true;
  await prologue(page);
  await press(page, 'Continue');
  quick = false;
  await page.waitForFunction(() => location.hash === '#map', { timeout: 20_000 });
  let p = await progress();
  expect(!!p.prologueDone && !!p.clews?.includes('clew-0'), 'the prologue is saved and clew 0 is earned');
  await shot('map-after-prologue', 800);

  const KEYS: [string, (page: Page) => Promise<void>, string][] = [
    ['e02-apollo11', e02Accessible, 'clew-1'],
    ['e08-opportunity', e08Accessible, 'clew-2'],
    ['e16-voyager1', e16Accessible, 'clew-3'],
  ];
  for (const [id, play, clew] of KEYS) {
    await press(page, 'Follow the thread');
    expect((await hash()) === `#${id}`, `the map sends the player to ${id}`);
    quick = true;
    await play(page);
    quick = false;
    await press(page, 'Back to the labyrinth');
    await page.waitForFunction(() => location.hash === '#map', { timeout: 20_000 });
    p = await progress();
    expect(!!p.done?.[id] && !!p.clews?.includes(clew), `${id} is restored and ${clew} is earned`);
  }
  await shot('map-center-open', 800);

  await press(page, 'The Center of the Labyrinth');
  expect((await hash()) === '#finale', 'with the three key memories the center opens');
  quick = true;
  await finaleAccessible(page);
  for (let i = 0; i < 8 && (await hash()) !== '#credits'; i++) await press(page, 'Continue');
  quick = false;
  expect((await hash()) === '#credits', 'the finale ends in the credits');
  p = await progress();
  expect(!!p.finaleDone, 'the finale is saved');
  await shot('credits', 1200);
  const s = Math.round((Date.now() - started) / 1000);
  console.log(`  the Thread, clean start to credits: ${Math.floor(s / 60)} min ${s % 60} s by script, with one wrong turn at every decision (a technical minimum, not AC-01)`);
}

// ------------------------------------------------------------------

const ROUTES: Record<string, Partial<Record<'accessible' | 'explorer', (page: Page) => Promise<void>>>> = {
  prologue: { accessible: prologue },
  e02: { accessible: e02Accessible, explorer: e02Explorer },
  e08: { accessible: e08Accessible, explorer: e08Explorer },
  e16: { accessible: e16Accessible, explorer: e16Explorer },
  finale: { accessible: finaleAccessible, explorer: finaleExplorer },
  thread: { accessible: thread },
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
    (reduceMotion: boolean, mode: string, clean: boolean) => {
      // The `thread` run starts like a new player: nothing saved, nothing chosen.
      if (clean || sessionStorage.getItem('capture')) return;
      sessionStorage.setItem('capture', '1');
      const done = { 'e02-apollo11': { assisted: false }, 'e08-opportunity': { assisted: false }, 'e16-voyager1': { assisted: false } };
      const fresh = location.hash === '#prologue';
      const progress = fresh ? {} : { prologueDone: true, done, clews: ['clew-0', 'clew-1', 'clew-2', 'clew-3'], finaleDone: false };
      localStorage.setItem('ariadne-v1', JSON.stringify({ state: { settings: { setupDone: true, reduceMotion, play: mode }, progress }, version: 0 }));
    },
    reduce,
    play,
    scene === 'thread',
  );
  for (const f of readdirSync(OUT)) if (f.startsWith(`${scene}-${play}-`)) rmSync(join(OUT, f));
  await (ROUTES[scene]?.[play] ?? ((p: Page) => file(p, scene)))(page);
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
    if (route !== 'explorer' && (ROUTES[scene]?.accessible || isFile(scene))) await run(browser, 'accessible', scene);
    // With reduced motion the scripted flights of E02, E16 and the finale are skipped, so their Explorer routes are only
    // captured in full motion. E08's planning station works the same in both, so it is captured in both.
    if (route !== 'accessible' && (!reduce || scene === 'e08') && ROUTES[scene]?.explorer) await run(browser, 'explorer', scene);
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
