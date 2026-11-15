/**
 * The lane guard: fails when a session is about to push a change to a file that belongs to another lane.
 *
 *   npm run lane -- a        machine A (Fable): integration, the Thread, everything not listed below
 *   npm run lane -- b        machine B (Fable): the Orrery, the map and the shell screens
 *   npm run lane -- astra    Astra: the 13 files, their assets, the submission texts
 *
 * It looks at what is committed but not yet on origin/main, and at what is staged. Paths are in lanes.json.
 * Run it after `git pull --rebase` and before `git push`. A file of another lane is never edited: ask its owner
 * under "Requests" in docs/HANDOFF.md.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lanes = JSON.parse(readFileSync(join(ROOT, 'lanes.json'), 'utf8')) as { shared: string[]; b: string[]; astra: string[] };
const lane = process.argv[2];
if (lane !== 'a' && lane !== 'b' && lane !== 'astra') {
  console.error('usage: npm run lane -- <a|b|astra>');
  process.exit(2);
}

const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = [...new Set([...git('diff --name-only origin/main...HEAD'), ...git('diff --name-only --cached')])];
const owner = (file: string): 'a' | 'b' | 'astra' | 'shared' =>
  lanes.shared.includes(file) ? 'shared' : lanes.b.some((p) => file.startsWith(p)) ? 'b' : lanes.astra.some((p) => file.startsWith(p)) ? 'astra' : 'a';

const foreign = changed.filter((f) => owner(f) !== 'shared' && owner(f) !== lane);
if (foreign.length) {
  console.error(`lane ${lane}: these files belong to another lane. Take them out of your commit and ask their owner in docs/HANDOFF.md, "Requests":`);
  for (const f of foreign) console.error(`  - ${f}  (lane ${owner(f)})`);
  process.exit(1);
}
console.log(`lane ${lane}: ${changed.length} changed file(s), all yours.`);
