# Decisions

Frozen decisions and every deliberate departure from the requirements document.
Append to your own section. Format: id · decision · why.

## Front A · Engine

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

## Front B · Content and pipelines

(append here)

## Pending team confirmation (defaults in use)

- ARIADNE acronym: "Archive for Robotic Instruments And Dormant Network Explorers" (not shown in the game yet).
- The monologue keeps "None of it will be lost. Not like tears in the rain."
- Voices are declared text-to-speech (ElevenLabs stock voices).
