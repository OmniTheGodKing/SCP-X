// Site-19 between missions: the roster, time passing, funding, public exposure and incidents.
import type { MissionResult, MissionSetup } from "../game/types";
import {
  ENGINEER_COST, MAX_ENGINEERS, dclassCapacity, healPerDay, monthlyUpkeep, sanityPerDay, startingBase, tickConstruction,
  type Base,
} from "./base";
import { CLEAN_EVERY, resolveScp, startingScps, tickContainment, type ScpRecord } from "./containment";

export const RANKS = ["Operative", "Specialist", "Sergeant", "Lieutenant", "Captain"];
export const RANK_XP = [0, 3, 7, 12, 18];
export const RECRUIT_COST = 120;
export const DCLASS_COST = 15;
export const DCLASS_MONTHLY = 6;
export const MONTH = 30;

export interface Operative {
  id: string;
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
}

export interface Incident {
  id: string;
  kind: "breach" | "recovery";
  scpId: string;
  title: string;
  appeared: number;
  expires: number;
  insurgents: number;
}

export interface SiteLogEntry { day: number; text: string; kind: string; }

export interface Campaign {
  version: 2;
  day: number;
  funds: number;
  exposure: number;
  dclass: number;
  engineers: number;
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
}

// Perks per rank: steadier aim, fewer blinks, more composure.
export const aimOf = (o: Operative) => o.aimBase + o.rank * 4;
export const maxSanOf = (o: Operative) => 100 + o.rank * 5;
export const blinkFullOf = (o: Operative) => Math.max(0.05, 0.10 - o.rank * 0.01);
export const deployable = (o: Operative) => o.alive && o.hp >= o.maxHp;

const NAMES = ["Okafor", "Lindqvist", "Reyes", "Haddad", "Novak", "Tanaka", "Mbeki", "Sorensen", "Ortiz", "Kowalski", "Achterberg", "Nwosu", "Petrov", "Duarte", "Iqbal", "Varga", "Castellanos", "Whitlock", "Abara", "Morozova"];
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export function log(c: Campaign, text: string, kind = "") {
  c.log.unshift({ day: c.day, text, kind });
  if (c.log.length > 100) c.log.pop();
}

function newOperative(c: Campaign): Operative {
  const used = new Set(c.roster.map(o => o.name));
  const name = NAMES.find(n => !used.has(n)) ?? `Recruit ${c.nextOp}`;
  const n = c.nextOp++;
  return { id: "op" + n, name, call: `E11-${String(n).padStart(2, "0")}`, rank: 0, xp: 0, hp: 7, maxHp: 7, san: 100, aimBase: rand(64, 74), missions: 0, kills: 0, alive: true };
}

export function newCampaign(): Campaign {
  const base = startingBase();
  const wing = base.facilities.find(f => f.type === "cont_euclid")!;
  const c: Campaign = {
    version: 2, day: 1, funds: 400, exposure: 10, dclass: 6, engineers: 6, nextD: 9101, nextOp: 1, nextIncident: 1,
    roster: [], incidents: [], base, scps: startingScps(wing.id), log: [], stats: { won: 0, lost: 0, missed: 0 },
  };
  for (let i = 0; i < 6; i++) c.roster.push(newOperative(c));
  log(c, "Site-19 Command is online. SCP-173 is held in the Euclid wing on level 2. Keep its cell clean, keep it watched, and keep Epsilon-11 ready for when it gets out.", "key");
  return c;
}

export const monthOf = (day: number) => Math.floor((day - 1) / MONTH) + 1;
export const dayOfMonth = (day: number) => ((day - 1) % MONTH) + 1;
export const monthlyFunding = (c: Campaign) => Math.max(50, 400 - c.exposure * 3);

/** Advance one day. Returns true if something happened that needs the player's attention. */
export function advanceDay(c: Campaign) {
  if (c.over) return false;
  const incidentsBefore = c.incidents.length, logBefore = c.log.length;
  c.day++;
  for (const line of tickConstruction(c)) log(c, line, "good");
  const heal = healPerDay(c), calm = sanityPerDay(c);
  for (const o of c.roster) if (o.alive) {
    o.hp = Math.min(o.maxHp, o.hp + heal);
    o.san = Math.min(maxSanOf(o), o.san + calm);
  }
  tickContainment(c);
  for (const s of c.scps) if (s.status === "contained" && c.day - s.lastCleaned === CLEAN_EVERY)
    log(c, `${s.name}'s cell is due for cleaning. Skipping it lets debris build up and raises the breach risk.`, "key");
  if (dayOfMonth(c.day) === 1) {
    const funds = monthlyFunding(c), upkeep = monthlyUpkeep(c);
    const room = Math.max(0, dclassCapacity(c) - c.dclass), d = Math.min(DCLASS_MONTHLY, room);
    c.funds += funds - upkeep; c.dclass += d;
    log(c, `Month ${monthOf(c.day)}: the O5 Council releases $${funds}k (less at higher exposure); facility upkeep costs $${upkeep}k. ${d} D-Class transferred in${d < DCLASS_MONTHLY ? " (the barracks are full)" : ""}.`, "key");
  }
  checkOver(c);
  return c.incidents.length > incidentsBefore || c.log.length !== logBefore || !!c.over;
}

/** Advance until something needs attention. */
export function advanceToEvent(c: Campaign) {
  for (let i = 0; i < 60 && !c.over; i++) if (advanceDay(c)) break;
}

function checkOver(c: Campaign) {
  if (c.over) return;
  if (c.exposure >= 100) {
    c.over = "The anomalous has become public knowledge. The O5 Council has relieved Site-19's command.";
    log(c, c.over, "bad");
  } else if (!c.roster.some(o => o.alive) && c.funds < RECRUIT_COST) {
    c.over = "Epsilon-11 is gone and there is no money to rebuild it. Site-19 can no longer answer breaches.";
    log(c, c.over, "bad");
  }
}

export function recruit(c: Campaign) {
  if (c.funds < RECRUIT_COST) return;
  c.funds -= RECRUIT_COST;
  const o = newOperative(c);
  c.roster.push(o);
  log(c, `${o.call} ${o.name} joins Epsilon-11.`, "good");
}

export const canBuyDClass = (c: Campaign) =>
  c.funds < DCLASS_COST * 2 ? `Needs $${DCLASS_COST * 2}k.` : c.dclass + 2 > dclassCapacity(c) ? "The barracks are full." : null;
export function buyDClass(c: Campaign) {
  if (canBuyDClass(c)) return;
  c.funds -= DCLASS_COST * 2; c.dclass += 2;
  log(c, "Two more D-Class transferred to Site-19.");
}

export const canHireEngineer = (c: Campaign) =>
  c.funds < ENGINEER_COST ? `Needs $${ENGINEER_COST}k.` : c.engineers >= MAX_ENGINEERS ? `Site-19 can house ${MAX_ENGINEERS} engineers.` : null;
export function hireEngineer(c: Campaign) {
  if (canHireEngineer(c)) return;
  c.funds -= ENGINEER_COST; c.engineers++;
  log(c, "An engineer joins the site staff.");
}

export function buildSetup(c: Campaign, inc: Incident, opIds: string[], dCount: number): MissionSetup {
  const squad = opIds.map(id => c.roster.find(o => o.id === id)!).map(o => ({
    opId: o.id, name: o.name, call: o.call, hp: o.hp, maxHp: o.maxHp, san: Math.min(o.san, maxSanOf(o)),
    maxSan: maxSanOf(o), aim: aimOf(o), blinkFull: blinkFullOf(o),
  }));
  const dclass: string[] = [];
  for (let i = 0; i < dCount; i++) dclass.push("D-" + c.nextD++);
  c.dclass -= dCount;
  c.activeIncident = inc.id;
  return { incidentId: inc.id, title: inc.title.split(": ")[1] || inc.title, insurgents: inc.insurgents, squad, dclass };
}

export interface Debrief { lines: string[]; promotions: string[]; }

export function applyResult(c: Campaign, r: MissionResult): Debrief {
  const lines: string[] = [], promotions: string[] = [];
  const inc = c.incidents.find(i => i.id === r.incidentId);
  c.incidents = c.incidents.filter(i => i.id !== r.incidentId);
  c.activeIncident = undefined;
  const name = inc ? inc.title.split(":")[0] : "Incident";

  for (const s of r.squad) {
    const o = c.roster.find(x => x.id === s.opId);
    if (!o) continue;
    o.missions++;
    if (!s.alive) {
      o.alive = false; o.hp = 0; o.diedDay = c.day; o.diedAt = name;
      lines.push(`${o.call} ${o.name} was killed in action.`);
      continue;
    }
    o.hp = s.hp; o.san = s.san; o.kills += s.kills;
    o.xp += 1 + (r.win ? 2 : 0) + s.kills + (s.sealed ? 1 : 0);
    const before = o.rank;
    while (o.rank < RANKS.length - 1 && o.xp >= RANK_XP[o.rank + 1]) o.rank++;
    if (o.rank > before) promotions.push(`${o.call} ${o.name} promoted to ${RANKS[o.rank]}.`);
  }

  c.dclass += r.dReturned;
  const recovery = inc?.kind === "recovery";
  if (r.win) {
    const bonus = recovery ? 100 : 50;
    c.stats.won++;
    c.exposure = Math.max(0, c.exposure - 5);
    c.funds += bonus;
    lines.unshift(`${name} closed. SCP-173 is back in its cell. The O5 Council approves a $${bonus}k bonus; exposure −5.`);
  } else {
    c.stats.lost++;
    c.exposure = Math.min(100, c.exposure + 20);
    lines.unshift(`${name} failed${r.evacuated ? " after Epsilon-11 evacuated" : ""}. The breach had to be covered up (+20 exposure).`);
  }
  if (r.dSent || r.dRecruited) lines.push(`D-Class: ${r.dSent} sent, ${r.dLost} lost, ${r.dReturned} back in holding${r.dRecruited ? ` (including ${r.dRecruited} picked up on site)` : ""}.`);
  lines.push(`Insurgents neutralised: ${r.insurgentsDown} of ${r.insurgentsTotal}.`);
  for (const l of [...lines, ...promotions]) log(c, l, r.win ? "good" : "bad");
  if (inc) resolveScp(c, inc, r.win);
  if (!r.win) lines.push("SCP-173 got away. It will turn up again somewhere, in its own time.");
  checkOver(c);
  return { lines, promotions };
}

/** A mission interrupted by closing the page counts as a failure with no rewards. */
export function resolveInterrupted(c: Campaign) {
  if (!c.activeIncident) return;
  const inc = c.incidents.find(i => i.id === c.activeIncident);
  c.incidents = c.incidents.filter(i => i.id !== c.activeIncident);
  c.activeIncident = undefined;
  c.exposure = Math.min(100, c.exposure + 20);
  c.stats.lost++;
  log(c, "Contact with the last deployment was lost. The breach had to be covered up (+20 exposure).", "bad");
  if (inc) resolveScp(c, inc, false);
  checkOver(c);
}
