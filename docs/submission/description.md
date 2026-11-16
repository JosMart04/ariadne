# Project description

## The experience

You are the last operator of an imagined listening station. ARIADNE, its archive guide, asks you to recover the memories of space machines.
A pulse returns from the Moon. The answer depends on understanding the hardware, rather than guessing a password.

The Thread takes you through a telescope prologue, Apollo 11, Opportunity, Voyager 1 and a lunar laser finale.
You guide a lunar landing, send a rover plan from Earth, point a deep-space antenna and aim at a lunar reflector.
These are simplified teaching simulations. On-screen labels identify reconstructions, illustrative values and compressed time.
The game does not present rover motion as live joystick control from Earth.

Each mission separates sourced records from imagined speech. Source buttons connect the story to NASA mission pages and technical records.
The archive also contains thirteen complete mission files, each with seven beats and a NASA model or photograph.
Short, sourced captions explain each machine's operation; Discovery and Silence connect its findings with the end of its work.
These files have no dedicated control simulations.

The title and map share an Orrery. Its dated planet positions use JPL's approximate orbital elements.
Distances are compressed, sizes are illustrative, and estimated spacecraft positions carry labels.
Opening a machine from the Orrery shows a short journey and a distance estimate. A list view offers the same archive.

An AR gallery opens from the title and from the map. One viewer shows NASA's models of Ingenuity and Opportunity, as a miniature or at real size, with one thing to look for on each.
On a phone that supports it, the camera places the machine in your room. On other devices you turn the model on screen.

## Built and checked

The Thread plays in 3D in Explorer and Accessible modes. Accessible choices use the same puzzle graphs and reach the same ending.
Captions, reduced motion, text scaling, contrast options and a text fallback are implemented.
Progress stays in browser storage. The project has no account system.

The automated gate checks content structure, source references, puzzle reachability, TypeScript, production builds and possible bundled secrets.
Browser captures provide visual evidence. These checks do not establish complete accessibility or historical accuracy by themselves.
The thirteen archive files completed all seven beats and saved progress in Explorer, reduced-motion Explorer and a forced no-WebGL run.
The team placed both AR models in a room with Android phones, as a miniature and at real size. A test keeps the model sizes true to NASA's figures.
The Thread passes an automated run from a clean start to the credits, and a run that loses the 3D view in the middle of an operation.

## Current limits

Webcam Hands, gaze input and sky AR are not delivered. Dedicated interactive operations for the thirteen archive files are outside this build.
The postcard and final Voyager coda remain separate, unfinished integration tasks in this snapshot.
Human source sign-off, assistive-technology testing, phone testing and a timed audience playtest remain team responsibilities.
Without WebGL, the Field File panel can cover part of the scene description; the issue is recorded for the engine lane.
The AR gallery has not been tried on an iPhone, and its real size has not been checked with a tape measure. On an uneven table the miniature did not stay fixed.
Generated voices cover the Thread. The thirteen archive files are read aloud by the browser's own speech, and always shown as captions.
Do not claim a twelve-minute completion time or universal accessibility without those tests.

## NASA material and authorship

[NASA data](nasa-data.md) lists the mission records and visual assets used by the project.
[References](references.md) records the source inventory. Asset credits also appear in the game and in `CREDITS.md`.
Data & imagery: NASA. NASA does not endorse this project.

The station and machine personalities are fictional. AI assisted implementation, research organization and draft writing, as detailed in the [disclosure](ai-disclosure.md).
The team retains responsibility for creative decisions, review and submission.
