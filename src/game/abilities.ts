// Class abilities used during a mission. Each has a target rule, a cost and an effect.
import { DIRS, DRUM, FULL, HALF, L, STEEL, WALL, cheb, passable, tileAt } from "../core/grid";
import { hasPerk, spend, usesLeft } from "./perks";
import { maxSanOf } from "./profiles";
import { S, alive, banner, canAct, canSee, computeVis, full, hooks, isPanicked, log, loseSanity, seen, team } from "./state";
import type { AbilityId, PerkId, Unit } from "./types";
import { PERKS } from "../data/classes";
import { MAPS } from "../data/maps";

export interface AbilityDef {
  perk: AbilityId;
  label: string;
  desc?: string;
  target: "ally" | "downed" | "panicked" | "enemy" | "self" | "captive" | "witness" | "panel" | "doctor" | "stray" | "carryable" | "record" | "specimen" | "radio";
  /** For self-targeted actions that only make sense sometimes: when they show up. */
  when?: (u: Unit) => boolean;
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
  { perk: "secure", label: "Secure prisoner", target: "captive", desc: "Restrain an adjacent wounded Insurgent so they're taken prisoner even if the mission fails." },
  { perk: "restrain", label: "Restrain", target: "stray", desc: "Grab a loose D-Class next to you and cuff them. They go back to holding after the mission." },
  { perk: "pickup", label: "Pick up", target: "carryable", desc: "Lift a downed ally or a body next to you and carry them (−1 move). Carried people can leave through an exit with you." },
  { perk: "drop", label: "Put down", target: "self", when: u => !!u.carrying, desc: "Set down whoever you're carrying, next to you." },
  { perk: "exfil", label: "Exfiltrate", target: "self", when: u => onExit(u), desc: "Leave the mission through this exit. Anyone you carry, and researchers following you, come too." },
  { perk: "hunker", label: "Hunker down", target: "self", endsTurn: true, when: u => !u.carrying && hasCover(u), desc: "Get low behind cover: it counts double until your next turn." },
  { perk: "calm", label: "Calm SCP-049", target: "doctor", desc: "Talk SCP-049 down from within 3 tiles (6 sanity). It won't act on its next turn, and you lead it up to 3 tiles now." },
  { perk: "doors", label: "Blast doors", target: "panel", desc: "At the panel: seal a doorway with a blast door, or open one (up to 2 sealed). Sealed doors block everyone but SCP-106." },
  { perk: "siren", label: "Silence the siren", target: "panel", desc: "At the panel: switch the breach siren off or on. While it wails nobody recovers sanity, but SCP-173 can't hear where your shots come from." },
  { perk: "lockdown", label: "Lock the hatch", target: "panel", endsTurn: true, desc: "At the lockdown panel: seal the surface hatch so SCP-173 can't get out that way for a few turns. Takes both actions." },
  { perk: "cutradio", label: "Cut the radio", target: "radio", desc: "Smash the Insurgents' radio set next to you: they can't call for reinforcements." },
  { perk: "recover", label: "Recover records", target: "record", desc: "Gather up an adjacent file of classified records. They leave with the team." },
  { perk: "restore", label: "Restore power", target: "panel", endsTurn: true, desc: "At the panel: bring the site's power back. The lights come on (no more darkness penalty). Takes both actions." },
  { perk: "scan", label: "Scan the anomaly", target: "specimen", desc: "Field researcher only: take readings on an anomaly in sight within 8 tiles. Each scan (up to 3) puts work into research on it." },
  { perk: "dose", label: "Dose with amnestics", target: "witness", desc: "Give an adjacent witness amnestics. They forget what they saw and stop running." },
];

const UNIVERSAL: AbilityId[] = ["cutradio", "secure", "dose", "lockdown", "doors", "siren", "calm", "restrain", "pickup", "drop", "exfil", "hunker", "recover", "restore", "scan"];
const onExit = (u: Unit) => L.exitMap[u.y * L.W + u.x] === 0;
const hasCover = (u: Unit) => DIRS.some(([dx, dy]) => { const t = tileAt(u.x + dx, u.y + dy); return t === WALL || t === FULL || t === HALF || t === STEEL || t === DRUM; });
const knows = (u: Unit, p: AbilityId) => UNIVERSAL.includes(p)
  ? u.side === "mtf" && abilityTargets(u, p).length > 0 && (p !== "dose" || S.amnestics > 0)
  : hasPerk(u, p as PerkId);
export const abilitiesOf = (u: Unit | null) => u ? ABILITIES.filter(a => knows(u, a.perk)) : [];
const def = (p: AbilityId) => ABILITIES.find(a => a.perk === p)!;
export const abilityName = (p: AbilityId) => UNIVERSAL.includes(p) ? def(p).label : PERKS[p as PerkId].name;
export const abilityDesc = (p: AbilityId) => UNIVERSAL.includes(p) ? def(p).desc! : PERKS[p as PerkId].desc;
const adjacent = (a: Unit, b: Unit) => cheb(a.x, a.y, b.x, b.y) <= 1;
const carries = (u: Unit, id: string) => !!u.items?.some(i => i.id === id);
const within = (a: Unit, b: Unit, r: number) => cheb(a.x, a.y, b.x, b.y) <= r && (r <= 1 || canSee(a, b.x, b.y));
/** Combat medic: one free medkit per turn. */
const freeHeal = (u: Unit) => hasPerk(u, "combat_medic") && !(u.used?.["cm" + S.turn]);
const cost = (u: Unit, p: AbilityId) => p === "run_and_gun" || p === "drop" ? 0 : p === "lockdown" || p === "restore" ? 2 : p === "medkit" && freeHeal(u) ? 0 : 1;

export function abilityTargets(u: Unit, p: AbilityId): Unit[] {
  const d = def(p);
  switch (d.target) {
    case "captive": return S.units.filter(a => a.side === "raider" && a.alive && a.downed && !a.secured && within(u, a, carries(u, "restraints") ? 2 : 1));
    case "witness": return S.units.filter(a => a.witness && a.alive && !a.saved && !a.dosed && within(u, a, carries(u, "darts") ? 4 : 1));
    case "self": return d.when && !d.when(u) ? [] : [u];
    case "stray": return S.units.filter(a => ((a.side === "subject" && a.stray) || (a.side === "zombie" && a.rioter)) && a.alive && !a.saved && !a.downed && cheb(u.x, u.y, a.x, a.y) <= (hasPerk(u, "shepherd") ? 3 : 1));
    case "carryable": return u.carrying ? [] : S.units.filter(a => a !== u && !a.saved && !a.carriedBy && a.side !== "anomaly" && a.side !== "zombie" && a.side !== "raider"
      && (a.downed || !a.alive) && !a.taken && !a.cured && adjacent(u, a));
    case "doctor": {
      const d = S.statue;
      return S.has049 && !S.sealed && d.alive && cheb(u.x, u.y, d.x, d.y) <= 3 && canSee(u, d.x, d.y) ? [d] : [];
    }
    case "panel": {
      const pn = L.def.panel;
      const at = !!pn && !u.staring && cheb(u.x, u.y, pn[0], pn[1]) <= 1;
      if (p === "doors" || p === "siren") return at && S.setup.kind === "breach" ? [u] : [];
      if (p === "restore") return at && S.setup.kind === "emergency" && !S.powerOn ? [u] : [];
      return at && S.has173 && !S.sealed && S.lockedUntil < S.turn ? [u] : [];
    }
    case "ally": return team().filter(a => adjacent(u, a) && (p === "medkit" ? a.hp < a.maxHp && a.side === "mtf" : a.san < maxSanOf(a)));
    case "downed": return S.units.filter(a => a.alive && a.downed && !a.stabilized && adjacent(u, a));
    case "panicked": return alive("mtf").filter(a => a !== u && isPanicked(a) && adjacent(u, a));
    case "enemy": return alive("raider").filter(r => seen(r.x, r.y) && canSee(u, r.x, r.y));
    case "record": return S.units.filter(a => a.record && !a.radio && !a.saved && adjacent(u, a));
    case "radio": return S.units.filter(a => a.radio && !a.saved && adjacent(u, a));
    case "specimen": {
      if (u.specialist !== "researcher" || Object.values(S.scans ?? {}).reduce((a, n) => a + n, 0) >= 3 || u.used?.["scan" + S.turn]) return [];
      return S.units.filter(a => a.alive && !a.downed && (a === S.statue || a.side === "zombie" || a.flesh) && !(a === S.statue && S.sealed) && seen(a.x, a.y) && cheb(u.x, u.y, a.x, a.y) <= 8 && canSee(u, a.x, a.y)).slice(0, 1);
    }
  }
}

export function abilityCheck(u: Unit | null, p: AbilityId): string | null {
  if (!u || !knows(u, p)) return "Select someone with that ability.";
  const d = def(p);
  if (d.uses && usesLeft(u, p, d.uses(u)) < 1) return "No uses left this mission.";
  if (u.ap < cost(u, p)) return "No actions left this turn.";
  if (!abilityTargets(u, p).length) return d.target === "enemy" ? "No enemy in sight." : d.target === "downed" ? "Nobody downed next to them." : d.target === "panicked" ? "Nobody panicking next to them." : d.target === "ally" ? "Nobody next to them needs it." : null;
  return null;
}

/** Put down whoever this unit is carrying, on a free tile next to them. */
export function dropCarried(u: Unit) {
  const t = S.units.find(v => v.id === u.carrying);
  u.carrying = undefined;
  if (!t) return;
  t.carriedBy = undefined;
  const spot = DIRS.map(([dx, dy]) => [u.x + dx, u.y + dy]).find(([x, y]) => passable(x, y) && !S.units.some(v => v !== t && v.alive && !v.saved && !v.carriedBy && v.x === x && v.y === y));
  if (spot) [t.x, t.y] = spot;
  if (u.alive && !u.downed) log(`${full(u)} sets ${t.alive ? full(t) : `${t.name}'s body`} down.`);
}

/** Start using an ability: self-targeted ones happen at once, the rest wait for a target. */
export function startAbility(p: AbilityId, flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (S.mode === "ability" && S.ability === p) { S.mode = null; S.ability = null; hooks.update(); return; }
  const why = abilityCheck(u, p);
  if (why) { flash(why); return; }
  if (p === "doors") { if (u.ap < 1) { flash("No actions left this turn."); return; } S.mode = "doors"; hooks.update(); return; }
  if (def(p).target === "self" || def(p).target === "panel") { useAbility(u, p, u); return; }
  if (def(p).target === "doctor") { useAbility(u, p, S.statue); return; }
  S.mode = "ability"; S.ability = p; S.pending = null;
  hooks.update();
}

export function useAbility(u: Unit, p: AbilityId, t: Unit) {
  const d = def(p);
  if (abilityCheck(u, p) || !abilityTargets(u, p).includes(t)) return;
  const c = cost(u, p);
  if (p === "medkit" && c === 0) spend(u, "cm" + S.turn);
  if (d.uses) spend(u, p);
  u.ap = d.endsTurn ? 0 : u.ap - c;
  S.mode = null; S.ability = null;
  switch (p) {
    case "medkit":
      t.hp = Math.min(t.maxHp, t.hp + S.setup.mods.medkitHeal);
      log(`${full(u)} patches up ${full(t)} (+${S.setup.mods.medkitHeal} HP).`, "good");
      break;
    case "calm_words":
      t.san = Math.min(maxSanOf(t), t.san + 20);
      log(`${full(u)} talks ${full(t)} down (+20 sanity).`, "good");
      break;
    case "stabilize":
      t.stabilized = true;
      // with field medicine they get back up, barely
      if (S.setup.mods.standUp) { t.downed = false; t.hp = 1; t.ap = 0; t.bleed = undefined; log(`${full(t)} gets back on their feet with 1 HP.`, "good"); }
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
    case "dose":
      t.dosed = true; S.amnestics--;
      log(`${full(u)} doses ${t.name} with amnestics. They won't remember any of this.`, "good");
      break;
    case "secure":
      t.secured = true;
      log(`${full(u)} restrains the wounded Insurgent. They're coming back to Site-19.`, "good");
      break;
    case "calm":
      S.calmUntil = Math.max(S.calmUntil, S.turn + S.setup.mods.calmTurns - 1);
      loseSanity(u, 6);
      log(`${full(u)} talks to SCP-049 in an even voice. It inclines its head and listens. (−6 sanity)`, "key");
      S.mode = "lead"; S.selected = u;
      hooks.update();
      return;
    case "siren":
      S.siren = !S.siren;
      log(S.siren ? `${full(u)} switches the breach siren back on.` : `${full(u)} silences the breach siren. In the quiet, everyone can think again, and anything listening can hear the shots.`, "key");
      break;
    case "lockdown":
      S.lockedUntil = S.turn + S.setup.mods.lockdownTurns;
      log(`${full(u)} throws the lockdown: the surface hatch is sealed until turn ${S.lockedUntil + 1}.`, "good");
      break;
    case "restrain": {
      t.restrained = true; t.downed = true; t.stabilized = true; t.side = "dclass";
      if (hasPerk(u, "shepherd")) { t.downed = false; t.restrained = false; t.joined = true; t.stray = false; t.ap = 0; log(`${full(u)} brings ${t.name} into the work detail.`, "good"); }
      else log(`${full(u)} cuffs ${t.name}. They'll go back to holding.`, "good");
      break;
    }
    case "pickup":
      u.carrying = t.id; t.carriedBy = u.id; t.x = u.x; t.y = u.y;
      log(`${full(u)} lifts ${t.alive ? full(t) : `${t.name}'s body`}.`, "key");
      break;
    case "drop": dropCarried(u); break;
    case "exfil": {
      u.saved = true; u.staring = false; u.overwatch = false;
      const out = [full(u)];
      const carried = S.units.find(v => v.id === u.carrying);
      if (carried) { carried.saved = true; out.push(carried.alive ? full(carried) : `${carried.name}'s body`); }
      for (const r of S.units.filter(v => v.researcher && v.followId === u.id && v.alive && !v.saved && cheb(v.x, v.y, u.x, u.y) <= 2)) { r.saved = true; out.push(r.name); }
      if (S.selected === u) S.selected = null;
      log(`Out through the exit: ${out.join(", ")}.`, "good");
      break;
    }
    case "cutradio":
      t.saved = true; S.radioCut = true; S.ciDrop = undefined;
      log(`${full(u)} smashes the radio set. Nobody is coming to help them.`, "good"); banner("RADIO CUT", "#86c193");
      break;
    case "recover":
      t.saved = true;
      log(`${full(u)} gathers up the classified records.`, "good");
      break;
    case "restore":
      S.powerOn = true; S.setup.night = false;
      log(`${full(u)} gets the power back on. The lights come up across the wing.`, "good");
      break;
    case "scan": {
      const id = t === S.statue ? S.setup.scp ?? "173" : t.flesh ? "610" : S.has049 ? "049" : "instances";
      (S.scans ??= {})[id] = (S.scans[id] ?? 0) + 1;
      (u.used ??= {})["scan" + S.turn] = 1;
      log(`${full(u)} takes readings on ${t.name}. The labs will want these.`, "good");
      break;
    }
    case "hunker":
      u.hunkerUntil = S.turn;
      log(`${full(u)} hunkers down behind cover.`, "key");
      break;
    case "run_and_gun":
      u.ap += 1;
      log(`${full(u)}: run and gun.`, "key");
      break;
  }
  computeVis();
  hooks.update();
}
