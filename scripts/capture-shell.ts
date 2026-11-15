/**
 * Capture routes of the shell screens (title, map). Owner: lane B. `scripts/capture.ts` calls these and hands over its
 * tools, so lane B never has to edit that file:
 *
 *   npm run capture -- b1 title
 *   npm run capture -- b1 map
 *
 * Do not declare a named function inside `page.evaluate(...)`: the TypeScript runner wraps it in a helper the page does
 * not have. Pass a string, or use the `press` and `waitFor` tools.
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

/** The first picture a judge sees. */
export async function title(page: Page, kit: Kit) {
  const shot = kit.shooter(page, 'title');
  await page.goto(`${kit.base}?q=high&dev#`, { waitUntil: 'networkidle2' });
  await shot('title', 2500);
}

/** The map, as a player who has finished the prologue and the three key memories sees it. */
export async function map(page: Page, kit: Kit) {
  const shot = kit.shooter(page, 'map');
  await page.goto(`${kit.base}?q=high&dev#map`, { waitUntil: 'networkidle2' });
  await shot('map', 2500);
}
