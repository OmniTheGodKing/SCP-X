// Building a mission from what Site-19 sends, and turning its outcome into a result.
import { assignRoles } from "./ciTactics";
import { FLOOR, L, Level, bfs, cheb, floorTiles, nearContainer, tileAt, useLevel, type Pt } from "../core/grid";
import { MAPS } from "../data/maps";
import { varyMap } from "../data/plots";
import { generateTown } from "../data/towngen";

import { setSmoke, sightFrom } from "../core/sight";
import { insurgentGuns } from "../data/weapons";
import { STARTING_NOTES } from "./notes";
import { PROFILE } from "./profiles";
import { S, computeVis, log, setMission } from "./state";
import { isNewScp } from "./scp4b";
import { WEATHER } from "../data/weather";
import { RAID_TURNS, type ItemId, type OptionalId, type MissionKind, type MissionResult, type MissionSetup, type MissionState, type SquadMember, type Unit } from "./types";

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
  return mk({ id: "m" + i, opId: m.opId, slot: i, side: "mtf", call: m.call, name: m.name, rankShort: m.rankShort, x, y, guard: m.guard,
    hp: m.hp, maxHp: m.maxHp, san: m.san, maxSan: m.maxSan, aim: m.aim, blinkFull: m.blinkFull,
    armor: m.armor + (m.perks.includes("plated") ? 1 : 0), hasArmor: m.hasArmor, armorKind: m.armorKind, moveBonus: m.moveBonus, blinkMod: mods.blinkBonus,
    items: m.items.map(it => ({ ...it, uses: it.uses + (m.perks.includes("grenadier") && (it.id === "flashbang" || it.id === "smoke" || it.id === "frag") ? 1 : 0) })),
    cls: m.cls, perks: [...m.perks], traits: [...m.traits], medals: m.medals, minHp: m.hp, gun: { ...m.gun }, witnessed: 0, panics: 0, streak: 0, bestStreak: 0,
    goggles: m.goggles, specialist: m.specialist, bonds: m.bonds });
}

/** Free floor tiles within 2 of the squad's entry points, nearest first. */
export function entryTiles(via?: "road" | "station"): Pt[] {
  const def = L.def, out: Pt[] = [], spawns = via === "road" && def.roadSpawns ? def.roadSpawns : via === "station" && def.stationSpawns ? def.stationSpawns : def.squadSpawns;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    if (tileAt(x, y) === FLOOR && spawns.some(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) <= 2)) out.push([x, y]);
  const d = (p: Pt) => Math.min(...spawns.map(([sx, sy]) => Math.max(Math.abs(sx - p[0]), Math.abs(sy - p[1]))));
  return out.sort((a, b) => d(a) - d(b));
}

export function createMission(setup: MissionSetup) {
  nextSlot = 1;
  // a fresh layout every time: rooms refurnished, field maps mirrored half the time
  // Phase 4C: half the town missions are played in a town built from pieces (if one passes its checks)
  const built = setup.map === "town" && (setup.convoy || Math.random() < 0.5) ? generateTown(!setup.convoy && (setup.kind === "manhunt" || setup.kind === "escort")) : null;
  const def = built ?? varyMap(MAPS[setup.map], setup.map !== "wingC");
  useLevel(new Level(def));
  const taken = new Set<string>();
  const claim = (tiles: Pt[]) => {
    const free = tiles.filter(([x, y]) => !taken.has(x + "," + y));
    const t = pick(free.length ? free : tiles);
    taken.add(t[0] + "," + t[1]);
    return t;
  };
  const units: Unit[] = [];
  const contain = setup.kind === "breach" || setup.kind === "manhunt" || (setup.kind === "emergency" && setup.hazard === "scp");
  const has173 = contain && (setup.scp ?? "173") === "173", has049 = contain && setup.scp === "049", has106 = contain && setup.scp === "106";
  const scp = contain ? setup.scp ?? "173" : undefined, fresh = contain && isNewScp(setup.scp);
  // Phase 4B: the capture kit for the new anomalies goes to the first operative of the squad
  const kit = fresh ? ({ "096": ["hood", 1], "012": ["folder", 1], "939": ["noisemaker", (setup.mods.r4b ?? []).includes("acoustic_lures") ? 3 : 2], "035": ["case", 1] } as Record<string, [ItemId, number]>)[setup.scp!] : undefined;
  if (kit && setup.squad[0] && !setup.squad[0].items.some(i => i.id === kit[0])) setup.squad[0] = { ...setup.squad[0], items: [...setup.squad[0].items, { id: kit[0], uses: kit[1] }] };

  // On a breach, Site Security is first on the scene and Epsilon-11 follows later; elsewhere the squad goes in together.
  // at another site's emergency, its own surviving security fights alongside the squad from the start
  const first = setup.kind === "breach" || setup.kind === "riot" || setup.kind === "raid" ? setup.guards ?? [] : setup.kind === "emergency" ? [...setup.squad, ...(setup.guards ?? [])] : setup.squad;
  const near: Pt[] = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++)
    if (tileAt(x, y) === FLOOR && def.squadSpawns.some(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) <= 2)) near.push([x, y]);
  // an escort is ambushed at the truck: the squad starts around the container
  const truck: Pt[] = [];
  // Phase 4C: a convoy's truck starts at the west end of the street, the squad around it
  let lorry: Unit | null = null;
  if (setup.convoy) {
    const street = (x: number, y: number) => tileAt(x, y) === FLOOR && /street/i.test(def.area(x, y));
    const start = [3, 4, 5, 2].flatMap(x => [8, 9, 7].map(y => [x, y] as Pt)).find(([x, y]) => street(x, y)) ?? def.squadSpawns[0];
    lorry = mk({ id: "truck", side: "civilian", name: "The transfer truck", x: start[0], y: start[1], hp: 99, maxHp: 99, san: 0, record: true, vehicle: true });
    taken.add(start[0] + "," + start[1]);
    for (let y = start[1] - 2; y <= start[1] + 2; y++) for (let x = start[0] - 2; x <= start[0] + 2; x++) if (tileAt(x, y) === FLOOR && (x !== start[0] || y !== start[1])) truck.push([x, y]);
  } else if (setup.kind === "escort") for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (tileAt(x, y) === FLOOR && nearContainer(x, y)) truck.push([x, y]);
  first.forEach((m, i) => {
    const [x, y] = setup.kind === "escort" && truck.length ? claim(truck) : i < def.squadSpawns.length ? def.squadSpawns[i] : claim(near);
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
  // the enemy starts well away from where the team comes in, out of its sight: the farther rooms first, and never one the
  // team can see into from its starting tiles (playtest change after 4G)
  setSmoke([]);
  const ciRooms = farRooms(def.insurgentRooms.filter(r => r !== scpRoom), setup.kind === "escort" && truck.length ? truck : def.squadSpawns);
  const ciRoom = pick(ciRooms);
  const arsenal = insurgentGuns(setup.year);
  for (let i = 0; i < setup.insurgents; i++) {
    // on a strike the cell is spread through the building; elsewhere a team arrives together
    const spread = setup.kind === "strike" || setup.kind === "escort" || setup.kind === "retaliation" || setup.kind === "raid" || setup.kind === "rescue";
    const room = spread ? Math.floor(i / 2) % ciRooms.length : 0;   // fire teams of two
    const [x, y] = claim(floorTiles(spread ? ciRooms[room] : ciRoom));
    const g = pick(arsenal);
    units.push(mk({ id: "r" + (i + 1), side: "raider", name: "Insurgent", x, y, pod: room, hp: 4, maxHp: 4, aim: 60, san: PROFILE.raider.maxSan, armor: setup.insurgentArmor,
      gun: { name: g.name, type: g.type, dmg: g.dmg, mag: g.mag, ammo: g.mag, aim: 0 } }));
  }
  const strayRooms = shuffle(def.strayRooms.filter(r => r !== ciRoom));
  if (setup.kind === "breach") for (let i = 0; i < Math.min(setup.mods.strays, setup.strayPool ?? 4); i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const name = "D-" + (4400 + Math.floor(Math.random() * 600));
    units.push(mk({ id: "t" + (i + 1), side: "subject", call: name, name, x, y, hp: 5, maxHp: 5, san: PROFILE.dclass.maxSan, blinkMod: setup.mods.blinkBonus, stray: true }));
  }
  // researchers caught in the wing hide where they were working; a lost team's survivors hide the same way
  const doctors = shuffle([...RESEARCHERS]);
  const hiding = (setup.researchers ?? 0) + (setup.survivors ?? 0);
  for (let i = 0; i < hiding; i++) {
    const [x, y] = claim(floorTiles(strayRooms[(i + 1) % strayRooms.length]));
    const name = i < (setup.researchers ?? 0) ? doctors[i % doctors.length] : `${setup.survivorName ?? "Lost operative"} ${i + 1 - (setup.researchers ?? 0)}`;
    units.push(mk({ id: "rs" + (i + 1), side: "civilian", call: name, name, x, y, hp: 4, maxHp: 4, san: 60, researcher: true }));
  }
  // classified records at risk, and what got loose at another site
  for (let i = 0; i < (setup.records ?? 0); i++) {
    const [x, y] = claim(floorTiles(strayRooms[(i + 2) % strayRooms.length]));
    units.push(mk({ id: "rec" + (i + 1), side: "civilian", name: "Classified records", x, y, hp: 1, maxHp: 1, san: 0, record: true }));
  }
  // a cell keeps its ledger and its radio: optional objectives on a strike
  if (setup.kind === "strike" && ciRooms.length) {
    const [lx, ly] = claim(floorTiles(ciRooms[ciRooms.length - 1]));
    units.push(mk({ id: "ledger", side: "civilian", name: "The cell's ledger", x: lx, y: ly, hp: 1, maxHp: 1, san: 0, record: true }));
    const [rx, ry] = claim(floorTiles(ciRooms[0]));
    units.push(mk({ id: "radio", side: "civilian", name: "Insurgent radio set", x: rx, y: ry, hp: 1, maxHp: 1, san: 0, record: true, radio: true }));
  }
  if (setup.hazard === "instances") for (let i = 0; i < 4; i++) {
    const [x, y] = claim(floorTiles(pick(def.scpRooms)));
    units.push(mk({ id: "zi" + (i + 1), side: "zombie", name: "Escaped instance", x, y, hp: 5, maxHp: 5, san: 0 }));
  }
  const names = shuffle([...CIVILIANS]);
  const people = setup.civilians + setup.witnesses;
  for (let i = 0; i < people && strayRooms.length; i++) {
    const [x, y] = claim(floorTiles(strayRooms[i % strayRooms.length]));
    const witness = i < setup.witnesses;
    units.push(mk({ id: "c" + (i + 1), side: "civilian", call: names[i % names.length], name: names[i % names.length], x, y, hp: 4, maxHp: 4, san: 50, witness,
      spooked: setup.kind === "manhunt" || setup.kind === "retaliation" }));
  }
  assignRoles(units, setup);
  const statue = fresh ? newAnomaly(setup.scp!, sx, sy, scpRoom!, claim, setup.kind, units)
    : has049
    ? mk({ id: "scp049", side: "anomaly", name: "SCP-049", x: sx, y: sy, hp: 1, maxHp: 1, san: 0 })
    : has106 ? mk({ id: "scp106", side: "anomaly", name: "SCP-106", x: sx, y: sy, hp: 1, maxHp: 1, san: 0 })
    : mk({ id: "scp173", side: "anomaly", name: "SCP-173", x: sx, y: sy, hp: 1, maxHp: 1, san: 0, sightBound: true, alive: has173 });
  units.push(statue);
  if (lorry) units.push(lorry);

  const W = def.rows[0].length, H = def.rows.length;
  const state: MissionState = {
    setup, scp, has173, has049, calmUntil: 0, has106, sunkUntil: 0, submerged: false, feedTurn: -1, corroded: new Set(), amnestics: setup.amnestics, turn: 1, phase: "player", busy: false, over: false, called: false, mode: null,
    units, statue, sealed: false, selected: null, hover: null, pending: null,
    vis: new Uint8Array(W * H), explored: new Uint8Array(W * H),
    lastSeen: null, raidersActive: false, mem: new Map(), checked: new Set(),
    concealed: setup.kind === "strike" || setup.kind === "coverup",
    // ambushes and attacks on towns start with every Insurgent already moving
    // so are the GOC and GRU-P, who are there for the anomaly
    activePods: setup.kind === "escort" || setup.kind === "retaliation" || setup.kind === "raid" || setup.goc || setup.gru ? [0, 1, 2, 3, 4, 5] : [],
    known: new Set([...STARTING_NOTES, ...setup.known]), fresh: new Set(), log: [], effects: [],
    stats: { mtfLost: 0, dLost: 0, escaped: 0, raidersDown: 0 }, smoke: [], flares: [], throwing: null, ability: null,
    reinforce: setup.kind === "breach" || setup.kind === "raid" ? [
      ...(setup.lateGuards?.length ? [{ turn: 2, members: setup.lateGuards }] : []),
      ...(setup.kind === "raid" && setup.liftCount !== undefined
        ? [...(setup.liftCount > 0 ? [{ turn: setup.mtfTurn ?? 3, members: setup.squad.slice(0, setup.liftCount), station: !!def.stationSpawns }] : []),
           ...(setup.squad.length > setup.liftCount ? [{ turn: setup.roadTurn ?? 30, members: setup.squad.slice(setup.liftCount), road: true }] : [])]
        : setup.squad.length ? [{ turn: setup.mtfTurn ?? 30, members: setup.squad }] : []),
      ...(setup.nu7?.length ? [{ turn: Math.max(3, (setup.mtfTurn ?? 3) + 1), members: setup.nu7 }] : []),
    ] : [],
    escapeDrive: 0, lockedUntil: 0, escaped: false, photos: [],
    optional: optionalFor(setup), siren: setup.kind === "breach", lockedDoors: [], fires: new Map(), flesh: new Set(), core: null,
  };
  if (fresh && setup.scp === "035") state.maskHost = "host";
  setMission(state);
  // perimeter alarms: Site Security is already in position and watching when the raid starts
  if (setup.kind === "raid" && setup.mods.alarms) for (const u of state.units) if (u.guard) u.overwatch = true;
  if (setup.kind === "outbreak") seedOutbreak(setup, strayRooms);
  if (setup.kind === "riot") {
    for (let i = 0; i < (setup.rioters ?? 0); i++) {
      const room = def.insurgentRooms[i % def.insurgentRooms.length];
      const free = floorTiles(room).filter(([x, y]) => !S.units.some(u => u.alive && u.x === x && u.y === y));
      if (!free.length) continue;
      const [x, y] = free[Math.floor(Math.random() * free.length)];
      const name = "D-" + (4000 + Math.floor(Math.random() * 1000));
      S.units.push(mk({ id: "q" + i, side: "zombie", call: name, name, x, y, hp: 5, maxHp: 5, san: 50, rioter: true }));
    }
  }
  setSmoke([]);
  if (setup.squad.some(m => m.perks.includes("first_look"))) state.explored.fill(1);
  log(`${setup.title}.`, "key");
  log(BRIEFINGS[setup.kind](setup));
  if (setup.gru) log("These aren't Insurgents: GRU Division \"P\", the Soviet anomalous unit, wants it too. Two of them beside it for a turn will carry it off.", "bad");
  if (setup.goc) log("A Global Occult Coalition strike team is here. They don't want it contained, they want it destroyed: two of them beside it for a whole turn and it's gone for good.", "bad");
  if (setup.commander) log(`Intercepted radio: ${setup.commander} is leading them in person. They'll run when badly hurt.`, "bad");
  if (setup.weather && setup.weather !== "clear") log(`Weather: ${WEATHER[setup.weather].name.toLowerCase()}. ${WEATHER[setup.weather].desc.replace(" Flights there take a day longer.", "")}`, "key");
  computeVis();
}

/** Phase 4B: the first word on each new anomaly, in the incident log. */
const NEW_BRIEF: Record<string, string> = {
  "096": "SCP-096 is sitting somewhere ahead, weeping. Whatever happens, nobody looks at its face. Eyes down (V) to get close; the canvas hood goes over its head, then lead it into the container.",
  "012": "SCP-012, the score, is on a stand ahead. Anyone who reads it may walk to it and start writing in their own blood. Go in with your eyes down (V) and close the folder over it.",
  "939": "Three SCP-939 are out there in the dark. They're blind and hunt by sound, and they talk with voices they've heard. Move only when you must; a noisemaker in the container brings them to it.",
  "035": "SCP-035 is wearing someone. Put the host down, then get the mask into the lead-lined case before it finds another face.",
  "682": "SCP-682. Nothing you carry will kill it, and it learns from whatever hurts it. Mix your weapons, put it down, and drag it into the container before it stands back up.",
};

/** Phase 4B: the anomaly unit for a new SCP, and anything that comes with it (SCP-939's pack, SCP-035's host). */
function newAnomaly(id: string, x: number, y: number, room: [number, number, number, number], claim: (t: Pt[]) => Pt, kind: MissionKind, units: Unit[]): Unit {
  switch (id) {
    case "096": return mk({ id: "scp096", side: "anomaly", name: "SCP-096", x, y, hp: 1, maxHp: 1, san: 0, facing: Math.floor(Math.random() * 8) });
    case "012": return mk({ id: "scp012", side: "anomaly", name: "SCP-012", x, y, hp: 1, maxHp: 1, san: 0 });
    case "682": return mk({ id: "scp682", side: "anomaly", name: "SCP-682", x, y, hp: 30, maxHp: 30, san: 0, armor: 2 });
    case "939": {
      units.push(mk({ id: "v1", side: "zombie", name: "SCP-939", x, y, hp: 7, maxHp: 7, san: 0, armor: 1, voice: true }));
      for (let i = 2; i <= 3; i++) { const [vx, vy] = claim(floorTiles(room)); units.push(mk({ id: "v" + i, side: "zombie", name: "SCP-939", x: vx, y: vy, hp: 7, maxHp: 7, san: 0, armor: 1, voice: true })); }
      // the pack has no single body to point at: the anomaly unit stands for the species and is never on the map
      return mk({ id: "scp939", side: "anomaly", name: "SCP-939", x, y, hp: 1, maxHp: 1, san: 0, alive: false });
    }
    default: {
      // SCP-035 arrives on a host: a researcher caught in the wing on a breach, a local in the field
      const name = kind === "breach" ? pick(RESEARCHERS) : pick(CIVILIANS);
      units.push(mk({ id: "host", side: "zombie", name, x, y, hp: 10, maxHp: 10, san: 0, host: true, wasSide: "civilian" }));
      return mk({ id: "scp035", side: "anomaly", name: "SCP-035", x, y, hp: 1, maxHp: 1, san: 0 });
    }
  }
}

/** Rooms ordered farthest first from where the team starts (by walking distance), leaving out any room within 10 steps
 *  or 8 tiles in a straight line of it, or that it can see into from there; if none qualify, the farthest one alone. */
function farRooms(rooms: [number, number, number, number][], from: Pt[]) {
  if (!rooms.length) return rooms;
  const dist = bfs(from.map(p => [p[0], p[1]] as Pt), 999, () => false).dist;
  const near = (r: [number, number, number, number]) => Math.min(...floorTiles(r).map(([x, y]) => { const d = dist[y * L.W + x]; return d < 0 ? 999 : d; }));
  const seenFrom = (r: [number, number, number, number]) => floorTiles(r).some(([x, y]) => from.some(([sx, sy]) => sightFrom(sx, sy, x, y)));
  const straight = (r: [number, number, number, number]) => Math.min(...floorTiles(r).map(([x, y]) => Math.min(...from.map(([sx, sy]) => cheb(x, y, sx, sy)))));
  const ranked = rooms.map(r => ({ r, d: near(r), c: straight(r), s: seenFrom(r) })).sort((a, b) => b.d - a.d);
  const ok = ranked.filter(x => x.d >= 10 && x.c >= 8 && !x.s);
  return (ok.length ? ok : ranked.slice(0, 1)).map(x => x.r);
}

/** SCP-610: a core of flesh in one of the rooms, flesh spread around it, and its instances on the flesh. */
function seedOutbreak(setup: MissionSetup, rooms: [number, number, number, number][]) {
  const spawn = L.def.squadSpawns[0];
  const room = [...rooms].sort((a, b) => cheb(b[0], b[1], spawn[0], spawn[1]) - cheb(a[0], a[1], spawn[0], spawn[1]))[0];
  const tiles = floorTiles(room).filter(([x, y]) => !S.units.some(u => u.alive && u.x === x && u.y === y));
  const [cx, cy] = tiles[Math.floor(tiles.length / 2)];
  const sev = setup.severity ?? 2;
  S.core = { x: cx, y: cy, hp: 12, maxHp: 12 };
  const reach = bfs([[cx, cy]], 1 + sev, () => false);
  for (let i = 0; i < reach.dist.length; i++) if (reach.dist[i] >= 0) S.flesh.add(i);
  const on = [...S.flesh].filter(i => i !== cy * L.W + cx && !S.units.some(u => u.alive && u.y * L.W + u.x === i));
  for (let k = 0; k < sev + 1 && on.length; k++) {
    const i = on.splice(Math.floor(Math.random() * on.length), 1)[0];
    S.units.push(mk({ id: "f" + k, side: "zombie", name: "SCP-610 instance", x: i % L.W, y: (i / L.W) | 0, hp: 6, maxHp: 6, san: 0, flesh: true }));
  }
}

/** Optional objectives: not needed to win, each with its own reward. */
export function optionalFor(setup: MissionSetup): { id: OptionalId; text: string }[] {
  switch (setup.kind) {
    case "strike": return [{ id: "ledger", text: "Seize the cell's ledger (F)" }, { id: "radio", text: `Cut their radio (X) before turn ${(setup.reinforce ?? 8) - 1}, or they call for help` }];
    case "retaliation": return [{ id: "civilians", text: "Keep at least half the townspeople alive" }];
    case "manhunt": return [{ id: "nocas", text: "Let no civilian die" }];
    case "coverup": return [{ id: "allwitnesses", text: "Dose every witness, not just half" }];
    case "escort": case "raid": return [{ id: "nolosses", text: "Lose nobody" }];
    case "breach": return setup.researchers ? [{ id: "staff", text: "Bring every researcher out alive" }] : [];
    default: return [];
  }
}
/** Whether an optional objective is met right now (or, at the end, was). */
export function optionalMet(id: OptionalId, end = false): boolean {
  const u = S.units;
  switch (id) {
    case "ledger": return u.some(x => x.id === "ledger" && x.saved);
    case "radio": return !!S.radioCut;
    case "civilians": { const all = u.filter(x => x.side === "civilian" && !x.record); return u.filter(x => x.side === "civilian" && !x.record && x.alive).length * 2 >= all.length; }
    case "nocas": return !u.some(x => x.side === "civilian" && !x.record && !x.alive);
    case "allwitnesses": return end ? u.filter(x => x.witness).every(x => x.dosed) : !u.some(x => x.witness && (x.saved && !x.dosed || !x.alive));
    case "nolosses": return !u.some(x => (x.side === "mtf") && !x.alive);
    case "staff": return u.filter(x => x.researcher).every(x => x.alive && (x.saved || !end));
  }
}

/** An emergency's hazard is dealt with when the anomaly is sealed or everything hostile is down. */
export const hazardDealt = () => S.sealed || (!S.has173 && !S.has049 && !S.has106 && !S.units.some(u => (u.side === "zombie" || u.side === "raider") && u.alive && !u.downed));

export const BRIEFINGS: Record<MissionKind, (s: MissionSetup) => string> = {
  rescue: s => `${s.survivorName ?? "A lost team"}'s survivors are hiding somewhere out here, and the Insurgency is still around. Reach them and they'll follow you; bring them out through an exit.`,
  emergency: s => s.quiet ? `Nobody at ${s.site ?? "the site"} has answered for two days, and the power is out. Find out what happened, restore power at the panel in containment control in the basement, and bring out whatever survivors and records you find. Whatever is in there, nobody has seen it yet.` : `${s.site ?? "The site"} is dark: the power is out and ${s.hazard === "scp" ? `${s.scp ? `SCP-${s.scp}` : "an anomaly"} is loose` : s.hazard === "insurgents" ? "an Insurgency team is inside" : "escaped instances are loose in the wing"}. ${s.researchers ?? 0} researchers are trapped and ${s.records ?? 0} files of records are at risk. Restore power at the panel, get the researchers out, recover the records${s.hazard === "scp" ? ", and seal the anomaly in the container if you can" : ""}. Exfiltrate when you've done what you can.`,
  riot: s => `The D-Class block is rioting: ${s.rioters} prisoners are out of their cells. They have nothing but their fists, but there are a lot of them. Restrain them (next to them, 1 action) or put them down; every one killed is a D-Class you won't have. Only Site Security answers this.`,
  outbreak: s => `SCP-610 has taken hold here. Flesh spreads from a core somewhere in the area, more every turn. Anyone who ends a turn on it without a sealed containment suit is infected, and turns into one of its instances 5 turns later: nothing saves them, not even leaving. Its instances infect with every blow. Only fire kills the core: incendiaries, a flamethrower, or fuel drums. Burn it out.${s.night ? " It's dark: nobody sees farther than 6 tiles." : ""}`,
  breach: s => isNewScp(s.scp) ? `${NEW_BRIEF[s.scp!]}${s.squad.length ? ` Epsilon-11 arrives on turn ${s.mtfTurn} with the capture kit.` : " Epsilon-11 isn't coming: nobody is available."}` : s.scp === "106" ? `SCP-106 is out of its cell. It walks through walls, and anyone it reaches is dragged into its pocket dimension. Shooting it only sends it under the floor for a turn. The only way to recontain it is bait: put a D-Class (or a secured Insurgent) in the transport container in the staging room. It will go straight for them and stay a turn to feed. Seal it in during that turn.${s.squad.length ? ` Epsilon-11 arrives on turn ${s.mtfTurn}.` : ""}` : s.scp === "049" ? `SCP-049 is out of its cell in the north rooms and looking for patients. Its touch kills, and it will raise anyone who dies as SCP-049-2. Gunfire only staggers it. Talk it down (Calm, within ${3} tiles) and lead it into the transport container in the staging room, then seal it.${s.squad.length ? ` Epsilon-11 arrives on turn ${s.mtfTurn}.` : ""}` : `SCP-173 is out of its cell in the north rooms. Site Security is first on the scene${s.lateGuards?.length ? `, with ${s.lateGuards.length} more guard${s.lateGuards.length > 1 ? "s" : ""} arriving next turn` : ""}. ${s.squad.length ? `Epsilon-11 arrives on turn ${s.mtfTurn}.` : "Epsilon-11 isn't coming: nobody is available."} The transport container is open at the dock in the staging room: get it inside and seal it. If it reaches the surface hatch in the east lab, it's gone; the panel at the east end of the corridor locks the hatch down.${s.dclass.length ? ` ${s.dclass.join(" and ")} ${s.dclass.length > 1 ? "are" : "is"} assigned to you.` : ""}`,
  manhunt: s => isNewScp(s.scp) ? NEW_BRIEF[s.scp!] : s.scp === "106" ? "An old man who walks through walls is loose among the locals, and people are disappearing into the floor. That is SCP-106. Shooting only drives it under for a turn. Put a D-Class in the truck's container as bait; it goes straight for them and stays a turn to feed. Seal it in then." : s.scp === "049" ? "A man in a plague doctor's mask is walking among the locals, and some of them have stopped breathing. That is SCP-049. Its touch kills, and the dead get back up. Talk it down (Calm) and lead it into the truck's open container, then seal it. Keep people from dying near it." : "SCP-173 is somewhere nearby, and the locals are out. Every civilian it kills makes the cover story harder. A truck with an open container is waiting: get it inside and seal it.",
  coverup: s => `${s.witnesses} witness${s.witnesses === 1 ? "" : "es"} saw something they shouldn't have. Reach each one and give them amnestics (Dose, 1 action, adjacent) before they get away. Anyone who spots the team will run for the edge of the map. Dose at least half for the job to count.`,
  raid: s => `The Chaos Insurgency is coming through the wire: ${s.insurgents} of them. They want the lift down into Site-19. One who stays at the lift doors for a turn forces them open. Site Security holds the compound${!s.squad.length ? ", and Epsilon-11 isn't coming" : s.liftCount === undefined || s.liftCount >= s.squad.length ? `; Epsilon-11 comes up the lift on turn ${s.mtfTurn}` : s.liftCount > 0 ? `; ${s.liftCount} of Epsilon-11 ${s.liftCount > 1 ? "are" : "is"} on station and come${s.liftCount > 1 ? "" : "s"} up the lift on turn ${s.mtfTurn}, and the rest are off duty and drive in through the motor pool gate on turn ${s.roadTurn}` : `; Epsilon-11 is off duty in town and drives in through the motor pool gate on turn ${s.roadTurn}${(s.roadTurn ?? 99) > RAID_TURNS ? ", too late unless the fight drags on" : ""}`}. Stop them, or hold until turn ${RAID_TURNS} when they pull back.${s.night ? " It's dark: nobody sees farther than 6 tiles." : ""}`,
  escort: s => s.convoy ? `The transfer has to get through this town, and the Insurgency is waiting in the buildings. The truck drives east along the main street, 3 tiles at the end of each enemy turn, and stops while anyone hostile is next to it. Get it out the far end. One of them next to it for a whole turn gets it open.` : `The convoy carrying ${s.scp ? `SCP-${s.scp}` : "the anomaly"} to Site-19 has been ambushed. Insurgents are coming for the truck: one who stays next to it for a turn gets it open. Neutralise them, or hold for 8 turns until the convoy can move.${s.night ? " It's dark: nobody sees farther than 6 tiles." : ""}`,
  retaliation: s => `The Insurgency is attacking the town to punish the locals and draw you out. They will shoot civilians as well as you; every civilian killed adds exposure. Neutralise them.${s.night ? " It's dark: nobody sees farther than 6 tiles." : ""}`,
  strike: () => "An Insurgency cell is holed up here. Neutralise every Insurgent. Wounded ones can be secured as prisoners.",
};

// Downed operatives come home if the mission is won or if they were stabilized; otherwise they die there.
// When the team pulls out, only those who made it out through an exit come home.
const survives = (u: Unit, win: boolean, evacuated: boolean) => u.alive && u.infectedTurn === undefined && !u.flesh && (win || (evacuated ? u.saved : !u.downed || !!u.stabilized));

export function missionResult(win: boolean, evacuated: boolean): MissionResult {
  let pocketReturned = 0;
  for (const u of S.units) if (u.taken && !u.alive && u.saved === false && u.side !== "raider") {
    if (Math.random() < S.setup.mods.pocketReturn) {
      pocketReturned++;
      u.returned = true;
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
    infectedLost: S.units.filter(u => u.opId && (u.infectedTurn !== undefined || u.flesh)).length,
    coreBurned: !!S.core && S.core.hp <= 0,
    riotersKilled: S.units.filter(u => u.rioter && !u.alive).length,
    hadFire: !!S.hadFire,
    photos: [...S.photos], noSpecimen: S.noSpecimen,
    restraints: S.units.some(u => u.side === "mtf" && u.items?.some(i => i.id === "restraints")),
    zombiesKilled: S.units.filter(u => u.side === "zombie" && !u.alive).length,
    pocketReturned,
    squad: [...S.units.filter(u => u.opId).map(u => ({ opId: u.opId!, alive: survives(u, win, evacuated), hp: Math.max(1, u.hp), san: u.san, kills: u.kills, sealed: !!u.sealed,
      hasArmor: !!u.hasArmor, armorKind: u.armorKind, armorHp: S.setup.squad.concat(S.setup.guards ?? [], S.setup.lateGuards ?? []).find(m => m.opId === u.opId)?.armorHp ?? 0, items: (u.items || []).map(i => ({ ...i })),
      witnessed: u.witnessed ?? 0, panics: u.panics ?? 0, minHp: u.minHp ?? u.hp, bestStreak: u.bestStreak ?? 0, returned: u.returned })),
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
    commander: (() => { const c = S.units.find(u => u.role === "commander"); return !c ? "absent" : c.escaped ? "escaped" : !c.alive ? "killed" : c.downed && (c.secured || win) ? "captured" : "escaped"; })(),
    charms: win ? S.units.filter(u => u.hadCharm && (!u.alive || u.downed)).length : 0,
    gru: !!S.setup.gru, lostTo: S.lostTo,
    optional: S.optional.map(o => ({ ...o, met: optionalMet(o.id, true) && (win || o.id === "ledger" || o.id === "radio") })),
    survivorsSaved: S.units.filter(u => u.researcher && u.alive && u.saved).length, survivorsTotal: (S.setup.researchers ?? 0) + (S.setup.survivors ?? 0),
    recordsRecovered: S.units.filter(u => u.record && u.saved).length, recordsTotal: S.setup.records ?? 0,
    powerRestored: !!S.powerOn, hazardDealt: hazardDealt(), scans: { ...(S.scans ?? {}) },
    specialistsLost: S.units.filter(u => u.specialist && (!u.alive || (!u.saved && !win && u.downed))).map(u => `${u.specialist}|${u.name}`),
  };
}
