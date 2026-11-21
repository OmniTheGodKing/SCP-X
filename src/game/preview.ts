// What the move cursor shows (Tactical overhaul T6.3), computed by the rules themselves with the unit placed at the
// destination: who could shoot them there, which of those flank them, the cover on each side, and the first tile on
// the way where an Insurgent on overwatch would get a shot. The renderer draws this; the tests check it against the
// same rules, so the preview can't drift from what happens.
import { coverSides } from "../core/geom";
import type { Pt } from "../core/grid";
import { canShoot, coverAgainst } from "./combat";
import { S, canSee, seen } from "./state";
import type { Unit } from "./types";

export interface MovePreview { threats: Unit[]; flankedBy: Unit[]; sides: [number, number, number, number]; lane: Pt | null }
export function movePreview(u: Unit, x: number, y: number, path: Pt[]): MovePreview {
  const ox = u.x, oy = u.y, oe = u.exposed; u.exposed = undefined;
  const visible = S.units.filter(r => r.side === "raider" && r.alive && !r.downed && seen(r.x, r.y));
  let lane: Pt | null = null;
  for (const [px, py] of path) { u.x = px; u.y = py; if (visible.some(r => r.overwatch && canSee(r, px, py) && canShoot(r, u))) { lane = [px, py]; break; } }
  u.x = x; u.y = y;
  const threats = visible.filter(r => canShoot(r, u));
  const flankedBy = threats.filter(r => coverAgainst(x, y, r.x, r.y) === 0);
  u.x = ox; u.y = oy; u.exposed = oe;
  return { threats, flankedBy, sides: coverSides(x, y), lane };
}
