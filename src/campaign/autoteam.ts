// Task force dispatch (requested during 4I): with a second task force formed, Site-19 can answer a second incident at
// the same time, but hands-off, like leaving a breach to Site Security: the team flies out, the outcome is rolled at
// the odds shown, and it comes back through the ordinary debrief (rewards, failures, wounds, deaths, experience).
import type { MissionResult } from "../game/types";
import { applyResult, deployable, log, type Campaign, type Incident, type Operative } from "./campaign";
import { flightOut } from "./world";
import { reportOf } from "./geo";
import { forfeitGroup } from "./council";
import { tfOf } from "./taskforces";

export const AUTO_KINDS: Incident["kind"][] = ["recovery", "coverup", "strike", "retaliation", "rescue", "emergency"];
export const AUTO = { min: 2, max: 4 };
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** Who could go: anyone fit, from either task force. */
export function canDispatch(c: Campaign, inc: Incident, ops: Operative[]): string | null {
  if (!c.tf.eta10) return "Needs a second task force (Eta-10) to send a team without you.";
  if (!AUTO_KINDS.includes(inc.kind)) return "This one has to be played, or left to Site Security.";
  if (inc.dispatch) return "Already being handled.";
  if (c.outbound?.incId === inc.id) return "Your squad is already on its way there.";
  if (ops.length < AUTO.min) return `Pick at least ${AUTO.min} operatives.`;
  if (ops.length > AUTO.max) return `A hands-off team is at most ${AUTO.max} operatives.`;
  if (ops.some(o => !deployable(c, o))) return "Everyone sent has to be fit to deploy.";
  if (new Set(ops.map(tfOf)).size > 1) return "A team is one task force: send Epsilon-11 or Eta-10, not both.";
  return null;
}

/** The chance the team succeeds without you: more and better operatives help, a bigger opposition hurts. */
export function dispatchOdds(c: Campaign, inc: Incident, ops: Operative[]) {
  const ins = Math.max(0, (inc.insurgents || reportOf(inc).ins) - (inc.weakened ?? 0));
  const power = ops.reduce((a, o) => a + 1 + o.rank * 0.25 + ((o.aimBase ?? 65) - 65) / 40 + (o.cls ? 0.15 : 0), 0);
  const kind = inc.kind === "coverup" ? 0.25 : inc.kind === "recovery" || inc.kind === "emergency" || inc.kind === "rescue" ? -0.1 : 0;
  return Math.max(0.1, Math.min(0.9, 0.3 + 0.12 * power - 0.07 * ins + kind));
}

/** Send them: they fly out, and the result comes in when they get there. */
export function dispatchTeam(c: Campaign, inc: Incident, ops: Operative[]) {
  if (canDispatch(c, inc, ops)) return;
  const t = Math.max(1, flightOut(c, inc));
  inc.dispatch = { how: "squad", done: c.day + t, doses: 0, ops: ops.map(o => o.id), odds: dispatchOdds(c, inc, ops) };
  forfeitGroup(c, inc);
  for (const o of ops) o.busy = { kind: "travel", daysLeft: t + 30, out: true };   // home again after the result
  log(c, `${ops.map(o => `${o.call} ${o.name}`).join(", ")} ${ops.length > 1 ? "are" : "is"} on the way to ${inc.title.split(": ")[1]} without you (${Math.round(inc.dispatch.odds! * 100)}% chance). Result ${t === 1 ? "tomorrow" : `in ${t} days`}.`, "key");
}

/** The team arrives: roll the outcome and put it through the ordinary debrief. */
export function resolveTeam(c: Campaign, inc: Incident) {
  const d = inc.dispatch!, ops = (d.ops ?? []).map(id => c.roster.find(o => o.id === id)).filter((o): o is Operative => !!o && o.alive);
  for (const o of ops) o.busy = undefined;
  const win = Math.random() < (d.odds ?? 0.5);
  const ins = Math.max(0, inc.insurgents - (inc.weakened ?? 0));
  const down = win ? ins : rand(0, Math.floor(ins / 2));
  const squad = ops.map((o, i) => {
    const died = Math.random() < (win ? 0.04 : 0.22), hurt = !died && Math.random() < (win ? 0.25 : 0.55);
    const hp = died ? 0 : hurt ? Math.max(1, o.hp - rand(2, 4)) : o.hp;
    return { opId: o.id, alive: !died, hp, san: Math.max(10, o.san - rand(5, win ? 15 : 30)), kills: Math.floor(down / ops.length) + (i < down % ops.length ? 1 : 0),
      sealed: false, hasArmor: false, items: [], witnessed: died ? 0 : rand(0, 1), panics: 0, minHp: hp, bestStreak: 0 };
  });
  const wit = inc.witnesses ?? 0;
  const r: MissionResult = {
    incidentId: inc.id, win, evacuated: !win, turns: 0, squad, escaped: false, zombiesKilled: 0, pocketReturned: 0,
    researchersRescued: 0, researchersLost: 0, straysLost: 0, straysEscaped: 0, infectedLost: 0, coreBurned: false, riotersKilled: 0,
    survivorsSaved: inc.kind === "rescue" && win ? inc.survivors ?? 0 : 0, survivorsTotal: inc.survivors,
    photos: [], restraints: false, aftercare: false, prisoners: 0, civiliansKilled: inc.kind === "retaliation" && !win ? rand(1, 3) : 0,
    witnessesEscaped: inc.kind === "coverup" && !win ? wit : 0, witnessesDosed: inc.kind === "coverup" && win ? wit : 0, amnesticsUsed: inc.kind === "coverup" && win ? Math.min(wit, c.amnestics) : 0,
    known: [], dSent: 0, dReturned: 0, dRecruited: 0, dLost: 0, insurgentsDown: down, insurgentsTotal: ins,
  };
  inc.dispatch = undefined;
  const debrief = applyResult(c, r);
  log(c, `Hands-off team at ${inc.title.split(": ")[1]}: ${win ? "they did it" : "it went wrong"}. ${debrief.lines.join(" ")}`, win ? "good" : "bad", "command");
}
