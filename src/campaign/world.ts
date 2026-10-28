import { fieldMap } from "../data/maps";
// The world outside Site-19: regional exposure and Foundation fronts, travel, cover-ups,
// Insurgency cells and amnestics.
import { earn, spend } from "./ledger";
import { lockPlan, addThreat, planActive } from "./chaos";
import { chronicle } from "./history";
import { countOperational } from "./base";
import { dateOf, log, yearOf, type Campaign, type Incident } from "./campaign";
import { newsActive } from "./news";
import type { Weather } from "../data/weather";
import { has } from "./research";
import { addStanding, noteMissed } from "./council";
import { HOME, REGIONS, REGION_IDS, type RegionId } from "../data/regions";

export interface RegionState { exposure: number; collapsed: boolean; lastCoverStory?: number;
  /** false: no Foundation front there yet (older saves leave it unset: contacted). contactDue: the day contact completes. */
  contact?: boolean; contactDue?: number;
  /** Current weather there and the day it next changes. */
  weather?: Weather; weatherUntil?: number; }

export const COLLAPSE_LIMIT = 3;           // fronts lost before the campaign ends
export const COVER_STORY = { cost: 50, amnestics: 2, cut: 10, cooldown: 30 };
export const LOCATE_INTEL = 3;
export const locateIntel = (c: Campaign) => (has(c, "codebooks") ? 2 : LOCATE_INTEL) - (has(c, "lock_studies") ? 1 : 0);
export const coverDoses = (c: Campaign) => has(c, "classb_amnestics") ? 1 : COVER_STORY.amnestics;
export const AMNESTIC_DAYS = 5, AMNESTICS_PER_LAB = 10;

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const newRegions = (start: number): Record<RegionId, RegionState> =>
  Object.fromEntries(REGION_IDS.map(r => [r, { exposure: start, collapsed: false, ...(r === HOME ? {} : { contact: false }) }])) as Record<RegionId, RegionState>;

// ---- front establishment: regions have to be contacted, from a neighbouring front, before normal operations there ----
export const isContacted = (c: Campaign, r: RegionId) => c.regions[r].contact !== false;
/** Which regions a front can reach out to from (shipping lanes and air routes of the 1950s). */
export const LINKS: [RegionId, RegionId][] = [["east_us", "west_us"], ["east_us", "europe"], ["east_us", "latam"], ["west_us", "latam"], ["west_us", "east_asia"], ["europe", "africa"], ["africa", "latam"], ["africa", "east_asia"]];
export const neighbours = (r: RegionId) => LINKS.flatMap(([a, b]) => a === r ? [b] : b === r ? [a] : []);
export const CONTACT = { cost: 50, step: 20, days: 6 };
const contactedCount = (c: Campaign) => REGION_IDS.filter(r => isContacted(c, r)).length;
/** Contact gets dearer with every front: $50k and no Intel for the second, then $20k and 1 Intel more each time. */
export const contactCost = (c: Campaign) => ({ funds: CONTACT.cost + CONTACT.step * (contactedCount(c) - 1), intel: contactedCount(c) - 1 });
export function canContact(c: Campaign, r: RegionId): string | null {
  const st = c.regions[r], k = contactCost(c);
  if (isContacted(c, r)) return "There's already a front there.";
  if (st.collapsed) return "The public knows too much there. No front can be set up.";
  if (st.contactDue) return "Contact is already under way.";
  if (REGION_IDS.some(x => c.regions[x].contactDue)) return "Contact is already being made elsewhere.";
  if (!neighbours(r).some(n => isContacted(c, n) && !c.regions[n].collapsed)) return "Needs a working front in a neighbouring region first.";
  if (c.funds < k.funds) return `Needs $${k.funds}k.`;
  if (c.intel < k.intel) return `Needs ${k.intel} Intel.`;
  return null;
}
export function makeContact(c: Campaign, r: RegionId) {
  if (canContact(c, r)) return;
  const k = contactCost(c);
  spend(c, k.funds, "operations", `Contact in ${REGIONS[r].name}`); c.intel -= k.intel;
  c.regions[r].contactDue = c.day + CONTACT.days;
  log(c, `Foundation agents go into ${REGIONS[r].name} to set up ${REGIONS[r].front} as a front. Contact in ${CONTACT.days} days.`, "key");
}
function tickContact(c: Campaign) {
  for (const r of REGION_IDS) {
    const st = c.regions[r];
    if (st.contactDue === undefined || c.day < st.contactDue) continue;
    st.contactDue = undefined;
    if (st.collapsed) continue;
    st.contact = undefined;
    c.council.tally.contacts++;
    chronicle(c, "region", `Contact made in ${REGIONS[r].name}: ${REGIONS[r].front} became the Foundation's front there.`);
    addStanding(c, 3, `front established in ${REGIONS[r].name}`);
    log(c, `Contact made: ${REGIONS[r].front} is now the Foundation's front in ${REGIONS[r].name}. It passes on funding every month, and field operations, cover stories and cell hunts can be run there.`, "good", "world");
  }
}

/** Global exposure is the average of the regions; a lost front counts as 100. */
export function globalExposure(c: Campaign) {
  return Math.round(REGION_IDS.reduce((a, r) => a + (c.regions[r].collapsed ? 100 : c.regions[r].exposure), 0) / REGION_IDS.length);
}

export function addExposure(c: Campaign, r: RegionId, n: number) {
  const st = c.regions[r];
  if (st.collapsed) return;
  if (n > 0 && (r === "east_us" || r === "latam") && newsActive(dateOf(c.day), "cuba")) n = Math.round(n * 1.5);
  st.exposure = Math.max(0, Math.min(100, st.exposure + n));
  if (st.exposure >= 100) {
    st.collapsed = true; st.contactDue = undefined;
    chronicle(c, "region", `The ${REGIONS[r].front} front in ${REGIONS[r].name} collapsed: the public knows too much there.`);
    if (isContacted(c, r)) addStanding(c, -15, `the front in ${REGIONS[r].name} collapsed`);
    log(c, `The ${REGIONS[r].front} front in ${REGIONS[r].name} has collapsed. The public knows too much there, and its funding is gone.`, "bad", "world");
  }
  c.exposure = globalExposure(c);
}

export const collapsedCount = (c: Campaign) => REGION_IDS.filter(r => c.regions[r].collapsed).length;
/** What an established front sends Site-19 each month, less as exposure rises. */
export const FRONT_PAY = { base: 45, perExposure: 0.3, min: 5 };
export const regionFunding = (c: Campaign, r: RegionId) =>
  c.regions[r].collapsed || !isContacted(c, r) ? 0 : Math.round((planActive(c, "infiltrate", r) ? 0.5 : 1) * Math.round(Math.max(FRONT_PAY.min, Math.round(FRONT_PAY.base - c.regions[r].exposure * FRONT_PAY.perExposure)) * (r === "east_asia" && newsActive(dateOf(c.day), "armistice") ? 1.1 : 1)));

export const transportName = (c: Campaign) => has(c, "c130") ? "C-130 Hercules" : has(c, "c119") ? "C-119 Flying Boxcar" : "C-47 Skytrain";
export function travelDays(c: Campaign, r: RegionId) {
  const base = REGIONS[r].travel;
  if (!base) return 0;
  return Math.max(1, Math.ceil(base * (has(c, "c130") ? 0.5 : has(c, "c119") ? 0.75 : 1)));
}

/** True when a storm over the region holds flights there back a day. */
export const stormDelay = (c: Campaign, r: RegionId) => c.regions[r].weather === "storm" && travelDays(c, r) > 0;
/** Days the squad needs to reach an incident: the flight, a day more in a storm, a day more where there is no front to
 *  arrange the landing, none for an escort. */
export const flightOut = (c: Campaign, inc: Incident) => inc.kind === "escort" ? 0 : travelDays(c, inc.region) + (stormDelay(c, inc.region) ? 1 : 0) + (isContacted(c, inc.region) ? 0 : 1);

const STORIES = [
  "a \"weather balloon\" crash with too many witnesses",
  "a farmhand's photographs",
  "a local newspaper asking questions",
  "churchgoers who saw a \"miracle\"",
  "a trucker's story at the diner",
  "a schoolteacher's letter to her congressman",
];

function newIncident(c: Campaign, i: Omit<Incident, "id" | "title" | "appeared"> & { what: string }): Incident {
  const inc: Incident = { ...i, id: "inc" + c.nextIncident, title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${i.what}`, appeared: c.day };
  c.nextIncident++;
  c.incidents.push(inc);
  return inc;
}

/** Witnesses somewhere need dosing before they talk. Only fronts hear about them, so they turn up where Site-19 has one. */
export function spawnCoverup(c: Campaign, at?: RegionId, quiet = false): Incident | undefined {
  const r = at ?? pick(REGION_IDS.filter(x => !c.regions[x].collapsed && isContacted(c, x)));
  if (!r) return;
  const town = pick(REGIONS[r].towns);
  const inc = newIncident(c, {
    kind: "coverup", region: r, map: fieldMap("coverup"), scpId: "",
    what: `${(st => st[0].toUpperCase() + st.slice(1))(pick(STORIES))}, ${town}`,
    expires: c.day + travelDays(c, r) + 4, insurgents: Math.random() < 0.5 ? 0 : rand(1, 2), witnesses: rand(3, 5), civilians: rand(1, 3),
  });
  if (!quiet) log(c, `${inc.title}. Witnesses need amnestics before the story spreads. Respond within ${inc.expires - c.day} days.`, "bad", "command");
  return inc;
}

export function canLocate(c: Campaign, r: RegionId) {
  if (c.regions[r].collapsed) return "The front there has collapsed.";
  if (!isContacted(c, r)) return "No front there yet. Make contact first.";
  if (c.intel < locateIntel(c)) return `Needs ${locateIntel(c)} Intel.`;
  if (c.incidents.some(i => i.kind === "strike" && i.region === r)) return "A cell there is already located.";
  return null;
}
/** Spend Intel to find an Insurgency cell in a region, creating a strike mission. */
/** `found`: a field operation found it, so no Intel is spent. */
export function locateCell(c: Campaign, r: RegionId, found = false) {
  if (found ? c.incidents.some(i => i.kind === "strike" && i.region === r) : canLocate(c, r)) return;
  if (!found) c.intel -= locateIntel(c);
  const inc = locateCellFor(c, r), town = inc.title.split(", ").pop();
  log(c, `${found ? "Field work in " + REGIONS[r].name + " found" : "Intel points to"} an Insurgency cell operating out of a warehouse near ${town}. Strike within ${inc.expires - c.day} days, before they move.`, "key", found ? "world" : undefined);
}

/** An Insurgency cell in a region, as a strike mission. */
export function locateCellFor(c: Campaign, r: RegionId): Incident {
  const town = pick(REGIONS[r].towns);
  return newIncident(c, {
    kind: "strike", region: r, map: fieldMap("strike"), scpId: "", what: `Insurgency cell, ${town}`,
    expires: c.day + travelDays(c, r) + 7, insurgents: Math.min(7, 4 + Math.floor((yearOf(c.day) - 1951) / 3)), witnesses: 0, civilians: 0,
  });
}
/** The Insurgency attacks a town. */
export function newRetaliation(c: Campaign, r: RegionId): Incident {
  const town = pick(REGIONS[r].towns);
  return newIncident(c, {
    kind: "retaliation", region: r, map: fieldMap("retaliation"), scpId: "",
    what: `Insurgency attack on ${town}`, expires: c.day + travelDays(c, r) + 3,
    insurgents: Math.min(7, 4 + Math.floor((yearOf(c.day) - 1951) / 3)), witnesses: 0, civilians: 6,
  });
}

export function canCoverStory(c: Campaign, r: RegionId) {
  const st = c.regions[r];
  if (st.collapsed) return "The front there has collapsed.";
  if (!isContacted(c, r)) return "No front there yet. Make contact first.";
  if (st.lastCoverStory !== undefined && c.day - st.lastCoverStory < COVER_STORY.cooldown) return `A cover story was run there recently; wait ${COVER_STORY.cooldown - (c.day - st.lastCoverStory)} days.`;
  if (c.funds < COVER_STORY.cost) return `Needs $${COVER_STORY.cost}k.`;
  if (c.amnestics < coverDoses(c)) return `Needs ${coverDoses(c)} amnestics.`;
  return null;
}
/** Plant a cover story: money and amnestics to bring a region's exposure down. */
export function coverStory(c: Campaign, r: RegionId) {
  if (canCoverStory(c, r)) return;
  spend(c, COVER_STORY.cost, "operations", `Cover story in ${REGIONS[r].name}`); c.amnestics -= coverDoses(c);
  c.regions[r].lastCoverStory = c.day;
  addExposure(c, r, -COVER_STORY.cut);
  log(c, `${REGIONS[r].front} plants a cover story in ${REGIONS[r].name} (−${COVER_STORY.cut} exposure there).`, "good");
}

export const amnesticsCapacity = (c: Campaign) => Math.max(4, countOperational(c, "amnestics") * (AMNESTICS_PER_LAB + (has(c, "bt_cold_storage") ? 5 : 0)));

/** One day in the world: amnestics production, cover-ups appearing and expiring. */
export function tickWorld(c: Campaign) {
  tickContact(c);
  const labs = countOperational(c, "amnestics");
  if (labs && c.day % AMNESTIC_DAYS === 0 && c.amnestics < amnesticsCapacity(c)) c.amnestics = Math.min(amnesticsCapacity(c), c.amnestics + labs * (has(c, "classb_amnestics") ? 2 : 1));
  if (c.day >= c.nextCoverupDay) { spawnCoverup(c); c.nextCoverupDay = c.day + rand(25, 60); }
  // SCP-610: the first outbreak in 1954, then it spreads every week it's left alone
  if (c.outbreakDay && c.day >= c.outbreakDay) {
    c.outbreakDay = undefined;
    const open = REGION_IDS.filter(r => r !== HOME && !c.regions[r].collapsed);
    const r = pick(open.length ? open : REGION_IDS);
    c.outbreak = { region: r, severity: 2, lastMission: c.day };
    c.materials.outbreaks = (c.materials.outbreaks ?? 0) + 1;
    const inc = newIncident(c, { kind: "outbreak", region: r, map: fieldMap("outbreak"), scpId: "", what: `SCP-610 outbreak, severity 2`, expires: c.day + 99999, insurgents: 0, witnesses: 0, civilians: 4 });
    log(c, `${inc.title.split(":")[0]}: in ${pick(REGIONS[r].towns)}, people are fusing with something that grows out of the walls. SCP-610, "The Flesh that Hates". It can't be contained, only burned. It will spread every week it's left. Containment suit research is open.`, "bad", "command");
  }
  if (c.outbreak && c.day % 7 === 0) {
    addExposure(c, c.outbreak.region, c.outbreak.severity * 2);
    if (c.day - c.outbreak.lastMission >= 14 && c.outbreak.severity < 5) {
      c.outbreak.severity++; c.outbreak.lastMission = c.day;
      const inc = c.incidents.find(i => i.kind === "outbreak");
      if (inc) inc.title = `${inc.title.split(":")[0]}: SCP-610 outbreak, severity ${c.outbreak.severity}`;
      log(c, `SCP-610 is spreading in ${REGIONS[c.outbreak.region].name}: severity ${c.outbreak.severity} of 5.`, "bad", "command");
    }
  }
  for (const due of (c.retaliations ?? []).filter(x => x.day <= c.day)) {
    c.retaliations = c.retaliations!.filter(x => x !== due);
    if (c.regions[due.region].collapsed) continue;
    const inc = newRetaliation(c, due.region);
    chronicle(c, "insurgency", `The Insurgency attacked ${inc.title.split(" on ").pop()} to punish it for helping the Foundation.`);
    log(c, `${inc.title}. The Insurgency is punishing the town for helping the Foundation. Respond within ${inc.expires - c.day} days.`, "bad", "command");
  }
  for (const inc of [...c.incidents]) {
    if (inc.id === c.activeIncident || inc.dispatch || (inc.kind !== "coverup" && inc.kind !== "strike" && inc.kind !== "retaliation") || c.day <= inc.expires) continue;
    c.incidents = c.incidents.filter(i => i !== inc);
    if (inc.kind === "retaliation") {
      noteMissed(c, inc.title.split(":")[0]);
      addExposure(c, inc.region, 12);
      addThreat(c, 3, `${inc.title.split(":")[0]} unanswered`);
      log(c, `Nobody answered ${inc.title.split(":")[0]}. People died in the streets (+12 exposure in ${REGIONS[inc.region].name}).`, "bad", "command");
    } else if (inc.kind === "coverup") {
      noteMissed(c, inc.title.split(":")[0]);
      addExposure(c, inc.region, 12);
      log(c, `${inc.title.split(":")[0]} went unanswered. The story is out in ${REGIONS[inc.region].name} (+12 exposure there).`, "bad", "command");
    } else if (inc.hostileLead) { (c.retaliations ??= []).push({ region: inc.region, day: c.day }); log(c, `Nobody struck the Insurgents gathering in ${REGIONS[inc.region].name}. They are attacking.`, "bad"); }
    else if (inc.ciOp && inc.plan) lockPlan(c, inc.plan, `the cell near ${(inc.title.split("cell, ")[1] ?? "").replace(/ \(.*\)$/, "")} was passed over`);
    else { addThreat(c, 4, `a cell near ${inc.title.split(", ").pop()} left alone`); log(c, `The Insurgency cell near ${inc.title.split(", ").pop()} has moved on.`, "key", "command"); }
  }
}



/** Why the squad can't reach an incident in time, if it can't. */
export function travelBlock(c: Campaign, inc: Incident) {
  if (inc.kind === "escort") return null;   // the squad is already there
  const t = flightOut(c, inc);
  return c.day + t > inc.expires ? `The ${transportName(c)} needs ${t} day${t > 1 ? "s" : ""} to get there${stormDelay(c, inc.region) ? " (a storm adds one)" : ""}${isContacted(c, inc.region) ? "" : " (no front there adds one)"}, and the window closes sooner.` : null;
}
