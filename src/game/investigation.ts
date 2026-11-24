// Phase 6: investigation on the ground. Evidence is placed in the incident's rooms; the team can examine it on the spot
// (faster knowledge, at whatever risk the item carries) or bag it unseen for the labs (safe, slower). Locals can be
// questioned. Seeing the cause up close identifies it. SCP-096's face carried in a photograph or a film marks whoever
// looks, and it comes for them across any distance: a hidden objective appears the moment it happens.
//
// What the team knows going in (setup.intel) decides what the briefing and the map's indicators show. The rules of the
// anomaly don't change with knowledge; only what the team is told and issued does.
import { FLOOR, L, floorTiles, tileAt, type Pt } from "../core/grid";
import { rnd } from "../core/rng";
import { anomalyDef, EVIDENCE, evidenceProps, type EvidenceKind } from "../data/anomalies";
import { revealObjective } from "./objectives";
import { S, banner, full, highlight, log } from "./state";
import type { MissionSetup, Unit } from "./types";

/** What the team knows about the anomaly in the field: the briefing's intel, plus anything seen on this mission. Missions
 *  without intel (every mission from before Phase 6) know everything, as they always did. */
export function fieldKnows(prop: string): boolean {
  const intel = S?.setup.intel;
  if (!intel) return true;
  return intel.known.includes(prop) || !!S.observedProps?.has(prop);
}
/** Whether the anomaly's name may be shown: identified before the mission, or on it. */
export const statueKnown = () => !S?.setup.intel || S.setup.intel.identified || !!S.identified;
export function observe(prop: string) {
  (S.observedProps ??= new Set()).add(prop);
}

/** Labels for evidence of each kind at this incident. */
const LABEL: Record<EvidenceKind, string[]> = {
  remains: ["A body under a sheet", "A body in the cellar", "A body by the back door"],
  scrapes: ["Scrape marks across the floorboards"],
  residue: ["A dark smear on the wall"],
  photograph: ["A camera with an exposed roll", "A torn photograph"],
  testimony: ["A frightened local"],
  medical: ["The doctor's case notes", "A death certificate with no cause"],
  corrosion: ["A wall eaten through", "A rotted doorframe"],
  growth: ["A patch of growth on the wall", "Something growing in the well"],
  records: ["A ledger", "A visitor's log"],
  film: ["A security camera's film reel"],
};
export const evidenceLabel = (k: EvidenceKind, i: number) => LABEL[k][i % LABEL[k].length];

/** Put the evidence on the map, in the rooms where people lived and worked. Bodies are real bodies (they can be carried
 *  out, and SCP-049 can use them). */
export function placeEvidence(setup: MissionSetup, rooms: [number, number, number, number][], claim: (t: Pt[]) => Pt, mk: (o: Partial<Unit> & Pick<Unit, "id" | "side" | "name" | "x" | "y" | "hp" | "maxHp" | "san">) => Unit): Unit[] {
  const out: Unit[] = [];
  (setup.evidence ?? []).forEach((e, i) => {
    const room = rooms[(i + 1) % Math.max(1, rooms.length)];
    const [x, y] = claim(floorTiles(room).filter(([a, b]) => tileAt(a, b) === FLOOR));
    if (e.kind === "testimony") out.push(mk({ id: "ev" + i, side: "civilian", name: e.label, call: e.label, x, y, hp: 4, maxHp: 4, san: 50, evidence: e.kind }));
    else if (e.kind === "remains") out.push(mk({ id: "ev" + i, side: "civilian", name: e.label, x, y, hp: 0, maxHp: 4, san: 0, alive: false, evidence: e.kind }));
    else out.push(mk({ id: "ev" + i, side: "civilian", name: e.label, x, y, hp: 1, maxHp: 1, san: 0, record: true, evidence: e.kind }));
  });
  return out;
}

/** Evidence beside the operative that hasn't been examined (bodies included; a local who will talk). */
export function examineTargets(u: Unit): Unit[] {
  if (u.side !== "mtf" || !S.units.some(v => v.evidence)) return [];
  return S.units.filter(v => v.evidence && !v.examined && !v.saved && !v.cured && !v.carriedBy && Math.max(Math.abs(v.x - u.x), Math.abs(v.y - u.y)) <= 1
    && (v.evidence !== "testimony" || v.alive));
}
/** Why examining isn't possible right now. */
export function examineWhy(u: Unit): string | null {
  if (u.eyesDown) return "Eyes down: they can't look at anything.";
  return examineTargets(u).length ? null : "No unexamined evidence beside them.";
}

/** Examine an item: what it shows is learned now. A photograph or film of SCP-096's face marks whoever looks. */
export function examine(u: Unit, t: Unit) {
  t.examined = true;
  (S.examined ??= []).push(t.evidence!);
  S.clues = (S.clues ?? 0) + 1;
  const id = S.setup.scp ?? "", e = t.evidence!;
  const props = evidenceProps(id, e).filter(p => !fieldKnows(p.id));
  const what = EVIDENCE[e].name.toLowerCase();
  if ((e === "photograph" || e === "film") && id === "096") {
    // the image carries its face: the examiner is marked
    log(`${full(u)} looks at the ${what}. A pale shape, a face... ${full(u)} looks away, but it's too late.`, "bad");
    observe("face_trigger"); observe("image_carrier");
    markFor096(u);
    return;
  }
  if (e === "testimony") log(`${full(u)} talks with ${t.name}. ${testimonyLine(id)}`, "key");
  else log(`${full(u)} examines the ${what}. ${props.length ? findingLine(id, e) : "Nothing new in it."}`, "key");
  if (props.length) observe(props[Math.floor(rnd() * props.length)].id);
}

function testimonyLine(id: string) {
  switch (id) {
    case "049": return "\"The doctor came. Not our doctor. He said they were sick, and he would make them well.\"";
    case "096": return "\"It was sitting by the creek, crying. I never saw its face, thank God. The hiker did.\"";
    case "106": return "\"Old Harlan went down to fix the boiler. We heard him call out, and then the wall was black.\"";
    case "610": return "\"It started on the Hendersons' barn. Then the Hendersons stopped coming to church.\"";
    default: return "They saw something they can't explain.";
  }
}
function findingLine(id: string, e: EvidenceKind) {
  if (e === "remains" && id === "049") return "No wound, no sign of illness. The heart just stopped. And someone has cut into the body since, with care.";
  if (e === "medical" && id === "049") return "Three certificates, three healthy adults, no cause of death. The doctor has written \"heart failure\" and then crossed it out.";
  if (e === "corrosion") return "The stone is rotted through, wet and black, and it stinks. It goes down further than the cellar does.";
  if (e === "growth") return "It is warm. It is alive. It has grown over a dog's collar and the dog is part of it.";
  if (e === "records" && id === "106") return "Three names, each \"gone below\". One came back after a week and was found screaming in the well.";
  if (e === "remains" && id === "096") return "He was torn apart with bare hands, by something very strong, in a single minute.";
  return "It adds something to what is known.";
}

/** SCP-096 is coming for this person. If it isn't on the map, it arrives in a few turns from the farthest edge. */
export function markFor096(u: Unit) {
  if (u.marked) return;
  u.marked = true;
  banner("MARKED", "#d75b47"); highlight(5, "#d75b47");
  const st = S.statue;
  if (S.scp === "096" && !st.alive) S.arrive096 = Math.min(S.arrive096 ?? 99, S.turn + 3);
  revealObjective("marked_" + u.id, { id: "marked_" + u.id, kind: "protect_marked", tier: "secondary", text: `Get ${full(u)} out of the area before whatever they saw arrives`, status: "active", target: u.id });
}

/** At the end of the enemy phase: SCP-096 comes in from the farthest edge for whoever it was marked by. */
export function arrivalTick() {
  if (S.arrive096 === undefined || S.turn < S.arrive096 || S.scp !== "096") return;
  S.arrive096 = undefined;
  const marked = S.units.filter(u => u.marked && u.alive && !u.saved);
  if (!marked.length) return;
  const st = S.statue, m = marked[0];
  let best: Pt | null = null, bd = -1;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    if ((x > 1 && y > 1 && x < L.W - 2 && y < L.H - 2) || tileAt(x, y) !== FLOOR || S.units.some(v => v.alive && v.x === x && v.y === y)) continue;
    const d = Math.max(Math.abs(x - m.x), Math.abs(y - m.y));
    if (d > bd) { bd = d; best = [x, y]; }
  }
  if (!best) return;
  [st.x, st.y] = best; st.alive = true; st.hp = 1;
  S.rage = { targets: marked.map(u => u.id), scream: S.turn };
  log("A scream from far off, getting closer. Something is running this way, fast.", "bad");
  banner("IT IS COMING", "#d75b47");
}

/** At the mission's end: what was seen about the anomaly on the ground. Read by the campaign's dossier. */
export function fieldObservations(): string[] {
  const out = new Set(S.observedProps ?? []);
  const st = S.statue, def = anomalyDef(S.setup.scp ?? "");
  if (!def) return [...out];
  if (S.identified) out.add("appearance");
  if (S.rage) { out.add("face_trigger"); out.add("unstoppable"); }
  if (S.units.some(u => u.id.startsWith("z") && u.side === "zombie" && !u.flesh && !u.voice)) out.add("reanimation");
  if (S.units.some(u => u.taken)) out.add("pocket");
  if (S.corroded.size && S.has106) out.add("corrosion");
  if (S.has049 && (st.staggeredUntil ?? -1) >= 0) out.add("gunfire_stagger");
  if (S.has049 && S.calmUntil > 0) out.add("conversant");
  if (S.has106 && S.feedTurn >= 0) out.add("bait");
  if (S.hooded) out.add("docile");
  if (S.core && S.core.hp < S.core.maxHp) { out.add("core"); out.add("fire_kills"); }
  if (S.units.some(u => u.infectedTurn !== undefined)) out.add("contact_infection");
  return [...out].filter(p => def.properties.some(d => d.id === p));
}
