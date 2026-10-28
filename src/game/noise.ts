// Hearing and facing (Phase 4I). Noises travel out from where they happen, quieter with distance and much quieter
// through walls and shut doors. Whoever hears one learns roughly which way it came from, never exactly where; an
// operative glances toward it and, if nothing is there, turns back to the direction the player set. Insurgents hear
// by the same rules and go to look. Facing is attention and animation, not a blind cone: anyone can still see an
// enemy behind them.
import { L, opaque, doorShut, cheb } from "../core/grid";
import { S, alive, canSee, isTeam, log, seen, team } from "./state";
import type { Unit } from "./types";

export type NoiseKind = "footsteps" | "door" | "glass" | "gunfire" | "explosion" | "scp" | "lure" | "voice";
/** How far a noise carries across open ground, in tiles. */
export const LOUD: Record<NoiseKind, number> = { footsteps: 7, door: 9, glass: 12, gunfire: 24, explosion: 32, scp: 9, lure: 18, voice: 14 };
const WALL_LOSS = 5, DOOR_LOSS = 3;
const NAMES: Record<NoiseKind, string> = { footsteps: "footsteps", door: "a door", glass: "breaking glass", gunfire: "gunfire", explosion: "an explosion", scp: "something moving", lure: "a noisemaker", voice: "a voice calling" };
const DIRS8 = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

/** The eighth of a turn closest to a direction (0 east, 2 south, 4 west, 6 north). */
export const facingTo = (dx: number, dy: number) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
export const facingName = (f: number) => DIRS8[((f % 8) + 8) % 8];

/** What's left of a noise by the time it reaches a listener: distance, then each wall and shut door between. */
export function heardAt(lx: number, ly: number, nx: number, ny: number, loud: number) {
  let walls = 0, doors = 0;
  // walk the straight line between the two tiles and count what it passes through
  const n = Math.max(Math.abs(nx - lx), Math.abs(ny - ly));
  let px = -1, py = -1;
  for (let k = 1; k < n; k++) {
    const x = Math.round(lx + (nx - lx) * k / n), y = Math.round(ly + (ny - ly) * k / n);
    if (x === px && y === py) continue;
    px = x; py = y;
    if (doorShut(x, y)) doors++;
    else if (opaque(x, y)) walls++;
  }
  // a storm outdoors, or the breach siren, drowns quiet noises
  const masking = (S.setup.weather === "storm" ? 3 : S.setup.weather === "rain" ? 1 : 0) + (S.siren ? 2 : 0);
  return loud - Math.hypot(nx - lx, ny - ly) - walls * WALL_LOSS - doors * DOOR_LOSS - masking;
}

export interface HeardNoise { listener: string; kind: NoiseKind; dir: number; conf: number; turn: number; t: number; src: string }

/** Something made a noise at (x, y). Everyone who isn't the source and can't already see it may hear it. */
export function emitNoise(x: number, y: number, kind: NoiseKind, src?: Unit) {
  if (!S) return;
  const loud = LOUD[kind];
  const fromTeam = !!src && isTeam(src);
  // the team: a direction, and a glance that way (unless they can already see what made it)
  if (!fromTeam && !seen(x, y)) {
    const heardBy: Unit[] = [];
    for (const m of team()) {
      const left = heardAt(m.x, m.y, x, y, loud);
      if (left <= 0) continue;
      const conf = Math.min(1, left / loud * 1.6);
      // the less of it reaches them, the rougher their sense of where it came from
      const jitter = (Math.random() - 0.5) * (1 - conf) * Math.PI / 2;
      const ang = Math.atan2(y - m.y, x - m.x) + jitter;
      const dir = facingTo(Math.cos(ang), Math.sin(ang));
      S.heard = (S.heard ?? []).filter(h => !(h.listener === m.id && h.src === (src?.id ?? kind)));
      S.heard.push({ listener: m.id, kind, dir, conf, turn: S.turn, t: performance.now(), src: src?.id ?? kind });
      m.glance = { dir, turn: S.turn };
      m.facing = dir;
      heardBy.push(m);
    }
    if (heardBy.length) {
      const m = heardBy[0], key = `${kind}:${src?.id ?? ""}:${S.turn}`;
      if (!S.calledOut?.includes(key)) {
        (S.calledOut ??= []).push(key);
        if (S.calledOut.length > 40) S.calledOut.shift();
        log(`${m.call || m.name}${heardBy.length > 1 ? ` and ${heardBy.length - 1} other${heardBy.length > 2 ? "s" : ""}` : ""} ${heardBy.length > 1 ? "hear" : "hears"} ${NAMES[kind]} to the ${facingName(heardBy[0].glance!.dir)}.`);
      }
    }
  }
  // Phase 4B: SCP-939 hunts by sound alone, and remembers the latest noise it heard (not its own pack's)
  if (!src?.voice) for (const v of S.units.filter(u => u.voice && u.alive)) {
    if (heardAt(v.x, v.y, x, y, loud) > 0) S.mem.set("939-" + v.id, { x, y, turn: S.turn });
  }
  // the Insurgency: a rough idea of where, which they go to investigate
  if (fromTeam || !src || src.side !== "raider") {
    for (const r of alive("raider")) {
      if (canSee(r, x, y)) continue;
      const left = heardAt(r.x, r.y, x, y, loud);
      if (left <= 0) continue;
      const spread = Math.round((1 - Math.min(1, left / loud * 1.6)) * 3);
      const ex = Math.max(0, Math.min(L.W - 1, x + Math.round((Math.random() - 0.5) * 2 * spread)));
      const ey = Math.max(0, Math.min(L.H - 1, y + Math.round((Math.random() - 0.5) * 2 * spread)));
      S.mem.set("heard-" + r.id, { x: ex, y: ey, turn: S.turn });
      r.facing = facingTo(x - r.x, y - r.y);
    }
  }
}

/** At the start of the player's turn: anyone who glanced at a noise and found nothing turns back to their resting
 *  direction; anyone with an enemy in sight keeps their attention on the nearest one. */
/** Turn toward the nearest enemy in sight, if there is one (after moving, and at the start of a turn). */
export function faceThreat(m: Unit) {
  const hostile = (u: Unit) => isTeam(m) ? u.side === "raider" || u.side === "zombie" || (u.side === "anomaly" && u.alive) : m.side === "raider" ? isTeam(u) : false;
  const threats = S.units.filter(u => u !== m && u.alive && !u.downed && !u.saved && hostile(u) && canSee(m, u.x, u.y));
  if (!threats.length) return false;
  const t = threats.sort((a, b) => cheb(m.x, m.y, a.x, a.y) - cheb(m.x, m.y, b.x, b.y))[0];
  m.facing = facingTo(t.x - m.x, t.y - m.y);
  return true;
}
export function settleFacing() {
  for (const m of team()) {
    if (faceThreat(m)) { /* facing the nearest enemy in sight */ }
    else if (m.glance && m.prefFacing !== undefined) m.facing = m.prefFacing;
    m.glance = undefined;
  }
  S.heard = (S.heard ?? []).filter(h => h.turn >= S.turn - 1);
}

/** Remember where enemies were last seen: shown as a ghost until they are seen again. */
export function noteContacts() {
  S.contacts ??= {};
  for (const u of S.units) {
    if (u.side !== "raider" && u.side !== "zombie") continue;
    if (!u.alive || u.downed) { delete S.contacts[u.id]; continue; }
    if (seen(u.x, u.y)) S.contacts[u.id] = { x: u.x, y: u.y, turn: S.turn, seen: true };
    else if (S.contacts[u.id]?.seen) S.contacts[u.id].seen = false;
  }
}
