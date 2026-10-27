// Site-19 Command: incidents, time, money, exposure, the Epsilon-11 roster and deployment.
import {
  DCLASS_COST, DCLASS_MONTHLY, INCIDENT_LIFETIME, RANKS, RANK_XP, RECRUIT_COST, advanceDay, advanceToEvent, aimOf, blinkFullOf, buyDClass,
  dayOfMonth, deployable, maxSanOf, monthOf, monthlyFunding, recruit, type Campaign, type Incident, type Operative,
} from "../campaign/campaign";
import { esc } from "./util";

const MAX_SQUAD = 4, MAX_DCLASS = 4;

export interface HubActions {
  save: () => void;
  deploy: (inc: Incident, opIds: string[], dCount: number) => void;
  newCampaign: () => void;
}

export function mountHub(root: HTMLElement, c: Campaign, act: HubActions) {
  let planning: string | null = null;
  const chosen = new Set<string>();
  let dCount = 2;
  let resetArmed = 0;

  const ready = () => c.roster.filter(deployable);

  function render() {
    const inc = c.incidents.find(i => i.id === planning) || null;
    if (!inc) planning = null;
    for (const id of [...chosen]) if (!ready().some(o => o.id === id)) chosen.delete(id);
    dCount = Math.max(0, Math.min(dCount, c.dclass, MAX_DCLASS));

    root.innerHTML = `
<main class="wrap hub">
  <header class="top">
    <div>
      <div class="eyebrow">SCP Foundation · Site-19 Command · Mobile Task Force Epsilon-11</div>
      <h1>Site-19 <small>Day ${c.day} · Month ${monthOf(c.day)}, day ${dayOfMonth(c.day)}</small></h1>
    </div>
    <div class="turnbox">
      <span class="pill">Funds $${c.funds}k</span>
      <span class="pill">D-Class ${c.dclass}</span>
      <button class="act" id="resetBtn" type="button">New campaign</button>
    </div>
  </header>

  <div class="hubgrid">
    <section class="col">
      <div class="card">
        <div class="label">Public exposure</div>
        <div class="exposure"><div class="exp-bar"><span style="width:${c.exposure}%"></span></div><b>${c.exposure} / 100</b></div>
        <p class="muted">At 100 the O5 Council relieves Site-19's command. Unanswered incidents add 15, failed missions 20; each recontainment removes 5.
        Next month's funding at this level: <b>$${monthlyFunding(c)}k</b> and ${DCLASS_MONTHLY} D-Class.</p>
      </div>

      <div class="card">
        <div class="label">Active incidents</div>
        ${c.incidents.length ? c.incidents.map(i => incidentCard(i)).join("") : `<p class="muted">No open breaches. Advance time to wait for the next incident.</p>`}
      </div>

      ${inc ? planPanel(inc) : ""}

      <div class="card">
        <div class="label">Time</div>
        <div class="row">
          <button class="act" id="dayBtn" type="button" ${c.over ? "disabled" : ""}>Next day</button>
          <button class="act primary" id="waitBtn" type="button" ${c.over ? "disabled" : ""}>Wait for next event</button>
        </div>
        <p class="muted">Each day operatives heal 1 HP and recover 10 sanity. Incidents stay open for ${INCIDENT_LIFETIME} days.</p>
      </div>
    </section>

    <section class="col">
      <div class="card">
        <div class="label">Epsilon-11 roster</div>
        <div class="roster">${c.roster.filter(o => o.alive).map(opRow).join("")}</div>
        <div class="row">
          <button class="act" id="recruitBtn" type="button" ${c.funds < RECRUIT_COST || c.over ? "disabled" : ""}>Recruit operative · $${RECRUIT_COST}k</button>
          <button class="act" id="dBuyBtn" type="button" ${c.funds < DCLASS_COST * 2 || c.over ? "disabled" : ""}>Request 2 D-Class · $${DCLASS_COST * 2}k</button>
        </div>
      </div>

      ${c.roster.some(o => !o.alive) ? `<div class="card">
        <div class="label">Memorial</div>
        <ul class="memorial">${c.roster.filter(o => !o.alive).map(o => `<li><b>${esc(o.call)} ${esc(o.name)}</b>, ${RANKS[o.rank]} · ${o.missions} mission${o.missions === 1 ? "" : "s"} · killed on day ${o.diedDay}, ${esc(o.diedAt || "")}</li>`).join("")}</ul>
      </div>` : ""}

      <div class="card">
        <div class="label">Site log · ${c.stats.won} recontained · ${c.stats.lost} failed · ${c.stats.missed} unanswered</div>
        <div class="log">${c.log.map(l => `<p class="${l.kind}"><span>D${l.day}</span>${esc(l.text)}</p>`).join("")}</div>
      </div>
    </section>
  </div>
  ${c.over ? `<div class="overlay fixed"><div class="sheet">
    <div class="stampmark lose">Command relieved</div>
    <h3>Site-19 has fallen.</h3>
    <p style="margin:0">${esc(c.over)}</p>
    <p style="margin:0">Survived ${c.day} days · ${c.stats.won} recontainments · ${c.roster.filter(o => !o.alive).length} operatives lost.</p>
    <button class="act primary" type="button" id="overBtn">Start a new campaign</button>
  </div></div>` : ""}
</main>`;
    bind();
  }

  function incidentCard(i: Incident) {
    const left = i.expires - c.day;
    return `<div class="incident ${planning === i.id ? "sel" : ""}">
      <div><b>${esc(i.title)}</b></div>
      <div class="muted">${left <= 0 ? "Last day to respond" : `${left} day${left === 1 ? "" : "s"} left to respond`} · Insurgency activity: ${i.insurgents >= 4 ? "heavy" : i.insurgents === 3 ? "reported" : "light"}</div>
      <button class="act ${planning === i.id ? "on" : ""}" type="button" data-plan="${i.id}" ${c.over ? "disabled" : ""}>${planning === i.id ? "Planning response" : "Plan response"}</button>
    </div>`;
  }

  function planPanel(inc: Incident) {
    const ops = ready();
    const can = chosen.size > 0;
    return `<div class="card plan">
      <div class="label">Deploy to ${esc(inc.title.split(":")[0])}</div>
      <p class="muted">Pick up to ${MAX_SQUAD} operatives. Only fully healed operatives can deploy; sanity carries over, so watch it.</p>
      <div class="pick">${ops.length ? ops.map(o => `<label class="pickop ${chosen.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="pick-${o.id}" data-pick="${o.id}" ${chosen.has(o.id) ? "checked" : ""} ${!chosen.has(o.id) && chosen.size >= MAX_SQUAD ? "disabled" : ""}>
        <span><b>${esc(o.call)} ${esc(o.name)}</b> · ${RANKS[o.rank]} · SAN ${o.san}/${maxSanOf(o)}</span></label>`).join("") : `<p class="muted">Nobody is fit to deploy. Wait for the wounded to heal or recruit.</p>`}</div>
      <div class="row dpick">
        <span>D-Class work detail</span>
        <button class="act" type="button" id="dMinus" ${dCount <= 0 ? "disabled" : ""}>−</button>
        <b>${dCount}</b>
        <button class="act" type="button" id="dPlus" ${dCount >= Math.min(c.dclass, MAX_DCLASS) ? "disabled" : ""}>+</button>
        <span class="muted">of ${c.dclass} in holding</span>
      </div>
      <div class="row">
        <button class="act primary" type="button" id="launchBtn" ${can ? "" : "disabled"}>Deploy ${chosen.size} operative${chosen.size === 1 ? "" : "s"} and ${dCount} D-Class</button>
        <button class="act" type="button" id="cancelPlan">Cancel</button>
      </div>
    </div>`;
  }

  function opRow(o: Operative) {
    const next = RANK_XP[o.rank + 1];
    const status = deployable(o) ? `<span class="flag">Ready</span>` : `<span class="flag bad">Wounded · ${o.maxHp - o.hp} day${o.maxHp - o.hp === 1 ? "" : "s"}</span>`;
    const ms = maxSanOf(o);
    return `<div class="oprow">
      <span class="tag">${esc(o.call)}</span>
      <span class="nm">${esc(o.name)} <span class="muted">${RANKS[o.rank]}</span></span>
      ${status}
      <span class="bars">
        <span>HP ${o.hp}/${o.maxHp}<span class="meter" style="--c: var(--mtf)"><span style="width:${(o.hp / o.maxHp) * 100}%"></span></span></span>
        <span>SAN ${o.san}<span class="meter" style="--c: ${o.san <= ms * 0.3 ? "var(--alert)" : "var(--manila)"}"><span style="width:${(o.san / ms) * 100}%"></span></span></span>
        <span>Aim ${aimOf(o)}</span>
        <span>Blink ${Math.round(blinkFullOf(o) * 100)}%</span>
        <span>XP ${o.xp}${next !== undefined ? `/${next}` : ""}</span>
        <span>${o.missions} mission${o.missions === 1 ? "" : "s"} · ${o.kills} kill${o.kills === 1 ? "" : "s"}</span>
      </span>
    </div>`;
  }

  function bind() {
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id);
    const on = (id: string, f: () => void) => { const el = $(id); if (el) el.onclick = f; };
    const change = (f: () => void) => { f(); act.save(); render(); };

    on("dayBtn", () => change(() => advanceDay(c)));
    on("waitBtn", () => change(() => advanceToEvent(c)));
    on("recruitBtn", () => change(() => recruit(c)));
    on("dBuyBtn", () => change(() => buyDClass(c)));
    root.querySelectorAll<HTMLElement>("[data-plan]").forEach(b => b.onclick = () => {
      planning = planning === b.dataset.plan ? null : b.dataset.plan!;
      if (planning && !chosen.size) for (const o of ready().slice(0, MAX_SQUAD)) chosen.add(o.id);
      render();
    });
    root.querySelectorAll<HTMLInputElement>("[data-pick]").forEach(b => b.onchange = () => {
      const id = b.dataset.pick!;
      if (b.checked && chosen.size < MAX_SQUAD) chosen.add(id); else chosen.delete(id);
      render();
    });
    on("dMinus", () => { dCount--; render(); });
    on("dPlus", () => { dCount++; render(); });
    on("cancelPlan", () => { planning = null; render(); });
    on("launchBtn", () => {
      const inc = c.incidents.find(i => i.id === planning);
      if (inc && chosen.size) act.deploy(inc, [...chosen], dCount);
    });
    on("resetBtn", () => {
      const b = $("resetBtn")!;
      if (!resetArmed) {
        b.textContent = "Erase this campaign?";
        resetArmed = window.setTimeout(() => { resetArmed = 0; b.textContent = "New campaign"; }, 3000);
        return;
      }
      clearTimeout(resetArmed); resetArmed = 0;
      act.newCampaign();
    });
    on("overBtn", act.newCampaign);
  }

  render();
  window.scrollTo(0, 0);
}
