// Debug menu for testing. Opens with the backtick key, or a button when the page URL has ?debug.
// Anything it does to a campaign marks that save as a debug save.
import { RANK_XP, RANKS, advanceDay, dateText, gainIntel, log, maxSanOf, pendingBreach, startRiot, type Campaign } from "../campaign/campaign";
import { tickConstruction } from "../campaign/base";
import { PROJECTS, projectDays, tickResearch } from "../campaign/research";
import { captureNow, firstSighting, resurface, startBreach, wreckFacility } from "../campaign/containment";
import { addExposure, locateCell, spawnCoverup, locateIntel } from "../campaign/world";
import { newGuard, startRaid, type Alert } from "../campaign/security";
import { inspect } from "../campaign/inspection";
import { addStanding, crisis, issueDirectives, newOffer, receive } from "../campaign/council";
import type { ScpId } from "../game/types";
import { STAFF_EVENTS, monthlyStaff, type StaffEventId } from "../campaign/staff";
import { REGIONS, REGION_IDS, type RegionId } from "../data/regions";
import { S } from "../game/state";
import { debugAfter, debugArrive, debugFinish } from "../game/turn";
import { esc } from "./util";

export interface DebugHost {
  campaign: () => Campaign;
  /** Which screen is up. */
  screen: () => "hub" | "mission";
  /** Save and redraw the hub after a change. */
  refresh: () => void;
}

const START = Date.UTC(1951, 5, 1);
const dayOfYear = (y: number) => Math.round((Date.UTC(y, 0, 1) - START) / 86400000) + 1;

export function mountDebug(host: DebugHost) {
  const panel = document.createElement("aside");
  panel.className = "debug";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Debug menu");
  document.body.appendChild(panel);
  let region: RegionId = "east_us", insurgents = 2, note = "";

  if (/[?&]debug\b/.test(location.search)) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "act debug-toggle"; b.textContent = "Debug";
    b.onclick = toggle;
    document.body.appendChild(b);
  }
  document.addEventListener("keydown", e => {
    const t = e.target as HTMLElement;
    if (e.key === "`" && !(t.closest && t.closest("input,textarea,select"))) { e.preventDefault(); toggle(); }
  });

  function toggle() { panel.hidden = !panel.hidden; if (!panel.hidden) render(); }

  const btn = (id: string, label: string) => `<button class="act" type="button" data-dbg="${id}">${esc(label)}</button>`;
  const group = (title: string, body: string) => `<div class="dbg-group"><div class="label">${title}</div><div class="dbg-row">${body}</div></div>`;

  function render() {
    const c = host.campaign();
    const inMission = host.screen() === "mission" && !!S && !S.over;
    panel.innerHTML = `
      <div class="dbg-head"><b>Debug</b><span class="muted">${dateText(c.day)} · press \` to close</span><button class="act" type="button" data-dbg="close">Close</button></div>
      ${note ? `<p class="dbg-note">${esc(note)}</p>` : ""}
      ${inMission ? missionPanel() : hubPanel(c)}`;
  }

  function hubPanel(c: Campaign) {
    return [
      group("Resources", btn("funds", "+$500k") + btn("intel", "+5 Intel") + btn("amnestics", "+5 amnestics") + btn("dclass", "+4 D-Class") + btn("engineers", "+2 engineers") + btn("researchers", "+2 researchers") + btn("guards", "+2 guards")),
      group("Time", btn("d1", "+1 day") + btn("d7", "+7 days") + btn("d30", "+30 days") + btn("d365", "+1 year")
        + `<label class="dbg-field">Jump to year <select data-dbg-year>${Array.from({ length: 25 }, (_, i) => 1951 + i).map(y => `<option ${y === new Date(START + (c.day - 1) * 864e5).getUTCFullYear() ? "selected" : ""}>${y}</option>`).join("")}</select></label>`),
      group("Spawn incident",
        `<label class="dbg-field">Region <select data-dbg-region>${REGION_IDS.map(r => `<option value="${r}" ${r === region ? "selected" : ""}>${esc(REGIONS[r].name)}</option>`).join("")}</select></label>`
        + `<label class="dbg-field">Insurgents <input type="number" min="0" max="8" value="${insurgents}" data-dbg-ins></label>`
        + btn("breach", "Breach at Site-19") + btn("manhunt", "Manhunt") + btn("coverup", "Cover-up") + btn("strike", "Strike") + btn("riot", "D-Class riot") + btn("raid", "Insurgency raid")),
      group("Research and building", btn("materials", "+5 of every material") + btn("offer", "Offer a breakthrough") + btn("research", "Finish current research") + btn("unlockall", "Unlock all research") + btn("build", "Finish construction and orders") + btn("genfail", "Generator fault") + btn("inspwarn", "O5 inspection in 14 days") + btn("inspnow", "O5 inspection now")),
      group("O5 Council", btn("st+20", "+20 standing") + btn("st-20", "−20 standing") + btn("orders", "New orders") + btn("xoffer", "Transfer offer") + btn("crisis", "Forced choice") + btn("contactall", "Contact every region") + btn("get500", "Receive SCP-500") + btn("get914", "Receive SCP-914") + btn("get005", "Receive SCP-005")),
      group("Operatives and guards", btn("heal", "Heal everyone") + btn("sanity", "Restore sanity") + btn("unbusy", "Clear busy and training") + btn("rankup", "+1 rank to all operatives") + btn("guardvet", "Guards: 3 breaches survived")),
      group("Alert level", (["normal", "heightened", "full"] as Alert[]).map(a => btn("alert-" + a, a)).join("")),
      group(`World · ${esc(REGIONS[region].name)} (exposure ${c.regions[region].exposure}${c.regions[region].collapsed ? ", collapsed" : ""})`,
        btn("exp-10", "−10 exposure") + btn("exp+10", "+10 exposure") + btn("exp0", "Set to 0") + btn("collapse", "Collapse") + btn("restore", "Restore")),
      group(`SCP-173 (${c.scps[0].status})`, btn("s-contained", "Contained") + btn("s-breach", "Breach now") + btn("s-loose", "Loose")),
      ...(["049", "106"] as const).map(id => group(`SCP-${id} (${c.scps.find(s => s.id === id)?.status ?? (c.sightings[id] ? `first sighting ${dateText(c.sightings[id]!)}` : "not held")})`,
        btn("see" + id, "First sighting now") + btn("get" + id, "Capture into a free wing") + btn("breach" + id, "Breach now"))),
      group(`SCP-610 (${c.outbreak ? `severity ${c.outbreak.severity} in ${REGIONS[c.outbreak.region].name}` : c.outbreakDay ? `first outbreak ${dateText(c.outbreakDay)}` : "none"})`, btn("outbreak", "Start the outbreak now") + btn("worsen", "Severity +1")),
      group(`Staff incidents${c.staffEvent ? ` (waiting: ${STAFF_EVENTS[c.staffEvent.id].title.toLowerCase()})` : ""}`, (Object.keys(STAFF_EVENTS) as StaffEventId[]).map(id => btn("staff-" + id, STAFF_EVENTS[id].title)).join("")),
      group("Save", `<span class="muted">${c.debug ? "This campaign is marked as a debug save." : "Untouched by debug so far."}</span>`),
    ].join("");
  }

  function missionPanel() {
    const st = S.statue;
    return [
      group("Map", btn("reveal", "Reveal the whole map")),
      group("Outcome", btn("win", "Win now") + btn("lose", "Lose now")),
      group("Squad", btn("refill", "Refill actions and ammo") + btn("god", "Make the team invincible") + btn("arrive", "Reinforcements arrive now")),
      group("Kill", btn("killpick", S.debug?.kill ? "Click a unit on the map…" : "Kill a clicked unit") + btn("killci", "Kill all Insurgents")),
      S.has173 ? group(`SCP-173 · escape drive ${S.escapeDrive}`, btn("freeze", S.debug?.freeze173 ? "Unfreeze SCP-173" : "Freeze SCP-173") + btn("place", S.debug?.place173 ? "Click a tile on the map…" : "Teleport SCP-173")
        + btn("drive+", "Escape drive +5") + btn("drive0", "Reset escape drive") + `<span class="muted">At ${st.x},${st.y}</span>`) : "",
    ].join("");
  }

  function campaignAction(id: string, c: Campaign) {
    const id_ = id;
    const s = c.scps[0];
    const days = (n: number) => {
      for (let i = 0; i < n && !c.over; i++) {
        if (pendingBreach(c)) { note = `Stopped on ${dateText(c.day)}: a breach needs an answer.`; return; }
        advanceDay(c);
      }
    };
    switch (id) {
      case "funds": c.funds += 500; break;
      case "intel": gainIntel(c, 5); break;
      case "amnestics": c.amnestics += 5; break;
      case "dclass": c.dclass += 4; break;
      case "engineers": c.engineers += 2; break;
      case "researchers": c.researchers += 2; break;
      case "guards": for (let i = 0; i < 2; i++) c.guards.push(newGuard(c)); break;
      case "d1": days(1); break;
      case "d7": days(7); break;
      case "d30": days(30); break;
      case "d365": days(365); break;
      case "breach": if (s.status === "contained") { startBreach(c, s, "Debug:"); setIns(c); } else note = "SCP-173 has to be contained to breach."; break;
      case "manhunt": if (s.status !== "breach") { s.status = "loose"; resurface(c, s, region); setIns(c); } else note = "Answer the current breach first."; break;
      case "coverup": spawnCoverup(c, region); setIns(c); break;
      case "strike": c.intel += locateIntel(c); locateCell(c, region); setIns(c); break;
      case "research": {
        for (const [p, n] of Object.entries(c.research.assigned)) if (n) c.research.progress[p] = Math.max(c.research.progress[p] || 0, projectDays(c, p) - n);
        tickResearch(c); break;
      }
      case "materials": for (const m of ["ciWeapons", "prisoners", "intelTotal", "tissue", "survivors"] as const) c.materials[m] = (c.materials[m] ?? 0) + 5; break;
      case "offer": {
        const pool = Object.keys(PROJECTS).filter(p => PROJECTS[p].breakthrough && !c.research.done.includes(p));
        if (pool.length) c.research.offer = { id: pool[Math.floor(Math.random() * pool.length)], until: c.day + 30 }; else note = "Every breakthrough is done.";
        break;
      }
      case "unlockall":
        for (const p of Object.keys(PROJECTS)) if (!c.research.done.includes(p) && !PROJECTS[p].breakthrough) c.research.done.push(p);
        for (const o of c.roster) o.sanBonus = 10;
        c.research.assigned = {}; c.armorTier = Math.max(c.armorTier, 1);
        log(c, "Debug: all research unlocked. Weapon and armor refits still go through the workshop.", "key");
        break;
      case "build":
        for (const f of c.base.facilities) { if (f.daysLeft > 0) f.daysLeft = 1; if (f.repairDays > 0) f.repairDays = 1; }
        if (c.base.excavation > 0) c.base.excavation = 1;
        for (const line of tickConstruction(c)) log(c, line, "good");
        for (const o of c.orders) o.daysLeft = 1;
        tickResearch(c);
        break;
      case "heal": for (const o of c.roster) if (o.alive) o.hp = o.maxHp; for (const g of c.guards) if (g.alive) g.hp = g.maxHp; break;
      case "sanity": for (const o of c.roster) if (o.alive) o.san = maxSanOf(o); for (const g of c.guards) if (g.alive) g.san = 80; break;
      case "unbusy": for (const o of c.roster) o.busy = undefined; for (const g of c.guards) g.training = undefined; break;
      case "rankup": for (const o of c.roster) if (o.alive && o.rank < RANKS.length - 1) { o.rank++; o.xp = Math.max(o.xp, RANK_XP[o.rank]); } break;
      case "staff-breakdown": case "staff-asleep": case "staff-engineer": case "staff-mole": case "staff-discovery": case "staff-letter": case "staff-shortfall": case "staff-visitor": case "staff-retire": {
        const id = id_.slice(6) as StaffEventId;
        if (c.staffEvent) note = "A staff incident is already waiting for a decision.";
        else if (!STAFF_EVENTS[id].when(c)) note = "That incident can't happen right now.";
        else monthlyStaff(c, id);
        break;
      }
      case "genfail": { const g = c.base.facilities.find(f => f.type === "generator" && !f.disabled && f.daysLeft === 0); if (g) wreckFacility(c, g, "Debug: a generator fault."); else note = "No working generator."; break; }
      case "inspwarn": c.inspectionDay = c.day + 15; break;
      case "inspnow": inspect(c); break;
      case "st+20": addStanding(c, 20, "debug"); break;
      case "st-20": addStanding(c, -20, "debug"); break;
      case "orders": c.council.directives = []; issueDirectives(c); break;
      case "xoffer": newOffer(c); break;
      case "crisis": crisis(c); break;
      case "contactall": for (const r of REGION_IDS) { c.regions[r].contact = undefined; c.regions[r].contactDue = undefined; } break;
      case "get500": case "get914": case "get005": receive(c, { scp: id.slice(3) as ScpId, dir: "in", site: "Site-17", arrive: c.day, funds: 0, standing: 0 }); break;
      case "raid": if (!c.incidents.some(i => i.kind === "raid")) startRaid(c); else note = "A raid is already under way."; break;
      case "riot": if (!c.incidents.some(i => i.kind === "riot") && c.dclass >= 3) { c.morale = Math.min(c.morale, 20); startRiot(c); } else note = "A riot needs at least 3 D-Class and no riot already under way."; break;
      case "guardvet": for (const g of c.guards) if (g.alive) g.breaches = Math.max(g.breaches, 3); break;
      case "exp-10": addExposure(c, region, -10); break;
      case "exp+10": addExposure(c, region, 10); break;
      case "exp0": addExposure(c, region, -100); break;
      case "collapse": addExposure(c, region, 100); break;
      case "restore": c.regions[region].collapsed = false; c.regions[region].exposure = 50; addExposure(c, region, 0); break;
      case "s-contained":
        s.status = "contained"; s.resurfaceDay = undefined; s.maintenance = 100;
        c.incidents = c.incidents.filter(i => i.scpId !== s.id || i.id === c.activeIncident);
        break;
      case "outbreak": if (!c.outbreak) { c.outbreakDay = c.day; days(1); } else note = "An outbreak is already under way."; break;
      case "worsen": if (c.outbreak) { c.outbreak.severity = Math.min(5, c.outbreak.severity + 1); } break;
      case "see049": case "see106": case "get049": case "get106": case "breach049": case "breach106": {
        const id = id_.slice(-3) as "049" | "106", known = c.scps.find(x => x.id === id);
        if (id_.startsWith("breach")) { if (known?.status === "contained") startBreach(c, known, "Debug:"); else note = `SCP-${id} has to be contained first.`; }
        else if (known) note = `SCP-${id} is already known.`;
        else { delete c.sightings[id]; if (id_.startsWith("see")) firstSighting(c, id); else { captureNow(c, id); if (!c.scps.some(x => x.id === id)) note = `No free wing of the right grade, so SCP-${id} was handed off.`; } }
        break;
      }
      case "s-breach": if (s.status === "contained") startBreach(c, s, "Debug:"); break;
      case "s-loose":
        c.incidents = c.incidents.filter(i => i.scpId !== s.id || i.id === c.activeIncident);
        s.status = "loose"; s.resurfaceDay = c.day + 1; break;
      default:
        if (id.startsWith("alert-")) c.alert = id.slice(6) as Alert;
        else return false;
    }
    return true;
  }
  // the newest incident gets the chosen Insurgent count
  const setIns = (c: Campaign) => { const inc = c.incidents[c.incidents.length - 1]; if (inc) { inc.insurgents = insurgents; inc.weakened = 0; } };

  function missionAction(id: string) {
    const team = S.units.filter(u => u.side === "mtf" && u.alive);
    S.debug ??= {};
    switch (id) {
      case "reveal": S.explored.fill(1); break;
      case "win": panel.hidden = true; debugFinish(true); return;
      case "lose": panel.hidden = true; debugFinish(false); return;
      case "refill": for (const u of team) { if (!u.downed) u.ap = u.staring ? 1 : 2; if (u.gun) u.gun.ammo = u.gun.mag; } break;
      case "god": for (const u of team) { u.maxHp = 99; u.hp = 99; u.downed = false; } break;
      case "arrive": debugArrive(); break;
      case "killpick": S.debug.kill = !S.debug.kill; S.debug.place173 = false; break;
      case "killci": for (const u of S.units) if (u.side === "raider" && u.alive) { u.alive = false; S.stats.raidersDown++; } break;
      case "freeze": S.debug.freeze173 = !S.debug.freeze173; break;
      case "place": S.debug.place173 = !S.debug.place173; S.debug.kill = false; break;
      case "drive+": S.escapeDrive += 5; break;
      case "drive0": S.escapeDrive = 0; break;
    }
    debugAfter();
  }

  panel.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-dbg]");
    if (!b) return;
    const id = b.dataset.dbg!;
    if (id === "close") { panel.hidden = true; return; }
    note = "";
    if (host.screen() === "mission" && S && !S.over) missionAction(id);
    else {
      const c = host.campaign();
      if (campaignAction(id, c)) {
        if (!c.debug) { c.debug = true; log(c, "This campaign has been changed with the debug menu.", "key"); }
        host.refresh();
      }
    }
    if (!panel.hidden) render();
  });
  panel.addEventListener("change", e => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    const c = host.campaign();
    if (t.matches("[data-dbg-region]")) region = t.value as RegionId;
    else if (t.matches("[data-dbg-ins]")) insurgents = Math.max(0, Math.min(8, Number(t.value) || 0));
    else if (t.matches("[data-dbg-year]")) {
      // jumps the calendar without simulating the days in between
      const d = dayOfYear(Number(t.value));
      // land the day before and run one real day, so expiries and the month tick happen
      if (d > c.day) { c.day = d - 1; advanceDay(c); c.debug = true; log(c, `Debug: the calendar jumps to ${dateText(d)}.`, "key"); host.refresh(); }
      else note = "Jumping only goes forward.";
    }
    render();
  });
}
