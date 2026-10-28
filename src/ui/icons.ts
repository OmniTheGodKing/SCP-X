// Icons, emblems and small illustrations for the strategic layer, as inline SVG strings. Icons are drawn on a 24-unit
// grid in the current text colour with a few fixed accents, so they follow whatever they sit in.
import { anomalyFigure } from "./art";

const svg = (body: string, size: number, cls = "ico", vb = "0 0 24 24") => `<svg class="${cls}" width="${size}" height="${size}" viewBox="${vb}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS: Record<string, string> = {
  // resources
  funds: `<circle cx="9" cy="14" r="6"/><path d="M9 10.5v7M11 11.6c-.6-.6-3.6-.9-3.6.8 0 1.6 3.8.9 3.8 2.7 0 1.6-3.2 1.4-4 .6"/><path d="M14 4.5a6 6 0 0 1 4.5 10"/>`,
  dclass: `<circle cx="12" cy="7" r="3.5" fill="#d0732f33"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/><path d="M9.5 14.5h5" stroke="#d0732f"/>`,
  intel: `<path d="M3 6h7l2 2h9v11H3z"/><path d="M7 13h10M7 16h6"/>`,
  standing: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M10 10.5v3M14 10.5v3M10 12h1M13 12h1"/>`,
  guards: `<path d="M5 11h14l-1.5-4.5a6 6 0 0 0-11 0z"/><path d="M4 11h16v2H4z"/><path d="M8 13v2a4 4 0 0 0 8 0v-2"/>`,
  amnestics: `<path d="M14.5 3.5l6 6M17.5 6.5l-9 9-3 .5.5-3 9-9"/><path d="M8.5 15.5l-5 5M10 11l3 3"/>`,
  exposure: `<path d="M3 5h15v14H5a2 2 0 0 1-2-2z"/><path d="M18 8h3v9a2 2 0 0 1-2 2"/><path d="M6 8h9M6 11h9M6 14h5"/>`,
  engineers: `<path d="M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>`,
  researchers: `<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9" stroke="#7fb08a"/>`,
  power: `<path d="M13 2 5 13h6l-1 9 8-11h-6z" fill="#d9a44133"/>`,
  time: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  // tabs
  command: `<path d="M4 20V9l8-5 8 5v11z"/><path d="M9 20v-6h6v6"/><path d="M12 4V1.5"/><path d="M12 2h3v2h-3" fill="currentColor"/>`,
  world: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>`,
  site: `<path d="M3 7h18M3 12h18M3 17h18"/><rect x="3" y="3" width="18" height="18"/><path d="M12 3v18" stroke-dasharray="2 2"/>`,
  research: `<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/><path d="M7.5 10h5M10 7.5v5"/>`,
  personnel: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 6 5"/>`,
  history: `<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 12h8M8 15h5"/>`,
  // incident kinds
  breach: `<path d="M7 17a5 5 0 0 1 10 0"/><path d="M5 17h14v3H5z"/><path d="M12 5v3M5.5 8l2 2M18.5 8l-2 2" stroke="#c0503f"/>`,
  recovery: `<rect x="4" y="9" width="16" height="11"/><path d="M4 9l3-4h10l3 4M12 9v11"/><circle cx="12" cy="14.5" r="2" fill="#d8bf8655"/>`,
  manhunt: `<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/><path d="M10 7v6M7 10h6" stroke="#c0503f"/>`,
  coverup: `<path d="M3 5h15v14H5a2 2 0 0 1-2-2z"/><path d="M6 8h9M6 11h9M6 14h9" /><path d="M5 18 18 6" stroke="#c0503f" stroke-width="2"/>`,
  strike: `<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`,
  escort: `<path d="M2 16V8h11v8M13 11h4l3 3v2h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/>`,
  retaliation: `<path d="M4 20V11l6-5 6 5v9z"/><path d="M15 6c2 2 4 1 4-2 2 2 3 5 1 8" stroke="#d9a441"/><path d="M8 20v-4h4v4"/>`,
  outbreak: `<path d="M12 4c4 0 7 3 6 7s2 5 0 7-6 2-8 0-6 0-6-4 2-5 3-7 1-3 5-3z" fill="#8c2c3444" stroke="#c0503f"/><circle cx="10" cy="11" r="1.5" fill="#c0503f" stroke="none"/>`,
  riot: `<path d="M8 21v-6M16 21v-6"/><path d="M6 11V6a1.5 1.5 0 0 1 3 0v4M9 9V5a1.5 1.5 0 0 1 3 0v5M12 9.5V6a1.5 1.5 0 0 1 3 0v6M15 11V8.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 4H10a4 4 0 0 1-4-4v-2"/>`,
  raid: `<path d="M2 8h20M2 16h20"/><path d="M5 8l2 8M11 8l2 8M17 8l2 8"/><path d="M4 6l2 4M10 6l2 4M16 6l2 4" stroke="#c0503f"/>`,
  rescue: `<path d="M12 21V11"/><path d="M12 11c-3-1-4-4-2-7 1 2 2 2 2 2s1-2 3-3c1 3 0 6-3 8z" fill="#d75b4755" stroke="#d75b47"/><path d="M8 21h8"/>`,
  emergency: `<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17v.5"/>`,
  // misc
  council: `<circle cx="12" cy="12" r="9"/><path d="M8.5 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4zM14 9.5h3v2.5h-3v2.5h3"/>`,
  insurgency: `<path d="M12 3 21 20H3z"/><path d="M12 3v9l5 8M12 12l-5 8"/>`,
  anomaly: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v4.5M12 16.5V21M4.2 7.5l3.9 2.2M15.9 14.3l3.9 2.2M4.2 16.5l3.9-2.2M15.9 9.7l3.9-2.2"/>`,
  medal: `<circle cx="12" cy="15" r="5"/><path d="M8 3l4 7 4-7"/><path d="M12 12.5l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z" fill="currentColor"/>`,
  death: `<path d="M7 21V9a5 5 0 0 1 10 0v12z"/><path d="M12 9v6M9.5 11.5h5"/>`,
  promotion: `<path d="M5 13l7-5 7 5M5 18l7-5 7 5"/>`,
  front: `<path d="M4 20V8h16v12"/><path d="M2 8h20l-2-4H4z"/><path d="M9 20v-6h6v6"/>`,
  build: `<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-5h6v5"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>`,
  weapon: `<path d="M2 11h14l2-2h4v3h-3l-1 1v3h-3v-2H8l-2 4H3l1-4H2z"/>`,
  armor: `<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/>`,
};

export const icon = (name: string, size = 16, cls = "ico") => ICONS[name] ? svg(ICONS[name], size, cls) : "";

/** Site-19's seal: a ringed keep with three arrows pointing in, for the header. (Drawn for this game, not the
 *  Foundation's wiki logo.) */
export function siteSeal(size = 44) {
  return `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#14181c" stroke="#d8bf86" stroke-width="1.6"/>
    <circle cx="24" cy="24" r="17.5" fill="none" stroke="#d8bf86" stroke-width=".8" stroke-dasharray="1.5 2"/>
    <rect x="17" y="18" width="14" height="13" fill="none" stroke="#d8bf86" stroke-width="1.6"/>
    <path d="M17 18v-3h3v2h2.5v-2h3v2H28v-2h3v3" fill="none" stroke="#d8bf86" stroke-width="1.4"/>
    ${[0, 120, 240].map(a => `<path d="M24 4.5v6.5M21.8 8.6 24 11l2.2-2.4" fill="none" stroke="#d8bf86" stroke-width="1.6" transform="rotate(${a} 24 24)"/>`).join("")}
    <text x="24" y="28.5" font-size="7" text-anchor="middle" fill="#d8bf86" font-family="IBM Plex Mono,monospace" font-weight="700">19</text>
  </svg>`;
}
/** The O5 Council: thirteen seats round a seal. */
export function councilSeal(size = 56) {
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#1a1612" stroke="#b8a46a" stroke-width="1.4"/>
    ${Array.from({ length: 13 }, (_, i) => { const a = i / 13 * Math.PI * 2 - Math.PI / 2; return `<circle cx="${(24 + Math.cos(a) * 17).toFixed(1)}" cy="${(24 + Math.sin(a) * 17).toFixed(1)}" r="1.8" fill="#b8a46a"/>`; }).join("")}
    <circle cx="24" cy="24" r="11" fill="none" stroke="#b8a46a" stroke-width="1"/>
    <text x="24" y="28" font-size="11" text-anchor="middle" fill="#d8bf86" font-family="Special Elite,IBM Plex Mono,monospace">O5</text>
  </svg>`;
}
/** The Insurgency's mark as Site-19's analysts drew it: a split triangle. */
export function insurgencyMark(size = 56) {
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#17121b" stroke="#9a78b8" stroke-width="1.4"/>
    <path d="M24 9 39 35H9z" fill="none" stroke="#b98bd3" stroke-width="2"/>
    <path d="M24 9v14l9 12M24 23l-9 12" fill="none" stroke="#b98bd3" stroke-width="1.6"/>
    <circle cx="24" cy="23" r="2.4" fill="#b98bd3"/>
  </svg>`;
}

// ---------- illustrations ----------
/** A small sepia "field photograph" for an incident, 160 × 64, by kind. */
/** Which anomaly an incident's scene shows: the first SCP number in its seed text, SCP-173 if none. */
const figureIn = (seed: string) => ["049", "106", "610", "096", "012", "939", "035", "682"].find(id => seed.includes(id)) ?? "173";
export function incidentScene(kind: string, seed = "") {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const r = (k: number) => { const x = Math.sin(h * 0.001 + k * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const ground = `<rect y="46" width="160" height="18" fill="#3a3326"/>`;
  const sky = (night = false) => `<rect width="160" height="64" fill="${night ? "#1c1d22" : "#5a5446"}"/>`;
  const house = (x: number, w: number, hgt: number, lit = false) => `<rect x="${x}" y="${46 - hgt}" width="${w}" height="${hgt}" fill="#2e2a22"/><path d="M${x - 2} ${46 - hgt}h${w + 4}l-${w / 2 + 2} -${hgt * 0.5}z" fill="#25211b"/>${lit ? `<rect x="${x + w / 3}" y="${46 - hgt * 0.6}" width="${w / 4}" height="${hgt / 4}" fill="#e8c878" opacity=".85"/>` : ""}`;
  let body = "";
  switch (kind) {
    case "breach": body = `<rect width="160" height="64" fill="#2a2522"/><rect y="50" width="160" height="14" fill="#1c1916"/>
      ${[20, 60, 100, 140].map(x => `<rect x="${x - 10}" y="8" width="20" height="42" fill="#332d28" stroke="#1c1916"/>`).join("")}
      <rect x="62" y="12" width="36" height="38" fill="#120f0d"/>${anomalyFigure(figureIn(seed), 80, 50, 1)}
      <circle cx="80" cy="6" r="4" fill="#c0503f" class="blinkdot"/><rect width="160" height="64" fill="#c0503f" opacity=".12"/>`; break;
    case "recovery": case "manhunt": body = `${sky()}${ground}${house(12, 30, 18)}${house(118, 30, 22)}
      <path d="M0 50 Q80 44 160 52" stroke="#4a4232" stroke-width="5" fill="none"/>${anomalyFigure(figureIn(seed), 80, 50, 0.85)}
      <path d="M60 28h40" stroke="#d8bf86" stroke-dasharray="3 3"/>`; break;
    case "coverup": body = `${sky()}${ground}<rect x="56" y="18" width="48" height="28" fill="#3a332a"/><path d="M54 18h52l-26-12z" fill="#2e2922"/><rect x="77" y="0" width="4" height="12" fill="#2e2922"/><path d="M73 4h12" stroke="#2e2922" stroke-width="3"/>
      <rect x="74" y="32" width="12" height="14" fill="#1a1712"/>${[30, 38, 46, 112, 120, 128].map((x, i) => `<g transform="translate(${x} 52)"><circle cy="-10" r="2.6" fill="#a8977a"/><path d="M-3 -7h6l1 7h-8z" fill="#4a4232"/></g>`).join("")}
      <path d="M118 8l6-3 2 6" stroke="#e8c878" fill="none"/><circle cx="130" cy="12" r="2" fill="#e8c878"/>`; break;
    case "strike": body = `${sky(true)}<rect y="46" width="160" height="18" fill="#17161a"/><rect x="30" y="16" width="100" height="30" fill="#24222a"/><path d="M28 16h104l-8-8H36z" fill="#1d1c22"/>
      ${[44, 64, 84, 104].map((x, i) => `<rect x="${x}" y="24" width="10" height="8" fill="${i === 1 ? "#e8c878" : "#121116"}" opacity=".9"/>`).join("")}<rect x="72" y="34" width="16" height="12" fill="#121116"/>
      <g stroke="#c0503f" stroke-width="1.2" fill="none"><circle cx="69" cy="28" r="7"/><path d="M69 18v5M69 33v5M59 28h5M74 28h5"/></g>`; break;
    case "escort": body = `${sky()}${ground}<path d="M0 54h160" stroke="#4a4232" stroke-width="8"/>
      <g transform="translate(${50 + Math.round(r(1) * 30)} 0)"><rect x="0" y="32" width="36" height="18" fill="#3f4a35"/><rect x="36" y="38" width="14" height="12" fill="#35402d"/><rect x="40" y="40" width="7" height="5" fill="#8aa2b0" opacity=".7"/><circle cx="8" cy="52" r="4" fill="#1a1712"/><circle cx="42" cy="52" r="4" fill="#1a1712"/></g>
      ${[20, 140].map(x => `<path d="M${x} 46v-14" stroke="#2a2620" stroke-width="3"/><circle cx="${x}" cy="28" r="8" fill="#2f3826"/>`).join("")}`; break;
    case "retaliation": body = `${sky(true)}${ground}${house(16, 30, 20, true)}${house(64, 34, 24)}${house(114, 30, 18, true)}
      <path d="M70 22 q8 -14 4 -20 q12 6 8 22z" fill="#d9a441" opacity=".85"/><path d="M76 22 q4 -8 2 -12 q6 4 4 12z" fill="#f0d080"/>
      <path d="M70 8 q-6 -6 0 -10 q10 -2 6 8" fill="#555" opacity=".5"/>`; break;
    case "outbreak": body = `${sky()}${ground}${house(20, 30, 20)}${house(100, 40, 24)}
      <path d="M0 50 Q40 40 70 48 Q100 56 160 44 V64 H0Z" fill="#6e1f26" opacity=".9"/><circle cx="60" cy="48" r="5" fill="#8c2c34"/><circle cx="118" cy="40" r="7" fill="#8c2c34"/>
      <path d="M110 30 q-4 -10 6 -14 M124 34 q8 -8 4 -16" stroke="#6e1f26" stroke-width="2.5" fill="none"/>`; break;
    case "riot": body = `<rect width="160" height="64" fill="#2b2f2c"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${4 + i * 13}" y="6" width="2" height="44" fill="#4a4f52"/>`).join("")}
      <rect y="50" width="160" height="14" fill="#1c1f1d"/>${[30, 48, 66, 90, 112].map((x, i) => `<g transform="translate(${x} 52)"><circle cy="-12" r="3" fill="#c99a72"/><path d="M-4 -8h8l1 8h-10z" fill="#d0732f"/><path d="M${i % 2 ? 3 : -3} -8 l${i % 2 ? 3 : -3} -8" stroke="#c99a72" stroke-width="2"/></g>`).join("")}`; break;
    case "raid": body = `${sky(true)}<rect y="46" width="160" height="18" fill="#17161a"/><path d="M0 34h160M0 44h160" stroke="#6a6f73"/>
      ${Array.from({ length: 16 }, (_, i) => `<line x1="${i * 10 + 5}" y1="30" x2="${i * 10 + 5}" y2="46" stroke="#5a5f63"/><circle cx="${i * 10 + 5}" cy="30" r="3" fill="none" stroke="#7a7f83"/>`).join("")}
      <path d="M120 0 L80 46 H160Z" fill="#fff4c0" opacity=".1"/>${[30, 46, 62].map(x => `<g transform="translate(${x} 58)"><circle cy="-10" r="2.6" fill="#181a16"/><path d="M-3 -7h6l1 7h-8z" fill="#2e3528"/></g>`).join("")}`; break;
    case "rescue": body = `<rect width="160" height="64" fill="#202224"/><rect y="46" width="160" height="18" fill="#141516"/><rect x="40" y="10" width="80" height="36" fill="#2a2d30"/><rect x="72" y="26" width="16" height="20" fill="#0d0e0f"/>
      <circle cx="100" cy="8" r="3" fill="#d75b47"/><path d="M100 11 v35" stroke="#d75b47" stroke-opacity=".4"/><rect width="160" height="64" fill="#d75b47" opacity=".08"/>`; break;
    case "emergency": body = `<rect width="160" height="64" fill="#24221f"/><rect y="46" width="160" height="18" fill="#171512"/><rect x="20" y="14" width="120" height="32" fill="#2e2b26"/>
      ${[30, 60, 90, 120].map(x => `<rect x="${x}" y="20" width="12" height="8" fill="#121110"/>`).join("")}<rect x="20" y="40" width="120" height="3" fill="url(#hz)"/>
      <path d="M70 14 q6 -14 0 -14 q10 0 10 14" fill="#555" opacity=".4"/><circle cx="80" cy="6" r="3" fill="#d9a441" class="blinkdot"/>`; break;
    default: body = `${sky()}${ground}`;
  }
  // grain, a vignette and a white border: a print from the field camera
  return `<svg class="scene" viewBox="0 0 160 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}
    <rect width="160" height="64" fill="#a07a40" opacity=".12" style="mix-blend-mode:color"/>
    <rect width="160" height="64" fill="url(#vig)"/></svg>`;
}

/** An anomaly's file photograph: the figure in its cell or on a measuring wall, with a paper clip. */
export function dossierPhoto(id: string) {
  return `<svg class="dossier" viewBox="0 0 80 96" aria-hidden="true">
    <rect x="3" y="5" width="74" height="88" fill="#e9e2cd" transform="rotate(-2 40 48)"/>
    <g transform="rotate(-2 40 48)"><rect x="8" y="10" width="64" height="62" fill="#2e2a24"/>
    ${Array.from({ length: 6 }, (_, i) => `<line x1="8" y1="${16 + i * 10}" x2="12" y2="${16 + i * 10}" stroke="#a69c84" stroke-width=".8"/>`).join("")}
    ${anomalyFigure(id, 40, 66, 1.35)}
    <rect x="8" y="10" width="64" height="62" fill="#a07a40" opacity=".18"/>
    <text x="40" y="84" font-size="8" text-anchor="middle" fill="#3a2e1e" font-family="Special Elite,IBM Plex Mono,monospace">SCP-${id}</text></g>
    <path d="M58 1v14a3 3 0 0 0 6 0V4a2 2 0 0 0-4 0v10" fill="none" stroke="#8a8f94" stroke-width="1.4"/>
  </svg>`;
}


/** Equipment drawn side-on, 64 × 28, for the personnel file's slots. */
export function gearArt(key: string) {
  const G = "#26282b", W = "#6b4a2a", M = "#4b555e", O = "#5b6045";
  const gun = (len: number, o: { stock?: boolean; scope?: boolean; drum?: boolean; pump?: boolean; mag?: boolean; bipod?: boolean } = {}) => {
    const x0 = 32 - len / 2;
    return `${o.stock ? `<path d="M${x0} 13 l10 -1 v6 l-9 4 h-2z" fill="${W}"/>` : `<path d="M${x0 + 4} 13 h6 v4 l-4 6 h-3z" fill="${G}"/>`}
      <rect x="${x0 + 9}" y="11" width="${len - 9}" height="4" fill="${G}"/><rect x="${x0 + 12}" y="15" width="${len * 0.35}" height="2.5" fill="${o.stock ? W : G}"/>
      <path d="M${x0 + 16} 15 l-1 6 h3 l1 -6z" fill="${G}"/>
      ${o.mag ? `<path d="M${x0 + 20} 15 h3 l1 7 h-3z" fill="${G}"/>` : ""}${o.drum ? `<circle cx="${x0 + 24}" cy="20" r="4" fill="${G}"/>` : ""}
      ${o.scope ? `<rect x="${x0 + 14}" y="7" width="12" height="3" rx="1" fill="${M}"/><rect x="${x0 + 17}" y="10" width="1.5" height="1.5" fill="${M}"/><rect x="${x0 + 22}" y="10" width="1.5" height="1.5" fill="${M}"/>` : ""}
      ${o.pump ? `<rect x="${x0 + len * 0.55}" y="15" width="8" height="3" fill="${W}"/>` : ""}
      ${o.bipod ? `<path d="M${x0 + len - 6} 15 l-3 8 M${x0 + len - 6} 15 l3 8" stroke="${G}" stroke-width="1.2"/>` : ""}`;
  };
  const vest = (c: string, plates = false) => `<path d="M24 4 h5 l3 3 3 -3 h5 v20 h-16z" fill="${c}"/>${plates ? `<rect x="26" y="9" width="12" height="5" fill="#3a3f45"/><rect x="26" y="16" width="12" height="5" fill="#3a3f45"/>` : `<path d="M26 10h12M26 14h12M26 18h12" stroke="#000" stroke-opacity=".25"/>`}`;
  const suit = (c: string, mask: string) => `<circle cx="32" cy="6" r="4" fill="${mask}"/><rect x="29" y="6" width="6" height="2" fill="#7fa6b8" opacity=".7"/><path d="M25 10h14l2 14h-18z" fill="${c}"/>`;
  const can = (c: string, band: string) => `<rect x="27" y="6" width="10" height="18" rx="2" fill="${c}"/><rect x="27" y="11" width="10" height="3" fill="${band}"/><rect x="30" y="3" width="4" height="3" fill="${M}"/><path d="M34 4 l5 -2" stroke="${M}" stroke-width="1.4"/>`;
  const body: Record<string, string> = {
    rifle: gun(50, { stock: true }), marksman: gun(54, { stock: true, scope: true }), shotgun: gun(44, { stock: true, pump: true }), mg: gun(54, { stock: true, mag: true, bipod: true }),
    carbine: gun(40, { stock: true, mag: true }), smg: gun(32, { mag: true }), pistol: `<path d="M24 10 h18 v4 h-12 l-2 8 h-4 l1 -8 h-1z" fill="${G}"/>`,
    uniform: `<path d="M24 5 l4 -2 h8 l4 2 4 8 -4 2 -2 -4 v14 h-12 v-14 l-2 4 -4 -2z" fill="${O}"/><path d="M32 4v20" stroke="#000" stroke-opacity=".25"/>`,
    armor: vest("#4c5238"), armor_light: vest("#5e6249"), armor_heavy: vest("#3d4239", true), hazmat: suit("#b8a64a", "#9a8a3a"), leadsuit: suit("#6c7076", "#55595e"), contsuit: suit("#c9c6b8", "#a9a698"),
    attachment: `<rect x="18" y="10" width="28" height="7" rx="3" fill="${M}"/><circle cx="18" cy="13.5" r="4" fill="#7fa6b8" stroke="${G}"/><rect x="26" y="17" width="3" height="4" fill="${M}"/><rect x="36" y="17" width="3" height="4" fill="${M}"/>`,
    ammo: [22, 28, 34, 40].map(x => `<rect x="${x}" y="10" width="4" height="12" fill="#b8954a"/><path d="M${x} 10 q2 -6 4 0z" fill="#8a6a3a"/>`).join(""),
    frag: `<ellipse cx="32" cy="16" rx="7" ry="8" fill="${O}"/><path d="M25 13h14M25 19h14M30 8v16M34 8v16" stroke="#000" stroke-opacity=".3"/><rect x="29" y="5" width="6" height="4" fill="${M}"/><circle cx="38" cy="6" r="2.5" fill="none" stroke="${M}"/>`,
    flashbang: can("#5d6670", "#d8d8d0"), smoke: can("#6b6f73", "#e8e8e8"), csgas: can("#5b6045", "#d9a441"), incendiary: can("#7a3b1e", "#d9a441"),
    flare: `<rect x="20" y="12" width="26" height="6" rx="2" fill="#b8463b"/><rect x="44" y="12" width="4" height="6" fill="#e8c878"/><path d="M48 15 l6 -3 -2 3 2 3z" fill="#f0a050"/>`,
    eyedrops: `<path d="M30 8 h4 v4 l2 3 v8 h-8 v-8 l2 -3z" fill="#7fa6b8" opacity=".85"/><rect x="31" y="4" width="2" height="4" fill="${G}"/>`,
    tracker: `<rect x="22" y="6" width="20" height="18" rx="2" fill="${M}"/><circle cx="32" cy="15" r="6" fill="#14281c"/><path d="M32 15 l4 -4" stroke="#7fd08a"/><circle cx="34" cy="12" r="1" fill="#7fd08a"/>`,
    medkit: `<rect x="20" y="8" width="24" height="16" rx="2" fill="#d8d8d0"/><path d="M30 11h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#c0503f"/><path d="M28 8v-3h8v3" stroke="${M}" fill="none" stroke-width="1.5"/>`,
    camera: `<rect x="20" y="9" width="24" height="14" rx="2" fill="${G}"/><circle cx="32" cy="16" r="5" fill="${M}"/><circle cx="32" cy="16" r="2.5" fill="#7fa6b8"/><rect x="38" y="6" width="5" height="3" fill="${G}"/>`,
    restraints: `<circle cx="26" cy="16" r="5" fill="none" stroke="#9aa4ad" stroke-width="2.4"/><circle cx="38" cy="16" r="5" fill="none" stroke="#9aa4ad" stroke-width="2.4"/><path d="M31 16h2" stroke="#9aa4ad" stroke-width="2"/>`,
    darts: `<path d="M18 15 h22" stroke="#9aa4ad" stroke-width="2"/><path d="M40 15 l6 -3 v6z" fill="#c0503f"/><path d="M18 12 l-4 3 4 3z" fill="#d8bf86"/>`,
    bazooka: `<rect x="10" y="11" width="46" height="6" rx="3" fill="${O}"/><rect x="26" y="17" width="3" height="6" fill="${G}"/><rect x="34" y="17" width="3" height="5" fill="${G}"/>`,
    law: `<rect x="12" y="11" width="40" height="5" rx="2" fill="#5e6249"/><rect x="24" y="16" width="3" height="5" fill="${G}"/>`,
    flamer: `<rect x="14" y="12" width="34" height="4" fill="${G}"/><rect x="46" y="11" width="6" height="6" fill="${M}"/><circle cx="20" cy="20" r="5" fill="#7a3b1e"/><circle cx="30" cy="20" r="5" fill="#7a3b1e"/>`,
    ward: `<circle cx="32" cy="15" r="8" fill="none" stroke="#b98bd3" stroke-width="1.6"/><path d="M32 7 v16 M24 15 h16" stroke="#b98bd3"/><circle cx="32" cy="15" r="2.5" fill="#b98bd3"/>`,
    empty: `<rect x="20" y="6" width="24" height="18" rx="3" fill="none" stroke="#4a5561" stroke-dasharray="3 3"/>`,
  };
  return `<svg class="gear" viewBox="0 0 64 28" aria-hidden="true">${body[key] ?? body.empty}</svg>`;
}

/** An icon's drawing alone, to nest inside another SVG (the World Map's markers). */
export const iconBody = (name: string) => ICONS[name] ?? "";
