// Site-19 Command: incidents and time, the base and its containment, and Epsilon-11's roster.
import { STAFF_EVENTS, answerStaff } from "../campaign/staff";
import { HIST_CATS, type HistCat } from "../campaign/history";
import { DISRUPT_INTEL, INQUIRY, PLANS, goalText, REVEAL_INTEL, THREAT_STEPS, canDisrupt, canInvestigateBreach, canReveal, disrupt, investigateBreach, reveal } from "../campaign/chaos";
import { parseCampaign } from "../campaign/save";
import type { Report } from "../campaign/reports";
import { WEATHER, type Weather } from "../data/weather";
import { MIN_RANGE } from "../game/perks";
import { AUDIT_BELOW, PARTNERS, PAY_FOR, REQUESTS, answerOffer, canAcceptOffer, canRequest, canSendAway, councilGrant, directiveProgress, directiveText, makeRequest, rewardText, sendAway, tierOf, type RequestId } from "../campaign/council";
import { REFINE_EVERY, canGivePill, canRefine, givePill, pillsLeft, refine, refineRecipes } from "../campaign/objects";
import { PROCEDURES, PROCEDURE_610 } from "../data/procedures";
import { reportOf, TERRITORY, localHour, missionWeather, weatherAt, weatherLine, nightAt, nightPolygon, AMNESTIC_TEAM, BURY, FACILITIES_WORLD, FIELD_OPS, INVESTIGATE, buryCost, buryStory, canBury, canSendTeam, incidentName, sendAmnesticsTeam, briefing, canFieldOp, canInvestigate, groupOf, incidentPlace, incidentState, investigate, startFieldOp, type FieldOpKind, type MarkerGroup } from "../campaign/geo";
import { MEDALS } from "../data/bios";
import { LEANS, QUALITY, UNITS, nationalityOf } from "../data/units";
import { FACIAL, HAIR_BY_SEX, HAIR_COLORS, HAIR_STYLES, HEADGEAR, LOOK_PARTS, SEX_NAMES, SKIN, fitLook, rollLook } from "../data/looks";
import { portraitSvg } from "./portrait";
import { INSPECTION, inspectionChecks, inspectionSoon } from "../campaign/inspection";
import {
  UPGRADE, damageEffect, engineersBusy, repairOf, GEN_TIERS, canRefitGen, genTierOf, generatorOutput, refitGenerator, canUpgrade, upgradeFacility, RECREATION, canAddRecreation, addRecreation, DEMOLISH, canDemolish, demolish, demolishDays, demolishLeavesShort, ENGINEER_COST, EXCAVATE, FACILITIES, nameInText, GRADE_NAMES, MAX_LEVELS, REPAIR, SLOTS, build, canBuild, canExcavate, canRepair,
  dclassCapacity, engineersFree, excavate, facilityAt, healPerDay, isContainment, monthlyUpkeep, neighbors, operational,
  powerShort, powerSupply, powerUse, repair, sanityPerDay, type Facility, type FacilityType,
} from "../campaign/base";
import {
  DCLASS_COST, DCLASS_MONTHLY, RANKS, RANK_XP, TRAINER, retire, trainerWhy, RANK_BONUS, RECRUIT_COST, advanceDay, aimOf, blinkFullOf, buyDClass,
  NICK_RANK, fieldName, canBuyDClass, canHireEngineer, dayOfMonth, deployable, hireEngineer, maxSanOf, monthOf, monthlyFunding, frontsFunding, canHire, candidateCost, hireCandidate, lookOf, trainersActive,
  INTEL_PER_PRISONER, INTERROGATION_DAYS, interrogationDays, PRISONER_BOUNTY, holdingCapacity, canRetrain, canTherapy, canWeaken, dateText, fitAttachment, gunFor, loadAmmo, setWeapon, weaken, weaponOf, weaponOptions, chooseClass, choosePerk, perkChoices, promotionDue, startRetrain, startTherapy,
  pendingBreach, type Campaign, type Incident, type Loadout, type Operative,
} from "../campaign/campaign";
import { CLASSES, PERKS, TRAITS, type ClassId, type PerkId, type TraitId } from "../data/classes";
import { AMMO, ATTACHMENTS, SIDEARM, TYPES, model, type AmmoId, type AttachmentId, type WeaponType } from "../data/weapons";
import {
  CLEAN_RISK, EVAC, routineDue, routineOf, SCP_DEFS, isInert, scpName, breachRisk, canClean, canEvacuate, canMove, cleanCell, evacuate, freeWings, moveScp, occupantOf, transferOut, unpowered, wingOf, workRisk,
  type ScpRecord,
} from "../campaign/containment";
import {
  ARMOR_KINDS, ARMOR_TIERS, armorStats, ATTACHMENT_COST, REFIT, canOrderAmmo, orderAmmo, unlockedAmmo, canOrderAttachment, canRefit, orderAttachment, orderRefit, pendingRefits, unlockedAttachments,
  ITEMS, PROJECTS, TESTS, uniformOf, anomalyProgress, assign, projectVisible, canHireResearcher, canOrder, canTest, has, hireResearcher, order, projectLock,
  researcherCapacity, projectCost, researchersFree, startTest, testKey, offered, projectDays, unlockedItems, type Branch, type ItemId, type TestId,
} from "../campaign/research";
import { HOME, LAND, REGIONS, REGION_IDS, SITE19, project, type RegionId } from "../data/regions";
import {
  COLLAPSE_LIMIT, COVER_STORY, CONTACT, LINKS, canContact, contactCost, isContacted, makeContact, coverDoses, locateIntel, amnesticsCapacity, canCoverStory, canLocate, collapsedCount, coverStory, locateCell,
  flightOut, regionFunding, transportName, travelBlock, travelDays,
} from "../campaign/world";
import {
  ALERTS, GUARD, PROMOTE, canHireGuard, canPromote, guardCapacity, guardOdds, guardsAlive, guardsReady, hireGuard, letGuardsHandle, mtfArrival,
  promoteGuard, breachGuards, letGuardsHandleRiot, letGuardsHandleRaid, raidArrival, raidOdds, postedAt, postGuard, unposted, TRAINING, canTrain, squadSize, train, type Alert, type Guard,
} from "../campaign/security";
import { HEAVY, type ScpId } from "../game/types";
import { esc } from "./util";

const MAX_DCLASS = 4, MAX_WATCHERS = 2;
type Tab = "command" | "world" | "site" | "research" | "personnel" | "history";
/** History tab: the category shown and the incident report opened from it. */
let histCat: HistCat | "all" = "all", openReport: string | null = null;

export interface HubActions {
  save: () => void;
  deploy: (inc: Incident, loadouts: Loadout[], dCount: number) => void;
  newCampaign: () => void;
  importCampaign: (c: Campaign) => void;
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
let pendingMapSel: string | null = null;
/** The World Map's zoom and pan (an SVG viewBox), kept across renders. */
const WORLD_VIEW = { x: 8, y: 14, w: 344, h: 124 };
/** Height over width of the map on screen: the whole-world strip on wide screens, a taller window on phones. */
const mapAspect = () => window.innerWidth < 700 ? 0.8 : WORLD_VIEW.h / WORLD_VIEW.w;
/** Each region's own tint on the map, before exposure reddens it. */
const TERR_TINT: Record<RegionId, string> = { east_us: "#3d4d63", west_us: "#47506a", latam: "#3d5448", europe: "#4c4762", africa: "#554f3c", east_asia: "#3e5559" };
let geoView = { ...WORLD_VIEW };
/** Open the hub on a tab (after a mission the player comes back to the World Map). */
export function openTab(t: Tab, sel?: string) { tab = t; pendingMapSel = sel ?? null; try { localStorage.setItem("site19-tab", t); } catch { /* fine */ } }
let tab: Tab = (() => { try { return (localStorage.getItem("site19-tab") as Tab) || "command"; } catch { return "command"; } })();

/** The night side of the world as SVG polygon points for the current hour. */
const nightPointsOf = (c: Campaign) => nightPolygon(c).map(([lo, la]) => project(lo, la).map(n => n.toFixed(1)).join(",")).join(" ");
export function mountHub(root: HTMLElement, c: Campaign, act: HubActions) {
  let planning: string | null = null;
  const chosen = new Set<string>();
  const watchers = new Set<string>();
  const gear = new Map<string, { armor: ItemId | ""; items: (ItemId | "")[] }>();
  let flashMsg = "";
  let opSel: string | null = null;
  let lookOpen = false;   // keep the appearance editor open while clicking through parts
  let dCount = 2;
  let sel: { level: number; slot: number } | null = null;
  let resetArmed = 0;
  let regionSel: RegionId = pendingMapSel?.startsWith("reg:") ? pendingMapSel.slice(4) as RegionId : HOME;
  /** What's selected on the World Map ("inc:<id>" or "fac:<id>"), and which kinds of marker are shown. */
  let mapSel: string | null = pendingMapSel?.startsWith("reg:") ? "region" : pendingMapSel; pendingMapSel = null;
  const WX_ICON: Record<Weather, string> = { clear: "", rain: "☂", storm: "⚡", fog: "≋", snow: "❄" };
const mapShow = new Set<string>(["anomaly", "insurgency", "coverup", "site", "facility", "night", "weather"]);
  let dragMoved = false;
  /** Keep a view inside the world and at the map's proportions, between the whole world and about 8× zoom. */
  const clampView = (vw: { x: number; y: number; w: number; h: number }) => {
    const ar = mapAspect(), nw = Math.min(WORLD_VIEW.w, WORLD_VIEW.h / ar, Math.max(42, vw.w)), nh = nw * ar;
    return { w: nw, h: nh, x: Math.min(WORLD_VIEW.x + WORLD_VIEW.w - nw, Math.max(WORLD_VIEW.x, vw.x)), y: Math.min(WORLD_VIEW.y + WORLD_VIEW.h - nh, Math.max(WORLD_VIEW.y, vw.y)) };
  };
  /** Frame a region's territory, with a little margin. */
  const zoomToRegion = (r: RegionId) => {
    const bx = TERRITORY[r].map(([w0, s0, e0, n0]) => [...project(w0, n0), ...project(e0, s0)]);
    const x1 = Math.max(WORLD_VIEW.x, Math.min(...bx.map(b => b[0]))), y1 = Math.max(WORLD_VIEW.y, Math.min(...bx.map(b => b[1])));
    const x2 = Math.min(WORLD_VIEW.x + WORLD_VIEW.w, Math.max(...bx.map(b => b[2]))), y2 = Math.min(WORLD_VIEW.y + WORLD_VIEW.h, Math.max(...bx.map(b => b[3])));
    const ar = mapAspect(), nw = Math.max((x2 - x1) * 1.15, (y2 - y1) * 1.15 / ar);
    geoView = clampView({ x: (x1 + x2) / 2 - nw / 2, y: (y1 + y2) / 2 - nw * ar / 2, w: nw, h: 0 });
  };

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
      <span class="pill ${c.council.standing < AUDIT_BELOW ? "hot" : c.council.standing < 40 ? "warm" : ""}" title="Standing with the O5 Council: ${esc(tierOf(c.council.standing).name)}. It sets the Council's monthly grant ($${councilGrant(c)}k now) and what Site-19 can ask for. See the Command tab.">Standing ${c.council.standing}</span>
      <span class="pill" title="Guards alive / posts at working Security stations">Guards ${guardsAlive(c).length}/${guardCapacity(c)}${unposted(c).length ? ` · ${unposted(c).length} unposted` : ""}</span>
      <span class="pill">Amnestics ${c.amnestics}/${amnesticsCapacity(c)}</span>
      <span class="pill ${c.exposure >= 60 || collapsedCount(c) ? "hot" : ""}">Exposure ${c.exposure}${collapsedCount(c) ? ` · ${collapsedCount(c)} lost` : ""}</span>
      <span class="pill ${c.engineers && engineersFree(c) <= 0 ? "warm" : ""}" title="Engineers not assigned to building, repairs, upgrades, excavation or orders, out of everyone on staff.${c.engineers && engineersFree(c) <= 0 ? " All of them are busy: new work has to wait." : ""}">Engineers ${engineersFree(c)}/${c.engineers} free</span>
      <span class="pill ${c.researchers && researchersFree(c) <= 0 ? "warm" : ""}" title="Researchers not assigned to a project, out of everyone on staff.${c.researchers && researchersFree(c) <= 0 ? " All of them are busy: new research has to wait." : ""}">Researchers ${researchersFree(c)}/${c.researchers} free</span>
      <span class="pill ${pw ? "hot" : ""}">Power ${powerUse(c)}/${powerSupply(c)}</span>
      ${c.debug ? `<span class="pill hot">Debug save</span>` : ""}
      <button class="act" id="resetBtn" type="button">New campaign</button>
      <button class="act" id="exportBtn" type="button" title="Download this campaign as a file, to keep or move to another browser">Export save</button>
      <label class="act" for="importFile" title="Load a campaign from an exported file. It replaces the current one.">Import save</label>
      <input type="file" id="importFile" accept=".json,application/json" hidden>
    </div>
  </header>
  <nav class="tabs" aria-label="Site-19 sections">
    ${tabBtn("command", `Command${c.incidents.length ? ` · ${c.incidents.length} open` : ""}`)}
    ${tabBtn("world", "World")}
    ${tabBtn("site", "Site-19")}
    ${tabBtn("research", `Research${researchersFree(c) > 0 && c.researchers ? ` · ${researchersFree(c)} idle` : ""}`)}
    ${tabBtn("personnel", "Personnel")}
    ${tabBtn("history", "History")}
  </nav>
  ${flashMsg ? `<p class="warn-box" role="status">${esc(flashMsg)}</p>` : ""}
  ${tab === "command" ? commandTab() : tab === "world" ? worldTab() : tab === "site" ? siteTab() : tab === "research" ? researchTab() : tab === "history" ? historyTab() : personnelTab()}
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

  const nightPoints = () => nightPointsOf(c);
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
      ${a.map(r => `<details class="archived" id="report-${esc(r.number)}" ${openReport === r.number || (!openReport && r === a[0]) ? "open" : ""}><summary>Incident ${esc(r.number)} · ${dateText(r.day)} · ${esc(r.title)} · ${r.win ? "closed" : "failed"}</summary>${reportFile(r)}</details>`).join("")}</div>`;
  }

  /** Everything that has happened, newest first, searchable and filtered by kind, linked to reports and files. */
  function historyTab() {
    // saves from before the history kept one: start it from the incident reports
    c.history ??= [...(c.archive ?? [])].reverse().map(r => ({ day: r.day, cat: "deployment" as HistCat, text: `Incident ${r.number}, ${r.title}: ${r.win ? "closed" : "failed"} at ${r.location}. Sent: ${r.personnel.join(", ")}.`, report: r.number }));
    const all = [...c.history].reverse(), shown = all.filter(h => histCat === "all" || h.cat === histCat);
    const count = (k: HistCat) => all.filter(h => h.cat === k).length;
    return `<div class="hubgrid">
    <section class="col">
      <div class="card">
        <div class="label">Campaign history · ${`${all.length} ${all.length === 1 ? "entry" : "entries"}`}</div>
        <input type="search" id="histQ" class="histq" placeholder="Search: a name, an anomaly, a place, a year" aria-label="Search the history">
        <div class="row histcats"><button class="act ${histCat === "all" ? "on" : ""}" type="button" data-hcat="all">All</button>${(Object.keys(HIST_CATS) as HistCat[]).filter(count).map(k => `<button class="act ${histCat === k ? "on" : ""}" type="button" data-hcat="${k}">${HIST_CATS[k]} · ${count(k)}</button>`).join("")}</div>
        <ul class="history">${shown.map(h => { const alive = h.op && c.roster.some(o => o.id === h.op && o.alive);
          return `<li data-htext="${esc(`${dateText(h.day)} ${h.text}`.toLowerCase())}"><span class="hday">${dateText(h.day)}</span><span class="flag">${HIST_CATS[h.cat]}</span> ${esc(h.text)}
            ${h.report ? `<button class="linkbtn" type="button" data-openreport="${esc(h.report)}">Report ${esc(h.report)}</button>` : ""}${alive ? ` <button class="linkbtn" type="button" data-openop="${h.op}">Personnel file</button>` : ""}</li>`; }).join("") || `<li class="muted">Nothing here yet.</li>`}</ul>
        <p class="muted" id="histNone" hidden>Nothing matches.</p>
      </div>
    </section>
    <section class="col">${archiveCard() || `<div class="card"><div class="label">Archive</div><p class="muted">No incident reports yet.</p></div>`}</section>
  </div>`;
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

  function councilCard() {
    const k = c.council, t = tierOf(k.standing);
    const open = k.directives.filter(d => !d.state);
    return `<div class="card council">
      <div class="label">O5 Council · standing ${k.standing} · ${esc(t.name)}${k.audit ? ` · <span class="warn">audit ${dateText(c.inspectionDay!)}</span>` : ""}</div>
      <div class="exposure"><div class="exp-bar standing"><span style="width:${k.standing}%"></span></div><b>${k.standing} / 100</b></div>
      <p class="muted">${esc(t.desc)} The Council grants $${councilGrant(c)}k a month (60 + standing${k.grantBonus ? ` + ${k.grantBonus}` : ""}); the fronts add $${frontsFunding(c)}k. Below ${AUDIT_BELOW} it sends an auditor.</p>
      ${k.history.length ? `<details class="archived"><summary>Why it moved</summary><ul class="why">${k.history.slice(0, 12).map(h => `<li class="${h.n < 0 ? "warn" : ""}">${h.n > 0 ? "+" : ""}${h.n} · ${esc(h.why)} <span class="muted">(${dateText(h.day)})</span></li>`).join("")}</ul></details>` : ""}
      <div class="label" style="margin-top:10px">Orders</div>
      ${open.length ? `<ul class="orders">${open.map(d => `<li><b>${esc(directiveText(c, d))}</b> by ${dateText(d.due)} <span class="muted">· ${esc(directiveProgress(c, d))} · reward ${esc(rewardText(d.reward))}, +${d.standing} standing; failing costs 6</span></li>`).join("")}</ul>` : `<p class="muted">No orders open. New ones arrive on the first of the month.</p>`}
      ${k.offers.map(o => { const w = canAcceptOffer(c, o); return `<div class="facpanel"><div class="label">Transfer ${o.kind === "order" ? "order" : "offer"} from ${esc(o.from)} · decide by ${dateText(o.until)}</div>
        <p>${esc(o.text)}</p>
        <div class="row"><button class="act primary" type="button" data-offer="${o.id}" data-yes="1" ${w ? `disabled title="${esc(w)}"` : ""}>${o.kind === "order" ? "Accept the transfer" : o.kind === "sale" ? `Sell it · +$${o.funds}k` : "Make the trade"}</button>
          <button class="act" type="button" data-offer="${o.id}" data-yes="">${o.kind === "order" ? "Refuse (−6 standing)" : "Decline"}</button>${w ? `<span class="muted">${esc(w)}</span>` : ""}</div>
        <p class="muted">Left unanswered, it ${o.kind === "order" ? "counts as refused" : "lapses"}.</p></div>`; }).join("")}
      ${k.transit.length ? `<p class="muted">On the road: ${k.transit.map(t => `${esc(scpName(t.scp))} ${t.dir === "in" ? `from ${esc(t.site)}` : `to ${esc(t.site)}`}, arriving ${dateText(t.arrive)}`).join("; ")}.</p>` : ""}
      <div class="label" style="margin-top:10px">Requests</div>
      ${(Object.keys(REQUESTS) as RequestId[]).filter(id => k.standing >= REQUESTS[id].min - 15 || k.requests[id] !== undefined).map(id => { const q = REQUESTS[id], w = canRequest(c, id);
        return `<div class="row"><button class="act" type="button" data-request="${id}" ${w ? `disabled title="${esc(w)}"` : ""}>${esc(q.name)}${q.cost ? ` · −${q.cost} standing` : ""}</button><span class="muted">${esc(w ? `${q.desc} ${w}` : q.desc)}</span></div>`; }).join("") || `<p class="muted">Raise standing to ${REQUESTS.funding.min} to start asking the Council for help.</p>`}
    </div>`;
  }

  /** The Chaos Insurgency: its agenda, this month's operations, its commander, and the questions breaches leave. */
  function chaosCard() {
    const k = c.chaos, next = THREAT_STEPS.find(s => s.at > k.threat);
    return `<div class="card chaos">
      <div class="label">The Chaos Insurgency · agenda ${k.threat} / 100</div>
      <div class="exposure"><div class="exp-bar threat">${THREAT_STEPS.map(s => `<i style="left:${s.at}%"></i>`).join("")}<span style="width:${k.threat}%"></span></div><b>${k.threat}</b></div>
      <p class="muted">One organization working one agenda worldwide. Cells left alone, operations carried out and commanders who get away push it on; broken cells, disrupted operations and captured leaders set it back.${next ? ` At ${next.at}: ${esc(next.text)}.` : ""}</p>
      ${k.history.length ? `<details class="archived"><summary>Why it moved</summary><ul class="why">${k.history.slice(0, 12).map(h => `<li class="${h.n > 0 ? "warn" : ""}">${h.n > 0 ? "+" : ""}${h.n} · ${esc(h.why)} <span class="muted">(${dateText(h.day)})</span></li>`).join("")}</ul></details>` : ""}
      <div class="label" style="margin-top:10px">Operations this month</div>
      ${k.plans.length ? `<ul class="orders">${k.plans.map(p => { const d = PLANS[p.kind], cell = p.cell && c.incidents.find(i => i.id === p.cell);
        if (!p.known) { const w = canReveal(c, p); return `<li><b>Unidentified operation</b>, due ${dateText(p.due)} <span class="muted">· aimed at ${esc(REGIONS[p.region].name)}? Field work there would uncover it.</span>
          <button class="act" type="button" data-reveal="${p.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Identify · ${REVEAL_INTEL} Intel</button></li>`; }
        const w = canDisrupt(c, p);
        return `<li><b>${esc(d.name)}</b>: ${esc(goalText(p.kind))}, ${dateText(p.due)} <span class="muted">· ${esc(d.desc(p.region))}</span>
          ${cell ? `<button class="linkbtn" type="button" data-mapinc="${cell.id}">A cell running it is located: strike it</button>` : ""}
          <button class="act" type="button" data-disrupt="${p.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Disrupt · ${DISRUPT_INTEL} Intel</button></li>`; }).join("")}</ul>` : `<p class="muted">Nothing known. New operations are picked up on the first of the month.</p>`}
      ${k.active.length ? `<p class="warn">In force: ${k.active.map(a => `${esc(PLANS[a.kind].name)} until ${dateText(a.until)}`).join("; ")}.</p>` : ""}
      <div class="label" style="margin-top:10px">Field commander</div>
      ${k.commander ? `<p><b>${esc(k.commander.rank)} ${esc(k.commander.name)}</b> · in command since ${dateText(k.commander.since)} · met ${plural(k.commander.seen, "time")}${k.commander.escapes ? `, escaped ${plural(k.commander.escapes, "time")}` : ""}. Leads every cell running an operation, and turns up elsewhere too. Captured, they would set the agenda back by 10.</p>` : `<p class="muted">${k.past.length ? "No commander in the field since the last one fell. A replacement will come." : "Not yet identified."}</p>`}
      ${k.past.length ? `<p class="muted">Past commanders: ${k.past.map(p => `${esc(p.rank)} ${esc(p.name)} (${esc(p.fate ?? "")}, met ${p.seen} times)`).join("; ")}.</p>` : ""}
      ${k.inquiries.some(q => !q.known) ? `<div class="label" style="margin-top:10px">Open questions</div>
        <ul class="orders">${k.inquiries.filter(q => !q.known).map(q => { const w = canInvestigateBreach(c, q);
          return `<li>Why did ${esc(scpName(q.scp))} get out on ${dateText(q.day)}? <span class="muted">Accident, the anomaly itself, or someone inside.</span> <button class="act" type="button" data-inquiry="${q.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Inquiry · $${INQUIRY.cost}k</button></li>`; }).join("")}</ul>` : ""}
      ${k.inquiries.some(q => q.known) ? `<p class="muted">Settled: ${k.inquiries.filter(q => q.known).map(q => `${esc(scpName(q.scp))}, ${dateText(q.day)}: ${q.cause}`).join("; ")}.</p>` : ""}
    </div>`;
  }

  function commandTab() {
    const inc = c.incidents.find(i => i.id === planning) || null;
    return `<div class="hubgrid">
    <section class="col">
      ${c.roster.some(promotionDue) ? `<div class="card plan"><div class="label">Promotions</div>
        <p>${c.roster.filter(promotionDue).map(o => `<b>${esc(o.call)} ${esc(o.name)}</b>`).join(", ")} ${c.roster.filter(promotionDue).length > 1 ? "are" : "is"} waiting to choose ${c.roster.filter(promotionDue).some(o => !o.cls) ? "a class or perk" : "a perk"}.</p>
        <button class="act" type="button" data-goto="personnel">Open Personnel</button></div>` : ""}
      ${staffCard()}
      ${councilCard()}
      ${chaosCard()}
      ${inspectionSoon(c) ? `<div class="card plan"><div class="label">O5 inspection · ${dateText(c.inspectionDay!)}</div>
        <p>If the inspector came today: $${INSPECTION.perCheck}k for each check passed${inspectionChecks(c).filter(k => !k.ok).length >= INSPECTION.failAt ? `, and <span class="warn">$${INSPECTION.penalty}k docked</span> for failing ${INSPECTION.failAt} or more` : ""}.</p>
        <ul class="why">${inspectionChecks(c).map(k => `<li class="${k.ok ? "" : "warn"}">${k.ok ? "✓" : "✗"} ${esc(k.label)}</li>`).join("")}</ul></div>` : ""}
      ${c.scps.map(scpSummary).join("")}
      <div class="card">
        <div class="label">Active incidents</div>
        ${c.incidents.length ? c.incidents.map(incidentCard).join("") : `<p class="muted">No open incidents. Let time run to see what happens next.</p>`}
      </div>
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
    if (s.status === "leaving") return `<div class="card status"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>On the road</b> to ${esc(c.council.transit.find(t => t.scp === s.id)?.site ?? "another site")}, for good.</div></div>`;
    if (isInert(s) && s.status === "contained") return `<div class="card status held"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Held</b> in the ${wing ? nameInText(wing.type) + ` on level ${wing.level + 1}` : "?"}. An object: it doesn't breach or need cleaning.${s.id === "500" ? ` ${plural(pillsLeft(c), "dose")} of SCP-500 left.` : ""}</div>
      <button class="act" type="button" data-goto="site">Open its cell</button></div>`;
    if (s.status === "away") return `<div class="card status"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Held at Site-17</b> for safekeeping. It comes back ${dateText(s.returnDay ?? c.day)}.</div></div>`;
    if (s.status === "breach") return `<div class="card status danger"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Breach in progress.</b> Site Security is on it now. Send Epsilon-11 in after them, or leave it to the guards.</div></div>`;
    const r = breachRisk(c, s), due = routineDue(c, s), rt = routineOf(s);
    return `<div class="card status held"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Contained</b> in the ${wing ? nameInText(wing.type) + ` on level ${wing.level + 1}` : "?"}.<br>
      Breach risk ${pctText(r.p)} a day · maintenance ${s.maintenance}% · ${rt ? `${rt.name.toLowerCase()} ${due > 0 ? `due in ${plural(due, "day")}` : `<span class="warn">overdue</span>`}` : ""}</div>
      <button class="act" type="button" data-goto="site">Manage containment</button></div>`;
  }

  function incidentCard(i: Incident) {
    const left = i.expires - c.day, t = flightOut(c, i), block = travelBlock(c, i), w = missionWeather(c, i);
    const where = i.kind === "breach" ? "Inside Site-19" : `${REGIONS[i.region].name} · ${t ? `${plural(t, "day")} away` : "a drive from Site-19"}${w !== "clear" ? ` · ${WEATHER[w].name.toLowerCase()}` : ""}${isContacted(c, i.region) ? "" : " · no front"}`;
    return `<div class="incident ${planning === i.id ? "sel" : ""}">
      <div><b>${esc(i.title)}</b> <span class="flag">${KIND_NAMES[i.kind]}</span></div>
      <div class="muted">${left <= 0 ? "Last day to respond" : `${plural(left, "day")} left to respond`} · ${where} · Insurgency activity: ${confirmedIns(i) ? `${i.insurgents - (i.weakened ?? 0)} Insurgents` : (r => r >= 4 ? "heavy (reported)" : r >= 2 ? "some (reported)" : r ? "light (reported)" : "none reported")(reportOf(i).ins)}${i.witnesses ? ` · ${i.witnesses} witnesses` : ""}</div>
      ${block ? `<div class="warn">${esc(block)}</div>` : ""}
      ${i.reward ? `<div class="ok">Council reward for answering it: ${esc(rewardText(i.reward))}.</div>` : ""}
      ${i.group ? `<div class="warn">Arrived with ${plural(c.incidents.filter(x => x.group === i.group && x !== i).length, "other incident")}: only one can be answered.</div>` : ""}
      ${i.kind === "breach" ? `<p class="muted">Happening now. ${guardsReady(c).length} guard${guardsReady(c).length === 1 ? "" : "s"} can respond; Epsilon-11 would arrive on turn ${mtfArrival(c, i)} (${ALERTS[c.alert].name.toLowerCase()} alert).</p>` : ""}
      <div class="row"><button class="act ${planning === i.id ? "on" : ""}" type="button" data-plan="${i.id}" ${c.over || block ? "disabled" : ""}>${i.kind === "breach" ? "Take command on the map" : "Open on the World Map"}</button>
      ${i.kind === "breach" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it · ${pctText(guardOdds(c, i))} chance</button>` : ""}
      ${i.kind === "riot" || i.kind === "raid" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it${i.kind === "raid" ? ` (${Math.round(raidOdds(c, i) * 100)}%)` : ""}</button>` : ""}</div>
    </div>`;
  }

  const confirmedIns = (i: Incident) => has(c, "codebooks") || !!i.recon || i.kind === "raid" || i.kind === "breach" || i.kind === "escort";
  const briefText = (i: Incident) => i.transfer ? `A transfer convoy bringing ${scpName(i.transfer.scp)} from ${i.transfer.site} is under attack an hour from Site-19. Whoever is fit to go has to hold the truck: neutralise the Insurgents or last 8 turns.` : KIND_BRIEF[i.kind];
  function planPanel(inc: Incident) {
    const ops = readyFor(inc), t = flightOut(c, inc), noD = inc.kind === "strike" || inc.kind === "coverup" || inc.kind === "escort" || inc.kind === "retaliation" || inc.kind === "outbreak" || inc.kind === "riot" || inc.kind === "raid";
    return `<div class="card plan">
      <div class="label">Deploy to ${esc(inc.title.split(":")[0])}</div>
      <p>${esc(briefText(inc))}</p>
      ${(() => { const id = inc.kind === "outbreak" ? "610" : (inc.kind === "breach" || inc.kind === "recovery") && !(inc.first && !inc.recon) ? inc.scpId : "";
        const p = id === "610" ? PROCEDURE_610 : id ? PROCEDURES[id as ScpId] : undefined;
        return p ? `<div class="facpanel"><div class="label">Procedure · ${esc(scpName(id))}</div><p>${esc(p.capture)}</p>${p.bring.length ? `<p class="muted">Bring: ${esc(p.bring.join("; "))}.</p>` : ""}</div>`
          : inc.first && !inc.recon ? `<p class="muted">The anomaly hasn't been identified, so there is no procedure for it. Investigating first would tell the team what they're facing.</p>` : ""; })()}
      ${nightAt(c, inc) ? `<p class="warn">Night there (${String(Math.floor(localHour(c.hour ?? 0, incidentPlace(inc).lon))).padStart(2, "0")}:00 local): deploying now means fighting in the dark (everyone sees 4 tiles less). Flares help. Wait for daylight on the World Map if you'd rather.</p>` : ""}
      ${missionWeather(c, inc) !== "clear" ? `<p class="warn">${esc(weatherLine(c, inc))}${nightAt(c, inc) ? ` This stacks with the dark, though nobody's sight drops below ${MIN_RANGE} tiles.` : ""}</p>` : ""}
      ${inc.kind === "breach" ? (() => { const g = breachGuards(c, inc); return `<p>Site Security: <b>${g.first.length}</b> on the scene${g.late.length ? `, ${g.late.length} more on turn 2` : ""}${g.first.length + g.late.length ? ` (${[...g.first, ...g.late].map(m => esc(m.name)).join(", ")})` : ". Nobody is fit to respond"}. Operatives you pick arrive on turn <b>${mtfArrival(c, inc)}</b>; D-Class are on site from the start.</p>`; })() : ""}
      ${t ? `<p class="muted">The ${transportName(c)} takes ${plural(t, "day")} to reach ${REGIONS[inc.region].name}; time at Site-19 passes while the squad is in the air, and the survivors spend as long again flying home.</p>` : ""}
      ${inc.kind === "coverup" ? `<p class="${c.amnestics < (inc.witnesses ?? 0) ? "warn" : "muted"}">The squad carries all ${c.amnestics} amnestic doses in storage, for ${plural(inc.witnesses ?? 0, "witness")}.</p>` : ""}
      ${inc.insurgents || reportOf(inc).ins ? `<div class="row"><span>Insurgents expected: <b>${confirmedIns(inc) ? inc.insurgents - (inc.weakened ?? 0) : `about ${Math.max(0, reportOf(inc).ins - (inc.weakened ?? 0))} (estimated)`}</b>${inc.weakened ? ` (${inc.weakened} intercepted)` : ""}</span>
        <button class="act" type="button" id="intelBtn" ${canWeaken(c, inc) ? `disabled title="${esc(canWeaken(c, inc)!)}"` : ""}>Spend 1 Intel: intercept one</button></div>` : ""}
      ${inc.kind === "raid" ? (() => { const g = guardsReady(c).slice(0, 8); return `<p>Site Security: <b>${g.length}</b> ${g.length === 1 ? "guard holds" : "guards hold"} the compound${g.length ? ` (${g.map(x => esc(x.name)).join(", ")})` : ""}${has(c, "perimeter_alarms") ? ", already on overwatch" : ""}. Insurgents: about <b>${inc.insurgents}</b>. Operatives you pick come up the lift on turn <b>${raidArrival(c)}</b>.</p>`; })() : ""}
      ${inc.kind === "riot" ? (() => { const g = guardsReady(c).slice(0, 8); return `<p>Site Security: <b>${g.length}</b> ${g.length === 1 ? "guard answers" : "guards answer"}${g.length ? ` (${g.map(x => esc(x.name)).join(", ")})` : ". Nobody is fit to respond"}. D-Class left: <b>${c.dclass}</b>.</p>`; })() : `
      <p class="muted">Pick up to ${squadSize(c)} operatives. Only fully healed operatives can deploy; sanity carries over, so watch it.${inc.kind === "breach" ? " You can also send nobody and play it with the guards alone." : ""}</p>
      <div class="pick">${ops.length ? ops.map(o => `<label class="pickop ${chosen.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="pick-${o.id}" data-pick="${o.id}" ${chosen.has(o.id) ? "checked" : ""} ${!chosen.has(o.id) && chosen.size >= squadSize(c) ? "disabled" : ""}>
        <span><b>${esc(o.call)} ${esc(fieldName(o))}</b> · ${RANKS[o.rank]} · SAN ${o.san}/${maxSanOf(o)}</span></label>`).join("") : `<p class="muted">Nobody is fit to deploy. Wait for the wounded to heal or recruit.</p>`}</div>
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
    return `<div class="loadrow"><b>${esc(o.call)} ${esc(fieldName(o))}</b>
      <span class="specs">${esc(gunFor(c, o).name)}${o.attachment ? ` + ${ATTACHMENTS[o.attachment].name}` : ""}${o.ammoType ? ` · ${AMMO[o.ammoType].name}` : ""}${uniformOf(c).id ? ` · ${esc(uniformOf(c).name)} (+${uniformOf(c).hp} HP${uniformOf(c).points ? `, +${uniformOf(c).points} armor` : ""})` : ""}</span>
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
    const selInc = mapSel?.startsWith("inc:") ? c.incidents.find(i => i.id === mapSel!.slice(4)) ?? null : null;
    const selFac = mapSel?.startsWith("fac:") ? FACILITIES_WORLD.find(f => f.id === mapSel!.slice(4)) ?? null : null;
    const selReg = mapSel === "region";
    // zoom: every on-screen size is multiplied by k so markers and text stay the same size at any zoom
    // k: map units per "design pixel", from the zoom and the map's width on screen (bigger on a phone)
    const mapPx = Math.max(300, (document.querySelector(".geomap svg")?.clientWidth ?? (window.innerWidth < 960 ? window.innerWidth - 40 : window.innerWidth * 0.66)));
    if (Math.abs(geoView.h / geoView.w - mapAspect()) > 0.01) { const [s19x] = project(SITE19.lon, SITE19.lat); geoView = clampView({ ...geoView, x: geoView.w >= WORLD_VIEW.w ? s19x - 80 : geoView.x }); }
    const v = geoView, k = Math.max(0.25, v.w / mapPx * 2.6);
    const label = (r: RegionId) => REGIONS[r].name.replace("Western ", "W. ").replace("Eastern ", "E. ").replace("United States", "US").replace(" and the Middle East", " & M.E.");
    // regions as territories: the land inside each region's boxes, tinted by its exposure
    const landPaths = LAND.map(p => path(p)).join(" ");
    const clips = REGION_IDS.map(r => `<clipPath id="terr-${r}">${TERRITORY[r].map(([w0, s0, e0, n0]) => { const [ax, ay] = project(w0, n0), [bx, by] = project(e0, s0); return `<rect x="${ax}" y="${ay}" width="${bx - ax}" height="${by - ay}"/>`; }).join("")}</clipPath>`).join("");
    const LABEL_AT: Record<RegionId, [number, number]> = { west_us: [-118, 52], east_us: [-88, 30], latam: [-60, -14], europe: [2, 60], africa: [20, 2], east_asia: [140, 6] };
    const territories = REGION_IDS.map(r => { const st = c.regions[r];
      return `<path d="${landPaths}" clip-path="url(#terr-${r})" class="terr ${st.collapsed ? "lost" : ""} ${isContacted(c, r) ? "" : "nofront"} ${selReg && regionSel === r ? "on" : ""}" style="--heat:${st.collapsed ? 100 : st.exposure};--base:${TERR_TINT[r]}" data-region="${r}" tabindex="0" role="button" aria-label="${esc(REGIONS[r].name)}, exposure ${st.exposure}${st.collapsed ? ", collapsed" : ""}"><title>${esc(REGIONS[r].name)} · exposure ${st.exposure}${st.collapsed ? " · front collapsed" : isContacted(c, r) ? "" : " · no front yet"}</title></path>`; }).join("");
    // routes between fronts: solid where both ends have one, dashed out to regions a front could reach next
    const links = LINKS.filter(([a, b]) => isContacted(c, a) || isContacted(c, b)).map(([a, b]) => {
      const [x1, y1] = project(...LABEL_AT[a]), [x2, y2] = project(...LABEL_AT[b]), both = isContacted(c, a) && isContacted(c, b);
      // the Pacific route wraps around the map edge: draw it as two stubs
      if (Math.abs(x1 - x2) > 180) { const [l, r] = x1 < x2 ? [[x1, y1], [x2, y2]] : [[x2, y2], [x1, y1]];
        return [`<line x1="${l[0]}" y1="${l[1]}" x2="${l[0] - 18}" y2="${(l[1] + r[1]) / 2}" class="link ${both ? "both" : ""}" style="stroke-width:${0.5 * k}"/>`, `<line x1="${r[0]}" y1="${r[1]}" x2="${r[0] + 18}" y2="${(l[1] + r[1]) / 2}" class="link ${both ? "both" : ""}" style="stroke-width:${0.5 * k}"/>`].join(""); }
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="link ${both ? "both" : ""}" style="stroke-width:${0.5 * k}"/>`; }).join("");
    const shape = (g: MarkerGroup, x: number, y: number) => { const m = 2.4 * k;
      return g === "site" ? `<path d="M${x} ${y - 1.25 * m}L${x + 1.25 * m} ${y + 0.85 * m}L${x - 1.25 * m} ${y + 0.85 * m}Z"/>`
        : g === "insurgency" ? `<rect x="${x - 0.9 * m}" y="${y - 0.9 * m}" width="${1.8 * m}" height="${1.8 * m}" transform="rotate(45 ${x} ${y})"/>`
        : g === "coverup" ? `<rect x="${x - 0.9 * m}" y="${y - 0.9 * m}" width="${1.8 * m}" height="${1.8 * m}"/>` : `<circle cx="${x}" cy="${y}" r="${m}"/>`; };
    // markers close together fan out into a ring around them, each with a leader line back to its true spot
    const shown = c.incidents.filter(i => mapShow.has(groupOf(i))).map(i => { const pl = incidentPlace(i), [tx, ty] = project(pl.lon, pl.lat); return { i, tx, ty, mx: tx, my: ty }; });
    const gap = 8 * k, groups: (typeof shown)[] = [];
    for (const m of shown) { const g = groups.find(gr => gr.some(o => Math.hypot(o.tx - m.tx, o.ty - m.ty) < gap)); if (g) g.push(m); else groups.push([m]); }
    for (const g of groups) {
      const near19 = g.some(m => Math.hypot(m.tx - sx, m.ty - sy) < gap);
      if (g.length === 1 && !near19) continue;
      const cx0 = g.reduce((a, m) => a + m.tx, 0) / g.length, cy0 = g.reduce((a, m) => a + m.ty, 0) / g.length, rad = gap * (0.75 + g.length * 0.18);
      g.forEach((m, n) => { const a = -Math.PI / 2 + (n + (near19 ? 0.5 : 0)) * 2 * Math.PI / (g.length + (near19 ? 1 : 0)); m.mx = cx0 + Math.cos(a) * rad; m.my = cy0 + Math.sin(a) * rad; });
    }
    // labels sit away from where markers gather (towns and Site-19)
    const regionLabels = REGION_IDS.map(r => { const st = c.regions[r], [ax, ay] = project(...LABEL_AT[r]);
      // step the label off any marker, facility or Site-19 near it
      const busy: [number, number][] = [[sx, sy], ...shown.map(m => [m.mx, m.my] as [number, number]), ...FACILITIES_WORLD.map(f => project(f.lon, f.lat))];
      const tries: [number, number][] = [[0, 0], [0, 9], [0, -9], [14, 0], [-14, 0], [0, 16], [0, -16]];
      const [ox, oy] = tries.find(([dx, dy]) => busy.every(([bx, by]) => Math.abs(bx - (ax + dx * k)) > 11 * k || Math.abs(by - (ay + dy * k)) > 6 * k)) ?? [0, 0];
      const px = ax + ox * k, py = ay + oy * k;
      return `<g class="rlabel" style="font-size:${3.6 * k}px"><text x="${px}" y="${py}">${esc(label(r))}</text><text x="${px}" y="${py + 4.5 * k}" class="rexp ${st.exposure >= 60 ? "hot" : st.exposure >= 35 ? "warm" : ""}">${c.chaos.plans.some(p => p.known && p.region === r && p.kind !== "raid" && p.kind !== "sabotage" && p.kind !== "mole" && p.kind !== "agitate") ? `<tspan class="ciop"> · CI op</tspan>` : ""}${st.collapsed ? "LOST" : st.contactDue ? `contact ${dateText(st.contactDue)}` : !isContacted(c, r) ? "no front" : `exposure ${st.exposure}`}</text>${(() => { const w = weatherAt(c, r); return mapShow.has("weather") && w !== "clear" ? `<text x="${px}" y="${py + 8.6 * k}" class="rwx ${w}">${WX_ICON[w]} ${WEATHER[w].name.toLowerCase()}<title>${esc(`${WEATHER[w].name} over ${REGIONS[r].name}: ${WEATHER[w].desc}`)}</title></text>` : ""; })()}</g>`; }).join("");
    const markers = shown.map(({ i, tx, ty, mx, my }) => { const st = incidentState(c, i), b = briefing(c, i), moved = mx !== tx || my !== ty;
      return `<g class="marker ${groupOf(i)} ${st} ${i.dispatch ? "dispatched" : ""} ${mapSel === "inc:" + i.id ? "on" : ""}" data-mapinc="${i.id}" tabindex="0" role="button" aria-label="${esc(incidentName(i))}, ${esc(b.short)}">
        ${moved ? `<line x1="${tx}" y1="${ty}" x2="${mx}" y2="${my}" class="leader" style="stroke-width:${0.4 * k}"/><circle cx="${tx}" cy="${ty}" r="${0.8 * k}" class="truept"/>` : ""}
        <circle cx="${mx}" cy="${my}" r="${4.2 * k}" class="ring" style="stroke-width:${0.8 * k}"/>${shape(groupOf(i), mx, my)}
        <text x="${mx}" y="${my + 7.6 * k}" class="mlabel" style="font-size:${3 * k}px">${esc(b.short)}</text><title>${esc(incidentName(i))} · ${esc(b.deadline)}</title></g>`; }).join("");
    const facs = mapShow.has("facility") ? FACILITIES_WORLD.map(f => { const [fx, fy] = project(f.lon, f.lat);
      return `<g class="facility ${mapSel === "fac:" + f.id ? "on" : ""}" data-mapfac="${f.id}" tabindex="0" role="button" aria-label="${esc(f.name)}"><rect x="${fx - 1.8 * k}" y="${fy - 1.8 * k}" width="${3.6 * k}" height="${3.6 * k}" style="stroke-width:${0.7 * k}"/><text x="${fx + 3 * k}" y="${fy + 1.2 * k}" style="font-size:${3.2 * k}px">${esc(f.name)}</text></g>`; }).join("") : "";
    const route = selInc ? (() => { const pl = incidentPlace(selInc), [mx, my] = project(pl.lon, pl.lat), b = briefing(c, selInc);
      return pl.name === "Site-19" ? "" : `<line x1="${sx}" y1="${sy}" x2="${mx}" y2="${my}" class="route" style="stroke-width:${0.6 * k};stroke-dasharray:${2 * k} ${1.2 * k}"/><text x="${(sx + mx) / 2}" y="${(sy + my) / 2 - 2 * k}" class="routetext" style="font-size:${3.4 * k}px">${b.travel ? plural(b.travel, "day") : "by road"}${nightAt(c, selInc) ? " · night there" : ""}</text>`; })() : "";
    const ops = (c.ops ?? []).map(op => { const d = REGIONS[op.region], [ox, oy] = project(d.lon, d.lat); return `<g class="fieldop"><circle cx="${ox + 9 * k}" cy="${oy - 3 * k}" r="${2 * k}"/><circle cx="${ox + 9 * k}" cy="${oy - 3 * k}" r="${3.6 * k}" class="wave" style="stroke-width:${0.5 * k}"/><title>${esc(FIELD_OPS[op.kind].name)} in ${esc(d.name)}, results ${esc(dateText(op.done))}</title></g>`; }).join("");
    // squads flying home: a plane along the route from where they were to Site-19
    const flights = [...new Set(c.roster.filter(o => o.alive && o.busy?.kind === "travel" && o.busy.from).map(o => o.busy!.from!))].map(r => {
      const o = c.roster.find(x => x.alive && x.busy?.kind === "travel" && x.busy.from === r)!, total = o.busy!.total ?? o.busy!.daysLeft + 1;
      const [ax, ay] = project(REGIONS[r].lon, REGIONS[r].lat), f = 1 - o.busy!.daysLeft / total, px = ax + (sx - ax) * f, py = ay + (sy - ay) * f;
      const ang = Math.atan2(sy - ay, sx - ax) * 180 / Math.PI;
      return `<g class="flight"><line x1="${ax}" y1="${ay}" x2="${sx}" y2="${sy}" style="stroke-width:${0.4 * k};stroke-dasharray:${1 * k} ${1.5 * k}"/><path d="M${px + 3 * k} ${py}L${px - 2 * k} ${py - 2 * k}L${px - 1 * k} ${py}L${px - 2 * k} ${py + 2 * k}Z" transform="rotate(${ang} ${px} ${py})"/><title>Epsilon-11 flying home from ${esc(REGIONS[r].name)}: back ${esc(dateText(c.day + o.busy!.daysLeft))}</title></g>`; }).join("");
    const night = nightPoints();
    const [s19x, s19y] = [sx, sy];
    // ---- the side panel: one thing at a time ----
    const back = `<button class="act" type="button" data-mapclear>← All incidents</button>`;
    const r = regionSel, d = REGIONS[r], st = c.regions[r], cw = canCoverStory(c, r), lw = canLocate(c, r), t = travelDays(c, r);
    const regionPanel = () => `<div class="card ${st.collapsed ? "status danger" : ""}">
        <div class="label">Region · ${esc(d.name)}</div>
        <p>Front: <b>${esc(d.front)}</b>${st.collapsed ? " (collapsed)" : st.contactDue ? ` (contact ${dateText(st.contactDue)})` : isContacted(c, r) ? "" : " (not yet established)"}</p>
        <div class="exposure"><div class="exp-bar"><span style="width:${st.collapsed ? 100 : st.exposure}%"></span></div><b>${st.collapsed ? "Lost" : `${st.exposure} / 100`}</b></div>
        ${(() => { const w = weatherAt(c, r); return `<p class="muted">Weather: <b>${WEATHER[w].name}</b>${st.weatherUntil ? `, likely until ${dateText(st.weatherUntil)}` : ""}. ${esc(WEATHER[w].desc)}</p>`; })()}
        <p class="muted">Funding: $${regionFunding(c, r)}k a month. ${t ? `${plural(t, "day")} away by ${transportName(c)}.` : "Site-19 is here; teams go by road."}</p>
        ${(() => { const here = c.incidents.filter(i => i.region === r); return here.length ? `<p>Active here: ${here.map(i => `<button class="linkbtn" type="button" data-mapinc="${i.id}">${esc(incidentName(i))}</button>`).join(" · ")}</p>` : `<p class="muted">Nothing active here.</p>`; })()}
        ${st.collapsed ? `<p class="warn">The public knows too much here. This region sends nothing and can't be recovered.</p>` : !isContacted(c, r) ? (() => { const cw = canContact(c, r), k = contactCost(c);
          return `<p class="muted">With no front here, ${esc(d.name)} sends no funding, exposure here never eases, and field operations, cover stories and cell hunts can't be run. Anomalies still turn up, and Epsilon-11 can still go: a day longer, with nobody to arrange the landing.</p>
          ${st.contactDue ? `<p class="ok">Agents are setting up ${esc(d.front)}. Contact ${dateText(st.contactDue)}.</p>` : `<div class="row"><button class="act primary" type="button" data-contact="${r}" ${cw ? `disabled title="${esc(cw)}"` : ""}>Make contact · $${k.funds}k${k.intel ? ` · ${k.intel} Intel` : ""} · ${plural(CONTACT.days, "day")}</button><span class="muted">${esc(cw || `Sets up ${d.front} as the Foundation's front here. Each new front costs more than the last.`)}</span></div>`}`; })() : `
        <div class="row"><button class="act" type="button" id="coverBtn" ${cw ? `disabled title="${esc(cw)}"` : ""}>Cover story · $${COVER_STORY.cost}k · ${plural(coverDoses(c), "amnestic dose")}</button><span class="muted">${esc(cw || `${d.front} plants a story: −${COVER_STORY.cut} exposure here. Once every ${COVER_STORY.cooldown} days.`)}</span></div>
        <div class="row"><button class="act" type="button" id="locateBtn" ${lw ? `disabled title="${esc(lw)}"` : ""}>Locate an Insurgency cell · ${locateIntel(c)} Intel</button><span class="muted">${esc(lw || "Creates a strike mission here. Breaking the cell pays $80k and lowers exposure.")}</span></div>
        <div class="label" style="margin-top:10px">Field operations</div>
        ${(() => { const op = (c.ops ?? []).find(o => o.region === r); return op ? `<p>${esc(FIELD_OPS[op.kind].name)} under way: results ${dateText(op.done)}.</p>`
          : (Object.keys(FIELD_OPS) as FieldOpKind[]).map(k => { const fw = canFieldOp(c, r, k); return `<div class="row"><button class="act" type="button" data-fieldop="${k}" ${fw ? `disabled title="${esc(fw)}"` : ""}>${FIELD_OPS[k].name} · $${FIELD_OPS[k].cost}k · ${plural(FIELD_OPS[k].days, "day")}</button><span class="muted">${esc(fw || FIELD_OPS[k].desc)}</span></div>`; }).join(""); })()}`}
        <div class="row">${back}</div>
      </div>`;
    const briefPanel = (i: Incident) => { const b = briefing(c, i), block = travelBlock(c, i), stt = incidentState(c, i);
      const cover = i.kind === "coverup" && !i.dispatch ? (() => { const tw = canSendTeam(c, i), bw = canBury(c, i);
        return `<div class="label" style="margin-top:8px">Handle it without Epsilon-11</div>
          <div class="row"><button class="act primary" type="button" data-coverteam="${i.id}" ${tw ? `disabled title="${esc(tw)}"` : ""}>Send an amnestics team · $${AMNESTIC_TEAM.cost}k · 1 researcher · ${plural(i.witnesses ?? 0, "dose")}</button></div>
          <p class="muted">${esc(tw || `A researcher flies out with the doses and treats every witness: −10 exposure here. Back in ${plural(Math.max(1, b.travel) * 2, "day")}.`)}</p>
          <div class="row"><button class="act" type="button" data-bury="${i.id}" ${bw ? `disabled title="${esc(bw)}"` : ""}>Pay ${esc(REGIONS[i.region].front)} to bury it · $${buryCost(i)}k</button></div>
          <p class="muted">${esc(bw || `No doses or staff needed. ${Math.round(BURY.chance * 100)}% chance it holds (−5 exposure); otherwise some of it gets out (+6).`)}</p>`; })() : "";
      return `<div class="file brief">
        <div class="label">${KIND_NAMES[i.kind]} · ${esc(b.place.name)}${stt === "urgent" ? " · urgent" : stt === "new" ? " · new" : ""}</div>
        <h2>${esc(incidentName(i))} <small>${esc(i.title.split(":")[0])}</small></h2>
        <p>${esc(i.kind === "coverup" ? "Witnesses need amnestics before the story spreads." : briefText(i))}</p>
        <div class="specs">Deadline: <b>${esc(b.deadline)}</b>${i.dispatch ? "" : ` · ${esc(b.arrival)}`}</div>
        ${i.group ? `<p class="warn"><b>Only one can be answered.</b> This came in with ${c.incidents.filter(x => x.group === i.group && x !== i).map(x => `<button class="linkbtn" type="button" data-mapinc="${x.id}">${esc(incidentName(x))}</button>`).join(" and ")}. Sending Epsilon-11 to one means the others go unanswered.</p>` : ""}
        ${(() => { const wl = i.dispatch ? "" : weatherLine(c, i); return wl ? `<p class="${missionWeather(c, i) === "clear" ? "muted" : "warn"}">${esc(wl)}</p>` : ""; })()}
        ${i.dispatch ? `<p class="ok">${i.dispatch.how === "team" ? `An amnestics team with ${plural(i.dispatch.doses, "dose")} is on its way.` : "The front is working on it."} Result ${dateText(i.dispatch.done)}.</p>` : ""}
        ${b.known.length ? `<p><span class="intel ok">Confirmed</span> ${b.known.map(esc).join(" ")}</p>` : ""}
        ${b.estimated.length ? `<p><span class="intel est">Estimated</span> ${b.estimated.map(esc).join(" ")}</p>` : ""}
        ${b.unknown.length ? `<p><span class="intel unk">Unknown</span> ${b.unknown.map(esc).join(" ")}</p>` : ""}
        ${b.rewards.length && !i.dispatch ? `<p><b>If it goes well:</b> ${esc(b.rewards.join("; "))}.</p>` : ""}
        ${i.dispatch ? "" : `<p><b>If it's ignored:</b> ${esc(b.ignore)}</p>`}
        ${b.worse && !i.dispatch ? `<p class="warn"><b>While it waits:</b> ${esc(b.worse)}</p>` : ""}
        ${(() => { const notes: string[] = [], plan = i.plan && c.chaos.plans.find(p => p.id === i.plan);
          if (plan) notes.push(`This cell is running ${PLANS[plan.kind].name} (${goalText(plan.kind)}, due ${dateText(plan.due)}). Breaking it stops the operation${c.chaos.commander ? `, and ${c.chaos.commander.rank} ${c.chaos.commander.name} leads it in person` : ""}.`);
          if (i.gru) notes.push("GRU Division \"P\" agents are here for it too. They are Soviet, not Insurgency: whoever reaches it first keeps it.");
          if (i.first) notes.push(`Left too long, ${i.region === "europe" || i.region === "east_asia" ? "GRU Division \"P\" may take it east, or " : ""}the Global Occult Coalition may destroy it. Either way it would be gone for good.`);
          if ((i.kind === "strike" || i.kind === "retaliation") && c.chaos.threat >= 30) notes.push(`With the Insurgency's agenda at ${c.chaos.threat}, expect reinforcements around turn ${c.chaos.threat >= 70 ? 5 : 7} if the fight drags on.`);
          return notes.length ? `<p class="muted">${notes.map(esc).join(" ")}</p>` : ""; })()}
        ${(() => { if (i.dispatch) return ""; const iw = canInvestigate(c, i); return iw && (i.recon || iw.startsWith("There's")) ? "" : iw ? `<p class="muted">${esc(iw)}</p>`
          : `<div class="row"><button class="act" type="button" data-investigate="${i.id}" data-how="intel" ${c.intel < INVESTIGATE.intel ? `disabled title="Needs ${INVESTIGATE.intel} Intel."` : ""}>Investigate · ${INVESTIGATE.intel} Intel, now</button><button class="act" type="button" data-investigate="${i.id}" data-how="agent" ${c.funds < INVESTIGATE.cost ? `disabled title="Needs $${INVESTIGATE.cost}k."` : ""}>Send a field agent · $${INVESTIGATE.cost}k, ${plural(INVESTIGATE.days, "day")}</button></div>`; })()}
        ${cover}
        ${block && !i.dispatch ? `<p class="warn">${esc(block)}</p>` : ""}
        <div class="row">${planning === i.id || i.dispatch ? "" : `<button class="act ${i.kind === "coverup" ? "" : "primary"}" type="button" data-plan="${i.id}" ${c.over || block ? "disabled" : ""}>${i.kind === "breach" ? "Take command" : i.kind === "coverup" ? "Send Epsilon-11 instead" : "Prepare a response"}</button>`}
          ${i.kind === "breach" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it · ${pctText(guardOdds(c, i))} chance</button>` : ""}
          ${i.kind === "riot" || i.kind === "raid" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it${i.kind === "raid" ? ` (${Math.round(raidOdds(c, i) * 100)}%)` : ""}</button>` : ""}
          ${back}</div>
      </div>`; };
    const facPanel = (f: typeof FACILITIES_WORLD[number]) => `<div class="card"><div class="label">Independent Foundation facility · ${esc(REGIONS[f.region].name)}</div>
        <h3 class="fac">${esc(f.name)}</h3><p class="muted">${esc(f.desc)}</p>
        <p class="muted">Site-19 doesn't run ${esc(f.name)}: it has its own staff and command. It can take transfers, and later it may call for help.</p>
        <div class="row">${back}</div></div>`;
    const rank = (i: Incident) => ({ active: 0, urgent: 1, new: 2, open: 3 }[incidentState(c, i)]) + (i.dispatch ? 4 : 0);
    const order = [...c.incidents].sort((a, b) => rank(a) - rank(b) || a.expires - b.expires);
    const away = c.roster.filter(o => o.alive && o.busy?.kind === "travel");
    const overview = `<div class="card">
        <div class="label">Active incidents · ${c.incidents.length}</div>
        ${order.length ? `<ul class="inclist">${order.map(i => { const stt = incidentState(c, i), b = briefing(c, i);
          return `<li class="${stt} ${i.dispatch ? "dispatched" : ""}"><button class="linkbtn" type="button" data-mapinc="${i.id}"><span class="dot ${groupOf(i)}"></span>${esc(incidentName(i))}</button><span class="incmeta">${KIND_NAMES[i.kind]} · ${esc(b.place.name)} · ${esc(b.short)}${stt === "urgent" && !i.dispatch ? " · urgent" : ""}${i.group ? " · choose one" : ""}${i.reward ? ` · ${esc(rewardText(i.reward))}` : ""}</span></li>`; }).join("")}</ul>` : `<p class="muted">Nothing needs Site-19 right now. Let time run.</p>`}
        ${away.length ? `<p class="muted">In the air: ${away.map(o => esc(o.name)).join(", ")}, back ${dateText(c.day + Math.max(...away.map(o => o.busy!.daysLeft)))}.</p>` : ""}
        ${(c.ops ?? []).length ? `<p class="muted">Field operations: ${c.ops!.map(op => `${esc(FIELD_OPS[op.kind].name)} in ${esc(REGIONS[op.region].name)} (${dateText(op.done)})`).join("; ")}.</p>` : ""}
        <p class="muted">Next month: $${councilGrant(c)}k from the O5 Council and $${frontsFunding(c)}k from the fronts, $${monthlyUpkeep(c)}k upkeep and salaries. Global exposure ${c.exposure}; ${collapsedCount(c)} of ${COLLAPSE_LIMIT} fronts lost. Select a region on the map for its front and field operations.</p>
      </div>`;
    const side = selInc ? briefPanel(selInc) : selFac ? facPanel(selFac) : selReg ? regionPanel() : overview;
    const clock = `<div class="geobar">
        <b class="geodate">${dateText(c.day)} · ${String(Math.floor(c.hour ?? 0)).padStart(2, "0")}:00</b>
        <div class="speeds"><button class="act ${speed ? "" : "on"}" type="button" data-speed="0" aria-pressed="${!speed}" title="Pause (Space)">❚❚</button>
          ${SPEEDS.map((n, k) => `<button class="act ${speed === n ? "on" : ""}" type="button" data-speed="${n}" aria-pressed="${speed === n}" ${clockBlocked() ? "disabled" : ""} title="${n}× (${k + 1})">${n}×</button>`).join("")}</div>
        <button class="agenda linkbtn" type="button" data-goto="command" title="The Chaos Insurgency's global agenda. At 100 it completes: exposure everywhere, sabotage at Site-19 and a blow to Council standing. Details on the Command tab."><span>Insurgency agenda</span><span class="mini"><span style="width:${c.chaos.threat}%"></span></span><b>${c.chaos.threat}</b></button>
        ${pendingBreach(c) ? `<span class="warn">${pendingBreach(c)!.kind === "escort" ? "A convoy is under attack" : "Site-19 needs an answer"}: time is held.</span>` : ""}
        <div class="mapfilters">${(["anomaly", "insurgency", "coverup", "site", "facility", "night", "weather"] as const).map(g => `<button class="act ${mapShow.has(g) ? "on" : ""}" type="button" data-mapfilter="${g}" aria-pressed="${mapShow.has(g)}" title="${{ anomaly: "Anomalies", insurgency: "Insurgency", coverup: "Cover-ups", site: "At Site-19", facility: "Facilities", night: "Day and night", weather: "Weather" }[g]}"><span class="dot ${g}"></span><span class="fname">${{ anomaly: "Anomalies", insurgency: "Insurgency", coverup: "Cover-ups", site: "Site-19", facility: "Facilities", night: "Night", weather: "Weather" }[g]}</span></button>`).join("")}</div>
      </div>`;
    return `<div class="geo">
      <div class="card geomap">
        ${clock}
        <div class="mapwrap">
        <svg class="worldmap" id="worldsvg" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" style="aspect-ratio:${(v.w / v.h).toFixed(3)}" role="group" aria-label="World map: regions, incidents and Foundation facilities">
          <defs>${clips}<pattern id="lostHatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2" stroke="#7a2b22" stroke-width=".6"/></pattern></defs>
          <rect x="${x0 - 400}" y="${y0 - 200}" width="${w + 800}" height="${h + 400}" class="sea" data-mapclear></rect>
          ${[-60, -30, 0, 30, 60].map(la => `<line x1="0" x2="360" y1="${90 - la}" y2="${90 - la}" class="grat" style="stroke-width:${0.3 * k}"></line>`).join("")}
          ${[-120, -60, 0, 60, 120].map(lo => `<line y1="${y0}" y2="${y0 + h}" x1="${lo + 180}" x2="${lo + 180}" class="grat" style="stroke-width:${0.3 * k}"></line>`).join("")}
          <path d="${landPaths}" class="land" style="stroke-width:${0.4 * k}"></path>
          ${territories}
          ${links}
          ${mapShow.has("night") ? `<polygon points="${night}" class="night"><title>Night side of the world</title></polygon>` : ""}
          ${regionLabels}
          ${flights}
          ${route}
          <g class="site19"><rect x="${s19x - 2.2 * k}" y="${s19y - 2.2 * k}" width="${4.4 * k}" height="${4.4 * k}" transform="rotate(45 ${s19x} ${s19y})"></rect>
            <text x="${s19x - 4 * k}" y="${s19y - 3.5 * k}" text-anchor="end" style="font-size:${4 * k}px">Site-19</text><title>Site-19 · exact location classified</title></g>
          ${facs}
          ${ops}
          ${markers}
        </svg>
        <div class="zoombtns"><button class="act" type="button" data-zoom="in" aria-label="Zoom in">+</button><button class="act" type="button" data-zoom="out" aria-label="Zoom out">−</button><button class="act" type="button" data-zoom="world" aria-label="Show the whole world">World</button></div>
        </div>
        <p class="muted geohelp">Markers: <span class="dot anomaly"></span>anomaly <span class="dot insurgency"></span>Insurgency <span class="dot coverup"></span>cover-up <span class="dot site"></span>at Site-19. Ring: <span class="urgenttxt">urgent</span>, <span class="newtxt">new</span>, <span class="activetxt">under way</span>. Select a marker or region.</p>
      </div>
      <aside class="geoside">${side}</aside>
    </div>
    ${selInc && planning === selInc.id ? planPanel(selInc) : ""}`;
  }

  function researchTab() {
    const branches: Branch[] = ["SCP-173", ...(["049", "106"] as const).filter(id => c.scps.some(s => s.id === id)).map(id => `SCP-${id}` as Branch),
      ...(c.scps.some(isInert) ? ["Objects" as Branch] : []),
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
  /** Everything out of action, what it costs Site-19 while it stays that way, and what fixing it takes. */
  function damageReport() {
    const hit = c.base.facilities.filter(f => f.disabled);
    if (!hit.length) return "";
    const busy = engineersBusy(c);
    return `<div class="card status danger"><div class="label">Damage report · ${hit.length} ${hit.length === 1 ? "facility" : "facilities"} out of action</div>
      <ul class="why">${hit.map(f => { const r = repairOf(f), rw = canRepair(c, f);
        return `<li><b>${esc(FACILITIES[f.type].name)}</b>, level ${f.level + 1} · ${f.wrecked ? "wrecked" : "damaged"} · ${esc(damageEffect(c, f))}
          ${f.repairDays ? `<span class="ok">${f.wrecked ? "Rebuilding" : "Repairs"}: ${plural(f.repairDays, "day")} left.</span>`
            : `<button class="act" type="button" data-repair="${f.id}" ${rw ? `disabled title="${esc(rw)}"` : ""}>${f.wrecked ? "Rebuild" : "Repair"} · $${r.cost}k · ${plural(r.days, "day")} · ${r.engineers} engineers</button>${rw ? ` <span class="muted">${esc(rw)}</span>` : ""}`}</li>`; }).join("")}</ul>
      <p class="muted">${busy} of ${c.engineers} engineers are busy. Repairs compete with construction, refits and workshop orders for them.</p></div>`;
  }

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
      ${damageReport()}
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
      <div class="specs">${f.type === "generator" ? `Supplies ${generatorOutput(f)} power` : d.power < 0 ? `Supplies ${-d.power} power` : `Uses ${d.power} power`} · $${d.upkeep + (f.type === "generator" ? genTierOf(f).upkeep : 0)}k/month upkeep${d.grade !== undefined ? ` · ${GRADE_NAMES[d.grade]} grade` : ""}</div>
      <div class="specs">Next to: ${esc(nb)}</div>
      <p>${f.demolishDays ? "Shut down while it's taken apart." : f.daysLeft > 0 ? `Under construction: ${plural(f.daysLeft, "day")} left.` : f.repairDays > 0 ? `Engineers are repairing it: ${plural(f.repairDays, "day")} left.` : f.disabled ? `<span class="warn">${f.wrecked ? "Wrecked: it has to be rebuilt." : "Damaged and out of action."}</span>` : "Operational."}</p>
      ${f.type === "barracks" && !f.upgraded ? (() => { const uw = canUpgrade(c, f);
        return f.upgradeDays ? `<p class="muted">Being expanded: ${plural(f.upgradeDays, "day")} left.</p>` : `<div class="row"><button class="act" id="upgradeBtn" type="button" ${uw ? `disabled title="${esc(uw)}"` : ""}>Expand to 15 beds · $${UPGRADE.cost}k · ${plural(UPGRADE.days, "day")} · ${UPGRADE.engineers} engineers</button>${uw ? `<span class="muted">${esc(uw)}</span>` : ""}</div>`; })() : f.upgraded ? `<p class="muted">Expanded: holds 15 D-Class.</p>` : ""}
      ${f.demolishDays ? `<p class="warn">Being torn down: ${plural(f.demolishDays, "day")} left.</p>` : f.type === "command" ? "" : (() => { const dw = canDemolish(c, f);
        return `<div class="row"><button class="act" id="demolishBtn" type="button" ${dw ? `disabled title="${esc(dw)}"` : ""}>Tear down · ${plural(demolishDays(f), "day")} · 1 engineer · +$${Math.round(d.cost * DEMOLISH.refund)}k salvage</button>${dw ? `<span class="muted">${esc(dw)}</span>` : demolishLeavesShort(c, f) ? `<span class="warn">This would leave Site-19 short of power.</span>` : ""}</div>`; })()}
      ${f.disabled ? `<p class="warn">${esc(damageEffect(c, f))}</p>` : ""}
      ${f.disabled && f.repairDays === 0 ? `<div class="row"><button class="act primary" id="repairBtn" type="button" ${rw ? `disabled title="${esc(rw)}"` : ""}>${f.wrecked ? "Rebuild" : "Repair"} · $${repairOf(f).cost}k · ${plural(repairOf(f).days, "day")} · ${repairOf(f).engineers} engineers</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>` : ""}
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
    const r = breachRisk(c, s), due = routineDue(c, s), cw = canClean(c, s), rt = routineOf(s)!;
    if (s.status !== "contained") return scpSummary(s);
    if (isInert(s)) return `<div class="file">
      <div class="label">Containment · ${s.name}</div>
      <h2>${s.name} · ${s.title} <small>${s.cls}</small></h2>
      ${progressHtml(s.id)}
      <p>Held in the ${wing ? `${nameInText(wing.type)} on level ${wing.level + 1}` : "?"}. An object: it doesn't breach and its cell needs no cleaning.</p>
      <p class="muted">${esc(SCP_DEFS[s.id].use ?? "")}</p>
      ${objectUse(s)}
      ${procedureHtml(s.id)}
      ${sendAwayBlock(s)}
    </div>`;
    return `<div class="file">
      <div class="label">Containment · ${s.name}</div>
      <h2>${s.name} · ${s.title} <small>${s.cls}</small></h2>
      ${progressHtml(s.id)}
      <p>Held in the ${wing ? `${nameInText(wing.type)} on level ${wing.level + 1}` : "?"}.</p>
      <div class="riskline"><b>Breach risk ${pctText(r.p)} a day</b></div>
      <ul class="why">${r.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
      <div class="maint"><span>Maintenance ${s.maintenance}%</span><div class="exp-bar"><span style="width:${s.maintenance}%"></span></div></div>
      <div class="label" style="margin-top:8px">Routine · ${esc(rt.name)} every ${plural(rt.every, "day")}</div>
      <p>${esc(rt.desc)}${rt.crew === "dclass" ? ` (${pctText(CLEAN_RISK)} a time.)` : ""} If it's missed: ${esc(rt.overdue.charAt(0).toLowerCase() + rt.overdue.slice(1))}</p>
      <label class="armorpick"><input type="checkbox" id="cleanOrder" ${c.cleaningOrder ? "checked" : ""}> Standing order: every anomaly's routine is carried out on schedule when the staff are free</label>
      <p>${c.cleaningOrder ? `Next ${rt.name.toLowerCase()} ${due > 0 ? `in ${plural(due, "day")}` : "today"}.` : `Next ${rt.name.toLowerCase()} ${due > 0 ? `due in ${plural(due, "day")}` : "<b>overdue</b>"}. Order it below.`}</p>
      <div class="row"><button class="act primary" data-clean="${s.id}" type="button" ${cw ? `disabled title="${esc(cw)}"` : ""}>${esc(rt.name)} now · ${rt.crew === "dclass" ? `${rt.n} D-Class` : rt.crew === "researcher" ? "1 researcher" : `${rt.n} engineers`}${rt.cost ? ` · $${rt.cost}k` : ""}</button>${cw ? `<span>${esc(cw)}</span>` : ""}</div>
      ${procedureHtml(s.id)}
      ${evacBlock(s)}
      ${sendAwayBlock(s)}
    </div>`;
  }

  /** Recovery → containment → study → use, as a strip of steps, with what each finished study gives. */
  function progressHtml(id: string) {
    const p = anomalyProgress(c, id);
    if (!p.total && !p.recovered) return "";
    const step = (on: boolean, label: string) => `<span class="step ${on ? "on" : ""}">${on ? "✓" : "·"} ${esc(label)}</span>`;
    return `<div class="steps">${step(p.recovered, "Recovered")}${step(p.contained, "Contained")}${step(p.studied > 0, `Studied ${p.studied}/${p.total}`)}${step(p.total > 0 && p.studied === p.total, "Fully understood")}</div>
      ${p.projects.some(x => x.done) ? `<p class="muted">In use: ${p.projects.filter(x => x.done).map(x => `<b>${esc(x.name)}</b> (${esc(x.desc)})`).join(" ")}</p>` : ""}
      ${p.projects.some(x => !x.done) ? `<p class="muted">Still to learn: ${p.projects.filter(x => !x.done).map(x => esc(x.visible ? x.name : `${x.name} (not yet possible)`)).join(", ")}.</p>` : ""}`;
  }

  /** The anomaly's Special Containment Procedures, folded away under its cell. */
  function procedureHtml(id: string) {
    const p = id === "610" ? PROCEDURE_610 : PROCEDURES[id as ScpId];
    if (!p) return "";
    return `<details class="archived"><summary>Special Containment Procedures</summary>
      <p><b>Cell.</b> ${esc(p.cell)}</p>
      <p><b>Capture.</b> ${esc(p.capture)}</p>
      ${p.bring.length ? `<p><b>Bring.</b> ${esc(p.bring.join("; "))}.</p>` : ""}
      <p><b>What makes it fail.</b> ${esc(p.failure.join("; "))}.</p>
      <p><b>If it gets out.</b> ${esc(p.emergency)}</p></details>`;
  }

  /** SCP-500's pills and SCP-914's refining, used from the object's own cell. */
  function objectUse(s: ScpRecord) {
    if (s.id === "500") {
      const pool = c.roster.filter(o => o.alive && !canGivePill(c, o));
      return `<div class="facpanel"><div class="label">SCP-500 · ${plural(pillsLeft(c), "dose")} left${has(c, "panacea_assay") ? " (half a pill each)" : ""}</div>
        ${pool.length ? `<div class="row">${pool.map(o => `<button class="act" type="button" data-pill="${o.id}">${esc(o.call)} ${esc(o.name)} · HP ${o.hp}/${o.maxHp}${o.traits.some(t => TRAITS[t].bad) ? ` · ${o.traits.filter(t => TRAITS[t].bad).map(t => TRAITS[t].name).join(", ")}` : ""}</button>`).join("")}</div>`
          : `<p class="muted">${pillsLeft(c) ? "Nobody needs it right now: it only helps the wounded, the shaken, or anyone with a bad trait." : "The pills are gone."}</p>`}</div>`;
    }
    if (s.id === "914") {
      const wait = c.lastRefine !== undefined && c.day - c.lastRefine < REFINE_EVERY ? REFINE_EVERY - (c.day - c.lastRefine) : 0;
      return `<div class="facpanel"><div class="label">SCP-914 · ${has(c, "very_fine") ? "Fine and Very Fine" : "Fine"}${wait ? ` · ready in ${plural(wait, "day")}` : " · ready"}</div>
        <p class="muted">One item a week from stores. It fails ${has(c, "very_fine") ? "1 time in 10" : "1 time in 5"}, and the item is lost.</p>
        <div class="row">${refineRecipes(c).map(r => { const w = canRefine(c, r.from); return `<button class="act" type="button" data-refine="${r.from}" ${w ? `disabled title="${esc(w)}"` : ""}>${esc(ITEMS[r.from].name)} (${c.inventory[r.from] ?? 0}) → ${esc(ITEMS[r.to].name)}</button>`; }).join("")}</div></div>`;
    }
    return "";
  }

  /** Hand an anomaly to a partner site for good: they pay for it, and it never breaches here again. */
  function sendAwayBlock(s: ScpRecord) {
    if (canSendAway(c, s.id)) return "";
    return `<details class="archived"><summary>Transfer it to another site for good</summary>
      <p class="muted">A partner site takes it and pays $${PAY_FOR[s.cls]}k (+2 standing). It travels by road for a few days; its research at Site-19 stops.</p>
      <div class="row">${PARTNERS.map(p => `<button class="act" type="button" data-sendaway="${s.id}" data-site="${p}">Send it to ${p}</button>`).join("")}</div></details>`;
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
      case "command": {
        const pool = c.recruits ?? [];
        return box(`Recruitment · ${plural(pool.length, "candidate")} this month`, `
          <p class="muted">Epsilon-11 recruits from special forces around the world. A new pool arrives on the first of every month; each operative costs $10k a month once hired. Units open as they are formed (US Army Special Forces in 1952, Navy SEALs in 1962).</p>
          ${(() => { const st = (id: string) => has(c, id) ? "done" : c.research.assigned[id] ? "under way" : projectVisible(c, id) ? "available in the lab" : PROJECTS[id].afterWon && c.stats.won < PROJECTS[id].afterWon! ? `opens after ${PROJECTS[id].afterWon} missions won` : "not yet available";
            return `<p class="specs">Allied liaison office (research, ${st("liaison_office")}): opens the Korps Commandotroepen and Philippine Scout Rangers, the Belgian Paracommandos from 1952 and Norwegian naval commandos from 1953, and 2 more candidates a month. Joint training exchange (research, ${st("joint_exchange")}): far more Veteran and Elite candidates. O5 standing will add to this later.</p>`; })()}
          ${pool.length ? pool.map(k => { const u = UNITS[k.unit], q = QUALITY[k.quality], w = canHire(c, k);
            return `<div class="proj"><div class="ptop">${portraitSvg(rollLook(k.id, k.sex), k.unit, 44)}<b>${esc(k.name)}</b><span class="flag ${k.quality ? "stare" : ""}">${q.name}</span></div>
              <div class="specs">${SEX_NAMES[k.sex]} · ${esc(u.name)} · nationality ${esc(k.nationality ?? nationalityOf(k.home))} · age ${k.age}, from ${esc(k.home)} · starts as ${RANKS[k.quality ? 1 : trainersActive(c) ? 1 : 0]} · aim ${k.aimBase + (u.lean === "aim" ? 6 : 0)}</div>
              <p class="muted">${esc(k.story)} <b>${LEANS[u.lean]}</b> (${esc(u.name)}).${q.desc ? ` ${esc(q.desc)}` : ""}</p>
              ${k.trait ? `<p class="${TRAITS[k.trait].bad ? "warn" : ""}">Comes with <b>${TRAITS[k.trait].name}</b>: ${esc(TRAITS[k.trait].desc)}</p>` : ""}
              <div class="row"><button class="act" type="button" data-hire="${k.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Hire · $${candidateCost(k)}k</button>${w ? `<span class="muted">${esc(w)}</span>` : ""}</div></div>`; }).join("") : `<p class="muted">Nobody left in this month's pool. More arrive on the first.</p>`}`);
      }
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
      case "generator": { const t = genTierOf(f), next = GEN_TIERS[(f.genTier ?? 0) + 1], rw = canRefitGen(c, f);
        return box(`${t.name} · ${f.upgradeDays ? "offline for refitting" : `${t.power} power`}`, f.upgradeDays
          ? `<p class="warn">Being refitted as a ${esc(next.name.toLowerCase())}: ${plural(f.upgradeDays, "day")} left. It supplies nothing until then.</p>`
          : next ? `<p class="muted">Refit as a <b>${esc(next.name.toLowerCase())}</b>: ${next.power} power${next.upkeep ? `, $${next.upkeep}k more upkeep a month` : ""}. The generator is offline for ${plural(next.days, "day")} while engineers work on it${powerUse(c) > powerSupply(c) - t.power ? `, <span class="warn">which would leave Site-19 short of power</span>` : ""}.</p>
            <div class="row"><button class="act" type="button" data-refit="${f.id}" ${rw ? `disabled title="${esc(rw)}"` : ""}>Refit · $${next.cost}k · ${plural(next.days, "day")} · ${next.engineers} engineers</button>${rw ? `<span class="muted">${esc(rw === "Needs research first." ? `Needs ${PROJECTS[next.research].name} research first.` : rw)}</span>` : ""}</div>`
          : `<p class="muted">The best generator Site-19 can build.</p>`); }
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
        <div class="row"><button class="act" type="button" data-gotocommand>Recruit at Command · ${plural((c.recruits ?? []).length, "candidate")} this month</button></div>
      </div>
    </section>
    <section class="col">
      ${opDetail()}
      <p class="muted">Guards, training, therapy, D-Class, engineers and prisoners are managed from their facilities on the Site-19 tab.</p>
      ${c.retired?.length ? `<div class="card">
        <div class="label">Retired</div>
        <ul class="memorial">${c.retired.map(r => `<li>${r.look ? portraitSvg(r.look, r.unit, 36) : ""} <b>${esc(r.name)}</b> (${esc(r.call)}), ${RANKS[r.rank]}${r.unit ? `, formerly ${esc(UNITS[r.unit].name)}` : ""} · ${plural(r.missions, "mission")}${r.kills ? `, ${plural(r.kills, "kill")}` : ""}${r.medals?.length ? ` · ${r.medals.map(m => MEDALS[m].name).join(", ")}` : ""} · ${r.trainer ? "trainer at the range" : "honourable discharge"}, ${dateText(r.day)}</li>`).join("")}</ul>
      </div>` : ""}
      ${c.roster.some(o => !o.alive) ? `<div class="card">
        <div class="label">Memorial</div>
        <ul class="memorial">${c.roster.filter(o => !o.alive).map(o => `<li>${portraitSvg(lookOf(o), o.unit, 36, true)} <b>${esc(fieldName(o))}</b> (${esc(o.call)}), ${RANKS[o.rank]}${o.unit ? `, formerly ${esc(UNITS[o.unit].name)}` : ""}${o.bio ? `, of ${esc(o.bio.home)}` : ""} · ${plural(o.missions, "mission")}, ${plural(o.kills, "kill")}${o.wounds ? `, wounded ${o.wounds}×` : ""}${o.seals ? `, ${o.seals} sealed` : ""}${o.medals?.length ? ` · ${o.medals.map(m => MEDALS[m].name).join(", ")}` : ""} · killed ${o.diedDay ? dateText(o.diedDay) : ""}${o.diedAt ? `, ${esc(o.diedAt)}` : ""}</li>`).join("")}</ul>
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
      <div class="row" style="align-items:center">${portraitSvg(lookOf(o), o.unit, 88)}<h3 class="fac">${esc(fieldName(o))}</h3></div>
      ${o.busy ? `<p class="warn">${o.busy.kind === "therapy" ? "In therapy" : o.busy.kind === "travel" ? "Flying home" : "Retraining"}: ${plural(o.busy.daysLeft, "day")} left. Can't deploy until then.</p>` : ""}
      ${o.unit ? `<div class="specs">Recruited from the ${esc(UNITS[o.unit].name)} (${esc(UNITS[o.unit].country)}) · ${LEANS[UNITS[o.unit].lean]}${o.bio ? ` · nationality ${esc(nationalityOf(o.bio.home))}` : ""}</div>` : ""}
      <div class="specs">Sex: ${SEX_NAMES[o.sex ?? "m"]}</div>
      ${o.bio ? `<p class="muted">Age ${o.bio.age + Math.floor((c.day - 1) / 365)}, from ${esc(o.bio.home)}. ${esc(o.bio.story)}</p>` : ""}
      <div class="specs">Service: ${plural(o.missions, "mission")} · ${plural(o.kills, "kill")} · wounded ${o.wounds ?? 0}× · ${(o.seals ?? 0) === 1 ? "1 anomaly" : `${o.seals ?? 0} anomalies`} sealed${o.faced?.length ? ` · faced ${esc(o.faced.join(", "))}` : ""}</div>
      ${o.medals?.length ? `<ul class="traits">${o.medals.map(m => `<li class="good"><b>${MEDALS[m].name}</b>: ${esc(MEDALS[m].bonus)} <span class="muted">${esc(MEDALS[m].how)}</span></li>`).join("")}</ul>` : ""}
      ${o.busy ? "" : (() => { const tw = trainerWhy(c, o); return `<details class="archived"><summary>Retire</summary>
        <p class="muted">${tw ? `${esc(tw)} They can still leave with an honourable discharge.` : "As a trainer at the range, new recruits arrive as Privates First Class while they're there."}</p>
        <div class="row"><button class="act" type="button" data-retire="${o.id}">${tw ? "Honourable discharge" : "Retire as a trainer"}</button></div></details>`; })()}
      <details class="archived" ${lookOpen ? "open" : ""}><summary>Appearance</summary>
        ${(() => { const l = lookOf(o), part = (key: string, label: string, value: string) => `<div class="row"><span class="specs" style="min-width:90px">${label}</span><button class="act" type="button" data-look="${key}" data-d="-1" aria-label="Previous ${label.toLowerCase()}">‹</button><span style="min-width:110px">${esc(value)}</span><button class="act" type="button" data-look="${key}" data-d="1" aria-label="Next ${label.toLowerCase()}">›</button></div>`;
          return part("sex", "Sex", SEX_NAMES[o.sex ?? "m"]) + part("skin", "Skin tone", `${l.skin + 1} of ${SKIN.length}`) + part("hair", "Hair", HAIR_STYLES[l.hair]) + part("hairColor", "Hair colour", `${l.hairColor + 1} of ${HAIR_COLORS.length}`)
            + (o.sex === "f" ? "" : part("facial", "Facial hair", FACIAL[l.facial])) + part("scar", "Scar", l.scar ? "Yes" : "No") + (o.unit && HEADGEAR[o.unit] ? part("headgear", "Headgear", l.headgear ? HEADGEAR[o.unit]![0] : "None") : ""); })()}
      </details>
      <details class="archived"><summary>Rename</summary><div class="row">
        <label class="specs" for="renameName">Full name</label><input id="renameName" maxlength="40" value="${esc(o.name)}">
        <label class="specs" for="renameNick">Nickname</label><input id="renameNick" maxlength="16" value="${esc(o.nick ?? "")}" placeholder="${o.rank >= NICK_RANK ? "none" : "given at Corporal"}">
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
      <span class="tag">${portraitSvg(lookOf(o), o.unit, 40)}<br>${esc(o.call)}</span>
      <span class="nm">${esc(fieldName(o))} <span class="muted">${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}</span></span>
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
      const pickRegion = () => { if (dragMoved) return; regionSel = b.dataset.region as RegionId; mapSel = "region"; planning = null; zoomToRegion(regionSel); render(); };
      b.onclick = pickRegion;
      b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickRegion(); } };
    });
    on("coverBtn", () => change(() => coverStory(c, regionSel)));
    on("locateBtn", () => change(() => locateCell(c, regionSel)));
    root.querySelectorAll<HTMLElement>("[data-speed]").forEach(b => b.onclick = () => setSpeed(Number(b.dataset.speed)));
    on("noticeGo", () => { tab = c.notices![0].tab; c.notices = []; act.save(); render(); window.scrollTo(0, 0); });
    on("noticeOk", () => { c.notices = []; act.save(); setSpeed(lastSpeed); });
    root.querySelectorAll<HTMLElement>("[data-gotocommand]").forEach(b => b.onclick = () => {
      const f = c.base.facilities.find(x => x.type === "command");
      if (f) sel = { level: f.level, slot: f.slot };
      flashMsg = ""; tab = "site"; speed = 0; render();
    });
    root.querySelectorAll<HTMLElement>("[data-hire]").forEach(b => b.onclick = () => { const k = c.recruits?.find(x => x.id === b.dataset.hire); if (k) change(() => hireCandidate(c, k)); });
    root.querySelectorAll<HTMLElement>("[data-op]").forEach(b => b.onclick = () => { opSel = opSel === b.dataset.op ? null : b.dataset.op!; lookOpen = false; render(); });
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
    root.querySelectorAll<HTMLElement>("[data-hcat]").forEach(b => b.onclick = () => { histCat = b.dataset.hcat as HistCat | "all"; render(); });
    root.querySelectorAll<HTMLElement>("[data-openreport]").forEach(b => b.onclick = () => { openReport = b.dataset.openreport!; render(); document.getElementById(`report-${openReport}`)?.scrollIntoView({ block: "start" }); });
    root.querySelectorAll<HTMLElement>("[data-openop]").forEach(b => b.onclick = () => { opSel = b.dataset.openop!; tab = "personnel"; render(); });
    { const q = root.querySelector<HTMLInputElement>("#histQ"); if (q) q.oninput = () => {
      const t = q.value.trim().toLowerCase(); let any = false;
      root.querySelectorAll<HTMLElement>("[data-htext]").forEach(li => { const hit = !t || li.dataset.htext!.includes(t); li.hidden = !hit; any ||= hit; });
      root.querySelector<HTMLElement>("#histNone")!.hidden = any;
    }; }
    root.querySelectorAll<HTMLElement>("[data-repair]").forEach(b => b.onclick = () => { const f = c.base.facilities.find(x => x.id === b.dataset.repair); if (f) change(() => repair(c, f)); });
    root.querySelectorAll<HTMLElement>("[data-refit]").forEach(b => b.onclick = () => change(() => orderRefit(c, b.dataset.refit!)));
    root.querySelectorAll<HTMLElement>("[data-att]").forEach(b => b.onclick = () => change(() => orderAttachment(c, b.dataset.att as AttachmentId)));
    on("intelBtn", () => { const inc = c.incidents.find(i => i.id === planning); if (inc) change(() => weaken(c, inc)); });
    { const el = $("cleanOrder") as HTMLInputElement | null; if (el) el.onchange = () => change(() => { c.cleaningOrder = el.checked; }); }
    on("dBuyBtn", () => change(() => buyDClass(c)));
    on("engBtn", () => change(() => hireEngineer(c)));
    on("digBtn", () => change(() => excavate(c)));
    root.querySelectorAll<HTMLElement>("[data-evac]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.evac), f = c.base.facilities.find(x => x.id === b.dataset.to); if (s && f) change(() => evacuate(c, s, f, chosenWatchers())); });
    root.querySelectorAll<HTMLElement>("[data-refit]").forEach(b => b.onclick = () => { const f = c.base.facilities.find(x => x.id === b.dataset.refit); if (f) change(() => refitGenerator(c, f)); });
    root.querySelectorAll<HTMLElement>("[data-disrupt]").forEach(b => b.onclick = () => change(() => disrupt(c, b.dataset.disrupt!)));
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(b => b.onclick = () => change(() => reveal(c, b.dataset.reveal!)));
    root.querySelectorAll<HTMLElement>("[data-inquiry]").forEach(b => b.onclick = () => change(() => investigateBreach(c, b.dataset.inquiry!)));
    root.querySelectorAll<HTMLElement>("[data-offer]").forEach(b => b.onclick = () => change(() => answerOffer(c, b.dataset.offer!, !!b.dataset.yes)));
    root.querySelectorAll<HTMLElement>("[data-request]").forEach(b => b.onclick = () => change(() => makeRequest(c, b.dataset.request as RequestId)));
    root.querySelectorAll<HTMLElement>("[data-pill]").forEach(b => b.onclick = () => { const o = c.roster.find(x => x.id === b.dataset.pill); if (o) change(() => givePill(c, o)); });
    root.querySelectorAll<HTMLElement>("[data-refine]").forEach(b => b.onclick = () => change(() => refine(c, b.dataset.refine as ItemId)));
    root.querySelectorAll<HTMLElement>("[data-sendaway]").forEach(b => b.onclick = () => {
      const s = c.scps.find(x => x.id === b.dataset.sendaway);
      if (s && confirm(`Send ${s.name} to ${b.dataset.site} for good? Site-19 won't hold or study it again.`)) change(() => sendAway(c, s.id, b.dataset.site!));
    });
    root.querySelectorAll<HTMLElement>("[data-contact]").forEach(b => b.onclick = () => change(() => makeContact(c, b.dataset.contact as RegionId)));
    root.querySelectorAll<HTMLElement>("[data-transfer]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.transfer); if (s) change(() => transferOut(c, s)); });
    root.querySelectorAll<HTMLElement>("[data-clean]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.clean); if (s) change(() => cleanCell(c, s)); });
    root.querySelectorAll<HTMLElement>("[data-alert]").forEach(b => b.onclick = () => change(() => { c.alert = b.dataset.alert as Alert; }));
    root.querySelectorAll<HTMLElement>("[data-retire]").forEach(b => b.onclick = () => { const o = c.roster.find(x => x.id === b.dataset.retire); if (o) { opSel = null; change(() => retire(c, o)); } });
    root.querySelectorAll<HTMLElement>("[data-look]").forEach(b => b.onclick = () => {
      const o = c.roster.find(x => x.id === opSel); if (!o) return;
      const l = { ...lookOf(o) }, k = b.dataset.look as keyof typeof l, d = Number(b.dataset.d);
      lookOpen = true;
      if ((k as string) === "sex") {
        // switching build swaps to a fitting hair style and drops facial hair
        change(() => { o.sex = o.sex === "f" ? "m" : "f"; o.look = fitLook(l, o.sex); });
        return;
      }
      if (k === "scar" || k === "headgear") l[k] = !l[k];
      else if (k === "hair") { const ok = HAIR_BY_SEX[o.sex ?? "m"] as readonly number[], i = ok.indexOf(l.hair); l.hair = ok[(Math.max(0, i) + d + ok.length) % ok.length]; }
      else { const n = LOOK_PARTS[k]; l[k] = (l[k] + d + n) % n; }
      change(() => { o.look = l; });
    });
    on("renameBtn", () => {
      const o = c.roster.find(x => x.id === opSel), n = root.querySelector<HTMLInputElement>("#renameName")!.value.trim(), k = root.querySelector<HTMLInputElement>("#renameCall")!.value.trim();
      const nk = root.querySelector<HTMLInputElement>("#renameNick")!.value.trim().replace(/"/g, "");
      if (o && n && k) change(() => { o.name = n.slice(0, 40); o.call = k.slice(0, 12); o.nick = nk ? nk.slice(0, 16) : undefined; });
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
    root.querySelectorAll<HTMLElement>("[data-mapinc]").forEach(b => {
      const pick = () => { const i = c.incidents.find(x => x.id === b.dataset.mapinc); if (!i) return; mapSel = "inc:" + i.id; regionSel = i.region; if (planning && planning !== i.id) planning = null; flashMsg = ""; tab = "world"; render(); };
      b.onclick = pick; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
    });
    root.querySelectorAll<HTMLElement>("[data-mapfac]").forEach(b => { const pick = () => { mapSel = "fac:" + b.dataset.mapfac; planning = null; render(); };
      b.onclick = pick; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }; });
    // ---- World Map zoom and pan ----
    const svg = root.querySelector<SVGSVGElement>("#worldsvg");
    if (svg) {
      let rerender = 0;
      const apply = () => { svg.setAttribute("viewBox", `${geoView.x} ${geoView.y} ${geoView.w} ${geoView.h}`); clearTimeout(rerender); rerender = window.setTimeout(render, 160); };
      svg.addEventListener("wheel", e => {
        e.preventDefault();
        const r = svg.getBoundingClientRect(), mx = geoView.x + (e.clientX - r.left) / r.width * geoView.w, my = geoView.y + (e.clientY - r.top) / r.height * geoView.h;
        const nw = geoView.w * (e.deltaY > 0 ? 1.2 : 1 / 1.2);
        geoView = clampView({ x: mx - (mx - geoView.x) * nw / geoView.w, y: my - (my - geoView.y) * nw / geoView.w, w: nw, h: 0 });
        apply();
      }, { passive: false });
      let drag: { x: number; y: number; vx: number; vy: number } | null = null;
      svg.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, vx: geoView.x, vy: geoView.y }; dragMoved = false; });
      svg.addEventListener("pointermove", e => {
        if (!drag) return;
        const r = svg.getBoundingClientRect(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!dragMoved && Math.hypot(dx, dy) < 5) return;
        dragMoved = true; svg.classList.add("panning");
        geoView = clampView({ ...geoView, x: drag.vx - dx / r.width * geoView.w, y: drag.vy - dy / r.height * geoView.h });
        svg.setAttribute("viewBox", `${geoView.x} ${geoView.y} ${geoView.w} ${geoView.h}`);
      });
      const end = () => { if (drag && dragMoved) { svg.classList.remove("panning"); apply(); setTimeout(() => { dragMoved = false; }, 0); } drag = null; };
      svg.addEventListener("pointerup", end); svg.addEventListener("pointerleave", end);
      svg.addEventListener("click", e => { if (dragMoved) { e.stopPropagation(); e.preventDefault(); } }, true);
    }
    root.querySelectorAll<HTMLElement>("[data-zoom]").forEach(b => b.onclick = () => {
      const z = b.dataset.zoom, cx = geoView.x + geoView.w / 2, cy = geoView.y + geoView.h / 2;
      if (z === "world") { const [s19x] = project(SITE19.lon, SITE19.lat); geoView = clampView({ x: s19x - WORLD_VIEW.w / 2, y: WORLD_VIEW.y, w: WORLD_VIEW.w, h: 0 }); }
      else { const nw = geoView.w * (z === "in" ? 1 / 1.5 : 1.5); geoView = clampView({ x: cx - nw / 2, y: cy - nw * mapAspect() / 2, w: nw, h: 0 }); }
      render();
    });
    root.querySelectorAll<HTMLElement>("[data-coverteam]").forEach(b => b.onclick = () => { const i = c.incidents.find(x => x.id === b.dataset.coverteam); if (i) change(() => sendAmnesticsTeam(c, i)); });
    root.querySelectorAll<HTMLElement>("[data-bury]").forEach(b => b.onclick = () => { const i = c.incidents.find(x => x.id === b.dataset.bury); if (i) change(() => buryStory(c, i)); });
    root.querySelectorAll<HTMLElement>("[data-investigate]").forEach(b => b.onclick = () => { const i = c.incidents.find(x => x.id === b.dataset.investigate); if (i) change(() => investigate(c, i, b.dataset.how === "intel")); });
    root.querySelectorAll<HTMLElement>("[data-fieldop]").forEach(b => b.onclick = () => change(() => startFieldOp(c, regionSel, b.dataset.fieldop as FieldOpKind)));
    root.querySelectorAll<HTMLElement>("[data-mapclear]").forEach(b => b.onclick = () => { mapSel = null; planning = null; render(); });
    root.querySelectorAll<HTMLElement>("[data-mapfilter]").forEach(b => b.onclick = () => { const g = b.dataset.mapfilter!; if (mapShow.has(g)) mapShow.delete(g); else mapShow.add(g); render(); });
    root.querySelectorAll<HTMLElement>("[data-plan]").forEach(b => b.onclick = () => {
      // responses are prepared on the World Map, from the incident's briefing
      if (tab !== "world" || mapSel !== "inc:" + b.dataset.plan) { tab = "world"; mapSel = "inc:" + b.dataset.plan; const inc0 = c.incidents.find(x => x.id === b.dataset.plan); if (inc0) regionSel = inc0.region; try { localStorage.setItem("site19-tab", tab); } catch { /* fine */ } planning = null; }
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
    on("exportBtn", async () => {
      const text = JSON.stringify(c), filename = `site19-${dateText(c.day).replace(/ /g, "-").toLowerCase()}.json`;
      // inside the claude.ai viewer, files go out through its downloads capability (the viewer confirms the save)
      const host = window.parent !== window ? (window as unknown as { claude?: { use(n: string): Promise<{ save(r: { filename: string; data: string }): Promise<unknown> } | null> } }).claude : undefined;
      const dl = host ? await host.use("downloads").catch(() => null) : null;
      if (dl) {
        try { await dl.save({ filename, data: text }); }
        catch (e) { if ((e as { code?: string })?.code !== "declined") { flashMsg = "The save file couldn't be offered here."; render(); } }
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = filename;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    { const f = root.querySelector<HTMLInputElement>("#importFile"); if (f) f.onchange = async () => {
      const file = f.files?.[0]; if (!file) return;
      const loaded = parseCampaign(await file.text());
      if (loaded) act.importCampaign(loaded); else { flashMsg = "That file isn't a Site-19 save this version can read."; render(); }
    }; }
  }

  // the clock loop runs until the hub is replaced by a mission or a fresh hub
  let last = performance.now(), lastNight = 0;
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
      else {
        const el = document.getElementById("clockHour"); if (el) el.textContent = hourText();
        // the night side sweeps across the map with the clock, not just when the day turns over
        const night = root.querySelector<SVGPolygonElement>("polygon.night");
        if (night && now - lastNight > 80) { lastNight = now; night.setAttribute("points", nightPoints()); }
        const gd = root.querySelector<HTMLElement>(".geodate"); if (gd) gd.textContent = `${dateText(c.day)} · ${String(Math.floor(c.hour ?? 0)).padStart(2, "0")}:00`;
      }
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
