// Enemy AI scenarios (Tactical overhaul T5), headless on sandbox missions with fixed seeds. The AI must use the same
// rules as the player and only what its side has made out.
import { test, eq, ok } from "./harness";
import { createSandbox } from "../../src/game/sandbox";
import { canShoot, coverAgainst } from "../../src/game/combat";
import { pace, canSee } from "../../src/game/state";
import { planPod, tacticalTurn, threats } from "../../src/game/ai";
import { forceRng } from "../../src/core/rng";
import type { Unit } from "../../src/game/types";

pace.headless = true;
const open = (w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? "#" : ".").join(""));
const put = (rows: string[], x: number, y: number, c: string) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };
const turn = async (r: Unit, plan = { flankers: [] as string[] }) => { r.ap = 2; await tacticalTurn(r, plan, null, () => false); };

test("ai: an Insurgent caught in the open with no good shot gets into cover (or a flank)", async () => {
  const rows = open(24, 18);
  put(rows, 11, 4, "H");                                        // the operative is behind a crate
  for (const x of [6, 9, 15, 18]) put(rows, x, 12, "H");       // crates near the Insurgent
  for (let seed = 1; seed <= 5; seed++) {
    const S = createSandbox({ rows, seed, units: [{ side: "mtf", x: 11, y: 3 }, { side: "raider", x: 12, y: 13, aim: 55 }] });
    const [op, r] = S.units as Unit[];
    await turn(r);
    const covered = coverAgainst(r.x, r.y, op.x, op.y) > 0, flanking = canShoot(r, op) && coverAgainst(op.x, op.y, r.x, r.y) === 0;
    ok(covered || flanking || r.hp < r.maxHp, `seed ${seed}: ends in cover or on a flank (at ${r.x},${r.y})`);
  }
});
test("ai: two Insurgents in a pod work round a dug-in operative: one suppresses, the other flanks", async () => {
  const rows = open(24, 18); put(rows, 11, 5, "H");
  let suppressed = 0, flanked = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const S = createSandbox({ rows, seed, units: [{ side: "mtf", x: 11, y: 4 }, { side: "raider", x: 9, y: 13, gun: "mg" }, { side: "raider", x: 13, y: 13 }] });
    const [op, mg, rf] = S.units as Unit[];
    const plan = planPod([mg, rf], threats());
    eq(plan.focus, op.id, "focus is the dug-in operative");
    eq(plan.suppressor, mg.id, "the machine gunner suppresses");
    await turn(mg, plan); await turn(rf, plan);
    if ((op.suppressedUntil ?? -1) >= S.turn) suppressed++;
    if (coverAgainst(op.x, op.y, rf.x, rf.y) === 0 && canSee(rf, op.x, op.y)) flanked++;
  }
  ok(suppressed === 4, `suppressed every time (${suppressed})`);
  ok(flanked >= 2, `the rifleman reached a flank in most runs (${flanked} of 4)`);
});
test("ai: a grenade goes where it catches two of the team", async () => {
  const rows = open(20, 14);
  const S = createSandbox({ rows, seed: 3, units: [{ side: "mtf", x: 9, y: 4 }, { side: "mtf", x: 10, y: 4 }, { side: "raider", x: 9, y: 10 }] });
  const [a, b, r] = S.units as Unit[];
  r.items = [{ id: "frag", uses: 1 }];
  await turn(r);
  eq(r.items[0].uses, 0, "threw it");
  ok(a.hp < a.maxHp && b.hp < b.maxHp, "both hurt");
});
test("ai: it doesn't walk into an overwatch lane it can avoid", async () => {
  // a wall with a gap: beyond the gap, the operative's overwatch covers the open ground
  const rows = open(24, 16); for (let x = 1; x < 23; x++) if (x !== 4) put(rows, x, 8, "#");
  put(rows, 18, 11, "H");
  const S = createSandbox({ rows, seed: 2, units: [{ side: "mtf", x: 12, y: 4 }, { side: "raider", x: 12, y: 12 }] });
  const [op, r] = S.units as Unit[];
  op.overwatch = true; op.overwatchShots = 1;
  S.mem.set("seen-" + op.id, { x: op.x, y: op.y, turn: S.turn });
  const hpBefore = r.hp;
  await turn(r);
  ok(op.overwatch && r.hp === hpBefore, `no overwatch shot drawn (at ${r.x},${r.y})`);
});
test("ai: it only knows what its side has made out", () => {
  const S = createSandbox({ rows: open(44, 5), outdoors: true, night: true, units: [{ side: "mtf", x: 2, y: 2 }, { side: "raider", x: 40, y: 2 }] });
  eq(threats().length, 0, "an operative 38 tiles off in the dark is unknown");
  const S2 = createSandbox({ rows: open(44, 5), outdoors: true, units: [{ side: "mtf", x: 2, y: 2 }, { side: "raider", x: 40, y: 2 }] });
  eq(threats().length, 1, "in daylight, seen");
  void S; void S2; void forceRng;
});
