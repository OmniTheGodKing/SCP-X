// D-Class who are loose in the wing run for the exit; operatives can bring them into the work detail.
import { DIRS, L, canStep, cheb } from "../core/grid";
import { sightFrom } from "../core/sight";
import { moveUnit } from "./combat";
import { S, alive, computeVis, hooks, log, occupied, seen, team } from "./state";

// Civilians mill about until they spot the team or hear shooting, then run for the edge of
// the map. Witnesses who get away will talk. Dosed witnesses stay put.
async function civilianPhase() {
  for (const c of alive("civilian")) {
    if (c.dosed) continue;
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
      log(`${s.name} got out through the exit.`, "good");
    }
  }
  computeVis();
  hooks.update();
}

/** Loose D-Class join the work detail when an operative reaches them. */
export function recruitStrays() {
  for (const s of alive("subject")) {
    if (s.fled) continue;
    const by = alive("mtf").find(m => cheb(m.x, m.y, s.x, s.y) <= (m.perks?.includes("shepherd") ? 3 : 1));
    if (!by) continue;
    s.side = "dclass"; s.ap = 0; s.hadLos = false; s.joined = true;
    log(`${by.call} grabs ${s.name}, who joins the work detail.`, "good");
  }
}
