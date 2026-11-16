/**
 * Hash router. Static hosting friendly, and every episode has a direct link
 * such as #e07-spirit for the Archive route (teachers, section 6.1).
 */
import { useSyncExternalStore } from 'react';
import { episodeById } from '../content';

export type Route =
  | { name: 'title' }
  | { name: 'setup' }
  | { name: 'prologue' }
  | { name: 'map' }
  | { name: 'episode'; id: string }
  | { name: 'finale' }
  | { name: 'credits' };

const SIMPLE = ['setup', 'prologue', 'map', 'finale', 'credits'] as const;

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '').toLowerCase();
  if (!h) return { name: 'title' };
  if ((SIMPLE as readonly string[]).includes(h)) return { name: h as (typeof SIMPLE)[number] };
  if (episodeById(h)) return { name: 'episode', id: h };
  return { name: 'map' };
}

const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb);
  return () => removeEventListener('hashchange', cb);
};
const getHash = () => location.hash;

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, getHash, () => ''));
}

export function go(path: string) {
  location.hash = path;
}

/** The address the player was at before this one, without `#`; `null` when this is the first. Settings closes back to it. */
let before: string | null = null;
if (typeof addEventListener !== 'undefined')
  addEventListener('hashchange', (e) => {
    before = new URL(e.oldURL).hash.replace(/^#\/?/, '');
  });
export const cameFrom = () => before;
