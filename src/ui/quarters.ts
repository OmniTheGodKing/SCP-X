// Epsilon-11's quarters: the Barracks (a 3D billet where the squad stands at their lockers) and the Armory (a
// workbench where one operative's kit is laid out and changed by handling it). Both draw only from the campaign's
// real state and every control here calls the same campaign functions the old Personnel tab did, through the
// data attributes the hub already binds (data-op, data-setweapon, data-fitatt, data-loadammo, data-kitarmor,
// data-kititem, data-eqslot). Layout and art live here; the hub keeps the event wiring and the text dossier.
import type { Campaign, Operative } from "../campaign/campaign";
import { RANKS, dateOf, fieldName, gunFor, lookOf, promotionDue, weaponOf, weaponOptions } from "../campaign/campaign";
import { injured, tiredness } from "../campaign/condition";
import { ARMOR_KINDS, ARMOR_TIERS, ITEMS, armorStats, uniformOf, type ItemId } from "../campaign/research";
import { tfOf } from "../campaign/taskforces";
import { CLASSES } from "../data/classes";
import { AMMO, ATTACHMENTS, SIDEARM, TYPES, model, type AmmoId, type AttachmentId } from "../data/weapons";
import { HEAVY } from "../game/types";
import { gearArt } from "./icons";
import { portraitSvg } from "./portrait";
import { asset, eraOf, type Era } from "./stage/assets";
import { figureSvg, type FigureSpec } from "./stage/figure";
import { billboard, camNow, camCss, onBackWall, onFloor, roomShell, type Cam, type RoomDims } from "./stage/scene";
import { HARDPOINT_NAMES, HARDPOINT_OF, hardpoints, weaponBody, type Hardpoint } from "./stage/weapon";
import { esc } from "./util";
import "./stage/stage.css";

export interface Kit { armor: ItemId | ""; items: (ItemId | "")[]; }
export interface QuartersCtx {
  c: Campaign;
  opSel: string | null;
  /** Which tray is open in the armory: "weapon", "armor", "ammo", "item0".., or "hp:<hardpoint>". */
  eqSlot: string | null;
  gearOf: (id: string) => Kit;
  fieldHp: (o: Operative) => { hp: number; max: number; why: string };
  /** The operative's file (text the player needs to read: perks, traits, record, appearance, admin). */
  dossier: (o: Operative) => string;
  /** The open wall archive in the barracks, and its markup. */
  archive: string | null;
  archiveHtml: (k: string) => string;
  /** True on the first draw after arriving in the room, to play its entrance. */
  entering: boolean;
}

const yearOf = (c: Campaign) => dateOf(c.day).getUTCFullYear();
export const BARRACKS_ROOM: RoomDims = { w: 1700, d: 900, h: 520 };

export function figureSpecOf(c: Campaign, o: Operative, kit: Kit): FigureSpec {
  const t = weaponOf(o);
  return {
    id: o.id, look: lookOf(o), unit: o.unit, sex: o.sex, uniform: uniformOf(c).id, armor: kit.armor, armorTier: c.armorTier,
    items: kit.items.filter(Boolean) as string[], weapon: { model: c.models[t], type: t, attachment: o.attachment, tier: c.weaponTier ?? 1 },
    rank: o.rank, call: o.call, wounded: o.hp < o.maxHp || injured(c, o),
  };
}

type Tone = "ok" | "warn" | "bad" | "away" | "promo";
export function statusOf(c: Campaign, o: Operative): { text: string; tone: Tone } {
  if (o.busy) return { text: o.busy.kind === "therapy" ? "In therapy" : o.busy.kind === "travel" ? "In transit" : o.busy.kind === "contract" ? "On contract" : "Retraining", tone: "away" };
  if (injured(c, o)) return { text: o.injury!.name, tone: "bad" };
  if (tiredness(o) === "exhausted") return { text: "Exhausted", tone: "bad" };
  if (promotionDue(o)) return { text: "Promotion due", tone: "promo" };
  if (o.hp < o.maxHp) return { text: "Wounded", tone: "warn" };
  if (tiredness(o) === "tired") return { text: "Tired", tone: "warn" };
  return { text: "Ready", tone: "ok" };
}

// ---------------------------------------------------------------- Barracks

interface Spot { o: Operative; x: number; z: number; }
function layout(c: Campaign): { spots: Spot[]; lockers: { o: Operative; x: number }[]; split: number | null } {
  const alive = c.roster.filter(o => o.alive);
  const e11 = alive.filter(o => tfOf(o) === "e11"), eta = alive.filter(o => tfOf(o) !== "e11");
  const all = [...e11, ...eta], n = all.length, R = BARRACKS_ROOM;
  const pitch = Math.min(170, (R.w - 260) / Math.max(1, n));
  const x0 = -((n - 1) * pitch) / 2 - (eta.length ? 40 : 0);
  const lockers = all.map((o, i) => ({ o, x: x0 + i * pitch + (i >= e11.length ? 80 : 0) }));
  const spots = lockers.filter(l => !l.o.busy).map((l, i) => ({ o: l.o, x: l.x, z: -R.d / 2 + 230 + (i % 2) * 30 }));
  return { spots, lockers, split: eta.length ? x0 + e11.length * pitch + 40 - pitch / 2 : null };
}

const ERA_NAMES: Record<Era, string> = { "1950s": "1951 pattern", "1960s": "1960s refit", "1970s": "1970s refit", "1980s": "1980s refit" };

export function barracksTarget(c: Campaign, opSel: string | null): Cam {
  const narrow = typeof window !== "undefined" && window.innerWidth < 760;
  const spot = layout(c).spots.find(s => s.o.id === opSel);
  if (spot) return { yaw: spot.x > 0 ? -6 : 6, pitch: -4, dist: narrow ? 60 : -200, fx: spot.x + (narrow ? 0 : 150), fy: narrow ? -120 : -170, fz: spot.z };
  return { yaw: 0, pitch: -6, dist: narrow ? 380 : -60, fx: 0, fy: narrow ? -170 : -215, fz: narrow ? -120 : 0 };
}

export function barracksHtml(q: QuartersCtx) {
  const { c } = q, R = BARRACKS_ROOM, era = eraOf(yearOf(c)), L = layout(c);
  const sel = c.roster.find(o => o.id === q.opSel && o.alive);
  const target = barracksTarget(c, sel && !sel.busy ? sel.id : null);
  const cam = camNow("barracks", target);
  const fallen = c.roster.filter(o => !o.alive).length, retired = c.retired?.length ?? 0;
  const ready = c.roster.filter(o => o.alive && statusOf(c, o).tone === "ok").length, away = c.roster.filter(o => o.alive && o.busy).length;
  const hurt = c.roster.filter(o => o.alive && !o.busy && ["bad", "warn"].includes(statusOf(c, o).tone)).length;
  const wallArt = asset(`room/barracks/${era}`, "room/barracks");

  // lockers along the back wall: one per operative, with their callsign card and a duty lamp
  const lockers = L.lockers.map(({ o, x }) => {
    const st = statusOf(c, o);
    return onBackWall(R, x, 0, 128, 300, `<button type="button" class="locker ${o.busy ? "ajar" : ""} ${q.opSel === o.id ? "on" : ""}" data-op="${o.id}" aria-label="${esc(o.call)} ${esc(fieldName(o))}: locker">
      <span class="vents"></span><span class="card">${esc(o.call)}<br><small>${esc(o.name.split(" ").slice(-1)[0])}</small></span>
      <span class="lamp t-${st.tone}"></span>${o.busy ? `<span class="slip">${esc(st.text)}<br>${o.busy.daysLeft} d</span>` : ""}</button>`);
  }).join("");
  // what's on the walls is navigation: the armory door, the memorial, the staff board, the recruiting notice
  const fixtures = [
    onBackWall(R, -R.w / 2 + 90, 0, 130, 330, `<button type="button" class="door" data-gotoarmory aria-label="Go to the Armory"><span class="doorsign">ARMORY</span><span class="window"></span><span class="handle"></span></button>`),
    onBackWall(R, R.w / 2 - 90, 0, 130, 330, `<button type="button" class="door exit" data-gotocommand aria-label="Go to Command to recruit"><span class="doorsign">COMMAND · RECRUITING</span><span class="window"></span><span class="handle"></span></button>`),
    onBackWall(R, -R.w / 2 + 230, 330, 110, 70, `<button type="button" class="plaque ${q.archive === "memorial" ? "on" : ""}" data-archive="memorial" aria-label="Memorial: ${fallen} fallen"><b>IN MEMORIAM</b><span>${fallen ? `${fallen} name${fallen === 1 ? "" : "s"}` : "no names yet"}</span></button>`),
    onBackWall(R, R.w / 2 - 240, 300, 120, 120, `<button type="button" class="board ${q.archive === "staff" ? "on" : ""}" data-archive="staff" aria-label="Site staff board"><b>SITE STAFF</b><span>${c.researchers} research · ${c.engineers} engineering</span><span class="pins"></span></button>`),
    retired ? onBackWall(R, -R.w / 2 + 230, 220, 110, 80, `<button type="button" class="frame ${q.archive === "retired" ? "on" : ""}" data-archive="retired" aria-label="Retired operatives">${portraitSvg(c.retired![c.retired!.length - 1].look ?? lookOf({ id: c.retired![0].name }), c.retired![c.retired!.length - 1].unit, 46)}<span>Retired · ${retired}</span></button>`) : "",
  ].join("");
  const back = `<div class="paint"></div>${wallArt ? `<img class="wallart" src="${wallArt}" alt="">` : ""}
    <div class="stencil">EPSILON-11 · BILLET B${L.split !== null ? "" : ""}</div>
    ${[-0.32, 0, 0.32].map(f => `<div class="sconce" style="left:${50 + f * 100}%"></div>`).join("")}`;
  const floor = `<div class="tiles"></div>
    ${[-0.3, 0, 0.3].map(f => `<div class="pool" style="left:${50 + f * 100}%"></div>`).join("")}
    <div class="tape" style="left:${(L.spots[0]?.x ?? 0) + R.w / 2 - 90}px;width:${Math.max(200, (L.split ?? (L.spots[L.spots.length - 1]?.x ?? 0) + 90) - (L.spots[0]?.x ?? 0) + 90)}px">EPSILON-11</div>
    ${L.split !== null ? `<div class="tape eta" style="left:${L.split + R.w / 2 + 20}px;width:${R.w / 2 - L.split - 140}px">ETA-10</div>` : ""}`;
  const shadows = L.spots.map(s => onFloor(s.x, s.z + 6, 120, 46, "shadow")).join("");
  const figs = L.spots.map(s => {
    const st = statusOf(c, s.o), fh = q.fieldHp(s.o), on = q.opSel === s.o.id;
    return billboard(s.x, s.z, 170, 330, `<button type="button" class="soldier ${on ? "on" : ""} ${sel && !on ? "dim" : ""}" data-op="${s.o.id}" aria-pressed="${on}" aria-label="${esc(fieldName(s.o))}, ${RANKS[s.o.rank]}, ${st.text}">
        ${st.tone === "promo" ? `<span class="promo" aria-hidden="true">▲</span>` : ""}
        ${figureSvg(figureSpecOf(c, s.o, q.gearOf(s.o.id)), { label: fieldName(s.o) })}
        <span class="plate t-${st.tone}"><b>${esc(s.o.call)}</b> ${esc(fieldName(s.o))}<i>${RANKS[s.o.rank]}${s.o.cls ? ` · ${CLASSES[s.o.cls].name}` : ""}</i>
          <span class="mini"><span style="--v:${fh.hp / fh.max}" class="hp"></span><span style="--v:${Math.min(1, s.o.san / 120)}" class="san"></span></span><em>${esc(st.text)}</em></span>
      </button>`, `data-ent="${s.o.id}"`, cam.yaw);
  }).join("");

  return `<section class="stage barracks era-${era} ${sel ? "focused" : ""} ${q.entering ? "enter" : ""}" data-stage="barracks" aria-label="Barracks">
    <div class="viewport">
      <div class="cam" style="transform:${camCss(cam)}">
        ${roomShell(R, { floor, back, left: `<div class="paint"></div>`, right: `<div class="paint"></div>`, ceiling: `<div class="slab"></div><div class="pipe" style="top:160px"></div><div class="pipe" style="top:220px;height:16px"></div>` })}
        ${lockers}${fixtures}${shadows}${figs}
      </div>
      <div class="grade"></div>
    </div>
    <div class="stagehud top"><div class="roomtitle"><span class="eyebrow">Site-19 · Level 2 · ${ERA_NAMES[era]}</span><b>Barracks</b></div>
      <div class="tally"><span class="t-ok">${ready} ready</span>${hurt ? `<span class="t-warn">${hurt} unfit</span>` : ""}${away ? `<span class="t-away">${away} away</span>` : ""}<span>${fallen} fallen</span></div></div>
    <div class="stagehud cams" role="group" aria-label="Camera"><button type="button" data-cam="left" aria-label="Turn left">⟲</button><button type="button" data-cam="in" aria-label="Zoom in">+</button><button type="button" data-cam="out" aria-label="Zoom out">−</button><button type="button" data-cam="right" aria-label="Turn right">⟳</button><button type="button" data-cam="reset" aria-label="Reset view">◎</button></div>
    ${!sel ? `<p class="stagehud hint">Click an operative to inspect them · drag to look around · scroll to zoom</p>` : ""}
    ${sel ? `<aside class="pfile" aria-label="Personnel file">${q.dossier(sel)}</aside>` : ""}
    ${q.archive ? `<aside class="pfile archive" aria-label="Archive">${q.archiveHtml(q.archive)}</aside>` : ""}
  </section>`;
}

// ---------------------------------------------------------------- Armory

/** Where on the big figure each kit area can be clicked, in % of the figure box. */
const FIGURE_SPOTS: { key: string; label: string; box: [number, number, number, number] }[] = [
  { key: "armor", label: "Armor", box: [30, 17, 40, 31] },
  { key: "item0", label: "Belt kit", box: [33, 46, 34, 9] },
];

export function armoryHtml(q: QuartersCtx) {
  const { c } = q, era = eraOf(yearOf(c));
  const team = c.roster.filter(o => o.alive);
  const o = team.find(x => x.id === q.opSel) ?? team[0];
  if (!o) return `<section class="stage armory"><p class="stagehud hint">Nobody on the roster.</p></section>`;
  const g = q.gearOf(o.id), t = weaponOf(o), m = model(c.models[t]), gun = gunFor(c, o), uni = uniformOf(c);
  const slots = o.perks.includes("field_kit") ? 3 : 2, tray = q.eqSlot ?? "";
  const hp = hardpoints(m.id, t), fitted = o.attachment ? HARDPOINT_OF[o.attachment] : null;
  const pct = ([x, y]: [number, number]) => `left:${(x / 470) * 100}%;top:${(y / 120) * 100}%`;
  const fh = q.fieldHp(o), wallArt = asset(`room/armory/${era}`, "room/armory");
  const store = (n: number | undefined) => `<span class="count">${n ?? 0}</span>`;

  // the parts tray for whichever hardpoint is open: the real attachments in stores that mount there
  const trayHp = tray.startsWith("hp:") ? tray.slice(3) as Hardpoint : null;
  const partsFor = (h: Hardpoint) => (Object.keys(ATTACHMENTS) as AttachmentId[]).filter(a => HARDPOINT_OF[a] === h && (o.attachment === a || (c.attachments[a] ?? 0) > 0));
  const partView = (a: AttachmentId) => { const [x, y] = hp[HARDPOINT_OF[a]]; return `<svg viewBox="${x - 70} ${y - 40} 140 80" class="part" aria-hidden="true">${weaponBody(m.id, t, { attachment: a, tier: c.weaponTier })}</svg>`; };
  const side = trayHp ? (hp[trayHp][0] > 300 ? "r" : hp[trayHp][0] < 140 ? "l" : "") : "";
  const hpTray = trayHp ? `<div class="tray parts ${side}" role="dialog" aria-label="${HARDPOINT_NAMES[trayHp]}" style="${pct(hp[trayHp])}">
      <div class="trayhead">${HARDPOINT_NAMES[trayHp]}<button type="button" class="x" data-eqslot="${tray}" aria-label="Close">×</button></div>
      <div class="trayrow">
        ${fitted === trayHp ? `<button type="button" class="part-opt" data-fitatt=""><span class="none">Remove</span><b>Strip ${esc(ATTACHMENTS[o.attachment!].name.toLowerCase())}</b><small>Back to stores</small></button>` : ""}
        ${partsFor(trayHp).map(a => `<button type="button" class="part-opt ${o.attachment === a ? "on" : ""}" data-fitatt="${a}" ${o.attachment === a ? "disabled" : ""}>${partView(a)}<b>${esc(ATTACHMENTS[a].name)}</b><small>${esc(ATTACHMENTS[a].desc)}</small>${o.attachment === a ? `<small class="fit">Fitted</small>` : store(c.attachments[a])}</button>`).join("")
          || `<p class="empty">No parts for the ${HARDPOINT_NAMES[trayHp].toLowerCase()} in stores. Research them, then have the workshop make them.</p>`}
      </div>
      ${o.attachment && fitted !== trayHp ? `<p class="note">One attachment per weapon: fitting one here strips the ${esc(ATTACHMENTS[o.attachment].name.toLowerCase())}.</p>` : ""}
    </div>` : "";

  // weapon rack: the two weapons their class can carry
  const rack = weaponOptions(o).map(w => {
    const wm = model(c.models[w]), on = w === t;
    return `<button type="button" class="rackgun ${on ? "on" : ""}" data-setweapon="${w}" ${on ? "aria-current=\"true\"" : ""} aria-label="${esc(TYPES[w].name)}: ${esc(wm.name)}${on ? " (on the bench)" : ""}">
      <svg viewBox="0 0 470 120" aria-hidden="true" class="${on ? "ghost" : ""}">${weaponBody(wm.id, w, { tier: c.weaponTier })}</svg>
      <span class="peg l"></span><span class="peg r"></span><span class="tag">${esc(wm.name)}<small>${esc(TYPES[w].name)}${on ? " · on the bench" : ""}</small></span></button>`;
  }).join("") + (weaponOptions(o).length < 2 ? `<p class="racknote">A second weapon rack opens when they choose a class at their first promotion.</p>` : "");

  // armor hanging on the locker wall, with how many are in stores
  const armorRail = [`<button type="button" class="hanger ${!g.armor ? "on" : ""}" data-kitarmor="" aria-label="No armor">${gearArt("uniform")}<span>Uniform only</span></button>`,
    ...ARMOR_KINDS.filter(k => (c.inventory[k] ?? 0) > 0 || g.armor === k).map(k => { const st = armorStats(k, c.armorTier); return `<button type="button" class="hanger ${g.armor === k ? "on" : ""}" data-kitarmor="${k}" title="${esc(ITEMS[k].desc)}">${gearArt(k)}<span>${esc(k === "armor" ? ARMOR_TIERS[Math.max(1, c.armorTier)].name : ITEMS[k].name)}</span><small>+${st.hp} HP · ${st.points} armor${st.move ? ` · ${st.move > 0 ? "+" : ""}${st.move} move` : ""}</small>${g.armor === k ? `<small class="fit">Worn</small>` : store(c.inventory[k])}</button>`; })].join("");

  // the shelf of utility kit; with a belt slot picked, clicking an item puts it there
  const itemSlot = tray.startsWith("item") ? Number(tray.slice(4)) : -1;
  const shelfItems = (Object.keys(ITEMS) as ItemId[]).filter(k => !ITEMS[k].armor && ((c.inventory[k] ?? 0) > 0 || g.items.includes(k)));
  const shelf = shelfItems.map(k => { const heavyNo = HEAVY.includes(k) && g.armor !== "armor_heavy"; return `<button type="button" class="shelfitem ${g.items.includes(k) ? "on" : ""}" data-shelfitem="${k}" ${heavyNo ? `disabled title="Heavy weapons need heavy plate in the armor slot."` : `title="${esc(ITEMS[k].desc)}"`}>${gearArt(k)}<span>${esc(ITEMS[k].name)}</span>${store(c.inventory[k])}</button>`; }).join("") || `<p class="empty">The shelves are bare. The workshop builds grenades, medkits and the rest once they're researched.</p>`;

  // ammunition crates under the bench
  const crates = [`<button type="button" class="crate ${!o.ammoType ? "on" : ""}" data-loadammo=""><span class="stencil">.30 BALL</span><small>Standard</small></button>`,
    ...(Object.keys(AMMO) as AmmoId[]).filter(a => o.ammoType === a || (c.ammo[a] ?? 0) > 0).map(a => `<button type="button" class="crate a-${a} ${o.ammoType === a ? "on" : ""}" data-loadammo="${a}" title="${esc(AMMO[a].desc)}"><span class="stencil">${esc(AMMO[a].name.split(" ")[0].toUpperCase())}</span><small>${o.ammoType === a ? "Loaded" : `${c.ammo[a]} in stores`}</small></button>`)].join("");

  const stat = (k: string, v: string, f: number) => `<div class="gauge"><span>${k}</span><b>${v}</b><i style="--v:${Math.max(0.04, Math.min(1, f))}"></i></div>`;

  return `<section class="stage armory era-${era} ${q.entering ? "enter" : ""}" data-stage="armory" aria-label="Armory">
    <div class="armroom">
      <div class="armwall">${wallArt ? `<img class="wallart" src="${wallArt}" alt="">` : ""}<div class="cage"></div></div>
      <div class="armfloor"></div>
      <div class="rack" aria-label="Weapon rack">${rack}</div>
      <div class="dummy">
        <div class="spot"></div>
        ${figureSvg(figureSpecOf(c, o, g), { cls: "big", label: `${fieldName(o)} in their kit` })}
        ${FIGURE_SPOTS.map(s => `<button type="button" class="bodyspot ${tray === s.key || (s.key === "item0" && itemSlot >= 0) ? "on" : ""}" data-eqslot="${s.key}" style="left:${s.box[0]}%;top:${s.box[1]}%;width:${s.box[2]}%;height:${s.box[3]}%" aria-label="${s.label}"><span>${s.label}</span></button>`).join("")}
        <div class="nametape"><b>${esc(o.call)}</b> ${esc(fieldName(o))}<small>${RANKS[o.rank]}${o.cls ? ` · ${CLASSES[o.cls].name}` : ""} · field HP ${fh.hp}/${fh.max}</small></div>
      </div>
      <div class="bench">
        <div class="benchtop"></div>
        <div class="gunmat">
          <svg class="benchgun" viewBox="0 0 470 120" role="img" aria-label="${esc(gun.name)}">${weaponBody(m.id, t, { attachment: o.attachment, tier: c.weaponTier })}</svg>
          ${(Object.keys(hp) as Hardpoint[]).map(h => { const has = fitted === h, n = partsFor(h).filter(a => a !== o.attachment).length; return `<button type="button" class="hpt ${has ? "has" : ""} ${trayHp === h ? "on" : ""} ${n || has ? "" : "bare"}" data-eqslot="hp:${h}" style="${pct(hp[h])}" aria-label="${HARDPOINT_NAMES[h]}${has ? `: ${esc(ATTACHMENTS[o.attachment!].name)}` : n ? `: ${n} part${n === 1 ? "" : "s"} available` : ""}"><span>${HARDPOINT_NAMES[h]}${has ? ` · ${esc(ATTACHMENTS[o.attachment!].name)}` : n ? ` · ${n}` : ""}</span></button>`; }).join("")}
          ${hpTray}
        </div>
        <div class="tagplate">
          <div class="gname">${esc(gun.name)}<small>${esc(TYPES[t].name)}${c.weaponTier && c.weaponTier >= 2 ? " · refitted" : ""}</small></div>
          <div class="gauges">${stat("Damage", gun.dmg.join("–"), gun.dmg[1] / 9)}${stat("Rounds", String(gun.mag), gun.mag / 8)}${stat("Aim", `${gun.aim >= 0 ? "+" : ""}${gun.aim}`, 0.4 + gun.aim / 25)}${stat("Move", `${TYPES[t].move >= 0 ? "+" : ""}${TYPES[t].move}`, 0.5 + TYPES[t].move / 3)}${stat("Crit", `+${TYPES[t].crit}%`, TYPES[t].crit / 30)}${gun.pierce ? stat("Pierce", String(gun.pierce), gun.pierce / 3) : ""}</div>
          <p>${esc(TYPES[t].desc)}${o.attachment ? ` <b>${esc(ATTACHMENTS[o.attachment].name)}:</b> ${esc(ATTACHMENTS[o.attachment].desc)}` : ""}${o.ammoType ? ` <b>${esc(AMMO[o.ammoType].name)}:</b> ${esc(AMMO[o.ammoType].desc)}` : ""}</p>
          <p class="fine">${esc(SIDEARM.name)} carried as a sidearm · ${esc(uni.name)}${uni.hp ? ` (+${uni.hp} HP${uni.points ? `, +${uni.points} armor` : ""})` : ""} under any armor</p>
        </div>
        <div class="benchside"><div class="kitroll" aria-label="Belt kit">
          ${Array.from({ length: slots }, (_, i) => { const it = g.items[i] as ItemId | ""; return `<button type="button" class="pouch ${itemSlot === i ? "on" : ""}" data-eqslot="item${i}" aria-label="Belt slot ${i + 1}: ${it ? esc(ITEMS[it].name) : "empty"}">${gearArt(it || "empty")}<span>${it ? esc(ITEMS[it].name) : `Slot ${i + 1}`}</span></button>`; }).join("")}
          ${itemSlot >= 0 && g.items[itemSlot] ? `<button type="button" class="pouch clear" data-kititem="">Empty slot ${itemSlot + 1}</button>` : ""}
        </div>
        <div class="crates" aria-label="Ammunition">${crates}</div></div>
      </div>
      <div class="sidecol"><div class="rail ${tray === "armor" ? "picking" : ""}" aria-label="Armor">${tray === "armor" ? `<span class="shelfhint">Choose their armor</span>` : ""}${armorRail}</div>
      <div class="shelf ${itemSlot >= 0 ? "picking" : ""}" aria-label="Kit shelf">${itemSlot >= 0 ? `<span class="shelfhint">Choose kit for slot ${itemSlot + 1}</span>` : `<span class="shelfhint dim">Kit shelf</span>`}${shelf}</div></div>
    </div>
    <div class="stagehud top"><div class="roomtitle"><span class="eyebrow">Site-19 · Level 2 · Armory</span><b>${esc(o.call)} · ${esc(fieldName(o))}</b></div>
      <nav class="squadbar" aria-label="Choose an operative">${team.map(x => { const st = statusOf(c, x); return `<button type="button" class="sq ${x.id === o.id ? "on" : ""}" data-armop="${x.id}" aria-pressed="${x.id === o.id}">${portraitSvg(lookOf(x), x.unit, 40)}<span>${esc(x.call)}</span><i class="lamp t-${st.tone}"></i></button>`; }).join("")}</nav>
      <button type="button" class="hudbtn" data-gotobarracks>Back to the barracks</button></div>

  </section>`;
}
