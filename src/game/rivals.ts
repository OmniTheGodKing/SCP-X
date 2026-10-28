// Phase 4C: what the other side wants besides the team dead. The Global Occult Coalition destroys the anomaly; GRU
// Division "P" carries it off; on a convoy the Insurgency goes for the moving truck. Also the convoy itself.
import { L, bfs, cheb, passable } from "../core/grid";
import { S, alive, banner, highlight, log, occupied } from "./state";
import type { Unit } from "./types";

/** The anomaly the GOC or GRU-P can get their hands on right now, if any. */
export function prize(): Unit | null {
  if (S.sealed || !S.scp || S.lostTo) return null;
  const st = S.statue;
  if (!st.alive || (S.has106 && S.submerged) || (S.scp === "035" && S.maskHost)) return null;
  return st;
}
/** GRU-P only try to carry off what can be carried: the statue, the score, the mask, or a hooded SCP-096. */
const carriable = () => ["173", "012", "035"].includes(S.scp ?? "") || (S.scp === "096" && !!S.hooded);
/** Where this enemy is headed, if it has a goal beyond the team. */
export function goalOf(r: Unit): Unit | null {
  if (r.side !== "raider" || r.downed || S.trophy?.includes(r.id)) return null;
  if (S.setup.goc || (S.setup.gru && carriable())) return prize();
  return null;
}
const name = () => S.statue.name;

/** After the enemy turn: two of them at the anomaly through a whole enemy turn finish the job. */
export function rivalPhase() {
  const p = prize();
  if (!p || (!S.setup.goc && !(S.setup.gru && carriable())) || S.trophy) return;
  const at = alive("raider").filter(r => !r.downed && cheb(r.x, r.y, p.x, p.y) <= 1);
  if (at.length < 2) { S.gocTurn = S.gruTurn = undefined; return; }
  if (S.setup.goc) {
    if (S.scp === "682") {
      S.told ??= [];
      if (!S.told.includes("goc682")) { S.told.push("goc682"); log("The GOC team's charges tear chunks out of SCP-682. It grows them back, and turns on them.", "key"); }
      return;
    }
    if (S.gocTurn !== undefined && S.gocTurn < S.turn) {
      S.lostTo = "goc"; p.alive = false;
      log(`The GOC team's charges go off. ${name()} is gone: destroyed, not contained.`, "bad");
      banner(`${name()} DESTROYED BY THE GOC`, "#d75b47"); highlight(6, "#ff9a50");
      return;
    }
    if (S.gocTurn === undefined) { S.gocTurn = S.turn; log(`GOC operatives are setting charges on ${name()}. Drive them off before their next turn.`, "bad"); banner("THE GOC IS SETTING CHARGES", "#d75b47"); }
    return;
  }
  if (S.gruTurn !== undefined && S.gruTurn < S.turn) {
    S.trophy = at.slice(0, 2).map(r => r.id);
    log(`GRU-P have ${name()} and are carrying it toward the edge of the area. Shoot either carrier and they'll drop it.`, "bad");
    banner(`GRU-P ARE CARRYING ${name()} OFF`, "#d75b47");
    return;
  }
  if (S.gruTurn === undefined) { S.gruTurn = S.turn; log(`GRU-P operatives are getting ready to lift ${name()}. Stop them before their next turn.`, "bad"); }
}

/** GRU-P's carriers move two tiles toward the nearest exit each enemy turn; once off the map it's gone. */
export function carryPhase() {
  if (!S.trophy || S.lostTo) return;
  const carriers = S.trophy.map(id => S.units.find(u => u.id === id)).filter((u): u is Unit => !!u && u.alive && !u.downed);
  if (carriers.length < 2) { dropTrophy("One of the carriers is down."); return; }
  const [lead, back] = carriers, st = S.statue;
  for (let k = 0; k < 2; k++) {
    const here = L.exitMap[lead.y * L.W + lead.x];
    if (here === 0) break;
    let best: [number, number] | null = null, bd = here;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = lead.x + dx, ny = lead.y + dy, v = L.exitMap[ny * L.W + nx];
      if (nx < 0 || ny < 0 || nx >= L.W || ny >= L.H || !passable(nx, ny) || v < 0 || occupied(nx, ny, lead)) continue;
      if (v < bd) { bd = v; best = [nx, ny]; }
    }
    if (!best) break;
    const [px, py] = [lead.x, lead.y];
    lead.x = best[0]; lead.y = best[1];
    if (!occupied(px, py, back)) { back.x = px; back.y = py; }
  }
  st.x = lead.x; st.y = lead.y;
  if (L.exitMap[lead.y * L.W + lead.x] === 0) {
    S.lostTo = "gru";
    log(`GRU-P carry ${name()} out of the area. It's on its way to the Soviet Union, out of the Foundation's reach.`, "bad");
    banner(`${name()} LOST TO GRU-P`, "#d75b47");
  }
}
export function dropTrophy(why: string) {
  if (!S.trophy) return;
  S.trophy = undefined; S.gruTurn = undefined;
  log(`${why} GRU-P drop ${name()}.`, "good");
  banner("THEY DROPPED IT", "#86c193");
}

// ---------- a site gone quiet ----------
/** The first time the team sees what happened at a quiet site, say what it is. */
export function checkQuiet() {
  if (!S.setup.quiet || S.revealed !== undefined) return;
  const seenIt = S.units.find(u => u.alive && !u.saved && (u.side === "raider" || u.side === "zombie" || (u.side === "anomaly" && u === S.statue)) && S.vis[u.y * L.W + u.x]);
  if (!seenIt) return;
  S.revealed = S.turn;
  const what = S.setup.hazard === "scp" ? `${S.statue.name} is loose in the site` : S.setup.hazard === "insurgents" ? "the Insurgency has taken the site" : "escaped instances are loose in the wing";
  log(`So that's what happened here: ${what}.`, "bad");
  banner(S.setup.hazard === "scp" ? `${S.statue.name} IS LOOSE` : S.setup.hazard === "insurgents" ? "THE INSURGENCY HOLDS THE SITE" : "ESCAPED INSTANCES", "#d75b47");
}

// ---------- the convoy ----------
export const truck = () => S.units.find(u => u.vehicle && u.alive);
/** After the enemy turn: the truck drives east along the street, 3 tiles, unless someone hostile is at it. */
export function convoyPhase() {
  const t = truck();
  if (!t || S.convoyOut) return;
  if (alive("raider").some(r => !r.downed && cheb(r.x, r.y, t.x, t.y) <= 1)) { log("The truck has stopped: there are Insurgents at the cab.", "bad"); return; }
  // it follows the street to the exits at the east end, steering round whatever is in the road
  const road = L.def.area(t.x, t.y), ends: [number, number][] = [];
  for (let y = 0; y < L.H; y++) if (L.exitMap[y * L.W + L.W - 1] === 0) ends.push([L.W - 1, y]);
  const dist = bfs(ends, 999, (x, y) => L.def.area(x, y) !== road && L.exitMap[y * L.W + x] !== 0).dist;
  let moved = 0;
  for (; moved < 3; moved++) {
    const here = dist[t.y * L.W + t.x];
    let next: [number, number] | null = null, bd = here < 0 ? 1e9 : here;
    for (const [dx, dy] of [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1]]) {
      const x = t.x + dx, y = t.y + dy, v = dist[y * L.W + x];
      if (x >= L.W || y < 0 || y >= L.H || v < 0 || v >= bd || !passable(x, y) || occupied(x, y, t)) continue;
      bd = v; next = [x, y];
    }
    if (!next) break;
    [t.x, t.y] = next;
    if (L.exitMap[t.y * L.W + t.x] === 0) break;
  }
  if (L.exitMap[t.y * L.W + t.x] === 0) { S.convoyOut = true; log("The truck clears the far end of the street. The transfer is through.", "good"); banner("THE CONVOY IS THROUGH", "#86c193"); }
  else if (!moved) log("The truck can't get past: the road ahead is blocked.", "key");
  else log(`The truck rolls ${moved} tile${moved > 1 ? "s" : ""} east.`);
}
