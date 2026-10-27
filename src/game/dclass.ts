// D-Class who are loose in the wing run for the exit; operatives can bring them into the work detail.
import { DIRS, L, canStep, cheb } from "../core/grid";
import { moveUnit } from "./combat";
import { S, alive, computeVis, hooks, log, occupied } from "./state";

export async function subjectPhase() {
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
