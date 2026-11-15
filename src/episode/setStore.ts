/**
 * The stage: which 3D set is on screen, what it is showing, and whether it is ready.
 * One set is on screen at a time, so this is a single small store that beats write to
 * and the set reads from. It imports only TYPES from three, so three.js stays in its lazy chunk.
 */
import { create } from 'zustand';
import type { SceneHost, SetController } from '../three/host';

export type StageStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'lost';

type Stage = {
  cue: string | null;
  status: StageStatus;
  host: SceneHost | null;
  set: SetController | null;
  /** Frames per second, for `?fps` (AC-16). */
  fps: number;
};

export const useStage = create<Stage>(() => ({ cue: null, status: 'idle', host: null, set: null, fps: 0 }));

/** Ask the set to show a cue. Safe to call before the set has loaded: it starts on the latest cue. */
export function showCue(cue: string | null | undefined) {
  if (!cue) return;
  const s = useStage.getState();
  if (s.cue !== cue) useStage.setState({ cue });
  s.set?.setCue(cue);
}

/** Send a command to the set (e.g. fly a scripted pilot). Resolves to undefined when there is no set. */
export function act<T = unknown>(name: string, arg?: unknown): T | undefined {
  return useStage.getState().set?.act?.(name, arg) as T | undefined;
}

export const is3D = () => useStage.getState().status === 'ready';
