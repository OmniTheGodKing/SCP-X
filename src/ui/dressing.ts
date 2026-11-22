// Environment dressing for the tactical map layer: what makes a 1951 Foundation corridor look different from a 2010
// one, an Insurgency-held building look held, and an outbreak zone look quarantined. Everything here is drawn flat
// on floors and wall faces: it never adds cover or blocks sight, so the picture can't disagree with the rules.
// Stand-in art drawn in code; finished art goes through art/tactical (see its README).
import { DRUM, EXIT, FULL, HALF, L, PART, STEEL, TS, WALL, WINDOW, passable, tileAt } from "../core/grid";
import { S } from "../game/state";
import { noise } from "./tiles";

export type EraId = "1950s" | "1960s" | "1970s" | "1980s" | "1990s" | "2000s" | "2010s" | "2020s";
export const eraId = (y: number): EraId => (y < 1960 ? "1950s" : y < 1970 ? "1960s" : y < 1980 ? "1970s" : y < 1990 ? "1980s" : y < 2000 ? "1990s" : y < 2010 ? "2000s" : y < 2020 ? "2010s" : "2020s");
const FOUNDATION = new Set(["wingC", "dblock", "lab"]);
export const foundationMap = () => FOUNDATION.has(S.setup.map ?? "wingC");

/** Facility look by period: the painted wall band, the light the lamps give, and the floor's finish. */
export function facilityLook(year: number) {
  // 1950s-60s: green institutional paint over raw concrete, bare bulbs. 1970s-80s: beige enamel and fluorescent
  // tubes. 1990s-2000s: blue-grey panels. 2010s on: pale composite walls, epoxy floors, LED panels.
  if (year < 1970) return { band: "rgba(70,105,90,0.6)", lamp: [255, 214, 150] as const, lampShape: "round" as const, floorTint: "rgba(90,78,44,0.10)", wall: { top: "#3a4540", face: "#4d5a50", line: "#38423c", hi: "#5d6a5f" }, sheen: 0 };
  if (year < 1990) return { band: "rgba(170,120,60,0.6)", lamp: [225, 240, 255] as const, lampShape: "tube" as const, floorTint: "rgba(130,108,70,0.10)", wall: { top: "#4a463c", face: "#625b4b", line: "#423d33", hi: "#756d5a" }, sheen: 0 };
  if (year < 2010) return { band: "rgba(80,100,135,0.6)", lamp: [220, 232, 255] as const, lampShape: "tube" as const, floorTint: "rgba(70,84,110,0.10)", wall: { top: "#3e4856", face: "#566273", line: "#3a4350", hi: "#6a7789" }, sheen: 0.04 };
  return { band: "rgba(215,215,210,0.55)", lamp: [240, 248, 255] as const, lampShape: "led" as const, floorTint: "rgba(170,180,190,0.10)", wall: { top: "#59626b", face: "#7c8791", line: "#4d555d", hi: "#919ca6" }, sheen: 0.07 };
}

/** Wall-mounted equipment on south wall faces in Foundation facilities, by period: telephones and gauge panels in
 *  the 1950s, intercoms and the first monitors in the 1970s, keypads and cameras in the 1990s, card readers and
 *  flat screens after 2010. */
function wallFixture(ctx: CanvasRenderingContext2D, x: number, y: number, year: number) {
  const px = x * TS, fy = y * TS + TS - 10, k = Math.floor(noise(x, y, 61) * 3);
  ctx.save();
  if (year < 1970) {
    if (k === 0) { ctx.fillStyle = "#2a2a24"; ctx.fillRect(px + 12, fy + 1, 8, 8); ctx.fillStyle = "#c9b98a"; ctx.beginPath(); ctx.arc(px + 16, fy + 5, 2.4, 0, Math.PI * 2); ctx.fill(); }
    else if (k === 1) { ctx.fillStyle = "#4b4a3a"; ctx.fillRect(px + 8, fy + 1, 16, 7); for (const gx of [12, 20]) { ctx.fillStyle = "#e8e2c8"; ctx.beginPath(); ctx.arc(px + gx, fy + 4.5, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#7a1a1a"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px + gx, fy + 4.5); ctx.lineTo(px + gx + 1.6, fy + 3); ctx.stroke(); } }
    else { ctx.fillStyle = "#a8322c"; ctx.fillRect(px + 13, fy + 1, 6, 7); ctx.fillStyle = "#5a1a18"; ctx.fillRect(px + 13, fy + 1, 6, 1.5); }
  } else if (year < 1990) {
    if (k === 0) { ctx.fillStyle = "#3a3a36"; ctx.fillRect(px + 11, fy + 1, 10, 8); ctx.fillStyle = "#1a1a18"; for (let i = 0; i < 3; i++) ctx.fillRect(px + 13, fy + 2.5 + i * 2, 6, 0.8); }
    else if (k === 1) { ctx.fillStyle = "#2a2c2e"; ctx.fillRect(px + 9, fy, 14, 9); ctx.fillStyle = "rgba(120,200,140,.55)"; ctx.fillRect(px + 10.5, fy + 1.5, 11, 6); }
    else { ctx.fillStyle = "#a8322c"; ctx.fillRect(px + 13, fy + 1, 6, 7); }
  } else if (year < 2010) {
    if (k === 0) { ctx.fillStyle = "#3d4248"; ctx.fillRect(px + 12, fy + 1, 8, 8); ctx.fillStyle = "#9aa3ad"; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(px + 13 + i * 2.3, fy + 2 + j * 2.3, 1.5, 1.5); }
    else if (k === 1) { ctx.fillStyle = "#2a2d31"; ctx.fillRect(px + 13, fy + 2, 7, 4); ctx.fillStyle = "#c33"; ctx.fillRect(px + 18, fy + 3, 1.2, 1.2); }
    else { ctx.fillStyle = "#a8322c"; ctx.fillRect(px + 13, fy + 1, 6, 7); }
  } else {
    if (k === 0) { ctx.fillStyle = "#1e2124"; ctx.fillRect(px + 13, fy + 1, 6, 8); ctx.fillStyle = "#4ad36a"; ctx.fillRect(px + 15, fy + 2.5, 2, 1.2); }
    else if (k === 1) { ctx.fillStyle = "#15181b"; ctx.fillRect(px + 7, fy, 18, 9); ctx.fillStyle = "rgba(90,160,220,.5)"; ctx.fillRect(px + 8, fy + 1, 16, 7); }
    else { ctx.fillStyle = "#e5c23a"; ctx.fillRect(px + 4, fy + 7, 24, 2); ctx.fillStyle = "#1b1b18"; for (let i = 0; i < 24; i += 4) ctx.fillRect(px + 4 + i, fy + 7, 2, 2); }
  }
  ctx.restore();
}

/** A building the Insurgency holds: ammunition crates, a painted marking on the floor, gun racks on the walls,
 *  a map table. GOC teams leave a different marking. */
function hostileDressing(ctx: CanvasRenderingContext2D, rooms: [number, number, number, number][], goc: boolean) {
  const mark = goc ? "#6f8fb0" : "#a83a32";
  for (const [x0, y0, x1, y1] of rooms) {
    const tiles: [number, number][] = [];
    for (let y = Math.max(1, y0); y <= Math.min(L.H - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(L.W - 2, x1); x++) if (tileAt(x, y) !== WALL) tiles.push([x, y]);
    if (!tiles.length) continue;
    const open = tiles.filter(([x, y]) => passable(x, y) && ![HALF, FULL, DRUM, EXIT, STEEL].includes(tileAt(x, y)) && !L.door.has(y * L.W + x));
    // the faction's mark painted on the floor near the middle of the room
    const mid = open[Math.floor(open.length / 2)];
    if (mid) {
      const cx = mid[0] * TS + TS / 2, cy = mid[1] * TS + TS / 2;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = mark; ctx.lineWidth = 2.4;
      if (goc) { ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(cx - 9, cy + 8); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx + 9, cy + 8); ctx.moveTo(cx - 5, cy + 1); ctx.lineTo(cx + 5, cy + 1); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    // flat-packed crates and a map spread on the floor, against the walls, never in the way
    let n = 0;
    for (const [x, y] of open) {
      const byWall = tileAt(x, y - 1) === WALL || tileAt(x - 1, y) === WALL || tileAt(x + 1, y) === WALL;
      if (!byWall || noise(x, y, 71) > 0.28 || n > 5) continue;
      n++;
      const px = x * TS, py = y * TS;
      if (n % 3 === 0) { ctx.fillStyle = "rgba(220,210,170,0.5)"; ctx.save(); ctx.translate(px + 16, py + 16); ctx.rotate(noise(x, y, 72) - 0.5); ctx.fillRect(-8, -6, 16, 12); ctx.strokeStyle = "rgba(160,60,40,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(1, 2); ctx.lineTo(5, -3); ctx.stroke(); ctx.restore(); }
      else { ctx.fillStyle = "#4a4f36"; ctx.fillRect(px + 5, py + 9, 14, 9); ctx.fillStyle = "#3a3e2a"; ctx.fillRect(px + 5, py + 9, 14, 2); ctx.fillStyle = "#d9c45a"; ctx.fillRect(px + 8, py + 13, 7, 1.4); if (n % 2) { ctx.fillStyle = "#4a4f36"; ctx.fillRect(px + 17, py + 18, 11, 8); ctx.fillStyle = "#d9c45a"; ctx.fillRect(px + 19, py + 21, 5, 1.2); } }
    }
    // a gun rack on a south-facing wall
    const rackWall = tiles.find(([x, y]) => tileAt(x, y - 1) === WALL && noise(x, y, 73) < 0.5);
    if (rackWall) { const [x, y] = rackWall, px = x * TS, fy = (y - 1) * TS + TS - 10; ctx.fillStyle = "#3a2c1e"; ctx.fillRect(px + 4, fy + 1, 24, 2); for (let i = 0; i < 4; i++) { ctx.fillStyle = "#1e1f21"; ctx.fillRect(px + 6 + i * 6, fy - 1, 1.6, 9); } }
  }
}

/** An outbreak zone: biohazard placards beside doorways, quarantine tape stretched along the outbreak rooms'
 *  doors, and abandoned kit. Drawn at mission start; the growth itself is drawn live from the rules. */
function outbreakDressing(ctx: CanvasRenderingContext2D) {
  for (const i of L.doors) {
    const x = i % L.W, y = (i / L.W) | 0;
    const wallBeside = [[-1, 0], [1, 0], [0, -1]].find(([dx, dy]) => tileAt(x + dx, y + dy) === WALL);
    if (wallBeside && noise(x, y, 81) < 0.6) {
      const [dx, dy] = wallBeside, px = (x + dx) * TS + 10, py = (y + dy) * TS + (dy ? TS - 10 : 8);
      ctx.fillStyle = "#e5c23a"; ctx.beginPath(); ctx.moveTo(px + 6, py); ctx.lineTo(px + 12, py + 9); ctx.lineTo(px, py + 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1b1b18"; ctx.beginPath(); ctx.arc(px + 6, py + 5.6, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // tape across the doorway's floor
    ctx.save(); ctx.lineWidth = 2.2; ctx.setLineDash([4, 4]);
    const vertical = tileAt(x - 1, y) === WALL && tileAt(x + 1, y) === WALL;
    const [ax, ay, bx, by] = vertical ? [x * TS + 2, y * TS + 6, x * TS + TS - 2, y * TS + TS - 6] : [x * TS + 6, y * TS + 2, x * TS + TS - 6, y * TS + TS - 2];
    ctx.strokeStyle = "rgba(229,194,58,.75)"; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.restore();
  }
  for (let y = 1; y < L.H - 1; y++) for (let x = 1; x < L.W - 1; x++) {
    if (!passable(x, y) || tileAt(x, y) !== 1 || noise(x, y, 91) > 0.025) continue;
    const px = x * TS + 8 + noise(x, y, 92) * 14, py = y * TS + 8 + noise(x, y, 93) * 14;
    if (noise(x, y, 94) < 0.5) { ctx.fillStyle = "#4c5238"; ctx.beginPath(); ctx.ellipse(px, py, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.beginPath(); ctx.arc(px - 1.5, py - 1.5, 1.6, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = "rgba(110,20,24,.55)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.quadraticCurveTo(px, py - 4, px + 9, py + 2); ctx.stroke(); }
  }
}

/** Run every dressing pass that applies to this mission. Called once per map-layer rebuild, after the props. */
export function dressMap(ctx: CanvasRenderingContext2D) {
  const year = S.setup.year ?? 1951;
  if (foundationMap()) {
    const look = facilityLook(year);
    ctx.fillStyle = look.floorTint;
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (passable(x, y)) ctx.fillRect(x * TS, y * TS, TS, TS);
    // a modern epoxy floor catches the light in long streaks
    if (look.sheen) for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (passable(x, y) && noise(x, y, 66) < 0.3) { ctx.fillStyle = `rgba(255,255,255,${look.sheen})`; ctx.fillRect(x * TS + 3, y * TS + 6 + noise(x, y, 67) * 18, TS - 6, 2); }
    for (let y = 1; y < L.H - 1; y++) for (let x = 1; x < L.W - 1; x++) {
      if (tileAt(x, y) !== WALL || tileAt(x, y + 1) === WALL || tileAt(x, y + 1) === WINDOW || tileAt(x, y + 1) === PART) continue;
      if (noise(x, y, 60) < 0.16) wallFixture(ctx, x, y, year);
    }
  }
  const hostile = (S.setup.kind === "strike" || S.setup.kind === "retaliation" || S.setup.kind === "escort") && (L.def.insurgentRooms?.length ?? 0) > 0;
  if (hostile) hostileDressing(ctx, L.def.insurgentRooms, !!S.setup.goc);
  if (S.setup.kind === "outbreak") outbreakDressing(ctx);
}
