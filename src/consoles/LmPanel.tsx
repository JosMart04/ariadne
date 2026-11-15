/**
 * The lunar module's landing controls, reduced to what Armstrong used in the last minute (10.6.2).
 *
 *  - Program 66: the manual landing program he switched to (REAL).
 *  - Hand controller: tilts the lander to speed up or to brake (REAL).
 *  - Descent rate: asks the computer to sink faster or slower. A stand-in for the real switch (IMAGINED, says so).
 *  - Readouts the crew called aloud: altitude, descent rate, forward speed, fuel. Each limit is on screen, with a
 *    mark that says whether you are inside it (icon and word, never colour alone).
 *  - Mission Control's real fuel calls, and the contact light.
 *
 * A flight nobody understands teaches nothing (pillar 1), so the panel also coaches: one short line, always visible,
 * says what to do next. `LmBrief` states the goal and the two controls before the player takes over.
 *
 * Every control is a native element, so mouse, touch, keyboard and the Hands cursor all work on it (C-D06).
 * Keyboard: W / S tilt, R / F descent rate, left / right look around. Gamepad: left stick, two face buttons.
 */
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/bus';
import { t } from '../content';
import type { ConsoleT, FactC } from '../content/schema';
import { Anchor } from '../episode/Set3D';
import { act } from '../episode/setStore';
import { bindFlightKeys, controls } from '../input/controls';
import { MAX_DRIFT, MAX_SINK } from '../sim/descent';
import { Source, TagChip } from '../ui/parts';

type Readout = { x: number; agl: number; vx: number; vy: number; fuel: number; sink: number; thrust: number; flying: boolean };

/** Where the rocks are along the track, metres from the landing point (src/sim/tranquility.ts ROUGH). */
const CRATER_ENDS = 300;
const LITTLE_WEST: [number, number] = [36, 90];

/**
 * What to do right now, as the key of one short sentence. The order is the order of urgency.
 * This is guidance only: it never flies for the player.
 */
export function coach(r: Readout): string {
  const speed = Math.abs(r.vx);
  const sink = -r.vy;
  if (r.fuel < 18) return 'coach.fuel';
  if (r.agl < 40 && sink > MAX_SINK - 0.2) return 'coach.slowfall';
  if (r.x > CRATER_ENDS) return r.agl < 45 ? 'coach.climb' : 'coach.flyon';
  if (r.vx > 0.8) return 'coach.backwards';
  if (speed > MAX_DRIFT - 0.1) return 'coach.brake';
  if (r.x > LITTLE_WEST[0] && r.x < LITTLE_WEST[1] && r.agl < 30) return 'coach.smallcrater';
  if (r.agl > 12) return 'coach.down';
  return 'coach.gentle';
}

export function LmPanel({ def, facts }: { def?: ConsoleT; facts: Record<string, FactC> }) {
  const [r, setR] = useState<Readout | null>(null);
  const [pitch, setPitch] = useState(0);
  const pad = useRef<HTMLDivElement>(null);

  useEffect(() => bindFlightKeys(), []);
  useEffect(() => controls.subscribe(() => setPitch(controls.pitch)), []);
  useEffect(() => {
    const read = () => {
      const s = act<Readout>('state');
      if (s) setR(s);
    };
    read();
    const id = setInterval(read, 100);
    return () => {
      clearInterval(id);
      controls.reset();
      audio.engine(0);
    };
  }, []);

  /** The stick: press and move. Top is forward, bottom is brake. Letting go centres it, like the real spring. */
  const stick = (e: React.PointerEvent) => {
    const box = pad.current!.getBoundingClientRect();
    const v = 1 - (2 * (e.clientY - box.top)) / box.height;
    controls.setPitch('stick', Math.max(-1, Math.min(1, v)));
  };
  const release = () => controls.setPitch('stick', 0);

  const fuel = r ? Math.max(0, r.fuel) : 99;
  // Each call is heard once, for a few seconds, as it was on the radio.
  const call = fuel <= 30 && fuel > 24 ? 'flight.call30' : fuel <= 60 && fuel > 54 ? 'flight.call60' : null;
  const contact = !!r && r.agl < 1.73;
  const flying = !!r?.flying;
  const thrust = r ? Math.round(Math.min(1.5, r.thrust) * 10) / 10 : 0;
  const now = r && flying ? coach(r) : '';

  // What the crew heard: the engine through the cabin floor, the calls from Mission Control, the thump of contact.
  useEffect(() => {
    audio.engine(flying ? 0.35 + 0.4 * thrust : 0);
  }, [flying, thrust]);
  useEffect(() => {
    if (call) audio.play('quindar');
  }, [call]);
  useEffect(() => {
    if (contact) audio.play('contact');
  }, [contact]);

  const ctl = def?.controls ?? {};
  const tag = (id: string) => (ctl[id] ? <TagChip tag={ctl[id].tag} /> : null);
  const sinkNow = r ? Math.max(0, -r.vy) : 0;
  const speedNow = r ? Math.abs(r.vx) : 0;

  // A limit only matters at touchdown: high up, "not yet" is calm; near the ground it is a warning.
  const near = !!r && r.agl < 40;
  const tape = (label: string, value: string, unit: string, limit?: { max: number; ok: boolean }, note?: string) => (
    <div className={`tape${limit && !limit.ok ? (near ? ' tape--warn' : ' tape--wait') : ''}${limit?.ok ? ' tape--ok' : ''}`}>
      <dt>{label}</dt>
      <dd>
        {value}
        <span className="tape__unit"> {unit}</span>
      </dd>
      {limit && (
        <dd className="tape__limit">
          <span aria-hidden="true">{limit.ok ? '✓' : '✗'}</span> {limit.ok ? t('flight.ok') : t('flight.toofast')} · {t('flight.limit', { n: limit.max })}
        </dd>
      )}
      {note && <dd className="tape__note">{note}</dd>}
    </div>
  );

  return (
    <div className="lmpanel" role="group" aria-label={def?.name ?? t('beat.operation')}>
      {/* The place to land, named inside the scene. */}
      <ul className="marks" aria-hidden="true">
        <Anchor name="beyond">
          <span className="mark">{t('flight.zone')}</span>
        </Anchor>
      </ul>

      <div className="lmpanel__left">
        <p className="coach" role="status" aria-live="polite">
          <span className="coach__label">{t('coach.label')}</span>
          <span className="coach__text">{now ? t(now) : ' '}</span>
        </p>
        <dl className="tapes" aria-live="off">
          {tape(t('flight.alt'), r ? Math.max(0, r.agl).toFixed(0) : '–', t('flight.m'))}
          {tape(t('flight.sink'), sinkNow.toFixed(1), t('flight.ms'), { max: MAX_SINK, ok: sinkNow <= MAX_SINK })}
          {tape(t('flight.speed'), speedNow.toFixed(1), t('flight.ms'), { max: MAX_DRIFT, ok: speedNow <= MAX_DRIFT })}
          {tape(t('flight.fuel'), fuel.toFixed(0), t('flight.s'), undefined, r && r.x > 0 ? t('flight.togo', { n: Math.round(r.x) }) : t('flight.past', { n: Math.round(-(r?.x ?? 0)) }))}
        </dl>
        <div className="lmpanel__row">
          <span className="dsky">
            <span className="dsky__label">{t('flight.prog')}</span>
            <span className="dsky__digits">66</span>
          </span>
          {tag('dsky')}
          <span className={`lamp${contact ? ' lamp--on' : ''}`} role="status">
            {t('flight.contact')}
          </span>
          {call && (
            <span className="call" aria-live="polite">
              <span className="line__who">{t('speaker.capcom')}</span> <TagChip tag="REAL" /> <strong>{t(call)}</strong> {facts.fuel && <Source fact={facts.fuel} />}
            </span>
          )}
        </div>
      </div>

      <div className="lmpanel__right">
        <div className="control">
          <span className="control__label">
            {ctl['hand-controller']?.label ?? t('flight.stick')} {tag('hand-controller')}
          </span>
          <div
            className="stick"
            ref={pad}
            role="slider"
            tabIndex={0}
            aria-label={t('flight.stick')}
            aria-orientation="vertical"
            aria-valuemin={-1}
            aria-valuemax={1}
            aria-valuenow={Number(pitch.toFixed(2))}
            aria-valuetext={pitch > 0.1 ? t('flight.stick.fwd') : pitch < -0.1 ? t('flight.stick.back') : '0'}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              stick(e);
            }}
            onPointerMove={(e) => e.buttons && stick(e)}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <span className="stick__end">
              <kbd>W</kbd> {t('flight.stick.fwd')}
            </span>
            <span className="stick__knob" style={{ top: `${50 - pitch * 34}%` }} />
            <span className="stick__end">
              <kbd>S</kbd> {t('flight.stick.back')}
            </span>
          </div>
        </div>
        <div className="control">
          <span className="control__label">
            {ctl['sink-rate']?.label ?? t('flight.rod')} {tag('sink-rate')}
          </span>
          <div className="rod">
            <button type="button" className="rod__btn" onClick={() => controls.click(-1)}>
              <kbd>R</kbd> ▲ {t('flight.rod.slower')}
            </button>
            <span className="rod__now">
              {t('flight.commanded')} {r ? Math.max(0, r.sink).toFixed(1) : '–'} {t('flight.ms')}
            </span>
            <button type="button" className="rod__btn" onClick={() => controls.click(1)}>
              <kbd>F</kbd> ▼ {t('flight.rod.faster')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Before the player takes over: the goal, the two things to do, and the keys. Three short lines, no jargon.
 */
export function LmBrief() {
  return (
    <ol className="brief">
      <li>
        <span className="brief__n">1</span>
        <span>
          <strong>{t('brief.descent.goal.title')}</strong> {t('brief.descent.goal')}
        </span>
      </li>
      <li>
        <span className="brief__n">2</span>
        <span>
          <strong>{t('brief.descent.brake.title')}</strong> {t('brief.descent.brake', { n: MAX_DRIFT })} <kbd>S</kbd>
        </span>
      </li>
      <li>
        <span className="brief__n">3</span>
        <span>
          <strong>{t('brief.descent.down.title')}</strong> {t('brief.descent.down', { n: MAX_SINK })} <kbd>F</kbd> <kbd>R</kbd>
        </span>
      </li>
    </ol>
  );
}

/** The four numbers the crew called out on the way down, shown while a scripted pilot flies the player's choice. */
export function LmHud() {
  const [r, setR] = useState<Readout | null>(null);
  useEffect(() => {
    const read = () => {
      const s = act<Readout>('state');
      if (s) setR(s);
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
      {cell(t('flight.alt'), Math.max(0, r.agl).toFixed(0), t('flight.m'))}
      {cell(t('flight.sink'), Math.max(0, -r.vy).toFixed(1), t('flight.ms'))}
      {cell(t('flight.speed'), Math.abs(r.vx).toFixed(1), t('flight.ms'))}
      {cell(t('flight.fuel'), Math.max(0, r.fuel).toFixed(0), t('flight.s'), r.fuel < 30)}
    </dl>
  );
}
