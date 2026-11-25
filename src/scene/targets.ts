// Environment-first interface: the things in a room the Director can act on. Each target has a stable id, the room
// it belongs to, a region of the scene (in the scene's 1600 × 900 frame), a kind, an accessible label, and the
// panel it opens. Targets never run rules themselves: their panels use the campaign's commands. Pure, so the 2D scene,
// tests and an eventual 3D renderer (which would map the same ids to meshes) all read one definition.
import type { RoomLayout } from "./layout";

/** The scene frame every room is drawn in. */
export const FRAME = { W: 1600, H: 900, BX0: 200, BX1: 1400, BY0: 120, BY1: 640 } as const;
const { BX0, BX1, BY0, BY1 } = FRAME;

export type TargetKind = "station" | "person" | "anomaly" | "storage" | "display" | "exit";
export interface Target {
  id: string;
  kind: TargetKind;
  label: string;
  /** What selecting it shows: a panel id the hub resolves (e.g. "research", "person:r3-42", "briefing"), or a move. */
  panel: string;
  /** The region in the scene frame: x, y, width, height. */
  rect: [number, number, number, number];
  /** One line saying what it's for, shown on hover and focus. */
  hint: string;
}

/** Where the n people shown in a room stand: their feet (x, y) and scale. Shared by the drawing and the targets, so a
 *  person's clickable region is always the person. */
export function staffSlot(i: number, n: number): { x: number; y: number; s: number } {
  const span = BX1 - BX0 - 280, x = n <= 1 ? BX0 + 140 + span / 2 : BX0 + 140 + i * (span / (n - 1));
  return { x, y: BY1 + 40 + (i % 2) * 50, s: 0.72 };
}
/** How many staff a room shows as figures (the rest are counted on the room's plate). */
export const STAFF_SHOWN = 4;
/** D-Class are shown one figure for up to this many in the block. */
export const DCLASS_PER_FIGURE = 3;

const person = (L: RoomLayout, i: number, n: number, s: RoomLayout["staff"][number]): Target => {
  const p = staffSlot(i, n), h = 340 * p.s, w = 120 * p.s;
  return { id: `person:${s.id}`, kind: "person", label: s.name, panel: `person:${s.id}`, rect: [p.x - w / 2, p.y - h, w, h], hint: `${s.role[0].toUpperCase()}${s.role.slice(1)}` };
};
/** Every room has the service panel by its door: the room's own management (hiring, repair, upgrades, demolition). */
const service = (L: RoomLayout): Target => ({ id: "service", kind: "station", label: "Room services", panel: "room", rect: signRect(L), hint: "Staff, upkeep, repair and upgrades for this room" });

export function targetsFor(L: RoomLayout, opts: { heroes?: { id: string; name: string }[]; armOp?: boolean } = {}): Target[] {
  const t: Target[] = [];
  const staff = L.staff.filter(s => s.role !== "patient").slice(0, STAFF_SHOWN);
  const people = () => staff.forEach((s, i) => t.push(person(L, i, staff.length, s)));
  const operational = L.state === "operational" || L.state === "upgrading";
  switch (L.kind) {
    case "lab":
      if (operational) {
        t.push({ id: "board", kind: "display", label: "Project board", panel: "research", rect: [BX0 + 60, BY0 + 130, 420, 220], hint: "Choose projects and assign researchers" });
        t.push({ id: "apparatus", kind: "station", label: "Bench apparatus", panel: "project", rect: [BX0 + 520, BY1 - 300, 240, 190], hint: "The project on the bench: progress, requirements, what it unlocks" });
        t.push({ id: "records", kind: "storage", label: "Experiment records", panel: "experiments", rect: [BX0 + 780, BY1 - 240, 80, 240], hint: "Tests on the anomalies: the dossier, and the way to each chamber" });
        people();
      }
      t.push(service(L));
      break;
    case "command":
      t.push({ id: "ops", kind: "display", label: "Operations display", panel: "briefing", rect: [BX0 + 60, BY0 + 150, 560, 270], hint: "The Director's Briefing, the situation and the alert level" });
      t.push({ id: "signals", kind: "display", label: "Intelligence clocks", panel: "intel", rect: [BX0 + 670, BY0 + 140, 620, 112], hint: "The Insurgency, the anomalies, the O5 inspection" });
      t.push({ id: "teletype", kind: "station", label: "Council teletype", panel: "council", rect: [BX0 + 680, BY1 - 262, 420, 56], hint: "O5 standing, orders, requests and contracts" });
      t.push({ id: "comms", kind: "station", label: "Communications console", panel: "comms", rect: [BX0 + 680, BY1 - 200, 396, 200], hint: "Incidents, staff matters and the site log" });
      t.push({ id: "admin", kind: "storage", label: "Administration", panel: "admin", rect: [BX1 - 120, BY1 - 230, 80, 230], hint: "Finances and the 90-day forecast" });
      t.push({ id: "table", kind: "exit", label: "Plotting table", panel: "go:world", rect: [BX0 + 380, BY1 + 60, 500, 110], hint: "To the world map" });
      t.push({ id: "recruit", kind: "station", label: "Recruitment desk", panel: "room", rect: [BX0 + 1000, BY1 + 30, 200, 160], hint: "Recruit Epsilon-11, field agents" });
      break;
    case "quarters":
      t.push({ id: "org", kind: "display", label: "Organization board", panel: "org", rect: [BX0 + 120, BY0 + 150, 200, 130], hint: "The task force, its squads, specialties and qualifications" });
      t.push({ id: "roster", kind: "display", label: "Duty roster", panel: "roster", rect: [BX0 + 380, BY0 + 164, 110, 126], hint: "Everyone on the roster, site staff, the fallen and retired" });
      for (const h of opts.heroes ?? []) t.push({ id: `person:${h.id}`, kind: "person", label: h.name, panel: `person:${h.id}`, rect: [0, 0, 0, 0], hint: "Operative" });
      t.push({ id: "armorydoor", kind: "exit", label: "To the armory", panel: "go:armory", rect: [BX0 + 990, BY0 + 200, 110, 320], hint: "Their weapon on the armory bench" });
      break;
    case "armory":
      t.push({ id: "racks", kind: "storage", label: "Weapon racks", panel: "issue", rect: [BX0 + 40, BY0 + 110, BX1 - BX0 - 80, 330], hint: "Choose whose weapon to work on" });
      if (opts.armOp) t.push({ id: "bench", kind: "station", label: "Armourer's bench", panel: "bench", rect: [140, BY1 + 30, 1100, 200], hint: "Mounts, attachments, preview and fitting" });
      break;
    case "workshop":
      if (operational) {
        t.push({ id: "toolboard", kind: "storage", label: "Tool board and crews", panel: "crews", rect: [BX0 + 40, BY0 + 150, 380, 220], hint: "Which engineers are on which job; hire engineers" });
        t.push({ id: "lathe", kind: "station", label: "Lathe", panel: "production", rect: [BX0 + 470, BY1 - 260, 320, 260], hint: "What's being made and when it's done" });
        t.push({ id: "workbench", kind: "station", label: "Workbench", panel: "catalog", rect: [BX0 + 820, BY1 - 200, 300, 200], hint: "Equipment the workshop can build" });
        t.push({ id: "stores", kind: "storage", label: "Stores", panel: "stores", rect: [BX1 - 150, BY1 + 40, 230, 140], hint: "What's in stores; sell surplus" });
        people();
      }
      t.push(service(L));
      break;
    case "barracks":
      if (operational) {
        t.push({ id: "bunks", kind: "station", label: "Bunks", panel: "occupancy", rect: [BX0 + 20, BY1 - 180, BX1 - BX0 - 40, 180], hint: "Beds, occupancy, crowding and living conditions" });
        t.push({ id: "notices", kind: "display", label: "Orders board", panel: "dorders", rect: [BX0 + 40, BY0 + 170, 260, 150], hint: "Morale, the monthly order and transfers" });
      }
      t.push(service(L));
      break;
    default:
      if (L.kind.startsWith("cont_")) {
        if (L.occupant) {
          t.push({ id: "window", kind: "anomaly", label: `SCP-${L.occupant.scpId}`, panel: "anomaly", rect: [BX0 + 60, BY0 + 150, 720, 380], hint: "Observe it: status, risk and what is known" });
          t.push({ id: "console", kind: "station", label: "Test console", panel: "tests", rect: [BX0 + 80, BY1 + 40, 300, 130], hint: "Experiments on this anomaly" });
        }
        t.push({ id: "vault", kind: "station", label: "Vault door and procedures", panel: "procedures", rect: [BX1 - 400, BY1 - 390, 340, 340], hint: "Routine work, security and the containment procedures" });
      } else people();
      t.push(service(L));
  }
  return t;
}

/** The room's nameplate on the back wall (it doubles as the room-services target): shared with the drawing. */
export function signRect(L: RoomLayout): [number, number, number, number] {
  const label = signLabel(L), w = Math.round(label.length * 12.4 + 34), x = L.features.signage % 2 ? BX0 + 40 : BX1 - 40 - w;
  return [x, BY0 + 90, w, 44];
}
export const signLabel = (L: RoomLayout) => `${L.level < 0 ? `B${L.slot}` : L.designation} · ${L.name.toUpperCase()}`;
