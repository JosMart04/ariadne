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

(append here)

## Pending team confirmation (defaults in use)

- ARIADNE acronym: "Archive for Robotic Instruments And Dormant Network Explorers" (not shown in the game yet).
- The monologue keeps "None of it will be lost. Not like tears in the rain."
- Voices are declared text-to-speech (ElevenLabs stock voices).
