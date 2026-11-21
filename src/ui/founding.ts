// The steps between the opening mission and ordinary play: Krista Carter's debrief, choosing and naming the site on
// the globe, and founding the first MTF with its two squads. Each step writes to the campaign through the org
// functions, so what is chosen here is what the rest of the game uses.
import type { Campaign, Operative } from "../campaign/campaign";
import { RANKS, dateText, fieldName, lookOf } from "../campaign/campaign";
import { E11, OPENING_SITE, callsignsFor } from "../campaign/opening";
import { HUBS, bindCampaign, deployCap, foundMtf, foundSite, onLand, randomLand, siteGeo, specUnlock, squadRosterMax, type MtfDraft } from "../campaign/org";
import { GREEK, MTF_CONFIG, SPECIALTIES, SPECS, TAKEN_DESIGNATIONS, type SpecId, type SpecialtyId } from "../data/mtf";
import { LAND, REGIONS, REGION_IDS, project } from "../data/regions";
import { ITEMS } from "../campaign/research";
import { UNITS } from "../data/units";
import { advisorSvg } from "./departments";
import { portraitSvg } from "./portrait";
import { ui } from "./audio";
import { esc } from "./util";
import "./stage/founding.css";

const landPath = LAND.map(r => "M" + r.map(([lo, la]) => project(lo, la).map(n => n.toFixed(1)).join(" ")).join("L") + "Z").join("");

// ---------------------------------------------------------------- Carter's debrief

export function mountDebrief(root: HTMLElement, c: Campaign, won: boolean, done: () => void) {
  const lost = c.roster.filter(o => o.loan && !o.alive);
  const text = won
    ? [`Good work. ${OPENING_SITE}'s instance is back in a sealed container, and nobody outside that wing knows anything happened.`,
       lost.length ? `${E11} lost ${lost.map(o => fieldName(o)).join(" and ")}. They go home with their own task force; their names go on its wall, and yours.` : `${E11} brought everyone home. That doesn't happen often with that statue.`]
    : [`It got out of the wing and it took the Site's reserve guards to box it in. It's contained, barely, and it's not staying at ${OPENING_SITE}.`,
       lost.length ? `${E11} lost ${lost.map(o => fieldName(o)).join(" and ")}.` : `${E11} pulled out with everyone alive. Nobody's calling that a win.`];
  window.scrollTo(0, 0);
  root.innerHTML = `<main class="found debrief">
    <div class="fbg" aria-hidden="true"></div>
    <section class="carter">${advisorSvg("carter")}<div class="who"><b>Krista Carter</b><span>Chief of Operations</span></div></section>
    <section class="fsheet">
      <span class="eyebrow">After-action · ${esc(dateText(c.day))} · ${esc(OPENING_SITE)}</span>
      <h2>${won ? "Recontained" : "Held, not clean"}</h2>
      ${text.map(t => `<p>${esc(t)}</p>`).join("")}
      <p>${esc(`${E11} is a Foundation-wide response force. They fly out tonight to the next site that needs them, and they won't be coming back to answer your calls.`)}</p>
      <p>${esc("The Overseers have signed the order. That instance needs a permanent home, and this region needs a standing installation with its own task force. You're its Director. First, where it goes: anywhere on land, but think about who'll notice and how far your people will have to fly.")}</p>
      <div class="frow"><button type="button" class="fbtn primary" id="fNext">Choose the site</button></div>
    </section>
  </main>`;
  root.querySelector<HTMLElement>("#fNext")!.onclick = () => { ui.click(); done(); };
}

// ---------------------------------------------------------------- the site on the globe

export function mountSitePick(root: HTMLElement, c: Campaign, done: () => void) {
  let view = { x: 0, y: 10, w: 360, h: 150 };
  let at: [number, number] | null = null;
  let flash = "";
  const num = [10, 12, 13, 14, 15, 16, 17, 18, 20, 23, 26, 28, 31, 33, 37, 41, 42, 45, 47, 52, 56, 58, 61, 64, 66, 72, 77, 81, 84, 88][Math.floor(Math.random() * 30)];
  let desig = `Site-${num}`, name = "";
  const defaultName = (lon: number, lat: number) => { const g = siteGeo(lon, lat); return `${REGIONS[g.region].name.split(" ").slice(-1)[0]} Containment Facility`; };

  function info() {
    if (!at) return `<p class="muted">Click anywhere on land to place the site, or ask for a random location. Drag to pan; scroll or use + and − to zoom.</p>`;
    const g = siteGeo(at[0], at[1]);
    const pct = (n: number) => `${n >= 1 ? "+" : "−"}${Math.abs(Math.round((n - 1) * 100))}%`;
    return `<dl class="geo">
      <dt>Position</dt><dd>${Math.abs(at[1]).toFixed(1)}°${at[1] >= 0 ? "N" : "S"}, ${Math.abs(at[0]).toFixed(1)}°${at[0] >= 0 ? "E" : "W"}</dd>
      <dt>Region</dt><dd>${esc(REGIONS[g.region].name)}</dd>
      <dt>Nearest airfield or port</dt><dd>${esc(g.hub)}, ${g.hubKm.toLocaleString()} km</dd>
      <dt>Supply costs</dt><dd class="${g.supply > 1.05 ? "bad" : "good"}">${pct(g.supply)} on facility and staff upkeep</dd>
      <dt>Local attention</dt><dd class="${g.secrecy > 1 ? "bad" : "good"}">${pct(g.secrecy)} exposure from trouble at the site</dd>
    </dl>
    <div class="mlabel">Flight times by C-47</div>
    <ul class="travel">${REGION_IDS.map(r => `<li class="${r === g.region ? "home" : ""}"><span>${esc(REGIONS[r].name)}</span><b>${g.travel[r] ? `${g.travel[r]} d` : "same day"}</b></li>`).join("")}</ul>
    <p class="muted">${g.remoteness > 0.6 ? "Remote: few eyes on it, but every flight starts with a long drive to the airfield and supplies cost more." : g.remoteness < 0.2 ? "Close to a transport hub: cheap to supply and quick to fly from, and plenty of people nearby to notice." : "Between the two: some distance from prying eyes, some from the airfield."}</p>`;
  }
  function render() {
    const [mx, my] = at ? project(at[0], at[1]) : [0, 0], k = view.w / 360;
    window.scrollTo(0, 0);
    root.innerHTML = `<main class="found sitepick">
      <section class="mapwrap">
        <svg class="globe" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="World map: click to place the site">
          <rect x="-400" y="-200" width="1200" height="600" class="sea"/>
          ${[30, 60, 90, 120, 150].map(y => `<line x1="0" x2="360" y1="${y}" y2="${y}" class="grat" style="stroke-width:${0.25 * k}"/>`).join("")}${Array.from({ length: 11 }, (_, i) => (i + 1) * 30).map(x => `<line y1="0" y2="180" x1="${x}" x2="${x}" class="grat" style="stroke-width:${0.25 * k}"/>`).join("")}
          <path d="${landPath}" class="land" style="stroke-width:${0.3 * k}"/>
          ${HUBS.map(h => { const [x, y] = project(h.lon, h.lat); return `<g class="hub"><rect x="${x - 0.9 * k}" y="${y - 0.9 * k}" width="${1.8 * k}" height="${1.8 * k}"/><text x="${x + 1.6 * k}" y="${y + 0.9 * k}" style="font-size:${2.6 * k}px">${esc(h.name)}</text></g>`; }).join("")}
          ${at ? `<g class="pin"><circle cx="${mx}" cy="${my}" r="${4 * k}" class="ring"/><circle cx="${mx}" cy="${my}" r="${1.3 * k}"/><text x="${mx}" y="${my - 5.5 * k}" text-anchor="middle" style="font-size:${3.4 * k}px">${esc(desig)}</text></g>` : ""}
        </svg>
        <div class="mapctl"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="all" aria-label="Whole world">◎</button></div>
        ${flash ? `<p class="mapflash" role="status">${esc(flash)}</p>` : ""}
      </section>
      <aside class="fsheet side">
        <span class="eyebrow">Site establishment</span>
        <h2>Where it goes</h2>
        ${info()}
        <div class="frow"><button type="button" class="fbtn" id="fRandom">${at ? "Reroll location" : "Random location"}</button></div>
        <div class="mlabel">Designation and name</div>
        <div class="names"><label>Designation<input id="fDesig" maxlength="16" value="${esc(desig)}"></label><label>Name<input id="fName" maxlength="40" value="${esc(name)}" placeholder="${at ? esc(defaultName(at[0], at[1])) : "Chosen with the location"}"></label></div>
        <div class="frow"><button type="button" class="fbtn primary" id="fConfirm" ${at ? "" : "disabled"}>Establish ${esc(desig)}</button></div>
      </aside>
    </main>`;
    wire();
  }
  function wire() {
    const svg = root.querySelector<SVGSVGElement>(".globe")!;
    const toWorld = (e: MouseEvent) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM()!.inverse()); return [q.x - 180, 90 - q.y] as [number, number]; };
    let drag: { x: number; y: number; vx: number; vy: number; moved: boolean } | null = null;
    svg.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; svg.setPointerCapture(e.pointerId); };
    svg.onpointermove = e => {
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true; const s = view.w / svg.clientWidth;
      view = clamp({ ...view, x: drag.vx - dx * s, y: drag.vy - dy * s }); svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
    };
    svg.onpointerup = e => {
      const d = drag; drag = null;
      if (d?.moved) { render(); return; }
      const [lon, lat] = toWorld(e);
      if (!onLand(lon, lat)) { flash = "That's open water. A site has to be on land."; ui.deny(); render(); return; }
      at = [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]; flash = ""; ui.click(); render();
    };
    svg.onwheel = e => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.8 : 1.25); };
    root.querySelectorAll<HTMLElement>("[data-z]").forEach(b => b.onclick = () => b.dataset.z === "all" ? (view = { x: 0, y: 10, w: 360, h: 150 }, render()) : zoom(b.dataset.z === "in" ? 0.7 : 1.4));
    root.querySelector<HTMLElement>("#fRandom")!.onclick = () => { at = randomLand(); flash = ""; const [x, y] = project(at[0], at[1]); view = clamp({ x: x - view.w / 2, y: y - view.h / 2, w: view.w, h: view.h }); ui.click(); render(); };
    const d = root.querySelector<HTMLInputElement>("#fDesig")!, n = root.querySelector<HTMLInputElement>("#fName")!;
    d.oninput = () => { desig = d.value; const b = root.querySelector<HTMLElement>("#fConfirm"); if (b) b.textContent = `Establish ${desig || "the site"}`; };
    n.oninput = () => { name = n.value; };
    root.querySelector<HTMLElement>("#fConfirm")!.onclick = () => {
      if (!at) return;
      const why = foundSite(c, { designation: desig || "Site-64", name: name || defaultName(at[0], at[1]), lon: at[0], lat: at[1] });
      if (why) { flash = why; render(); return; }
      c.phase = "mtf"; bindCampaign(c); done();
    };
  }
  function zoom(f: number) {
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2, w = Math.max(30, Math.min(360, view.w * f)), h = w * (150 / 360);
    view = clamp({ x: cx - w / 2, y: cy - h / 2, w, h }); render();
  }
  const clamp = (v: typeof view) => ({ ...v, x: Math.max(0, Math.min(360 - v.w, v.x)), y: Math.max(0, Math.min(180 - v.h, v.y)) });
  render();
}

// ---------------------------------------------------------------- the first MTF

export function mountMtfFound(root: HTMLElement, c: Campaign, done: () => void, opts: { first?: boolean; cancel?: () => void } = { first: true }) {
  const first = opts.first !== false;
  // a later MTF is staffed from the site's reserve, and takes a specialization that has been unlocked
  const people = c.roster.filter(o => o.alive && (first || !o.squad || !c.mtfs?.some(m => m.squads.some(sq => sq.id === o.squad))));
  const open = (Object.keys(SPECS) as SpecId[]).filter(sp => first ? sp === "general" : sp !== "general" && !specUnlock(c, sp));
  let specId: SpecId = open[0] ?? "general";
  const cap = deployCap(c), max = squadRosterMax(c);
  const free = GREEK.filter(g => !["Epsilon"].includes(g));
  let letter = free[Math.floor(Math.random() * free.length)], number = String(2 + Math.floor(Math.random() * 20));
  let mname = "", flash = "";
  const squads: { name: string; specialty: SpecialtyId }[] = [{ name: "", specialty: SPECS[specId].specialties[0] }, { name: "", specialty: SPECS[specId].specialties[1] }];
  // a starting split the player can change: the first few to each squad, the rest held in reserve
  const assign = new Map<string, number>(people.map((o, i) => [o.id, i < cap + 1 ? 0 : i < (cap + 1) * 2 ? 1 : -1]));
  const desig = () => `${letter}-${number}`;

  const person = (o: Operative) => { const a = assign.get(o.id)!; return `<li class="person">
    ${portraitSvg(lookOf(o), o.unit, 42)}<div><b>${esc(fieldName(o))}</b><span>${RANKS[o.rank]}${o.unit ? ` · ${esc(UNITS[o.unit].name)}` : ""}</span></div>
    <div class="asg" role="group" aria-label="Assign ${esc(fieldName(o))}">${[0, 1, -1].map(k => `<button type="button" class="${a === k ? "on" : ""}" data-asg="${o.id}" data-k="${k}" aria-pressed="${a === k}">${k === -1 ? "Reserve" : esc(squads[k].name || `Squad ${k + 1}`)}</button>`).join("")}</div></li>`; };

  function render() {
    const spec = SPECS[specId], counts = [0, 1].map(k => [...assign.values()].filter(v => v === k).length);
    const y = window.scrollY;
    root.innerHTML = `<main class="found mtf">
      <section class="fsheet wide">
        <span class="eyebrow">Mobile Task Force charter · ${esc(c.site?.designation ?? "")}</span>
        <h2>${first ? "Found your first MTF" : `Charter another MTF · $${MTF_CONFIG.mtfCost}k`}</h2>
        <div class="charter">
          <label>Designation<span class="desig"><select id="mLetter">${free.map(g => `<option ${g === letter ? "selected" : ""}>${g}</option>`).join("")}</select>-<input id="mNum" inputmode="numeric" maxlength="3" value="${esc(number)}"></span></label>
          <label>Name<input id="mName" maxlength="32" value="${esc(mname)}" placeholder="e.g. Iron Watch"></label>
          <div class="specbox"><span class="mlabel">Primary specialization</span>${first ? `<b>${esc(spec.name)}</b>` : `<select id="mSpec">${open.map(sp => `<option value="${sp}" ${sp === specId ? "selected" : ""}>${esc(SPECS[sp].name)}</option>`).join("")}</select>`}<small>${esc(spec.desc)}</small>${first ? `<i>Required for a site's first MTF. Biological Containment, Heavy Assault and Reconnaissance open up later.</i>` : ""}</div>
        </div>
        <div class="squads">${squads.map((s, k) => `<div class="sqcard">
          <span class="mlabel">Squad ${k + 1} · ${counts[k]} of ${max} · deploys ${cap}</span>
          <input data-sqname="${k}" maxlength="24" value="${esc(s.name)}" placeholder="${k ? "e.g. Sentinel" : "e.g. Vanguard"}" aria-label="Squad ${k + 1} name">
          <div class="specs">${spec.specialties.map(id => `<button type="button" class="${s.specialty === id ? "on" : ""}" data-sqspec="${k}" data-id="${id}" aria-pressed="${s.specialty === id}"><b>${esc(SPECIALTIES[id].name)}</b><small>${esc(SPECIALTIES[id].desc)}</small></button>`).join("")}</div>
          <p class="issue">Specialist issue: ${Object.entries(SPECIALTIES[s.specialty].issue).map(([i, n]) => `${n} × ${esc(ITEMS[i as keyof typeof ITEMS].name)}`).join(", ") || "none"}. Standard rifles, armor and grenades come from the Armory for any squad.</p>
        </div>`).join("")}</div>
        <div class="mlabel">Personnel · ${people.length} transferred in · ${[...assign.values()].filter(v => v === -1).length} in reserve</div>
        <ul class="people">${people.map(person).join("")}</ul>
        ${flash ? `<p class="fwarn" role="status">${esc(flash)}</p>` : ""}
        <div class="frow"><button type="button" class="fbtn primary" id="mFound">Charter ${esc(desig())}${mname ? ` "${esc(mname)}"` : ""}</button>${opts.cancel ? `<button type="button" class="fbtn" id="mCancel">Cancel</button>` : ""}</div>
      </section>
    </main>`;
    window.scrollTo(0, y);
    const sel = root.querySelector<HTMLSelectElement>("#mLetter")!, num = root.querySelector<HTMLInputElement>("#mNum")!, nm = root.querySelector<HTMLInputElement>("#mName")!;
    sel.onchange = () => { letter = sel.value; render(); };
    const sp = root.querySelector<HTMLSelectElement>("#mSpec"); if (sp) sp.onchange = () => { specId = sp.value as SpecId; squads.forEach((q, k) => { q.specialty = SPECS[specId].specialties[k]; }); render(); };
    root.querySelector<HTMLElement>("#mCancel")?.addEventListener("click", () => opts.cancel?.());
    num.onchange = () => { number = num.value.replace(/\D/g, "") || "1"; render(); };
    nm.onchange = () => { mname = nm.value; render(); };
    root.querySelectorAll<HTMLInputElement>("[data-sqname]").forEach(i => i.onchange = () => { squads[Number(i.dataset.sqname)].name = i.value; render(); });
    root.querySelectorAll<HTMLElement>("[data-sqspec]").forEach(b => b.onclick = () => { squads[Number(b.dataset.sqspec)].specialty = b.dataset.id as SpecialtyId; ui.click(); render(); });
    root.querySelectorAll<HTMLElement>("[data-asg]").forEach(b => b.onclick = () => { assign.set(b.dataset.asg!, Number(b.dataset.k)); render(); });
    root.querySelector<HTMLElement>("#mFound")!.onclick = () => {
      if (TAKEN_DESIGNATIONS.includes(desig())) { flash = `${desig()} already exists elsewhere in the Foundation. Pick another.`; render(); return; }
      const draft: MtfDraft = { designation: desig(), name: mname, spec: specId, squads: squads.map((s, k) => ({ name: s.name, specialty: s.specialty, members: people.filter(o => assign.get(o.id) === k).map(o => o.id) })) };
      const why = foundMtf(c, draft, first);
      if (why) { flash = why; render(); return; }
      if (first) { callsignsFor(c, draft.designation); c.phase = undefined; }
      bindCampaign(c); done();
    };
  }
  render();
}
