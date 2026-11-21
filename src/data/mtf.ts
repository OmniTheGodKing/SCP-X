// Phase 5: the player's own Mobile Task Forces. Three separate ideas, kept apart on purpose:
//  - an MTF's primary specialization sets its focus and which squad specialties it can field;
//  - a squad's specialty sets its specialist training, the kit its members are qualified to carry, and how it fares
//    when it answers an incident without the player;
//  - an operative's class (rifleman, breacher, ...) is their own abilities and progression, unchanged.
// Numbers that a designer would tune live in MTF_CONFIG.
import type { ItemId } from "../game/types";

export type SpecId = "general" | "bio" | "heavy" | "recon";
export type SpecialtyId =
  | "breach" | "security" | "recovery" | "fire"                       // General Containment
  | "quarantine" | "incendiary" | "decon" | "hazrecovery"             // Biological Containment
  | "heavyinf" | "demolitions" | "heavyweapons" | "engineering"       // Heavy Assault
  | "infiltration" | "surveillance" | "tracking" | "forwardrecon";    // Reconnaissance & Intelligence

export const MTF_CONFIG = {
  /** Squads an MTF starts with, and the most it can grow to. */
  startSquads: 2,
  maxSquads: 4,
  /** Deployed team size: the base, and what each Foundation-wide upgrade adds. */
  deployBase: 4,
  /** A squad's roster can be this many larger than the team it deploys, for rotation and recovery. */
  rosterOver: 3,
  /** Changing a squad's specialty: days of retraining before its specialist kit can be used. */
  retrainDays: 14,
  /** Raising another squad, and founding another MTF. */
  squadCost: 80,
  mtfCost: 250,
  mtfStanding: 60,
  maxMtfs: 4,
};

export interface SpecialtyDef {
  name: string;
  spec: SpecId;
  desc: string;
  /** Specialist kit only this specialty is trained to carry. */
  kit: ItemId[];
  /** What the squad is good at when it answers an incident without the player, as weights by incident kind. */
  strengths: Partial<Record<string, number>>;
  /** Specialist starting kit issued when the squad is raised. */
  issue: Partial<Record<ItemId, number>>;
}

export const SPECIALTIES: Record<SpecialtyId, SpecialtyDef> = {
  breach: { name: "Breach Response", spec: "general", desc: "Coordinated entry into dangerous rooms: breaching charges open doors, partitions and ordinary walls on contact.",
    kit: ["breach_charge"], strengths: { strike: 0.18, breach: 0.15, raid: 0.1, emergency: 0.08 }, issue: { breach_charge: 3 } },
  security: { name: "Containment Security", spec: "general", desc: "Securing and holding ground: portable barricades become real cover at chokepoints and around containment.",
    kit: ["barricade"], strengths: { raid: 0.18, retaliation: 0.15, escort: 0.15, breach: 0.08 }, issue: { barricade: 3 } },
  recovery: { name: "Recovery & Extraction", spec: "general", desc: "Recovering the wounded, civilians and anomalies: restraint kits and medkits, and the training to get people out.",
    kit: [], strengths: { recovery: 0.18, rescue: 0.2, emergency: 0.12, coverup: 0.08 }, issue: { medkit: 2, restraints: 1 } },
  fire: { name: "Fire Support", spec: "general", desc: "Covering everyone else: sustained and suppressive fire from machine guns and grenades, covering withdrawals.",
    kit: [], strengths: { strike: 0.12, retaliation: 0.15, raid: 0.12, escort: 0.1 }, issue: { frag: 2, smoke: 2 } },
  quarantine: { name: "Quarantine", spec: "bio", desc: "Isolation barriers and containment perimeters around infected ground.", kit: ["barricade", "contsuit"], strengths: { outbreak: 0.22, emergency: 0.1 }, issue: { contsuit: 2 } },
  incendiary: { name: "Incendiary", spec: "bio", desc: "Flamethrowers and incendiaries that burn out biological contamination, at the risk of everything else catching.", kit: ["flamer", "incendiary"], strengths: { outbreak: 0.28 }, issue: { incendiary: 2 } },
  decon: { name: "Decontamination", spec: "bio", desc: "Detecting and clearing supported contamination so ground can be used again.", kit: ["hazmat", "contsuit"], strengths: { outbreak: 0.15, emergency: 0.12 }, issue: { hazmat: 2 } },
  hazrecovery: { name: "Hazardous Recovery", spec: "bio", desc: "Getting people and samples out of contaminated areas in protective gear.", kit: ["hazmat", "contsuit"], strengths: { rescue: 0.15, outbreak: 0.12, recovery: 0.1 }, issue: { hazmat: 2 } },
  heavyinf: { name: "Heavy Infantry", spec: "heavy", desc: "Heavy armor and direct assaults under fire.", kit: ["armor_heavy"], strengths: { strike: 0.2, raid: 0.15 }, issue: { armor_heavy: 2 } },
  demolitions: { name: "Demolitions", spec: "heavy", desc: "Explosive entry and structural demolition.", kit: ["breach_charge", "law", "bazooka"], strengths: { strike: 0.18, breach: 0.1 }, issue: { breach_charge: 3 } },
  heavyweapons: { name: "Heavy Weapons", spec: "heavy", desc: "Support weapons for sustained suppression and anti-materiel fire.", kit: ["bazooka", "law", "flamer"], strengths: { retaliation: 0.2, raid: 0.15 }, issue: { law: 1 } },
  engineering: { name: "Combat Engineering", spec: "heavy", desc: "Field defenses, obstacles and reinforced positions.", kit: ["barricade", "breach_charge"], strengths: { raid: 0.18, escort: 0.15 }, issue: { barricade: 3 } },
  infiltration: { name: "Infiltration", spec: "recon", desc: "Concealed movement and approaches that avoid detection.", kit: ["darts"], strengths: { coverup: 0.2, strike: 0.1 }, issue: {} },
  surveillance: { name: "Surveillance", spec: "recon", desc: "Observation, target identification and sensors.", kit: ["tracker", "camera"], strengths: { recovery: 0.12, coverup: 0.12 }, issue: { camera: 1 } },
  tracking: { name: "Tracking", spec: "recon", desc: "Following trails to missing people and fleeing targets.", kit: ["tracker"], strengths: { recovery: 0.2, rescue: 0.18 }, issue: {} },
  forwardrecon: { name: "Forward Recon", spec: "recon", desc: "Scouting locations, routes and hazards ahead of insertion.", kit: ["tracker", "flare"], strengths: { emergency: 0.12, recovery: 0.1, strike: 0.08 }, issue: { flare: 2 } },
};

export interface SpecDef { name: string; desc: string; specialties: SpecialtyId[]; }
export const SPECS: Record<SpecId, SpecDef> = {
  general: { name: "General Containment", desc: "Flexible containment response, facility security and recovery. Every site's first MTF is General Containment: the Foundation needs a force that can answer anything before it fields specialists.", specialties: ["breach", "security", "recovery", "fire"] },
  bio: { name: "Biological Containment", desc: "Infectious anomalies, contaminated ground and quarantine operations.", specialties: ["quarantine", "incendiary", "decon", "hazrecovery"] },
  heavy: { name: "Heavy Assault", desc: "Heavily defended locations, high-threat operations and destructive entry.", specialties: ["heavyinf", "demolitions", "heavyweapons", "engineering"] },
  recon: { name: "Reconnaissance & Intelligence", desc: "Observation, infiltration, surveillance and intelligence gathering.", specialties: ["infiltration", "surveillance", "tracking", "forwardrecon"] },
};

/** Designations an MTF can take: a Greek letter and a number. */
export const GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"];
/** Designations already held elsewhere in the Foundation. */
export const TAKEN_DESIGNATIONS = ["Epsilon-11", "Eta-10", "Nu-7", "Alpha-1", "Omega-1"];

/** Every specialist kit item, so ordinary kit stays open to everyone. */
export const SPECIALIST_ITEMS: ItemId[] = [...new Set(Object.values(SPECIALTIES).flatMap(s => s.kit).filter(i => i === "breach_charge" || i === "barricade"))];
