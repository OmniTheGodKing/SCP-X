// Chaos Insurgency AI: hold SCP-173 with their eyes when they see it, fight from cover,
// and push toward the Foundation team.
import { L, area, bfs, cheb, nearContainer, pathTo } from "../core/grid";
import { sightFrom } from "../core/sight";
import { coverAgainst, fire, moveUnit, shotInfo } from "./combat";
import { prof } from "./profiles";
import { S, alive, breakConcealment, canSee, isBlind, isPanicked, log, occupied, reveal, seen, team } from "./state";
import type { Unit } from "./types";

/** Insurgents who see SCP-173 stare at it too, and crack the same way. */
export function insurgentsStare() {
  for (const r of alive("raider")) {
    if (isPanicked(r) || isBlind(r) || !canSee(r, S.statue.x, S.statue.y)) continue;
    r.san -= r.seen173 ? prof(r).drain : prof(r).firstSight + prof(r).drain;
    r.seen173 = true;
    if (r.san <= 0) {
      r.san = 30; r.panicUntil = S.turn + 1;
      if (seen(r.x, r.y)) log("An Insurgent can't hold SCP-173's gaze and covers their eyes.", "key");
    }
  }
}

/** How close an Insurgent who hasn't been alerted has to be to notice a concealed team. */
export const DETECT = 4;
const podOf = (r: Unit) => r.pod ?? 0;
export const podActive = (r: Unit) => S.activePods.includes(podOf(r));

/** Why this pod wakes up this turn, if it does. */
function alarm(pod: Unit[]): string | null {
  const t = team();
  for (const r of pod) for (const m of t)
    if (canSee(r, m.x, m.y) && (!S.concealed || cheb(r.x, r.y, m.x, m.y) <= DETECT)) return "spotted";
  if (pod.some(r => !r.alive || r.downed || r.hp < r.maxHp)) return "hit";
  const loud = [...S.mem.entries()].some(([k, m]) => (k.startsWith("shot-") || k.startsWith("bang-")) && m.turn === S.turn && pod.some(r => cheb(r.x, r.y, m.x, m.y) <= 8));
  if (loud) return "heard";
  if (S.setup.kind === "breach" && S.turn >= 3) return "arrived";
  return null;
}

/** Wake a pod: everyone in it dashes to cover at once (XCOM's scamper), which can trigger overwatch. */
export async function activatePod(pod: number, why: string) {
  if (S.activePods.includes(pod)) return;
  S.activePods.push(pod); S.raidersActive = true;
  const members = alive("raider").filter(r => podOf(r) === pod);
  if (why === "spotted" && S.concealed) breakConcealment("an Insurgent spotted the team");
  if (S.setup.kind === "breach") { reveal("ci"); log("Chaos Insurgency strike team moving in.", "bad"); }
  else if (members.some(r => seen(r.x, r.y))) log(`An Insurgency fire team is alerted${why === "heard" ? " by the noise" : why === "hit" ? " by the attack" : ""} and scrambles for cover.`, "bad");
  for (const r of members) {
    const spot = bestSpot(r, team());
    if (spot) await moveUnit(r, spot);
  }
}

/** During the player's turn: any pod that just saw the team, heard shots or was hit scrambles at once. */
export async function wakePods() {
  for (const pod of [...new Set(alive("raider").map(podOf))].filter(p => !S.activePods.includes(p))) {
    const why = alarm(S.units.filter(u => u.side === "raider" && podOf(u) === pod));
    if (why && why !== "arrived") await activatePod(pod, why);
  }
}

export async function raiderPhase(checkEnd: () => boolean) {
  const rs = alive("raider");
  if (!rs.length) return;
  // pods that haven't been alerted patrol their rooms, until something gives the team away
  for (const pod of [...new Set(rs.map(podOf))].filter(p => !S.activePods.includes(p))) {
    const members = rs.filter(r => podOf(r) === pod);
    const why = alarm(S.units.filter(u => u.side === "raider" && podOf(u) === pod));
    if (why) { await activatePod(pod, why); if (checkEnd()) return; continue; }
    for (const r of members) if (Math.random() < 0.4) {
      const res = bfs([[r.x, r.y]], 2, (x, y) => occupied(x, y, r));
      const opts: number[] = [];
      for (let i = 0; i < L.W * L.H; i++) if (res.dist[i] > 0 && area(i % L.W, (i / L.W) | 0) === area(r.x, r.y)) opts.push(i);
      if (opts.length) { const i = opts[Math.floor(Math.random() * opts.length)]; await moveUnit(r, pathTo(res, i % L.W, (i / L.W) | 0) || []); }
    }
    // a patrol that walks into the team's sight gives itself away next turn; one that sees the team now raises the alarm
    const late = alarm(S.units.filter(u => u.side === "raider" && podOf(u) === pod));
    if (late === "spotted") { await activatePod(pod, late); if (checkEnd()) return; }
  }
  for (const r of alive("raider")) {
    if (!podActive(r) || !r.alive || !alive("mtf").length || isPanicked(r)) continue;
    if (S.setup.kind === "escort" && nearContainer(r.x, r.y)) { workTruck(r); if (checkEnd()) return; continue; }
    if (isBlind(r)) { if (seen(r.x, r.y)) log("A blinded Insurgent stumbles and can't fire."); continue; }
    r.ap = 2;
    await raiderAct(r);
    if (checkEnd()) return;
  }
}

/** An Insurgent at the truck spends their turn forcing it; a second turn there and it's open. */
function workTruck(r: Unit) {
  if (r.stealTurn === S.turn - 1) { S.stolen = true; log("The Insurgents have the truck open. The anomaly is gone.", "bad"); return; }
  r.stealTurn = S.turn;
  log("An Insurgent is working the truck's door open. Stop them before next turn.", "bad");
}

/** The best place within reach to fight from: in cover, flanking if possible, at a middling distance. */
function bestSpot(r: Unit, t: Unit[]) {
  const res = bfs([[r.x, r.y]], 5, (x, y) => occupied(x, y, r));
  if (!t.length) return null;
  const md = bfs(t.map(m => [m.x, m.y] as [number, number]), 999).dist;
  const st = S.statue;
  let bestT: [number, number] | null = null, bestScore = -1e9;
  for (let i = 0; i < L.W * L.H; i++) {
    if (res.dist[i] < 0) continue;
    const x = i % L.W, y = (i / L.W) | 0;
    let sc = 0;
    const sees = t.filter(m => sightFrom(x, y, m.x, m.y));
    if (sees.length) {
      sc += 12 + Math.min(...sees.map(m => coverAgainst(x, y, m.x, m.y))) * 1.2;
      for (const m of sees) if (coverAgainst(m.x, m.y, x, y) === 0) sc += 18;
    }
    const pd = md[i] < 0 ? 40 : md[i];
    sc -= Math.abs(pd - 6) * 4;
    if (!S.sealed && st.alive && cheb(st.x, st.y, x, y) <= 2) sc -= 40;
    // on an escort, the truck is what they came for
    if (S.setup.kind === "escort") sc -= Math.min(...L.contTiles.map(([cx, cy]) => cheb(cx, cy, x, y))) * 7;
    sc -= res.dist[i] * 0.5 + Math.random() * 3;
    if (sc > bestScore) { bestScore = sc; bestT = [x, y]; }
  }
  if (!bestT || (bestT[0] === r.x && bestT[1] === r.y)) return null;
  return pathTo(res, bestT[0], bestT[1]) || null;
}

async function raiderAct(r: Unit) {
  for (let guard = 0; guard < 4 && r.ap > 0 && r.alive; guard++) {
    const t = team();
    if (!t.length) return;
    if (r.gun && r.gun.ammo < 1) { r.gun.ammo = r.gun.mag; r.ap--; if (seen(r.x, r.y)) log(`An Insurgent reloads their ${r.gun.name}.`); continue; }
    let best: { m: Unit; s: ReturnType<typeof shotInfo>; score: number } | null = null;
    // in a retaliation, the locals are targets too
    const targets = S.setup.kind === "retaliation" ? [...t, ...alive("civilian")] : t;
    for (const m of targets) if (canSee(r, m.x, m.y)) {
      const s = shotInfo(r, m);
      const score = s.chance + (m.side === "mtf" ? 10 : 0) - (m.side === "civilian" ? 15 : 0);
      if (!best || score > best.score) best = { m, s, score };
    }
    if (best && (best.s.chance >= 45 || (r.ap === 1 && best.s.chance >= 20))) { r.ap = 0; await fire(r, best.m, false); return; }
    const path = bestSpot(r, t);
    if (!path) {
      if (best && best.s.chance >= 20) { r.ap = 0; await fire(r, best.m, false); }
      return;
    }
    r.ap--;
    await moveUnit(r, path);
  }
}
