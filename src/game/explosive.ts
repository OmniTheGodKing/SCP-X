// Explosions (Tactical overhaul T5): a frag grenade, bazooka or LAW going off at a tile. One function for the team's
// throws and the enemy's, so a grenade does the same thing whoever throws it.
import { DIRS, DRUM, L, TS, blastStructure, tileAt, type Pt } from "../core/grid";
import { damage } from "./combat";
import { ignite } from "./fire";
import { emitNoise } from "./noise";
import { hasPerk } from "./perks";
import { S, computeVis, full, fx, highlight, log } from "./state";
import type { Unit } from "./types";
import { passable } from "../core/grid";

/** The tiles a blast at (x, y) covers: that tile and every open tile around it. */
export const blastArea = (x: number, y: number): Pt[] => DIRS.concat([[0, 0]]).map(([dx, dy]) => [x + dx, y + dy] as Pt).filter(([a, b]) => passable(a, b));
export const BLAST_POWER: Record<string, number> = { frag: 3, law: 4, bazooka: 5 };

export function blast(u: Unit, x: number, y: number, kind: "frag" | "bazooka" | "law") {
  const area = blastArea(x, y);
  const inArea = (v: Unit) => area.some(([a, b]) => a === v.x && b === v.y);
  const power = BLAST_POWER[kind];
  fx({ type: "blast", x: x * TS + TS / 2, y: y * TS + TS / 2, r: power >= 4 ? 2 : 1.5, dur: 700 });
  highlight(power >= 4 ? 6 : 5, "#ff9a50");
  emitNoise(x, y, "explosion", u);
  log(kind === "frag" ? `${full(u)} throws a frag grenade.` : `${full(u)} fires the ${kind === "bazooka" ? "bazooka" : "LAW"}.`, u.side === "raider" ? "bad" : "key");
  for (const v of S.units.filter(v => v.alive && !v.saved && (v.side !== "anomaly" || S.scp === "682")).filter(inArea)) {
    const soak = Math.min(v.armor ?? 0, power);
    S.hitKind = "explosive";
    damage(v, power - soak, u);
    if (v.armor && hasPerk(u, "shredder")) v.armor--;
  }
  // the blast takes cover, doors, partitions and glass; a rocket also opens an ordinary interior wall
  const broke = new Set<string>();
  for (const [a, b] of area.concat(DIRS.map(([dx, dy]) => [x + dx, y + dy] as Pt))) { const r = blastStructure(a, b, kind === "frag" ? 1 : 2); if (r) broke.add(r); }
  if (broke.size) { log(`The blast tears out ${[...broke].map(k => ({ cover: "cover", door: "a door", partition: "a partition", window: "glass", wall: "a wall" }[k])).join(", ")}.`); computeVis(); }
  // blasts set off fuel drums and scorch flesh
  for (const [a, b] of area) if (tileAt(a, b) === DRUM || S.flesh.has(b * L.W + a)) ignite(a, b, 1);
  if (!hasPerk(u, "quiet_steps")) S.mem.set("bang-" + u.id, { x, y, turn: S.turn });
}
