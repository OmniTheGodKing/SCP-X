// Site-19 between missions: the roster, time passing, funding, public exposure and incidents.
import type { MissionResult, MissionSetup } from "../game/types";
import { CLASSES, PERKS, TRAITS, type ClassId, type PerkId, type TraitId } from "../data/classes";
import {
  ENGINEER_COST, countOperational, engineerCapacity, dclassCapacity, healPerDay, monthlyUpkeep, sanityPerDay, startingBase, tickConstruction,
  type Base,
} from "./base";
import { CLEAN_EVERY, resolveScp, startingScps, tickContainment, type ScpRecord } from "./containment";
import { ITEMS, armorOf, has, newResearch, tickResearch, type ItemId, type Order, type ResearchState } from "./research";
import { CLASS_WEAPONS, model, startingModels, type AttachmentId, type WeaponType } from "../data/weapons";

export const RANKS = ["Operative", "Specialist", "Sergeant", "Lieutenant", "Captain"];
export const RANK_XP = [0, 3, 7, 12, 18];
export const RECRUIT_COST = 120;
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
  busy?: { kind: "therapy" | "retrain"; daysLeft: number; trait?: TraitId };
  /** Chosen weapon type (one of their class's two) and the attachment fitted to it. */
  weapon?: WeaponType;
  attachment?: AttachmentId;
  aftercareUntil?: number;
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
  /** Insurgents removed from this incident by spending Intel. */
  weakened?: number;
}

export interface Prisoner { name: string; days: number; intel: number; }

export interface SiteLogEntry { day: number; text: string; kind: string; }

export interface Loadout { opId: string; armor: boolean; items: ItemId[]; }

export interface Campaign {
  version: 5;
  /** Weapon model currently issued for each type, and the vest tier. */
  models: Record<WeaponType, string>;
  armorTier: number;
  attachments: Partial<Record<AttachmentId, number>>;
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
}

// Perks per rank: steadier aim, fewer blinks, more composure.
export const aimOf = (o: Operative) => o.aimBase + o.rank * 4;
export const maxSanOf = (o: Operative) => 100 + o.rank * 5;
export const blinkFullOf = (o: Operative) => Math.max(0.05, 0.10 - o.rank * 0.01);
export const deployable = (o: Operative) => o.alive && o.hp >= o.maxHp && !o.busy;
/** An operative who has ranked up but not yet picked their class or perk. */
export const promotionDue = (o: Operative) => o.alive && o.rank > 0 && o.perks.length < o.rank;
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
    const msg = `${o.call} ${o.name} promoted to ${RANKS[o.rank]}. ${o.cls ? "Choose a new perk" : "Choose their class"} on the Personnel tab.`;
    if (out) out.push(msg); else log(c, msg, "good");
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
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export function log(c: Campaign, text: string, kind = "") {
  c.log.unshift({ day: c.day, text, kind });
  if (c.log.length > 100) c.log.pop();
}

function newOperative(c: Campaign): Operative {
  const used = new Set(c.roster.map(o => o.name));
  const name = NAMES.find(n => !used.has(n)) ?? `Recruit ${c.nextOp}`;
  const n = c.nextOp++;
  return { id: "op" + n, name, call: `E11-${String(n).padStart(2, "0")}`, rank: 0, xp: 0, hp: 7, maxHp: 7, san: 100, aimBase: rand(64, 74), missions: 0, kills: 0, alive: true, perks: [], traits: [], breakdowns: 0 };
}

export function newCampaign(): Campaign {
  const base = startingBase();
  const wing = base.facilities.find(f => f.type === "cont_euclid")!;
  const c: Campaign = {
    version: 5, models: startingModels(), armorTier: 0, attachments: {}, prisoners: [], intel: 0, cleaningOrder: true,
    day: 1, funds: 400, exposure: 10, dclass: 6, engineers: 6, researchers: 2, research: newResearch(),
    inventory: {}, orders: [], knownNotes: [], nextD: 9101, nextOp: 1, nextIncident: 1,
    roster: [], incidents: [], base, scps: startingScps(wing.id), log: [], stats: { won: 0, lost: 0, missed: 0 },
  };
  for (let i = 0; i < 6; i++) c.roster.push(newOperative(c));
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
export const monthlyFunding = (c: Campaign) => Math.max(50, 400 - c.exposure * 3);

/** Advance one day. Returns true if something happened that needs the player's attention. */
export function advanceDay(c: Campaign) {
  if (c.over) return false;
  const incidentsBefore = c.incidents.length, logBefore = c.log.length;
  c.day++;
  for (const line of tickConstruction(c)) log(c, line, "good");
  tickResearch(c);
  const heal = healPerDay(c), calm = sanityPerDay(c), drill = countOperational(c, "training") > 0 && c.day % 7 === 0;
  for (const o of c.roster) if (o.alive) {
    o.hp = Math.min(o.maxHp, o.hp + heal);
    const rest = (o.traits.includes("hollow") ? calm / 2 : calm) + ((o.aftercareUntil ?? 0) >= c.day ? 10 : 0);
    o.san = Math.min(maxSanOf(o), o.san + rest);
    if (o.busy && --o.busy.daysLeft <= 0) {
      if (o.busy.kind === "therapy" && o.busy.trait) {
        o.traits = o.traits.filter(t => t !== o.busy!.trait);
        log(c, `${o.call} ${o.name} finished therapy. ${TRAITS[o.busy.trait].name} is gone.`, "good");
      } else {
        o.cls = undefined; o.perks = [];
        log(c, `${o.call} ${o.name} finished retraining. Choose their new class on the Personnel tab.`, "good");
      }
      o.busy = undefined;
    }
    if (drill && !o.busy) { o.xp++; checkPromotion(c, o); }
  }
  tickContainment(c);
  for (const s of c.scps) if (s.status === "contained" && c.day - s.lastCleaned === CLEAN_EVERY)
    log(c, `${s.name}'s cell is due for cleaning. Skipping it lets debris build up and raises the breach risk.`, "key");
  tickPrisoners(c);
  if (dayOfMonth(c.day) === 1) {
    const funds = monthlyFunding(c), upkeep = monthlyUpkeep(c);
    const room = Math.max(0, dclassCapacity(c) - c.dclass), d = Math.min(DCLASS_MONTHLY, room);
    c.funds += funds - upkeep; c.dclass += d;
    c.exposure = Math.max(0, c.exposure - 3);   // the public slowly forgets
    log(c, `${monthName(c.day)}: the O5 Council releases $${funds}k (less at higher exposure); facility upkeep costs $${upkeep}k. ${d} D-Class transferred in${d < DCLASS_MONTHLY ? " (the barracks are full)" : ""}. Exposure eases by 3.`, "key");
  }
  checkOver(c);
  return c.incidents.length > incidentsBefore || c.log.length !== logBefore || !!c.over;
}

/** Advance until something needs attention. */
export function advanceToEvent(c: Campaign) {
  for (let i = 0; i < 400 && !c.over; i++) if (advanceDay(c)) break;
}

// ---------- prisoners and Intel ----------
export const holdingCapacity = (c: Campaign) => countOperational(c, "holding") * 4;
export const INTERROGATION_DAYS = 10, INTEL_PER_PRISONER = 3, PRISONER_BOUNTY = 25;
function tickPrisoners(c: Campaign) {
  if (!countOperational(c, "holding")) return;
  for (const p of [...c.prisoners]) {
    if (++p.days % INTERROGATION_DAYS) continue;
    p.intel++; c.intel++;
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
  const mag = m.mag + (a === "extmag" ? 1 : 0);
  return { name: m.name, type: t, dmg: [...m.dmg] as [number, number], mag, ammo: mag, aim: m.aim, attachment: a };
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
  c.funds < ENGINEER_COST ? `Needs $${ENGINEER_COST}k.` : c.engineers >= engineerCapacity(c) ? `Site-19 can house ${engineerCapacity(c)} engineers. A workshop adds room for 4 more.` : null;
export function hireEngineer(c: Campaign) {
  if (canHireEngineer(c)) return;
  c.funds -= ENGINEER_COST; c.engineers++;
  log(c, "An engineer joins the site staff.");
}

export function buildSetup(c: Campaign, inc: Incident, loadouts: Loadout[], dCount: number): MissionSetup {
  const take = (i: ItemId) => { c.inventory[i] = (c.inventory[i] || 0) - 1; };
  const vest = armorOf(c);
  const squad = loadouts.map(l => {
    const o = c.roster.find(x => x.id === l.opId)!;
    const armored = l.armor && c.armorTier > 0;
    if (armored) take("armor");
    l.items.forEach(take);
    const bonus = armored ? vest.hp : 0;
    return {
      opId: o.id, name: o.name, call: o.call, hp: o.hp + bonus, maxHp: o.maxHp + bonus, san: Math.min(o.san, maxSanOf(o)),
      maxSan: maxSanOf(o), aim: aimOf(o) + (has(c, "marksmanship") ? 5 : 0), blinkFull: blinkFullOf(o),
      armor: armored ? vest.points : 0, hasArmor: armored, items: l.items.map(id => ({ id, uses: ITEMS[id].uses ?? 1 })),
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
  return {
    incidentId: inc.id, title: inc.title.split(": ")[1] || inc.title, insurgents: Math.max(0, inc.insurgents - (inc.weakened ?? 0)), squad, dclass,
    year: yearOf(c.day),
    known: [...c.knownNotes],
    insurgentArmor: yearOf(c.day) >= 1954 ? 1 : 0,
    mods: {
      blinkBonus: has(c, "blink_cadence") ? 0.02 : 0,
      recoverBonus: has(c, "trauma_counseling") ? 3 : 0,
      mtfDrag: has(c, "powered_jack") ? 2 : 1,
      track173: has(c, "movement_study"),
    },
  };
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
    // armor soaks wounds first; gear comes home with whoever survived
    o.hp = Math.max(1, Math.min(o.maxHp, s.hp - (s.hasArmor ? armorOf(c).hp : 0)));
    o.san = s.san; o.kills += s.kills;
    if (s.hasArmor) c.inventory.armor = (c.inventory.armor || 0) + 1;
    for (const it of s.items) if (it.uses > 0) c.inventory[it.id] = (c.inventory[it.id] || 0) + 1;
    o.xp += 1 + (r.win ? 2 : 0) + s.kills + (s.sealed ? 1 : 0);
    checkPromotion(c, o, promotions);
    o.breakdowns += s.panics;
    if (r.aftercare) o.aftercareUntil = c.day + 7;
    // what happened to them may leave a mark: each trigger sticks half the time
    const earned: TraitId[] = [];
    const roll = (t: TraitId, hit: boolean) => { if (hit && !o.traits.includes(t) && Math.random() < 0.5) { o.traits.push(t); earned.push(t); } };
    roll("nightmares", s.witnessed >= 2);
    roll("twitchy", s.panics > 0);
    roll("gunshy", s.minHp <= 2);
    roll("hollow", o.breakdowns >= 2);
    roll("steady", s.bestStreak >= 5);
    roll("hardened", o.missions >= 5);
    for (const t of earned) promotions.push(`${o.call} ${o.name} is now ${TRAITS[t].bad ? "marked by" : "known for"} ${TRAITS[t].name.toLowerCase()}: ${TRAITS[t].desc}`);
  }

  c.dclass += r.dReturned;
  for (let i = 0; i < r.prisoners; i++) {
    const name = `Insurgent prisoner ${c.nextIncident * 10 + i}`;
    if (c.prisoners.length < holdingCapacity(c)) { c.prisoners.push({ name, days: 0, intel: 0 }); lines.push(`An Insurgent was taken alive and is held for interrogation.`); }
    else { c.funds += PRISONER_BOUNTY; lines.push(`An Insurgent was taken alive. With no room in holding cells, they were handed to another site (+$${PRISONER_BOUNTY}k).`); }
  }
  for (const n of r.known) if (!c.knownNotes.includes(n)) c.knownNotes.push(n);
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
