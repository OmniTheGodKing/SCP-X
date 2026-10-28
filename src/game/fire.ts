// Fire and SCP-610. Fire burns for a few turns, hurts anyone standing in it, spreads into desks,
// crates and flesh, and sets off fuel drums. SCP-610's flesh spreads every turn from its core;
// anyone left standing on it without an intact containment suit is infected, and anyone infected
// turns into one of its instances 5 turns later, for good. Only fire can kill the core.
import { DIRS, DRUM, FLOOR, HALF, L, STEEL, TS, WALL, area, cheb, passable, tileAt } from "../core/grid";
import { damage } from "./combat";
import { S, computeVis, full, fx, highlight, hooks, isTeam, log, rand, seen, sleep } from "./state";
import type { Unit } from "./types";

export const FIRE_TURNS = 3, BURN_DAMAGE = 2, INFECTION_TURNS = 5, SUIT_TEAR = 0.6, CORE_BURN = 4;
const idx = (x: number, y: number) => y * L.W + x;
export const burning = (x: number, y: number) => (S.fires.get(idx(x, y)) ?? -1) >= S.turn;
export const onFlesh = (x: number, y: number) => S.flesh.has(idx(x, y));

/** Set a tile alight. Fuel drums explode; walls and steel don't burn. */
const wet = () => S.setup.weather === "rain" || S.setup.weather === "storm";
export function ignite(x: number, y: number, turns = FIRE_TURNS - (wet() ? 1 : 0)) {
  const t = tileAt(x, y);
  if (t === WALL || t === STEEL) return;
  if (t === DRUM) { explodeDrum(x, y); return; }
  // the core is wet with blood: fire on it goes out after a turn
  const last = S.turn + (S.core && S.core.x === x && S.core.y === y ? 1 : turns);
  S.fires.set(idx(x, y), Math.max(S.fires.get(idx(x, y)) ?? -1, last));
  S.hadFire = true;
  if (S.flesh.delete(idx(x, y)) && seen(x, y)) fx({ type: "flash", x: x * TS + TS / 2, y: y * TS + TS / 2, dur: 300, color: "#ff9a50" });
}

function explodeDrum(x: number, y: number) {
  L.grid[y][x] = FLOOR;
  fx({ type: "blast", x: x * TS + TS / 2, y: y * TS + TS / 2, r: 1.6, dur: 700 });
  if (seen(x, y)) highlight(5, "#ff9a50");
  if (seen(x, y)) log(`A fuel drum in the ${area(x, y)} goes up.`, "key");
  for (const v of S.units.filter(u => u.alive && !u.saved && !u.carriedBy && cheb(u.x, u.y, x, y) <= 1 && u.side !== "anomaly")) damage(v, 3);
  for (const [dx, dy] of [[0, 0], ...DIRS]) ignite(x + dx, y + dy);
}

/** Hurt whoever is standing in fire: 2 damage, double for SCP-610's instances. */
function burnUnits() {
  for (const u of S.units.filter(u => u.alive && !u.saved && !u.carriedBy && u.side !== "anomaly" && burning(u.x, u.y))) {
    const dmg = u.flesh ? BURN_DAMAGE * 2 : BURN_DAMAGE;
    if (isTeam(u) || seen(u.x, u.y)) log(`${u.side === "mtf" ? full(u) : u.flesh ? "An SCP-610 instance" : u.name} burns (${dmg}).`, u.flesh || u.side === "raider" ? "good" : "bad");
    damage(u, dmg);
  }
}

/** One turn of fire: damage, the core cooking, spreading into furniture and flesh, then dying down. */
export async function firePhase() {
  if (!S.fires.size) return;
  burnUnits();
  if (S.core && burning(S.core.x, S.core.y)) {
    S.core.hp -= CORE_BURN;
    log(S.core.hp > 0 ? `The flesh core blackens and splits (${S.core.hp} left).` : "The flesh core bursts and burns away. What's left of SCP-610 here is dying.", "good");
  }
  const spread: [number, number][] = [];
  for (const [i, until] of S.fires) {
    if (until < S.turn) continue;
    const x = i % L.W, y = (i / L.W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, t = tileAt(nx, ny);
      const damp = wet() ? 0.5 : 1;   // rain slows the spread
      if (t === DRUM || (onFlesh(nx, ny) && Math.random() < 0.6 * damp) || (t === HALF && Math.random() < 0.35 * damp)) spread.push([nx, ny]);
    }
    // furniture that was burning is gone when the fire is
    if (until === S.turn && tileAt(x, y) === HALF) L.grid[y][x] = FLOOR;
  }
  for (const [x, y] of spread) ignite(x, y);
  for (const [i, until] of [...S.fires]) if (until < S.turn) S.fires.delete(i);
  computeVis(); hooks.update();
  await sleep(250);
}

/** The flesh grows a little every turn, more the worse the outbreak is. */
export function spreadFlesh() {
  if (!S.core || S.core.hp <= 0 || !S.flesh.size) return;
  const edge: number[] = [];
  for (const i of S.flesh) {
    const x = i % L.W, y = (i / L.W) | 0;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, n = idx(nx, ny); if (passable(nx, ny) && !S.flesh.has(n) && !burning(nx, ny)) edge.push(n); }
  }
  for (let k = S.setup.severity ?? 1; k > 0 && edge.length; k--) S.flesh.add(edge.splice(rand(0, edge.length - 1), 1)[0]);
}

const sealedSuit = (u: Unit) => u.armorKind === "contsuit" && !u.suitTorn;
/** Infect someone. It can't be undone. */
export function infect(u: Unit, how: string) {
  if (u.infectedTurn !== undefined || u.flesh) return;
  u.infectedTurn = S.turn;
  log(`${u.side === "mtf" ? full(u) : u.name} is infected (${how}). They will turn in ${INFECTION_TURNS} turns, and nothing can stop it.`, "bad");
}
/** At the end of a turn: anyone standing on flesh without a sealed suit is infected. */
export function fleshContact() {
  for (const u of S.units.filter(u => u.alive && !u.saved && !u.carriedBy && u.side !== "anomaly" && !u.flesh && onFlesh(u.x, u.y)))
    if (!sealedSuit(u)) infect(u, "contact with the flesh");
}
/** A melee hit from an instance: always infects without a suit, and tears a suit 60% of the time. */
export function fleshBite(v: Unit) {
  if (sealedSuit(v)) {
    if (Math.random() >= SUIT_TEAR) { log(`${full(v)}'s containment suit holds.`, "good"); return; }
    v.suitTorn = true;
    log(`The blow tears ${full(v)}'s containment suit open.`, "bad");
  }
  infect(v, "a wound from an instance");
}
/** Anyone infected 5 turns ago turns now, wherever they are, even outside the map. */
export function turnInfected() {
  for (const u of S.units.filter(u => u.alive && u.infectedTurn !== undefined && !u.flesh && S.turn - u.infectedTurn >= INFECTION_TURNS)) {
    const wasOut = u.saved, who = u.side === "mtf" ? full(u) : u.name;
    u.flesh = true; u.side = "zombie"; u.hp = 6; u.maxHp = 6; u.armor = 0; u.downed = false; u.staring = false; u.overwatch = false; u.carrying = undefined;
    if (S.selected === u) S.selected = null;
    if (wasOut) { u.alive = false; log(`${who}, already out of the area, turned. A cleanup team burned what was left.`, "bad"); continue; }
    log(`${who} turns. What stands up is part of SCP-610 now.`, "bad");
  }
}
