// Building a mission from what Site-19 sends, and turning its outcome into a result.
import { FLOOR, L, Level, floorTiles, tileAt, useLevel, type Pt } from "../core/grid";
import { MAPS } from "../data/maps";
import { setSmoke } from "../core/sight";
import { insurgentGuns } from "../data/weapons";
import { STARTING_NOTES } from "./notes";
import { PROFILE } from "./profiles";
import { S, computeVis, log, setMission } from "./state";
import type { MissionKind, MissionResult, MissionSetup, MissionState, Unit } from "./types";

function mk(o: Partial<Unit> & Pick<Unit, "id" | "side" | "name" | "x" | "y" | "hp" | "maxHp" | "san">): Unit {
  return { aim: 0, alive: true, saved: false, ap: 0, overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0, ...o };
}

const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const CIVILIANS = ["Mr. Delaney", "Mrs. Kowalczyk", "Earl Pruitt", "Dot Hennessey", "Rev. Abernathy", "Lou Marchetti", "Frank Osgood", "June Whitley", "Carl Bjornstad", "Hattie Mae Cole", "Walt Simmons", "Ida Ferraro", "Gus Lindgren", "Peggy Sue Hart"];

export function createMission(setup: MissionSetup) {
  const def = MAPS[setup.map];
  useLevel(new Level(def));
  const taken = new Set<string>();
  const claim = (tiles: Pt[]) => {
    const free = tiles.filter(([x, y]) => !taken.has(x + "," + y));
    const t = pick(free.length ? free : tiles);
    taken.add(t[0] + "," + t[1]);
    return t;
  };
  const units: Unit[] = [];
  const has173 = setup.kind === "breach" || setup.kind === "manhunt";

  setup.squad.forEach((m, i) => {
    const [x, y] = def.squadSpawns[i];
    taken.add(x + "," + y);
    units.push(mk({ id: "m" + (i + 1), opId: m.opId, slot: i + 1, side: "mtf", call: m.call, name: m.name, x, y,
      hp: m.hp, maxHp: m.maxHp, san: m.san, maxSan: m.maxSan, aim: m.aim, blinkFull: m.blinkFull,
      armor: m.armor + (m.perks.includes("plated") ? 1 : 0), hasArmor: m.hasArmor, blinkMod: setup.mods.blinkBonus,
      items: m.items.map(it => ({ ...it, uses: it.uses + (m.perks.includes("grenadier") && (it.id === "flashbang" || it.id === "smoke" || it.id === "frag") ? 1 : 0) })),
      cls: m.cls, perks: [...m.perks], traits: [...m.traits], minHp: m.hp, gun: { ...m.gun }, witnessed: 0, panics: 0, streak: 0, bestStreak: 0 }));
  });
  // the D-Class work detail starts beside the squad
  const near: Pt[] = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    if (tileAt(x, y) === FLOOR && def.squadSpawns.some(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) <= 2)) near.push([x, y]);
  setup.dclass.forEach((name, i) => {
    const [x, y] = claim(near);
    units.push(mk({ id: "d" + (i + 1), side: "dclass", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus }));
  });

  // SCP-173 (if present) and the Insurgency start in different rooms.
  const scpRoom = has173 ? pick(def.scpRooms) : null;
  const [sx, sy] = scpRoom ? claim(floorTiles(scpRoom)) : [0, 0];
  const ciRooms = def.insurgentRooms.filter(r => r !== scpRoom);
  const ciRoom = pick(ciRooms);
  const arsenal = insurgentGuns(setup.year);
  for (let i = 0; i < setup.insurgents; i++) {
    // on a strike the cell is spread through the building; elsewhere a team arrives together
    const [x, y] = claim(floorTiles(setup.kind === "strike" ? ciRooms[i % ciRooms.length] : ciRoom));
    const g = pick(arsenal);
    units.push(mk({ id: "r" + (i + 1), side: "raider", name: "Insurgent", x, y, hp: 4, maxHp: 4, aim: 60, san: PROFILE.raider.maxSan, armor: setup.insurgentArmor,
      gun: { name: g.name, type: g.type, dmg: g.dmg, mag: g.mag, ammo: g.mag, aim: 0 } }));
  }
  const strayRooms = shuffle(def.strayRooms.filter(r => r !== ciRoom));
  if (setup.kind === "breach") for (let i = 0; i < 4; i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const name = "D-" + (4400 + Math.floor(Math.random() * 600));
    units.push(mk({ id: "t" + (i + 1), side: "subject", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus }));
  }
  const names = shuffle([...CIVILIANS]);
  const people = setup.civilians + setup.witnesses;
  for (let i = 0; i < people && strayRooms.length; i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const witness = i < setup.witnesses;
    units.push(mk({ id: "c" + (i + 1), side: "civilian", call: names[i % names.length], name: names[i % names.length], x, y, hp: 4, maxHp: 4, san: 50, witness,
      spooked: setup.kind === "manhunt" }));
  }
  const statue = mk({ id: "scp173", side: "anomaly", name: "SCP-173", x: sx, y: sy, hp: 1, maxHp: 1, san: 0, sightBound: true, alive: has173 });
  units.push(statue);

  const W = def.rows[0].length, H = def.rows.length;
  const state: MissionState = {
    setup, has173, amnestics: setup.amnestics, turn: 1, phase: "player", busy: false, over: false, called: false, mode: null,
    units, statue, sealed: false, selected: null, hover: null, pending: null,
    vis: new Uint8Array(W * H), explored: new Uint8Array(W * H),
    lastSeen: null, raidersActive: setup.kind === "strike", mem: new Map(), checked: new Set(),
    known: new Set([...STARTING_NOTES, ...setup.known]), fresh: new Set(), log: [], effects: [],
    stats: { mtfLost: 0, dLost: 0, escaped: 0, raidersDown: 0 }, smoke: [], throwing: null, ability: null,
  };
  setMission(state);
  setSmoke([]);
  if (setup.squad.some(m => m.perks.includes("first_look"))) state.explored.fill(1);
  log(`${setup.title}.`, "key");
  log(BRIEFINGS[setup.kind](setup));
  computeVis();
}

export const BRIEFINGS: Record<MissionKind, (s: MissionSetup) => string> = {
  breach: s => `SCP-173 is loose somewhere in the north rooms. The transport container is open at the dock in the staging room: get it inside and seal it.${s.dclass.length ? ` ${s.dclass.join(" and ")} ${s.dclass.length > 1 ? "are" : "is"} assigned to you.` : ""}`,
  manhunt: () => "SCP-173 is somewhere nearby, and the locals are out. Every civilian it kills makes the cover story harder. A truck with an open container is waiting: get it inside and seal it.",
  coverup: s => `${s.witnesses} witness${s.witnesses === 1 ? "" : "es"} saw something they shouldn't have. Reach each one and give them amnestics (Dose, 1 action, adjacent) before they get away. Anyone who spots the team will run for the edge of the map. Dose at least half for the job to count.`,
  strike: () => "An Insurgency cell is holed up here. Neutralise every Insurgent. Wounded ones can be secured as prisoners.",
};

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
    civiliansKilled: S.units.filter(u => u.side === "civilian" && !u.alive).length,
    witnessesEscaped: S.units.filter(u => u.witness && u.saved && !u.dosed).length,
    witnessesDosed: S.units.filter(u => u.witness && u.dosed).length,
    amnesticsUsed: S.setup.amnestics - S.amnestics,
    insurgentsDown: S.stats.raidersDown,
    insurgentsTotal: S.setup.insurgents,
  };
}
