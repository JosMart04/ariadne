/** Read-only access to the compiled content (src/generated/content.json). */
import raw from '../generated/content.json';
import type { Content, EpisodeC } from './schema';

export const content = raw as unknown as Content;
export const episodes = content.episodes;

const byId = new Map(episodes.map((e) => [e.id, e]));
export const episodeById = (id: string): EpisodeC | undefined => byId.get(id);

/** The three key episodes of the Thread route, in play order. */
export const keyEpisodes = episodes.filter((e) => e.key);

/** Interface string with {placeholder} substitution. Falls back to the key so nothing renders empty. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = content.ui[key];
  if (s === undefined) {
    if (import.meta.env?.DEV) console.warn(`[ui] missing string: ${key}`);
    return key;
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export const nssdcaUrl = (id: string) => `https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=${id}`;
