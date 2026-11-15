# Handoff: live project state

Sections 1 to 8 were written Sun Nov 15, 10:05 UTC−5 by account B. **Section 0 is newer and wins where they differ.**
Everything needed to go on is in this file, `CLAUDE.md`, `docs/TASKS.md` and `docs/DECISIONS.md`. Keep this file current:
done / in progress / next steps / traps.

**Deadlines (UTC−5): feature freeze 17:00 · final submission 22:30.** The 13:00 cut rule, the 14:00 first submission and
the 15:00 text freeze passed while no session was running (see section 0).

## 0. Three lanes at once (written Sun Nov 15, 16:30 by Fable on machine A; it wins over everything below)

**State:** the Thread is whole, in 3D, in both modes, with voices, and it passes from a clean start. E08, the diorama
contract (two files on stage), the explainer as captions, the lifecycle fixes and the generated credits are pushed and deployed.
**What is still missing for "most of the game":** the map is a card list that looks like a website; 11 files are off stage
and all 13 are drafts; the finale has no Voyager coda and no postcard; nobody has run an accessibility pass.

**Clock (UTC−5), proposed and in use unless the team says otherwise:** new work and new text stop at **20:00** ·
20:00 to 21:15 voices for the final text, integration, the full regression · final build 21:15 · the team submits by **22:30**.
(The old 17:00 feature freeze cannot hold if the three lanes below are to land.)

| Lane | Machine | Builds | Owns (the full list is `lanes.json`) |
|---|---|---|---|
| **a** | A · Claude Fable | Integration of the other two lanes · the ending of the Thread (Voyager coda, postcard) · accessibility pass · voices · final regression | everything that is not listed for b or astra: `src/` (engine, episode, consoles, sims, the five sets), `tests/`, `scripts/`, `content/ui.yaml`, the Thread content, `public/assets/vo/`, `package.json`, `CLAUDE.md` |
| **b** | B · Claude Fable | The Orrery as the map, with today's real positions · the title screen on the same set · the card list as list view | `src/scenes/orrery/`, `src/sim/planets.ts`, `tests/sim/planets.test.ts`, `src/screens/`, `content/ui/shell.yaml`, `scripts/capture-shell.ts`, `docs/captures/b*` |
| **astra** | Astra | The 13 files: facts, text, model or photograph on stage, out of draft · the submission texts · the link check | the 13 files in `content/episodes/`, `content/glossary.yaml`, `docs/submission/`, `assets-src/manifest.yaml`, `public/assets/{img,models}/`, `CREDITS.md`, `README.md`, `scripts/check-links.ts`, `docs/captures/x*` |

**Why these three cannot collide** (each line closes a place where they would have):
- **Paths:** every path has exactly one lane. `npm run lane -- <a|b|astra>` fails before the push if a commit holds a file of another lane.
- **Interface strings:** lane b writes its strings in `content/ui/shell.yaml`, never in `content/ui.yaml`. A key defined twice fails the build.
- **Styles:** a lane adds its own `.css` file next to its component and imports it there. Nobody appends to `app.css` or `cinema.css` except lane a.
- **Captures:** lane b's routes live in `scripts/capture-shell.ts` (`npm run capture -- b1 title map`). A file on the diorama needs no route (`npm run capture -- x1 e07`). Nobody but lane a edits `scripts/capture.ts`.
- **Dependencies:** nobody adds one. Planet positions come from JPL's approximate elements (the table is in `src/sim/meridiani.ts`; lane b copies it into `src/sim/planets.ts` and does not edit the original).
- **Generated files:** `CREDITS.md` changes only when the manifest or the voice cast changes, so only lane astra ever commits it. `src/generated/` is not in git.
- **Voices:** only lane a makes voice files, once, after 20:00, when the text is final.
- **Shared documents:** in `docs/TASKS.md`, `docs/HANDOFF.md` and `docs/DECISIONS.md` each lane writes only under its own heading. A rebase conflict there is solved by keeping both sides.
- **Contracts frozen for this phase:** `src/content/schema.ts`, the `SetController` and `SetContext` types, the `act` contract and the button texts the Thread check presses ("Begin", "Start", "Follow the thread", "The Center of the Labyrinth", "Back to the labyrinth", `input[name="play"]`). A lane that needs one changed writes a request; lane a answers within 15 minutes.
- **Deploy:** every push to `main` deploys if the gate passes; a newer push cancels an older deploy. A red gate never reaches the site.

**The loop of every lane, for every step:** `git pull --rebase` → work → `npm run check` → `npm run capture -- <your prefix><n> <scene>` and look
at the pictures → `git add <your paths>` (never `-A`) → commit → `git pull --rebase` → `npm run lane -- <lane>` → `git push`. One small
step per commit. Claim a task in your section of `docs/TASKS.md` and push the claim before you start it.

**Not proven yet, and who proves it:** a file that has left draft has never played its Discovery and Silence beats on the
diorama. Lane astra finishes E11 first; lane a captures it at once and fixes the engine before the other twelve follow.
Lane astra may not be able to run captures (they need Chrome or Edge on the machine): if so it says so in "Requests" and lane a captures every file it pushes.

### Start prompt · machine A (this session or a new one)

> You are **lane a** of ARIADNE (https://github.com/JosMart04/ariadne): integration and the ending of the Thread. Two other AI
> sessions work at the same time (lane b: Orrery and shell screens; lane astra: the 13 files). Read `CLAUDE.md`, `docs/HANDOFF.md`
> section 0 and "Lane a" in `docs/TASKS.md`. Your duties, in this order: (1) at every commit read "Requests" in
> `docs/HANDOFF.md` and answer within 15 minutes; when lane astra pushes a file, run `npm run capture -- a<n> e<NN>`, look at
> the pictures and fix the engine or write back; (2) A-31 the Voyager coda of the finale, with copy that is right before, on
> and after Nov. 18, 2026 and a `?date=` override; (3) A-32 the postcard; (4) A-33 the accessibility pass on the Thread;
> (5) at 20:00 the voices for the final text, then `npm run capture -- final thread` and `... lifecycle` and the whole capture
> set. You are the only lane that may edit the shared engine, `scripts/capture.ts`, `content/ui.yaml` and `package.json`.
> Before every push: `npm run check`, `git pull --rebase`, `npm run lane -- a`. Report in Spanish.

### Start prompt · machine B (Claude Fable)

> You are **lane b** of ARIADNE (https://github.com/JosMart04/ariadne), NASA Space Apps 2026. Two other AI sessions work at
> the same time; you never edit their files. Set up: `git pull --rebase`, `npm ci`, `npm run check` (must be green),
> `npm run dev`. Read `AGENTS.md`, `CLAUDE.md`, `docs/HANDOFF.md` section 0 (all of it) and "Lane b" in `docs/TASKS.md`.
> **Your job: the map is still a list of cards and looks like a website. Make it the Orrery.** In order:
> B-40 `src/sim/planets.ts` + `tests/sim/planets.test.ts`: where the eight planets are on a given date, from JPL's
> approximate elements (copy the table and the solver from `src/sim/meridiani.ts`; do not edit that file; no new dependency).
> B-41 `src/scenes/orrery/` (copy the shape of `src/scenes/diorama/index.ts`): the Sun, the planets at today's real
> positions, their orbits, and the 16 machines marked where they are; drag and zoom; reduced motion; a written description
> of every cue; on-screen labels for whatever is not to scale or only approximate.
> B-42 the map screen in `src/screens/`: the Orrery is the map, every machine is a real `<button>` anchored in the scene
> (`Anchor` in `src/episode/Set3D.tsx`) that opens its file, the golden thread joins them in launch order, and today's
> card list stays as the list view for Accessible play and for devices without WebGL.
> B-43 the title screen on the same set. B-44, only if all of that is pushed: the Passage of an episode as a travel shot.
> Hard limits: your strings go in `content/ui/shell.yaml`, your styles in a `.css` file next to your component, your capture
> routes in `scripts/capture-shell.ts`. Do not rename or remove the buttons "Begin", "Start", "Follow the thread",
> "The Center of the Labyrinth": `npm run capture -- b<n> thread` must pass before every push. Everything in the
> repository is English; every number you show is computed or sourced; nothing looks like a form or a web page (AC-15).
> Before every push: `npm run check`, `git pull --rebase`, `npm run lane -- b`. Claim each task in `docs/TASKS.md` first.
> Need a change in a file that is not yours? Write it under "Requests" in `docs/HANDOFF.md` and go on. Report in Spanish.

### Start prompt · Astra

> You are **lane astra** of ARIADNE (https://github.com/JosMart04/ariadne), a browser game for NASA Space Apps 2026 about the
> machines NASA left on the Moon, on Mars and beyond. Two other AI sessions build the 3D engine at the same time; you never
> edit their files. Clone the repository into your own folder, then `npm ci` and `npm run check` (must be green). Read
> `AGENTS.md`, `CLAUDE.md`, `docs/HANDOFF.md` section 0 (all of it, including "Putting a file on stage") and "Lane astra" in
> `docs/TASKS.md`. **Your job: the 13 machines that are still drafts.** First X-01, the submission texts in
> `docs/submission/` (30 minutes at most). Then one file at a time, in this order: E11, E07, E05, E12, E14, E15, E13, E10,
> E01, E09, E06, E03, E04. For each file: (1) open every source and write the sentence you checked in `note:`; a claim
> with no source is narrowed to what the source says or removed, never relabelled IMAGINED; never fill `verified:`;
> (2) write the seven beats in the shape of `content/episodes/e16-voyager1.yaml` without `console`, `cues` and `puzzle`:
> `objectives` (3), `arrival`, `operation.explainer` (3 to 5 steps of how it really worked, each with a `fact`),
> `discovery` (headline and story), `silence` (`before`, `last`), `statusNow`, an epigraph only from a poem published
> before 1929; (3) put it on stage with the recipe of section 0 (official NASA model, or one NASA photograph);
> (4) remove `draft: true`; (5) `npm run check`, then `npm run capture -- x<n> e<NN>` and look at the pictures; if your
> machine cannot run captures, say so under "Requests" in `docs/HANDOFF.md` and go on; (6) commit that one file with its
> asset, manifest row, `CREDITS.md` and captures. Rules that disqualify the project if broken: English only; no NASA logo;
> no copyrighted text, quote or music; no human on Mars or in deep space; machines "rest, sleep, go silent", never "die".
> Plain English, second person, sentences of 25 words or fewer. You never touch `src/`, `tests/`, `content/ui.yaml`, the
> Thread files (prologue, e02, e08, e16, finale) or voices. Stop writing new text at 20:00. Before every push:
> `npm run check`, `git pull --rebase`, `npm run lane -- astra`. Finish E11 first and push it: lane a checks it before
> you are deep into the others. Report to the team in Spanish.


**Putting a file on stage (ready since Sun 15:55; this is task X-05 and needs no engine change):**

The set `diorama` (`src/scenes/diorama/`) shows whatever the file hands it: an official NASA model on a stand, or a real
NASA photograph as an archive plate. Two files prove it: `e11-ingenuity.yaml` (model) and `e01-surveyor.yaml` (image).
1. Add a row to `assets-src/manifest.yaml`, under `models:` (`mdl_<name>.glb`) or `images:` (`img_<episode>_<slot>.webp`),
   with `title`, `credit`, `license`, `page`, `url` and `raw`. Copy the rows of `mdl_ingenuity.glb` or `img_e01_surveyor1_shadow.webp`.
2. `npx tsx scripts/prep-assets.ts --fetch` downloads it (NASA hosts only) and writes the file the game serves in `public/assets/`.
3. In the episode file add `models:` or `images:` and
   `set: { scene: diorama, model: <key>, alt: "<one sentence that describes it>", labels: [artistic-view] }`
   (for a photograph: `image: <key>`; its own `alt` is used). Options: `size` 0.5 to 1.4, `yaw` in degrees, `float: true` for a spacecraft.
4. `npm run check` (the compiler fails if the file is not on disk or the description is missing), then
   `npm run capture -- <name> e11` plays the file and saves one picture per beat. Look at them. Commit YAML, manifest row, asset and captures.

Official models in https://github.com/nasa/NASA-3D-Resources (folder `3D Models`): `Viking Lander`, `Pioneer 10`,
`NEAR Shoemaker`, `Kepler (A)`, `Dawn`, `InSight Cruise Lander`. Spirit is the twin of Opportunity: `mdl_mer_b.glb` is already
served; say "twin" in its `alt`. The others (ALSEP, the lunar rovers, Sojourner, Phoenix) need a NASA photograph.
A draft file with a set already plays as passage, arrival, status and Field File, with its facts and sources.

**The contract of a set** (what any new set must honour; `src/scenes/meridiani/index.ts` is the reference):

| Part | Rule |
|---|---|
| Creation | `create(host, context)`. `context` (`SetContext` in `src/three/host.ts`) carries the file's id, name, hero model or image, `alt` and `options`. A set with a place of its own may ignore it. |
| Cues | Every cue is declared in `cues.json` with its written description. The compiler rejects a cue or hotspot that content names and the set does not declare. |
| Orders | `act('fly', { outcome })` scripted run · `act('fly', { player: true, retry })` the player operates · `act('skip')` · `act('slew' \| 'fire' \| 'zoom', …)` console keys · `act('reset')` · `act('state')` readouts. |
| Outcomes | `fly` resolves to `{ outcome }`, one of the names in `src/sim/outcomes.ts`. A slip that is not an outcome resolves to `{ outcome: null, miss }`. The outcome is decided by the simulation, never by the animation: skipping changes nothing. |
| Cancellation | A set resolves every pending `fly` with `{ outcome: null, cancelled: true }` on `reset` and `dispose`. `PuzzleRunner` also closes the wait when the stage stops being ready. A cancelled operation of the player returns to the decision, counts no error and never moves the state machine; a cancelled scripted run keeps the choice the player made. |
| Taking down | `dispose()` removes listeners and takes the set's root out of the scene. `SceneHost.dispose()` frees geometries, materials and textures before that; a set frees nothing by hand. |
| Proof | `npm run capture -- <name> lifecycle` loses the 3D context in the middle of an operation and checks all of the above. |

**Files with one owner (ask in "Requests" before touching):** `src/content/schema.ts`, `scripts/build-content.ts`,
`src/episode/PuzzleRunner.tsx`, `src/episode/CinemaEpisode.tsx`, `src/episode/Set3D.tsx`, `src/three/host.ts`,
`src/sim/outcomes.ts`, `src/consoles/index.tsx`, `scripts/capture.ts`, `scripts/prep-assets.ts`, `package.json`,
`content/ui.yaml`, `src/styles/app.css` (all Fable). `assets-src/manifest.yaml` and `src/styles/cinema.css` are append-only for everyone.

**Reference files, reproducible on any machine with `npm ci && npm run dev`:**
- a place of its own with a simulation and a console: E08 (`e08-opportunity.yaml`, `src/sim/meridiani.ts`, `src/scenes/meridiani/`, `src/consoles/PlanStation.tsx`);
- a file on the shared stage with a model: E11 (`e11-ingenuity.yaml`); with a photograph: E01 (`e01-surveyor.yaml`).

**Cuts and limits in force:** Hands, Look Up, Gaze, the Orrery and every T2 operation are frozen (the card map stays).
Knossos Station is a console set, not a walkable room. The postcard and the Voyager coda of the finale are not built.
13 files are drafts; two of them (E11, E01) are already on stage. There is no `?date=` override for light times.
Nobody has yet played E08 or timed the Thread; no real hardware, phone or screen reader has been tried by a person.

**Requests** (each lane writes under its own line; the owner answers in place, with the time):
- to lane a: **from lane b, Sun 17:50 · nothing is asked any more.** (The request of 17:35 about B-44 is withdrawn: the
  travel shot now plays on the map itself, in lane b's files. `src/episode/` is untouched.)
- to lane b:
- to lane astra: Astra to lane a (Nov 15): E11 is the first completed archive file; please run the A-30 integration capture after this push. Local captures prove Discovery and Silence. The generic capture route currently only runs Accessible; please add Explorer coverage for diorama files.

## 1. Where the project stands

**Live:** https://josmart04.github.io/ariadne/ · Gate green, 220 tests (Sun 15:30).

| Part of the Thread route | State |
|---|---|
| Title, Map, Credits | Iteration-0 text screens. The map is still a card list (A-20 would replace it with the Orrery). |
| Setup | Has "Way to play": Explorer / Hands (listed as coming soon) / Accessible, plus Sound and Mono. |
| **Prologue** | **Done in 3D** on the telescope console: the note, the midnight pulse, clew 0, the thread. No radio is tuned. With voices. |
| **E02 Apollo 11** | **Done in 3D, both modes, with voices and sound.** The reference for everything else. |
| **E16 Voyager 1** | **Done in 3D, both modes** (Sun 10:00): the 70-metre antenna turned by hand to the predicted position, the 2023–24 chip fault, clew III. **No voice files yet** (the browser reads aloud). Not yet reviewed by the team. |
| **E08 Opportunity** | **Done in 3D, both modes** (Sun 15:30, Fable): planned from Earth on the planning station (`src/consoles/PlanStation.tsx`), set `src/scenes/meridiani/`, simulation `src/sim/meridiani.ts`, the official MER-B model, the real orbital photo in Status Now. Every fact re-read against its source. **Not yet played by a person.** |
| **Finale** | **Done in 3D, both modes, with voices and sound.** Postcard and Voyager coda are not built (their beats are skipped). |
| The other 13 machines | Drafts with a few facts each. |

So the Thread is: prologue ✓ → E02 ✓ → E08 ✓ → E16 ✓ → finale ✓, each in 3D and in both modes. What is proven and how:
- **By tests (220):** content gates, puzzle reachability of every graph, four simulations including E08's ground, outcomes and light time.
- **By captures:** every beat of E08 in Accessible and in Explorer, in full and in reduced motion (`docs/captures/i3/`, `i3-reduce/`),
  with no console error. The captures of the other scenes are from before this session (`i1d/`, `i1e/`).
- **Not proven yet:** the whole Thread from a clean start (F-03), the 12 minutes with real people (T-06), real hardware and phones (T-10, T-13).

What the team asked for in its playtest on Sun 09:40, and what was done (all pushed):
- **"The landing is not intuitive, I always lose, even at 0.3 m/s."** Cause: a touchdown also fails when the lander still moves
  over the ground, the starting descent rate was already above the limit, and the message blamed the wrong thing.
  Now: limits always on screen (3.5 m/s down, 2.5 m/s forward) with "ready to land / too fast to land"; a coach line that
  says what to do next; a three-step brief before taking control; the landing ring labelled in the scene; a miss says why
  with the player's own numbers; a steadying assist (declared IMAGINED); a gentle start; retry from higher up;
  "Choose a place instead" from the start. A test and the capture script prove a beginner wins by waiting, braking and letting go.
- **"Left and right keys should move the camera."** Done in every set (also A and D).
- **"The New Clew box is ugly and hides the picture."** Replaced by a reveal in the lower third, no box (`ClewReveal`).
- **"Quotes deserve a better typeface."** Words that somebody says are set in Cormorant Garamond italic (OFL).
- ElevenLabs credits were added by the team: 44 voice files made for the prologue, E02 and the finale.

**The team has not yet seen these fixes. Ask them to replay E02 and say if the landing is now clear (T-13).**

## 2. First ten minutes on a new machine

```bash
git pull --rebase
npm ci
npm run check          # content + tsc + tests + build + secret scan: must be green before you change anything
npm run dev            # http://localhost:5173/?q=high#e02-apollo11  → play E02 and E16 once, in both modes
```
- `para_fable/` is git-ignored. **Machine A may still have requirements v1.0.** Ask the team for v1.1 (task T-00), then read its
  "Cambios en la v1.1" block and sections 3, 8.0, 10.6, 10.7, 11.3, 12, 16, 17.3, 17.5. If you cannot get it, this
  repository already encodes it: `CLAUDE.md` (rules), `docs/DECISIONS.md` (C-D01 to C-D17, B-D01 to B-D16), `docs/TASKS.md`.
- `.env` (git-ignored) must hold `ELEVENLABS_API_KEY` to make voices. A key that can only do text to speech is enough.
- Raw downloads live in `assets-src/raw/` (git-ignored). You only need them to re-run `scripts/prep-assets.ts`; the files the
  game serves are committed in `public/assets/`. The download URLs are in `assets-src/manifest.yaml`.

## 3. How to see and prove your work (do this for every beat)

1. `npm run dev`, open the beat with `?q=high` (forces full 3D quality) and, if you want, `?fps`.
2. Jump to any camera shot from the console: `__stage.getState().set.setCue('landed', true)`.
3. `npm run capture -- <name> [prologue|e02|e08|e16|finale] [explorer|accessible] [reduce]` plays the scenes in the installed
   Chrome or Edge and saves the pictures in `docs/captures/<name>/`. It fails on any console error. Against a production build:
   `npm run build && npm run preview -- --port 4173`, then `CAPTURE_URL=http://localhost:4173/ npm run capture -- <name>`
   (do this when you want to keep editing source while it runs: the dev server reloads pages under the script).
4. `npx tsx scripts/dev/contact.ts docs/captures/<name> <some folder>` makes contact sheets: look at every picture.
   **If one could be mistaken for a form, a quiz or a documentation page, the beat is not done (AC-15).**
5. A set with a puzzle gets its own routes in `scripts/capture.ts` (copy `e08Accessible` and `e08Explorer`). A file on the
   diorama needs none: `npm run capture -- <name> e11` walks it. Commit the captures with the code.
   Three more runs: `... thread` (the whole Thread from a clean start, with assertions), `... lifecycle` (a lost 3D context
   in the middle of an operation), `... reduce` (reduced motion).
   Current captures: `i1d/` (prologue, E02, finale), `i1e/` (E16), `i3/` and `i3-reduce/` (E08, thread), `i4/` (E11, E01), `i5/` (regression of Sun 16:00).

## 4. Recipe: a new 3D set, its console and its content

Three finished examples to copy, from simplest to richest:
`dsn` (E16: sky + official model with moving parts), `telescope` (prologue and finale), `tranquility` (E02: terrain + flight).

1. **Numbers first, if there is a simulation.** `src/sim/<name>.ts`: pure, deterministic, no DOM, no three. Declare its outcomes
   in `src/sim/outcomes.ts`. Write `tests/sim/<name>.test.ts`: one scripted run per outcome, and the real numbers it teaches.
   Models: `src/sim/dsn.ts` (simplest), `ranging.ts`, `descent.ts`.
2. **The set.** `src/scenes/<id>/cues.json` lists every cue with its written description (the text equivalent, AX-32) and
   the hotspots. `src/scenes/<id>/index.ts` exports `create(host, context): Promise<SetController>`: a `SHOTS` table (one camera per
   cue), `setCue`, `step` (fixed 60 Hz logic), `frame` (camera, placing things), `hotspot(name)`, `act(name, arg)`.
   Sets are found by `import.meta.glob`: there is no registry to edit. Copy the arrow-key and drag handling as it is.
3. **`act` contract used by `PuzzleRunner`:** `act('fly', { outcome })` plays a scripted run and resolves to `{ outcome }`;
   `act('fly', { player: true, retry })` lets the player drive and resolves to `{ outcome }`, or to
   `{ outcome: null, miss, ... }` for a slip that is not an outcome; `act('skip')`; `act('reset')`; `act('state')` for readouts;
   `act('slew' | 'zoom' | 'fire')` from console buttons. Reuse these names and `PuzzleRunner` needs no change.
4. **The console.** `src/consoles/<Name>.tsx` + a `<Name>Brief` (goal and controls in three short lines), registered in
   `src/consoles/index.tsx` under the simulation's name. Native buttons only. Models: `DsnConsole.tsx`, `LmPanel.tsx`.
   Wording per simulation in `content/ui.yaml`: `sim.<name>.take | retry | skip | auto | miss[.<reason>]`.
   **Lesson from the playtest: state the goal, show every limit, and say what to do next. A player who does nothing wrong must win.**
5. **Assets.** Add the source to `assets-src/manifest.yaml`, download into `assets-src/raw/`, convert in
   `scripts/prep-assets.ts`, run `npx tsx scripts/prep-assets.ts`. Official models:
   `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/<folder>/<file>.glb` (Draco-compressed;
   `src/three/assets.ts` decodes them). Read the node names first: the antenna had `azimuth` and `elevation` nodes ready to turn.
   Images: `https://images-api.nasa.gov/search?q=...`.
6. **Content.** `set: { scene, model, labels }`, `models`, `images`, `cues` per beat, `cue:` on lines,
   `stage: { kind: scene, cue }` on puzzle states, `sim` + `when` + `target` on the decision played by hand,
   `console.controls` with `REAL` (needs a `fact`) or `IMAGINED`, `discovery.story.cues`, `silence.before`.
   Models: `content/episodes/e16-voyager1.yaml`, `e02-apollo11.yaml`, `content/finale.yaml`.
   The compiler reports every unknown cue, hotspot, outcome or unsourced control.
7. **Scenes (prologue, finale)** go through `src/episode/ScenePlayer.tsx`: with a `set` they use the cinema layout. A `special`
   beat with no `text` is skipped, so unfinished set pieces never show a placeholder.
8. **Sound and voice.** `audio.play(name)` (names in `src/audio/bus.ts`), `audio.engine(level)`, `audio.speak(id, text, who)`.
   Voice files: `npx tsx scripts/gen-voices.ts --dry-run <scene ids>` shows what is missing and the character count; drop
   `--dry-run` to make them, then `npm run content` so the game knows they exist. Lines without a file are read by the browser.
9. **Every fact you write:** fetch the source, read the sentence that supports it, and put what you checked in `note:`.
   Never fill `verified:`. No source, no REAL line. `curl` + strip tags + `grep` is enough (see Traps for hosts that work).

## 5. Traps (each one cost time)

- **Heredocs.** On machine B, long `bash` heredocs that contain JavaScript failed with "unexpected EOF". Write helper
  scripts with the file tool, then run them with `node`.
- **Line endings.** The working tree is CRLF on Windows. A script that edits files must normalise `\r\n` first, or exact-text
  replacements silently miss.
- **File names.** Never two files in one folder that differ only in case: TypeScript refuses.
- **Hidden tabs.** A background tab slows the animation loop and the simulation with it. Test with `npm run capture`.
- **Auto quality.** A slow machine drops to half resolution and no shadows within seconds, by design. Review with `?q=high`.
- **Texture cache.** After `prep-assets.ts`, reload with the cache disabled.
- **`npm run check` rebuilds `dist/`.** Do not run it while a capture is reading the preview server.
- **Sources.** `nasa.gov/history/alsj/...` redirects to a landing page: use `apollojournals.org/alsj/...`.
  `jpl.nasa.gov/news/...` answers 403 to `curl`. Hosts that answer scripts: `nssdc.gsfc.nasa.gov`, `science.nasa.gov`,
  `www.nasa.gov/missions/...`, `images-api.nasa.gov`, `apollojournals.org`.
- **ElevenLabs.** The key cannot list voices or read the quota (it only has the text-to-speech permission). The script
  stops cleanly when credits run out and keeps what it made.
- **Toolchain is very new** (Vite 8, Vitest 5, TypeScript 7, Zod 4, React 19, three 0.187). three 0.187 has no
  `PCFSoftShadowMap`. Zod 4: `z.strictObject`, `z.partialRecord`, `z.looseObject`.
- `src/generated/` is git-ignored: `npm run content` (or `npm run dev`) before `tsc`.
- Claude cannot test a webcam, a phone or a real GPU laptop. Hands, Look Up and frame rate need a person.

## 6. Next steps, as written on Sun 10:05 (superseded: see section 0 and the lanes in `docs/TASKS.md`)

1. **B-27: E08 Opportunity in 3D, operated from Earth.** It is the only key episode still in text, so the Thread is not
   whole without it. Copy `dsn`. Keep the state machine of `e08-opportunity.yaml`; add `set`, cues, a planning station.
   No tau slider, no human on Mars, no real-time joystick. If it cannot be finished by 13:00, apply the cut ladder: ship it as
   a file with the official rover model on stage and an explainer animation, and say so in this file.
2. **Voices for E16 (and E08 when its text is final):** `npx tsx scripts/gen-voices.ts e16-voyager1`, then `npm run content`.
3. **13:00 cut rule:** play the Thread end to end with a stopwatch. Under 12 minutes?
4. **I4, by 14:00:** `docs/submission/` (summary, description, AI disclosure, NASA Data list, references, video script),
   credits screen from `assets-src/manifest.yaml`, README check. The team submits at 14:00.
5. **I5, by 17:00:** the 13 files with a model or image on stage (`src/scenes/diorama/`, text by 15:00), the Orrery, Hands.
6. **I6:** fixes only.

## 7. Continuation prompt of Sun 10:05 (superseded by the two start prompts of section 0)

Kept for the record. The next Fable session starts with: "You are the Fable · Thread and core lane of ARIADNE. Work in
your own clone. Read `CLAUDE.md`, `docs/HANDOFF.md` section 0 and `docs/TASKS.md`, take the first open task of your lane,
claim it and push the claim before coding. Report in Spanish."

The old text: paste this to start the next session (the team talks to Claude in Spanish; the repository stays English):

> You are continuing ARIADNE (NASA Space Apps 2026, challenge "Abandoned but not Forgotten") in the repository
> https://github.com/JosMart04/ariadne. Another Claude session (account B) built the 3D Thread up to here and wrote the
> handoff. You now lead the whole project.
> 1. Set up: `git pull --rebase`, `npm ci`, `npm run check` (must be green), `npm run dev`.
> 2. Read, in this order: `CLAUDE.md`, `docs/HANDOFF.md` (all of it), `docs/TASKS.md`, and in `docs/DECISIONS.md` the blocks
>    "Course correction v1.1" and "Front B". If `para_fable/1_obligatorio/ARIADNE_ELICITACION.md` is v1.1, read its
>    "Cambios en la v1.1" block and sections 3, 8.0, 10.6, 16 and 17.3; if it is v1.0 or missing, say so and go on with what
>    the repository records.
> 3. See the quality bar before writing anything: play E02 and E16 once (`http://localhost:5173/?q=high#e02-apollo11`,
>    `#e16-voyager1`) and look at `docs/captures/i1d/` and `docs/captures/i1e/`. Read `src/scenes/dsn/index.ts`,
>    `src/sim/dsn.ts`, `src/consoles/DsnConsole.tsx`, `content/episodes/e16-voyager1.yaml`, `src/episode/PuzzleRunner.tsx`
>    and `src/episode/CinemaEpisode.tsx`: E16 is the pattern to copy.
> 4. Check the clock against the deadlines (UTC−5: cut rule 13:00, first submission 14:00, text freeze 15:00, feature freeze
>    17:00, final 22:30), re-plan the rest of `docs/TASKS.md` for the real time, and apply its cut ladder without asking:
>    cut playable episodes, never the visual quality or the interaction of what is shown.
> 5. Take the first open step of section 6 of `docs/HANDOFF.md` (E08 Opportunity in 3D, operated from Earth). Mark the task
>    `[~] (A)` and push that line before coding.
> 6. Work in small steps: after each one `npm run check`, run `npm run capture`, look at the pictures against the screenshot
>    rule, commit with the captures, `git pull --rebase`, push. Update `docs/HANDOFF.md` and `docs/TASKS.md` at the end of
>    every iteration and before your quota runs out.
> 7. Never break: English only in the repository and the game; every REAL line cites an https source you actually opened;
>    no NASA logo; no copyrighted text or music; no generated voice for a real person; no human on Mars; every machine
>    operated the way it really was; every rich interaction has its Accessible version, a reduced-motion version and a text
>    equivalent; and, from the playtest, every hands-on task states its goal, shows its limits and says what to do next.
> Report in Spanish with: (a) the time and the plan that is left, in a short table; (b) what you need from the human team.
> Then start without waiting for confirmation.

## 8. Notes by account

### Account B (stopped Sun ~10:10)

Did: the course-correction records, the 3D core, the sets `tranquility`, `telescope`, `dsn`, three simulations and consoles,
the cinema layout, sound, voices, the capture tooling, prologue, E02, E16 and the finale.
Left undone: E08 in 3D, voices for E16, everything in I4 to I6.

### Account A = Fable, session of Sun 14:45 to 16:10

Did: the lanes and start prompts; E08 in 3D in both modes (simulation, set, planning station, content, facts re-read,
voices); voices for E16; the Thread check from a clean start; the diorama contract with two proving files; the explainer as
captions; the two lifecycle fixes with their check. Every step was pushed with its captures and deployed.
Left undone: everything a person must do (section "Team"), the 11 files still off stage, the text of the 13 files, the
accessibility pass (A-13), the submission texts (X-01). Also done at 16:06: credits generated from the manifest (A-25).

### Lane b · machine B (Fable, from Sun 17:00)

**Done and pushed (Sun 17:35 to 17:55):** B-40 to B-44 and B-46. The map is the Orrery and the title is the same solar system.
- `src/sim/planets.ts` (21 tests in `tests/sim/planets.test.ts`): planets, Eros, Ceres, the Moon, three approximate probes,
  the compressed scale of the map.
- `src/scenes/orrery/`: cues `title`, `map`, `far`; hotspots are the worlds by name and the machines by episode id;
  `places.ts` says where each of the sixteen rests. Options: `when`, `done`, `thread: 'whole'`, `pin`.
  `act('zoom', { by })` and `act('reset')`. No model, no texture file, no new dependency (fat lines come from three's own addons).
- `src/screens/`: `Cosmos.tsx` (the stage, `Pin`, `mapDate`, `readouts`), `OrreryMap.tsx`, `cosmos.css`; in `screens.tsx`
  `Title` and `MapScreen` changed, the old map is `MapList`, every exported name is the same.
- `npm run capture -- b1 title map` plays both screens, checks that sixteen markers are placed, that a marker opens its
  file and that the list is one key away; `... b1 thread` passes.

**How to see it:** `http://localhost:5173/?q=high#map` (Explorer opens the Orrery; Accessible opens the list, the key
"Orrery" switches). Another day: `?date=2027-02-19#map` (Mars at opposition).

**For lane a:**
- The buttons the Thread check presses are unchanged. In Accessible play the map is still the list, so `thread` walks the same screens as before.
- The title now loads three.js (lazily, after the first paint). If the final regression times the title, it is about a second later than before.
- `A-33` (accessibility): on the Orrery, Tab walks the sixteen machines in launch order, then the actions, then the map keys;
  every marker has a full name ("E08 Opportunity, Mars, key memory, restored"). Not tried with a screen reader.
- If the finale gets `?date=`, `mapDate()` reads the same parameter: one link sets both.

**Added Sun 17:50:** the journey from the Earth to a machine (B-44, on the map: `act('travel', { to })`, `journey()` in
`Cosmos.tsx`, `fromEarthKm` in `planets.ts`), Setup and Credits over the sky of the title (B-46), lights running along the
woven thread, captures with reduced motion (`docs/captures/b2-reduce/`). Latest pictures: `docs/captures/b3/`.

**Not done:** not tried on real hardware or on a phone (B-45, for the team). Touch has drag and the + and − keys, no
pinch. The Orrery is not tried with a screen reader. The journey is not offered from the list view (it opens the file
directly), by design.

### Team (humans)

**Waiting on you (Sun 16:10):** **T-15 play E08** and say if the planning station is clear · **T-13b replay the landing of
E02** · **T-06 time the whole Thread with people** (the script needs 3 minutes; a person is the measure) · T-16 review the
text and facts of E08 · T-02 and T-03 rewrite the text in your own voice and sign `verified:` · T-04 listen to the voices ·
T-07 submit the form · T-10 and T-13 real hardware and a phone · decide whether GPT Astra starts now (start prompt in section 0).

### Lane astra · independent clone (Nov 15)

- 16:48 UTC-5: X-01 complete. Six submission files describe the delivered Thread, disclose Claude/Codex and generated voices, list sources, and provide a 28-second edit script.
- Baseline: npm ci succeeded; npm run check passed (224 tests, one todo). Human fact signatures remain untouched.
- Next: E11 first, including Discovery and Silence capture, then the episode order in section 0.
- E11: seven beats complete; all seven facts opened and noted; no human signatures filled. Existing official model and manifest credit reused. 18 full-motion and 18 reduced-motion Accessible frames in docs/captures/x1 and x1-reduce, inspected; no console errors. Gate: 225 tests, one todo. A-30 independent integration and Explorer capture remain with lane a. X-11 claimed next.
- E07: completed with six checked facts and the existing MER-B twin model, identified in alt text. 17 full-motion plus 17 reduced-motion frames inspected in x2 and x2-reduce; no console errors. Gate: 228 tests, one todo. X-12 Viking claimed next.
- E05: seven checked facts, official Viking model and all seven beats. Conflicting NASA contact dates narrowed to agreed months. 17 full-motion plus 17 reduced-motion frames inspected in x3 and x3-reduce; no console errors after removing a duplicated story reference. Gate: 232 tests, one todo. X-13 Pioneer claimed next.
- E12: seven checked facts, spin-scan explanation and official Pioneer model. Scaled to keep the complete antenna in frame. 16 full-motion plus 16 reduced-motion frames inspected in x4 and x4-reduce; no console errors. Gate: 254 tests, one todo. X-14 Kepler claimed next.
- E14: seven checked facts, transit detection with false-alarm limits, K2 and final radio shutdown. Official Kepler model and credited creators. 17 full-motion plus 17 reduced-motion frames inspected in x5 and x5-reduce; no console errors. Gate: 259 tests, one todo. X-15 Dawn claimed next.
- E15: seven checked facts, distinct xenon propulsion and hydrazine pointing, salts and ice evidence, dated orbit prediction. Official Dawn model. 17 full-motion plus 17 reduced-motion frames inspected in x6 and x6-reduce; no console errors. Gate: 264 tests, one todo. X-16 NEAR claimed next.
- E13: six checked facts, laser ranging, mineral spectra and surface gamma-ray measurements. Official NEAR model. 17 full-motion plus 17 reduced-motion frames inspected in x7 and x7-reduce; no console errors. Gate: 267 tests, one todo. X-17 InSight claimed next.
- E10: seven checked facts, seismic-wave measurements, environmental noise and the heat probe limitation. Official InSight model. 16 full-motion plus 16 reduced-motion frames inspected in x8 and x8-reduce; no console errors. Gate: 271 tests, one todo. X-18 Surveyor claimed next.
- E01: eight checked facts, radar descent, soil strength and the Apollo 12 visit; existing Surveyor photograph reused. 18 full-motion plus 18 reduced-motion frames inspected in x9 and x9-reduce; no console errors. Gate: 279 tests, one todo, including the newly integrated Orrery. X-19 Phoenix claimed next.
- E09: seven checked facts distinguish disappearing ice, laboratory water detection and perchlorate limits. Original NASA trench photograph; winter damage described as orbital evidence. 16 full-motion plus 16 reduced-motion frames inspected in x10 and x10-reduce; no console errors. Gate: 283 tests, one todo. X-20 Sojourner claimed next.
- E06: seven checked facts, commanded paths, onboard obstacle sensing and rock measurements; original Yogi photograph. Shortened the display name to Sojourner because the longer title overlapped the act label. 17 full-motion plus 17 reduced-motion frames recaptured and inspected in x11 and x11-reduce; no console errors. Gate: 287 tests, one todo. X-21 ALSEP claimed next.
- E03: seven checked facts, passive seismic measurements and the 55-minute impact signal; the report's scattering hypothesis remains explicitly uncertain. Original NASA ALSEP photograph. 17 full-motion plus 17 reduced-motion frames inspected in x12 and x12-reduce; no console errors. Gate: 292 tests, one todo. X-22 Lunar rovers claimed next.
- E04: seven checked facts, the hand controller, electric drive, return navigation and the improvised fender. Original NASA final-parking photograph. 16 full-motion plus 16 reduced-motion frames inspected in x13 and x13-reduce; no console errors. Gate: 299 tests, one todo; all 16 episodes are now non-draft. X-04 claimed next; submission inventories and additional Explorer/fallback proof follow.
