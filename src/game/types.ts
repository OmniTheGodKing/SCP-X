// Shared types for a tactical mission.

export type Side = "mtf" | "dclass" | "subject" | "raider" | "anomaly";
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
}

export interface LogEntry { t: number; text: string; kind: string; }

export type Effect =
  | { type: "line"; t0: number; dur: number; x0: number; y0: number; x1: number; y1: number; color: string }
  | { type: "text"; t0: number; dur: number; x: number; y: number; text: string; color: string }
  | { type: "ghost"; t0: number; dur: number; x: number; y: number };

/** One operative as sent from Site-19. */
export interface SquadMember {
  opId: string; name: string; call: string;
  hp: number; maxHp: number; san: number; maxSan: number; aim: number; blinkFull: number;
}

export interface MissionSetup {
  incidentId: string;
  title: string;
  insurgents: number;
  squad: SquadMember[];
  dclass: string[];
}

export interface MissionResult {
  incidentId: string;
  win: boolean;
  evacuated: boolean;
  turns: number;
  squad: { opId: string; alive: boolean; hp: number; san: number; kills: number; sealed: boolean }[];
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
  turn: number;
  phase: Phase;
  busy: boolean;
  over: boolean;
  called: boolean;
  mode: "drag" | null;
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
  result?: MissionResult;
}
