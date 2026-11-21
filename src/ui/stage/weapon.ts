// Weapons in side profile, muzzle to the right, in a 400 × 120 frame with the bore at y 48. One drawing serves the
// armory bench (large, with clickable hardpoints) and the soldier figure (small, in their hands). Fitted attachments
// are drawn at the hardpoint they mount on, and a weapon tier refit changes the finish, so loadout changes show.
// A file at art/weapon/<model id> replaces the drawn weapon; attachments keep drawing over it at the hardpoints.
import type { AttachmentId, WeaponType } from "../../data/weapons";
import { asset } from "./assets";

type Stock = "rifle" | "short" | "poly" | "wire" | "tube" | "plain";
type Mag = "none" | "box" | "curved" | "tube" | "stick" | "belt";
interface Profile {
  butt: number; rx: [number, number]; muz: number;
  stock: Stock; wood?: [number, number]; guard?: [number, number]; guardPoly?: boolean;
  grip?: number; trig: number; mag: Mag; magX?: number; magW?: number; magH?: number;
  tags?: ("pump" | "bipod" | "carry" | "flash" | "shield" | "bolt" | "jacket" | "band" | "moderator" | "prong" | "irons")[];
  bore?: number;   // barrel thickness
}
const PROFILES: Record<string, Profile> = {
  m1_garand:  { butt: 8, rx: [150, 236], muz: 394, stock: "rifle", wood: [8, 300], guard: [236, 300], trig: 168, mag: "none", tags: ["band", "irons"] },
  m14:        { butt: 8, rx: [150, 236], muz: 392, stock: "rifle", wood: [8, 296], guard: [236, 296], trig: 166, mag: "box", magX: 182, magW: 24, magH: 30, tags: ["flash", "irons"] },
  m16:        { butt: 8, rx: [138, 226], muz: 382, stock: "poly", guard: [226, 318], guardPoly: true, grip: 168, trig: 158, mag: "box", magX: 188, magW: 22, magH: 34, tags: ["carry", "prong"] },
  m1903a4:    { butt: 8, rx: [150, 230], muz: 396, stock: "rifle", wood: [8, 310], guard: [244, 310], trig: 172, mag: "none", tags: ["bolt", "band"] },
  m21:        { butt: 8, rx: [150, 236], muz: 396, stock: "rifle", wood: [8, 300], guard: [236, 300], trig: 166, mag: "box", magX: 182, magW: 24, magH: 26, tags: ["irons"], bore: 6 },
  m1897:      { butt: 10, rx: [140, 202], muz: 346, stock: "short", wood: [10, 140], trig: 160, mag: "tube", tags: ["pump", "shield"], bore: 7 },
  r870:       { butt: 10, rx: [140, 206], muz: 352, stock: "short", wood: [10, 140], trig: 162, mag: "tube", tags: ["pump"], bore: 7 },
  bar:        { butt: 8, rx: [128, 244], muz: 394, stock: "rifle", wood: [8, 128], guard: [244, 292], trig: 150, mag: "box", magX: 178, magW: 26, magH: 32, tags: ["bipod", "flash"], bore: 6 },
  m60:        { butt: 10, rx: [118, 236], muz: 394, stock: "plain", grip: 160, trig: 150, mag: "belt", magX: 190, tags: ["bipod", "carry", "flash"], bore: 7 },
  m2_carbine: { butt: 30, rx: [152, 212], muz: 332, stock: "rifle", wood: [30, 236], guard: [212, 236], trig: 166, mag: "curved", magX: 176, magW: 18, magH: 36, tags: ["band", "irons"] },
  xm177:      { butt: 40, rx: [138, 226], muz: 342, stock: "tube", guard: [226, 284], guardPoly: true, grip: 168, trig: 158, mag: "box", magX: 188, magW: 22, magH: 30, tags: ["carry", "moderator"] },
  m3:         { butt: 30, rx: [118, 232], muz: 274, stock: "wire", grip: 196, trig: 186, mag: "stick", magX: 150, magW: 14, magH: 48, tags: [] },
  m45:        { butt: 30, rx: [118, 262], muz: 290, stock: "tube", grip: 196, trig: 186, mag: "stick", magX: 156, magW: 16, magH: 50, tags: ["jacket"] },
};
const FALLBACK: Record<WeaponType, string> = { rifle: "m1_garand", marksman: "m1903a4", shotgun: "m1897", mg: "bar", carbine: "m2_carbine", smg: "m3" };
export const profileOf = (modelId: string, type: WeaponType) => PROFILES[modelId] ?? PROFILES[FALLBACK[type]];

export type Hardpoint = "optic" | "muzzle" | "mag" | "trigger" | "butt";
export const HARDPOINT_OF: Record<AttachmentId, Hardpoint> = { scope: "optic", sights: "optic", suppressor: "muzzle", bayonet: "muzzle", extmag: "mag", trigger: "trigger", stock: "butt" };
export const HARDPOINT_NAMES: Record<Hardpoint, string> = { optic: "Sight rail", muzzle: "Muzzle", mag: "Magazine well", trigger: "Trigger group", butt: "Butt" };

/** Hardpoints measured on the photographs in art/weapon (prepared by scripts/prep-weapon-art.py), where they
 *  differ from the drawn profile's. Only used when that model's photo is present. */
const PHOTO_HP: Record<string, Partial<Record<Hardpoint, [number, number]>>> = {};

/** Where each hardpoint sits in the 400 × 120 frame. */
export function hardpoints(modelId: string, type: WeaponType): Record<Hardpoint, [number, number]> {
  const p = profileOf(modelId, type), B = 48;
  const fix = asset(`weapon/${modelId}`) ? PHOTO_HP[modelId] ?? {} : {};
  return {
    ...{
    optic: [(p.rx[0] + p.rx[1]) / 2, B - 16],
    muzzle: [p.muz - 6, B],
    mag: [p.magX ?? (p.rx[0] + 30), B + 26],
    trigger: [p.trig, B + 16],
    butt: [p.butt + 12, B + 12],
    }, ...fix,
  };
}

let uid = 0;
export interface WeaponDraw { attachment?: AttachmentId; tier?: number; ammo?: string; }
/** The weapon's drawing as SVG children of the 400 × 120 frame (so it can be nested in the figure). */
export function weaponBody(modelId: string, type: WeaponType, o: WeaponDraw = {}) {
  const p = profileOf(modelId, type), B = 48, id = `w${++uid}`, tags = new Set(p.tags ?? []), a = o.attachment, tier = o.tier ?? 1;
  const bore = p.bore ?? 5;
  const metal = tier >= 2 ? `url(#${id}mf)` : `url(#${id}m)`;
  const defs = `<defs>
    <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6068"/><stop offset=".35" stop-color="#33383e"/><stop offset="1" stop-color="#1b1e22"/></linearGradient>
    <linearGradient id="${id}mf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55606e"/><stop offset=".35" stop-color="#262d36"/><stop offset="1" stop-color="#11151a"/></linearGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5f37"/><stop offset=".45" stop-color="#6a4426"/><stop offset="1" stop-color="#3f2715"/></linearGradient>
    <linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d40"/><stop offset="1" stop-color="#141618"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa8b4"/><stop offset=".5" stop-color="#4b5660"/><stop offset="1" stop-color="#262c33"/></linearGradient>
  </defs>`;
  const W = `url(#${id}w)`, P = `url(#${id}p)`, G = `url(#${id}g)`;
  const parts: string[] = [];
  // stock
  const rx0 = p.rx[0];
  switch (p.stock) {
    case "rifle": {
      const end = p.wood ? p.wood[1] : rx0;
      parts.push(`<path d="M${p.butt} ${B - 8} L${rx0 - 40} ${B - 3} L${end} ${B - 2} L${end} ${B + 9} L${p.trig + 24} ${B + 10} Q${p.trig + 4} ${B + 12} ${p.trig - 14} ${B + 20} L${rx0 - 40} ${B + 18} Q${(p.butt + rx0) / 2} ${B + 22} ${p.butt + 4} ${B + 30} L${p.butt} ${B + 30} Z" fill="${W}" stroke="#2a1a0e" stroke-width="1"/>`);
      parts.push(`<path d="M${p.butt + 20} ${B + 2} Q${(p.butt + rx0) / 2} ${B - 1} ${rx0 - 30} ${B + 4} M${p.butt + 30} ${B + 12} Q${(p.butt + rx0) / 2} ${B + 8} ${rx0 - 40} ${B + 12}" stroke="#2a1a0e" stroke-width=".7" fill="none" opacity=".55"/>`);
      if (p.guard) parts.push(`<rect x="${p.guard[0]}" y="${B - 8}" width="${p.guard[1] - p.guard[0]}" height="7" rx="2" fill="${W}" stroke="#2a1a0e" stroke-width=".8"/>`);
      break;
    }
    case "short":
      parts.push(`<path d="M${p.butt} ${B - 6} L${rx0} ${B - 3} L${rx0} ${B + 8} Q${rx0 - 20} ${B + 10} ${rx0 - 38} ${B + 18} Q${(p.butt + rx0) / 2} ${B + 20} ${p.butt + 4} ${B + 28} L${p.butt} ${B + 28} Z" fill="${W}" stroke="#2a1a0e" stroke-width="1"/>`);
      break;
    case "poly":
      parts.push(`<path d="M${p.butt} ${B - 7} L${rx0} ${B - 4} L${rx0} ${B + 8} L${p.butt + 30} ${B + 26} L${p.butt} ${B + 28} Z" fill="${P}" stroke="#090a0b" stroke-width="1"/>`);
      break;
    case "plain":
      parts.push(`<path d="M${p.butt} ${B - 8} L${rx0} ${B - 5} L${rx0} ${B + 8} L${p.butt + 20} ${B + 22} L${p.butt} ${B + 22} Z" fill="${P}" stroke="#090a0b" stroke-width="1"/>`);
      break;
    case "wire":
      parts.push(`<path d="M${p.butt} ${B - 4} L${rx0} ${B - 2} M${p.butt + 4} ${B + 18} L${rx0} ${B + 6} M${p.butt} ${B - 6} L${p.butt + 4} ${B + 20}" stroke="${metal}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
      break;
    case "tube":
      parts.push(`<rect x="${p.butt + 30}" y="${B - 4}" width="${rx0 - p.butt - 30}" height="7" fill="${metal}"/><path d="M${p.butt} ${B - 8} h32 v26 h-28 Z" fill="${P}" stroke="#090a0b" stroke-width="1"/>`);
      break;
  }
  // barrel, receiver, lower furniture
  const rw = p.rx[1] - rx0;
  parts.push(`<rect x="${p.rx[1] - 4}" y="${B - bore / 2}" width="${p.muz - p.rx[1] + 4}" height="${bore}" fill="${metal}"/>`);
  if (p.mag === "tube") parts.push(`<rect x="${p.rx[1] - 2}" y="${B + bore / 2 + 1}" width="${(p.muz - p.rx[1]) * 0.82}" height="${bore - 1}" fill="${metal}" opacity=".9"/>`);
  if (p.stock === "rifle" && p.wood && p.wood[1] > p.rx[1]) parts.push(`<path d="M${p.rx[1]} ${B + 2} L${p.wood[1]} ${B + 2} L${p.wood[1]} ${B + 9} L${p.rx[1]} ${B + 10} Z" fill="${W}" stroke="#2a1a0e" stroke-width=".8"/>`);
  parts.push(`<path d="M${rx0} ${B - 10} L${p.rx[1]} ${B - 8} L${p.rx[1]} ${B + 7} L${rx0} ${B + 9} Z" fill="${metal}" stroke="#0d0f11" stroke-width="1"/>`);
  parts.push(`<path d="M${rx0 + 4} ${B - 8} L${p.rx[1] - 4} ${B - 6.5}" stroke="#8d969e" stroke-width="1" opacity=".55"/>`);
  if (p.guard && p.guardPoly) parts.push(`<path d="M${p.guard[0]} ${B - 9} L${p.guard[1]} ${B - 7} L${p.guard[1]} ${B + 7} L${p.guard[0]} ${B + 9} Z" fill="${P}" stroke="#090a0b" stroke-width="1"/>${Array.from({ length: Math.floor((p.guard[1] - p.guard[0]) / 12) }, (_, i) => `<rect x="${p.guard![0] + 6 + i * 12}" y="${B - 5}" width="5" height="8" rx="2" fill="#0a0b0c"/>`).join("")}`);
  if (tags.has("jacket")) parts.push(`<rect x="${p.rx[1] - 70}" y="${B - 9}" width="70" height="18" rx="3" fill="${metal}" stroke="#0d0f11"/>${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${p.rx[1] - 62 + i * 11}" cy="${B}" rx="3" ry="5" fill="#0b0c0d"/>`).join("")}`);
  if (tags.has("shield")) parts.push(`<rect x="${p.rx[1] + 6}" y="${B - bore / 2 - 4}" width="${(p.muz - p.rx[1]) * 0.6}" height="${bore + 4}" fill="none" stroke="${metal}" stroke-width="2"/>${Array.from({ length: 7 }, (_, i) => `<circle cx="${p.rx[1] + 14 + i * 12}" cy="${B - 1}" r="2" fill="#0b0c0d"/>`).join("")}`);
  if (tags.has("pump")) parts.push(`<rect x="${p.rx[1] + 26}" y="${B + bore / 2}" width="60" height="11" rx="3" fill="${W}" stroke="#2a1a0e"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${p.rx[1] + 32 + i * 9} ${B + bore / 2 + 2} v7" stroke="#2a1a0e" stroke-width="1.2"/>`).join("")}`);
  if (tags.has("band")) parts.push(`<rect x="${(p.guard?.[1] ?? p.rx[1] + 40) - 8}" y="${B - 9}" width="6" height="19" fill="${metal}"/>`);
  if (tags.has("bolt")) parts.push(`<path d="M${p.rx[0] + 30} ${B - 4} q4 8 -2 18" stroke="${metal}" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="${p.rx[0] + 28}" cy="${B + 15}" r="4" fill="${metal}"/>`);
  if (tags.has("carry")) parts.push(`<path d="M${rx0 + 14} ${B - 10} L${rx0 + 20} ${B - 22} L${p.rx[1] - 10} ${B - 22} L${p.rx[1] - 4} ${B - 9}" fill="none" stroke="${P}" stroke-width="5" stroke-linejoin="round"/>`);
  if (tags.has("flash")) parts.push(`<path d="M${p.muz - 18} ${B - bore / 2 - 1} L${p.muz} ${B - bore / 2 - 2.5} L${p.muz} ${B + bore / 2 + 2.5} L${p.muz - 18} ${B + bore / 2 + 1} Z" fill="${metal}"/>`);
  if (tags.has("prong")) parts.push(`<path d="M${p.muz - 14} ${B - 3} L${p.muz} ${B - 4} M${p.muz - 14} ${B + 3} L${p.muz} ${B + 4}" stroke="${metal}" stroke-width="2.5"/>`);
  if (tags.has("moderator")) parts.push(`<rect x="${p.muz - 40}" y="${B - 5}" width="40" height="10" rx="2" fill="${metal}"/>`);
  if (tags.has("irons") && a !== "sights") parts.push(`<path d="M${p.rx[1] - 14} ${B - 9} v-7 h6 v7" fill="${metal}"/><path d="M${p.muz - 8} ${B - bore / 2} v-8 h3 v8" fill="${metal}"/>`);
  if (tier >= 3) parts.push(Array.from({ length: Math.floor((p.muz - p.rx[1] - 30) / 9) }, (_, i) => `<rect x="${p.rx[1] + 10 + i * 9}" y="${B - bore / 2 - 2}" width="4" height="${bore + 4}" rx="1" fill="#b8733a" stroke="#5a3218" stroke-width=".6"/>`).join(""));
  if (tier === 2) parts.push(`<rect x="${rx0 + 8}" y="${B - 2}" width="${Math.min(40, rw - 16)}" height="5" fill="#c8b48a" opacity=".85"/><text x="${rx0 + 10}" y="${B + 2.3}" font-size="4.5" fill="#1b1e22" font-family="monospace" font-weight="700">SCP-F</text>`);
  // magazine
  const mx = p.magX ?? 0, mw = p.magW ?? 20, mh = (p.magH ?? 30) * (a === "extmag" ? 1.45 : 1);
  if (p.mag === "box") parts.push(`<path d="M${mx - mw / 2} ${B + 8} h${mw} l${2} ${mh} h${-mw} Z" fill="${metal}" stroke="#0d0f11"/><path d="M${mx - mw / 2 + 3} ${B + 14} h${mw - 6}" stroke="#8d969e" stroke-width=".8" opacity=".4"/>`);
  if (p.mag === "curved") parts.push(`<path d="M${mx - mw / 2} ${B + 8} h${mw} q6 ${mh * 0.6} 14 ${mh} h${-mw} q-8 ${-mh * 0.4} -14 ${-mh} Z" fill="${metal}" stroke="#0d0f11"/>`);
  if (p.mag === "stick") parts.push(`<path d="M${mx - mw / 2} ${B + 8} h${mw} v${mh} h${-mw} Z" fill="${metal}" stroke="#0d0f11"/><rect x="${mx - mw / 2 - 3}" y="${B + 6}" width="${mw + 6}" height="8" fill="${metal}"/>`);
  if (p.mag === "belt") parts.push(`<rect x="${mx - 26}" y="${B + 10}" width="44" height="${a === "extmag" ? 46 : 32}" rx="3" fill="#4d5338" stroke="#1d2016"/><path d="M${mx - 20} ${B + 16} h32" stroke="#2a2d20" stroke-width="2"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${mx + 18}" y="${B + 4 + i * 5}" width="7" height="3" fill="#b8954a"/>`).join("")}`);
  // trigger guard and grip
  parts.push(`<path d="M${p.trig - 12} ${B + 8} q0 12 12 12 q10 0 12 -10" fill="none" stroke="${metal}" stroke-width="2.4"/>`);
  parts.push(`<path d="M${p.trig + 2} ${B + 8} q-2 6 -6 8" stroke="${a === "trigger" ? "#d2b25c" : "#15181b"}" stroke-width="2.4" fill="none"/>`);
  if (p.grip) parts.push(`<path d="M${p.grip - 8} ${B + 7} L${p.grip + 6} ${B + 7} L${p.grip + 2} ${B + 32} L${p.grip - 12} ${B + 30} Z" fill="${p.stock === "wire" || p.stock === "tube" ? metal : P}" stroke="#090a0b"/>`);
  if (tags.has("bipod")) parts.push(`<path d="M${p.muz - 40} ${B + 3} l-14 38 M${p.muz - 40} ${B + 3} l10 38" stroke="${metal}" stroke-width="2.6" stroke-linecap="round"/><rect x="${p.muz - 44}" y="${B + 1}" width="8" height="6" fill="${metal}"/>`);

  // attachments, each at its hardpoint
  const att: string[] = [];
  const hp = hardpoints(modelId, type);
  const attArt = a && asset(`attachment/${a}`);
  if (a && attArt) { const [x, y] = hp[HARDPOINT_OF[a]]; att.push(`<image href="${attArt}" x="${x - 50}" y="${y - 25}" width="100" height="50"/>`); }
  else if (a === "scope") { const [x] = hp.optic; att.push(`<rect x="${x - 6}" y="${B - 20}" width="5" height="10" fill="${metal}"/><rect x="${x + 22}" y="${B - 20}" width="5" height="10" fill="${metal}"/><path d="M${x - 48} ${B - 30} l10 3 h56 l10 -4 v14 l-10 -4 h-56 l-10 3 Z" fill="${G}" stroke="#0d0f11"/><rect x="${x + 4}" y="${B - 33}" width="7" height="6" rx="1" fill="${G}"/><ellipse cx="${x + 28}" cy="${B - 23}" rx="1.6" ry="6" fill="#9fc2cf" opacity=".7"/>`); }
  else if (a === "sights") { const [x] = hp.optic; att.push(`<path d="M${p.rx[1] - 22} ${B - 9} v-12 h14 v12" fill="${metal}"/><circle cx="${p.rx[1] - 15}" cy="${B - 17}" r="3" fill="#0b0c0d" stroke="#d2b25c" stroke-width=".8"/><path d="M${p.muz - 14} ${B - bore / 2} v-14 h10 v14 M${p.muz - 9} ${B - bore / 2 - 12} v8" fill="none" stroke="${metal}" stroke-width="2"/><circle cx="${x}" cy="${B - 2}" r="0" />`); }
  else if (a === "suppressor") att.push(`<rect x="${p.muz - 4}" y="${B - 9}" width="62" height="18" rx="4" fill="${G}" stroke="#0d0f11"/><path d="M${p.muz + 6} ${B - 9} v18 M${p.muz + 46} ${B - 9} v18" stroke="#0d0f11" stroke-width="1"/>`);
  else if (a === "bayonet") att.push(`<rect x="${p.muz - 20}" y="${B + 3}" width="18" height="7" fill="${metal}"/><path d="M${p.muz - 2} ${B + 4} L${p.muz + 64} ${B + 6} L${p.muz - 2} ${B + 10} Z" fill="#c4ccd2" stroke="#4b5660" stroke-width=".8"/><path d="M${p.muz} ${B + 6.5} L${p.muz + 50} ${B + 6.6}" stroke="#7d8890" stroke-width=".7"/>`);
  else if (a === "stock") att.push(`<rect x="${p.butt - 7}" y="${B - 9}" width="9" height="${p.stock === "wire" ? 30 : 40}" rx="3" fill="#2b2420" stroke="#0d0b09"/>${[0, 1, 2, 3].map(i => `<path d="M${p.butt - 6} ${B - 4 + i * 9} h7" stroke="#4a3a30" stroke-width="1"/>`).join("")}`);
  else if (a === "trigger") att.push(`<circle cx="${p.trig - 6}" cy="${B + 4}" r="2.2" fill="#d2b25c"/>`);

  const art = asset(`weapon/${modelId}`);
  if (art) {
    // a photograph: the refit and the extended magazine are marked over it, since they aren't in the picture
    const [mx, my] = hp.mag, [, oy] = hp.optic;
    if (a === "extmag") att.unshift(`<rect x="${mx - 9}" y="${my + 4}" width="18" height="16" rx="2" fill="#2a2e33" stroke="#0d0f11"/><path d="M${mx - 7} ${my + 9} h14" stroke="#8d969e" stroke-width=".8" opacity=".5"/>`);
    if (tier >= 3) att.unshift(Array.from({ length: Math.floor((p.muz - p.rx[1] - 30) / 9) }, (_, i) => `<rect x="${p.rx[1] + 10 + i * 9}" y="${oy + 11}" width="4" height="9" rx="1" fill="#b8733a" stroke="#5a3218" stroke-width=".6"/>`).join(""));
    if (tier === 2) att.unshift(`<rect x="${p.rx[0] + 8}" y="${oy + 14}" width="34" height="5" fill="#c8b48a" opacity=".9"/><text x="${p.rx[0] + 10}" y="${oy + 18.2}" font-size="4.5" fill="#1b1e22" font-family="monospace" font-weight="700">SCP-F</text>`);
  }
  const body = art ? `<image href="${art}" x="0" y="0" width="400" height="120" preserveAspectRatio="none"/>` : parts.join("");
  return `${defs}<g class="wpn-body">${body}</g><g class="wpn-att">${att.join("")}</g>`;
}

/** The weapon as a standalone SVG. */
export function weaponSvg(modelId: string, type: WeaponType, o: WeaponDraw & { cls?: string } = {}) {
  return `<svg class="weapon ${o.cls ?? ""}" viewBox="0 0 470 120" role="img" aria-label="Weapon" preserveAspectRatio="xMidYMid meet">${weaponBody(modelId, type, o)}</svg>`;
}
