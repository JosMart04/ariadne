/**
 * Interprets a puzzle FSM declared in content (section 8 of the requirements).
 *  - max 3 choices, all visible (FR-20); no randomness, no timers that can fail the player (FR-21, FR-27)
 *  - a wrong choice explains what would have happened and returns to the decision (FR-23)
 *  - guaranteed progress: hint 1 at 30 s or 1 error, hint 2 at 60 s or 2 errors,
 *    "Let the machine show you" at 90 s or 3 errors; story mode unlocks everything at once (FR-24, FR-25)
 *  - forced historical outcomes are labelled "This is what really happened." (FR-26)
 */
import { useEffect, useMemo, useState } from 'react';
import { t } from '../content';
import type { FactC, PuzzleT } from '../content/schema';
import { announce } from '../engine/announce';
import { SOLVED, shortestPath } from '../engine/fsm';
import { useGame } from '../engine/store';
import { Btn, Rich, Source, useFocusOn } from '../ui/parts';
import { Stage } from './Stage';

type Props = {
  puzzle: PuzzleT;
  facts: Record<string, FactC>;
  onSolved: (assisted: boolean) => void;
};

export function PuzzleRunner({ puzzle, facts, onSolved }: Props) {
  const storyMode = useGame((s) => s.settings.storyMode);
  const [cur, setCur] = useState(puzzle.initial);
  /** The decision the player is currently working on; help is counted per decision. */
  const [decision, setDecision] = useState(puzzle.initial);
  const [errors, setErrors] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [assist, setAssist] = useState(false);
  const [everAssisted, setEverAssisted] = useState(false);

  const state = puzzle.states[cur];
  const region = useFocusOn<HTMLDivElement>(cur);

  // Help clock. It only ever ADDS help; nothing is lost when it runs.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

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

  if (!state) return null;
  const fact = state.fact ? facts[state.fact] : undefined;

  return (
    <div className="puzzle">
      {/* Focus lands here after every move: a safe, non-actionable stop, so a repeated key press can never
          pick an answer by accident. Tab then reaches the first option. */}
      <div className="puzzle__view" ref={region} tabIndex={-1} role="group" aria-label={t('beat.operation')} aria-live="polite">
        {state.forced && <p className="puzzle__forced">{t('puzzle.forced')}</p>}
        <Stage stage={state.stage} />
        {state.say && (
          <p className={`puzzle__say${state.wrong ? ' puzzle__say--wrong' : ''}`}>
            <Rich text={state.say} />
          </p>
        )}
        {fact && <Source fact={fact} />}
        {state.prompt && (
          <p className="puzzle__prompt">
            <Rich text={state.prompt} />
          </p>
        )}
      </div>

      {state.choices ? (
        <ul className="choices" aria-label={t('puzzle.options')}>
          {state.choices.map((c, i) => {
            const chosenByMachine = machineChoice === i;
            return (
              <li key={`${cur}-${i}`}>
                <button
                  type="button"
                  className={`choice${chosenByMachine ? ' choice--machine' : ''}`}
                  data-scan="primary"
                  disabled={assist && machineChoice >= 0 && !chosenByMachine}
                  onClick={() => move(c.to)}
                >
                  <span className="choice__label">{c.label}</span>
                  {c.detail && <span className="choice__detail">{c.detail}</span>}
                  {chosenByMachine && <span className="choice__machine">◆ {t('puzzle.assisted')}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="actions">
          <Btn onClick={() => move(state.next!)}>{t('common.continue')}</Btn>
        </div>
      )}

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
    </div>
  );
}
