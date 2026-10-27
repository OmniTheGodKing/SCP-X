// Site Security: the guards who are actually at Site-19 when a cell fails, the alert level that
// decides how quickly Epsilon-11 can get there, and breaches left to the guards alone.
import { TRAITS, type TraitId } from "../data/classes";
import { model } from "../data/weapons";
import type { SquadMember } from "../game/types";
import { countOperational, neighbors, operational, nameInText, stationsOnLevel } from "./base";
import { addExposure } from "./world";
import { HOME } from "../data/regions";
import { has } from "./research";
import { log, makeOperative, type Campaign, type Incident } from "./campaign";
import { DEPTH, goDark, wingLevel, wingOf, wreckFacility } from "./containment";

export interface Guard {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  san: number;
  aim: number;
  alive: boolean;
  /** Breaches lived through: three makes them eligible for Epsilon-11. */
  breaches: number;
  kills: number;
  traits: TraitId[];
  /** The Security station they're posted to; unposted guards still answer breaches, a turn late. */
  stationId?: string;
  /** Away training for Epsilon-11. */
  training?: number;
  diedDay?: number;
}

export const GUARD = { cost: 30, perStation: 4, maxSan: 80, blink: 0.14, hp: 5, maxInMission: 8 };
export const PROMOTE = { cost: 80, days: 10, breaches: 3 };

export type Alert = "normal" | "heightened" | "full";
export const ALERTS: Record<Alert, { name: string; turn: number; sanity: number; upkeep: number; desc: string }> = {
  normal:     { name: "Normal", turn: 30, sanity: 1.25, upkeep: 0, desc: "Most of Epsilon-11 is off duty. They recover sanity faster, but take until turn 30 to reach a breach." },
  heightened: { name: "Heightened", turn: 20, sanity: 1, upkeep: 0, desc: "Half the task force stays on station. Epsilon-11 reaches a breach on turn 20." },
  full:       { name: "Full alert", turn: 12, sanity: 0.5, upkeep: 20, desc: "Everyone fit is on station. Epsilon-11 reaches a breach on turn 12, but sanity recovers at half speed and it costs $20k a month." },
};
/** The turn Epsilon-11 reaches a breach; deeper wings take longer to get down to. */
export const mtfArrival = (c: Campaign, inc?: Incident) => (inc ? DEPTH.turns * wingLevel(c, inc.scpId) : 0) + Math.max(5, ALERTS[c.alert].turn - (has(c, "rapid_response") ? 5 : 0) - (has(c, "field_radios") ? 3 : 0) - (has(c, "prc25") ? 2 : 0));

const NAMES = ["Brennan", "Kowalczyk", "Delgado", "Fairweather", "Haskins", "Lundgren", "Mabry", "Ostrowski", "Pruett", "Quinlan", "Raskin", "Szabo", "Tolliver", "Upshaw", "Vance", "Wexler", "Yeager", "Zielinski", "Ambrose", "Battaglia", "Corcoran", "Dunleavy", "Esposito", "Gallo"];
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export const guardCapacity = (c: Campaign) => countOperational(c, "security") * GUARD.perStation;
export const stations = (c: Campaign) => c.base.facilities.filter(f => f.type === "security" && operational(f));
export const postedAt = (c: Campaign, stationId: string) => guardsAlive(c).filter(g => g.stationId === stationId);
export const unposted = (c: Campaign) => guardsAlive(c).filter(g => !g.stationId || !stations(c).some(f => f.id === g.stationId));
/** A working station with a free post, preferring the given one. */
export const freePost = (c: Campaign, prefer?: string) =>
  stations(c).filter(f => postedAt(c, f.id).length < GUARD.perStation).sort((a, b) => (a.id === prefer ? -1 : b.id === prefer ? 1 : 0))[0] ?? null;
export const guardsAlive = (c: Campaign) => c.guards.filter(g => g.alive);
/** Guards who can respond to a breach: alive, not away training, and not badly hurt. */
export const guardsReady = (c: Campaign) => guardsAlive(c).filter(g => g.training === undefined && g.hp >= 3);

export function newGuard(c: Campaign): Guard {
  const used = new Set(c.guards.map(g => g.name));
  const name = NAMES.find(n => !used.has(n)) ?? `Guard ${c.nextGuard}`;
  return { id: "gd" + c.nextGuard++, name, hp: GUARD.hp, maxHp: GUARD.hp, san: GUARD.maxSan, aim: rand(52, 60), alive: true, breaches: 0, kills: 0, traits: [] };
}

export function canHireGuard(c: Campaign, stationId: string) {
  const f = stations(c).find(x => x.id === stationId);
  if (!f) return "This station isn't working.";
  if (postedAt(c, stationId).length >= GUARD.perStation) return `Every post here is filled (${GUARD.perStation}).`;
  if (c.funds < GUARD.cost) return `Needs $${GUARD.cost}k.`;
  return null;
}
export function hireGuard(c: Campaign, stationId: string) {
  if (canHireGuard(c, stationId)) return;
  c.funds -= GUARD.cost;
  const g = newGuard(c);
  g.stationId = stationId;
  c.guards.push(g);
  log(c, `Guard ${g.name} joins Site Security.`);
}
/** Post an unposted guard (or move one) to a station with room. */
export function postGuard(c: Campaign, g: Guard, stationId: string) {
  if (!stations(c).some(f => f.id === stationId) || postedAt(c, stationId).length >= GUARD.perStation) return;
  g.stationId = stationId;
}

export function canPromote(c: Campaign, g: Guard) {
  if (g.training !== undefined) return "Already training.";
  if (g.breaches < PROMOTE.breaches) return `Needs ${PROMOTE.breaches} breaches survived (${g.breaches} so far).`;
  if (c.funds < PROMOTE.cost) return `Needs $${PROMOTE.cost}k.`;
  return null;
}
export function promoteGuard(c: Campaign, g: Guard) {
  if (canPromote(c, g)) return;
  c.funds -= PROMOTE.cost;
  g.training = PROMOTE.days;
  log(c, `Guard ${g.name} starts Epsilon-11 selection training: ${PROMOTE.days} days.`, "good");
}

/** One day for the guards: healing, rest, and anyone finishing MTF training. */
export function tickGuards(c: Campaign, heal: number, calm: number) {
  for (const g of guardsAlive(c)) {
    g.hp = Math.min(g.maxHp, g.hp + heal);
    g.san = Math.min(GUARD.maxSan, g.san + calm);
    if (g.training !== undefined && --g.training <= 0) {
      c.guards = c.guards.filter(x => x !== g);
      const o = makeOperative(c, g.name);
      o.traits = [...g.traits];
      o.kills = g.kills;
      c.roster.push(o);
      log(c, `${g.name} passed selection and joins Epsilon-11 as ${o.call}.`, "good", "personnel");
    }
  }
}

/** A guard as they go into a mission. */
export function guardMember(c: Campaign, g: Guard): SquadMember {
  const m = model(c.models.carbine);
  const drilled = c.purchases.includes("guard_training");
  let aim = g.aim + (has(c, "bt_guard_aim") ? 5 : 0) + (c.purchases.includes("guard_training") ? 10 : 0), blink = GUARD.blink, san = g.san;
  if (g.traits.includes("gunshy")) aim -= 10;
  if ((c.laxUntil ?? 0) >= c.day) aim -= 5;
  if (g.traits.includes("twitchy")) blink += 0.03;
  if (g.traits.includes("steady")) blink = Math.max(0.02, blink - 0.02);
  if (g.traits.includes("nightmares")) san = Math.max(1, san - 15);
  return {
    opId: g.id, name: g.name, call: "SEC", guard: true, hp: g.hp + (c.guardVests ? 1 : 0), maxHp: g.maxHp + (c.guardVests ? 1 : 0), armorHp: c.guardVests ? 1 : 0, san: drilled ? san + 10 : san, maxSan: GUARD.maxSan + (drilled ? 10 : 0), aim, blinkFull: blink,
    armor: c.guardVests ? 1 : 0, hasArmor: false, items: [], perks: [], traits: [...g.traits],
    gun: { name: m.name, type: "carbine", dmg: [...m.dmg] as [number, number], mag: m.mag, ammo: m.mag, aim: m.aim },
  };
}

/** Security stations on the breached wing's level: their guards are already there when it starts. */
function stationsNear(c: Campaign, inc: Incident) {
  const s = c.scps.find(x => x.id === inc.scpId), wing = s && wingOf(c, s);
  return wing ? stationsOnLevel(c, wing).length : 0;
}
/** Who responds to a breach: guards posted beside the wing start on the map, the rest come in on turn 2. */
export function breachGuards(c: Campaign, inc: Incident) {
  const s = c.scps.find(x => x.id === inc.scpId), wing = s && wingOf(c, s);
  const near = new Set(wing ? stationsOnLevel(c, wing).map(n => n.id) : []);
  const ready = guardsReady(c).sort((a, b) => (near.has(b.stationId ?? "") ? 1 : 0) - (near.has(a.stationId ?? "") ? 1 : 0) || b.san - a.san).slice(0, GUARD.maxInMission);
  // guards posted beside the wing are there from the start; at least two on patrol always are
  const onScene = Math.max(2, ready.filter(g => near.has(g.stationId ?? "")).length);
  const team = ready.map(g => guardMember(c, g));
  return { first: team.slice(0, onScene), late: team.slice(onScene) };
}

/** Chance Site Security recontains a breach on their own. Plenty of guards make it close to certain. */
export function guardOdds(c: Campaign, inc: Incident) {
  const g = guardsReady(c);
  if (!g.length) return 0;
  const avgSan = g.reduce((a, x) => a + x.san, 0) / g.length / GUARD.maxSan;
  const p = 0.1 * Math.min(g.length, 10) + 0.1 * stationsNear(c, inc) - 0.06 * Math.max(0, inc.insurgents - (inc.weakened ?? 0)) - (1 - avgSan) * 0.3;
  return Math.max(0.05, Math.min(0.95, p));
}

/** Leave a riot to Site Security: a few D-Class die, a guard may get hurt, and the block calms down. */
export function letGuardsHandleRiot(c: Campaign, inc: Incident) {
  c.incidents = c.incidents.filter(i => i !== inc);
  const g = guardsReady(c), dead = Math.max(1, rand(1, 3) - Math.floor(g.length / 4));
  c.dclass = Math.max(0, c.dclass - dead); c.morale = 40;
  const hurt = g.length ? g[rand(0, g.length - 1)] : null;
  if (hurt && Math.random() < 0.5) hurt.hp = Math.max(1, hurt.hp - 2);
  log(c, `Site Security put the riot down with clubs and gas. ${dead} D-Class ${dead > 1 ? "were" : "was"} killed${hurt && hurt.hp < hurt.maxHp ? `, and guard ${hurt.name} was hurt` : ""}.`, "key");
}

/** Leave the breach to Site Security without playing it. */
export function letGuardsHandle(c: Campaign, inc: Incident) {
  const s = c.scps.find(x => x.id === inc.scpId);
  if (!s) return;
  const p = guardOdds(c, inc), won = Math.random() < p;
  const ready = guardsReady(c);
  c.incidents = c.incidents.filter(i => i !== inc);
  const lost: string[] = [];
  const die = (n: number) => {
    for (let i = 0; i < n; i++) {
      const pool = ready.filter(g => g.alive);
      if (!pool.length) return;
      const g = pool[rand(0, pool.length - 1)];
      g.alive = false; g.diedDay = c.day; lost.push(g.name);
    }
  };
  for (const g of ready) g.san = Math.max(0, g.san - 20);
  if (won) {
    die(ready.filter(() => Math.random() < 0.08).length);
    for (const g of ready) if (g.alive) { g.breaches++; rollTrait(c, g, "nightmares", Math.random() < 0.15); }
    s.status = "contained"; s.maintenance = Math.max(s.maintenance, 60);
    c.stats.won++;
    log(c, `Site Security recontained ${s.name} on their own.${lost.length ? ` ${lost.join(" and ")} didn't make it.` : " Nobody was lost."}`, "good");
    return;
  }
  die(rand(1, 2));
  for (const g of ready) if (g.alive) g.breaches++;
  c.stats.lost++;
  const wing = wingOf(c, s);
  const hit = wing ? neighbors(c, wing).filter(n => n.type !== "command" && !n.disabled && n.daysLeft === 0) : [];
  if (hit.length) {
    wreckFacility(c, hit[rand(0, hit.length - 1)], `${s.name} tore through the wall next door.`);
  }
  const dead = lost.length ? ` ${lost.join(" and ")} ${lost.length > 1 ? "were" : "was"} killed.` : "";
  if (Math.random() < Math.max(0.1, 0.4 - DEPTH.escape * wingLevel(c, inc.scpId))) {
    addExposure(c, HOME, 10);
    goDark(c, s, `Site Security couldn't hold it.${dead} (+10 exposure.)`);
  } else {
    s.status = "contained"; s.maintenance = Math.max(s.maintenance, 40);
    addExposure(c, HOME, 5);
    log(c, `Site Security lost control of ${s.name} for hours before cornering it back into its cell.${dead} Word got out (+5 exposure).`, "bad");
  }
}

export function rollTrait(c: Campaign, g: Guard, t: TraitId, hit: boolean) {
  if (!hit || g.traits.includes(t) || Math.random() >= 0.5) return null;
  g.traits.push(t);
  return `Guard ${g.name} is now ${TRAITS[t].bad ? "marked by" : "known for"} ${TRAITS[t].name.toLowerCase()}: ${TRAITS[t].desc}`;
}

// ---------- training range purchases (like XCOM 2's Guerrilla Tactics School) ----------
export const TRAINING: Record<string, { name: string; cost: number; desc: string; needs?: string; captain?: boolean }> = {
  officer_school: { name: "Officer school", cost: 150, desc: "Squad leaders trained to run a fifth operative. Squad size 5." },
  command_staff:  { name: "Command staff", cost: 300, needs: "officer_school", captain: true, desc: "A field command structure under a Captain. Squad size 6." },
  guard_training: { name: "Guard training program", cost: 100, desc: "Site Security trains on the range every week. Guards get +10 aim and +10 sanity." },
};
export const squadSize = (c: Campaign) => 4 + (c.purchases.includes("officer_school") ? 1 : 0) + (c.purchases.includes("command_staff") ? 1 : 0);
export function canTrain(c: Campaign, id: string) {
  const t = TRAINING[id];
  if (c.purchases.includes(id)) return "Already done.";
  if (!countOperational(c, "training")) return "Needs a working training range.";
  if (t.needs && !c.purchases.includes(t.needs)) return `Needs ${TRAINING[t.needs].name}.`;
  if (t.captain && !c.roster.some(o => o.alive && o.rank >= 4)) return "Needs a Captain or higher on the roster.";
  if (c.funds < t.cost) return `Needs $${t.cost}k.`;
  return null;
}
export function train(c: Campaign, id: string) {
  if (canTrain(c, id)) return;
  c.funds -= TRAINING[id].cost; c.purchases.push(id);
  log(c, `Training range: ${TRAINING[id].name}. ${TRAINING[id].desc}`, "good");
}

export const securityUpkeep = (c: Campaign) => ALERTS[c.alert].upkeep;
