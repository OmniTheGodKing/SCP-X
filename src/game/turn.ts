// Player actions and the turn cycle: your move, SCP-173, the Insurgency, then loose D-Class.
import { L, TS, cheb, inContainer, nearContainer, pathTo, bfs, canStep, DIRS, type Pt } from "../core/grid";
import { sightFrom } from "../core/sight";
import { fire, moveUnit } from "./combat";
import { recruitStrays, subjectPhase } from "./dclass";
import { insurgentsStare, raiderPhase } from "./insurgency";
import { missionResult } from "./mission";
import { maxSanOf, prof } from "./profiles";
import { release, rollBlinks } from "./scp173";
import {
  S, alive, canAct, canSee, computeVis, full, fx, hooks, humans, isPanicked, isTeam, label, log, loseSanity,
  occupied, reveal, seen, sleep, starers, team, unitAt,
} from "./state";
import type { Unit } from "./types";

const DRAG_SANITY = 5;

// Staring units can move anywhere within range, provided every tile on the way keeps sight of SCP-173.
export function reachFor(u: Unit | null) {
  if (!u || u.ap < 1) return null;
  const move = prof(u).move;
  if (u.staring) {
    const st = S.statue;
    return bfs([[u.x, u.y]], move, (x, y) => occupied(x, y, u) || !sightFrom(x, y, st.x, st.y));
  }
  return bfs([[u.x, u.y]], u.ap * move, (x, y) => occupied(x, y, u));
}
export const moveCost = (u: Unit, d: number) => d <= prof(u).move ? 1 : 2;

// Drag: the dragger steps up to their drag distance and SCP-173 slides into the tile they
// just left. Every position it passes through must be in sight of someone else who is staring.
export function dragOptions(u: Unit) {
  const out = new Map<number, Pt[]>(), st = S.statue;
  const watchers = team().filter(w => w !== u && w.staring && !isPanicked(w));
  const watched = (x: number, y: number) => watchers.some(w => sightFrom(w.x, w.y, x, y));
  const free = (x: number, y: number, ignoreStatue: boolean) =>
    !S.units.some(o => o !== u && o.alive && !o.saved && o.x === x && o.y === y && !(ignoreStatue && o === st));
  if (!watched(u.x, u.y)) return out;
  for (const [dx, dy] of DIRS) {
    const ax = u.x + dx, ay = u.y + dy;
    if (!canStep(u.x, u.y, dx, dy) || !free(ax, ay, false)) continue;
    if (!out.has(ay * L.W + ax)) out.set(ay * L.W + ax, [[ax, ay]]);
    if (prof(u).drag < 2 || !watched(ax, ay)) continue;
    for (const [ex, ey] of DIRS) {
      const bx = ax + ex, by = ay + ey;
      if ((bx === u.x && by === u.y) || !canStep(ax, ay, ex, ey) || !free(bx, by, true)) continue;
      if (!out.has(by * L.W + bx)) out.set(by * L.W + bx, [[ax, ay], [bx, by]]);
    }
  }
  return out;
}

export function stareCheck(u: Unit | null) {
  if (!u) return "Select someone.";
  if (u.staring) return null;
  if (S.sealed) return "SCP-173 is sealed.";
  if (isPanicked(u)) return "Their eyes are shut.";
  if (u.ap < 1) return "No actions left this turn.";
  if (!canSee(u, S.statue.x, S.statue.y)) return "No line of sight to SCP-173.";
  return null;
}
export function callCheck() {
  if (S.sealed) return "SCP-173 is sealed.";
  if (S.called) return "The blink has already been called this turn.";
  if (!starers().length) return "Nobody is staring at SCP-173.";
  return null;
}
export function dragCheck(u: Unit | null) {
  const st = S.statue;
  if (!u || !isTeam(u)) return "Select someone.";
  if (S.sealed) return "SCP-173 is sealed.";
  if (u.ap < 1) return "No actions left this turn.";
  if (cheb(u.x, u.y, st.x, st.y) !== 1) return "Stand next to SCP-173 first.";
  if (!team().some(w => w !== u && w.staring && !isPanicked(w))) return "Someone else must be staring at SCP-173.";
  if (!dragOptions(u).size) return "No room to drag it while it stays in sight.";
  return null;
}
export function sealCheck(u: Unit | null) {
  const st = S.statue;
  if (S.sealed) return "Already sealed.";
  if (!u || u.side !== "mtf") return "Only an operative can seal the container.";
  if (!inContainer(st.x, st.y)) return "SCP-173 isn't in the container yet.";
  if (u.ap < 1) return "No actions left this turn.";
  if (!nearContainer(u.x, u.y)) return "Stand at the container door to close it.";
  if (humans().some(h => inContainer(h.x, h.y))) return "Get everyone out of the container first.";
  if (!starers().length) return "Someone must be staring at SCP-173 while the door closes.";
  return null;
}

export function startPlayerTurn(first: boolean) {
  S.phase = "player"; S.called = false; S.mode = null;
  for (const m of team()) {
    m.overwatch = false;
    m.ap = isPanicked(m) ? 0 : m.staring ? 1 : 2;
    if (isPanicked(m)) log(`${full(m)} has their eyes shut and will not act this turn.`, "bad");
  }
  computeVis();
  S.selected = team().find(m => m.ap > 0) || null;
  if (!first) log(`Turn ${S.turn}.`, "key");
  hooks.update();
}

export function select(u: Unit) { S.selected = u; S.pending = null; S.mode = null; hooks.update(); }

export function selectNext() {
  const t = team();
  if (!t.length) return;
  const start = Math.max(0, t.indexOf(S.selected!));
  for (let k = 1; k <= t.length; k++) {
    const m = t[(start + k) % t.length];
    if (m.ap > 0) { select(m); return; }
  }
}

/** Tap/click on a tile. On touch, the first tap previews and the second confirms. */
export async function onTap(x: number, y: number, touch: boolean, flash: (t: string) => void) {
  if (!canAct()) return;
  const u = unitAt(x, y);
  if (u && isTeam(u)) { select(u); return; }
  const sel = S.selected;
  if (!sel || sel.ap < 1) return;
  const confirm = () => {
    if (!touch) return true;
    if (S.pending && S.pending.x === x && S.pending.y === y) return true;
    S.pending = { x, y }; S.hover = { x, y }; hooks.update(); return false;
  };
  if (S.mode === "drag") {
    const path = dragOptions(sel).get(y * L.W + x);
    if (!path) { S.mode = null; hooks.update(); return; }
    if (!confirm()) return;
    await doDrag(sel, path);
    return;
  }
  if (u && u.side === "anomaly" && seen(x, y)) {
    reveal("arms");
    log("Rounds would do nothing to SCP-173. It has to go in the container.");
    hooks.update(); return;
  }
  if (u && u.side === "raider" && seen(x, y)) {
    if (sel.side !== "mtf") { flash("D-Class are unarmed."); return; }
    if (!canSee(sel, x, y)) { flash(`${sel.call} has no line of sight to that target.`); return; }
    if (!confirm()) return;
    S.busy = true; S.pending = null; sel.ap = 0;
    await fire(sel, u, false);
    S.busy = false; afterAction(); return;
  }
  if (u) return;
  const res = reachFor(sel);
  const d = res ? res.dist[y * L.W + x] : -1;
  if (d <= 0 || !res) return;
  const cost = moveCost(sel, d);
  if (cost > sel.ap) return;
  if (!confirm()) return;
  S.busy = true; S.pending = null;
  sel.ap -= cost;
  await moveUnit(sel, pathTo(res, x, y) || []);
  S.busy = false; afterAction();
}

function afterAction() {
  recruitStrays();
  computeVis();
  if (checkEnd()) return;
  if (S.selected && (!S.selected.alive || !isTeam(S.selected) || S.selected.ap === 0)) selectNext();
  hooks.update();
}

export function doOverwatch() {
  const u = S.selected;
  if (!canAct() || !u || u.side !== "mtf" || u.ap < 1) return;
  u.overwatch = true; u.ap = 0;
  log(`${full(u)} on overwatch.`);
  afterAction();
}

export function toggleStare(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (u.staring) {
    u.staring = false;
    log(`${full(u)} looks away from SCP-173.`, "bad");
    hooks.update(); return;
  }
  const why = stareCheck(u);
  if (why) { flash(why); return; }
  u.ap = Math.min(u.ap - 1, 1); u.staring = true;
  log(`${full(u)}: “Eyes on. Do not blink.”`, "key");
  reveal("hold");
  afterAction();
}

export async function callBlink(flash: (t: string) => void) {
  if (!canAct()) return;
  const why = callCheck();
  if (why) { flash(why); return; }
  S.busy = true; S.called = true; S.pending = null; S.mode = null;
  const ss = starers();
  log(`${label(ss[0])}: “Blinking on three.” ${ss.length > 1 ? "Everyone staring blinks together." : "They blink."}`, "key");
  reveal("blink");
  hooks.update();
  await sleep(300);
  if (!(await release(new Set(ss)))) log("Someone else still had eyes on it. SCP-173 didn't move.");
  S.busy = false; afterAction();
}

export function toggleDrag(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct() || !u) return;
  if (S.mode === "drag") { S.mode = null; hooks.update(); return; }
  if (u.staring) {
    // the dragger can't also be the one holding it; check someone else is
    if (!team().some(w => w !== u && w.staring && !isPanicked(w))) { flash("Someone else must be staring at SCP-173."); return; }
    u.staring = false;
    log(`${label(u)} looks away to get a grip on SCP-173.`);
  }
  const why = dragCheck(u);
  if (why) { flash(why); return; }
  S.mode = "drag"; S.pending = null;
  hooks.update();
}

async function doDrag(u: Unit, path: Pt[]) {
  const st = S.statue;
  S.busy = true; S.mode = null; S.pending = null;
  for (const [x, y] of path) {
    const px = u.x, py = u.y;
    u.x = x; u.y = y; st.x = px; st.y = py;
    computeVis();
    hooks.update();
    await sleep(140);
  }
  u.ap = 0;
  reveal("drag");
  log(`${label(u)} drags SCP-173 ${path.length} tile${path.length > 1 ? "s" : ""}${inContainer(st.x, st.y) ? " into the container" : ""}.`, inContainer(st.x, st.y) ? "good" : "");
  loseSanity(u, DRAG_SANITY);
  // the dragger looks straight back at it once they let go
  if (u.alive && isTeam(u) && !isPanicked(u) && canSee(u, st.x, st.y)) { u.staring = true; u.hadLos = true; }
  S.busy = false; afterAction();
}

export function doSeal(flash: (t: string) => void) {
  const u = S.selected;
  if (!canAct()) return;
  const why = sealCheck(u);
  if (why || !u) { flash(why || "Select an operative."); return; }
  u.ap = 0; u.sealed = true; S.sealed = true;
  for (const m of team()) m.staring = false;
  log(`${full(u)} swings the container door shut and locks it. SCP-173 is sealed.`, "good");
  const [cx, cy] = L.contTiles[1] || L.contTiles[0];
  fx({ type: "text", x: cx * TS + 16, y: cy * TS - 4, text: "SEALED", color: "#86c193", dur: 1600 });
  afterAction();
}

// Quiet turns restore sanity: not staring, and no sanity lost this turn.
function recoverSanity() {
  for (const m of team()) {
    if (m.staring || m.lostSanTurn === S.turn) continue;
    m.san = Math.min(maxSanOf(m), m.san + prof(m).recover);
  }
}

export async function endTurn() {
  if (!canAct()) return;
  S.busy = true; S.pending = null; S.mode = null;
  S.phase = "anomaly"; hooks.update();
  await anomalyPhase();
  if (checkEnd()) { S.busy = false; return; }
  S.phase = "hand"; hooks.update();
  await raiderPhase(checkEnd);
  if (checkEnd()) { S.busy = false; return; }
  S.phase = "subjects"; hooks.update();
  await subjectPhase();
  if (checkEnd()) { S.busy = false; return; }
  recoverSanity();
  S.turn++;
  S.busy = false;
  startPlayerTurn(false);
}

async function anomalyPhase() {
  if (S.sealed) return;
  for (const m of starers()) { loseSanity(m, prof(m).drain); reveal("mind"); }
  insurgentsStare();
  computeVis();
  const blinked = rollBlinks();
  const ss = starers(), holders = ss.filter(m => !blinked.has(m));
  if (ss.length && !holders.length) {
    log(ss.length > 1 ? "Everyone staring blinked at the same moment." : `${label(ss[0])} blinked.`, "bad");
    reveal("blink");
  }
  if (!(await release(blinked))) {
    if (holders.length) log(`SCP-173 held by ${holders.map(label).join(", ")}.`);
    else if (seen(S.statue.x, S.statue.y)) log("SCP-173 stayed put. Someone else still has eyes on it.");
    await sleep(250);
  }
}

export function checkEnd() {
  if (S.over) return true;
  if (S.sealed) { finish(true, false); return true; }
  if (!alive("mtf").length) { finish(false, false); return true; }
  return false;
}

export function evacuate() {
  if (!canAct()) return;
  log("Epsilon-11 pulls out of the wing. SCP-173 is still loose.", "bad");
  finish(false, true);
}

function finish(win: boolean, evacuated: boolean) {
  S.over = true; S.phase = "over";
  S.result = missionResult(win, evacuated);
  log(win ? "Incident closed. SCP-173 recontained." : evacuated ? "Wing sealed with SCP-173 inside." : "Incident open. MTF Epsilon-11 lost.", win ? "good" : "bad");
  hooks.update();
  hooks.finished(S.result);
}
