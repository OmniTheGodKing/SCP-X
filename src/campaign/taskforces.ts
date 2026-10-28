// Phase 3J: Site-19's other task forces (Eta-10 "See No Evil", Nu-7 "Hammer Down"), field agents for covert work,
// and the independent Foundation sites Site-19 works alongside: their standing with Site-19, what they can lend or
// buy, the teams they lose, and the emergencies they call for help with. Site-19 never runs those sites.
import { earn, spend } from "./ledger";
import { hirePerson } from "./people";
import { REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import { dateText, log, yearOf, type Campaign, type Incident, type Operative } from "./campaign";
import type { MissionResult } from "../game/types";
import { PROJECTS, has, projectLock } from "./research";
import { addStanding } from "./council";
import { chronicle } from "./history";
import { addExposure, isContacted, travelDays } from "./world";
import { FACILITIES_WORLD } from "./geo";
import { newGuard } from "./security";
import { engineerCapacity } from "./base";
import { scpName } from "./containment";
import type { ScpId } from "../game/types";

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export type TaskForce = "e11" | "eta10";
export const TF_NAMES: Record<TaskForce, string> = { e11: "Epsilon-11 \"Nine-Tailed Fox\"", eta10: "Eta-10 \"See No Evil\"" };
export const tfOf = (o: Operative): TaskForce => o.tf ?? "e11";

export interface SiteRelation { rel: number; holds: ScpId[] }
export interface TfState {
  eta10?: boolean;
  nu7?: boolean;
  agents: number;
  /** Agents out of action, and when they're back. */
  hurt: { back: number }[];
  sites: Record<string, SiteRelation>;
  loans: { kind: "engineers" | "guards"; n: number; until: number; site: string; ids?: string[] }[];
  nextLost: number;
  nextEmergency: number;
  /** Rescued operatives from other sites who asked to join: they turn up in the next recruit pool. */
  transferIn?: number;
}
export const newTf = (day: number): TfState => ({
  agents: 2, hurt: [], loans: [], nextLost: day + rand(150, 250), nextEmergency: day + rand(180, 300),
  sites: Object.fromEntries(FACILITIES_WORLD.map(f => [f.name, { rel: 50, holds: [] }])),
});
export const siteOf = (c: Campaign, name: string) => (c.tf.sites[name] ??= { rel: 50, holds: [] });
export function addRel(c: Campaign, site: string, n: number, why: string) {
  const s = siteOf(c, site);
  s.rel = Math.max(0, Math.min(100, s.rel + n));
  if (Math.abs(n) >= 10) chronicle(c, "council", `Relations with ${site} ${n > 0 ? "improved" : "worsened"}: ${why}.`);
}

// ---------- Eta-10 and Nu-7 ----------
export const ETA10 = { cost: 150, standing: 65, held: 2 };
export function canFormEta10(c: Campaign): string | null {
  if (c.tf.eta10) return "Eta-10 is already formed.";
  const held = c.scps.filter(s => s.status === "contained" || s.status === "breach").length;
  if (c.council.standing < ETA10.standing && held < ETA10.held) return `The Council grants a second task force once Site-19 holds ${ETA10.held} anomalies or its standing reaches ${ETA10.standing}.`;
  if (c.funds < ETA10.cost) return `Needs $${ETA10.cost}k.`;
  return null;
}
export function formEta10(c: Campaign) {
  if (canFormEta10(c)) return;
  spend(c, ETA10.cost, "hiring", "Forming MTF Eta-10"); c.tf.eta10 = true;
  chronicle(c, "council", "The O5 Council granted Site-19 a second task force: MTF Eta-10 \"See No Evil\".");
  log(c, "MTF Eta-10 \"See No Evil\" is formed at Site-19. Assign operatives to it on the Personnel tab: they deploy separately from Epsilon-11, so two incidents can be answered at once.", "good", "personnel");
}
/** Eta-10's video goggles: they watch through a camera feed. */
export const GOGGLES = { blink: 0.5, sightSan: 0.5, aim: -10 };
export const NU7 = { cost: 200, call: 30, standing: 70, turn: 3 };
export function canAttachNu7(c: Campaign): string | null {
  if (c.tf.nu7) return "Nu-7 already answers Site-19's calls.";
  const keter = c.scps.some(s => s.cls === "Keter" && (s.status === "contained" || s.status === "breach"));
  if (c.council.standing < NU7.standing && !keter) return `The Council attaches Nu-7 once Site-19 holds a Keter-class anomaly or its standing reaches ${NU7.standing}.`;
  if (c.funds < NU7.cost) return `Needs $${NU7.cost}k.`;
  return null;
}
export function attachNu7(c: Campaign) {
  if (canAttachNu7(c)) return;
  spend(c, NU7.cost, "hiring", "Putting MTF Nu-7 on call"); c.tf.nu7 = true;
  chronicle(c, "council", "MTF Nu-7 \"Hammer Down\" was put on call for Site-19.");
  log(c, `MTF Nu-7 "Hammer Down" is on call: for $${NU7.call}k a time, four heavy troopers join the fight against a raid or a Keter-class breach.`, "good", "command");
}
/** Nu-7's troopers: heavy armor and machine guns. They aren't Site-19's to keep. */
export function nu7Troopers() {
  return Array.from({ length: 4 }, (_, i) => ({
    opId: `nu7-${i}`, name: ["Hollis", "Brandt", "Okoye", "Marsh"][i], call: `N7-${i + 1}`, rankShort: "Sgt",
    hp: 9, maxHp: 9, san: 120, maxSan: 120, aim: 68, blinkFull: 0.07, armor: 2, hasArmor: true, items: [{ id: "frag" as const, uses: 1 }],
    perks: [], traits: [], gun: { name: "M1919 machine gun", type: "mg" as const, dmg: [4, 6] as [number, number], mag: 6, ammo: 6, aim: 0 }, armorHp: 0,
  }));
}

// ---------- support specialists ----------
export const SPECIALIST = { doses: 3 };
const anomalyAt = (inc: Incident) => inc.kind === "breach" || inc.kind === "recovery" || inc.kind === "outbreak" || (inc.kind === "emergency" && inc.hazard !== "insurgents");
/** A field researcher can come along wherever there's an anomaly to take readings on. */
export function canBringResearcher(c: Campaign, inc: Incident) {
  if (!anomalyAt(inc)) return "Only where there's an anomaly to study.";
  const free = c.researchers - Object.values(c.research.assigned).reduce((a, n) => a + n, 0);
  return free < 1 ? "Needs a researcher not working on a project." : null;
}
/** An amnestics specialist goes on cover-ups, with darts and doses of their own. Needs an amnestics lab. */
export function canBringAmnestics(c: Campaign, inc: Incident) {
  if (inc.kind !== "coverup") return "Only on cover-ups.";
  return c.base.facilities.some(f => f.type === "amnestics" && f.daysLeft === 0 && !f.disabled) ? null : "Needs a working amnestics lab.";
}
/** Nu-7 answers raids and Keter-class breaches. */
export function canCallNu7(c: Campaign, inc: Incident) {
  if (!c.tf.nu7) return "Nu-7 isn't on call for Site-19.";
  const keter = inc.kind === "breach" && c.scps.find(s => s.id === inc.scpId)?.cls === "Keter";
  if (inc.kind !== "raid" && !keter) return "Nu-7 only answers raids and Keter-class breaches.";
  return c.funds < NU7.call ? `Needs $${NU7.call}k.` : null;
}

// ---------- field agents ----------
export const AGENT = { cost: 50, max: 6 };
export const agentsFree = (c: Campaign) => c.tf.agents - c.tf.hurt.length - (c.ops ?? []).length;
export function canHireAgent(c: Campaign) { return c.tf.agents >= AGENT.max ? `Site-19 runs at most ${AGENT.max} agents.` : c.funds < AGENT.cost ? `Needs $${AGENT.cost}k.` : null; }
export function hireAgent(c: Campaign) { if (canHireAgent(c)) return; spend(c, AGENT.cost, "hiring", "Field agent hired"); c.tf.agents++; log(c, "A field agent joins Site-19's covert staff.", "good"); }
/** After covert work: the agent may come back hurt, or not at all. */
export function agentRisk(c: Campaign, hurt: number, killed: number, where: string): string {
  const x = Math.random();
  if (x < killed) { c.tf.agents = Math.max(0, c.tf.agents - 1); chronicle(c, "casualty", `A Foundation field agent was killed in ${where}.`); return " The agent didn't come back."; }
  if (x < killed + hurt) { c.tf.hurt.push({ back: c.day + 14 }); return " The agent came back hurt: out for two weeks."; }
  return "";
}

// ---------- partner sites ----------
export const COOP = { sell: { per: 15, min: 3 }, engineers: { n: 2, days: 30, rel: 40, cost: 8 }, guards: { n: 2, days: 30, rel: 40, cost: 8 } };
export function canSellWeapons(c: Campaign) { return (c.materials.ciWeapons ?? 0) < COOP.sell.min ? `Needs ${COOP.sell.min} captured Insurgency weapons in stores.` : null; }
export function sellWeapons(c: Campaign, site: string) {
  if (canSellWeapons(c)) return;
  const n = c.materials.ciWeapons ?? 0, pay = n * COOP.sell.per;
  c.materials.ciWeapons = 0; earn(c, pay, "sales", `Captured weapons sold to ${site}`); addRel(c, site, 3, "bought captured weapons");
  log(c, `${site} buys ${n} captured Insurgency weapons for study and its armoury: +$${pay}k.`, "good");
}
export function canBorrow(c: Campaign, site: string, kind: "engineers" | "guards") {
  const o = COOP[kind], s = siteOf(c, site);
  if (c.tf.loans.some(l => l.site === site)) return `${site} already has people on loan to Site-19.`;
  if (s.rel < o.rel) return `${site} won't lend staff until relations reach ${o.rel} (now ${s.rel}).`;
  if (kind === "engineers" && c.engineers + o.n > engineerCapacity(c)) return "No room to house them.";
  return null;
}
export function borrow(c: Campaign, site: string, kind: "engineers" | "guards") {
  if (canBorrow(c, site, kind)) return;
  const o = COOP[kind];
  const loan: TfState["loans"][number] = { kind, n: o.n, until: c.day + o.days, site };
  if (kind === "engineers") for (let i = 0; i < o.n; i++) hirePerson(c, "engineer", site);
  else { loan.ids = []; for (let i = 0; i < o.n; i++) { const g = newGuard(c); g.name = `${g.name} (${site})`; c.guards.push(g); loan.ids.push(g.id); } }
  c.tf.loans.push(loan);
  addRel(c, site, -o.cost, `lent Site-19 ${kind}`);
  log(c, `${site} lends Site-19 ${o.n} ${kind} until ${dateText(loan.until)}.`, "good");
}
function endLoans(c: Campaign) {
  for (const l of c.tf.loans.filter(x => c.day >= x.until)) {
    c.tf.loans = c.tf.loans.filter(x => x !== l);
    if (l.kind === "engineers") {
      const gone = (c.people ?? []).filter(p => p.loan === l.site);
      c.people = (c.people ?? []).filter(p => !gone.includes(p));
      c.engineers = Math.max(0, c.engineers - gone.filter(p => !p.away).length);
    }
    else c.guards = c.guards.filter(g => !l.ids?.includes(g.id) || !g.alive);
    log(c, `${site(l.site)}'s ${l.kind} go home.`, "key");
  }
}
const site = (s: string) => s;

// ---------- lost teams and emergencies at other sites ----------
const CAUSES: { cause: string; insurgency: boolean }[] = [
  { cause: "A containment failure in one of its wings", insurgency: false },
  { cause: "A staff error during a routine procedure", insurgency: false },
  { cause: "A power failure that took the cell locks with it", insurgency: false },
  { cause: "A communications blackout: nobody knows exactly what happened", insurgency: false },
  { cause: "Something the anomaly did that nobody saw coming", insurgency: false },
  { cause: "Sabotage, by the look of the first reports", insurgency: true },
];
function newSiteIncident(c: Campaign, base: Omit<Incident, "id" | "title" | "appeared">, what: string): Incident {
  const inc: Incident = { ...base, id: "inc" + c.nextIncident, title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${what}`, appeared: c.day };
  c.nextIncident++;
  c.incidents.push(inc);
  return inc;
}
/** Another site's MTF has gone quiet in the field: the Council sends Site-19 to find them. */
export function lostTeam(c: Campaign) {
  const open = REGION_IDS.filter(r => isContacted(c, r) && !c.regions[r].collapsed);
  if (!open.length) return;
  const r = pick(open), f = FACILITIES_WORLD.find(x => x.region === r) ?? pick(FACILITIES_WORLD), town = pick(REGIONS[r].towns);
  const team = pick(["Beta-7 \"Maz Hatters\"", "Gamma-5 \"Red Herrings\"", "Lambda-2 \"Lab Rats\"", "Zeta-9 \"Mole Rats\""]);
  const inc = newSiteIncident(c, { kind: "rescue", region: r, map: Math.random() < 0.5 ? "town" : "farm", scpId: "", expires: c.day + travelDays(c, r) + 4,
    insurgents: Math.min(6, 3 + Math.floor((yearOf(c.day) - 1951) / 3)), witnesses: 0, civilians: 0, survivors: rand(2, 3), site: f.name, team }, `${team.split(" ")[0]} lost near ${town}`);
  log(c, `${f.name}'s MTF ${team} stopped reporting near ${town}. The O5 Council sends Site-19 to find them and bring back whoever is left, within ${inc.expires - c.day} days.`, "bad", "command");
  chronicle(c, "council", `${f.name}'s MTF ${team} went missing near ${town}; the Council sent Site-19.`);
}
/** An independent site has a breach it can't handle and calls for help. */
export function siteEmergency(c: Campaign) {
  const f = pick(FACILITIES_WORLD), s = siteOf(c, f.name), cause = pick(CAUSES);
  const held = s.holds.filter(id => id === "173" || id === "049" || id === "106");
  const hazard: Incident["hazard"] = held.length && Math.random() < 0.7 ? "scp" : cause.insurgency ? "insurgents" : "instances";
  const scp = hazard === "scp" ? pick(held) : "";
  const inc = newSiteIncident(c, { kind: "emergency", region: f.region, map: "wingC", scpId: scp, expires: c.day + travelDays(c, f.region) + 2,
    insurgents: hazard === "insurgents" ? rand(3, 5) : 0, witnesses: 0, civilians: 0, site: f.name, hazard, cause: cause.insurgency ? "sabotage" : undefined, report: undefined,
    survivors: rand(2, 4) }, `Emergency at ${f.name}`);
  inc.causeText = cause.cause;
  log(c, `${f.name} is calling for help: ${cause.cause.charAt(0).toLowerCase() + cause.cause.slice(1)}. Researchers are trapped and records are at risk. Respond within ${inc.expires - c.day} days.`, "bad", "command");
  chronicle(c, "council", `${f.name} called Site-19 for help: ${cause.cause.toLowerCase()}.`);
}
/** Nobody went: the other site copes on its own, at a cost. */
export function siteIgnored(c: Campaign, inc: Incident) {
  const name = inc.site ?? "The site";
  addRel(c, name, -15, "Site-19 didn't answer its call");
  addStanding(c, -4, `didn't answer ${name}'s call`);
  if (inc.kind === "emergency") { addExposure(c, inc.region, 6); if (inc.scpId) { const s = siteOf(c, name); s.holds = s.holds.filter(x => x !== inc.scpId); } }
  const what = inc.kind === "rescue" ? `Nobody went for ${inc.team}. They were never heard from again.`
    : `${name} handled its emergency alone. Staff died${inc.scpId ? `, and ${scpName(inc.scpId)} got away from them` : ""} (+6 exposure in ${REGIONS[inc.region].name}).`;
  chronicle(c, "council", what);
  log(c, what, "bad", "command");
}

// ---------- after the mission ----------
/** A lost team found, or another site's emergency answered: counted part by part, not all or nothing. */
export function otherSiteOutcome(c: Campaign, inc: Incident, r: MissionResult): string[] {
  const name = inc.site ?? "The site", out: string[] = [];
  const saved = r.survivorsSaved ?? 0, total = r.survivorsTotal ?? 0;
  if (inc.kind === "rescue") {
    addRel(c, name, saved * 5 - (total - saved) * 2, `Site-19 went after ${inc.team}`);
    addStanding(c, saved ? 2 + saved : -3, saved ? `brought home ${saved} of ${inc.team}` : `couldn't save ${inc.team}`);
    out.push(saved ? `${saved} of ${total} survivors of ${inc.team} ${saved === 1 ? "is" : "are"} on their way back to ${name}.` : `None of ${inc.team} came home.`);
    if (saved && Math.random() < 0.35) {
      out.push(`One of them, grateful and out of a unit, asks to transfer to Site-19: look for them in next month's recruits.`);
      c.tf.transferIn = (c.tf.transferIn ?? 0) + 1;
    }
    chronicle(c, "council", `${saved} of ${total} of ${name}'s ${inc.team} were brought home by Site-19.`);
    return out;
  }
  const records = r.recordsRecovered ?? 0, rt = r.recordsTotal ?? 0, s = siteOf(c, name);
  let rel = saved * 4 + records * 3 + (r.powerRestored ? 5 : 0) + (r.hazardDealt ? 8 : 0) - (total - saved) * 3;
  out.push(`At ${name}: ${saved} of ${total} trapped researchers brought out; ${records} of ${rt} files of records recovered; power ${r.powerRestored ? "restored" : "still out"}; ${inc.hazard === "scp" ? (r.hazardDealt ? `${scpName(inc.scpId)} back in a container` : `${scpName(inc.scpId)} still loose`) : r.hazardDealt ? "the threat put down" : "the threat still inside"}.`);
  if (records) { c.intel += records; out.push(`The records hold things worth knowing (+${records} Intel).`); }
  if (inc.hazard === "scp" && !r.hazardDealt) { addExposure(c, inc.region, 8); s.holds = s.holds.filter(x => x !== inc.scpId); out.push(`${scpName(inc.scpId)} is loose from ${name} (+8 exposure in ${REGIONS[inc.region].name}).`); rel -= 5; }
  if (inc.hazard === "insurgents" && r.hazardDealt) out.push("It was sabotage: the Insurgents inside are dead or taken.");
  addRel(c, name, rel, `Site-19 answered its emergency`);
  addStanding(c, Math.max(-4, Math.min(8, Math.round(rel / 4))), `answered ${name}'s emergency`);
  chronicle(c, "council", out[0]);
  return out;
}
/** Readings a field researcher took: work toward research on that anomaly, or useful to the other sites. */
export function scanOutcome(c: Campaign, r: MissionResult): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(r.scans ?? {})) {
    const p = Object.keys(PROJECTS).find(k => PROJECTS[k].branch === `SCP-${id}` && !has(c, k) && !projectLock(c, k));
    if (p) { c.research.progress[p] = (c.research.progress[p] ?? 0) + 6 * n; out.push(`The field researcher's readings put ${6 * n} researcher-days into ${PROJECTS[p].name}.`); }
    else { earn(c, 10 * n, "grants", "Field researcher's readings"); out.push(`The field researcher's readings go to the other sites (+$${10 * n}k).`); }
  }
  return out;
}

// ---------- every day ----------
export function tickTf(c: Campaign) {
  const t = c.tf;
  t.hurt = t.hurt.filter(h => h.back > c.day);
  endLoans(c);
  if (yearOf(c.day) >= 1952 && c.day >= t.nextLost) { lostTeam(c); t.nextLost = c.day + rand(150, 250); }
  if (yearOf(c.day) >= 1952 && c.day >= t.nextEmergency) { siteEmergency(c); t.nextEmergency = c.day + rand(180, 300); }
  for (const inc of [...c.incidents]) {
    if ((inc.kind !== "rescue" && inc.kind !== "emergency") || inc.id === c.activeIncident || c.day <= inc.expires) continue;
    c.incidents = c.incidents.filter(i => i !== inc);
    c.stats.missed++;
    siteIgnored(c, inc);
  }
}
