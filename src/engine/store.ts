/**
 * Game state: accessibility settings + progress. Saved on the device only (NFR-09).
 * Storage is optional: if localStorage throws (private mode, blocked), the game keeps working in memory.
 */
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { episodes, keyEpisodes } from '../content';

export type InputMode = 'pointer' | 'keyboard' | 'switch' | 'head';
/** How the player acts on the same scenes and the same puzzle graphs (section 8.0, C-D04). */
export type PlayMode = 'explorer' | 'hands' | 'accessible';
export type Quality = 'auto' | 'low' | 'medium' | 'high';

export type Settings = {
  play: PlayMode;
  /** 3D quality. Auto lowers the render resolution first, then the tier (10.6.6). */
  quality: Quality;
  /** The method inside Accessible. */
  input: InputMode;
  captions: boolean;
  narration: boolean;
  /** Master switch for every sound. */
  sound: boolean;
  /** Both ears get the same signal (FR-33). */
  mono: boolean;
  textScale: number;
  reduceMotion: boolean;
  storyMode: boolean;
  highContrast: boolean;
  /** Seconds per target in one-button scanning (AX-14: 0.8 to 3). */
  scanSpeed: number;
  setupDone: boolean;
};

export type Progress = {
  prologueDone: boolean;
  /** Restored episodes. `assisted` is recorded without any penalty (FR-24). */
  done: Record<string, { assisted: boolean }>;
  clews: string[];
  finaleDone: boolean;
};

type Actions = {
  set: (patch: Partial<Settings>) => void;
  completePrologue: () => void;
  completeEpisode: (id: string, assisted: boolean) => void;
  awardClew: (id: string) => void;
  completeFinale: () => void;
  reset: () => void;
};

const mq = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;

const defaultSettings = (): Settings => ({
  play: 'explorer',
  quality: 'auto',
  input: 'pointer',
  captions: true,
  narration: true,
  sound: true,
  mono: false,
  textScale: 1,
  reduceMotion: mq('(prefers-reduced-motion: reduce)'),
  storyMode: false,
  highContrast: mq('(prefers-contrast: more)'),
  scanSpeed: 1.6,
  setupDone: false,
});

const emptyProgress = (): Progress => ({ prologueDone: false, done: {}, clews: [], finaleDone: false });

const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

export const useGame = create<{ settings: Settings; progress: Progress } & Actions>()(
  persist(
    (set) => ({
      settings: defaultSettings(),
      progress: emptyProgress(),
      set: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      completePrologue: () => set((s) => ({ progress: { ...s.progress, prologueDone: true } })),
      completeEpisode: (id, assisted) =>
        set((s) => ({
          progress: {
            ...s.progress,
            // Keep an earlier unassisted completion if the player replays with help.
            done: { ...s.progress.done, [id]: { assisted: assisted && (s.progress.done[id]?.assisted ?? true) } },
          },
        })),
      awardClew: (id) =>
        set((s) => (s.progress.clews.includes(id) ? s : { progress: { ...s.progress, clews: [...s.progress.clews, id].sort() } })),
      completeFinale: () => set((s) => ({ progress: { ...s.progress, finaleDone: true } })),
      reset: () => set({ progress: emptyProgress() }),
    }),
    {
      name: 'ariadne-v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ settings: s.settings, progress: s.progress }),
      // Saves from an older build lack the newer settings: fill them with defaults.
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<{ settings: Settings; progress: Progress }>;
        const settings = { ...current.settings, ...p.settings };
        // A save from before the play modes existed, made with one button: that player needs Accessible.
        if (p.settings && !p.settings.play && p.settings.input === 'switch') settings.play = 'accessible';
        return { ...current, settings, progress: { ...current.progress, ...p.progress } };
      },
    },
  ),
);

// ---------- Derived state ----------

export const keysDone = (p: Progress) => keyEpisodes.filter((e) => p.done[e.id]).length;
export const finaleOpen = (p: Progress) => keysDone(p) === keyEpisodes.length;
export const nextKeyEpisode = (p: Progress) => keyEpisodes.find((e) => !p.done[e.id]);

/**
 * The diegetic clock, "Dawn in 06:12". It advances per restored memory, never per real second,
 * so it can never pressure the player (WCAG 2.2.1, AX-36).
 */
export function dawnClock(p: Progress): string {
  const total = episodes.length + 2;
  const done = Object.keys(p.done).length + (p.prologueDone ? 1 : 0) + (p.finaleDone ? 1 : 0);
  const minutes = Math.round(372 * (1 - done / total));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
