// Anomalies held at Site-19: daily breach risk, cell cleaning, breaches, and escapes.
import { FACILITIES, isContainment, nameInText, neighbors, operational, powerShort, stationsOnLevel, type Facility } from "./base";
import { has } from "./research";
import { HOME, REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import { addExposure, travelDays } from "./world";
import { dateOf, dclassDied, log, type Campaign, type Incident } from "./campaign";
import type { ScpId } from "../game/types";
import { GUARD, type Guard } from "./security";

export type ScpClass = "Safe" | "Euclid" | "Keter";
const CLASS_GRADE: Record<ScpClass, number> = { Safe: 0, Euclid: 1, Keter: 2 };
// Breaches are rare events spread across years: a well-kept Euclid cell breaches every few months.
const BASE_RISK: Record<ScpClass, number> = { Safe: 0.004, Euclid: 0.012, Keter: 0.02 };
// D-Class do the cleaning: two watch while the third scrubs, so it goes wrong when both watchers blink together.
const D_BLINK = 0.15;
export const CLEAN_CREW = 3;
export const CLEAN_RISK = D_BLINK * D_BLINK;

export const CLEAN_EVERY = 7;
/** Per level below the top: breach risk cut, auto-resolve escape chance cut, and turns added to Epsilon-11's arrival. */
export const DEPTH = { risk: 0.1, escape: 0.05, turns: 1 };
export const wingLevel = (c: Campaign, scpId: string) => { const s = c.scps.find(x => x.id === scpId), w = s && wingOf(c, s); return w ? w.level : 0; };            // days between scheduled cleanings
const decay = (c: Campaign) => has(c, "containment_rev") ? 2 : 4;   // maintenance lost per day
export const RECOVERY_WINDOW = 3;        // days to answer a sighting
export const MOVE_COST = 20;

export interface ScpRecord {
  id: ScpId;
  name: string;
  title: string;
  cls: ScpClass;
  status: "contained" | "breach" | "loose" | "away";
  /** While held at another site for safekeeping: the day it comes back. */
  returnDay?: number;
  wingId: string;
  maintenance: number;     // 0–100
  lastCleaned: number;
  resurfaceDay?: number;
}

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export const wingOf = (c: Campaign, s: ScpRecord) => c.base.facilities.find(f => f.id === s.wingId) || null;
export const occupantOf = (c: Campaign, f: Facility) => c.scps.find(s => s.wingId === f.id) || null;
const securityNear = (c: Campaign, f: Facility) => stationsOnLevel(c, f).length;

/** Chance per day that this anomaly breaches, with the reasons, for display. */
export function breachRisk(c: Campaign, s: ScpRecord) {
  const why: string[] = [];
  const wing = wingOf(c, s);
  if (s.status !== "contained" || !wing) return { p: 0, why };
  let p = BASE_RISK[s.cls];
  why.push(`${s.cls} class: ${Math.round(p * 100)}% base`);
  const grade = FACILITIES[wing.type].grade ?? 0, need = CLASS_GRADE[s.cls];
  if (grade < need) { p *= 3; why.push("Wing is below its class: ×3"); }
  else if (grade > need) { p *= 0.5; why.push("Wing is above its class: ×0.5"); }
  const m = 1 + (100 - s.maintenance) / 50;
  if (m > 1.01) why.push(`Maintenance ${s.maintenance}%: ×${m.toFixed(1)}`);
  p *= m;
  const sec = securityNear(c, wing);
  if (sec) { p *= 0.7 ** sec; why.push(`${sec} security station${sec > 1 ? "s" : ""} on this level: ×${(0.7 ** sec).toFixed(2)}`); }
  if (wing.disabled) { p *= 3; why.push("Wing damaged: ×3"); }
  if (has(c, "containment_rev")) { p *= 0.75; why.push("Revised procedures: ×0.75"); }
  if (has(c, "reinforced_doors")) { p *= 0.8; why.push("Reinforced doors: ×0.8"); }
  if (s.id === "106" && has(c, "em_containment")) { p *= 0.7; why.push("Electromagnetic containment: ×0.7"); }
  if (powerShort(c) && !has(c, "backup_gen")) { p *= 2; why.push("Power shortage: ×2"); }
  // the deeper a wing sits, the harder it is to get anywhere from it
  if (wing.level > 0) { p *= 1 - DEPTH.risk * wing.level; why.push(`Level ${wing.level + 1}, deep underground: ×${(1 - DEPTH.risk * wing.level).toFixed(1)}`); }
  return { p: Math.min(0.9, p), why };
}


export function startBreach(c: Campaign, s: ScpRecord, cause: string) {
  const wing = wingOf(c, s)!;
  s.status = "breach";
  const inc: Incident = {
    id: "inc" + c.nextIncident,
    kind: "breach",
    scpId: s.id,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${s.name} breach, ${nameInText(wing.type)} on level ${wing.level + 1}`,
    appeared: c.day,
    expires: c.day,
    insurgents: Math.min(3, rand(0, 1) + Math.floor((c.day - 1) / 120)),
    region: HOME, map: "wingC",
  };
  c.nextIncident++;
  c.incidents.push(inc);
  log(c, `${cause} ${s.name} is out of its cell. Site Security is responding now: send Epsilon-11 in after them, or leave it to the guards.`, "bad", "command");
}

export function goDark(c: Campaign, s: ScpRecord, why: string, from = "Site-19") {
  s.status = "loose";
  s.resurfaceDay = c.day + rand(30, 120);
  log(c, `${why} ${s.name} has slipped away from ${from}. Nobody knows where it is.`, "bad");
}

export function resurface(c: Campaign, s: ScpRecord, at?: RegionId) {
  const open = REGION_IDS.filter(r => !c.regions[r].collapsed);
  const region = at ?? open[rand(0, open.length - 1)] ?? HOME;
  const towns = REGIONS[region].towns, where = towns[rand(0, towns.length - 1)];
  const inc: Incident = {
    id: "inc" + c.nextIncident,
    kind: "recovery",
    scpId: s.id,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${s.name} sighted near ${where}`,
    appeared: c.day,
    expires: c.day + travelDays(c, region) + RECOVERY_WINDOW,
    insurgents: Math.min(4, rand(0, 2) + Math.floor((c.day - 1) / 90)),
    region, map: Math.random() < 0.5 ? "town" : "farm", civilians: rand(3, 4),
  };
  c.nextIncident++;
  c.incidents.push(inc);
  s.resurfaceDay = undefined;
  addExposure(c, region, 5);
  log(c, `${s.name} has turned up near ${where}, and the locals have seen it (+5 exposure in ${REGIONS[region].name}). Recover it within ${inc.expires - c.day} days.`, "bad", "command");
}

// ---- power failures, cascading breaches and evacuations ----
export const POWER = { genFail: 0.01, genFailNear: 0.03, storm: 0.02, cascade: 0.1, wreckBreach: 0.2 };
export const EVAC = { cost: 10, mult: 2, transferCost: 50, transferDays: 30 };
/** A wing loses power when the site is short and it has no backup supply. */
export const unpowered = (c: Campaign) => powerShort(c) && !has(c, "backup_gen");

/** Something knocks a facility out. A containment wing that's hit may crack open (20%). */
export function wreckFacility(c: Campaign, f: Facility, text: string) {
  f.disabled = true;
  log(c, `${text} The ${nameInText(f.type)} on level ${f.level + 1} is out of action until repaired.`, "bad", "site");
  const occ = occupantOf(c, f);
  if (occ?.status === "contained" && Math.random() < POWER.wreckBreach) startBreach(c, occ, "The damage cracked its cell open.");
}

/** Every day: generators can fail (1% a month, 3% next to a damaged facility, plus winter storms at 2%), and
 *  while the site is short of power each anomaly in an unpowered wing has a 10% chance a day of breaking out. */
function tickPower(c: Campaign) {
  const gens = c.base.facilities.filter(f => f.type === "generator" && operational(f));
  for (const g of gens) {
    const near = neighbors(c, g).some(n => n.disabled);
    if (Math.random() < (near ? POWER.genFailNear : POWER.genFail) / 30) { wreckFacility(c, g, near ? "Damage next door spread into a generator and it shorted out." : "A generator fault: a turbine bearing seized."); return; }
  }
  const month = dateOf(c.day).getUTCMonth();
  if ((month === 11 || month <= 1) && gens.length && Math.random() < POWER.storm / 30) {
    wreckFacility(c, gens[rand(0, gens.length - 1)], "A winter storm brought the lines down and burned out a generator.");
    return;
  }
  if (!unpowered(c)) return;
  for (const s of c.scps) if (s.status === "contained" && Math.random() < POWER.cascade) startBreach(c, s, "The cell's locks failed when the power went.");
}

/** Wings an anomaly can be rushed into in an emergency: its own is damaged or has no power. */
export function canEvacuate(c: Campaign, s: ScpRecord): string | null {
  const wing = wingOf(c, s);
  if (s.status !== "contained" || !wing) return `${s.name} isn't in its cell.`;
  if (!wing.disabled && !unpowered(c)) return "Its wing is intact and powered.";
  if (c.dclass < 1) return "Needs a D-Class.";
  return null;
}
/** Rush it into a free wing: $10k, and twice the danger of a normal move. */
export function evacuate(c: Campaign, s: ScpRecord, to: Facility, watchers: Guard[]) {
  if (canEvacuate(c, s) || !freeWings(c, s.cls).includes(to) || c.funds < EVAC.cost) return;
  c.funds -= EVAC.cost;
  if (cellWork(c, s, watchers, `the emergency evacuation of ${s.name}`, EVAC.mult) && s.status === "contained") {
    s.wingId = to.id;
    log(c, `${s.name} was rushed into the ${nameInText(to.type)} on level ${to.level + 1}.`, "key");
  }
}
/** Nowhere free: another site holds it for 30 days, for $50k. */
export function transferOut(c: Campaign, s: ScpRecord) {
  if (canEvacuate(c, s) || c.funds < EVAC.transferCost) return;
  c.funds -= EVAC.transferCost;
  s.status = "away"; s.returnDay = c.day + EVAC.transferDays;
  log(c, `${s.name} is on its way to Site-17 for safekeeping. It comes back in ${EVAC.transferDays} days.`, "key");
}
function comeBack(c: Campaign, s: ScpRecord) {
  const own = wingOf(c, s), to = own && operational(own) && !c.scps.some(o => o !== s && o.wingId === own.id && o.status !== "loose") ? own : freeWings(c, s.cls)[0];
  if (!to) { s.returnDay = c.day + 10; log(c, `Site-17 was due to send ${s.name} back, but there's no working wing for it. They'll hold it 10 more days.`, "bad", "site"); return; }
  s.status = "contained"; s.wingId = to.id; s.maintenance = 100; s.lastCleaned = c.day; s.returnDay = undefined;
  log(c, `${s.name} is back from Site-17, held in the ${nameInText(to.type)} on level ${to.level + 1}.`, "good");
}

/** One day of containment: wear, breaches, unanswered breaches spreading or escaping, sightings. */
export function tickContainment(c: Campaign) {
  tickPower(c);
  for (const [id, day] of Object.entries(c.sightings) as [ScpId, number][])
    if (c.day >= day) { delete c.sightings[id]; firstSighting(c, id); }
  for (const s of c.scps) {
    if (s.status === "contained") {
      s.maintenance = Math.max(0, s.maintenance - decay(c));
      if (c.cleaningOrder && c.day - s.lastCleaned >= CLEAN_EVERY && c.dclass >= CLEAN_CREW) clean(c, s, "A routine cleaning");
      if (Math.random() < breachRisk(c, s).p) startBreach(c, s, "Containment alarm.");
    } else if (s.status === "away") {
      if (c.day >= (s.returnDay ?? 0)) comeBack(c, s);
    } else if (s.status === "loose") {
      if ((c.day - (s.resurfaceDay ?? 0)) % 4 === 0) addExposure(c, HOME, 1);
      if (s.resurfaceDay !== undefined && c.day >= s.resurfaceDay) resurface(c, s);
    }
  }
  for (const inc of [...c.incidents]) {
    const s = c.scps.find(x => x.id === inc.scpId);
    if (inc.first && c.day > inc.expires && inc.id !== c.activeIncident) {
      // a new anomaly nobody went for: it moves on, and turns up somewhere else later
      c.incidents = c.incidents.filter(i => i !== inc); addExposure(c, inc.region, 10); c.stats.missed++;
      c.sightings[inc.scpId as ScpId] = c.day + rand(60, 150);
      log(c, `${inc.title.split(":")[0]} went unanswered (+10 exposure in ${REGIONS[inc.region].name}). Whatever it was has moved on.`, "bad", "command");
      continue;
    }
    if (!s || inc.appeared === c.day || inc.id === c.activeIncident) continue;
    const drop = () => { c.incidents = c.incidents.filter(i => i !== inc); };
    // breaches are answered on the spot, so only sightings can run out of time
    if (inc.kind === "recovery" && c.day > inc.expires) {
      drop(); addExposure(c, inc.region, 15); c.stats.missed++;
      log(c, `${inc.title.split(":")[0]} went unanswered.`, "bad", "command");
      goDark(c, s, `The sighting went unanswered (+15 exposure in ${REGIONS[inc.region].name}).`, REGIONS[inc.region].name);
    }
  }
}

/** Mission outcome for the anomaly an incident was about. */
export function resolveScp(c: Campaign, inc: Incident, recovered: boolean) {
  if (inc.first) { firstContact(c, inc, recovered); return; }
  const s = c.scps.find(x => x.id === inc.scpId);
  if (!s) return;
  if (recovered) {
    s.status = "contained";
    s.maintenance = Math.max(s.maintenance, 60);
    s.resurfaceDay = undefined;
  } else {
    goDark(c, s, "The team couldn't stop it.", inc.kind === "recovery" ? REGIONS[inc.region].towns.find(t => inc.title.includes(t)) ?? REGIONS[inc.region].name : "Site-19");
  }
}

// ---- cleaning, tests and moving: D-Class work inside the cell ----

const watcherBlink = (g: Guard) => GUARD.blink + (0.5 - GUARD.blink) * (1 - Math.min(g.san, GUARD.maxSan) / GUARD.maxSan);
/** Chance a D-Class dies working in the cell: two D-Class watch, and any guards posted at the door watch too.
 *  It only happens when every one of them blinks at once. */
export const workRisk = (watchers: Guard[]) => watchers.reduce((p, g) => p * watcherBlink(g), CLEAN_RISK);

export function canClean(c: Campaign, s: ScpRecord): string | null {
  if (s.status !== "contained") return `${s.name} isn't in its cell.`;
  if (c.dclass < CLEAN_CREW) return `Needs ${CLEAN_CREW} D-Class: one cleans while two watch.`;
  return null;
}
function clean(c: Campaign, s: ScpRecord, what: string) {
  s.lastCleaned = c.day; s.maintenance = 100;
  if (!has(c, "auto_cleaning") && Math.random() < CLEAN_RISK) { c.dclass--; dclassDied(c, 1); log(c, `${what} of ${s.name}'s cell went wrong: both watchers blinked at once and the D-Class cleaning was killed.`, "bad"); }
}

/** D-Class work in the cell while operatives watch. `mult` scales the danger; `breach` is an extra
 *  chance the work itself lets it loose. Returns false if it ended in a breach. */
export function cellWork(c: Campaign, s: ScpRecord, watchers: Guard[], what: string, mult = 1, dclass = 1, breach = 0) {
  const risk = Math.min(0.95, workRisk(watchers) * mult);
  for (const o of watchers) o.san = Math.max(0, o.san - 8);
  const names = watchers.length ? `two D-Class and guard${watchers.length > 1 ? "s" : ""} ${watchers.map(o => o.name).join(" and ")}` : "the two D-Class watching";
  const crew = dclass > 1 ? `one of the ${dclass} D-Class inside` : "the D-Class inside";
  if (Math.random() < risk) {
    c.dclass--; dclassDied(c, 1);
    log(c, `During ${what}, ${names} blinked at the same moment. SCP-173 killed ${crew}.`, "bad");
    if (Math.random() < 0.3) { startBreach(c, s, "It got past the door."); return false; }
  } else log(c, `${what[0].toUpperCase() + what.slice(1)}: done, watched by ${names}.`, "good");
  if (breach && Math.random() < breach) { startBreach(c, s, `Something went wrong during ${what}.`); return false; }
  return true;
}

export function cleanCell(c: Campaign, s: ScpRecord) {
  if (canClean(c, s)) return;
  clean(c, s, "A cleaning");
  if (s.lastCleaned === c.day) log(c, `${s.name}'s cell is clean.`, "good");
}

export function canMove(c: Campaign, s: ScpRecord, to: Facility): string | null {
  if (s.status !== "contained") return `${s.name} isn't in its cell.`;
  if (!isContainment(to.type) || !operational(to)) return "Not a working containment wing.";
  if (occupantOf(c, to)) return "That wing is occupied.";
  if ((FACILITIES[to.type].grade ?? 0) < CLASS_GRADE[s.cls]) return `A ${s.cls}-class anomaly needs at least a ${s.cls}-grade wing.`;
  if (c.dclass < 1) return "Needs a D-Class.";
  if (c.funds < MOVE_COST) return `Needs $${MOVE_COST}k.`;
  return null;
}

export function moveScp(c: Campaign, s: ScpRecord, to: Facility, watchers: Guard[]) {
  if (canMove(c, s, to)) return;
  c.funds -= MOVE_COST;
  if (cellWork(c, s, watchers, `the transfer of ${s.name}`) && s.status === "contained") {
    s.wingId = to.id;
    log(c, `${s.name} now held in the ${nameInText(to.type)} on level ${to.level + 1}.`, "key");
  }
}

// ---- new anomalies: first sightings in the world ----

export const SCP_DEFS: Record<ScpId, { name: string; title: string; cls: ScpClass; sighting: string }> = {
  "173": { name: "SCP-173", title: "The Sculpture", cls: "Euclid", sighting: "" },
  "049": { name: "SCP-049", title: "The Plague Doctor", cls: "Euclid", sighting: "a man in a plague doctor's mask, and patients who stopped breathing" },
  "106": { name: "SCP-106", title: "The Old Man", cls: "Keter", sighting: "an old man seen walking through a cellar wall, and people missing from locked rooms" },
};
export const scpName = (id: string) => SCP_DEFS[id as ScpId]?.name ?? `SCP-${id}`;
/** The first sighting of each anomaly not yet found: SCP-049 turns up some time in 1952. */
export const firstSightings = (): Partial<Record<ScpId, number>> => ({ "049": rand(215, 580), "106": rand(580, 945) });
/** Paid when a captured anomaly has to go to another site; Keter-class ones are worth more. */
export const transferBonus = (cls: ScpClass) => cls === "Keter" ? 150 : 100;

export function firstSighting(c: Campaign, id: ScpId) {
  const open = REGION_IDS.filter(r => !c.regions[r].collapsed);
  const region = open[rand(0, open.length - 1)] ?? HOME;
  const towns = REGIONS[region].towns, where = towns[rand(0, towns.length - 1)];
  const d = SCP_DEFS[id];
  const inc: Incident = {
    id: "inc" + c.nextIncident, kind: "recovery", scpId: id, first: true,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: Anomalous sighting near ${where}`,
    appeared: c.day, expires: c.day + travelDays(c, region) + 4,
    insurgents: rand(0, 2), region, map: Math.random() < 0.5 ? "town" : "farm", civilians: rand(3, 4),
  };
  c.nextIncident++;
  c.incidents.push(inc);
  log(c, `Reports from ${where}: ${d.sighting}. Something new. Capture it within ${inc.expires - c.day} days.`, "bad", "command");
}

/** Wings an anomaly could move into: working, empty, and at least its grade. */
export const freeWings = (c: Campaign, cls: ScpClass) => c.base.facilities.filter(f =>
  isContainment(f.type) && operational(f) && !occupantOf(c, f) && (FACILITIES[f.type].grade ?? 0) >= CLASS_GRADE[cls]);

/** A newly found anomaly was caught (or not). Returns a line for the debrief. */
function firstContact(c: Campaign, inc: Incident, caught: boolean) {
  const id = inc.scpId as ScpId, d = SCP_DEFS[id];
  if (caught) {
    const wing = freeWings(c, d.cls)[0];
    if (wing) {
      c.scps.push({ id, name: d.name, title: d.title, cls: d.cls, status: "contained", wingId: wing.id, maintenance: 100, lastCleaned: c.day });
      log(c, `${d.name}, "${d.title}", is now held at Site-19 in the ${nameInText(wing.type)} on level ${wing.level + 1}. New research is open.`, "good");
    } else {
      c.funds += transferBonus(d.cls);
      log(c, `Site-19 has no free ${d.cls}-grade wing, so ${d.name} was handed to another site (+$${transferBonus(d.cls)}k). The chance to study it is gone.`, "key");
    }
  } else {
    c.scps.push({ id, name: d.name, title: d.title, cls: d.cls, status: "loose", wingId: "", maintenance: 0, lastCleaned: c.day, resurfaceDay: c.day + rand(30, 90) });
    log(c, `${d.name} slipped away. It will turn up again.`, "bad");
  }
}

/** Debug: capture an anomaly as if a first-contact mission had been won. */
export const captureNow = (c: Campaign, id: ScpId) => firstContact(c, { scpId: id, first: true } as Incident, true);

export function startingScps(wingId: string): ScpRecord[] {
  return [{ id: "173", name: "SCP-173", title: "The Sculpture", cls: "Euclid", status: "contained", wingId, maintenance: 100, lastCleaned: 1 }];
}
