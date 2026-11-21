// Presentation overhaul P2: the cinematic part of entering and leaving a room. Purely visual: the hub has already
// rendered the destination before any of this runs, so nothing in the game waits for an animation. Any click or key
// during one finishes it at once; reduced motion, or the player's own setting, turns them off.

const KEY = "site19-transitions";
export const transitionsOn = () => {
  try { if (localStorage.getItem(KEY) === "off") return false; } catch { /* storage blocked: default on */ }
  return !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
};
export function setTransitions(on: boolean) { try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* fine */ } }
export const transitionsSetting = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };

const running: Animation[] = [];
function skipAll() { for (const a of running.splice(0)) { try { a.finish(); } catch { /* gone */ } } }
let armed = false;
function armSkip() {
  if (armed) return; armed = true;
  const skip = () => skipAll();
  addEventListener("pointerdown", skip, true); addEventListener("keydown", skip, true);
}
function track(a: Animation) { running.push(a); a.finished.then(() => { const i = running.indexOf(a); if (i >= 0) running.splice(i, 1); }).catch(() => { /* cancelled */ }); return a; }

/** The room grows out of the slot it was entered from: the stage starts at that rectangle and opens to full size,
 *  then the controls come in. */
export function animateEnter(stage: HTMLElement | null, ctx: HTMLElement | null, from: DOMRect | null) {
  if (!stage || !from || !transitionsOn() || typeof stage.animate !== "function") return;
  armSkip();
  const to = stage.getBoundingClientRect();
  if (!to.width || !to.height) return;
  const sx = from.width / to.width, sy = from.height / to.height, dx = from.left - to.left, dy = from.top - to.top;
  stage.style.transformOrigin = "0 0";
  track(stage.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, filter: "brightness(1.6)", opacity: 0.6 },
    { transform: "none", filter: "brightness(1)", opacity: 1 },
  ], { duration: 460, easing: "cubic-bezier(.2,.7,.2,1)" }));
  if (ctx) track(ctx.animate([{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 260, delay: 300, easing: "ease-out", fill: "backwards" }));
}

/** The room closes back into its place on the overview: a snapshot of the scene shrinks into the slot and fades,
 *  over the overview that is already live underneath. */
export function animateLeave(snapshot: string | null, from: DOMRect | null, to: DOMRect | null) {
  if (!snapshot || !from || !to || !transitionsOn()) return;
  armSkip();
  const ghost = document.createElement("div");
  ghost.className = "rv-ghost";
  ghost.innerHTML = snapshot;
  Object.assign(ghost.style, { position: "fixed", left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, zIndex: "80", pointerEvents: "none", transformOrigin: "0 0" });
  document.body.appendChild(ghost);
  const sx = to.width / from.width, sy = to.height / from.height, dx = to.left - from.left, dy = to.top - from.top;
  if (typeof ghost.animate !== "function") { ghost.remove(); return; }
  const a = track(ghost.animate([
    { transform: "none", opacity: 1 },
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.15 },
  ], { duration: 360, easing: "cubic-bezier(.5,0,.6,1)" }));
  const done = () => ghost.remove();
  a.finished.then(done, done);
}

/** A brief pulse on the room the Director came back to. */
export function pulse(el: Element | null) {
  if (!el || !transitionsOn() || typeof (el as HTMLElement).animate !== "function") return;
  (el as HTMLElement).animate([{ boxShadow: "inset 0 0 0 3px rgba(110,169,200,.9)" }, { boxShadow: "inset 0 0 0 0 rgba(110,169,200,0)" }], { duration: 900, easing: "ease-out" });
}
