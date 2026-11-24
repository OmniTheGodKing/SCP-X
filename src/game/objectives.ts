// Phase 6: mission objectives as data. A mission with objectives (investigations, and the scenario variants of
// breaches and outbreaks) is won by its primary objectives, not by killing everything: each objective is checked
// against the real mission state, can be hidden until something reveals it, can be added during the mission, and can
// fail. Partial success is what the primary objectives leave undone while secondary ones were met; the debrief and the
// campaign read the objectives one by one.
import { L, WALL } from "../core/grid";
import { S, banner, log } from "./state";
import type { MissionSetup, MissionState, ObjKind, ObjTier, Objective, TacticalOutcome } from "./types";

const o = (id: string, kind: ObjKind, tier: ObjTier, text: string, extra: Partial<Objective> = {}): Objective => ({ id, kind, tier, text, status: "active", ...extra });

/** The objectives a mission starts with, from its kind and variant. Missions without any use their kind's own rules. */
export function objectivesFor(setup: MissionSetup): Objective[] | undefined {
  const v = setup.variant;
  if (setup.kind === "investigation") {
    const n = setup.evidence?.length ?? 0, need = Math.max(1, Math.ceil(n / 2));
    const out = [
      o("evidence", "evidence", "primary", `Examine or bag at least ${need} of the ${n} items of evidence, then get out`, { n: need }),
      o("bag_all", "bag_all", "secondary", "Bring every item of evidence home sealed for the labs (Recover)"),
      o("identify", "identify", "secondary", "Find out what caused this"),
      o("no_civ", "no_civ_deaths", "optional", "Let no local die"),
    ];
    if (setup.evidence?.some(e => e.kind === "remains")) out.push(o("bodies", "recover_bodies", "optional", "Carry the bodies out before anything else can use them"));
    // contained on the spot, if it is here and the team can manage it: found out on the ground
    if (setup.presence) out.push(o("secure", "secure", "secondary", "Contain it here: lead it into the truck's container and seal it", { hidden: true }));
    return out;
  }
  if (setup.kind === "outbreak" && v === "quarantine_perimeter") return [
    o("perimeter", "hold_perimeter", "primary", `Keep the flesh off the edge of the zone for ${setup.holdTurns ?? 10} turns (cordons, firebreaks, fire)`, { turns: setup.holdTurns ?? 10 }),
    o("survivors", "rescue", "secondary", "Evacuate at least half the survivors through an exit"),
    o("core", "burn_core", "secondary", "Burn out the core: the outbreak here ends"),
    o("clean", "clean_extraction", "optional", "Nobody comes out carrying contamination"),
  ];
  if (setup.kind === "outbreak" && v === "survivor_evacuation") return [
    o("survivors", "rescue", "primary", "Evacuate at least half the survivors through an exit"),
    o("core", "burn_core", "secondary", "Burn out the core"),
    o("clean", "clean_extraction", "optional", "Nobody comes out carrying contamination"),
  ];
  if (setup.kind === "outbreak" && v === "sample_recovery") return [
    o("sample", "sample", "primary", "Seal a sample of the growth (Sealed retrieval) and get out"),
    o("survivors", "rescue", "secondary", "Evacuate at least half the survivors"),
    o("clean", "clean_extraction", "optional", "Nobody comes out carrying contamination"),
  ];
  if (setup.kind === "breach" && v === "chamber_security") return [
    o("power", "restore_power", "primary", "Restore power at the panel: the cell doors lock again when it comes back"),
    o("cell", "in_cell", "primary", "Keep SCP-173 inside its cell, watched, until the doors lock"),
    o("secure", "secure", "secondary", "If it gets out of the cell, seal it in the transport container instead"),
    o("no_civ", "no_civ_deaths", "optional", "Lose no researcher"),
  ];
  if (setup.kind === "breach" && v === "breach_evacuation") return [
    o("staff", "staff_out", "primary", "Bring the researchers caught in the wing out through an exit"),
    o("secure", "secure", "secondary", "Contain the anomaly, if it can be done safely"),
    o("no_civ", "no_civ_deaths", "optional", "Lose no researcher"),
  ];
  return undefined;
}

const evidence = (s: MissionState) => s.units.filter(u => u.evidence);
/** Evidence that can no longer be had: a body SCP-049 raised, or an item burned. */
const lostEvidence = (s: MissionState) => evidence(s).filter(u => u.cured || (u.hp <= 0 && u.alive));
const locals = (s: MissionState) => s.units.filter(u => u.side === "civilian" && !u.record && !u.researcher && !u.evidence);
const survivors = (s: MissionState) => s.units.filter(u => (u.side === "civilian" && !u.record && !u.evidence) || u.researcher);
/** Tiles on the edge of the zone: open floor within a tile of the map's border. */
let edgeCache: { w: number; h: number; set: Set<number> } | null = null;
export function zoneEdge(): Set<number> {
  if (edgeCache && edgeCache.w === L.W && edgeCache.h === L.H) return edgeCache.set;
  const set = new Set<number>();
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if ((x <= 1 || y <= 1 || x >= L.W - 2 || y >= L.H - 2) && L.grid[y][x] !== WALL) set.add(y * L.W + x);
  edgeCache = { w: L.W, h: L.H, set };
  return set;
}
export function resetObjectiveCache() { edgeCache = null; }

/** Bring every objective's status up to date. `end`: the mission is over, so anything still open is settled. */
export function evalObjectives(end = false) {
  const s = S;
  if (!s.objectives) return;
  for (const ob of s.objectives) {
    if (ob.status !== "active" && !(ob.kind === "clean_extraction")) continue;
    const prev = ob.status;
    switch (ob.kind) {
      case "evidence": {
        const got = evidence(s).filter(u => u.examined || u.saved).length, possible = evidence(s).length - lostEvidence(s).filter(u => !u.examined).length;
        if (got >= (ob.n ?? 1) && (!end || s.units.some(u => u.side === "mtf" && u.saved && u.alive) || !s.units.some(u => u.side === "mtf" && u.alive && !u.saved))) ob.status = "done";
        else if (possible < (ob.n ?? 1) || end) ob.status = "failed";
        break;
      }
      case "bag_all": if (evidence(s).length && evidence(s).every(u => u.saved)) ob.status = "done"; else if (lostEvidence(s).length || end) ob.status = "failed"; break;
      case "recover_bodies": { const b = evidence(s).filter(u => u.evidence === "remains"); if (b.every(u => u.saved)) ob.status = "done"; else if (b.some(u => u.cured) || end) ob.status = "failed"; break; }
      case "identify": if (s.identified) ob.status = "done"; else if (end) ob.status = "failed"; break;
      case "no_civ_deaths": {
        const pool = ob.id === "no_civ" && s.setup.kind === "breach" ? s.units.filter(u => u.researcher) : locals(s);
        if (pool.some(u => !u.alive)) ob.status = "failed"; else if (end) ob.status = "done"; break;
      }
      case "rescue": {
        const all = survivors(s), need = Math.max(1, Math.ceil(all.length / 2)), out = all.filter(u => u.alive && u.saved).length, could = all.filter(u => u.alive).length;
        if (!all.length) { ob.status = "done"; break; }
        if (out >= need) ob.status = "done"; else if (could < need || end) ob.status = "failed"; break;
      }
      case "staff_out": { const r = s.units.filter(u => u.researcher); if (r.length && r.every(u => u.alive && u.saved)) ob.status = "done"; else if (r.some(u => !u.alive) || end) ob.status = "failed"; break; }
      case "hold_perimeter": {
        const edge = zoneEdge();
        if ([...s.flesh].some(k => edge.has(k))) { ob.status = "failed"; break; }
        if (s.core && s.core.hp <= 0) ob.status = "done";
        else if (s.turn > (ob.turns ?? 10)) ob.status = "done";
        else if (end) ob.status = "failed";
        break;
      }
      case "sample": if ((s.samples ?? 0) >= 1) ob.status = "done"; else if (end) ob.status = "failed"; break;
      case "secure": if (s.sealed) ob.status = "done"; else if (end) ob.status = "failed"; break;
      case "restore_power": if (s.powerOn) ob.status = "done"; else if (end) ob.status = "failed"; break;
      case "in_cell": if (s.relocked) ob.status = "done"; else if (end || s.sealed) ob.status = "failed"; break;
      case "burn_core": if (s.core && s.core.hp <= 0) ob.status = "done"; else if (end) ob.status = "failed"; break;
      case "protect_marked": {
        const t = s.units.find(u => u.id === ob.target);
        if (!t || !t.alive) ob.status = "failed"; else if (s.hooded || s.sealed) ob.status = "done"; else if (t.saved || end) ob.status = t.saved ? "done" : "failed";
        break;
      }
      case "clean_extraction": {
        const dirty = s.units.some(u => u.side === "mtf" && u.saved && u.alive && u.contaminated !== undefined);
        ob.status = dirty ? "failed" : end ? "done" : "active";
        break;
      }
    }
    if (ob.hidden || prev === ob.status || end) continue;
    if (ob.status === "done") log(`Objective complete: ${ob.text}.`, "good");
    else if (ob.status === "failed" && ob.tier === "primary") { log(`Objective failed: ${ob.text}.`, "bad"); banner("OBJECTIVE FAILED", "#d75b47"); }
    else if (ob.status === "failed") log(`Objective lost: ${ob.text}.`, "bad");
  }
}

/** Show a hidden objective, or add a new one during the mission. */
export function revealObjective(id: string, add?: Objective) {
  if (!S.objectives) return;
  let ob = S.objectives.find(x => x.id === id);
  if (!ob && add) { ob = { ...add, dynamic: true }; S.objectives.push(ob); }
  if (!ob || (!ob.hidden && !add)) return;
  ob.hidden = false;
  log(`New objective: ${ob.text}.`, "key");
  banner("NEW OBJECTIVE", "#e0b050");
}
export const visibleObjectives = () => (S.objectives ?? []).filter(o => !o.hidden);
const primaries = () => (S.objectives ?? []).filter(o => o.tier === "primary" && !o.hidden);

/** Checked with the mission's other end conditions: whether it is over now, and won. */
export function objectiveEnd(teamLeft: boolean): { over: boolean; win: boolean } | null {
  if (!S.objectives) return null;
  evalObjectives();
  const p = primaries();
  // chamber security: the power comes back with SCP-173 inside its cell, and the doors lock on it
  if (S.setup.variant === "chamber_security" && S.powerOn && !S.relocked && S.cellRoom && S.statue.alive) {
    const [x0, y0, x1, y1] = S.cellRoom, st = S.statue;
    if (st.x >= x0 && st.x <= x1 && st.y >= y0 && st.y <= y1) {
      S.relocked = true; S.sealed = true;
      log("The power comes back and the cell doors slam shut with SCP-173 inside. It is contained.", "good");
      banner("CELL LOCKED", "#86c193");
      evalObjectives();
      return { over: true, win: true };
    }
  }
  // ending at once: the anomaly sealed, the core burned out, or the cordon held for its time (relief takes over)
  if (S.sealed && S.setup.kind !== "outbreak") return { over: true, win: p.every(o => o.status === "done" || o.kind === "evidence" || o.kind === "staff_out") };
  if (S.core && S.core.hp <= 0 && S.setup.kind === "outbreak") return { over: true, win: p.every(o => o.status === "done" || o.kind === "rescue" || o.kind === "sample") };
  const hold = p.find(o => o.kind === "hold_perimeter");
  if (hold?.status === "done") { log("The cordon holds. Relief units take over the line and the team is pulled out.", "good"); return { over: true, win: true }; }
  if (hold?.status === "failed" && !S.objectives.some(o => o.status === "active" && !o.hidden && o.tier !== "optional")) return { over: true, win: false };
  if (!teamLeft) return { over: true, win: p.length > 0 && p.every(o => o.status === "done") };
  return { over: false, win: false };
}

/** The tactical containment outcome (Part 9) for any mission, from how it ended. */
export function tacticalOutcome(win: boolean, evacuated: boolean): TacticalOutcome {
  const s = S, k = s.setup.kind, obs = s.objectives ?? [];
  const done = (kind: ObjKind) => obs.some(o => o.kind === kind && o.status === "done");
  if (s.sealed) return "secured";
  if (k === "outbreak" && s.core && s.core.hp <= 0) return "secured";
  if (s.lostTo) return "failed";
  if (s.escaped && k !== "investigation") return "escaped";
  if (done("hold_perimeter")) return "isolated";
  if (k === "breach" && s.setup.variant === "breach_evacuation" && done("staff_out")) return "temporary";
  if (k === "investigation") return done("evidence") ? "evidence" : evacuated ? "abandoned" : "failed";
  if (done("rescue") || done("sample")) return "evacuated";
  if (evacuated) return "abandoned";
  if (!win) return "failed";
  return k === "breach" || k === "manhunt" || k === "outbreak" ? "secured" : "none";
}
