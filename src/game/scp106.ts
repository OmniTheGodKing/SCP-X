// SCP-106's AI. It walks straight through walls, rots the floor it crosses, and pulls anyone it
// reaches into its pocket dimension, then sinks out of sight and rises somewhere else. Gunfire
// drives it under the floor for a turn. A living person left in the container is bait: it goes
// straight for them, feeds for a turn, and that turn is the chance to seal it in.
import { L, TS, area, cheb, inContainer, passable, type Pt } from "../core/grid";
import { S, canSee, computeVis, full, fx, highlight, hooks, humans, isPanicked, log, loseSanity, occupied, rand, seen, sleep, team } from "./state";
import type { Unit } from "./types";

export const OLD_MAN_MOVE = 4, SINK_AFTER_GRAB = 2;

const oldMan = () => S.statue;
export const isSunk = () => S.submerged;
export const isFeeding = () => S.feedTurn === S.turn - 1 || S.feedTurn === S.turn;
/** Living people in the container that SCP-106 will go for: D-Class, or secured Insurgents. */
export const bait = () => humans().filter(h => inContainer(h.x, h.y) && (h.side === "dclass" || h.side === "subject" || (h.side === "raider" && h.downed && h.secured)));

const inside = (x: number, y: number) => x > 0 && y > 0 && x < L.W - 1 && y < L.H - 1;
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Nearest free floor tile to a spot, for when a walk through walls ends inside one. */
function settle(x: number, y: number, avoidSight: boolean): Pt | null {
  let best: Pt | null = null, bd = Infinity;
  for (let ty = 1; ty < L.H - 1; ty++) for (let tx = 1; tx < L.W - 1; tx++) {
    if (!passable(tx, ty) || occupied(tx, ty, oldMan())) continue;
    const d = cheb(tx, ty, x, y) * 10 + (avoidSight && seen(tx, ty) ? 25 : 0);
    if (d < bd) { bd = d; best = [tx, ty]; }
  }
  return best;
}

/** Walk up to `steps` tiles straight at a target, through walls, rotting the floor on the way. */
function phaseToward(tx: number, ty: number, steps: number) {
  const m = oldMan();
  for (let i = 0; i < steps && cheb(m.x, m.y, tx, ty) > 1; i++) {
    const nx = m.x + sign(tx - m.x), ny = m.y + sign(ty - m.y);
    if (!inside(nx, ny) || occupied(nx, ny, m)) break;
    m.x = nx; m.y = ny;
    if (passable(nx, ny)) S.corroded.add(ny * L.W + nx);
  }
  if (!passable(m.x, m.y)) { const p = settle(m.x, m.y, false); if (p) [m.x, m.y] = p; }
}

function sink(turns: number) {
  S.submerged = true; S.sunkUntil = S.turn + turns - 1;
  if (seen(oldMan().x, oldMan().y)) log("SCP-106 sinks into the floor and is gone, leaving a black stain.", "key");
}

/** Pull someone into the pocket dimension. */
function grab(v: Unit) {
  const watchers = team().filter(m => m !== v && !isPanicked(m) && canSee(m, v.x, v.y));
  v.alive = false; v.taken = true; v.staring = false; v.downed = false;
  if (S.selected === v) S.selected = null;
  if (v.side === "mtf") S.stats.mtfLost++;
  else if (v.side === "raider") S.stats.raidersDown++;
  else S.stats.dLost++;
  const who = v.side === "mtf" ? full(v) : v.side === "raider" ? "an Insurgent" : v.name;
  if (watchers.length || v.side === "mtf" || v.side === "dclass") log(`SCP-106 takes hold of ${who} and drags them down into the floor. They are gone.`, "bad");
  else log(`A scream from the ${area(v.x, v.y)}, cut off as if by a closing door.`, "bad");
  for (const w of watchers) { loseSanity(w, 15, "witness"); w.witnessed = (w.witnessed ?? 0) + 1; }
  fx({ type: "flash", x: v.x * TS + TS / 2, y: v.y * TS + TS / 2, dur: 700, color: "#3a2a18" });
}

/** Rise again near someone nobody is watching (or near the bait, if there is any). */
function emerge() {
  const m = oldMan(), b = bait()[0];
  const prey = humans();
  const unwatched = prey.filter(h => !team().some(t => t !== h && canSee(t, h.x, h.y)));
  const target = b ?? (unwatched.length ? unwatched : prey)[rand(0, Math.max(0, (unwatched.length ? unwatched : prey).length - 1))];
  if (!target) return;
  const p = settle(target.x + rand(-2, 2), target.y + rand(-2, 2), !b);
  if (!p) return;
  [m.x, m.y] = p;
  S.submerged = false;
  fx({ type: "cue", cue: "rise", x: m.x * TS + TS / 2, y: m.y * TS + TS / 2, dur: 1100 });
  if (seen(m.x, m.y)) highlight(4, "#5a4020");
  if (seen(m.x, m.y)) log(`Black rot spreads across the floor of the ${area(m.x, m.y)}, and SCP-106 rises out of it.`, "bad");
  else log("Somewhere nearby, the smell of rot gets stronger.", "bad");
  S.corroded.add(m.y * L.W + m.x);
}

/** SCP-106's turn. */
export async function oldManPhase() {
  const m = oldMan();
  if (!S.has106 || S.sealed || !m.alive) return;
  if (S.submerged) {
    if (S.sunkUntil >= S.turn) return;
    emerge(); computeVis(); hooks.update(); await sleep(450); return;
  }
  // it stays a turn with the bait it has taken; if nobody seals it in, it sinks away
  if (S.feedTurn === S.turn - 1) {
    S.feedTurn = -1;
    if (seen(m.x, m.y)) log("SCP-106 is finished with its meal.", "key");
    sink(SINK_AFTER_GRAB); computeVis(); hooks.update(); await sleep(300); return;
  }
  const b = bait();
  if (b.length) {
    const v = b[0];
    phaseToward(v.x, v.y, OLD_MAN_MOVE);
    if (cheb(m.x, m.y, v.x, v.y) <= 1) {
      grab(v);
      m.x = v.x; m.y = v.y;   // it settles where the bait was, inside the container
      S.feedTurn = S.turn;
      log("SCP-106 is in the container with what's left of the bait. Seal it now.", "key");
    }
  } else {
    const prey = humans();
    const target = prey.sort((a, c) => cheb(a.x, a.y, m.x, m.y) - cheb(c.x, c.y, m.x, m.y))[0];
    if (target) {
      phaseToward(target.x, target.y, OLD_MAN_MOVE);
      const near = humans().filter(h => cheb(h.x, h.y, m.x, m.y) <= 1);
      if (near.length) {
        const v = near[rand(0, near.length - 1)];
        // a lead-lined suit holds for a turn: it has to keep its grip
        if (v.armorKind === "leadsuit" && v.seizedTurn !== S.turn - 1) {
          v.seizedTurn = S.turn;
          log(`SCP-106 takes hold of ${full(v)}, but the lead lining won't give. Get them away before next turn.`, "bad");
        } else { grab(v); sink(SINK_AFTER_GRAB); }
      }
    }
  }
  computeVis();
  hooks.update();
  await sleep(400);
}

/** Gunfire drives it under the floor until its next turn is over. */
export function shotAt106() {
  if (S.submerged || S.feedTurn >= S.turn - 1 && S.feedTurn !== -1) return;
  log("The rounds hit SCP-106 and it melts down into the floor.", "key");
  sink(1);
}
