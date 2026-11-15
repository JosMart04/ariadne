/** Check every literal URL in authored content YAML (including fact, asset and standalone comment sources).
 * npx tsx scripts/check-links.ts [--json docs/submission/link-report.json]
 * GET follows redirects; the body is cancelled after headers. A 200 is reachability, not fact verification.
 * Exit 1: non-200 or network failure. Exit 2: invalid input or invocation.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export type Source = { url: string; locations: string[] };
export type Result = Source & { status: number | null; finalUrl?: string; error?: string; attempts: number };

export function collectSources(root: string): Source[] {
  const found = new Map<string, Set<string>>();
  function visit(value: unknown, location: string) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      const url = new URL(value).href;
      if (!found.has(url)) found.set(url, new Set());
      found.get(url)!.add(location);
    } else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${location}[${i}]`));
    else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) visit(item, `${location}.${key}`);
    }
  }
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.ya?ml$/i.test(entry.name)) {
        const text = readFileSync(path, 'utf8');
        const file = relative(root, path).replaceAll('\\', '/');
        visit(YAML.parse(text), file);
        text.split(/\r?\n/).forEach((line, i) => {
          const match = /^\s*#\s*(https?:\/\/\S+)\s*$/.exec(line);
          if (match) visit(match[1], `${file}.comment:${i + 1}`);
        });
      }
    }
  }
  walk(root);
  return [...found].sort(([a], [b]) => a.localeCompare(b)).map(([url, locations]) => ({ url, locations: [...locations].sort() }));
}

export async function probe(source: Source, timeoutMs = 15000): Promise<Result> {
  let result: Result = { ...source, status: null, attempts: 0 };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(source.url, {
        method: 'GET', redirect: 'follow', signal: controller.signal,
        headers: { 'user-agent': 'ARIADNE-source-check/1.0', accept: '*/*' },
      });
      result = { ...source, status: response.status, finalUrl: response.url, attempts: attempt };
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      const e = error as Error & { cause?: { code?: string } };
      result = { ...source, status: null, error: controller.signal.aborted ? `Timeout after ${timeoutMs} ms` : `${e.message}${e.cause?.code ? ` (${e.cause.code})` : ''}`, attempts: attempt };
    } finally { clearTimeout(timer); }
    if (result.status !== null && result.status !== 429 && result.status < 500) break;
    if (attempt === 1) await new Promise((done) => setTimeout(done, 500));
  }
  return result;
}

export async function checkSources(sources: Source[], concurrency = 4): Promise<Result[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Concurrency must be a positive integer');
  const results = new Array<Result>(sources.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= sources.length) return;
      results[i] = await probe(sources[i]);
    }
  }));
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--json')) throw new Error('Usage: npx tsx scripts/check-links.ts [--json <report.json>]');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sources = collectSources(join(root, 'content'));
  if (!sources.length) throw new Error('No content URLs found');
  console.log(`Checking ${sources.length} distinct URLs with GET (four requests at a time)...`);
  const results = await checkSources(sources);
  const failures = results.filter((r) => r.status !== 200);
  const redirected = results.filter((r) => r.finalUrl && r.finalUrl !== r.url);
  for (const r of failures) console.error(`${r.status ?? 'NETWORK'} ${r.url}\n  ${r.error ?? r.finalUrl}\n  ${r.locations.join('\n  ')}`);
  for (const r of redirected) console.log(`REDIRECT ${r.url}\n  -> ${r.finalUrl}`);
  console.log(`${results.length - failures.length}/${results.length} return 200; ${failures.length} need attention; ${redirected.length} redirect. A 200 does not verify the cited claim.`);
  if (args[1]) {
    const path = resolve(args[1]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ checkedAt: new Date().toISOString(), method: 'GET', timeoutMs: 15000, results }, null, 2) + '\n');
  }
  if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(String(e)); process.exitCode = 2; });
}
