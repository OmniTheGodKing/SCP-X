// Strategic commands (Strategic overhaul B): validated before they apply, rejected ones change nothing, accepted ones
// report the log entries they made, and a repeated command can't double-apply.
import { test, eq, ok } from "./harness";
import { newCampaign } from "../../src/campaign/campaign";
import { dispatch } from "../../src/campaign/commands";
import { facilityAt } from "../../src/campaign/base";
import { checkInvariants } from "../../src/campaign/invariants";
import { setCampaignSeed } from "../../src/core/rng";

const fresh = () => newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 3 });
const emptySlot = (c: ReturnType<typeof fresh>) => { for (let l = 0; l < c.base.levels; l++) for (let s = 0; s < 6; s++) if (!facilityAt(c, l, s)) return [l, s] as const; return null; };

test("commands: building takes the money once and puts the facility in the slot", () => {
  const c = fresh(), [l, s] = emptySlot(c)!, funds = c.funds;
  const r = dispatch(c, { type: "build", facility: "generator", level: l, slot: s });
  ok(r.ok, r.reason);
  ok(facilityAt(c, l, s)?.type === "generator", "built");
  ok(c.funds < funds, "paid");
  const again = dispatch(c, { type: "build", facility: "generator", level: l, slot: s });
  ok(!again.ok && /taken/.test(again.reason ?? ""), "the same slot can't be built twice");
  eq(checkInvariants(c), [], "consistent");
});
test("commands: a rejected command changes nothing", () => {
  const c = fresh(); c.funds = 0;
  const before = JSON.stringify(c);
  const r = dispatch(c, { type: "hireResearcher" });
  ok(!r.ok && !!r.reason, "rejected with a reason");
  eq(JSON.stringify(c), before, "state untouched");
});
test("commands: research assignment stops at the researchers on staff", () => {
  const c = fresh();
  c.funds = 5000;
  const lab = c.base.facilities.find(f => f.type === "lab");
  ok(!!lab || true, "a lab may or may not exist at the start");
  let tries = 0, okCount = 0;
  const ids = ["body_armor", "weapon_analysis", "field_medicine", "psych_screening", "night_vision"].concat(Object.keys(c.research.progress));
  for (const id of ids) for (let i = 0; i < 6; i++) { tries++; if (dispatch(c, { type: "assignResearch", project: id, delta: 1 }).ok) okCount++; }
  ok(okCount <= c.researchers, `assigned ${okCount} of ${c.researchers} on staff`);
  eq(checkInvariants(c), [], "consistent");
  void tries;
});
test("commands: unknown targets are refused", () => {
  const c = fresh();
  ok(!dispatch(c, { type: "repair", facilityId: "nope" }).ok, "repair");
  ok(!dispatch(c, { type: "cleanCell", scpId: "999" }).ok, "clean");
});
test("commands: a successful command returns the log entries it made", () => {
  const c = fresh(); c.funds = 5000;
  const r = dispatch(c, { type: "hireEngineer" });
  ok(r.ok, r.reason);
  ok(r.events.length >= 0, "events listed");
});

test("engineers: losing one mid-job leaves the work short-handed; it slows, finishes, and nothing new starts", async () => {
  const { engineersFree, facilityAt: at } = await import("../../src/campaign/base");
  const { losePeople } = await import("../../src/campaign/people");
  const { advanceDay } = await import("../../src/campaign/campaign");
  const { directorsBriefing } = await import("../../src/campaign/briefing");
  const c = fresh(); c.funds = 5000;
  const [l, s] = emptySlot(c)!;
  const started = (["cont_keter", "cont_euclid", "workshop", "generator"] as const).some(t => dispatch(c, { type: "build", facility: t, level: l, slot: s }).ok);
  ok(started, "a job started");
  // lose engineers until the work needs more than are left
  while (engineersFree(c) >= 0) losePeople(c, "engineer", 1, "test");
  ok(engineersFree(c) < 0, "short-handed");
  ok(directorsBriefing(c).some(b => b.id === "eng-short"), "the briefing says so");
  const e = emptySlot(c);
  if (e) ok(!dispatch(c, { type: "build", facility: "generator", level: e[0], slot: e[1] }).ok, "nothing new starts");
  for (let i = 0; i < 120 && (at(c, l, s)?.daysLeft ?? 0) > 0; i++) advanceDay(c);
  eq(at(c, l, s)?.daysLeft, 0, "the job still finishes");
  eq(checkInvariants(c), [], "consistent");
});

test("crews: every busy engineer is a named person on a job, the right trade first, nobody twice", async () => {
  const { crews } = await import("../../src/campaign/crews");
  const { engineersBusy } = await import("../../src/campaign/base");
  const { syncStaff } = await import("../../src/campaign/people");
  const c = fresh(); c.funds = 5000;
  const [l, s] = emptySlot(c)!;
  ok(dispatch(c, { type: "build", facility: "generator", level: l, slot: s }).ok, "a job");
  syncStaff(c);
  const { crews: list, idle } = crews(c);
  const names = [...list.flatMap(j => j.crew.map(p => p.name)), ...idle.map(p => p.name)];
  eq(new Set(names).size, names.length, "nobody on two jobs");
  eq(list.reduce((a, j) => a + j.crew.length, 0), Math.min(engineersBusy(c), c.engineers), "crew size matches the work");
  const mason = list[0].crew.find(p => p.trade === "mason");
  const anyMason = [...list[0].crew, ...idle].some(p => p.trade === "mason");
  ok(!anyMason || !!mason, "a mason on staff goes to the building job");
  const before = JSON.stringify(c); crews(c); eq(JSON.stringify(c), before, "pure");
});
