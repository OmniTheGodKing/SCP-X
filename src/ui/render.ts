// Draws the tactical map, units, sightlines, previews and effects onto the mission canvas.
import { CONT, EXIT, FULL, HALF, L, STEEL, TS, WALL, area, inContainer, passable, pathTo, tileAt, type Pt } from "../core/grid";
import { sightFrom } from "../core/sight";
import { center, shotInfo } from "../game/combat";
import { S, canAct, canSee, isPanicked, isTeam, seen, team, unitAt } from "../game/state";
import { blastArea, dragOptions, moveCost, reachFor, throwOptions } from "../game/turn";
import { abilityTargets } from "../game/abilities";
import type { Unit } from "../game/types";
import { MAPS } from "../data/maps";
import { escaping } from "../game/scp173";
import { freshBodies, isCalm, isStaggered, leadOptions } from "../game/scp049";

const C = {
  floor: "#222a32", floor2: "#252e37", wall: "#3a4551", wallTop: "#4b5866",
  desk: "#57503f", deskTop: "#6e6550", pillar: "#4a5561", pillarHatch: "#3c4550",
  door: "#8a7a55", exit: "#2b5440", steel: "#6f7f8e", steelDark: "#4f5c68",
  mtf: "#7aaad0", raider: "#b98bd3", subject: "#e0843f", concrete: "#bdb7ab",
  manila: "#d8bf86", alert: "#d75b47", ok: "#86c193",
};

export function createRenderer(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = L.W * TS * dpr; cv.height = L.H * TS * dpr;

  function drawTiles() {
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
      const t = L.grid[y][x], px = x * TS, py = y * TS;
      if (t === WALL) {
        ctx.fillStyle = C.wall; ctx.fillRect(px, py, TS, TS);
        if (tileAt(x, y + 1) !== WALL) { ctx.fillStyle = C.wallTop; ctx.fillRect(px, py + TS - 5, TS, 5); }
        continue;
      }
      if (t === STEEL) {
        ctx.fillStyle = C.steelDark; ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = C.steel; for (let k = 3; k < TS; k += 6) ctx.fillRect(px + 6, py + k, TS - 12, 2);
        continue;
      }
      if (t === CONT) {
        ctx.fillStyle = C.steelDark; ctx.fillRect(px, py, TS, TS);
        ctx.strokeStyle = C.steel; ctx.lineWidth = 1;
        ctx.beginPath(); for (let k = 4; k < TS; k += 7) { ctx.moveTo(px + k, py); ctx.lineTo(px + k, py + TS); } ctx.stroke();
        continue;
      }
      ctx.fillStyle = (x + y) % 2 ? C.floor : C.floor2; ctx.fillRect(px, py, TS, TS);
      if (t === HALF) {
        ctx.fillStyle = C.desk; ctx.fillRect(px + 4, py + 7, TS - 8, TS - 12);
        ctx.fillStyle = C.deskTop; ctx.fillRect(px + 4, py + 7, TS - 8, 4);
      } else if (t === FULL) {
        ctx.fillStyle = C.pillar; ctx.fillRect(px + 3, py + 3, TS - 6, TS - 6);
        ctx.strokeStyle = C.pillarHatch; ctx.lineWidth = 2; ctx.beginPath();
        for (let k = -TS; k < TS; k += 7) { ctx.moveTo(px + 3 + Math.max(0, k), py + 3 + Math.max(0, -k)); ctx.lineTo(px + 3 + Math.min(TS - 6, k + TS - 6), py + 3 + Math.min(TS - 6, TS - 6 - k)); }
        ctx.stroke();
      } else if (t === EXIT) {
        ctx.fillStyle = C.exit; ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
        ctx.fillStyle = "#cfe8d6"; ctx.font = "9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("EXIT", px + TS / 2, py + TS / 2);
      }
      if (L.doors.has(y * L.W + x)) {
        ctx.strokeStyle = C.door; ctx.lineWidth = 2;
        const vertical = tileAt(x - 1, y) === WALL && tileAt(x + 1, y) === WALL;
        ctx.beginPath();
        if (vertical) { ctx.moveTo(px + 1, py + 2); ctx.lineTo(px + 1, py + TS - 2); ctx.moveTo(px + TS - 1, py + 2); ctx.lineTo(px + TS - 1, py + TS - 2); }
        else { ctx.moveTo(px + 2, py + 1); ctx.lineTo(px + TS - 2, py + 1); ctx.moveTo(px + 2, py + TS - 1); ctx.lineTo(px + TS - 2, py + TS - 1); }
        ctx.stroke();
      }
    }
    // container door frame along its open (north) side
    if (!L.contTiles.length) return;
    const [x0, y0] = L.contTiles[0], x1 = Math.max(...L.contTiles.map(t => t[0]));
    ctx.strokeStyle = S.sealed ? C.ok : C.manila; ctx.lineWidth = S.sealed ? 4 : 2;
    ctx.setLineDash(S.sealed ? [] : [4, 4]);
    ctx.beginPath(); ctx.moveTo(x0 * TS, y0 * TS + 1); ctx.lineTo((x1 + 1) * TS, y0 * TS + 1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e7ecf0"; ctx.font = "9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("CONTAINER", (x0 + x1 + 1) / 2 * TS, (y0 + 2) * TS - 5);
  }

  function drawFog() {
    for (let i = 0; i < L.W * L.H; i++) {
      if (S.vis[i]) continue;
      ctx.fillStyle = S.explored[i] ? "rgba(8,10,13,0.5)" : "rgba(8,10,13,0.94)";
      ctx.fillRect((i % L.W) * TS, ((i / L.W) | 0) * TS, TS, TS);
    }
  }

  // Placeholder SCP-173: a crude standing concrete figure with rebar and spray-paint marks.
  function drawStatue(x: number, y: number, alpha: number) {
    const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.concrete;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 13); ctx.lineTo(cx - 7, cy - 3); ctx.lineTo(cx + 7, cy - 3); ctx.lineTo(cx + 6, cy + 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy - 8, 5.5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6b5a48"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy - 1); ctx.lineTo(cx - 11, cy + 6); ctx.moveTo(cx + 7, cy - 1); ctx.lineTo(cx + 11, cy + 6); ctx.stroke();
    ctx.fillStyle = "#7a2f22"; ctx.fillRect(cx - 4, cy - 9, 3, 1.6); ctx.fillRect(cx + 1, cy - 9, 3, 1.6);
    ctx.fillStyle = "#3f6b45"; ctx.fillRect(cx - 4, cy + 2, 8, 2);
    ctx.globalAlpha = 1;
  }

  function drawEye(cx: number, cy: number) {
    ctx.fillStyle = "#0f1317"; ctx.beginPath(); ctx.ellipse(cx, cy, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.manila; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.manila; ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // The surface hatch SCP-173 can escape through, and the panel that locks it
  function drawHatch() {
    const def = MAPS[S.setup.map];
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

  // SCP-049: a dark robed figure with the pale beak of a plague mask
  function drawDoctor(cx: number, cy: number) {
    ctx.fillStyle = "#1d1a18";
    ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 10, cy + 12); ctx.lineTo(cx - 10, cy + 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = isCalm() ? C.ok : isStaggered() ? C.manila : C.alert; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#e8dcc0";
    ctx.beginPath(); ctx.moveTo(cx - 3, cy - 6); ctx.lineTo(cx + 9, cy - 2); ctx.lineTo(cx - 3, cy + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0f1317"; ctx.beginPath(); ctx.arc(cx - 2, cy - 5, 1.6, 0, Math.PI * 2); ctx.fill();
    if (isCalm()) tag("CALM", cx, cy - 20, C.ok);
    else if (isStaggered()) tag("STAGGERED", cx, cy - 20, C.manila);
  }

  function drawUnit(u: Unit) {
    const [cx, cy] = center(u);
    if (u.side === "anomaly" && S.has049) { drawDoctor(cx, cy); return; }
    if (u.side === "anomaly") { drawStatue(u.x, u.y, 1); return; }
    if (u.side === "zombie") {
      ctx.fillStyle = "#6f7a5c";
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#0f1317"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#0f1317"; ctx.font = "600 9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("2", cx, cy + 1);
      const w = 20; ctx.fillStyle = "#0f1317"; ctx.fillRect(cx - w / 2 - 1, cy - 17, w + 2, 4);
      ctx.fillStyle = C.alert; ctx.fillRect(cx - w / 2, cy - 16, w * u.hp / u.maxHp, 2);
      return;
    }
    if (u.side === "mtf" && u.downed) {
      ctx.fillStyle = "#3a4450";
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = u.stabilized ? C.ok : C.alert; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke();
      if (!u.stabilized) tag(`${u.bleed}`, cx + 11, cy - 11, C.alert);
      return;
    }
    if (u.side === "mtf") {
      const pan = isPanicked(u);
      ctx.fillStyle = pan ? "#55636f" : u.guard ? "#9fb3c4" : C.mtf;
      ctx.beginPath();
      // guards are drawn as rounded squares, Epsilon-11 as circles
      if (u.guard) ctx.roundRect(cx - 10, cy - 10, 20, 20, 5); else ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f1317"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#0f1317"; ctx.font = "600 11px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pan ? "––" : String(u.slot ?? ""), cx, cy + 1);
      if (u.overwatch) {
        ctx.strokeStyle = C.manila; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 14, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      }
    } else if (u.side === "raider") {
      ctx.fillStyle = u.downed ? "#5d5266" : C.raider;
      ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 11, cy); ctx.lineTo(cx, cy + 12); ctx.lineTo(cx - 11, cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#0f1317"; ctx.lineWidth = 2; ctx.stroke();
    } else if (u.side === "civilian") {
      // civilians are squares; witnesses carry a W until they are dosed
      ctx.fillStyle = u.dosed ? "#8a9a86" : "#cfc6a8";
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
      ctx.strokeStyle = u.witness && !u.dosed ? C.manila : "#0f1317"; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 8, cy - 8, 16, 16);
      ctx.fillStyle = "#0f1317"; ctx.font = "600 9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(u.dosed ? "✓" : u.witness ? "W" : "C", cx, cy + 1);
      if (u.spooked && !u.dosed) tag("!", cx + 10, cy - 10, C.alert);
      return;
    } else {
      // D-Class: the work detail gets a solid ring, loose ones a broken one
      ctx.fillStyle = C.subject;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = u.side === "dclass" ? "#f2e6c9" : "#0f1317"; ctx.lineWidth = 2;
      if (u.side !== "dclass") ctx.setLineDash([3, 3]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#0f1317"; ctx.font = "600 9px IBM Plex Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("D", cx, cy + 1);
    }
    if (u.staring) drawEye(cx + 10, cy - 10);
    if (u.side !== "subject") {
      const w = 20, frac = u.hp / u.maxHp;
      ctx.fillStyle = "#0f1317"; ctx.fillRect(cx - w / 2 - 1, cy - 17, w + 2, 4);
      ctx.fillStyle = u.side === "raider" ? C.alert : "#9cd0a6"; ctx.fillRect(cx - w / 2, cy - 16, w * frac, 2);
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

  return function draw(now: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L.W * TS, L.H * TS);
    drawTiles();
    drawFog();
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

    // bodies SCP-049 could still raise
    if (S.has049) for (const b of freshBodies()) {
      if (!seen(b.x, b.y)) continue;
      const [cx, cy] = center(b);
      ctx.strokeStyle = "#7d6f5a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 7, cy - 7); ctx.lineTo(cx + 7, cy + 7); ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx - 7, cy + 7); ctx.stroke();
    }
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

    for (const u of S.units) {
      if (!u.alive || u.saved) continue;
      if (!isTeam(u) && !seen(u.x, u.y)) continue;
      drawUnit(u);
    }

    // smoke
    for (const s of S.smoke) {
      const cx = s.x * TS + TS / 2, cy = s.y * TS + TS / 2;
      ctx.fillStyle = "rgba(170,178,186,0.55)";
      for (const [ox, oy, r] of [[-6, -4, 11], [6, -2, 10], [0, 6, 12]]) { ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); ctx.fill(); }
    }

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
      const [cx, cy] = center(sel);
      ctx.strokeStyle = C.manila; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 60;
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
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
      } else if (tu && tu.side === "raider" && seen(hv.x, hv.y) && sel.side === "mtf" && sel.ap > 0 && canSee(sel, hv.x, hv.y)) {
        const s = shotInfo(sel, tu), [ax, ay] = center(s.from), [bx, by] = center(tu);
        ctx.strokeStyle = "rgba(215,91,71,0.8)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by, 15, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#0f1317"; ctx.fillRect(bx + 14, by - 22, 40, 17);
        ctx.fillStyle = "#f2e6c9"; ctx.font = "500 12px IBM Plex Mono, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${s.chance}%`, bx + 18, by - 13);
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

    S.effects = S.effects.filter(e => now - e.t0 < e.dur);
    for (const e of S.effects) {
      const k = (now - e.t0) / e.dur;
      if (e.type === "line") {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x0, e.y0); ctx.lineTo(e.x1, e.y1); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (e.type === "text") {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = e.color; ctx.font = "600 13px IBM Plex Mono, monospace"; ctx.textAlign = "center";
        ctx.fillText(e.text, e.x, e.y - k * 14); ctx.globalAlpha = 1;
      } else if (e.type === "ghost") {
        drawStatue(e.x, e.y, 0.5 * (1 - k));
      } else {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = "#fff8e0";
        ctx.beginPath(); ctx.arc(e.x, e.y, TS * (0.6 + k * 1.2), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
  };
}
