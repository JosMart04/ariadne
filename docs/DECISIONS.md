# Decisions

Frozen decisions and every deliberate departure from the requirements document.
Append to your own section. Format: id · decision · why.

## Front A · Engine (iteration 0)

Read these together with the course correction below: C-D02 supersedes A-D04, A-D05 and A-D16, and amends A-D06 and A-D07.

- **A-D01 · Stack:** Vite 8, React 19, TypeScript 7, Zustand, Zod 4 (build time only), Vitest, plain CSS with tokens,
  self-hosted OFL fonts (Cinzel, Atkinson Hyperlegible, IBM Plex Mono). Why: lowest risk, no runtime services, no cookies.
- **A-D02 · Hosting:** GitHub Pages through GitHub Actions, relative `base`, hash routes (`#e07-spirit`).
  Why: no new accounts, HTTPS for camera and motion permissions, deep links without server rewrites.
- **A-D03 · A puzzle is data.** Every puzzle is a finite state machine in YAML. One interpreter (`PuzzleRunner`) plays all of them;
  the same graph feeds the reachability test and "Let the machine show you". Why: pillar 3 becomes a build gate, and a new
  puzzle costs content, not code.
- **A-D04 · The Operation ships in three layers:** explainer steps → FSM in the generic choice view → visual stage.
  The generic view is also the text equivalent required by AX-31. Why: every machine is playable from the first deploy.
- **A-D05 · Six stage primitives cover the nine archetypes:** `hotspots` (B, E), `gauge` (D), `cards` (D, G, H), `trace` (F),
  `grid` (C), `sequence` (A, I), plus `figure`. Why: section 8.1 asks for a small set of parameterised components.
- **A-D06 · "Let the machine show you" marks the correct option and disables the others; the player still confirms each step.**
  Changes FR-24 ("solves the puzzle with animation"). Why: no auto-advancing timers (WCAG 2.2.1/2.2.2), and the player sees the path.
- **A-D07 · Everything interactive is a native `<button>`, `<a>` or form control.** Scanning and head pointing act on the DOM.
  Why: one input layer for five input methods (AX-10 to AX-15) with no per-screen code.
- **A-D08 · Focus rule:** after a puzzle move, focus lands on the non-actionable puzzle view; inside line beats it stays on Continue.
  Why: a repeated key press can never choose an answer by accident, and line beats take one key per line.
- **A-D09 · Languages:** English text lives inline in the YAML with stable ids; other languages will be overlays in
  `content/i18n/<lang>/`. Interpretation of NFR-06. Why: half the authoring cost, same separation of content and code.
- **A-D10 · Episodes are never locked.** Only the finale waits for the three key episodes, and "Skip to the finale" asks first.
  Why: Archive deep links for teachers (6.1), and FR-11.
- **A-D11 · Field File is optional at the end of every episode,** on every route, instead of a separate condensed mode.
  Why: one flow for Thread, Labyrinth and Archive; keeps the Thread near 12 minutes.
- **A-D12 · The repository is English only.** The Spanish requirements and the rival analysis stay local (`para_fable/`, git-ignored).
  Why: the rules require English in all linked material (R-02).
- **A-D13 · Epigraphs are limited by the schema** to 4 lines and works published before 1929. Why: section 15.2 as a build gate.
- **A-D14 · Voyager copy is date-aware** (before / on the day / after one light-day), computed on the device.
  Changes the fixed line "In 3 days…" of 5.4.8. Why: judges play after Nov 18, 2026.
- **A-D15 · Music is procedural (Web Audio), "Daisy Bell" is a synthesised hum, read-aloud uses the browser's speech.**
  Why: no licences, no extra assets; ElevenLabs is used only for scripted lines, at build time.
- **A-D16 · Deferred to T2:** 3D models (`model-viewer`), city sky on the postcard. T1 postcard shows tonight's real Moon phase
  and Voyager's light-time. Changes 5.4.7. Why: 3D is not the hook (10.1); the sky arrives with Look Up.
- **A-D17 · First real submission Sunday 14:00,** final at 22:30. Why: the form can be resubmitted; removes deadline risk (R-01).
- **A-D18 · No audio normalisation at build time.** Why: no ffmpeg on the build machine; per-channel gain at runtime instead.

## Course correction v1.1 (Sun Nov 15, 00:15 UTC−5 · account B leading both fronts)

Approved by the human team after reviewing the iteration-0 build. Requirements v1.1 replace v1.0 where they conflict.

- **C-D01 · Explorable 3D, faithful consoles and direct interaction are core, not T2.** Why: the iteration-0 build reads as
  a quiz website. 154 quiz projects and 163 museum projects compete in this challenge, and the challenge asks teams to
  "show how missions operated". Here the 3D is operated, not only looked at.
- **C-D02 · Supersedes A-D04, A-D05 and A-D16.** The visual layer is no longer "layer three". The generic choice view stays
  only as the no-WebGL fallback and the screen-reader equivalent; the 2D primitives stay only as HUD parts (`gauge`).
- **C-D03 · One simulation, three views (FR-29).** The YAML state machine stays the only logic. `PuzzleState.sim` names the
  continuous control that plays a decision, `Choice.when` names the simulation outcome that equals that choice, and
  `Choice.target` names the scene hotspot that shows the choice in Accessible. Gate: the outcomes each simulation declares
  in `src/sim/outcomes.ts` are covered one to one. Why: Explorer cannot reach a transition that Accessible lacks, so the
  reachability test still proves "never stuck" for every mode.
- **C-D04 · Play modes.** Settings gain `play: explorer | hands | accessible`. `input` (pointer, keyboard, switch, head)
  is the method inside Accessible. "Point and choose, max 3 options, no dragging" is the contract of Accessible only.
  Changes pillar 4 of v1.0, which applied it to the whole game.
- **C-D05 · Plain Three.js in lazy chunks, no React Three Fiber.** Why: an imperative fixed-step loop, a smaller bundle and
  fewer React 19 unknowns. Each set is a folder under `src/scenes/<id>/`, found with `import.meta.glob`, so there is no
  shared registry file for two sessions to edit.
- **C-D06 · Consoles are DOM, the world is WebGL.** The DSKY, the lunar module panel and the telescope console are HTML/SVG
  with native buttons. Why: keeps A-D07. Keyboard, screen readers, scanning and the Hands cursor operate them with no
  per-screen code.
- **C-D07 · Hands is a virtual cursor plus axes.** A pinch clicks the element under the cursor; fist-and-move drives the same
  `Controls` axes as keyboard, touch and gamepad. Gestures are classified from landmarks by pure, tested code.
  Why: one implementation serves the DSKY, the descent and the laser.
- **C-D08 · "Let the machine show you" in 3D is a scripted controller flying the same deterministic simulation,** started by
  the player with one press. Amends A-D06: an animation is allowed when the player starts it; text still never
  auto-advances. After two skill failures "Switch to guided choices" also appears (FR-29a).
- **C-D09 · The vertical slice is E02 Apollo 11 plus the finale, not E08.** Why: a direct competitor already ships
  "Opportunity + dust storm + walking on Mars" in 3D, and E02 plus the finale are the heart of our mystery. E08 becomes
  Earth-side planning with the real light delay, and has no tau slider.
- **C-D10 · Operational fidelity is checked by the build.** Every console control is `REAL` (cites a fact) or `IMAGINED`.
  No human appears on Mars or in deep space. An unreal convenience is labelled `SIMULATION` and followed by the real
  control loop (FR-60 to FR-63, AC-17).
- **C-D11 · Artistic licences are labelled on screen** from a fixed list in content (`set.labels`): reconstruction,
  terrain-approximated, artistic-view, not-to-scale, time-compressed, simulation (CR-13).
- **C-D12 · The screenshot rule is a gate (AC-15).** A beat is not done while a capture of it could be mistaken for a form,
  a quiz or a documentation page. Captures live in `docs/captures/<iteration>/` and come from `npm run capture`.
  `#shot/<scene>/<cue>` opens any scene without saving progress; it is also the judge preview.
- **C-D13 · Assets.** Official NASA GLB models (NASA-3D-Resources), LROC imagery, NASA SVS textures. Terrain is procedural
  and deterministic, labelled "Terrain approximated from NASA imagery", unless a real elevation model fits the time
  budget. No AI-generated images.
- **C-D14 · Ownership moves from "engine vs content" to folders** (table in `CLAUDE.md`). Why: with 3D scenes the old split
  would make both sessions edit `src/`.
- **C-D15 · Cut rule.** When time runs short, playable episodes are cut, never the visual quality or the interaction of
  what is shown. A key episode without a finished 3D operation ships as a file with an inspectable model and an explainer
  animation, never as a text quiz.
- **C-D16 · Schedule re-based on Sun 00:15** (see `docs/HANDOFF.md`). Replaces the I1 to I3 times of iteration 0.
  A-D17 stays: first submission at 14:00.
- **C-D17 · Voice files may be loudness-normalised when they are generated** (ffmpeg exists on machine B).
  Amends A-D18 for voice files only; the build still needs no ffmpeg.

## Front B · Machines, consoles, content, assets

Decisions taken while building the vertical slice (Sun 00:20 to 07:30).

- **B-D01 · The ground of Tranquility Base is the real orbital photograph** (PIA12925, 0.533 m per pixel), draped at true
  scale. Craters are placed where the image shows them, with estimated depths. Why: real terrain without a 300 MB
  elevation model. The set says "Terrain approximated from NASA imagery". `src/sim/tranquility.ts` holds the numbers
  and is shared by the simulation and the 3D set, so what the player flies over is what the simulation judges.
- **B-D02 · The descent simulation copies landing program P66:** the hand controller tilts the lander, a descent-rate
  switch asks the computer for a sink rate, the computer works the throttle. Why: FR-60. Our descent-rate switch is a
  simple stand-in and is labelled `IMAGINED`; program 66 and the hand controller are `REAL` and sourced.
- **B-D03 · A touchdown that is too hard is not an outcome of the puzzle.** The state machine does not move; the view
  teaches the limit and restarts about ten seconds earlier (FR-29a). Why: the three outcomes of the decision stay the
  same in every mode (C-D03), and a slip of the hand never costs the whole flight.
- **B-D04 · In Accessible the scripted flight plays at three times real speed and can be skipped; with reduced motion it
  is skipped.** In Explorer the player always flies in real time (about 85 s). Why: FR-28 and AX-30.
- **B-D05 · Real people are never voiced by a generated voice.** Armstrong, Aldrin and Mission Control stay as captions,
  or ARIADNE reports their words inside her own narration. Why: contest rule (no cloned or imitated voices).
  `src/content/voice.ts` skips every speaker that is not in `content/voices.yaml`.
- **B-D06 · Every spoken text has a stable id assigned by the compiler** (`<episode>.arrival.0`, `<episode>.op.<state>`,
  `<episode>.discovery.story.2`, `clew.clew-1`, ...). The game and the voice script share `src/content/voice.ts`.
  Why: NFR-07; voice files arrive without touching code, and a missing file is silent (FR-34).
- **B-D07 · "Tell me more" is a sequence of captions with camera cues, not a text panel.** `discovery.story.cues` names
  what the set shows for each caption. Why: the first version looked like a documentation page (AC-15).
- **B-D08 · Sound is synthesised (Web Audio), in four channels, and starts after the first interaction.** There is no
  sound on the lunar surface: only cabin, radio and station sounds exist. Why: A-D15, FR-33, and the physics we teach.
- **B-D09 · Captures are JPEG, 1280×720, made by `npm run capture` in the installed Chrome**, one real click included so
  audio code runs. Two routes: Accessible (every beat) and Explorer (the flight by hand, driven by a scripted "hand"
  that moves the on-screen stick). Why: AC-15 needs pictures of the real thing; PNG would add 30 MB per run.
- **B-D10 · `?q=low|medium|high` forces 3D quality, `?fps` shows the frame rate, `?dev` exposes `__stage` and `__controls`.**
  Why: captures, AC-16 measurements by the team, and tests that fly like a player. No secret is exposed.
- **B-D11 · Eagle faces west, the Sun is 10.8° above the east, the Earth is 1.9° wide and high in the west, there are
  no stars on the surface.** Why: "accuracy is important throughout"; each of these is how it was on July 20, 1969.
- **B-D14 · The landing was rebuilt after the team's playtest (Sun 09:40): "I always lose, even at 0.3 m/s".** A touchdown
  failed on forward speed while the message blamed the descent, and the starting descent was already over the limit.
  Now every hands-on task follows one rule: **state the goal, show every limit all the time, say what to do next, and let a
  player who does nothing wrong win.** Limits are 3.5 m/s down and 2.5 m/s forward; a coach line, a three-step brief, a
  labelled landing ring, a miss message with the player's own numbers, a retry from higher up, and guided choices offered
  from the start. A steadying assist cancels the last of the drift when the stick is released; it is declared `IMAGINED`
  because Armstrong did that by hand. Each console has a `Brief` (`src/consoles/index.tsx`).
- **B-D15 · A new clew is revealed in the lower third, without a box** (`ClewReveal`), so the picture stays in view; the
  Logbook keeps the card. Words that somebody says, real or imagined, are set in Cormorant Garamond italic (OFL);
  narration and records stay in Atkinson Hyperlegible. Why: the team found the box ugly and in the way.
- **B-D16 · E16 is operated the only way Voyager is operated: by pointing an antenna on Earth.** The player matches the
  predicted azimuth and elevation and listens; the coordinates are illustrative and say so, the distance and light time
  are NASA's. The puzzle is the real 2023 to 2024 chip fault. Its last question (how long until you know?) is clew III.
  `src/sim/dsn.ts` also gives the light time for any date, for copy that works before and after Nov. 18, 2026 (A-D14).
- **B-D13 · Voice has two layers.** A line with a file in `public/assets/vo/` plays that file. A line without one is read
  aloud by the browser's own speech, on the device (AX-33), with pitch and pace per speaker. The compiler lists the files
  that exist (`content.voiced`), so the game never requests a missing file. Why: the ElevenLabs key had 50 credits left
  of 10,000 on Sun 07:46, and the Thread needs about 4,800 characters; the game must not be mute while the team finds quota.
  A real person's words are read in the neutral narrator voice.
- **B-D12 · Schedule re-based again on Sun 07:30, after 4 h 20 min lost to a usage limit** (table in `docs/TASKS.md`).
  The cut ladder is applied in advance: Knossos Station is a console set, not a walkable room, and the prologue is
  staged on the same telescope console as the finale. Order of work: finale, then E16, then E08, then the Orrery.
  Why: the 13:00 cut rule is about the Thread route being playable end to end.

## Lane Fable · Thread and core (from Sun Nov 15, 14:50)

- **F-D01 · Lanes replace fronts.** Several AI sessions (Claude Fable, GPT Astra) may work at once. One owner per file,
  a claim is pushed before coding and is released only in writing, each session works in its own clone (`CLAUDE.md`).
  Why: two agents of different makers share no memory; only the repository can coordinate them.
- **F-D02 · Schedule re-based on Sun 14:50.** The plan of this session waited for approval from 10:55 to 14:45, so the
  13:00 cut rule, the 14:00 first submission and the 15:00 text freeze passed. Frozen: Hands, Look Up, Gaze, every T2
  operation and the Orrery (the card map stays). E08 text changed after 15:00 because the set needed it; the team reviews it.
- **F-D03 · E08 is operated the only way a Mars rover is operated: planned from Earth.** The player places a waypoint and
  sends one sequence. Then three things happen, each named on screen: the command travels, the rover drives on its own,
  the telemetry travels back. The outcome is fixed when the sequence leaves; skipping a wait only shortens the show.
  There is no joystick, no tau control and no human on Mars (FR-60 to FR-62). The storm is watched, never steered.
- **F-D04 · The ground of E08 is a reconstruction, and says so.** It is a procedural plain with one crater, not an
  elevation model and not draped with an orbital image, so the label is `reconstruction`, not `terrain-approximated`.
  `src/sim/meridiani.ts` holds the heights and the shadow test; the set builds its mesh and bakes its shadows from
  them, so what the player sees is what the simulation judges (same principle as B-D01).
- **F-D05 · The winter Sun of E08 stands 20 degrees high. That is illustrative,** and the Field File says so. At
  Opportunity's latitude the real winter Sun is higher at noon; a low Sun makes slope and shadow readable. The lesson it
  carries is sourced: NASA says the north-facing outcrop Greeley Haven "optimizes Opportunity solar energy as winter approaches".
- **F-D06 · The light time on the planning station is an estimate for the device's date,** from JPL's approximate planet
  elements (valid 1800 to 2050). It is tested against four close approaches published by NASA (within 1.5 %) and three
  landing-day light times away from close approach (within 2 %). The screen says "estimated", "today" and "one way";
  it never claims the geometry of 2018. The date is an argument of the function, so tests and captures are reproducible.
- **F-D07 · Energy percentages are teaching values, not telemetry.** The meter says "illustrative". A puzzle state of
  `kind: scene` may now carry `label`, `value`, `unit`, `note` (a meter over the scene) and `tau: true` (a live readout
  from the set). They are readouts, never controls. Additive: no other episode uses them.
- **F-D08 · A claim without a source is narrowed or removed, never relabelled IMAGINED.** In E08: the myth check about
  the rover's "last words" was removed (no source opened for how the sentence was made); "gypsum veins" became NASA's
  own sentence about ancient water at Endeavour Crater; "a normal day is tau 0.5" and the Feb. 13, 2019 date were
  removed; the "whirlwind" became wind, which is what NASA reports; `status.where` names only Perseverance Valley.
  IMAGINED is kept for the machine's voice and for game conventions (the waypoint and the forecast of the console).
- **F-D09 · `scripts/prep-assets.ts` keeps a committed file when its raw download is not on the machine, and fails when
  neither exists.** Why: it used to stop on any machine without the raw files of E02.
- **F-D10 · Reduced-motion captures include E08's Explorer route.** Why: its planning station works the same with
  reduced motion (the drive is not animated; the three phases still appear). The other Explorer routes are still
  captured only in full motion.

- **F-D11 · A set is handed the content of its file (`SetContext`), so one set serves many files.** `SetFactory` is now
  `(host, context)`; the context carries the file's id and name, its hero model or image, a written description (`alt`)
  and free `options`. Contract change in `src/content/schema.ts`: `set` gains `image`, `alt` and `options`. The four
  sets with a place of their own ignore the context. Why: with the old contract every set loaded its model by a name
  written in code, so each of the 13 remaining files would have needed engine work. Now a file is one YAML and one
  manifest row. Proven on two files, one with a model (E11) and one with a photograph (E01).
- **F-D12 · The compiler fails when a model or image named in content is not on disk,** and when a diorama file has no
  hero or no description. `scripts/prep-assets.ts` is driven by the manifest and can download from NASA hosts only
  (`--fetch`). Why: a second agent adding files must not be able to ship a build that asks for a missing file.
- **F-D13 · The Thread is checked from a clean start by `npm run capture -- <name> thread`.** It plays title, setup,
  prologue, the map's own "Follow the thread" three times, the center and the credits, and asserts what is saved after
  each step. Run on the production build on Sun 15:40: every assertion passed, 3 min 3 s by script. That time is a
  technical minimum; the 12 minutes of AC-01 are still to be timed with people.

- **F-D14 · A cancelled operation is never an outcome and never leaves the player waiting.** `PuzzleRunner` closes the
  wait for a set when the stage stops being ready. An operation of the player that was cut short returns to the decision,
  counts no error and does not move the state machine; a scripted run that was cut short keeps the choice the player made.
  "Restart 3D" gets a fresh canvas, because a canvas whose context was lost cannot be given a new one. `SceneHost.dispose()`
  now frees geometries, materials and textures before the set takes its root out of the scene (it used to walk an empty
  scene). Why: both were found by an outside review and confirmed in the code; the first broke pillar 3. Measured after
  the fix: a set that held 14 geometries and 3 textures holds 0 and 0 after the player leaves it.

- **F-D15 · Credits are generated, never written by hand.** The compiler reads `assets-src/manifest.yaml` and
  `content/voices.yaml` into `content.credits`; the Credits screen and `CREDITS.md` are printed from it. A model or image
  that content names without a manifest row fails the build, and so does a row without title, credit or licence.
  Why: with several agents adding assets, a hand-written credits page would fall behind, and an uncredited NASA asset
  or an undeclared generated voice is a contest risk (CR-11, R-08).

- **F-D16 · Three lanes, checked by a program (Sun 16:30).** Machine A (Fable) integrates and finishes the ending, machine B
  (Fable) builds the Orrery and the shell screens, Astra writes and stages the 13 files. Every path has one lane
  (`lanes.json`), and `npm run lane -- <lane>` fails before a push that holds a file of another lane. To make that
  possible: interface strings may live in `content/ui/*.yaml`, one file per lane; `scripts/capture.ts` calls the routes of
  `scripts/capture-shell.ts`; `CREDITS.md` no longer lists fact sources, so writing text never changes it. The schema, the
  set contract and the button texts of the Thread check are frozen for this phase. Proposed clock: new work and text stop
  at 20:00, final build 21:15. Why: a rule that only people remember does not hold with three agents and five hours.

## Lane b · machine B (decisions of this lane go here)

- **b-D01 · The map compresses distance and says so.** Every body keeps its true direction; its distance from the Sun is
  drawn as `ln(1 + au / 0.25)` (`compress` in `src/sim/planets.ts`), so a farther body is always drawn farther. Why: to
  scale, with Voyager 1 at the edge of a screen, the Earth is two pixels from the Sun. The screen carries "Distances
  compressed" and "Sizes not to scale" at all times (FR-61).
- **b-D02 · Where each thing is, and how good that is.** Planets: JPL's approximate elements, table 1 (read on the page on
  Nov. 15, 2026; the rows of the Earth and Mars are the same as in `src/sim/meridiani.ts`, and a test keeps the two
  copies equal). Eros and Ceres: two-body motion from JPL's Small-Body Database, epoch June 2026. The Moon: its mean
  longitude, drawn far from the Earth to be seen. **Kepler, Pioneer 10 and Voyager 1 are approximate and the screen says
  so on each of them:** Voyager's distance is NASA's (`src/sim/dsn.ts`) and its direction is "35 degrees north, toward
  Ophiuchus" (NASA's Voyager FAQ); Pioneer 10 is extrapolated from NASA's last contact in 2003 (12.2 billion km, toward
  Aldebaran) at 2.54 au a year; Kepler is put behind the Earth by its period of 372.5 days (NSSDCA). The tests check the
  planets against published events (Mars in 2003, the transit of Venus of 2012, the great conjunction of 2020).
- **b-D03 · The worlds of the Orrery are painted in code**, from noise with a fixed seed. Why: lane b does not own
  `public/assets/`, a file would need a manifest row of lane astra, and at 60 pixels a painted Jupiter reads as Jupiter.
  Nothing on the map claims to be a photograph.
- **b-D04 · `Pin`, not `Anchor`.** `Anchor` (`src/episode/Set3D.tsx`, lane a) keeps a large choice away from the edges
  and never lets it pass `width - 300px`: right for three big targets, wrong for sixteen small markers, which would come
  off their worlds. `Pin` (`src/screens/Cosmos.tsx`) uses the same public parts (`useStage`, `host.project`,
  `set.hotspot`), so no frozen contract changed.
- **b-D05 · Machines that share a world open in a fan with constant spacing on screen.** The set computes it every frame
  (`fan` in `src/scenes/orrery/index.ts`): the fan turns to the side with most room, a world outside the picture keeps
  its fan whole at the nearest edge (no machine is ever out of reach, no two markers on each other), and from far away
  markers on worlds shrink to dots. Coming closer, the camera turns toward the middle of the Earth and Mars, where eleven
  of the sixteen are.
- **b-D06 · The golden thread joins the machines the player has restored, in launch order; the rest of the path is a
  faint dashed line.** On the title the whole thread shines: it is the promise of the game.
- **b-D07 · The list of cards is the same map as a list.** It is the first view in Accessible play, the view the map
  falls back to without WebGL or after a lost context, and one key away otherwise. The choice is kept under its own
  storage key (`ariadne-map-view`), because the game store belongs to lane a. Markers are 2 rem wide (32 px at 100 %):
  under the 44 px of the list, above the 24 px that WCAG 2.2 AA asks for; the list keeps the large targets.
- **b-D08 · `?date=YYYY-MM-DD` sets the day the title and the map show** (`mapDate` in `src/screens/Cosmos.tsx`), for the
  team's video and for repeatable pictures. Lane a plans the same name for the finale.
- **b-D12 · AR is built on `main`, inside lane b's own folder, behind a switch (Sun 20:15, by the team's decision that lane b
  is the architect of this part while lane a is out of quota).** Why not a branch: AR on a phone needs a public HTTPS
  address, and only `main` is deployed; a branch could never be tried on a phone. The risk is held by three things: the
  viewer loads only when the gallery is opened, the entries stay hidden behind `?ar` until a person has tried a real
  phone, and the Thread check runs before every push.
- **b-D13 · No new dependency: the viewer is Google's `model-viewer` 4.4.0, copied as its own prebuilt file**
  (`src/screens/ar/vendor/`, Apache 2.0, licence beside it, named in the credits). Why: the package asks for
  `three ^0.183` and the game uses 0.187, so `npm ci` would fail on the deploy; the prebuilt file carries its own copy
  and is loaded only in the gallery. Lane a may replace it with a real dependency when it has settled the version.
- **b-D14 · AR models are derived files, in metres, kept apart from the originals** (`src/screens/ar/models/`, made by
  `src/screens/ar/tools/`). The models of the game are fitted to a stand and say nothing about size; the rover's file is
  about five times too large. A derived file has no Draco and no WebP, stands on the ground, and is scaled to NASA's
  published size; `tests/ar/` measures every file on every push. **`lanes.json` gives `tests/ar/` to lane b: the one
  change this lane made to a file of lane a, on purpose and written here.**
- **b-D10 · The journey to a machine plays on the map, not in the episode.** Opening a machine from the Orrery flies the
  camera from the Earth to its world (`act('travel', { to })` on the `orrery` set) while the lower third says how far it is
  today and how long light takes, and says where each number comes from: computed from JPL's elements (Mars, Eros, Ceres),
  NASA's figure (Voyager 1), an average (the Moon, 384,400 km), or approximate (Kepler, Pioneer 10)
  (`fromEarthKm` in `src/sim/planets.ts`). Why here: the Passage beat lives in `src/episode/` (lane a), and mounting a
  second 3D set inside an episode would load the scene twice. `travel` follows the contract of every operation of a set:
  it resolves to `{ cancelled: true }` on a new cue, on `reset` and on `dispose`; the screen also opens the file after six
  seconds whatever happens, so nobody waits on a camera.
- **b-D11 · Setup and Credits sit over the sky of the title.** They are still real forms and real lists (the same inputs,
  the same button texts the Thread check presses); only the page behind them is gone (AC-15).
- **b-D09 · The station bar floats over the title and the map through `.app:has(.cosmos)`** in `src/screens/cosmos.css`,
  the same rules `.app--cinema` has. Why: `src/App.tsx` decides `app--cinema` and belongs to lane a.

## Lane astra (decisions of this lane go here)

- (none yet)

## Pending team confirmation (defaults in use)

- ARIADNE acronym: "Archive for Robotic Instruments And Dormant Network Explorers" (not shown in the game yet).
- The monologue keeps "None of it will be lost. Not like tears in the rain."
- Voices are declared text-to-speech (ElevenLabs stock voices).
