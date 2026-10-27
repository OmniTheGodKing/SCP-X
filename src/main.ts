import "./styles.css";
import { advanceDay, applyResult, buildSetup, log, newCampaign, resolveInterrupted, type Campaign, type Debrief } from "./campaign/campaign";
import { clearCampaign, loadCampaign, saveCampaign } from "./campaign/save";
import { REGIONS } from "./data/regions";
import { travelBlock, travelDays, transportName } from "./campaign/world";
import { createMission } from "./game/mission";
import { S } from "./game/state";
import type { MissionKind, MissionResult } from "./game/types";
import { mountHub } from "./ui/hubView";
import { mountMission } from "./ui/missionView";
import { esc } from "./ui/util";

const root = document.getElementById("app")!;
let campaign: Campaign = loadCampaign() ?? newCampaign();
resolveInterrupted(campaign);
saveCampaign(campaign);

const WIN: Record<MissionKind, [string, string]> = {
  breach: ["Recontained", "SCP-173 is sealed in the transport container."],
  manhunt: ["Recovered", "SCP-173 is sealed in the truck's container."],
  coverup: ["Contained", "Every witness has been dosed."],
  strike: ["Cell broken", "The Insurgency cell is out of action."],
};
function debriefHtml(r: MissionResult, d: Debrief, kind: MissionKind) {
  return `
    <div class="stampmark ${r.win ? "win" : "lose"}">${r.win ? WIN[kind][0] : r.evacuated ? "Evacuated" : "Mission failed"}</div>
    <h3>${r.win ? WIN[kind][1] : r.evacuated ? "Epsilon-11 pulled out." : "Epsilon-11 did not come back."}</h3>
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

function showHub() {
  mountHub(root, campaign, {
    save: () => saveCampaign(campaign),
    newCampaign: () => { clearCampaign(); campaign = newCampaign(); saveCampaign(campaign); showHub(); },
    deploy: (inc, loadouts, dCount) => {
      if (travelBlock(campaign, inc)) return;
      const setup = buildSetup(campaign, inc, loadouts, dCount);
      // the flight out: days pass at Site-19 while the squad is in the air
      const t = travelDays(campaign, inc.region);
      if (t) {
        log(campaign, `Epsilon-11 flies out to ${REGIONS[inc.region].name} on the ${transportName(campaign)}: ${t} day${t > 1 ? "s" : ""}.`);
        for (let i = 0; i < t && !campaign.over; i++) advanceDay(campaign);
      }
      saveCampaign(campaign);
      createMission(setup);
      mountMission(root, showHub, result => {
        const d = applyResult(campaign, result);
        saveCampaign(campaign);
        return debriefHtml(result, d, setup.kind);
      });
    },
  });
}

// Handle for automated tests and debugging in the browser console.
(window as unknown as { __site19: object }).__site19 = {
  get mission() { return S; },
  get campaign() { return campaign; },
};

showHub();
