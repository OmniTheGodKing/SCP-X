// Phase 6: the anomaly registry. One structured definition per anomaly: what it is, where it comes from, what is
// known and unknown about it, how it behaves on the tactical map, how it is taken and held, and what it does to the
// world. Definitions never change during play; the campaign's knowledge of each anomaly and the state of each
// instance live in campaign/dossier.ts.
//
// Object class (the Foundation's containment label) is kept apart from threat (how much harm it does when loose) and
// difficulty (how hard it is to take and hold). Continuity notes say which parts follow the SCP Wiki article, which are
// SCP-X adaptations, and which are original to SCP-X. Authors are credited in ui/credits.ts, not repeated here.
//
// The tactical rules themselves stay in game/scp173.ts, scp049.ts, scp106.ts, scp4b.ts and fire.ts; this registry
// names the capabilities those rules implement so other systems (investigation, autonomous resolution, storylines,
// containment planning) can reason about an anomaly without checking its id.
import type { ItemId } from "../game/types";

export type ObjectClass = "Safe" | "Euclid" | "Keter";
/** Reusable behaviour capabilities. An anomaly lists the ones its tactical rules implement. */
export type Capability =
  | "observation_bound"      // cannot move while observed (SCP-173)
  | "contact_lethal"         // kills or transforms on touch (SCP-049, SCP-106, SCP-610 instances)
  | "pursuit"                // runs down a chosen target (SCP-096, SCP-106)
  | "propagation"            // spreads across terrain (SCP-610)
  | "reanimation"            // raises the dead (SCP-049)
  | "exposure_trigger"       // a specific kind of exposure sets it off (SCP-096's face)
  | "phasing"                // moves through walls and doors (SCP-106)
  | "capture_personnel"      // removes people from the battlefield alive (SCP-106)
  | "corrosion"              // degrades the environment it passes through (SCP-106)
  | "escape_drive"           // works its way toward getting out (SCP-173)
  | "device_interaction"     // reacts to containment devices or bait (SCP-106's feeding, SCP-096's hood)
  | "electronic_interference"
  | "object_manipulation"
  | "regeneration" | "acoustic" | "mimicry" | "possession" | "compulsion" | "inert";
/** What a field team can find at an incident before anyone knows what caused it. */
export type EvidenceKind = "remains" | "scrapes" | "residue" | "photograph" | "testimony" | "medical" | "corrosion" | "growth" | "records" | "film";
export const EVIDENCE: Record<EvidenceKind, { name: string; desc: string }> = {
  remains:   { name: "Remains", desc: "A body, or what is left of one." },
  scrapes:   { name: "Scrape marks", desc: "Marks on the floor where something heavy was moved without anyone seeing it move." },
  residue:   { name: "Residue", desc: "A substance left behind: excrement, blood, something worse." },
  photograph:{ name: "Photograph", desc: "A print or negative taken at the scene. Nobody has looked at it closely yet." },
  testimony: { name: "Testimony", desc: "What a local says they saw or heard." },
  medical:   { name: "Medical record", desc: "A death certificate, a doctor's notes, an autopsy with no cause of death." },
  corrosion: { name: "Corrosion", desc: "Stone, metal or wood eaten through by something black and foul." },
  growth:    { name: "Growth", desc: "Living tissue spreading over surfaces where nothing should grow." },
  records:   { name: "Records", desc: "Papers, logs or reports left at the scene." },
  film:      { name: "Surveillance film", desc: "A reel from a security camera. It may show the cause, and whoever views it sees what it saw." },
};

export type ContinuityKind = "source" | "adaptation" | "original";
export interface ContinuityNote { kind: ContinuityKind; text: string }

/** One fact about an anomaly. Unknown facts are learned from evidence, observation in the field, or research. */
export interface PropertyDef {
  id: string;
  text: string;
  /** A fact that keeps people alive when it is known (it changes procedures and the briefing). */
  hazard?: boolean;
  /** Known to the Foundation from the start of the campaign (historical records). */
  known?: boolean;
  /** Evidence that points to it when examined or analysed. */
  evidence?: EvidenceKind[];
  /** Learned by seeing the anomaly up close in the field (identified, not just detected). */
  observed?: boolean;
  /** A research project whose completion confirms it. */
  research?: string;
}

/** A containment procedure (game/containment-actions.ts) and the knowledge it rests on. */
export interface ProcedureRef { id: string; needs: string[]; kit?: ItemId }
export type ChamberFeature = "monitored_cell" | "furnished_cell" | "image_screening" | "suspended_lead_cell" | "biohazard_store" | "sealed_vault";
export const CHAMBER_FEATURES: Record<ChamberFeature, { name: string; desc: string; research?: string }> = {
  monitored_cell:      { name: "Monitored cell", desc: "Cameras and a window on the cell at all hours, so someone is always looking." },
  furnished_cell:      { name: "Furnished cell", desc: "A humanoid cell with furniture, books and a desk: it is calmer when occupied." },
  image_screening:     { name: "Image screening", desc: "Every photograph, film and camera feed checked for its face before anyone sees it.", research: "image_screening" },
  suspended_lead_cell: { name: "Suspended lead-lined cell", desc: "Lead-lined, acid-resistant panels held clear of the floor by electromagnets.", research: "em_containment" },
  biohazard_store:     { name: "Biohazard store", desc: "Sealed sample storage with an incinerator and negative pressure." },
  sealed_vault:        { name: "Sealed vault", desc: "A locked vault for objects." },
};

export type MissionVariant =
  | "breach_initial" | "breach_evacuation" | "recover_escaped" | "chamber_security" | "emergency_containment"
  | "death_investigation" | "first_encounter" | "personnel_recovery" | "instance_containment" | "transport"
  | "attack_investigation" | "photo_recovery" | "surveillance_contamination" | "exposed_evacuation"
  | "corrosion_investigation" | "settlement_investigation" | "missing_person" | "survivor_evacuation" | "quarantine_perimeter"
  | "sample_recovery" | "suppression" | "major_outbreak";

export interface AnomalyDef {
  id: string;
  name: string;
  title: string;
  cls: ObjectClass;
  /** Harm when loose (1 to 5), and how hard it is to take and hold (1 to 5): not the same thing as its class. */
  threat: number;
  difficulty: number;
  source: string;
  continuity: ContinuityNote[];
  /** Unique anomalies have exactly the instances listed; generic incident generation never makes another. */
  unique: boolean;
  instances: { id: string; note: string; holder?: string }[];
  /** First year an incident involving it can happen in the SCP-X chronology, and why. */
  from: number;
  fromNote: string;
  /** What the first report says, before anyone knows what it is. */
  report: string;
  properties: PropertyDef[];
  capabilities: Capability[];
  /** What gunfire does: kills it, only staggers or delays it, or nothing at all. */
  conventional: "effective" | "delay" | "none";
  procedures: ProcedureRef[];
  /** What moving it takes once it is secured. */
  transport: { container: string; needs: string[] };
  chamber: { grade: ObjectClass; features: ChamberFeature[] };
  /** Conditions that make its chamber fail, for the cell's file and breach risk. */
  breach: string[];
  variants: MissionVariant[];
  storyline?: string;
  /** For the hands-off resolver: capability tags a squad needs to secure it (any one), and to keep people alive. */
  auto: { secure: string[]; people: string[]; threat: number };
}

export const ANOMALIES: Record<string, AnomalyDef> = {
  "173": {
    id: "173", name: "SCP-173", title: "The Sculpture", cls: "Euclid", threat: 4, difficulty: 3, source: "https://scpwiki.com/scp-173",
    continuity: [
      { kind: "source", text: "A concrete and rebar sculpture that cannot move while in a direct line of sight, and kills by snapping the neck or strangling when unobserved. Its cell needs three personnel inside, two watching, and the floor cleaned of a red-brown substance." },
      { kind: "adaptation", text: "Movement is resolved in tiles per turn during blinks and loss of sight. The escape drive (it works its way toward an exit while unseen) is an SCP-X rule." },
      { kind: "original", text: "The campaign's opening instance at Provisional Site-11 is a separate SCP-X instance, not the one in the article's Site-19 history." },
    ],
    unique: true,
    instances: [
      { id: "173", note: "The instance of the original article, held at Site-19.", holder: "Site-19" },
      { id: "173:p11", note: "SCP-X: the instance loose at Provisional Site-11 in the opening, which the player's site takes in." },
    ],
    from: 1951, fromNote: "Held by the Foundation before the campaign opens.",
    report: "A guard found with his neck broken in a locked room. Nobody heard a struggle.",
    properties: [
      { id: "appearance", text: "A concrete figure daubed with spray paint, about two metres tall.", observed: true, known: true },
      { id: "sight_bound", text: "It cannot move while anyone is looking straight at it. Walls, doors, smoke and darkness break the look.", hazard: true, known: true, evidence: ["scrapes"] },
      { id: "blink_window", text: "A blink is long enough. People staring take it in turns, and two blinking together is the danger.", hazard: true, known: true },
      { id: "neck_snap", text: "It kills by breaking the neck the moment nobody is watching.", hazard: true, known: true, evidence: ["remains"] },
      { id: "residue", text: "It leaves a red-brown mix of faeces and blood that has to be cleaned from its cell.", known: true, evidence: ["residue"] },
      { id: "escape_drive", text: "Left unseen without anyone to kill, it works its way toward the nearest way out.", research: "movement_study" },
    ],
    capabilities: ["observation_bound", "contact_lethal", "escape_drive"],
    conventional: "none",
    procedures: [
      { id: "maintain_observation", needs: ["sight_bound"] },
      { id: "coordinate_blinks", needs: ["blink_window"] },
      { id: "secure_access", needs: [] },
      { id: "drag_to_container", needs: ["sight_bound"] },
      { id: "seal_container", needs: [] },
      { id: "lock_hatch", needs: ["escape_drive"] },
    ],
    transport: { container: "A sealed steel transport container, moved with two people watching it at all times.", needs: ["sight_bound"] },
    chamber: { grade: "Euclid", features: ["monitored_cell"] },
    breach: ["Everyone watching blinks together", "Lights out or a power cut", "A missed cleaning", "A damaged wing"],
    variants: ["breach_initial", "breach_evacuation", "recover_escaped", "chamber_security", "emergency_containment"],
    storyline: "arc173",
    auto: { secure: ["can_hold_observation", "can_secure"], people: ["can_evacuate"], threat: 0.12 },
  },
  "049": {
    id: "049", name: "SCP-049", title: "The Plague Doctor", cls: "Euclid", threat: 4, difficulty: 3, source: "https://scpwiki.com/scp-049",
    continuity: [
      { kind: "source", text: "A humanoid in the garb of a medieval plague doctor. Its touch kills, and it performs crude surgery on the dead to make SCP-049-2. It speaks of a \"Pestilence\" it means to cure, and is cooperative when it is not agitated." },
      { kind: "adaptation", text: "Gunfire staggers it for a turn instead of harming it. Talking it down (Calm) holds it for a turn so it can be led. It raises one body per turn, and only bodies it can reach." },
      { kind: "original", text: "Its first appearance in SCP-X is a string of unexplained deaths in 1952, investigated before anyone knows the cause." },
    ],
    unique: true,
    instances: [{ id: "049", note: "The only instance." }],
    from: 1952, fromNote: "SCP-X chronology: first sighted some time in 1952 (adaptation).",
    report: "Three deaths in a week in the same village. The doctor who signed the certificates found no cause, and then the bodies were gone.",
    properties: [
      { id: "appearance", text: "A tall figure in a plague doctor's robe and beaked mask. The mask may be part of it.", observed: true, evidence: ["testimony", "photograph"] },
      { id: "lethal_touch", text: "Its touch stops the heart. There is no mark.", hazard: true, evidence: ["medical", "remains"] },
      { id: "reanimation", text: "It works on the dead and they get up as SCP-049-2. Every body near it is a weapon for it.", hazard: true, evidence: ["remains", "testimony"] },
      { id: "conversant", text: "It talks, and it can be talked to. Kept occupied, it does not act.", evidence: ["testimony", "records"], observed: true },
      { id: "gunfire_stagger", text: "Gunfire does not harm it. It staggers it for a moment.", observed: true },
      { id: "pestilence", text: "It believes it is curing a \"Pestilence\" it sees in people. Interviews about it keep it calmer for longer.", research: "pestilence_theory" },
    ],
    capabilities: ["contact_lethal", "reanimation", "pursuit"],
    conventional: "delay",
    procedures: [
      { id: "keep_distance", needs: ["lethal_touch"] },
      { id: "recover_casualties", needs: ["reanimation"] },
      { id: "calm_and_lead", needs: ["conversant"] },
      { id: "seal_container", needs: [] },
      { id: "secure_access", needs: [] },
    ],
    transport: { container: "A transport container with a seat. It goes in willingly when it is calm.", needs: ["conversant"] },
    chamber: { grade: "Euclid", features: ["furnished_cell"] },
    breach: ["Too long without an interview", "Anyone dying near it", "A damaged wing or a power cut"],
    variants: ["death_investigation", "first_encounter", "personnel_recovery", "instance_containment", "transport", "breach_initial"],
    storyline: "arc049",
    auto: { secure: ["can_secure", "can_calm"], people: ["can_evacuate", "can_recover_casualties"], threat: 0.1 },
  },
  "096": {
    id: "096", name: "SCP-096", title: "The Shy Guy", cls: "Euclid", threat: 5, difficulty: 4, source: "https://scpwiki.com/scp-096",
    continuity: [
      { kind: "source", text: "A pale, emaciated humanoid that is docile until someone views its face, directly or in a photograph or recording. It then becomes distressed and pursues that person wherever they are, kills them, and returns to a docile state." },
      { kind: "adaptation", text: "Its face can be seen only from inside a wedge in front of it. A viewer has one turn before it comes for them. A canvas hood and leading it into a container is the field procedure." },
      { kind: "original", text: "The hiker's photograph incident that brings it to the Foundation's attention in the late 1950s is original to SCP-X." },
    ],
    unique: true,
    instances: [{ id: "096", note: "The only instance." }],
    from: 1953, fromNote: "SCP-X chronology: first sighted from 1953 (adaptation).",
    report: "A hiker torn apart forty miles from where he was last seen camping. His camera was found with him.",
    properties: [
      { id: "appearance", text: "A very thin, pale figure, over two metres tall, weeping with its hands over its face.", observed: true, evidence: ["testimony"] },
      { id: "face_trigger", text: "Anyone who sees its face, in person or in any image, is marked. It will cross any distance to reach them.", hazard: true, evidence: ["photograph", "film", "remains"] },
      { id: "image_carrier", text: "Photographs and film of its face carry the trigger. Whoever looks at the image is marked too.", hazard: true, evidence: ["photograph", "film"] },
      { id: "unstoppable", text: "Once it is screaming, nothing the team carries stops it. Gunfire does nothing.", hazard: true, evidence: ["remains"], observed: true },
      { id: "docile", text: "Unprovoked, it sits and weeps. With its face covered it can be led.", evidence: ["testimony"], observed: true },
      { id: "returns_docile", text: "When its target is dead, it goes back to sitting and weeping.", observed: true },
    ],
    capabilities: ["exposure_trigger", "pursuit", "contact_lethal", "device_interaction"],
    conventional: "none",
    procedures: [
      { id: "eyes_down", needs: ["face_trigger"] },
      { id: "bag_unseen", needs: ["image_carrier"] },
      { id: "hood_and_lead", needs: ["face_trigger", "docile"], kit: "hood" },
      { id: "seal_container", needs: [] },
      { id: "evacuate_exposed", needs: ["face_trigger"] },
    ],
    transport: { container: "A sealed container with no window, and nobody on the convoy carrying a camera.", needs: ["face_trigger", "image_carrier"] },
    chamber: { grade: "Euclid", features: ["image_screening"] },
    breach: ["A photograph or film of its face reaching staff", "A camera in the cell", "A damaged wing or a power cut"],
    variants: ["attack_investigation", "photo_recovery", "surveillance_contamination", "breach_initial", "exposed_evacuation", "emergency_containment"],
    storyline: "arc096",
    auto: { secure: ["can_avoid_visual"], people: ["can_evacuate"], threat: 0.2 },
  },
  "106": {
    id: "106", name: "SCP-106", title: "The Old Man", cls: "Keter", threat: 5, difficulty: 5, source: "https://scpwiki.com/scp-106",
    continuity: [
      { kind: "source", text: "An elderly humanoid covered in a black corrosive substance. It passes through solid matter, leaving corrosion, and takes victims into a \"pocket dimension\". It can be lured with live bait, and its later containment uses a suspended lead-lined cell." },
      { kind: "adaptation", text: "It sinks under the floor for a turn when shot. Bait in the transport container holds it for a turn while it feeds, and the container is sealed then. People it takes are not decided on the spot: they are missing in its pocket dimension until found or confirmed lost." },
      { kind: "original", text: "SCP-X does not have a playable pocket dimension yet; recovery of the taken happens through search operations where it surfaces." },
    ],
    unique: true,
    instances: [{ id: "106", note: "The only instance." }],
    from: 1953, fromNote: "SCP-X chronology: first sighted in 1953 (adaptation).",
    report: "People missing from locked rooms. A cellar wall eaten through with something black, and a smell like rot.",
    properties: [
      { id: "appearance", text: "An old man, his skin black and running, with a smell of rot.", observed: true, evidence: ["testimony"] },
      { id: "phasing", text: "It walks through walls, floors and doors as if they were not there.", hazard: true, evidence: ["corrosion", "testimony"], observed: true },
      { id: "corrosion", text: "Everything it passes through rots. Its stains stay on the floor.", evidence: ["corrosion"] },
      { id: "pocket", text: "Those it takes are dragged down into somewhere else. Some come back, changed.", hazard: true, evidence: ["records", "testimony"] },
      { id: "bait", text: "It goes for a living person it can reach and stays to feed. Bait in a container holds it long enough to seal it in.", evidence: ["records"] },
      { id: "gun_sink", text: "Gunfire drives it under the floor for a while. It does not hurt it.", observed: true },
      { id: "lead_cell", text: "Lead-lined, suspended cells and electromagnets hold it.", research: "em_containment" },
    ],
    capabilities: ["phasing", "capture_personnel", "corrosion", "pursuit", "device_interaction"],
    conventional: "delay",
    procedures: [
      { id: "bait_container", needs: ["bait"] },
      { id: "seal_container", needs: [] },
      { id: "decon_corrosion", needs: ["corrosion"] },
      { id: "search_taken", needs: ["pocket"] },
    ],
    transport: { container: "A lead-lined container, with live bait inside while it is moved.", needs: ["bait"] },
    chamber: { grade: "Keter", features: ["suspended_lead_cell"] },
    breach: ["A power cut (its cell depends on electromagnets)", "Corroded panels left unreplaced", "A damaged wing"],
    variants: ["breach_initial", "personnel_recovery", "corrosion_investigation", "emergency_containment", "chamber_security"],
    storyline: "arc106",
    auto: { secure: ["can_bait"], people: ["can_evacuate"], threat: 0.18 },
  },
  "610": {
    id: "610", name: "SCP-610", title: "The Flesh that Hates", cls: "Keter", threat: 5, difficulty: 5, source: "https://scpwiki.com/scp-610",
    continuity: [
      { kind: "source", text: "A contagious condition that spreads by contact and turns people, and the ground around them, into growths of flesh. Affected areas are burned and quarantined." },
      { kind: "adaptation", text: "The flesh spreads tile by tile from a core each turn; anyone ending a turn on it without a sealed suit is infected and turns five turns later. Only fire kills the core. Cordons and firebreaks stop the spread where they stand." },
      { kind: "original", text: "SCP-X's outbreak region, its stages, and repeated outbreaks in the same region are original to SCP-X." },
    ],
    unique: false,
    instances: [{ id: "610", note: "Not one entity: every outbreak is the same condition. There is no single body to hold, only samples." }],
    from: 1951, fromNote: "SCP-X: the first outbreak starts in the campaign's first years.",
    report: "A village has stopped answering. A delivery driver says the houses were \"covered in something\".",
    properties: [
      { id: "growth", text: "Living flesh spreading over the ground and buildings, a little more every hour.", observed: true, evidence: ["growth", "testimony"] },
      { id: "contact_infection", text: "Standing on it, or a blow from one of its instances, infects. The infected turn in days, and nothing reverses it.", hazard: true, evidence: ["growth", "remains", "medical"] },
      { id: "core", text: "The spread comes from a core. Burn the core and the spread stops.", evidence: ["growth"], observed: true },
      { id: "fire_kills", text: "Fire kills the flesh. Ordinary weapons do not stop it spreading.", hazard: true, evidence: ["records"], observed: true },
      { id: "barrier_stops", text: "A cordon or a firebreak it cannot cross stops the spread at that line.", evidence: ["records"] },
      { id: "sealed_suits", text: "A sealed suit lets someone stand on it safely, until a blow tears the suit.", research: "containment_suit" },
    ],
    capabilities: ["propagation", "contact_lethal"],
    conventional: "none",
    procedures: [
      { id: "isolation_line", needs: ["barrier_stops"], kit: "cordon_kit" },
      { id: "firebreak", needs: ["barrier_stops"], kit: "firebreak_kit" },
      { id: "burn_core", needs: ["core", "fire_kills"] },
      { id: "controlled_crossing", needs: ["contact_infection"] },
      { id: "sealed_retrieval", needs: ["contact_infection"], kit: "sample_case" },
      { id: "evacuate_survivors", needs: [] },
    ],
    transport: { container: "Sealed sample cases only; nothing living leaves the zone.", needs: ["contact_infection"] },
    chamber: { grade: "Keter", features: ["biohazard_store"] },
    breach: ["A torn sample case", "A contaminated person brought out without decontamination"],
    variants: ["settlement_investigation", "missing_person", "survivor_evacuation", "quarantine_perimeter", "sample_recovery", "suppression", "major_outbreak"],
    storyline: "arc610",
    auto: { secure: ["can_reduce_spread", "can_burn"], people: ["can_evacuate", "can_protected_extraction"], threat: 0.15 },
  },
};

/** Anomalies in the game without a full Phase 6 definition yet: their old one-line records stand in. */
export const anomalyDef = (id: string): AnomalyDef | undefined => ANOMALIES[id.split(":")[0]];
/** The SCP number behind an instance id ("173:p11" is SCP-173). */
export const scpOf = (instance: string) => instance.split(":")[0];
export const propertyOf = (id: string, prop: string) => anomalyDef(id)?.properties.find(p => p.id === prop);
/** Properties a piece of evidence of this kind can point to, for this anomaly. */
export const evidenceProps = (id: string, kind: EvidenceKind) => (anomalyDef(id)?.properties ?? []).filter(p => p.evidence?.includes(kind));
