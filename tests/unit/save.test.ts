import { test, eq, ok } from "./harness";
import { parseCampaign } from "../../src/campaign/save";
import { newCampaign } from "../../src/campaign/campaign";
import * as fs from "fs";
import * as path from "path";

const fixtures = path.resolve(__dirname, "../fixtures");
for (const f of fs.readdirSync(fixtures).filter(f => f.startsWith("save-"))) {
  test(`save: fixture ${f} loads`, () => {
    const raw = fs.readFileSync(path.join(fixtures, f), "utf8");
    const before = JSON.parse(raw);
    const c = parseCampaign(raw);
    ok(c, "parsed");
    eq(c!.version, 24, "version");
    eq(c!.roster.length, before.roster.length, "roster size");
    eq(c!.day, before.day, "day");
    ok(typeof c!.rng === "number", "has a random stream state");
    // and it survives another round trip unchanged
    const again = parseCampaign(JSON.stringify(c));
    eq(JSON.stringify(again), JSON.stringify(c), "round trip");
  });
}
test("save: a new campaign round-trips", () => {
  const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false });
  const back = parseCampaign(JSON.stringify(c));
  ok(back, "parsed");
  eq(back!.roster.map(o => o.name), c.roster.map(o => o.name), "roster");
});
test("save: junk is rejected, not crashed on", () => {
  eq(parseCampaign("{not json"), null); eq(parseCampaign(JSON.stringify({ version: 24 })), null);
});
