# For every AI agent working in this repository

`CLAUDE.md` is the rulebook for **all** agents, not only Claude. Read it first, then `docs/HANDOFF.md` (section 0, all of it)
and the section of your lane in `docs/TASKS.md`. They say which files your lane owns, how to claim a task, and the contest
rules that disqualify the project if broken (English only, every fact sourced, no NASA logo, no copyrighted text or music,
no secrets).

Three lanes work at once: `a` (machine A), `b` (machine B), `astra`. The paths of each are in `lanes.json`.

Before every push, in this order: `npm run check` (must be green) → `git pull --rebase` → `npm run lane -- <your lane>`
(must say "all yours") → `git push`. Stage only your own paths; never `git add -A`. Never force-push.
