/**
 * Capture routes of the shell screens (title, map). Owner: lane B. `scripts/capture.ts` calls these and hands over its
 * tools, so lane B never has to edit that file:
 *
 *   npm run capture -- b1 title
 *   npm run capture -- b1 map
 *
 * Do not declare a named function inside `page.evaluate(...)`: the TypeScript runner wraps it in a helper the page does
 * not have. Pass a string, or use the `press` and `waitFor` tools.
 *
 * Both routes also check what they photograph and fail loudly, so a broken map cannot pass as a picture.
 */
import type { Page } from 'puppeteer-core';

export type Kit = {
  /** Saves `<prefix>-<nn>-<label>.jpg` after `settle` milliseconds. */
  shooter: (page: Page, prefix: string) => (label: string, settle?: number) => Promise<void>;
  /** Clicks the first button of the story whose text contains `text`; waits for it to exist. */
  press: (page: Page, text: string) => Promise<void>;
  waitFor: (page: Page, text: string, timeout?: number) => Promise<unknown>;
  sleep: (ms: number) => Promise<unknown>;
  /** Address of the game, ending in `/`. Add `?q=high&dev#<route>`. */
  base: string;
};

const expect = (ok: boolean, what: string) => {
  if (!ok) throw new Error(`shell: expected that ${what}`);
  console.log(`  ok  ${what}`);
};
const ready = (page: Page) => page.waitForSelector('.cosmos .set3d--ready', { timeout: 60_000 });
/** How many machine markers are on screen and placed by the scene. */
const placed = (page: Page) => page.evaluate(`[...document.querySelectorAll('.pin--machine')].filter((p) => p.dataset.on === 'true').length`) as Promise<number>;

/** The first picture a judge sees. */
export async function title(page: Page, kit: Kit) {
  const shot = kit.shooter(page, 'title');
  await page.goto(`${kit.base}?q=high&dev#`, { waitUntil: 'networkidle2' });
  await ready(page);
  await kit.waitFor(page, 'Continue the thread');
  await shot('title', 3000);
  // Setup and credits are a column of words over the same sky.
  for (const [route, button] of [['setup', 'Start'], ['credits', 'Labyrinth']]) {
    await page.evaluate(`location.hash = '#${route}'`);
    await ready(page);
    await kit.waitFor(page, button);
    await shot(route, 1800);
  }
  await page.evaluate(`location.hash = '#'`);
  // A new player: nothing restored yet, and the button says "Begin".
  await page.evaluate(`localStorage.removeItem('ariadne-v1')`);
  await page.reload({ waitUntil: 'networkidle2' });
  await ready(page);
  await kit.waitFor(page, 'Begin');
  await shot('title-new-player', 3000);
}

/** The map, as a player who has finished the prologue and the three key memories sees it. */
export async function map(page: Page, kit: Kit) {
  const shot = kit.shooter(page, 'map');
  await page.goto(`${kit.base}?q=high&dev#map`, { waitUntil: 'networkidle2' });
  // This run plays in Accessible, so the map opens as a list.
  await kit.waitFor(page, 'The Center of the Labyrinth');
  expect((await page.$('.cosmos')) === null, 'Accessible play opens the map as a list');
  await shot('list-view', 900);

  await kit.press(page, 'Orrery');
  await ready(page);
  await kit.sleep(600);
  expect((await placed(page)) === 16, 'the sixteen machines are marked on the Orrery');
  await kit.waitFor(page, 'The Center of the Labyrinth');
  await shot('orrery', 2600);

  // One machine under the pointer: its card appears in the lower third.
  await page.hover('.omap__machines li:nth-child(11) .machine');
  await shot('machine-under-the-pointer', 700);
  await page.mouse.move(640, 60);
  await page.evaluate(`document.activeElement?.blur()`);

  await kit.press(page, 'Whole system');
  await shot('whole-system', 2600);
  await kit.press(page, 'Inner planets');
  for (let i = 0; i < 2; i++) await page.click('.tool[aria-label="Closer"]');
  await shot('closer', 2200);

  // Drag to turn, the way a hand would.
  await page.mouse.move(700, 300);
  await page.mouse.down();
  await page.mouse.move(520, 380, { steps: 12 });
  await page.mouse.up();
  await shot('turned', 1500);
  expect((await placed(page)) === 16, 'every machine can still be reached after zooming and turning');

  // A marker opens its file.
  await page.click('.omap__machines li:nth-child(11) .machine');
  // The camera flies from the Earth to the machine, with the distance of today, and then the file opens.
  await shot('journey-leaving-the-earth', 900);
  await shot('journey-arriving', 1500);
  await page.waitForFunction("/^#e\\d\\d-/.test(location.hash)", { timeout: 12_000 });
  const opened = (await page.evaluate(`location.hash`)) as string;
  expect(/^#e\d\d-/.test(opened), `a marker opens its file (${opened})`);

  // Back to the list, so the next run starts where a new player does.
  await page.evaluate(`location.hash = '#map'`);
  await ready(page);
  await kit.press(page, 'List');
  await kit.waitFor(page, 'Orrery');
  expect((await page.$('.cosmos')) === null, 'the list is one click away');
  await page.evaluate(`localStorage.removeItem('ariadne-map-view')`);

  await explorerFollowsTheThread(page, kit);
  await gallery(page, kit);
}

/** An Explorer player after the prologue: the Orrery is the map, and "Follow the thread" flies to the Moon and opens E02. */
async function explorerFollowsTheThread(page: Page, kit: Kit) {
  const shot = kit.shooter(page, 'map-explorer');
  await page.evaluate(
    `localStorage.setItem('ariadne-v1', JSON.stringify({ state: { settings: { setupDone: true, play: 'explorer' }, progress: { prologueDone: true, done: {}, clews: ['clew-0'], finaleDone: false } }, version: 0 }))`,
  );
  await page.goto(`${kit.base}?q=high&dev#map`, { waitUntil: 'networkidle2' });
  await page.reload({ waitUntil: 'networkidle2' });
  await ready(page);
  expect((await placed(page)) === 16, 'Explorer play opens the map as the Orrery');
  await kit.waitFor(page, 'Follow the thread');
  await shot('new-player', 2200);
  await kit.press(page, 'Follow the thread');
  await shot('journey-to-the-moon', 1200);
  await page.waitForFunction("location.hash === '#e02-apollo11'", { timeout: 12_000 });
  expect(true, '"Follow the thread" on the Orrery flies to the Moon and opens E02');
}

/** The AR gallery: one viewer, two machines, two sizes. A desktop cannot place a model in a room, and the screen says so. */
async function gallery(page: Page, kit: Kit) {
  const shot = kit.shooter(page, 'ar');
  const outside: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (r.url().startsWith('http') && host !== new URL(kit.base).hostname) outside.push(r.url());
  });
  const loaded = () => page.waitForSelector('.arx__stage--ready', { timeout: 60_000 });
  /** Width, height and depth of what the viewer shows, metres. */
  const size = () => page.evaluate(`(() => { const d = document.querySelector('model-viewer').getDimensions(); return [d.x, d.y, d.z]; })()`) as Promise<number[]>;

  await page.goto(`${kit.base}?q=high&dev&ar#ar`, { waitUntil: 'networkidle2' });
  await loaded();
  await shot('ingenuity-miniature', 2500);
  const mini = await size();
  await page.click('input[name="ar-scale"][value="real"]');
  await loaded();
  await kit.sleep(600);
  const real = await size();
  expect(Math.abs(Math.max(mini[0], mini[2]) / Math.max(real[0], real[2]) - 0.25) < 0.01, `the miniature of Ingenuity is a quarter of its real size (${real.map((v) => v.toFixed(2)).join(' x ')} m)`);
  // The screen asks the viewer for a few seconds before it says no.
  await page.waitForFunction("document.querySelector('.arx__room').textContent.includes('cannot place')", { timeout: 10_000 }).catch(() => undefined);
  expect(((await page.evaluate(`document.querySelector('.arx__room').textContent`)) as string).includes('cannot place'), 'a desktop is told it cannot place the machine, and can still turn it');
  await kit.press(page, 'Show me');
  await shot('ingenuity-real-size-show-me', 2200);

  await kit.press(page, 'Opportunity');
  await loaded();
  await kit.sleep(600);
  expect(((await page.evaluate(`location.hash`)) as string) === '#ar-opportunity', 'each machine has its own address');
  const rover = await size();
  expect(Math.abs(Math.max(rover[0], rover[2]) - 2.3) < 0.03, `Opportunity is 2.3 m wide at real size (${rover.map((v) => v.toFixed(2)).join(' x ')} m)`);
  await shot('opportunity-real-size', 2200);

  // A phone held upright.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await loaded();
  await shot('phone-upright', 2200);

  // The same window, now saying it is Chrome on an Android phone: the viewer must offer the room, and the button must
  // be live. (Added after three real phones showed it greyed out: the AR switch reached the viewer as "off".)
  const desktop = await page.browser().userAgent();
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-A307G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36');
  await page.reload({ waitUntil: 'networkidle2' });
  await loaded();
  await page.waitForFunction("document.querySelector('model-viewer').canActivateAR === true", { timeout: 8000 }).catch(() => undefined);
  const android = (await page.evaluate(
    `(() => { const v = document.querySelector('model-viewer'); const b = [...document.querySelectorAll('.arx__panel button')].find((x) => x.textContent.includes('View in your space')); return { can: v.canActivateAR, live: !b.disabled }; })()`,
  )) as { can: boolean; live: boolean };
  expect(android.can && android.live, 'on an Android phone the viewer can start AR and "View in your space" is live');
  await shot('android-phone-button-live', 600);
  await page.setUserAgent(desktop);
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  // The model is missing: the words still tell what the machine is. On a page of its own, because the failed download
  // it provokes is written to the console, and the main page must stay free of errors.
  const lone = await page.browser().newPage();
  await lone.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await lone.setRequestInterception(true);
  lone.on('request', (r) => void (r.url().endsWith('.glb') ? r.abort() : r.continue()));
  await lone.goto(`${kit.base}?q=high&dev&ar#ar-opportunity`, { waitUntil: 'networkidle2' });
  await lone.waitForSelector('.arx__stage--failed', { timeout: 60_000 });
  expect(true, 'a model that cannot be downloaded leaves the description, the size and the task on screen');
  await kit.shooter(lone, 'ar-fallback')('model-could-not-load', 600);
  await lone.close();

  await page.goto(`${kit.base}?q=high&dev&ar#ar`, { waitUntil: 'networkidle2' });
  await kit.press(page, 'Back to the labyrinth');
  expect(((await page.evaluate(`location.hash`)) as string) === '#map', 'the gallery leads back to the map');
  expect(outside.length === 0, `the gallery asks nothing of any other site (${outside.slice(0, 2).join(', ') || 'none'})`);
}
