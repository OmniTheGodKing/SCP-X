// Strategic overhaul D3: the forecast of scheduled money agrees with what the monthly settlement actually books, and
// shows the end of an emergency repayment and a projected debt.
import { test, eq, ok } from "./harness";
import { advanceDay, dayOfMonth, newCampaign } from "../../src/campaign/campaign";
import { obligations, projection, daysToSettlement } from "../../src/campaign/forecast";
import { setCampaignSeed } from "../../src/core/rng";

const fresh = () => newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 11 });

test("forecast: the next settlement is on the first of the month", () => {
  const c = fresh(), d = daysToSettlement(c.day);
  eq(dayOfMonth(c.day + d), 1, "first of the month");
  ok(d >= 1 && d <= 31, "within a month");
});

test("forecast: the projected settlement matches what the settlement books", () => {
  const c = fresh();
  c.day = c.day + daysToSettlement(c.day) - 1;     // the day before a settlement
  c.incidents = []; c.scheduled = [] as never;
  c.council.directives = [];                        // orders judged at the same deadline would move standing first
  const next = obligations(c, 1).filter(o => o.kind === "grant" || o.kind === "fronts" || o.kind === "upkeep");
  const predicted = next.reduce((a, o) => a + o.n, 0);
  advanceDay(c);
  const sum = (cats: string[]) => (c.ledger?.items ?? []).filter(i => i.day === c.day && cats.includes(i.cat)).reduce((a, i) => a + i.n, 0);
  const of = (k: string) => next.filter(o => o.kind === k).reduce((a, o) => a + o.n, 0);
  // standing can shift by a point during the same day, before the settlement
  ok(Math.abs(sum(["council"]) - of("grant")) <= 3, `the grant agrees within $3k (${sum(["council"])} vs ${of("grant")})`);
  eq(sum(["upkeep", "salaries", "alert"]), of("upkeep"), "upkeep and pay agree");
  // the fronts move with regional exposure, which can drift during the same day before the settlement
  ok(Math.abs(sum(["fronts"]) - of("fronts")) <= 3, `the fronts agree within $3k (${sum(["fronts"])} vs ${of("fronts")})`);
  ok(Math.abs(sum(["council", "fronts", "upkeep", "salaries", "alert"]) - predicted) <= 3, "the total agrees");
});

test("forecast: an emergency repayment comes off the next grants, then stops", () => {
  const c = fresh();
  c.council.repay = { n: 30, left: 2 };
  const grants = obligations(c, 100).filter(o => o.kind === "grant");
  ok(grants.length >= 3, "three settlements in 100 days");
  eq(grants[1].n - grants[0].n, 0, "two grants are reduced");
  eq(grants[2].n - grants[1].n, 30, "the third is back up");
  ok(/repayment/.test(grants[0].what), "the reduction is labelled");
});

test("forecast: a site paying out more than it gets in is projected into debt", () => {
  const c = fresh();
  c.funds = 50;
  c.council.repay = { n: 400, left: 3 };
  const p = projection(c, 100);
  ok(p.debtDay !== undefined, "a debt day is projected");
  ok(p.points.length >= 3, "a point per settlement");
  const healthy = fresh(); healthy.funds = 5000;
  eq(projection(healthy, 100).debtDay, undefined, "no debt with money in hand");
});

test("forecast: the forecast changes nothing", () => {
  const c = fresh(), before = JSON.stringify(c);
  obligations(c, 365); projection(c, 365);
  eq(JSON.stringify(c), before, "pure");
});

test("forecast: the Director's Briefing warns of a projected debt before it happens", async () => {
  const { directorsBriefing } = await import("../../src/campaign/briefing");
  const c = fresh();
  const { monthlyUpkeep } = await import("../../src/campaign/base");
  // an overstaffed site: twenty more operatives on the payroll than the grant can carry
  for (let i = 0; i < 20; i++) c.roster.push({ ...c.roster[0], id: `extra${i}`, name: `Extra ${i}` });
  c.council.standing = 0;                            // and a Council that has stopped paying for standing
  c.day = 20;                                        // three settlements inside the 90-day window
  c.funds = monthlyUpkeep(c) + 20;                   // above a month's upkeep, so the plainer warning doesn't fire
  const items = directorsBriefing(c).map(b => b.id);
  const { projection: pj } = await import("../../src/campaign/forecast");
  ok(items.includes("debt-ahead"), "warned: " + items.join(",") + JSON.stringify({ f: c.funds, u: monthlyUpkeep(c), p: pj(c, 60) }));
  const rich = fresh(); rich.funds = 9000;
  ok(!directorsBriefing(rich).some(b => b.id === "debt-ahead"), "no warning with money in hand");
});
