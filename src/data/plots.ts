// Map variety: every mission keeps a map's walls, doors, container and exits, but refurnishes each
// room from a random plot (office rows, a lab with pillars, a storeroom, a sparse room), and field
// maps are mirrored half the time. A layout is only used if every floor tile can still be reached.
import type { MapDef, Pt } from "../core/grid";

type Rect = [number, number, number, number];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const WALKABLE = new Set([".", "+", "E", "C"]);

/** Flip a map left to right, with every coordinate it carries. */
function mirror(def: MapDef): MapDef {
  const W = def.rows[0].length;
  const mx = (p: Pt): Pt => [W - 1 - p[0], p[1]];
  const mr = (r: Rect): Rect => [W - 1 - r[2], r[1], W - 1 - r[0], r[3]];
  return {
    ...def,
    rows: def.rows.map(r => [...r].reverse().join("")),
    area: (x, y) => def.area(W - 1 - x, y),
    squadSpawns: def.squadSpawns.map(mx),
    scpRooms: def.scpRooms.map(mr),
    insurgentRooms: def.insurgentRooms.map(mr),
    strayRooms: def.strayRooms.map(mr),
    hatch: def.hatch && mx(def.hatch),
    panel: def.panel && mx(def.panel),
  };
}

/** Every walkable tile reachable from the first spawn, moving like units do (no corner cutting). */
function allReachable(grid: string[][], from: Pt) {
  const H = grid.length, W = grid[0].length, ok = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && WALKABLE.has(grid[y][x]);
  const seen = new Set<number>([from[1] * W + from[0]]), q: Pt[] = [from];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!ok(nx, ny) || (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) || seen.has(ny * W + nx)) continue;
      seen.add(ny * W + nx); q.push([nx, ny]);
    }
  }
  let total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ok(x, y)) total++;
  return seen.size === total;
}

/** Lay one room out from a plot. Only touches open floor that isn't next to a door or kept clear. */
function furnish(grid: string[][], r: Rect, keep: Set<number>) {
  const W = grid[0].length;
  const free = (x: number, y: number) => grid[y]?.[x] === "." && !keep.has(y * W + x);
  const put = (x: number, y: number, c: string) => { if (free(x, y)) grid[y][x] = c; };
  const [x0, y0, x1, y1] = r, w = x1 - x0 + 1, h = y1 - y0 + 1;
  const plot = pick(w >= 6 && h >= 4 ? ["office", "lab", "storage", "sparse"] : ["sparse", "storage"]);
  if (plot === "office") {
    // rows of paired desks with an aisle between them
    for (let y = y0 + 1; y < y1; y += 2) for (let x = x0 + 1 + rand(0, 1); x + 1 < x1; x += 4) { put(x, y, "h"); put(x + 1, y, "h"); }
  } else if (plot === "lab") {
    for (let i = rand(1, 2); i > 0; i--) put(rand(x0 + 1, x1 - 1), rand(y0 + 1, y1 - 1), "H");
    for (let i = rand(2, 3); i > 0; i--) put(rand(x0 + 1, x1 - 1), rand(y0, y1), "h");
  } else if (plot === "storage") {
    // crates stacked along one wall, with gaps to squeeze between
    const top = Math.random() < 0.5;
    for (let x = x0 + rand(0, 1); x <= x1; x += 2) put(x, top ? y0 : y1, Math.random() < 0.15 ? "D" : Math.random() < 0.6 ? "H" : "h");
  } else {
    for (let i = rand(2, 3); i > 0; i--) put(rand(x0, x1), rand(y0, y1), "h");
  }
}

/** A freshly laid-out copy of a map for one mission. */
export function varyMap(base: MapDef, canMirror: boolean): MapDef {
  const def = canMirror && Math.random() < 0.5 ? mirror(base) : base;
  const W = def.rows[0].length;
  const rooms: Rect[] = [];
  for (const r of [...def.scpRooms, ...def.insurgentRooms, ...def.strayRooms]) if (!rooms.some(o => o.join() === r.join())) rooms.push(r);
  // tiles that always stay open: doorways and the tiles around them, spawns, the container's mouth, the hatch and panel
  const keep = new Set<number>();
  const hold = (x: number, y: number, rad: number) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) keep.add((y + dy) * W + x + dx); };
  def.rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === "+" || c === "C" || c === "E") hold(x, y, 1); }));
  for (const [x, y] of def.squadSpawns) hold(x, y, 1);
  if (def.hatch) hold(def.hatch[0], def.hatch[1], 1);
  if (def.panel) hold(def.panel[0], def.panel[1], 1);
  if (def.fixedFurniture) return def;
  for (let attempt = 0; attempt < 25; attempt++) {
    const grid = def.rows.map(r => [...r]);
    for (const [x0, y0, x1, y1] of rooms)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (grid[y][x] === "h" || grid[y][x] === "H") grid[y][x] = ".";
    for (const r of rooms) furnish(grid, r, keep);
    if (allReachable(grid, def.squadSpawns[0])) return { ...def, rows: grid.map(r => r.join("")) };
  }
  return def;
}
