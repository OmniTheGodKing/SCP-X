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
  retrainDays: 5,
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
  /** Specialist kit this specialty certifies its people for (restricted items only gate on this). */
  kit: ItemId[];
  /** Starter requisition offered when the squad is raised: bought from the site's funds, never free. */
  issue: Partial<Record<ItemId, number>>;
}

const sp = (name: string, spec: SpecId, desc: string, issue: Partial<Record<ItemId, number>>, kit: ItemId[]): SpecialtyDef => ({ name, spec, desc, issue, kit });
export const SPECIALTIES: Record<SpecialtyId, SpecialtyDef> = {
  breach: sp("Breach Response", "general", "Controlled entry into dangerous rooms: breaching charges on doors, partitions and barricades, and two-man coordinated entries.", { breach_charge: 2 }, ["breach_charge"]),
  security: sp("Containment Security", "general", "Holding ground: portable barriers that are real cover and block the way, and defenders who hold a line on overwatch.", { barricade: 2 }, ["barricade"]),
  recovery: sp("Recovery & Extraction", "general", "Getting people and objects out: stretcher teams that carry without slowing, and secure handovers at the exit.", { stretcher: 1, medkit: 1 }, ["stretcher"]),
  fire: sp("Fire Support", "general", "Covering everyone else: lanes of reaction fire that pin, suppression that moves where it's needed, ammunition discipline.", { frag: 1 }, []),
  quarantine: sp("Quarantine", "bio", "Isolation lines SCP-610's flesh cannot spread through, and suit discipline at the boundary.", { cordon_kit: 2 }, ["cordon_kit"]),
  incendiary: sp("Incendiary", "bio", "Flamethrowers and fire doctrine against what burns, and firebreaks to keep it where it belongs.", { firebreak_kit: 1 }, ["flamer", "firebreak_kit"]),
  decon: sp("Decontamination", "bio", "Clearing removable contamination (SCP-106's corrosion, fire) so ground can be used again.", { decon_agent: 2 }, ["decon_agent"]),
  hazrecovery: sp("Hazardous Recovery", "bio", "Sealed sample retrieval and protected carries through contaminated ground.", { sample_case: 1, stretcher: 1 }, ["sample_case", "stretcher"]),
  heavyinf: sp("Heavy Infantry", "heavy", "Heavy plate without the usual slowdown, and braced positions suppression can't move.", { armor_heavy: 1 }, []),
  demolitions: sp("Demolitions", "heavy", "Walls removed on purpose, and fuel drums made safe.", { demo_charge: 2 }, ["demo_charge", "breach_charge"]),
  heavyweapons: sp("Heavy Weapons", "heavy", "Emplaced machine guns, area interdiction, rocket launchers.", {}, ["bazooka", "law", "flamer"]),
  engineering: sp("Combat Engineering", "heavy", "Sandbagged full cover and doors rebuilt under fire.", { sandbags: 2 }, ["sandbags"]),
  infiltration: sp("Infiltration", "recon", "Quiet movement and doors opened without a sound.", {}, []),
  surveillance: sp("Surveillance", "recon", "Observation posts that see farther and log everything that crosses them, and confirmed sightings as intelligence.", { camera: 1 }, []),
  tracking: sp("Tracking", "recon", "Reading the trail an enemy or anomaly leaves, and marking it.", { field_tags: 1 }, ["field_tags"]),
  forwardrecon: sp("Forward Recon", "recon", "Route surveys that mark hazards in sight, and new extraction points.", { field_tags: 1 }, ["field_tags"]),
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
export const SPECIALIST_ITEMS: ItemId[] = [...new Set(Object.values(SPECIALTIES).flatMap(s => s.kit))];
