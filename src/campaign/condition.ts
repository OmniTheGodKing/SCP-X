// How an operative is holding up between missions (Phase 3K): fatigue that builds with every deployment and wears off
// with rest, serious injuries that keep someone off the roster for weeks, and bonds formed by going in together.
import type { Campaign, Operative } from "./campaign";
import type { MissionResult } from "../game/types";
import { countOperational } from "./base";

export const FATIGUE = { perMission: 20, wounded: 10, broke: 10, restPerDay: 4, restPsych: 2, tired: 40, exhausted: 70, aim: -5, san: 10 };
export type Tiredness = "fresh" | "tired" | "exhausted";
export const tiredness = (o: Operative): Tiredness => (o.fatigue ?? 0) >= FATIGUE.exhausted ? "exhausted" : (o.fatigue ?? 0) >= FATIGUE.tired ? "tired" : "fresh";

const INJURIES = [
  { name: "Broken arm", days: [18, 28] }, { name: "Cracked ribs", days: [12, 20] }, { name: "Gunshot wound to the leg", days: [20, 32] },
  { name: "Concussion", days: [10, 16] }, { name: "Shrapnel in the back", days: [16, 26] }, { name: "Torn shoulder", days: [14, 24] },
];
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
/** A serious injury: off the roster until it heals, whatever their HP says. The medical bay shortens it. */
export function injure(c: Campaign, o: Operative): string {
  const k = INJURIES[Math.floor(Math.random() * INJURIES.length)];
  const days = Math.round(rand(k.days[0], k.days[1]) * (countOperational(c, "medical") ? 0.7 : 1));
  o.injury = { name: k.name, until: c.day + days };
  return `${o.call} ${o.name} is seriously hurt: ${k.name.toLowerCase()}, out for ${days} days${countOperational(c, "medical") ? " (shortened by the medical bay)" : ""}.`;
}
export const injured = (c: Campaign, o: Operative) => !!o.injury && o.injury.until > c.day;

export const BOND_AT = [3, 6, 10];
export const BOND_NAMES = ["", "Comrades", "Close", "Inseparable"];
/** +aim when a bonded squadmate is within 4 tiles and in sight, by bond level. */
export const BOND_AIM = [0, 3, 5, 8];
export const bondLevel = (missions: number) => BOND_AT.filter(n => missions >= n).length;
export const bondsOf = (o: Operative) => Object.entries(o.bonds ?? {}).map(([id, n]) => ({ id, n, level: bondLevel(n) })).filter(b => b.level > 0);

/** After a mission: fatigue for everyone who went, serious injuries for anyone who went down, and shared missions
 *  for every pair who came back together. Returns lines for the debrief. */
export function afterMission(c: Campaign, r: MissionResult): string[] {
  const out: string[] = [];
  const went = r.squad.filter(s => !s.absent).map(s => ({ s, o: c.roster.find(x => x.id === s.opId) })).filter(x => x.o) as { s: MissionResult["squad"][number]; o: Operative }[];
  for (const { s, o } of went) {
    if (!o.alive) continue;
    o.fatigue = Math.min(100, (o.fatigue ?? 0) + FATIGUE.perMission + (s.minHp < o.maxHp ? FATIGUE.wounded : 0) + (s.panics ? FATIGUE.broke : 0));
    if (s.minHp <= 0) out.push(injure(c, o));
    if (tiredness(o) === "exhausted") out.push(`${o.call} ${o.name} is exhausted and needs rest before going out again.`);
  }
  const back = went.filter(x => x.o.alive);
  for (const a of back) for (const b of back) if (a !== b) {
    const before = bondLevel(a.o.bonds?.[b.o.id] ?? 0);
    (a.o.bonds ??= {})[b.o.id] = (a.o.bonds[b.o.id] ?? 0) + 1;
    const now = bondLevel(a.o.bonds[b.o.id]);
    if (now > before && a.o.id < b.o.id) out.push(`${a.o.name} and ${b.o.name} are now ${BOND_NAMES[now].toLowerCase()}: +${BOND_AIM[now]} aim fighting near each other.`);
  }
  // losing a bondmate stays with you
  for (const dead of went.filter(x => !x.o.alive)) for (const a of back) {
    const lv = bondLevel(a.o.bonds?.[dead.o.id] ?? 0);
    if (!lv) continue;
    a.o.san = Math.max(1, a.o.san - 10 * lv);
    if (lv >= 2 && !a.o.traits.includes("nightmares") && Math.random() < 0.5) a.o.traits.push("nightmares");
    (a.o.lostBonds ??= []).push(dead.o.name);
    out.push(`${a.o.name} lost ${dead.o.name}, ${BOND_NAMES[lv].toLowerCase() === "comrades" ? "a comrade" : "someone close"}. It shows.`);
  }
  return out;
}
/** A day at Site-19: rest, and injuries healing. */
export function restDay(c: Campaign, o: Operative) {
  if (o.busy?.kind === "travel") return;
  o.fatigue = Math.max(0, (o.fatigue ?? 0) - FATIGUE.restPerDay - (countOperational(c, "psych") ? FATIGUE.restPsych : 0));
  if (o.injury && o.injury.until <= c.day) o.injury = undefined;
}
