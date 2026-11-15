# Handoff: live project state

Each front edits **only its own section**. Keep it short: done / in progress / next 3 steps / traps.
Schedule (UTC−5): I1 Thread playable in text → Sun 02:00 · I2 whole cast + look → 11:00 · I3 T1 complete → 13:30 ·
**cut rule 13:00 · first submission 14:00 · text freeze 15:00 · feature freeze 17:00 · final submission 22:30.**

## Front A · Engine (account A)

**Done (iteration 0, Sat 22:10):**
- Repo, CI gate and GitHub Pages deploy. `npm run check` = content + tsc + 118 tests + build + secret scan.
- Contract frozen in `src/content/schema.ts`; compiler in `scripts/build-content.ts`.
- Playable skeleton, title to credits: Title, Setup, Prologue, Map (16 machines), 7-beat EpisodePlayer,
  PuzzleRunner (hints at 30/60/90 s or 1/2/3 errors, "Let the machine show you", story mode, forced outcomes),
  Finale (deduction + measurement), Credits with the generated fact counter, Logbook with clews, Dawn clock.
- E08 Opportunity is complete and is the reference episode.

**In progress:** nothing.

**Next 3 steps:**
1. A-02 one-button scanning (`src/engine/input/scan.ts`): works on `[data-scan]`, buttons and links inside `main`.
2. A-04 stage primitives `figure`, `hotspots`, `cards`, `trace`.
3. A-05 labyrinth SVG map with the golden thread in launch order.

**Traps:**
- `src/generated/` is git-ignored: run `npm run content` (or `npm run dev`) before `tsc`.
- Toolchain is very new (Vite 8, Vitest 5, TypeScript 7, Zod 4, React 19). Check docs before assuming an API.
- Zod 4: use `z.strictObject`, `z.record(key, value)`, `z.looseObject`.
- The Logbook `<dialog>` lives in the header; scope DOM queries to `main`.

**Requests to Front B:** none yet.

## Front B · Content and pipelines (account B)

**Done:** nothing yet.

**Next 3 steps:**
1. B-01 set up the machine.
2. B-02 fact verification pass.
3. B-03 complete the Thread content (E02, E16, prologue, finale).

**Traps:** (none yet)

**Requests to Front A:** (write here)

## Team (humans)

**Waiting on you:** see the Team section of `docs/TASKS.md`. The three creative confirmations (T-01) and the
voice choice (T-04) unblock Front B first.
