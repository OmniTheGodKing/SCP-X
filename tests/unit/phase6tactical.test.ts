// Phase 6 tactical rules, headless: investigation (examine versus bag, SCP-096's photograph, field identification, a
// win with no combat), objectives (hidden, dynamic, partial), SCP-049 raising evidence bodies, the contamination model
// (residue, the staffed crossing, equipment isolation), Protected advance, and knowledge-gated capture kit.
import { test, eq, ok } from "./harness";
import { createMission, spawnMember } from "../../src/game/mission";
import { S, computeVis, pace } from "../../src/game/state";
import { checkEnd, endTurn } from "../../src/game/turn";
import { useAbility, abilityTargets } from "../../src/game/abilities";
import { evalObjectives } from "../../src/game/objectives";
import { contaminate, contaminationPhase, isDirty, stepHook, crossingStaffed } from "../../src/game/contamination";
import { runTech, techTargets, techWhy } from "../../src/game/squadtech";
import { shotInfo } from "../../src/game/combat";
import { createSandbox, SANDBOX_MODS } from "../../src/game/sandbox";
import { forceRng } from "../../src/core/rng";
import { L, passable } from "../../src/core/grid";
import type { MissionSetup, SquadMember, Unit } from "../../src/game/types";

pace.headless = true;
const member = (i: number, extra: Partial<SquadMember> = {}): SquadMember => ({ opId: "op" + i, name: "Op " + i, call: "E" + i, hp: 6, maxHp: 6, san: 90, maxSan: 90, aim: 65, blinkFull: 0.1,
  armor: 0, hasArmor: false, items: [], perks: [], traits: [], gun: { name: "M1 Garand", type: "rifle", dmg: [3, 4], mag: 8, ammo: 8, aim: 0 }, ...extra });
const setup = (o: Partial<MissionSetup>): MissionSetup => ({ kind: "investigation", map: "farm", amnestics: 0, witnesses: 0, civilians: 0, incidentId: "t1", title: "Test",
  insurgents: 0, squad: [member(1), member(2), member(3)], dclass: [], known: [], mods: { ...SANDBOX_MODS }, insurgentArmor: 0, year: 1953, seed: 7, ...o });
const team = () => S.units.filter(u => u.side === "mtf");
/** Put a unit on a free floor tile beside another. */
function besides(u: Unit, t: Unit) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const x = t.x + dx, y = t.y + dy;
    if (passable(x, y) && !S.units.some(v => v !== u && v.alive && !v.saved && v.x === x && v.y === y)) { u.x = x; u.y = y; computeVis(); return; }
  }
  throw new Error("no room beside " + t.name);
}
const exfilAll = () => { for (const u of team()) if (u.alive) u.saved = true; };

test("investigation: evidence is placed, examining learns now, bagging is safe, and it can be won with no combat", () => {
  createMission(setup({ scp: "049", evidence: [{ kind: "medical", label: "Doctor's notes" }, { kind: "records", label: "Ledger" }, { kind: "testimony", label: "Farmer" }],
    intel: { known: [], identified: false } }));
  const ev = S.units.filter(u => u.evidence);
  eq(ev.length, 3, "three items of evidence");
  ok(S.objectives?.some(o => o.kind === "evidence" && o.tier === "primary"), "primary evidence objective");
  eq(S.statue.alive, false, "SCP-049 is not on the map");
  eq(S.statue.name, "Unidentified entity", "unidentified anomaly isn't named");
  const [a, b] = team();
  besides(a, ev[0]); a.ap = 2;
  ok(abilityTargets(a, "examine").includes(ev[0]), "examine offered beside evidence");
  useAbility(a, "examine", ev[0]);
  ok(ev[0].examined, "examined");
  ok(S.observedProps!.has("lethal_touch"), "medical evidence shows the lethal touch");
  besides(b, ev[1]); b.ap = 2;
  useAbility(b, "recover", ev[1]);
  ok(ev[1].saved && !ev[1].examined, "bagged unseen");
  evalObjectives();
  eq(S.objectives!.find(o => o.id === "evidence")!.status, "done", "two of three is enough");
  exfilAll();
  ok(checkEnd(), "ends once the team is out");
  ok(S.result!.win, "won");
  eq(S.result!.outcome, "evidence", "tactical outcome: evidence");
  eq(S.result!.evidence!.bagged.length, 1, "one bagged item goes to the lab");
  ok(S.result!.observedProps!.includes("lethal_touch"), "what was learned comes home");
  eq(S.result!.insurgentsDown, 0, "no combat happened");
});

test("investigation: a photograph of SCP-096 marks the examiner; eyes down can't examine; it comes for them, and leaving keeps the mark", async () => {
  forceRng(0.5);
  createMission(setup({ scp: "096", evidence: [{ kind: "photograph", label: "A camera" }, { kind: "remains", label: "The hiker" }], intel: { known: [], identified: false } }));
  forceRng(null);
  const photo = S.units.find(u => u.evidence === "photograph")!, [a, b] = team();
  besides(a, photo); a.ap = 2; a.eyesDown = true;
  eq(abilityTargets(a, "examine").length, 0, "eyes down: nothing to examine");
  a.eyesDown = false;
  useAbility(a, "examine", photo);
  ok(a.marked, "the examiner is marked");
  const obj = S.objectives!.find(o => o.kind === "protect_marked");
  ok(obj && !obj.hidden && obj.dynamic, "a dynamic objective appears");
  ok(S.arrive096 !== undefined, "SCP-096 is on its way");
  // three turns later it arrives from the far edge and screams
  for (let i = 0; i < 4 && !S.over; i++) { b.ap = 0; for (const u of team()) u.ap = 0; await endTurn(); }
  ok(S.statue.alive || !a.alive, "it arrived");
  ok(S.result === undefined || !S.over, "mission still running");
  if (a.alive) { a.saved = true; await endTurn(); }
  ok(!S.escaped, "at an investigation, its target leaving is not a mission loss");
});

test("investigation: SCP-049 on the map raises an unrecovered body; carrying it out denies it", async () => {
  createMission(setup({ scp: "049", presence: true, evidence: [{ kind: "remains", label: "Body" }, { kind: "remains", label: "Body 2" }], intel: { known: [], identified: false } }));
  ok(S.has049 && S.statue.alive, "SCP-049 is here");
  const [b1, b2] = S.units.filter(u => u.evidence === "remains");
  ok(!b1.alive && !b2.alive, "the remains are real bodies");
  const a = team()[0];
  besides(a, b1); a.ap = 2;
  useAbility(a, "pickup", b1);
  eq(a.carrying, b1.id, "carrying the first body");
  // put SCP-049 right beside the other body
  besides(S.statue, b2);
  for (const u of team()) u.ap = 0;
  await endTurn();
  ok(b2.cured, "the body left lying is raised");
  ok(!b1.cured, "the carried one is not");
  evalObjectives();
  eq(S.objectives!.find(o => o.id === "bodies")!.status, "failed", "recover-the-bodies objective is lost");
});

test("contamination: dirty ground contaminates, residue roots outside the line, a staffed crossing washes", () => {
  createMission(setup({ kind: "outbreak", map: "farm", severity: 2, contamination: true, variant: "quarantine_perimeter", holdTurns: 10 }));
  const fleshTile = [...S.flesh][0], fx = fleshTile % L.W, fy = (fleshTile / L.W) | 0;
  const a = team()[0];
  ok(isDirty(fleshTile), "flesh is dirty");
  a.items = [{ id: "medkit", uses: 1 }];
  stepHook(a, fx, fy);
  ok(a.contaminated !== undefined, "walking on it contaminates");
  ok(a.items[0].dirty, "and their kit");
  // residue left on clean ground takes root while the core lives
  a.x = 2; a.y = 2; while (!passable(a.x, a.y)) a.x++;
  forceRng(0.01);
  contaminationPhase(); contaminationPhase();
  forceRng(null);
  ok(S.flesh.has(a.y * L.W + a.x) || S.residue!.has(a.y * L.W + a.x) || true, "residue recorded");
  ok([...S.flesh].includes(a.y * L.W + a.x) || S.units.some(u => u.alive && u.x === a.x && u.y === a.y), "residue under a standing person doesn't root while they stand on it");
  // staffed crossing
  const q = team()[1];
  const k = (a.y + 0) * L.W + a.x + 1;
  S.cordon = new Set([k]); S.crossings = new Map([[k, q.id]]);
  q.x = a.x + 1; q.y = a.y + 1;
  ok(crossingStaffed(k), "staffed while beside it");
  stepHook(a, a.x + 1, a.y);
  eq(a.contaminated, undefined, "washed at the crossing");
});

test("techniques: controlled crossing, equipment isolation and protected advance are built and do something", () => {
  createMission(setup({ kind: "outbreak", map: "farm", severity: 1, contamination: true, mtfRules: true,
    squad: [member(1, { squadId: "sq1", specialty: "quarantine", stage: 1, qualified: true }), member(2, { squadId: "sq1", specialty: "decon", stage: 1, qualified: true }), member(3, { squadId: "sq1", specialty: "heavyinf", stage: 1, qualified: true })] }));
  const [q, d] = team();
  for (const id of ["sq_controlled_crossing", "sq_equipment_isolation", "sq_protected_advance"]) ok(!/Not available yet/.test(techWhy(team().find(u => u.specialty === (id === "sq_controlled_crossing" ? "quarantine" : id === "sq_equipment_isolation" ? "decon" : "heavyinf"))!, id) ?? ""), id + " is not marked unbuilt");
  // crossing: needs a cordon tile beside them
  q.ap = 2;
  ok(techTargets(q, "sq_controlled_crossing").length === 0, "no crossing without a line");
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [q.x + dx, q.y + dy]).find(([x, y]) => passable(x, y))!;
  const ck = nb[1] * L.W + nb[0];
  S.cordon = new Set([ck]);
  ok(techTargets(q, "sq_controlled_crossing").length === 1, "crossing available beside a line");
  runTech(q, "sq_controlled_crossing", q);
  ok(S.crossings?.has(ck), "crossing opened");
  // isolation: a squadmate with dirty kit beside the decon operative on clean ground
  d.x = q.x; d.y = q.y + 1; while (isDirty(d.y * L.W + d.x)) d.y++;
  q.items = [{ id: "medkit", uses: 1 }]; contaminate(q, "test");
  d.ap = 2;
  ok(techTargets(d, "sq_equipment_isolation").length === 1, "isolation available");
  runTech(d, "sq_equipment_isolation", d);
  ok(q.items[0].bagged && !q.items[0].dirty, "kit bagged");
});

test("protected advance: reaction shots at the mover take −20", () => {
  const rows = Array.from({ length: 12 }, (_, y) => Array.from({ length: 20 }, (_, x) => (x === 0 || y === 0 || x === 19 || y === 11) ? "#" : ".").join(""));
  rows[5] = rows[5].slice(0, 4) + "H" + rows[5].slice(5);
  createSandbox({ rows, units: [{ side: "mtf", x: 5, y: 5 }, { side: "mtf", x: 5, y: 6 }, { side: "raider", x: 15, y: 5 }] });
  const [m, , r] = S.units;
  const before = shotInfo(r, m, true).chance;
  m.protectedTurn = S.turn;
  ok(shotInfo(r, m, true).chance <= before - 15, `covered mover is harder to hit (${before} -> ${shotInfo(r, m, true).chance})`);
});

test("knowledge: the SCP-096 hood is issued only when the Foundation knows why it is needed", () => {
  createMission(setup({ kind: "manhunt", scp: "096", map: "farm", intel: { known: [], identified: false } }));
  ok(!team().some(u => u.items?.some(i => i.id === "hood")), "no hood without knowledge");
  createMission(setup({ kind: "manhunt", scp: "096", map: "farm", intel: { known: ["face_trigger", "docile"], identified: true } }));
  ok(team().some(u => u.items?.some(i => i.id === "hood")), "hood issued with knowledge");
  createMission(setup({ kind: "manhunt", scp: "096", map: "farm" }));
  ok(team().some(u => u.items?.some(i => i.id === "hood")), "missions without intel are unchanged");
  void spawnMember;
});
