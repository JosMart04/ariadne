/**
 * Content compiler. Owner: Front A.
 * content/*.yaml  ->  src/generated/content.json
 *
 * Fails (non-zero exit) when:
 *  - a YAML file does not match the contract in src/content/schema.ts
 *  - a REAL line or datum has no sourced fact (pillar 2, CR-02, AC-02)
 *  - a puzzle has a dead end or an undefined transition (pillar 3, FR-22, AC-03)
 *  - one of the 13 challenge resources is missing (M6)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import type { z } from 'zod';
import {
  CHALLENGE_RESOURCES,
  Episode,
  Glossary,
  Scene,
  UiStrings,
  type Content,
  type EpisodeC,
  type FactC,
  type LineT,
  type PuzzleT,
  type SceneC,
} from '../src/content/schema.ts';
import { puzzleProblems } from '../src/engine/fsm.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'src', 'generated', 'content.json');

/** Gentle-vocabulary rule (elicitation 5.5): machines rest, sleep, go silent. */
const HARSH = /\b(die[sd]?|dying|dead|kill(ed|s)?)\b/i;

type Raw = { file: string; data: unknown };

function load(file: string): Raw {
  return { file, data: parse(readFileSync(join(CONTENT, file), 'utf8')) };
}

function validate<S extends z.ZodType>(schema: S, raw: Raw, problems: string[]): z.infer<S> | null {
  const r = schema.safeParse(raw.data);
  if (r.success) return r.data;
  for (const i of r.error.issues) problems.push(`${raw.file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
  return null;
}

function compileFacts(facts: Record<string, z.infer<typeof Episode>['facts'][string]>, prefix: string) {
  const out: Record<string, FactC> = {};
  for (const [key, f] of Object.entries(facts)) {
    const host = new URL(f.source).hostname.replace(/^www\./, '');
    out[key] = { ...f, id: `${prefix}.${key}`, host, official: host === 'nasa.gov' || host.endsWith('.nasa.gov') };
  }
  return out;
}

export function buildContent(opts: { quiet?: boolean } = {}): Content {
  const problems: string[] = [];
  const warnings: string[] = [];

  /** Checks shared by episodes and scenes. `used` collects the fact keys that are actually cited. */
  const checker = (file: string, facts: Record<string, unknown>, images: Record<string, unknown>) => {
    const used = new Set<string>();
    const cite = (key: string | undefined, where: string) => {
      if (!key) return;
      used.add(key);
      if (!(key in facts)) problems.push(`${file}: ${where} cites unknown fact "${key}"`);
    };
    const line = (l: LineT, where: string) => {
      if (l.tag === 'REAL' && !l.fact) problems.push(`${file}: ${where} is REAL but cites no fact`);
      if (l.tag === 'IMAGINED' && l.fact) problems.push(`${file}: ${where} is IMAGINED and must not cite a fact`);
      cite(l.fact, where);
      if (HARSH.test(l.text)) warnings.push(`${file}: ${where} uses harsh vocabulary ("${l.text.match(HARSH)![0]}")`);
    };
    const puzzle = (p: PuzzleT, where: string) => {
      for (const msg of puzzleProblems(p)) problems.push(`${file}: ${where}: ${msg}`);
      for (const [id, s] of Object.entries(p.states)) {
        cite(s.fact, `${where}.states.${id}`);
        const img = (s.stage as { image?: unknown } | undefined)?.image;
        if (typeof img === 'string' && !(img in images))
          problems.push(`${file}: ${where}.states.${id} uses unknown image "${img}"`);
      }
    };
    return { used, cite, line, puzzle };
  };

  // ---- Episodes ----
  const episodes: EpisodeC[] = [];
  const dir = join(CONTENT, 'episodes');
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()) {
    const file = `episodes/${name}`;
    const ep = validate(Episode, load(file), problems);
    if (!ep) continue;
    if (basename(name, '.yaml') !== ep.id) problems.push(`${file}: file name must be ${ep.id}.yaml`);
    const c = checker(file, ep.facts, ep.images);

    ep.arrival?.forEach((l, i) => c.line(l, `arrival[${i}]`));
    ep.operation?.explainer.forEach((s, i) => c.cite(s.fact, `operation.explainer[${i}]`));
    if (ep.operation?.puzzle) c.puzzle(ep.operation.puzzle, 'operation.puzzle');
    if (ep.discovery) {
      c.cite(ep.discovery.headline.fact, 'discovery.headline');
      ep.discovery.story?.facts.forEach((k) => c.cite(k, 'discovery.story'));
      c.cite(ep.discovery.myth?.fact, 'discovery.myth');
    }
    if (ep.silence) {
      c.line(ep.silence.last, 'silence.last');
      ep.silence.lines?.forEach((l, i) => c.line(l, `silence.lines[${i}]`));
    }
    if (ep.statusNow) {
      c.cite(ep.statusNow.fact, 'statusNow');
      if (ep.statusNow.image && !(ep.statusNow.image in ep.images))
        problems.push(`${file}: statusNow uses unknown image "${ep.statusNow.image}"`);
    }
    if (!ep.draft) {
      for (const beat of ['objectives', 'arrival', 'operation', 'discovery', 'silence', 'statusNow'] as const)
        if (!ep[beat]) problems.push(`${file}: "${beat}" is required once draft is false (AC-07)`);
      if (ep.key && !ep.clew) problems.push(`${file}: key episodes must award a clew`);
      for (const k of Object.keys(ep.facts))
        if (!c.used.has(k)) warnings.push(`${file}: fact "${k}" is never cited (it still shows in the Field File)`);
    }
    episodes.push({ ...ep, facts: compileFacts(ep.facts, ep.id) });
  }

  episodes.sort((a, b) => a.num - b.num);
  const seenNum = new Set<number>();
  for (const e of episodes) {
    if (seenNum.has(e.num)) problems.push(`episodes: duplicate num ${e.num}`);
    seenNum.add(e.num);
    for (const x of e.crossThreads ?? [])
      if (!episodes.some((o) => o.id === x)) problems.push(`episodes/${e.id}.yaml: crossThreads names unknown "${x}"`);
  }
  for (const r of CHALLENGE_RESOURCES)
    if (!episodes.some((e) => e.resource === r)) problems.push(`episodes: challenge resource "${r}" has no episode (M6)`);

  // ---- Scenes ----
  const scene = (name: string): SceneC | null => {
    const file = `${name}.yaml`;
    if (!existsSync(join(CONTENT, file))) {
      problems.push(`${file}: missing`);
      return null;
    }
    const sc = validate(Scene, load(file), problems);
    if (!sc) return null;
    const c = checker(file, sc.facts, sc.images);
    sc.beats.forEach((b, i) => {
      if (b.kind === 'lines') b.lines.forEach((l, j) => c.line(l, `beats[${i}].lines[${j}]`));
      if (b.kind === 'puzzle') c.puzzle(b.puzzle, `beats[${i}].puzzle`);
      if (b.kind === 'facts') b.facts.forEach((k) => c.cite(k, `beats[${i}].facts`));
    });
    return { ...sc, facts: compileFacts(sc.facts, sc.id) };
  };
  const prologue = scene('prologue');
  const finale = scene('finale');

  const ui = validate(UiStrings, load('ui.yaml'), problems) ?? {};
  const glossary = validate(Glossary, load('glossary.yaml'), problems) ?? {};

  if (problems.length || !prologue || !finale) {
    throw new Error(`Content has ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  }

  // ---- Stats: the "Every fact is real" counter (CR-05) ----
  const allFacts = [...episodes.flatMap((e) => Object.values(e.facts)), ...Object.values(prologue.facts), ...Object.values(finale.facts)];
  const stats = {
    facts: allFacts.length,
    sources: new Set(allFacts.map((f) => f.source)).size,
    official: allFacts.filter((f) => f.official).length,
    secondary: allFacts.filter((f) => !f.official).length,
    verified: allFacts.filter((f) => f.verified).length,
    episodes: episodes.length,
    drafts: episodes.filter((e) => e.draft).length,
    puzzles: episodes.filter((e) => e.operation?.puzzle).length,
  };

  const content: Content = {
    episodes,
    threadOrder: [...episodes].sort((a, b) => a.launched.localeCompare(b.launched)).map((e) => e.id),
    prologue,
    finale,
    ui,
    glossary,
    stats,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(content));

  if (!opts.quiet) {
    console.log(
      `content ok: ${stats.episodes} episodes (${stats.drafts} draft, ${stats.puzzles} with puzzle) · ` +
        `${stats.facts} facts, ${stats.sources} sources (${stats.secondary} secondary) · ` +
        `${stats.verified}/${stats.facts} human-verified`,
    );
    if (warnings.length) console.log(`warnings (${warnings.length}):\n  - ${warnings.join('\n  - ')}`);
  }
  return content;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    buildContent();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
