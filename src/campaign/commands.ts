// Strategic commands (Strategic overhaul B/C2). Every management action the player can take goes through dispatch():
// the command is validated by the same can*() rule the button shows, and only applied if valid; the result says what
// happened and carries the log entries the action produced as gameplay events. The hub, the tests and the simulator
// all use this entry point, so a rejected command never half-applies and an accepted one can't be applied twice by a
// double click.
import {
  FACILITIES, addRecreation, build, canAddRecreation, canBuild, canDemolish, canExcavate, canRefitGen, canRepair, canUpgrade, demolish, excavate,
  refitGenerator, repair, upgradeFacility, type FacilityType,
} from "./base";
import { canHireEngineer, hireEngineer, type Campaign, type SiteLogEntry } from "./campaign";
import { canClean, cleanCell } from "./containment";
import { PROJECTS, assign, canHireResearcher, canOrder, canOrderAttachment, hireResearcher, order, orderAttachment, type ItemId } from "./research";
import { canFitAttachment, fitTo } from "./armory";
import type { AttachmentId } from "../data/weapons";
import { ALERTS, canHireGuard, hireGuard, postGuard, type Alert } from "./security";

export type Command =
  | { type: "build"; facility: FacilityType; level: number; slot: number }
  | { type: "repair"; facilityId: string }
  | { type: "upgrade"; facilityId: string }
  | { type: "refitGenerator"; facilityId: string }
  | { type: "addRecreation"; facilityId: string }
  | { type: "demolish"; facilityId: string }
  | { type: "excavate" }
  | { type: "assignResearch"; project: string; delta: 1 | -1 }
  | { type: "hireResearcher" }
  | { type: "hireEngineer" }
  | { type: "hireGuard"; stationId: string }
  | { type: "postGuard"; guardId: string; stationId: string }
  | { type: "order"; item: ItemId }
  | { type: "fitAttachment"; opId: string; attachment: AttachmentId | "" }
  | { type: "orderAttachment"; attachment: AttachmentId }
  | { type: "cleanCell"; scpId: string }
  | { type: "setAlert"; level: Alert };

export interface CommandResult { ok: boolean; reason?: string; events: SiteLogEntry[] }

/** Why the command can't be carried out now, or null if it can. */
export function check(c: Campaign, cmd: Command): string | null {
  if (c.over) return "The campaign is over.";
  const fac = (id: string) => c.base.facilities.find(f => f.id === id);
  switch (cmd.type) {
    case "build": return FACILITIES[cmd.facility] ? canBuild(c, cmd.facility, cmd.level, cmd.slot) : "Unknown facility.";
    case "repair": { const f = fac(cmd.facilityId); return f ? canRepair(c, f) : "No such facility."; }
    case "upgrade": { const f = fac(cmd.facilityId); return f ? canUpgrade(c, f) : "No such facility."; }
    case "refitGenerator": { const f = fac(cmd.facilityId); return f ? canRefitGen(c, f) : "No such facility."; }
    case "addRecreation": { const f = fac(cmd.facilityId); return f ? canAddRecreation(c, f) : "No such facility."; }
    case "demolish": { const f = fac(cmd.facilityId); return f ? canDemolish(c, f) : "No such facility."; }
    case "excavate": return canExcavate(c);
    case "assignResearch": return PROJECTS[cmd.project] || cmd.project.startsWith("test_") ? null : "Unknown project.";   // assign() checks the rest as it applies
    case "hireResearcher": return canHireResearcher(c);
    case "hireEngineer": return canHireEngineer(c);
    case "hireGuard": return canHireGuard(c, cmd.stationId);
    case "postGuard": return c.guards.some(g => g.id === cmd.guardId && g.alive) ? null : "No such guard.";
    case "order": return canOrder(c, cmd.item);
    case "fitAttachment": { const o = c.roster.find(x => x.id === cmd.opId); return o ? canFitAttachment(c, o, cmd.attachment) : "No such operative."; }
    case "orderAttachment": return canOrderAttachment(c, cmd.attachment);
    case "cleanCell": { const s = c.scps.find(x => x.id === cmd.scpId); return s ? canClean(c, s) : "No such anomaly."; }
    case "setAlert": return ALERTS[cmd.level] ? null : "Unknown alert level.";
  }
}

/** Carry out a command if it is valid. */
export function dispatch(c: Campaign, cmd: Command): CommandResult {
  const why = check(c, cmd);
  if (why) return { ok: false, reason: why, events: [] };
  const before = c.log.length > 0 ? c.log[0] : null;
  const fac = (id: string) => c.base.facilities.find(f => f.id === id)!;
  let reason: string | null = null;
  switch (cmd.type) {
    case "build": build(c, cmd.facility, cmd.level, cmd.slot); break;
    case "repair": repair(c, fac(cmd.facilityId)); break;
    case "upgrade": upgradeFacility(c, fac(cmd.facilityId)); break;
    case "refitGenerator": refitGenerator(c, fac(cmd.facilityId)); break;
    case "addRecreation": addRecreation(c, fac(cmd.facilityId)); break;
    case "demolish": demolish(c, fac(cmd.facilityId)); break;
    case "excavate": excavate(c); break;
    case "assignResearch": reason = assign(c, cmd.project, cmd.delta); break;
    case "hireResearcher": hireResearcher(c); break;
    case "hireEngineer": hireEngineer(c); break;
    case "hireGuard": hireGuard(c, cmd.stationId); break;
    case "postGuard": postGuard(c, c.guards.find(g => g.id === cmd.guardId)!, cmd.stationId); break;
    case "order": order(c, cmd.item); break;
    case "fitAttachment": fitTo(c, c.roster.find(x => x.id === cmd.opId)!, cmd.attachment); break;
    case "orderAttachment": orderAttachment(c, cmd.attachment); break;
    case "cleanCell": cleanCell(c, c.scps.find(x => x.id === cmd.scpId)!); break;
    case "setAlert": c.alert = cmd.level; break;
  }
  if (reason) return { ok: false, reason, events: [] };
  // the entries this command wrote to the site log, newest first, are its events
  const events: SiteLogEntry[] = [];
  for (const e of c.log) { if (e === before) break; events.push(e); }
  return { ok: true, events };
}
