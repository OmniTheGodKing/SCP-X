// Research projects, SCP-173 tests and the equipment they unlock.
import { countOperational, engineersFree } from "./base";
import { log, yearOf, type Campaign, type Operative } from "./campaign";
import { ATTACHMENTS, model, type AttachmentId } from "../data/weapons";
import { cellWork, type ScpRecord } from "./containment";

export type Branch = "SCP-173" | "Personnel" | "Weapons" | "Equipment" | "Site";
export type TestId = "endurance" | "material" | "movement";
import type { ItemId } from "../game/types";
export type { ItemId };

export interface ProjectDef {
  name: string;
  branch: Branch;
  days: number;            // researcher-days
  cost: number;            // $k, paid when work starts
  needs?: string[];        // finished projects
  needsTest?: TestId;
  unlocks?: ItemId;
  /** Earliest year research can start (2 years before US service). */
  from?: number;
  /** A weapon model this project makes available for refitting. */
  model?: string;
  attachment?: AttachmentId;
  armorTier?: number;
  desc: string;
}

export const PROJECTS: Record<string, ProjectDef> = {
  blink_cadence:      { name: "Blink cadence protocol", branch: "SCP-173", days: 30, cost: 60, needsTest: "endurance", desc: "Staff are drilled to blink on a count. Everyone staring at SCP-173 blinks 2% less often." },
  movement_study:     { name: "Movement study", branch: "SCP-173", days: 40, cost: 80, needsTest: "movement", desc: "During missions, shows which room SCP-173 is in even when nobody can see it." },
  containment_rev:    { name: "Containment procedure revision", branch: "SCP-173", days: 40, cost: 80, needsTest: "material", desc: "SCP-173's breach risk −25%, and its cell gets dirty half as fast." },
  rapid_response:     { name: "Rapid response protocol", branch: "SCP-173", days: 30, cost: 50, needs: ["movement_study"], desc: "One extra day to answer every breach." },
  ocular_lubricant:   { name: "Ocular lubricant", branch: "Personnel", days: 20, cost: 40, needsTest: "endurance", unlocks: "eyedrops", desc: "Unlocks eye drops: the carrier ignores one blink while staring." },
  trauma_counseling:  { name: "Trauma counseling", branch: "Personnel", days: 30, cost: 60, desc: "Operatives recover 3 more sanity on quiet turns during missions." },
  marksmanship:       { name: "Advanced marksmanship", branch: "Personnel", days: 30, cost: 60, desc: "+5 aim for every operative." },
  body_armor:         { name: "M1951 flak vest", branch: "Equipment", days: 25, cost: 50, unlocks: "armor", armorTier: 1, desc: "Issue the Korean War flak vest: +2 HP and 1 armor point, which cuts the damage of every hit by 1." },
  m69_vest:           { name: "M69 fragmentation vest", branch: "Equipment", days: 60, cost: 120, from: 1967, needs: ["body_armor"], armorTier: 2, desc: "A lighter, stronger vest: +3 HP and 1 armor point. Every vest is refitted in the workshop." },
  ceramic_plate:      { name: "Foundation ceramic plate", branch: "Equipment", days: 90, cost: 200, needs: ["body_armor"], needsTest: "material", armorTier: 3, desc: "Ceramic armor developed from Site-19's materials work: +4 HP and 2 armor points. Every vest is refitted in the workshop." },
  frag:               { name: "M26 fragmentation grenade", branch: "Equipment", days: 15, cost: 30, unlocks: "frag", desc: "Unlocks frag grenades: 3 damage to everyone within a tile of the blast, and it destroys desks and other half cover." },
  flashbangs:         { name: "Foundation stun grenade", branch: "Equipment", days: 20, cost: 40, unlocks: "flashbang", desc: "A Foundation prototype decades ahead of its time. It blinds everyone in the blast, including anyone holding SCP-173." },
  smoke:              { name: "M18 smoke grenade", branch: "Equipment", days: 15, cost: 30, unlocks: "smoke", desc: "Unlocks smoke. It blocks sight for two turns, including sight of SCP-173." },
  motion_tracker:     { name: "Seismic intrusion sensor", branch: "Equipment", days: 50, cost: 90, from: 1966, unlocks: "tracker", desc: "A portable ground sensor of the kind fielded in Vietnam: the carrier detects anything within 6 tiles, through walls." },
  att_scope:          { name: "Telescopic sights", branch: "Weapons", days: 20, cost: 40, attachment: "scope", desc: "Weapon attachment: +5 aim." },
  att_trigger:        { name: "Match trigger groups", branch: "Weapons", days: 25, cost: 50, attachment: "trigger", desc: "Weapon attachment: +10% crit." },
  att_extmag:         { name: "Extended magazines", branch: "Weapons", days: 20, cost: 40, attachment: "extmag", desc: "Weapon attachment: +1 round." },
  att_stock:          { name: "Padded stocks", branch: "Weapons", days: 20, cost: 40, attachment: "stock", desc: "Weapon attachment: a miss still does 1 damage." },
  w_m60:              { name: "M60 machine gun", branch: "Weapons", days: 70, cost: 140, from: 1955, model: "m60", desc: "Replaces the BAR: 5–6 damage, 5 rounds." },
  w_m14:              { name: "M14 rifle", branch: "Weapons", days: 70, cost: 140, from: 1957, model: "m14", desc: "Replaces the M1 Garand: 4–6 damage, 5 rounds." },
  w_m16:              { name: "M16 rifle", branch: "Weapons", days: 80, cost: 160, from: 1962, needs: ["w_m14"], model: "m16", desc: "Replaces the M14: 4–6 damage, 6 rounds, +5 aim." },
  w_r870:             { name: "Remington 870", branch: "Weapons", days: 50, cost: 100, from: 1964, model: "r870", desc: "Replaces the trench gun: 5–7 damage, 4 rounds." },
  w_xm177:            { name: "XM177 carbine", branch: "Weapons", days: 60, cost: 120, from: 1964, model: "xm177", desc: "Replaces the M2 Carbine: 4–5 damage, +5 aim." },
  w_m45:              { name: "Carl Gustaf m/45", branch: "Weapons", days: 50, cost: 100, from: 1964, model: "m45", desc: "Replaces the M3 Grease Gun: 3–4 damage, 6 rounds, +5 aim." },
  w_m21:              { name: "M21 marksman rifle", branch: "Weapons", days: 80, cost: 160, from: 1967, needs: ["w_m14"], model: "m21", desc: "Replaces the Springfield: 5–7 damage, 4 rounds, +5 aim." },
  powered_jack:       { name: "Powered pallet jack", branch: "Equipment", days: 25, cost: 50, needsTest: "material", desc: "Operatives can drag SCP-173 2 tiles instead of 1." },
  reinforced_doors:   { name: "Reinforced cell doors", branch: "Site", days: 40, cost: 100, needs: ["containment_rev"], desc: "Breach risk −20% in every containment wing." },
  early_warning:      { name: "Early warning sensors", branch: "Site", days: 30, cost: 80, needs: ["movement_study"], desc: "Breaches are 8% less likely to get out of the site each day." },
  c119:               { name: "C-119 Flying Boxcar", branch: "Site", days: 40, cost: 120, desc: "A faster transport for Epsilon-11. Travel to other regions takes a quarter less time." },
  c130:               { name: "C-130 Hercules", branch: "Site", days: 60, cost: 180, from: 1954, needs: ["c119"], desc: "A long-range turboprop transport. Travel to other regions takes half the time a C-47 would." },
  efficient_gen:      { name: "Efficient generators", branch: "Site", days: 30, cost: 70, desc: "Each generator supplies 15 power instead of 10." },
};

export interface TestDef { name: string; risk: number; breach: number; dclass: number; desc: string; notes: string[]; }
export const TESTS: Record<TestId, TestDef> = {
  endurance: { name: "Observation endurance test", risk: 1, breach: 0, dclass: 1, notes: ["blink", "mind"],
    desc: "Staff take turns holding SCP-173's gaze while a D-Class sits in the cell. Measures how long people can stare before they slip." },
  material:  { name: "Material analysis", risk: 2, breach: 0.05, dclass: 1, notes: ["arms"],
    desc: "A D-Class scrapes samples from its surface while it is watched. Close contact doubles the danger." },
  movement:  { name: "Controlled movement trial", risk: 4, breach: 0.2, dclass: 2, notes: ["hunt", "hear"],
    desc: "Everyone blinks on purpose while two D-Class stand at marked distances, and the team measures how far it gets. Dangerous, and it can end in a breach." },
};

export interface ItemDef { name: string; cost: number; days: number; uses: number | null; armor?: boolean; desc: string; }
export const ITEMS: Record<ItemId, ItemDef> = {
  armor:     { name: "Flak vest", cost: 60, days: 4, uses: null, armor: true, desc: "Worn in the armor slot. Its protection depends on the vest model researched." },
  eyedrops:  { name: "Eye drops", cost: 10, days: 1, uses: 1, desc: "Ignores one blink while staring." },
  frag:      { name: "M26 frag grenade", cost: 15, days: 1, uses: 1, desc: "3 damage within 1 tile of where it lands; destroys half cover." },
  flashbang: { name: "Stun grenade", cost: 15, days: 1, uses: 1, desc: "Blinds everyone within 1 tile of where it lands until the next turn." },
  smoke:     { name: "M18 smoke grenade", cost: 10, days: 1, uses: 1, desc: "Blocks sight within 1 tile of where it lands for two turns." },
  tracker:   { name: "Seismic sensor", cost: 50, days: 3, uses: null, desc: "Detects anything within 6 tiles, through walls." },
};
/** Vest protection by researched tier. */
export const ARMOR_TIERS = [
  { name: "None", hp: 0, points: 0 },
  { name: "M1951 flak vest", hp: 2, points: 1 },
  { name: "M69 fragmentation vest", hp: 3, points: 1 },
  { name: "Foundation ceramic plate", hp: 4, points: 2 },
];
export const armorOf = (c: Campaign) => ARMOR_TIERS[c.armorTier] || ARMOR_TIERS[1];

export interface ResearchState {
  done: string[];
  paid: string[];
  progress: Record<string, number>;
  assigned: Record<string, number>;
  tests: TestId[];
}
export interface Order { item?: ItemId; attachment?: AttachmentId; refit?: string; daysLeft: number; }
export const REFIT = { cost: 100, days: 7 };

export const newResearch = (): ResearchState => ({ done: [], paid: [], progress: {}, assigned: {}, tests: [] });
export const has = (c: Campaign, id: string) => c.research.done.includes(id);
export const RESEARCHER_COST = 60;
export const researcherCapacity = (c: Campaign) => countOperational(c, "lab") * 4;
export const researchersAssigned = (c: Campaign) => Object.values(c.research.assigned).reduce((a, n) => a + n, 0);
export const researchersFree = (c: Campaign) => c.researchers - researchersAssigned(c);
export const unlockedItems = (c: Campaign) => Object.entries(PROJECTS).filter(([id, p]) => p.unlocks && has(c, id)).map(([, p]) => p.unlocks!);

export function projectLock(c: Campaign, id: string): string | null {
  const p = PROJECTS[id];
  if (p.from && yearOf(c.day) < p.from) return `Available from ${p.from}.`;
  if (p.needsTest && !c.research.tests.includes(p.needsTest)) return `Needs the ${TESTS[p.needsTest].name.toLowerCase()}.`;
  const missing = (p.needs || []).filter(n => !has(c, n));
  if (missing.length) return `Needs ${missing.map(n => PROJECTS[n].name).join(", ")}.`;
  return null;
}

/** Move one researcher onto (+1) or off (−1) a project. The project's cost is paid when work first starts. */
export function assign(c: Campaign, id: string, delta: 1 | -1): string | null {
  const r = c.research, cur = r.assigned[id] || 0;
  if (delta < 0) { if (cur > 0) r.assigned[id] = cur - 1; return null; }
  if (has(c, id)) return "Already finished.";
  const lock = projectLock(c, id);
  if (lock) return lock;
  if (researchersFree(c) < 1) return countOperational(c, "lab") ? "No free researchers. Hire more or move one off another project." : "Build a research lab and hire researchers first.";
  if (!r.paid.includes(id)) {
    if (c.funds < PROJECTS[id].cost) return `Needs $${PROJECTS[id].cost}k to start.`;
    c.funds -= PROJECTS[id].cost;
    r.paid.push(id);
    log(c, `Research started: ${PROJECTS[id].name}.`);
  }
  r.assigned[id] = cur + 1;
  return null;
}

export const canHireResearcher = (c: Campaign) =>
  c.funds < RESEARCHER_COST ? `Needs $${RESEARCHER_COST}k.` : c.researchers >= researcherCapacity(c) ? (researcherCapacity(c) ? "The labs are full. Build another research lab." : "Build a research lab first.") : null;
export function hireResearcher(c: Campaign) {
  if (canHireResearcher(c)) return;
  c.funds -= RESEARCHER_COST; c.researchers++;
  log(c, "A researcher joins the site staff.");
}

/** One day of research and workshop production. */
export function tickResearch(c: Campaign) {
  const r = c.research;
  // researchers beyond lab space (a lab was damaged) stop working on the newest assignments
  while (researchersAssigned(c) > Math.min(c.researchers, researcherCapacity(c))) {
    const k = Object.keys(r.assigned).reverse().find(k => r.assigned[k] > 0)!;
    r.assigned[k]--;
  }
  for (const [id, n] of Object.entries(r.assigned)) {
    if (!n) continue;
    r.progress[id] = (r.progress[id] || 0) + n;
    if (r.progress[id] >= PROJECTS[id].days) {
      r.done.push(id); delete r.assigned[id];
      const p = PROJECTS[id], u = p.unlocks;
      const next = u ? ` ${ITEMS[u].name} can now be built in the workshop.` : p.model || (p.armorTier ?? 0) > 1 ? " Refit the squad in the workshop." : p.attachment ? ` ${ATTACHMENTS[p.attachment].name} can now be built in the workshop.` : "";
      if (p.armorTier === 1) c.armorTier = Math.max(c.armorTier, 1);
      log(c, `Research complete: ${p.name}.${next}`, "good");
    }
  }
  const working = countOperational(c, "workshop") > 0;
  for (const o of [...c.orders]) {
    if (!working) break;
    if (--o.daysLeft <= 0) {
      c.orders = c.orders.filter(x => x !== o);
      if (o.item) {
        c.inventory[o.item] = (c.inventory[o.item] || 0) + 1;
        log(c, `Workshop: ${ITEMS[o.item].name} ready.`, "good");
      } else if (o.attachment) {
        c.attachments[o.attachment] = (c.attachments[o.attachment] || 0) + 1;
        log(c, `Workshop: ${ATTACHMENTS[o.attachment].name} ready. Fit it on the Personnel tab.`, "good");
      } else if (o.refit?.startsWith("armor:")) {
        c.armorTier = Number(o.refit.slice(6));
        log(c, `Workshop: every vest refitted as ${ARMOR_TIERS[c.armorTier].name}.`, "good");
      } else if (o.refit) {
        const m = model(o.refit);
        c.models[m.type] = m.id;
        log(c, `Workshop: Epsilon-11 is now issued the ${m.name}.`, "good");
      }
    }
  }
}

/** Refits waiting to be ordered: researched weapon models and vest tiers not yet issued. */
export function pendingRefits(c: Campaign): { key: string; name: string }[] {
  const out: { key: string; name: string }[] = [];
  for (const [id, p] of Object.entries(PROJECTS)) {
    if (!has(c, id) || c.orders.some(o => o.refit === (p.model ?? `armor:${p.armorTier}`))) continue;
    if (p.model && c.models[model(p.model).type] !== p.model && model(c.models[model(p.model).type]).year < model(p.model).year) out.push({ key: p.model, name: model(p.model).name });
    if ((p.armorTier ?? 0) > 1 && c.armorTier < p.armorTier!) out.push({ key: `armor:${p.armorTier}`, name: ARMOR_TIERS[p.armorTier!].name });
  }
  return out;
}
export function canRefit(c: Campaign): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (c.funds < REFIT.cost) return `Needs $${REFIT.cost}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function orderRefit(c: Campaign, key: string) {
  if (canRefit(c) || !pendingRefits(c).some(r => r.key === key)) return;
  c.funds -= REFIT.cost;
  c.orders.push({ refit: key, daysLeft: REFIT.days });
}
export const unlockedAttachments = (c: Campaign) =>
  Object.entries(PROJECTS).filter(([id, p]) => p.attachment && has(c, id)).map(([, p]) => p.attachment!);
export const ATTACHMENT_COST = { cost: 30, days: 3 };
export function canOrderAttachment(c: Campaign, a: AttachmentId): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (!unlockedAttachments(c).includes(a)) return "Not researched yet.";
  if (c.funds < ATTACHMENT_COST.cost) return `Needs $${ATTACHMENT_COST.cost}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function orderAttachment(c: Campaign, a: AttachmentId) {
  if (canOrderAttachment(c, a)) return;
  c.funds -= ATTACHMENT_COST.cost;
  c.orders.push({ attachment: a, daysLeft: ATTACHMENT_COST.days });
}

export function canOrder(c: Campaign, item: ItemId): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (!unlockedItems(c).includes(item)) return "Not researched yet.";
  if (c.funds < ITEMS[item].cost) return `Needs $${ITEMS[item].cost}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function order(c: Campaign, item: ItemId) {
  if (canOrder(c, item)) return;
  c.funds -= ITEMS[item].cost;
  c.orders.push({ item, daysLeft: ITEMS[item].days });
}

// ---------- tests ----------
export function canTest(c: Campaign, s: ScpRecord, t: TestId): string | null {
  if (c.research.tests.includes(t)) return "Already done.";
  if (!countOperational(c, "lab")) return "Needs a working research lab.";
  if (s.status !== "contained") return `${s.name} isn't in its cell.`;
  if (c.dclass < TESTS[t].dclass) return `Needs ${TESTS[t].dclass} D-Class.`;
  return null;
}
export function runTest(c: Campaign, s: ScpRecord, t: TestId, watchers: Operative[]) {
  if (canTest(c, s, t)) return;
  const d = TESTS[t];
  const ok = cellWork(c, s, watchers, `the ${d.name.toLowerCase()}`, d.risk, d.dclass, d.breach);
  if (ok) {
    c.research.tests.push(t);
    for (const n of d.notes) if (!c.knownNotes.includes(n)) c.knownNotes.push(n);
    log(c, `${d.name} complete. SCP-173's file has been updated and new research is available.`, "good");
  }
}

