# Handoff: live project state

Keep it short: done / in progress / next 3 steps / traps. Once both accounts work, each edits **only its own section**.

**Who is working (Sun Nov 15, 00:20 UTC−5): account B leads the whole project, both fronts.** Account A ran out of
quota on Sat 22:35. When it returns it takes the `→A` tasks (see "Requests to Front A" below).

**Schedule (UTC−5), re-based Sun 00:15 after the v1.1 course correction:**
I1 vertical slice E02 + finale → 07:00 · I2 Orrery + Knossos Station → 10:00 · I3 E08 + E16, Thread complete → 13:00 ·
**cut rule 13:00 · first submission 14:00 · text freeze 15:00 · feature freeze 17:00 · Look Up on a phone 18:00 · final submission 22:30.**
Full table and cut ladder: `docs/TASKS.md`.

## Front B · Machines, consoles, content, assets (account B)

**Done:**
- B-01 machine ready (Sun 00:13): `npm ci`, `.env` present, `npm run check` green on Node 22.16 (CI uses 24).
- I0 (Sun 00:20): course correction recorded in `docs/DECISIONS.md` (C-D01 to C-D17), `CLAUDE.md` (pillars, screenshot rule,
  operational fidelity, new architecture and ownership) and `docs/TASKS.md` (iteration plan).

**In progress:** I1a, the vertical slice E02 Apollo 11 + finale. Order: B-11 contract → B-12 SceneHost → B-13 Tranquility set →
B-14 cinema layout → B-15 E02 content → B-16 captures.

**Next 3 steps:**
1. I1a deployed: E02 complete, in 3D, playable in Accessible.
2. I1b: piloted descent in Explorer with the lunar module console, dust, sound.
3. I1c: finale telescope, photons, voices.

**Traps:**
- `src/generated/` is git-ignored: run `npm run content` (or `npm run dev`) before `tsc`.
- Toolchain is very new (Vite 8, Vitest 5, TypeScript 7, Zod 4, React 19, three 0.187). Check docs before assuming an API.
- Zod 4: use `z.strictObject`, `z.record(key, value)`, `z.looseObject`.
- The Logbook `<dialog>` lives in the header; scope DOM queries to `main`.
- In a background browser tab timers are throttled: test scanning and 3D with the tab visible.
- Official models found (github.com/nasa/NASA-3D-Resources, `3D Models/`): `Apollo Lunar Module.glb` 717 KB,
  `Deep Space Network 70-meter.glb` 1.9 MB, `Voyager Probe (A).glb` 286 KB, `Mars Exploration Rover - Opportunity (MER-B).glb` 37 KB.
  Also Viking Lander, Pioneer 10, NEAR Shoemaker, Kepler, Dawn, Ingenuity, InSight.
- Claude cannot test a webcam or a phone: Hands (T-11), Look Up (T-12) and frame rate (T-13) need a person.

**Requests to Front A (read this first when account A returns):**
1. `git pull --rebase`, then read in this order: `CLAUDE.md` (rewritten), the "Course correction v1.1" block of
   `docs/DECISIONS.md`, this file, `docs/TASKS.md`. The local requirements are now v1.1: read its "Cambios en la v1.1"
   block and sections 3, 8.0, 10.6, 10.7, 11.3, 11.4, 12, 16, 17.3, 17.5.
2. Your front is now **Cosmos, station, shell** (folder ownership in `CLAUDE.md`). Take the first open `→A` task in
   `docs/TASKS.md` that account B has not marked `[~]`. Expected first task: A-20 Orrery, then A-21, A-22, A-23.
3. Build your scenes on `src/three/` (SceneHost) and follow the shape of `src/scenes/tranquility/`. Do not edit those
   folders: if SceneHost lacks something, write it under "Requests to Front B" in your section.
4. Do not start what is marked `[~] (B)`. Mark your own task `[~] (A)` and push that line before coding.
5. The contract (`src/content/schema.ts`) changes in B-11. After that it is yours again and frozen: later changes need a
   line in `docs/DECISIONS.md`.

## Front A · Cosmos, station, shell (account A)

**Done (iteration 0, Sat 22:10):**
- Repo, CI gate and GitHub Pages deploy. `npm run check` = content + tsc + 118 tests + build + secret scan.
- Contract in `src/content/schema.ts`; compiler in `scripts/build-content.ts`.
- Playable text skeleton, title to credits: Title, Setup, Prologue, Map (16 machines), 7-beat EpisodePlayer,
  PuzzleRunner (hints at 30/60/90 s or 1/2/3 errors, "Let the machine show you", story mode, forced outcomes),
  Finale (deduction + measurement), Credits with the generated fact counter, Logbook with clews, Dawn clock.
- E08 Opportunity is complete in text.

**In progress (session stopped by the usage limit, Sat 22:35):** A-02 one-button scanning. Code is in and the gate is green.
The prologue was completed with Space only. The E08 run with Space only was still in the Operation beat when the session
ended, so it is unverified; so are "real click as the switch" and "Escape leaves the mode".

**Next 3 steps:** see "Requests to Front A" above.

**Requests to Front B:** (write here)

## Team (humans)

**Waiting on you:** see the Team section of `docs/TASKS.md`. New since the course correction: T-11 (test Hands with a
webcam), T-12 (test Look Up on a phone), T-13 (frame rate on an integrated GPU), T-14 (review the captures).
The voices are generated with stock voices picked by Claude; listen to them and say if you want others (T-04).
