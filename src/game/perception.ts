// Light and perception (Tactical overhaul T3). The geometry kernel says whether a line of sight exists; this says what
// the viewer makes of what is at the end of it. Three states:
//   unseen      nothing there as far as they know;
//   detected    a shape: something is there (position known, not who or what);
//   identified  who and what it is.
// Distance matters, light matters most, then weather, movement, concealment, smoke and the viewer's own eyes. There
// is no flat night range any more: a lit corridor at night is seen end to end; an unlit field is not.
import { L, floorOf } from "../core/grid";
import { bestView, SIGHT_MAX } from "../core/sight";
import { coverOn, trace } from "../core/geom";
import { hasPerk } from "./perks";
import { S, isTeam } from "./state";
import type { Unit } from "./types";

export const UNSEEN = 0, DETECTED = 1, IDENTIFIED = 2;
export type Level = 0 | 1 | 2;

// ---- light ----
/** Areas open to the sky (everything else is under a roof, with its own lights). */
const OUTDOOR = /street|lot|field|dock|loading bay|road|courtyard|motor pool|yard|tracks|platform|graveyard|sea|deck|alley|square|gardens/i;
export function outdoors(x: number, y: number) {
  if (L.def.floors?.[floorOf(y)]?.under) return false;
  return OUTDOOR.test(L.def.area(x, y));
}
/** Is the site's power on? Only an emergency at another site starts with it out (until restored at the panel). */
export const powered = () => S.setup.kind !== "emergency" || !!S.powerOn;
/** Light levels, 0 to 1. */
export const LIGHT = { day: 1, moon: 0.12, roomLit: 0.9, roomDark: 0.05, roomDayDark: 0.3, flare: 1, flareEdge: 0.6, fire: 0.8, muzzle: 0.5 };

let lightFor: unknown = null, lightKey = "", lightMap = new Float32Array(0);
/** How lit a tile is: daylight or moonlight outdoors, the building's lights indoors (out when the power is), plus
 *  flares, fires and the flash of a shot fired this turn. */
export function lightAt(x: number, y: number): number {
  const key = `${S.turn}|${L.version}|${S.setup.night}|${powered()}|${S.flares.length}|${S.fires.size}|${S.units.filter(u => u.firedTurn === S.turn).length}`;
  if (lightFor !== S || lightKey !== key) { lightFor = S; lightKey = key; buildLight(); }
  return lightMap[y * L.W + x] ?? 0;
}
function buildLight() {
  const n = L.W * L.H, night = !!S.setup.night, power = powered();
  lightMap = new Float32Array(n);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    lightMap[y * L.W + x] = outdoors(x, y) ? (night ? LIGHT.moon : LIGHT.day) : power ? LIGHT.roomLit : night ? LIGHT.roomDark : LIGHT.roomDayDark;
  const glow = (cx: number, cy: number, r: number, v: number, edge = v) => {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= L.W || y >= L.H) continue;
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy)), val = d <= Math.ceil(r / 2) ? v : edge, i = y * L.W + x;
      if (val > lightMap[i] && trace(cx + 0.5, cy + 0.5, x + 0.5, y + 0.5, 1)) lightMap[i] = val;
    }
  };
  for (const f of S.flares) if (f.until >= S.turn) glow(f.x, f.y, 4, LIGHT.flare, LIGHT.flareEdge);
  for (const [i, until] of S.fires) if (until >= S.turn) glow(i % L.W, (i / L.W) | 0, 2, LIGHT.fire);
  for (const u of S.units) if (u.alive && u.firedTurn === S.turn) glow(u.x, u.y, 1, LIGHT.muzzle);
}

// ---- thin smoke ----
let haze = new Set<number>();
/** Smoke in its last turn is thin: it no longer hides anything, but it blurs what's behind it. */
export function setHaze(tiles: [number, number][]) { haze = new Set(tiles.map(([x, y]) => y * L.W + x)); }

// ---- perception ----
/** Weather over an outdoor line: how far anyone makes anything out, as a share of clear weather. */
export const WEATHER_CLARITY: Record<string, number> = { clear: 1, rain: 0.45, snow: 0.4, storm: 0.3, fog: 0.2 };
/** Range at which a shape is detected, and identified, in tiles, at light level 0..1, before other factors. */
export const detectBase = (light: number) => 8 + 52 * light;
export const identifyBase = (light: number) => 3 + 33 * light;
/** Within this distance anyone in view is identified, whatever the light. */
export const POINT_BLANK = 2;

export interface Perception { level: Level; detect: number; identify: number; dist: number; light: number; why: string[] }

/** What observer o makes of tile (x, y), and of the unit there if one is given. */
export function perceive(o: Unit, x: number, y: number, target?: Unit, from?: [number, number]): Perception {
  const ox = from ? from[0] : o.x, oy = from ? from[1] : o.y;
  const why: string[] = [];
  const none = (r: string): Perception => ({ level: UNSEEN, detect: 0, identify: 0, dist: 0, light: 0, why: [r] });
  if (o.eyesDown) {
    const adj = Math.max(Math.abs(ox - x), Math.abs(oy - y)) <= 1 && !!bestView(ox, oy, x, y, 1.5);
    return adj ? { level: IDENTIFIED, detect: 1.5, identify: 1.5, dist: 1, light: 1, why: ["eyes down: only right beside them"] } : none("eyes down");
  }
  const v = bestView(ox, oy, x, y, SIGHT_MAX);
  if (!v) return none("no line of sight");
  const dist = Math.hypot(v.x - x, v.y - y);
  // light: what's on the target's tile, or what the observer is lit by if the target is between them and a light
  const light = lightAt(x, y);
  let k = 1;
  // weather, for any line that is outdoors at either end
  if (outdoors(ox, oy) || outdoors(x, y)) {
    const w = WEATHER_CLARITY[S.setup.weather ?? "clear"] ?? 1;
    if (w < 1) { k *= w; why.push(`${S.setup.weather} ×${w}`); }
  }
  // part of them hidden
  if (v.f < 1) { k *= 0.5 + 0.5 * v.f; why.push(`partly hidden ×${(0.5 + 0.5 * v.f).toFixed(2)}`); }
  // thin smoke on the line
  let hz = 0;
  if (haze.size) for (const i of haze) { const hx = i % L.W, hy = (i / L.W) | 0; if (onLine(v.x, v.y, x, y, hx, hy)) hz++; }
  if (hz) { k *= Math.pow(0.6, hz); why.push(`thin smoke ×${Math.pow(0.6, hz).toFixed(2)}`); }
  let detectK = k, identK = k;
  if (target && target !== o) {
    // movement catches the eye; someone still, in cover, is harder to pick out
    if (target.movedTurn === S.turn || target.firedTurn === S.turn) { detectK *= 1.25; why.push("moving or firing ×1.25 to detect"); }
    else if (coverOn(target.x, target.y, v.x, v.y).value > 0) { detectK *= 0.8; identK *= 0.8; why.push("still, in cover ×0.8"); }
  }
  // the viewer's own eyes
  if (hasPerk(o, "keen_eyes")) { detectK *= 1.2; identK *= 1.2; why.push("Keen eyes ×1.2"); }
  const bonus = isTeam(o) ? S.setup.mods?.sightBonus ?? 0 : 0;
  if (bonus) { detectK *= 1 + 0.05 * bonus; identK *= 1 + 0.05 * bonus; why.push(`research ×${(1 + 0.05 * bonus).toFixed(2)}`); }
  const detect = Math.min(SIGHT_MAX, detectBase(light) * detectK), identify = Math.min(SIGHT_MAX, identifyBase(light) * identK);
  const level: Level = dist <= POINT_BLANK || dist <= identify ? IDENTIFIED : dist <= detect ? DETECTED : UNSEEN;
  return { level, detect, identify, dist, light, why };
}
/** Does tile (hx, hy) lie on the straight line between two tiles' centres (within half a tile)? */
function onLine(ax: number, ay: number, bx: number, by: number, hx: number, hy: number) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  if (!len2) return false;
  const t = ((hx - ax) * dx + (hy - ay) * dy) / len2;
  if (t <= 0 || t >= 1) return false;
  return Math.hypot(ax + dx * t - hx, ay + dy * t - hy) <= 0.5;
}
/** The farthest someone on (x, y) can be seen from, by this observer: used as the range for shots and reactions. */
export const detectRangeAt = (o: Unit, x: number, y: number) => perceive(o, x, y).detect;
