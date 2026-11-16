// Notifications and the Director's Briefing (Strategic overhaul H). Two things live here:
//
// 1. Severity for site log entries: routine (ordinary progress), important (results, orders, staffing, intelligence)
//    and critical (breaches, attacks, failures, urgent deadlines; these pause the clock and pop up).
// 2. The Director's Briefing: a decision queue worked out from the campaign's state each time it is shown, so it
//    can't go stale or list something twice. Each item says what is wrong, why it matters, and where to go.
//    Nothing is decided for the player.
import { type Campaign, type HubTab, deployable, pendingBreach, promotionDue } from "./campaign";
import { FACILITIES, engineersFree, isContainment, monthlyUpkeep, powerShort } from "./base";
import { PROJECTS, has, projectVisible, researchersFree, projectLock } from "./research";
import { routineOverdue } from "./containment";
import { AUDIT_BELOW, directiveText } from "./council";
import { projection } from "./forecast";
import { STAFF_EVENTS } from "./staff";
import { dateText } from "./campaign";

export type Severity = "routine" | "important" | "critical";
/** How a log entry's kind maps to a severity (when the entry didn't say). */
export function severityOf(kind: string, paused: boolean): Severity {
  if (paused) return "critical";
  return kind === "bad" || kind === "good" || kind === "key" ? "important" : "routine";
}

export type BriefTab = HubTab | "history";
export interface BriefItem { id: string; sev: Severity; title: string; detail: string; tab: BriefTab; focus?: string }

const SEV_ORDER: Record<Severity, number> = { critical: 0, important: 1, routine: 2 };

/** Everything waiting on the Site Director, most urgent first. */
export function directorsBriefing(c: Campaign): BriefItem[] {
  const out: BriefItem[] = [];
  const add = (i: BriefItem) => out.push(i);

  // ---- critical ----
  const b = pendingBreach(c);
  if (b) add({ id: `respond-${b.id}`, sev: "critical", title: b.kind === "breach" ? `Containment breach: ${b.title.split(": ")[1] ?? b.title}` : b.kind === "raid" ? "Site-19 is under attack" : b.kind === "riot" ? "Riot in the D-Class block" : "Convoy under attack",
    detail: "Time is stopped until it's answered: send Epsilon-11 or leave it to Site Security.", tab: "command", focus: b.id });
  for (const i of c.incidents) {
    if (i === b || i.dispatch || c.outbound?.incId === i.id) continue;
    const left = i.expires - c.day;
    if (left <= 1 && left >= 0) add({ id: `expiring-${i.id}`, sev: "critical", title: `Expires ${left ? "tomorrow" : "today"}: ${i.title.split(": ")[1] ?? i.title}`, detail: "Left unanswered, it counts against Site-19's record and the region's exposure.", tab: "world", focus: i.id });
  }
  if (powerShort(c)) add({ id: "power", sev: "critical", title: "Power shortage", detail: "Wings without power breach twice as often and may fail outright. Build or repair a generator.", tab: "site" });
  for (const s of c.scps) {
    const w = c.base.facilities.find(f => f.id === s.wingId);
    if (s.status === "contained" && w && w.disabled && w.repairDays <= 0) add({ id: `wing-${w.id}`, sev: "critical", title: `${s.name}'s wing is damaged`, detail: "A damaged containment wing is far likelier to breach. Repair it or move the anomaly.", tab: "site", focus: w.id });
  }
  if (c.funds < 0) add({ id: "debt", sev: "critical", title: "Site-19 is in debt", detail: "Nothing can be paid for until the funds are positive. Cut upkeep or ask the Council for an appropriation.", tab: "command" });

  // ---- important ----
  const idle = researchersFree(c);
  const startable = Object.keys(PROJECTS).filter(id => !has(c, id) && projectVisible(c, id) && !projectLock(c, id));
  if (idle > 0 && startable.length) add({ id: "researchers", sev: "important", title: `${idle} researcher${idle > 1 ? "s" : ""} unassigned`, detail: `${startable.length} project${startable.length > 1 ? "s" : ""} can be started.`, tab: "research" });
  const damaged = c.base.facilities.filter(f => f.disabled && f.repairDays <= 0 && !isContainment(f.type));
  if (damaged.length) add({ id: "repairs", sev: "important", title: `${damaged.length} facilit${damaged.length > 1 ? "ies" : "y"} out of action`, detail: damaged.map(f => FACILITIES[f.type].name).join(", ") + ". Engineers can repair them.", tab: "site", focus: damaged[0].id });
  const free = engineersFree(c);
  if (free < 0) add({ id: "eng-short", sev: "important", title: `Engineers short-handed by ${-free}`, detail: "Work under way needs more engineers than Site-19 has, so it goes more slowly. Hire engineers, or let a job finish before starting another.", tab: "site" });
  if (free >= 2 && !damaged.length && !c.base.facilities.some(f => f.daysLeft > 0) && c.base.excavation <= 0) add({ id: "engineers", sev: "routine", title: `${free} engineers free`, detail: "Nothing is being built or repaired. Build, upgrade, or order equipment in the workshop.", tab: "site" });
  const promo = c.roster.filter(promotionDue);
  if (promo.length) add({ id: "promotions", sev: "important", title: `${promo.length} promotion${promo.length > 1 ? "s" : ""} to confirm`, detail: promo.map(o => `${o.call} ${o.name}`).join(", ") + ": choose their new ability.", tab: "personnel", focus: promo[0].id });
  const fit = c.roster.filter(o => deployable(c, o)).length;
  if (fit < 4) add({ id: "squad", sev: "important", title: `Only ${fit} operative${fit === 1 ? "" : "s"} fit to deploy`, detail: "Recruit, or let the wounded recover before the next incident.", tab: "personnel" });
  const overdue = c.scps.filter(s => routineOverdue(c, s));
  if (overdue.length) add({ id: "routines", sev: "important", title: `Overdue containment work: ${overdue.map(s => s.name).join(", ")}`, detail: "Every day a routine is overdue raises the breach risk.", tab: "site" });
  for (const d of c.council.directives.filter(d => !d.state && d.due - c.day <= 10)) add({ id: `directive-${d.id}`, sev: d.due - c.day <= 3 ? "critical" : "important", title: `Council order due ${dateText(d.due)}`, detail: directiveText(c, d), tab: "command" });
  for (const o of c.council.offers) add({ id: `offer-${o.id}`, sev: "important", title: `Council ${o.kind === "order" ? "transfer order" : "offer"} from ${o.from}`, detail: `Decide by ${dateText(o.until)}.`, tab: "command" });
  if (c.staffEvent) add({ id: "staff", sev: "important", title: STAFF_EVENTS[c.staffEvent.id].title, detail: `A staff matter to decide by ${dateText(c.staffEvent.until)}.`, tab: "command" });
  if (c.council.standing < AUDIT_BELOW) add({ id: "audit", sev: "important", title: "The Council is reviewing Site-19", detail: `Standing ${c.council.standing}: below ${AUDIT_BELOW} an audit follows. Win incidents, meet orders, keep exposure down.`, tab: "command" });
  const offer = c.research.offer;
  if (offer && !c.research.paid.includes(offer.id)) add({ id: "breakthrough", sev: "important", title: `Breakthrough on offer: ${PROJECTS[offer.id].name}`, detail: `Available until ${dateText(offer.until)}.`, tab: "research" });
  const open = c.incidents.filter(i => i !== b && !i.dispatch && c.outbound?.incId !== i.id && i.expires - c.day > 1);
  if (open.length) add({ id: "incidents", sev: "routine", title: `${open.length} incident${open.length > 1 ? "s" : ""} open`, detail: open.slice(0, 3).map(i => `${i.title.split(": ")[1] ?? i.title} (${i.expires - c.day} days)`).join("; "), tab: "world" });
  if (c.funds >= 0 && c.funds < monthlyUpkeep(c)) add({ id: "funds", sev: "important", title: "Funds below a month's upkeep", detail: `$${c.funds}k in hand against $${monthlyUpkeep(c)}k a month going out.`, tab: "command" });
  else if (c.funds >= 0) {
    // Strategic overhaul D3: the scheduled money alone puts Site-19 in debt within 90 days
    const pr = projection(c, 90);   // the same window as the Finances panel
    if (pr.debtDay !== undefined) add({ id: "debt-ahead", sev: "important", title: `Debt projected by ${dateText(pr.debtDay)}`, detail: `Upkeep and pay outrun the grant and the fronts by $${-pr.monthlyNet}k a month. The Finances panel has the schedule.`, tab: "command" });
  }

  return out.sort((a, z) => SEV_ORDER[a.sev] - SEV_ORDER[z.sev]);
}
