// What Site-19 can do with the Safe-class objects it holds: SCP-500's pills and SCP-914's refining.
// (SCP-005's effect is passive: see applyResult and Lock studies.)
import { TRAITS } from "../data/classes";
import { ITEMS, has, type ItemId } from "./research";
import { log, maxSanOf, type Campaign, type Operative } from "./campaign";

const held = (c: Campaign, id: string) => c.scps.some(s => s.id === id && s.status === "contained");

/** One pill, or half of one after the Panacea assay. */
export const pillDose = (c: Campaign) => has(c, "panacea_assay") ? 0.5 : 1;
export const pillsLeft = (c: Campaign) => Math.floor((c.pills ?? 0) / pillDose(c));
export function canGivePill(c: Campaign, o: Operative): string | null {
  if (!held(c, "500")) return "SCP-500 isn't in its cell.";
  if (pillsLeft(c) < 1) return "No pills left.";
  if (!o.alive) return "Too late for that.";
  if (o.hp >= o.maxHp && !o.traits.some(t => TRAITS[t].bad) && o.san >= maxSanOf(o)) return "Nothing to cure.";
  return null;
}
export function givePill(c: Campaign, o: Operative) {
  if (canGivePill(c, o)) return;
  c.pills = (c.pills ?? 0) - pillDose(c);
  const cured = o.traits.filter(t => TRAITS[t].bad);
  o.traits = o.traits.filter(t => !TRAITS[t].bad);
  o.hp = o.maxHp; o.san = maxSanOf(o);
  log(c, `${o.call} ${o.name} takes ${pillDose(c) < 1 ? "half a pill" : "a pill"} of SCP-500: every wound closes${cured.length ? `, and ${cured.map(t => TRAITS[t].name.toLowerCase()).join(" and ")} ${cured.length > 1 ? "are" : "is"} gone` : ""}. ${pillsLeft(c)} ${pillsLeft(c) === 1 ? "dose" : "doses"} left.`, "good");
}

/** SCP-914 on "Fine" (and "Very Fine" once studied): what goes in, and what comes out. */
export const REFINE: { from: ItemId; to: ItemId; veryFine?: boolean }[] = [
  { from: "smoke", to: "flashbang" }, { from: "flashbang", to: "frag" }, { from: "frag", to: "incendiary" },
  { from: "flare", to: "eyedrops" }, { from: "csgas", to: "medkit" },
  { from: "armor_light", to: "armor", veryFine: true }, { from: "armor", to: "armor_heavy", veryFine: true }, { from: "law", to: "bazooka", veryFine: true },
];
export const REFINE_EVERY = 7;
export const refineRecipes = (c: Campaign) => REFINE.filter(r => !r.veryFine || has(c, "very_fine"));
export function canRefine(c: Campaign, from: ItemId): string | null {
  if (!held(c, "914")) return "SCP-914 isn't in its cell.";
  if (c.lastRefine !== undefined && c.day - c.lastRefine < REFINE_EVERY) return `It needs ${REFINE_EVERY - (c.day - c.lastRefine)} more days of recalibration.`;
  if (!refineRecipes(c).some(r => r.from === from)) return "That can't be refined.";
  if ((c.inventory[from] ?? 0) < 1) return `No ${ITEMS[from].name} in stores.`;
  return null;
}
export function refine(c: Campaign, from: ItemId) {
  if (canRefine(c, from)) return;
  const r = refineRecipes(c).find(x => x.from === from)!;
  c.lastRefine = c.day;
  c.inventory[from] = (c.inventory[from] ?? 1) - 1;
  if (Math.random() < (has(c, "very_fine") ? 0.1 : 0.2)) {
    log(c, `SCP-914 took the ${ITEMS[from].name} and returned ${["a lump of warm slag", "a tangle of copper wire", "something that hums when nobody is looking at it"][Math.floor(Math.random() * 3)]}. It goes in the incinerator.`, "bad");
    return;
  }
  c.inventory[r.to] = (c.inventory[r.to] ?? 0) + 1;
  log(c, `SCP-914, "${r.veryFine ? "Very Fine" : "Fine"}": ${ITEMS[from].name} in, ${ITEMS[r.to].name} out.`, "good");
}
