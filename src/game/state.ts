// The running mission and the helpers everything else uses to read it.
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
};

export const isTeam = (u: Unit) => u.side === "mtf" || u.side === "dclass";
// Downed operatives are alive but out of action: they don't act, see, stare or count as standing.
export const alive = (side: Unit["side"]) => S.units.filter(u => u.side === side && u.alive && !u.saved && !u.downed);
export const team = () => S.units.filter(u => isTeam(u) && u.alive && !u.saved && !u.downed);
export const humans = () => S.units.filter(u => u.alive && !u.saved && u.side !== "anomaly");
export const isPanicked = (u: Unit) => (u.side === "mtf" || u.side === "raider") && u.panicUntil >= S.turn;
export const isBlind = (u: Unit) => (u.blindUntil ?? -1) >= S.turn;
export const unitAt = (x: number, y: number) => S.units.find(u => u.alive && !u.saved && u.x === x && u.y === y);
export const occupied = (x: number, y: number, except?: Unit) =>
  S.units.some(u => u !== except && u.alive && !u.saved && u.x === x && u.y === y);
export const canSee = (u: Unit, x: number, y: number) => sightFrom(u.x, u.y, x, y, rangeOf(u));
export const seen = (x: number, y: number) => S.vis[y * L.W + x] === 1;
export const starers = () => team().filter(m => m.staring);
export const label = (u: Unit) => u.call || u.name;
export const full = (u: Unit) => u.side === "mtf" ? `${u.call} ${u.name}` : u.name;
export const canAct = () => !!S && !S.busy && S.phase === "player" && !S.over;

export function log(text: string, kind = "") {
  if (!S) return;
  S.log.unshift({ t: S.turn, text, kind });
  if (S.log.length > 150) S.log.pop();
  hooks.log();
}

export function reveal(id: string) {
  if (S.known.has(id)) return;
  S.known.add(id); S.fresh.add(id);
  log("File SCP-173 updated.", "key");
}

type NewEffect = Effect extends infer E ? E extends Effect ? Omit<E, "t0"> : never : never;
export function fx(e: NewEffect) { S.effects.push({ ...e, t0: performance.now() } as Effect); }

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export function computeVis() {
  const { W, H } = L;
  S.vis.fill(0);
  for (const m of team()) {
    if (isPanicked(m) || isBlind(m)) continue;
    const r = rangeOf(m) + 1;
    for (let y = Math.max(0, m.y - r); y <= Math.min(H - 1, m.y + r); y++)
      for (let x = Math.max(0, m.x - r); x <= Math.min(W - 1, m.x + r); x++)
        if (!S.vis[y * W + x] && canSee(m, x, y)) S.vis[y * W + x] = 1;
  }
  for (let i = 0; i < W * H; i++) if (S.vis[i]) S.explored[i] = 1;
  const st = S.statue;
  if (S.has173 && !S.sealed && seen(st.x, st.y)) S.lastSeen = { x: st.x, y: st.y, turn: S.turn };
  updateStares();
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
