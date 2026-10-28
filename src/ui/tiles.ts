// The tactical map's static art: walls, floors, cover, doors, props and lighting, drawn once per level into an
// offscreen canvas and redrawn only when the grid changes (a desk blown apart). Everything here is drawn in code.
// Kept dark and low in contrast so units, overlays and tags stay readable on top.
import { CONT, DRUM, EXIT, FULL, HALF, L, PART, STEEL, TS, WALL, WINDOW, area, passable, tileAt, type Level } from "../core/grid";
import { S } from "../game/state";

type MapId = "wingC" | "town" | "farm" | "port" | "dblock" | "gate" | "rail" | "church" | "lab" | "ship";
export type Surface = "asphalt" | "grass" | "dirt" | "concrete" | "wood" | "labtile" | "steel";
type Material = "concrete" | "brick" | "timber" | "metal";

const SURFACE_BASE: Record<Surface, string> = { asphalt: "#24282c", grass: "#222d22", dirt: "#2b271f", concrete: "#283038", wood: "#2b2520", labtile: "#28313a", steel: "#232a31" };
export function surfaceFor(name: string): Surface {
  if (/field|graveyard/.test(name)) return "grass";
  if (/rail tracks|goods yard/.test(name)) return "dirt";
  if (/platform|deck/.test(name)) return "concrete";
  if (/hold|engine room|crew quarters|bridge/.test(name)) return "steel";
  if (/barn/.test(name)) return "dirt";
  if (/street|road|lot|motor pool|courtyard|dock/i.test(name)) return "asphalt";
  if (/lab/.test(name)) return "labtile";
  if (/cell(?! corridor)|containment|laundry/.test(name)) return "steel";
  if (/diner|store|church|farmhouse|houses|office|records|barracks|canteen|mess|guard room/.test(name)) return "wood";
  return "concrete";
}
const outdoorArea = (name: string) => /field|street|road|lot|motor pool|courtyard|dock|yard|track|platform|graveyard|deck/i.test(name);

/** Each map's building material, the colour of its roofs or bedrock, and what bounds its open ground. */
const THEME: Record<MapId, { mat: Material; mass: string; border: "fence" | "hedge" | "rock" | "wall"; under: boolean }> = {
  wingC: { mat: "concrete", mass: "#15191d", border: "rock", under: true },
  dblock: { mat: "concrete", mass: "#15191d", border: "rock", under: true },
  town: { mat: "brick", mass: "#2a2422", border: "wall", under: false },
  farm: { mat: "timber", mass: "#2c2620", border: "hedge", under: false },
  port: { mat: "metal", mass: "#22272c", border: "wall", under: false },
  gate: { mat: "concrete", mass: "#1f2428", border: "fence", under: false },
  rail: { mat: "brick", mass: "#2a2622", border: "fence", under: false },
  church: { mat: "brick", mass: "#2a2422", border: "hedge", under: false },
  lab: { mat: "concrete", mass: "#15191d", border: "rock", under: true },
  ship: { mat: "metal", mass: "#16232e", border: "wall", under: false },
};
const FACE: Record<Material, { top: string; face: string; line: string; hi: string }> = {
  concrete: { top: "#3b4652", face: "#4a5765", line: "#3a4450", hi: "#5d6b7a" },
  brick: { top: "#4a3a33", face: "#6a4436", line: "#3c2a24", hi: "#7d5545" },
  timber: { top: "#463a2c", face: "#5e4a33", line: "#3a2e20", hi: "#6f5a40" },
  metal: { top: "#3d464e", face: "#56616b", line: "#3a434b", hi: "#6d7a85" },
};

/** A fixed pseudo-random number per tile, so textures don't shimmer between frames. */
export const noise = (x: number, y: number, k: number) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

let cache: { level: Level; sig: string; cv: HTMLCanvasElement } | null = null;
/** Tiles where cover used to stand and was blown apart this mission: they keep their debris. */
let rubble = new Set<number>();
let lastGrid: number[] | null = null;

const gridSig = () => { let s = String(L.version) + ":"; for (const row of L.grid) s += row.join(""); return s; };

/** The static map layer for the current level, rebuilt only when something on it changed. */
export function mapLayer(dpr: number): HTMLCanvasElement {
  const sig = gridSig() + (S.setup.weather ?? "") + (S.setup.night ? "n" : "");
  if (cache && cache.level === L && cache.sig === sig) return cache.cv;
  if (!cache || cache.level !== L) { rubble = new Set(); lastGrid = null; }
  const flat = L.grid.flat();
  if (lastGrid) flat.forEach((t, i) => { if (lastGrid![i] === HALF && t !== HALF) rubble.add(i); });
  lastGrid = flat;
  const cv = cache?.level === L ? cache.cv : document.createElement("canvas");
  cv.width = L.W * TS * dpr; cv.height = L.H * TS * dpr;
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint(ctx);
  cache = { level: L, sig, cv };
  return cv;
}

function paint(ctx: CanvasRenderingContext2D) {
  const map = (S.setup.map ?? "wingC") as MapId, th = THEME[map] ?? THEME.wingC;
  const surf: Surface[] = [], areas: string[] = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { const a = area(x, y); areas.push(a); surf.push(surfaceFor(a)); }
  const at = (x: number, y: number) => y * L.W + x;
  const isWall = (x: number, y: number) => { const t = tileAt(x, y); return t === WALL; };
  /** What a wall tile is next to: the first open tile beside it, for its floor and whether it faces open ground. */
  const neighbourOpen = (x: number, y: number) => {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= L.W || ny >= L.H) continue;
      if (tileAt(nx, ny) !== WALL) return at(nx, ny);
    }
    return -1;
  };
  const ground = (i: number) => (i >= 0 ? surf[i] : "concrete") as Surface;

  // 1. floors everywhere (under walls too, so fences and hedges stand on something)
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const t = tileAt(x, y);
    if (t === WALL || t === WINDOW || t === PART) { const n = neighbourOpen(x, y); floor(ctx, x, y, ground(n), map); continue; }
    floor(ctx, x, y, surf[at(x, y)], map);
  }
  // 2. painted markings and lighting, before anything stands on the floor
  markings(ctx, map, surf, areas);
  if (!outdoorish(map) || map === "gate") lights(ctx);

  // 3. walls: open-ground borders become fences, hedges or rock; buildings get their material with a south face
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    if (!isWall(x, y)) continue;
    const n = neighbourOpen(x, y);
    const edge = x === 0 || y === 0 || x === L.W - 1 || y === L.H - 1;
    const openGround = n >= 0 && outdoorArea(areas[n]);
    if (edge && openGround && th.border !== "wall") { border(ctx, x, y, th.border === "rock" ? "hedge" : th.border); continue; }
    wall(ctx, x, y, n < 0 ? null : th.mat, th.mass, map);
  }
  // shadows the walls cast to the south and east
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    if (isWall(x, y) || tileAt(x, y) === STEEL) continue;
    const px = x * TS, py = y * TS;
    if (isWall(x, y - 1)) { const g = ctx.createLinearGradient(0, py, 0, py + 9); g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(px, py, TS, 9); }
    if (isWall(x - 1, y)) { const g = ctx.createLinearGradient(px, 0, px + 6, 0); g.addColorStop(0, "rgba(0,0,0,0.32)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(px, py, 6, TS); }
  }

  // 4. what stands on the floor
  const done = new Set<number>();
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const t = tileAt(x, y), i = at(x, y), a = areas[i], sf = surf[i];
    if (done.has(i)) continue;
    if (t === HALF) halfCover(ctx, x, y, a, sf, map);
    else if (t === FULL) {
      // two pieces of full cover side by side on open asphalt are a parked truck
      if (sf === "asphalt" && tileAt(x + 1, y) === FULL && areas[at(x + 1, y)] === a) { truck(ctx, x, y); done.add(at(x + 1, y)); }
      else fullCover(ctx, x, y, a, sf, map);
    } else if (t === DRUM) drum(ctx, x, y);
    else if (t === EXIT) exitTile(ctx, x, y);
    else if (t === STEEL || t === CONT) containerTile(ctx, x, y, t === STEEL, map);
    else if (passable(x, y) && rubble.has(i)) debris(ctx, x, y);
    else if (passable(x, y)) decal(ctx, x, y, a, sf, map);
  }
  for (const i of L.doors) door(ctx, i % L.W, (i / L.W) | 0, map, th.mat);
  // Phase 4C: stairs, lifts and ladders between floors
  for (const l of L.def.links ?? []) for (const [x, y] of [l.a, l.b]) linkTile(ctx, x, y, l.kind);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { if (tileAt(x, y) === WINDOW) windowTile(ctx, x, y, th.mat); else if (tileAt(x, y) === PART) partition(ctx, x, y); }

  // 5. room names stencilled faintly on the floor, and the tile grid so moves can be counted
  roomLabels(ctx, areas);
  ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 1;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (tileAt(x, y) !== WALL) ctx.strokeRect(x * TS + 0.5, y * TS + 0.5, TS - 1, TS - 1);

  // 6. the weather's mark on the ground: wet sheen and puddles, or snow on open ground
  const w = S.setup.weather;
  if (w === "rain" || w === "storm" || w === "snow") for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const i = at(x, y);
    if (!passable(x, y) || !outdoorArea(areas[i])) continue;
    const px = x * TS, py = y * TS;
    if (w === "snow") { ctx.fillStyle = "rgba(225,232,240,0.16)"; ctx.fillRect(px, py, TS, TS); for (let k = 0; k < 3; k++) { ctx.fillStyle = "rgba(235,240,246,0.22)"; ctx.beginPath(); ctx.ellipse(px + noise(x, y, 40 + k) * TS, py + noise(x, y, 50 + k) * TS, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); } }
    else if (noise(x, y, 77) < 0.22) { ctx.fillStyle = "rgba(120,150,180,0.16)"; ctx.beginPath(); ctx.ellipse(px + 8 + noise(x, y, 78) * 16, py + 8 + noise(x, y, 79) * 16, 6 + noise(x, y, 80) * 6, 3 + noise(x, y, 81) * 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}
/** One end of a stair, lift or ladder. */
function linkTile(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "stairs" | "lift" | "ladder") {
  const px = x * TS, py = y * TS;
  ctx.save();
  if (kind === "stairs") {
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? "#4b5866" : "#5d6b7a"; ctx.fillRect(px + 3, py + 3 + k * 4.4, TS - 6, 4.4); }
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.strokeRect(px + 3.5, py + 3.5, TS - 7, TS - 7);
  } else if (kind === "ladder") {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(px + 6, py + 4, TS - 12, TS - 8);
    ctx.strokeStyle = "#a9b0a0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 10, py + 4); ctx.lineTo(px + 10, py + TS - 4); ctx.moveTo(px + TS - 10, py + 4); ctx.lineTo(px + TS - 10, py + TS - 4);
    for (let k = 0; k < 5; k++) { ctx.moveTo(px + 10, py + 7 + k * 5); ctx.lineTo(px + TS - 10, py + 7 + k * 5); } ctx.stroke();
  } else {
    // the lift car: steel floor plate and a call-light
    ctx.fillStyle = "#3d464e"; ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
    ctx.strokeStyle = "#6d7a85"; ctx.lineWidth = 1; for (let k = 6; k < TS - 4; k += 5) { ctx.beginPath(); ctx.moveTo(px + 4, py + k + 0.5); ctx.lineTo(px + TS - 4, py + k + 0.5); ctx.stroke(); }
    ctx.fillStyle = "#d8bf86"; ctx.beginPath(); ctx.moveTo(px + TS / 2, py + 7); ctx.lineTo(px + TS / 2 + 5, py + 13); ctx.lineTo(px + TS / 2 - 5, py + 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px + TS / 2, py + TS - 7); ctx.lineTo(px + TS / 2 + 5, py + TS - 13); ctx.lineTo(px + TS / 2 - 5, py + TS - 13); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
const outdoorish = (m: MapId) => m === "farm" || m === "town" || m === "gate" || m === "rail" || m === "church" || m === "ship";

// ---------- floors ----------
function floor(ctx: CanvasRenderingContext2D, x: number, y: number, sf: Surface, map: MapId) {
  const px = x * TS, py = y * TS, n = (k: number) => noise(x, y, k);
  ctx.fillStyle = SURFACE_BASE[sf]; ctx.fillRect(px, py, TS, TS);
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, TS, TS); ctx.clip();
  switch (sf) {
    case "asphalt": {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + n(1) * 0.025})`; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = "rgba(255,255,255,0.06)"; for (let k = 0; k < 9; k++) ctx.fillRect(px + n(k + 2) * TS, py + n(k + 20) * TS, 1.3, 1.3);
      ctx.fillStyle = "rgba(0,0,0,0.18)"; for (let k = 0; k < 5; k++) ctx.fillRect(px + n(k + 40) * TS, py + n(k + 50) * TS, 2, 2);
      if (n(60) < 0.08) { ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + n(61) * TS, py); ctx.lineTo(px + n(62) * TS, py + TS / 2); ctx.lineTo(px + n(63) * TS, py + TS); ctx.stroke(); }
      break;
    }
    case "grass": {
      ctx.fillStyle = `rgba(${60 + n(1) * 30},${90 + n(2) * 30},50,0.10)`; ctx.fillRect(px, py, TS, TS);
      if (n(3) < 0.18) { ctx.fillStyle = "rgba(70,55,35,0.30)"; ctx.beginPath(); ctx.ellipse(px + n(4) * TS, py + n(5) * TS, 7, 4, n(6) * 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 1;
      for (let k = 0; k < 10; k++) {
        const gx = px + n(k + 7) * TS, gy = py + n(k + 30) * TS, tone = n(k + 60);
        ctx.strokeStyle = tone < 0.5 ? "rgba(120,165,95,0.22)" : "rgba(80,120,65,0.30)";
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 1.5, gy - 4); ctx.moveTo(gx, gy); ctx.lineTo(gx + 1.8, gy - 3.5); ctx.stroke();
      }
      if (n(90) < 0.06) { ctx.fillStyle = n(91) < 0.5 ? "rgba(230,215,120,0.55)" : "rgba(220,220,235,0.5)"; for (let k = 0; k < 3; k++) ctx.fillRect(px + n(92 + k) * TS, py + n(95 + k) * TS, 1.6, 1.6); }
      break;
    }
    case "dirt": {
      ctx.fillStyle = "rgba(160,130,90,0.10)"; for (let k = 0; k < 10; k++) ctx.fillRect(px + n(k) * TS, py + n(k + 11) * TS, 1.6, 1.6);
      ctx.strokeStyle = "rgba(200,170,90,0.20)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const sx = px + n(k + 30) * TS, sy = py + n(k + 40) * TS, a = n(k + 50) * Math.PI; ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 6); }
      ctx.stroke();
      break;
    }
    case "wood": {
      ctx.fillStyle = `rgba(150,110,70,${0.03 + n(1) * 0.05})`; ctx.fillRect(px, py, TS, TS);
      ctx.strokeStyle = "rgba(0,0,0,0.30)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 8; k < TS; k += 8) { ctx.moveTo(px, py + k + 0.5); ctx.lineTo(px + TS, py + k + 0.5); }
      for (let r = 0; r < 4; r++) { const off = ((y * 4 + r) * 13 % 32); ctx.moveTo(px + off + 0.5, py + r * 8); ctx.lineTo(px + off + 0.5, py + r * 8 + 8); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(190,150,100,0.06)"; ctx.beginPath();
      for (let r = 0; r < 4; r++) { ctx.moveTo(px, py + r * 8 + 3 + n(r) * 2); ctx.bezierCurveTo(px + 10, py + r * 8 + 2, px + 20, py + r * 8 + 5, px + TS, py + r * 8 + 3); }
      ctx.stroke();
      break;
    }
    case "labtile": {
      for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) { ctx.fillStyle = (j + k + x + y) % 2 ? "rgba(220,230,240,0.035)" : "rgba(0,0,0,0.05)"; ctx.fillRect(px + k * 16, py + j * 16, 16, 16); }
      ctx.strokeStyle = "rgba(200,220,235,0.08)"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(px + 16.5, py); ctx.lineTo(px + 16.5, py + TS); ctx.moveTo(px, py + 16.5); ctx.lineTo(px + TS, py + 16.5); ctx.stroke();
      break;
    }
    case "steel": {
      ctx.fillStyle = "rgba(150,165,180,0.05)"; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = "rgba(170,185,200,0.10)";
      for (let k = 4; k < TS; k += 8) for (let j = 4; j < TS; j += 8) { ctx.save(); ctx.translate(px + j + ((k / 8) % 2) * 4 - 2, py + k); ctx.rotate(((k / 8) % 2 ? 1 : -1) * 0.6); ctx.fillRect(-2, -0.7, 4, 1.4); ctx.restore(); }
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
      ctx.fillStyle = "rgba(190,200,210,0.18)"; for (const [a, b] of [[3, 3], [TS - 3, 3], [3, TS - 3], [TS - 3, TS - 3]]) { ctx.beginPath(); ctx.arc(px + a, py + b, 1, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    default: {
      // concrete slabs two tiles square, with speckle and the odd crack or stain
      ctx.fillStyle = `rgba(255,255,255,${0.012 + n(1) * 0.02})`; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = "rgba(255,255,255,0.04)"; for (let k = 0; k < 6; k++) ctx.fillRect(px + n(k + 2) * TS, py + n(k + 12) * TS, 1.2, 1.2);
      ctx.strokeStyle = "rgba(0,0,0,0.30)"; ctx.lineWidth = 1; ctx.beginPath();
      if (x % 2 === 0) { ctx.moveTo(px + 0.5, py); ctx.lineTo(px + 0.5, py + TS); }
      if (y % 2 === 0) { ctx.moveTo(px, py + 0.5); ctx.lineTo(px + TS, py + 0.5); }
      ctx.stroke();
      if (n(30) < 0.07) { ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.moveTo(px + n(31) * TS, py + n(32) * TS); ctx.lineTo(px + n(33) * TS, py + n(34) * TS); ctx.lineTo(px + n(35) * TS, py + n(36) * TS); ctx.stroke(); }
      if (map === "wingC" || map === "dblock") { ctx.fillStyle = "rgba(60,90,80,0.05)"; ctx.fillRect(px, py, TS, TS); }
    }
  }
  ctx.restore();
}

/** Painted floor markings: a centre line down Main Street, parking bays in the motor pool, the yellow safety line
 *  along Site-19's corridors, and hazard stripes in front of the transport container. */
function markings(ctx: CanvasRenderingContext2D, map: MapId, surf: Surface[], areas: string[]) {
  const box = (name: string) => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; areas.forEach((a, i) => { if (a !== name || !passable(i % L.W, (i / L.W) | 0)) return; const x = i % L.W, y = (i / L.W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return x1 < 0 ? null : { x0, y0, x1, y1 }; };
  if (map === "rail") {
    // rails along the track bed, on sleepers
    const rows = new Set<number>(); areas.forEach((a, i) => { if (a === "rail tracks") rows.add((i / L.W) | 0); });
    for (const y of rows) if (y % 3 === 2) {
      ctx.fillStyle = "rgba(60,48,36,0.55)"; for (let x = 0; x < L.W * TS; x += 9) ctx.fillRect(x, y * TS + 8, 5, 16);
      ctx.strokeStyle = "rgba(160,160,165,0.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, y * TS + 11.5); ctx.lineTo(L.W * TS, y * TS + 11.5); ctx.moveTo(0, y * TS + 20.5); ctx.lineTo(L.W * TS, y * TS + 20.5); ctx.stroke();
    }
  }
  if (map === "town") {
    const b = box("Main Street");
    if (b) { const my = ((b.y0 + b.y1 + 1) / 2) * TS; ctx.strokeStyle = "rgba(225,200,110,0.28)"; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(b.x0 * TS, my); ctx.lineTo((b.x1 + 1) * TS, my); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(200,200,190,0.10)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x0 * TS, b.y0 * TS + 2); ctx.lineTo((b.x1 + 1) * TS, b.y0 * TS + 2); ctx.moveTo(b.x0 * TS, (b.y1 + 1) * TS - 2); ctx.lineTo((b.x1 + 1) * TS, (b.y1 + 1) * TS - 2); ctx.stroke(); }
  }
  if (map === "gate") {
    const b = box("motor pool");
    if (b) { ctx.strokeStyle = "rgba(230,230,220,0.14)"; ctx.lineWidth = 2; ctx.beginPath(); for (let x = b.x0 + 2; x <= b.x1; x += 2) { ctx.moveTo(x * TS, (b.y1 - 1) * TS); ctx.lineTo(x * TS, (b.y1 + 1) * TS - 2); } ctx.stroke(); }
    const r = box("approach road");
    if (r) { ctx.strokeStyle = "rgba(225,200,110,0.22)"; ctx.lineWidth = 2; ctx.setLineDash([12, 12]); const mx = ((r.x0 + r.x1 + 1) / 2) * TS; ctx.beginPath(); ctx.moveTo(mx, r.y0 * TS); ctx.lineTo(mx, (r.y1 + 1) * TS); ctx.stroke(); ctx.setLineDash([]); }
  }
  if (map === "wingC" || map === "dblock") {
    const b = box(map === "wingC" ? "main corridor" : "cell corridor");
    if (b) { ctx.strokeStyle = "rgba(215,180,70,0.20)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x0 * TS + 3, b.y0 * TS + 3); ctx.lineTo((b.x1 + 1) * TS - 3, b.y0 * TS + 3); ctx.moveTo(b.x0 * TS + 3, (b.y1 + 1) * TS - 3); ctx.lineTo((b.x1 + 1) * TS - 3, (b.y1 + 1) * TS - 3); ctx.stroke(); }
  }
  if (map === "port") {
    const b = box("dock");
    if (b) { ctx.fillStyle = "rgba(220,180,60,0.16)"; for (let y = b.y0; y <= b.y1; y++) ctx.fillRect((b.x1 + 1) * TS - 4, y * TS, 4, TS); }
  }
  // hazard stripes on the floor in front of the container's open side
  if (L.contTiles.length) {
    const [x0, y0] = L.contTiles[0], x1 = Math.max(...L.contTiles.map(t => t[0]));
    const yy = y0 - 1;
    if (yy >= 0) hazard(ctx, x0 * TS, yy * TS + TS - 6, (x1 - x0 + 1) * TS, 6, 0.32);
  }
  void surf;
}

function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = `rgba(20,20,20,${a})`; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `rgba(214,170,50,${a + 0.1})`;
  for (let k = -h; k < w + h; k += 8) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 4, y + h); ctx.lineTo(x + k + 4 + h, y); ctx.lineTo(x + k + h, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

/** Where the ceiling lamps hang: one per twenty-odd tiles of each indoor room, spread through it. */
export function lampSpots(): number[] {
  const rooms = new Map<string, number[]>();
  for (let i = 0; i < L.W * L.H; i++) { const x = i % L.W, y = (i / L.W) | 0, a = area(x, y); if (!passable(x, y) || outdoorArea(a)) continue; const list = rooms.get(a) ?? []; list.push(i); rooms.set(a, list); }
  const out: number[] = [];
  for (const [, tiles] of rooms) { const n = Math.max(1, Math.round(tiles.length / 22)); for (let k = 0; k < n; k++) out.push(tiles[Math.floor((k + 0.5) / n * tiles.length)]); }
  return out;
}
export const isOutdoor = (x: number, y: number) => outdoorArea(area(x, y));

/** Pools of light under each indoor room's ceiling lamps. */
function lights(ctx: CanvasRenderingContext2D) {
  const warm = S.setup.night ? 0.07 : 0.05;
  for (const i of lampSpots()) {
    const cx = (i % L.W) * TS + TS / 2, cy = ((i / L.W) | 0) * TS + TS / 2;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, TS * 3.2);
    g.addColorStop(0, `rgba(255,236,190,${warm})`); g.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = g; ctx.fillRect(cx - TS * 3.2, cy - TS * 3.2, TS * 6.4, TS * 6.4);
  }
}

// ---------- walls ----------
function wall(ctx: CanvasRenderingContext2D, x: number, y: number, mat: Material | null, mass: string, map: MapId) {
  const px = x * TS, py = y * TS;
  if (!mat) {
    // solid ground or roof with nothing open beside it
    ctx.fillStyle = mass; ctx.fillRect(px, py, TS, TS);
    if (THEME[map].under) { ctx.fillStyle = "rgba(255,255,255,0.025)"; for (let k = 0; k < 4; k++) ctx.fillRect(px + noise(x, y, k) * TS, py + noise(x, y, k + 9) * TS, 3, 2); }
    return;
  }
  const f = FACE[mat], below = tileAt(x, y + 1) !== WALL, faceH = below ? 10 : 0;
  ctx.fillStyle = f.top; ctx.fillRect(px, py, TS, TS - faceH);
  // the top of the wall: concrete gets panel seams, brick a coping course, timber a beam, metal ribs
  ctx.strokeStyle = f.line; ctx.lineWidth = 1; ctx.beginPath();
  if (mat === "metal") for (let k = 4; k < TS; k += 6) { ctx.moveTo(px + k + 0.5, py); ctx.lineTo(px + k + 0.5, py + TS - faceH); }
  else if (mat === "timber") { ctx.moveTo(px, py + (TS - faceH) / 2); ctx.lineTo(px + TS, py + (TS - faceH) / 2); }
  else if (x % 2 === 0) { ctx.moveTo(px + 0.5, py); ctx.lineTo(px + 0.5, py + TS - faceH); }
  ctx.stroke();
  // highlight along edges that meet open floor
  ctx.fillStyle = f.hi;
  if (tileAt(x, y - 1) !== WALL) ctx.fillRect(px, py, TS, 1.5);
  if (tileAt(x - 1, y) !== WALL) ctx.fillRect(px, py, 1.5, TS - faceH);
  if (tileAt(x + 1, y) !== WALL) ctx.fillRect(px + TS - 1.5, py, 1.5, TS - faceH);
  if (!below) return;
  // the south face, seen at a slight angle
  const fy = py + TS - faceH;
  ctx.fillStyle = f.face; ctx.fillRect(px, fy, TS, faceH);
  ctx.strokeStyle = f.line; ctx.lineWidth = 1; ctx.beginPath();
  if (mat === "brick") {
    for (let r = 0; r < 3; r++) { const yy = fy + r * 3.4 + 0.5; ctx.moveTo(px, yy); ctx.lineTo(px + TS, yy); for (let k = (r % 2) * 4; k < TS; k += 8) { ctx.moveTo(px + k + 0.5, yy); ctx.lineTo(px + k + 0.5, yy + 3.4); } }
  } else if (mat === "timber") {
    for (let r = 0; r < 3; r++) { const yy = fy + r * 3.4 + 0.5; ctx.moveTo(px, yy); ctx.lineTo(px + TS, yy); }
  } else if (mat === "metal") {
    for (let k = 2; k < TS; k += 4) { ctx.moveTo(px + k + 0.5, fy); ctx.lineTo(px + k + 0.5, fy + faceH); }
  } else {
    if (x % 2 === 0) { ctx.moveTo(px + 0.5, fy); ctx.lineTo(px + 0.5, fy + faceH); }
  }
  ctx.stroke();
  // Site-19's walls carry a painted band at waist height
  if (map === "wingC" || map === "dblock") { ctx.fillStyle = "rgba(70,105,90,0.55)"; ctx.fillRect(px, fy + faceH - 4, TS, 4); }
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(px, fy, TS, 1);
}

function border(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "fence" | "hedge") {
  const px = x * TS, py = y * TS;
  const horiz = y === 0 || y === L.H - 1;
  if (kind === "hedge") {
    ctx.fillStyle = "#1b2a1a"; ctx.fillRect(px, py, TS, TS);
    for (let k = 0; k < 7; k++) { const cx = px + noise(x, y, k) * TS, cy = py + noise(x, y, k + 9) * TS, r = 6 + noise(x, y, k + 20) * 5;
      ctx.fillStyle = k % 2 ? "#2d4428" : "#263b22"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(150,190,110,0.12)"; for (let k = 0; k < 6; k++) ctx.fillRect(px + noise(x, y, k + 40) * TS, py + noise(x, y, k + 50) * TS, 2, 2);
    return;
  }
  // chain-link with posts and a coil of wire on top
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(px, py, TS, TS);
  ctx.strokeStyle = "rgba(170,180,190,0.35)"; ctx.lineWidth = 1; ctx.beginPath();
  if (horiz) { const my = py + TS / 2; for (let k = 0; k < TS; k += 4) { ctx.moveTo(px + k, my - 3); ctx.lineTo(px + k + 4, my + 3); ctx.moveTo(px + k + 4, my - 3); ctx.lineTo(px + k, my + 3); } }
  else { const mx = px + TS / 2; for (let k = 0; k < TS; k += 4) { ctx.moveTo(mx - 3, py + k); ctx.lineTo(mx + 3, py + k + 4); ctx.moveTo(mx + 3, py + k); ctx.lineTo(mx - 3, py + k + 4); } }
  ctx.stroke();
  ctx.fillStyle = "#6d757d";
  if (horiz) { ctx.fillRect(px + 1, py + TS / 2 - 4, 3, 8); } else { ctx.fillRect(px + TS / 2 - 4, py + 1, 8, 3); }
  ctx.strokeStyle = "rgba(190,195,200,0.45)"; ctx.beginPath();
  for (let k = 0; k < TS; k += 5) { if (horiz) ctx.arc(px + k + 2.5, py + TS / 2 - 6, 2.5, 0, Math.PI * 2); else ctx.arc(px + TS / 2 - 6, py + k + 2.5, 2.5, 0, Math.PI * 2); }
  ctx.stroke();
}

// ---------- cover ----------
/** A shadow under anything standing on the floor. */
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x + 2, y + 3, w, h);
}
function halfCover(ctx: CanvasRenderingContext2D, x: number, y: number, a: string, sf: Surface, map: MapId) {
  const px = x * TS, py = y * TS, n = (k: number) => noise(x, y, k);
  // Phase 4C: pews in the nave, headstones in the graveyard
  if (/nave/.test(a)) {
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + 2, py + 13, TS - 2, 12);
    ctx.fillStyle = "#5a3f26"; ctx.fillRect(px, py + 10, TS, 11); ctx.fillStyle = "#6e4e30"; ctx.fillRect(px, py + 10, TS, 3);
    ctx.fillStyle = "#4a3320"; ctx.fillRect(px, py + 21, TS, 3); return;
  }
  if (/graveyard/.test(a)) {
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(px + TS / 2 + 3, py + TS / 2 + 6, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = n(1) < 0.5 ? "#8a8a84" : "#7a7c76"; ctx.beginPath(); ctx.moveTo(px + 9, py + 24); ctx.lineTo(px + 9, py + 12); ctx.arc(px + 16, py + 12, 7, Math.PI, 0); ctx.lineTo(px + 23, py + 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(40,40,36,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 12, py + 14); ctx.lineTo(px + 20, py + 14); ctx.moveTo(px + 12, py + 17); ctx.lineTo(px + 18, py + 17); ctx.stroke();
    return;
  }
  const kind =
    /lab/.test(a) ? "bench"
    : /office|records|guard|shipping/.test(a) ? "desk"
    : /containment cell/.test(a) ? "table"
    : /cells/.test(a) ? "cot"
    : /mess|canteen|diner|farmhouse/.test(a) ? "table"
    : /laundry/.test(a) ? "washer"
    : /church/.test(a) ? "pew"
    : /store/.test(a) ? "shelf"
    : /houses/.test(a) ? "sofa"
    : /garage/.test(a) ? "bench"
    : /barracks/.test(a) ? "locker"
    : /barn|field/.test(a) && map === "farm" ? "hay"
    : map === "gate" && outdoorArea(a) ? "sandbags"
    : /Main Street/.test(a) ? "bench_park"
    : /corridor|staging/.test(a) ? "cart"
    : "crates";
  switch (kind) {
    case "desk": {
      shadow(ctx, px + 3, py + 7, TS - 6, TS - 13);
      ctx.fillStyle = "#5a4630"; ctx.fillRect(px + 3, py + 7, TS - 6, TS - 13);
      ctx.fillStyle = "#6e5638"; ctx.fillRect(px + 3, py + 7, TS - 6, 3);
      ctx.fillStyle = "#d9d2bf"; ctx.save(); ctx.translate(px + 10, py + 15); ctx.rotate(n(1) - 0.5); ctx.fillRect(-4, -3, 8, 6); ctx.restore();
      ctx.fillStyle = "#2d3a32"; ctx.fillRect(px + 18, py + 12, 7, 5);   // a typewriter or blotter
      ctx.fillStyle = "#c9a35a"; ctx.beginPath(); ctx.arc(px + 24, py + 21, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "bench": {
      shadow(ctx, px + 2, py + 6, TS - 4, TS - 12);
      ctx.fillStyle = "#56616b"; ctx.fillRect(px + 2, py + 6, TS - 4, TS - 12);
      ctx.fillStyle = "#c8ced2"; ctx.fillRect(px + 3, py + 7, TS - 6, TS - 15);
      ctx.fillStyle = "#7fb3a0"; ctx.beginPath(); ctx.arc(px + 9, py + 12, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b07a5a"; ctx.fillRect(px + 15, py + 10, 3, 5);
      ctx.fillStyle = "#8aa0c0"; ctx.beginPath(); ctx.arc(px + 23, py + 13, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "table": {
      shadow(ctx, px + 4, py + 6, TS - 8, TS - 12);
      ctx.fillStyle = /cell/.test(a) ? "#5f6a74" : "#5a4a36"; ctx.fillRect(px + 4, py + 6, TS - 8, TS - 12);
      ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(px + 4, py + 6, TS - 8, 2);
      if (/cell/.test(a)) { ctx.strokeStyle = "#2b3238"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 9, py + 12); ctx.lineTo(px + 9, py + 20); ctx.moveTo(px + 23, py + 12); ctx.lineTo(px + 23, py + 20); ctx.stroke(); }
      else { ctx.fillStyle = "#b8b4a8"; for (const k of [9, 16, 23]) ctx.fillRect(px + k - 2, py + 12, 4, 3); }
      break;
    }
    case "cot": {
      shadow(ctx, px + 5, py + 4, TS - 10, TS - 8);
      ctx.fillStyle = "#4d5560"; ctx.fillRect(px + 5, py + 4, TS - 10, TS - 8);
      ctx.fillStyle = "#8c8a7c"; ctx.fillRect(px + 6, py + 5, TS - 12, TS - 10);
      ctx.fillStyle = "#c9c4b0"; ctx.fillRect(px + 7, py + 6, TS - 14, 5);
      break;
    }
    case "washer": {
      shadow(ctx, px + 5, py + 5, TS - 10, TS - 10);
      ctx.fillStyle = "#b9bfc4"; ctx.fillRect(px + 5, py + 5, TS - 10, TS - 10);
      ctx.fillStyle = "#4b555e"; ctx.beginPath(); ctx.arc(px + TS / 2, py + TS / 2 + 1, 6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "pew": {
      shadow(ctx, px + 1, py + 10, TS - 2, 12);
      ctx.fillStyle = "#4e3a26"; ctx.fillRect(px + 1, py + 10, TS - 2, 12);
      ctx.fillStyle = "#654b31"; ctx.fillRect(px + 1, py + 10, TS - 2, 4);
      break;
    }
    case "shelf": {
      shadow(ctx, px + 2, py + 8, TS - 4, TS - 16);
      ctx.fillStyle = "#4f4335"; ctx.fillRect(px + 2, py + 8, TS - 4, TS - 16);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = ["#9a4b3c", "#c9a35a", "#5b7f9a", "#7a8f5a"][Math.floor(n(k) * 4)]; ctx.fillRect(px + 4 + k * 4, py + 10, 3, TS - 20); }
      break;
    }
    case "sofa": {
      shadow(ctx, px + 3, py + 7, TS - 6, TS - 12);
      ctx.fillStyle = "#5b3e3a"; ctx.fillRect(px + 3, py + 7, TS - 6, TS - 12);
      ctx.fillStyle = "#6f4c46"; ctx.fillRect(px + 6, py + 12, TS - 12, TS - 19);
      break;
    }
    case "locker": {
      shadow(ctx, px + 4, py + 9, TS - 8, TS - 16);
      ctx.fillStyle = "#4b5a46"; ctx.fillRect(px + 4, py + 9, TS - 8, TS - 16);
      ctx.strokeStyle = "#2c3528"; ctx.lineWidth = 1; ctx.strokeRect(px + 4.5, py + 9.5, TS - 9, TS - 17);
      ctx.fillStyle = "#b9a46a"; ctx.fillRect(px + TS / 2 - 2, py + 13, 4, 2);
      break;
    }
    case "hay": {
      shadow(ctx, px + 3, py + 6, TS - 6, TS - 12);
      ctx.fillStyle = "#a88b45"; ctx.fillRect(px + 3, py + 6, TS - 6, TS - 12);
      ctx.strokeStyle = "rgba(90,70,30,0.6)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 8; k++) { const sx = px + 4 + n(k) * (TS - 8), sy = py + 7 + n(k + 10) * (TS - 14); ctx.moveTo(sx, sy); ctx.lineTo(sx + 4, sy + 1); }
      ctx.moveTo(px + 11, py + 6); ctx.lineTo(px + 11, py + TS - 6); ctx.moveTo(px + 21, py + 6); ctx.lineTo(px + 21, py + TS - 6); ctx.stroke();
      break;
    }
    case "sandbags": {
      for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
        const cx = px + 6 + k * 10 + (r % 2) * 4, cy = py + 12 + r * 8;
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(cx + 1, cy + 2, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = r ? "#7d6f4e" : "#8f805c"; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case "bench_park": {
      shadow(ctx, px + 2, py + 11, TS - 4, 10);
      ctx.fillStyle = "#3d4a3f"; ctx.fillRect(px + 2, py + 11, TS - 4, 10);
      ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 2; ctx.beginPath(); for (const k of [13, 16, 19]) { ctx.moveTo(px + 3, py + k); ctx.lineTo(px + TS - 3, py + k); } ctx.stroke();
      break;
    }
    case "cart": {
      shadow(ctx, px + 5, py + 8, TS - 10, TS - 14);
      ctx.fillStyle = "#5c6872"; ctx.fillRect(px + 5, py + 8, TS - 10, TS - 14);
      ctx.fillStyle = "#3b444c"; ctx.fillRect(px + 7, py + 10, TS - 14, TS - 18);
      ctx.fillStyle = "#c4a25a"; ctx.fillRect(px + 9, py + 12, 6, 4);
      ctx.fillStyle = "#1e2328"; for (const [a, b] of [[6, 7], [TS - 6, 7], [6, TS - 6], [TS - 6, TS - 6]]) { ctx.beginPath(); ctx.arc(px + a, py + b, 1.5, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    default: crates(ctx, px, py, n(1) < 0.5, sf);
  }
}
function crates(ctx: CanvasRenderingContext2D, px: number, py: number, two: boolean, _sf: Surface) {
  const box = (bx: number, by: number, s: number) => {
    shadow(ctx, bx, by, s, s);
    ctx.fillStyle = "#6b5535"; ctx.fillRect(bx, by, s, s);
    ctx.strokeStyle = "#4a3a22"; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 0.75, by + 0.75, s - 1.5, s - 1.5);
    ctx.beginPath(); ctx.moveTo(bx + 1, by + 1); ctx.lineTo(bx + s - 1, by + s - 1); ctx.stroke();
  };
  if (two) { box(px + 3, py + 8, 14); box(px + 16, py + 12, 13); } else box(px + 6, py + 6, TS - 12);
}

function fullCover(ctx: CanvasRenderingContext2D, x: number, y: number, a: string, sf: Surface, map: MapId) {
  const px = x * TS, py = y * TS, n = (k: number) => noise(x, y, k);
  // Phase 4C: boxcars on the tracks and shipping containers on a freighter's deck, drawn as one long body per run
  if (/rail tracks|deck/.test(a)) {
    const left = tileAt(x - 1, y) === FULL, right = tileAt(x + 1, y) === FULL, deck = /deck/.test(a);
    const body = deck ? ["#7a3b2e", "#2f5a6a", "#7a6a2e", "#3f5a3a"][Math.floor(noise(Math.floor(x / 3), y, 9) * 4)] : "#5a3a2a";
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + (left ? 0 : 4), py + 6, TS - (left ? 0 : 4) + (right ? 0 : -1), TS - 4);
    ctx.fillStyle = body; ctx.fillRect(px + (left ? 0 : 2), py + 3, TS - (left ? 0 : 2) - (right ? 0 : 2), TS - 6);
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 4; k < TS; k += deck ? 3 : 6) { ctx.moveTo(px + k + 0.5, py + 4); ctx.lineTo(px + k + 0.5, py + TS - 4); }
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(px + (left ? 0 : 2), py + 3, TS - (left ? 0 : 2) - (right ? 0 : 2), 3);
    if (!left) { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(px + 2, py + 3, 2, TS - 6); }
    return;
  }
  if (sf === "grass") {
    // a tree: trunk shadow, then a canopy of overlapping leaves
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(px + TS / 2 + 4, py + TS / 2 + 5, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 7; k++) { const ang = k / 7 * Math.PI * 2, r = 7 + n(k) * 3;
      ctx.fillStyle = k % 2 ? "#2e4a2a" : "#36552f"; ctx.beginPath(); ctx.arc(px + TS / 2 + Math.cos(ang) * 7, py + TS / 2 + Math.sin(ang) * 7, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#3f6237"; ctx.beginPath(); ctx.arc(px + TS / 2 - 2, py + TS / 2 - 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(170,210,130,0.15)"; ctx.beginPath(); ctx.arc(px + TS / 2 - 5, py + TS / 2 - 5, 4, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (/warehouse|dock|storeroom|loading|truck lot|motor pool/.test(a) || map === "port") {
    // a stack of crates under a tarpaulin strap
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + 5, py + 6, TS - 6, TS - 6);
    ctx.fillStyle = "#5e4a2e"; ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
    ctx.fillStyle = "#735a37"; ctx.fillRect(px + 4, py + 4, TS - 8, TS - 8);
    ctx.strokeStyle = "#3e311d"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + TS / 2, py + 4); ctx.lineTo(px + TS / 2, py + TS - 4); ctx.moveTo(px + 4, py + TS / 2); ctx.lineTo(px + TS - 4, py + TS / 2); ctx.stroke();
    ctx.fillStyle = "#2f3f52"; ctx.fillRect(px + 2, py + 13, TS - 4, 3);
    return;
  }
  if (/lab/.test(a)) {
    // an instrument cabinet with dials
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + 6, py + 6, TS - 7, TS - 7);
    ctx.fillStyle = "#4d5862"; ctx.fillRect(px + 3, py + 3, TS - 6, TS - 6);
    ctx.fillStyle = "#2a3138"; ctx.fillRect(px + 6, py + 6, TS - 12, 10);
    ctx.fillStyle = "#d8bf86"; for (const k of [10, 16, 22]) { ctx.beginPath(); ctx.arc(px + k, py + 11, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = n(3) < 0.5 ? "#86c193" : "#d75b47"; ctx.fillRect(px + 8, py + 20, 3, 3);
    ctx.fillStyle = "#86c193"; ctx.fillRect(px + 14, py + 20, 3, 3);
    return;
  }
  if (/mess|canteen|diner/.test(a)) {
    // an icebox and serving counter
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + 6, py + 6, TS - 7, TS - 7);
    ctx.fillStyle = "#c9cdc6"; ctx.fillRect(px + 4, py + 3, TS - 8, TS - 6);
    ctx.fillStyle = "#e3e6df"; ctx.fillRect(px + 4, py + 3, TS - 8, 3);
    ctx.fillStyle = "#8d938b"; ctx.fillRect(px + 4, py + 14, TS - 8, 1.5); ctx.fillRect(px + TS - 10, py + 8, 2, 4); ctx.fillRect(px + TS - 10, py + 18, 2, 6);
    return;
  }
  if (sf === "wood") {
    // a heavy bookcase or dresser
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + 5, py + 6, TS - 6, TS - 7);
    ctx.fillStyle = "#4a3726"; ctx.fillRect(px + 2, py + 3, TS - 4, TS - 6);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { ctx.fillStyle = ["#7a3b32", "#a88b4a", "#3f5a70", "#5c6d45", "#6b5640"][Math.floor(n(r * 6 + k) * 5)]; ctx.fillRect(px + 4 + k * 4, py + 5 + r * 8, 3, 6); }
    return;
  }
  // a square concrete pillar, lit from the top left
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(px + 6, py + 7, TS - 6, TS - 6);
  ctx.fillStyle = map === "town" ? "#6a4436" : "#4c5864"; ctx.fillRect(px + 3, py + 3, TS - 6, TS - 6);
  ctx.fillStyle = map === "town" ? "#7d5545" : "#5d6b7a"; ctx.fillRect(px + 3, py + 3, TS - 6, 4); ctx.fillRect(px + 3, py + 3, 4, TS - 6);
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(px + TS - 7, py + 3, 4, TS - 6);
  if (map === "wingC" || map === "dblock") hazard(ctx, px + 3, py + TS - 9, TS - 6, 4, 0.5);
}

function truck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TS, py = y * TS, w = TS * 2;
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(px + 6, py + 8, w - 6, TS - 8);
  ctx.fillStyle = "#3f4a35"; ctx.fillRect(px + 3, py + 4, w - 6, TS - 8);          // olive drab body
  ctx.fillStyle = "#4b583f"; ctx.fillRect(px + 3, py + 4, w - 22, TS - 8);         // canvas-covered bed
  ctx.strokeStyle = "#37412e"; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 10; k < w - 22; k += 8) { ctx.moveTo(px + 3 + k, py + 4); ctx.lineTo(px + 3 + k, py + TS - 4); } ctx.stroke();
  ctx.fillStyle = "#2c3426"; ctx.fillRect(px + w - 19, py + 6, 8, TS - 12);          // cab roof
  ctx.fillStyle = "#8aa2b0"; ctx.fillRect(px + w - 11, py + 8, 3, TS - 16);          // windscreen
  ctx.fillStyle = "#e8e3d0"; ctx.font = "700 7px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", px + 18, py + TS / 2);
}

function drum(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(cx + 2, cy + 3, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7a3b1e"; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a2a14"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#3a1c0e"; ctx.beginPath(); ctx.arc(cx + 4, cy - 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#d9a441"; ctx.beginPath(); ctx.moveTo(cx - 4, cy + 5); ctx.lineTo(cx, cy - 2); ctx.lineTo(cx + 4, cy + 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.font = "700 6px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", cx, cy + 2.5);
}

function exitTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TS, py = y * TS;
  ctx.fillStyle = "rgba(43,84,64,0.75)"; ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
  // chevrons pointing off the map
  const dx = x === 0 ? -1 : x === L.W - 1 ? 1 : 0, dy = y === 0 ? -1 : y === L.H - 1 ? 1 : 0;
  ctx.strokeStyle = "rgba(207,232,214,0.55)"; ctx.lineWidth = 2; ctx.beginPath();
  for (const o of [-5, 3]) {
    const cx = px + TS / 2 + dx * o, cy = py + TS / 2 + dy * o;
    if (dx) { ctx.moveTo(cx - dx * 4, cy - 6); ctx.lineTo(cx, cy); ctx.lineTo(cx - dx * 4, cy + 6); }
    else if (dy) { ctx.moveTo(cx - 6, cy - dy * 4); ctx.lineTo(cx, cy); ctx.lineTo(cx + 6, cy - dy * 4); }
  }
  if (!dx && !dy) { ctx.rect(px + 8, py + 8, TS - 16, TS - 16); }
  ctx.stroke();
  ctx.fillStyle = "#cfe8d6"; ctx.font = "8px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("EXIT", px + TS / 2, py + TS - 7);
}

function containerTile(ctx: CanvasRenderingContext2D, x: number, y: number, side: boolean, map: MapId) {
  const px = x * TS, py = y * TS;
  if (map === "gate") {
    // the lift: a steel grating platform inside a hazard-striped shaft frame
    if (side) { ctx.fillStyle = "#2a3138"; ctx.fillRect(px, py, TS, TS); hazard(ctx, px + 2, py + 2, TS - 4, TS - 4, 0.35); ctx.fillStyle = "#56636d"; ctx.fillRect(px + 8, py + 8, TS - 16, TS - 16); return; }
    ctx.fillStyle = "#3b444c"; ctx.fillRect(px, py, TS, TS);
    ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 3; k < TS; k += 4) { ctx.moveTo(px + k + 0.5, py); ctx.lineTo(px + k + 0.5, py + TS); ctx.moveTo(px, py + k + 0.5); ctx.lineTo(px + TS, py + k + 0.5); }
    ctx.stroke();
    ctx.fillStyle = "rgba(190,200,210,0.12)"; ctx.fillRect(px, py, TS, 2);
    return;
  }
  const body = map === "wingC" ? "#3f4a52" : "#3f4a35", rib = map === "wingC" ? "#56636d" : "#556148";
  if (side) {
    ctx.fillStyle = body; ctx.fillRect(px, py, TS, TS);
    ctx.fillStyle = rib; for (let k = 2; k < TS; k += 6) ctx.fillRect(px + 3, py + k, TS - 6, 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(px, py + TS - 3, TS, 3);
    return;
  }
  // the bed: timber decking with steel tie-down rails
  ctx.fillStyle = "#3a3127"; ctx.fillRect(px, py, TS, TS);
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 4; k < TS; k += 7) { ctx.moveTo(px + k + 0.5, py); ctx.lineTo(px + k + 0.5, py + TS); }
  ctx.stroke();
  ctx.fillStyle = "rgba(160,175,185,0.22)"; ctx.fillRect(px, py + 3, TS, 1.5); ctx.fillRect(px, py + TS - 5, TS, 1.5);
}

function door(ctx: CanvasRenderingContext2D, x: number, y: number, map: MapId, mat: Material) {
  const px = x * TS, py = y * TS, d = L.door.get(y * L.W + x);
  const wallish = (t: number) => t === WALL || t === WINDOW || t === PART || t === STEEL;
  const ns = wallish(tileAt(x - 1, y)) && wallish(tileAt(x + 1, y));   // walls left and right: you pass north–south
  const f = FACE[mat], site = map === "wingC" || map === "dblock";
  const state = d?.state ?? "open", kind = d?.kind ?? "standard";
  // the frame, always there unless the door was blown out
  const frame = () => { ctx.fillStyle = f.face; if (ns) { ctx.fillRect(px, py + 2, 4, TS - 4); ctx.fillRect(px + TS - 4, py + 2, 4, TS - 4); } else { ctx.fillRect(px + 2, py, TS - 4, 4); ctx.fillRect(px + 2, py + TS - 4, TS - 4, 4); } };
  // the leaf across the opening (closed or locked), in its kind's material
  const leaf = () => {
    const col = kind === "containment" ? "#5d6a74" : kind === "security" ? "#6b7884" : kind === "emergency" ? "#8a3a2c" : mat === "metal" ? "#6b7884" : "#7a5b38";
    ctx.save(); ctx.translate(px + TS / 2, py + TS / 2); if (!ns) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(-TS / 2 + 3, -2, TS - 6, 9);
    ctx.fillStyle = col; ctx.fillRect(-TS / 2 + 3, -4, TS - 6, kind === "containment" ? 9 : 7);
    if (kind === "containment") hazard(ctx, -TS / 2 + 3, 3, TS - 6, 2, 0.6);
    else if (kind === "security") { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-1, -4, 2, 7); }
    else { ctx.fillStyle = "#c9a35a"; ctx.fillRect(TS / 2 - 9, -1, 2, 2); }
    ctx.restore();
  };
  if (state === "destroyed" || state === "breached") {
    // blown out: a scorched gap and the door in pieces
    ctx.fillStyle = "rgba(10,10,10,0.45)"; ctx.beginPath(); ctx.ellipse(px + TS / 2, py + TS / 2, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? "#6b7884" : "#5a4630"; ctx.save(); ctx.translate(px + 6 + noise(x, y, k) * 20, py + 6 + noise(x, y, k + 5) * 20); ctx.rotate(noise(x, y, k + 9) * 3); ctx.fillRect(-4, -1.5, 8, 3); ctx.restore(); }
    if (state === "breached") frame();
    return;
  }
  frame();
  if (state === "closed" || state === "locked") {
    leaf();
    if (state === "locked") { ctx.fillStyle = "#d75b47"; ctx.beginPath(); ctx.arc(px + (ns ? TS - 6 : TS / 2), py + (ns ? TS / 2 - 7 : TS - 6), 2, 0, Math.PI * 2); ctx.fill(); }
    else if (site) { ctx.fillStyle = "#86c193"; ctx.beginPath(); ctx.arc(px + (ns ? TS - 6 : TS / 2), py + (ns ? TS / 2 - 7 : TS - 6), 1.6, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  // open
  if (site) {
    // a sliding door, open: the hazard-striped threshold, the door slid into the wall
    if (ns) { hazard(ctx, px + 4, py + TS / 2 - 3, TS - 8, 6, 0.45); ctx.fillStyle = "#6b7884"; ctx.fillRect(px - 2, py + 4, 4, TS - 8); }
    else { ctx.save(); ctx.translate(px + TS / 2, py + TS / 2); ctx.rotate(Math.PI / 2); hazard(ctx, -TS / 2 + 4, -3, TS - 8, 6, 0.45); ctx.restore(); ctx.fillStyle = "#6b7884"; ctx.fillRect(px + 4, py - 2, TS - 8, 4); }
    return;
  }
  // a hinged door standing open, with its swing drawn on the floor
  ctx.strokeStyle = "rgba(216,191,134,0.18)"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
  ctx.fillStyle = mat === "metal" ? "#6b7884" : "#7a5b38";
  ctx.beginPath(); ctx.arc(px + 2, py + 2, TS - 6, 0, Math.PI / 2); ctx.stroke(); ctx.setLineDash([]);
  if (ns) ctx.fillRect(px + 1, py + 2, 3, TS - 6); else ctx.fillRect(px + 2, py + 1, TS - 6, 3);
  ctx.fillStyle = f.hi; ctx.fillRect(px, py, ns ? 2 : TS, ns ? TS : 2);
}

/** A window set in a wall: the frame, the glass (wired if reinforced), or the shards once it's broken. */
function windowTile(ctx: CanvasRenderingContext2D, x: number, y: number, mat: Material) {
  const px = x * TS, py = y * TS, g = L.glass.get(y * L.W + x), f = FACE[mat];
  const ns = tileAt(x - 1, y) !== WINDOW && (tileAt(x - 1, y) === WALL || tileAt(x + 1, y) === WALL || tileAt(x - 1, y) === WINDOW || tileAt(x + 1, y) === WINDOW);
  ctx.save(); ctx.translate(px + TS / 2, py + TS / 2); if (!ns) ctx.rotate(Math.PI / 2);
  // sill and frame
  ctx.fillStyle = f.top; ctx.fillRect(-TS / 2, -6, TS, 12);
  ctx.fillStyle = f.face; ctx.fillRect(-TS / 2, 4, TS, 3);
  if (g?.broken) {
    ctx.fillStyle = "rgba(15,19,23,0.85)"; ctx.fillRect(-TS / 2 + 2, -3, TS - 4, 6);
    ctx.fillStyle = "rgba(190,215,230,0.7)";
    for (let k = 0; k < 6; k++) { const sx = -TS / 2 + 3 + noise(x, y, k) * (TS - 6); ctx.beginPath(); ctx.moveTo(sx, -3); ctx.lineTo(sx + 2, -3); ctx.lineTo(sx + 1, -3 + 2 + noise(x, y, k + 3) * 3); ctx.closePath(); ctx.fill(); }
  } else {
    ctx.fillStyle = g?.kind === "reinforced" ? "rgba(150,190,210,0.55)" : "rgba(170,205,225,0.45)"; ctx.fillRect(-TS / 2 + 2, -3, TS - 4, 6);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-TS / 2 + 4, -2, 8, 1);
    if (g?.kind === "reinforced") { ctx.strokeStyle = "rgba(30,40,50,0.6)"; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = -TS / 2 + 4; k < TS / 2 - 2; k += 4) { ctx.moveTo(k, -3); ctx.lineTo(k, 3); } ctx.stroke(); ctx.fillStyle = f.hi; ctx.fillRect(-TS / 2, -6, TS, 1.5); ctx.fillRect(-TS / 2, 4.5, TS, 1.5); }
  }
  ctx.restore();
}

/** A partition: a thin stud wall that explosives can open. */
function partition(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TS, py = y * TS;
  const ns = tileAt(x, y - 1) === WALL || tileAt(x, y + 1) === WALL || tileAt(x, y - 1) === PART || tileAt(x, y + 1) === PART;   // runs north–south
  ctx.save(); ctx.translate(px + TS / 2, py + TS / 2); if (ns) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(-TS / 2, -3, TS, 9);
  ctx.fillStyle = "#8a8578"; ctx.fillRect(-TS / 2, -5, TS, 9);
  ctx.strokeStyle = "rgba(60,55,45,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -TS / 2 + 4; k < TS / 2; k += 8) { ctx.moveTo(k, -5); ctx.lineTo(k, 4); } ctx.stroke();
  ctx.fillStyle = "#a39e90"; ctx.fillRect(-TS / 2, -5, TS, 2);
  ctx.restore();
}

/** Small things on the floor that belong to the place: stains in the cell, papers in offices, oil in the motor pool. */
function decal(ctx: CanvasRenderingContext2D, x: number, y: number, a: string, sf: Surface, map: MapId) {
  const px = x * TS, py = y * TS, n = (k: number) => noise(x, y, k), r = n(100);
  if (/containment cell/.test(a) && r < 0.3) {
    // SCP-173's cell: the brown-red mixture on the floor its keepers have to clean
    ctx.fillStyle = "rgba(90,40,25,0.45)"; ctx.beginPath(); ctx.ellipse(px + n(101) * TS, py + n(102) * TS, 5 + n(103) * 6, 3 + n(104) * 4, n(105) * 3, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (/office|records/.test(a) && r < 0.12) { ctx.fillStyle = "rgba(220,212,190,0.35)"; ctx.save(); ctx.translate(px + n(101) * TS, py + n(102) * TS); ctx.rotate(n(103) * 3); ctx.fillRect(-3, -4, 6, 8); ctx.restore(); return; }
  if (/motor pool|garage|truck lot|loading|dock/.test(a) && r < 0.12) { ctx.fillStyle = "rgba(10,10,14,0.45)"; ctx.beginPath(); ctx.ellipse(px + n(101) * TS, py + n(102) * TS, 6, 4, n(103) * 3, 0, Math.PI * 2); ctx.fill(); return; }
  if ((map === "wingC" || map === "dblock") && sf === "concrete" && r < 0.04) {
    // a floor drain
    const cx = px + TS / 2, cy = py + TS / 2; ctx.fillStyle = "#1a1f24"; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#4a5561"; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -3; k <= 3; k += 2) { ctx.moveTo(cx + k, cy - 4); ctx.lineTo(cx + k, cy + 4); } ctx.stroke();
    return;
  }
  if (sf === "grass" && r < 0.05) { ctx.fillStyle = "#4a4a44"; ctx.beginPath(); ctx.ellipse(px + n(101) * TS, py + n(102) * TS, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); }
}

function debris(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TS, py = y * TS;
  ctx.fillStyle = "rgba(10,10,10,0.35)"; ctx.beginPath(); ctx.ellipse(px + TS / 2, py + TS / 2, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? "#5a4630" : "#3f3427"; ctx.save(); ctx.translate(px + 4 + noise(x, y, k) * (TS - 8), py + 4 + noise(x, y, k + 9) * (TS - 8)); ctx.rotate(noise(x, y, k + 20) * 3); ctx.fillRect(-3, -1, 6, 2.5); ctx.restore(); }
}

function roomLabels(ctx: CanvasRenderingContext2D, areas: string[]) {
  const seen = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
  areas.forEach((a, i) => { const x = i % L.W, y = (i / L.W) | 0; if (!passable(x, y) || tileAt(x, y) === EXIT) return; const b = seen.get(a) ?? { x0: x, y0: y, x1: x, y1: y }; b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); seen.set(a, b); });
  ctx.font = "600 9px IBM Plex Mono, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  for (const [a, b] of seen) {
    ctx.fillStyle = "rgba(230,225,210,0.13)";
    ctx.fillText(a.toUpperCase(), b.x0 * TS + 4, b.y0 * TS + 3);
  }
}
