// Strategic overhaul E1: who is on which job. The rules count engineers (engineersBusy); this names them, so the
// Site-19 screen can show a crew behind each piece of work. Engineers whose trade suits a job go to it first: masons
// to new building, electricians to repairs and generator refits, machinists to workshop orders, riggers to digging.
// Pure: it reads the campaign and changes nothing.
import { EXCAVATE, FACILITIES, GEN_TIERS, UPGRADE, repairOf } from "./base";
import { present, type Person, type Trade } from "./people";
import type { Campaign } from "./campaign";
import { ITEMS } from "./research";
import { AMMO, ATTACHMENTS } from "../data/weapons";

export interface Job { what: string; need: number; trade?: Trade; days: number }
export interface Crew extends Job { crew: Person[]; short: number }

export function jobs(c: Campaign): Job[] {
  const out: Job[] = [];
  for (const f of c.base.facilities) {
    const name = FACILITIES[f.type].name, lvl = ` (level ${f.level + 1})`;
    if (f.daysLeft > 0) out.push({ what: `Building: ${name}${lvl}`, need: FACILITIES[f.type].engineers, trade: "mason", days: f.daysLeft });
    if (f.repairDays > 0) out.push({ what: `${f.wrecked ? "Rebuilding" : "Repairing"}: ${name}${lvl}`, need: repairOf(f).engineers, trade: "electrician", days: f.repairDays });
    if (f.demolishDays) out.push({ what: `Tearing down: ${name}${lvl}`, need: 1, days: f.demolishDays });
    if (f.upgradeDays) out.push(f.type === "generator"
      ? { what: `Refitting: ${name}${lvl}`, need: GEN_TIERS[(f.genTier ?? 0) + 1]?.engineers ?? 0, trade: "electrician", days: f.upgradeDays }
      : { what: `Expanding: ${name}${lvl}`, need: UPGRADE.engineers, days: f.upgradeDays });
  }
  if (c.base.excavation > 0) out.push({ what: `Excavating level ${c.base.levels + 1}`, need: EXCAVATE.engineers, trade: "rigger", days: c.base.excavation });
  for (const o of c.orders) out.push({ what: `Workshop: ${o.item ? ITEMS[o.item].name : o.attachment ? ATTACHMENTS[o.attachment].name : o.ammo ? AMMO[o.ammo].name : "armor refit"}`, need: 1, trade: "machinist", days: o.daysLeft });
  return out.filter(j => j.need > 0);
}

/** Each job with the people on it. Those with the right trade are placed first, then anyone free; a job left without
 *  enough people is short-handed (after a loss mid-job). */
export function crews(c: Campaign): { crews: Crew[]; idle: Person[] } {
  const pool = [...present(c, "engineer")];
  const take = (pred: (p: Person) => boolean) => { const i = pool.findIndex(pred); return i >= 0 ? pool.splice(i, 1)[0] : null; };
  const list: Crew[] = jobs(c).map(j => ({ ...j, crew: [], short: 0 }));
  // trade matches first, across every job, so one job doesn't take every specialist
  for (const j of list) if (j.trade) { const p = take(x => x.trade === j.trade); if (p) j.crew.push(p); }
  for (const j of list) while (j.crew.length < j.need) { const p = take(() => true); if (!p) break; j.crew.push(p); }
  for (const j of list) j.short = j.need - j.crew.length;
  return { crews: list, idle: pool };
}
