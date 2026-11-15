/**
 * Stage: the visual half of a puzzle state. A small set of data-driven primitives
 * covers the nine puzzle archetypes (see CLAUDE.md, "Stage primitives").
 * A state with no stage, or with a kind that is not built yet, still plays: the
 * prompt and its choices are the complete text equivalent (AX-31).
 */
import type { StageT } from '../content/schema';

type Gauge = { kind: 'gauge'; label: string; value: number; unit?: string };

export function Stage({ stage }: { stage?: StageT }) {
  if (!stage) return null;
  if (stage.kind === 'gauge') return <GaugeView {...(stage as unknown as Gauge)} />;
  return null;
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
