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
    const k = u.armorKind;
    const suit = k === "hazmat" ? { body: "#b8a64a", trim: "#8c7d33", head: "mask" as Head, headColor: "#9a8a3a" }
      : k === "leadsuit" ? { body: "#6c7076", trim: "#4d5156", head: "mask" as Head, headColor: "#55595e" }
      : k === "contsuit" ? { body: "#c9c6b8", trim: "#8f8c80", head: "mask" as Head, headColor: "#a9a698" }
      : { body: "#5b6045", trim: "#40452f", head: "helmet" as Head, headColor: "#4c5238" };
    return { ...suit, skin, weapon: gunType ?? "rifle", bulky: k === "armor_heavy" || (u.armor ?? 0) >= 2, pack: u.cls === "containment" ? "#3d4a52" : "#4a4632",
      armband: u.cls === "medic" ? "#e8e4d8" : undefined, goggles: u.goggles };
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
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  const shake = o.hurt ? (Math.sin(performance.now() / 18) * 1.6 * o.hurt) : 0;
  if (o.kick) { cx -= Math.cos(ang) * o.kick; cy -= Math.sin(ang) * o.kick; }
  if (o.flinch) { const d = Math.sin(o.flinch * Math.PI) * 2.6; cx += Math.cos(ang + Math.PI / 2) * d; cy += Math.sin(ang + Math.PI / 2) * d; }
  ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 3, 9.5, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(cx + shake, cy + (o.bob ?? 0)); ctx.rotate(ang); ctx.scale(1.12, 1.12);
  const sw = look.bulky ? 10.5 : 9, sd = look.bulky ? 6.5 : 5.5;
  // pack on the back
  if (look.pack) { ctx.fillStyle = look.pack; ctx.fillRect(-sd - 3.5, -4.5, 4, 9); }
  // arms reaching forward (049-2) or fists up (rioters)
  if (look.reach || look.fists) {
    ctx.fillStyle = look.body;
    ctx.fillRect(1, -sw + 2, look.reach ? 10 : 7, 3); ctx.fillRect(1, sw - 5, look.reach ? 10 : 7, 3);
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(look.reach ? 11 : 8, -sw + 3.5, 2, 0, Math.PI * 2); ctx.arc(look.reach ? 11 : 8, sw - 3.5, 2, 0, Math.PI * 2); ctx.fill();
  }
  // shoulders and torso
  ctx.fillStyle = look.body; ctx.strokeStyle = look.trim; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, sd, sw, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(235,230,215,0.35)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, sd + 0.9, sw + 0.9, 0, 0, Math.PI * 2); ctx.stroke();
  if (look.coat) { ctx.strokeStyle = look.trim; ctx.beginPath(); ctx.moveTo(-sd + 1, 0); ctx.lineTo(sd - 1, 0); ctx.stroke(); }
  if (look.bulky) { ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(-2, -sw + 2, 4, sw * 2 - 4); }
  if (look.armband) { ctx.fillStyle = look.armband; ctx.fillRect(-1.5, sw - 3.2, 3.5, 2.4); }
  if (o.bloodied) {
    const s = o.seed ?? 0;
    ctx.fillStyle = "rgba(120,20,22,0.85)";
    ctx.beginPath(); ctx.ellipse(-1 + (s % 3) - 1, -sw * 0.35 + (s % 5) * 0.6, 2.4, 2, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, sw * 0.4 - (s % 4) * 0.5, 1.6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(150,28,30,0.7)"; ctx.fillRect(-sd + 1, -1 + (s % 3), 2.4, 1.6);
  }
  // the weapon, held in both hands out in front
  if (look.weapon && o.reloading) {
    // weapon dipped, the old magazine out and a fresh one in the other hand
    const g = GUN[look.weapon];
    ctx.save(); ctx.rotate(0.5);
    ctx.fillStyle = "#1e1f21"; ctx.fillRect(2, 1.8, g.len * 0.75, g.w * 0.8);
    ctx.restore();
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(3, 4.5, 1.8, 0, Math.PI * 2); ctx.arc(5, -4.5, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a3d40"; ctx.fillRect(4, -7.5, 2.6, 4.5);
  } else if (look.weapon) {
    const g = GUN[look.weapon];
    if (o.raised) ctx.translate(2.5, -0.6);
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(3.5, 3.2, 1.8, 0, Math.PI * 2); ctx.arc(7.5, 2.4, 1.8, 0, Math.PI * 2); ctx.fill();
    if (g.stock) { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-1, 1.6, 6, g.w); }
    ctx.fillStyle = "#1e1f21"; ctx.fillRect(3, 1.8, g.len, g.w * 0.8);
    if (g.scope) { ctx.fillStyle = "#3a3d40"; ctx.fillRect(5, 0.4, 6, 1.6); }
    if (g.bipod) { ctx.strokeStyle = "#1e1f21"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3 + g.len - 3, 3); ctx.lineTo(3 + g.len - 1, 6); ctx.moveTo(3 + g.len - 3, 2); ctx.lineTo(3 + g.len - 1, -1); ctx.stroke(); }
    if (o.flash) {
      const tip = 3 + g.len + 1;
      ctx.fillStyle = "rgba(255,226,140,0.95)"; ctx.beginPath();
      ctx.moveTo(tip, 2.2); ctx.lineTo(tip + 7, 0); ctx.lineTo(tip + 3, 2.2); ctx.lineTo(tip + 7, 4.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,170,60,0.6)"; ctx.beginPath(); ctx.arc(tip + 1, 2.2, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (o.raised) ctx.translate(-2.5, 0.6);
  }
  // head
  head(ctx, look);
  ctx.restore();
  if (o.hurt) { ctx.save(); ctx.globalAlpha = 0.45 * o.hurt; ctx.fillStyle = "#d75b47"; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

function head(ctx: CanvasRenderingContext2D, look: Look) {
  const hx = 0.8;
  switch (look.head) {
    case "helmet":
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx, 0, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(hx - 1.2, -1.4, 2.2, 0, Math.PI * 2); ctx.fill();
      break;
    case "cap":
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx, 0, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#151a20"; ctx.beginPath(); ctx.ellipse(hx + 4.2, 0, 2, 4, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = "#c9a35a"; ctx.fillRect(hx + 1.6, -0.8, 1.6, 1.6);
      break;
    case "mask":
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx, 0, 4.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1c1e"; ctx.beginPath(); ctx.arc(hx + 4.6, 0, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(170,200,210,0.6)"; ctx.fillRect(hx + 2.4, -3, 1.6, 2); ctx.fillRect(hx + 2.4, 1, 1.6, 2);
      break;
    case "balaclava":
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx, 0, 4.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = look.skin; ctx.fillRect(hx + 2.6, -2.4, 1.6, 4.8);
      break;
    case "beret":
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(hx, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.ellipse(hx - 0.8, -0.6, 4.2, 4.6, 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    case "hood":
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx - 0.5, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.arc(hx + 2, 0, 2.2, 0, Math.PI * 2); ctx.fill();
      break;
    case "hat":
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.arc(hx, 0, 3.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx, 0, 3.3, 0, Math.PI * 2); ctx.fill();
      break;
    case "hair":
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(hx, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = look.headColor; ctx.beginPath(); ctx.arc(hx - 1, 0, 4.2, Math.PI * 0.45, Math.PI * 1.55); ctx.fill();
      break;
    default:
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(hx, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.arc(hx - 1, 0, 3, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
  }
  if (look.goggles) { ctx.fillStyle = "#7fd08a"; ctx.beginPath(); ctx.arc(hx + 3.6, -1.6, 1.2, 0, Math.PI * 2); ctx.arc(hx + 3.6, 1.6, 1.2, 0, Math.PI * 2); ctx.fill(); }
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
  ctx.fillStyle = color; ctx.globalAlpha = 0.42;
  ctx.beginPath(); shapePath(ctx, cx, cy, shape, 13); ctx.fill();
  ctx.globalAlpha = 0.95; ctx.strokeStyle = color; ctx.lineWidth = 2; if (dashed) ctx.setLineDash([3, 3]);
  ctx.beginPath(); shapePath(ctx, cx, cy, shape, 13); ctx.stroke();
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
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fg; ctx.font = "700 8.5px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 0.5);
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
