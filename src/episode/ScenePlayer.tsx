/** Plays a free-form scene (prologue, finale): a list of beats declared in content. */
import { useState } from 'react';
import { t } from '../content';
import type { BeatT, SceneC } from '../content/schema';
import { announce } from '../engine/announce';
import { useGame } from '../engine/store';
import { ClewCard, useFocusOn } from '../ui/parts';
import { BeatFrame, FactsBeat, LinesBeat } from './beats';
import { PuzzleRunner } from './PuzzleRunner';

export function ScenePlayer({ scene, onDone }: { scene: SceneC; onDone: () => void }) {
  const [i, setI] = useState(0);
  const awardClew = useGame((s) => s.awardClew);
  const beat = scene.beats[i];
  const next = () => (i + 1 < scene.beats.length ? setI(i + 1) : onDone());

  return (
    <section className="scene" aria-labelledby="scene-title">
      <header className="scene__head">
        <p className="eyebrow">Knossos Station</p>
        <h1 id="scene-title">{scene.title}</h1>
      </header>
      <BeatView key={i} beat={beat} scene={scene} onNext={next} onClew={(id, title) => (awardClew(id), announce(`${t('clew.new')}: ${title}`))} />
    </section>
  );
}

function BeatView({ beat, scene, onNext, onClew }: { beat: BeatT; scene: SceneC; onNext: () => void; onClew: (id: string, title: string) => void }) {
  const region = useFocusOn<HTMLDivElement>(beat);
  switch (beat.kind) {
    case 'lines':
      return <LinesBeat lines={beat.lines} facts={scene.facts} onDone={onNext} />;
    case 'puzzle':
      return (
        <div className="beat">
          {beat.title && <h2 className="beat__title">{beat.title}</h2>}
          <PuzzleRunner puzzle={beat.puzzle} facts={scene.facts} onSolved={onNext} />
        </div>
      );
    case 'facts':
      return <FactsBeat title={beat.title} keys={beat.facts} facts={scene.facts} onDone={onNext} />;
    case 'clew':
      return (
        <BeatFrame
          onNext={() => {
            onClew(beat.clew.id, beat.clew.title);
            onNext();
          }}
        >
          <div ref={region} tabIndex={-1}>
            <ClewCard clew={beat.clew} />
          </div>
        </BeatFrame>
      );
    case 'special':
      // Set pieces (pulse, daisy-bell, postcard, voyager-coda) get their own components in later
      // iterations. Their text description is always shown, so the scene is complete without them (AX-32).
      return (
        <BeatFrame onNext={onNext}>
          <div className={`special special--${beat.name}`} ref={region} tabIndex={-1}>
            {beat.name === 'pulse' && (
              <div className="pulse" aria-hidden="true">
                <span className="pulse__dot" />
                <span className="pulse__dot pulse__dot--echo" />
              </div>
            )}
            <p className="special__text">{beat.text ?? t('special.pending')}</p>
          </div>
        </BeatFrame>
      );
  }
}
