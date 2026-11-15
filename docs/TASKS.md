# Tasks

Status: `[ ]` open · `[~]` in progress (add who) · `[x]` done.
IDs in brackets are requirement ids from the requirements document (v1.1).

Plan re-based on **Sun Nov 15, 00:15 UTC−5** after the v1.1 course correction (`docs/DECISIONS.md`, C-D01).
**Account B currently leads both fronts.** Tasks marked `→A` belong to Front A: account A takes the first open one
when it returns. Until then account B does them in iteration order. Once both accounts work, each edits only its own section.

## Iterations (UTC−5)

Each iteration ends deployed, with the gate green, captures committed and `docs/HANDOFF.md` updated. Each one could be submitted as it is.

| It. | Window | What is deployed | Gate |
|---|---|---|---|
| I0 | 00:15–01:00 | Machine ready, decision and plan recorded | gate green |
| I1a | 01:00–02:45 | 3D core, Tranquility Base set, cinema layout. E02 complete and playable in Accessible **inside the 3D scene** | E02 captures |
| I1b | 02:45–04:45 | Piloted descent in Explorer: simulation, lunar module console, dust in arcs, sound. The Silence with the rain of light | AC-13 on E02 |
| I1c | 04:45–06:15 | Finale: telescope on the real LROC image, laser photons, measurement. Voices for ARIADNE, E02, finale | AC-13 on the finale |
| I1d | 06:15–07:00 | Hands basics on the DSKY, the descent and the laser. **AC-15 capture review** | slice closed |
| I2 | 07:00–10:00 | Orrery with today's real positions (map, Earth to Moon passage, Visible/True scale). Walkable Knossos Station, telescope console as the prologue tutorial | captures |
| I3 | 10:00–13:00 | E08 operated from Earth with the real delay. E16 DSN antenna + "Pale Blue Dot" coda. Thread route complete | **13:00 cut rule** |
| I4 | 13:00–14:00 | Submission build: accessibility pass on Thread, credits, README, submission texts | **14:00 first submission** |
| I5 | 14:00–17:00 | 13 files with a model or real image on stage (text by **15:00**). Look Up: planetarium and sky AR. Gaze only if ahead | **17:00 feature freeze** |
| I6 | 17:00–22:30 | Fixes only: performance on real hardware, final captures, video support. Look Up tested on a phone before 18:00 | **22:30 final submission** |

**Cut ladder (decided in advance; it never lowers the quality of what is shown):**
1. I1 not closed by 08:00: Hands keeps cursor + pinch only, and work moves on.
2. Orrery not closed by 10:30: Knossos becomes a console set with no walking.
3. 13:00: Thread not playable end to end in under 12 minutes: T2 is frozen (Look Up, Gaze, T2 operations). A key episode
   without a finished 3D operation ships as a file with an inspectable model and an explainer animation, never as a text quiz.
4. Files that do not get a model or image on stage are not linked from the Thread route.

## Front B · Machines, consoles, content, assets (account B)

- [x] B-01 Machine setup: pull, `npm ci`, `.env`, `npm run check` green (Sun 00:13).

**I1a**
- [ ] B-11 Contract v1.1 in `src/content/schema.ts` + compiler gates: `set`, `models`, `stage.kind: scene`, `cue`, `sim`, `when`, `target`, `console.controls`. Store: `play`, `quality`. (FR-29, AC-17, CR-13)
- [ ] B-12 `src/three/` SceneHost: fixed steps, pause when hidden, Auto quality, context loss → "Restart 3D" or text view, reduced motion, seeded RNG, GLB loader, particles. (NFR-13, 10.6.6)
- [ ] B-13 `src/scenes/tranquility/`: official lunar module model, deterministic terrain with craters and boulders, low Sun, black sky, Earth. Cues for every E02 beat. (10.6.1)
- [ ] B-14 Cinema layout in `src/episode/`: full-bleed set, captions with speaker and REAL/IMAGINED tag, slate, HUD, on-screen labels; Accessible targets anchored to scene hotspots; text view as fallback. (AC-15, AX-10, AX-31)
- [ ] B-15 E02 content complete, non-draft: "The Boulder Field" state machine (1202 alarm, landing zone), all seven beats, `clew-1`. Each new fact with a NASA/ALSJ source and a `note:` of what was checked. (5.1, section 7)
- [ ] B-16 `scripts/capture.ts` + `npm run capture` + `#shot/<scene>/<cue>`. First captures in `docs/captures/i1a/`. (AC-15, C-D12)

**I1b**
- [ ] B-17 `src/sim/descent.ts` + `outcomes.ts` + `tests/sim/`: deterministic, every outcome reachable by a scripted pilot, autopilot lands safe. (FR-21, FR-29)
- [ ] B-18 `src/input/` Controls: keyboard, pointer/touch stick, gamepad. (8.0)
- [ ] B-19 `src/consoles/`: DSKY (VERB/NOUN, PROG light, 1202), LM panel (rate of descent, attitude, guarded ABORT / ABORT STAGE, landing point reticle). Every control `REAL` with a fact. (10.6.2, AC-17)
- [ ] B-20 Explorer descent wired to the state machine; teach-and-retry; "Let the machine show you"; "Switch to guided choices". (FR-29a, FR-24)
- [ ] B-21 Particles: lunar dust in clean arcs; The Silence rain of light gathered into the thread. Reduced-motion versions. (10.3, FR-04, AX-30)
- [ ] B-22 `src/audio/` AudioBus + procedural sfx (keys, engine, alarm tone); silence on the lunar surface; captions always. (FR-33, FR-34, AX-32)

**I1c**
- [ ] B-23 `src/scenes/telescope/` + TelescopeConsole + `src/sim/ranging.ts`: slew, zoom, focus on the real LROC image; hold to fire; photons; 2.5 s clock; distance. Finale content updated with `sim`/`when`/`target`. (5.4, AC-13)
- [ ] B-24 Finale staging: revelation, monologue, synthesised "Daisy Bell" hum that slows down, final pulse. (5.4, 15.3)
- [ ] B-04 `scripts/gen-voices.ts` + `content/voices.yaml`: ElevenLabs from compiled lines, `--dry-run` first, cache by text hash, ID3 comment "AI-generated voice (ElevenLabs)", adult stock voices. First batch: ARIADNE, E02, finale. (10.5, 15.4, R-08)
- [ ] B-06 `assets-src/manifest.yaml` + `scripts/fetch-assets.ts`: models, LROC image, Moon and Earth textures, each with credit, licence and source page. (CR-11, R-04)

**I1d**
- [ ] B-25 `src/hands/`: Hand Landmarker (lazy, same origin), One Euro filter, gesture classifier + `tests/hands/`, cursor + pinch, fist joystick, calibration, skeleton preview, gesture card, `?hands=sim`. (11.3, AC-14)
- [ ] B-26 AC-15 review of every E02 and finale beat in Explorer and Accessible, reduced motion, keyboard only, one button. Captures in `docs/captures/i1/`.

**I3**
- [ ] B-27 E08: `src/scenes/meridiani/` + PlanStation console + `src/sim/roverPlan.ts`: waypoints, energy, one sequence per sol, telemetry after today's real light delay. No tau slider. The existing E08 state machine stays. (10.6.1, FR-60)
- [ ] B-28 E16: `src/scenes/dsn/` + DsnConsole: azimuth, elevation, lock, a command that takes almost a day. Content "The Glitch", `clew-3`. Distance from real positions; `?date=` override; test. (FR-40, AC-10)

**I4 to I6**
- [ ] B-05 The 13 remaining episodes complete, non-draft, each with `set` (diorama with official model or real image). Order: E11, E09, E07, E14, E12, E01, E03, E04, E05, E06, E10, E13, E15. Text by 15:00. (AC-07, M6)
- [ ] B-29 `src/scenes/diorama/`: orbit inspection with annotated `REAL` parts. (10.6.1)
- [ ] B-02 Fact verification pass: the 15 items of section 18.1 and every `note: VERIFY`. Never fill `verified:` (humans only). (CR-02, CR-12)
- [ ] B-07 `docs/submission/`: summary, description, AI disclosure, NASA Data list, references, 30-second video script. (R-03, R-07, R-08)
- [ ] B-08 `scripts/check-links.ts`: report any source URL that does not answer 200. (CR-02)
- [ ] B-09 Glossary polish. (CR-08)
- [ ] B-30 Read aloud for text without a voice file, using the browser's own speech. (AX-33)
- [ ] B-31 Procedural leitmotif per act. (10.5)

## Front A · Cosmos, station, shell (`→A`: account A on return; account B until then)

- [~] A-02 →A **One-button scanning**, built in `src/engine/input/scan.ts`. Verified: the whole prologue with Space only. Not verified: a full episode with Space only, a real click as the switch, Escape leaving the mode. Re-verify inside the cinema layout. (AX-14, AC-04)
- [ ] A-20 →A (I2) `src/scenes/orrery/`: solar system with today's real positions (astronomy-engine, lazy), every machine marked, orbit/zoom/select, "Visible scale / True scale", list view as the Accessible equivalent. It replaces the card map. (FR-70 to FR-73, AC-18)
- [ ] A-21 →A (I2) Passages as directed Orrery shots, two real scales computed for today, skippable after the first view, text description, static with reduced motion. (FR-30 to FR-32, 10.7.2)
- [ ] A-22 →A (I2) `src/scenes/station/`: walkable Knossos Station, labyrinth on the floor with the golden thread, telescope console as the prologue tutorial in the chosen mode. Replace "Tune the station". (5.3, FR-01, FR-02)
- [ ] A-23 →A (I2) Setup screen: Explorer / Hands / Accessible first, then the options. (AX-01)
- [ ] A-24 →A (I3) "Pale Blue Dot" coda and the continuous shot down to the player's sky. No Sagan text. (FR-74, FR-75)
- [ ] A-25 →A (I4) Credits screen and `CREDITS.md` generated from data: images, models, sounds, fonts, libraries, licences. (NFR-08)
- [ ] A-13 →A (I4) Accessibility pass: Lighthouse ≥ 95, no serious axe issues, 200% text, high contrast, screen-reader run, mobile layout. (AC-06, AC-11)
- [ ] A-26 →A (I5) `src/scenes/sky/` Look Up: planetarium, then sky AR on a phone with "Tap the Moon to align"; text list equivalent. **On a phone before 18:00 if it goes in the video.** (FR-50 to FR-54, AX-50)
- [ ] A-11 →A (I5) Postcard: 3 fragments × 3 options, procedural canvas, PNG download. (5.4.7)
- [ ] A-27 →A (I5, only if ahead) Gaze: Face Landmarker, head + iris cursor, dwell selection, rest zone. (11.4, AC-05)
- [ ] A-15 →A Turn "no episode is still a draft" into a hard gate once B-05 lands. (AC-07)

Dropped by the course correction: A-03 (2D stage primitives), A-04 (card/SVG map; replaced by A-20 and A-22), A-16 (2D `grid`/`sequence`).
Moved to Front B: A-05 → B-21, A-07/A-08 → B-22/B-31, A-09 → B-23/B-24, A-10 → B-28, A-14 → B-30.

## Team (humans)

- [ ] T-01 Confirm three creative decisions: the ARIADNE acronym; keeping "Not like tears in the rain" in the monologue; voices as declared text-to-speech.
- [ ] T-02 Rewrite and approve all text in your own voice. Text freeze Sunday 15:00. (R-09)
- [ ] T-03 Verify every REAL fact against its source and sign `verified: <initials>` in the YAML. Anything unverified at 15:00 is reworded as IMAGINED or removed. (CR-12)
- [ ] T-04 Listen to the generated voices. To change one, edit `content/voices.yaml` and ask for a regeneration. Adult stock voices only. (R-05)
- [ ] T-06 Timed playtest of the Thread with 3 adults (never minors). Record the median. (AC-01, M1)
- [ ] T-07 **Submit the form at 14:00 Sunday** with the build of that moment; resubmit the final at 22:30. (R-01)
- [ ] T-08 Film the real Moon at dusk (18:20–19:30) and cut the demo video, 28 seconds maximum, English subtitles. (R-03)
- [ ] T-09 Check that every member appears in the team's Members tab. (R-10)
- [ ] T-10 Open the public URL in a private window, on another network and on a phone. (AC-08)
- [ ] T-11 **Test Hands with a real laptop webcam** as soon as I1d is deployed: prologue console, E02 descent, finale laser, gestures only. Claude cannot test a camera. (AC-14)
- [ ] T-12 **Test Look Up on a phone** before 18:00: permissions, compass, "Tap the Moon to align". (FR-51 to FR-54)
- [ ] T-13 Play the Thread on a laptop with an integrated GPU and write down the frame rate shown by `?fps`. (AC-16)
- [ ] T-14 Review the captures in `docs/captures/` against the screenshot rule. (AC-15)
