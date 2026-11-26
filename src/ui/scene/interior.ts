// Presentation overhaul P2: a room's interior, drawn from its layout (src/scene/layout.ts). One 1600 × 900 scene:
// a cut-away box (ceiling, back wall, floor in perspective, side walls with the room's real doors), the room's
// furnishings by type, the people who work there, and its state over the top: scaffolding while it's built,
// cracks and smoke when damaged, darkness and red emergency lamps without power, beacons in an alarm.
//
// Provisional art: everything is drawn in code to docs/ART_DIRECTION.md. Each part is a function of the layout, so
// finished art can replace them one at a time.
import type { RoomLayout, DoorKind } from "../../scene/layout";
import { anomalyFigure } from "../art";
import { figureSvg, type FigureSpec } from "./figure";
import { weaponSide } from "./weapons";
import { FRAMES, MOUNT_NAMES, mountAt, type MountId } from "../../data/mounts";
import type { AttachmentId } from "../../data/weapons";
import { rollLook } from "../../data/looks";
import { DCLASS_PER_FIGURE, FRAME, STAFF_SHOWN, signLabel, signRect, staffSlot, type Target } from "../../scene/targets";

export const W = FRAME.W, H = FRAME.H;
/** The back wall's rectangle, and the floor line people stand on at the back (shared with the targets). */
const { BX0, BX1, BY0, BY1 } = FRAME;
const C = {
  ceil: "#1c2125", wallUp: "#7d7866", wallUpLit: "#a39d86", dado: "#3d4a40", dadoDk: "#2f3a32", floor: "#34383a", floorDk: "#26292b",
  steel: "#56636d", steelDk: "#3b454e", steelLt: "#7d8a93", olive: "#58603f", amber: "#d9a441", red: "#c0503f", green: "#7fb08a",
  lamp: "#ffe6b0", ink: "#14181c", paper: "#d9d2bf", wood: "#5a4630", woodLt: "#6e5638", glass: "#7fa6b8", hz: "#d6aa32",
};

export interface SceneExtras {
  /** People to stand in the room in place of the layout's staff (the quarters' operatives, with their gear). */
  people?: { spec: FigureSpec; key: string; label?: string }[];
  /** The armory's racks: weapon model ids in stores. */
  racks?: string[];
  /** A highlighted person by key. */
  focus?: string;
  /** The armory's bench: a weapon laid out large, its mounts marked, an attachment previewed on it. */
  bench?: { model: string; attachment?: string; ghost?: string; highlight?: string; mounts: string[]; zoom: number; owner?: FigureSpec; narrow?: boolean };
  /** P5, the lab: what the chalkboard shows (the selected project), its progress, and a stamp when it's done. */
  board?: { title: string; lines: string[]; progress?: number; stamp?: string };
  /** P5, a containment wing: an experiment under way in the cell. */
  test?: { name: string; dclass: number; researcher: boolean };
  /** P5, the workshop: what is on the bench. */
  making?: { kind: "attachment" | "ammo" | "item" | "refit"; id: string; label: string; progress: number };
  /** P5, Command: the incidents on the operations map (x, y as 0..1 of the map), alarms lit, the teletype's line. */
  ops?: { pins: { x: number; y: number; urgent: boolean }[]; alarms: number; teletype: string; clock: string };
  /** The quarters: the task force's own designation and name on its banner. */
  unit?: { code: string; name: string };
  /** One person brought forward, large, with the room still behind them (the quarters' selected operative). */
  hero?: { spec: FigureSpec; key: string; x?: number };
  /** The stretch of the scene, in scene units, people stand across (clear of a side panel). */
  span?: [number, number];
  /** Environment-first interface: the room's interactive objects, and the one selected. */
  targets?: Target[];
  selected?: string;
  /** The lab: the kind of apparatus on the bench for the project there (anomalies, arms, gear, site, personnel, intel). */
  apparatus?: string;
}

export function interiorSvg(L: RoomLayout, x: SceneExtras = {}) {
  const parts: string[] = [];
  const dark = !L.powered, built = L.state !== "building";
  parts.push(defs());
  parts.push(shell(L));
  parts.push(door(L.doors.left, -1, L), door(L.doors.right, 1, L));
  if (built || L.state === "repairing") parts.push(pipes(L), signage(L));
  parts.push(lights(L, dark));
  if (built) parts.push(FURNISH[L.kind]?.(L, x) ?? "", activity(L, x));
  if (built) parts.push(fixtures(L));
  parts.push(x.bench ? benchScene(x.bench) : people(L, x));
  parts.push(overlay(L, dark));
  if (x.targets?.length) parts.push(targetLayer(x.targets, x.selected));
  return `<svg class="interior" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(L.name)} ${esc(L.designation)}">${parts.join("")}</svg>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));

function defs() {
  return `<defs>
    <linearGradient id="sc-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.floorDk}"/><stop offset="1" stop-color="${C.floor}"/></linearGradient>
    <linearGradient id="sc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d5a4d"/><stop offset=".35" stop-color="${C.wallUp}"/><stop offset="1" stop-color="#6e6a5a"/></linearGradient>
    <linearGradient id="sc-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2d2a"/><stop offset="1" stop-color="#4b4a40"/></linearGradient>
    <linearGradient id="sc-sideR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#2a2d2a"/><stop offset="1" stop-color="#4b4a40"/></linearGradient>
    <radialGradient id="sc-cone" cx=".5" cy="0" r="1"><stop offset="0" stop-color="${C.lamp}" stop-opacity=".38"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient>
    <radialGradient id="sc-vig" cx=".5" cy=".45" r=".78"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>
    <linearGradient id="sc-aoUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    <linearGradient id="sc-aoDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    <linearGradient id="sc-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.lamp}" stop-opacity=".34"/><stop offset=".6" stop-color="${C.lamp}" stop-opacity=".1"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></linearGradient>
    <radialGradient id="sc-pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.lamp}" stop-opacity=".3"/><stop offset=".6" stop-color="${C.lamp}" stop-opacity=".08"/><stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/></radialGradient>
    <linearGradient id="sc-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dfae" stop-opacity=".1"/><stop offset=".5" stop-color="#f3dfae" stop-opacity=".03"/><stop offset="1" stop-color="#0a1218" stop-opacity=".18"/></linearGradient>
    <filter id="sc-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <radialGradient id="sc-red" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.red}" stop-opacity=".55"/><stop offset="1" stop-color="${C.red}" stop-opacity="0"/></radialGradient>
    <pattern id="sc-hz" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="28" height="28" fill="#1a1a1a"/><rect width="14" height="28" fill="${C.hz}"/></pattern>
    <pattern id="sc-tilesm" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none" stroke="#7d8078" stroke-opacity=".55" stroke-width="2"/></pattern>
    <pattern id="sc-panelwood" width="150" height="200" patternUnits="userSpaceOnUse"><rect x="8" y="10" width="134" height="180" fill="none" stroke="#2e2418" stroke-width="4"/><rect x="0" width="4" height="200" fill="#3a2e1e"/></pattern>
    <pattern id="sc-ribs" width="36" height="100" patternUnits="userSpaceOnUse"><rect width="10" height="100" fill="#fff" opacity=".06"/><rect x="10" width="3" height="100" fill="#000" opacity=".2"/></pattern>
    <pattern id="sc-planks" width="200" height="34" patternUnits="userSpaceOnUse"><rect width="200" height="34" fill="none" stroke="#3a2e1e" stroke-opacity=".6" stroke-width="2"/><circle cx="20" cy="17" r="2" fill="#2a2018"/></pattern>
    <pattern id="sc-rivets" width="120" height="90" patternUnits="userSpaceOnUse"><rect width="120" height="90" fill="none" stroke="#22282c" stroke-width="3"/>${[8, 112].map(px => [8, 82].map(py => `<circle cx="${px}" cy="${py}" r="3.5" fill="#6c777f"/>`).join("")).join("")}</pattern>
    <pattern id="sc-tile" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/></pattern>
    <pattern id="sc-conc" width="160" height="80" patternUnits="userSpaceOnUse"><rect width="160" height="80" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/><circle cx="40" cy="30" r="2" fill="#000" opacity=".1"/><circle cx="120" cy="60" r="1.5" fill="#000" opacity=".1"/></pattern>
  </defs>`;
}

/** The box: ceiling, back wall with the dado line, floor in perspective, the two side walls. */
/** Each kind of room is built differently: a lab is tiled, Command panelled, the workshop corrugated steel over
 *  stained concrete, containment riveted plate, the D-Class block painted institutional blue-grey, the surface
 *  buildings timber huts. */
const ARCH: Record<string, { up: string; low: string; dado: number; pat?: string; patLow?: string }> = {
  lab: { up: "#b4b0a0", low: "#c9cbc4", dado: 430, patLow: "sc-tilesm" },
  medical: { up: "#b8b6aa", low: "#c9cbc4", dado: 420, patLow: "sc-tilesm" },
  amnestics: { up: "#a9a796", low: "#bfc2b9", dado: 440, patLow: "sc-tilesm" },
  command: { up: "#5d6058", low: "#4a3a28", dado: 450, patLow: "sc-panelwood" },
  psych: { up: "#8a7e66", low: "#5a4630", dado: 450, patLow: "sc-panelwood" },
  workshop: { up: "#5c6064", low: "#3c3b36", dado: 500, pat: "sc-ribs" },
  generator: { up: "#55595c", low: "#3a3a36", dado: 500, pat: "sc-ribs" },
  barracks: { up: "#6a6c66", low: "#3b4a52", dado: 480 },
  holding: { up: "#62645e", low: "#3b4a52", dado: 480 },
  security: { up: "#6e6a5a", low: "#3d4a40", dado: 470 },
  training: { up: "#6e6a5a", low: "#3d4a40", dado: 470 },
  quarters: { up: "#7a6a4e", low: "#4b4a3c", dado: 470, pat: "sc-planks" },
  armory: { up: "#6e5f46", low: "#4b4a3c", dado: 470, pat: "sc-planks" },
  cont: { up: "#4a5257", low: "#3a4247", dado: 470, pat: "sc-rivets", patLow: "sc-rivets" },
};
function shell(L: RoomLayout) {
  const a = ARCH[L.kind.startsWith("cont_") ? "cont" : L.kind] ?? { up: C.wallUp, low: C.dado, dado: 470 };
  const dadoY = a.dado, lower = a.low;
  const floorTone = L.features.floor === 0 ? "url(#sc-floor)" : L.features.floor === 1 ? "#2f3437" : L.features.floor === 2 ? "#363229" : "#2c3134";
  return `<rect width="${W}" height="${H}" fill="${C.ceil}"/>
    <path d="M0 0 H${W} L${BX1} ${BY0} H${BX0}Z" fill="#171b1e"/>
    <rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="${a.up}"/>
    <rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="url(#sc-wall)" opacity=".45"/>
    ${a.pat ? `<rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${dadoY - BY0}" fill="url(#${a.pat})"/>` : ""}
    <rect x="${BX0}" y="${dadoY}" width="${BX1 - BX0}" height="${BY1 - dadoY}" fill="${lower}"/>
    ${a.patLow ? `<rect x="${BX0}" y="${dadoY}" width="${BX1 - BX0}" height="${BY1 - dadoY}" fill="url(#${a.patLow})"/>` : ""}
    <rect x="${BX0}" y="${dadoY - 6}" width="${BX1 - BX0}" height="6" fill="${C.dadoDk}"/>
    <rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="url(#sc-conc)"/>
    <path d="M${BX0} ${BY1} H${BX1} L${W} ${H} H0Z" fill="${floorTone}"/>
    <path d="M${BX0} ${BY1} H${BX1} L${W} ${H} H0Z" fill="url(#sc-tile)" opacity=".7"/>
    ${[0.2, 0.4, 0.6, 0.8].map(t => `<line x1="${BX0 + (BX1 - BX0) * t}" y1="${BY1}" x2="${W * t}" y2="${H}" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`).join("")}
    <path d="M0 0 L${BX0} ${BY0} V${BY1} L0 ${H}Z" fill="url(#sc-side)"/>
    <path d="M${W} 0 L${BX1} ${BY0} V${BY1} L${W} ${H}Z" fill="url(#sc-sideR)"/>
    <path d="M0 ${H * 0.72} L${BX0} ${dadoY + 30}" stroke="#000" stroke-opacity=".25" stroke-width="3"/><path d="M${W} ${H * 0.72} L${BX1} ${dadoY + 30}" stroke="#000" stroke-opacity=".25" stroke-width="3"/>
    <rect x="${BX0}" y="${BY1 - 8}" width="${BX1 - BX0}" height="8" fill="#000" opacity=".25"/>
    <rect x="${BX0}" y="${BY1 - 90}" width="${BX1 - BX0}" height="90" fill="url(#sc-aoUp)" opacity=".6"/>
    <path d="M${BX0} ${BY1} H${BX1} L${BX1 + 40} ${BY1 + 50} H${BX0 - 40}Z" fill="url(#sc-aoDown)"/>
    <rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="60" fill="url(#sc-aoDown)" opacity=".7"/>`;
}

/** A door on a side wall, in the wall's perspective. side −1 is the left wall. */
function door(kind: DoorKind, side: -1 | 1, L: RoomLayout) {
  // the door's rectangle on the side wall, as a quadrilateral: near edge at u = .35, far edge at u = .7 of the way to the back
  const at = (u: number, v: number) => { const xN = side < 0 ? 0 : W, xF = side < 0 ? BX0 : BX1; const x = xN + (xF - xN) * u; const top = 0 + (BY0 - 0) * u, bot = H + (BY1 - H) * u; return [x, top + (bot - top) * v]; };
  const quad = (u0: number, u1: number, v0: number, v1: number) => { const p = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]; return p.map(([a, b]) => `${a.toFixed(0)},${b.toFixed(0)}`).join(" "); };
  const label = (t: string, u: number) => { const [lx, ly] = at(u, 0.3); return `<text x="${lx}" y="${ly}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.paper}" text-anchor="middle" opacity=".75">${t}</text>`; };
  switch (kind) {
    case "lift": return `<polygon points="${quad(0.38, 0.72, 0.42, 0.98)}" fill="#2a3036" stroke="${C.steel}" stroke-width="4"/>
      <polygon points="${quad(0.55, 0.555, 0.43, 0.97)}" fill="#14181c"/>
      <polygon points="${quad(0.42, 0.68, 0.32, 0.38)}" fill="#14181c" stroke="${C.steelDk}" stroke-width="2"/>${label(`LIFT · ${L.level >= 0 ? `L${L.level + 1}` : "SURFACE"}`, 0.55)}
      <circle cx="${at(0.55, 0.35)[0]}" cy="${at(0.55, 0.35)[1]}" r="5" fill="${C.amber}"/>`;
    case "room": return `<polygon points="${quad(0.4, 0.7, 0.45, 0.98)}" fill="#3b3a32"/><polygon points="${quad(0.43, 0.67, 0.5, 0.98)}" fill="${C.lamp}" opacity=".16"/>
      <polygon points="${quad(0.4, 0.7, 0.45, 0.98)}" fill="none" stroke="${C.steelDk}" stroke-width="10"/>${label("BAY " + String.fromCharCode(65 + L.slot + (side < 0 ? -1 : 1)), 0.55)}`;
    case "sealed": return `<polygon points="${quad(0.4, 0.7, 0.45, 0.98)}" fill="${C.steelDk}" stroke="${C.steel}" stroke-width="6"/>
      <polygon points="${quad(0.4, 0.7, 0.88, 0.98)}" fill="url(#sc-hz)" opacity=".8"/>${label("BAY SEALED", 0.55)}
      ${[0.45, 0.55, 0.65].map(u => { const [a, b] = at(u, 0.7); return `<circle cx="${a}" cy="${b}" r="5" fill="${C.steel}"/>`; }).join("")}`;
    case "rock": return `<polygon points="${quad(0.05, 0.95, 0.15, 0.95)}" fill="#3a3530" opacity=".55"/>
      ${[0.2, 0.4, 0.6, 0.8].map((u, i) => { const [a, b] = at(u, 0.3 + (i % 2) * 0.3); return `<path d="M${a} ${b} l${side * 30} 40 l${side * -12} 50" stroke="#1d1a17" stroke-width="3" fill="none"/>`; }).join("")}`;
    case "yard": return `<polygon points="${quad(0.3, 0.75, 0.2, 0.55)}" fill="#6d8aa0" opacity=".85"/><polygon points="${quad(0.3, 0.75, 0.2, 0.55)}" fill="none" stroke="#3a3128" stroke-width="10"/>
      <polygon points="${quad(0.52, 0.53, 0.2, 0.55)}" fill="#3a3128"/>`;
  }
}

function pipes(L: RoomLayout) {
  const n = L.features.pipes + 1, out: string[] = [];
  for (let i = 0; i < n; i++) { const y = BY0 + 18 + i * 16; out.push(`<rect x="${BX0}" y="${y}" width="${BX1 - BX0}" height="10" fill="${i % 2 ? "#4a5056" : "#5a5040"}"/><rect x="${BX0}" y="${y}" width="${BX1 - BX0}" height="3" fill="#fff" opacity=".08"/>`); for (let k = 0; k < 6; k++) out.push(`<rect x="${BX0 + 60 + k * 220}" y="${y - 3}" width="10" height="16" fill="#2a2e31"/>`); }
  return out.join("");
}
function signage(L: RoomLayout) {
  const [x, y, w, h] = signRect(L);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1f2326" opacity=".85"/><text x="${x + 16}" y="${y + 30}" font-family="IBM Plex Mono,monospace" font-size="20" font-weight="600" letter-spacing="1" fill="${C.paper}">${esc(signLabel(L))}</text>
    ${L.features.signage >= 2 ? `<text x="${BX0 + (BX1 - BX0) / 2}" y="${BY0 + 80}" font-family="IBM Plex Mono,monospace" font-size="15" letter-spacing="3" fill="#2a2a24" opacity=".6" text-anchor="middle">SECURE · CONTAIN · PROTECT</text>` : ""}`;
}

function lights(L: RoomLayout, dark: boolean) {
  const n = 2 + (L.features.lights % 3), out: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = BX0 + (BX1 - BX0) * (i + 0.5) / n;
    out.push(`<line x1="${x}" y1="${BY0 - 60}" x2="${x}" y2="${BY0 + 6}" stroke="#111" stroke-width="3"/><path d="M${x - 30} ${BY0 + 6} h60 l-12 18 h-36z" fill="#2c3237"/>`);
    if (!dark) out.push(`<ellipse cx="${x}" cy="${BY0 + 90}" rx="230" ry="170" fill="url(#sc-pool)" opacity=".8"/>
      <path d="M${x - 20} ${BY0 + 24} L${x - 250} ${BY1 + 210} H${x + 250} L${x + 20} ${BY0 + 24}Z" fill="url(#sc-beam)" filter="url(#sc-soft)"/>
      <ellipse cx="${x}" cy="${BY1 + 110}" rx="300" ry="80" fill="url(#sc-pool)"/>
      <ellipse cx="${x}" cy="${BY0 + 24}" rx="17" ry="5" fill="#fff6dc"/><ellipse cx="${x}" cy="${BY0 + 26}" rx="40" ry="14" fill="${C.lamp}" opacity=".35" filter="url(#sc-soft)"/>`);
  }
  return out.join("");
}

// ---------- furnishings by room type ----------
const crate = (x: number, y: number, w = 90, h = 70, label = "") => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="#5e4c32" stroke="#3f3222" stroke-width="3"/><path d="M${x} ${y - h} L${x + w} ${y} M${x + w} ${y - h} L${x} ${y}" stroke="#3f3222" stroke-width="3"/>${label ? `<text x="${x + w / 2}" y="${y - h / 2 + 5}" font-family="IBM Plex Mono,monospace" font-size="13" fill="#e2d4b1" text-anchor="middle">${label}</text>` : ""}`;
const desk = (x: number, w = 220) => `<rect x="${x}" y="${BY1 - 110}" width="${w}" height="14" fill="${C.woodLt}"/><rect x="${x + 6}" y="${BY1 - 96}" width="70" height="96" fill="${C.wood}"/><rect x="${x + w - 14}" y="${BY1 - 96}" width="10" height="96" fill="${C.wood}"/>`;
const cabinet = (x: number, h = 230) => `<rect x="${x}" y="${BY1 - h}" width="80" height="${h}" fill="#4b5a46" stroke="#2c3528" stroke-width="3"/>${[0.25, 0.5, 0.75].map(t => `<rect x="${x + 6}" y="${BY1 - h + h * t - 4}" width="68" height="4" fill="#2c3528"/><rect x="${x + 32}" y="${BY1 - h + h * t - 30}" width="16" height="6" fill="${C.steelLt}"/>`).join("")}`;
const bench = (x: number, w: number, top = "#5d666d") => `<rect x="${x}" y="${BY1 - 120}" width="${w}" height="18" fill="${top}"/><rect x="${x + 8}" y="${BY1 - 102}" width="${w - 16}" height="102" fill="#3a4148"/>${Array.from({ length: Math.floor(w / 110) }, (_, i) => `<rect x="${x + 20 + i * 110}" y="${BY1 - 90}" width="80" height="34" fill="#30363c" stroke="#222" stroke-width="2"/>`).join("")}`;
const flask = (x: number, y: number, col: string, s = 1) => `<path d="M${x - 6 * s} ${y - 60 * s} v${22 * s} l${-18 * s} ${30 * s} q${-4 * s} ${8 * s} ${6 * s} ${8 * s} h${36 * s} q${10 * s} 0 ${6 * s} ${-8 * s} l${-18 * s} ${-30 * s} v${-22 * s}z" fill="${col}" opacity=".75" stroke="#cfd8dc" stroke-width="2"/>`;
const bunk = (x: number, y: number, blanket: string) => `<rect x="${x}" y="${y - 170}" width="10" height="170" fill="#4a4f52"/><rect x="${x + 220}" y="${y - 170}" width="10" height="170" fill="#4a4f52"/>
  ${[y - 150, y - 60].map(by => `<rect x="${x}" y="${by}" width="230" height="12" fill="#5a6066"/><rect x="${x + 6}" y="${by - 16}" width="218" height="18" fill="${blanket}"/><rect x="${x + 8}" y="${by - 22}" width="46" height="14" rx="4" fill="#d4cfbd"/>`).join("")}`;

const FURNISH: Partial<Record<RoomLayout["kind"], (L: RoomLayout, x: SceneExtras) => string>> = {
  command: () => `
    <rect x="${BX0 + 60}" y="${BY0 + 150}" width="560" height="270" fill="#2f3d48" stroke="${C.steelDk}" stroke-width="8"/>
    <path d="M${BX0 + 110} ${BY0 + 230}c40-30 90-20 120 10s70 10 90-10 60 20 50 60-60 40-90 30-70 30-110 10-70-60-60-100z M${BX0 + 380} ${BY0 + 190}c30-10 80 0 120 20s30 60 0 80-80 0-100-30-40-60-20-70z M${BX0 + 280} ${BY0 + 330}c30-10 60 0 70 30s-30 40-50 30-40-50-20-60z" fill="#4b5f52"/>
    <!-- the operations map's pins are the real incidents, drawn by activity() -->
    <text x="${BX0 + 340}" y="${BY0 + 180}" font-family="IBM Plex Mono,monospace" font-size="16" fill="${C.paper}" text-anchor="middle" opacity=".7">OPERATIONS · WORLD</text>
    ${["WASHINGTON", "LONDON", "MOSCOW", "TOKYO"].map((t, i) => `<circle cx="${BX0 + 720 + i * 150}" cy="${BY0 + 190}" r="46" fill="#14181c" stroke="${C.amber}" stroke-width="4"/><line x1="${BX0 + 720 + i * 150}" y1="${BY0 + 190}" x2="${BX0 + 730 + i * 150}" y2="${BY0 + 160}" stroke="${C.amber}" stroke-width="4"/><line x1="${BX0 + 720 + i * 150}" y1="${BY0 + 190}" x2="${BX0 + 745 + i * 150}" y2="${BY0 + 198}" stroke="${C.paper}" stroke-width="3"/><text x="${BX0 + 720 + i * 150}" y="${BY0 + 262}" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.paper}" text-anchor="middle">${t}</text>`).join("")}
    <rect x="${BX0 + 680}" y="${BY1 - 190}" width="420" height="190" fill="#2a3138"/><rect x="${BX0 + 680}" y="${BY1 - 200}" width="420" height="16" fill="${C.steel}"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${BX0 + 700 + (i % 6) * 66}" y="${BY1 - 170 + Math.floor(i / 6) * 50}" width="40" height="22" fill="${i % 4 ? C.green : C.amber}" opacity=".75"/>`).join("")}
    <path d="M${BX0 + 380} ${BY1 + 70} h420 l40 90 h-500z" fill="#4a3c2a"/><rect x="${BX0 + 420}" y="${BY1 + 90}" width="320" height="40" fill="#2f3d48"/>
    ${cabinet(BX1 - 120)}`,
  generator: (L) => {
    const tier = L.upgrades.genTier, sets = tier >= 1 ? 2 : 1;
    const engine = (x: number) => tier >= 3
      ? `<rect x="${x}" y="${BY1 - 380}" width="300" height="380" rx="140" fill="${C.steelDk}" stroke="${C.steel}" stroke-width="6"/><rect x="${x + 30}" y="${BY1 - 300}" width="240" height="40" fill="${C.amber}" opacity=".7"/><text x="${x + 150}" y="${BY1 - 272}" font-family="IBM Plex Mono,monospace" font-size="18" text-anchor="middle" fill="#1a1a1a">REACTOR</text>`
      : tier === 2 ? `<rect x="${x}" y="${BY1 - 230}" width="420" height="200" rx="90" fill="${C.steelDk}" stroke="${C.steel}" stroke-width="6"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${x + 60 + i * 60} ${BY1 - 226} v190" stroke="${C.steel}" stroke-width="3"/>`).join("")}<circle cx="${x + 420}" cy="${BY1 - 130}" r="70" fill="#2a2e31" stroke="${C.steel}" stroke-width="6"/>`
      : `<rect x="${x}" y="${BY1 - 220}" width="360" height="170" rx="20" fill="${C.steelDk}" stroke="${C.steel}" stroke-width="6"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${x + 30 + i * 52}" y="${BY1 - 260}" width="34" height="60" fill="#4a535a"/><circle cx="${x + 47 + i * 52}" cy="${BY1 - 268}" r="10" fill="#2a2e31"/>`).join("")}<rect x="${x + 20}" y="${BY1 - 50}" width="320" height="50" fill="#2a3138"/>`;
    return `${engine(BX0 + 80)}${sets > 1 ? engine(BX0 + 620) : ""}
      <rect x="${BX1 - 180}" y="${BY0 + 40}" width="40" height="${BY1 - BY0 - 40}" fill="#4a5056"/><rect x="${BX1 - 230}" y="${BY1 - 260}" width="160" height="200" fill="#2f363c" stroke="${C.steel}" stroke-width="4"/>
      ${[0, 1, 2].map(i => `<circle cx="${BX1 - 190 + i * 50}" cy="${BY1 - 200}" r="18" fill="#14181c" stroke="${C.paper}" stroke-width="3"/><line x1="${BX1 - 190 + i * 50}" y1="${BY1 - 200}" x2="${BX1 - 180 + i * 50}" y2="${BY1 - 214}" stroke="${L.state === "damaged" ? C.red : C.amber}" stroke-width="3"/>`).join("")}
      <rect x="${BX0 + 60}" y="${BY1 - 14}" width="${BX1 - BX0 - 120}" height="14" fill="url(#sc-hz)"/>`;
  },
  barracks: (L) => {
    const rows = L.upgrades.expanded ? 5 : 4;
    return `${Array.from({ length: rows }, (_, i) => bunk(BX0 + 30 + i * ((BX1 - BX0 - 260) / (rows - 1)), BY1, "#b8622a")).join("")}
      <rect x="${BX0}" y="${BY0 + 60}" width="${BX1 - BX0}" height="40" fill="#20262b" opacity=".6"/><text x="${BX0 + 600}" y="${BY0 + 88}" font-family="IBM Plex Mono,monospace" font-size="18" fill="${C.paper}" text-anchor="middle">D-CLASS PERSONNEL · LIGHTS OUT 2100</text>
      ${L.capacity && L.headcount / L.capacity > 0.8 ? `${[0, 1, 2].map(i => `<rect x="${BX0 + 120 + i * 330}" y="${BY1 + 150 + (i % 2) * 30}" width="200" height="34" rx="8" fill="#8a7a5a" transform="rotate(${(i - 1) * 4} ${BX0 + 220 + i * 330} ${BY1 + 167})"/><rect x="${BX0 + 126 + i * 330}" y="${BY1 + 146 + (i % 2) * 30}" width="44" height="18" rx="5" fill="#d4cfbd"/>`).join("")}<text x="${BX0 + 600}" y="${BY0 + 50}" font-family="IBM Plex Mono,monospace" font-size="22" letter-spacing="4" fill="${C.red}" text-anchor="middle">OVER CAPACITY</text>` : ""}
      ${L.upgrades.recreation ? `<rect x="${BX0 + 470}" y="${BY1 + 60}" width="260" height="20" fill="${C.woodLt}"/><rect x="${BX0 + 520}" y="${BY1 + 40}" width="70" height="20" fill="#1a1a1a"/><rect x="${BX0 + 640}" y="${BY1 + 36}" width="60" height="24" fill="#6b4a2a"/>` : ""}`;
  },
  security: () => `
    ${[0, 1, 2, 3].map(i => `<rect x="${BX0 + 40 + i * 100}" y="${BY1 - 300}" width="90" height="300" fill="#4b5a46" stroke="#2c3528" stroke-width="3"/>${[30, 40, 50].map(y => `<rect x="${BX0 + 58 + i * 100}" y="${BY1 - 300 + y}" width="54" height="4" fill="#2c3528"/>`).join("")}<rect x="${BX0 + 110 + i * 100}" y="${BY1 - 160}" width="6" height="22" fill="${C.amber}"/>`).join("")}
    <rect x="${BX0 + 480}" y="${BY1 - 330}" width="300" height="230" fill="${C.wood}"/>${[0, 1, 2, 3, 4, 5].map(i => `<g transform="translate(${BX0 + 506 + i * 46} ${BY1 - 120}) rotate(-90) scale(.2)">${weaponSide("m2_carbine")}</g>`).join("")}
    <rect x="${BX1 - 420}" y="${BY0 + 120}" width="360" height="200" fill="#20262b" stroke="${C.steel}" stroke-width="4"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${BX1 - 380 + (i % 6) * 56}" cy="${BY0 + 180 + Math.floor(i / 6) * 70}" r="12" fill="${i === 3 ? C.red : C.green}" opacity=".8"/>`).join("")}
    <text x="${BX1 - 240}" y="${BY0 + 145}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.paper}" text-anchor="middle">WING ALARM BOARD</text>
    ${desk(BX1 - 360, 260)}`,
  medical: (L) => `
    ${[0, 1, 2].map(i => `<rect x="${BX0 + 60 + i * 300}" y="${BY1 - 130}" width="230" height="26" fill="#d6d9d2"/><rect x="${BX0 + 60 + i * 300}" y="${BY1 - 160}" width="60" height="30" fill="#ecefe8"/><rect x="${BX0 + 66 + i * 300}" y="${BY1 - 104}" width="10" height="104" fill="${C.steel}"/><rect x="${BX0 + 274 + i * 300}" y="${BY1 - 104}" width="10" height="104" fill="${C.steel}"/>
      <rect x="${BX0 + 296 + i * 300}" y="${BY0 + 80}" width="6" height="${BY1 - BY0 - 80}" fill="${C.steel}"/><path d="M${BX0 + 296 + i * 300} ${BY0 + 90} q30 60 0 120 q30 60 0 120 q30 60 0 120" fill="#b9c2c0" opacity=".5"/>`).join("")}
    ${L.staff.filter(s => s.role === "patient").slice(0, 3).map((s, i) => `<rect x="${BX0 + 110 + i * 300}" y="${BY1 - 158}" width="170" height="32" rx="10" fill="#9fae9a"/><circle cx="${BX0 + 100 + i * 300}" cy="${BY1 - 146}" r="18" fill="#c99a72"/>`).join("")}
    <rect x="${BX1 - 250}" y="${BY1 - 360}" width="180" height="360" fill="#c9cdc6"/><path d="M${BX1 - 180} ${BY1 - 300}h40v30h30v40h-30v30h-40v-30h-30v-40h30z" fill="${C.red}"/>`,
  psych: () => `
    <rect x="${BX0 + 120}" y="${BY1 - 110}" width="340" height="70" rx="20" fill="#5b3e3a"/><rect x="${BX0 + 100}" y="${BY1 - 170}" width="70" height="130" rx="20" fill="#6f4c46"/>
    <rect x="${BX0 + 620}" y="${BY1 - 120}" width="140" height="90" rx="16" fill="#4a5a46"/><rect x="${BX0 + 620}" y="${BY1 - 190}" width="40" height="160" rx="12" fill="#56684f"/>
    <rect x="${BX1 - 360}" y="${BY0 + 110}" width="300" height="${BY1 - BY0 - 110}" fill="${C.wood}"/>${[0, 1, 2, 3].map(r => Array.from({ length: 9 }, (_, i) => `<rect x="${BX1 - 350 + i * 32}" y="${BY0 + 130 + r * 100}" width="24" height="80" fill="${["#6a2e2a", "#2e4a6a", "#4a5a2e", "#6a5a2e"][(i + r) % 4]}"/>`).join("")).join("")}
    <rect x="${BX0 + 520}" y="${BY0 + 170}" width="200" height="140" fill="${C.paper}" stroke="${C.wood}" stroke-width="8"/><path d="M${BX0 + 540} ${BY0 + 280} q40 -60 80 -20 t80 -40" stroke="#6a8a6a" stroke-width="6" fill="none"/>`,
  lab: (L, x) => `
    <rect x="${BX0 + 60}" y="${BY0 + 130}" width="420" height="220" fill="#1f2a24" stroke="${C.wood}" stroke-width="10"/>
    <text x="${BX0 + 80}" y="${BY0 + 175}" font-family="Special Elite,monospace" font-size="22" fill="#d8d8d0" opacity=".8">${esc((L.activity[0] ?? "no project").replace(/_/g, " ").slice(0, 26))}</text>
    ${[0, 1, 2, 3].map(i => `<path d="M${BX0 + 80} ${BY0 + 210 + i * 30}h${120 + (i * 70) % 220}" stroke="#d8d8d0" stroke-opacity=".5" stroke-width="3"/>`).join("")}
    ${bench(BX0 + 20, BX1 - BX0 - 40)}
    ${[[BX0 + 120, C.green], [BX0 + 220, C.glass], [BX0 + 360, C.amber], [BX0 + 1010, C.green]].map(([fx, col]) => flask(fx as number, BY1 - 120, col as string)).join("")}
    ${apparatus(x.apparatus ?? "anomalies")}
    <rect x="${BX1 - 330}" y="${BY0 + 120}" width="260" height="${BY1 - BY0 - 240}" fill="#2f363c" stroke="${C.steel}" stroke-width="6"/><rect x="${BX1 - 310}" y="${BY0 + 140}" width="220" height="200" fill="${C.glass}" opacity=".2"/><text x="${BX1 - 200}" y="${BY0 + 370}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.paper}" text-anchor="middle">FUME HOOD</text>`,
  workshop: (L) => `
    <rect x="${BX0 + 40}" y="${BY0 + 120}" width="380" height="250" fill="#3a3128"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${BX0 + 70 + (i % 7) * 50} ${BY0 + 150 + Math.floor(i / 7) * 110} v${60 + (i * 13) % 30}" stroke="${C.steelLt}" stroke-width="8" stroke-linecap="round"/>`).join("")}
    <rect x="${BX0 + 480}" y="${BY1 - 200}" width="300" height="60" fill="${C.steel}"/><rect x="${BX0 + 500}" y="${BY1 - 140}" width="40" height="140" fill="${C.steelDk}"/><rect x="${BX0 + 720}" y="${BY1 - 140}" width="40" height="140" fill="${C.steelDk}"/><rect x="${BX0 + 540}" y="${BY1 - 250}" width="120" height="50" fill="${C.steelDk}"/><rect x="${BX0 + 660}" y="${BY1 - 232}" width="110" height="14" fill="#9aa4ad"/>
    <text x="${BX0 + 630}" y="${BY1 - 160}" font-family="IBM Plex Mono,monospace" font-size="13" fill="#1a1a1a" text-anchor="middle">LATHE</text>
    <rect x="${BX0 + 40}" y="${BY0 - 20}" width="${BX1 - BX0 - 80}" height="14" fill="#2a2e31"/><rect x="${BX0 + 600}" y="${BY0 - 6}" width="60" height="30" fill="${C.amber}" opacity=".8"/><path d="M${BX0 + 630} ${BY0 + 24} v120" stroke="#1a1a1a" stroke-width="3"/><path d="M${BX0 + 615} ${BY0 + 144} h30 l-6 18 h-18z" fill="#4a5056"/>
    ${bench(BX0 + 820, 300, C.woodLt)}
    ${crate(BX1 - 140, BY1 + 170, 120, 90, "STORES")}${crate(BX1 - 10, BY1 + 170, 80, 64)}${crate(BX1 - 120, BY1 + 80, 90, 60)}`,
  training: () => `
    ${[0, 1, 2].map(i => `<rect x="${BX0 + 260 + i * 330}" y="${BY1 - 300}" width="10" height="300" fill="${C.wood}"/><circle cx="${BX0 + 265 + i * 330}" cy="${BY1 - 300}" r="60" fill="${C.paper}"/><circle cx="${BX0 + 265 + i * 330}" cy="${BY1 - 300}" r="38" fill="none" stroke="${C.ink}" stroke-width="5"/><circle cx="${BX0 + 265 + i * 330}" cy="${BY1 - 300}" r="12" fill="${C.red}"/>`).join("")}
    ${Array.from({ length: 10 }, (_, i) => `<ellipse cx="${BX0 + 60 + i * 120}" cy="${BY1 - 16}" rx="60" ry="22" fill="#8f805c"/>`).join("")}`,
  holding: (L) => `
    ${[0, 1, 2, 3].map(k => `<rect x="${BX0 + 40 + k * 290}" y="${BY0 + 140}" width="270" height="${BY1 - BY0 - 140}" fill="#20262b" stroke="${C.steelDk}" stroke-width="6"/>
      ${k < L.headcount ? figureSvg({ look: rollLook(`${L.id}-p${k}`), dress: "fatigues" }, BX0 + 175 + k * 290, BY1 - 10, 0.9) : `<rect x="${BX0 + 80 + k * 290}" y="${BY1 - 60}" width="140" height="22" fill="${C.wood}"/>`}
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${BX0 + 50 + k * 290 + i * 30}" y="${BY0 + 140}" width="8" height="${BY1 - BY0 - 140}" fill="${C.steel}"/>`).join("")}`).join("")}`,
  amnestics: () => `
    ${[0, 1, 2].map(r => `<rect x="${BX0 + 40}" y="${BY0 + 200 + r * 110}" width="520" height="12" fill="${C.wood}"/>${Array.from({ length: 13 }, (_, i) => `<rect x="${BX0 + 54 + i * 39}" y="${BY0 + 156 + r * 110}" width="20" height="44" rx="6" fill="${["#8fb4c9", "#b9d3a8", "#d8c37a", "#c99ab0"][(i + r) % 4]}" opacity=".85"/>`).join("")}`).join("")}
    <rect x="${BX0 + 700}" y="${BY1 - 360}" width="40" height="240" fill="${C.glass}" opacity=".4" stroke="#cfd8dc" stroke-width="3"/><path d="M${BX0 + 740} ${BY1 - 300} q120 -60 160 40" stroke="#cfd8dc" stroke-width="6" fill="none"/>${flask(BX0 + 900, BY1 - 120, "#b9d3a8", 1.6)}
    ${bench(BX0 + 620, 520)}`,
  quarters: (L, x) => `
    ${[0, 1, 2].map(i => bunk(BX0 + 40 + i * 300, BY1, "#4f5a3a") + `<rect x="${BX0 + 60 + i * 300}" y="${BY1 - 44}" width="120" height="44" fill="#4b5a46" stroke="#2c3528" stroke-width="3"/><rect x="${BX0 + 110 + i * 300}" y="${BY1 - 30}" width="20" height="8" fill="${C.steelLt}"/>`).join("")}
    <rect x="${BX0 + 120}" y="${BY0 + 150}" width="200" height="130" fill="#2a3a5a"/><rect x="${BX0 + 120}" y="${BY0 + 150}" width="200" height="12" fill="#c9a45c"/><text x="${BX0 + 220}" y="${BY0 + 230}" font-family="IBM Plex Mono,monospace" font-size="22" font-weight="700" fill="${C.paper}" text-anchor="middle">${esc(x.unit?.code ?? "E-11")}</text>
    <text x="${BX0 + 220}" y="${BY0 + 260}" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.paper}" text-anchor="middle">${esc((x.unit?.name ?? "Nine-Tailed Fox").toUpperCase().slice(0, 22))}</text>
    <rect x="${BX0 + 380}" y="${BY0 + 170}" width="110" height="120" fill="#5a4a32"/><rect x="${BX0 + 390}" y="${BY0 + 180}" width="90" height="100" fill="#d9ceb2"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${BX0 + 398} ${BY0 + 196 + i * 14}h${60 + (i * 13) % 17}" stroke="#6b604c" stroke-width="3"/>`).join("")}<rect x="${BX0 + 422}" y="${BY0 + 164}" width="26" height="12" fill="#8a8f94"/>`,
  armory: (_L, x) => {
    const stock = (x.racks?.length ? x.racks : ["m1_garand", "m2_carbine", "m1897", "bar", "m3", "m1903a4"]).slice(0, 8);
    return `<rect x="${BX0 + 40}" y="${BY0 + 110}" width="${BX1 - BX0 - 80}" height="330" fill="${C.wood}" stroke="#3f3222" stroke-width="8"/>
      ${stock.map((m, i) => `<g class="rackgun" data-rack="${m}" transform="translate(${BX0 + 110 + i * 140} ${BY0 + 420}) rotate(-90) scale(.3)">${weaponSide(m)}</g>`).join("")}
      <rect x="${BX0 + 40}" y="${BY0 + 420}" width="${BX1 - BX0 - 80}" height="20" fill="#3f3222"/>
      <rect x="${BX0 + 260}" y="${BY1 + 40}" width="${BX1 - BX0 - 520}" height="30" fill="${C.woodLt}"/><rect x="${BX0 + 280}" y="${BY1 + 70}" width="30" height="150" fill="${C.wood}"/><rect x="${BX1 - 310}" y="${BY1 + 70}" width="30" height="150" fill="${C.wood}"/>
      <text x="${W / 2}" y="${BY1 + 62}" font-family="IBM Plex Mono,monospace" font-size="15" fill="#2a241a" text-anchor="middle">ARMOURER'S BENCH</text>`;
  },
};
for (const k of ["cont_safe", "cont_euclid", "cont_keter"] as const) FURNISH[k] = (L) => chamber(L);

/** A containment wing: the observation window onto the cell (dressed for its occupant), the vault door, the grade. */
function chamber(L: RoomLayout) {
  const g = L.kind === "cont_keter" ? C.red : L.kind === "cont_euclid" ? C.amber : C.green, gradeName = L.kind === "cont_keter" ? "KETER" : L.kind === "cont_euclid" ? "EUCLID" : "SAFE";
  const occ = L.occupant, id = occ?.scpId ?? "";
  const wx = BX0 + 60, wy = BY0 + 150, ww = 720, wh = 380;
  const dress = (() => {
    switch (id) {
      case "173": return `<path d="M${wx + 120} ${wy + wh - 20} q30 -10 60 0 M${wx + 500} ${wy + wh - 16} q40 -12 80 4" stroke="#5a2a1a" stroke-width="10" opacity=".5"/><rect x="${wx + 600}" y="${wy + wh - 80}" width="60" height="70" fill="#4a5a6a"/><rect x="${wx + 612}" y="${wy + wh - 150}" width="8" height="80" fill="${C.wood}"/>`;
      case "049": return `<rect x="${wx + 80}" y="${wy + wh - 70}" width="200" height="30" fill="#6a5a48"/><rect x="${wx + 480}" y="${wy + wh - 120}" width="160" height="16" fill="${C.wood}"/><rect x="${wx + 520}" y="${wy + wh - 150}" width="60" height="30" fill="#4a3a2a"/>`;
      case "106": return `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#3a3e42"/>${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${wx + 80 + i * 110}" cy="${wy + wh - 14}" rx="40" ry="10" fill="#14100a" opacity=".8"/>`).join("")}<text x="${wx + ww / 2}" y="${wy + 40}" font-family="IBM Plex Mono,monospace" font-size="16" fill="${C.paper}" text-anchor="middle" opacity=".6">LEAD LINED · SUSPENDED</text>`;
      case "096": return `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#4a4f52"/>${Array.from({ length: 8 }, (_, i) => `<line x1="${wx + i * 90}" y1="${wy}" x2="${wx + i * 90}" y2="${wy + wh}" stroke="#3a3f42" stroke-width="4"/>`).join("")}`;
      case "012": return `<rect x="${wx + 280}" y="${wy + wh - 110}" width="180" height="16" fill="${C.wood}"/><rect x="${wx + 300}" y="${wy + wh - 94}" width="12" height="90" fill="${C.wood}"/><rect x="${wx + 430}" y="${wy + wh - 94}" width="12" height="90" fill="${C.wood}"/>`;
      case "939": return `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#0c1012" opacity=".75"/>`;
      case "682": return `<rect x="${wx + 40}" y="${wy + 120}" width="${ww - 80}" height="${wh - 120}" fill="#5a7a3a" opacity=".55"/><path d="M${wx + 40} ${wy + 120} h${ww - 80}" stroke="#9fd06a" stroke-width="4" opacity=".7"/><text x="${wx + ww / 2}" y="${wy + 100}" font-family="IBM Plex Mono,monospace" font-size="16" fill="${C.paper}" text-anchor="middle" opacity=".7">HYDROCHLORIC ACID · 25 m³</text>`;
      default: return "";
    }
  })();
  const figure = occ ? `<g clip-path="url(#sc-win)">${anomalyFigure(id, wx + ww / 2, wy + wh - 10, id === "682" ? 7 : 8)}</g>` : `<text x="${wx + ww / 2}" y="${wy + wh / 2}" font-family="IBM Plex Mono,monospace" font-size="22" fill="${C.paper}" text-anchor="middle" opacity=".5">CELL VACANT</text>`;
  const maint = occ ? occ.maintenance : 100;
  return `<clipPath id="sc-win"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}"/></clipPath>
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#20262a"/><g clip-path="url(#sc-win)">${dress}</g>${figure}
    ${maint < 60 ? `<g clip-path="url(#sc-win)">${Array.from({ length: Math.round((60 - maint) / 10) + 1 }, (_, i) => `<ellipse cx="${wx + 100 + i * 120}" cy="${wy + wh - 10}" rx="50" ry="12" fill="#2a1a10" opacity=".6"/>`).join("")}</g>` : ""}
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${C.glass}" opacity=".1"/><path d="M${wx + 30} ${wy + 30} l120 0 -150 150z" fill="#fff" opacity=".05"/>
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="none" stroke="${C.steel}" stroke-width="16"/>
    ${[0.33, 0.66].map(t => `<rect x="${wx + ww * t - 4}" y="${wy}" width="8" height="${wh}" fill="${C.steel}"/>`).join("")}
    <circle cx="${BX1 - 230}" cy="${BY1 - 220}" r="170" fill="${C.steelDk}" stroke="${C.steel}" stroke-width="14"/><circle cx="${BX1 - 230}" cy="${BY1 - 220}" r="110" fill="none" stroke="${C.steel}" stroke-width="8"/>
    ${[0, 60, 120, 180, 240, 300].map(a => `<rect x="${BX1 - 242}" y="${BY1 - 400}" width="24" height="44" fill="${C.steel}" transform="rotate(${a} ${BX1 - 230} ${BY1 - 220})"/>`).join("")}
    <path d="M${BX1 - 310} ${BY1 - 220}h160M${BX1 - 230} ${BY1 - 300}v160" stroke="#2a3138" stroke-width="16"/>
    <rect x="${BX1 - 420}" y="${BY0 + 100}" width="160" height="70" fill="${g}"/><text x="${BX1 - 340}" y="${BY0 + 148}" font-family="IBM Plex Mono,monospace" font-size="30" font-weight="700" fill="${C.ink}" text-anchor="middle">${gradeName}</text>
    ${occ ? `<text x="${BX1 - 340}" y="${BY0 + 200}" font-family="IBM Plex Mono,monospace" font-size="22" fill="${C.paper}" text-anchor="middle">SCP-${id}</text>` : ""}
    <rect x="${BX0}" y="${BY1 - 30}" width="${BX1 - BX0}" height="30" fill="url(#sc-hz)" opacity=".85"/>
    <circle cx="${BX1 - 90}" cy="${BY0 + 130}" r="16" fill="${L.alarm ? C.red : occ ? C.green : "#3a4651"}"/>`;
}

// ---------- people ----------
function people(L: RoomLayout, x: SceneExtras) {
  if (x.hero) {
    // the rest of the squad steps back into the room's shadow; the selected operative stands forward, full height
    const hx = x.hero.x ?? 560, back = (x.people ?? []).filter(p => p.key !== x.hero!.key).slice(0, 6);
    const behind = back.map((p, i) => figureSvg(p.spec, 260 + i * 190 + (i >= 2 ? 520 : 0), BY1 + 40, 0.6)).join("");
    return `<g opacity=".55">${behind}</g><rect width="${W}" height="${H}" fill="#05080b" opacity=".38" pointer-events="none"/>
      <ellipse cx="${hx}" cy="${H - 100}" rx="190" ry="26" fill="${C.lamp}" opacity=".1"/>
      <g class="hero" data-person="${esc(x.hero.key)}">${figureSvg(x.hero.spec, hx, H - 96, 1.62)}</g>`;
  }
  if (x.people?.length) {
    const n = x.people.length, slots = x.people.map((p, i) => {
      const [s0, s1] = x.span ?? [260, W - 260], t = n === 1 ? 0.5 : i / (n - 1), px = s0 + t * (s1 - s0), back = i % 2 === 1;
      const sel = x.focus === p.key;
      return `<g class="scene-person ${sel ? "sel" : ""}" data-person="${esc(p.key)}" tabindex="0" role="button" aria-label="${esc(p.label ?? p.key)}">${figureSvg(p.spec, px, back ? BY1 + 70 : BY1 + 150, back ? 0.78 : 0.9)}${p.label ? `<text x="${px}" y="${(back ? BY1 + 70 : BY1 + 150) + 32}" font-family="IBM Plex Mono,monospace" font-size="16" fill="${C.paper}" text-anchor="middle">${esc(p.label)}</text>` : ""}</g>`;
    });
    // the ones further back first, so the near row stands in front
    return slots.filter((_, i) => i % 2 === 1).join("") + slots.filter((_, i) => i % 2 === 0).join("");
  }
  const dress: Record<string, FigureSpec["dress"]> = { researcher: "labcoat", engineer: "coveralls", guard: "guard", patient: "fatigues" };
  const shown = L.staff.filter(s => s.role !== "patient").slice(0, STAFF_SHOWN);
  const out = shown.map((s, i) => {
    const px = staffSlot(i, shown.length).x;
    const spec: FigureSpec = { look: rollLook(s.id), dress: dress[s.role] ?? "fatigues", headgear: s.role === "engineer" ? "hardhat" : "", weapon: s.role === "guard" ? "m2_carbine" : undefined, pose: "work" };
    const sl = staffSlot(i, shown.length);
    return `<g class="scene-staff"><title>${esc(s.name)}</title>${figureSvg(spec, px, sl.y, sl.s)}</g>`;
  });
  // the D-Class block shows its people as a few figures in orange; Command its duty officers
  if (L.kind === "barracks") for (let i = 0; i < Math.min(5, Math.ceil(L.headcount / DCLASS_PER_FIGURE)); i++) out.push(figureSvg({ look: rollLook(`${L.id}-d${i}`), dress: "dclass", pose: "rest" }, BX0 + 180 + i * 260, BY1 + 60 + (i % 2) * 40, 0.72));
  if (L.kind === "command") out.push(figureSvg({ look: rollLook("duty-officer-1"), dress: "officer" }, BX0 + 300, BY1 + 90, 0.78), figureSvg({ look: rollLook("duty-officer-2", "f"), sex: "f", dress: "officer" }, BX0 + 960, BY1 + 70, 0.74));
  const more = L.staff.filter(s => s.role !== "patient").length - shown.length;
  if (more > 0) out.push(`<rect x="${BX1 - 250}" y="${BY1 + 200}" width="230" height="36" fill="#05080b" opacity=".7"/><text x="${BX1 - 135}" y="${BY1 + 224}" font-family="IBM Plex Mono,monospace" font-size="16" fill="${C.paper}" text-anchor="middle">+ ${more} more at work</text>`);
  return out.join("");
}

// ---------- P5: what a room is doing, drawn into it ----------
function activity(L: RoomLayout, x: SceneExtras) {
  const o: string[] = [];
  if (x.board && L.kind === "lab") {
    // the chalkboard, rewritten for the selected project
    const b = x.board;
    o.push(`<rect x="${BX0 + 66}" y="${BY0 + 136}" width="408" height="208" fill="#1f2a24"/>
      <text x="${BX0 + 84}" y="${BY0 + 176}" font-family="Special Elite,monospace" font-size="24" fill="#e8e6dc">${esc(b.title.slice(0, 28))}</text>
      ${b.lines.slice(0, 4).map((t, i) => `<text x="${BX0 + 84}" y="${BY0 + 212 + i * 28}" font-family="Special Elite,monospace" font-size="17" fill="#d8d8d0" opacity=".75">${esc(t.slice(0, 40))}</text>`).join("")}
      ${b.progress !== undefined ? `<rect x="${BX0 + 84}" y="${BY0 + 318}" width="300" height="10" fill="none" stroke="#d8d8d0" stroke-opacity=".6"/><rect x="${BX0 + 84}" y="${BY0 + 318}" width="${300 * Math.min(1, b.progress)}" height="10" fill="#d8d8d0" opacity=".7"/>` : ""}
      ${b.stamp ? `<g transform="rotate(-8 ${BX0 + 330} ${BY0 + 250})"><rect x="${BX0 + 220}" y="${BY0 + 222}" width="230" height="56" fill="none" stroke="${C.red}" stroke-width="6"/><text x="${BX0 + 335}" y="${BY0 + 262}" font-family="IBM Plex Mono,monospace" font-size="28" font-weight="700" fill="${C.red}" text-anchor="middle">${esc(b.stamp)}</text></g>` : ""}`);
  }
  if (x.test && L.kind.startsWith("cont_")) {
    // inside the cell: the D-Class at their marks; at the window, the researcher with a clipboard
    const wx = BX0 + 60, wy = BY0 + 150, ww = 720, wh = 380;
    for (let i = 0; i < x.test.dclass; i++) o.push(`<g clip-path="url(#sc-win)">${figureSvg({ look: rollLook(`${L.id}-test${i}`), dress: "dclass" }, wx + 140 + i * 420, wy + wh - 8, 0.75)}</g>`);
    if (x.test.researcher) o.push(figureSvg({ look: rollLook(`${L.id}-tester`), dress: "labcoat", pose: "work" }, BX0 + 860, BY1 + 120, 0.8));
    o.push(`<rect x="${wx + 8}" y="${wy + 8}" width="${ww - 16}" height="40" fill="${C.amber}"/><text x="${wx + ww / 2}" y="${wy + 36}" font-family="IBM Plex Mono,monospace" font-size="20" font-weight="700" fill="${C.ink}" text-anchor="middle">TEST IN PROGRESS · ${esc(x.test.name.toUpperCase().slice(0, 34))}</text>`);
  }
  if (x.making && L.kind === "workshop") {
    // on the bench: what's being made, half-built
    const m = x.making, bx = BX0 + 830, by = BY1 - 150;
    if (m.kind === "attachment") o.push(`<g transform="translate(${bx} ${by - 30}) scale(.3)">${weaponSide("m1_garand", undefined, { ghost: m.id as AttachmentId })}</g>`);
    else if (m.kind === "ammo") o.push([0, 1, 2].map(i => `<rect x="${bx + 30 + i * 70}" y="${by - 50}" width="56" height="44" fill="#4a5038" stroke="#2c3020" stroke-width="3"/><text x="${bx + 58 + i * 70}" y="${by - 22}" font-family="IBM Plex Mono,monospace" font-size="11" fill="#e2d4b1" text-anchor="middle">.30</text>`).join(""));
    else o.push(crate(bx + 60, by, 150, 70, m.kind === "refit" ? "REFIT" : "ITEM"));
    o.push(`<rect x="${bx}" y="${by + 6}" width="280" height="10" fill="#1a1a1a"/><rect x="${bx}" y="${by + 6}" width="${280 * Math.min(1, m.progress)}" height="10" fill="${C.amber}"/>
      <text x="${bx + 140}" y="${by + 40}" font-family="IBM Plex Mono,monospace" font-size="16" fill="${C.paper}" text-anchor="middle">${esc(m.label.slice(0, 26))}</text>`);
  }
  if (x.ops && L.kind === "command") {
    // the operations map's pins are the real incidents; the alarm board lights one lamp per critical item
    const mx = BX0 + 60, my = BY0 + 150, mw = 560, mh = 270;
    for (const p of x.ops.pins) o.push(`<circle cx="${mx + p.x * mw}" cy="${my + p.y * mh}" r="${p.urgent ? 11 : 8}" fill="${p.urgent ? C.red : C.amber}" stroke="#14181c" stroke-width="3"${p.urgent ? ` class="blinkdot"` : ""}/>`);
    o.push(Array.from({ length: 12 }, (_, i) => `<rect x="${BX0 + 700 + (i % 6) * 66}" y="${BY1 - 170 + Math.floor(i / 6) * 50}" width="40" height="22" fill="${i < x.ops!.alarms ? C.red : C.green}" opacity=".85"/>`).join(""));
    o.push(`<rect x="${BX0 + 680}" y="${BY1 - 260}" width="420" height="50" fill="#e9e4d4"/><text x="${BX0 + 692}" y="${BY1 - 228}" font-family="IBM Plex Mono,monospace" font-size="15" fill="#2a241a">${esc(x.ops.teletype.slice(0, 46))}</text>
      <text x="${BX0 + 945}" y="${BY0 + 310}" font-family="IBM Plex Mono,monospace" font-size="18" fill="${C.paper}" text-anchor="middle">${esc(x.ops.clock)}</text>`);
  }
  return o.join("");
}

// ---------- environment-first: the objects each room is worked through ----------
/** Fixtures that exist to be used: the lab's records cabinet, Command's recruitment desk, the D-Class orders board,
 *  a wing's test console, the door from the quarters to the armory. Each is a target (src/scene/targets.ts). */
function fixtures(L: RoomLayout) {
  const o: string[] = [];
  if (L.kind === "lab") o.push(`${cabinet(BX0 + 780, 240)}<rect x="${BX0 + 788}" y="${BY1 - 232}" width="64" height="20" fill="${C.paper}"/><text x="${BX0 + 820}" y="${BY1 - 217}" font-family="IBM Plex Mono,monospace" font-size="12" font-weight="700" fill="#2a241a" text-anchor="middle">RECORDS</text>`);
  if (L.kind === "command") o.push(`<path d="M${BX0 + 1000} ${BY1 + 70} h200 l20 100 h-240z" fill="#4a3c2a"/><rect x="${BX0 + 1040}" y="${BY1 + 40}" width="110" height="34" rx="4" fill="#2a2e31"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${BX0 + 1058 + i * 19}" cy="${BY1 + 58}" r="5" fill="#9aa4ad"/>`).join("")}<rect x="${BX0 + 1060}" y="${BY1 + 20}" width="70" height="20" fill="${C.paper}"/>
    <text x="${BX0 + 1100}" y="${BY1 + 150}" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.paper}" text-anchor="middle">RECRUITMENT</text>`);
  if (L.kind === "barracks") o.push(`<rect x="${BX0 + 40}" y="${BY0 + 170}" width="260" height="150" fill="#8a6a42" stroke="#4a3a22" stroke-width="8"/>${[0, 1, 2, 3].map(i => `<rect x="${BX0 + 58 + (i % 2) * 120}" y="${BY0 + 184 + Math.floor(i / 2) * 64}" width="100" height="52" fill="${C.paper}" transform="rotate(${(i % 3) - 1} ${BX0 + 108 + (i % 2) * 120} ${BY0 + 210 + Math.floor(i / 2) * 64})"/>`).join("")}
    <text x="${BX0 + 170}" y="${BY0 + 164}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.paper}" text-anchor="middle">ORDERS</text>`);
  if (L.kind.startsWith("cont_") && L.occupant) o.push(`<path d="M${BX0 + 80} ${BY1 + 80} h300 l20 90 h-340z" fill="#3a4148"/><rect x="${BX0 + 110}" y="${BY1 + 46}" width="240" height="40" fill="#2a3036"/>${[0, 1, 2, 3].map(i => `<circle cx="${BX0 + 140 + i * 60}" cy="${BY1 + 66}" r="13" fill="#14181c" stroke="${C.paper}" stroke-width="2"/><line x1="${BX0 + 140 + i * 60}" y1="${BY1 + 66}" x2="${BX0 + 146 + i * 60}" y2="${BY1 + 57}" stroke="${C.amber}" stroke-width="2"/>`).join("")}
    <text x="${BX0 + 230}" y="${BY1 + 150}" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.paper}" text-anchor="middle">TEST CONSOLE</text>`);
  if (L.kind === "quarters") o.push(`<rect x="${BX0 + 990}" y="${BY0 + 200}" width="110" height="320" fill="#4a3c2a" stroke="#2a2018" stroke-width="8"/><rect x="${BX0 + 1006}" y="${BY0 + 220}" width="78" height="120" fill="#5a4a34"/><circle cx="${BX0 + 1080}" cy="${BY0 + 380}" r="6" fill="#c9a45c"/>
    <rect x="${BX0 + 985}" y="${BY0 + 172}" width="120" height="24" fill="#1f2326"/><text x="${BX0 + 1045}" y="${BY0 + 190}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.paper}" text-anchor="middle">ARMORY →</text>`);
  return o.join("");
}

/** The lab's bench: the apparatus for the project on it, by the kind of project, so a project is a thing on the
 *  bench and not only a line on the board. */
function apparatus(kind: string) {
  const x = BX0 + 640, y = BY1 - 120;   // centre of the bench top
  switch (kind) {
    case "gear": return `${[0, 1, 2].map(i => `<rect x="${x - 110 + i * 80}" y="${y - 60}" width="60" height="60" rx="6" fill="${["#4a5038", "#5a5d55", "#3e464d"][i]}" stroke="#2a2e31" stroke-width="3"/>`).join("")}<ellipse cx="${x - 40}" cy="${y - 80}" rx="18" ry="22" fill="#4a5038"/><rect x="${x - 46}" y="${y - 110}" width="12" height="14" fill="${C.steelDk}"/><path d="M${x + 60} ${y - 100} v40" stroke="${C.steel}" stroke-width="10"/><circle cx="${x + 60}" cy="${y - 108}" r="12" fill="#2f5a70"/>`;
    case "armor": case "arms": return kind === "armor"
      ? `<rect x="${x - 6}" y="${y - 170}" width="12" height="150" fill="${C.steelDk}"/><path d="M${x - 70} ${y - 160} h140 l-8 120 h-124z" fill="#565c5f"/>${[0, 1, 2].map(i => `<path d="M${x - 62} ${y - 130 + i * 30} h124" stroke="#3a4046" stroke-width="4"/>`).join("")}<circle cx="${x + 30}" cy="${y - 100}" r="9" fill="#2a2e31"/><path d="M${x + 24} ${y - 106} l12 12" stroke="${C.red}" stroke-width="3"/><rect x="${x - 100}" y="${y - 22}" width="200" height="22" fill="#3a4148"/>`
      : `<g transform="translate(${x - 150} ${y - 70}) scale(.3)">${weaponSide("m1_garand")}</g><rect x="${x - 40}" y="${y - 50}" width="30" height="50" fill="${C.steelDk}"/><rect x="${x - 60}" y="${y - 58}" width="70" height="14" fill="${C.steel}"/>`;
    case "site": return `<rect x="${x - 110}" y="${y - 120}" width="220" height="110" fill="#2e4a6a"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${x - 100} ${y - 104 + i * 20} h${120 + (i * 37) % 80}" stroke="#d9e2ea" stroke-opacity=".6" stroke-width="2"/>`).join("")}<rect x="${x + 40}" y="${y - 80}" width="50" height="50" fill="none" stroke="#d9e2ea" stroke-opacity=".7" stroke-width="2"/><circle cx="${x + 65}" cy="${y - 55}" r="14" fill="none" stroke="#d9e2ea" stroke-opacity=".7" stroke-width="2"/>`;
    case "personnel": return `<rect x="${x - 90}" y="${y - 110}" width="180" height="100" fill="#2a3036"/><rect x="${x - 80}" y="${y - 100}" width="160" height="60" fill="#e9e4d4"/><path d="M${x - 76} ${y - 70} l20 -14 l14 24 l18 -30 l16 22 l22 -10 l20 8 l14 -6" stroke="#2a241a" stroke-width="2" fill="none"/>${[0, 1, 2].map(i => `<circle cx="${x - 50 + i * 50}" cy="${y - 24}" r="8" fill="#14181c" stroke="${C.amber}" stroke-width="2"/>`).join("")}`;
    case "insurgency": return `<path d="M${x - 100} ${y - 14} l30 -60 h150 l-30 60z" fill="${C.paper}"/><path d="M${x - 60} ${y - 54} h90 M${x - 70} ${y - 40} h100 M${x - 80} ${y - 26} h70" stroke="#2a241a" stroke-width="2"/><rect x="${x - 10}" y="${y - 70}" width="60" height="16" fill="${C.red}" opacity=".8"/><circle cx="${x + 60}" cy="${y - 40}" r="18" fill="#8a2a22"/>`;
    default: return `<rect x="${x - 50}" y="${y - 190}" width="100" height="180" rx="40" fill="${C.glass}" opacity=".25" stroke="#cfd8dc" stroke-width="3"/><rect x="${x - 60}" y="${y - 20}" width="120" height="20" fill="${C.steelDk}"/><rect x="${x - 56}" y="${y - 200}" width="112" height="16" fill="${C.steelDk}"/>
      <path d="M${x - 20} ${y - 40} q20 -60 0 -110 q20 30 30 0 q-5 60 -10 110z" fill="#7a8a6a" opacity=".7"/>`;   // a specimen in its jar
  }
}

/** The interactive objects: a marker on each, a ring and a label on hover, focus or selection. Mouse and keyboard. */
function targetLayer(ts: Target[], selected?: string) {
  return `<g class="targets">${ts.filter(t => t.rect[2] > 0).map(t => {
    const [x, y, w, h] = t.rect, sel = selected === t.id, cx = x + Math.min(w - 14, 18), cy = Math.max(14, y + 14);
    const label = t.label.length > 30 ? t.label.slice(0, 29) + "…" : t.label, lw = label.length * 9.4 + 22;
    const lx = Math.min(W - lw - 6, Math.max(6, x)), ly = Math.max(6, y - 34);
    return `<g class="itarget k-${t.kind} ${sel ? "sel" : ""}" data-target="${esc(t.id)}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(t.label)}: ${esc(t.hint)}">
      <rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>
      <rect class="ring" x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="10" fill="none"/>
      <g class="pip"><circle cx="${cx}" cy="${cy}" r="11"/><circle cx="${cx}" cy="${cy}" r="4"/></g>
      <g class="chip"><rect x="${lx}" y="${ly}" width="${lw}" height="28" rx="4"/><text x="${lx + 11}" y="${ly + 19}">${esc(label)}</text></g></g>`;
  }).join("")}</g>`;
}

// ---------- the armory's bench ----------
/** Where each mount's label sits from its marker, so neighbouring labels never collide. */
const LABEL_AT: Record<MountId, [number, number]> = { optic: [-70, -42], rearsight: [80, -38], muzzle: [0, -44], lug: [0, 56], magazine: [0, 62], butt: [0, 56], trigger: [0, 60] };
/** The weapon on the bench, large, with its mounts as markers the player can select. At zoom above 1 the view closes
 *  in on the selected mount. The drawing is the same one the figures carry, at bench scale. */
function benchScene(b: NonNullable<SceneExtras["bench"]>) {
  const f = FRAMES[b.model] ?? FRAMES.m1_garand;
  const span = b.narrow ? 880 : 1180, base = span / f.length, s = base * b.zoom;
  // the point to keep in view: the selected mount when zoomed, else the weapon's middle
  const [fx, fy] = b.zoom > 1 && b.highlight ? mountAt(b.model, b.highlight as MountId) : [f.length / 2, 0];
  const cx = b.narrow ? 590 : W / 2, cy = 560;
  const tx = cx - fx * s, ty = cy + fy * s;
  const marks = b.mounts.map(m => {
    const [mx, my] = mountAt(b.model, m as MountId), on = b.highlight === m;
    const px = tx + mx * s, py = ty - my * s;
    return `<g class="mount ${on ? "on" : ""}" data-mount="${m}" tabindex="0" role="button" aria-label="${MOUNT_NAMES[m as MountId]}">
      <circle cx="${px}" cy="${py}" r="${on ? 30 : 22}" fill="${on ? "rgba(110,169,200,.25)" : "rgba(5,8,11,.55)"}" stroke="#6ea9c8" stroke-width="${on ? 4 : 2.5}"/>
      <circle cx="${px}" cy="${py}" r="6" fill="#6ea9c8"/>
      <text x="${px + LABEL_AT[m as MountId][0]}" y="${py + LABEL_AT[m as MountId][1]}" font-family="IBM Plex Mono,monospace" font-size="17" fill="#d8d3c6" text-anchor="middle" paint-order="stroke" stroke="#05080b" stroke-width="5">${MOUNT_NAMES[m as MountId]}</text></g>`;
  }).join("");
  // UI/UX overhaul, visual pass: an armourer's bench under a task lamp. Oak top in perspective with its planks and
  // a lit front edge, a canvas gun mat, the cleaning kit at the side, and the weapon's own shadow on the mat.
  const top = H - 250, mat = { x: cx - 620, y: cy - 135, w: 1240, h: 270 };
  return `<defs><linearGradient id="bn-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3a26"/><stop offset="1" stop-color="#6b5233"/></linearGradient>
      <linearGradient id="bn-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a42"/><stop offset="1" stop-color="#3a2c1c"/></linearGradient>
      <radialGradient id="bn-lamp" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#f6dca0" stop-opacity=".32"/><stop offset="1" stop-color="#f6dca0" stop-opacity="0"/></radialGradient>
      <linearGradient id="bn-mat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4a37"/><stop offset="1" stop-color="#2c3829"/></linearGradient>
      <filter id="bn-blur"><feGaussianBlur stdDeviation="10"/></filter></defs>
    <rect width="${W}" height="${H}" fill="#05080b" opacity=".55" pointer-events="none"/>
    <path d="M90 ${top} H${W - 90} L${W + 40} ${H - 40} H-40Z" fill="url(#bn-top)"/>
    ${Array.from({ length: 7 }, (_, i) => { const t = (i + 1) / 8, y = top + (H - 40 - top) * t, xl = 90 - 130 * t, xr = W - 90 + 130 * t; return `<path d="M${xl.toFixed(0)} ${y.toFixed(0)} H${xr.toFixed(0)}" stroke="#2c2116" stroke-width="2" opacity=".55"/>`; }).join("")}
    <path d="M-40 ${H - 40} H${W + 40} V${H} H-40Z" fill="url(#bn-edge)"/>
    <path d="M${mat.x} ${mat.y} h${mat.w} l40 ${mat.h} h-${mat.w + 80}z" fill="url(#bn-mat)"/>
    <path d="M${mat.x} ${mat.y} h${mat.w} l40 ${mat.h} h-${mat.w + 80}z" fill="none" stroke="#c9b98a" stroke-opacity=".25" stroke-width="3" stroke-dasharray="14 10"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${mat.x + 60 + i * 110}" y1="${mat.y + 10}" x2="${mat.x + 50 + i * 114}" y2="${mat.y + mat.h - 10}" stroke="#d8d3c6" stroke-opacity=".05"/>`).join("")}
    <ellipse cx="${cx - 40}" cy="${cy + 10}" rx="660" ry="150" fill="url(#bn-lamp)"/>
    <g opacity=".9"><rect x="${W - 250}" y="${top + 40}" width="46" height="70" rx="6" fill="#5c6a52"/><rect x="${W - 238}" y="${top + 22}" width="22" height="20" fill="#3a4538"/><path d="M${W - 227} ${top + 22} l40 -30" stroke="#8a9198" stroke-width="5"/>
      <path d="M${W - 190} ${top + 120} q60 -20 110 10 q-30 30 -110 20z" fill="#b9ab8a"/><rect x="${W - 320}" y="${top + 128}" width="110" height="10" rx="5" fill="#6b5233"/><rect x="${W - 214}" y="${top + 124}" width="26" height="18" rx="3" fill="#2a2a2a"/></g>
    <g transform="translate(${tx + 12} ${ty + 26}) scale(${s})" opacity=".55" filter="url(#bn-blur)"><g fill="#000">${weaponSide(b.model, b.attachment).replace(/fill="[^"]*"/g, 'fill="#000"').replace(/stroke="[^"]*"/g, 'stroke="#000"')}</g></g>
    <g class="benchgun" transform="translate(${tx} ${ty}) scale(${s})">${weaponSide(b.model, b.attachment, { ghost: b.ghost as AttachmentId | undefined, highlight: b.highlight as MountId | undefined })}</g>
    ${marks}`;
}

// ---------- state over the top ----------
function overlay(L: RoomLayout, dark: boolean) {
  const o: string[] = [];
  const scaffold = () => `<g>${[BX0 + 80, BX0 + 420, BX0 + 760, BX0 + 1100].map(x => `<rect x="${x}" y="${BY0 + 20}" width="14" height="${BY1 - BY0 + 60}" fill="#8a6a3a"/>`).join("")}${[BY0 + 160, BY0 + 360].map(y => `<rect x="${BX0 + 60}" y="${y}" width="${BX1 - BX0 - 120}" height="14" fill="#8a6a3a"/>`).join("")}
    ${[BX0 + 94, BX0 + 434, BX0 + 774].map(x => `<path d="M${x} ${BY0 + 160} L${x + 326} ${BY0 + 360}" stroke="#8a6a3a" stroke-width="8"/>`).join("")}</g>`;
  if (L.state === "building") o.push(`<rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="#6a665c" opacity=".6"/>${scaffold()}${crate(BX0 + 900, BY1 + 80, 140, 90, "MATERIEL")}<rect x="${BX0}" y="${BY1 - 30}" width="${BX1 - BX0}" height="30" fill="url(#sc-hz)"/>
    <text x="${W / 2}" y="${BY0 + 80}" font-family="IBM Plex Mono,monospace" font-size="26" letter-spacing="4" fill="#1a1a1a" text-anchor="middle">UNDER CONSTRUCTION</text>`);
  if (L.state === "upgrading") o.push(`${crate(BX0 + 40, BY1 + 120, 130, 90, "REFIT")}${crate(BX0 + 190, BY1 + 120, 90, 60)}`);
  if (L.state === "damaged" || L.state === "wrecked" || L.state === "repairing") {
    const heavy = L.state === "wrecked";
    o.push(`${Array.from({ length: heavy ? 7 : 4 }, (_, i) => { const x = BX0 + 120 + i * 170; return `<path d="M${x} ${BY0} l${(i % 2 ? 1 : -1) * 30} 90 l${(i % 2 ? -1 : 1) * 20} 80 l${(i % 2 ? 1 : -1) * 26} 110" stroke="#0a0c0e" stroke-width="7" fill="none"/>`; }).join("")}
      ${Array.from({ length: heavy ? 12 : 6 }, (_, i) => `<rect x="${BX0 + 60 + i * 100}" y="${BY1 + 30 + (i % 3) * 40}" width="${50 + (i % 4) * 20}" height="${24 + (i % 3) * 12}" fill="#4a4e50" transform="rotate(${(i % 5) * 9 - 18} ${BX0 + 80 + i * 100} ${BY1 + 40})"/>`).join("")}
      ${heavy ? `<path d="M${BX0 + 300} ${BY0} L${BX0 + 520} ${BY0 + 180} L${BX0 + 700} ${BY0} Z" fill="#14181c"/><path d="M${BX0 + 380} ${BY1 + 140} l200 -260 l60 30 l-180 250z" fill="#55595c"/>` : ""}
      <g class="smoke">${[300, 760, 1150].map((x, i) => `<circle cx="${x}" cy="${BY0 + 100 - i * 10}" r="${110 + i * 30}" fill="#6b6f73" opacity=".2"/>`).join("")}</g>
      <g class="spark">${[0, 1, 2, 3].map(i => `<line x1="${BX0 + 820}" y1="${BY0 + 40}" x2="${BX0 + 820 + (i - 1.5) * 30}" y2="${BY0 + 110 + i * 10}" stroke="${C.amber}" stroke-width="3"/>`).join("")}</g>`);
    if (L.state === "repairing") o.push(scaffold());
  }
  if (L.state === "demolishing") o.push(`<rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="#4a4740" opacity=".7"/>${crate(BX0 + 400, BY1 + 100, 160, 100, "SALVAGE")}`);
  if (dark) o.push(`<rect width="${W}" height="${H}" fill="#03060a" opacity=".5"/>${[BX0 + 100, BX1 - 100].map(x => `<circle cx="${x}" cy="${BY0 + 40}" r="10" fill="${C.red}"/><circle cx="${x}" cy="${BY0 + 40}" r="120" fill="url(#sc-red)" opacity=".7"/>`).join("")}`);
  if (L.alarm) o.push(`<g class="alarmglow"><rect width="${W}" height="${H}" fill="${C.red}" opacity=".18"/></g>${[BX0 + 40, BX1 - 40].map(x => `<circle cx="${x}" cy="${BY0 + 60}" r="22" fill="${C.red}" class="blinkdot"/>`).join("")}`);
  o.push(`<rect width="${W}" height="${H}" fill="url(#sc-haze)"/><rect width="${W}" height="${H}" fill="url(#sc-vig)"/>`);
  return `<g pointer-events="none">${o.join("")}</g>`;   // state and light never take a click meant for a person
}
