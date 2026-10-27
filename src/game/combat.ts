// Gunfire, cover, damage and movement.
import { DIRS, DRUM, FULL, HALF, STEEL, TS, WALL, L, bfs, tileAt, type Pt } from "../core/grid";
import { bestView, type View } from "../core/sight";
import { hasPerk, rangeOf } from "./perks";
import { TYPES, rangeMod } from "../data/weapons";
import { prof } from "./profiles";
import { S, alive, breakConcealment, canSee, full, fx, hooks, isPanicked, team, isTeam, log, loseSanity, rand, reveal, seen, sleep, computeVis } from "./state";
import type { Gun, Unit } from "./types";
import { SIDEARM } from "../data/weapons";
import { dropCarried } from "./abilities";
import { ignite } from "./fire";
import { shotAt106 } from "./scp106";

export function coverAgainst(tx: number, ty: number, sx: number, sy: number) {
  const vx = sx - tx, vy = sy - ty, len = Math.hypot(vx, vy) || 1;
  let best = 0;
  for (const [dx, dy] of DIRS) {
    const t = tileAt(tx + dx, ty + dy);
    const c = (t === WALL || t === FULL || t === STEEL) ? 40 : t === HALF || t === DRUM ? 20 : 0;
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
/** The weapon a unit actually fires: its sidearm once an operative's main weapon is empty. */
export function activeGun(u: Unit): Gun | undefined {
  if (u.side === "mtf" && u.gun && u.gun.ammo < 1) return { name: SIDEARM.name, type: "smg", dmg: SIDEARM.dmg, mag: 0, ammo: 0, aim: SIDEARM.aim };
  return u.gun;
}
export const usingSidearm = (u: Unit) => u.side === "mtf" && !!u.gun && u.gun.ammo < 1;

export function shotInfo(sh: Unit, tg: Unit, reaction = false): ShotInfo {
  const v = bestView(sh.x, sh.y, tg.x, tg.y, rangeOf(sh)) || { f: 0, x: sh.x, y: sh.y };
  const dist = Math.hypot(tg.x - v.x, tg.y - v.y);
  const hunkered = (tg.hunkerUntil ?? -1) >= S.turn;
  const cover = coverAgainst(tg.x, tg.y, v.x, v.y) * (hunkered ? 2 : 1);
  const leaning = v.x !== sh.x || v.y !== sh.y;
  const partial = v.f < 0.5 || leaning;
  const gun = activeGun(sh);
  const mods: [string, number][] = [["Aim", sh.aim]];
  if (gun?.aim) mods.push([gun.name, gun.aim]);
  if (gun?.attachment === "scope") mods.push(["Telescopic sight", 5]);
  if (gun?.attachment === "sights") mods.push(["Improved sights", 10]);
  if (reaction && gun?.ammoType === "tracer") mods.push(["Tracer rounds", 10]);
  if (cover >= 40) mods.push([hunkered ? (cover === 80 ? "Full cover, hunkered" : "Half cover, hunkered") : "Full cover", -cover]);
  else if (cover === 20) mods.push(["Half cover", -20]);
  else mods.push(["Flanked", 10]);
  if (leaning) mods.push(["Leaning out", -15]);
  else if (partial) mods.push(["Partly hidden", -15]);
  const rm = rangeMod(gun?.type ?? "rifle", dist);
  if (rm) mods.push(rm);
  if (reaction && !hasPerk(sh, "covering_fire")) mods.push(["Reaction shot", (gun?.type === "mg" ? -5 : -15) + (sh.side === "mtf" ? Math.min(S.setup.mods.reactionBonus ?? 0, gun?.type === "mg" ? 5 : 15) : 0)]);
  if (sh.side === "raider" && tg.hasArmor && S.setup.mods.ciAnalysis) mods.push(["Known weapons", -5]);
  if (sh.side === "mtf" && sh.san <= 30) mods.push(["Shaken", -10]);
  if (sh.medals?.includes("sealed_in") && (tg.side === "anomaly" || (tg.side === "zombie" && !tg.rioter))) mods.push(["Sealed in", 5]);
  if (cover === 0 && hasPerk(sh, "hunter")) mods.push(["Hunter", 20]);
  if (dist <= 3 && hasPerk(sh, "shotgun_drills")) mods.push(["Shotgun drills", 20]);
  if ((sh.suppressedUntil ?? -1) >= S.turn) mods.push(["Suppressed", -30]);
  if (isTeam(sh) && (tg.markedUntil ?? -1) >= S.turn) mods.push(["Marked", 15]);
  if (isTeam(sh) && team().some(a => a !== sh && hasPerk(a, "spotter") && canSee(a, tg.x, tg.y))) mods.push(["Spotted", 10]);
  const raw = mods.reduce((a, m) => a + m[1], 0);
  const crit = (cover === 0 && !partial ? 40 : 0) + (hasPerk(sh, "sharpshooter") ? 20 : 0)
    + (gun ? TYPES[gun.type].crit : 0) + (gun?.attachment === "trigger" ? 10 : 0);
  return { chance: Math.max(5, Math.min(95, raw)), mods, crit, from: v };
}

export const center = (u: { x: number; y: number }): Pt => [u.x * TS + TS / 2, u.y * TS + TS / 2];

export async function fire(sh: Unit, tg: Unit, reaction: boolean) {
  const info = shotInfo(sh, tg, reaction);
  const gun = activeGun(sh), sidearm = usingSidearm(sh);
  if (sh.side === "mtf") breakConcealment("shots fired");
  if (sh.gun && !sidearm) sh.gun.ammo = Math.max(0, sh.gun.ammo - 1);
  const hit = Math.random() * 100 < info.chance;
  const [x0, y0] = center(info.from), [x1, y1] = center(tg);
  const ox = hit ? 0 : (Math.random() - .5) * 26, oy = hit ? 0 : (Math.random() - .5) * 26;
  fx({ type: "line", x0, y0, x1: x1 + ox, y1: y1 + oy, color: sh.side === "mtf" ? "#9cc4e4" : "#d0a6e6", dur: 260 });
  const visibleShot = sh.side === "mtf" || seen(sh.x, sh.y) || isTeam(tg);
  if (!hasPerk(sh, "quiet_steps") && gun?.attachment !== "suppressor") {   // SCP-173 hears the shot, but only roughly where it came from
    const near = bfs([[sh.x, sh.y]], 3).dist, spots: number[] = [];
    for (let i = 0; i < L.W * L.H; i++) if (near[i] >= 0) spots.push(i);
    const i = spots[Math.floor(Math.random() * spots.length)];
    S.mem.set("shot-" + sh.id, { x: i % L.W, y: (i / L.W) | 0, turn: S.turn });
  }
  if (sh.side === "mtf") reveal("hear");
  if (hit) {
    const crit = Math.random() * 100 < info.crit;
    let dmg = gun ? rand(gun.dmg[0], gun.dmg[1]) : rand(3, 4);
    if (crit) dmg += gun?.ammoType === "hollow" ? 3 : 2;
    if (hasPerk(sh, "shotgun_drills") && Math.hypot(tg.x - info.from.x, tg.y - info.from.y) <= 3) dmg += 2;
    const soak = Math.min(Math.max(0, (tg.armor ?? 0) - (gun?.pierce ?? 0)), dmg);   // each armor point cuts the hit by 1
    dmg -= soak;
    fx({ type: "text", x: x1, y: y1 - 14, text: (crit ? `${dmg}!` : `${dmg}`) + (soak ? ` (−${soak})` : ""), color: crit ? "#f0c060" : "#ffffff", dur: 900 });
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${sidearm ? "Sidearm: " : ""}${full(sh)} hits ${full(tg)} for ${dmg}${crit ? ", critical" : ""}${soak ? `; armor absorbed ${soak}` : ""} (${info.chance}%).`, sh.side === "mtf" ? "good" : "bad");
    if (hasPerk(sh, "shredder") && (tg.armor ?? 0) > 0) { tg.armor!--; log("The hit shreds a point of armor.", "good"); }
    damage(tg, dmg, sh);
    if (gun?.ammoType === "incendiary" && !sidearm) ignite(tg.x, tg.y, 1);
  } else {
    const graze = gun?.attachment === "stock" ? Math.max(0, 1 - (tg.armor ?? 0)) : 0;
    fx({ type: "text", x: x1, y: y1 - 14, text: graze ? "graze 1" : "miss", color: "#8b939b", dur: 800 });
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${full(sh)} misses ${full(tg)} (${info.chance}%)${graze ? ", but the round grazes for 1" : ""}.`);
    if (graze) damage(tg, 1, sh);
  }
  hooks.update();
  await sleep(380);
}

export const BLEED_TURNS = 3;

export function damage(u: Unit, dmg: number, by?: Unit) {
  if (dmg <= 0) return;
  // SCP-049 can't be hurt, only knocked back a step in its plans
  if (u.side === "anomaly") {
    if (S.has049) { u.staggeredUntil = S.turn; log("SCP-049 staggers under the hit but isn't hurt. It loses its next move.", "key"); }
    if (S.has106) shotAt106();
    return;
  }
  u.hp -= dmg;
  if (u.side === "mtf") u.minHp = Math.min(u.minHp ?? u.hp, Math.max(0, u.hp));
  if (u.hp <= 0 && u.side === "mtf" && !u.downed) { goDown(u); return; }
  // sedative rounds knock people out instead of killing them
  if (u.hp <= 0 && by && activeGun(by)?.ammoType === "sedative" && !usingSidearm(by) && (["raider", "subject", "civilian"].includes(u.side) || u.rioter) && !u.downed) {
    u.hp = 0; u.downed = true; u.stabilized = true; by.kills++;
    if (u.side === "raider") { S.stats.raidersDown++; log("The sedative drops an Insurgent. Secure them to take a prisoner.", "good"); }
    else if (u.rioter) { u.restrained = true; log(`${u.name} goes down, sedated.`, "good"); }
    else if (u.side === "subject") { u.side = "dclass"; u.joined = true; log(`${u.name} goes down, sedated. They'll be carried back to holding.`, "good"); }
    else log(`${u.name} goes down, sedated but alive.`, "key");
    return;
  }
  if (u.hp <= 0 && u.side === "raider" && !u.downed && Math.random() < 0.15) {
    // sometimes an Insurgent is left alive but out of the fight: a possible prisoner
    u.hp = 0; u.downed = true; S.stats.raidersDown++; if (by) by.kills++;
    log("An Insurgent goes down wounded but alive. Secure them to take a prisoner.", "good");
    return;
  }
  if (u.hp <= 0) { kill(u); if (by) by.kills++; return; }
  if (isTeam(u)) loseSanity(u, 5);
}

/** An operative at 0 HP goes down and bleeds out in 3 turns unless stabilized. */
function goDown(u: Unit) {
  if (u.carrying) dropCarried(u);
  u.hp = 0; u.downed = true; u.bleed = BLEED_TURNS; u.staring = false; u.overwatch = false; u.ap = 0;
  if (S.selected === u) S.selected = null;
  log(`${full(u)} is down and bleeding out: ${BLEED_TURNS} turns to stabilize them${team().some(m => hasPerk(m, "stabilize")) ? "" : ". Nobody on the squad can; win the mission before they bleed out"}.`, "bad");
  for (const m of team()) if (m !== u && canSee(m, u.x, u.y)) m.witnessed = (m.witnessed ?? 0) + 1;
}

export function kill(u: Unit, by173 = false) {
  const wasTeam = isTeam(u) || !!u.downed;
  if (wasTeam) for (const m of team()) if (m !== u && !isPanicked(m) && canSee(m, u.x, u.y)) {
    m.witnessed = (m.witnessed ?? 0) + 1;
    loseSanity(m, prof(m).witness, "witness");
  }
  if (u.carrying) dropCarried(u);
  u.alive = false; u.hp = 0; u.staring = false; u.downed = false;
  if (u.side === "mtf") {
    S.stats.mtfLost++;
    log(`${full(u)} was killed.`, "bad");
  } else if (u.side === "raider") {
    S.stats.raidersDown++;
    if (!by173) log("Insurgent down.", "good");
  } else if (u.side === "zombie") {
    if (u.rioter) S.stats.dLost++;
    log(u.rioter ? `${u.name} is dead.` : u.flesh ? "An SCP-610 instance collapses into a heap." : "SCP-049-2 goes down and stays down.", u.rioter ? "bad" : "good");
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
    if (u.carrying) { const c = S.units.find(v => v.id === u.carrying); if (c) { c.x = x; c.y = y; } }
    // SCP-106's rot eats at anyone who walks through it
    if (S.corroded.has(y * L.W + x) && u.side !== "anomaly" && u.armorKind !== "hazmat") { log(`${full(u)} steps in the black rot (1 damage).`, "bad"); damage(u, 1); }
    if (isTeam(u)) computeVis();
    if (u.side === "raider") {
      for (const m of alive("mtf")) {
        if (!u.alive) break;
        if (m.overwatch && !isPanicked(m) && canSee(m, u.x, u.y)) {
          m.overwatchShots = (m.overwatchShots ?? 1) - 1;
          if (m.overwatchShots <= 0) m.overwatch = false;
          await fire(m, u, true);
        }
      }
    }
    if (isTeam(u) || seen(x, y)) await sleep(60);
  }
}
