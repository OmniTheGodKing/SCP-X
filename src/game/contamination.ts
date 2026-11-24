// Phase 6: contamination, per tile, per person and per item. SCP-610's flesh is the dirty zone, together with residue
// that contaminated people track out of it. Anyone who walks on dirty ground or takes a blow from an instance through a
// sealed suit carries contamination on their suit and kit (infection is separate and still can't be undone). Residue on
// clean ground can take root while the core lives, so people walking out of the zone without a wash-down open new
// fronts. A staffed crossing (Quarantine), a decon sweep (Decontamination) washes people down; equipment isolation
// (Decontamination) bags dirty kit so it comes home for decon instead of being destroyed.
//
// On only where the campaign uses squads (setup.mtfRules) or the setup asks for it, so older missions play as before.
import { DIRS, L, cheb, passable, type Pt } from "../core/grid";
import { rnd } from "../core/rng";
import { S, full, log } from "./state";
import type { Unit } from "./types";

export const RESIDUE_ROOT = 0.2;
const idx = (x: number, y: number) => y * L.W + x;
export const contaminationOn = () => !!S && (!!S.setup.contamination || (!!S.setup.mtfRules && S.setup.kind === "outbreak"));
export const isDirty = (k: number) => !!S && (S.flesh.has(k) || !!S.residue?.has(k));
const carriesDirt = (u: Unit) => u.side === "mtf" || u.side === "dclass" || u.side === "civilian";

/** Someone picks up contamination: on their suit and every item of their own kit (not the squad's shared stock). */
export function contaminate(u: Unit, why: string) {
  if (!contaminationOn() || !carriesDirt(u) || u.flesh || u.record) return;
  const fresh = u.contaminated === undefined;
  u.contaminated ??= S.turn;
  for (const it of u.items ?? []) if (!it.shared && !it.bagged) it.dirty = true;
  if (fresh && u.side === "mtf") log(`${full(u)} is carrying contamination (${why}).`, "bad");
}
/** Washed down: the person is clean again (kit that is dirty stays dirty until bagged). */
export function wash(u: Unit, how: string) {
  if (u.contaminated === undefined) return false;
  u.contaminated = undefined;
  if (u.side === "mtf") log(`${full(u)} is washed down ${how}.`, "good");
  return true;
}

/** A crossing staffed this moment: its Quarantine operative still stands on it or beside it, able to work. */
export function crossingStaffed(k: number) {
  const id = S.crossings?.get(k);
  if (id === undefined) return false;
  const q = S.units.find(v => v.id === id);
  return !!q && q.alive && !q.downed && !q.saved && cheb(q.x, q.y, k % L.W, (k / L.W) | 0) <= 1;
}

/** Each step a unit takes. Dirty ground contaminates; a staffed crossing washes. */
export function stepHook(u: Unit, x: number, y: number) {
  if (!contaminationOn() || !carriesDirt(u)) return;
  const k = idx(x, y);
  if (S.crossings?.has(k) && crossingStaffed(k)) { wash(u, "at the staffed crossing"); return; }
  if (isDirty(k)) contaminate(u, "walked on contaminated ground");
  if (u.carrying) { const c = S.units.find(v => v.id === u.carrying); if (c && u.contaminated !== undefined) contaminate(c, "carried by someone contaminated"); }
}

/** The end of each turn: contaminated people on clean ground leave residue; residue takes root while the core lives. */
export function contaminationPhase() {
  if (!contaminationOn()) return;
  S.residue ??= new Set();
  for (const u of S.units) {
    if (!u.alive || u.saved || u.carriedBy || u.contaminated === undefined || !carriesDirt(u)) continue;
    const k = idx(u.x, u.y);
    if (!S.flesh.has(k) && !S.crossings?.has(k)) S.residue.add(k);
  }
  if (!S.core || S.core.hp <= 0) return;
  let rooted = 0;
  for (const k of [...S.residue]) {
    if (S.flesh.has(k)) { S.residue.delete(k); continue; }
    if ((S.cordon?.has(k)) || (S.firebreak?.get(k) ?? -1) >= S.turn) continue;
    const x = k % L.W, y = (k / L.W) | 0;
    if (S.units.some(u => u.alive && !u.saved && u.x === x && u.y === y)) continue;
    if (rnd() < RESIDUE_ROOT) { S.flesh.add(k); S.residue.delete(k); rooted++; }
  }
  if (rooted) log(`Tracked-out residue takes root: the flesh is growing in ${rooted} new place${rooted > 1 ? "s" : ""} outside the zone.`, "bad");
}
/** Burning clears residue (fire sterilises); flesh already has its own rules. */
export function burnResidue(k: number) { S.residue?.delete(k); }

/** Decon sweep on an area: residue is washed off the ground and people in it are washed down. */
export function deconArea(tiles: Pt[]) {
  let n = 0;
  for (const [x, y] of tiles) {
    if (S.residue?.delete(idx(x, y))) n++;
    for (const u of S.units.filter(v => v.alive && !v.saved && v.x === x && v.y === y)) if (wash(u, "by the decon sweep")) n++;
  }
  return n;
}

/** Controlled crossing: the tile the operative staffs (a cordon tile under or beside them). */
export function crossingTile(u: Unit): number | null {
  if (!S.cordon?.size) return null;
  const own = idx(u.x, u.y);
  if (S.cordon.has(own)) return own;
  for (const [dx, dy] of DIRS) { const k = idx(u.x + dx, u.y + dy); if (S.cordon.has(k) && passable(u.x + dx, u.y + dy)) return k; }
  return null;
}
export function openCrossing(u: Unit) {
  const k = crossingTile(u);
  if (k === null) return;
  (S.crossings ??= new Map()).set(k, u.id);
  // anyone already standing on it is washed at once
  for (const v of S.units.filter(w => w.alive && !w.saved && idx(w.x, w.y) === k)) wash(v, "at the crossing");
  log(`${full(u)} opens a staffed crossing in the line. Anyone who steps through it is washed down and comes out clean, while they hold it.`, "key");
}

/** Equipment isolation: who has dirty kit to bag, beside the operative (them included), standing on clean ground. */
export function isolationTargets(u: Unit): Unit[] {
  if (!contaminationOn() || isDirty(idx(u.x, u.y))) return [];
  return S.units.filter(v => v.side === "mtf" && v.alive && !v.saved && cheb(v.x, v.y, u.x, u.y) <= 1 && v.items?.some(i => i.dirty && !i.bagged && !i.shared));
}
export function isolateEquipment(u: Unit) {
  let n = 0;
  for (const v of isolationTargets(u)) for (const it of v.items ?? []) if (it.dirty && !it.bagged && !it.shared) { it.bagged = true; it.dirty = false; n++; }
  log(`${full(u)} bags ${n} contaminated item${n === 1 ? "" : "s"} at the clean line. ${n === 1 ? "It goes" : "They go"} home sealed for decon instead of into the incinerator.`, "good");
}

/** At the end of the mission: kit that comes home dirty is destroyed, and who comes out still carrying it. */
export function contaminationResult() {
  const lost: Record<string, number> = {};
  const people: string[] = [];
  if (!contaminationOn()) return { lost, people };
  for (const u of S.units) {
    if (u.side !== "mtf" || !u.opId || !u.alive) continue;
    for (const it of u.items ?? []) if (it.dirty && !it.shared && it.uses > 0) { lost[it.id] = (lost[it.id] ?? 0) + 1; it.uses = 0; }
    if (u.contaminated !== undefined && u.saved && u.infectedTurn === undefined) people.push(u.opId);
  }
  return { lost, people };
}
