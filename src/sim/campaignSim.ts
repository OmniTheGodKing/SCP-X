// Headless campaign simulation (Strategic overhaul A4). Runs the real campaign code (advanceDay and the same actions the
// hub's buttons call) under scripted management strategies, with a fixed seed, and records what happened day by day.
// No UI is loaded: this is the proof that the strategic simulation runs on its own, and the tool used to look for
// soft-locks, failure spirals, runaway money, idle time and incident overload.
import { setCampaignSeed } from "../core/rng";
import { advanceDay, canHire, candidateCost, hireCandidate, newCampaign, pendingBreach, refreshRecruits, type Campaign, type Incident } from "../campaign/campaign";
import { FACILITIES, build, canBuild, canExcavate, canRepair, excavate, facilityAt, repair, type FacilityType } from "../campaign/base";
import { PROJECTS, assign, has, hireResearcher, projectVisible, researchersFree } from "../campaign/research";
import { canClean, cleanCell } from "../campaign/containment";
import { canHireGuard, hireGuard, letGuardsHandle, letGuardsHandleRaid, letGuardsHandleRiot, stations } from "../campaign/security";
import { AUTO_KINDS, dispatchOdds, resolveTeam } from "../campaign/autoteam";
import { globalExposure } from "../campaign/world";
import { checkInvariants } from "../campaign/invariants";
import type { Difficulty } from "../campaign/difficulty";

export type StrategyId = "balanced" | "research" | "security" | "economy" | "aggressive" | "minimal" | "poor";
export const STRATEGIES: StrategyId[] = ["balanced", "research", "security", "economy", "aggressive", "minimal", "poor"];

/** What one strategy does each day before time advances. */
interface Strategy { build: FacilityType[]; reserve: number; research: boolean; guards: boolean; clean: boolean; intervene: number; repair: boolean; excavate: boolean; hire: number }
const PLANS: Record<StrategyId, Strategy> = {
  balanced:   { build: ["generator", "lab", "workshop", "medical", "security", "psych", "training", "lab", "generator"], reserve: 150, research: true, guards: true, clean: true, intervene: 0.5, repair: true, excavate: true, hire: 1 },
  research:   { build: ["generator", "lab", "lab", "generator", "lab", "workshop"], reserve: 80, research: true, guards: false, clean: true, intervene: 0.2, repair: true, excavate: true, hire: 2 },
  security:   { build: ["generator", "security", "security", "medical", "training", "lab"], reserve: 120, research: true, guards: true, clean: true, intervene: 0.4, repair: true, excavate: true, hire: 0 },
  economy:    { build: ["generator"], reserve: 400, research: false, guards: false, clean: true, intervene: 0.2, repair: true, excavate: false, hire: 0 },
  aggressive: { build: ["generator", "medical", "training", "lab", "security"], reserve: 120, research: true, guards: true, clean: true, intervene: 1, repair: true, excavate: false, hire: 1 },
  minimal:    { build: [], reserve: 0, research: false, guards: false, clean: true, intervene: 0, repair: false, excavate: false, hire: 0 },
  poor:       { build: ["holding", "amnestics", "training", "barracks"], reserve: 0, research: false, guards: false, clean: false, intervene: 0, repair: false, excavate: false, hire: 0 },
};

export interface DayStat { day: number; funds: number; standing: number; exposure: number; threat: number; researchers: number; idleResearchers: number; engineers: number; facilities: number; breaches: number; openIncidents: number; opsAlive: number }
export interface SimResult {
  strategy: StrategyId; days: number; seed: number;
  daily: DayStat[];
  totals: { breaches: number; incidentsSeen: number; incidentsMissed: number; researchDone: number; built: number; opsLost: number; guardsLost: number; maxFunds: number; minFunds: number; idleResearcherDays: number; quietDays: number };
  over?: string;
  invariantErrors: string[];
}

/** Free slot for a new facility: first empty slot on any excavated level. */
function freeSlot(c: Campaign): [number, number] | null {
  for (let level = 0; level < c.base.levels; level++) for (let slot = 0; slot < 6; slot++) if (!facilityAt(c, level, slot)) return [level, slot];
  return null;
}

/** Handle an incident the way the strategy would: Site Security for the ones at home, a team for the rest. */
function answer(c: Campaign, inc: Incident, s: Strategy, rnd: () => number) {
  if (inc.kind === "breach") { letGuardsHandle(c, inc); return; }
  if (inc.kind === "raid") { letGuardsHandleRaid(c, inc); return; }
  if (inc.kind === "riot") { letGuardsHandleRiot(c, inc); return; }
  if (inc.kind === "escort") { c.incidents = c.incidents.filter(i => i !== inc); return; }
  // field incidents: send a team (as if played) at the strategy's willingness, when one is fit to go
  if (!AUTO_KINDS.includes(inc.kind) || inc.dispatch || rnd() > s.intervene) return;
  const ops = c.roster.filter(o => o.alive && !o.busy && o.hp >= o.maxHp * 0.6).slice(0, 4);
  if (ops.length < 2) return;
  inc.dispatch = { how: "squad", done: c.day, doses: 0, ops: ops.map(o => o.id), odds: dispatchOdds(c, inc, ops) };
  resolveTeam(c, inc);
}

/** `observe` (developer tools and tests) sees the campaign after each simulated day, with that day's invariant errors. */
export function simulate(strategy: StrategyId, days: number, seed = 1, difficulty: Difficulty = "agent", observe?: (c: Campaign, errors: string[]) => void): SimResult {
  setCampaignSeed(seed);
  const c = newCampaign({ difficulty, ironman: false, tutorial: false, seed });
  setCampaignSeed(seed);
  const s = PLANS[strategy];
  let lcg = seed * 2654435761 >>> 0;
  const rnd = () => ((lcg = (lcg * 1664525 + 1013904223) >>> 0) / 4294967296);
  const daily: DayStat[] = [];
  const seenInc = new Set<string>(), errors: string[] = [];
  const start = { opsAlive: c.roster.filter(o => o.alive).length, guardsAlive: c.guards.filter(g => g.alive).length };
  let breaches = 0, built = 0, buildIdx = 0, idleResearcherDays = 0, quietDays = 0, lastLog = c.log.length;
  for (let d = 0; d < days && !c.over; d++) {
    // ---- the strategy's decisions ----
    if (s.repair) for (const f of c.base.facilities) if (f.disabled && !canRepair(c, f)) repair(c, f);
    const next = s.build[buildIdx];
    if (next) {
      const slot = freeSlot(c);
      if (slot && c.funds - FACILITIES[next].cost >= s.reserve && !canBuild(c, next, slot[0], slot[1])) { build(c, next, slot[0], slot[1]); built++; buildIdx++; }
      else if (!slot && s.excavate && !canExcavate(c)) excavate(c);
    }
    for (let h = 0; h < s.hire; h++) if (c.funds > s.reserve + 100) hireResearcher(c);
    // keep the squad up to strength (everyone but the do-nothing strategies)
    if (s.intervene > 0 || s.guards) {
      if (!c.recruits) refreshRecruits(c);
      while (c.roster.filter(o => o.alive).length < 6 && c.recruits?.length) {
        const k = [...c.recruits].sort((a, b) => candidateCost(a) - candidateCost(b))[0];
        if (canHire(c, k) || c.funds - candidateCost(k) < s.reserve / 2) break;
        hireCandidate(c, k);
      }
    }
    if (s.research) {
      const open = Object.keys(PROJECTS).filter(id => !has(c, id) && projectVisible(c, id)).sort((a, b) => PROJECTS[a].days - PROJECTS[b].days);
      for (const id of open) { if (researchersFree(c) < 1) break; if (c.funds - s.reserve < 0) break; assign(c, id, 1); }
    }
    if (s.guards) for (const st of stations(c)) if (!canHireGuard(c, st.id) && c.funds > s.reserve + 60) hireGuard(c, st.id);
    if (s.clean) for (const scp of c.scps) if (scp.maintenance < 50 && !canClean(c, scp)) cleanCell(c, scp);
    for (const inc of [...c.incidents]) { if (!seenInc.has(inc.id)) { seenInc.add(inc.id); if (inc.kind === "breach") breaches++; } }
    for (const inc of [...c.incidents]) answer(c, inc, s, rnd);
    // ---- time ----
    let guard = 0;
    while (pendingBreach(c) && guard++ < 5) { const b = pendingBreach(c)!; if (!seenInc.has(b.id)) { seenInc.add(b.id); if (b.kind === "breach") breaches++; } answer(c, b, s, rnd); }
    advanceDay(c);
    for (const inc of c.incidents) if (!seenInc.has(inc.id)) { seenInc.add(inc.id); if (inc.kind === "breach") breaches++; }
    const idle = researchersFree(c);
    idleResearcherDays += idle;
    if (c.log.length === lastLog) quietDays++;
    lastLog = c.log.length;
    const today = checkInvariants(c);
    for (const e of today) if (errors.length < 50) errors.push(`day ${c.day}: ${e}`);
    observe?.(c, today);
    daily.push({ day: c.day, funds: c.funds, standing: c.council.standing, exposure: globalExposure(c), threat: c.chaos.threat, researchers: c.researchers, idleResearchers: idle, engineers: c.engineers, facilities: c.base.facilities.length, breaches, openIncidents: c.incidents.length, opsAlive: c.roster.filter(o => o.alive).length });
  }
  const funds = daily.map(x => x.funds);
  return {
    strategy, days, seed, daily, over: c.over, invariantErrors: errors,
    totals: {
      breaches, incidentsSeen: seenInc.size, incidentsMissed: c.stats.missed, researchDone: c.research.done.length, built,
      opsLost: c.roster.filter(o => !o.alive).length,
      guardsLost: start.guardsAlive - c.guards.filter(g => g.alive).length,
      maxFunds: Math.max(...funds), minFunds: Math.min(...funds), idleResearcherDays, quietDays,
    },
  };
}

/** A short table of results, for the report. */
export function summarize(rs: SimResult[]) {
  return rs.map(r => {
    const last = r.daily[r.daily.length - 1];
    return `${r.strategy.padEnd(10)} ${String(r.days).padStart(3)}d  funds ${String(last?.funds ?? 0).padStart(5)} (min ${r.totals.minFunds}, max ${r.totals.maxFunds})  standing ${last?.standing}  exposure ${last?.exposure}  threat ${last?.threat}  breaches ${r.totals.breaches}  incidents ${r.totals.incidentsSeen} (missed ${r.totals.incidentsMissed})  research ${r.totals.researchDone}  built ${r.totals.built}  idle-res-days ${r.totals.idleResearcherDays}  quiet ${r.totals.quietDays}  ops ${last?.opsAlive}${r.over ? "  OVER: " + r.over.slice(0, 60) : ""}${r.invariantErrors.length ? `  INVARIANTS ${r.invariantErrors.length}` : ""}`;
  }).join("\n");
}
