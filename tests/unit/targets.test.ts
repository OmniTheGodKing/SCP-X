// Environment-first interface: every room's interactive objects, checked for what the browser tests found the hard
// way. Ids are unique; every object is inside the scene; objects (not people) don't sit on top of each other, so
// none of them steals another's clicks; every object opens something.
import { test, eq, ok } from "./harness";
import { newCampaign } from "../../src/campaign/campaign";
import { roomLayout } from "../../src/scene/layout";
import { FRAME, targetsFor, type Target } from "../../src/scene/targets";
import type { FacilityType } from "../../src/campaign/base";
import { syncStaff } from "../../src/campaign/people";

const TYPES: FacilityType[] = ["command", "generator", "barracks", "security", "medical", "lab", "workshop", "psych", "holding", "amnestics", "training", "cont_safe", "cont_euclid", "cont_keter"];
const overlap = (a: Target["rect"], b: Target["rect"]) => {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? (w * h) / Math.min(a[2] * a[3], b[2] * b[3]) : 0;
};

test("targets: unique, inside the scene, not on top of each other, and each opens something", () => {
  for (const signage of [0, 1]) for (const t of TYPES) {
    const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 51 }); syncStaff(c);
    c.base.facilities.push({ id: "tx", type: t, level: 2, slot: 3, daysLeft: 0, disabled: false, repairDays: 0 });
    if (t.startsWith("cont_")) c.scps.push({ id: "049", name: "SCP-049", title: "", cls: "Euclid", status: "contained", wingId: "tx", maintenance: 100, lastCleaned: 1 } as never);
    const L = roomLayout(c, "tx")!; L.features.signage = signage;
    const ts = targetsFor(L, { armOp: true });
    eq(new Set(ts.map(x => x.id)).size, ts.length, `${t}: unique ids`);
    for (const x of ts) {
      ok(!!x.panel && !!x.label && !!x.hint, `${t}/${x.id}: opens something, with a label and a hint`);
      const [rx, ry, rw, rh] = x.rect;
      ok(rx >= 0 && ry >= 0 && rx + rw <= FRAME.W && ry + rh <= FRAME.H, `${t}/${x.id}: inside the scene`);
    }
    const things = ts.filter(x => x.kind !== "person");
    for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++)
      ok(overlap(things[i].rect, things[j].rect) < 0.1, `${t}: ${things[i].id} and ${things[j].id} overlap (${overlap(things[i].rect, things[j].rect).toFixed(2)})`);
  }
});
test("targets: the surface rooms too", () => {
  const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 51 });
  for (const id of ["surface:quarters", "surface:armory"]) {
    const ts = targetsFor(roomLayout(c, id)!, { armOp: true, heroes: [] }).filter(x => x.kind !== "person");
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) ok(overlap(ts[i].rect, ts[j].rect) < 0.1, `${id}: ${ts[i].id} and ${ts[j].id}`);
  }
});
