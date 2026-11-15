/**
 * Content compiler. Owner: Front A.
 * content/*.yaml  ->  src/generated/content.json
 *
 * Fails (non-zero exit) when:
 *  - a YAML file does not match the contract in src/content/schema.ts
 *  - a REAL line or datum has no sourced fact (pillar 2, CR-02, AC-02)
 *  - a puzzle has a dead end or an undefined transition (pillar 3, FR-22, AC-03)
 *  - one of the 13 challenge resources is missing (M6)
 *  - a simulation outcome has no choice, or a choice names an outcome that does not exist (FR-29, C-D03)
 *  - a cue or a hotspot is not declared by the 3D set (src/scenes/<id>/cues.json)
 *  - a REAL console control cites no fact (AC-17)
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
import { SIM_OUTCOMES, isSim } from '../src/sim/outcomes.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'src', 'generated', 'content.json');
const SCENES = join(ROOT, 'src', 'scenes');
const VOICES = join(ROOT, 'public', 'assets', 'vo');

/** What a 3D set declares: its cues (with their text description, AX-32) and its hotspots. */
type SetSheet = { cues: Record<string, string>; hotspots: string[] };

function loadSets(): Record<string, SetSheet> {
  const out: Record<string, SetSheet> = {};
  if (!existsSync(SCENES)) return out;
  for (const id of readdirSync(SCENES)) {
    const file = join(SCENES, id, 'cues.json');
    if (existsSync(file)) out[id] = JSON.parse(readFileSync(file, 'utf8')) as SetSheet;
  }
  return out;
}

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
  const sets = loadSets();

  /** Checks shared by episodes and scenes. `used` collects the fact keys that are actually cited. */
  const checker = (
    file: string,
    facts: Record<string, unknown>,
    images: Record<string, unknown>,
    set?: { scene: string; model?: string },
    models: Record<string, unknown> = {},
  ) => {
    const used = new Set<string>();
    const sheet = set ? sets[set.scene] : undefined;
    if (set && !sheet) problems.push(`${file}: set.scene "${set.scene}" has no src/scenes/${set.scene}/cues.json`);
    if (set?.model && !(set.model in models)) problems.push(`${file}: set.model "${set.model}" is not in models`);
    /** A cue must be declared by the set, so a typo can never leave the stage empty. */
    const cue = (name: string | undefined, where: string) => {
      if (!name) return;
      if (!set) problems.push(`${file}: ${where} names cue "${name}" but there is no set`);
      else if (sheet && !(name in sheet.cues)) problems.push(`${file}: ${where} names unknown cue "${name}" of set "${set.scene}"`);
    };
    const control = (id: string, c: { tag: string; fact?: string }) => {
      if (c.tag === 'REAL' && !c.fact) problems.push(`${file}: console control "${id}" is REAL but cites no fact (AC-17)`);
      if (c.tag === 'IMAGINED' && c.fact) problems.push(`${file}: console control "${id}" is IMAGINED and must not cite a fact`);
      if (c.fact) {
        used.add(c.fact);
        if (!(c.fact in facts)) problems.push(`${file}: console control "${id}" cites unknown fact "${c.fact}"`);
      }
    };
    const cite = (key: string | undefined, where: string) => {
      if (!key) return;
      used.add(key);
      if (!(key in facts)) problems.push(`${file}: ${where} cites unknown fact "${key}"`);
    };
    const line = (l: LineT, where: string) => {
      if (l.tag === 'REAL' && !l.fact) problems.push(`${file}: ${where} is REAL but cites no fact`);
      if (l.tag === 'IMAGINED' && l.fact) problems.push(`${file}: ${where} is IMAGINED and must not cite a fact`);
      cite(l.fact, where);
      cue(l.cue, where);
      if (HARSH.test(l.text)) warnings.push(`${file}: ${where} uses harsh vocabulary ("${l.text.match(HARSH)![0]}")`);
    };
    const puzzle = (p: PuzzleT, where: string) => {
      for (const msg of puzzleProblems(p)) problems.push(`${file}: ${where}: ${msg}`);
      for (const [id, s] of Object.entries(p.states)) {
        cite(s.fact, `${where}.states.${id}`);
        const img = (s.stage as { image?: unknown } | undefined)?.image;
        if (typeof img === 'string' && !(img in images))
          problems.push(`${file}: ${where}.states.${id} uses unknown image "${img}"`);
        if (s.stage?.kind === 'scene') {
          const c = (s.stage as { cue?: unknown }).cue;
          if (typeof c !== 'string') problems.push(`${file}: ${where}.states.${id} stage kind "scene" needs a cue`);
          else cue(c, `${where}.states.${id}`);
        }
        for (const ch of s.choices ?? []) {
          if (ch.target && sheet && !sheet.hotspots.includes(ch.target))
            problems.push(`${file}: ${where}.states.${id} targets unknown hotspot "${ch.target}" of set "${set!.scene}"`);
          if (ch.when && !s.sim) problems.push(`${file}: ${where}.states.${id} has "when" but no "sim"`);
        }
        // FR-29: the outcomes of the simulation and the choices of the decision are the same set.
        if (s.sim) {
          if (!isSim(s.sim)) problems.push(`${file}: ${where}.states.${id} names unknown sim "${s.sim}"`);
          else {
            const want = [...SIM_OUTCOMES[s.sim]].sort().join(', ');
            const got = (s.choices ?? []).map((ch) => ch.when ?? '(none)').sort().join(', ');
            if (want !== got) problems.push(`${file}: ${where}.states.${id} sim "${s.sim}" has outcomes [${want}] but choices map [${got}]`);
          }
        }
      }
    };
    return { used, cite, cue, control, line, puzzle };
  };

  // ---- Episodes ----
  const episodes: EpisodeC[] = [];
  const dir = join(CONTENT, 'episodes');
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()) {
    const file = `episodes/${name}`;
    const ep = validate(Episode, load(file), problems);
    if (!ep) continue;
    if (basename(name, '.yaml') !== ep.id) problems.push(`${file}: file name must be ${ep.id}.yaml`);
    const c = checker(file, ep.facts, ep.images, ep.set, ep.models);
    for (const [beat, name] of Object.entries(ep.cues)) c.cue(name, `cues.${beat}`);
    for (const [id, ctl] of Object.entries(ep.console?.controls ?? {})) c.control(id, ctl);

    ep.arrival?.forEach((l, i) => c.line(l, `arrival[${i}]`));
    ep.operation?.explainer.forEach((s, i) => c.cite(s.fact, `operation.explainer[${i}]`));
    if (ep.operation?.puzzle) c.puzzle(ep.operation.puzzle, 'operation.puzzle');
    if (ep.discovery) {
      c.cite(ep.discovery.headline.fact, 'discovery.headline');
      ep.discovery.story?.facts.forEach((k) => c.cite(k, 'discovery.story'));
      ep.discovery.story?.cues?.forEach((k, i) => c.cue(k, `discovery.story.cues[${i}]`));
      c.cite(ep.discovery.myth?.fact, 'discovery.myth');
    }
    if (ep.silence) {
      ep.silence.before?.forEach((l, i) => c.line(l, `silence.before[${i}]`));
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
      if (!ep.set) warnings.push(`${file}: no 3D set yet, so it is not linked from the Thread route (C-D15)`);
      for (const k of Object.keys(ep.facts))
        if (!c.used.has(k)) warnings.push(`${file}: fact "${k}" is never cited (it still shows in the Field File)`);
    }
    // Stable ids for voice files (src/content/voice.ts).
    const tagLines = (list: LineT[] | undefined, prefix: string) => list?.forEach((l, i) => (l.id = `${prefix}.${i}`));
    tagLines(ep.arrival, `${ep.id}.arrival`);
    tagLines(ep.silence?.before, `${ep.id}.silence.before`);
    tagLines(ep.silence?.lines, `${ep.id}.silence.lines`);
    if (ep.silence) ep.silence.last.id = `${ep.id}.silence.last`;
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
    const c = checker(file, sc.facts, sc.images, sc.set, sc.models);
    for (const [id, ctl] of Object.entries(sc.console?.controls ?? {})) c.control(id, ctl);
    sc.beats.forEach((b, i) => {
      c.cue(b.cue, `beats[${i}]`);
      if (b.kind === 'lines')
        b.lines.forEach((l, j) => {
          c.line(l, `beats[${i}].lines[${j}]`);
          l.id = `${sc.id}.b${i}.${j}`;
        });
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
    voiced: existsSync(VOICES) ? readdirSync(VOICES).flatMap((f) => /^vo_(.+)_en\.mp3$/.exec(f)?.[1] ?? []).sort() : [],
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
