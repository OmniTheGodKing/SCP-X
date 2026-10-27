// Building a mission from what Site-19 sends, and turning its outcome into a result.
import { Level, floorTiles, useLevel, type MapDef, type Pt } from "../core/grid";
import { setSmoke } from "../core/sight";
import { insurgentGuns } from "../data/weapons";
import { STARTING_NOTES } from "./notes";
import { PROFILE } from "./profiles";
import { S, computeVis, log, setMission } from "./state";
import type { MissionResult, MissionSetup, MissionState, Unit } from "./types";

function mk(o: Partial<Unit> & Pick<Unit, "id" | "side" | "name" | "x" | "y" | "hp" | "maxHp" | "san">): Unit {
  return { aim: 0, alive: true, saved: false, ap: 0, overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0, ...o };
}

const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function createMission(def: MapDef, setup: MissionSetup) {
  useLevel(new Level(def));
  const taken = new Set<string>();
  const claim = (tiles: Pt[]) => {
    const free = tiles.filter(([x, y]) => !taken.has(x + "," + y));
    const t = pick(free.length ? free : tiles);
    taken.add(t[0] + "," + t[1]);
    return t;
  };
  const units: Unit[] = [];

  setup.squad.forEach((m, i) => {
    const [x, y] = def.squadSpawns[i];
    taken.add(x + "," + y);
    units.push(mk({ id: "m" + (i + 1), opId: m.opId, slot: i + 1, side: "mtf", call: m.call, name: m.name, x, y,
      hp: m.hp, maxHp: m.maxHp, san: m.san, maxSan: m.maxSan, aim: m.aim, blinkFull: m.blinkFull,
      armor: m.armor + (m.perks.includes("plated") ? 1 : 0), hasArmor: m.hasArmor, blinkMod: setup.mods.blinkBonus,
      items: m.items.map(it => ({ ...it, uses: it.uses + (m.perks.includes("grenadier") && (it.id === "flashbang" || it.id === "smoke") ? 1 : 0) })),
      cls: m.cls, perks: [...m.perks], traits: [...m.traits], minHp: m.hp, gun: { ...m.gun }, witnessed: 0, panics: 0, streak: 0, bestStreak: 0 }));
  });
  const staging = floorTiles([1, 12, 8, 14]);
  setup.dclass.forEach((name, i) => {
    const [x, y] = claim(staging);
    units.push(mk({ id: "d" + (i + 1), side: "dclass", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus }));
  });

  // SCP-173 starts somewhere in the north rooms; the Insurgency comes in from a different room.
  const scpRoom = pick(def.scpRooms);
  const [sx, sy] = claim(floorTiles(scpRoom));
  const ciRoom = pick(def.insurgentRooms.filter(r => r !== scpRoom));
  const ciTiles = floorTiles(ciRoom);
  const arsenal = insurgentGuns(setup.year);
  for (let i = 0; i < setup.insurgents; i++) {
    const [x, y] = claim(ciTiles);
    const g = pick(arsenal);
    units.push(mk({ id: "r" + (i + 1), side: "raider", name: "Insurgent", x, y, hp: 4, maxHp: 4, aim: 60, san: PROFILE.raider.maxSan, armor: setup.insurgentArmor,
      gun: { name: g.name, type: g.type, dmg: g.dmg, mag: g.mag, ammo: g.mag, aim: 0 } }));
  }
  const strayRooms = shuffle(def.strayRooms.filter(r => r !== ciRoom));
  for (let i = 0; i < 4; i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const name = "D-" + (4400 + Math.floor(Math.random() * 600));
    units.push(mk({ id: "t" + (i + 1), side: "subject", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus }));
  }
  const statue = mk({ id: "scp173", side: "anomaly", name: "SCP-173", x: sx, y: sy, hp: 1, maxHp: 1, san: 0, sightBound: true });
  units.push(statue);

  const W = def.rows[0].length, H = def.rows.length;
  const state: MissionState = {
    setup, turn: 1, phase: "player", busy: false, over: false, called: false, mode: null,
    units, statue, sealed: false, selected: null, hover: null, pending: null,
    vis: new Uint8Array(W * H), explored: new Uint8Array(W * H),
    lastSeen: null, raidersActive: false, mem: new Map(), checked: new Set(),
    known: new Set([...STARTING_NOTES, ...setup.known]), fresh: new Set(), log: [], effects: [],
    stats: { mtfLost: 0, dLost: 0, escaped: 0, raidersDown: 0 }, smoke: [], throwing: null, ability: null,
  };
  setMission(state);
  setSmoke([]);
  if (setup.squad.some(m => m.perks.includes("first_look"))) state.explored.fill(1);
  log(`${setup.title}. SCP-173 is loose somewhere in the north rooms.`, "key");
  log(`The transport container is open at the dock in the staging room. Get SCP-173 inside and seal it.${setup.dclass.length ? ` ${setup.dclass.join(" and ")} ${setup.dclass.length > 1 ? "are" : "is"} assigned to you.` : ""}`);
  computeVis();
}

// Downed operatives come home if the mission is won or if they were stabilized; otherwise they die there.
const survives = (u: Unit, win: boolean) => u.alive && (!u.downed || win || !!u.stabilized);

export function missionResult(win: boolean, evacuated: boolean): MissionResult {
  const detail = S.units.filter(u => u.id.startsWith("d") || u.joined);
  return {
    incidentId: S.setup.incidentId,
    win, evacuated,
    turns: S.turn,
    squad: S.units.filter(u => u.opId).map(u => ({ opId: u.opId!, alive: survives(u, win), hp: Math.max(1, u.hp), san: u.san, kills: u.kills, sealed: !!u.sealed,
      hasArmor: !!u.hasArmor, items: (u.items || []).map(i => ({ ...i })),
      witnessed: u.witnessed ?? 0, panics: u.panics ?? 0, minHp: u.minHp ?? u.hp, bestStreak: u.bestStreak ?? 0 })),
    aftercare: S.units.some(u => u.opId && u.alive && !u.downed && u.perks?.includes("aftercare")),
    // incapacitated Insurgents: those restrained are taken; if the mission is won, everyone left down is too
    prisoners: S.units.filter(u => u.side === "raider" && u.alive && u.downed && (u.secured || win)).length,
    known: [...S.known],
    dSent: S.setup.dclass.length,
    dReturned: detail.filter(u => u.alive).length,
    dRecruited: S.units.filter(u => u.joined && u.alive).length,
    dLost: detail.filter(u => !u.alive).length,
    insurgentsDown: S.stats.raidersDown,
    insurgentsTotal: S.setup.insurgents,
  };
}
