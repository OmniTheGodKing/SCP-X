// Special Containment Procedures: what each anomaly needs held, how it is taken in the field, what makes it fail,
// and what to do when it does. The routine is played out in containment.ts; the rest is shown in its cell's file and
// in mission preparation, and matches how its missions actually play.
import type { ScpId } from "../game/types";

export type RoutineCrew = "dclass" | "researcher" | "engineers";
export interface Routine { name: string; every: number; crew: RoutineCrew; n: number; cost: number; desc: string; overdue: string }
export interface Procedure {
  /** The cell it needs, in words. */
  cell: string;
  routine?: Routine;
  /** How it is taken in the field or recontained after a breach. */
  capture: string;
  /** People and equipment that make the capture work. */
  bring: string[];
  /** What makes containment fail. */
  failure: string[];
  /** Standing orders when it gets out. */
  emergency: string;
}

export const PROCEDURES: Partial<Record<ScpId, Procedure>> = {
  "173": {
    cell: "A locked cell of reinforced concrete, Euclid-grade. Never fewer than three people inside, and two of them always looking at it.",
    routine: { name: "Cell cleaning", every: 7, crew: "dclass", n: 3, cost: 0, desc: "Three D-Class go in: one scrubs the red-brown residue off the floor while two keep their eyes on it. If both watchers blink at once, the one cleaning dies.", overdue: "Debris builds up and the cell's maintenance drops: the breach risk climbs." },
    capture: "It only moves when nobody is looking. Keep eye contact, drag it (one tile at a time, two with the powered jack) into the transport container and seal it.",
    bring: ["Operatives with high sanity and few blinks", "Eye drops", "Smoke only to cover a retreat (it blinds your own watchers)", "D-Class to keep watch"],
    failure: ["Everyone looking at it blinks at once", "Lights out or smoke", "A missed cleaning", "A damaged wing or a power cut"],
    emergency: "Site Security keeps eyes on it until Epsilon-11 arrives. Lock down the surface hatch at the corridor panel: if it reaches the hatch it is gone.",
  },
  "049": {
    cell: "A furnished Euclid-grade cell. It is polite and talkative while it is kept occupied.",
    routine: { name: "Interview", every: 10, crew: "researcher", n: 1, cost: 0, desc: "A researcher sits with it for a day and lets it talk about the \"Pestilence\". It is calmer for it. Now and then it decides the researcher is ill.", overdue: "It grows restless: its cell's maintenance falls twice as fast." },
    capture: "Gunfire only staggers it. Talk it down (Calm, within 3 tiles), lead it into the transport container and seal it. Anyone it touches dies and gets up again as SCP-049-2.",
    bring: ["Operatives with high sanity to Calm it", "Pestilence theory research (Calm lasts longer)", "Firepower for SCP-049-2, not for SCP-049"],
    failure: ["Too long without an interview", "Anyone dying near it (they rise as SCP-049-2)", "A damaged wing or a power cut"],
    emergency: "Clear the wing of staff: every death adds to what it raises. Epsilon-11 talks it into the container.",
  },
  "106": {
    cell: "A Keter-grade cell of lead-lined, acid-resistant panels, suspended clear of the floor. Its corrosion eats the lining.",
    routine: { name: "Cell relining", every: 14, crew: "engineers", n: 2, cost: 15, desc: "Two engineers replace the panels it has rotted through ($15k of lining). Nobody goes near it.", overdue: "It rots through the lining: maintenance falls and the breach risk climbs." },
    capture: "It walks through walls and shooting only drives it under the floor for a turn. Put bait (a D-Class or a secured Insurgent) in the transport container: it goes straight for them and stays a turn to feed. Seal it in during that turn.",
    bring: ["A D-Class or a prisoner as bait", "Hazmat suits (its rot does nothing to the wearer)", "Lead-lined suits (it needs two turns to take the wearer)"],
    failure: ["A power cut (its cell depends on power: ×3 risk instead of ×2)", "Lining left to rot", "A damaged wing"],
    emergency: "Nobody can hold it back. Get bait into the container in the staging room and get everyone else out of its way.",
  },
  "500": {
    cell: "A locked cabinet in a Safe-grade wing. The pills are counted at every shift change.",
    capture: "Arrives by transfer only.",
    bring: [], failure: ["None: it does nothing on its own"], emergency: "None needed.",
  },
  "914": {
    cell: "A room of its own in a Safe-grade wing, with the intake and output booths kept clear.",
    capture: "Arrives by transfer only. Several tons of clockwork: moved by truck.",
    bring: [], failure: ["None while nobody puts a person in it"], emergency: "None needed. Testing with personnel is forbidden.",
  },
  "005": {
    cell: "A lockbox in a Safe-grade wing, ironically.",
    capture: "Arrives by transfer only.",
    bring: [], failure: ["None: it does nothing on its own"], emergency: "None needed.",
  },
  // Phase 4B
  "096": {
    cell: "An airtight steel cube inside a Euclid-grade cell. No camera, window or photograph anywhere near it.",
    routine: { name: "Cell inspection", every: 14, crew: "engineers", n: 1, cost: 5, desc: "An engineer checks the cube's seams for cracks, working blindfolded on the outside. Any image of its face found on site is destroyed.", overdue: "The seams go unchecked: maintenance falls and the breach risk climbs." },
    capture: "Never look at its face. Walk up with your eyes down (or from behind, outside the red wedge), put the hood on it (Hood, 1 action), lead it into the transport container and seal it. Anyone who sees its face is hunted down and killed, and nothing stops it until they are dead.",
    bring: ["The canvas hood (issued)", "Steady operatives who will keep their eyes down", "No D-Class or civilians wandering about in front of it"],
    failure: ["Anyone seeing its face, even in a photograph", "A missed inspection", "A damaged wing or a power cut"],
    emergency: "Eyes down, everyone. If someone has seen it, get everyone else out of its path: it will go through them to reach its target.",
  },
  "012": {
    cell: "A locked room in a Euclid-grade wing. The score is kept in a closed folder and nobody reads it.",
    routine: { name: "Folder check", every: 14, crew: "researcher", n: 1, cost: 0, desc: "A researcher checks, blindfolded, that the folder is still closed. Now and then they feel the urge to look.", overdue: "The folder goes unchecked: maintenance falls and the breach risk climbs." },
    capture: "Anyone who can see it within 7 tiles may be compelled to walk to it and write in their own blood. Approach with eyes down and put it in the folder (Secure the score, 1 action). Shake anyone compelled out of it (1 action, next to them).",
    bring: ["The lined folder (issued)", "Operatives with high sanity", "Medkits for the compelled"],
    failure: ["Anyone reading it", "A missed folder check"],
    emergency: "Keep everyone out of its line of sight and send someone in with their eyes down.",
  },
  "939": {
    cell: "A Keter-grade pen of reinforced concrete, kept dark. Staff never answer a voice they hear from inside it.",
    routine: { name: "Feeding", every: 7, crew: "engineers", n: 1, cost: 5, desc: "An engineer lowers forty kilograms of meat into the pen by winch ($5k).", overdue: "Hungry, it calls staff by name over the intercom: maintenance falls and every guard loses 5 sanity each week." },
    capture: "They are blind and hunt by sound: they go to the last noise they heard. Stay still and quiet and they won't find you. Throw a noisemaker into the transport container, and seal it with an instance inside. They speak in the voices of people you know: don't trust a call for help you can't see.",
    bring: ["Noisemakers (issued)", "Suppressors and Quiet steps", "Flares (they're hard to see in the dark)"],
    failure: ["A missed feeding", "Anyone answering a voice from the pen"],
    emergency: "Silence. Move only when you must, fire only when you must, and lure them with noise.",
  },
  "035": {
    cell: "A lead-lined case in a Keter-grade cell. The case is never opened, and nobody speaks to the mask alone.",
    routine: { name: "Interview", every: 14, crew: "researcher", n: 1, cost: 0, desc: "A researcher interviews it through the case, with a second watching the first. It is charming, and it talks constantly about letting it out.", overdue: "Left alone it works on the guards instead: maintenance falls and the breach risk climbs." },
    capture: "It wears a host until the host rots away. Put the host down, then case the mask where it falls (Case the mask, 1 action) before it reaches anyone else: within 2 tiles it may take a new host, and without a suit so may the person casing it.",
    bring: ["The lead-lined case (issued)", "Hazmat, lead-lined or containment suits (it can't take the wearer)", "Operatives with high sanity: its voice wears them down"],
    failure: ["Anyone opening the case", "Interviews skipped", "A damaged wing or a power cut"],
    emergency: "Nobody touches the mask bare-handed. Put the host down and case it.",
  },
  "682": {
    cell: "A Keter-grade cell filled with hydrochloric acid, which keeps it too busy regrowing to break out. It can't be killed.",
    routine: { name: "Acid bath", every: 7, crew: "engineers", n: 2, cost: 30, desc: "Two engineers drain and refill the acid ($30k).", overdue: "The acid weakens and it heals: maintenance falls three times as fast." },
    capture: "It regenerates and adapts to whatever keeps hurting it. Use different weapons until it collapses (at 0 HP it is down for 2 turns), then drag it into the transport container and seal it before it gets up.",
    bring: ["Varied weapons: rifles, shotguns, explosives, fire", "Heavy armor", "Many operatives to drag it"],
    failure: ["The acid going stale", "A power cut", "Anything at all: it is twice as likely to breach as any other Keter"],
    emergency: "It will wreck its wing on the way out. Don't try to kill it: put it down and drag it into the container.",
  },
};
/** SCP-610 can't be held: it is only ever burned. */
export const PROCEDURE_610: Procedure = {
  cell: "None. SCP-610 cannot be contained.",
  capture: "Burn the core: incendiaries, a flamethrower or fuel drums. Its flesh infects anyone who ends a turn on it without an intact containment suit.",
  bring: ["Containment suits", "M14 incendiary grenades", "An M2 flamethrower (heavy armor)"],
  failure: ["Leaving an outbreak alone (it spreads every week and worsens every two)"],
  emergency: "Answer every outbreak. Nobody infected can be saved.",
};
