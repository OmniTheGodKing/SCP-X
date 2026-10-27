// Staff incidents: small things that go wrong (or right) among the people who run Site-19. About
// once a month one comes up on the Command tab with two choices, each with a clear cost. Left
// unanswered for a week, the second choice (usually letting it go) is taken for you.
import { ITEMS, type ItemId } from "./research";
import { RANKS, holdingCapacity, log, retire, trainerWhy, type Campaign, type Operative } from "./campaign";

export type StaffEventId = "breakdown" | "asleep" | "engineer" | "mole" | "discovery" | "letter" | "shortfall" | "visitor" | "retire";
export interface StaffEvent { id: StaffEventId; who?: string; item?: ItemId; until: number; }
interface Choice { label: string; why?: (c: Campaign, e: StaffEvent) => string | null; run: (c: Campaign, e: StaffEvent) => string; }
interface EventDef { title: string; when: (c: Campaign) => boolean; setup?: (c: Campaign, e: StaffEvent) => void; text: (c: Campaign, e: StaffEvent) => string; choices: [Choice, Choice]; }

export const STAFF_ANSWER_DAYS = 7, LAX_DAYS = 30, LEAVE_DAYS = 10;
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const op = (c: Campaign, e: StaffEvent) => c.roster.find(o => o.id === e.who);
const guard = (c: Campaign, e: StaffEvent) => c.guards.find(g => g.id === e.who);
const opName = (c: Campaign, e: StaffEvent) => { const o = op(c, e); return o ? `${o.call} ${o.name}` : "The operative"; };
const veteran = (o: Operative) => o.alive && !o.busy && o.missions >= 10 && !o.refusedRetire;
const busiest = (c: Campaign) => Object.entries(c.research.assigned).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0]?.[0];

export const STAFF_EVENTS: Record<StaffEventId, EventDef> = {
  breakdown: {
    title: "A researcher's breakdown",
    when: c => c.researchers >= 1,
    text: () => "A researcher came out of a test session shaking and hasn't slept in three days. They say they're fine and want to keep working.",
    choices: [
      { label: `Send them to psychological services (one fewer researcher for ${LEAVE_DAYS} days)`, run: c => {
        c.researchers--; (c.away ??= []).push({ kind: "researcher", back: c.day + LEAVE_DAYS });
        return `The researcher is on leave for ${LEAVE_DAYS} days.`; } },
      { label: "Keep them working (30% chance they quit)", run: c => {
        if (Math.random() < 0.3) { c.researchers = Math.max(0, c.researchers - 1); return "A week later the researcher handed in their badge and left. They didn't say goodbye."; }
        return "The researcher held together. Nobody mentions the test again."; } },
    ],
  },
  asleep: {
    title: "A guard asleep on post",
    when: c => c.guards.some(g => g.alive),
    setup: (c, e) => { e.who = pick(c.guards.filter(g => g.alive)).id; },
    text: (c, e) => `Guard ${guard(c, e)?.name ?? "on the night shift"} was found asleep at their post outside a containment wing. Nothing got out this time.`,
    choices: [
      { label: "Dock their pay (that guard −10 sanity)", run: (c, e) => { const g = guard(c, e); if (g) g.san = Math.max(1, g.san - 10); return `${g?.name ?? "The guard"} loses a week's pay and takes it hard.`; } },
      { label: `Let it slide (every guard −5 aim for ${LAX_DAYS} days)`, run: c => { c.laxUntil = c.day + LAX_DAYS; return "Word gets round that nothing happened to them. Site Security gets sloppy."; } },
    ],
  },
  engineer: {
    title: "An engineer injured",
    when: c => c.engineers >= 1,
    text: () => "A support beam slipped during work on the lower levels and crushed an engineer's legs. The infirmary can't do much; a specialist in Baltimore can.",
    choices: [
      { label: "Pay for the specialist ($20k)", why: c => c.funds < 20 ? "Needs $20k." : null, run: c => { c.funds -= 20; return "The engineer will walk again, and is back on shift within the week."; } },
      { label: "Pension them off (one fewer engineer)", run: c => { c.engineers = Math.max(0, c.engineers - 1); return "The engineer is pensioned off with an amnestic and a story about a car accident."; } },
    ],
  },
  mole: {
    title: "Theft from the armoury",
    when: c => c.day > 60,
    text: () => "A crate of carbine ammunition and a set of floor plans have gone missing from the armoury. Someone inside is passing things to the Chaos Insurgency.",
    choices: [
      { label: "Investigate (2 Intel; the mole goes to holding)", why: c => c.intel < 2 ? "Needs 2 Intel." : null, run: c => {
        c.intel -= 2;
        if (c.prisoners.length < holdingCapacity(c)) { c.prisoners.push({ name: "the armoury mole", days: 0, intel: 0 }); return "Security finds the mole, a quartermaster's clerk. They're in holding for interrogation."; }
        return "Security finds the mole, a quartermaster's clerk. With no room in holding, they're handed to Internal Security."; } },
      { label: "Ignore it (the next Insurgents you fight have +1 armor)", run: c => { c.moleArmor = true; return "The thefts stop, but the Insurgency now knows what our rounds can and can't get through."; } },
    ],
  },
  discovery: {
    title: "A researcher's discovery",
    when: c => c.researchers >= 1,
    text: c => `A junior researcher has worked something out on their own time.${busiest(c) ? "" : " Nothing is being researched right now, so it can only be circulated."}`,
    choices: [
      { label: "Put it into the current research (+10 researcher-days)", why: c => busiest(c) ? null : "No research under way.", run: c => {
        const id = busiest(c)!; c.research.progress[id] = (c.research.progress[id] || 0) + 10; return "The finding goes straight into the lab's current work."; } },
      { label: "Circulate it to other sites (+$30k)", run: c => { c.funds += 30; return "Site-17 and Site-23 both want copies. The O5 Council approves a small grant."; } },
    ],
  },
  letter: {
    title: "A letter from home",
    when: c => c.roster.some(o => o.alive && !o.busy),
    setup: (c, e) => { e.who = pick(c.roster.filter(o => o.alive && !o.busy)).id; },
    text: (c, e) => `${opName(c, e)} has had a letter: their mother is very ill. They're asking for leave to go home.`,
    choices: [
      { label: "Grant leave (away 5 days, +20 sanity)", run: (c, e) => { const o = op(c, e); if (o && o.alive) { o.busy = { kind: "travel", daysLeft: 5 }; o.san = Math.min(o.san + 20, 100 + o.rank * 5 + (o.sanBonus ?? 0)); } return `${opName(c, e)} goes home for a few days.`; } },
      { label: "Refuse (−10 sanity)", run: (c, e) => { const o = op(c, e); if (o) o.san = Math.max(1, o.san - 10); return `${opName(c, e)} stays on duty and writes back instead.`; } },
    ],
  },
  shortfall: {
    title: "A short shipment",
    when: c => Object.values(c.inventory).some(n => (n ?? 0) > 0),
    setup: (c, e) => { e.item = pick((Object.keys(c.inventory) as ItemId[]).filter(k => (c.inventory[k] ?? 0) > 0)); },
    text: (c, e) => `The quartermaster reports this month's supply run came in short, and stores are pulling from what we have. We'll be down one ${ITEMS[e.item!]?.name.toLowerCase() ?? "item"}.`,
    choices: [
      { label: "Buy replacements ($15k)", why: c => c.funds < 15 ? "Needs $15k." : null, run: c => { c.funds -= 15; return "Stores are made up from a civilian supplier."; } },
      { label: "Make do (lose the item)", run: (c, e) => { if (e.item && c.inventory[e.item]) c.inventory[e.item]!--; return `One ${ITEMS[e.item!]?.name.toLowerCase() ?? "item"} is gone from stores.`; } },
    ],
  },
  retire: {
    title: "A request to retire",
    when: c => c.roster.some(veteran),
    setup: (c, e) => { e.who = c.roster.filter(veteran).sort((a, b) => b.rank - a.rank)[0].id; },
    text: (c, e) => { const o = op(c, e); if (!o) return "An operative has asked to retire.";
      const t = trainerWhy(c, o);
      return `${RANKS[o.rank]} ${o.name} has served on ${o.missions} missions and has asked to step back from the field. ${t ? `They would leave with an honourable discharge (${t.charAt(0).toLowerCase() + t.slice(1, -1)}).` : "They would stay on as a trainer: new recruits would arrive as Specialists."}`; },
    choices: [
      { label: "Let them retire", run: (c, e) => { const o = op(c, e); if (o) retire(c, o); return "The request is granted."; } },
      { label: "Ask them to stay (they may develop Nightmares after each mission)", run: (c, e) => { const o = op(c, e); if (o) o.refusedRetire = true; return `${opName(c, e)} stays on. They don't ask again.`; } },
    ],
  },
  visitor: {
    title: "A visiting researcher",
    when: c => c.scps.some(s => s.status === "contained"),
    setup: (c, e) => { e.who = pick(c.scps.filter(s => s.status === "contained")).id; },
    text: (c, e) => `A researcher from Site-17 asks to study ${c.scps.find(s => s.id === e.who)?.name ?? "one of our anomalies"} in its cell for a week. Their site will pay, but the extra traffic wears the cell down.`,
    choices: [
      { label: "Allow it (+$25k; that cell's maintenance −20)", run: (c, e) => { const s = c.scps.find(s => s.id === e.who); c.funds += 25; if (s) s.maintenance = Math.max(0, s.maintenance - 20); return "The visitor gets their week, and Site-17 pays for it."; } },
      { label: "Refuse", run: () => "Site-17 is told the cell is closed to visitors." },
    ],
  },
};

/** On the first of the month: maybe something comes up. */
export function monthlyStaff(c: Campaign, force?: StaffEventId) {
  if (c.staffEvent || (!force && Math.random() >= 0.6)) return;
  const ids = (Object.keys(STAFF_EVENTS) as StaffEventId[]).filter(id => STAFF_EVENTS[id].when(c));
  const id = force ?? (ids.length ? pick(ids) : null);
  if (!id) return;
  const e: StaffEvent = { id, until: c.day + STAFF_ANSWER_DAYS };
  STAFF_EVENTS[id].setup?.(c, e);
  c.staffEvent = e;
  log(c, `Staff: ${STAFF_EVENTS[id].title.toLowerCase()}. It needs your decision on the Command tab.`, "key", "command");
}

export function answerStaff(c: Campaign, i: 0 | 1, auto = false) {
  const e = c.staffEvent;
  if (!e) return;
  const ch = STAFF_EVENTS[e.id].choices[i];
  if (!auto && ch.why?.(c, e)) return;
  c.staffEvent = undefined;
  log(c, `${STAFF_EVENTS[e.id].title}: ${auto ? "nobody decided, so it was let go. " : ""}${ch.run(c, e)}`, "key");
}

/** Every day: staff on leave come back, and an unanswered incident decides itself. */
export function tickStaff(c: Campaign) {
  for (const a of (c.away ?? []).filter(a => a.back <= c.day)) {
    if (a.kind === "researcher") c.researchers++; else c.engineers++;
    log(c, `A ${a.kind} is back from leave.`);
  }
  if (c.away) c.away = c.away.filter(a => a.back > c.day);
  if (c.staffEvent && c.staffEvent.until <= c.day) answerStaff(c, 1, true);
}
