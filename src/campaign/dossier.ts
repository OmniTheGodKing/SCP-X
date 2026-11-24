// Phase 6: what the Foundation knows about each anomaly and where each instance is, kept apart from the anomaly's
// definition (data/anomalies.ts). Knowledge comes from evidence examined in the field, evidence bagged and analysed in
// Dr. Bell's labs, what teams saw the anomaly do, and research. An anomaly is unknown, then suspected, then identified;
// its file follows it between missions so it is never "discovered" twice.
//
// Also here: people SCP-106 took (missing, not dead, until found or confirmed lost), people SCP-096 marked (it will come
// for them), operatives held in quarantine after coming out contaminated, the uniqueness guard for incident
// generation, and strategic placement of a recovered anomaly (a chamber that meets its needs, temporary or emergency
// holding, transfer, or another site's help).
import { rnd } from "../core/rng";
import { ANOMALIES, CHAMBER_FEATURES, anomalyDef, evidenceProps, propertyOf, scpOf, type ChamberFeature, type EvidenceKind } from "../data/anomalies";
import { REGIONS, type RegionId } from "../data/regions";
import type { MissionResult, TacticalOutcome } from "../game/types";
import { FACILITIES, isContainment, operational, stationsOnLevel, type Facility } from "./base";
import { log, type Campaign, type Incident } from "./campaign";
import { chronicle } from "./history";
import { has } from "./research";

export type Stage = "unknown" | "suspected" | "identified";
export type Location = "unknown" | "loose" | "player" | "elsewhere" | "transit" | "lost";
export interface AnomalyFile {
  id: string;
  stage: Stage;
  known: string[];
  /** Evidence bagged in the field, in the labs: what it is and the day the analysis is done. */
  pending: { kind: EvidenceKind; due: number }[];
  location: Location;
  holder?: string;
  /** The last tactical outcome, and every incident it has been part of. */
  last?: TacticalOutcome;
  history: { day: number; text: string }[];
  breaches: number;
}
export interface Missing { opId: string; by: string; day: number; region: RegionId }
export interface Marked { opId: string; by: string; day: number }

const CLASS_GRADE = { Safe: 0, Euclid: 1, Keter: 2 } as const;
export const ANALYSIS = { minDays: 2, maxDays: 8 };
export const MISSING = { lostAfter: 60, foundChance: 0.02, foundStudied: 0.05 };
export const QUARANTINE_DAYS = 7;
export const HOLDING = { decideDays: 3, dailyEscape: 0.04 };

/** Every anomaly in the registry gets a file; what the Foundation already holds or has records of is filled in. */
export function ensureDossier(c: Campaign) {
  c.dossier ??= {};
  // the player's own SCP-173 is the Provisional Site-11 instance in a founded campaign, Site-19's own otherwise
  const own = c.scps.find(s => s.id === "173");
  if (own && c.site && !own.instance) own.instance = "173:p11";
  for (const def of Object.values(ANOMALIES)) {
    for (const inst of def.instances) {
      if (c.dossier[inst.id]) continue;
      const held = c.scps.some(s => (s.instance ?? s.id) === inst.id);
      const f: AnomalyFile = { id: inst.id, stage: "unknown", known: def.properties.filter(p => p.known).map(p => p.id), pending: [], location: "unknown", history: [], breaches: 0 };
      if (inst.holder && !held) { f.location = "elsewhere"; f.holder = inst.holder; f.stage = "identified"; }
      if (held) { f.location = "player"; f.stage = "identified"; f.known = def.properties.filter(p => !p.research || has(c, p.research)).map(p => p.id); }
      if (f.known.length && f.stage === "unknown") f.stage = "suspected";
      c.dossier[inst.id] = f;
    }
  }
}
export const fileOf = (c: Campaign, id: string): AnomalyFile | undefined => { ensureDossier(c); return c.dossier![id] ?? c.dossier![scpOf(id)]; };
export const knows = (c: Campaign, id: string, prop: string) => !!fileOf(c, id)?.known.includes(prop);
/** What a team going in knows: for MissionSetup.intel. */
export function intelFor(c: Campaign, id: string) {
  const f = fileOf(c, id);
  return { known: [...(f?.known ?? [])], identified: f?.stage === "identified" };
}

function restage(c: Campaign, f: AnomalyFile, how: string) {
  const def = anomalyDef(f.id);
  if (!def || f.stage === "identified") return;
  const hazards = f.known.filter(p => propertyOf(f.id, p)?.hazard).length;
  const next: Stage = f.known.includes("appearance") && hazards >= 1 || hazards >= 2 ? "identified" : f.known.length ? "suspected" : "unknown";
  if (next === f.stage) return;
  f.stage = next;
  if (next === "identified") {
    log(c, `Dr. Catherine Bell, Director of Research: "${how} We know what this is now: ${def.name}, '${def.title}'. Its file is open, and containment planning can start from what we know."`, "key", "research");
    chronicle(c, "anomaly", `${def.name} was identified (${how.replace(/\.$/, "")}).`);
  } else log(c, `Dr. Bell: "Something anomalous is behind this. We don't know what yet, but we know it is real."`, "key");
}
/** Learn one fact. Returns whether it was new. A hazard learned is said plainly: it changes what the teams carry. */
export function learn(c: Campaign, id: string, prop: string, how: string): boolean {
  const f = fileOf(c, id), p = propertyOf(id, prop);
  if (!f || !p || f.known.includes(prop)) return false;
  f.known.push(prop);
  f.history.unshift({ day: c.day, text: `Learned (${how}): ${p.text}` });
  if (p.hazard) log(c, `Dr. Bell: "${how} ${p.text}"`, "key", "research");
  restage(c, f, how);
  return true;
}
export function identify(c: Campaign, id: string, how: string) {
  const f = fileOf(c, id);
  if (!f) return;
  learn(c, id, "appearance", how);
  if (f.stage !== "identified") { f.stage = "identified"; restage(c, { ...f, stage: "suspected" }, how); f.stage = "identified"; }
}

/** How long the labs take to analyse a bagged item: more researchers, faster. */
export const analysisDays = (c: Campaign) => Math.max(ANALYSIS.minDays, ANALYSIS.maxDays - Math.floor(c.researchers / 2));

/** After a mission: what was seen and found goes into the anomaly's file, and the people come home changed. */
export function recordMission(c: Campaign, inc: Incident | undefined, r: MissionResult): string[] {
  const lines: string[] = [];
  const id = inc?.instance ?? inc?.scpId;
  if (id && anomalyDef(id)) {
    const f = fileOf(c, id)!;
    const before = f.known.length;
    for (const p of r.observedProps ?? []) learn(c, id, p, "Seen in the field.");
    if (r.identified) identify(c, id, "The team got a good look at it.");
    for (const k of r.evidence?.bagged ?? []) f.pending.push({ kind: k, due: c.day + analysisDays(c) });
    if (r.evidence?.bagged.length) lines.push(`${r.evidence.bagged.length} item${r.evidence.bagged.length > 1 ? "s" : ""} of sealed evidence went to the labs. Analysis in ${analysisDays(c)} days.`);
    if (f.known.length > before) lines.push(`${anomalyDef(id)!.name === "SCP-" + scpOf(id) && f.stage !== "identified" ? "The unidentified anomaly's" : `${anomalyDef(id)!.name}'s`} file has ${f.known.length - before} new finding${f.known.length - before > 1 ? "s" : ""}.`);
    f.last = r.outcome;
    f.history.unshift({ day: c.day, text: `${inc?.title.split(": ")[1] ?? "Incident"}: ${r.outcome ?? (r.win ? "won" : "lost")}.` });
  }
  // SCP-106's taken: missing, not dead
  for (const opId of r.missing ?? []) {
    const o = c.roster.find(x => x.id === opId);
    if (!o) continue;
    (c.missing ??= []).push({ opId, by: "106", day: c.day, region: inc?.region ?? c.site?.region ?? "east_us" });
    lines.push(`${o.call} ${o.name} was taken by SCP-106. They are listed missing, not dead. If they surface, a team can bring them home.`);
  }
  // SCP-096's marked: it will come for them
  for (const opId of r.marked ?? []) {
    if ((c.marked ??= []).some(m => m.opId === opId)) continue;
    const o = c.roster.find(x => x.id === opId);
    if (!o || !o.alive) continue;
    c.marked.push({ opId, by: "096", day: c.day });
    lines.push(`${o.call} ${o.name} saw its face and is marked. It is coming for them. Contain it before it gets there.`);
  }
  // contaminated people go into quarantine at the site; dirty kit was incinerated
  for (const opId of r.contaminatedOps ?? []) {
    const o = c.roster.find(x => x.id === opId);
    if (!o || !o.alive) continue;
    o.busy = { kind: "quarantine", daysLeft: QUARANTINE_DAYS };
    lines.push(`${o.call} ${o.name} came out carrying contamination: held in quarantine for ${QUARANTINE_DAYS} days.`);
  }
  const lost = Object.entries(r.dirtyLost ?? {}).filter(([, n]) => n);
  if (lost.length) lines.push(`Contaminated kit incinerated: ${lost.map(([k, n]) => `${n} ${k.replace(/_/g, " ")}`).join(", ")}.`);
  return lines;
}

/** Daily: lab analyses finish, research confirms properties, the missing are found or confirmed lost, placement
 *  decisions run out of time, and anomalies held at the dock may break out. */
export function tickDossier(c: Campaign) {
  ensureDossier(c);
  for (const f of Object.values(c.dossier!)) {
    for (const p of f.pending.filter(x => x.due <= c.day)) {
      f.pending = f.pending.filter(x => x !== p);
      const props = evidenceProps(f.id, p.kind).filter(x => !f.known.includes(x.id));
      if (props.length) learn(c, f.id, props[Math.floor(rnd() * props.length)].id, `Analysis of the ${p.kind} brought back from the field.`);
      else log(c, `Dr. Bell: "The ${p.kind} from the field tells us nothing we didn't know."`, "", undefined);
    }
    const def = anomalyDef(f.id);
    for (const p of def?.properties ?? []) if (p.research && has(c, p.research) && !f.known.includes(p.id)) learn(c, f.id, p.id, "Research confirms it.");
  }
  // the missing: found now and then (more often once the pocket dimension is understood), lost after long enough
  for (const m of [...(c.missing ?? [])]) {
    const o = c.roster.find(x => x.id === m.opId);
    if (!o || !o.alive) { c.missing = c.missing!.filter(x => x !== m); continue; }
    if (c.day - m.day >= MISSING.lostAfter) {
      c.missing = c.missing!.filter(x => x !== m);
      o.alive = false; o.busy = undefined; o.diedDay = c.day; o.diedAt = "SCP-106's pocket dimension";
      log(c, `${o.call} ${o.name}, missing since SCP-106 took them, is confirmed lost.`, "bad", "personnel");
      chronicle(c, "casualty", `${o.call} ${o.name} was confirmed lost, ${MISSING.lostAfter} days after SCP-106 took them.`, { op: o.id });
    }
  }
  // a recovered anomaly waiting at the dock for a decision
  for (const s of c.scps.filter(x => x.status === "holding")) {
    if (rnd() < HOLDING.dailyEscape) {
      s.status = "loose"; s.wingId = ""; s.resurfaceDay = c.day + 20 + Math.floor(rnd() * 30);
      if (c.placement?.scpId === s.id) c.placement = undefined;
      log(c, `${s.name} broke out of its transport container at the loading dock while it waited for a cell. It is gone.`, "bad", "site");
      chronicle(c, "breach", `${s.name} escaped from temporary holding at the loading dock.`);
      continue;
    }
    if (c.placement?.scpId === s.id && c.day - c.placement.since >= HOLDING.decideDays) placeAnomaly(c, s.id, "transfer", undefined, true);
  }
}

// ---------------------------------------------------------------- strategic placement

/** The chamber features a wing gives this anomaly, and the ones it lacks. */
export function chamberCheck(c: Campaign, id: string, wing: Facility) {
  const def = anomalyDef(id);
  if (!def) return { grade: true, missing: [] as ChamberFeature[] };
  const grade = (FACILITIES[wing.type].grade ?? 0) >= CLASS_GRADE[def.chamber.grade];
  const missing = def.chamber.features.filter(f => !featureMet(c, f, wing));
  return { grade, missing };
}
export function featureMet(c: Campaign, f: ChamberFeature, wing: Facility): boolean {
  const r = CHAMBER_FEATURES[f].research;
  if (r) return has(c, r);
  if (f === "monitored_cell") return stationsOnLevel(c, wing).length > 0;
  if (f === "furnished_cell") return c.researchers > 0;
  if (f === "biohazard_store") return has(c, "containment_suit");
  return true;
}
export type PlacementKind = "permanent" | "temporary" | "emergency" | "transfer" | "assist";
export interface PlacementOption { kind: PlacementKind; wingId?: string; text: string; missing?: ChamberFeature[] }
const freeWing = (c: Campaign, f: Facility, except?: string) => isContainment(f.type) && operational(f) && !c.scps.some(s => s.id !== except && s.wingId === f.id && (s.status === "contained" || s.status === "breach"));
/** Where a recovered anomaly could go, best first. */
export function placementOptions(c: Campaign, id: string): PlacementOption[] {
  const def = anomalyDef(id), out: PlacementOption[] = [];
  const wings = c.base.facilities.filter(f => freeWing(c, f, id));
  for (const w of wings) {
    const ch = chamberCheck(c, id, w), where = `${FACILITIES[w.type].name} on level ${w.level + 1}`;
    if (ch.grade && !ch.missing.length) out.push({ kind: "permanent", wingId: w.id, text: `Permanent: ${where}, which meets everything it needs.` });
    else if (ch.grade) out.push({ kind: "temporary", wingId: w.id, missing: ch.missing, text: `Temporary: ${where}, without ${ch.missing.map(m => CHAMBER_FEATURES[m].name.toLowerCase()).join(" and ")} (higher breach risk until fitted).` });
    else out.push({ kind: "emergency", wingId: w.id, missing: ch.missing, text: `Emergency: ${where}, below its ${def?.chamber.grade ?? ""} grade (breach risk ×3).` });
  }
  const order: Record<PlacementKind, number> = { permanent: 0, temporary: 1, emergency: 2, transfer: 3, assist: 4 };
  out.sort((a, b) => order[a.kind] - order[b.kind]);
  out.push({ kind: "transfer", text: "Transfer to Site-17: paid for, but the site gives up studying it." });
  out.push({ kind: "assist", text: "Ask the Foundation to hold it for 30 days while a chamber is built (−3 standing)." });
  return out;
}
/** Place it: in a wing (by the option's kind), to Site-17, or held by another site for a while. */
export function placeAnomaly(c: Campaign, id: string, kind: PlacementKind, wingId?: string, ordered = false): string | null {
  const s = c.scps.find(x => x.id === id);
  if (!s) return "No such anomaly.";
  const opts = placementOptions(c, id), opt = opts.find(o => o.kind === kind && (!wingId || o.wingId === wingId));
  if (!opt) return "That isn't possible now.";
  c.placement = undefined;
  const name = s.name;
  if (kind === "transfer") {
    c.scps = c.scps.filter(x => x !== s);
    const f = fileOf(c, s.instance ?? id); if (f) { f.location = "elsewhere"; f.holder = "Site-17"; }
    c.funds += s.cls === "Keter" ? 150 : 100;
    log(c, ordered ? `Vincent Russo, Containment Engineering: "We had nowhere to put ${name}, and the Council wouldn't wait. It went to Site-17 this morning."` : `${name} is transferred to Site-17.`, "key", "site");
    chronicle(c, "anomaly", `${name} was transferred to Site-17${ordered ? " on the Council's order, with no chamber ready for it" : ""}.`);
    return null;
  }
  if (kind === "assist") {
    s.status = "away"; s.wingId = ""; s.returnDay = c.day + 30; s.holding = undefined;
    c.council.standing = Math.max(0, c.council.standing - 3);
    log(c, `Another site holds ${name} for 30 days while a proper chamber is made ready (−3 standing).`, "key", "site");
    return null;
  }
  s.status = "contained"; s.wingId = opt.wingId!; s.holding = kind; s.maintenance = Math.max(s.maintenance, 60); s.lastCleaned = c.day;
  const f = fileOf(c, s.instance ?? id); if (f) { f.location = "player"; f.holder = undefined; }
  if (kind !== "permanent") log(c, `Vincent Russo: "${name} is in the wing, but it's ${kind} holding. ${opt.missing?.length ? `It needs ${opt.missing.map(m => CHAMBER_FEATURES[m].name.toLowerCase()).join(" and ")}.` : ""} Until then, expect trouble."`, "key", "site");
  return null;
}
/** A recovered anomaly arrives: straight into a chamber that meets its needs, or it waits at the dock for a decision. */
export function receiveRecovered(c: Campaign, id: string): "placed" | "holding" {
  const s = c.scps.find(x => x.id === id)!;
  const best = placementOptions(c, id)[0];
  if (best.kind === "permanent") { placeAnomaly(c, id, "permanent", best.wingId); return "placed"; }
  s.status = "holding"; s.wingId = ""; s.holding = undefined;
  c.placement = { scpId: id, since: c.day };
  const def = anomalyDef(id);
  log(c, `Vincent Russo: "${s.name} is at the loading dock in its transport container. Nothing here meets what it needs${def ? ` (${def.chamber.grade}-grade, ${def.chamber.features.map(f => CHAMBER_FEATURES[f].name.toLowerCase()).join(", ")})` : ""}. Decide where it goes within ${HOLDING.decideDays} days, or the Council sends it to Site-17. Every day in the container is a day it could get out."`, "bad", "site");
  return "holding";
}
/** Breach risk from a chamber that lacks what the anomaly needs: ×1.5 per missing feature, with the reasons. */
export function chamberRisk(c: Campaign, id: string, wing: Facility): { mult: number; why: string[] } {
  const ch = chamberCheck(c, id, wing);
  if (!ch.missing.length) return { mult: 1, why: [] };
  return { mult: 1.5 ** ch.missing.length, why: ch.missing.map(m => `No ${CHAMBER_FEATURES[m].name.toLowerCase()}: ×1.5`) };
}

// ---------------------------------------------------------------- uniqueness

/** Whether generic incident generation may create an incident about this anomaly now. A unique anomaly that is held
 *  (here or elsewhere), lost for good, already the subject of an open incident, or already loose with a resurfacing
 *  of its own on the way, can't turn up again as if new. */
export function canSpawnAnomaly(c: Campaign, id: string): boolean {
  const def = anomalyDef(id);
  if ((c.lostScps ?? []).includes(id)) return false;
  if (!def || !def.unique) return true;
  if (c.scps.some(s => s.id === id)) return false;
  if (c.incidents.some(i => i.scpId === id && i.kind !== "breach")) return false;
  const insts = def.instances.map(i => fileOf(c, i.id));
  return !insts.every(f => f && (f.location === "elsewhere" || f.location === "lost"));
}
export const missingOf = (c: Campaign) => (c.missing ?? []).map(m => ({ m, o: c.roster.find(x => x.id === m.opId)! })).filter(x => x.o);
export const regionName = (r: RegionId) => REGIONS[r].name;
