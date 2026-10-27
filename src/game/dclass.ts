// D-Class who are loose in the wing run for the exit; operatives can bring them into the work detail.
import { DIRS, L, bfs, canStep, cheb, pathTo } from "../core/grid";
import type { Unit } from "./types";
import { sightFrom } from "../core/sight";
import { moveUnit } from "./combat";
import { S, alive, computeVis, hooks, log, occupied, seen, team } from "./state";

// Civilians mill about until they spot the team or hear shooting, then run for the edge of
// the map. Witnesses who get away will talk. Dosed witnesses stay put.
async function civilianPhase() {
  for (const c of alive("civilian")) {
    if (c.dosed || c.carriedBy || c.record) continue;
    if (c.researcher) { await researcherMove(c); continue; }
    if (!c.spooked && S.concealed) {
      // nobody has noticed the team yet: civilians go about their business
      const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)];
      if (Math.random() < 0.5 && canStep(c.x, c.y, dx, dy) && !occupied(c.x + dx, c.y + dy, c)) await moveUnit(c, [[c.x + dx, c.y + dy]]);
      continue;
    }
    if (!c.spooked) {
      const heard = [...S.mem.entries()].some(([k, m]) => (k.startsWith("shot-") || k.startsWith("bang-")) && m.turn === S.turn && cheb(m.x, m.y, c.x, c.y) <= 8);
      const spotted = team().some(m => m.side === "mtf" && sightFrom(c.x, c.y, m.x, m.y, 5));
      if (heard || spotted) {
        c.spooked = true;
        if (seen(c.x, c.y)) log(`${c.name} ${spotted ? "spots the team" : "hears gunfire"} and runs.`, c.witness ? "bad" : "");
      } else {
        const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)];
        if (Math.random() < 0.5 && canStep(c.x, c.y, dx, dy) && !occupied(c.x + dx, c.y + dy, c)) await moveUnit(c, [[c.x + dx, c.y + dy]]);
        continue;
      }
    }
    for (let step = 0; step < 3; step++) {
      const here = L.exitMap[c.y * L.W + c.x];
      if (here === 0) break;
      let nxt: [number, number] | null = null;
      for (const [dx, dy] of DIRS) {
        if (!canStep(c.x, c.y, dx, dy)) continue;
        const nx = c.x + dx, ny = c.y + dy, v = L.exitMap[ny * L.W + nx];
        if (v >= 0 && v < here && !occupied(nx, ny, c)) { nxt = [nx, ny]; break; }
      }
      if (!nxt) break;
      await moveUnit(c, [nxt]);
    }
    if (L.exitMap[c.y * L.W + c.x] === 0) {
      c.saved = true;
      log(c.witness ? `${c.name} got away. They'll be telling people what they saw.` : `${c.name} has left the area.`, c.witness ? "bad" : "");
    }
  }
}

export async function subjectPhase() {
  await civilianPhase();
  for (const s of alive("subject")) {
    for (let step = 0; step < 4; step++) {
      const here = L.exitMap[s.y * L.W + s.x];
      if (here === 0) break;
      let nxt: [number, number] | null = null;
      for (const [dx, dy] of DIRS) {
        if (!canStep(s.x, s.y, dx, dy)) continue;
        const nx = s.x + dx, ny = s.y + dy, v = L.exitMap[ny * L.W + nx];
        if (v >= 0 && v < here && !occupied(nx, ny, s)) { nxt = [nx, ny]; break; }
      }
      if (!nxt) break;
      await moveUnit(s, [nxt]);
    }
    if (L.exitMap[s.y * L.W + s.x] === 0) {
      s.saved = true; S.stats.escaped++;
      log(s.stray ? `${s.name} got out through the exit and is gone. An escaped D-Class will talk.` : `${s.name} got out through the exit.`, s.stray ? "bad" : "good");
    }
  }
  computeVis();
  hooks.update();
}

/** Researchers hiding in the wing start following the first operative or guard who reaches them. */
export function gatherResearchers() {
  for (const r of alive("civilian").filter(c => c.researcher && !c.followId)) {
    const by = alive("mtf").find(m => cheb(m.x, m.y, r.x, r.y) <= 1);
    if (!by) continue;
    r.followId = by.id;
    log(`${r.name} comes out of hiding and follows ${by.call === "SEC" ? `guard ${by.name}` : by.call}. Get them to an exit.`, "good");
  }
}
/** A researcher keeps close to whoever found them, and gets out the moment they reach an exit. */
async function researcherMove(r: Unit) {
  const lead = S.units.find(u => u.id === r.followId);
  if (!lead) return;
  if (!lead.alive || lead.downed) { r.followId = undefined; log(`${r.name} is on their own again and goes back into hiding.`, "bad"); return; }
  if (!lead.saved && cheb(lead.x, lead.y, r.x, r.y) > 1) {
    const goals = DIRS.map(([dx, dy]) => [lead.x + dx, lead.y + dy] as [number, number]).filter(([x, y]) => !occupied(x, y, r));
    const res = bfs([[r.x, r.y]], 6, (x, y) => occupied(x, y, r));
    const best = goals.map(g => ({ g, d: res.dist[g[1] * L.W + g[0]] })).filter(o => o.d > 0).sort((a, b) => a.d - b.d)[0];
    if (best) await moveUnit(r, pathTo(res, best.g[0], best.g[1]) || []);
  }
  if (L.exitMap[r.y * L.W + r.x] === 0 || (lead.saved && cheb(lead.x, lead.y, r.x, r.y) <= 2)) {
    r.saved = true;
    log(`${r.name} is out of the wing, safe.`, "good");
  }
}
