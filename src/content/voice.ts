/**
 * Voice ids (NFR-07): every spoken text has a stable id, so voice files can be produced apart from the code
 * and dropped into public/assets/vo/vo_<id>_en.mp3. The game and scripts/gen-voices.ts both use this file,
 * so they can never disagree about an id or about how a story is cut into captions.
 *
 * Real people are never voiced by a generated voice (contest rule: no cloned or imitated voices).
 * Their words stay as captions; ARIADNE may report them inside her own narration.
 */
import type { Content, EpisodeC, LineT, PuzzleT, SceneC } from './schema';

export const voiceId = {
  say: (prefix: string, state: string) => `${prefix}.op.${state}`,
  headline: (ep: string) => `${ep}.discovery.headline`,
  story: (ep: string, k: number) => `${ep}.discovery.story.${k}`,
  myth: (ep: string) => `${ep}.discovery.myth`,
  clew: (clew: string) => `clew.${clew}`,
  status: (ep: string) => `${ep}.status`,
  special: (scene: string, i: number) => `${scene}.b${i}.special`,
};

/** Groups the sentences of a story into captions short enough to read in one look. */
export function captions(text: string, max = 150): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["”]?\s*/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    const one = raw.trim();
    const last = out[out.length - 1];
    if (last && last.length + one.length + 1 <= max) out[out.length - 1] = `${last} ${one}`;
    else out.push(one);
  }
  return out;
}

/** Text as it should be spoken: glossary marks removed. */
export const spoken = (text: string) => text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, term: string, label?: string) => label ?? term);

export type VoiceLine = { id: string; who: string; text: string };

const NARRATOR = 'ariadne';

function puzzleLines(p: PuzzleT, prefix: string): VoiceLine[] {
  return Object.entries(p.states).flatMap(([state, s]) => (s.say ? [{ id: voiceId.say(prefix, state), who: NARRATOR, text: spoken(s.say) }] : []));
}

const lines = (list: LineT[] | undefined): VoiceLine[] => (list ?? []).flatMap((l) => (l.id ? [{ id: l.id, who: l.who, text: spoken(l.text) }] : []));

function episodeLines(ep: EpisodeC): VoiceLine[] {
  const out: VoiceLine[] = [...lines(ep.arrival)];
  if (ep.operation?.puzzle) out.push(...puzzleLines(ep.operation.puzzle, ep.id));
  if (ep.discovery) {
    out.push({ id: voiceId.headline(ep.id), who: NARRATOR, text: spoken(ep.discovery.headline.text) });
    if (ep.discovery.story) captions(ep.discovery.story.text).forEach((text, k) => out.push({ id: voiceId.story(ep.id, k), who: NARRATOR, text: spoken(text) }));
    if (ep.discovery.myth) out.push({ id: voiceId.myth(ep.id), who: NARRATOR, text: `People say: ${ep.discovery.myth.claim} What really happened: ${ep.discovery.myth.truth}` });
  }
  if (ep.silence) out.push(...lines(ep.silence.before), ...lines([ep.silence.last]), ...lines(ep.silence.lines));
  if (ep.clew) out.push({ id: voiceId.clew(ep.clew.id), who: NARRATOR, text: spoken(ep.clew.line) });
  if (ep.statusNow) out.push({ id: voiceId.status(ep.id), who: NARRATOR, text: spoken(ep.statusNow.text) });
  return out;
}

function sceneLines(sc: SceneC): VoiceLine[] {
  return sc.beats.flatMap((b, i) => {
    if (b.kind === 'lines') return lines(b.lines);
    if (b.kind === 'puzzle') return puzzleLines(b.puzzle, `${sc.id}.b${i}`);
    if (b.kind === 'clew') return [{ id: voiceId.clew(b.clew.id), who: NARRATOR, text: spoken(b.clew.line) }];
    if (b.kind === 'special' && b.text) return [{ id: voiceId.special(sc.id, i), who: 'narrator', text: spoken(b.text) }];
    return [];
  });
}

/** Every text of the game that has a voice id, in play order. `only` limits it to some episodes or scenes. */
export function voiceLines(content: Content, only?: string[]): VoiceLine[] {
  const want = (id: string) => !only || only.includes(id);
  return [
    ...(want('prologue') ? sceneLines(content.prologue) : []),
    ...content.episodes.filter((e) => !e.draft && want(e.id)).flatMap(episodeLines),
    ...(want('finale') ? sceneLines(content.finale) : []),
  ];
}
