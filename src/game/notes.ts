// SCP-173's containment file. The first entries are known from the start; field notes
// are revealed as the team observes its behaviour during a mission.
export interface Note { id: string; text: string; cls?: string; }

export const NOTES_173: Note[] = [
  { id: "class", text: "Item #: SCP-173 · Object Class: Euclid" },
  { id: "proc", text: "Special Containment Procedures (summary): keep SCP-173 in a locked container. Personnel entering its presence go in groups of three or more, and two of them maintain direct eye contact at all times, announcing before they blink." },
  { id: "desc", text: "Description (summary): a figure built from concrete and rebar, with traces of Krylon spray paint. It cannot move while in a direct line of sight. When line of sight is broken it moves extremely fast, and it kills by snapping the neck at the base of the skull or by strangulation." },
  { id: "src", cls: "src", text: "Source: “SCP-173” by Moto42, scpwiki.com/scp-173, licensed CC BY-SA 3.0." },
  { id: "hold", text: "Field note: one person with their eyes open is enough to hold it. Staring takes focus, so whoever is staring manages one action per turn." },
  { id: "blink", text: "Field note: the chance to blink rises as sanity falls, and D-Class blink more often than trained operatives. Calling the blink lets it move at a moment you choose." },
  { id: "drag", text: "Field note: while someone else holds it with their eyes, it is just very heavy concrete. D-Class can drag it two tiles at a time; operatives manage one." },
  { id: "hunt", text: "Field note: it hunts whoever isn't looking: anyone mid-blink, looking away or with their eyes shut. It can kill several people in one move if nobody sees it." },
  { id: "hear", text: "Field note: it cannot see through walls, but it hears gunfire and heads for roughly where it came from. When it has nothing to go on, it searches room by room." },
  { id: "cont", text: "Field note: it passes through the open container like any other room. It only stays inside if it freezes there or is dragged in." },
  { id: "mind", text: "Field note: holding its gaze wears people down. Operatives shut their eyes at zero sanity; D-Class break and run." },
  { id: "arms", text: "Field note: small-arms fire has no effect on SCP-173." },
  { id: "ci", text: "Field note: Chaos Insurgency operatives are in the wing. They are armed and fight from cover." },
];
export const STARTING_NOTES = ["class", "proc", "desc", "src"];
