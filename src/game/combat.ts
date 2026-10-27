// Gunfire, cover, damage and movement.
import { DIRS, FULL, HALF, STEEL, TS, WALL, L, bfs, tileAt, type Pt } from "../core/grid";
import { bestView, type View } from "../core/sight";
import { S, alive, canSee, full, fx, hooks, isPanicked, isTeam, log, loseSanity, rand, reveal, seen, sleep, computeVis } from "./state";
import type { Unit } from "./types";

export function coverAgainst(tx: number, ty: number, sx: number, sy: number) {
  const vx = sx - tx, vy = sy - ty, len = Math.hypot(vx, vy) || 1;
  let best = 0;
  for (const [dx, dy] of DIRS) {
    const t = tileAt(tx + dx, ty + dy);
    const c = (t === WALL || t === FULL || t === STEEL) ? 40 : t === HALF ? 20 : 0;
    if (!c) continue;
    // straight-side cover protects within 60° of its face, corner cover only within ~23°
    const cos = (vx * dx + vy * dy) / (len * Math.hypot(dx, dy));
    if (cos >= (dx && dy ? 0.92 : 0.5)) best = Math.max(best, c);
  }
  return best;
}

export interface ShotInfo { chance: number; mods: [string, number][]; crit: number; from: View; }

// Shots come from the shooter's best spot (leaning out if needed), with a penalty if the
// target is only partly visible from there.
export function shotInfo(sh: Unit, tg: Unit, reaction = false): ShotInfo {
  const v = bestView(sh.x, sh.y, tg.x, tg.y) || { f: 0, x: sh.x, y: sh.y };
  const dist = Math.hypot(tg.x - v.x, tg.y - v.y);
  const cover = coverAgainst(tg.x, tg.y, v.x, v.y);
  const leaning = v.x !== sh.x || v.y !== sh.y;
  const partial = v.f < 0.5 || leaning;
  const mods: [string, number][] = [["Aim", sh.aim]];
  if (cover === 40) mods.push(["Full cover", -40]);
  else if (cover === 20) mods.push(["Half cover", -20]);
  else mods.push(["Flanked", 10]);
  if (leaning) mods.push(["Leaning out", -15]);
  else if (partial) mods.push(["Partly hidden", -15]);
  if (dist <= 3) mods.push(["Close range", 10]);
  else if (dist > 7) mods.push(["Long range", -Math.round((dist - 7) * 4)]);
  if (reaction) mods.push(["Reaction shot", -15]);
  if (sh.side === "mtf" && sh.san <= 30) mods.push(["Shaken", -10]);
  const raw = mods.reduce((a, m) => a + m[1], 0);
  return { chance: Math.max(5, Math.min(95, raw)), mods, crit: cover === 0 && !partial ? 40 : 0, from: v };
}

export const center = (u: { x: number; y: number }): Pt => [u.x * TS + TS / 2, u.y * TS + TS / 2];

export async function fire(sh: Unit, tg: Unit, reaction: boolean) {
  const info = shotInfo(sh, tg, reaction);
  const hit = Math.random() * 100 < info.chance;
  const [x0, y0] = center(info.from), [x1, y1] = center(tg);
  const ox = hit ? 0 : (Math.random() - .5) * 26, oy = hit ? 0 : (Math.random() - .5) * 26;
  fx({ type: "line", x0, y0, x1: x1 + ox, y1: y1 + oy, color: sh.side === "mtf" ? "#9cc4e4" : "#d0a6e6", dur: 260 });
  const visibleShot = sh.side === "mtf" || seen(sh.x, sh.y) || isTeam(tg);
  {   // SCP-173 hears the shot, but only roughly where it came from
    const near = bfs([[sh.x, sh.y]], 3).dist, spots: number[] = [];
    for (let i = 0; i < L.W * L.H; i++) if (near[i] >= 0) spots.push(i);
    const i = spots[Math.floor(Math.random() * spots.length)];
    S.mem.set("shot-" + sh.id, { x: i % L.W, y: (i / L.W) | 0, turn: S.turn });
  }
  if (sh.side === "mtf") reveal("hear");
  if (hit) {
    const crit = Math.random() * 100 < info.crit;
    let dmg = sh.side === "mtf" ? rand(3, 4) : rand(2, 3);
    if (crit) dmg += 2;
    const soak = Math.min(tg.armor ?? 0, dmg);   // each armor point cuts the hit by 1
    dmg -= soak;
    fx({ type: "text", x: x1, y: y1 - 14, text: (crit ? `${dmg}!` : `${dmg}`) + (soak ? ` (−${soak})` : ""), color: crit ? "#f0c060" : "#ffffff", dur: 900 });
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${full(sh)} hits ${full(tg)} for ${dmg}${crit ? ", critical" : ""}${soak ? `; armor absorbed ${soak}` : ""} (${info.chance}%).`, sh.side === "mtf" ? "good" : "bad");
    damage(tg, dmg, sh);
  } else {
    fx({ type: "text", x: x1, y: y1 - 14, text: "miss", color: "#8b939b", dur: 800 });
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${full(sh)} misses ${full(tg)} (${info.chance}%).`);
  }
  hooks.update();
  await sleep(380);
}

export function damage(u: Unit, dmg: number, by?: Unit) {
  if (dmg <= 0) return;
  u.hp -= dmg;
  if (u.hp <= 0) { kill(u); if (by) by.kills++; return; }
  if (isTeam(u)) loseSanity(u, 5);
}

export function kill(u: Unit, by173 = false) {
  const wasTeam = isTeam(u);
  u.alive = false; u.hp = 0; u.staring = false;
  if (u.side === "mtf") {
    S.stats.mtfLost++;
    log(`${full(u)} is down.`, "bad");
  } else if (u.side === "raider") {
    S.stats.raidersDown++;
    if (!by173) log("Insurgent down.", "good");
  } else {
    S.stats.dLost++;
    if (wasTeam) log(`${u.name} is dead.`, "bad");
  }
  if (S.selected === u) S.selected = null;
}

export async function moveUnit(u: Unit, path: Pt[]) {
  for (const [x, y] of path) {
    if (!u.alive) return;
    u.x = x; u.y = y;
    if (isTeam(u)) computeVis();
    if (u.side === "raider") {
      for (const m of alive("mtf")) {
        if (!u.alive) break;
        if (m.overwatch && !isPanicked(m) && canSee(m, u.x, u.y)) { m.overwatch = false; await fire(m, u, true); }
      }
    }
    if (isTeam(u) || seen(x, y)) await sleep(60);
  }
}
