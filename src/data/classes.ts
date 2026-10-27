// Operative classes, perks and traits. Shared by Site-19 (choosing) and missions (effects).

export type ClassId = "rifleman" | "breacher" | "recon" | "containment" | "medic";
export type PerkId =
  | "marksman" | "sharpshooter" | "covering_fire" | "double_tap" | "hunter" | "rapid_reaction" | "run_and_gun"
  | "grenadier" | "suppression" | "plated" | "shotgun_drills" | "shredder" | "bulldozer" | "wall_of_fire"
  | "keen_eyes" | "spotter" | "quiet_steps" | "scanner" | "iron_will" | "mark_target" | "first_look"
  | "handler" | "field_kit" | "wrangler" | "procedure" | "shepherd" | "cell_expert" | "calm_presence"
  | "medkit" | "field_surgeon" | "calm_words" | "stabilize" | "sedative" | "combat_medic" | "aftercare";
export type TraitId = "nightmares" | "twitchy" | "gunshy" | "hollow" | "steady" | "hardened";

export interface Perk { name: string; desc: string; }
export interface ClassDef { name: string; role: string; base: PerkId; choices: [PerkId, PerkId][]; }

export const PERKS: Record<PerkId, Perk> = {
  marksman:       { name: "Marksman", desc: "+10 aim." },
  sharpshooter:   { name: "Sharpshooter", desc: "+20% critical chance on every shot." },
  covering_fire:  { name: "Covering fire", desc: "Overwatch shots have no reaction penalty." },
  double_tap:     { name: "Double tap", desc: "Once per mission, firing leaves one action to spare." },
  hunter:         { name: "Hunter", desc: "+20 aim against flanked targets." },
  rapid_reaction: { name: "Rapid reaction", desc: "Overwatch can fire twice." },
  run_and_gun:    { name: "Run and gun", desc: "Once per mission, a free extra action this turn." },
  grenadier:      { name: "Grenadier", desc: "Throws 3 tiles further and carries one extra of each grenade." },
  suppression:    { name: "Suppression", desc: "Pins a visible enemy: −30 aim on its next shots. Ends the turn." },
  plated:         { name: "Plated", desc: "+1 armor point." },
  shotgun_drills: { name: "Shotgun drills", desc: "+20 aim and +2 damage within 3 tiles." },
  shredder:       { name: "Shredder", desc: "Hits strip 1 armor point from the target." },
  bulldozer:      { name: "Bulldozer", desc: "Vaults desks and other half cover instead of going around." },
  wall_of_fire:   { name: "Wall of fire", desc: "Suppression also pins every enemy within 2 tiles of the target." },
  keen_eyes:      { name: "Keen eyes", desc: "+3 tiles of sight range." },
  spotter:        { name: "Spotter", desc: "Allies get +10 aim against anything this operative can see." },
  quiet_steps:    { name: "Quiet steps", desc: "Anomalies don't hear their gunfire or grenades." },
  scanner:        { name: "Scanner", desc: "A built-in motion tracker." },
  iron_will:      { name: "Iron will", desc: "Loses half as much sanity to anything they see." },
  mark_target:    { name: "Mark target", desc: "Marks a visible enemy: every ally gets +15 aim against it for the rest of the turn. One action." },
  first_look:     { name: "First look", desc: "The whole mission map is revealed at the start." },
  handler:        { name: "Handler", desc: "Moves anomalous objects further: drags 1 tile more." },
  field_kit:      { name: "Field kit", desc: "A third item slot." },
  wrangler:       { name: "D-Class wrangler", desc: "D-Class within 3 tiles lose sanity half as fast and never flee." },
  procedure:      { name: "Procedure", desc: "Sealing an anomaly takes one action instead of the whole turn." },
  shepherd:       { name: "Shepherd", desc: "Restrains loose D-Class from 3 tiles away, and they join the work detail instead of going back to holding." },
  cell_expert:    { name: "Cell expert", desc: "Cleanings and tests at Site-19 are half as deadly when they watch." },
  calm_presence:  { name: "Calm presence", desc: "Allies within 4 tiles lose half as much sanity to anomalies." },
  medkit:         { name: "Medkit", desc: "Heals an adjacent ally 3 HP. 2 uses per mission. One action." },
  field_surgeon:  { name: "Field surgeon", desc: "+1 medkit use." },
  calm_words:     { name: "Calm words", desc: "Restores 20 sanity to an adjacent ally. One action." },
  stabilize:      { name: "Stabilize", desc: "Stops an adjacent downed ally bleeding out, so they survive the mission. One action." },
  sedative:       { name: "Sedative", desc: "Ends an adjacent ally's panic; they get an action back. One action." },
  combat_medic:   { name: "Combat medic", desc: "Once per turn, a medkit costs no action." },
  aftercare:      { name: "Aftercare", desc: "Everyone on the mission recovers 10 extra sanity a day for a week afterwards." },
};

export const CLASSES: Record<ClassId, ClassDef> = {
  rifleman:    { name: "Rifleman", role: "Precise fighting", base: "marksman",
    choices: [["sharpshooter", "covering_fire"], ["double_tap", "hunter"], ["rapid_reaction", "run_and_gun"]] },
  breacher:    { name: "Breacher", role: "Close quarters and heavy gear", base: "grenadier",
    choices: [["suppression", "plated"], ["shotgun_drills", "shredder"], ["bulldozer", "wall_of_fire"]] },
  recon:       { name: "Recon", role: "Seeing and knowing", base: "keen_eyes",
    choices: [["spotter", "quiet_steps"], ["scanner", "iron_will"], ["mark_target", "first_look"]] },
  containment: { name: "Containment specialist", role: "Handling anomalies and D-Class", base: "handler",
    choices: [["field_kit", "wrangler"], ["procedure", "shepherd"], ["cell_expert", "calm_presence"]] },
  medic:       { name: "Medic", role: "Body and mind", base: "medkit",
    choices: [["field_surgeon", "calm_words"], ["stabilize", "sedative"], ["combat_medic", "aftercare"]] },
};

export interface Trait { name: string; bad: boolean; desc: string; how: string; }
export const TRAITS: Record<TraitId, Trait> = {
  nightmares: { name: "Nightmares", bad: true, desc: "Starts every mission with −15 sanity.", how: "Saw two or more deaths in one mission." },
  twitchy:    { name: "Twitchy", bad: true, desc: "Blinks 3% more.", how: "Panicked and shut their eyes." },
  gunshy:     { name: "Gun-shy", bad: true, desc: "−10 aim.", how: "Dropped to 2 HP or less." },
  hollow:     { name: "Hollow", bad: true, desc: "Recovers sanity half as fast at Site-19.", how: "Broke down twice." },
  steady:     { name: "Steady eyes", bad: false, desc: "Blinks 2% less.", how: "Stared through 5 turns of a mission without blinking." },
  hardened:   { name: "Hardened", bad: false, desc: "Loses half as much sanity to seeing deaths.", how: "Survived 5 missions." },
};
