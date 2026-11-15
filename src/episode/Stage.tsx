/**
 * Stage: the visual half of a puzzle state. A small set of data-driven primitives
 * covers the nine puzzle archetypes (see CLAUDE.md, "Stage primitives").
 * A state with no stage, or with a kind that is not built yet, still plays: the
 * prompt and its choices are the complete text equivalent (AX-31).
 *
 * In a 3D set (`kind: scene`) the picture is the set itself. A state may still carry numbers to read over it:
 * `label` + `value` (0 to 100) is a meter, e.g. the rover's energy; `tau: true` adds the dust in the sky, read live
 * from the set. They are readouts, never controls.
 */
import { useEffect, useState } from 'react';
import { t } from '../content';
import type { StageT } from '../content/schema';
import { act } from './setStore';

type Gauge = { kind: 'gauge'; label: string; value: number; unit?: string };
type SceneReadout = { kind: 'scene'; label?: string; value?: number; unit?: string; note?: string; tau?: boolean };

export function Stage({ stage }: { stage?: StageT }) {
  if (!stage) return null;
  if (stage.kind === 'gauge') return <GaugeView {...(stage as unknown as Gauge)} />;
  if (stage.kind === 'scene' && typeof (stage as SceneReadout).value === 'number') return <SceneReadouts {...(stage as unknown as SceneReadout)} />;
  return null;
}

/** Numbers over the 3D scene, in the same style as the consoles. */
function SceneReadouts({ label = '', value = 0, unit = '', note, tau }: SceneReadout) {
  const v = Math.max(0, Math.min(100, value));
  const [dust, setDust] = useState<number | null>(null);
  useEffect(() => {
    if (!tau) return;
    const read = () => setDust(act<{ tau?: number }>('state')?.tau ?? null);
    read();
    const id = setInterval(read, 120);
    return () => clearInterval(id);
  }, [tau]);
  return (
    <dl className="tapes tapes--stage">
      <div className={`tape${v <= 10 ? ' tape--warn' : v >= 60 ? ' tape--ok' : ' tape--wait'}`}>
        <dt>{label}</dt>
        <dd>
          <span className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
            <span className="meter__fill" style={{ width: `${v}%` }} />
          </span>
        </dd>
        <dd className="tape__limit">
          {value}
          {unit}
          {note ? ` · ${note}` : ''}
        </dd>
      </div>
      {tau && dust !== null && (
        <div className="tape tape--warn">
          <dt>{t('stage.tau')}</dt>
          <dd aria-live="off">{dust.toFixed(1)}</dd>
          <dd className="tape__limit">{t('stage.tau.normal')}</dd>
        </div>
      )}
    </dl>
  );
}

function GaugeView({ label, value, unit = '' }: Gauge) {
  const v = Math.max(0, Math.min(100, value));
  const level = v <= 10 ? 'empty' : v <= 35 ? 'low' : 'ok';
  return (
    <div className={`gauge gauge--${level}`}>
      <div className="gauge__label">
        <span>{label}</span>
        <span className="gauge__value">
          {value}
          {unit}
        </span>
      </div>
      <div className="gauge__track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
        <div className="gauge__fill" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
