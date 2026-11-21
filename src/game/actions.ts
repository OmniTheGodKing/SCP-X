// The action economy (Tactical overhaul T2.3). Two actions a turn, as in XCOM 2. What each action costs, whether it
// ends the turn, and why it can't be taken right now, are decided here and nowhere else: the player's commands, the
// UI's buttons and the enemy AI all ask these functions, so they can't disagree.
import { hasPerk, spend, usesLeft } from "./perks";
import { log, full } from "./state";
import type { Unit } from "./types";

export type ActionId = "move" | "dash" | "fire" | "reload" | "overwatch" | "hunker" | "suppress" | "item" | "throw" | "ability" | "interact";
export interface ActionInfo { name: string; cost: string; endsTurn: string }
/** The rules as the player reads them (shown in the help panel and the lab). */
export const ACTIONS: Record<ActionId, ActionInfo> = {
  move:      { name: "Move", cost: "1 action, up to the move allowance (blue)", endsTurn: "no" },
  dash:      { name: "Dash", cost: "2 actions, up to twice the move allowance (amber)", endsTurn: "yes" },
  fire:      { name: "Fire", cost: "1 action with an SMG; both with a marksman rifle; otherwise firing ends the turn (Double tap: a second action once a mission)", endsTurn: "usually" },
  reload:    { name: "Reload", cost: "1 action", endsTurn: "no" },
  overwatch: { name: "Overwatch", cost: "1 action, and needs a loaded weapon", endsTurn: "yes" },
  hunker:    { name: "Hunker down", cost: "1 action, next to cover", endsTurn: "yes" },
  suppress:  { name: "Suppress", cost: "1 action and 2 rounds", endsTurn: "yes" },
  item:      { name: "Use an item", cost: "1 action", endsTurn: "no" },
  throw:     { name: "Throw", cost: "1 action", endsTurn: "yes" },
  ability:   { name: "Ability", cost: "as listed on the ability", endsTurn: "as listed" },
  interact:  { name: "Interact (doors, panels, objectives)", cost: "1 action", endsTurn: "as listed" },
};

export const hasActions = (u: Unit, n = 1) => u.ap >= n;
const noActions = (u: Unit, n = 1) => u.ap < n ? (n > 1 ? "Needs both actions." : "No actions left this turn.") : null;

/** Why this unit can't fire right now, or null. */
export function fireCheck(u: Unit): string | null {
  const why = noActions(u);
  if (why) return why;
  if (!u.gun) return null;
  if (u.gun.ammo < 1 && u.side !== "mtf") return "Out of ammo. Reload first (R).";
  if (u.gun.ammo >= 1 && u.gun.type === "marksman" && u.ap < 2) return "A marksman rifle takes both actions to fire.";
  return null;
}
/** Pay for a shot. An empty operative fires their sidearm, which ends the turn like any other shot. */
export function payFire(u: Unit) {
  if (u.gun && u.gun.ammo >= 1 && u.gun.type === "smg") { u.ap -= 1; return; }
  if (hasPerk(u, "double_tap") && u.ap >= 2 && u.gun?.type !== "marksman" && usesLeft(u, "double_tap", 1) > 0) { spend(u, "double_tap"); u.ap = 1; log(`${full(u)}: double tap.`, "key"); return; }
  u.ap = 0;
}
/** A melee or bayonet strike ends the turn. */
export const payStrike = (u: Unit) => { u.ap = 0; };

export function reloadCheck(u: Unit | null): string | null {
  if (!u || !u.gun) return "Select an operative.";
  if (u.gun.ammo >= u.gun.mag) return "Magazine is full.";
  return noActions(u);
}
export function payReload(u: Unit) { u.gun!.ammo = u.gun!.mag; u.ap -= 1; }

export function overwatchCheck(u: Unit): string | null {
  return noActions(u) ?? (u.eyesDown ? "They're looking at the floor." : u.gun && u.gun.ammo < 1 ? "Reload first: overwatch needs a loaded weapon." : null);
}
export function payOverwatch(u: Unit) {
  u.overwatch = true; u.ap = 0; u.overwatchShots = hasPerk(u, "rapid_reaction") ? 2 : 1;
}

/** Actions a move of d steps costs, given the unit's move allowance. */
export const moveActions = (allowance: number, d: number) => d <= allowance ? 1 : 2;
export function payMove(u: Unit, cost: number) { u.ap -= cost; }

/** Using an item: 1 action, and it ends the turn if the item says so. */
export function payItem(u: Unit, endsTurn: boolean) { u.ap = endsTurn ? 0 : u.ap - 1; }
/** An ability with its own cost table (abilities.ts). */
export function payAbility(u: Unit, cost: number, endsTurn: boolean) { u.ap = endsTurn ? 0 : u.ap - cost; }
/** Ends the unit's turn outright (overwatch-style stances, interactions that take everything). */
export const endUnitTurn = (u: Unit) => { u.ap = 0; };
