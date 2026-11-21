import { test, eq } from "./harness";
import { fireCheck, payFire, payReload, overwatchCheck, payOverwatch, moveActions } from "../../src/game/actions";
import type { Unit } from "../../src/game/types";

const unit = (gun: Partial<NonNullable<Unit["gun"]>>, perks: string[] = [], ap = 2) =>
  ({ id: "u", side: "mtf", name: "T", x: 0, y: 0, hp: 5, maxHp: 5, san: 50, ap, perks, gun: { name: "g", type: "rifle", dmg: [3, 5], mag: 4, ammo: 4, aim: 0, ...gun } } as unknown as Unit);

test("actions: a rifle shot ends the turn", () => { const u = unit({ type: "rifle" }); payFire(u); eq(u.ap, 0); });
test("actions: an SMG shot costs one action", () => { const u = unit({ type: "smg" }); payFire(u); eq(u.ap, 1); });
test("actions: an empty SMG falls back to the sidearm, which ends the turn", () => { const u = unit({ type: "smg", ammo: 0 }); payFire(u); eq(u.ap, 0); });
test("actions: a marksman rifle needs both actions", () => { eq(fireCheck(unit({ type: "marksman" }, [], 1)), "A marksman rifle takes both actions to fire."); eq(fireCheck(unit({ type: "marksman" })), null); });
test("actions: double tap leaves one action, once", () => {
  const u = unit({ type: "rifle" }, ["double_tap"]); payFire(u); eq(u.ap, 1);
  u.ap = 2; payFire(u); eq(u.ap, 0, "second time");
});
test("actions: reload costs one action and fills the magazine", () => { const u = unit({ ammo: 1 }); payReload(u); eq([u.ap, u.gun!.ammo], [1, 4]); });
test("actions: overwatch needs a loaded weapon and ends the turn", () => {
  eq(overwatchCheck(unit({ ammo: 0 })), "Reload first: overwatch needs a loaded weapon.");
  const u = unit({}); payOverwatch(u); eq([u.ap, u.overwatch, u.overwatchShots], [0, true, 1]);
});
test("actions: moves within the allowance cost 1, beyond it 2", () => { eq([moveActions(5, 5), moveActions(5, 6)], [1, 2]); });
