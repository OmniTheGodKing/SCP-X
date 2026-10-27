// Anomalies held at Site-19: daily breach risk, cell cleaning, breaches, and escapes.
import { FACILITIES, isContainment, nameInText, neighbors, operational, powerShort, type Facility } from "./base";
import { blinkFullOf, log, maxSanOf, type Campaign, type Incident, type Operative } from "./campaign";

export type ScpClass = "Safe" | "Euclid" | "Keter";
const CLASS_GRADE: Record<ScpClass, number> = { Safe: 0, Euclid: 1, Keter: 2 };
const BASE_RISK: Record<ScpClass, number> = { Safe: 0.02, Euclid: 0.06, Keter: 0.1 };

export const CLEAN_EVERY = 7;            // days between scheduled cleanings
const DECAY = 4;                         // maintenance lost per day
export const BREACH_WINDOW = 2;          // days to answer a breach
export const RECOVERY_WINDOW = 3;        // days to answer a sighting
export const MOVE_COST = 20;

export interface ScpRecord {
  id: string;
  name: string;
  title: string;
  cls: ScpClass;
  status: "contained" | "breach" | "loose";
  wingId: string;
  maintenance: number;     // 0–100
  lastCleaned: number;
  resurfaceDay?: number;
}

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const SITES = ["Site-17", "Site-23", "Site-43", "Area-12", "Site-62", "Site-81", "Area-14"];

export const wingOf = (c: Campaign, s: ScpRecord) => c.base.facilities.find(f => f.id === s.wingId) || null;
export const occupantOf = (c: Campaign, f: Facility) => c.scps.find(s => s.wingId === f.id) || null;
const securityNear = (c: Campaign, f: Facility) => neighbors(c, f).filter(n => n.type === "security" && operational(n)).length;

/** Chance per day that this anomaly breaches, with the reasons, for display. */
export function breachRisk(c: Campaign, s: ScpRecord) {
  const why: string[] = [];
  const wing = wingOf(c, s);
  if (s.status !== "contained" || !wing) return { p: 0, why };
  let p = BASE_RISK[s.cls];
  why.push(`${s.cls} class: ${Math.round(p * 100)}% base`);
  const grade = FACILITIES[wing.type].grade ?? 0, need = CLASS_GRADE[s.cls];
  if (grade < need) { p *= 3; why.push("Wing is below its class: ×3"); }
  else if (grade > need) { p *= 0.5; why.push("Wing is above its class: ×0.5"); }
  const m = 1 + (100 - s.maintenance) / 50;
  if (m > 1.01) why.push(`Maintenance ${s.maintenance}%: ×${m.toFixed(1)}`);
  p *= m;
  const sec = securityNear(c, wing);
  if (sec) { p *= 0.7 ** sec; why.push(`${sec} security station${sec > 1 ? "s" : ""} next door: ×${(0.7 ** sec).toFixed(2)}`); }
  if (wing.disabled) { p *= 3; why.push("Wing damaged: ×3"); }
  if (powerShort(c)) { p *= 2; why.push("Power shortage: ×2"); }
  return { p: Math.min(0.9, p), why };
}

// Chance that, on a day a breach goes unanswered, the anomaly gets out of Site-19 entirely.
export function escapeChance(c: Campaign, s: ScpRecord) {
  const wing = wingOf(c, s);
  return Math.max(0.05, 0.25 - 0.08 * (wing ? securityNear(c, wing) : 0));
}

function startBreach(c: Campaign, s: ScpRecord, cause: string) {
  const wing = wingOf(c, s)!;
  s.status = "breach";
  const inc: Incident = {
    id: "inc" + c.nextIncident,
    kind: "breach",
    scpId: s.id,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${s.name} breach, ${nameInText(wing.type)} on level ${wing.level + 1}`,
    appeared: c.day,
    expires: c.day + BREACH_WINDOW,
    insurgents: Math.min(4, rand(0, 2) + Math.floor((c.day - 1) / 60)),
  };
  c.nextIncident++;
  c.incidents.push(inc);
  log(c, `${cause} ${s.name} is out of its cell. Respond within ${BREACH_WINDOW} days before it gets out of the site.`, "bad");
}

function goDark(c: Campaign, s: ScpRecord, why: string) {
  s.status = "loose";
  s.resurfaceDay = c.day + rand(10, 30);
  log(c, `${why} ${s.name} has escaped Site-19. Nobody knows where it is.`, "bad");
}

function resurface(c: Campaign, s: ScpRecord) {
  const where = SITES[rand(0, SITES.length - 1)];
  const inc: Incident = {
    id: "inc" + c.nextIncident,
    kind: "recovery",
    scpId: s.id,
    title: `Incident ${String(c.nextIncident).padStart(3, "0")}: ${s.name} sighted at ${where}`,
    appeared: c.day,
    expires: c.day + RECOVERY_WINDOW,
    insurgents: Math.min(5, rand(2, 3) + Math.floor((c.day - 1) / 60)),
  };
  c.nextIncident++;
  c.incidents.push(inc);
  s.resurfaceDay = undefined;
  c.exposure = Math.min(100, c.exposure + 5);
  log(c, `${s.name} has turned up at ${where}, with witnesses (+5 exposure). Recover it within ${RECOVERY_WINDOW} days.`, "bad");
}

/** One day of containment: wear, breaches, unanswered breaches spreading or escaping, sightings. */
export function tickContainment(c: Campaign) {
  for (const s of c.scps) {
    if (s.status === "contained") {
      s.maintenance = Math.max(0, s.maintenance - DECAY);
      if (Math.random() < breachRisk(c, s).p) startBreach(c, s, "Containment alarm.");
    } else if (s.status === "loose") {
      c.exposure = Math.min(100, c.exposure + 1);
      if (s.resurfaceDay !== undefined && c.day >= s.resurfaceDay) resurface(c, s);
    }
  }
  for (const inc of [...c.incidents]) {
    const s = c.scps.find(x => x.id === inc.scpId);
    if (!s || inc.appeared === c.day) continue;
    const drop = () => { c.incidents = c.incidents.filter(i => i !== inc); };
    if (inc.kind === "breach") {
      if (c.day > inc.expires) {
        drop(); c.exposure = Math.min(100, c.exposure + 15); c.stats.missed++;
        goDark(c, s, `Nobody answered ${inc.title.split(":")[0]} (+15 exposure).`);
        continue;
      }
      const wing = wingOf(c, s);
      if (wing && Math.random() < 0.4) {
        const hit = neighbors(c, wing).filter(n => n.type !== "command" && !n.disabled && n.daysLeft === 0);
        if (hit.length) {
          const n = hit[rand(0, hit.length - 1)];
          n.disabled = true;
          log(c, `${s.name} tore through the ${nameInText(n.type)} on level ${n.level + 1}. It's out of action until repaired.`, "bad");
        }
      }
      if (Math.random() < escapeChance(c, s)) {
        drop(); c.exposure = Math.min(100, c.exposure + 10); c.stats.missed++;
        goDark(c, s, "The breach wasn't contained in time (+10 exposure).");
      }
    } else if (c.day > inc.expires) {
      drop(); c.exposure = Math.min(100, c.exposure + 15); c.stats.missed++;
      goDark(c, s, `The sighting went unanswered (+15 exposure).`);
    }
  }
}

/** Mission outcome for the anomaly an incident was about. */
export function resolveScp(c: Campaign, inc: Incident, recovered: boolean) {
  const s = c.scps.find(x => x.id === inc.scpId);
  if (!s) return;
  if (recovered) {
    s.status = "contained";
    s.maintenance = Math.max(s.maintenance, 60);
    s.resurfaceDay = undefined;
  } else {
    goDark(c, s, "The team couldn't stop it.");
  }
}

// ---- cleaning and moving: D-Class work inside the cell while operatives watch ----

const watcherBlink = (o: Operative) => {
  const full = blinkFullOf(o);
  return full + (0.5 - full) * (1 - Math.min(o.san, maxSanOf(o)) / maxSanOf(o));
};
/** Chance a D-Class dies doing work in the cell: everyone watching blinks at once. Site guards watch if nobody is assigned. */
export const workRisk = (watchers: Operative[]) => watchers.length ? watchers.reduce((p, o) => p * watcherBlink(o), 1) : 0.25;

export function canClean(c: Campaign, s: ScpRecord): string | null {
  if (s.status !== "contained") return `${s.name} isn't in its cell.`;
  if (c.dclass < 1) return "Needs a D-Class.";
  return null;
}

function cellWork(c: Campaign, s: ScpRecord, watchers: Operative[], what: string) {
  const risk = workRisk(watchers);
  for (const o of watchers) o.san = Math.max(0, o.san - 8);
  const names = watchers.length ? watchers.map(o => o.name).join(" and ") : "site guards";
  if (Math.random() < risk) {
    c.dclass--;
    log(c, `During ${what}, ${names} blinked at the same moment. The D-Class inside was killed.`, "bad");
    if (Math.random() < 0.3) { startBreach(c, s, "It got past the door."); return false; }
    return true;
  }
  log(c, `${what[0].toUpperCase() + what.slice(1)} done, watched by ${names}.`, "good");
  return true;
}

export function cleanCell(c: Campaign, s: ScpRecord, watchers: Operative[]) {
  if (canClean(c, s)) return;
  if (cellWork(c, s, watchers, `cleaning of ${s.name}'s cell`)) { s.maintenance = 100; s.lastCleaned = c.day; }
}

export function canMove(c: Campaign, s: ScpRecord, to: Facility): string | null {
  if (s.status !== "contained") return `${s.name} isn't in its cell.`;
  if (!isContainment(to.type) || !operational(to)) return "Not a working containment wing.";
  if (occupantOf(c, to)) return "That wing is occupied.";
  if ((FACILITIES[to.type].grade ?? 0) < CLASS_GRADE[s.cls]) return `A ${s.cls}-class anomaly needs at least a ${s.cls}-grade wing.`;
  if (c.dclass < 1) return "Needs a D-Class.";
  if (c.funds < MOVE_COST) return `Needs $${MOVE_COST}k.`;
  return null;
}

export function moveScp(c: Campaign, s: ScpRecord, to: Facility, watchers: Operative[]) {
  if (canMove(c, s, to)) return;
  c.funds -= MOVE_COST;
  if (cellWork(c, s, watchers, `the transfer of ${s.name}`) && s.status === "contained") {
    s.wingId = to.id;
    log(c, `${s.name} now held in the ${nameInText(to.type)} on level ${to.level + 1}.`, "key");
  }
}

export function startingScps(wingId: string): ScpRecord[] {
  return [{ id: "173", name: "SCP-173", title: "The Sculpture", cls: "Euclid", status: "contained", wingId, maintenance: 100, lastCleaned: 1 }];
}
