// The tactical geometry kernel (Tactical overhaul T1). One model of what stands on the map and one trace through it.
// Sight, line of fire, cover, the enemy AI and the lab all use these; nothing else decides whether a line is blocked.
//
// Every tile yields at most one obstacle, derived from the map's characters and the live state of doors and glass:
// - shape: it fills the tile, or it is a thin segment on the tile's centre line (a wall, partition, shut door or
//   window standing in a one-tile wall line, as XCOM draws walls on tile edges);
// - height: low (waist: desks, drums, a window's sill), high (head and up: pillars, crates), or structural (walls);
// - what it stops: sight, gunfire, both or neither (a window stops neither; reinforced glass stops bullets).
// Smoke is separate: it stops sight but not gunfire (T3 replaces this with density).
import { L, WALL, HALF, FULL, STEEL, DRUM, WINDOW, PART, passable, tileAt } from "./grid";

export const H_NONE = 0, H_LOW = 1, H_HIGH = 2, H_WALL = 3;
export const S_NONE = 0, S_FULL = 1, S_THIN_H = 2, S_THIN_V = 3;
/** What an obstacle stops. */
export const SIGHT = 1, FIRE = 2;
const F_GLASS = 4, F_DESTRUCT = 8;

let builtFor: unknown = null, builtVer = -1;
let shape = new Int8Array(0), height = new Int8Array(0), flags = new Int8Array(0);

const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < L.W && y < L.H;
const lineMember = (x: number, y: number) => {
  if (!inMap(x, y)) return false;
  const t = tileAt(x, y);
  return t === WALL || t === PART || t === WINDOW || L.door.has(y * L.W + x);
};
const openGround = (x: number, y: number) => inMap(x, y) && !lineMember(x, y);
/** Which way a wall-line piece runs, if it stands in a one-tile line with open ground on both sides. */
function thinKind(x: number, y: number) {
  if (openGround(x, y - 1) && openGround(x, y + 1) && (lineMember(x - 1, y) || lineMember(x + 1, y))) return S_THIN_H;
  if (openGround(x - 1, y) && openGround(x + 1, y) && (lineMember(x, y - 1) || lineMember(x, y + 1))) return S_THIN_V;
  return S_FULL;
}

function build() {
  builtFor = L; builtVer = L.version;
  const n = L.W * L.H;
  shape = new Int8Array(n); height = new Int8Array(n); flags = new Int8Array(n);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const i = y * L.W + x, t = L.grid[y][x], door = L.door.get(i);
    const set = (s: number, h: number, f: number) => { shape[i] = s; height[i] = h; flags[i] = f; };
    if (door) {
      if (door.state === "closed" || door.state === "locked") set(thinKind(x, y), H_WALL, SIGHT | FIRE | F_DESTRUCT);
      continue;   // an open, breached or destroyed doorway is a gap
    }
    if (t === WALL) set(thinKind(x, y), H_WALL, SIGHT | FIRE);
    else if (t === PART) set(thinKind(x, y), H_WALL, SIGHT | FIRE | F_DESTRUCT);
    else if (t === WINDOW) {
      const g = L.glass.get(i), k = thinKind(x, y);
      // a window's line runs the way its wall does; a lone window is treated as running across the map
      const s = k !== S_FULL ? k : (lineMember(x - 1, y) || lineMember(x + 1, y)) ? S_THIN_H : S_THIN_V;
      set(s, H_LOW, F_GLASS | (g && g.kind === "reinforced" && !g.broken ? FIRE : 0));
    }
    else if (t === FULL) set(S_FULL, H_HIGH, SIGHT | FIRE | F_DESTRUCT);
    else if (t === STEEL) set(S_FULL, H_WALL, SIGHT | FIRE);
    else if (t === HALF) set(S_FULL, H_LOW, F_DESTRUCT);
    else if (t === DRUM) set(S_FULL, H_LOW, F_DESTRUCT);
  }
}
function ensure() { if (builtFor !== L || builtVer !== L.version) build(); }

export interface Obstacle { shape: number; height: number; sight: boolean; fire: boolean; glass: boolean; destructible: boolean }
/** The obstacle on a tile (outside the map: a wall). */
export function obstacleAt(x: number, y: number): Obstacle {
  if (!inMap(x, y)) return { shape: S_FULL, height: H_WALL, sight: true, fire: true, glass: false, destructible: false };
  ensure();
  const i = y * L.W + x, f = flags[i];
  return { shape: shape[i], height: height[i], sight: !!(f & SIGHT), fire: !!(f & FIRE), glass: !!(f & F_GLASS), destructible: !!(f & F_DESTRUCT) };
}
export const heightAt = (x: number, y: number) => { if (!inMap(x, y)) return H_WALL; ensure(); return height[y * L.W + x]; };
/** Does the tile's obstacle stop this kind of line anywhere in it (a full block or a thin piece)? */
export const stopsAt = (x: number, y: number, mask: number) => { if (!inMap(x, y)) return true; ensure(); return (flags[y * L.W + x] & mask) !== 0; };

// ---- smoke (sight only) ----
let smoke = new Set<number>();
export function setSmoke(tiles: [number, number][]) { smoke = new Set(tiles.map(([x, y]) => y * L.W + x)); }
export const smoky = (x: number, y: number) => smoke.has(y * L.W + x);
export const anySmoke = () => smoke.size > 0;

/** One crossing of a trace: a tile whose obstacle the segment actually intersects, and where (0..1 along it). */
export interface Crossing { x: number; y: number; t: number }

/**
 * Walks the segment (x0,y0)→(x1,y1), in tile units, through the tiles between its end tiles (the end tiles
 * themselves are never obstacles to it: units stand on open ground, and a wall at the far end is what is being seen).
 * A full obstacle is hit on entering its tile; a thin one only where the segment crosses its centre line inside the
 * tile. A segment passing exactly through a corner is stopped only if both tiles beside that corner are full
 * obstacles of the kind asked about: it can't squeeze between two blocks touching at a corner.
 *
 * `mask` says what stops the trace (SIGHT, FIRE, or 0 for nothing). Smoke stops SIGHT. Every obstacle crossed before
 * the trace stops (stopping or not) is reported to `onCross`. Returns true if the segment got through.
 */
export function trace(x0: number, y0: number, x1: number, y1: number, mask: number, onCross?: (c: Crossing) => void): boolean {
  ensure();
  let cx = Math.floor(x0), cy = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1), dx = x1 - x0, dy = y1 - y0;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity;
  let tx = sx > 0 ? (cx + 1 - x0) / dx : sx < 0 ? (x0 - cx) / -dx : Infinity;
  let ty = sy > 0 ? (cy + 1 - y0) / dy : sy < 0 ? (y0 - cy) / -dy : Infinity;
  const W = L.W;
  const stops = (x: number, y: number) => {
    if (!inMap(x, y)) return true;
    const i = y * W + x;
    return (flags[i] & mask) !== 0 || ((mask & SIGHT) !== 0 && smoke.has(i));
  };
  const fullStop = (x: number, y: number) => !inMap(x, y) || (stops(x, y) && (shape[y * W + x] === S_FULL || smoke.has(y * W + x)));
  for (let guard = 0; guard < 400 && !(cx === ex && cy === ey); guard++) {
    let tIn: number;
    if (Math.abs(tx - ty) < 1e-9) {
      if (mask && fullStop(cx + sx, cy) && fullStop(cx, cy + sy)) return false;
      tIn = tx; cx += sx; cy += sy; tx += tdx; ty += tdy;
    } else if (tx < ty) { tIn = tx; cx += sx; tx += tdx; }
    else { tIn = ty; cy += sy; ty += tdy; }
    if (cx === ex && cy === ey) break;
    if (!inMap(cx, cy)) return false;
    const i = cy * W + cx, s = shape[i];
    if ((mask & SIGHT) !== 0 && smoke.has(i)) return false;   // smoke fills its tile
    if (s === S_NONE) continue;
    let hit = tIn;
    if (s !== S_FULL) {
      // where the segment crosses this tile's centre line, if it does inside the tile
      const tOut = Math.min(tx, ty, 1), d = s === S_THIN_H ? dy : dx, c = s === S_THIN_H ? cy + 0.5 - y0 : cx + 0.5 - x0;
      if (Math.abs(d) < 1e-12) { if (Math.abs(c) > 1e-9) continue; }
      else { const tc = c / d; if (tc < tIn - 1e-9 || tc > tOut + 1e-9) continue; hit = tc; }
    }
    onCross?.({ x: cx, y: cy, t: hit });
    if (stops(cx, cy)) return false;
  }
  return true;
}

// ---- seeing someone: eye points and body exposure ----
/** Points on a figure standing in a tile: the centre and four around it. */
export const BODY: [number, number][] = [[0.5, 0.5], [0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]];
/** A target counts as visible (and as a target) with at least this share of their body in view. */
export const VIS_MIN = 0.6;

let cacheFor: unknown = null, cacheVer = -1;
let expCache = new Int8Array(0);
function ensureCache() {
  if (cacheFor === L && cacheVer === L.version) return;
  cacheFor = L; cacheVer = L.version;
  const n = L.W * L.H;
  expCache = new Int8Array(n * n * 10).fill(-1);
  stepCache.clear();
  peekCache.clear();
}
/**
 * Share of a figure on tile (tx, ty) that someone on tile (ax, ay) can see (mask SIGHT) or hit (mask FIRE), looking
 * from the centre of their tile or, with `lean` 1 to 4 (east, west, south, north), leaning out that way by STEP_OUT.
 * Cached per map version unless there is smoke.
 */
export function exposure(ax: number, ay: number, tx: number, ty: number, mask = SIGHT, lean = 0, tlean = 0): number {
  if (ax === tx && ay === ty) return 1;
  ensureCache();
  const n = L.W * L.H, k = (((ay * L.W + ax) * n + ty * L.W + tx) * 2 + (mask === FIRE ? 1 : 0)) * 5 + lean;
  const useCache = !(mask & SIGHT) || !smoke.size;
  // a target leaning out (peeking past its own cover) is rarer: those go in a small map
  const mk = tlean ? `${k}|${tlean}` : "";
  if (useCache) { const c = tlean ? peekCache.get(mk) : expCache[k]; if (c !== undefined && c >= 0) return c / BODY.length; }
  const [lx, ly] = LEANS[lean], eyeX = ax + 0.5 + lx * STEP_OUT, eyeY = ay + 0.5 + ly * STEP_OUT;
  const [bx, by] = LEANS[tlean], offX = bx * STEP_OUT, offY = by * STEP_OUT;
  let clear = 0;
  for (const [ox, oy] of BODY) if (trace(eyeX, eyeY, tx + ox + offX, ty + oy + offY, mask)) clear++;
  if (useCache) { if (tlean) peekCache.set(mk, clear); else expCache[k] = clear; }
  return clear / BODY.length;
}
const peekCache = new Map<string, number>();
/** How far someone leans out from the centre of their tile when they step out past cover, in tiles: their head ends
 *  up a quarter of a tile past the edge of their own tile, enough to see round the corner but not as freely as
 *  standing in the open beside it. */
export const STEP_OUT = 0.75;
const LEANS: [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
const leanOf = (dx: number, dy: number) => dx > 0 ? 1 : dx < 0 ? 2 : dy > 0 ? 3 : dy < 0 ? 4 : 0;

// Step-out positions (XCOM's peek). Besides their own tile, someone can look and shoot from an open tile beside them.
// Against a wall, crate or pillar that faces the target, only a side tile where that cover ends counts (a side tile
// still behind the same cover is no better), and stepping back from it doesn't help.
type Step = { x: number; y: number; bad: [number, number][] };
const stepCache = new Map<number, Step[]>();
/** Somewhere a person can step out to: open ground (a shut door or a desk is not). */
const standable = (x: number, y: number) => inMap(x, y) && passable(x, y) && !stopsAt(x, y, SIGHT) && heightAt(x, y) === H_NONE;
export function eyePoints(x: number, y: number, tx = x, ty = y, standOn: (x: number, y: number) => boolean = standable): [number, number][] {
  ensureCache();
  const k = y * L.W + x;
  let cand = stepCache.get(k);
  if (!cand) {
    const cover = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).filter(([dx, dy]) => stopsAt(x + dx, y + dy, SIGHT));
    cand = [];
    for (const [px, py] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const lx = x + px, ly = y + py;
      if (!standOn(lx, ly)) continue;
      const bad = cover.filter(([dx, dy]) => (dx === -px && dy === -py) || (dx * px + dy * py === 0 && stopsAt(lx + dx, ly + dy, SIGHT)));
      cand.push({ x: lx, y: ly, bad });
    }
    stepCache.set(k, cand);
  }
  const ox = tx - x, oy = ty - y, out: [number, number][] = [[x, y]];
  for (const c of cand) if (!c.bad.some(([dx, dy]) => dx * ox + dy * oy > 0)) out.push([c.x, c.y]);
  return out;
}

export interface View { f: number; x: number; y: number; }
/**
 * The best view someone at (x, y) has of tile (tx, ty): from their own tile or a step-out, within range. With
 * `targetPeeks`, whoever is on (tx, ty) is a person standing by cover and watching: as in XCOM, they show themselves
 * leaning out past its ends too, so a soldier behind a crate can be seen (and shot, at the crate's cover) from in front.
 */
export function bestView(x: number, y: number, tx: number, ty: number, range: number, mask = SIGHT, peek = true, targetPeeks = false): View | null {
  let best: View | null = null;
  const spots = targetPeeks ? eyePoints(tx, ty, x, y) : [[tx, ty] as [number, number]];
  for (const [ex, ey] of peek ? eyePoints(x, y, tx, ty) : [[x, y] as [number, number]]) {
    if ((ex - tx) ** 2 + (ey - ty) ** 2 > range * range) continue;
    if (ex === tx && ey === ty) return { f: 1, x: ex, y: ey };
    // a step-out is a lean from their own tile toward it
    const lean = leanOf(ex - x, ey - y);
    for (const [sx, sy] of spots) {
      const tl = leanOf(sx - tx, sy - ty);
      const f = mask === FIRE ? Math.min(exposure(x, y, tx, ty, SIGHT, lean, tl), exposure(x, y, tx, ty, FIRE, lean, tl)) : exposure(x, y, tx, ty, SIGHT, lean, tl);
      if (f >= VIS_MIN && (!best || f > best.f || (f === best.f && ex === x && ey === y))) best = { f, x: ex, y: ey };
    }
  }
  return best;
}

// ---- cover ----
/** Cover values, as in modern XCOM: half and full. */
export const COVER_HALF = 20, COVER_FULL = 40;
export const coverValue = (h: number) => h >= H_HIGH ? COVER_FULL : h === H_LOW ? COVER_HALF : 0;
/**
 * The cover a figure on (tx, ty) has against a shot from the centre of (sx, sy), from the line of fire itself: the
 * tallest obstacle the shot passes through in the tiles touching the target's tile on the side it comes from. A shot
 * that comes in near a corner of the target's tile counts the cover on both sides of that corner (the corner of a
 * wall or crate protects, as in XCOM). Returns the cover value and the tile giving it.
 */
export function coverOn(tx: number, ty: number, sx: number, sy: number): { value: number; tile: [number, number] | null } {
  if (sx === tx && sy === ty) return { value: 0, tile: null };
  let best = 0, tile: [number, number] | null = null;
  const consider = (x: number, y: number) => {
    if (Math.abs(x - tx) + Math.abs(y - ty) !== 1) return;
    const h = heightAt(x, y);
    if (h > best) { best = h; tile = [x, y]; }
  };
  trace(sx + 0.5, sy + 0.5, tx + 0.5, ty + 0.5, 0, c => consider(c.x, c.y));
  // where the shot enters the target's tile; near a corner, both sides of that corner count
  const dx = tx + 0.5 - (sx + 0.5), dy = ty + 0.5 - (sy + 0.5);
  const tX = dx ? ((dx > 0 ? tx : tx + 1) - (sx + 0.5)) / dx : -Infinity, tY = dy ? ((dy > 0 ? ty : ty + 1) - (sy + 0.5)) / dy : -Infinity;
  const tEnter = Math.max(tX, tY), px = sx + 0.5 + dx * tEnter - tx, py = sy + 0.5 + dy * tEnter - ty;
  const nearX = Math.min(px, 1 - px) < 0.2, nearY = Math.min(py, 1 - py) < 0.2;
  if (nearX && nearY) {
    const cxs = px < 0.5 ? -1 : 1, cys = py < 0.5 ? -1 : 1;
    consider(tx + cxs, ty); consider(tx, ty + cys);
  } else if (tX >= tY) consider(tx + (dx > 0 ? -1 : 1), ty);
  else consider(tx, ty + (dy > 0 ? -1 : 1));
  return { value: coverValue(best), tile };
}
/** The cover a tile offers on each side (for the cover shields): north, east, south, west. */
export function coverSides(x: number, y: number): [number, number, number, number] {
  return [coverValue(heightAt(x, y - 1)), coverValue(heightAt(x + 1, y)), coverValue(heightAt(x, y + 1)), coverValue(heightAt(x - 1, y))];
}
