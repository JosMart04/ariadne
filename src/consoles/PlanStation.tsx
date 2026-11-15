/**
 * The planning station of a Mars rover, on Earth (10.6.2, FR-60).
 *
 * Nobody drove Opportunity with a joystick. The team planned a sol, sent one sequence of commands, and waited for
 * the answer at the speed of light. The operator's job here is the same: place the waypoint, read the forecast,
 * send once. After that the plan cannot change, and the station shows what is happening, step by step:
 * the command travels, the rover drives on its own, the telemetry travels back.
 *
 * The waits are shortened and can be skipped; skipping never changes the outcome, which is fixed when the
 * sequence leaves. The light time is an estimate for today's date (src/sim/meridiani.ts).
 *
 * Mouse or finger: drag the scene to move the waypoint, or use the keys. Keyboard: arrows move it, Enter sends.
 * Every control is a native button (C-D06).
 */
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/bus';
import { t } from '../content';
import type { ConsoleT, FactC } from '../content/schema';
import { act } from '../episode/setStore';
import { SLOPE_MIN, minSec } from '../sim/meridiani';
import { Btn, TagChip } from '../ui/parts';

type Phase = 'idle' | 'plan' | 'uplink' | 'drive' | 'downlink';
type Readout = { phase: Phase; progress: number; distance: number; tilt: number; light: number; need: number; shadow: boolean; enough: boolean; minutes: number };

/** Reads the set ten times a second. */
function useReadout() {
  const [r, setR] = useState<Readout | null>(null);
  useEffect(() => {
    const read = () => {
      const s = act<Readout>('state');
      if (s) setR(s);
    };
    read();
    const id = setInterval(read, 100);
    return () => clearInterval(id);
  }, []);
  return r;
}

const ORDER: Phase[] = ['uplink', 'drive', 'downlink'];

/** The three things that happen after a sequence is sent, with the one that is happening now marked. */
function Phases({ r }: { r: Readout }) {
  const now = ORDER.indexOf(r.phase);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="phases" role="status">
      <ol className="phases__list">
        {ORDER.map((p, i) => (
          <li key={p} className={`phase${i === now ? ' is-now' : i < now ? ' is-done' : ''}`} aria-current={i === now ? 'step' : undefined}>
            <span className="phase__n" aria-hidden="true">
              {i < now ? '✓' : i + 1}
            </span>
            <span className="phase__name">{t(`plan.phase.${p}`)}</span>
            <span className="meter" aria-hidden="true">
              <span className="meter__fill" style={{ width: `${i < now ? 100 : i === now ? Math.round(r.progress * 100) : 0}%` }} />
            </span>
            {p !== 'drive' && <span className="phase__note">{t('plan.delay', { t: minSec(r.minutes) })}</span>}
          </li>
        ))}
      </ol>
      <p className="phases__note">{t('plan.delay.note', { date: today })}</p>
    </div>
  );
}

export function PlanStation({ def }: { def?: ConsoleT; facts: Record<string, FactC> }) {
  const r = useReadout();
  const hold = useRef(0);
  const sent = !!r && r.phase !== 'plan' && r.phase !== 'idle';

  useEffect(() => {
    const KEYS: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(k in KEYS)) return;
      e.preventDefault();
      act('slew', { dx: KEYS[k][0] * 0.12, dz: KEYS[k][1] * 0.12 });
    };
    addEventListener('keydown', down);
    return () => removeEventListener('keydown', down);
  }, []);

  /** A key moves the waypoint while it is held; one click is one step, for a switch or the keyboard. */
  const nudge = (dx: number, dz: number) => ({
    onPointerDown: () => {
      clearInterval(hold.current);
      hold.current = window.setInterval(() => act('slew', { dx: dx * 0.04, dz: dz * 0.04 }), 40);
    },
    onPointerUp: () => clearInterval(hold.current),
    onPointerLeave: () => clearInterval(hold.current),
    onClick: () => act('slew', { dx: dx * 0.16, dz: dz * 0.16 }),
  });
  useEffect(() => () => clearInterval(hold.current), []);

  const ctl = def?.controls ?? {};
  const tag = (id: string) => (ctl[id] ? <TagChip tag={ctl[id].tag} /> : null);
  const light = Math.round((r?.light ?? 0) * 100);
  const need = Math.round((r?.need ?? 0) * 100);
  const tilt = Math.round(r?.tilt ?? 0);

  return (
    <div className="scope plan" role="group" aria-label={def?.name ?? t('beat.operation')}>
      <div className="scope__left">
        {sent && r ? (
          <Phases r={r} />
        ) : (
          <dl className="tapes" aria-live="off">
            <div className={`tape${tilt >= SLOPE_MIN ? ' tape--ok' : ' tape--wait'}`}>
              <dt>{t('plan.tilt')}</dt>
              <dd>{r ? `${tilt > 0 ? '+' : ''}${tilt}°` : '–'}</dd>
              <dd className="tape__limit">{t('plan.tilt.need', { n: SLOPE_MIN })}</dd>
            </div>
            <div className={`tape${r?.enough ? ' tape--ok' : r?.shadow ? ' tape--warn' : ' tape--wait'}`}>
              <dt>
                {ctl.forecast?.label ?? t('plan.light')} {tag('forecast')}
              </dt>
              <dd>
                <span className="meter meter--need" role="meter" aria-label={t('plan.light')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={light} style={{ ['--need' as string]: `${need}%` }}>
                  <span className="meter__fill" style={{ width: `${light}%` }} />
                </span>
              </dd>
              <dd className="tape__limit">
                <span aria-hidden="true">{r?.enough ? '✓' : '○'}</span> {light}% · {r?.enough ? t('plan.light.ok') : r?.shadow ? t('plan.light.shadow') : t('plan.light.low', { n: need })}
              </dd>
            </div>
            <div className="tape">
              <dt>{t('plan.lighttime')}</dt>
              <dd>
                {r ? Math.round(r.minutes) : '–'}
                <span className="tape__unit"> {t('plan.min')}</span>
              </dd>
              <dd className="tape__limit">{r ? t('plan.lighttime.note', { m: Math.round(r.distance) }) : ''}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="scope__controls">
        {sent ? (
          <div className="control">
            <span className="control__label">{t('plan.locked')}</span>
            <Btn kind="ghost" onClick={() => act('skip')}>
              {t('sim.traverse.skip')}
            </Btn>
          </div>
        ) : (
          <>
            <div className="control">
              <span className="control__label">
                {ctl.waypoint?.label ?? t('plan.waypoint')} {tag('waypoint')}
              </span>
              <div className="dpad">
                <button type="button" className="dpad__btn dpad__btn--up" aria-label={t('plan.away')} {...nudge(0, -1)}>
                  ▲
                </button>
                <button type="button" className="dpad__btn dpad__btn--left" aria-label={t('plan.left')} {...nudge(-1, 0)}>
                  ◀
                </button>
                <button type="button" className="dpad__btn dpad__btn--right" aria-label={t('plan.right')} {...nudge(1, 0)}>
                  ▶
                </button>
                <button type="button" className="dpad__btn dpad__btn--down" aria-label={t('plan.near')} {...nudge(0, 1)}>
                  ▼
                </button>
              </div>
            </div>
            <div className="control">
              <span className="control__label">
                {ctl.uplink?.label ?? t('plan.sequence')} {tag('uplink')}
              </span>
              <button type="button" className="fire fire--listen" data-scan="primary" onClick={() => (audio.play('pulse'), act('fire'))}>
                {t('plan.send')}
              </button>
            </div>
          </>
        )}
      </div>
      {!sent && <p className="lmpanel__keys">{t('plan.keys')}</p>}
    </div>
  );
}

/** While the scripted operator carries out the player's choice: the same three steps, with nothing to operate. */
export function PlanHud() {
  const r = useReadout();
  return r && r.phase !== 'idle' && r.phase !== 'plan' ? <Phases r={r} /> : null;
}

/** Before the operator takes over: the goal, how to read the forecast, and what happens after sending. */
export function PlanBrief() {
  return (
    <ol className="brief">
      <li>
        <span className="brief__n">1</span>
        <span>
          <strong>{t('brief.traverse.goal.title')}</strong> {t('brief.traverse.goal')}
        </span>
      </li>
      <li>
        <span className="brief__n">2</span>
        <span>
          <strong>{t('brief.traverse.plan.title')}</strong> {t('brief.traverse.plan')}
        </span>
      </li>
      <li>
        <span className="brief__n">3</span>
        <span>
          <strong>{t('brief.traverse.send.title')}</strong> {t('brief.traverse.send')}
        </span>
      </li>
    </ol>
  );
}
