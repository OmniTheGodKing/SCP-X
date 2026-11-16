// Line of sight and line of fire. Since the tactical overhaul (T1) these are thin wrappers over the geometry kernel
// in geom.ts: one obstacle model, one trace, one set of eye points (own tile plus XCOM-style step-outs) and one
// measure of how much of a target is exposed. Sight and fire differ only in what stops them (smoke stops sight,
// reinforced glass stops bullets).
import { BODY, FIRE, SIGHT, VIS_MIN, bestView as kernelView, exposure, eyePoints, trace, type View } from "./geom";
import { L, WINDOW, tileAt } from "./grid";

export { setSmoke, smoky } from "./geom";
export type { View } from "./geom";

/** The longest anyone sees in clear daylight. Night, weather and (T3) light shorten what can be made out. */
export const SIGHT_MAX = 60;
/** A target needs at least this share of its body in view to be seen or shot. */
export const MIN_SIGHT = VIS_MIN;

/** Line of fire from one tile's centre to another's: walls, shut doors, partitions and reinforced glass stop it,
 *  smoke doesn't. Returns null if blocked, or the panes of ordinary glass the shot passes through (they shatter). */
export function fireLine(ax: number, ay: number, bx: number, by: number): [number, number][] | null {
  const glass: [number, number][] = [];
  const ok = trace(ax + .5, ay + .5, bx + .5, by + .5, FIRE, c => { if (tileAt(c.x, c.y) === WINDOW) glass.push([c.x, c.y]); });
  return ok ? glass : null;
}

/** Share of a figure on (bx, by) visible from the centre of (ax, ay). */
export const visFrac = (ax: number, ay: number, bx: number, by: number) => exposure(ax, ay, bx, by, SIGHT);

/** Where someone at (x, y) can look from toward (tx, ty): their own tile, plus step-outs. */
export const viewSpots = (x: number, y: number, tx = x, ty = y) => eyePoints(x, y, tx, ty);

/** Best view a person at (x, y) gets of a tile, stepping out if that helps. Null means no sight. */
export const bestView = (x: number, y: number, tx: number, ty: number, range = SIGHT_MAX, targetPeeks = false): View | null => kernelView(x, y, tx, ty, range, SIGHT, true, targetPeeks);
export const sightFrom = (x: number, y: number, tx: number, ty: number, range = SIGHT_MAX) => !!bestView(x, y, tx, ty, range);
/** Sight without stepping out, for things that don't peek round corners (SCP-173). */
export const rawSight = (x: number, y: number, tx: number, ty: number, range = SIGHT_MAX) => !!kernelView(x, y, tx, ty, range, SIGHT, false);
/** The best spot to fire from at (tx, ty): needs the target in view and a clear line of fire to enough of them. */
export const fireView = (x: number, y: number, tx: number, ty: number, range = SIGHT_MAX, targetPeeks = false): View | null => kernelView(x, y, tx, ty, range, FIRE, true, targetPeeks);
void BODY; void L;
