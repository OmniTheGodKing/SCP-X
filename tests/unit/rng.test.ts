import { test, eq, ok } from "./harness";
import { beginMission, endMission, rnd, setCampaignSeed, campaignState, forceRng } from "../../src/core/rng";
import * as fs from "fs";
import * as path from "path";

test("rng: the same seed gives the same rolls", () => {
  beginMission(42); const a = Array.from({ length: 20 }, rnd);
  beginMission(42); const b = Array.from({ length: 20 }, rnd);
  endMission();
  eq(a, b, "two runs from seed 42");
  ok(a.every(x => x >= 0 && x < 1), "rolls in [0, 1)");
});
test("rng: a mission's rolls don't disturb the campaign stream", () => {
  setCampaignSeed(7); rnd(); const after1 = campaignState();
  setCampaignSeed(7); rnd(); beginMission(99); for (let i = 0; i < 50; i++) rnd(); endMission();
  eq(campaignState(), after1, "campaign state");
});
test("rng: forcing returns the forced value until released", () => {
  forceRng(0.25); eq([rnd(), rnd()], [0.25, 0.25]); forceRng(null);
  ok(rnd() !== 0.25, "released");
});
test("rng: gameplay code never calls Math.random directly", () => {
  const root = path.resolve(__dirname, "../../src");
  const bad: string[] = [];
  for (const dir of ["game", "campaign", "data", "core"]) for (const f of fs.readdirSync(path.join(root, dir))) {
    if (!f.endsWith(".ts") || f === "rng.ts") continue;
    const src = fs.readFileSync(path.join(root, dir, f), "utf8");
    if (src.includes("Math.random")) bad.push(`${dir}/${f}`);
  }
  eq(bad, [], "files using Math.random");
});
