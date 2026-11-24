// Version 12 squad techniques in a mission: what a squad's specialty lets its people do on the map, through the
// game's own systems (doors and walls, cover tiles, carrying and exits, overwatch and suppression, noise, sight,
// SCP-610's flesh and fire). Squad-level things stay squad-level: one cooldown per technique per squad, one shared
// pool of specialist kit per squad (the same object in every member's item bar), participants who must be beside the
// user. Balance numbers come from data/specialties.ts.
import { crossingTile, deconArea, isolateEquipment, isolationTargets, openCrossing } from "./contamination";
import { rnd } from "../core/rng";
import { TS, DIRS, DRUM, EXIT, FLOOR, FULL, HALF, L, PART, STEEL, WALL, bump, cheb, passable, tileAt } from "../core/grid";
import { coverSides } from "../core/geom";
import { KITS, SQUAD_BALANCE, TECHS, type TechDef } from "../data/specialties";
import type { SpecialtyId } from "../data/mtf";
import { S, canSee, computeVis, full, isPanicked, isTeam, log } from "./state";
import { emitNoise, facingTo } from "./noise";
import { damage } from "./combat";
import { infect, onFlesh } from "./fire";
import type { ItemId, Unit } from "./types";

type Pt = [number, number];
const idx = (x: number, y: number) => y * L.W + x;
const inMap = (x: number, y: number) => x > 0 && y > 0 && x < L.W - 1 && y < L.H - 1;
const occupied = (x: number, y: number) => S.units.some(v => v.alive && !v.saved && !v.carriedBy && v.x === x && v.y === y);
const door = (x: number, y: number) => L.door.get(idx(x, y));
const onExitTile = (x: number, y: number) => L.exitMap[idx(x, y)] === 0;
const ensure = () => { S.squadCd ??= {}; S.cordon ??= new Set(); S.firebreak ??= new Map(); S.trails ??= new Map(); S.techUsed ??= []; S.techSquads ??= []; S.clues ??= 0; S.samples ??= 0; S.marks ??= new Set(); S.silent ??= {}; };

/** Item placed beside the operative, and the technique it is. */
export const PLACED_TECH: Partial<Record<ItemId, string>> = {
  breach_charge: "sq_controlled_breach", barricade: "sq_perimeter", cordon_kit: "sq_isolation_line", firebreak_kit: "sq_firebreak",
  decon_agent: "sq_decon_sweep", demo_charge: "sq_shaped_breach", sandbags: "sq_field_fortify", field_tags: "sq_designate_insertion", sample_case: "sq_sealed_retrieval",
};

const stageOf = (u: Unit) => u.stage ?? 0;
/** A squad passive applies from Drilled, to this specialty's people only. */
export const passive = (u: Unit, sp: SpecialtyId) => u.specialty === sp && stageOf(u) >= 1;
const squadmates = (u: Unit) => S.units.filter(v => v !== u && v.alive && !v.downed && !v.saved && !v.carriedBy && v.squadId && v.squadId === u.squadId);
const ableNear = (u: Unit, r = 1) => squadmates(u).filter(v => cheb(v.x, v.y, u.x, u.y) <= r && !isPanicked(v));

/** Does this unit's squad know the technique, and are they certified for its kit? (Campaigns from before MTFs:
 *  anyone may set a breaching charge or a barricade, as before.) */
export function techKnown(u: Unit, id: string) {
  const t = TECHS[id];
  if (!t || u.side !== "mtf") return false;
  if (!u.specialty) return !S.setup.mtfRules && (id === "sq_controlled_breach" || id === "sq_perimeter");
  if (!KITS[u.specialty].techs.includes(id) && !(id === "sq_controlled_breach" && u.specialty === "demolitions")) return false;
  return true;
}
/** Actions it costs this unit, after passives (never below 1; a cheaper passive and doctrine don't stack). */
export function techCost(u: Unit, id: string) {
  const t = TECHS[id];
  let ap = t.ap;
  const cheaper = (id === "sq_coordinated_entry" && passive(u, "breach")) || (id === "sq_perimeter" && passive(u, "security"))
    || (id === "sq_emplace" && (passive(u, "heavyweapons") || (u.mtfSpec === "heavy" && stageOf(u) >= 1)))
    || (id === "sq_field_fortify" && (passive(u, "engineering") || (u.mtfSpec === "heavy" && stageOf(u) >= 1)))
    || (id === "sq_anchor" && u.specialty === "heavyinf" && stageOf(u) >= 2);
  if (cheaper) ap -= 1;
  return Math.max(1, ap);
}
const cdKey = (u: Unit, id: string) => `${u.squadId ?? "x"}:${id}`;
const cooldownLeft = (u: Unit, id: string) => { ensure(); return Math.max(0, (S.squadCd![cdKey(u, id)] ?? 0) - S.turn); };
/** Turns until the squad can use it again (0 = ready). */
export const techCooldown = (u: Unit, id: string) => cooldownLeft(u, id);
/** Why it can't be used right now, or null. */
export function techWhy(u: Unit, id: string): string | null {
  const t = TECHS[id];
  if (!techKnown(u, id)) return "Their squad doesn't train for that.";
  if (t.incomplete) return `Not available yet: ${t.incomplete}`;
  if (u.specialty && t.consumes && !u.qualified) return "They aren't certified for this kit yet (a squad drill certifies them).";
  if (u.ap < techCost(u, id)) return techCost(u, id) > 1 ? "Needs both actions." : "No actions left this turn.";
  const cd = cooldownLeft(u, id); if (cd) return `The squad can do this again in ${cd} turn${cd > 1 ? "s" : ""}.`;
  if (t.participants > 1 && ableNear(u).length < t.participants - 1) return `Needs ${t.participants - 1} more of the squad beside them.`;
  if (t.needs && !u.items?.some(i => i.id === t.needs)) return `Needs the squad's ${t.needs === "stretcher" ? "stretcher" : t.needs}.`;
  return null;
}
function spendTech(u: Unit, id: string, item?: { uses: number }) {
  ensure();
  const t = TECHS[id];
  u.ap = Math.max(0, u.ap - techCost(u, id));
  const cd = t.cooldown - (u.branch === "speed" ? SQUAD_BALANCE.veteranSpeed : 0);
  if (cd > 0) S.squadCd![cdKey(u, id)] = S.turn + cd;
  if (item && !(u.branch === "reliability" && rnd() < SQUAD_BALANCE.veteranReliability)) item.uses--;
  S.techUsed!.push(id);
  if (u.squadId && !S.techSquads!.includes(u.squadId)) S.techSquads!.push(u.squadId);
}

// ---------------------------------------------------------------- kit placed on a tile

/** Tiles this unit could place the item on (all beside them). */
export function placeOptions(u: Unit, item: ItemId): Set<number> {
  ensure();
  const out = new Set<number>();
  const id = PLACED_TECH[item]; if (!id) return out;
  for (const [dx, dy] of DIRS) {
    const x = u.x + dx, y = u.y + dy;
    if (!inMap(x, y)) continue;
    if (placeValid(u, item, x, y)) out.add(idx(x, y));
  }
  return out;
}
function placeValid(u: Unit, item: ItemId, x: number, y: number): boolean {
  const t = tileAt(x, y), d = door(x, y), clear = t === FLOOR && !d && !occupied(x, y);
  switch (item) {
    // a breaching charge: doors, partitions, barricades; never a wall (that's Demolitions)
    case "breach_charge": return (!!d && d.state !== "destroyed") || t === PART || t === HALF;
    case "demo_charge": return (!!d && d.state !== "destroyed") || t === PART || t === HALF || t === FULL || (t === WALL && inMap(x, y));
    case "barricade": return clear && !onExitTile(x, y);
    case "sandbags": return (clear && !onExitTile(x, y)) || (!!d && d.state === "destroyed");
    case "cordon_kit": return passable(x, y) && !S.cordon!.has(idx(x, y));
    case "firebreak_kit": case "decon_agent": return passable(x, y);
    case "field_tags": return clear && !onExitTile(x, y);
    case "sample_case": return onFlesh(x, y);
    default: return false;
  }
}
export function placeCheck(u: Unit, item: ItemId): string | null {
  const id = PLACED_TECH[item]; if (!id) return "Not something to place.";
  const why = techWhy(u, id); if (why) return why;
  return placeOptions(u, item).size ? null : item === "sample_case" ? "No SCP-610 growth beside them." : "Nowhere beside them to use it.";
}

/** Place kit at (x, y): the technique's effect on the map, its cost and its noise. */
export function place(u: Unit, it: { id: ItemId; uses: number }, x: number, y: number) {
  ensure();
  const id = PLACED_TECH[it.id]!;
  if (placeCheck(u, it.id) || !placeValid(u, it.id, x, y)) return false;
  spendTech(u, id, it);
  const i = idx(x, y), t = tileAt(x, y), d = door(x, y);
  S.effects.push({ type: "cue", t0: performance.now(), dur: 600, x: u.x * TS + TS / 2, y: u.y * TS + TS / 2, cue: "place" });
  switch (it.id) {
    case "breach_charge": case "demo_charge": {
      const heavy = it.id === "demo_charge";
      let what = "";
      if (d && d.state !== "destroyed") { d.state = "destroyed"; what = "the door"; }
      else if (t === PART) { L.grid[y][x] = FLOOR; what = "the partition"; }
      else if (t === HALF || t === FULL) { L.grid[y][x] = FLOOR; what = "the barricade"; }
      else if (t === WALL && heavy) { L.grid[y][x] = FLOOR; what = "the wall"; }
      bump();
      emitNoise(x, y, "explosion", u);
      S.collateral = (S.collateral ?? 0) + (heavy ? 1 : 0);
      // the blast goes through to the far side; with Charge Efficiency it spares the squad on this side
      const bx = x + (x - u.x), by = y + (y - u.y), power = heavy ? 3 : 2;
      for (const v of S.units.filter(v => v.alive && !v.saved && cheb(v.x, v.y, bx, by) <= 1 && (!isTeam(v) || (heavy && !passive(u, "demolitions") && cheb(v.x, v.y, x, y) <= 1 && v !== u)))) { S.hitKind = "explosive"; damage(v, Math.max(0, power - (v.armor ?? 0)), u); }
      log(`${full(u)} ${heavy ? "fires a demolition charge" : "blows a breaching charge"}: ${what} is gone.`, "key");
      break;
    }
    case "barricade":
      L.grid[y][x] = HALF; (S.placedKit ??= new Map()).set(i, "barricade"); bump();
      log(`${full(u)} sets up a portable barrier: half cover, and in the way.`, "key");
      break;
    case "sandbags":
      if (d && d.state === "destroyed") { d.state = "closed"; (S.placedKit ??= new Map()).set(i, "rehung"); log(`${full(u)} rehangs the blown door with timber and wire.`, "key"); }
      else { L.grid[y][x] = FULL; (S.placedKit ??= new Map()).set(i, "sandbags"); log(`${full(u)} sandbags the position: full cover.`, "key"); }
      bump();
      break;
    case "cordon_kit": {
      // across the operative's facing: the target tile and its two neighbours perpendicular to the way they face
      const [dx, dy] = [Math.sign(x - u.x), Math.sign(y - u.y)];
      const [px, py] = dx && dy ? [dx, -dy] : [dy, dx];
      const line = [[x, y], [x + px, y + py], [x - px, y - py]].filter(([a, b]) => inMap(a, b) && passable(a, b));
      for (const [a, b] of line) S.cordon!.add(idx(a, b));
      log(`${full(u)} runs an isolation line across ${line.length} tile${line.length > 1 ? "s" : ""}. The flesh won't cross it while it stands.`, "key");
      break;
    }
    case "firebreak_kit": case "decon_agent": {
      const area = square(u, x, y);
      if (it.id === "firebreak_kit") {
        for (const [a, b] of area) { S.fires.delete(idx(a, b)); S.firebreak!.set(idx(a, b), S.turn + 4); }
        log(`${full(u)} soaks and clears a firebreak: nothing burns there for 4 turns.`, "key");
      } else {
        let flesh = 0, cleared = 0;
        for (const [a, b] of area) { const k = idx(a, b); if (S.corroded.delete(k)) cleared++; if (S.fires.delete(k)) cleared++; if (S.flesh.has(k)) flesh++; }
        cleared += deconArea(area);
        log(`${full(u)} sweeps the area with the decon rig${cleared ? `: ${cleared} tile${cleared > 1 ? "s" : ""} or people cleaned` : ", nothing removable there"}.${flesh ? " SCP-610's growth doesn't wash off." : ""}`, "key");
      }
      break;
    }
    case "field_tags":
      L.grid[y][x] = EXIT; (L.exitMap as Int16Array)[i] = 0; bump();
      S.marks!.add(i);
      log(`${full(u)} marks and radios in an extraction point.`, "key");
      break;
    case "sample_case": {
      S.samples! += 1;
      const suited = u.armorKind === "contsuit" || u.armorKind === "hazmat";
      const risk = suited ? (passive(u, "hazrecovery") ? 0 : 0.1) : 0.5;
      log(`${full(u)} seals a sample of the growth for the lab.`, "good");
      if (rnd() < risk) infect(u, "handling the sample");
      break;
    }
  }
  computeVis();
  return true;
}
/** A 2×2 block starting at (x, y) and extending away from the operative. */
function square(u: Unit, x: number, y: number): Pt[] {
  const sx = x >= u.x ? 1 : -1, sy = y >= u.y ? 1 : -1;
  return ([[x, y], [x + sx, y], [x, y + sy], [x + sx, y + sy]] as Pt[]).filter(([a, b]) => inMap(a, b) && passable(a, b));
}

// ---------------------------------------------------------------- techniques on people

const adjacentShutDoor = (u: Unit): Pt | null => { for (const [dx, dy] of DIRS) { const d = door(u.x + dx, u.y + dy); if (d && d.state === "closed") return [u.x + dx, u.y + dy]; } return null; };
const hasCover = (u: Unit) => coverSides(u.x, u.y).some(v => v > 0);
const enemies = () => S.units.filter(v => v.alive && !v.downed && !v.saved && (v.side === "raider" || v.side === "zombie" || (v.side === "anomaly" && !v.object)));
export const freshTrail = (u: Unit) => {
  ensure();
  const keep = 3 + (passive(u, "tracking") ? 2 : 0);
  for (const [dx, dy] of [[0, 0], ...DIRS]) { const k = idx(u.x + dx, u.y + dy), t = S.trails!.get(k); if (t && (t.tagged || S.turn - t.turn <= keep)) return { k, t }; }
  return null;
};

/** Who or what the technique can be used on (self-targeted ones return the user when it applies). */
export function techTargets(u: Unit, id: string): Unit[] {
  ensure();
  switch (id) {
    case "sq_coordinated_entry": case "sq_covert_access": return adjacentShutDoor(u) ? [u] : [];
    case "sq_hold_line": return ableNear(u).some(v => v.overwatch) ? [u] : [];
    case "sq_two_person_evac": return u.carrying && ableNear(u).some(v => !v.carrying) ? [u] : [];
    case "sq_secure_transfer": return u.carrying && onExitTile(u.x, u.y) ? [u] : [];
    case "sq_covering_lane": return u.gun && u.gun.ammo >= 1 ? [u] : [];
    case "sq_suppression_shift": return S.units.some(v => v.suppressedBy === u.id && (v.suppressedUntil ?? -1) >= S.turn) ? enemies().filter(v => v.suppressedBy !== u.id && canSee(u, v.x, v.y)) : [];
    case "sq_anchor": return hasCover(u) && u.hasArmor ? [u] : [];
    case "sq_emplace": return u.gun?.type === "mg" && !u.emplaced ? [u] : [];
    case "sq_pack": return u.emplaced ? [u] : [];
    case "sq_interdiction": return u.emplaced && (u.gun?.ammo ?? 0) >= 4 ? enemies().filter(v => canSee(u, v.x, v.y)) : [];
    case "sq_restore": return DIRS.some(([dx, dy]) => door(u.x + dx, u.y + dy)?.state === "destroyed") ? [u] : [];
    case "sq_silent_approach": return [u];
    case "sq_observation_post": return hasCover(u) && !u.observing ? [u] : [];
    case "sq_confirm_target": return enemies().filter(v => canSee(u, v.x, v.y));
    case "sq_read_sign": return freshTrail(u) ? [u] : [];
    case "sq_mark_trail": return freshTrail(u) && u.items?.some(i => i.id === "field_tags" && i.uses > 0) ? [u] : [];
    case "sq_route_recon": return [u];
    case "sq_safe_clearance": return DIRS.some(([dx, dy]) => tileAt(u.x + dx, u.y + dy) === DRUM) ? [u] : [];
    // Phase 6: the techniques that waited for the contamination model and a paired move
    case "sq_controlled_crossing": return crossingTile(u) !== null && !S.crossings?.has(crossingTile(u)!) ? [u] : [];
    case "sq_equipment_isolation": return isolationTargets(u).length ? [u] : [];
    case "sq_protected_advance": return hasCover(u) && u.ap >= 1 && ableNear(u).some(v => v.ap >= 1 && !!v.gun && v.gun.ammo >= 1) ? [u] : [];
    default: return [];
  }
}

/** Use a technique. The caller has checked techWhy and the target. */
export function runTech(u: Unit, id: string, t: Unit) {
  ensure();
  const tags = u.items?.find(i => i.id === "field_tags" && i.uses > 0);
  spendTech(u, id, id === "sq_mark_trail" ? tags : undefined);
  switch (id) {
    case "sq_coordinated_entry": case "sq_covert_access": {
      const [x, y] = adjacentShutDoor(u)!;
      if (id === "sq_covert_access" && enemies().some(v => v.side === "raider" && canSee(v, x, y))) {
        door(x, y)!.state = "open"; bump(); emitNoise(x, y, "door", u);
        log(`${full(u)} tries the door quietly, but someone is watching it: it's open, and they've been heard.`, "bad");
        break;
      }
      door(x, y)!.state = "open"; bump();
      if (id === "sq_coordinated_entry") {
        emitNoise(x, y, "door", u);
        const cover = ableNear(u).find(v => v.ap >= 1 && v.gun && v.gun.ammo >= 1);
        if (cover) { cover.ap -= 1; cover.overwatch = true; cover.overwatchShots = Math.max(1, cover.overwatchShots ?? 0); cover.facing = facingTo(x - cover.x, y - cover.y); log(`${full(u)} opens the door while ${full(cover)} covers the room from beside it.`, "key"); }
        else log(`${full(u)} opens the door; nobody is ready to cover it.`);
      } else log(`${full(u)} eases the door open without a sound.`, "good");
      break;
    }
    case "sq_hold_line": {
      const line = [u, ...ableNear(u)].filter(v => v.overwatch);
      for (const v of line) v.overwatchShots = (v.overwatchShots ?? 1) + 1;
      log(`${full(u)} calls the line: ${line.map(v => v.call).join(", ")} hold their crossing (one more reaction shot each).`, "key");
      break;
    }
    case "sq_two_person_evac": u.evacTurn = S.turn; log(`${full(u)} and a squadmate take the stretcher: the carry doesn't slow them this turn.`, "key"); break;
    case "sq_secure_transfer": {
      const c = S.units.find(v => v.id === u.carrying);
      if (c) { c.saved = true; c.carriedBy = undefined; u.carrying = undefined; log(`${full(u)} hands ${c.alive ? full(c) : `${c.name}'s body`} over at the extraction point.`, "good"); }
      break;
    }
    case "sq_covering_lane":
      u.overwatch = true; u.overwatchShots = 2; u.laneTurn = S.turn; u.ap = 0;
      log(`${full(u)} covers a lane: two reaction shots, each pins its target.`, "key");
      break;
    case "sq_suppression_shift": {
      for (const v of S.units.filter(v => v.suppressedBy === u.id)) { v.suppressedBy = undefined; v.suppressedUntil = undefined; }
      if (u.gun) u.gun.ammo = Math.max(0, u.gun.ammo - 1);
      t.suppressedUntil = S.turn + 1; t.suppressedBy = u.id; t.overwatch = false;
      emitNoise(u.x, u.y, "gunfire", u);
      log(`${full(u)} shifts the suppressing fire onto ${t.name}.`, "key");
      break;
    }
    case "sq_anchor": u.hunkerUntil = S.turn; u.anchoredUntil = S.turn + 1; log(`${full(u)} braces in cover: suppression won't pin them this enemy turn.`, "key"); break;
    case "sq_emplace": u.emplaced = true; log(`${full(u)} emplaces the gun: two reaction shots on overwatch, but they can't move until they pack up.`, "key"); break;
    case "sq_pack": u.emplaced = false; if (u.specialty === "heavyweapons" && (u.stage ?? 0) >= 2 && u.gun) u.gun.ammo = u.gun.mag; log(`${full(u)} packs up the gun.`); break;
    case "sq_interdiction": {
      const hit = enemies().filter(v => cheb(v.x, v.y, t.x, t.y) <= 1 && canSee(u, v.x, v.y));
      if (u.gun) u.gun.ammo = Math.max(0, u.gun.ammo - 4);
      for (const v of hit) { v.suppressedUntil = S.turn + 1; v.suppressedBy = u.id; v.overwatch = false; }
      emitNoise(u.x, u.y, "gunfire", u);
      log(`${full(u)} sweeps the area: ${hit.length} pinned.`, "key");
      break;
    }
    case "sq_restore": {
      const p = DIRS.map(([dx, dy]) => [u.x + dx, u.y + dy] as Pt).find(([x, y]) => door(x, y)?.state === "destroyed")!;
      door(p[0], p[1])!.state = "closed"; bump();
      log(`${full(u)} rehangs the door: it shuts again.`, "key");
      break;
    }
    case "sq_silent_approach": S.silent![u.squadId ?? u.id] = S.turn; log(`${full(u)}'s squad moves quietly this turn (half the noise, one tile less).`, "key"); break;
    case "sq_controlled_crossing": openCrossing(u); break;
    case "sq_equipment_isolation": isolateEquipment(u); break;
    case "sq_protected_advance": {
      const partner = ableNear(u).find(v => v.ap >= 1 && !!v.gun && v.gun.ammo >= 1)!;
      partner.ap -= 1; partner.coverFor = u.id; partner.overwatch = false;
      u.protectedTurn = S.turn;
      log(`${full(u)} moves out under ${full(partner)}'s fire: shots at them this turn are harder, and ${full(partner)} answers anyone who takes one.`, "key");
      break;
    }
    case "sq_observation_post": u.observing = true; observe(); log(`${full(u)} sets up an observation post: 2 tiles more sight, and every enemy crossing it is logged.`, "key"); break;
    case "sq_confirm_target": {
      const per = u.specialty === "surveillance" && (u.stage ?? 0) >= 2 ? 2 : 1;
      S.clues! += per;
      log(`${full(u)} confirms ${t.name}: a verified observation for the report.`, "good");
      break;
    }
    case "sq_read_sign": {
      const f = freshTrail(u)!, age = S.turn - f.t.turn;
      const names = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
      const [dx, dy] = DIRS8[f.t.dir], ax = u.x + dx * 4, ay = u.y + dy * 4;
      S.marks!.add(idx(Math.max(1, Math.min(L.W - 2, ax)), Math.max(1, Math.min(L.H - 2, ay))));
      log(`${full(u)} reads the sign: it heads ${names[f.t.dir]}${u.specialty === "tracking" && (u.stage ?? 0) >= 2 ? `, about ${age} turn${age === 1 ? "" : "s"} old` : ""}. Not a position, a direction.`, "good");
      break;
    }
    case "sq_mark_trail": { const f = freshTrail(u)!; f.t.tagged = true; log(`${full(u)} tags the trail: it won't fade.`, "key"); break; }
    case "sq_route_recon": {
      const r = 8 + (passive(u, "forwardrecon") ? 2 : 0);
      let fires = 0, flesh = 0, drums = 0;
      for (let y = Math.max(1, u.y - r); y <= Math.min(L.H - 2, u.y + r); y++) for (let x = Math.max(1, u.x - r); x <= Math.min(L.W - 2, u.x + r); x++) {
        if (cheb(x, y, u.x, u.y) > r || !canSee(u, x, y)) continue;
        const k = idx(x, y);
        if (S.fires.has(k)) { fires++; S.marks!.add(k); }
        if (S.flesh.has(k)) { flesh++; S.marks!.add(k); }
        if (tileAt(x, y) === DRUM) { drums++; S.marks!.add(k); }
      }
      S.clues! += 1;
      log(`${full(u)} surveys the route: ${fires} fire, ${flesh} growth and ${drums} fuel-drum tile${fires + flesh + drums === 1 ? "" : "s"} marked in sight.`, "good");
      break;
    }
    case "sq_safe_clearance": {
      const p = DIRS.map(([dx, dy]) => [u.x + dx, u.y + dy] as Pt).find(([x, y]) => tileAt(x, y) === DRUM)!;
      L.grid[p[1]][p[0]] = HALF; bump();
      log(`${full(u)} makes the fuel drum safe and tips it over: cover now, not a bomb.`, "key");
      break;
    }
  }
  computeVis();
}
const DIRS8: Pt[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// ---------------------------------------------------------------- hooks the rest of the rules call

/** Movement: the stretcher team doesn't slow, silent approach costs a tile, an emplaced gun doesn't move. */
export function moveAdjust(u: Unit) {
  if (u.emplaced) return -99;
  let m = 0;
  if (u.carrying && u.evacTurn === S?.turn) m += 1;
  if (S?.silent && u.squadId && S.silent[u.squadId] === S.turn) m -= 1;
  return m;
}
/** How far this unit's footsteps carry (1 = normal). Silent approach and Signature Discipline don't stack: the
 *  quieter one applies. */
export function footstepScale(u: Unit) {
  let k = 1;
  if (S?.silent && u.squadId && S.silent[u.squadId] === S.turn) k = Math.min(k, 0.5);
  if (passive(u, "infiltration")) k = Math.min(k, 0.8);
  return k;
}
/** Sight: an observation post adds 2; Watch Discipline adds 1 to a still surveillance operative in cover. */
export function sightAdjust(u: Unit) {
  if (u.observing) return 2;
  if (passive(u, "surveillance") && u.movedTurn !== S.turn && hasCover(u)) return 1;
  return 0;
}
/** Suppression: Fire Discipline spends 1 round instead of 2; an anchored unit can't be pinned. */
export const suppressRounds = (u: Unit) => passive(u, "fire") ? 1 : 2;
export const pinnable = (u: Unit) => (u.anchoredUntil ?? -1) < S.turn;
/** A covering-lane reaction shot also pins its target. */
export function afterReaction(w: Unit, target: Unit) {
  if (w.laneTurn !== undefined && S.turn - w.laneTurn <= 1 && target.alive && pinnable(target)) { target.suppressedUntil = S.turn + 1; target.suppressedBy = w.id; target.overwatch = false; }
}
/** Fire and flesh: cordons and firebreaks keep SCP-610's growth out; firebreaks keep fire out; fire burns a cordon. */
export const blocksFlesh = (k: number) => !!S?.cordon?.has(k) || (S?.firebreak?.get(k) ?? -1) >= S.turn;
export const blocksFire = (k: number) => (S?.firebreak?.get(k) ?? -1) >= S.turn;
export function burnCordon(k: number) { if (S?.cordon?.delete(k)) log("Fire burns through the isolation line.", "bad"); }
/** Flesh contact: Zone Discipline (in a sealed suit) and Handling Protocol (carrying, sealed) keep them clean. */
export function fleshSafe(u: Unit) {
  const sealed = u.armorKind === "contsuit" && !u.suitTorn;
  if (sealed && passive(u, "quarantine")) return true;
  if (passive(u, "hazrecovery") && (u.armorKind === "contsuit" || u.armorKind === "hazmat") && !u.suitTorn && u.carrying) return true;
  return false;
}
/** SCP-106's corrosion: Clean Route keeps a decon operative from being hurt by it. */
export const corrosionSafe = (u: Unit) => passive(u, "decon");
/** Bleed-out: a downed person beside a drilled Recovery operative gets one turn's grace, once. */
export function bleedGrace(v: Unit) {
  if (v.graceUsed) return false;
  const helper = S.units.find(w => w.alive && !w.downed && w.side === "mtf" && passive(w, "recovery") && cheb(w.x, w.y, v.x, v.y) <= 1);
  if (helper) { v.graceUsed = true; log(`${full(helper)} keeps ${full(v)} going a little longer.`, "good"); return true; }
  return false;
}
/** Enemies leave trails as they move (Tracking reads them). */
export function leaveTrail(v: Unit, x: number, y: number, nx: number, ny: number) {
  if (isTeam(v) || v.side === "civilian") return;
  ensure();
  S.trails!.set(idx(x, y), { turn: S.turn, dir: facingTo(nx - x, ny - y), who: v.id });
}
/** Observation posts log the enemies crossing their sight (at most 3 clues a mission from posts). */
export function observe() {
  ensure();
  S.observed ??= [];
  for (const u of S.units.filter(u => u.alive && u.observing && !u.downed)) {
    for (const v of enemies()) if (canSee(u, v.x, v.y) && !S.observed.includes(v.id)) {
      S.observed.push(v.id);
      if (S.observed.length <= 3) { S.clues! += 1; log(`${full(u)} logs ${v.name} crossing the observation post.`, "good"); }
    }
  }
}
export const ITEM_STEEL = STEEL;

/** The deployed squad's shared specialist stock: one object per item, in every member's item bar. */
const sharedCache = new WeakMap<object, { id: ItemId; uses: number; shared: true }[]>();
export function sharedKitFor(setup: { kit?: Partial<Record<ItemId, number>> }) {
  let k = sharedCache.get(setup);
  if (!k) { k = Object.entries(setup.kit ?? {}).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => ({ id: id as ItemId, uses: n as number, shared: true as const })); sharedCache.set(setup, k); }
  return k;
}
