// People, full-body, drawn as layers on one pivot (the feet, at 0,0) like a paper doll: shadow, boots, legs, the
// dress, web gear, body armour, the held weapon, arms and hands, neck and head, face, hair, headgear. Every layer
// reads plain data (an operative's Look, their uniform, armour and weapon), so what the player changes is what they
// see.
//
// UI/UX overhaul, visual pass: adult proportions (about seven and a half heads tall), forms shaded as volumes under
// one key light from the upper left (a cylinder shade across each limb, a falloff down the torso, contact shadow
// and ambient occlusion where parts meet), and 1951 US Army field kit drawn from its real parts: the M1 helmet with
// its net and chinstraps, the M-1950 field jacket's four pockets, the M1945 suspenders and pistol belt with ammo
// pouches and canteen, trousers bloused over buckle boots. Still code-drawn and provisional
// (docs/ART_DIRECTION.md): the layer order and the sockets are the contract a painted or 3D figure would keep.
//
// The figure is drawn front-on, 340 units tall at scale 1 (to the crown; headgear sits above). Sockets (where rigid
// items attach) are fixed points on that frame: SOCKETS below. A 3D renderer would map the same names to bones.
import { HAIR_COLORS, SKIN, type Look } from "../../data/looks";
import { FRAMES } from "../../data/mounts";
import { weaponSide } from "./weapons";

export type Dress = "fatigues" | "field" | "labcoat" | "coveralls" | "guard" | "dclass" | "officer" | "suit";
export type ArmorKind = "" | "armor" | "armor_light" | "armor_heavy" | "hazmat" | "leadsuit" | "contsuit";
export interface FigureSpec {
  look: Look;
  sex?: "m" | "f";
  dress: Dress;
  /** Body armour or a sealed suit over the dress. */
  armor?: ArmorKind;
  /** Vest generation (1 flak vest, 2 M69, 3 ceramic): changes the vest's cut and plates. */
  armorTier?: number;
  /** Headgear: a unit's [name, colour], an M1 helmet, a hard hat, or none. */
  headgear?: [string, string] | "helmet" | "hardhat" | "";
  /** A weapon model id held at port arms. */
  weapon?: string;
  /** The attachment fitted to it. */
  attachment?: string;
  /** Uniform research tier (padded jacket, liner, undersuit, harness): visible trim on the fatigues. */
  uniformTier?: number;
  pose?: "stand" | "work" | "rest";
  /** Rank stripes on the sleeve (0 to 5). */
  rank?: number;
  injured?: boolean;
}

/** Named attachment points on the 340-unit frame, origin at the feet. */
export const SOCKETS = { head: [0, -318], handR: [8, -208], handL: [-28, -274], chest: [0, -240], back: [0, -240] } as const;

const tone = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16), ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0"); return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`; };
const mix = (a: string, b: string, t: number) => { const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

const DRESS: Record<Dress, { coat: string; trousers: string; boots: string; trim?: string; long?: boolean }> = {
  fatigues: { coat: "#5b6342", trousers: "#565d3e", boots: "#2e2620" },
  field: { coat: "#6b6648", trousers: "#565d3e", boots: "#2e2620", trim: "#4c4a32" },
  officer: { coat: "#625c47", trousers: "#5d5745", boots: "#1d1a17", trim: "#c9a45c" },
  labcoat: { coat: "#dcd8cc", trousers: "#3d4148", boots: "#1d1a17", long: true },
  coveralls: { coat: "#4f5c68", trousers: "#4f5c68", boots: "#2b2520" },
  guard: { coat: "#4f5d6e", trousers: "#434f5e", boots: "#1d1a17", trim: "#c9a45c" },
  dclass: { coat: "#cf7330", trousers: "#c2692b", boots: "#3a3026" },
  suit: { coat: "#2f3237", trousers: "#2b2e33", boots: "#141414" },
};

/** Shared shading gradients. Identical in every figure, so repeating them is harmless; each figure carries its own
 *  so it can be drawn anywhere (rooms, the staging area, portraits) without a page-level <defs>. */
const DEFS = `<defs>
  <linearGradient id="fg-cyl" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".3" stop-color="#fff" stop-opacity=".06"/><stop offset=".62" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>
  <linearGradient id="fg-fall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
  <radialGradient id="fg-dome" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
  <radialGradient id="fg-shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <pattern id="fg-net" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V6 M0 0 H6" stroke="#2a2e1e" stroke-width=".9" opacity=".55"/></pattern>
</defs>`;

/** A shape in a flat colour, then shaded as a volume: across (cylinder) and, for big forms, down (falloff). */
const solid = (d: string, fill: string, down = false) => `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#fg-cyl)"/>${down ? `<path d="${d}" fill="url(#fg-fall)"/>` : ""}`;
/** A tapered limb segment from (x1,y1) to (x2,y2), half-widths w1 and w2, rounded at both ends. */
function limbPath(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const p = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  return `M${p(x1 + nx * w1, y1 + ny * w1)} L${p(x2 + nx * w2, y2 + ny * w2)} A${w2} ${w2} 0 0 0 ${p(x2 - nx * w2, y2 - ny * w2)} L${p(x1 - nx * w1, y1 - ny * w1)} A${w1} ${w1} 0 0 0 ${p(x1 + nx * w1, y1 + ny * w1)}Z`;
}
const limb = (x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, fill: string) => solid(limbPath(x1, y1, w1, x2, y2, w2), fill);

/** One person at (x, y) feet position, scaled. `face` −1 turns them to the left (mirrored). */
export function figureSvg(s: FigureSpec, x: number, y: number, scale = 1, face: 1 | -1 = 1, cls = "") {
  const skin = SKIN[s.look.skin] ?? SKIN[1], hair = HAIR_COLORS[s.look.hairColor] ?? HAIR_COLORS[0];
  const d = DRESS[s.dress], female = s.sex === "f", sealed = s.armor === "hazmat" || s.armor === "leadsuit" || s.armor === "contsuit";
  const coat = sealed ? suitColor(s.armor) : d.coat, coatDk = tone(coat, 0.74), coatLt = tone(coat, 1.14);
  const trousers = sealed ? suitColor(s.armor) : d.trousers;
  const military = !sealed && (s.dress === "fatigues" || s.dress === "field");
  const L: string[] = [DEFS];
  // ---- contact shadow ----
  L.push(`<ellipse cx="0" cy="1" rx="66" ry="11" fill="url(#fg-shadow)"/>`);
  // ---- legs: hip to knee to ankle, each leg its own volume ----
  const st = s.pose === "rest" ? 16 : 20, hipW = female ? 35 : 33, sh = female ? 41 : 46;
  for (const side of [-1, 1]) {
    const hx = side * 16, kx = side * (st - 2), ax = side * st;
    L.push(limb(hx, -166, 19, kx, -90, 14, trousers));
    L.push(limb(kx, -90, 14, ax, -30, 11.5, tone(trousers, 0.96)));
    // knee crease and the blousing over the boot top
    L.push(`<path d="M${kx - 10} -92 q10 6 20 0" stroke="${tone(trousers, 0.7)}" stroke-width="2" fill="none" opacity=".7"/>`);
    if (military || s.dress === "guard") L.push(solid(`M${ax - 15} -42 Q${ax - 17} -28 ${ax - 13} -24 L${ax + 13} -24 Q${ax + 17} -28 ${ax + 15} -42 Q${ax} -48 ${ax - 15} -42Z`, tone(trousers, 0.92)));
    // the boot: shaft, buckle strap for 1951 combat boots, toe cap, sole
    const bt = d.boots;
    L.push(solid(`M${ax - 12} -28 L${ax - 13} -6 Q${ax - 15} 0 ${ax - 6} 1 L${ax + 9} 1 Q${ax + 17} 0 ${ax + 13} -8 L${ax + 12} -28Z`, bt));
    if (military) L.push(`<rect x="${ax - 13}" y="-22" width="26" height="5" fill="${tone(bt, 0.7)}"/><rect x="${ax + 6}" y="-23" width="5" height="7" fill="#8a8370"/>`);
    L.push(`<path d="M${ax - 14} -1 H${ax + 15}" stroke="#0f0d0b" stroke-width="3"/><ellipse cx="${ax + 2}" cy="-7" rx="7" ry="3" fill="#fff" opacity=".1"/>`);
  }
  // the crotch shadow between the legs
  L.push(`<path d="M-3 -156 L3 -156 L4 -118 L-4 -118Z" fill="#000" opacity=".22"/>`);
  // ---- torso ----
  const waist = female ? 27 : 31, hem = d.long ? -64 : military ? -150 : -158;
  const torso = `M${-sh + 2} -276 Q${-sh - 2} -232 ${-waist - 2} -192 L${-hipW - 2} ${hem} L${hipW + 2} ${hem} L${waist + 2} -192 Q${sh + 2} -232 ${sh - 2} -276 Q${sh - 14} -284 14 -286 L-14 -286 Q${-sh + 14} -284 ${-sh + 2} -276Z`;
  L.push(solid(torso, coat, true));
  if (d.long && !sealed) L.push(`<path d="M0 -240 L0 ${hem}" stroke="${coatDk}" stroke-width="2"/><path d="M-${hipW + 2} ${hem} H${hipW + 2}" stroke="${coatDk}" stroke-width="3"/>`);
  if (!sealed) L.push(dressDetail(s, d, coat, coatDk, coatLt, waist, hipW, hem, female));
  if (sealed) L.push(suitDetail(s.armor!, sh));
  // ---- body armour, then the web gear over it: M1945 suspenders, pistol belt, pouches, canteen, first aid ----
  if (s.armor && !sealed) L.push(vest(s.armor, s.armorTier ?? 1, sh, waist));
  if (military && s.weapon) L.push(webGear(waist, sh, female));
  // ---- the weapon at port arms, then the arms and hands over it ----
  const sleeve = coat;
  const handR: [number, number] = [8, -208], handL: [number, number] = [-28, -274];
  if (s.weapon) {
    const f = FRAMES[s.weapon] ?? FRAMES.m1_garand, k = 0.235, ang = -118, rad = ang * Math.PI / 180;
    const ux = Math.cos(rad), uy = Math.sin(rad);
    // place the frame so its grip sits in the right hand, then put the left hand on the fore-end
    const gripAt = f.grip + 18, foreAt = Math.min(f.muzzle - 40, Math.max(f.rx[1] + 40, (f.rx[1] + f.muzzle) / 2 - 30));
    const bx = handR[0] - ux * gripAt * k, by = handR[1] - uy * gripAt * k;
    handL[0] = bx + ux * foreAt * k; handL[1] = by + uy * foreAt * k;
    L.push(`<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${ang}) scale(${k} ${-k})">${weaponSide(s.weapon, s.attachment)}</g>`);
    // right arm: out to the elbow and back in to the grip; left arm: down to the elbow and up to the fore-end
    L.push(limb(sh - 2, -270, 13, sh + 8, -214, 11, sleeve));
    L.push(limb(sh + 8, -214, 11, handR[0] + 6, handR[1] + 2, 9, tone(sleeve, 0.95)));
    L.push(limb(-sh + 2, -270, 13, -sh - 8, -216, 11, sleeve));
    L.push(limb(-sh - 8, -216, 11, handL[0] - 4, handL[1] + 4, 9, tone(sleeve, 0.97)));
    L.push(hand(handR[0], handR[1], sealed ? "#2c2c2a" : skin), hand(handL[0], handL[1], sealed ? "#2c2c2a" : skin));
  } else {
    const work = s.pose === "work";
    L.push(limb(-sh + 2, -270, 13, -sh - 4, -212, 11, sleeve), limb(-sh - 4, -212, 11, -sh - 2 + (work ? 10 : 0), -158, 9, tone(sleeve, 0.96)));
    L.push(limb(sh - 2, -270, 13, sh + 4, -212, 11, sleeve), limb(sh + 4, -212, 11, sh + 2 - (work ? 22 : 0), -158 - (work ? 24 : 0), 9, tone(sleeve, 0.96)));
    L.push(hand(-sh - 2 + (work ? 10 : 0), -150, sealed ? "#2c2c2a" : skin), hand(sh + 2 - (work ? 22 : 0), -150 - (work ? 24 : 0), sealed ? "#2c2c2a" : skin));
  }
  // rank chevrons on the left sleeve (Army enlisted, point up)
  if (s.rank && !sealed) for (let i = 0; i < Math.min(5, s.rank); i++) L.push(`<path d="M${-sh - 14} ${-238 + i * 5.5} l10 -6 l10 6" stroke="#c9a45c" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`);
  // ---- neck, head, headgear ----
  if (!sealed) {
    L.push(solid(`M-8 -298 L-9 -282 Q0 -278 9 -282 L8 -298Z`, tone(skin, 0.86)));
    L.push(`<path d="M-9 -286 Q0 -281 9 -286 L9 -282 Q0 -277 -9 -282Z" fill="#000" opacity=".25"/>`);
    if (s.look.accessory === 3) L.push(`<path d="M-15 -288 Q0 -278 15 -288 L17 -280 Q0 -268 -17 -280Z" fill="#6b6a4a"/><path d="M6 -278 l5 24 l-9 -3z" fill="#5c5b3f"/>`);
    L.push(head(s.look, skin, hair, female));
    const hg = s.headgear;
    if (hg === "helmet") L.push(helmet());
    else if (hg === "hardhat") L.push(`<path d="M-22 -326 Q-22 -352 0 -352 Q22 -352 22 -326Z" fill="#d9a441"/><path d="M-22 -326 Q-22 -352 0 -352 Q22 -352 22 -326Z" fill="url(#fg-dome)"/><rect x="-27" y="-328" width="54" height="5" rx="2.5" fill="#b07e28"/>`);
    else if (Array.isArray(hg)) L.push(unitHat(hg));
  }
  if (s.injured && !sealed) L.push(`<path d="M${-sh - 12} -252 l22 4 l-2 12 l-22 -4z" fill="#e8e4d8"/><path d="M${-sh - 4} -250 l3 13" stroke="#a8433a" stroke-width="3"/>`);
  return `<g class="fig ${cls}" transform="translate(${x} ${y}) scale(${scale * face} ${scale})">${L.join("")}</g>`;
}

function hand(x: number, y: number, col: string) {
  return `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="9.5" fill="${col}"/><ellipse cx="${x}" cy="${y}" rx="8.5" ry="9.5" fill="url(#fg-dome)"/><path d="M${x - 6} ${y - 3} h11 M${x - 6} ${y + 1} h11 M${x - 5} ${y + 5} h9" stroke="${tone(col, 0.7)}" stroke-width="1" opacity=".7"/>`;
}

/** Pockets, plackets, collars and belts for each dress, plus the uniform research tiers on the fatigues. */
function dressDetail(s: FigureSpec, d: typeof DRESS[Dress], coat: string, dk: string, lt: string, waist: number, hipW: number, hem: number, female: boolean) {
  const o: string[] = [];
  // collar
  o.push(`<path d="M-14 -286 L-4 -262 L0 -270 L4 -262 L14 -286 L6 -289 L0 -276 L-6 -289Z" fill="${dk}"/><path d="M-14 -286 L-4 -262 L0 -270" fill="none" stroke="${lt}" stroke-width="1" opacity=".5"/>`);
  if (s.dress === "labcoat") o.push(`<path d="M-12 -284 L0 -236 L12 -284" fill="none" stroke="${dk}" stroke-width="3"/><path d="M-6 -276 L0 -246 L6 -276Z" fill="#7a8088"/><rect x="14" y="-250" width="18" height="15" fill="${dk}" opacity=".45"/><path d="M19 -252 v10 M24 -252 v9" stroke="#3a6aa0" stroke-width="2"/>`);
  else if (s.dress === "suit") o.push(`<path d="M-9 -286 L0 -240 L9 -286Z" fill="#e3ddd0"/><path d="M-3 -278 L0 -236 L3 -278Z" fill="#6b2433"/><path d="M-14 -286 L-2 -222 M14 -286 L2 -222" stroke="${dk}" stroke-width="3"/>`);
  else if (s.dress === "dclass") o.push(`<path d="M0 -270 V-160" stroke="${dk}" stroke-width="2"/><text x="-26" y="-226" font-family="IBM Plex Mono,monospace" font-size="13" font-weight="700" fill="#2a1a0e">D-</text>`);
  else {
    // M-1950 field jacket: centre placket with buttons, two flapped chest pockets, two hip pockets, shoulder straps
    o.push(`<path d="M0 -270 V${hem + 2}" stroke="${dk}" stroke-width="2.4"/>${[-248, -222, -196, -170].map(yy => `<circle cx="3" cy="${yy}" r="1.8" fill="${dk}"/>`).join("")}`);
    for (const side of [-1, 1]) {
      const cx = side * (female ? 17 : 20);
      o.push(`<rect x="${cx - 11}" y="-258" width="22" height="24" rx="2" fill="${tone(coat, 0.9)}"/><path d="M${cx - 12} -258 h24 v7 l-12 3 l-12 -3z" fill="${dk}"/><circle cx="${cx}" cy="-252" r="1.6" fill="${lt}"/>`);
      if (s.dress !== "guard") o.push(`<rect x="${side * 22 - 12}" y="${hem + 2}" width="24" height="24" rx="2" fill="${tone(coat, 0.9)}" transform="translate(0 -36)"/><path d="M${side * 22 - 13} ${hem - 34} h26 v6 l-13 3 l-13 -3z" fill="${dk}"/>`);
      o.push(`<path d="M${side * 24} -283 L${side * 40} -277" stroke="${dk}" stroke-width="5" stroke-linecap="round"/>`);
    }
    if (s.dress === "guard" || s.dress === "officer") o.push(`<rect x="${-waist - 3}" y="-196" width="${2 * waist + 6}" height="9" fill="#2a2620"/><rect x="-6" y="-196" width="12" height="9" fill="#c9a45c"/>`);
    if (d.trim) o.push(`<path d="M${-hipW} ${hem + 4} H${hipW}" stroke="${d.trim}" stroke-width="2" opacity=".6"/>`);
  }
  // uniform research: quilting, the liner's collar band, the undersuit's plates, the harness frame
  const ut = s.uniformTier ?? 0;
  if (ut >= 1 && (s.dress === "fatigues" || s.dress === "field")) o.push([-30, -10, 10, 30].map(xx => `<path d="M${xx} -266 V-200" stroke="${lt}" stroke-opacity=".22" stroke-width="1.4"/>`).join(""));
  if (ut >= 2 && (s.dress === "fatigues" || s.dress === "field")) o.push(`<path d="M-16 -288 Q0 -282 16 -288" stroke="${tone(coat, 0.6)}" stroke-width="4" fill="none"/>`);
  if (ut >= 3) o.push(`<rect x="-24" y="-238" width="48" height="22" rx="3" fill="#4a4f52" opacity=".5"/>`);
  if (ut >= 4) o.push(`<path d="M-40 -276 V-170 M40 -276 V-170 M-40 -224 H40" stroke="#7a838a" stroke-width="4" fill="none"/><circle cx="-40" cy="-170" r="5" fill="#7a838a"/><circle cx="40" cy="-170" r="5" fill="#7a838a"/>`);
  return o.join("");
}

/** M1945 suspenders over the shoulders, the M1936 pistol belt with two rifle-ammunition pouches a side, the canteen
 *  and its cover on the right hip, and the first-aid pouch on the left suspender. */
function webGear(waist: number, sh: number, female: boolean) {
  const web = "#6e6a4c", webDk = "#4f4c36", w = waist + 4;
  return `<path d="M${-sh + 14} -282 Q${-22} -240 ${-18} -194 M${sh - 14} -282 Q22 -240 18 -194" stroke="${web}" stroke-width="7" fill="none"/>
    <path d="M${-sh + 14} -282 Q${-22} -240 ${-18} -194" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none" transform="translate(3 0)"/>
    <rect x="${-sh + 4}" y="-266" width="16" height="18" rx="2" fill="${webDk}"/><path d="M${-sh + 4} -266 h16 v5 h-16z" fill="#3e3b2a"/>
    ${solid(`M${-w - 2} -200 H${w + 2} V-188 H${-w - 2}Z`, web)}
    <rect x="-7" y="-201" width="14" height="14" rx="1" fill="#8b876f"/><rect x="-4" y="-198" width="8" height="8" fill="#5a5644"/>
    ${[-1, 1].map(side => [0, 1].map(i => { const px = side * (12 + i * 14) - 6; return `${solid(`M${px} -199 h12 v17 q-6 3 -12 0z`, webDk)}<path d="M${px} -199 h12 v5 h-12z" fill="#3e3b2a"/><circle cx="${px + 6}" cy="-192" r="1.3" fill="#9a9478"/>`; }).join("")).join("")}
    ${solid(`M${w - 4} -190 h${female ? 14 : 16} q4 0 4 6 v22 q0 6 -6 6 h-12 q-6 0 -6 -6 v-22 q0 -6 6 -6z`, "#5f6045")}<path d="M${w - 2} -190 h${female ? 14 : 16}" stroke="#3e3b2a" stroke-width="3"/>`;
}

/** The M1 helmet: steel pot, liner rim, net cover and chinstraps hanging loose, as 1951 riflemen wore it. */
function helmet() {
  const pot = `M-25 -322 Q-27 -360 0 -361 Q27 -360 25 -322 Q22 -318 0 -318 Q-22 -318 -25 -322Z`;
  return `<path d="${pot}" fill="#4f5637"/><path d="${pot}" fill="url(#fg-net)"/><path d="${pot}" fill="url(#fg-dome)"/>
    <path d="M-27 -321 Q0 -315 27 -321 L27 -317 Q0 -311 -27 -317Z" fill="#3b4129"/>
    <path d="M-22 -318 Q-23 -304 -19 -296 M22 -318 Q23 -304 19 -296" stroke="#4a4630" stroke-width="2.2" fill="none"/>
    <ellipse cx="-9" cy="-348" rx="9" ry="5" fill="#fff" opacity=".08"/>`;
}

function suitColor(a?: ArmorKind) { return a === "leadsuit" ? "#5d6166" : a === "contsuit" ? "#c7c9b8" : "#c9b04a"; }
function suitDetail(a: ArmorKind, sh: number) {
  const col = suitColor(a), dk = tone(col, 0.72);
  const hood = `M-26 -296 Q-29 -360 0 -362 Q29 -360 26 -296 Q22 -276 0 -274 Q-22 -276 -26 -296Z`;
  return `${solid(hood, col)}<path d="${hood}" fill="url(#fg-dome)"/>
    <ellipse cx="0" cy="-322" rx="17" ry="15" fill="#18242a"/><ellipse cx="0" cy="-322" rx="17" ry="15" fill="url(#fg-dome)"/><path d="M-12 -330 q8 -6 16 -2" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${a === "hazmat" ? `<rect x="-11" y="-298" width="22" height="13" rx="5" fill="${dk}"/><circle cx="-20" cy="-292" r="7" fill="#2a2a2a"/><circle cx="20" cy="-292" r="7" fill="#2a2a2a"/>` : ""}
    ${a === "leadsuit" ? `<path d="M${-sh + 4} -252 H${sh - 4} M${-sh + 6} -226 H${sh - 6} M${-sh + 8} -200 H${sh - 8}" stroke="${dk}" stroke-width="3.5"/>` : ""}
    ${a === "contsuit" ? `<rect x="-17" y="-254" width="34" height="22" rx="3" fill="${dk}"/><path d="M${-sh + 4} -262 Q-26 -252 -22 -226" stroke="#c0503f" stroke-width="3" fill="none"/>` : ""}
    <path d="M${-sh + 6} -266 V-166 M${sh - 6} -266 V-166" stroke="${dk}" stroke-width="2.5"/><path d="M0 -276 V-160" stroke="${dk}" stroke-width="2"/>`;
}

/** The M1951 flak vest (tier 1), the M69 (tier 2), Foundation ceramic plate (tier 3); light smock and heavy plate. */
function vest(kind: ArmorKind, tier: number, sh: number, waist: number) {
  const col = tier >= 3 ? "#565c5f" : tier === 2 ? "#5d6142" : "#4f5637", dk = tone(col, 0.72), lt = tone(col, 1.18);
  const w = sh - 6;
  if (kind === "armor_light") return `${solid(`M${-w + 4} -276 L${-waist - 2} -176 L${waist + 2} -176 L${w - 4} -276 L16 -284 L0 -258 L-16 -284Z`, "#6b6a4a", true)}${[-26, -10, 6, 22].map(x => `<rect x="${x - 4}" y="-218" width="12" height="16" rx="2" fill="#585638"/>`).join("")}`;
  const heavy = kind === "armor_heavy";
  const body = `M${-w - (heavy ? 6 : 0)} -278 L${-waist - (heavy ? 8 : 4)} -170 L${waist + (heavy ? 8 : 4)} -170 L${w + (heavy ? 6 : 0)} -278 L16 -288 L0 -260 L-16 -288Z`;
  return `${solid(body, col, true)}
    ${tier === 1 ? [-252, -232, -212, -192].map(yy => `<path d="M${-w + 4} ${yy} Q0 ${yy + 3} ${w - 4} ${yy}" stroke="${dk}" stroke-width="1.6" fill="none"/>`).join("") : ""}
    ${tier === 2 ? `<path d="M-2 -258 V-172" stroke="${dk}" stroke-width="3"/>${[-226, -196].map(yy => `<path d="M${-w + 4} ${yy} H${w - 4}" stroke="${dk}" stroke-width="2"/>`).join("")}` : ""}
    ${tier >= 3 ? `${solid(`M-22 -254 h44 v58 q-22 8 -44 0z`, lt)}<path d="M-22 -254 h44" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>` : `<rect x="-30" y="-206" width="18" height="18" rx="2" fill="${dk}"/><rect x="12" y="-206" width="18" height="18" rx="2" fill="${dk}"/>`}
    <path d="M-16 -288 L0 -260 L16 -288" fill="none" stroke="${lt}" stroke-width="2" opacity=".5"/>
    ${heavy ? `${solid(`M${-w - 16} -282 Q${-w - 22} -254 ${-w - 8} -240 L${-w + 2} -276Z`, dk)}${solid(`M${w + 16} -282 Q${w + 22} -254 ${w + 8} -240 L${w - 2} -276Z`, dk)}<rect x="-26" y="-178" width="52" height="12" fill="${dk}"/>` : ""}`;
}

/** A head about one seventh of the height: skull and jaw as volumes, a face lit from the upper left, small eyes with
 *  lids and brow shadow rather than cartoon whites, then hair, facial hair, scars and accessories. */
function head(l: Look, skin: string, hair: string, female: boolean) {
  const shadeC = tone(skin, 0.8), lit = tone(skin, 1.07), lip = mix(skin, "#8a3a30", 0.32);
  const shape = l.face ?? 0, jaw = (female ? 13 : 15) + (shape === 1 ? 2 : shape === 2 ? -1.5 : 0), chin = shape === 2 ? -289 : shape === 1 ? -294 : -292;
  const faceD = `M-16 -322 Q-17 -344 0 -344 Q17 -344 16 -322 Q${jaw + 1} -304 ${shape === 1 ? 6 : 3} ${chin} Q0 ${chin + 1.5} ${shape === 1 ? -6 : -3} ${chin} Q${-jaw - 1} -304 -16 -322Z`;
  const back = [
    "", "", "", "", "",
    `<path d="M-21 -300 Q-23 -350 0 -351 Q23 -350 21 -300 L16 -300 Q17 -338 0 -338 Q-17 -338 -16 -300Z" fill="${hair}"/>`,
    `<path d="M-19 -306 Q-21 -306 -18 -296 L-14 -306Z M19 -306 Q21 -306 18 -296 L14 -306Z" fill="${hair}"/>`,
  ][l.hair] ?? "";
  const top = [
    `<path d="M-16.5 -324 Q-17 -347 0 -348 Q17 -347 16.5 -324 Q13 -336 0 -337 Q-13 -336 -16.5 -324Z" fill="${hair}"/>`,
    `<path d="M-17 -320 Q-18 -348 1 -349 Q18 -347 17 -324 Q12 -338 -4 -336 Q-13 -334 -17 -320Z" fill="${hair}"/><path d="M-6 -348 Q-2 -340 -4 -336" stroke="${tone(hair, 0.6)}" stroke-width="1.2" fill="none"/>`,
    `<path d="M-17 -322 Q-18 -350 0 -350 Q18 -350 17 -322 Q15 -341 0 -342 Q-15 -341 -17 -322Z" fill="${hair}"/><path d="M-10 -347 Q0 -351 10 -347" stroke="${tone(hair, 1.4)}" stroke-width="1" fill="none" opacity=".5"/>`,
    `<path d="M-16 -326 Q-16 -344 0 -345 Q16 -344 16 -326 Q10 -336 0 -337 Q-10 -336 -16 -326Z" fill="${hair}" opacity=".35"/>`,
    `<path d="M-17 -318 Q-18 -348 0 -348 Q18 -348 17 -318 Q14 -338 0 -338 Q-14 -338 -17 -318Z" fill="${hair}"/><circle cx="0" cy="-351" r="7.5" fill="${hair}"/>`,
    `<path d="M-17 -322 Q-17 -346 0 -346 Q17 -346 17 -322 Q12 -336 -2 -336 Q-14 -334 -17 -322Z" fill="${hair}"/>`,
    `<path d="M-18 -314 Q-19 -344 0 -344 Q19 -344 18 -314 Q14 -336 0 -336 Q-14 -336 -18 -314Z" fill="${hair}"/><ellipse cx="-9" cy="-345" rx="9" ry="6" fill="${hair}"/><ellipse cx="9" cy="-345" rx="9" ry="6" fill="${hair}"/>`,
  ][l.hair] ?? "";
  const facial = [
    "",
    `<path d="M-6.5 -302.5 Q0 -305.5 6.5 -302.5 Q0 -301 -6.5 -302.5Z" fill="${hair}" stroke="${hair}" stroke-width="1.8"/>`,
    `<path d="M-15 -314 Q-15 -293 0 -290 Q15 -293 15 -314 Q12 -299 0 -298 Q-12 -299 -15 -314Z" fill="${hair}"/><path d="M-6.5 -302.5 Q0 -305 6.5 -302.5" stroke="${hair}" stroke-width="2.4" fill="none"/>`,
    `<path d="M-14 -312 Q-13 -293 0 -291 Q13 -293 14 -312 Q11 -299 0 -298 Q-11 -299 -14 -312Z" fill="${hair}" opacity=".28"/>`,
  ][l.facial] ?? "";
  return `${back}
    <ellipse cx="-16.5" cy="-318" rx="2.8" ry="5" fill="${shadeC}"/><ellipse cx="16.5" cy="-318" rx="2.8" ry="5" fill="${tone(skin, 0.7)}"/>
    <path d="${faceD}" fill="${skin}"/>
    <path d="M6 -342 Q17 -332 15 -314 Q13 -300 ${shape === 1 ? 6 : 3} ${chin} Q10 -300 11 -314 Q12 -330 6 -342Z" fill="${shadeC}" opacity=".75"/>
    <path d="${faceD}" fill="url(#fg-dome)" opacity=".55"/>
    <ellipse cx="-7" cy="-334" rx="7" ry="4" fill="${lit}" opacity=".45"/>
    <path d="M-12 -323 Q-6.5 -326 -2 -323.5 M2 -323.5 Q6.5 -326 12 -323" stroke="${tone(hair, 1.05)}" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M-12 -321 Q-6.5 -323 -1.5 -321 L-1.5 -319 Q-6.5 -321 -12 -319Z M1.5 -321 Q6.5 -323 12 -321 L12 -319 Q6.5 -321 1.5 -319Z" fill="${shadeC}" opacity=".8"/>
    <path d="M-10.5 -318 Q-6.5 -320.5 -2.5 -318 Q-6.5 -316.2 -10.5 -318Z M2.5 -318 Q6.5 -320.5 10.5 -318 Q6.5 -316.2 2.5 -318Z" fill="#e4dccd"/>
    <circle cx="-6.3" cy="-318.1" r="1.9" fill="#2b2119"/><circle cx="6.7" cy="-318.1" r="1.9" fill="#2b2119"/>
    <path d="M-10.8 -318.3 Q-6.5 -321 -2.3 -318.3 M2.3 -318.3 Q6.5 -321 10.8 -318.3" stroke="#2b2119" stroke-width="1.1" fill="none"/>
    <path d="M0.5 -316 L2.8 -306 Q1 -304.2 -1.8 -305" stroke="${shadeC}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M1 -316 L3.6 -306.5 Q3 -304 1 -304Z" fill="${shadeC}" opacity=".6"/>
    <path d="M-5 -299.2 Q0 -297.4 5 -299.2" stroke="${tone(lip, 0.75)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M-3.6 -298.2 Q0 -296.2 3.6 -298.2 Q0 -295.6 -3.6 -298.2Z" fill="${lip}" opacity="${female ? 0.9 : 0.5}"/>
    <path d="M-9 -310 Q-11 -303 -8 -298" stroke="${shadeC}" stroke-width="1" fill="none" opacity=".5"/>
    ${top}${facial}
    ${l.scar ? `<path d="M6 -326 L11.5 -309" stroke="#a9604f" stroke-width="1.8" opacity=".85"/><path d="M6.6 -326 L12.1 -309" stroke="#fff" stroke-width=".6" opacity=".3"/>` : ""}
    ${l.accessory === 1 ? `<circle cx="-6.5" cy="-318" r="5.6" fill="#cfe0e8" fill-opacity=".14" stroke="#2a2a2a" stroke-width="1.4"/><circle cx="6.5" cy="-318" r="5.6" fill="#cfe0e8" fill-opacity=".14" stroke="#2a2a2a" stroke-width="1.4"/><path d="M-1 -318.5 h2 M-12 -319 l-4 -1.5 M12 -319 l4 -1.5" stroke="#2a2a2a" stroke-width="1.4"/>` : ""}
    ${l.accessory === 2 ? `<path d="M3 -299 l11 2" stroke="#e8e4d8" stroke-width="2.2" stroke-linecap="round"/><circle cx="14.5" cy="-297" r="1.3" fill="#d9783a"/><path d="M15 -299 q3 -6 0 -10 q-3 -5 1 -9" stroke="#c9c9c9" stroke-width="1" fill="none" opacity=".55"/>` : ""}`;
}
function unitHat([name, col]: [string, string]) {
  const dk = tone(col, 0.74);
  if (name.includes("kepi")) return `${solid(`M-15 -364 h30 l2 30 h-34z`, col)}<rect x="-19" y="-338" width="38" height="5" rx="2" fill="#2a2a2a"/><path d="M-17 -336 Q0 -330 17 -336 L19 -332 Q0 -326 -19 -332Z" fill="#1d1d1d"/>`;
  if (name.includes("slouch")) return `<ellipse cx="0" cy="-334" rx="32" ry="7" fill="${dk}"/>${solid(`M-17 -334 Q-16 -362 0 -362 Q16 -362 17 -334Z`, col)}<path d="M-17 -336 H17" stroke="#3a2f1e" stroke-width="3"/><path d="M-30 -336 Q-33 -352 -18 -346Z" fill="${dk}"/>`;
  if (name.includes("cap")) return `${solid(`M-18 -330 Q-18 -358 0 -358 Q18 -358 18 -330Z`, col)}${name.includes("patrol") ? `<rect x="-19" y="-334" width="38" height="5" fill="${dk}"/><path d="M-16 -330 Q0 -322 16 -330 L19 -326 Q0 -316 -19 -326Z" fill="${dk}"/>` : `<path d="M-18 -334 H18" stroke="${dk}" stroke-width="5"/>`}`;
  // a beret, worn pulled down to the right, badge over the left eye
  return `${solid(`M-20 -330 Q-23 -356 2 -358 Q25 -356 22 -334 Q12 -342 -2 -340 Q-14 -338 -20 -330Z`, col)}<circle cx="-10" cy="-338" r="3.2" fill="#c9a45c"/><path d="M-20 -331 Q0 -336 21 -333" stroke="${dk}" stroke-width="2.5" fill="none"/>`;
}
