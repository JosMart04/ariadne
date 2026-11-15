# Tasks

Status: `[ ]` open · `[~]` in progress (add who) · `[x]` done. Each front edits only its own section.
IDs in brackets are requirement ids from the requirements document. T1 must ship Sunday; T2 only after T1.

## Front A · Engine

- [x] A-01 Walking skeleton deployed: repo, CI, contract, compiler, full flow, tests. (NFR-01, NFR-05, NFR-12)
- [~] A-02 **One-button scanning**: built in `src/engine/input/scan.ts`. Verified: the whole prologue completes with Space only. NOT yet verified: a full E08 run with Space only, a real mouse click as the switch, Escape leaving the mode. Done when those three pass. (AX-14, AC-04)
- [ ] A-03 Stage primitives `figure`, `hotspots`, `cards`, `trace`, each with a text equivalent. (8.1, AX-31)
- [ ] A-04 Labyrinth map: classical seven-circuit SVG, three act rings, nodes as links, golden thread woven in launch order; list view stays as the accessible equivalent. (FR-01, FR-02)
- [ ] A-05 The Silence: rain of light gathered into the thread on "Catch it"; static transition with reduced motion. (FR-04, AX-30)
- [ ] A-06 Passages: dithered canvas, skippable after first view, two real scales computed for today with astronomy-engine (lazy chunk). (FR-30, FR-31, FR-32)
- [ ] A-07 AudioBus: voice, music, sfx, ambience channels with volumes and mono; starts after first interaction; missing file never blocks; captions with speaker name. (FR-33, FR-34, AX-32)
- [ ] A-08 Procedural leitmotif per act (Web Audio) and the "Daisy Bell" hum that slows down. (10.5, 5.4)
- [ ] A-09 Finale set pieces: pulse, telescope on the LROC image, photon animation, tonight's real Moon distance in the reveal. (5.4)
- [ ] A-10 Voyager: distance from a JPL Horizons state vector + Earth position; copy with three states (before / on the day / after one light-day); `?date=` override; `tests/voyager.test.ts`. (FR-40, AC-10)
- [ ] A-11 Postcard: 3 fragments × 3 options, procedural canvas, PNG download. (5.4.7)
- [ ] A-12 Credits screen and `CREDITS.md` generated from data: images, sounds, fonts, libraries, licences. (NFR-08, CR-11)
- [ ] A-13 Accessibility pass: Lighthouse ≥ 95, no serious axe issues, 200% text, high contrast, screen-reader run, mobile layout. (AC-06, AC-11, AX-34, AX-35)
- [ ] A-14 Read aloud for text without a voice file, using the browser's own speech. (AX-33)
- [ ] A-15 Turn the "no episode is still a draft" test into a hard gate once B-05 lands. (AC-07)
- [ ] A-16 (T2) Stage primitives `grid`, `sequence`; head pointer with MediaPipe, dwell selection, rest zone. (AX-15, AX-20–26)

## Front B · Content and pipelines

- [ ] B-01 Machine setup: clone, `npm ci`, copy `para_fable/` locally (git-ignored), create `.env` from `.env.example`, run `npm run check`.
- [ ] B-02 **Fact verification pass.** Resolve the 15 items of section 18.1 of the requirements and every `note: VERIFY` in `content/`. Open each source, fix wording or URL, prefer *.nasa.gov over secondary sources, and record what you checked in `note:`. Never fill `verified:` (humans only). If a fact cannot be supported, remove it or mark the line IMAGINED. (CR-02, CR-12)
- [ ] B-03 **Thread content.** Complete `e02-apollo11.yaml` (puzzle "The Boulder Field", archetype B+A, awards `clew-1` "No wires") and `e16-voyager1.yaml` (puzzle "The Glitch", archetype F+I, awards `clew-3` "Distance is time"); polish `prologue.yaml` and `finale.yaml`. Remove `draft: true`. Target: each episode plays in about 2.5 minutes. (5.1, 5.3, 5.4, section 7)
- [ ] B-04 `scripts/gen-voices.ts` + `content/voices.yaml`: ElevenLabs text-to-speech from the compiled lines. Reads `ELEVENLABS_API_KEY` from `.env`; `--dry-run` prints the character count first; cache by text hash; output `public/assets/vo/vo_<lineId>_en.mp3` with an ID3 comment "AI-generated voice (ElevenLabs)"; adult library voices only. Generate ARIADNE and the Thread first. Check current API docs before coding. (10.5, 15.4, R-08)
- [ ] B-05 The 13 remaining episodes complete and non-draft, in this order: E11, E09, E07, E14, E12, then E01, E03, E04, E05, E06, E10, E13, E15. (AC-07, M6)
- [ ] B-06 `assets-src/manifest.yaml` + `scripts/fetch-assets.ts` + `scripts/paint.ts` (sharp): one hero image per episode, the LROC Apollo 11 site image, credit line and source page for each; painted variant for the Memory layer. Only *.nasa.gov or NASA-credited originals. (10.1, CR-11, R-04)
- [ ] B-07 `docs/submission/`: summary, detailed description, AI disclosure, NASA Data list, references, 30-second video script. Generate the two lists from content with `scripts/build-submission.ts`. (R-03, R-07, R-08)
- [ ] B-08 `scripts/check-links.ts`: report any source URL that does not answer 200. (CR-02)
- [ ] B-09 Glossary and interface wording polish (`content/glossary.yaml`, values of `content/ui.yaml`). (CR-08, AX-37)
- [ ] B-10 (T2) Puzzle FSMs for E11, E09, E07, E14, E12; "For teachers" page; Look Up, text list first. (CR-10, FR-50, AX-50)

## Team (humans)

- [ ] T-01 Confirm three creative decisions: the ARIADNE acronym; keeping "Not like tears in the rain" in the monologue; voices as declared text-to-speech.
- [ ] T-02 Rewrite and approve all text in your own voice. Text freeze Sunday 15:00. (R-09)
- [ ] T-03 Verify every REAL fact against its source and sign `verified: <initials>` in the YAML. Anything unverified at 15:00 is reworded as IMAGINED or removed. (CR-12)
- [ ] T-04 Choose the ElevenLabs voices by ear: adult, from the stock library, never cloned. (R-05)
- [ ] T-05 Find NASA images with their credit lines and add rows to `assets-src/manifest.yaml`.
- [ ] T-06 Timed playtest of the Thread with 3 adults (never minors). Record the median. (AC-01, M1)
- [ ] T-07 **Submit the form at 14:00 Sunday** with the build of that moment; resubmit the final at 22:30. (R-01)
- [ ] T-08 Film the real Moon at dusk (18:20–19:30) and cut the demo video, 28 seconds maximum, English subtitles. (R-03)
- [ ] T-09 Check that every member appears in the team's Members tab. (R-10)
- [ ] T-10 Open the public URL in a private window, on another network and on a phone. (AC-08)
