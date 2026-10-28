// SCP-049's AI and its SCP-049-2 instances. SCP-049 walks slowly and kills with a touch. Its
// real work is the "cure": it goes to any fresh body it knows of and spends one turn on it, and
// the body rises as SCP-049-2. Gunfire only staggers it. Talking to it calms it for a turn.
import { DIRS, L, TS, area, bfs, canStep, cheb, passable, pathTo, type Pt } from "../core/grid";
import { rawSight } from "../core/sight";
import { damage, kill } from "./combat";
import { S, canSee, computeVis, full, fx, highlight, hooks, humans, isPanicked, log, loseSanity, occupied, rand, seen, sleep, team } from "./state";
import type { Unit } from "./types";
import { fleshBite, infect } from "./fire";

export const PLAGUE_MOVE = 4, ZOMBIE_MOVE = 4, CALM_RANGE = 3, CALM_SANITY = 6, LEAD_STEPS = 3;

const doctor = () => S.statue;
/** Bodies SCP-049 could still raise. */
export const freshBodies = () => S.units.filter(u => !u.alive && !u.saved && !u.cured && !u.taken && u !== S.statue && u.side !== "zombie");
export const zombies = () => S.units.filter(u => u.side === "zombie" && u.alive && !u.voice && !u.host);
export const isCalm = () => S.calmUntil >= S.turn;
export const isStaggered = () => (doctor().staggeredUntil ?? -1) >= S.turn;

function walk(u: Unit, goals: Pt[], steps: number) {
  if (!goals.length) return 0;
  const dist = bfs(goals, 999, (x, y) => occupied(x, y, u)).dist;
  let moved = 0;
  for (; moved < steps; moved++) {
    let best: Pt | null = null, bd = dist[u.y * L.W + u.x];
    if (bd === 0) break;
    for (const [dx, dy] of DIRS) {
      const nx = u.x + dx, ny = u.y + dy, v = dist[ny * L.W + nx];
      if (!canStep(u.x, u.y, dx, dy) || occupied(nx, ny, u) || v < 0) continue;
      if (bd < 0 || v < bd) { bd = v; best = [nx, ny]; }
    }
    if (!best) break;
    [u.x, u.y] = best;
  }
  return moved;
}
const besideTiles = (t: Unit): Pt[] => DIRS.map(([dx, dy]) => [t.x + dx, t.y + dy] as Pt).filter(([x, y]) => passable(x, y) && canStep(x, y, t.x - x, t.y - y));

/** Raise a body as SCP-049-2, next to SCP-049. */
function cure(b: Unit) {
  b.cured = true;
  let [x, y] = [b.x, b.y];
  if (occupied(x, y)) {
    const free = besideTiles(b).find(([fx_, fy]) => !occupied(fx_, fy));
    if (!free) return;
    [x, y] = free;
  }
  const z: Unit = { id: "z" + b.id, side: "zombie", name: "SCP-049-2", x, y, hp: 4, maxHp: 4, san: 0, aim: 0, alive: true, saved: false, ap: 0,
    overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0 };
  S.units.push(z);
  const watchers = team().filter(m => !isPanicked(m) && canSee(m, x, y));
  if (watchers.length || seen(x, y)) {
    log(`SCP-049 bends over ${b.side === "mtf" ? full(b) : b.name}'s body and works for a moment. It gets up again as SCP-049-2.`, "bad");
    for (const m of watchers) { loseSanity(m, 10, "witness"); m.witnessed = (m.witnessed ?? 0) + 1; }
  } else log(`Somewhere in the ${area(x, y)}, something that was dead gets back up.`, "bad");
  fx({ type: "cue", cue: "raise", x: x * TS + TS / 2, y: y * TS + TS / 2, dur: 900 });
  if (seen(x, y)) highlight(3, "#e8e4d0");
}

function touch(v: Unit) {
  const wasSeen = seen(v.x, v.y);
  kill(v);
  if (v.side === "mtf" || v.side === "dclass" || wasSeen) log(`SCP-049 lays a hand on ${v.side === "mtf" ? full(v) : v.name}. They drop dead without a mark on them.`, "bad");
  else log(`A cry from the ${area(v.x, v.y)}, then nothing.`, "bad");
}

/** SCP-049's turn. Bodies come first: a body beside it is raised, one in view is walked to. */
export async function plaguePhase() {
  const d = doctor();
  if (!S.has049 || S.sealed || !d.alive) return;
  if (isStaggered()) { if (seen(d.x, d.y)) log("SCP-049 is still reeling from the gunfire and doesn't move."); return; }
  if (isCalm()) { if (seen(d.x, d.y)) log("SCP-049 is calm. It waits, hands folded, and does nothing."); return; }
  const from: Pt = [d.x, d.y];

  const beside = freshBodies().find(b => cheb(b.x, b.y, d.x, d.y) <= 1);
  if (beside) { cure(beside); computeVis(); hooks.update(); await sleep(450); return; }

  const bodies = freshBodies().filter(b => rawSight(d.x, d.y, b.x, b.y));
  if (bodies.length) {
    walk(d, bodies.flatMap(besideTiles), PLAGUE_MOVE);
  } else {
    // the living: anyone it can see, else where it last heard gunfire, else rooms it hasn't searched
    const people = humans().filter(h => rawSight(d.x, d.y, h.x, h.y));
    for (const h of people) S.mem.set("049-" + h.id, { x: h.x, y: h.y, turn: S.turn });
    const target = people.sort((a, b) => cheb(a.x, a.y, d.x, d.y) - cheb(b.x, b.y, d.x, d.y))[0];
    if (target && cheb(target.x, target.y, d.x, d.y) > 1) walk(d, besideTiles(target), PLAGUE_MOVE);
    else if (!target) walk(d, leads(d), PLAGUE_MOVE);
    const reach = humans().filter(h => cheb(h.x, h.y, d.x, d.y) <= 1 && canStep(d.x, d.y, h.x - d.x, h.y - d.y));
    if (reach.length) touch(reach[rand(0, reach.length - 1)]);
  }
  S.checked.add(area(d.x, d.y));
  computeVis();
  if ((from[0] !== d.x || from[1] !== d.y) && seen(d.x, d.y)) log(`SCP-049 walks to the ${area(d.x, d.y)}.`, "key");
  hooks.update();
  await sleep(400);
}

function leads(d: Unit): Pt[] {
  const fresh = [...S.mem.values()].filter(m => S.turn - m.turn <= 3 && (m.x !== d.x || m.y !== d.y));
  if (fresh.length) return fresh.map(m => [m.x, m.y] as Pt);
  const g: Pt[] = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (passable(x, y) && !S.checked.has(area(x, y))) g.push([x, y]);
  if (!g.length) S.checked.clear();
  return g;
}

/** SCP-049-2: shamble toward the nearest living person and hit them. */
export async function zombiePhase() {
  for (const z of zombies()) {
    // rioters only go for the guards; everything else goes for anyone alive
    const prey = z.rioter ? team().filter(m => m.side === "mtf") : humans();
    if (!prey.length) break;
    if (!prey.some(h => cheb(h.x, h.y, z.x, z.y) <= 1)) walk(z, prey.flatMap(besideTiles), ZOMBIE_MOVE);
    const near = prey.filter(h => cheb(h.x, h.y, z.x, z.y) <= 1 && canStep(z.x, z.y, h.x - z.x, h.y - z.y));
    if (near.length) {
      const v = near[0], dmg = z.rioter ? rand(1, 2) : rand(2, 3), soak = Math.min(v.armor ?? 0, dmg);
      if (seen(v.x, v.y) || v.side === "mtf" || v.side === "dclass") log(`${z.rioter ? z.name : z.flesh ? "An SCP-610 instance" : "SCP-049-2"} ${z.rioter ? "lands a punch on" : "claws at"} ${v.side === "mtf" ? full(v) : v.name} for ${dmg - soak}${soak ? ` (armor absorbed ${soak})` : ""}.`, "bad");
      fx({ type: "text", x: v.x * TS + TS / 2, y: v.y * TS - 2, text: String(dmg - soak), color: "#d75b47", dur: 800 });
      damage(v, dmg - soak);
      if (z.flesh && v.alive) { if (v.side === "mtf") fleshBite(v); else infect(v, "a wound from an instance"); }
    }
  }
  computeVis();
  hooks.update();
  if (zombies().length) await sleep(300);
}

/** Tiles a calmed SCP-049 can be led to. */
export function leadOptions(): Map<number, Pt[]> {
  const d = doctor(), res = bfs([[d.x, d.y]], LEAD_STEPS, (x, y) => occupied(x, y, d));
  const out = new Map<number, Pt[]>();
  for (let i = 0; i < L.W * L.H; i++) if (res.dist[i] > 0) { const p = pathTo(res, i % L.W, (i / L.W) | 0); if (p) out.set(i, p); }
  return out;
}
export async function leadTo(x: number, y: number) {
  const path = leadOptions().get(y * L.W + x);
  if (!path) return false;
  const d = doctor();
  for (const [px, py] of path) { d.x = px; d.y = py; hooks.update(); await sleep(90); }
  log(S.scp === "096" ? `The hooded SCP-096 shuffles along to the ${area(d.x, d.y)}.` : `SCP-049 follows quietly to the ${area(d.x, d.y)}.`, "key");
  return true;
}
