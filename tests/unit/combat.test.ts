// Combat rules, run headless on sandbox missions (Tactical overhaul T4): hit chance and its parts, weapon ranges,
// grazes, cover wear, reaction fire for every side, perception gating reactions, and XCOM 2 suppression.
import { test, eq, ok, near } from "./harness";
import { createSandbox } from "../../src/game/sandbox";
import { canShoot, coverAgainst, fire, moveUnit, shotInfo } from "../../src/game/combat";
import { pace } from "../../src/game/state";
import { forceRng } from "../../src/core/rng";
import { damageCover, tileAt, HALF, FULL, FLOOR } from "../../src/core/grid";
import { RANGE_CURVES, rangeAim } from "../../src/data/weapons";
import { statusesOf } from "../../src/game/status";
import { useAbility } from "../../src/game/abilities";
import type { Unit } from "../../src/game/types";

pace.headless = true;
const open = (w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? "#" : ".").join(""));
const put = (rows: string[], x: number, y: number, c: string) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };
const mod = (mods: [string, number][], name: string) => mods.find(m => m[0].startsWith(name))?.[1];

test("combat: full cover in front is −40; from the side the target is flanked", () => {
  const rows = open(20, 15); put(rows, 10, 6, "H");
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 10, y: 1 }, { side: "raider", x: 10, y: 7 }, { side: "mtf", x: 17, y: 7 }] });
  const [front, tg, side] = S.units as Unit[];
  ok(canShoot(front, tg), "front can shoot past the crate by stepping out");
  eq(mod(shotInfo(front, tg).mods, "Full cover"), -40, "front: full cover");
  eq(mod(shotInfo(side, tg).mods, "Flanked"), 10, "side: flanked");
  ok(shotInfo(side, tg).crit >= 40, "flanked shots can crit");
});
test("combat: weapon classes have their own good ranges", () => {
  eq(rangeAim("shotgun", 2) > rangeAim("rifle", 2), true, "shotgun beats rifle up close");
  eq(rangeAim("marksman", 15) > rangeAim("rifle", 15), true, "marksman beats rifle far off");
  eq(rangeAim("smg", 12) < rangeAim("carbine", 12), true, "SMG falls off before the carbine");
  for (const t of Object.keys(RANGE_CURVES)) ok(RANGE_CURVES[t as keyof typeof RANGE_CURVES].length >= 4, `${t} curve`);
  near(rangeAim("rifle", 4), 7.5, 1, "interpolated");
});
test("combat: the hit chance uses the weapon's range curve", () => {
  const rows = open(30, 5);
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 1, y: 2, gun: "shotgun" }, { side: "raider", x: 3, y: 2 }, { side: "raider", x: 13, y: 2 }] });
  const [sh, near2, far12] = S.units as Unit[];
  ok(shotInfo(sh, near2).chance > shotInfo(sh, far12).chance + 40, "shotgun: close is far better than 12 tiles");
});
test("combat: a near miss grazes for half damage", async () => {
  const rows = open(12, 5);
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 1, y: 2, aim: 50 }, { side: "raider", x: 6, y: 2, hp: 20 }] });
  const [sh, tg] = S.units as Unit[];
  const c = shotInfo(sh, tg).chance;
  forceRng((c + 5) / 100); await fire(sh, tg, false); forceRng(null);
  ok(tg.hp < 20 && tg.hp >= 20 - 3, `grazed: hp ${tg.hp}`);
  ok(S.log.some(l => /grazes/.test(l.text)), "logged as a graze");
});
test("combat: cover struck by misses wears down: full to half to gone", () => {
  const rows = open(8, 5); put(rows, 3, 2, "H");
  createSandbox({ rows, units: [] });
  for (let i = 0; i < 6; i++) damageCover(3, 2);
  eq(tileAt(3, 2), HALF, "a crate shot to pieces is half cover");
  for (let i = 0; i < 3; i++) damageCover(3, 2);
  eq(tileAt(3, 2), FLOOR, "and then gone");
  void FULL;
});
test("reactions: a team member on overwatch fires at an Insurgent crossing open ground", async () => {
  const rows = open(20, 9);
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 2, y: 4 }, { side: "raider", x: 15, y: 1, hp: 30 }] });
  const [ow, r] = S.units as Unit[];
  ow.overwatch = true; ow.overwatchShots = 1;
  forceRng(0.01); await moveUnit(r, [[15, 2], [15, 3], [15, 4]]); forceRng(null);
  ok(!ow.overwatch, "overwatch spent");
  ok(r.hp < 30, "hit");
});
test("reactions: Insurgents on overwatch fire at the team (not just snipers)", async () => {
  const rows = open(20, 9);
  const S = createSandbox({ rows, units: [{ side: "raider", x: 2, y: 4 }, { side: "mtf", x: 15, y: 1, hp: 30 }] });
  const [r, m] = S.units as Unit[];
  r.overwatch = true;
  forceRng(0.01); await moveUnit(m, [[15, 2], [15, 3]]); forceRng(null);
  ok(m.hp < 30 && !r.overwatch, "fired");
});
test("reactions: SCP-049-2 and other hostile instances draw overwatch too", async () => {
  const rows = open(20, 9);
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 2, y: 4 }, { side: "zombie", x: 12, y: 2, hp: 30 }] });
  const [ow, z] = S.units as Unit[];
  ow.overwatch = true; ow.overwatchShots = 1;
  forceRng(0.01); await moveUnit(z, [[11, 3]]); forceRng(null);
  ok(z.hp < 30, "fired at the instance");
});
test("reactions: no reaction through a wall, or at movement nobody can make out", async () => {
  const rows = open(30, 9); for (let y = 1; y < 8; y++) put(rows, 8, y, "#");
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 2, y: 4 }, { side: "raider", x: 15, y: 2, hp: 30 }] });
  const [ow, r] = S.units as Unit[];
  ow.overwatch = true;
  await moveUnit(r, [[15, 3], [15, 4]]);
  ok(ow.overwatch && r.hp === 30, "the wall blocks it");
  const S2 = createSandbox({ rows: open(40, 5), outdoors: true, night: true, units: [{ side: "mtf", x: 1, y: 2 }, { side: "raider", x: 37, y: 1, hp: 30 }] });
  const [ow2, r2] = S2.units as Unit[];
  ow2.overwatch = true;
  await moveUnit(r2, [[37, 2], [37, 3]]);
  ok(ow2.overwatch && r2.hp === 30, "in the dark, 36 tiles off: not seen, no shot");
});
test("suppression: pinned, no overwatch, −30; moving draws the suppressor's shot; costs 2 rounds", async () => {
  const rows = open(20, 9);
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 2, y: 4, perks: ["suppression"] }, { side: "raider", x: 12, y: 4, hp: 30 }] });
  const [m, r] = S.units as Unit[];
  r.overwatch = true;
  const ammo = m.gun!.ammo;
  await useAbility(m, "suppression", r);
  eq(m.gun!.ammo, ammo - 2, "two rounds");
  ok(!r.overwatch && statusesOf(r).some(s => s.id === "suppressed"), "suppressed, overwatch gone");
  eq(mod(shotInfo(r, m).mods, "Suppressed"), -30, "−30 aim");
  forceRng(0.01); await moveUnit(r, [[12, 5], [12, 6]]); forceRng(null);
  ok(r.hp < 30, "the suppressor fired as it moved");
  ok(!statusesOf(r).some(s => s.id === "suppressed"), "and the suppression ends");
});
test("suppression: it ends when the suppressor moves", async () => {
  const rows = open(20, 9);
  const S = createSandbox({ rows, units: [{ side: "mtf", x: 2, y: 4, perks: ["suppression"] }, { side: "raider", x: 12, y: 4 }] });
  const [m, r] = S.units as Unit[];
  await useAbility(m, "suppression", r);
  await moveUnit(m, [[2, 5]]);
  ok(!statusesOf(r).some(s => s.id === "suppressed"), "released");
});
test("cover: what the dice use is what the kernel says", () => {
  const rows = open(20, 15); put(rows, 10, 6, "h");
  createSandbox({ rows, units: [] });
  eq(coverAgainst(10, 7, 10, 1), 20, "desk: half cover");
});
