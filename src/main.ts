import "./styles.css";
import { applyResult, buildSetup, newCampaign, resolveInterrupted, type Campaign, type Debrief } from "./campaign/campaign";
import { clearCampaign, loadCampaign, saveCampaign } from "./campaign/save";
import { WING_C } from "./data/maps";
import { createMission } from "./game/mission";
import { S } from "./game/state";
import type { MissionResult } from "./game/types";
import { mountHub } from "./ui/hubView";
import { mountMission } from "./ui/missionView";
import { esc } from "./ui/util";

const root = document.getElementById("app")!;
let campaign: Campaign = loadCampaign() ?? newCampaign();
resolveInterrupted(campaign);
saveCampaign(campaign);

function debriefHtml(r: MissionResult, d: Debrief) {
  return `
    <div class="stampmark ${r.win ? "win" : "lose"}">${r.win ? "Recontained" : r.evacuated ? "Evacuated" : "Containment failed"}</div>
    <h3>${r.win ? "SCP-173 is sealed in the transport container." : r.evacuated ? "Epsilon-11 pulled out of the wing." : "Epsilon-11 did not come back."}</h3>
    <ul class="debrief">${[...d.lines, ...d.promotions].map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    <dl>
      <dt>Turns</dt><dd>${r.turns}</dd>
      <dt>Operatives lost</dt><dd>${r.squad.filter(s => !s.alive).length} / ${r.squad.length}</dd>
      <dt>D-Class lost</dt><dd>${r.dLost}</dd>
      <dt>Insurgents down</dt><dd>${r.insurgentsDown} / ${r.insurgentsTotal}</dd>
    </dl>`;
}

function showHub() {
  mountHub(root, campaign, {
    save: () => saveCampaign(campaign),
    newCampaign: () => { clearCampaign(); campaign = newCampaign(); saveCampaign(campaign); showHub(); },
    deploy: (inc, loadouts, dCount) => {
      const setup = buildSetup(campaign, inc, loadouts, dCount);
      saveCampaign(campaign);
      createMission(WING_C, setup);
      mountMission(root, showHub, result => {
        const d = applyResult(campaign, result);
        saveCampaign(campaign);
        return debriefHtml(result, d);
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
