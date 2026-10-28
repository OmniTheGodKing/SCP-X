// Chaos Insurgency AI: hold SCP-173 with their eyes when they see it, fight from cover,
// and push toward the Foundation team.
import { commanderFlees, demoBreach } from "./ciTactics";
import { L, area, bfs, cheb, floorOf, nearContainer, passable, pathTo } from "../core/grid";
import { sightFrom } from "../core/sight";
import { canShoot, coverAgainst, fire, moveUnit, shotInfo } from "./combat";
import { prof } from "./profiles";
import { S, alive, banner, breakConcealment, canSee, highlight, isBlind, isPanicked, log, occupied, reveal, seen, team } from "./state";
import type { Unit } from "./types";
import { goalOf, truck } from "./rivals";

/** Insurgents who see SCP-173 stare at it too, and crack the same way. */
export function insurgentsStare() {
  for (const r of alive("raider")) {
    if (isPanicked(r) || isBlind(r) || !canSee(r, S.statue.x, S.statue.y)) continue;
    r.san -= r.seen173 ? prof(r).drain : prof(r).firstSight + prof(r).drain;
    r.seen173 = true;
    if (r.san <= 0) {
      r.san = 30; r.panicUntil = S.turn + 1;
      if (seen(r.x, r.y)) log("An Insurgent can't hold SCP-173's gaze and covers their eyes.", "key");
    }
  }
}

/** How close an Insurgent who hasn't been alerted has to be to notice a concealed team. */
export const DETECT = 4;
/** How close the team can get to unalerted Insurgents (fog lets them get 2 tiles closer). */
export const detectRange = () => DETECT - (S.setup.weather === "fog" ? 2 : 0);
const podOf = (r: Unit) => r.pod ?? 0;
type Spot = { x: number; y: number };
/** Phase 4I: where the Insurgency thinks the team is. Members any Insurgent can see right now; where members were
 *  last seen (for two turns); and where they were heard (roughly). The AI plays by the same rules as the player. */
function knownTargets(): Spot[] {
  const out: Spot[] = [], rs = alive("raider");
  for (const m of team()) {
    if (rs.some(r => !isBlind(r) && canSee(r, m.x, m.y))) { S.mem.set("seen-" + m.id, { x: m.x, y: m.y, turn: S.turn }); out.push(m); continue; }
    const k = S.mem.get("seen-" + m.id);
    if (k && S.turn - k.turn <= 2) out.push({ x: k.x, y: k.y });
  }
  for (const [key, m] of S.mem) if (key.startsWith("heard-") && S.turn - m.turn <= 1) out.push({ x: m.x, y: m.y });
  return out;
}
export const podActive = (r: Unit) => S.activePods.includes(podOf(r));

/** Why this pod wakes up this turn, if it does. */
function alarm(pod: Unit[]): string | null {
  const t = team();
  for (const r of pod) for (const m of t)
    if (canSee(r, m.x, m.y) && (!S.concealed || cheb(r.x, r.y, m.x, m.y) <= detectRange())) return "spotted";
  if (pod.some(r => !r.alive || r.downed || r.hp < r.maxHp)) return "hit";
  const loud = [...S.mem.entries()].some(([k, m]) => (k.startsWith("shot-") || k.startsWith("bang-")) && m.turn === S.turn && pod.some(r => cheb(r.x, r.y, m.x, m.y) <= 8));
  if (loud) return "heard";
  if (S.setup.kind === "breach" && S.turn >= 3) return "arrived";
  return null;
}

/** Wake a pod: everyone in it dashes to cover at once (XCOM's scamper), which can trigger overwatch. */
export async function activatePod(pod: number, why: string) {
  if (S.activePods.includes(pod)) return;
  S.activePods.push(pod); S.raidersActive = true;
  const members = alive("raider").filter(r => podOf(r) === pod);
  if (why === "spotted" && S.concealed) breakConcealment("an Insurgent spotted the team");
  if (S.setup.kind === "breach") { reveal("ci"); log("Chaos Insurgency strike team moving in.", "bad"); }
  else if (members.some(r => seen(r.x, r.y))) log(`An Insurgency fire team is alerted${why === "heard" ? " by the noise" : why === "hit" ? " by the attack" : ""} and scrambles for cover.`, "bad");
  const known = knownTargets();
  for (const r of members) {
    const spot = bestSpot(r, known.length ? known : team());
    if (spot) await moveUnit(r, spot);
  }
}

/** During the player's turn: any pod that just saw the team, heard shots or was hit scrambles at once. */
export async function wakePods() {
  for (const pod of [...new Set(alive("raider").map(podOf))].filter(p => !S.activePods.includes(p))) {
    const why = alarm(S.units.filter(u => u.side === "raider" && podOf(u) === pod));
    if (why && why !== "arrived") await activatePod(pod, why);
  }
}

export async function raiderPhase(checkEnd: () => boolean) {
  const rs = alive("raider");
  if (!rs.length) return;
  // pods that haven't been alerted patrol their rooms, until something gives the team away
  for (const pod of [...new Set(rs.map(podOf))].filter(p => !S.activePods.includes(p))) {
    const members = rs.filter(r => podOf(r) === pod);
    const why = alarm(S.units.filter(u => u.side === "raider" && podOf(u) === pod));
    if (why) { await activatePod(pod, why); if (checkEnd()) return; continue; }
    // a pod that heard something goes to look; otherwise it patrols its room
    const heard = members.map(r => S.mem.get("heard-" + r.id)).find(m => m && S.turn - m.turn <= 1);
    if (heard) {
      for (const r of members) {
        const res = bfs([[r.x, r.y]], 3, (x, y) => occupied(x, y, r)), toward = bfs([[heard.x, heard.y]], 99).dist;
        let best = -1;
        for (let i = 0; i < L.W * L.H; i++) if (res.dist[i] > 0 && toward[i] >= 0 && (best < 0 || toward[i] < toward[best])) best = i;
        if (best >= 0 && toward[best] < toward[r.y * L.W + r.x]) await moveUnit(r, pathTo(res, best % L.W, (best / L.W) | 0) || []);
      }
      if (seen(heard.x, heard.y) || members.some(r => seen(r.x, r.y))) log("Insurgents move to check on a noise.", "bad");
    } else for (const r of members) if (Math.random() < 0.4) {
      const res = bfs([[r.x, r.y]], 2, (x, y) => occupied(x, y, r));
      const opts: number[] = [];
      for (let i = 0; i < L.W * L.H; i++) if (res.dist[i] > 0 && area(i % L.W, (i / L.W) | 0) === area(r.x, r.y)) opts.push(i);
      if (opts.length) { const i = opts[Math.floor(Math.random() * opts.length)]; await moveUnit(r, pathTo(res, i % L.W, (i / L.W) | 0) || []); }
    }
    // a patrol that walks into the team's sight gives itself away next turn; one that sees the team now raises the alarm
    const late = alarm(S.units.filter(u => u.side === "raider" && podOf(u) === pod));
    if (late === "spotted") { await activatePod(pod, late); if (checkEnd()) return; }
  }
  for (const r of alive("raider")) {
    if (!podActive(r) || !r.alive || !alive("mtf").length || isPanicked(r)) continue;
    if (S.trophy?.includes(r.id)) continue;   // GRU-P carriers only carry
    const lorry = S.setup.convoy ? truck() : undefined;
    if (lorry ? cheb(r.x, r.y, lorry.x, lorry.y) <= 1 : (S.setup.kind === "escort" || (S.setup.kind === "raid" && !S.liftOpen)) && nearContainer(r.x, r.y) && floorOf(r.y) === 0) { workTruck(r); if (checkEnd()) return; continue; }
    if (S.setup.kind === "raid" && S.liftOpen && inControl(r)) { holdControl(r); if (checkEnd()) return; continue; }
    if (isBlind(r)) { if (seen(r.x, r.y)) log("A blinded Insurgent stumbles and can't fire."); continue; }
    r.ap = 2; r.overwatch = false;
    if (await commanderFlees(r)) { if (checkEnd()) return; continue; }
    await raiderAct(r);
    if (checkEnd()) return;
  }
}

/** An Insurgent at the truck spends their turn forcing it; a second turn there and it's open. */
function workTruck(r: Unit) {
  const raid = S.setup.kind === "raid";
  // Phase 4C: with level 1 on the map, a forced lift lets them down into Site-19 rather than ending it there
  if (r.stealTurn === S.turn - 1 && raid && L.def.control) {
    S.liftOpen = true; L.closedLinks.clear(); L.version++;
    log("The Insurgents have the lift doors open and are going down into Site-19. Stop them reaching containment control on level 1.", "bad");
    banner("THE LIFT IS FORCED", "#d75b47"); highlight(4, "#d75b47");
    return;
  }
  if (r.stealTurn === S.turn - 1) { S.stolen = true; log(raid ? "The Insurgents have the lift doors open and are going down into Site-19." : "The Insurgents have the truck open. The anomaly is gone.", "bad"); return; }
  r.stealTurn = S.turn;
  log(raid ? "An Insurgent is forcing the lift doors. Stop them before next turn." : "An Insurgent is working the truck's door open. Stop them before next turn.", "bad");
}

const inControl = (u: Unit) => { const c = L.def.control; return !!c && u.x >= c[0] && u.x <= c[2] && u.y >= c[1] && u.y <= c[3]; };
/** An Insurgent in containment control: hold it through a whole enemy turn and Site-19's containment is theirs. */
function holdControl(r: Unit) {
  if (S.controlTurn !== undefined && S.controlTurn === S.turn - 1) {
    S.stolen = true; log("The Insurgents hold containment control. Site-19's cells are theirs to open.", "bad"); return;
  }
  if (S.controlTurn !== S.turn) { S.controlTurn = S.turn; log("An Insurgent has reached containment control on level 1. Clear the room before next turn.", "bad"); banner("CONTAINMENT CONTROL", "#d75b47"); }
}
const controlTiles = (): [number, number][] => { const c = L.def.control!; const out: [number, number][] = []; for (let y = c[1]; y <= c[3]; y++) for (let x = c[0]; x <= c[2]; x++) if (passable(x, y)) out.push([x, y]); return out; };

/** The best place within reach to fight from: in cover, flanking if possible, at a middling distance. */
function bestSpot(r: Unit, t: Spot[]) {
  const res = bfs([[r.x, r.y]], 5, (x, y) => occupied(x, y, r));
  if (!t.length) return null;
  const md = bfs(t.map(m => [m.x, m.y] as [number, number]), 999).dist;
  const st = S.statue;
  let bestT: [number, number] | null = null, bestScore = -1e9;
  for (let i = 0; i < L.W * L.H; i++) {
    if (res.dist[i] < 0) continue;
    const x = i % L.W, y = (i / L.W) | 0;
    let sc = 0;
    const sees = t.filter(m => sightFrom(x, y, m.x, m.y));
    if (sees.length) {
      sc += 12 + Math.min(...sees.map(m => coverAgainst(x, y, m.x, m.y))) * 1.2;
      for (const m of sees) if (coverAgainst(m.x, m.y, x, y) === 0) sc += 18;
    }
    const pd = md[i] < 0 ? 40 : md[i];
    sc -= Math.abs(pd - 6) * 4;
    if (!S.sealed && st.alive && cheb(st.x, st.y, x, y) <= 2) sc -= 40;
    // on an escort, the truck is what they came for
    if (S.setup.kind === "raid" && S.liftOpen && L.def.control) sc -= Math.min(...controlTiles().map(([cx, cy]) => cheb(cx, cy, x, y) + (floorOf(cy) !== floorOf(y) ? 30 : 0))) * 7;
    else if (S.setup.convoy && truck()) sc -= cheb(truck()!.x, truck()!.y, x, y) * 7;
    else if (S.setup.kind === "escort" || S.setup.kind === "raid") sc -= Math.min(...L.contTiles.filter(([, cy]) => floorOf(cy) === 0).map(([cx, cy]) => cheb(cx, cy, x, y))) * 7;
    sc -= res.dist[i] * 0.5 + Math.random() * 3;
    if (sc > bestScore) { bestScore = sc; bestT = [x, y]; }
  }
  if (!bestT || (bestT[0] === r.x && bestT[1] === r.y)) return null;
  return pathTo(res, bestT[0], bestT[1]) || null;
}

async function raiderAct(r: Unit) {
  for (let guard = 0; guard < 4 && r.ap > 0 && r.alive; guard++) {
    const t = team();
    if (!t.length) return;
    // Phase 4C: the GOC and GRU-P go for the anomaly first, and stay at it once there
    const goal = goalOf(r);
    if (goal && guard === 0 && cheb(r.x, r.y, goal.x, goal.y) > 1) {
      const res = bfs([[r.x, r.y]], 999, (x, y) => occupied(x, y, r));
      const spots = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dy]) => [goal.x + dx, goal.y + dy] as [number, number]).filter(([x, y]) => res.dist[y * L.W + x] > 0);
      spots.sort((a, b) => res.dist[a[1] * L.W + a[0]] - res.dist[b[1] * L.W + b[0]]);
      const path = spots[0] ? pathTo(res, spots[0][0], spots[0][1]) : null;
      if (path?.length) { r.ap--; await moveUnit(r, path.slice(0, 5)); continue; }
    }
    if (goal && cheb(r.x, r.y, goal.x, goal.y) <= 1) {
      const shot = t.filter(m => canShoot(r, m)).map(m => ({ m, s: shotInfo(r, m) })).sort((a, b) => b.s.chance - a.s.chance)[0];
      if (shot && shot.s.chance >= 20) { r.ap = 0; await fire(r, shot.m, false); }
      return;
    }
    // Phase 4C base defence: once the lift is forced, containment control is all that matters. They move for it with
    // every action, and only stop to shoot once inside or with no way forward.
    if (S.setup.kind === "raid" && S.liftOpen && L.def.control && !inControl(r)) {
      const res = bfs([[r.x, r.y]], 999, (x, y) => occupied(x, y, r));
      const goal = controlTiles().filter(([x, y]) => res.dist[y * L.W + x] > 0).sort((a, b) => res.dist[a[1] * L.W + a[0]] - res.dist[b[1] * L.W + b[0]])[0];
      const path = goal ? pathTo(res, goal[0], goal[1]) : null;
      if (path?.length) { r.ap--; await moveUnit(r, path.slice(0, 5)); continue; }
    }
    if (S.setup.kind === "raid" && S.liftOpen && L.def.control) {
      const shot = t.filter(m => canShoot(r, m)).map(m => ({ m, s: shotInfo(r, m) })).sort((a, b) => b.s.chance - a.s.chance)[0];
      if (shot && shot.s.chance >= 20) { r.ap = 0; await fire(r, shot.m, false); }
      return;
    }
    if (r.gun && r.gun.ammo < 1) { r.gun.ammo = r.gun.mag; r.ap--; if (seen(r.x, r.y)) log(`An Insurgent reloads their ${r.gun.name}.`); continue; }
    let best: { m: Unit; s: ReturnType<typeof shotInfo>; score: number } | null = null;
    // in a retaliation, the locals are targets too
    const targets = S.setup.kind === "retaliation" ? [...t, ...alive("civilian")] : t;
    for (const m of targets) if (canShoot(r, m)) {
      const s = shotInfo(r, m);
      const score = s.chance + (m.side === "mtf" ? 10 : 0) - (m.side === "civilian" ? 15 : 0);
      if (!best || score > best.score) best = { m, s, score };
    }
    if (best && (best.s.chance >= 45 || (r.ap === 1 && best.s.chance >= 20))) { r.ap = 0; await fire(r, best.m, false); return; }
    // a sniper with no good shot settles in and watches; a sapper with nothing to shoot opens a wall
    if (r.role === "sniper" && (best || r.ap === 1)) { r.ap = 0; r.overwatch = true; if (seen(r.x, r.y)) log(`${r.name} settles in on overwatch.`, "bad"); return; }
    if (!best && demoBreach(r)) return;
    const known = knownTargets();
    // on a raid or an ambush they know where they're going even before they've seen anyone
    const path = known.length ? bestSpot(r, known) : S.setup.kind === "raid" || S.setup.kind === "escort" || S.setup.kind === "retaliation" ? bestSpot(r, team()) : null;
    if (!path) {
      if (best && best.s.chance >= 20) { r.ap = 0; await fire(r, best.m, false); }
      return;
    }
    r.ap--;
    await moveUnit(r, path);
  }
}
