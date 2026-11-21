// Firearms of the 1950s–60s. The Foundation fields American service weapons; the Chaos
// Insurgency arms itself from Soviet-bloc stocks. Magazine sizes are scaled for the game.
import type { ClassId } from "./classes";

export type WeaponType = "rifle" | "marksman" | "shotgun" | "mg" | "carbine" | "smg";
export type AttachmentId = "scope" | "trigger" | "extmag" | "stock" | "suppressor" | "bayonet" | "sights";
/** Special ammunition, one type per operative, built in the workshop (like XCOM's experimental ammo). */
export type AmmoId = "ap" | "tracer" | "hollow" | "sedative" | "incendiary";
export const AMMO: Record<AmmoId, { name: string; desc: string }> = {
  ap:       { name: "Armor-piercing rounds", desc: "Hits ignore 1 armor point." },
  tracer:   { name: "Tracer rounds", desc: "+10 aim on overwatch shots." },
  hollow:   { name: "Hollow-point rounds", desc: "Critical hits do 1 more damage." },
  incendiary: { name: "Incendiary rounds", desc: "Hits set the target's tile alight for a turn." },
  sedative: { name: "Sedative rounds", desc: "Non-lethal: Insurgents, civilians and loose D-Class brought to 0 HP are knocked out, not killed." },
};
/** Weapon tiers, like XCOM's conventional, magnetic and beam weapons. */
export const WEAPON_TIERS = [
  { name: "", dmg: 0, aim: 0, pierce: 0 },
  { name: "", dmg: 0, aim: 0, pierce: 0 },
  { name: "Foundation", dmg: 1, aim: 5, pierce: 0 },
  { name: "Coil", dmg: 2, aim: 5, pierce: 1 },
];
/** Everyone's sidearm, fired when the main weapon is empty. It never needs reloading. */
export const SIDEARM = { name: "M1911 pistol", dmg: [2, 3] as [number, number], aim: -5 };

export interface WeaponModel {
  id: string;
  type: WeaponType;
  name: string;
  year: number;            // entered US service; the Foundation can field it 2 years earlier
  dmg: [number, number];
  mag: number;
  aim: number;
  start?: boolean;         // standard issue in 1951
}

export const MODELS: WeaponModel[] = [
  { id: "m1_garand",  type: "rifle",    name: "M1 Garand",                 year: 1936, dmg: [3, 5], mag: 4, aim: 0, start: true },
  { id: "m14",        type: "rifle",    name: "M14",                       year: 1959, dmg: [4, 6], mag: 5, aim: 0 },
  { id: "m16",        type: "rifle",    name: "M16",                       year: 1964, dmg: [4, 6], mag: 6, aim: 5 },
  { id: "m1903a4",    type: "marksman", name: "M1903A4 Springfield",       year: 1943, dmg: [4, 6], mag: 3, aim: 0, start: true },
  { id: "m21",        type: "marksman", name: "M21",                       year: 1969, dmg: [5, 7], mag: 4, aim: 5 },
  { id: "m1897",      type: "shotgun",  name: "Winchester M1897 trench gun", year: 1917, dmg: [4, 6], mag: 3, aim: 0, start: true },
  { id: "r870",       type: "shotgun",  name: "Remington 870",             year: 1966, dmg: [5, 7], mag: 4, aim: 0 },
  { id: "bar",        type: "mg",       name: "M1918 BAR",                 year: 1918, dmg: [4, 5], mag: 4, aim: 0, start: true },
  { id: "m60",        type: "mg",       name: "M60",                       year: 1957, dmg: [5, 6], mag: 5, aim: 0 },
  { id: "m2_carbine", type: "carbine",  name: "M2 Carbine",                year: 1945, dmg: [3, 4], mag: 5, aim: 0, start: true },
  { id: "xm177",      type: "carbine",  name: "XM177",                     year: 1966, dmg: [4, 5], mag: 5, aim: 5 },
  { id: "m3",         type: "smg",      name: "M3 Grease Gun",             year: 1943, dmg: [2, 4], mag: 5, aim: 0, start: true },
  { id: "m45",        type: "smg",      name: "Carl Gustaf m/45",          year: 1966, dmg: [3, 4], mag: 6, aim: 5 },
];
export const model = (id: string) => MODELS.find(m => m.id === id)!;
export const startingModels = (): Record<WeaponType, string> =>
  Object.fromEntries(MODELS.filter(m => m.start).map(m => [m.type, m.id])) as Record<WeaponType, string>;

export interface TypeInfo { name: string; desc: string; move: number; crit: number; }
export const TYPES: Record<WeaponType, TypeInfo> = {
  rifle:    { name: "Service rifle",  move: 0,  crit: 0,  desc: "The all-rounder: +10 aim up close, steady out to 12 tiles, then falls off." },
  marksman: { name: "Marksman rifle", move: 0,  crit: 0,  desc: "Best far off: +10 aim from 12 to 20 tiles, −20 within 3, and firing takes both actions." },
  shotgun:  { name: "Shotgun",        move: 0,  crit: 10, desc: "+20 aim within 3 tiles, falls off fast beyond 6 (aim and damage), +10% crit." },
  mg:       { name: "Machine gun",    move: -1, crit: 0,  desc: "−1 move. Steady across the middle distances; overwatch shots lose only 5 aim." },
  carbine:  { name: "Carbine",        move: 1,  crit: 0,  desc: "+1 move. Good up close and out to about 9 tiles." },
  smg:      { name: "Submachine gun", move: 1,  crit: 0,  desc: "+1 move, +15 aim within 3 tiles but weak past 7 (aim and damage), and firing doesn't end the turn." },
};

/** Aim change from distance for each weapon type. */
/**
 * Accuracy by distance for each weapon type (Tactical overhaul T4.1), as points [tiles, aim modifier] joined by
 * straight lines, flat beyond the last point. Each class has a range it is good at: shotguns and SMGs up close,
 * marksman rifles far off, rifles and carbines in between, machine guns steady across the middle.
 */
export const RANGE_CURVES: Record<WeaponType, [number, number][]> = {
  rifle:    [[1, 10], [3, 10], [5, 5], [8, 0], [12, 0], [16, -10], [22, -22], [30, -38]],
  marksman: [[1, -25], [3, -20], [5, -5], [8, 5], [12, 10], [20, 10], [30, 5]],
  shotgun:  [[1, 25], [3, 20], [5, 5], [7, -10], [10, -30], [14, -50]],
  smg:      [[1, 20], [3, 15], [5, 5], [7, -5], [10, -20], [14, -35]],
  carbine:  [[1, 15], [3, 12], [6, 3], [9, 0], [13, -10], [18, -24]],
  mg:       [[1, 5], [4, 5], [8, 0], [12, -5], [18, -18], [26, -32]],
};
/** The aim modifier for a weapon type at a distance in tiles. */
export function rangeAim(type: WeaponType, dist: number): number {
  const c = RANGE_CURVES[type];
  if (dist <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (dist <= c[i][0]) {
    const [d0, a0] = c[i - 1], [d1, a1] = c[i];
    return Math.round(a0 + (a1 - a0) * (dist - d0) / (d1 - d0));
  }
  return c[c.length - 1][1];
}
export function rangeMod(type: WeaponType, dist: number): [string, number] | null {
  const a = rangeAim(type, dist);
  if (!a) return null;
  return [a > 0 ? `Range: ${dist < 6 ? "close" : "good"}` : `Range: ${dist >= 12 ? "long" : "poor"}`, a];
}
/** Damage lost at range: shotguns past 6 tiles lose 1 per 3 tiles; SMGs past 9 lose 1 (Tactical overhaul T4.3). */
export function rangeDamage(type: WeaponType, dist: number): number {
  if (type === "shotgun" && dist > 6) return -Math.ceil((dist - 6) / 3);
  if (type === "smg" && dist > 9) return -1;
  return 0;
}

export const CLASS_WEAPONS: Record<ClassId, [WeaponType, WeaponType]> = {
  rifleman: ["rifle", "marksman"],
  breacher: ["shotgun", "mg"],
  recon: ["carbine", "marksman"],
  containment: ["carbine", "rifle"],
  medic: ["smg", "carbine"],
};

export interface AttachmentDef { name: string; desc: string; }
export const ATTACHMENTS: Record<AttachmentId, AttachmentDef> = {
  scope:   { name: "Telescopic sight", desc: "+5 aim." },
  trigger: { name: "Match trigger group", desc: "+10% crit." },
  extmag:  { name: "Extended magazine", desc: "+1 round." },
  stock:   { name: "Padded stock", desc: "A miss still does 1 damage." },
  suppressor: { name: "Suppressor", desc: "Shots make no noise: nothing hears where they came from." },
  bayonet: { name: "Bayonet", desc: "Against an adjacent enemy, a sure thrust for 3 damage that uses no ammo." },
  sights:  { name: "Improved sights", desc: "+10 aim." },
};

// The Chaos Insurgency's arsenal by year.
export interface EnemyGun { name: string; type: WeaponType; dmg: [number, number]; mag: number; }
export function insurgentGuns(year: number): EnemyGun[] {
  const guns: EnemyGun[] = [
    { name: "PPSh-41", type: "smg", dmg: [2, 3], mag: 5 },
    { name: "Mosin-Nagant", type: "rifle", dmg: [3, 4], mag: 3 },
  ];
  if (year >= 1953) guns.push({ name: "AK-47", type: "rifle", dmg: [3, 4], mag: 5 }, { name: "SKS", type: "rifle", dmg: [3, 4], mag: 4 });
  if (year >= 1956) guns.push({ name: "RPD", type: "mg", dmg: [3, 5], mag: 5 });
  return year >= 1953 ? guns.slice(2) : guns;
}
