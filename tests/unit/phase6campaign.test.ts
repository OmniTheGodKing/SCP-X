// Phase 6 campaign: the dossier (knowledge, lab analysis, identification), storylines (an investigation instead of a
// capture order, the encounter that follows, SCP-096's mark, the world moving on), uniqueness, strategic placement and
// chamber features in breach risk, temporary containment, people missing to SCP-106, SCP-610's variant operations,
// anomaly-aware hands-off resolution, and save round trips. Investigations are played headless through the real
// buildSetup, createMission, missionResult and applyResult.
import { test, eq, ok } from "./harness";
import { newCampaign, advanceDay, applyResult, buildSetup, type Campaign, type Incident } from "../../src/campaign/campaign";
import { foundSite } from "../../src/campaign/org";
import { ensureDossier, fileOf, canSpawnAnomaly, placementOptions, receiveRecovered, MISSING, tickDossier } from "../../src/campaign/dossier";
import { firstSighting, breachRisk, captureNow } from "../../src/campaign/containment";
import { dispatch } from "../../src/campaign/commands";
import { tickArcs, arcOf } from "../../src/campaign/storylines";
import { assessTeam } from "../../src/campaign/autoteam";
import { checkInvariants } from "../../src/campaign/invariants";
import { createMission } from "../../src/game/mission";
import { S, pace, computeVis } from "../../src/game/state";
import { checkEnd } from "../../src/game/turn";
import { useAbility } from "../../src/game/abilities";
import { passable } from "../../src/core/grid";
import type { MissionResult, Unit } from "../../src/game/types";

pace.headless = true;
function founded(seed = 31): Campaign {
  const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed });
  ok(!foundSite(c, { designation: "Site-64", name: "Site-64", lon: -77, lat: 39 }), "site founded");
  ensureDossier(c);
  return c;
}
const ready = (c: Campaign) => c.roster.filter(o => o.alive).slice(0, 3);
function play(c: Campaign, inc: Incident, act: () => void): MissionResult {
  const setup = buildSetup(c, inc, ready(c).map(o => ({ opId: o.id, armor: "", items: [] })), 0);
  createMission(setup);
  act();
  for (const u of S.units) if (u.side === "mtf" && u.alive) { u.saved = true; const k = S.units.find(v => v.id === u.carrying); if (k) k.saved = true; }
  checkEnd();
  ok(S.over, "mission over");
  return S.result!;
}
function beside(u: Unit, t: Unit) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (passable(t.x + dx, t.y + dy) && !S.units.some(v => v.alive && v !== u && v.x === t.x + dx && v.y === t.y + dy)) { u.x = t.x + dx; u.y = t.y + dy; computeVis(); return; }
}

test("dossier: a founded site's SCP-173 is the Provisional Site-11 instance; the article's stays at Site-19", () => {
  const c = founded();
  c.scps = [{ id: "173", name: "SCP-173", title: "The Sculpture", cls: "Euclid", status: "contained", wingId: c.base.facilities.find(f => /cont/.test(f.type))?.id ?? "", maintenance: 100, lastCleaned: 1 }];
  c.dossier = undefined; ensureDossier(c);
  eq(c.scps[0].instance, "173:p11", "instance id");
  eq(fileOf(c, "173:p11")!.location, "player", "the player's");
  eq(c.dossier!["173"].location, "elsewhere", "the article's");
  eq(c.dossier!["173"].holder, "Site-19", "held by Site-19");
});

test("storylines: SCP-049's first word is an investigation, not a capture order, and isn't duplicated", () => {
  const c = founded();
  firstSighting(c, "049");
  const inc = c.incidents.find(i => i.scpId === "049")!;
  eq(inc.kind, "investigation", "an investigation");
  ok(inc.evidence!.length >= 3 && inc.first, "with evidence, unidentified");
  ok(!/049/.test(inc.title), "the title doesn't name it");
  eq(canSpawnAnomaly(c, "049"), false, "no second incident while one is open");
  firstSighting(c, "049");
  eq(c.incidents.filter(i => i.scpId === "049").length, 1, "still one");
  eq(arcOf(c, "049")!.stage, "reports", "arc at its first stage");
});

test("investigation to encounter: examined and bagged evidence fill the file; the capture incident follows with intel", () => {
  const c = founded(5);
  firstSighting(c, "049");
  const inc = c.incidents.find(i => i.scpId === "049")!;
  inc.presence = false;
  const r = play(c, inc, () => {
    const ev = S.units.filter(u => u.evidence), [a, b] = S.units.filter(u => u.side === "mtf");
    const med = ev.find(u => u.evidence === "medical")!; beside(a, med); a.ap = 2; useAbility(a, "examine", med);
    const body = ev.find(u => u.evidence === "testimony")!; beside(b, body); b.ap = 2; useAbility(b, "examine", body);
    const rec = ev.find(u => u.evidence === "remains")!; beside(a, rec); a.ap = 2; useAbility(a, "pickup", rec);
  });
  ok(r.win && r.outcome === "evidence", "won on evidence");
  applyResult(c, r);
  const f = fileOf(c, "049")!;
  ok(f.known.includes("lethal_touch"), "the lethal touch is known");
  ok(f.stage !== "unknown", `stage ${f.stage}`);
  ok(f.pending.length >= 1, "a body went to the labs");
  const enc = c.incidents.find(i => i.scpId === "049" && i.kind === "recovery");
  ok(enc && enc.stage === "encounter", "the encounter follows");
  eq(checkInvariants(c).join("; "), "", "invariants hold");
  const setup = buildSetup(c, enc!, ready(c).filter(o => !o.busy).map(o => ({ opId: o.id, armor: "", items: [] })), 0);
  ok(setup.intel && setup.intel.known.includes("lethal_touch"), "the team going in knows it");
  c.activeIncident = undefined;
  // the labs finish, and the encounter left unanswered moves the story on rather than vanishing
  for (let d = 0; d < 9; d++) advanceDay(c);
  eq(fileOf(c, "049")!.pending.length, 0, "analysis done");
  eq(checkInvariants(c).join("; "), "", "invariants still hold");
});

test("SCP-096: a marked operative brings the encounter on a deadline; leaving it unanswered kills them; the world moves on", () => {
  const c = founded(9);
  firstSighting(c, "096");
  const inc = c.incidents.find(i => i.scpId === "096")!;
  let markedId = "";
  const r = play(c, inc, () => {
    const photo = S.units.find(u => u.evidence === "photograph")!, a = S.units.find(u => u.side === "mtf")!;
    beside(a, photo); a.ap = 2; useAbility(a, "examine", photo); markedId = a.opId!;
    const t = S.units.find(u => u.evidence === "testimony")!, b = S.units.filter(u => u.side === "mtf")[1]; beside(b, t); b.ap = 2; useAbility(b, "examine", t);
  });
  ok(r.marked!.includes(markedId), "marked op comes home marked");
  applyResult(c, r);
  ok(c.marked!.some(m => m.opId === markedId), "the campaign remembers the mark");
  const enc = c.incidents.find(i => i.scpId === "096" && i.markedOp === markedId)!;
  ok(enc, "an encounter on a deadline");
  ok(fileOf(c, "096")!.known.includes("face_trigger"), "what the face does is known now");
  // nobody goes
  while (c.day <= enc.expires) advanceDay(c);
  advanceDay(c);
  const o = c.roster.find(x => x.id === markedId)!;
  eq(o.alive, false, "it reached them");
  ok(!c.marked!.some(m => m.opId === markedId), "mark cleared");
});

test("placement: no chamber meets SCP-096's needs: it waits at the dock; temporary holding raises breach risk until screening exists", () => {
  const c = founded();
  c.funds = 5000;
  captureNow(c, "096");
  const s = c.scps.find(x => x.id === "096")!;
  eq(s.status, "holding", "at the dock");
  ok(c.placement?.scpId === "096", "a decision is waiting");
  const opts = placementOptions(c, "096");
  ok(opts.some(o => o.kind === "transfer") && opts.some(o => o.kind === "assist"), "transfer and assistance offered");
  const temp = opts.find(o => o.kind === "temporary" || o.kind === "emergency");
  if (temp) {
    const res = dispatch(c, { type: "placeAnomaly", scpId: "096", kind: temp.kind, wingId: temp.wingId });
    ok(res.ok, res.reason ?? "");
    eq(s.status, "contained", "in a wing");
    const before = breachRisk(c, s);
    ok(before.why.some(w => /image screening/.test(w)), "missing feature in the reasons: " + before.why.join(", "));
    c.research.done.push("image_screening");
    ok(breachRisk(c, s).p < before.p, "screening lowers it");
  }
  // with nothing decided, the Council sends it away after the deadline
  const c2 = founded(2); captureNow(c2, "096");
  for (let d = 0; d < 5 && c2.scps.some(x => x.id === "096" && x.status === "holding"); d++) { c2.day++; tickDossier(c2); }
  ok(!c2.scps.some(x => x.id === "096" && x.status === "holding"), "not left at the dock");
});

test("SCP-106: the taken are missing, not dead, until a search finds them or time runs out", () => {
  const c = founded();
  const o = ready(c)[0];
  const r = { incidentId: "x", win: false, evacuated: true, turns: 3, squad: [{ opId: o.id, alive: false, hp: 0, san: 50, kills: 0, sealed: false, hasArmor: false, items: [], witnessed: 0, panics: 0, minHp: 0, bestStreak: 0 }],
    escaped: false, zombiesKilled: 0, pocketReturned: 0, researchersRescued: 0, researchersLost: 0, straysLost: 0, straysEscaped: 0, infectedLost: 0, coreBurned: false, riotersKilled: 0,
    photos: [], restraints: false, aftercare: false, prisoners: 0, civiliansKilled: 0, witnessesEscaped: 0, witnessesDosed: 0, amnesticsUsed: 0, known: [], dSent: 0, dReturned: 0, dRecruited: 0, dLost: 0,
    insurgentsDown: 0, insurgentsTotal: 0, missing: [o.id] } as MissionResult;
  applyResult(c, r);
  ok(o.alive, "not dead");
  eq(o.busy?.kind, "missing", "missing");
  ok(c.missing!.some(m => m.opId === o.id), "on the missing list");
  c.day += MISSING.lostAfter; tickDossier(c);
  eq(o.alive, false, "confirmed lost after long enough");
});

test("SCP-610: variant operations appear beside the outbreak; a held line pauses its growth", () => {
  const c = founded();
  c.outbreak = { region: "europe", severity: 3, lastMission: c.day };
  c.incidents.push({ id: "inc900", kind: "outbreak", scpId: "", region: "europe", map: "farm", title: "Incident 900: SCP-610 outbreak, severity 3", appeared: c.day, expires: c.day + 99999, insurgents: 0 });
  tickArcs(c); c.day += 3; tickArcs(c);
  ok(c.incidents.some(i => i.variant === "quarantine_perimeter"), "quarantine operation");
  ok(c.incidents.some(i => i.variant === "survivor_evacuation"), "evacuation at severity 3");
  eq(checkInvariants(c).join("; "), "", "variant operations don't break the outbreak invariant");
  c.outbreak.quarantinedUntil = c.day + 30; c.outbreak.lastMission = c.day - 20;
  for (let i = 0; i < 14; i++) advanceDay(c);
  eq(c.outbreak?.severity, 3, "held: it doesn't grow");
});

test("hands-off: firepower can't secure SCP-096 when nothing is known; knowing the procedures matters", () => {
  const c = founded();
  const inc: Incident = { id: "inc901", kind: "recovery", scpId: "096", first: true, region: "east_us", map: "farm", title: "Incident 901: test", appeared: c.day, expires: c.day + 9, insurgents: 0 };
  const blind = assessTeam(c, inc, ready(c));
  ok(blind.primary <= 0.3, `capped without knowledge (${blind.primary})`);
  ok(blind.factors.some(([w]) => /Gunfire does nothing/.test(w)), "gunfire factor stated");
  fileOf(c, "096")!.known.push("face_trigger", "image_carrier", "docile");
  ok(assessTeam(c, inc, ready(c)).primary > blind.primary, "knowledge raises the odds");
});

test("save: the dossier, storylines and missing survive a JSON round trip and repeated migration", () => {
  const c = founded();
  firstSighting(c, "106");
  fileOf(c, "106")!.known.push("phasing");
  const back = JSON.parse(JSON.stringify(c)) as Campaign;
  ensureDossier(back);
  eq(back.dossier!["106"].known.includes("phasing"), true, "knowledge kept");
  eq(back.arcs!["106"].stage, "reports", "arc kept");
  eq(back.incidents.filter(i => i.scpId === "106").length, 1, "no rediscovery on load");
  void receiveRecovered;
});
