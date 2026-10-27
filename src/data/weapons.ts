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
  rifle:    { name: "Service rifle",  move: 0,  crit: 0,  desc: "The all-rounder." },
  marksman: { name: "Marksman rifle", move: 0,  crit: 0,  desc: "No long-range penalty, −20 aim within 3 tiles, and firing takes both actions." },
  shotgun:  { name: "Shotgun",        move: 0,  crit: 10, desc: "+20 aim within 3 tiles, falls off fast beyond 6, +10% crit." },
  mg:       { name: "Machine gun",    move: -1, crit: 0,  desc: "−1 move. Overwatch shots lose only 5 aim, and suppression is −40." },
  carbine:  { name: "Carbine",        move: 1,  crit: 0,  desc: "+1 move." },
  smg:      { name: "Submachine gun", move: 1,  crit: 0,  desc: "+1 move, +15 aim within 3 tiles, and firing doesn't end the turn." },
};

/** Aim change from distance for each weapon type. */
export function rangeMod(type: WeaponType, dist: number): [string, number] | null {
  switch (type) {
    case "marksman": return dist <= 3 ? ["Too close for a scope", -20] : null;
    case "shotgun": return dist <= 3 ? ["Point blank", 20] : dist > 6 ? ["Out of shotgun range", -Math.round((dist - 6) * 10)] : null;
    case "smg": return dist <= 3 ? ["Close range", 15] : dist > 6 ? ["Long range", -Math.round((dist - 6) * 6)] : null;
    default: return dist <= 3 ? ["Close range", 10] : dist > 7 ? ["Long range", -Math.round((dist - 7) * 4)] : null;
  }
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
