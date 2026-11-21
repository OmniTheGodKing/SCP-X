// The move cursor's preview (Tactical overhaul T6.3) must say what the rules will do.
import { test, eq, ok } from "./harness";
import { createSandbox } from "../../src/game/sandbox";
import { movePreview } from "../../src/game/preview";
import { canShoot, coverAgainst, moveUnit } from "../../src/game/combat";
import { pace } from "../../src/game/state";
import { forceRng } from "../../src/core/rng";
import type { Unit } from "../../src/game/types";
import type { Pt } from "../../src/core/grid";

pace.headless = true;
const open = (w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? "#" : ".").join(""));
const put = (rows: string[], x: number, y: number, c: string) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };

test("preview: threats and flanks at a destination are the units that could shoot it there", () => {
  const rows = open(20, 12); put(rows, 10, 5, "H");
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 2, y: 9 }, { side: "raider", x: 10, y: 1 }, { side: "raider", x: 18, y: 6 }] });
  const [m, a, b] = S.units as Unit[];
  const pv = movePreview(m, 10, 6, []);
  const ox = m.x, oy = m.y; m.x = 10; m.y = 6;
  const truth = [a, b].filter(r => canShoot(r, m));
  const flanks = truth.filter(r => coverAgainst(10, 6, r.x, r.y) === 0);
  m.x = ox; m.y = oy;
  eq(pv.threats.map(u => u.id).sort(), truth.map(u => u.id).sort(), "threats");
  eq(pv.flankedBy.map(u => u.id), flanks.map(u => u.id), "flanks");
  eq(pv.sides[0], 40, "full cover to the north (the crate)");
});
test("preview: the overwatch warning marks a tile where the watcher really fires", async () => {
  const rows = open(20, 12); for (let x = 1; x < 19; x++) if (x !== 9) put(rows, x, 6, "#");
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 9, y: 9, hp: 40 }, { side: "raider", x: 9, y: 2 }] });
  const [m, r] = S.units as Unit[];
  r.overwatch = true;
  const path: Pt[] = [[9, 8], [9, 7], [9, 6], [9, 5]];
  const pv = movePreview(m, 9, 5, path);
  ok(pv.lane !== null, "a lane is flagged");
  forceRng(0.01); await moveUnit(m, path); forceRng(null);
  ok(!r.overwatch && m.hp < 40, "and the watcher did fire on that move");
});
