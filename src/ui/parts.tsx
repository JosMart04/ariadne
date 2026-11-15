/**
 * Shared interface parts. Everything interactive is a real <button> or <a>,
 * so mouse, touch, keyboard, one-button scanning and head pointing all work
 * on the same elements with no per-screen code (pillar 4, AX-10).
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { content, t } from '../content';
import type { BadgeId, ClewT, EpigraphT, FactC, LineT } from '../content/schema';

/** Moves keyboard and screen-reader focus to a region whenever `dep` changes. */
export function useFocusOn<T extends HTMLElement>(dep: unknown): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: false });
  }, [dep]);
  return ref;
}

/** Text with inline glossary terms written as [[term]] (CR-08). */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        return <Term key={i} term={m[1].trim().toLowerCase()} label={(m[2] ?? m[1]).trim()} />;
      })}
    </>
  );
}

function Term({ term, label }: { term: string; label: string }) {
  const [open, setOpen] = useState(false);
  const def = content.glossary[term]?.def;
  if (!def) return <>{label}</>;
  return (
    <>
      <button type="button" className="term" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open && (
        <span className="term__def" role="note">
          {' '}
          ({def})
        </span>
      )}
    </>
  );
}

/** "Source" control for a REAL fact. Opens the source in a new tab and says so (CR-03). */
export function Source({ fact }: { fact: FactC }) {
  const opens = t('source.opens', { host: fact.host });
  return (
    <a className="source" href={fact.source} target="_blank" rel="noopener noreferrer" title={opens}>
      <span aria-hidden="true">↗ </span>
      {t('source.button')}
      <span className="source__host"> · {fact.host}</span>
      {!fact.official && <span className="source__secondary"> ({t('source.secondary')})</span>}
      <span className="sr-only">. {opens}</span>
    </a>
  );
}

/** REAL / IMAGINED marker: icon + label, never colour alone (CR-06). */
export function TagChip({ tag }: { tag: 'REAL' | 'IMAGINED' }) {
  return (
    <span className={`chip chip--${tag.toLowerCase()}`} title={t(`tag.${tag}.help`)}>
      <span aria-hidden="true">{tag === 'REAL' ? '◆' : '❝'}</span> {t(`tag.${tag}`)}
    </span>
  );
}

export function speakerName(who: string, machineName?: string): string {
  if (who === 'machine' && machineName) return machineName;
  const key = `speaker.${who}`;
  return content.ui[key] ?? who;
}

export function LineView({ line, facts, machineName }: { line: LineT; facts: Record<string, FactC>; machineName?: string }) {
  const fact = line.fact ? facts[line.fact] : undefined;
  return (
    <div className={`line line--${line.tag.toLowerCase()}`}>
      <div className="line__head">
        <span className="line__who">{speakerName(line.who, machineName)}</span>
        <TagChip tag={line.tag} />
      </div>
      <p className="line__text">
        <Rich text={line.text} />
      </p>
      {fact && <Source fact={fact} />}
    </div>
  );
}

/** A REAL statement that is not spoken by anyone: a datum on an archive card. */
export function FactView({ text, fact }: { text?: string; fact: FactC }) {
  return (
    <div className="line line--real">
      <div className="line__head">
        <TagChip tag="REAL" />
      </div>
      <p className="line__text">
        <Rich text={text ?? fact.text} />
      </p>
      <Source fact={fact} />
    </div>
  );
}

export function EpigraphView({ e }: { e: EpigraphT }) {
  return (
    <figure className="epigraph">
      <blockquote>
        {e.text.split('\n').map((l, i) => (
          <span key={i} className="epigraph__line">
            {l}
          </span>
        ))}
      </blockquote>
      <figcaption>
        {e.author}, <cite>{e.work}</cite>, {e.year}
      </figcaption>
    </figure>
  );
}

const BADGE_ICON: Record<BadgeId, string> = {
  active: '●',
  'active-passive': '◐',
  'silent-intact': '○',
  'silent-stuck': '⊘',
  'silent-damaged': '◇',
  'silent-buried': '▒',
  grounded: '▽',
  parked: '▣',
  orbiting: '◎',
  resting: '▁',
  drifting: '➝',
};

/** Status badge with icon + text (CR-01). */
export function Badge({ id, help = false }: { id: BadgeId; help?: boolean }) {
  return (
    <span className={`badge badge--${id}`}>
      <span aria-hidden="true">{BADGE_ICON[id]}</span> {t(`badge.${id}`)}
      {help && <span className="badge__help"> · {t(`badge.${id}.help`)}</span>}
    </span>
  );
}

export function ClewCard({ clew }: { clew: ClewT }) {
  return (
    <div className="clew">
      <p className="eyebrow">{t('clew.new')}</p>
      <h3 className="clew__title">{clew.title}</h3>
      <p className="clew__line">
        <Rich text={clew.line} />
      </p>
      <dl>
        <dt>{t('clew.teaches')}</dt>
        <dd>{clew.teaches}</dd>
        <dt>{t('clew.rulesOut')}</dt>
        <dd>{clew.rulesOut}</dd>
      </dl>
    </div>
  );
}

/** Primary action button. `scan="primary"` targets are visited first by one-button scanning. */
export function Btn({
  children,
  onClick,
  kind = 'primary',
  disabled,
  autoFocus,
}: {
  children: ReactNode;
  onClick: () => void;
  kind?: 'primary' | 'ghost';
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button type="button" className={`btn btn--${kind}`} onClick={onClick} disabled={disabled} autoFocus={autoFocus} data-scan={kind}>
      {children}
    </button>
  );
}
