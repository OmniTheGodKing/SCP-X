// Research projects, SCP-173 tests and the equipment they unlock.
import { countOperational, engineersFree } from "./base";
import { log, type Campaign, type Operative } from "./campaign";
import { cellWork, type ScpRecord } from "./containment";

export type Branch = "SCP-173" | "Personnel" | "Equipment" | "Site";
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
  body_armor:         { name: "Body armor", branch: "Equipment", days: 25, cost: 50, unlocks: "armor", desc: "Unlocks body armor: +2 HP and 1 armor point, which cuts the damage of every hit by 1." },
  flashbangs:         { name: "Flashbangs", branch: "Equipment", days: 20, cost: 40, unlocks: "flashbang", desc: "Unlocks flashbangs. They blind everyone in the blast, including anyone holding SCP-173." },
  smoke:              { name: "Smoke grenades", branch: "Equipment", days: 15, cost: 30, unlocks: "smoke", desc: "Unlocks smoke. It blocks sight for two turns, including sight of SCP-173." },
  motion_tracker:     { name: "Motion tracker", branch: "Equipment", days: 35, cost: 70, unlocks: "tracker", desc: "Unlocks motion trackers: the carrier detects anything within 6 tiles, through walls." },
  powered_jack:       { name: "Powered pallet jack", branch: "Equipment", days: 25, cost: 50, needsTest: "material", desc: "Operatives can drag SCP-173 2 tiles instead of 1." },
  reinforced_doors:   { name: "Reinforced cell doors", branch: "Site", days: 40, cost: 100, needs: ["containment_rev"], desc: "Breach risk −20% in every containment wing." },
  early_warning:      { name: "Early warning sensors", branch: "Site", days: 30, cost: 80, needs: ["movement_study"], desc: "Breaches are 8% less likely to get out of the site each day." },
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
  armor:     { name: "Body armor", cost: 60, days: 4, uses: null, armor: true, desc: "+2 HP, 1 armor point. Worn in the armor slot." },
  eyedrops:  { name: "Eye drops", cost: 10, days: 1, uses: 1, desc: "Ignores one blink while staring." },
  flashbang: { name: "Flashbang", cost: 15, days: 1, uses: 1, desc: "Blinds everyone within 1 tile of where it lands until the next turn." },
  smoke:     { name: "Smoke grenade", cost: 10, days: 1, uses: 1, desc: "Blocks sight within 1 tile of where it lands for two turns." },
  tracker:   { name: "Motion tracker", cost: 50, days: 3, uses: null, desc: "Detects anything within 6 tiles, through walls." },
};
export const ARMOR = { hp: 2, points: 1 };

export interface ResearchState {
  done: string[];
  paid: string[];
  progress: Record<string, number>;
  assigned: Record<string, number>;
  tests: TestId[];
}
export interface Order { item: ItemId; daysLeft: number; }

export const newResearch = (): ResearchState => ({ done: [], paid: [], progress: {}, assigned: {}, tests: [] });
export const has = (c: Campaign, id: string) => c.research.done.includes(id);
export const RESEARCHER_COST = 60;
export const researcherCapacity = (c: Campaign) => countOperational(c, "lab") * 4;
export const researchersAssigned = (c: Campaign) => Object.values(c.research.assigned).reduce((a, n) => a + n, 0);
export const researchersFree = (c: Campaign) => c.researchers - researchersAssigned(c);
export const unlockedItems = (c: Campaign) => Object.entries(PROJECTS).filter(([id, p]) => p.unlocks && has(c, id)).map(([, p]) => p.unlocks!);

export function projectLock(c: Campaign, id: string): string | null {
  const p = PROJECTS[id];
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
      const u = PROJECTS[id].unlocks;
      log(c, `Research complete: ${PROJECTS[id].name}.${u ? ` ${ITEMS[u].name} can now be built in the workshop.` : ""}`, "good");
    }
  }
  const working = countOperational(c, "workshop") > 0;
  for (const o of [...c.orders]) {
    if (!working) break;
    if (--o.daysLeft <= 0) {
      c.orders = c.orders.filter(x => x !== o);
      c.inventory[o.item] = (c.inventory[o.item] || 0) + 1;
      log(c, `Workshop: ${ITEMS[o.item].name} ready.`, "good");
    }
  }
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

