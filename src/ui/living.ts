// Phase 4G: the maps move. Consoles and instrument cabinets blink, Site-19's lamps flicker where a breach or riot has
// cut the power, red beacons turn along the walls while the breach siren sounds, the surface compound's searchlight
// sweeps at night, the town's street lamps come on after dark, smoke drifts, fire burns with embers and smoke, and
// SCP-610's flesh beats like a heart. All of it is decoration: none of it changes what anyone can see or hit.
import { FULL, L, TS, WALL, area, passable, tileAt, type Level } from "../core/grid";
import { S } from "../game/state";
import { isOutdoor, lampSpots, noise } from "./tiles";

interface Fixtures { level: Level; version: number; leds: [number, number, number][]; lamps: number[]; flicker: number[]; beacons: number[]; street: number[] }

export function createLiving() {
  let fx: Fixtures | null = null;
  const map = () => S.setup.map ?? "wingC";
  const site19 = () => map() === "wingC" || map() === "dblock";

  function fixtures(): Fixtures {
    if (fx && fx.level === L && fx.version === L.version) return fx;
    const leds: [number, number, number][] = [], beacons: number[] = [], street: number[] = [];
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
      const t = tileAt(x, y), i = y * L.W + x;
      // instrument cabinets (as tiles.ts draws them in labs) and the consoles in Site-19's control rooms
      if (t === FULL && /lab|control|security|guard room|records/.test(area(x, y))) { leds.push([x * TS + 9.5, y * TS + 21.5, i]); leds.push([x * TS + 15.5, y * TS + 21.5, i + 7]); }
      // siren beacons on walls with open floor below them, spaced out
      if (t === WALL && passable(x, y + 1) && !isOutdoor(x, y + 1) && noise(x, y, 41) < 0.16) beacons.push(i);
      // street lamps along the kerb
      if (passable(x, y) && /street|road/i.test(area(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tileAt(x + dx, y + dy) === WALL) && noise(x, y, 43) < 0.09) street.push(i);
    }
    if (L.def.panel) { const [px, py] = L.def.panel; leds.push([px * TS + TS / 2 - 3, py * TS + 7, py * L.W + px]); }
    const lamps = lampSpots();
    fx = { level: L, version: L.version, leds, lamps, flicker: lamps.filter(i => noise(i % L.W, (i / L.W) | 0, 47) < 0.4), beacons, street };
    return fx;
  }
  const shown = (i: number) => S.explored[i] === 1;

  /** Drawn with the map, under the fog: blinking lights and the dark of a failing lamp. */
  function floor(ctx: CanvasRenderingContext2D, now: number) {
    const f = fixtures();
    for (const [x, y, seed] of f.leds) {
      if (!shown(seed % (L.W * L.H))) continue;
      const on = Math.sin(now / (380 + (seed % 7) * 90) + seed) > -0.2;
      ctx.fillStyle = on ? (seed % 3 ? "#86c193" : "#e0a040") : "#2a3138";
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      if (on) { ctx.fillStyle = seed % 3 ? "rgba(134,193,147,0.25)" : "rgba(224,160,64,0.25)"; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // a breach or riot has knocked out power in parts of Site-19: those lamps stutter
    if (site19() && (S.siren || S.setup.kind === "breach" || S.setup.kind === "riot")) for (const i of f.flicker) {
      const step = Math.floor(now / 70), burst = noise(i, Math.floor(now / 1400), 51) < 0.35, off = burst && noise(i, step, 53) < 0.5;
      if (!off) continue;
      const cx = (i % L.W) * TS + TS / 2, cy = ((i / L.W) | 0) * TS + TS / 2, g = ctx.createRadialGradient(cx, cy, 2, cx, cy, TS * 3);
      g.addColorStop(0, "rgba(4,6,10,0.42)"); g.addColorStop(1, "rgba(4,6,10,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - TS * 3, cy - TS * 3, TS * 6, TS * 6);
    }
  }

  /** Drawn after the night tint: lights that cut through the dark. */
  function lights(ctx: CanvasRenderingContext2D, now: number) {
    const f = fixtures();
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    if (S.siren) for (const i of f.beacons) {
      if (!shown(i) && !shown(i + L.W)) continue;
      const x = (i % L.W) * TS + TS / 2, y = ((i / L.W) | 0) * TS + TS - 4, a = Math.pow(Math.max(0, Math.cos(now / 260 + i)), 3);
      const g = ctx.createRadialGradient(x, y, 1, x, y, TS * 2.2);
      g.addColorStop(0, `rgba(230,40,30,${0.45 * a})`); g.addColorStop(1, "rgba(230,40,30,0)");
      ctx.fillStyle = g; ctx.fillRect(x - TS * 2.2, y - TS * 2.2, TS * 4.4, TS * 4.4);
      ctx.fillStyle = `rgba(255,${80 + a * 100},70,${0.5 + a * 0.5})`; ctx.fillRect(x - 3, y - 2, 6, 3);
    }
    if (S.setup.night && map() === "town") for (const i of f.street) {
      const x = (i % L.W) * TS + TS / 2, y = ((i / L.W) | 0) * TS + TS / 2, a = 0.22 + 0.03 * Math.sin(now / 90 + i);
      const g = ctx.createRadialGradient(x, y, 2, x, y, TS * 2.6);
      g.addColorStop(0, `rgba(255,200,120,${a})`); g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g; ctx.fillRect(x - TS * 2.6, y - TS * 2.6, TS * 5.2, TS * 5.2);
    }
    if (S.setup.night && map() === "gate") {
      // the watchtower in the compound's corner sweeps the yard
      const ox = 1.5 * TS, oy = 1.5 * TS, base = Math.atan2(L.H * TS / 2 - oy, L.W * TS / 2 - ox), ang = base + Math.sin(now / 2600) * 0.75, len = TS * 18, half = 0.11;
      const g = ctx.createRadialGradient(ox, oy, TS, ox, oy, len);
      g.addColorStop(0, "rgba(235,240,255,0.22)"); g.addColorStop(1, "rgba(235,240,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, len, ang - half, ang + half); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,240,0.8)"; ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /** SCP-610's flesh, beating like a heart: a strong beat and a weaker one, about once a second. */
  function flesh(ctx: CanvasRenderingContext2D, now: number) {
    const t = (now % 1100) / 1100, beat = Math.exp(-(((t - 0.05) / 0.045) ** 2)) + 0.6 * Math.exp(-(((t - 0.22) / 0.05) ** 2));
    for (const i of S.flesh) if (S.explored[i]) {
      const x = i % L.W, y = (i / L.W) | 0, cx = x * TS + TS / 2, cy = y * TS + TS / 2;
      ctx.fillStyle = `rgba(${120 + beat * 40},24,32,${0.5 + beat * 0.2})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, 15 + beat * 1.8, 13 + beat * 1.5, (i % 5) / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(70,10,16,${0.5 + beat * 0.3})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 3; k++) { const a = noise(x, y, k + 60) * Math.PI * 2; ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a + 0.6) * 7, cy + Math.sin(a + 0.6) * 7, cx + Math.cos(a) * 13, cy + Math.sin(a) * 13); }
      ctx.stroke();
    }
  }

  /** Fire: tongues of flame, embers rising off them, and smoke above. */
  function fire(ctx: CanvasRenderingContext2D, now: number) {
    for (const [i, until] of S.fires) if (until >= S.turn && S.explored[i]) {
      const x = i % L.W, y = (i / L.W) | 0, px = x * TS, py = y * TS;
      const g = ctx.createRadialGradient(px + TS / 2, py + TS / 2, 2, px + TS / 2, py + TS / 2, TS * 0.9);
      g.addColorStop(0, "rgba(255,150,60,0.35)"); g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g; ctx.fillRect(px - TS / 2, py - TS / 2, TS * 2, TS * 2);
      for (let k = 0; k < 4; k++) {
        const fx = px + 6 + k * 6.5, h = 9 + 6 * (0.5 + 0.5 * Math.sin(now / (70 + k * 13) + i + k)), base = py + TS - 5;
        ctx.fillStyle = k % 2 ? "rgba(255,120,40,0.85)" : "rgba(255,190,80,0.85)";
        ctx.beginPath(); ctx.moveTo(fx - 3.5, base); ctx.quadraticCurveTo(fx - 2, base - h * 0.6, fx + Math.sin(now / 120 + k) * 1.5, base - h); ctx.quadraticCurveTo(fx + 2, base - h * 0.6, fx + 3.5, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,240,180,0.8)"; ctx.beginPath(); ctx.ellipse(fx, base - 2, 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (let k = 0; k < 4; k++) {
        const t = ((now / 900 + noise(x, y, k + 70)) % 1), ex = px + 4 + noise(x, y, k + 80) * (TS - 8) + Math.sin(now / 200 + k) * 3, ey = py + TS - 6 - t * TS * 1.1;
        ctx.fillStyle = `rgba(255,${170 + k * 15},80,${1 - t})`; ctx.fillRect(ex, ey, 1.6, 1.6);
      }
      const st = (now / 2200 + noise(x, y, 90)) % 1;
      ctx.fillStyle = `rgba(60,58,58,${0.35 * (1 - st)})`; ctx.beginPath(); ctx.arc(px + TS / 2 + st * 8, py - st * TS * 0.9, 5 + st * 9, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** Smoke from canisters: billows that drift and roll. */
  function smoke(ctx: CanvasRenderingContext2D, now: number) {
    for (const s of S.smoke) {
      const cx = s.x * TS + TS / 2, cy = s.y * TS + TS / 2;
      for (let k = 0; k < 5; k++) {
        const a = now / (2400 + k * 300) + k * 1.3, r = 9 + k % 3 * 2 + Math.sin(now / 900 + k) * 1.5;
        ctx.fillStyle = `rgba(170,178,186,${0.42 + (k % 2) * 0.08})`;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 7, cy + Math.sin(a) * 6, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  return { floor, lights, flesh, fire, smoke };
}

/** SCP-049's faint mist, drawn around it as it moves. */
export function mist(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) {
  for (let k = 0; k < 6; k++) {
    const t = (now / 2600 + k / 6) % 1, a = k * 1.1 + now / 4000, d = 6 + t * 16;
    ctx.fillStyle = `rgba(200,210,200,${0.14 * (1 - t)})`;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7 + 4, 4 + t * 6, 0, Math.PI * 2); ctx.fill();
  }
}
/** Bubbles breaking in SCP-106's puddle while it waits under the floor. */
export function bubbles(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) {
  for (let k = 0; k < 4; k++) {
    const t = (now / 1300 + k * 0.27) % 1, a = k * 1.7;
    ctx.strokeStyle = `rgba(110,90,55,${0.8 * (1 - t)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 5, cy + 3 + Math.sin(a) * 3, 0.8 + t * 2.4, 0, Math.PI * 2); ctx.stroke();
  }
}
