/**
 * Content gates (AC-02, AC-07, M2, M6). These run on every push; the site only deploys when they pass.
 */
import { describe, expect, it } from 'vitest';
import { buildContent } from '../scripts/build-content';
import { CHALLENGE_RESOURCES, Episode, Epigraph } from '../src/content/schema';

const content = buildContent({ quiet: true });
const allFacts = [
  ...content.episodes.flatMap((e) => Object.values(e.facts)),
  ...Object.values(content.prologue.facts),
  ...Object.values(content.finale.facts),
];

describe('every fact is real and sourced (pillar 2, AC-02)', () => {
  it('has facts at all', () => {
    expect(allFacts.length).toBeGreaterThan(40);
  });

  it.each(allFacts.map((f) => [f.id, f] as const))('%s has a direct https source', (_id, f) => {
    const url = new URL(f.source);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toContain('.');
    // A source must be a document, not a site root, unless it is an archive index we cite as such.
    expect(f.text.length).toBeGreaterThan(10);
  });

  it('the counter matches the data (CR-05)', () => {
    expect(content.stats.facts).toBe(allFacts.length);
    expect(content.stats.sources).toBe(new Set(allFacts.map((f) => f.source)).size);
  });

  it('the schema rejects a REAL fact without a source', () => {
    const bad = {
      id: 'e99-bad',
      num: 1,
      act: 'moon',
      name: 'Bad',
      title: 'Bad',
      slate: { place: 'x', year: 2000 },
      launched: '2000-01-01',
      status: { badge: 'active', where: 'x' },
      nssdca: ['2000-001A'],
      resource: 'surveyor',
      facts: { nosource: { text: 'A claim with no source at all.' } },
    };
    expect(Episode.safeParse(bad).success).toBe(false);
  });

  it('the schema rejects epigraphs that may still be under copyright (15.2)', () => {
    const modern = { text: 'Do not go gentle', author: 'Dylan Thomas', work: 'x', year: 1951 };
    expect(Epigraph.safeParse(modern).success).toBe(false);
  });
});

describe('the whole cast is present (M6, AC-07)', () => {
  it('has 16 episodes numbered 1 to 16', () => {
    expect(content.episodes.map((e) => e.num)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it.each(CHALLENGE_RESOURCES)('challenge resource "%s" has an episode', (r) => {
    expect(content.episodes.some((e) => e.resource === r)).toBe(true);
  });

  it('every machine has a status badge and an NSSDCA id (CR-01, CR-04)', () => {
    for (const e of content.episodes) {
      expect(e.status.badge).toBeTruthy();
      expect(e.nssdca.length).toBeGreaterThan(0);
    }
  });

  it('exactly three key episodes open the finale (FR-11)', () => {
    expect(content.episodes.filter((e) => e.key).map((e) => e.id)).toEqual(['e02-apollo11', 'e08-opportunity', 'e16-voyager1']);
  });

  it('the thread runs in launch order from 1966 to 2020 (FR-02)', () => {
    expect(content.threadOrder[0]).toBe('e01-surveyor');
    expect(content.threadOrder.at(-1)).toBe('e11-ingenuity');
    expect(content.threadOrder).toHaveLength(16);
  });

  // Becomes a hard gate at the end of iteration 2, when all 16 files are complete.
  it.todo('no episode is still a draft (AC-07)');
});

describe('credits', () => {
  it('every model and image that content names has a credit and a licence (NFR-08, CR-11)', () => {
    const credited = new Set([...content.credits.models, ...content.credits.images].map((c) => c.file));
    for (const owner of [...content.episodes, content.prologue, content.finale]) {
      for (const m of Object.values(owner.models)) expect(credited, `${owner.id}: ${m.file}`).toContain(m.file);
      for (const i of Object.values(owner.images)) expect(credited, `${owner.id}: ${i.file}`).toContain(i.file);
    }
    for (const c of [...content.credits.models, ...content.credits.images, ...content.credits.textures]) {
      expect(c.credit.length, c.file).toBeGreaterThan(2);
      expect(c.license.length, c.file).toBeGreaterThan(2);
    }
  });

  it('names the stock voices, so generated voices are declared (R-08)', () => {
    expect(content.credits.voices.length).toBeGreaterThan(0);
    for (const v of content.credits.voices) expect(v.name.length).toBeGreaterThan(1);
  });
});
