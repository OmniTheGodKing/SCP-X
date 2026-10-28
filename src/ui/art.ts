// Strategic-layer art, drawn as inline SVG: Site-19's rooms seen in cross-section, the surface above them, the rock
// around them, and the anomalies in their cells. Everything shares one muted palette so it sits with the interface.
import type { FacilityType } from "../campaign/base";

const P = {
  wall: "#28313a", wall2: "#222a32", floor: "#171c21", trim: "#3a4651", steel: "#56636d", steelDk: "#3b454e",
  wood: "#5a4630", woodLt: "#6e5638", paper: "#d9d2bf", manila: "#d8bf86", amber: "#d9a441", red: "#c0503f", green: "#7fb08a",
  olive: "#5b6045", orange: "#d0732f", lamp: "#ffe6b0", ink: "#0f1317", glass: "#7fa6b8",
};
const GRADE: Record<string, string> = { cont_safe: "#7fb08a", cont_euclid: "#d9a441", cont_keter: "#c0503f" };

/** A rough random generator seeded by a string, so each room's details are stable between renders. */
function rng(seed: string) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface RoomOpts { damaged?: boolean; building?: boolean; alarm?: boolean; occupant?: string | null; seed?: string; dark?: boolean; empty?: boolean }

/** A facility as a room cut open on its side, 120 × 70. */
export function roomSvg(type: FacilityType | null, o: RoomOpts = {}) {
  const parts: string[] = [];
  const rnd = rng(o.seed ?? type ?? "x");
  if (!type) parts.push(cavity(rnd));
  else {
    parts.push(shell(type, o));
    parts.push(FURNISH[type]?.(o, rnd) ?? "");
    parts.push(lamp(type, o));
  }
  if (o.building) parts.push(scaffold());
  if (o.damaged) parts.push(damage(rnd));
  if (o.dark) parts.push(`<rect width="120" height="70" fill="#05080c" opacity=".55"/>`);
  return `<svg class="room" viewBox="0 0 120 70" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${parts.join("")}</svg>`;
}

function shell(type: FacilityType, o: RoomOpts) {
  const cont = type.startsWith("cont_"), back = cont ? "#252c33" : type === "generator" ? "#262b2f" : type === "barracks" || type === "holding" ? "#2b2f2c" : P.wall;
  return `<rect width="120" height="70" fill="${back}"/>
    <rect y="0" width="120" height="6" fill="${P.wall2}"/>
    ${[20, 40, 60, 80, 100].map(x => `<line x1="${x}" y1="6" x2="${x}" y2="58" stroke="#000" stroke-opacity=".12"/>`).join("")}
    <rect y="34" width="120" height="2" fill="#000" opacity=".12"/>
    <rect y="58" width="120" height="12" fill="${P.floor}"/><rect y="58" width="120" height="1.5" fill="${P.trim}"/>
    ${cont ? `<rect y="53" width="120" height="3" fill="url(#hz)" opacity=".7"/>` : ""}`;
}
function lamp(type: FacilityType, o: RoomOpts) {
  const lit = o.dark ? 0.1 : o.alarm ? 0 : 0.18;
  const glow = o.alarm ? `<rect width="120" height="70" fill="${P.red}" class="alarmglow"/>` : "";
  return `<line x1="60" y1="0" x2="60" y2="8" stroke="#111"/><path d="M54 8h12l-2 3h-8z" fill="#333a40"/>
    <path d="M56 11 L30 58 H90 L64 11Z" fill="${P.lamp}" opacity="${lit}"/>${glow}${type === "generator" ? "" : ""}`;
}
const person = (x: number, color: string, head = "#d9b48f", h = 1) => `<g transform="translate(${x} ${58 - 18 * h}) scale(${h})"><circle cx="0" cy="2.6" r="2.6" fill="${head}"/><path d="M-3.5 6h7l1 8h-2l-.5 4h-4l-.5-4h-2z" fill="${color}"/></g>`;

const FURNISH: Partial<Record<FacilityType, (o: RoomOpts, rnd: () => number) => string>> = {
  command: () => `
    <rect x="8" y="12" width="52" height="30" fill="#2f3d48" stroke="${P.trim}"/>
    <path d="M12 22c4-3 9-2 12 1s7 1 9-1 6 2 5 6-6 4-9 3-7 3-11 1-7-6-6-10z M40 18c3-1 8 0 12 2s3 6 0 8-8 0-10-3-4-6-2-7z M30 33c3-1 6 0 7 3s-3 4-5 3-4-5-2-6z" fill="#4b5f52"/>
    ${[[18, 25], [44, 22], [33, 36], [26, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${P.red}"/>`).join("")}
    <rect x="66" y="14" width="44" height="16" fill="#1d2329" stroke="${P.trim}"/>
    ${[0, 1, 2, 3].map(i => `<circle cx="${72 + i * 10}" cy="22" r="3" fill="#0f1317" stroke="${P.manila}" stroke-width=".8"/><line x1="${72 + i * 10}" y1="22" x2="${73.5 + i * 10}" y2="20" stroke="${P.manila}" stroke-width=".7"/>`).join("")}
    <rect x="64" y="42" width="48" height="16" fill="#2a3138"/><rect x="64" y="40" width="48" height="3" fill="${P.steel}"/>
    ${[70, 80, 90, 100].map(x => `<rect x="${x}" y="45" width="5" height="3" fill="${P.green}" opacity=".7"/>`).join("")}
    <path d="M14 50h40v3H14z" fill="${P.wood}"/><path d="M16 53h2v5h-2zM50 53h2v5h-2z" fill="${P.wood}"/>
    <rect x="22" y="47" width="20" height="3" fill="${P.paper}" opacity=".8"/>
    ${person(30, P.olive)}${person(86, "#3f4f63")}`,
  generator: (o) => `
    <rect x="10" y="22" width="70" height="30" rx="14" fill="${P.steelDk}" stroke="${P.steel}" stroke-width="1.5"/>
    ${[22, 34, 46, 58, 70].map(x => `<line x1="${x}" y1="23" x2="${x}" y2="51" stroke="${P.steel}" stroke-opacity=".6"/>`).join("")}
    <rect x="16" y="52" width="10" height="6" fill="#2a3138"/><rect x="64" y="52" width="10" height="6" fill="#2a3138"/>
    <path d="M80 30h14v-18h6v24H80z" fill="${P.steel}"/><path d="M80 44h22v14h-6v-8H80z" fill="${P.steelDk}"/>
    <circle cx="104" cy="22" r="6" fill="#0f1317" stroke="${P.manila}"/><line x1="104" y1="22" x2="${o.damaged ? 101 : 107}" y2="${o.damaged ? 25 : 18}" stroke="${P.red}"/>
    <rect x="10" y="46" width="70" height="3" fill="url(#hz)"/>
    ${o.dark || o.damaged ? "" : `<circle cx="45" cy="37" r="5" fill="${P.amber}" opacity=".35" class="hum"/>`}`,
  barracks: (_o, rnd) => {
    let s = `${[16, 44, 72, 100].map(x => `<rect x="${x - 2}" y="10" width="1.5" height="48" fill="#4a4f52"/>`).join("")}`;
    for (const x of [6, 34, 62, 90]) for (const y of [24, 44]) {
      s += `<rect x="${x}" y="${y}" width="24" height="3" fill="#4d5560"/><rect x="${x + 1}" y="${y - 3}" width="22" height="3" fill="${P.orange}" opacity="${0.6 + rnd() * 0.3}"/><rect x="${x + 1}" y="${y - 3}" width="5" height="2.5" fill="#c9c4b0"/>`;
      s += `<rect x="${x}" y="${y + 3}" width="1.5" height="${58 - y - 3}" fill="#3d444b"/><rect x="${x + 22.5}" y="${y + 3}" width="1.5" height="${58 - y - 3}" fill="#3d444b"/>`;
    }
    return s + person(48, P.orange, "#c99a72", 0.9);
  },
  security: () => `
    ${[8, 18, 28].map(x => `<rect x="${x}" y="18" width="9" height="40" fill="#4b5a46" stroke="#2c3528"/><rect x="${x + 6}" y="34" width="1.5" height="4" fill="${P.manila}"/>${[22, 25, 28].map(y => `<rect x="${x + 2}" y="${y}" width="5" height=".8" fill="#2c3528"/>`).join("")}`).join("")}
    <rect x="44" y="14" width="30" height="26" fill="${P.wood}"/><rect x="44" y="14" width="30" height="2" fill="${P.woodLt}"/>
    ${[48, 54, 60, 66].map(x => `<rect x="${x}" y="17" width="2" height="21" fill="#1e1f21"/><rect x="${x - 0.3}" y="30" width="2.6" height="8" fill="#6b4a2a"/>`).join("")}
    <rect x="80" y="44" width="32" height="4" fill="${P.wood}"/><rect x="82" y="48" width="2" height="10" fill="${P.wood}"/><rect x="108" y="48" width="2" height="10" fill="${P.wood}"/>
    <rect x="84" y="40" width="7" height="4" fill="#1a1a1a"/><circle cx="104" cy="16" r="4" fill="${P.red}" opacity=".85"/>
    ${person(96, "#4f5d6e", "#d9b48f")}`,
  medical: () => `
    <rect x="10" y="40" width="40" height="6" fill="#c9cdc6"/><rect x="10" y="36" width="10" height="4" fill="#e3e6df"/>
    <rect x="12" y="46" width="2" height="12" fill="${P.steel}"/><rect x="46" y="46" width="2" height="12" fill="${P.steel}"/>
    <rect x="56" y="14" width="1.5" height="44" fill="${P.steel}"/><rect x="52" y="14" width="9" height="10" rx="3" fill="${P.glass}" opacity=".7"/>
    <rect x="70" y="16" width="26" height="42" fill="#c9cdc6"/><rect x="70" y="36" width="26" height="1.5" fill="#8d938b"/>
    <path d="M80 22h6v4h4v6h-4v4h-6v-4h-4v-6h4z" fill="${P.red}"/>
    <path d="M100 8 v50" stroke="#8d938b"/><path d="M100 8 q6 10 0 20 q6 10 0 20 q6 6 0 10" fill="#b9c2c0" opacity=".7"/>
    ${person(64, "#e8e4d8", "#d9b48f")}`,
  psych: () => `
    <rect x="8" y="42" width="40" height="10" rx="3" fill="#5b3e3a"/><rect x="8" y="36" width="8" height="16" rx="3" fill="#6f4c46"/><rect x="12" y="52" width="2" height="6" fill="#3a2a22"/><rect x="42" y="52" width="2" height="6" fill="#3a2a22"/>
    <rect x="70" y="40" width="16" height="12" rx="3" fill="#4a5a46"/><rect x="70" y="32" width="4" height="20" rx="2" fill="#56684f"/>
    <rect x="96" y="20" width="1.5" height="38" fill="#3a3128"/><path d="M90 20h14l-3-8h-8z" fill="${P.amber}" opacity=".8"/>
    <rect x="22" y="12" width="16" height="12" fill="${P.paper}" opacity=".8" stroke="${P.wood}"/><circle cx="64" cy="18" r="6" fill="#e3ddc8" stroke="${P.wood}"/><line x1="64" y1="18" x2="64" y2="14" stroke="${P.ink}"/><line x1="64" y1="18" x2="67" y2="18" stroke="${P.ink}"/>
    ${person(78, "#d8d8d0", "#d9b48f")}`,
  lab: (_o, rnd) => `
    <rect x="6" y="12" width="44" height="22" fill="#1f2a24" stroke="${P.wood}" stroke-width="1.5"/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${10 + rnd() * 30} ${16 + i * 3}h${6 + rnd() * 10}" stroke="#d8d8d0" stroke-opacity=".6" stroke-width=".7"/>`).join("")}
    <rect x="4" y="42" width="112" height="4" fill="${P.steel}"/><rect x="6" y="46" width="108" height="12" fill="#3b444c"/>
    ${[[16, P.green], [26, P.glass], [36, P.amber], [80, "#b36b8a"], [92, P.green]].map(([x, c]) => `<path d="M${x} 34v4l-3 4h8l-3-4v-4z" fill="${c}" opacity=".8"/>`).join("")}
    <path d="M56 42v-10h3l4 4v2h-4v4z" fill="#2a3138"/><circle cx="61" cy="34" r="1.5" fill="${P.glass}"/>
    <rect x="66" y="14" width="46" height="20" fill="#2a3138" stroke="${P.trim}"/>${[70, 78, 86, 94, 102].map(x => `<rect x="${x}" y="18" width="5" height="12" fill="${P.glass}" opacity="${0.2 + rnd() * 0.4}"/>`).join("")}
    ${person(48, "#d8d8d0", "#d9b48f")}`,
  workshop: () => `
    <rect x="6" y="12" width="40" height="26" fill="#3a3128"/>
    <path d="M12 16v14M20 16l-3 14M30 16h6v3h-6zM28 24h10M14 32h8" stroke="${P.steel}" stroke-width="2"/>
    <rect x="52" y="38" width="40" height="8" fill="${P.steel}"/><rect x="56" y="46" width="6" height="12" fill="${P.steelDk}"/><rect x="82" y="46" width="6" height="12" fill="${P.steelDk}"/>
    <rect x="60" y="30" width="12" height="8" fill="${P.steelDk}"/><rect x="72" y="33" width="14" height="2" fill="#9aa4ad"/>
    ${[0, 1, 2, 3, 4].map(i => `<line x1="86" y1="34" x2="${89 + i * 2}" y2="${28 + i}" stroke="${P.amber}" stroke-width=".8" class="spark"/>`).join("")}
    <rect x="98" y="30" width="16" height="28" fill="#4b5a46"/><rect x="98" y="38" width="16" height="1" fill="#2c3528"/><rect x="98" y="46" width="16" height="1" fill="#2c3528"/>
    ${person(40, "#3f4a52", "#d9b48f")}`,
  training: () => `
    ${[30, 60, 90].map(x => `<rect x="${x - 0.5}" y="22" width="1" height="36" fill="${P.wood}"/><circle cx="${x}" cy="24" r="7" fill="${P.paper}"/><circle cx="${x}" cy="24" r="4.5" fill="none" stroke="${P.ink}"/><circle cx="${x}" cy="24" r="1.6" fill="${P.red}"/>`).join("")}
    ${[0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="${10 + i * 20}" cy="56" rx="9" ry="3" fill="#8f805c"/>`).join("")}
    ${person(12, P.olive)}`,
  holding: () => `
    ${[0, 1, 2].map(k => `<rect x="${6 + k * 38}" y="14" width="34" height="44" fill="#20262b" stroke="${P.trim}"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${8 + k * 38 + i * 4}" y="14" width="1.2" height="44" fill="${P.steel}"/>`).join("")}`).join("")}
    <rect x="12" y="48" width="14" height="3" fill="${P.wood}"/>${person(19, "#3a3026", "#c99a72", 0.85)}`,
  amnestics: (_o, rnd) => `
    ${[14, 30, 46].map(y => `<rect x="6" y="${y}" width="56" height="2" fill="${P.wood}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${9 + i * 6}" y="${y - 7}" width="3" height="7" rx="1" fill="${["#8fb4c9", "#b9d3a8", "#d8c37a", "#c99ab0"][Math.floor(rnd() * 4)]}" opacity=".85"/>`).join("")}`).join("")}
    <rect x="70" y="38" width="44" height="20" fill="${P.wood}"/><rect x="70" y="36" width="44" height="3" fill="${P.woodLt}"/>
    <rect x="78" y="30" width="12" height="6" fill="${P.paper}"/><path d="M96 33h12M106 31v4" stroke="${P.steel}" stroke-width="1.5"/>
    ${person(64, "#d8d8d0", "#d9b48f")}`,
};
for (const t of ["cont_safe", "cont_euclid", "cont_keter"] as FacilityType[]) FURNISH[t] = (o) => cell(t, o);

/** A containment wing: the cell behind its observation window, the vault door, warning plates in the wing's grade. */
function cell(t: FacilityType, o: RoomOpts) {
  const g = GRADE[t];
  const occ = o.occupant ? `<g clip-path="url(#win)">${anomalyFigure(o.occupant, 34, 52)}</g>` : "";
  return `<clipPath id="win"><rect x="10" y="14" width="48" height="38"/></clipPath>
    <rect x="10" y="14" width="48" height="38" fill="#14181c"/>${occ}
    <rect x="10" y="14" width="48" height="38" fill="${P.glass}" opacity=".12"/><path d="M14 18l10 0-12 12z" fill="#fff" opacity=".06"/>
    <rect x="10" y="14" width="48" height="38" fill="none" stroke="${P.steel}" stroke-width="2"/>
    <circle cx="88" cy="34" r="17" fill="${P.steelDk}" stroke="${P.steel}" stroke-width="2.5"/>
    <circle cx="88" cy="34" r="11" fill="none" stroke="${P.steel}" stroke-width="1.2"/>
    ${[0, 60, 120, 180, 240, 300].map(a => `<rect x="86.5" y="17" width="3" height="5" fill="${P.steel}" transform="rotate(${a} 88 34)"/>`).join("")}
    <path d="M80 34h16M88 26v16" stroke="#2a3138" stroke-width="2.5"/>
    <rect x="108" y="16" width="8" height="10" fill="${g}"/><text x="112" y="23.5" font-size="6" text-anchor="middle" fill="${P.ink}" font-family="IBM Plex Mono,monospace" font-weight="700">${t === "cont_safe" ? "S" : t === "cont_euclid" ? "E" : "K"}</text>
    <rect x="62" y="10" width="52" height="2" fill="${g}" opacity=".7"/>
    ${o.alarm ? `<circle cx="112" cy="40" r="3" fill="${P.red}" class="blinkdot"/>` : `<circle cx="112" cy="40" r="2" fill="${o.occupant ? P.green : "#3a4651"}"/>`}`;
}

/** The anomalies, as figures for their cells, dossier photos and the World Map. Drawn standing on (x, baseY). */
export function anomalyFigure(id: string, x: number, baseY: number, s = 1) {
  const g = (inner: string) => `<g transform="translate(${x} ${baseY}) scale(${s})">${inner}</g>`;
  switch (id) {
    case "173": return g(`<ellipse cx="0" cy="0" rx="9" ry="2" fill="#000" opacity=".4"/>
      <path d="M-6 0 L-7.5 -20 Q0 -23 7.5 -20 L6 0Z" fill="#bdb7ab"/><ellipse cx="0" cy="-26" rx="5.5" ry="6.5" fill="#c9c3b6"/>
      <path d="M-7 -18 L-11 -10 M7 -18 L11 -10" stroke="#6b5a48" stroke-width="1.4"/>
      <rect x="-4" y="-28" width="3" height="1.6" fill="#7a2f22"/><rect x="1" y="-28" width="3" height="1.6" fill="#7a2f22"/><rect x="-4" y="-14" width="8" height="2" fill="#3f6b45"/>`);
    case "049": return g(`<ellipse cx="0" cy="0" rx="9" ry="2" fill="#000" opacity=".4"/>
      <path d="M-8 0 L-6 -22 Q0 -26 6 -22 L8 0Z" fill="#1d1a18"/><circle cx="0" cy="-27" r="5" fill="#2a2521"/>
      <path d="M2 -28 L10 -24 L2 -23Z" fill="#e8dcc0"/><circle cx="1.5" cy="-28" r="1" fill="#0f1317"/>
      <path d="M-6 -30 h12 l-2 -3 h-8z" fill="#1a1715"/><rect x="5" y="-10" width="6" height="5" fill="#6b4a2a"/>`);
    case "106": return g(`<ellipse cx="0" cy="0" rx="12" ry="3" fill="#0e0a06" opacity=".9"/>
      <path d="M-6 0 Q-9 -14 -4 -22 Q2 -26 6 -20 Q8 -12 6 0Z" fill="#2a2118"/><circle cx="2" cy="-25" r="5" fill="#3a2e22"/>
      <circle cx="3.5" cy="-26" r="1" fill="#d8c690"/><circle cx="0.8" cy="-26" r="1" fill="#d8c690"/>
      <path d="M6 -16 Q12 -12 12 -4 M-6 -16 Q-11 -10 -10 -3" stroke="#2a2118" stroke-width="2" fill="none"/>
      <circle cx="-3" cy="2" r="1" fill="#1c160e"/><circle cx="5" cy="3" r="1.2" fill="#1c160e"/>`);
    case "610": return g(`<path d="M-16 0 Q-14 -10 -6 -12 Q-2 -22 6 -14 Q16 -14 16 0Z" fill="#8c2c34"/><circle cx="-2" cy="-10" r="3.5" fill="#b5464e"/>
      <path d="M-14 -4 Q-20 -14 -24 -10 M14 -4 Q20 -16 25 -12 M4 -14 Q6 -24 2 -28" stroke="#6e1f26" stroke-width="2" fill="none"/>`);
    case "500": return g(`<rect x="-7" y="-14" width="14" height="14" rx="2" fill="#7a2f22"/><rect x="-7" y="-14" width="14" height="4" fill="#5a2018"/><ellipse cx="0" cy="-5" rx="3" ry="2" fill="#c0503f"/><ellipse cx="4" cy="-3" rx="2" ry="1.4" fill="#d75b47"/>`);
    case "914": return g(`<rect x="-20" y="-24" width="40" height="24" fill="#5a4630"/><circle cx="0" cy="-14" r="8" fill="#8a6a3a" stroke="#d9a441"/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="-1" y="-24" width="2" height="4" fill="#d9a441" transform="rotate(${a} 0 -14)"/>`).join("")}<rect x="-18" y="-10" width="6" height="8" fill="#2a2118"/><rect x="12" y="-10" width="6" height="8" fill="#2a2118"/>`);
    case "005": return g(`<rect x="-1.2" y="-22" width="2.4" height="16" fill="#b8a46a"/><circle cx="0" cy="-24" r="4" fill="none" stroke="#b8a46a" stroke-width="2"/><path d="M1 -10h4v2h-2v2h3v2H1" fill="#b8a46a"/>`);
    default: return g(`<rect x="-6" y="-20" width="12" height="20" fill="#3a4651"/><text x="0" y="-7" font-size="8" fill="#d8bf86" text-anchor="middle">?</text>`);
  }
}

function cavity(rnd: () => number) {
  let pts = "";
  const n = 14;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rx = 52 + rnd() * 6, ry = 28 + rnd() * 5; pts += `${r1(60 + Math.cos(a) * rx)},${r1(34 + Math.sin(a) * ry)} `; }
  return `<rect width="120" height="70" fill="#1b1f22"/>
    <polygon points="${pts}" fill="#23282c" stroke="#2f363c" stroke-width="1.5"/>
    ${Array.from({ length: 10 }, () => `<circle cx="${r1(rnd() * 120)}" cy="${r1(rnd() * 70)}" r="${r1(0.6 + rnd() * 1.6)}" fill="#2e3439"/>`).join("")}
    <line x1="60" y1="0" x2="60" y2="16" stroke="#3a3f44"/><circle cx="60" cy="18" r="2.4" fill="${P.lamp}" opacity=".7"/>
    <path d="M60 20 L36 62 H84Z" fill="${P.lamp}" opacity=".05"/>`;
}
function scaffold() {
  return `<g opacity=".9">${[14, 46, 78, 106].map(x => `<rect x="${x}" y="6" width="2" height="52" fill="#8a6a3a"/>`).join("")}
    ${[20, 38].map(y => `<rect x="10" y="${y}" width="100" height="2" fill="#8a6a3a"/>`).join("")}
    <path d="M16 20 L46 38 M48 20 L78 38 M80 20 L106 38" stroke="#8a6a3a" stroke-width="1.2"/>
    <rect x="0" y="62" width="120" height="3" fill="url(#hz)"/></g>`;
}
function damage(rnd: () => number) {
  const cracks = Array.from({ length: 3 }, () => { const x = 10 + rnd() * 100; return `<path d="M${r1(x)} 6 l${r1(rnd() * 8 - 4)} 10 l${r1(rnd() * 8 - 4)} 8 l${r1(rnd() * 6 - 3)} 10" stroke="#0a0c0e" stroke-width="1.4" fill="none"/>`; }).join("");
  return `<rect width="120" height="70" fill="${P.red}" opacity=".12"/>${cracks}
    ${Array.from({ length: 6 }, () => `<rect x="${r1(10 + rnd() * 100)}" y="${r1(54 + rnd() * 4)}" width="${r1(3 + rnd() * 5)}" height="${r1(2 + rnd() * 2)}" fill="#3a3f44" transform="rotate(${Math.round(rnd() * 40 - 20)})"/>`).join("")}
    <g class="smoke">${[30, 70, 95].map((x, i) => `<circle cx="${x}" cy="${20 - i * 2}" r="${8 + i * 2}" fill="#6b6f73" opacity=".25"/>`).join("")}</g>`;
}

/** The shared defs every room uses (hazard stripes). Put once on the page. */
export const ART_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="hz" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#1a1a1a"/><rect width="4" height="8" fill="#d6aa32"/></pattern>
  <radialGradient id="vig" cx=".5" cy=".5" r=".7"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs></svg>`;

/** Site-19 from the surface: the compound on its hill at the hour of the day, over the levels below. */
export function surfaceSvg(hour: number, alarm: boolean) {
  const night = hour < 6 || hour >= 19, dusk = !night && (hour < 8 || hour >= 17);
  const sky = night ? ["#070b14", "#121a2a"] : dusk ? ["#3a2a3a", "#b0704a"] : ["#4d6a85", "#9db5c4"];
  const stars = night ? Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 53) % 600}" cy="${(i * 29) % 40}" r="${i % 3 ? 0.6 : 1}" fill="#fff" opacity=".7"/>`).join("") : "";
  const lit = night || dusk;
  return `<svg class="surface" viewBox="0 0 600 70" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="600" height="70" fill="url(#sky)"/>${stars}
    ${night ? `<circle cx="520" cy="16" r="7" fill="#e8e4d0" opacity=".85"/>` : dusk ? `<circle cx="80" cy="44" r="12" fill="#f0b070" opacity=".8"/>` : `<circle cx="500" cy="14" r="8" fill="#fff6d8" opacity=".9"/>`}
    <path d="M0 52 Q60 36 130 46 T260 42 T400 48 T520 38 T600 46 V70 H0Z" fill="${night ? "#141c18" : "#3d4a36"}"/>
    <path d="M0 58 Q100 50 200 56 T420 54 T600 56 V70 H0Z" fill="${night ? "#10150f" : "#323d2c"}"/>
    <!-- the compound: wire, gatehouse, offices, barracks, the lift head and its flag -->
    <path d="M20 58 V50 M600 58 V50" stroke="#555"/>${Array.from({ length: 30 }, (_, i) => `<line x1="${20 + i * 19}" y1="50" x2="${20 + i * 19}" y2="58" stroke="#5a5f63" stroke-width="1"/>`).join("")}
    <line x1="20" y1="51" x2="600" y2="51" stroke="#6a6f73" stroke-dasharray="2 2"/>
    <rect x="60" y="46" width="20" height="12" fill="#4a5058"/><path d="M58 46h24l-12-5z" fill="#3a3f45"/>
    <rect x="150" y="40" width="70" height="18" fill="#535a62"/><rect x="150" y="38" width="70" height="3" fill="#3a3f45"/>
    ${[158, 172, 186, 200].map(x => `<rect x="${x}" y="45" width="8" height="5" fill="${lit ? "#ffd98a" : "#2a3138"}" opacity="${lit ? 0.8 : 1}"/>`).join("")}
    <rect x="260" y="20" width="4" height="38" fill="#3a3f45"/><rect x="290" y="20" width="4" height="38" fill="#3a3f45"/>
    <path d="M260 22 L294 40 M294 22 L260 40 M260 38 L294 56 M294 38 L260 56" stroke="#3a3f45" stroke-width="1.5"/>
    <rect x="254" y="16" width="46" height="5" fill="#2e3338"/><circle cx="277" cy="12" r="5" fill="none" stroke="#2e3338" stroke-width="2"/>
    <rect x="330" y="44" width="90" height="14" fill="#4a5058"/>${[340, 356, 372, 388, 404].map(x => `<rect x="${x}" y="48" width="7" height="4" fill="${lit ? "#ffd98a" : "#2a3138"}" opacity="${lit ? 0.7 : 1}"/>`).join("")}
    <line x1="460" y1="20" x2="460" y2="58" stroke="#9aa0a6" stroke-width="1.5"/><path d="M461 21 h16 v9 h-16z" fill="#d8d8d0"/><circle cx="469" cy="25.5" r="2.5" fill="none" stroke="#2a3138"/>
    ${lit ? `<path d="M100 20 L60 58 H140Z" fill="#fff4c0" opacity=".08"/><rect x="98" y="16" width="4" height="42" fill="#3a3f45"/>` : `<rect x="98" y="16" width="4" height="42" fill="#3a3f45"/>`}
    ${alarm ? `<rect width="600" height="70" fill="#c0503f" class="alarmglow"/>` : ""}
  </svg>`;
}
