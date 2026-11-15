/**
 * The pointing console of a 70-metre Deep Space Network antenna (10.6.2).
 *
 * Real antennas are pointed with predicted coordinates: azimuth and elevation. The operator's job here is the
 * same: bring the dish to the predicted numbers, watch the signal rise, and listen. Nobody steers Voyager.
 *
 * Mouse or finger: drag the scene to turn the dish, or use the pointing keys. Keyboard: arrows turn the dish,
 * Enter listens. Every control is a native button (C-D06).
 */
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/bus';
import { t } from '../content';
import type { ConsoleT, FactC } from '../content/schema';
import { act } from '../episode/setStore';
import { TagChip } from '../ui/parts';

type Readout = { az: number; el: number; signal: number; want: { az: number; el: number }; listening: boolean };

export function DsnConsole({ def }: { def?: ConsoleT; facts: Record<string, FactC> }) {
  const [r, setR] = useState<Readout | null>(null);
  const hold = useRef(0);

  useEffect(() => {
    const read = () => {
      const s = act<Readout>('state');
      if (s) setR(s);
    };
    read();
    const id = setInterval(read, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const KEYS: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(k in KEYS)) return;
      e.preventDefault();
      act('slew', { dx: KEYS[k][0] * 0.25, dz: KEYS[k][1] * 0.25 });
    };
    addEventListener('keydown', down);
    return () => removeEventListener('keydown', down);
  }, []);

  /** A pointing key turns the dish while it is held; one click is one step, for a switch or the keyboard. */
  const nudge = (dx: number, dz: number) => ({
    onPointerDown: () => {
      clearInterval(hold.current);
      hold.current = window.setInterval(() => act('slew', { dx: dx * 0.06, dz: dz * 0.06 }), 40);
    },
    onPointerUp: () => clearInterval(hold.current),
    onPointerLeave: () => clearInterval(hold.current),
    onClick: () => act('slew', { dx: dx * 0.22, dz: dz * 0.22 }),
  });
  useEffect(() => () => clearInterval(hold.current), []);

  const ctl = def?.controls ?? {};
  const tag = (id: string) => (ctl[id] ? <TagChip tag={ctl[id].tag} /> : null);
  const strength = Math.round((r?.signal ?? 0) * 100);
  const locked = strength >= 87;
  const num = (v: number) => `${Math.round(v)}°`;
  const off = (now: number, want: number) => {
    const d = Math.round(want - now);
    return d === 0 ? '✓' : d > 0 ? `+${d}°` : `${d}°`;
  };

  return (
    <div className="scope" role="group" aria-label={def?.name ?? t('beat.operation')}>
      <div className="scope__left">
        <dl className="tapes" aria-live="off">
          <div className="tape">
            <dt>{t('dsn.az')}</dt>
            <dd>{r ? num(r.az) : '–'}</dd>
            <dd className="tape__limit">
              {t('dsn.predicted')} {r ? num(r.want.az) : ''} · {r ? off(r.az, r.want.az) : ''}
            </dd>
          </div>
          <div className="tape">
            <dt>{t('dsn.el')}</dt>
            <dd>{r ? num(r.el) : '–'}</dd>
            <dd className="tape__limit">
              {t('dsn.predicted')} {r ? num(r.want.el) : ''} · {r ? off(r.el, r.want.el) : ''}
            </dd>
          </div>
          <div className={`tape${locked ? ' tape--ok' : ''}`}>
            <dt>{t('dsn.signal')}</dt>
            <dd>
              <span className="meter" role="meter" aria-label={t('dsn.signal')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={strength}>
                <span className="meter__fill" style={{ width: `${strength}%` }} />
              </span>
            </dd>
            <dd className="tape__limit">
              <span aria-hidden="true">{locked ? '✓' : '○'}</span> {locked ? t('dsn.locked') : t('dsn.searching')}
            </dd>
          </div>
        </dl>
      </div>

      <div className="scope__controls">
        <div className="control">
          <span className="control__label">
            {ctl.pointing?.label ?? t('scope.point')} {tag('pointing')}
          </span>
          <div className="dpad">
            <button type="button" className="dpad__btn dpad__btn--up" aria-label={t('dsn.up')} {...nudge(0, -1)}>
              ▲
            </button>
            <button type="button" className="dpad__btn dpad__btn--left" aria-label={t('dsn.left')} {...nudge(-1, 0)}>
              ◀
            </button>
            <button type="button" className="dpad__btn dpad__btn--right" aria-label={t('dsn.right')} {...nudge(1, 0)}>
              ▶
            </button>
            <button type="button" className="dpad__btn dpad__btn--down" aria-label={t('dsn.down')} {...nudge(0, 1)}>
              ▼
            </button>
          </div>
        </div>
        <div className="control">
          <span className="control__label">
            {ctl.receiver?.label ?? t('dsn.receiver')} {tag('receiver')}
          </span>
          <button type="button" className="fire fire--listen" data-scan="primary" disabled={!!r?.listening} onClick={() => (audio.play('static'), act('fire'))}>
            {t('dsn.listen')}
          </button>
        </div>
      </div>
      <p className="lmpanel__keys">{t('dsn.keys')}</p>
    </div>
  );
}

/** Before the operator takes over: the two numbers to match, and what to do then. */
export function DsnBrief() {
  return (
    <ol className="brief">
      <li>
        <span className="brief__n">1</span>
        <span>
          <strong>{t('brief.dsn.point.title')}</strong> {t('brief.dsn.point')}
        </span>
      </li>
      <li>
        <span className="brief__n">2</span>
        <span>
          <strong>{t('brief.dsn.signal.title')}</strong> {t('brief.dsn.signal')}
        </span>
      </li>
      <li>
        <span className="brief__n">3</span>
        <span>
          <strong>{t('brief.dsn.listen.title')}</strong> {t('brief.dsn.listen')}
        </span>
      </li>
    </ol>
  );
}
