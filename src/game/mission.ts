// Building a mission from what Site-19 sends, and turning its outcome into a result.
import { FLOOR, L, Level, floorTiles, tileAt, useLevel, type Pt } from "../core/grid";
import { MAPS } from "../data/maps";
import { setSmoke } from "../core/sight";
import { insurgentGuns } from "../data/weapons";
import { STARTING_NOTES } from "./notes";
import { PROFILE } from "./profiles";
import { S, computeVis, log, setMission } from "./state";
import type { MissionKind, MissionResult, MissionSetup, MissionState, SquadMember, Unit } from "./types";

function mk(o: Partial<Unit> & Pick<Unit, "id" | "side" | "name" | "x" | "y" | "hp" | "maxHp" | "san">): Unit {
  return { aim: 0, alive: true, saved: false, ap: 0, overwatch: false, panicUntil: -1, staring: false, hadLos: false, seen173: false, fled: false, kills: 0, ...o };
}

const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const RESEARCHERS = ["Dr. Halloran", "Dr. Ibsen", "Dr. Achebe", "Dr. Moreau", "Dr. Szilard", "Dr. Whitcombe", "Dr. Okonkwo", "Dr. Lindgren"];
const CIVILIANS = ["Mr. Delaney", "Mrs. Kowalczyk", "Earl Pruitt", "Dot Hennessey", "Rev. Abernathy", "Lou Marchetti", "Frank Osgood", "June Whitley", "Carl Bjornstad", "Hattie Mae Cole", "Walt Simmons", "Ida Ferraro", "Gus Lindgren", "Peggy Sue Hart"];

let nextSlot = 1;
/** Puts one squad member (operative or guard) on the map. */
export function spawnMember(m: SquadMember, x: number, y: number, mods: MissionSetup["mods"]): Unit {
  const i = nextSlot++;
  return mk({ id: "m" + i, opId: m.opId, slot: i, side: "mtf", call: m.call, name: m.name, x, y, guard: m.guard,
    hp: m.hp, maxHp: m.maxHp, san: m.san, maxSan: m.maxSan, aim: m.aim, blinkFull: m.blinkFull,
    armor: m.armor + (m.perks.includes("plated") ? 1 : 0), hasArmor: m.hasArmor, armorKind: m.armorKind, moveBonus: m.moveBonus, blinkMod: mods.blinkBonus,
    items: m.items.map(it => ({ ...it, uses: it.uses + (m.perks.includes("grenadier") && (it.id === "flashbang" || it.id === "smoke" || it.id === "frag") ? 1 : 0) })),
    cls: m.cls, perks: [...m.perks], traits: [...m.traits], minHp: m.hp, gun: { ...m.gun }, witnessed: 0, panics: 0, streak: 0, bestStreak: 0 });
}

/** Free floor tiles within 2 of the squad's entry points, nearest first. */
export function entryTiles(): Pt[] {
  const def = MAPS[S.setup.map], out: Pt[] = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    if (tileAt(x, y) === FLOOR && def.squadSpawns.some(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) <= 2)) out.push([x, y]);
  const d = (p: Pt) => Math.min(...def.squadSpawns.map(([sx, sy]) => Math.max(Math.abs(sx - p[0]), Math.abs(sy - p[1]))));
  return out.sort((a, b) => d(a) - d(b));
}

export function createMission(setup: MissionSetup) {
  nextSlot = 1;
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
  const contain = setup.kind === "breach" || setup.kind === "manhunt";
  const has173 = contain && (setup.scp ?? "173") === "173", has049 = contain && setup.scp === "049", has106 = contain && setup.scp === "106";

  // On a breach, Site Security is first on the scene and Epsilon-11 follows later; elsewhere the squad goes in together.
  const first = setup.kind === "breach" ? setup.guards ?? [] : setup.squad;
  const near: Pt[] = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    if (tileAt(x, y) === FLOOR && def.squadSpawns.some(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) <= 2)) near.push([x, y]);
  first.forEach((m, i) => {
    const [x, y] = i < def.squadSpawns.length ? def.squadSpawns[i] : claim(near);
    taken.add(x + "," + y);
    units.push(spawnMember(m, x, y, setup.mods));
  });
  // the D-Class work detail starts beside the squad
  setup.dclass.forEach((name, i) => {
    const [x, y] = claim(near);
    units.push(mk({ id: "d" + (i + 1), side: "dclass", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus }));
  });

  // SCP-173 (if present) and the Insurgency start in different rooms.
  // a breach starts at the cell itself (the middle north room on wing C); a manhunt could be anywhere
  const scpRoom = !contain ? null : setup.kind === "breach" && def.scpRooms.length > 1 ? def.scpRooms[1] : pick(def.scpRooms);
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
  if (setup.kind === "breach") for (let i = 0; i < Math.min(setup.mods.strays, setup.strayPool ?? 4); i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const name = "D-" + (4400 + Math.floor(Math.random() * 600));
    units.push(mk({ id: "t" + (i + 1), side: "subject", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus, stray: true }));
  }
  // researchers caught in the wing hide where they were working
  const doctors = shuffle([...RESEARCHERS]);
  for (let i = 0; i < (setup.researchers ?? 0); i++) {
    const [x, y] = claim(floorTiles(strayRooms[(i + 1) % strayRooms.length]));
    units.push(mk({ id: "rs" + (i + 1), side: "civilian", call: doctors[i], name: doctors[i], x, y, hp: 4, maxHp: 4, san: 60, researcher: true }));
  }
  const names = shuffle([...CIVILIANS]);
  const people = setup.civilians + setup.witnesses;
  for (let i = 0; i < people && strayRooms.length; i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const witness = i < setup.witnesses;
    units.push(mk({ id: "c" + (i + 1), side: "civilian", call: names[i % names.length], name: names[i % names.length], x, y, hp: 4, maxHp: 4, san: 50, witness,
      spooked: setup.kind === "manhunt" }));
  }
  const statue = has049
    ? mk({ id: "scp049", side: "anomaly", name: "SCP-049", x: sx, y: sy, hp: 1, maxHp: 1, san: 0 })
    : has106 ? mk({ id: "scp106", side: "anomaly", name: "SCP-106", x: sx, y: sy, hp: 1, maxHp: 1, san: 0 })
    : mk({ id: "scp173", side: "anomaly", name: "SCP-173", x: sx, y: sy, hp: 1, maxHp: 1, san: 0, sightBound: true, alive: has173 });
  units.push(statue);

  const W = def.rows[0].length, H = def.rows.length;
  const state: MissionState = {
    setup, has173, has049, calmUntil: 0, has106, sunkUntil: 0, submerged: false, feedTurn: -1, corroded: new Set(), amnestics: setup.amnestics, turn: 1, phase: "player", busy: false, over: false, called: false, mode: null,
    units, statue, sealed: false, selected: null, hover: null, pending: null,
    vis: new Uint8Array(W * H), explored: new Uint8Array(W * H),
    lastSeen: null, raidersActive: setup.kind === "strike", mem: new Map(), checked: new Set(),
    known: new Set([...STARTING_NOTES, ...setup.known]), fresh: new Set(), log: [], effects: [],
    stats: { mtfLost: 0, dLost: 0, escaped: 0, raidersDown: 0 }, smoke: [], throwing: null, ability: null,
    reinforce: setup.kind === "breach" ? [
      ...(setup.lateGuards?.length ? [{ turn: 2, members: setup.lateGuards }] : []),
      ...(setup.squad.length ? [{ turn: setup.mtfTurn ?? 30, members: setup.squad }] : []),
    ] : [],
    escapeDrive: 0, lockedUntil: 0, escaped: false, photos: [],
  };
  setMission(state);
  setSmoke([]);
  if (setup.squad.some(m => m.perks.includes("first_look"))) state.explored.fill(1);
  log(`${setup.title}.`, "key");
  log(BRIEFINGS[setup.kind](setup));
  computeVis();
}

export const BRIEFINGS: Record<MissionKind, (s: MissionSetup) => string> = {
  breach: s => s.scp === "106" ? `SCP-106 is out of its cell. It walks through walls, and anyone it reaches is dragged into its pocket dimension. Shooting it only sends it under the floor for a turn. The only way to recontain it is bait: put a D-Class (or a secured Insurgent) in the transport container in the staging room. It will go straight for them and stay a turn to feed. Seal it in during that turn.${s.squad.length ? ` Epsilon-11 arrives on turn ${s.mtfTurn}.` : ""}` : s.scp === "049" ? `SCP-049 is out of its cell in the north rooms and looking for patients. Its touch kills, and it will raise anyone who dies as SCP-049-2. Gunfire only staggers it. Talk it down (Calm, within ${3} tiles) and lead it into the transport container in the staging room, then seal it.${s.squad.length ? ` Epsilon-11 arrives on turn ${s.mtfTurn}.` : ""}` : `SCP-173 is out of its cell in the north rooms. Site Security is first on the scene${s.lateGuards?.length ? `, with ${s.lateGuards.length} more guard${s.lateGuards.length > 1 ? "s" : ""} arriving next turn` : ""}. ${s.squad.length ? `Epsilon-11 arrives on turn ${s.mtfTurn}.` : "Epsilon-11 isn't coming: nobody is available."} The transport container is open at the dock in the staging room: get it inside and seal it. If it reaches the surface hatch in the east lab, it's gone; the panel at the east end of the corridor locks the hatch down.${s.dclass.length ? ` ${s.dclass.join(" and ")} ${s.dclass.length > 1 ? "are" : "is"} assigned to you.` : ""}`,
  manhunt: s => s.scp === "106" ? "An old man who walks through walls is loose among the locals, and people are disappearing into the floor. That is SCP-106. Shooting only drives it under for a turn. Put a D-Class in the truck's container as bait; it goes straight for them and stays a turn to feed. Seal it in then." : s.scp === "049" ? "A man in a plague doctor's mask is walking among the locals, and some of them have stopped breathing. That is SCP-049. Its touch kills, and the dead get back up. Talk it down (Calm) and lead it into the truck's open container, then seal it. Keep people from dying near it." : "SCP-173 is somewhere nearby, and the locals are out. Every civilian it kills makes the cover story harder. A truck with an open container is waiting: get it inside and seal it.",
  coverup: s => `${s.witnesses} witness${s.witnesses === 1 ? "" : "es"} saw something they shouldn't have. Reach each one and give them amnestics (Dose, 1 action, adjacent) before they get away. Anyone who spots the team will run for the edge of the map. Dose at least half for the job to count.`,
  strike: () => "An Insurgency cell is holed up here. Neutralise every Insurgent. Wounded ones can be secured as prisoners.",
};

// Downed operatives come home if the mission is won or if they were stabilized; otherwise they die there.
// When the team pulls out, only those who made it out through an exit come home.
const survives = (u: Unit, win: boolean, evacuated: boolean) => u.alive && (win || (evacuated ? u.saved : !u.downed || !!u.stabilized));

export function missionResult(win: boolean, evacuated: boolean): MissionResult {
  let pocketReturned = 0;
  for (const u of S.units) if (u.taken && !u.alive && u.saved === false && u.side !== "raider") {
    if (Math.random() < S.setup.mods.pocketReturn) {
      pocketReturned++;
      u.alive = true; u.taken = false; u.downed = false; u.hp = Math.max(1, u.hp); u.san = Math.max(0, u.san - 40);
      u.witnessed = (u.witnessed ?? 0) + 2;   // what they saw down there counts double for nightmares
      log(`${u.side === "mtf" ? `${u.call} ${u.name}` : u.name} crawls out of a black stain on the floor, alive and barely speaking.`, "key");
    }
  }
  const detail = S.units.filter(u => (u.id.startsWith("d") || u.joined) && !u.stray);
  const strays = S.units.filter(u => u.stray), docs = S.units.filter(u => u.researcher);
  return {
    incidentId: S.setup.incidentId,
    win, evacuated,
    turns: S.turn,
    escaped: S.escaped,
    photos: [...S.photos],
    restraints: S.units.some(u => u.side === "mtf" && u.items?.some(i => i.id === "restraints")),
    zombiesKilled: S.units.filter(u => u.side === "zombie" && !u.alive).length,
    pocketReturned,
    squad: [...S.units.filter(u => u.opId).map(u => ({ opId: u.opId!, alive: survives(u, win, evacuated), hp: Math.max(1, u.hp), san: u.san, kills: u.kills, sealed: !!u.sealed,
      hasArmor: !!u.hasArmor, armorKind: u.armorKind, armorHp: S.setup.squad.concat(S.setup.guards ?? [], S.setup.lateGuards ?? []).find(m => m.opId === u.opId)?.armorHp ?? 0, items: (u.items || []).map(i => ({ ...i })),
      witnessed: u.witnessed ?? 0, panics: u.panics ?? 0, minHp: u.minHp ?? u.hp, bestStreak: u.bestStreak ?? 0 })),
      // anyone still on the way when it ended comes home untouched, with their gear
      ...S.reinforce.flatMap(r => r.members).map(m => ({ opId: m.opId, alive: true, hp: m.hp, san: m.san, kills: 0, sealed: false, hasArmor: m.hasArmor, armorKind: m.armorKind, armorHp: m.armorHp,
        items: m.items.map(i => ({ ...i })), witnessed: 0, panics: 0, minHp: m.hp, bestStreak: 0, absent: true }))],
    aftercare: S.units.some(u => u.opId && u.alive && !u.downed && u.perks?.includes("aftercare")),
    // incapacitated Insurgents: those restrained are taken; if the mission is won, everyone left down is too
    prisoners: S.units.filter(u => u.side === "raider" && u.alive && u.downed && (u.secured || win)).length,
    known: [...S.known],
    dSent: S.setup.dclass.length,
    dReturned: detail.filter(u => u.alive).length,
    dRecruited: S.units.filter(u => u.joined && u.alive).length,
    dLost: detail.filter(u => !u.alive).length,
    researchersRescued: docs.filter(u => u.alive && (u.saved || win)).length,
    researchersLost: docs.filter(u => !u.alive || (!u.saved && !win)).length,
    straysLost: strays.filter(u => !u.alive || (!win && !u.restrained && !u.saved)).length,
    straysEscaped: strays.filter(u => u.alive && u.saved && !u.restrained).length,
    civiliansKilled: S.units.filter(u => u.side === "civilian" && !u.alive).length,
    witnessesEscaped: S.units.filter(u => u.witness && u.saved && !u.dosed).length,
    witnessesDosed: S.units.filter(u => u.witness && u.dosed).length,
    amnesticsUsed: S.setup.amnestics - S.amnestics,
    insurgentsDown: S.stats.raidersDown,
    insurgentsTotal: S.setup.insurgents,
  };
}
