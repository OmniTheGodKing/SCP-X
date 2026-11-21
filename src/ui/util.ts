export function esc(s: unknown) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Show the player's own site and MTF names in everything drawn under an element (see localizeText). */
export function localizeDom(root: HTMLElement, f: (t: string) => string) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const v = n.nodeValue ?? ""; if (v.includes("Site-19") || v.includes("Epsilon-11")) n.nodeValue = f(v); }
  root.querySelectorAll<HTMLElement>("[title],[aria-label]").forEach(e => {
    for (const a of ["title", "aria-label"]) { const v = e.getAttribute(a); if (v && (v.includes("Site-19") || v.includes("Epsilon-11"))) e.setAttribute(a, f(v)); }
  });
}
