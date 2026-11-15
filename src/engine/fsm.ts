/**
 * Pure puzzle-graph logic. Shared by the runtime (PuzzleRunner), the content
 * compiler and the reachability test, so "never stuck" is checked by the same
 * code that plays the puzzle.
 */
import type { PuzzleT } from '../content/schema.ts';

export const SOLVED = 'SOLVED';

/** Every state id a state can move to. */
export function targets(p: PuzzleT, id: string): string[] {
  const s = p.states[id];
  if (!s) return [];
  if (s.choices) return s.choices.map((c) => c.to);
  return s.next ? [s.next] : [];
}

/**
 * Shortest path of state ids from `from` to SOLVED (excluding `from`, including SOLVED),
 * or null when SOLVED cannot be reached. Breadth-first, deterministic.
 */
export function shortestPath(p: PuzzleT, from: string): string[] | null {
  if (from === SOLVED) return [];
  const prev = new Map<string, string>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const t of targets(p, cur)) {
      if (seen.has(t)) continue;
      seen.add(t);
      prev.set(t, cur);
      if (t === SOLVED) {
        const path = [SOLVED];
        let at = cur;
        while (at !== from) {
          path.unshift(at);
          at = prev.get(at)!;
        }
        return path;
      }
      queue.push(t);
    }
  }
  return null;
}

/** States reachable from the initial state. */
export function reachable(p: PuzzleT): Set<string> {
  const seen = new Set([p.initial]);
  const queue = [p.initial];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const t of targets(p, cur)) {
      if (t === SOLVED || seen.has(t)) continue;
      seen.add(t);
      queue.push(t);
    }
  }
  return seen;
}

/**
 * Structural problems of a puzzle graph. An empty list means: every transition is defined,
 * every state can reach SOLVED within maxSteps (FR-22), and nothing is orphaned.
 */
export function puzzleProblems(p: PuzzleT): string[] {
  const out: string[] = [];
  const ids = Object.keys(p.states);
  if (ids.includes(SOLVED)) out.push(`"${SOLVED}" is implicit: do not declare it as a state`);
  if (!p.states[p.initial]) out.push(`initial state "${p.initial}" does not exist`);
  for (const id of ids) {
    for (const t of targets(p, id)) {
      if (t !== SOLVED && !p.states[t]) out.push(`state "${id}" points to missing state "${t}"`);
    }
    const path = shortestPath(p, id);
    if (!path) out.push(`DEAD END: state "${id}" can never reach ${SOLVED}`);
    else if (path.length > p.maxSteps) out.push(`state "${id}" needs ${path.length} steps (maxSteps is ${p.maxSteps})`);
  }
  if (p.states[p.initial]) {
    const live = reachable(p);
    for (const id of ids) if (!live.has(id)) out.push(`state "${id}" is unreachable from "${p.initial}"`);
  }
  return out;
}
