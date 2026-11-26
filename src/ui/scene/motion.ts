// UI/UX overhaul, motion: the strategic scenes' life. Two kinds:
//
//  - Idle and ambient loops (people breathing, blinking and shifting their weight; lamps flickering, dust in the
//    light, a beacon on the transport) run on each scene SVG's own animation timeline. The hub rebuilds its HTML on
//    every render, which would restart them; syncScenes() sets each new scene's clock to the page clock, so a loop
//    carries on where it was.
//  - One-off motions (an operative walking onto their mark, stepping forward when selected, a panel sliding in, a
//    new incident pinging on the map) are CSS keyframes on classes the hub adds only to what changed this render.
//
// Nothing in the game waits on any of it. prefers-reduced-motion, or System > Scene motion, stops both kinds.
const KEY = "site19-scene-motion";
export const sceneMotionSetting = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };
export function setSceneMotion(on: boolean) { try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* fine */ } }
export const sceneMotionOn = () => sceneMotionSetting() && !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);

const SCENES = "svg.interior, svg.stg-svg, svg.worldmap";
/** After a render: resume every scene's loops from the page clock, or hold them all still. */
export function syncScenes(root: ParentNode) {
  const on = sceneMotionOn(), t = performance.now() / 1000;
  document.body.classList.toggle("motion-off", !on);
  root.querySelectorAll<SVGSVGElement>(SCENES).forEach(svg => {
    try {
      if (on) { svg.setCurrentTime(t); svg.unpauseAnimations(); }
      else { svg.setCurrentTime(0); svg.pauseAnimations(); }
    } catch { /* an SVG without a timeline: nothing to do */ }
  });
}

/** A stable pseudo-random number in 0..1 from a seed, for placing ambient details the same way every render. */
export const rand01 = (seed: number) => { const v = Math.sin(seed * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };

/** Dust drifting in a light beam: a handful of motes rising and fading, each on its own slow path. */
export function dustMotes(cx: number, top: number, bottom: number, spread: number, n: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const r = (k: number) => rand01(seed * 31 + i * 7 + k);
    const x = cx + (r(1) - 0.5) * spread * (0.4 + r(2) * 0.6), y = top + (bottom - top) * (0.25 + r(3) * 0.7);
    const dur = 9 + r(4) * 9, dx = (r(5) - 0.5) * 60, dy = -40 - r(6) * 70;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.2 + r(7) * 1.8).toFixed(1)}" fill="#f6e6bd" opacity="0">
      <animate attributeName="opacity" values="0;.55;.4;0" dur="${dur.toFixed(1)}s" begin="-${(r(8) * dur).toFixed(1)}s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0 0;${(dx / 2).toFixed(0)} ${(dy / 2).toFixed(0)};${dx.toFixed(0)} ${dy.toFixed(0)}" dur="${dur.toFixed(1)}s" begin="-${(r(8) * dur).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
  }).join("");
}
/** An old lamp's flicker: mostly steady, with an occasional dip. Goes inside the beam's group. */
export const flicker = (seed: number) => {
  const dur = 6 + rand01(seed) * 7;
  return `<animate attributeName="opacity" values="1;1;.55;.95;.7;1;1" keyTimes="0;.62;.64;.66;.69;.72;1" dur="${dur.toFixed(1)}s" begin="-${(rand01(seed + 3) * dur).toFixed(1)}s" repeatCount="indefinite"/>`;
};
