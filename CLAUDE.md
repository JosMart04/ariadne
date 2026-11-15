# ARIADNE: Tears in the Rain

NASA Space Apps Challenge 2026 · Challenge "Abandoned but not Forgotten" · Universal Event.
A guided interactive documentary for the browser: the player follows ARIADNE through 16 machines
NASA left on the Moon, on Mars and beyond, **performs each machine's real operation** as a short
puzzle, and deduces that what "answers every midnight" is the Apollo 11 retroreflector.

**Deadline: Sunday Nov 15, 2026, 23:59 UTC−5. Internal target 22:30. Feature freeze 17:00.**
Live site: https://josmart04.github.io/ariadne/ · Requirements (Spanish, local only, git-ignored):
`para_fable/1_obligatorio/ARIADNE_ELICITACION.md`. If that folder is missing, ask the team for it.

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
4. **For every body.** One mechanic: point and choose. No dragging, typing, reflexes or real time limits. Max 3 options.
5. **Cinema with restraint.** Scale, light, silence, slow motion. No decorative noise.

Writing: second person, plain English (B1), sentences of 25 words or fewer, numbers at human scale.
Machines **rest, sleep, go silent**. Never "die", "dead", "killed".

## Commands

- `npm run dev` — dev server (recompiles content on change)
- `npm run content` — validate `content/*.yaml` and compile to `src/generated/content.json`
- `npm run check` — the full gate: content + `tsc` + tests + build + secret scan. **Run before every push.**

## Architecture in one screen

```
content/*.yaml --scripts/build-content.ts (zod)--> src/generated/content.json (git-ignored)
src/content/schema.ts   THE CONTRACT. Frozen. Owner: Front A. Changes go in docs/DECISIONS.md.
src/engine/             store (settings + progress, localStorage), hash router, fsm (puzzle graph logic), announce
src/episode/            EpisodePlayer (the 7-beat template), ScenePlayer (prologue/finale), PuzzleRunner, Stage
src/screens/            Title, Setup, Map, Prologue, Finale, Credits
src/ui/parts.tsx        Line (REAL/IMAGINED), Source, Badge, ClewCard, Btn, glossary terms
tests/                  content gates + puzzle reachability
```

Principle: **everything interactive is a real `<button>` or `<a>`, and every puzzle is a graph declared in data.**
Keyboard, screen readers, one-button scanning and head pointing all operate on the DOM, with no per-screen code.

### Adding or completing an episode (no code needed)

Copy the shape of `content/episodes/e08-opportunity.yaml` (the reference). One file per machine.
Remove `draft: true` only when the episode has `objectives`, `arrival`, `operation`, `discovery`, `silence`, `statusNow`.
The seven beats: Passage, Arrival, The Operation, The Discovery, The Silence, Status Now, Field File.

The Operation has three layers; each one ships on its own:
1. `operation.explainer`: the real operation in 3 to 5 steps (required).
2. `operation.puzzle`: an FSM. It plays immediately in the generic choice view.
3. `stage` on puzzle states: the visual skin (see below).

### Puzzle contract

```yaml
puzzle:
  archetype: [D]          # A Sequence, B Aim, C Route, D Budget, E Compare, F Wave, G Assemble, H Hypothesis, I Decode
  initial: first
  maxSteps: 8             # longest allowed shortest-path from any state to SOLVED
  hints: [where to look, the rule]
  states:
    first:
      say: Narration or feedback.          # at least one of say / prompt
      prompt: The question?
      choices:                              # 1 to 3, OR use `next` for a single Continue
        - { label: Right, to: SOLVED }
        - { label: Wrong, detail: optional, to: oops }
    oops: { wrong: true, say: "What would have happened in the real mission.", next: first }
```

`SOLVED` is implicit. `wrong: true` counts as an error for hints. `forced: true` shows
"This is what really happened." Use `fact: <key>` when `say` states something real.

### Stage primitives (`stage: { kind: ... }` on a puzzle state)

| kind | props | status |
|---|---|---|
| `gauge` | `label`, `value` (0–100), `unit?` | built |
| `figure` | `image` (key in `images`), `caption?` | iteration 2 |
| `hotspots` | `image`, `spots: [{x, y}]` in %, one per choice, same order | iteration 2 |
| `cards` | (none: choices render as cards) | iteration 2 |
| `trace` | `series: [{label, points: [numbers]}]`, one per choice | iteration 2 |
| `grid` | `cols`, `rows`, `cells` (rows of characters), `at: [x, y]` | iteration 4 |
| `sequence` | `steps: [text]`, `done` (count) | iteration 4 |

A state whose `kind` is not built yet still plays: the prompt and choices are the full text equivalent.

### Text conventions

- `[[sol]]` links a glossary term from `content/glossary.yaml`.
- `who:` is `ariadne`, `machine` (shown as the machine's name), `note`, `record`, `narrator`, or any key `speaker.<id>` in `content/ui.yaml`.
- Facts: `text`, `source` (https, prefer *.nasa.gov), optional `note` (internal) and `verified` (initials of the HUMAN who checked it).
- Assets by stable id: `public/assets/vo/vo_<lineId>_en.mp3`, `public/assets/img/img_<episode>_<slot>.webp`.

## Who owns what (two Claude sessions work in parallel)

| Front | Owns | Never edits |
|---|---|---|
| **A · Engine** | `src/**` (except `src/extras/`), `tests/`, `scripts/build-content.ts`, `scripts/check-dist.ts`, `.github/`, config files, `content/ui.yaml` keys | episode text |
| **B · Content and pipelines** | `content/**` (values), `assets-src/`, `public/assets/`, other `scripts/`, `docs/submission/`, `src/extras/` | `src/content/schema.ts`, engine code |

Need something from the other front? Write it under your section in `docs/HANDOFF.md`. Do not edit their files.

## Session protocol

Start: `git pull --rebase` → read this file and `docs/HANDOFF.md` → take the first open task of your front in `docs/TASKS.md`.
End (always, even mid-task): `npm run check` → update **your section** of `docs/HANDOFF.md` and `docs/TASKS.md` → commit → `git pull --rebase` → push to `main`.
Commit small and often. CI deploys only when the gate passes.

Keep context small: do not read `src/generated/`, `node_modules/`, `dist/` or `para_fable/3_opcional/`.
Do not create new planning documents; the four files in `docs/` plus this one are the whole process.
