/**
 * Test hooks. With `?dev` in the address (or in the dev server) the page exposes the stage and the controls,
 * so the capture script can fly the lander like a player would, and a reviewer can jump to any cue:
 *   __stage.getState().set.setCue('landed', true)
 *   __controls.setPitch('stick', -1)
 * Nothing here is secret, and nothing here is needed to play.
 */
import { useStage } from './episode/setStore';
import { controls } from './input/controls';

if (typeof window !== 'undefined' && (import.meta.env?.DEV || /[?&]dev\b/.test(location.search))) Object.assign(window, { __stage: useStage, __controls: controls });
