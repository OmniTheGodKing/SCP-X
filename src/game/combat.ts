// Gunfire, cover, damage and movement.
import { rnd, fxRnd } from "../core/rng";
import { BOND_AIM } from "../campaign/condition";
import { charmTurns, officerNear } from "./ciTactics";
import { DIRS, DRUM, FULL, HALF, STEEL, TS, WALL, L, bfs, cheb, tileAt, type Pt } from "../core/grid";
import { SIGHT_MAX, fireLine, fireView, type View } from "../core/sight";
import { DETECTED, peeks, perceive } from "./perception";
import { coverOn } from "../core/geom";
import { breakGlass, d2, damageCover, openDoor } from "../core/grid";
import { emitNoise, faceThreat, facingTo } from "./noise";
import { hasPerk, rangeOf } from "./perks";
import { TYPES, rangeDamage, rangeMod } from "../data/weapons";
import { prof } from "./profiles";
import { S, alive, breakConcealment, canSee, full, fx, highlight, hooks, isPanicked, team, isTeam, log, loseSanity, rand, reveal, seen, sleep, computeVis } from "./state";
import type { Gun, Impact, Unit } from "./types";
import { SIDEARM } from "../data/weapons";
import { dropCarried } from "./abilities";
import { ignite } from "./fire";
import { shotAt106 } from "./scp106";
import { hidden939, hit682, hostFalls } from "./scp4b";
import { dropTrophy } from "./rivals";

/** Cover a figure on (tx, ty) has against a shot from (sx, sy). Tactical overhaul T2.1: read off the line of fire
 *  itself by the geometry kernel (geom.coverOn), the same function the cover shields and the enemy AI use. */
export const coverAgainst = (tx: number, ty: number, sx: number, sy: number) => coverOn(tx, ty, sx, sy).value;

export interface ShotInfo { chance: number; mods: [string, number][]; crit: number; from: View; }

// Shots come from the shooter's best spot (leaning out if needed), with a penalty if the
// target is only partly visible from there.
/** The weapon a unit actually fires: its sidearm once an operative's main weapon is empty. */
export function activeGun(u: Unit): Gun | undefined {
  if (u.side === "mtf" && u.gun && u.gun.ammo < 1) return { name: SIDEARM.name, type: "smg", dmg: SIDEARM.dmg, mag: 0, ammo: 0, aim: SIDEARM.aim };
  return u.gun;
}
export const usingSidearm = (u: Unit) => u.side === "mtf" && !!u.gun && u.gun.ammo < 1;

/** Phase 4I: where the target can be hit from. Visibility isn't enough: the shot needs a clear line of fire (no wall,
 *  shut door or reinforced glass in the way) from the shooter's tile or a spot they can lean out to, to the target's
 *  tile or to the spot the target leaned out to this turn. The best such view, or null. */
export function lineOfFire(sh: Unit, tg: Unit): (View & { tx: number; ty: number }) | null {
  // Tactical overhaul T3: no shot at what can't be made out at all (light, distance, weather and smoke decide)
  const pc = perceive(sh, tg.x, tg.y, tg);
  const range = pc.level >= DETECTED ? SIGHT_MAX : 0;
  const aims: [number, number][] = [[tg.x, tg.y]];
  if (tg.exposed && tg.exposed.turn >= S.turn - 1 && (tg.exposed.x !== tg.x || tg.exposed.y !== tg.y)) aims.push([tg.exposed.x, tg.exposed.y]);
  let best: (View & { tx: number; ty: number }) | null = null;
  // Tactical overhaul T1: the same eye points, trace and body exposure as sight; the shot also needs the bullets'
  // path to enough of the target clear (reinforced glass is the only thing that stops fire but not sight)
  for (const [tx, ty] of aims) {
    const v = fireView(sh.x, sh.y, tx, ty, range, tx === tg.x && ty === tg.y && peeks(tg));
    if (v && (!best || v.f > best.f)) best = { ...v, tx, ty };
  }
  return best;
}
/** Can see the target and has a line of fire to it. */
export const canShoot = (sh: Unit, tg: Unit) => !!lineOfFire(sh, tg);

export function shotInfo(sh: Unit, tg: Unit, reaction = false): ShotInfo {
  const v = lineOfFire(sh, tg) || { f: 0, x: sh.x, y: sh.y, tx: tg.x, ty: tg.y };
  const dist = Math.hypot(tg.x - v.x, tg.y - v.y);
  const hunkered = (tg.hunkerUntil ?? -1) >= S.turn;
  const cover = coverAgainst(tg.x, tg.y, v.x, v.y) * (hunkered ? 2 : 1);
  // Tactical overhaul T4.2: stepping out costs nothing in itself (as in XCOM); what matters is how much of the
  // target is exposed to the shot (3, 4 or 5 of 5 points on their figure)
  const partial = v.f < 1;
  const gun = activeGun(sh);
  const mods: [string, number][] = [["Aim", sh.aim]];
  if (gun?.aim) mods.push([gun.name, gun.aim]);
  if (gun?.attachment === "scope") mods.push(["Telescopic sight", 5]);
  if (gun?.attachment === "sights") mods.push(["Improved sights", 10]);
  if (reaction && gun?.ammoType === "tracer") mods.push(["Tracer rounds", 10]);
  if (cover >= 40) mods.push([hunkered ? (cover === 80 ? "Full cover, hunkered" : "Half cover, hunkered") : "Full cover", -cover]);
  else if (cover === 20) mods.push(["Half cover", -20]);
  else mods.push(["Flanked", 10]);
  // with cover counted, a figure partly behind it isn't penalised twice
  if (partial && cover === 0) mods.push(["Partly hidden", -Math.round(25 * (1 - v.f))]);
  const rm = rangeMod(gun?.type ?? "rifle", dist);
  if (rm) mods.push(rm);
  // facing: a reaction shot at someone behind them means turning first
  if (reaction && sh.facing !== undefined) { const d = Math.abs(((facingTo(tg.x - sh.x, tg.y - sh.y) - sh.facing) % 8 + 12) % 8 - 4); if (d > 2) mods.push(["Turning to fire", -10]); }
  if (reaction && !hasPerk(sh, "covering_fire")) mods.push(["Reaction shot", (gun?.type === "mg" ? -5 : -15) + (sh.side === "mtf" ? Math.min(S.setup.mods.reactionBonus ?? 0, gun?.type === "mg" ? 5 : 15) : 0)]);
  if (sh.side === "raider" && tg.hasArmor && S.setup.mods.ciAnalysis) mods.push(["Known weapons", -5]);
  if (officerNear(sh)) mods.push(["Officer nearby", 10]);
  { const mate = bondmateNear(sh); if (mate) mods.push([`Bond: ${mate.name.split(" ").pop()}`, BOND_AIM[sh.bonds![mate.opId!]]]); }
  if (sh.side === "mtf" && sh.san <= 30) mods.push(["Shaken", -10]);
  if (sh.medals?.includes("sealed_in") && (tg.side === "anomaly" || (tg.side === "zombie" && !tg.rioter))) mods.push(["Sealed in", 5]);
  if (cover === 0 && hasPerk(sh, "hunter")) mods.push(["Hunter", 20]);
  if (dist <= 3 && hasPerk(sh, "shotgun_drills")) mods.push(["Shotgun drills", 20]);
  if ((sh.suppressedUntil ?? -1) >= S.turn) mods.push(["Suppressed", -30]);
  if (S.setup.weather === "storm" && dist > 5) mods.push(["Storm", -10]);
  // Tactical overhaul T3: a shape nobody has made out yet is harder to aim at
  if (isTeam(sh) && !isTeam(tg) && (S.perceived?.get(tg.id) ?? 2) === 1) mods.push(["Unidentified target", -10]);
  if (isTeam(sh) && (tg.markedUntil ?? -1) >= S.turn) mods.push(["Marked", 15]);
  if (isTeam(sh) && team().some(a => a !== sh && hasPerk(a, "spotter") && canSee(a, tg.x, tg.y))) mods.push(["Spotted", 10]);
  const raw = mods.reduce((a, m) => a + m[1], 0);
  const crit = (cover === 0 && !partial ? 40 : 0) + (hasPerk(sh, "sharpshooter") ? 20 : 0)
    + (gun ? TYPES[gun.type].crit : 0) + (gun?.attachment === "trigger" ? 10 : 0);
  return { chance: Math.max(5, Math.min(95, raw)), mods, crit, from: v };
}

export const center = (u: { x: number; y: number }): Pt => [u.x * TS + TS / 2, u.y * TS + TS / 2];

/** The situational reasons behind a hit chance, for the log: cover, flanking, range and the like (not the shooter's
 *  own aim and weapon, which are always there). */
function why(info: ReturnType<typeof shotInfo>, gunName?: string) {
  const r = info.mods.filter(([n, v], k) => k > 0 && v && n !== gunName);
  return r.length ? `: ${r.slice(0, 3).map(([n, v]) => `${n.toLowerCase()} ${v > 0 ? "+" : ""}${v}`).join(", ")}` : "";
}

/** The strongest bondmate of the shooter within 4 tiles and in sight, if any. */
function bondmateNear(sh: Unit) {
  if (!sh.bonds) return null;
  let best: Unit | null = null;
  for (const m of team()) if (m !== sh && m.opId && sh.bonds[m.opId] && cheb(m.x, m.y, sh.x, sh.y) <= 4 && canSee(sh, m.x, m.y))
    if (!best || sh.bonds[m.opId] > sh.bonds[best.opId!]) best = m;
  return best;
}

export async function fire(sh: Unit, tg: Unit, reaction: boolean) {
  const info = shotInfo(sh, tg, reaction);
  const gun = activeGun(sh), sidearm = usingSidearm(sh);
  // in a storm the noise covers the shot
  if (sh.side === "mtf" && S.setup.weather !== "storm") breakConcealment("shots fired");
  if (sh.gun && !sidearm) sh.gun.ammo = Math.max(0, sh.gun.ammo - 1);
  sh.firedTurn = S.turn;
  const roll = rnd() * 100, hit = roll < info.chance, grazed = !hit && info.chance < 95 && roll < info.chance + GRAZE_BAND;
  if (S.enemyTurn && S.phase !== "player" && !isTeam(sh)) { S.enemyTurn.shots++; if (hit) S.enemyTurn.hits++; }
  // leaning out to fire leaves the shooter exposed at that spot through the enemy's reply
  if (info.from.x !== sh.x || info.from.y !== sh.y) sh.exposed = { x: info.from.x, y: info.from.y, turn: S.turn };
  // ordinary glass in the way shatters (and stays broken)
  { const aim = info.from as View & { tx?: number; ty?: number }, panes = fireLine(info.from.x, info.from.y, aim.tx ?? tg.x, aim.ty ?? tg.y) ?? [];
    let broke = 0; for (const [gx, gy] of panes) if (breakGlass(gx, gy)) broke++;
    if (broke && (seen(panes[0][0], panes[0][1]) || isTeam(sh))) log(`Glass shatters.`);
    if (broke) emitNoise(panes[0][0], panes[0][1], "glass", sh); }
  sh.facing = facingTo(tg.x - sh.x, tg.y - sh.y);
  if (gun?.attachment !== "suppressor") emitNoise(info.from.x, info.from.y, "gunfire", sh);
  const [x0, y0] = center(info.from), [x1, y1] = center(tg);
  // Phase 4G: the rounds travel and land. A miss the target's cover caught strikes that cover; any other lands beside them.
  const coverMod = info.mods.find(([n]) => /cover/i.test(n))?.[1] ?? 0, byCover = !hit && coverMod < 0 && roll < info.chance - coverMod;
  const coverTile = byCover ? coverTileFacing(tg.x, tg.y, info.from.x, info.from.y) : null;
  let ox = 0, oy = 0;
  if (coverTile) { ox = (coverTile[0] - tg.x) * TS * 0.55; oy = (coverTile[1] - tg.y) * TS * 0.55; }
  else if (!hit) { const a = fxRnd() * Math.PI * 2; ox = Math.cos(a) * (11 + fxRnd() * 8); oy = Math.sin(a) * (11 + fxRnd() * 8); }
  const armored = hit && (tg.armor ?? 0) > (gun?.pierce ?? 0);
  const impact: Impact = !hit ? (coverTile ? "cover" : "dust") : tg.side === "anomaly" ? "spark" : tg.side === "zombie" && !tg.rioter ? "ichor" : armored ? "spark" : "blood";
  const burst = sidearm ? null : gun?.type === "mg" ? [4, 75] : gun?.type === "smg" ? [3, 60] : null;
  const travel = Math.max(60, Math.min(240, Math.hypot(x1 - x0, y1 - y0) / 1.5)), land = travel + (burst ? (burst[0] - 1) * burst[1] : 0);
  fx({ type: "line", x0, y0, x1: x1 + ox, y1: y1 + oy, color: sh.side === "mtf" ? "#cfe4f4" : "#f0c8a0", dur: land + 360, rounds: burst?.[0] ?? 1, gap: burst?.[1] ?? 0, impact, at: coverTile ?? undefined });
  const visibleShot = sh.side === "mtf" || seen(sh.x, sh.y) || isTeam(tg);
  if (!hasPerk(sh, "quiet_steps") && gun?.attachment !== "suppressor") {   // SCP-173 hears the shot, but only roughly where it came from
    const near = bfs([[sh.x, sh.y]], 3).dist, spots: number[] = [];
    for (let i = 0; i < L.W * L.H; i++) if (near[i] >= 0) spots.push(i);
    const i = spots[Math.floor(rnd() * spots.length)];
    S.mem.set("shot-" + sh.id, { x: i % L.W, y: (i / L.W) | 0, turn: S.turn });
  }
  if (sh.side === "mtf") reveal("hear");
  if (hit && charmTurns(tg)) { hooks.update(); await sleep(380); return; }
  if (hit) {
    const crit = rnd() * 100 < info.crit;
    let dmg = gun ? rand(gun.dmg[0], gun.dmg[1]) : rand(3, 4);
    // Tactical overhaul T4.3: shotguns and SMGs lose punch at range
    if (gun) dmg = Math.max(1, dmg + rangeDamage(gun.type, Math.hypot(tg.x - info.from.x, tg.y - info.from.y)));
    if (crit) dmg += gun?.ammoType === "hollow" ? 3 : 2;
    if (hasPerk(sh, "shotgun_drills") && Math.hypot(tg.x - info.from.x, tg.y - info.from.y) <= 3) dmg += 2;
    const soak = Math.min(Math.max(0, (tg.armor ?? 0) - (gun?.pierce ?? 0)), dmg);   // each armor point cuts the hit by 1
    dmg -= soak;
    S.hitKind = sidearm ? "pistol" : gun?.type ?? "pistol";
    fx({ type: "text", x: x1, y: y1 - 14, text: (crit ? `${dmg}!` : `${dmg}`) + (soak ? ` (−${soak})` : ""), color: crit ? "#f0c060" : "#ffffff", dur: 900 }, travel);
    if (crit && visibleShot) { fx({ type: "text", x: x1, y: y1 - 30, text: "CRITICAL", color: "#f0c060", dur: 1100, big: true }, travel); highlight(3, "#f0c060"); }
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${sidearm ? "Sidearm: " : ""}${full(sh)} hits ${full(tg)} for ${dmg}${crit ? ", critical" : ""}${soak ? `; armor absorbed ${soak}` : ""} (${info.chance}%${why(info, gun?.name)}).`, sh.side === "mtf" ? "good" : "bad");
    if (hasPerk(sh, "shredder") && (tg.armor ?? 0) > 0) { tg.armor!--; log("The hit shreds a point of armor.", "good"); }
    damage(tg, dmg, sh);
    if (gun?.ammoType === "incendiary" && !sidearm) ignite(tg.x, tg.y, 1);
  } else if (grazed) {
    // Tactical overhaul T4.3: a near miss (within GRAZE_BAND of the chance) grazes for half damage, no crit
    const raw = gun ? Math.ceil(rand(gun.dmg[0], gun.dmg[1]) / 2) : 1;
    const dmg = Math.max(0, raw - Math.max(0, (tg.armor ?? 0) - (gun?.pierce ?? 0)));
    fx({ type: "text", x: x1, y: y1 - 14, text: `GRAZE ${dmg}`, color: "#d8bf86", dur: 900 }, travel);
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${full(sh)} grazes ${full(tg)} for ${dmg} (${info.chance}%${why(info, gun?.name)}).`, sh.side === "mtf" ? "good" : "bad");
    if (dmg) { S.hitKind = sidearm ? "pistol" : gun?.type ?? "pistol"; damage(tg, dmg, sh); }
  } else {
    const graze = gun?.attachment === "stock" ? Math.max(0, 1 - (tg.armor ?? 0)) : 0;
    fx({ type: "text", x: x1, y: y1 - 14, text: graze ? "GRAZE 1" : coverTile ? "COVER" : "MISS", color: graze ? "#d8bf86" : coverTile ? "#9cc4e4" : "#8b939b", dur: 900 }, travel);
    if (visibleShot) log(`${reaction ? "Overwatch: " : ""}${full(sh)} misses ${full(tg)} (${info.chance}%${why(info, gun?.name)})${graze ? ", but the round grazes for 1" : ""}.`);
    if (graze) damage(tg, 1, sh);
    // Tactical overhaul T4.7: the round that cover caught wears it down
    if (coverTile) {
      const what = damageCover(coverTile[0], coverTile[1]);
      if (what && (visibleShot || seen(coverTile[0], coverTile[1]))) log(what === "half" ? "The cover is shot to pieces: only half cover left." : "The cover is shot away.", "key");
    }
  }
  hooks.update();
  await sleep(Math.max(380, land + 120));
}

/** The cover tile beside (tx, ty) that faces a shooter at (sx, sy): the one a round meant for the target would strike. */
const coverTileFacing = (tx: number, ty: number, sx: number, sy: number) => coverOn(tx, ty, sx, sy).tile;

/** A miss by less than this many points is a graze (half damage). */
export const GRAZE_BAND = 10;
export const BLEED_TURNS = 3;

export function damage(u: Unit, dmg: number, by?: Unit) {
  if (dmg <= 0) return;
  if (S.trophy?.includes(u.id)) dropTrophy("A carrier is hit.");
  if (S.enemyTurn && S.phase !== "player" && isTeam(u)) S.enemyTurn.hurt[u.call || u.name] = (S.enemyTurn.hurt[u.call || u.name] ?? 0) + dmg;
  // SCP-049 can't be hurt, only knocked back a step in its plans
  if (u.side === "anomaly") {
    if (S.scp === "682") { hit682(dmg, S.hitKind ?? "other"); return; }
    if (S.has049) { u.staggeredUntil = S.turn; log("SCP-049 staggers under the hit but isn't hurt. It loses its next move.", "key"); }
    if (S.has106) shotAt106();
    return;
  }
  u.hp -= dmg;
  // SCP-035's host: the mask comes off; a team member it had taken goes down instead of dying
  if (u.hp <= 0 && u.host && hostFalls(u)) { u.hp = 1; damage(u, 1, by); return; }
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
  if (u.hp <= 0 && u.side === "raider" && !u.downed && rnd() < 0.15) {
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
  for (const m of team()) if (m !== u && u.opId && m.bonds?.[u.opId]) loseSanity(m, 5 * m.bonds[u.opId], "witness");
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
  if (wasTeam && S.enemyTurn && S.phase !== "player") S.enemyTurn.lost.push(u.call || u.name);
  if (wasTeam || seen(u.x, u.y)) highlight(wasTeam ? 4 : 2, wasTeam ? "#d75b47" : "#ffffff");
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

/** XCOM 2 suppression (Tactical overhaul T4.6), for the team's ability and the enemy AI alike: 2 rounds, and each
 *  target is pinned through its next turn (−30 aim, no overwatch); if it moves, the suppressor gets a shot at it. */
export function suppress(by: Unit, targets: Unit[]) {
  if (by.gun) by.gun.ammo = Math.max(0, by.gun.ammo - 2);
  by.firedTurn = S.turn;
  for (const r of targets) { r.suppressedUntil = S.turn + 1; r.suppressedBy = by.id; r.overwatch = false; }
  emitNoise(by.x, by.y, "gunfire", by);
  if (by.side === "mtf" && S.setup.weather !== "storm") breakConcealment("suppressing fire");
}

// ---------- reaction fire (Tactical overhaul T4.5) ----------
/** Whom a unit on overwatch will fire at: the team at Insurgents, SCP-049-2 and other hostile instances, rioters and a
 *  fighting SCP-682; Insurgents at the team. Nobody reacts to what they can't make out (perception), or through a
 *  line they couldn't fire along. */
export function hostileTo(w: Unit, u: Unit): boolean {
  if (!u.alive || u.downed || u.saved || u.carriedBy || u.restrained) return false;
  if (isTeam(w)) return u.side === "raider" || (u.side === "zombie" && !(u.voice && hidden939(u))) || (u.side === "anomaly" && S.scp === "682");
  if (w.side === "raider") return isTeam(u);
  return false;
}
/** Everyone watching who can make out the mover and has a line of fire takes their reaction shot(s). A suppressed
 *  unit that moves draws a shot from whoever is suppressing it, on its first step (XCOM 2). */
async function reactTo(u: Unit, firstStep: boolean) {
  if (firstStep && (u.suppressedUntil ?? -1) >= S.turn && u.suppressedBy) {
    const s = S.units.find(v => v.id === u.suppressedBy);
    u.suppressedBy = undefined; u.suppressedUntil = undefined;
    if (s && s.alive && !s.downed && !isPanicked(s) && canSee(s, u.x, u.y) && canShoot(s, u)) {
      if (seen(s.x, s.y) || isTeam(s)) log(`${full(s)} fires as ${full(u)} breaks from cover under suppression.`, isTeam(s) ? "good" : "bad");
      await fire(s, u, true);
    }
  }
  for (const w of S.units) {
    if (!u.alive || u.downed) return;
    if (w === u || !w.alive || w.downed || !w.overwatch || isPanicked(w) || (w.blindUntil ?? -1) >= S.turn || !hostileTo(w, u)) continue;
    if (!canSee(w, u.x, u.y) || !canShoot(w, u)) continue;
    w.overwatchShots = (w.overwatchShots ?? 1) - 1;
    if (w.overwatchShots <= 0) w.overwatch = false;
    if (!isTeam(w) && seen(w.x, w.y)) log(`${w.name} fires from overwatch.`, "bad");
    await fire(w, u, true);
  }
}

export async function moveUnit(u: Unit, path: Pt[]) {
  // a suppressor who moves lets go of whoever they were pinning
  if (path.length) for (const v of S.units) if (v.suppressedBy === u.id) { v.suppressedBy = undefined; v.suppressedUntil = undefined; }
  let first = true;
  for (const [x, y] of path) {
    if (!u.alive) return;
    // a shut door opens as someone walks through it, and stays open
    if (openDoor(x, y)) { emitNoise(x, y, "door", u); if (isTeam(u)) computeVis(); }
    if (u.x !== x || u.y !== y) u.facing = facingTo(x - u.x, y - u.y);
    u.x = x; u.y = y; u.movedTurn = S.turn;
    if (!hasPerk(u, "quiet_steps") && u.side !== "anomaly") emitNoise(x, y, "footsteps", u);
    if (u.carrying) { const c = S.units.find(v => v.id === u.carrying); if (c) { c.x = x; c.y = y; } }
    // SCP-106's rot eats at anyone who walks through it
    if (S.corroded.has(y * L.W + x) && u.side !== "anomaly" && u.armorKind !== "hazmat") { log(`${full(u)} steps in the black rot (1 damage).`, "bad"); damage(u, 1); }
    if (isTeam(u)) computeVis();
    // Tactical overhaul T4.5/T4.6: anyone watching reacts to hostile movement they can make out
    await reactTo(u, first);
    first = false;
    if (isTeam(u) || seen(x, y)) await sleep(60);
  }
  // having arrived, they turn to face the nearest enemy they can see (otherwise they keep facing the way they walked)
  if (u.alive && !u.downed && (isTeam(u) || u.side === "raider")) faceThreat(u);
}
