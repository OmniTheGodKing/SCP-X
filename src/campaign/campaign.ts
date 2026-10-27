// Site-19 between missions: the roster, time passing, funding, public exposure and incidents.
import { HEAVY, type MissionResult, type MissionSetup, type ScpId } from "../game/types";
import { CLASSES, PERKS, TRAITS, type ClassId, type PerkId, type TraitId } from "../data/classes";
import {
  ENGINEER_COST, countOperational, operational, engineerCapacity, dclassCapacity, healPerDay, monthlyUpkeep, sanityPerDay, startingBase, tickConstruction,
  type Base,
} from "./base";
import { CLEAN_EVERY, firstSightings, resolveScp, scpName, startingScps, tickContainment, type ScpRecord } from "./containment";
import { reachMilestone, type Milestone } from "./research";
import { ITEMS, PROJECTS, armorStats, has, projectLock, monthlyResearch, newResearch, tickResearch, type MaterialId, type ItemId, type Order, type ResearchState } from "./research";
import { HOME, REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import { addExposure, collapsedCount, COLLAPSE_LIMIT, newRegions, regionFunding, tickWorld, travelDays, type RegionState } from "./world";
import { RAID, raidArrival, raidLoss, tickRaids, ALERTS, breachGuards, guardMember, guardsReady, mtfArrival, newGuard, rollTrait, tickGuards, type Alert, type Guard } from "./security";
import { MEDALS, rollBio, type MedalId } from "../data/bios";
import { QUALITY, UNITS, rollCandidate, type Candidate, type UnitId } from "../data/units";
import { fitLook, rollLook, type Look } from "../data/looks";
import { cultureOfFamily, familyOf, fullName } from "../data/names";
/** An operative's face: their saved look, or a fixed one drawn from their id. */
export const lookOf = (o: { id: string; sex?: "m" | "f"; look?: Look }) => fitLook(o.look ?? rollLook(o.id, o.sex), o.sex);
import { monthlyStaff, tickStaff, type StaffEvent } from "./staff";
import { tickInspection } from "./inspection";
import { buildReport, type Report } from "./reports";
import { newsFor } from "./news";
import { CLASS_WEAPONS, WEAPON_TIERS, model, startingModels, type AmmoId, type AttachmentId, type WeaponType } from "../data/weapons";

// The US Army's enlisted ladder as it stood in 1951 (Staff Sergeant was dropped in 1948 and came back in 1958).
export const RANKS = ["Private", "Private First Class", "Corporal", "Sergeant", "Sergeant First Class", "Master Sergeant", "Sergeant Major"];
export const RANK_SHORT = ["Pvt", "PFC", "Cpl", "Sgt", "SFC", "MSgt", "SGM"];
export const RANK_XP = [0, 3, 7, 12, 18, 25, 34];
/** Ranks that come with a new perk (Private First Class to Sergeant First Class); the top two give a fixed bonus instead. */
export const PERK_RANKS = 4;
export const RANK_BONUS: Record<number, string> = { 5: "+1 HP and +5 aim", 6: "−2% blink chance and +10 max sanity" };
/** The cheapest recruit in the pool (a standard candidate). */
export const RECRUIT_COST = QUALITY[0].cost;
export const DCLASS_COST = 15;
export const DCLASS_MONTHLY = 6;
export const MONTH = 30;

export interface Operative {
  id: string;
  cls?: ClassId;
  perks: PerkId[];
  traits: TraitId[];
  /** Times they have broken down (shut their eyes at zero sanity), across missions. */
  breakdowns: number;
  /** Away from duty: in therapy or retraining. */
  busy?: { kind: "therapy" | "retrain" | "travel"; daysLeft: number; trait?: TraitId };
  /** Chosen weapon type (one of their class's two) and the attachment fitted to it. */
  weapon?: WeaponType;
  attachment?: AttachmentId;
  ammoType?: AmmoId;
  aftercareUntil?: number;
  /** Extra max sanity from Psychological screening. */
  sanBonus?: number;
  name: string;
  call: string;
  rank: number;
  xp: number;
  hp: number;
  maxHp: number;
  san: number;
  aimBase: number;
  missions: number;
  kills: number;
  alive: boolean;
  diedDay?: number;
  diedAt?: string;
  /** Personnel file: where they're from, their age when recruited, and a line of who they were. */
  bio?: { home: string; age: number; story: string };
  medals?: MedalId[];
  /** Service history beyond missions and kills. */
  wounds?: number;
  seals?: number;
  faced?: string[];
  survivor?: boolean;
  /** Asked to retire and was talked into staying. */
  refusedRetire?: boolean;
  /** Where they were recruited from, and what that gives them in the field. */
  unit?: UnitId;
  sex?: "m" | "f";
  /** Portrait parts; operatives without one get a fixed face drawn from their id. */
  look?: Look;
  fleet?: boolean;
}

/** Someone who left Epsilon-11 alive: as a trainer at the training range, or with an honourable discharge. */
export interface Retiree { name: string; call: string; rank: number; missions: number; day: number; trainer: boolean;
  /** Kept so the person stays recognisable after leaving: their face, unit and record. */
  look?: Look; unit?: UnitId; sex?: "m" | "f"; kills?: number; medals?: MedalId[]; }

export interface Incident {
  id: string;
  kind: "breach" | "recovery" | "coverup" | "strike" | "escort" | "retaliation" | "outbreak" | "riot" | "raid";
  /** Escorts: the survivors of the capture, who defend the convoy. */
  squad?: string[];
  scpId: string;
  /** Where in the world it is, and which field map the mission uses. */
  region: RegionId;
  map: MissionSetup["map"];
  witnesses?: number;
  civilians?: number;
  /** The first time this anomaly has been found: capturing it brings it to Site-19. */
  first?: boolean;
  title: string;
  appeared: number;
  expires: number;
  insurgents: number;
  /** Insurgents removed from this incident by spending Intel. */
  weakened?: number;
}

export interface Prisoner { name: string; days: number; intel: number; }

export interface SiteLogEntry { day: number; text: string; kind: string; }

/** Which armor (an armor item id, or "" for none) and items an operative takes. */
export interface Loadout { opId: string; armor: ItemId | ""; items: ItemId[]; }

export interface Campaign {
  version: 17;
  /** The D-Class block's morale (0 to 100), and the standing order for the monthly termination. */
  morale: number;
  dPolicy: "terminate" | "retain" | "release";
  /** SCP-610: when the first outbreak starts, and the outbreak under way (severity 1 to 5; 0 is burned out). */
  outbreakDay?: number;
  outbreak?: { region: RegionId; severity: number; lastMission: number };
  /** Insurgency attacks on towns, due after captures in a region. */
  retaliations?: { region: RegionId; day: number }[];
  /** Guards issued flak vests through the workshop. */
  guardVests?: boolean;
  /** Material brought back from missions, for studies (like XCOM autopsies). */
  materials: Partial<Record<MaterialId, number>>;
  /** One-off training range purchases (like XCOM's Guerrilla Tactics School). */
  purchases: string[];
  /** When each anomaly not yet found will first be sighted. */
  sightings: Partial<Record<ScpId, number>>;
  /** Site Security, and how ready Epsilon-11 is kept for a breach. */
  guards: Guard[];
  nextGuard: number;
  alert: Alert;
  /** Exposure per region; c.exposure is the global average kept in step by addExposure. */
  regions: Record<RegionId, RegionState>;
  amnestics: number;
  nextCoverupDay: number;
  /** Weapon model currently issued for each type, and the vest tier. */
  models: Record<WeaponType, string>;
  armorTier: number;
  attachments: Partial<Record<AttachmentId, number>>;
  /** Spare loads of special ammunition, and the weapon tier issued (1 service, 2 Foundation, 3 coil). */
  ammo: Partial<Record<AmmoId, number>>;
  weaponTier: number;
  prisoners: Prisoner[];
  intel: number;
  /** Site staff clean containment cells on schedule. */
  cleaningOrder: boolean;
  day: number;
  funds: number;
  exposure: number;
  dclass: number;
  engineers: number;
  researchers: number;
  research: ResearchState;
  inventory: Partial<Record<ItemId, number>>;
  orders: Order[];
  /** Field notes on SCP-173 the Foundation has confirmed, carried into every mission. */
  knownNotes: string[];
  nextD: number;
  nextOp: number;
  nextIncident: number;
  roster: Operative[];
  incidents: Incident[];
  base: Base;
  scps: ScpRecord[];
  log: SiteLogEntry[];
  stats: { won: number; lost: number; missed: number };
  activeIncident?: string;
  over?: string;
  /** Hour of the current day, for the running clock. */
  hour?: number;
  /** Events that paused the clock and haven't been seen yet. */
  notices?: { text: string; tab: HubTab; kind: string }[];
  /** Set once the debug menu has changed this campaign. */
  debug?: boolean;
  /** A staff incident waiting for a decision, staff away on leave, and lingering effects of past ones. */
  staffEvent?: StaffEvent;
  away?: { kind: "researcher" | "engineer"; back: number }[];
  laxUntil?: number;
  moleArmor?: boolean;
  /** The day of the next O5 inspection. */
  inspectionDay?: number;
  /** Incident reports, newest first. */
  archive?: Report[];
  retired?: Retiree[];
  /** The last raid on Site-19 and the last Insurgency cell broken (raids follow strikes). */
  lastRaid?: number;
  lastStrike?: number;
  /** Things that have happened at least once, which open up research. */
  milestones?: Milestone[];
  /** This month's recruit pool in the Command facility. */
  recruits?: Candidate[];
}

// Perks per rank: steadier aim, fewer blinks, more composure.
const medal = (o: Operative, m: MedalId) => !!o.medals?.includes(m);
export const aimOf = (o: Operative) => o.aimBase + o.rank * 4 + (o.rank >= 5 ? 5 : 0) + (medal(o, "distinguished") ? 5 : 0);
export const maxSanOf = (o: Operative) => 100 + o.rank * 5 + (o.sanBonus ?? 0) + (o.rank >= 6 ? 10 : 0) + (medal(o, "survivor") ? 10 : 0);
export const blinkFullOf = (o: Operative) => Math.max(0.03, 0.10 - Math.min(o.rank, 4) * 0.01 - (o.rank >= 6 ? 0.02 : 0) - (medal(o, "iron_nerve") ? 0.02 : 0));
export const newBio = rollBio;
export const deployable = (o: Operative) => o.alive && o.hp >= o.maxHp && !o.busy;
/** An operative who has ranked up but not yet picked their class or perk. */
export const promotionDue = (o: Operative) => o.alive && o.rank > 0 && o.perks.length < Math.min(o.rank, PERK_RANKS);
export const perkChoices = (o: Operative): [PerkId, PerkId] | null =>
  o.cls && o.perks.length >= 1 && o.perks.length < o.rank ? CLASSES[o.cls].choices[o.perks.length - 1] : null;

export function chooseClass(c: Campaign, o: Operative, cls: ClassId) {
  if (!promotionDue(o) || o.cls) return;
  o.cls = cls; o.perks = [CLASSES[cls].base];
  log(c, `${o.call} ${o.name} trains as a ${CLASSES[cls].name.toLowerCase()}: ${PERKS[CLASSES[cls].base].name}.`, "good");
}
export function choosePerk(c: Campaign, o: Operative, p: PerkId) {
  const pair = perkChoices(o);
  if (!pair || !pair.includes(p)) return;
  o.perks.push(p);
  log(c, `${o.call} ${o.name} learns ${PERKS[p].name}.`, "good");
}
function checkPromotion(c: Campaign, o: Operative, out?: string[]) {
  const before = o.rank;
  while (o.rank < RANKS.length - 1 && o.xp >= RANK_XP[o.rank + 1]) o.rank++;
  if (o.rank > before) {
    if (before < 5 && o.rank >= 5) { o.maxHp++; o.hp++; }
    const what = o.rank > PERK_RANKS ? `${RANK_BONUS[o.rank]}.` : `${o.cls ? "Choose a new perk" : "Choose their class"} on the Personnel tab.`;
    const msg = `${o.call} ${o.name} promoted to ${RANKS[o.rank]}. ${what}`;
    if (out) out.push(msg); else log(c, msg, "good", "personnel");
  }
}

export const THERAPY = { cost: 30, days: 7 }, RETRAIN = { cost: 50, days: 5 };
export function canTherapy(c: Campaign, o: Operative): string | null {
  if (!o.traits.some(t => TRAITS[t].bad)) return "No bad traits to treat.";
  if (o.busy) return "Already away from duty.";
  const slots = countOperational(c, "psych"), inUse = c.roster.filter(x => x.busy?.kind === "therapy").length;
  if (!slots) return "Needs psychological services.";
  if (inUse >= slots) return "Psychological services is already treating someone.";
  if (c.funds < THERAPY.cost) return `Needs $${THERAPY.cost}k.`;
  return null;
}
export function startTherapy(c: Campaign, o: Operative, t: TraitId) {
  if (canTherapy(c, o) || !o.traits.includes(t) || !TRAITS[t].bad) return;
  c.funds -= THERAPY.cost;
  o.busy = { kind: "therapy", daysLeft: THERAPY.days, trait: t };
  log(c, `${o.call} ${o.name} begins therapy for ${TRAITS[t].name.toLowerCase()}.`);
}
export function canRetrain(c: Campaign, o: Operative): string | null {
  if (!o.cls) return "They haven't picked a class yet.";
  if (o.busy) return "Already away from duty.";
  if (!countOperational(c, "training")) return "Needs a training range.";
  if (c.funds < RETRAIN.cost) return `Needs $${RETRAIN.cost}k.`;
  return null;
}
export function startRetrain(c: Campaign, o: Operative) {
  if (canRetrain(c, o)) return;
  c.funds -= RETRAIN.cost;
  o.busy = { kind: "retrain", daysLeft: RETRAIN.days };
  log(c, `${o.call} ${o.name} starts retraining. They'll choose a class and perks again in ${RETRAIN.days} days.`);
}

const NAMES = ["Okafor", "Lindqvist", "Reyes", "Haddad", "Novak", "Tanaka", "Mbeki", "Sorensen", "Ortiz", "Kowalski", "Achterberg", "Nwosu", "Petrov", "Duarte", "Iqbal", "Varga", "Castellanos", "Whitlock", "Abara", "Morozova"];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 || w.endsWith("Class") ? "" : "s"}`;
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export type HubTab = "command" | "world" | "site" | "research" | "personnel";
/** Log an entry. Passing a tab also pauses the running clock and shows it as a notice. */
export function log(c: Campaign, text: string, kind = "", pause?: HubTab) {
  c.log.unshift({ day: c.day, text, kind });
  if (pause) (c.notices ??= []).push({ text, tab: pause, kind });
  if (c.log.length > 100) c.log.pop();
}

/** A new rank-0 operative; guards promoted into Epsilon-11 keep their own name. */
// ---- retirement: Master Sergeants and Sergeants Major can stay on as trainers; anyone else leaves with an honourable discharge ----
export const TRAINER = { minRank: 5, max: 2 };
const trainerCount = (c: Campaign) => (c.retired ?? []).filter(r => r.trainer).length;
/** Trainers only teach while there's a working training range. */
export const trainersActive = (c: Campaign) => countOperational(c, "training") ? trainerCount(c) : 0;
export function trainerWhy(c: Campaign, o: Operative): string | null {
  if (o.rank < TRAINER.minRank) return `Only a ${RANKS[TRAINER.minRank]} or ${RANKS[TRAINER.minRank + 1]} can become a trainer.`;
  if (!countOperational(c, "training")) return "Needs a working training range.";
  if (trainerCount(c) >= TRAINER.max) return `There are already ${TRAINER.max} trainers.`;
  return null;
}
export function retire(c: Campaign, o: Operative) {
  if (!o.alive || o.busy) return;
  const trainer = !trainerWhy(c, o);
  c.roster = c.roster.filter(x => x !== o);
  (c.retired ??= []).push({ name: o.name, call: o.call, rank: o.rank, missions: o.missions, day: c.day, trainer,
    look: lookOf(o), unit: o.unit, sex: o.sex, kills: o.kills, medals: [...(o.medals ?? [])] });
  log(c, trainer ? `${RANKS[o.rank]} ${o.name} retires from the field to train recruits at the range. New operatives arrive as Privates First Class.`
    : `${o.call} ${o.name} leaves Epsilon-11 with an honourable discharge after ${plural(o.missions, "mission")}.`, "key");
}

export function makeOperative(c: Campaign, given?: string): Operative {
  const used = new Set([...c.roster.map(o => familyOf(o.name)), ...(c.retired ?? []).map(r => familyOf(r.name))]);
  const name = given ?? fullName(cultureOfFamily(NAMES.find(n => !used.has(n)) ?? "Callahan"), "m", used);
  const n = c.nextOp++;
  const steady = has(c, "psych_screening") && Math.random() < 0.25;
  const trained = trainersActive(c) > 0;
  return { sanBonus: has(c, "psych_screening") ? 10 : 0, id: "op" + n, name, call: `E11-${String(n).padStart(2, "0")}`, rank: trained ? 1 : 0, xp: trained ? RANK_XP[1] : 0, hp: 7, maxHp: 7, san: 100, aimBase: rand(64, 74), missions: 0, kills: 0, alive: true, perks: [], traits: steady ? ["steady"] : [], breakdowns: 0, bio: newBio(), medals: [], wounds: 0, seals: 0, faced: [] };
}

export function newCampaign(): Campaign {
  const base = startingBase();
  const wing = base.facilities.find(f => f.type === "cont_euclid")!;
  const c: Campaign = {
    version: 17, morale: 60, dPolicy: "terminate", outbreakDay: rand(945, 1310), materials: {}, purchases: [], sightings: firstSightings(), guards: [], nextGuard: 1, alert: "normal", regions: newRegions(10), amnestics: 4, nextCoverupDay: 20 + rand(0, 15), models: startingModels(), armorTier: 0, attachments: {}, ammo: {}, weaponTier: 1, prisoners: [], intel: 0, cleaningOrder: true,
    day: 1, funds: 400, exposure: 10, dclass: 6, engineers: 6, researchers: 2, research: newResearch(),
    inventory: {}, orders: [], knownNotes: [], nextD: 9101, nextOp: 1, nextIncident: 1,
    roster: [], incidents: [], base, scps: startingScps(wing.id), log: [], stats: { won: 0, lost: 0, missed: 0 },
  };
  // the founding team comes from the same special forces units as later recruits (standard quality, no traits)
  const used = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const k = rollCandidate(`start-${i}`, 1951, used);
    c.roster.push(operativeFrom(c, { ...k, quality: 0, trait: undefined }));
  }
  refreshRecruits(c);
  const station = c.base.facilities.find(f => f.type === "security");
  for (let i = 0; i < 2; i++) { const g = newGuard(c); g.stationId = station?.id; c.guards.push(g); }
  log(c, "Site-19 Command is online. SCP-173 is held in the Euclid wing on level 2. Keep its cell clean, keep it watched, and keep Epsilon-11 ready for when it gets out.", "key");
  return c;
}

// The campaign opens on 1 June 1951. Day 1 is that date.
const START = Date.UTC(1951, 5, 1);
export const dateOf = (day: number) => new Date(START + (day - 1) * 86400000);
export const yearOf = (day: number) => dateOf(day).getUTCFullYear();
export const dayOfMonth = (day: number) => dateOf(day).getUTCDate();
export const monthOf = (day: number) => { const d = dateOf(day); return (d.getUTCFullYear() - 1951) * 12 + d.getUTCMonth() - 4; };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const dateText = (day: number) => { const d = dateOf(day); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const monthName = (day: number) => { const d = dateOf(day); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
/** Each front sends its own share of funding, less the more exposed it is. */
export const monthlyFunding = (c: Campaign) => Math.round(REGION_IDS.reduce((a, r) => a + regionFunding(c, r), 0) * (has(c, "front_accounting") ? 1.1 : 1));

/** Advance one day. Returns true if something happened that needs the player's attention. */
export function advanceDay(c: Campaign) {
  if (c.over) return false;
  // a breach is answered on the spot: time stands still until it's dealt with
  if (pendingBreach(c)) return true;
  const incidentsBefore = c.incidents.length, logBefore = c.log.length;
  c.day++;
  for (const line of tickConstruction(c)) log(c, line, "good", "site");
  tickResearch(c);
  const heal = healPerDay(c), calm = sanityPerDay(c) * ALERTS[c.alert].sanity;
  const drill = countOperational(c, "training") > 0 && (c.day % 7 === 0 || (has(c, "bt_drills") && c.day % 7 === 3));
  for (const o of c.roster) if (o.alive) {
    o.hp = Math.min(o.maxHp, o.hp + heal);
    const rest = (o.traits.includes("hollow") ? calm / 2 : calm) + ((o.aftercareUntil ?? 0) >= c.day ? 10 : 0);
    o.san = Math.min(maxSanOf(o), o.san + rest);
    if (o.busy && --o.busy.daysLeft <= 0) {
      if (o.busy.kind === "therapy" && o.busy.trait) {
        o.traits = o.traits.filter(t => t !== o.busy!.trait);
        log(c, `${o.call} ${o.name} finished therapy. ${TRAITS[o.busy.trait].name} is gone.`, "good", "personnel");
      } else if (o.busy.kind === "travel") {
        log(c, `${o.call} ${o.name} is back at Site-19.`);
      } else {
        o.cls = undefined; o.perks = [];
        log(c, `${o.call} ${o.name} finished retraining. Choose their new class on the Personnel tab.`, "good", "personnel");
      }
      o.busy = undefined;
    }
    if (drill && !o.busy) { o.xp++; checkPromotion(c, o); }
  }
  tickGuards(c, heal, sanityPerDay(c));
  tickMorale(c);
  tickRaids(c);
  tickStaff(c);
  tickInspection(c);
  if (c.guards.some(g => g.alive && g.breaches >= 3)) reachMilestone(c, "guard_veteran");
  tickContainment(c);
  tickWorld(c);
  for (const s of c.scps) if (s.status === "contained" && c.day - s.lastCleaned === CLEAN_EVERY)
    log(c, `${s.name}'s cell is due for cleaning. Skipping it lets debris build up and raises the breach risk.`, "key");
  tickPrisoners(c);
  if (dayOfMonth(c.day) === 1) {
    monthlyResearch(c);
    monthlyDClass(c);
    monthlyStaff(c);
    refreshRecruits(c);
    if (has(c, "sigint")) gainIntel(c, 1);
    const funds = monthlyFunding(c), upkeep = monthlyUpkeep(c);
    const room = Math.max(0, dclassCapacity(c) - c.dclass), d = Math.min(DCLASS_MONTHLY, room);
    c.funds += funds - upkeep; c.dclass += d;
    for (const r of REGION_IDS) addExposure(c, r, -3);   // the public slowly forgets
    { const last = dateOf(c.day - 1);
      for (const n of newsFor(last.getUTCFullYear(), last.getUTCMonth() + 1)) log(c, `In the news: ${n.text}${n.note ? ` ${n.note}` : ""}`, n.effect ? "key" : ""); }
    log(c, `${monthName(c.day)}: the fronts pass on $${funds}k (less where exposure is high); upkeep and salaries cost $${upkeep}k. ${d} D-Class transferred in${d < DCLASS_MONTHLY ? " (the barracks are full)" : ""}. Exposure eases by 3 in every region.`, "key", "command");
  }
  checkOver(c);
  return c.incidents.length > incidentsBefore || c.log.length !== logBefore || !!c.over;
}

/** Something that has to be answered before time can move: a breach, or an ambushed convoy. */
export const pendingBreach = (c: Campaign) => c.incidents.find(i => (i.kind === "breach" || i.kind === "escort" || i.kind === "riot" || i.kind === "raid") && i.id !== c.activeIncident) ?? null;

// ---------- the D-Class block ----------
export const MORALE = { start: 60, riotBelow: 30, perDeath: 5, terminate: 15, keep: 10, retainCost: 2 };
/** D-Class died somewhere: the block hears about it. */
export function dclassDied(c: Campaign, n: number) { if (n > 0) c.morale = Math.max(0, (c.morale ?? MORALE.start) - MORALE.perDeath * n); }
function tickMorale(c: Campaign) {
  const cap = dclassCapacity(c), full = cap ? c.dclass / cap : 1;
  const rec = c.base.facilities.some(f => f.type === "barracks" && f.recreation && operational(f));
  c.morale = Math.max(0, Math.min(100, (c.morale ?? MORALE.start) + (full > 0.8 ? -2 : full < 0.6 ? 1 : 0) + (rec ? 1 : 0)));
  // below 30 the block can riot: up to 5% a day at 0
  if (c.morale < MORALE.riotBelow && c.dclass >= 3 && !c.incidents.some(i => i.kind === "riot") && Math.random() < (MORALE.riotBelow - c.morale) / 600) startRiot(c);
}
export function startRiot(c: Campaign) {
  const inc: Incident = { id: "inc" + c.nextIncident, kind: "riot", scpId: "", region: HOME, map: "dblock", appeared: c.day, expires: c.day, insurgents: 0,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: Riot in the D-Class block` };
  c.nextIncident++; c.incidents.push(inc);
  log(c, "The D-Class block is rioting. Site Security has to put it down, or you can leave it to them.", "bad", "command");
}
/** The monthly termination order (canon), or keeping or releasing them instead. */
function monthlyDClass(c: Campaign) {
  const extra = Math.max(0, c.dclass - MORALE.keep);
  if (c.dPolicy === "terminate" && extra) {
    c.dclass -= extra; c.morale = Math.max(0, c.morale - MORALE.terminate);
    log(c, `The monthly termination order: ${extra} D-Class terminated, ${c.dclass} kept. The block knows (morale −${MORALE.terminate}).`, "key");
  } else if (c.dPolicy === "release" && extra) {
    const n = Math.min(extra, c.amnestics * 5);
    c.amnestics -= Math.ceil(n / 5); c.dclass -= n;
    log(c, `${n} D-Class were dosed with amnestics and released (${Math.ceil(n / 5)} doses).${n < extra ? " There weren't enough doses for the rest." : ""}`, "key");
  } else if (c.dPolicy === "retain" && c.dclass) {
    c.funds -= c.dclass * MORALE.retainCost;
    log(c, `Keeping all ${c.dclass} D-Class costs $${c.dclass * MORALE.retainCost}k this month.`);
  }
}
export const riotSize = (c: Campaign) => Math.min(c.dclass, 10, 5 + Math.floor(c.dclass / 5));

/** Advance until something needs attention. */
export function advanceToEvent(c: Campaign) {
  for (let i = 0; i < 400 && !c.over; i++) if (advanceDay(c)) break;
}

// ---------- prisoners and Intel ----------
export const holdingCapacity = (c: Campaign) => countOperational(c, "holding") * 4;
export const INTERROGATION_DAYS = 10, INTEL_PER_PRISONER = 3, PRISONER_BOUNTY = 25;
export const interrogationDays = (c: Campaign) => has(c, "interrogation") ? INTERROGATION_DAYS / 2 : INTERROGATION_DAYS;
/** Intel coming in also counts toward the codebooks study. */
export function gainIntel(c: Campaign, n: number) { c.intel += n; c.materials.intelTotal = (c.materials.intelTotal ?? 0) + n; }
export const addMaterial = (c: Campaign, m: MaterialId, n: number) => { if (n > 0) c.materials[m] = (c.materials[m] ?? 0) + n; };
function tickPrisoners(c: Campaign) {
  if (!countOperational(c, "holding")) return;
  for (const p of [...c.prisoners]) {
    if (++p.days % interrogationDays(c)) continue;
    p.intel++; gainIntel(c, 1);
    if (p.intel >= INTEL_PER_PRISONER) {
      c.prisoners = c.prisoners.filter(x => x !== p);
      log(c, `Interrogation of ${p.name} is finished (+1 Intel). They are transferred out of Site-19.`, "good");
    } else log(c, `Interrogating ${p.name} yields +1 Intel.`, "good");
  }
}
/** Spend Intel before a mission: one fewer Insurgent at that incident. */
export function canWeaken(c: Campaign, inc: Incident) {
  if (c.intel < 1) return "No Intel to spend.";
  if (inc.insurgents - (inc.weakened ?? 0) <= 0) return "No Insurgents left to remove.";
  return null;
}
export function weaken(c: Campaign, inc: Incident) {
  if (canWeaken(c, inc)) return;
  c.intel--; inc.weakened = (inc.weakened ?? 0) + 1;
  log(c, `Intel used: Site security intercepts one of the Insurgents headed for ${inc.title.split(":")[0]}.`, "good");
}

// ---------- weapons ----------
export const weaponOptions = (o: Operative): WeaponType[] => o.cls ? CLASS_WEAPONS[o.cls] : ["rifle"];
export const weaponOf = (o: Operative): WeaponType => o.weapon && weaponOptions(o).includes(o.weapon) ? o.weapon : weaponOptions(o)[0];
export function setWeapon(c: Campaign, o: Operative, t: WeaponType) { if (weaponOptions(o).includes(t)) o.weapon = t; }
export function fitAttachment(c: Campaign, o: Operative, a: AttachmentId | "") {
  if (a && !(c.attachments[a] ?? 0)) return;
  if (o.attachment) c.attachments[o.attachment] = (c.attachments[o.attachment] ?? 0) + 1;
  o.attachment = a || undefined;
  if (a) c.attachments[a]!--;
}
export function gunFor(c: Campaign, o: Operative) {
  const t = weaponOf(o), m = model(c.models[t]), a = o.attachment;
  const tier = WEAPON_TIERS[c.weaponTier ?? 1];
  const mag = m.mag + (a === "extmag" ? 1 : 0), extra = (t === "rifle" && has(c, "bt_barrels") ? 1 : 0) + tier.dmg;
  return { name: tier.name ? `${tier.name} ${m.name}` : m.name, type: t, dmg: [m.dmg[0] + extra, m.dmg[1] + extra] as [number, number], mag, ammo: mag, aim: m.aim + tier.aim,
    attachment: a, ammoType: o.ammoType, pierce: tier.pierce + (o.ammoType === "ap" ? 1 : 0) };
}
export function loadAmmo(c: Campaign, o: Operative, a: AmmoId | "") {
  if (a && !(c.ammo[a] ?? 0)) return;
  if (o.ammoType) c.ammo[o.ammoType] = (c.ammo[o.ammoType] ?? 0) + 1;
  o.ammoType = a || undefined;
  if (a) c.ammo[a]!--;
}

function checkOver(c: Campaign) {
  if (c.over) return;
  if (collapsedCount(c) >= COLLAPSE_LIMIT) {
    c.over = `${COLLAPSE_LIMIT} fronts have collapsed and the anomalous is becoming public knowledge. The O5 Council has relieved Site-19's command.`;
    log(c, c.over, "bad");
  } else if (!c.roster.some(o => o.alive) && c.funds < RECRUIT_COST) {
    c.over = "Epsilon-11 is gone and there is no money to rebuild it. Site-19 can no longer answer breaches.";
    log(c, c.over, "bad");
  }
}

// ---- the recruit pool: special forces candidates from around the world, refreshed every month ----
export const POOL_SIZE = [4, 6];
export function refreshRecruits(c: Campaign) {
  const used = new Set([...c.roster.map(o => familyOf(o.name)), ...(c.retired ?? []).map(r => familyOf(r.name))]);
  const liaison = has(c, "liaison_office"), extra = liaison ? 2 : 0;
  c.recruits = Array.from({ length: rand(POOL_SIZE[0], POOL_SIZE[1]) + extra }, (_, i) => rollCandidate(`cand${c.day}-${i}`, yearOf(c.day), used, liaison, has(c, "joint_exchange")));
}
export const candidateCost = (k: Candidate) => QUALITY[k.quality].cost;
export function canHire(c: Campaign, k: Candidate): string | null {
  if (c.over) return "The campaign is over.";
  if (c.funds < candidateCost(k)) return `Needs $${candidateCost(k)}k.`;
  return null;
}
export function hireCandidate(c: Campaign, k: Candidate) {
  if (canHire(c, k)) return;
  c.funds -= candidateCost(k);
  c.recruits = (c.recruits ?? []).filter(x => x !== k);
  const o = operativeFrom(c, k);
  c.roster.push(o);
  log(c, `${o.call} ${o.name}, from the ${UNITS[k.unit].name}, joins Epsilon-11.`, "good");
}
/** An operative made from a candidate: their unit, look, file, lean, quality and trait. */
function operativeFrom(c: Campaign, k: Candidate): Operative {
  const o = makeOperative(c, k.name);
  Object.assign(o, { unit: k.unit, sex: k.sex, aimBase: k.aimBase, bio: { home: k.home, age: k.age, story: k.story }, look: rollLook(k.id, k.sex) });
  const lean = UNITS[k.unit].lean;
  if (lean === "aim") o.aimBase += 6;
  else if (lean === "san") o.sanBonus = (o.sanBonus ?? 0) + 15;
  else if (lean === "hp") { o.maxHp++; o.hp++; }
  else o.fleet = true;
  if (k.quality >= 1 && o.rank < 1) { o.rank = 1; o.xp = RANK_XP[1]; }
  if (k.trait && !o.traits.includes(k.trait)) o.traits.push(k.trait);
  o.san = maxSanOf(o);
  return o;
}

export const canBuyDClass = (c: Campaign) =>
  c.funds < DCLASS_COST * 2 ? `Needs $${DCLASS_COST * 2}k.` : c.dclass + 2 > dclassCapacity(c) ? "The barracks are full." : null;
export function buyDClass(c: Campaign) {
  if (canBuyDClass(c)) return;
  c.funds -= DCLASS_COST * 2; c.dclass += 2;
  log(c, "Two more D-Class transferred to Site-19.");
}

export const canHireEngineer = (c: Campaign) =>
  c.funds < ENGINEER_COST ? `Needs $${ENGINEER_COST}k.` : c.engineers >= engineerCapacity(c) ? `Site-19 can house ${engineerCapacity(c)} engineers. A workshop adds room for 4 more.` : null;
export function hireEngineer(c: Campaign) {
  if (canHireEngineer(c)) return;
  c.funds -= ENGINEER_COST; c.engineers++;
  log(c, "An engineer joins the site staff.");
}

export function buildSetup(c: Campaign, inc: Incident, loadouts: Loadout[], dCount: number): MissionSetup {
  // the armoury mole's leak: the next Insurgents met know what our rounds can get through
  const mole = !!c.moleArmor && inc.insurgents - (inc.weakened ?? 0) > 0;
  if (mole) c.moleArmor = false;
  const take = (i: ItemId) => { c.inventory[i] = (c.inventory[i] || 0) - 1; };
  const squad = loadouts.map(l => {
    const o = c.roster.find(x => x.id === l.opId)!;
    const kind = l.armor && (c.inventory[l.armor] ?? 0) > 0 ? l.armor : "";
    if (kind) take(kind);
    const st = kind ? armorStats(kind, c.armorTier) : { hp: 0, points: 0, move: 0 };
    // heavy weapons only go with heavy armor
    const items = l.items.filter(i => kind === "armor_heavy" || !HEAVY.includes(i));
    items.forEach(take);
    const bonus = st.hp;
    return {
      opId: o.id, name: o.name, call: o.call, hp: o.hp + bonus, maxHp: o.maxHp + bonus, san: Math.min(o.san, maxSanOf(o)),
      rankShort: RANK_SHORT[o.rank], maxSan: maxSanOf(o), aim: aimOf(o) + (has(c, "marksmanship") ? 5 : 0), blinkFull: blinkFullOf(o), medals: [...(o.medals ?? [])],
      armor: st.points, hasArmor: !!kind, armorKind: kind || undefined, armorHp: st.hp, moveBonus: st.move + (o.fleet ? 1 : 0), items: items.map(id => ({ id, uses: ITEMS[id].uses ?? 1 })),
      cls: o.cls, perks: [...o.perks], traits: [...o.traits], gun: gunFor(c, o),
    };
  }).map(m => {
    // traits and the Marksman perk adjust the numbers they deploy with
    if (m.perks.includes("marksman")) m.aim += 10;
    if (m.traits.includes("gunshy")) m.aim -= 10;
    if (m.traits.includes("twitchy")) m.blinkFull += 0.03;
    if (m.traits.includes("steady")) m.blinkFull = Math.max(0.02, m.blinkFull - 0.02);
    if (m.traits.includes("nightmares")) m.san = Math.max(1, m.san - 15);
    return m;
  });
  const dclass: string[] = [];
  for (let i = 0; i < dCount; i++) dclass.push("D-" + c.nextD++);
  c.dclass -= dCount;
  c.activeIncident = inc.id;
  const kind = inc.kind === "recovery" ? "manhunt" : inc.kind;
  const sec = kind === "breach" ? breachGuards(c, inc) : kind === "riot" || kind === "raid" ? { first: guardsReady(c).slice(0, 8).map(g => guardMember(c, g)), late: [] } : { first: [], late: [] };
  const amnestics = kind === "coverup" ? c.amnestics : 0;
  return {
    kind, scp: (inc.scpId || "173") as ScpId, map: inc.map, amnestics,
    night: inc.map !== "wingC" && ((c.hour ?? 0) < 6 || (c.hour ?? 0) >= 20),
    severity: inc.kind === "outbreak" ? c.outbreak?.severity ?? 2 : undefined,
    rioters: inc.kind === "riot" ? riotSize(c) : undefined,
    // a breach at Site-19 catches researchers in the wing and opens the D-Class block
    researchers: kind === "breach" ? Math.min(c.researchers, rand(1, 3)) : 0, strayPool: kind === "breach" ? c.dclass : 0, guards: sec.first, lateGuards: sec.late, mtfTurn: kind === "raid" ? raidArrival(c) : mtfArrival(c, inc), witnesses: inc.witnesses ?? 0, civilians: inc.civilians ?? 0,
    incidentId: inc.id, title: inc.title.split(": ")[1] || inc.title, insurgents: Math.max(0, inc.insurgents - (inc.weakened ?? 0)), squad, dclass,
    year: yearOf(c.day),
    known: [...c.knownNotes],
    insurgentArmor: (yearOf(c.day) >= 1954 ? 1 : 0) + (mole ? 1 : 0),
    mods: {
      blinkBonus: has(c, "blink_cadence") ? 0.02 : 0,
      recoverBonus: has(c, "trauma_counseling") ? 3 : 0,
      mtfDrag: has(c, "powered_jack") ? 2 : 1,
      track173: has(c, "movement_study"),
      m79: has(c, "m79"),
      lockdownTurns: has(c, "early_warning") ? 8 : 5,
      calmTurns: has(c, "pestilence_theory") ? 2 : 1,
      pocketReturn: has(c, "pocket_study") ? 0.5 : 0.25,
      medkitHeal: has(c, "field_medicine") ? 4 : 3,
      standUp: has(c, "field_medicine"),
      reactionBonus: has(c, "field_radios") ? 5 : 0,
      sightBonus: has(c, "night_optics") ? 2 : 0,
      ciAnalysis: has(c, "weapon_analysis"),
      strays: has(c, "cell_lock") ? 1 : 4,
      alarms: has(c, "perimeter_alarms"),
    },
  };
}

/** What the O5 Council pays for each kind of mission won ($k). The World Map briefing shows the same figures. */
export const MISSION_BONUS: Partial<Record<Incident["kind"], number>> = { recovery: 100, strike: 80, breach: 50, retaliation: 40, outbreak: 120, raid: 60 };

export interface Debrief { lines: string[]; promotions: string[]; }

export function applyResult(c: Campaign, r: MissionResult): Debrief {
  const lines: string[] = [], promotions: string[] = [];
  const inc = c.incidents.find(i => i.id === r.incidentId);
  c.incidents = c.incidents.filter(i => i.id !== r.incidentId);
  c.activeIncident = undefined;
  const name = inc ? inc.title.split(":")[0] : "Incident";

  for (const s of r.squad) {
    // reinforcements who never arrived just bring their gear back
    if (s.absent) {
      if (s.armorKind) c.inventory[s.armorKind] = (c.inventory[s.armorKind] || 0) + 1;
      for (const it of s.items) if (it.uses > 0) c.inventory[it.id] = (c.inventory[it.id] || 0) + 1;
      continue;
    }
    const g = c.guards.find(x => x.id === s.opId);
    if (g) {
      if (!s.alive) { g.alive = false; g.hp = 0; g.diedDay = c.day; lines.push(`Guard ${g.name} was killed in the breach.`); continue; }
      g.hp = Math.max(1, Math.min(g.maxHp, s.hp)); g.san = s.san; g.kills += s.kills; g.breaches++;
      for (const t of [rollTrait(c, g, "nightmares", s.witnessed >= 2), rollTrait(c, g, "twitchy", s.panics > 0), rollTrait(c, g, "gunshy", s.minHp <= 2), rollTrait(c, g, "steady", s.bestStreak >= 5)])
        if (t) promotions.push(t);
      if (g.breaches === 3) promotions.push(`Guard ${g.name} has survived 3 breaches and can be put forward for Epsilon-11 on the Personnel tab.`);
      continue;
    }
    const o = c.roster.find(x => x.id === s.opId);
    if (!o) continue;
    o.missions++;
    if (!s.alive) {
      o.alive = false; o.hp = 0; o.diedDay = c.day; o.diedAt = name;
      lines.push(`${o.call} ${o.name} was killed in action.`);
      continue;
    }
    // armor soaks wounds first; gear comes home with whoever survived
    o.hp = Math.max(1, Math.min(o.maxHp, s.hp - (s.armorHp ?? 0)));
    o.san = s.san; o.kills += s.kills;
    if (s.armorKind) c.inventory[s.armorKind] = (c.inventory[s.armorKind] || 0) + 1;
    for (const it of s.items) if (it.uses > 0) c.inventory[it.id] = (c.inventory[it.id] || 0) + 1;
    o.xp += 1 + (r.win ? 2 : 0) + s.kills + (s.sealed ? 1 : 0);
    // service history, and the medals it earns
    if (s.minHp < o.maxHp) o.wounds = (o.wounds ?? 0) + 1;
    if (s.sealed) o.seals = (o.seals ?? 0) + 1;
    if (s.returned) o.survivor = true;
    const facedNow = inc?.scpId ? scpName(inc.scpId) : inc?.kind === "strike" || inc?.kind === "retaliation" || inc?.kind === "escort" ? "the Chaos Insurgency" : "";
    if (facedNow && !(o.faced ??= []).includes(facedNow)) o.faced.push(facedNow);
    const award = (m: MedalId, hit: boolean) => {
      if (!hit || medal(o, m)) return;
      (o.medals ??= []).push(m);
      if (m === "purple_heart") { o.maxHp++; o.hp++; }
      promotions.push(`${o.call} ${o.name} is awarded the ${MEDALS[m].name}: ${MEDALS[m].bonus}`);
    };
    award("sealed_in", (o.seals ?? 0) >= 3);
    award("iron_nerve", s.bestStreak >= 10);
    award("purple_heart", (o.wounds ?? 0) >= 3);
    award("survivor", !!s.returned);
    award("distinguished", o.missions >= 15);
    checkPromotion(c, o, promotions);
    o.breakdowns += s.panics;
    if (r.aftercare) o.aftercareUntil = c.day + 7;
    // what happened to them may leave a mark: each trigger sticks half the time
    const earned: TraitId[] = [];
    const roll = (t: TraitId, hit: boolean) => { if (hit && !o.traits.includes(t) && Math.random() < 0.5) { o.traits.push(t); earned.push(t); } };
    roll("nightmares", s.witnessed >= 2 || !!o.refusedRetire);
    roll("twitchy", s.panics > 0);
    roll("gunshy", s.minHp <= 2);
    roll("hollow", o.breakdowns >= 2);
    roll("steady", s.bestStreak >= 5);
    roll("hardened", o.missions >= 5);
    for (const t of earned) promotions.push(`${o.call} ${o.name} is now ${TRAITS[t].bad ? "marked by" : "known for"} ${TRAITS[t].name.toLowerCase()}: ${TRAITS[t].desc}`);
  }

  c.dclass += r.dReturned;
  // breach losses among the staff: researchers, and D-Class from the block
  if (r.researchersLost) { c.researchers = Math.max(0, c.researchers - r.researchersLost); lines.push(`${plural(r.researchersLost, "researcher")} didn't make it out of the wing.`); }
  if (r.researchersRescued) {
    lines.push(`${plural(r.researchersRescued, "researcher")} brought out alive. The team takes heart (+${5 * r.researchersRescued} sanity).`);
    for (const s of r.squad) { const o = c.roster.find(x => x.id === s.opId); if (o && s.alive && !s.absent) o.san = Math.min(maxSanOf(o), o.san + 5 * r.researchersRescued); }
  }
  if (r.straysLost || r.straysEscaped) {
    c.dclass = Math.max(0, c.dclass - r.straysLost - r.straysEscaped);
    dclassDied(c, r.straysLost);
    if (r.straysLost) lines.push(`${plural(r.straysLost, "D-Class")} from the block ${r.straysLost > 1 ? "were" : "was"} lost in the breach.`);
    if (r.straysEscaped) { addExposure(c, HOME, 3 * r.straysEscaped); lines.push(`${plural(r.straysEscaped, "D-Class")} got out of Site-19 and will talk (+${3 * r.straysEscaped} exposure in the Eastern US).`); }
  }
  // material for studies, brought home from a won mission
  if (r.win) { addMaterial(c, "ciWeapons", r.insurgentsDown); addMaterial(c, "tissue", r.zombiesKilled); }
  addMaterial(c, "survivors", r.pocketReturned);
  addMaterial(c, "prisoners", r.prisoners);
  // film from the field camera: a head start on research into what was photographed
  for (const id of r.photos) {
    const branch = `SCP-${id}`, p = Object.keys(PROJECTS).find(k => PROJECTS[k].branch === branch && !has(c, k) && !projectLock(c, k));
    if (p) { c.research.progress[p] = (c.research.progress[p] || 0) + 10; lines.push(`Photographs of ${scpName(id)} put 10 researcher-days into ${PROJECTS[p].name}.`); }
    else lines.push(`Photographs of ${scpName(id)} are filed for later.`);
  }
  for (let i = 0; i < r.prisoners; i++) {
    const name = `Insurgent prisoner ${c.nextIncident * 10 + i}`;
    if (r.restraints) { gainIntel(c, 1); lines.push("The restraint kit kept a prisoner talking on the way back (+1 Intel)."); }
    if (c.prisoners.length < holdingCapacity(c)) { c.prisoners.push({ name, days: 0, intel: 0 }); lines.push(`An Insurgent was taken alive and is held for interrogation.`); }
    else { c.funds += PRISONER_BOUNTY; lines.push(`An Insurgent was taken alive. With no room in holding cells, they were handed to another site (+$${PRISONER_BOUNTY}k).`); }
  }
  for (const n of r.known) if (!c.knownNotes.includes(n)) c.knownNotes.push(n);
  const region = inc?.region ?? HOME, where = REGIONS[region].name;
  const kind = inc?.kind ?? "breach";
  c.amnestics = Math.max(0, c.amnestics - r.amnesticsUsed);
  if (r.win) {
    c.stats.won++;
    const bonus = MISSION_BONUS[kind] ?? 0;
    const cut = kind === "coverup" ? 10 : kind === "riot" || kind === "raid" ? 0 : 5;
    addExposure(c, region, -cut);
    c.funds += bonus;
    const anomaly = scpName(inc?.scpId || "173");
    const what = kind === "coverup" ? "The witnesses remember nothing worth repeating." : kind === "strike" ? "The Insurgency cell is broken up."
      : kind === "riot" ? "The D-Class block is quiet again." : kind === "raid" ? "The Insurgency raid on Site-19 is beaten off." : kind === "outbreak" ? "The flesh here is burned out." : kind === "escort" ? `The convoy got ${anomaly} through.` : kind === "retaliation" ? "The Insurgency attack on the town is broken." : inc?.first ? `${anomaly} is in Foundation hands.` : `${anomaly} is back in its cell.`;
    lines.unshift(`${name} closed. ${what}${bonus ? ` The O5 Council approves a $${bonus}k bonus${cut ? ";" : "."}` : ""}${cut ? ` exposure in ${where} −${cut}.` : ""}`);
  } else {
    c.stats.lost++;
    if (kind === "raid") lines.unshift(`${name} failed. The Insurgency reached the lift. ${raidLoss(c).join(" ")}`);
    else if (kind === "riot") lines.unshift(`${name} failed. Site Security lost the block; it took a gas-and-baton sweep by the whole garrison to retake it.`);
    else { addExposure(c, region, 20);
    lines.unshift(`${name} failed${r.escaped ? `: SCP-173 got out through the surface hatch` : r.evacuated ? " after the team evacuated" : ""}. ${REGIONS[region].front} has to clean up after it (+20 exposure in ${where}).`); }
  }
  if (r.witnessesEscaped) { addExposure(c, region, r.witnessesEscaped * 5); lines.push(`${r.witnessesEscaped} witness${r.witnessesEscaped > 1 ? "es" : ""} got away undosed (+${r.witnessesEscaped * 5} exposure in ${where}).`); }
  if (r.civiliansKilled) { addExposure(c, region, r.civiliansKilled * 3); lines.push(`${r.civiliansKilled} civilian${r.civiliansKilled > 1 ? "s" : ""} died (+${r.civiliansKilled * 3} exposure in ${where}).`); }
  if (r.amnesticsUsed) lines.push(`Amnestics used: ${r.amnesticsUsed}.`);
  if (r.dSent || r.dRecruited) lines.push(`D-Class: ${r.dSent} sent, ${r.dLost} lost, ${r.dReturned} back in holding${r.dRecruited ? ` (including ${r.dRecruited} picked up on site)` : ""}.`);
  if (r.insurgentsTotal) lines.push(`Insurgents neutralised: ${r.insurgentsDown} of ${r.insurgentsTotal}.`);
  if (kind === "riot") {
    c.dclass = Math.max(0, c.dclass - r.riotersKilled - (r.win ? 0 : 3));
    c.morale = 40;
    if (r.riotersKilled) lines.push(`${plural(r.riotersKilled, "D-Class")} killed putting the riot down.`);
    if (!r.win) lines.push("The riot burned itself out after Site Security pulled back. 3 more D-Class are gone.");
  }
  if (r.infectedLost) lines.push(`${r.infectedLost} lost to SCP-610's infection. There was nothing anyone could do.`);
  // an outbreak is only beaten back a stage at a time
  if (kind === "outbreak" && c.outbreak) {
    c.outbreak.severity = Math.max(0, Math.min(5, c.outbreak.severity + (r.win ? -1 : 1)));
    c.outbreak.lastMission = c.day;
    if (c.outbreak.severity === 0) { lines.push(`SCP-610 in ${where} is burned out for good.`); c.outbreak = undefined; }
    else {
      lines.push(`SCP-610 outbreak in ${where}: severity ${c.outbreak.severity} of 5.`);
      c.incidents.push({ ...inc!, id: "inc" + c.nextIncident++, title: `${inc!.title.split(":")[0]}: SCP-610 outbreak, severity ${c.outbreak.severity}`, appeared: c.day });
    }
  }
  // a capture far from home has to get back: the convoy may be ambushed on the way (XCOM-style follow-up)
  const capture = r.win && inc && inc.kind === "recovery" && inc.scpId;
  const ambush = capture && travelDays(c, inc!.region) > 0 && r.squad.some(s => s.alive && !s.absent) && Math.random() < 0.3;
  // the squad flies home from abroad
  const away = inc ? travelDays(c, inc.region) : 0;
  if (away && r.squad.some(s => s.alive) && !ambush) {
    for (const s of r.squad) { const o = c.roster.find(x => x.id === s.opId); if (o?.alive) o.busy = { kind: "travel", daysLeft: away }; }
    lines.push(`The survivors fly back to Site-19: ${away} day${away > 1 ? "s" : ""}.`);
  }
  for (const l of [...lines, ...promotions]) log(c, l, r.win ? "good" : "bad");
  if (inc?.scpId) {
    resolveScp(c, inc, r.win);
    if (!r.win) lines.push(`${scpName(inc.scpId)} got away. It will turn up again somewhere, in its own time.`);
  }
  if (ambush && c.scps.some(s => s.id === inc!.scpId && s.status === "contained")) {
    const esc: Incident = {
      id: "inc" + c.nextIncident, kind: "escort", scpId: inc!.scpId, region: inc!.region, map: Math.random() < 0.5 ? "town" : "farm",
      title: `Incident ${String(c.nextIncident).padStart(3, "0")}: Convoy ambushed carrying ${scpName(inc!.scpId)}`,
      appeared: c.day, expires: c.day, insurgents: Math.min(6, 3 + Math.floor((yearOf(c.day) - 1951) / 3)),
      squad: r.squad.filter(s => s.alive && !s.absent).map(s => s.opId),
    };
    c.nextIncident++;
    c.incidents.push(esc);
    const msg = `On the road to the airfield, the convoy carrying ${scpName(inc!.scpId)} is ambushed by the Insurgency. The squad has to hold the truck.`;
    lines.push(msg); log(c, msg, "bad", "command");
  }
  // the Insurgency punishes towns that helped the Foundation
  if (capture && Math.random() < 0.25) (c.retaliations ??= []).push({ region: inc!.region, day: c.day + rand(3, 10) });
  (c.archive ??= []).unshift(buildReport(c, inc, r));
  if (r.insurgentsTotal) reachMilestone(c, "insurgents");
  if (kind === "raid") reachMilestone(c, "raid");
  if (kind === "strike" && r.win) c.lastStrike = c.day;
  if (r.hadFire) reachMilestone(c, "fire");
  checkOver(c);
  return { lines, promotions };
}

/** A mission interrupted by closing the page counts as a failure with no rewards. */
export function resolveInterrupted(c: Campaign) {
  if (!c.activeIncident) return;
  const inc = c.incidents.find(i => i.id === c.activeIncident);
  c.incidents = c.incidents.filter(i => i.id !== c.activeIncident);
  c.activeIncident = undefined;
  addExposure(c, inc?.region ?? HOME, 20);
  c.stats.lost++;
  log(c, "Contact with the last deployment was lost. The incident had to be covered up (+20 exposure there).", "bad");
  if (inc?.scpId) resolveScp(c, inc, false);
  checkOver(c);
}
