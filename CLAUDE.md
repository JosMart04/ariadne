# ARIADNE: Tears in the Rain

NASA Space Apps Challenge 2026 · Challenge "Abandoned but not Forgotten" · Universal Event.
A guided interactive documentary for the browser: the player follows ARIADNE through 16 machines
NASA left on the Moon, on Mars and beyond, **performs each machine's real operation in an explorable 3D scene,
on a console that copies the real controls**, and deduces that what "answers every midnight" is the Apollo 11 retroreflector.

**Deadline: Sunday Nov 15, 2026, 23:59 UTC−5. Internal target 22:30. Feature freeze 17:00. Text freeze 15:00.**
Live site: https://josmart04.github.io/ariadne/ · Requirements **v1.1** (Spanish, local only, git-ignored):
`para_fable/1_obligatorio/ARIADNE_ELICITACION.md`. If that folder is missing, ask the team for it.
Course correction of Sun 00:15: read the "Course correction v1.1" block in `docs/DECISIONS.md` first.

## Rules that are never broken

Contest (disqualifying):
- Everything in this repository and in the game is **English**. Talk to the team in Spanish, write files in English.
- No copyrighted material: no film quotes, no film music, no commercial songs. Epigraphs only from poems published before 1929.
- No NASA logo (meatball, worm, seal). Credit as "Data & imagery: NASA".
- No image, voice or likeness of anyone under 18. No cloned voices of real people.
- No AI-generated images of real machines or places. Generated voices are declared (README, credits, ID3 tag).
- No secrets in the repo or the bundle. `.env` is git-ignored; `npm run check` scans `dist/`.

Design pillars:
1. **Teach first.** When "fun" and "clear" conflict, clear wins.
2. **Every fact is real and sourced.** Every line is `REAL` (cites a fact with an https source) or `IMAGINED`. The build fails otherwise.
3. **A labyrinth, not a maze.** No puzzle can leave the player stuck. The reachability test proves it on every build.
4. **For every body, cutting nobody.** Three ways to play the same scenes: Explorer (direct control), Hands (webcam gestures),
   Accessible (point and choose, one button, head). Modes simplify **how** you act. They never remove a scene, 3D, sound or the ending.
5. **Cinema with restraint.** Scale, light, silence, slow motion. No decorative noise.
6. **Touch the engineering.** Explorable 3D sets, official NASA models, consoles that copy the real controls.

**The screenshot rule (AC-15).** If a screenshot of any beat of the Thread route could be mistaken for a form, a quiz
or a documentation page, that beat is not done. Run `npm run capture`, look at the PNGs, commit them in `docs/captures/<iteration>/`.

**Operational fidelity (FR-60 to FR-63).** Every machine is operated the way it really was:
- Apollo: direct control, in real time, on site.
- Robots on Mars: command sequences sent from Earth, minutes of delay, **no real-time joystick**.
- Deep space: commands through the Deep Space Network, hours of delay.
- **No human ever appears on Mars or in deep space.** Astronauts appear only on the Moon, as a labelled reconstruction.
- Every console control that is shown existed. Each is `REAL` with a source, or labelled `IMAGINED`.
- Anything simulated, reconstructed or not to scale carries its label on screen (`set.labels`).

Writing: second person, plain English (B1), sentences of 25 words or fewer, numbers at human scale.
Machines **rest, sleep, go silent**. Never "die", "dead", "killed".

## Commands

- `npm run dev` — dev server (recompiles content on change)
- `npm run content` — validate `content/*.yaml` and compile to `src/generated/content.json`
- `npm run check` — the full gate: content + `tsc` + tests + build + secret scan. **Run before every push.**
- `npm run capture -- <name> [reduce] [explorer|accessible]` — plays the route in the installed Chrome and saves one picture per beat in `docs/captures/<name>/`. Needs `npm run dev` running. Fails on any console error.

## Architecture in one screen

```
content/*.yaml --scripts/build-content.ts (zod)--> src/generated/content.json (git-ignored)
src/content/schema.ts   THE CONTRACT. Changes go in docs/DECISIONS.md.
src/engine/             store (settings + progress), hash router, fsm (puzzle graph logic), announce, input/scan
src/sim/                pure deterministic simulations, no DOM, no three: descent, ranging, ... + outcomes.ts
src/three/              SceneHost: renderer, fixed 60 Hz steps, pause when hidden, Auto quality, context-loss recovery,
                        reduced motion, seeded RNG, particles, GLB loading
src/scenes/<id>/        one 3D set per folder: { cues, create(host) -> setCue, update, hotspots, describe, dispose }
src/consoles/           faithful consoles in HTML/SVG with native buttons: Dsky, LmPanel, TelescopeConsole, ...
src/input/              Controls (axes + buttons) fed by keyboard, pointer/touch, gamepad and hands
src/hands/              MediaPipe Hand Landmarker (lazy), gesture classifier (pure), virtual cursor, calibration
src/audio/              AudioBus (voice, music, sfx, ambience), procedural sfx, voice by line id
src/episode/            CinemaEpisode (7 beats in a 3D set: captions + HUD), Set3D, setStore, PuzzleRunner (one FSM, three views),
                        RainOfLight, EpisodePlayer (text layout for episodes without a set), ScenePlayer (prologue, finale)
src/dev.ts              test hooks behind ?dev: __stage, __controls
src/screens/            Title, Setup, Map, Prologue, Finale, Credits
src/ui/parts.tsx        Line (REAL/IMAGINED), Source, Badge, ClewCard, Btn, glossary terms
tests/                  content gates, puzzle reachability, simulations, gestures
```

Built so far: everything above except `src/hands/`; one set (`src/scenes/tranquility/`) and one console (`LmPanel`).
**To build a new set, console or episode, follow the recipe in `docs/HANDOFF.md`, section 4, and copy E02.**
URL switches: `?q=low|medium|high` forces 3D quality, `?fps` shows the frame rate, `?dev` exposes the test hooks.

### One simulation, three ways to play

**Every puzzle is still a state machine declared in data.** It is the only logic. The three modes are views of it:

| Mode | How the player acts | What reaches the state machine |
|---|---|---|
| Explorer (default) | Flies, drives, turns knobs, presses console keys | The simulation's **outcome** picks the choice whose `when` matches |
| Hands | Same controls, by gesture: pinch = press, fist = joystick | Same as Explorer |
| Accessible | Picks one of at most 3 large targets shown **inside the same 3D scene** | The chosen choice; a scripted pilot then plays it |

No WebGL, or a lost context: the generic choice view plays the same graph as text. It is the fallback, never the default.

### Adding or completing an episode

Copy the shape of `content/episodes/e02-apollo11.yaml` (3D reference) or `e08-opportunity.yaml` (text reference). One file per machine.
Remove `draft: true` only when the episode has `objectives`, `arrival`, `operation`, `discovery`, `silence`, `statusNow`.
The seven beats: Passage, Arrival, The Operation, The Discovery, The Silence, Status Now, Field File.

**A beat is done when** it plays in Explorer, in Hands and in Accessible; has a reduced-motion version; has a text
equivalent (`describe`); passes the screenshot rule; and its capture is committed.

### Puzzle contract

```yaml
puzzle:
  archetype: [B, A]       # A Sequence, B Aim, C Route, D Budget, E Compare, F Wave, G Assemble, H Hypothesis, I Decode
  initial: first
  maxSteps: 8             # longest allowed shortest-path from any state to SOLVED
  hints: [where to look, the rule]
  states:
    first:
      say: Narration or feedback.          # at least one of say / prompt
      prompt: The question?
      stage: { kind: scene, cue: boulders } # what the 3D set shows in this state
      sim: descent                          # Explorer/Hands play this decision with this simulation
      choices:                              # 1 to 3, OR use `next` for a single Continue
        - { label: Right, to: SOLVED, when: landed-safe, target: beyond }
        - { label: Wrong, detail: optional, to: oops, when: crash-boulders, target: crater }
    oops: { wrong: true, say: "What would have happened in the real mission.", next: first }
```

`SOLVED` is implicit. `wrong: true` counts as an error for hints. `forced: true` shows
"This is what really happened." Use `fact: <key>` when `say` states something real.
`sim` + `when`: every outcome the simulation can produce must map to exactly one choice (build gate).
`target`: the hotspot of the scene that stands for the choice in Accessible.

### Text conventions

- `[[sol]]` links a glossary term from `content/glossary.yaml`.
- `who:` is `ariadne`, `machine` (shown as the machine's name), `note`, `record`, `narrator`, or any key `speaker.<id>` in `content/ui.yaml`.
- Facts: `text`, `source` (https, prefer *.nasa.gov), optional `note` (internal) and `verified` (initials of the HUMAN who checked it).
- Assets by stable id: `public/assets/vo/vo_<lineId>_en.mp3`, `public/assets/img/img_<episode>_<slot>.webp`,
  `public/assets/models/mdl_<name>.glb`. Every asset has a credit and a source in content.

## Who owns what (several AI sessions work in parallel; ownership is by folder)

These rules bind **every** agent, whatever its maker (Claude Fable, GPT Astra, or another). Lanes since Sun Nov 15, 14:50:

| Lane | Owns |
|---|---|
| **Fable · Thread and core** | Everything not listed below: `src/**`, `tests/`, `scripts/capture.ts`, `scripts/check-dist.ts`, `package.json`, config, `.github/`, `content/ui.yaml`, `content/voices.yaml`, `src/styles/`, the Thread content (`content/prologue.yaml`, `e02-apollo11.yaml`, `e08-opportunity.yaml`, `e16-voyager1.yaml`, `content/finale.yaml`), `CLAUDE.md`, `AGENTS.md` |
| **Fable · diorama** (only if a second Fable session is started; otherwise part of the lane above) | `src/scenes/diorama/`, the set context (`SetContext` in `src/three/host.ts`, `src/episode/Set3D.tsx`, the `Explainer` of `src/episode/CinemaEpisode.tsx`), `src/content/schema.ts`, `scripts/build-content.ts`, `scripts/prep-assets.ts`, the generic route of `scripts/capture.ts` |
| **Astra · content** | The 13 non-Thread files in `content/episodes/` (e01, e03 to e07, e09 to e15), `content/glossary.yaml`, `docs/submission/`, new rows of `assets-src/manifest.yaml` with their files in `public/assets/{img,models}/`, `scripts/check-links.ts`, `README.md` |

- **One owner per file.** Need a change in a file you do not own? Write it under "Requests" in `docs/HANDOFF.md`. Do not edit it.
- **Claim before you code.** Mark the task `[~] (Fable)`, `[~] (Fable-diorama)` or `[~] (Astra)` in `docs/TASKS.md` and push that line first.
  A claim is released only by its owner, in writing. Silence, or no commits for a while, releases nothing.
- **Do not touch what is finished** without a written reason: the sets `tranquility`, `telescope`, `dsn`, their simulations and
  consoles, and the text of the prologue, E02, E16 and the finale.
- Adding a dependency to `package.json`: Fable lane only; say so in `docs/HANDOFF.md`.

## Session protocol

Start: `git pull --rebase` → read this file and `docs/HANDOFF.md` → take the first open task of your lane in `docs/TASKS.md`.
End (always, even mid-task): `npm run check` → update **your section** of `docs/HANDOFF.md` and `docs/TASKS.md` → commit → `git pull --rebase` → push to `main`.
Each session works in **its own clone** of the repository (two sessions in one folder break each other's build and rebase),
and stages only the files of its lane (`git add <paths>`, never `git add -A`).
Commit small and often. CI deploys only when the gate passes.

Keep context small: do not read `src/generated/`, `node_modules/`, `dist/` or `para_fable/3_opcional/`.
Do not create new planning documents; the four files in `docs/` plus this one are the whole process.
