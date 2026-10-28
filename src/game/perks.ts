// How perks and traits change things during a mission.
import { WEATHER_SIGHT } from "../data/weather";
import { SIGHT_MAX } from "../core/sight";
import { S } from "./state";
import { L, cheb, floorOf } from "../core/grid";
import type { PerkId, Unit } from "./types";

export const hasPerk = (u: Unit | null | undefined, p: PerkId) => !!u?.perks?.includes(p);
export const hasTrait = (u: Unit, t: NonNullable<Unit["traits"]>[number]) => !!u.traits?.includes(t);
/** Phase 4I: in clear daylight anyone can see across the whole map; the dark and the weather set how far. */
export const NIGHT_SIGHT = 6;
/** Night and weather never cut sight below this many tiles. */
export const MIN_RANGE = 3;
export const rangeOf = (u: Unit) => {
  // Phase 4C: underground floors have no weather and no night
  if (S && L?.def.floors?.[floorOf(u.y)]?.under) return SIGHT_MAX;
  const w = S?.setup.weather ? WEATHER_SIGHT[S.setup.weather] ?? SIGHT_MAX : SIGHT_MAX;
  let r = Math.min(w, S?.setup.night ? NIGHT_SIGHT - (w < SIGHT_MAX ? 2 : 0) : SIGHT_MAX);
  if (r < SIGHT_MAX) r += (hasPerk(u, "keen_eyes") ? 3 : 0) + (u.side === "mtf" && S ? S.setup.mods.sightBonus ?? 0 : 0);
  return Math.max(MIN_RANGE, r);
};
export const usesLeft = (u: Unit, key: string, max: number) => max - (u.used?.[key] ?? 0);
export function spend(u: Unit, key: string) { u.used = u.used || {}; u.used[key] = (u.used[key] ?? 0) + 1; }

export type LossKind = "sight" | "witness" | "other";

/** Sanity actually lost: Iron will, Hardened, a Calm presence or a D-Class wrangler nearby all soften it. */
export function adjustLoss(u: Unit, n: number, kind: LossKind, allies: Unit[]) {
  let m = 1;
  if (kind !== "other" && hasPerk(u, "iron_will")) m *= 0.5;
  if (kind === "witness" && u.traits?.includes("hardened")) m *= 0.5;
  if (kind !== "other" && allies.some(a => a !== u && hasPerk(a, "calm_presence") && cheb(a.x, a.y, u.x, u.y) <= 4)) m *= 0.5;
  if (u.side === "dclass" && allies.some(a => hasPerk(a, "wrangler") && cheb(a.x, a.y, u.x, u.y) <= 3)) m *= 0.5;
  if (kind === "sight" && u.goggles) m *= 0.5;   // seen through Eta-10's goggles, it's only a picture
  return Math.round(n * m);
}
