// Presentation overhaul: full-body people, built as layers on one pivot (the feet, at 0,0) like a paper doll. The
// layers are, back to front: shadow, boots, legs, torso (the dress: fatigues, lab coat, coveralls...), armour, arms,
// neck and head, face, hair, facial hair, headgear, and the held weapon at the right-hand socket. Every layer reads
// plain data (an operative's Look, their uniform, armour and weapon), so what the player changes is what they see.
//
// The figure is drawn front-on, 340 units tall at scale 1. Sockets (where rigid items attach) are fixed points on
// that frame: SOCKETS below. A 3D renderer would map the same names to bones.
import { HAIR_COLORS, SKIN, type Look } from "../../data/looks";
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
export const SOCKETS = { head: [0, -300], handR: [34, -168], handL: [-30, -196], chest: [0, -228], back: [0, -230] } as const;

const tone = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16), ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0"); return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`; };

const DRESS: Record<Dress, { coat: string; trousers: string; boots: string; trim?: string; long?: boolean }> = {
  fatigues: { coat: "#58603f", trousers: "#545b3c", boots: "#2b2520" },
  field: { coat: "#6a6747", trousers: "#545b3c", boots: "#2b2520", trim: "#4c4a32" },
  officer: { coat: "#5f5a46", trousers: "#5b5644", boots: "#1d1a17", trim: "#c9a45c" },
  labcoat: { coat: "#d9d6cb", trousers: "#3d4148", boots: "#1d1a17", long: true },
  coveralls: { coat: "#4f5c68", trousers: "#4f5c68", boots: "#2b2520" },
  guard: { coat: "#4f5d6e", trousers: "#434f5e", boots: "#1d1a17", trim: "#c9a45c" },
  dclass: { coat: "#d0732f", trousers: "#c2692b", boots: "#3a3026" },
  suit: { coat: "#2f3237", trousers: "#2b2e33", boots: "#141414" },
};

/** One person at (x, y) feet position, scaled. `face` −1 turns them to the left (mirrored). */
export function figureSvg(s: FigureSpec, x: number, y: number, scale = 1, face: 1 | -1 = 1, cls = "") {
  const skin = SKIN[s.look.skin] ?? SKIN[1], hair = HAIR_COLORS[s.look.hairColor] ?? HAIR_COLORS[0];
  const d = DRESS[s.dress], sh = tone(skin, 0.82), coatDk = tone(d.coat, 0.78), coatLt = tone(d.coat, 1.12);
  const female = s.sex === "f", sealed = s.armor === "hazmat" || s.armor === "leadsuit" || s.armor === "contsuit";
  const L: string[] = [];
  // shadow on the floor
  L.push(`<ellipse cx="0" cy="2" rx="62" ry="10" fill="#000" opacity=".35"/>`);
  // boots and legs
  const stance = s.pose === "rest" ? 18 : 24;
  L.push(`<path d="M${-stance - 14} 0 h30 l2 -26 h-28z M${stance - 16} 0 h30 l-2 -26 h-28z" fill="${d.boots}"/>`);
  L.push(`<path d="M-34 -150 L${-stance - 14} -26 h28 L-4 -120 L4 -120 L${stance - 14} -26 h28 L34 -150Z" fill="${sealed ? suitColor(s.armor) : d.trousers}"/>`);
  L.push(`<path d="M-4 -120 L${stance - 14} -26 h6 L2 -118Z" fill="#000" opacity=".15"/>`);
  if (!sealed && (s.dress === "fatigues" || s.dress === "field")) L.push(`<rect x="-30" y="-100" width="16" height="20" rx="3" fill="${tone(d.trousers, 0.85)}"/><rect x="${stance - 4}" y="-100" width="16" height="20" rx="3" fill="${tone(d.trousers, 0.85)}"/>`);
  // torso
  const waist = female ? 36 : 40, shoulders = female ? 50 : 58;
  const torso = `M${-shoulders} -262 Q${-shoulders - 4} -200 ${-waist} -150 L${waist} -150 Q${shoulders + 4} -200 ${shoulders} -262 Q0 -276 ${-shoulders} -262Z`;
  if (d.long && !sealed) L.push(`<path d="M${-waist - 4} -150 L${-waist - 12} -70 L${waist + 12} -70 L${waist + 4} -150Z" fill="${d.coat}"/><path d="M0 -150 L0 -70" stroke="${coatDk}" stroke-width="2"/>`);
  L.push(`<path d="${torso}" fill="${sealed ? suitColor(s.armor) : d.coat}"/>`);
  L.push(`<path d="M${-shoulders} -262 Q${-shoulders - 4} -200 ${-waist} -150 L${-waist + 18} -150 Q${-shoulders + 16} -200 ${-shoulders + 12} -258Z" fill="#000" opacity=".12"/>`);
  if (!sealed) {
    // collar, placket, pockets, belt
    L.push(`<path d="M-16 -268 L0 -246 L16 -268 L8 -270 L0 -258 L-8 -270Z" fill="${coatDk}"/>`);
    if (s.dress === "labcoat") L.push(`<path d="M-14 -266 L0 -232 L14 -266" fill="none" stroke="${coatDk}" stroke-width="3"/><rect x="18" y="-236" width="20" height="16" fill="${coatDk}" opacity=".5"/><path d="M24 -238 v10" stroke="#3a6aa0" stroke-width="2"/>`);
    else if (s.dress === "suit") L.push(`<path d="M-10 -268 L0 -230 L10 -268Z" fill="#e3ddd0"/><path d="M-3 -262 L0 -226 L3 -262Z" fill="#6b2433"/>`);
    else L.push(`<path d="M0 -258 V-152" stroke="${coatDk}" stroke-width="2"/><rect x="-42" y="-238" width="26" height="20" rx="2" fill="${coatDk}"/><rect x="16" y="-238" width="26" height="20" rx="2" fill="${coatDk}"/>`);
    if (s.dress !== "labcoat") L.push(`<rect x="${-waist - 2}" y="-160" width="${2 * waist + 4}" height="11" fill="${s.dress === "dclass" ? "#8a4a1e" : "#3a3426"}"/><rect x="-7" y="-160" width="14" height="11" fill="#9a8a5a"/>`);
    if (s.dress === "dclass") L.push(`<text x="-22" y="-200" font-family="IBM Plex Mono,monospace" font-size="16" font-weight="700" fill="#2a1a0e">D-</text>`);
    // uniform research: the padded jacket's quilting, the nylon liner's collar, the undersuit's plates, the harness frame
    const ut = s.uniformTier ?? 0;
    if (ut >= 1 && (s.dress === "fatigues" || s.dress === "field")) L.push([-36, -24, -12, 0, 12, 24, 36].map(xx => `<path d="M${xx} -250 V-164" stroke="${coatLt}" stroke-opacity=".35" stroke-width="1.5"/>`).join(""));
    if (ut >= 3) L.push(`<rect x="-30" y="-214" width="60" height="28" rx="4" fill="#4a4f52" opacity=".55"/>`);
    if (ut >= 4) L.push(`<path d="M-50 -258 V-150 M50 -258 V-150 M-50 -200 H50" stroke="#7a838a" stroke-width="5" fill="none"/><circle cx="-50" cy="-150" r="7" fill="#7a838a"/><circle cx="50" cy="-150" r="7" fill="#7a838a"/>`);
  }
  // body armour over the dress
  if (s.armor && !sealed) L.push(vest(s.armor, s.armorTier ?? 1, female));
  if (sealed) L.push(suitDetail(s.armor!));
  // arms: the left forward under the weapon's fore-end, the right at the grip; empty-handed they hang
  const sleeve = sealed ? suitColor(s.armor) : d.coat;
  const armed = !!s.weapon;
  if (armed) {
    L.push(`<path d="M${-shoulders + 4} -258 Q${-shoulders - 10} -220 -46 -196 L-24 -186 Q-36 -214 ${-shoulders + 22} -246Z" fill="${sleeve}"/>`);
    L.push(`<path d="M${shoulders - 4} -258 Q${shoulders + 12} -206 40 -170 L24 -164 Q30 -206 ${shoulders - 22} -246Z" fill="${tone(sleeve, 0.9)}"/>`);
  } else {
    const swing = s.pose === "work" ? -16 : 0;
    L.push(`<path d="M${-shoulders + 2} -258 Q${-shoulders - 12} -200 ${-shoulders - 6 + swing} -150 L${-shoulders + 12 + swing} -148 Q${-shoulders + 8} -200 ${-shoulders + 22} -248Z" fill="${sleeve}"/>`);
    L.push(`<path d="M${shoulders - 2} -258 Q${shoulders + 12} -200 ${shoulders + 6} -150 L${shoulders - 12} -148 Q${shoulders - 8} -200 ${shoulders - 22} -248Z" fill="${tone(sleeve, 0.9)}"/>`);
    L.push(`<ellipse cx="${-shoulders + 3 + swing}" cy="-142" rx="9" ry="11" fill="${sealed ? "#2a2a2a" : skin}"/><ellipse cx="${shoulders - 3}" cy="-142" rx="9" ry="11" fill="${sealed ? "#2a2a2a" : sh}"/>`);
  }
  // rank stripes on the left sleeve
  if (s.rank && !sealed) for (let i = 0; i < Math.min(5, s.rank); i++) L.push(`<path d="M${-shoulders - 2} ${-236 + i * 6} l12 -5 l12 5" stroke="#c9a45c" stroke-width="2.5" fill="none"/>`);
  // neck and head
  if (!sealed) {
    L.push(`<rect x="-11" y="-282" width="22" height="20" fill="${sh}"/>`);
    if (s.look.accessory === 3) L.push(`<path d="M-20 -272 Q0 -258 20 -272 L22 -262 Q0 -246 -22 -262Z" fill="#6b6a4a"/><path d="M8 -260 l6 30 l-10 -4z" fill="#5c5b3f"/>`);
    L.push(head(s.look, skin, sh, hair, female));
    const hg = s.headgear;
    if (hg === "helmet") L.push(`<path d="M-30 -306 Q-30 -344 0 -344 Q30 -344 30 -306 Q16 -312 0 -312 Q-16 -312 -30 -306Z" fill="#4f5638"/><path d="M-34 -304 Q0 -314 34 -304 L34 -300 Q0 -309 -34 -300Z" fill="#3e442c"/><path d="M-20 -336 Q0 -340 20 -336" stroke="#5f6745" stroke-width="2" fill="none"/>`);
    else if (hg === "hardhat") L.push(`<path d="M-27 -310 Q-27 -342 0 -342 Q27 -342 27 -310Z" fill="#d9a441"/><rect x="-33" y="-312" width="66" height="6" rx="3" fill="#c08e30"/>`);
    else if (Array.isArray(hg)) L.push(unitHat(hg));
  }
  // the weapon at port arms: the right hand at the grip, angled up across the chest
  if (s.weapon) {
    const [hx, hy] = SOCKETS.handR;
    L.push(`<g transform="translate(${hx} ${hy}) rotate(-58) scale(.24) translate(-420 -40)">${weaponSide(s.weapon, s.attachment)}</g>`);
    L.push(`<ellipse cx="${hx - 4}" cy="${hy + 2}" rx="10" ry="11" fill="${sealed ? "#2a2a2a" : skin}"/><ellipse cx="-38" cy="-198" rx="10" ry="11" fill="${sealed ? "#2a2a2a" : skin}"/>`);
  }
  if (s.injured && !sealed) L.push(`<rect x="-46" y="-226" width="22" height="12" rx="2" fill="#e8e4d8"/><rect x="-38" y="-226" width="4" height="12" fill="#b5463e"/>`);
  return `<g class="fig ${cls}" transform="translate(${x} ${y}) scale(${scale * face} ${scale})">${L.join("")}</g>`;
}

function suitColor(a?: ArmorKind) { return a === "leadsuit" ? "#5d6166" : a === "contsuit" ? "#c7c9b8" : "#c9b04a"; }
function suitDetail(a: ArmorKind) {
  const col = suitColor(a), dk = tone(col, 0.75);
  return `<path d="M-34 -300 Q-36 -346 0 -348 Q36 -346 34 -300 Q30 -262 0 -258 Q-30 -262 -34 -300Z" fill="${col}"/>
    <ellipse cx="0" cy="-306" rx="22" ry="18" fill="#1d2a30"/><ellipse cx="-7" cy="-312" rx="7" ry="5" fill="#fff" opacity=".18"/>
    ${a === "hazmat" ? `<rect x="-14" y="-276" width="28" height="16" rx="6" fill="${dk}"/><circle cx="-24" cy="-268" r="9" fill="#2a2a2a"/>` : ""}
    ${a === "leadsuit" ? `<path d="M-44 -240 H44 M-42 -210 H42 M-40 -180 H40" stroke="${dk}" stroke-width="4"/>` : ""}
    ${a === "contsuit" ? `<rect x="-20" y="-238" width="40" height="26" rx="4" fill="${dk}"/><path d="M-50 -250 Q-30 -240 -26 -210" stroke="#c0503f" stroke-width="3" fill="none"/>` : ""}
    <path d="M-46 -250 V-152 M46 -250 V-152" stroke="${dk}" stroke-width="3"/>`;
}
function vest(kind: ArmorKind, tier: number, female: boolean) {
  const col = tier >= 3 ? "#565c5f" : tier === 2 ? "#5d6142" : "#4e5536", dk = tone(col, 0.75), w = female ? 44 : 48;
  if (kind === "armor_light") return `<path d="M${-w + 6} -256 L${-w + 4} -170 L${w - 4} -170 L${w - 6} -256 L20 -262 L0 -238 L-20 -262Z" fill="#6b6a4a" opacity=".9"/>${[-30, -12, 6, 24].map(x => `<rect x="${x}" y="-206" width="14" height="18" rx="2" fill="#585638"/>`).join("")}`;
  const heavy = kind === "armor_heavy";
  return `<path d="M${-w} -258 L${-w - (heavy ? 6 : 2)} -164 L${w + (heavy ? 6 : 2)} -164 L${w} -258 L22 -266 L0 -240 L-22 -266Z" fill="${col}"/>
    ${[-236, -214, -192].map(yy => `<path d="M${-w + 2} ${yy} H${w - 2}" stroke="${dk}" stroke-width="${tier >= 3 ? 3 : 1.6}"/>`).join("")}
    ${tier >= 3 ? `<rect x="-26" y="-232" width="52" height="54" rx="4" fill="${tone(col, 1.15)}"/>` : `<rect x="-38" y="-200" width="22" height="20" rx="2" fill="${dk}"/><rect x="16" y="-200" width="22" height="20" rx="2" fill="${dk}"/>`}
    ${heavy ? `<path d="M${-w - 14} -260 Q${-w - 18} -236 ${-w - 6} -226 L${-w + 4} -256Z M${w + 14} -260 Q${w + 18} -236 ${w + 6} -226 L${w - 4} -256Z" fill="${dk}"/><rect x="-30" y="-172" width="60" height="14" fill="${dk}"/>` : ""}`;
}
function head(l: Look, skin: string, sh: string, hair: string, female: boolean) {
  const lit = tone(skin, 1.08);
  const hairShape = [
    `<path d="M-25 -306 Q-24 -336 0 -337 Q24 -336 25 -306 Q18 -322 0 -322 Q-18 -322 -25 -306Z" fill="${hair}"/>`,
    `<path d="M-26 -302 Q-27 -338 2 -339 Q27 -337 27 -306 Q20 -326 -6 -322 Q-20 -320 -26 -302Z" fill="${hair}"/>`,
    `<path d="M-26 -304 Q-28 -340 0 -340 Q28 -340 26 -304 Q22 -330 0 -330 Q-22 -330 -26 -304Z" fill="${hair}"/>`,
    `<path d="M-23 -310 Q-22 -330 0 -331 Q22 -330 23 -310 Q14 -320 0 -320 Q-14 -320 -23 -310Z" fill="${hair}" opacity=".4"/>`,
    `<path d="M-26 -300 Q-28 -338 0 -338 Q28 -338 26 -300 Q22 -326 0 -326 Q-22 -326 -26 -300Z" fill="${hair}"/><circle cx="0" cy="-342" r="11" fill="${hair}"/>`,
    `<path d="M-30 -276 Q-34 -340 0 -340 Q34 -340 30 -276 L24 -276 Q26 -326 0 -326 Q-26 -326 -24 -276Z" fill="${hair}"/>`,
    `<path d="M-27 -294 Q-28 -334 0 -334 Q28 -334 27 -294 Q22 -322 0 -322 Q-22 -322 -27 -294Z" fill="${hair}"/><ellipse cx="-14" cy="-336" rx="13" ry="9" fill="${hair}"/><ellipse cx="14" cy="-336" rx="13" ry="9" fill="${hair}"/><path d="M-27 -294 Q-31 -278 -24 -274 L-22 -292Z M27 -294 Q31 -278 24 -274 L22 -292Z" fill="${hair}"/>`,
  ][l.hair] ?? "";
  const facial = [
    "",
    `<path d="M-9 -286 Q0 -291 9 -286 Q0 -288 -9 -286Z" fill="${hair}" stroke="${hair}" stroke-width="2.5"/>`,
    `<path d="M-22 -300 Q-21 -268 0 -266 Q21 -268 22 -300 Q18 -276 0 -276 Q-18 -276 -22 -300Z" fill="${hair}"/>`,
    `<path d="M-20 -296 Q-18 -270 0 -268 Q18 -270 20 -296 Q16 -276 0 -275 Q-16 -276 -20 -296Z" fill="${hair}" opacity=".3"/>`,
  ][l.facial] ?? "";
  const shape = l.face ?? 0, jaw = (female ? 21 : 23) + (shape === 1 ? 3 : shape === 2 ? -2 : 0), chin = shape === 2 ? -264 : shape === 1 ? -274 : -270;
  return `${l.hair === 5 ? hairShape : ""}
    <ellipse cx="-24" cy="-302" rx="4" ry="7" fill="${sh}"/><ellipse cx="24" cy="-302" rx="4" ry="7" fill="${sh}"/>
    <path d="M${-jaw} -312 Q${-jaw} -336 0 -336 Q${jaw} -336 ${jaw} -312 Q${jaw} ${shape === 1 ? -276 : -284} ${shape === 1 ? 8 : 0} ${chin} ${shape === 1 ? "L-8 " + chin + " " : ""}Q${-jaw} ${shape === 1 ? -276 : -284} ${-jaw} -312Z" fill="${skin}"/>
    <path d="M12 -330 Q${jaw + 2} -312 14 -284 Q8 -276 0 -272 Q12 -282 14 -300 Q16 -318 12 -330Z" fill="${sh}" opacity=".5"/>
    <ellipse cx="-8" cy="-322" rx="9" ry="5" fill="${lit}" opacity=".35"/>
    ${l.hair === 5 ? "" : hairShape}
    <ellipse cx="-9" cy="-306" rx="4.2" ry="2.6" fill="#ece7dc"/><ellipse cx="9" cy="-306" rx="4.2" ry="2.6" fill="#ece7dc"/>
    <circle cx="-8.5" cy="-306" r="2.1" fill="#2a2018"/><circle cx="9.5" cy="-306" r="2.1" fill="#2a2018"/>
    <path d="M-15 -312 Q-9 -315 -3 -312 M3 -312 Q9 -315 15 -312" stroke="${hair}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M0 -304 L-3 -293 Q0 -291 3 -293" stroke="${sh}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M-7 -284 Q0 -281 7 -284" stroke="#6a3f30" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>
    ${facial}${l.scar ? `<path d="M10 -316 L17 -296" stroke="#b5675a" stroke-width="2.2" opacity=".85"/>` : ""}
    ${l.accessory === 1 ? `<circle cx="-9" cy="-306" r="7.5" fill="#cfe0e8" fill-opacity=".18" stroke="#2a2a2a" stroke-width="2"/><circle cx="9" cy="-306" r="7.5" fill="#cfe0e8" fill-opacity=".18" stroke="#2a2a2a" stroke-width="2"/><path d="M-1.5 -307 h3 M-16.5 -307 l-6 -2 M16.5 -307 l6 -2" stroke="#2a2a2a" stroke-width="2"/>` : ""}
    ${l.accessory === 2 ? `<path d="M5 -283 l16 3" stroke="#e8e4d8" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="-280" r="1.8" fill="#d9783a"/><path d="M23 -282 q4 -8 0 -14 q-4 -6 1 -12" stroke="#c9c9c9" stroke-width="1.4" fill="none" opacity=".6"/>` : ""}`;
}
function unitHat([name, col]: [string, string]) {
  const dk = tone(col, 0.78);
  if (name.includes("kepi")) return `<rect x="-22" y="-354" width="44" height="26" rx="4" fill="${col}"/><rect x="-26" y="-330" width="52" height="7" rx="2" fill="#2a2a2a"/>`;
  if (name.includes("slouch")) return `<ellipse cx="0" cy="-322" rx="44" ry="9" fill="${col}"/><path d="M-24 -322 Q-22 -350 0 -350 Q22 -350 24 -322Z" fill="${col}"/><path d="M-36 -324 Q-40 -342 -24 -338Z" fill="${dk}"/>`;
  if (name.includes("cap")) return `<path d="M-26 -318 Q-26 -346 0 -346 Q26 -346 26 -318Z" fill="${col}"/>${name.includes("patrol") ? `<rect x="-28" y="-322" width="56" height="7" fill="${dk}"/><path d="M-24 -316 Q0 -306 24 -316 L28 -312 Q0 -300 -28 -312Z" fill="${dk}"/>` : ""}`;
  return `<path d="M-30 -316 Q-32 -344 2 -346 Q34 -344 30 -320 Q16 -330 -4 -328 Q-20 -326 -30 -316Z" fill="${col}"/><circle cx="-16" cy="-326" r="4" fill="#c9a45c"/><path d="M-30 -316 Q0 -322 30 -318" stroke="${dk}" stroke-width="3" fill="none"/>`;
}
