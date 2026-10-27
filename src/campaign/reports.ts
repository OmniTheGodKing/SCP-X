// Incident reports: after every mission, a short typed report in the Foundation's style, built from
// what actually happened. They're kept in the Archive on the Command tab.
import type { MissionResult } from "../game/types";
import { REGIONS } from "../data/regions";
import { scpName } from "./containment";
import type { Campaign, Incident } from "./campaign";

export interface Report {
  number: string; day: number; title: string; location: string; win: boolean;
  personnel: string[]; lost: string[]; anomaly?: string; account: string[];
}

const list = (a: string[]) => a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
const n = (k: number, one: string, many = one + "s") => `${k} ${k === 1 ? one : many}`;

export function buildReport(c: Campaign, inc: Incident | undefined, r: MissionResult): Report {
  const kind = inc?.kind ?? "breach", scp = inc?.scpId ? scpName(inc.scpId) : undefined;
  const who = (id: string) => { const o = c.roster.find(x => x.id === id); if (o) return `${o.call} ${o.name}`; const g = c.guards.find(x => x.id === id); return g ? `Guard ${g.name}` : id; };
  const there = r.squad.filter(s => !s.absent);
  const personnel = there.map(s => who(s.opId)), lost = there.filter(s => !s.alive).map(s => who(s.opId));
  const sealers = there.filter(s => s.sealed && s.alive).map(s => who(s.opId));
  const location = kind === "breach" || kind === "riot" ? "Site-19" : inc ? REGIONS[inc.region].name : "Unknown";
  const subject = inc ? inc.title.split(": ")[1] ?? inc.title : "Incident";
  const a: string[] = [];
  const team = there.some(s => c.roster.some(o => o.id === s.opId)) ? "Mobile Task Force Epsilon-11" : "Site Security";
  a.push(`${team} was deployed${kind === "breach" ? " inside Site-19" : location === "Site-19" ? "" : ` to ${location}`}. The operation lasted ${n(r.turns, "turn")}.`);
  if (r.win) {
    a.push(
      kind === "riot" ? `Order in the D-Class block was restored${r.riotersKilled ? ` at the cost of ${n(r.riotersKilled, "inmate")}` : " without loss of life among the inmates"}.`
      : kind === "coverup" ? `${n(r.witnessesDosed, "witness", "witnesses")} received Class-A amnestics. The cover story holds.`
      : kind === "strike" ? `The Chaos Insurgency cell was neutralised${r.prisoners ? ` and ${n(r.prisoners, "prisoner")} taken` : ""}.`
      : kind === "retaliation" ? "The Insurgency attack on the town was broken."
      : kind === "escort" ? `The convoy held, and ${scp ?? "the anomaly"} reached the airfield.`
      : kind === "outbreak" ? (r.coreBurned ? "The flesh core was burned out and the area sterilised." : "The infected area was held.")
      : sealers.length ? `${list(sealers)} sealed ${scp ?? "the anomaly"} into the transport container.`
      : `${scp ?? "The anomaly"} was returned to containment.`);
  } else {
    a.push(r.escaped ? `${scp ?? "The anomaly"} left the site through the surface hatch. Its whereabouts are unknown.`
      : r.evacuated ? "The team withdrew before the objective was secured."
      : kind === "riot" ? "Site Security withdrew from the block; the riot ended on its own."
      : "The objective was not achieved.");
  }
  a.push(lost.length ? `Killed in the course of the operation: ${list(lost)}.` : "No Foundation personnel were lost.");
  const extra: string[] = [];
  if (r.researchersRescued) extra.push(`${n(r.researchersRescued, "researcher")} recovered alive`);
  if (r.researchersLost) extra.push(`${n(r.researchersLost, "researcher")} lost`);
  if (r.dLost) extra.push(`${n(r.dLost, "D-Class", "D-Class")} expended`);
  if (r.straysEscaped) extra.push(`${n(r.straysEscaped, "D-Class", "D-Class")} escaped the site`);
  if (r.civiliansKilled) extra.push(`${n(r.civiliansKilled, "civilian")} killed`);
  if (r.witnessesEscaped) extra.push(`${n(r.witnessesEscaped, "witness", "witnesses")} not amnesticised`);
  if (r.insurgentsTotal) extra.push(`${r.insurgentsDown} of ${r.insurgentsTotal} hostiles neutralised`);
  if (r.infectedLost) extra.push(`${n(r.infectedLost, "operative")} lost to infection; remains incinerated`);
  if (extra.length) a.push(`Also recorded: ${list(extra)}.`);
  return { number: inc ? inc.title.split(":")[0].replace("Incident ", "") : "—", day: c.day, title: subject, location, win: r.win, personnel, lost, anomaly: scp, account: a };
}
