// Statuses (Tactical overhaul T4.4). Every timed or lasting condition a unit can be under, in one table: what it is,
// what it does, whether it's on, and how many turns are left. The unit panel and the lab list them from here, and the
// tests check them here. The numbers that drive them stay where the rule is applied (combat, abilities, the SCPs).
import { burning } from "./fire";
import { S } from "./state";
import type { Unit } from "./types";

export interface StatusDef { id: string; name: string; desc: string; on: (u: Unit) => boolean; left?: (u: Unit) => number }
const until = (n: number | undefined) => (n ?? -1) - S.turn + 1;
export const STATUSES: StatusDef[] = [
  { id: "overwatch", name: "Overwatch", desc: "Fires at the first hostile movement they make out.", on: u => !!u.overwatch },
  { id: "hunkered", name: "Hunkered down", desc: "Cover counts double.", on: u => (u.hunkerUntil ?? -1) >= S.turn, left: u => until(u.hunkerUntil) },
  { id: "suppressed", name: "Suppressed", desc: "−30 aim; moving draws a shot from whoever is suppressing them; no overwatch.", on: u => (u.suppressedUntil ?? -1) >= S.turn, left: u => until(u.suppressedUntil) },
  { id: "marked", name: "Marked", desc: "+15 aim for the team against them.", on: u => (u.markedUntil ?? -1) >= S.turn, left: u => until(u.markedUntil) },
  { id: "blinded", name: "Blinded", desc: "Can't see or fire.", on: u => (u.blindUntil ?? -1) >= S.turn, left: u => until(u.blindUntil) },
  { id: "panicked", name: "Panicked", desc: "Acts on their own, or not at all.", on: u => u.panicUntil >= S.turn, left: u => until(u.panicUntil) },
  { id: "staggered", name: "Staggered", desc: "Loses their next move.", on: u => (u.staggeredUntil ?? -1) >= S.turn, left: u => until(u.staggeredUntil) },
  { id: "bleeding", name: "Bleeding out", desc: "Dies when the count runs out unless stabilised.", on: u => !!u.downed && u.bleed !== undefined, left: u => u.bleed ?? 0 },
  { id: "burning", name: "On fire", desc: "Takes fire damage at the end of the turn.", on: u => u.alive && burning(u.x, u.y) },
  { id: "exposed", name: "Exposed", desc: "Stepped out to fire: can be shot at that spot until their next turn.", on: u => !!u.exposed && u.exposed.turn >= S.turn - 1 },
];
export const statusesOf = (u: Unit) => STATUSES.filter(s => s.on(u));
