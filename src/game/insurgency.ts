// Chaos Insurgency AI: hold SCP-173 with their eyes when they see it, fight from cover,
// and push toward the Foundation team.
import { L, bfs, cheb, pathTo } from "../core/grid";
import { sightFrom } from "../core/sight";
import { coverAgainst, fire, moveUnit, shotInfo } from "./combat";
import { prof } from "./profiles";
import { S, alive, canSee, isBlind, isPanicked, log, occupied, reveal, seen, team } from "./state";
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

export async function raiderPhase(checkEnd: () => boolean) {
  const rs = alive("raider");
  if (!rs.length) return;
  if (!S.raidersActive) {
    const t = team();
    const contact = rs.some(r => t.some(m => canSee(r, m.x, m.y)));
    if (contact || S.turn >= 3) {
      S.raidersActive = true;
      reveal("ci");
      log("Chaos Insurgency strike team moving in.", "bad");
    } else return;
  }
  for (const r of rs) {
    if (!r.alive || !alive("mtf").length || isPanicked(r)) continue;
    if (isBlind(r)) { if (seen(r.x, r.y)) log("A blinded Insurgent stumbles and can't fire."); continue; }
    r.ap = 2;
    await raiderAct(r);
    if (checkEnd()) return;
  }
}

async function raiderAct(r: Unit) {
  for (let guard = 0; guard < 4 && r.ap > 0 && r.alive; guard++) {
    const t = team();
    if (!t.length) return;
    let best: { m: Unit; s: ReturnType<typeof shotInfo>; score: number } | null = null;
    for (const m of t) if (canSee(r, m.x, m.y)) {
      const s = shotInfo(r, m);
      const score = s.chance + (m.side === "mtf" ? 10 : 0);
      if (!best || score > best.score) best = { m, s, score };
    }
    if (best && (best.s.chance >= 45 || (r.ap === 1 && best.s.chance >= 20))) { r.ap = 0; await fire(r, best.m, false); return; }

    const res = bfs([[r.x, r.y]], 5, (x, y) => occupied(x, y, r));
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
      if (!S.sealed && cheb(st.x, st.y, x, y) <= 2) sc -= 40;
      sc -= res.dist[i] * 0.5 + Math.random() * 3;
      if (sc > bestScore) { bestScore = sc; bestT = [x, y]; }
    }
    if (!bestT || (bestT[0] === r.x && bestT[1] === r.y)) {
      if (best && best.s.chance >= 20) { r.ap = 0; await fire(r, best.m, false); }
      return;
    }
    r.ap--;
    await moveUnit(r, pathTo(res, bestT[0], bestT[1]) || []);
  }
}
