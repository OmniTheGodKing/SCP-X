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
  generator:   { name: "Generator", cost: 100, days: 6, engineers: 2, power: -10, upkeep: 5, buildable: true, desc: "Supplies 10 power, more once refitted with researched designs." },
  barracks:    { name: "D-Class barracks", cost: 80, days: 5, engineers: 2, power: 1, upkeep: 5, buildable: true, desc: "Holds 10 D-Class." },
  security:    { name: "Security station", cost: 150, days: 7, engineers: 3, power: 2, upkeep: 15, buildable: true, desc: "Houses 4 Site Security guards. Each station cuts the breach risk of every containment wing on its level by 30%, and its guards are on the scene the moment a wing on that level breaches." },
  medical:     { name: "Medical bay", cost: 180, days: 10, engineers: 3, power: 3, upkeep: 15, buildable: true, desc: "Operatives heal 2 HP a day instead of 1." },
  lab:         { name: "Research lab", cost: 200, days: 10, engineers: 3, power: 3, upkeep: 20, buildable: true, desc: "Room for 4 researchers. Needed for research and for tests on SCP-173." },
  workshop:    { name: "Workshop", cost: 180, days: 9, engineers: 3, power: 3, upkeep: 15, buildable: true, desc: "Builds equipment, and houses 4 more engineers." },
  psych:       { name: "Psychological services", cost: 160, days: 10, engineers: 3, power: 2, upkeep: 15, buildable: true, desc: "Operatives recover 20 sanity a day instead of 10, and one at a time can be treated for a bad trait." },
  holding:     { name: "Holding cells", cost: 120, days: 6, engineers: 2, power: 2, upkeep: 10, buildable: true, desc: "Holds 4 captured Insurgents for interrogation. Each yields 1 Intel every 10 days, up to 3." },
  amnestics:   { name: "Amnestics lab", cost: 140, days: 8, engineers: 2, power: 2, upkeep: 15, buildable: true, desc: "Brews Class-A amnestics: 1 dose every 5 days per lab, and room to store 10 per lab. Doses are used on cover-ups and cover stories." },
  training:    { name: "Training range", cost: 150, days: 8, engineers: 2, power: 2, upkeep: 10, buildable: true, desc: "Weekly drills: operatives at Site-19 gain 1 XP a month this way, up to Private First Class at most (missions are where they really learn). Operatives can retrain into a new class here." },
  cont_safe:   { name: "Safe-grade containment wing", cost: 120, days: 8, engineers: 3, power: 2, upkeep: 10, buildable: true, grade: 0, desc: "Basic cells. Anything above Safe breaches three times as often here." },
  cont_euclid: { name: "Euclid-grade containment wing", cost: 250, days: 12, engineers: 4, power: 4, upkeep: 20, buildable: true, grade: 1, desc: "Reinforced cells for Euclid-class anomalies: things that are dangerous and not fully understood, but can be reliably held." },
  cont_keter:  { name: "Keter-grade containment wing", cost: 450, days: 18, engineers: 5, power: 6, upkeep: 35, buildable: true, grade: 2, desc: "The strongest cells Site-19 can build. Anomalies held a grade below the wing's breach half as often." },
};

export const GRADE_NAMES = ["Safe", "Euclid", "Keter"];
/** Facility name for use mid-sentence: "the medical bay", but "the Euclid-grade containment wing". */
export const nameInText = (t: FacilityType) => {
  const n = FACILITIES[t].name;
  return /^(Safe|Euclid|Keter|D-Class)/.test(n) ? n : n[0].toLowerCase() + n.slice(1);
};
export const SLOTS = 6, MAX_LEVELS = 6;
export const EXCAVATE = { cost: 200, days: 10, engineers: 4 };
export const REPAIR = { cost: 30, days: 3, engineers: 2 };
/** A wrecked facility (blown up, torn through by an anomaly) takes much longer to rebuild than a damaged one. */
export const REBUILD = { cost: 90, days: 9, engineers: 4 };
export const repairOf = (f: Facility) => f.wrecked ? REBUILD : REPAIR;
/** What stops working while a facility is out of action, in words. */
export function damageEffect(c: Campaign, f: Facility): string {
  switch (f.type) {
    case "generator": return `${generatorOutput(f)} power lost${powerShort(c) ? ": Site-19 is short of power, and every wing's breach risk is up" : ""}.`;
    case "security": return "No guards respond from this post, and containment wings on its level lose its protection.";
    case "lab": return "Its 4 desks of lab space are gone; researchers over the limit stop work.";
    case "workshop": return "Its 4 engineer berths are gone, and nothing it would build can be ordered.";
    case "barracks": return `${f.upgraded ? 15 : 10} D-Class beds lost.`;
    case "medical": return "Wounded heal at the slower rate.";
    case "psych": return "No therapy, and sanity recovers at the slower rate.";
    case "holding": return "No prisoners can be held or interrogated here.";
    case "amnestics": return "Its amnestics production stops.";
    case "training": return "No drills, no retraining, and trainers can't teach.";
    case "cont_safe": case "cont_euclid": case "cont_keter": return "Whatever it holds breaches three times as often; nothing new can be moved in.";
    default: return "Out of action.";
  }
}
export const ENGINEER_COST = 50;

export interface Facility {
  id: string;
  type: FacilityType;
  level: number;
  slot: number;
  daysLeft: number;    // > 0 while under construction
  disabled: boolean;   // damaged by a breach
  /** Wrecked rather than damaged: needs a full rebuild. */
  wrecked?: boolean;
  repairDays: number;  // > 0 while being repaired
  demolishDays?: number;  // > 0 while being torn down
  upgraded?: boolean;     // expanded (barracks)
  recreation?: boolean;   // barracks: a recreation room (morale +1 a day)
  upgradeDays?: number;   // > 0 while being expanded (barracks) or refitted (generators)
  /** Generators: how far it has been refitted (see GEN_TIERS). */
  genTier?: number;
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
/** Security stations on the same level as a facility: each one guards the whole level. */
export const stationsOnLevel = (c: Campaign, f: Facility) => c.base.facilities.filter(n => n.type === "security" && n.level === f.level && operational(n));
export const operational = (f: Facility) => f.daysLeft === 0 && !f.disabled && !f.demolishDays;
export const countOperational = (c: Campaign, type: FacilityType) =>
  c.base.facilities.filter(f => f.type === type && operational(f)).length;

/** Facilities sharing a wall: either side on the same level, or directly above or below. */
export const neighbors = (c: Campaign, f: Facility) => c.base.facilities.filter(o =>
  o !== f && ((o.level === f.level && Math.abs(o.slot - f.slot) === 1) || (o.slot === f.slot && Math.abs(o.level - f.level) === 1)));

/** Generator refits: each is researched once, then bought for each generator in its own panel. */
export const GEN_TIERS = [
  { name: "Diesel generator", power: 10, upkeep: 0, cost: 0, days: 0, engineers: 0, research: "" },
  { name: "Turbocharged diesel", power: 15, upkeep: 0, cost: 60, days: 4, engineers: 2, research: "efficient_gen" },
  { name: "Twin diesel set", power: 20, upkeep: 2, cost: 90, days: 5, engineers: 2, research: "twin_diesel" },
  { name: "Gas turbine", power: 28, upkeep: 5, cost: 140, days: 6, engineers: 3, research: "gas_turbine" },
  { name: "Compact reactor", power: 40, upkeep: 12, cost: 260, days: 10, engineers: 4, research: "compact_reactor" },
  { name: "Uprated reactor", power: 55, upkeep: 15, cost: 200, days: 8, engineers: 4, research: "reactor_uprate" },
];
export const genTierOf = (f: Facility) => GEN_TIERS[f.genTier ?? 0];
export const generatorOutput = (f: Facility) => genTierOf(f).power;
export const powerSupply = (c: Campaign) =>
  c.base.facilities.filter(f => f.type === "generator" && operational(f) && !f.upgradeDays).reduce((a, f) => a + generatorOutput(f), 0);
export function canRefitGen(c: Campaign, f: Facility): string | null {
  const next = GEN_TIERS[(f.genTier ?? 0) + 1];
  if (f.type !== "generator") return "Only generators can be refitted.";
  if (!next) return "Already the best Site-19 can build.";
  if (f.upgradeDays) return "Already being refitted.";
  if (!operational(f)) return "It has to be working first.";
  if (!has(c, next.research)) return "Needs research first.";
  if (c.funds < next.cost) return `Needs $${next.cost}k.`;
  if (engineersFree(c) < next.engineers) return `Needs ${next.engineers} free engineers.`;
  return null;
}
/** Refitting takes the generator offline until it's done. */
export function refitGenerator(c: Campaign, f: Facility) {
  if (canRefitGen(c, f)) return;
  const next = GEN_TIERS[(f.genTier ?? 0) + 1];
  c.funds -= next.cost; f.upgradeDays = next.days;
}
export const powerUse = (c: Campaign) =>
  c.base.facilities.filter(f => FACILITIES[f.type].power > 0 && f.daysLeft === 0).reduce((a, f) => a + FACILITIES[f.type].power, 0);
export const powerShort = (c: Campaign) => powerUse(c) > powerSupply(c);

export const engineersBusy = (c: Campaign) =>
  c.base.facilities.reduce((a, f) => a + (f.daysLeft > 0 ? FACILITIES[f.type].engineers : 0) + (f.repairDays > 0 ? repairOf(f).engineers : 0) + (f.demolishDays ? 1 : 0) + (f.upgradeDays ? (f.type === "generator" ? GEN_TIERS[(f.genTier ?? 0) + 1]?.engineers ?? 0 : UPGRADE.engineers) : 0), 0)
  + (c.base.excavation > 0 ? EXCAVATE.engineers : 0) + c.orders.length;
export const engineersFree = (c: Campaign) => c.engineers - engineersBusy(c);

export const engineerCapacity = (c: Campaign) => 8 + countOperational(c, "workshop") * 4;
export const dclassCapacity = (c: Campaign) => c.base.facilities.filter(f => f.type === "barracks" && operational(f)).reduce((a, f) => a + (f.upgraded ? 15 : 10), 0);
/** Facility upgrades built by engineers (like XCOM's room upgrades). */
export const UPGRADE = { cost: 60, days: 4, engineers: 2 };
export function canUpgrade(c: Campaign, f: Facility): string | null {
  if (f.type !== "barracks") return "Nothing to upgrade.";
  if (f.upgraded) return "Already expanded.";
  if (f.upgradeDays) return "Already being expanded.";
  if (!operational(f)) return "It has to be working first.";
  if (c.funds < UPGRADE.cost) return `Needs $${UPGRADE.cost}k.`;
  if (engineersFree(c) < UPGRADE.engineers) return `Needs ${UPGRADE.engineers} free engineers.`;
  return null;
}
export const RECREATION = { cost: 40, days: 3, engineers: 1 };
export function canAddRecreation(c: Campaign, f: Facility): string | null {
  if (f.type !== "barracks") return "Nothing to add.";
  if (f.recreation) return "Already has one.";
  if (!operational(f)) return "It has to be working first.";
  if (c.funds < RECREATION.cost) return `Needs $${RECREATION.cost}k.`;
  if (engineersFree(c) < RECREATION.engineers) return "Needs a free engineer.";
  return null;
}
export function addRecreation(c: Campaign, f: Facility) {
  if (canAddRecreation(c, f)) return;
  c.funds -= RECREATION.cost; f.recreation = true;
}
export function upgradeFacility(c: Campaign, f: Facility) {
  if (canUpgrade(c, f)) return;
  c.funds -= UPGRADE.cost; f.upgradeDays = UPGRADE.days;
}
export const SALARY = { operative: 10, guard: 5 };
export const salaries = (c: Campaign) => c.roster.filter(o => o.alive).length * SALARY.operative + c.guards.filter(g => g.alive).length * SALARY.guard;
/** Facility upkeep, the alert level's cost, and staff salaries, per month. */
export const monthlyUpkeep = (c: Campaign) => c.base.facilities.reduce((a, f) => a + (f.type === "security" && has(c, "bt_security") ? 0 : FACILITIES[f.type].upkeep) + (f.type === "generator" ? genTierOf(f).upkeep : 0), 0) + ALERTS[c.alert].upkeep + salaries(c);
export const healPerDay = (c: Campaign) => (countOperational(c, "medical") && !powerShort(c) ? 2 : 1) + (has(c, "necrotic_study") ? 1 : 0) + (has(c, "bt_triage") ? 1 : 0);
export const sanityPerDay = (c: Campaign) => countOperational(c, "psych") && !powerShort(c) ? 20 : 10;

export function canBuild(c: Campaign, type: FacilityType, level: number, slot: number): string | null {
  const d = FACILITIES[type];
  if (!d.buildable) return "Can't be built.";
  if (level >= c.base.levels) return "That level hasn't been excavated.";
  if (facilityAt(c, level, slot)) return "That slot is taken.";
  if (type === "cont_keter" && !has(c, "keter_containment")) return "Needs Keter-grade containment research.";
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

// ---------- tearing facilities down ----------
export const DEMOLISH = { refund: 0.25, engineers: 1 };
export const demolishDays = (f: Facility) => Math.max(1, Math.ceil(FACILITIES[f.type].days / 2));
export function canDemolish(c: Campaign, f: Facility): string | null {
  if (f.type === "command") return "Command can't be torn down.";
  if (f.demolishDays) return "Already being torn down.";
  if (f.daysLeft > 0 || f.repairDays > 0) return "Wait until the engineers are finished with it.";
  if (isContainment(f.type) && c.scps.some(s => s.wingId === f.id && s.status !== "loose")) return "Something is held here. Move it out first.";
  if (engineersFree(c) < DEMOLISH.engineers) return "Needs a free engineer.";
  return null;
}
/** What tearing this down would cost in power, for a warning. */
export const demolishLeavesShort = (c: Campaign, f: Facility) => f.type === "generator" && powerUse(c) > powerSupply(c) - generatorOutput(f);
export function demolish(c: Campaign, f: Facility) {
  if (canDemolish(c, f)) return;
  f.demolishDays = demolishDays(f);
}

export function canRepair(c: Campaign, f: Facility): string | null {
  if (!f.disabled) return "Not damaged.";
  if (f.repairDays > 0) return "Already being repaired.";
  const r = repairOf(f);
  if (c.funds < r.cost) return `Needs $${r.cost}k.`;
  if (engineersFree(c) < r.engineers) return `Needs ${r.engineers} free engineers.`;
  return null;
}
export function repair(c: Campaign, f: Facility) {
  if (canRepair(c, f)) return;
  const r = repairOf(f);
  c.funds -= r.cost;
  f.repairDays = r.days;
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
    if (f.repairDays > 0 && --f.repairDays === 0) { done.push(`${FACILITIES[f.type].name} on level ${f.level + 1} is ${f.wrecked ? "rebuilt" : "repaired"}.`); f.disabled = false; f.wrecked = undefined; }
  }
  for (const f of c.base.facilities) if (f.upgradeDays && --f.upgradeDays === 0) {
    if (f.type === "generator") { f.genTier = (f.genTier ?? 0) + 1; done.push(`The generator on level ${f.level + 1} is refitted as a ${genTierOf(f).name.toLowerCase()}: ${genTierOf(f).power} power.`); }
    else { f.upgraded = true; done.push(`The ${nameInText(f.type)} on level ${f.level + 1} has been expanded.`); }
  }
  for (const f of [...c.base.facilities]) if (f.demolishDays && --f.demolishDays === 0) {
    c.base.facilities = c.base.facilities.filter(x => x !== f);
    const back = Math.round(FACILITIES[f.type].cost * DEMOLISH.refund);
    c.funds += back;
    done.push(`The ${nameInText(f.type)} on level ${f.level + 1} has been torn down (+$${back}k in salvage).`);
    const moved = c.guards.filter(g => g.alive && g.stationId === f.id);
    if (moved.length) { for (const g of moved) g.stationId = undefined; done.push(`${moved.length} guard${moved.length > 1 ? "s are" : " is"} without a post. Post them at another Security station.`); }
    // anyone it housed has to go somewhere
    if (c.dclass > dclassCapacity(c)) { done.push(`${c.dclass - dclassCapacity(c)} D-Class were transferred out for lack of beds.`); c.dclass = dclassCapacity(c); }
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
