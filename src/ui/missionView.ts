// The mission screen: map, SCP-173 status, squad, actions, containment file and incident log.
import { L, area, inContainer } from "../core/grid";
import { shotInfo } from "../game/combat";
import { NOTES_173 } from "../game/notes";
import { blinkChance, maxSanOf, pct } from "../game/profiles";
import { S, canAct, canSee, full, hooks, isPanicked, isTeam, label, seen, starers, team, unitAt } from "../game/state";
import {
  callBlink, callCheck, doOverwatch, doSeal, dragCheck, endTurn, evacuate, onTap, sealCheck, select, selectNext,
  stareCheck, startPlayerTurn, toggleDrag, toggleStare,
} from "../game/turn";
import type { MissionResult, Unit } from "../game/types";
import { esc } from "./util";
import { createRenderer } from "./render";

const TEMPLATE = `
<main class="wrap">
  <header class="top">
    <div>
      <div class="eyebrow" id="mEyebrow"></div>
      <h1>SCP-173 Recontainment <small>“The Sculpture” · Euclid</small></h1>
    </div>
    <div class="turnbox">
      <span class="pill" id="turnPill">Turn 1</span>
      <span class="pill" id="phasePill">Your move</span>
      <button class="act" id="evacBtn" type="button">Evacuate</button>
    </div>
  </header>

  <div class="layout">
    <section class="board" aria-label="Tactical map">
      <canvas id="cv"></canvas>
      <div class="legend">
        <span style="--c: var(--mtf)">MTF Epsilon-11</span>
        <span style="--c: var(--subject)">D-Class</span>
        <span class="sq" style="--c: var(--raider)">Chaos Insurgency</span>
        <span class="sq" style="--c: var(--concrete)">SCP-173</span>
        <span class="sq" style="--c: var(--steel)">Transport container</span>
        <span class="sq" style="--c: var(--exit)">Exit</span>
        <span class="sq" style="--c: #57503f">Desk · half cover</span>
        <span class="sq" style="--c: #4a5561">Pillar · full cover</span>
      </div>
      <details class="rules" open>
        <summary>How this works</summary>
        <div><b>Objective.</b> Get SCP-173 into the transport container at the dock in the southwest staging room, with nobody else inside, then have an operative seal it.</div>
        <div><b>Do not blink.</b> Anyone on your team locks eyes on SCP-173 when they first see it, which costs 1 action. While staring they get one action per turn and can move anywhere that keeps sight of it. Looking away is free.</div>
        <div><b>Blinks.</b> Everyone has a chance to blink each turn. D-Class blink more than operatives, and everyone blinks more as sanity falls. SCP-173 can only move when nobody with their eyes open can see it.</div>
        <div><b>SCP-173 hunts.</b> It moves up to 8 tiles a turn and freezes the moment it steps into anyone's sight. It kills anyone it reaches while unseen (someone mid-blink, looking away or with their eyes shut) and keeps going. It can't see through walls, but it hears gunfire. It passes straight through the container, so drag it in.</div>
        <div><b>Dragging.</b> Anyone next to SCP-173 can drag it once per turn while someone else stares at it: D-Class up to 2 tiles, operatives 1. It costs 5 sanity, and afterwards the dragger looks straight back at it.</div>
        <div><b>Sanity</b> recovers on quiet turns: anyone not staring who lost no sanity that turn regains 5 (operatives) or 4 (D-Class).</div>
        <div><b>Cover</b> only stops gunfire, and only when it sits between shooter and target. SCP-173 ignores it.</div>
        <div><b>Sight and shooting.</b> At least 3 of 10 sight lines between two tiles must be clear to see or shoot. A target with only 3 or 4 clear lines is partly hidden: −15% to hit and no critical hits. Anyone with a wall or pillar beside them can lean out past its edge to look and shoot, at the same −15%.</div>
        <div><b>The Insurgency</b> holds SCP-173 with their eyes too, and loses sanity doing it. When they crack, they cover their eyes and SCP-173 is free to go after them.</div>
      </details>
      <div class="overlay" id="overlay" hidden><div class="sheet" id="overlaySheet"></div></div>
    </section>

    <aside class="side">
      <div class="card status" id="statusCard">
        <div class="label">SCP-173 status</div>
        <div class="status-line" id="statusLine"></div>
      </div>
      <div class="card">
        <div class="label">Mobile Task Force Epsilon-11 “Nine-Tailed Fox”</div>
        <div class="squad" id="squad"></div>
      </div>
      <div class="card">
        <div class="actions">
          <button class="act" id="stareBtn" type="button">Do not blink <kbd>B</kbd></button>
          <button class="act" id="callBtn" type="button">Call the blink <kbd>C</kbd></button>
          <button class="act" id="dragBtn" type="button">Drag <kbd>G</kbd></button>
          <button class="act" id="sealBtn" type="button">Seal <kbd>S</kbd></button>
          <button class="act" id="owBtn" type="button">Overwatch <kbd>O</kbd></button>
          <button class="act" id="nextBtn" type="button">Next <kbd>Tab</kbd></button>
          <button class="act primary wide" id="endBtn" type="button">End turn <kbd>E</kbd></button>
        </div>
        <div class="hint" id="hint"></div>
      </div>
      <div class="file">
        <div class="label">SCP Foundation · Secure. Contain. Protect.</div>
        <h2>SCP-173 · The Sculpture</h2>
        <ol id="notes"></ol>
      </div>
      <div class="card">
        <div class="label">Incident log</div>
        <div class="log" id="log" aria-live="polite"></div>
      </div>
    </aside>
  </div>
</main>`;

/** Mounts the mission screen. Calls onDone with the result after the player reads the debrief. */
export function mountMission(root: HTMLElement, onReturn: () => void, debrief: (r: MissionResult) => string) {
  root.innerHTML = TEMPLATE;
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  $("mEyebrow").textContent = `SCP Foundation · Site-19 · ${S.setup.title}`;
  const cv = $("cv") as HTMLCanvasElement;
  const draw = createRenderer(cv);

  let hintTimer = 0, hintFlash = "";
  const flash = (t: string) => {
    hintFlash = t; clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => { hintFlash = ""; update(); }, 2600);
    update();
  };

  function renderLog() {
    $("log").innerHTML = S.log.map(l => `<p class="${l.kind}"><span>T${l.t}</span>${esc(l.text)}</p>`).join("");
  }

  function setBtn(id: string, why: string | null, text?: string) {
    const b = $(id) as HTMLButtonElement;
    b.disabled = !!why;
    b.title = why || "";
    if (text) b.innerHTML = text;
  }

  function card(m: Unit) {
    const flags: string[] = [];
    const ms = maxSanOf(m);
    if (m.staring) flags.push(`<span class="flag stare">Do not blink</span>`);
    if (m.overwatch) flags.push(`<span class="flag">Overwatch</span>`);
    if (m.alive && isPanicked(m)) flags.push(`<span class="flag bad">Eyes shut</span>`);
    if (m.alive && m.san <= ms * 0.3) flags.push(`<span class="flag bad">Shaken</span>`);
    if (!m.alive) flags.push(`<span class="flag bad">${m.side === "mtf" ? "KIA" : "Dead"}</span>`);
    if (m.alive && m.side === "subject") flags.push(`<span class="flag bad">Fled</span>`);
    const cap = m.staring ? 1 : 2, d = m.side !== "mtf";
    const usable = m.alive && isTeam(m);
    return `<button type="button" class="op ${d ? "d" : ""} ${S.selected === m ? "sel" : ""} ${usable ? "" : "dead"}" data-id="${m.id}" ${usable ? "" : "disabled"}>
      <span class="tag">${d ? "D" : m.call}</span>
      <span class="nm">${esc(m.name)}</span>
      <span class="ap">${[0, 1].map(i => `<i class="${i < m.ap ? "on" : i >= cap ? "locked" : ""}"></i>`).join("")}</span>
      <span class="bars">
        <span>HP ${Math.max(0, m.hp)}/${m.maxHp}<span class="meter" style="--c: var(--mtf)"><span style="width:${(Math.max(0, m.hp) / m.maxHp) * 100}%"></span></span></span>
        <span>SAN ${m.san}<span class="meter" style="--c: ${m.san <= ms * 0.3 ? "var(--alert)" : "var(--manila)"}"><span style="width:${(m.san / ms) * 100}%"></span></span></span>
        <span>Blink ${pct(blinkChance(m))}</span>
        <span class="flags">${flags.join("")}</span>
      </span>
    </button>`;
  }

  function update() {
    const st = S.statue;
    $("turnPill").textContent = `Turn ${S.turn}`;
    const ph = { player: "Your move", anomaly: "SCP-173", hand: "Chaos Insurgency", subjects: "D-Class fleeing", over: "Incident closed" }[S.phase];
    $("phasePill").textContent = ph;
    $("phasePill").className = "pill" + (S.phase === "anomaly" ? " hot" : "");

    const sc = $("statusCard"), line = $("statusLine");
    if (S.sealed) {
      sc.className = "card status done";
      line.innerHTML = "<b>Sealed in the transport container.</b>";
    } else if (seen(st.x, st.y)) {
      const ss = starers();
      const where = inContainer(st.x, st.y) ? " It is inside the open container." : "";
      if (ss.length) {
        const risk = ss.reduce((p, m) => p * blinkChance(m), 1);
        sc.className = "card status held";
        line.innerHTML = `<b>Held.</b>${where} Staring: ${ss.map(m => `${esc(label(m))} (blink ${pct(blinkChance(m))})`).join(", ")}<br>Chance they all blink at once: ${pct(risk)}`;
      } else {
        sc.className = "card status danger";
        line.innerHTML = `<b>In sight, nobody staring.</b>${where} If nobody else has eyes on it, it moves when the turn ends.`;
      }
    } else {
      sc.className = "card status danger";
      line.innerHTML = `<b>Not in sight.</b> ${S.lastSeen ? `Last seen turn ${S.lastSeen.turn}, ${area(S.lastSeen.x, S.lastSeen.y)}.` : "Somewhere in the north rooms."}<br>It is hunting. Anyone it catches not looking is in danger.`;
    }

    const ops = S.units.filter(u => u.side === "mtf");
    const ds = S.units.filter(u => u.id.startsWith("d") || u.joined);
    $("squad").innerHTML = ops.map(card).join("") + (ds.length ? `<h3>D-Class work detail</h3>` + ds.map(card).join("") : "");

    const sel = S.selected, can = canAct();
    const off = can ? null : "Wait for your turn.";
    setBtn("stareBtn", off || (sel && sel.staring ? null : stareCheck(sel)), sel && sel.staring ? "Stop staring <kbd>B</kbd>" : "Do not blink <kbd>B</kbd>");
    $("stareBtn").classList.toggle("on", !!(sel && sel.staring));
    setBtn("callBtn", off || callCheck());
    const dragWhy = sel && sel.staring && team().some(w => w !== sel && w.staring) ? null : dragCheck(sel);
    setBtn("dragBtn", off || (S.mode === "drag" ? null : dragWhy), S.mode === "drag" ? "Cancel drag <kbd>G</kbd>" : "Drag <kbd>G</kbd>");
    $("dragBtn").classList.toggle("on", S.mode === "drag");
    setBtn("sealBtn", off || sealCheck(sel));
    setBtn("owBtn", off || (!sel ? "Select someone." : sel.side !== "mtf" ? "D-Class are unarmed." : sel.ap < 1 ? "No actions left this turn." : null));
    setBtn("nextBtn", off);
    setBtn("endBtn", off);
    setBtn("evacBtn", off);

    let h = "";
    if (hintFlash) h = `<b>${esc(hintFlash)}</b>`;
    else if (!can) h = S.over ? "" : "Enemy activity…";
    else if (sel) {
      const hv = S.hover && unitAt(S.hover.x, S.hover.y);
      if (S.mode === "drag") h = `<b>${esc(sel.name)}: choose where to drag SCP-173.</b>\nOrange tiles keep it in someone else's sight the whole way. Dragging ends their turn.`;
      else if (hv && hv.side === "raider" && seen(hv.x, hv.y) && sel.side === "mtf" && sel.ap > 0 && canSee(sel, hv.x, hv.y)) {
        const s = shotInfo(sel, hv);
        h = `<b>${sel.call} → Insurgent: ${s.chance}% to hit</b>${s.crit ? `, ${s.crit}% crit` : ""}\n` + s.mods.map(m => `${m[0]} ${m[1] >= 0 ? "+" : ""}${m[1]}`).join(" · ");
      } else if (!sealCheck(sel)) h = `<b>${sel.call} can seal the container now.</b> Press S.`;
      else if (sel.staring) h = `<b>${esc(full(sel))} is staring</b>, ${sel.ap} action${sel.ap === 1 ? "" : "s"}.\nThey can move anywhere that keeps sight of SCP-173. Press B to look away (free).`;
      else h = `<b>${esc(full(sel))}</b>, ${sel.ap} action${sel.ap === 1 ? "" : "s"}.\nClick a tile to move (blue costs 1, amber costs 2).${sel.side === "mtf" ? " Click a visible Insurgent to fire." : " D-Class are unarmed."} Next to SCP-173, press G to drag it.${matchMedia("(pointer: coarse)").matches ? " Tap twice to confirm." : ""}`;
    } else h = "No one has actions left. End the turn.";
    $("hint").innerHTML = h;

    $("notes").innerHTML = NOTES_173.map(n => {
      const cls = [n.cls || "", S.fresh.has(n.id) ? "new" : ""].join(" ").trim();
      if (S.known.has(n.id)) return `<li class="${cls}">${esc(n.text)}</li>`;
      const words = n.text.split(" ").map(w => "█".repeat(Math.max(2, Math.min(9, w.length)))).join(" ");
      return `<li><span class="redact">${words}</span></li>`;
    }).join("");
    S.fresh.clear();
  }

  hooks.update = update;
  hooks.log = renderLog;
  hooks.finished = (r: MissionResult) => {
    $("overlaySheet").innerHTML = debrief(r) + `<button class="act primary" type="button" id="returnBtn">Return to Site-19</button>`;
    $("overlay").hidden = false;
    $("returnBtn").onclick = () => { stop(); onReturn(); };
    $("returnBtn").focus();
  };

  // input
  $("squad").addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".op");
    if (!b || !canAct()) return;
    const u = S.units.find(x => x.id === b.dataset.id);
    if (u && u.alive && isTeam(u)) select(u);
  });
  $("stareBtn").onclick = () => toggleStare(flash);
  $("callBtn").onclick = () => callBlink(flash);
  $("dragBtn").onclick = () => toggleDrag(flash);
  $("sealBtn").onclick = () => doSeal(flash);
  $("owBtn").onclick = doOverwatch;
  $("nextBtn").onclick = selectNext;
  $("endBtn").onclick = endTurn;
  let evacArmed = 0;
  $("evacBtn").onclick = () => {
    const b = $("evacBtn");
    if (!evacArmed) {
      b.textContent = "Confirm evacuate";
      evacArmed = window.setTimeout(() => { evacArmed = 0; b.textContent = "Evacuate"; }, 3000);
      return;
    }
    clearTimeout(evacArmed); evacArmed = 0;
    evacuate();
  };
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest && t.closest("input,textarea,select")) return;
    const k = e.key.toLowerCase();
    if (k === "tab") { e.preventDefault(); selectNext(); }
    else if (k === "escape") { if (S.mode) { S.mode = null; update(); } }
    else if (k === "e") endTurn();
    else if (k === "o") doOverwatch();
    else if (k === "b") toggleStare(flash);
    else if (k === "c") callBlink(flash);
    else if (k === "g") toggleDrag(flash);
    else if (k === "s") doSeal(flash);
  };
  document.addEventListener("keydown", onKey);

  let lastPointer = "mouse";
  const tileFromEvent = (e: MouseEvent) => {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * L.W), y = Math.floor((e.clientY - r.top) / r.height * L.H);
    return (x >= 0 && y >= 0 && x < L.W && y < L.H) ? { x, y } : null;
  };
  cv.addEventListener("pointerdown", e => { lastPointer = e.pointerType; });
  cv.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const t = tileFromEvent(e);
    if ((t && (!S.hover || t.x !== S.hover.x || t.y !== S.hover.y)) || (!t && S.hover)) { S.hover = t; update(); }
  });
  cv.addEventListener("pointerleave", () => { if (lastPointer === "mouse") { S.hover = null; update(); } });
  cv.addEventListener("click", e => { const t = tileFromEvent(e); if (t) onTap(t.x, t.y, lastPointer !== "mouse", flash); });

  let running = true;
  const loop = (now: number) => { if (!running) return; draw(now); requestAnimationFrame(loop); };
  function stop() {
    running = false;
    document.removeEventListener("keydown", onKey);
    clearTimeout(hintTimer);
  }

  renderLog();
  startPlayerTurn(true);
  requestAnimationFrame(loop);
  window.scrollTo(0, 0);
}
