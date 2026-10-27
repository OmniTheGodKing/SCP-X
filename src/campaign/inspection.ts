// O5 inspections: about every six months, with two weeks' warning, the Council sends someone to
// look the site over. Each of five checks passed is worth $20k; failing three or more costs $50k.
import { powerShort } from "./base";
import { CLEAN_EVERY, isInert } from "./containment";
import { log, type Campaign } from "./campaign";
import { addStanding } from "./council";

export const INSPECTION = { min: 170, max: 190, warn: 14, perCheck: 20, failAt: 3, penalty: 50 };
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export function inspectionChecks(c: Campaign) {
  return [
    { label: "Every cell cleaned on schedule", ok: c.scps.every(s => s.status !== "contained" || isInert(s) || c.day - s.lastCleaned < CLEAN_EVERY) },
    { label: "No damaged facilities", ok: !c.base.facilities.some(f => f.disabled) },
    { label: "Global exposure under 30", ok: c.exposure < 30 },
    { label: "Enough power for the whole site", ok: !powerShort(c) },
    { label: "No open incidents", ok: !c.incidents.length },
  ];
}
export const inspectionSoon = (c: Campaign) => c.inspectionDay !== undefined && c.inspectionDay - c.day <= INSPECTION.warn;

export function inspect(c: Campaign) {
  const checks = inspectionChecks(c), passed = checks.filter(k => k.ok).length, failed = checks.length - passed;
  const audit = !!c.council.audit;
  const bonus = audit ? 0 : passed * INSPECTION.perCheck, docked = failed >= INSPECTION.failAt ? INSPECTION.penalty * (audit ? 2 : 1) : 0;
  c.funds += bonus - docked;
  c.inspectionDay = c.day + rand(INSPECTION.min, INSPECTION.max);
  c.council.audit = undefined;
  const misses = checks.filter(k => !k.ok).map(k => k.label.toLowerCase());
  addStanding(c, audit ? (failed < INSPECTION.failAt ? 10 : -5) : (passed - 3) * 2, audit ? (failed < INSPECTION.failAt ? "passed the O5 audit" : "failed the O5 audit") : `O5 inspection: ${passed} of ${checks.length} checks passed`);
  log(c, `O5 ${audit ? "audit" : "inspection"}: ${passed} of ${checks.length} checks passed${bonus ? ` (+$${bonus}k)` : ""}${misses.length ? `. Noted against Site-19: ${misses.join("; ")}` : ". The inspector found nothing to note"}.${docked ? ` The Council docks $${docked}k for the state of the site.` : ""}`, docked ? "bad" : "good", "command");
}

/** Every day: schedule the first inspection, give two weeks' warning, then hold it. */
export function tickInspection(c: Campaign) {
  if (c.inspectionDay === undefined) { c.inspectionDay = c.day + rand(INSPECTION.min, INSPECTION.max); return; }
  if (c.inspectionDay - c.day === INSPECTION.warn)
    log(c, `An O5 inspector arrives in ${INSPECTION.warn} days. Cells cleaned, nothing broken, exposure low, power steady and no open incidents will all count.`, "key", "command");
  if (c.day >= c.inspectionDay) inspect(c);
}
