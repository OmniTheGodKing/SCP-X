// Site-19 Command: incidents and time, the base and its containment, and Epsilon-11's roster.
import { creditsHtml } from "./credits";
import "./hub.css";
import { directorsBriefing } from "../campaign/briefing";
import { obligations, projection } from "../campaign/forecast";
import { crews } from "../campaign/crews";
import { UNIFORMS } from "../campaign/research";
import { attachmentsFor, canFitAttachment, mountsOf, weaponStats } from "../campaign/armory";
import { researchersAssigned } from "../campaign/research";
import { MOUNT_NAMES, fits, type MountId } from "../data/mounts";
import { allRooms, designationOf, roomLayout } from "../scene/layout";
import { DCLASS_PER_FIGURE, FRAME, targetsFor } from "../scene/targets";
import { interiorSvg, type SceneExtras } from "./scene/interior";
import { operativeFigure } from "./scene/people";
import { animateEnter, animateLeave, pulse, setTransitions, transitionsSetting } from "./scene/transition";
import { dispatch, type Command } from "../campaign/commands";
import { CARTER, HUB_TIPS, ONBOARDING, advanceOnboarding, currentStep } from "./tutorial";
import { SLOTS as SAVE_SLOTS, activeSlot, clearSlot, slotSummary, type Slot } from "../campaign/save";
import { DIFFICULTIES, type Difficulty, type NewCampaignOptions } from "../campaign/difficulty";
import { BOND_NAMES, FATIGUE, bondsOf, injured, tiredness } from "../campaign/condition";
import { STAFF_EVENTS, answerStaff } from "../campaign/staff";
import { HIST_CATS, type HistCat } from "../campaign/history";
import { FIELDS, FIELD_BONUS, TRADES, syncStaff, type Person, type StaffKind } from "../campaign/people";
import { AGENT, COOP, ETA10, NU7, SPECIALIST, TF_DESC, TF_NAMES, agentsFree, attachNu7, borrow, canAttachNu7, canBorrow, canBringAmnestics, canBringResearcher, canCallNu7, canFormEta10, canHireAgent, canSellWeapons, formEta10, hireAgent, sellWeapons, siteOf, tfOf, type TaskForce } from "../campaign/taskforces";
import { councilSeal, dossierPhoto, gearArt, iconBody, icon, incidentScene, insurgencyMark, siteSeal } from "./icons";
import { ART_DEFS, roomSvg, surfaceSvg } from "./art";
import { CAT_NAMES, INCOME_CATS, SPEND_CATS, monthIndex } from "../campaign/ledger";
import { LEADS, canLeadAction, leadAction, leadPrice, offerText, type Lead, type LeadAction } from "../campaign/leads";
import { AUTO_KINDS, assessTeam, autoKinds, canDispatch, dispatchOdds, dispatchTeam } from "../campaign/autoteam";
import { CONTRACTS, NEEDS, acceptContract, canAcceptContract, contractPool, whoText } from "../campaign/contracts";
import { ambience, playMusic, soundControl, transition, ui, wireSound } from "./audio";
import { DISRUPT_INTEL, INQUIRY, PLANS, goalText, whenText, REVEAL_INTEL, THREAT_STEPS, canDisrupt, canInvestigateBreach, canReveal, disrupt, investigateBreach, reveal } from "../campaign/chaos";
import { parseCampaign } from "../campaign/save";
import type { Report } from "../campaign/reports";
import { WEATHER, type Weather } from "../data/weather";
import { MIN_RANGE } from "../game/perks";
import { AUDIT_BELOW, PARTNERS, PAY_FOR, REQUESTS, answerOffer, canAcceptOffer, canRequest, canSendAway, councilGrant, grantParts, secondInGroup, directiveProgress, directiveText, makeRequest, rewardText, sendAway, tierOf, type RequestId } from "../campaign/council";
import { REFINE_EVERY, canGivePill, canRefine, givePill, pillsLeft, refine, refineRecipes } from "../campaign/objects";
import { PROCEDURES, PROCEDURE_610 } from "../data/procedures";
import { reportOf, TERRITORY, TOWN_POS, localHour, missionWeather, weatherAt, weatherLine, nightAt, nightPolygon, AMNESTIC_TEAM, BURY, FACILITIES_WORLD, FIELD_OPS, INVESTIGATE, buryCost, buryStory, canBury, canSendTeam, incidentName, sendAmnesticsTeam, briefing, canFieldOp, canInvestigate, groupOf, incidentPlace, incidentState, investigate, startFieldOp, type FieldOpKind, type MarkerGroup } from "../campaign/geo";
import { MEDALS } from "../data/bios";
import { LEANS, QUALITY, UNITS, nationalityOf } from "../data/units";
import { ACCESSORIES, COATS, FACES, FACIAL, HAIR_BY_SEX, HAIR_COLORS, HAIR_STYLES, HEADGEAR, LOOK_PARTS, SEX_NAMES, SKIN, fitLook, rollLook } from "../data/looks";
import { portraitSvg } from "./portrait";
import { armoryHtml, barracksHtml, barracksTarget, BARRACKS_ROOM, type QuartersCtx } from "./quarters";
import { leaveToward, wireStage } from "./stage/scene";
import { commandBand, engineeringBand, researchBand } from "./departments";
import { canDrill, chooseBranch, drillSquad, equipStatus, squadStage, type Squad } from "../campaign/org";
import { KITS, SQUAD_BALANCE, TECHS } from "../data/specialties";
import { addSquad, assignToSquad, bindCampaign, canAddSquad, eligibleKit, localizeText, retrainSquad, siteOf19, specUnlock, squadRosterMax, mtfsOf, squadMembers, squadAway, squadOfOp, deployCap, qualifiedFor } from "../campaign/org";
import { MTF_CONFIG, SPECIALTIES, SPECS, type SpecialtyId } from "../data/mtf";
import { INSPECTION, inspectionChecks, inspectionSoon } from "../campaign/inspection";
import {
  UPGRADE, countOperational, damageEffect, engineersBusy, repairOf, GEN_TIERS, canRefitGen, genTierOf, generatorOutput, refitGenerator, canUpgrade, upgradeFacility, RECREATION, canAddRecreation, addRecreation, DEMOLISH, canDemolish, demolish, demolishDays, demolishLeavesShort, ENGINEER_COST, EXCAVATE, FACILITIES, nameInText, GRADE_NAMES, MAX_LEVELS, REPAIR, SLOTS, build, canBuild, canExcavate, canRepair,
  dclassCapacity, engineersFree, excavate, facilityAt, healPerDay, isContainment, monthlyUpkeep, upkeepParts, neighbors, operational,
  powerShort, powerSupply, powerUse, repair, sanityPerDay, type Facility, type FacilityType,
} from "../campaign/base";
import {
  DCLASS_COST, DCLASS_MONTHLY, RANKS, RANK_XP, TRAINER, retire, trainerWhy, RANK_BONUS, RECRUIT_COST, advanceDay, aimOf, blinkFullOf, buyDClass,
  answerWhileAway, NICK_RANK, fieldName, canBuyDClass, canHireEngineer, dayOfMonth, deployable, hireEngineer, maxSanOf, monthOf, monthlyFunding, frontsFunding, canHire, candidateCost, hireCandidate, lookOf, trainersActive,
  INTEL_PER_PRISONER, INTERROGATION_DAYS, interrogationDays, PRISONER_BOUNTY, holdingCapacity, canRetrain, canTherapy, canWeaken, dateText, dateOf, fitAttachment, gunFor, loadAmmo, setWeapon, weaken, weaponOf, weaponOptions, chooseClass, choosePerk, perkChoices, promotionDue, startRetrain, startTherapy,
  pendingBreach, type Campaign, type Incident, type Extras, type Loadout, type Operative,
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
  researcherCapacity, projectCost, researchersFree, startTest, testKey, testScp, testBranch, STUDY_BONUS, offered, projectDays, unlockedItems, type Branch, type ItemId, type TestId,
  canSellStore, sellPrice, sellStore, type StoreKind,
} from "../campaign/research";
import { HOME, LAND, REGIONS, REGION_IDS, SITE19, project, type RegionId } from "../data/regions";
import {
  COLLAPSE_LIMIT, COVER_STORY, CONTACT, LINKS, canContact, contactCost, isContacted, makeContact, coverDoses, locateIntel, amnesticsCapacity, canCoverStory, canLocate, collapsedCount, coverStory, locateCell,
  flightOut, regionFunding, transportName, travelBlock, travelDays,
} from "../campaign/world";
import {
  ALERTS, GUARD, PROMOTE, canHireGuard, canPromote, guardCapacity, guardOdds, guardsAlive, guardsReady, hireGuard, letGuardsHandle, mtfArrival,
  promoteGuard, breachGuards, letGuardsHandleRiot, letGuardsHandleRaid, raidArrivalText, raidOdds, postedAt, postGuard, unposted, TRAINING, canTrain, squadSize, train, type Alert, type Guard,
} from "../campaign/security";
import { HEAVY, type ScpId } from "../game/types";
import { esc, localizeDom } from "./util";

const MAX_DCLASS = 4, MAX_WATCHERS = 2;
type Tab = "command" | "world" | "site" | "research" | "personnel" | "armory" | "history";
/** History tab: the category shown and the incident report opened from it. */
let histCat: HistCat | "all" = "all", openReport: string | null = null;

export interface HubActions {
  save: () => void;
  deploy: (inc: Incident, loadouts: Loadout[], dCount: number, extras: Extras) => void;
  /** The squad flying out has landed. */
  arrive: () => void;
  newCampaign: (opts: NewCampaignOptions, slot: Slot) => void;
  loadSlot: (slot: Slot) => void;
  importCampaign: (c: Campaign) => void;
  menu: () => void;
  newMtf: () => void;
}

const KIND_NAMES = { raid: "Raid", riot: "Riot", outbreak: "SCP-610", breach: "Breach", recovery: "Manhunt", coverup: "Cover-up", strike: "Strike", escort: "Ambush", retaliation: "Retaliation", rescue: "Lost team", emergency: "Site emergency", investigation: "Investigation" } as const;
const KIND_BRIEF = {
  rescue: "Another site's task force has gone quiet out here. Find the survivors, get them to follow you, and bring them out through an exit. The Insurgency is still in the area.",
  emergency: "Another Foundation site has a breach it can't handle. Get the trapped researchers out, recover the records at risk, restore power at the panel, and deal with whatever got loose, as much of it as you can. Leave through the exit when you're done: partial success still counts.",
  raid: "The Chaos Insurgency is attacking Site-19's surface compound to reach the lift down into the site. Site Security holds the wire; Epsilon-11 can come up the lift to help.",
  riot: "The D-Class block is rioting. Only Site Security answers: restrain the rioters or put them down. Every one killed is a D-Class lost.",
  outbreak: "Burn out SCP-610's core with fire. Bring incendiaries or the flamethrower, and containment suits for anyone going near the flesh: anyone infected turns 5 turns later and is lost for good. Each win brings the outbreak down a stage.",
  escort: "The convoy home is under attack. The squad that made the capture has to hold the truck: neutralise the Insurgents or last 8 turns. Wounds carry over.",
  retaliation: "The Insurgency is shooting up a town that helped you. Neutralise them; every civilian killed adds exposure.",
  breach: "SCP-173 is loose in its wing. Get it into the transport container and seal it.",
  recovery: "SCP-173 is loose among civilians. Every death there raises exposure. Get it into the truck's container and seal it.",
  coverup: "Witnesses need amnestics before they talk. Dose each one; anyone who reaches the edge of the map undosed adds exposure.",
  strike: "Raid the Insurgency cell's warehouse and neutralise everyone inside. Wounded Insurgents can be taken prisoner.",
  investigation: "Something happened here and nobody knows what. Search the scene: examine evidence now, or bag it unseen for the labs. Question the locals, and get out. Bring people who can carry bodies out, and keep your eyes down around anything you don't understand.",
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
/** Research tabs: anomalies, weapons and armor together, gear, facilities, personnel, the Insurgency. */
type ResearchCat = "anomalies" | "arms" | "gear" | "facilities" | "personnel" | "insurgency";
const RESEARCH_CATS: ResearchCat[] = ["anomalies", "arms", "gear", "facilities", "personnel", "insurgency"];
const RESEARCH_ICON: Record<ResearchCat, string> = { anomalies: "anomaly", arms: "weapon", gear: "gear", facilities: "build", personnel: "personnel", insurgency: "insurgency" };
const HIST_ICON: Record<HistCat, string> = { deployment: "escort", breach: "breach", anomaly: "anomaly", casualty: "death", personnel: "promotion", council: "council", insurgency: "insurgency", region: "front" };
const RESEARCH_CAT_NAMES: Record<ResearchCat, string> = { anomalies: "Anomalies", arms: "Weapons and armor", gear: "Gear", facilities: "Facilities and power", personnel: "Personnel", insurgency: "Insurgency" };
const ARMOR_PROJECTS = ["padded_jacket", "nylon_liner", "plated_undersuit", "powered_harness"];
/** What stands on the lab's bench for a project: armour on a stand for armour and uniforms, a rifle in a vise for
 *  weapons and attachments, field kit for equipment, a blueprint for the site, a chart for personnel, papers for the
 *  Insurgency, a specimen jar for the anomalies. */
function apparatusOf(id: string): string {
  const p = PROJECTS[id];
  if (p.armorTier || ARMOR_PROJECTS.includes(id) || (p.unlocks && ITEMS[p.unlocks].armor) || UNIFORMS.some(u => u.id === id)) return "armor";
  if (p.branch === "Weapons" || p.weaponTier || p.ammo || p.attachment) return "arms";
  const k = researchCat(id);
  return k === "facilities" ? "site" : k === "anomalies" ? "anomaly" : k;
}
function researchCat(id: string): ResearchCat {
  const p = PROJECTS[id];
  if (p.branch.startsWith("SCP-") || p.branch === "Objects") return "anomalies";
  if (p.branch === "Weapons" || p.armorTier || p.weaponTier || p.ammo || p.attachment || ARMOR_PROJECTS.includes(id) || (p.unlocks && ITEMS[p.unlocks].armor)) return "arms";
  if (p.branch === "Site") return "facilities";
  if (p.branch === "Personnel") return "personnel";
  if (p.branch === "Insurgency") return "insurgency";
  return "gear";
}

const clickSounds = new WeakSet<HTMLElement>();
/** The funds of the campaign on screen, for the cost preview. */
let fundsNow = () => 0;
/** The World Map's coastline path, built once. */
let landD: string | null = null;
/** Facility names short enough for a slot in the cross-section. */
const SHORT_NAME: Partial<Record<FacilityType, string>> = { cont_safe: "Safe wing", cont_euclid: "Euclid wing", cont_keter: "Keter wing", psych: "Psych services", security: "Security", barracks: "D-Class barracks", training: "Range" };
/** One header readout: a small label over a value, coloured only when it matters. */
const ro = (k: string, v: string, tone: string, title: string) => `<div class="ro ${tone}" title="${esc(title)}"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
export function mountHub(root: HTMLElement, c: Campaign, act: HubActions) {
  let planning: string | null = null;
  const chosen = new Set<string>();
  /** The research category tab open. */
  let resCat: ResearchCat = "anomalies", resCatPicked = false;
  /** The equipment slot open on the personnel file. */
  let eqSlot: string | null = null;
  /** Two-step confirmation inside the page (the claude.ai viewer blocks the browser's own confirm boxes): the first
   *  click turns the button into a warning, a second click within four seconds goes ahead. */
  let armedKey = "", armedTimer = 0;
  const twice = (b: HTMLElement, key: string, warning: string) => {
    if (armedKey === key) { armedKey = ""; clearTimeout(armedTimer); return true; }
    armedKey = key; clearTimeout(armedTimer);
    const before = b.textContent; b.textContent = warning; b.classList.add("armed");
    armedTimer = window.setTimeout(() => { if (armedKey === key) { armedKey = ""; b.textContent = before; b.classList.remove("armed"); } }, 4000);
    return false;
  };
  /** The campaigns menu, when open. */
  let dlg: null | { view: "slots" } | { view: "new"; slot: Slot; difficulty: Difficulty; ironman: boolean; tutorial: boolean } = null;
  /** Which task force is being sent, and the support people and units going with it. */
  let tfPick: TaskForce = "e11";
  /** Phase 5: the squad answering the incident being planned. */
  let squadPick: string | null = null;
  const extras: Extras = {};
  const watchers = new Set<string>();
  const gear = new Map<string, { armor: ItemId | ""; items: (ItemId | "")[] }>();
  let flashMsg = "";
  let opSel: string | null = null;
  let lookOpen = false;
  /** Which page of the personnel file is open, and which wall archive in the barracks. */
  let dosTab = "record";
  let archive: string | null = null;
  let lastDrawn = "";
  /** Point the barracks camera at the selected operative on the next draw (not after a drag). */
  let reframe = true;   // keep the appearance editor open while clicking through parts
  let dCount = 2;
  let sel: { level: number; slot: number } | null = null;
  // Presentation overhaul P2: the room the Director is standing in (a facility id or a fixed surface location), and
  // where the overview was scrolled to on the way in
  let room: string | null = null, roomScroll = 0;
  // Environment-first interface: the object selected in the room (its panel is open), whether that panel is widened,
  // which lab the Research tab stands in, and the room to go back to after following a link into another
  let target: string | null = null, ctxWide = false, labPick: string | null = null, prevRoom: { tab: Tab; id: string } | null = null;
  type OpSection = "appearance" | "loadout" | "abilities" | "record" | "bio";
  let opSection: OpSection = "appearance";
  // Presentation overhaul P4: the operative whose weapon is on the armory bench, the mount selected, the attachment
  // being previewed (not yet fitted), and how close the bench view is
  // P5: the project on the lab's chalkboard, and the research completion to stamp on it
  let resFocus: string | null = null, doneSeen = c.research.done.length, justDone: string | null = null;
  let armOp: string | null = null, armMount: MountId | null = null, armPreview: AttachmentId | "" | null = null, armZoom = 1;
  let creditsOpen = false;
  let resetArmed = 0;
  let regionSel: RegionId = pendingMapSel?.startsWith("reg:") ? pendingMapSel.slice(4) as RegionId : HOME;
  /** What's selected on the World Map ("inc:<id>" or "fac:<id>"), and which kinds of marker are shown. */
  let mapSel: string | null = pendingMapSel?.startsWith("reg:") ? "region" : pendingMapSel; pendingMapSel = null;
  const WX_ICON: Record<Weather, string> = { clear: "", rain: "☂", storm: "⚡", fog: "≋", snow: "❄" };
const mapShow = new Set<string>(["anomaly", "insurgency", "coverup", "site", "lead", "facility", "night", "weather"]);
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
  const clockBlocked = () => { answerWhileAway(c); return !!c.over || !!pendingBreach(c) || !!c.notices?.length; };
  const setSpeed = (n: number) => { if (n > 0 && tab !== "world") { render(); return; } if (!(n > 0 && clockBlocked())) { speed = n; if (n) lastSpeed = n; } render(); };

  const ready = () => c.roster.filter(o => deployable(c, o));
  // an ambushed convoy is defended by whoever made the capture, wounded or not
  // a squad is one task force: with Eta-10 formed, the panel picks which one goes
  const readyFor = (inc: Incident) => inc.kind === "escort" && inc.squad ? c.roster.filter(o => o.alive && inc.squad!.includes(o.id))
    : c.mtfs ? ready().filter(o => o.squad && o.squad === (squadPick ?? defaultSquad()))
    : c.tf.eta10 ? ready().filter(o => tfOf(o) === tfPick) : ready();
  /** The squad offered first: the one at home with the most people fit to go. */
  const defaultSquad = () => mtfsOf(c).flatMap(m => m.squads).filter(sq => !squadAway(c, sq.id)).sort((a, b) => ready().filter(o => o.squad === b.id).length - ready().filter(o => o.squad === a.id).length)[0]?.id ?? null;
  const watchPool = () => guardsReady(c);
  const scp173 = () => c.scps.find(s => s.id === "173")!;

  // sounds for what changed since the last render: news on the board, a new month, an alarm at Site-19
  let heard = { notices: c.notices?.length ?? 0, month: dateOf(c.day).getUTCMonth(), alarm: pendingBreach(c)?.id ?? "" };
  function hubSounds() {
    const n = c.notices?.length ?? 0, m = dateOf(c.day).getUTCMonth(), b = pendingBreach(c);
    if (b && b.id !== heard.alarm && b.kind !== "escort") transition.breach();
    else if (m !== heard.month) ui.month();
    else if (n > heard.notices) ui.notice();
    heard = { notices: n, month: m, alarm: b?.id ?? "" };
    playMusic(b ? "tense" : tab === "site" ? "site" : "world"); ambience(null);
  }
  fundsNow = () => c.funds;
  if (!clickSounds.has(root)) {
    // Phase 4E cost preview: a button that spends money shows what would be left
    const tip = document.createElement("div"); tip.className = "costtip"; tip.hidden = true; document.body.appendChild(tip);
    const show = (e: Event) => {
      const b = (e.target as HTMLElement).closest?.("button.act, label.act") as HTMLButtonElement | null;
      const m = b && !b.disabled ? /(?:^|[^+])\$(\d+)k/.exec(b.textContent ?? "") : null;
      if (!b || !m) { tip.hidden = true; return; }
      const left = fundsNow() - Number(m[1]), r = b.getBoundingClientRect();
      tip.textContent = `Leaves $${left}k`; tip.classList.toggle("neg", left < 0); tip.hidden = false;
      tip.style.left = `${Math.round(r.left + window.scrollX)}px`; tip.style.top = `${Math.round(r.bottom + window.scrollY + 4)}px`;
    };
    root.addEventListener("mouseover", show); root.addEventListener("focusin", show);
    root.addEventListener("mouseout", () => { tip.hidden = true; }); root.addEventListener("focusout", () => { tip.hidden = true; });
    root.addEventListener("click", () => { tip.hidden = true; }, true);
  }
  if (!clickSounds.has(root)) { clickSounds.add(root); root.addEventListener("click", e => { const t = (e.target as HTMLElement).closest?.("button,summary,label.act"); if (!t) return; if (t.matches(".tab")) ui.tab(); else if ((t as HTMLButtonElement).disabled) ui.deny(); else ui.click(); }); }

  /** Into a room: the destination renders at once, then the stage opens out of the slot it came from. */
  function enterRoom(id: string, from: DOMRect | null) {
    if (!roomLayout(c, id)) return;
    // following a link from one room into another remembers the way back
    const here = inRoomScreen() ? currentRoom() : null;
    prevRoom = here && here !== id ? { tab, id: here } : null;
    if (!here) roomScroll = window.scrollY;
    room = id; tab = "site"; speed = 0; target = null;
    if (c.base.facilities.find(x => x.id === id)?.type === "lab") labPick = id;
    const f = c.base.facilities.find(x => x.id === id);
    if (f) sel = { level: f.level, slot: f.slot };
    render();
    window.scrollTo({ top: 0 });
    animateEnter(root.querySelector<HTMLElement>(".rv-stage"), root.querySelector<HTMLElement>(".rv-ctx"), from);
  }
  /** Back to Site-19: the overview renders at once, where it was, and the room closes into its slot. */
  function leaveRoom() {
    const id = currentRoom();
    if (!id) return;
    const stage = root.querySelector<HTMLElement>(".rv-stage"), snap = stage?.innerHTML ?? null, from = stage?.getBoundingClientRect() ?? null;
    room = null; tab = "site"; target = null; prevRoom = null;
    const lf = c.base.facilities.find(x => x.id === id);
    if (lf) sel = { level: lf.level, slot: lf.slot };
    render();
    window.scrollTo({ top: roomScroll });
    const f = c.base.facilities.find(x => x.id === id);
    const dest = f ? root.querySelector(`[data-slot="${f.level},${f.slot}"]`) : root.querySelector(`[data-enter="${id}"]`);
    animateLeave(snap, from, dest?.getBoundingClientRect() ?? null);
    pulse(dest);
  }
  /** Straight to the next room along: no overview in between. */
  function stepRoom(id: string) {
    if (!roomLayout(c, id)) return;
    room = id; tab = "site"; target = null; prevRoom = null;
    const f = c.base.facilities.find(x => x.id === id);
    sel = f ? { level: f.level, slot: f.slot } : null;
    render();
  }

  function wireStages() {
    const st = root.querySelector<HTMLElement>("[data-stage=barracks]");
    if (st) { const o = c.roster.find(x => x.id === opSel && x.alive && !x.busy); wireStage(st, "barracks", barracksTarget(c, o ? o.id : null), { yaw: 34, minDist: -420, maxDist: 1300 }, reframe); reframe = false; }
    const arm = root.querySelector<HTMLElement>("[data-stage=armory]");
    if (arm && !opSel) opSel = c.roster.find(x => x.alive)?.id ?? null;
  }
  function render() {
    advanceOnboarding(c);   // Strategic overhaul E2: steps whose goal is met close themselves
    if (planning && !c.incidents.some(i => i.id === planning)) planning = null;
    { const pl = c.incidents.find(i => i.id === planning); for (const id of [...chosen]) if (!(pl ? readyFor(pl) : ready()).some(o => o.id === id)) chosen.delete(id); }
    for (const id of [...watchers]) if (!watchPool().some(o => o.id === id)) watchers.delete(id);
    dCount = Math.max(0, Math.min(dCount, c.dclass, MAX_DCLASS));
    const pw = powerShort(c);

    root.innerHTML = `${ART_DEFS}
<main class="wrap hub">
  <header class="top">
    <div class="brand">${siteSeal(48)}<div>
      <div class="eyebrow">SCP Foundation · Site-19 Command${c.debug ? `<span class="debugtag" title="This campaign has been changed with the debug menu.">DEBUG SAVE</span>` : ""}</div>
      <h1>Site-19 <small>${dateText(c.day)} · <span id="clockHour">${hourText()}</span> · ${speed ? `${speed}×` : "paused"}</small></h1>
    </div></div>
    <div class="readouts" role="group" aria-label="Site-19 resources">
      ${ro("Funds", `$${c.funds}k`, c.funds < 0 ? "danger" : c.funds < monthlyUpkeep(c) ? "caution" : "", "Money in hand. The Finances panel on Command has what comes in and goes out each month.")}
      ${ro("Standing", `${c.council.standing}`, c.council.standing < AUDIT_BELOW ? "danger" : c.council.standing < 40 ? "caution" : "", `Standing with the O5 Council: ${tierOf(c.council.standing).name}. It sets the monthly grant ($${councilGrant(c)}k now).`)}
      ${ro("Exposure", `${c.exposure}${collapsedCount(c) ? ` · ${collapsedCount(c)} lost` : ""}`, c.exposure >= 60 || collapsedCount(c) ? "danger" : c.exposure >= 35 ? "caution" : "", "How much of the anomalous the public has seen. Cover-ups and amnestics bring it down.")}
      ${ro("Power", `${powerUse(c)}/${powerSupply(c)}`, pw ? "danger" : "", "Power used out of power supplied. Short of power, wings breach more often.")}
      ${ro("Research", `${researchersFree(c)}/${c.researchers}`, c.researchers && researchersFree(c) > 0 ? "caution" : "", "Researchers free (not on a project) / on staff.")}
      ${ro("Engineers", engineersFree(c) < 0 ? `${c.engineers} · short ${-engineersFree(c)}` : `${engineersFree(c)}/${c.engineers}`, engineersFree(c) < 0 ? "danger" : c.engineers && engineersFree(c) <= 0 ? "caution" : "", "Engineers free / on staff. Busy ones are building, repairing, digging or on workshop orders.")}
      ${ro("Guards", `${guardsAlive(c).length}/${guardCapacity(c)}${unposted(c).length ? ` · ${unposted(c).length} unposted` : ""}`, "", "Guards alive / posts at working Security stations.")}
      ${ro("D-Class", `${c.dclass}/${dclassCapacity(c)}`, "", "D-Class held / beds.")}
      ${ro("Intel", `${c.intel}`, "", "Intelligence on the Insurgency, spent on locating and weakening cells.")}
      ${ro("Amnestics", `${c.amnestics}/${amnesticsCapacity(c)}`, "", "Class-A amnestics in stock / storage.")}
    </div>
    <details class="sysmenu"><summary class="act">System${c.ironman ? " · Ironman" : ""}</summary><div class="menu">
      <button class="act" id="menuBtn" type="button" title="Back to the title screen (the campaign is saved)">Main menu</button>
      <button class="act" id="campaignsBtn" type="button">Campaigns</button>
      <button class="act" id="exportBtn" type="button" title="Download this campaign as a file, to keep or move to another browser">Export save</button>
      ${c.ironman ? `<span class="act disabled" title="Ironman: this campaign can't be replaced by loading a save over it.">Import save</span>` : `<label class="act" for="importFile" title="Load a campaign from an exported file. It replaces the current one.">Import save</label>`}
      <input type="file" id="importFile" accept=".json,application/json" hidden>
      <button class="act" id="creditsBtn" type="button">Credits and licences</button>
      <button class="act" id="fxToggle" type="button" aria-pressed="${transitionsSetting()}">Room transitions: ${transitionsSetting() ? "on" : "off"}</button>
      ${soundControl()}
    </div></details>
  </header>
  <nav class="tabs" aria-label="Site-19 sections">
    ${tabBtn("command", "Command", directorsBriefing(c).filter(b => b.sev !== "routine").length, directorsBriefing(c).some(b => b.sev === "critical"))}
    ${tabBtn("world", "World")}
    ${tabBtn("site", "Site-19")}
    ${tabBtn("research", "Research", researchersFree(c) > 0 && c.researchers ? researchersFree(c) : 0)}
    ${tabBtn("personnel", "Barracks")}
    ${tabBtn("armory", "Armory")}
    ${tabBtn("history", "History")}
  </nav>
  ${flashMsg ? `<p class="warn-box" role="status">${esc(flashMsg)}</p>` : ""}
  ${coachCard()}
  ${tab === "world" ? worldTab() : tab === "history" ? historyTab() : tab === "site" ? (room ? roomView(room) : engineeringBand(c) + siteTab())
    : tab === "research" ? researchBand(c) + researchScreen() : tab === "command" ? commandBand(c) + commandTab() : personnelTab()}${tab === "personnel" || tab === "armory" ? "" : (lastDrawn = "", "")}
  ${creditsOpen ? `<div class="overlay fixed"><div class="sheet" role="dialog" aria-label="Credits">${creditsHtml()}<div class="row"><button class="act primary" type="button" id="creditsClose">Close</button></div></div></div>` : ""}
  ${!c.over && c.notices?.length ? `<div class="overlay fixed"><div class="sheet notice" role="dialog" aria-label="Time paused">
    <div class="label">${dateText(c.day)} · time paused</div>
    <ul class="debrief">${c.notices.slice(0, 8).map(n => `<li class="${n.kind}">${esc(n.text)}</li>`).join("")}${c.notices.length > 8 ? `<li>…and ${c.notices.length - 8} more in the site log.</li>` : ""}</ul>
    <div class="row"><button class="act primary" type="button" id="noticeGo">Go to it</button><button class="act" type="button" id="noticeOk">Continue</button></div>
  </div></div>` : ""}
  ${dlg ? campaignsDialog() : ""}
  ${c.over ? `<div class="overlay fixed"><div class="sheet">
    <div class="stampmark lose">Command relieved</div>
    <h3>Site-19 has fallen.</h3>
    <p style="margin:0">${esc(c.over)}</p>
    <p style="margin:0">Held out ${c.day} days · ${c.stats.won} recontainments · ${c.roster.filter(o => !o.alive).length} operatives lost.</p>
    <button class="act primary" type="button" id="overBtn">Start a new campaign</button>
  </div></div>` : ""}
</main>`;
    bindCampaign(c); localizeDom(root, localizeText);
    bind(); wireSound(root); hubSounds(); wireStages();
  }

  const nightPoints = () => nightPointsOf(c);
  /** The World Map's scale when it was last drawn, so planes can be redrawn between renders. */
  let lastK = 1;
  /** Planes in the air: squads flying out to an incident and home again, placed by the clock (hours included), so
   *  they move along their route while time runs. */
  function flightMarkup(k: number) {
    const [sx, sy] = project(siteOf19(c).lon, siteOf19(c).lat), now = c.day + (c.hour ?? 0) / 24;
    const plane = (ax: number, ay: number, bx: number, by: number, f: number, cls: string, title: string) => {
      f = Math.max(0, Math.min(1, f));
      const z = cls === "out" ? 1.7 : 1;   // the squad on its way out is the one to watch
      const px = ax + (bx - ax) * f, py = ay + (by - ay) * f, ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
      return `<g class="flight ${cls}"><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" style="stroke-width:${0.4 * k};stroke-dasharray:${1 * k} ${1.5 * k}"/><g transform="translate(${px} ${py}) rotate(${ang}) scale(${0.55 * k * z})" class="plane"><path d="M5 0 Q4.6 -.7 3.5 -.8 L.8 -.8 L-.6 -5.5 L-1.8 -5.5 L-1 -.8 L-3.8 -.7 L-4.6 -2.2 L-5.4 -2.2 L-5 0 L-5.4 2.2 L-4.6 2.2 L-3.8 .7 L-1 .8 L-1.8 5.5 L-.6 5.5 L.8 .8 L3.5 .8 Q4.6 .7 5 0Z"/></g><title>${esc(title)}</title></g>`;
    };
    const out = c.outbound ? (() => { const o = c.outbound!, inc = c.incidents.find(i => i.id === o.incId); if (!inc) return "";
      const pl = incidentPlace(inc), [bx, by] = project(pl.lon, pl.lat);
      return plane(sx, sy, bx, by, (now - o.depart) / (o.arrive - o.depart), "out", `${o.tf} flying out to ${pl.name}: lands ${dateText(Math.floor(o.arrive))}`); })() : "";
    const home = [...new Set(c.roster.filter(o => o.alive && o.busy?.kind === "travel" && o.busy.from && !o.busy.out).map(o => o.busy!.from!))].map(r => {
      const o = c.roster.find(x => x.alive && x.busy?.kind === "travel" && x.busy.from === r && !x.busy.out)!, total = o.busy!.total ?? o.busy!.daysLeft + 1;
      const [ax, ay] = project(REGIONS[r].lon, REGIONS[r].lat), done = total - o.busy!.daysLeft + (c.hour ?? 0) / 24;
      return plane(ax, ay, sx, sy, done / (total + 1), "home", `Flying home from ${REGIONS[r].name}: back ${dateText(c.day + o.busy!.daysLeft)}`); }).join("");
    return out + home;
  }
  /** The tutorial's tip for this screen, if there's one not yet seen. */
  function coachCard() {
    const t = c.tutorial;
    if (!t?.on) return "";
    const where = tab === "world" && planning ? "plan" : tab;
    // Strategic overhaul E2: the Chief of Operations' onboarding, one step at a time; on another tab, a pointer to it
    const step = where === "plan" ? null : currentStep(c);
    if (step) {
      const tabName: Record<string, string> = { command: "Command", world: "World", site: "Site-19", research: "Research", personnel: "Personnel" };
      const n = ONBOARDING.indexOf(step) + 1;
      if (step.tab !== tab) return `<div class="carter compact" role="note">${portraitSvg(rollLook("krista-carter", "f"), undefined, 32)}<span><b>${esc(CARTER.name)}</b>: next, ${esc(step.title.toLowerCase())} (${tabName[step.tab] ?? step.tab}).</span>
        <button class="act" type="button" data-goto="${step.tab}">Go</button><button class="act" type="button" id="coachOff">Skip the briefings</button></div>`;
      return `<div class="carter" role="note">${portraitSvg(rollLook("krista-carter", "f"), undefined, 64)}
        <div><div class="label">${esc(CARTER.name)} · ${esc(CARTER.title)} · ${n} of ${ONBOARDING.length}</div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p>
        ${step.goal ? `<p class="goal">Goal: ${esc(step.goal)}</p>` : ""}
        <div class="row"><button class="act ${step.goal ? "" : "primary"}" type="button" data-coach="${step.id}">${step.goal ? "Skip this step" : "Got it"}</button><button class="act" type="button" id="coachOff">Skip the briefings</button></div></div></div>`;
    }
    const tip = HUB_TIPS.find(x => x.tab === where && x.tab === "plan" && !t.seen.includes(x.id));
    if (!tip) return "";
    return `<div class="card coach" role="note"><div class="label">Tutorial · ${esc(tip.title)}</div><p>${esc(tip.text)}</p>
      <div class="row"><button class="act primary" type="button" data-coach="${tip.id}">Got it</button><button class="act" type="button" id="coachOff">Turn the tutorial off</button></div></div>`;
  }

  /** The campaigns menu: three save slots, and the form for starting a new campaign in one. */
  function campaignsDialog() {
    if (!dlg) return "";
    const cur = activeSlot();
    if (dlg.view === "slots") return `<div class="overlay fixed"><div class="sheet campaigns" role="dialog" aria-label="Campaigns">
      <div class="label">Campaigns · three save slots in this browser</div>
      ${SAVE_SLOTS.map(s => { const sum = s === cur ? { day: c.day, funds: c.funds, won: c.stats.won, difficulty: c.difficulty, ironman: c.ironman, over: c.over } : slotSummary(s);
        return `<div class="slotrow ${s === cur ? "on" : ""}"><b>Slot ${s}${s === cur ? " · playing" : ""}</b>
          <span class="muted">${sum ? `${dateText(sum.day)} · $${sum.funds}k · ${plural(sum.won, "mission")} won · ${esc(DIFFICULTIES[(sum.difficulty ?? "agent") as Difficulty].name)}${sum.ironman ? " · Ironman" : ""}${sum.over ? " · ended" : ""}` : "Empty"}</span>
          <span class="row">${sum && s !== cur ? `<button class="act" type="button" data-slotload="${s}">Load</button>` : ""}
          <button class="act" type="button" data-slotnew="${s}">New campaign here</button>
          ${sum && s !== cur ? `<button class="act" type="button" data-slotdel="${s}">Delete</button>` : ""}</span></div>`; }).join("")}
      <p class="muted">Everything saves as you play. Export a save to keep a copy outside this browser.</p>
      <div class="row"><button class="act" type="button" id="dlgClose">Close</button></div></div></div>`;
    const d = DIFFICULTIES[dlg.difficulty];
    return `<div class="overlay fixed"><div class="sheet campaigns" role="dialog" aria-label="New campaign">
      <div class="label">New campaign · slot ${dlg.slot}${slotSummary(dlg.slot) || dlg.slot === cur ? ` · <span class="warn">replaces the campaign there</span>` : ""}</div>
      <div class="row">${(Object.keys(DIFFICULTIES) as Difficulty[]).map(k => `<label class="armorpick"><input type="radio" name="diff" value="${k}" data-diff ${dlg!.view === "new" && dlg!.difficulty === k ? "checked" : ""}> ${esc(DIFFICULTIES[k].name)}</label>`).join("")}</div>
      <p class="muted">${esc(d.desc)} Starting funds $${400 + d.funds}k; Council grant ${d.grant >= 0 ? "+" : ""}${d.grant}k a month; ${d.insurgents >= 0 ? "+" : ""}${d.insurgents} Insurgent per fight${d.aim ? `, ${d.aim > 0 ? "+" : ""}${d.aim} enemy aim` : ""}; breaches ×${d.breach}; Insurgency agenda ×${d.agenda}.</p>
      <label class="armorpick"><input type="checkbox" id="dlgIron" ${dlg.ironman ? "checked" : ""}> Ironman: no importing a save over this campaign. Every decision stands.</label>
      <label class="armorpick"><input type="checkbox" id="dlgTut" ${dlg.tutorial ? "checked" : ""}> Tutorial: short guidance on the World Map and in the first mission.</label>
      <div class="row"><button class="act primary" type="button" id="dlgStart">Start</button><button class="act" type="button" id="dlgClose">Cancel</button></div></div></div>`;
  }

  const tabBtn = (t: Tab, label: string, count = 0, urgent = false) => `<button type="button" class="tab ${tab === t ? "on" : ""}" data-tab="${t}" aria-pressed="${tab === t}">${icon(t, 15)}${label}${count ? `<span class="cnt ${urgent ? "danger" : ""}">${count}</span>` : ""}</button>`;

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
        <div class="row histcats"><button class="act ${histCat === "all" ? "on" : ""}" type="button" data-hcat="all">All</button>${(Object.keys(HIST_CATS) as HistCat[]).filter(count).map(k => `<button class="act ${histCat === k ? "on" : ""}" type="button" data-hcat="${k}">${icon(HIST_ICON[k], 13)}${HIST_CATS[k]} · ${count(k)}</button>`).join("")}</div>
        <ul class="history">${shown.map(h => { const alive = h.op && c.roster.some(o => o.id === h.op && o.alive);
          return `<li data-htext="${esc(`${dateText(h.day)} ${h.text}`.toLowerCase())}"><span class="hday">${dateText(h.day)}</span><span class="flag">${icon(HIST_ICON[h.cat], 12)}${HIST_CATS[h.cat]}</span> ${esc(h.text)}
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
    return `<div class="card council"><div class="emblemwrap">${councilSeal(56)}</div>
      <div class="label">O5 Council · standing ${k.standing} · ${esc(t.name)}${k.audit ? ` · <span class="warn">audit ${dateText(c.inspectionDay!)}</span>` : ""}</div>
      <div class="exposure"><div class="exp-bar standing"><span style="width:${k.standing}%"></span></div><b>${k.standing} / 100</b></div>
      <p class="muted">${esc(t.desc)} The Council grants $${councilGrant(c)}k a month: more with standing, with each anomaly held and with each year of service (the Finances card has the breakdown). The fronts add $${frontsFunding(c)}k. Below ${AUDIT_BELOW} it sends an auditor.</p>
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
      <div class="label" style="margin-top:10px">Task forces</div>
      ${(() => { const ew = canFormEta10(c), nw = canAttachNu7(c);
        return `${c.tf.eta10 ? `<p class="muted">MTF Eta-10 "See No Evil": ${c.roster.filter(o => o.alive && tfOf(o) === "eta10").length} operatives on its roster (Personnel tab). Hire into it from the recruit pool.</p>` : `<div class="row"><button class="act" type="button" id="eta10Btn" ${ew ? `disabled title="${esc(ew)}"` : ""}>Form MTF Eta-10 "See No Evil" · $${ETA10.cost}k</button><span class="muted">${esc(ew ?? `A second task force with its own roster. ${TF_DESC.eta10}`)}</span></div>`}
        ${c.tf.nu7 ? `<p class="muted">MTF Nu-7 "Hammer Down" is on call for raids and Keter-class breaches ($${NU7.call}k a call, from the deploy panel).</p>` : `<div class="row"><button class="act" type="button" id="nu7Btn" ${nw ? `disabled title="${esc(nw)}"` : ""}>Put MTF Nu-7 "Hammer Down" on call · $${NU7.cost}k</button><span class="muted">${esc(nw ?? "Heavy troopers who join the fight against raids and Keter-class breaches.")}</span></div>`}`; })()}
    </div>`;
  }

  /** The Chaos Insurgency: its agenda, this month's operations, its commander, and the questions breaches leave. */
  function chaosCard() {
    const k = c.chaos, next = THREAT_STEPS.find(s => s.at > k.threat);
    return `<div class="card chaos"><div class="emblemwrap">${insurgencyMark(56)}</div>
      <div class="label">The Chaos Insurgency · agenda ${k.threat} / 100</div>
      <div class="exposure"><div class="exp-bar threat">${THREAT_STEPS.map(s => `<i style="left:${s.at}%"></i>`).join("")}<span style="width:${k.threat}%"></span></div><b>${k.threat}</b></div>
      <p class="muted">One organization working one agenda worldwide. Cells left alone, operations carried out and commanders who get away push it on; broken cells, disrupted operations and captured leaders set it back.${next ? ` At ${next.at}: ${esc(next.text)}.` : ""}</p>
      ${k.history.length ? `<details class="archived"><summary>Why it moved</summary><ul class="why">${k.history.slice(0, 12).map(h => `<li class="${h.n > 0 ? "warn" : ""}">${h.n > 0 ? "+" : ""}${h.n} · ${esc(h.why)} <span class="muted">(${dateText(h.day)})</span></li>`).join("")}</ul></details>` : ""}
      <div class="label" style="margin-top:10px">Operations this month</div>
      ${k.plans.length ? `<ul class="orders">${k.plans.map(p => { const d = PLANS[p.kind], cell = p.cell && c.incidents.find(i => i.id === p.cell);
        if (!p.known) { const w = canReveal(c, p); return `<li><b>Unidentified operation</b>, ${whenText(c, p)} <span class="muted">· aimed at ${esc(REGIONS[p.region].name)}? Field work there would uncover it.</span>
          <button class="act" type="button" data-reveal="${p.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Identify · ${REVEAL_INTEL} Intel</button></li>`; }
        const w = canDisrupt(c, p);
        return `<li><b>${esc(d.name)}</b>${p.locked ? ` <span class="flag bad">Going ahead</span>` : ""}: ${esc(goalText(p.kind))}, ${whenText(c, p)} <span class="muted">· ${esc(d.desc(p.region))}</span>${p.why ? `<br><span class="muted">Analysts' read: they chose it because of ${esc(p.why)}.</span>` : ""}
          ${cell ? `<button class="linkbtn" type="button" data-mapinc="${cell.id}">${cell.group ? "Strike its cell (one of three: answering one closes the others)" : cell.answered ? "Its cell: Epsilon-11 is committed" : "Strike its cell"}</button>` : ""}
          ${p.locked ? "" : `<button class="act" type="button" data-disrupt="${p.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Disrupt · ${DISRUPT_INTEL} Intel</button>`}</li>`; }).join("")}</ul>` : `<p class="muted">Nothing known. New operations are picked up on the first of the month.</p>`}
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

  /** Phase 4E: where the money comes from and goes, and when the next Council payment lands. */
  /** Strategic overhaul D3: the scheduled money over the next 90 days, and where the balance is heading. */
  function upcomingHtml() {
    const obs = obligations(c, 90), pr = projection(c, 90);
    const max = Math.max(1, c.funds, ...pr.points.map(p => Math.abs(p.funds)));
    return `<div class="upcoming">
      <div class="label">Next 90 days · scheduled</div>
      <div class="rows">${[...new Set(obs.map(o => o.day))].map(day => {
        // one row per date: a settlement's grant, fronts and upkeep together, with the parts underneath
        const xs = obs.filter(o => o.day === day), n = xs.reduce((a, o) => a + o.n, 0), settle = xs.some(o => o.kind === "upkeep");
        const sign = (k: number) => `${k > 0 ? "+" : k < 0 ? "−" : ""}$${Math.abs(k)}k`;
        return `<div class="r"><span><span class="hday">${dateText(day)}</span> ${settle ? "Monthly settlement" : esc(xs.map(o => o.what).join("; "))}</span><span class="v ${n > 0 ? "ok" : n < 0 ? "neg" : ""}">${sign(n)}</span>
          ${settle ? `<span class="sub">${xs.map(o => `${esc(o.what.replace(/^\w+ /, ""))} ${sign(o.n)}`).join(" · ")}</span>` : ""}</div>`; }).join("")}</div>
      <div class="balbars" aria-label="Projected balance">${[{ day: c.day, funds: c.funds }, ...pr.points].map(p => `<div class="pt ${p.funds < 0 ? "neg" : ""}" title="${dateText(p.day)}: $${p.funds}k"><b>$${p.funds}k</b><div class="bar"><span style="height:${Math.max(3, Math.abs(p.funds) / max * 100)}%"></span></div><em>${p.day === c.day ? "now" : dateText(p.day).split(" ").slice(0, 2).join(" ")}</em></div>`).join("")}</div>
      <p class="${pr.debtDay !== undefined ? "warn" : "muted"}">${pr.debtDay !== undefined ? `On scheduled money alone, Site-19 is in debt by ${dateText(pr.debtDay)}, and nothing can be paid for while in debt.` : `On scheduled money alone the balance stays above zero for 90 days.`} Incidents, purchases and rewards are not in this forecast.</p>
    </div>`;
  }

  function financesCard() {
    const gp = grantParts(c), up = upkeepParts(c), fronts = frontsFunding(c), upkeep = monthlyUpkeep(c), net = gp.total + fronts - upkeep;
    const next = dateOf(c.day); next.setUTCMonth(next.getUTCMonth() + 1, 1);
    const days = Math.round((next.getTime() - dateOf(c.day).getTime()) / 86400000);
    const l = c.ledger, m = monthIndex(c.day), prev = !l ? {} : l.month === m ? l.prev : l.month === m - 1 ? l.cur : {};
    const row = (label: string, n: number, cls = "") => n ? `<li class="${cls}"><span>${esc(label)}</span><b>${n > 0 ? "+" : "−"}$${Math.abs(n)}k</b></li>` : "";
    const why: string[] = [];
    if (c.lastGrant) {
      const g0 = c.lastGrant;
      if (gp.standing !== g0.standing) why.push(`standing ${g0.standingNow} → ${c.council.standing} (${gp.standing > g0.standing ? "+" : "−"}$${Math.abs(gp.standing - g0.standing)}k)`);
      if (gp.anomalies !== g0.anomalies) why.push(`anomalies held ${g0.held} → ${gp.held} (${gp.anomalies > g0.anomalies ? "+" : "−"}$${Math.abs(gp.anomalies - g0.anomalies)}k)`);
      if (gp.years !== g0.years) why.push(`a year of service (+$${gp.years - g0.years}k)`);
      if (gp.repay !== g0.repay) why.push(gp.repay ? `emergency repayment (−$${-gp.repay}k)` : `repayment finished (+$${-g0.repay}k)`);
      if (gp.raised !== g0.raised) why.push(`grant raised (+$${gp.raised - g0.raised}k)`);
    }
    const spentTotal = SPEND_CATS.reduce((a, k) => a + (prev[k] ?? 0), 0), inTotal = INCOME_CATS.reduce((a, k) => a + (prev[k] ?? 0), 0);
    return `<div class="card finances">
      <div class="label">${icon("funds", 13)}Finances · $${c.funds}k in hand</div>
      <p>Next O5 Council payment: <b>${dateText(c.day + days)}</b> (${plural(days, "day")}), expected <b>$${gp.total}k</b>, with <b>$${fronts}k</b> from the fronts and <b>$${upkeep}k</b> of upkeep and pay going out: <b class="${net >= 0 ? "ok" : "warn"}">${net >= 0 ? "+" : "−"}$${Math.abs(net)}k</b> a month before anything else.</p>
      ${upcomingHtml()}
      <div class="fincols">
        <div><div class="label">Each month in</div><ul class="fin">
          ${row(`Council grant: base`, gp.base)}${row(`Standing ${c.council.standing}`, gp.standing)}${row(`${gp.held} ${gp.held === 1 ? "anomaly" : "anomalies"} held`, gp.anomalies)}${row(`${plural(gp.yearsRun, "year")} of service`, gp.years)}${row("Raised grant", gp.raised)}${row(`${DIFFICULTIES[c.difficulty ?? "agent"].name} difficulty`, gp.difficulty)}${row("Emergency repayment", gp.repay, "warn")}
          ${REGION_IDS.filter(r => regionFunding(c, r)).map(r => row(REGIONS[r].front, regionFunding(c, r))).join("")}</ul></div>
        <div><div class="label">Each month out</div><ul class="fin">
          ${row("Facility upkeep", -up.facilities)}${row(`Operatives' pay (${c.roster.filter(o => o.alive).length})`, -up.operatives)}${row(`Guards' pay (${c.guards.filter(g => g.alive).length})`, -up.guards)}${row("Supply routes (remote site)", -up.supply)}${row(`${ALERTS[c.alert].name} alert`, -up.alert)}</ul></div>
      </div>
      ${why.length ? `<p class="muted">The grant has changed since last month: ${esc(why.join("; "))}.</p>` : ""}
      ${c.council.repay ? `<p class="warn">Emergency appropriation: $${c.council.repay.n}k comes off each of the next ${plural(c.council.repay.left, "grant")}.</p>` : ""}
      ${inTotal || spentTotal ? `<details class="archived"><summary>Last month: +$${inTotal}k in, −$${-spentTotal}k out</summary>
        <div class="fincols"><ul class="fin">${INCOME_CATS.map(k => row(CAT_NAMES[k], prev[k] ?? 0)).join("") || "<li class='muted'>Nothing yet.</li>"}</ul>
        <ul class="fin">${SPEND_CATS.map(k => row(CAT_NAMES[k], prev[k] ?? 0)).join("") || "<li class='muted'>Nothing yet.</li>"}</ul></div></details>` : ""}
      ${l?.items.length ? `<details class="archived"><summary>Latest entries</summary><ul class="fin entries">${l.items.slice(0, 15).map(i => `<li><span><span class="hday">${dateText(i.day)}</span>${esc(i.what)}</span><b class="${i.n > 0 ? "ok" : ""}">${i.n > 0 ? "+" : "−"}$${Math.abs(i.n)}k</b></li>`).join("")}</ul></details>` : ""}
    </div>`;
  }

  /** Phase 4E: paid noncombat work for other parts of the Foundation. */
  function contractsCard() {
    const k = c.contracts;
    if (!k || (!k.offers.length && !k.active.length)) return "";
    return `<div class="card">
      <div class="label">${icon("council", 13)}Council contracts · paid work while the squad recovers</div>
      ${k.active.map(x => `<p class="ok">${esc(CONTRACTS[x.kind].name)} for ${esc(x.client)}: ${esc(whoText(c, x))} back ${dateText(x.due!)}, $${x.pay}k on return.</p>`).join("")}
      ${k.offers.map(x => { const d = CONTRACTS[x.kind], w = canAcceptContract(c, x), need = NEEDS[x.kind], pool = contractPool(c, x.kind);
        // pick exactly who goes: a list for one person, tick boxes for two (the first ones are suggested)
        const picker = w ? "" : need.n === 1
          ? `<label class="specs">Send <select data-cpick="${x.id}">${pool.map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join("")}</select></label>`
          : `<div class="cpick"><span class="specs">Send ${need.n}:</span>${pool.map(([id, name], i) => `<label class="armorpick"><input type="checkbox" data-cpick="${x.id}" value="${id}" ${i < need.n ? "checked" : ""}> ${esc(name)}</label>`).join("")}</div>`;
        return `<div class="facpanel"><div class="ptop"><b>${esc(d.name)}</b> <span class="muted">for ${esc(x.client)} · offer open until ${dateText(x.until)}</span></div>
          <p class="muted">${esc(d.desc)} Needs ${esc(d.need)} for ${plural(d.days, "day")}.</p>
          ${picker}
          <div class="row"><button class="act" type="button" data-contract="${x.id}" ${w ? `disabled title="${esc(w)}"` : ""}>Accept · +$${x.pay}k on return</button>${w ? `<span class="muted">${esc(w)}</span>` : ""}</div></div>`; }).join("")}
    </div>`;
  }

  // Environment-first: the Command screen's parts, each opened from an object in the command center
  function briefingBlock() {
    const brief = directorsBriefing(c);
    const sevCount = (k: string) => brief.filter(b => b.sev === k).length;
    return `      <div class="panel"><div class="panel-h"><b>Director's briefing</b><span class="meta">${sevCount("critical")} critical · ${sevCount("important")} important · ${dateText(c.day)}</span></div>
        <div class="panel-b"><div class="brief">${brief.length ? brief.map(b => `<div class="brief-item ${b.sev}"><div><b>${esc(b.title)}</b><div class="d">${esc(b.detail)}</div></div>
          <button class="act ${b.sev === "critical" ? "danger" : ""}" type="button" data-brief="${esc(b.tab)}|${esc(b.focus ?? "")}">${b.tab === "command" && b.focus ? "Respond" : "Go"}</button></div>`).join("")
          : `<p class="brief-empty">Nothing needs a decision right now. Let time run on the World map.</p>`}</div></div></div>`;
  }
  function incidentsBlock() { return `      <div class="card">
        <div class="label">${icon("anomaly", 13)}Active incidents · ${c.incidents.length}</div>
        ${c.incidents.length ? c.incidents.map(incidentCard).join("") : `<p class="muted">No open incidents. Let time run to see what happens next.</p>`}
      </div>
`; }
  function inspectionBlock() { return `      ${inspectionSoon(c) ? `<div class="card plan"><div class="label">O5 inspection · ${dateText(c.inspectionDay!)}</div>
        <p>If the inspector came today: $${INSPECTION.perCheck}k for each check passed${inspectionChecks(c).filter(k => !k.ok).length >= INSPECTION.failAt ? `, and <span class="warn">$${INSPECTION.penalty}k docked</span>` : ""}.</p>
        <ul class="why">${inspectionChecks(c).map(k => `<li class="${k.ok ? "" : "warn"}">${k.ok ? "✓" : "✗"} ${esc(k.label)}</li>`).join("")}</ul></div>` : ""}`; }
  function situationBlock() { return `      <div class="panel"><div class="panel-h"><b>Situation</b><span class="meta">${speed ? `time running ${speed}×` : "time paused"}</span></div><div class="panel-b">
        <div class="ovgrid">
          <div>${ro("Global exposure", `${c.exposure} / 100`, c.exposure >= 60 ? "danger" : c.exposure >= 35 ? "caution" : "", "The average of the six regions; a collapsed front counts as 100.")}<div class="meter ${c.exposure >= 60 ? "danger" : c.exposure >= 35 ? "caution" : ""}"><span style="width:${c.exposure}%"></span></div></div>
          <div>${ro("O5 standing", `${c.council.standing} / 100`, c.council.standing < AUDIT_BELOW ? "danger" : c.council.standing < 40 ? "caution" : "", tierOf(c.council.standing).name)}<div class="meter ${c.council.standing < AUDIT_BELOW ? "danger" : ""}"><span style="width:${c.council.standing}%"></span></div></div>
          <div>${ro("Insurgency threat", `${c.chaos.threat}`, c.chaos.threat >= 55 ? "danger" : c.chaos.threat >= 30 ? "caution" : "", "How far the Insurgency's agenda has come.")}<div class="meter ${c.chaos.threat >= 55 ? "danger" : c.chaos.threat >= 30 ? "caution" : ""}"><span style="width:${Math.min(100, c.chaos.threat)}%"></span></div></div>
          <div>${ro("Record", `${c.stats.won} won · ${c.stats.lost} lost · ${c.stats.missed} missed`, "", "Incidents closed, failed and left unanswered.")}</div>
        </div>
        <div class="label" style="margin-top:12px">Alert level · Epsilon-11 reaches a breach on turn ${mtfArrival(c)}</div>
        <div class="row" style="margin-top:4px">${(Object.keys(ALERTS) as Alert[]).map(a => `<button class="act ${c.alert === a ? "on primary" : ""}" type="button" data-alert="${a}" aria-pressed="${c.alert === a}">${ALERTS[a].name}</button>`).join("")}</div>
        <p class="muted">${esc(ALERTS[c.alert].desc)} Time only passes on the World map.</p>
        <div class="row"><button class="act primary" type="button" data-goto="world">Open the world map</button></div>
      </div></div>`; }
  function logBlock() { return `      <div class="panel"><div class="panel-h"><b>Site log</b><span class="meta">newest first</span></div>
        <div class="panel-b"><div class="log sevlog">${c.log.map(l => `<p class="${l.kind} sev-${l.sev ?? "routine"}"><span>D${l.day}</span>${esc(l.text)}</p>`).join("")}</div></div></div>`; }
  function commandTab() {
    return `<div class="screen-command">
    <section class="col">${briefingBlock()}${incidentsBlock()}${staffCard()}${inspectionBlock()}${contractsCard()}${chaosCard()}${c.scps.map(scpSummary).join("")}</section>
    <section class="col">${situationBlock()}${councilCard()}${financesCard()}${logBlock()}</section>
  </div>`;
  }


  function scpSummary(s: ScpRecord) {
    return scpSummaryText(s).replace(/^<div class="card status([^"]*)">/, m => `${m}<div class="dossierwrap">${dossierPhoto(s.id)}</div>`);
  }
  function scpSummaryText(s: ScpRecord) {
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
      <div class="scenewrap">${incidentScene(i.kind === "recovery" ? "recovery" : i.kind, `${i.scpId}-${i.id}`)}<span class="kindtag">${icon(i.kind === "recovery" ? "manhunt" : i.kind, 14)}${KIND_NAMES[i.kind]}</span></div>
      <div><b>${esc(i.title)}</b></div>
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
    const ops = readyFor(inc), t = flightOut(c, inc), noD = ["strike", "coverup", "escort", "retaliation", "outbreak", "riot", "raid", "rescue", "emergency"].includes(inc.kind);
    const extraRow = (key: keyof Extras, label: string, why: string | null, desc: string) => why && (key === "nu7" ? !c.tf.nu7 || why.startsWith("Nu-7 only") : !why.startsWith("Needs")) ? "" :
      `<label class="armorpick"><input type="checkbox" data-extra="${key}" ${extras[key] && !why ? "checked" : ""} ${why ? "disabled" : ""}> ${esc(label)} <span class="muted">${esc(why ?? desc)}</span></label>`;
    return `<div class="card plan">
      <div class="label">Deploy to ${esc(inc.title.split(":")[0])}</div>
      <p>${esc(briefText(inc))}</p>
      ${(() => { const id = inc.kind === "outbreak" ? "610" : (inc.kind === "breach" || inc.kind === "recovery") && !(inc.first && !inc.recon) ? inc.scpId : "";
        const p = id === "610" ? PROCEDURE_610 : id ? PROCEDURES[id as ScpId] : undefined;
        return p ? `<div class="facpanel"><div class="label">Procedure · ${esc(scpName(id))}</div><p>${esc(p.capture)}</p>${p.bring.length ? `<p class="muted">Bring: ${esc(p.bring.join("; "))}.</p>` : ""}</div>`
          : inc.first && !inc.recon ? `<p class="muted">The anomaly hasn't been identified, so there is no procedure for it. Investigating first would tell the team what they're facing.</p>` : ""; })()}
      ${nightAt(c, inc) ? `<p class="warn">Night there (${String(Math.floor(localHour(c.hour ?? 0, incidentPlace(inc).lon))).padStart(2, "0")}:00 local): deploying now means fighting in the dark (outdoors, figures are only shapes until close). Flares help. Wait for daylight on the World Map if you'd rather.</p>` : ""}
      ${missionWeather(c, inc) !== "clear" ? `<p class="warn">${esc(weatherLine(c, inc))}${nightAt(c, inc) ? ` This stacks with the dark, though nobody's sight drops below ${MIN_RANGE} tiles.` : ""}</p>` : ""}
      ${inc.kind === "breach" ? (() => { const g = breachGuards(c, inc); return `<p>Site Security: <b>${g.first.length}</b> on the scene${g.late.length ? `, ${g.late.length} more on turn 2` : ""}${g.first.length + g.late.length ? ` (${[...g.first, ...g.late].map(m => esc(m.name)).join(", ")})` : ". Nobody is fit to respond"}. Operatives you pick arrive on turn <b>${mtfArrival(c, inc)}</b>; D-Class are on site from the start.</p>`; })() : ""}
      ${t ? `<p class="muted">The ${transportName(c)} takes ${plural(t, "day")} to reach ${REGIONS[inc.region].name}; time at Site-19 passes while the squad is in the air, and the survivors spend as long again flying home.</p>` : ""}
      ${inc.kind === "coverup" ? `<p class="${c.amnestics < (inc.witnesses ?? 0) ? "warn" : "muted"}">The squad carries all ${c.amnestics} amnestic doses in storage, for ${plural(inc.witnesses ?? 0, "witness")}.</p>` : ""}
      ${inc.insurgents || reportOf(inc).ins ? `<div class="row"><span>Insurgents expected: <b>${confirmedIns(inc) ? inc.insurgents - (inc.weakened ?? 0) : `about ${Math.max(0, reportOf(inc).ins - (inc.weakened ?? 0))} (estimated)`}</b>${inc.weakened ? ` (${inc.weakened} intercepted)` : ""}</span>
        <button class="act" type="button" id="intelBtn" ${canWeaken(c, inc) ? `disabled title="${esc(canWeaken(c, inc)!)}"` : ""}>Spend 1 Intel: intercept one</button></div>` : ""}
      ${inc.kind === "raid" ? (() => { const g = guardsReady(c).slice(0, 8); return `<p>Site Security: <b>${g.length}</b> ${g.length === 1 ? "guard holds" : "guards hold"} the compound${g.length ? ` (${g.map(x => esc(x.name)).join(", ")})` : ""}${has(c, "perimeter_alarms") ? ", already on overwatch" : ""}. Insurgents: about <b>${inc.insurgents}</b>. ${esc(raidArrivalText(c))}</p>`; })() : ""}
      ${inc.kind === "riot" ? (() => { const g = guardsReady(c).slice(0, 8); return `<p>Site Security: <b>${g.length}</b> ${g.length === 1 ? "guard answers" : "guards answer"}${g.length ? ` (${g.map(x => esc(x.name)).join(", ")})` : ". Nobody is fit to respond"}. D-Class left: <b>${c.dclass}</b>.</p>`; })() : `
      ${c.tf.eta10 && inc.kind !== "escort" ? `<div class="row">${(["e11", "eta10"] as TaskForce[]).map(t => `<button class="act ${tfPick === t ? "on" : ""}" type="button" data-tf="${t}" aria-pressed="${tfPick === t}">${esc(TF_NAMES[t])}</button>`).join("")}</div>
        <p class="muted">A squad is one task force: ${esc(TF_DESC[tfPick])} You play one; the other can only go hands-off.</p>` : ""}
      ${c.mtfs && inc.kind !== "escort" ? `<div class="mlabel">Which squad answers</div><div class="squadpick">${mtfsOf(c).flatMap(m => m.squads.map(sq => { const away = squadAway(c, sq.id), fit = ready().filter(o => o.squad === sq.id).length, on = (squadPick ?? defaultSquad()) === sq.id;
          return `<button type="button" class="act ${on ? "on" : ""}" data-squadpick="${sq.id}" ${away ? `disabled title="${esc(away)}"` : ""} aria-pressed="${on}"><b>${esc(m.designation)} · ${esc(sq.name)}</b><span>${esc(SPECIALTIES[sq.specialty].name)} · ${away ? esc(away) : `${fit} fit`}</span></button>`; })).join("")}</div>` : ""}
      <p class="muted">Pick up to ${squadSize(c)} operatives. Only fully healed operatives can deploy; sanity carries over, so watch it.${inc.kind === "breach" ? " You can also send nobody and play it with the guards alone." : ""}</p>
      <div class="pick">${ops.length ? ops.map(o => `<label class="pickop ${chosen.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="pick-${o.id}" data-pick="${o.id}" ${chosen.has(o.id) ? "checked" : ""} ${!chosen.has(o.id) && chosen.size >= squadSize(c) ? "disabled" : ""}>
        <span>${c.tf.eta10 ? `<span class="flag ${tfOf(o) === "eta10" ? "stare" : ""}">${tfOf(o) === "eta10" ? "Eta-10" : "Epsilon-11"}</span> ` : ""}<b>${esc(o.call)} ${esc(fieldName(o))}</b> · ${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""} · XP ${o.xp} · SAN ${o.san}/${maxSanOf(o)} · fatigue ${o.fatigue ?? 0}${tiredness(o) === "tired" ? ` <span class="warn">(tired: −5 aim, −10 sanity)</span>` : ""}${bondsOf(o).filter(b => chosen.has(b.id)).map(b => ` · <span class="ok">${BOND_NAMES[b.level].toLowerCase()} with ${esc(c.roster.find(x => x.id === b.id)?.name.split(" ").pop() ?? "")}</span>`).join("")}</span></label>`).join("") : `<p class="muted">Nobody is fit to deploy. Wait for the wounded to heal or recruit.</p>`}</div>
      ${chosen.size ? `<div class="loadouts"><div class="specs">Loadout: weapon, one armor slot and two item slots each. Unused items come back; gear on anyone killed is lost.</div>
        ${[...chosen].map(id => loadoutRow(c.roster.find(o => o.id === id)!)).join("")}</div>` : ""}`}
      ${extraRow("researcher", "Bring a field researcher", canBringResearcher(c, inc), "Unarmed but for a pistol. Scans the anomaly for research (up to 3 times); if they die, Site-19 loses a researcher.")}
      ${extraRow("amnestics", "Bring an amnestics specialist", canBringAmnestics(c, inc), `Doses witnesses from 4 tiles with a dart pistol and brings ${SPECIALIST.doses} doses of their own.`)}
      ${extraRow("nu7", `Call Nu-7 "Hammer Down" · $${NU7.call}k`, canCallNu7(c, inc), `Four heavy troopers with machine guns join from turn ${NU7.turn} or so.`)}
      ${noD ? "" : `<div class="row dpick">
        <span>D-Class work detail</span>
        <button class="act" type="button" id="dMinus" ${dCount <= 0 ? "disabled" : ""}>−</button>
        <b>${dCount}</b>
        <button class="act" type="button" id="dPlus" ${dCount >= Math.min(c.dclass, MAX_DCLASS) ? "disabled" : ""}>+</button>
        <span class="muted">of ${c.dclass} in holding</span>
      </div>`}
      ${(() => { if (!(c.mtfs || c.tf.eta10) || !autoKinds(c).includes(inc.kind)) return "";
        const team = [...chosen].map(id => c.roster.find(o => o.id === id)!).filter(Boolean), w = canDispatch(c, inc, team);
        const as = c.mtfs && team.length ? assessTeam(c, inc, team) : null;
        return `<div class="row"><button class="act" type="button" id="autoBtn" ${w ? `disabled title="${esc(w)}"` : ""}>Send them without you${w ? "" : ` · ${Math.round(dispatchOdds(c, inc, team) * 100)}% chance`}</button>
          <span class="muted">${esc(w ?? "Like leaving it to Site Security: no manual control, and they can fail. Wounds, deaths and rewards come back in the debrief.")}</span></div>
          ${as ? `<div class="assess"><span class="specs">Objective ${Math.round(as.primary * 100)}% · people ${Math.round(as.people * 100)}%</span><ul>${as.factors.map(([l, v]) => `<li class="${v >= 0 ? "good" : "bad"}">${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))} ${esc(l)}</li>`).join("")}</ul></div>` : ""}`; })()}
      ${secondInGroup(c, inc) ? `<p class="warn">Another incident from this group is already answered: this one can only go to a team sent without you.</p>` : ""}
      <div class="row">
        <button class="act primary" type="button" id="launchBtn" ${secondInGroup(c, inc) ? "disabled" : chosen.size || ((inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid") && guardsReady(c).length) ? "" : "disabled"}>${inc.kind === "riot" ? `Send in ${plural(Math.min(8, guardsReady(c).length), "guard")}` : `Deploy ${plural(chosen.size, "operative")}`}${noD ? "" : ` and ${dCount} D-Class`}</button>
        <button class="act" type="button" id="cancelPlan">Cancel</button>
      </div>
    </div>`;
  }

  /** An operative's kit: kept on them, so it's the same next time they deploy. */
  function gearOf(id: string) {
    const o = c.roster.find(x => x.id === id);
    if (o) return (o.kit ??= { armor: "", items: ["", "", ""] });
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
      ${carry.map(it => { const left = spare(it, o.id, i), q = qualifiedFor(c, o, it); return `<option value="${it}" ${g.items[i] === it ? "selected" : ""} ${(left < 1 && g.items[i] !== it) || q ? "disabled" : ""}>${ITEMS[it].name} (${q ? "not trained" : `${Math.max(0, left)} left`})</option>`; }).join("")}
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
    const [sx, sy] = project(siteOf19(c).lon, siteOf19(c).lat);
    const selInc = mapSel?.startsWith("inc:") ? c.incidents.find(i => i.id === mapSel!.slice(4)) ?? null : null;
    const selLead = mapSel?.startsWith("lead:") ? c.leads?.list.find(l => l.id === mapSel!.slice(5)) ?? null : null;
    const selFac = mapSel?.startsWith("fac:") ? FACILITIES_WORLD.find(f => f.id === mapSel!.slice(4)) ?? null : null;
    const selReg = mapSel === "region";
    // zoom: every on-screen size is multiplied by k so markers and text stay the same size at any zoom
    // k: map units per "design pixel", from the zoom and the map's width on screen (bigger on a phone)
    const mapPx = Math.max(300, (document.querySelector(".geomap svg")?.clientWidth ?? (window.innerWidth < 960 ? window.innerWidth - 40 : window.innerWidth * 0.66)));
    if (Math.abs(geoView.h / geoView.w - mapAspect()) > 0.01) { const [s19x] = project(siteOf19(c).lon, siteOf19(c).lat); geoView = clampView({ ...geoView, x: geoView.w >= WORLD_VIEW.w ? s19x - 80 : geoView.x }); }
    const v = geoView, k = Math.max(0.25, v.w / mapPx * 2.6);
    const label = (r: RegionId) => REGIONS[r].name.replace("Western ", "W. ").replace("Eastern ", "E. ").replace("United States", "US").replace(" and the Middle East", " & M.E.");
    // regions as territories: the land inside each region's boxes, tinted by its exposure
    const landPaths = (landD ??= LAND.map(p => path(p)).join(" "));
    const clips = REGION_IDS.map(r => `<clipPath id="terr-${r}">${TERRITORY[r].map(([w0, s0, e0, n0]) => { const [ax, ay] = project(w0, n0), [bx, by] = project(e0, s0); return `<rect x="${ax}" y="${ay}" width="${bx - ax}" height="${by - ay}"/>`; }).join("")}</clipPath>`).join("");
    const LABEL_AT: Record<RegionId, [number, number]> = { west_us: [-118, 52], east_us: [-88, 30], latam: [-60, -14], europe: [2, 60], africa: [20, 2], east_asia: [140, 6] };
    const territories = REGION_IDS.map(r => { const st = c.regions[r];
      return `<use href="#landShape" clip-path="url(#terr-${r})" class="terr ${st.collapsed ? "lost" : ""} ${isContacted(c, r) ? "" : "nofront"} ${selReg && regionSel === r ? "on" : ""}" style="--heat:${st.collapsed ? 100 : st.exposure};--base:${TERR_TINT[r]}" data-region="${r}" tabindex="0" role="button" aria-label="${esc(REGIONS[r].name)}, exposure ${st.exposure}${st.collapsed ? ", collapsed" : ""}"><title>${esc(REGIONS[r].name)} · exposure ${st.exposure}${st.collapsed ? " · front collapsed" : isContacted(c, r) ? "" : " · no front yet"}</title></use>`; }).join("");
    // routes between fronts: solid where both ends have one, dashed out to regions a front could reach next
    const links = LINKS.filter(([a, b]) => isContacted(c, a) || isContacted(c, b)).map(([a, b]) => {
      const [x1, y1] = project(...LABEL_AT[a]), [x2, y2] = project(...LABEL_AT[b]), both = isContacted(c, a) && isContacted(c, b);
      // the Pacific route wraps around the map edge: draw it as two stubs
      if (Math.abs(x1 - x2) > 180) { const [l, r] = x1 < x2 ? [[x1, y1], [x2, y2]] : [[x2, y2], [x1, y1]];
        return [`<line x1="${l[0]}" y1="${l[1]}" x2="${l[0] - 18}" y2="${(l[1] + r[1]) / 2}" class="link ${both ? "both" : ""}" style="stroke-width:${0.5 * k}"/>`, `<line x1="${r[0]}" y1="${r[1]}" x2="${r[0] + 18}" y2="${(l[1] + r[1]) / 2}" class="link ${both ? "both" : ""}" style="stroke-width:${0.5 * k}"/>`].join(""); }
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="link ${both ? "both" : ""}" style="stroke-width:${0.5 * k}"/>`; }).join("");
    const shape = (g: MarkerGroup, x: number, y: number) => { const m = 2.9 * k;
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
        <circle cx="${mx}" cy="${my}" r="${4.2 * k}" class="ring" style="stroke-width:${0.8 * k}"/>${shape(groupOf(i), mx, my)}<svg x="${mx - 1.6 * k}" y="${my - 1.6 * k}" width="${3.2 * k}" height="${3.2 * k}" viewBox="0 0 24 24" class="mico" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${iconBody(i.kind === "recovery" ? "manhunt" : i.kind)}</svg>
        <text x="${mx}" y="${my + 7.6 * k}" class="mlabel" style="font-size:${3 * k}px">${esc(b.short)}</text><title>${esc(incidentName(i))} · ${esc(b.deadline)}</title></g>`; }).join("");
    const leadMarkers = mapShow.has("lead") ? (c.leads?.list ?? []).map(l => { const pos = TOWN_POS[l.town] ?? [REGIONS[l.region].lon, REGIONS[l.region].lat], [lx, ly] = project(pos[0], pos[1]), m = 2.7 * k;
      return `<g class="marker lead ${l.working ? "active" : l.until - c.day <= 2 ? "urgent" : ""} ${mapSel === "lead:" + l.id ? "on" : ""}" data-maplead="${l.id}" tabindex="0" role="button" aria-label="${esc(l.title)}">
        <circle cx="${lx}" cy="${ly}" r="${4.2 * k}" class="ring" style="stroke-width:${0.8 * k}"/><path d="M${lx} ${ly - m}L${lx + m} ${ly - m / 2}L${lx + m} ${ly + m / 2}L${lx} ${ly + m}L${lx - m} ${ly + m / 2}L${lx - m} ${ly - m / 2}Z"/>
        <svg x="${lx - 1.6 * k}" y="${ly - 1.6 * k}" width="${3.2 * k}" height="${3.2 * k}" viewBox="0 0 24 24" class="mico" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${iconBody(LEADS[l.kind].icon)}</svg>
        <text x="${lx}" y="${ly + 7.6 * k}" class="mlabel" style="font-size:${3 * k}px">${l.working ? "agent" : `${Math.max(0, l.until - c.day)}d`}</text><title>${esc(LEADS[l.kind].name)}: ${esc(l.title)}</title></g>`; }).join("") : "";
    const facs = mapShow.has("facility") ? FACILITIES_WORLD.map(f => { const [fx, fy] = project(f.lon, f.lat);
      return `<g class="facility ${mapSel === "fac:" + f.id ? "on" : ""}" data-mapfac="${f.id}" tabindex="0" role="button" aria-label="${esc(f.name)}"><rect x="${fx - 2 * k}" y="${fy - 2 * k}" width="${4 * k}" height="${4 * k}" style="stroke-width:${0.6 * k}"/><svg x="${fx - 1.6 * k}" y="${fy - 1.6 * k}" width="${3.2 * k}" height="${3.2 * k}" viewBox="0 0 24 24" class="fico" fill="none" stroke-width="2.4">${iconBody("build")}</svg><text x="${fx + 3 * k}" y="${fy + 1.2 * k}" style="font-size:${3.2 * k}px">${esc(f.name)}</text></g>`; }).join("") : "";
    const route = selInc ? (() => { const pl = incidentPlace(selInc), [mx, my] = project(pl.lon, pl.lat), b = briefing(c, selInc);
      return pl.name === "Site-19" ? "" : `<line x1="${sx}" y1="${sy}" x2="${mx}" y2="${my}" class="route" style="stroke-width:${0.6 * k};stroke-dasharray:${2 * k} ${1.2 * k}"/><text x="${(sx + mx) / 2}" y="${(sy + my) / 2 - 2 * k}" class="routetext" style="font-size:${3.4 * k}px">${b.travel ? plural(b.travel, "day") : "by road"}${nightAt(c, selInc) ? " · night there" : ""}</text>`; })() : "";
    const ops = (c.ops ?? []).map(op => { const d = REGIONS[op.region], [ox, oy] = project(d.lon, d.lat); return `<g class="fieldop"><circle cx="${ox + 9 * k}" cy="${oy - 3 * k}" r="${2 * k}"/><circle cx="${ox + 9 * k}" cy="${oy - 3 * k}" r="${3.6 * k}" class="wave" style="stroke-width:${0.5 * k}"/><title>${esc(FIELD_OPS[op.kind].name)} in ${esc(d.name)}, results ${esc(dateText(op.done))}</title></g>`; }).join("");
    lastK = k;
    const flights = flightMarkup(k);
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
        <div class="specs">Deadline: <b>${esc(b.deadline)}</b>${i.dispatch || c.outbound?.incId === i.id ? "" : ` · ${esc(b.arrival)}`}</div>
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
          if (plan) notes.push(`This cell is running ${PLANS[plan.kind].name} (${goalText(plan.kind)}, ${whenText(c, plan)}). Breaking it stops the operation${c.chaos.commander ? `, and ${c.chaos.commander.rank} ${c.chaos.commander.name} leads it in person` : ""}.`);
          if (i.gru) notes.push("GRU Division \"P\" agents are here for it too. They are Soviet, not Insurgency: whoever reaches it first keeps it.");
          if (i.first) notes.push(`Left too long, ${i.region === "europe" || i.region === "east_asia" ? "GRU Division \"P\" may take it east, or " : ""}the Global Occult Coalition may destroy it. Either way it would be gone for good.`);
          if ((i.kind === "strike" || i.kind === "retaliation") && c.chaos.threat >= 30) notes.push(`With the Insurgency's agenda at ${c.chaos.threat}, expect reinforcements around turn ${c.chaos.threat >= 70 ? 5 : 7} if the fight drags on.`);
          return notes.length ? `<p class="muted">${notes.map(esc).join(" ")}</p>` : ""; })()}
        ${(() => { if (i.dispatch) return ""; const iw = canInvestigate(c, i); return iw && (i.recon || iw.startsWith("There's")) ? "" : iw ? `<p class="muted">${esc(iw)}</p>`
          : `<div class="row"><button class="act" type="button" data-investigate="${i.id}" data-how="intel" ${c.intel < INVESTIGATE.intel ? `disabled title="Needs ${INVESTIGATE.intel} Intel."` : ""}>Investigate · ${INVESTIGATE.intel} Intel, now</button><button class="act" type="button" data-investigate="${i.id}" data-how="agent" ${c.funds < INVESTIGATE.cost ? `disabled title="Needs $${INVESTIGATE.cost}k."` : ""}>Send a field agent · $${INVESTIGATE.cost}k, ${plural(INVESTIGATE.days, "day")}</button></div>`; })()}
        ${cover}
        ${block && !i.dispatch ? `<p class="warn">${esc(block)}</p>` : ""}
        ${c.outbound?.incId === i.id ? `<p class="ok">${esc(c.outbound.tf)} is in the air: lands ${dateText(Math.floor(c.outbound.arrive))}, around ${String(Math.floor((c.outbound.arrive % 1) * 24)).padStart(2, "0")}:00 Site-19 time. Let time run.</p>` : ""}
        <div class="row">${planning === i.id || i.dispatch || c.outbound?.incId === i.id ? "" : `<button class="act ${i.kind === "coverup" ? "" : "primary"}" type="button" data-plan="${i.id}" ${c.over || block ? "disabled" : ""}>${i.kind === "breach" ? "Take command" : i.kind === "coverup" ? "Send Epsilon-11 instead" : "Prepare a response"}</button>`}
          ${i.kind === "breach" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it · ${pctText(guardOdds(c, i))} chance</button>` : ""}
          ${i.kind === "riot" || i.kind === "raid" ? `<button class="act" type="button" data-guards="${i.id}" ${c.over ? "disabled" : ""}>Let the guards handle it${i.kind === "raid" ? ` (${Math.round(raidOdds(c, i) * 100)}%)` : ""}</button>` : ""}
          ${back}</div>
      </div>`; };
    const leadPanel = (l: Lead) => { const d = LEADS[l.kind], left = l.until - c.day;
      const acts = (Object.keys(d.actions) as LeadAction[]).map(a => { const def = d.actions[a]!, w = canLeadAction(c, l, a), disc = l.kind === "discovery";
        const label = disc ? `${offerText(c, l)} · $${leadPrice(c, l)}k` : `${def.label}${def.cost ? ` · $${def.cost}k` : ""}${def.days ? ` · ${plural(def.days, "day")}` : ""}`;
        return `<div class="row"><button class="act ${a === "squad" || disc ? "primary" : ""}" type="button" data-leadact="${l.id}:${a}" ${w ? `disabled title="${esc(w)}"` : ""}>${esc(label)}</button><span class="muted">${esc(w ?? (disc ? "Done at once." : def.desc))}</span></div>`; }).join("");
      return `<div class="file brief">
        <div class="label">${icon(d.icon, 13)}Lead · ${esc(d.name)} · ${esc(REGIONS[l.region].name)}</div>
        <h2>${esc(l.title)}</h2>
        <div class="specs">${esc(l.town)} · ${l.working ? `an agent is on it: result ${dateText(l.working.done)}` : `open ${left <= 0 ? "until tonight" : `for ${plural(left, "more day")}`}, until ${dateText(l.until)}`}</div>
        <p><b>Risk:</b> ${esc(d.risk)}</p><p><b>If it goes well:</b> ${esc(d.reward)}</p>
        ${l.working ? "" : l.kind === "hostile" ? `<p class="warn"><b>If it's ignored:</b> the Insurgents attack ${esc(l.town)} on ${dateText(l.until)}.</p>` : `<p class="muted">Ignored, it goes cold on ${dateText(l.until)}.</p>`}
        ${l.working ? "" : acts}
        ${!l.working && l.kind !== "council" ? `<div class="row"><button class="act" type="button" data-leadact="${l.id}:decline">Let it go</button></div>` : ""}
        <p class="muted">Agents are shared with field operations: ${agentsFree(c)} of ${c.tf.agents} free.</p>
        <div class="row">${back}</div></div>`; };
    const facPanel = (f: typeof FACILITIES_WORLD[number]) => `<div class="card"><div class="label">Independent Foundation facility · ${esc(REGIONS[f.region].name)}</div>
        <h3 class="fac">${esc(f.name)}</h3><p class="muted">${esc(f.desc)}</p>
        <p class="muted">Site-19 doesn't run ${esc(f.name)}: it has its own staff and command. It can take transfers, lend people, buy what Site-19 captures, and sometimes calls for help.</p>
        ${(() => { const st = siteOf(c, f.name), sw = canSellWeapons(c), ew = canBorrow(c, f.name, "engineers"), gw = canBorrow(c, f.name, "guards"), loan = c.tf.loans.find(l => l.site === f.name);
          return `<div class="exposure"><div class="exp-bar standing"><span style="width:${st.rel}%"></span></div><b>Relations ${st.rel}</b></div>
          ${st.holds.length ? `<p class="muted">Holds, from Site-19: ${st.holds.map(id => esc(scpName(id))).join(", ")}.</p>` : ""}
          ${loan ? `<p class="ok">${loan.n} of its ${loan.kind} are on loan to Site-19 until ${dateText(loan.until)}.</p>` : ""}
          <div class="row"><button class="act" type="button" data-sell="${f.name}" ${sw ? `disabled title="${esc(sw)}"` : ""}>Sell captured Insurgency weapons · $${COOP.sell.per}k each</button><span class="muted">${esc(sw ?? `${c.materials.ciWeapons ?? 0} in stores. Selling them uses them up for research too.`)}</span></div>
          <div class="row"><button class="act" type="button" data-borrow="engineers" data-site="${f.name}" ${ew ? `disabled title="${esc(ew)}"` : ""}>Borrow ${COOP.engineers.n} engineers for ${COOP.engineers.days} days</button><span class="muted">${esc(ew ?? `Costs ${COOP.engineers.cost} relations.`)}</span></div>
          <div class="row"><button class="act" type="button" data-borrow="guards" data-site="${f.name}" ${gw ? `disabled title="${esc(gw)}"` : ""}>Borrow ${COOP.guards.n} guards for ${COOP.guards.days} days</button><span class="muted">${esc(gw ?? `Costs ${COOP.guards.cost} relations. Post them on the Site-19 tab.`)}</span></div>`; })()}
        <div class="row">${back}</div></div>`;
    const rank = (i: Incident) => ({ active: 0, urgent: 1, new: 2, open: 3 }[incidentState(c, i)]) + (i.dispatch ? 4 : 0);
    const order = [...c.incidents].sort((a, b) => rank(a) - rank(b) || a.expires - b.expires);
    const away = c.roster.filter(o => o.alive && o.busy?.kind === "travel");
    const overview = `<div class="card">
        <div class="label">Active incidents · ${c.incidents.length}</div>
        ${order.length ? `<ul class="inclist">${order.map(i => { const stt = incidentState(c, i), b = briefing(c, i);
          return `<li class="${stt} ${i.dispatch ? "dispatched" : ""}"><button class="linkbtn" type="button" data-mapinc="${i.id}"><span class="dot ${groupOf(i)}"></span>${icon(i.kind === "recovery" ? "manhunt" : i.kind, 14)}${esc(incidentName(i))}</button><span class="incmeta">${KIND_NAMES[i.kind]} · ${esc(b.place.name)} · ${esc(b.short)}${stt === "urgent" && !i.dispatch ? " · urgent" : ""}${i.group ? " · choose one" : ""}${i.reward ? ` · ${esc(rewardText(i.reward))}` : ""}</span></li>`; }).join("")}</ul>` : `<p class="muted">Nothing needs Site-19 right now. Let time run.</p>`}
        ${(c.leads?.list ?? []).length ? `<div class="label" style="margin-top:10px">Leads · ${c.leads!.list.length}</div><ul class="inclist">${c.leads!.list.map(l => `<li class="${l.working ? "active" : ""}"><button class="linkbtn" type="button" data-maplead="${l.id}"><span class="dot lead"></span>${icon(LEADS[l.kind].icon, 14)}${esc(l.title)}</button><span class="incmeta">${esc(LEADS[l.kind].name)} · ${esc(l.town)} · ${l.working ? `agent, result ${dateText(l.working.done)}` : `${plural(Math.max(0, l.until - c.day), "day")} left`}</span></li>`).join("")}</ul>` : ""}
        ${away.length ? `<p class="muted">In the air: ${away.map(o => esc(o.name)).join(", ")}, back ${dateText(c.day + Math.max(...away.map(o => o.busy!.daysLeft)))}.</p>` : ""}
        ${(c.ops ?? []).length ? `<p class="muted">Field operations: ${c.ops!.map(op => `${esc(FIELD_OPS[op.kind].name)} in ${esc(REGIONS[op.region].name)} (${dateText(op.done)})`).join("; ")}.</p>` : ""}
        <p class="muted">Next month: $${councilGrant(c)}k from the O5 Council and $${frontsFunding(c)}k from the fronts, $${monthlyUpkeep(c)}k upkeep and salaries. Global exposure ${c.exposure}; ${collapsedCount(c)} of ${COLLAPSE_LIMIT} fronts lost. Select a region on the map for its front and field operations.</p>
      </div>`;
    const side = selInc ? briefPanel(selInc) : selLead ? leadPanel(selLead) : selFac ? facPanel(selFac) : selReg ? regionPanel() : overview;
    const clock = `<div class="geobar">
        <b class="geodate">${dateText(c.day)} · ${String(Math.floor(c.hour ?? 0)).padStart(2, "0")}:00</b>
        <div class="speeds"><button class="act ${speed ? "" : "on"}" type="button" data-speed="0" aria-pressed="${!speed}" title="Pause (Space)">❚❚</button>
          ${SPEEDS.map((n, k) => `<button class="act ${speed === n ? "on" : ""}" type="button" data-speed="${n}" aria-pressed="${speed === n}" ${clockBlocked() ? "disabled" : ""} title="${n}× (${k + 1})">${n}×</button>`).join("")}</div>
        <button class="agenda linkbtn" type="button" data-goto="command" title="The Chaos Insurgency's global agenda. At 100 it completes: exposure everywhere, sabotage at Site-19 and a blow to Council standing. Details on the Command tab."><span>Insurgency agenda</span><span class="mini"><span style="width:${c.chaos.threat}%"></span></span><b>${c.chaos.threat}</b></button>
        ${pendingBreach(c) ? `<span class="warn">${pendingBreach(c)!.kind === "escort" ? "A convoy is under attack" : "Site-19 needs an answer"}: time is held.</span>` : ""}
        <div class="mapfilters">${(["anomaly", "insurgency", "coverup", "site", "lead", "facility", "night", "weather"] as const).map(g => `<button class="act ${mapShow.has(g) ? "on" : ""}" type="button" data-mapfilter="${g}" aria-pressed="${mapShow.has(g)}" title="${{ anomaly: "Anomalies", insurgency: "Insurgency", coverup: "Cover-ups", site: "At Site-19", lead: "Leads: opportunities", facility: "Facilities", night: "Day and night", weather: "Weather" }[g]}"><span class="dot ${g}"></span><span class="fname">${{ anomaly: "Anomalies", insurgency: "Insurgency", coverup: "Cover-ups", site: "Site-19", lead: "Leads", facility: "Facilities", night: "Night", weather: "Weather" }[g]}</span></button>`).join("")}</div>
      </div>`;
    return `<div class="geo">
      <div class="card geomap">
        ${clock}
        <div class="mapwrap">
        <svg class="worldmap" id="worldsvg" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" style="aspect-ratio:${(v.w / v.h).toFixed(3)}" role="group" aria-label="World map: regions, incidents and Foundation facilities">
          <defs>${clips}<path id="landShape" d="${landPaths}"/>
            <pattern id="seaWaves" width="12" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 q3 -1.6 6 0 t6 0" fill="none" stroke="#1a2731" stroke-width=".35"/></pattern>
            <pattern id="landTex" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".35" fill="#3b4752"/><circle cx="3.5" cy="3.2" r=".25" fill="#1e262e"/></pattern>
            <radialGradient id="seaGlow" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="#16222c"/><stop offset="1" stop-color="#0a1016"/></radialGradient>
            <pattern id="lostHatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2" stroke="#7a2b22" stroke-width=".6"/></pattern></defs>
          <rect x="${x0 - 400}" y="${y0 - 200}" width="${w + 800}" height="${h + 400}" class="sea" data-mapclear></rect>
          <rect x="${x0 - 400}" y="${y0 - 200}" width="${w + 800}" height="${h + 400}" fill="url(#seaWaves)" pointer-events="none"></rect>
          ${[-60, -30, 0, 30, 60].map(la => `<line x1="0" x2="360" y1="${90 - la}" y2="${90 - la}" class="grat" style="stroke-width:${0.3 * k}"></line>`).join("")}
          ${[-120, -60, 0, 60, 120].map(lo => `<line y1="${y0}" y2="${y0 + h}" x1="${lo + 180}" x2="${lo + 180}" class="grat" style="stroke-width:${0.3 * k}"></line>`).join("")}
          <use href="#landShape" class="coast" style="stroke-width:${2.2 * k}"></use>
          <use href="#landShape" class="land" style="stroke-width:${0.4 * k}"></use>
          <use href="#landShape" fill="url(#landTex)" pointer-events="none"></use>
          ${territories}
          ${links}
          ${mapShow.has("night") ? `<polygon points="${night}" class="night"><title>Night side of the world</title></polygon>` : ""}
          ${regionLabels}
          <g class="compass" transform="translate(${v.x + v.w - 12 * k} ${v.y + v.h - 26 * k}) scale(${k})" pointer-events="none"><circle r="7" class="cring"/><path d="M0 -9 L1.6 0 L0 9 L-1.6 0Z" class="cneedle"/><path d="M0 -9 L1.6 0 L-1.6 0Z" class="cnorth"/><path d="M-9 0 L0 1.2 L9 0 L0 -1.2Z" class="cneedle"/><text y="-10.5" text-anchor="middle">N</text></g>
          <g id="flightsG">${flights}</g>
          ${route}
          <g class="site19"><svg x="${s19x - 3.6 * k}" y="${s19y - 3.6 * k}" width="${7.2 * k}" height="${7.2 * k}" viewBox="0 0 48 48">${siteSeal(48).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg>
            <text x="${s19x - 4.4 * k}" y="${s19y - 3.5 * k}" text-anchor="end" style="font-size:${4 * k}px">Site-19</text><title>Site-19 · exact location classified</title></g>
          ${facs}
          ${ops}
          ${leadMarkers}
          ${markers}
        </svg>
        <div class="zoombtns"><button class="act" type="button" data-zoom="in" aria-label="Zoom in">+</button><button class="act" type="button" data-zoom="out" aria-label="Zoom out">−</button><button class="act" type="button" data-zoom="world" aria-label="Show the whole world">World</button></div>
        </div>
        <p class="muted geohelp">Markers: <span class="dot anomaly"></span>anomaly <span class="dot insurgency"></span>Insurgency <span class="dot coverup"></span>cover-up <span class="dot site"></span>at Site-19 <span class="dot lead"></span>lead (an opportunity). Ring: <span class="urgenttxt">urgent</span>, <span class="newtxt">new</span>, <span class="activetxt">under way</span>. Select a marker or region.</p>
      </div>
      <aside class="geoside">${side}</aside>
    </div>
    ${selInc && planning === selInc.id ? planPanel(selInc) : ""}`;
  }

  /** P5: what a room is doing right now, for its scene: the lab's board, a test in a wing, the workshop's bench,
   *  Command's map, alarms and teletype. Read from the campaign; nothing here is stored. */
  function liveExtras(L: NonNullable<ReturnType<typeof roomLayout>>): SceneExtras {
    const x: SceneExtras = {};
    if (L.kind === "lab") {
      if (c.research.done.length > doneSeen) { justDone = c.research.done[c.research.done.length - 1]; doneSeen = c.research.done.length; }
      const id = justDone && !resFocus ? justDone : resFocus ?? Object.keys(c.research.assigned).find(k => c.research.assigned[k] && PROJECTS[k]) ?? null;
      if (id && PROJECTS[id]) {
        const p = PROJECTS[id], prog = c.research.progress[id] ?? 0, days = projectDays(c, id), n = c.research.assigned[id] ?? 0;
        x.board = { title: p.name, lines: [p.branch, has(c, id) ? "Complete" : `${prog} of ${days} researcher-days`, `${n} on it`, p.desc], progress: has(c, id) ? 1 : prog / days, stamp: has(c, id) && id === justDone ? "COMPLETE" : undefined };
      } else x.board = { title: "No project", lines: ["Assign researchers", "to a project"] };
    }
    if (L.kind.startsWith("cont_") && L.occupant && c.research.testing && testScp(c.research.testing.id) === L.occupant.scpId) {
      const d = TESTS[c.research.testing.id];
      x.test = { name: d.name, dclass: d.dclass, researcher: true };
    }
    if (L.kind === "workshop" && c.orders.length) {
      const o = c.orders[0];
      const total = o.item ? ITEMS[o.item].days : o.refit ? REFIT.days : ATTACHMENT_COST.days;
      x.making = { kind: o.attachment ? "attachment" : o.ammo ? "ammo" : o.item ? "item" : "refit", id: o.attachment ?? o.ammo ?? o.item ?? "refit",
        label: o.item ? ITEMS[o.item].name : o.attachment ? ATTACHMENTS[o.attachment].name : o.ammo ? AMMO[o.ammo].name : "Armor refit", progress: Math.max(0, 1 - o.daysLeft / Math.max(1, total)) };
    }
    if (L.kind === "command") {
      const brief = directorsBriefing(c), crit = c.log.find(l => l.sev === "critical") ?? c.log.find(l => l.sev === "important");
      x.ops = {
        pins: c.incidents.map(i => ({ x: Math.min(.97, Math.max(.03, (REGIONS[i.region].lon + 180) / 360)), y: Math.min(.95, Math.max(.05, (90 - REGIONS[i.region].lat) / 180)), urgent: i.expires - c.day <= 1 || i.kind === "breach" || i.kind === "raid" })),
        alarms: Math.min(12, brief.filter(b => b.sev === "critical").length), teletype: (brief.find(b => b.sev === "critical")?.title ?? crit?.text ?? "Nothing further").toUpperCase(), clock: `${dateText(c.day)} · ${String(Math.floor(c.hour ?? 0)).padStart(2, "0")}:00`,
      };
    }
    return x;
  }
  /** P5: a room as the head of its screen: the Research tab opens on the lab, Command on the operations room. */
  function roomBanner(type: FacilityType, label: string) {
    const f = c.base.facilities.filter(x => x.type === type).sort((a, b) => Number(!operational(a)) - Number(!operational(b)))[0];
    const L = f ? roomLayout(c, f.id) : null;
    if (!L) return "";
    const extras = liveExtras(L);
    // framed on the room's working height: from the top of the back wall to just past the floor line
    return `<div class="stagebanner"><div class="sb-stage">${interiorSvg(L, extras).replace(`viewBox="0 0 1600 900"`, `viewBox="0 96 1600 700"`).replace(`xMidYMid slice`, `xMidYMin slice`)}</div>
      <div class="sb-bar"><span class="rv-des">${esc(L.designation)}</span><b>${esc(L.name)}</b>${L.staff.length ? `<span class="muted">${esc(L.staff.slice(0, 4).map(s => s.name).join(", "))}</span>` : ""}
        <button class="act" type="button" data-enter="${esc(L.id)}">${esc(label)} →</button></div></div>`;
  }
  /** P5: the lab's panel inside the lab: the projects under way, each one put on the board when selected. */
  function labPanel() {
    const running = Object.keys(c.research.assigned).filter(id => c.research.assigned[id] && PROJECTS[id]);
    return `<div class="card"><div class="label">On the board</div>
      <div class="row">${running.map(id => `<button class="act ${resFocus === id ? "on" : ""}" type="button" data-resfocus="${id}">${esc(PROJECTS[id].name)}</button>`).join("") || `<span class="muted">Nothing under way. The Research tab assigns researchers.</span>`}</div>
      ${justDone ? `<p class="specs">Last completed: ${esc(PROJECTS[justDone]?.name ?? justDone)}.</p>` : ""}</div>`;
  }

  /** The research catalog: what can be researched, what's under way, the category tabs, the assignment controls.
   *  Environment-first: opened from the lab's project board. */
  function researchCatalog() {
    const branches: Branch[] = ["SCP-173", ...(["049", "106", "096", "012", "939", "035", "682"] as const).filter(id => c.scps.some(s => s.id === id)).map(id => `SCP-${id}` as Branch),
      ...(c.scps.some(isInert) ? ["Objects" as Branch] : []),
      ...((c.materials.prisoners ?? 0) > 0 ? ["Insurgency" as Branch] : []), "Personnel", "Weapons", "Equipment", "Site"];
    const offer = c.research.offer, insp = c.research.inspired;
    const bt = Object.keys(PROJECTS).filter(id => PROJECTS[id].breakthrough && !has(c, id) && offered(c, id));
    const s = scp173();
    void s;
    return `
      <div class="card">
        <div class="label">Research · ${c.researchers} researchers, ${researchersFree(c)} unassigned · lab space for ${researcherCapacity(c)}</div>
        <p class="muted">Put researchers on any projects you like; each one adds a day of work per day. A project's cost is paid when work starts.</p>
        <p class="muted">Hire researchers at a research lab, and build equipment at the workshop, on the Site-19 tab. More research opens up as Site-19 learns: finished projects, won missions, new anomalies, things brought back from the field, and the years passing.</p>
      </div>
      ${bt.length ? `<div class="card plan"><div class="label">Breakthrough${offer && !c.research.paid.includes(offer.id) ? ` · on offer until ${dateText(offer.until)}` : ""}</div><div class="projects">${bt.map(projectRow).join("")}</div></div>` : ""}
      ${insp && !has(c, insp.id) ? `<p class="muted">Inspiration: <b>${esc(PROJECTS[insp.id].name)}</b> takes half the time${c.research.paid.includes(insp.id) ? "" : ` if started by ${dateText(insp.until)}`}.</p>` : ""}
      ${(() => {
        // projects sorted into categories, one tab each, the list scrolling inside its own panel
        const visible = Object.keys(PROJECTS).filter(id => !PROJECTS[id].breakthrough && branches.includes(PROJECTS[id].branch) && projectVisible(c, id));
        const cats = RESEARCH_CATS.map(k => ({ k, ids: visible.filter(id => researchCat(id) === k) }));
        // until a category is chosen, open on the first one with something in it
        const cur = (resCatPicked ? cats.find(x => x.k === resCat) : cats.find(x => x.k === resCat && x.ids.length) ?? cats.find(x => x.ids.length)) ?? cats[0];
        const running = Object.entries(c.research.assigned).filter(([id, n]) => n && PROJECTS[id]).map(([id]) => id);
        return `${running.length ? `<div class="card"><div class="label">Under way</div><div class="projects">${running.map(projectRow).join("")}</div></div>` : ""}
        <div class="card"><div class="row restabs">${cats.map(x => `<button class="act ${x.k === cur.k ? "on" : ""}" type="button" data-rescat="${x.k}" aria-pressed="${x.k === cur.k}">${icon(RESEARCH_ICON[x.k], 14)}${RESEARCH_CAT_NAMES[x.k]} · ${x.ids.filter(id => !has(c, id)).length}</button>`).join("")}</div>
          <div class="projects scrollpanel">${cur.ids.length ? [...cur.ids].sort((a, b) => Number(has(c, a)) - Number(has(c, b))).map(projectRow).join("") : `<p class="muted">Nothing to research here yet.</p>`}</div></div>`;
      })()}
    `;
  }
  /** The experiments dossier (secondary to the lab: opened from its records cabinet). */
  function experimentsDossier() {
    const branches: Branch[] = ["SCP-173", ...(["049", "106", "096", "012", "939", "035", "682"] as const).filter(id => c.scps.some(s => s.id === id)).map(id => `SCP-${id}` as Branch),
      ...(c.scps.some(isInert) ? ["Objects" as Branch] : []),
      ...((c.materials.prisoners ?? 0) > 0 ? ["Insurgency" as Branch] : []), "Personnel", "Weapons", "Equipment", "Site"];
    const offer = c.research.offer, insp = c.research.inspired;
    const bt = Object.keys(PROJECTS).filter(id => PROJECTS[id].breakthrough && !has(c, id) && offered(c, id));
    const s = scp173();
    void bt; void offer; void insp; void branches;
    return `
      <div class="file scrollpanel tall">
        <div class="dossierwrap">${dossierPhoto(s.id)}</div><div class="label">Experiments · ${c.research.tests.length} of ${Object.keys(TESTS).length} on file</div>
        <h2>Test log</h2>
        <p>Experiments are run on the anomalies in their cells, apart from ordinary research. Each is paid for up front and prepared by researchers like any other project; on the last day the D-Class go into the cell while the guards you chose watch. Riskier tests multiply the chance someone dies, and some can end in a breach. One experiment at a time across Site-19.</p>
        <p>SCP-173's tests open new research. An experiment on any other anomaly speeds every project in its branch by ${Math.round(STUDY_BONUS * 100)}%.</p>
        ${(() => {
          // Strategic overhaul D2: the experiments for each anomaly Site-19 holds, SCP-173's first
          const held = c.scps.filter(x => (x.status === "contained" || x.status === "breach") && (Object.keys(TESTS) as TestId[]).some(t => testScp(t) === x.id));
          return held.map(x => `<div class="label" style="margin-top:12px">${esc(x.name)}${x.status !== "contained" ? ` · ${x.status === "breach" ? "breached" : "not in its cell"}` : ""}</div>
            ${(Object.keys(TESTS) as TestId[]).filter(t => testScp(t) === x.id).map(t => testRow(t)).join("")}`).join("");
        })()}
        ${watcherPicker()}
      </div>
    `;
  }
  /** Without a working lab there is no lab to stand in: the catalog and dossier, said plainly. */
  function researchScreen() {
    return `<div class="hubgrid"><section class="col">${researchCatalog()}</section><section class="col">${experimentsDossier()}</section></div>`;
  }
  function researchTab() {
    return `<div class="card notice-nolab"><div class="label">No research lab</div><p>Site-19 has no research lab, so there is nowhere to do research. Build one on the Site-19 tab; researchers need a lab to work.</p><div class="row"><button class="act" type="button" data-goto="site">Site-19 →</button></div></div>
      <div class="hubgrid"><section class="col">${researchCatalog()}</section><section class="col">${experimentsDossier()}</section></div>`;
  }


  function projectRow(id: string) {
    const p = PROJECTS[id], r = c.research, n = r.assigned[id] || 0, prog = r.progress[id] || 0;
    const done = has(c, id), lock = done ? null : projectLock(c, id);
    const days = projectDays(c, id), inspired = c.research.inspired?.id === id;
    const eta = n ? Math.ceil((days - prog) / n) : null;
    const status = done ? `<span class="flag">Done</span>` : lock ? `<span class="flag bad">Locked</span>`
      : n ? `<span class="flag stare">${plural(n, "researcher")} · ${plural(eta!, "day")} left</span>` : prog ? `<span class="flag">Paused</span>` : "";
    return `<div class="proj ${done ? "done" : ""} ${lock ? "locked" : ""}">
      <div class="ptop"><span class="projico">${icon(RESEARCH_ICON[researchCat(id)], 18)}</span><b><button class="linkbtn" type="button" data-resfocus="${id}" title="Put it on the lab's board">${esc(p.name)}</button></b>${inspired && !done ? `<span class="flag stare">Inspired</span>` : ""}${status}</div>
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
    const d = TESTS[t], subj = c.scps.find(x => x.id === testScp(t))!, why = canTest(c, subj, t), done = c.research.tests.includes(t), r = c.research;
    const running = r.testing?.id === t, key = testKey(t), n = r.assigned[key] || 0, prog = r.progress[key] || 0;
    const opens = d.scp ? `speeds ${testBranch(t)} research by ${Math.round(STUDY_BONUS * 100)}%` : `opens ${Object.values(PROJECTS).filter(p => p.needsTest === t).map(p => p.name).join(", ")}`;
    const w = running ? c.guards.filter(g => g.alive && r.testing!.watchers.includes(g.id)) : watchPool().filter(o => watchers.has(o.id));
    const death = Math.min(0.95, workRisk(w) * d.risk);
    return `<div class="test ${done ? "done" : ""}">
      <div class="ptop"><b>${esc(d.name)}</b>${done ? `<span class="flag">Done</span>` : running ? `<span class="flag stare">${n ? `${plural(n, "researcher")} · ${plural(Math.ceil((d.days - prog) / n), "day")} left` : "Paused"}</span>` : ""}</div>
      <p>${esc(d.desc)}</p>
      <div class="specs">$${d.cost}k · ${d.days} researcher-days · ${d.dclass} D-Class · death risk ×${d.risk} (${pctText(death)} with ${running ? "the chosen" : "current"} watchers)${d.breach ? ` · ${pctText(d.breach)} chance of a breach` : ""} · ${esc(opens)}</div>
      ${running ? `<div class="pbar"><div class="exp-bar"><span style="width:${Math.min(100, (prog / d.days) * 100)}%"></span></div><span class="specs">${prog}/${d.days} researcher-days · watching: ${w.length ? w.map(g => esc(g.name)).join(", ") : "two D-Class only"}</span></div>
        <div class="row assign">
          <button class="act" type="button" data-unassign="${key}" ${n ? "" : "disabled"} aria-label="Remove a researcher">−</button>
          <b>${n}</b>
          <button class="act" type="button" data-assign="${key}" ${researchersFree(c) < 1 ? "disabled" : ""} aria-label="Add a researcher">+</button>
        </div>`
      : done ? "" : `<div class="row"><button class="act" type="button" data-test="${t}" ${why ? `disabled title="${esc(why)}"` : ""}>Start the test · $${d.cost}k</button>${why ? `<span>${esc(why)}</span>` : ""}</div>`}
    </div>`;
  }

  /** The people behind the counts: who they are, what they're good at, and who's away. */
  function staffList(kind: StaffKind) {
    syncStaff(c);
    const ps = (c.people ?? []).filter(p => p.kind === kind);
    if (!ps.length) return "";
    return `<details class="archived"><summary>${kind === "researcher" ? "Researchers" : "Engineers"} · ${ps.length}</summary><ul class="memorial staff">${ps.map(p => `<li>${portraitSvg(p.look, undefined, 36)} <span><b>${esc(p.name)}</b>${p.field ? ` · ${esc(FIELDS[p.field].name)}` : ""}${p.trade ? ` · ${esc(TRADES[p.trade].name)} (${esc(TRADES[p.trade].desc.toLowerCase())})` : ""}${p.away ? ` · <span class="warn">away</span>` : ""}${p.loan ? ` · on loan from ${esc(p.loan)}` : ""} · since ${dateText(p.since)}<br><span class="muted">${esc(p.bio)}</span></span></li>`).join("")}</ul>
      ${kind === "researcher" ? `<p class="muted">A specialist on staff speeds every project in their field by ${Math.round(FIELD_BONUS * 100)}%.</p>` : `<p class="muted">Each trade on staff sometimes gets its kind of work a day ahead.</p>`}</details>`;
  }

  function workshopCard() {
    const items = unlockedItems(c), refits = pendingRefits(c), rfw = canRefit(c), atts = unlockedAttachments(c);
    return `<div class="card">
      <div class="label">Workshop</div>
      ${items.length ? `<div class="projects">${items.map(i => {
        const d = ITEMS[i], why = canOrder(c, i), queued = c.orders.filter(o => o.item === i).length;
        return `<div class="proj"><div class="ptop"><b>${esc(d.name)}</b><span class="flag">${c.inventory[i] || 0} in storage${queued ? ` · ${queued} being built` : ""}</span></div>
          <div class="muted">${esc(d.desc)}</div>
          <div class="row"><button class="act" type="button" data-order="${i}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${d.cost}k · ${plural(d.days, "day")} · 1 engineer</button>${(() => { const sw = canSellStore(c, "item", i); return sw ? "" : `<button class="act" type="button" data-sellstore="item:${i}">Sell one · +$${sellPrice(c, "item", i)}k</button>`; })()}${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
      }).join("")}</div>` : `<p class="muted">Nothing to build yet. Equipment research unlocks items here.</p>`}
      ${refits.length ? `<div class="label" style="margin-top:10px">Refits</div><div class="projects">${refits.map(r => `<div class="proj"><div class="ptop"><b>Issue the ${esc(r.name)}</b></div>
        <div class="muted">Replaces the current model for everyone at once.</div>
        <div class="row"><button class="act" type="button" data-refit="${r.key}" ${rfw ? `disabled title="${esc(rfw)}"` : ""}>Refit · $${REFIT.cost}k · ${REFIT.days} days · 1 engineer</button>${rfw ? `<span class="muted">${esc(rfw)}</span>` : ""}</div></div>`).join("")}</div>` : ""}
      ${atts.length ? `<div class="label" style="margin-top:10px">Attachments</div><div class="projects">${atts.map(a => {
        const why = canOrderAttachment(c, a), fitted = c.roster.filter(o => o.alive && o.attachment === a).length;
        return `<div class="proj"><div class="ptop"><b>${ATTACHMENTS[a].name}</b><span class="flag">${c.attachments[a] ?? 0} spare · ${fitted} fitted</span></div>
          <div class="muted">${esc(ATTACHMENTS[a].desc)} Fit one per operative on the Personnel tab.</div>
          <div class="row"><button class="act" type="button" data-att="${a}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${ATTACHMENT_COST.cost}k · ${plural(ATTACHMENT_COST.days, "day")}</button>${(() => { const sw = canSellStore(c, "att", a); return sw ? "" : `<button class="act" type="button" data-sellstore="att:${a}">Sell one · +$${sellPrice(c, "att", a)}k</button>`; })()}${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
      }).join("")}</div>` : ""}
      ${unlockedAmmo(c).length ? `<div class="label" style="margin-top:10px">Special ammunition</div><div class="projects">${unlockedAmmo(c).map(a => {
        const why = canOrderAmmo(c, a), loaded = c.roster.filter(o => o.alive && o.ammoType === a).length;
        return `<div class="proj"><div class="ptop"><b>${AMMO[a].name}</b><span class="flag">${c.ammo[a] ?? 0} spare · ${loaded} loaded</span></div>
          <div class="muted">${esc(AMMO[a].desc)} Load one per operative on the Personnel tab.</div>
          <div class="row"><button class="act" type="button" data-ammoorder="${a}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${ATTACHMENT_COST.cost}k · ${plural(ATTACHMENT_COST.days, "day")}</button>${(() => { const sw = canSellStore(c, "ammo", a); return sw ? "" : `<button class="act" type="button" data-sellstore="ammo:${a}">Sell one · +$${sellPrice(c, "ammo", a)}k</button>`; })()}${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
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

  /** Environment-first: the room a main tab stands in. Research is the lab (the one last chosen, else a working one),
   *  Command the command center, Personnel Epsilon-11's quarters. None when the campaign has no such room. */
  function tabRoom(t: Tab): string | null {
    if (t === "research") {
      const labs = c.base.facilities.filter(f => f.type === "lab");
      const pick = labs.find(f => f.id === labPick) ?? labs.find(f => operational(f)) ?? labs[0];
      return pick?.id ?? null;
    }
    if (t === "command") return c.base.facilities.find(f => f.type === "command")?.id ?? null;
    if (t === "personnel") return "surface:quarters";
    return null;
  }
  const inRoomScreen = () => (tab === "site" && !!room) || (tab !== "site" && !!tabRoom(tab));
  const currentRoom = () => tab === "site" ? room : tabRoom(tab);

  /** Environment-first: inside a room. The scene fills the screen; its objects are the interface. Selecting one
   *  brings the camera to it and opens a panel for it; nothing else covers the room. */
  function roomView(id: string) {
    // the room's own controls (repair, upgrade, staff) act on the selected slot: this room
    { const fx = c.base.facilities.find(x => x.id === id); if (fx) sel = { level: fx.level, slot: fx.slot }; }
    const L = roomLayout(c, id);
    if (!L) { room = null; return siteTab(); }
    const list = allRooms(c), i = list.findIndex(r => r.id === L.id);
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    const extras: SceneExtras = {};
    const ops = L.kind === "quarters" ? c.roster.filter(o => o.alive && !(o.busy && (o.busy.kind === "travel" || o.busy.kind === "contract"))).slice(0, 8) : [];
    if (L.kind === "quarters") {
      extras.people = ops.map(o => ({ key: o.id, label: o.name.split(" ").slice(-1)[0], spec: operativeFigure(c, o) }));
      extras.focus = opSel ?? undefined;
      const hero = target?.startsWith("person:") ? c.roster.find(o => `person:${o.id}` === target && o.alive) : undefined;
      if (hero) extras.hero = { key: hero.id, spec: operativeFigure(c, hero), x: 520 };
      extras.span = target ? [200, 1000] : [240, 1160];
    }
    Object.assign(extras, liveExtras(L));
    if (L.kind === "lab") { const pid = focusProject(); extras.apparatus = pid ? apparatusOf(pid) : undefined; }
    if (L.kind === "armory") {
      extras.racks = [...new Set(Object.values(c.models))];
      const ao = armOp ? c.roster.find(o => o.id === armOp && o.alive) : undefined;
      if (ao && target === "bench") extras.bench = { model: c.models[weaponOf(ao)], attachment: ao.attachment, ghost: armPreview || undefined, highlight: armMount ?? undefined, mounts: mountsOf(c, ao), zoom: armZoom, narrow: true };
    }
    const ts = targetsFor(L, { heroes: ops.map(o => ({ id: o.id, name: o.name })), armOp: !!armOp });
    if (target && !ts.some(t => t.id === target) && !(L.kind === "quarters" && target.startsWith("person:"))) target = null;
    extras.targets = extras.bench ? ts.filter(t => t.id !== "bench" && t.id !== "racks") : ts;
    extras.selected = target ?? undefined;
    const selT = ts.find(t => t.id === target);
    // the camera: the selected object comes to the left third, a little closer, with its panel on the right
    let cam = "";
    const objX = selT && selT.rect[2] > 0 ? (selT.rect[0] + selT.rect[2] / 2) / FRAME.W : 0.3;
    const panelLeft = !!selT && objX > 0.56 && !extras.bench;
    if (selT && selT.rect[2] > 0 && selT.rect[2] < 900 && !extras.bench && !extras.hero) {
      const k = 1.16, cx = objX, cy = (selT.rect[1] + selT.rect[3] / 2) / FRAME.H, want = panelLeft ? 0.7 : 0.32;
      const tx = Math.max((1 - k) * 100, Math.min(0, (want - cx * k) * 100)), ty = Math.max((1 - k) * 100, Math.min(0, (0.5 - cy * k) * 100));
      cam = `transform: translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${k})`;
    }
    const stateText: Record<string, string> = { operational: L.powered ? "Operational" : "No power", building: "Under construction", damaged: "Damaged", wrecked: "Wrecked", repairing: "Under repair", demolishing: "Being torn down", upgrading: "Being refitted" };
    const labs = L.kind === "lab" ? c.base.facilities.filter(f => f.type === "lab") : [];
    const panel = target ? (target.startsWith("person:") ? target : selT?.panel ?? null) : null;
    const title = target?.startsWith("person:") ? (c.roster.find(o => `person:${o.id}` === target)?.name ?? selT?.label ?? "") : selT?.label ?? "";
    return `<div class="roomview ${panel ? "haspanel" : ""} ${panelLeft ? "panel-left" : ""}" data-room="${esc(L.id)}">
      <div class="rv-stage"><div class="rv-cam" style="${cam}">${interiorSvg(L, extras)}</div></div>
      <div class="rv-top">
        <button class="act" type="button" id="leaveRoom" title="Back to Site-19 (Esc)">← Site-19</button>
        ${prevRoom && prevRoom.id !== L.id ? `<button class="act" type="button" id="roomBack">← ${esc(roomLayout(c, prevRoom.id)?.name ?? "Back")}</button>` : ""}
        <div class="rv-title"><span class="rv-des">${esc(L.designation)}</span><b>${esc(L.name)}</b><span class="rv-state ${L.state !== "operational" || !L.powered ? "warn" : ""}">${esc(stateText[L.state] ?? L.state)}${L.alarm ? " · ALARM" : ""}</span></div>
        <div class="rv-nav">${labs.length > 1 ? labs.map(f => `<button class="act ${f.id === L.id ? "on" : ""}" type="button" data-labpick="${f.id}" aria-pressed="${f.id === L.id}">${esc(designationOf(f.level, f.slot))}</button>`).join("") : ""}
          ${tab === "site" ? `<button class="act" type="button" data-roomstep="${esc(prev.id)}" title="Previous room ([)">‹ ${esc(prev.designation)}</button><button class="act" type="button" data-roomstep="${esc(next.id)}" title="Next room (])">${esc(next.designation)} ›</button>` : ""}</div>
      </div>
      ${L.kind === "command" ? commandStrip() : ""}
      <nav class="objbar" aria-label="In this room">${ts.filter(t => t.kind !== "person" || L.kind !== "quarters").map(t => `<button class="act ${t.id === target ? "on" : ""} k-${t.kind}" type="button" data-target="${esc(t.id)}" aria-pressed="${t.id === target}" title="${esc(t.hint)}">${esc(t.label)}</button>`).join("")}
        ${L.kind === "quarters" ? ops.map(o => `<button class="act ${target === `person:${o.id}` ? "on" : ""} k-person" type="button" data-person="${o.id}">${esc(o.name.split(" ").slice(-1)[0])}</button>`).join("") : ""}</nav>
      ${panel ? `<aside class="ctxpanel ${ctxWide ? "wide" : ""} ${panelLeft ? "left" : ""}" role="dialog" aria-label="${esc(title)}">
        <div class="ctx-h"><b>${esc(title)}</b>${selT ? `<span class="muted">${esc(selT.hint)}</span>` : ""}<button class="act" type="button" id="ctxWide" aria-pressed="${ctxWide}" title="Widen">${ctxWide ? "⇥" : "⇤"}</button><button class="act" type="button" id="ctxClose" aria-label="Close (Esc)">×</button></div>
        <div class="ctx-b">${panelFor(panel, L)}</div></aside>` : ""}
    </div>`;
  }

  /** Command's alerts: always on screen, so nothing urgent hides behind a click. The briefing's top items and every
   *  open incident, each with its action. */
  function commandStrip() {
    const brief = directorsBriefing(c).filter(b => b.sev !== "routine").slice(0, 3);
    const inc = c.incidents.slice(0, 5);
    if (!brief.length && !inc.length) return `<div class="cmdstrip quiet"><span class="muted">Nothing needs a decision. The world map runs the clock.</span></div>`;
    return `<div class="cmdstrip">${brief.map(b => `<div class="cs-item ${b.sev}"><span>${esc(b.title)}</span><button class="act" type="button" data-brief="${esc(b.tab)}|${esc(b.focus ?? "")}">Go</button></div>`).join("")}
      ${inc.map(i => `<div class="cs-item inc"><span>${esc(i.title.split(": ")[1] ?? i.title)} <i>${i.expires - c.day <= 0 ? "last day" : plural(i.expires - c.day, "day")}</i></span><button class="act" type="button" data-plan="${i.id}" ${c.over || travelBlock(c, i) ? "disabled" : ""}>Respond</button></div>`).join("")}</div>`;
  }

  /** The project the lab's bench and board are about: the one selected, else the first under way. */
  function focusProject() { return resFocus && PROJECTS[resFocus] ? resFocus : Object.keys(c.research.assigned).find(k => c.research.assigned[k] && PROJECTS[k]) ?? null; }

  /** What an object's panel holds. All of it is the game's existing management, through its commands. */
  function panelFor(p: string, L: NonNullable<ReturnType<typeof roomLayout>>): string {
    const f = c.base.facilities.find(x => x.id === L.id);
    if (p.startsWith("person:")) {
      const pid = p.slice(7), o = c.roster.find(x => x.id === pid && x.alive);
      if (o) { opSel = o.id; return opFocusPanel(o); }
      return personPanel(pid);
    }
    switch (p) {
      // the lab
      case "research": return researchCatalog();
      case "project": { const id = focusProject(), run = Object.keys(c.research.assigned).filter(k => c.research.assigned[k] && PROJECTS[k]);
        if (!id) return `<p class="muted">Nothing is on the bench. Choose a project on the board.</p><div class="row"><button class="act primary" type="button" data-target="board">Project board</button></div>`;
        const pr = PROJECTS[id];
        return `${run.length > 1 ? `<div class="row">${run.map(k => `<button class="act ${k === id ? "on" : ""}" type="button" data-resfocus="${k}">${esc(PROJECTS[k].name)}</button>`).join("")}</div>` : ""}
          <div class="projects">${projectRow(id)}</div>
          <p class="specs">Branch: ${esc(pr.branch)}${pr.needs?.length ? ` · needs ${esc(pr.needs.map(n => PROJECTS[n]?.name ?? n).join(", "))}` : ""}${pr.needsTest ? ` · needs the ${esc(TESTS[pr.needsTest].name.toLowerCase())}` : ""}</p>
          <p class="specs">${pr.unlocks ? `Unlocks ${esc(ITEMS[pr.unlocks].name)} at the workshop. ` : ""}${pr.attachment ? `Unlocks the ${esc(ATTACHMENTS[pr.attachment].name.toLowerCase())} for the armory. ` : ""}</p>`; }
      case "experiments": {
        const wings = c.scps.filter(x => x.status === "contained" && x.wingId && (Object.keys(TESTS) as TestId[]).some(t => testScp(t) === x.id));
        return `${wings.length ? `<div class="row">${wings.map(x => `<button class="act" type="button" data-enter="${x.wingId}">${esc(x.name)}'s chamber →</button>`).join("")}</div>` : ""}${experimentsDossier()}`; }
      // the command center
      case "briefing": return briefingBlock() + situationBlock();
      case "intel": return chaosCard() + inspectionBlock() + c.scps.map(scpSummary).join("");
      case "council": return councilCard() + contractsCard();
      case "comms": return incidentsBlock() + staffCard() + logBlock();
      case "admin": return financesCard();
      // Epsilon-11's quarters
      case "roster": return personnelRoster();
      // the armory
      case "issue": case "bench": return armoryPanel();
      // the workshop
      case "crews": { const eWhy = canHireEngineer(c); return `<div class="row"><button class="act" id="engBtn" type="button" ${eWhy || c.over ? `disabled title="${esc(eWhy || "")}"` : ""}>Hire engineer · $${ENGINEER_COST}k</button>${eWhy ? `<span class="muted">${esc(eWhy)}</span>` : ""}</div>${engineeringPanel()}${staffList("engineer")}`; }
      case "production": return productionPanel();
      case "catalog": return workshopCard();
      case "stores": return storesPanel();
      // the D-Class block
      case "occupancy": return occupancyPanel(f!);
      case "dorders": return facilityPanel(f!);
      // a containment wing
      case "anomaly": { const s2 = c.scps.find(x => x.id === L.occupant?.scpId); return s2 ? scpSummary(s2) : ""; }
      case "tests": { const sid = L.occupant?.scpId, tests = (Object.keys(TESTS) as TestId[]).filter(t => testScp(t) === sid);
        return tests.length ? `<div class="file">${tests.map(t => testRow(t)).join("")}${watcherPicker()}</div>` : `<p class="muted">No experiments are written up for SCP-${esc(sid ?? "")} yet.</p>`; }
      case "procedures": { const s2 = c.scps.find(x => x.id === L.occupant?.scpId); return s2 ? containmentCard(s2) : `<p class="muted">The cell is empty.</p>${f ? slotDetail(f.level, f.slot) : ""}`; }
      case "room": return f ? slotDetail(f.level, f.slot) : "";
      default: return "";
    }
  }

  /** A researcher, engineer or guard: who they are, what they're on, and what they're good for. */
  function personPanel(pid: string) {
    const p = (c.people ?? []).find(x => x.id === pid), g = c.guards.find(x => x.id === pid);
    if (g) return `<ul class="memorial">${guardRow(g)}</ul>`;
    if (!p) return `<p class="muted">They are no longer at Site-19.</p>`;
    if (p.kind === "researcher") {
      const branches = p.field ? FIELDS[p.field].branches : [];
      const onProject = (c.people ?? []).filter(x => x.kind === "researcher" && !x.away).indexOf(p) < researchersAssigned(c);
      const fitting = Object.keys(PROJECTS).filter(id => branches.includes(PROJECTS[id].branch) && projectVisible(c, id) && !has(c, id) && !PROJECTS[id].breakthrough).slice(0, 4);
      return `<div class="row">${portraitSvg(p.look, undefined, 64)}<div><h3 class="fac">${esc(p.name)}</h3><p class="specs">${p.field ? esc(FIELDS[p.field].name) : "Researcher"} · since ${dateText(p.since)}</p></div></div>
        <p>${onProject ? "At work on a project." : `<span class="warn">Not on a project.</span>`} ${p.field ? `Projects in ${esc(branches.join(", "))} go ${Math.round(FIELD_BONUS * 100)}% faster while they are on staff.` : ""}</p>
        <p class="muted">${esc(p.bio)}</p>
        ${fitting.length ? `<div class="label">In their field</div><div class="projects">${fitting.map(projectRow).join("")}</div>` : ""}`;
    }
    const job = crews(c).crews.find(j => j.crew.some(x => x.id === p.id));
    return `<div class="row">${portraitSvg(p.look, undefined, 64)}<div><h3 class="fac">${esc(p.name)}</h3><p class="specs">${p.trade ? `${esc(TRADES[p.trade].name)}: ${esc(TRADES[p.trade].desc.toLowerCase())}` : "Engineer"} · since ${dateText(p.since)}</p></div></div>
      <p>${job ? `On: ${esc(job.what)} (${plural(job.days, "day")} left).` : "Free."}</p><p class="muted">${esc(p.bio)}</p>`;
  }

  /** The workshop's machinery: what's being made, by whom, and when it's done. */
  function productionPanel() {
    if (!c.orders.length) return `<p class="muted">Nothing in production.</p><div class="row"><button class="act primary" type="button" data-target="workbench">Workbench</button></div>`;
    const job = crews(c).crews.filter(j => j.what.startsWith("Workshop"));
    return `<div class="rows">${c.orders.map((o, k) => { const name = o.item ? ITEMS[o.item].name : o.attachment ? ATTACHMENTS[o.attachment].name : o.ammo ? AMMO[o.ammo].name : "Armor refit";
      const total = o.item ? ITEMS[o.item].days : o.refit ? REFIT.days : ATTACHMENT_COST.days, crew = job[k]?.crew.map(p => p.name).join(", ");
      return `<div class="r"><span><b>${esc(name)}</b></span><span class="v">${plural(o.daysLeft, "day")}</span><span class="sub">${crew ? esc(crew) : "waiting for an engineer"}</span><div class="meter" style="grid-column:1/-1"><span style="width:${Math.max(0, Math.min(100, (1 - o.daysLeft / Math.max(1, total)) * 100))}%"></span></div></div>`; }).join("")}</div>`;
  }
  /** The workshop's stores: what's on the shelves, and selling the surplus. */
  function storesPanel() {
    const rows: string[] = [];
    const add = (kind: StoreKind, id: string, name: string, n: number) => { if (n > 0) rows.push(`<div class="r"><span>${esc(name)}</span><span class="v">× ${n}</span><span class="sub"><button class="act" type="button" data-sellstore="${kind}:${id}">Sell one · +$${sellPrice(c, kind, id)}k</button></span></div>`); };
    for (const [id, n] of Object.entries(c.inventory)) add("item", id, ITEMS[id as ItemId]?.name ?? id, n ?? 0);
    for (const [id, n] of Object.entries(c.attachments)) add("att", id, ATTACHMENTS[id as AttachmentId]?.name ?? id, n ?? 0);
    for (const [id, n] of Object.entries(c.ammo)) add("ammo", id, AMMO[id as AmmoId]?.name ?? id, n ?? 0);
    return rows.length ? `<div class="rows">${rows.join("")}</div>` : `<p class="muted">The stores are empty.</p>`;
  }
  /** The D-Class block's bunks: beds, occupancy and crowding, and the upgrades that change them. */
  function occupancyPanel(f: Facility) {
    const cap = dclassCapacity(c), share = cap ? c.dclass / cap : 1, uw = canUpgrade(c, f), rw = canAddRecreation(c, f);
    return `<div class="rows"><div class="r"><span>D-Class held</span><span class="v">${c.dclass} of ${cap} beds</span></div>
      <div class="r ${share > 0.8 ? "danger" : ""}"><span>Occupancy</span><span class="v">${Math.round(share * 100)}%</span><span class="sub">${share > 0.8 ? "Overcrowded: morale falls 2 a day." : share < 0.6 ? "Room to breathe: morale recovers 1 a day." : "Crowded, not overcrowded."}</span></div>
      <div class="r"><span>This block</span><span class="v">${f.upgraded ? "expanded · 15 beds" : "10 beds"}${f.recreation ? " · recreation room" : ""}</span></div></div>
      <p class="specs">Each figure in the room stands for up to ${DCLASS_PER_FIGURE} D-Class.</p>
      ${f.upgraded ? "" : `<div class="row"><button class="act" type="button" id="upgradeBtn" ${uw ? `disabled title="${esc(uw)}"` : ""}>Expand · $${UPGRADE.cost}k · ${plural(UPGRADE.days, "day")}</button>${uw ? `<span class="muted">${esc(uw)}</span>` : ""}</div>`}
      ${f.recreation ? "" : `<div class="row"><button class="act" type="button" id="recBtn" ${rw ? `disabled title="${esc(rw)}"` : ""}>Recreation room</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>`}`;
  }

  function siteTab() {
    const rows: string[] = [];
    for (let level = 0; level < c.base.levels; level++) {
      const slots: string[] = [];
      for (let slot = 0; slot < SLOTS; slot++) slots.push(slotCell(level, slot));
      rows.push(`<div class="level"><div class="lvl">Level ${level + 1}${level === 0 ? "<span>surface</span>" : ""}</div>${slots.join("")}</div>`);
    }
    const exWhy = canExcavate(c);
    // Strategic overhaul C2: the cross-section is the centrepiece; the context panel shows the selected room, or with
    // nothing selected an operational overview of the whole site
    return `<div class="screen-site">
    <section class="col">
      ${powerShort(c) ? `<p class="warn-box">Power shortage: medical bay and psychological services are offline${unpowered(c) ? ", every containment wing is twice as likely to breach, and each cell has a 10% chance a day of failing outright" : ". Backup generators keep the containment wings running"}. Repair or build a generator.</p>` : ""}
      <div class="xsection"><div class="surfwrap">${surfaceSvg(c.hour ?? 12, c.scps.some(x => x.status === "breach") || c.incidents.some(i => i.kind === "raid"))}
        <button type="button" class="hotspot" data-enter="surface:armory" style="left:24%;width:13%" title="Armory">Armory</button>
        <button type="button" class="hotspot" data-enter="surface:quarters" style="left:54%;width:17%" title="Epsilon-11 quarters">Epsilon-11 quarters</button></div><div class="basegrid">${rows.join("")}</div>
        <div class="xs-foot">
          <div class="legendline"><span><i class="lamp ok"></i>operational</span><span><i class="lamp caution"></i>building or repairing</span><span><i class="lamp danger"></i>damaged or breached</span><span>Select a room to go in; an empty slot to build. The armory and Epsilon-11\'s quarters are on the surface.</span></div>
          ${c.base.excavation > 0 ? `<span class="muted">Excavating level ${c.base.levels + 1}: ${plural(c.base.excavation, "day")} left.</span>`
            : c.base.levels < MAX_LEVELS ? `<button class="act" id="digBtn" type="button" ${exWhy ? `disabled title="${esc(exWhy)}"` : ""}>Excavate level ${c.base.levels + 1} · $${EXCAVATE.cost}k · ${EXCAVATE.days} days · ${EXCAVATE.engineers} engineers</button>` : ""}
        </div>
      </div>
      ${damageReport()}
    </section>
    <aside class="ctx">
      ${sel ? `<div class="row" style="margin:0"><button class="act" type="button" id="siteOverview">← Site overview</button></div>${slotDetail(sel.level, sel.slot)}` : siteOverview()}
    </aside>
  </div>`;
  }

  /** The whole site at a glance: capacity, containment risk per wing, and work in progress. */
  function siteOverview() {
    const held = c.scps.filter(x => x.status === "contained" || x.status === "breach");
    const month = (p: number) => 1 - Math.pow(1 - p, 30);
    const pu = powerUse(c), ps = powerSupply(c);
    return `<div class="panel"><div class="panel-h"><b>Site operations</b><span class="meta">${c.base.facilities.length} facilities · ${c.base.levels} levels</span></div>
      <div class="panel-b"><div class="ovgrid">
        <div>${ro("Power", `${pu} / ${ps}`, pu > ps ? "danger" : "", "Used / supplied")}<div class="meter ${pu > ps ? "danger" : pu > ps * 0.85 ? "caution" : ""}"><span style="width:${Math.min(100, ps ? pu / ps * 100 : 100)}%"></span></div></div>
        <div>${ro("Engineers busy", `${engineersBusy(c)} / ${c.engineers}`, "", "Building, repairing, digging, workshop orders")}<div class="meter"><span style="width:${c.engineers ? Math.min(100, engineersBusy(c) / c.engineers * 100) : 0}%"></span></div></div>
        <div>${ro("Researchers at work", `${c.researchers - researchersFree(c)} / ${c.researchers}`, researchersFree(c) > 0 ? "caution" : "", "Researchers on projects")}<div class="meter"><span style="width:${c.researchers ? (c.researchers - researchersFree(c)) / c.researchers * 100 : 0}%"></span></div></div>
        <div>${ro("Guards posted", `${guardsAlive(c).length - unposted(c).length} / ${guardCapacity(c)}`, unposted(c).length ? "caution" : "", "Guards at working Security stations / posts")}<div class="meter"><span style="width:${guardCapacity(c) ? Math.min(100, (guardsAlive(c).length - unposted(c).length) / guardCapacity(c) * 100) : 0}%"></span></div></div>
      </div></div></div>
    <div class="panel"><div class="panel-h"><b>Containment</b><span class="meta">${held.length} held · risk over the next 30 days</span></div>
      <div class="panel-b"><div class="rows">${held.length ? held.map(x => { const w = wingOf(c, x), r = breachRisk(c, x), m = month(r.p), tone = x.status === "breach" ? "danger" : m >= 0.25 ? "danger" : m >= 0.1 ? "caution" : "";
        return `<div class="r ${tone}"><span><i class="lamp ${x.status === "breach" ? "danger" : m >= 0.1 ? "caution" : "ok"}"></i><b>${esc(x.name)}</b> · ${esc(x.cls)}${w ? ` · level ${w.level + 1}` : ""}</span><span class="v">${x.status === "breach" ? "BREACH" : `${Math.round(m * 100)}%`}</span>
          ${w ? `<span class="sub">Maintenance ${x.maintenance}% · ${esc(r.why.slice(0, 2).join("; "))}</span>` : ""}</div>`; }).join("") : `<p class="muted">Nothing held yet.</p>`}</div>
        ${held.some(x => wingOf(c, x)) ? `<p class="muted">Select an anomaly's wing in the cross-section for its procedures, routine work and staff.</p>` : ""}</div></div>
    ${engineeringPanel()}`;
  }

  /** Strategic overhaul E1: the engineers by name, on the jobs they're on; the right trade is placed first. */
  function engineeringPanel() {
    syncStaff(c);
    const { crews: list, idle } = crews(c);

    const tradeNote = (p: Person, j?: { trade?: string }) => p.trade && j?.trade === p.trade ? ` <span class="ok">(${esc(TRADES[p.trade].name.toLowerCase())}: faster)</span>` : p.trade ? ` <span class="muted">(${esc(TRADES[p.trade].name.toLowerCase())})</span>` : "";
    return `<div class="panel crew"><div class="panel-h"><b>Work and crews</b><span class="meta">${c.engineers} on staff · ${Math.max(0, engineersFree(c))} free</span></div>
      <div class="panel-b">${list.length ? "" : `<p class="muted">No construction, repairs, digging or workshop orders under way.</p>`}<div class="rows">${list.map(j => `<div class="r ${j.short > 0 ? "danger" : ""}"><span>${esc(j.what)}</span><span class="v">${plural(j.days, "day")}</span>
        <span class="sub who">${j.crew.map(p => `${esc(p.name)}${tradeNote(p, j)}`).join(", ") || "nobody"}${j.short > 0 ? ` · <span class="warn">short ${j.short}: the work goes slower</span>` : ""}</span></div>`).join("")}
        ${idle.length ? `<div class="r"><span>Free</span><span class="v">${idle.length}</span><span class="sub who">${idle.map(p => `${esc(p.name)}${tradeNote(p)}`).join(", ")}</span></div>` : ""}</div></div></div>`;
  }

  function slotCell(level: number, slot: number) {
    const f = facilityAt(c, level, slot), on = sel && sel.level === level && sel.slot === slot;
    if (!f) return `<button type="button" class="slot empty ${on ? "sel" : ""}" data-slot="${level},${slot}">${roomSvg(null, { seed: `${level}-${slot}` })}<span class="sname">Empty</span><span class="sstat">Build here</span></button>`;
    const d = FACILITIES[f.type], occ = occupantOf(c, f);
    const stat = f.demolishDays ? `Tearing down · ${plural(f.demolishDays, "day")}` : f.daysLeft > 0 ? `Building · ${plural(f.daysLeft, "day")}` : f.repairDays > 0 ? `Repairing · ${plural(f.repairDays, "day")}` : f.disabled ? "Damaged" : occ ? `${occ.name}${occ.status === "breach" ? " · BREACH" : occ.status === "loose" ? " · escaped" : occ.status === "away" ? " · at Site-17" : ""}` : isContainment(f.type) ? "Empty cells" : "Operational";
    const cls = [f.daysLeft > 0 ? "building" : "", f.disabled ? "damaged" : "", isContainment(f.type) ? "cont" : "", occ && (occ.status === "breach" || occ.status === "loose") ? "alarm" : ""].join(" ");
    return `<button type="button" class="slot ${cls} ${on ? "sel" : ""}" data-slot="${level},${slot}" title="${esc(d.name)}">${facilityArt(f)}<span class="sname">${esc(SHORT_NAME[f.type] ?? d.name)}</span><span class="sstat">${esc(stat)}</span></button>`;
  }

  /** A facility's room, drawn in its current state. */
  function facilityArt(f: NonNullable<ReturnType<typeof facilityAt>>) {
    const occ = occupantOf(c, f), here = occ && (occ.status === "contained" || occ.status === "breach") ? occ : null;
    return roomSvg(f.type, { seed: f.id, building: f.daysLeft > 0 || !!f.demolishDays, damaged: f.disabled, alarm: !!occ && occ.status === "breach",
      occupant: here && occ!.status !== "breach" ? here.id : null, dark: powerShort(c) && (f.type === "medical" || f.type === "psych") });
  }

  function slotDetail(level: number, slot: number) {
    const f = facilityAt(c, level, slot);
    if (!f) {
      const types = (Object.keys(FACILITIES) as FacilityType[]).filter(t => FACILITIES[t].buildable);
      return `<div class="card"><div class="roomart">${roomSvg(null, { seed: `${level}-${slot}` })}</div><div class="label">Build on level ${level + 1}, slot ${slot + 1}</div>
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
    return `<div class="card"><div class="roomart">${facilityArt(f)}</div><div class="label">Level ${f.level + 1}, slot ${f.slot + 1}</div>
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
      ${occ ? containmentCard(occ) : ""}
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
        const aw = canHireAgent(c);
        return box(`Recruitment · ${plural(pool.length, "candidate")} this month`, `
          <div class="row"><span>Field agents: <b>${c.tf.agents}</b> (${agentsFree(c)} free${c.tf.hurt.length ? `, ${c.tf.hurt.length} hurt` : ""})</span><button class="act" type="button" id="agentBtn" ${aw ? `disabled title="${esc(aw)}"` : ""}>Hire a field agent · $${AGENT.cost}k</button></div>
          <p class="muted">Agents run field operations on the World Map: scans, surveillance, procurement and infiltration. Each takes one agent until it's done, and some come back hurt.</p>
          <p class="muted">Epsilon-11 recruits from special forces around the world. A new pool arrives on the first of every month; each operative costs $10k a month once hired. Units open as they are formed (US Army Special Forces in 1952, Navy SEALs in 1962).</p>
          ${(() => { const st = (id: string) => has(c, id) ? "done" : c.research.assigned[id] ? "under way" : projectVisible(c, id) ? "available in the lab" : PROJECTS[id].afterWon && c.stats.won < PROJECTS[id].afterWon! ? `opens after ${PROJECTS[id].afterWon} missions won` : "not yet available";
            return `<p class="specs">Allied liaison office (research, ${st("liaison_office")}): opens the Korps Commandotroepen and Philippine Scout Rangers, the Belgian Paracommandos from 1952 and Norwegian naval commandos from 1953, and 2 more candidates a month. Joint training exchange (research, ${st("joint_exchange")}): far more Veteran and Elite candidates. O5 standing will add to this later.</p>`; })()}
          ${pool.length ? pool.map(k => { const u = UNITS[k.unit], q = QUALITY[k.quality], w = canHire(c, k);
            return `<div class="proj"><div class="ptop">${portraitSvg(rollLook(k.id, k.sex), k.unit, 44)}<b>${esc(k.name)}</b><span class="flag ${k.quality ? "stare" : ""}">${q.name}</span></div>
              <div class="specs">${SEX_NAMES[k.sex]} · ${esc(u.name)} · nationality ${esc(k.nationality ?? nationalityOf(k.home))} · age ${k.age}, from ${esc(k.home)} · starts as ${RANKS[k.quality ? 1 : trainersActive(c) ? 1 : 0]} · aim ${k.aimBase + (u.lean === "aim" ? 6 : 0)}</div>
              <p class="muted">${esc(k.story)} <b>${LEANS[u.lean]}</b> (${esc(u.name)}).${q.desc ? ` ${esc(q.desc)}` : ""}</p>
              ${k.trait ? `<p class="${TRAITS[k.trait].bad ? "warn" : ""}">Comes with <b>${TRAITS[k.trait].name}</b>: ${esc(TRAITS[k.trait].desc)}</p>` : ""}
              <div class="row">${(c.tf.eta10 ? (["e11", "eta10"] as TaskForce[]) : (["e11"] as TaskForce[])).map(t => `<button class="act" type="button" data-hire="${k.id}" data-hiretf="${t}" ${w ? `disabled title="${esc(w)}"` : ""}>Hire${c.tf.eta10 ? ` into ${t === "eta10" ? "Eta-10" : "Epsilon-11"}` : ""} · $${candidateCost(k)}k</button>`).join("")}${w ? `<span class="muted">${esc(w)}</span>` : ""}</div></div>`; }).join("") : `<p class="muted">Nobody left in this month's pool. More arrive on the first.</p>`}`);
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
        ${staffList("engineer")}
        ${workshopCard()}`); }
      case "lab": { const rw = canHireResearcher(c); return box(`Research lab · ${c.researchers} researchers, ${researchersFree(c)} unassigned, room for ${researcherCapacity(c)}`, `
        <div class="row"><button class="act" id="hireResBtn" type="button" ${rw ? `disabled title="${esc(rw)}"` : ""}>Hire researcher · $60k</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>
        <p class="muted">Working on: ${Object.entries(c.research.assigned).filter(([, n]) => n).map(([id, n]) => `${esc(PROJECTS[id]?.name ?? (TESTS[id.slice(5) as TestId]?.name || id))} (${n})`).join(", ") || "nothing"}.</p>
        ${staffList("researcher")}
        <button class="act" type="button" data-target="board">Project board</button>`); }
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
  /** HP an operative deploys with: their own, plus the armor in their kit and the researched uniform, as the mission
   *  adds them (playtest fix: the Personnel tab used to show only their own). */
  function fieldHp(o: Operative) {
    const armor = o.kit?.armor ? armorStats(o.kit.armor, c.armorTier).hp : 0, uni = uniformOf(c).hp, bonus = armor + uni;
    const why = bonus ? `${o.maxHp} base${armor ? ` + ${armor} ${ITEMS[o.kit!.armor as ItemId].name.toLowerCase()}` : ""}${uni ? ` + ${uni} ${uniformOf(c).name.toLowerCase()}` : ""}` : "";
    return { hp: o.hp + bonus, max: o.maxHp + bonus, why };
  }
  /** Epsilon-11's roster, site staff, the lost, the retired and the memorial: the quarters' duty roster. */
  function personnelRoster() {
    return `
      <div class="card">
        <div class="label">Epsilon-11 "Nine-Tailed Fox" roster</div>
        <p class="muted">Select an operative to see their class, perks and traits. ${esc(TF_DESC.e11)}</p>
        <div class="roster">${c.roster.filter(o => o.alive && tfOf(o) === "e11").map(opRow).join("") || `<p class="muted">Nobody on this roster.</p>`}</div>
        ${c.tf.eta10 ? `<div class="label" style="margin-top:14px">Eta-10 "See No Evil" roster</div>
        <p class="muted">${esc(TF_DESC.eta10)}</p>
        <div class="roster">${c.roster.filter(o => o.alive && tfOf(o) === "eta10").map(opRow).join("") || `<p class="muted">Nobody yet. Hire recruits into Eta-10 from the recruit pool.</p>`}</div>` : ""}
        <div class="row"><button class="act" type="button" data-gotocommand>Recruit at Command · ${plural((c.recruits ?? []).length, "candidate")} this month</button></div>
      </div>
    
      <p class="muted">Guards, training, therapy, D-Class, engineers and prisoners are managed from their facilities on the Site-19 tab.</p>
      <div class="card"><div class="label">Site staff · ${plural(c.researchers, "researcher")}, ${plural(c.engineers, "engineer")}</div>
        ${staffList("researcher")}${staffList("engineer")}
        ${c.staffLost?.length ? `<div class="label" style="margin-top:8px">Staff lost</div><ul class="memorial">${c.staffLost.map(l => `<li><b>${esc(l.name)}</b>, ${l.kind}${l.field ? ` (${esc(FIELDS[l.field].name.toLowerCase())})` : l.trade ? ` (${esc(TRADES[l.trade].name.toLowerCase())})` : ""}: ${esc(l.how)}, ${dateText(l.day)}</li>`).join("")}</ul>` : ""}
      </div>
      ${c.retired?.length ? `<div class="card">
        <div class="label">Retired</div>
        <ul class="memorial">${c.retired.map(r => `<li>${r.look ? portraitSvg(r.look, r.unit, 36) : ""} <b>${esc(r.name)}</b> (${esc(r.call)}), ${RANKS[r.rank]}${r.unit ? `, formerly ${esc(UNITS[r.unit].name)}` : ""} · ${plural(r.missions, "mission")}${r.kills ? `, ${plural(r.kills, "kill")}` : ""}${r.medals?.length ? ` · ${r.medals.map(m => MEDALS[m].name).join(", ")}` : ""} · ${r.trainer ? "trainer at the range" : "honourable discharge"}, ${dateText(r.day)}</li>`).join("")}</ul>
      </div>` : ""}
      ${c.roster.some(o => !o.alive) ? `<div class="card">
        <div class="label">Memorial</div>
        <ul class="memorial">${c.roster.filter(o => !o.alive).map(o => `<li>${portraitSvg(lookOf(o), o.unit, 36, true)} <b>${esc(fieldName(o))}</b> (${esc(o.call)}), ${RANKS[o.rank]}${o.unit ? `, formerly ${esc(UNITS[o.unit].name)}` : ""}${o.bio ? `, of ${esc(o.bio.home)}` : ""} · ${plural(o.missions, "mission")}, ${plural(o.kills, "kill")}${o.wounds ? `, wounded ${o.wounds}×` : ""}${o.seals ? `, ${o.seals} sealed` : ""}${o.medals?.length ? ` · ${o.medals.map(m => MEDALS[m].name).join(", ")}` : ""} · killed ${o.diedDay ? dateText(o.diedDay) : ""}${o.diedAt ? `, ${esc(o.diedAt)}` : ""}</li>`).join("")}</ul>
      </div>` : ""}
    `;
  }
  function personnelTab() {
    const q = quartersCtx();
    return tab === "armory" ? armoryHtml(q) : barracksHtml(q);
  }
  function quartersCtx(): QuartersCtx {
    const entering = lastDrawn !== tab; lastDrawn = tab;
    return { c, opSel, eqSlot, gearOf, fieldHp, dossier, archive, archiveHtml, entering };
  }
  /** Phase 5: the site's MTFs, their squads and people, from the board on the barracks wall. */
  function orgPanel(head: (t: string) => string) {
    const ms = mtfsOf(c), cap = deployCap(c), max = squadRosterMax(c);
    const lamp = (o: Operative) => { const t = o.busy ? "away" : injured(c, o) || tiredness(o) === "exhausted" ? "bad" : o.hp < o.maxHp || tiredness(o) === "tired" ? "warn" : "ok"; return `<i class="olamp t-${t}"></i>`; };
    const moveSel = (o: Operative) => `<select data-sqmove="${o.id}" aria-label="Assign ${esc(o.name)}">${ms.flatMap(m => m.squads.map(sq => `<option value="${sq.id}" ${o.squad === sq.id ? "selected" : ""}>${esc(m.designation)} · ${esc(sq.name)}</option>`)).join("")}<option value="" ${o.squad ? "" : "selected"}>Reserve</option></select>`;
    const row = (o: Operative) => `<li>${lamp(o)}<b>${esc(o.call)}</b><span class="who">${esc(fieldName(o))} <span class="muted">${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}${o.injury && o.injury.until > c.day ? ` · ${esc(o.injury.name)}` : o.busy ? ` · away ${o.busy.daysLeft} d` : ""}</span></span>${moveSel(o)}</li>`;
    const reserve = c.roster.filter(o => o.alive && (!o.squad || !squadOfOp(c, o)));
    const hist = (c.history ?? []).filter(h => h.cat === "deployment").slice(-5).reverse();
    const kit = eligibleKit(c).map(i => `${ITEMS[i].name}: ${c.inventory[i] ?? 0}`).join(" · ");
    const next = ms.length < MTF_CONFIG.maxMtfs ? (["bio", "heavy", "recon"] as const).map(sp => ({ sp, why: specUnlock(c, sp) })) : [];
    const newWhy = ms.length >= MTF_CONFIG.maxMtfs ? `At most ${MTF_CONFIG.maxMtfs} MTFs.` : c.council.standing < MTF_CONFIG.mtfStanding ? `Needs Council standing ${MTF_CONFIG.mtfStanding} (now ${c.council.standing}).` : c.funds < MTF_CONFIG.mtfCost ? `Needs $${MTF_CONFIG.mtfCost}k.` : next.every(x => x.why) ? "No other specialization is unlocked yet." : null;
    return `${head(`Organization · ${esc(siteOf19(c).designation)}`)}
      <div class="fbody org">
      ${ms.map(m => `<section class="orgmtf">
        <h4>${esc(m.designation)} "${esc(m.name)}"</h4>
        <p class="specs">${esc(SPECS[m.spec].name)} · chartered ${dateText(m.founded)} · deploys ${cap} per squad (Foundation doctrine) · ${c.roster.filter(o => o.alive && m.squads.some(sq => sq.id === o.squad) && deployable(c, o)).length} fit of ${c.roster.filter(o => o.alive && m.squads.some(sq => sq.id === o.squad)).length}</p>
        ${m.squads.map(sq => { const mem = squadMembers(c, sq.id), away = squadAway(c, sq.id), re = sq.retrainUntil && sq.retrainUntil > c.day;
          return `<div class="orgsq">
            <div class="sqhead"><input data-sqname="${sq.id}" value="${esc(sq.name)}" maxlength="24" aria-label="Squad name"><button type="button" class="act" data-sqrename="${sq.id}">Rename</button>
              <select data-sqspec="${sq.id}" aria-label="Squad specialty">${SPECS[m.spec].specialties.map(id => `<option value="${id}" ${sq.specialty === id ? "selected" : ""}>${esc(SPECIALTIES[id].name)}</option>`).join("")}</select></div>
            <p class="specs">${mem.length}/${max} on the roster · ${mem.filter(o => deployable(c, o)).length} fit to deploy${away ? ` · <b>${esc(away)}</b>` : ""}${re ? ` · <span class="warn">retraining, ${sq.retrainUntil! - c.day} d: specialist kit unusable</span>` : ""}</p>
            <p class="muted">${esc(SPECIALTIES[sq.specialty].desc)} Retraining into another specialty takes about ${SQUAD_BALANCE.retrainDays} days at the training range; people keep the certifications they have.</p>
            ${squadCapabilities(sq, mem)}
            <ul class="orglist">${mem.map(row).join("") || `<li class="muted">Nobody assigned.</li>`}</ul>
          </div>`; }).join("")}
        ${(() => { const why = canAddSquad(c, m); return `<div class="row"><input id="newSq-${m.id}" maxlength="24" placeholder="New squad name"><select id="newSqSpec-${m.id}">${SPECS[m.spec].specialties.map(id => `<option value="${id}">${esc(SPECIALTIES[id].name)}</option>`).join("")}</select><button type="button" class="act" data-addsq="${m.id}" ${why ? `disabled title="${esc(why)}"` : ""}>Raise a squad · $${MTF_CONFIG.squadCost}k</button>${why ? `<span class="muted">${esc(why)}</span>` : ""}</div>`; })()}
      </section>`).join("")}
      <section class="orgmtf"><h4>Reserve · ${reserve.length}</h4><p class="muted">At the site but in no squad: rotate them in as people are hurt or tired. Recruit more at Command.</p><ul class="orglist">${reserve.map(row).join("") || `<li class="muted">Nobody in reserve.</li>`}</ul></section>
      <section class="orgmtf"><h4>Specialist kit in stores</h4><p class="specs">${kit || "None. Squads' specialist kit is built at the workshop once a squad is trained for it."}</p></section>
      <section class="orgmtf"><h4>Operational history</h4>${hist.length ? `<ul class="memorial">${hist.map(h => `<li>${dateText(h.day)}: ${esc(h.text)}</li>`).join("")}</ul>` : `<p class="muted">No deployments yet.</p>`}</section>
      <section class="orgmtf"><h4>Another MTF</h4><p class="muted">${next.map(x => `${esc(SPECS[x.sp].name)}: ${x.why ? esc(x.why) : "unlocked"}`).join(" · ")}</p>
        <div class="row"><button type="button" class="act" data-newmtf ${newWhy ? `disabled title="${esc(newWhy)}"` : ""}>Charter another MTF · $${MTF_CONFIG.mtfCost}k</button>${newWhy ? `<span class="muted">${esc(newWhy)}</span>` : ""}</div></section>
      </div>`;
  }

  /** Version 12: what a squad's specialty lets it do, how far it has come, and what it costs, on the organization board. */
  function squadCapabilities(sq: Squad, mem: Operative[]) {
    const k = KITS[sq.specialty], stage = squadStage(sq), cert = mem.filter(o => (o.quals ?? []).includes(sq.specialty)).length;
    const next = SQUAD_BALANCE.stageOps[Math.min(3, stage + 1)], drillWhy = canDrill(c, sq);
    const tech = (id: string) => { const t = TECHS[id]; return `<li class="${t.incomplete ? "incomplete" : ""}"><b>${esc(t.name)}</b> <span class="specs">${t.ap} action${t.ap > 1 ? "s" : ""}${t.cooldown ? ` · squad cooldown ${t.cooldown}` : ""}${t.participants > 1 ? ` · ${t.participants} people` : ""}${t.consumes ? ` · uses ${esc(ITEMS[t.consumes].name.toLowerCase())}` : ""}</span><br><span class="muted">${esc(t.desc)}</span>${t.incomplete ? `<br><span class="warn">Not built yet: ${esc(t.incomplete)}</span>` : ""}</li>`; };
    return `<div class="sqcap">
      <div class="sqstage"><b>${SQUAD_BALANCE.stageNames[stage]}</b> <span class="specs">stage ${stage} · ${sq.mastery ?? 0} specialist operations${stage < 3 ? ` (next stage at ${next})` : ""} · ${cert}/${mem.length} certified${(sq.drillUntil ?? 0) > c.day ? ` · drilling, ${sq.drillUntil! - c.day} d` : ""}</span>
        <button type="button" class="act" data-drill="${sq.id}" ${drillWhy ? `disabled title="${esc(drillWhy)}"` : ""}>Squad drill</button>${drillWhy ? `<span class="muted">${esc(drillWhy)}</span>` : ""}</div>
      ${stage >= 3 && !sq.branch ? `<div class="row"><span class="specs">Veteran branch:</span><button type="button" class="act" data-branch="${sq.id}" data-b="speed">Operational speed</button><button type="button" class="act" data-branch="${sq.id}" data-b="reliability">Reliability</button></div>` : sq.branch ? `<p class="specs">Veteran branch: ${sq.branch === "speed" ? "operational speed (techniques recover a turn sooner)" : "reliability (a quarter of kit uses come free)"}</p>` : ""}
      <ul class="techs">${k.techs.map(tech).join("")}</ul>
      <p class="${stage >= 1 ? "" : "muted"}"><b>${esc(k.passive.name)}</b>${stage >= 1 ? "" : " (from Drilled)"}: ${esc(k.passive.desc)}${k.passive.incomplete ? ` <span class="warn">${esc(k.passive.incomplete)}</span>` : ""}</p>
      <p class="${stage >= 2 ? "" : "muted"}"><b>Grade 2</b>${stage >= 2 ? "" : " (from Proficient)"}: ${esc(k.grade2)}</p>
      <p class="muted"><b>Kit:</b> ${k.certified.map(i => { const st = equipStatus(c, mem.find(o => (o.quals ?? []).includes(sq.specialty)) ?? mem[0], i); return `${esc(ITEMS[i].name)} ${c.inventory[i] ?? 0} in stores${st.ok || st.kind === "stock" ? "" : ` (${esc(st.reason!)})`}`; }).join(" · ") || "ordinary weapons and gear"}. <b>Hands-off:</b> ${esc(k.worldMap)} <b>Tradeoff:</b> ${esc(k.tradeoff)}</p>
    </div>`;
  }

  /** The wall archive opened from the barracks: site staff, retired operatives, the memorial. */
  function archiveHtml(k: string) {
    const head = (t: string) => `<header class="filehead"><span class="eyebrow">Site-19 · Barracks</span><h3>${t}</h3><button type="button" class="x" data-archive="${k}" aria-label="Close">×</button></header>`;
    if (k === "org") return orgPanel(head);
    if (k === "staff") return `${head(`Site staff · ${plural(c.researchers, "researcher")}, ${plural(c.engineers, "engineer")}`)}
      <p class="muted">Guards, training, therapy, D-Class, engineers and prisoners are managed from their facilities on the Site-19 tab.</p>
      ${staffList("researcher")}${staffList("engineer")}
      ${c.staffLost?.length ? `<div class="label" style="margin-top:8px">Staff lost</div><ul class="memorial">${c.staffLost.map(l => `<li><b>${esc(l.name)}</b>, ${l.kind}${l.field ? ` (${esc(FIELDS[l.field].name.toLowerCase())})` : l.trade ? ` (${esc(TRADES[l.trade].name.toLowerCase())})` : ""}: ${esc(l.how)}, ${dateText(l.day)}</li>`).join("")}</ul>` : ""}`;
    if (k === "retired") return `${head("Retired")}<ul class="memorial">${(c.retired ?? []).map(r => `<li>${r.look ? portraitSvg(r.look, r.unit, 36) : ""} <b>${esc(r.name)}</b> (${esc(r.call)}), ${RANKS[r.rank]}${r.unit ? `, formerly ${esc(UNITS[r.unit].name)}` : ""} · ${plural(r.missions, "mission")}${r.kills ? `, ${plural(r.kills, "kill")}` : ""}${r.medals?.length ? ` · ${r.medals.map(m => MEDALS[m].name).join(", ")}` : ""} · ${r.trainer ? "trainer at the range" : "honourable discharge"}, ${dateText(r.day)}</li>`).join("") || `<li class="muted">Nobody has retired yet.</li>`}</ul>`;
    const dead = c.roster.filter(o => !o.alive);
    return `${head("In memoriam")}${dead.length ? `<ul class="memorial">${dead.map(o => `<li>${portraitSvg(lookOf(o), o.unit, 36, true)} <b>${esc(fieldName(o))}</b> (${esc(o.call)}), ${RANKS[o.rank]}${o.unit ? `, formerly ${esc(UNITS[o.unit].name)}` : ""}${o.bio ? `, of ${esc(o.bio.home)}` : ""} · ${plural(o.missions, "mission")}, ${plural(o.kills, "kill")}${o.wounds ? `, wounded ${o.wounds}×` : ""}${o.seals ? `, ${o.seals} sealed` : ""}${o.medals?.length ? ` · ${o.medals.map(m => MEDALS[m].name).join(", ")}` : ""} · killed ${o.diedDay ? dateText(o.diedDay) : ""}${o.diedAt ? `, ${esc(o.diedAt)}` : ""}</li>`).join("")}</ul>` : `<p class="muted">No Epsilon-11 operative has died under this command. The plaque is blank.</p>`}`;
  }

  /** An operative's personnel file, beside them in the barracks: only what has to be read as text. Their kit is
   *  changed in the Armory, and their face and build show on the figure itself. */
  function dossier(o: Operative) {
    const pair = perkChoices(o), tw = canTherapy(c, o), bad = o.traits.filter(t => TRAITS[t].bad), ms = maxSanOf(o), next = RANK_XP[o.rank + 1], fh = fieldHp(o);
    const needs = (promotionDue(o) && !o.cls) || !!pair;
    const dtab = needs ? "perks" : dosTab;
    const tabs: [string, string][] = [["record", "Record"], ["perks", needs ? "Promotion ▲" : "Perks & traits"], ["look", "Appearance"], ["admin", "Admin"]];
    const bar = (label: string, v: number, max: number, cls: string) => `<div class="fbar ${cls}"><span>${label}</span><b>${v}/${max}</b><i style="--v:${Math.max(0, Math.min(1, v / max))}"></i></div>`;
    const body = (() => {
      switch (dtab) {
        case "perks": return `
          ${promotionDue(o) && !o.cls ? `<p><b>Choose a class.</b> It decides the abilities they learn from here on.</p>
            <div class="classpick">${(Object.keys(CLASSES) as ClassId[]).map(k => `<button type="button" class="classopt" data-class="${k}">
              <b>${CLASSES[k].name}</b><span class="muted">${CLASSES[k].role}</span>
              <span class="specs">Starts with ${PERKS[CLASSES[k].base].name}: ${esc(PERKS[CLASSES[k].base].desc)}</span>
              <span class="specs">Later: ${CLASSES[k].choices.map(p => p.map(x => PERKS[x].name).join(" or ")).join(" · ")}</span></button>`).join("")}</div>` : ""}
          ${pair ? `<p><b>Choose a perk for ${RANKS[o.rank]}.</b></p>
            <div class="classpick two">${pair.map(p => `<button type="button" class="classopt" data-perk="${p}"><b>${PERKS[p].name}</b><span class="muted">${esc(PERKS[p].desc)}</span></button>`).join("")}</div>` : ""}
          ${o.cls ? `<ol class="tree">
              <li><b>${PERKS[CLASSES[o.cls].base].name}</b> <span class="muted">${esc(PERKS[CLASSES[o.cls].base].desc)}</span></li>
              ${CLASSES[o.cls].choices.map((p, i) => { const got = o.perks[i + 1]; return `<li>${RANKS[i + 2]}: ${got ? `<b>${PERKS[got].name}</b> <span class="muted">${esc(PERKS[got].desc)}</span>` : `<span class="muted">${p.map(x => PERKS[x].name).join(" or ")}${o.rank >= i + 2 ? " (choose above)" : ""}</span>`}</li>`; }).join("")}
              ${[5, 6].map(r => `<li>${RANKS[r]}: <span class="${o.rank >= r ? "" : "muted"}">${RANK_BONUS[r]}</span></li>`).join("")}
            </ol>` : !promotionDue(o) ? `<p class="muted">No class yet: they choose one on their first promotion.</p>` : ""}
          <div class="label" style="margin-top:10px">Traits</div>
          ${o.traits.length ? `<ul class="traits">${o.traits.map(t => `<li class="${TRAITS[t].bad ? "bad" : "good"}"><b>${TRAITS[t].name}</b>: ${esc(TRAITS[t].desc)} <span class="muted">${esc(TRAITS[t].how)}</span>
            ${TRAITS[t].bad && !o.busy ? `<span class="muted">Treatable at Psychological services.</span>` : ""}</li>`).join("")}</ul>
            ${bad.length && tw ? `<p class="muted">${esc(tw)}</p>` : ""}` : `<p class="muted">None yet. Traits come from what happens to them on missions.</p>`}
          ${o.cls && !o.busy ? `<p class="muted">Retraining (a new class, keeping their rank) is arranged at the training range.</p>` : ""}`;
        case "look": {
          const l = lookOf(o), part = (key: string, label: string, value: string) => `<div class="lookrow"><span>${label}</span><button class="act" type="button" data-look="${key}" data-d="-1" aria-label="Previous ${label.toLowerCase()}">‹</button><b>${esc(value)}</b><button class="act" type="button" data-look="${key}" data-d="1" aria-label="Next ${label.toLowerCase()}">›</button></div>`;
          return `<p class="muted">Changes show on them in the room as you make them.</p>` + part("sex", "Sex", SEX_NAMES[o.sex ?? "m"]) + part("skin", "Skin tone", `${l.skin + 1} of ${SKIN.length}`) + part("hair", "Hair", HAIR_STYLES[l.hair]) + part("hairColor", "Hair colour", `${l.hairColor + 1} of ${HAIR_COLORS.length}`)
            + (o.sex === "f" ? "" : part("facial", "Facial hair", FACIAL[l.facial])) + part("scar", "Scar", l.scar ? "Yes" : "No") + (o.unit && HEADGEAR[o.unit] ? part("headgear", "Headgear", l.headgear ? HEADGEAR[o.unit]![0] : "None") : "")
            + `<p class="muted">Helmets and suit hoods replace the headgear when armor is worn: set that in the Armory.</p>`;
        }
        case "admin": {
          const tw2 = trainerWhy(c, o);
          return `<div class="label">Rename</div><div class="renamegrid">
              <label class="specs" for="renameName">Full name</label><input id="renameName" maxlength="40" value="${esc(o.name)}">
              <label class="specs" for="renameNick">Nickname</label><input id="renameNick" maxlength="16" value="${esc(o.nick ?? "")}" placeholder="${o.rank >= NICK_RANK ? "none" : "given at Corporal"}">
              <label class="specs" for="renameCall">Callsign</label><input id="renameCall" maxlength="12" value="${esc(o.call)}">
              <span></span><button class="act" type="button" id="renameBtn">Save</button></div>
            <p class="specs">Task force: <b>${esc(TF_NAMES[tfOf(o)])}</b> (for good, from hiring). ${esc(TF_DESC[tfOf(o)])}</p>
            ${o.busy ? "" : `<div class="label" style="margin-top:10px">Retire</div><p class="muted">${tw2 ? `${esc(tw2)} They can still leave with an honourable discharge.` : "As a trainer at the range, new recruits arrive as Privates First Class while they're there."}</p>
              <div class="row"><button class="act" type="button" data-retire="${o.id}">${tw2 ? "Honourable discharge" : "Retire as a trainer"}</button></div>`}`;
        }
        default: return `
          ${o.busy ? `<p class="warn">${o.busy.kind === "therapy" ? "In therapy" : o.busy.kind === "travel" ? "Flying home" : o.busy.kind === "contract" ? "On contract" : "Retraining"}: ${plural(o.busy.daysLeft, "day")} left. Can't deploy until then.</p>` : ""}
          <div class="fbars">${bar("Field HP", fh.hp, fh.max, "hp")}${bar("Sanity", o.san, ms, o.san <= ms * 0.3 ? "low" : "san")}${bar("Fatigue", o.fatigue ?? 0, 100, (o.fatigue ?? 0) >= FATIGUE.tired ? "low" : "fat")}${next !== undefined ? bar("XP", o.xp, next, "xp") : ""}</div>
          <dl class="fstats"><dt>Aim</dt><dd>${aimOf(o)}</dd><dt>Blink</dt><dd>${Math.round(blinkFullOf(o) * 100)}%</dd><dt>Missions</dt><dd>${o.missions}</dd><dt>Kills</dt><dd>${o.kills}</dd><dt>Wounded</dt><dd>${o.wounds ?? 0}×</dd><dt>Sealed</dt><dd>${o.seals ?? 0}</dd></dl>
          ${fh.why ? `<p class="specs">Field HP: ${esc(fh.why)}</p>` : ""}
          ${o.injury && o.injury.until > c.day ? `<p class="warn">${esc(o.injury.name)} until ${dateText(o.injury.until)}</p>` : ""}
          <p class="specs">Fatigue: ${tiredness(o)}; tired at ${FATIGUE.tired}, can't deploy at ${FATIGUE.exhausted}; −${FATIGUE.restPerDay} a day at Site-19${countOperational(c, "psych") ? `, −${FATIGUE.restPsych} more with psychological services` : ""}.</p>
          ${o.unit ? `<p class="specs">Recruited from the ${esc(UNITS[o.unit].name)} (${esc(UNITS[o.unit].country)}) · ${LEANS[UNITS[o.unit].lean]}${o.bio ? ` · nationality ${esc(nationalityOf(o.bio.home))}` : ""}</p>` : ""}
          ${o.bio ? `<p class="muted">Age ${o.bio.age + Math.floor((c.day - 1) / 365)}, from ${esc(o.bio.home)}. ${esc(o.bio.story)}</p>` : ""}
          ${o.faced?.length ? `<p class="specs">Faced ${esc(o.faced.join(", "))}</p>` : ""}
          ${o.medals?.length ? `<ul class="traits">${o.medals.map(m => `<li class="good"><b>${MEDALS[m].name}</b>: ${esc(MEDALS[m].bonus)} <span class="muted">${esc(MEDALS[m].how)}</span></li>`).join("")}</ul>` : ""}
          ${bondsOf(o).length || o.lostBonds?.length ? `<p class="specs">Bonds: ${bondsOf(o).map(b => { const m = c.roster.find(x => x.id === b.id); return m ? `${BOND_NAMES[b.level]} with <b>${esc(m.name)}</b>${m.alive ? "" : " (fallen)"} (${b.n} missions together)` : ""; }).filter(Boolean).join("; ")}${o.lostBonds?.length ? `${bondsOf(o).length ? "; " : ""}lost: ${o.lostBonds.map(esc).join(", ")}` : ""}</p>` : ""}`;
      }
    })();
    return `<header class="filehead">${portraitSvg(lookOf(o), o.unit, 64)}<div><span class="eyebrow">${esc(o.call)} · ${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}</span><h3>${esc(fieldName(o))}</h3>
        <span class="specs">${SEX_NAMES[o.sex ?? "m"]}${o.unit ? ` · ${esc(UNITS[o.unit].country)}` : ""} · ${esc(TF_NAMES[tfOf(o)])}</span></div>
        <button type="button" class="x" data-op="${o.id}" aria-label="Close file">×</button></header>
      <nav class="ftabs">${tabs.map(([k, l]) => `<button type="button" class="${dtab === k ? "on" : ""}" data-dostab="${k}" aria-pressed="${dtab === k}">${l}</button>`).join("")}</nav>
      <div class="fbody">${body}</div>
      <footer class="ffoot"><button type="button" class="act primary" data-gotoarmory="${o.id}">Kit them out in the Armory</button></footer>`;
  }



  /** XCOM-style equipment: a row of slots, and the one clicked opens below with its stats and what can go in it. */
  function equipment(o: Operative) {
    const g = gearOf(o.id), gun = gunFor(c, o), t = weaponOf(o), uni = uniformOf(c), slots = o.perks.includes("field_kit") ? 3 : 2;
    const tile = (key: string, label: string, value: string, sub = "", art = "empty") => `<button type="button" class="eqslot ${eqSlot === key ? "on" : ""}" data-eqslot="${key}" aria-pressed="${eqSlot === key}"><span class="eqlabel">${label}</span>${gearArt(art)}<b>${esc(value)}</b>${sub ? `<span class="muted">${esc(sub)}</span>` : ""}</button>`;
    const stat = (k: string, v: string) => `<span class="eqstat"><span class="muted">${k}</span> ${v}</span>`;
    const pickCard = (attr: string, value: string, on: boolean, title: string, body: string, disabled = "") => `<button type="button" class="eqopt ${on ? "on" : ""}" ${attr}="${value}" ${disabled ? `disabled title="${esc(disabled)}"` : ""}><b>${esc(title)}</b><span class="muted">${body}</span></button>`;
    const detail = (() => {
      switch (eqSlot) {
        case "weapon": return `<div class="eqstats">${stat("Damage", gun.dmg.join("–"))}${stat("Magazine", String(gun.mag))}${stat("Aim", `${gun.aim >= 0 ? "+" : ""}${gun.aim}`)}${stat("Move", `${TYPES[t].move >= 0 ? "+" : ""}${TYPES[t].move}`)}${stat("Crit", `+${TYPES[t].crit}%`)}${gun.pierce ? stat("Pierce", String(gun.pierce)) : ""}</div>
          <p class="muted">${esc(TYPES[t].desc)}</p>
          <div class="eqfitted"><div class="row"><span><span class="muted">Attachment</span> <b>${o.attachment ? esc(ATTACHMENTS[o.attachment].name) : "None"}</b>${o.attachment ? ` <span class="muted">· ${esc(ATTACHMENTS[o.attachment].desc)}</span>` : ""}</span><button class="act" type="button" data-eqslot="attachment">Change</button></div>
            <div class="row"><span><span class="muted">Ammunition</span> <b>${o.ammoType ? esc(AMMO[o.ammoType].name) : "Standard ball"}</b>${o.ammoType ? ` <span class="muted">· ${esc(AMMO[o.ammoType].desc)}</span>` : ""}</span><button class="act" type="button" data-eqslot="ammo">Change</button></div></div>
          <div class="eqopts">${weaponOptions(o).map(w => { const m = model(c.models[w]); return pickCard("data-setweapon", w, w === t, `${TYPES[w].name}: ${m.name}`, `${m.dmg.join("–")} damage · ${m.mag} rounds · aim ${m.aim >= 0 ? "+" : ""}${m.aim}. ${esc(TYPES[w].desc)}`); }).join("")}</div>
          <p class="muted">Their class carries these two. Better models come from Weapons research and a workshop refit.</p>`;
        case "attachment": return `<div class="eqopts">${pickCard("data-fitatt", "", !o.attachment, "None", "The weapon as issued.")}
          ${(Object.keys(ATTACHMENTS) as AttachmentId[]).filter(a => o.attachment === a || ((c.attachments[a] ?? 0) > 0 && fits(c.models[weaponOf(o)], a))).map(a => pickCard("data-fitatt", a, o.attachment === a, ATTACHMENTS[a].name, `${esc(ATTACHMENTS[a].desc)}${o.attachment === a ? " · fitted" : ` · ${c.attachments[a]} in stores`}`)).join("")}</div>
          <p class="muted">Attachments are built in the workshop once researched. Fitting one takes it from stores; taking it off puts it back.</p>`;
        case "ammo": return `<div class="eqopts">${pickCard("data-loadammo", "", !o.ammoType, "Standard ball", "Ordinary rounds.")}
          ${(Object.keys(AMMO) as AmmoId[]).filter(a => o.ammoType === a || (c.ammo[a] ?? 0) > 0).map(a => pickCard("data-loadammo", a, o.ammoType === a, AMMO[a].name, `${esc(AMMO[a].desc)}${o.ammoType === a ? " · loaded" : ` · ${c.ammo[a]} in stores`}`)).join("")}</div>`;
        case "armor": return `<div class="eqopts">${pickCard("data-kitarmor", "", !g.armor, "No armor slot", `Only the uniform: +${uni.hp} HP${uni.points ? `, +${uni.points} armor` : ""}.`)}
          ${ARMOR_KINDS.filter(k => (c.inventory[k] ?? 0) > 0 || g.armor === k).map(k => { const st = armorStats(k, c.armorTier); return pickCard("data-kitarmor", k, g.armor === k, ITEMS[k].name, `+${st.hp} HP · ${st.points} armor${st.move ? ` · ${st.move > 0 ? "+" : ""}${st.move} move` : ""} · ${c.inventory[k] ?? 0} in stores. ${esc(ITEMS[k].desc)}`); }).join("")}</div>
          <p class="muted">Their usual armor, taken from stores when they deploy (if there's one left). The uniform under it, ${esc(uni.name)}, is worn by everyone.</p>`;
        case "uniform": return `<div class="eqstats">${stat("HP", `+${uni.hp}`)}${stat("Armor", `+${uni.points}`)}</div><p class="muted">${esc(uni.name)}: worn by every operative under any armor. Better uniforms come from Equipment research and apply to everyone at once.</p>`;
        case "sidearm": return `<div class="eqstats">${stat("Damage", SIDEARM.dmg.join("–"))}${stat("Aim", String(SIDEARM.aim))}</div><p class="muted">${esc(SIDEARM.name)}: fired automatically when the main weapon is empty. Everyone carries one.</p>`;
        default: {
          const i = Number((eqSlot ?? "").slice(4));
          if (!eqSlot?.startsWith("item") || i >= slots) return `<p class="muted">Click a slot to see it and change what goes in it.</p>`;
          const carry = (Object.keys(ITEMS) as ItemId[]).filter(k => !ITEMS[k].armor && ((c.inventory[k] ?? 0) > 0 || g.items[i] === k));
          return `<div class="eqopts">${pickCard("data-kititem", "", !g.items[i], "Empty", "Nothing in this slot.")}
            ${carry.map(k => pickCard("data-kititem", k, g.items[i] === k, ITEMS[k].name, `${esc(ITEMS[k].desc)} · ${c.inventory[k] ?? 0} in stores${HEAVY.includes(k) ? " · heavy armor only" : ""}`, HEAVY.includes(k) && g.armor !== "armor_heavy" ? "Heavy weapons need heavy plate in the armor slot." : "")).join("")}</div>
            <p class="muted">Items are built in the workshop. Used ones are gone; unused ones come back to stores.</p>`;
        }
      }
    })();
    const fh = fieldHp(o);
    return `<div class="label" style="margin-top:10px">Equipment · field HP ${fh.hp}/${fh.max}${fh.why ? ` (${esc(fh.why)})` : ""}</div>
      <div class="eqgrid">
        ${tile("weapon", "Primary weapon", gun.name, `${gun.dmg.join("–")} dmg · ${gun.mag} rounds`, t)}
        ${tile("attachment", "Attachment", o.attachment ? ATTACHMENTS[o.attachment].name : "None", "", o.attachment ? "attachment" : "empty")}
        ${tile("ammo", "Ammunition", o.ammoType ? AMMO[o.ammoType].name : "Standard ball", "", "ammo")}
        ${tile("armor", "Armor", g.armor ? ITEMS[g.armor].name : "None", g.armor ? `+${armorStats(g.armor, c.armorTier).hp} HP` : "", g.armor || "empty")}
        ${tile("uniform", "Uniform", uni.name, uni.hp ? `+${uni.hp} HP` : "", "uniform")}
        ${tile("sidearm", "Sidearm", SIDEARM.name, "", "pistol")}
        ${Array.from({ length: slots }, (_, i) => tile(`item${i}`, `Utility ${i + 1}`, g.items[i] ? ITEMS[g.items[i] as ItemId].name : "Empty", "", g.items[i] || "empty")).join("")}
      </div>
      <div class="eqdetail">${detail}</div>`;
  }

  /** The operative file in parts, so the quarters can show one part at a time beside the figure (Presentation
   *  overhaul P3) while the Personnel tab shows all of them. */
  function opParts(o: Operative) {
    const pair = perkChoices(o), tw = canTherapy(c, o), rw = canRetrain(c, o);
    void rw;
    const bad = o.traits.filter(t => TRAITS[t].bad);
    return {
      head: `      <div class="label">${esc(o.call)} · ${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}</div>
      <div class="row" style="align-items:center">${portraitSvg(lookOf(o), o.unit, 88)}<h3 class="fac">${esc(fieldName(o))}</h3></div>
      ${o.busy ? `<p class="warn">${o.busy.kind === "therapy" ? "In therapy" : o.busy.kind === "travel" ? "Flying home" : "Retraining"}: ${plural(o.busy.daysLeft, "day")} left. Can't deploy until then.</p>` : ""}`,
      bio: `      ${o.unit ? `<div class="specs">Recruited from the ${esc(UNITS[o.unit].name)} (${esc(UNITS[o.unit].country)}) · ${LEANS[UNITS[o.unit].lean]}${o.bio ? ` · nationality ${esc(nationalityOf(o.bio.home))}` : ""}</div>` : ""}
      <div class="specs">Sex: ${SEX_NAMES[o.sex ?? "m"]}</div>
      ${o.bio ? `<p class="muted">Age ${o.bio.age + Math.floor((c.day - 1) / 365)}, from ${esc(o.bio.home)}. ${esc(o.bio.story)}</p>` : ""}
      <details class="archived"><summary>Rename</summary><div class="row">
        <label class="specs" for="renameName">Full name</label><input id="renameName" maxlength="40" value="${esc(o.name)}">
        <label class="specs" for="renameNick">Nickname</label><input id="renameNick" maxlength="16" value="${esc(o.nick ?? "")}" placeholder="${o.rank >= NICK_RANK ? "none" : "given at Corporal"}">
        <label class="specs" for="renameCall">Callsign</label><input id="renameCall" maxlength="12" value="${esc(o.call)}">
        <button class="act" type="button" id="renameBtn">Save</button></div></details>`,
      record: `      <div class="specs">Service: ${plural(o.missions, "mission")} · ${plural(o.kills, "kill")} · wounded ${o.wounds ?? 0}× · ${(o.seals ?? 0) === 1 ? "1 anomaly" : `${o.seals ?? 0} anomalies`} sealed${o.faced?.length ? ` · faced ${esc(o.faced.join(", "))}` : ""}</div>
      ${o.medals?.length ? `<ul class="traits">${o.medals.map(m => `<li class="good"><b>${MEDALS[m].name}</b>: ${esc(MEDALS[m].bonus)} <span class="muted">${esc(MEDALS[m].how)}</span></li>`).join("")}</ul>` : ""}
      <p class="specs">Fatigue ${o.fatigue ?? 0}/100 (${tiredness(o)}; tired at ${FATIGUE.tired}, can't deploy at ${FATIGUE.exhausted}; −${FATIGUE.restPerDay} a day at Site-19${countOperational(c, "psych") ? `, −${FATIGUE.restPsych} more with psychological services` : ""})${o.injury && o.injury.until > c.day ? ` · <span class="warn">${esc(o.injury.name)} until ${dateText(o.injury.until)}</span>` : ""}</p>
      ${bondsOf(o).length || o.lostBonds?.length ? `<p class="specs">Bonds: ${bondsOf(o).map(b => { const m = c.roster.find(x => x.id === b.id); return m ? `${BOND_NAMES[b.level]} with <b>${esc(m.name)}</b>${m.alive ? "" : " (fallen)"} (${b.n} missions together)` : ""; }).filter(Boolean).join("; ")}${o.lostBonds?.length ? `${bondsOf(o).length ? "; " : ""}lost: ${o.lostBonds.map(esc).join(", ")}` : ""}</p>` : ""}
      <p class="specs">Task force: <b>${esc(TF_NAMES[tfOf(o)])}</b> (for good, from hiring). ${esc(TF_DESC[tfOf(o)])}</p>`,
      retire: `      ${o.busy ? "" : (() => { const tw = trainerWhy(c, o); return `<details class="archived"><summary>Retire</summary>
        <p class="muted">${tw ? `${esc(tw)} They can still leave with an honourable discharge.` : "As a trainer at the range, new recruits arrive as Privates First Class while they're there."}</p>
        <div class="row"><button class="act" type="button" data-retire="${o.id}">${tw ? "Honourable discharge" : "Retire as a trainer"}</button></div></details>`; })()}`,
      appearance: `        ${(() => { const l = lookOf(o), part = (key: string, label: string, value: string) => `<div class="row"><span class="specs" style="min-width:90px">${label}</span><button class="act" type="button" data-look="${key}" data-d="-1" aria-label="Previous ${label.toLowerCase()}">‹</button><span style="min-width:110px">${esc(value)}</span><button class="act" type="button" data-look="${key}" data-d="1" aria-label="Next ${label.toLowerCase()}">›</button></div>`;
          return part("sex", "Sex", SEX_NAMES[o.sex ?? "m"]) + part("skin", "Skin tone", `${l.skin + 1} of ${SKIN.length}`) + part("hair", "Hair", HAIR_STYLES[l.hair]) + part("hairColor", "Hair colour", `${l.hairColor + 1} of ${HAIR_COLORS.length}`)
            + (o.sex === "f" ? "" : part("facial", "Facial hair", FACIAL[l.facial])) + part("scar", "Scar", l.scar ? "Yes" : "No") + (o.unit && HEADGEAR[o.unit] ? part("headgear", "Headgear", l.headgear ? HEADGEAR[o.unit]![0] : "None") : "")
            + part("face", "Face", FACES[l.face ?? 0]) + part("coat", "Jacket", COATS[l.coat ?? 0]) + part("accessory", "Accessory", ACCESSORIES[l.accessory ?? 0]); })()}`,
      abilities: `      ${promotionDue(o) && !o.cls ? `<p><b>Choose a class.</b> It decides the abilities they learn from here on.</p>
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
      ${o.cls && !o.busy ? `<p class="muted">Retraining (a new class, keeping their rank) is arranged at the training range.</p>` : ""}`,
      loadout: equipment(o),
    };
  }
  function opDetail() {
    const o = c.roster.find(x => x.id === opSel && x.alive);
    if (!o) return "";
    const p = opParts(o);
    return `<div class="card plan">${p.head}${p.bio}${p.record}${p.retire}
      <details class="archived" ${lookOpen ? "open" : ""}><summary>Appearance</summary>${p.appearance}</details>
      ${p.abilities}${p.loadout}</div>`;
  }
  /** Presentation overhaul P4: the armory's panel. With nobody at the bench, the squad and their weapons; with an
   *  operative's weapon on it, its mounts, what each takes, a preview with the figures before and after, and the
   *  real fit, removal or workshop order. */
  function armoryPanel() {
    const ao = armOp ? c.roster.find(o => o.id === armOp && o.alive) : undefined;
    if (!ao) return `<div class="card"><div class="label">Armory · choose whose weapon to work on</div>
      <div class="armlist">${c.roster.filter(o => o.alive).map(o => `<button type="button" class="act armop" data-armop="${o.id}"><b>${esc(o.name)}</b><span>${esc(model(c.models[weaponOf(o)]).name)}${o.attachment ? ` · ${esc(ATTACHMENTS[o.attachment].name)}` : ""}</span></button>`).join("")}</div>
      <p class="muted">In stores: ${Object.entries(c.attachments).filter(([, n]) => n).map(([a, n]) => `${esc(ATTACHMENTS[a as AttachmentId].name)} × ${n}`).join(", ") || "no attachments"}.</p></div>`;
    const m = model(c.models[weaponOf(ao)]), now = weaponStats(c, ao);
    const prev = armPreview !== null ? weaponStats(c, ao, armPreview) : null;
    const stat = (label: string, a: string, b?: string) => `<div class="r"><span>${label}</span><span class="v">${esc(a)}${b !== undefined && b !== a ? ` → <b class="${b > a ? "ok" : ""}">${esc(b)}</b>` : ""}</span></div>`;
    const fmt = (s: typeof now) => ({ aim: `${s.aim >= 0 ? "+" : ""}${s.aim}`, crit: `${s.crit}%`, mag: `${s.mag}`, dmg: `${s.dmg[0]}–${s.dmg[1]}` });
    const A = fmt(now), B = prev ? fmt(prev) : undefined;
    const opts = armMount ? attachmentsFor(c, ao, armMount) : [];
    const pv = armPreview;
    const why = pv !== null ? canFitAttachment(c, ao, pv) : null;
    const ordWhy = pv ? canOrderAttachment(c, pv) : null;
    return `<div class="card armbench">
      <div class="label">${esc(ao.call)} · ${esc(ao.name)}</div><h3 class="fac">${esc(m.name)}</h3>
      <div class="rows">${stat("Damage", A.dmg)}${stat("Rounds", A.mag, B?.mag)}${stat("Aim", A.aim, B?.aim)}${stat("Critical", A.crit, B?.crit)}</div>
      ${[...now.notes, ...(prev ? prev.notes.filter(n => !now.notes.includes(n)).map(n => `+ ${n}`) : [])].map(n => `<p class="specs">${esc(n)}</p>`).join("")}
      <p class="specs">Fitted: ${ao.attachment ? esc(ATTACHMENTS[ao.attachment].name) : "nothing"}. One attachment per weapon.</p>
      <div class="label" style="margin-top:8px">Mounts on the ${esc(m.name)}</div>
      <div class="row mounts">${mountsOf(c, ao).map(k => `<button class="act ${armMount === k ? "on" : ""}" type="button" data-mount="${k}" aria-pressed="${armMount === k}">${MOUNT_NAMES[k]}</button>`).join("")}</div>
      ${armMount ? `<div class="armopts">${opts.map(a => { const n = c.attachments[a] ?? 0, fitted = ao.attachment === a, res = unlockedAttachments(c).includes(a);
        return `<button type="button" class="act armopt ${pv === a ? "on" : ""}" data-armprev="${a}" aria-pressed="${pv === a}"><b>${esc(ATTACHMENTS[a].name)}</b><span>${esc(ATTACHMENTS[a].desc)}</span><span class="specs">${fitted ? "Fitted" : !res ? "Not researched" : `${n} in stores`}</span></button>`; }).join("")}</div>` : `<p class="muted">Select a mount on the weapon or above.</p>`}
      ${pv ? `<div class="row">
          ${why ? `<span class="warn">${esc(why)}</span>` : `<button class="act primary" type="button" id="armFit">Fit · 1 from stores${ao.attachment && ao.attachment !== pv ? ` (the ${esc(ATTACHMENTS[ao.attachment].name.toLowerCase())} goes back)` : ""}</button>`}
          ${why && /stores/.test(why) ? `<button class="act" type="button" id="armOrder" ${ordWhy ? `disabled title="${esc(ordWhy)}"` : ""}>Order at the workshop · $${ATTACHMENT_COST.cost}k · ${ATTACHMENT_COST.days} days</button>${ordWhy ? `<span class="muted">${esc(ordWhy)}</span>` : ""}` : ""}
          <button class="act" type="button" id="armCancel">Cancel</button></div>` : ""}
      ${ao.attachment ? `<div class="row"><button class="act" type="button" id="armRemove">Remove the ${esc(ATTACHMENTS[ao.attachment].name.toLowerCase())}</button></div>` : ""}
      <div class="row"><span class="specs">View</span><button class="act" type="button" data-armzoom="-1" aria-label="Zoom out" ${armZoom <= 1 ? "disabled" : ""}>−</button><button class="act" type="button" data-armzoom="1" aria-label="Zoom in" ${armZoom >= 2.2 || !armMount ? "disabled" : ""}>+</button>
        <button class="act" type="button" id="armBack">← Choose another</button><button class="act" type="button" data-enter="surface:quarters">Quarters →</button></div></div>`;
  }

  /** The quarters' focused view: one section of the file at a time. */
  function opFocusPanel(o: Operative) {
    const p = opParts(o);
    const secs: [OpSection, string][] = [["appearance", "Appearance"], ["loadout", "Loadout"], ["abilities", promotionDue(o) || perkChoices(o) ? "Abilities ●" : "Abilities"], ["record", "Service record"], ["bio", "Biography"]];
    const body = opSection === "appearance" ? p.appearance : opSection === "loadout" ? p.loadout : opSection === "abilities" ? p.abilities : opSection === "record" ? p.record + p.retire : p.bio;
    return `<div class="card plan opfocus">${p.head}
      <div class="row opsecs" role="tablist">${secs.map(([k, n]) => `<button class="act ${opSection === k ? "on" : ""}" type="button" role="tab" data-opsec="${k}" aria-selected="${opSection === k}">${n}</button>`).join("")}</div>
      <div class="opsec">${body}</div>
      <div class="row"><button class="act" type="button" id="squadBtn">← The squad</button><button class="act" type="button" data-enter="surface:armory" data-armfor="${o.id}">Their weapon at the armory →</button></div></div>`;
  }

  function opRow(o: Operative) {
    const next = RANK_XP[o.rank + 1], heal = healPerDay(c);
    const days = Math.ceil((o.maxHp - o.hp) / heal);
    const status = o.busy ? `<span class="flag">${o.busy.kind === "therapy" ? "Therapy" : o.busy.kind === "travel" ? "In transit" : "Retraining"} · ${plural(o.busy.daysLeft, "day")}</span>`
      : injured(c, o) ? `<span class="flag bad">${esc(o.injury!.name)} · ${plural(o.injury!.until - c.day, "day")}</span>`
      : tiredness(o) === "exhausted" ? `<span class="flag bad">Exhausted · ${plural(Math.ceil(((o.fatigue ?? 0) - FATIGUE.exhausted + 1) / FATIGUE.restPerDay), "day")}</span>`
      : promotionDue(o) ? `<span class="flag stare">Promotion</span>`
      : o.hp < o.maxHp ? `<span class="flag bad">Wounded · ${plural(days, "day")}</span>`
      : tiredness(o) === "tired" ? `<span class="flag stare">Tired</span>` : `<span class="flag">Ready</span>`;
    const ms = maxSanOf(o);
    return `<button type="button" class="oprow ${opSel === o.id ? "sel" : ""}" data-op="${o.id}">
      <span class="tag">${portraitSvg(lookOf(o), o.unit, 40)}<br>${esc(o.call)}</span>
      <span class="nm">${esc(fieldName(o))} <span class="muted">${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""}</span></span>
      ${status}
      <span class="bars">
        ${(() => { const f = fieldHp(o); return `<span title="${f.why ? `Field HP: ${esc(f.why)}` : "No armor or uniform bonus"}">HP ${f.hp}/${f.max}${f.why ? ` <span class="muted">(+${f.max - o.maxHp} gear)</span>` : ""}<span class="meter" style="--c: var(--mtf)"><span style="width:${(f.hp / f.max) * 100}%"></span></span></span>`; })()}
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
      if (room) { if ((b.dataset.tab || b.dataset.goto) === "site") { leaveRoom(); return; } room = null; }
      target = null; prevRoom = null;
      // arriving at Site-19 from another screen shows the overview, not a room a tab happened to stand in
      if ((b.dataset.tab || b.dataset.goto) === "site" && tab !== "site") sel = null;
      tab = (b.dataset.tab || b.dataset.goto) as Tab;
      if (tab !== "world") speed = 0;   // time only passes on the world map
      try { localStorage.setItem("site19-tab", tab); } catch { /* fine */ }
      render();
    });
    const tryDo = (f: () => string | null | void) => { const why = f(); flashMsg = why || ""; act.save(); render(); };
    // Strategic overhaul B: management actions go through the validated command layer
    const run = (cmd: Command) => { const r = dispatch(c, cmd); flashMsg = r.ok ? "" : r.reason ?? ""; act.save(); render(); };
    on("hireResBtn", () => run({ type: "hireResearcher" }));
    root.querySelectorAll<HTMLElement>("[data-assign]").forEach(b => b.onclick = () => run({ type: "assignResearch", project: b.dataset.assign!, delta: 1 }));
    root.querySelectorAll<HTMLElement>("[data-unassign]").forEach(b => b.onclick = () => run({ type: "assignResearch", project: b.dataset.unassign!, delta: -1 }));
    root.querySelectorAll<HTMLElement>("[data-test]").forEach(b => b.onclick = () => change(() => startTest(c, c.scps.find(x => x.id === testScp(b.dataset.test as TestId))!, b.dataset.test as TestId, chosenWatchers())));
    root.querySelectorAll<HTMLElement>("[data-order]").forEach(b => b.onclick = () => run({ type: "order", item: b.dataset.order as ItemId }));
    root.querySelectorAll<HTMLElement>("[data-sellstore]").forEach(b => b.onclick = () => { const [k, id] = b.dataset.sellstore!.split(":"); change(() => sellStore(c, k as StoreKind, id)); });
    root.querySelectorAll<HTMLElement>("[data-contract]").forEach(b => b.onclick = () => { const id = b.dataset.contract!;
      const pick = [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[data-cpick="${id}"]`)].filter(e => e instanceof HTMLSelectElement || (e as HTMLInputElement).checked).map(e => e.value);
      const x = c.contracts?.offers.find(o => o.id === id), why = x && canAcceptContract(c, x, pick);
      if (why) { flashMsg = why; render(); return; }
      change(() => acceptContract(c, id, pick)); });
    root.querySelectorAll<HTMLSelectElement>("[data-armor]").forEach(b => b.onchange = () => {
      const g = gearOf(b.dataset.armor!); g.armor = b.value as ItemId | "";
      if (g.armor !== "armor_heavy") g.items = g.items.map(i => (i && HEAVY.includes(i) ? "" : i));
      act.save(); render();
    });
    root.querySelectorAll<HTMLSelectElement>("[data-gear]").forEach(b => b.onchange = () => {
      gearOf(b.dataset.gear!).items[Number(b.dataset.slotI)] = b.value as ItemId | "";
      act.save(); render();
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
    root.querySelectorAll<HTMLElement>("[data-hire]").forEach(b => b.onclick = () => { const k = c.recruits?.find(x => x.id === b.dataset.hire); if (k) change(() => hireCandidate(c, k, b.dataset.hiretf === "eta10" ? "eta10" : "e11")); });
    root.querySelectorAll<HTMLElement>("[data-op]").forEach(b => b.onclick = () => { if (opSel !== b.dataset.op) dosTab = "record"; opSel = tab === "personnel" && opSel === b.dataset.op ? null : b.dataset.op!; lookOpen = false; archive = null; reframe = true; render(); });
    // Phase 5: the organization board, and the barracks and armory
    root.querySelectorAll<HTMLSelectElement>("[data-sqmove]").forEach(sel => sel.onchange = () => { const o = c.roster.find(x => x.id === sel.dataset.sqmove); if (!o) return; const why = assignToSquad(c, o, sel.value || undefined); if (why) flashMsg = why; act.save(); render(); });
    root.querySelectorAll<HTMLSelectElement>("select[data-sqspec]").forEach(sel => sel.onchange = () => { const sq = mtfsOf(c).flatMap(m => m.squads).find(x => x.id === sel.dataset.sqspec); if (sq) change(() => { retrainSquad(c, sq, sel.value as SpecialtyId); }); });
    root.querySelectorAll<HTMLElement>("[data-sqrename]").forEach(b => b.onclick = () => { const sq = mtfsOf(c).flatMap(m => m.squads).find(x => x.id === b.dataset.sqrename), v = root.querySelector<HTMLInputElement>(`[data-sqname="${b.dataset.sqrename}"]`)?.value.trim(); if (sq && v) change(() => { sq.name = v; }); });
    root.querySelectorAll<HTMLElement>("[data-addsq]").forEach(b => b.onclick = () => { const m = mtfsOf(c).find(x => x.id === b.dataset.addsq); if (!m) return; const nm = root.querySelector<HTMLInputElement>(`#newSq-${m.id}`)?.value ?? "", sp = root.querySelector<HTMLSelectElement>(`#newSqSpec-${m.id}`)?.value as SpecialtyId; change(() => { const why = addSquad(c, m, nm, sp); if (why) flashMsg = why; }); });
    root.querySelectorAll<HTMLElement>("[data-newmtf]").forEach(b => b.onclick = () => act.newMtf());
    root.querySelectorAll<HTMLElement>("[data-drill]").forEach(b => b.onclick = () => { const sq = mtfsOf(c).flatMap(m => m.squads).find(x => x.id === b.dataset.drill); if (sq) change(() => { const why = drillSquad(c, sq); if (why) flashMsg = why; }); });
    root.querySelectorAll<HTMLElement>("[data-branch]").forEach(b => b.onclick = () => { const sq = mtfsOf(c).flatMap(m => m.squads).find(x => x.id === b.dataset.branch); if (sq) change(() => chooseBranch(sq, b.dataset.b as "speed" | "reliability")); });
    root.querySelectorAll<HTMLElement>("[data-dostab]").forEach(b => b.onclick = () => { dosTab = b.dataset.dostab!; reframe = false; render(); });
    root.querySelectorAll<HTMLElement>("[data-archive]").forEach(b => b.onclick = () => { archive = archive === b.dataset.archive ? null : b.dataset.archive!; if (archive) opSel = null; reframe = true; render(); });
    const toArmory = (id?: string) => { if (id) opSel = id; eqSlot = null; tab = "armory"; try { localStorage.setItem("site19-tab", tab); } catch { /* fine */ } render(); };
    root.querySelectorAll<HTMLElement>("[data-gotoarmory]").forEach(b => b.onclick = () => {
      const stage = root.querySelector<HTMLElement>("[data-stage=barracks]");
      if (stage && !b.dataset.gotoarmory) leaveToward(stage, "barracks", -BARRACKS_ROOM.w / 2 + 90, -BARRACKS_ROOM.d / 2, () => toArmory());
      else toArmory(b.dataset.gotoarmory);
    });
    root.querySelectorAll<HTMLElement>("[data-gotobarracks]").forEach(b => b.onclick = () => { tab = "personnel"; reframe = true; try { localStorage.setItem("site19-tab", tab); } catch { /* fine */ } render(); });
    root.querySelectorAll<HTMLElement>("[data-resfocus]").forEach(b => b.onclick = () => {
      const id = b.dataset.resfocus!, find = () => root.querySelector<HTMLElement>(`[data-assign="${id}"]`)?.closest<HTMLElement>(".proj") ?? null;
      let card = find();
      if (!card) { resCat = researchCat(id); render(); card = find(); }   // it's under another category tab
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
    });
    root.querySelectorAll<HTMLElement>("[data-armsel]").forEach(b => b.onclick = () => { opSel = b.dataset.armsel!; eqSlot = null; render(); });
    root.querySelectorAll<HTMLElement>("[data-shelfitem]").forEach(b => b.onclick = () => {
      const o = c.roster.find(x => x.id === opSel) ?? c.roster.find(x => x.alive); if (!o) return;
      const g = gearOf(o.id), slots = o.perks.includes("field_kit") ? 3 : 2, item = b.dataset.shelfitem as ItemId;
      let i = eqSlot?.startsWith("item") ? Number(eqSlot.slice(4)) : -1;
      if (i < 0) i = Array.from({ length: slots }, (_, k) => k).find(k => !g.items[k]) ?? -1;
      if (i < 0) { eqSlot = "item0"; flashMsg = ""; render(); return; }   // every slot full: pick which one to swap
      opSel = o.id; eqSlot = `item${i}`;
      change(() => { g.items[i] = g.items[i] === item ? "" : item; });
    });
    root.querySelectorAll<HTMLElement>("[data-squadpick]").forEach(b => b.onclick = () => {
      squadPick = b.dataset.squadpick!; chosen.clear();
      const pl = c.incidents.find(i => i.id === planning); if (pl) for (const o of readyFor(pl).slice(0, squadSize(c))) chosen.add(o.id);
      render();
    });
    const opNow = () => c.roster.find(x => x.id === opSel)!;
    root.querySelectorAll<HTMLElement>("[data-class]").forEach(b => b.onclick = () => change(() => chooseClass(c, opNow(), b.dataset.class as ClassId)));
    root.querySelectorAll<HTMLElement>("[data-perk]").forEach(b => b.onclick = () => change(() => choosePerk(c, opNow(), b.dataset.perk as PerkId)));
    const opById = (id?: string) => c.roster.find(x => x.id === id);
    root.querySelectorAll<HTMLElement>("[data-therapy]").forEach(b => b.onclick = () => { const o = opById(b.dataset.op); if (o) change(() => startTherapy(c, o, b.dataset.therapy as TraitId)); });
    root.querySelectorAll<HTMLElement>("[data-retrain]").forEach(b => b.onclick = () => { const o = opById(b.dataset.retrain); if (o) change(() => startRetrain(c, o)); });
    root.querySelectorAll<HTMLElement>("[data-hireguard]").forEach(b => b.onclick = () => run({ type: "hireGuard", stationId: b.dataset.hireguard! }));
    root.querySelectorAll<HTMLElement>("[data-post]").forEach(b => b.onclick = () => { const g = c.guards.find(x => x.id === b.dataset.post); if (g) run({ type: "postGuard", guardId: g.id, stationId: b.dataset.station! }); });
    root.querySelectorAll<HTMLElement>("[data-rescat]").forEach(b => b.onclick = () => { resCat = b.dataset.rescat as ResearchCat; resCatPicked = true; render(); });
    root.querySelectorAll<HTMLElement>("[data-eqslot]").forEach(b => b.onclick = () => { eqSlot = eqSlot === b.dataset.eqslot ? null : b.dataset.eqslot!; render(); });
    root.querySelectorAll<HTMLElement>("[data-fitatt]").forEach(b => b.onclick = () => { if (tab === "armory") eqSlot = null; run({ type: "fitAttachment", opId: opNow().id, attachment: b.dataset.fitatt as AttachmentId | "" }); });
    root.querySelectorAll<HTMLElement>("[data-loadammo]").forEach(b => b.onclick = () => change(() => loadAmmo(c, opNow(), b.dataset.loadammo as AmmoId | "")));
    root.querySelectorAll<HTMLElement>("[data-kitarmor]").forEach(b => b.onclick = () => change(() => { const g = gearOf(opNow().id); g.armor = b.dataset.kitarmor as ItemId | ""; if (g.armor !== "armor_heavy") g.items = g.items.map(i => (i && HEAVY.includes(i) ? "" : i)); }));
    root.querySelectorAll<HTMLElement>("[data-kititem]").forEach(b => b.onclick = () => change(() => { gearOf(opNow().id).items[Number((eqSlot ?? "item0").slice(4))] = b.dataset.kititem as ItemId | ""; }));
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
    root.querySelectorAll<HTMLElement>("[data-repair]").forEach(b => b.onclick = () => run({ type: "repair", facilityId: b.dataset.repair! }));
    root.querySelectorAll<HTMLElement>("[data-refit]").forEach(b => b.onclick = () => change(() => orderRefit(c, b.dataset.refit!)));
    root.querySelectorAll<HTMLElement>("[data-att]").forEach(b => b.onclick = () => change(() => orderAttachment(c, b.dataset.att as AttachmentId)));
    on("intelBtn", () => { const inc = c.incidents.find(i => i.id === planning); if (inc) change(() => weaken(c, inc)); });
    { const el = $("cleanOrder") as HTMLInputElement | null; if (el) el.onchange = () => change(() => { c.cleaningOrder = el.checked; }); }
    on("dBuyBtn", () => change(() => buyDClass(c)));
    on("engBtn", () => run({ type: "hireEngineer" }));
    on("digBtn", () => run({ type: "excavate" }));
    root.querySelectorAll<HTMLElement>("[data-evac]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.evac), f = c.base.facilities.find(x => x.id === b.dataset.to); if (s && f) change(() => evacuate(c, s, f, chosenWatchers())); });
    root.querySelectorAll<HTMLElement>("[data-refit]").forEach(b => b.onclick = () => run({ type: "refitGenerator", facilityId: b.dataset.refit! }));
    on("eta10Btn", () => change(() => formEta10(c)));
    on("nu7Btn", () => change(() => attachNu7(c)));
    on("agentBtn", () => change(() => hireAgent(c)));
    root.querySelectorAll<HTMLElement>("[data-sell]").forEach(b => b.onclick = () => change(() => sellWeapons(c, b.dataset.sell!)));
    root.querySelectorAll<HTMLElement>("[data-borrow]").forEach(b => b.onclick = () => change(() => borrow(c, b.dataset.site!, b.dataset.borrow as "engineers" | "guards")));
    root.querySelectorAll<HTMLElement>("[data-tf]").forEach(b => b.onclick = () => { tfPick = b.dataset.tf as TaskForce; chosen.clear(); render(); });
    root.querySelectorAll<HTMLInputElement>("[data-extra]").forEach(b => b.onchange = () => { extras[b.dataset.extra as keyof Extras] = b.checked; });
    root.querySelectorAll<HTMLElement>("[data-disrupt]").forEach(b => b.onclick = () => change(() => disrupt(c, b.dataset.disrupt!)));
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(b => b.onclick = () => change(() => reveal(c, b.dataset.reveal!)));
    root.querySelectorAll<HTMLElement>("[data-inquiry]").forEach(b => b.onclick = () => change(() => investigateBreach(c, b.dataset.inquiry!)));
    root.querySelectorAll<HTMLElement>("[data-offer]").forEach(b => b.onclick = () => change(() => answerOffer(c, b.dataset.offer!, !!b.dataset.yes)));
    root.querySelectorAll<HTMLElement>("[data-request]").forEach(b => b.onclick = () => change(() => makeRequest(c, b.dataset.request as RequestId)));
    root.querySelectorAll<HTMLElement>("[data-pill]").forEach(b => b.onclick = () => { const o = c.roster.find(x => x.id === b.dataset.pill); if (o) change(() => givePill(c, o)); });
    root.querySelectorAll<HTMLElement>("[data-refine]").forEach(b => b.onclick = () => change(() => refine(c, b.dataset.refine as ItemId)));
    root.querySelectorAll<HTMLElement>("[data-sendaway]").forEach(b => b.onclick = () => {
      const s = c.scps.find(x => x.id === b.dataset.sendaway);
      if (s && twice(b, `away-${s.id}-${b.dataset.site}`, `Send ${s.name} away for good? Click again`)) change(() => sendAway(c, s.id, b.dataset.site!));
    });
    root.querySelectorAll<HTMLElement>("[data-contact]").forEach(b => b.onclick = () => change(() => makeContact(c, b.dataset.contact as RegionId)));
    root.querySelectorAll<HTMLElement>("[data-transfer]").forEach(b => b.onclick = () => { const s = c.scps.find(x => x.id === b.dataset.transfer); if (s) change(() => transferOut(c, s)); });
    root.querySelectorAll<HTMLElement>("[data-clean]").forEach(b => b.onclick = () => run({ type: "cleanCell", scpId: b.dataset.clean! }));
    root.querySelectorAll<HTMLElement>("[data-alert]").forEach(b => b.onclick = () => run({ type: "setAlert", level: b.dataset.alert as Alert }));
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
      else { const kk = k as keyof typeof LOOK_PARTS, n = LOOK_PARTS[kk]; (l as unknown as Record<string, unknown>)[kk] = (((l as unknown as Record<string, number | undefined>)[kk] ?? 0) + d + n) % n; }
      change(() => { o.look = l; });
    });
    on("menuBtn", () => act.menu());
    on("renameBtn", () => {
      const o = c.roster.find(x => x.id === opSel), n = root.querySelector<HTMLInputElement>("#renameName")!.value.trim(), k = root.querySelector<HTMLInputElement>("#renameCall")!.value.trim();
      const nk = root.querySelector<HTMLInputElement>("#renameNick")!.value.trim().replace(/"/g, "");
      if (o && n && k) change(() => { o.name = n.slice(0, 40); o.call = k.slice(0, 12); o.nick = nk ? nk.slice(0, 16) : undefined; });
    });
    root.querySelectorAll<HTMLElement>("[data-staff]").forEach(b => b.onclick = () => change(() => answerStaff(c, Number(b.dataset.staff) as 0 | 1)));
    root.querySelectorAll<HTMLElement>("[data-guards]").forEach(b => b.onclick = () => { const inc = c.incidents.find(i => i.id === b.dataset.guards); if (inc) change(() => inc.kind === "riot" ? letGuardsHandleRiot(c, inc) : inc.kind === "raid" ? letGuardsHandleRaid(c, inc) : letGuardsHandle(c, inc)); });
    root.querySelectorAll<HTMLElement>("[data-train]").forEach(b => b.onclick = () => change(() => train(c, b.dataset.train!)));
    root.querySelectorAll<HTMLElement>("[data-promote]").forEach(b => b.onclick = () => { const g = c.guards.find(x => x.id === b.dataset.promote); if (g) change(() => promoteGuard(c, g)); });
    on("recBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) run({ type: "addRecreation", facilityId: f.id }); });
    { const el = root.querySelector<HTMLSelectElement>("[data-dpolicy]"); if (el) el.onchange = () => change(() => { c.dPolicy = el.value as Campaign["dPolicy"]; }); }
    on("upgradeBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) run({ type: "upgrade", facilityId: f.id }); });
    on("demolishBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) run({ type: "demolish", facilityId: f.id }); });
    on("repairBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) run({ type: "repair", facilityId: f.id }); });
    on("moveBtn", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) change(() => moveScp(c, scp173(), f, chosenWatchers())); });
    root.querySelectorAll<HTMLElement>("[data-slot]").forEach(b => b.onclick = () => {
      const [level, slot] = b.dataset.slot!.split(",").map(Number);
      const f = facilityAt(c, level, slot);
      if (f && root.querySelector(".screen-site")) { sel = { level, slot }; enterRoom(f.id, b.getBoundingClientRect()); return; }
      sel = sel && sel.level === level && sel.slot === slot ? null : { level, slot };
      render();
    });
    root.querySelectorAll<HTMLElement>("[data-enter]").forEach(b => b.onclick = () => { if (b.dataset.armfor) { armOp = b.dataset.armfor; armMount = null; armPreview = null; armZoom = 1; } enterRoom(b.dataset.enter!, b.getBoundingClientRect()); if (b.dataset.armfor) { target = "bench"; render(); } });
    on("enterRoom", () => { const f = sel && facilityAt(c, sel.level, sel.slot); if (f) enterRoom(f.id, null); });
    on("leaveRoom", () => leaveRoom());
    // the room fills the window below the header, whatever the header's height at this width
    { const rv = root.querySelector<HTMLElement>(".roomview"); if (rv) rv.style.setProperty("--rvh", `${Math.max(380, Math.round(window.innerHeight - rv.getBoundingClientRect().top - window.scrollY - 14))}px`); }
    // environment-first: the room's objects, the panel, the way back
    const pickTarget = (id: string) => {
      const L = currentRoom() ? roomLayout(c, currentRoom()!) : null; if (!L) return;
      const t = targetsFor(L, { armOp: !!armOp }).find(x => x.id === id);
      if (t?.panel === "go:world") { target = null; tab = "world"; render(); return; }
      if (t?.panel === "go:armory") { if (opSel) { armOp = opSel; armMount = null; armPreview = null; armZoom = 1; } const r = root.querySelector(`[data-target="${id}"]`)?.getBoundingClientRect() ?? null; enterRoom("surface:armory", r); if (armOp) { target = "bench"; render(); } return; }
      target = target === id ? null : id;
      if (id === "bench" && !armOp) target = "racks";
      render();
    };
    root.querySelectorAll<HTMLElement>("[data-target]").forEach(b => { b.onclick = () => pickTarget(b.dataset.target!); b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickTarget(b.dataset.target!); } }; });
    on("ctxClose", () => { target = null; render(); });
    on("ctxWide", () => { ctxWide = !ctxWide; render(); });
    on("roomBack", () => { if (prevRoom) { const p = prevRoom; prevRoom = null; target = null; if (p.tab === "site") room = p.id; else { room = null; } tab = p.tab; render(); } });
    root.querySelectorAll<HTMLElement>("[data-labpick]").forEach(b => b.onclick = () => { labPick = b.dataset.labpick!; if (tab === "site") room = labPick; target = null; render(); });
    root.querySelectorAll<HTMLElement>("[data-roomstep]").forEach(b => b.onclick = () => stepRoom(b.dataset.roomstep!));
    root.querySelectorAll<HTMLElement>("[data-person]").forEach(b => { const pick = () => { opSel = b.dataset.person!; target = `person:${opSel}`; render(); }; b.onclick = pick; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }; });
    on("fxToggle", () => { setTransitions(!transitionsSetting()); render(); });
    root.querySelectorAll<HTMLElement>("[data-opsec]").forEach(b => b.onclick = () => { opSection = b.dataset.opsec as OpSection; render(); });
    on("squadBtn", () => { target = null; render(); });
    root.querySelectorAll<HTMLElement>("[data-resfocus]").forEach(b => b.onclick = () => { resFocus = b.dataset.resfocus!; justDone = null; render(); });
    // the armory bench
    root.querySelectorAll<HTMLElement>("[data-armop]").forEach(b => b.onclick = () => { armOp = b.dataset.armop!; armMount = null; armPreview = null; armZoom = 1; target = "bench"; render(); });
    root.querySelectorAll<HTMLElement>("[data-mount]").forEach(b => { const pick = () => { armMount = b.dataset.mount as MountId; armPreview = null; render(); }; b.onclick = pick; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }; });
    root.querySelectorAll<HTMLElement>("[data-armprev]").forEach(b => b.onclick = () => { armPreview = b.dataset.armprev as AttachmentId; render(); });
    root.querySelectorAll<HTMLElement>("[data-armzoom]").forEach(b => b.onclick = () => { armZoom = Math.max(1, Math.min(2.2, armZoom + Number(b.dataset.armzoom) * 0.6)); render(); });
    on("armCancel", () => { armPreview = null; render(); });
    on("armBack", () => { armOp = null; armMount = null; armPreview = null; armZoom = 1; target = "racks"; render(); });
    on("armFit", () => { if (armOp && armPreview !== null) { run({ type: "fitAttachment", opId: armOp, attachment: armPreview }); armPreview = null; } });
    on("armRemove", () => { if (armOp) { run({ type: "fitAttachment", opId: armOp, attachment: "" }); armPreview = null; } });
    on("armOrder", () => { if (armPreview) run({ type: "orderAttachment", attachment: armPreview }); });
    root.querySelectorAll<HTMLElement>("[data-build]").forEach(b => b.onclick = () => {
      if (!sel) return;
      const { level, slot } = sel;
      run({ type: "build", facility: b.dataset.build as FacilityType, level, slot });
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
    root.querySelectorAll<HTMLElement>("[data-maplead]").forEach(b => { const pick = () => { mapSel = "lead:" + b.dataset.maplead; planning = null; flashMsg = ""; tab = "world"; render(); };
      b.onclick = pick; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }; });
    root.querySelectorAll<HTMLElement>("[data-leadact]").forEach(b => b.onclick = () => { const [id, a] = b.dataset.leadact!.split(":");
      change(() => { const inc = leadAction(c, id, a as LeadAction); mapSel = inc ? "inc:" + inc.id : null; }); });
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
      if (z === "world") { const [s19x] = project(siteOf19(c).lon, siteOf19(c).lat); geoView = clampView({ x: s19x - WORLD_VIEW.w / 2, y: WORLD_VIEW.y, w: WORLD_VIEW.w, h: 0 }); }
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
      if (planning) squadPick = null;
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
    on("autoBtn", () => { const inc = c.incidents.find(i => i.id === planning); if (!inc) return;
      const team = [...chosen].map(id => c.roster.find(o => o.id === id)!).filter(Boolean);
      change(() => { dispatchTeam(c, inc, team); chosen.clear(); planning = null; }); });
    on("launchBtn", () => {
      const inc = c.incidents.find(i => i.id === planning);
      if (!inc || (!chosen.size && !((inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid") && guardsReady(c).length))) return;
      if (inc.kind === "riot") chosen.clear();   // only Site Security answers a riot
      const loadouts: Loadout[] = [...chosen].map(id => {
        const g = gearOf(id);
        return { opId: id, armor: g.armor, items: g.items.filter((i): i is ItemId => !!i) };
      });
      act.deploy(inc, inc.kind === "riot" ? [] : loadouts, ["strike", "coverup", "escort", "retaliation", "outbreak", "riot", "raid", "rescue", "emergency"].includes(inc.kind) ? 0 : dCount, { ...extras });
      extras.researcher = extras.amnestics = extras.nu7 = false;
    });
    on("campaignsBtn", () => { dlg = { view: "slots" }; render(); });
    on("siteOverview", () => { sel = null; render(); });
    root.querySelectorAll<HTMLElement>("[data-brief]").forEach(b => b.onclick = () => {
      const [t, focus] = b.dataset.brief!.split("|");
      tab = (t === "history" ? "history" : t) as Tab;
      if (tab !== "world") speed = 0;
      if (focus) {
        if (tab === "world") pendingMapSel = "inc:" + focus;
        else if (tab === "command" && c.incidents.some(i => i.id === focus)) planning = focus;
        else if (tab === "site") { const f = c.base.facilities.find(x => x.id === focus); if (f) { sel = { level: f.level, slot: f.slot }; room = f.id; } }
        else if (tab === "personnel") opSel = focus;
      }
      render();
    });
    on("creditsBtn", () => { creditsOpen = true; render(); });
    on("creditsClose", () => { creditsOpen = false; render(); });
    root.querySelectorAll<HTMLElement>("[data-coach]").forEach(b => b.onclick = () => change(() => { c.tutorial?.seen.push(b.dataset.coach!); }));
    on("coachOff", () => change(() => { if (c.tutorial) c.tutorial.on = false; }));
    on("overBtn", () => { dlg = { view: "slots" }; render(); });
    on("dlgClose", () => { dlg = null; render(); });
    root.querySelectorAll<HTMLElement>("[data-slotload]").forEach(b => b.onclick = () => { dlg = null; act.loadSlot(Number(b.dataset.slotload) as Slot); });
    root.querySelectorAll<HTMLElement>("[data-slotnew]").forEach(b => b.onclick = () => { dlg = { view: "new", slot: Number(b.dataset.slotnew) as Slot, difficulty: "agent", ironman: false, tutorial: true }; render(); });
    root.querySelectorAll<HTMLElement>("[data-slotdel]").forEach(b => b.onclick = () => { const s = Number(b.dataset.slotdel) as Slot; if (twice(b, `del-${s}`, "Delete it for good? Click again")) { clearSlot(s); render(); } });
    root.querySelectorAll<HTMLInputElement>("[data-diff]").forEach(b => b.onchange = () => { if (dlg?.view === "new") dlg.difficulty = b.value as Difficulty; render(); });
    { const im = root.querySelector<HTMLInputElement>("#dlgIron"); if (im) im.onchange = () => { if (dlg?.view === "new") dlg.ironman = im.checked; }; }
    { const tu = root.querySelector<HTMLInputElement>("#dlgTut"); if (tu) tu.onchange = () => { if (dlg?.view === "new") dlg.tutorial = tu.checked; }; }
    on("dlgStart", () => {
      if (dlg?.view !== "new") return;
      const filled = slotSummary(dlg.slot) || dlg.slot === activeSlot();
      if (filled && !twice($("dlgStart")!, `new-${dlg.slot}`, `Erase slot ${dlg.slot} and start? Click again`)) return;
      const d = dlg; dlg = null;
      act.newCampaign({ difficulty: d.difficulty, ironman: d.ironman, tutorial: d.tutorial }, d.slot);
    });
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
        if (night && now - lastNight > 80) { lastNight = now; night.setAttribute("points", nightPoints()); const fg = root.querySelector("#flightsG"); if (fg) fg.innerHTML = flightMarkup(lastK); }

        const gd = root.querySelector<HTMLElement>(".geodate"); if (gd) gd.textContent = `${dateText(c.day)} · ${String(Math.floor(c.hour ?? 0)).padStart(2, "0")}:00`;
      }
    }
    // the squad has landed: the mission starts
    if (c.outbound && c.day + (c.hour ?? 0) / 24 >= c.outbound.arrive && !c.notices?.length) { speed = 0; act.arrive(); return; }
    requestAnimationFrame(tick);
  };
  let redrawLater = false;
  const busyField = () => { const a = document.activeElement; return !!a && root.contains(a) && a.matches("select,input,textarea"); };
  root.addEventListener("focusout", () => { if (redrawLater) { redrawLater = false; setTimeout(() => { if (!busyField()) render(); else redrawLater = true; }, 0); } });
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (!stillHere() || (t.closest && t.closest("input,textarea,select"))) return;
    if (inRoomScreen()) {
      // Esc puts the panel away first, then leaves the room
      if (e.key === "Escape") { e.preventDefault(); if (target) { target = null; render(); } else leaveRoom(); }
      else if ((e.key === "[" || e.key === "]") && tab === "site") { const list = allRooms(c), i = list.findIndex(r => r.id === room); if (i >= 0) stepRoom(list[(i + (e.key === "]" ? 1 : list.length - 1)) % list.length].id); }
      return;
    }
    if (tab !== "world") return;
    if (e.key === " ") { e.preventDefault(); setSpeed(speed ? 0 : lastSpeed); }
    else if (["1", "2", "3"].includes(e.key)) setSpeed(SPEEDS[Number(e.key) - 1]);
  };
  document.addEventListener("keydown", onKey);
  // the room keeps filling the window as it is resized
  const onResize = () => { if (!stillHere()) { window.removeEventListener("resize", onResize); return; } const rv = root.querySelector<HTMLElement>(".roomview"); if (rv) rv.style.setProperty("--rvh", `${Math.max(380, Math.round(window.innerHeight - rv.getBoundingClientRect().top - window.scrollY - 14))}px`); };
  window.addEventListener("resize", onResize);
  requestAnimationFrame(tick);

  render();
  window.scrollTo(0, 0);
}
