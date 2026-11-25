// Mobile Task Force organization (Master Design Context section 4): Foundation site → MTF → squad → operative.
//
// Three separate systems, kept separate on purpose:
//   - the MTF's PRIMARY specialization decides which squad specialties it may field;
//   - each SQUAD has a player-chosen name and one specialty from that pool, which decides the specialist kit its
//     members are trained for;
//   - each OPERATIVE keeps their own class, perks and progression (data/classes.ts), plus the qualifications they
//     have actually learned (learned qualifications persist when they change squad).
// Basic Foundation gear stays open to everyone; only specialist kit needs a qualification. Deployed squad size is
// Foundation-wide research (4 → 6 → 8), so an MTF formed later benefits at once.
import { has, type ItemId } from "./research";
import { spend } from "./ledger";
import { log, type Campaign, type Operative } from "./campaign";
import { tfOf, type TaskForce } from "./taskforces";

export type PrimarySpec = "general";
export type SquadSpec = "breach" | "security" | "recovery" | "fire";

export interface PrimaryDef { name: string; desc: string; pool: SquadSpec[] }
export const PRIMARY: Record<PrimarySpec, PrimaryDef> = {
  general: {
    name: "General Containment",
    desc: "Recontainment, site defence and recovery. The mandatory first specialization of any new task force.",
    pool: ["breach", "security", "recovery", "fire"],
  },
};

export interface SquadSpecDef {
  name: string;
  /** What the squad does that others don't do as well. */
  role: string;
  /** Specialist kit its members are qualified to carry (anyone may carry everything else). */
  kit: ItemId[];
  /** What it gives up. */
  tradeoff: string;
}
export const SPECS: Record<SquadSpec, SquadSpecDef> = {
  breach: {
    name: "Breach Response", role: "Coordinated entry and room clearing: stun and CS grenades, and heavy plate for the point man.",
    kit: ["flashbang", "csgas", "armor_heavy"], tradeoff: "No heavy weapons, restraints or hazardous-recovery suits.",
  },
  security: {
    name: "Containment Security", role: "Holding ground and holding subjects: restraint kits, seismic sensors and lead-lined suits.",
    kit: ["restraints", "tracker", "leadsuit"], tradeoff: "No grenades beyond the basic issue and no heavy weapons.",
  },
  recovery: {
    name: "Recovery & Extraction", role: "Getting people and anomalies out: amnestic dart pistols and sealed containment suits.",
    kit: ["darts", "contsuit"], tradeoff: "Light on firepower: no heavy weapons or heavy plate.",
  },
  fire: {
    name: "Fire Support", role: "Sustained fire and lane control: the M2 flamethrower, launchers and the heavy plate that carries them.",
    kit: ["flamer", "bazooka", "law", "armor_heavy"], tradeoff: "Slow and loud; no specialist entry or recovery kit.",
  },
};
/** Every specialist item and the specialties that qualify for it. */
export const ITEM_QUAL: Partial<Record<ItemId, SquadSpec[]>> = {};
for (const [s, d] of Object.entries(SPECS) as [SquadSpec, SquadSpecDef][]) for (const i of d.kit) (ITEM_QUAL[i] ??= []).push(s);

export interface Squad { id: string; name: string; spec: SquadSpec; /** Retraining to a new specialty until this day. */ retrainUntil?: number }
export interface Mtf { tf: TaskForce; designation: string; name: string; primary: PrimarySpec; squads: Squad[]; founded: number }
export interface OrgState { mtfs: Mtf[]; nextSquad: number }

export const ORG = { startSquads: 2, maxSquads: 4, squadCost: 100, retrainCost: 40, retrainDays: 7, qualDays: 5 };
/** Designations held by other Foundation task forces (the player can't take them). */
export const CANON_DESIGNATIONS = ["Alpha-1", "Alpha-9", "Beta-7", "Epsilon-6", "Epsilon-11", "Eta-10", "Nu-7", "Omega-7", "Tau-5", "Lambda-5", "Mu-4", "Omicron-Rho", "Kappa-10", "Gamma-5", "Zeta-9", "Pi-1", "Xi-8"];
const DEFAULT: Record<TaskForce, { designation: string; name: string; squads: [string, SquadSpec][] }> = {
  e11: { designation: "Epsilon-11", name: "Nine-Tailed Fox", squads: [["Fox One", "breach"], ["Fox Two", "recovery"]] },
  eta10: { designation: "Eta-10", name: "See No Evil", squads: [["Blind One", "security"], ["Blind Two", "recovery"]] },
};

// ---------- deployed squad size: Foundation-wide doctrine research ----------
export const squadSize = (c: Campaign) => 4 + (has(c, "fireteam_doctrine") ? 2 : 0) + (has(c, "section_doctrine") ? 2 : 0);

// ---------- lookups ----------
export const mtfOf = (c: Campaign, tf: TaskForce): Mtf | undefined => c.org?.mtfs.find(m => m.tf === tf);
export const mtfLabel = (c: Campaign, tf: TaskForce) => { const m = mtfOf(c, tf); return m ? `${m.designation} "${m.name}"` : tf; };
export const squadById = (c: Campaign, id: string | undefined) => { if (!id) return undefined; for (const m of c.org?.mtfs ?? []) { const s = m.squads.find(q => q.id === id); if (s) return { mtf: m, squad: s }; } return undefined; };
export const squadOf = (c: Campaign, o: Operative) => squadById(c, o.squad);
export const membersOf = (c: Campaign, squadId: string) => c.roster.filter(o => o.alive && o.squad === squadId);
export const reserveOf = (c: Campaign, tf: TaskForce) => c.roster.filter(o => o.alive && tfOf(o) === tf && !squadById(c, o.squad));
export const qualified = (o: Operative, s: SquadSpec) => (o.quals ?? []).includes(s);

/** Why this operative can't carry this item, or null if they can. Basic kit is open to everyone. */
export function canCarry(o: Operative, item: ItemId): string | null {
  const need = ITEM_QUAL[item];
  if (!need || need.some(s => qualified(o, s))) return null;
  return `Needs the ${need.map(s => SPECS[s].name).join(" or ")} qualification.`;
}

// ---------- setup and migration (idempotent) ----------
function newSquad(c: Campaign, name: string, spec: SquadSpec): Squad { const org = c.org!; return { id: `sq${org.nextSquad++}`, name, spec }; }
function formMtf(c: Campaign, tf: TaskForce) {
  const d = DEFAULT[tf], m: Mtf = { tf, designation: d.designation, name: d.name, primary: "general", squads: [], founded: c.day };
  for (const [n, s] of d.squads) m.squads.push(newSquad(c, n, s));
  c.org!.mtfs.push(m);
  // the people already serving are split across the two squads and qualified in their squad's specialty
  const ops = c.roster.filter(o => o.alive && tfOf(o) === tf && !squadById(c, o.squad));
  ops.forEach((o, i) => { const s = m.squads[i % m.squads.length]; o.squad = s.id; o.quals = [...new Set([...(o.quals ?? []), s.spec])]; });
}
/** Creates the organization for older saves and new task forces; puts new recruits into the smallest squad. */
export function ensureOrg(c: Campaign) {
  c.org ??= { mtfs: [], nextSquad: 1 };
  // training-range purchases that used to set squad size become the Foundation-wide doctrine projects
  if (c.purchases.includes("officer_school") && !has(c, "fireteam_doctrine")) c.research.done.push("fireteam_doctrine");
  if (c.purchases.includes("command_staff") && !has(c, "section_doctrine")) c.research.done.push("section_doctrine");
  if (!mtfOf(c, "e11")) formMtf(c, "e11");
  if (c.tf.eta10 && !mtfOf(c, "eta10")) formMtf(c, "eta10");
  for (const o of c.roster) if (o.alive && o.squad === undefined) {
    const m = mtfOf(c, tfOf(o)); if (!m || !m.squads.length) continue;
    const s = [...m.squads].sort((a, b) => membersOf(c, a.id).length - membersOf(c, b.id).length)[0];
    joinSquad(c, o, s.id);
  }
}

// ---------- daily ----------
export function tickOrg(c: Campaign) {
  ensureOrg(c);
  for (const o of c.roster) if (o.alive && o.qualTraining && o.qualTraining.until <= c.day) {
    const s = o.qualTraining.spec;
    o.quals = [...new Set([...(o.quals ?? []), s])]; o.qualTraining = undefined;
    log(c, `${o.call} ${o.name} is now qualified for ${SPECS[s].name}.`, "good");
  }
  for (const m of c.org!.mtfs) for (const s of m.squads) if (s.retrainUntil && s.retrainUntil <= c.day) {
    s.retrainUntil = undefined; log(c, `${s.name} (${m.designation}) finished retraining as ${SPECS[s.spec].name}.`, "good", "personnel");
  }
}

// ---------- player actions (validated; dispatched through commands.ts) ----------
const DESIG = /^[A-Z][a-z]{1,9}-\d{1,3}$/;
export function canRenameMtf(c: Campaign, tf: TaskForce, designation: string, name: string): string | null {
  const m = mtfOf(c, tf); if (!m) return "No such task force.";
  const d = designation.trim(), n = name.trim();
  if (!DESIG.test(d)) return "A designation is a Greek letter and a number, like Lambda-4.";
  if (d !== m.designation && CANON_DESIGNATIONS.includes(d)) return `${d} is already an established Foundation task force.`;
  if (c.org!.mtfs.some(x => x !== m && x.designation === d)) return `${d} is already in use here.`;
  if (n.length < 2 || n.length > 32) return "The name needs 2 to 32 characters.";
  return null;
}
export function renameMtf(c: Campaign, tf: TaskForce, designation: string, name: string) {
  if (canRenameMtf(c, tf, designation, name)) return;
  const m = mtfOf(c, tf)!; m.designation = designation.trim(); m.name = name.trim();
  log(c, `The task force is now designated ${m.designation} "${m.name}".`);
}
export function canRenameSquad(c: Campaign, id: string, name: string): string | null {
  const f = squadById(c, id); if (!f) return "No such squad.";
  const n = name.trim();
  if (n.length < 2 || n.length > 24) return "A squad name needs 2 to 24 characters.";
  if (f.mtf.squads.some(s => s.id !== id && s.name.toLowerCase() === n.toLowerCase())) return "Another squad already has that name.";
  return null;
}
export function renameSquad(c: Campaign, id: string, name: string) { if (!canRenameSquad(c, id, name)) squadById(c, id)!.squad.name = name.trim(); }

export function canRetrainSquad(c: Campaign, id: string, spec: SquadSpec): string | null {
  const f = squadById(c, id); if (!f) return "No such squad.";
  if (!PRIMARY[f.mtf.primary].pool.includes(spec)) return `${PRIMARY[f.mtf.primary].name} task forces can't field ${SPECS[spec]?.name ?? "that"}.`;
  if (f.squad.spec === spec) return "The squad already has that specialty.";
  if (f.squad.retrainUntil) return "The squad is already retraining.";
  if (c.funds < ORG.retrainCost) return `Needs $${ORG.retrainCost}k.`;
  return null;
}
/** A new specialty costs money and a week; members keep what they learned and train the new qualification. */
export function retrainSquad(c: Campaign, id: string, spec: SquadSpec) {
  if (canRetrainSquad(c, id, spec)) return;
  const { mtf, squad } = squadById(c, id)!;
  spend(c, ORG.retrainCost, "staff", `${squad.name} retraining`);
  squad.spec = spec; squad.retrainUntil = c.day + ORG.retrainDays;
  for (const o of membersOf(c, id)) if (!qualified(o, spec)) o.qualTraining = { spec, until: c.day + ORG.retrainDays };
  log(c, `${squad.name} (${mtf.designation}) begins retraining as ${SPECS[spec].name}: ${ORG.retrainDays} days.`);
}

export function canJoinSquad(c: Campaign, o: Operative, squadId: string): string | null {
  if (!o.alive) return "They are dead.";
  if (squadId === "") return o.squad === "" ? "Already in the reserve." : null;
  const f = squadById(c, squadId); if (!f) return "No such squad.";
  if (f.mtf.tf !== tfOf(o)) return `They serve with ${mtfLabel(c, tfOf(o))}, not ${f.mtf.designation}.`;
  if (o.squad === squadId) return "Already in that squad.";
  return null;
}
/** Into a squad (squadId) or the reserve (""). Joining a squad whose specialty they lack starts their training. */
export function joinSquad(c: Campaign, o: Operative, squadId: string) {
  if (canJoinSquad(c, o, squadId)) return;
  o.squad = squadId;
  const s = squadById(c, squadId)?.squad;
  if (s && !qualified(o, s.spec)) o.qualTraining = { spec: s.spec, until: c.day + ORG.qualDays };
  else if (o.qualTraining && (!s || o.qualTraining.spec !== s.spec)) o.qualTraining = undefined;
}

export function canFormSquad(c: Campaign, tf: TaskForce): string | null {
  const m = mtfOf(c, tf); if (!m) return "No such task force.";
  if (m.squads.length >= ORG.maxSquads) return `${m.designation} fields ${ORG.maxSquads} squads at most for now.`;
  if (c.funds < ORG.squadCost) return `Needs $${ORG.squadCost}k.`;
  return null;
}
export function formSquad(c: Campaign, tf: TaskForce, name: string, spec: SquadSpec) {
  if (canFormSquad(c, tf)) return;
  const m = mtfOf(c, tf)!;
  const n = name.trim().length >= 2 ? name.trim().slice(0, 24) : `Squad ${m.squads.length + 1}`;
  spend(c, ORG.squadCost, "staff", `${m.designation}: new squad`);
  m.squads.push(newSquad(c, n, PRIMARY[m.primary].pool.includes(spec) ? spec : PRIMARY[m.primary].pool[0]));
  log(c, `${m.designation} forms a new squad, ${n}.`);
}

// ---------- readiness: what a deployment can and can't handle ----------
export interface ReadinessNote { level: "ok" | "warn" | "danger"; text: string }
