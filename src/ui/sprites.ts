// Top-down figures for everyone on the tactical map, drawn in code, and the bookkeeping that animates them: where
// each unit is drawn while it slides between tiles, which way it faces, when it last fired or was hit.
// The shapes that identify a side (circle, rounded square, diamond, square) are kept as rings under each figure.
import { TS } from "../core/grid";
import type { Unit } from "../game/types";
import type { WeaponType } from "../data/weapons";

export type Head = "helmet" | "cap" | "bald" | "hair" | "hat" | "balaclava" | "beret" | "mask" | "hood";
export interface Look {
  body: string; trim: string; skin: string; head: Head; headColor: string;
  weapon: WeaponType | "pistol" | null;
  bulky?: boolean; pack?: string; armband?: string; goggles?: boolean; coat?: boolean; fists?: boolean; reach?: boolean;
  /** Operators (tactical overhaul): helmet pattern for the era, camouflage blotches, what they wear over the
   *  uniform, and the kit on their back or hip, all read from the unit's actual loadout. */
  helmet?: "m1" | "pasgt" | "modern"; camo?: string[]; vest?: "webbing" | "flak" | "plate" | "smock" | "carrier";
  back?: "tanks" | "tube" | "radio" | "stretcher"; hip?: "case" | "charge" | "tags"; nvg?: boolean; shield?: boolean;
}
/** The campaign year the mission takes place in: uniforms and helmets follow it. */
let ERA_YEAR = 1951;
export function setEra(year: number) { ERA_YEAR = year || 1951; }
/** Uniform, helmet and webbing by period (temporary art: drawn in code, replaceable by sprite sheets per layer). */
function eraKit(): { body: string; trim: string; helmet: "m1" | "pasgt" | "modern"; headColor: string; camo?: string[]; vest: "webbing" | "carrier"; nvg?: boolean } {
  const y = ERA_YEAR;
  if (y < 1970) return { body: "#5b6045", trim: "#40452f", helmet: "m1", headColor: "#4c5238", vest: "webbing" };
  if (y < 1983) return { body: "#55603f", trim: "#3b432b", helmet: "m1", headColor: "#47502f", vest: "webbing" };
  if (y < 2005) return { body: "#4d5a3a", trim: "#33402a", helmet: "pasgt", headColor: "#4a5535", camo: ["#2d3a22", "#6b6040", "#1e1f17"], vest: y < 1995 ? "webbing" : "carrier" };
  return { body: "#3d4240", trim: "#262a29", helmet: "modern", headColor: "#3a3e3a", camo: y < 2015 ? ["#585f4c", "#2b302a"] : undefined, vest: "carrier", nvg: true };
}

// ---------- animation state ----------
interface Anim { x: number; y: number; fromX: number; fromY: number; toX: number; toY: number; t0: number; dur: number; ang: number; fired: number; hit: number; tx: number; ty: number; flinch: number; reload: number }
const anims = new Map<string, Anim>();
let seenEffects = new WeakSet<object>();
export function resetAnims() { anims.clear(); seenEffects = new WeakSet(); }

const MOVE_MS = 70;
/** Where to draw a unit now and which way it faces, sliding it toward the tile it has moved to. */
export function placeOf(u: Unit, now: number): { x: number; y: number; ang: number; moving: boolean; a: Anim } {
  const tx = u.x * TS + TS / 2, ty = u.y * TS + TS / 2;
  let a = anims.get(u.id);
  if (!a) { a = { x: tx, y: ty, fromX: tx, fromY: ty, toX: tx, toY: ty, t0: 0, dur: 0, ang: defaultFacing(u), fired: -1e9, hit: -1e9, tx, ty, flinch: -1e9, reload: -1e9 }; anims.set(u.id, a); }
  if (a.tx !== tx || a.ty !== ty) {
    const dist = Math.hypot(tx - a.x, ty - a.y);
    a.ang = Math.atan2(ty - a.ty, tx - a.tx);
    // a step to the next tile slides; anything longer (SCP-173 between blinks, a teleport) is instant
    if (dist <= TS * 1.6) { a.fromX = a.x; a.fromY = a.y; a.toX = tx; a.toY = ty; a.t0 = now; a.dur = MOVE_MS; }
    else { a.x = a.fromX = a.toX = tx; a.y = a.fromY = a.toY = ty; a.dur = 0; }
    a.tx = tx; a.ty = ty;
  }
  let moving = false;
  // Phase 4I: at rest, a unit faces the way it's facing in the rules (where it last moved, shot, glanced or was told to)
  if (!a.dur && u.facing !== undefined && now - a.fired > 450) a.ang = u.facing * Math.PI / 4;
  if (a.dur) {
    const k = Math.min(1, (now - a.t0) / a.dur);
    a.x = a.fromX + (a.toX - a.fromX) * k; a.y = a.fromY + (a.toY - a.fromY) * k;
    if (k >= 1) a.dur = 0; else moving = true;
  }
  return { x: a.x, y: a.y, ang: a.ang, moving, a };
}
const defaultFacing = (u: Unit) => u.side === "raider" ? Math.PI : u.side === "mtf" ? 0 : Math.PI / 2;

/** Read new tracer and damage effects: the shooter turns to face the target and flashes; whoever was hit flinches.
 *  An effect set to start later (a hit landing when its tracer arrives) is read when its moment comes. */
type Fx = { type: string; t0: number; x0?: number; y0?: number; x1?: number; y1?: number; x?: number; y?: number; text?: string; cue?: string };
export function noteEffects(effects: readonly Fx[], units: Unit[], onNew?: (e: Fx, by?: Unit) => void, now = performance.now()) {
  for (const e of effects) {
    if (seenEffects.has(e) || e.t0 > now) continue;
    seenEffects.add(e);
    if (e.type === "line") {
      const s = nearest(units, e.x0!, e.y0!, TS * 0.8);
      if (s) { const a = anims.get(s.id); if (a) { a.ang = Math.atan2(e.y1! - e.y0!, e.x1! - e.x0!); a.fired = e.t0; } }
      onNew?.(e, s ?? undefined); continue;
    } else if (e.type === "text" && e.text && /^\d/.test(e.text)) {
      const v = nearest(units, e.x!, e.y! + 14, TS * 0.8);
      if (v) { const a = anims.get(v.id); if (a) a.hit = e.t0; }
    } else if (e.type === "text" && (e.text === "MISS" || e.text === "COVER")) {
      // a near miss: the target ducks
      const v = nearest(units, e.x!, e.y! + 14, TS * 0.8);
      if (v) { const a = anims.get(v.id); if (a) a.flinch = e.t0; }
    } else if (e.type === "cue" && e.cue === "reload") {
      const v = nearest(units, e.x!, e.y!, TS * 0.6);
      if (v) { const a = anims.get(v.id); if (a) a.reload = e.t0; }
    }
    onNew?.(e);
  }
}
function nearest(units: Unit[], x: number, y: number, max: number) {
  let best: Unit | null = null, bd = max;
  for (const u of units) { if (!u.alive && u.side !== "mtf") continue; const d = Math.hypot(u.x * TS + TS / 2 - x, u.y * TS + TS / 2 - y); if (d < bd) { bd = d; best = u; } }
  return best;
}
export const animOf = (id: string) => anims.get(id);

// ---------- looks ----------
const hash = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const SKINS = ["#e3bc96", "#d1a17a", "#b9825c", "#8d5a3b", "#6b4430", "#f0cfaa"];
const CIV = ["#5b4636", "#3f4f63", "#5a5f45", "#6d3c35", "#4a4a52", "#7a6748"];
const HAIR = ["#2b211a", "#4a3626", "#7a5a34", "#a68a5c", "#1b1b1b", "#8a8a8a"];

export function lookFor(u: Unit): Look {
  const h = hash(u.id + u.name), skin = SKINS[h % SKINS.length];
  const gunType = (u.gun?.type ?? null) as WeaponType | null;
  if (u.side === "mtf" && u.guard) return { body: "#4f5d6e", trim: "#36414e", skin, head: "cap", headColor: "#2f3a46", weapon: gunType ?? "carbine" };
  if (u.side === "mtf" && u.opId?.startsWith("nu7-")) return { body: "#2c2f33", trim: "#1c1e21", skin, head: "mask", headColor: "#1f2226", weapon: "mg", bulky: true, pack: "#3a3d42" };
  if (u.side === "mtf") {
    const k = u.armorKind, era = eraKit();
    const suited = k === "hazmat" || k === "leadsuit" || k === "contsuit";
    const suit = k === "hazmat" ? { body: "#b8a64a", trim: "#8c7d33", head: "mask" as Head, headColor: "#9a8a3a" }
      : k === "leadsuit" ? { body: "#6c7076", trim: "#4d5156", head: "mask" as Head, headColor: "#55595e" }
      : k === "contsuit" ? { body: "#c9c6b8", trim: "#8f8c80", head: "mask" as Head, headColor: "#a9a698" }
      : { body: era.body, trim: era.trim, head: "helmet" as Head, headColor: era.headColor };
    const ids = (u.items ?? []).filter(i => i.uses > 0 || i.id === "tracker").map(i => i.id);
    const has = (...l: string[]) => l.some(i => ids.includes(i as never));
    const back = has("flamer") ? "tanks" as const : has("bazooka", "law") ? "tube" as const : has("stretcher") ? "stretcher" as const
      : has("camera", "tracker") || u.specialty === "surveillance" || u.specialty === "forwardrecon" ? "radio" as const : undefined;
    const hip = has("sample_case") ? "case" as const : has("breach_charge", "demo_charge") ? "charge" as const : has("field_tags") ? "tags" as const : undefined;
    const vest = suited ? undefined : k === "armor_heavy" ? "plate" as const : k === "armor" ? "flak" as const : k === "armor_light" ? "smock" as const : era.vest;
    return { ...suit, skin, weapon: gunType ?? "rifle", bulky: k === "armor_heavy" || (u.armor ?? 0) >= 2, pack: back ? undefined : u.cls === "containment" ? "#3d4a52" : "#4a4632",
      armband: u.cls === "medic" ? "#e8e4d8" : undefined, goggles: u.goggles,
      helmet: suited ? undefined : era.helmet, camo: suited ? undefined : era.camo, vest, back, hip, nvg: !suited && era.nvg };
  }
  if (u.side === "raider") {
    const role = u.role as string | undefined;
    const base = { body: h % 2 ? "#2e3528" : "#3a3026", trim: "#1d211a", skin, weapon: (gunType ?? "rifle") as WeaponType };
    if (role === "commander") return { ...base, body: "#3b3a2c", head: "beret", headColor: "#7a2430", pack: undefined, armband: "#d8bf86" };
    if (role === "officer") return { ...base, head: "beret", headColor: "#3a4a30" };
    if (role === "sniper") return { ...base, head: "hood", headColor: "#3c4630", weapon: "marksman" };
    if (role === "demo") return { ...base, head: "balaclava", headColor: "#181a16", pack: "#8a5a2a" };
    return { ...base, head: "balaclava", headColor: "#181a16" };
  }
  if (u.side === "zombie" && u.rioter) return { body: "#d0732f", trim: "#9c5221", skin, head: "bald", headColor: skin, weapon: null, fists: true };
  if (u.side === "zombie") return { body: "#5d5a4d", trim: "#3c3a31", skin: "#8a9478", head: "bald", headColor: "#8a9478", weapon: null, reach: true };
  if (u.side === "civilian") {
    if (u.researcher || u.specialist) return { body: "#d8d8d0", trim: "#a9a99f", skin, head: "hair", headColor: HAIR[h % HAIR.length], weapon: null, coat: true, pack: u.specialist === "amnestics" ? "#7a2f2a" : undefined };
    return { body: CIV[h % CIV.length], trim: "#2a2622", skin, head: h % 3 === 0 ? "hat" : "hair", headColor: h % 3 === 0 ? "#3a3128" : HAIR[(h >> 3) % HAIR.length], weapon: null };
  }
  // D-Class: orange jumpsuits, heads shaved
  return { body: "#d0732f", trim: "#9c5221", skin, head: "bald", headColor: skin, weapon: null };
}

// ---------- drawing ----------
const GUN: Record<WeaponType | "pistol", { len: number; w: number; stock?: boolean; scope?: boolean; bipod?: boolean }> = {
  rifle: { len: 15, w: 2.4, stock: true }, marksman: { len: 17, w: 2.2, stock: true, scope: true }, shotgun: { len: 13, w: 3, stock: true },
  mg: { len: 16, w: 3.4, bipod: true }, carbine: { len: 12, w: 2.2, stock: true }, smg: { len: 9, w: 2.8 }, pistol: { len: 5, w: 2 },
};

/** A person seen from above, facing `ang` (0 = east). `hurt` (0..1) tints and shakes them; `flash` is a muzzle flash.
 *  Phase 4G: `kick` pushes them back along their aim (recoil), `flinch` (0..1) ducks them aside, `raised` holds the
 *  weapon up and pushed forward (overwatch), `reloading` swaps the barrel for a magazine in the off hand, and
 *  `bloodied` marks the uniform of anyone under half health. */
export function drawPerson(ctx: CanvasRenderingContext2D, cx: number, cy: number, ang: number, look: Look,
  o: { hurt?: number; flash?: boolean; bob?: number; alpha?: number; kick?: number; flinch?: number; raised?: boolean; reloading?: boolean; bloodied?: boolean; seed?: number } = {}) {
  // A standing figure in three-quarter view: feet on the tile, body rising above it, turned the way the unit faces.
  // Temporary art drawn in layers (shadow, legs, back kit, torso, vest, arms and weapon, head), each a function, so
  // a sprite sheet per layer can replace any of them without touching the rules.
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  const shake = o.hurt ? Math.sin(performance.now() / 18) * 1.4 * o.hurt : 0;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  if (o.kick) { cx -= dx * o.kick; cy -= dy * o.kick * 0.5; }
  if (o.flinch) { cx += Math.sin(o.flinch * Math.PI) * 2.4 * (dx >= 0 ? -1 : 1); }
  const view: "side" | "front" | "back" = dy > 0.72 ? "front" : dy < -0.72 ? "back" : "side";
  const flip = view === "side" ? (dx >= 0 ? 1 : -1) : (dx >= 0 ? 1 : -1);
  const feetY = cy + 11 + (o.bob ?? 0) * 0.3;
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.42)"; ctx.beginPath(); ctx.ellipse(cx + 1.5, feetY, 9.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(cx + shake, feetY); ctx.scale(flip * 1.16, 1.16);
  const bulk = look.bulky ? 1.18 : 1, tw = 10 * bulk, hipY = -12, shY = -27, headY = -32;
  const trousers = shade(look.body, -18), boots = "#1b1915";
  const stride = Math.sin(performance.now() / 120) * (o.bob ? 2.2 : 0);
  // legs
  ctx.fillStyle = trousers;
  if (view === "side") { leg(ctx, -2 + stride * 0.5, hipY, 3.4, boots); leg(ctx, 1.6 - stride * 0.5, hipY, 3.4, boots); }
  else { leg(ctx, -3.4, hipY, 3.6, boots); leg(ctx, 0.4, hipY, 3.6, boots); }
  // what's carried on the back shows behind the body from the front and side, over it from behind
  if (view !== "back") backKitFig(ctx, look, view, tw, shY, hipY);
  // torso
  ctx.fillStyle = look.body; ctx.strokeStyle = look.trim; ctx.lineWidth = 1;
  roundRect(ctx, -tw / 2, shY, tw, hipY - shY + 1, 3); ctx.fill(); ctx.stroke();
  if (look.camo) { ctx.save(); roundRect(ctx, -tw / 2, shY, tw, hipY - shY + 1, 3); ctx.clip(); look.camo.forEach((c, i) => { ctx.fillStyle = c; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(-tw / 2 + ((i * 5 + k * 4) % tw), shY + 2 + ((i * 7 + k * 5) % 13), 2.4, 1.4, i + k, 0, Math.PI * 2); ctx.fill(); } }); ctx.restore(); }
  if (look.coat) { ctx.fillStyle = look.body; ctx.fillRect(-tw / 2 - 0.5, hipY - 1, tw + 1, 6); ctx.strokeStyle = look.trim; ctx.beginPath(); ctx.moveTo(0, shY + 3); ctx.lineTo(0, hipY + 5); ctx.stroke(); }
  vestFig(ctx, look, view, tw, shY, hipY);
  if (look.armband) { ctx.fillStyle = look.armband; ctx.fillRect(view === "side" ? -2 : tw / 2 - 2, shY + 3, 3.4, 2.6); ctx.fillStyle = "#b8322c"; ctx.fillRect((view === "side" ? -2 : tw / 2 - 2) + 1.1, shY + 3.4, 1.2, 1.8); }
  if (o.bloodied) { const s = o.seed ?? 0; ctx.fillStyle = "rgba(125,20,22,0.85)"; ctx.beginPath(); ctx.ellipse(-1 + (s % 3), shY + 6 + (s % 4), 2.4, 1.9, 0.4, 0, Math.PI * 2); ctx.fill(); }
  if (view === "back") backKitFig(ctx, look, view, tw, shY, hipY);
  // arms and the weapon
  armsAndWeapon(ctx, look, view, tw, shY, o);
  // head
  headFig(ctx, look, view, headY);
  ctx.restore();
  if (o.hurt) { ctx.save(); ctx.globalAlpha = 0.4 * o.hurt; ctx.fillStyle = "#d75b47"; ctx.beginPath(); ctx.ellipse(cx, cy - 4, 9, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}
function shade(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
  const n = parseInt(m[1], 16), c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function leg(ctx: CanvasRenderingContext2D, x: number, hipY: number, w: number, boots: string) {
  const cloth = ctx.fillStyle;
  ctx.fillRect(x, hipY, w, -hipY - 2.4);
  ctx.fillStyle = boots; ctx.fillRect(x - 0.4, -2.8, w + 1.4, 2.8); ctx.fillStyle = cloth;
}
function backKitFig(ctx: CanvasRenderingContext2D, look: Look, view: string, tw: number, shY: number, hipY: number) {
  const b = look.back, behind = view === "back" ? 0 : view === "side" ? -tw / 2 - 1 : 0;
  ctx.save();
  if (look.pack && !b) { ctx.fillStyle = look.pack; if (view === "side") ctx.fillRect(behind - 3.6, shY + 2, 4.4, 10); else if (view === "back") { ctx.fillRect(-4.5, shY + 2, 9, 10); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-4.5, shY + 6, 9, 1); } }
  if (b === "tanks") {
    const xs = view === "side" ? [behind - 4] : [-3.6, 3.6];
    for (const x of xs) { ctx.fillStyle = "#6b6a52"; roundRect(ctx, x - 2.6, shY - 1, 5.2, hipY - shY + 1, 2.4); ctx.fill(); ctx.strokeStyle = "#3b3a2c"; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x - 1.6, shY + 1, 1, hipY - shY - 4); }
    if (view !== "back") { ctx.strokeStyle = "#1e1f21"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(behind - 3, hipY); ctx.quadraticCurveTo(2, hipY + 4, 6, shY + 10); ctx.stroke(); }
  } else if (b === "tube") {
    ctx.save(); ctx.translate(view === "side" ? behind : 0, shY + 6); ctx.rotate(view === "front" ? 0.9 : -0.75);
    ctx.fillStyle = "#4a4f3a"; ctx.fillRect(-12, -1.9, 24, 3.8); ctx.fillStyle = "#2a2d22"; ctx.fillRect(-12, -1.9, 2.6, 3.8); ctx.fillRect(9.4, -1.9, 2.6, 3.8); ctx.restore();
  } else if (b === "radio") {
    const x = view === "side" ? behind - 4.5 : -4; ctx.fillStyle = "#3c4232"; ctx.fillRect(x, shY + 1, view === "side" ? 5 : 8, 9); ctx.fillStyle = "#23261d"; ctx.fillRect(x, shY + 4, view === "side" ? 5 : 8, 1.2);
    ctx.strokeStyle = "#1a1b17"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 1.5, shY + 1); ctx.lineTo(x - 2, shY - 16); ctx.stroke();
  } else if (b === "stretcher") {
    const x = view === "side" ? behind - 3.6 : -2; ctx.fillStyle = "#8a7d58"; ctx.fillRect(x, shY - 6, 3.6, 22); ctx.fillStyle = "#5e5338"; ctx.fillRect(x, shY - 6, 3.6, 1.5); ctx.fillRect(x, shY + 14.5, 3.6, 1.5);
  }
  ctx.restore();
}
function vestFig(ctx: CanvasRenderingContext2D, look: Look, view: string, tw: number, shY: number, hipY: number) {
  const v = look.vest, x0 = -tw / 2, h = hipY - shY;
  ctx.save();
  if (v === "webbing") {
    ctx.strokeStyle = "rgba(38,36,24,.9)"; ctx.lineWidth = 1.2; ctx.beginPath();
    if (view === "side") { ctx.moveTo(-1, shY + 1); ctx.lineTo(1.5, hipY - 2); } else { ctx.moveTo(x0 + 2, shY + 1); ctx.lineTo(x0 + 3.5, hipY - 2); ctx.moveTo(-x0 - 2, shY + 1); ctx.lineTo(-x0 - 3.5, hipY - 2); }
    ctx.stroke(); ctx.fillStyle = "#4a4632"; ctx.fillRect(x0, hipY - 3, tw, 2.6); ctx.fillStyle = "#3a3626"; for (const px of view === "side" ? [1] : [x0 + 1.4, -x0 - 4.4]) ctx.fillRect(px, hipY - 6, 3, 3.2);
  } else if (v === "flak") {
    ctx.fillStyle = "rgba(34,38,28,.72)"; roundRect(ctx, x0 + 0.8, shY + 1.5, tw - 1.6, h - 3, 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 0.6; ctx.beginPath(); for (let y = shY + 4; y < hipY - 3; y += 2.6) { ctx.moveTo(x0 + 1.5, y); ctx.lineTo(-x0 - 1.5, y); } ctx.stroke();
  } else if (v === "plate") {
    ctx.fillStyle = "#4b5258"; roundRect(ctx, x0 + 0.3, shY + 1, tw - 0.6, h - 1.5, 1.5); ctx.fill(); ctx.strokeStyle = "#2b3034"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = "#59616a"; for (const px of view === "side" ? [0] : [x0 - 1, -x0 + 1]) { ctx.beginPath(); ctx.ellipse(px, shY + 1.5, 3.4, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } else if (v === "carrier") {
    ctx.fillStyle = "rgba(30,32,30,.8)"; ctx.fillRect(x0 + 1, shY + 2, tw - 2, h - 4);
    ctx.fillStyle = "#3a3c34"; for (const px of view === "side" ? [0] : [x0 + 1.6, -1.2, -x0 - 4]) ctx.fillRect(px, hipY - 7, 2.6, 3.6);
  } else if (v === "smock") { ctx.fillStyle = "rgba(95,92,64,.5)"; ctx.fillRect(x0, shY + 1, tw, h + 3); }
  if (look.hip === "case") { ctx.fillStyle = "#8a8f94"; ctx.fillRect(view === "side" ? -5 : x0 - 2.5, hipY - 2, 5, 4); ctx.strokeStyle = "#3c4044"; ctx.lineWidth = 0.6; ctx.strokeRect(view === "side" ? -5 : x0 - 2.5, hipY - 2, 5, 4); }
  else if (look.hip === "charge") { ctx.fillStyle = "#7a6a3a"; ctx.fillRect(view === "side" ? -4 : -x0 - 2, hipY - 4.5, 4.4, 3); ctx.fillStyle = "#c33"; ctx.fillRect(view === "side" ? -1 : -x0 + 1, hipY - 4, 0.9, 0.9); }
  else if (look.hip === "tags") { ctx.fillStyle = "#e0c060"; ctx.fillRect(view === "side" ? -3 : x0 + 1, hipY - 2, 2.2, 2.6); }
  ctx.restore();
}
function armsAndWeapon(ctx: CanvasRenderingContext2D, look: Look, view: string, tw: number, shY: number, o: { flash?: boolean; raised?: boolean; reloading?: boolean }) {
  const sleeve = shade(look.body, -8), y = shY + (o.raised ? 5 : 7);
  ctx.save();
  if (look.reach || look.fists) {
    ctx.fillStyle = sleeve; const len = look.reach ? 10 : 6;
    if (view === "side") ctx.fillRect(0, shY + 3, len, 3); else { ctx.fillRect(-tw / 2 - 2.6, shY + 2, 3, look.reach ? 8 : 9); ctx.fillRect(tw / 2 - 0.4, shY + 2, 3, look.reach ? 8 : 9); }
    ctx.fillStyle = look.skin; ctx.beginPath(); if (view === "side") ctx.arc(len, shY + 4.5, 1.8, 0, Math.PI * 2); else { ctx.arc(-tw / 2 - 1.1, shY + 11, 1.7, 0, Math.PI * 2); ctx.arc(tw / 2 + 1.1, shY + 11, 1.7, 0, Math.PI * 2); } ctx.fill();
    ctx.restore(); return;
  }
  const g = look.weapon ? GUN[look.weapon] : null;
  if (!g) {
    ctx.fillStyle = sleeve; ctx.fillRect(-tw / 2 - 2.4, shY + 2, 2.8, 10); ctx.fillRect(tw / 2 - 0.4, shY + 2, 2.8, 10);
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(-tw / 2 - 1, shY + 12.5, 1.6, 0, Math.PI * 2); ctx.arc(tw / 2 + 1, shY + 12.5, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); return;
  }
  const len = g.len * 1.05, wood = "#6b4a2a", metal = "#1e1f21";
  if (view === "side") {
    // shouldered, pointing the way they face
    const ang = o.reloading ? 0.55 : o.raised ? -0.04 : 0.12;
    ctx.translate(-1, y); ctx.rotate(ang);
    if (g.stock) { ctx.fillStyle = wood; ctx.fillRect(-4, -0.4, 6, g.w + 0.6); }
    ctx.fillStyle = metal; ctx.fillRect(1, 0, len, g.w * 0.8);
    if (g.scope) { ctx.fillStyle = "#3a3d40"; ctx.fillRect(4, -1.8, 6, 1.6); }
    if (g.bipod) { ctx.strokeStyle = metal; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(len - 2, g.w); ctx.lineTo(len - 4, g.w + 5); ctx.moveTo(len - 2, g.w); ctx.lineTo(len, g.w + 5); ctx.stroke(); }
    ctx.fillStyle = sleeve; ctx.fillRect(-1.5, -1, 5.5, 3); ctx.fillRect(3, 0.5, 6, 2.6);
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(4.5, 2.4, 1.6, 0, Math.PI * 2); ctx.arc(9.5, 2.2, 1.6, 0, Math.PI * 2); ctx.fill();
    if (o.reloading) { ctx.fillStyle = "#3a3d40"; ctx.fillRect(6, 3, 2.4, 4); }
    if (o.flash) { const tip = 1 + len; ctx.fillStyle = "rgba(255,226,140,0.95)"; ctx.beginPath(); ctx.moveTo(tip, 0.4); ctx.lineTo(tip + 8, -1.6); ctx.lineTo(tip + 3, 1); ctx.lineTo(tip + 8, 3.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,170,60,0.6)"; ctx.beginPath(); ctx.arc(tip + 1, 1, 3, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // front or back: the weapon carried across the chest at port arms
    ctx.translate(0, y + 1); ctx.rotate(view === "front" ? -0.62 : 0.62);
    if (view === "back") { ctx.fillStyle = metal; ctx.fillRect(-len / 2, -0.6, len, g.w * 0.75); }
    else {
      if (g.stock) { ctx.fillStyle = wood; ctx.fillRect(-len / 2 - 3, -0.5, 5, g.w + 0.4); }
      ctx.fillStyle = metal; ctx.fillRect(-len / 2 + 1, -0.6, len, g.w * 0.8);
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(-2, 1.4, 1.6, 0, Math.PI * 2); ctx.arc(4, 1.2, 1.6, 0, Math.PI * 2); ctx.fill();
      if (o.flash) { ctx.fillStyle = "rgba(255,226,140,0.95)"; ctx.beginPath(); ctx.arc(len / 2 + 2, 0.5, 3.2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.rotate(view === "front" ? 0.62 : -0.62);
    ctx.fillStyle = sleeve; ctx.fillRect(-tw / 2 - 2.2, -8, 2.8, 8); ctx.fillRect(tw / 2 - 0.6, -8, 2.8, 8);
  }
  ctx.restore();
}
function headFig(ctx: CanvasRenderingContext2D, look: Look, view: string, y: number) {
  const r = 4.3;
  ctx.save();
  // neck and face
  ctx.fillStyle = shade(look.skin, -20); ctx.fillRect(-1.4, y + 3, 2.8, 2.4);
  const masked = look.head === "mask" || look.head === "balaclava" || look.head === "hood";
  ctx.fillStyle = masked ? look.headColor : look.skin; ctx.beginPath(); ctx.ellipse(0, y, r, r + 0.4, 0, 0, Math.PI * 2); ctx.fill();
  if (!masked && view !== "back") { ctx.fillStyle = "rgba(20,16,12,.7)"; if (view === "side") ctx.fillRect(2, y - 0.6, 1.1, 1.1); else { ctx.fillRect(-1.8, y - 0.6, 1.1, 1.1); ctx.fillRect(0.8, y - 0.6, 1.1, 1.1); } }
  switch (look.head) {
    case "helmet": {
      const col = look.headColor, kind = look.helmet ?? "m1";
      ctx.fillStyle = col;
      if (kind === "m1") { ctx.beginPath(); ctx.ellipse(0, y - 1.6, r + 1.4, r + 0.6, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r - 2.6, y - 1.9, (r + 2.6) * 2, 1.6); ctx.strokeStyle = "rgba(20,22,14,.5)"; ctx.lineWidth = 0.45; ctx.beginPath(); for (let k = -4; k <= 4; k += 2) { ctx.moveTo(k, y - 6.2); ctx.lineTo(k * 1.15, y - 2); } ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(0, y - 1.2, r + 1.2, r + 0.8, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r - 1.2, y - 1.6, (r + 1.2) * 2, 2.2); if (kind === "pasgt") { ctx.fillStyle = "#2d3a22"; ctx.beginPath(); ctx.ellipse(-1.5, y - 3.5, 1.8, 1, 0.4, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = "#24272a"; ctx.fillRect(-r - 1.2, y - 2.6, 2, 2.4); ctx.fillRect(r - 0.8, y - 2.6, 2, 2.4); } }
      if (look.nvg && view !== "back") { ctx.fillStyle = "#1b1d1f"; ctx.fillRect(view === "side" ? r - 1 : -1.5, y - 6.6, 3, 2.6); }
      ctx.fillStyle = "rgba(255,255,255,.13)"; ctx.beginPath(); ctx.ellipse(-1.6, y - 4, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "cap": ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.ellipse(0, y - 2, r + 0.4, 2.8, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r, y - 2.4, r * 2, 1.4); if (view === "side") ctx.fillRect(r - 1, y - 1.6, 3.2, 1.2); ctx.fillStyle = "#c9a35a"; if (view === "front") ctx.fillRect(-0.8, y - 3.6, 1.6, 1.4); break;
    case "mask":
      if (view !== "back") { ctx.fillStyle = "rgba(170,200,210,0.7)"; if (view === "side") ctx.fillRect(1.6, y - 1.6, 2, 1.8); else { ctx.fillRect(-2.8, y - 1.6, 2, 1.8); ctx.fillRect(0.8, y - 1.6, 2, 1.8); } ctx.fillStyle = "#1a1c1e"; ctx.beginPath(); ctx.arc(view === "side" ? r : 0, y + 2.4, 1.9, 0, Math.PI * 2); ctx.fill(); }
      break;
    case "balaclava": if (view !== "back") { ctx.fillStyle = look.skin; ctx.fillRect(view === "side" ? 0.6 : -2.6, y - 1.4, view === "side" ? 3 : 5.2, 2); } break;
    case "beret": ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.ellipse(-0.6, y - 3.4, r + 0.6, 2.2, -0.15, 0, Math.PI * 2); ctx.fill(); break;
    case "hood": ctx.fillStyle = shade(look.headColor, -10); ctx.beginPath(); ctx.ellipse(0, y - 0.6, r + 1, r + 1.2, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); if (view !== "back") { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(view === "side" ? 1 : -2, y - 1, 3, 2); } break;
    case "hat": ctx.fillStyle = look.headColor; ctx.fillRect(-r - 2, y - 2.8, (r + 2) * 2, 1.4); ctx.beginPath(); ctx.ellipse(0, y - 3.2, r - 0.4, 2.6, 0, Math.PI, 0); ctx.fill(); break;
    case "hair": ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.ellipse(view === "side" ? -0.8 : 0, y - 1.2, r + 0.2, r - 0.4, 0, Math.PI * (view === "back" ? 0 : 1), Math.PI * 2); ctx.fill(); break;
    default: ctx.fillStyle = "rgba(0,0,0,.1)"; ctx.beginPath(); ctx.ellipse(-1, y - 1, 3, 2.4, 0, Math.PI, 0); ctx.fill();
  }
  if (look.goggles && view !== "back") { ctx.fillStyle = "#7fd08a"; if (view === "side") ctx.fillRect(1.6, y - 1.6, 2.4, 1.8); else { ctx.fillRect(-3, y - 1.6, 2.2, 1.8); ctx.fillRect(0.8, y - 1.6, 2.2, 1.8); } }
  ctx.restore();
}

/** Someone lying where they fell: downed (still alive) or dead, with blood under the dead. */
export function drawFallen(ctx: CanvasRenderingContext2D, cx: number, cy: number, ang: number, look: Look, dead: boolean, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (dead) { ctx.fillStyle = "rgba(90,18,20,0.55)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 2, 11, 8, ang, 0, Math.PI * 2); ctx.fill(); }
  ctx.translate(cx, cy); ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = look.body; ctx.strokeStyle = look.trim; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 1, 5, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillRect(-7, -4, 3, 7); ctx.fillRect(4, -2, 3, 7);                   // arms flung out
  ctx.fillStyle = look.head === "helmet" || look.head === "mask" || look.head === "balaclava" || look.head === "cap" ? look.headColor : look.skin;
  ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill();
  if (look.weapon && !dead) { ctx.fillStyle = "#1e1f21"; ctx.fillRect(6, 2, 2.2, 12); }
  ctx.restore();
  if (look.weapon && dead) { ctx.save(); ctx.translate(cx + 9, cy + 6); ctx.rotate(ang + 0.9); ctx.fillStyle = "#1e1f21"; ctx.fillRect(-6, -1, 12, 2.2); ctx.restore(); }
}

/** The side's shape under each figure, so teams read at a glance as they did before the sprites. */
export function drawBase(ctx: CanvasRenderingContext2D, cx: number, cy: number, shape: "circle" | "square" | "rsquare" | "diamond", color: string, dashed = false) {
  ctx.save();
  // a ground ring at the figure's feet: the side's shape, faint fill, so the figure itself carries the read
  // flattened onto the floor under the figure's feet (three-quarter view)
  ctx.translate(cx, cy + 10); ctx.scale(1, 0.45);
  ctx.fillStyle = color; ctx.globalAlpha = 0.16;
  ctx.beginPath(); shapePath(ctx, 0, 0, shape, 14); ctx.fill();
  ctx.globalAlpha = 0.95; ctx.strokeStyle = color; ctx.lineWidth = 2.6; if (dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath(); shapePath(ctx, 0, 0, shape, 14); ctx.stroke();
  ctx.restore();
}
function shapePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, shape: string, r: number) {
  if (shape === "circle") ctx.arc(cx, cy, r, 0, Math.PI * 2);
  else if (shape === "rsquare") ctx.roundRect(cx - r + 1, cy - r + 1, (r - 1) * 2, (r - 1) * 2, 5);
  else if (shape === "square") ctx.rect(cx - r + 2, cy - r + 2, (r - 2) * 2, (r - 2) * 2);
  else { ctx.moveTo(cx, cy - r - 1); ctx.lineTo(cx + r + 1, cy); ctx.lineTo(cx, cy + r + 1); ctx.lineTo(cx - r - 1, cy); ctx.closePath(); }
}
/** A small badge in the corner of a unit: its squad slot, role letter or civilian mark. */
export function badge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, fg = "#0f1317") {
  ctx.fillStyle = bg; ctx.strokeStyle = "#0f1317"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fg; ctx.font = "700 7.5px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 0.5);
}

/** Objects that stand in for units: an Insurgent radio set, a crate of records. */
export function drawRadio(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(cx - 7, cy - 4, 16, 13);
  ctx.fillStyle = "#4a5238"; ctx.fillRect(cx - 9, cy - 6, 16, 12);
  ctx.fillStyle = "#2a2f22"; ctx.fillRect(cx - 7, cy - 4, 6, 8);
  ctx.fillStyle = "#d8bf86"; ctx.beginPath(); ctx.arc(cx + 2, cy - 1, 1.6, 0, Math.PI * 2); ctx.arc(cx + 4.5, cy + 2, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#a9b0a0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 5, cy - 6); ctx.lineTo(cx + 10, cy - 14); ctx.stroke();
  if (Math.floor(performance.now() / 500) % 2) { ctx.fillStyle = "#d75b47"; ctx.fillRect(cx - 6, cy + 2, 2, 2); }
}
export function drawRecords(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(cx - 7, cy - 5, 16, 14);
  ctx.fillStyle = "#7a6644"; ctx.fillRect(cx - 9, cy - 7, 16, 13);
  ctx.fillStyle = "#e3d9b8"; for (let k = 0; k < 4; k++) ctx.fillRect(cx - 7 + k * 3.4, cy - 9, 2.4, 6);
  ctx.fillStyle = "#3a2e1e"; ctx.fillRect(cx - 9, cy, 16, 1.5);
}
