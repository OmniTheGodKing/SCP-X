// Research projects, SCP-173 tests and the equipment they unlock.
import { earn, spend } from "./ledger";
import { announceHire, fieldBoost, hasTrade, hirePerson, TRADE_CHANCE } from "./people";
import { countOperational, engineersFree } from "./base";
import { dateOf, log, yearOf, type Campaign } from "./campaign";
import { newsActive } from "./news";
import type { Guard } from "./security";
import { AMMO, ATTACHMENTS, WEAPON_TIERS, model, type AmmoId, type AttachmentId } from "../data/weapons";
import { cellWork, type ScpRecord } from "./containment";

export type Branch = "SCP-173" | "SCP-049" | "SCP-106" | "Objects" | "Insurgency" | "Personnel" | "Weapons" | "Equipment" | "Site" | "Breakthrough";
/** Things brought back from missions that some studies need (like XCOM autopsies). */
export type MaterialId = "ciWeapons" | "prisoners" | "intelTotal" | "tissue" | "survivors" | "outbreaks" | "charms";
export const MATERIALS: Record<MaterialId, string> = {
  ciWeapons: "Insurgency weapons recovered", prisoners: "Insurgents taken prisoner", intelTotal: "Intel gathered",
  tissue: "SCP-049-2 tissue samples", survivors: "people back from SCP-106's pocket dimension", outbreaks: "SCP-610 outbreaks seen", charms: "anomalous charms taken from the Insurgency",
};
export type TestId = "endurance" | "material" | "movement";
import type { ItemId } from "../game/types";
export type { ItemId };

export interface ProjectDef {
  name: string;
  branch: Branch;
  days: number;            // researcher-days
  cost: number;            // $k, paid when work starts
  needs?: string[];        // finished projects
  needsTest?: TestId;
  unlocks?: ItemId;
  /** Earliest year research can start (2 years before US service). */
  from?: number;
  /** Needs this anomaly held at Site-19. */
  needsScp?: string;
  /** Needs this much of something brought back from missions. */
  needsMaterial?: [MaterialId, number];
  /** Only offered now and then, and only for a while (War of the Chosen breakthroughs). */
  breakthrough?: boolean;
  /** Hidden until this many missions have been won (XCOM: research opens up as the war goes on). */
  afterWon?: number;
  /** Hidden until something has happened at least once (see Campaign.milestones). */
  afterMilestone?: Milestone;
  /** A weapon model this project makes available for refitting. */
  model?: string;
  attachment?: AttachmentId;
  armorTier?: number;
  weaponTier?: number;
  ammo?: AmmoId;
  desc: string;
}

/** Things that have happened at least once and open up research. */
export type Milestone = "power_failure" | "guard_veteran" | "insurgents" | "fire" | "raid";
export const MILESTONES: Record<Milestone, string> = {
  power_failure: "after the first power failure", guard_veteran: "once a guard has survived 3 breaches",
  insurgents: "after the first fight with the Chaos Insurgency", fire: "after the first fire on a mission", raid: "after the first raid on Site-19",
};

export const PROJECTS: Record<string, ProjectDef> = {
  blink_cadence:      { name: "Blink cadence protocol", branch: "SCP-173", days: 30, cost: 60, needsTest: "endurance", desc: "Staff are drilled to blink on a count. Everyone staring at SCP-173 blinks 2% less often." },
  movement_study:     { name: "Movement study", branch: "SCP-173", days: 40, cost: 80, needsTest: "movement", desc: "During missions, shows which room SCP-173 is in even when nobody can see it." },
  containment_rev:    { name: "Containment procedure revision", branch: "SCP-173", days: 40, cost: 80, needsTest: "material", desc: "SCP-173's breach risk −25%, and its cell gets dirty half as fast." },
  rapid_response:     { name: "Rapid response protocol", branch: "SCP-173", days: 30, cost: 50, needs: ["movement_study"], desc: "Epsilon-11 reaches a breach 5 turns sooner at every alert level." },
  ocular_lubricant:   { name: "Ocular lubricant", branch: "Personnel", days: 20, cost: 40, needsTest: "endurance", unlocks: "eyedrops", desc: "Unlocks eye drops: the carrier ignores one blink while staring." },
  selection_cadre:    { name: "Selection cadre", branch: "Personnel", days: 20, cost: 60, afterMilestone: "guard_veteran", desc: "A permanent cadre runs Epsilon-11 selection for Site Security. Guards who pass join as Privates First Class instead of Privates." },
  liaison_office:     { name: "Allied liaison office", branch: "Personnel", days: 30, cost: 80, afterWon: 3, desc: "Liaison officers with allied armies. The Dutch Korps Commandotroepen and the Philippine Scout Rangers (later the Belgian Paracommandos and the Norwegian naval commandos) lend people, and each month's pool has 2 more candidates." },
  joint_exchange:     { name: "Joint training exchange", branch: "Personnel", days: 40, cost: 100, afterWon: 6, needs: ["liaison_office"], desc: "Epsilon-11 trains alongside allied units. Veteran and Elite candidates turn up far more often." },
  trauma_counseling:  { name: "Trauma counseling", branch: "Personnel", days: 30, cost: 60, desc: "Operatives recover 3 more sanity on quiet turns during missions." },
  marksmanship:       { name: "Advanced marksmanship", branch: "Personnel", days: 30, cost: 60, afterWon: 2, desc: "+5 aim for every operative." },
  padded_jacket:      { name: "Padded combat jacket", branch: "Equipment", days: 20, cost: 40, desc: "A quilted jacket over the field uniform. Every operative gets +1 HP, armor slot or not." },
  nylon_liner:        { name: "Nylon ballistic liner", branch: "Equipment", days: 40, cost: 110, from: 1952, needs: ["padded_jacket"], desc: "Layers of ballistic nylon sewn into every uniform, as the Korean War vests used. Every operative gets +2 HP in all." },
  plated_undersuit:   { name: "Plated undersuit", branch: "Equipment", days: 60, cost: 200, from: 1955, needs: ["nylon_liner"], afterWon: 8, desc: "Overlapping plates worn under the uniform. Every operative gets +2 HP and 1 armor point, on top of any vest." },
  powered_harness:    { name: "Powered combat harness", branch: "Equipment", days: 90, cost: 320, from: 1965, needs: ["plated_undersuit"], needsTest: "material", desc: "A Foundation exoskeleton harness that carries the plate's weight. Every operative gets +3 HP and 1 armor point, on top of any vest." },
  body_armor:         { name: "M1951 flak vest", branch: "Equipment", days: 25, cost: 50, unlocks: "armor", armorTier: 1, desc: "Issue the Korean War flak vest: +2 HP and 1 armor point, which cuts the damage of every hit by 1." },
  m69_vest:           { name: "M69 fragmentation vest", branch: "Equipment", days: 60, cost: 180, from: 1967, needs: ["body_armor"], armorTier: 2, desc: "A lighter, stronger vest: +3 HP and 1 armor point. Every vest is refitted in the workshop." },
  ceramic_plate:      { name: "Foundation ceramic plate", branch: "Equipment", days: 90, cost: 300, needs: ["body_armor"], needsTest: "material", armorTier: 3, desc: "Ceramic armor developed from Site-19's materials work: +4 HP and 2 armor points. Every vest is refitted in the workshop." },
  frag:               { name: "M26 fragmentation grenade", branch: "Equipment", days: 15, cost: 30, unlocks: "frag", desc: "Unlocks frag grenades: 3 damage to everyone within a tile of the blast, and it destroys desks and other half cover." },
  flashbangs:         { name: "Foundation stun grenade", branch: "Equipment", days: 20, cost: 40, afterWon: 2, unlocks: "flashbang", desc: "A Foundation prototype decades ahead of its time. It blinds everyone in the blast, including anyone holding SCP-173." },
  smoke:              { name: "M18 smoke grenade", branch: "Equipment", days: 15, cost: 30, unlocks: "smoke", desc: "Unlocks smoke. It blocks sight for two turns, including sight of SCP-173." },
  motion_tracker:     { name: "Seismic intrusion sensor", branch: "Equipment", days: 50, cost: 140, from: 1966, unlocks: "tracker", desc: "A portable ground sensor of the kind fielded in Vietnam: the carrier detects anything within 6 tiles, through walls." },
  att_scope:          { name: "Telescopic sights", branch: "Weapons", days: 20, cost: 40, attachment: "scope", desc: "Weapon attachment: +5 aim." },
  att_trigger:        { name: "Match trigger groups", branch: "Weapons", days: 25, cost: 50, afterWon: 4, attachment: "trigger", desc: "Weapon attachment: +10% crit." },
  att_extmag:         { name: "Extended magazines", branch: "Weapons", days: 20, cost: 40, afterWon: 2, attachment: "extmag", desc: "Weapon attachment: +1 round." },
  att_stock:          { name: "Padded stocks", branch: "Weapons", days: 20, cost: 40, afterWon: 2, attachment: "stock", desc: "Weapon attachment: a miss still does 1 damage." },
  w_m60:              { name: "M60 machine gun", branch: "Weapons", days: 70, cost: 210, from: 1955, model: "m60", desc: "Replaces the BAR: 5–6 damage, 5 rounds." },
  w_m14:              { name: "M14 rifle", branch: "Weapons", days: 70, cost: 210, from: 1957, model: "m14", desc: "Replaces the M1 Garand: 4–6 damage, 5 rounds." },
  w_m16:              { name: "M16 rifle", branch: "Weapons", days: 80, cost: 240, from: 1962, needs: ["w_m14"], model: "m16", desc: "Replaces the M14: 4–6 damage, 6 rounds, +5 aim." },
  w_r870:             { name: "Remington 870", branch: "Weapons", days: 50, cost: 150, from: 1964, model: "r870", desc: "Replaces the trench gun: 5–7 damage, 4 rounds." },
  w_xm177:            { name: "XM177 carbine", branch: "Weapons", days: 60, cost: 180, from: 1964, model: "xm177", desc: "Replaces the M2 Carbine: 4–5 damage, +5 aim." },
  w_m45:              { name: "Carl Gustaf m/45", branch: "Weapons", days: 50, cost: 150, from: 1964, model: "m45", desc: "Replaces the M3 Grease Gun: 3–4 damage, 6 rounds, +5 aim." },
  w_m21:              { name: "M21 marksman rifle", branch: "Weapons", days: 80, cost: 240, from: 1967, needs: ["w_m14"], model: "m21", desc: "Replaces the Springfield: 5–7 damage, 4 rounds, +5 aim." },
  powered_jack:       { name: "Powered pallet jack", branch: "Equipment", days: 25, cost: 50, needsTest: "material", desc: "Operatives can drag SCP-173 2 tiles instead of 1." },
  reinforced_doors:   { name: "Reinforced cell doors", branch: "Site", days: 40, cost: 100, needs: ["containment_rev"], desc: "Breach risk −20% in every containment wing." },
  early_warning:      { name: "Early warning sensors", branch: "Site", days: 30, cost: 80, needs: ["movement_study"], desc: "A hatch lockdown holds for 8 turns instead of 5." },
  c119:               { name: "C-119 Flying Boxcar", branch: "Site", days: 40, cost: 120, desc: "A faster transport for Epsilon-11. Travel to other regions takes a quarter less time." },
  c130:               { name: "C-130 Hercules", branch: "Site", days: 60, cost: 180, from: 1954, needs: ["c119"], desc: "A long-range turboprop transport. Travel to other regions takes half the time a C-47 would." },
  pestilence_theory:  { name: "Pestilence theory", branch: "SCP-049", days: 30, cost: 60, needsScp: "049", desc: "Interviews with SCP-049 about the \"Pestilence\" it claims to see. Calming it holds for two turns instead of one." },
  necrotic_study:     { name: "Necrotic tissue study", branch: "SCP-049", days: 40, cost: 80, needsScp: "049", needsMaterial: ["tissue", 1], desc: "Autopsies on SCP-049-2 tissue lead to better wound care. Operatives and guards heal 1 HP a day faster." },
  keter_containment:  { name: "Keter-grade containment", branch: "Site", days: 50, cost: 150, afterWon: 6, desc: "Designs for cells that can hold the worst anomalies: lead-lined, suspended, and wired for electromagnets. Keter-grade wings can be built." },
  em_containment:     { name: "Electromagnetic containment", branch: "SCP-106", days: 40, cost: 120, needsScp: "106", needs: ["keter_containment"], desc: "Electromagnets around SCP-106's cell hold it in place. Its breach risk drops by 30%." },
  pocket_study:       { name: "Pocket dimension study", branch: "SCP-106", days: 50, cost: 120, needsScp: "106", needsMaterial: ["survivors", 1], desc: "Interviews with the few who came back map parts of the pocket dimension. People SCP-106 takes come back half the time instead of a quarter." },
  // ---- Safe-class objects that come to Site-19 by transfer ----
  panacea_assay:      { name: "Panacea assay", branch: "Objects", days: 25, cost: 50, needsScp: "500", desc: "SCP-500 can't be copied, but half a pill works as well as a whole one. Each pill treats two operatives." },
  very_fine:          { name: "The \"Very Fine\" setting", branch: "Objects", days: 30, cost: 60, needsScp: "914", desc: "Careful tests of SCP-914's highest setting. More it can refine, and it fails 1 time in 10 instead of 1 in 5." },
  lock_studies:       { name: "Lock studies", branch: "Objects", days: 30, cost: 60, needsScp: "005", desc: "What SCP-005 shows about how locks fail. Locating an Insurgency cell takes 1 less Intel." },
  // ---- the research expansion ----
  psych_screening:    { name: "Psychological screening", branch: "Personnel", days: 30, cost: 70, afterWon: 4, desc: "Better selection and preparation. Operatives get +10 max sanity, and a quarter of new recruits arrive Steady." },
  field_medicine:     { name: "Field medicine", branch: "Personnel", days: 30, cost: 60, afterWon: 2, desc: "Medkits heal 4 instead of 3, and a stabilized operative gets back on their feet at 1 HP." },
  field_radios:       { name: "SCR-300 field radios", branch: "Equipment", days: 30, cost: 60, desc: "Backpack radios tie Site Security to Epsilon-11. Epsilon-11 reaches breaches 3 turns sooner, and overwatch shots lose only 10 aim." },
  prc25:              { name: "AN/PRC-25 radios", branch: "Equipment", days: 40, cost: 120, from: 1962, needs: ["field_radios"], desc: "Lighter radios with better range. Epsilon-11 reaches breaches 2 more turns sooner." },
  night_optics:       { name: "AN/PVS-2 night optics", branch: "Equipment", days: 50, cost: 150, from: 1962, desc: "Starlight scopes. Operatives see 2 tiles farther." },
  classb_amnestics:   { name: "Class-B amnestics", branch: "Site", days: 40, cost: 90, afterWon: 3, desc: "A stronger, more targeted formula. Cover stories need 1 dose instead of 2, and amnestics labs make twice as many." },
  auto_cleaning:      { name: "Automated cell cleaning", branch: "Site", days: 40, cost: 120, from: 1960, desc: "Remote scrubbing arms do the work. Cleanings no longer put D-Class at risk." },
  cell_lock:          { name: "Cell lock override", branch: "Site", days: 30, cost: 70, afterWon: 2, desc: "The D-Class block stays locked when the breach alarm cuts the power. Only one D-Class gets loose in a breach instead of four." },
  front_accounting:   { name: "Front company accounting", branch: "Site", days: 30, cost: 80, desc: "The fronts learn to hide more money. +10% funding from every region that hasn't collapsed." },
  sigint:             { name: "Signals intelligence", branch: "Site", days: 40, cost: 100, afterWon: 4, desc: "Listening posts pick up Insurgency traffic. +1 Intel a month." },
  interrogation:      { name: "Interrogation techniques", branch: "Insurgency", days: 30, cost: 60, needsMaterial: ["prisoners", 1], desc: "Prisoners give up Intel twice as fast." },
  charm_study:        { name: "Anomalous charms", branch: "Insurgency", days: 35, cost: 90, needsMaterial: ["charms", 1], unlocks: "ward", desc: "What the Insurgency sews into its charms, and how to make our own. The workshop can build warding charms: the first round that would hit the carrier is turned aside." },
  codebooks:          { name: "Insurgency codebooks", branch: "Insurgency", days: 30, cost: 70, needsMaterial: ["intelTotal", 5], desc: "Locating a cell costs 2 Intel instead of 3, and incidents show exactly how many Insurgents to expect." },
  weapon_analysis:    { name: "Captured weapon analysis", branch: "Insurgency", days: 30, cost: 70, needsMaterial: ["ciWeapons", 3], desc: "Knowing their guns means knowing where armor helps. Insurgents get −5 aim against operatives wearing armor." },
  // ---- weapons: tiers, the M79, special ammunition and attachments ----
  foundation_arms:    { name: "Foundation special issue", branch: "Weapons", days: 50, cost: 200, needs: ["weapon_analysis"], weaponTier: 2, desc: "Foundation armorers hand-fit every weapon, using what was learned from Insurgency guns. All weapons: +1 damage, +5 aim. Refit in the workshop." },
  coil_weapons:       { name: "Electromagnetic coil weapons", branch: "Weapons", days: 90, cost: 350, needs: ["foundation_arms", "em_containment"], weaponTier: 3, desc: "SCP-106's electromagnets, scaled down to a rifle. All weapons: +2 damage, +5 aim, and every hit ignores 1 armor point. Refit in the workshop." },
  m79:                { name: "M79 grenade launcher", branch: "Weapons", days: 40, cost: 120, from: 1959, desc: "Grenadiers fire grenades 4 tiles farther." },
  ammo_ap:            { name: "Armor-piercing rounds", branch: "Weapons", days: 25, cost: 60, afterMilestone: "insurgents", afterWon: 5, ammo: "ap", desc: "Special ammunition: hits ignore 1 armor point. Built in the workshop, loaded on the Personnel tab." },
  ammo_tracer:        { name: "Tracer rounds", branch: "Weapons", days: 20, cost: 40, afterWon: 4, ammo: "tracer", desc: "Special ammunition: +10 aim on overwatch shots." },
  ammo_hollow:        { name: "Hollow-point rounds", branch: "Weapons", days: 25, cost: 50, afterWon: 4, ammo: "hollow", desc: "Special ammunition: critical hits do 1 more damage." },
  ammo_sedative:      { name: "Sedative rounds", branch: "Weapons", days: 35, cost: 80, afterWon: 6, ammo: "sedative", desc: "Foundation special ammunition: Insurgents, civilians and loose D-Class brought to 0 HP are knocked out instead of killed." },
  att_suppressor:     { name: "Suppressors", branch: "Weapons", days: 25, cost: 50, afterWon: 5, attachment: "suppressor", desc: "Weapon attachment: shots make no noise." },
  att_bayonet:        { name: "Bayonets", branch: "Weapons", days: 15, cost: 20, attachment: "bayonet", desc: "Weapon attachment: a sure 3-damage thrust against an adjacent enemy, using no ammo." },
  att_sights:         { name: "Improved sights", branch: "Weapons", days: 30, cost: 70, needs: ["att_scope"], attachment: "sights", desc: "Weapon attachment: +10 aim." },
  // ---- armor and kit ----
  light_armor:        { name: "Recon smocks", branch: "Equipment", days: 20, cost: 40, afterWon: 3, needs: ["body_armor"], unlocks: "armor_light", desc: "Light armor: less protection, +1 move." },
  heavy_armor:        { name: "Heavy plate", branch: "Equipment", days: 30, cost: 70, afterWon: 3, needs: ["body_armor"], unlocks: "armor_heavy", desc: "Heavy armor: +2 HP and +1 armor point over the vest, −1 move, and it carries heavy weapons." },
  hazmat_suit:        { name: "Hazmat suits", branch: "Equipment", days: 25, cost: 50, afterWon: 2, unlocks: "hazmat", desc: "Sealed suits. SCP-106's rot does nothing to the wearer." },
  lead_suit:          { name: "Lead-lined suits", branch: "SCP-106", days: 40, cost: 120, needsScp: "106", needs: ["hazmat_suit"], unlocks: "leadsuit", desc: "SCP-106 needs to hold the wearer for two turns to drag them under." },
  m20:                { name: "M20 super bazooka", branch: "Weapons", days: 30, cost: 80, needs: ["heavy_armor"], unlocks: "bazooka", desc: "Heavy weapon for heavy armor: 5 damage in a blast, out to 10 tiles." },
  m72:                { name: "M72 LAW", branch: "Weapons", days: 30, cost: 100, from: 1961, needs: ["m20"], unlocks: "law", desc: "A light one-shot rocket: 4 damage in a blast, out to 8 tiles. Cheaper to build." },
  flares:             { name: "M127 signal flares", branch: "Equipment", days: 10, cost: 20, unlocks: "flare", desc: "Throwable flares that light a 2-tile radius for 3 turns on night missions. Throwing one gives the team away." },
  incendiaries:       { name: "M14 incendiary grenades", branch: "Equipment", days: 20, cost: 50, afterMilestone: "fire", unlocks: "incendiary", desc: "Thermite grenades that set an area alight." },
  ammo_incendiary:    { name: "Incendiary rounds", branch: "Weapons", days: 25, cost: 60, afterMilestone: "fire", ammo: "incendiary", desc: "Special ammunition: hits set the target's tile alight for a turn." },
  m2_flamer:          { name: "M2 flamethrower", branch: "Weapons", days: 40, cost: 120, needs: ["heavy_armor"], unlocks: "flamer", desc: "Heavy weapon for heavy armor: a jet of burning fuel. The surest way to burn out SCP-610." },
  containment_suit:   { name: "Containment suits", branch: "Equipment", days: 35, cost: 120, needsMaterial: ["outbreaks", 1], unlocks: "contsuit", desc: "Sealed suits for working on SCP-610's flesh. A blow from an instance can still tear one." },
  medkits:            { name: "Field medkits", branch: "Equipment", days: 15, cost: 30, unlocks: "medkit", desc: "A medkit anyone can use once: heal themselves or an adjacent ally." },
  cs_gas:             { name: "CS gas grenades", branch: "Equipment", days: 20, cost: 40, afterWon: 2, unlocks: "csgas", desc: "Tear gas: −30 aim for Insurgents and civilians caught in it." },
  field_camera:       { name: "Field cameras", branch: "Equipment", days: 20, cost: 40, afterWon: 2, unlocks: "camera", desc: "Photograph an anomaly mid-mission; the film speeds up research on it." },
  restraint_kit:      { name: "Restraint kit", branch: "Equipment", days: 20, cost: 40, needsMaterial: ["prisoners", 1], unlocks: "restraints", desc: "Secure from 2 tiles, and each prisoner yields 1 more Intel." },
  amnestic_darts:     { name: "Amnestic darts", branch: "Equipment", days: 30, cost: 70, afterWon: 4, unlocks: "darts", desc: "A dart pistol loaded with amnestics: Dose witnesses from up to 4 tiles." },
  guard_rifles:       { name: "Guard rifles", branch: "Equipment", days: 25, cost: 60, afterMilestone: "insurgents", desc: "Site Security is issued the squad's current service rifle instead of carbines." },
  perimeter_alarms:   { name: "Perimeter alarms", branch: "Site", days: 30, cost: 80, afterMilestone: "raid", desc: "Tripwires and floodlights on the wire. In a raid, Site Security starts in position on overwatch, and Epsilon-11 comes up the lift 2 turns sooner." },
  guard_vests:        { name: "Guard flak vests", branch: "Equipment", days: 25, cost: 60, needs: ["body_armor"], desc: "Site Security gets vests too: +1 HP and 1 armor point for every guard. Refit in the workshop." },
  // ---- breakthroughs: offered now and then, for 30 days ----
  bt_barrels:         { name: "Breakthrough: lapped barrels", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "Service rifles do +1 damage." },
  bt_drills:          { name: "Breakthrough: drill instructors", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "The training range runs drills twice a week: drill XP comes twice as fast (still never past Private First Class)." },
  bt_security:        { name: "Breakthrough: security contracts", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "Security stations cost nothing to run." },
  bt_guard_aim:       { name: "Breakthrough: range qualification", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "Guards get +5 aim." },
  bt_triage:          { name: "Breakthrough: triage protocol", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "Everyone heals 1 more HP a day." },
  bt_cold_storage:    { name: "Breakthrough: cold storage", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "Each amnestics lab stores 5 more doses." },
  bt_jigs:            { name: "Breakthrough: production jigs", branch: "Breakthrough", days: 10, cost: 30, breakthrough: true, desc: "Workshop items cost half as much." },
  efficient_gen:      { name: "Turbocharged diesels", branch: "Site", days: 30, cost: 70, desc: "Generators can be refitted with turbochargers (from each generator's panel): 15 power instead of 10." },
  twin_diesel:        { name: "Twin diesel sets", branch: "Site", days: 25, cost: 70, needs: ["efficient_gen"], desc: "A second engine on the same bed. Turbocharged generators can be refitted as twin sets: 20 power, $2k more upkeep a month." },
  gas_turbine:        { name: "Gas turbine generators", branch: "Site", days: 40, cost: 120, from: 1952, needs: ["twin_diesel"], desc: "Twin diesel sets can be refitted as gas turbines: 28 power, $5k more upkeep a month." },
  compact_reactor:    { name: "Compact reactor", branch: "Site", days: 70, cost: 250, from: 1957, needs: ["gas_turbine"], desc: "A small pressurised-water reactor, after the Army's SM-1. Gas turbines can be refitted as reactors: 40 power, $12k more upkeep a month." },
  reactor_uprate:     { name: "Reactor uprate", branch: "Site", days: 60, cost: 220, from: 1962, needs: ["compact_reactor"], desc: "Better fuel and a bigger core, as the Army's later plants had. Reactors can be uprated: 55 power, $15k upkeep a month over a diesel." },
  backup_gen:         { name: "Backup generators", branch: "Site", days: 25, cost: 60, afterMilestone: "power_failure", desc: "Containment wings get their own backup supply: a power shortage no longer doubles breach risk or lets cells fail." },
};

export interface TestDef { name: string; cost: number; days: number; risk: number; breach: number; dclass: number; desc: string; notes: string[]; }
export const TESTS: Record<TestId, TestDef> = {
  endurance: { name: "Observation endurance test", cost: 20, days: 5, risk: 1, breach: 0, dclass: 1, notes: ["blink", "mind"],
    desc: "Staff take turns holding SCP-173's gaze while a D-Class sits in the cell. Measures how long people can stare before they slip." },
  material:  { name: "Material analysis", cost: 30, days: 8, risk: 2, breach: 0.05, dclass: 1, notes: ["arms"],
    desc: "A D-Class scrapes samples from its surface while it is watched. Close contact doubles the danger." },
  movement:  { name: "Controlled movement trial", cost: 50, days: 12, risk: 4, breach: 0.2, dclass: 2, notes: ["hunt", "hear"],
    desc: "Everyone blinks on purpose while two D-Class stand at marked distances, and the team measures how far it gets. Dangerous, and it can end in a breach." },
};

export interface ItemDef { name: string; cost: number; days: number; uses: number | null; armor?: boolean; desc: string; }
/** What each armor gives at the researched vest tier: light, medium and heavy versions, and the special suits. */
export function armorStats(kind: ItemId, tier: number) {
  const t = ARMOR_TIERS[Math.max(1, tier)];
  switch (kind) {
    case "armor_light": return { hp: Math.max(1, t.hp - 1), points: Math.max(0, t.points - 1), move: 1 };
    case "armor_heavy": return { hp: t.hp + 2, points: t.points + 1, move: -1 };
    case "hazmat": return { hp: 1, points: 0, move: 0 };
    case "leadsuit": return { hp: t.hp, points: t.points, move: -1 };
    case "contsuit": return { hp: 1, points: 1, move: -1 };
    default: return { hp: t.hp, points: t.points, move: 0 };
  }
}
export const ARMOR_KINDS: ItemId[] = ["armor_light", "armor", "armor_heavy", "hazmat", "leadsuit", "contsuit"];
export const ITEMS: Record<ItemId, ItemDef> = {
  armor:     { name: "Flak vest", cost: 60, days: 4, uses: null, armor: true, desc: "Medium armor. Its protection depends on the vest model researched." },
  armor_light: { name: "Recon smock", cost: 50, days: 3, uses: null, armor: true, desc: "Light armor: 1 HP less and 1 armor point less than the vest, but +1 move." },
  armor_heavy: { name: "Heavy plate", cost: 90, days: 5, uses: null, armor: true, desc: "Heavy armor: +2 HP and +1 armor point over the vest, −1 move. The only armor that can carry a heavy weapon." },
  hazmat:    { name: "Hazmat suit", cost: 60, days: 4, uses: null, armor: true, desc: "+1 HP. SCP-106's rot does nothing to the wearer." },
  leadsuit:  { name: "Lead-lined suit", cost: 120, days: 6, uses: null, armor: true, desc: "Vest protection, −1 move. SCP-106 needs to hold the wearer for two turns to take them." },
  contsuit:  { name: "Containment suit", cost: 100, days: 5, uses: null, armor: true, desc: "Sealed against SCP-610: safe to stand on its flesh. Every blow from an instance has a 60% chance to tear it, infecting the wearer. 1 armor, −1 move." },
  incendiary: { name: "M14 incendiary grenade", cost: 20, days: 1, uses: 1, desc: "Sets everything within 1 tile of where it lands alight for 3 turns." },
  flamer:    { name: "M2 flamethrower", cost: 60, days: 3, uses: 3, desc: "Heavy weapon (heavy armor only), 3 bursts: sets a line out to 4 tiles and the tiles around its end alight, 3 damage (6 to SCP-610)." },
  csgas:     { name: "CS gas grenade", cost: 15, days: 1, uses: 1, desc: "Insurgents and civilians within 1 tile of where it lands get −30 aim until the end of next turn." },
  bazooka:   { name: "M20 bazooka", cost: 40, days: 2, uses: 1, desc: "Heavy weapon (heavy armor only): 5 damage within 1 tile of where it hits, out to 10 tiles; destroys half cover." },
  law:       { name: "M72 LAW", cost: 30, days: 2, uses: 1, desc: "Heavy weapon (heavy armor only): 4 damage within 1 tile of where it hits, out to 8 tiles; destroys half cover." },
  flare:     { name: "Signal flare", cost: 5, days: 1, uses: 2, desc: "Night missions: lights everything within 2 tiles of where it lands for 3 turns." },
  medkit:    { name: "Medkit", cost: 15, days: 1, uses: 1, desc: "1 action: heals the carrier or an adjacent ally." },
  camera:    { name: "Field camera", cost: 30, days: 2, uses: 1, desc: "1 action: photograph an anomaly in sight. The film counts toward research on it." },
  restraints: { name: "Restraint kit", cost: 25, days: 2, uses: null, desc: "Secure from 2 tiles away, and every prisoner taken yields 1 more Intel." },
  darts:     { name: "Amnestic dart pistol", cost: 30, days: 2, uses: null, desc: "Dose witnesses from up to 4 tiles away, in sight." },
  eyedrops:  { name: "Eye drops", cost: 10, days: 1, uses: 1, desc: "Ignores one blink while staring." },
  frag:      { name: "M26 frag grenade", cost: 15, days: 1, uses: 1, desc: "3 damage within 1 tile of where it lands; destroys half cover." },
  flashbang: { name: "Stun grenade", cost: 15, days: 1, uses: 1, desc: "Blinds everyone within 1 tile of where it lands until the next turn." },
  smoke:     { name: "M18 smoke grenade", cost: 10, days: 1, uses: 1, desc: "Blocks sight within 1 tile of where it lands for two turns." },
  ward:      { name: "Warding charm", cost: 60, days: 3, uses: 1, desc: "Copied from the Insurgency's charms: the first round that would hit the carrier is turned aside. Used up when it works." },
  tracker:   { name: "Seismic sensor", cost: 50, days: 3, uses: null, desc: "Detects anything within 6 tiles, through walls." },
};
/** Vest protection by researched tier. */
export const ARMOR_TIERS = [
  { name: "None", hp: 0, points: 0 },
  { name: "M1951 flak vest", hp: 2, points: 1 },
  { name: "M69 fragmentation vest", hp: 3, points: 1 },
  { name: "Foundation ceramic plate", hp: 4, points: 2 },
];
export const armorOf = (c: Campaign) => ARMOR_TIERS[c.armorTier] || ARMOR_TIERS[1];
/** The uniform every operative wears under whatever armor they're issued (XCOM's armor line): each researched tier
 *  applies to the whole squad at once, on top of the vest. */
export const UNIFORMS = [
  { id: "", name: "Army field uniform", hp: 0, points: 0 },
  { id: "padded_jacket", name: "Padded combat jacket", hp: 1, points: 0 },
  { id: "nylon_liner", name: "Nylon ballistic liner", hp: 2, points: 0 },
  { id: "plated_undersuit", name: "Plated undersuit", hp: 2, points: 1 },
  { id: "powered_harness", name: "Powered combat harness", hp: 3, points: 1 },
];
export const uniformOf = (c: Campaign) => [...UNIFORMS].reverse().find(u => !u.id || has(c, u.id))!;

export interface ResearchState {
  done: string[];
  paid: string[];
  progress: Record<string, number>;
  assigned: Record<string, number>;
  tests: TestId[];
  /** Projects the player has already been told about. */
  seen?: string[];
  /** The test under way: its D-Class are already in holding for it, and these guards will watch the cell work. */
  testing?: { id: TestId; watchers: string[] };
  /** A breakthrough on offer, and a project inspired to take half the time, each until a day. */
  offer?: { id: string; until: number };
  inspired?: { id: string; until: number };
}
export interface Order { item?: ItemId; attachment?: AttachmentId; ammo?: AmmoId; refit?: string; daysLeft: number; }
export const REFIT = { cost: 100, days: 7 };

export const newResearch = (): ResearchState => ({ done: [], paid: [], progress: {}, assigned: {}, tests: [] });
export const has = (c: Campaign, id: string) => c.research.done.includes(id);
export const RESEARCHER_COST = 50;
/** Council research grants (Phase 4E) for finishing anomaly, object and Insurgency work, and breakthroughs. */
export const RESEARCH_GRANT = { anomaly: 25, breakthrough: 40 };
export const researchGrant = (id: string) => { const p = PROJECTS[id]; return p.breakthrough ? RESEARCH_GRANT.breakthrough : /^SCP-|Objects|Insurgency/.test(p.branch) ? RESEARCH_GRANT.anomaly : 0; };
export const researcherCapacity = (c: Campaign) => countOperational(c, "lab") * 4;
export const researchersAssigned = (c: Campaign) => Object.values(c.research.assigned).reduce((a, n) => a + n, 0);
export const researchersFree = (c: Campaign) => c.researchers - researchersAssigned(c);
export const unlockedItems = (c: Campaign) => Object.entries(PROJECTS).filter(([id, p]) => p.unlocks && has(c, id)).map(([, p]) => p.unlocks!);

/** Researcher-days a project needs: halved while inspired, or once started under an inspiration. */
export const testKey = (t: TestId) => `test_${t}`;
const testOf = (key: string) => key.startsWith("test_") ? key.slice(5) as TestId : null;

export function projectDays(c: Campaign, id: string) {
  const t = testOf(id);
  if (t) return TESTS[t].days;
  const i = c.research.inspired, p = PROJECTS[id];
  const days = i?.id === id ? Math.ceil(p.days / 2) : p.days;
  return p.branch === "Weapons" && newsActive(dateOf(c.day), "tonkin") ? Math.ceil(days * 0.8) : days;
}
/** What a project costs to start: 10% less in the year after Sputnik. */
export const projectCost = (c: Campaign, id: string) => Math.round(PROJECTS[id].cost * (newsActive(dateOf(c.day), "sputnik") ? 0.9 : 1));
export const offered = (c: Campaign, id: string) => c.research.offer?.id === id || c.research.paid.includes(id);

/** Whether a project shows on the research list at all: everything behind it has to be in place first. Projects
 *  that need material show once the first of it is brought back, with the rest still to collect. */
export function projectVisible(c: Campaign, id: string) {
  const p = PROJECTS[id], r = c.research;
  if (has(c, id) || r.paid.includes(id) || (r.progress[id] ?? 0) > 0) return true;
  if (p.breakthrough) return offered(c, id);
  if ((p.needs ?? []).some(n => !has(c, n))) return false;
  if (p.needsTest && !r.tests.includes(p.needsTest)) return false;
  if (p.needsScp && !c.scps.some(s => s.id === p.needsScp)) return false;
  if (p.needsMaterial && (c.materials[p.needsMaterial[0]] ?? 0) < 1) return false;
  if (p.from && yearOf(c.day) < p.from) return false;
  if (p.afterWon && c.stats.won < p.afterWon) return false;
  if (p.afterMilestone && !(c.milestones ?? []).includes(p.afterMilestone) && !(p.afterMilestone === "fire" && (c.materials.outbreaks ?? 0) > 0)) return false;
  return true;
}
/** An anomaly's path through Site-19: recovered, contained, studied, put to use. */
export function anomalyProgress(c: Campaign, id: string) {
  const s = c.scps.find(x => x.id === id);
  const projects = Object.keys(PROJECTS).filter(p => !PROJECTS[p].breakthrough && (PROJECTS[p].branch === `SCP-${id}` || PROJECTS[p].needsScp === id));
  const done = projects.filter(p => has(c, p));
  return {
    recovered: !!s, contained: s?.status === "contained" || s?.status === "breach",
    projects: projects.map(p => ({ id: p, name: PROJECTS[p].name, done: has(c, p), visible: projectVisible(c, p), desc: PROJECTS[p].desc })),
    studied: done.length, total: projects.length,
  };
}

/** Record that something happened; research it opens appears on the next day's tick. */
export function reachMilestone(c: Campaign, m: Milestone) { if (!(c.milestones ??= []).includes(m)) c.milestones.push(m); }
/** New projects that have just become visible get a notice, as in XCOM. The first call only takes stock. */
function announceResearch(c: Campaign) {
  const r = c.research, now = Object.keys(PROJECTS).filter(id => !PROJECTS[id].breakthrough && projectVisible(c, id));
  if (!r.seen) { r.seen = now; return; }
  const fresh = now.filter(id => !r.seen!.includes(id));
  if (!fresh.length) return;
  r.seen.push(...fresh);
  log(c, `New research available: ${fresh.map(id => PROJECTS[id].name).join(", ")}.`, "good", "research");
}

export function projectLock(c: Campaign, id: string): string | null {
  const p = PROJECTS[id];
  if (p.breakthrough && !offered(c, id)) return "Not on offer.";
  if (p.needsMaterial) {
    const [m, n] = p.needsMaterial, got = c.materials[m] ?? 0;
    if (got < n) return `Needs ${n} ${MATERIALS[m]} (${got} so far).`;
  }
  if (p.from && yearOf(c.day) < p.from) return `Available from ${p.from}.`;
  if (p.needsScp && !c.scps.some(s => s.id === p.needsScp)) return `Needs ${p.needsScp === "049" ? "SCP-049" : p.needsScp === "106" ? "SCP-106" : p.needsScp} held at Site-19.`;
  if (p.needsTest && !c.research.tests.includes(p.needsTest)) return `Needs the ${TESTS[p.needsTest].name.toLowerCase()}.`;
  const missing = (p.needs || []).filter(n => !has(c, n));
  if (missing.length) return `Needs ${missing.map(n => PROJECTS[n].name).join(", ")}.`;
  return null;
}

/** Move one researcher onto (+1) or off (−1) a project. The project's cost is paid when work first starts. */
export function assign(c: Campaign, id: string, delta: 1 | -1): string | null {
  const r = c.research, cur = r.assigned[id] || 0;
  if (delta < 0) { if (cur > 0) r.assigned[id] = cur - 1; return null; }
  if (testOf(id)) {
    if (r.testing?.id !== testOf(id)) return "That test isn't under way.";
    if (researchersFree(c) < 1) return "No free researchers.";
    r.assigned[id] = cur + 1;
    return null;
  }
  if (has(c, id)) return "Already finished.";
  const lock = projectLock(c, id);
  if (lock) return lock;
  if (researchersFree(c) < 1) return countOperational(c, "lab") ? "No free researchers. Hire more or move one off another project." : "Build a research lab and hire researchers first.";
  if (!r.paid.includes(id)) {
    if (c.funds < projectCost(c, id)) return `Needs $${projectCost(c, id)}k to start.`;
    spend(c, projectCost(c, id), "research", PROJECTS[id].name);
    r.paid.push(id);
    log(c, `Research started: ${PROJECTS[id].name}.`);
  }
  r.assigned[id] = cur + 1;
  return null;
}

export const canHireResearcher = (c: Campaign) =>
  c.funds < RESEARCHER_COST ? `Needs $${RESEARCHER_COST}k.` : c.researchers >= researcherCapacity(c) ? (researcherCapacity(c) ? "The labs are full. Build another research lab." : "Build a research lab first.") : null;
export function hireResearcher(c: Campaign) {
  if (canHireResearcher(c)) return;
  spend(c, RESEARCHER_COST, "hiring", "Researcher hired");
  announceHire(c, hirePerson(c, "researcher"));
}

/** One day of research and workshop production. */
export function tickResearch(c: Campaign) {
  const r = c.research;
  announceResearch(c);
  // researchers beyond lab space (a lab was damaged) stop working on the newest assignments
  while (researchersAssigned(c) > Math.min(c.researchers, researcherCapacity(c))) {
    const k = Object.keys(r.assigned).reverse().find(k => r.assigned[k] > 0)!;
    r.assigned[k]--;
  }
  for (const [id, n] of Object.entries(r.assigned)) {
    if (!n) continue;
    r.progress[id] = (r.progress[id] || 0) + n * (testOf(id) ? 1 : fieldBoost(c, PROJECTS[id].branch));
    if (testOf(id)) { if (r.progress[id] >= projectDays(c, id)) finishTest(c, testOf(id)!); continue; }
    if (r.progress[id] >= projectDays(c, id)) {
      r.done.push(id); delete r.assigned[id];
      if (r.inspired?.id === id) r.inspired = undefined;
      if (id === "psych_screening") for (const o of c.roster) o.sanBonus = 10;
      if (r.offer?.id === id) r.offer = undefined;
      const p = PROJECTS[id], u = p.unlocks;
      // the Council funds what Site-19 learns about anomalies and the Insurgency, and pays more for breakthroughs
      const rg = researchGrant(id);
      if (rg) earn(c, rg, "grants", `Council research grant: ${p.name}`);
      const next = u ? ` ${ITEMS[u].name} can now be built in the workshop.` : p.model || (p.armorTier ?? 0) > 1 ? " Refit the squad in the workshop." : p.attachment ? ` ${ATTACHMENTS[p.attachment].name} can now be built in the workshop.` : "";
      if (p.armorTier === 1) c.armorTier = Math.max(c.armorTier, 1);
      log(c, `Research complete: ${p.name}.${next}`, "good", "research");
    }
  }
  const working = countOperational(c, "workshop") > 0;
  for (const o of [...c.orders]) {
    if (o.daysLeft > 1 && hasTrade(c, "machinist") && Math.random() < TRADE_CHANCE) o.daysLeft--;
    if (!working) break;
    if (--o.daysLeft <= 0) {
      c.orders = c.orders.filter(x => x !== o);
      if (o.item) {
        c.inventory[o.item] = (c.inventory[o.item] || 0) + 1;
        log(c, `Workshop: ${ITEMS[o.item].name} ready.`, "good", "research");
      } else if (o.attachment) {
        c.attachments[o.attachment] = (c.attachments[o.attachment] || 0) + 1;
        log(c, `Workshop: ${ATTACHMENTS[o.attachment].name} ready. Fit it on the Personnel tab.`, "good", "research");
      } else if (o.ammo) {
        c.ammo[o.ammo] = (c.ammo[o.ammo] || 0) + 1;
        log(c, `Workshop: a load of ${AMMO[o.ammo].name.toLowerCase()} is ready. Load it on the Personnel tab.`, "good", "research");
      } else if (o.refit === "guardvests") {
        c.guardVests = true;
        log(c, "Workshop: every guard now has a flak vest.", "good", "research");
      } else if (o.refit?.startsWith("tier:")) {
        c.weaponTier = Number(o.refit.slice(5));
        log(c, `Workshop: every weapon refitted to ${WEAPON_TIERS[c.weaponTier].name} pattern.`, "good", "research");
      } else if (o.refit?.startsWith("armor:")) {
        c.armorTier = Number(o.refit.slice(6));
        log(c, `Workshop: every vest refitted as ${ARMOR_TIERS[c.armorTier].name}.`, "good", "research");
      } else if (o.refit) {
        const m = model(o.refit);
        c.models[m.type] = m.id;
        log(c, `Workshop: Epsilon-11 is now issued the ${m.name}.`, "good", "research");
      }
    }
  }
}

/** Refits waiting to be ordered: researched weapon models and vest tiers not yet issued. */
export function pendingRefits(c: Campaign): { key: string; name: string }[] {
  const out: { key: string; name: string }[] = [];
  for (const [id, p] of Object.entries(PROJECTS)) {
    if (!has(c, id) || c.orders.some(o => o.refit === (p.model ?? (p.weaponTier ? `tier:${p.weaponTier}` : `armor:${p.armorTier}`)))) continue;
    if (id === "guard_vests" && !c.guardVests && !c.orders.some(o => o.refit === "guardvests")) out.push({ key: "guardvests", name: "Guard flak vests" });
    if (p.weaponTier && (c.weaponTier ?? 1) < p.weaponTier) out.push({ key: `tier:${p.weaponTier}`, name: `${WEAPON_TIERS[p.weaponTier].name} pattern weapons` });
    if (p.model && c.models[model(p.model).type] !== p.model && model(c.models[model(p.model).type]).year < model(p.model).year) out.push({ key: p.model, name: model(p.model).name });
    if ((p.armorTier ?? 0) > 1 && c.armorTier < p.armorTier!) out.push({ key: `armor:${p.armorTier}`, name: ARMOR_TIERS[p.armorTier!].name });
  }
  return out;
}
export function canRefit(c: Campaign): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (c.funds < REFIT.cost) return `Needs $${REFIT.cost}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function orderRefit(c: Campaign, key: string) {
  if (canRefit(c) || !pendingRefits(c).some(r => r.key === key)) return;
  spend(c, REFIT.cost, "workshop", "Weapon refit");
  c.orders.push({ refit: key, daysLeft: REFIT.days });
}
export const unlockedAttachments = (c: Campaign) =>
  Object.entries(PROJECTS).filter(([id, p]) => p.attachment && has(c, id)).map(([, p]) => p.attachment!);
export const ATTACHMENT_COST = { cost: 30, days: 3 };
export const unlockedAmmo = (c: Campaign) => Object.entries(PROJECTS).filter(([id, p]) => p.ammo && has(c, id)).map(([, p]) => p.ammo!);
export function canOrderAmmo(c: Campaign, a: AmmoId): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (!unlockedAmmo(c).includes(a)) return "Not researched yet.";
  if (c.funds < ATTACHMENT_COST.cost) return `Needs $${ATTACHMENT_COST.cost}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function orderAmmo(c: Campaign, a: AmmoId) {
  if (canOrderAmmo(c, a)) return;
  spend(c, ATTACHMENT_COST.cost, "workshop", "Attachment");
  c.orders.push({ ammo: a, daysLeft: ATTACHMENT_COST.days });
}
export function canOrderAttachment(c: Campaign, a: AttachmentId): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (!unlockedAttachments(c).includes(a)) return "Not researched yet.";
  if (c.funds < ATTACHMENT_COST.cost) return `Needs $${ATTACHMENT_COST.cost}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function orderAttachment(c: Campaign, a: AttachmentId) {
  if (canOrderAttachment(c, a)) return;
  spend(c, ATTACHMENT_COST.cost, "workshop", "Special ammunition");
  c.orders.push({ attachment: a, daysLeft: ATTACHMENT_COST.days });
}

/** Phase 4E: surplus stores sell back for half what they cost to build. */
export type StoreKind = "item" | "att" | "ammo";
export const sellPrice = (c: Campaign, kind: StoreKind, id: string) => Math.floor((kind === "item" ? itemCost(c, id as ItemId) : ATTACHMENT_COST.cost) / 2);
const stock = (c: Campaign, kind: StoreKind) => (kind === "item" ? c.inventory : kind === "att" ? c.attachments : c.ammo) as Record<string, number | undefined>;
export const canSellStore = (c: Campaign, kind: StoreKind, id: string) => (stock(c, kind)[id] ?? 0) > 0 ? null : "None spare in stores.";
export function sellStore(c: Campaign, kind: StoreKind, id: string) {
  if (canSellStore(c, kind, id)) return;
  const st = stock(c, kind); st[id] = (st[id] ?? 0) - 1;
  const name = kind === "item" ? ITEMS[id as ItemId].name : kind === "att" ? ATTACHMENTS[id as AttachmentId].name : AMMO[id as AmmoId].name;
  earn(c, sellPrice(c, kind, id), "sales", `${name} sold from stores`);
}
export const itemCost = (c: Campaign, item: ItemId) => has(c, "bt_jigs") ? Math.ceil(ITEMS[item].cost / 2) : ITEMS[item].cost;
export function canOrder(c: Campaign, item: ItemId): string | null {
  if (!countOperational(c, "workshop")) return "Needs a working workshop.";
  if (!unlockedItems(c).includes(item)) return "Not researched yet.";
  if (c.funds < itemCost(c, item)) return `Needs $${itemCost(c, item)}k.`;
  if (engineersFree(c) < 1) return "Needs a free engineer.";
  return null;
}
export function order(c: Campaign, item: ItemId) {
  if (canOrder(c, item)) return;
  spend(c, itemCost(c, item), "workshop", ITEMS[item].name);
  c.orders.push({ item, daysLeft: ITEMS[item].days });
}

// ---------- breakthroughs and inspirations (War of the Chosen) ----------
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
/** On the first of each month: maybe offer a breakthrough, maybe inspire a project; and expire old ones. */
export function monthlyResearch(c: Campaign) {
  const r = c.research;
  if (r.offer && r.offer.until < c.day && !r.paid.includes(r.offer.id)) { log(c, `${PROJECTS[r.offer.id].name} is no longer on offer.`); r.offer = undefined; }
  if (r.inspired && r.inspired.until < c.day && !r.paid.includes(r.inspired.id)) r.inspired = undefined;
  if (!r.offer && Math.random() < 0.5) {
    const pool = Object.keys(PROJECTS).filter(id => PROJECTS[id].breakthrough && !has(c, id));
    if (pool.length) {
      const id = pool[rand(0, pool.length - 1)];
      r.offer = { id, until: c.day + 30 };
      log(c, `${PROJECTS[id].name} is on offer for 30 days: ${PROJECTS[id].desc}`, "good", "research");
    }
  }
  if (!r.inspired && Math.random() < 0.4) {
    const pool = Object.keys(PROJECTS).filter(id => !PROJECTS[id].breakthrough && !has(c, id) && !projectLock(c, id) && !r.paid.includes(id));
    if (pool.length) {
      const id = pool[rand(0, pool.length - 1)];
      r.inspired = { id, until: c.day + 30 };
      log(c, `Inspiration: a researcher has an idea for ${PROJECTS[id].name}. Started within 30 days, it takes half the time.`, "good", "research");
    }
  }
}

// ---------- tests: paid for up front, worked on by researchers, and the cell work happens on the last day ----------
export function canTest(c: Campaign, s: ScpRecord, t: TestId): string | null {
  const d = TESTS[t];
  if (c.research.tests.includes(t)) return "Already done.";
  if (c.research.testing) return c.research.testing.id === t ? "Under way." : `The ${TESTS[c.research.testing.id].name.toLowerCase()} is already under way.`;
  if (!countOperational(c, "lab")) return "Needs a working research lab.";
  if (s.status !== "contained") return `${s.name} isn't in its cell.`;
  if (researchersFree(c) < 1) return "Needs a free researcher.";
  if (c.dclass < d.dclass) return `Needs ${d.dclass} D-Class.`;
  if (c.funds < d.cost) return `Needs $${d.cost}k.`;
  return null;
}
export function startTest(c: Campaign, s: ScpRecord, t: TestId, watchers: Guard[]) {
  if (canTest(c, s, t)) return;
  const d = TESTS[t];
  spend(c, d.cost, "research", `Test on ${s.name}: ${d.name}`); c.dclass -= d.dclass;
  c.research.testing = { id: t, watchers: watchers.map(g => g.id) };
  c.research.assigned[testKey(t)] = 1;
  log(c, `The ${d.name.toLowerCase()} on ${s.name} begins: ${d.days} researcher-days of preparation, then the cell work.`);
}
/** The last day: the D-Class go into the cell while the chosen guards watch. */
function finishTest(c: Campaign, t: TestId) {
  const r = c.research, d = TESTS[t], key = testKey(t);
  const ids = r.testing?.watchers ?? [], watching = c.guards.filter(g => g.alive && ids.includes(g.id));
  delete r.assigned[key]; delete r.progress[key]; r.testing = undefined;
  const s = c.scps.find(x => x.id === "173");
  c.dclass += d.dclass;   // the D-Class held back for it
  if (!s || s.status !== "contained") { log(c, `The ${d.name.toLowerCase()} was called off: SCP-173 isn't in its cell. The money is spent.`, "bad", "research"); return; }
  const ok = cellWork(c, s, watching, `the ${d.name.toLowerCase()}`, d.risk, d.dclass, d.breach);
  if (ok) {
    r.tests.push(t);
    for (const n of d.notes) if (!c.knownNotes.includes(n)) c.knownNotes.push(n);
    log(c, `${d.name} complete. SCP-173's file has been updated and new research is available.`, "good", "research");
  }
}

