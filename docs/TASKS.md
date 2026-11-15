# Tasks

Status: `[ ]` open · `[~]` in progress (add who) · `[x]` done.
IDs in brackets are requirement ids from the requirements document (v1.1).

**Re-based on Sun Nov 15, 07:30 UTC−5** (`docs/DECISIONS.md`, B-D12). The vertical slice E02 is deployed; the finale,
E16, E08, the Orrery and the 13 files are not started. Read `docs/HANDOFF.md` before taking a task.

## Iterations (UTC−5)

Each iteration ends deployed, with the gate green, captures committed and `docs/HANDOFF.md` updated. Each one could be submitted as it is.

| It. | Window | What is deployed | Gate |
|---|---|---|---|
| I0 | done | Machine ready, decision and plan recorded | ✓ |
| I1a | done 02:55 | 3D core, Tranquility Base set, cinema layout, E02 complete in Accessible | ✓ 36 captures |
| I1b | done 07:22 | E02 flown by hand in Explorer, lunar module panel, dust, rain of light, sound, voice ids | ✓ 36 captures |
| I1c | 07:30–09:30 | **Finale in 3D:** telescope console on the real orbital image, laser photons, measurement, monologue. Voices for ARIADNE (E02 + finale). Explorer / Hands / Accessible on the Setup screen | AC-13 on the finale |
| I2 | 09:30–11:30 | **E16 Voyager 1:** content complete + DSN antenna set + "Pale Blue Dot" shot. **Prologue** restaged on the telescope console (no "Tune the station") | captures |
| I3 | 11:30–13:00 | **E08 in 3D:** planning station on Meridiani, real light delay. Thread route complete | **13:00 cut rule** |
| I4 | 13:00–14:00 | Submission build: credits, README, AI disclosure, `docs/submission/`, accessibility pass on the Thread | **14:00 first submission** |
| I5 | 14:00–17:00 | Orrery as the map (today's real positions) · the 13 files with a model or real image on stage (text by **15:00**) · Hands basics · Look Up only if the Thread passed the cut rule | **17:00 feature freeze** |
| I6 | 17:00–22:30 | Fixes only: performance on real hardware, final captures, video support | **22:30 final submission** |

**Cut ladder (decided in advance; it never lowers the quality of what is shown):**
1. Already applied (B-D12): Knossos Station is a console set, not a walkable room. The prologue uses the telescope console.
2. Hands: cursor + pinch + fist joystick on the lunar module panel and the laser only. No calibration screen if time is short: a fixed neutral point.
3. **13:00:** Thread not playable end to end in under 12 minutes → Look Up, Gaze and every T2 operation are frozen. A key episode
   without a finished 3D operation ships as a file with an inspectable model and an explainer animation, never as a text quiz.
4. Orrery not ready by 16:00 → the card map stays, restyled, with the 3D sets behind each episode.
5. A file that has no model or image on stage stays a draft ("This memory is still being restored") and is not linked from the Thread.

**A beat is done when** it plays in Explorer and in Accessible (and in Hands once B-25 exists); has a reduced-motion version;
has a text equivalent (the cue description in `cues.json`); passes the screenshot rule; and its capture is committed.

## Two lanes (when both accounts work at once)

Ownership is by folder (`CLAUDE.md`). **One account alone follows the iteration table from top to bottom and may edit everything.**

| Lane | Takes, in this order |
|---|---|
| **B · Machines** (account B if it is active) | B-23, B-24, B-04, B-28, B-27, B-29, B-05, B-25 |
| **A · Cosmos, station, shell** (account A) | A-23, A-28, A-20, A-25, A-13, A-02, A-21, A-26, A-11 |

How to know if the other account is active: `git log -3 --format='%h %ad %s' --date=format:%H:%M origin/main`.
A push in the last 45 minutes means it is. Mark your task `[~] (A)` or `[~] (B)` and push that line before coding.

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
- [~] (B) B-04 **Voices. BLOCKED on quota (Sun 07:46): the ElevenLabs key has 50 credits left of 10,000.** The script
  and the casting are done and tested up to the API call: `npx tsx scripts/gen-voices.ts --dry-run prologue e02-apollo11 finale`
  lists 54 lines, 4,763 characters. With a key that has quota, drop `--dry-run`. Until then the browser reads aloud (B-D13).
  Original task: `content/voices.yaml` (speaker → ElevenLabs stock voice id) + `scripts/gen-voices.ts`: reads
  `voiceLines(content, only)` from `src/content/voice.ts`, `--dry-run` prints the character count, cache by text hash,
  writes `public/assets/vo/vo_<id>_en.mp3`. Read the key from `.env`; never print it. Check the current ElevenLabs API
  docs first (`GET /v1/voices`, `GET /v1/user/subscription` for the quota). If ffmpeg exists, add the ID3 comment
  "AI-generated voice (ElevenLabs)" and normalise loudness; if not, skip that step. First batch: `prologue`,
  `e02-apollo11`, `finale` (about 5,000 characters). (10.5, 15.4, R-08)
- [~] B-19 The DSKY graphic for the 1202 alarm decision, with the guarded ABORT. Only if I1c closes early. (10.6.2)

**I2 (09:30–11:30)**
- [ ] B-28 **E16 Voyager 1.** Content first: `content/episodes/e16-voyager1.yaml` is a draft with 3 facts, two from
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
- [ ] A-28 **Prologue on the telescope console** (after B-23 is pushed): `content/prologue.yaml` gets `set: telescope`,
  the "Tune the station" puzzle is replaced by sending the midnight pulse with the same console the finale uses.
  88 rival projects tune a radio: do not. (5.3)
- [ ] A-20 `src/scenes/orrery/`: solar system with today's real positions (`npm i astronomy-engine`, lazy chunk; Moon
  and Earth textures are already in `public/assets/tex/`), every machine marked, orbit, zoom, select → episode,
  "Visible scale / True scale" with its label, list view as the Accessible equivalent. It replaces the card map
  (`MapScreen` in `src/screens/screens.tsx`), which stays as the list view. (FR-70 to FR-73, AC-18)
- [ ] A-25 Credits screen and `CREDITS.md` generated from data: `assets-src/manifest.yaml` already lists every image,
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
- [ ] T-04b **ElevenLabs quota.** The key in `.env` has 50 credits left of 10,000. The Thread needs about 4,800 characters
  (prologue, E02, finale) and about 3,000 more for E08 and E16. Put a key with quota in `.env` (a key that can only do
  text to speech is enough), or decide to ship with the browser's own read-aloud voice, which already works.
- [ ] T-04 Listen to the generated voices once B-04 lands. To change one, edit `content/voices.yaml`. Adult stock voices only. (R-05)
- [ ] T-06 Timed playtest of the Thread with 3 adults (never minors). Record the median. (AC-01, M1)
- [ ] T-07 **Submit the form at 14:00 Sunday** with the build of that moment; resubmit the final at 22:30. (R-01)
- [ ] T-08 Film the real Moon at dusk (18:20–19:30) and cut the demo video, 28 seconds maximum, English subtitles. (R-03)
- [ ] T-09 Check that every member appears in the team's Members tab. (R-10)
- [ ] T-10 Open the public URL in a private window, on another network and on a phone. (AC-08)
- [ ] T-11 Test Hands with a real laptop webcam once B-25 is deployed. Claude cannot test a camera. (AC-14)
- [ ] T-12 Test Look Up on a phone before 18:00, if it was built. (FR-51 to FR-54)
- [ ] T-13 **Play E02 now** on a laptop with an integrated GPU: https://josmart04.github.io/ariadne/?fps#e02-apollo11 and
  write the frame rate here. Fly the landing by hand (W / S, R / F). Say what felt wrong. (AC-16)
- [ ] T-14 Review the 36 captures in `docs/captures/i1b/` against the screenshot rule. (AC-15)
