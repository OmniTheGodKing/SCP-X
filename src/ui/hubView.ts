// Site-19 Command: incidents and time, the base and its containment, and Epsilon-11's roster.
import {
  ENGINEER_COST, EXCAVATE, FACILITIES, nameInText, GRADE_NAMES, MAX_LEVELS, REPAIR, SLOTS, build, canBuild, canExcavate, canRepair,
  dclassCapacity, engineersFree, excavate, facilityAt, healPerDay, isContainment, monthlyUpkeep, neighbors, operational,
  powerShort, powerSupply, powerUse, repair, sanityPerDay, type Facility, type FacilityType,
} from "../campaign/base";
import {
  DCLASS_COST, DCLASS_MONTHLY, RANKS, RANK_XP, RECRUIT_COST, advanceDay, advanceToEvent, aimOf, blinkFullOf, buyDClass,
  canBuyDClass, canHireEngineer, dayOfMonth, deployable, hireEngineer, maxSanOf, monthOf, monthlyFunding, recruit,
  type Campaign, type Incident, type Loadout, type Operative,
} from "../campaign/campaign";
import {
  CLEAN_EVERY, breachRisk, breachWindow, canClean, canMove, cleanCell, escapeChance, moveScp, occupantOf, wingOf, workRisk,
  type ScpRecord,
} from "../campaign/containment";
import {
  ITEMS, PROJECTS, TESTS, assign, canHireResearcher, canOrder, canTest, has, hireResearcher, order, projectLock,
  researcherCapacity, researchersFree, runTest, unlockedItems, type Branch, type ItemId, type TestId,
} from "../campaign/research";
import { esc } from "./util";

const MAX_SQUAD = 4, MAX_DCLASS = 4, MAX_WATCHERS = 2;
type Tab = "command" | "site" | "research" | "personnel";

export interface HubActions {
  save: () => void;
  deploy: (inc: Incident, loadouts: Loadout[], dCount: number) => void;
  newCampaign: () => void;
}

const pctText = (p: number) => p < 0.01 ? (p * 100).toFixed(1) + "%" : Math.round(p * 100) + "%";
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
let tab: Tab = (() => { try { return (localStorage.getItem("site19-tab") as Tab) || "command"; } catch { return "command"; } })();

export function mountHub(root: HTMLElement, c: Campaign, act: HubActions) {
  let planning: string | null = null;
  const chosen = new Set<string>();
  const watchers = new Set<string>();
  const gear = new Map<string, { armor: boolean; items: (ItemId | "")[] }>();
  let flashMsg = "";
  let dCount = 2;
  let sel: { level: number; slot: number } | null = null;
  let resetArmed = 0;

  const ready = () => c.roster.filter(deployable);
  const watchPool = () => c.roster.filter(o => o.alive && o.hp > 0);
  const scp173 = () => c.scps[0];

  function render() {
    if (planning && !c.incidents.some(i => i.id === planning)) planning = null;
    for (const id of [...chosen]) if (!ready().some(o => o.id === id)) chosen.delete(id);
    for (const id of [...watchers]) if (!watchPool().some(o => o.id === id)) watchers.delete(id);
    dCount = Math.max(0, Math.min(dCount, c.dclass, MAX_DCLASS));
    const pw = powerShort(c);

    root.innerHTML = `
<main class="wrap hub">
  <header class="top">
    <div>
      <div class="eyebrow">SCP Foundation · Site-19 Command · Mobile Task Force Epsilon-11</div>
      <h1>Site-19 <small>Day ${c.day} · Month ${monthOf(c.day)}, day ${dayOfMonth(c.day)}</small></h1>
    </div>
    <div class="turnbox">
      <span class="pill">Funds $${c.funds}k</span>
      <span class="pill">D-Class ${c.dclass}/${dclassCapacity(c)}</span>
      <span class="pill">Engineers ${engineersFree(c)}/${c.engineers} free</span>
      <span class="pill">Researchers ${researchersFree(c)}/${c.researchers} free</span>
      <span class="pill ${pw ? "hot" : ""}">Power ${powerUse(c)}/${powerSupply(c)}</span>
      <button class="act" id="resetBtn" type="button">New campaign</button>
    </div>
  </header>
  <nav class="tabs" aria-label="Site-19 sections">
    ${tabBtn("command", `Command${c.incidents.length ? ` · ${c.incidents.length} open` : ""}`)}
    ${tabBtn("site", "Site-19")}
    ${tabBtn("research", `Research${researchersFree(c) > 0 && c.researchers ? ` · ${researchersFree(c)} idle` : ""}`)}
    ${tabBtn("personnel", "Personnel")}
  </nav>
  ${flashMsg ? `<p class="warn-box" role="status">${esc(flashMsg)}</p>` : ""}
  ${tab === "command" ? commandTab() : tab === "site" ? siteTab() : tab === "research" ? researchTab() : personnelTab()}
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
  function commandTab() {
    const inc = c.incidents.find(i => i.id === planning) || null;
    return `<div class="hubgrid">
    <section class="col">
      ${scpSummary(scp173())}
      <div class="card">
        <div class="label">Active incidents</div>
        ${c.incidents.length ? c.incidents.map(incidentCard).join("") : `<p class="muted">No open incidents. Advance time to see what happens next.</p>`}
      </div>
      ${inc ? planPanel(inc) : ""}
      <div class="card">
        <div class="label">Public exposure</div>
        <div class="exposure"><div class="exp-bar"><span style="width:${c.exposure}%"></span></div><b>${c.exposure} / 100</b></div>
        <p class="muted">At 100 the O5 Council relieves Site-19's command. Breaches that escape add 10 to 15, failed missions 20, and an anomaly on the loose adds 1 a day. Each recontainment removes 5.</p>
      </div>
    </section>
    <section class="col">
      <div class="card">
        <div class="label">Time</div>
        <div class="row">
          <button class="act" id="dayBtn" type="button" ${c.over ? "disabled" : ""}>Next day</button>
          <button class="act primary" id="waitBtn" type="button" ${c.over ? "disabled" : ""}>Advance until something happens</button>
        </div>
        <p class="muted">Next month: $${monthlyFunding(c)}k from the O5 Council, $${monthlyUpkeep(c)}k upkeep, up to ${DCLASS_MONTHLY} D-Class. Operatives heal ${healPerDay(c)} HP and recover ${sanityPerDay(c)} sanity a day.</p>
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
    if (s.status === "breach") return `<div class="card status danger"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Breach in progress.</b> Each day it goes unanswered: ${pctText(escapeChance(c, s))} chance it gets out of the site, and it may wreck a neighbouring facility.</div></div>`;
    const r = breachRisk(c, s), due = s.lastCleaned + CLEAN_EVERY - c.day;
    return `<div class="card status held"><div class="label">${s.name} · ${s.title} · ${s.cls}</div>
      <div class="status-line"><b>Contained</b> in the ${wing ? nameInText(wing.type) + ` on level ${wing.level + 1}` : "?"}.<br>
      Breach risk ${pctText(r.p)} a day · maintenance ${s.maintenance}% · cleaning ${due > 0 ? `due in ${plural(due, "day")}` : `<span class="warn">overdue</span>`}</div>
      <button class="act" type="button" data-goto="site">Manage containment</button></div>`;
  }

  function incidentCard(i: Incident) {
    const left = i.expires - c.day;
    return `<div class="incident ${planning === i.id ? "sel" : ""}">
      <div><b>${esc(i.title)}</b></div>
      <div class="muted">${left <= 0 ? "Last day to respond" : `${plural(left, "day")} left to respond`} · ${i.kind === "breach" ? "Inside Site-19" : "Off site"} · Insurgency activity: ${i.insurgents >= 4 ? "heavy" : i.insurgents >= 2 ? "reported" : i.insurgents ? "light" : "none reported"}</div>
      <button class="act ${planning === i.id ? "on" : ""}" type="button" data-plan="${i.id}" ${c.over ? "disabled" : ""}>${planning === i.id ? "Planning response" : "Plan response"}</button>
    </div>`;
  }

  function planPanel(inc: Incident) {
    const ops = ready();
    return `<div class="card plan">
      <div class="label">Deploy to ${esc(inc.title.split(":")[0])}</div>
      <p class="muted">Pick up to ${MAX_SQUAD} operatives. Only fully healed operatives can deploy; sanity carries over, so watch it.</p>
      <div class="pick">${ops.length ? ops.map(o => `<label class="pickop ${chosen.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="pick-${o.id}" data-pick="${o.id}" ${chosen.has(o.id) ? "checked" : ""} ${!chosen.has(o.id) && chosen.size >= MAX_SQUAD ? "disabled" : ""}>
        <span><b>${esc(o.call)} ${esc(o.name)}</b> · ${RANKS[o.rank]} · SAN ${o.san}/${maxSanOf(o)}</span></label>`).join("") : `<p class="muted">Nobody is fit to deploy. Wait for the wounded to heal or recruit.</p>`}</div>
      ${chosen.size ? `<div class="loadouts"><div class="specs">Loadout: one armor slot and two item slots each. Unused items come back; gear on anyone killed is lost.</div>
        ${[...chosen].map(id => loadoutRow(c.roster.find(o => o.id === id)!)).join("")}</div>` : ""}
      <div class="row dpick">
        <span>D-Class work detail</span>
        <button class="act" type="button" id="dMinus" ${dCount <= 0 ? "disabled" : ""}>−</button>
        <b>${dCount}</b>
        <button class="act" type="button" id="dPlus" ${dCount >= Math.min(c.dclass, MAX_DCLASS) ? "disabled" : ""}>+</button>
        <span class="muted">of ${c.dclass} in holding</span>
      </div>
      <div class="row">
        <button class="act primary" type="button" id="launchBtn" ${chosen.size ? "" : "disabled"}>Deploy ${plural(chosen.size, "operative")} and ${dCount} D-Class</button>
        <button class="act" type="button" id="cancelPlan">Cancel</button>
      </div>
    </div>`;
  }

  function gearOf(id: string) {
    let g = gear.get(id);
    if (!g) { g = { armor: false, items: ["", ""] }; gear.set(id, g); }
    return g;
  }
  /** How many of an item are left in storage once everyone else's loadout is counted. */
  function spare(item: ItemId, exceptOp: string, exceptSlot = -1) {
    let used = 0;
    for (const id of chosen) {
      const g = gearOf(id);
      if (item === "armor") { if (g.armor && id !== exceptOp) used++; continue; }
      g.items.forEach((it, i) => { if (it === item && !(id === exceptOp && i === exceptSlot)) used++; });
    }
    return (c.inventory[item] || 0) - used;
  }
  function loadoutRow(o: Operative) {
    const g = gearOf(o.id);
    const carry = (Object.keys(ITEMS) as ItemId[]).filter(i => !ITEMS[i].armor && ((c.inventory[i] || 0) > 0));
    const slot = (i: number) => `<select id="gear-${o.id}-${i}" data-gear="${o.id}" data-slot-i="${i}" aria-label="${esc(o.name)} item slot ${i + 1}">
      <option value="">Empty slot</option>
      ${carry.map(it => { const left = spare(it, o.id, i); return `<option value="${it}" ${g.items[i] === it ? "selected" : ""} ${left < 1 && g.items[i] !== it ? "disabled" : ""}>${ITEMS[it].name} (${Math.max(0, left)} left)</option>`; }).join("")}
    </select>`;
    const armorLeft = spare("armor", o.id);
    return `<div class="loadrow"><b>${esc(o.call)} ${esc(o.name)}</b>
      <label class="armorpick"><input type="checkbox" id="armor-${o.id}" data-armor="${o.id}" ${g.armor ? "checked" : ""} ${!g.armor && armorLeft < 1 ? "disabled" : ""}> Body armor${(c.inventory.armor || 0) ? ` (${Math.max(0, armorLeft - (g.armor ? 1 : 0))} spare)` : " (none built)"}</label>
      ${slot(0)}${slot(1)}</div>`;
  }

  // ---------- Research ----------
  function researchTab() {
    const branches: Branch[] = ["SCP-173", "Personnel", "Equipment", "Site"];
    const rw = canHireResearcher(c);
    const s = scp173();
    return `<div class="hubgrid">
    <section class="col">
      <div class="card">
        <div class="label">Research · ${c.researchers} researchers, ${researchersFree(c)} unassigned · lab space for ${researcherCapacity(c)}</div>
        <p class="muted">Put researchers on any projects you like; each one adds a day of work per day. A project's cost is paid when work starts.</p>
        <div class="row"><button class="act" id="hireResBtn" type="button" ${rw ? `disabled title="${esc(rw)}"` : ""}>Hire researcher · $60k</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>
      </div>
      ${branches.map(b => `<div class="card"><div class="label">${b}</div><div class="projects">${Object.keys(PROJECTS).filter(id => PROJECTS[id].branch === b).map(projectRow).join("")}</div></div>`).join("")}
    </section>
    <section class="col">
      <div class="file">
        <div class="label">Tests on ${s.name}</div>
        <h2>Test log</h2>
        <p>Tests fill in ${s.name}'s file and open new research. A D-Class goes in while operatives watch; riskier tests multiply the chance someone dies, and some can end in a breach.</p>
        ${(Object.keys(TESTS) as TestId[]).map(t => testRow(t)).join("")}
        ${watcherPicker()}
      </div>
      ${workshopCard()}
    </section>
  </div>`;
  }

  function projectRow(id: string) {
    const p = PROJECTS[id], r = c.research, n = r.assigned[id] || 0, prog = r.progress[id] || 0;
    const done = has(c, id), lock = done ? null : projectLock(c, id);
    const eta = n ? Math.ceil((p.days - prog) / n) : null;
    const status = done ? `<span class="flag">Done</span>` : lock ? `<span class="flag bad">Locked</span>`
      : n ? `<span class="flag stare">${plural(n, "researcher")} · ${plural(eta!, "day")} left</span>` : prog ? `<span class="flag">Paused</span>` : "";
    return `<div class="proj ${done ? "done" : ""} ${lock ? "locked" : ""}">
      <div class="ptop"><b>${esc(p.name)}</b>${status}</div>
      <div class="muted">${esc(p.desc)}</div>
      ${done ? "" : `<div class="pbar"><div class="exp-bar"><span style="width:${Math.min(100, (prog / p.days) * 100)}%"></span></div><span class="specs">${prog}/${p.days} researcher-days${r.paid.includes(id) ? "" : ` · $${p.cost}k to start`}</span></div>`}
      ${lock ? `<div class="why">${esc(lock)}</div>` : done ? "" : `<div class="row assign">
        <button class="act" type="button" data-unassign="${id}" ${n ? "" : "disabled"} aria-label="Remove a researcher">−</button>
        <b>${n}</b>
        <button class="act" type="button" data-assign="${id}" ${researchersFree(c) < 1 ? "disabled" : ""} aria-label="Add a researcher">+</button>
      </div>`}
    </div>`;
  }

  function testRow(t: TestId) {
    const d = TESTS[t], why = canTest(c, scp173(), t), done = c.research.tests.includes(t);
    const opens = Object.values(PROJECTS).filter(p => p.needsTest === t).map(p => p.name).join(", ");
    const w = watchPool().filter(o => watchers.has(o.id));
    const death = Math.min(0.95, workRisk(w) * d.risk);
    return `<div class="test ${done ? "done" : ""}">
      <div class="ptop"><b>${esc(d.name)}</b>${done ? `<span class="flag">Done</span>` : ""}</div>
      <p>${esc(d.desc)}</p>
      <div class="specs">${d.dclass} D-Class · death risk ×${d.risk} (${pctText(death)} with current watchers)${d.breach ? ` · ${pctText(d.breach)} chance of a breach` : ""} · opens ${esc(opens)}</div>
      ${done ? "" : `<div class="row"><button class="act" type="button" data-test="${t}" ${why ? `disabled title="${esc(why)}"` : ""}>Run the test</button>${why ? `<span>${esc(why)}</span>` : ""}</div>`}
    </div>`;
  }

  function workshopCard() {
    const items = unlockedItems(c);
    return `<div class="card">
      <div class="label">Workshop</div>
      ${items.length ? `<div class="projects">${items.map(i => {
        const d = ITEMS[i], why = canOrder(c, i), queued = c.orders.filter(o => o.item === i).length;
        return `<div class="proj"><div class="ptop"><b>${esc(d.name)}</b><span class="flag">${c.inventory[i] || 0} in storage${queued ? ` · ${queued} being built` : ""}</span></div>
          <div class="muted">${esc(d.desc)}</div>
          <div class="row"><button class="act" type="button" data-order="${i}" ${why ? `disabled title="${esc(why)}"` : ""}>Build · $${d.cost}k · ${plural(d.days, "day")} · 1 engineer</button>${why ? `<span class="muted">${esc(why)}</span>` : ""}</div></div>`;
      }).join("")}</div>` : `<p class="muted">Nothing to build yet. Equipment research unlocks items here.</p>`}
      ${c.orders.length ? `<div class="specs">In production: ${c.orders.map(o => `${ITEMS[o.item].name} (${plural(o.daysLeft, "day")})`).join(", ")}</div>` : ""}
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
        ${powerShort(c) ? `<p class="warn-box">Power shortage: medical bay and psychological services are offline and every containment wing is twice as likely to breach. Build or repair a generator.</p>` : ""}
        <div class="basegrid">${rows.join("")}</div>
        <div class="row">
          ${c.base.excavation > 0 ? `<span class="muted">Excavating level ${c.base.levels + 1}: ${plural(c.base.excavation, "day")} left.</span>`
            : c.base.levels < MAX_LEVELS ? `<button class="act" id="digBtn" type="button" ${exWhy ? `disabled title="${esc(exWhy)}"` : ""}>Excavate level ${c.base.levels + 1} · $${EXCAVATE.cost}k · ${EXCAVATE.days} days · ${EXCAVATE.engineers} engineers</button>${exWhy ? `<span class="muted">${esc(exWhy)}</span>` : ""}` : ""}
        </div>
        <p class="muted">Facilities share walls with the ones beside, above and below them. Security stations protect neighbouring containment wings; breaches wreck neighbours.</p>
      </div>
    </section>
    <section class="col">
      ${sel ? slotDetail(sel.level, sel.slot) : `<div class="card"><div class="label">Facility</div><p class="muted">Select a slot to build, repair or inspect it.</p></div>`}
      ${containmentCard(scp173())}
    </section>
  </div>`;
  }

  function slotCell(level: number, slot: number) {
    const f = facilityAt(c, level, slot), on = sel && sel.level === level && sel.slot === slot;
    if (!f) return `<button type="button" class="slot empty ${on ? "sel" : ""}" data-slot="${level},${slot}"><span class="sname">Empty</span><span class="sstat">Build here</span></button>`;
    const d = FACILITIES[f.type], occ = occupantOf(c, f);
    const stat = f.daysLeft > 0 ? `Building · ${plural(f.daysLeft, "day")}` : f.repairDays > 0 ? `Repairing · ${plural(f.repairDays, "day")}` : f.disabled ? "Damaged" : occ ? `${occ.name}${occ.status === "breach" ? " · BREACH" : occ.status === "loose" ? " · escaped" : ""}` : isContainment(f.type) ? "Empty cells" : "Operational";
    const cls = [f.daysLeft > 0 ? "building" : "", f.disabled ? "damaged" : "", isContainment(f.type) ? "cont" : "", occ && occ.status !== "contained" ? "alarm" : ""].join(" ");
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
      <p>${f.daysLeft > 0 ? `Under construction: ${plural(f.daysLeft, "day")} left.` : f.repairDays > 0 ? `Engineers are repairing it: ${plural(f.repairDays, "day")} left.` : f.disabled ? `<span class="warn">Damaged in a breach and out of action.</span>` : "Operational."}</p>
      ${f.disabled && f.repairDays === 0 ? `<div class="row"><button class="act primary" id="repairBtn" type="button" ${rw ? `disabled title="${esc(rw)}"` : ""}>Repair · $${REPAIR.cost}k · ${REPAIR.days} days · ${REPAIR.engineers} engineers</button>${rw ? `<span class="muted">${esc(rw)}</span>` : ""}</div>` : ""}
      ${occ ? `<p>Holds <b>${occ.name}</b>.</p>` : ""}
      ${isContainment(f.type) && !occ && operational(f) && s.status === "contained" ? `
        <p class="muted">Moving ${s.name} here takes one D-Class to shift it while operatives watch, and $20k. The same risk as a cleaning applies.</p>
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
      <p>Its cell must be cleaned every ${CLEAN_EVERY} days: a D-Class goes in while others keep their eyes on it. Next cleaning ${due > 0 ? `in ${plural(due, "day")}` : "<b>overdue</b>"}. If a breach starts, you have ${breachWindow(c)} days to answer.</p>
      ${watcherPicker()}
      <div class="row"><button class="act primary" id="cleanBtn" type="button" ${cw ? `disabled title="${esc(cw)}"` : ""}>Clean the cell · 1 D-Class</button>${cw ? `<span>${esc(cw)}</span>` : ""}</div>
    </div>`;
  }

  function watcherPicker() {
    const pool = watchPool(), w = pool.filter(o => watchers.has(o.id));
    return `<div class="watch">
      <div class="specs">Watching (up to ${MAX_WATCHERS}): chance a D-Class dies <b>${pctText(workRisk(w))}</b>${w.length ? "" : " with only site guards watching"}. Each watcher loses 8 sanity.</div>
      <div class="pick">${pool.map(o => `<label class="pickop small ${watchers.has(o.id) ? "on" : ""}">
        <input type="checkbox" id="watch-${o.id}" data-watch="${o.id}" ${watchers.has(o.id) ? "checked" : ""} ${!watchers.has(o.id) && watchers.size >= MAX_WATCHERS ? "disabled" : ""}>
        <span>${esc(o.call)} ${esc(o.name)} · SAN ${o.san}/${maxSanOf(o)}</span></label>`).join("")}</div>
    </div>`;
  }

  // ---------- Personnel ----------
  function personnelTab() {
    const dWhy = canBuyDClass(c), eWhy = canHireEngineer(c);
    return `<div class="hubgrid">
    <section class="col">
      <div class="card">
        <div class="label">Epsilon-11 roster</div>
        <div class="roster">${c.roster.filter(o => o.alive).map(opRow).join("")}</div>
        <div class="row"><button class="act" id="recruitBtn" type="button" ${c.funds < RECRUIT_COST || c.over ? "disabled" : ""}>Recruit operative · $${RECRUIT_COST}k</button></div>
      </div>
    </section>
    <section class="col">
      <div class="card">
        <div class="label">Site staff</div>
        <p>D-Class in holding: <b>${c.dclass}</b> of ${dclassCapacity(c)} barracks spaces. Engineers: <b>${c.engineers}</b>, ${engineersFree(c)} free. Researchers: <b>${c.researchers}</b> (hire them on the Research tab).</p>
        <div class="row">
          <button class="act" id="dBuyBtn" type="button" ${dWhy || c.over ? `disabled title="${esc(dWhy || "")}"` : ""}>Request 2 D-Class · $${DCLASS_COST * 2}k</button>
          <button class="act" id="engBtn" type="button" ${eWhy || c.over ? `disabled title="${esc(eWhy || "")}"` : ""}>Hire engineer · $${ENGINEER_COST}k</button>
        </div>
        ${dWhy || eWhy ? `<p class="muted">${esc([dWhy, eWhy].filter(Boolean).join(" "))}</p>` : ""}
      </div>
      ${c.roster.some(o => !o.alive) ? `<div class="card">
        <div class="label">Memorial</div>
        <ul class="memorial">${c.roster.filter(o => !o.alive).map(o => `<li><b>${esc(o.call)} ${esc(o.name)}</b>, ${RANKS[o.rank]} · ${plural(o.missions, "mission")} · killed on day ${o.diedDay}, ${esc(o.diedAt || "")}</li>`).join("")}</ul>
      </div>` : ""}
    </section>
  </div>`;
  }

  function opRow(o: Operative) {
    const next = RANK_XP[o.rank + 1], heal = healPerDay(c);
    const days = Math.ceil((o.maxHp - o.hp) / heal);
    const status = deployable(o) ? `<span class="flag">Ready</span>` : `<span class="flag bad">Wounded · ${plural(days, "day")}</span>`;
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
        <span>${plural(o.missions, "mission")} · ${plural(o.kills, "kill")}</span>
      </span>
    </div>`;
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
      try { localStorage.setItem("site19-tab", tab); } catch { /* fine */ }
      render();
    });
    const tryDo = (f: () => string | null | void) => { const why = f(); flashMsg = why || ""; act.save(); render(); };
    on("hireResBtn", () => change(() => hireResearcher(c)));
    root.querySelectorAll<HTMLElement>("[data-assign]").forEach(b => b.onclick = () => tryDo(() => assign(c, b.dataset.assign!, 1)));
    root.querySelectorAll<HTMLElement>("[data-unassign]").forEach(b => b.onclick = () => tryDo(() => assign(c, b.dataset.unassign!, -1)));
    root.querySelectorAll<HTMLElement>("[data-test]").forEach(b => b.onclick = () => change(() => runTest(c, scp173(), b.dataset.test as TestId, chosenWatchers())));
    root.querySelectorAll<HTMLElement>("[data-order]").forEach(b => b.onclick = () => change(() => order(c, b.dataset.order as ItemId)));
    root.querySelectorAll<HTMLInputElement>("[data-armor]").forEach(b => b.onchange = () => { gearOf(b.dataset.armor!).armor = b.checked; render(); });
    root.querySelectorAll<HTMLSelectElement>("[data-gear]").forEach(b => b.onchange = () => {
      gearOf(b.dataset.gear!).items[Number(b.dataset.slotI)] = b.value as ItemId | "";
      render();
    });
    on("dayBtn", () => change(() => advanceDay(c)));
    on("waitBtn", () => change(() => advanceToEvent(c)));
    on("recruitBtn", () => change(() => recruit(c)));
    on("dBuyBtn", () => change(() => buyDClass(c)));
    on("engBtn", () => change(() => hireEngineer(c)));
    on("digBtn", () => change(() => excavate(c)));
    on("cleanBtn", () => change(() => cleanCell(c, scp173(), chosenWatchers())));
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
      if (!inc || !chosen.size) return;
      const loadouts: Loadout[] = [...chosen].map(id => {
        const g = gearOf(id);
        return { opId: id, armor: g.armor, items: g.items.filter((i): i is ItemId => !!i) };
      });
      act.deploy(inc, loadouts, dCount);
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
