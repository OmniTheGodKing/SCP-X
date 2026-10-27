// How perks and traits change things during a mission.
import { R, cheb } from "../core/grid";
import type { PerkId, Unit } from "./types";

export const hasPerk = (u: Unit | null | undefined, p: PerkId) => !!u?.perks?.includes(p);
export const hasTrait = (u: Unit, t: NonNullable<Unit["traits"]>[number]) => !!u.traits?.includes(t);
export const rangeOf = (u: Unit) => R + (hasPerk(u, "keen_eyes") ? 3 : 0);
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
  return Math.round(n * m);
}
