// Draws the tactical map, units, sightlines, previews and effects onto the mission canvas.
import { CONT, DRUM, EXIT, FULL, HALF, L, STEEL, TS, WALL, area, floorOf, inContainer, passable, pathTo, tileAt, type Pt } from "../core/grid";
import { sightFrom } from "../core/sight";
import { canShoot, activeGun, center, coverAgainst, shotInfo } from "../game/combat";
import { S, canAct, canSee, isPanicked, isTeam, seen, team, unitAt } from "../game/state";
import { blastArea, dragOptions, moveCost, reachFor, throwOptions } from "../game/turn";
import { abilityTargets } from "../game/abilities";
import type { Unit } from "../game/types";
import { mapLayer, noise } from "./tiles";
import { audioSettings, sfx, transition } from "./audio";
import { createFx } from "./fxdraw";
import { bubbles, createLiving, mist } from "./living";
import { hidden939, inFace, isDown682, isNewScp, isTarget } from "../game/scp4b";
import type { Effect } from "../game/types";
import { animOf, badge, drawBase, drawFallen, drawPerson, drawRadio, drawRecords, lookFor, noteEffects, placeOf, resetAnims } from "./sprites";
import { escaping } from "../game/scp173";
import { detectRange } from "../game/insurgency";
import { freshBodies, isCalm, isStaggered, leadOptions } from "../game/scp049";
import { isFeeding } from "../game/scp106";

const C = {
  floor: "#222a32", floor2: "#252e37", wall: "#3a4551", wallTop: "#4b5866",
  desk: "#57503f", deskTop: "#6e6550", pillar: "#4a5561", pillarHatch: "#3c4550",
  door: "#8a7a55", exit: "#2b5440", steel: "#6f7f8e", steelDark: "#4f5c68",
  mtf: "#7aaad0", raider: "#b98bd3", subject: "#e0843f", concrete: "#bdb7ab",
  manila: "#d8bf86", alert: "#d75b47", ok: "#86c193",
};

/** Which floor is on screen, on maps with floors. */
export const view = { floor: 0 };
/** The rows the screen shows: the floor on view, or the whole map. */
export function viewRows() { const f = L.def.floors?.[view.floor]; return f ? { y0: f.y0, h: f.y1 - f.y0 + 1 } : { y0: 0, h: L.H }; }

export function createRenderer(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // Phase 4C: a map with floors shows one floor at a time (view.floor), drawn from its own rows
  const floorH = L.def.floors ? L.def.floors[0].y1 - L.def.floors[0].y0 + 1 : L.H;
  cv.width = L.W * TS * dpr; cv.height = floorH * TS * dpr;
  view.floor = L.def.floors && S.units.some(u => u.side === "mtf") ? floorOf(S.units.find(u => u.side === "mtf")!.y) : 0;
  resetAnims();
  const fxr = createFx(), living = createLiving();

  function drawTiles() {
    ctx.drawImage(mapLayer(dpr), 0, 0, L.W * TS, L.H * TS);
    // container door frame along its open (north) side
    if (!L.contTiles.length) return;
    const [x0, y0] = L.contTiles[0], x1 = Math.max(...L.contTiles.map(t => t[0]));
    ctx.strokeStyle = S.sealed ? C.ok : C.manila; ctx.lineWidth = S.sealed ? 4 : 2;
    ctx.setLineDash(S.sealed ? [] : [4, 4]);
    ctx.beginPath(); ctx.moveTo(x0 * TS, y0 * TS + 1); ctx.lineTo((x1 + 1) * TS, y0 * TS + 1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e7ecf0"; ctx.font = "9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(S.setup.kind === "raid" ? "LIFT" : "CONTAINER", (x0 + x1 + 1) / 2 * TS, (y0 + 2) * TS - 5);
  }

  function drawFog() {
    for (let i = 0; i < L.W * L.H; i++) {
      if (S.vis[i]) continue;
      ctx.fillStyle = S.explored[i] ? "rgba(8,10,13,0.5)" : "rgba(8,10,13,0.94)";
      ctx.fillRect((i % L.W) * TS, ((i / L.W) | 0) * TS, TS, TS);
    }
  }

  // SCP-173: the concrete figure, front-on, with rebar and spray-paint marks, on its own shadow
  function drawStatueAt(cx: number, cy: number, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 13, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0); g.addColorStop(0, "#cfc9bd"); g.addColorStop(1, "#9d978b");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 13); ctx.lineTo(cx - 7.5, cy - 3); ctx.quadraticCurveTo(cx, cy - 5, cx + 7.5, cy - 3); ctx.lineTo(cx + 6, cy + 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy - 8.5, 5.5, 6.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6b5a48"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy - 1); ctx.lineTo(cx - 11, cy + 6); ctx.moveTo(cx + 7, cy - 1); ctx.lineTo(cx + 11, cy + 6); ctx.stroke();
    ctx.strokeStyle = "rgba(60,50,40,0.6)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - 2, cy + 2); ctx.lineTo(cx - 3, cy + 9); ctx.moveTo(cx + 3, cy - 1); ctx.lineTo(cx + 2, cy + 5); ctx.stroke();
    ctx.fillStyle = "#7a2f22"; ctx.fillRect(cx - 4, cy - 9.5, 3, 1.6); ctx.fillRect(cx + 1, cy - 9.5, 3, 1.6);
    ctx.fillStyle = "#3f6b45"; ctx.fillRect(cx - 4, cy + 2, 8, 2);
    ctx.globalAlpha = 1;
  }
  const drawStatue = (x: number, y: number, alpha: number) => drawStatueAt(x * TS + TS / 2, y * TS + TS / 2, alpha);
  // grit thrown up where SCP-173 lands after moving unseen
  let statueAt = "", puff: { x: number; y: number; t: number } | null = null;

  function drawEye(cx: number, cy: number) {
    ctx.fillStyle = "#0f1317"; ctx.beginPath(); ctx.ellipse(cx, cy, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.manila; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.manila; ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // The surface hatch SCP-173 can escape through, and the panel that locks it
  function drawHatch() {
    const def = L.def;
    if (!S.has173 || !def.hatch || !def.panel) return;
    const [hx, hy] = def.hatch, [px, py] = def.panel, locked = S.lockedUntil >= S.turn;
    ctx.fillStyle = locked ? "#4f5c68" : escaping() && !S.sealed ? "rgba(215,91,71,0.55)" : "#3b3226";
    ctx.fillRect(hx * TS + 3, hy * TS + 3, TS - 6, TS - 6);
    ctx.strokeStyle = locked ? C.ok : C.manila; ctx.lineWidth = 2;
    ctx.strokeRect(hx * TS + 3, hy * TS + 3, TS - 6, TS - 6);
    ctx.beginPath(); ctx.moveTo(hx * TS + 6, hy * TS + TS / 2); ctx.lineTo(hx * TS + TS - 6, hy * TS + TS / 2); ctx.stroke();
    ctx.fillStyle = locked ? C.ok : C.alert;
    ctx.fillRect(px * TS + TS / 2 - 5, py * TS + 4, 10, 7);
    ctx.fillStyle = "#0f1317"; ctx.fillRect(px * TS + TS / 2 - 1, py * TS + 11, 2, 6);
  }

  // SCP-049 from above: a dark robe and hood, the pale beak of its mask pointing the way it faces
  function drawDoctor(cx: number, cy: number, ang: number) {
    mist(ctx, cx, cy, performance.now());
    drawBase(ctx, cx, cy, "circle", isCalm() ? C.ok : isStaggered() ? C.manila : C.alert);
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 3, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = "#1d1a18"; ctx.strokeStyle = "#3a332c"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-1, 0, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2a2521"; ctx.beginPath(); ctx.arc(1, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8dcc0"; ctx.beginPath(); ctx.moveTo(3, -2.6); ctx.lineTo(12, 0); ctx.lineTo(3, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0f1317"; ctx.beginPath(); ctx.arc(3.5, -2, 1, 0, Math.PI * 2); ctx.arc(3.5, 2, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-4, 7, 6, 4);   // the black bag
    ctx.restore();
    if (isCalm()) tag("CALM", cx, cy - 20, C.ok);
    else if (isStaggered()) tag("STAGGERED", cx, cy - 20, C.manila);
  }

  // SCP-106: a stooped, dark figure dripping rot, which sinks into the floor and rises out of it
  let sinking: { sub: boolean; t: number } = { sub: false, t: -1e9 };
  function drawOldMan(cx: number, cy: number, ang: number, now: number) {
    if (S.submerged !== sinking.sub) sinking = { sub: S.submerged, t: now };
    const k = Math.min(1, (now - sinking.t) / 700), scale = S.submerged ? 1 - k : k;
    // the black puddle it comes and goes through
    const pr = S.submerged ? 12 * (1 - k * 0.6) : 12 * Math.max(0.4, 1 - k * 0.4);
    ctx.fillStyle = "rgba(14,10,6,0.85)"; ctx.beginPath(); ctx.ellipse(cx, cy + 3, pr, pr * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    if (S.submerged) bubbles(ctx, cx, cy, now);
    if (scale <= 0.02) return;
    ctx.save(); ctx.translate(cx, cy + (1 - scale) * 6); ctx.scale(scale, scale); ctx.rotate(ang);
    ctx.fillStyle = "#2a2118"; ctx.strokeStyle = isFeeding() ? C.manila : C.alert; ctx.lineWidth = 2 / Math.max(0.3, scale);
    ctx.beginPath(); ctx.ellipse(-1, 0, 7, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3a2e22"; ctx.beginPath(); ctx.arc(3, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d8c690"; ctx.beginPath(); ctx.arc(6, -1.5, 1.1, 0, Math.PI * 2); ctx.arc(6, 1.5, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a2118"; ctx.fillRect(2, -11, 9, 3); ctx.fillRect(2, 8, 9, 3);   // long arms
    ctx.restore();
    // drips
    ctx.fillStyle = "rgba(28,22,14,0.8)";
    for (let i = 0; i < 3; i++) { const t = ((now / 900 + i / 3) % 1); ctx.beginPath(); ctx.arc(cx - 6 + i * 6, cy + 8 + t * 6, 1.4 * (1 - t), 0, Math.PI * 2); ctx.fill(); }
    if (isFeeding() && !S.submerged) tag("FEEDING · SEAL IT", cx, cy - 22, C.manila);
  }

  // SCP-610's instances: a lump of red flesh with grasping strands
  function drawFlesh(cx: number, cy: number, now: number) {
    const p = Math.sin(now / 260 + cx) * 0.8;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 3, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6e1f26"; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + now / 3000; ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a + 0.4) * 8, cy + Math.sin(a + 0.4) * 8, cx + Math.cos(a) * (12 + p), cy + Math.sin(a) * (12 + p)); } ctx.stroke();
    ctx.fillStyle = "#8c2c34"; ctx.beginPath(); ctx.ellipse(cx, cy, 8 + p, 7 - p, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b5464e"; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
  }

  // ---- Phase 4B figures ----
  function drawNew(u: Unit, cx: number, cy: number, ang: number, now: number) {
    if (S.scp === "035" && S.maskHost) return;   // worn: the host is drawn instead
    // the same kind of ring the other anomalies stand on: red while dangerous, green once it's handled
    const safe = S.sealed || S.hooded || isDown682();
    drawBase(ctx, cx, cy, S.scp === "012" || S.scp === "035" ? "square" : "circle", safe ? C.ok : S.scp === "012" || S.scp === "035" ? C.manila : C.alert);
    ctx.save();
    if (S.scp === "096") {
      // pale and impossibly thin, folded over, hands to its face; the hood if it's on
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 3, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(cx, cy); ctx.rotate(ang);
      const shake = S.rage && S.turn <= S.rage.scream ? Math.sin(now / 25) * 1.2 : 0;
      ctx.translate(shake, 0);
      ctx.fillStyle = "#e2ddd2"; ctx.strokeStyle = "#a9a497"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(-1, 0, 5, 7.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#d9d4c8"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(9, -3); ctx.moveTo(1, 6); ctx.lineTo(9, 3); ctx.stroke();
      ctx.fillStyle = S.hooded ? "#6b5a3e" : "#ece7dc"; ctx.beginPath(); ctx.ellipse(4, 0, 4.2, 4.8, 0, 0, Math.PI * 2); ctx.fill();
      if (!S.hooded) { ctx.fillStyle = S.rage ? "#5a1010" : "#2a1a18"; ctx.beginPath(); ctx.ellipse(7, 0, 1.4, S.rage ? 2.6 : 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (S.rage) tag(S.turn <= S.rage.scream ? "SCREAMING" : "ENRAGED", cx, cy - 20, C.alert);
      else if (S.hooded) tag("HOODED", cx, cy - 20, C.ok);
      return;
    }
    if (S.scp === "012") {
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(cx - 8, cy - 4, 18, 14);
      ctx.strokeStyle = "#3a3128"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 10); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 6, cy + 10); ctx.stroke();
      ctx.translate(cx, cy - 2); ctx.rotate(-0.1);
      ctx.fillStyle = "#e3d9b8"; ctx.fillRect(-9, -7, 18, 12);
      ctx.strokeStyle = "rgba(90,74,50,0.7)"; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(-7, -4 + k * 2.6); ctx.lineTo(7, -4 + k * 2.6); } ctx.stroke();
      const pulse = 0.6 + 0.4 * Math.sin(now / 300);
      ctx.strokeStyle = `rgba(150,24,28,${pulse})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-2, 1); ctx.lineTo(0, -4); ctx.lineTo(4, 2); ctx.stroke();
      ctx.restore();
      if (S.sealed) tag("SECURED", cx, cy - 18, C.ok);
      return;
    }
    if (S.scp === "035") {
      // the mask on the floor
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx + 1, cy + 3, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f0ece2"; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1a1714"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx - 2.2, cy - 1.5, 1.3, Math.PI, 0); ctx.arc(cx + 2.2, cy - 1.5, 1.3, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + 3, 2.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.strokeStyle = "rgba(90,74,56,0.8)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - 2.2, cy); ctx.lineTo(cx - 2.6, cy + 4 + Math.sin(now / 400)); ctx.moveTo(cx + 2.2, cy); ctx.lineTo(cx + 2.6, cy + 4 + Math.cos(now / 400)); ctx.stroke();
      ctx.restore();
      tag(S.sealed ? "CASED" : "THE MASK", cx, cy - 16, S.sealed ? C.ok : C.manila);
      return;
    }
    if (S.scp === "682") {
      const down = isDown682(), k = down ? 0.85 : 1;
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(cx + 3, cy + 4, 17, 12, ang, 0, Math.PI * 2); ctx.fill();
      ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(k * 1.2, k * 1.2);
      ctx.fillStyle = down ? "#4a3a2a" : "#455a34"; ctx.strokeStyle = "#2d3a24"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(-2, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-22, Math.sin(now / 300) * 4, -24, 3); ctx.lineWidth = 3; ctx.strokeStyle = "#3a4a2c"; ctx.stroke();
      ctx.fillStyle = "#3a4a2c"; for (const [lx, ly] of [[-8, -10], [6, -10], [-8, 10], [6, 10]]) ctx.fillRect(lx - 2, ly - 2, 5, 4);
      ctx.fillStyle = down ? "#4a3a2a" : "#506a3c"; ctx.beginPath(); ctx.ellipse(13, 0, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#d9d2b8"; ctx.beginPath(); ctx.moveTo(17, -3); ctx.lineTo(21, 0); ctx.lineTo(17, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e0c050"; ctx.beginPath(); ctx.arc(14, -2.5, 1.1, 0, Math.PI * 2); ctx.arc(14, 2.5, 1.1, 0, Math.PI * 2); ctx.fill();
      if (down) { ctx.fillStyle = "rgba(150,30,30,0.6)"; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (!down) { const w = 28, f = Math.max(0, u.hp / u.maxHp); ctx.fillStyle = "#0f1317"; ctx.fillRect(cx - w / 2 - 1, cy - 22, w + 2, 4); ctx.fillStyle = C.alert; ctx.fillRect(cx - w / 2, cy - 21, w * f, 2); }
      tag(down ? `DOWN · UP T${(S.downUntil ?? S.turn) + 1}` : `${u.hp} HP`, cx, cy - 28, down ? C.ok : C.alert);
      return;
    }
    ctx.restore();
  }
  /** The convoy's truck, seen from above, facing east. */
  function drawLorry(cx: number, cy: number, _ang: number) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(cx - 17, cy - 8, 38, 20);
    ctx.fillStyle = "#4a5238"; ctx.fillRect(cx - 19, cy - 11, 26, 22);           // the covered cargo bed
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; for (let k = -15; k < 7; k += 5) { ctx.beginPath(); ctx.moveTo(cx + k + 0.5, cy - 11); ctx.lineTo(cx + k + 0.5, cy + 11); ctx.stroke(); }
    ctx.fillStyle = "#5c6646"; ctx.fillRect(cx + 8, cy - 9, 10, 18);             // cab
    ctx.fillStyle = "rgba(170,200,210,0.6)"; ctx.fillRect(cx + 15, cy - 7, 3, 14); // windscreen
    ctx.fillStyle = "#d8bf86"; ctx.fillRect(cx - 4, cy - 2, 7, 4);
    ctx.restore();
    tag("TRANSFER", cx, cy - 19, C.manila);
  }
  function draw939(cx: number, cy: number, ang: number, now: number, hurt: number) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 3, 13, 8, ang, 0, Math.PI * 2); ctx.fill();
    ctx.translate(cx, cy); ctx.rotate(ang);
    const step = Math.sin(now / 160) * 1.5;
    ctx.fillStyle = "#5a1416"; for (const [lx, ly] of [[-6, -7], [5, -7], [-6, 7], [5, 7]]) ctx.fillRect(lx - 1.5 + (ly > 0 ? step : -step), ly - 1.5, 4, 3);
    ctx.fillStyle = hurt ? "#a53034" : "#7a1c1e"; ctx.strokeStyle = "#4a0f10"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-2, 0, 10, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(9, 0, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d9c9b0"; ctx.beginPath(); ctx.moveTo(12, -2.5); ctx.lineTo(15.5, 0); ctx.lineTo(12, 2.5); ctx.closePath(); ctx.fill();
    // a breath of its sedative haze
    const t = (now / 1400) % 1; ctx.fillStyle = `rgba(210,190,190,${0.25 * (1 - t)})`; ctx.beginPath(); ctx.arc(15 + t * 8, 0, 2 + t * 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    badge(ctx, cx + 10, cy + 10, "39", "#c2626a");
  }

  function hpBar(u: Unit, cx: number, cy: number) {
    const w = 20, frac = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = "#0f1317"; ctx.fillRect(cx - w / 2 - 1, cy - 20, w + 2, 4);
    ctx.fillStyle = u.side === "raider" || u.side === "zombie" ? C.alert : "#9cd0a6"; ctx.fillRect(cx - w / 2, cy - 19, w * frac, 2);
  }

  function drawUnit(u: Unit, now: number) {
    const p = placeOf(u, now), cx = p.x, cy = p.y;
    const hurt = Math.max(0, 1 - (now - p.a.hit) / 280), flash = now - p.a.fired < 110, bob = p.moving ? Math.sin(now / 35) * 0.8 : 0;
    // Phase 4G: recoil after firing, a duck aside from a near miss, the weapon down while reloading, blood when badly hurt
    const kick = Math.max(0, 1 - (now - p.a.fired) / 140) * 2.6, fl = now - p.a.flinch < 260 ? (now - p.a.flinch) / 260 : 0;
    const pose = { kick, flinch: fl, reloading: now - p.a.reload < 650, bloodied: u.hp > 0 && u.hp < u.maxHp / 2, seed: u.id.length + u.name.length };
    if (u.side === "anomaly" && S.has049) { drawDoctor(cx, cy, p.ang); return; }
    if (u.side === "anomaly" && S.has106) { drawOldMan(cx, cy, p.ang, now); return; }
    if (u.side === "anomaly" && isNewScp(S.scp)) { drawNew(u, cx, cy, p.ang, now); return; }
    if (u.voice) { draw939(cx, cy, p.ang, now, hurt); hpBar(u, cx, cy); return; }
    if (u.host) {
      drawBase(ctx, cx, cy, "circle", "#f0ece2");
      drawPerson(ctx, cx, cy, p.ang, { ...lookFor({ ...u, side: u.wasSide ?? "civilian" } as Unit), head: "mask", headColor: "#f0ece2" }, { hurt, bob });
      badge(ctx, cx + 10, cy + 10, "35", "#f0ece2");
      hpBar(u, cx, cy);
      return;
    }
    if (u.side === "anomaly") {
      const key = `${u.x},${u.y}`;
      if (statueAt && statueAt !== key) puff = { x: cx, y: cy, t: now };
      statueAt = key;
      if (puff && now - puff.t < 500) {
        const k = (now - puff.t) / 500; ctx.fillStyle = `rgba(190,184,170,${0.5 * (1 - k)})`;
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.arc(puff.x + Math.cos(a) * (6 + k * 10), puff.y + 10 + Math.sin(a) * (3 + k * 4), 2.2 * (1 - k) + 0.6, 0, Math.PI * 2); ctx.fill(); }
      }
      drawStatueAt(cx, cy, 1); return;
    }
    const look = lookFor(u);
    if (u.side === "zombie" && u.rioter) {
      drawBase(ctx, cx, cy, "circle", "#b8463b", true);
      drawPerson(ctx, cx, cy, p.ang, look, { hurt, bob });
      badge(ctx, cx + 9, cy + 9, "R", C.subject);
      hpBar(u, cx, cy);
      if (u.restrained) tag("CUFFED", cx, cy - 18, C.manila);
      return;
    }
    if (u.side === "zombie") {
      drawBase(ctx, cx, cy, "circle", u.flesh ? "#8c2c34" : "#6f7a5c");
      if (u.flesh) drawFlesh(cx, cy, now); else drawPerson(ctx, cx, cy, p.ang, look, { hurt, bob });
      badge(ctx, cx + 9, cy + 9, u.flesh ? "6" : "2", u.flesh ? "#c2626a" : "#9aa588");
      hpBar(u, cx, cy);
      return;
    }
    if (u.side === "mtf" && u.downed) {
      drawFallen(ctx, cx, cy, p.ang, look, false);
      ctx.strokeStyle = u.stabilized ? C.ok : C.alert; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx + 6, cy - 9); ctx.lineTo(cx + 12, cy - 9); ctx.moveTo(cx + 9, cy - 12); ctx.lineTo(cx + 9, cy - 6); ctx.stroke();
      if (!u.stabilized) tag(`${u.bleed}`, cx + 11, cy - 17, C.alert);
      return;
    }
    if (u.side === "mtf") {
      const pan = isPanicked(u), col = pan ? "#55636f" : u.guard ? "#9fb3c4" : C.mtf;
      drawBase(ctx, cx, cy, u.guard ? "rsquare" : "circle", col);
      drawPerson(ctx, cx, cy, p.ang, look, { hurt, flash, bob, ...pose, raised: !!u.overwatch });
      badge(ctx, cx + 10, cy + 10, pan ? "!!" : u.guard ? "S" : String(u.slot ?? ""), col);
      shieldBadge(u, cx - 12, cy - 11);
      if (S.phase === "player" && !u.downed) apPips(u, cx, cy - 24);
      if (S.concealed) { ctx.strokeStyle = C.ok; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      if (u.overwatch) { ctx.strokeStyle = C.manila; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 16, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    } else if (u.side === "raider") {
      const col = u.downed ? "#5d5266" : S.activePods.includes(u.pod ?? 0) ? C.raider : "#8a74a0";
      if (u.downed) { drawFallen(ctx, cx, cy, p.ang, look, false); drawBase(ctx, cx, cy, "diamond", col); }
      else {
        drawBase(ctx, cx, cy, "diamond", u.role === "commander" ? C.manila : col);
        drawPerson(ctx, cx, cy, p.ang, look, { hurt, flash, bob, ...pose, raised: !!u.overwatch });
        // specialists carry a letter: S sniper, X sapper, O officer, ★ the commander
        const mark = { sniper: "S", demo: "X", officer: "O", commander: "★" }[u.role as string];
        if (mark) badge(ctx, cx + 10, cy + 10, mark, u.role === "commander" ? C.manila : col);
        if (u.overwatch) { ctx.strokeStyle = C.alert; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 17, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      }
    } else if (u.side === "civilian") {
      const col = u.record ? "#d9c27a" : u.dosed ? "#8a9a86" : "#cfc6a8";
      drawBase(ctx, cx, cy, "square", u.witness && !u.dosed ? C.manila : col);
      if (u.vehicle) { drawLorry(cx, cy, p.ang); return; }
      if (u.radio) drawRadio(ctx, cx, cy);
      else if (u.record) drawRecords(ctx, cx, cy);
      else drawPerson(ctx, cx, cy, p.ang, look, { hurt, bob });
      badge(ctx, cx + 10, cy + 10, u.radio ? "X" : u.record ? "F" : u.dosed ? "✓" : u.witness ? "W" : u.researcher ? (S.setup.kind === "rescue" ? "L" : "R") : "C", col);
      if (u.researcher && u.followId) tag("FOLLOWING", cx, cy - 18, C.ok);
      if (u.spooked && !u.dosed) tag("!", cx + 10, cy - 10, C.alert);
      return;
    } else {
      // D-Class: the work detail gets a solid ring, loose ones a broken one
      drawBase(ctx, cx, cy, "circle", u.side === "dclass" ? "#f2e6c9" : C.subject, u.side !== "dclass");
      drawPerson(ctx, cx, cy, p.ang, look, { hurt, bob, flinch: fl, bloodied: pose.bloodied, seed: pose.seed });
      badge(ctx, cx + 10, cy + 10, "D", C.subject);
      if (u.side === "dclass" && S.phase === "player") apPips(u, cx, cy - 24);
    }
    if (u.staring) drawEye(cx + 10, cy - 10);
    if (u.restrained) tag("CUFFED", cx, cy - 18, C.manila);
    if (u.carrying) tag("CARRYING", cx, cy + 20, C.manila);
    if ((u.hunkerUntil ?? -1) >= S.turn) tag("HUNKERED", cx, cy + 20, C.ok);
    if (u.side !== "subject") hpBar(u, cx, cy);
  }

  /** XCOM-style cover shield: full (blue), half (amber) or flanked (red), against the threats in sight right now;
   *  with no threat in sight, the best cover beside them. */
  function shieldBadge(u: Unit, x: number, y: number) {
    const threats = S.units.filter(r => (r.side === "raider" || r.side === "zombie") && r.alive && !r.downed && seen(r.x, r.y) && sightFrom(r.x, r.y, u.x, u.y));
    let c: number;
    if (threats.length) c = Math.min(...threats.map(r => coverAgainst(u.x, u.y, r.x, r.y)));
    else { c = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = tileAt(u.x + dx, u.y + dy); c = Math.max(c, t === WALL || t === FULL || t === STEEL ? 40 : t === HALF || t === DRUM ? 20 : 0); } }
    if (!c && !threats.length) return;
    const col = c >= 40 ? C.mtf : c > 0 ? C.manila : C.alert;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#0f1317"; ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(4.8, -3.5); ctx.lineTo(4.2, 1.5); ctx.quadraticCurveTo(2.6, 4.6, 0, 6); ctx.quadraticCurveTo(-2.6, 4.6, -4.2, 1.5); ctx.lineTo(-4.8, -3.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    if (c >= 40) { ctx.beginPath(); ctx.moveTo(0, -3.6); ctx.lineTo(3, -2.3); ctx.lineTo(2.6, 1.2); ctx.quadraticCurveTo(1.6, 3.2, 0, 4); ctx.quadraticCurveTo(-1.6, 3.2, -2.6, 1.2); ctx.lineTo(-3, -2.3); ctx.closePath(); ctx.fill(); }
    else if (c > 0) { ctx.beginPath(); ctx.moveTo(0, -3.6); ctx.lineTo(3, -2.3); ctx.lineTo(2.6, 1.2); ctx.quadraticCurveTo(1.6, 3.2, 0, 4); ctx.closePath(); ctx.fill(); }
    else { ctx.font = "700 8px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 0, 0.5); }
    ctx.restore();
  }
  /** Action points left, as pips over the figure. */
  function apPips(u: Unit, cx: number, y: number) {
    const cap = u.staring ? 1 : 2;
    for (let i = 0; i < cap; i++) {
      const x = cx - (cap - 1) * 4 + i * 8;
      ctx.fillStyle = "#0f1317"; ctx.fillRect(x - 3, y - 2.5, 6, 5);
      ctx.fillStyle = i < u.ap ? "#f2e6c9" : "rgba(242,230,201,0.18)"; ctx.fillRect(x - 2, y - 1.5, 4, 3);
    }
  }

  function tag(text: string, x: number, y: number, color: string) {
    ctx.font = "9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = "#0f1317"; ctx.fillRect(x - w / 2, y - 7, w, 13);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function drawPath(from: Pt, path: Pt[], color: string) {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(from[0], from[1]);
    for (const [x, y] of path) ctx.lineTo(x * TS + TS / 2, y * TS + TS / 2);
    ctx.stroke();
  }

  // Weather over the whole map: falling streaks or flakes from a fixed scatter, scrolled by time, and a haze for fog.
  function drawWeather(now: number) {
    const w = S.setup.weather;
    if (!w || w === "clear" || L.def.floors?.[view.floor]?.under) return;
    const Wp = L.W * TS, Hp = L.H * TS;
    if (w === "fog") {
      const drift = now / 9000;
      for (let k = 0; k < 5; k++) {
        const cx = ((noise(k, 1, 3) * Wp + drift * (40 + k * 12) * TS / 10) % (Wp + 400)) - 200, cy = noise(k, 2, 3) * Hp;
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, TS * (5 + k));
        g.addColorStop(0, "rgba(200,206,212,0.10)"); g.addColorStop(1, "rgba(200,206,212,0)");
        ctx.fillStyle = g; ctx.fillRect(cx - TS * 10, cy - TS * 10, TS * 20, TS * 20);
      }
      ctx.fillStyle = "rgba(190,196,204,0.10)"; ctx.fillRect(0, 0, Wp, Hp);
      return;
    }
    const n = Math.round(Wp * Hp / (w === "snow" ? 5000 : w === "storm" ? 2200 : 3500));
    if (w === "snow") {
      ctx.fillStyle = "rgba(240,244,250,0.75)";
      for (let i = 0; i < n; i++) {
        const sp = 18 + noise(i, 7, 1) * 22, y = (noise(i, 3, 1) * Hp + now / 1000 * sp) % Hp;
        const x = (noise(i, 4, 1) * Wp + Math.sin(now / 900 + i) * 6 + Wp) % Wp;
        ctx.fillRect(x, y, 2, 2);
      }
      return;
    }
    // rain and storm: slanted streaks; a storm is heavier, faster and lit now and then by lightning
    const slant = w === "storm" ? 0.35 : 0.15, len = w === "storm" ? 14 : 10, fall = w === "storm" ? 900 : 600;
    ctx.strokeStyle = w === "storm" ? "rgba(170,190,215,0.42)" : "rgba(170,190,215,0.32)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const y = (noise(i, 5, 2) * Hp + now / 1000 * fall * (0.8 + noise(i, 6, 2) * 0.4)) % (Hp + len) - len;
      const x = (noise(i, 8, 2) * Wp + y * slant) % Wp;
      ctx.moveTo(x, y); ctx.lineTo(x + len * slant, y + len);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(10,16,28,0.12)"; ctx.fillRect(0, 0, Wp, Hp);
    if (w === "storm") {
      const cycle = now % 11000;
      if (cycle < 90 || (cycle > 160 && cycle < 220)) { ctx.fillStyle = "rgba(220,230,255,0.18)"; ctx.fillRect(0, 0, Wp, Hp); }
    }
  }

  // sounds for things that change state rather than leave an effect: turns, doors, SCP-106 coming and going, the end
  let last = { turn: S.turn, phase: S.phase, doors: S.lockedDoors.length, sub: S.submerged, over: !!S.over };
  function stateSounds() {
    if (S.turn !== last.turn) sfx.radio();
    if (S.phase !== last.phase && last.phase === "player" && S.phase !== "over") { sfx.enemyTurn(); if (S.has173 && !S.sealed) setTimeout(() => sfx.blink(), 350); }
    if (S.lockedDoors.length !== last.doors) sfx.door();
    if (S.submerged !== last.sub) sfx.corrode();
    if (!!S.over && !last.over) { if (S.result?.win) transition.victory(); else transition.defeat(); }
    last = { turn: S.turn, phase: S.phase, doors: S.lockedDoors.length, sub: S.submerged, over: !!S.over };
  }

  return function draw(now: number) {
    const hl = audioSettings().highlights;
    noteEffects(S.effects, S.units, (f, by) => {
      const e = f as Effect;
      fxr.noted(e);
      if (e.type === "line") {
        sfx.shot(by?.gun?.type);
        const travel = e.dur - 360 - ((e.rounds ?? 1) - 1) * (e.gap ?? 0);
        if (e.impact === "cover" || e.impact === "spark") setTimeout(() => sfx.ricochet(), travel);
      } else if (e.type === "text") { if (/^\d/.test(e.text)) sfx.hit(); else if (/MISS|COVER|GRAZE/.test(e.text)) sfx.miss(); }
      else if (e.type === "flash") { if (!e.color) sfx.explosion(); else if (e.color === "#ff9a50") sfx.flame(); else sfx.corrode(); }
      else if (e.type === "blast") sfx.explosion();
      else if (e.type === "ghost") sfx.scrape();
      else if (e.type === "banner") sfx.sting(e.color === "#86c193");
      else if (e.type === "cue") ({ reload: sfx.reload, crack: sfx.crack, rise: sfx.rumble, raise: sfx.raise, blink: () => {} })[e.cue]();
    }, now);
    // Phase 4G: a short shake on a big moment (only with Action highlights on)
    const [ox, oy] = fxr.offset(now, hl);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0b0e11"; ctx.fillRect(0, 0, L.W * TS, L.H * TS);
    const top = L.def.floors ? L.def.floors[Math.min(view.floor, L.def.floors.length - 1)].y0 * TS : 0;
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, (oy - top) * dpr);
    stateSounds();
    drawTiles();
    fxr.under(ctx);
    living.floor(ctx, now);
    drawFog();
    // night: the map is dark except where flares burn
    if (S.setup.night && !L.def.floors?.[view.floor]?.under) {
      ctx.fillStyle = "rgba(4,8,20,0.38)"; ctx.fillRect(0, 0, L.W * TS, L.H * TS);
      for (const f of S.flares.filter(f => f.until >= S.turn)) {
        const g = ctx.createRadialGradient(f.x * TS + TS / 2, f.y * TS + TS / 2, 4, f.x * TS + TS / 2, f.y * TS + TS / 2, TS * 2.6);
        g.addColorStop(0, "rgba(255,120,70,0.35)"); g.addColorStop(1, "rgba(255,120,70,0)");
        ctx.fillStyle = g; ctx.fillRect((f.x - 3) * TS, (f.y - 3) * TS, TS * 7, TS * 7);
      }
    }
    living.lights(ctx, now);
    drawHatch();
    const sel = S.selected, playing = canAct();
    const st = S.statue;
    const known = S.has173 && !S.sealed && seen(st.x, st.y);

    // Movement study: the room SCP-173 is in, even unseen
    if (S.has173 && S.setup.mods.track173 && !S.sealed && !seen(st.x, st.y)) {
      const room = area(st.x, st.y);
      ctx.fillStyle = "rgba(215,91,71,0.13)";
      for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (passable(x, y) && area(x, y) === room) ctx.fillRect(x * TS, y * TS, TS, TS);
    }

    // concealment: where unalerted Insurgents would notice the team
    if (S.concealed) {
      ctx.fillStyle = "rgba(215,91,71,0.16)";
      const D = detectRange();
      for (const r of S.units.filter(u => u.side === "raider" && u.alive && !u.downed && !S.activePods.includes(u.pod ?? 0) && seen(u.x, u.y))) {
        for (let y = r.y - D; y <= r.y + D; y++) for (let x = r.x - D; x <= r.x + D; x++)
          if (x >= 0 && y >= 0 && x < L.W && y < L.H && passable(x, y) && sightFrom(r.x, r.y, x, y, D)) ctx.fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2);
      }
    }
    // SCP-610's flesh, its core, and fire
    living.flesh(ctx, now);
    if (S.core && S.core.hp > 0 && S.explored[S.core.y * L.W + S.core.x]) {
      const cx = S.core.x * TS + TS / 2, cy = S.core.y * TS + TS / 2, pulse = 0.5 + 0.5 * Math.sin(now / 300);
      ctx.fillStyle = `rgba(170,30,40,${0.7 + pulse * 0.3})`; ctx.beginPath(); ctx.arc(cx, cy, 11 + pulse * 2, 0, Math.PI * 2); ctx.fill();
      tag(`CORE ${S.core.hp}`, cx, cy - 20, C.alert);
    }
    living.fire(ctx, now);
    // floor rotted by SCP-106
    if (S.has106) {
      ctx.fillStyle = "rgba(28,22,14,0.55)";
      for (const i of S.corroded) { const x = i % L.W, y = (i / L.W) | 0; if (S.explored[i]) { ctx.beginPath(); ctx.ellipse(x * TS + TS / 2, y * TS + TS / 2, 13, 10, (i % 7) / 3, 0, Math.PI * 2); ctx.fill(); } }
    }
    // the fallen where they lie (the ones SCP-049 could still raise are marked)
    for (const b of S.units.filter(u => !u.alive && !u.saved && !u.carriedBy && !u.taken && u.side !== "anomaly")) {
      if (!seen(b.x, b.y)) continue;
      const [bx, by] = center(b), ang = animOf(b.id)?.ang ?? 0;
      if (b.side === "zombie" && b.flesh) { ctx.fillStyle = "rgba(90,18,20,0.6)"; ctx.beginPath(); ctx.ellipse(bx, by, 11, 8, 0.4, 0, Math.PI * 2); ctx.fill(); continue; }
      if (b.radio || b.record) continue;
      drawFallen(ctx, bx, by, ang, lookFor(b), true, 0.85);
      if (S.has049 && freshBodies().includes(b)) {
        ctx.strokeStyle = "#d8bf86"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx - 7, by - 7); ctx.lineTo(bx + 7, by + 7); ctx.moveTo(bx + 7, by - 7); ctx.lineTo(bx - 7, by + 7); ctx.stroke();
      }
    }
    // choosing a doorway to seal or open
    if (playing && S.mode === "doors") {
      for (const i of L.doors) { const x = i % L.W, y = (i / L.W) | 0; ctx.strokeStyle = S.lockedDoors.includes(i) ? C.ok : C.manila; ctx.lineWidth = 2; ctx.strokeRect(x * TS + 3, y * TS + 3, TS - 6, TS - 6); }
    }
    for (const i of S.lockedDoors) { const x = i % L.W, y = (i / L.W) | 0; tag("SEALED", x * TS + TS / 2, y * TS + TS / 2, C.manila); }
    // leading a calmed SCP-049
    if (playing && S.mode === "lead") {
      ctx.fillStyle = "rgba(134,193,147,0.25)";
      for (const i of leadOptions().keys()) ctx.fillRect((i % L.W) * TS + 1, ((i / L.W) | 0) * TS + 1, TS - 2, TS - 2);
    }

    // reachable tiles (normal moves, drag destinations, or grenade targets)
    let res: ReturnType<typeof reachFor> = null, drags: Map<number, Pt[]> | null = null, throws: Set<number> | null = null;
    if (playing && sel && sel.ap > 0 && S.mode !== "lead") {
      if (S.mode === "throw") {
        throws = throwOptions(sel);
        ctx.fillStyle = "rgba(242,230,201,0.12)";
        for (const i of throws) ctx.fillRect((i % L.W) * TS + 1, ((i / L.W) | 0) * TS + 1, TS - 2, TS - 2);
      } else if (S.mode === "drag") {
        drags = dragOptions(sel);
        ctx.fillStyle = "rgba(224,132,63,0.3)";
        for (const i of drags.keys()) ctx.fillRect((i % L.W) * TS + 1, ((i / L.W) | 0) * TS + 1, TS - 2, TS - 2);
      } else {
        res = reachFor(sel);
        if (res) for (let i = 0; i < L.W * L.H; i++) {
          const d = res.dist[i];
          if (d <= 0) continue;
          ctx.fillStyle = moveCost(sel, d) === 1 ? "rgba(122,170,208,0.24)" : "rgba(216,191,134,0.18)";
          ctx.fillRect((i % L.W) * TS + 1, ((i / L.W) | 0) * TS + 1, TS - 2, TS - 2);
        }
      }
    }

    // sightlines: solid for anyone staring, dashed for anyone else who could see it
    if (known) {
      for (const m of team()) if (!isPanicked(m) && canSee(m, st.x, st.y)) {
        const [ax, ay] = center(m), [bx, by] = center(st);
        ctx.setLineDash(m.staring ? [] : [3, 4]);
        ctx.strokeStyle = m.staring ? "rgba(216,191,134,0.75)" : "rgba(216,191,134,0.35)"; ctx.lineWidth = m.staring ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (!S.sealed && S.lastSeen) {
      drawStatue(S.lastSeen.x, S.lastSeen.y, 0.28);
      tag(`T${S.lastSeen.turn}?`, S.lastSeen.x * TS + TS / 2, S.lastSeen.y * TS - 2, C.alert);
    }

    // Phase 4B: SCP-096's face, as the tiles in the wedge in front of it that it can see; and noisemakers playing
    if (S.scp === "096" && !S.hooded && !S.sealed && st.alive && (seen(st.x, st.y) || S.explored[st.y * L.W + st.x])) {
      ctx.fillStyle = S.rage ? "rgba(215,91,71,0.22)" : "rgba(215,91,71,0.14)";
      for (let y = st.y - 10; y <= st.y + 10; y++) for (let x = st.x - 10; x <= st.x + 10; x++)
        if (x >= 0 && y >= 0 && x < L.W && y < L.H && passable(x, y) && inFace(x, y) && sightFrom(st.x, st.y, x, y, 10)) ctx.fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2);
    }
    for (const l of S.lures ?? []) if (l.until >= S.turn) {
      const cx = l.x * TS + TS / 2, cy = l.y * TS + TS / 2, pulse = (now / 700) % 1;
      ctx.fillStyle = "#3a3d40"; ctx.fillRect(cx - 6, cy - 4, 12, 8); ctx.fillStyle = "#d8bf86"; ctx.beginPath(); ctx.arc(cx - 2, cy, 2, 0, Math.PI * 2); ctx.arc(cx + 3, cy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(216,191,134,${0.7 * (1 - pulse)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 8 + pulse * 18, 0, Math.PI * 2); ctx.stroke();
      tag(`LURE · T${l.until}`, cx, cy + 16, C.manila);
    }

    for (const u of S.units) {
      if (!u.alive || u.saved || u.carriedBy) continue;
      if (!isTeam(u) && !seen(u.x, u.y) && !u.restrained) continue;
      if (hidden939(u)) continue;
      drawUnit(u, now);
      // Phase 4B markers: eyes on the floor, compelled by SCP-012, marked by SCP-096
      const pp = placeOf(u, now);
      if (u.eyesDown) tag("EYES DOWN", pp.x, pp.y + 20, C.ok);
      if (u.compelled !== undefined) tag("COMPELLED", pp.x, pp.y + 20, C.alert);
      if (isTarget(u)) tag("MARKED", pp.x, pp.y - 26, C.alert);
    }

    // smoke
    living.smoke(ctx, now);

    // motion trackers: anything within 6 tiles of a carrier shows as a blip, walls or not
    const carriers = team().filter(u => u.side === "mtf" && (u.items?.some(i => i.id === "tracker") || u.perks?.includes("scanner")));
    if (carriers.length) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 250);
      for (const u of S.units) {
        if (!u.alive || u.saved || isTeam(u) || seen(u.x, u.y) || (u === st && S.sealed)) continue;
        if (!carriers.some(cr => Math.max(Math.abs(cr.x - u.x), Math.abs(cr.y - u.y)) <= 6)) continue;
        const [cx, cy] = center(u);
        ctx.strokeStyle = u === st ? C.alert : C.manila; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + pulse * 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    if (playing && sel && S.mode === "ability" && S.ability) {
      ctx.strokeStyle = C.ok; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      for (const t of abilityTargets(sel, S.ability)) { const [cx, cy] = center(t); ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke(); }
      ctx.setLineDash([]);
    }

    if (sel && sel.alive) {
      const sa = animOf(sel.id), [cx, cy] = sa ? [sa.x, sa.y] : center(sel);
      ctx.strokeStyle = C.manila; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 60;
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    // every enemy the selected operative can shoot right now shows its hit chance (hovering one gives the detail)
    if (playing && sel && sel.side === "mtf" && sel.ap > 0 && !S.mode) {
      for (const r of S.units) if (r.side === "raider" && r.alive && !r.downed && seen(r.x, r.y) && canShoot(sel, r) && !(S.hover && S.hover.x === r.x && S.hover.y === r.y)) {
        const [rx, ry] = center(r); tag(`${shotInfo(sel, r).chance}%`, rx, ry + 19, C.manila);
      }
    }

    // hover: path preview, drag preview or target
    const hv = S.hover;
    if (playing && sel && hv) {
      const tu = unitAt(hv.x, hv.y);
      if (throws) {
        if (throws.has(hv.y * L.W + hv.x)) {
          ctx.strokeStyle = S.throwing?.id === "smoke" ? "#aab2ba" : "#fff8e0"; ctx.lineWidth = 2;
          for (const [x, y] of blastArea(hv.x, hv.y)) ctx.strokeRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4);
          const caught = team().filter(u => blastArea(hv.x, hv.y).some(([a, b]) => a === u.x && b === u.y));
          if (S.throwing?.id === "flashbang" && caught.length) tag(`BLINDS ${caught.map(u => u.call || u.name).join(", ")}`, hv.x * TS + TS / 2, hv.y * TS - 20, C.alert);
        }
      } else if (drags) {
        const path = drags.get(hv.y * L.W + hv.x);
        if (path) {
          drawPath(center(sel), path, C.subject);
          const trail: Pt[] = [[sel.x, sel.y], ...path.slice(0, -1)];
          ctx.setLineDash([2, 3]); drawPath(center(st), trail, C.concrete); ctx.setLineDash([]);
          const [sx, sy] = trail[trail.length - 1];
          drawStatue(sx, sy, 0.45);
          if (inContainer(sx, sy)) tag("INTO CONTAINER", sx * TS + TS / 2, sy * TS - 6, C.ok);
        }
      } else if (tu && tu.side === "raider" && seen(hv.x, hv.y) && sel.side === "mtf" && sel.ap > 0 && canShoot(sel, tu)) {
        const s = shotInfo(sel, tu), [ax, ay] = center(s.from), [bx, by] = center(tu);
        ctx.strokeStyle = "rgba(215,91,71,0.8)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by, 15, 0, Math.PI * 2); ctx.stroke();
        // hit chance, then damage, crit chance and the target's armor
        const g = activeGun(sel), line2 = `${g ? `${g.dmg[0]}–${g.dmg[1]} dmg` : ""}${s.crit ? ` · crit ${s.crit}%` : ""}${tu.armor ? ` · armor ${tu.armor}` : ""}`;
        ctx.font = "500 12px IBM Plex Mono, monospace"; const w1 = ctx.measureText(`${s.chance}%`).width;
        ctx.font = "10px IBM Plex Mono, monospace"; const w2 = ctx.measureText(line2).width;
        const bw = Math.max(w1, w2) + 10, bxL = bx + 14 + bw > L.W * TS ? bx - 14 - bw : bx + 14;
        ctx.fillStyle = "#0f1317"; ctx.fillRect(bxL, by - 26, bw, 30);
        ctx.fillStyle = "#f2e6c9"; ctx.font = "500 12px IBM Plex Mono, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${s.chance}%`, bxL + 5, by - 18);
        ctx.fillStyle = "#b9b2a2"; ctx.font = "10px IBM Plex Mono, monospace"; ctx.fillText(line2, bxL + 5, by - 5);
      } else if (res && !tu) {
        const d = res.dist[hv.y * L.W + hv.x];
        if (d > 0) {
          drawPath(center(sel), pathTo(res, hv.x, hv.y) || [], moveCost(sel, d) === 1 ? C.mtf : C.manila);
          ctx.strokeRect(hv.x * TS + 3, hv.y * TS + 3, TS - 6, TS - 6);
          if (known) {
            const eyes = sightFrom(hv.x, hv.y, st.x, st.y);
            if (eyes) {
              ctx.setLineDash([2, 3]); ctx.strokeStyle = "rgba(134,193,147,0.9)"; ctx.lineWidth = 1.5;
              const [bx, by] = center(st);
              ctx.beginPath(); ctx.moveTo(hv.x * TS + TS / 2, hv.y * TS + TS / 2); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
            }
            tag(eyes ? "EYES ON" : "NO LOS", hv.x * TS + TS / 2, hv.y * TS + TS + 7, eyes ? C.ok : C.alert);
          }
          // threats at the destination: visible Insurgents who could shoot this tile, and whether any of them flank it
          const threats = S.units.filter(r => r.side === "raider" && r.alive && !r.downed && seen(r.x, r.y) && sightFrom(r.x, r.y, hv.x, hv.y));
          if (threats.length) {
            const flanked = threats.some(r => coverAgainst(hv.x, hv.y, r.x, r.y) === 0);
            tag(`${threats.length} CAN SEE${flanked ? " · FLANKED" : ""}`, hv.x * TS + TS / 2, hv.y * TS - 8, flanked ? C.alert : C.manila);
            for (const r of threats) { const [rx, ry] = center(r); ctx.setLineDash([2, 4]); ctx.strokeStyle = coverAgainst(hv.x, hv.y, r.x, r.y) === 0 ? "rgba(215,91,71,0.7)" : "rgba(216,191,134,0.45)"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(hv.x * TS + TS / 2, hv.y * TS + TS / 2); ctx.stroke(); ctx.setLineDash([]); }
          } else if (S.units.some(r => r.side === "raider" && r.alive && !r.downed && seen(r.x, r.y))) tag("NOT SEEN", hv.x * TS + TS / 2, hv.y * TS - 8, C.ok);
          const shields = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const t = tileAt(hv.x + dx, hv.y + dy); return t === HALF || t === FULL || t === WALL || t === STEEL; });
          for (const [dx, dy] of shields) {
            const fullCover = tileAt(hv.x + dx, hv.y + dy) !== HALF;
            ctx.fillStyle = fullCover ? C.mtf : C.manila;
            const cx = hv.x * TS + TS / 2 + dx * 12, cy = hv.y * TS + TS / 2 + dy * 12;
            ctx.fillRect(cx - (dy ? 6 : 2), cy - (dx ? 6 : 2), dy ? 12 : 4, dx ? 12 : 4);
          }
        }
      }
    }

    // Phase 4I: where enemies were last seen (until seen again), and which way the team heard something
    for (const [id, k] of Object.entries(S.contacts ?? {})) {
      if (k.seen) continue;
      const u = S.units.find(v => v.id === id);
      if (!u || !u.alive || seen(u.x, u.y)) continue;
      const cx = k.x * TS + TS / 2, cy = k.y * TS + TS / 2;
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = C.raider; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, cy + 12); ctx.lineTo(cx - 12, cy); ctx.closePath(); ctx.stroke(); ctx.restore();
      tag(`last seen T${k.turn}`, cx, cy + 18, C.raider);
    }
    for (const h of S.heard ?? []) {
      if (h.turn < S.turn - 0 && h.turn !== S.turn) continue;
      const m = S.units.find(v => v.id === h.listener);
      if (!m || !m.alive) continue;
      const a = h.dir * Math.PI / 4, [mx, my] = center(m), r0 = 19, r1 = 30;
      const pulse = 0.5 + 0.5 * Math.sin(now / 220 + h.t);
      ctx.save(); ctx.globalAlpha = 0.35 + 0.5 * h.conf * pulse; ctx.strokeStyle = C.manila; ctx.fillStyle = C.manila; ctx.lineWidth = 2;
      // an arc as wide as the doubt about the direction, and an arrowhead
      const spread = (1 - h.conf) * Math.PI / 4 + 0.12;
      ctx.beginPath(); ctx.arc(mx, my, r0, a - spread, a + spread); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1); ctx.lineTo(mx + Math.cos(a + 0.18) * (r0 + 3), my + Math.sin(a + 0.18) * (r0 + 3)); ctx.lineTo(mx + Math.cos(a - 0.18) * (r0 + 3), my + Math.sin(a - 0.18) * (r0 + 3)); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (sel && sel.alive && sel.prefFacing !== undefined) {
      const a = sel.prefFacing * Math.PI / 4, [mx, my] = center(sel);
      ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = C.mtf; ctx.beginPath(); ctx.moveTo(mx, my); ctx.arc(mx, my, 26, a - 0.35, a + 0.35); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    // where Insurgent reinforcements will land next turn
    if (S.ciDrop) {
      const [dx, dy] = S.ciDrop;
      ctx.strokeStyle = C.alert; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.strokeRect((dx - 1) * TS + 2, (dy - 1) * TS + 2, TS * 3 - 4, TS * 3 - 4); ctx.setLineDash([]);
      tag("DROP ZONE", dx * TS + TS / 2, (dy - 1) * TS - 4, C.alert);
    }
    drawWeather(now);

    S.effects = S.effects.filter(e => now - e.t0 < e.dur);
    fxr.over(ctx, now, S.effects, L.W * TS, floorH * TS, hl, drawStatue, top);
  };
}
