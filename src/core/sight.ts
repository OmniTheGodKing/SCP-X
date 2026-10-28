// Line of sight and line of fire (Phase 4I): rays against the real geometry (walls, shut doors, partitions, smoke;
// windows are transparent), no fixed sight radius, partial visibility, and leaning past cover.
import { L, PART, WALL, WINDOW, d2, opaque, passable, stopsShot, tileAt } from "./grid";

/** As far as anyone can see in clear daylight: the whole map. Night, fog and weather shorten it (see rangeOf). */
export const SIGHT_MAX = 60;

// Smoke blocks sight like a wall while it lasts. With smoke on the map, sight isn't cached.
let smoke = new Set<number>();
export function setSmoke(tiles: [number, number][]) { smoke = new Set(tiles.map(([x, y]) => y * L.W + x)); }
export const smoky = (x: number, y: number) => smoke.has(y * L.W + x);
const solid = (x: number, y: number) => opaque(x, y) || (smoke.size > 0 && smoke.has(y * L.W + x));

// Thin walls (as XCOM draws them): a wall, partition or shut door standing in a one-tile wall line, with open ground
// on both sides of the line, only blocks along the line's centre. A window or an open door is a gap in that line, so
// someone beside a window looks through it at a steep angle into the room beyond. Corners, junctions and solid rock
// are still full blocks. 0 = full block, 1 = thin along a horizontal line, 2 = thin along a vertical line.
let thinFor: unknown = null, thinVer = -1, thinMap = new Int8Array(0);
const lineMember = (x: number, y: number) => { if (x < 0 || y < 0 || x >= L.W || y >= L.H) return false; const t = tileAt(x, y); return t === WALL || t === PART || t === WINDOW || L.door.has(y * L.W + x); };
function thin(x: number, y: number) {
  if (thinFor !== L || thinVer !== L.version) {
    thinFor = L; thinVer = L.version; thinMap = new Int8Array(L.W * L.H);
    for (let ty = 0; ty < L.H; ty++) for (let tx = 0; tx < L.W; tx++) {
      const t = tileAt(tx, ty);
      if (!(t === WALL || t === PART || L.door.has(ty * L.W + tx))) continue;
      const open = (a: number, b: number) => a >= 0 && b >= 0 && a < L.W && b < L.H && !lineMember(a, b);
      if (open(tx, ty - 1) && open(tx, ty + 1) && (lineMember(tx - 1, ty) || lineMember(tx + 1, ty))) thinMap[ty * L.W + tx] = 1;
      else if (open(tx - 1, ty) && open(tx + 1, ty) && (lineMember(tx, ty - 1) || lineMember(tx, ty + 1))) thinMap[ty * L.W + tx] = 2;
    }
  }
  return thinMap[y * L.W + x];
}

// Exact grid walk between two points (tile units). A ray that passes exactly through a corner is blocked only when
// both tiles beside that corner are full blocks (it can't squeeze between two walls touching at a corner); grazing the
// corner of a single wall is fine, as it would be in reality. A thin wall stops the ray only where it crosses the
// wall's centre line inside that tile. There is no limit on the angle through a doorway or window.
function walk(x0: number, y0: number, x1: number, y1: number, blocks: (x: number, y: number) => boolean, onTile?: (x: number, y: number) => void) {
  let cx = Math.floor(x0), cy = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1), dx = x1 - x0, dy = y1 - y0;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity;
  let tx = sx > 0 ? (cx + 1 - x0) / dx : sx < 0 ? (x0 - cx) / -dx : Infinity;
  let ty = sy > 0 ? (cy + 1 - y0) / dy : sy < 0 ? (y0 - cy) / -dy : Infinity;
  const full = (x: number, y: number) => blocks(x, y) && !thin(x, y);
  for (let guard = 0; guard < 160 && !(cx === ex && cy === ey); guard++) {
    let tIn: number;
    if (Math.abs(tx - ty) < 1e-9) {
      if (full(cx + sx, cy) && full(cx, cy + sy)) return false;
      tIn = tx; cx += sx; cy += sy; tx += tdx; ty += tdy;
    } else if (tx < ty) { tIn = tx; cx += sx; tx += tdx; }
    else { tIn = ty; cy += sy; ty += tdy; }
    if (cx === ex && cy === ey) break;
    if (blocks(cx, cy)) {
      const k = thin(cx, cy), tOut = Math.min(tx, ty, 1);
      if (!k) return false;
      // where the ray crosses this tile's centre line, if it does inside the tile
      const d = k === 1 ? dy : dx, c = k === 1 ? cy + 0.5 - y0 : cx + 0.5 - x0;
      if (Math.abs(d) < 1e-12) { if (Math.abs(c) < 1e-9) return false; }
      else { const tc = c / d; if (tc >= tIn - 1e-9 && tc <= tOut + 1e-9) return false; }
    }
    onTile?.(cx, cy);
  }
  return true;
}
const rayClear = (x0: number, y0: number, x1: number, y1: number) => walk(x0, y0, x1, y1, solid);

/** Line of fire from one tile's centre to another's: walls, shut doors, partitions and reinforced glass stop it,
 *  smoke doesn't. Returns null if blocked, or the panes of ordinary glass the shot passes through (they shatter). */
export function fireLine(ax: number, ay: number, bx: number, by: number): [number, number][] | null {
  const glass: [number, number][] = [];
  const ok = walk(ax + .5, ay + .5, bx + .5, by + .5, stopsShot, (x, y) => { if (tileAt(x, y) === WINDOW) glass.push([x, y]); });
  return ok ? glass : null;
}

// At least 3 of 10 sight lines must be clear to see a tile; fewer is just a sliver.
export const MIN_SIGHT = 0.3;
const SAMPLES: [number, number][] = [[.5, .5], [.15, .15], [.85, .15], [.15, .85], [.85, .85]];

// The map never changes during a mission, so results are cached per level.
let cacheFor: unknown = null, cacheVer = -1;
let visCache = new Int8Array(0);
const leanCache = new Map<number, [number, number][]>();
function ensureCache() {
  if (cacheFor === L && cacheVer === L.version) return;
  cacheFor = L; cacheVer = L.version;
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

/** How far along a piece of cover someone can shift to look past its end, in tiles. */
export const LEAN_REACH = 2;
/** Where someone standing at (x, y) can look from: their own tile, plus, for each wall, crate or pillar they stand
 *  against, the open tile just past each end of it (leaning or shuffling out round the edge), up to LEAN_REACH tiles
 *  to the side. So a short piece of cover only hides a narrow wedge straight behind it. A long wall doesn't end within
 *  reach, and a doorway or window more than a tile along isn't an end, so nobody peeks along a wall into the next room
 *  (one right beside them they can lean into, as before). */
export function viewSpots(x: number, y: number) {
  ensureCache();
  const k = y * L.W + x;
  const hit = leanCache.get(k);
  if (hit) return hit;
  const spots: [number, number][] = [[x, y]];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!opaque(x + dx, y + dy)) continue;
    for (const [px, py] of [[dy, dx], [-dy, -dx]]) {
      for (let n = 1; n <= LEAN_REACH; n++) {
        const lx = x + px * n, ly = y + py * n;
        if (!passable(lx, ly)) break;
        if (opaque(lx + dx, ly + dy)) continue;            // still alongside the cover
        if ((n === 1 || !lineMember(lx + dx, ly + dy)) && !spots.some(s => s[0] === lx && s[1] === ly)) spots.push([lx, ly]);
        break;
      }
    }
  }
  leanCache.set(k, spots);
  return spots;
}

export interface View { f: number; x: number; y: number; }
/** Best view a person at (x, y) gets of a tile, leaning if that helps. Null means no sight. */
export function bestView(x: number, y: number, tx: number, ty: number, range = SIGHT_MAX): View | null {
  let best: View | null = null;
  for (const [sx, sy] of viewSpots(x, y)) {
    if (d2(sx, sy, tx, ty) > range * range) continue;
    const f = visFrac(sx, sy, tx, ty);
    if (f >= MIN_SIGHT && (!best || f > best.f || (f === best.f && sx === x && sy === y))) best = { f, x: sx, y: sy };
  }
  return best;
}
export const sightFrom = (x: number, y: number, tx: number, ty: number, range = SIGHT_MAX) => !!bestView(x, y, tx, ty, range);
/** Sight without leaning, for things that don't lean (SCP-173). */
export const rawSight = (x: number, y: number, tx: number, ty: number, range = SIGHT_MAX) => d2(x, y, tx, ty) <= range * range && visFrac(x, y, tx, ty) >= MIN_SIGHT;
