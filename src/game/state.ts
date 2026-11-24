// The running mission and the helpers everything else uses to read it.
import { DETECTED, IDENTIFIED, perceive } from "./perception";
import { rnd } from "../core/rng";
import { noteContacts } from "./noise";
import { L, R } from "../core/grid";
import { sightFrom } from "../core/sight";
import { adjustLoss, rangeOf, type LossKind } from "./perks";
import { maxSanOf, prof } from "./profiles";
import type { Effect, MissionResult, MissionState, Unit } from "./types";

export let S: MissionState;
export function setMission(state: MissionState) { S = state; }

/** UI callbacks, set by the mission view. */
export const hooks = {
  update: () => {},
  log: () => {},
  finished: (_result: MissionResult) => {},
  /** After any player action: the turn rules check whether anyone can still act (turn.ts sets this). */
  acted: () => {},
};

export const isTeam = (u: Unit) => u.side === "mtf" || u.side === "dclass";
// Downed operatives are alive but out of action: they don't act, see, stare or count as standing.
export const alive = (side: Unit["side"]) => S.units.filter(u => u.side === side && u.alive && !u.saved && !u.downed);
export const team = () => S.units.filter(u => isTeam(u) && u.alive && !u.saved && !u.downed);
export const humans = () => S.units.filter(u => u.alive && !u.saved && !u.carriedBy && !u.record && u.side !== "anomaly" && u.side !== "zombie");
export const isPanicked = (u: Unit) => (u.side === "mtf" || u.side === "raider") && u.panicUntil >= S.turn;
export const isBlind = (u: Unit) => (u.blindUntil ?? -1) >= S.turn;
export const unitAt = (x: number, y: number) => S.units.find(u => u.alive && !u.saved && !u.carriedBy && u.x === x && u.y === y);
export const occupied = (x: number, y: number, except?: Unit) =>
  S.units.some(u => u !== except && u.alive && !u.saved && !u.carriedBy && u.x === x && u.y === y);
/** At night anything inside a flare's light can be seen from as far as in daylight. */
export const lit = (x: number, y: number) => S.flares.some(f => f.until >= S.turn && Math.max(Math.abs(f.x - x), Math.abs(f.y - y)) <= 2);
/** Tactical overhaul T3: someone sees a tile (or whoever is on it) if there is a line of sight and they can at least
 *  make out a shape there: light, distance, weather, smoke and movement decide (perception.ts). */
export const canSee = (u: Unit, x: number, y: number) => perceive(u, x, y, unitAt(x, y)).level >= DETECTED;
/** What the team as a whole makes of a unit: the best any member manages (0 unseen, 1 detected, 2 identified). */
export const teamPerception = (t: Unit) => S.perceived?.get(t.id) ?? 0;
export const seen = (x: number, y: number) => S.vis[y * L.W + x] === 1;
export const starers = () => team().filter(m => m.staring);
export const label = (u: Unit) => u.call || u.name;
export const full = (u: Unit) => u.side === "mtf" ? `${u.call} ${u.name}` : u.name;
export const canAct = () => !!S && !S.busy && S.phase === "player" && !S.over;

/** Phase 6: until the team has identified the anomaly, the log and banners don't name it. */
export function veil(text: string) {
  const intel = S?.setup.intel, id = S?.setup.scp;
  if (!intel || intel.identified || S.identified || !id) return text;
  const name = `SCP-${id}`;
  return text.split(`${name}-2`).join("the walking dead").split(name).join("the entity")
    .replace(/(^|[.!?]\s+)the /g, (_m: string, p: string) => `${p}The `);
}
export function log(text: string, kind = "") {
  if (!S) return;
  text = veil(text);
  S.log.unshift({ t: S.turn, text, kind });
  if (S.log.length > 150) S.log.pop();
  hooks.log();
}

/** Concealment ends for the whole team (XCOM style): something loud, or someone was spotted. */
export function breakConcealment(why: string) {
  if (!S.concealed) return;
  S.concealed = false;
  log(`Concealment broken: ${why}.`, "bad");
  hooks.update();
}

export function reveal(id: string) {
  if (S.known.has(id) || !S.has173) return;
  S.known.add(id); S.fresh.add(id);
  log("File SCP-173 updated.", "key");
}

type NewEffect = Effect extends infer E ? E extends Effect ? Omit<E, "t0"> : never : never;
/** Add an effect, optionally starting a little later (a hit lands when the tracer gets there). */
export function fx(e: NewEffect, delay = 0) { S.effects.push({ ...e, t0: performance.now() + delay } as Effect); }
/** Phase 4G: a consequential moment (shake and edge flash, if the viewer wants them) and a turning-point banner. */
export const highlight = (mag: number, color = "#ffffff") => fx({ type: "jolt", mag, color, dur: 380 });
export const banner = (text: string, color = "#d8bf86") => fx({ type: "banner", text: text === text.toUpperCase() ? veil(text).toUpperCase() : veil(text), color, dur: 1300 });

/** Enemy-turn pacing, set from the viewer's settings: Fast cuts every pause outside the player's turn to a third. */
/** headless: rules run with no animation waits at all (tests and the lab's AI preview; Tactical overhaul T6.1). */
export const pace = { fast: false, headless: false };
export const sleep = (ms: number) => pace.headless ? Promise.resolve() : new Promise<void>(r => setTimeout(r, pace.fast && S && S.phase !== "player" ? ms / 3 : ms));
export const rand = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

export function computeVis() {
  const { W, H } = L;
  S.vis.fill(0);
  for (const m of team()) {
    if (isPanicked(m) || isBlind(m)) continue;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (!S.vis[y * W + x] && canSee(m, x, y)) S.vis[y * W + x] = 1;
  }
  // Tactical overhaul T3: what the team makes of each other unit (a shape, or who and what it is)
  S.perceived = new Map();
  for (const t of S.units) {
    if (!t.alive || t.saved || t.carriedBy || isTeam(t)) continue;
    let best = 0;
    for (const m of team()) { if (isPanicked(m) || isBlind(m)) continue; best = Math.max(best, perceive(m, t.x, t.y, t).level); if (best === IDENTIFIED) break; }
    if (best) S.perceived.set(t.id, best as 1 | 2);
  }
  for (let i = 0; i < W * H; i++) if (S.vis[i]) S.explored[i] = 1;
  const st = S.statue;
  // Phase 6: a good look at the anomaly identifies it on the ground
  if (!S.identified && st.alive && !st.object && S.perceived.get(st.id) === 2) identifiedHere();
  if (S.has173 && !S.sealed && seen(st.x, st.y)) S.lastSeen = { x: st.x, y: st.y, turn: S.turn };
  updateStares();
  noteContacts();
}

function identifiedHere() {
  S.identified = true;
  (S.observedProps ??= new Set()).add("appearance");
  const intel = S.setup.intel;
  if (!intel || intel.identified) return;
  S.statue.name = `SCP-${S.setup.scp}`;
  log(`Field identification: the cause is ${S.statue.name}. Its file is open to the team now.`, "key");
  banner(`IDENTIFIED: ${S.statue.name}`, "#e0b050");
  // a hidden objective to contain it here appears once the team knows what it's dealing with
  const sec = S.objectives?.find(o => o.id === "secure" && o.hidden);
  if (sec) { sec.hidden = false; log(`New objective: ${sec.text}.`, "key"); }
}

// "Do not blink" switches on automatically the moment someone on the team gains sight of
// SCP-173, costing 1 action if they have one. Looking away is free; it re-arms only after
// sight is lost and regained.
function updateStares() {
  if (!S.has173) return;
  const st = S.statue;
  for (const m of team()) {
    const pan = isPanicked(m) || isBlind(m);
    const eyes = !S.sealed && !pan && canSee(m, st.x, st.y);
    if (m.staring && !eyes) {
      m.staring = false;
      if (!S.sealed && !pan) log(`${full(m)} lost sight of SCP-173.`, "bad");
    }
    if (eyes && !m.hadLos && !m.staring) {
      m.staring = true;
      if (S.phase === "player") m.ap = Math.min(Math.max(0, m.ap - 1), 1);
      if (!m.seen173) {
        m.seen173 = true;
        const hit = adjustLoss(m, prof(m).firstSight, "sight", team());
        m.san = Math.max(0, m.san - hit);
        m.lostSanTurn = S.turn;
        log(`${full(m)} comes face to face with SCP-173 (−${hit} sanity) and locks eyes on it.`, "key");
      } else log(`${full(m)} spots SCP-173 and locks eyes on it.`, "key");
      reveal("hold");
    }
    m.hadLos = eyes;
  }
}

export function loseSanity(u: Unit, n: number, kind: LossKind = "other") {
  u.san = Math.max(0, u.san - adjustLoss(u, n, kind, team()));
  u.lostSanTurn = S.turn;
  if (u.san > 0) return;
  if (u.side === "dclass" && team().some(a => a.perks?.includes("wrangler") && Math.max(Math.abs(a.x - u.x), Math.abs(a.y - u.y)) <= 3)) { u.san = 1; return; }
  if (u.side === "mtf") {
    u.panics = (u.panics ?? 0) + 1;
    u.panicUntil = S.turn + 1; u.san = Math.round(maxSanOf(u) * 0.4); u.staring = false; u.overwatch = false;
    log(`${full(u)} can't take any more and shuts their eyes.`, "bad");
  } else if (u.side === "dclass") {
    u.side = "subject"; u.fled = true; u.staring = false; u.ap = 0;
    if (S.selected === u) S.selected = null;
    log(`${u.name} breaks and runs for the exit.`, "bad");
  }
}
