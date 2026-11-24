// Task force dispatch (requested during 4I): with a second task force formed, Site-19 can answer a second incident at
// the same time, but hands-off, like leaving a breach to Site Security: the team flies out, the outcome is rolled at
// the odds shown, and it comes back through the ordinary debrief (rewards, failures, wounds, deaths, experience).
import { rnd } from "../core/rng";
import { anomalyDef } from "../data/anomalies";
import { fileOf } from "./dossier";
import type { MissionResult } from "../game/types";
import { applyResult, deployable, gainIntel, log, type Campaign, type Incident, type Operative } from "./campaign";
import { flightOut } from "./world";
import { reportOf } from "./geo";
import { forfeitGroup } from "./council";
import { tfOf } from "./taskforces";
import { recordMastery, squadAway, squadOfOp, type Squad } from "./org";
import { KITS } from "../data/specialties";
import { SPECIALTIES } from "../data/mtf";
import { ITEMS } from "./research";
import { chronicle } from "./history";
import { addExposure } from "./world";
import { missionWeather, nightAt } from "./geo";
import type { ItemId } from "../game/types";

export const AUTO_KINDS: Incident["kind"][] = ["recovery", "coverup", "strike", "retaliation", "rescue", "emergency"];
/** Phase 5 sites can also send a squad to an SCP-610 outbreak without the player. */
export const autoKinds = (c: Campaign): Incident["kind"][] => c.mtfs ? [...AUTO_KINDS, "outbreak", "investigation"] : AUTO_KINDS;
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
  // Version 12: the squad's capability tags against this incident's objectives (design 26.6), each only with the
  // kit actually in stores and the squad not retraining. Not a "specialty match" bonus: a tag either opens a route to
  // the objective or it doesn't.
  let primaryCap = 0.92;
  if (sq) {
    const caps = capabilities(c, sq, ops), obj = OBJECTIVES[inc.variant ?? ""] ?? OBJECTIVES[inc.kind] ?? { primary: [], people: [] };
    const p = obj.primary.filter(t => caps.includes(t)), q = obj.people.filter(t => caps.includes(t));
    const stage = (sq.mastery ?? 0) >= 3 || (sq.drilled ?? 0) >= 1 ? 0.04 : 0;
    if (p.length) add(`${sp!.name}: ${p.map(tagName).join(", ")}`, 0.18 + stage);
    else if (obj.required) { primaryCap = 0.15; add(`${sp!.name} has no way to ${obj.required}`, -0.1); }
    if (q.length) add(`${sp!.name}: ${q.map(tagName).join(", ")} (people)`, 0.12);
    for (const [tag, why, v] of obj.risks ?? []) if (caps.includes(tag)) add(why, v);
  }
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
  // Phase 6: the anomaly's own rules, and what the file says about it
  const def = inc.scpId ? anomalyDef(inc.scpId) : inc.kind === "outbreak" ? anomalyDef("610") : undefined;
  const capture = inc.kind === "recovery" || (inc.kind === "emergency" && inc.hazard === "scp");
  if (def && c.site && capture) {
    const f = fileOf(c, inc.instance ?? inc.scpId);
    if (def.conventional !== "effective") add(`Gunfire ${def.conventional === "none" ? "does nothing to" : "only delays"} ${f?.stage === "identified" ? def.name : "it"}: numbers and aim don't secure it`, -0.1 * power * (def.conventional === "none" ? 0.8 : 0.5));
    const procs = def.procedures.filter(p => p.needs.length), ready = procs.filter(p => p.needs.every(n => f?.known.includes(n)));
    const share = procs.length ? ready.length / procs.length : 1;
    add(`The file supports ${ready.length} of ${procs.length} procedures`, 0.2 * share - 0.05);
    if (share < 0.5) { primaryCap = Math.min(primaryCap, 0.3); add("Too little is known to follow a containment procedure", -0.05); }
  }
  if (inc.kind === "investigation") add(f6Evidence(inc), 0.05);
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
  const primary = Math.max(0.05, Math.min(primaryCap, 0.25 + total));
  // the people side leans on training for rescue, evacuation and recovery more than on firepower
  const peopleBonus = 0;
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
  const p6 = c.site ? phase6Outcome(c, inc, ops, win, peopleOk) : {};
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
    ...p6,
  };
  // Phase 6: SCP-106 takes people rather than killing them; the taken are missing, not dead
  if (c.site && inc.scpId === "106") for (const m of squad) if (!m.alive && rnd() < 0.7) (r.missing ??= []).push(m.opId);
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
  else if (sq && capabilities(c, sq.squad, ops).some(t => ["can_provide_sustained_observation", "can_read_evidence", "can_scout_route", "can_move_silently"].includes(t))) { outcome = "Intelligence gathered, no capture"; gainIntel(c, 2); extra = " They came back with 2 Intel."; }
  else if (!win && !peopleOk) { outcome = "Failed intervention, the threat escalates"; addExposure(c, inc.region, 6); c.chaos.threat = Math.min(100, c.chaos.threat + (ins ? 3 : 0)); extra = " Exposure in the region rises by 6."; }
  else outcome = "Failed intervention";
  // an incendiary team that burns out an outbreak takes buildings with it
  if (inc.kind === "outbreak" && win && spec === "incendiary") { addExposure(c, inc.region, 3); extra += " The fires took nearby buildings: +3 exposure."; }
  // heavy and demolition work wins fights and costs secrecy
  if (win && sq && capabilities(c, sq.squad, ops).some(t => t === "can_breach_structural_wall" || t === "can_emplace_mg") && (inc.kind === "strike" || inc.kind === "retaliation")) { addExposure(c, inc.region, 2); extra += " Heavy weapons and charges were heard for miles: +2 exposure."; }
  // the squad's kit used on the job comes out of stores
  if (sq) for (const t of capabilities(c, sq.squad, ops)) { const i = TAG_ITEM[t]; if (i && (c.inventory[i] ?? 0) > 0 && ITEMS[i].uses === 1) c.inventory[i]!--; }
  if (sq && win) recordMastery(c, [sq.squad.id]);
  // specialist kit carried in is spent, and gear on the dead is lost
  for (const o of ops) for (const i of o.kit?.items ?? []) if (i && ITEMS[i as ItemId]?.uses === 1 && (c.inventory[i as ItemId] ?? 0) > 0 && rnd() < 0.6) c.inventory[i as ItemId]!--;
  chronicle(c, "deployment", `${team} answered ${inc.title.split(": ")[1] ?? inc.title} without you: ${outcome}.${dead ? ` ${dead} killed.` : ""}`);
  log(c, `After-action, ${inc.title.split(": ")[1] ?? inc.title}: ${team}, ${outcome.toLowerCase()}.${extra} ${debrief.lines.join(" ")}`, win ? "good" : "bad", "command");
}

// ---------- Phase 6: what a hands-off operation actually achieved ----------
function f6Evidence(inc: Incident) { return `${inc.evidence?.length ?? 0} items of evidence to collect`; }
/** Objectives met, evidence brought home, people marked, and the tactical outcome, from the rolls and the squad. A
 *  recovery squad can save the people and leave the threat; a quarantine squad can hold a line and not end it. */
function phase6Outcome(c: Campaign, inc: Incident, ops: Operative[], win: boolean, peopleOk: boolean): Partial<MissionResult> {
  const sq = ops[0] ? squadOfOp(c, ops[0]) : undefined, caps = sq ? capabilities(c, sq.squad, ops) : [];
  const st = (b: boolean) => b ? "done" as const : "failed" as const;
  if (inc.kind === "investigation") {
    const ev = inc.evidence ?? [], careful = caps.includes("can_read_evidence") || caps.includes("can_provide_sustained_observation");
    const got = win ? ev.slice(0, Math.max(1, Math.ceil(ev.length * (careful ? 0.75 : 0.5)))) : [];
    // a careless look at SCP-096's photograph marks someone; reading the scene properly means bagging it unseen
    const photo = got.some(e => e.kind === "photograph" || e.kind === "film") && inc.scpId === "096" && !fileOf(c, "096")?.known.includes("image_carrier");
    const marked = photo && !careful && rnd() < 0.5 && ops[0] ? [ops[0].id] : [];
    return { outcome: win ? "evidence" : "failed", evidence: { examined: [], bagged: got.map(e => e.kind) }, marked,
      objectives: [{ id: "evidence", kind: "evidence", tier: "primary", text: "Collect the evidence", status: st(win) }] };
  }
  if (inc.kind === "outbreak" && inc.variant) {
    const burn = win && caps.includes("can_burn_infected_tile") && rnd() < 0.4;
    const prim = inc.variant === "quarantine_perimeter" ? "hold_perimeter" : inc.variant === "survivor_evacuation" ? "rescue" : "sample";
    return { outcome: burn ? "secured" : win ? (prim === "hold_perimeter" ? "isolated" : "evacuated") : "failed", coreBurned: burn, samples: prim === "sample" && win ? 1 : 0,
      objectives: [{ id: prim, kind: prim, tier: "primary", text: prim, status: st(win) }, { id: "survivors", kind: "rescue", tier: "secondary", text: "Survivors", status: st(peopleOk) }] };
  }
  if (inc.kind === "recovery") return { outcome: win ? "secured" : peopleOk ? "evacuated" : "failed" };
  return {};
}

// ---------- Version 12 capability tags (design 26.6) ----------
/** Kit a tag depends on: no stock, no capability. Tags not listed need only training. */
const TAG_ITEM: Record<string, ItemId> = {
  can_breach_door: "breach_charge", can_erect_barrier: "barricade", can_reduce_spread: "cordon_kit", can_burn_infected_tile: "flamer", can_firebreak: "firebreak_kit",
  can_decontaminate: "decon_agent", can_recover_contaminated_sample: "sample_case", can_breach_structural_wall: "demo_charge", can_fortify: "sandbags", can_carry_two_person: "stretcher",
};
/** What a squad can actually do on this deployment: its specialty's tags, each with its kit in stores, none while
 *  retraining, and none unless someone sent is certified. */
export function capabilities(c: Campaign, sq: Squad, ops: Operative[]): string[] {
  if ((sq.retrainUntil ?? 0) > c.day) return [];
  if (!ops.some(o => o.squad === sq.id && (o.quals ?? []).includes(sq.specialty))) return [];
  return KITS[sq.specialty].tags.filter(t => !TAG_ITEM[t] || (c.inventory[TAG_ITEM[t]] ?? 0) > 0 || (t === "can_burn_infected_tile" && (c.inventory.incendiary ?? 0) > 0));
}
const TAG_NAMES: Record<string, string> = {
  can_breach_door: "breaching charges", can_coordinated_entry: "coordinated entry", can_erect_barrier: "barriers", can_hold_line: "holding a line", can_carry_two_person: "stretcher teams",
  can_secure_transfer: "secure transfers", can_suppress_lane: "suppressing lanes", can_emplace_mg: "emplaced guns", can_reduce_spread: "isolation lines", can_burn_infected_tile: "burning infected ground",
  can_firebreak: "firebreaks", can_decontaminate: "decontamination", can_recover_contaminated_sample: "sealed samples", can_protected_extraction: "protected extraction", can_anchor: "braced positions",
  can_assault: "assault under fire", can_breach_structural_wall: "demolition", can_clear_obstacle: "obstacle clearance", can_fortify: "field fortification", can_restore_device: "repairs",
  can_move_silently: "silent movement", can_covert_access: "covert access", can_provide_sustained_observation: "observation", can_confirm_target: "confirmed targets", can_read_evidence: "reading sign",
  can_scout_route: "route survey", can_designate_insertion: "insertion points",
};
const tagName = (t: string) => TAG_NAMES[t] ?? t;
/** What each kind of incident's objectives accept (design 26.6): capabilities that open a route to the primary
 *  objective, ones that help the people side, the capability without which the primary objective is out of reach,
 *  and capabilities that carry a risk there. */
const OBJECTIVES: Partial<Record<string, { primary: string[]; people: string[]; required?: string; risks?: [string, string, number][] }>> = {
  // Phase 6: investigations and SCP-610's variant operations each need their own capabilities
  investigation: { primary: ["can_read_evidence", "can_provide_sustained_observation", "can_scout_route", "can_move_silently", "can_recover_contaminated_sample"], people: ["can_carry_two_person", "can_secure_transfer"],
    risks: [["can_breach_structural_wall", "Demolitions at a crime scene destroy evidence", -0.08]] },
  quarantine_perimeter: { primary: ["can_reduce_spread", "can_firebreak", "can_erect_barrier", "can_hold_line"], people: ["can_decontaminate"], required: "hold a line the flesh can't cross" },
  survivor_evacuation: { primary: ["can_carry_two_person", "can_protected_extraction", "can_secure_transfer", "can_scout_route"], people: ["can_decontaminate", "can_protected_extraction"] },
  sample_recovery: { primary: ["can_recover_contaminated_sample", "can_protected_extraction"], people: ["can_decontaminate"], required: "seal a sample of the growth" },
  outbreak: { primary: ["can_burn_infected_tile", "can_reduce_spread"], people: ["can_carry_two_person", "can_protected_extraction", "can_secure_transfer", "can_recover_contaminated_sample"], required: "burn or contain SCP-610's growth",
    risks: [["can_breach_structural_wall", "Demolition spreads the growth's debris", -0.05]] },
  strike: { primary: ["can_breach_door", "can_coordinated_entry", "can_breach_structural_wall", "can_assault", "can_emplace_mg", "can_suppress_lane", "can_covert_access"], people: ["can_anchor", "can_hold_line"] },
  retaliation: { primary: ["can_hold_line", "can_erect_barrier", "can_emplace_mg", "can_suppress_lane", "can_fortify", "can_assault"], people: ["can_carry_two_person", "can_secure_transfer"] },
  escort: { primary: ["can_hold_line", "can_erect_barrier", "can_fortify", "can_emplace_mg"], people: ["can_carry_two_person"] },
  rescue: { primary: ["can_read_evidence", "can_scout_route", "can_carry_two_person", "can_secure_transfer"], people: ["can_carry_two_person", "can_protected_extraction", "can_secure_transfer"] },
  recovery: { primary: ["can_read_evidence", "can_provide_sustained_observation", "can_secure_transfer", "can_recover_contaminated_sample"], people: ["can_carry_two_person"],
    risks: [["can_breach_structural_wall", "Explosives near an anomaly", -0.05]] },
  coverup: { primary: ["can_move_silently", "can_covert_access", "can_provide_sustained_observation"], people: ["can_secure_transfer"],
    risks: [["can_breach_structural_wall", "Demolitions draw attention at a cover-up", -0.1], ["can_emplace_mg", "Machine guns draw attention at a cover-up", -0.08]] },
  emergency: { primary: ["can_restore_device", "can_breach_door", "can_decontaminate", "can_scout_route"], people: ["can_carry_two_person", "can_secure_transfer", "can_protected_extraction"] },
};
