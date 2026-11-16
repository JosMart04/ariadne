# The AR gallery: one shared viewer (FR-55)

**For lane a, who was out of quota when this was asked for. Read this whole file before touching AR.**
Written by lane b on Sun Nov 15, 2026, 20:40 UTC−5. Lane b was made the architect of this part by the team.

## 1. What the team asked for, and why

The thirteen files that are not on the Thread tell their story but let the player do almost nothing. The team brought
back requirement FR-55 (see a machine in your own room, at real size) and asked for two deliveries:

| Delivery | What the player gets | State |
|---|---|---|
| **1. AR gallery** | Choose Ingenuity or Opportunity, turn it in 3D, set it down in your own room as a miniature or at real size, with one short thing to look for | **Built, deployed, hidden behind `?ar`. Not yet tried on a real phone.** |
| **2. A playable story for E11** | Plan one flight of Ingenuity, send it, watch the helicopter fly it alone, see what the choice revealed | **Not started. Script and contract proposed in section 8.** |

Rules the team set: start with two machines, not sixteen; **one viewer, not one system per machine**; miniature and real
size; an entry from a gallery and an entry from a scene's menu; a short observation task with an educational point;
looking at a machine never changes the game (no memory restored, no clew).

## 2. What is built

- **Address:** `#ar` opens the gallery, `#ar-opportunity` opens it on that machine. Live: `https://josmart04.github.io/ariadne/?ar#ar`.
  The router is untouched: it sends every address it does not know to the map, and `MapScreen` hands `#ar` to the gallery.
- **`ArGallery.tsx`**: the gallery and the viewer in one screen. Machine picker, 3D inspection, Miniature / Real size,
  "View in your space", the observation task with "Show me", ways out (the machine's file, the map).
- **`catalog.ts`**: one row per machine. **Adding a machine is a row here, a row in `sizes.ts`, its texts in
  `content/ui/shell.yaml` (`ar.<id>.*`) and one run of the model tool. No viewer code.**
- **`sizes.ts`**: the published dimension that sets each scale, with the page that says it.
- **`models/`**: the AR models, derived, in metres. **`tools/`**: how they are made. **`vendor/`**: the 3D and AR engine.
- **Entries, hidden until a phone test passes:** a key on the Orrery, a button on the list view and on the title.
  They show with `?ar` in the address. To show them to everybody: `OPEN_TO_ALL = true` in `catalog.ts`.
- **Credits:** a line on the Credits screen (`ar.credit`).

Every state has a way out: no AR on the device (a desktop, an unsupported phone) → the machine can still be turned and
the screen says why; the model cannot be downloaded or there is no 3D → description, size and task stay on screen.

## 3. Decisions, and what you may want to change

| Decision | Why | Yours to revisit |
|---|---|---|
| Built on `main`, behind `?ar` | AR on a phone needs a public HTTPS address; only `main` is deployed, so a branch could never be tried on a phone | Open it to all after section 6 passes |
| The engine is Google's `model-viewer` 4.4.0, **copied as its prebuilt file** (`vendor/model-viewer.min.js`, Apache 2.0, licence beside it) | The npm package needs `three ^0.183`; the game uses 0.187, so `npm ci` would fail on the deploy. The prebuilt file carries its own copy of three and loads only when the gallery opens (its own chunk, about 1 MB) | Replace with a real dependency once the three.js versions agree |
| AR models are **derived files** in `models/`, imported by Vite | The game's models are fitted to a stand and carry no size (the rover file was 5.5 times too large). Phone viewers also need plain files: no Draco, no WebP | Move them under `public/assets/` with manifest rows if you prefer one place for assets |
| One dimension sets the scale; the others are compared and **shown** | A model can be right in one dimension and off in another. Opportunity's simplified model is 2.3 m wide (right) and 1.32 m tall (NASA: 1.5 m): the screen says so | Find a better rover model, or accept |
| Miniature is a second file, not a scale applied by the page | A phone's own AR viewer downloads the file itself: a scale set on the web page never reaches it | — |
| `tests/ar/` belongs to lane b (`lanes.json`) | The scale is checked on every push; this is the one edit lane b made to a file of yours | — |

## 4. What is proven, and how to repeat it

- `npm run check`: `tests/ar/models.test.ts` (11 tests) reads every vertex of every AR model and compares it with
  `sizes.ts`; it also fails when an original model changed and the AR models were not made again.
- `npm run capture -- <name> map`: after the map, it plays the gallery in a real Chrome and checks that the miniature is
  the stated fraction of the real size, that Opportunity is 2.3 m wide **inside the viewer**, that each machine has its
  own address, that a desktop is told it cannot place the machine, that a model that cannot be downloaded leaves the
  words on screen, that the way back leads to the map, and that **the gallery asks nothing of any other site**.
  Pictures: `docs/captures/b4/ar-*.jpg` (desktop, a phone-sized window, the fallback).
- Remaking the models: `npm run dev`, then `npx tsx src/screens/ar/tools/derive-models.ts` (`measure` only prints).

| Model | Real size (measured on the file) | Sets the scale | Compared | Bytes |
|---|---|---|---|---|
| Ingenuity | 0.98 × 0.56 × 1.10 m | rotors 1.2 m tip to tip ([NASA](https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/)) | — (no second published figure was verified today) | 1.23 MB |
| Opportunity | 1.57 × 1.32 × 2.30 m | 2.3 m wide ([JPL press kit, Quick Facts](https://www.jpl.nasa.gov/news/press_kits/merlandings.pdf)) | length 1.6 m: 1.57 (−2 %) · height 1.5 m: 1.32 (**−12 %**) | 0.21 MB |

## 5. What is NOT proven (do not claim it)

- **No phone has been used.** Nobody has placed a model in a room, checked the real size with a tape measure, or come
  back from the phone's AR viewer to the game. A desktop capture proves none of this. Until section 6 is filled in, the
  screen says "the team has not yet tried this on a real phone" and the entries stay hidden.
- **iPhone:** the phone's viewer (Quick Look) needs a USDZ file. `model-viewer` makes one on the phone from the glTF. That
  path is untested; if it fails, a prepared `.usdz` per model is the fix (`ios-src` on the element).
- **Android:** Scene Viewer downloads the `.glb` itself from the public address. The files are plain glTF for that
  reason; whether its lighting shows Ingenuity's materials well is unknown.
- **Performance on a phone**, and whether the observation task is understood by a person.
- **Opportunity up close:** 3,845 triangles, no textures. Fine as a miniature, poor at real size. Said on screen.
- Not tried with a screen reader. Keyboard: every control is a real button, radio or link.

## 6. The phone test (task B-53, five minutes, needs a person)

Open `https://josmart04.github.io/ariadne/?ar#ar` on the phone, in Chrome (Android) or Safari (iPhone).

1. Does Ingenuity appear and turn with a finger?
2. Press **View in your space** with **Miniature**. Does the camera open, and does the helicopter stand on a table?
3. Go back, choose **Real size**, press again on a clear floor. Measure a rotor from tip to tip: is it about 1.2 m? Can it be resized with two fingers (it should not)?
4. Close the camera view. Are you back in the gallery, and does "Back to the labyrinth" reach the map?
5. Repeat 2 and 3 with Opportunity (real size: 2.3 m wide).

| Phone, system, browser | 1 | 2 | 3 (measured) | 4 | 5 | Notes |
|---|---|---|---|---|---|---|
| Xiaomi Redmi Note 11 Pro+, Samsung A30s, Moto g06 (Sun 20:50, build `bb45023`) | yes | **no** | | | | "View in your space" was greyed out on all three: "This device cannot place it in your room". **Cause: a bug in the page, not the phones** (see below). Fixed in the next build; to be tried again |
| | | | | | | |

**What that first test found (Sun 20:55).** The viewer was given `ar=""`. React 19 hands a prop to a custom element as a
property when the element has one of that name, and `ar` is a boolean property: the empty string switched AR off on every
device. A desktop cannot start AR either way, so the desktop check could not see it. Now `ar={true}`, the screen asks the
viewer for a few seconds before saying no, and `npm run capture -- <name> map` reloads the gallery as Chrome on an
Android phone and fails if the viewer cannot start AR or the button is not live. That check proves the button, **not**
the camera view: only a phone proves that.

When a row passes, set `tried` for that platform in `catalog.ts` (the "not yet tried" line goes away) and decide on `OPEN_TO_ALL`.

## 7. What is left for you (lane a), file by file

| Task | Where | Notes |
|---|---|---|
| **B-54 · "View in your space" inside an episode** | `src/episode/CinemaEpisode.tsx` (a menu entry, not a floating button), for episodes whose id is in `CATALOG` | `go('ar-ingenuity')` is enough to open the viewer. **Not solved:** returning to the same beat. The store keeps progress, not the place inside an episode, so today the player comes back to the start of the file. Needs a return point (`route + beat`) kept before leaving, and the scene paused. The 3D set must be unmounted while the gallery is open (it is: the route changes), so two renderers never run at once |
| Open the entries to everybody | `catalog.ts`: `OPEN_TO_ALL` | After section 6 |
| Credits file | `assets-src/manifest.yaml` (`code:` row for model-viewer, Apache 2.0) → `CREDITS.md` | The Credits screen already says it; the generated file does not. Lane astra's files |
| Submission texts | `docs/submission/` | Say "3D gallery with experimental AR" unless section 6 passed |
| More machines | `catalog.ts`, `sizes.ts`, `shell.yaml`, the tool | Ten official models are in `public/assets/models/`; each needs one published dimension with its page |
| Prepared USDZ | `models/`, `ios-src` in `ArGallery.tsx` | Only if the iPhone test fails |
| Strings | `content/ui/shell.yaml`, keys `ar.*` | Move to `content/ui.yaml` if you take the folder over |
| **B-55 · the playable story of E11** | section 8 | Crosses your engine and lane astra's `e11-ingenuity.yaml` |

## 8. Proposal for delivery 2: "One flight, one look" (E11), not started

**Goal:** in 60 to 120 seconds the player understands that Ingenuity was sent instructions and then flew alone, and makes
one planning choice with a visible result. It is played on screen; AR is not needed for it.

**It fits the engine as it is** (the pattern of E08: plan from Earth, send once, wait, read the result):

- `src/sim/scout.ts` (new, pure): two or three lookout points over a small patch of ground, a round-trip margin as a
  **teaching rule that says so on screen** (not an energy calculation), outcomes in `src/sim/outcomes.ts`, for example
  `scout: ['saw-the-ridge', 'saw-the-plain', 'beyond-the-margin']`. `beyond-the-margin` is not a crash: the plan is
  corrected before it is sent.
- `content/episodes/e11-ingenuity.yaml` (lane astra): `puzzle` with `sim: scout`, one decision with `when:` per outcome
  and `target:` hotspots, so Accessible play gets the same three choices as targets in the scene (FR-29).
- A set of its own, `src/scenes/jezero/` (copy `src/scenes/meridiani/`): the helicopter on the ground, the patch, the
  lookouts. **The model allows the flight:** `mdl_ingenuity.glb` has `rotors_01` and `rotors_02` as separate nodes; spin
  them in opposite senses only if a source says so (not verified today), otherwise simply spin them. Take-off, a short
  leg, a look, landing. With reduced motion: cuts and still views, same result.
- A console, `src/consoles/ScoutPlan.tsx` (copy `PlanStation.tsx`): choose the lookout, see the leg and the margin,
  send. Label it "simplified planning", not a copy of a real control.
- After the flight: what the chosen lookout showed (a synthetic view, labelled as such), then one real NASA picture with
  date and credit, **without saying it came from the player's flight**.
- What must be true to call it done: the choice changes something the player can see; every branch ends; a retry loses
  nothing; leaving or losing WebGL in the middle leaves no pending operation (the contract of every set).

**Sources to open before writing a line of text:** that Ingenuity flew by itself from instructions sent in advance
([NASA/JPL, first flight](https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/));
any distance, height or duration used in the scene.

## 9. Files of this folder

```
ArGallery.tsx        the screen: gallery and viewer
ar.css               its styles
catalog.ts           one row per machine; the switch OPEN_TO_ALL
sizes.ts             the published size of each machine and its page
model-viewer.d.ts    types of the <model-viewer> element used here
models/              derived AR models and models.report.json (made by the tool, checked by tests/ar/)
tools/               derive-models.ts (node) and derive.page.ts (browser half)
vendor/              model-viewer.min.js 4.4.0 and its Apache 2.0 licence
```
