// Strategic simulation (Strategic overhaul A4/K3): every management strategy runs 30, 90 and 180 days headless without
// crashing or breaking an invariant. The numbers themselves are printed for the pacing report, not asserted, except
// for the failure modes the overhaul must rule out (runaway money, a balanced Site-19 collapsing early).
import { test, eq, ok } from "./harness";
import { STRATEGIES, simulate, summarize, type SimResult } from "../../src/sim/campaignSim";

const results: SimResult[] = [];
for (const days of [30, 90, 180]) for (const s of STRATEGIES) {
  test(`sim: ${s}, ${days} days, runs clean`, () => {
    const r = simulate(s, days, 7);
    results.push(r);
    eq(r.invariantErrors.slice(0, 3), [], "invariants");
    ok(r.daily.length === days || !!r.over, "ran its days (or ended)");
  });
}
test("sim: a balanced Site-19 survives 180 days and its money stays bounded", () => {
  const r = results.find(x => x.strategy === "balanced" && x.days === 180)!;
  ok(!r.over, `not over: ${r.over}`);
  ok(r.totals.maxFunds < 20000, `no runaway money (max ${r.totals.maxFunds})`);
});
test("sim: report", () => { console.log(summarize(results)); });

// Strategic overhaul D: the simulations start from a fixed campaign seed (newCampaign used to reseed from outside the
// game, so every run began differently). A spread of seeds across every strategy keeps the invariants honest; a
// 1,050-run sweep is how the short-handed engineers case was found.
test("sim: invariants hold across 15 scattered seeds for every strategy (120 days)", () => {
  const bad: string[] = [];
  for (const st of STRATEGIES) for (let i = 1; i <= 15; i++) {
    const seed = (i * 2654435761) >>> 0, r = simulate(st, 120, seed);
    if (r.invariantErrors.length) bad.push(`${st}/${seed}: ${r.invariantErrors[0]}`);
  }
  eq(bad, [], "no invariant errors");
});
test("sim: the same seed gives the same campaign", () => {
  const a = simulate("balanced", 60, 99), b = simulate("balanced", 60, 99);
  eq(JSON.stringify(a.daily), JSON.stringify(b.daily), "identical runs");
});
