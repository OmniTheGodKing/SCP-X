// SCP-173's AI. It moves one tile at a time, up to 8 tiles per turn, and freezes the moment
// it steps into the sight of anyone whose eyes are open. It kills anyone it reaches unseen and
// keeps going. It only knows what it can see from where it stands, plus gunfire it hears.
import { emitNoise } from "./noise";
import { openDoor, DIRS, L, TS, area, bfs, canStep, cheb, inContainer, passable, pathTo, type Pt } from "../core/grid";
import { rawSight, sightFrom } from "../core/sight";
import { kill } from "./combat";
import { STRAY_BLINK, blinkChance, prof } from "./profiles";
import { S, banner, canSee, computeVis, full, fx, highlight, hooks, humans, isBlind, isPanicked, isTeam, log, loseSanity, occupied, reveal, seen, sleep, team } from "./state";
import type { Unit } from "./types";
import { MAPS } from "../data/maps";

export const LUNGE = 8;
/** Unseen turns without a kill before SCP-173 makes for the surface hatch. */
export const ESCAPE_AT = 5;
const hatchOf = () => L.def.hatch;
/** It heads for the hatch once its drive is up, unless the hatch is locked down. */
export const escaping = () => !!hatchOf() && S.escapeDrive >= ESCAPE_AT && S.lockedUntil < S.turn;

export function rollBlinks() {
  const b = new Set<Unit>();
  for (const h of humans()) {
    if (Math.random() >= (h.side === "subject" ? STRAY_BLINK : blinkChance(h))) continue;
    const drops = h.staring ? h.items?.find(i => i.id === "eyedrops" && i.uses > 0) : undefined;
    if (drops) { drops.uses--; log(`${full(h)} uses eye drops and keeps staring.`, "key"); continue; }
    b.add(h);
  }
  return b;
}
// Not looking: mid-blink, eyes shut, or a team member who deliberately looked away from it.
const eyesOpen = (h: Unit, blinked: Set<Unit>) => !h.downed && !blinked.has(h) && !isPanicked(h) && !isBlind(h) && !(isTeam(h) && !h.staring && h.hadLos);
const watchedAt = (x: number, y: number, blinked: Set<Unit>) => humans().some(h => eyesOpen(h, blinked) && canSee(h, x, y));

// What SCP-173 knows: where it last saw people, and roughly where gunfire came from.
// It never knows exact positions it can't see. Leads fade after 3 turns.
function perceive(blinked: Set<Unit>) {
  const st = S.statue, seenNow: { u: Unit; blind: boolean }[] = [];
  S.checked.add(area(st.x, st.y));
  for (const [k, m] of S.mem) {
    const empty = rawSight(st.x, st.y, m.x, m.y) && !humans().some(h => h.x === m.x && h.y === m.y);
    if (S.turn - m.turn > 3 || empty) S.mem.delete(k);
  }
  for (const h of humans()) if (rawSight(st.x, st.y, h.x, h.y)) {
    S.mem.set(h.id, { x: h.x, y: h.y, turn: S.turn });
    seenNow.push({ u: h, blind: !eyesOpen(h, blinked) });
  }
  return seenNow;
}

// Where to head with no one to kill in view: the freshest lead, else a room it hasn't searched.
function goal173(): Pt[] {
  const st = S.statue;
  // the breach siren drowns out gunfire, so shots tell it nothing while it wails
  const leads = [...S.mem.entries()].filter(([k, m]) => (m.x !== st.x || m.y !== st.y) && !(S.siren && (k.startsWith("shot-") || k.startsWith("bang-")))).map(([, m]) => m);
  if (leads.length) {
    const newest = Math.max(...leads.map(m => m.turn));
    return leads.filter(m => m.turn === newest).map(m => [m.x, m.y] as Pt);
  }
  const unsearched = () => {
    const g: Pt[] = [];
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (passable(x, y) && !S.checked.has(area(x, y))) g.push([x, y]);
    return g;
  };
  let goals = unsearched();
  if (!goals.length) { S.checked.clear(); S.checked.add(area(st.x, st.y)); goals = unsearched(); }
  return goals;
}
function stepToward(goals: Pt[]): Pt | null {
  const st = S.statue;
  if (!goals.length) return null;
  const dist = bfs(goals, 999, (x, y) => occupied(x, y, st)).dist;
  let best: Pt | null = null, bd = Infinity;
  for (const [dx, dy] of DIRS) {
    const nx = st.x + dx, ny = st.y + dy, v = dist[ny * L.W + nx];
    if (!canStep(st.x, st.y, dx, dy) || occupied(nx, ny, st) || v < 0) continue;
    if (v < bd) { bd = v; best = [nx, ny]; }
  }
  return best;
}

function step173(path: Pt[], blinked: Set<Unit>) {
  const st = S.statue;
  let steps = 0;
  for (const [x, y] of path) {
    openDoor(x, y);
    st.x = x; st.y = y; steps++;
    if (steps === 1) emitNoise(x, y, "scp", st);
    if (watchedAt(x, y, blinked)) return { steps, frozen: true };
  }
  return { steps, frozen: false };
}

function killBy173(v: Unit) {
  const witnessed = isTeam(v) || seen(v.x, v.y);
  if (witnessed) { fx({ type: "cue", cue: "crack", x: v.x * TS + TS / 2, y: v.y * TS + TS / 2, dur: 500 }); highlight(6, "#d75b47"); }
  kill(v, true);
  reveal("hunt");
  if (isTeam(v)) log(`SCP-173 snapped ${full(v)}'s neck. Nobody saw it move.`, "bad");
  else if (v.side === "raider") log(witnessed ? "SCP-173 killed an Insurgent. Nobody saw it move." : `A scream from the ${area(v.x, v.y)}, cut short. It wasn't one of yours.`, "key");
  else if (witnessed) log(`SCP-173 killed ${v.name}. Nobody saw it move.`, "bad");
  else log(`A scream from the ${area(v.x, v.y)}, cut short.`, "bad");
}

// Bold hunter: it walks toward its leads one tile at a time and only learns who is looking
// when it gets there.
function hunt(blinked: Set<Unit>) {
  const st = S.statue;
  if (watchedAt(st.x, st.y, blinked)) return null;
  let budget = LUNGE, moved = 0, kills = 0;
  for (let guard = 0; guard < 30 && budget > 0; guard++) {
    const seenNow = perceive(blinked);
    const hatch = hatchOf();
    if (hatch && escaping()) {
      const next = stepToward([hatch]);
      if (next) {
        const r = step173([next], blinked);
        budget--; moved++;
        if (st.x === hatch[0] && st.y === hatch[1] && !r.frozen) { S.escaped = true; break; }
        if (r.frozen) break;
        continue;
      }
    }
    const res = bfs([[st.x, st.y]], budget, (x, y) => occupied(x, y, st));

    // easiest kill: someone in view who isn't looking, by the shortest route, preferring people on their own
    let best: { v: Unit; x: number; y: number; score: number } | null = null;
    for (const { u: v, blind } of seenNow) {
      if (!blind) continue;
      for (const [dx, dy] of DIRS) {
        const ax = v.x + dx, ay = v.y + dy, d = res.dist[ay * L.W + ax];
        if (d < 0 || !canStep(ax, ay, -dx, -dy)) continue;
        const crowd = seenNow.filter(o => o.u !== v && cheb(o.u.x, o.u.y, v.x, v.y) <= 4).length;
        const score = d + crowd * 3;
        if (!best || score < best.score) best = { v, x: ax, y: ay, score };
      }
    }
    if (best) {
      const r = step173(pathTo(res, best.x, best.y) || [], blinked);
      budget -= r.steps; moved += r.steps;
      if (r.frozen) break;
      killBy173(best.v); S.mem.delete(best.v.id); kills++;
      continue;
    }

    const next = stepToward(goal173());
    if (!next) break;
    const r = step173([next], blinked);
    budget--; moved++;
    if (r.frozen) break;
  }
  return { moved, kills };
}

/** Lets SCP-173 act with the given people blinking. Returns false if someone still held it. */
export async function release(blinked: Set<Unit>) {
  const st = S.statue, fromX = st.x, fromY = st.y, wasSeen = seen(st.x, st.y);
  const before = escaping();
  const r = hunt(blinked);
  if (!r) return false;
  // a free turn without a kill makes it restless; a kill keeps it busy here
  S.escapeDrive = r.kills ? Math.max(0, S.escapeDrive - 2) : S.escapeDrive + 1;
  computeVis();
  if (S.escaped) { log("SCP-173 reached the surface hatch. It is outside Site-19.", "bad"); banner("SCP-173 HAS ESCAPED", "#d75b47"); hooks.update(); await sleep(450); return true; }
  if (!before && escaping()) log("Something scrapes along the east lab floor, toward the surface hatch.", "bad");
  if (r.moved && wasSeen) {
    fx({ type: "ghost", x: fromX, y: fromY, dur: 1400 });
    if (!seen(st.x, st.y)) log("SCP-173 is no longer where it was.", "bad");
  }
  if (r.moved && seen(st.x, st.y)) log(`SCP-173 froze in the ${area(st.x, st.y)}, in someone's sight.`, "key");
  if (r.moved && inContainer(st.x, st.y)) { log("SCP-173 stopped inside the transport container.", "good"); reveal("cont"); }
  hooks.update();
  await sleep(450);
  return true;
}
