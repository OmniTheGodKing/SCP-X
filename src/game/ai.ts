// Enemy tactics (Tactical overhaul T5): a utility AI on the same rules as the player. Each Insurgent weighs where to
// stand and what to do by asking the real rules (shotInfo, canShoot, the perception model, cover off the line of
// fire, overwatch lanes), and acts only on what its side has made out: team members it can see now, where it last saw
// them, and what it heard. Roles change the weights; a pod coordinator hands one member the job of suppressing while
// the others work round the flank. The aim is sensible, readable behaviour, not perfect play: there is a little
// seeded randomness, and the weights are plain numbers in AI_WEIGHTS.
import { L, cheb, pathTo, tileAt, HALF } from "../core/grid";
import { coverOn } from "../core/geom";
import { rnd } from "../core/rng";
import { payFire, payOverwatch, payReload } from "./actions";
import { canShoot, fire, moveUnit, shotInfo, suppress } from "./combat";
import { blast, blastArea } from "./explosive";
import { moveOf, reachOf } from "./movement";
import { S, alive, canSee, isPanicked, log, seen, team } from "./state";
import type { Unit } from "./types";

export interface Spot { x: number; y: number }
/** A team member as the Insurgents know it: the unit itself if someone on their side can see it now. */
export interface Threat { x: number; y: number; u: Unit | null }

export const AI_WEIGHTS = {
  /** per point of expected damage they can deal from a spot (with an action left to shoot) */
  offense: 9,
  /** per expected hit they would take there from team members who could shoot that spot */
  risk: 22,
  /** per point of cover against the threats they only remember */
  rememberedCover: 0.25,
  /** flanking the pod's focus target */
  flank: 14,
  /** per tile off the distance their role likes */
  distance: 1.4,
  /** per ally within a tile (grenade bait) */
  clump: 5,
  /** per team member on overwatch who would see them get there */
  overwatchLane: 14,
  /** randomness, so they aren't perfectly predictable */
  jitter: 3,
};
/** The distance each role likes to fight at, in tiles. */
export const ROLE_RANGE: Record<string, number> = { rifleman: 8, sniper: 15, demo: 5, officer: 10, commander: 12, flanker: 5 };
const avgDmg = (u: Unit) => u.gun ? (u.gun.dmg[0] + u.gun.dmg[1]) / 2 : 3;

/** What the Insurgents know of the team. */
export function threats(): Threat[] {
  const out: Threat[] = [], rs = alive("raider");
  for (const m of team()) {
    if (rs.some(r => !r.downed && (r.blindUntil ?? -1) < S.turn && canSee(r, m.x, m.y))) { S.mem.set("seen-" + m.id, { x: m.x, y: m.y, turn: S.turn }); out.push({ x: m.x, y: m.y, u: m }); continue; }
    const k = S.mem.get("seen-" + m.id);
    if (k && S.turn - k.turn <= 2) out.push({ x: k.x, y: k.y, u: null });
  }
  for (const [key, m] of S.mem) if (key.startsWith("heard-") && S.turn - m.turn <= 1) out.push({ x: m.x, y: m.y, u: null });
  return out;
}

/** With r standing on (x, y): what it could deal, what it would take, and how it sits against what it remembers. */
function standing(r: Unit, x: number, y: number, ts: Threat[], canAct: boolean) {
  const ox = r.x, oy = r.y, oe = r.exposed;
  r.x = x; r.y = y; r.exposed = undefined;
  let offense = 0, incoming = 0, best: { t: Unit; chance: number } | null = null, coverMin = 40;
  for (const t of ts) {
    if (t.u) {
      if (canShoot(t.u, r)) incoming += shotInfo(t.u, r).chance / 100;
      if (canAct && canShoot(r, t.u)) {
        const s = shotInfo(r, t.u), ev = s.chance / 100 * avgDmg(r) * (1 + s.crit / 200) + (t.u.hp <= avgDmg(r) ? 1.5 * s.chance / 100 : 0);
        if (ev > offense) { offense = ev; best = { t: t.u, chance: s.chance }; }
      }
    } else coverMin = Math.min(coverMin, coverOn(x, y, t.x, t.y).value);
  }
  r.x = ox; r.y = oy; r.exposed = oe;
  return { offense, incoming, best, cover: ts.some(t => !t.u) ? coverMin : 0 };
}

/** Team members on overwatch who would see someone arriving at (x, y). */
const overwatchers = (x: number, y: number) => team().filter(m => m.overwatch && !isPanicked(m) && canSee(m, x, y)).length;

export interface Plan { focus?: string; suppressor?: string; flankers: string[] }
/** The pod coordinator: the hardest team member to hit is the focus; a machine gunner or officer (or the first
 *  member) suppresses it while the rest try to flank it. Only for pods of two or more that can see someone. */
export function planPod(pod: Unit[], ts: Threat[]): Plan {
  const plan: Plan = { flankers: [] };
  const seenNow = ts.filter(t => t.u).map(t => t.u!);
  if (pod.length < 2 || !seenNow.length) return plan;
  // the focus: the visible team member best protected against the pod
  let focus: Unit | null = null, bestCover = -1;
  for (const m of seenNow) { const c = Math.max(...pod.map(r => coverOn(m.x, m.y, r.x, r.y).value)); if (c > bestCover) { bestCover = c; focus = m; } }
  if (!focus || bestCover < 20) return plan;
  plan.focus = focus.id;
  const sup = pod.find(r => r.gun?.type === "mg" && (r.gun.ammo ?? 0) >= 2) ?? pod.find(r => r.role === "officer" && (r.gun?.ammo ?? 0) >= 2) ?? pod.find(r => (r.gun?.ammo ?? 0) >= 2 && canSee(r, focus!.x, focus!.y));
  if (sup && canShoot(sup, focus)) plan.suppressor = sup.id;
  plan.flankers = pod.filter(r => r.id !== plan.suppressor && r.role !== "sniper").map(r => r.id);
  return plan;
}

/** Score every tile r can reach this action; returns the best and how the current tile scores. */
function bestPosition(r: Unit, ts: Threat[], plan: Plan, goal: ((x: number, y: number) => number) | null, steps: number) {
  const res = reachOf(r, steps);
  const actsAfter = r.ap - (steps > moveOf(r) ? 2 : 1) > 0;
  const focus = plan.focus ? team().find(m => m.id === plan.focus) : null;
  const desired = plan.flankers.includes(r.id) ? ROLE_RANGE.flanker : ROLE_RANGE[r.role ?? "rifleman"] ?? 8;
  const hurt = r.hp <= r.maxHp * 0.4;
  const st = S.statue;
  const score = (x: number, y: number, act: boolean) => {
    const s = standing(r, x, y, ts, act);
    let v = s.offense * AI_WEIGHTS.offense * (hurt ? 0.5 : 1) - s.incoming * AI_WEIGHTS.risk * (hurt ? 2 : 1) + s.cover * AI_WEIGHTS.rememberedCover;
    if (ts.length) { const d = Math.min(...ts.map(t => Math.hypot(t.x - x, t.y - y))); v -= Math.abs(d - desired) * AI_WEIGHTS.distance; }
    if (focus && plan.flankers.includes(r.id) && coverOn(focus.x, focus.y, x, y).value === 0 && canSeeFrom(r, x, y, focus)) v += AI_WEIGHTS.flank;
    v -= alive("raider").filter(o => o !== r && cheb(o.x, o.y, x, y) <= 1).length * AI_WEIGHTS.clump;
    if (x !== r.x || y !== r.y) v -= overwatchers(x, y) * AI_WEIGHTS.overwatchLane;
    if (!S.sealed && st.alive && cheb(st.x, st.y, x, y) <= 2) v -= 40;
    if (goal) v -= goal(x, y);
    return { v: v + rnd() * AI_WEIGHTS.jitter, s };
  };
  const here = score(r.x, r.y, r.ap > 0);
  let best = { x: r.x, y: r.y, ...here };
  for (let i = 0; i < L.W * L.H; i++) {
    if (res.dist[i] <= 0) continue;
    const x = i % L.W, y = (i / L.W) | 0;
    if (tileAt(x, y) === HALF) continue;
    const c = score(x, y, actsAfter);
    if (c.v > best.v) best = { x, y, ...c };
  }
  return { here, best, path: best.x === r.x && best.y === r.y ? null : pathTo(res, best.x, best.y) };
}
/** Scamper (XCOM): the best spot within one move, for an Insurgent just alerted (nothing to shoot with after). */
export function scamperPath(r: Unit, ts: Threat[], goal: ((x: number, y: number) => number) | null) {
  const ap = r.ap; r.ap = 1;
  const p = bestPosition(r, ts, { flankers: [] }, goal, moveOf(r));
  r.ap = ap;
  return p.path;
}
/** Could r, standing at (x, y), see the target? (The same perception the team uses.) */
function canSeeFrom(r: Unit, x: number, y: number, t: Unit) {
  const ox = r.x, oy = r.y; r.x = x; r.y = y;
  const ok = canSee(r, t.x, t.y);
  r.x = ox; r.y = oy;
  return ok;
}

/** Where a grenade would do the most: at least two team members in the blast, or one in cover the blast would strip. */
function grenadeTarget(r: Unit): { x: number; y: number; value: number } | null {
  const frag = r.items?.find(i => i.id === "frag" && i.uses > 0);
  if (!frag) return null;
  let best: { x: number; y: number; value: number } | null = null;
  for (const m of team()) {
    if (!canSee(r, m.x, m.y) || Math.hypot(m.x - r.x, m.y - r.y) > 8) continue;
    for (const [cx, cy] of [[m.x, m.y], ...blastArea(m.x, m.y)]) {
      if (!canSee(r, cx, cy) || Math.hypot(cx - r.x, cy - r.y) > 8) continue;
      const area = blastArea(cx, cy);
      if (area.some(([a, b]) => S.units.some(u => u.side === "raider" && u.alive && u.x === a && u.y === b))) continue;
      const hit = team().filter(t => area.some(([a, b]) => a === t.x && b === t.y));
      const inCover = hit.filter(t => coverOn(t.x, t.y, r.x, r.y).value > 0).length;
      const value = hit.length * 3 + inCover * 2;
      if (hit.length >= 2 || (hit.length === 1 && inCover && rnd() < 0.5)) if (!best || value > best.value) best = { x: cx, y: cy, value };
    }
  }
  return best;
}

/**
 * One Insurgent's turn of fighting (mission goals are handled by the caller first). It keeps going while it has
 * actions: reload if it must, throw a grenade at a cluster, suppress if the pod asked it to, shoot if the shot is good
 * enough from where it stands, otherwise move to the best place it can reach and look again, or overwatch, or hunker.
 */
export async function tacticalTurn(r: Unit, plan: Plan, goal: ((x: number, y: number) => number) | null, checkEnd: () => boolean): Promise<void> {
  for (let guard = 0; guard < 4 && r.ap > 0 && r.alive && !r.downed; guard++) {
    const ts = threats();
    const suppressed = (r.suppressedUntil ?? -1) >= S.turn;
    // empty: reload, unless it's badly exposed where it is and can move first
    if (r.gun && r.gun.ammo < 1) {
      const here = standing(r, r.x, r.y, ts, false);
      if (r.ap >= 2 && here.incoming > 0.6 && !suppressed) {
        const p = bestPosition(r, ts, plan, goal, moveOf(r));
        if (p.path?.length) { r.ap -= 1; await moveUnit(r, p.path); if (checkEnd()) return; continue; }
      }
      payReload(r); if (seen(r.x, r.y)) log(`An Insurgent reloads their ${r.gun.name}.`);
      continue;
    }
    // a grenade at a cluster (or at someone dug in), if it carries one
    const g = grenadeTarget(r);
    if (g && g.value >= 6) {
      const frag = r.items!.find(i => i.id === "frag" && i.uses > 0)!;
      frag.uses--; r.ap = 0; blast(r, g.x, g.y, "frag"); return;
    }
    // the pod's suppressor pins the focus so the others can move
    if (plan.suppressor === r.id && plan.focus && (r.gun?.ammo ?? 0) >= 2) {
      const focus = team().find(m => m.id === plan.focus);
      if (focus && canShoot(r, focus) && (focus.suppressedUntil ?? -1) < S.turn) {
        r.ap = 0; suppress(r, [focus]);
        if (seen(r.x, r.y) || seen(focus.x, focus.y)) log(`${r.name} lays down suppressing fire on ${focus.call || focus.name}.`, "bad");
        return;
      }
    }
    const here = standing(r, r.x, r.y, ts, true);
    const shoot = async () => { const t = here.best!.t; payFire(r); await fire(r, t, false); };
    // a good shot from here: take it (with only one action left, a fair one will do)
    if (here.best && (here.best.chance >= 55 || (r.ap === 1 && here.best.chance >= 30) || (suppressed && here.best.chance >= 20))) {
      // ...unless one move would get a much better shot and still leave an action to take it
      if (r.ap >= 2 && !suppressed && here.best.chance < 70) {
        const p = bestPosition(r, ts, plan, goal, moveOf(r));
        if (p.path?.length && p.best.s.best && p.best.s.best.chance >= here.best.chance + 20 && p.best.v > p.here.v + 8) { r.ap -= 1; await moveUnit(r, p.path); if (checkEnd()) return; continue; }
      }
      await shoot(); return;
    }
    // moving under suppression draws fire: stay put and shoot back, or hunker
    if (suppressed) {
      if (here.best && here.best.chance >= 15) { await shoot(); return; }
      r.hunkerUntil = S.turn + 1; r.ap = 0; if (seen(r.x, r.y)) log(`${r.name} keeps their head down.`); return;
    }
    // move somewhere better (a dash when nothing is in reach and the goal or the enemy is far)
    const dash = r.ap >= 2 && !ts.some(t => t.u) && !plan.focus;
    const p = bestPosition(r, ts, plan, goal, dash ? moveOf(r) * 2 : moveOf(r));
    if (p.path?.length && p.best.v > p.here.v + 2) {
      r.ap -= dash && p.path.length > moveOf(r) ? 2 : 1;
      await moveUnit(r, p.path);
      if (checkEnd()) return;
      continue;
    }
    // nothing better to do: a fair shot, else watch the approaches, else get down
    if (here.best && here.best.chance >= 25) { await shoot(); return; }
    if (r.gun && r.gun.ammo >= 1 && (ts.length || r.role === "sniper")) { payOverwatch(r); if (seen(r.x, r.y)) log(`${r.name} settles in on overwatch.`, "bad"); return; }
    if (here.incoming > 0.3) { r.hunkerUntil = S.turn + 1; r.ap = 0; return; }
    return;
  }
}
