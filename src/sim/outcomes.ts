/**
 * Every outcome a simulation can hand to a puzzle state machine (FR-29, C-D03).
 *
 * A puzzle state that says `sim: descent` must offer exactly one choice per outcome
 * (`choices[].when`). The content compiler checks it, so Explorer and Hands can never
 * reach a transition that Accessible does not have, and the reachability test keeps
 * proving "never stuck" for every way of playing.
 *
 * Pure data: imported by the compiler, the tests and the client.
 */
export const SIM_OUTCOMES = {
  /** Apollo 11 final approach (P66): where and how Eagle touches down. */
  descent: ['landed-safe', 'rough-ground', 'out-of-fuel'],
  /** Lunar laser ranging: what the laser was pointed at when it fired. */
  ranging: ['on-mirror', 'on-stage', 'on-ground'],
  /** Deep Space Network: what the 70-metre dish was pointed at when the operator listened. */
  dsn: ['on-voyager', 'on-planet', 'on-empty'],
  /** Opportunity, planned from Earth: where the sequence of the sol leaves the rover for the winter. */
  traverse: ['on-slope', 'on-flat', 'in-shadow'],
} as const satisfies Record<string, readonly string[]>;

export type SimId = keyof typeof SIM_OUTCOMES;
export type OutcomeOf<S extends SimId> = (typeof SIM_OUTCOMES)[S][number];

export const isSim = (id: string): id is SimId => id in SIM_OUTCOMES;
