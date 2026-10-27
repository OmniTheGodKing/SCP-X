// What an operative looks like: a few layered parts the portrait is drawn from. The parts are plain data so the
// drawing style can be replaced later (and the same data can dress the 3D models in Phase 4).
import type { UnitId } from "./units";

export interface Look { skin: number; hair: number; hairColor: number; facial: number; scar: boolean; headgear: boolean; }
export const SKIN = ["#f1d3bc", "#e3b48e", "#c98e63", "#a86b45", "#7c4a2c", "#55321e"];
export const HAIR_COLORS = ["#1d1a17", "#3b2a1e", "#6a4a2c", "#8e4a26", "#c9a45c", "#9a958c"];
export const HAIR_STYLES = ["Crew cut", "Side part", "Swept back", "Shaved", "Bun", "Bob", "Victory rolls"];
/** Hair styles by sex (women have no facial hair, for now). */
export const HAIR_BY_SEX = { m: [0, 1, 2, 3], f: [4, 5, 6] } as const;
export const SEX_NAMES = { m: "Male", f: "Female" } as const;
/** Bring a look in line with its owner's sex: a fitting hair style and, for women, no facial hair. */
export function fitLook(l: Look, sex: "m" | "f" = "m"): Look {
  const ok = HAIR_BY_SEX[sex] as readonly number[];
  return { ...l, hair: ok.includes(l.hair) ? l.hair : ok[0], facial: sex === "f" ? 0 : l.facial };
}
export const FACIAL = ["None", "Moustache", "Beard", "Stubble"];
export const LOOK_PARTS = { skin: SKIN.length, hair: HAIR_STYLES.length, hairColor: HAIR_COLORS.length, facial: FACIAL.length } as const;

/** Headgear by unit, as worn in the period: [name, colour] (no entry: bareheaded). */
export const HEADGEAR: Partial<Record<UnitId, [string, string]>> = {
  sas: ["sand beret", "#c8b48a"], nzsas: ["sand beret", "#c8b48a"], sasr: ["sand beret", "#c8b48a"],
  commando: ["green beret", "#2f5a35"], sbs: ["green beret", "#2f5a35"], sf: ["green beret", "#3b5d3a"],
  legion: ["white kepi", "#e9e4d8"], gurkha: ["slouch hat", "#6f6146"], jaeger: ["maroon beret", "#6b2433"],
  rangers: ["patrol cap", "#55603f"], seals: ["watch cap", "#262b30"],
  kct: ["green beret", "#2f5a35"], paracdo: ["maroon beret", "#6b2433"], mjk: ["green beret", "#2f5a35"], scoutrangers: ["patrol cap", "#4a5a3a"],
};

/** A small deterministic generator, so an operative with no saved look always gets the same face. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
export function rollLook(seed: string, sex: "m" | "f" = "m"): Look {
  const r = seeded(seed), n = (k: number) => Math.floor(r() * k);
  return {
    skin: n(SKIN.length), hairColor: r() < 0.08 ? 5 : n(5),
    hair: sex === "f" ? HAIR_BY_SEX.f[n(3)] : HAIR_BY_SEX.m[n(4)], facial: sex === "f" ? 0 : r() < 0.6 ? 0 : 1 + n(3),
    scar: r() < 0.15, headgear: true,
  };
}
