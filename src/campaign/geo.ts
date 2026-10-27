// The Geoscape: where everything on the World Map sits, what state it's in, and what the player knows about it.
// Incidents are placed at the town they happened in (or at Site-19 for anything inside the site); independent
// Foundation facilities are shown too, but Site-19 is the only one the player runs.
import { agentRisk, agentsFree } from "./taskforces";
import { addThreat, reveal, scanReveals } from "./chaos";
import { REGIONS, SITE19, type RegionId } from "../data/regions";
import { anomalyProgress, has } from "./research";
import { rewardText } from "./council";
import { addExposure, flightOut, isContacted, locateCell, travelDays } from "./world";
import { scpName } from "./containment";
import { mtfArrival, raidArrival } from "./security";
import { MISSION_BONUS, dateText, gainIntel, log, yearOf, type Campaign, type Incident } from "./campaign";
import { rollCandidate } from "../data/units";
import { WEATHER, rollWeather, type Weather } from "../data/weather";

/** Where each town is (fictional towns placed in their real regions). */
export const TOWN_POS: Record<string, [number, number]> = {
  "Elk Ridge, Pennsylvania": [-77.5, 41], "Harlan Falls, Ohio": [-82.5, 40.2], "Cole Hollow, West Virginia": [-81, 38.3], "Millbrook, Vermont": [-72.7, 44],
  "Dry Wells, Nevada": [-116.5, 38.5], "Copperton, Arizona": [-111.5, 34], "Wapiti, Montana": [-110.5, 46.5], "Saltgrass, Utah": [-112.5, 40.5],
  "San Rafael, Guatemala": [-90.5, 15], "Puerto Viejo, Costa Rica": [-82.8, 9.7], "Itaquera, Brazil": [-46.5, -23.5], "Villa Alta, Mexico": [-96.2, 17.3],
  "Ashby St Ledger, England": [-1.2, 52.3], "Saint-Aubin, France": [0.5, 48], "Kleinhausen, West Germany": [9, 50], "Brugelette, Belgium": [3.85, 50.6],
  "Port Sudan": [37.2, 19.6], "Kano, Nigeria": [8.5, 12], "Kolwezi, Belgian Congo": [25.5, -10.7], "Aqaba, Jordan": [35, 29.5],
  "Taegu, Korea": [128.6, 35.9], "Sasebo, Japan": [129.7, 33.2], "Keelung, Taiwan": [121.7, 25.1], "Okinawa": [127.8, 26.3],
};

/** Other Foundation facilities: independent, with their own staff and command. Shown for context; calls for help
 *  from them arrive in Phase 3J. */
export const FACILITIES_WORLD = [
  { id: "site17", name: "Site-17", region: "west_us" as RegionId, lon: -105, lat: 39, desc: "Holds Safe and Euclid humanoid anomalies. Takes Site-19's anomalies for safekeeping in an emergency." },
  { id: "site23", name: "Site-23", region: "europe" as RegionId, lon: 10.5, lat: 60, desc: "A northern European containment site." },
  { id: "area12", name: "Area-12", region: "east_asia" as RegionId, lon: 139, lat: 36, desc: "A Pacific research and storage area." },
];

/** Where an incident is: its town if the title names one, Site-19 for anything inside the site, else the region. */
export function incidentPlace(inc: Incident): { name: string; lon: number; lat: number } {
  if (inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid") return { name: "Site-19", ...SITE19 };
  if (inc.kind === "emergency") { const f = FACILITIES_WORLD.find(x => x.name === inc.site); if (f) return { name: f.name, lon: f.lon, lat: f.lat }; }
  const town = REGIONS[inc.region].towns.find(t => inc.title.includes(t.split(",")[0]));
  if (town && TOWN_POS[town]) return { name: town, lon: TOWN_POS[town][0], lat: TOWN_POS[town][1] };
  // no town in the title (an outbreak, say): one of the region's towns, fixed by the incident id
  const d = REGIONS[inc.region], h = [...inc.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const t = d.towns[h % d.towns.length], p = TOWN_POS[t];
  return p ? { name: t, lon: p[0], lat: p[1] } : { name: d.name, lon: d.lon, lat: d.lat };
}

export type MarkerGroup = "anomaly" | "insurgency" | "coverup" | "site";
export const groupOf = (inc: Incident): MarkerGroup =>
  inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid" ? "site"
  : inc.kind === "coverup" ? "coverup"
  : inc.kind === "strike" || inc.kind === "retaliation" || inc.kind === "escort" ? "insurgency" : "anomaly";

/** In progress, urgent (now, or the window closes within 2 days), new (appeared in the last 2 days) or open. */
export function incidentState(c: Campaign, inc: Incident): "active" | "urgent" | "new" | "open" {
  if (c.activeIncident === inc.id) return "active";
  if (inc.expires - c.day <= 2) return "urgent";
  if (c.day - inc.appeared <= 2) return "new";
  return "open";
}

/** The field report behind an incident: usually right, sometimes off by one or two, now and then badly wrong.
 *  Kept on the incident so it reads the same every time; a cell that grows later makes it out of date. */
export function reportOf(inc: Incident) {
  if (!inc.report) {
    const x = Math.random(), off = x < 0.7 ? 0 : x < 0.9 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 2));
    inc.report = { ins: Math.max(0, inc.insurgents + off), day: inc.appeared };
  }
  return inc.report;
}

/** What the player knows about an incident, what they don't, and what's at stake, for the briefing panel. */
export function briefing(c: Campaign, inc: Incident) {
  const place = incidentPlace(inc), t = flightOut(c, inc);
  const left = inc.expires - c.day, immediate = inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid" || inc.kind === "escort";
  const ins = Math.max(0, inc.insurgents - (inc.weakened ?? 0));
  const known: string[] = [], estimated: string[] = [], unknown: string[] = [];
  // opposition: confirmed with codebooks or an investigation, otherwise a field report that can be out of date or wrong
  const rep = reportOf(inc), est = Math.max(0, rep.ins - (inc.weakened ?? 0));
  if (inc.kind === "outbreak") known.push("No Insurgents expected; SCP-610 instances and spreading flesh.");
  else if (inc.kind === "riot") known.push("Rioting D-Class, unarmed.");
  else if (has(c, "codebooks") || inc.recon || inc.kind === "raid" || inc.kind === "breach" || inc.kind === "escort") {
    known.push(ins ? `${ins} Insurgents${inc.kind === "raid" ? " at the wire" : ""}.` : "No Insurgents on site.");
    if (inc.recon && rep.ins !== inc.insurgents) known.push(`The first report said ${rep.ins}: it was ${rep.ins < inc.insurgents && inc.grown ? "out of date" : "wrong"}.`);
  } else if (est || ins) estimated.push(`${est <= 1 ? "1 or 2" : `${est - 1} to ${est + 1}`} Insurgents, from a field report of ${dateText(rep.day)}. Reports can be out of date or plain wrong; investigating (or Insurgency codebooks research) confirms the number.`);
  else estimated.push(`No Insurgency activity reported (as of ${dateText(rep.day)}).`);
  // the anomaly
  if (inc.scpId && !inc.first) known.push(`Anomaly: ${scpName(inc.scpId)}.`);
  else if (inc.first && inc.recon) known.push(`Anomaly: ${scpName(inc.scpId)}, identified by investigation.`);
  else if (inc.first) unknown.push("Anomaly: unidentified. Witnesses describe something new; investigating would identify it.");
  if (inc.witnesses) known.push(`${inc.witnesses} witness${inc.witnesses === 1 ? "" : "es"} to dose.`);
  if (inc.kind === "rescue") estimated.push(`${inc.survivors ?? 2} or so of ${inc.team} may still be alive, hiding.`);
  if (inc.kind === "emergency") { estimated.push(`${inc.survivors ?? 2} researchers trapped, records at risk, the power out.`); unknown.push(`Cause: ${inc.causeText ?? "unknown"}, according to the first report.${inc.hazard === "scp" ? ` ${scpName(inc.scpId)}, held there since Site-19 handed it over, is loose.` : " What's loose inside isn't clear."}`); }
  if (inc.civilians) (inc.recon ? known : estimated).push(`${inc.recon ? "" : "About "}${inc.civilians} civilian${inc.civilians === 1 ? "" : "s"} in the area.`);
  if (inc.kind !== "breach" && inc.kind !== "riot" && inc.kind !== "raid" && inc.kind !== "escort") known.push(`Weather and light: ${missionWeather(c, inc) === "clear" ? "clear" : WEATHER[missionWeather(c, inc)].name.toLowerCase()}${nightAt(c, inc) ? ", dark" : ""} right now.`);
  const bonus = MISSION_BONUS[inc.kind] ?? 0;
  const rewards = [bonus ? `$${bonus}k from the O5 Council` : "", inc.kind === "coverup" ? "−10 exposure here" : inc.kind === "riot" || inc.kind === "raid" ? "" : "−5 exposure here",
    inc.kind === "strike" || inc.kind === "retaliation" || inc.kind === "raid" ? "captured Insurgent weapons and prisoners for research" : "",
    inc.first ? (inc.recon ? `${scpName(inc.scpId)} for Site-19 to hold and study (opens ${anomalyProgress(c, inc.scpId).projects.map(p => p.name).join(", ") || "new research"})` : "a new anomaly for Site-19 to hold and study") : "", inc.kind === "outbreak" ? "SCP-610 burned back a stage" : "",
    inc.reward ? `${rewardText(inc.reward)} from the Council for answering this one` : "",
    inc.kind === "rescue" ? `${inc.site}'s gratitude (relations and standing for each survivor brought home), and maybe a transfer to Epsilon-11` : "",
    inc.kind === "emergency" ? `${inc.site}'s gratitude for every part done: researchers out, records recovered (Intel), power restored, the threat dealt with` : "", inc.transfer ? `${scpName(inc.transfer.scp)} delivered to Site-19` : ""].filter(Boolean);
  const ignore = inc.kind === "breach" ? "Site Security faces it alone; it may escape or wreck neighbouring facilities."
    : inc.kind === "riot" ? "Leave it to the guards: a few D-Class die."
    : inc.kind === "raid" ? "Leave it to the guards; if they lose, prisoners go free or the payroll is taken and a building is wrecked."
    : inc.kind === "escort" ? "The convoy is lost with its cargo."
    : inc.kind === "rescue" ? `${inc.team} is never heard from again; ${inc.site} won't forget it (−15 relations, −4 standing).`
    : inc.kind === "emergency" ? `${inc.site} copes alone: staff die, records are lost${inc.scpId ? `, and ${scpName(inc.scpId)} may get away` : ""} (−15 relations, −4 standing, +6 exposure).`
    : inc.kind === "coverup" ? "The story gets out: +12 exposure here. An amnestics team or paying the front handles it without Epsilon-11."
    : inc.kind === "retaliation" ? "People die in the streets: +12 exposure here."
    : inc.kind === "strike" ? "The cell moves on; the Intel spent to find it is wasted."
    : inc.kind === "outbreak" ? "SCP-610 keeps spreading: more exposure every week and a worse stage every two weeks."
    : inc.first ? "It moves on (+10 exposure here) and turns up somewhere else later."
    : "It goes dark again (+15 exposure here) and resurfaces later.";
  const arrivalTurn = inc.kind === "breach" ? mtfArrival(c, inc) : inc.kind === "raid" ? raidArrival(c) : 0;
  return {
    place, travel: t, arrives: c.day + t,
    deadline: immediate ? "Now" : inc.kind === "outbreak" ? "Ongoing: worsens every 2 weeks" : inc.dispatch ? `Handled ${dateText(inc.dispatch.done)}` : left <= 0 ? "Last day" : `${dateText(inc.expires)} (${left} day${left === 1 ? "" : "s"})`,
    short: immediate ? "now" : inc.kind === "outbreak" ? "ongoing" : inc.dispatch ? "en route" : left <= 0 ? "last day" : `${left}d`,
    reachable: inc.kind === "escort" || c.day + t <= inc.expires, known, estimated, unknown, rewards, ignore, worse: worsening(inc),
    arrival: arrivalTurn ? `Epsilon-11 reaches the scene on turn ${arrivalTurn}.` : t ? `The team lands ${dateText(c.day + t)} after ${t} day${t > 1 ? "s" : ""} in the air.` : "The team goes by road and is there the same day.",
  };
}

// ---- investigating incidents, and incidents that worsen while they wait ----
export const INVESTIGATE = { intel: 1, cost: 15, days: 1 };
const immediate = (inc: Incident) => inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid" || inc.kind === "escort";
export function canInvestigate(c: Campaign, inc: Incident): string | null {
  if (immediate(inc) || inc.kind === "outbreak") return "There's no time to investigate this.";
  if (inc.recon) return "Already investigated.";
  if (inc.reconDue) return `A field agent's report is due ${dateText(inc.reconDue)}.`;
  return null;
}
/** Investigate now with Intel, or send a field agent who reports back the next day. */
export function investigate(c: Campaign, inc: Incident, withIntel: boolean) {
  if (canInvestigate(c, inc)) return;
  if (withIntel) { if (c.intel < INVESTIGATE.intel) return; c.intel -= INVESTIGATE.intel; revealed(c, inc, false); return; }
  if (c.funds < INVESTIGATE.cost) return;
  c.funds -= INVESTIGATE.cost; inc.reconDue = c.day + INVESTIGATE.days;
  log(c, `A field agent is on the way to ${incidentPlace(inc).name}. Report due ${dateText(inc.reconDue)}.`);
}
function revealed(c: Campaign, inc: Incident, agent: boolean) {
  inc.recon = true; inc.reconDue = undefined;
  const who = inc.first && inc.scpId ? ` It is ${scpName(inc.scpId)}.` : "";
  const ins = Math.max(0, inc.insurgents - (inc.weakened ?? 0));
  log(c, `${agent ? "Field agent's report" : "Intel report"} on ${inc.title.split(": ")[1] ?? inc.title}:${who} ${ins ? `${ins} Insurgents on site.` : "No Insurgents seen."}`, "key", agent ? "world" : undefined);
}
/** What changes each day an incident waits, for the briefing. */
export function worsening(inc: Incident): string | null {
  if (inc.kind === "strike") return "The cell takes in another Insurgent every 3 days it's left alone (up to 3 more).";
  if (inc.kind === "retaliation") return "Every 2 days a civilian is killed (+2 exposure here).";
  if (inc.kind === "coverup") return "Every 3 days another witness hears the story (up to 2 more).";
  return null;
}

// ---- field operations: scanning a region for leads, and surveillance of Insurgency activity ----
export type FieldOpKind = "scan" | "surveil" | "procure" | "infiltrate";
export interface FieldOp { kind: FieldOpKind; region: RegionId; done: number; }
export const FIELD_OPS: Record<FieldOpKind, { name: string; cost: number; days: number; desc: string }> = {
  scan: { name: "Scan for leads", cost: 20, days: 4, desc: "Front staff work their contacts. Turns up Intel, money, a strong recruit, or sometimes an Insurgency cell." },
  surveil: { name: "Surveillance", cost: 30, days: 6, desc: "Watch the Insurgency's movements here. Usually finds a cell to strike; otherwise yields Intel." },
  procure: { name: "Procurement", cost: 30, days: 5, desc: "Quiet buying through the front: equipment, amnestic precursors or cash from a deal gone right. Low risk." },
  infiltrate: { name: "Infiltration", cost: 40, days: 8, desc: "Put an agent inside the Insurgency's local network: sets its agenda back and turns up its operations. One in five comes back hurt; a few don't come back." },
};
export function canFieldOp(c: Campaign, r: RegionId, k: FieldOpKind): string | null {
  if (c.regions[r].collapsed) return "The front here has collapsed.";
  if (!isContacted(c, r)) return "No front here yet. Make contact first.";
  if ((c.ops ?? []).some(o => o.region === r)) return "An operation is already running here.";
  if (agentsFree(c) < 1) return `Every field agent is busy or hurt (${c.tf.agents} on staff). Hire more at the Command facility.`;
  if (k === "surveil" && c.incidents.some(i => i.kind === "strike" && i.region === r)) return "A cell here is already located.";
  if (c.funds < FIELD_OPS[k].cost) return `Needs $${FIELD_OPS[k].cost}k.`;
  return null;
}
export function startFieldOp(c: Campaign, r: RegionId, k: FieldOpKind) {
  if (canFieldOp(c, r, k)) return;
  c.funds -= FIELD_OPS[k].cost;
  (c.ops ??= []).push({ kind: k, region: r, done: c.day + FIELD_OPS[k].days });
  log(c, `${FIELD_OPS[k].name} begins in ${REGIONS[r].name}. Results ${dateText(c.day + FIELD_OPS[k].days)}.`);
}
function finishOp(c: Campaign, op: FieldOp) {
  const where = REGIONS[op.region].name, roll = Math.random();
  // either kind of field work uncovers a hidden Insurgency operation aimed at this region
  if (scanReveals(c, op.region)) log(c, `Field work in ${where} uncovered an Insurgency operation aimed there.`, "key", "world");
  const risk = op.kind === "infiltrate" ? agentRisk(c, 0.2, 0.05, where) : agentRisk(c, op.kind === "procure" ? 0.03 : 0.06, 0.01, where);
  if (risk) log(c, `Field work in ${where}:${risk}`, "bad", "world");
  if (op.kind === "procure") {
    if (roll < 0.4) { const items = ["frag", "medkit", "smoke", "flashbang", "eyedrops"] as const; const it = items[Math.floor(Math.random() * items.length)]; c.inventory[it] = (c.inventory[it] ?? 0) + 3; log(c, `Procurement in ${where} brought in 3 × ${it === "eyedrops" ? "eye drops" : it}.`, "good", "world"); }
    else if (roll < 0.7) { c.amnestics += 2; log(c, `Procurement in ${where} brought in amnestic precursors (+2 doses).`, "good", "world"); }
    else { const k = 30 + Math.floor(Math.random() * 3) * 10; c.funds += k; log(c, `Procurement in ${where} closed a profitable deal (+$${k}k).`, "good", "world"); }
    return;
  }
  if (op.kind === "infiltrate") {
    addThreat(c, -5, `an agent inside the Insurgency in ${where}`);
    for (const p of c.chaos.plans.filter(x => !x.known)) reveal(c, p.id, "scan");
    gainIntel(c, 1);
    log(c, `Infiltration in ${where}: the agent fed the Insurgency bad information and came back with its plans (agenda −5, +1 Intel${c.chaos.plans.length ? ", every operation identified" : ""}).`, "good", "world");
    return;
  }
  if (op.kind === "surveil") {
    if (roll < 0.7 && !c.incidents.some(i => i.kind === "strike" && i.region === op.region)) { locateCell(c, op.region, true); return; }
    gainIntel(c, 2); log(c, `Surveillance in ${where} found no cell, but picked up their radio traffic (+2 Intel).`, "key", "world"); return;
  }
  if (roll < 0.35) { gainIntel(c, 1 + Math.floor(Math.random() * 2)); log(c, `The scan in ${where} turned up a source inside the Insurgency (+Intel).`, "key", "world"); }
  else if (roll < 0.65) { const k = 20 + Math.floor(Math.random() * 3) * 10; c.funds += k; log(c, `The scan in ${where} found a cache of misappropriated funds (+$${k}k).`, "good", "world"); }
  else if (roll < 0.85) {
    const used = new Set<string>(), cand = rollCandidate(`lead${c.day}`, yearOf(c.day), used, false, true);
    cand.quality = Math.max(1, cand.quality); (c.recruits ??= []).push(cand);
    log(c, `The scan in ${where} found ${cand.name}, a ${cand.quality === 2 ? "very" : ""} promising recruit, now in this month's pool at Command.`, "good", "world");
  } else if (!c.incidents.some(i => i.kind === "strike" && i.region === op.region)) locateCell(c, op.region, true);
  else { gainIntel(c, 1); log(c, `The scan in ${where} came back thin (+1 Intel).`, "key", "world"); }
}

/** Every day: field reports arrive, operations finish, and waiting incidents get worse. */
/** The weather in a region now (clear until the first roll). */
export const weatherAt = (c: Campaign, r: RegionId): Weather => c.regions[r].weather ?? "clear";
/** The weather a mission there would be fought in: indoor maps have none. */
export const missionWeather = (c: Campaign, inc: Incident): Weather => inc.map === "wingC" || inc.map === "dblock" ? "clear" : weatherAt(c, inc.region);
function tickWeather(c: Campaign) {
  const month = new Date(Date.UTC(1951, 5, 1) + (c.day - 1) * 864e5).getUTCMonth();
  for (const [r, st] of Object.entries(c.regions) as [RegionId, Campaign["regions"][RegionId]][])
    if (!st.weather || c.day >= (st.weatherUntil ?? 0)) { st.weather = rollWeather(r, month); st.weatherUntil = c.day + 1 + Math.floor(Math.random() * 3); }
}
/** A line on the weather for briefings: what it is, how long it should last, and what it does. */
export function weatherLine(c: Campaign, inc: Incident) {
  const w = missionWeather(c, inc);
  if (w === "clear") return inc.map === "wingC" || inc.map === "dblock" ? "" : "Weather there: clear.";
  const until = c.regions[inc.region].weatherUntil;
  return `Weather there: ${WEATHER[w].name.toLowerCase()}${until ? `, likely until ${dateText(until)}` : ""}. ${WEATHER[w].desc}`;
}

export function tickGeo(c: Campaign) {
  tickWeather(c);
  for (const inc of c.incidents.filter(i => i.dispatch && c.day >= i.dispatch.done)) resolveDispatch(c, inc);
  for (const inc of c.incidents) {
    if (inc.dispatch) continue;
    if (inc.reconDue && c.day >= inc.reconDue) revealed(c, inc, true);
    if (inc.id === c.activeIncident) continue;
    const waited = c.day - inc.appeared;
    if (inc.kind === "strike" && waited > 0 && waited % 3 === 0 && (inc.grown ?? 0) < 3) { inc.insurgents++; inc.grown = (inc.grown ?? 0) + 1; }
    if (inc.kind === "retaliation" && waited > 0 && waited % 2 === 0 && (inc.civilians ?? 0) > 2) {
      inc.civilians = (inc.civilians ?? 0) - 1; addExposure(c, inc.region, 2);
      log(c, `${inc.title.split(": ")[1] ?? inc.title}: another civilian is dead (+2 exposure).`, "bad");
    }
    if (inc.kind === "coverup" && waited > 0 && waited % 3 === 0 && (inc.grown ?? 0) < 2) { inc.witnesses = (inc.witnesses ?? 0) + 1; inc.grown = (inc.grown ?? 0) + 1; }
  }
  for (const op of (c.ops ?? []).filter(o => c.day >= o.done)) { c.ops = c.ops!.filter(o => o !== op); finishOp(c, op); }
}

/** An incident's name for display: the title without its number, and without the old "Cover-up:" prefix. */
export const incidentName = (inc: Incident) => (inc.title.split(": ").slice(1).join(": ") || inc.title).replace(/^Cover-up: /, "").replace(/^./, ch => ch.toUpperCase());

// ---- cover-ups without Epsilon-11: an amnestics team, or the front paid to bury the story ----
export const AMNESTIC_TEAM = { cost: 10, researchers: 1 };
export const BURY = { base: 30, perWitness: 10, chance: 0.7, days: 1 };
export const buryCost = (inc: Incident) => BURY.base + BURY.perWitness * (inc.witnesses ?? 0);
function coverupWhy(c: Campaign, inc: Incident): string | null {
  if (inc.kind !== "coverup") return "Only for cover-ups.";
  if (inc.dispatch) return "Already being handled.";
  if (c.day + travelDays(c, inc.region) > inc.expires) return "Nobody can get there before the window closes.";
  return null;
}
export function canSendTeam(c: Campaign, inc: Incident): string | null {
  const w = coverupWhy(c, inc); if (w) return w;
  const need = inc.witnesses ?? 0;
  if (c.researchers - Object.values(c.research.assigned).reduce((a, n) => a + n, 0) < AMNESTIC_TEAM.researchers) return "Needs a researcher not working on a project.";
  if (c.amnestics < need) return `Needs ${need} amnestic doses (${c.amnestics} in storage).`;
  if (c.funds < AMNESTIC_TEAM.cost) return `Needs $${AMNESTIC_TEAM.cost}k.`;
  return null;
}
export function sendAmnesticsTeam(c: Campaign, inc: Incident) {
  if (canSendTeam(c, inc)) return;
  const t = travelDays(c, inc.region), doses = inc.witnesses ?? 0;
  c.funds -= AMNESTIC_TEAM.cost; c.amnestics -= doses; c.researchers -= AMNESTIC_TEAM.researchers;
  (c.away ??= []).push({ kind: "researcher", back: c.day + Math.max(1, t) * 2 });
  inc.dispatch = { how: "team", done: c.day + Math.max(1, t), doses };
  log(c, `An amnestics team (a researcher and ${doses} doses) is on its way to ${incidentPlace(inc).name}. They dose the witnesses ${dateText(inc.dispatch.done)}.`);
}
export function canBury(c: Campaign, inc: Incident): string | null {
  const w = coverupWhy(c, inc); if (w) return w;
  if (!isContacted(c, inc.region)) return "There's no front there to bury it.";
  return c.funds < buryCost(inc) ? `Needs $${buryCost(inc)}k.` : null;
}
export function buryStory(c: Campaign, inc: Incident) {
  if (canBury(c, inc)) return;
  c.funds -= buryCost(inc);
  inc.dispatch = { how: "bury", done: c.day + BURY.days, doses: 0 };
  log(c, `${REGIONS[inc.region].front} is paying to bury the story near ${incidentPlace(inc).name}. Word ${dateText(inc.dispatch.done)}.`);
}
function resolveDispatch(c: Campaign, inc: Incident) {
  const d = inc.dispatch!, where = REGIONS[inc.region].name;
  c.incidents = c.incidents.filter(i => i !== inc);
  if (d.how === "team") {
    c.stats.won++; addExposure(c, inc.region, -10);
    log(c, `The amnestics team dosed all ${d.doses} witnesses near ${incidentPlace(inc).name}. Nobody remembers anything worth repeating (−10 exposure in ${where}).`, "good", "world");
  } else if (Math.random() < BURY.chance) {
    c.stats.won++; addExposure(c, inc.region, -5);
    log(c, `The story near ${incidentPlace(inc).name} is buried: retractions, a lost roll of film, a quiet payment (−5 exposure in ${where}).`, "good", "world");
  } else {
    c.stats.lost++; addExposure(c, inc.region, 6);
    log(c, `Paying off the story near ${incidentPlace(inc).name} only half worked. Some of it is out (+6 exposure in ${where}).`, "bad", "world");
  }
}

// ---- territories, local time and night, and flights ----
/** Rough territory of each region as lon/lat boxes [west, south, east, north]. Land outside every box (the Soviet
 *  bloc and China) has no Foundation front. */
export const TERRITORY: Record<RegionId, [number, number, number, number][]> = {
  west_us: [[-170, 15, -100, 75]], east_us: [[-100, 15, -50, 75]], latam: [[-120, -60, -30, 15]],
  europe: [[-30, 35, 30, 72]], africa: [[-20, -40, 60, 35]], east_asia: [[100, -50, 180, 45]],
};
/** The hour at a longitude when it is `hour` at Site-19 (solar time, by longitude). */
export const localHour = (hour: number, lon: number) => ((hour + (lon - SITE19.lon) / 15) % 24 + 24) % 24;
export const isNightHour = (h: number) => h < 6 || h >= 20;
/** Whether a mission there would be fought in the dark: outdoors, by local time on arrival. */
export function nightAt(c: Campaign, inc: Incident) {
  if (inc.map === "wingC" || inc.map === "dblock") return false;
  return isNightHour(localHour(c.hour ?? 0, incidentPlace(inc).lon));
}
/** The night side of the world as lon/lat points: the terminator from the date and Site-19's hour, closed over the dark pole. */
export function nightPolygon(c: Campaign): [number, number][] {
  const d = new Date(Date.UTC(1951, 5, 1) + (c.day - 1) * 864e5), doy = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  let dec = -23.44 * Math.cos((2 * Math.PI / 365) * (doy + 10));
  if (Math.abs(dec) < 0.5) dec = dec < 0 ? -0.5 : 0.5;
  const utc = ((c.hour ?? 0) - SITE19.lon / 15 + 24) % 24 - 0;   // Site-19 keeps local solar time
  const sunLon = (12 - utc) * 15, rad = Math.PI / 180, pts: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 4) {
    const H = (lon - sunLon) * rad;
    pts.push([lon, Math.atan(-Math.cos(H) / Math.tan(dec * rad)) / rad]);
  }
  const pole = dec > 0 ? -90 : 90;
  return [...pts, [180, pole], [-180, pole]];
}
