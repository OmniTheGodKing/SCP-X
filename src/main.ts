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
import { S } from "./game/state";
import type { MissionKind, MissionResult, MissionSetup } from "./game/types";
import { mountHub, openTab } from "./ui/hubView";
import { L } from "./core/grid";
import { fireLine, sightFrom } from "./core/sight";
import { blastStructure, openDoor, opaque, passable } from "./core/grid";
import { canShoot, lineOfFire, moveUnit } from "./game/combat";
import { canSee, computeVis } from "./game/state";
import { emitNoise, settleFacing } from "./game/noise";
import { reachFor } from "./game/turn";
import { mountMission } from "./ui/missionView";
import { esc } from "./ui/util";
import { mountDebug } from "./ui/debug";
import { transition } from "./ui/audio";

const root = document.getElementById("app")!;
let campaign: Campaign = loadCampaign() ?? newCampaign({ difficulty: "agent", ironman: false, tutorial: true });   // a first visit starts with the tutorial on
resolveInterrupted(campaign);
if (!campaign.recruits) refreshRecruits(campaign);   // saves from before the recruit pool
saveCampaign(campaign);

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
function launch(setup: MissionSetup, inc: Incident) {
  saveCampaign(campaign);
  createMission(setup);
  screen = "mission";
  mountMission(root, () => { transition.returnHome(); openTab("world", "reg:" + inc.region); showHub(); }, result => {
    const d = applyResult(campaign, result);
    saveCampaign(campaign);
    return debriefHtml(result, d, setup.kind, scpName(setup.scp ?? "173"));
  });
}
function showHub() {
  screen = "hub";
  mountHub(root, campaign, {
    save: () => saveCampaign(campaign),
    newCampaign: (opts, slot) => { useSlot(slot); clearCampaign(); campaign = newCampaign(opts); saveCampaign(campaign); openTab("command"); showHub(); },
    loadSlot: slot => {
      if (!slotSummary(slot)) return;   // nothing there: stay put
      saveCampaign(campaign);
      const c = useSlot(slot);
      if (c) { campaign = c; resolveInterrupted(campaign); saveCampaign(campaign); }
      openTab("command"); showHub();
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
      const depart = campaign.day + (campaign.hour ?? 0) / 24, tf = setup.squad.some(m => m.goggles) ? "Eta-10" : "Epsilon-11";
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
  get grid() { return L; },
  sight: sightFrom,
  reach: reachFor,
  // Phase 4I: geometry, firing and hearing, for the acceptance tests
  fireLine, canShoot, lineOfFire, canSee, blastStructure, openDoor, opaque, passable, emitNoise, settleFacing, computeVis, moveUnit,
};

mountDebug({ campaign: () => campaign, screen: () => screen, refresh: () => { saveCampaign(campaign); if (screen === "hub") showHub(); } });
showHub();
