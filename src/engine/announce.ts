/** Screen-reader announcements through a single polite live region (AX-31). */
let node: HTMLElement | null = null;

export function mountAnnouncer(el: HTMLElement | null) {
  node = el;
}

export function announce(text: string) {
  if (!node) return;
  // Clearing first makes identical consecutive messages announce again.
  node.textContent = '';
  requestAnimationFrame(() => {
    if (node) node.textContent = text;
  });
}
