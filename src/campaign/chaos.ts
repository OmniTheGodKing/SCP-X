import { fieldMap } from "../data/maps";
// The Chaos Insurgency as one organization: a single worldwide agenda that advances while its cells and operations go
// unchecked (like XCOM 2's Avatar Project), monthly operations Site-19 can find and disrupt (like dark events), a named
// field commander who keeps coming back, and the moles behind some "accidents". The other groups, the Global Occult
// Coalition and GRU Division "P", are separate and act on their own (see rivalTakes).
import { earn, spend } from "./ledger";
import { diffOf } from "./difficulty";
import { REGIONS, REGION_IDS, HOME, type RegionId } from "../data/regions";
import { cultureOfFamily, fullName } from "../data/names";
import { dateText, log, yearOf, type Campaign, type Incident } from "./campaign";
import { addStanding } from "./council";
import { chronicle } from "./history";
import { addExposure, isContacted, locateCellFor, travelDays } from "./world";
import { FACILITIES, operational } from "./base";
import { scpName, startBreach, wreckFacility } from "./containment";
import { startRaid } from "./security";

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export type PlanKind = "hijack" | "agitate" | "mole" | "infiltrate" | "raid" | "sabotage" | "arm";
export interface Plan {
  id: string; kind: PlanKind; region: RegionId; due: number;
  /** Known to Site-19 (the rest show as an unidentified operation until intelligence uncovers them). */
  known: boolean;
  /** A located cell is working on it: breaking that cell stops it. */
  cell?: string;
  /** Its mission was passed over or lost: it will happen, and Intel can no longer stop it. */
  locked?: boolean;
  /** What Site-19 believes about when it happens: a span of days that holds the real date somewhere inside it. */
  win?: [number, number];
}
export interface Commander { name: string; rank: string; seen: number; escapes: number; since: number; alive: boolean; fate?: string }
export interface Inquiry { id: string; day: number; scp: string; cause: "accident" | "anomalous" | "sabotage"; known: boolean }
export interface ChaosState {
  /** The Insurgency's global agenda, 0 to 100. */
  threat: number;
  history: { day: number; n: number; why: string }[];
  plans: Plan[];
  nextPlan: number;
  /** Plans now in force: their effects and when they lapse. */
  active: { kind: PlanKind; region: RegionId; until: number }[];
  commander?: Commander;
  /** When a new commander takes over after the last was killed or taken. */
  nextCommander?: number;
  /** Fallen and captured commanders, for their files. */
  past: Commander[];
  /** Insurgency agents inside Site-19, unknown until a breach inquiry or a staff event turns them up. */
  moles: number;
  inquiries: Inquiry[];
  /** Times the agenda has run to completion. */
  completed: number;
  /** Set while a sabotage charge is starting a breach, so the breach records its real cause. */
  pendingCause?: Inquiry["cause"];
}
export const newChaos = (): ChaosState => ({ threat: 10, history: [], plans: [], nextPlan: 1, active: [], past: [], moles: 0, inquiries: [], completed: 0 });

export const PLANS: Record<PlanKind, { name: string; goal: string; desc: (r: RegionId) => string }> = {
  hijack: { name: "Operation Highway", goal: "Steal anomalies in transport", desc: () => "Insurgent teams watch the roads: for a month, every convoy carrying an anomaly is ambushed, by a larger team." },
  agitate: { name: "Operation Open Door", goal: "Recruit D-Class", desc: () => "Agitators reach the D-Class block: morale drops by 25, and the block may riot." },
  mole: { name: "Operation Glass Eye", goal: "Plant staff moles", desc: () => "An agent is placed among Site-19's staff. Moles feed the Insurgency and sabotage the site until they are found." },
  infiltrate: { name: "Operation Paper Mill", goal: "Infiltrate a front", desc: r => `Agents get inside ${REGIONS[r].front} in ${REGIONS[r].name}: its funding is halved for two months and exposure there rises by 8.` },
  raid: { name: "Operation Iron Gate", goal: "Raid Site-19", desc: () => "A raid on Site-19's surface compound." },
  sabotage: { name: "Operation Ashfall", goal: "Sabotage", desc: () => "A charge in Site-19: a facility is wrecked, and if it's a containment wing, what's in it may get out." },
  arm: { name: "Operation Long Arm", goal: "Arm the cells", desc: () => "Snipers, demolition specialists and anomalous charms go out to the cells: for a month Insurgent teams are larger and better equipped." },
};
/** An operation's goal mid-sentence: lower-case first letter, names left alone ("raid Site-19"). */
export const goalText = (k: PlanKind) => PLANS[k].goal.charAt(0).toLowerCase() + PLANS[k].goal.slice(1);
export const THREAT_STEPS = [
  { at: 25, text: "Insurgent snipers and demolition specialists appear" },
  { at: 40, text: "Insurgent teams are one larger" },
  { at: 55, text: "raids on Site-19 come twice as often" },
  { at: 70, text: "Insurgent teams are two larger, and reinforcements come sooner" },
  { at: 100, text: "the Insurgency's agenda is complete" },
];

export function addThreat(c: Campaign, n: number, why: string) {
  if (n > 0) n = Math.max(1, Math.round(n * diffOf(c).agenda));
  const k = c.chaos, before = k.threat;
  k.threat = Math.max(0, Math.min(100, k.threat + n));
  if (k.threat === before) return;
  k.history.unshift({ day: c.day, n: k.threat - before, why });
  if (k.history.length > 30) k.history.pop();
  for (const s of THREAT_STEPS) if (before < s.at && k.threat >= s.at && s.at < 100) {
    log(c, `The Insurgency's agenda reaches ${s.at}: ${s.text}.`, "bad", "world");
    chronicle(c, "insurgency", `The Insurgency's agenda reached ${s.at}: ${s.text}.`);
  }
  if (k.threat >= 100) agendaComplete(c);
}
/** The agenda runs its course: a blow against the Foundation everywhere, then the Insurgency starts building again. */
function agendaComplete(c: Campaign) {
  const k = c.chaos;
  k.completed++;
  for (const r of REGION_IDS) addExposure(c, r, 10);
  addStanding(c, -20, "the Chaos Insurgency's agenda went unchecked");
  const targets = c.base.facilities.filter(f => operational(f) && f.type !== "command");
  if (targets.length) wreckFacility(c, pick(targets), "Insurgency sleeper agents detonated charges across Site-19.", true);
  k.threat = 60;
  chronicle(c, "insurgency", "The Chaos Insurgency's agenda ran to completion: a coordinated campaign of leaks and sabotage worldwide. Exposure rose everywhere and the O5 Council's patience is thin.");
  log(c, "The Chaos Insurgency's agenda is complete: stories leak in every region at once (+10 exposure everywhere), charges go off inside Site-19, and the O5 Council demands answers (−20 standing). The Insurgency regroups at 60.", "bad", "command");
}
export const planActive = (c: Campaign, kind: PlanKind, r?: RegionId) => c.chaos.active.some(a => a.kind === kind && a.until >= c.day && (!r || a.region === r));

/** Insurgent teams grow with the agenda and with an armed month. */
/** Which specialists Insurgent teams field: snipers and demolition men from 25, officers always, charms when armed. */
export function ciRoles(c: Campaign): { sniper: boolean; demo: boolean; officer: boolean; charm: boolean } {
  const t = c.chaos.threat, armed = planActive(c, "arm");
  return { sniper: t >= 25 || armed, demo: t >= 25 || armed, officer: yearOf(c.day) >= 1952 || t >= 20, charm: armed || (t >= 45 && Math.random() < 0.4) };
}
export const threatExtra = (c: Campaign) => (c.chaos.threat >= 70 ? 2 : c.chaos.threat >= 40 ? 1 : 0) + (planActive(c, "arm") ? 1 : 0);

// ---------- the commander ----------
const RANKS = ["Captain", "Major", "Colonel"];
const FAMILIES = ["Reyes", "Novak", "Petrov", "Haddad", "Whitlock", "Duarte", "Lindqvist", "Varga"];
function newCommander(c: Campaign): Commander {
  const fam = pick(FAMILIES);
  const cmd: Commander = { name: fullName(cultureOfFamily(fam), Math.random() < 0.8 ? "m" : "f", new Set()), rank: pick(RANKS), seen: 0, escapes: 0, since: c.day, alive: true };
  chronicle(c, "insurgency", `Intelligence names a new Insurgency field commander: ${cmd.rank} ${cmd.name}.`);
  log(c, `Intercepted orders name the Insurgency's new field commander: ${cmd.rank} ${cmd.name}. Expect to meet them.`, "key", "command");
  return cmd;
}
/** Whether the commander leads this mission: always for a cell working on a plan, sometimes otherwise. */
export function commanderJoins(c: Campaign, inc: Incident) {
  const k = c.chaos;
  if (!k.commander?.alive || !inc.insurgents) return false;
  if (inc.kind !== "strike" && inc.kind !== "raid" && inc.kind !== "retaliation" && inc.kind !== "escort") return false;
  return !!inc.plan || Math.random() < 0.3;
}
/** After a mission the commander was in: killed, taken, or away again. Returns a debrief line. */
export function commanderFate(c: Campaign, fate: "killed" | "captured" | "escaped"): string {
  const k = c.chaos, cmd = k.commander!;
  cmd.seen++;
  const who = `${cmd.rank} ${cmd.name}`;
  if (fate === "escaped") {
    cmd.escapes++;
    addThreat(c, 2, `${who} got away again`);
    chronicle(c, "insurgency", `${who} escaped Epsilon-11 (${cmd.escapes} time${cmd.escapes > 1 ? "s" : ""} now).`);
    return `${who} got away${cmd.escapes > 1 ? `, for the ${["", "", "second", "third", "fourth", "fifth"][cmd.escapes] ?? `${cmd.escapes}th`} time` : ""}.`;
  }
  cmd.alive = false; cmd.fate = fate === "killed" ? `killed ${dateText(c.day)}` : `captured ${dateText(c.day)}`;
  k.past.push(cmd); k.commander = undefined; k.nextCommander = c.day + rand(60, 120);
  addThreat(c, fate === "killed" ? -6 : -10, `${who} ${fate}`);
  addStanding(c, 4, `${who} ${fate}`);
  chronicle(c, "insurgency", `${who}, Insurgency field commander, was ${fate} by Epsilon-11 after ${cmd.seen} encounter${cmd.seen > 1 ? "s" : ""}.`);
  return `${who} was ${fate}. The Insurgency has lost its field commander${fate === "captured" ? ", and their interrogation will be worth a great deal" : ""}.`;
}

// ---------- plans ----------
function newPlans(c: Campaign) {
  const k = c.chaos;
  k.plans = k.plans.filter(p => p.due >= c.day);
  const open = REGION_IDS.filter(r => !c.regions[r].collapsed);
  const kinds = (Object.keys(PLANS) as PlanKind[]).filter(p => p !== "mole" || k.moles < 2).sort(() => Math.random() - 0.5).slice(0, 3);
  const made: Plan[] = kinds.map(kind => {
    const front = kind === "infiltrate" ? pick(REGION_IDS.filter(r => isContacted(c, r) && !c.regions[r].collapsed)) : undefined;
    const due = c.day + rand(14, 24);
    return { id: "p" + k.nextPlan++, kind, region: front ?? (kind === "raid" || kind === "sabotage" || kind === "mole" || kind === "agitate" ? HOME : pick(open)), due, known: true,
      win: [Math.max(c.day + 7, due - rand(3, 8)), due + rand(3, 8)] as [number, number] };
  });
  // like guerrilla operations: each operation's cell is located, and the three strikes arrive together. Answering one
  // closes the others, and the operations behind those go ahead.
  const group = "ops" + k.nextPlan, open0 = Math.min(...made.map(p => p.win![0]));
  for (const p of made) {
    const at = isContacted(c, p.region) ? p.region : HOME, inc = locateCellFor(c, at);
    inc.plan = p.id; inc.ciOp = true; inc.group = group; inc.map = fieldMap("strike");
    inc.expires = Math.max(open0, c.day + travelDays(c, at) + 3);
    inc.title = `${inc.title} (${PLANS[p.kind].name})`;
    p.cell = inc.id;
  }
  k.plans.push(...made);
  log(c, `Insurgency operations this month: ${made.map(p => `${PLANS[p.kind].name} (${goalText(p.kind)}, ${whenText(c, p)})`).join("; ")}. The cell running each one has been located: three strike missions, and Epsilon-11 can answer only one. The other two operations will go ahead.`, "bad", "command");
}
/** When an operation is expected, as Site-19 knows it: a window of days, never the date itself. */
export function whenText(c: Campaign, p: Plan) {
  const [lo, hi] = p.win ?? [p.due - 4, p.due + 4];
  const a = Math.max(0, lo - c.day), b = Math.max(1, hi - c.day);
  return a <= 0 ? `any day now, within ${b} day${b > 1 ? "s" : ""}` : `sometime in the next ${a} to ${b} days`;
}
export const DISRUPT_INTEL = 2, REVEAL_INTEL = 1;
export function canDisrupt(c: Campaign, p: Plan) { return p.locked ? "It's going ahead: the chance to stop it has passed." : !p.known ? "Its target isn't known yet." : c.intel < DISRUPT_INTEL ? `Needs ${DISRUPT_INTEL} Intel.` : null; }
export function disrupt(c: Campaign, id: string, how = "Intel spent through Foundation contacts") {
  const k = c.chaos, p = k.plans.find(x => x.id === id);
  if (!p) return;
  if (how.startsWith("Intel")) { if (canDisrupt(c, p)) return; c.intel -= DISRUPT_INTEL; }
  k.plans = k.plans.filter(x => x !== p);
  if (p.cell) c.incidents = c.incidents.filter(i => i.id !== p.cell || i.id === c.activeIncident);
  addThreat(c, -6, `${PLANS[p.kind].name} disrupted`);
  chronicle(c, "insurgency", `${PLANS[p.kind].name} (${goalText(p.kind)}) was disrupted: ${how}.`);
  log(c, `${PLANS[p.kind].name} is disrupted (${how}).`, "good");
}
/** An operation whose mission was passed over or lost: it will happen. */
export function lockPlan(c: Campaign, id: string, why: string) {
  const p = c.chaos.plans.find(x => x.id === id);
  if (!p || p.locked) return;
  p.locked = true; p.cell = undefined;
  log(c, `${PLANS[p.kind].name} goes ahead (${why}): ${goalText(p.kind)}, ${whenText(c, p)}.`, "bad");
}
export function canReveal(c: Campaign, p: Plan) { return p.known ? "Already identified." : c.intel < REVEAL_INTEL ? `Needs ${REVEAL_INTEL} Intel.` : null; }
export function reveal(c: Campaign, id: string, how = "intel") {
  const p = c.chaos.plans.find(x => x.id === id);
  if (!p || p.known) return;
  if (how === "intel") { if (canReveal(c, p)) return; c.intel -= REVEAL_INTEL; }
  p.known = true;
  log(c, `The unidentified Insurgency operation is ${PLANS[p.kind].name}: ${goalText(p.kind)}, ${whenText(c, p)}.`, "key");
}
/** A field scan turns up the hidden operation if it's aimed at that region. */
export function scanReveals(c: Campaign, r: RegionId) {
  const p = c.chaos.plans.find(x => !x.known && x.region === r);
  if (p) reveal(c, p.id, "scan");
  return !!p;
}

function execute(c: Campaign, p: Plan) {
  const k = c.chaos, name = PLANS[p.kind].name;
  k.plans = k.plans.filter(x => x !== p);
  if (p.cell) { const cell = c.incidents.find(i => i.id === p.cell && i.id !== c.activeIncident); if (cell) cell.plan = undefined; }
  addThreat(c, 3, `${name} carried out`);
  const what = (() => {
    switch (p.kind) {
      case "hijack": k.active.push({ kind: "hijack", region: p.region, until: c.day + 30 }); return "Every anomaly convoy for the next month will be ambushed.";
      case "arm": k.active.push({ kind: "arm", region: p.region, until: c.day + 30 }); return "Insurgent teams are larger and better armed for a month.";
      case "agitate": c.morale = Math.max(0, (c.morale ?? 60) - 25); return "Agitators got into the D-Class block: morale −25.";
      case "mole": k.moles++; return "Somebody at Site-19 now reports to the Insurgency.";
      case "infiltrate": k.active.push({ kind: "infiltrate", region: p.region, until: c.day + 60 }); addExposure(c, p.region, 8); return `${REGIONS[p.region].front} is compromised: half funding from ${REGIONS[p.region].name} for two months, +8 exposure there.`;
      case "raid": if (!c.incidents.some(i => i.kind === "raid")) startRaid(c); return "";
      case "sabotage": sabotage(c, "A charge planted by the Insurgency went off."); return "";
    }
  })();
  chronicle(c, "insurgency", `${name} (${goalText(p.kind)}) succeeded. ${what}`);
  if (what) log(c, `${name} succeeded. ${what}`, "bad", "command");
}
/** A facility wrecked deliberately; an occupied containment wing may let its anomaly out, and that breach looks
 *  like any other until someone looks into it. */
export function sabotage(c: Campaign, text: string) {
  const targets = c.base.facilities.filter(f => operational(f) && f.type !== "command");
  if (!targets.length) return;
  const wing = targets.find(f => FACILITIES[f.type].grade !== undefined && c.scps.some(s => s.wingId === f.id && s.status === "contained" && !s.id.match(/^(500|914|005)$/)));
  const f = wing && Math.random() < 0.5 ? wing : pick(targets);
  const occ = c.scps.find(s => s.wingId === f.id && s.status === "contained");
  if (occ && f === wing) { c.chaos.pendingCause = "sabotage"; startBreach(c, occ, "Containment alarm."); c.chaos.pendingCause = undefined; return; }
  wreckFacility(c, f, text, true);
}

// ---------- breach inquiries ----------
export const INQUIRY = { cost: 20, days: 0 };
/** Every breach leaves a question: accident, the anomaly itself, or somebody's doing. */
export function openInquiry(c: Campaign, inc: Incident) {
  const cause = inc.cause ?? "accident";
  c.chaos.inquiries.unshift({ id: "q" + inc.id, day: c.day, scp: inc.scpId, cause, known: false });
  if (c.chaos.inquiries.length > 12) c.chaos.inquiries.pop();
}
export function canInvestigateBreach(c: Campaign, q: Inquiry) { return q.known ? "Already settled." : c.funds < INQUIRY.cost ? `Needs $${INQUIRY.cost}k.` : null; }
export function investigateBreach(c: Campaign, id: string) {
  const q = c.chaos.inquiries.find(x => x.id === id);
  if (!q || canInvestigateBreach(c, q)) return;
  spend(c, INQUIRY.cost, "operations", `Inquiry into the ${scpName(q.scp)} breach`); q.known = true;
  const what = q.cause === "sabotage" ? `The ${scpName(q.scp)} breach of ${dateText(q.day)} was sabotage: the cell locks were tampered with.`
    : q.cause === "anomalous" ? `The ${scpName(q.scp)} breach of ${dateText(q.day)} was the anomaly's own doing: nobody could have stopped it from outside.`
    : `The ${scpName(q.scp)} breach of ${dateText(q.day)} was an accident: wear, a missed routine, or bad luck.`;
  if (q.cause === "sabotage" && c.chaos.moles > 0) {
    c.chaos.moles--;
    addThreat(c, -4, "a mole exposed by a breach inquiry");
    chronicle(c, "insurgency", `${what} The inquiry exposed the Insurgency mole responsible.`);
    log(c, `${what} The trail leads to a mole on the staff, who is arrested.`, "good");
  } else { chronicle(c, "breach", what); log(c, what, q.cause === "sabotage" ? "bad" : "key"); }
}

// ---------- rivals ----------
/** An anomaly left too long: the Global Occult Coalition destroys it, or GRU Division "P" takes it east.
 *  Returns what happened, or null if neither got there first. */
export function rivalTakes(c: Campaign, inc: Incident): string | null {
  if (yearOf(c.day) < 1952 && !inc.first) return null;
  const gru = (inc.region === "europe" || inc.region === "east_asia") && Math.random() < 0.4;
  const goc = !gru && Math.random() < 0.3;
  if (!gru && !goc) return null;
  const who = gru ? "GRU Division \"P\"" : "The Global Occult Coalition";
  const what = gru ? `${who} got to ${scpName(inc.scpId)} first and took it east. The Soviets have it now.` : `${who} reached ${scpName(inc.scpId)} before the Foundation and destroyed it.`;
  addStanding(c, -5, gru ? `lost ${scpName(inc.scpId)} to the Soviets` : `the GOC destroyed ${scpName(inc.scpId)}`);
  chronicle(c, "anomaly", what);
  return what;
}

// ---------- every day, every month ----------
export function tickChaos(c: Campaign) {
  const k = c.chaos;
  k.active = k.active.filter(a => a.until >= c.day);
  for (const p of k.plans.filter(x => c.day >= x.due)) execute(c, p);
  if (!k.commander && c.day >= (k.nextCommander ?? 40)) k.commander = newCommander(c);
  // a mole does damage now and then
  if (k.moles && Math.random() < 0.012 * k.moles) sabotage(c, "Something in the site failed in a way it shouldn't have.");
}
export function monthlyChaos(c: Campaign) {
  addThreat(c, 1 + c.chaos.moles, "a month of Insurgency recruitment");
  newPlans(c);
}
