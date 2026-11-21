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

// Strategic overhaul M3: saves from before the overhaul (the v24 fixtures) load into the new rules, keep their
// invariants, play on for two months, and round-trip.
for (const f of fs.readdirSync(fixtures).filter(f => f.startsWith("save-"))) {
  test(`save: fixture ${f} plays on under the new rules`, async () => {
    const { advanceDay } = await import("../../src/campaign/campaign");
    const { checkInvariants } = await import("../../src/campaign/invariants");
    const { directorsBriefing } = await import("../../src/campaign/briefing");
    const { projection } = await import("../../src/campaign/forecast");
    const { setCampaignSeed } = await import("../../src/core/rng");
    const c = parseCampaign(fs.readFileSync(path.join(fixtures, f), "utf8"))!;
    ok(!!c, "loads");
    eq(checkInvariants(c), [], "consistent on load");
    directorsBriefing(c); projection(c, 90);
    setCampaignSeed(17);
    const errs: string[] = [];
    for (let i = 0; i < 60 && !c.over; i++) { advanceDay(c); for (const e of checkInvariants(c)) errs.push(`day ${c.day}: ${e}`); }
    eq(errs.slice(0, 3), [], "no invariant errors over 60 days");
    const again = parseCampaign(JSON.stringify(c))!;
    eq(JSON.stringify(again), JSON.stringify(c), "round-trips");
  });
}
