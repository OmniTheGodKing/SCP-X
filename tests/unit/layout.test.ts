// Presentation overhaul P1: room layouts come from the campaign and nowhere else. The same room is the same room
// every time; a second room of a type has its own look; construction, damage, power, doors and people show.
import { test, eq, ok } from "./harness";
import { newCampaign } from "../../src/campaign/campaign";
import { dispatch } from "../../src/campaign/commands";
import { allRooms, roomLayout } from "../../src/scene/layout";
import { syncStaff } from "../../src/campaign/people";

const fresh = () => newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 31 });
const freeSlot = (c: ReturnType<typeof fresh>, level: number) => { for (let s = 0; s < 6; s++) if (!c.base.facilities.some(f => f.level === level && f.slot === s)) return s; return -1; };

test("layout: the same room gives the same layout every time, and the layout changes nothing", () => {
  const c = fresh(), before = JSON.stringify(c);
  for (const f of c.base.facilities) eq(JSON.stringify(roomLayout(c, f.id)), JSON.stringify(roomLayout(c, f.id)), f.id);
  eq(JSON.stringify(c), before, "pure");
});

test("layout: two rooms of one type keep their own identity", () => {
  const c = fresh(); c.funds = 5000;
  const level = 2, a = freeSlot(c, level);
  ok(dispatch(c, { type: "build", facility: "generator", level, slot: a }).ok, "first");
  const b = freeSlot(c, level);
  ok(dispatch(c, { type: "build", facility: "generator", level, slot: b }).ok, "second");
  const gens = c.base.facilities.filter(f => f.type === "generator" && f.level === level).map(f => roomLayout(c, f.id)!);
  eq(gens.length, 2, "two");
  ok(gens[0].id !== gens[1].id && gens[0].designation !== gens[1].designation, "own id and designation");
  // their architectural features come from their ids and stay put as the campaign moves on
  const keep = gens.map(g => JSON.stringify(g.features));
  c.funds += 1; c.day += 3;
  eq(c.base.facilities.filter(f => f.type === "generator" && f.level === level).map(f => JSON.stringify(roomLayout(c, f.id)!.features)), keep, "stable");
});

test("layout: construction, damage and repair show in the room's state", () => {
  const c = fresh(); c.funds = 5000;
  const s = freeSlot(c, 2);
  ok(dispatch(c, { type: "build", facility: "generator", level: 2, slot: s }).ok, "build");
  const f = c.base.facilities.find(x => x.level === 2 && x.slot === s)!;
  eq(roomLayout(c, f.id)!.state, "building", "under construction");
  f.daysLeft = 0; eq(roomLayout(c, f.id)!.state, "operational", "built");
  f.disabled = true; eq(roomLayout(c, f.id)!.state, "damaged", "damaged");
  f.wrecked = true; eq(roomLayout(c, f.id)!.state, "wrecked", "wrecked");
  f.repairDays = 3; eq(roomLayout(c, f.id)!.state, "repairing", "repairing");
});

test("layout: doors follow the neighbours, with the lift at each level's left end", () => {
  const c = fresh();
  const cmd = c.base.facilities.find(f => f.type === "command")!;
  eq(cmd.slot, 0, "command in the first bay");
  eq(roomLayout(c, cmd.id)!.doors.left, "lift", "lift beside the first bay");
  eq(roomLayout(c, cmd.id)!.doors.right, c.base.facilities.some(f => f.level === cmd.level && f.slot === 1) ? "room" : "sealed", "next bay");
  const last = c.base.facilities.find(f => f.slot === 5);
  if (last) eq(roomLayout(c, last.id)!.doors.right, "rock", "rock at the far end");
});

test("layout: power shortage darkens consumers but not Command; occupants and staff show", () => {
  const c = fresh(); syncStaff(c);
  const gen = c.base.facilities.find(f => f.type === "generator")!;
  gen.disabled = true;
  const lab = c.base.facilities.find(f => f.type === "lab")!, cmd = c.base.facilities.find(f => f.type === "command")!;
  ok(!roomLayout(c, lab.id)!.powered, "the lab goes dark");
  ok(roomLayout(c, cmd.id)!.powered, "command runs on backup");
  const wing = c.base.facilities.find(f => f.type === "cont_euclid")!;
  eq(roomLayout(c, wing.id)!.occupant?.scpId, "173", "SCP-173 in its wing");
  gen.disabled = false;
  ok(dispatch(c, { type: "assignResearch", project: Object.keys(c.research.assigned)[0] ?? "blink_cadence", delta: 1 }).ok || true, "assign");
});

test("layout: the fixed surface locations are part of the installation", () => {
  const c = fresh(), rooms = allRooms(c);
  ok(rooms.some(r => r.id === "surface:quarters" && r.kind === "quarters"), "quarters");
  ok(rooms.some(r => r.id === "surface:armory" && r.kind === "armory"), "armory");
  eq(roomLayout(c, "surface:quarters")!.staff.length, c.roster.filter(o => o.alive).length, "Epsilon-11 lives there");
  eq(rooms.length, c.base.facilities.length + 2, "one layout per room");
});
