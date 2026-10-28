// Tile grid, movement rules and pathfinding for the current mission map.

export const TS = 32;           // tile size in pixels
export const R = 9;             // the old sight radius; now only a reference for short-range checks (Phase 4I)

export const WALL = 0, FLOOR = 1, HALF = 2, FULL = 3, EXIT = 4, CONT = 5, STEEL = 6, DRUM = 7, WINDOW = 8, PART = 9;

/** Phase 4I structure: doors with a kind and a state, windows, and what can be destroyed. */
export type DoorKind = "standard" | "security" | "containment" | "emergency";
export type DoorState = "open" | "closed" | "locked" | "breached" | "destroyed";
export interface Door { kind: DoorKind; state: DoorState }
export interface Glass { kind: "ordinary" | "reinforced"; broken: boolean }
export type Tile = number;
export type Pt = [number, number];

export interface MapDef {
  name: string;
  // # wall · . floor · + doorway · h desk (half cover) · H pillar (full cover)
  // w window · W reinforced (observation) window · p partition (a thin wall explosives can open)
  // C transport container floor · S container side wall · E exit
  rows: string[];
  area: (x: number, y: number) => string;
  // spawn regions as [x0, y0, x1, y1] inclusive
  squadSpawns: Pt[];
  scpRooms: [number, number, number, number][];
  insurgentRooms: [number, number, number, number][];
  strayRooms: [number, number, number, number][];
  /** Site-19 maps: the surface hatch SCP-173 can escape through, and the panel that locks it. */
  hatch?: Pt;
  panel?: Pt;
  /** Keep the furniture as drawn (outdoor maps whose spawn areas aren't rooms). */
  fixedFurniture?: boolean;
  /** Site-19's walls are reinforced: only partitions, doors and windows give way. Elsewhere a rocket or a breaching
   *  charge can open an interior wall. */
  reinforced?: boolean;
}

export class Level {
  readonly W: number;
  readonly H: number;
  readonly grid: Tile[][] = [];
  readonly doors = new Set<number>();
  /** Each doorway's kind and state, and each window's. */
  readonly door = new Map<number, Door>();
  readonly glass = new Map<number, Glass>();
  /** Goes up whenever a door, window or wall changes, so sight and the map's art know to redo their work. */
  version = 0;
  readonly contTiles: Pt[] = [];
  readonly exitMap: Int16Array;

  constructor(readonly def: MapDef) {
    this.W = def.rows[0].length;
    this.H = def.rows.length;
    const codes: Record<string, Tile> = { "#": WALL, h: HALF, H: FULL, E: EXIT, C: CONT, S: STEEL, D: DRUM, w: WINDOW, W: WINDOW, p: PART };
    def.rows.forEach((row, y) => {
      this.grid[y] = [];
      [...row].forEach((c, x) => {
        this.grid[y][x] = codes[c] ?? FLOOR;
        if (c === "+") this.doors.add(y * this.W + x);
        if (c === "w" || c === "W") this.glass.set(y * this.W + x, { kind: c === "W" ? "reinforced" : "ordinary", broken: false });
        if (c === "C") this.contTiles.push([x, y]);
      });
    });
    L = this;
    // doors: into a containment cell they are containment doors, inside Site-19 security doors, elsewhere ordinary;
    // all start closed
    for (const i of this.doors) {
      const x = i % this.W, y = (i / this.W) | 0;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => def.area(x + dx, y + dy));
      const kind: DoorKind = near.some(a => /containment cell/.test(a)) ? "containment" : def.reinforced ? "security" : "standard";
      this.door.set(i, { kind, state: "closed" });
    }
    const exits: Pt[] = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.grid[y][x] === EXIT) exits.push([x, y]);
    this.exitMap = bfs(exits, 999).dist;
  }
}

/** The level currently being played. Set by useLevel(). */
export let L: Level;
export function useLevel(level: Level) { L = level; }

export const tileAt = (x: number, y: number): Tile => (x < 0 || y < 0 || x >= L.W || y >= L.H) ? WALL : L.grid[y][x];
// Breachers with Bulldozer vault desks: while planning their move, half cover counts as passable.
let vaulting = false;
export function setVault(on: boolean) { vaulting = on; }
/** Tiles that cost 2 to move into (floor corroded by SCP-106). */
let slow: Set<number> = new Set();
export function setSlow(tiles: Set<number>) { slow = tiles; }
const doorAt = (x: number, y: number) => (x < 0 || y < 0 || x >= L.W || y >= L.H) ? undefined : L.door.get(y * L.W + x);
export const doorShut = (x: number, y: number) => { const d = doorAt(x, y); return !!d && (d.state === "closed" || d.state === "locked"); };
export const passable = (x: number, y: number) => { const t = tileAt(x, y); return (t === FLOOR && doorAt(x, y)?.state !== "locked") || t === EXIT || t === CONT || (vaulting && t === HALF); };
/** Blocks sight: walls, full cover, steel, partitions, and shut doors. Windows are transparent. */
export const opaque = (x: number, y: number) => { const t = tileAt(x, y); return t === WALL || t === FULL || t === STEEL || t === PART || doorShut(x, y); };
/** Blocks a bullet: anything opaque, and reinforced glass while it holds. Ordinary glass shatters and lets it through. */
export const stopsShot = (x: number, y: number) => opaque(x, y) || (tileAt(x, y) === WINDOW && !!L.glass.get(y * L.W + x) && L.glass.get(y * L.W + x)!.kind === "reinforced" && !L.glass.get(y * L.W + x)!.broken);
/** Something about the structure changed: sight caches and the map's art must be redone. */
export const bump = () => { L.version++; };
/** Walking through a shut (unlocked) door opens it. Returns true if it did. */
export function openDoor(x: number, y: number) {
  const d = doorAt(x, y);
  if (!d || d.state !== "closed") return false;
  d.state = "open"; bump(); return true;
}
export function breakGlass(x: number, y: number) {
  const g = L.glass.get(y * L.W + x);
  if (!g || g.broken) return false;
  g.broken = true; bump(); return true;
}
/** An explosion's effect on structure at a tile: power 1 (grenades) takes cover, doors, partitions and glass;
 *  power 2 (rockets, breaching charges) also takes an interior wall where walls aren't reinforced. Returns what broke. */
export function blastStructure(x: number, y: number, power: number): string | null {
  if (x <= 0 || y <= 0 || x >= L.W - 1 || y >= L.H - 1) return null;
  const t = tileAt(x, y), i = y * L.W + x, d = L.door.get(i);
  if (t === HALF) { L.grid[y][x] = FLOOR; bump(); return "cover"; }
  if (d && d.state !== "destroyed") { d.state = "destroyed"; bump(); return "door"; }
  if (t === PART) { L.grid[y][x] = FLOOR; bump(); return "partition"; }
  if (t === WINDOW) { return breakGlass(x, y) ? "window" : null; }
  if (t === WALL && power >= 2 && !L.def.reinforced) { L.grid[y][x] = FLOOR; bump(); return "wall"; }
  return null;
}
export const inContainer = (x: number, y: number) => tileAt(x, y) === CONT;
export const nearContainer = (x: number, y: number) =>
  !inContainer(x, y) && L.contTiles.some(([cx, cy]) => Math.max(Math.abs(cx - x), Math.abs(cy - y)) <= 1);
export const area = (x: number, y: number) => L.def.area(x, y);

export const d2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;
export const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

export const DIRS: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export function canStep(x: number, y: number, dx: number, dy: number) {
  if (!passable(x + dx, y + dy)) return false;
  if (dx && dy && (!passable(x + dx, y) || !passable(x, y + dy))) return false;
  return true;
}

export interface Reach { dist: Int16Array; prev: Int16Array; }
export function bfs(starts: Pt[], maxD: number, blocked?: (x: number, y: number) => boolean): Reach {
  const { W, H } = L;
  const dist = new Int16Array(W * H).fill(-1), prev = new Int16Array(W * H).fill(-1);
  const q: number[] = [];
  for (const [sx, sy] of starts) { dist[sy * W + sx] = 0; q.push(sy * W + sx); }
  if (slow.size) {
    // with slow tiles on the map, a simple Dijkstra (the map is small enough to scan for the next tile)
    const done = new Uint8Array(W * H);
    for (;;) {
      let i = -1;
      for (let k = 0; k < W * H; k++) if (dist[k] >= 0 && !done[k] && (i < 0 || dist[k] < dist[i])) i = k;
      if (i < 0) break;
      done[i] = 1;
      const d = dist[i], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS) {
        if (!canStep(x, y, dx, dy)) continue;
        const ni = (y + dy) * W + x + dx, nd = d + (slow.has(ni) ? 2 : 1);
        if (nd > maxD || done[ni] || (dist[ni] !== -1 && dist[ni] <= nd) || (blocked && blocked(x + dx, y + dy))) continue;
        dist[ni] = nd; prev[ni] = i;
      }
    }
    return { dist, prev };
  }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], d = dist[i];
    if (d >= maxD) continue;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      if (!canStep(x, y, dx, dy)) continue;
      const ni = (y + dy) * W + x + dx;
      if (dist[ni] !== -1 || (blocked && blocked(x + dx, y + dy))) continue;
      dist[ni] = d + 1; prev[ni] = i; q.push(ni);
    }
  }
  return { dist, prev };
}
export function pathTo(res: Reach, x: number, y: number): Pt[] | null {
  let i = y * L.W + x;
  if (res.dist[i] < 0) return null;
  const p: number[] = [];
  while (res.prev[i] !== -1) { p.push(i); i = res.prev[i]; }
  return p.reverse().map(i => [i % L.W, (i / L.W) | 0] as Pt);
}

/** Random free floor tiles inside a rectangle. */
export function floorTiles(r: [number, number, number, number]): Pt[] {
  const out: Pt[] = [];
  for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) if (tileAt(x, y) === FLOOR) out.push([x, y]);
  return out;
}
