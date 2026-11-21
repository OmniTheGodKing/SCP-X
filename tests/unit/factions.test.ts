// Strategic overhaul D4: the Chaos Insurgency picks operations by Site-19's weaknesses and its own strength, and says
// why; the GOC goes where exposure is high.
import { test, eq, ok } from "./harness";
import { newCampaign, type Campaign } from "../../src/campaign/campaign";
import { planScores, monthlyChaos } from "../../src/campaign/chaos";
import { gocInterest } from "../../src/campaign/containment";
import { REGION_IDS } from "../../src/data/regions";

const fresh = () => newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 21 });
const scoreOf = (c: Campaign, k: string) => planScores(c).find(s => s.kind === k)?.score ?? -99;

test("insurgency: a raid is worth more with Epsilon-11 away and few guards posted", () => {
  const c = fresh(); c.chaos.threat = 40;
  const before = scoreOf(c, "raid");
  c.outbound = { incId: "x", region: "europe", depart: c.day, arrive: c.day + 2, setup: {} as never, tf: "e11" };
  c.guards = [];
  ok(scoreOf(c, "raid") >= before + 3, `raid ${before} -> ${scoreOf(c, "raid")}`);
  eq(planScores(c)[0].kind, "raid", "the raid is the top choice");
  ok(/Epsilon-11 is away/.test(planScores(c)[0].why), "and the reason says so");
});

test("insurgency: low D-Class morale draws agitators", () => {
  const c = fresh(), before = scoreOf(c, "agitate");
  c.morale = 30; c.dclass = 12;
  ok(scoreOf(c, "agitate") > before, "agitation is worth more");
  ok(/morale is low/.test(planScores(c).find(s => s.kind === "agitate")!.why), "reason given");
});

test("insurgency: no third mole; infiltration goes for the richest front", () => {
  const c = fresh(); c.chaos.moles = 2;
  ok(!planScores(c).some(s => s.kind === "mole"), "no more moles once two are planted");
  for (const r of REGION_IDS) c.regions[r].contacted = true as never;
  const inf = planScores(c).find(s => s.kind === "infiltrate");
  if (inf) ok(!!inf.region && /richest front/.test(inf.why), "targets the richest front");
});

test("insurgency: monthly operations carry the reason they were chosen", () => {
  const c = fresh(); c.chaos.threat = 35;
  monthlyChaos(c);
  ok(c.chaos.plans.length === 3, "three operations");
  ok(c.chaos.plans.every(p => !!p.why), "each has a reason");
  eq(new Set(c.chaos.plans.map(p => p.kind)).size, 3, "three different kinds");
});

test("GOC: interest rises with a region's exposure, within 10% to 40%", () => {
  const c = fresh(), r = REGION_IDS[0];
  c.regions[r].exposure = 0; const low = gocInterest(c, r);
  c.regions[r].exposure = 50; const mid = gocInterest(c, r);
  c.regions[r].exposure = 100; const high = gocInterest(c, r);
  eq(low, 0.1, "baseline"); ok(mid > low && high > mid - 1e-9, "rises"); eq(high, 0.4, "capped");
});
