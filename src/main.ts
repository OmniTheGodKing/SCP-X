import "./styles.css";
import { briefing } from "./campaign/geo";
import { advanceDay, applyResult, buildSetup, log, newCampaign, refreshRecruits, resolveInterrupted, type Campaign, type Debrief, type Incident } from "./campaign/campaign";
import { clearCampaign, loadCampaign, saveCampaign, slotSummary, useSlot } from "./campaign/save";
import { REGIONS } from "./data/regions";
import { missionWeather, nightAt } from "./campaign/geo";
import { forfeitGroup } from "./campaign/council";
import { flightOut, stormDelay, travelBlock, transportName } from "./campaign/world";
import { letGuardsHandle } from "./campaign/security";
import { scpName } from "./campaign/containment";
import { pendingBreach } from "./campaign/campaign";
import { createMission } from "./game/mission";
import { endMission, forceRng } from "./core/rng";
import * as geom from "./core/geom";
import { S } from "./game/state";
import type { MissionKind, MissionResult, MissionSetup } from "./game/types";
import { mountHub, openTab } from "./ui/hubView";
import { L } from "./core/grid";
import { fireLine, sightFrom } from "./core/sight";
import { blastStructure, openDoor, opaque, passable } from "./core/grid";
import { canShoot, coverAgainst, fire, lineOfFire, moveUnit, shotInfo } from "./game/combat";
import { canSee, computeVis, pace } from "./game/state";
import { emitNoise, settleFacing } from "./game/noise";
import { endTurn, reachFor } from "./game/turn";
import * as scp4b from "./game/scp4b";
import { generateTown } from "./data/towngen";
import { mountMission } from "./ui/missionView";
import { esc } from "./ui/util";
import { mountDebug } from "./ui/debug";
import { dispatch, type Command } from "./campaign/commands";
import { directorsBriefing } from "./campaign/briefing";
import { checkInvariants } from "./campaign/invariants";
import { openLab } from "./ui/lab";
import { movePreview } from "./game/preview";
import { transition } from "./ui/audio";
import { mountMenu } from "./ui/menu";
import { mountDebrief, mountMtfFound, mountSitePick } from "./ui/founding";
import { beginOpening, closeOpening, openingIncident, openingLoadouts } from "./campaign/opening";
import { bindCampaign } from "./campaign/org";
import * as org from "./campaign/org";
import * as squadtech from "./game/squadtech";
import * as gridMod from "./core/grid";
import * as cameraMod from "./ui/camera";
import * as campaignMod from "./campaign/campaign";
import * as autoteam from "./campaign/autoteam";
import * as researchMod from "./campaign/research";
import * as securityMod from "./campaign/security";
import { SPECIALTIES, SPECS } from "./data/mtf";

const root = document.getElementById("app")!;
/** ?legacy skips the title screen and the Phase 5 opening: a first visit starts a Site-19 campaign at the hub, as
 *  before. The automated tests use it. */
const LEGACY = new URLSearchParams(location.search).has("legacy");
let campaign: Campaign = loadCampaign() ?? newCampaign({ difficulty: "agent", ironman: false, tutorial: true });   // a first visit starts with the tutorial on
resolveInterrupted(campaign);
if (!campaign.recruits) refreshRecruits(campaign);   // saves from before the recruit pool
bindCampaign(campaign);
if (LEGACY) saveCampaign(campaign);

const WIN: Record<MissionKind, [string, string]> = {
  breach: ["Recontained", "%s is sealed in the transport container."],
  manhunt: ["Recovered", "%s is sealed in the truck's container."],
  coverup: ["Contained", "Every witness has been dosed."],
  strike: ["Cell broken", "The Insurgency cell is out of action."],
  raid: ["Raid repelled", "The lift held. The Insurgency is gone back through the wire."],
  riot: ["Riot over", "The D-Class block is back under control."],
  outbreak: ["Burned out", "SCP-610's core here is ash."],
  escort: ["Convoy safe", "The convoy is moving again with its cargo."],
  retaliation: ["Town held", "The Insurgency attack is broken."],
  rescue: ["Team found", "The survivors are coming home."],
  emergency: ["Emergency answered", "The team pulled out with what it could save."],
};
function debriefHtml(r: MissionResult, d: Debrief, kind: MissionKind, scp: string) {
  return `
    <div class="stampmark ${r.win ? "win" : "lose"}">${r.win ? WIN[kind][0] : r.evacuated ? "Evacuated" : "Mission failed"}</div>
    <h3>${r.win ? WIN[kind][1].replace("%s", scp) : r.evacuated ? "Epsilon-11 pulled out." : kind === "raid" ? "The Insurgency got into Site-19." : "Epsilon-11 did not come back."}</h3>
    <ul class="debrief">${[...d.lines, ...d.promotions].map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    <dl>
      <dt>Turns</dt><dd>${r.turns}</dd>
      <dt>Operatives lost</dt><dd>${r.squad.filter(s => !s.alive).length} / ${r.squad.length}</dd>
      <dt>D-Class lost</dt><dd>${r.dLost}</dd>
      <dt>Insurgents down</dt><dd>${r.insurgentsDown} / ${r.insurgentsTotal}</dd>
      ${kind === "coverup" ? `<dt>Witnesses dosed</dt><dd>${r.witnessesDosed} · ${r.witnessesEscaped} got away</dd>` : ""}
      ${r.civiliansKilled ? `<dt>Civilians killed</dt><dd>${r.civiliansKilled}</dd>` : ""}
    </dl>`;
}

let screen: "hub" | "mission" = "hub";
/** Start a mission now and come back to the World Map after its debrief. */
function launch(setup: MissionSetup, inc: Incident, after?: (r: MissionResult) => void) {
  saveCampaign(campaign);
  createMission(setup);
  screen = "mission";
  let result: MissionResult | null = null;
  mountMission(root, () => { endMission(); transition.returnHome(); if (after && result) { after(result); return; } openTab("world", "reg:" + inc.region); showHub(); }, r => {
    endMission();
    result = r;
    const d = applyResult(campaign, r);
    saveCampaign(campaign);
    return debriefHtml(r, d, setup.kind, scpName(setup.scp ?? "173"));
  });
}

// ---------- Phase 5: title screen, the opening mission, founding the site and the first MTF ----------
function showMenu() {
  screen = "hub";
  mountMenu(root, {
    newGame: o => {
      useSlot(o.slot); clearCampaign();
      campaign = newCampaign({ difficulty: o.difficulty, ironman: o.ironman, tutorial: true });
      beginOpening(campaign); bindCampaign(campaign); saveCampaign(campaign);
      route();
    },
    load: slot => { const c = useSlot(slot); if (!c) return; campaign = c; resolveInterrupted(campaign); bindCampaign(campaign); saveCampaign(campaign); route(); },
  });
}
/** Take a campaign to wherever it is: the opening mission, a founding step, or the hub. */
function route() {
  switch (campaign.phase) {
    case "opening": {
      const inc = openingIncident(campaign) ?? beginOpening(campaign);
      const setup = buildSetup(campaign, inc, openingLoadouts(campaign), 2);
      setup.title = inc.title;
      setup.mtfTurn = 1;   // the detachment is already on site: the player commands it from the first turn
      launch(setup, inc, r => {
        mountDebrief(root, campaign, r.win, () => { closeOpening(campaign, r.win); saveCampaign(campaign); route(); });
      });
      return;
    }
    case "site": mountSitePick(root, campaign, () => { saveCampaign(campaign); route(); }); return;
    case "mtf": mountMtfFound(root, campaign, () => {
      const m = campaign.mtfs![0];
      log(campaign, `${m.designation} "${m.name}" is chartered at ${campaign.site!.designation}: ${m.squads.map(s => `${s.name} (${SPECIALTIES[s.specialty].name})`).join(" and ")}.`, "key");
      saveCampaign(campaign); openTab("command"); showHub();
    }); return;
    default: showHub();
  }
}
function showHub() {
  screen = "hub";
  mountHub(root, campaign, {
    save: () => saveCampaign(campaign),
    newCampaign: (opts, slot) => { useSlot(slot); clearCampaign(); campaign = newCampaign(opts); if (!LEGACY) beginOpening(campaign); bindCampaign(campaign); saveCampaign(campaign); openTab("command"); route(); },
    menu: () => { saveCampaign(campaign); showMenu(); },
    newMtf: () => mountMtfFound(root, campaign, () => {
      const m = campaign.mtfs![campaign.mtfs!.length - 1];
      log(campaign, `${m.designation} "${m.name}" is chartered at ${campaign.site?.designation ?? "the site"}: ${SPECS[m.spec].name}.`, "key");
      saveCampaign(campaign); openTab("personnel"); showHub();
    }, { first: false, cancel: () => showHub() }),
    loadSlot: slot => {
      if (!slotSummary(slot)) return;   // nothing there: stay put
      saveCampaign(campaign);
      const c = useSlot(slot);
      if (c) { campaign = c; resolveInterrupted(campaign); bindCampaign(campaign); saveCampaign(campaign); }
      openTab("command"); route();
    },
    importCampaign: (c: Campaign) => { campaign = c; resolveInterrupted(campaign); saveCampaign(campaign); log(campaign, "Campaign loaded from an exported save.", "key"); showHub(); },
    deploy: (inc, loadouts, dCount, extras) => {
      if (travelBlock(campaign, inc)) return;
      const setup = buildSetup(campaign, inc, loadouts, dCount, extras);
      forfeitGroup(campaign, inc);
      { const b = briefing(campaign, inc); const first = (t: string) => t.split(/(?<=\.) /)[0];
        inc.briefed = [...b.known.map(first), ...b.estimated.map(t => `Estimated: ${first(t)}`), ...b.unknown.map(t => `Unknown: ${first(t)}`)].join(" "); }
      // a storm over the destination holds the flight back a day
      const storm = inc.kind !== "escort" && stormDelay(campaign, inc.region), t = flightOut(campaign, inc);
      if (!t) { launch(setup, inc); return; }
      // the flight out: the squad takes off, the plane crosses the World Map while time runs, and the mission
      // starts when it lands. Anything at Site-19 meanwhile is Site Security's problem.
      const depart = campaign.day + (campaign.hour ?? 0) / 24, tf = setup.squad.every(m => m.goggles) ? "Eta-10" : setup.squad.some(m => m.goggles) ? "Epsilon-11 and Eta-10" : "Epsilon-11";
      campaign.outbound = { incId: inc.id, region: inc.region, depart, arrive: depart + t, setup, tf };
      for (const m of setup.squad) { const o = campaign.roster.find(x => x.id === m.opId); if (o) o.busy = { kind: "travel", daysLeft: t, out: true }; }
      transition.takeoff();
      log(campaign, `${tf} takes off for ${REGIONS[inc.region].name} on the ${transportName(campaign)}: ${t} day${t > 1 ? "s" : ""}${storm ? " (a storm there adds a day)" : ""}. Let time run on the World Map to get them there.`, "key");
      saveCampaign(campaign);
      openTab("world", "inc:" + inc.id);
      showHub();
    },
    arrive: () => {
      const o = campaign.outbound;
      if (!o) return;
      campaign.outbound = undefined;
      for (const m of o.setup.squad) { const op = campaign.roster.find(x => x.id === m.opId); if (op?.busy?.out) op.busy = undefined; }
      const inc = campaign.incidents.find(i => i.id === o.incId);
      if (!inc) { log(campaign, "The incident was over before the squad landed. They turn around.", "key"); saveCampaign(campaign); showHub(); return; }
      log(campaign, `${o.tf} has landed in ${REGIONS[inc.region].name}.`, "key");
      o.setup.weather = missionWeather(campaign, inc);   // the sky they land under
      o.setup.night = inc.kind === "emergency" ? true : nightAt(campaign, inc);
      transition.landing();
      launch(o.setup, inc);
    },
  });
}

// Handle for automated tests and debugging in the browser console.
(window as unknown as { __site19: object }).__site19 = {
  get mission() { return S; },
  get campaign() { return campaign; },
  save: () => saveCampaign(campaign),
  get grid() { return L; },
  sight: sightFrom,
  reach: reachFor,
  // Phase 4I: geometry, firing and hearing, for the acceptance tests
  fireLine, canShoot, lineOfFire, canSee, blastStructure, openDoor, opaque, passable, emitNoise, settleFacing, computeVis, moveUnit,
  // Phase 4G: a shot and an enemy turn, for the presentation checks
  fire, endTurn,
  // Phase 4B: the new anomalies' rules, for the acceptance tests
  scp4b,
  // Phase 4C
  generateTown,
  // Tactical overhaul T0: force every gameplay roll to one value (null to stop), for tests
  rng: { force: forceRng },
  // Tactical overhaul T1: the geometry kernel itself
  geom,
  // T5/T6: pacing (headless skips animation waits) and the cover rule
  pace, coverAgainst, shotInfo,
  movePreview,
  // Strategic overhaul: the validated command layer, the briefing and the invariants, for the strategy tests
  dispatch: (cmd: Command) => dispatch(campaign, cmd), briefing: () => directorsBriefing(campaign), invariants: () => checkInvariants(campaign),
  // Phase 5: the organization, site geography and hands-off deployments, for the acceptance tests
  org, autoteam, research: researchMod, security: securityMod,
  // Version 12: squad techniques in a mission
  squadtech, campaignMod, gridMod,
  // tactical camera: where a tile's centre is on screen now (client px), with the camera settled, for the tests
  tileToScreen: (x: number, y: number) => { cameraMod.cam.x = cameraMod.cam.tx; cameraMod.cam.y = cameraMod.cam.ty; cameraMod.cam.z = cameraMod.cam.tz; const r = document.querySelector("#cv")!.getBoundingClientRect(); const [a, b] = cameraMod.tileToScreen(x, y); return [r.left + a, r.top + b]; },
  camera: cameraMod,
};

function showLab() { screen = "mission"; openLab(root, () => { endMission(); showHub(); }); }
mountDebug({ campaign: () => campaign, screen: () => screen, refresh: () => { saveCampaign(campaign); if (screen === "hub") showHub(); }, lab: showLab });
// the tactical lab can be opened straight from the address: …/index.html#lab; ?legacy skips the title screen
if (location.hash === "#lab") showLab(); else if (LEGACY) showHub(); else showMenu();
window.addEventListener("hashchange", () => { if (location.hash === "#lab") showLab(); });
