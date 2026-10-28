// Player actions and the turn cycle: your move, SCP-173, the Insurgency, then loose D-Class.
import { settleFacing, facingTo, facingName, emitNoise } from "./noise";
import { hazardDealt } from "./mission";
import { reinforcementsTick } from "./ciTactics";
import { blastStructure, DRUM, FLOOR, HALF, L, STEEL, TS, area, area as area_, cheb, inContainer, nearContainer, pathTo, bfs, canStep, passable, setSlow, setVault, tileAt, DIRS, type Pt } from "../core/grid";
import { setSmoke, sightFrom } from "../core/sight";
import { canShoot, activeGun, damage, fire, kill, moveUnit } from "./combat";
import { TYPES } from "../data/weapons";
import { abilityTargets, useAbility } from "./abilities";
import { hasPerk, rangeOf, spend, usesLeft } from "./perks";
import { gatherResearchers, subjectPhase } from "./dclass";
import { insurgentsStare, raiderPhase, wakePods } from "./insurgency";
import { entryTiles, missionResult, spawnMember } from "./mission";
import { maxSanOf, prof } from "./profiles";
import { release, rollBlinks } from "./scp173";
import { leadOptions, leadTo, plaguePhase, zombiePhase } from "./scp049";
import { oldManPhase } from "./scp106";
import { CORE_BURN, firePhase, fleshContact, ignite, spreadFlesh, turnInfected } from "./fire";
import {
  S, alive, breakConcealment, canAct, canSee, computeVis, full, fx, hooks, humans, isPanicked, isTeam, label, log, loseSanity,
  occupied, reveal, seen, sleep, starers, team, unitAt,
} from "./state";
import { RAID_TURNS, THROWN, type Unit } from "./types";

const DRAG_SANITY = 5;

// Staring units can move anywhere within range, provided every tile on the way keeps sight of SCP-173.
export function reachFor(u: Unit | null) {
  if (!u || u.ap < 1) return null;
  const move = moveOf(u);
  setVault(hasPerk(u, "bulldozer"));
  setSlow(S.corroded);
  // the team can walk through each other (a squadmate in a doorway doesn't seal it), but not through anyone else
  const blocker = (x: number, y: number) => S.units.some(o => o !== u && o.alive && !o.saved && !o.carriedBy && o.x === x && o.y === y && !(isTeam(u) && isTeam(o)));
  let res;
  if (u.staring) {
    const st = S.statue;
    res = bfs([[u.x, u.y]], move, (x, y) => blocker(x, y) || !sightFrom(x, y, st.x, st.y, rangeOf(u)));
  } else res = bfs([[u.x, u.y]], u.ap * move, blocker);
  // ...and nobody ends a move on someone else's tile
  for (let i = 0; i < res.dist.length; i++) if (res.dist[i] > 0 && occupied(i % L.W, (i / L.W) | 0, u)) res.dist[i] = -res.dist[i] - 100;
  setVault(false); setSlow(new Set());
  // nobody ends a move standing on a desk
  for (let i = 0; i < res.dist.length; i++) if (res.dist[i] > 0 && tileAt(i % L.W, (i / L.W) | 0) === HALF) res.dist[i] = -res.dist[i] - 100;
  return res;
}
export const moveOf = (u: Unit) => Math.max(1, prof(u).move + (u.gun ? TYPES[u.gun.type].move : 0) + (u.moveBonus ?? 0) - (u.carrying ? 1 : 0) - (S.setup.weather === "snow" ? 1 : 0));
export const moveCost = (u: Unit, d: number) => d <= moveOf(u) ? 1 : 2;

/** Why this unit can't fire right now, or null. */
export function fireCheck(u: Unit) {
  if (!u.gun) return null;
  if (u.gun.ammo < 1 && u.side !== "mtf") return "Out of ammo. Reload first (R).";
  if (u.gun.ammo >= 1 && u.gun.type === "marksman" && u.ap < 2) return "A marksman rifle takes both actions to fire.";
  return null;
}
export function reloadCheck(u: Unit | null) {
  if (!u || !u.gun) return "Select an operative.";
  if (u.gun.ammo >= u.gun.mag) return "Magazine is full.";
  if (u.ap < 1) return "No actions left this turn.";
  return null;
}
export function doReload(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  const why = reloadCheck(u);
  if (why) { flash(why); return; }
  u.gun!.ammo = u.gun!.mag; u.ap--;
  log(`${full(u)} reloads the ${u.gun!.name}.`);
  afterAction();
}
const dragOf = (u: Unit) => (u.side === "mtf" ? S.setup.mods.mtfDrag : prof(u).drag) + (hasPerk(u, "handler") ? 1 : 0);

// Drag: the dragger steps up to their drag distance and SCP-173 slides into the tile they
// just left. Every position it passes through must be in sight of someone else who is staring.
export function dragOptions(u: Unit) {
  const out = new Map<number, Pt[]>(), st = S.statue;
  const watchers = team().filter(w => w !== u && w.staring && !isPanicked(w));
  const watched = (x: number, y: number) => watchers.some(w => canSee(w, x, y));
  const free = (x: number, y: number, ignoreStatue: boolean) =>
    !S.units.some(o => o !== u && o.alive && !o.saved && o.x === x && o.y === y && !(ignoreStatue && o === st));
  if (!watched(u.x, u.y)) return out;
  for (const [dx, dy] of DIRS) {
    const ax = u.x + dx, ay = u.y + dy;
    if (!canStep(u.x, u.y, dx, dy) || !free(ax, ay, false)) continue;
    if (!out.has(ay * L.W + ax)) out.set(ay * L.W + ax, [[ax, ay]]);
    if (dragOf(u) < 2 || !watched(ax, ay)) continue;
    for (const [ex, ey] of DIRS) {
      const bx = ax + ex, by = ay + ey;
      if ((bx === u.x && by === u.y) || !canStep(ax, ay, ex, ey) || !free(bx, by, true)) continue;
      if (!out.has(by * L.W + bx)) out.set(by * L.W + bx, [[ax, ay], [bx, by]]);
      if (dragOf(u) < 3 || !watched(bx, by)) continue;
      for (const [fx2, fy2] of DIRS) {
        const cx = bx + fx2, cy = by + fy2;
        if ((cx === ax && cy === ay) || (cx === u.x && cy === u.y) || !canStep(bx, by, fx2, fy2) || !free(cx, cy, true)) continue;
        if (!out.has(cy * L.W + cx)) out.set(cy * L.W + cx, [[ax, ay], [bx, by], [cx, cy]]);
      }
    }
  }
  return out;
}

export function stareCheck(u: Unit | null) {
  if (!u) return "Select someone.";
  if (u.staring) return null;
  if (S.sealed) return "SCP-173 is sealed.";
  if (isPanicked(u)) return "Their eyes are shut.";
  if (u.ap < 1) return "No actions left this turn.";
  if (!canSee(u, S.statue.x, S.statue.y)) return "No line of sight to SCP-173.";
  return null;
}
export function callCheck() {
  if (S.sealed) return "SCP-173 is sealed.";
  if (S.called) return "The blink has already been called this turn.";
  if (!starers().length) return "Nobody is staring at SCP-173.";
  return null;
}
export function dragCheck(u: Unit | null) {
  const st = S.statue;
  if (!u || !isTeam(u)) return "Select someone.";
  if (S.sealed) return "SCP-173 is sealed.";
  if (u.ap < 1) return "No actions left this turn.";
  if (cheb(u.x, u.y, st.x, st.y) !== 1) return "Stand next to SCP-173 first.";
  if (!team().some(w => w !== u && w.staring && !isPanicked(w))) return "Someone else must be staring at SCP-173.";
  if (!dragOptions(u).size) return "No room to drag it while it stays in sight.";
  return null;
}
export function sealCheck(u: Unit | null) {
  const st = S.statue;
  if (S.sealed) return "Already sealed.";
  if (!u || u.side !== "mtf") return "Only an operative can seal the container.";
  if (!inContainer(st.x, st.y) || (S.has106 && S.submerged)) return `${st.name} isn't in the container yet.`;
  if (u.ap < 1) return "No actions left this turn.";
  if (!nearContainer(u.x, u.y)) return "Stand at the container door to close it.";
  if (humans().some(h => inContainer(h.x, h.y))) return "Get everyone out of the container first.";
  if (S.has173 && !starers().length) return "Someone must be staring at SCP-173 while the door closes.";
  return null;
}

export function startPlayerTurn(first: boolean) {
  S.phase = "player"; S.called = false; S.mode = null; S.throwing = null;
  settleFacing();
  const smokeBefore = S.smoke.length;
  S.smoke = S.smoke.filter(s => s.until >= S.turn);
  setSmoke(S.smoke.map(s => [s.x, s.y]));
  if (smokeBefore && !S.smoke.length) log("The smoke clears.");
  for (const u of S.units) if (u.alive && u.downed && !u.stabilized && !first) {
    u.bleed = (u.bleed ?? 3) - 1;
    if (u.bleed <= 0) { log(`${full(u)} bled out.`, "bad"); kill(u); }
    else log(`${full(u)} is bleeding out: ${u.bleed} turn${u.bleed > 1 ? "s" : ""} left.`, "bad");
  }
  arrivals(first);
  if (!first) turnInfected();
  for (const m of team()) {
    m.overwatch = false;
    m.ap = isPanicked(m) ? 0 : m.staring ? 1 : 2;
    if (isPanicked(m)) log(`${full(m)} has their eyes shut and will not act this turn.`, "bad");
  }
  computeVis();
  S.selected = team().find(m => m.ap > 0) || null;
  if (!first) log(`Turn ${S.turn}.`, "key");
  hooks.update();
  // nobody on the map yet but help is coming: let the turns run until it arrives
  if (!team().length && S.reinforce.length) window.setTimeout(endTurn, 350);
}

/** Squad members due this turn walk in at the entry points. */
function arrivals(first: boolean) {
  if (first) return;
  for (const r of S.reinforce.filter(r => r.turn <= S.turn)) {
    S.reinforce = S.reinforce.filter(x => x !== r);
    const free = entryTiles().filter(([x, y]) => !S.units.some(u => u.alive && !u.saved && u.x === x && u.y === y));
    const came: string[] = [];
    for (const m of r.members) {
      const t = free.shift();
      if (!t) { S.reinforce.push({ turn: S.turn + 1, members: [m] }); continue; }
      S.units.push(spawnMember(m, t[0], t[1], S.setup.mods));
      came.push(m.name);
    }
    if (came.length) log(r.members[0].guard ? `More Site Security arrives: ${came.join(", ")}.` : `Epsilon-11 is on the scene: ${came.join(", ")}.`, "good");
  }
}

export function select(u: Unit) { S.selected = u; S.pending = null; S.mode = null; hooks.update(); }

export function selectNext() {
  const t = team();
  if (!t.length) return;
  const start = Math.max(0, t.indexOf(S.selected!));
  for (let k = 1; k <= t.length; k++) {
    const m = t[(start + k) % t.length];
    if (m.ap > 0) { select(m); return; }
  }
}

/** Tap/click on a tile. On touch, the first tap previews and the second confirms. */
export async function onTap(x: number, y: number, touch: boolean, flash: (t: string) => void) {
  if (!canAct()) return;
  if (S.debug?.place173 || S.debug?.kill) { debugTap(x, y); return; }
  const u = unitAt(x, y);
  const sel = S.selected;
  const confirm = () => {
    if (!touch) return true;
    if (S.pending && S.pending.x === x && S.pending.y === y) return true;
    S.pending = { x, y }; S.hover = { x, y }; hooks.update(); return false;
  };
  if (S.mode === "doors") { toggleDoor(x, y, flash); return; }
  // turning to face somewhere costs nothing; it's where they look when nothing else needs their attention
  if (S.mode === "face" && sel) { if (x !== sel.x || y !== sel.y) { sel.prefFacing = sel.facing = facingTo(x - sel.x, y - sel.y); log(`${sel.call || sel.name} faces ${facingName(sel.facing)}.`); } S.mode = null; hooks.update(); return; }
  if (S.mode === "lead") {
    if (!leadOptions().has(y * L.W + x)) { flash("SCP-049 can be led up to 3 tiles along open floor."); return; }
    if (!confirm()) return;
    S.busy = true; S.mode = null;
    await leadTo(x, y);
    S.busy = false; afterAction(); return;
  }
  // while aiming a grenade, a click always picks the target, even on top of someone
  if (S.mode === "ability" && S.ability && sel) {
    const t = abilityTargets(sel, S.ability!).find(v => v.x === x && v.y === y);
    if (!t) { flash("Not a valid target for that."); return; }
    if (!confirm()) return;
    useAbility(sel, S.ability, t);
    afterAction();
    return;
  }
  if (S.mode === "throw" && S.throwing && sel) {
    if (!throwOptions(sel).has(y * L.W + x)) { flash("Out of range or out of sight."); return; }
    if (!confirm()) return;
    doThrow(sel, S.throwing, x, y);
    S.busy = true; await wakePods(); S.busy = false; afterAction();
    return;
  }
  if (u && isTeam(u) && !u.downed) { select(u); return; }
  if (!sel || sel.ap < 1) return;
  if (S.mode === "drag") {
    const path = dragOptions(sel).get(y * L.W + x);
    if (!path) { S.mode = null; hooks.update(); return; }
    if (!confirm()) return;
    await doDrag(sel, path);
    return;
  }
  if (u && u.side === "anomaly" && (S.has049 || (S.has106 && !S.submerged)) && seen(x, y) && sel.side === "mtf" && sel.ap > 0) {
    if (!canSee(sel, x, y)) { flash(`${sel.call} has no line of sight to ${u.name}.`); return; }
    if (!canShoot(sel, u)) { flash(`${sel.call} can see ${u.name} but has no line of fire.`); return; }
    const fw = fireCheck(sel);
    if (fw) { flash(fw); return; }
    if (!confirm()) return;
    S.busy = true; S.pending = null; sel.ap = activeGun(sel)?.type === "smg" ? sel.ap - 1 : 0;
    await fire(sel, u, false);
    S.busy = false; afterAction(); return;
  }
  if (u && u.side === "anomaly" && seen(x, y)) {
    reveal("arms");
    log("Rounds would do nothing to SCP-173. It has to go in the container.");
    hooks.update(); return;
  }
  if (u && (u.side === "raider" || u.side === "zombie") && seen(x, y)) {
    if (sel.side !== "mtf") { flash("D-Class are unarmed."); return; }
    if (!canSee(sel, x, y)) { flash(`${sel.call} has no line of sight to that target.`); return; }
    if (!canShoot(sel, u)) { flash(`${sel.call} can see the target but has no line of fire (a wall or reinforced glass is in the way).`); return; }
    const fw = fireCheck(sel);
    if (fw) { flash(fw); return; }
    if (!confirm()) return;
    S.busy = true; S.pending = null;
    // a bayonet settles an adjacent fight without a roll or a round
    if (sel.gun?.attachment === "bayonet" && cheb(sel.x, sel.y, u.x, u.y) <= 1) {
      S.busy = false; sel.ap = 0;
      breakConcealment("a bayonet attack");
      log(`${full(sel)} drives the bayonet home (3 damage).`, "good");
      fx({ type: "text", x: u.x * TS + TS / 2, y: u.y * TS - 2, text: "3", color: "#ffffff", dur: 800 });
      damage(u, 3, sel); await wakePods(); afterAction(); return;
    }
    if (activeGun(sel)?.type === "smg") sel.ap -= 1;
    else if (hasPerk(sel, "double_tap") && sel.ap >= 2 && sel.gun?.type !== "marksman" && usesLeft(sel, "double_tap", 1) > 0) { spend(sel, "double_tap"); sel.ap = 1; log(`${full(sel)}: double tap.`, "key"); }
    else sel.ap = 0;
    await fire(sel, u, false);
    await wakePods();
    S.busy = false; afterAction(); return;
  }
  if (u) return;
  const res = reachFor(sel);
  const d = res ? res.dist[y * L.W + x] : -1;
  if (d <= 0 || !res) return;
  const cost = moveCost(sel, d);
  if (cost > sel.ap) return;
  if (!confirm()) return;
  S.busy = true; S.pending = null;
  sel.ap -= cost;
  setVault(hasPerk(sel, "bulldozer"));
  const path = pathTo(res, x, y) || [];
  setVault(false);
  await moveUnit(sel, path);
  await wakePods();
  S.busy = false; afterAction();
}

function afterAction() {
  gatherResearchers();
  computeVis();
  if (checkEnd()) return;
  if (S.selected && (!S.selected.alive || !isTeam(S.selected) || S.selected.ap === 0)) selectNext();
  hooks.update();
}

export function doOverwatch() {
  const u = S.selected;
  if (!canAct() || !u || u.side !== "mtf" || u.ap < 1 || (u.gun && u.gun.ammo < 1)) return;
  u.overwatch = true; u.ap = 0; u.overwatchShots = hasPerk(u, "rapid_reaction") ? 2 : 1;
  log(`${full(u)} on overwatch.`);
  afterAction();
}

export function toggleStare(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (u.staring) {
    u.staring = false;
    log(`${full(u)} looks away from SCP-173.`, "bad");
    hooks.update(); return;
  }
  const why = stareCheck(u);
  if (why) { flash(why); return; }
  u.ap = Math.min(u.ap - 1, 1); u.staring = true;
  log(`${full(u)}: “Eyes on. Do not blink.”`, "key");
  reveal("hold");
  afterAction();
}

export async function callBlink(flash: (t: string) => void) {
  if (!canAct()) return;
  const why = callCheck();
  if (why) { flash(why); return; }
  S.busy = true; S.called = true; S.pending = null; S.mode = null;
  const ss = starers();
  log(`${label(ss[0])}: “Blinking on three.” ${ss.length > 1 ? "Everyone staring blinks together." : "They blink."}`, "key");
  reveal("blink");
  hooks.update();
  await sleep(300);
  if (!(await release(new Set(ss)))) log("Someone else still had eyes on it. SCP-173 didn't move.");
  S.busy = false; afterAction();
}

export function toggleDrag(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (S.mode === "drag") { S.mode = null; hooks.update(); return; }
  if (u.staring) {
    // the dragger can't also be the one holding it; check someone else is
    if (!team().some(w => w !== u && w.staring && !isPanicked(w))) { flash("Someone else must be staring at SCP-173."); return; }
    u.staring = false;
    log(`${label(u)} looks away to get a grip on SCP-173.`);
  }
  const why = dragCheck(u);
  if (why) { flash(why); return; }
  S.mode = "drag"; S.pending = null;
  hooks.update();
}

async function doDrag(u: Unit, path: Pt[]) {
  const st = S.statue;
  S.busy = true; S.mode = null; S.pending = null;
  for (const [x, y] of path) {
    const px = u.x, py = u.y;
    u.x = x; u.y = y; st.x = px; st.y = py;
    computeVis();
    hooks.update();
    await sleep(140);
  }
  u.ap = 0;
  reveal("drag");
  log(`${label(u)} drags SCP-173 ${path.length} tile${path.length > 1 ? "s" : ""}${inContainer(st.x, st.y) ? " into the container" : ""}.`, inContainer(st.x, st.y) ? "good" : "");
  loseSanity(u, DRAG_SANITY);
  // the dragger looks straight back at it once they let go
  if (u.alive && isTeam(u) && !isPanicked(u) && canSee(u, st.x, st.y)) { u.staring = true; u.hadLos = true; }
  S.busy = false; afterAction();
}

export function doSeal(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct()) return;
  const why = sealCheck(u);
  if (why || !u) { flash(why || "Select an operative."); return; }
  u.ap = hasPerk(u, "procedure") ? u.ap - 1 : 0; u.sealed = true; S.sealed = true;
  for (const m of team()) m.staring = false;
  log(`${full(u)} swings the container door shut and locks it. ${st173name()} is sealed.`, "good");
  const [cx, cy] = L.contTiles[1] || L.contTiles[0];
  fx({ type: "text", x: cx * TS + 16, y: cy * TS - 4, text: "SEALED", color: "#86c193", dur: 1600 });
  afterAction();
}

// ---------- grenades ----------
export const THROW_RANGE = 6;
export const throwRange = (u: Unit) => S.throwing?.id === "bazooka" ? 10 : S.throwing?.id === "law" ? 8 : S.throwing?.id === "flamer" ? 4
  : THROW_RANGE + (hasPerk(u, "grenadier") ? 3 + (S.setup.mods.m79 ? 4 : 0) : 0);
/** Tiles the unit can throw to: within range and in sight. */
export function throwOptions(u: Unit) {
  const out = new Set<number>();
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    if ((x - u.x) ** 2 + (y - u.y) ** 2 <= throwRange(u) ** 2 && passable(x, y) && canSee(u, x, y)) out.add(y * L.W + x);
  return out;
}
export const blastArea = (x: number, y: number): Pt[] => DIRS.concat([[0, 0]]).map(([dx, dy]) => [x + dx, y + dy] as Pt).filter(([a, b]) => passable(a, b));

export function throwCheck(u: Unit | null, idx: number) {
  if (!u || u.side !== "mtf") return "Select an operative.";
  const it = u.items?.[idx];
  if (!it || !THROWN.includes(it.id)) return "Nothing to throw in that slot.";
  if (it.uses < 1) return "Used up.";
  if (u.ap < 1) return "No actions left this turn.";
  return null;
}
export function toggleThrow(idx: number, flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (S.mode === "throw" && S.throwing === u.items?.[idx]) { S.mode = null; S.throwing = null; hooks.update(); return; }
  const why = throwCheck(u, idx);
  if (why) { flash(why); return; }
  S.mode = "throw"; S.throwing = u.items![idx]; S.pending = null;
  hooks.update();
}

/** Items used in place: a medkit on the most hurt person within reach, or the camera on an anomaly in sight. */
export function useCheck(u: Unit | null, idx: number) {
  const it = u?.items?.[idx];
  if (!u || !it || (it.id !== "medkit" && it.id !== "camera")) return "Nothing to use in that slot.";
  if (it.uses < 1) return "Used up.";
  if (u.ap < 1) return "No actions left this turn.";
  if (it.id === "medkit" && !medkitTarget(u)) return "Nobody within reach is hurt.";
  if (it.id === "camera" && !cameraTarget(u)) return "No anomaly in sight to photograph.";
  return null;
}
const medkitTarget = (u: Unit) => team().filter(a => a.side === "mtf" && a.hp < a.maxHp && cheb(a.x, a.y, u.x, u.y) <= 1).sort((a, b) => a.hp - b.hp)[0];
const cameraTarget = (u: Unit) => {
  const st = S.statue, id = S.has049 ? "049" : S.has106 ? "106" : S.has173 ? "173" : null;
  return id && st.alive && !S.sealed && !(S.has106 && S.submerged) && canSee(u, st.x, st.y) && !S.photos.includes(id) ? id : null;
};
export function useItem(idx: number, flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  const why = useCheck(u, idx);
  if (why) { flash(why); return; }
  const it = u.items![idx];
  it.uses--; u.ap--;
  if (it.id === "medkit") {
    const t = medkitTarget(u)!;
    t.hp = Math.min(t.maxHp, t.hp + S.setup.mods.medkitHeal);
    log(`${full(u)} uses a medkit on ${t === u ? "themselves" : full(t)} (+${S.setup.mods.medkitHeal} HP).`, "good");
  } else {
    const id = cameraTarget(u)!;
    S.photos.push(id as "173" | "049" | "106");
    log(`${full(u)} photographs SCP-${id}. The film will help the researchers.`, "good");
  }
  afterAction();
}

function doThrow(u: Unit, item: NonNullable<Unit["items"]>[number], x: number, y: number) {
  item.uses--; u.ap = 0;
  breakConcealment(item.id === "smoke" ? "a smoke canister hissing" : item.id === "flare" ? "a flare lighting up the area" : "an explosion");
  S.mode = null; S.throwing = null; S.pending = null;
  const area = blastArea(x, y);
  const inArea = (v: Unit) => area.some(([a, b]) => a === v.x && b === v.y);
  if (item.id === "frag" || item.id === "bazooka" || item.id === "law") {
    const power = item.id === "bazooka" ? 5 : item.id === "law" ? 4 : 3;
    fx({ type: "flash", x: x * TS + TS / 2, y: y * TS + TS / 2, dur: 500 });
    emitNoise(x, y, "explosion", u);
    log(item.id === "frag" ? `${full(u)} throws a frag grenade.` : `${full(u)} fires the ${item.id === "bazooka" ? "bazooka" : "LAW"}.`, "key");
    for (const v of S.units.filter(v => v.alive && !v.saved && v.side !== "anomaly").filter(inArea)) {
      const soak = Math.min(v.armor ?? 0, power);
      damage(v, power - soak, u);
      if (v.armor && hasPerk(u, "shredder")) v.armor--;
    }
    // the blast takes cover, doors, partitions and glass; a rocket also opens an ordinary interior wall
    { const broke = new Set<string>();
      for (const [a, b] of area.concat(DIRS.map(([dx, dy]) => [x + dx, y + dy] as Pt))) { const r = blastStructure(a, b, item.id === "frag" ? 1 : 2); if (r) broke.add(r); }
      if (broke.size) { log(`The blast tears out ${[...broke].map(k => ({ cover: "cover", door: "a door", partition: "a partition", window: "glass", wall: "a wall" }[k])).join(", ")}.`); computeVis(); } }
    // blasts set off fuel drums and scorch flesh
    for (const [a, b] of area) if (tileAt(a, b) === DRUM || S.flesh.has(b * L.W + a)) ignite(a, b, 1);
    if (!hasPerk(u, "quiet_steps")) S.mem.set("bang-" + u.id, { x, y, turn: S.turn });
  } else if (item.id === "flashbang") {
    fx({ type: "flash", x: x * TS + TS / 2, y: y * TS + TS / 2, dur: 700 });
    const hit = humans().filter(inArea);
    for (const v of hit) { v.blindUntil = S.turn; if (isTeam(v)) v.staring = false; }
    const ours = hit.filter(isTeam), theirs = hit.filter(v => v.side === "raider");
    log(`${full(u)} throws a flashbang.${theirs.length ? ` ${theirs.length} Insurgent${theirs.length > 1 ? "s" : ""} blinded.` : ""}${ours.length ? ` ${ours.map(label).join(", ")} ${ours.length > 1 ? "are" : "is"} blinded too.` : ""}`, ours.length ? "bad" : "good");
    if (ours.some(v => v.hadLos)) log("Anyone blinded can't hold SCP-173 until next turn.", "bad");
    if (!hasPerk(u, "quiet_steps")) S.mem.set("bang-" + u.id, { x, y, turn: S.turn });   // SCP-173 hears it
  } else if (item.id === "incendiary") {
    log(`${full(u)} throws an incendiary grenade.`, "key");
    for (const [a, b] of area) ignite(a, b);
    if (S.core && area.some(([a, b]) => a === S.core!.x && b === S.core!.y)) { S.core.hp -= CORE_BURN; log(`The core catches (${Math.max(0, S.core.hp)} left).`, "good"); }
    if (!hasPerk(u, "quiet_steps")) S.mem.set("bang-" + u.id, { x, y, turn: S.turn });
  } else if (item.id === "flamer") {
    // a jet of burning fuel: the line from the thrower to the target, and the tiles around where it lands
    const line: Pt[] = [];
    const n = Math.max(Math.abs(x - u.x), Math.abs(y - u.y));
    for (let k = 1; k <= n; k++) line.push([Math.round(u.x + (x - u.x) * k / n), Math.round(u.y + (y - u.y) * k / n)]);
    const hitTiles = [...line, ...area];
    log(`${full(u)} sweeps the flamethrower across the ${area_(x, y)}.`, "key");
    for (const v of S.units.filter(v => v.alive && !v.saved && v !== u && v.side !== "anomaly" && hitTiles.some(([a, b]) => a === v.x && b === v.y))) damage(v, v.flesh ? 6 : 3, u);
    for (const [a, b] of hitTiles) ignite(a, b);
    if (S.core && hitTiles.some(([a, b]) => a === S.core!.x && b === S.core!.y)) { S.core.hp -= CORE_BURN; log(`The core catches (${Math.max(0, S.core.hp)} left).`, "good"); }
  } else if (item.id === "flare") {
    S.flares.push({ x, y, until: S.turn + 2 });
    log(`${full(u)} throws a flare. Everything within 2 tiles of it can be seen for 3 turns.`, "key");
  } else if (item.id === "csgas") {
    const hit = S.units.filter(v => v.alive && !v.saved && (v.side === "raider" || v.side === "civilian")).filter(inArea);
    for (const v of hit) v.suppressedUntil = S.turn + 1;
    log(`${full(u)} throws CS gas.${hit.length ? ` ${hit.length} caught in it, coughing and half-blind (−30 aim).` : ""}`, "good");
  } else {
    for (const [a, b] of area) S.smoke.push({ x: a, y: b, until: S.turn + 1 });
    setSmoke(S.smoke.map(s => [s.x, s.y]));
    log(`${full(u)} throws smoke. Nothing can see through it until it clears.`, "key");
  }
  afterAction();
}

// Quiet turns restore sanity: not staring, and no sanity lost this turn.
/** Seal or open a doorway from the panel. Sealed doors are steel: nothing passes or sees through but SCP-106. */
export const MAX_SEALED = 2;
export function toggleDoor(x: number, y: number, flash: (t: string) => void) {
  const u = S.selected, i = y * L.W + x;
  if (!u || !L.doors.has(i)) { flash("Click a doorway."); return; }
  if (S.lockedDoors.includes(i)) {
    S.lockedDoors = S.lockedDoors.filter(d => d !== i); L.grid[y][x] = FLOOR;
    log(`${full(u)} opens the blast door in the ${area(x, y)}.`, "key");
  } else {
    if (S.lockedDoors.length >= MAX_SEALED) { flash(`Only ${MAX_SEALED} doors can be sealed at once. Open one first.`); return; }
    if (S.units.some(v => v.alive && !v.saved && v.x === x && v.y === y)) { flash("Someone is standing in the doorway."); return; }
    S.lockedDoors.push(i); L.grid[y][x] = STEEL;
    log(`${full(u)} seals the blast door in the ${area(x, y)}.`, "key");
  }
  u.ap -= 1; S.mode = null;
  afterAction();
}

function recoverSanity() {
  if (S.siren) return;   // nobody settles down with the alarm going
  for (const m of team()) {
    if (m.staring || m.lostSanTurn === S.turn) continue;
    m.san = Math.min(maxSanOf(m), m.san + prof(m).recover + (m.side === "mtf" ? S.setup.mods.recoverBonus : 0));
  }
}

export async function endTurn() {
  if (!canAct()) return;
  S.busy = true; S.pending = null; S.mode = null;
  S.phase = "anomaly"; hooks.update();
  await anomalyPhase();
  if (checkEnd()) { S.busy = false; return; }
  S.phase = "hand"; hooks.update();
  await raiderPhase(checkEnd);
  if (checkEnd()) { S.busy = false; return; }
  S.phase = "subjects"; hooks.update();
  await subjectPhase();
  if (checkEnd()) { S.busy = false; return; }
  // fire burns, the flesh grows, and anyone left standing on it is infected
  await firePhase();
  if (checkEnd()) { S.busy = false; return; }
  spreadFlesh();
  fleshContact();
  recoverSanity();
  reinforcementsTick();
  S.turn++;
  S.busy = false;
  startPlayerTurn(false);
}

async function anomalyPhase() {
  if (S.has049 && !S.debug?.freeze173) await plaguePhase();
  if (S.has106 && !S.debug?.freeze173) await oldManPhase();
  await zombiePhase();
  if (!S.has173 || S.sealed || S.debug?.freeze173) return;
  for (const m of starers()) { loseSanity(m, prof(m).drain, "sight"); reveal("mind"); }
  insurgentsStare();
  computeVis();
  const blinked = rollBlinks();
  const ss = starers(), holders = ss.filter(m => !blinked.has(m));
  for (const m of ss) { m.streak = blinked.has(m) ? 0 : (m.streak ?? 0) + 1; m.bestStreak = Math.max(m.bestStreak ?? 0, m.streak); }
  if (ss.length && !holders.length) {
    log(ss.length > 1 ? "Everyone staring blinked at the same moment." : `${label(ss[0])} blinked.`, "bad");
    reveal("blink");
  }
  if (!(await release(blinked))) {
    if (holders.length) log(`SCP-173 held by ${holders.map(label).join(", ")}.`);
    else if (seen(S.statue.x, S.statue.y)) log("SCP-173 stayed put. Someone else still has eyes on it.");
    await sleep(250);
  }
}

/** Witnesses still out there: not dosed, not gone, not dead. */
export const looseWitnesses = () => S.units.filter(u => u.witness && u.alive && !u.saved && !u.dosed);

export const ESCORT_TURNS = 8;
export function checkEnd() {
  if (S.over) return true;
  const k = S.setup.kind;
  if ((k === "breach" || k === "manhunt") && S.sealed) { finish(true, false); return true; }
  if (k === "coverup" && !looseWitnesses().length) {
    // the job is done once nobody is left to dose; it counts as a success if at least half were dosed
    const w = S.units.filter(u => u.witness);
    finish(w.filter(u => u.dosed).length * 2 >= w.length, false); return true;
  }
  if ((k === "strike" || k === "retaliation") && !alive("raider").length) { finish(true, false); return true; }
  // a lost team: over once nobody is left out there to bring home
  if (k === "rescue") {
    const lost = S.units.filter(u => u.researcher), out = lost.filter(u => u.alive && u.saved).length;
    if (!lost.some(u => u.alive && !u.saved)) { finish(out > 0, false); return true; }
  }
  // another site's emergency: done when everything is done, or when the team has pulled out with what it could
  if (k === "emergency") {
    const people = S.units.filter(u => u.researcher), records = S.units.filter(u => u.record);
    const all = !people.some(u => u.alive && !u.saved) && !records.some(u => !u.saved) && !!S.powerOn && hazardDealt();
    const score = people.filter(u => u.alive && u.saved).length + records.filter(u => u.saved).length + (S.powerOn ? 1 : 0) + (hazardDealt() ? 1 : 0);
    if (all) { finish(true, false); return true; }
    if (!alive("mtf").length && !S.reinforce.length) { finish(score > 0, false); return true; }
  }
  if (k === "outbreak" && S.core && S.core.hp <= 0) { finish(true, false); return true; }
  if (k === "riot" && !S.units.some(u => u.rioter && u.alive && !u.downed && u.side === "zombie")) { finish(true, false); return true; }
  if (k === "raid") {
    if (S.stolen) { finish(false, false); return true; }
    if (!alive("raider").length || (S.turn >= RAID_TURNS && S.phase === "subjects")) { finish(true, false); return true; }
  }
  if (k === "escort") {
    if (S.stolen) { finish(false, false); return true; }
    if (!alive("raider").length || (S.turn >= ESCORT_TURNS && S.phase === "subjects")) { finish(true, false); return true; }
  }
  if (S.escaped && k === "emergency") { if (S.statue.alive) { S.statue.alive = false; log("SCP-173 is out through the hatch and gone from this site. The rest of the job still stands.", "bad"); } }
  else if (S.escaped) { finish(false, false); return true; }
  // nobody left on the map: either everyone got out through an exit, or nobody is left at all
  if (!alive("mtf").length && !S.reinforce.length) { finish(false, S.units.some(u => u.side === "mtf" && u.saved && u.alive)); return true; }
  return false;
}

export function evacuate() {
  if (!canAct()) return;
  const left = alive("mtf").length;
  log(`The mission is called off.${left ? ` ${left} still inside ${left > 1 ? "are" : "is"} left behind.` : ""}`, "bad");
  finish(false, true);
}

const st173name = () => S.statue.name;

// ---------- debug menu hooks ----------
function debugTap(x: number, y: number) {
  const d = S.debug!;
  if (d.place173) {
    if (!passable(x, y) || S.units.some(u => u.alive && !u.saved && u !== S.statue && u.x === x && u.y === y)) return;
    S.statue.x = x; S.statue.y = y; d.place173 = false;
    log("Debug: SCP-173 moved.", "key");
  } else if (d.kill) {
    const u = S.units.find(v => v.alive && !v.saved && v.x === x && v.y === y && v !== S.statue);
    if (!u) return;
    kill(u); d.kill = false;
    log(`Debug: ${u.name} killed.`, "key");
  }
  computeVis();
  if (!checkEnd()) hooks.update();
}
export function debugFinish(win: boolean) { if (!S.over) finish(win, false); }
export function debugArrive() {
  for (const r of S.reinforce) r.turn = S.turn;
  arrivals(false);
  for (const m of team()) if (m.ap === 0 && !isPanicked(m)) m.ap = m.staring ? 1 : 2;
  computeVis(); hooks.update();
}
export function debugAfter() { computeVis(); if (!checkEnd()) hooks.update(); }

function finish(win: boolean, evacuated: boolean) {
  S.over = true; S.phase = "over";
  S.result = missionResult(win, evacuated);
  log(win ? "Incident closed." : evacuated ? "The team has evacuated." : S.escaped ? "SCP-173 is outside Site-19." : "Incident open. Nobody is left to respond.", win ? "good" : "bad");
  hooks.update();
  hooks.finished(S.result);
}
