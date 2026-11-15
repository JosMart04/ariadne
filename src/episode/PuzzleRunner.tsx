/**
 * Interprets a puzzle FSM declared in content (section 8 of the requirements).
 *
 * One logic, three views (FR-29, C-D03):
 *  - Explorer and Hands: a decision that names a simulation is played on its console; the outcome of the
 *    simulation picks the choice whose `when` matches.
 *  - Accessible: the same decision is a set of at most 3 large targets inside the scene; a scripted pilot flies the choice.
 *  - No 3D: the same graph plays as text.
 *
 * Unchanged from iteration 0:
 *  - max 3 choices, all visible (FR-20); no randomness, no timers that can fail the player (FR-21, FR-27)
 *  - a wrong choice explains what would have happened and returns to the decision (FR-23)
 *  - guaranteed progress: hint 1 at 30 s or 1 error, hint 2 at 60 s or 2 errors,
 *    "Let the machine show you" at 90 s or 3 errors (2 skill failures in Explorer, FR-29a); story mode unlocks it at once
 *  - forced historical outcomes are labelled "This is what really happened." (FR-26)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/bus';
import { SimBrief, SimConsole, SimHud, hasConsole } from '../consoles';
import { t } from '../content';
import type { ChoiceT, ConsoleT, FactC, PuzzleT } from '../content/schema';
import { voiceId } from '../content/voice';
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
  /** The faithful console of this operation: labels and REAL / IMAGINED tags of its controls. */
  consoleDef?: ConsoleT;
  /** Prefix of the voice ids of this puzzle's narration (src/content/voice.ts). */
  voice?: string;
};

type FlightEnd = { outcome: string | null; miss?: string; sink?: string; drift?: string; cancelled?: boolean };

/**
 * Asks the set to carry out an operation and waits for its end. The wait also closes when the stage stops being
 * ready (the 3D context was lost, or the set was taken down): a cancelled operation must never leave the player
 * waiting (pillar 3). The caller decides what a cancellation means; it is never an outcome.
 */
function flight(arg: unknown): Promise<FlightEnd | undefined> {
  const run = act<Promise<FlightEnd>>('fly', arg);
  if (!run) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const stop = useStage.subscribe((s) => {
      if (s.status === 'ready') return;
      stop();
      resolve({ outcome: null, cancelled: true });
    });
    const end = (e: FlightEnd | undefined) => {
      stop();
      resolve(e);
    };
    run.then(end, () => end({ outcome: null, cancelled: true }));
  });
}

export function PuzzleRunner({ puzzle, facts, onSolved, scene = false, cue, consoleDef, voice }: Props) {
  const storyMode = useGame((s) => s.settings.storyMode);
  const play = useGame((s) => s.settings.play);
  const stage3d = useStage((s) => s.status === 'ready');
  const [cur, setCur] = useState(puzzle.initial);
  /** The decision the player is currently working on; help is counted per decision. */
  const [decision, setDecision] = useState(puzzle.initial);
  const [errors, setErrors] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [assist, setAssist] = useState(false);
  const [everAssisted, setEverAssisted] = useState(false);
  /** Who is flying: nobody, the player, or a scripted pilot. */
  const [flying, setFlying] = useState<null | 'player' | 'machine'>(null);
  /** "Switch to guided choices": this puzzle goes on in the Accessible view; the global mode is untouched (FR-29a). */
  const [guided, setGuided] = useState(false);
  /** A skill failure that is not an outcome (a touchdown that was too hard): say exactly why, then retry from nearby. */
  const [miss, setMiss] = useState<FlightEnd | null>(null);

  /** False once this puzzle has left the screen: an operation that ends later changes nothing. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const state = puzzle.states[cur];
  const region = useFocusOn<HTMLDivElement>(`${cur}-${flying}-${!!miss}`);
  /** This decision is played by hand, on its console. */
  const byHand = scene && stage3d && play !== 'accessible' && !guided && hasConsole(state?.sim);

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
    setMiss(null);
    showCue(named ?? cue);
  }, [scene, cur, state, cue, stage3d]);

  // Narration, and a sound for what just happened. The first alarm state rings the master alarm once.
  useEffect(() => {
    if (!state) return;
    if (voice && state.say) audio.speak(voiceId.say(voice, cur), state.say, 'ariadne');
    if (state.wrong) audio.play('wrong');
    else if ((state.stage as { cue?: string } | undefined)?.cue === 'alarm' && cur === puzzle.initial) audio.play('alarm');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);

  const skillHelp = byHand && errors >= 2;
  const level = storyMode || skillHelp ? 3 : Math.max(errors >= 3 || seconds >= 90 ? 3 : 0, errors >= 2 || seconds >= 60 ? 2 : 0, errors >= 1 || seconds >= 30 ? 1 : 0);
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
      audio.play('confirm');
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
      setFlying('machine');
      announce(t(`sim.${state.sim}.auto`));
      try {
        // The run only shows the choice. If it is cut short, the choice the player made still stands.
        await flight({ outcome: c.when, speed: 3 });
      } finally {
        setFlying(null);
      }
      if (!alive.current) return;
    }
    move(c.to);
  }

  /** Explorer and Hands: the player flies. The simulation's outcome is the choice (FR-29). */
  async function takeControl(retry = false) {
    setMiss(null);
    audio.stopVoice();
    setFlying('player');
    let end: FlightEnd | undefined;
    try {
      end = await flight({ player: true, retry });
    } finally {
      setFlying(null);
    }
    // Cut short by the stage, not by the player: no outcome, no error, no lesson. The decision is simply open again.
    if (!alive.current || end?.cancelled) return;
    const c = end?.outcome ? state?.choices?.find((x) => x.when === end!.outcome) : undefined;
    if (c) return move(c.to);
    // Not an outcome of the puzzle: the state does not change. Teach, count it for help, offer a retry.
    setErrors((e) => e + 1);
    setMiss(end ?? { outcome: null });
    audio.play('wrong');
    announce(missText(end ?? { outcome: null }));
  }

  /** "Let the machine show you": the scripted pilot flies the way that reaches SOLVED. Recorded without penalty. */
  function showMe() {
    setAssist(true);
    setEverAssisted(true);
    if (!byHand || !state?.choices) return;
    const path = shortestPath(puzzle, cur);
    const c = path && state.choices.find((x) => x.to === path[0]);
    if (c) void choose(c);
  }

  /** Why the attempt did not count, in plain words and with the player's own numbers. */
  function missText(end: FlightEnd) {
    const key = `sim.${state?.sim}.miss${end.miss ? `.${end.miss}` : ''}`;
    return t(key, { sink: end.sink ?? '', drift: end.drift ?? '' });
  }

  if (!state) return null;
  const fact = state.fact ? facts[state.fact] : undefined;
  const choices = state.choices ?? [];
  const inScene = scene && choices.some((c) => c.target);
  const showText = !flying;

  return (
    <div className={`puzzle${scene ? ' puzzle--scene' : ''}${flying === 'player' ? ' puzzle--flying' : ''}`}>
      {/* Focus lands here after every move: a safe, non-actionable stop, so a repeated key press can never
          pick an answer by accident. Tab then reaches the first option. */}
      <div className="puzzle__view" ref={region} tabIndex={-1} role="group" aria-label={t('beat.operation')} aria-live="polite">
        {state.forced && <p className="puzzle__forced">{t('puzzle.forced')}</p>}
        <Stage stage={state.stage} />
        {showText && miss && <p className="puzzle__say puzzle__say--wrong">{missText(miss)}</p>}
        {showText && !miss && state.say && (
          <p className={`puzzle__say${state.wrong ? ' puzzle__say--wrong' : ''}`}>
            <Rich text={state.say} />
          </p>
        )}
        {showText && !miss && fact && <Source fact={fact} />}
        {showText && state.prompt && !miss && (
          <p className="puzzle__prompt">
            <Rich text={state.prompt} />
          </p>
        )}
        {showText && byHand && state.sim && state.choices && <SimBrief sim={state.sim} />}
        {flying === 'machine' && state.sim && <SimHud sim={state.sim} />}
        {flying === 'player' && state.sim && <SimConsole sim={state.sim} def={consoleDef} facts={facts} />}
      </div>

      {flying === 'machine' ? (
        <div className="actions">
          <Btn kind="ghost" onClick={() => act('skip')}>
            {t(`sim.${state.sim}.skip`)}
          </Btn>
        </div>
      ) : flying === 'player' ? null : byHand && state.choices ? (
        <div className="actions">
          <Btn onClick={() => takeControl(!!miss)}>{t(`sim.${state.sim}.${miss ? 'retry' : 'take'}`)}</Btn>
          {level >= 3 && !assist && (
            <Btn kind="ghost" onClick={showMe}>
              {t('puzzle.showMe')}
            </Btn>
          )}
          <Btn kind="ghost" onClick={() => setGuided(true)}>
            {t('flight.guided')}
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
          {level >= 3 && !assist && state.choices && !byHand && (
            <Btn kind="ghost" onClick={showMe}>
              {t('puzzle.showMe')}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
