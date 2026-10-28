// Phase 4B: SCP-096, SCP-012, SCP-939, SCP-035 and SCP-682 on the tactical map, and the shared "eyes down" rule.
// Each one is the mission's anomaly (S.scp); S.statue is the anomaly itself, except for SCP-939, whose instances are
// hostile units of their own. See docs/ROADMAP.md, "4B as specified", for the rules this follows.
import { DIRS, L, TS, area, cheb, doorShut, inContainer, passable, tileAt, FULL, HALF, PART, WINDOW, type Pt } from "../core/grid";
import { blastStructure, linkFrom } from "../core/grid";
import { damage, kill } from "./combat";
import { emitNoise, facingTo } from "./noise";
import { S, banner, canSee, computeVis, full, fx, highlight, hooks, humans, isPanicked, isTeam, lit, log, loseSanity, rand, seen, sleep, team } from "./state";
import { NEW_SCPS, type Unit } from "./types";

export const isNewScp = (id?: string) => !!id && (NEW_SCPS as readonly string[]).includes(id);
/** Research finished on the new anomalies, carried into the mission. */
export const r4b = (id: string) => !!S.setup.mods.r4b?.includes(id);
const st = () => S.statue;
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const carries = (u: Unit, id: string) => !!u.items?.some(i => i.id === id && i.uses > 0);
const useUp = (u: Unit, id: string) => { const it = u.items?.find(i => i.id === id && i.uses > 0); if (it) it.uses--; };
const suited = (u: Unit) => u.armorKind === "hazmat" || u.armorKind === "leadsuit" || u.armorKind === "contsuit";
const who = (u: Unit) => isTeam(u) || u.side === "mtf" ? full(u) : u.name;
/** Something said once per mission. */
function once(key: string, text: string, kind = "") { S.told ??= []; if (S.told.includes(key)) return; S.told.push(key); log(text, kind); }

/** Breadth-first path for something that goes where people can't (shut doors, cover, partitions): the steps from
 *  (x, y) to the nearest tile that `goal` accepts, through tiles `walkable` accepts. */
function pathTo(x: number, y: number, goal: (x: number, y: number) => boolean, walkable: (x: number, y: number) => boolean): Pt[] | null {
  const prev = new Int32Array(L.W * L.H).fill(-1), start = y * L.W + x;
  prev[start] = start;
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    const i = q[h], cx = i % L.W, cy = (i / L.W) | 0;
    if (i !== start && goal(cx, cy)) {
      const out: Pt[] = [];
      for (let k = i; k !== start; k = prev[k]) out.push([k % L.W, (k / L.W) | 0]);
      return out.reverse();
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy, ni = ny * L.W + nx;
      if (nx < 0 || ny < 0 || nx >= L.W || ny >= L.H || prev[ni] >= 0 || !walkable(nx, ny)) continue;
      if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
      prev[ni] = i; q.push(ni);
    }
    const li = linkFrom(i);
    if (li !== undefined && prev[li] < 0 && walkable(li % L.W, (li / L.W) | 0)) { prev[li] = i; q.push(li); }
  }
  return null;
}
const someoneAt = (x: number, y: number, except?: Unit) => S.units.some(o => o !== except && o.alive && !o.saved && !o.carriedBy && o.x === x && o.y === y && !(o === S.statue && S.scp === "939"));

// ---------- eyes down (SCP-096 and SCP-012 missions) ----------
export const eyesMission = () => S.scp === "096" || S.scp === "012";
export function eyesCheck(u: Unit | null) {
  if (!u || !isTeam(u) || u.downed) return "Select someone.";
  if (!eyesMission()) return "Only on SCP-096 and SCP-012 missions.";
  return null;
}
/** Free: look at the floor (sees only adjacent tiles, can't fire, safe from SCP-096's face and SCP-012), or look up. */
export function toggleEyes(u: Unit) {
  if (eyesCheck(u)) return;
  u.eyesDown = !u.eyesDown;
  if (u.eyesDown) { u.overwatch = false; u.staring = false; }
  log(u.eyesDown ? `${full(u)} keeps their eyes on the floor.` : `${full(u)} looks up.`, "key");
  computeVis();
  check096();
  hooks.update();
}
/** Looking down limits a move to the short one, until Blindfold drill. */
export const eyesMoveCap = (u: Unit) => !!u.eyesDown && !r4b("blindfold_drill");

// ---------- SCP-096 ----------
/** Whether (x, y) is inside the 120-degree wedge in front of SCP-096's face. */
export function inFace(x: number, y: number) {
  const d = st();
  if (S.scp !== "096" || !d.alive || S.hooded || S.sealed) return false;
  const f = (d.facing ?? 2) * Math.PI / 4, vx = x - d.x, vy = y - d.y, len = Math.hypot(vx, vy);
  return len > 0 && (vx * Math.cos(f) + vy * Math.sin(f)) / len >= 0.5;
}
function faceSeers() {
  const d = st();
  return S.units.filter(u => u.alive && !u.saved && !u.carriedBy && !u.downed && u.side !== "anomaly" && !u.voice && !u.host && !u.record && !u.eyesDown
    && !(isTeam(u) && isPanicked(u)) && !((u.blindUntil ?? -1) >= S.turn) && inFace(u.x, u.y) && canSee(u, d.x, d.y));
}
/** After every action and every enemy phase: anyone who has just seen its face is marked. */
export function check096() {
  if (S.scp !== "096" || S.sealed || S.hooded || S.over || !st().alive) return;
  const fresh = faceSeers().filter(u => !S.rage?.targets.includes(u.id));
  if (!fresh.length) return;
  const first = !S.rage;
  S.rage ??= { targets: [], scream: S.phase === "player" ? S.turn : S.turn + 1 };
  S.rage.targets.push(...fresh.map(u => u.id));
  for (const u of fresh) log(`${who(u)} saw SCP-096's face.`, "bad");
  if (first) {
    log("SCP-096 takes its hands from its face and starts to scream. Whoever saw it has a turn before it comes for them.", "bad");
    banner("SCP-096 HAS BEEN SEEN", "#d75b47"); highlight(5, "#d75b47");
    st().facing = facingTo(fresh[0].x - st().x, fresh[0].y - st().y);
  }
}
/** Where SCP-096 can go on its way to a target. */
const rips = (x: number, y: number) => {
  if (x <= 0 || y <= 0 || x >= L.W - 1 || y >= L.H - 1) return false;
  const t = tileAt(x, y);
  return passable(x, y) || doorShut(x, y) || t === WINDOW || t === PART || t === HALF || t === FULL || (t === 0 && !L.def.reinforced);
};
const marked = () => (S.rage?.targets ?? []).map(id => S.units.find(u => u.id === id)).filter((u): u is Unit => !!u);
export const isTarget = (u: Unit) => !!S.rage?.targets.includes(u.id);
async function phase096() {
  const d = st();
  if (S.hooded || S.sealed || !d.alive) return;
  if (!S.rage) {
    // it shifts where it sits now and then, which moves its face
    if (Math.random() < 0.2) { d.facing = rand(0, 7); if (seen(d.x, d.y)) log("SCP-096 shifts where it sits, still weeping. Its face is turned another way.", "key"); }
    return;
  }
  const all = marked();
  if (all.some(u => u.alive && u.saved)) { S.escaped = true; log("Someone who saw its face has left the area. SCP-096 goes after them, out of reach.", "bad"); return; }
  const left = all.filter(u => u.alive && !u.saved);
  if (!left.length) { S.rage = undefined; log("Its last target is dead. SCP-096 sits down where it is and goes back to weeping.", "key"); return; }
  if (S.turn <= S.rage.scream) { log("SCP-096 screams. It hasn't moved yet.", "bad"); return; }
  once("096-guns", "Gunfire does nothing to SCP-096. Get its targets away, or let it finish.", "key");
  let steps = 14;
  while (steps > 0) {
    const targets = marked().filter(u => u.alive && !u.saved);
    if (!targets.length) break;
    const beside = targets.find(t => cheb(t.x, t.y, d.x, d.y) <= 1);
    if (beside) {
      log(`SCP-096 reaches ${who(beside)}. It is over in a moment.`, "bad");
      fx({ type: "cue", cue: "crack", x: beside.x * TS + TS / 2, y: beside.y * TS + TS / 2, dur: 500 });
      kill(beside); S.rage.targets = S.rage.targets.filter(id => id !== beside.id);
      continue;
    }
    const path = pathTo(d.x, d.y, (x, y) => targets.some(t => cheb(t.x, t.y, x, y) <= 1) && !someoneAt(x, y, d), rips);
    if (!path) break;
    for (const [x, y] of path) {
      if (steps <= 0) break;
      if (someoneAt(x, y, d)) break;
      // it tears through doors, glass, partitions, furniture, and any wall that isn't Site-19's reinforced concrete
      const door = L.door.get(y * L.W + x);
      if (door && (door.state === "closed" || door.state === "locked")) { door.state = "breached"; L.version++; emitNoise(x, y, "door"); }
      else if (!passable(x, y)) { L.grid[y][x] = 1; L.glass.delete(y * L.W + x); L.version++; emitNoise(x, y, "explosion"); }
      d.facing = facingTo(x - d.x, y - d.y); d.x = x; d.y = y; steps--;
      if (targets.some(t => cheb(t.x, t.y, x, y) <= 1)) break;
    }
    if (!targets.some(t => cheb(t.x, t.y, d.x, d.y) <= 1)) break;
  }
  emitNoise(d.x, d.y, "scp", d);
  computeVis(); hooks.update();
  await sleep(450);
}
export const hoodTargets = (u: Unit) => {
  const d = st();
  return S.scp === "096" && d.alive && !S.hooded && !S.rage && !S.sealed && u.side === "mtf" && carries(u, "hood") && cheb(u.x, u.y, d.x, d.y) <= 1 && (u.eyesDown || !inFace(u.x, u.y)) ? [d] : [];
};
export function putHood(u: Unit) {
  useUp(u, "hood"); S.hooded = true;
  log(`${full(u)} pulls the hood down over SCP-096's head. It goes still. Lead it into the container.`, "good");
  banner("SCP-096 HOODED", "#86c193");
}
export const leadTargets096 = (u: Unit) => {
  const d = st();
  return S.scp === "096" && S.hooded && !S.sealed && u.side === "mtf" && cheb(u.x, u.y, d.x, d.y) <= 1 ? [d] : [];
};

// ---------- SCP-012 ----------
const reach012 = () => r4b("composition_study") ? 4 : 7;
const besideScore = (x: number, y: number) => cheb(x, y, st().x, st().y) === 1 && passable(x, y);
/** At the end of each enemy phase: anyone with eyes on the score within range may be compelled. */
function compel012() {
  const d = st();
  if (S.sealed || !d.alive) return;
  for (const u of humans()) {
    if (u.compelled !== undefined || u.eyesDown || u.downed || u.record || u.host || !u.alive || u.saved || u.restrained) continue;
    if (cheb(u.x, u.y, d.x, d.y) > reach012() || !canSee(u, d.x, d.y)) continue;
    const p = 0.3 + Math.max(0, 50 - u.san) * 0.005;
    if (Math.random() >= p) continue;
    u.compelled = S.turn; u.overwatch = false; u.staring = false;
    log(`${who(u)} can't look away from the score. They start walking toward it.`, "bad");
    if (isTeam(u)) highlight(2, "#d8bf86");
  }
}
async function phase012() {
  if (S.sealed) return;
  let any = false;
  for (const u of S.units.filter(v => v.compelled !== undefined && v.alive && !v.saved && !v.downed)) {
    if (r4b("counter_score") && S.turn - u.compelled! >= 2) { u.compelled = undefined; log(`${who(u)} catches the counter-melody and comes back to themselves.`, "good"); continue; }
    any = true;
    if (cheb(u.x, u.y, st().x, st().y) > 1) {
      const path = pathTo(u.x, u.y, (x, y) => besideScore(x, y) && !someoneAt(x, y, u), (x, y) => passable(x, y));
      if (path) for (const [x, y] of path.slice(0, 4)) { if (someoneAt(x, y, u)) break; u.facing = facingTo(x - u.x, y - u.y); u.x = x; u.y = y; }
    }
    if (cheb(u.x, u.y, st().x, st().y) <= 1) {
      log(`${who(u)} writes in their own blood on SCP-012 (2 damage).`, "bad");
      fx({ type: "text", x: u.x * TS + TS / 2, y: u.y * TS - 2, text: "2", color: "#d75b47", dur: 800 });
      damage(u, 2);
    }
  }
  if (any) { computeVis(); hooks.update(); await sleep(300); }
}
export const shakeTargets = (u: Unit) => u.side === "mtf" && !u.eyesDown ? S.units.filter(v => v !== u && v.compelled !== undefined && v.alive && !v.saved && cheb(u.x, u.y, v.x, v.y) <= 1) : [];
export function shakeOut(u: Unit, t: Unit) {
  t.compelled = undefined;
  if (isTeam(t)) loseSanity(t, 10, "other");
  log(`${full(u)} pulls ${who(t)} away and shakes them out of it${isTeam(t) ? " (−10 sanity)" : ""}.`, "good");
}
export const scoreTargets = (u: Unit) => {
  const d = st();
  return S.scp === "012" && d.alive && !S.sealed && u.side === "mtf" && u.eyesDown && carries(u, "folder") && cheb(u.x, u.y, d.x, d.y) <= 1 ? [d] : [];
};
export function secureScore(u: Unit) {
  useUp(u, "folder"); S.sealed = true;
  for (const v of S.units) v.compelled = undefined;
  log(`${full(u)}, eyes on the floor, closes the lined folder over SCP-012. It's secured.`, "good");
  banner("CONTAINED", "#86c193");
}

// ---------- SCP-939 ----------
export const voices = () => S.units.filter(u => u.voice && u.alive);
/** The team only makes them out within 5 tiles, or anywhere a flare lights. */
export const hidden939 = (u: Unit) => !!u.voice && !team().some(m => cheb(m.x, m.y, u.x, u.y) <= 5) && !lit(u.x, u.y);
const CALLS = ["Over here! I'm hit!", "Help me, I can't see!", "It's gone, come on through!", "Don't leave me here!", "Medic! Medic!", "This way, quick!"];
async function phase939() {
  // noisemakers call
  S.lures = (S.lures ?? []).filter(l => l.until >= S.turn);
  for (const l of S.lures) emitNoise(l.x, l.y, "lure");
  const pack = voices();
  if (!pack.length) return;
  // one of them speaks with someone else's voice
  if (Math.random() < 0.5) {
    const v = pick(pack), people = [...team().filter(m => m.side === "mtf"), ...S.units.filter(u => u.side === "civilian" && u.alive && !u.saved && !u.record)];
    if (people.length) {
      const as = pick(people), tag = r4b("voice_analysis") ? " (mimicry?)" : "";
      log(`${as.call || as.name}: "${pick(CALLS)}"${tag}`, "key");
      emitNoise(v.x, v.y, "voice", v);
      for (const f of S.units.filter(u => u.side === "civilian" && u.alive && !u.saved && (u.researcher || u.followId) && cheb(u.x, u.y, v.x, v.y) <= 10)) {
        f.followId = undefined;
        const path = pathTo(f.x, f.y, (x, y) => cheb(x, y, v.x, v.y) <= 1, passable);
        if (path) for (const [x, y] of path.slice(0, 2)) { if (someoneAt(x, y, f)) break; f.x = x; f.y = y; }
        log(`${f.name} hears a voice they know and goes toward it.`, "bad");
      }
    }
  }
  for (const v of pack) {
    const prey = humans().filter(h => !h.downed || isTeam(h));
    let near = prey.filter(h => cheb(h.x, h.y, v.x, v.y) <= 1);
    if (!near.length) {
      const m = S.mem.get("939-" + v.id), goal: Pt | null = m && S.turn - m.turn <= 2 ? [m.x, m.y] : null;
      const path = goal ? pathTo(v.x, v.y, (x, y) => cheb(x, y, goal[0], goal[1]) <= 0 || (x === goal[0] && y === goal[1]), passable)
        : pathTo(v.x, v.y, (x, y) => passable(x, y) && Math.random() < 0.08, passable);
      if (path) for (const [x, y] of path.slice(0, 6)) {
        if (someoneAt(x, y, v)) break;
        v.facing = facingTo(x - v.x, y - v.y); v.x = x; v.y = y;
        if (prey.some(h => cheb(h.x, h.y, x, y) <= 1)) break;
      }
      if (goal && v.x === goal[0] && v.y === goal[1]) S.mem.delete("939-" + v.id);
      near = prey.filter(h => cheb(h.x, h.y, v.x, v.y) <= 1);
    }
    if (near.length) {
      const t = near[0], dmg = rand(3, 4), soak = Math.min(t.armor ?? 0, dmg);
      if (seen(t.x, t.y) || isTeam(t)) log(`${seen(v.x, v.y) && !hidden939(v) ? "SCP-939" : "Something in the dark"} bites ${who(t)} for ${dmg - soak}${soak ? ` (armor absorbed ${soak})` : ""}.`, "bad");
      fx({ type: "text", x: t.x * TS + TS / 2, y: t.y * TS - 2, text: String(dmg - soak), color: "#d75b47", dur: 800 });
      damage(t, dmg - soak);
    }
  }
  computeVis(); hooks.update();
  await sleep(350);
}
export const LURE_USES = () => r4b("acoustic_lures") ? 3 : 2;
export function placeLure(u: Unit, x: number, y: number) {
  const turns = r4b("acoustic_lures") ? 4 : 3;
  (S.lures ??= []).push({ x, y, until: S.turn + turns });
  log(`${full(u)} throws a noisemaker. It starts playing voices on a loop (for ${turns} enemy turns).`, "key");
  emitNoise(x, y, "lure", u);
}

// ---------- SCP-035 ----------
const hostOf = () => S.maskHost ? S.units.find(u => u.id === S.maskHost && u.alive) : undefined;
/** Keep the mask where its wearer is. */
export function syncMask() { const h = hostOf(), m = st(); if (S.scp === "035" && h) { m.x = h.x; m.y = h.y; } }
export function maskOnFloor() { return S.scp === "035" && !S.maskHost && !S.sealed && st().alive; }
/** The host has died or gone down: the mask falls to the floor where they were. */
export function dropMask(h: Unit) {
  if (S.maskHost !== h.id) return;
  S.maskHost = undefined; h.host = false;
  st().x = h.x; st().y = h.y;
  if (h.wasSide) { h.side = h.wasSide; h.wasSide = undefined; }
  log(`The mask comes away from ${who(h)}'s face and drops to the floor. Case it before it reaches anyone else.`, "key");
  highlight(3, "#f0ece2");
}
function possess(u: Unit) {
  S.maskHost = u.id; u.host = true;
  if (u.side !== "zombie") { u.wasSide = u.side; u.side = "zombie"; }
  u.overwatch = false; u.staring = false; u.compelled = undefined; u.followId = undefined; u.eyesDown = false;
  if (u.carrying) u.carrying = undefined;
  st().x = u.x; st().y = u.y;
  log(`${u.wasSide === "mtf" ? full(u) : u.name} picks up the mask and puts it on. It speaks with their mouth now.`, "bad");
  banner("SCP-035 HAS A NEW HOST", "#d75b47"); highlight(5, "#d75b47");
}
async function phase035() {
  const h = hostOf();
  if (!h) return;
  // its voice
  const cost = r4b("mask_psychology") ? 2 : 4;
  const hearers = team().filter(m => m !== h && !isPanicked(m) && cheb(m.x, m.y, h.x, h.y) <= 6 && canSee(m, h.x, h.y));
  if (hearers.length) { for (const m of hearers) loseSanity(m, cost, "sight"); log(`SCP-035 talks, pleasantly, about each of them by name (−${cost} sanity for ${hearers.map(m => m.call || m.name).join(", ")}).`, "bad"); }
  // it walks its host toward the nearest person and touches them
  const prey = humans().filter(p => p !== h && !p.host);
  const target = prey.filter(p => canSee(h, p.x, p.y)).sort((a, b) => cheb(a.x, a.y, h.x, h.y) - cheb(b.x, b.y, h.x, h.y))[0];
  if (target && cheb(target.x, target.y, h.x, h.y) > 1) {
    const path = pathTo(h.x, h.y, (x, y) => cheb(x, y, target.x, target.y) <= 1 && !someoneAt(x, y, h), passable);
    if (path) for (const [x, y] of path.slice(0, 4)) { if (someoneAt(x, y, h)) break; h.facing = facingTo(x - h.x, y - h.y); h.x = x; h.y = y; }
  }
  syncMask();
  const touch = prey.find(p => cheb(p.x, p.y, h.x, h.y) <= 1);
  if (touch) {
    const soak = Math.min(touch.armor ?? 0, 3);
    log(`${who(h)}'s touch corrodes ${who(touch)} (${3 - soak}${soak ? `, armor absorbed ${soak}` : ""}).`, "bad");
    damage(touch, 3 - soak);
  }
  // the host rots
  if (h.alive) { log(`${who(h)} is rotting under the mask (1 damage).`, isTeam(h) || h.wasSide === "mtf" ? "bad" : ""); damage(h, 1); }
  computeVis(); hooks.update();
  await sleep(350);
}
/** At the end of each enemy phase: the mask on the floor reaches for someone close. */
function reach035() {
  if (!maskOnFloor()) return;
  const m = st();
  const near = humans().filter(u => !u.downed && !u.record && cheb(u.x, u.y, m.x, m.y) <= 2 && !suited(u)).sort((a, b) => cheb(a.x, a.y, m.x, m.y) - cheb(b.x, b.y, m.x, m.y));
  const u = near[0];
  if (!u) return;
  if (Math.random() < 0.5 + Math.max(0, 50 - u.san) * 0.01) possess(u);
  else log(`${who(u)} feels the urge to pick up the mask, and doesn't.`, "key");
}
export const caseTargets = (u: Unit) => {
  const m = st();
  return maskOnFloor() && u.side === "mtf" && carries(u, "case") && cheb(u.x, u.y, m.x, m.y) <= 1 ? [m] : [];
};
export function caseMask(u: Unit) {
  if (!suited(u) && !r4b("sealed_handling") && Math.random() < 0.2) {
    log(`${full(u)} reaches for the mask and stops. They lift it to their face instead.`, "bad");
    possess(u); return;
  }
  useUp(u, "case"); S.sealed = true;
  log(`${full(u)} lifts the mask into the lead-lined case and locks it. It goes quiet.`, "good");
  banner("CONTAINED", "#86c193");
}
/** A host at 0 HP: a civilian or Insurgent host dies; a team member it had taken is downed instead, without it. */
export function hostFalls(u: Unit) {
  if (!u.host || S.maskHost !== u.id) return false;
  const wasTeam = u.wasSide === "mtf" || u.wasSide === "dclass";
  dropMask(u);
  return wasTeam;
}

// ---------- SCP-682 ----------
export const isDown682 = () => S.scp === "682" && (S.downUntil ?? -1) >= S.turn;
const REGEN = 4, BITE: [number, number] = [5, 7];
/** A hit on SCP-682: armor already counted; after 3 hits of a kind, that kind does half damage. At 0 it collapses. */
export function hit682(dmg: number, kind: string) {
  const d = st();
  if (isDown682()) { log("SCP-682 is already down. Shooting it now does nothing; drag it into the container.", "key"); return; }
  S.adapt ??= {};
  const n = S.adapt[kind] ?? 0;
  if (n >= 3) dmg = Math.ceil(dmg / 2);
  S.adapt[kind] = n + 1;
  if (n + 1 === 3) log(`SCP-682 is adapting: ${KIND_NAME[kind] ?? kind} barely marks it now (half damage from here on).`, "bad");
  d.hp -= dmg;
  if (d.hp <= 0) {
    d.hp = 0;
    const turns = r4b("regeneration_study") ? 3 : 2;
    S.downUntil = S.turn + turns - 1;
    log(`SCP-682 collapses in a ruin of torn flesh. It is already regrowing: it will be up again in ${turns} turns. Drag it into the container now.`, "good");
    banner("SCP-682 IS DOWN", "#86c193"); highlight(4, "#86c193");
  }
}
const KIND_NAME: Record<string, string> = { rifle: "rifle fire", carbine: "carbine fire", smg: "submachine-gun fire", mg: "machine-gun fire", shotgun: "buckshot", marksman: "marksman rounds", pistol: "pistol fire", explosive: "explosives", fire: "fire", other: "that" };
async function phase682() {
  const d = st();
  if (S.sealed || !d.alive) return;
  if ((S.downUntil ?? -1) >= S.turn) { if (seen(d.x, d.y)) log("SCP-682 lies where it fell, regrowing.", "key"); return; }
  if (d.hp <= 0) { d.hp = 10; log("SCP-682 heaves itself up again (10 HP).", "bad"); highlight(4, "#5a7040"); }
  else if (d.hp < d.maxHp) d.hp = Math.min(d.maxHp, d.hp + REGEN);
  const prey = humans().filter(h => !h.downed || isTeam(h));
  let near = prey.filter(h => cheb(h.x, h.y, d.x, d.y) <= 1);
  if (!near.length && prey.length) {
    // it tears through cover, partitions, doors and glass to get at them
    const through = (x: number, y: number) => { const t = tileAt(x, y); return passable(x, y) || doorShut(x, y) || t === HALF || t === FULL || t === PART || t === WINDOW; };
    const path = pathTo(d.x, d.y, (x, y) => prey.some(h => cheb(h.x, h.y, x, y) <= 1) && !someoneAt(x, y, d), through);
    let broke = 0;
    if (path) for (const [x, y] of path.slice(0, 6)) {
      if (someoneAt(x, y, d)) break;
      if (!passable(x, y)) { if (blastStructure(x, y, 1) || (tileAt(x, y) === FULL && (L.grid[y][x] = 1, L.version++, true))) broke++; }
      if (!passable(x, y)) break;
      d.facing = facingTo(x - d.x, y - d.y); d.x = x; d.y = y;
      if (prey.some(h => cheb(h.x, h.y, x, y) <= 1)) break;
    }
    if (broke && seen(d.x, d.y)) log(`SCP-682 smashes through ${broke > 1 ? "everything" : "what was"} in its way.`, "bad");
    near = prey.filter(h => cheb(h.x, h.y, d.x, d.y) <= 1);
  }
  if (near.length) {
    const t = near[0], dmg = rand(...BITE), soak = Math.min(t.armor ?? 0, dmg);
    log(`SCP-682 bites ${who(t)} for ${dmg - soak}${soak ? ` (armor absorbed ${soak})` : ""}.`, "bad");
    fx({ type: "text", x: t.x * TS + TS / 2, y: t.y * TS - 2, text: String(dmg - soak), color: "#d75b47", dur: 800 });
    damage(t, dmg - soak); highlight(3, "#d75b47");
  }
  emitNoise(d.x, d.y, "scp", d);
  computeVis(); hooks.update();
  await sleep(400);
}

// ---------- the turn ----------
/** The new anomalies' part of the enemy turn. */
export async function newAnomalyPhase() {
  switch (S.scp) {
    case "096": await phase096(); break;
    case "012": await phase012(); break;
    case "939": await phase939(); break;
    case "035": await phase035(); break;
    case "682": await phase682(); break;
  }
}
/** After everything else in the enemy turn. */
export function endOfEnemyPhase() {
  if (S.scp === "012") compel012();
  if (S.scp === "035") reach035();
  if (S.scp === "096") check096();
}
/** Why the container can't be sealed on a new anomaly yet (null: it's fine, or not one of these). */
export function sealBlock(): string | null {
  if (S.scp === "096" && !S.hooded) return "Hood SCP-096 before sealing it in.";
  if (S.scp === "682" && !isDown682()) return "SCP-682 has to be down when the door shuts, or it walks straight out.";
  if (S.scp === "012" || S.scp === "035") return S.scp === "012" ? "SCP-012 goes in the folder, not the container." : "The mask goes in its case, not the container.";
  return null;
}
/** What the container door closes on: SCP-939 is any live instance inside it. */
export function sealTarget(): Unit | null {
  if (S.scp === "939") return voices().find(v => inContainer(v.x, v.y)) ?? null;
  return S.statue;
}
export const statusName = () => ({ "096": "SCP-096", "012": "SCP-012", "939": "SCP-939", "035": "SCP-035", "682": "SCP-682" } as Record<string, string>)[S.scp ?? ""] ?? S.statue.name;
void area;
