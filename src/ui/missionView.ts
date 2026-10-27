// The mission screen: map, SCP-173 status, squad, actions, containment file and incident log.
import { DRUM, EXIT, L, area, inContainer } from "../core/grid";
import { activeGun, shotInfo } from "../game/combat";
import { AMMO } from "../data/weapons";
import { WEATHER } from "../data/weather";
import { NOTES_173 } from "../game/notes";
import { blinkChance, maxSanOf, pct } from "../game/profiles";
import { S, canAct, canSee, full, hooks, isBlind, isPanicked, isTeam, label, seen, starers, team, unitAt } from "../game/state";
import {
  callBlink, callCheck, doOverwatch, doSeal, dragCheck, endTurn, evacuate, onTap, sealCheck, select, selectNext,
  doReload, fireCheck, reloadCheck, useCheck, useItem, stareCheck, startPlayerTurn, throwCheck, toggleDrag, toggleStare, toggleThrow,
} from "../game/turn";
import { HEAVY, RAID_TURNS, THROWN, type AbilityId, type ItemId } from "../game/types";
import { abilitiesOf, abilityCheck, abilityDesc, abilityName, startAbility } from "../game/abilities";
import { usesLeft } from "../game/perks";
import { CLASSES, PERKS } from "../data/classes";

const OBJECTIVES = {
  breach: "",
  manhunt: "SCP-173 is loose among civilians. Get it into the truck's open container, with nobody else inside, then have an operative seal it. Every civilian it kills adds exposure in the region.",
  coverup: "Reach every witness (marked W) and give them amnestics with Dose: 1 action, from the next tile. A witness who spots the team runs for the map edge; any who escape undosed add exposure. Dose at least half of them for the mission to count as a success. Other civilians can be ignored.",
  raid: "Keep the Insurgents away from the lift doors in the lift house. Guards standing in the doorway keep them from forcing it. One who spends a turn at the doors forces them open on the next. Kill or drive them all off, or hold until they pull back.",
  riot: "Restrain the rioting D-Class (next to them, 1 action) or put them down. Every one killed is a D-Class lost from storage.",
  outbreak: "Burn out SCP-610's core with fire (incendiaries, the flamethrower, fuel drums). Anyone who ends a turn on the flesh without a sealed containment suit is infected and turns 5 turns later. Nothing saves them.",
  escort: "Keep the Insurgents away from the truck. One who stays next to it for a turn gets it open and the anomaly is lost. Neutralise them all, or hold for 8 turns.",
  retaliation: "Neutralise every Insurgent. They shoot civilians too, and every civilian killed adds exposure in the region.",
  strike: "Neutralise every Insurgent in the warehouse. Use Secure on a wounded one to take them prisoner.",
} as const;
const ITEM_NAMES: Record<ItemId, string> = { armor: "Flak vest", armor_light: "Recon smock", armor_heavy: "Heavy plate", hazmat: "Hazmat suit", leadsuit: "Lead-lined suit",
  contsuit: "Containment suit", incendiary: "Incendiary", flamer: "M2 flamethrower", flare: "Signal flare", eyedrops: "Eye drops", flashbang: "Stun grenade", smoke: "M18 smoke", tracker: "Seismic sensor", frag: "M26 frag", csgas: "CS gas", bazooka: "M20 bazooka", law: "M72 LAW",
  medkit: "Medkit", camera: "Field camera", restraints: "Restraint kit", darts: "Amnestic darts", ward: "Warding charm" };
import type { MissionResult, Unit } from "../game/types";
import { esc } from "./util";
import { createRenderer } from "./render";
import { ESCAPE_AT, escaping } from "../game/scp173";
import { ESCORT_TURNS, MAX_SEALED } from "../game/turn";
import { freshBodies, isCalm, isStaggered } from "../game/scp049";
import { bait, isFeeding } from "../game/scp106";
import { MAPS } from "../data/maps";

const TEMPLATE = `
<main class="wrap">
  <header class="top">
    <div>
      <div class="eyebrow" id="mEyebrow"></div>
      <h1 id="mTitle">SCP-173 Recontainment <small>“The Sculpture” · Euclid</small></h1>
    </div>
    <div class="turnbox">
      <span class="pill" id="turnPill">Turn 1</span>
      <span class="pill" id="phasePill">Your move</span>
      <span class="pill hot" id="sirenPill" hidden title="The breach siren: nobody recovers sanity on quiet turns, but SCP-173 can't hear where shots come from. Silence it at the panel.">Siren</span>
      <span class="pill" id="nightPill" hidden title="Night: everyone sees 4 tiles less, except inside a flare's light.">Night</span>
      <span class="pill" id="weatherPill" hidden></span>
      <span class="pill" id="concealPill" hidden title="Insurgents haven't noticed the team. They only spot you within 4 tiles. Firing or throwing anything gives you away.">Concealed</span>
      <button class="act" id="evacBtn" type="button" title="Ends the mission. Anyone who hasn't left through an exit is left behind.">Abort mission</button>
    </div>
  </header>

  <div class="layout">
    <section class="board" aria-label="Tactical map">
      <canvas id="cv"></canvas>
      <div class="legend" id="legend"></div>
      <details class="rules" open>
        <summary>How this works</summary>
        <div id="objRule"><b>Objective.</b> Get SCP-173 into the transport container at the dock in the southwest staging room, with nobody else inside, then have an operative seal it.</div>
        <div><b>Do not blink.</b> Anyone on your team locks eyes on SCP-173 when they first see it, which costs 1 action. While staring they get one action per turn and can move anywhere that keeps sight of it. Looking away is free.</div>
        <div><b>Blinks.</b> Everyone has a chance to blink each turn. D-Class blink more than operatives, and everyone blinks more as sanity falls. SCP-173 can only move when nobody with their eyes open can see it.</div>
        <div><b>SCP-173 hunts.</b> It moves up to 8 tiles a turn and freezes the moment it steps into anyone's sight. It kills anyone it reaches while unseen (someone mid-blink, looking away or with their eyes shut) and keeps going. It can't see through walls, but it hears gunfire. It passes straight through the container, so drag it in.</div>
        <div><b>Dragging.</b> Anyone next to SCP-173 can drag it once per turn while someone else stares at it: D-Class up to 2 tiles, operatives 1. It costs 5 sanity, and afterwards the dragger looks straight back at it.</div>
        <div><b>Sanity</b> recovers on quiet turns: anyone not staring who lost no sanity that turn regains 5 (operatives) or 4 (D-Class).</div>
        <div><b>Cover</b> only stops gunfire, and only when it sits between shooter and target. SCP-173 ignores it.</div>
        <div><b>Sight and shooting.</b> At least 3 of 10 sight lines between two tiles must be clear to see or shoot. A target with only 3 or 4 clear lines is partly hidden: −15% to hit and no critical hits. Anyone with a wall or pillar beside them can lean out past its edge to look and shoot, at the same −15%.</div>
        <div><b>Going down.</b> An operative at 0 HP is down and bleeds out in 3 turns. A medic with Stabilize can save them; otherwise they survive only if the mission is won first.</div>
        <div><b>Equipment.</b> Armor adds HP and armor points; each point cuts the damage of every hit by 1. Eye drops save one blink while staring. Flashbangs blind everyone within a tile of where they land until next turn, including anyone holding SCP-173. Smoke blocks all sight for two turns. Motion trackers show anything within 6 tiles, through walls.</div>
        <div><b>The Insurgency</b> holds SCP-173 with their eyes too, and loses sanity doing it. When they crack, they cover their eyes and SCP-173 is free to go after them.</div>
      </details>
      <div class="overlay" id="overlay" hidden><div class="sheet" id="overlaySheet"></div></div>
    </section>

    <aside class="side">
      <div class="card status" id="statusCard">
        <div class="label" id="statusLabel">SCP-173 status</div>
        <div class="status-line" id="statusLine"></div>
      </div>
      <div class="card">
        <div class="label" id="squadLabel">Mobile Task Force Epsilon-11 “Nine-Tailed Fox”</div>
        <div class="squad" id="squad"></div>
      </div>
      <div class="card">
        <div class="actions">
          <button class="act" id="stareBtn" type="button">Do not blink <kbd>B</kbd></button>
          <button class="act" id="callBtn" type="button">Call the blink <kbd>C</kbd></button>
          <button class="act" id="dragBtn" type="button">Drag <kbd>G</kbd></button>
          <button class="act" id="sealBtn" type="button">Seal <kbd>S</kbd></button>
          <button class="act" id="owBtn" type="button">Overwatch <kbd>O</kbd></button>
          <button class="act" id="reloadBtn" type="button">Reload <kbd>R</kbd></button>
          <button class="act" id="nextBtn" type="button">Next <kbd>Tab</kbd></button>
          <button class="act primary wide" id="endBtn" type="button">End turn <kbd>E</kbd></button>
        </div>
        <div class="itembar" id="itemBar"></div>
        <div class="hint" id="hint"></div>
      </div>
      <div class="file" id="fileCard">
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

/** The map key for this mission: only what can actually appear on it. */
function legendHtml() {
  const u = S.units, any = (f: (x: Unit) => boolean) => u.some(f) || S.reinforce.some(r => r.members.some(m => f({ guard: m.guard, side: "mtf" } as Unit)));
  const tiles = (ch: number) => L.grid.some(row => row.includes(ch));
  const items: [string, string, string][] = [];   // [shape class, colour, text]
  if (any(x => x.side === "mtf" && !x.guard)) items.push(["", "var(--mtf)", "MTF Epsilon-11 (number = squad slot)"]);
  if (any(x => x.side === "mtf" && !!x.guard)) items.push(["sq", "#9fb3c4", "Site Security"]);
  if (u.some(x => (x.side === "dclass" || x.side === "subject") && !x.rioter)) items.push(["", "var(--subject)", "D-Class (dashed ring: loose)"]);
  if (u.some(x => x.rioter)) items.push(["ring", "var(--subject)", "Rioting D-Class"]);
  if (u.some(x => x.side === "civilian")) items.push(["sq", "#cfc6a8", `Civilian${u.some(x => x.witness) ? " · W witness" : ""}${u.some(x => x.researcher) ? " · R researcher" : ""}`]);
  if (u.some(x => x.side === "raider") || S.setup.insurgents) items.push(["dia", "var(--raider)", `${S.setup.gru ? "GRU Division \"P\"" : "Chaos Insurgency"} (paler: hasn't spotted you; red arc: on overwatch)`]);
  if (u.some(x => x.role === "sniper")) items.push(["dia", "var(--raider)", "S · sniper: long-range overwatch"]);
  if (u.some(x => x.role === "demo")) items.push(["dia", "var(--raider)", "X · sapper: blows holes through walls"]);
  if (u.some(x => x.role === "officer")) items.push(["dia", "var(--raider)", "O · officer: +10 aim to Insurgents within 4 tiles"]);
  if (u.some(x => x.role === "commander")) items.push(["dia", "var(--raider)", `★ ${S.setup.commander}: their commander. Flees when badly hurt; take them alive if you can`]);
  if (S.setup.reinforce && !S.ciLanded) items.push(["sq", "transparent", `Reinforcements expected around turn ${S.setup.reinforce} (a turn's warning)`]);
  if (S.has173) items.push(["fig", "var(--concrete)", "SCP-173 · the Sculpture"]);
  if (S.has049) items.push(["fig", "#1d1a18", "SCP-049 · the Plague Doctor (pale mask)"], ["", "#6f7a5c", "SCP-049-2 · its reanimated dead"]);
  if (S.has106) items.push(["fig", "#2a2118", "SCP-106 · the Old Man"], ["sq", "rgba(28,22,14,.9)", "Black rot · costs 2 to cross, 1 damage"]);
  if (S.setup.kind === "outbreak") items.push(["", "#8c2c34", "SCP-610 instance"], ["sq", "rgba(120,24,32,.85)", "SCP-610 flesh · infects without a sealed suit"], ["", "#aa1e28", "Flesh core · only fire hurts it"]);
  if (S.setup.kind === "outbreak" || tiles(DRUM)) items.push(["sq", "rgba(255,140,40,.8)", "Fire · 2 damage a turn"]);
  if (tiles(DRUM)) items.push(["", "#7a3b1e", "Fuel drum · explodes when hit by fire"]);
  if (L.contTiles.length) items.push(["sq", "var(--steel)", S.setup.kind === "raid" ? "Lift doors" : S.setup.map === "wingC" ? "Transport container" : "Truck's container"]);
  if (tiles(EXIT)) items.push(["sq", "var(--exit)", "Exit"]);
  items.push(["sq", "#57503f", "Desk · half cover"], ["sq", "#4a5561", "Pillar · full cover"]);
  return items.map(([cls, col, text]) => `<span class="${cls}" style="--c: ${col}">${esc(text)}</span>`).join("");
}

/** Mounts the mission screen. Calls onDone with the result after the player reads the debrief. */
export function mountMission(root: HTMLElement, onReturn: () => void, debrief: (r: MissionResult) => string) {
  root.innerHTML = TEMPLATE;
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  $("mEyebrow").textContent = `SCP Foundation · ${S.setup.title}`;
  const has173 = S.has173, kind = S.setup.kind;
  $("legend").innerHTML = legendHtml();
  if (kind !== "breach") {
    $("mTitle").innerHTML = { raid: "Raid <small>Site-19 surface compound</small>", riot: "Riot <small>D-Class block</small>", outbreak: "SCP-610 Outbreak <small>“The Flesh that Hates” · Keter</small>", escort: "Convoy Ambush <small>Escort</small>", retaliation: "Retaliation <small>Insurgency attack</small>", manhunt: "SCP-173 Manhunt <small>Field recovery</small>", coverup: "Cover-up <small>Class-A amnestics</small>", strike: "Strike <small>Chaos Insurgency cell</small>", breach: "" }[kind];
    $("objRule").innerHTML = `<b>Objective.</b> ${esc(OBJECTIVES[kind])}`;
  }
  if (!has173) {
    for (const id of ["stareBtn", "callBtn", "dragBtn", ...(S.has049 || S.has106 ? [] : ["sealBtn"])]) $(id).hidden = true;
    $("fileCard").hidden = true;
    root.querySelectorAll<HTMLElement>(".rules > div").forEach(d => { if (d.id !== "objRule" && /SCP-173|Do not blink|Dragging|Blinks\./.test(d.textContent || "")) d.hidden = true; });
    $("statusLabel").textContent = S.has049 ? "SCP-049 status" : S.has106 ? "SCP-106 status" : "Objective";
  }
  if (S.has106) {
    $("mTitle").innerHTML = `SCP-106 ${kind === "breach" ? "Recontainment" : S.setup.title.startsWith("Anomalous") ? "Capture" : "Manhunt"} <small>“The Old Man” · Keter</small>`;
    $("objRule").innerHTML = `<b>Objective.</b> Seal SCP-106 in the ${kind === "breach" ? "transport container in the staging room" : "truck's open container"}. It walks through walls and drags anyone it reaches into its pocket dimension, then sinks into the floor for 2 turns and rises near someone nobody is watching. Shooting it drives it under for a turn but can't hurt it. Its black rot costs double to cross and deals 1 damage. <b>Bait:</b> walk a D-Class (or a secured Insurgent) into the container. SCP-106 goes straight for them and stays a turn to feed: seal the door during that turn. People it takes have a ${Math.round(S.setup.mods.pocketReturn * 100)}% chance of coming back when the mission ends.${kind === "breach" ? " Site Security starts on the scene; Epsilon-11 arrives later." : ""}`;
  }
  if (S.has049) {
    $("mTitle").innerHTML = kind === "breach" ? "SCP-049 Recontainment <small>“The Plague Doctor” · Euclid</small>" : `SCP-049 ${S.setup.title.startsWith("Anomalous") ? "Capture" : "Manhunt"} <small>“The Plague Doctor” · Euclid</small>`;
    $("objRule").innerHTML = `<b>Objective.</b> Get SCP-049 into the ${kind === "breach" ? "transport container in the staging room" : "truck's open container"}, with nobody else inside, then have an operative seal it. Its touch kills anyone next to it, and it spends a turn beside any fresh body to raise it as SCP-049-2. Gunfire can't hurt it, but a hit staggers it so it loses its next move. <b>Calm</b> (1 action, 6 sanity, within 3 tiles and in sight) stops it acting on its next turn and lets you lead it up to 3 tiles. SCP-049-2 can be killed with gunfire.${kind === "breach" ? " Site Security starts on the scene; Epsilon-11 arrives later." : ""}`;
  }
  if (kind === "breach") {
    $("squadLabel").textContent = "Site Security and Epsilon-11";
    const extra = document.createElement("div");
    extra.innerHTML = `<b>Staff and D-Class.</b> Researchers (R) are hiding in the wing: walk anyone next to one and they follow that person to an exit. Every one lost is gone from your staff. The breach opened the D-Class block: <b>Restrain</b> loose D-Class (next to them, 1 action) to send them back to holding. Killing one costs you a D-Class, and one who escapes through an exit is gone and adds 3 exposure.`;
    $("objRule").after(extra);
  }
  {
    if (S.concealed) {
      const c = document.createElement("div");
      c.innerHTML = `<b>Concealment.</b> The team starts unseen. Insurgents who haven't been alerted only notice you within 4 tiles (red tiles show where they're looking). Firing, throwing anything or a bayonet attack gives you away. Insurgents move in fire teams: when one is alerted, the whole team dashes for cover at once, so set overwatch first for an ambush. Witnesses only run once you're seen.`;
      $("objRule").after(c);
    }
    const exits = document.createElement("div");
    exits.innerHTML = `<b>Exits, carrying and cover.</b> Stand on an exit tile to <b>Exfiltrate</b>; anyone you carry comes with you. <b>Pick up</b> a downed ally or a body next to you (−1 move). <b>Hunker down</b> next to cover to double it until your next turn. <b>Abort mission</b> ends it at once, and anyone who hasn't left through an exit is left behind.`;
    $("objRule").after(exits);
  }
  if (kind === "breach" && has173) {
    $("objRule").innerHTML = `<b>Objective.</b> Get SCP-173 into the transport container at the dock in the southwest staging room, with nobody else inside, then seal it. The panel at the east end of the corridor also seals blast doors (up to ${MAX_SEALED}) and silences the breach siren, which stops quiet turns restoring sanity but hides your gunfire from SCP-173. Site Security starts on the scene; Epsilon-11 arrives later. If SCP-173 roams unseen for ${ESCAPE_AT} turns without a kill it heads for the surface hatch in the east lab, and if it gets there it's out of Site-19. Anyone at the panel at the east end of the corridor can spend both actions to lock the hatch for ${S.setup.mods.lockdownTurns} turns.`;
  }
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

  // the first time each situational action appears, say what it is
  const FIRST: Record<string, string> = {
    stareBtn: "New action: Do not blink. Holding SCP-173's gaze keeps it frozen; it costs an action and wears down sanity.",
    callBtn: "New action: Call the blink. Everyone staring blinks together on purpose, so you choose when SCP-173 gets to move.",
    dragBtn: "New action: Drag. Next to SCP-173 while someone else stares at it, you can drag it toward the container.",
    sealBtn: "New action: Seal. The anomaly is in the container: shut the door.",
  };
  const seenActions: Set<string> = (() => { try { return new Set(JSON.parse(localStorage.getItem("site19-seen-actions") || "[]")); } catch { return new Set(); } })();
  function ctxBtn(id: string, why: string | null, text?: string) {
    if (!(S.has173 || id === "sealBtn") || (id === "sealBtn" && !(S.has173 || S.has049 || S.has106))) { $(id).hidden = true; return; }
    setBtn(id, why, text);
    $(id).hidden = !!why;
    if (!why && !seenActions.has(id) && FIRST[id]) {
      seenActions.add(id);
      try { localStorage.setItem("site19-seen-actions", JSON.stringify([...seenActions])); } catch { /* fine */ }
      setTimeout(() => flash(FIRST[id]), 0);
    }
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
    if (m.alive && isBlind(m)) flags.push(`<span class="flag bad">Blinded</span>`);
    if (m.alive && m.downed) flags.push(`<span class="flag bad">${m.stabilized ? "Down · stabilized" : `Bleeding out · ${m.bleed} turn${m.bleed === 1 ? "" : "s"}`}</span>`);
    if (m.cls) flags.push(`<span class="flag">${CLASSES[m.cls].name}</span>`);
    if (m.gun) flags.push(`<span class="flag ${m.gun.ammo ? "" : "bad"}">${esc(m.gun.name)} ${"●".repeat(m.gun.ammo)}${"○".repeat(Math.max(0, m.gun.mag - m.gun.ammo))}</span>`);
    if (m.gun && !m.gun.ammo && m.side === "mtf") flags.push(`<span class="flag">Sidearm</span>`);
    if (m.gun?.ammoType) flags.push(`<span class="flag">${esc(AMMO[m.gun.ammoType].name)}</span>`);
    if (m.armor) flags.push(`<span class="flag">Armor ${m.armor}</span>`);
    for (const it of m.items || []) if (it.uses > 0 || it.id === "tracker") flags.push(`<span class="flag">${ITEM_NAMES[it.id]}${it.id === "tracker" ? "" : ` ×${it.uses}`}</span>`);
    if (m.alive && m.san <= ms * 0.3) flags.push(`<span class="flag bad">Shaken</span>`);
    if (!m.alive) flags.push(`<span class="flag bad">${m.taken ? "Taken by SCP-106" : m.side === "mtf" ? "KIA" : "Dead"}</span>`);
    if (m.alive && m.side === "subject") flags.push(`<span class="flag bad">Fled</span>`);
    if (m.alive && m.infectedTurn !== undefined && !m.flesh) flags.push(`<span class="flag bad">Infected · turns in ${5 - (S.turn - m.infectedTurn)}</span>`);
    if (m.armorKind === "contsuit") flags.push(`<span class="flag ${m.suitTorn ? "bad" : ""}">${m.suitTorn ? "Suit torn" : "Suit sealed"}</span>`);
    if (m.flesh) flags.push(`<span class="flag bad">Turned</span>`);
    const cap = m.staring ? 1 : 2, d = m.side !== "mtf";
    const usable = m.alive && isTeam(m) && !m.downed;
    return `<button type="button" class="op ${d ? "d" : ""} ${S.selected === m ? "sel" : ""} ${usable ? "" : "dead"}" data-id="${m.id}" ${usable ? "" : "disabled"}>
      <span class="tag">${d ? "D" : m.call}</span>
      <span class="nm">${m.rankShort ? `<span class="muted">${m.rankShort}</span> ` : ""}${esc(m.name)}</span>
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
    $("concealPill").hidden = !S.concealed;
    $("nightPill").hidden = !S.setup.night;
    const w = S.setup.weather ?? "clear", wp = $("weatherPill");
    wp.hidden = w === "clear";
    if (w !== "clear") { wp.textContent = WEATHER[w].name; wp.title = `${WEATHER[w].name}: ${WEATHER[w].desc.replace(" Flights there take a day longer.", "")}`; }
    $("sirenPill").hidden = !S.siren;

    const sc = $("statusCard"), line = $("statusLine");
    if (kind === "riot") {
      const left = S.units.filter(u => u.rioter && u.alive && !u.downed && u.side === "zombie").length;
      sc.className = "card status " + (left ? "danger" : "done");
      line.innerHTML = `<b>Rioters still loose: ${left}.</b> Restrained: ${S.units.filter(u => u.rioter && u.restrained).length} · killed: ${S.units.filter(u => u.rioter && !u.alive).length}`;
    } else if (kind === "outbreak") {
      const inf = S.units.filter(u => u.alive && u.infectedTurn !== undefined && !u.flesh);
      sc.className = "card status " + (S.core && S.core.hp <= 0 ? "done" : "danger");
      line.innerHTML = `<b>Core: ${S.core ? `${Math.max(0, S.core.hp)} of ${S.core.maxHp}` : "?"}</b> · flesh covers ${S.flesh.size} tiles · instances: ${S.units.filter(u => u.flesh && u.alive).length}${inf.length ? `<br><span class="warn">Infected: ${inf.map(u => `${esc(u.name)} (turns in ${5 - (S.turn - u.infectedTurn!)})`).join(", ")}</span>` : ""}`;
    } else if (S.has106) {
      const m = S.statue, b = bait();
      const state = S.sealed ? "<b>Sealed in the container.</b>" : isFeeding() ? "<b>Feeding in the container.</b> Seal the door now." : S.submerged ? `<b>Under the floor.</b> It rises again ${S.sunkUntil >= S.turn ? `after turn ${S.sunkUntil}` : "next turn"}.` : seen(m.x, m.y) ? `<b>In sight</b> in the ${area(m.x, m.y)}.` : "<b>Not in sight.</b> It could be behind any wall.";
      sc.className = "card status " + (S.sealed ? "done" : isFeeding() ? "held" : "danger");
      line.innerHTML = `${state}<br>Bait in the container: ${b.length ? b.map(u => esc(u.name)).join(", ") : "none"} · Taken so far: ${S.units.filter(u => u.taken).length}`;
    } else if (S.has049) {
      const d = S.statue, z = S.units.filter(u => u.side === "zombie" && u.alive).length, bodies = freshBodies().length;
      const state = S.sealed ? "<b>Sealed in the container.</b>" : isCalm() ? "<b>Calm.</b> It won't act this turn." : isStaggered() ? "<b>Staggered.</b> It loses its next move." : seen(d.x, d.y) ? "<b>In sight.</b> Anyone next to it is in danger." : "<b>Not in sight.</b>";
      sc.className = "card status " + (S.sealed ? "done" : isCalm() ? "held" : "danger");
      line.innerHTML = `${state}${!S.sealed && seen(d.x, d.y) ? ` It is in the ${area(d.x, d.y)}${inContainer(d.x, d.y) ? ", inside the open container" : ""}.` : ""}<br>Bodies it could raise: ${bodies} · SCP-049-2 on the map: ${z}`;
    } else if (!has173) {
      const civ = S.units.filter(u => u.side === "civilian");
      if (kind === "coverup") {
        const w = civ.filter(u => u.witness), dosed = w.filter(u => u.dosed).length, gone = w.filter(u => u.saved && !u.dosed).length;
        const loose = w.filter(u => u.alive && !u.dosed && !u.saved).length;
        sc.className = "card status " + (loose ? "danger" : "done");
        line.innerHTML = `<b>Witnesses: ${dosed} dosed, ${loose} still loose${gone ? `, ${gone} got away` : ""}.</b><br>Amnestics carried: ${S.amnestics}. Dose takes 1 action next to a witness.`;
      } else {
        const up = S.units.filter(u => u.side === "raider" && u.alive && !u.downed).length;
        const forcing = S.units.some(u => u.side === "raider" && u.alive && u.stealTurn === S.turn);
        sc.className = "card status " + (up ? "danger" : "done");
        if (kind === "escort") line.innerHTML = `<b>Insurgents still fighting: ${up}.</b> Hold until turn ${ESCORT_TURNS}: ${Math.max(0, ESCORT_TURNS - S.turn)} more.<br>${forcing ? "<b>Someone is at the truck.</b>" : "Nobody at the truck."}`;
        else if (kind === "raid") {
          const mtf = S.reinforce.find(r => !r.members[0]?.guard);
          line.innerHTML = `<b>Insurgents still fighting: ${up} of ${S.setup.insurgents}.</b> They pull back after turn ${RAID_TURNS}: ${Math.max(0, RAID_TURNS - S.turn)} more.${mtf ? ` Epsilon-11 comes up the lift on turn ${mtf.turn}.` : ""}<br>${forcing ? "<b>Someone is forcing the lift doors.</b>" : "Nobody at the lift doors."}`;
        } else line.innerHTML = `<b>Insurgents still fighting: ${up} of ${S.setup.insurgents}.</b><br>Neutralised: ${S.stats.raidersDown}. Wounded ones can be secured as prisoners.`;
      }
    } else if (S.sealed) {
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
      const tracked = S.setup.mods.track173 ? ` Movement study puts it in the <b>${area(st.x, st.y)}</b>.` : ` ${S.lastSeen ? `Last seen turn ${S.lastSeen.turn}, ${area(S.lastSeen.x, S.lastSeen.y)}.` : (S.setup.kind === "manhunt" ? "Somewhere nearby." : "Somewhere in the north rooms.")}`;
      line.innerHTML = `<b>Not in sight.</b>${tracked}<br>It is hunting. Anyone it catches not looking is in danger.`;
    }

    // breach extras: when help arrives, and how close SCP-173 is to leaving
    if (has173 && L.def.hatch && !S.sealed) {
      const next = [...S.reinforce].sort((a, b) => a.turn - b.turn);
      const locked = S.lockedUntil >= S.turn;
      const threat = escaping() ? `<span class="warn">high: it is heading for the hatch</span>` : S.escapeDrive >= ESCAPE_AT - 2 ? "rising" : "low";
      line.innerHTML += `<br>Escape threat: <b>${threat}</b> · Hatch ${locked ? `<b>locked</b> through turn ${S.lockedUntil}` : "open"}${next.length ? `<br>${next.map(r => `${r.members[0].guard ? "Guards" : "Epsilon-11"} (${r.members.length}) arrive turn ${r.turn}`).join(" · ")}` : ""}`;
    }
    if (kind === "breach" && !S.over) {
      const docs = S.units.filter(u => u.researcher), loose = S.units.filter(u => u.stray && u.alive && !u.saved && !u.restrained && u.side === "subject").length;
      if (docs.length || S.units.some(u => u.stray)) line.innerHTML += `<br>Researchers: ${docs.filter(d => d.saved).length} out, ${docs.filter(d => d.alive && !d.saved).length} in the wing, ${docs.filter(d => !d.alive).length} lost · Loose D-Class: ${loose}`;
    }
    const ops = S.units.filter(u => u.side === "mtf");
    const ds = S.units.filter(u => u.id.startsWith("d") || u.joined);
    $("squad").innerHTML = ops.map(card).join("") + (ds.length ? `<h3>D-Class work detail</h3>` + ds.map(card).join("") : "");

    const sel = S.selected, can = canAct();
    const off = can ? null : "Wait for your turn.";
    // situational actions only show when they can be used, to keep the bar clear
    ctxBtn("stareBtn", off || (sel && sel.staring ? null : stareCheck(sel)), sel && sel.staring ? "Stop staring <kbd>B</kbd>" : "Do not blink <kbd>B</kbd>");
    $("stareBtn").classList.toggle("on", !!(sel && sel.staring));
    ctxBtn("callBtn", off || callCheck());
    const dragWhy = sel && sel.staring && team().some(w => w !== sel && w.staring) ? null : dragCheck(sel);
    ctxBtn("dragBtn", off || (S.mode === "drag" ? null : dragWhy), S.mode === "drag" ? "Cancel drag <kbd>G</kbd>" : "Drag <kbd>G</kbd>");
    $("dragBtn").classList.toggle("on", S.mode === "drag");
    ctxBtn("sealBtn", off || sealCheck(sel));
    setBtn("owBtn", off || (!sel ? "Select someone." : sel.side !== "mtf" ? "D-Class are unarmed." : sel.ap < 1 ? "No actions left this turn." : null));
    setBtn("nextBtn", off);
    setBtn("reloadBtn", off || reloadCheck(sel));
    setBtn("endBtn", off);
    setBtn("evacBtn", off);
    const bar = $("itemBar");
    const its = sel?.items || [];
    const abil = abilitiesOf(sel).map(a => {
      const on = S.mode === "ability" && S.ability === a.perk;
      const why = off || (on ? null : abilityCheck(sel, a.perk));
      const left = a.uses ? ` ×${usesLeft(sel!, a.perk, a.uses(sel!))}` : "";
      return `<button class="act ${on ? "on" : ""}" type="button" data-ability="${a.perk}" ${why ? `disabled title="${esc(why)}"` : ""}>${on ? "Cancel" : a.label + left}</button>`;
    }).join("");
    bar.innerHTML = abil + its.map((it, i) => {
      if (it.id === "medkit" || it.id === "camera") {
        const why = off || useCheck(sel, i);
        return it.uses > 0 ? `<button class="act" type="button" data-use="${i}" ${why ? `disabled title="${esc(why)}"` : ""}>${it.id === "medkit" ? "Use medkit" : "Photograph"} <kbd>${i + 1}</kbd></button>` : "";
      }
      const throwable = THROWN.includes(it.id);
      if (!throwable) return `<span class="flag">${ITEM_NAMES[it.id]}${it.id === "eyedrops" ? ` ×${it.uses} · used automatically` : " · always on"}</span>`;
      if (it.uses < 1) return "";
      const why = off || (S.mode === "throw" && S.throwing === it ? null : throwCheck(sel, i));
      return `<button class="act ${S.mode === "throw" && S.throwing === it ? "on" : ""}" type="button" data-item="${i}" ${why ? `disabled title="${esc(why)}"` : ""}>${S.mode === "throw" && S.throwing === it ? "Cancel throw" : `${HEAVY.includes(it.id) ? "Fire" : "Throw"} ${HEAVY.includes(it.id) ? ITEM_NAMES[it.id] : ITEM_NAMES[it.id].toLowerCase()} ×${it.uses}`} <kbd>${i + 1}</kbd></button>`;
    }).join("");

    let h = "";
    if (hintFlash) h = `<b>${esc(hintFlash)}</b>`;
    else if (!can) h = S.over ? "" : "Enemy activity…";
    else if (sel) {
      const hv = S.hover && unitAt(S.hover.x, S.hover.y);
      if (S.mode === "doors") h = `<b>Blast doors.</b>\nClick a doorway to seal it (up to ${MAX_SEALED}) or to open a sealed one. Escape to cancel.`;
      else if (S.mode === "lead") h = `<b>SCP-049 is listening.</b>\nClick a green tile to lead it there (up to 3 tiles), or press Escape to leave it where it stands.`;
      else if (S.mode === "ability" && S.ability) h = `<b>${esc(full(sel))}: ${abilityName(S.ability)}.</b>\n${esc(abilityDesc(S.ability))} Click a highlighted target.`;
      else if (S.mode === "throw" && S.throwing) h = `<b>${esc(full(sel))}: choose where to throw the ${ITEM_NAMES[S.throwing.id].toLowerCase()}.</b>\nLit tiles are in range and in sight. It covers the target tile and every tile around it. Throwing ends their turn.`;
      else if (S.mode === "drag") h = `<b>${esc(sel.name)}: choose where to drag SCP-173.</b>\nOrange tiles keep it in someone else's sight the whole way. Dragging ends their turn.`;
      else if (hv && hv.side === "raider" && seen(hv.x, hv.y) && sel.side === "mtf" && sel.ap > 0 && canSee(sel, hv.x, hv.y)) {
        const s = shotInfo(sel, hv);
        const fw = fireCheck(sel);
        h = `<b>${sel.call} → Insurgent: ${s.chance}% to hit</b>${s.crit ? `, ${s.crit}% crit` : ""}${activeGun(sel) ? ` · ${activeGun(sel)!.name}, ${activeGun(sel)!.dmg[0]}–${activeGun(sel)!.dmg[1]} damage` : ""}${sel.gun?.attachment === "bayonet" && Math.max(Math.abs(sel.x - hv.x), Math.abs(sel.y - hv.y)) <= 1 ? " · bayonet: a sure 3" : ""}${fw ? `\n<b>${esc(fw)}</b>` : ""}\n` + s.mods.map(m => `${m[0]} ${m[1] >= 0 ? "+" : ""}${m[1]}`).join(" · ");
      } else if (!sealCheck(sel)) h = `<b>${sel.call} can seal the container now.</b> Press S.`;
      else if (sel.staring) h = `<b>${esc(full(sel))} is staring</b>, ${sel.ap} action${sel.ap === 1 ? "" : "s"}.\nThey can move anywhere that keeps sight of SCP-173. Press B to look away (free).`;
      else h = `<b>${esc(full(sel))}</b>, ${sel.ap} action${sel.ap === 1 ? "" : "s"}.\nClick a tile to move (blue costs 1, amber costs 2).${sel.side === "mtf" ? " Click a visible Insurgent to fire." : " D-Class are unarmed."}${S.has173 ? " Next to SCP-173, press G to drag it." : ""}${matchMedia("(pointer: coarse)").matches ? " Tap twice to confirm." : ""}`;
    } else h = "No one has actions left. End the turn.";
    $("hint").innerHTML = h;

    if (has173) $("notes").innerHTML = NOTES_173.map(n => {
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
    if (u && u.alive && isTeam(u) && !u.downed) select(u);
  });
  $("stareBtn").onclick = () => toggleStare(flash);
  $("callBtn").onclick = () => callBlink(flash);
  $("dragBtn").onclick = () => toggleDrag(flash);
  $("sealBtn").onclick = () => doSeal(flash);
  $("owBtn").onclick = doOverwatch;
  $("nextBtn").onclick = selectNext;
  $("reloadBtn").onclick = () => doReload(flash);
  $("endBtn").onclick = endTurn;
  $("itemBar").addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-item]");
    if (b) toggleThrow(Number(b.dataset.item), flash);
    const ub = (e.target as HTMLElement).closest<HTMLElement>("[data-use]");
    if (ub) useItem(Number(ub.dataset.use), flash);
    const a = (e.target as HTMLElement).closest<HTMLElement>("[data-ability]");
    if (a) startAbility(a.dataset.ability as AbilityId, flash);
  });
  let evacArmed = 0;
  $("evacBtn").onclick = () => {
    const b = $("evacBtn");
    if (!evacArmed) {
      b.textContent = "Abort? Anyone not out is left behind";
      evacArmed = window.setTimeout(() => { evacArmed = 0; b.textContent = "Abort mission"; }, 3000);
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
    else if (k === "escape") { if (S.mode) { S.mode = null; S.throwing = null; S.ability = null; update(); } }
    else if (k === "1" || k === "2" || k === "3") {
      const it = S.selected?.items?.[Number(k) - 1];
      if (it && (it.id === "medkit" || it.id === "camera")) useItem(Number(k) - 1, flash); else toggleThrow(Number(k) - 1, flash);
    }
    else if (k === "e") endTurn();
    else if (k === "o") doOverwatch();
    else if (k === "r") doReload(flash);
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
    // this screen is going away: stop the game from writing into it
    hooks.update = () => {}; hooks.log = () => {}; hooks.finished = () => {};
    document.removeEventListener("keydown", onKey);
    clearTimeout(hintTimer);
  }

  renderLog();
  startPlayerTurn(true);
  requestAnimationFrame(loop);
  window.scrollTo(0, 0);
}
