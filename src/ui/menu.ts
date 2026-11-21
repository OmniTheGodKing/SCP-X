// The title screen: New Game, Continue, Load Game, Settings and Exit. A new game chooses its historical start,
// difficulty and save slot, and goes straight into that start's introductory operation.
import { SLOTS, activeSlot, slotSummary, type Slot } from "../campaign/save";
import { DIFFICULTIES, type Difficulty } from "../campaign/difficulty";
import { ERAS } from "../campaign/opening";
import { dateText } from "../campaign/campaign";
import { siteSeal } from "./icons";
import { soundControl, ui, wireSound } from "./audio";
import { esc } from "./util";
import "./stage/menu.css";

export interface MenuActions {
  newGame: (o: { slot: Slot; difficulty: Difficulty; ironman: boolean; era: string }) => void;
  load: (slot: Slot) => void;
}

type View = "title" | "new" | "load" | "settings" | "exit";

export function mountMenu(root: HTMLElement, act: MenuActions) {
  let view: View = "title";
  let pick = { slot: SLOTS.find(s => !slotSummary(s)) ?? activeSlot(), difficulty: "agent" as Difficulty, ironman: false, era: "full" };
  const latest = (): Slot | undefined => slotSummary(activeSlot()) ? activeSlot() : SLOTS.find(s => slotSummary(s));

  const slotLine = (s: Slot) => { const m = slotSummary(s); return m ? `${m.difficulty ? DIFFICULTIES[m.difficulty as Difficulty]?.name ?? "" : ""}${m.ironman ? " · Ironman" : ""} · ${dateText(m.day)} · ${m.won} won${m.over ? " · ended" : ""}` : "Empty"; };

  function panel() {
    switch (view) {
      case "new": return `<section class="mpanel" aria-label="New game">
        <h2>New campaign</h2>
        <div class="mlabel">Historical start</div>
        <div class="eras">${ERAS.map(e => `<button type="button" class="era ${pick.era === e.id ? "on" : ""}" data-era="${e.id}" ${e.ready ? "" : "disabled"} aria-pressed="${pick.era === e.id}">
          <b>${esc(e.name)}</b><span>${esc(e.years)}</span><small>${esc(e.desc)}</small>${e.ready ? "" : `<i>Not yet available</i>`}</button>`).join("")}</div>
        <div class="mlabel">Difficulty</div>
        <div class="diffs">${(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => `<button type="button" class="diff ${pick.difficulty === d ? "on" : ""}" data-diff="${d}" title="${esc(DIFFICULTIES[d].desc)}">${esc(DIFFICULTIES[d].name)}</button>`).join("")}</div>
        <p class="mnote">${esc(DIFFICULTIES[pick.difficulty].desc)}</p>
        <label class="mcheck"><input type="checkbox" id="mIron" ${pick.ironman ? "checked" : ""}> Ironman: one save, no loading over it</label>
        <div class="mlabel">Save slot</div>
        <div class="slots">${SLOTS.map(s => `<button type="button" class="slotbtn ${pick.slot === s ? "on" : ""}" data-slot="${s}"><b>Slot ${s}</b><span>${esc(slotLine(s))}</span>${slotSummary(s) ? `<i>Will be replaced</i>` : ""}</button>`).join("")}</div>
        <div class="mrow"><button type="button" class="mbtn primary" id="mBegin">Begin</button><button type="button" class="mbtn" data-view="title">Back</button></div>
      </section>`;
      case "load": return `<section class="mpanel" aria-label="Load game"><h2>Load a campaign</h2>
        <div class="slots">${SLOTS.map(s => `<button type="button" class="slotbtn" data-load="${s}" ${slotSummary(s) ? "" : "disabled"}><b>Slot ${s}</b><span>${esc(slotLine(s))}</span></button>`).join("")}</div>
        <div class="mrow"><button type="button" class="mbtn" data-view="title">Back</button></div></section>`;
      case "settings": return `<section class="mpanel" aria-label="Settings"><h2>Settings</h2><div class="msettings">${soundControl().replace("<details class=\"sound\">", "<details class=\"sound\" open>")}</div>
        <p class="mnote">Settings are kept in this browser and apply to every campaign.</p>
        <div class="mrow"><button type="button" class="mbtn" data-view="title">Back</button></div></section>`;
      case "exit": return `<section class="mpanel" aria-label="Exit"><h2>Exit</h2><p>Your campaign is saved after every change. Close this tab or window to leave.</p>
        <div class="mrow"><button type="button" class="mbtn" data-view="title">Back to the title</button></div></section>`;
      default: return "";
    }
  }

  function render() {
    const last = latest();
    window.scrollTo(0, 0);
    root.innerHTML = `<main class="menu ${view !== "title" ? "sub" : ""}">
      <div class="mbg" aria-hidden="true"><div class="mdoor"></div><div class="mlight"></div></div>
      <div class="mside">
        <div class="mbrand">${siteSeal(84)}<div><div class="eyebrow">SCP Foundation · Secure. Contain. Protect.</div><h1>SCP-X</h1><p>Founding a site. Fielding its task forces. Holding the line.</p></div></div>
        <nav class="mnav" aria-label="Main menu">
          <button type="button" class="mitem" data-view="new">New Game</button>
          <button type="button" class="mitem" id="mContinue" ${last ? "" : "disabled"}>Continue${last ? `<small>Slot ${last} · ${esc(slotLine(last))}</small>` : `<small>No saved campaign</small>`}</button>
          <button type="button" class="mitem" data-view="load" ${SLOTS.some(s => slotSummary(s)) ? "" : "disabled"}>Load Game</button>
          <button type="button" class="mitem" data-view="settings">Settings</button>
          <button type="button" class="mitem" data-view="exit">Exit</button>
        </nav>
        <p class="mfoot">Classified · Level 3 clearance · Unauthorized access is a breach of Foundation protocol</p>
      </div>
      ${panel()}
    </main>`;
    root.querySelectorAll<HTMLElement>("[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view as View; ui.click(); render(); });
    root.querySelector<HTMLElement>("#mContinue")?.addEventListener("click", () => { const s = latest(); if (s) act.load(s); });
    root.querySelectorAll<HTMLElement>("[data-era]").forEach(b => b.onclick = () => { pick.era = b.dataset.era!; render(); });
    root.querySelectorAll<HTMLElement>("[data-diff]").forEach(b => b.onclick = () => { pick.difficulty = b.dataset.diff as Difficulty; render(); });
    root.querySelectorAll<HTMLElement>("[data-slot]").forEach(b => b.onclick = () => { pick.slot = Number(b.dataset.slot) as Slot; render(); });
    root.querySelectorAll<HTMLElement>("[data-load]").forEach(b => b.onclick = () => act.load(Number(b.dataset.load) as Slot));
    const iron = root.querySelector<HTMLInputElement>("#mIron"); if (iron) iron.onchange = () => { pick.ironman = iron.checked; };
    root.querySelector<HTMLElement>("#mBegin")?.addEventListener("click", () => { if (ERAS.find(e => e.id === pick.era)?.ready) act.newGame(pick); });
    wireSound(root);
  }
  render();
}
