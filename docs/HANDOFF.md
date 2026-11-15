# Handoff: live project state

Written Sun Nov 15, 07:35 UTC−5 by account B, for whoever continues (account A, or account B again).
Everything needed to go on is in this file, `CLAUDE.md`, `docs/TASKS.md` and `docs/DECISIONS.md`. Keep this file current:
done / in progress / next steps / traps. Once both accounts work, each edits **only its own section** at the bottom.

**Deadlines (UTC−5): cut rule 13:00 · first submission 14:00 · text freeze 15:00 · feature freeze 17:00 · final submission 22:30.**

## 1. Where the project stands

**Live:** https://josmart04.github.io/ariadne/ · the slice: https://josmart04.github.io/ariadne/#e02-apollo11
**Last commit of account B:** see `git log -1`. Gate green, 153 tests, deploy green.

| Part of the Thread route | State |
|---|---|
| Title, Setup, Map | Iteration-0 text screens. Setup has no Explorer / Hands / Accessible choice yet (A-23). The map is a card list (A-20 replaces it). |
| Prologue | Text, with the forbidden "Tune the station" puzzle. To be restaged on the telescope console (A-28). |
| **E02 Apollo 11** | **Done in 3D, both modes, with sound.** The reference for everything else. 36 captures in `docs/captures/i1b/`. No voice files yet. |
| E08 Opportunity | Complete in text only (state machine and facts exist). Needs its 3D planning station (B-27). |
| E16 Voyager 1 | A draft: 3 facts and one line. Needs content and its set (B-28). |
| **Finale** | **Done in 3D, both modes, with sound** (Sun 07:50): sky with the three suspects, the Moon in tonight's phase, the aiming map on the real orbital photo, the laser with photons and a real-time 2.56 s clock, the telescope console, the monologue, the "Daisy Bell" hum, the midnight pulse. 31 captures in `docs/captures/i1c/`. No voice files yet. The postcard and the Voyager coda are not built (their beats are skipped). |
| The other 13 machines | Drafts with a few facts each. |

What E02 proves and the rest must match:
- A full-screen 3D set (official NASA lunar module, the real orbital photo as the ground), captions in a lower third with
  speaker and REAL / IMAGINED tag, on-screen labels for what is reconstructed.
- **Accessible:** the landing decision is three large targets inside the scene; a scripted pilot flies the choice.
- **Explorer:** "Take control" opens the lunar module panel; the player flies with W / S and R / F, the on-screen stick or a
  gamepad; the outcome of the simulation picks the transition of the same state machine. A hard touchdown teaches and retries.
- Lunar dust in flat ballistic sheets, the rain of light gathered into the golden thread, synthesised sound.

## 2. First ten minutes on a new machine

```bash
git pull --rebase
npm ci
npm run check          # content + tsc + 153 tests + build + secret scan: must be green before you change anything
npm run dev            # http://localhost:5173/?q=high&fps#e02-apollo11  → play E02 once, in both modes
```
- `para_fable/` is git-ignored. **Machine A still has requirements v1.0.** Ask the team for v1.1 (task T-00), then read its
  "Cambios en la v1.1" block and sections 3, 8.0, 10.6, 10.7, 11.3, 12, 16, 17.3, 17.5. If you cannot get it, this
  repository already encodes it: `CLAUDE.md` (rules), `docs/DECISIONS.md` (C-D01 to C-D17, B-D01 to B-D12), `docs/TASKS.md`.
- `.env` (git-ignored) must hold `ELEVENLABS_API_KEY` for B-04. Copy `.env.example` and ask the team for the key.
- To change the play mode before A-23 exists: Settings do not show it yet. In the browser console:
  `localStorage.setItem('ariadne-v1', JSON.stringify({state:{settings:{setupDone:true,play:'accessible'},progress:{}},version:0}))` and reload
  (`play: 'explorer'` is the default).

## 3. How to see and prove your work (do this for every beat)

1. `npm run dev`, open the beat with `?q=high` (forces full 3D quality) and, if you want, `?fps`.
2. Jump to any camera shot from the console: `__stage.getState().set.setCue('landed', true)`.
3. `npm run capture -- <name>` plays E02 in the installed Chrome (Accessible, every beat) and then flies it by hand
   (Explorer). Options: `reduce` (reduced motion), `explorer` or `accessible` (one route only). It fails on any console error.
   Pictures go to `docs/captures/<name>/`. Against a production build: `npm run build && npm run preview -- --port 4173`, then
   `CAPTURE_URL=http://localhost:4173/ npm run capture -- <name>`.
4. `npx tsx scripts/dev/contact.ts docs/captures/<name> <some folder>` makes contact sheets: look at every picture.
   **If one could be mistaken for a form, a quiz or a documentation page, the beat is not done (AC-15).**
5. Add your new scene to `scripts/capture.ts` (copy the `e02` function) and commit the captures with the code.

## 4. Recipe: a new 3D set, its console and its content (copy E02)

1. **Numbers first, if there is a simulation.** `src/sim/<name>.ts`: pure, deterministic, no DOM, no three. Declare its outcomes
   in `src/sim/outcomes.ts`. Write `tests/sim/<name>.test.ts`: one scripted "pilot" per outcome, and determinism.
   Model: `src/sim/descent.ts` (`step`, `outcome`, `PILOTS`, `fly`).
2. **The set.** `src/scenes/<id>/cues.json` lists every cue with its written description (the text equivalent, AX-32) and
   the hotspots. `src/scenes/<id>/index.ts` exports `create(host): Promise<SetController>`. Model: `src/scenes/tranquility/index.ts`:
   a `SHOTS` table (one camera per cue: position, look-at, field of view, slow drift or orbit, `follow`, `shift`), `setCue`,
   `step` (fixed 60 Hz logic), `frame` (camera damping, placing things), `hotspot(name)`, `act(name, arg)` for commands.
   Sets are found by `import.meta.glob`: there is no registry to edit.
3. **`act` contract used by `PuzzleRunner`:** `act('fly', { outcome, speed })` plays a scripted run and resolves to
   `{ outcome }`; `act('fly', { player: true, retry })` lets the player's `controls` drive it and resolves to `{ outcome }`
   or `{ outcome: null }` for a slip that is not an outcome; `act('skip')`; `act('reset')`; `act('state')` for readouts.
   Reuse these names in a new set and `PuzzleRunner` needs no change.
4. **The console.** `src/consoles/<Name>.tsx`, registered in `src/consoles/index.tsx` under the simulation's name. Native
   buttons only. It reads `act('state')` and writes `controls` (`src/input/controls.ts`). Model: `LmPanel.tsx`.
5. **Assets.** Add the source to `assets-src/manifest.yaml`, download into `assets-src/raw/` (git-ignored), convert in
   `scripts/prep-assets.ts`, run `npx tsx scripts/prep-assets.ts`. Official models: `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/<folder>/<file>.glb`
   (they are Draco-compressed; `src/three/assets.ts` already decodes them). Images: `https://images-api.nasa.gov/search?q=...`.
6. **Content.** In the YAML: `set: { scene, model, labels }`, `models`, `images`, `cues` per beat, `cue:` on lines,
   `stage: { kind: scene, cue }` on puzzle states, `sim` + `when` + `target` on the decision that is played by hand,
   `console.controls` with `REAL` (needs a `fact`) or `IMAGINED`. Model: `content/episodes/e02-apollo11.yaml`.
   The compiler tells you about every unknown cue, hotspot, outcome or unsourced control.
7. **Scenes (prologue, finale)** render through `src/episode/ScenePlayer.tsx`: with a `set` they use the cinema layout
   (model: `content/finale.yaml` + `src/scenes/telescope/`), without one the old text layout. A `special` beat with no
   `text` is skipped in the cinema layout, so unfinished set pieces never show a placeholder.
   A second example of a simulation with its console: `src/sim/ranging.ts` + `src/consoles/TelescopeConsole.tsx` (the set
   itself handles drag and wheel; the console calls `act('slew' | 'zoom' | 'fire')`). Wording per simulation:
   `sim.<name>.take | retry | skip | auto | miss` in `content/ui.yaml`.
8. **Sound.** `audio.play('key' | 'confirm' | 'wrong' | 'alarm' | 'quindar' | 'contact' | 'catch' | 'pulse' | 'static')`,
   `audio.engine(level)`, `audio.speak(id)`. Add new effects in `src/audio/bus.ts`. No recordings.
9. **Every fact you write:** open the source, read the sentence that supports it, and put what you checked in `note:`.
   Never fill `verified:`. No source, no REAL line.

## 5. Traps (each one cost time)

- **Heredocs.** On machine B, long `bash` heredocs that contain JavaScript failed twice with "unexpected EOF". Write helper
  scripts with the editor's file tool, then run them.
- **Line endings.** The working tree is CRLF on Windows (`core.autocrlf=true`). A script that edits files must normalise
  `\r\n` first, or exact-text replacements silently miss.
- **File names.** Never two files in one folder that differ only in case (`Stage.tsx` and `stage.ts`): TypeScript refuses.
- **Hidden tabs.** A background tab slows the animation loop, and the simulation with it. Test flights in a visible tab,
  or with `npm run capture`.
- **Auto quality.** A slow machine drops to half resolution and no shadows within seconds, by design. Review with `?q=high`.
- **Texture cache.** After `prep-assets.ts`, reload with the cache disabled or you will keep seeing the old picture.
- **The orbital photo shows the real hardware** as bright dots. `prep-assets.ts` paints them out of the terrain texture only;
  the evidence images (`img_*`) are never touched.
- **The far plain has a hole** under the photographed square, or it hides the inside of the craters.
- **Sources that moved or block scripts.** `nasa.gov/history/alsj/...` now redirects to a landing page: use
  `apollojournals.org/alsj/...`. `jpl.nasa.gov/news/...` answers 403 to `curl`: the three facts of the finale are still
  unchecked. NSSDCA (`nssdc.gsfc.nasa.gov`) answers scripts and is the best official source found so far.
- **Toolchain is very new** (Vite 8, Vitest 5, TypeScript 7, Zod 4, React 19, three 0.187). three 0.187 has no
  `PCFSoftShadowMap`. Zod 4: `z.strictObject`, `z.partialRecord`, `z.looseObject`.
- `src/generated/` is git-ignored: `npm run content` (or `npm run dev`) before `tsc`.
- Claude cannot test a webcam, a phone or a real GPU laptop. Hands, Look Up and frame rate need a person (T-11, T-12, T-13).

## 6. Next steps, in order (details in `docs/TASKS.md`)

1. Done: B-23 + B-24 (the finale in 3D) and A-23 (Explorer / Hands / Accessible on the Setup screen).
2. **B-04: voices** for the prologue, E02 and the finale. Ids already exist; files just need to appear.
3. **A-28: prologue on the telescope console.** The set is ready: `src/scenes/telescope` has the cues `sky`, `pulse`, `moon`
   and the console. Give `content/prologue.yaml` a `set`, cues, and replace "Tune the station".
4. **B-28: E16 Voyager 1**, content then set.
5. **B-27: E08 from Earth.** Then the 13:00 cut-rule check: play the Thread end to end with a stopwatch.
6. I4 submission build, then I5 (Orrery, the 13 files, Hands).

## 7. Continuation prompt

Paste this to start the next session on any machine (the team talks to Claude in Spanish; the repository stays English):

> You are continuing ARIADNE (NASA Space Apps 2026, challenge "Abandoned but not Forgotten") in the repository
> https://github.com/JosMart04/ariadne. Another Claude session built the vertical slice and wrote the handoff.
> 1. Set up: `git pull --rebase`, `npm ci`, `npm run check` (must be green), `npm run dev`.
> 2. Read, in this order: `CLAUDE.md`, `docs/HANDOFF.md` (all of it), `docs/TASKS.md`, the "Course correction v1.1" and
>    "Front B" blocks of `docs/DECISIONS.md`. If `para_fable/1_obligatorio/ARIADNE_ELICITACION.md` is v1.1, read its
>    "Cambios en la v1.1" block and sections 3, 8.0, 10.6, 10.7, 16 and 17.3; if it is v1.0 or missing, say so and go on
>    with what the repository records.
> 3. Play E02 once in the browser (`http://localhost:5173/?q=high#e02-apollo11`) and look at `docs/captures/i1b/`:
>    that is the quality bar. Read `src/scenes/tranquility/index.ts`, `src/episode/CinemaEpisode.tsx`,
>    `src/episode/PuzzleRunner.tsx`, `src/consoles/LmPanel.tsx`, `src/sim/descent.ts` and `content/episodes/e02-apollo11.yaml`
>    before writing any new set.
> 4. Check whether the other account is working (`git log -3 --format='%h %ad %s' --date=format:%H:%M origin/main`).
>    If it pushed in the last 45 minutes, take your lane from "Two lanes" in `docs/TASKS.md`; otherwise you lead the whole
>    project: follow the iteration table from the top. Mark your task `[~] (A)` or `[~] (B)` and push that line first.
> 5. Re-check the clock against the deadlines (UTC−5: cut rule 13:00, first submission 14:00, text freeze 15:00, feature
>    freeze 17:00, final 22:30) and apply the cut ladder of `docs/TASKS.md` without asking: cut playable episodes, never the
>    visual quality or the interaction of what is shown.
> 6. Work in small steps: after each one `npm run check`, look at it in the browser, `npm run capture`, review the pictures
>    against the screenshot rule, commit with the captures, `git pull --rebase`, push. Update `docs/HANDOFF.md` and
>    `docs/TASKS.md` at the end of every iteration and before your quota runs out.
> 7. Never break: English only in the repository and the game; every REAL line cites an https source you actually opened;
>    no NASA logo; no copyrighted text or music; no generated voice for a real person; no human on Mars; every machine
>    operated the way it really was; every rich interaction has its Accessible version, a reduced-motion version and a
>    text equivalent.
> Start now with the first open task, and report in Spanish.

## 8. Sections by account

### Account B (machines, consoles, content, assets)

**Done:** I0, I1a, I1b, the finale (B-23, B-24), A-23. **Working on (Sun 07:50):** B-04 voices.
**Requests to account A:** if you take A-23, keep `settings.play` as the single source of truth for the mode; the lunar
module panel and `PuzzleRunner` already read it. If you take A-20, keep `MapScreen`'s list as the Accessible view.

### Account A (cosmos, station, shell)

**Done (iteration 0, Sat 22:10):** repository, CI gate, Pages deploy, contract, compiler, text skeleton from title to
credits, one-button scanning (built; verified on the prologue only).
**Requests to account B:** (write here)

### Team (humans)

**Waiting on you now:** T-00 (copy `para_fable/` to machine A), T-13 (play E02 on a normal laptop and report the frame rate
and how the landing feels), T-14 (look at the 36 captures), T-02 and T-03 for E02 (its text and facts are ready to review).
