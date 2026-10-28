// Phase 4G: how combat looks. Tracers that travel and land, what they do where they land, explosions with the smoke
// and scorch they leave behind, SCP moments, turning-point banners, and the shake and edge flash of a big moment.
// Everything is drawn from the effects the rules emit; nothing here changes the rules, and every effect is short and
// translucent so the map stays readable. Shake and edge flashes only show with "Action highlights" on.
import { TS } from "../core/grid";
import type { Effect, Impact } from "../game/types";

const IMPACT_MS = 320;
/** A fixed scatter per effect, so particles don't shimmer from frame to frame. */
const rnd = (seed: number, k: number) => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
const ease = (k: number) => 1 - (1 - k) * (1 - k);

export function createFx() {
  // what an explosion leaves behind: a scorch mark for the rest of the mission, and smoke for a few seconds
  const scorches: { x: number; y: number; r: number; seed: number }[] = [];
  const smoke: { x: number; y: number; r: number; t0: number; seed: number }[] = [];
  let shake = { t0: -1e9, dur: 0, mag: 0 };

  /** Called once for each effect as it starts. */
  function noted(e: Effect) {
    if (e.type === "blast") {
      scorches.push({ x: e.x, y: e.y, r: e.r * TS * 0.7, seed: e.t0 });
      smoke.push({ x: e.x, y: e.y, r: e.r * TS, t0: e.t0 + e.dur * 0.4, seed: e.t0 });
    } else if (e.type === "jolt" && e.mag > shake.mag * Math.max(0, 1 - (e.t0 - shake.t0) / Math.max(1, shake.dur))) shake = { t0: e.t0, dur: e.dur, mag: e.mag };
  }

  /** The camera offset for this frame: a short, decaying shake. */
  function offset(now: number, on: boolean): [number, number] {
    if (!on) return [0, 0];
    const k = (now - shake.t0) / shake.dur;
    if (k < 0 || k >= 1) return [0, 0];
    const m = shake.mag * (1 - k) * (1 - k);
    // whole pixels, so the fog and tiles don't open hairline seams while the map moves
    return [Math.round(Math.sin(now / 17) * m), Math.round(Math.cos(now / 23) * m * 0.8)];
  }

  /** Under the units: scorch marks. */
  function under(ctx: CanvasRenderingContext2D) {
    for (const s of scorches) {
      const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r * 1.3);
      g.addColorStop(0, "rgba(12,10,8,0.7)"); g.addColorStop(0.6, "rgba(20,16,12,0.4)"); g.addColorStop(1, "rgba(20,16,12,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.3, s.r * 1.1, rnd(s.seed, 1) * 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(10,8,6,0.5)"; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + rnd(s.seed, i); ctx.moveTo(s.x + Math.cos(a) * s.r * 0.4, s.y + Math.sin(a) * s.r * 0.4); ctx.lineTo(s.x + Math.cos(a) * s.r * (1 + rnd(s.seed, i + 9) * 0.5), s.y + Math.sin(a) * s.r * (1 + rnd(s.seed, i + 9) * 0.5)); }
      ctx.stroke();
    }
  }

  function impact(ctx: CanvasRenderingContext2D, x: number, y: number, kind: Impact, k: number, seed: number, dir: number) {
    const fade = 1 - k;
    if (kind === "blood" || kind === "ichor") {
      ctx.fillStyle = kind === "blood" ? `rgba(150,22,26,${0.85 * fade})` : `rgba(38,44,28,${0.9 * fade})`;
      for (let i = 0; i < 7; i++) {
        const a = dir + (rnd(seed, i) - 0.5) * 1.6, d = 3 + ease(k) * (6 + rnd(seed, i + 7) * 9);
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.8 * fade + 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, 3.5 * fade + 1, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (kind === "spark" || kind === "cover" || kind === "dust") {
      ctx.strokeStyle = `rgba(255,214,120,${(kind === "spark" ? 1 : 0.7) * fade})`; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < (kind === "spark" ? 7 : 4); i++) {
        const a = dir + (rnd(seed, i) - 0.5) * 2.2, d0 = 2 + ease(k) * 8, d1 = d0 + 4 * fade;
        ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      }
      ctx.stroke();
    }
    if (kind === "dust" || kind === "cover") {
      ctx.fillStyle = `rgba(170,165,150,${0.45 * fade})`;
      for (let i = 0; i < 4; i++) { const a = rnd(seed, i + 20) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3 * k, y + Math.sin(a) * 3 * k - k * 4, 2 + k * 4, 0, Math.PI * 2); ctx.fill(); }
    }
    if (kind === "cover") {
      // chips knocked off the cover, thrown back toward the shooter
      ctx.fillStyle = `rgba(120,112,98,${fade})`;
      for (let i = 0; i < 6; i++) { const a = dir + (rnd(seed, i + 30) - 0.5) * 2, d = ease(k) * (8 + rnd(seed, i + 40) * 10); ctx.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d - 1 + k * k * 6, 2.2, 2.2); }
    }
  }

  function edge(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, a: number) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, hexA(color, 0)); g.addColorStop(1, hexA(color, a));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /** Over everything: shots, impacts, blasts, cues, floating text, banners and edge flashes. `drawStatue` draws
   *  SCP-173's ghost where it stood. */
  function over(ctx: CanvasRenderingContext2D, now: number, effects: Effect[], W: number, H: number, on: boolean, drawStatue: (x: number, y: number, a: number) => void) {
    // lingering smoke from explosions, drifting and thinning over about six seconds
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i], k = (now - s.t0) / 6000;
      if (k >= 1) { smoke.splice(i, 1); continue; }
      if (k < 0) continue;
      for (let j = 0; j < 6; j++) {
        const a = rnd(s.seed, j) * Math.PI * 2, d = s.r * (0.3 + 0.5 * rnd(s.seed, j + 6)) + k * 10;
        const px = s.x + Math.cos(a) * d + k * 14, py = s.y + Math.sin(a) * d - k * 22, r = s.r * (0.35 + k * 0.5);
        ctx.fillStyle = `rgba(80,80,82,${0.32 * (1 - k)})`; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const e of effects) {
      const k = (now - e.t0) / e.dur;
      if (k < 0 || k >= 1) continue;
      switch (e.type) {
        case "line": {
          const rounds = e.rounds ?? 1, gap = e.gap ?? 0, travel = e.dur - 360 - (rounds - 1) * gap, dir = Math.atan2(e.y0 - e.y1, e.x0 - e.x1);
          for (let r = 0; r < rounds; r++) {
            const t = now - e.t0 - r * gap;
            if (t < 0) continue;
            const jx = r ? (rnd(e.t0, r) - 0.5) * 8 : 0, jy = r ? (rnd(e.t0, r + 5) - 0.5) * 8 : 0, ex = e.x1 + jx, ey = e.y1 + jy;
            if (t <= travel) {
              const h = t / travel, tl = Math.max(0, h - 0.3);
              const hx = e.x0 + (ex - e.x0) * h, hy = e.y0 + (ey - e.y0) * h, tx = e.x0 + (ex - e.x0) * tl, ty = e.y0 + (ey - e.y0) * tl;
              const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, hexA(e.color, 0)); g.addColorStop(1, hexA(e.color, 0.85));
              ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
              ctx.fillStyle = "rgba(255,250,230,0.95)"; ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
            } else if (t - travel < IMPACT_MS && e.impact) impact(ctx, ex, ey, r ? (e.impact === "cover" ? "dust" : e.impact) : e.impact, (t - travel) / IMPACT_MS, e.t0 + r, dir);
          }
          break;
        }
        case "text": {
          ctx.globalAlpha = Math.min(1, (1 - k) * 1.6); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
          ctx.font = e.big ? "700 15px IBM Plex Mono, monospace" : "600 13px IBM Plex Mono, monospace";
          const y = e.y - ease(Math.min(1, k * 1.5)) * 14, sc = e.big ? 1 + Math.max(0, 0.25 - k) * 1.6 : 1;
          ctx.save(); ctx.translate(e.x, y); ctx.scale(sc, sc);
          ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,12,14,0.85)"; ctx.strokeText(e.text, 0, 0);
          ctx.fillStyle = e.color; ctx.fillText(e.text, 0, 0); ctx.restore();
          ctx.globalAlpha = 1;
          break;
        }
        case "ghost": drawStatue(e.x, e.y, 0.5 * (1 - k)); break;
        case "flash": {
          ctx.globalAlpha = 1 - k; ctx.fillStyle = e.color ?? "#fff8e0";
          ctx.beginPath(); ctx.arc(e.x, e.y, TS * (0.6 + k * 1.2), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          break;
        }
        case "blast": {
          const R = e.r * TS;
          // shockwave ring
          ctx.strokeStyle = `rgba(255,236,200,${0.7 * (1 - k)})`; ctx.lineWidth = 3 * (1 - k) + 0.5;
          ctx.beginPath(); ctx.arc(e.x, e.y, R * (0.3 + 1.3 * ease(k)), 0, Math.PI * 2); ctx.stroke();
          // fireball
          if (k < 0.7) {
            const kk = k / 0.7, fr = R * (0.45 + 0.6 * ease(kk));
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, fr);
            g.addColorStop(0, `rgba(255,250,220,${1 - kk})`); g.addColorStop(0.35, `rgba(255,190,80,${0.9 * (1 - kk)})`);
            g.addColorStop(0.75, `rgba(200,70,30,${0.6 * (1 - kk)})`); g.addColorStop(1, "rgba(80,30,20,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, fr, 0, Math.PI * 2); ctx.fill();
          }
          // debris
          ctx.fillStyle = `rgba(40,34,28,${1 - k})`;
          for (let i = 0; i < 12; i++) {
            const a = rnd(e.t0, i) * Math.PI * 2, d = ease(k) * R * (0.8 + rnd(e.t0, i + 12) * 0.9);
            ctx.fillRect(e.x + Math.cos(a) * d - 1.5, e.y + Math.sin(a) * d - 1.5 + k * k * 8, 3, 3);
          }
          break;
        }
        case "cue": {
          if (e.cue === "reload") {
            ctx.globalAlpha = 1 - k * k; tagAt(ctx, "RELOADING", e.x, e.y - 24 - k * 6, "#d8bf86"); ctx.globalAlpha = 1;
          } else if (e.cue === "crack") {
            // SCP-173: a red flash and fracture lines from the victim
            ctx.fillStyle = `rgba(215,60,50,${0.55 * (1 - k)})`; ctx.beginPath(); ctx.arc(e.x, e.y, TS * (0.5 + k * 0.6), 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(255,220,210,${1 - k})`; ctx.lineWidth = 1.4; ctx.beginPath();
            for (let i = 0; i < 6; i++) { const a = rnd(e.t0, i) * Math.PI * 2; ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9); ctx.lineTo(e.x + Math.cos(a + 0.3) * 15, e.y + Math.sin(a + 0.3) * 15); }
            ctx.stroke();
          } else if (e.cue === "rise") {
            // SCP-106: the puddle boils, then a dark ring spreads as it comes up
            ctx.fillStyle = `rgba(14,10,6,${0.8 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, 14 + k * 6, 10 + k * 4, 0, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 6; i++) { const t = (k * 3 + rnd(e.t0, i)) % 1, a = rnd(e.t0, i + 6) * Math.PI * 2;
              ctx.strokeStyle = `rgba(90,70,40,${0.9 * (1 - t)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 8, e.y + 3 + Math.sin(a) * 5, 1 + t * 3, 0, Math.PI * 2); ctx.stroke(); }
            ctx.strokeStyle = `rgba(60,45,25,${0.7 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, 10 + k * 26, 7 + k * 18, 0, 0, Math.PI * 2); ctx.stroke();
          } else if (e.cue === "raise") {
            // SCP-049 raising a body: a pale column of light that fades
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, TS * 1.1);
            g.addColorStop(0, `rgba(235,240,220,${0.8 * (1 - k)})`); g.addColorStop(1, "rgba(235,240,220,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, TS * 1.1, 0, Math.PI * 2); ctx.fill();
          } else if (e.cue === "blink") {
            edge(ctx, W, H, "#000000", 0.75 * Math.sin(k * Math.PI));
          }
          break;
        }
        case "banner": {
          const a = Math.min(1, k * 7, (1 - k) * 4), y = H * 0.42, slide = (1 - Math.min(1, k * 6)) * 30;
          ctx.globalAlpha = a;
          ctx.fillStyle = "rgba(10,12,14,0.78)"; ctx.fillRect(0, y - 22, W, 44);
          ctx.fillStyle = e.color; ctx.fillRect(0, y - 22, W, 2); ctx.fillRect(0, y + 20, W, 2);
          ctx.font = "600 19px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = e.color; ctx.fillText(e.text, W / 2 + slide, y + 1);
          ctx.globalAlpha = 1;
          break;
        }
        case "jolt": if (on && e.color !== "#ffffff") edge(ctx, W, H, e.color, 0.4 * (1 - k)); break;
      }
    }
  }
  return { noted, offset, under, over };
}

function tagAt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = "9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = "#0f1317"; ctx.fillRect(x - w / 2, y - 7, w, 13);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
/** A colour given as #rrggbb with an alpha. */
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
