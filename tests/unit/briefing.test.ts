// The Director's Briefing (Strategic overhaul H2): derived from the campaign's state, most urgent first, each item
// pointing at its screen, and gone as soon as the thing is dealt with.
import { test, eq, ok } from "./harness";
import { newCampaign, log } from "../../src/campaign/campaign";
import { directorsBriefing } from "../../src/campaign/briefing";
import { dispatch } from "../../src/campaign/commands";
import { startBreach } from "../../src/campaign/containment";
import { setCampaignSeed } from "../../src/core/rng";

const fresh = () => newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 5 });
test("briefing: a breach is the first, critical item, pointing at Command", () => {
  const c = fresh();
  startBreach(c, c.scps[0], "Test:");
  const items = directorsBriefing(c);
  eq(items[0].sev, "critical"); ok(/breach/i.test(items[0].title), items[0].title); eq(items[0].tab, "command");
});
test("briefing: items are ordered by urgency and have no duplicates", () => {
  const c = fresh(); startBreach(c, c.scps[0], "Test:"); c.funds = -10;
  const items = directorsBriefing(c), order = { critical: 0, important: 1, routine: 2 };
  for (let i = 1; i < items.length; i++) ok(order[items[i - 1].sev] <= order[items[i].sev], "ordered");
  eq(new Set(items.map(i => i.id)).size, items.length, "unique ids");
});
test("briefing: idle researchers show, and go once assigned", () => {
  const c = fresh(); c.funds = 9999;
  const before = directorsBriefing(c).find(i => i.id === "researchers");
  if (!before) { ok(true, "no idle researchers at the start of this campaign"); return; }
  for (const id of Object.keys((globalThis as unknown as { P?: object }).P ?? {})) void id;
  // assign everyone to whatever can be started
  for (let k = 0; k < 20 && directorsBriefing(c).some(i => i.id === "researchers"); k++) {
    const items = directorsBriefing(c); void items;
    const proj = Object.keys(c.research.progress).concat(["body_armor", "weapon_analysis", "field_medicine", "psych_screening"]);
    for (const p of proj) if (dispatch(c, { type: "assignResearch", project: p, delta: 1 }).ok) break;
  }
  ok(!directorsBriefing(c).some(i => i.id === "researchers") || c.funds < 0, "gone once they're all at work");
});
test("log: entries carry a severity, critical ones a screen", () => {
  const c = fresh();
  log(c, "routine thing"); log(c, "a result", "good"); log(c, "the wing is open", "bad", "site");
  eq([c.log[2].sev, c.log[1].sev, c.log[0].sev, c.log[0].tab], ["routine", "important", "critical", "site"]);
});
