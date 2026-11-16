# Tasks

Status: `[ ]` open · `[~]` in progress (add who) · `[x]` done.
IDs in brackets are requirement ids from the requirements document (v1.1).

**State on Sun Nov 15, 16:30 UTC−5:** the Thread is whole and deployed. **Three lanes work at once: see "Phase 2" below.**
Several AI sessions may work at once: lanes and claim rules are in `CLAUDE.md` and in section 0 of `docs/HANDOFF.md`.

## Iterations (UTC−5)

Each iteration ends deployed, with the gate green, captures committed and `docs/HANDOFF.md` updated. Each one could be submitted as it is.

| It. | Window | What is deployed | Gate |
|---|---|---|---|
| I0 | done | Machine ready, decision and plan recorded | ✓ |
| I1a | done 02:55 | 3D core, Tranquility Base set, cinema layout, E02 complete in Accessible | ✓ 36 captures |
| I1b | done 07:22 | E02 flown by hand in Explorer, lunar module panel, dust, rain of light, sound, voice ids | ✓ 36 captures |
| I1c | done 09:55 | **Finale in 3D:** telescope console on the real orbital image, laser photons, measurement, monologue. Voices for ARIADNE (E02 + finale). Explorer / Hands / Accessible on the Setup screen | AC-13 on the finale |
| I2 | done 10:05 | **E16 Voyager 1:** content complete + DSN antenna set + "Pale Blue Dot" shot. **Prologue** restaged on the telescope console (no "Tune the station") | captures |
| I3 | 14:50–16:40 | **E08 in 3D** (Fable): planning station on Meridiani, estimated light delay of today. Thread route complete. In parallel, if started: `docs/submission/` and the text of the 13 files (Astra), the diorama contract (Fable-diorama) | captures |
| I4 | 16:40–17:00 | Voices for E08 and E16 · the Thread played from a clean start (F-03) · deploy checked | **17:00 feature freeze** |
| I5 | 17:00–22:30 | Fixes only: lifecycle (F-02), performance on real hardware, final captures, video support. The 13 files leave draft only if the diorama contract landed before 17:00, or if the team moves the freeze for them | **22:30 final submission** |

Re-based on Sun 14:50: the plan of this session waited for approval from 10:55 to 14:45, so the 13:00 cut rule and the
14:00 first submission passed with no work done. **Frozen now (cut ladder 2 and 3): Hands, Look Up, Gaze, every T2
operation, the Orrery** (the card map stays).

**Cut ladder (decided in advance; it never lowers the quality of what is shown):**
1. Already applied (B-D12): Knossos Station is a console set, not a walkable room. The prologue uses the telescope console.
2. Hands: cursor + pinch + fist joystick on the lunar module panel and the laser only. No calibration screen if time is short: a fixed neutral point.
3. **13:00:** Thread not playable end to end in under 12 minutes → Look Up, Gaze and every T2 operation are frozen. A key episode
   without a finished 3D operation ships as a file with an inspectable model and an explainer animation, never as a text quiz.
4. Orrery not ready by 16:00 → the card map stays, restyled, with the 3D sets behind each episode.
5. A file that has no model or image on stage stays a draft ("This memory is still being restored") and is not linked from the Thread.

**A beat is done when** it plays in Explorer and in Accessible (and in Hands once B-25 exists); has a reduced-motion version;
has a text equivalent (the cue description in `cues.json`); passes the screenshot rule; and its capture is committed.

## Phase 2: three lanes at once (from Sun 16:30; paths in `lanes.json`, rules in `docs/HANDOFF.md` section 0)

New work and new text stop at **20:00**. Each lane writes only under its own heading here. Claim with `[~]` and push the claim first.

### Lane a · machine A (Fable): integration and the ending

- [ ] A-30 **Integration duty, the whole phase.** At every commit read "Requests" in `docs/HANDOFF.md`; answer within 15 minutes.
  When lane astra pushes a file: `npm run capture -- a<n> e<NN>`, look at every picture, fix the engine or write back.
  The first file out of draft (E11) is the proof that Discovery and Silence play on the diorama: check it before anything else.
- [ ] A-31 **Voyager coda of the finale** (was A-24, A-10): the last beat, on the `dsn` set, with copy that is right before, on
  and after Nov. 18, 2026 (`lightDayMoment` in `src/sim/dsn.ts`) and a `?date=` override for the team's video. No text by Carl Sagan.
- [ ] A-32 **Postcard** (was A-11): three fragments, three options each, drawn on a canvas, saved as a PNG. `src/extras/postcard/`.
- [ ] A-33 **Accessibility pass on the Thread** (was A-13, A-02): keyboard only, one button, 200 % text, high contrast, screen-reader
  labels of the planning station and the diorama. Fix what fails; list what a person must still try.
- [ ] A-34 **20:00:** voice files for every line that changed or is new (`npx tsx scripts/gen-voices.ts --dry-run` first), then `npm run content`.
- [ ] A-35 **20:30:** the full regression: `npm run capture -- final`, `... final thread`, `... final lifecycle`, `... final reduce`,
  every file of lane astra, the public URL. Write the result in `docs/HANDOFF.md`.

### Lane b · machine B (Fable): cosmos and shell

- [x] (Sun 17:15: 18 tests against published events; Eros, Ceres, the Moon and three approximate probes too) B-40 `src/sim/planets.ts` + `tests/sim/planets.test.ts`: heliocentric positions of the eight planets for a date, from JPL's
  approximate elements. Copy the table and the solver from `src/sim/meridiani.ts` (do not edit it). Tests against published
  distances. No new dependency.
- [x] (Sun 17:35; 3 cues, 31 hotspots, textures made in code, `?date=`) B-41 `src/scenes/orrery/` (`cues.json` + `index.ts`, shape of `src/scenes/diorama/`): the Sun, eight planets at today's real
  positions, their orbits, the Moon by the Earth, and the 16 machines marked where they are (four on the Moon, seven on
  Mars, NEAR on Eros, Dawn at Ceres, Kepler behind the Earth, Pioneer and Voyager far out). Drag to turn, wheel or keys to
  zoom, reduced motion. Hotspots named by episode id. Labels: sizes are not to scale; a probe whose position is not
  computed says "approximate". (FR-70 to FR-73, AC-18)
- [x] (Sun 17:35; captures in `docs/captures/b1/`, the route checks 16 markers and that a marker opens its file) B-42 **The map is the Orrery.** In `src/screens/`: every machine is a real `<button>` anchored to its hotspot that opens its
  file; restored ones are marked; the golden thread joins them in launch order (`content.threadOrder`); "Follow the thread",
  the center and "Skip to the finale" keep their texts and behaviour. Today's card list stays as the list view: the default
  in Accessible play and without WebGL, one click away otherwise. (FR-01, FR-02)
- [x] (Sun 17:35) B-43 **Title screen on the same set:** the first picture a judge sees is the solar system with the thread, not a page of text.
- [x] (Sun 17:50, built another way: **no file of lane a is touched**) B-44 The travel shot from the Earth to the machine, with
  the real distance of today. It plays **on the map**, when a machine is opened from the Orrery: the camera goes down to the
  Earth and follows a thread to the machine's world, the lower third gives the distance and the light time of today and how
  each was obtained, and then the file opens. One key opens the file at once; with reduced motion, in the list view and
  without 3D the file opens directly. The Passage beat inside `src/episode/` is unchanged.
- [x] (Sun 17:40) B-46 Setup and Credits are a column of words over the same sky as the title, not a page. Every control and
  every button text is the same.
- [ ] B-45 (team, 5 minutes) **Try the map on real hardware:** the public URL on a laptop with integrated graphics with
  `?fps` (target: 30 or more), and on a phone (drag with one finger, the + and − keys, the List key). Claude cannot do this.
- **AR, a new assignment from the team (Sun 20:10; FR-55 brought back). Lane b is its architect for now; lane a takes it over. Full notes: `src/screens/ar/README.md`.**
- [~] (Fable-b, Sun 20:20) B-50 Real-size models for AR: Ingenuity and Opportunity in metres, measured against NASA's figures, no Draco, no WebP; a test keeps the scale true.
- [~] (Fable-b, Sun 20:20) B-51 One shared viewer (`src/screens/ar/`): miniature and real size, 3D inspection when there is no AR, an observation task with "Show me", every way out when something fails.
- [~] (Fable-b, Sun 20:20) B-52 The gallery and its entries: a direct link (`#ar`), the map and the title. Hidden behind `?ar` until B-53 passes.
- [ ] B-53 (team, 5 minutes, **needs a phone**) Open the gallery on an Android phone and on an iPhone, place both machines, check the real size against a tape measure, come back to the game. Steps and result table in `src/screens/ar/README.md`.
- [ ] B-54 (lane a) "View in your space" inside an episode's menu, with the scene paused and the place in the story kept on return. Touches `src/episode/`.
- [ ] B-55 (lane a + lane astra) The playable story of E11: script and contract proposed by lane b in `src/screens/ar/README.md`; the puzzle, the simulation and the set are not started.
- [ ] B-47 Deferred, needs a phone to judge: frame the Orrery for upright screens; pinch to zoom.
- Rules of this lane: strings in `content/ui/shell.yaml`; styles in a `.css` beside the component; routes in
  `scripts/capture-shell.ts`; `npm run capture -- b<n> thread` green before every push.

### Lane astra · Astra: the 13 files and the submission

- [x] X-01 (Astra, Nov 15 16:48 UTC-5) `docs/submission/`: `summary.md`, `description.md`, `ai-disclosure.md`, `nasa-data.md`, `references.md`,
  `video-script.md` (30 seconds at most). Say what is built and what is not. 30 minutes at most, then the files.
- [x] X-10 (Astra; content and captures, A-30 integration pending) E11 Ingenuity · [x] X-11 (Astra) E07 Spirit · [x] X-12 (Astra) E05 Viking · [x] X-13 (Astra) E12 Pioneer · [x] X-14 (Astra) E14 Kepler ·
  [x] X-15 (Astra) E15 Dawn · [x] X-16 (Astra) E13 NEAR · [x] X-17 (Astra) E10 InSight · [x] X-18 (Astra) E01 Surveyor · [x] X-19 (Astra) E09 Phoenix ·
  [x] X-20 (Astra) E06 Sojourner · [x] X-21 (Astra) E03 ALSEP · [x] X-22 (Astra) E04 Lunar rovers.
  For each, in this order, one file per commit: facts opened and noted → seven beats of text → on stage (recipe in
  `docs/HANDOFF.md`, section 0) → `draft: true` removed → `npm run check` → `npm run capture -- x<n> e<NN>` → push.
  **Push E11 first and say so in "Requests": lane a checks it on the diorama before the rest.**
- [x] X-04 (Astra) `scripts/check-links.ts`: reports every literal content URL, including standalone poetry citations. 75/85 returned 200; ten JPL URLs returned 403. The ALSEP 404 was repaired. Results: `docs/submission/link-report.json`.
- Rules of this lane: never `src/`, `tests/`, `content/ui.yaml`, the Thread files or voices. A fact with no source is
  narrowed or removed. New text stops at 20:00.


## Lanes (since Sun 14:50; ownership by folder is in `CLAUDE.md`)

Claim a task by marking it `[~] (Fable)`, `[~] (Fable-diorama)` or `[~] (Astra)` and pushing that line before coding.
A claim is released only by its owner, in writing. The older "Lane A" and "Lane B" lists below are history plus backlog.

### Lane Fable · Thread and core

- [x] B-27 **E08 Opportunity from Earth: complete** (Sun 15:31, deployed). The winter plan is made by hand on the planning
  station in Explorer and with targets in the scene in Accessible; after sending, three named phases (the command travels,
  the rover drives on its own, the telemetry travels back) with the estimated light time of today and a wait the player
  can skip; the storm seen from the mast; the real orbital photo in Status Now; reduced motion; 39 + 39 captures of both
  modes in `docs/captures/i3/` and `i3-reduce/`. Decisions F-D03 to F-D08. **Not yet played by a person (T-15).**
- [x] F-03 (Sun 15:40: every assertion passed on the production build, 3 min 3 s by script; `npm run capture -- <name> thread`) **The Thread from a clean start:** a `thread` route in `scripts/capture.ts` with empty storage: title → setup →
  prologue → E02 → E08 → E16 → finale, clews earned by playing. Today `run()` preloads progress and clews, so no capture
  proves the progression. Its duration is a technical minimum, not AC-01: the 12 minutes are timed by people (T-06).
- [x] F-02 (Sun 16:00; proven by `npm run capture -- <name> lifecycle`; decision F-D14) **Lifecycle, two confirmed defects.** (a) `PuzzleRunner` awaits `act('fly')`; if the WebGL context is lost during
  an operation the promise never settles and the screen has no way forward (breaks pillar 3). Fix: close the wait when the
  stage stops being `ready`; a cancelled hand-played operation returns to the decision without counting an error and never
  moves the state machine. Reproduce with `WEBGL_lose_context` from the capture script. (b) `SceneHost.dispose()` calls the
  set's `dispose` (which removes its root) before it walks the scene to free geometries, materials and textures, so nothing
  is freed. Fix: walk first. Reproduce by mounting and leaving sets twenty times. Recapture E02 and E16 afterwards.
- [x] B-04b Voices for E16 and E08 (Sun 15:35): 58 new files. **All 102 spoken lines of the game now have a voice file.**
  A line whose text changes is made again by `npx tsx scripts/gen-voices.ts <episode>`, then `npm run content`.
- [ ] A-13 Accessibility pass on the Thread (see Lane A).

### Lane Fable · diorama (taken by the E08 session on Sun 15:36; no second Fable session is needed for it)

- [x] F-01 (Sun 15:55; point 4 moved to F-04; how to add a file is in `docs/HANDOFF.md`, section 0) **The diorama contract: a new file is one YAML and one manifest row, with no engine change.**
  1. `SetFactory` becomes `(host, context?)`. `SetContext = { id, model?, images, options }`: the episode id, the hero model
     declared in YAML (`set.model` → `models[...]`), its images, and free presentation options (`set.options`). `Set3D` takes
     a `context` prop from `CinemaEpisode` and `ScenePlayer`. The four existing sets ignore it.
  2. `SetRef` in `src/content/schema.ts` gains `alt` (one sentence that describes the hero model or image: the text
     equivalent, AX-32) and `options`. Record the change in `docs/DECISIONS.md`.
  3. `src/scenes/diorama/`: the official model on a stand, lit, turning slowly, with drag to look around; or, with no model,
     the real NASA image as an archive plate in the scene. Cues for the seven beats.
  4. An operation without a puzzle plays its explainer **as captions, one step at a time, with camera moves**, not as a list
     (`Explainer` in `src/episode/CinemaEpisode.tsx`), so it passes the screenshot rule.
  5. `scripts/prep-assets.ts` driven by `assets-src/manifest.yaml`: convert when the raw file exists, keep the committed
     derived file when it does not, fail when both are missing. `scripts/build-content.ts` fails when a model or image named
     in content is not in `public/assets/`.
  6. A generic capture route by episode id, so a new file never needs an edit of `scripts/capture.ts`.
  7. Prove it on **two different files** before the rest: E11 Ingenuity (official model `Ingenuity Mars Helicopter`) and one
     file that only has an image. Then tell Astra, in "Requests" of `docs/HANDOFF.md`, that `set:` can be added.

- [x] F-04 (Sun 15:56, proven on E11) An operation without a puzzle plays its explainer **as captions, one step at a time, with camera moves**, not as
  a list (`Explainer` in `src/episode/CinemaEpisode.tsx`). Needed before a diorama file with `operation.explainer` leaves
  draft: today that beat would look like a documentation page (AC-15). Until then such files stay `draft: true`.

### Lane Astra · content

- [ ] X-01 `docs/submission/` (= B-07): `summary.md`, `description.md`, `ai-disclosure.md`, `nasa-data.md`, `references.md`,
  `video-script.md` (30 seconds maximum). Facts and sources come from `content/`; say what is built and what is not.
- [ ] X-02 **Text and facts of the 13 files** (= the text half of B-05), in this order: E11, E09, E07, E14, E12, E01, E03, E04,
  E05, E06, E10, E13, E15. Copy the shape of `e16-voyager1.yaml` without `set`, `cues`, `console` and `puzzle`: objectives,
  facts (each one opened and noted), arrival, `operation.explainer` (3 to 5 steps of how it really worked), discovery,
  silence, statusNow, epigraph only from a poem published before 1929. **Keep `draft: true`.**
- [ ] X-03 For each of the 13 files, find the official model in `https://github.com/nasa/NASA-3D-Resources` or one NASA
  image with its credit line and page. Write the candidates as YAML comments at the top of the episode file. Add the
  manifest row and the file only when F-01 has landed.
- [ ] X-04 `scripts/check-links.ts` (= B-08): report every source URL in `content/` that does not answer 200.
- [ ] X-05 **Unblocked (F-01 landed).** Put each of the 11 remaining files on stage: recipe in `docs/HANDOFF.md`, section 0.
  E11 and E01 are done as proving files. F-04 has landed: a file may leave draft when its text is complete.

## Lane B · Machines, consoles, content, assets

**Done**
- [x] B-01 Machine setup.
- [x] B-11 Contract v1.1 + compiler gates. (FR-29, AC-17, CR-13)
- [x] B-12 `src/three/` SceneHost. (NFR-13)
- [x] B-13 `src/scenes/tranquility/`. (10.6.1)
- [x] B-14 Cinema layout. (AC-15, AX-10, AX-31)
- [x] B-15 E02 content, every fact read against its source.
- [x] B-16 `npm run capture`, two routes. (AC-15)
- [x] B-17 Descent simulation + tests. (FR-21, FR-29)
- [x] B-18 `src/input/controls.ts`: keyboard, on-screen stick, gamepad. (8.0)
- [x] B-20 Explorer descent wired to the state machine; teach and retry; show me; guided choices. (FR-29a)
- [x] B-21 Lunar dust (`src/three/particles.ts`) and the rain of light (`src/episode/RainOfLight.tsx`). (10.3, FR-04)
- [x] B-22 `src/audio/bus.ts` + procedural effects; Sound and Mono toggles. (FR-33, FR-34)

**I1c (07:30–09:30)**
- [x] B-23 **Finale telescope.** `src/scenes/telescope/` (the Moon in the eyepiece, then the real orbital image
  `img_e02_site_noon.webp` as the aiming map, labelled as an orbiter image) + `src/consoles/TelescopeConsole.tsx` (slew,
  zoom, focus, hold to fire) + `src/sim/ranging.ts` (outcomes already declared in `outcomes.ts`: `on-mirror`, `on-stage`,
  `on-ground`). Update `content/finale.yaml`: add `set`, cues, `sim: ranging` with `when`/`target` on the `aim` state, and
  reword `aim-shadow` so it fits "anything that is not the mirror or the stage". Photons: thousands leave, a few return;
  the clock reads 2.5 s (the real wait is fine: it is not a time limit). Make `ScenePlayer` use the cinema layout when
  the scene has a `set` (today it is still the text layout). (5.4, AC-13)
- [x] B-24 Finale staging: revelation facts as captions, the monologue, the "Daisy Bell" hum that slows down (synthesise
  it: public domain, 1892; never the 1961 recording), the final pulse, the closing line. (5.4, 15.3)
- [x] B-04 **Voices** for the prologue, E02 and the finale: 44 files in `public/assets/vo/` (the team added credits).
  **Still to make: E16** (`npx tsx scripts/gen-voices.ts e16-voyager1`, then `npm run content`) **and E08** when its text is final.
  Original task: `content/voices.yaml` (speaker → ElevenLabs stock voice id) + `scripts/gen-voices.ts`: reads
  `voiceLines(content, only)` from `src/content/voice.ts`, `--dry-run` prints the character count, cache by text hash,
  writes `public/assets/vo/vo_<id>_en.mp3`. Read the key from `.env`; never print it. Check the current ElevenLabs API
  docs first (`GET /v1/voices`, `GET /v1/user/subscription` for the quota). If ffmpeg exists, add the ID3 comment
  "AI-generated voice (ElevenLabs)" and normalise loudness; if not, skip that step. First batch: `prologue`,
  `e02-apollo11`, `finale` (about 5,000 characters). (10.5, 15.4, R-08)
- [~] B-19 The DSKY graphic for the 1202 alarm decision, with the guarded ABORT. Only if I1c closes early. (10.6.2)

**I2 (09:30–11:30)**
- [x] B-28 **E16 Voyager 1** (done Sun 10:05; the "Pale Blue Dot" shot is the `portrait` cue; no `?date=` override yet). Content first: `content/episodes/e16-voyager1.yaml` is a draft with 3 facts, two from
  secondary sources. Find NASA/JPL sources, write the seven beats, the puzzle "The Glitch" (archetype F+I), `clew-3`
  "Distance is time". Then `src/scenes/dsn/` (official `Deep Space Network 70-meter.glb`, 1.9 MB, and
  `Voyager Probe (A).glb`, 286 KB) + `src/consoles/DsnConsole.tsx` (azimuth, elevation, lock, send a command) +
  `src/sim/dsn.ts`. Distance and light time computed for the device date with astronomy-engine or a fixed state vector;
  `?date=` override; a test. Copy must work before, on and after Nov 18, 2026 (A-D14). (FR-40, AC-10, FR-60)

**I3 (11:30–13:00)**
- [ ] B-27 **E08 Opportunity from Earth.** The state machine in `e08-opportunity.yaml` stays. Add `set`, cues and a
  planning station: `src/scenes/meridiani/` (official `MER-B` model, 37 KB; terrain: a real orbital image draped the
  same way as Tranquility, or a labelled approximation) + `src/consoles/PlanStation.tsx` (waypoints, energy, one
  sequence per sol, telemetry that arrives after today's real light delay, shown as a countdown the player may skip).
  **No tau slider, no human on Mars, no real-time joystick.** (10.6.1, FR-60, FR-62)

**I4 to I6**
- [ ] B-07 `docs/submission/`: summary, description, AI disclosure, NASA Data list, references, 30-second video script. (R-03, R-07, R-08)
- [ ] B-29 `src/scenes/diorama/`: one generic set for the other 13 machines: official model (Viking Lander, Pioneer 10,
  NEAR Shoemaker, Kepler, Dawn, Ingenuity, InSight are in NASA-3D-Resources) or a real image on a plate, orbit
  inspection, annotated `REAL` parts. (10.6.1)
- [ ] B-05 The 13 remaining episodes complete, non-draft, each with `set: { scene: diorama, ... }`. Order: E11, E09,
  E07, E14, E12, E01, E03, E04, E05, E06, E10, E13, E15. Text by 15:00. (AC-07, M6)
- [ ] B-25 `src/hands/`: MediaPipe Hand Landmarker (lazy, model served from our origin), One Euro filter, gesture
  classifier + `tests/hands/`. It only has to: move a cursor and click the DOM element under it on a pinch; call
  `controls.setPitch('hands', v)` from a fist; `controls.click()` from pinch on the rate buttons. `?hands=sim` feeds
  recorded landmarks. (11.3, AC-14)
- [ ] B-02 Fact verification pass: every `note: VERIFY`, the 15 items of section 18.1, and **every source that points to
  `nasa.gov/history/alsj/`** (moved to `apollojournals.org/alsj/`). Never fill `verified:` (humans only). (CR-02, CR-12)
- [ ] B-08 `scripts/check-links.ts`. (CR-02)
- [x] B-30 Read aloud with the browser's own speech for text without a voice file. (AX-33)
- [ ] B-31 Procedural leitmotif per act. (10.5)

## Lane A · Cosmos, station, shell

- [x] A-23 **Setup screen:** Explorer / Hands / Accessible first (strings `play.*` are already in `content/ui.yaml`, the
  setting is `settings.play`), then the options. Hands is offered only when B-25 exists. Accessible keeps the input
  method radios. (AX-01)
- [x] A-28 **Prologue on the telescope console** (after B-23 is pushed): `content/prologue.yaml` gets `set: telescope`,
  the "Tune the station" puzzle is replaced by sending the midnight pulse with the same console the finale uses.
  88 rival projects tune a radio: do not. (5.3)
- [ ] A-20 `src/scenes/orrery/`: solar system with today's real positions (`npm i astronomy-engine`, lazy chunk; Moon
  and Earth textures are already in `public/assets/tex/`), every machine marked, orbit, zoom, select → episode,
  "Visible scale / True scale" with its label, list view as the Accessible equivalent. It replaces the card map
  (`MapScreen` in `src/screens/screens.tsx`), which stays as the list view. (FR-70 to FR-73, AC-18)
- [x] A-25 (Sun 16:06: screen and `CREDITS.md` are generated; an asset without a manifest row fails the build) Credits screen and `CREDITS.md` generated from data: `assets-src/manifest.yaml` already lists every image,
  model and texture with credit and licence. (NFR-08, CR-11)
- [ ] A-13 Accessibility pass on the Thread: keyboard only, one button, 200% text, high contrast, reduced motion
  (`npm run capture -- <name> reduce`), screen reader labels, mobile layout of the cinema lower third. (AC-04, AC-06, AC-11)
- [~] A-02 One-button scanning (`src/engine/input/scan.ts`): re-verify inside the cinema layout. Targets anchored in the
  scene are real buttons, so scanning should reach them; the lunar module stick is not scannable, which is why
  Accessible uses targets instead. (AX-14)
- [ ] A-21 Passages as directed Orrery shots, with the two real scales computed for today. (FR-30 to FR-32)
- [ ] A-24 "Pale Blue Dot" coda and the shot down to the player's sky. No Sagan text. (FR-74, FR-75)
- [ ] A-26 `src/scenes/sky/` Look Up: planetarium, then sky AR on a phone. **Only if the Thread passed the 13:00 cut rule.
  On a phone before 18:00 if it goes in the video.** (FR-50 to FR-54)
- [ ] A-11 Postcard: 3 fragments × 3 options, procedural canvas, PNG download. (5.4.7)
- [ ] A-15 Turn "no episode is still a draft" into a hard gate once B-05 lands. (AC-07)

Dropped: A-03, A-04, A-16 (2D stage primitives and card map: replaced by 3D sets), A-22 walkable Knossos (cut ladder 1),
A-27 Gaze (no time; it stays in the pitch as the next step).

## Team (humans)

- [ ] T-00 **Copy `para_fable/` from machine B to machine A.** It is git-ignored. Machine A still has requirements v1.0;
  v1.1 and `PROMPT_FABLE_CORRECCION_VISUAL.md` exist only on machine B.
- [ ] T-01 Confirm three creative decisions: the ARIADNE acronym; keeping "Not like tears in the rain" in the monologue; voices as declared text-to-speech.
- [ ] T-02 Rewrite and approve all text in your own voice. Text freeze Sunday 15:00. E02 is ready for you now. (R-09)
- [ ] T-03 Verify every REAL fact against its source and sign `verified: <initials>` in the YAML. E02 has a `note:` on
  each fact saying what was checked and where. Anything unverified at 15:00 is reworded as IMAGINED or removed. (CR-12)
- [x] T-04b ElevenLabs quota: the team added 30,000 credits on Sun 09:40. About 4,800 were used; E16 and E08 need about 4,000 more.
- [ ] T-04 Listen to the generated voices once B-04 lands. To change one, edit `content/voices.yaml`. Adult stock voices only. (R-05)
- [ ] T-06 Timed playtest of the Thread with 3 adults (never minors). Record the median. (AC-01, M1)
- [ ] T-07 **Submit the form at 14:00 Sunday** with the build of that moment; resubmit the final at 22:30. (R-01)
- [ ] T-08 Film the real Moon at dusk (18:20–19:30) and cut the demo video, 28 seconds maximum, English subtitles. (R-03)
- [ ] T-09 Check that every member appears in the team's Members tab. (R-10)
- [ ] T-10 Open the public URL in a private window, on another network and on a phone. (AC-08)
- [ ] T-11 Test Hands with a real laptop webcam once B-25 is deployed. Claude cannot test a camera. (AC-14)
- [ ] T-12 Test Look Up on a phone before 18:00, if it was built. (FR-51 to FR-54)
- [ ] T-13b **Replay the landing of E02** after the fixes of Sun 09:55 and say if the goal and the controls are clear now.
- [ ] T-13 **Play E02 now** on a laptop with an integrated GPU: https://josmart04.github.io/ariadne/?fps#e02-apollo11 and
  write the frame rate here. Fly the landing by hand (W / S, R / F). Say what felt wrong. (AC-16)
- [ ] T-14 Review the captures in `docs/captures/i1d/` and `docs/captures/i1e/` against the screenshot rule. (AC-15)
- [ ] T-15 **Play E08 Opportunity** (https://josmart04.github.io/ariadne/#e08-opportunity) in Explorer and say whether the
  planning station is clear: do you know what to do, what "enough" means, and what happens after you press Send?
- [ ] T-16 Review the new text and facts of E08 (changed after the 15:00 freeze because the set needed it): each fact has
  a `note:` with the sentence that was checked. The myth check was removed for lack of a source (decision F-D08).
