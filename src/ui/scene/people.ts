// Presentation overhaul: an operative as a full figure, from their saved look, rank, armour, uniform research and
// weapon. The same function dresses them in the quarters, the armory and anywhere else they appear.
import { lookOf, weaponOf, type Campaign, type Operative } from "../../campaign/campaign";
import { UNIFORMS, uniformOf } from "../../campaign/research";
import { HEADGEAR } from "../../data/looks";
import type { FigureSpec, ArmorKind } from "./figure";

export function operativeFigure(c: Campaign, o: Operative, opts: { armed?: boolean } = {}): FigureSpec {
  const look = lookOf(o), hat = o.unit ? HEADGEAR[o.unit] : undefined;
  const armor = (o.kit?.armor ?? "") as ArmorKind;
  return {
    look, sex: o.sex, dress: "fatigues",
    armor: armor && (c.inventory[armor] ?? 0) > 0 || armor ? armor : "",
    armorTier: Math.max(1, c.armorTier ?? 1),
    headgear: look.headgear ? (hat ?? "helmet") : "",
    weapon: opts.armed === false ? undefined : c.models[weaponOf(o)],
    attachment: o.attachment,
    uniformTier: UNIFORMS.indexOf(uniformOf(c)),
    rank: o.rank,
    injured: o.hp < o.maxHp || !!(o.injury && o.injury.until > c.day),
  };
}
