// Sandbox missions (Tactical overhaul T6/T7): a real mission state built from a hand-drawn map and a list of units, run
// by the production rules (geometry kernel, perception, combat, reactions, the AI). The tactical lab and the headless
// tests both use it; nothing here simulates the rules separately.
import { Level, L, useLevel, type DoorState, type MapDef } from "../core/grid";
import { beginMission } from "../core/rng";
import { setSmoke } from "../core/geom";
import { MODELS, TYPES, type WeaponType } from "../data/weapons";
import { computeVis, setMission } from "./state";
import type { MissionMods, MissionSetup, MissionState, Side, Unit } from "./types";
import type { Weather } from "../data/weather";

export interface SandboxUnit {
  id?: string; side: Side; x: number; y: number; name?: string; aim?: number; hp?: number; armor?: number;
  gun?: WeaponType; ammo?: number; perks?: string[]; role?: string; facing?: number;
}
export interface SandboxSpec {
  rows: string[];
  /** Areas open to the sky: true for all, or a list of [x0, y0, x1, y1] rectangles. Indoors otherwise. */
  outdoors?: boolean | [number, number, number, number][];
  night?: boolean; weather?: Weather; powerOut?: boolean;
  units: SandboxUnit[];
  doors?: Record<string, DoorState>;
  seed?: number;
}

export const SANDBOX_MODS: MissionMods = { blinkBonus: 0, recoverBonus: 0, mtfDrag: 1, track173: false, lockdownTurns: 3, calmTurns: 1, pocketReturn: 0.3, medkitHeal: 3, standUp: false, m79: false, reactionBonus: 0, sightBonus: 0, ciAnalysis: false, strays: 0 };

/** The weapon a sandbox unit carries: the standard model of that type. */
export function sandboxGun(type: WeaponType, ammo?: number) {
  const m = MODELS.find(x => x.type === type && x.start) ?? MODELS.find(x => x.type === type)!;
  return { name: m.name, type, dmg: [...m.dmg] as [number, number], mag: m.mag, ammo: ammo ?? m.mag, aim: m.aim };
}

export function createSandbox(spec: SandboxSpec): MissionState {
  const out = spec.outdoors;
  const def: MapDef = {
    name: "Tactical lab", rows: spec.rows,
    area: (x, y) => out === true || (Array.isArray(out) && out.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3])) ? "field" : "room",
    squadSpawns: [[1, 1]], scpRooms: [], insurgentRooms: [], strayRooms: [], fixedFurniture: true,
  };
  useLevel(new Level(def));
  for (const [k, st] of Object.entries(spec.doors ?? {})) { const [x, y] = k.split(",").map(Number), d = L.door.get(y * L.W + x); if (d) d.state = st; }
  for (const d of L.door.values()) if (!Object.keys(spec.doors ?? {}).length) d.state = "open";
  L.version++;
  setSmoke([]);
  let n = 0;
  const units: Unit[] = spec.units.map(s => ({
    id: s.id ?? `${s.side}${++n}`, side: s.side, name: s.name ?? (s.side === "mtf" ? `Operative ${n}` : s.side === "raider" ? "Insurgent" : s.side === "civilian" ? "Civilian" : s.side),
    call: s.side === "mtf" ? `E11-0${n}` : undefined,
    x: s.x, y: s.y, hp: s.hp ?? 6, maxHp: s.hp ?? 6, san: 80, aim: s.aim ?? (s.side === "raider" ? 60 : 65), armor: s.armor ?? 0,
    gun: s.gun ? sandboxGun(s.gun, s.ammo) : s.side === "mtf" || s.side === "raider" ? sandboxGun("rifle", s.ammo) : undefined,
    perks: (s.perks ?? []) as Unit["perks"], role: s.role as Unit["role"], facing: s.facing ?? 0,
    alive: true, saved: false, ap: 2, overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0, items: [],
  } as unknown as Unit));
  const statue = { id: "none", side: "anomaly", name: "nothing", x: 0, y: 0, hp: 1, maxHp: 1, san: 0, alive: false, saved: false, ap: 0, overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0, aim: 0 } as unknown as Unit;
  units.push(statue);
  const setup = {
    seed: spec.seed ?? 1, kind: spec.powerOut ? "emergency" : "strike", map: "wingC", amnestics: 0, night: !!spec.night || !!spec.powerOut, weather: spec.weather ?? "clear",
    witnesses: 0, civilians: 0, incidentId: "lab", title: "Tactical lab", insurgents: units.filter(u => u.side === "raider").length, squad: [], dclass: [], known: [],
    mods: { ...SANDBOX_MODS }, insurgentArmor: 0,
  } as unknown as MissionSetup;
  const W = L.W, H = L.H;
  const state = {
    setup, scp: undefined, has173: false, has049: false, calmUntil: 0, has106: false, sunkUntil: 0, submerged: false, feedTurn: -1, corroded: new Set(), amnestics: 0, turn: 1, phase: "player", busy: false, over: false, called: false, mode: null,
    units, statue, sealed: false, selected: null, hover: null, pending: null,
    vis: new Uint8Array(W * H), explored: new Uint8Array(W * H),
    lastSeen: null, raidersActive: true, mem: new Map(), checked: new Set(), concealed: false,
    activePods: [0, 1, 2, 3, 4, 5], known: new Set(), fresh: new Set(), log: [], effects: [],
    stats: { mtfLost: 0, dLost: 0, escaped: 0, raidersDown: 0 }, smoke: [], flares: [], throwing: null, ability: null, reinforce: [],
    escapeDrive: 0, lockedUntil: 0, escaped: false, photos: [], optional: [], siren: false, lockedDoors: [], fires: new Map(), flesh: new Set(), core: null,
    powerOn: !spec.powerOut,
  } as unknown as MissionState;
  setMission(state);
  beginMission(setup.seed ?? 1);
  computeVis();
  return state;
}
void TYPES;
