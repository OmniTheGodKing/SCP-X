// The world outside Site-19: regional exposure and Foundation fronts, travel, cover-ups,
// Insurgency cells and amnestics.
import { countOperational } from "./base";
import { log, yearOf, type Campaign, type Incident } from "./campaign";
import { has } from "./research";
import { HOME, REGIONS, REGION_IDS, type RegionId } from "../data/regions";

export interface RegionState { exposure: number; collapsed: boolean; lastCoverStory?: number; }

export const COLLAPSE_LIMIT = 3;           // fronts lost before the campaign ends
export const COVER_STORY = { cost: 50, amnestics: 2, cut: 10, cooldown: 30 };
export const LOCATE_INTEL = 3;
export const locateIntel = (c: Campaign) => has(c, "codebooks") ? 2 : LOCATE_INTEL;
export const coverDoses = (c: Campaign) => has(c, "classb_amnestics") ? 1 : COVER_STORY.amnestics;
export const AMNESTIC_DAYS = 5, AMNESTICS_PER_LAB = 10;

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const newRegions = (start: number): Record<RegionId, RegionState> =>
  Object.fromEntries(REGION_IDS.map(r => [r, { exposure: start, collapsed: false }])) as Record<RegionId, RegionState>;

/** Global exposure is the average of the regions; a lost front counts as 100. */
export function globalExposure(c: Campaign) {
  return Math.round(REGION_IDS.reduce((a, r) => a + (c.regions[r].collapsed ? 100 : c.regions[r].exposure), 0) / REGION_IDS.length);
}

export function addExposure(c: Campaign, r: RegionId, n: number) {
  const st = c.regions[r];
  if (st.collapsed) return;
  st.exposure = Math.max(0, Math.min(100, st.exposure + n));
  if (st.exposure >= 100) {
    st.collapsed = true;
    log(c, `The ${REGIONS[r].front} front in ${REGIONS[r].name} has collapsed. The public knows too much there, and its funding is gone.`, "bad", "world");
  }
  c.exposure = globalExposure(c);
}

export const collapsedCount = (c: Campaign) => REGION_IDS.filter(r => c.regions[r].collapsed).length;
export const regionFunding = (c: Campaign, r: RegionId) =>
  c.regions[r].collapsed ? 0 : Math.max(3, Math.round(200 / REGION_IDS.length - c.regions[r].exposure * 0.25));

export const transportName = (c: Campaign) => has(c, "c130") ? "C-130 Hercules" : has(c, "c119") ? "C-119 Flying Boxcar" : "C-47 Skytrain";
export function travelDays(c: Campaign, r: RegionId) {
  const base = REGIONS[r].travel;
  if (!base) return 0;
  return Math.max(1, Math.ceil(base * (has(c, "c130") ? 0.5 : has(c, "c119") ? 0.75 : 1)));
}

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

/** Witnesses somewhere need dosing before they talk. */
export function spawnCoverup(c: Campaign, at?: RegionId) {
  const r = at ?? pick(REGION_IDS.filter(x => !c.regions[x].collapsed));
  if (!r) return;
  const town = pick(REGIONS[r].towns);
  const inc = newIncident(c, {
    kind: "coverup", region: r, map: Math.random() < 0.5 ? "town" : "farm", scpId: "",
    what: `Cover-up: ${pick(STORIES)}, ${town}`,
    expires: c.day + travelDays(c, r) + 4, insurgents: Math.random() < 0.5 ? 0 : rand(1, 2), witnesses: rand(3, 5), civilians: rand(1, 3),
  });
  log(c, `${inc.title}. Witnesses need amnestics before the story spreads. Respond within ${inc.expires - c.day} days.`, "bad", "command");
}

export function canLocate(c: Campaign, r: RegionId) {
  if (c.regions[r].collapsed) return "The front there has collapsed.";
  if (c.intel < locateIntel(c)) return `Needs ${locateIntel(c)} Intel.`;
  if (c.incidents.some(i => i.kind === "strike" && i.region === r)) return "A cell there is already located.";
  return null;
}
/** Spend Intel to find an Insurgency cell in a region, creating a strike mission. */
export function locateCell(c: Campaign, r: RegionId) {
  if (canLocate(c, r)) return;
  c.intel -= locateIntel(c);
  const town = pick(REGIONS[r].towns);
  const inc = newIncident(c, {
    kind: "strike", region: r, map: "port", scpId: "", what: `Insurgency cell, ${town}`,
    expires: c.day + travelDays(c, r) + 7, insurgents: Math.min(7, 4 + Math.floor((yearOf(c.day) - 1951) / 3)), witnesses: 0, civilians: 0,
  });
  log(c, `Intel points to an Insurgency cell operating out of a warehouse near ${town}. Strike within ${inc.expires - c.day} days, before they move.`, "key");
}

export function canCoverStory(c: Campaign, r: RegionId) {
  const st = c.regions[r];
  if (st.collapsed) return "The front there has collapsed.";
  if (st.lastCoverStory !== undefined && c.day - st.lastCoverStory < COVER_STORY.cooldown) return `A cover story was run there recently; wait ${COVER_STORY.cooldown - (c.day - st.lastCoverStory)} days.`;
  if (c.funds < COVER_STORY.cost) return `Needs $${COVER_STORY.cost}k.`;
  if (c.amnestics < coverDoses(c)) return `Needs ${coverDoses(c)} amnestics.`;
  return null;
}
/** Plant a cover story: money and amnestics to bring a region's exposure down. */
export function coverStory(c: Campaign, r: RegionId) {
  if (canCoverStory(c, r)) return;
  c.funds -= COVER_STORY.cost; c.amnestics -= coverDoses(c);
  c.regions[r].lastCoverStory = c.day;
  addExposure(c, r, -COVER_STORY.cut);
  log(c, `${REGIONS[r].front} plants a cover story in ${REGIONS[r].name} (−${COVER_STORY.cut} exposure there).`, "good");
}

export const amnesticsCapacity = (c: Campaign) => Math.max(4, countOperational(c, "amnestics") * (AMNESTICS_PER_LAB + (has(c, "bt_cold_storage") ? 5 : 0)));

/** One day in the world: amnestics production, cover-ups appearing and expiring. */
export function tickWorld(c: Campaign) {
  const labs = countOperational(c, "amnestics");
  if (labs && c.day % AMNESTIC_DAYS === 0 && c.amnestics < amnesticsCapacity(c)) c.amnestics = Math.min(amnesticsCapacity(c), c.amnestics + labs * (has(c, "classb_amnestics") ? 2 : 1));
  if (c.day >= c.nextCoverupDay) { spawnCoverup(c); c.nextCoverupDay = c.day + rand(25, 60); }
  for (const inc of [...c.incidents]) {
    if (inc.id === c.activeIncident || (inc.kind !== "coverup" && inc.kind !== "strike") || c.day <= inc.expires) continue;
    c.incidents = c.incidents.filter(i => i !== inc);
    if (inc.kind === "coverup") {
      c.stats.missed++;
      addExposure(c, inc.region, 12);
      log(c, `${inc.title.split(":")[0]} went unanswered. The story is out in ${REGIONS[inc.region].name} (+12 exposure there).`, "bad", "command");
    } else log(c, `The Insurgency cell near ${inc.title.split(", ").pop()} has moved on.`, "key", "command");
  }
}



/** Why the squad can't reach an incident in time, if it can't. */
export function travelBlock(c: Campaign, inc: Incident) {
  const t = travelDays(c, inc.region);
  return c.day + t > inc.expires ? `The ${transportName(c)} needs ${t} day${t > 1 ? "s" : ""} to get there, and the window closes sooner.` : null;
}
