/**
 * "A labyrinth, not a maze" (pillar 3, FR-22, AC-03, M3):
 * no puzzle can ever leave the player stuck. Every state of every puzzle
 * must reach SOLVED within its declared maxSteps.
 */
import { describe, expect, it } from 'vitest';
import { buildContent } from '../scripts/build-content';
import type { PuzzleT } from '../src/content/schema';
import { SOLVED, puzzleProblems, shortestPath } from '../src/engine/fsm';

const content = buildContent({ quiet: true });

const puzzles: [string, PuzzleT][] = [
  ...content.episodes.flatMap((e) => (e.operation?.puzzle ? [[e.id, e.operation.puzzle] as [string, PuzzleT]] : [])),
  ...[content.prologue, content.finale].flatMap((s) =>
    s.beats.flatMap((b, i) => (b.kind === 'puzzle' ? [[`${s.id}#${i}`, b.puzzle] as [string, PuzzleT]] : [])),
  ),
];

describe('every puzzle always reaches SOLVED', () => {
  it('finds the puzzles', () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(3);
  });

  describe.each(puzzles)('%s', (_id, p) => {
    it('has no structural problems', () => {
      expect(puzzleProblems(p)).toEqual([]);
    });

    it.each(Object.keys(p.states))('state "%s" reaches SOLVED within maxSteps', (state) => {
      const path = shortestPath(p, state);
      expect(path, `dead end at "${state}"`).not.toBeNull();
      expect(path!.at(-1)).toBe(SOLVED);
      expect(path!.length).toBeLessThanOrEqual(p.maxSteps);
    });

    it('never offers more than 3 choices (FR-20)', () => {
      for (const s of Object.values(p.states)) expect(s.choices?.length ?? 0).toBeLessThanOrEqual(3);
    });

    it('every wrong turn leads back toward the solution (FR-23)', () => {
      for (const [id, s] of Object.entries(p.states)) if (s.wrong) expect(s.say, `wrong state "${id}" must explain`).toBeTruthy();
    });
  });
});

describe('the test itself catches dead ends', () => {
  const trap: PuzzleT = {
    archetype: ['A'],
    initial: 'start',
    maxSteps: 3,
    states: {
      start: { prompt: 'Pick', choices: [{ label: 'Good', to: 'SOLVED' }, { label: 'Trap', to: 'pit' }] },
      pit: { say: 'You are stuck forever.', next: 'pit' },
    },
  };

  it('reports a state that can never reach SOLVED', () => {
    expect(shortestPath(trap, 'pit')).toBeNull();
    expect(puzzleProblems(trap).join('\n')).toContain('DEAD END: state "pit"');
  });

  it('reports a transition to a state that does not exist', () => {
    const broken: PuzzleT = { ...trap, states: { start: { prompt: 'Pick', next: 'nowhere' } } };
    expect(puzzleProblems(broken).join('\n')).toContain('missing state "nowhere"');
  });

  it('reports a path longer than maxSteps', () => {
    const long: PuzzleT = {
      archetype: ['A'],
      initial: 'a',
      maxSteps: 2,
      states: { a: { say: '1', next: 'b' }, b: { say: '2', next: 'c' }, c: { say: '3', next: 'SOLVED' } },
    };
    expect(puzzleProblems(long).join('\n')).toContain('maxSteps is 2');
  });
});
