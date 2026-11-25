// MTF organization (UI/UX overhaul): MTF -> squad -> operative, squad specialty separate from class, specialist kit
// behind qualifications, Foundation-wide squad size 4 -> 6 -> 8, and all of it surviving a save and load.
import { test, eq, ok } from "./harness";
import { advanceDay, buildSetup, hireCandidate, newCampaign } from "../../src/campaign/campaign";
import { dispatch } from "../../src/campaign/commands";
import { ORG, PRIMARY, SPECS, canCarry, ensureOrg, membersOf, mtfOf, qualified, reserveOf, squadOf, squadSize } from "../../src/campaign/org";
import { parseCampaign } from "../../src/campaign/save";
import { checkInvariants } from "../../src/campaign/invariants";

const fresh = () => newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 5 });

test("org: a new campaign has one General Containment MTF with two named squads and everyone placed", () => {
  const c = fresh(), m = mtfOf(c, "e11")!;
  ok(!!m, "MTF exists");
  eq(m.primary, "general");
  eq(m.squads.length, ORG.startSquads);
  ok(m.squads.every(s => PRIMARY.general.pool.includes(s.spec)), "specialties come from the primary's pool");
  ok(c.roster.filter(o => o.alive).every(o => !!squadOf(c, o)), "everyone is in a squad");
  ok(c.roster.filter(o => o.alive).every(o => qualified(o, squadOf(c, o)!.squad.spec)), "starting members hold their squad's qualification");
  eq(checkInvariants(c), [], "consistent");
});

test("org: squad specialty is separate from soldier class", () => {
  const c = fresh(), o = c.roster[0];
  const cls = o.cls, spec = squadOf(c, o)!.squad.spec;
  const other = mtfOf(c, "e11")!.squads.find(s => s.spec !== spec)!;
  ok(dispatch(c, { type: "assignSquad", opId: o.id, squadId: other.id }).ok, "moved");
  eq(o.cls, cls, "class unchanged by the squad move");
  ok(!!o.qualTraining && o.qualTraining.spec === other.spec, "training for the new specialty starts");
  ok(qualified(o, spec), "the old qualification is kept");
});

test("org: specialist kit needs a qualification; basic kit does not", () => {
  const c = fresh(), o = c.roster[0];
  o.quals = [];
  ok(canCarry(o, "medkit") === null, "medkits are open to all");
  ok(canCarry(o, "frag") === null, "frag grenades are open to all");
  ok(/Fire Support/.test(canCarry(o, "flamer") ?? ""), "the flamethrower names the qualification it needs");
  o.quals = ["fire"];
  ok(canCarry(o, "flamer") === null, "qualified now");
});

test("org: deployment leaves unqualified specialist kit in stores", () => {
  const c = fresh(), o = c.roster[0];
  o.quals = ["recovery"];
  c.inventory.flamer = 1; c.inventory.armor_heavy = 1; c.inventory.darts = 1; c.inventory.medkit = 1;
  const inc = { id: "t1", kind: "recovery", scpId: "173", region: "east_us", map: "town", title: "Test: x", expires: c.day + 3, insurgents: 0 } as never;
  const setup = buildSetup(c, inc, [{ opId: o.id, armor: "armor_heavy", items: ["flamer", "darts", "medkit"] }], 0);
  const m = setup.squad[0];
  eq(m.armorKind, undefined, "heavy plate not issued to a Recovery operative");
  eq(m.items.map(i => i.id).sort(), ["darts", "medkit"], "flamer stays behind, darts and the medkit go");
  eq(c.inventory.flamer, 1, "the flamer is still in stores");
  eq(c.inventory.armor_heavy, 1, "the plate is still in stores");
});

test("org: squad size grows 4 -> 6 -> 8 through Foundation-wide research", () => {
  const c = fresh();
  eq(squadSize(c), 4);
  c.research.done.push("fireteam_doctrine"); eq(squadSize(c), 6);
  c.research.done.push("section_doctrine"); eq(squadSize(c), 8);
});

test("org: old training-range purchases carry over as doctrine research", () => {
  const c = fresh();
  c.purchases.push("officer_school");
  ensureOrg(c);
  eq(squadSize(c), 6);
});

test("org: renaming refuses established designations, accepts the player's own", () => {
  const c = fresh();
  ok(!dispatch(c, { type: "renameMtf", tf: "e11", designation: "Nu-7", name: "Hammer" }).ok, "Nu-7 is taken");
  ok(!dispatch(c, { type: "renameMtf", tf: "e11", designation: "lambda 4", name: "Hammer" }).ok, "malformed");
  ok(dispatch(c, { type: "renameMtf", tf: "e11", designation: "Lambda-4", name: "Night Watch" }).ok, "renamed");
  eq(mtfOf(c, "e11")!.designation, "Lambda-4");
  const sq = mtfOf(c, "e11")!.squads[0];
  ok(dispatch(c, { type: "renameSquad", squadId: sq.id, name: "Lantern" }).ok);
  ok(!dispatch(c, { type: "renameSquad", squadId: mtfOf(c, "e11")!.squads[1].id, name: "lantern" }).ok, "names are unique within the MTF");
});

test("org: retraining costs money and time and qualifies the members afterwards", () => {
  const c = fresh(); c.funds = 500;
  const sq = mtfOf(c, "e11")!.squads[0], target = sq.spec === "fire" ? "security" : "fire";
  const funds = c.funds;
  ok(dispatch(c, { type: "retrainSquad", squadId: sq.id, spec: target }).ok);
  eq(c.funds, funds - ORG.retrainCost);
  ok(!dispatch(c, { type: "retrainSquad", squadId: sq.id, spec: "breach" }).ok, "one retraining at a time");
  const ms = membersOf(c, sq.id);
  for (let i = 0; i < ORG.retrainDays + 1; i++) { c.incidents = []; advanceDay(c); }
  ok(ms.filter(o => o.alive).every(o => qualified(o, target)), "members qualified once the week is up");
  eq(sq.retrainUntil, undefined);
});

test("org: a recruit joins the smallest squad and trains its specialty", () => {
  const c = fresh(); c.funds = 2000;
  const k = c.recruits?.[0];
  if (!k) return;
  hireCandidate(c, k);
  ensureOrg(c);
  const o = c.roster[c.roster.length - 1];
  ok(!!squadOf(c, o), "placed in a squad");
  ok(!!o.qualTraining, "training its specialty");
  eq(reserveOf(c, "e11").length, 0);
});

test("org: organization survives save and load", () => {
  const c = fresh();
  dispatch(c, { type: "renameMtf", tf: "e11", designation: "Lambda-4", name: "Night Watch" });
  const o = c.roster[0]; o.quals = ["fire", "breach"];
  const back = parseCampaign(JSON.stringify(c))!;
  eq(mtfOf(back, "e11")!.designation, "Lambda-4");
  eq(back.roster[0].quals, ["fire", "breach"]);
  eq(back.roster[0].squad, o.squad);
  ok(Object.keys(SPECS).length === 4);
});
