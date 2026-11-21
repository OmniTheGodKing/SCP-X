// Task force dispatch (requested during 4I): with a second task force formed, Site-19 can answer a second incident at
// the same time, but hands-off, like leaving a breach to Site Security: the team flies out, the outcome is rolled at
// the odds shown, and it comes back through the ordinary debrief (rewards, failures, wounds, deaths, experience).
import { rnd } from "../core/rng";
import type { MissionResult } from "../game/types";
import { applyResult, deployable, gainIntel, log, type Campaign, type Incident, type Operative } from "./campaign";
import { flightOut } from "./world";
import { reportOf } from "./geo";
import { forfeitGroup } from "./council";
import { tfOf } from "./taskforces";
import { squadAway, squadOfOp } from "./org";
import { SPECIALTIES } from "../data/mtf";
import { ITEMS } from "./research";
import { chronicle } from "./history";
import { addExposure } from "./world";
import { missionWeather, nightAt } from "./geo";
import type { ItemId } from "../game/types";

export const AUTO_KINDS: Incident["kind"][] = ["recovery", "coverup", "strike", "retaliation", "rescue", "emergency"];
/** Phase 5 sites can also send a squad to an SCP-610 outbreak without the player. */
export const autoKinds = (c: Campaign): Incident["kind"][] => c.mtfs ? [...AUTO_KINDS, "outbreak"] : AUTO_KINDS;
export const AUTO = { min: 2, max: 4 };
const rand = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

/** Who could go: anyone fit, from either task force. */
export function canDispatch(c: Campaign, inc: Incident, ops: Operative[]): string | null {
  if (c.mtfs) {
    if (!autoKinds(c).includes(inc.kind)) return "This one has to be played, or left to Site Security.";
    const sq = new Set(ops.map(o => o.squad));
    if (sq.size > 1 || ops.some(o => !o.squad)) return "A team sent without you is one squad.";
    const away = ops[0]?.squad ? squadAway(c, ops[0].squad) : null;
    if (away) return `That squad is elsewhere: ${away}`;
  }
  if (!c.mtfs && !c.tf.eta10) return "Needs a second task force (Eta-10) to send a team without you.";
  if (!c.mtfs && !AUTO_KINDS.includes(inc.kind)) return "This one has to be played, or left to Site Security.";
  if (inc.dispatch) return "Already being handled.";
  if (c.outbound?.incId === inc.id) return "Your squad is already on its way there.";
  if (ops.length < AUTO.min) return `Pick at least ${AUTO.min} operatives.`;
  if (ops.length > AUTO.max) return `A hands-off team is at most ${AUTO.max} operatives.`;
  if (ops.some(o => !deployable(c, o))) return "Everyone sent has to be fit to deploy.";
  if (!c.mtfs && new Set(ops.map(tfOf)).size > 1) return "A team is one task force: send Epsilon-11 or Eta-10, not both.";
  return null;
}

/** Phase 5: what a squad brings to an incident it answers without the player. Two chances, because a team can save
 *  the people and still fail the objective (or the reverse): the primary objective (contain, capture, break the
 *  cell, burn out the core) and the people (survivors, witnesses, civilians, the team's own lives). Every factor is
 *  listed so the planning screen can show why. */
export interface Assessment { primary: number; people: number; factors: [string, number][]; }
const THREAT: Partial<Record<string, number>> = { "173": 0.12, "049": 0.1, "106": 0.18, "096": 0.2, "682": 0.3, "939": 0.15, "035": 0.12, "012": 0.08, "610": 0.15 };
export function assessTeam(c: Campaign, inc: Incident, ops: Operative[]): Assessment {
  const f: [string, number][] = [];
  const add = (label: string, v: number) => { if (Math.abs(v) >= 0.005) f.push([label, Math.round(v * 100) / 100]); };
  const ins = Math.max(0, (inc.insurgents || reportOf(inc).ins) - (inc.weakened ?? 0));
  // the people: experience, aim, class, and what condition they're in
  const power = ops.reduce((a, o) => a + 1 + o.rank * 0.22 + ((o.aimBase ?? 65) - 65) / 45 + (o.cls ? 0.12 : 0) - (o.hp < o.maxHp ? 0.35 : 0) - ((o.fatigue ?? 0) >= 40 ? 0.25 : 0), 0);
  add(`${ops.length} operatives: experience and condition`, 0.1 * power);
  // what their squad is trained for, against this kind of incident
  const sq = ops[0] ? squadOfOp(c, ops[0])?.squad : undefined;
  const sp = sq ? SPECIALTIES[sq.specialty] : undefined;
  if (sp) add(`${sp.name} training`, (sp.strengths[inc.kind] ?? -0.04) * (sq!.retrainUntil && sq!.retrainUntil > c.day ? 0.4 : 1));
  // the kit that matters for this incident, carried by the team (from their kits and what's in stores)
  const carried = (i: ItemId) => ops.some(o => o.kit?.armor === i || o.kit?.items.includes(i)) && (c.inventory[i] ?? 0) > 0;
  const armored = ops.filter(o => o.kit?.armor && (c.inventory[o.kit.armor] ?? 0) > 0).length;
  if (armored) add("Armor", 0.03 * armored);
  if (inc.kind === "outbreak") {
    const burn = carried("flamer") || carried("incendiary"), suits = carried("contsuit") || carried("hazmat");
    add(burn ? "Flamethrower or incendiaries to burn the core" : "Nothing to burn the core with", burn ? 0.15 : -0.25);
    add(suits ? "Sealed suits against the flesh" : "No sealed suits: infection risk", suits ? 0.08 : -0.1);
  }
  if (inc.kind === "coverup") add(c.amnestics >= (inc.witnesses ?? 0) ? "Enough amnestic doses" : "Too few amnestic doses", c.amnestics >= (inc.witnesses ?? 0) ? 0.06 : -0.2);
  if (inc.kind === "recovery" || inc.kind === "rescue") add(carried("tracker") ? "Seismic sensor to find them" : "No sensor", carried("tracker") ? 0.06 : 0);
  if (inc.kind === "strike" || inc.kind === "retaliation") add(carried("frag") ? "Grenades" : "No grenades", carried("frag") ? 0.05 : 0);
  // what's known before they go
  if (inc.recon) add("Investigated: exact opposition known", 0.08);
  else if (inc.first) add("Unidentified anomaly", -0.08);
  // getting there and the conditions there
  const t = flightOut(c, inc);
  if (t >= 3) add(`${t} days to get there: the situation worsens`, -0.03 * (t - 2));
  if (inc.grown) add("The incident has grown", -0.06 * inc.grown);
  if (missionWeather(c, inc) !== "clear") add("Weather", -0.05);
  if (nightAt(c, inc)) add("Night", -0.04);
  // what they're up against
  if (ins) add(`${ins} Insurgents`, -0.07 * ins);
  const threat = THREAT[inc.kind === "outbreak" ? "610" : inc.scpId];
  if (threat && (inc.kind === "recovery" || inc.kind === "outbreak" || inc.kind === "emergency")) add("The anomaly", -threat);
  const total = f.reduce((a, [, v]) => a + v, 0);
  const primary = Math.max(0.05, Math.min(0.92, 0.25 + total));
  // the people side leans on training for rescue, evacuation and recovery more than on firepower
  const peopleBonus = sp && ["recovery", "hazrecovery", "tracking", "quarantine", "decon"].includes(sq!.specialty) ? 0.15 : 0;
  const people = Math.max(0.1, Math.min(0.95, 0.4 + total * 0.6 + peopleBonus));
  return { primary, people, factors: f };
}

/** The chance the team succeeds without you: more and better operatives help, a bigger opposition hurts. */
export function dispatchOdds(c: Campaign, inc: Incident, ops: Operative[]) {
  if (c.mtfs) return assessTeam(c, inc, ops).primary;
  const ins = Math.max(0, (inc.insurgents || reportOf(inc).ins) - (inc.weakened ?? 0));
  const power = ops.reduce((a, o) => a + 1 + o.rank * 0.25 + ((o.aimBase ?? 65) - 65) / 40 + (o.cls ? 0.15 : 0), 0);
  const kind = inc.kind === "coverup" ? 0.25 : inc.kind === "recovery" || inc.kind === "emergency" || inc.kind === "rescue" ? -0.1 : 0;
  return Math.max(0.1, Math.min(0.9, 0.3 + 0.12 * power - 0.07 * ins + kind));
}

/** Send them: they fly out, and the result comes in when they get there. */
export function dispatchTeam(c: Campaign, inc: Incident, ops: Operative[]) {
  if (canDispatch(c, inc, ops)) return;
  const t = Math.max(1, flightOut(c, inc));
  inc.dispatch = { how: "squad", done: c.day + t, doses: 0, ops: ops.map(o => o.id), odds: dispatchOdds(c, inc, ops) };
  forfeitGroup(c, inc);
  for (const o of ops) o.busy = { kind: "travel", daysLeft: t + 30, out: true };   // home again after the result
  log(c, `${ops.map(o => `${o.call} ${o.name}`).join(", ")} ${ops.length > 1 ? "are" : "is"} on the way to ${inc.title.split(": ")[1]} without you (${Math.round(inc.dispatch.odds! * 100)}% chance). Result ${t === 1 ? "tomorrow" : `in ${t} days`}.`, "key");
}

/** The team arrives: roll the outcome and put it through the ordinary debrief. */
export function resolveTeam(c: Campaign, inc: Incident) {
  const d = inc.dispatch!, ops = (d.ops ?? []).map(id => c.roster.find(o => o.id === id)).filter((o): o is Operative => !!o && o.alive);
  for (const o of ops) o.busy = undefined;
  const a = c.mtfs ? assessTeam(c, inc, ops) : null;
  const win = rnd() < (a ? a.primary : d.odds ?? 0.5);
  const peopleOk = a ? rnd() < a.people : win;
  const ins = Math.max(0, inc.insurgents - (inc.weakened ?? 0));
  const down = win ? ins : rand(0, Math.floor(ins / 2));
  const squad = ops.map((o, i) => {
    const died = rnd() < (win ? 0.04 : 0.22) * (peopleOk ? 0.6 : 1.3), hurt = !died && rnd() < (win ? 0.25 : 0.55);
    const hp = died ? 0 : hurt ? Math.max(1, o.hp - rand(2, 4)) : o.hp;
    return { opId: o.id, alive: !died, hp, san: Math.max(10, o.san - rand(5, win ? 15 : 30)), kills: Math.floor(down / ops.length) + (i < down % ops.length ? 1 : 0),
      sealed: false, hasArmor: false, items: [], witnessed: died ? 0 : rand(0, 1), panics: 0, minHp: hp, bestStreak: 0 };
  });
  const wit = inc.witnesses ?? 0;
  const r: MissionResult = {
    incidentId: inc.id, win, evacuated: !win, turns: 0, squad, escaped: false, zombiesKilled: 0, pocketReturned: 0,
    researchersRescued: 0, researchersLost: 0, straysLost: 0, straysEscaped: 0, infectedLost: 0, riotersKilled: 0,
    survivorsSaved: inc.kind === "rescue" && (win || peopleOk) ? inc.survivors ?? 0 : 0, survivorsTotal: inc.survivors, coreBurned: inc.kind === "outbreak" && win,
    photos: [], restraints: false, aftercare: false, prisoners: 0, civiliansKilled: inc.kind === "retaliation" && !win ? rand(1, 3) : 0,
    witnessesEscaped: inc.kind === "coverup" && !win && !peopleOk ? wit : 0, witnessesDosed: inc.kind === "coverup" && (win || peopleOk) ? wit : 0, amnesticsUsed: inc.kind === "coverup" && win ? Math.min(wit, c.amnestics) : 0,
    known: [], dSent: 0, dReturned: 0, dRecruited: 0, dLost: 0, insurgentsDown: down, insurgentsTotal: ins,
  };
  inc.dispatch = undefined;
  const debrief = applyResult(c, r);
  if (!a) { log(c, `Hands-off team at ${inc.title.split(": ")[1]}: ${win ? "they did it" : "it went wrong"}. ${debrief.lines.join(" ")}`, win ? "good" : "bad", "command"); return; }
  // Phase 5: name what actually happened, and carry the consequences the debrief doesn't
  const dead = squad.filter(m => !m.alive).length, sq = ops[0] ? squadOfOp(c, ops[0]) : undefined, team = sq ? `${sq.mtf.designation} ${sq.squad.name}` : "The squad";
  const spec = sq?.squad.specialty;
  let outcome: string, extra = "";
  if (win && peopleOk && !dead) outcome = "Complete success";
  else if (win && dead >= 2) outcome = "Contained at significant cost";
  else if (win) outcome = "Partial success";
  else if (peopleOk && (inc.kind === "rescue" || inc.kind === "recovery" || inc.kind === "outbreak" || inc.kind === "emergency")) { outcome = "People saved, containment failed"; addExposure(c, inc.region, -2); extra = " The survivors are out; the threat is not dealt with."; }
  else if (spec && ["surveillance", "tracking", "forwardrecon", "infiltration"].includes(spec)) { outcome = "Intelligence gathered, no capture"; gainIntel(c, 2); extra = " They came back with 2 Intel."; }
  else if (!win && !peopleOk) { outcome = "Failed intervention, the threat escalates"; addExposure(c, inc.region, 6); c.chaos.threat = Math.min(100, c.chaos.threat + (ins ? 3 : 0)); extra = " Exposure in the region rises by 6."; }
  else outcome = "Failed intervention";
  // an incendiary team that burns out an outbreak takes buildings with it
  if (inc.kind === "outbreak" && win && spec === "incendiary") { addExposure(c, inc.region, 3); extra += " The fires took nearby buildings: +3 exposure."; }
  // specialist kit carried in is spent, and gear on the dead is lost
  for (const o of ops) for (const i of o.kit?.items ?? []) if (i && ITEMS[i as ItemId]?.uses === 1 && (c.inventory[i as ItemId] ?? 0) > 0 && rnd() < 0.6) c.inventory[i as ItemId]!--;
  chronicle(c, "deployment", `${team} answered ${inc.title.split(": ")[1] ?? inc.title} without you: ${outcome}.${dead ? ` ${dead} killed.` : ""}`);
  log(c, `After-action, ${inc.title.split(": ")[1] ?? inc.title}: ${team}, ${outcome.toLowerCase()}.${extra} ${debrief.lines.join(" ")}`, win ? "good" : "bad", "command");
}
