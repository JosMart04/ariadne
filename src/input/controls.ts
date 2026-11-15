/**
 * Controls: one small state that every way of steering writes to, and that simulations read (section 8.0).
 *
 *   keyboard, on-screen console, touch, gamepad, hand gestures  --->  controls  --->  the simulation's pilot
 *
 * A simulation never knows which device moved the stick. Hands (src/hands) writes the same axes as the
 * keyboard, so "fist and move" and "hold W" are the same input (C-D07).
 */
import type { DescentControls, Pilot } from '../sim/descent';

type Source = 'keys' | 'pad' | 'stick' | 'hands';

const axes: Record<Source, number> = { keys: 0, pad: 0, stick: 0, hands: 0 };
let clicks = 0;
const listeners = new Set<() => void>();

export const controls = {
  /** -1 (brake, tilt back) to +1 (speed up, tilt forward). The strongest source wins. */
  get pitch(): number {
    let best = 0;
    for (const v of Object.values(axes)) if (Math.abs(v) > Math.abs(best)) best = v;
    return Math.max(-1, Math.min(1, best));
  },
  setPitch(source: Source, value: number) {
    axes[source] = value;
    listeners.forEach((f) => f());
  },
  /** One click of the descent-rate switch: +1 sinks faster, -1 sinks slower. */
  click(direction: 1 | -1) {
    clicks += direction;
    listeners.forEach((f) => f());
  },
  /** The simulation takes one pending click per step, so a fast double press is two real clicks. */
  takeClick(): -1 | 0 | 1 {
    if (clicks > 0) {
      clicks--;
      return 1;
    }
    if (clicks < 0) {
      clicks++;
      return -1;
    }
    return 0;
  },
  reset() {
    for (const k of Object.keys(axes) as Source[]) axes[k] = 0;
    clicks = 0;
    listeners.forEach((f) => f());
  },
  subscribe(f: () => void) {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
};

/** The player as a pilot of the descent simulation. Also polls a gamepad, if one is plugged in. */
export const playerPilot: Pilot = (): DescentControls => {
  pollGamepad();
  return { pitch: controls.pitch, rod: controls.takeClick() };
};

let padButtons = [false, false];
function pollGamepad() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const pad = navigator.getGamepads().find((p) => p && p.connected);
  if (!pad) return;
  const y = pad.axes[1] ?? 0;
  axes.pad = Math.abs(y) > 0.15 ? -y : 0;
  // Bottom face button sinks faster, right face button sinks slower. One click per press.
  const now = [!!pad.buttons[0]?.pressed, !!pad.buttons[1]?.pressed];
  if (now[0] && !padButtons[0]) clicks += 1;
  if (now[1] && !padButtons[1]) clicks -= 1;
  padButtons = now;
}

const KEY_PITCH: Record<string, number> = { w: 1, arrowup: 1, s: -1, arrowdown: -1 };
const KEY_CLICK: Record<string, 1 | -1> = { f: 1, pagedown: 1, r: -1, pageup: -1 };

/**
 * Keyboard flying: W / Up tilts forward, S / Down brakes, F sinks faster, R sinks slower.
 * Returns a function that removes the listeners. Keys typed into a form field are ignored.
 */
export function bindFlightKeys(): () => void {
  const held = new Set<string>();
  const update = () => {
    let v = 0;
    for (const k of held) v += KEY_PITCH[k] ?? 0;
    controls.setPitch('keys', Math.max(-1, Math.min(1, v)));
  };
  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (k in KEY_PITCH) {
      e.preventDefault();
      held.add(k);
      update();
    } else if (k in KEY_CLICK && !e.repeat) {
      e.preventDefault();
      controls.click(KEY_CLICK[k]);
    }
  };
  const up = (e: KeyboardEvent) => {
    if (held.delete(e.key.toLowerCase())) update();
  };
  const blur = () => {
    held.clear();
    update();
  };
  addEventListener('keydown', down);
  addEventListener('keyup', up);
  addEventListener('blur', blur);
  return () => {
    removeEventListener('keydown', down);
    removeEventListener('keyup', up);
    removeEventListener('blur', blur);
    controls.setPitch('keys', 0);
  };
}
