/**
 * Which console plays which simulation (10.6.2). A puzzle state that says `sim: descent` gets the lunar
 * module panel in Explorer and Hands; in Accessible the same decision is a set of targets in the scene.
 */
import type { ComponentType } from 'react';
import type { ConsoleT, FactC } from '../content/schema';
import { LmPanel } from './LmPanel';

export type ConsoleProps = { def?: ConsoleT; facts: Record<string, FactC> };

const CONSOLES: Record<string, ComponentType<ConsoleProps>> = {
  descent: LmPanel,
};

/** True when a simulation can be played by hand, with its own console. */
export const hasConsole = (sim: string | undefined): boolean => !!sim && sim in CONSOLES;

export function SimConsole({ sim, ...props }: ConsoleProps & { sim: string }) {
  const C = CONSOLES[sim];
  return C ? <C {...props} /> : null;
}
