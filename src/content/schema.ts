/**
 * CONTENT CONTRACT v1.1. Owner: Front A.
 * Any change here must be logged in docs/DECISIONS.md (v1.1 changes: C-D03, C-D10, C-D11).
 *
 * Everything the game says or shows is declared in content/*.yaml and validated
 * against these schemas by scripts/build-content.ts. The build fails when a REAL
 * line has no sourced fact, when a puzzle has a dead end, or when a key is misspelled.
 *
 * The client imports TYPES only from this file, so zod never ships to the browser.
 */
import { z } from 'zod';

export const TAGS = ['REAL', 'IMAGINED'] as const;
export const ACTS = ['moon', 'mars', 'beyond'] as const;

/** Status badges (CR-01). Always rendered with icon + text, never colour alone. */
export const BADGES = [
  'active',
  'active-passive',
  'silent-intact',
  'silent-stuck',
  'silent-damaged',
  'silent-buried',
  'grounded',
  'parked',
  'orbiting',
  'resting',
  'drifting',
] as const;

/** The 13 entries of the challenge's Resources tab (metric M6), plus Voyager 1 as the living epilogue. */
export const CHALLENGE_RESOURCES = [
  'apollo-lm',
  'lrv',
  'alsep',
  'surveyor',
  'sojourner',
  'spirit-opportunity',
  'viking',
  'phoenix-insight',
  'dawn',
  'near',
  'pioneer',
  'ingenuity',
  'kepler',
] as const;
export const RESOURCES = [...CHALLENGE_RESOURCES, 'voyager'] as const;

export const ARCHETYPES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;

/** Visual primitives a puzzle state can put on stage. See CLAUDE.md for the props of each kind. */
export const STAGE_KINDS = ['scene', 'gauge', 'figure', 'hotspots', 'cards', 'trace', 'grid', 'sequence'] as const;

/**
 * Artistic licences. Whatever is simulated, reconstructed or not to scale says so on screen (CR-13, FR-61).
 * The wording of each label lives in content/ui.yaml as `label.<id>`.
 */
export const LABELS = ['reconstruction', 'terrain-approximated', 'artistic-view', 'not-to-scale', 'time-compressed', 'simulation'] as const;

/** The beats of an episode that can name a cue of the 3D set. */
export const CUE_BEATS = ['passage', 'arrival', 'operation', 'discovery', 'silence', 'clew', 'status', 'file'] as const;

/** Name of the implicit terminal state of every puzzle. */
export const SOLVED = 'SOLVED';

const httpsUrl = z.string().refine(
  (s) => {
    try {
      return new URL(s).protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'must be a full https:// URL' },
);

/** A REAL, sourced statement. `verified` is filled by a HUMAN who checked it against the source (CR-12). */
export const Fact = z.strictObject({
  text: z.string().min(10),
  source: httpsUrl,
  sourceLabel: z.string().optional(),
  verified: z.string().optional(),
  note: z.string().optional(),
});

/** One spoken or shown line. REAL lines must cite a fact key; IMAGINED lines must not. */
export const Line = z.strictObject({
  who: z.string().min(1),
  tag: z.enum(TAGS),
  text: z.string().min(1),
  fact: z.string().optional(),
  vo: z.boolean().optional(),
  /** What the 3D set shows while this line is on screen. */
  cue: z.string().optional(),
  /** Stable id of the line, used to name its voice file (NFR-07). The compiler assigns it; do not write it by hand. */
  id: z.string().optional(),
});

/** Public-domain epigraph: at most 4 lines, published before 1929 (elicitation 15.2). */
export const Epigraph = z.strictObject({
  text: z.string().refine((t) => t.trim().split('\n').length <= 4, { message: 'max 4 lines' }),
  author: z.string(),
  work: z.string(),
  year: z.number().int().max(1928),
});

export const Image = z.strictObject({
  file: z.string().regex(/^img_[a-z0-9_]+\.(webp|jpg|png)$/),
  alt: z.string().min(5),
  credit: z.string().min(3),
  source: httpsUrl,
  painted: z.string().optional(),
});

/** A 3D model. Official NASA models keep their credit; our own are marked as reconstructions (10.1). */
export const Model = z.strictObject({
  file: z.string().regex(/^mdl_[a-z0-9_]+\.glb$/),
  credit: z.string().min(3),
  source: httpsUrl,
  license: z.string().min(3),
  reconstruction: z.boolean().optional(),
});

/** The 3D set an episode or scene plays in: a folder of src/scenes/, an optional hero model, and its on-screen labels. */
export const SetRef = z.strictObject({
  scene: z.string().regex(/^[a-z][a-z0-9-]*$/),
  model: z.string().optional(),
  labels: z.array(z.enum(LABELS)).default([]),
});

/** One control of a faithful console. REAL controls existed and cite a fact; invented ones are IMAGINED (AC-17). */
export const Control = z.strictObject({
  label: z.string().min(1),
  tag: z.enum(TAGS),
  fact: z.string().optional(),
  does: z.string().min(3),
});

export const Console = z.strictObject({ name: z.string(), controls: z.record(z.string(), Control) });

export const Clew = z.strictObject({
  id: z.enum(['clew-0', 'clew-1', 'clew-2', 'clew-3']),
  title: z.string(),
  line: z.string(),
  teaches: z.string(),
  rulesOut: z.string(),
});

export const Stage = z.looseObject({ kind: z.enum(STAGE_KINDS) });

export const Choice = z.strictObject({
  label: z.string().min(1),
  detail: z.string().optional(),
  to: z.string().min(1),
  /** The simulation outcome that equals this choice in Explorer and Hands (FR-29). Needs `sim` on the state. */
  when: z.string().optional(),
  /** The hotspot of the 3D set that stands for this choice in Accessible (AX-10). */
  target: z.string().optional(),
});

/**
 * One state of a puzzle. It has EITHER `choices` (a decision, max 3) OR `next` (a single Continue).
 * `say` is narration/feedback, `prompt` is the question. `wrong: true` marks a "failing teaches" state.
 * `forced: true` shows "This is what really happened." (FR-26).
 */
export const PuzzleState = z
  .strictObject({
    say: z.string().optional(),
    prompt: z.string().optional(),
    fact: z.string().optional(),
    stage: Stage.optional(),
    /** The continuous control that plays this decision in Explorer and Hands. Its outcomes map to `choices[].when`. */
    sim: z.string().optional(),
    choices: z.array(Choice).min(1).max(3).optional(),
    next: z.string().optional(),
    wrong: z.boolean().optional(),
    forced: z.boolean().optional(),
    hints: z.array(z.string()).max(2).optional(),
  })
  .refine((s) => (s.choices ? !s.next : !!s.next), { message: 'a state needs either `choices` or `next`, not both' })
  .refine((s) => !!(s.say || s.prompt), { message: 'a state needs `say` or `prompt`' });

/** A puzzle is a finite state machine declared as data (FR-21). No randomness, no dead ends (FR-22). */
export const Puzzle = z.strictObject({
  archetype: z.array(z.enum(ARCHETYPES)).min(1),
  initial: z.string(),
  maxSteps: z.number().int().positive(),
  hints: z.array(z.string()).max(2).optional(),
  states: z.record(z.string(), PuzzleState),
});

const Step = z.strictObject({ text: z.string().min(1), fact: z.string().optional() });

export const Episode = z.strictObject({
  id: z.string().regex(/^e\d\d-[a-z0-9-]+$/),
  num: z.number().int().min(1).max(16),
  act: z.enum(ACTS),
  name: z.string(),
  title: z.string(),
  slate: z.strictObject({ place: z.string(), year: z.number().int() }),
  /** ISO launch date. Orders the golden thread (FR-02). */
  launched: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Key episodes (Thread route) unlock the finale and award a clew. */
  key: z.boolean().default(false),
  /** Draft episodes may omit beats. Non-draft episodes must have all of them (AC-07). */
  draft: z.boolean().default(false),
  status: z.strictObject({ badge: z.enum(BADGES), where: z.string() }),
  nssdca: z.array(z.string().regex(/^\d{4}-\d{3}[A-Z]{1,3}$/)).min(1),
  resource: z.enum(RESOURCES),
  objectives: z.array(z.string()).length(3).optional(),
  facts: z.record(z.string(), Fact),
  images: z.record(z.string(), Image).default({}),
  models: z.record(z.string(), Model).default({}),
  /** The 3D set of this episode. An episode without one is not linked from the Thread route (C-D15). */
  set: SetRef.optional(),
  /** The cue the set shows in each beat. Defaults to the beat's own name. */
  cues: z.partialRecord(z.enum(CUE_BEATS), z.string()).default({}),
  /** The faithful console of The Operation (10.6.2). */
  console: Console.optional(),
  epigraph: Epigraph.optional(),
  /** Beat 2 */
  arrival: z.array(Line).min(1).optional(),
  /** Beat 3: `explainer` always exists; `puzzle` is layered on top when ready. */
  operation: z
    .strictObject({
      title: z.string().optional(),
      explainer: z.array(Step).min(1),
      puzzle: Puzzle.optional(),
    })
    .optional(),
  /** Beat 4 */
  discovery: z
    .strictObject({
      headline: z.strictObject({ text: z.string(), fact: z.string() }),
      /** `cues`: what the 3D set shows for each caption of the story, in order. */
      story: z.strictObject({ text: z.string(), facts: z.array(z.string()).min(1), cues: z.array(z.string()).optional() }).optional(),
      myth: z.strictObject({ claim: z.string(), truth: z.string(), fact: z.string() }).optional(),
    })
    .optional(),
  /** Beat 5: `last` is the machine's real last message, image or datum. */
  silence: z
    .strictObject({
      /** Spoken before the last message, one line at a time. */
      before: z.array(Line).optional(),
      last: Line,
      lines: z.array(Line).optional(),
      epigraph: Epigraph.optional(),
    })
    .optional(),
  /** Beat 6 */
  statusNow: z.strictObject({ text: z.string(), fact: z.string(), image: z.string().optional() }).optional(),
  clew: Clew.optional(),
  crossThreads: z.array(z.string()).optional(),
});

/** Free-form scenes (prologue, finale) are a list of beats. */
const cue = z.string().optional();
export const Beat = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('lines'), cue, lines: z.array(Line).min(1) }),
  z.strictObject({ kind: z.literal('puzzle'), cue, title: z.string().optional(), puzzle: Puzzle }),
  z.strictObject({ kind: z.literal('clew'), cue, clew: Clew }),
  z.strictObject({ kind: z.literal('facts'), cue, title: z.string().optional(), facts: z.array(z.string()).min(1) }),
  /** Engine-provided set piece, e.g. pulse, daisy-bell, postcard, voyager-coda. */
  z.strictObject({ kind: z.literal('special'), cue, name: z.string(), text: z.string().optional() }),
]);

export const Scene = z.strictObject({
  id: z.string(),
  title: z.string(),
  facts: z.record(z.string(), Fact).default({}),
  images: z.record(z.string(), Image).default({}),
  models: z.record(z.string(), Model).default({}),
  set: SetRef.optional(),
  console: Console.optional(),
  beats: z.array(Beat).min(1),
});

export const UiStrings = z.record(z.string(), z.string());
export const Glossary = z.record(z.string(), z.strictObject({ def: z.string().min(5) }));

// ---------- Types used by the client (compiled content) ----------

export type Tag = (typeof TAGS)[number];
export type Act = (typeof ACTS)[number];
export type BadgeId = (typeof BADGES)[number];
export type StageT = z.infer<typeof Stage>;
export type ChoiceT = z.infer<typeof Choice>;
export type PuzzleStateT = z.infer<typeof PuzzleState>;
export type PuzzleT = z.infer<typeof Puzzle>;
export type LineT = z.infer<typeof Line>;
export type EpigraphT = z.infer<typeof Epigraph>;
export type ImageT = z.infer<typeof Image>;
export type ClewT = z.infer<typeof Clew>;
export type ModelT = z.infer<typeof Model>;
export type SetRefT = z.infer<typeof SetRef>;
export type ControlT = z.infer<typeof Control>;
export type ConsoleT = z.infer<typeof Console>;
export type LabelId = (typeof LABELS)[number];
export type CueBeat = (typeof CUE_BEATS)[number];
export type BeatT = z.infer<typeof Beat>;

/** A fact after compilation: `official` is true for *.nasa.gov sources, otherwise it is shown as secondary. */
export type FactC = z.infer<typeof Fact> & { id: string; host: string; official: boolean };
export type EpisodeC = Omit<z.infer<typeof Episode>, 'facts'> & { facts: Record<string, FactC> };
export type SceneC = Omit<z.infer<typeof Scene>, 'facts'> & { facts: Record<string, FactC> };

export type ContentStats = {
  facts: number;
  sources: number;
  official: number;
  secondary: number;
  verified: number;
  episodes: number;
  drafts: number;
  puzzles: number;
};

export type Content = {
  episodes: EpisodeC[];
  /** Episode ids in chronological launch order: the path of the golden thread. */
  threadOrder: string[];
  prologue: SceneC;
  finale: SceneC;
  ui: Record<string, string>;
  glossary: Record<string, { def: string }>;
  /** Ids of the lines that have a voice file in public/assets/vo/. The others are read by the browser's own speech. */
  voiced: string[];
  stats: ContentStats;
};
