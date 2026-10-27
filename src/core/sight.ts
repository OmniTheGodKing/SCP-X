// Line of sight: strict at corners, partial visibility, and leaning past cover.
import { L, R, d2, opaque, passable } from "./grid";

// Smoke blocks sight like a wall while it lasts. With smoke on the map, sight isn't cached.
let smoke = new Set<number>();
export function setSmoke(tiles: [number, number][]) { smoke = new Set(tiles.map(([x, y]) => y * L.W + x)); }
export const smoky = (x: number, y: number) => smoke.has(y * L.W + x);
const solid = (x: number, y: number) => opaque(x, y) || (smoke.size > 0 && smoke.has(y * L.W + x));

// Exact grid walk between two points (tile units). A ray that passes exactly through a
// corner is blocked if either tile beside that corner is solid, so nothing squeezes past.
function rayClear(x0: number, y0: number, x1: number, y1: number) {
  let cx = Math.floor(x0), cy = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1), dx = x1 - x0, dy = y1 - y0;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity;
  let tx = sx > 0 ? (cx + 1 - x0) / dx : sx < 0 ? (x0 - cx) / -dx : Infinity;
  let ty = sy > 0 ? (cy + 1 - y0) / dy : sy < 0 ? (y0 - cy) / -dy : Infinity;
  for (let guard = 0; guard < 80 && !(cx === ex && cy === ey); guard++) {
    if (Math.abs(tx - ty) < 1e-9) {
      if (solid(cx + sx, cy) || solid(cx, cy + sy)) return false;
      cx += sx; cy += sy; tx += tdx; ty += tdy;
    } else if (tx < ty) { cx += sx; tx += tdx; }
    else { cy += sy; ty += tdy; }
    if (cx === ex && cy === ey) break;
    if (solid(cx, cy)) return false;
  }
  return true;
}

// At least 3 of 10 sight lines must be clear to see a tile; fewer is just a sliver.
export const MIN_SIGHT = 0.3;
const SAMPLES: [number, number][] = [[.5, .5], [.15, .15], [.85, .15], [.15, .85], [.85, .85]];

// The map never changes during a mission, so results are cached per level.
let cacheFor: unknown = null;
let visCache = new Int8Array(0);
const leanCache = new Map<number, [number, number][]>();
function ensureCache() {
  if (cacheFor === L) return;
  cacheFor = L;
  visCache = new Int8Array(L.W * L.H * L.W * L.H).fill(-1);
  leanCache.clear();
}

/** Share of the 10 sight lines (centre-to-corners, both ways) that get through between two tiles. */
export function visFrac(ax: number, ay: number, bx: number, by: number) {
  if (ax === bx && ay === by) return 1;
  ensureCache();
  if (smoke.size) {
    let clear = 0;
    for (const [ox, oy] of SAMPLES) {
      if (rayClear(ax + .5, ay + .5, bx + ox, by + oy)) clear++;
      if (rayClear(bx + .5, by + .5, ax + ox, ay + oy)) clear++;
    }
    return clear / 10;
  }
  const N = L.W * L.H, i = (ay * L.W + ax) * N + by * L.W + bx;
  if (visCache[i] < 0) {
    let clear = 0;
    for (const [ox, oy] of SAMPLES) {
      if (rayClear(ax + .5, ay + .5, bx + ox, by + oy)) clear++;
      if (rayClear(bx + .5, by + .5, ax + ox, ay + oy)) clear++;
    }
    visCache[i] = visCache[(by * L.W + bx) * N + ay * L.W + ax] = clear;
  }
  return visCache[i] / 10;
}

/** Where someone standing at (x, y) can look from: their own tile, plus the open tile beside
 *  any wall or pillar they are standing next to (leaning out past its edge). */
export function viewSpots(x: number, y: number) {
  ensureCache();
  const k = y * L.W + x;
  const hit = leanCache.get(k);
  if (hit) return hit;
  const spots: [number, number][] = [[x, y]];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!opaque(x + dx, y + dy)) continue;
    for (const [px, py] of [[dy, dx], [-dy, -dx]]) {
      const lx = x + px, ly = y + py;
      if (passable(lx, ly) && !opaque(lx + dx, ly + dy) && !spots.some(s => s[0] === lx && s[1] === ly)) spots.push([lx, ly]);
    }
  }
  leanCache.set(k, spots);
  return spots;
}

export interface View { f: number; x: number; y: number; }
/** Best view a person at (x, y) gets of a tile, leaning if that helps. Null means no sight. */
export function bestView(x: number, y: number, tx: number, ty: number, range = R): View | null {
  let best: View | null = null;
  for (const [sx, sy] of viewSpots(x, y)) {
    if (d2(sx, sy, tx, ty) > range * range) continue;
    const f = visFrac(sx, sy, tx, ty);
    if (f >= MIN_SIGHT && (!best || f > best.f || (f === best.f && sx === x && sy === y))) best = { f, x: sx, y: sy };
  }
  return best;
}
export const sightFrom = (x: number, y: number, tx: number, ty: number, range = R) => !!bestView(x, y, tx, ty, range);
/** Sight without leaning, for things that don't lean (SCP-173). */
export const rawSight = (x: number, y: number, tx: number, ty: number) => d2(x, y, tx, ty) <= R * R && visFrac(x, y, tx, ty) >= MIN_SIGHT;
