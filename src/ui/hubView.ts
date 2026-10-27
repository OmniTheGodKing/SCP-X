// Site-19 Command: incidents and time, the base and its containment, and Epsilon-11's roster.
import { STAFF_EVENTS, answerStaff } from "../campaign/staff";
import type { Report } from "../campaign/reports";
import { MEDALS } from "../data/bios";
import { INSPECTION, inspectionChecks, inspectionSoon } from "../campaign/inspection";
import {
  UPGRADE, canUpgrade, upgradeFacility, RECREATION, canAddRecreation, addRecreation, DEMOLISH, canDemolish, demolish, demolishDays, demolishLeavesShort, ENGINEER_COST, EXCAVATE, FACILITIES, nameInText, GRADE_NAMES, MAX_LEVELS, REPAIR, SLOTS, build, canBuild, canExcavate, canRepair,
  dclassCapacity, engineersFree, excavate, facilityAt, healPerDay, isContainment, monthlyUpkeep, neighbors, operational,
  powerShort, powerSupply, powerUse, repair, sanityPerDay, type Facility, type FacilityType,
} from "../campaign/base";
import {
  DCLASS_COST, DCLASS_MONTHLY, RANKS, RANK_XP, TRAINER, retire, trainerWhy, RANK_BONUS, RECRUIT_COST, advanceDay, aimOf, blinkFullOf, buyDClass,
  canBuyDClass, canHireEngineer, dayOfMonth, deployable, hireEngineer, maxSanOf, monthOf, monthlyFunding, recruit,
  INTEL_PER_PRISONER, INTERROGATION_DAYS, interrogationDays, PRISONER_BOUNTY, holdingCapacity, canRetrain, canTherapy, canWeaken, dateText, fitAttachment, gunFor, loadAmmo, setWeapon, weaken, weaponOf, weaponOptions, chooseClass, choosePerk, perkChoices, promotionDue, startRetrain, startTherapy,
  pendingBreach, type Campaign, type Incident, type Loadout, type Operative,
} from "../campaign/campaign";
import { CLASSES, PERKS, TRAITS, type ClassId, type PerkId, type TraitId } from "../data/classes";
import { AMMO, ATTACHMENTS, SIDEARM, TYPES, model, type AmmoId, type AttachmentId, type WeaponType } from "../data/weapons";
import {
  CLEAN_CREW, CLEAN_EVERY, CLEAN_RISK, EVAC, breachRisk, canClean, canEvacuate, canMove, cleanCell, evacuate, freeWings, moveScp, occupantOf, transferOut, unpowered, wingOf, workRisk,
  type ScpRecord,
} from "../campaign/containment";
import {
  ARMOR_KINDS, ARMOR_TIERS, armorStats, ATTACHMENT_COST, REFIT, canOrderAmmo, orderAmmo, unlockedAmmo, canOrderAttachment, canRefit, orderAttachment, orderRefit, pendingRefits, unlockedAttachments,
  ITEMS, PROJECTS, TESTS, assign, projectVisible, canHireResearcher, canOrder, canTest, has, hireResearcher, order, projectLock,
  researcherCapacity, projectCost, researchersFree, startTest, testKey, offered, projectDays, unlockedItems, type Branch, type ItemId, type TestId,
} from "../campaign/research";
import { HOME, LAND, REGIONS, REGION_IDS, SITE19, project, type RegionId } from "../data/regions";
import {
  COLLAPSE_LIMIT, COVER_STORY, coverDoses, locateIntel, amnesticsCapacity, canCoverStory, canLocate, collapsedCount, coverStory, locateCell,
  regionFunding, transportName, travelBlock, travelDays,
} from "../campaign/world";
import {
  ALERTS, GUARD, PROMOTE, canHireGuard, canPromote, guardCapacity, guardOdds, guardsAlive, guardsReady, hireGuard, letGuardsHandle, mtfArrival,
  promoteGuard, breachGuards, letGuardsHandleRiot, letGuardsHandleRaid, raidArrival, raidOdds, postedAt, postGuard, unposted, TRAINING, canTrain, squadSize, train, type Alert, type Guard,
} from "../campaign/security";
import { HEAVY } from "../game/types";
import { esc } from "./util";

const MAX_DCLASS = 4, MAX_WATCHERS = 2;
type Tab = "command" | "world" | "site" | "research" | "personnel";

export interface HubActions {
  save: () => void;
  deploy: (inc: Incident, loadouts: Loadout[], dCount: number) => void;
  newCampaign: () => void;
}

const KIND_NAMES = { raid: "Raid", riot: "Riot", outbreak: "SCP-610", breach: "Breach", recovery: "Manhunt", coverup: "Cover-up", strike: "Strike", escort: "Ambush", retaliation: "Retaliation" } as const;
const KIND_BRIEF = {
  raid: "The Chaos Insurgency is attacking Site-19's surface compound to reach the lift down into the site. Site Security holds the wire; Epsilon-11 can come up the lift to help.",
  riot: "The D-Class block is rioting. Only Site Security answers: restrain the rioters or put them down. Every one killed is a D-Class lost.",
  outbreak: "Burn out SCP-610's core with fire. Bring incendiaries or the flamethrower, and containment suits for anyone going near the flesh: anyone infected turns 5 turns later and is lost for good. Each win brings the outbreak down a stage.",
  escort: "The convoy home is under attack. The squad that made the capture has to hold the truck: neutralise the Insurgents or last 8 turns. Wounds carry over.",
  retaliation: "The Insurgency is shooting up a town that helped you. Neutralise them; every civilian killed adds exposure.",
  breach: "SCP-173 is loose in its wing. Get it into the transport container and seal it.",
  recovery: "SCP-173 is loose among civilians. Every death there raises exposure. Get it into the truck's container and seal it.",
  coverup: "Witnesses need amnestics before they talk. Dose each one; anyone who reaches the edge of the map undosed adds exposure.",
  strike: "Raid the Insurgency cell's warehouse and neutralise everyone inside. Wounded Insurgents can be taken prisoner.",
} as const;
const pctText = (p: number) => p < 0.01 ? (p * 100).toFixed(1) + "%" : Math.round(p * 100) + "%";
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
let tab: Tab = (() => { try { return (localStorage.getItem("site19-tab") as Tab) || "command"; } catch { return "command"; } })();

export function mountHub(root: HTMLElement, c: Campaign, act: HubActions) {
  let planning: string | null = null;
  const chosen = new Set<string>();
  const watchers = new Set<string>();
  const gear = new Map<string, { armor: ItemId | ""; items: (ItemId | "")[] }>();
  let flashMsg = "";
  let opSel: string | null = null;
  let dCount = 2;
  let sel: { level: number; slot: number } | null = null;
  let resetArmed = 0;
  let regionSel: RegionId = HOME;

  // the running clock: starts paused every time the hub opens
  let speed = 0, lastSpeed = 1;
  const SPEEDS = [1, 2, 4], DAY_MS = 4000;
  const hourText = () => `${String(Math.floor(c.hour ?? 0)).padStart(2, "0")}:00`;
  const clockBlocked = () => !!c.over || !!pendingBreach(c) || !!c.notices?.length;
  const setSpeed = (n: number) => { if (n > 0 && tab !== "world") { render(); return; } if (!(n > 0 && clockBlocked())) { speed = n; if (n) lastSpeed = n; } render(); };

  const ready = () => c.roster.filter(deployable);
  // an ambushed convoy is defended by whoever made the capture, wounded or not
  const readyFor = (inc: Incident) => inc.kind === "escort" && inc.squad ? c.roster.filter(o => o.alive && inc.squad!.includes(o.id)) : ready();
  const watchPool = () => guardsReady(c);
  const scp173 = () => c.scps.find(s => s.id === "173")!;

  function render() {
    if (planning && !c.incidents.some(i => i.id === planning)) planning = null;
    { const pl = c.incidents.find(i => i.id === planning); for (const id of [...chosen]) if (!(pl ? readyFor(pl) : ready()).some(o => o.id === id)) chosen.delete(id); }
    for (const id of [...watchers]) if (!watchPool().some(o => o.id === id)) watchers.delete(id);
    dCount = Math.max(0, Math.min(dCount, c.dclass, MAX_DCLASS));
    const pw = powerShort(c);

    root.innerHTML = `
<main class="wrap hub">
  <header class="top">
    <div>
      <div class="eyebrow">SCP Foundation · Site-19 Command · Mobile Task Force Epsilon-11</div>
      <h1>Site-19 <small>${dateText(c.day)} · <span id="clockHour">${hourText()}</span> · ${speed ? `${speed}×` : "paused"}</small></h1>
    </div>
    <div class="turnbox">
      <span class="pill">Funds $${c.funds}k</span>
      <span class="pill">D-Class ${c.dclass}/${dclassCapacity(c)}</span>
      <span class="pill">Intel ${c.intel}</span>
      <span class="pill" title="Guards alive / posts at working Security stations">Guards ${guardsAlive(c).length}/${guardCapacity(c)}${unposted(c).length ? ` · ${unposted(c).length} unposted` : ""}</span>
      <span class="pill">Amnestics ${c.amnestics}/${amnesticsCapacity(c)}</span>
      <span class="pill ${c.exposure >= 60 || collapsedCount(c) ? "hot" : ""}">Exposure ${c.exposure}${collapsedCount(c) ? ` · ${collapsedCount(c)} lost` : ""}</span>
      <span class="pill">Engineers ${engineersFree(c)}/${c.engineers} free</span>
      <span class="pill">Researchers ${researchersFree(c)}/${c.researchers} free</span>
      <span class="pill ${pw ? "hot" : ""}">Power ${powerUse(c)}/${powerSupply(c)}</span>
      ${c.debug ? `<span class="pill hot">Debug save</span>` : ""}
      <button class="act" id="resetBtn" type="button">New campaign</button>
    </div>
  </header>
  <nav class="tabs" aria-label="Site-19 sections">
    ${tabBtn("command", `Command${c.incidents.length ? ` · ${c.incidents.length} open` : ""}`)}
    ${tabBtn("world", "World")}
    ${tabBtn("site", "Site-19")}
    ${tabBtn("research", `Research${researchersFree(c) > 0 && c.researchers ? ` · ${researchersFree(c)} idle` : ""}`)}
    ${tabBtn("personnel", "Personnel")}
  </nav>
  ${flashMsg ? `<p class="warn-box" role="status">${esc(flashMsg)}</p>` : ""}
  ${tab === "command" ? commandTab() : tab === "world" ? worldTab() : tab === "site" ? siteTab() : tab === "research" ? researchTab() : personnelTab()}
  ${!c.over && c.notices?.length ? `<div class="overlay fixed"><div class="sheet notice" role="dialog" aria-label="Time paused">
    <div class="label">${dateText(c.day)} · time paused</div>
    <ul class="debrief">${c.notices.slice(0, 8).map(n => `<li class="${n.kind}">${esc(n.text)}</li>`).join("")}${c.notices.length > 8 ? `<li>…and ${c.notices.length - 8} more in the site log.</li>` : ""}</ul>
    <div class="row"><button class="act primary" type="button" id="noticeGo">Go to it</button><button class="act" type="button" id="noticeOk">Continue</button></div>
  </div></div>` : ""}
  ${c.over ? `<div class="overlay fixed"><div class="sheet">
    <div class="stampmark lose">Command relieved</div>
    <h3>Site-19 has fallen.</h3>
    <p style="margin:0">${esc(c.over)}</p>
    <p style="margin:0">Held out ${c.day} days · ${c.stats.won} recontainments · ${c.roster.filter(o => !o.alive).length} operatives lost.</p>
    <button class="act primary" type="button" id="overBtn">Start a new campaign</button>
  </div></div>` : ""}
</main>`;
    bind();
  }

  const tabBtn = (t: Tab, label: string) => `<button type="button" class="tab ${tab === t ? "on" : ""}" data-tab="${t}" aria-pressed="${tab === t}">${label}</button>`;

  // ---------- Command ----------
  function reportFile(r: Report) {
    return `<div class="file report">
      <div class="label">SCP Foundation · Incident report ${esc(r.number)}</div>
      <h2>${esc(r.title)} <small>${r.win ? "Closed" : "Failed"}</small></h2>
      <div class="specs">Date: ${dateText(r.day)} · Location: ${esc(r.location)}${r.anomaly ? ` · Anomaly: ${esc(r.anomaly)}` : ""}</div>
      <div class="specs">Personnel: ${esc(r.personnel.join(", ") || "none")}</div>
      ${r.account.map(t => `<p>${esc(t)}</p>`).join("")}
      <div class="specs">Filed by Site-19 Command.</div></div>`;
  }
  function archiveCard() {
    const a = c.archive ?? [];
    if (!a.length) return "";
    return `<div class="card"><div class="label">Archive · ${plural(a.length, "incident report")}</div>
      ${reportFile(a[0])}
      ${a.slice(1).map(r => `<details class="archived"><summary>Incident ${esc(r.number)} · ${dateText(r.day)} · ${esc(r.title)} · ${r.win ? "closed" : "failed"}</summary>${reportFile(r)}</details>`).join("")}</div>`;
  }

  function staffCard() {
    const e = c.staffEvent;
    if (!e) return "";
    const d = STAFF_EVENTS[e.id];
    return `<div class="card plan"><div class="label">Staff · decide by ${dateText(e.until)}</div>
      <h3>${esc(d.title)}</h3><p>${esc(d.text(c, e))}</p>
      <div class="row">${d.choices.map((ch, i) => { const why = ch.why?.(c, e); return `<button class="act ${i ? "" : "primary"}" type="button" data-staff="${i}" ${why ? `disabled title="${esc(why)}"` : ""}>${esc(ch.label)}</button>${why ? `<span class="muted">${esc(why)}</span>` : ""}`; }).join("")}</div>
      <p class="muted">Left unanswered, the second choice is taken.</p></div>`;
  }

  function commandTab() {
    const inc = c.incidents.find(i => i.id === planning) || null;
    return `<div class="hubgrid">
    <section class="col">
      ${c.roster.some(promotionDue) ? `<div class="card plan"><div class="label">Promotions</div>
        <p>${c.roster.filter(promotionDue).map(o => `<b>${esc(o.call)} ${esc(o.name)}</b>`).join(", ")} ${c.roster.filter(promotionDue).length > 1 ? "are" : "is"} waiting to choose ${c.roster.filter(promotionDue).some(o => !o.cls) ? "a class or perk" : "a perk"}.</p>
        <button class="act" type="button" data-goto="personnel">Open Personnel</button></div>` : ""}
      ${staffCard()}
      ${inspectionSoon(c) ? `<div class="card plan"><div class="label">O5 inspection · ${dateText(c.inspectionDay!)}</div>
        <p>If the inspector came today: $${INSPECTION.perCheck}k for each check passed${inspectionChecks(c).filter(k => !k.ok).length >= INSPECTION.failAt ? `, and <span class="warn">$${INSPECTION.penalty}k docked</span> for failing ${INSPECTION.failAt} or more` : ""}.</p>
        <ul class="why">${inspectionChecks(c).map(k => `<li class="${k.ok ? "" : "warn"}">${k.ok ? "✓" : "✗"} ${esc(k.label)}</li>`).join("")}</ul></div>` : ""}
      ${c.scps.map(scpSummary).join("")}
      <div class="card">
        <div class="label">Active incidents</div>
        ${c.incidents.length ? c.incidents.map(incidentCard).join("") : `<p class="muted">No open incidents. Let time run to see what happens next.</p>`}
      </div>
      ${inc ? planPanel(inc) : ""}
      ${archiveCard()}
      <div class="card">
        <div class="label">Global exposure</div>
        <div class="exposure"><div class="exp-bar"><span style="width:${c.exposure}%"></span></div><b>${c.exposure} / 100</b></div>
        <p class="muted">The average of the six regions, with a collapsed front counting as 100. A region at 100 collapses: its front stops funding Site-19 for good. If ${COLLAPSE_LIMIT} collapse, the O5 Council relieves Site-19's command. See the World tab.</p>
        <button class="act" type="button" data-goto="world">Open the world map</button>
      </div>
    </section>
    <section class="col">
      <div class="card">
        <div class="label">Time · ${speed ? `running at ${speed}×` : "paused"}</div>
        <p class="muted">Time only passes while the World tab is open. Leaving it pauses the clock.</p>
        <button class="act" type="button" data-goto="world">Open the world map</button>
      </div>
      <div class="card">
        <div class="label">Alert level · Epsilon-11 reaches a breach on turn ${mtfArrival(c)}, +1 per level below the top</div>
        <div class="row">${(Object.keys(ALERTS) as Alert[]).map(a => `<button class="act ${c.alert === a ? "on" : ""}" type="button" data-alert="${a}" aria-pressed="${c.alert === a}">${ALERTS[a].name}</button>`).join("")}</div>
        <p class="muted">${esc(ALERTS[c.alert].desc)}</p>
      </div>
      <div class="card">
        <div class="label">Site log · ${c.stats.won} recontained · ${c.stats.lost} failed · ${c.stats.missed} unanswered</div>
        <div class="log">${c.log.map(l => `<p class="${l.kind}"><span>D${l.day}</span>${esc(l.text)}</p>`).join("")}</div>
      </div>
    </section>
  </div>`;
  }

  function scpSummary(s: ScpRecord) {
    const wing = wingOf(c, s);
    if (s.status === "loose") return `<div class="card status danger"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Escaped.</b> Whereabouts unknown. Exposure rises every day it stays loose; it will surface somewhere eventually.</div></div>`;
    if (s.status === "away") return `<div class="card status"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Held at Site-17</b> for safekeeping. It comes back ${dateText(s.returnDay ?? c.day)}.</div></div>`;
    if (s.status === "breach") return `<div class="card status danger"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Breach in progress.</b> Site Security is on it now. Send Epsilon-11 in after them, or leave it to the guards.</div></div>`;
    const r = breachRisk(c, s), due = s.lastCleaned + CLEAN_EVERY - c.day;
    return `<div class="card status held"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Contained</b> in the ${wing ? nameInText(wing.type) + ` on level ${wing.level + 1}` : "?"}.<br>
      Breach risk ${pctText(r.p)} a day · maintenance ${s.maintenance}% · cleaning ${due > 0 ? `due in ${plural(due, "day")}` : `<span class="warn">overdue</span>`}</div>
      <button class="act" type="button" data-goto="site">Manage containment</button></div>`;
  }

  function incidentCard(i: Incident) {
    const left = i.expires - c.day, t = travelDays(c, i.region), block = travelBlock(c, i);
    const where = i.kind === "breach" ? "Inside Site-19" : `${REGIONS[i.region].name} · ${t ? `${plural(t, "day")} away` : "a drive from Site-19"}`;
    return `<div class="incident ${planning === i.id ? "sel" : ""}">
      <div><b>${esc(i.title)}</b> <span class="flag">${KIND_NAMES[i.kind]}</span></div>
      <div class="muted">${left <= 0 ? "Last day to respond" : `${plural(left, "day")} left to respond`} · ${where} · Insurgency activity: ${has(c, "codebooks") ? `${i.insurgents - (i.weakened ?? 0)} Insurgents` : i.insurgents >= 4 ? "heavy" : i.insurgents >= 2 ? "reported" : i.insurgents ? "light" : "none reported"}${i.witnesses ? ` · ${i.witnesses} witnesses` : ""}</div>
      ${block ? `<div class="warn">${esc(block)}</div>` : ""}
      ${i.kind === "breach" ? `<p class="muted">Happening now. ${guardsReady(c).length} guard${guardsReady(c).length === 1 ? "" : "s"} can respond; Epsilon-11 would arrive on turn ${mtfArrival(c, i)} (${ALERTS[c.alert].name.toLowerCase()} alert).</p>` : ""}
      <div class="row"><button class="act ${planning === i.id ? "on" : ""}" type="button" data-plan="${i.id}" ${c.over || block ? "disabled" : ""}>${planning === i.id ? "Planning response" : i.kind === "breach" ? "Take command" : "Plan response"}</button>
      ${i.kind === "breach" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it · ${pctText(guardOdds(c, i))} chance</button>` : ""}
      ${i.kind === "riot" || i.kind === "raid" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it${i.kind === "raid" ? ` (${Math.round(raidOdds(c, i) * 100)}%)` : ""}</button>` : ""}</div>
    </div>`;
  }

  function planPanel(inc: Incident) {
    const ops = readyFor(inc), t = inc.kind === "escort" ? 0 : travelDays(c, inc.region), noD = inc.kind === "strike" || inc.kind === "coverup" || inc.kind === "escort" || inc.kind === "retaliation" || inc.kind === "outbreak" || inc.kind === "riot" || inc.kind === "raid";
    return `<div class="card plan">
      <div class="label">Deploy to ${esc(inc.title.split(":")[0])}</div>
      <p>${esc(KIND_BRIEF[inc.kind])}</p>
      ${inc.map !== "wingC" && ((c.hour ?? 0) < 6 || (c.hour ?? 0) >= 20) ? `<p class="warn">Night: deploying now means fighting in the dark (everyone sees 4 tiles less). Flares help. Wait for daylight on the World tab if you'd rather.</p>` : ""}
      ${inc.kind === "breach" ? (() => { const g = breachGuards(c, inc); return `<p>Site Security: <b>${g.first.length}</b> on the scene${g.late.length ? `, ${g.late.length} more on turn 2` : ""}${g.first.length + g.late.length ? ` (${[...g.first, ...g.late].map(m => esc(m.name)).join(", ")})` : ". Nobody is fit to respond"}. Operatives you pick arrive on turn <b>${mtfArrival(c, inc)}</b>; D-Class are on site from the start.</p>`; })() : ""}
      ${t ? `<p class="muted">The ${transportName(c)} takes ${plural(t, "day")} to reach ${REGIONS[inc.region].name}; time at Site-19 passes while the squad is in the air, and the survivors spend as long again flying home.</p>` : ""}
      ${inc.kind === "coverup" ? `<p class="${c.amnestics < (inc.witnesses ?? 0) ? "warn" : "muted"}">The squad carries all ${c.amnestics} amnestic doses in storage, for ${plural(inc.witnesses ?? 0, "witness")}.</p>` : ""}
      ${inc.insurgents ? `<div class="row"><span>Insurgents expected: <b>${inc.insurgents - (inc.weakened ?? 0)}</b>${inc.weakened ? ` (${inc.weakened} intercepted)` : ""}</span>
        <button class="act" type="button" id="intelBtn" ${canWeaken(c, inc) ? `disabled title="${esc(canWeaken(c, inc)!)}"` : ""}>Spend 1 Intel: intercept one</button></div>` : ""}
      ${inc.kind === "raid" ? (() => { const g = guardsReady(c).slice(0, 8); return `<p>Site Security: <b>${g.length}</b> ${g.length === 1 ? "guard holds" : "guards hold"} the compound${g.length ? ` (${g.map(x => esc(x.name)).join(", ")})` : ""}${has(c, "perimeter_alarms") ? ", already on overwatch" : ""}. Insurgents: about <b>${inc.insurgents}</b>. Operatives you pick come up the lift on turn <b>${raidArrival(c)}</b>.</p>`; })() : ""}
      ${inc.kind === "riot" ? (() => { const g = guardsReady(c).slice(0, 8); return `<p>Site Security: <b>${g.length}</b> ${g.length === 1 ? "guard answers" : "guards answer"}${g.length ? ` (${g.map(x => esc(x.name)).join(", ")})` : ". Nobody is fit to respond"}. D-Class left: <b>${c.dclass}</b>.</p>`; })() : `
      <p class="muted">Pick up to ${squadSize(c)} operatives. Only fully healed operatives can deploy; sanity carries over, so watch it.${inc.kind === "breach" ? " You can also send nobody and play it with the guards alone." : ""}</p>
      <div class="pick">${ops.length ? ops.map(o => `<label class="pickop ${chosen.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="pick-${o.id}" data-pick="${o.id}" ${chosen.has(o.id) ? "checked" : ""} ${!chosen.has(o.id) && chosen.size >= squadSize(c) ? "disabled" : ""}>
        <span><b>${esc(o.call)} ${esc(o.name)}</b> · ${RANKS[o.rank]} · SAN ${o.san}/${maxSanOf(o)}</span></label>`).join("") : `<p class="muted">Nobody is fit to deploy. Wait for the wounded to heal or recruit.</p>`}</div>
      ${chosen.size ? `<div class="loadouts"><div class="specs">Loadout: weapon, one armor slot and two item slots each. Unused items come back; gear on anyone killed is lost.</div>
        ${[...chosen].map(id => loadoutRow(c.roster.find(o => o.id === id)!)).join("")}</div>` : ""}`}
      ${noD ? "" : `<div class="row dpick">
        <span>D-Class work detail</span>
        <button class="act" type="button" id="dMinus" ${dCount <= 0 ? "disabled" : ""}>−</button>
        <b>${dCount}</b>
        <button class="act" type="button" id="dPlus" ${dCount >= Math.min(c.dclass, MAX_DCLASS) ? "disabled" : ""}>+</button>
        <span class="muted">of ${c.dclass} in holding</span>
      </div>`}
      <div class="row">
        <button class="act primary" type="button" id="launchBtn" ${chosen.size || ((inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid") && guardsReady(c).length) ? "" : "disabled"}>${inc.kind === "riot" ? `Send in ${plural(Math.min(8, guardsReady(c).length), "guard")}` : `Deploy ${plural(chosen.size, "operative")}`}${noD ? "" : ` and ${dCount} D-Class`}</button>
        <button class="act" type="button" id="cancelPlan">Cancel</button>
      </div>
    </div>`;
  }

  function gearOf(id: string) {
    let g = gear.get(id);
    if (!g) { g = { armor: "", items: ["", "", ""] }; gear.set(id, g); }
    return g;
  }
  /** How many of an item are left in storage once everyone else's loadout is counted. */
  function spare(item: ItemId, exceptOp: string, exceptSlot = -1) {
    let used = 0;
    for (const id of chosen) {
      const g = gearOf(id);
      if (ITEMS[item].armor) { if (g.armor === item && id !== exceptOp) used++; continue; }
      g.items.forEach((it, i) => { if (it === item && !(id === exceptOp && i === exceptSlot)) used++; });
    }
    return (c.inventory[item] || 0) - used;
  }
  function loadoutRow(o: Operative) {
    const g = gearOf(o.id);
    // heavy weapons only show for someone in heavy armor
    const carry = (Object.keys(ITEMS) as ItemId[]).filter(i => !ITEMS[i].armor && ((c.inventory[i] || 0) > 0) && (g.armor === "armor_heavy" || !HEAVY.includes(i)));
    const slot = (i: number) => `<select id="gear-${o.id}-${i}" data-gear="${o.id}" data-slot-i="${i}" aria-label="${esc(o.name)} item slot ${i + 1}">
      <option value="">Empty slot</option>
      ${carry.map(it => { const left = spare(it, o.id, i); return `<option value="${it}" ${g.items[i] === it ? "selected" : ""} ${left < 1 && g.items[i] !== it ? "disabled" : ""}>${ITEMS[it].name} (${Math.max(0, left)} left)</option>`; }).join("")}
    </select>`;
    const kinds = ARMOR_KINDS.filter(k => (c.inventory[k] || 0) > 0 || g.armor === k);
    return `<div class="loadrow"><b>${esc(o.call)} ${esc(o.name)}</b>
      <span class="specs">${esc(gunFor(c, o).name)}${o.attachment ? ` + ${ATTACHMENTS[o.attachment].name}` : ""}${o.ammoType ? ` · ${AMMO[o.ammoType].name}` : ""}</span>
      ${weaponOptions(o).length > 1 ? `<select id="wpn-${o.id}" data-weapon="${o.id}" aria-label="${esc(o.name)} weapon">${weaponOptions(o).map(t => `<option value="${t}" ${weaponOf(o) === t ? "selected" : ""}>${TYPES[t].name}: ${model(c.models[t]).name}</option>`).join("")}</select>` : ""}
      <select id="armor-${o.id}" data-armor="${o.id}" aria-label="${esc(o.name)} armor">
        <option value="">${kinds.length ? "No armor" : c.armorTier ? "No armor (none built)" : "No armor (research a vest first)"}</option>
        ${kinds.map(k => { const left = spare(k, o.id), st = armorStats(k, c.armorTier); return `<option value="${k}" ${g.armor === k ? "selected" : ""} ${left < 1 && g.armor !== k ? "disabled" : ""}>${k === "armor" ? ARMOR_TIERS[Math.max(1, c.armorTier)].name : ITEMS[k].name}: +${st.hp} HP, ${st.points} armor${st.move ? `, ${st.move > 0 ? "+" : ""}${st.move} move` : ""} (${Math.max(0, left - (g.armor === k ? 1 : 0))} spare)</option>`; }).join("")}
      </select>
      ${slot(0)}${slot(1)}${o.perks.includes("field_kit") ? slot(2) : ""}</div>`;
  }

  // ---------- World ----------
  function worldTab() {
    const [x0, y0, w, h] = [8, 14, 344, 124];
    const path = (poly: [number, number][]) => "M" + poly.map(([lo, la]) => project(lo, la).map(v => v.toFixed(1)).join(",")).join("L") + "Z";
    const [sx, sy] = project(SITE19.lon, SITE19.lat);
    const pins = REGION_IDS.map(r => {
      const d = REGIONS[r], st = c.regions[r], [px, py] = project(d.lon, d.lat);
      const here = c.incidents.filter(i => i.region === r && i.kind !== "breach");
      return `<g class="region ${st.collapsed ? "lost" : ""} ${regionSel === r ? "on" : ""}" data-region="${r}" tabindex="0" role="button" aria-label="${esc(d.name)}, exposure ${st.exposure}${st.collapsed ? ", collapsed" : ""}">
        <circle cx="${px}" cy="${py}" r="8" class="halo" style="--heat:${st.collapsed ? 100 : st.exposure}"></circle>
        <rect x="${px - 10}" y="${py + 9.5}" width="20" height="2" class="bar-bg"></rect>
        <rect x="${px - 10}" y="${py + 9.5}" width="${(st.collapsed ? 100 : st.exposure) / 5}" height="2" class="bar"></rect>
        <text x="${px}" y="${py + 16.5}" class="rname">${esc(d.name.replace("Western ", "W. ").replace("Eastern ", "E. ").replace("United States", "US").replace(" and the Middle East", " & M.E."))}</text>
        ${here.map((i, k) => `<g class="pin ${i.kind}"><circle cx="${px - 4 + k * 5}" cy="${py - 11}" r="2.4"></circle></g>`).join("")}
      </g>`;
    }).join("");
    const r = regionSel, d = REGIONS[r], st = c.regions[r], cw = canCoverStory(c, r), lw = canLocate(c, r), t = travelDays(c, r);
    const here = c.incidents.filter(i => i.region === r);
    return `<div class="card timecard">
        <div class="label">Time · ${speed ? `running at ${speed}×` : "paused"}</div>
        <div class="row speeds">
          <button class="act ${speed ? "" : "on"}" type="button" data-speed="0" aria-pressed="${!speed}">Pause <kbd>Space</kbd></button>
          ${SPEEDS.map((n, i) => `<button class="act ${speed === n ? "on" : ""}" type="button" data-speed="${n}" aria-pressed="${speed === n}" ${clockBlocked() ? "disabled" : ""}>${n}× <kbd>${i + 1}</kbd></button>`).join("")}
        </div>
        ${pendingBreach(c) ? `<p class="warn">${pendingBreach(c)!.kind === "escort" ? "A convoy is under attack" : "A breach is under way"}. Deal with it before time moves on.</p>` : ""}
        <p class="muted">At 1× a day passes every ${DAY_MS / 1000} seconds. The clock pauses itself when something needs you. Next month: $${monthlyFunding(c)}k from the fronts, $${monthlyUpkeep(c)}k upkeep and salaries, up to ${DCLASS_MONTHLY} D-Class. Operatives heal ${healPerDay(c)} HP and recover ${sanityPerDay(c)} sanity a day.</p>
      </div>
    <div class="card worldcard">
        <div class="label">The world · ${dateText(c.day)} · global exposure ${c.exposure} · ${collapsedCount(c)} of ${COLLAPSE_LIMIT} fronts lost</div>
        <svg class="worldmap" viewBox="${x0} ${y0} ${w} ${h}" role="group" aria-label="World map of Foundation regions">
          <rect x="${x0}" y="${y0}" width="${w}" height="${h}" class="sea"></rect>
          ${[-60, -30, 0, 30, 60].map(la => `<line x1="0" x2="360" y1="${90 - la}" y2="${90 - la}" class="grat"></line>`).join("")}
          ${[-120, -60, 0, 60, 120].map(lo => `<line y1="${y0}" y2="${y0 + h}" x1="${lo + 180}" x2="${lo + 180}" class="grat"></line>`).join("")}
          ${LAND.map(p => `<path d="${path(p)}" class="land"></path>`).join("")}
          <g class="site19"><rect x="${sx - 2.2}" y="${sy - 2.2}" width="4.4" height="4.4" transform="rotate(45 ${sx} ${sy})"></rect>
            <text x="${sx + 4}" y="${sy - 3}">Site-19</text><title>Site-19 · exact location classified</title></g>
          ${pins}
        </svg>
        <div class="legend"><span style="--c:var(--alert)">Exposure</span><span style="--c:var(--manila)">Cover-up</span><span style="--c:var(--raider)">Insurgency cell</span><span style="--c:var(--subject)">Sighting</span><span>Select a region for details</span></div>
      </div>
    <div class="hubgrid">
    <section class="col">
      <div class="card ${st.collapsed ? "status danger" : ""}">
        <div class="label">${esc(d.name)}</div>
        <p>Front: <b>${esc(d.front)}</b>${st.collapsed ? " (collapsed)" : ""}</p>
        <div class="exposure"><div class="exp-bar"><span style="width:${st.collapsed ? 100 : st.exposure}%"></span></div><b>${st.collapsed ? "Lost" : `${st.exposure} / 100`}</b></div>
        <p class="muted">Funding: $${regionFunding(c, r)}k a month. ${t ? `${plural(t, "day")} away by ${transportName(c)}.` : "Site-19 is here; teams go by road."}</p>
        ${here.length ? `<p>Open here: ${here.map(i => esc(i.title)).join("; ")}</p>` : ""}
        ${st.collapsed ? `<p class="warn">The public knows too much here. This region sends nothing and can't be recovered.</p>` : `
        <div class="row"><button class="act" type="button" id="coverBtn" ${cw ? `disabled title="${esc(cw)}"` : ""}>Cover story · $${COVER_STORY.cost}k · ${plural(coverDoses(c), "amnestic dose")}</button><span class="muted">${esc(cw || `${d.front} plants a story: −${COVER_STORY.cut} exposure here. Once every ${COVER_STORY.cooldown} days.`)}</span></div>
        <div class="row"><button class="act" type="button" id="locateBtn" ${lw ? `disabled title="${esc(lw)}"` : ""}>Locate an Insurgency cell · ${locateIntel(c)} Intel</button><span class="muted">${esc(lw || "Creates a strike mission here. Breaking the cell pays $80k and lowers exposure.")}</span></div>`}
      </div>
    </section>
    <section class="col">
      <div class="card">
        <div class="label">How exposure works</div>
        <p class="muted">Each region tracks its own exposure. Unanswered cover-ups add 12 there, failed missions 20, witnesses who get away undosed 5 each, and civilians killed 3 each. Breaches at Site-19 and an escaped anomaly count against the Eastern United States. Exposure eases by 3 everywhere each month; cover stories and won missions bring it down faster. Amnestics labs on the Site-19 tab brew the doses.</p>
      </div>
    </section>
  </div>`;
  }

  // ---------- Research ----------
  function researchTab() {
    const branches: Branch[] = ["SCP-173", ...(["049", "106"] as const).filter(id => c.scps.some(s => s.id === id)).map(id => `SCP-${id}` as Branch),
      ...((c.materials.prisoners ?? 0) > 0 ? ["Insurgency" as Branch] : []), "Personnel", "Weapons", "Equipment", "Site"];
    const offer = c.research.offer, insp = c.research.inspired;
    const bt = Object.keys(PROJECTS).filter(id => PROJECTS[id].breakthrough && !has(c, id) && offered(c, id));
    const s = scp173();
    return `<div class="hubgrid">
    <section class="col">
      <div class="card">
        <div class="label">Research · ${c.researchers} researchers, ${researchersFree(c)} unassigned · lab space for ${researcherCapacity(c)}</div>
        <p class="muted">Put researchers on any projects you like; each one adds a day of work per day. A project's cost is paid when work starts.</p>
        <p class="muted">Hire researchers at a research lab, and build equipment at the workshop, on the Site-19 tab.</p>
      </div>
      ${bt.length ? `<div class="card plan"><div class="label">Breakthrough${offer && !c.research.paid.includes(offer.id) ? ` · on offer until ${dateText(offer.until)}` : ""}</div><div class="projects">${bt.map(projectRow).join("")}</div></div>` : ""}
      ${insp && !has(c, insp.id) ? `<p class="muted">Inspiration: <b>${esc(PROJECTS[insp.id].name)}</b> takes half the time${c.research.paid.includes(insp.id) ? "" : ` if started by ${dateText(insp.until)}`}.</p>` : ""}
      ${branches.map(b => `<div class="card"><div class="label">${b}</div><div class="projects">${(() => { const ids = Object.keys(PROJECTS).filter(id => PROJECTS[id].branch === b && projectVisible(c, id)); return ids.length ? ids.map(projectRow).join("") : `<p class="muted">Nothing to research here yet.</p>`; })()}</div></div>`).join("")}
      <p class="muted">More research opens up as Site-19 learns: finished projects lead to new ones, and so do won missions, new anomalies, things brought back from the field, and the years passing.</p>
    </section>
    <section class="col">
      <div class="file">
        <div class="label">Tests on ${s.name}</div>
        <h2>Test log</h2>
        <p>Tests fill in ${s.name}'s file and open new research. Each is paid for up front and prepared by researchers like any other project; on the last day the D-Class go into the cell while the guards you chose watch. Riskier tests multiply the chance someone dies, and some can end in a breach. One test at a time.</p>
        ${(Object.keys(TESTS) as TestId[]).map(t => testRow(t)).join("")}
        ${watcherPicker()}
      </div>
    </section>
  </div>`;
  }

  function projectRow(id: string) {
    const p = PROJECTS[id], r = c.research, n = r.assigned[id] || 0, prog = r.progress[id] || 0;
    const done = has(c, id), lock = done ? null : projectLock(c, id);
    const days = projectDays(c, id), inspired = c.research.inspired?.id === id;
    const eta = n ? Math.ceil((days - prog) / n) : null;
    const status = done ? `<span class="flag">Done</span>` : lock ? `<span class="flag bad">Locked</span>`
      : n ? `<span class="flag stare">${plural(n, "researcher")} · ${plural(eta!, "day")} left</span>` : prog ? `<span class="flag">Paused</span>` : "";
    return `<div class="proj ${done ? "done" : ""} ${lock ? "locked" : ""}">
      <div class="ptop"><b>${esc(p.name)}</b>${inspired && !done ? `<span class="flag stare">Inspired</span>` : ""}${status}</div>
      <div class="muted">${esc(p.desc)}</div>
      ${done ? "" : `<div class="pbar"><div class="exp-bar"><span style="width:${Math.min(100, (prog / days) * 100)}%"></span></div><span class="specs">${prog}/${days} researcher-days${r.paid.includes(id) ? "" : ` · $${projectCost(c, id)}k to start`}</span></div>`}
      ${lock ? `<div class="why">${esc(lock)}</div>` : done ? "" : `<div class="row assign">
        <button class="act" type="button" data-unassign="${id}" ${n ? "" : "disabled"} aria-label="Remove a researcher">−</button>
        <b>${n}</b>
        <button class="act" type="button" data-assign="${id}" ${researchersFree(c) < 1 ? "disabled" : ""} aria-label="Add a researcher">+</button>
      </div>`}
    </div>`;
  }

  function testRow(t: TestId) {
    const d = TESTS[t], why = canTest(c, scp173(), t), done = c.research.tests.includes(t), r = c.research;
    const running = r.testing?.id === t, key = testKey(t), n = r.assigned[key] || 0, prog = r.progress[key] || 0;
    const opens = Object.values(PROJECTS).filter(p => p.needsTest === t).map(p => p.name).join(", ");
    const w = running ? c.guards.filter(g => g.alive && r.testing!.watchers.includes(g.id)) : watchPool().filter(o => watchers.has(o.id));
    const death = Math.min(0.95, workRisk(w) * d.risk);
    return `<div class="test ${done ? "done" : ""}">
      <div class="ptop"><b>${esc(d.name)}</b>${done ? `<span class="flag">Done</span>` : running ? `<span class="flag stare">${n ? `${plural(n, "researcher")} · ${plural(Math.ceil((d.days - prog) / n), "day")} left` : "Paused"}</span>` : ""}</div>
      <p>${esc(d.desc)}</p>
      <div class="specs">$${d.cost}k · ${d.days} researcher-days · ${d.dclass} D-Class · death risk ×${d.risk} (${pctText(death)} with ${running ? "the chosen" : "current"} watchers)${d.breach ? ` · ${pctText(d.breach)} chance of a breach` : ""} · opens ${esc(opens)}</div>
      ${running ? `<div class="pbar"><div class="exp-bar"><span style="width:${Math.min(100, (prog / d.days) * 100)}%"></span></div><span class="specs">${prog}/${d.days} researcher-days · watching: ${w.length ? w.map(g => esc(g.name)).join(", ") : "two D-Class only"}</span></div>
        <div class="row assign">
          <button class="act" type="button" data-unassign="${key}" ${n ? "" : "disabled"} aria-label="Remove a researcher">−</button>
          <b>${n}</b>
          <button class="act" type="button" data-assign="${key}" ${researchersFree(c) < 1 ? "disabled" : ""} aria-label="Add a researcher">+</button>
        </div>`
      : done ? "" : `<div class="row"><button class="act" type="button" data-test="${t}" ${why ? `disabled title="${esc(why)}"` : ""}>Start the test · $${d.cost}k</button>${why ? `<span>${esc(why)}</span>` : ""}</div>`}
    </div>`;
  }

  function workshopCard() {
    const items = unlockedItems(c), refits = pendingRefits(c), rfw = canRefit(c), atts = unlockedAttachments(c);
    return `<div class="card">
      <div class="label">Workshop</div>
      ${items.length ? `<div class="projects">${items.map(i => {
        const d = ITEMS[i], why = canOrder(c, i), queued = c.orders.filter(o => o.item === i).length;
        return `<div class="proj"><div class="ptop"><b>${esc(d.name)}</b><span class="flag">${c.inventory[i] || 0} in storage${queued ? ` · ${queued} being built` : ""}</span></div>
          <div class="muted">${esc(d.desc)}</div>
          <div class="row"><button class="act" type="button" data-order="${i}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${d.cost}k · ${plural(d.days, "day")} · 1 engineer</button>${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
      }).join("")}</div>` : `<p class="muted">Nothing to build yet. Equipment research unlocks items here.</p>`}
      ${refits.length ? `<div class="label" style="margin-top:10px">Refits</div><div class="projects">${refits.map(r => `<div class="proj"><div class="ptop"><b>Issue the ${esc(r.name)}</b></div>
        <div class="muted">Replaces the current model for everyone at once.</div>
        <div class="row"><button class="act" type="button" data-refit="${r.key}" ${rfw ? `disabled title="${esc(rfw)}"` : ""}>Refit · $${REFIT.cost}k · ${REFIT.days} days · 1 engineer</button>${rfw ? `<span class="muted">${esc(rfw)}</span>` : ""}</div></div>`).join("")}</div>` : ""}
      ${atts.length ? `<div class="label" style="margin-top:10px">Attachments</div><div class="projects">${atts.map(a => {
        const why = canOrderAttachment(c, a), fitted = c.roster.filter(o => o.alive && o.attachment === a).length;
        return `<div class="proj"><div class="ptop"><b>${ATTACHMENTS[a].name}</b><span class="flag">${c.attachments[a] ?? 0} spare · ${fitted} fitted</span></div>
          <div class="muted">${esc(ATTACHMENTS[a].desc)} Fit one per operative on the Personnel tab.</div>
          <div class="row"><button class="act" type="button" data-att="${a}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${ATTACHMENT_COST.cost}k · ${plural(ATTACHMENT_COST.days, "day")}</button>${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
      }).join("")}</div>` : ""}
      ${unlockedAmmo(c).length ? `<div class="label" style="margin-top:10px">Special ammunition</div><div class="projects">${unlockedAmmo(c).map(a => {
        const why = canOrderAmmo(c, a), loaded = c.roster.filter(o => o.alive && o.ammoType === a).length;
        return `<div class="proj"><div class="ptop"><b>${AMMO[a].name}</b><span class="flag">${c.ammo[a] ?? 0} spare · ${loaded} loaded</span></div>
          <div class="muted">${esc(AMMO[a].desc)} Load one per operative on the Personnel tab.</div>
          <div class="row"><button class="act" type="button" data-ammoorder="${a}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${ATTACHMENT_COST.cost}k · ${plural(ATTACHMENT_COST.days, "day")}</button>${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
      }).join("")}</div>` : ""}
      ${c.orders.length ? `<div class="specs">In production: ${c.orders.map(o => `${o.item ? ITEMS[o.item].name : o.attachment ? ATTACHMENTS[o.attachment].name : o.ammo ? AMMO[o.ammo].name : o.refit!.startsWith("tier:") ? "Weapon refit" : o.refit!.startsWith("armor:") ? `${ARMOR_TIERS[Number(o.refit!.slice(6))].name} refit` : `${model(o.refit!).name} refit`} (${plural(o.daysLeft, "day")})`).join(", ")}</div>` : ""}
    </div>`;
  }

  // ---------- Site-19 ----------
  function siteTab() {
    const rows: string[] = [];
    for (let level = 0; level < c.base.levels; level++) {
      const slots: string[] = [];
      for (let slot = 0; slot < SLOTS; slot++) slots.push(slotCell(level, slot));
      rows.push(`<div class="level"><div class="lvl">Level ${level + 1}${level === 0 ? "<span>surface</span>" : ""}</div>${slots.join("")}</div>`);
    }
    const exWhy = canExcavate(c);
    return `<div class="hubgrid site">
    <section class="col">
      <div class="card">
        <div class="label">Site-19 cross-section</div>
        ${powerShort(c) ? `<p class="warn-box">Power shortage: medical bay and psychological services are offline${unpowered(c) ? ", every containment wing is twice as likely to breach, and each cell has a 10% chance a day of failing outright" : ". Backup generators keep the containment wings running"}. Repair or build a generator, or evacuate anomalies from their wings.</p>` : ""}
        <div class="basegrid">${rows.join("")}</div>
        <div class="row">
          ${c.base.excavation > 0 ? `<span class="muted">Excavating level ${c.base.levels + 1}: ${plural(c.base.excavation, "day")} left.</span>`
            : c.base.levels < MAX_LEVELS ? `<button class="act" id="digBtn" type="button" ${exWhy ? `disabled title="${esc(exWhy)}"` : ""}>Excavate level ${c.base.levels + 1} · $${EXCAVATE.cost}k · ${EXCAVATE.days} days · ${EXCAVATE.engineers} engineers</button>${exWhy ? `<span class="muted">${esc(exWhy)}</span>` : ""}` : ""}
        </div>
        <p class="muted">Facilities share walls with the ones beside, above and below them. Security stations protect every containment wing on their level; breaches wreck neighbours, and a wrecked containment wing can crack open too.</p>
      </div>
    </section>
    <section class="col">
      ${sel ? slotDetail(sel.level, sel.slot) : `<div class="card"><div class="label">Facility</div><p class="muted">Select a slot to build, repair or inspect it.</p></div>`}
      ${c.scps.map(containmentCard).join("")}
    </section>
  </div>`;
  }

  function slotCell(level: number, slot: number) {
    const f = facilityAt(c, level, slot), on = sel && sel.level === level && sel.slot === slot;
    if (!f) return `<button type="button" class="slot empty ${on ? "sel" : ""}" data-slot="${level},${slot}"><span class="sname">Empty</span><span class="sstat">Build here</span></button>`;
    const d = FACILITIES[f.type], occ = occupantOf(c, f);
    const stat = f.demolishDays ? `Tearing down · ${plural(f.demolishDays, "day")}` : f.daysLeft > 0 ? `Building · ${plural(f.daysLeft, "day")}` : f.repairDays > 0 ? `Repairing · ${plural(f.repairDays, "day")}` : f.disabled ? "Damaged" : occ ? `${occ.name}${occ.status === "breach" ? " · BREACH" : occ.status === "loose" ? " · escaped" : occ.status === "away" ? " · at Site-17" : ""}` : isContainment(f.type) ? "Empty cells" : "Operational";
    const cls = [f.daysLeft > 0 ? "building" : "", f.disabled ? "damaged" : "", isContainment(f.type) ? "cont" : "", occ && (occ.status === "breach" || occ.status === "loose") ? "alarm" : ""].join(" ");
    return `<button type="button" class="slot ${cls} ${on ? "sel" : ""}" data-slot="${level},${slot}"><span class="sname">${esc(d.name)}</span><span class="sstat">${esc(stat)}</span></button>`;
  }

  function slotDetail(level: number, slot: number) {
    const f = facilityAt(c, level, slot);
    if (!f) {
      const types = (Object.keys(FACILITIES) as FacilityType[]).filter(t => FACILITIES[t].buildable);
      return `<div class="card"><div class="label">Build on level ${level + 1}, slot ${slot + 1}</div>
        <div class="buildlist">${types.map(t => {
          const d = FACILITIES[t], why = canBuild(c, t, level, slot);
          return `<div class="buildopt">
            <div><b>${esc(d.name)}</b><div class="muted">${esc(d.desc)}</div>
            <div class="specs">$${d.cost}k · ${plural(d.days, "day")} · ${d.engineers} engineers · ${d.power < 0 ? `+${-d.power}` : d.power} power · $${d.upkeep}k/month</div></div>
            <button class="act" type="button" data-build="${t}" ${why ? `disabled title="${esc(why)}"` : ""}>Build</button>
            ${why ? `<div class="why">${esc(why)}</div>` : ""}
          </div>`;
        }).join("")}</div></div>`;
    }
    const d = FACILITIES[f.type], occ = occupantOf(c, f), rw = canRepair(c, f);
    const nb = neighbors(c, f).map(n => FACILITIES[n.type].name).join(", ") || "nothing";
    const s = scp173();
    const moveWhy = isContainment(f.type) && !occ ? canMove(c, s, f) : null;
    return `<div class="card"><div class="label">Level ${f.level + 1}, slot ${f.slot + 1}</div>
      <h3 class="fac">${esc(d.name)}</h3>
      <p class="muted">${esc(d.desc)}</p>
      <div class="specs">${d.power < 0 ? `Supplies ${-d.power} power` : `Uses ${d.power} power`} · $${d.upkeep}k/month upkeep${d.grade !== undefined ? ` · ${GRADE_NAMES[d.grade]} grade` : ""}</div>
      <div class="specs">Next to: ${esc(nb)}</div>
      <p>${f.demolishDays ? "Shut down while it's taken apart." : f.daysLeft > 0 ? `Under construction: ${plural(f.daysLeft, "day")} left.` : f.repairDays > 0 ? `Engineers are repairing it: ${plural(f.repairDays, "day")} left.` : f.disabled ? `<span class="warn">Damaged in a breach and out of action.</span>` : "Operational."}</p>
      ${f.type === "barracks" && !f.upgraded ? (() => { const uw = canUpgrade(c, f);
        return f.upgradeDays ? `<p class="muted">Being expanded: ${plural(f.upgradeDays, "day")} left.</p>` : `<div class="row"><button class="act" id="upgradeBtn" type="button" ${uw ? `disabled title="${esc(uw)}"` : ""}>Expand to 15 beds · $${UPGRADE.cost}k · ${plural(UPGRADE.days, "day")} · ${UPGRADE.engineers} engineers</button>${uw ? `<span class="muted">${esc(uw)}</span>` : ""}</div>`; })() : f.upgraded ? `<p class="muted">Expanded: holds 15 D-Class.</p>` : ""}
      ${f.demolishDays ? `<p class="warn">Being torn down: ${plural(f.demolishDays, "day")} left.</p>` : f.type === "command" ? "" : (() => { const dw = canDemolish(c, f);
        return `<div class="row"><button class="act" id="demolishBtn" type="button" ${dw ? `disabled title="${esc(dw)}"` : ""}>Tear down · ${plural(demolishDays(f), "day")} · 1 engineer · +$${Math.round(d.cost * DEMOLISH.refund)}k salvage</button>${dw ? `<span class="muted">${esc(dw)}</span>` : demolishLeavesShort(c, f) ? `<span class="warn">This would leave Site-19 short of power.</span>` : ""}</div>`; })()}
      ${f.disabled && f.repairDays === 0 ? `<div class="row"><button class="act primary" id="repairBtn" type="button" ${rw ? `disabled title="${esc(rw)}"` : ""}>Repair · $${REPAIR.cost}k · ${REPAIR.days} days · ${REPAIR.engineers} engineers</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>` : ""}
      ${facilityPanel(f)}
      ${occ ? `<p>Holds <b>${occ.name}</b>.</p>` : ""}
      ${isContainment(f.type) && !occ && operational(f) && s.status === "contained" ? `
        <p class="muted">Moving ${s.name} here takes D-Class to shift it, with guards watching if you post them, and $20k. The same risk as a cleaning applies.</p>
        ${watcherPicker()}
        <div class="row"><button class="act" id="moveBtn" type="button" ${moveWhy ? `disabled title="${esc(moveWhy)}"` : ""}>Move ${s.name} here</button>${moveWhy ? `<span class="muted">${esc(moveWhy)}</span>` : ""}</div>` : ""}
    </div>`;
  }

  function containmentCard(s: ScpRecord) {
    const wing = wingOf(c, s);
    const r = breachRisk(c, s), due = s.lastCleaned + CLEAN_EVERY - c.day, cw = canClean(c, s);
    if (s.status !== "contained") return scpSummary(s);
    return `<div class="file">
      <div class="label">Containment · ${s.name}</div>
      <h2>${s.name} · ${s.title} <small>${s.cls}</small></h2>
      <p>Held in the ${wing ? `${nameInText(wing.type)} on level ${wing.level + 1}` : "?"}.</p>
      <div class="riskline"><b>Breach risk ${pctText(r.p)} a day</b></div>
      <ul class="why">${r.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
      <div class="maint"><span>Maintenance ${s.maintenance}%</span><div class="exp-bar"><span style="width:${s.maintenance}%"></span></div></div>
      <p>Its cell must be cleaned every ${CLEAN_EVERY} days. D-Class do it alone: ${CLEAN_CREW} go in, one cleans while two keep their eyes on it. If both watchers blink at once (${pctText(CLEAN_RISK)}), the one cleaning dies. A breach has to be answered the moment it starts.</p>
      <label class="armorpick"><input type="checkbox" id="cleanOrder" ${c.cleaningOrder ? "checked" : ""}> Standing order: D-Class clean it on schedule</label>
      <p>${c.cleaningOrder ? `Next scheduled cleaning ${due > 0 ? `in ${plural(due, "day")}` : "today"}.` : `Next cleaning ${due > 0 ? `due in ${plural(due, "day")}` : "<b>overdue</b>"}. Order it below.`}</p>
      <div class="row"><button class="act primary" data-clean="${s.id}" type="button" ${cw ? `disabled title="${esc(cw)}"` : ""}>Clean the cell now · ${CLEAN_CREW} D-Class</button>${cw ? `<span>${esc(cw)}</span>` : ""}</div>
      ${evacBlock(s)}
    </div>`;
  }

  /** Only while its wing is damaged or without power: rush it somewhere safer. */
  function evacBlock(s: ScpRecord) {
    if (canEvacuate(c, s)) return "";
    const wing = wingOf(c, s)!, free = freeWings(c, s.cls).filter(f => f !== wing), poor = c.funds < EVAC.cost;
    return `<div class="facpanel"><div class="label">Emergency evacuation</div>
      <p class="warn">The ${wing.disabled ? "wing is damaged" : "wing has no power"}${unpowered(c) ? ": every day the site stays short of power, its cell has a 10% chance of failing outright" : ""}.</p>
      ${free.length ? `<p class="muted">Rushing it into a free wing costs $${EVAC.cost}k and is twice as dangerous as a normal move.</p>${watcherPicker()}
        <div class="row">${free.map(f => `<button class="act" type="button" data-evac="${s.id}" data-to="${f.id}" ${poor ? `disabled title="Needs $${EVAC.cost}k."` : ""}>Evacuate to the ${esc(nameInText(f.type))} on level ${f.level + 1}</button>`).join("")}</div>`
        : `<p class="muted">No free ${s.cls}-grade wing. Site-17 can hold it for ${EVAC.transferDays} days.</p>
        <div class="row"><button class="act" type="button" data-transfer="${s.id}" ${c.funds < EVAC.transferCost ? `disabled title="Needs $${EVAC.transferCost}k."` : ""}>Send it to Site-17 · $${EVAC.transferCost}k</button></div>`}
    </div>`;
  }

  function watcherPicker() {
    const pool = watchPool(), w = pool.filter(o => watchers.has(o.id));
    return `<div class="watch">
      <div class="specs">Two D-Class always watch. Post up to ${MAX_WATCHERS} guards at the door as well: chance a D-Class dies <b>${pctText(workRisk(w))}</b>. Each guard loses 8 sanity.</div>
      <div class="pick">${pool.map(o => `<label class="pickop small ${watchers.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="watch-${o.id}" data-watch="${o.id}" ${watchers.has(o.id) ? "checked" : ""} ${!watchers.has(o.id) && watchers.size >= MAX_WATCHERS ? "disabled" : ""}>
        <span>Guard ${esc(o.name)} · SAN ${o.san}/${GUARD.maxSan}</span></label>`).join("") || `<span class="muted">No guards available.</span>`}</div>
    </div>`;
  }

  // ---------- facility panels: everything you do with a facility happens in its own panel ----------
  function guardRow(g: Guard) {
    const pw = canPromote(c, g);
    return `<li><b>${esc(g.name)}</b> · HP ${g.hp}/${g.maxHp} · SAN ${g.san}/${GUARD.maxSan} · aim ${g.aim} · ${plural(g.breaches, "breach")} survived${g.traits.length ? ` · ${g.traits.map(t => TRAITS[t].name).join(", ")}` : ""}
      ${g.training !== undefined ? `<span class="flag">MTF training · ${plural(g.training, "day")}</span>`
        : g.breaches >= PROMOTE.breaches ? `<button class="act" type="button" data-promote="${g.id}" ${pw ? `disabled title="${esc(pw)}"` : ""}>Put forward for Epsilon-11 · $${PROMOTE.cost}k · ${PROMOTE.days} days</button>` : ""}</li>`;
  }
  function facilityPanel(f: Facility) {
    if (!operational(f)) return "";
    const box = (label: string, body: string) => `<div class="facpanel"><div class="label">${label}</div>${body}</div>`;
    switch (f.type) {
      case "security": {
        const here = postedAt(c, f.id), gw = canHireGuard(c, f.id), loose = unposted(c), room = here.length < GUARD.perStation;
        return box(`Site Security post · ${here.length} of ${GUARD.perStation} guards`, `
          <p class="muted">Guards here are first on the scene of a breach in any wing on this level. Others arrive a turn later. Weaker than operatives: aim around 55, ${GUARD.maxSan} sanity, ${GUARD.hp} HP, and they blink more. After ${PROMOTE.breaches} breaches a guard can train into Epsilon-11.</p>
          ${here.length ? `<ul class="memorial">${here.map(guardRow).join("")}</ul>` : `<p class="warn">Nobody is posted here.</p>`}
          <div class="row"><button class="act" type="button" data-hireguard="${f.id}" ${gw || c.over ? `disabled title="${esc(gw || "")}"` : ""}>Hire guard for this post · $${GUARD.cost}k · $5k a month</button>${gw ? `<span class="muted">${esc(gw)}</span>` : ""}</div>
          ${loose.length ? `<p>Without a post: ${loose.map(g => `<b>${esc(g.name)}</b> ${room ? `<button class="act" type="button" data-post="${g.id}" data-station="${f.id}">Post here</button>` : ""}`).join(" ")}</p>` : ""}`);
      }
      case "training": return box(`Training range · squad size ${squadSize(c)}`, `
        <p class="muted">One-off courses, like XCOM's Guerrilla Tactics School. Operatives here also gain 1 XP a week, and can retrain into a new class.</p>
        <div class="projects">${Object.entries(TRAINING).map(([id, t]) => { const w = canTrain(c, id), got = c.purchases.includes(id);
          return `<div class="proj ${got ? "done" : ""}"><div class="ptop"><b>${esc(t.name)}</b>${got ? `<span class="flag">Done</span>` : ""}</div><div class="muted">${esc(t.desc)}</div>
          ${got ? "" : `<div class="row"><button class="act" type="button" data-train="${id}" ${w ? `disabled title="${esc(w)}"` : ""}>Buy · $${t.cost}k</button>${w ? `<span class="muted">${esc(w)}</span>` : ""}</div>`}</div>`; }).join("")}</div>
        <div class="label" style="margin-top:10px">Trainers · ${(c.retired ?? []).filter(r => r.trainer).length} of ${TRAINER.max}</div>
        ${(c.retired ?? []).some(r => r.trainer) ? `<p>${c.retired!.filter(r => r.trainer).map(r => `<b>${RANKS[r.rank]} ${esc(r.name)}</b>`).join(", ")} ${c.retired!.filter(r => r.trainer).length > 1 ? "train" : "trains"} recruits here: new operatives arrive as Privates First Class.</p>`
          : `<p class="muted">A Master Sergeant or Sergeant Major can retire here as a trainer (from their page on the Personnel tab). While one is here, new recruits arrive as Privates First Class.</p>`}
        <div class="label" style="margin-top:10px">Retraining · $50k · 5 days</div>
        ${c.roster.filter(o => o.alive && o.cls).map(o => { const rw = canRetrain(c, o); return `<div class="row"><span>${esc(o.call)} ${esc(o.name)} · ${CLASSES[o.cls!].name}</span><button class="act" type="button" data-retrain="${o.id}" ${rw ? `disabled title="${esc(rw)}"` : ""}>Retrain</button>${rw && rw !== "Already away from duty." ? "" : rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>`; }).join("") || `<p class="muted">Nobody has a class yet.</p>`}`);
      case "psych": {
        const need = c.roster.filter(o => o.alive && o.traits.some(t => TRAITS[t].bad));
        return box("Psychological services · therapy $30k, 7 days", `
          <p class="muted">Operatives recover 20 sanity a day instead of 10. One at a time can be treated for a bad trait.</p>
          ${need.length ? need.map(o => { const tw = canTherapy(c, o); return `<div class="row"><span>${esc(o.call)} ${esc(o.name)}${o.busy?.kind === "therapy" ? " · in therapy" : ""}</span>${o.traits.filter(t => TRAITS[t].bad).map(t => `<button class="act" type="button" data-therapy="${t}" data-op="${o.id}" ${tw ? `disabled title="${esc(tw)}"` : ""}>Treat ${esc(TRAITS[t].name.toLowerCase())}</button>`).join("")}</div>`; }).join("") : `<p class="muted">Nobody needs treatment.</p>`}`);
      }
      case "holding": return box(`Holding cells · ${c.prisoners.length} of ${holdingCapacity(c)} occupied · Intel ${c.intel}`, `
        <p class="muted">Each prisoner yields 1 Intel every ${interrogationDays(c)} days, ${INTEL_PER_PRISONER} in all. With no room, prisoners go to another site for $${PRISONER_BOUNTY}k.</p>
        ${c.prisoners.length ? `<ul class="memorial">${c.prisoners.map(p => `<li><b>${esc(p.name)}</b> · held ${plural(p.days, "day")} · ${p.intel}/${INTEL_PER_PRISONER} Intel given</li>`).join("")}</ul>` : `<p class="muted">No prisoners.</p>`}`);
      case "barracks": { const dWhy = canBuyDClass(c), rw = canAddRecreation(c, f); return box(`D-Class · ${c.dclass} of ${dclassCapacity(c)} beds across all barracks`, `
        <p class="muted">${DCLASS_MONTHLY} D-Class are transferred in each month while there's room.</p>
        <div class="exposure"><span>Block morale</span><div class="exp-bar"><span style="width:${c.morale}%"></span></div><b>${c.morale}</b></div>
        <p class="muted">Overcrowding (over 80% of beds) costs 2 a day, every D-Class death 5, a termination order 15. Under 60% full it recovers 1 a day. Below 30 the block can riot.</p>
        <div class="row"><label class="specs" for="dpolicy">Monthly order</label><select id="dpolicy" data-dpolicy>
          <option value="terminate" ${c.dPolicy === "terminate" ? "selected" : ""}>Terminate all but 10 (free, morale −15)</option>
          <option value="retain" ${c.dPolicy === "retain" ? "selected" : ""}>Keep them all ($2k each a month)</option>
          <option value="release" ${c.dPolicy === "release" ? "selected" : ""}>Release all but 10 with amnestics (1 dose per 5)</option>
        </select></div>
        ${f.recreation ? `<p class="muted">This barracks has a recreation room (morale +1 a day).</p>` : `<div class="row"><button class="act" type="button" id="recBtn" ${rw ? `disabled title="${esc(rw)}"` : ""}>Add a recreation room · $${RECREATION.cost}k</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>`}
        <div class="row"><button class="act" id="dBuyBtn" type="button" ${dWhy || c.over ? `disabled title="${esc(dWhy || "")}"` : ""}>Request 2 D-Class · $${DCLASS_COST * 2}k</button>${dWhy ? `<span class="muted">${esc(dWhy)}</span>` : ""}</div>`); }
      case "workshop": { const eWhy = canHireEngineer(c); return box(`Workshop · engineers ${engineersFree(c)} of ${c.engineers} free`, `
        <div class="row"><button class="act" id="engBtn" type="button" ${eWhy || c.over ? `disabled title="${esc(eWhy || "")}"` : ""}>Hire engineer · $${ENGINEER_COST}k</button>${eWhy ? `<span class="muted">${esc(eWhy)}</span>` : ""}</div>
        ${workshopCard()}`); }
      case "lab": { const rw = canHireResearcher(c); return box(`Research lab · ${c.researchers} researchers, ${researchersFree(c)} unassigned, room for ${researcherCapacity(c)}`, `
        <div class="row"><button class="act" id="hireResBtn" type="button" ${rw ? `disabled title="${esc(rw)}"` : ""}>Hire researcher · $60k</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>
        <p class="muted">Working on: ${Object.entries(c.research.assigned).filter(([, n]) => n).map(([id, n]) => `${esc(PROJECTS[id]?.name ?? (TESTS[id.slice(5) as TestId]?.name || id))} (${n})`).join(", ") || "nothing"}.</p>
        <button class="act" type="button" data-goto="research">Open the Research tab</button>`); }
      case "amnestics": return box(`Amnestics · ${c.amnestics} of ${amnesticsCapacity(c)} doses`, `<p class="muted">Each lab brews ${has(c, "classb_amnestics") ? 2 : 1} dose every 5 days. Doses go on cover-ups and cover stories.</p>`);
      case "medical": { const hurt = c.roster.filter(o => o.alive && o.hp < o.maxHp); return box(`Medical bay · ${healPerDay(c)} HP a day`, hurt.length ? `<ul class="memorial">${hurt.map(o => `<li>${esc(o.call)} ${esc(o.name)} · HP ${o.hp}/${o.maxHp}</li>`).join("")}</ul>` : `<p class="muted">Nobody is wounded.</p>`); }
      default: return "";
    }
  }

  // ---------- Personnel ----------
  function personnelTab() {
    return `<div class="hubgrid">
    <section class="col">
      <div class="card">
        <div class="label">Epsilon-11 roster</div>
        <p class="muted">Select an operative to see their class, perks and traits.</p>
        <div class="roster">${c.roster.filter(o => o.alive).map(opRow).join("")}</div>
        <div class="row"><button class="act" id="recruitBtn" type="button" ${c.funds < RECRUIT_COST || c.over ? "disabled" : ""}>Recruit operative · $${RECRUIT_COST}k · $10k a month</button></div>
      </div>
    </section>
    <section class="col">
      ${opDetail()}
      <p class="muted">Guards, training, therapy, D-Class, engineers and prisoners are managed from their facilities on the Site-19 tab.</p>
      ${c.retired?.length ? `<div class="card">
        <div class="label">Retired</div>
        <ul class="memorial">${c.retired.map(r => `<li><b>${esc(r.call)} ${esc(r.name)}</b>, ${RANKS[r.rank]} · ${plural(r.missions, "mission")} · ${r.trainer ? "trainer at the range" : "honourable discharge"}, ${dateText(r.day)}</li>`).join("")}</ul>
      </div>` : ""}
      ${c.roster.some(o => !o.alive) ? `<div class="card">
        <div class="label">Memorial</div>
        <ul class="memorial">${c.roster.filter(o => !o.alive).map(o => `<li><b>${esc(o.call)} ${esc(o.name)}</b>, ${RANKS[o.rank]} · ${plural(o.missions, "mission")} · killed on day ${o.diedDay}, ${esc(o.diedAt || "")}</li>`).join("")}</ul>
      </div>` : ""}
    </section>
  </div>`;
  }

  function opDetail() {
    const o = c.roster.find(x => x.id === opSel && x.alive);
    if (!o) return "";
    const pair = perkChoices(o), tw = canTherapy(c, o), rw = canRetrain(c, o);
    const bad = o.traits.filter(t => TRAITS[t].bad);
    return `<div class="card plan">
      <div class="label">${esc(o.call)} · ${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}</div>
      <h3 class="fac">${esc(o.name)}</h3>
      ${o.busy ? `<p class="warn">${o.busy.kind === "therapy" ? "In therapy" : o.busy.kind === "travel" ? "Flying home" : "Retraining"}: ${plural(o.busy.daysLeft, "day")} left. Can't deploy until then.</p>` : ""}
      ${o.bio ? `<p class="muted">Age ${o.bio.age + Math.floor((c.day - 1) / 365)}, from ${esc(o.bio.home)}. ${esc(o.bio.story)}</p>` : ""}
      <div class="specs">Service: ${plural(o.missions, "mission")} · ${plural(o.kills, "kill")} · wounded ${o.wounds ?? 0}× · ${(o.seals ?? 0) === 1 ? "1 anomaly" : `${o.seals ?? 0} anomalies`} sealed${o.faced?.length ? ` · faced ${esc(o.faced.join(", "))}` : ""}</div>
      ${o.medals?.length ? `<ul class="traits">${o.medals.map(m => `<li class="good"><b>${MEDALS[m].name}</b>: ${esc(MEDALS[m].bonus)} <span class="muted">${esc(MEDALS[m].how)}</span></li>`).join("")}</ul>` : ""}
      ${o.busy ? "" : (() => { const tw = trainerWhy(c, o); return `<details class="archived"><summary>Retire</summary>
        <p class="muted">${tw ? `${esc(tw)} They can still leave with an honourable discharge.` : "As a trainer at the range, new recruits arrive as Privates First Class while they're there."}</p>
        <div class="row"><button class="act" type="button" data-retire="${o.id}">${tw ? "Honourable discharge" : "Retire as a trainer"}</button></div></details>`; })()}
      <details class="archived"><summary>Rename</summary><div class="row">
        <label class="specs" for="renameName">Name</label><input id="renameName" maxlength="24" value="${esc(o.name)}">
        <label class="specs" for="renameCall">Callsign</label><input id="renameCall" maxlength="12" value="${esc(o.call)}">
        <button class="act" type="button" id="renameBtn">Save</button></div></details>
      ${promotionDue(o) && !o.cls ? `<p><b>Choose a class.</b> It decides the abilities they learn from here on.</p>
        <div class="classpick">${(Object.keys(CLASSES) as ClassId[]).map(k => `<button type="button" class="classopt" data-class="${k}">
          <b>${CLASSES[k].name}</b><span class="muted">${CLASSES[k].role}</span>
          <span class="specs">Starts with ${PERKS[CLASSES[k].base].name}: ${esc(PERKS[CLASSES[k].base].desc)}</span>
          <span class="specs">Later: ${CLASSES[k].choices.map(p => p.map(x => PERKS[x].name).join(" or ")).join(" · ")}</span></button>`).join("")}</div>` : ""}
      ${pair ? `<p><b>Choose a perk for ${RANKS[o.rank]}.</b></p>
        <div class="classpick two">${pair.map(p => `<button type="button" class="classopt" data-perk="${p}"><b>${PERKS[p].name}</b><span class="muted">${esc(PERKS[p].desc)}</span></button>`).join("")}</div>` : ""}
      ${o.cls ? `<div class="label" style="margin-top:10px">Perk tree</div>
        <ol class="tree">
          <li><b>${PERKS[CLASSES[o.cls].base].name}</b> <span class="muted">${esc(PERKS[CLASSES[o.cls].base].desc)}</span></li>
          ${CLASSES[o.cls].choices.map((p, i) => {
            const got = o.perks[i + 1];
            return `<li>${RANKS[i + 2]}: ${got ? `<b>${PERKS[got].name}</b> <span class="muted">${esc(PERKS[got].desc)}</span>` : `<span class="muted">${p.map(x => PERKS[x].name).join(" or ")}${o.rank >= i + 2 ? " (choose above)" : ""}</span>`}</li>`;
          }).join("")}
          ${[5, 6].map(r => `<li>${RANKS[r]}: <span class="${o.rank >= r ? "" : "muted"}">${RANK_BONUS[r]}</span></li>`).join("")}
        </ol>` : ""}
      <div class="label" style="margin-top:10px">Traits</div>
      ${o.traits.length ? `<ul class="traits">${o.traits.map(t => `<li class="${TRAITS[t].bad ? "bad" : "good"}"><b>${TRAITS[t].name}</b>: ${esc(TRAITS[t].desc)} <span class="muted">${esc(TRAITS[t].how)}</span>
        ${TRAITS[t].bad && !o.busy ? `<span class="muted">Treatable at Psychological services.</span>` : ""}</li>`).join("")}</ul>
        ${bad.length && tw ? `<p class="muted">${esc(tw)}</p>` : ""}` : `<p class="muted">None yet. Traits come from what happens to them on missions.</p>`}
      <div class="label" style="margin-top:10px">Weapon</div>
      <div class="row">
        ${weaponOptions(o).map(t => `<button type="button" class="act ${weaponOf(o) === t ? "on" : ""}" data-setweapon="${t}">${TYPES[t].name}: ${model(c.models[t]).name}</button>`).join("")}
      </div>
      <div class="specs">${esc(TYPES[weaponOf(o)].desc)} ${model(c.models[weaponOf(o)]).dmg.join("–")} damage, ${gunFor(c, o).mag} rounds.</div>
      <div class="row">
        <label for="att-${o.id}" class="specs">Attachment</label>
        <select id="att-${o.id}" data-fit="${o.id}">
          <option value="">None</option>
          ${(Object.keys(ATTACHMENTS) as AttachmentId[]).filter(a => o.attachment === a || (c.attachments[a] ?? 0) > 0).map(a => `<option value="${a}" ${o.attachment === a ? "selected" : ""}>${ATTACHMENTS[a].name}: ${esc(ATTACHMENTS[a].desc)}</option>`).join("")}
        </select>
      </div>
      <div class="row">
        <label for="ammo-${o.id}" class="specs">Ammunition</label>
        <select id="ammo-${o.id}" data-ammo="${o.id}">
          <option value="">Standard ball</option>
          ${(Object.keys(AMMO) as AmmoId[]).filter(a => o.ammoType === a || (c.ammo[a] ?? 0) > 0).map(a => `<option value="${a}" ${o.ammoType === a ? "selected" : ""}>${AMMO[a].name}: ${esc(AMMO[a].desc)}</option>`).join("")}
        </select>
      </div>
      <div class="specs">Sidearm: ${SIDEARM.name}, ${SIDEARM.dmg.join("–")} damage, fired automatically when the main weapon is empty.</div>
      ${o.cls && !o.busy ? `<p class="muted">Retraining (a new class, keeping their rank) is arranged at the training range.</p>` : ""}
    </div>`;
  }

  function opRow(o: Operative) {
    const next = RANK_XP[o.rank + 1], heal = healPerDay(c);
    const days = Math.ceil((o.maxHp - o.hp) / heal);
    const status = o.busy ? `<span class="flag">${o.busy.kind === "therapy" ? "Therapy" : o.busy.kind === "travel" ? "In transit" : "Retraining"} · ${plural(o.busy.daysLeft, "day")}</span>`
      : promotionDue(o) ? `<span class="flag stare">Promotion</span>`
      : deployable(o) ? `<span class="flag">Ready</span>` : `<span class="flag bad">Wounded · ${plural(days, "day")}</span>`;
    const ms = maxSanOf(o);
    return `<button type="button" class="oprow ${opSel === o.id ? "sel" : ""}" data-op="${o.id}">
      <span class="tag">${esc(o.call)}</span>
      <span class="nm">${esc(o.name)} <span class="muted">${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}</span></span>
      ${status}
      <span class="bars">
        <span>HP ${o.hp}/${o.maxHp}<span class="meter" style="--c: var(--mtf)"><span style="width:${(o.hp / o.maxHp) * 100}%"></span></span></span>
        <span>SAN ${o.san}<span class="meter" style="--c: ${o.san <= ms * 0.3 ? "var(--alert)" : "var(--manila)"}"><span style="width:${(o.san / ms) * 100}%"></span></span></span>
        <span>Aim ${aimOf(o)}</span>
        <span>Blink ${Math.round(blinkFullOf(o) * 100)}%</span>
        <span>XP ${o.xp}${next !== undefined ? `/${next}` : ""}</span>
        <span>${plural(o.missions, "mission")} · ${plural(o.kills, "kill")}</span>
        ${o.traits.map(t => `<span class="flag ${TRAITS[t].bad ? "bad" : ""}">${TRAITS[t].name}</span>`).join("")}
      </span>
    </button>`;
  }

  // ---------- events ----------
  function bind() {
    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id);
    const on = (id: string, f: () => void) => { const el = $(id); if (el) el.onclick = f; };
    const change = (f: () => void) => { f(); act.save(); render(); };
    const chosenWatchers = () => watchPool().filter(o => watchers.has(o.id));

    root.querySelectorAll<HTMLElement>("[data-tab],[data-goto]").forEach(b => b.onclick = () => {
      flashMsg = "";
      tab = (b.dataset.tab || b.dataset.goto) as Tab;
      if (tab !== "world") speed = 0;   // time only passes on the world map
      try { localStorage.setItem("site19-tab", tab); } catch { /* fine */ }
      render();
    });
    const tryDo = (f: () => string | null | void) => { const why = f(); flashMsg = why || ""; act.save(); render(); };
    on("hireResBtn", () => change(() => hireResearcher(c)));
    root.querySelectorAll<HTMLElement>("[data-assign]").forEach(b => b.onclick = () => tryDo(() => assign(c, b.dataset.assign!, 1)));
    root.querySelectorAll<HTMLElement>("[data-unassign]").forEach(b => b.onclick = () => tryDo(() => assign(c, b.dataset.unassign!, -1)));
    root.querySelectorAll<HTMLElement>("[data-test]").forEach(b => b.onclick = () => change(() => startTest(c, scp173(), b.dataset.test as TestId, chosenWatchers())));
    root.querySelectorAll<HTMLElement>("[data-order]").forEach(b => b.onclick = () => change(() => order(c, b.dataset.order as ItemId)));
    root.querySelectorAll<HTMLSelectElement>("[data-armor]").forEach(b => b.onchange = () => {
      const g = gearOf(b.dataset.armor!); g.armor = b.value as ItemId | "";
      if (g.armor !== "armor_heavy") g.items = g.items.map(i => (i && HEAVY.includes(i) ? "" : i));
      render();
    });
    root.querySelectorAll<HTMLSelectElement>("[data-gear]").forEach(b => b.onchange = () => {
      gearOf(b.dataset.gear!).items[Number(b.dataset.slotI)] = b.value as ItemId | "";
      render();
    });
    root.querySelectorAll<SVGElement>("[data-region]").forEach(b => {
      const pickRegion = () => { regionSel = b.dataset.region as RegionId; render(); };
      b.onclick = pickRegion;
      b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickRegion(); } };
    });
    on("coverBtn", () => change(() => coverStory(c, regionSel)));
    on("locateBtn", () => change(() => locateCell(c, regionSel)));
    root.querySelectorAll<HTMLElement>("[data-speed]").forEach(b => b.onclick = () => setSpeed(Number(b.dataset.speed)));
    on("noticeGo", () => { tab = c.notices![0].tab; c.notices = []; act.save(); render(); window.scrollTo(0, 0); });
    on("noticeOk", () => { c.notices = []; act.save(); setSpeed(lastSpeed); });
    on("recruitBtn", () => change(() => recruit(c)));
    root.querySelectorAll<HTMLElement>("[data-op]").forEach(b => b.onclick = () => { opSel = opSel === b.dataset.op ? null : b.dataset.op!; render(); });
    const opNow = () => c.roster.find(x => x.id === opSel)!;
    root.querySelectorAll<HTMLElement>("[data-class]").forEach(b => b.onclick = () => change(() => chooseClass(c, opNow(), b.dataset.class as ClassId)));
    root.querySelectorAll<HTMLElement>("[data-perk]").forEach(b => b.onclick = () => change(() => choosePerk(c, opNow(), b.dataset.perk as PerkId)));
    const opById = (id?: string) => c.roster.find(x => x.id === id);
    root.querySelectorAll<HTMLElement>("[data-therapy]").forEach(b => b.onclick = () => { const o = opById(b.dataset.op); if (o) change(() => startTherapy(c, o, b.dataset.therapy as TraitId)); });
    root.querySelectorAll<HTMLElement>("[data-retrain]").forEach(b => b.onclick = () => { const o = opById(b.dataset.retrain); if (o) change(() => startRetrain(c, o)); });
    root.querySelectorAll<HTMLElement>("[data-hireguard]").forEach(b => b.onclick = () => change(() => hireGuard(c, b.dataset.hireguard!)));
    root.querySelectorAll<HTMLElement>("[data-post]").forEach(b => b.onclick = () => { const g = c.guards.find(x => x.id === b.dataset.post); if (g) change(() => postGuard(c, g, b.dataset.station!)); });
    root.querySelectorAll<HTMLElement>("[data-setweapon]").forEach(b => b.onclick = () => change(() => setWeapon(c, opNow(), b.dataset.setweapon as WeaponType)));
    root.querySelectorAll<HTMLSelectElement>("[data-ammo]").forEach(b => b.onchange = () => change(() => loadAmmo(c, opNow(), b.value as AmmoId | "")));
    root.querySelectorAll<HTMLElement>("[data-ammoorder]").forEach(b => b.onclick = () => change(() => orderAmmo(c, b.dataset.ammoorder as AmmoId)));
    root.querySelectorAll<HTMLSelectElement>("[data-fit]").forEach(b => b.onchange = () => change(() => fitAttachment(c, opNow(), b.value as AttachmentId | "")));
    root.querySelectorAll<HTMLSelectElement>("[data-weapon]").forEach(b => b.onchange = () => change(() => { const o = c.roster.find(x => x.id === b.dataset.weapon); if (o) setWeapon(c, o, b.value as WeaponType); }));
    root.querySelectorAll<HTMLElement>("[data-refit]").forEach(b => b.onclick = () => change(() => orderRefit(c, b.dataset.refit!)));
    root.querySelectorAll<HTMLElement>("[data-att]").forEach(b => b.onclick = () => change(() => orderAttachment(c, b.dataset.att as AttachmentId)));
    on("intelBtn", () => { const inc = c.incidents.find(i => i.id === planning); if (inc) change(() => weaken(c, inc)); });
    { const el = $("cleanOrder") as HTMLInputElement | null; if (el) el.onchange = () => change(() => { c.cleaningOrder = el.checked; }); }
    on("dBuyBtn", () => change(() => buyDClass(c)));
    on("engBtn", () => change(() => hireEngineer(c)));
    on("digBtn", () => change(() => excavate(c)));
    root.querySelectorAll<HTMLElement>("[data-evac]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.evac), f = c.base.facilities.find(x => x.id === b.dataset.to); if (s && f) change(() => evacuate(c, s, f, chosenWatchers())); });
    root.querySelectorAll<HTMLElement>("[data-transfer]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.transfer); if (s) change(() => transferOut(c, s)); });
    root.querySelectorAll<HTMLElement>("[data-clean]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.clean); if (s) change(() => cleanCell(c, s)); });
    root.querySelectorAll<HTMLElement>("[data-alert]").forEach(b => b.onclick = () => change(() => { c.alert = b.dataset.alert as Alert; }));
    root.querySelectorAll<HTMLElement>("[data-retire]").forEach(b => b.onclick = () => { const o = c.roster.find(x => x.id === b.dataset.retire); if (o) { opSel = null; change(() => retire(c, o)); } });
    on("renameBtn", () => {
      const o = c.roster.find(x => x.id === opSel), n = root.querySelector<HTMLInputElement>("#renameName")!.value.trim(), k = root.querySelector<HTMLInputElement>("#renameCall")!.value.trim();
      if (o && n && k) change(() => { o.name = n.slice(0, 24); o.call = k.slice(0, 12); });
    });
    root.querySelectorAll<HTMLElement>("[data-staff]").forEach(b => b.onclick = () => change(() => answerStaff(c, Number(b.dataset.staff) as 0 | 1)));
    root.querySelectorAll<HTMLElement>("[data-guards]").forEach(b => b.onclick = () => { const inc = c.incidents.find(i => i.id === b.dataset.guards); if (inc) change(() => inc.kind === "riot" ? letGuardsHandleRiot(c, inc) : inc.kind === "raid" ? letGuardsHandleRaid(c, inc) : letGuardsHandle(c, inc)); });
    root.querySelectorAll<HTMLElement>("[data-train]").forEach(b => b.onclick = () => change(() => train(c, b.dataset.train!)));
    root.querySelectorAll<HTMLElement>("[data-promote]").forEach(b => b.onclick = () => { const g = c.guards.find(x => x.id === b.dataset.promote); if (g) change(() => promoteGuard(c, g)); });
    on("recBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) change(() => addRecreation(c, f)); });
    { const el = root.querySelector<HTMLSelectElement>("[data-dpolicy]"); if (el) el.onchange = () => change(() => { c.dPolicy = el.value as Campaign["dPolicy"]; }); }
    on("upgradeBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) change(() => upgradeFacility(c, f)); });
    on("demolishBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) change(() => demolish(c, f)); });
    on("repairBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) change(() => repair(c, f)); });
    on("moveBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) change(() => moveScp(c, scp173(), f, chosenWatchers())); });
    root.querySelectorAll<HTMLElement>("[data-slot]").forEach(b => b.onclick = () => {
      const [level, slot] = b.dataset.slot!.split(",").map(Number);
      sel = sel && sel.level === level && sel.slot === slot ? null : { level, slot };
      render();
    });
    root.querySelectorAll<HTMLElement>("[data-build]").forEach(b => b.onclick = () => {
      if (!sel) return;
      const { level, slot } = sel;
      change(() => build(c, b.dataset.build as FacilityType, level, slot));
    });
    root.querySelectorAll<HTMLInputElement>("[data-watch]").forEach(b => b.onchange = () => {
      const id = b.dataset.watch!;
      if (b.checked && watchers.size < MAX_WATCHERS) watchers.add(id); else watchers.delete(id);
      render();
    });
    root.querySelectorAll<HTMLElement>("[data-plan]").forEach(b => b.onclick = () => {
      planning = planning === b.dataset.plan ? null : b.dataset.plan!;
      if (planning) speed = 0;   // nothing expires while a plan is being made
      const pl = c.incidents.find(i => i.id === planning);
      if (planning && pl?.kind === "escort") chosen.clear();
      if (planning && !chosen.size && pl) for (const o of readyFor(pl).slice(0, squadSize(c))) chosen.add(o.id);
      render();
    });
    root.querySelectorAll<HTMLInputElement>("[data-pick]").forEach(b => b.onchange = () => {
      const id = b.dataset.pick!;
      if (b.checked && chosen.size < squadSize(c)) chosen.add(id); else chosen.delete(id);
      render();
    });
    on("dMinus", () => { dCount--; render(); });
    on("dPlus", () => { dCount++; render(); });
    on("cancelPlan", () => { planning = null; render(); });
    on("launchBtn", () => {
      const inc = c.incidents.find(i => i.id === planning);
      if (!inc || (!chosen.size && !((inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid") && guardsReady(c).length))) return;
      if (inc.kind === "riot") chosen.clear();   // only Site Security answers a riot
      const loadouts: Loadout[] = [...chosen].map(id => {
        const g = gearOf(id);
        return { opId: id, armor: g.armor, items: g.items.filter((i): i is ItemId => !!i) };
      });
      act.deploy(inc, inc.kind === "riot" ? [] : loadouts, ["strike", "coverup", "escort", "retaliation", "outbreak", "riot", "raid"].includes(inc.kind) ? 0 : dCount);
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

  // the clock loop runs until the hub is replaced by a mission or a fresh hub
  let last = performance.now();
  const stillHere = () => root.contains(document.getElementById("clockHour")) && root.dataset.hub === mountId;
  const mountId = String(Math.random());
  root.dataset.hub = mountId;
  const tick = (now: number) => {
    if (!stillHere()) { document.removeEventListener("keydown", onKey); return; }
    const dt = Math.min(250, now - last); last = now;
    if (speed && clockBlocked()) { speed = 0; render(); }
    if (speed) {
      c.hour = (c.hour ?? 0) + dt * speed * 24 / DAY_MS;
      let newDay = false;
      while ((c.hour ?? 0) >= 24) {
        c.hour! -= 24;
        advanceDay(c);
        newDay = true;
        if (clockBlocked()) { speed = 0; c.hour = 0; break; }
      }
      if (newDay) { act.save(); if (busyField()) redrawLater = true; else render(); }
      else { const el = document.getElementById("clockHour"); if (el) el.textContent = hourText(); }
    }
    requestAnimationFrame(tick);
  };
  let redrawLater = false;
  const busyField = () => { const a = document.activeElement; return !!a && root.contains(a) && a.matches("select,input,textarea"); };
  root.addEventListener("focusout", () => { if (redrawLater) { redrawLater = false; setTimeout(() => { if (!busyField()) render(); else redrawLater = true; }, 0); } });
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (!stillHere() || (t.closest && t.closest("input,textarea,select"))) return;
    if (tab !== "world") return;
    if (e.key === " ") { e.preventDefault(); setSpeed(speed ? 0 : lastSpeed); }
    else if (["1", "2", "3"].includes(e.key)) setSpeed(SPEEDS[Number(e.key) - 1]);
  };
  document.addEventListener("keydown", onKey);
  requestAnimationFrame(tick);

  render();
  window.scrollTo(0, 0);
}
