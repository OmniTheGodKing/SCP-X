// Site-19 between missions: the roster, time passing, funding, public exposure and incidents.
import type { MissionResult, MissionSetup } from "../game/types";

export const RANKS = ["Operative", "Specialist", "Sergeant", "Lieutenant", "Captain"];
export const RANK_XP = [0, 3, 7, 12, 18];
export const RECRUIT_COST = 120;
export const DCLASS_COST = 15;
export const DCLASS_MONTHLY = 6;
export const MONTH = 30;
export const INCIDENT_LIFETIME = 3;

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
  title: string;
  wing: string;
  appeared: number;
  expires: number;
  insurgents: number;
}

export interface SiteLogEntry { day: number; text: string; kind: string; }

export interface Campaign {
  version: 1;
  day: number;
  funds: number;
  exposure: number;
  dclass: number;
  nextD: number;
  nextOp: number;
  nextIncident: number;
  nextIncidentDay: number;
  roster: Operative[];
  incidents: Incident[];
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

const FIRST = ["Okafor", "Lindqvist", "Reyes", "Haddad", "Novak", "Tanaka", "Mbeki", "Sorensen", "Ortiz", "Kowalski", "Achterberg", "Nwosu", "Petrov", "Duarte", "Iqbal", "Varga", "Castellanos", "Whitlock", "Abara", "Morozova"];
const WINGS = ["A", "B", "C", "D", "E", "F"];
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export function log(c: Campaign, text: string, kind = "") {
  c.log.unshift({ day: c.day, text, kind });
  if (c.log.length > 80) c.log.pop();
}

function newOperative(c: Campaign): Operative {
  const used = new Set(c.roster.map(o => o.name));
  const name = FIRST.find(n => !used.has(n)) ?? `Recruit ${c.nextOp}`;
  const n = c.nextOp++;
  return { id: "op" + n, name, call: `E11-${String(n).padStart(2, "0")}`, rank: 0, xp: 0, hp: 7, maxHp: 7, san: 100, aimBase: rand(64, 74), missions: 0, kills: 0, alive: true };
}

export function newCampaign(): Campaign {
  const c: Campaign = {
    version: 1, day: 1, funds: 300, exposure: 10, dclass: 6, nextD: 9101, nextOp: 1, nextIncident: 1, nextIncidentDay: 2,
    roster: [], incidents: [], log: [], stats: { won: 0, lost: 0, missed: 0 },
  };
  for (let i = 0; i < 6; i++) c.roster.push(newOperative(c));
  log(c, "Site-19 Command is online. MTF Epsilon-11 “Nine-Tailed Fox” is assigned to containment breaches.", "key");
  return c;
}

export const monthOf = (day: number) => Math.floor((day - 1) / MONTH) + 1;
export const dayOfMonth = (day: number) => ((day - 1) % MONTH) + 1;
export const monthlyFunding = (c: Campaign) => Math.max(50, 400 - c.exposure * 3);

function spawnIncident(c: Campaign) {
  const wing = WINGS[rand(0, WINGS.length - 1)];
  const inc: Incident = {
    id: "inc" + c.nextIncident,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: SCP-173 breach, Heavy Containment wing ${wing}`,
    wing,
    appeared: c.day,
    expires: c.day + INCIDENT_LIFETIME,
    insurgents: Math.min(5, rand(2, 3) + Math.floor((monthOf(c.day) - 1) / 2)),
  };
  c.nextIncident++;
  c.incidents.push(inc);
  c.nextIncidentDay = c.day + rand(4, 8);
  log(c, `${inc.title}. Respond within ${INCIDENT_LIFETIME} days.`, "bad");
}

/** Advance one day: healing, expired incidents, new incidents, and the monthly budget. */
export function advanceDay(c: Campaign) {
  if (c.over) return;
  c.day++;
  for (const o of c.roster) if (o.alive) {
    o.hp = Math.min(o.maxHp, o.hp + 1);
    o.san = Math.min(maxSanOf(o), o.san + 10);
  }
  for (const inc of [...c.incidents]) if (c.day > inc.expires) {
    c.incidents = c.incidents.filter(i => i !== inc);
    c.exposure = Math.min(100, c.exposure + 15);
    c.stats.missed++;
    log(c, `${inc.title.split(":")[0]} went unanswered. Word is getting out (+15 exposure).`, "bad");
  }
  if (c.day >= c.nextIncidentDay) spawnIncident(c);
  if (dayOfMonth(c.day) === 1) {
    const funds = monthlyFunding(c);
    c.funds += funds; c.dclass += DCLASS_MONTHLY;
    log(c, `Month ${monthOf(c.day)}: the O5 Council releases $${funds}k (less at higher exposure) and ${DCLASS_MONTHLY} D-Class.`, "key");
  }
  checkOver(c);
}

/** Advance until something needs attention: a new incident or the start of a month. */
export function advanceToEvent(c: Campaign) {
  const before = c.incidents.length;
  for (let i = 0; i < 40 && !c.over; i++) {
    advanceDay(c);
    if (c.incidents.length > before || dayOfMonth(c.day) === 1) break;
  }
}

function checkOver(c: Campaign) {
  if (c.exposure >= 100) {
    c.over = "The anomalous has become public knowledge. The O5 Council has relieved Site-19's command.";
    log(c, c.over, "bad");
  } else if (!c.roster.some(o => o.alive) && c.funds < RECRUIT_COST) {
    c.over = "Epsilon-11 is gone and there is no money to rebuild it. Site-19 can no longer respond to breaches.";
    log(c, c.over, "bad");
  }
}

export function recruit(c: Campaign) {
  if (c.funds < RECRUIT_COST) return false;
  c.funds -= RECRUIT_COST;
  const o = newOperative(c);
  c.roster.push(o);
  log(c, `${o.call} ${o.name} joins Epsilon-11.`, "good");
  return true;
}

export function buyDClass(c: Campaign) {
  if (c.funds < DCLASS_COST * 2) return false;
  c.funds -= DCLASS_COST * 2; c.dclass += 2;
  log(c, "Two more D-Class transferred to Site-19.");
  return true;
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
  return { incidentId: inc.id, title: `${inc.title.split(":")[0]}, wing ${inc.wing}`, insurgents: inc.insurgents, squad, dclass };
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
    const xp = 1 + (r.win ? 2 : 0) + s.kills + (s.sealed ? 1 : 0);
    o.xp += xp;
    const before = o.rank;
    while (o.rank < RANKS.length - 1 && o.xp >= RANK_XP[o.rank + 1]) o.rank++;
    if (o.rank > before) promotions.push(`${o.call} ${o.name} promoted to ${RANKS[o.rank]}.`);
  }

  c.dclass += r.dReturned;
  if (r.win) {
    c.stats.won++;
    c.exposure = Math.max(0, c.exposure - 5);
    c.funds += 100;
    lines.unshift(`${name} closed. SCP-173 recontained. The O5 Council approves a $100k bonus; exposure −5.`);
  } else {
    c.stats.lost++;
    c.exposure = Math.min(100, c.exposure + 20);
    lines.unshift(`${name} failed${r.evacuated ? " after Epsilon-11 evacuated" : ""}. The breach had to be covered up (+20 exposure).`);
  }
  if (r.dSent || r.dRecruited) lines.push(`D-Class: ${r.dSent} sent, ${r.dLost} lost, ${r.dReturned} back in holding${r.dRecruited ? ` (including ${r.dRecruited} picked up in the wing)` : ""}.`);
  lines.push(`Insurgents neutralised: ${r.insurgentsDown} of ${r.insurgentsTotal}.`);
  for (const l of [...lines, ...promotions]) log(c, l, r.win ? "good" : "bad");
  checkOver(c);
  return { lines, promotions };
}

/** A mission interrupted by closing the page counts as an evacuation with no rewards. */
export function resolveInterrupted(c: Campaign) {
  if (!c.activeIncident) return;
  c.incidents = c.incidents.filter(i => i.id !== c.activeIncident);
  c.activeIncident = undefined;
  c.exposure = Math.min(100, c.exposure + 20);
  c.stats.lost++;
  log(c, "Contact with the last deployment was lost. The breach had to be covered up (+20 exposure).", "bad");
  checkOver(c);
}
