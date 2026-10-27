// The O5 Council: Site-19's standing with it, its monthly orders, what it can be asked for, and the transfers of
// anomalies it arranges between sites. Standing is separate from exposure: exposure is what the public knows,
// standing is what the Council thinks of Site-19's command.
import { REGIONS, REGION_IDS, HOME, type RegionId } from "../data/regions";
import { UNITS, rollCandidate } from "../data/units";
import { dateText, gainIntel, log, monthName, operativeFrom, yearOf, type Campaign, type Incident } from "./campaign";
import { engineerCapacity, dclassCapacity } from "./base";
import { PROJECTS, has, projectVisible, researcherCapacity, type ItemId } from "./research";
import { SCP_DEFS, freeWings, scpName, type ScpClass } from "./containment";
import { familyOf } from "../data/names";
import { addExposure, spawnCoverup, locateCellFor, newRetaliation, travelDays } from "./world";
import type { ScpId } from "../game/types";

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 || w.endsWith("Class") ? "" : "s"}`;

// ---------- standing ----------

export interface CouncilState {
  standing: number;
  /** Why standing moved, newest first. */
  history: { day: number; n: number; why: string }[];
  directives: Directive[];
  nextId: number;
  /** Counters the orders measure progress against. */
  tally: { wins: Partial<Record<RegionId, number>>; prisoners: number; missed: number; overdue: number; contacts: number };
  /** The day each request was last granted. */
  requests: Partial<Record<RequestId, number>>;
  /** Extra monthly grant won by request. */
  grantBonus: number;
  /** An audit is coming: the next inspection is a harsher one. */
  audit?: boolean;
  offers: TransferOffer[];
  /** Anomalies on the road to or from Site-19. */
  transit: Transit[];
  nextOffer: number;
  nextCrisis: number;
}
export const newCouncil = (day: number): CouncilState => ({
  standing: 50, history: [], directives: [], nextId: 1, tally: { wins: {}, prisoners: 0, missed: 0, overdue: 0, contacts: 0 },
  requests: {}, grantBonus: 0, offers: [], transit: [], nextOffer: day + rand(50, 80), nextCrisis: day + rand(45, 70),
});

export const TIERS = [
  { min: 0, name: "Under review", desc: "The Council is considering Site-19's command. An audit follows." },
  { min: 25, name: "Adequate", desc: "The Council expects more." },
  { min: 60, name: "Trusted", desc: "The Council takes Site-19's requests seriously." },
  { min: 80, name: "Favoured", desc: "Site-19 is one of the Council's best-run sites." },
];
export const tierOf = (n: number) => [...TIERS].reverse().find(t => n >= t.min)!;
export const AUDIT_BELOW = 25;

export function addStanding(c: Campaign, n: number, why: string) {
  if (!n) return;
  const k = c.council;
  const before = k.standing;
  k.standing = Math.max(0, Math.min(100, k.standing + n));
  k.history.unshift({ day: c.day, n: k.standing - before, why });
  if (k.history.length > 30) k.history.pop();
  if (tierOf(before).name !== tierOf(k.standing).name)
    log(c, `O5 Council standing is now ${tierOf(k.standing).name.toLowerCase()} (${k.standing}). ${tierOf(k.standing).desc}`, n > 0 ? "good" : "bad", "command");
}

/** The Council's own monthly grant to Site-19, on top of what the fronts pass on. */
export const councilGrant = (c: Campaign) => 60 + c.council.standing + c.council.grantBonus;

/** An incident went unanswered: it counts against Site-19 everywhere. */
export function noteMissed(c: Campaign, what: string) {
  c.stats.missed++;
  c.council.tally.missed++;
  addStanding(c, -3, `${what} went unanswered`);
}

// ---------- monthly orders ----------

export type DirectiveKind = "win_region" | "exposure" | "prisoners" | "research" | "contact" | "no_missed" | "clean";
export type RewardKind = "funds" | "engineer" | "researcher" | "dclass" | "intel" | "amnestics" | "recruit" | "gear";
export interface Reward { kind: RewardKind; n: number; item?: ItemId }
export interface Directive {
  id: string; kind: DirectiveKind; issued: number; due: number; reward: Reward; standing: number;
  region?: RegionId; n?: number; project?: string; base?: number;
  state?: "done" | "failed";
}

export function rewardText(r: Reward) {
  switch (r.kind) {
    case "funds": return `$${r.n}k`;
    case "engineer": return plural(r.n, "engineer");
    case "researcher": return plural(r.n, "researcher");
    case "dclass": return plural(r.n, "D-Class");
    case "intel": return `${r.n} Intel`;
    case "amnestics": return plural(r.n, "amnestic dose");
    case "recruit": return "a veteran operative";
    case "gear": return `${r.n} × ${r.item ?? "equipment"}`;
  }
}
/** A reward that the site can actually take (no engineers if there's nowhere to house them). */
export function rollReward(c: Campaign): Reward {
  const pool: Reward[] = [{ kind: "funds", n: 60 }, { kind: "intel", n: 2 }, { kind: "amnestics", n: 3 }, { kind: "recruit", n: 1 }];
  if (c.engineers < engineerCapacity(c)) pool.push({ kind: "engineer", n: 1 });
  if (c.researchers < researcherCapacity(c)) pool.push({ kind: "researcher", n: 1 });
  if (c.dclass + 4 <= dclassCapacity(c)) pool.push({ kind: "dclass", n: 4 });
  pool.push({ kind: "gear", n: 2, item: pick(["frag", "medkit", "flashbang", "smoke"] as ItemId[]) });
  return pick(pool);
}
export function grantReward(c: Campaign, r: Reward): string {
  switch (r.kind) {
    case "funds": c.funds += r.n; break;
    case "engineer": c.engineers = Math.min(engineerCapacity(c), c.engineers + r.n); break;
    case "researcher": c.researchers = Math.min(Math.max(researcherCapacity(c), c.researchers), c.researchers + r.n); break;
    case "dclass": c.dclass = Math.min(dclassCapacity(c), c.dclass + r.n); break;
    case "intel": gainIntel(c, r.n); break;
    case "amnestics": c.amnestics += r.n; break;
    case "recruit": return veteranJoins(c, "assigned by the Council");
    case "gear": if (r.item) c.inventory[r.item] = (c.inventory[r.item] ?? 0) + r.n; break;
  }
  return rewardText(r);
}
/** A Corporal from one of the special forces units, sent by the Council. */
function veteranJoins(c: Campaign, how: string) {
  const used = new Set([...c.roster.map(o => familyOf(o.name)), ...(c.retired ?? []).map(r => familyOf(r.name))]);
  const k = rollCandidate(`vet${c.day}-${c.council.nextId++}`, yearOf(c.day), used, has(c, "liaison_office"), true);
  const o = operativeFrom(c, { ...k, quality: Math.max(1, k.quality) });
  o.rank = Math.max(o.rank, 2); o.xp = Math.max(o.xp, 7);
  c.roster.push(o);
  return `${o.call} ${o.name} (${UNITS[k.unit].name}), ${how}`;
}

export const contacted = (c: Campaign, r: RegionId) => c.regions[r].contact !== false;
const contactedRegions = (c: Campaign) => REGION_IDS.filter(r => contacted(c, r) && !c.regions[r].collapsed);

function makeDirective(c: Campaign, kind: DirectiveKind, due: number): Directive | null {
  const d: Directive = { id: "o" + c.council.nextId++, kind, issued: c.day, due, reward: rollReward(c), standing: 5 };
  const t = c.council.tally;
  switch (kind) {
    case "win_region": { const r = pick(contactedRegions(c)); if (!r) return null; d.region = r; d.n = 1; d.base = t.wins[r] ?? 0; break; }
    case "exposure": d.n = Math.max(10, c.exposure - 3); break;
    case "prisoners": d.n = 1; d.base = t.prisoners; break;
    case "research": {
      const open = Object.keys(PROJECTS).filter(id => !PROJECTS[id].breakthrough && !has(c, id) && projectVisible(c, id));
      if (!open.length) return null;
      d.project = open.sort((a, b) => PROJECTS[a].days - PROJECTS[b].days)[0]; break;
    }
    case "contact": if (!REGION_IDS.some(r => !contacted(c, r) && !c.regions[r].collapsed)) return null; d.base = t.contacts; break;
    case "no_missed": d.base = t.missed; break;
    case "clean": if (!c.scps.some(s => s.status === "contained" && !SCP_DEFS[s.id as ScpId]?.inert)) return null; d.base = t.overdue; break;
  }
  return d;
}
export function directiveText(c: Campaign, d: Directive) {
  switch (d.kind) {
    case "win_region": return `Close an incident in ${REGIONS[d.region!].name}`;
    case "exposure": return `Bring global exposure to ${d.n} or lower`;
    case "prisoners": return "Take an Insurgent prisoner";
    case "research": return `Finish ${PROJECTS[d.project!].name}`;
    case "contact": return "Establish a new front";
    case "no_missed": return "Let no incident go unanswered";
    case "clean": return "Keep every cell cleaned on schedule";
  }
}
/** How the order stands now: met (it can be closed early), broken, or still open. */
function directiveNow(c: Campaign, d: Directive): "met" | "broken" | "open" {
  const t = c.council.tally;
  switch (d.kind) {
    case "win_region": return (t.wins[d.region!] ?? 0) - d.base! >= d.n! ? "met" : "open";
    case "prisoners": return t.prisoners - d.base! >= d.n! ? "met" : "open";
    case "research": return has(c, d.project!) ? "met" : "open";
    case "contact": return t.contacts > d.base! ? "met" : "open";
    case "no_missed": return t.missed > d.base! ? "broken" : "open";
    case "clean": return t.overdue > d.base! ? "broken" : "open";
    case "exposure": return "open";
  }
}
/** Orders that are only judged at the deadline (keeping something up) rather than when something happens. */
const atDeadline = (d: Directive) => d.kind === "exposure" || d.kind === "no_missed" || d.kind === "clean";
export function directiveProgress(c: Campaign, d: Directive) {
  if (d.kind === "exposure") return `now ${c.exposure}`;
  const n = directiveNow(c, d);
  return n === "broken" ? "broken" : n === "met" ? "met" : atDeadline(d) ? "holding" : "not yet";
}

function settle(c: Campaign, d: Directive, ok: boolean) {
  d.state = ok ? "done" : "failed";
  if (ok) {
    const got = grantReward(c, d.reward);
    addStanding(c, d.standing, `order met: ${directiveText(c, d).toLowerCase()}`);
    log(c, `O5 order met: ${directiveText(c, d)}. The Council sends ${got}.`, "good", "command");
  } else {
    addStanding(c, -6, `order failed: ${directiveText(c, d).toLowerCase()}`);
    log(c, `O5 order failed: ${directiveText(c, d)}. The Council has noted it.`, "bad", "command");
  }
}

/** The first of the month: new orders, due at the end of it. */
export function issueDirectives(c: Campaign, pause = true) {
  const k = c.council;
  k.directives = k.directives.filter(d => !d.state);
  const kinds: DirectiveKind[] = ["win_region", "exposure", "prisoners", "research", "contact", "no_missed", "clean"];
  const wanted = 2 - k.directives.length;
  const made: Directive[] = [];
  for (const kind of kinds.sort(() => Math.random() - 0.5)) {
    if (made.length >= wanted) break;
    if (k.directives.some(d => d.kind === kind)) continue;
    if (kind === "prisoners" && c.stats.won < 2) continue;
    const d = makeDirective(c, kind, c.day + 29);
    if (d) made.push(d);
  }
  k.directives.push(...made);
  if (made.length) log(c, `O5 orders for ${monthName(c.day)}: ${made.map(d => `${directiveText(c, d)} by ${dateText(d.due)} (reward: ${rewardText(d.reward)})`).join("; ")}.`, "key", pause ? "command" : undefined);
}

// ---------- requests ----------

export type RequestId = "funding" | "engineers" | "veteran" | "object" | "keter" | "grant";
export const REQUESTS: Record<RequestId, { name: string; min: number; cost: number; every: number; desc: string }> = {
  funding: { name: "Emergency appropriation", min: 35, cost: 10, every: 60, desc: "$100k at once." },
  engineers: { name: "Engineering detail", min: 50, cost: 8, every: 60, desc: "2 engineers join the site staff." },
  veteran: { name: "Veteran transfer", min: 60, cost: 10, every: 90, desc: "A Corporal from one of the special forces units joins Epsilon-11." },
  object: { name: "Request an object for study", min: 60, cost: 6, every: 120, desc: "Another site sends Site-19 a Safe-class object it doesn't hold. Needs a free containment wing." },
  keter: { name: "Keter transfer", min: 75, cost: 0, every: 365, desc: "Take a Keter-class anomaly held elsewhere: $150k and +5 standing when it arrives, and its research opens. It will breach like any Keter. Needs a free Keter-grade wing." },
  grant: { name: "Increase Site-19's grant", min: 80, cost: 15, every: 365, desc: "+$15k every month from now on." },
};
/** Safe objects not yet at Site-19 (or on the way). */
export const objectsAvailable = (c: Campaign) => (Object.keys(SCP_DEFS) as ScpId[]).filter(id => SCP_DEFS[id].inert && !c.scps.some(s => s.id === id) && !c.council.transit.some(t => t.scp === id) && !c.council.offers.some(o => o.get === id));
/** The Keter anomaly the Council could send: SCP-106, if Site-19 hasn't found it yet. */
const keterAvailable = (c: Campaign): ScpId | null => !c.scps.some(s => s.id === "106") && c.sightings["106"] !== undefined && !c.council.transit.some(t => t.scp === "106") ? "106" : null;

export function canRequest(c: Campaign, id: RequestId): string | null {
  const q = REQUESTS[id], k = c.council, last = k.requests[id];
  if (c.over) return "The campaign is over.";
  if (k.standing < q.min) return `Needs standing ${q.min}.`;
  if (last !== undefined && c.day - last < q.every) return `Granted recently; again from ${dateText(last + q.every)}.`;
  if (id === "engineers" && c.engineers + 2 > engineerCapacity(c)) return `Site-19 can house ${engineerCapacity(c)} engineers.`;
  if (id === "object") { if (!objectsAvailable(c).length) return "No site has an object to spare."; if (!freeWings(c, "Safe").length) return "Needs a free containment wing."; }
  if (id === "keter") { if (!keterAvailable(c)) return "No Keter-class anomaly is available for transfer."; if (!freeWings(c, "Keter").length) return "Needs a free Keter-grade wing."; }
  return null;
}
export function makeRequest(c: Campaign, id: RequestId) {
  if (canRequest(c, id)) return;
  const q = REQUESTS[id], k = c.council;
  k.requests[id] = c.day;
  if (q.cost) addStanding(c, -q.cost, `request granted: ${q.name.toLowerCase()}`);
  switch (id) {
    case "funding": c.funds += 100; log(c, "The O5 Council approves an emergency appropriation: $100k.", "good"); break;
    case "engineers": c.engineers += 2; log(c, "The O5 Council sends an engineering detail: 2 engineers join the site staff.", "good"); break;
    case "veteran": log(c, `Veteran transfer: ${veteranJoins(c, "joins Epsilon-11")}.`, "good"); break;
    case "object": { const scp = pick(objectsAvailable(c)); startTransit(c, scp, "in", pick(PARTNERS), 0, 0, "requested"); break; }
    case "keter": { const scp = keterAvailable(c)!; delete c.sightings[scp]; startTransit(c, scp, "in", "Area-12", 150, 5, "requested"); break; }
    case "grant": k.grantBonus += 15; log(c, "The O5 Council raises Site-19's grant by $15k a month.", "good"); break;
  }
}

// ---------- transfers ----------

export const PARTNERS = ["Site-17", "Site-23", "Area-12"];
export interface TransferOffer {
  id: string; from: string; until: number;
  /** "order": the Council orders Site-19 to take it; "sale": a site wants to buy one; "trade": a swap. */
  kind: "order" | "sale" | "trade";
  get?: ScpId; give?: ScpId; funds: number; standing: number; text: string;
}
export interface Transit { scp: ScpId; dir: "in" | "out"; site: string; arrive: number; funds: number; standing: number; }
const TRANSIT_DAYS = [3, 5];
export const PAY_FOR: Record<ScpClass, number> = { Safe: 40, Euclid: 100, Keter: 150 };
/** Anomalies Site-19 holds that could be moved away. */
export const transferable = (c: Campaign) => c.scps.filter(s => s.status === "contained");

function startTransit(c: Campaign, scp: ScpId, dir: "in" | "out", site: string, funds: number, standing: number, how: string) {
  const days = rand(TRANSIT_DAYS[0], TRANSIT_DAYS[1]);
  c.council.transit.push({ scp, dir, site, arrive: c.day + days, funds, standing });
  if (dir === "out") { const s = c.scps.find(x => x.id === scp); if (s) s.status = "leaving"; }
  log(c, dir === "in" ? `${scpName(scp)} (${how}) leaves ${site} for Site-19 by road: ${plural(days, "day")}.` : `${scpName(scp)} leaves Site-19 for ${site} by road: ${plural(days, "day")}.`, "key");
}

export function canAcceptOffer(c: Campaign, o: TransferOffer): string | null {
  if (o.get) { const d = SCP_DEFS[o.get]; if (!freeWings(c, d.cls).length) return `Needs a free ${d.cls === "Safe" ? "containment" : `${d.cls}-grade`} wing.`; }
  if (o.give && !c.scps.some(s => s.id === o.give && s.status === "contained")) return `${scpName(o.give)} isn't in its cell.`;
  if (o.funds < 0 && c.funds < -o.funds) return `Needs $${-o.funds}k.`;
  return null;
}
export function answerOffer(c: Campaign, id: string, yes: boolean) {
  const k = c.council, o = k.offers.find(x => x.id === id);
  if (!o || (yes && canAcceptOffer(c, o))) return;
  k.offers = k.offers.filter(x => x !== o);
  if (!yes) {
    if (o.kind === "order") addStanding(c, -6, `refused the transfer of ${scpName(o.get!)}`);
    log(c, o.kind === "order" ? `Site-19 refuses to take ${scpName(o.get!)}. The Council won't forget it.` : `Site-19 declines ${o.from}'s offer.`, o.kind === "order" ? "bad" : "");
    return;
  }
  if (o.funds < 0) c.funds += o.funds;
  if (o.give) startTransit(c, o.give, "out", o.from, o.kind === "sale" ? o.funds : 0, o.kind === "sale" ? 2 : 0, "");
  if (o.get) startTransit(c, o.get, "in", o.from, o.kind === "order" ? o.funds : 0, o.standing, o.kind === "order" ? "on the Council's order" : `traded by ${o.from}`);
}
/** Send an anomaly away for good: a partner site pays for it. */
export function canSendAway(c: Campaign, scp: ScpId): string | null {
  const s = c.scps.find(x => x.id === scp);
  if (!s || s.status !== "contained") return "It has to be in its cell.";
  return null;
}
export function sendAway(c: Campaign, scp: ScpId, site: string) {
  if (canSendAway(c, scp)) return;
  const s = c.scps.find(x => x.id === scp)!;
  startTransit(c, scp, "out", site, PAY_FOR[s.cls], 2, "");
}

/** New offers now and then: an order to take something in, a site wanting to buy, or a swap. */
export function newOffer(c: Campaign) {
  const k = c.council, from = pick(PARTNERS), until = c.day + 10, id = "t" + k.nextOffer++;
  const held = transferable(c).filter(s => !k.transit.some(t => t.scp === s.id));
  // the Council only orders or trades objects in when there's a free wing to put them in
  const free = freeWings(c, "Safe").length ? objectsAvailable(c) : [];
  const roll = Math.random();
  if (free.length && (roll < 0.5 || !held.length)) {
    const get = pick(free), d = SCP_DEFS[get];
    k.offers.push({ id, from, until, kind: "order", get, funds: 80, standing: 4,
      text: `${from} is ${pick(["closing a wing", "being decommissioned", "repairing breach damage", "short of staff"])}. The O5 Council orders Site-19 to take ${d.name}, "${d.title}" (${d.cls}): $80k and +4 standing on arrival. Refusing costs 6 standing.` });
  } else if (held.length && (roll < 0.8 || !free.length)) {
    const give = pick(held), pay = PAY_FOR[give.cls] + 20;
    k.offers.push({ id, from, until, kind: "sale", give: give.id as ScpId, funds: pay, standing: 2,
      text: `${from}'s researchers want ${give.name} for their own work. They offer $${pay}k for it. Its research at Site-19 would stop, and it would never breach here again.` });
  } else if (held.length && free.length) {
    const give = pick(held), get = pick(free);
    k.offers.push({ id, from, until, kind: "trade", give: give.id as ScpId, get, funds: 0, standing: 0,
      text: `${from} proposes a trade: ${give.name} for ${SCP_DEFS[get].name}, "${SCP_DEFS[get].title}" (${SCP_DEFS[get].cls}).` });
  } else return;
  log(c, `Transfer offer from ${from}: decide by ${dateText(until)}. See the O5 Council on the Command tab.`, "key", "command");
}

/** A convoy reaches Site-19 (or its destination). Anything coming in by road may be ambushed near Site-19. */
function arrive(c: Campaign, t: Transit) {
  const k = c.council;
  k.transit = k.transit.filter(x => x !== t);
  const d = SCP_DEFS[t.scp];
  if (t.dir === "out") {
    c.scps = c.scps.filter(s => s.id !== t.scp);
    c.funds += t.funds;
    addStanding(c, t.standing, `${d.name} handed to ${t.site}`);
    log(c, `${d.name} is now held at ${t.site}${t.funds ? ` (+$${t.funds}k)` : ""}. Site-19 no longer studies it.`, "key", "site");
    return;
  }
  // the Insurgency watches the roads into Site-19 once it's active
  if (yearOf(c.day) >= 1952 && Math.random() < (d.cls === "Safe" ? 0.15 : 0.3)) {
    const inc: Incident = {
      id: "inc" + c.nextIncident, kind: "escort", scpId: t.scp, region: HOME, map: Math.random() < 0.5 ? "town" : "farm",
      title: `Incident ${String(c.nextIncident).padStart(3, "0")}: Transfer convoy ambushed carrying ${d.name}`,
      appeared: c.day, expires: c.day, insurgents: Math.min(6, 3 + Math.floor((yearOf(c.day) - 1951) / 3)), transfer: t,
    };
    c.nextIncident++;
    c.incidents.push(inc);
    log(c, `The convoy bringing ${d.name} from ${t.site} is ambushed an hour from Site-19. Epsilon-11 has to hold the truck.`, "bad", "command");
    return;
  }
  receive(c, t);
}
/** An anomaly arriving by transfer is put in a cell. */
export function receive(c: Campaign, t: Transit) {
  const d = SCP_DEFS[t.scp], wing = freeWings(c, d.cls)[0];
  if (!wing) { c.funds += PAY_FOR[d.cls]; log(c, `${d.name} arrived with no free wing to hold it and went on to another site (+$${PAY_FOR[d.cls]}k).`, "key", "site"); return; }
  c.scps.push({ id: t.scp, name: d.name, title: d.title, cls: d.cls, status: "contained", wingId: wing.id, maintenance: 100, lastCleaned: c.day });
  if (t.scp === "500") c.pills = (c.pills ?? 0) + 5;
  c.funds += t.funds;
  addStanding(c, t.standing, `took ${d.name} from ${t.site}`);
  log(c, `${d.name}, "${d.title}", arrives from ${t.site}${t.funds ? ` (+$${t.funds}k)` : ""}. ${d.use ?? "New research is open."}`, "good", "site");
}
/** The ambushed transfer convoy's mission is over. */
export function transferFought(c: Campaign, t: Transit, win: boolean): string {
  if (win) { receive(c, t); return `${scpName(t.scp)} reached Site-19.`; }
  addStanding(c, -8, `lost ${scpName(t.scp)} in transit`);
  addExposure(c, HOME, 8);
  if (t.scp === "106") c.sightings["106"] = c.day + rand(60, 120);
  return `The Insurgency took ${scpName(t.scp)} off the truck. The Council holds Site-19 responsible.`;
}

// ---------- forced choices ----------

/** Several incidents at once, each with its own reward, and only one squad: answer one and the rest go unanswered. */
export function crisis(c: Campaign) {
  const open = REGION_IDS.filter(r => !c.regions[r].collapsed);
  const regions = open.sort(() => Math.random() - 0.5).slice(0, rand(2, 3));
  if (regions.length < 2) return;
  const group = "g" + c.day;
  const made: Incident[] = [];
  const longest = Math.max(...regions.map(r => travelDays(c, r)));
  for (const [i, r] of regions.entries()) {
    const kinds = ["coverup", "strike", "retaliation"] as const;
    const kind = kinds[i % 3];
    const inc = kind === "coverup" ? spawnCoverup(c, r, true) : kind === "strike" ? locateCellFor(c, r) : newRetaliation(c, r);
    if (!inc) continue;
    inc.group = group; inc.reward = rollReward(c);
    inc.expires = c.day + longest + 2;
    made.push(inc);
  }
  if (made.length < 2) { for (const i of made) { i.group = undefined; } return; }
  log(c, `Several reports at once: ${made.map(i => `${i.title.split(": ")[1]} (${rewardText(i.reward!)})`).join("; ")}. Epsilon-11 can only answer one of them. The rest will go unanswered.`, "bad", "command");
}
/** Epsilon-11 deployed to one incident in a group: the others are lost. */
export function forfeitGroup(c: Campaign, chosen: Incident) {
  if (!chosen.group) return;
  const rest = c.incidents.filter(i => i.group === chosen.group && i !== chosen && !i.dispatch);
  for (const i of rest) i.expires = Math.min(i.expires, c.day - 1);
  for (const i of c.incidents.filter(x => x.group === chosen.group)) i.group = undefined;
  if (rest.length) log(c, `With Epsilon-11 committed to ${chosen.title.split(": ")[1]}, nobody can answer ${rest.map(i => i.title.split(": ")[1]).join(" or ")}.`, "bad");
}

// ---------- every day ----------

export function tickCouncil(c: Campaign) {
  const k = c.council;
  // orders: met ones close at once; the rest are judged at their deadline
  for (const d of k.directives.filter(x => !x.state)) {
    const now = directiveNow(c, d);
    if (now === "met" && !atDeadline(d)) settle(c, d, true);
    else if (now === "broken") settle(c, d, false);
    else if (c.day >= d.due) settle(c, d, d.kind === "exposure" ? c.exposure <= d.n! : atDeadline(d));
  }
  // an audit when standing falls too low
  if (k.standing < AUDIT_BELOW && !k.audit) {
    k.audit = true;
    c.inspectionDay = Math.min(c.inspectionDay ?? Infinity, c.day + 14);
    log(c, `The O5 Council orders an audit of Site-19: an inspector arrives ${dateText(c.inspectionDay)}. Failing it costs twice as much; passing restores some standing.`, "bad", "command");
  }
  // transfers
  for (const o of k.offers.filter(x => c.day > x.until)) answerOffer(c, o.id, false);
  for (const t of k.transit.filter(x => c.day >= x.arrive)) arrive(c, t);
  if (c.day >= k.nextOffer) { newOffer(c); k.nextOffer = c.day + rand(60, 100); }
  if (c.day >= k.nextCrisis) { if (!c.incidents.some(i => i.group)) crisis(c); k.nextCrisis = c.day + rand(50, 80); }
}

/** At the end of each month the Council looks at exposure. */
export function monthlyCouncil(c: Campaign) {
  if (c.exposure >= 40) addStanding(c, -3, `global exposure at ${c.exposure}`);
  else if (c.exposure <= 15) addStanding(c, 2, `global exposure kept to ${c.exposure}`);
  issueDirectives(c);
}

