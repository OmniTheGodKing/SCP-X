// The tactical lab (Tactical overhaul T6.2). A developer screen for building a situation and watching every rule:
// what a unit sees and makes out, where it peeks from, the line a shot would take and what it crosses, the cover each
// side gives, the hit chance and why, overwatch lanes, suppression, light, and how the enemy AI scores its moves.
// It runs on a sandbox mission (src/game/sandbox.ts) inside the normal mission screen, so everything shown comes
// from the production rules; nothing is recomputed here except what is drawn.
import { DOOR_STATES_CYCLE, FLOOR, FULL, HALF, L, PART, STEEL, WALL, WINDOW, DRUM, EXIT, CONT, TS, bump, tileAt, passable, type DoorState } from "../core/grid";
import { COVER_FULL, FIRE, SIGHT, STEP_OUT, coverSides, setSmoke, eyePoints, obstacleAt, trace, bestView as kernelView } from "../core/geom";
import { SIGHT_MAX } from "../core/sight";
import { SPECIALTIES, type SpecialtyId } from "../data/mtf";
import { EQUIP, KITS } from "../data/specialties";
import { ITEMS } from "../campaign/research";
import { createSandbox, makeSandboxUnit, sandboxGun, type SandboxSpec, type SandboxUnit } from "../game/sandbox";
import { S, computeVis, hooks, isTeam, unitAt } from "../game/state";
import { canShoot, fire, shotInfo, suppress } from "../game/combat";
import { perceive, lightAt, peeks, IDENTIFIED, DETECTED } from "../game/perception";
import { reachOf, moveOf } from "../game/movement";
import { scorePositions, planPod, tacticalTurn, threats } from "../game/ai";
import { statusesOf } from "../game/status";
import { payOverwatch } from "../game/actions";
import { endTurn, tapHook } from "../game/turn";
import { overlayHook } from "./render";
import { mountMission } from "./missionView";
import { cam } from "./camera";
import { esc } from "./util";
import type { Side, Unit } from "../game/types";
import type { WeaponType } from "../data/weapons";

type Tool = "play" | "inspect" | "move" | "#" | "." | "h" | "H" | "w" | "W" | "p" | "+" | "D" | "smoke" | "flare" | "fire" | "mtf" | "raider" | "civilian" | "zombie" | "erase";
const TOOLS: [Tool, string][] = [
  ["play", "Play (normal rules)"], ["inspect", "Inspect: pick viewer"], ["move", "Move unit (free)"],
  ["#", "Wall"], [".", "Floor"], ["h", "Half cover"], ["H", "Full cover"], ["D", "Fuel drum"], ["w", "Window"], ["W", "Reinforced window"], ["p", "Partition"], ["+", "Door (click again to cycle)"],
  ["smoke", "Smoke"], ["flare", "Flare"], ["fire", "Fire"],
  ["mtf", "Operative"], ["raider", "Insurgent"], ["civilian", "Civilian"], ["zombie", "Hostile instance"], ["erase", "Remove unit"],
];
const lab = {
  tool: "inspect" as Tool,
  viewer: "" as string,
  gun: "rifle" as WeaponType,
  trial: undefined as TrialSpec | undefined,
  show: { perception: true, peeks: true, line: true, cover: true, overwatch: true, light: false, reach: false, ai: false },
};

const open = (w: number, h: number) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? "#" : ".").join(""));
const put = (rows: string[], x: number, y: number, c: string) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };
// ---- Version 12: the specialty trial ----
/** One fixed situation every squad specialty can be measured against: a shut door into a defended room, a structural
 *  wall that only demolitions opens, a fuel drum, a burning patch of SCP-610 growth with a wounded operative beside it,
 *  SCP-106 corrosion, an Insurgent machine gun in the far room and an exit behind the squad. Same seed every run. */
export interface TrialSpec { specialty: SpecialtyId; stage: number; }
export function trialSpec(specialty: SpecialtyId, stage: number): SandboxSpec & { trial: TrialSpec } {
  const rows = open(26, 16);
  for (let y = 1; y < 15; y++) { put(rows, 8, y, "#"); put(rows, 18, y, "#"); }
  put(rows, 8, 7, "+"); put(rows, 18, 11, "+"); put(rows, 18, 4, "p");
  put(rows, 1, 7, "E"); put(rows, 1, 8, "E");
  for (const [x, y, c] of [[11, 5, "h"], [11, 9, "h"], [14, 7, "H"], [10, 8, "D"], [20, 6, "h"]] as [number, number, string][]) put(rows, x, y, c);
  return {
    rows, seed: 1951, doors: { "8,7": "closed", "18,11": "closed" }, trial: { specialty, stage },
    units: [
      { side: "mtf", x: 3, y: 6, name: "Keane" }, { side: "mtf", x: 3, y: 8, name: "Esposito" }, { side: "mtf", x: 5, y: 6, name: "Stirling" }, { side: "mtf", x: 5, y: 8, name: "Kaminski" },
      { side: "mtf", x: 21, y: 12, name: "Garnier (wounded)", hp: 4 },
      { side: "raider", x: 15, y: 5 }, { side: "raider", x: 15, y: 9 }, { side: "raider", x: 21, y: 7, gun: "mg" },
    ],
  };
}
const TRIAL_FLESH: [number, number][] = [[20, 13], [21, 13], [22, 13], [22, 12], [23, 12], [23, 13], [22, 14], [23, 14]];
/** Give the squad its specialty, stage, certification and shared kit, and lay out the hazards. */
function applyTrial(t: TrialSpec) {
  const W = L.W, sp = SPECIALTIES[t.specialty], certified = KITS[t.specialty].certified;
  S.setup.mtfRules = true;
  const pool = certified.filter(i => !ITEMS[i].armor && (EQUIP[i]?.year ?? 0) <= 1951)
    .map(i => ({ id: i, uses: EQUIP[i]?.major ? 2 : i === "field_tags" ? 2 : 1, shared: true as const }));
  const suit = certified.find(i => i === "contsuit" || i === "hazmat");
  const team = S.units.filter(u => u.side === "mtf");
  team.forEach((u, n) => {
    Object.assign(u, { squadId: "TRIAL", specialty: t.specialty, stage: t.stage, qualified: true, mtfSpec: sp.spec, items: [...pool] });
    if (suit) { u.armorKind = suit; u.hasArmor = true; }
    if (t.specialty === "heavyinf") { u.armorKind = "armor_heavy"; u.hasArmor = true; u.armor = 1; }
    if (t.specialty === "heavyweapons" && n === 0) u.gun = sandboxGun("mg");
  });
  const hurt = team.find(u => u.name.startsWith("Garnier"));
  if (hurt) { hurt.downed = true; hurt.hp = 0; hurt.bleed = 5; hurt.items = []; }
  for (const [x, y] of TRIAL_FLESH) S.flesh.add(y * W + x);
  S.fires.set(13 * W + 23, S.turn + 99);
  for (const [x, y] of [[12, 12], [13, 12], [12, 13]]) S.corroded.add(y * W + x);
  S.techUsed = []; S.clues = 0; S.samples = 0; S.collateral = 0;
  lab.trial = t;
  computeVis();
}
/** What the trial measures, read from the mission as it stands. */
function trialCard() {
  const t = lab.trial; if (!t) return "";
  const team = S.units.filter(u => u.side === "mtf"), foes = S.units.filter(u => u.side === "raider");
  const hurt = team.find(u => u.name.startsWith("Garnier"));
  const fit = team.filter(u => u !== hurt);
  const kit = fit[0]?.items?.filter(i => i.shared).map(i => `${i.id.replace(/_/g, " ")} ${i.uses}`).join(", ") || "none";
  return `<div style="margin:6px 0;padding:6px;border:1px solid #6b5a2a;border-radius:4px">
    <b>Specialty trial</b>: ${esc(SPECIALTIES[t.specialty].name)}, stage ${t.stage}<br>
    Turn ${S.turn} · squad HP ${fit.reduce((a, u) => a + (u.alive ? u.hp : 0), 0)}/${fit.reduce((a, u) => a + u.maxHp, 0)} · down ${fit.filter(u => !u.alive || u.downed).length}<br>
    Insurgents out ${foes.filter(u => !u.alive || u.downed).length}/${foes.length} · pinned ${foes.filter(u => (u.suppressedUntil ?? -1) >= S.turn).length}<br>
    Wounded operative: ${!hurt ? "?" : hurt.saved ? "<b>extracted</b>" : !hurt.alive ? "bled out" : hurt.carriedBy ? "being carried" : `down, ${hurt.bleed ?? 3} turns left`}${hurt?.infectedTurn !== undefined ? " · infected" : ""}<br>
    Growth tiles ${S.flesh.size} · fires ${S.fires.size} · infected ${team.filter(u => u.infectedTurn !== undefined).length}<br>
    Techniques used ${S.techUsed?.length ?? 0} · clues ${S.clues ?? 0} · samples ${S.samples ?? 0} · collateral ${S.collateral ?? 0}<br>
    Kit left: ${esc(kit)}</div>`;
}
function preset(name: string): SandboxSpec {
  switch (name) {
    case "hallway": { const rows = ["#".repeat(44), "#" + ".".repeat(42) + "#", "#" + ".".repeat(42) + "#", "#".repeat(44)]; return { rows, units: [{ side: "mtf", x: 1, y: 1 }, { side: "raider", x: 41, y: 2 }] }; }
    case "crates": { const rows = open(27, 16); for (const x of [12, 13, 14]) put(rows, x, 12, "H"); put(rows, 4, 12, "H"); for (const x of [20, 21, 22]) put(rows, x, 12, "H");
      return { rows, outdoors: true, units: [{ side: "mtf", x: 13, y: 13 }, { side: "mtf", x: 4, y: 13 }, { side: "mtf", x: 20, y: 13 }, { side: "raider", x: 13, y: 3 }, { side: "raider", x: 6, y: 4 }] }; }
    case "doorway": { const rows = open(22, 15); for (let y = 1; y < 14; y++) put(rows, 11, y, "#"); put(rows, 11, 7, "+");
      return { rows, units: [{ side: "mtf", x: 10, y: 5 }, { side: "raider", x: 16, y: 10 }, { side: "raider", x: 14, y: 3 }], doors: { "11,7": "open" } }; }
    case "windows": { const rows = open(22, 13); for (let x = 1; x < 21; x++) put(rows, x, 6, "#"); put(rows, 5, 6, "w"); put(rows, 15, 6, "W"); put(rows, 10, 6, "p");
      return { rows, units: [{ side: "mtf", x: 6, y: 5 }, { side: "raider", x: 3, y: 9 }, { side: "raider", x: 15, y: 9 }] }; }
    case "night": { const rows = open(40, 12); for (const [x, y] of [[10, 5], [20, 7], [28, 4]]) put(rows, x, y, "H");
      return { rows, outdoors: true, night: true, units: [{ side: "mtf", x: 2, y: 6 }, { side: "raider", x: 14, y: 5 }, { side: "raider", x: 33, y: 6 }] }; }
    case "dugin": { const rows = open(24, 18); put(rows, 11, 5, "H"); for (const x of [6, 17]) put(rows, x, 11, "H");
      return { rows, units: [{ side: "mtf", x: 11, y: 4 }, { side: "raider", x: 9, y: 13, gun: "mg" }, { side: "raider", x: 13, y: 13 }] }; }
    case "trial": return trialSpec("breach", 1);
    default: { const rows = open(20, 14); for (const [x, y, c] of [[6, 5, "H"], [13, 8, "h"], [9, 10, "h"], [15, 4, "H"]] as [number, number, string][]) put(rows, x, y, c);
      return { rows, units: [{ side: "mtf", x: 3, y: 3 }, { side: "raider", x: 16, y: 10 }] }; }
  }
}
export const PRESETS: [string, string][] = [["trial", "Specialty trial (same map, seed and enemies)"], ["room", "Open room"], ["hallway", "Long hallway"], ["crates", "Crates (the owner's drawings)"], ["doorway", "Doorway and corners"], ["windows", "Windows and a partition"], ["night", "Night field"], ["dugin", "Dug-in operative vs a pod"]];

// ---- reading the map back into a scenario ----
const CHAR: Record<number, string> = { [WALL]: "#", [FLOOR]: ".", [HALF]: "h", [FULL]: "H", [EXIT]: "E", [CONT]: "C", [STEEL]: "S", [DRUM]: "D", [PART]: "p" };
export function currentSpec(): SandboxSpec {
  const rows: string[] = [], doors: Record<string, DoorState> = {};
  for (let y = 0; y < L.H; y++) {
    let r = "";
    for (let x = 0; x < L.W; x++) {
      const i = y * L.W + x, t = tileAt(x, y);
      if (L.door.has(i)) { r += "+"; doors[`${x},${y}`] = L.door.get(i)!.state; continue; }
      r += t === WINDOW ? (L.glass.get(i)?.kind === "reinforced" ? "W" : "w") : CHAR[t] ?? ".";
    }
    rows.push(r);
  }
  const units: SandboxUnit[] = S.units.filter(u => u.alive && u.id !== "none" && !u.saved).map(u => ({ id: u.id, side: u.side, x: u.x, y: u.y, aim: u.aim, hp: u.maxHp, armor: u.armor, gun: u.gun?.type as WeaponType | undefined, perks: u.perks as string[] | undefined, role: u.role }));
  return { rows, units, doors, outdoors: L.def.area(0, 0) === "field" ? true : undefined, night: !!S.setup.night && S.setup.kind !== "emergency", weather: S.setup.weather, powerOut: S.setup.kind === "emergency" && !S.powerOn };
}
const SAVE_KEY = "site19-lab";
const load = (): SandboxSpec | null => { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const save = (spec: SandboxSpec) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(spec)); } catch { /* fine */ } };

// ---- painting ----
function paint(x: number, y: number, c: string) {
  const i = y * L.W + x;
  if (x <= 0 || y <= 0 || x >= L.W - 1 || y >= L.H - 1) return;
  if (c === "+") {
    const d = L.door.get(i);
    if (d) { const k = DOOR_STATES_CYCLE.indexOf(d.state); d.state = DOOR_STATES_CYCLE[(k + 1) % DOOR_STATES_CYCLE.length]; }
    else { L.grid[y][x] = FLOOR; L.doors.add(i); L.door.set(i, { kind: "standard", state: "closed" }); }
  } else {
    L.doors.delete(i); L.door.delete(i); L.glass.delete(i); L.coverHp.delete(i);
    const code = ({ "#": WALL, ".": FLOOR, h: HALF, H: FULL, w: WINDOW, W: WINDOW, p: PART, D: DRUM } as Record<string, number>)[c];
    if (code === undefined) return;
    if (c === "w" || c === "W") {
      if (tileAt(x, y) === WINDOW) { const g = L.glass.get(i); if (g) g.broken = !g.broken; }
      L.grid[y][x] = WINDOW; L.glass.set(i, { kind: c === "W" ? "reinforced" : "ordinary", broken: false });
    } else L.grid[y][x] = code;
  }
  bump();
}

/** Open the lab on a scenario (the last one saved, or a preset). */
export function openLab(root: HTMLElement, onExit: () => void, spec?: SandboxSpec) {
  const sc = spec ?? load() ?? preset("room");
  createSandbox(sc);
  lab.trial = undefined;
  const tr = (sc as { trial?: TrialSpec }).trial; if (tr) applyTrial(tr);
  lab.viewer = S.units.find(u => u.side === "mtf")?.id ?? S.units[0]?.id ?? "";
  mountMission(root, () => { teardown(); onExit(); }, () => "");
  root.querySelector("main.tac")?.classList.add("lab"); cam.insets.r = 360;
  const panel = document.createElement("div");
  panel.id = "labPanel";
  panel.setAttribute("style", "position:fixed;top:8px;right:8px;width:340px;max-height:calc(100vh - 16px);overflow:auto;z-index:50;background:#14181c;color:#e7ecf0;border:1px solid #3a434b;border-radius:6px;padding:8px;font:12px/1.4 IBM Plex Mono,monospace;box-shadow:0 4px 18px rgba(0,0,0,.5)");
  document.body.appendChild(panel);
  const viewer = () => S.units.find(u => u.id === lab.viewer && u.alive) ?? null;

  tapHook.fn = (x, y) => {
    const u = unitAt(x, y);
    switch (lab.tool) {
      case "play": return false;
      case "inspect": if (u) { lab.viewer = u.id; if (isTeam(u)) S.selected = u; } refresh(); return true;
      case "move": { const v = viewer(); if (v && passable(x, y) && !u) { v.x = x; v.y = y; computeVis(); } refresh(); return true; }
      case "erase": if (u && u.id !== "none") { S.units = S.units.filter(o => o !== u); computeVis(); } refresh(); return true;
      case "mtf": case "raider": case "civilian": case "zombie": {
        if (u || !passable(x, y)) return true;
        const n = S.units.length + 1, nu = makeSandboxUnit({ side: lab.tool as Side, x, y, gun: lab.tool === "mtf" || lab.tool === "raider" ? lab.gun : undefined }, n);
        nu.id = `${lab.tool}${Date.now() % 100000}${n}`;
        S.units.splice(S.units.length - 1, 0, nu); computeVis(); refresh(); return true;
      }
      case "smoke": { const k = S.smoke.findIndex(s => s.x === x && s.y === y); if (k >= 0) S.smoke.splice(k, 1); else S.smoke.push({ x, y, until: S.turn + 1 }); syncSmoke(); computeVis(); refresh(); return true; }
      case "flare": { const k = S.flares.findIndex(f => f.x === x && f.y === y); if (k >= 0) S.flares.splice(k, 1); else S.flares.push({ x, y, until: S.turn + 99 }); computeVis(); refresh(); return true; }
      case "fire": { const i = y * L.W + x; if (S.fires.has(i)) S.fires.delete(i); else S.fires.set(i, S.turn + 99); computeVis(); refresh(); return true; }
      default: paint(x, y, lab.tool); computeVis(); refresh(); return true;
    }
  };

  // ---- the overlays, drawn over the map each frame from the live rules ----
  let percKey = "", perc: Uint8Array = new Uint8Array(0);
  let infoKey = "";
  overlayHook.fn = (ctx) => {
    const v = viewer(); if (!v) return;
    const hv = S.hover;
    // keep the inspection panel in step with the hover and the state (the mission screen redraws on its own)
    const ik = `${v.id}|${v.x},${v.y},${v.ap}|${hv ? hv.x + "," + hv.y : ""}|${S.turn}|${L.version}|${S.units.map(u => u.x + "," + u.y + "," + u.hp).join(";")}`;
    if (ik !== infoKey) { infoKey = ik; const box = panel.querySelector("#labInfo"); if (box) box.innerHTML = info(); }
    if (lab.show.light) for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { ctx.fillStyle = `rgba(0,0,0,${(0.6 * (1 - lightAt(x, y))).toFixed(2)})`; ctx.fillRect(x * TS, y * TS, TS, TS); }
    if (lab.show.perception) {
      const key = `${v.id}|${v.x},${v.y}|${L.version}|${S.turn}|${S.setup.night}|${S.setup.weather}|${S.smoke.length}|${S.flares.length}|${S.fires.size}|${S.units.map(u => u.x + "," + u.y).join(";")}`;
      if (key !== percKey) {
        percKey = key; perc = new Uint8Array(L.W * L.H);
        for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) perc[y * L.W + x] = perceive(v, x, y, unitAt(x, y)).level;
      }
      for (let i = 0; i < perc.length; i++) {
        const lv = perc[i]; if (!lv) continue;
        ctx.fillStyle = lv === IDENTIFIED ? "rgba(110,200,140,0.16)" : "rgba(230,180,80,0.22)";
        ctx.fillRect((i % L.W) * TS, ((i / L.W) | 0) * TS, TS, TS);
      }
    }
    if (lab.show.reach) {
      const res = reachOf(v, 2 * moveOf(v));
      for (let i = 0; i < res.dist.length; i++) if (res.dist[i] > 0) { ctx.strokeStyle = res.dist[i] <= moveOf(v) ? "rgba(122,170,208,0.6)" : "rgba(216,191,134,0.5)"; ctx.strokeRect((i % L.W) * TS + 3, ((i / L.W) | 0) * TS + 3, TS - 6, TS - 6); }
    }
    if (lab.show.overwatch) for (const w of S.units.filter(u => u.alive && u.overwatch)) {
      for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if ((x !== w.x || y !== w.y) && passable(x, y) && perceive(w, x, y).level >= DETECTED && kernelView(w.x, w.y, x, y, SIGHT_MAX, FIRE)) { ctx.fillStyle = isTeam(w) ? "rgba(122,170,208,0.12)" : "rgba(215,91,71,0.14)"; ctx.fillRect(x * TS, y * TS, TS, TS); }
    }
    if (lab.show.ai && v.side === "raider") {
      const sc = scorePositions(v, planPod(S.units.filter(u => u.side === "raider" && u.alive && !u.downed), threats()));
      const lo = Math.min(...sc.map(s => s.v)), hi = Math.max(...sc.map(s => s.v));
      for (const s of sc) { const k = hi > lo ? (s.v - lo) / (hi - lo) : 1; ctx.fillStyle = `rgba(${Math.round(255 * (1 - k))},${Math.round(200 * k)},80,0.28)`; ctx.fillRect(s.x * TS, s.y * TS, TS, TS); }
      for (const s of [...sc].sort((a, b) => b.v - a.v).slice(0, 5)) { ctx.fillStyle = "#fff"; ctx.font = "9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.fillText(s.v.toFixed(0), s.x * TS + TS / 2, s.y * TS + TS / 2 + 3); }
    }
    if (lab.show.cover) for (const u of S.units.filter(u => u.alive && !u.saved && u.side !== "anomaly")) {
      const [n, e, s_, w] = coverSides(u.x, u.y), cx = u.x * TS, cy = u.y * TS;
      const bar = (val: number, x0: number, y0: number, x1: number, y1: number) => { if (!val) return; ctx.strokeStyle = val >= COVER_FULL ? "#7ab0e0" : "#d8bf86"; ctx.lineWidth = val >= COVER_FULL ? 4 : 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
      bar(n, cx + 4, cy + 2, cx + TS - 4, cy + 2); bar(e, cx + TS - 2, cy + 4, cx + TS - 2, cy + TS - 4); bar(s_, cx + 4, cy + TS - 2, cx + TS - 4, cy + TS - 2); bar(w, cx + 2, cy + 4, cx + 2, cy + TS - 4);
    }
    // the viewer, their eye points toward the hovered tile, and the line to it with everything it crosses
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(v.x * TS + 1, v.y * TS + 1, TS - 2, TS - 2);
    if (hv && lab.show.peeks) for (const [ex, ey] of eyePoints(v.x, v.y, hv.x, hv.y)) {
      const px = (v.x + 0.5 + (ex - v.x) * STEP_OUT) * TS, py = (v.y + 0.5 + (ey - v.y) * STEP_OUT) * TS;
      ctx.fillStyle = ex === v.x && ey === v.y ? "#ffffff" : "#86c193"; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    if (hv && lab.show.line && (hv.x !== v.x || hv.y !== v.y)) {
      const t = unitAt(hv.x, hv.y), best = kernelView(v.x, v.y, hv.x, hv.y, SIGHT_MAX, SIGHT, true, peeks(t ?? undefined));
      const ex = best ? v.x + 0.5 + (best.x - v.x) * STEP_OUT : v.x + 0.5, ey = best ? v.y + 0.5 + (best.y - v.y) * STEP_OUT : v.y + 0.5;
      const fireOk = !!kernelView(v.x, v.y, hv.x, hv.y, SIGHT_MAX, FIRE, true, peeks(t ?? undefined));
      ctx.strokeStyle = !best ? "#d75b47" : fireOk ? "#86c193" : "#e0a040"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(ex * TS, ey * TS); ctx.lineTo((hv.x + 0.5) * TS, (hv.y + 0.5) * TS); ctx.stroke(); ctx.setLineDash([]);
      trace(ex, ey, hv.x + 0.5, hv.y + 0.5, 0, c => { const ob = obstacleAt(c.x, c.y); ctx.strokeStyle = ob.sight ? "#d75b47" : ob.fire ? "#e0a040" : "#d8bf86"; ctx.lineWidth = 1.5; ctx.strokeRect(c.x * TS + 6, c.y * TS + 6, TS - 12, TS - 12); });
    }
  };

  // ---- the panel ----
  function info(): string {
    const v = viewer(), hv = S.hover;
    if (!v) return "<p>Pick a viewer with the Inspect tool.</p>";
    const lines: string[] = [`<b>Viewer:</b> ${esc(v.call || v.name)} (${v.side}) at ${v.x},${v.y} · ${v.ap} action${v.ap === 1 ? "" : "s"} · ${v.gun ? esc(v.gun.name) + " " + v.gun.ammo + "/" + v.gun.mag : "unarmed"}`];
    const st = statusesOf(v); if (st.length) lines.push(`Statuses: ${st.map(s => s.name).join(", ")}`);
    if (hv) {
      const ob = obstacleAt(hv.x, hv.y), t = unitAt(hv.x, hv.y), p = perceive(v, hv.x, hv.y, t ?? undefined);
      lines.push(`<b>Tile</b> ${hv.x},${hv.y}: ${["nothing", "low", "high", "wall"][ob.height]}${ob.shape >= 2 ? " (thin)" : ""}${ob.sight ? ", blocks sight" : ""}${ob.fire ? ", stops bullets" : ""} · light ${lightAt(hv.x, hv.y).toFixed(2)}`);
      lines.push(`<b>Perception:</b> ${["unseen", "detected", "identified"][p.level]} · ${p.dist.toFixed(1)} tiles · detect ${p.detect.toFixed(1)}, identify ${p.identify.toFixed(1)}${p.why.length ? "<br>" + esc(p.why.join("; ")) : ""}`);
      if (t && t !== v) {
        const ts = statusesOf(t);
        lines.push(`<b>Target:</b> ${esc(t.call || t.name)} (${t.side}) HP ${t.hp}/${t.maxHp}${ts.length ? " · " + ts.map(s => s.name).join(", ") : ""}`);
        if (canShoot(v, t)) {
          const si = shotInfo(v, t);
          lines.push(`<b>Shot: ${si.chance}%</b>, crit ${si.crit}% · from ${si.from.x},${si.from.y}${si.from.x !== v.x || si.from.y !== v.y ? " (stepping out)" : ""}<br>${si.mods.map(m => `${esc(m[0])} ${m[1] >= 0 ? "+" : ""}${m[1]}`).join(" · ")}`);
        } else lines.push(`<b>Shot:</b> none (${p.level ? "no line of fire" : "can't make them out"})`);
      }
    }
    return lines.map(l => `<p style="margin:4px 0">${l}</p>`).join("");
  }
  function refresh() {
    const t = lab.tool;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center"><b>Tactical lab</b><button class="act" id="labExit" type="button">Exit</button></div>
      <p style="margin:4px 0;opacity:.8">Every number here comes from the game's own rules. Hover a tile or unit to inspect it.</p>
      <div style="margin:4px 0">Trial squad <select id="labTrialSp">${(Object.keys(SPECIALTIES) as SpecialtyId[]).map(k => `<option value="${k}" ${lab.trial?.specialty === k ? "selected" : ""}>${esc(SPECIALTIES[k].name)}</option>`).join("")}</select>
        <select id="labTrialSt">${[0, 1, 2, 3].map(n => `<option value="${n}" ${(lab.trial?.stage ?? 1) === n ? "selected" : ""}>${["Authorized", "Drilled", "Proficient", "Veteran"][n]}</option>`).join("")}</select>
        <button class="act" type="button" id="labTrialGo">${lab.trial ? "Restart trial" : "Run trial"}</button></div>
      <div id="labTrial">${trialCard()}</div>
      <label>Scenario <select id="labPreset"><option value="">Load preset…</option>${PRESETS.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></label>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0">${TOOLS.map(([k, n]) => `<button class="act ${t === k ? "on" : ""}" style="padding:2px 6px;font-size:11px" type="button" data-tool="${esc(k)}">${esc(n)}</button>`).join("")}</div>
      <label>New units carry <select id="labGun">${["rifle", "marksman", "shotgun", "mg", "carbine", "smg"].map(g => `<option ${g === lab.gun ? "selected" : ""}>${g}</option>`).join("")}</select></label>
      <div style="margin:6px 0">${Object.entries(lab.show).map(([k, on]) => `<label style="margin-right:8px"><input type="checkbox" data-show="${k}" ${on ? "checked" : ""}> ${k}</label>`).join("")}</div>
      <div style="margin:6px 0"><label><input type="checkbox" id="labNight" ${S.setup.night && S.setup.kind !== "emergency" ? "checked" : ""}> night</label>
        <label><input type="checkbox" id="labPower" ${S.setup.kind === "emergency" && !S.powerOn ? "checked" : ""}> power out</label>
        <label>weather <select id="labWeather">${["clear", "rain", "storm", "fog", "snow"].map(w => `<option ${w === (S.setup.weather ?? "clear") ? "selected" : ""}>${w}</option>`).join("")}</select></label></div>
      <div style="display:flex;flex-wrap:wrap;gap:3px">
        <button class="act" type="button" id="labRefill">Refill actions and ammo</button>
        <button class="act" type="button" id="labOver">Viewer: overwatch</button>
        <button class="act" type="button" id="labFire">Viewer fires at hovered</button>
        <button class="act" type="button" id="labSupp">Viewer suppresses hovered</button>
        <button class="act" type="button" id="labAI">AI turn for viewer (Insurgent)</button>
        <button class="act" type="button" id="labTurn">End turn (enemy phase)</button>
        <button class="act" type="button" id="labSave">Save</button>
        <button class="act" type="button" id="labExport">Export / import JSON</button>
      </div>
      <div id="labInfo" style="margin-top:6px;border-top:1px solid #3a434b;padding-top:4px">${info()}</div>
      <textarea id="labJson" hidden style="width:100%;height:120px;margin-top:6px"></textarea>`;
    const q = (id: string) => panel.querySelector<HTMLElement>("#" + id)!;
    q("labExit").onclick = () => { teardown(); onExit(); };
    q("labTrialGo").onclick = () => { const sp = (q("labTrialSp") as HTMLSelectElement).value as SpecialtyId, st = Number((q("labTrialSt") as HTMLSelectElement).value); teardown(); openLab(root, onExit, trialSpec(sp, st)); };
    panel.querySelectorAll<HTMLElement>("[data-tool]").forEach(b => b.onclick = () => { lab.tool = b.dataset.tool as Tool; refresh(); });
    panel.querySelectorAll<HTMLInputElement>("[data-show]").forEach(b => b.onchange = () => { (lab.show as Record<string, boolean>)[b.dataset.show!] = b.checked; });
    (q("labGun") as HTMLSelectElement).onchange = e => { lab.gun = (e.target as HTMLSelectElement).value as WeaponType; };
    (q("labPreset") as HTMLSelectElement).onchange = e => { const k = (e.target as HTMLSelectElement).value; if (k) { teardown(); openLab(root, onExit, preset(k)); } };
    (q("labNight") as HTMLInputElement).onchange = e => { S.setup.night = (e.target as HTMLInputElement).checked; computeVis(); refresh(); };
    (q("labPower") as HTMLInputElement).onchange = e => { const off = (e.target as HTMLInputElement).checked; S.setup.kind = off ? "emergency" : "strike"; S.powerOn = !off; computeVis(); refresh(); };
    (q("labWeather") as HTMLSelectElement).onchange = e => { S.setup.weather = (e.target as HTMLSelectElement).value as typeof S.setup.weather; computeVis(); refresh(); };
    q("labRefill").onclick = () => { for (const u of S.units) { u.ap = 2; if (u.gun) u.gun.ammo = u.gun.mag; } refresh(); };
    q("labOver").onclick = () => { const v = viewer(); if (v && v.ap > 0) payOverwatch(v); refresh(); };
    q("labFire").onclick = async () => { const v = viewer(), t = S.hover && unitAt(S.hover.x, S.hover.y); if (v && t && canShoot(v, t)) await fire(v, t, false); computeVis(); refresh(); };
    q("labSupp").onclick = () => { const v = viewer(), t = S.hover && unitAt(S.hover.x, S.hover.y); if (v && t && canShoot(v, t)) suppress(v, [t]); refresh(); };
    q("labAI").onclick = async () => { const v = viewer(); if (v && v.side === "raider") { v.ap = 2; await tacticalTurn(v, planPod(S.units.filter(u => u.side === "raider" && u.alive && !u.downed), threats()), null, () => false); computeVis(); } refresh(); };
    q("labTurn").onclick = async () => { await endTurn(); refresh(); };
    q("labSave").onclick = () => { save(currentSpec()); q("labSave").textContent = "Saved"; };
    q("labExport").onclick = () => {
      const ta = q("labJson") as HTMLTextAreaElement;
      if (ta.hidden) { ta.hidden = false; ta.value = JSON.stringify(currentSpec()); q("labExport").textContent = "Load this JSON"; return; }
      try { const spec = JSON.parse(ta.value) as SandboxSpec; teardown(); openLab(root, onExit, spec); } catch { ta.value = "That isn't a valid scenario.\n" + ta.value; }
    };
  }
  // the panel follows the hover and every change in the mission
  const prevUpdate = hooks.update;
  hooks.update = () => { prevUpdate(); const box = panel.querySelector("#labInfo"); if (box) box.innerHTML = info(); const tc = panel.querySelector("#labTrial"); if (tc) tc.innerHTML = trialCard(); };
  function teardown() { cam.insets.r = 0; tapHook.fn = null; overlayHook.fn = null; panel.remove(); }
  refresh();
}
/** Thick smoke the turn it's thrown (the lab keeps it thick until removed). */
function syncSmoke() { setSmoke(S.smoke.map(s => [s.x, s.y])); }
void HALF;
