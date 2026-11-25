// The department rooms at the head of the Command, Research and Site-19 tabs: the Operations room with Krista Carter,
// the laboratory with Dr. Catherine Bell and the workshop with Vincent Russo. Each shows the work that is really under
// way (open incidents on the plot board, projects on the benches, construction and workshop orders) as things to
// click, which lead to the same controls further down the tab. The people are drawn stand-ins until portraits are
// supplied at art/character/<id> (see art/README.md).
import { ADVISORS, remark, type AdvisorId } from "../campaign/advisors";
import { dateOf, dateText, deployable, type Campaign } from "../campaign/campaign";
import { FACILITIES } from "../campaign/base";
import { ITEMS, PROJECTS, projectDays, researchersFree } from "../campaign/research";
import { ATTACHMENTS, AMMO } from "../data/weapons";
import type { Look } from "../data/looks";
import { portraitHead } from "./portrait";
import { asset, eraOf } from "./stage/assets";
import { esc } from "./util";
import "./stage/departments.css";

const LOOKS: Record<AdvisorId, Look> = {
  bell: { skin: 0, hair: 4, hairColor: 2, facial: 0, scar: false, headgear: false },
  russo: { skin: 2, hair: 0, hairColor: 0, facial: 1, scar: true, headgear: false },
  carter: { skin: 3, hair: 5, hairColor: 0, facial: 0, scar: false, headgear: false },
};

/** A department head from the waist up, 200 × 240. */
export function advisorSvg(id: AdvisorId) {
  const art = asset(`character/${id}`);
  if (art) return `<img class="advisor-art" src="${art}" alt="${esc(ADVISORS[id].name)}">`;
  const head = `<g transform="translate(29.6 6) scale(2.2)">${portraitHead(LOOKS[id], undefined)}</g>`;
  const body = id === "bell"
    ? `<path d="M18 240 Q22 150 100 138 Q178 150 182 240Z" fill="#e8e6df"/><path d="M18 240 Q22 160 70 144 L86 240Z" fill="#cfccc2"/>
       <path d="M78 138 L100 200 L122 138 L112 136 L100 170 L88 136Z" fill="#2f3a48"/><path d="M80 138 L100 196 L72 240 L58 240 Z M120 138 L100 196 L128 240 L142 240Z" fill="#d8d5cc"/>
       <rect x="130" y="176" width="22" height="30" rx="2" fill="#f4f1e8" stroke="#a8a49a"/><path d="M136 168 v14 M142 170 v12" stroke="#2f3a48" stroke-width="3"/>
       <rect x="54" y="186" width="30" height="20" rx="2" fill="#d8bf86" stroke="#6b5a34"/><text x="69" y="199" font-size="7" text-anchor="middle" font-family="monospace" fill="#2a241a">RES-1</text>`
    : id === "russo"
    ? `<path d="M14 240 Q20 148 100 136 Q180 148 186 240Z" fill="#4f5d6a"/><path d="M14 240 Q20 158 64 142 L80 240Z" fill="#3d4954"/>
       <path d="M84 136 L100 160 L116 136" fill="none" stroke="#2b333b" stroke-width="4"/><path d="M100 160 V240" stroke="#2b333b" stroke-width="3"/>
       <rect x="112" y="170" width="34" height="28" rx="2" fill="#46535f" stroke="#2b333b"/><path d="M120 166 v16 M128 166 v14" stroke="#c9a45c" stroke-width="3"/>
       <rect x="50" y="176" width="34" height="9" fill="#c8b48a" opacity=".8"/><text x="67" y="183" font-size="6.5" text-anchor="middle" font-family="monospace" fill="#2a241a">RUSSO</text>
       <g transform="translate(64 22)"><rect x="0" y="0" width="72" height="16" rx="8" fill="#2b2f33"/><circle cx="20" cy="8" r="7" fill="#6f8f7e" stroke="#15181b" stroke-width="2"/><circle cx="52" cy="8" r="7" fill="#6f8f7e" stroke="#15181b" stroke-width="2"/></g>`
    : `<path d="M16 240 Q22 148 100 136 Q178 148 184 240Z" fill="#5a5f45"/><path d="M16 240 Q22 158 66 142 L82 240Z" fill="#4a4f37"/>
       <path d="M84 136 L100 176 L116 136 L108 134 L100 152 L92 134Z" fill="#d8d2bf"/><path d="M96 150 L100 200 L104 150 L100 144Z" fill="#4a3a28"/>
       <path d="M82 136 L100 182 L66 240 L54 240 Z M118 136 L100 182 L134 240 L146 240Z" fill="#646a4d"/>
       <circle cx="100" cy="204" r="3" fill="#c9a45c"/><circle cx="100" cy="226" r="3" fill="#c9a45c"/>
       <rect x="116" y="172" width="26" height="6" fill="#7a2f2a"/><rect x="116" y="178" width="26" height="6" fill="#2f4f7a"/><rect x="116" y="184" width="26" height="6" fill="#c9a45c"/>
       <circle cx="78" cy="150" r="4" fill="#c9a45c"/><circle cx="122" cy="150" r="4" fill="#c9a45c"/>`;
  const glasses = id === "bell" ? `<g transform="translate(29.6 6) scale(2.2)" fill="none" stroke="#2a2420" stroke-width=".9"><circle cx="27" cy="29.3" r="3.6"/><circle cx="37" cy="29.3" r="3.6"/><path d="M30.6 29 h2.8 M23.4 28.6 l-3 -1 M40.6 28.6 l3 -1"/></g>` : "";
  return `<svg class="advisor-svg" viewBox="0 0 200 240" role="img" aria-label="${esc(ADVISORS[id].name)}">${body}${head}${glasses}</svg>`;
}

function band(c: Campaign, id: AdvisorId, room: string, stations: string, extraCls = "", enter?: { id: string; label: string }) {
  const a = ADVISORS[id], r = remark(c, id), era = eraOf(dateOf(c.day).getUTCFullYear());
  const act = r.plan ? `data-plan="${r.plan}"` : r.goto ? `data-goto="${r.goto}"` : "";
  return `<section class="dept dept-${room} era-${era} ${extraCls}" aria-label="${esc(a.dept)}">
    <div class="deptroom" aria-hidden="true"></div>
    <div class="advisor">${advisorSvg(id)}<div class="nameplate"><b>${esc(a.name)}</b><span>${esc(a.title)}</span></div></div>
    <div class="remark tone-${r.tone}"><span class="eyebrow">${esc(a.dept)} · ${dateText(c.day)}</span><p>${esc(r.text)}</p>${act && r.label ? `<button type="button" class="act" ${act}>${esc(r.label)}</button>` : ""}</div>
    <div class="stations">${stations}${enter ? `<button type="button" class="enterroom" data-enter="${esc(enter.id)}">${esc(enter.label)} →</button>` : ""}</div>
  </section>`;
}

export function commandBand(c: Campaign) {
  const open = [...c.incidents].sort((a, z) => a.expires - z.expires).slice(0, 6);
  const pins = open.map((i, n) => `<button type="button" class="pin k-${i.kind}" data-plan="${i.id}" style="--r:${(n % 3 - 1) * 2}deg"><b>${esc(i.title.split(":")[0])}</b><span>${esc(i.title.split(":").slice(1).join(":").trim() || i.kind)}</span><small>Closes ${dateText(i.expires)}</small></button>`).join("");
  const ready = c.roster.filter(o => deployable(c, o)).length, alive = c.roster.filter(o => o.alive).length;
  return band(c, "carter", "ops", `
    <div class="plotboard"><span class="boardtitle">Situation board</span>${pins || `<p class="quiet">No open incidents.</p>`}</div>
    <button type="button" class="display" data-goto="world"><span class="scan"></span><b>World map</b><small>${c.incidents.length} open · exposure ${c.exposure}</small></button>
    <button type="button" class="display squad" data-goto="personnel"><b>${ready}/${alive}</b><small>operatives fit to deploy</small></button>`, "", (() => { const f = c.base.facilities.find(x => x.type === "command"); return f ? { id: f.id, label: "Enter the operations room" } : undefined; })());
}

export function researchBand(c: Campaign) {
  const active = Object.entries(c.research.assigned).filter(([, n]) => n > 0);
  const benches = active.map(([id, n]) => {
    const p = PROJECTS[id], total = projectDays(c, id), done = Math.min(total, c.research.progress[id] ?? 0), f = total ? done / total : 0;
    return `<button type="button" class="bench" data-resfocus="${id}" title="${esc(p?.desc ?? "")}">
      <span class="flask"><i style="--v:${f}"></i></span><b>${esc(p?.name ?? id)}</b><small>${Math.round(f * 100)}% · ${n} on it · ~${Math.ceil((total - done) / Math.max(1, n))} d</small>
      <span class="staff">${"<i></i>".repeat(Math.min(6, n))}</span></button>`;
  }).join("");
  const idle = researchersFree(c);
  const test = c.research.testing ? `<div class="bench chamber"><span class="flask amber"><i style="--v:.5"></i></span><b>Test under way</b><small>SCP-173's cell</small></div>` : "";
  return band(c, "bell", "lab", `${benches}${test}${idle > 0 ? `<div class="bench idle"><span class="stools">${"<i></i>".repeat(Math.min(6, idle))}</span><b>${idle} unassigned</b><small>Waiting for a project</small></div>` : ""}${!benches && !test && !idle ? `<p class="quiet">No researchers on staff. Hire them at a research lab.</p>` : ""}`, "", (() => { const f = c.base.facilities.find(x => x.type === "lab" && x.daysLeft === 0) ?? c.base.facilities.find(x => x.type === "lab"); return f ? { id: f.id, label: "Enter the laboratory" } : undefined; })());
}

export function engineeringBand(c: Campaign) {
  const builds = c.base.facilities.filter(f => f.daysLeft > 0 || f.repairDays > 0).map(f => {
    const d = FACILITIES[f.type], total = f.daysLeft > 0 ? d.days : Math.max(f.repairDays, 1), left = f.daysLeft > 0 ? f.daysLeft : f.repairDays;
    return `<button type="button" class="job build" data-slot="${f.level},${f.slot}"><span class="scaffold"><i style="--v:${Math.max(0, Math.min(1, 1 - left / total))}"></i></span><b>${esc(d.name)}</b><small>${f.daysLeft > 0 ? "Building" : "Repairing"} · level ${f.level + 1} · ${left} d</small></button>`;
  }).join("");
  const shop = c.base.facilities.find(f => f.type === "workshop" && f.daysLeft === 0);
  const orders = c.orders.slice(0, 6).map(o => {
    const what = o.item ? ITEMS[o.item].name : o.attachment ? ATTACHMENTS[o.attachment].name : o.ammo ? AMMO[o.ammo].name : "Refit";
    return `<button type="button" class="job crate" ${shop ? `data-slot="${shop.level},${shop.slot}"` : `data-goto="armory"`}><span class="box"></span><b>${esc(what)}</b><small>${o.daysLeft} d on the bench</small></button>`;
  }).join("");
  return band(c, "russo", "shop", `${builds}${orders}${!builds && !orders ? `<p class="quiet">Nothing under construction and the workshop bench is clear.</p>` : ""}`);
}
