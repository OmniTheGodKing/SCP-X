import type { Unit } from "./types";

export interface Profile {
  maxSan: number;
  blinkFull: number;   // blink chance at full sanity
  blinkZero: number;   // blink chance at zero sanity
  drain: number;       // sanity lost per turn of staring
  firstSight: number;  // one-time sanity hit on first seeing SCP-173
  witness: number;     // sanity lost on seeing someone killed
  move: number;        // tiles per action
  drag: number;        // tiles SCP-173 can be dragged per turn
  recover: number;     // sanity regained per quiet turn
}

// D-Class stare worse than operatives: they blink more and wear down faster.
export const PROFILE: Record<"mtf" | "dclass" | "raider", Profile> = {
  mtf:    { maxSan: 100, blinkFull: 0.10, blinkZero: 0.50, drain: 8,  firstSight: 10, witness: 15, move: 5, drag: 1, recover: 5 },
  dclass: { maxSan: 90,  blinkFull: 0.15, blinkZero: 0.60, drain: 10, firstSight: 12, witness: 20, move: 4, drag: 2, recover: 4 },
  raider: { maxSan: 60,  blinkFull: 0.18, blinkZero: 0.60, drain: 12, firstSight: 15, witness: 10, move: 5, drag: 0, recover: 0 },
};
/** D-Class running for the exit on their own. */
export const STRAY_BLINK = 0.25;

export const prof = (u: Unit): Profile =>
  u.side === "mtf" ? PROFILE.mtf : u.side === "raider" ? PROFILE.raider : PROFILE.dclass;
export const maxSanOf = (u: Unit) => u.maxSan ?? prof(u).maxSan;
export const blinkChance = (u: Unit) => {
  const p = prof(u), full = u.blinkFull ?? p.blinkFull;
  return full + (p.blinkZero - full) * (1 - u.san / maxSanOf(u));
};
export const pct = (p: number) => p < 0.001 ? "<0.1%" : p < 0.01 ? (p * 100).toFixed(1) + "%" : Math.round(p * 100) + "%";
