// Class abilities used during a mission. Each has a target rule, a cost and an effect.
import { cheb } from "../core/grid";
import { hasPerk, spend, usesLeft } from "./perks";
import { maxSanOf } from "./profiles";
import { S, alive, canAct, canSee, computeVis, full, hooks, isPanicked, log, seen, team } from "./state";
import type { PerkId, Unit } from "./types";

export interface AbilityDef {
  perk: PerkId;
  label: string;
  target: "ally" | "downed" | "panicked" | "enemy" | "self";
  endsTurn?: boolean;
  /** Uses per mission, if limited. */
  uses?: (u: Unit) => number;
}

export const ABILITIES: AbilityDef[] = [
  { perk: "medkit", label: "Medkit", target: "ally", uses: u => 2 + (hasPerk(u, "field_surgeon") ? 1 : 0) },
  { perk: "calm_words", label: "Calm words", target: "ally" },
  { perk: "stabilize", label: "Stabilize", target: "downed" },
  { perk: "sedative", label: "Sedative", target: "panicked" },
  { perk: "suppression", label: "Suppress", target: "enemy", endsTurn: true },
  { perk: "mark_target", label: "Mark target", target: "enemy" },
  { perk: "run_and_gun", label: "Run and gun", target: "self", uses: () => 1 },
];

export const abilitiesOf = (u: Unit | null) => u ? ABILITIES.filter(a => hasPerk(u, a.perk)) : [];
const def = (p: PerkId) => ABILITIES.find(a => a.perk === p)!;
const adjacent = (a: Unit, b: Unit) => cheb(a.x, a.y, b.x, b.y) <= 1;
/** Combat medic: one free medkit per turn. */
const freeHeal = (u: Unit) => hasPerk(u, "combat_medic") && !(u.used?.["cm" + S.turn]);
const cost = (u: Unit, p: PerkId) => p === "run_and_gun" ? 0 : p === "medkit" && freeHeal(u) ? 0 : 1;

export function abilityTargets(u: Unit, p: PerkId): Unit[] {
  const d = def(p);
  switch (d.target) {
    case "self": return [u];
    case "ally": return team().filter(a => adjacent(u, a) && (p === "medkit" ? a.hp < a.maxHp && a.side === "mtf" : a.san < maxSanOf(a)));
    case "downed": return S.units.filter(a => a.alive && a.downed && !a.stabilized && adjacent(u, a));
    case "panicked": return alive("mtf").filter(a => a !== u && isPanicked(a) && adjacent(u, a));
    case "enemy": return alive("raider").filter(r => seen(r.x, r.y) && canSee(u, r.x, r.y));
  }
}

export function abilityCheck(u: Unit | null, p: PerkId): string | null {
  if (!u || !hasPerk(u, p)) return "Select someone with that ability.";
  const d = def(p);
  if (d.uses && usesLeft(u, p, d.uses(u)) < 1) return "No uses left this mission.";
  if (u.ap < cost(u, p)) return "No actions left this turn.";
  if (!abilityTargets(u, p).length) return d.target === "enemy" ? "No enemy in sight." : d.target === "downed" ? "Nobody downed next to them." : d.target === "panicked" ? "Nobody panicking next to them." : d.target === "ally" ? "Nobody next to them needs it." : null;
  return null;
}

/** Start using an ability: self-targeted ones happen at once, the rest wait for a target. */
export function startAbility(p: PerkId, flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (S.mode === "ability" && S.ability === p) { S.mode = null; S.ability = null; hooks.update(); return; }
  const why = abilityCheck(u, p);
  if (why) { flash(why); return; }
  if (def(p).target === "self") { useAbility(u, p, u); return; }
  S.mode = "ability"; S.ability = p; S.pending = null;
  hooks.update();
}

export function useAbility(u: Unit, p: PerkId, t: Unit) {
  const d = def(p);
  if (abilityCheck(u, p) || !abilityTargets(u, p).includes(t)) return;
  const c = cost(u, p);
  if (p === "medkit" && c === 0) spend(u, "cm" + S.turn);
  if (d.uses) spend(u, p);
  u.ap = d.endsTurn ? 0 : u.ap - c;
  S.mode = null; S.ability = null;
  switch (p) {
    case "medkit":
      t.hp = Math.min(t.maxHp, t.hp + 3);
      log(`${full(u)} patches up ${full(t)} (+3 HP).`, "good");
      break;
    case "calm_words":
      t.san = Math.min(maxSanOf(t), t.san + 20);
      log(`${full(u)} talks ${full(t)} down (+20 sanity).`, "good");
      break;
    case "stabilize":
      t.stabilized = true;
      log(`${full(u)} stabilizes ${full(t)}. They'll make it out.`, "good");
      break;
    case "sedative":
      t.panicUntil = S.turn - 1; t.ap = 1;
      log(`${full(u)} sedates ${full(t)}, who opens their eyes again.`, "good");
      break;
    case "suppression": {
      const hit = [t, ...(hasPerk(u, "wall_of_fire") ? alive("raider").filter(r => r !== t && cheb(r.x, r.y, t.x, t.y) <= 2) : [])];
      for (const r of hit) r.suppressedUntil = S.turn;
      log(`${full(u)} lays down suppressing fire: ${hit.length} Insurgent${hit.length > 1 ? "s" : ""} pinned (−30 aim on their next shots).`, "good");
      break;
    }
    case "mark_target":
      t.markedUntil = S.turn;
      log(`${full(u)} marks an Insurgent: everyone gets +15 aim against it for the rest of this turn.`, "good");
      break;
    case "run_and_gun":
      u.ap += 1;
      log(`${full(u)}: run and gun.`, "key");
      break;
  }
  computeVis();
  hooks.update();
}
