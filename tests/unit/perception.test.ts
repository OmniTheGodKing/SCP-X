// Perception (Tactical overhaul T3): light, distance, weather, movement and smoke decide whether a unit in the line of
// sight is unseen, detected (a shape) or identified.
import { test, eq, ok } from "./harness";
import { Level, type MapDef } from "../../src/core/grid";
import { setMission } from "../../src/game/state";
import { perceive, lightAt, UNSEEN, DETECTED, IDENTIFIED, setHaze } from "../../src/game/perception";
import type { MissionState, Unit } from "../../src/game/types";

function hall(len: number, area: string) {
  const rows = ["#".repeat(len + 2), "#" + ".".repeat(len) + "#", "#".repeat(len + 2)];
  const def: MapDef = { name: "t", rows, area: () => area, squadSpawns: [[1, 1]], scpRooms: [], insurgentRooms: [], strayRooms: [] };
  return new Level(def);
}
function mission(opts: { night?: boolean; weather?: string; kind?: string; powerOn?: boolean } = {}) {
  const S = { setup: { kind: opts.kind ?? "strike", night: !!opts.night, weather: opts.weather ?? "clear", mods: {} }, turn: 3, flares: [], fires: new Map(), units: [], powerOn: opts.powerOn, smoke: [] } as unknown as MissionState;
  setMission(S);
  return S;
}
const person = (x: number, y = 1, extra: Partial<Unit> = {}) => ({ id: "p" + x, side: "mtf", name: "P", x, y, hp: 5, maxHp: 5, san: 50, ap: 2, perks: [], alive: true, ...extra } as unknown as Unit);

test("perception: a lit corridor at night is seen end to end", () => {
  hall(42, "main corridor"); mission({ night: true });
  const o = person(1);
  ok(lightAt(41, 1) > 0.8, "the corridor is lit");
  eq(perceive(o, 30, 1).level, IDENTIFIED, "30 tiles: identified");
  ok(perceive(o, 41, 1).level >= DETECTED, "40 tiles: at least detected");
});
test("perception: an unlit field at night hides what's far off, shows shapes nearer, and who they are up close", () => {
  hall(42, "north field"); mission({ night: true });
  const o = person(1);
  eq(perceive(o, 31, 1).level, UNSEEN, "30 tiles in the dark");
  eq(perceive(o, 12, 1).level, DETECTED, "11 tiles: a shape");
  eq(perceive(o, 5, 1).level, IDENTIFIED, "4 tiles: identified");
});
test("perception: a flare lights a target far out in the dark", () => {
  hall(42, "north field"); const S = mission({ night: true });
  const o = person(1);
  S.flares.push({ x: 30, y: 1, until: S.turn });
  eq(perceive(o, 30, 1).level, IDENTIFIED, "under the flare");
});
test("perception: fog shortens how far anything is made out outdoors, not indoors", () => {
  hall(42, "north field"); mission({ weather: "fog" });
  const o = person(1);
  eq(perceive(o, 21, 1).level, UNSEEN, "20 tiles in fog");
  hall(42, "main corridor"); mission({ weather: "fog" });
  eq(perceive(person(1), 21, 1).level, IDENTIFIED, "indoors the fog doesn't matter");
});
test("perception: movement is easier to spot", () => {
  hall(42, "north field"); const S = mission({ night: true });
  const o = person(1), still = person(16, 1, { side: "raider" }), moving = person(16, 1, { side: "raider", movedTurn: 3 } as Partial<Unit>);
  eq(perceive(o, 16, 1, still).level, UNSEEN, "a still figure at 15 tiles in the dark");
  eq(perceive(o, 16, 1, moving).level, DETECTED, "a moving one is picked out");
  void S;
});
test("perception: power out at another site leaves its rooms dark until restored", () => {
  hall(42, "biology lab"); const S = mission({ night: true, kind: "emergency", powerOn: false });
  const o = person(1);
  eq(perceive(o, 20, 1).level, UNSEEN, "dark lab");
  S.powerOn = true;
  eq(perceive(o, 20, 1).level, IDENTIFIED, "lights back on");
});
test("perception: thin smoke blurs what's behind it", () => {
  hall(42, "main corridor"); mission();
  const o = person(1);
  eq(perceive(o, 30, 1).level, IDENTIFIED, "clear");
  setHaze([[10, 1], [11, 1]]);
  ok(perceive(o, 30, 1).level < IDENTIFIED, "through two tiles of haze: no longer identified");
  setHaze([]);
});
