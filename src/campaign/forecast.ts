// Strategic overhaul D3: what Site-19 owes and is owed over the coming months, and where the balance is heading.
// Pure: it reads the campaign and changes nothing, so the finances screen, the Director's Briefing and the
// simulations can all ask it. It counts only money that is scheduled (the monthly settlement, contract pay, an
// inspection's result as things stand today); incidents, purchases and windfalls can't be known in advance.
import { dateOf, dayOfMonth, frontsFunding, type Campaign } from "./campaign";
import { grantParts } from "./council";
import { monthlyUpkeep } from "./base";
import { INSPECTION, inspectionChecks } from "./inspection";

export type ObligationKind = "grant" | "fronts" | "upkeep" | "contract" | "inspection";
export interface Obligation { day: number; kind: ObligationKind; what: string; n: number }

/** Days from `day` to the next first of the month (the monthly settlement), at least 1. */
export function daysToSettlement(day: number) {
  for (let d = 1; d <= 31; d++) if (dayOfMonth(day + d) === 1) return d;
  return 31;
}

/** Scheduled money in (positive) and out (negative) within `horizon` days, in date order. The monthly figures are
 *  today's: a change in standing, staff or facilities changes them. */
export function obligations(c: Campaign, horizon = 90): Obligation[] {
  const out: Obligation[] = [];
  const gp = grantParts(c), fronts = frontsFunding(c), upkeep = monthlyUpkeep(c);
  let repayLeft = c.council.repay?.left ?? 0;
  for (let day = c.day + daysToSettlement(c.day); day <= c.day + horizon; day = day + daysToSettlement(day)) {
    const month = dateOf(day).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
    // the repayment is already inside the grant figure while it lasts; once it ends the grant goes back up
    const grant = gp.total - (repayLeft > 0 ? 0 : gp.repay);
    out.push({ day, kind: "grant", what: `${month} Council grant${repayLeft > 0 ? `, less $${-gp.repay}k repayment` : ""}`, n: grant });
    if (fronts) out.push({ day, kind: "fronts", what: `${month} from the fronts`, n: fronts });
    out.push({ day, kind: "upkeep", what: `${month} upkeep and pay`, n: -upkeep });
    if (repayLeft > 0) repayLeft--;
  }
  for (const k of c.contracts?.active ?? []) if (k.due !== undefined && k.due <= c.day + horizon) out.push({ day: Math.max(k.due, c.day + 1), kind: "contract", what: `Contract pay: ${k.client}`, n: k.pay });
  if (c.inspectionDay !== undefined && c.inspectionDay <= c.day + horizon) {
    const checks = inspectionChecks(c), passed = checks.filter(k => k.ok).length, failed = checks.length - passed;
    out.push({ day: Math.max(c.inspectionDay, c.day + 1), kind: "inspection", what: `O5 inspection (as things stand: ${passed} of ${checks.length} checks)`, n: passed * INSPECTION.perCheck - (failed >= INSPECTION.failAt ? INSPECTION.penalty : 0) });
  }
  return out.sort((a, b) => a.day - b.day);
}

export interface Projection {
  /** The balance after each settlement in the horizon. */
  points: { day: number; funds: number }[];
  /** The first day the scheduled flows alone put Site-19 in debt, if they do. */
  debtDay?: number;
  /** Net change per month from the settlement alone. */
  monthlyNet: number;
}
export function projection(c: Campaign, horizon = 90): Projection {
  let funds = c.funds, debtDay: number | undefined = funds < 0 ? c.day : undefined;
  const points: Projection["points"] = [];
  const obs = obligations(c, horizon);
  for (let i = 0; i < obs.length; i++) {
    funds += obs[i].n;
    if (debtDay === undefined && funds < 0) debtDay = obs[i].day;
    if (obs[i].kind === "upkeep" || i === obs.length - 1) points.push({ day: obs[i].day, funds });
  }
  const gp = grantParts(c);
  return { points, debtDay, monthlyNet: gp.total + frontsFunding(c) - monthlyUpkeep(c) };
}
