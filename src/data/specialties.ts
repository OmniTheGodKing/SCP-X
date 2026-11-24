// Version 12 of the design: what each of the sixteen squad specialties can actually do, as data. Every number here
// is a first-pass balancing proposal from the design document (section 26), mapped onto this game's real systems:
// two actions a turn, tiles, cover, doors, noise, suppression, carrying, SCP-610's flesh and fire. Tune here, never
// in the UI or the rules code.
//
// Three levels stay separate: the MTF's primary specialization (doctrine, which specialties and kit it may field),
// the squad's specialty (its procedures, techniques, certified kit and mastery), and each soldier's class (their own
// abilities and progression, unchanged).
import type { ItemId } from "../game/types";
import type { SpecId, SpecialtyId } from "./mtf";

export const SQUAD_BALANCE = {
  /** Mastery stages: operations in which the squad actually used its specialty, needed for each stage. */
  stageOps: [0, 3, 8, 15] as const,
  stageNames: ["Authorized", "Drilled", "Proficient", "Veteran"] as const,
  /** A training module at the range can stand in for field operations up to this stage, at this cost. */
  drillMaxStage: 2,
  drillDays: [0, 5, 10],
  drillCost: [0, 30, 60],
  /** Retraining a squad into another specialty of its MTF's family (design: 3 to 7 days), and the shorter time when
   *  most of the roster already holds that certification. */
  retrainDays: 5,
  retrainDaysQualified: 2,
  /** Major specialist bundles a deployed squad takes from stores (design: 2), and the extra one at Proficient. */
  kitMajors: 2,
  kitMajorsProficient: 1,
  /** Any modifier in one category stops here (design: 30%). */
  categoryCap: 0.3,
  /** Veteran branch: one fewer turn of cooldown on techniques, or this chance a consumable isn't used up. */
  veteranSpeed: 1,
  veteranReliability: 0.25,
};

export type TechTarget = "self" | "enemy" | "tile" | "door" | "trail" | "carry" | "flesh";
export interface TechDef {
  id: string;
  name: string;
  specialty: SpecialtyId;
  /** Actions it costs, and the stage at which a cheaper version applies (from a passive). */
  ap: number;
  /** Turns before the squad can use it again (a squad-level cooldown, not per soldier). */
  cooldown: number;
  /** Squadmates who must take part (adjacent, able to act), counting the user. */
  participants: number;
  /** Squad kit it uses up from the squad's shared stock, and kit it needs without using. */
  consumes?: ItemId;
  needs?: ItemId;
  target: TechTarget;
  desc: string;
  /** Set when a part of the design's version depends on a system the game doesn't have yet. */
  incomplete?: string;
}
export interface PassiveDef { id: string; name: string; desc: string; incomplete?: string; }
export interface SpecialtyKit {
  /** Capability tags the hands-off resolver and mission objectives read (design 26.6). */
  tags: string[];
  techs: string[];
  passive: PassiveDef;
  /** Grade 2 development at Proficient: what it adds. */
  grade2: string;
  worldMap: string;
  tradeoff: string;
  /** Stock-carried kit the squad is certified for (beyond ordinary weapons and gear). */
  certified: ItemId[];
}

/** Squad techniques. Ids are what the mission's ability bar and the tests use. */
export const TECHS: Record<string, TechDef> = {
  // 01 Breach Response
  sq_controlled_breach: { id: "sq_controlled_breach", name: "Controlled breach", specialty: "breach", ap: 1, cooldown: 0, participants: 1, consumes: "breach_charge", target: "tile",
    desc: "Set a breaching charge on an adjacent door, partition or barricade and blow it. Opens the way and the sight lines, makes a lot of noise, and hurts whoever is behind it. Ordinary walls need Demolitions." },
  sq_coordinated_entry: { id: "sq_coordinated_entry", name: "Coordinated entry", specialty: "breach", ap: 2, cooldown: 2, participants: 2, target: "door",
    desc: "Two of the squad at a shut door: one opens it, the other is already covering the room (overwatch facing the doorway, using their own action). Entry Drill makes it cost 1 action." },
  // 02 Containment Security
  sq_perimeter: { id: "sq_perimeter", name: "Establish perimeter", specialty: "security", ap: 2, cooldown: 0, participants: 1, consumes: "barricade", target: "tile",
    desc: "Set a portable barrier on an adjacent clear tile: half cover that blocks the way, until a blast takes it out. Never on an exit. Fortification Drill makes it 1 action." },
  sq_hold_line: { id: "sq_hold_line", name: "Hold the line", specialty: "security", ap: 1, cooldown: 3, participants: 2, target: "self",
    desc: "With squadmates beside them already on overwatch, each of those defenders gets one more reaction shot this enemy turn, with their own ammunition." },
  // 03 Recovery & Extraction
  sq_two_person_evac: { id: "sq_two_person_evac", name: "Two-person evac", specialty: "recovery", ap: 1, cooldown: 0, participants: 2, needs: "stretcher", target: "self",
    desc: "Carrying someone, with a squadmate beside them and the stretcher: the carry costs them no movement this turn. Both stay exposed." },
  sq_secure_transfer: { id: "sq_secure_transfer", name: "Secure transfer", specialty: "recovery", ap: 2, cooldown: 0, participants: 1, target: "carry",
    desc: "On an exit tile while carrying someone: hand them over to the extraction team. They're out of the mission alive; the carrier stays." },
  // 04 Fire Support
  sq_covering_lane: { id: "sq_covering_lane", name: "Covering lane", specialty: "fire", ap: 1, cooldown: 2, participants: 1, target: "self",
    desc: "Go on overwatch covering a lane: two reaction shots instead of one, each pins its target (suppressed) as well. Uses real rounds; nothing through walls." },
  sq_suppression_shift: { id: "sq_suppression_shift", name: "Suppression shift", specialty: "fire", ap: 1, cooldown: 0, participants: 1, target: "enemy",
    desc: "Someone pinned by this gunner is let go and the fire moves to another enemy they can see. One round." },
  // 05 Quarantine
  sq_isolation_line: { id: "sq_isolation_line", name: "Isolation line", specialty: "quarantine", ap: 2, cooldown: 0, participants: 1, consumes: "cordon_kit", target: "tile",
    desc: "Run a three-tile cordon through an adjacent tile, across the operative's facing. SCP-610's flesh cannot spread into cordoned tiles while the line stands; fire burns it down." },
  sq_controlled_crossing: { id: "sq_controlled_crossing", name: "Controlled crossing", specialty: "quarantine", ap: 1, cooldown: 0, participants: 1, target: "self",
    desc: "On or beside an isolation line: staff a crossing in it. While they hold it (stay on or beside it), anyone who steps through is washed down and comes out clean. Contaminated people walking out anywhere else track residue that can take root outside the line." },
  // 06 Incendiary
  sq_firebreak: { id: "sq_firebreak", name: "Firebreak", specialty: "incendiary", ap: 2, cooldown: 0, participants: 1, consumes: "firebreak_kit", target: "tile",
    desc: "Clear and soak a 2×2 strip: fires there go out and it won't burn or take SCP-610's flesh for 4 turns. Flesh already there stays." },
  // 07 Decontamination
  sq_decon_sweep: { id: "sq_decon_sweep", name: "Decon sweep", specialty: "decon", ap: 2, cooldown: 0, participants: 1, consumes: "decon_agent", target: "tile",
    desc: "Treat a 2×2 area: SCP-106's corrosion and burning there are cleared. SCP-610's flesh is a living transformation and does not wash off." },
  sq_equipment_isolation: { id: "sq_equipment_isolation", name: "Equipment isolation", specialty: "decon", ap: 1, cooldown: 0, participants: 1, target: "self",
    desc: "On clean ground: bag the contaminated kit of everyone beside them, themselves included. Bagged kit comes home for decon; dirty kit left unbagged is incinerated at the end of the mission. It doesn't wash the person." },
  // 08 Hazardous Recovery
  sq_sealed_retrieval: { id: "sq_sealed_retrieval", name: "Sealed retrieval", specialty: "hazrecovery", ap: 2, cooldown: 0, participants: 1, consumes: "sample_case", target: "flesh",
    desc: "Package a sample of an adjacent SCP-610 growth in a sealed case. It comes home for research. Without a sealed suit, the handler risks infection." },
  // 09 Heavy Infantry
  sq_anchor: { id: "sq_anchor", name: "Anchor position", specialty: "heavyinf", ap: 2, cooldown: 2, participants: 1, target: "self",
    desc: "Brace in cover: hunkered, and suppression can't pin them until their next turn. Needs real cover and body armor." },
  sq_protected_advance: { id: "sq_protected_advance", name: "Protected advance", specialty: "heavyinf", ap: 1, cooldown: 2, participants: 2, target: "self",
    desc: "From cover, with an armed squadmate beside them: the partner spends an action covering, then this turn's move is made under their fire. Reaction shots at the mover take −20, and the partner returns fire on anyone who shoots at them (one shot each)." },
  // 10 Demolitions
  sq_shaped_breach: { id: "sq_shaped_breach", name: "Shaped breach", specialty: "demolitions", ap: 2, cooldown: 0, participants: 1, consumes: "demo_charge", target: "tile",
    desc: "Plant a demolition charge on an adjacent wall, partition, door or barricade and fire it: the wall is gone, sight and paths open. Reinforced walls too, never a containment cell's steel. Loud." },
  sq_safe_clearance: { id: "sq_safe_clearance", name: "Safe clearance", specialty: "demolitions", ap: 1, cooldown: 0, participants: 1, target: "tile",
    desc: "Make an adjacent fuel drum safe and drag it clear: it can't be set off any more. Doesn't work on anomalous traps." },
  // 11 Heavy Weapons
  sq_emplace: { id: "sq_emplace", name: "Emplace support", specialty: "heavyweapons", ap: 2, cooldown: 0, participants: 1, target: "self",
    desc: "Set a machine gun on its bipod or tripod: two reaction shots on overwatch while emplaced, but they can't move until they pack up (1 action). Crew Drill: 1 action to emplace." },
  sq_pack: { id: "sq_pack", name: "Pack up the gun", specialty: "heavyweapons", ap: 1, cooldown: 0, participants: 1, target: "self", desc: "Take the gun off its mount so they can move again." },
  sq_interdiction: { id: "sq_interdiction", name: "Focused interdiction", specialty: "heavyweapons", ap: 1, cooldown: 2, participants: 1, target: "enemy",
    desc: "Emplaced only: suppress the target and every enemy beside it. Four rounds." },
  // 12 Combat Engineering
  sq_field_fortify: { id: "sq_field_fortify", name: "Field fortify", specialty: "engineering", ap: 2, cooldown: 0, participants: 1, consumes: "sandbags", target: "tile",
    desc: "Sandbag an adjacent clear tile into full cover, or rebuild a blown-out door. Workmanship: 1 action." },
  sq_restore: { id: "sq_restore", name: "Emergency restore", specialty: "engineering", ap: 1, cooldown: 0, participants: 1, target: "tile",
    desc: "Rehang an adjacent destroyed door (shut, it blocks sight again)." },
  // 13 Infiltration
  sq_silent_approach: { id: "sq_silent_approach", name: "Silent approach", specialty: "infiltration", ap: 1, cooldown: 3, participants: 1, target: "self",
    desc: "Until the end of the turn, the squad's footsteps carry half as far and they move one tile less. Eyes still see them." },
  sq_covert_access: { id: "sq_covert_access", name: "Covert access", specialty: "infiltration", ap: 1, cooldown: 0, participants: 1, target: "door",
    desc: "Ease an adjacent shut door open without a sound, if no enemy can see the doorway." },
  // 14 Surveillance
  sq_observation_post: { id: "sq_observation_post", name: "Observation post", specialty: "surveillance", ap: 2, cooldown: 0, participants: 1, target: "self",
    desc: "In cover and holding still: they see 2 tiles farther, and every enemy who crosses their sight is logged as intelligence. Ends when they move." },
  sq_confirm_target: { id: "sq_confirm_target", name: "Confirm target", specialty: "surveillance", ap: 1, cooldown: 0, participants: 1, target: "enemy",
    desc: "Watch a visible enemy without firing: a verified observation goes in the report (Intel at the debrief). Looking at SCP-096's face is still looking at it." },
  // 15 Tracking
  sq_read_sign: { id: "sq_read_sign", name: "Read sign", specialty: "tracking", ap: 2, cooldown: 0, participants: 1, target: "trail",
    desc: "At a fresh trail beside them: the direction it leads and a rough area, not the target itself. Old sign may be stale." },
  sq_mark_trail: { id: "sq_mark_trail", name: "Mark trail", specialty: "tracking", ap: 1, cooldown: 0, participants: 1, consumes: "field_tags", target: "trail",
    desc: "Tag a trail so it doesn't fade: anyone can follow it for the rest of the mission." },
  // 16 Forward Recon
  sq_route_recon: { id: "sq_route_recon", name: "Route recon", specialty: "forwardrecon", ap: 2, cooldown: 2, participants: 1, target: "self",
    desc: "Survey what they can see: fires, SCP-610 growth, fuel drums and cover within sight are marked for the squad. Nothing behind walls." },
  sq_designate_insertion: { id: "sq_designate_insertion", name: "Designate insertion", specialty: "forwardrecon", ap: 1, cooldown: 0, participants: 1, consumes: "field_tags", target: "tile",
    desc: "Mark an adjacent clear tile as an extraction point: anyone can exfiltrate from it." },
};

export const KITS: Record<SpecialtyId, SpecialtyKit> = {
  breach: { tags: ["can_breach_door", "can_coordinated_entry"], techs: ["sq_controlled_breach", "sq_coordinated_entry"], certified: ["breach_charge"],
    passive: { id: "entry_drill", name: "Entry Drill", desc: "Coordinated entry costs 1 action instead of 2." },
    grade2: "A third breaching charge in the squad kit.", worldMap: "Prepared entry: strikes on buildings go better when the route in is known.", tradeoff: "Charges are loud and can kill; they don't open walls, and nothing stops SCP-106 at a door." },
  security: { tags: ["can_erect_barrier", "can_hold_line"], techs: ["sq_perimeter", "sq_hold_line"], certified: ["barricade"],
    passive: { id: "fortification_drill", name: "Fortification Drill", desc: "Establishing a perimeter costs 1 action instead of 2." },
    grade2: "A third barrier in the squad kit.", worldMap: "Holds raids, retaliations and convoys well.", tradeoff: "Static: barriers cost stock and can block your own way out." },
  recovery: { tags: ["can_carry_two_person", "can_secure_transfer"], techs: ["sq_two_person_evac", "sq_secure_transfer"], certified: ["stretcher"],
    passive: { id: "recovery_drill", name: "Recovery Drill", desc: "A downed squadmate they stabilize keeps one more turn before bleeding out.", incomplete: "Bleed-out has no per-turn timer to extend yet; the hands-off side is applied (fewer deaths on rescues)." },
    grade2: "A second stretcher.", worldMap: "More reliable rescues and evacuations hands-off; no guarantee of a capture.", tradeoff: "Carrying takes hands and actions away from the fight." },
  fire: { tags: ["can_suppress_lane", "can_emplace_mg"], techs: ["sq_covering_lane", "sq_suppression_shift"], certified: [],
    passive: { id: "fire_discipline", name: "Fire Discipline", desc: "Suppression uses 1 round instead of 2." },
    grade2: "Belt-fed ammunition: covering lanes recover 1 round each.", worldMap: "Covers defenses and evacuations.", tradeoff: "Ammunition-hungry and loud; shooting doesn't contain anomalies." },
  quarantine: { tags: ["can_reduce_spread", "can_erect_barrier"], techs: ["sq_isolation_line", "sq_controlled_crossing"], certified: ["cordon_kit", "contsuit"],
    passive: { id: "zone_discipline", name: "Zone Discipline", desc: "In a sealed suit, their own contact with SCP-610's flesh never infects them, and a torn suit is 20% less likely." },
    grade2: "A third cordon kit.", worldMap: "Quarantine assessment: slows an outbreak before a burn team arrives.", tradeoff: "Cordons take time and can trap people; nothing nonphysical respects them." },
  incendiary: { tags: ["can_burn_infected_tile", "can_firebreak"], techs: ["sq_firebreak"], certified: ["flamer", "incendiary", "firebreak_kit"],
    passive: { id: "fuel_handling", name: "Fuel Handling", desc: "The flamethrower carries one more burst." },
    grade2: "A second firebreak kit.", worldMap: "Burns out infected pockets, at a cost in collateral and evidence.", tradeoff: "Very short range; fire spreads, destroys samples and draws attention." },
  decon: { tags: ["can_decontaminate"], techs: ["sq_decon_sweep", "sq_equipment_isolation"], certified: ["decon_agent", "hazmat"],
    passive: { id: "clean_route", name: "Clean Route", desc: "Walking through SCP-106's corrosion doesn't hurt them.", },
    grade2: "A third decon charge.", worldMap: "Reopens contaminated sectors after an incident.", tradeoff: "Takes turns, and doesn't touch anomalous transformation." },
  hazrecovery: { tags: ["can_recover_contaminated_sample", "can_protected_extraction"], techs: ["sq_sealed_retrieval"], certified: ["sample_case", "hazmat", "contsuit"],
    passive: { id: "handling_protocol", name: "Handling Protocol", desc: "In a sealed suit, carrying someone through SCP-610's flesh doesn't infect them, and taking a sample is always safe." },
    grade2: "A second sample case.", worldMap: "Sample recovery without cross-contamination.", tradeoff: "Bulky protection and sealed packaging slow them and get in the way of shooting." },
  heavyinf: { tags: ["can_anchor", "can_assault"], techs: ["sq_anchor", "sq_protected_advance"], certified: ["armor_heavy"],
    passive: { id: "load_management", name: "Load Management", desc: "Heavy plate costs them no movement." },
    grade2: "Reinforced load carriers: anchoring costs 1 action.", worldMap: "Assaults and defenses under armed opposition.", tradeoff: "Weight and cost; 1951 plate is not rifle-proof, and armor does nothing against hazards." },
  demolitions: { tags: ["can_breach_structural_wall", "can_clear_obstacle"], techs: ["sq_shaped_breach", "sq_safe_clearance"], certified: ["demo_charge", "breach_charge"],
    passive: { id: "charge_efficiency", name: "Charge Efficiency", desc: "Their charges don't hurt squadmates standing near the blast." },
    grade2: "A third demolition charge.", worldMap: "Opens fortified insertions; damages structures and secrecy.", tradeoff: "Noise and damage to the very structures you may need." },
  heavyweapons: { tags: ["can_emplace_mg", "can_suppress_lane"], techs: ["sq_emplace", "sq_pack", "sq_interdiction"], certified: ["bazooka", "law", "flamer"],
    passive: { id: "crew_drill", name: "Crew Drill", desc: "Emplacing the gun costs 1 action." },
    grade2: "Extra belts: emplaced guns reload as part of packing up.", worldMap: "Heavy support for assaults and defenses.", tradeoff: "Bulky, loud, ammunition-hungry; pinned in place while emplaced." },
  engineering: { tags: ["can_fortify", "can_restore_device"], techs: ["sq_field_fortify", "sq_restore"], certified: ["sandbags"],
    passive: { id: "workmanship", name: "Workmanship", desc: "Field fortify costs 1 action." },
    grade2: "A third load of sandbags.", worldMap: "Field fortification and infrastructure repair.", tradeoff: "Heavy material, setup time; repairs are not a containment solution." },
  infiltration: { tags: ["can_move_silently", "can_covert_access"], techs: ["sq_silent_approach", "sq_covert_access"], certified: ["darts"],
    passive: { id: "signature_discipline", name: "Signature Discipline", desc: "Their footsteps always carry 20% less far." },
    grade2: "Suppressors where historically available: fitted in the Armory as usual.", worldMap: "Covert intelligence and discreet extraction.", tradeoff: "Light armor and little firepower; daylight and sight lines still give them away." },
  surveillance: { tags: ["can_provide_sustained_observation", "can_confirm_target"], techs: ["sq_observation_post", "sq_confirm_target"], certified: ["camera", "tracker"],
    passive: { id: "watch_discipline", name: "Watch Discipline", desc: "Holding still in cover, they see 1 tile farther even without an observation post." },
    grade2: "Long-lens cameras: confirmed targets yield 2 Intel each.", worldMap: "Threat patterns and guard routines for later missions.", tradeoff: "Stationary and exposed; watching SCP-096 is as dangerous as it sounds." },
  tracking: { tags: ["can_read_evidence"], techs: ["sq_read_sign", "sq_mark_trail"], certified: ["field_tags", "tracker"],
    passive: { id: "scene_preservation", name: "Scene Preservation", desc: "Sign stays readable 2 turns longer for them." },
    grade2: "Field forensics: read sign also tells how long ago.", worldMap: "Narrows the search for escaped anomalies and missing people.", tradeoff: "Time spent reading the ground, exposed; trails can mislead." },
  forwardrecon: { tags: ["can_scout_route", "can_designate_insertion"], techs: ["sq_route_recon", "sq_designate_insertion"], certified: ["field_tags", "flare"],
    passive: { id: "advance_scout_drill", name: "Advance Scout Drill", desc: "Route recon also reveals hazards in its sight 2 tiles farther." },
    grade2: "A second set of field tags.", worldMap: "Route difficulty, insertion options and ambush hazards.", tradeoff: "Light loadout; route intelligence goes stale." },
};

/** MTF-level doctrine (design 26.2): one organizational passive each, scoped narrowly. */
export const DOCTRINES: Record<SpecId, { action: string; passive: string; tradeoff: string }> = {
  general: { action: "General incident response: investigates unknown incidents with no specialty needed.", passive: "Retraining between General Containment specialties takes 15% less time.", tradeoff: "Bio, assault and recon kit need outside support or another MTF." },
  bio: { action: "Quarantine assessment: a squad slows an outbreak on the World Map, using a cordon kit.", passive: "On SCP-610 missions, 20% chance a suit or cordon kit comes home unused.", tradeoff: "Suit preparation, filters and bulky kit." },
  heavy: { action: "Harden or break a position before an assault.", passive: "Emplacing a gun or fortifying costs 1 action at Drilled even without the squad passive (never below 1).", tradeoff: "Transport, maintenance, noise, collateral." },
  recon: { action: "Advance survey: a squad investigates an incident ahead of the response.", passive: "One extra Intel when a recon squad's observation or survey actually took place.", tradeoff: "Fragile under fire; finite sensors; can find a threat and still fail to contain it." },
};

/** Historical and organizational metadata for specialist equipment (design 26.4 / 26.7). Years are first Foundation
 *  issue in this game; the item stays usable forever after. */
export interface EquipMeta { year: number; grade: 0 | 1 | 2 | 3; specs?: SpecId[]; major?: boolean; note: string; }
export const EQUIP: Partial<Record<ItemId, EquipMeta>> = {
  breach_charge: { year: 1951, grade: 1, specs: ["general", "heavy"], major: true, note: "Small door charge of the 1940s pattern." },
  barricade: { year: 1951, grade: 1, specs: ["general", "bio", "heavy"], major: true, note: "Steel and timber portable barrier." },
  stretcher: { year: 1951, grade: 1, specs: ["general", "bio"], note: "Folding army litter and rescue straps." },
  cordon_kit: { year: 1951, grade: 1, specs: ["bio"], major: true, note: "Wire, stakes, tape and warning signs." },
  firebreak_kit: { year: 1951, grade: 1, specs: ["bio"], major: true, note: "Extinguishers, wet sacking and shovels." },
  decon_agent: { year: 1951, grade: 1, specs: ["bio"], major: true, note: "Hand-pumped wash rig and neutralizing solution." },
  sample_case: { year: 1951, grade: 1, specs: ["bio"], note: "Lead-sealed sample case with gaskets." },
  demo_charge: { year: 1951, grade: 1, specs: ["heavy"], major: true, note: "M2 block demolition charge with fuse." },
  sandbags: { year: 1951, grade: 0, specs: ["heavy", "general"], major: true, note: "Sandbags, pickets and a shovel." },
  field_tags: { year: 1951, grade: 0, specs: ["recon", "general"], note: "Marker tags, chalk and a field notebook." },
  flamer: { year: 1951, grade: 1, specs: ["bio", "heavy"], major: true, note: "M2 flamethrower (1943)." },
  bazooka: { year: 1951, grade: 1, specs: ["heavy"], major: true, note: "M20 recoilless rocket launcher (1950)." },
  law: { year: 1963, grade: 1, specs: ["heavy"], major: true, note: "M72 LAW (1963)." },
  tracker: { year: 1966, grade: 2, note: "Seismic intrusion sensor (Vietnam era)." },
  contsuit: { year: 1951, grade: 1, specs: ["bio", "general"], note: "Sealed rubberized suit with canister respirator." },
};

/** Techniques done by placing squad kit on a tile (through the item bar); the rest are on the ability bar. */
export const PLACED_TECH_IDS = ["sq_controlled_breach", "sq_perimeter", "sq_isolation_line", "sq_firebreak", "sq_decon_sweep", "sq_shaped_breach", "sq_field_fortify", "sq_designate_insertion", "sq_sealed_retrieval"];
export const TECH_ABILITIES = Object.values(TECHS).filter(t => !PLACED_TECH_IDS.includes(t.id));
