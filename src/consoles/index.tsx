/**
 * Which console plays which simulation (10.6.2). A puzzle state that says `sim: descent` gets the lunar
 * module panel in Explorer and Hands; in Accessible the same decision is a set of targets in the scene.
 *
 * `Console` is what the player operates.
 * `Brief`   says the goal and the controls before the player takes over (pillar 1: teach first).
 * `Hud`     is what is shown while a scripted run plays the player's choice.
 * Wording per simulation lives in content/ui.yaml as `sim.<name>.take | retry | skip | auto | miss[.<reason>]`.
 */
import type { ComponentType } from 'react';
import type { ConsoleT, FactC } from '../content/schema';
import { DsnBrief, DsnConsole } from './DsnConsole';
import { LmBrief, LmHud, LmPanel } from './LmPanel';
import { TelescopeBrief, TelescopeConsole } from './TelescopeConsole';

export type ConsoleProps = { def?: ConsoleT; facts: Record<string, FactC> };

const SIMS: Record<string, { Console: ComponentType<ConsoleProps>; Brief?: ComponentType; Hud?: ComponentType }> = {
  descent: { Console: LmPanel, Brief: LmBrief, Hud: LmHud },
  ranging: { Console: TelescopeConsole, Brief: TelescopeBrief },
  dsn: { Console: DsnConsole, Brief: DsnBrief },
};

/** True when a simulation can be played by hand, with its own console. */
export const hasConsole = (sim: string | undefined): boolean => !!sim && sim in SIMS;

export function SimConsole({ sim, ...props }: ConsoleProps & { sim: string }) {
  const C = SIMS[sim]?.Console;
  return C ? <C {...props} /> : null;
}

export function SimBrief({ sim }: { sim: string }) {
  const B = SIMS[sim]?.Brief;
  return B ? <B /> : null;
}

export function SimHud({ sim }: { sim: string }) {
  const H = SIMS[sim]?.Hud;
  return H ? <H /> : null;
}
