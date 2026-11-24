// Phase 6: the shared containment action framework. Every procedure an anomaly's definition lists (data/anomalies.ts)
// is described here once, with what it needs and what it does, and is tied to the real tactical action that carries it
// out: an ability, a mode, a placed kit item or a squad technique. Nothing here invents a second rule set; `action`
// names the existing control, and `ready` asks that control's own check whether it can be used right now.
//
// The briefing shows the procedures the Foundation knows for the anomaly in front of it (knowledge from the dossier);
// one whose basis isn't known yet is shown as unknown, and its kit is not issued (campaign/campaign.ts buildSetup).
import { abilityCheck } from "./abilities";
import { dragCheck, sealCheck, stareCheck } from "./turn";
import { S } from "./state";
import type { AbilityId, ItemId, Unit } from "./types";

export interface ContainmentAction {
  id: string;
  name: string;
  /** What has to be true on the map. */
  pre: string;
  /** Who can do it (qualification or role) and the kit it uses. */
  who: string;
  kit?: ItemId[];
  /** Action points and squad cooldown, as the action bar shows them. */
  cost: string;
  /** Where the operative has to be. */
  space: string;
  /** What can stop it partway. */
  interrupt: string;
  success: string;
  failure: string;
  /** What it leaves in the campaign afterwards. */
  persists: string;
  /** The real control that performs it: an ability id, a mode, a placed item, or "move"/"door" for plain orders. */
  action: { ability?: AbilityId; mode?: "stare" | "drag" | "seal" | "eyes" | "carry" | "door" | "exfil"; item?: ItemId };
}

export const CONTAINMENT_ACTIONS: Record<string, ContainmentAction> = {
  maintain_observation: { id: "maintain_observation", name: "Maintain observation", pre: "SCP-173 in direct line of sight, facing it, eyes open.", who: "Anyone; spotters blink less.",
    cost: "Stare (S): uses the operative's turn, 1 action left", space: "Clear line of sight; walls, doors, smoke and darkness break it.", interrupt: "Blinks, panic, smoke, a door closing.",
    success: "It cannot move while anyone holds it.", failure: "Everyone blinks together: it moves and may kill.", persists: "Staring streaks feed traits (Steady eyes, Nightmares).", action: { mode: "stare" } },
  coordinate_blinks: { id: "coordinate_blinks", name: "Call the blink", pre: "Two or more staring.", who: "Anyone staring.", cost: "Free", space: "Any watcher.", interrupt: "None.",
    success: "One watcher blinks on a count while the others hold.", failure: "Called badly, both blink.", persists: "Blink cadence research builds on it.", action: { mode: "stare" } },
  secure_access: { id: "secure_access", name: "Secure access routes", pre: "A door, blast door or barricade on the route.", who: "Anyone at a door; Site Security at the panel; Containment Security with barricades.",
    kit: ["barricade"], cost: "1 action (door), 2 (barricade, blast door panel)", space: "Beside the door or the panel.", interrupt: "SCP-106 walks through. Explosives open barricades.",
    success: "The route is shut: sight and paths are cut.", failure: "A shut door also blocks your own watchers' sight.", persists: "Doors broken in the fight are repaired at the site afterwards.", action: { mode: "door" } },
  drag_to_container: { id: "drag_to_container", name: "Move it into the container", pre: "Someone else holds observation; the dragger is beside it.", who: "Anyone; containment specialists and the powered jack drag further.",
    cost: "1 action per tile (2 with the jack)", space: "Beside SCP-173, path to the container.", interrupt: "The watchers blink while it is dragged.",
    success: "It is inside the container.", failure: "Dragging unwatched gets the dragger killed.", persists: "Securing it closes the incident.", action: { mode: "drag" } },
  seal_container: { id: "seal_container", name: "Seal the container", pre: "The anomaly is inside the transport container and quiet (calm, hooded, feeding or watched).", who: "Anyone beside the container.",
    cost: "Both actions (1 with Procedure)", space: "Beside the container.", interrupt: "It moves first if nobody watches, calms or holds it.",
    success: "Secured: the tactical containment is complete.", failure: "Not quiet: the seal is refused.", persists: "The anomaly is placed by the strategic containment rules (a wing, temporary holding or transfer).", action: { mode: "seal" } },
  lock_hatch: { id: "lock_hatch", name: "Lock the surface hatch", pre: "At the corridor panel.", who: "Anyone.", cost: "Both actions", space: "Beside the panel.", interrupt: "None.",
    success: "It cannot get out that way for some turns.", failure: "Too late if it is already there.", persists: "Early warning sensors make it last longer.", action: { ability: "lockdown" } },
  keep_distance: { id: "keep_distance", name: "Keep out of reach", pre: "None.", who: "Everyone.", cost: "Movement", space: "More than one tile from it.", interrupt: "It walks four tiles a turn.",
    success: "Nobody dies to its touch.", failure: "Its touch kills, and the body is raised.", persists: "Every death near it is an SCP-049-2.", action: { mode: "carry" } },
  recover_casualties: { id: "recover_casualties", name: "Recover casualties", pre: "A body or downed person beside the operative.", who: "Anyone; Recovery squads carry without slowing.", kit: ["stretcher"],
    cost: "1 action to lift, −1 move while carrying", space: "Beside the body; out through an exit.", interrupt: "SCP-049 raises a body it reaches first.",
    success: "The body can't be raised; downed people are brought home.", failure: "Left behind, it gets up again.", persists: "Recovered personnel return to the roster; bodies are buried rather than lost.", action: { ability: "pickup" } },
  calm_and_lead: { id: "calm_and_lead", name: "Calm and lead", pre: "SCP-049 in sight within 3 tiles.", who: "Anyone with the sanity to spare (6).", cost: "1 action", space: "Within 3 tiles, in sight.",
    interrupt: "Gunfire nearby; anyone dying near it.", success: "It does nothing next turn and follows up to 3 tiles now.", failure: "Without calm, it hunts.", persists: "Pestilence theory makes calm last two turns.", action: { ability: "calm" } },
  eyes_down: { id: "eyes_down", name: "Eyes down", pre: "None.", who: "Anyone.", cost: "Free toggle", space: "Anywhere.", interrupt: "None.",
    success: "Safe from its face: sees only the adjacent tiles.", failure: "Can't shoot or see far.", persists: "Blindfold drill removes the movement limit.", action: { mode: "eyes" } },
  bag_unseen: { id: "bag_unseen", name: "Bag evidence unseen", pre: "An item of evidence beside the operative.", who: "Anyone.", cost: "1 action", space: "Beside it.", interrupt: "None.",
    success: "It comes home sealed for analysis at the site's labs, and nobody looks at it in the field.", failure: "Slower: the lab takes days to say what it shows.", persists: "Analysis in Dr. Bell's lab adds what it shows to the anomaly's file.", action: { ability: "recover" } },
  hood_and_lead: { id: "hood_and_lead", name: "Hood and lead", pre: "SCP-096 quiet; the operative beside it, eyes down or outside its face's wedge.", who: "The operative with the canvas hood.", kit: ["hood"],
    cost: "1 action to hood, 1 to lead 3 tiles", space: "Beside it.", interrupt: "Anyone seeing its face first.", success: "Hooded, it can be led into the container.", failure: "No hood without knowing why it is needed.",
    persists: "Securing it closes the incident.", action: { ability: "hood" } },
  evacuate_exposed: { id: "evacuate_exposed", name: "Get the marked out", pre: "Someone has seen its face.", who: "Anyone; Recovery squads carry without slowing.", cost: "Movement, exfiltration", space: "To an exit.",
    interrupt: "It runs fourteen tiles a turn through doors.", success: "They live through the mission.", failure: "It follows them out: they remain marked.", persists: "A marked person stays marked: SCP-096 will come for them.", action: { mode: "exfil" } },
  bait_container: { id: "bait_container", name: "Bait the container", pre: "A D-Class or a secured prisoner inside the transport container.", who: "Anyone moving them in.", cost: "Movement", space: "The container tile.",
    interrupt: "It takes someone else first.", success: "It goes to the bait and stays a turn to feed: seal it then.", failure: "Without bait it wanders and takes whoever it finds.", persists: "The bait is lost.", action: { mode: "seal" } },
  decon_corrosion: { id: "decon_corrosion", name: "Decontaminate corrosion", pre: "Corroded or burning tiles beside the operative.", who: "Decontamination squad.", kit: ["decon_agent"],
    cost: "2 actions", space: "A 2×2 area beside them.", interrupt: "None.", success: "Corrosion and fire there are cleared; people in it are washed down.", failure: "Rot stays and slows movement.", persists: "Uses a decon agent from stores.", action: { item: "decon_agent" } },
  search_taken: { id: "search_taken", name: "Search for the taken", pre: "Someone missing in its pocket dimension.", who: "A squad on a search and recovery operation.", cost: "An operation", space: "Where it surfaces.",
    interrupt: "It may surface there itself.", success: "The missing are found and brought home.", failure: "They stay missing, and after long enough are listed dead.", persists: "The missing stay on the roster until found or confirmed lost.", action: { ability: "pickup" } },
  isolation_line: { id: "isolation_line", name: "Isolation line", pre: "Clear tiles beside the operative.", who: "Quarantine squad, certified.", kit: ["cordon_kit"], cost: "2 actions", space: "A 3-tile line across their facing.",
    interrupt: "Fire burns it down.", success: "The flesh cannot spread through it while it stands.", failure: "Placed badly, the flesh goes round.", persists: "Uses a cordon kit.", action: { item: "cordon_kit" } },
  firebreak: { id: "firebreak", name: "Firebreak", pre: "Clear tiles beside the operative.", who: "Incendiary squad, certified.", kit: ["firebreak_kit"], cost: "2 actions", space: "A 2×2 strip.",
    interrupt: "None for 4 turns.", success: "No fire and no new flesh there for 4 turns.", failure: "Flesh already there stays.", persists: "Uses a firebreak kit.", action: { item: "firebreak_kit" } },
  burn_core: { id: "burn_core", name: "Burn the core", pre: "Fire on or beside the core.", who: "Anyone with incendiaries; heavy armor for the flamethrower.", kit: ["flamer", "incendiary"],
    cost: "1 action a throw or burst", space: "In range of the core.", interrupt: "Instances in the way.", success: "The core dies and the spread stops.", failure: "Fire spreads to cordons and the team.",
    persists: "The outbreak drops a stage, or ends.", action: { item: "flamer" } },
  controlled_crossing: { id: "controlled_crossing", name: "Controlled crossing", pre: "A Quarantine operative on or beside an isolation line.", who: "Quarantine squad.", cost: "1 action", space: "On or beside the line.",
    interrupt: "The operative leaving it, or fire on the line.", success: "Friendlies stepping through are washed down and come out clean.", failure: "Without it, anyone who walked on contaminated ground brings it out with them.",
    persists: "Clean extraction: nobody is held in quarantine at the site afterwards.", action: { ability: "sq_controlled_crossing" } },
  sealed_retrieval: { id: "sealed_retrieval", name: "Sealed retrieval", pre: "Flesh beside the operative.", who: "Hazardous Recovery squad.", kit: ["sample_case"], cost: "2 actions", space: "Beside the flesh.",
    interrupt: "Without a sealed suit, the handler may be infected.", success: "A sealed sample goes home for research.", failure: "The case may be dirty.", persists: "Samples open SCP-610 research and the biohazard store.", action: { item: "sample_case" } },
  evacuate_survivors: { id: "evacuate_survivors", name: "Evacuate survivors", pre: "Survivors who will follow.", who: "Anyone.", cost: "Movement", space: "To an exit.", interrupt: "Instances and the spread.",
    success: "They are out.", failure: "Those left behind are lost to it.", persists: "Survivors saved reduce the region's exposure; evacuation is not containment.", action: { mode: "exfil" } },
};

/** Whether the operative can perform this procedure right now, by the real control's own check (null: ready). */
export function procedureReady(u: Unit | null, id: string): string | null {
  const a = CONTAINMENT_ACTIONS[id];
  if (!a) return "Unknown procedure.";
  if (!u) return "Select someone.";
  if (a.action.ability) return abilityCheck(u, a.action.ability);
  switch (a.action.mode) {
    case "stare": return stareCheck(u);
    case "drag": return dragCheck(u);
    case "seal": return sealCheck(u);
    case "eyes": return S.scp === "096" || S.scp === "012" ? null : "Only where looking is the danger.";
    default: break;
  }
  if (a.action.item) return u.items?.some(i => i.id === a.action.item && i.uses > 0) ? null : "Doesn't carry the kit.";
  return null;
}
