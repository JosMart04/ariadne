/** Beat building blocks shared by episodes and free-form scenes (prologue, finale). */
import { useState, type ReactNode } from 'react';
import { t } from '../content';
import type { FactC, LineT } from '../content/schema';
import { Btn, FactView, LineView, useFocusOn } from '../ui/parts';

/** A beat body + its single way forward. Keeps every beat ending in a clear closing action (Shneiderman). */
export function BeatFrame({ children, onNext, nextLabel, extra }: { children: ReactNode; onNext?: () => void; nextLabel?: string; extra?: ReactNode }) {
  return (
    <>
      <div className="beat__body">{children}</div>
      {(onNext || extra) && (
        <div className="actions">
          {onNext && <Btn onClick={onNext}>{nextLabel ?? t('common.continue')}</Btn>}
          {extra}
        </div>
      )}
    </>
  );
}

/**
 * Lines appear one at a time (Mayer's segmenting). Each Continue reveals the next line;
 * earlier lines stay on screen so nothing has to be remembered.
 */
export function LinesBeat({
  lines,
  facts,
  machineName,
  onDone,
  doneLabel,
}: {
  lines: LineT[];
  facts: Record<string, FactC>;
  machineName?: string;
  onDone: () => void;
  doneLabel?: string;
}) {
  const [shown, setShown] = useState(1);
  // Focus enters the beat once. After that it stays on Continue, so one key press reveals each line;
  // new lines are announced through the live region.
  const region = useFocusOn<HTMLDivElement>(lines);
  const last = shown >= lines.length;
  return (
    <BeatFrame onNext={() => (last ? onDone() : setShown(shown + 1))} nextLabel={last ? doneLabel : undefined}>
      <div className="lines" aria-live="polite" ref={region} tabIndex={-1}>
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className={i === shown - 1 ? 'lines__current' : 'lines__past'}>
            <LineView line={l} facts={facts} machineName={machineName} />
          </div>
        ))}
      </div>
    </BeatFrame>
  );
}

/** A panel of REAL facts with their sources, used for revelations. */
export function FactsBeat({ title, keys, facts, onDone }: { title?: string; keys: string[]; facts: Record<string, FactC>; onDone: () => void }) {
  const region = useFocusOn<HTMLDivElement>(title);
  return (
    <BeatFrame onNext={onDone}>
      <div className="card" ref={region} tabIndex={-1}>
        {title && <h3 className="card__title">{title}</h3>}
        {keys.map((k) => facts[k] && <FactView key={k} fact={facts[k]} />)}
      </div>
    </BeatFrame>
  );
}
