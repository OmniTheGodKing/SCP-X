// Site-19's facilities: what can be built where, power, engineers, construction and repairs.
import type { Campaign } from "./campaign";
import { has } from "./research";
import { ALERTS } from "./security";

export type FacilityType =
  | "command" | "generator" | "barracks" | "security" | "medical" | "psych" | "lab" | "workshop" | "training" | "holding" | "amnestics"
  | "cont_safe" | "cont_euclid" | "cont_keter";

export interface FacilityDef {
  name: string;
  cost: number;        // $k
  days: number;        // build time
  engineers: number;   // tied up while building
  power: number;       // used (negative = produced)
  upkeep: number;      // $k per month
  desc: string;
  buildable: boolean;
  grade?: number;      // containment grade: 0 Safe, 1 Euclid, 2 Keter
}

export const FACILITIES: Record<FacilityType, FacilityDef> = {
  command:     { name: "Command", cost: 0, days: 0, engineers: 0, power: 0, upkeep: 0, buildable: false, desc: "Site-19's operations center. Runs on its own backup supply." },
  generator:   { name: "Generator", cost: 100, days: 6, engineers: 2, power: -10, upkeep: 5, buildable: true, desc: "Supplies 10 power." },
  barracks:    { name: "D-Class barracks", cost: 80, days: 5, engineers: 2, power: 1, upkeep: 5, buildable: true, desc: "Holds 10 D-Class." },
  security:    { name: "Security station", cost: 150, days: 7, engineers: 3, power: 2, upkeep: 15, buildable: true, desc: "Houses 4 Site Security guards. Each station next to a containment wing cuts that wing's breach risk by 30%, and its guards are already in the wing when a breach starts." },
  medical:     { name: "Medical bay", cost: 180, days: 10, engineers: 3, power: 3, upkeep: 15, buildable: true, desc: "Operatives heal 2 HP a day instead of 1." },
  lab:         { name: "Research lab", cost: 200, days: 10, engineers: 3, power: 3, upkeep: 20, buildable: true, desc: "Room for 4 researchers. Needed for research and for tests on SCP-173." },
  workshop:    { name: "Workshop", cost: 180, days: 9, engineers: 3, power: 3, upkeep: 15, buildable: true, desc: "Builds equipment, and houses 4 more engineers." },
  psych:       { name: "Psychological services", cost: 160, days: 10, engineers: 3, power: 2, upkeep: 15, buildable: true, desc: "Operatives recover 20 sanity a day instead of 10, and one at a time can be treated for a bad trait." },
  holding:     { name: "Holding cells", cost: 120, days: 6, engineers: 2, power: 2, upkeep: 10, buildable: true, desc: "Holds 4 captured Insurgents for interrogation. Each yields 1 Intel every 10 days, up to 3." },
  amnestics:   { name: "Amnestics lab", cost: 140, days: 8, engineers: 2, power: 2, upkeep: 15, buildable: true, desc: "Brews Class-A amnestics: 1 dose every 5 days per lab, and room to store 10 per lab. Doses are used on cover-ups and cover stories." },
  training:    { name: "Training range", cost: 150, days: 8, engineers: 2, power: 2, upkeep: 10, buildable: true, desc: "Operatives at Site-19 gain 1 XP a week, and can retrain into a new class." },
  cont_safe:   { name: "Safe-grade containment wing", cost: 120, days: 8, engineers: 3, power: 2, upkeep: 10, buildable: true, grade: 0, desc: "Basic cells. Anything above Safe breaches three times as often here." },
  cont_euclid: { name: "Euclid-grade containment wing", cost: 250, days: 12, engineers: 4, power: 4, upkeep: 20, buildable: true, grade: 1, desc: "Reinforced cells suited to Euclid-class anomalies like SCP-173." },
  cont_keter:  { name: "Keter-grade containment wing", cost: 450, days: 18, engineers: 5, power: 6, upkeep: 35, buildable: true, grade: 2, desc: "The strongest cells Site-19 can build. Anomalies held a grade below the wing's breach half as often." },
};

export const GRADE_NAMES = ["Safe", "Euclid", "Keter"];
/** Facility name for use mid-sentence: "the medical bay", but "the Euclid-grade containment wing". */
export const nameInText = (t: FacilityType) => {
  const n = FACILITIES[t].name;
  return /^(Safe|Euclid|Keter|D-Class)/.test(n) ? n : n[0].toLowerCase() + n.slice(1);
};
export const SLOTS = 4, MAX_LEVELS = 6;
export const EXCAVATE = { cost: 200, days: 10, engineers: 4 };
export const REPAIR = { cost: 30, days: 3, engineers: 2 };
export const ENGINEER_COST = 50;

export interface Facility {
  id: string;
  type: FacilityType;
  level: number;
  slot: number;
  daysLeft: number;    // > 0 while under construction
  disabled: boolean;   // damaged by a breach
  repairDays: number;  // > 0 while being repaired
}

export interface Base {
  levels: number;
  facilities: Facility[];
  excavation: number;  // days left on the next level, 0 if none in progress
  nextId: number;
}

export const isContainment = (t: FacilityType) => FACILITIES[t].grade !== undefined;
export const facilityAt = (c: Campaign, level: number, slot: number) =>
  c.base.facilities.find(f => f.level === level && f.slot === slot) || null;
export const operational = (f: Facility) => f.daysLeft === 0 && !f.disabled;
export const countOperational = (c: Campaign, type: FacilityType) =>
  c.base.facilities.filter(f => f.type === type && operational(f)).length;

/** Facilities sharing a wall: either side on the same level, or directly above or below. */
export const neighbors = (c: Campaign, f: Facility) => c.base.facilities.filter(o =>
  o !== f && ((o.level === f.level && Math.abs(o.slot - f.slot) === 1) || (o.slot === f.slot && Math.abs(o.level - f.level) === 1)));

export const generatorOutput = (c: Campaign) => has(c, "efficient_gen") ? 15 : 10;
export const powerSupply = (c: Campaign) =>
  c.base.facilities.filter(f => f.type === "generator" && operational(f)).length * generatorOutput(c);
export const powerUse = (c: Campaign) =>
  c.base.facilities.filter(f => FACILITIES[f.type].power > 0 && f.daysLeft === 0).reduce((a, f) => a + FACILITIES[f.type].power, 0);
export const powerShort = (c: Campaign) => powerUse(c) > powerSupply(c);

export const engineersBusy = (c: Campaign) =>
  c.base.facilities.reduce((a, f) => a + (f.daysLeft > 0 ? FACILITIES[f.type].engineers : 0) + (f.repairDays > 0 ? REPAIR.engineers : 0), 0)
  + (c.base.excavation > 0 ? EXCAVATE.engineers : 0) + c.orders.length;
export const engineersFree = (c: Campaign) => c.engineers - engineersBusy(c);

export const engineerCapacity = (c: Campaign) => 8 + countOperational(c, "workshop") * 4;
export const dclassCapacity = (c: Campaign) => countOperational(c, "barracks") * 10;
export const SALARY = { operative: 10, guard: 5 };
export const salaries = (c: Campaign) => c.roster.filter(o => o.alive).length * SALARY.operative + c.guards.filter(g => g.alive).length * SALARY.guard;
/** Facility upkeep, the alert level's cost, and staff salaries, per month. */
export const monthlyUpkeep = (c: Campaign) => c.base.facilities.reduce((a, f) => a + FACILITIES[f.type].upkeep, 0) + ALERTS[c.alert].upkeep + salaries(c);
export const healPerDay = (c: Campaign) => (countOperational(c, "medical") && !powerShort(c) ? 2 : 1) + (has(c, "necrotic_study") ? 1 : 0);
export const sanityPerDay = (c: Campaign) => countOperational(c, "psych") && !powerShort(c) ? 20 : 10;

export function canBuild(c: Campaign, type: FacilityType, level: number, slot: number): string | null {
  const d = FACILITIES[type];
  if (!d.buildable) return "Can't be built.";
  if (level >= c.base.levels) return "That level hasn't been excavated.";
  if (facilityAt(c, level, slot)) return "That slot is taken.";
  if (c.funds < d.cost) return `Needs $${d.cost}k.`;
  if (engineersFree(c) < d.engineers) return `Needs ${d.engineers} free engineers.`;
  if (d.power > 0 && powerUse(c) + d.power > powerSupply(c)) return "Not enough power. Build a generator first.";
  return null;
}

export function build(c: Campaign, type: FacilityType, level: number, slot: number) {
  if (canBuild(c, type, level, slot)) return null;
  const d = FACILITIES[type];
  c.funds -= d.cost;
  const f: Facility = { id: "f" + c.base.nextId++, type, level, slot, daysLeft: d.days, disabled: false, repairDays: 0 };
  c.base.facilities.push(f);
  return f;
}

export function canRepair(c: Campaign, f: Facility): string | null {
  if (!f.disabled) return "Not damaged.";
  if (f.repairDays > 0) return "Already being repaired.";
  if (c.funds < REPAIR.cost) return `Needs $${REPAIR.cost}k.`;
  if (engineersFree(c) < REPAIR.engineers) return `Needs ${REPAIR.engineers} free engineers.`;
  return null;
}
export function repair(c: Campaign, f: Facility) {
  if (canRepair(c, f)) return;
  c.funds -= REPAIR.cost;
  f.repairDays = REPAIR.days;
}

export function canExcavate(c: Campaign): string | null {
  if (c.base.levels >= MAX_LEVELS) return "Site-19 can't go any deeper.";
  if (c.base.excavation > 0) return "Already digging.";
  if (c.funds < EXCAVATE.cost) return `Needs $${EXCAVATE.cost}k.`;
  if (engineersFree(c) < EXCAVATE.engineers) return `Needs ${EXCAVATE.engineers} free engineers.`;
  return null;
}
export function excavate(c: Campaign) {
  if (canExcavate(c)) return;
  c.funds -= EXCAVATE.cost;
  c.base.excavation = EXCAVATE.days;
}

/** One day of construction, repairs and digging. Returns what finished, for the log. */
export function tickConstruction(c: Campaign): string[] {
  const done: string[] = [];
  for (const f of c.base.facilities) {
    if (f.daysLeft > 0 && --f.daysLeft === 0) done.push(`${FACILITIES[f.type].name} on level ${f.level + 1} is complete.`);
    if (f.repairDays > 0 && --f.repairDays === 0) { f.disabled = false; done.push(`${FACILITIES[f.type].name} on level ${f.level + 1} is repaired.`); }
  }
  if (c.base.excavation > 0 && --c.base.excavation === 0) { c.base.levels++; done.push(`Level ${c.base.levels} has been excavated.`); }
  return done;
}

export function startingBase(): Base {
  const b: Base = { levels: 3, facilities: [], excavation: 0, nextId: 1 };
  const put = (type: FacilityType, level: number, slot: number) =>
    b.facilities.push({ id: "f" + b.nextId++, type, level, slot, daysLeft: 0, disabled: false, repairDays: 0 });
  put("command", 0, 0);
  put("generator", 0, 1);
  put("barracks", 0, 2);
  put("lab", 0, 3);
  put("security", 1, 0);
  put("cont_euclid", 1, 1);
  return b;
}
