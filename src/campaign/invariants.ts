// Campaign invariants (Strategic overhaul L): things that must always be true of a campaign. The simulator checks them
// every day, the tests check them after every scripted step, and the debug panel can check a live campaign. Each
// returns a short description of what is wrong; an empty list means the campaign is consistent.
import type { Campaign } from "./campaign";
import { FACILITIES, engineersBusy, isContainment } from "./base";
import { researchersAssigned } from "./research";

export function checkInvariants(c: Campaign): string[] {
  const out: string[] = [];
  const num = (n: unknown, what: string) => { if (typeof n !== "number" || !Number.isFinite(n)) out.push(`${what} is not a number (${n})`); };
  num(c.funds, "funds"); num(c.day, "day"); num(c.researchers, "researchers"); num(c.engineers, "engineers"); num(c.dclass, "D-Class"); num(c.intel, "Intel"); num(c.council.standing, "standing");
  if (c.researchers < 0 || c.engineers < 0 || c.dclass < 0 || c.intel < 0 || c.amnestics < 0) out.push("a staff or resource count is negative");
  // staffing
  for (const [id, n] of Object.entries(c.research.assigned)) if (n < 0) out.push(`negative researchers on ${id}`);
  if (researchersAssigned(c) > c.researchers) out.push(`more researchers assigned (${researchersAssigned(c)}) than on staff (${c.researchers})`);
  // engineers can be fewer than the work needs after a loss mid-job: the work then slows (tickConstruction), and
  // nothing new can start until engineers are free, so it is not an error here
  if (new Set(c.research.done).size !== c.research.done.length) out.push("a research project completed twice");
  for (const id of c.research.done) if (c.research.assigned[id]) out.push(`researchers still assigned to finished project ${id}`);
  // facilities: unique ids and positions
  const ids = new Set<string>(), spots = new Set<string>();
  for (const f of c.base.facilities) {
    if (ids.has(f.id)) out.push(`duplicate facility id ${f.id}`); ids.add(f.id);
    const k = `${f.level}:${f.slot}`; if (spots.has(k)) out.push(`two facilities in slot ${k}`); spots.add(k);
    if (!FACILITIES[f.type]) out.push(`unknown facility type ${f.type}`);
    if (f.level >= c.base.levels) out.push(`facility ${f.id} below the excavated levels`);
  }
  // containment: every held anomaly in a containment wing, one per wing
  const wings = new Map<string, string>();
  for (const s of c.scps) {
    if (s.status !== "contained" && s.status !== "breach") continue;
    const w = c.base.facilities.find(f => f.id === s.wingId);
    if (!w) { out.push(`${s.name} is held in a wing that doesn't exist (${s.wingId})`); continue; }
    if (!isContainment(w.type)) out.push(`${s.name} is held in a ${w.type}`);
    if (wings.has(w.id)) out.push(`${s.name} and ${wings.get(w.id)} share a wing`); wings.set(w.id, s.name);
  }
  // people: the dead do no duties
  for (const o of c.roster) if (!o.alive && o.busy && o.busy.kind !== "travel") out.push(`${o.name} is dead but busy (${o.busy.kind})`);
  // incidents: unique ids, the active one exists
  const inc = new Set<string>();
  for (const i of c.incidents) { if (inc.has(i.id)) out.push(`duplicate incident ${i.id}`); inc.add(i.id); }
  if (c.activeIncident && !inc.has(c.activeIncident)) out.push(`the active incident ${c.activeIncident} is gone`);
  // SCP-610: an outbreak in progress has exactly one incident on the map, at a severity from 1 to 5, and none without one
  // Phase 6 variant operations (quarantine line, evacuation, sample) run beside the outbreak's own incident
  const outbreaks = c.incidents.filter(i => i.kind === "outbreak" && !i.variant).length;
  if (!c.outbreak && c.incidents.some(i => i.kind === "outbreak" && i.variant)) out.push("an SCP-610 operation with no outbreak");
  // Phase 6: a unique anomaly is never both held and the subject of a first-contact incident, nor held twice
  for (const s of c.scps) { if (c.scps.filter(x => x.id === s.id).length > 1) out.push(`${s.name} is held twice`);
    if (c.incidents.some(i => i.first && i.scpId === s.id)) out.push(`${s.name} is held and reported as new`); }
  for (const m of c.missing ?? []) { const o = c.roster.find(x => x.id === m.opId); if (o?.alive && o.busy?.kind !== "missing") out.push(`${o.name} is missing but on duty`); }
  if (c.outbreak && (c.outbreak.severity < 1 || c.outbreak.severity > 5)) out.push(`SCP-610 severity ${c.outbreak.severity} out of range`);
  if (c.outbreak && outbreaks !== 1) out.push(`SCP-610 outbreak with ${outbreaks} outbreak incidents`);
  if (!c.outbreak && outbreaks) out.push(`${outbreaks} SCP-610 incident(s) with no outbreak`);
  return out;
}
