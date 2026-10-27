import "./styles.css";
import { advanceDay, applyResult, buildSetup, log, newCampaign, resolveInterrupted, type Campaign, type Debrief } from "./campaign/campaign";
import { clearCampaign, loadCampaign, saveCampaign } from "./campaign/save";
import { REGIONS } from "./data/regions";
import { travelBlock, travelDays, transportName } from "./campaign/world";
import { letGuardsHandle } from "./campaign/security";
import { scpName } from "./campaign/containment";
import { pendingBreach } from "./campaign/campaign";
import { createMission } from "./game/mission";
import { S } from "./game/state";
import type { MissionKind, MissionResult } from "./game/types";
import { mountHub } from "./ui/hubView";
import { mountMission } from "./ui/missionView";
import { esc } from "./ui/util";
import { mountDebug } from "./ui/debug";

const root = document.getElementById("app")!;
let campaign: Campaign = loadCampaign() ?? newCampaign();
resolveInterrupted(campaign);
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
function showHub() {
  screen = "hub";
  mountHub(root, campaign, {
    save: () => saveCampaign(campaign),
    newCampaign: () => { clearCampaign(); campaign = newCampaign(); saveCampaign(campaign); showHub(); },
    importCampaign: (c: Campaign) => { campaign = c; resolveInterrupted(campaign); saveCampaign(campaign); log(campaign, "Campaign loaded from an exported save.", "key"); showHub(); },
    deploy: (inc, loadouts, dCount) => {
      if (travelBlock(campaign, inc)) return;
      const setup = buildSetup(campaign, inc, loadouts, dCount);
      // the flight out: days pass at Site-19 while the squad is in the air
      const t = inc.kind === "escort" ? 0 : travelDays(campaign, inc.region);
      if (t) {
        log(campaign, `Epsilon-11 flies out to ${REGIONS[inc.region].name} on the ${transportName(campaign)}: ${t} day${t > 1 ? "s" : ""}.`);
        for (let i = 0; i < t && !campaign.over; i++) {
          advanceDay(campaign);
          // a breach while the squad is in the air is Site Security's problem
          const b = pendingBreach(campaign);
          if (b) { log(campaign, "Epsilon-11 is in the air. Site Security has to handle the breach alone.", "bad"); letGuardsHandle(campaign, b); }
        }
      }
      saveCampaign(campaign);
      createMission(setup);
      screen = "mission";
      mountMission(root, showHub, result => {
        const d = applyResult(campaign, result);
        saveCampaign(campaign);
        return debriefHtml(result, d, setup.kind, scpName(setup.scp ?? "173"));
      });
    },
  });
}

// Handle for automated tests and debugging in the browser console.
(window as unknown as { __site19: object }).__site19 = {
  get mission() { return S; },
  get campaign() { return campaign; },
};

mountDebug({ campaign: () => campaign, screen: () => screen, refresh: () => { saveCampaign(campaign); if (screen === "hub") showHub(); } });
showHub();
