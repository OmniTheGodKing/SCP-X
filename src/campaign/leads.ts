// Leads (Phase 4F): opportunities that turn up on the World Map by themselves as time passes, most of them heard by
// the fronts. Not all of them are fights: agents, money and a decision are often enough. Each has a deadline; a
// hostile preparation left alone becomes an attack on its town.
import { REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import { dateText, gainIntel, log, type Campaign, type Incident } from "./campaign";
import { earn, spend } from "./ledger";
import { addStanding } from "./council";
import { addThreat } from "./chaos";
import { isContacted, locateCellFor } from "./world";
import { agentRisk, agentsFree } from "./taskforces";
import { ITEMS, itemCost, unlockedItems, researcherCapacity, type ItemId } from "./research";
import { engineerCapacity } from "./base";
import { announceHire, hirePerson } from "./people";

export type LeadKind = "supply" | "intel" | "council" | "covert" | "discovery" | "hostile";
export type LeadAction = "agent" | "squad" | "pay" | "front" | "decline";
export interface Lead {
  id: string; kind: LeadKind; region: RegionId; town: string; title: string; until: number;
  /** Discovery leads: what's on offer. */
  offer?: "researcher" | "engineers" | "items";
  items?: ItemId[];
  /** An agent is on it: the result comes in on this day. */
  working?: { action: LeadAction; done: number };
}
export interface LeadsState { list: Lead[]; next: number; lastSpawn: number }
export const newLeads = (): LeadsState => ({ list: [], next: 1, lastSpawn: 0 });

export const LEAD = { max: 4, everyDays: 5, quiet: 10, open: [5, 12] as [number, number] };
interface ActionDef { label: string; cost?: number; days?: number; agent?: boolean; chance?: number; desc: string }
export const LEADS: Record<LeadKind, { name: string; icon: string; titles: string[]; actions: Partial<Record<LeadAction, ActionDef>>; risk: string; reward: string }> = {
  supply: { name: "Supply recovery", icon: "recovery", titles: ["An Insurgency supply truck crashed outside {town}", "An army surplus dump left unguarded near {town}", "A stranded freight car of crated kit at {town}"],
    risk: "Light: whoever left it may come back for it.", reward: "Two pieces of workshop equipment, or captured weapons for research.",
    actions: { agent: { label: "Send an agent", cost: 10, days: 3, agent: true, chance: 0.75, desc: "75%: two pieces of equipment or captured weapons. 15% the agent comes back hurt." },
      squad: { label: "Send Epsilon-11", desc: "A mission to secure it: the haul is certain, plus salvage." } } },
  intel: { name: "Intel lead", icon: "intel", titles: ["An Insurgency defector wants to talk in {town}", "A talkative clerk in {town} has seen the wrong papers", "An intercepted courier is being held in {town}"],
    risk: "It might be a trap.", reward: "Intel.",
    actions: { agent: { label: "Send an agent to meet them", cost: 0, days: 3, agent: true, desc: "+3 Intel. 15% it's a trap and the agent comes back hurt." },
      pay: { label: "Buy the papers", cost: 40, desc: "+2 Intel at once, no risk." } } },
  council: { name: "Council assignment", icon: "council", titles: ["The O5 Council wants a witness in {town} checked", "The O5 Council wants a missing file traced to {town}", "The O5 Council wants a Foundation front audited at {town}"],
    risk: "Low.", reward: "+4 standing and $30k.",
    actions: { agent: { label: "Assign an agent", cost: 0, days: 4, agent: true, desc: "+4 standing and $30k. 10% the agent comes back hurt." },
      decline: { label: "Decline", desc: "−2 standing." } } },
  covert: { name: "Covert opportunity", icon: "insurgency", titles: ["An Insurgency safehouse in {town} is lightly held", "An Insurgency paymaster keeps rooms in {town}", "An Insurgency radio post near {town} is poorly watched"],
    risk: "Moderate: the Insurgency watches its own.", reward: "Intel, and a blow to the Insurgency's agenda.",
    actions: { agent: { label: "Put it under surveillance", cost: 15, days: 5, agent: true, desc: "+2 Intel and the Insurgency's agenda −3. 10% the agent comes back hurt." },
      squad: { label: "Strike it with Epsilon-11", desc: "A strike mission with 3 Intel attached for winning it." } } },
  discovery: { name: "Resource discovery", icon: "build", titles: ["A university laboratory is closing in {town}", "A contracting firm in {town} is folding", "A surplus sale is being held at {town}"],
    risk: "None.", reward: "People or equipment at a good price.",
    actions: { pay: { label: "Take the offer", desc: "" } } },
  hostile: { name: "Hostile preparation", icon: "retaliation", titles: ["Insurgents are gathering outside {town}", "Armed strangers are buying fuel and rope in {town}", "The Insurgency is moving people into {town}"],
    risk: "High: left alone, it becomes an attack on the town.", reward: "The attack never happens.",
    actions: { squad: { label: "Pre-emptive strike", desc: "A strike mission now; if it fails, the attack comes anyway." },
      front: { label: "Have the front disrupt it", cost: 50, chance: 0.6, desc: "60% it's broken up quietly; otherwise the attack comes on the deadline." } } },
};
export const leadPrice = (c: Campaign, l: Lead) => l.offer === "researcher" ? 25 : l.offer === "engineers" ? 60 : (l.items ?? []).reduce((a, i) => a + Math.ceil(itemCost(c, i) / 2), 0);
export const offerText = (c: Campaign, l: Lead) => l.offer === "researcher" ? "Hire one of its researchers" : l.offer === "engineers" ? "Hire two of its engineers" : `Buy ${(l.items ?? []).map(i => ITEMS[i].name).join(" and ")} at half price`;

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
function weighted<T>(xs: [T, number][]) { const t = xs.reduce((a, [, w]) => a + w, 0); let r = Math.random() * t; for (const [x, w] of xs) { if ((r -= w) < 0) return x; } return xs[0][0]; }

/** A new lead, shaped by the campaign: the fronts hear most things, a strong Insurgency is busier, standing brings
 *  the Council's attention. */
export function spawnLead(c: Campaign, force?: LeadKind): Lead | null {
  const k = (c.leads ??= newLeads());
  const taken = new Set(k.list.map(l => l.region));
  const regions = REGION_IDS.filter(r => !c.regions[r].collapsed && !taken.has(r));
  if (!regions.length) return null;
  const region = weighted(regions.map(r => [r, isContacted(c, r) ? 3 : 1] as [RegionId, number]));
  const agenda = c.chaos.threat, standing = c.council.standing;
  const items = unlockedItems(c);
  const kind = force ?? weighted<LeadKind>([["supply", 2], ["intel", 2], ["council", 0.6 + standing / 60], ["covert", 0.8 + agenda / 40], ["discovery", 1.5], ["hostile", 0.4 + agenda / 30]]);
  const town = pick(REGIONS[region].towns);
  const l: Lead = { id: "lead" + k.next++, kind, region, town, title: pick(LEADS[kind].titles).replace("{town}", town.split(",")[0]), until: c.day + rand(...LEAD.open) };
  if (kind === "discovery") {
    const opts: Lead["offer"][] = [];
    if (c.researchers < researcherCapacity(c)) opts.push("researcher");
    if (c.engineers + 2 <= engineerCapacity(c)) opts.push("engineers");
    if (items.length) opts.push("items");
    l.offer = opts.length ? pick(opts) : "items";
    if (l.offer === "items") l.items = items.length ? [pick(items), pick(items)] : ["frag", "flashbang"];
    if (l.offer === "researcher") l.title = `A university laboratory is closing in ${town.split(",")[0]}`;
    else if (l.offer === "engineers") l.title = `A contracting firm in ${town.split(",")[0]} is folding`;
    else l.title = `A surplus sale is being held at ${town.split(",")[0]}`;
  }
  k.list.push(l);
  log(c, `New lead in ${REGIONS[region].name}: ${l.title}. Open until ${dateText(l.until)} on the World Map.`, "key");
  return l;
}

export function canLeadAction(c: Campaign, l: Lead, a: LeadAction): string | null {
  if (l.working) return "Already under way.";
  const d = a === "pay" && l.kind === "discovery" ? { cost: leadPrice(c, l) } : LEADS[l.kind].actions[a];
  if (!d) return "Not possible here.";
  if ((d as ActionDef).agent && agentsFree(c) < 1) return `Every field agent is busy or hurt (${c.tf.agents} on staff).`;
  if (d.cost && c.funds < d.cost) return `Needs $${d.cost}k.`;
  if (l.kind === "discovery" && l.offer === "researcher" && c.researchers >= researcherCapacity(c)) return "No lab space for another researcher.";
  if (l.kind === "discovery" && l.offer === "engineers" && c.engineers + 2 > engineerCapacity(c)) return "No quarters for two more engineers.";
  return null;
}

/** Take an action on a lead. A squad action returns the mission it creates, for the map to open. */
export function leadAction(c: Campaign, id: string, a: LeadAction): Incident | null {
  const k = c.leads, l = k?.list.find(x => x.id === id);
  if (!k || !l || canLeadAction(c, l, a)) return null;
  const d = LEADS[l.kind].actions[a];
  const drop = () => { k.list = k.list.filter(x => x !== l); };
  if (a === "decline") {
    drop();
    if (l.kind === "council") addStanding(c, -2, "declined a Council assignment");
    if (l.kind === "hostile") { (c.retaliations ??= []).push({ region: l.region, day: l.until }); log(c, `Lead declined: ${l.title}. Expect an attack on ${l.town} by ${dateText(l.until)}.`, "bad"); return null; }
    log(c, `Lead declined: ${l.title}.`);
    return null;
  }
  if (d?.agent) {
    if (d.cost) spend(c, d.cost, "operations", `${LEADS[l.kind].name}: ${l.town}`);
    l.working = { action: a, done: c.day + (d.days ?? 3) };
    log(c, `An agent is on the lead in ${l.town}: ${l.title}. Result ${dateText(l.working.done)}.`);
    return null;
  }
  if (a === "squad") {
    // the squad goes in through the ordinary deploy panel: the lead becomes a strike mission with its reward
    const inc = locateCellFor(c, l.region);
    inc.title = `${inc.title.split(":")[0]}: ${l.title}`;
    inc.map = l.kind === "supply" ? "port" : pick(["town", "farm", "port"] as const);
    if (l.kind === "supply") { inc.reward = { kind: "gear", n: 2, item: pick(unlockedItems(c).length ? unlockedItems(c) : ["frag"] as ItemId[]) }; inc.insurgents = Math.max(2, inc.insurgents - 2); }
    if (l.kind === "covert") inc.reward = { kind: "intel", n: 3 };
    if (l.kind === "hostile") inc.hostileLead = true;
    inc.expires = Math.max(inc.expires, l.until);
    drop();
    log(c, `${l.title}: a mission is ready for Epsilon-11 on the World Map.`, "key");
    return inc;
  }
  if (a === "pay" && l.kind === "discovery") {
    const price = leadPrice(c, l);
    spend(c, price, "hiring", `${LEADS.discovery.name}: ${l.town}`);
    if (l.offer === "researcher") announceHire(c, hirePerson(c, "researcher", undefined));
    else if (l.offer === "engineers") for (let i = 0; i < 2; i++) announceHire(c, hirePerson(c, "engineer", undefined));
    else for (const i of l.items ?? []) c.inventory[i] = (c.inventory[i] ?? 0) + 1;
    drop();
    log(c, `${l.title}: ${offerText(c, l).toLowerCase()} for $${price}k. Done.`, "good");
    return null;
  }
  if (a === "pay") { spend(c, d!.cost!, "operations", `${LEADS[l.kind].name}: ${l.town}`); gainIntel(c, 2); drop(); log(c, `${l.title}: the papers are bought (+2 Intel).`, "good"); return null; }
  if (a === "front") {
    spend(c, d!.cost!, "operations", `Front disruption near ${l.town}`);
    drop();
    if (Math.random() < (d!.chance ?? 0.6)) log(c, `${REGIONS[l.region].front} broke up the Insurgents gathering near ${l.town} before they could move.`, "good");
    else { (c.retaliations ??= []).push({ region: l.region, day: l.until }); log(c, `${REGIONS[l.region].front} couldn't stop the Insurgents near ${l.town}. Expect an attack there by ${dateText(l.until)}.`, "bad"); }
    return null;
  }
  return null;
}

function resolve(c: Campaign, l: Lead) {
  const where = REGIONS[l.region].name;
  let text = "";
  switch (l.kind) {
    case "supply": {
      if (Math.random() < 0.75) {
        const items = unlockedItems(c);
        if (items.length) { const got = [pick(items), pick(items)]; for (const i of got) c.inventory[i] = (c.inventory[i] ?? 0) + 1; text = `the agent brought back ${got.map(i => ITEMS[i].name).join(" and ")}.`; }
        else { c.materials.ciWeapons = (c.materials.ciWeapons ?? 0) + 3; text = "the agent brought back 3 Insurgency weapons for research."; }
      } else text = "someone had got there first.";
      text += agentRisk(c, 0.15, 0.02, where);
      break;
    }
    case "intel": gainIntel(c, 3); text = `+3 Intel.${agentRisk(c, 0.15, 0.02, where)}`; break;
    case "council": addStanding(c, 4, "a Council assignment done"); earn(c, 30, "contracts", `Council assignment: ${l.town}`); text = `+4 standing and $30k.${agentRisk(c, 0.1, 0.01, where)}`; break;
    case "covert": gainIntel(c, 2); addThreat(c, -3, `a safehouse watched in ${l.town}`); text = `+2 Intel; the Insurgency's agenda −3.${agentRisk(c, 0.1, 0.02, where)}`; break;
    default: break;
  }
  log(c, `Lead in ${l.town} (${l.title}): ${text}`, "good");
}

/** Every day: agents' results, deadlines, and now and then a new lead. */
export function tickLeads(c: Campaign) {
  const k = (c.leads ??= newLeads());
  for (const l of k.list.filter(x => x.working && x.working.done <= c.day)) { resolve(c, l); k.list = k.list.filter(x => x !== l); }
  for (const l of k.list.filter(x => !x.working && x.until < c.day)) {
    k.list = k.list.filter(x => x !== l);
    if (l.kind === "hostile") { (c.retaliations ??= []).push({ region: l.region, day: c.day }); log(c, `Nobody stopped the Insurgents near ${l.town}. They are attacking.`, "bad"); }
    else log(c, `The lead in ${l.town} went cold: ${l.title}.`);
  }
  // about one every five days, never two days running, and always one after ten quiet days
  const gap = c.day - k.lastSpawn;
  if (k.list.length < LEAD.max && gap >= 3 && (gap >= LEAD.quiet || Math.random() < 1 / LEAD.everyDays)) { if (spawnLead(c)) k.lastSpawn = c.day; }
}
