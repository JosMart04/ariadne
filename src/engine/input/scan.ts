/**
 * One-button mode: switch scanning (AX-14).
 *
 * The highlight steps through the targets on screen at the player's chosen speed.
 * Space, Enter or a click anywhere chooses the highlighted one. Escape leaves the mode.
 *
 * It needs no per-screen code because every target in the game is a native control (A-D07):
 * it simply reads the DOM. Order: the main choices first (`data-scan="primary"`), then the
 * other controls of the screen, then the station bar.
 */
import { useEffect } from 'react';

const SELECTOR = 'button:not(:disabled), a[href], input:not(:disabled)';

/** Presses are ignored for this long after the screen changes, so one press never chooses twice. */
const GRACE_MS = 450;

function visible(el: HTMLElement) {
  return el.getClientRects().length > 0 && !el.classList.contains('skip');
}

export function scanTargets(): HTMLElement[] {
  const dialog = document.querySelector<HTMLElement>('dialog[open]');
  if (dialog) return [...dialog.querySelectorAll<HTMLElement>(SELECTOR)].filter(visible);
  const main = [...document.querySelectorAll<HTMLElement>(`main :is(${SELECTOR})`)].filter(visible);
  const primary = main.filter((el) => el.dataset.scan === 'primary');
  const rest = main.filter((el) => el.dataset.scan !== 'primary');
  const chrome = [...document.querySelectorAll<HTMLElement>(`header :is(${SELECTOR})`)].filter(visible);
  return [...primary, ...rest, ...chrome];
}

export function useScanning(enabled: boolean, seconds: number, onExit: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let targets: HTMLElement[] = [];
    let index = 0;
    let current: HTMLElement | null = null;
    let quietUntil = 0;
    let settle = 0;

    /** Small inputs are highlighted through their whole label, so the highlight is easy to see. */
    const box = (el: HTMLElement) => el.closest<HTMLElement>('label') ?? el;

    const show = () => {
      if (current) box(current).classList.remove('scan-current');
      current = targets[index] ?? null;
      if (!current) return;
      box(current).classList.add('scan-current');
      box(current).scrollIntoView({ block: 'nearest' });
    };

    /** Re-reads the screen and starts again from the first target. */
    const restart = () => {
      targets = scanTargets();
      index = 0;
      quietUntil = performance.now() + GRACE_MS;
      show();
    };

    const step = () => {
      if (document.hidden) return;
      // Targets can disappear without a mutation we watch (e.g. a dialog closing).
      if (!current || !current.isConnected || !visible(current)) return restart();
      if (targets.length < 2) return;
      index = (index + 1) % targets.length;
      show();
    };

    const choose = () => {
      if (performance.now() < quietUntil || !current?.isConnected) return;
      quietUntil = performance.now() + GRACE_MS;
      current.click();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // An open dialog handles Escape itself.
        if (!document.querySelector('dialog[open]')) onExit();
        return;
      }
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.repeat) return e.preventDefault();
      e.preventDefault();
      e.stopPropagation();
      choose();
    };

    /** Any real click, anywhere, is the switch. Clicks we fire ourselves are untrusted and pass through. */
    const onClick = (e: MouseEvent) => {
      if (!e.isTrusted) return;
      e.preventDefault();
      e.stopPropagation();
      choose();
    };

    const observer = new MutationObserver(() => {
      clearTimeout(settle);
      settle = window.setTimeout(restart, 60);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'open'] });

    restart();
    const timer = window.setInterval(step, Math.max(0.5, seconds) * 1000);
    addEventListener('keydown', onKey, true);
    addEventListener('click', onClick, true);

    return () => {
      clearInterval(timer);
      clearTimeout(settle);
      observer.disconnect();
      removeEventListener('keydown', onKey, true);
      removeEventListener('click', onClick, true);
      if (current) box(current).classList.remove('scan-current');
    };
  }, [enabled, seconds, onExit]);
}
