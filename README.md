# ARIADNE: Tears in the Rain

> Tonight is the last night of an old listening station. Its archive mind, ARIADNE, has until dawn to weave the
> last memories of every machine humanity left on the Moon, on Mars and beyond into a single thread, before they
> are lost like tears in the rain. Every puzzle is real engineering. Every fact is real and sourced.

**Play it:** https://josmart04.github.io/ariadne/

A guided interactive documentary for the browser, made for the **NASA Space Apps Challenge 2026**,
challenge *"Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars"*.

## What you do

You are the last Operator of Knossos Station. Every night at midnight the station sends a pulse of light, and
2.5 seconds later something answers. Nobody ever found out what. To solve it, you restore the memories of the
machines NASA left behind. In each one you:

1. watch it arrive;
2. **perform its real operation** as a short puzzle (plan Opportunity's power, land the Eagle, repair Voyager 1);
3. discover what we learned because of it;
4. live its final silence, and catch its last message;
5. see where it is today.

Each restored memory adds to a golden thread that runs through a labyrinth, in the order the machines were launched.
Three of them give you the clews to deduce who answers at midnight.

## Principles

- **The voices are imagined. Every fact is real.** Every line is tagged `REAL` (with a link to its source) or
  `IMAGINED`. The build fails if a real statement has no source.
- **A labyrinth, not a maze.** No puzzle can leave you stuck. An automated test walks every puzzle graph on every build.
- **For every body.** One mechanic, point and choose: mouse, touch, keyboard or a single button. No dragging, no typing,
  no reflexes, no time limits. Captions, text scaling, reduced motion and high contrast are built in.
- **No accounts, no tracking, no cookies.** Progress is saved only on your device.

## Run it locally

```bash
npm install
npm run dev
```

`npm run check` runs the full gate: content validation, type check, tests, build and a scan that proves no secret
reached the bundle.

Content lives in `content/*.yaml`, separate from code. See `CLAUDE.md` for the architecture and the content contract.

## Use of AI (declared)

The NASA Space Apps rules call AI "SI" and ask teams to declare it:

- **Code:** written with AI assistance (Claude) and reviewed by the team. Commits carry a `Co-Authored-By` trailer.
- **Research and text:** AI helped organise NASA sources and produce first drafts. The team reviews the text and
  verifies every fact against its source.
- **Voices:** any machine or narrator voice is AI-generated speech from a stock voice (no cloned voices, no minors).
  Files are labelled as AI-generated in their metadata and in the credits.
- **Images:** no AI-generated images. Photos are NASA originals with their credit lines.

The concept, the puzzle design decisions and the final choice of facts belong to the team.

## Credits

Data & imagery: NASA. NASA does not endorse this project, and no NASA logo is used.
Fonts (SIL Open Font License): Cinzel, Atkinson Hyperlegible, IBM Plex Mono.
Poetry epigraphs are in the public domain. The title alludes to a famous line of cinema; no material from that work is used.

Code is released under the MIT License (see `LICENSE`).
