// Movement rules shared by the team and the enemy AI (Tactical overhaul T2.2). One move allowance, one way of saying
// who may path where, and one reach calculation, so the blue and amber tiles the player sees and the moves the AI
// weighs come from the same rules.
import { HALF, L, bfs, tileAt, type PathOpts, type Reach } from "../core/grid";
import { TYPES } from "../data/weapons";
import { hasPerk } from "./perks";
import { prof } from "./profiles";
import { S, isTeam } from "./state";
import type { Unit } from "./types";

/** Tiles one action of movement covers. A dash (both actions) covers twice this. */
export const moveOf = (u: Unit) => Math.max(1, prof(u).move + (u.gun ? TYPES[u.gun.type].move : 0) + (u.moveBonus ?? 0) - (u.carrying ? 1 : 0) - (S.setup.weather === "snow" ? 1 : 0));
/** Actions a move of d steps costs: 1 within the move allowance, 2 beyond it (a dash). */
export const moveCost = (u: Unit, d: number) => d <= moveOf(u) ? 1 : 2;

/** How this unit paths: Bulldozer breachers vault desks, the team works closed lifts, SCP-106's rot slows everyone. */
export const pathOpts = (u: Unit): PathOpts => ({ vault: hasPerk(u, "bulldozer"), links: isTeam(u), slow: S.corroded });

/** Units of the same side may pass through each other (a squadmate in a doorway doesn't seal it); nobody passes
 *  through anyone else. */
const sameSide = (a: Unit, b: Unit) => (isTeam(a) && isTeam(b)) || a.side === b.side;
export const blockerFor = (u: Unit) => (x: number, y: number) =>
  S.units.some(o => o !== u && o.alive && !o.saved && !o.carriedBy && o.x === x && o.y === y && !sameSide(u, o));

/**
 * Where this unit can get to within `steps` steps (default: everything its remaining actions allow), with the end-tile
 * rules applied: nobody ends a move on someone else's tile or standing on a desk. Such tiles keep a negative distance
 * (they can be walked through, not stopped on). `extra` adds a further blocking rule (SCP-173 starers must keep it in
 * sight on every step).
 */
export function reachOf(u: Unit, steps = u.ap * moveOf(u), extra?: (x: number, y: number) => boolean): Reach {
  const block = blockerFor(u);
  const res = bfs([[u.x, u.y]], steps, extra ? (x, y) => block(x, y) || extra(x, y) : block, pathOpts(u));
  for (let i = 0; i < res.dist.length; i++) {
    if (res.dist[i] <= 0) continue;
    const x = i % L.W, y = (i / L.W) | 0;
    if (S.units.some(o => o !== u && o.alive && !o.saved && !o.carriedBy && o.x === x && o.y === y) || tileAt(x, y) === HALF) res.dist[i] = -res.dist[i] - 100;
  }
  return res;
}
