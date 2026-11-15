/**
 * Interprets a puzzle FSM declared in content (section 8 of the requirements).
 *  - one logic, several views (FR-29): in a 3D set, a choice is a large target inside the scene, and a
 *    scripted pilot flies it; without 3D, the same graph plays as text
 *  - max 3 choices, all visible (FR-20); no randomness, no timers that can fail the player (FR-21, FR-27)
 *  - a wrong choice explains what would have happened and returns to the decision (FR-23)
 *  - guaranteed progress: hint 1 at 30 s or 1 error, hint 2 at 60 s or 2 errors,
 *    "Let the machine show you" at 90 s or 3 errors; story mode unlocks everything at once (FR-24, FR-25)
 *  - forced historical outcomes are labelled "This is what really happened." (FR-26)
 */
import { useEffect, useMemo, useState } from 'react';
import { t } from '../content';
import type { ChoiceT, FactC, PuzzleT } from '../content/schema';
import { announce } from '../engine/announce';
import { SOLVED, shortestPath } from '../engine/fsm';
import { useGame } from '../engine/store';
import { Btn, Rich, Source, useFocusOn } from '../ui/parts';
import { Anchor } from './Set3D';
import { Stage } from './Stage';
import { act, showCue, useStage } from './setStore';

type Props = {
  puzzle: PuzzleT;
  facts: Record<string, FactC>;
  onSolved: (assisted: boolean) => void;
  /** Play inside a 3D set: states name cues, choices can be targets in the scene. */
  scene?: boolean;
  /** The cue to show when a state names none. */
  cue?: string;
};

type FlightReadout = { alt: number; sink: number; speed: number; fuel: number };

export function PuzzleRunner({ puzzle, facts, onSolved, scene = false, cue }: Props) {
  const storyMode = useGame((s) => s.settings.storyMode);
  const stage3d = useStage((s) => s.status === 'ready');
  const [cur, setCur] = useState(puzzle.initial);
  /** The decision the player is currently working on; help is counted per decision. */
  const [decision, setDecision] = useState(puzzle.initial);
  const [errors, setErrors] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [assist, setAssist] = useState(false);
  const [everAssisted, setEverAssisted] = useState(false);
  /** A scripted pilot is flying the player's choice. */
  const [flying, setFlying] = useState(false);

  const state = puzzle.states[cur];
  const region = useFocusOn<HTMLDivElement>(cur);

  // Help clock. It only ever ADDS help; nothing is lost when it runs.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // The 3D set follows the state machine.
  useEffect(() => {
    if (!scene || !state) return;
    const named = state.stage?.kind === 'scene' ? (state.stage as { cue?: string }).cue : undefined;
    if (state.sim) act('reset');
    showCue(named ?? cue);
  }, [scene, cur, state, cue, stage3d]);

  const level = storyMode ? 3 : Math.max(errors >= 3 || seconds >= 90 ? 3 : 0, errors >= 2 || seconds >= 60 ? 2 : 0, errors >= 1 || seconds >= 30 ? 1 : 0);
  // Hints belong to the open decision; they step aside while a result is being narrated.
  const deciding = !!state && (!!state.choices || !!state.wrong);
  const hints = deciding ? (puzzle.states[decision]?.hints ?? puzzle.hints ?? []).slice(0, Math.min(level, 2)) : [];

  /** While assisting, the machine marks the choice that lies on the shortest path to SOLVED. */
  const machineChoice = useMemo(() => {
    if (!assist || !state?.choices) return -1;
    const path = shortestPath(puzzle, cur);
    return path ? state.choices.findIndex((c) => c.to === path[0]) : -1;
  }, [assist, cur, puzzle, state]);

  function move(to: string) {
    if (to === SOLVED) {
      announce(t('puzzle.solved'));
      onSolved(everAssisted);
      return;
    }
    const next = puzzle.states[to];
    if (next.wrong) setErrors((e) => e + 1);
    if (next.choices && to !== decision) {
      setDecision(to);
      setErrors(0);
      setSeconds(0);
    }
    setCur(to);
  }

  /** In a 3D set, a choice that is a simulation outcome is first flown by the scripted pilot (C-D08). */
  async function choose(c: ChoiceT) {
    if (scene && stage3d && state?.sim && c.when) {
      setFlying(true);
      announce(t('flight.auto'));
      try {
        await act<Promise<unknown>>('fly', { outcome: c.when, speed: 3 });
      } finally {
        setFlying(false);
      }
    }
    move(c.to);
  }

  if (!state) return null;
  const fact = state.fact ? facts[state.fact] : undefined;
  const choices = state.choices ?? [];
  const inScene = scene && choices.some((c) => c.target);

  return (
    <div className={`puzzle${scene ? ' puzzle--scene' : ''}`}>
      {/* Focus lands here after every move: a safe, non-actionable stop, so a repeated key press can never
          pick an answer by accident. Tab then reaches the first option. */}
      <div className="puzzle__view" ref={region} tabIndex={-1} role="group" aria-label={t('beat.operation')} aria-live="polite">
        {state.forced && <p className="puzzle__forced">{t('puzzle.forced')}</p>}
        <Stage stage={state.stage} />
        {!flying && state.say && (
          <p className={`puzzle__say${state.wrong ? ' puzzle__say--wrong' : ''}`}>
            <Rich text={state.say} />
          </p>
        )}
        {!flying && fact && <Source fact={fact} />}
        {!flying && state.prompt && (
          <p className="puzzle__prompt">
            <Rich text={state.prompt} />
          </p>
        )}
        {flying && <FlightHud />}
      </div>

      {flying ? (
        <div className="actions">
          <Btn kind="ghost" onClick={() => act('skip')}>
            {t('flight.skip')}
          </Btn>
        </div>
      ) : state.choices ? (
        <ul className={inScene ? 'targets' : scene ? 'keys' : 'choices'} aria-label={inScene ? t('puzzle.choose') : t('puzzle.options')}>
          {choices.map((c, i) => {
            const chosenByMachine = machineChoice === i;
            const button = (
              <button
                type="button"
                className={`${inScene ? 'target' : scene ? 'key' : 'choice'}${chosenByMachine ? ' choice--machine' : ''}`}
                data-scan="primary"
                disabled={assist && machineChoice >= 0 && !chosenByMachine}
                onClick={() => choose(c)}
              >
                {inScene && <span className="target__ring" aria-hidden="true" />}
                <span className="choice__label">{c.label}</span>
                {c.detail && <span className="choice__detail">{c.detail}</span>}
                {chosenByMachine && <span className="choice__machine">◆ {t('puzzle.assisted')}</span>}
              </button>
            );
            return inScene ? (
              <Anchor key={`${cur}-${i}`} name={c.target}>
                {button}
              </Anchor>
            ) : (
              <li key={`${cur}-${i}`}>{button}</li>
            );
          })}
        </ul>
      ) : (
        <div className="actions">
          <Btn onClick={() => move(state.next!)}>{t('common.continue')}</Btn>
        </div>
      )}

      {!flying && (
        <div className="puzzle__help" aria-live="polite">
          {hints.map((h, i) => (
            <p key={i} className="hint">
              <strong>{t('puzzle.hint')}:</strong> {h}
            </p>
          ))}
          {level >= 3 && !assist && state.choices && (
            <Btn
              kind="ghost"
              onClick={() => {
                setAssist(true);
                setEverAssisted(true);
              }}
            >
              {t('puzzle.showMe')}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

/** The four numbers the crew called out on the way down. Read from the simulation, a few times per second. */
function FlightHud() {
  const [r, setR] = useState<FlightReadout | null>(null);
  useEffect(() => {
    const read = () => {
      const s = act<{ x: number; y: number; vx: number; vy: number; fuel: number; agl?: number }>('state');
      if (s) setR({ alt: Math.max(0, s.agl ?? s.y), sink: Math.max(0, -s.vy), speed: Math.abs(s.vx), fuel: Math.max(0, s.fuel) });
    };
    read();
    const id = setInterval(read, 120);
    return () => clearInterval(id);
  }, []);
  if (!r) return null;
  const cell = (label: string, value: string, unit: string, warn = false) => (
    <div className={`tape${warn ? ' tape--warn' : ''}`}>
      <dt>{label}</dt>
      <dd>
        {value}
        <span className="tape__unit"> {unit}</span>
      </dd>
    </div>
  );
  return (
    <dl className="tapes" aria-live="off">
      {cell(t('flight.alt'), r.alt.toFixed(0), t('flight.m'))}
      {cell(t('flight.sink'), r.sink.toFixed(1), t('flight.ms'))}
      {cell(t('flight.speed'), r.speed.toFixed(1), t('flight.ms'))}
      {cell(t('flight.fuel'), r.fuel.toFixed(0), t('flight.s'), r.fuel < 30)}
    </dl>
  );
}
