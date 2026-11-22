// Phase 5: the player's Foundation site and the organizations it fields.
// Site → MTF → Squad → Operative. Each has a persistent id separate from the name shown, so a site or a squad can be
// renamed without breaking anything. The site's position on the globe drives travel, logistics, supply costs and
// secrecy; the squads drive who can deploy, what specialist kit they may carry and how they fare without the player.
import { rnd } from "../core/rng";
import type { Campaign, Operative } from "./campaign";
import { LAND, REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import { MTF_CONFIG, SPECIALTIES, SPECIALIST_ITEMS, SPECS, type SpecId, type SpecialtyId } from "../data/mtf";
import { EQUIP, SQUAD_BALANCE } from "../data/specialties";
import { ITEMS } from "./research";
import type { ItemId } from "../game/types";

export interface Site { id: string; designation: string; name: string; lon: number; lat: number; region: RegionId; founded: number; }
export interface Squad {
  id: string; name: string; specialty: SpecialtyId;
  /** Retraining into a new specialty until this day; drilling (a training module) until this day. */
  retrainUntil?: number;
  drillUntil?: number;
  /** The stage a drill in progress will reach. */
  drillTo?: number;
  /** Version 12 squad progression, separate from soldiers' experience: operations in which the squad used its
   *  specialty, the stage reached through training modules, the Veteran branch, and mastery archived from earlier
   *  specialties (kept, not erased). */
  mastery?: number;
  drilled?: number;
  branch?: "speed" | "reliability";
  archived?: Partial<Record<SpecialtyId, number>>;
}
export interface Mtf { id: string; designation: string; name: string; spec: SpecId; founded: number; squads: Squad[]; }
/** Where a new campaign is: the opening mission, founding the site, founding the first MTF, or running (unset). */
export type Phase = "opening" | "site" | "mtf";

// ---------------------------------------------------------------- the site and the globe

/** Site-19's position, used for saves from before players founded their own site. */
export const LEGACY_SITE: Site = { id: "site-19", designation: "Site-19", name: "Site-19", lon: -78, lat: 40, region: "east_us", founded: 1 };
let active: Site = LEGACY_SITE;
export const siteOf19 = (c: Campaign): Site => (active = c.site ?? LEGACY_SITE);
/** The site of the campaign being played, for map code that has no campaign at hand. */
export const activeSite = () => active;
let activeMtf: Mtf | undefined;
/** The player's main force, for text written where no campaign is at hand: their first MTF, or Epsilon-11 before
 *  one exists (the opening mission, and saves from before Phase 5). */
export const activeForce = () => activeMtf?.designation ?? "Epsilon-11";
export const activeForceTitle = () => activeMtf ? `${activeMtf.designation} "${activeMtf.name}"` : 'Epsilon-11 "Nine-Tailed Fox"';
/** Text written for Site-19 and Epsilon-11 (most of the game's text, and old log entries in saves) shown with the
 *  player's own site and first MTF. Campaigns from before Phase 5 are untouched. The opening's Epsilon-11 detachment
 *  is written with a non-breaking hyphen ("Epsilon\u201111"), so it keeps its real name. */
export function localizeText(t: string) {
  if (activeMtf) t = t.replace(/Epsilon-11 ["“]Nine-Tailed Fox["”]/g, `${activeMtf.designation} "${activeMtf.name}"`).replace(/Epsilon-11(?!\d)/g, activeMtf.designation);
  if (active !== LEGACY_SITE) t = t.replace(/Site-19(?![\w-])/g, active.designation).replace(/site-19(?![\w-])/g, active.designation.toLowerCase());
  return t;
}
/** Point the text helpers at a campaign: call on load, on a new campaign and when its site or MTF is founded. */
export function bindCampaign(c: Campaign) { active = c.site ?? LEGACY_SITE; activeMtf = c.mtfs?.[0]; }
/** The region the site sits in: its incidents at home, its raids and its local exposure land there. */
export const homeRegion = (c: Campaign): RegionId => siteOf19(c).region;
export const siteName = (c: Campaign) => siteOf19(c).designation;

function inRing(lon: number, lat: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** True on land, by the Natural Earth coastlines the World Map draws (lakes and Antarctica are left out). */
export function onLand(lon: number, lat: number) {
  if (lat < -56 || lat > 75) return false;   // no sites in the Antarctic or the high Arctic
  return LAND.some(r => inRing(lon, lat, r) || inRing(lon + 360, lat, r) || inRing(lon - 360, lat, r));
}
/** A random point on land, from a seeded or ordinary random source. */
export function randomLand(rand: () => number = rnd): [number, number] {
  for (let i = 0; i < 2000; i++) {
    const lon = Math.round((-170 + rand() * 345) * 10) / 10, lat = Math.round((-50 + rand() * 120) * 10) / 10;
    if (onLand(lon, lat)) return [lon, lat];
  }
  return [-78, 40];
}

/** Great-circle distance in km. */
export function km(aLon: number, aLat: number, bLon: number, bLat: number) {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Airfields and ports the Foundation can route through, with the year each is open to it. */
export const HUBS: { name: string; lon: number; lat: number; from: number }[] = [
  { name: "Washington", lon: -77, lat: 38.9, from: 1951 }, { name: "Norfolk", lon: -76.3, lat: 36.9, from: 1951 }, { name: "San Diego", lon: -117.2, lat: 32.7, from: 1951 },
  { name: "Anchorage", lon: -149.9, lat: 61.2, from: 1951 }, { name: "Panama", lon: -79.5, lat: 9, from: 1951 }, { name: "Rio de Janeiro", lon: -43.2, lat: -22.9, from: 1951 },
  { name: "London", lon: -0.1, lat: 51.5, from: 1951 }, { name: "Frankfurt", lon: 8.7, lat: 50.1, from: 1951 }, { name: "Cairo", lon: 31.2, lat: 30, from: 1951 },
  { name: "Lagos", lon: 3.4, lat: 6.5, from: 1951 }, { name: "Nairobi", lon: 36.8, lat: -1.3, from: 1951 }, { name: "Karachi", lon: 67, lat: 24.9, from: 1951 },
  { name: "Tokyo", lon: 139.7, lat: 35.7, from: 1951 }, { name: "Manila", lon: 121, lat: 14.6, from: 1951 }, { name: "Sydney", lon: 151.2, lat: -33.9, from: 1951 },
  { name: "Johannesburg", lon: 28, lat: -26.2, from: 1951 }, { name: "Reykjavik", lon: -21.9, lat: 64.1, from: 1951 }, { name: "Singapore", lon: 103.8, lat: 1.35, from: 1951 },
];

/** The region a point falls in (by the territories the World Map draws), or the nearest region centre. */
export function regionAt(lon: number, lat: number): RegionId {
  const T: Record<RegionId, [number, number, number, number][]> = {
    west_us: [[-170, 15, -100, 75]], east_us: [[-100, 15, -50, 75]], latam: [[-120, -60, -30, 15]],
    europe: [[-30, 35, 45, 72]], africa: [[-20, -40, 60, 35]], east_asia: [[60, -50, 180, 75]],
  };
  const hit = REGION_IDS.find(r => T[r].some(([w, s, e, n]) => lon >= w && lon <= e && lat >= s && lat <= n));
  return hit ?? REGION_IDS.slice().sort((a, b) => km(lon, lat, REGIONS[a].lon, REGIONS[a].lat) - km(lon, lat, REGIONS[b].lon, REGIONS[b].lat))[0];
}

export interface SiteGeo {
  region: RegionId;
  hub: string; hubKm: number;
  /** 0 beside a hub, 1 far from any. */
  remoteness: number;
  /** Days by C-47 to each region, before faster transports and weather. */
  travel: Record<RegionId, number>;
  /** Multiplier on facility and staff upkeep (supplies have further to come). */
  supply: number;
  /** Multiplier on exposure from trouble at the site itself (fewer eyes nearby). */
  secrecy: number;
}
/** What a position means for a site: route times, how remote it is, what supplies cost, how many people notice. */
export function siteGeo(lon: number, lat: number, year = 1951): SiteGeo {
  const region = regionAt(lon, lat);
  const hubs = HUBS.filter(h => h.from <= year).map(h => ({ ...h, d: km(lon, lat, h.lon, h.lat) })).sort((a, b) => a.d - b.d);
  const hub = hubs[0], remoteness = Math.max(0, Math.min(1, (hub.d - 300) / 2200));
  const travel = Object.fromEntries(REGION_IDS.map(r => {
    const d = km(lon, lat, REGIONS[r].lon, REGIONS[r].lat);
    // inside the home region a truck or a short flight does it the same day; further out, a C-47 covers about
    // 2,800 km a day with refuelling stops, and getting out of a remote site to the airfield costs a day
    return [r, r === region && d < 2200 ? 0 : Math.max(1, Math.ceil(d / 2800) + (remoteness > 0.6 ? 1 : 0))];
  })) as Record<RegionId, number>;
  return { region, hub: hub.name, hubKm: Math.round(hub.d), remoteness, travel, supply: Math.round((0.9 + remoteness * 0.35) * 100) / 100, secrecy: Math.round((1.25 - remoteness * 0.55) * 100) / 100 };
}
export const geoOf = (c: Campaign) => { const s = siteOf19(c); return c.site ? siteGeo(s.lon, s.lat) : null; };

/** Days to a region from the player's site (legacy saves keep Site-19's fixed table). */
export function baseTravel(c: Campaign, r: RegionId) {
  const g = geoOf(c);
  return g ? g.travel[r] : REGIONS[r].travel;
}

export function foundSite(c: Campaign, s: { designation: string; name: string; lon: number; lat: number }) {
  if (!onLand(s.lon, s.lat)) return "That's water. A site has to be on land.";
  c.site = { id: `site-${Date.now().toString(36)}`, designation: s.designation.trim() || "Site-64", name: s.name.trim() || s.designation.trim() || "Site-64", lon: s.lon, lat: s.lat, region: regionAt(s.lon, s.lat), founded: c.day };
  // the site's own region has a front from the start: that's where its cover is arranged
  delete c.regions[c.site.region].contact;
  active = c.site;
  return null;
}

// ---------------------------------------------------------------- MTFs and squads

export const mtfsOf = (c: Campaign) => c.mtfs ?? [];
export const primaryMtf = (c: Campaign) => mtfsOf(c)[0];
/** The display name of the player's main force: their first MTF, or Epsilon-11 in saves from before Phase 5. */
export const forceName = (c: Campaign) => primaryMtf(c)?.designation ?? "Epsilon-11";
export const allSquads = (c: Campaign) => mtfsOf(c).flatMap(m => m.squads.map(s => ({ mtf: m, squad: s })));
export const squadById = (c: Campaign, id?: string) => allSquads(c).find(x => x.squad.id === id);
export const squadOfOp = (c: Campaign, o: Operative) => squadById(c, o.squad);
export const squadMembers = (c: Campaign, squadId: string) => c.roster.filter(o => o.alive && o.squad === squadId);
export const squadRosterMax = (c: Campaign) => deployCap(c) + MTF_CONFIG.rosterOver;

/** How many operatives a squad sends: 4, then 6 and 8 with the Foundation-wide doctrine projects. Every MTF has the
 *  same, because the doctrine is the Foundation's, not one MTF's. */
export const deployCap = (c: Campaign) => MTF_CONFIG.deployBase + (c.research.done.includes("doctrine_6") ? 2 : 0) + (c.research.done.includes("doctrine_8") ? 2 : 0);

/** A squad is somewhere else while any of its people are flying out, on a hands-off deployment or on a contract. */
export function squadAway(c: Campaign, squadId: string) {
  const ms = squadMembers(c, squadId);
  if (c.outbound && c.outbound.setup.squad.some(m => ms.some(o => o.id === m.opId))) return "On its way to an incident.";
  const inc = c.incidents.find(i => i.dispatch?.ops?.some(id => ms.some(o => o.id === id)));
  if (inc) return `Deployed to ${inc.title.split(": ")[1] ?? inc.title}.`;
  return null;
}

/** Why an operative can't take an item: the first of year, authorization, squad certification, personal
 *  qualification, retraining and stock that fails (design 26.0: qualification != authorization != stock). Ordinary kit
 *  is open to anyone. Saves without MTFs keep the old rules. */
export interface EquipCheck { ok: boolean; reason?: string; kind?: "year" | "authorization" | "certification" | "qualification" | "training" | "stock"; }
export function equipStatus(c: Campaign, o: Operative | undefined, item: ItemId, needStock = false): EquipCheck {
  const meta = EQUIP[item];
  if (meta && meta.year > yearNow(c)) return { ok: false, kind: "year", reason: `Not issued until ${meta.year}.` };
  if (!c.mtfs || !SPECIALIST_ITEMS.includes(item)) return needStock && !(c.inventory[item] ?? 0) ? { ok: false, kind: "stock", reason: "None in stores." } : { ok: true };
  const at = o ? squadOfOp(c, o) : undefined;
  if (!at) return { ok: false, kind: "certification", reason: "Specialist kit goes with a squad trained for it; this operative is in the reserve." };
  if (meta?.specs && !meta.specs.includes(at.mtf.spec)) return { ok: false, kind: "authorization", reason: `${SPECS[at.mtf.spec].name} MTFs aren't authorized for it.` };
  const sq = at.squad;
  if (!SPECIALTIES[sq.specialty].kit.includes(item)) return { ok: false, kind: "certification", reason: `${sq.name} (${SPECIALTIES[sq.specialty].name}) isn't certified for it.` };
  if (sq.retrainUntil && sq.retrainUntil > c.day) return { ok: false, kind: "training", reason: `${sq.name} is still retraining (${sq.retrainUntil - c.day} days).` };
  if (o && !(o.quals ?? []).includes(sq.specialty)) return { ok: false, kind: "qualification", reason: `${o.name} isn't certified in ${SPECIALTIES[sq.specialty].name} yet: a squad drill at the range certifies them.` };
  if (needStock && !(c.inventory[item] ?? 0)) return { ok: false, kind: "stock", reason: "None in stores: the workshop builds it." };
  return { ok: true };
}
/** The reason an operative can't carry an item, or null (kept for the planning screen and deployment). */
export const qualifiedFor = (c: Campaign, o: Operative | undefined, item: ItemId): string | null => { const r = equipStatus(c, o, item); return r.ok ? null : r.reason!; };
/** Specialist kit any squad is certified for, so the workshop can build it. */
export const eligibleKit = (c: Campaign): ItemId[] => [...new Set(allSquads(c).flatMap(x => SPECIALTIES[x.squad.specialty].kit.filter(i => (EQUIP[i]?.year ?? 0) <= yearNow(c))))];
const yearNow = (c: Campaign) => new Date(Date.UTC(1951, 5, 1) + (c.day - 1) * 86400000).getUTCFullYear();

// ---------------------------------------------------------------- squad progression (design 26.5)

/** Stage reached: from operations in which the squad used its specialty, or a training module, whichever is higher. */
export function squadStage(sq: Squad): number {
  const ops = sq.mastery ?? 0, B = SQUAD_BALANCE.stageOps;
  const byOps = ops >= B[3] ? 3 : ops >= B[2] ? 2 : ops >= B[1] ? 1 : 0;
  return Math.max(byOps, Math.min(SQUAD_BALANCE.drillMaxStage, sq.drilled ?? 0));
}
const trainingRange = (c: Campaign) => c.base.facilities.some(f => f.type === "training" && f.daysLeft === 0 && !f.disabled);
/** A training module at the range: certifies everyone in the squad in its specialty and, up to Proficient, raises
 *  its stage. The squad is unavailable while it drills. */
export function canDrill(c: Campaign, sq: Squad): string | null {
  if (!trainingRange(c)) return "Needs a working training range.";
  if ((sq.drillUntil ?? 0) > c.day || (sq.retrainUntil ?? 0) > c.day) return "Already in training.";
  if (squadAway(c, sq.id)) return "The squad is deployed.";
  const next = Math.min(SQUAD_BALANCE.drillMaxStage, squadStage(sq) + 1), cost = SQUAD_BALANCE.drillCost[next] ?? 0;
  if (squadStage(sq) >= SQUAD_BALANCE.drillMaxStage && squadMembers(c, sq.id).every(o => (o.quals ?? []).includes(sq.specialty))) return "Further stages come from field operations.";
  if (c.funds < Math.max(10, cost)) return `Needs $${Math.max(10, cost)}k.`;
  return null;
}
export function drillSquad(c: Campaign, sq: Squad) {
  const why = canDrill(c, sq); if (why) return why;
  const stage = squadStage(sq), next = Math.min(SQUAD_BALANCE.drillMaxStage, stage + 1), cost = Math.max(10, SQUAD_BALANCE.drillCost[next] ?? 0);
  c.funds -= cost;
  sq.drillUntil = c.day + Math.max(2, SQUAD_BALANCE.drillDays[next] ?? 3);
  sq.drillTo = next;   // the stage lands when the drill finishes (tickOrg)
  for (const o of squadMembers(c, sq.id)) o.busy ??= { kind: "retrain", daysLeft: sq.drillUntil - c.day };
  return null;
}
/** Called each day: training that has finished certifies the squad's people. */
export function tickOrg(c: Campaign) {
  for (const { squad } of allSquads(c)) {
    for (const k of ["retrainUntil", "drillUntil"] as const) {
      const until = squad[k];
      if (until && until <= c.day) {
        for (const o of squadMembers(c, squad.id)) o.quals = [...new Set([...(o.quals ?? []), squad.specialty])];
        if (k === "drillUntil" && squad.drillTo) { squad.drilled = Math.max(squad.drilled ?? 0, squad.drillTo); squad.drillTo = undefined; }
        squad[k] = undefined;
      }
    }
  }
}
/** A squad's completed mission: if its people actually used specialty techniques, the squad gains mastery. */
export function recordMastery(c: Campaign, squadIds: string[]) {
  for (const id of squadIds) { const sq = squadById(c, id)?.squad; if (sq) sq.mastery = (sq.mastery ?? 0) + 1; }
}
export function chooseBranch(sq: Squad, b: "speed" | "reliability") { if (squadStage(sq) >= 3 && !sq.branch) sq.branch = b; }

export function specialtiesFor(spec: SpecId) { return SPECS[spec].specialties; }

let nextId = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}${(nextId++).toString(36)}`;

export interface MtfDraft { designation: string; name: string; spec: SpecId; squads: { name: string; specialty: SpecialtyId; members: string[] }[]; /** Buy each squad's starter kit from funds (default yes). */ requisition?: boolean; }
/** What the starter requisition for a draft would cost. */
export const requisitionCost = (d: { squads: { specialty: SpecialtyId }[] }) => d.squads.reduce((a, s) => a + Object.entries(SPECIALTIES[s.specialty].issue).reduce((b, [i, n]) => b + (ITEMS[i as ItemId]?.cost ?? 0) * (n ?? 0), 0), 0);
export function canFoundMtf(c: Campaign, d: MtfDraft, first = false): string | null {
  if (!d.designation.trim() || !d.name.trim()) return "Give the MTF a designation and a name.";
  if (mtfsOf(c).some(m => m.designation.toLowerCase() === d.designation.trim().toLowerCase())) return "Another MTF already uses that designation.";
  if (first && d.spec !== "general") return "Your first MTF has to be General Containment.";
  if (!first) {
    if (mtfsOf(c).length >= MTF_CONFIG.maxMtfs) return `The Foundation authorizes at most ${MTF_CONFIG.maxMtfs} MTFs at one site.`;
    if (c.council.standing < MTF_CONFIG.mtfStanding) return `Needs Council standing ${MTF_CONFIG.mtfStanding} to authorize another MTF.`;
    if (c.funds < MTF_CONFIG.mtfCost) return `Needs $${MTF_CONFIG.mtfCost}k.`;
    const why = specUnlock(c, d.spec); if (why) return why;
  }
  if (d.squads.length !== MTF_CONFIG.startSquads) return `An MTF starts with ${MTF_CONFIG.startSquads} squads.`;
  for (const s of d.squads) {
    if (!s.name.trim()) return "Name every squad.";
    if (!SPECS[d.spec].specialties.includes(s.specialty)) return `${SPECIALTIES[s.specialty].name} isn't a ${SPECS[d.spec].name} specialty.`;
    if (s.members.length < deployCap(c)) return `Each squad needs at least ${deployCap(c)} people to deploy a full team.`;
    if (s.members.length > squadRosterMax(c)) return `A squad's roster is at most ${squadRosterMax(c)}.`;
  }
  return null;
}
/** Found an MTF from a draft: the squads are raised, their people assigned, and each squad's specialist kit issued. */
export function foundMtf(c: Campaign, d: MtfDraft, first = false) {
  const why = canFoundMtf(c, d, first);
  if (why) return why;
  if (!first) c.funds -= MTF_CONFIG.mtfCost;
  const m: Mtf = { id: newId("mtf"), designation: d.designation.trim(), name: d.name.trim(), spec: d.spec, founded: c.day, squads: [] };
  for (const s of d.squads) {
    const sq: Squad = { id: newId("sq"), name: s.name.trim(), specialty: s.specialty };
    m.squads.push(sq);
    for (const id of s.members) { const o = c.roster.find(x => x.id === id); if (o) { o.squad = sq.id; o.quals = [...new Set([...(o.quals ?? []), s.specialty])]; } }
    // the starter requisition is bought, never conjured by choosing a specialty (design T04)
    if (d.requisition !== false) for (const [item, n] of Object.entries(SPECIALTIES[s.specialty].issue)) {
      const each = ITEMS[item as ItemId]?.cost ?? 0;
      for (let k = 0; k < (n ?? 0) && c.funds >= each; k++) { c.funds -= each; c.inventory[item as ItemId] = (c.inventory[item as ItemId] ?? 0) + 1; }
    }
  }
  (c.mtfs ??= []).push(m);
  return null;
}
export function specUnlock(c: Campaign, spec: SpecId): string | null {
  switch (spec) {
    case "general": return null;
    case "bio": return c.day >= (c.outbreakDay ?? 99999) || c.research.done.some(id => id.includes("610")) ? null : "Unlocks once SCP-610 has been encountered.";
    case "heavy": return c.stats.won >= 8 ? null : "Unlocks after 8 successful operations.";
    case "recon": return c.stats.won >= 4 && c.intel >= 3 ? null : "Unlocks after 4 successful operations, with 3 Intel on hand.";
  }
}
export function canAddSquad(c: Campaign, m: Mtf) {
  if (m.squads.length >= MTF_CONFIG.maxSquads) return `An MTF has at most ${MTF_CONFIG.maxSquads} squads.`;
  if (c.funds < MTF_CONFIG.squadCost) return `Needs $${MTF_CONFIG.squadCost}k.`;
  if (!c.base.facilities.some(f => f.type === "training" && f.daysLeft === 0 && !f.disabled)) return "Needs a working training range to raise a new squad.";
  return null;
}
export function addSquad(c: Campaign, m: Mtf, name: string, specialty: SpecialtyId) {
  const why = canAddSquad(c, m) ?? (SPECS[m.spec].specialties.includes(specialty) ? null : "Not a specialty this MTF can field.");
  if (why) return why;
  c.funds -= MTF_CONFIG.squadCost;
  m.squads.push({ id: newId("sq"), name: name.trim() || `Squad ${m.squads.length + 1}`, specialty, retrainUntil: c.day + MTF_CONFIG.retrainDays });
  return null;
}
/** Retrain a squad into another of its MTF's specialties: its specialist kit is unusable until the training is done. */
export function retrainSquad(c: Campaign, sq: Squad, specialty: SpecialtyId) {
  const m = mtfsOf(c).find(x => x.squads.includes(sq));
  if (!m || !SPECS[m.spec].specialties.includes(specialty) || sq.specialty === specialty) return "Not a change this squad can make.";
  if (!trainingRange(c)) return "Retraining needs a working training range.";
  const ms = squadMembers(c, sq.id), qualified = ms.filter(o => (o.quals ?? []).includes(specialty)).length;
  let days = qualified * 2 >= ms.length && ms.length ? SQUAD_BALANCE.retrainDaysQualified : SQUAD_BALANCE.retrainDays;
  if (m.spec === "general") days = Math.max(1, Math.round(days * 0.85));   // General Containment doctrine
  sq.archived = { ...(sq.archived ?? {}), [sq.specialty]: Math.max(sq.archived?.[sq.specialty] ?? 0, sq.mastery ?? 0) };
  sq.mastery = Math.floor((sq.archived?.[specialty] ?? 0) / 2);   // returning to an old specialty keeps half its mastery
  sq.drilled = 0; sq.branch = undefined;
  sq.specialty = specialty; sq.retrainUntil = c.day + days;
  return null;
}
export function assignToSquad(c: Campaign, o: Operative, squadId: string | undefined) {
  if (o.busy?.out) return "They're deployed.";
  if (squadId && squadMembers(c, squadId).length >= squadRosterMax(c)) return "That squad's roster is full.";
  o.squad = squadId;
  return null;
}

/** Saves from before Phase 5: Site-19 and Epsilon-11 stay as they were, and nothing new is asked of the player. */
export function migrateOrg(c: Campaign) {
  if (c.mtfs || c.phase) return;
  // nothing to do: no site (Site-19 is assumed), no MTFs (the old Epsilon-11 rules apply)
}
