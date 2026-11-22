// The tactical camera: the battlefield fills the screen and this decides which part of the world is under it.
// World coordinates are the map's own pixels (tile x * TS); the rules never see the camera. Everything that turns a
// pointer into a tile, and everything that draws the world, goes through these few functions, so targeting stays
// exact at any zoom.
import { TS } from "../core/grid";

export interface Insets { t: number; r: number; b: number; l: number; }
export const cam = {
  /** Centre of the view in world pixels, and zoom (screen px per world px). Targets ease toward. */
  x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1,
  /** Viewport size in CSS pixels. */
  vw: 0, vh: 0,
  /** Screen edges covered by HUD: the map is framed inside what's left. */
  insets: { t: 64, r: 0, b: 132, l: 0 } as Insets,
  /** Screen edges the side panels cover (the map still shows under them, but nothing is focused there). */
  occluded: { t: 0, r: 312, b: 0, l: 260 } as Insets,
  /** The playable rectangle in world pixels (one floor on multi-floor maps). */
  bx0: 0, by0: 0, bx1: 0, by1: 0,
  zMin: 0.5, zMax: 3, zFit: 1,
  ready: false,
  /** Frames drawn with a camera shake (big moments, Action highlights on): for the presentation tests. */
  shakeFrames: 0,
};

const areaW = () => Math.max(100, cam.vw - cam.insets.l - cam.insets.r);
const areaH = () => Math.max(100, cam.vh - cam.insets.t - cam.insets.b);
/** The screen point the camera centre maps to: the middle of the area the HUD leaves free. */
const centreX = () => cam.insets.l + areaW() / 2;
const centreY = () => cam.insets.t + areaH() / 2;

/** New map, floor or viewport: recompute the fit, and frame the map (or keep the current view if `keep`). */
export function frame(bx0: number, by0: number, bx1: number, by1: number, vw: number, vh: number, keep = false) {
  const changed = bx0 !== cam.bx0 || by0 !== cam.by0 || bx1 !== cam.bx1 || by1 !== cam.by1;
  Object.assign(cam, { bx0, by0, bx1, by1, vw, vh });
  const fit = Math.min(areaW() / (bx1 - bx0), areaH() / (by1 - by0));
  cam.zFit = fit;
  // never smaller than the whole map in view, never so close a tile fills the screen
  cam.zMin = Math.min(fit, 1) * 0.9;
  cam.zMax = Math.max(2.6, fit * 1.5);
  if (!cam.ready || (changed && !keep)) {
    // open on the whole map when it fits at a readable size; otherwise at a comfortable tactical zoom
    cam.tz = cam.z = Math.max(fit, Math.min(1.35, 48 / TS));
    cam.tx = cam.x = (bx0 + bx1) / 2; cam.ty = cam.y = (by0 + by1) / 2;
    cam.ready = true;
  }
  clampTargets();
}

function clampAxis(c: number, lo: number, hi: number, avail: number, z: number) {
  const span = (hi - lo) * z;
  if (span <= avail) return (lo + hi) / 2;
  const half = avail / 2 / z, margin = 40 / z;
  return Math.max(lo + half - margin, Math.min(hi - half + margin, c));
}
function clampTargets() {
  cam.tz = Math.max(cam.zMin, Math.min(cam.zMax, cam.tz));
  cam.tx = clampAxis(cam.tx, cam.bx0, cam.bx1, areaW(), cam.tz);
  cam.ty = clampAxis(cam.ty, cam.by0, cam.by1, areaH(), cam.tz);
}

/** Ease toward the targets; returns true while still moving. */
export function step(dtMs: number) {
  const k = 1 - Math.exp(-Math.max(0, dtMs) / 95);
  const dx = cam.tx - cam.x, dy = cam.ty - cam.y, dz = cam.tz - cam.z;
  cam.x += dx * k; cam.y += dy * k; cam.z += dz * k;
  if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(dz) < 0.0005) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; return false; }
  return true;
}

/** Canvas transform (before device-pixel scaling) for drawing the world. */
export function worldTransform(): [number, number, number] {
  return [cam.z, centreX() - cam.x * cam.z, centreY() - cam.y * cam.z];
}
export function worldToScreen(wx: number, wy: number): [number, number] {
  return [centreX() + (wx - cam.x) * cam.z, centreY() + (wy - cam.y) * cam.z];
}
export function screenToWorld(sx: number, sy: number): [number, number] {
  return [cam.x + (sx - centreX()) / cam.z, cam.y + (sy - centreY()) / cam.z];
}
/** The tile under a point on the canvas (CSS px from its top-left), or null off the playable area. */
export function screenToTile(sx: number, sy: number): { x: number; y: number } | null {
  const [wx, wy] = screenToWorld(sx, sy);
  if (wx < cam.bx0 || wy < cam.by0 || wx >= cam.bx1 || wy >= cam.by1) return null;
  return { x: Math.floor(wx / TS), y: Math.floor(wy / TS) };
}
/** Where a tile's centre is on the canvas (CSS px), using the camera's target (where it is settling). */
export function tileToScreen(x: number, y: number): [number, number] {
  return [centreX() + ((x + 0.5) * TS - cam.tx) * cam.tz, centreY() + ((y + 0.5) * TS - cam.ty) * cam.tz];
}

export function pan(dxScreen: number, dyScreen: number, instant = false) {
  cam.tx -= dxScreen / cam.tz; cam.ty -= dyScreen / cam.tz;
  clampTargets();
  if (instant) { cam.x = cam.tx; cam.y = cam.ty; }
}
/** Zoom by a factor, keeping the world point under (sx, sy) fixed. */
export function zoomAt(sx: number, sy: number, factor: number) {
  const [wx, wy] = [cam.tx + (sx - centreX()) / cam.tz, cam.ty + (sy - centreY()) / cam.tz];
  cam.tz = Math.max(cam.zMin, Math.min(cam.zMax, cam.tz * factor));
  cam.tx = wx - (sx - centreX()) / cam.tz; cam.ty = wy - (sy - centreY()) / cam.tz;
  clampTargets();
}
/** Bring a world point into view: always when `force`, otherwise only when it is near or past the edge of the
 *  free area (routine selection doesn't swing the camera about). */
export function focus(wx: number, wy: number, force = false) {
  // the side panels cover the map's edges: "in view" means inside the uncovered middle, and a focused point is
  // brought to the middle of that, not merely to the centre of the screen
  const o = cam.occluded, l = Math.min(o.l, cam.vw * 0.3), r = Math.min(o.r, cam.vw * 0.3);
  const [sx, sy] = [centreX() + (wx - cam.tx) * cam.tz, centreY() + (wy - cam.ty) * cam.tz];
  const x0 = Math.max(cam.insets.l, l), x1 = cam.vw - Math.max(cam.insets.r, r), mx = (x1 - x0) * 0.15, my = areaH() * 0.18;
  const inside = sx > x0 + mx && sx < x1 - mx && sy > cam.insets.t + my && sy < cam.vh - cam.insets.b - my;
  if (!force && inside) return;
  const want = (x0 + x1) / 2;
  cam.tx = wx - (want - centreX()) / cam.tz; cam.ty = wy; clampTargets();
}
export function zoomBy(factor: number) { zoomAt(centreX(), centreY(), factor); }
/** Show the whole playable area. */
export function overview() { cam.tz = cam.zFit; cam.tx = (cam.bx0 + cam.bx1) / 2; cam.ty = (cam.by0 + cam.by1) / 2; clampTargets(); }
export function resetCamera() { cam.ready = false; cam.bx0 = cam.by0 = cam.bx1 = cam.by1 = 0; }
