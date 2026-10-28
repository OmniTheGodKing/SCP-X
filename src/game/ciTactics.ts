// Insurgent specialists and their tricks (Phase 3I): snipers who hold long-range overwatch, demolition specialists who
// blow through walls, officers (and the named commander) who steady the troops around them, anomalous charms, and
// reinforcements that land in long fights with a turn's warning.
import { emitNoise } from "./noise";
import { PART, blastStructure, doorShut, L, FLOOR, WALL, bfs, cheb, pathTo, passable } from "../core/grid";
import { S, alive, computeVis, fx, log, occupied, seen, team } from "./state";
import { damage, moveUnit } from "./combat";
import type { Unit, MissionSetup } from "./types";

export type CiRole = "rifleman" | "sniper" | "demo" | "officer" | "commander";
export const ROLE_NAMES: Record<CiRole, string> = { rifleman: "Insurgent", sniper: "Insurgent sniper", demo: "Insurgent sapper", officer: "Insurgent officer", commander: "" };

/** Hand out specialist roles to a freshly spawned Insurgent team. */
export function assignRoles(units: Unit[], setup: MissionSetup) {
  const rs = units.filter(u => u.side === "raider");
  if (!rs.length) return;
  const gru = !!setup.gru;
  for (const r of rs) { r.role = "rifleman"; r.aim += setup.enemyAim ?? 0; if (gru) r.name = "GRU-P operative"; }
  const roles = setup.ciRoles;
  const free = () => rs.find(r => r.role === "rifleman");
  if (setup.commander && !gru) { const r = free()!; Object.assign(r, { role: "commander", name: setup.commander, hp: 8, maxHp: 8, aim: 72, armor: (r.armor ?? 0) + 1 }); }
  if (!roles) return;
  if (roles.officer && rs.length >= 3 && free()) Object.assign(free()!, { role: "officer", name: gru ? "GRU-P officer" : ROLE_NAMES.officer, hp: 5, maxHp: 5 });
  if (!gru && roles.sniper && rs.length >= 3 && free()) { const r = free()!; Object.assign(r, { role: "sniper", name: ROLE_NAMES.sniper, aim: 70, gun: { name: "Scoped Mosin-Nagant", type: "rifle", dmg: [4, 6], mag: 3, ammo: 3, aim: 10 } }); }
  if (!gru && roles.demo && rs.length >= 4 && free()) Object.assign(free()!, { role: "demo", name: ROLE_NAMES.demo, charges: 1 });
  if (roles.charm) { const r = rs[Math.floor(Math.random() * rs.length)]; r.charm = true; r.hadCharm = true; }
}

/** Officers and the commander steady every Insurgent within 4 tiles of them (not themselves). */
export function officerNear(sh: Unit) {
  return sh.side === "raider" && alive("raider").some(o => o !== sh && (o.role === "officer" || o.role === "commander") && cheb(o.x, o.y, sh.x, sh.y) <= 4);
}

/** A charm turns the first round that would have hit its wearer. */
export function charmTurns(tg: Unit) {
  const ward = tg.items?.find(i => i.id === "ward" && i.uses > 0);
  if (ward) { ward.uses--; log(`The round bends around ${tg.name}: their warding charm is spent.`, "good"); return true; }
  if (!tg.charm) return false;
  tg.charm = false;
  log(`The round goes around ${tg.name} as if bent. Something they carry did that, and it's spent now.`, "bad");
  return true;
}

/** A sapper with nothing to shoot blows a hole through a wall that stands between them and the team. */
export function demoBreach(r: Unit): boolean {
  if (r.role !== "demo" || !(r.charges ?? 0)) return false;
  const t = team();
  if (!t.length) return false;
  const toTeam = bfs(t.map(m => [m.x, m.y] as [number, number]), 999).dist;
  const here = toTeam[r.y * L.W + r.x];
  let best: [number, number] | null = null, gain = 3;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const wx = r.x + dx, wy = r.y + dy, bx = r.x + 2 * dx, by = r.y + 2 * dy;
    // a breaching charge opens a partition, a shut door, or an ordinary wall (Site-19's are reinforced)
    const t = L.grid[wy]?.[wx], breachable = t === PART || doorShut(wx, wy) || (t === WALL && !L.def.reinforced);
    if (wx <= 0 || wy <= 0 || wx >= L.W - 1 || wy >= L.H - 1 || !breachable || !passable(bx, by)) continue;
    const there = toTeam[by * L.W + bx];
    if (there >= 0 && (here < 0 || here - there > gain)) { best = [wx, wy]; gain = here < 0 ? 999 : here - there; }
  }
  if (!best) return false;
  const [wx, wy] = best;
  r.charges = (r.charges ?? 1) - 1; r.ap = 0;
  const what = blastStructure(wx, wy, 2);
  fx({ type: "flash", x: wx * 32 + 16, y: wy * 32 + 16, dur: 500 });
  emitNoise(wx, wy, "explosion", r);
  log(`${seen(r.x, r.y) || seen(wx, wy) ? "An Insurgent sapper" : "Something"} blows ${what === "door" ? "a door off its hinges" : "a hole through the wall"}${seen(wx, wy) ? "" : " nearby"}.`, "bad");
  for (const u of S.units) if (u.alive && u !== r && cheb(u.x, u.y, wx, wy) <= 1) damage(u, 2);
  S.mem.set("bang-" + r.id, { x: wx, y: wy, turn: S.turn });
  computeVis();
  return true;
}

/** A badly hurt commander makes for the nearest way out instead of fighting; reaching it, they're gone. */
export async function commanderFlees(r: Unit): Promise<boolean> {
  if (r.role !== "commander" || r.hp > r.maxHp / 2) return false;
  const res = bfs([[r.x, r.y]], 6, (x, y) => occupied(x, y, r));
  let best = -1, bd = 1e9;
  for (let i = 0; i < L.W * L.H; i++) if (res.dist[i] >= 0 && L.exitMap[i] >= 0 && L.exitMap[i] < bd) { bd = L.exitMap[i]; best = i; }
  if (best >= 0) await moveUnit(r, pathTo(res, best % L.W, (best / L.W) | 0) || []);
  r.ap = 0;
  if (!r.alive || r.downed) return true;
  if (L.exitMap[r.y * L.W + r.x] <= 1) { r.saved = true; r.escaped = true; log(`${r.name} gets out. The commander has escaped.`, "bad"); }
  else if (seen(r.x, r.y)) log(`${r.name} is pulling back toward the edge of the area.`, "key");
  return true;
}

/** Long fights draw reinforcements: a turn's warning on the radio, then a team lands at the far edge. */
export function reinforcementsTick() {
  const due = S.setup.reinforce;
  if (!due || S.ciLanded || S.radioCut) return;
  if (S.turn === due - 1) {
    S.ciDrop = dropZone();
    log("Radio chatter: Insurgent reinforcements land next turn. The drop zone is marked.", "bad");
  } else if (S.turn >= due && S.ciDrop) {
    S.ciLanded = true;
    const n = S.setup.insurgents >= 6 ? 3 : 2, pod = 9;
    const base = alive("raider")[0] ?? S.units.find(u => u.side === "raider");
    const gun = base?.gun ? { ...base.gun, ammo: base.gun.mag } : { name: "Mosin-Nagant", type: "rifle" as const, dmg: [3, 4] as [number, number], mag: 3, ammo: 3, aim: 0 };
    const [cx, cy] = S.ciDrop;
    const spots: [number, number][] = [];
    for (let r = 0; r <= 3 && spots.length < n; r++) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
      if (spots.length < n && passable(x, y) && !occupied(x, y) && !spots.some(([a, b]) => a === x && b === y)) spots.push([x, y]);
    spots.forEach(([x, y], i) => S.units.push({ id: "rr" + i, side: "raider", name: S.setup.gru ? "GRU-P operative" : "Insurgent", role: "rifleman", x, y, pod, hp: 4, maxHp: 4, aim: 60, san: 60, armor: S.setup.insurgentArmor,
      gun: { ...gun }, alive: true, saved: false, ap: 0, overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0 }));
    S.activePods.push(pod);
    S.setup.insurgents += spots.length;
    S.ciDrop = undefined;
    log(`${spots.length} more Insurgents land at the drop zone.`, "bad");
  }
}
/** The far edge from the team: the open tile on the map border farthest from any of them. */
function dropZone(): [number, number] {
  const d = bfs(team().map(m => [m.x, m.y] as [number, number]), 999).dist;
  let best: [number, number] = [1, 1], bd = -1;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    if (!(x <= 2 || y <= 2 || x >= L.W - 3 || y >= L.H - 3) || !passable(x, y)) continue;
    const v = d[y * L.W + x];
    if (v > bd) { bd = v; best = [x, y]; }
  }
  return best;
}
