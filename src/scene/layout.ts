// Presentation overhaul P1: Site-19 as one persistent physical facility. Every room's interior is derived here, from
// the campaign's own state: its stable id, type, level and slot, its neighbours, construction, damage, power,
// upgrades, the people working in it and what it contains. Nothing here is stored or simulated separately, so the
// overview, the interiors and an eventual 3D renderer all read the same installation.
//
// Pure: no DOM, no randomness from the game's dice. The architectural variety a room gets (pipe runs, signage, light
// fittings) comes from a hash of its stable id, so Barracks f7 always looks like Barracks f7, and a second barracks
// built later looks different and keeps its own look.
import type { Campaign } from "../campaign/campaign";
import { FACILITIES, SLOTS, dclassCapacity, operational, powerShort, type Facility, type FacilityType } from "../campaign/base";
import { present } from "../campaign/people";
import { researchersAssigned } from "../campaign/research";
import { crews } from "../campaign/crews";

/** The fixed locations that exist without a facility: Epsilon-11's quarters and the armory, in the surface
 *  compound's two long buildings (drawn above the cross-section since Phase 3E). */
export type FixedId = "surface:quarters" | "surface:armory";
export type SceneKind = FacilityType | "quarters" | "armory";
export type DoorKind = "room" | "lift" | "sealed" | "rock" | "yard";
export type RoomState = "operational" | "building" | "damaged" | "wrecked" | "repairing" | "demolishing" | "upgrading";

export interface RoomLayout {
  /** The facility's stable id, or a fixed location id. */
  id: string;
  kind: SceneKind;
  name: string;
  /** How the site's own signage names it: level and bay, e.g. "L2-B". */
  designation: string;
  level: number;
  slot: number;
  state: RoomState;
  /** Lights on: the room has power (command and the generators run on their own supply). */
  powered: boolean;
  alarm: boolean;
  /** What's on each side wall: a door into the next room, the level's lift, a sealed bulkhead onto an empty bay,
   *  bare rock at the end of the level, or the compound yard (surface buildings). */
  doors: { left: DoorKind; right: DoorKind };
  /** Stable architectural variety from the room's id (0 to 3 each). */
  features: { pipes: number; signage: number; lights: number; floor: number; clutter: number };
  upgrades: { expanded: boolean; recreation: boolean; genTier: number; grade?: number };
  /** Named people at work in the room, in a stable order. */
  staff: { id: string; name: string; role: string }[];
  /** A containment wing's occupant. */
  occupant?: { scpId: string; status: string; maintenance: number };
  /** Short lines for what the room is doing right now (a project, an order, a job). */
  activity: string[];
  /** D-Class in the block, guards posted, prisoners held: counts the room shows as bodies. */
  headcount: number;
  /** The D-Class block: beds across Site-19, so the room can show crowding (over 80% of beds). */
  capacity?: number;
}

const SHORT: Partial<Record<FacilityType, string>> = { cont_safe: "Safe wing", cont_euclid: "Euclid wing", cont_keter: "Keter wing", barracks: "D-Class block", security: "Security station", psych: "Psychological services" };

/** A small stable hash of a string, split into feature picks. */
function hash(s: string) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
export const designationOf = (level: number, slot: number) => `L${level + 1}-${String.fromCharCode(65 + slot)}`;

function stateOf(f: Facility): RoomState {
  if (f.demolishDays) return "demolishing";
  if (f.daysLeft > 0) return "building";
  if (f.repairDays > 0) return "repairing";
  if (f.disabled) return f.wrecked ? "wrecked" : "damaged";
  if (f.upgradeDays) return "upgrading";
  return "operational";
}

function doorFor(c: Campaign, f: Facility, side: -1 | 1): DoorKind {
  const s = f.slot + side;
  if (s < 0) return "lift";              // every level's lift shaft stands at its left end, as on the overview
  if (s >= SLOTS) return "rock";
  return c.base.facilities.some(x => x.level === f.level && x.slot === s) ? "room" : "sealed";
}

/** Researchers working in each lab: the people on projects, filled into the operational labs in order, four each. */
function labStaff(c: Campaign, f: Facility) {
  const labs = c.base.facilities.filter(x => x.type === "lab" && operational(x)).sort((a, b) => a.level - b.level || a.slot - b.slot);
  const i = labs.findIndex(x => x.id === f.id);
  if (i < 0) return [];
  const working = present(c, "researcher").slice(0, researchersAssigned(c));
  return working.slice(i * 4, i * 4 + 4).map(p => ({ id: p.id, name: p.name, role: "researcher" }));
}

export function roomLayout(c: Campaign, id: string): RoomLayout | null {
  if (id === "surface:quarters" || id === "surface:armory") return fixedLayout(c, id);
  const f = c.base.facilities.find(x => x.id === id);
  if (!f) return null;
  const h = hash(f.id), pick = (k: number) => (h >>> (k * 3)) & 3;
  const consumer = FACILITIES[f.type].power > 0;
  const occ = c.scps.find(s => s.wingId === f.id && (s.status === "contained" || s.status === "breach"));
  const staff: RoomLayout["staff"] = [];
  const activity: string[] = [];
  let headcount = 0, capacity: number | undefined;
  switch (f.type) {
    case "lab": staff.push(...labStaff(c, f)); for (const [pid, n] of Object.entries(c.research.assigned)) if (n) activity.push(pid); break;
    case "workshop": { const w = crews(c).crews.filter(j => j.what.startsWith("Workshop")); for (const j of w) { activity.push(j.what); for (const p of j.crew) staff.push({ id: p.id, name: p.name, role: "engineer" }); } break; }
    case "security": for (const g of c.guards.filter(g => g.alive && g.stationId === f.id)) staff.push({ id: g.id, name: g.name, role: "guard" }); headcount = staff.length; break;
    case "barracks": headcount = c.dclass; capacity = dclassCapacity(c); break;
    case "holding": headcount = c.prisoners?.length ?? 0; break;
    case "medical": for (const o of c.roster.filter(o => o.alive && (o.hp < o.maxHp || (o.injury && o.injury.until > c.day)))) staff.push({ id: o.id, name: o.name, role: "patient" }); break;
    case "psych": for (const o of c.roster.filter(o => o.alive && o.busy?.kind === "therapy")) staff.push({ id: o.id, name: o.name, role: "patient" }); break;
    default: break;
  }
  // the engineers on a job in this very room (building, repairing, refitting it)
  for (const j of crews(c).crews) if (j.what.includes(`(level ${f.level + 1})`) && j.what.includes(FACILITIES[f.type].name) && !j.what.startsWith("Workshop"))
    for (const p of j.crew) if (!staff.some(s => s.id === p.id)) staff.push({ id: p.id, name: p.name, role: "engineer" });
  return {
    id: f.id, kind: f.type, name: SHORT[f.type] ?? FACILITIES[f.type].name, designation: designationOf(f.level, f.slot), level: f.level, slot: f.slot,
    state: stateOf(f), powered: f.type === "command" ? !f.disabled : f.type === "generator" ? operational(f) : operational(f) && !(consumer && powerShort(c)),
    alarm: occ?.status === "breach" || (f.type === "security" && c.scps.some(s => s.status === "breach")),
    doors: { left: doorFor(c, f, -1), right: doorFor(c, f, 1) },
    features: { pipes: pick(0), signage: pick(1), lights: pick(2), floor: pick(3), clutter: pick(4) },
    upgrades: { expanded: !!f.upgraded, recreation: !!f.recreation, genTier: f.genTier ?? 0, grade: FACILITIES[f.type].grade },
    staff, occupant: occ ? { scpId: occ.id, status: occ.status, maintenance: occ.maintenance } : undefined, activity, headcount, capacity,
  };
}

function fixedLayout(c: Campaign, id: FixedId): RoomLayout {
  const h = hash(id), pick = (k: number) => (h >>> (k * 3)) & 3;
  const quarters = id === "surface:quarters";
  const ops = c.roster.filter(o => o.alive && !(o.busy && (o.busy.kind === "travel" || o.busy.kind === "contract")));
  return {
    id, kind: quarters ? "quarters" : "armory", name: quarters ? "Epsilon-11 quarters" : "Armory",
    designation: quarters ? "Surface, building 4" : "Surface, building 2", level: -1, slot: quarters ? 4 : 2,
    state: "operational", powered: true, alarm: c.scps.some(s => s.status === "breach") || c.incidents.some(i => i.kind === "raid"),
    doors: { left: "yard", right: "yard" },
    features: { pipes: pick(0), signage: pick(1), lights: pick(2), floor: pick(3), clutter: pick(4) },
    upgrades: { expanded: false, recreation: false, genTier: 0 },
    staff: quarters ? ops.map(o => ({ id: o.id, name: o.name, role: "operative" })) : [],
    activity: [], headcount: quarters ? ops.length : 0,
  };
}

/** Every room of the installation, overview order: surface buildings, then level by level, slot by slot. */
export function allRooms(c: Campaign): RoomLayout[] {
  const fixed = (["surface:armory", "surface:quarters"] as FixedId[]).map(id => fixedLayout(c, id));
  const rooms = [...c.base.facilities].sort((a, b) => a.level - b.level || a.slot - b.slot).map(f => roomLayout(c, f.id)!);
  return [...fixed, ...rooms];
}
