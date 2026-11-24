// Phase 6: SCP storylines. An anomaly's story is a small state machine that can run across many missions and months:
// first reports, an investigation, the encounter, consequences (people taken or marked, outbreaks that come back), and
// what the rest of the Foundation does when the player's site doesn't act. Stages branch on mission outcomes and on
// what is known; an unanswered stage moves on without the player. Every stage records whether it follows the SCP Wiki
// article ("source"), adapts it ("adaptation") or is original to SCP-X ("original").
//
// Only campaigns with a founded site (c.site, Phase 5 onwards) start storylines; older campaigns keep their direct
// sightings. The same anomaly is never "first reported" twice: the arc's stage and the dossier remember.
import { rnd } from "../core/rng";
import { ANOMALIES, type ContinuityKind, type EvidenceKind, type MissionVariant } from "../data/anomalies";
import { fieldMap } from "../data/maps";
import { REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import type { ScpId } from "../game/types";
import { log, type Campaign, type Incident } from "./campaign";
import { addExposure, travelDays } from "./world";
import { chronicle } from "./history";
import { canSpawnAnomaly, fileOf, missingOf, MISSING, type Stage } from "./dossier";
import { firstSighting, startBreach } from "./containment";
import { homeRegion } from "./org";
import { has } from "./research";

export interface ArcState {
  id: string;
  stage: string;
  since: number;
  region?: RegionId;
  where?: string;
  /** Times a stage went unanswered (the world moves on after enough of them). */
  missed: number;
  history: { day: number; stage: string; text: string; source: ContinuityKind }[];
  done?: boolean;
}

const rand = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
export const ARC_SCPS = ["049", "096", "106", "610"] as const;
export const storylinesOn = (c: Campaign) => !!c.site;

function note(c: Campaign, a: ArcState, stage: string, text: string, source: ContinuityKind) {
  a.stage = stage; a.since = c.day;
  a.history.unshift({ day: c.day, stage, text, source });
  chronicle(c, "anomaly", `${text}${source === "original" ? " (SCP-X)" : source === "adaptation" ? " (SCP-X adaptation)" : ""}`);
}
export const arcOf = (c: Campaign, id: string) => (c.arcs ??= {})[id];
function newArc(c: Campaign, id: string): ArcState {
  const open = REGION_IDS.filter(r => !c.regions[r].collapsed && r !== homeRegion(c));
  const region = pick(open.length ? open : REGION_IDS), where = pick(REGIONS[region].towns);
  return ((c.arcs ??= {})[id] = { id, stage: "none", since: c.day, region, where, missed: 0, history: [] });
}
function incident(c: Campaign, i: Omit<Incident, "id" | "title" | "appeared"> & { what: string }): Incident {
  const inc: Incident = { ...i, id: "inc" + c.nextIncident, title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${i.what}`, appeared: c.day };
  c.nextIncident++;
  c.incidents.push(inc);
  return inc;
}

// ---------------------------------------------------------------- the first reports

interface Opening { what: (w: string) => string; variant: MissionVariant; evidence: EvidenceKind[]; presence: number; carter: (w: string) => string; source: ContinuityKind }
const OPENINGS: Record<string, Opening> = {
  "049": { what: w => `Unexplained deaths near ${w}`, variant: "death_investigation", evidence: ["medical", "remains", "remains", "testimony"], presence: 0.35, source: "adaptation",
    carter: w => `Krista Carter, Chief of Operations: "Three deaths in a week near ${w}. Healthy adults, no cause on the certificates, and two of the bodies went missing from the undertaker's. Send a team to look before anyone else does."` },
  "096": { what: w => `Hiker killed near ${w}`, variant: "attack_investigation", evidence: ["remains", "photograph", "testimony", "records"], presence: 0, source: "original",
    carter: w => `Carter: "A hiker torn apart near ${w}, forty miles from where he camped. His camera was found with him. Find out what did it. Nobody develops that film without screening."` },
  "106": { what: w => `Disappearances near ${w}`, variant: "corrosion_investigation", evidence: ["corrosion", "corrosion", "records", "testimony"], presence: 0.3, source: "adaptation",
    carter: w => `Carter: "People missing from locked rooms near ${w}. The local police say the cellar walls are rotting. I want eyes on it before we send a containment team."` },
};
const label = (k: EvidenceKind, i: number) => ({ remains: ["The first body", "The second body", "A body"], medical: ["The doctor's case notes"], testimony: ["A frightened local"],
  photograph: ["The hiker's camera"], records: ["A visitor's log", "The police report"], corrosion: ["A rotted cellar wall", "A doorframe eaten through"], growth: ["Growth on the barn wall"],
  scrapes: ["Scrape marks"], residue: ["A dark smear"], film: ["A film reel"] } as Record<EvidenceKind, string[]>)[k][i % 3] ?? k;

/** First reports of an anomaly the player's site doesn't know yet: an investigation, not a capture. Returns whether
 *  the storyline took over from the old direct sighting. */
export function beginArc(c: Campaign, id: string): boolean {
  if (!storylinesOn(c) || !OPENINGS[id] || !canSpawnAnomaly(c, id)) return false;
  const a = arcOf(c, id) ?? newArc(c, id);
  if (a.stage !== "none") return false;
  const o = OPENINGS[id], ev = o.evidence;
  incident(c, { kind: "investigation", scpId: id, first: true, variant: o.variant, region: a.region!, map: fieldMap("recovery"),
    evidence: ev.map((k, i) => ({ kind: k, label: label(k, ev.slice(0, i).filter(x => x === k).length) })), presence: rnd() < o.presence,
    expires: c.day + travelDays(c, a.region!) + 6, insurgents: 0, civilians: 2, arc: id, stage: "reports", what: o.what(a.where!) });
  note(c, a, "reports", `First reports near ${a.where}: ${ANOMALIES[id].report}`, o.source);
  log(c, o.carter(a.where!), "bad", "command");
  return true;
}

/** The encounter: the capture incident, with whatever the investigation found. */
function encounter(c: Campaign, a: ArcState, extra: Partial<Incident> = {}, why = "") {
  if (!canSpawnAnomaly(c, a.id)) return;
  firstSighting(c, a.id as ScpId, { region: a.region, where: a.where, extra: { arc: a.id, stage: "encounter", ...extra } });
  note(c, a, "encounter", `${why}The trail leads to the cause near ${a.where}.`, "adaptation");
}

// ---------------------------------------------------------------- results and expiry

/** A storyline incident's mission is over: decide the next stage from how it went. */
export function arcAfterMission(c: Campaign, inc: Incident | undefined, outcome: string | undefined, r: { marked?: string[]; win: boolean }) {
  if (!inc?.arc) return;
  const a = arcOf(c, inc.arc);
  if (!a || a.done) return;
  const f = fileOf(c, a.id), stage: Stage = f?.stage ?? "unknown";
  if (inc.stage === "reports") {
    if (outcome === "secured") { a.done = true; note(c, a, "contained", `${ANOMALIES[a.id].name} was contained by the investigating team on the spot.`, "original"); return; }
    if (a.id === "096" && r.marked?.length) {
      const op = r.marked[0];
      encounter(c, a, { markedOp: op, expires: c.day + travelDays(c, a.region!) + 5 }, "Someone looked at the hiker's photograph. ");
      log(c, `Carter: "Whatever was on that film is coming for ${opName(c, op)}. Every report puts it on the move toward them. Contain it before it arrives."`, "bad", "command");
      return;
    }
    if (outcome === "evidence") encounter(c, a, {}, stage === "identified" ? "" : "The evidence is in the labs. ");
    else { a.missed++; a.stage = "reports_failed"; a.since = c.day; }
    return;
  }
  if (inc.stage === "encounter") {
    if (outcome === "secured") { a.done = true; note(c, a, "contained", `${ANOMALIES[a.id].name} was recovered.`, "adaptation"); clearMarks(c, a.id); }
    else if (inc.markedOp) markedDies(c, a, inc.markedOp);
  }
  if (inc.stage === "search" && a.id === "106") a.stage = "contained_or_loose";
}
/** An investigation or encounter nobody went to. The world moves on without the player. */
export function arcExpired(c: Campaign, inc: Incident) {
  const a = inc.arc ? arcOf(c, inc.arc) : undefined;
  if (!a || a.done) return false;
  c.incidents = c.incidents.filter(i => i !== inc);
  a.missed++;
  addExposure(c, inc.region, 6);
  if (inc.markedOp) { markedDies(c, a, inc.markedOp); return true; }
  if (a.missed >= 2 && a.id !== "610") {
    // another site's task force takes it in: the player's site never gets to study it
    a.done = true;
    const f = fileOf(c, a.id); if (f) { f.location = "elsewhere"; f.holder = "Site-19"; }
    note(c, a, "elsewhere", `With nobody from the site answering, a Foundation task force from Site-19 recovered ${ANOMALIES[a.id].name} near ${a.where}.`, "original");
    log(c, `Carter: "${inc.title.split(": ")[1]} went unanswered twice. Site-19's own people went in and took it. It's theirs now (+6 exposure in ${REGIONS[inc.region].name})."`, "bad", "command");
    return true;
  }
  a.stage = "reports_failed"; a.since = c.day;
  log(c, `${inc.title.split(":")[0]} went unanswered. More people will die before anyone knows what this is (+6 exposure in ${REGIONS[inc.region].name}).`, "bad", "command");
  return true;
}

function opName(c: Campaign, opId: string) { const o = c.roster.find(x => x.id === opId); return o ? `${o.call} ${o.name}` : "the marked operative"; }
function clearMarks(c: Campaign, id: string) { c.marked = (c.marked ?? []).filter(m => m.by !== id); }
/** SCP-096 reaches the person who saw its face, wherever they are, and goes quiet again somewhere far away. */
function markedDies(c: Campaign, a: ArcState, opId: string) {
  const o = c.roster.find(x => x.id === opId);
  c.marked = (c.marked ?? []).filter(m => m.opId !== opId);
  if (o && o.alive) {
    o.alive = false; o.busy = undefined; o.hp = 0; o.diedDay = c.day; o.diedAt = "the site, by SCP-096";
    log(c, `${o.call} ${o.name} was killed at the site in the night. The walls between the barracks and the surface were torn through. Whatever did it was gone by morning.`, "bad", "personnel");
    chronicle(c, "casualty", `${o.call} ${o.name} was killed by SCP-096, which crossed the country to reach them after they saw its face.`, { op: o.id });
  }
  a.stage = "reports_failed"; a.since = c.day;
  addExposure(c, homeRegion(c), 8);
}

// ---------------------------------------------------------------- daily

/** Daily: stages that wait (a failed investigation turns into an encounter after a while), searches for the missing,
 *  SCP-610's quarantine and evacuation operations, and outbreaks coming back where it burned before. */
export function tickArcs(c: Campaign) {
  if (!storylinesOn(c)) return;
  for (const a of Object.values(c.arcs ?? {})) {
    if (a.done) continue;
    // after a failed or missed investigation, it gets worse until the cause is found anyway, with nothing known
    if (a.stage === "reports_failed" && c.day - a.since >= 10 && a.id !== "610" && canSpawnAnomaly(c, a.id) && !c.incidents.some(i => i.arc === a.id)) {
      addExposure(c, a.region!, 4);
      encounter(c, a, {}, "More deaths, and this time a sighting. ");
    }
  }
  tickSearches(c);
  tick610(c);
  tick096Footage(c);
}

export const FOOTAGE = { chance: 0.3, every: 30 };
/** SCP-096 held without image screening: now and then a reel or a print from its cell's camera reaches someone
 *  unscreened. Whoever looks is marked, and it breaks out to reach them. Image screening research stops it. */
export function tick096Footage(c: Campaign, force = false) {
  const s = c.scps.find(x => x.id === "096" && x.status === "contained");
  if (!s || has(c, "image_screening") || (!force && (c.day % FOOTAGE.every !== 15 || rnd() >= FOOTAGE.chance))) return null;
  log(c, `Dr. Bell: "A reel from the camera in SCP-096's cell went to the film lab without screening, and someone ran it. I want facial-image screening funded today."`, "bad", "research");
  const inc = startBreach(c, s, "Footage of its face reached the film lab.");
  if (inc) { inc.variant = "surveillance_contamination"; inc.title = inc.title.replace(" breach", " breach (surveillance footage)"); }
  const a = arcOf(c, "096") ?? newArc(c, "096");
  note(c, a, a.stage, "Unscreened footage from SCP-096's cell was viewed at the site, and it broke containment to reach the viewer.", "original");
  return inc;
}

/** People SCP-106 took sometimes surface: a search and recovery operation where it happened. */
function tickSearches(c: Campaign) {
  const lost = missingOf(c).filter(x => x.m.by === "106");
  if (!lost.length || c.incidents.some(i => i.stage === "search")) return;
  const chance = has(c, "pocket_study") ? MISSING.foundStudied : MISSING.foundChance;
  if (rnd() >= chance) return;
  const region = lost[0].m.region, where = pick(REGIONS[region].towns), ops = lost.slice(0, 2).map(x => x.o.id);
  const held = c.scps.some(s => s.id === "106" && (s.status === "contained" || s.status === "holding" || s.status === "away" || s.status === "leaving"));
  const inc = incident(c, { kind: "rescue", scpId: held ? "" : "106", region, map: fieldMap("rescue"), team: "the missing", survivors: ops.length, recoverOps: ops,
    insurgents: 0, expires: c.day + travelDays(c, region) + 4, arc: "106", stage: "search", variant: "personnel_recovery", what: `Survivor reported near ${where}` });
  log(c, `Carter: "A farmer near ${where} found someone crawling out of a black stain in his cellar, babbling about corridors. ${ops.map(id => opName(c, id)).join(" and ")} could be down there. Go and get them."`, "bad", "command");
  const a = arcOf(c, "106") ?? newArc(c, "106");
  note(c, a, a.stage, `Survivors of SCP-106's pocket dimension were reported near ${where}.`, "original");
  void inc;
}
/** A search's result: those brought out come home, with what they saw. */
export function searchOutcome(c: Campaign, inc: Incident, saved: number): string[] {
  const out: string[] = [];
  for (const opId of (inc.recoverOps ?? []).slice(0, saved)) {
    const o = c.roster.find(x => x.id === opId);
    if (!o) continue;
    c.missing = (c.missing ?? []).filter(m => m.opId !== opId);
    o.busy = undefined; o.hp = Math.max(1, Math.floor(o.maxHp / 2)); o.san = Math.max(10, o.san - 40); o.survivor = true;
    if (!o.traits.includes("nightmares")) o.traits.push("nightmares");
    c.materials.survivors = (c.materials.survivors ?? 0) + 1;
    out.push(`${o.call} ${o.name} is home from SCP-106's pocket dimension. They will never talk about it properly, and they have nightmares.`);
  }
  return out;
}

// ---------------------------------------------------------------- SCP-610

const has610Op = (c: Campaign, v: MissionVariant) => c.incidents.some(i => i.kind === "outbreak" && i.variant === v);
function tick610(c: Campaign) {
  const ob = c.outbreak, a = arcOf(c, "610") ?? (ob ? newArc(c, "610") : undefined);
  if (!a) return;
  // variant operations expire like any field incident
  for (const inc of c.incidents.filter(i => i.kind === "outbreak" && i.variant && c.day > i.expires && i.id !== c.activeIncident && !i.dispatch)) {
    c.incidents = c.incidents.filter(i => i !== inc);
    log(c, `${inc.title.split(":")[0]} went unanswered.${inc.variant === "survivor_evacuation" ? ` The survivors near ${REGIONS[inc.region].name} were lost to it.` : ""}`, "bad", "command");
    addExposure(c, inc.region, 4);
  }
  if (!ob) return;
  a.region = ob.region;
  const days = (n: number) => c.day + travelDays(c, ob.region) + n;
  if (a.stage === "none" || a.stage === "recurred") {
    note(c, a, "outbreak", `SCP-610 broke out near ${pick(REGIONS[ob.region].towns)}.`, "adaptation");
  }
  if (!has610Op(c, "quarantine_perimeter") && c.day - a.since >= 2 && (ob.quarantinedUntil ?? 0) < c.day && !a.history.some(h => h.stage === "quarantine" && c.day - h.day < 30)) {
    incident(c, { kind: "outbreak", variant: "quarantine_perimeter", scpId: "", region: ob.region, map: fieldMap("outbreak"), insurgents: 0, civilians: 3, expires: days(5), arc: "610", stage: "quarantine",
      what: `SCP-610 quarantine line, ${REGIONS[ob.region].name}` });
    note(c, a, "quarantine", "The regional command asked for a quarantine line around the outbreak.", "original");
    log(c, `Carter: "The outbreak in ${REGIONS[ob.region].name} needs a line around it before it reaches the next town. A Quarantine squad holds a line best. It won't end the outbreak, but it stops it growing."`, "key", "command");
  }
  if (ob.severity >= 3 && !has610Op(c, "survivor_evacuation") && !a.history.some(h => h.stage === "evacuation" && c.day - h.day < 20)) {
    incident(c, { kind: "outbreak", variant: "survivor_evacuation", scpId: "", region: ob.region, map: fieldMap("outbreak"), insurgents: 0, civilians: 4, expires: days(3), arc: "610", stage: "evacuation",
      what: `Survivors cut off by SCP-610, ${REGIONS[ob.region].name}` });
    note(c, a, "evacuation", "Survivors were reported cut off inside the outbreak zone.", "original");
  }
  if (has(c, "containment_suit") && !(c.materials as Record<string, number>).samples610 && !has610Op(c, "sample_recovery") && !a.history.some(h => h.stage === "sample")) {
    incident(c, { kind: "outbreak", variant: "sample_recovery", scpId: "", region: ob.region, map: fieldMap("outbreak"), insurgents: 0, civilians: 1, expires: days(6), arc: "610", stage: "sample",
      what: `SCP-610 sample recovery, ${REGIONS[ob.region].name}` });
    note(c, a, "sample", "Dr. Bell asked for a sealed sample of the growth.", "original");
    log(c, `Dr. Bell: "We are fighting SCP-610 blind. Bring me a sealed sample of the growth and I can tell you how it spreads."`, "key", "research");
  }
}
/** The outbreak was burned out: the region is marked, and it can come back there. */
export function outbreakEnded(c: Campaign, region: RegionId) {
  if (!(c.blighted ??= []).includes(region)) c.blighted.push(region);
  const a = arcOf(c, "610") ?? newArc(c, "610");
  note(c, a, "burned_out", `SCP-610 was burned out in ${REGIONS[region].name}. Ground it touched stays under watch.`, "adaptation");
  a.stage = "recurred"; a.since = c.day;
  if (!c.outbreakDay) c.outbreakDay = c.day + rand(180, 420);
}
/** Where the next outbreak starts: a region it burned through before, more often than not. */
export function outbreakRegion(c: Campaign, open: RegionId[]): RegionId | undefined {
  const back = (c.blighted ?? []).filter(r => open.includes(r));
  return back.length && rnd() < 0.6 ? pick(back) : undefined;
}
