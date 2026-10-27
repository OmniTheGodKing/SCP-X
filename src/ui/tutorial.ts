// The tutorial (Phase 3K): one short tip per screen the first time it matters, and a few steps through the first
// mission. Each can be dismissed, and the whole thing turned off.
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
