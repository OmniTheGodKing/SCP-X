// Tile grid, movement rules and pathfinding for the current mission map.

export const TS = 32;           // tile size in pixels
export const R = 9;             // sight range in tiles

export const WALL = 0, FLOOR = 1, HALF = 2, FULL = 3, EXIT = 4, CONT = 5, STEEL = 6;
export type Tile = number;
export type Pt = [number, number];

export interface MapDef {
  name: string;
  // # wall · . floor · + doorway · h desk (half cover) · H pillar (full cover)
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
}

export class Level {
  readonly W: number;
  readonly H: number;
  readonly grid: Tile[][] = [];
  readonly doors = new Set<number>();
  readonly contTiles: Pt[] = [];
  readonly exitMap: Int16Array;

  constructor(readonly def: MapDef) {
    this.W = def.rows[0].length;
    this.H = def.rows.length;
    const codes: Record<string, Tile> = { "#": WALL, h: HALF, H: FULL, E: EXIT, C: CONT, S: STEEL };
    def.rows.forEach((row, y) => {
      this.grid[y] = [];
      [...row].forEach((c, x) => {
        this.grid[y][x] = codes[c] ?? FLOOR;
        if (c === "+") this.doors.add(y * this.W + x);
        if (c === "C") this.contTiles.push([x, y]);
      });
    });
    L = this;
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
export const passable = (x: number, y: number) => { const t = tileAt(x, y); return t === FLOOR || t === EXIT || t === CONT || (vaulting && t === HALF); };
export const opaque = (x: number, y: number) => { const t = tileAt(x, y); return t === WALL || t === FULL || t === STEEL; };
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
