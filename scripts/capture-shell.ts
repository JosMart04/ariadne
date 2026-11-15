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
  await kit.sleep(400);
  const opened = (await page.evaluate(`location.hash`)) as string;
  expect(/^#e\d\d-/.test(opened), `a marker opens its file (${opened})`);

  // Back to the list, so the next run starts where a new player does.
  await page.evaluate(`location.hash = '#map'`);
  await ready(page);
  await kit.press(page, 'List');
  await kit.waitFor(page, 'Orrery');
  expect((await page.$('.cosmos')) === null, 'the list is one click away');
  await page.evaluate(`localStorage.removeItem('ariadne-map-view')`);
}
