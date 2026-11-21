// The tutorial (Phase 3K): one short tip per screen the first time it matters, and a few steps through the first
// mission. Each can be dismissed, and the whole thing turned off.
import type { Campaign } from "../campaign/campaign";
import { researchersAssigned } from "../campaign/research";
export interface Tip { id: string; tab: string; title: string; text: string }
export const HUB_TIPS: Tip[] = [
  { id: "welcome", tab: "command", title: "Site-19 Command", text: "This is where incidents land, the O5 Council's orders arrive and the site log runs. Nothing happens until time passes: open the World tab and let the clock run. Incidents will come to you." },
  { id: "world", tab: "world", title: "The World Map", text: "Time only runs here. Pause with Space, or run it at 1×, 2× and 4× (keys 1, 2, 3). Markers are incidents: click one to read its briefing, then Prepare a response. A region shows its front, its weather and what you can do there." },
  { id: "deploy", tab: "plan", title: "Sending a squad", text: "Pick up to four operatives who are fully healed and rested, give each a loadout, and deploy. Far-off incidents mean a flight: the plane crosses the map while time runs and the mission starts when it lands." },
  { id: "site", tab: "site", title: "The site", text: "Build into empty slots, repair what breaks, and keep each anomaly's routine on schedule. Click a facility to manage it: hiring, upgrades and everything else live in its own panel." },
  { id: "research", tab: "research", title: "Research", text: "Put researchers on projects; each adds a day of work per day. New projects appear as you capture anomalies, fight the Insurgency and take prisoners." },
  { id: "personnel", tab: "personnel", title: "Personnel", text: "Your operatives: rank, class, fatigue, injuries and bonds. Rest the tired ones; operatives who fight together grow closer and fight better side by side." },
];
export const MISSION_STEPS = [
  { title: "Select", text: "Click one of your operatives (the numbered blue circles), or press Tab to cycle. Their card on the right shows HP, sanity and gear." },
  { title: "Move", text: "Blue tiles cost one action, amber tiles both. Click a tile to move there. Hover first: the preview shows who could see you." },
  { title: "Cover", text: "Shield marks show cover: half cover beside desks, full cover beside walls and pillars. Shots against someone in cover lose 20 or 40 aim." },
  { title: "Shoot", text: "Click a visible enemy to fire. The number under each one is your chance to hit, and the tooltip explains it. Flanking (no cover between you) is +10." },
  { title: "Overwatch and end turn", text: "Overwatch (O) fires at the first enemy who moves in sight. When everyone has acted, End turn (E): then the enemies move." },
  { title: "Objective and leaving", text: "The objective card on the right says what wins. Optional objectives earn extra. Stand on an exit and use Exfiltrate to leave; anyone not out is left behind." },
];

// ---------- Strategic overhaul E2: onboarding with the Chief of Operations ----------
// Krista Carter walks a new Site Director through the first weeks, one step at a time. Steps with a goal close
// themselves when it is met; the others close with "Got it". Progress is kept in the campaign (c.tutorial.seen), so
// it survives saving, and it can be skipped a step at a time or switched off. The steps read the campaign; they never
// change it.

export const CARTER = { name: "Krista Carter", title: "Chief of Operations, Site-19" };
export interface Step { id: string; tab: string; title: string; text: string; goal?: string; done?: (c: Campaign) => boolean }
export const ONBOARDING: Step[] = [
  { id: "ob-welcome", tab: "command", title: "Welcome to Site-19",
    text: "Director, I'm Krista Carter, Chief of Operations. I'll keep this short. This screen is Command. The Director's Briefing on the left lists what needs a decision, worst first, and every item has a button that takes you to it. If the list is empty, nothing is waiting on you." },
  { id: "ob-time", tab: "world", title: "Let time run", goal: "Let three days pass.",
    text: "Nothing happens at Site-19 until time passes, and it only passes on this map. Press 1, 2 or 3 (or the buttons above the map) to run the clock, and Space to stop it. Incidents appear as markers; the clock stops itself when something needs you.",
    done: c => c.day >= 4 },
  { id: "ob-respond", tab: "world", title: "Answer an incident", goal: "Finish one incident, win or lose.",
    text: "When a marker appears, select it to read the briefing, then prepare a response: choose up to four operatives, check their kit, and deploy. Far-off incidents mean a flight first. You will not be able to answer everything. Choosing what to leave is part of the job.",
    done: c => c.stats.won + c.stats.lost >= 1 },
  { id: "ob-build", tab: "site", title: "Build something", goal: "Start building in an empty slot.",
    text: "This is the facility, level by level. Select an empty slot to build: a second generator is rarely wasted. Select a room to repair, upgrade or staff it. With nothing selected, the panel beside it shows power, containment risk over the next month, and which engineers are on which job.",
    done: c => c.base.facilities.length > 6 },
  { id: "ob-research", tab: "research", title: "Put the researchers to work", goal: "Assign a researcher to a project.",
    text: "Researchers sitting idle are the most common waste I see. Put them on projects with the + buttons; each one adds a day's work per day. Experiments on the anomalies themselves are on the right: riskier, but they fill in the files and speed up that anomaly's research.",
    done: c => researchersAssigned(c) > 0 },
  { id: "ob-people", tab: "personnel", title: "Your operatives", text: "Epsilon-11 is small and it does not grow back quickly. Watch fatigue and sanity here, rest people who need it, and spend promotions when they come up. The dead stay dead." },
  { id: "ob-money", tab: "command", title: "The Council and the money", text: "The O5 Council pays Site-19 on the first of each month, more when your standing is high. The Finances panel shows the next ninety days of scheduled money and where the balance is heading. Below 25 standing the Council sends an auditor. That's everything from me, Director. The briefing will tell you when I'm needed." },
];
/** The step the Director is on, or null once all are seen (or the briefings are off). */
export const currentStep = (c: Campaign): Step | null => c.tutorial?.on ? ONBOARDING.find(s => !c.tutorial!.seen.includes(s.id)) ?? null : null;
/** Steps whose goal is met are marked seen. Returns true if anything changed. */
export function advanceOnboarding(c: Campaign): boolean {
  let moved = false;
  for (let s = currentStep(c); s?.done && s.done(c); s = currentStep(c)) { c.tutorial!.seen.push(s.id); moved = true; }
  return moved;
}
