# ARIADNE: Tears in the Rain

[Play ARIADNE](https://josmart04.github.io/ariadne/)

A browser documentary made for NASA Space Apps 2026 and its challenge, *Abandoned but not Forgotten*.
You follow an imagined archive guide through the records of machines left on the Moon, on Mars and beyond.

## What you can play

The Thread connects a telescope prologue, Apollo 11, Opportunity and Voyager 1 to a lunar laser finale.
You guide a landing, send a rover plan from Earth, point a deep-space antenna and aim at a reflector.
These are simplified teaching simulations, with reconstruction and timing limits labelled on screen.

Thirteen additional mission files are complete. Each has seven beats: Passage, Arrival, Operation, Discovery,
Silence, Status Now and Field File. Sourced captions explain the engineering over an official NASA model or photograph.
These archive files use explanations rather than dedicated control simulations.

The title and map share an Orrery with dated, approximate positions. Labels identify compressed distances,
illustrative sizes and estimated spacecraft locations. The map also has a list view.

## Evidence and access

Historical statements carry REAL labels and source links. Fictional dialogue carries IMAGINED labels.
AI source checks are recorded in the YAML notes; human signatures belong in `verified` and remain pending.
Source links and automated validation do not by themselves establish historical accuracy.

Explorer and Accessible modes are available. They use the same puzzle graphs and reach the same ending.
Captions, text scaling, contrast options, reduced motion and a text fallback are implemented.
Hands, gaze input and sky AR are not delivered. Human testing with assistive technology, phones and integrated
graphics remains necessary. A timed audience playtest, the postcard and final Voyager coda are still pending.

Progress is saved in browser storage. No account is required.

## Run and check

```bash
npm ci
npm run check
npm run dev
```

`npm run check` validates content and source references, checks types and puzzle reachability, runs tests,
builds the site and scans the bundle for recognized secret patterns.

With the dev server running, capture an archive file and inspect its images:

```bash
npm run capture -- x-review e11
npm run capture -- x-review e11 reduce
```

Check source reachability separately; this requires network access and reports non-200 responses:

```bash
npx tsx scripts/check-links.ts --json docs/submission/link-report.json
```

The checker follows redirects and distinguishes HTTP errors from timeouts or connection failures.
A 200 response does not establish that a page supports a claim. See the [reference inventory](docs/submission/references.md).
Content is authored in `content/`. Repository ownership and contribution rules are in [CLAUDE.md](CLAUDE.md).

## AI assistance and credits

Claude and OpenAI Codex assisted implementation, research, writing and validation. The team owns final review and submission.
ElevenLabs generated fictional narration using stock voices; generated files carry an AI declaration in their metadata and credits.
Browser speech synthesis reads lines without a recorded voice file. No real person's voice was cloned.

The project uses NASA photographs and official models, with individual credits. Scenery and the Orrery are labelled artistic views.
There are no AI-generated images of real machines or places. Effects are synthesized; poetry excerpts were published before 1929.

Data & imagery: NASA. NASA does not endorse this project. No NASA logo is used.
Fonts: Cinzel, Atkinson Hyperlegible, IBM Plex Mono and Cormorant Garamond, under the SIL Open Font License.
See [CREDITS.md](CREDITS.md), [AI disclosure](docs/submission/ai-disclosure.md) and the [submission description](docs/submission/description.md).
Code is released under the [MIT License](LICENSE).
