/** Astra's archive regression. Does not change the shared capture route.
 * CAPTURE_URL=http://localhost:5173/ node docs/captures/x-validation/run.mjs explorer|reduce|fallback
 * Walks every caption, asserts all seven beats and saved completion, and records browser errors.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import YAML from 'yaml';

const mode = process.argv[2] ?? 'explorer';
assert(['explorer', 'reduce', 'fallback'].includes(mode), 'Choose explorer, reduce or fallback');
const out = `docs/captures/x-validation/${mode}`;
mkdirSync(out, { recursive: true });
const episodes = readdirSync('content/episodes').filter((f) => !/^e(02|08|16)-/.test(f))
  .map((f) => YAML.parse(readFileSync(join('content/episodes', f), 'utf8')));
const expected = ['passage', 'arrival', 'operation', 'discovery', 'silence', 'status', 'file'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find((p) => p && existsSync(p));
assert(executablePath, 'Install Chrome or Edge, or set CHROME_PATH');
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--window-size=1280,720', '--hide-scrollbars', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-webgl'],
});
try {
  for (const ep of episodes) {
    const page = await browser.newPage();
    const errors = [];
    const seen = new Set();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((variant) => {
      const done = Object.fromEntries(['e02-apollo11', 'e08-opportunity', 'e16-voyager1'].map((id) => [id, { assisted: false }]));
      localStorage.setItem('ariadne-v1', JSON.stringify({ state: {
        settings: { setupDone: true, reduceMotion: variant !== 'explorer', play: 'explorer' },
        progress: { prologueDone: true, done, clews: ['clew-0', 'clew-1', 'clew-2', 'clew-3'], finaleDone: false },
      }, version: 0 }));
      if (variant === 'fallback') {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/i.test(type) ? null : getContext.call(this, type, ...args);
        };
      }
    }, mode);
    let failure;
    let steps = 0;
    try {
      await page.goto(`${process.env.CAPTURE_URL ?? 'http://localhost:5173/'}?q=high&dev#${ep.id}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector(mode === 'fallback' ? '.set3d--off' : '.set3d--ready', { timeout: 60000 });
      await page.mouse.click(640, 250);
      const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('ariadne-v1')).state.settings);
      assert.equal(settings.play, 'explorer');
      assert.equal(settings.reduceMotion, mode !== 'explorer');
      for (; steps < 50; steps++) {
        const beat = await page.$eval('.cinema', (el) => [...el.classList].find((c) => c.startsWith('cinema--')).slice(8));
        assert(expected.includes(beat), `Unexpected beat ${beat}`);
        if (!seen.has(beat)) {
          seen.add(beat);
          await sleep(mode === 'explorer' ? 2200 : 350);
          if (mode !== 'fallback' || ['arrival', 'file'].includes(beat)) {
            await page.screenshot({ path: `${out}/${ep.id}-${mode}-${expected.indexOf(beat) + 1}-${beat}.jpg`, type: 'jpeg', quality: 84 });
          }
        }
        if (mode === 'fallback') {
          assert((await page.$eval('.set3d__desc', (el) => el.textContent)).trim().length > 20, 'Missing scene description');
        }
        if (beat === 'file') break;
        await page.waitForFunction(() => ['Catch it', 'Tell me more', 'Continue', 'Open the Field File'].some((label) =>
          [...document.querySelectorAll('main button')].some((b) => b.textContent.trim() === label && !b.disabled)), { timeout: 15000 });
        await page.evaluate(() => {
          for (const label of ['Catch it', 'Tell me more', 'Continue', 'Open the Field File']) {
            const button = [...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === label && !b.disabled);
            if (button) { button.click(); return; }
          }
        });
        await sleep(300);
      }
      assert.deepEqual([...seen], expected, 'Missing or reordered beats');
      assert(await page.evaluate((id) => !!JSON.parse(localStorage.getItem('ariadne-v1')).state.progress.done[id], ep.id), 'Completion was not saved');
      assert.deepEqual(errors, [], 'Browser errors');
    } catch (e) { failure = String(e); }
    results.push({ episode: ep.id, mode, beats: [...seen], steps: steps + 1, errors, ...(failure ? { failure } : {}) });
    console.log(`${ep.id} ${mode}: ${failure ?? 'seven beats, saved completion, no errors'}`);
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/report.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + '\n');
}
assert.equal(results.length, 13);
assert(results.every((r) => !r.failure), 'Archive regression failed; see report.json');
