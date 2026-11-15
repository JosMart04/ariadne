/**
 * The lunar module's landing controls, reduced to what Armstrong used in the last minute (10.6.2).
 *
 *  - Program 66: the manual landing program he switched to (REAL).
 *  - Hand controller: tilts the lander to speed up or to brake (REAL).
 *  - Descent rate: asks the computer to sink faster or slower. A stand-in for the real switch (IMAGINED, says so).
 *  - Four readouts the crew called aloud: altitude, descent rate, forward speed, fuel.
 *  - Mission Control's real fuel calls, and the contact light.
 *
 * Every control is a native element, so mouse, touch, keyboard and the Hands cursor all work on it (C-D06).
 * Keyboard: W / S tilt, R / F descent rate. Gamepad: left stick, two face buttons.
 */
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/bus';
import { t } from '../content';
import type { ConsoleT, FactC } from '../content/schema';
import { act } from '../episode/setStore';
import { bindFlightKeys, controls } from '../input/controls';
import { Source, TagChip } from '../ui/parts';

type Readout = { agl: number; vx: number; vy: number; fuel: number; sink: number; thrust: number; flying: boolean };

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

  const tape = (label: string, value: string, unit: string, warn = false, note?: string) => (
    <div className={`tape${warn ? ' tape--warn' : ''}`}>
      <dt>{label}</dt>
      <dd>
        {value}
        <span className="tape__unit"> {unit}</span>
      </dd>
      {note && <dd className="tape__note">{note}</dd>}
    </div>
  );

  return (
    <div className="lmpanel" role="group" aria-label={def?.name ?? t('beat.operation')}>
      <div className="lmpanel__left">
        <div className="lmpanel__row">
          <span className="dsky">
            <span className="dsky__label">{t('flight.prog')}</span>
            <span className="dsky__digits">66</span>
          </span>
          <span className={`lamp${contact ? ' lamp--on' : ''}`} role="status">
            {t('flight.contact')}
          </span>
          {tag('dsky')}
        </div>
        <dl className="tapes" aria-live="off">
          {tape(t('flight.alt'), r ? Math.max(0, r.agl).toFixed(0) : '–', t('flight.m'))}
          {tape(t('flight.sink'), r ? Math.max(0, -r.vy).toFixed(1) : '–', t('flight.ms'), !!r && -r.vy > 3 && r.agl < 40, r ? `${t('flight.commanded')} ${Math.max(0, r.sink).toFixed(1)}` : undefined)}
          {tape(t('flight.speed'), r ? Math.abs(r.vx).toFixed(1) : '–', t('flight.ms'), !!r && Math.abs(r.vx) > 2 && r.agl < 12)}
          {tape(t('flight.fuel'), fuel.toFixed(0), t('flight.s'), fuel < 30)}
        </dl>
        <div className="lmpanel__call" aria-live="polite">
          {call && (
            <p className="call">
              <span className="line__who">{t('speaker.capcom')}</span> <TagChip tag="REAL" /> <strong>{t(call)}</strong> {facts.fuel && <Source fact={facts.fuel} />}
            </p>
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
            <span className="stick__end">{t('flight.stick.fwd')}</span>
            <span className="stick__knob" style={{ top: `${50 - pitch * 38}%` }} />
            <span className="stick__end">{t('flight.stick.back')}</span>
          </div>
        </div>
        <div className="control">
          <span className="control__label">
            {ctl['sink-rate']?.label ?? t('flight.rod')} {tag('sink-rate')}
          </span>
          <div className="rod">
            <button type="button" className="rod__btn" onClick={() => controls.click(-1)}>
              ▲ {t('flight.rod.slower')}
            </button>
            <button type="button" className="rod__btn" onClick={() => controls.click(1)}>
              ▼ {t('flight.rod.faster')}
            </button>
          </div>
        </div>
      </div>
      <p className="lmpanel__keys">{t('flight.keys')}</p>
    </div>
  );
}
