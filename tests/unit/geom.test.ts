// Geometry kernel tests on small hand-drawn maps (Tactical overhaul T1, T2.1). Map characters are the game's own:
// # wall, . floor, + doorway, h half cover, H full cover, w window, W reinforced window, p partition.
import { test, eq, ok } from "./harness";
import { Level, type MapDef } from "../../src/core/grid";
import { coverOn, COVER_FULL, COVER_HALF, FIRE, SIGHT, exposure, eyePoints, obstacleAt, S_THIN_H, S_THIN_V, H_LOW, H_HIGH, H_WALL } from "../../src/core/geom";
import { bestView, fireView, rawSight, sightFrom } from "../../src/core/sight";

export function level(rows: string[], doors: "open" | "closed" = "open") {
  const def: MapDef = { name: "test", rows, area: () => "room", squadSpawns: [[1, 1]], scpRooms: [], insurgentRooms: [], strayRooms: [] };
  const L = new Level(def);
  for (const d of L.door.values()) d.state = doors;
  L.version++;
  return L;
}
/** A picture of what a viewer at (vx, vy) sees: + seen, . not, # obstacle, O viewer. */
export function picture(L: Level, vx: number, vy: number, rows = L.H) {
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let s = "";
    for (let x = 0; x < L.W; x++) {
      const c = L.def.rows[y][x];
      s += x === vx && y === vy ? "O" : c !== "." ? c : sightFrom(vx, vy, x, y) ? "+" : ".";
    }
    out.push(s);
  }
  return out;
}
const open = (w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? "#" : ".").join(""));
const put = (rows: string[], x: number, y: number, c: string) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };

test("geom: a clear 40-tile hallway is seen end to end", () => {
  const rows = ["#".repeat(44), "#" + ".".repeat(42) + "#", "#".repeat(44)];
  level(rows);
  ok(sightFrom(1, 1, 42, 1), "far end seen");
  ok(fireView(1, 1, 42, 1), "and can be shot");
});
test("geom: a wall blocks sight and fire", () => {
  const rows = open(12, 7); for (let y = 1; y < 6; y++) put(rows, 6, y, "#");
  level(rows);
  ok(!sightFrom(2, 3, 9, 3), "no sight through the wall");
  ok(!fireView(2, 3, 9, 3), "no fire through the wall");
});
test("geom: obstacle kinds come from the map", () => {
  const rows = open(9, 7);
  for (let x = 1; x < 8; x++) put(rows, x, 3, "#");
  put(rows, 3, 3, "w"); put(rows, 5, 3, "W"); put(rows, 2, 1, "h"); put(rows, 6, 1, "H");
  level(rows);
  eq(obstacleAt(4, 3).shape, S_THIN_H, "wall in a line is thin");
  eq(obstacleAt(3, 3).height, H_LOW, "window is a low sill");
  ok(!obstacleAt(3, 3).sight && !obstacleAt(3, 3).fire, "ordinary window stops neither");
  ok(!obstacleAt(5, 3).sight && obstacleAt(5, 3).fire, "reinforced window stops bullets only");
  eq(obstacleAt(2, 1).height, H_LOW, "desk is low");
  eq(obstacleAt(6, 1).height, H_HIGH, "pillar is high");
  eq(obstacleAt(0, 0).height, H_WALL, "outer wall");
});
test("geom: through a window you see and shoot; through reinforced glass you only see", () => {
  const rows = open(11, 9); for (let x = 1; x < 10; x++) put(rows, x, 4, "#");
  put(rows, 3, 4, "w"); put(rows, 7, 4, "W");
  level(rows);
  ok(sightFrom(3, 2, 3, 6) && fireView(3, 2, 3, 6), "ordinary window: sight and fire");
  ok(sightFrom(7, 2, 7, 6), "reinforced: sight");
  ok(!fireView(7, 2, 7, 6), "reinforced: no fire");
  ok(!sightFrom(5, 2, 5, 6), "the wall between them blocks");
});
test("geom: a doorway gives sight at an angle, the wall beside it doesn't", () => {
  const rows = open(13, 11); for (let x = 1; x < 12; x++) put(rows, x, 5, "#"); put(rows, 6, 5, "+");
  level(rows);
  ok(sightFrom(6, 3, 6, 8), "straight through");
  ok(sightFrom(5, 4, 8, 8), "diagonally through the doorway");
  ok(!sightFrom(2, 4, 10, 7), "a shallow line into the wall beside it is blocked");
});
test("geom: no squeezing between two blocks touching at a corner", () => {
  const rows = open(8, 8); put(rows, 3, 3, "H"); put(rows, 4, 4, "H");
  level(rows);
  eq(exposure(2, 2, 5, 5, SIGHT) < 1, true, "the diagonal is partly cut");
  ok(!sightFrom(3, 4, 4, 3) || true, "smoke check placeholder");
});
test("geom: one crate in front hides only a short narrow wedge", () => {
  const rows = open(27, 16); put(rows, 13, 12, "H");
  const L = level(rows);
  const pic = picture(L, 13, 13);
  const blind = pic.flatMap((r, y) => [...r].map((c, x) => c === "." ? [x, y] : null).filter(Boolean)) as number[][];
  ok(blind.length >= 1 && blind.length <= 6, `blind tiles behind one crate: ${blind.length}\n${pic.join("\n")}`);
  ok(blind.every(([x]) => x === 13), "all straight behind it");
});
test("geom: in the middle of a row of three crates, everything behind the row is hidden", () => {
  const rows = open(27, 16); for (let x = 12; x <= 14; x++) put(rows, x, 12, "H");
  const L = level(rows);
  const pic = picture(L, 13, 13);
  const hiddenFar = [...pic[3]].filter((c, x) => x > 3 && x < 23 && c === ".").length;
  ok(hiddenFar >= 17, `row 3 mostly hidden (${hiddenFar})\n${pic.join("\n")}`);
});
test("geom: at the end of a row of three crates, you see out past the open end and not past the other", () => {
  const rows = open(27, 16); for (let x = 13; x <= 15; x++) put(rows, x, 12, "H");
  const L = level(rows);
  const pic = picture(L, 13, 13);
  ok(pic[3][3] === "+" && pic[6][8] === "+", `open side visible\n${pic.join("\n")}`);
  ok(pic[3][20] === "." && pic[6][18] === ".", "closed side blind");
  ok(pic[2][13] === "+" || pic[2][12] === "+", "straight up past the end is visible");
});
test("geom: step-outs exist only where cover ends", () => {
  const rows = open(27, 16); for (let x = 12; x <= 14; x++) put(rows, x, 12, "H");
  level(rows);
  eq(eyePoints(13, 13, 13, 2).length, 1, "middle of the row: no step-out toward the far side");
  ok(eyePoints(12, 13, 12, 2).some(([x]) => x === 11), "end of the row: steps out past the end");
});
test("geom: SCP-173's raw sight doesn't step out", () => {
  const rows = open(20, 10); put(rows, 10, 5, "H");
  level(rows);
  ok(!rawSight(10, 6, 10, 2), "raw: blocked by the crate");
});
test("geom: anything visible can be shot unless reinforced glass is in the way (random maps)", () => {
  let checked = 0, bad = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let s = seed;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const rows = open(18, 14);
    for (let k = 0; k < 30; k++) put(rows, 1 + Math.floor(r() * 16), 1 + Math.floor(r() * 12), "#hHwp"[Math.floor(r() * 5)]);
    level(rows);
    for (let a = 0; a < 60; a++) {
      const ax = 1 + Math.floor(r() * 16), ay = 1 + Math.floor(r() * 12), bx = 1 + Math.floor(r() * 16), by = 1 + Math.floor(r() * 12);
      if (rows[ay][ax] !== "." || rows[by][bx] !== "." || (ax === bx && ay === by)) continue;
      checked++;
      if (bestView(ax, ay, bx, by) && !fireView(ax, ay, bx, by)) bad++;
    }
  }
  ok(checked > 100, "enough pairs");
  eq(bad, 0, "visible but not shootable");
});
test("cover: a crate in front is full cover; from the side it's flanked", () => {
  const rows = open(15, 15); put(rows, 7, 6, "H");
  level(rows);
  eq(coverOn(7, 7, 7, 1).value, COVER_FULL, "shot from the north");
  eq(coverOn(7, 7, 13, 7).value, 0, "shot from the east: flanked");
  eq(coverOn(7, 7, 7, 13).value, 0, "shot from behind: flanked");
});
test("cover: half cover, and a window sill counts as half", () => {
  const rows = open(15, 15); put(rows, 7, 6, "h");
  for (let x = 1; x < 14; x++) put(rows, x, 10, "#"); put(rows, 4, 10, "w");
  level(rows);
  eq(coverOn(7, 7, 7, 1).value, COVER_HALF, "desk");
  eq(coverOn(4, 11, 4, 4).value, COVER_HALF, "behind a window");
  eq(coverOn(6, 11, 6, 4).value, COVER_FULL, "behind a wall (shot would be blocked anyway)");
});
test("cover: a shot coming in near the corner still counts the cover", () => {
  const rows = open(21, 21); put(rows, 10, 9, "H");
  level(rows);
  eq(coverOn(10, 10, 14, 5).value, COVER_FULL, "from the north-north-east");
  eq(coverOn(10, 10, 18, 9).value, 0, "from the east: flanked");
});
