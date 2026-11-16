// Strategic overhaul D2: experiments on every anomaly Site-19 holds, apart from ordinary research. Run on the
// anomaly's own cell; a finished one speeds that anomaly's research branch; one at a time across the site.
import { test, eq, ok } from "./harness";
import { advanceDay, newCampaign } from "../../src/campaign/campaign";
import { TESTS, STUDY_BONUS, canTest, startTest, studyBoost, testBranch, testKey, testScp, type TestId } from "../../src/campaign/research";
import { captureNow, cellWork } from "../../src/campaign/containment";
import { checkInvariants } from "../../src/campaign/invariants";
import { forceRng } from "../../src/core/rng";

function withAnomaly(id: "049" | "682") {
  const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 5 });
  c.funds = 5000; c.dclass = 10; c.researchers = 4;
  // a finished Keter-grade wing and a generator to run it, in the first free slots
  const free: [number, number][] = [];
  for (let l = 0; l < c.base.levels; l++) for (let s = 0; s < 6; s++) if (!c.base.facilities.some(f => f.level === l && f.slot === s)) free.push([l, s]);
  for (const type of ["generator", "cont_keter"] as const) { const [level, slot] = free.shift()!; c.base.facilities.push({ id: "f" + c.base.nextId++, type, level, slot, daysLeft: 0, disabled: false, repairDays: 0 }); }
  captureNow(c, id);
  return c;
}

test("experiments: every anomaly with a research branch has at least one", () => {
  const ids = new Set((Object.keys(TESTS) as TestId[]).map(testScp));
  for (const id of ["173", "049", "106", "096", "012", "939", "035", "682"]) ok(ids.has(id as never), `SCP-${id} has an experiment`);
});

test("experiments: a test only runs on its own anomaly, and only while it is in its cell", () => {
  const c = withAnomaly("049");
  const s049 = c.scps.find(x => x.id === "049")!, s173 = c.scps.find(x => x.id === "173")!;
  ok(!!s049 && s049.status === "contained", "SCP-049 is held");
  ok(/SCP-049/.test(canTest(c, s173, "interview049") ?? ""), "not on SCP-173");
  eq(canTest(c, s049, "interview049"), null, "allowed on SCP-049");
  s049.status = "breach";
  ok(/isn't in its cell/.test(canTest(c, s049, "interview049") ?? ""), "not while it is out");
});

test("experiments: a finished experiment speeds its anomaly's branch and nothing else", () => {
  const c = withAnomaly("049"), s = c.scps.find(x => x.id === "049")!;
  eq(studyBoost(c, "SCP-049"), 1, "no boost before");
  startTest(c, s, "interview049", []);
  ok(c.research.testing?.id === "interview049", "under way");
  ok(!!canTest(c, c.scps.find(x => x.id === "173")!, "endurance"), "one experiment at a time");
  forceRng(0.99);      // the cell work goes cleanly
  try { for (let i = 0; i < 20 && !c.research.tests.includes("interview049"); i++) advanceDay(c); }
  catch (e) { throw new Error((e as Error).stack?.split("\n").slice(0, 4).join(" | ")); }
  finally { forceRng(null); }
  ok(c.research.tests.includes("interview049"), "finished");
  eq(c.research.testing, undefined, "the slot is free again");
  eq(c.research.assigned[testKey("interview049")], undefined, "its researcher is released");
  eq(studyBoost(c, testBranch("interview049")), 1 + STUDY_BONUS, "SCP-049 research is faster");
  eq(studyBoost(c, "SCP-173"), 1, "SCP-173 research is not");
  eq(checkInvariants(c), [], "consistent");
});

test("experiments: a failed cell-work roll names the anomaly's own danger, not SCP-173's blink", () => {
  const c = withAnomaly("682"), s = c.scps.find(x => x.id === "682")!;
  ok(!!s && s.status === "contained", "SCP-682 is held in the Keter wing");
  // the cell work on the last day, with every roll going wrong (the daily breach roll would end it sooner otherwise)
  const d = TESTS.tissue682, dclass = c.dclass;
  forceRng(0.0);
  try { cellWork(c, s, [], `the ${d.name.toLowerCase()}`, d.risk, d.dclass, d.breach, d.fail); } finally { forceRng(null); }
  eq(c.dclass, dclass - 1, "a D-Class died");
  const text = c.log.map(l => l.text).join(" ");
  ok(/acid early/.test(text), "the SCP-682 failure line: " + c.log.slice(0, 8).map(l => l.text).join(" / "));
  ok(!/blinked at the same moment/.test(text), "not the SCP-173 line");
});

test("recovery: a loose anomaly recovered with no free wing goes to Site-17, not into thin air", async () => {
  const { resolveScp } = await import("../../src/campaign/containment");
  const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 8 });
  c.scps.push({ id: "049", name: "SCP-049", title: "Plague Doctor", cls: "Euclid", status: "loose", wingId: "", maintenance: 0, lastCleaned: c.day } as never);
  const s = c.scps.find(x => x.id === "049")!;
  resolveScp(c, { id: "r1", kind: "recovery", scpId: "049", region: "europe", title: "Incident 9: SCP-049 recovery" } as never, true);
  // the starting site has one Euclid wing, and SCP-173 is in it
  eq(s.status, "away", "held elsewhere");
  ok((s.returnDay ?? 0) > c.day, "due back");
  eq(checkInvariants(c), [], "consistent");
  // with a free wing it goes straight in
  const free: [number, number][] = [];
  for (let l = 0; l < c.base.levels; l++) for (let k = 0; k < 6; k++) if (!c.base.facilities.some(f => f.level === l && f.slot === k)) free.push([l, k]);
  const [level, slot] = free[0];
  c.base.facilities.push({ id: "fw", type: "cont_euclid", level, slot, daysLeft: 0, disabled: false, repairDays: 0 });
  s.status = "loose";
  resolveScp(c, { id: "r2", kind: "recovery", scpId: "049", region: "europe", title: "Incident 10: SCP-049 recovery" } as never, true);
  eq([s.status, s.wingId], ["contained", "fw"], "into the free wing");
});
