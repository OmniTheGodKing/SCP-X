// Site-19's books: every change to funds goes through earn() or spend() with a category and a reason, so the
// finances card can show where the money came from and went, this month and last.
import type { Campaign } from "./campaign";

export type IncomeCat = "council" | "fronts" | "contracts" | "grants" | "missions" | "salvage" | "sales" | "emergency" | "income";
export type SpendCat = "upkeep" | "salaries" | "alert" | "construction" | "research" | "workshop" | "hiring" | "operations" | "staff" | "losses" | "spent";
export type LedgerCat = IncomeCat | SpendCat;
export const CAT_NAMES: Record<LedgerCat, string> = {
  council: "O5 Council grant", fronts: "Fronts", contracts: "Council contracts", grants: "Research grants", missions: "Mission rewards",
  salvage: "Salvage", sales: "Sales", emergency: "Emergency funding", income: "Other income",
  upkeep: "Facility upkeep", salaries: "Salaries", alert: "Alert level", construction: "Construction and repairs", research: "Research",
  workshop: "Workshop", hiring: "Recruitment and hiring", operations: "Field operations", staff: "Staff care and training", losses: "Losses", spent: "Other spending",
};
export const INCOME_CATS: IncomeCat[] = ["council", "fronts", "contracts", "grants", "missions", "salvage", "sales", "emergency", "income"];
export const SPEND_CATS: SpendCat[] = ["upkeep", "salaries", "alert", "construction", "research", "workshop", "hiring", "operations", "staff", "losses", "spent"];

export interface LedgerItem { day: number; n: number; cat: LedgerCat; what: string }
export interface Ledger {
  /** Months since the campaign began, for the totals below. */
  month: number;
  cur: Partial<Record<LedgerCat, number>>;
  prev: Partial<Record<LedgerCat, number>>;
  /** The latest entries, newest first. */
  items: LedgerItem[];
}
export const newLedger = (): Ledger => ({ month: 0, cur: {}, prev: {}, items: [] });
const KEEP = 40;

/** Which campaign month a day falls in (0 for the first). */
export const monthIndex = (day: number) => {
  const d = new Date(Date.UTC(1951, 5, 1) + (day - 1) * 86400000);
  return (d.getUTCFullYear() - 1951) * 12 + d.getUTCMonth() - 5;
};

function book(c: Campaign, n: number, cat: LedgerCat, what: string) {
  const l = (c.ledger ??= newLedger()), m = monthIndex(c.day);
  if (m !== l.month) { l.prev = m === l.month + 1 ? l.cur : {}; l.cur = {}; l.month = m; }
  l.cur[cat] = (l.cur[cat] ?? 0) + n;
  l.items.unshift({ day: c.day, n, cat, what });
  if (l.items.length > KEEP) l.items.length = KEEP;
}
/** Money in. */
export function earn(c: Campaign, n: number, cat: IncomeCat, what: string) {
  if (!n) return;
  c.funds += n; book(c, n, cat, what);
}
/** Money out (n is positive). */
export function spend(c: Campaign, n: number, cat: SpendCat, what: string) {
  if (!n) return;
  c.funds -= n; book(c, -n, cat, what);
}
