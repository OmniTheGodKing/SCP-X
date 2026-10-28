// Phase 4C: towns built from pieces, so town missions don't keep repeating Main Street. A main street runs across the
// map with exits at both ends; two to four buildings stand on each side, each from a set of pieces (house, shop, diner,
// garage, chapel) with a street door and windows on the street side; alleys run between some of them; and when the
// mission needs the truck's container, one south lot is the truck lot. Every layout is checked before it's used.
import type { MapDef, Pt } from "../core/grid";

type Rect = [number, number, number, number];
type Piece = "house" | "shop" | "diner" | "garage" | "chapel";
const PIECES: Piece[] = ["house", "house", "shop", "diner", "garage", "chapel"];
const NAMES: Record<Piece, string> = { house: "houses", shop: "general store", diner: "diner", garage: "garage", chapel: "chapel nave" };
const W = 28, H = 18, STREET: [number, number] = [7, 10];

/** Split [a, b] into 2 to 4 spans at least 5 wide, sometimes with a one-tile alley between. */
function spans(a: number, b: number, rnd: () => number): { x0: number; x1: number; alley: boolean }[] {
  for (let tries = 0; tries < 30; tries++) {
    const n = 2 + Math.floor(rnd() * 3), out: { x0: number; x1: number; alley: boolean }[] = [];
    let x = a;
    for (let k = 0; k < n; k++) {
      const left = b - x + 1, need = (n - k - 1) * 6;
      const w = k === n - 1 ? left : Math.max(5, Math.min(left - need, 5 + Math.floor(rnd() * 6)));
      if (w < 5) break;
      const alley = k < n - 1 && rnd() < 0.4;
      out.push({ x0: x, x1: x + w - 1 - (alley ? 1 : 0), alley });
      x += w;
    }
    if (out.length === n && out[n - 1].x1 === b) return out;
  }
  return [{ x0: a, x1: Math.floor((a + b) / 2) - 1, alley: true }, { x0: Math.floor((a + b) / 2), x1: b, alley: false }];
}

/** Lay out one building in grid rows y0..y1 (the street-side wall is on `front`). Returns its interior. */
function building(g: string[][], x0: number, x1: number, y0: number, y1: number, front: number, piece: Piece, rnd: () => number): Rect {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = (x === x0 || x === x1 || y === y0 || y === y1) ? "#" : ".";
  // a street door, and a window or two either side of it
  const dx = x0 + 1 + Math.floor(rnd() * (x1 - x0 - 1));
  g[front][dx] = "+";
  for (const wx of [dx - 2, dx + 2, dx + 4]) if (wx > x0 && wx < x1 && rnd() < 0.7 && g[front][wx] === "#") g[front][wx] = "w";
  const ix0 = x0 + 1, ix1 = x1 - 1, iy0 = y0 + 1, iy1 = y1 - 1, keep = (x: number, y: number) => Math.abs(x - dx) <= 1 && Math.abs(y - front) <= 1;
  const put = (x: number, y: number, c: string) => { if (x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1 && !keep(x, y) && g[y][x] === ".") g[y][x] = c; };
  const back = front === y1 ? iy0 : iy1, mid = Math.floor((iy0 + iy1) / 2);
  switch (piece) {
    case "house": put(ix0 + 1, back, "h"); put(ix0 + 2, back, "h"); put(ix1 - 1, mid, "H"); put(ix1 - 1, back, "h"); break;
    case "shop": for (let x = ix0 + 1; x <= Math.min(ix1 - 1, ix0 + 3); x++) put(x, mid, "h"); put(ix1, back, "H"); put(ix0, back, "H"); break;
    case "diner": for (let x = ix0 + 1; x < ix1; x += 3) { put(x, back, "h"); put(x, mid, "h"); } break;
    case "garage": put(ix0 + 1, mid, "H"); put(ix0 + 2, mid, "H"); put(ix1, back, "D"); put(ix1 - 1, back, "h"); break;
    case "chapel": for (let x = ix0 + 1; x < ix1; x++) if (x !== Math.floor((ix0 + ix1) / 2)) { put(x, back, "h"); if (iy1 - iy0 >= 2) put(x, mid, "h"); } break;
  }
  return [ix0, iy0, ix1, iy1];
}

/** Every walkable tile reachable from `from`, moving as units do. */
function reachable(g: string[][], from: Pt) {
  const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && ".+ECD".includes(g[y][x]) && g[y][x] !== "D";
  const seen = new Set([from[1] * W + from[0]]), q: Pt[] = [from], dist = new Map<number, number>([[from[1] * W + from[0], 0]]);
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!ok(nx, ny) || seen.has(ny * W + nx)) continue;
      seen.add(ny * W + nx); dist.set(ny * W + nx, dist.get(y * W + x)! + 1); q.push([nx, ny]);
    }
  }
  let all = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ok(x, y) && !seen.has(y * W + x)) all = false;
  return { all, dist };
}

/** One attempt at a town. `truck`: the mission needs the truck's container. */
function attempt(truck: boolean, rnd: () => number): MapDef | null {
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill("#"));
  for (let y = STREET[0]; y <= STREET[1]; y++) for (let x = 1; x < W - 1; x++) g[y][x] = ".";
  for (let y = STREET[0]; y <= STREET[1]; y++) { g[y][0] = "E"; g[y][W - 1] = "E"; }
  const rooms: { r: Rect; name: string }[] = [];
  const north = spans(1, 26, rnd), south = spans(1, 26, rnd);
  for (const s of north) {
    const piece = PIECES[Math.floor(rnd() * PIECES.length)];
    rooms.push({ r: building(g, s.x0, s.x1, 0, 6, 6, piece, rnd), name: NAMES[piece] });
    if (s.alley) for (let y = 1; y <= 6; y++) g[y][s.x1 + 1] = ".";
  }
  // the truck lot takes the widest south span that can hold the container (5 wide, 3 deep, open to the street)
  const lotAt = truck ? south.filter(s => s.x1 - s.x0 >= 6).sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0] : undefined;
  if (truck && !lotAt) return null;
  for (const s of south) {
    if (s === lotAt) {
      for (let y = 11; y <= 16; y++) for (let x = s.x0; x <= s.x1; x++) g[y][x] = ".";
      const cx = s.x0 + 1 + Math.floor(rnd() * (s.x1 - s.x0 - 5));
      ["SCCCS", "SCCCS", "SSSSS"].forEach((row, k) => [...row].forEach((c, j) => { g[14 + k][cx + j] = c; }));
      rooms.push({ r: [s.x0, 11, s.x1, 13], name: "truck lot" });
      continue;
    }
    const piece = PIECES[Math.floor(rnd() * PIECES.length)];
    rooms.push({ r: building(g, s.x0, s.x1, 11, 17, 11, piece, rnd), name: NAMES[piece] });
    if (s.alley) for (let y = 11; y <= 16; y++) g[y][s.x1 + 1] = ".";
  }
  for (let x = 0; x < W; x++) { g[0][x] = "#"; g[H - 1][x] = "#"; }
  // a few things on the street: parked cars (two full-cover tiles on asphalt draw as a truck) and crates
  for (let k = 0; k < 3; k++) {
    const x = 4 + Math.floor(rnd() * 19), y = rnd() < 0.5 ? STREET[0] : STREET[1];
    if (g[y][x] === "." && g[y][x + 1] === "." && g[y - (y === STREET[0] ? 1 : -1)][x] !== "+" && g[y - (y === STREET[0] ? 1 : -1)][x + 1] !== "+") { g[y][x] = "H"; g[y][x + 1] = "H"; }
  }
  for (let k = 0; k < 4; k++) { const x = 4 + Math.floor(rnd() * 20), y = STREET[0] + 1 + Math.floor(rnd() * 2); if (g[y][x] === ".") g[y][x] = "h"; }

  // checks: everything reachable from the west end of the street; cover on 8-15% of open ground; two far rooms
  const spawn: Pt = [1, 8];
  const reach = reachable(g, spawn);
  if (!reach.all) return null;
  let open = 0, cover = 0;
  for (let y = STREET[0]; y <= STREET[1]; y++) for (let x = 1; x < W - 1; x++) { if (g[y][x] === ".") open++; else if (g[y][x] === "h" || g[y][x] === "H") cover++; }
  const share = cover / (open + cover);
  if (share < 0.08 || share > 0.15) return null;
  const far = rooms.filter(({ r }) => { let near = 999; for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) { const d = reach.dist.get(y * W + x); if (d !== undefined) near = Math.min(near, d); if (Math.max(Math.abs(x - spawn[0]), Math.abs(y - spawn[1])) < 8) near = -1; } return near >= 10; });
  if (far.length < 2) return null;
  if (truck) { const lot = rooms.find(r => r.name === "truck lot")!; const free = [...Array(5).keys()].some(j => { const x = lot.r[0] + j; return g[13][x] === "." ; }); if (!free) return null; }

  const rows = g.map(r => r.join(""));
  const named = rooms.map(r => r);
  return {
    name: "A town",
    rows,
    area(x, y) {
      if (y >= STREET[0] && y <= STREET[1]) return "Main Street";
      const r = named.find(({ r }) => x >= r[0] - 1 && x <= r[2] + 1 && y >= r[1] - 1 && y <= r[3] + 1);
      return r ? r.name : y < STREET[0] ? "back gardens" : "back lots";
    },
    squadSpawns: [[1, 7], [2, 8], [1, 9], [3, 10]],
    scpRooms: rooms.filter(r => r.name !== "truck lot").map(r => r.r),
    insurgentRooms: far.map(r => r.r),
    strayRooms: rooms.filter(r => r.name !== "truck lot").map(r => r.r).concat([[4, STREET[0], 24, STREET[1]]]),
    fixedFurniture: true,
  };
}

/** A generated town, or null if 20 tries all fail the checks (then the hand-made Main Street is used). */
export function generateTown(truck: boolean, rnd: () => number = Math.random): MapDef | null {
  for (let k = 0; k < 20; k++) { const m = attempt(truck, rnd); if (m) return m; }
  return null;
}
