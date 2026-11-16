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

export const W = 1600, H = 900;
/** The back wall's rectangle, and the floor line people stand on at the back. */
const BX0 = 200, BX1 = 1400, BY0 = 120, BY1 = 640;
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
  /** One person brought forward, large, with the room still behind them (the quarters' selected operative). */
  hero?: { spec: FigureSpec; key: string; x?: number };
  /** The stretch of the scene, in scene units, people stand across (clear of a side panel). */
  span?: [number, number];
}

export function interiorSvg(L: RoomLayout, x: SceneExtras = {}) {
  const parts: string[] = [];
  const dark = !L.powered, built = L.state !== "building";
  parts.push(defs());
  parts.push(shell(L));
  parts.push(door(L.doors.left, -1, L), door(L.doors.right, 1, L));
  if (built || L.state === "repairing") parts.push(pipes(L), signage(L));
  parts.push(lights(L, dark));
  if (built) parts.push(FURNISH[L.kind]?.(L, x) ?? "");
  parts.push(x.bench ? benchScene(x.bench) : people(L, x));
  parts.push(overlay(L, dark));
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
    <radialGradient id="sc-vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
    <radialGradient id="sc-red" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.red}" stop-opacity=".55"/><stop offset="1" stop-color="${C.red}" stop-opacity="0"/></radialGradient>
    <pattern id="sc-hz" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="28" height="28" fill="#1a1a1a"/><rect width="14" height="28" fill="${C.hz}"/></pattern>
    <pattern id="sc-tile" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/></pattern>
    <pattern id="sc-conc" width="160" height="80" patternUnits="userSpaceOnUse"><rect width="160" height="80" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/><circle cx="40" cy="30" r="2" fill="#000" opacity=".1"/><circle cx="120" cy="60" r="1.5" fill="#000" opacity=".1"/></pattern>
  </defs>`;
}

/** The box: ceiling, back wall with the dado line, floor in perspective, the two side walls. */
function shell(L: RoomLayout) {
  const surface = L.kind === "quarters" || L.kind === "armory";
  const dadoY = 470, lower = L.kind.startsWith("cont_") ? "#3a4247" : surface ? "#4b4a3c" : C.dado;
  const floorTone = L.features.floor === 0 ? "url(#sc-floor)" : L.features.floor === 1 ? "#2f3437" : L.features.floor === 2 ? "#363229" : "#2c3134";
  return `<rect width="${W}" height="${H}" fill="${C.ceil}"/>
    <path d="M0 0 H${W} L${BX1} ${BY0} H${BX0}Z" fill="#171b1e"/>
    <rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="url(#sc-wall)"/>
    <rect x="${BX0}" y="${dadoY}" width="${BX1 - BX0}" height="${BY1 - dadoY}" fill="${lower}"/>
    <rect x="${BX0}" y="${dadoY - 6}" width="${BX1 - BX0}" height="6" fill="${C.dadoDk}"/>
    <rect x="${BX0}" y="${BY0}" width="${BX1 - BX0}" height="${BY1 - BY0}" fill="url(#sc-conc)"/>
    <path d="M${BX0} ${BY1} H${BX1} L${W} ${H} H0Z" fill="${floorTone}"/>
    <path d="M${BX0} ${BY1} H${BX1} L${W} ${H} H0Z" fill="url(#sc-tile)" opacity=".7"/>
    ${[0.2, 0.4, 0.6, 0.8].map(t => `<line x1="${BX0 + (BX1 - BX0) * t}" y1="${BY1}" x2="${W * t}" y2="${H}" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`).join("")}
    <path d="M0 0 L${BX0} ${BY0} V${BY1} L0 ${H}Z" fill="url(#sc-side)"/>
    <path d="M${W} 0 L${BX1} ${BY0} V${BY1} L${W} ${H}Z" fill="url(#sc-sideR)"/>
    <path d="M0 ${H * 0.72} L${BX0} ${dadoY + 30}" stroke="#000" stroke-opacity=".25" stroke-width="3"/><path d="M${W} ${H * 0.72} L${BX1} ${dadoY + 30}" stroke="#000" stroke-opacity=".25" stroke-width="3"/>
    <rect x="${BX0}" y="${BY1 - 8}" width="${BX1 - BX0}" height="8" fill="#000" opacity=".25"/>`;
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
  const label = `${L.level < 0 ? `B${L.slot}` : L.designation} · ${L.name.toUpperCase()}`, w = Math.round(label.length * 12.4 + 34), x = L.features.signage % 2 ? BX0 + 40 : BX1 - 40 - w;
  return `<rect x="${x}" y="${BY0 + 90}" width="${w}" height="44" fill="#1f2326" opacity=".85"/><text x="${x + 16}" y="${BY0 + 120}" font-family="IBM Plex Mono,monospace" font-size="20" font-weight="600" letter-spacing="1" fill="${C.paper}">${esc(label)}</text>
    ${L.features.signage >= 2 ? `<text x="${BX0 + (BX1 - BX0) / 2}" y="${BY0 + 80}" font-family="IBM Plex Mono,monospace" font-size="15" letter-spacing="3" fill="#2a2a24" opacity=".6" text-anchor="middle">SECURE · CONTAIN · PROTECT</text>` : ""}`;
}
function lights(L: RoomLayout, dark: boolean) {
  const n = 2 + (L.features.lights % 3), out: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = BX0 + (BX1 - BX0) * (i + 0.5) / n;
    out.push(`<line x1="${x}" y1="${BY0 - 60}" x2="${x}" y2="${BY0 + 6}" stroke="#111" stroke-width="3"/><path d="M${x - 30} ${BY0 + 6} h60 l-12 18 h-36z" fill="#2c3237"/>`);
    if (!dark) out.push(`<path d="M${x - 18} ${BY0 + 24} L${x - 260} ${BY1 + 200} H${x + 260} L${x + 18} ${BY0 + 24}Z" fill="url(#sc-cone)"/><ellipse cx="${x}" cy="${BY0 + 24}" rx="16" ry="5" fill="${C.lamp}" opacity=".9"/>`);
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
    ${[[230, 250], [460, 220], [330, 360], [520, 300], [390, 250]].map(([px, py]) => `<circle cx="${BX0 + px}" cy="${BY0 + py}" r="7" fill="${C.red}"/>`).join("")}
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
  lab: (L) => `
    <rect x="${BX0 + 60}" y="${BY0 + 130}" width="420" height="220" fill="#1f2a24" stroke="${C.wood}" stroke-width="10"/>
    <text x="${BX0 + 80}" y="${BY0 + 175}" font-family="Special Elite,monospace" font-size="22" fill="#d8d8d0" opacity=".8">${esc((L.activity[0] ?? "no project").replace(/_/g, " ").slice(0, 26))}</text>
    ${[0, 1, 2, 3].map(i => `<path d="M${BX0 + 80} ${BY0 + 210 + i * 30}h${120 + (i * 70) % 220}" stroke="#d8d8d0" stroke-opacity=".5" stroke-width="3"/>`).join("")}
    ${bench(BX0 + 20, BX1 - BX0 - 40)}
    ${[[BX0 + 120, C.green], [BX0 + 220, C.glass], [BX0 + 360, C.amber], [BX0 + 860, "#b36b8a"], [BX0 + 1000, C.green]].map(([fx, col]) => flask(fx as number, BY1 - 120, col as string)).join("")}
    <rect x="${BX0 + 560}" y="${BY1 - 260}" width="70" height="140" fill="#2a3138"/><circle cx="${BX0 + 595}" cy="${BY1 - 250}" r="22" fill="#14181c" stroke="${C.steelLt}" stroke-width="4"/><rect x="${BX0 + 588}" y="${BY1 - 300}" width="14" height="50" fill="#2a3138"/>
    <rect x="${BX1 - 330}" y="${BY0 + 120}" width="260" height="${BY1 - BY0 - 240}" fill="#2f363c" stroke="${C.steel}" stroke-width="6"/><rect x="${BX1 - 310}" y="${BY0 + 140}" width="220" height="200" fill="${C.glass}" opacity=".2"/><text x="${BX1 - 200}" y="${BY0 + 370}" font-family="IBM Plex Mono,monospace" font-size="14" fill="${C.paper}" text-anchor="middle">FUME HOOD</text>`,
  workshop: (L) => `
    <rect x="${BX0 + 40}" y="${BY0 + 120}" width="380" height="250" fill="#3a3128"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${BX0 + 70 + (i % 7) * 50} ${BY0 + 150 + Math.floor(i / 7) * 110} v${60 + (i * 13) % 30}" stroke="${C.steelLt}" stroke-width="8" stroke-linecap="round"/>`).join("")}
    <rect x="${BX0 + 480}" y="${BY1 - 200}" width="300" height="60" fill="${C.steel}"/><rect x="${BX0 + 500}" y="${BY1 - 140}" width="40" height="140" fill="${C.steelDk}"/><rect x="${BX0 + 720}" y="${BY1 - 140}" width="40" height="140" fill="${C.steelDk}"/><rect x="${BX0 + 540}" y="${BY1 - 250}" width="120" height="50" fill="${C.steelDk}"/><rect x="${BX0 + 660}" y="${BY1 - 232}" width="110" height="14" fill="#9aa4ad"/>
    <text x="${BX0 + 630}" y="${BY1 - 160}" font-family="IBM Plex Mono,monospace" font-size="13" fill="#1a1a1a" text-anchor="middle">LATHE</text>
    <rect x="${BX1 - 330}" y="${BY1 - 380}" width="40" height="380" fill="${C.steelDk}"/><rect x="${BX1 - 380}" y="${BY1 - 380}" width="140" height="60" fill="${C.steel}"/><rect x="${BX1 - 350}" y="${BY1 - 320}" width="16" height="70" fill="#9aa4ad"/>
    ${bench(BX0 + 820, 300, C.woodLt)}${L.activity.length ? `<text x="${BX0 + 970}" y="${BY1 - 140}" font-family="IBM Plex Mono,monospace" font-size="15" fill="${C.paper}" text-anchor="middle">${esc(L.activity[0].replace("Workshop: ", "").slice(0, 24))}</text><rect x="${BX0 + 880}" y="${BY1 - 132}" width="180" height="10" fill="${C.amber}" opacity=".8"/>` : ""}
    ${crate(BX1 - 220, BY1, 110, 80, "STORES")}${crate(BX1 - 200, BY1 - 80, 80, 60)}`,
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
    ${[0, 1, 2, 3].map(i => bunk(BX0 + 40 + i * 300, BY1, "#4f5a3a") + `<rect x="${BX0 + 60 + i * 300}" y="${BY1 - 44}" width="120" height="44" fill="#4b5a46" stroke="#2c3528" stroke-width="3"/><rect x="${BX0 + 110 + i * 300}" y="${BY1 - 30}" width="20" height="8" fill="${C.steelLt}"/>`).join("")}
    <rect x="${BX0 + 120}" y="${BY0 + 150}" width="200" height="130" fill="#2a3a5a"/><rect x="${BX0 + 120}" y="${BY0 + 150}" width="200" height="12" fill="#c9a45c"/><text x="${BX0 + 220}" y="${BY0 + 230}" font-family="IBM Plex Mono,monospace" font-size="22" font-weight="700" fill="${C.paper}" text-anchor="middle">E-11</text>
    <text x="${BX0 + 220}" y="${BY0 + 260}" font-family="IBM Plex Mono,monospace" font-size="13" fill="${C.paper}" text-anchor="middle">NINE-TAILED FOX</text>${x.people?.length ? "" : ""}`,
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
      <ellipse cx="${hx}" cy="${H - 34}" rx="190" ry="26" fill="${C.lamp}" opacity=".08"/>
      <g class="hero" data-person="${esc(x.hero.key)}">${figureSvg(x.hero.spec, hx, H - 28, 1.72)}</g>`;
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
  const shown = L.staff.filter(s => s.role !== "patient").slice(0, 4);
  const out = shown.map((s, i) => {
    const px = BX0 + 140 + i * ((BX1 - BX0 - 280) / Math.max(1, shown.length - 1 || 1)) + (shown.length === 1 ? (BX1 - BX0 - 280) / 2 : 0);
    const spec: FigureSpec = { look: rollLook(s.id), dress: dress[s.role] ?? "fatigues", headgear: s.role === "engineer" ? "hardhat" : "", weapon: s.role === "guard" ? "m2_carbine" : undefined, pose: "work" };
    return `<g class="scene-staff"><title>${esc(s.name)}</title>${figureSvg(spec, px, BY1 + 40 + (i % 2) * 50, 0.72)}</g>`;
  });
  // the D-Class block shows its people as a few figures in orange; Command its duty officers
  if (L.kind === "barracks") for (let i = 0; i < Math.min(4, L.headcount); i++) out.push(figureSvg({ look: rollLook(`${L.id}-d${i}`), dress: "dclass", pose: "rest" }, BX0 + 180 + i * 260, BY1 + 60 + (i % 2) * 40, 0.72));
  if (L.kind === "command") out.push(figureSvg({ look: rollLook("duty-officer-1"), dress: "officer" }, BX0 + 300, BY1 + 90, 0.78), figureSvg({ look: rollLook("duty-officer-2", "f"), sex: "f", dress: "officer" }, BX0 + 960, BY1 + 70, 0.74));
  return out.join("");
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
  return `<rect width="${W}" height="${H}" fill="#05080b" opacity=".5" pointer-events="none"/>
    <path d="M60 ${H - 230} H${W - 60} L${W} ${H} H0Z" fill="#3b3226"/><path d="M60 ${H - 230} H${W - 60} L${W - 40} ${H - 205} H40Z" fill="#4e4231"/>
    <rect x="${cx - 640}" y="${cy - 150}" width="1280" height="300" fill="#2d3a2c" opacity=".55" rx="10"/>
    ${Array.from({ length: 13 }, (_, i) => `<line x1="${cx - 600 + i * 100}" y1="${cy - 140}" x2="${cx - 600 + i * 100}" y2="${cy + 140}" stroke="#d8d3c6" stroke-opacity=".06"/>`).join("")}
    <ellipse cx="${cx}" cy="${cy + 120}" rx="560" ry="34" fill="#000" opacity=".35"/>
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
  o.push(`<rect width="${W}" height="${H}" fill="url(#sc-vig)"/>`);
  return `<g pointer-events="none">${o.join("")}</g>`;   // state and light never take a click meant for a person
}
