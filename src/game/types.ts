// Shared types for a tactical mission.

import type { ClassId, PerkId, TraitId } from "../data/classes";
export type { ClassId, PerkId, TraitId };
/** Class abilities plus Secure, which every operative can do. */
export type AbilityId = PerkId | "secure" | "dose" | "lockdown" | "calm";

import type { AmmoId, AttachmentId, WeaponType } from "../data/weapons";
export type { AmmoId, AttachmentId, WeaponType };

export type ItemId = "armor" | "armor_light" | "armor_heavy" | "hazmat" | "leadsuit"
  | "eyedrops" | "flashbang" | "smoke" | "tracker" | "frag" | "csgas" | "bazooka" | "law" | "medkit" | "camera" | "restraints" | "darts";
/** Items thrown or fired at a tile, and the heavy weapons among them (heavy armor only). */
export const THROWN: ItemId[] = ["frag", "flashbang", "smoke", "csgas", "bazooka", "law"];
export const HEAVY: ItemId[] = ["bazooka", "law"];

/** The weapon a unit carries into a mission. */
export interface Gun { name: string; type: WeaponType; dmg: [number, number]; mag: number; ammo: number; aim: number; attachment?: AttachmentId;
  /** Armor points every hit ignores (coil weapons, armor-piercing rounds), and special ammunition loaded. */
  pierce?: number; ammoType?: AmmoId; }
export interface Carried { id: ItemId; uses: number; }

export type Side = "mtf" | "dclass" | "subject" | "civilian" | "raider" | "anomaly" | "zombie";
/** Anomalies a mission can be about. */
export type ScpId = "173" | "049" | "106";
export type MissionKind = "breach" | "manhunt" | "coverup" | "strike";
export type Phase = "player" | "anomaly" | "hand" | "subjects" | "over";

export interface Unit {
  id: string;
  side: Side;
  name: string;
  call?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  san: number;
  aim: number;
  alive: boolean;
  saved: boolean;
  ap: number;
  overwatch: boolean;
  panicUntil: number;
  staring: boolean;
  hadLos: boolean;
  seen173: boolean;
  fled: boolean;
  kills: number;
  lostSanTurn?: number;
  /** Frozen while observed; enables "Do not blink" and "Call the blink". */
  sightBound?: boolean;
  /** D-Class who joined the work detail mid-mission. */
  joined?: boolean;
  /** Campaign links and per-person overrides for operatives. */
  opId?: string;
  slot?: number;
  maxSan?: number;
  blinkFull?: number;
  sealed?: boolean;
  /** Armor points: each one cuts the damage of every hit by 1. */
  armor?: number;
  hasArmor?: boolean;
  /** Which armor they wear, and the movement it adds or costs. */
  armorKind?: ItemId;
  moveBonus?: number;
  /** SCP-106 has a grip on them (lead-lined suits hold for a turn). */
  seizedTurn?: number;
  items?: Carried[];
  /** Blinded by a flashbang through the enemy phases of this turn. */
  blindUntil?: number;
  /** Research bonus: lower blink chance while staring. */
  blinkMod?: number;
  /** SCP-049: staggered by gunfire through this turn's anomaly phase. */
  staggeredUntil?: number;
  /** A body SCP-049 has already raised. */
  cured?: boolean;
  /** Pulled into SCP-106's pocket dimension; whether they come back is decided when the mission ends. */
  taken?: boolean;
  /** Site Security: guards are weaker than operatives and have no class. */
  guard?: boolean;
  /** Civilians who saw too much; dosed ones have had amnestics. */
  witness?: boolean;
  dosed?: boolean;
  spooked?: boolean;
  gun?: Gun;
  /** An incapacitated Insurgent who has been restrained. */
  secured?: boolean;
  cls?: ClassId;
  perks?: PerkId[];
  traits?: TraitId[];
  /** At 0 HP an operative goes down and bleeds out unless stabilized. */
  downed?: boolean;
  bleed?: number;
  stabilized?: boolean;
  suppressedUntil?: number;
  markedUntil?: number;
  overwatchShots?: number;
  /** Per-mission and per-turn ability bookkeeping. */
  used?: Record<string, number>;
  // what happened to them this mission, for traits
  witnessed?: number;
  panics?: number;
  minHp?: number;
  streak?: number;
  bestStreak?: number;
}

export interface LogEntry { t: number; text: string; kind: string; }

export type Effect =
  | { type: "line"; t0: number; dur: number; x0: number; y0: number; x1: number; y1: number; color: string }
  | { type: "text"; t0: number; dur: number; x: number; y: number; text: string; color: string }
  | { type: "ghost"; t0: number; dur: number; x: number; y: number }
  | { type: "flash"; t0: number; dur: number; x: number; y: number };

/** One operative as sent from Site-19. */
export interface SquadMember {
  opId: string; name: string; call: string;
  hp: number; maxHp: number; san: number; maxSan: number; aim: number; blinkFull: number;
  armor: number; hasArmor: boolean; items: Carried[];
  armorKind?: ItemId; armorHp?: number; moveBonus?: number;
  cls?: ClassId; perks: PerkId[]; traits: TraitId[];
  gun: Gun;
  guard?: boolean;
}

/** Effects of finished research that apply during missions. */
export interface MissionMods { blinkBonus: number; recoverBonus: number; mtfDrag: number; track173: boolean; lockdownTurns: number; calmTurns: number; pocketReturn: number;
  /** Research expansion: medkit healing, stabilized operatives standing up, overwatch aim back, extra sight,
   *  Insurgent aim against armor, and how many D-Class get loose in a breach. */
  medkitHeal: number; standUp: boolean; m79: boolean; reactionBonus: number; sightBonus: number; ciAnalysis: boolean; strays: number; }

export interface MissionSetup {
  kind: MissionKind;
  /** Which anomaly a breach or manhunt is about (SCP-173 if not set). */
  scp?: ScpId;
  map: "wingC" | "town" | "farm" | "port";
  amnestics: number;
  witnesses: number;
  civilians: number;
  incidentId: string;
  title: string;
  insurgents: number;
  squad: SquadMember[];
  /** Breaches: Site Security on the map from turn 1, guards who come in on turn 2, and when Epsilon-11 arrives. */
  guards?: SquadMember[];
  lateGuards?: SquadMember[];
  mtfTurn?: number;
  dclass: string[];
  known: string[];
  mods: MissionMods;
  insurgentArmor: number;
  year: number;
}

export interface MissionResult {
  incidentId: string;
  win: boolean;
  evacuated: boolean;
  turns: number;
  squad: {
    opId: string; alive: boolean; hp: number; san: number; kills: number; sealed: boolean; hasArmor: boolean; items: Carried[];
    armorKind?: ItemId; armorHp?: number;
    witnessed: number; panics: number; minHp: number; bestStreak: number;
    /** Reinforcements who never reached the map before it ended. */
    absent?: boolean;
  }[];
  /** SCP-173 got out through the surface hatch. */
  escaped: boolean;
  /** Material for studies: SCP-049-2 killed, and people who came back from SCP-106. */
  zombiesKilled: number;
  pocketReturned: number;
  /** Anomalies photographed with the field camera, and whether a restraint kit came along. */
  photos: ScpId[];
  restraints: boolean;
  aftercare: boolean;
  prisoners: number;
  civiliansKilled: number;
  witnessesEscaped: number;
  witnessesDosed: number;
  amnesticsUsed: number;
  known: string[];
  dSent: number;
  dReturned: number;
  dRecruited: number;
  dLost: number;
  insurgentsDown: number;
  insurgentsTotal: number;
}

export interface Mem { x: number; y: number; turn: number; }

export interface MissionState {
  setup: MissionSetup;
  /** Whether SCP-173 is in this mission at all. */
  has173: boolean;
  /** SCP-049 instead: `statue` is SCP-049, and calmUntil is the last turn it stays calm. */
  has049: boolean;
  calmUntil: number;
  /** SCP-106 instead: under the floor through sunkUntil, feeding on bait on feedTurn, and the floor it has rotted. */
  has106: boolean;
  sunkUntil: number;
  submerged: boolean;
  feedTurn: number;
  corroded: Set<number>;
  amnestics: number;
  turn: number;
  phase: Phase;
  busy: boolean;
  over: boolean;
  called: boolean;
  mode: "drag" | "throw" | "ability" | "lead" | null;
  ability: AbilityId | null;
  units: Unit[];
  statue: Unit;
  sealed: boolean;
  selected: Unit | null;
  hover: { x: number; y: number } | null;
  pending: { x: number; y: number } | null;
  vis: Uint8Array;
  explored: Uint8Array;
  lastSeen: { x: number; y: number; turn: number } | null;
  raidersActive: boolean;
  mem: Map<string, Mem>;
  checked: Set<string>;
  known: Set<string>;
  fresh: Set<string>;
  log: LogEntry[];
  effects: Effect[];
  stats: { mtfLost: number; dLost: number; escaped: number; raidersDown: number };
  smoke: { x: number; y: number; until: number }[];
  throwing: Carried | null;
  /** Squad members still on their way, and the turn they arrive. */
  reinforce: { turn: number; members: SquadMember[] }[];
  /** SCP-173's urge to leave: it grows each turn it roams unseen without a kill. */
  escapeDrive: number;
  lockedUntil: number;
  escaped: boolean;
  /** Anomalies photographed this mission. */
  photos: ScpId[];
  /** Debug menu switches. */
  debug?: { freeze173?: boolean; place173?: boolean; kill?: boolean };
  result?: MissionResult;
}
