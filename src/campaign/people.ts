// Site-19's researchers and engineers as people, the way XCOM names its scientists and engineers: a name, a face, a
// field or trade, a line about who they are. The counts c.researchers and c.engineers stay the source of truth for
// the rules; this list keeps a person behind every one of them, and remembers the ones who were lost.
import { CULTURES, fullName, type Culture } from "../data/names";
import { rollLook, type Look } from "../data/looks";
import type { Branch } from "./research";
import { log, type Campaign } from "./campaign";

export type StaffKind = "researcher" | "engineer";
export type Field = "biology" | "physics" | "psychology" | "materials" | "signals";
export type Trade = "mason" | "electrician" | "machinist" | "rigger";
export interface Person {
  id: string; kind: StaffKind; name: string; sex: "m" | "f"; look: Look; since: number; bio: string;
  field?: Field; trade?: Trade;
  /** On leave or out on a job: still on staff, not at Site-19. */
  away?: boolean;
  /** On loan from another site, and which. */
  loan?: string;
}
export interface Lost { name: string; kind: StaffKind; day: number; how: string; field?: Field; trade?: Trade }

export const FIELDS: Record<Field, { name: string; branches: Branch[] }> = {
  biology: { name: "Anomalous biology", branches: ["SCP-049", "Objects"] },
  physics: { name: "Theoretical physics", branches: ["SCP-173", "SCP-106", "Breakthrough"] },
  psychology: { name: "Psychology", branches: ["Personnel"] },
  materials: { name: "Materials science", branches: ["Equipment", "Weapons", "Site"] },
  signals: { name: "Signals and cryptography", branches: ["Insurgency"] },
};
export const TRADES: Record<Trade, { name: string; desc: string }> = {
  mason: { name: "Mason", desc: "New facilities go up faster" },
  electrician: { name: "Electrician", desc: "Repairs and generator refits go faster" },
  machinist: { name: "Machinist", desc: "Workshop orders finish sooner" },
  rigger: { name: "Rigger", desc: "Excavation goes faster" },
};
/** A field specialist on staff speeds every project in their field by this much. */
export const FIELD_BONUS = 0.25;
/** Each trade on staff gives its kind of work this daily chance of an extra day's progress. */
export const TRADE_CHANCE = 0.25;

const BIO_R = [
  "Came over from a university lab that never asked where its grant came from.", "Wrote the paper everyone in the field pretends not to have read.",
  "Keeps a cactus on the desk and a revolver in the drawer, and won't say why.", "Was at Los Alamos, and doesn't talk about it either.",
  "Recruited out of a sanatorium after a very specific breakdown.", "Insists on the night shift. Nobody has asked twice.",
  "Writes letters home every week that are never sent.", "Lost a bet with a Site Director and has been here ever since.",
  "Was the only person in the room who didn't faint.", "Has a theory about SCP-173 that changes every Tuesday.",
];
const BIO_E = [
  "Built bridges for the Corps of Engineers in Korea.", "Ran a machine shop in Detroit until the Foundation bought it, and them.",
  "Can fix anything with a wire and a cigarette. Has done so, under fire.", "Wired the lights in half the county before the Foundation found them.",
  "Came up through the Seabees and still swears like it.", "Was told the job was a mining company. Stayed anyway.",
  "Keeps a notebook of every door at Site-19 and which ones stick.", "Talks to the generators. They seem to listen.",
  "Built the first cell door that held. Is proud of it, quietly.", "Hums while welding. Everyone has stopped complaining.",
];
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const CULTURE_POOL: Culture[] = ["us", "us", "us", "uk", "uk", "fr", "de", "it", "hu", "pl", "nl", "se", "il", "ru"];

export function newPerson(c: Campaign, kind: StaffKind, loan?: string): Person {
  const used = new Set([...(c.people ?? []).map(p => p.name), ...c.roster.map(o => o.name)]);
  const sex: "m" | "f" = Math.random() < (kind === "researcher" ? 0.35 : 0.15) ? "f" : "m";
  const culture = pick(CULTURE_POOL.filter(k => CULTURES[k]));
  const id = `${kind[0]}${c.day}-${Math.floor(Math.random() * 1e6)}`;
  const base = fullName(culture, sex, used);
  return {
    id, kind, sex, look: rollLook(id, sex), since: c.day, loan,
    name: kind === "researcher" ? `Dr. ${base}` : base,
    bio: kind === "researcher" ? pick(BIO_R) : pick(BIO_E),
    field: kind === "researcher" ? pick(Object.keys(FIELDS) as Field[]) : undefined,
    trade: kind === "engineer" ? pick(Object.keys(TRADES) as Trade[]) : undefined,
  };
}
export const present = (c: Campaign, kind: StaffKind) => (c.people ?? []).filter(p => p.kind === kind && !p.away);

/** Keep a person behind every researcher and engineer the counts say Site-19 has. Returns anyone new. */
export function syncStaff(c: Campaign): Person[] {
  c.people ??= [];
  const added: Person[] = [];
  for (const kind of ["researcher", "engineer"] as StaffKind[]) {
    const want = kind === "researcher" ? c.researchers : c.engineers;
    let here = present(c, kind);
    // someone back from leave fills a gap before anyone new is hired
    while (here.length < want) {
      const back = c.people.find(p => p.kind === kind && p.away);
      if (back) back.away = false; else { const p = newPerson(c, kind); c.people.push(p); added.push(p); }
      here = present(c, kind);
    }
    // more people than the count: the newest leave quietly (a reassignment nobody announced)
    while (here.length > want) { const p = here[here.length - 1]; c.people = c.people.filter(x => x !== p); here = present(c, kind); }
  }
  return added;
}
/** Hire someone: the count goes up and the new person is named. */
export function hirePerson(c: Campaign, kind: StaffKind, loan?: string): Person {
  syncStaff(c);
  const p = newPerson(c, kind, loan);
  c.people!.push(p);
  if (kind === "researcher") c.researchers++; else c.engineers++;
  return p;
}
/** Someone is lost for good: the count goes down and they're remembered. Returns their names. */
export function losePeople(c: Campaign, kind: StaffKind, n: number, how: string, who?: string): string[] {
  syncStaff(c);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const here = present(c, kind);
    if (!here.length) break;
    const p = here.find(x => x.name === who) ?? here[Math.floor(Math.random() * here.length)];
    c.people = c.people!.filter(x => x !== p);
    if (kind === "researcher") c.researchers = Math.max(0, c.researchers - 1); else c.engineers = Math.max(0, c.engineers - 1);
    (c.staffLost ??= []).unshift({ name: p.name, kind, day: c.day, how, field: p.field, trade: p.trade });
    out.push(p.name);
  }
  return out;
}
/** Someone leaves Site-19 for a while (leave, a job in the field). */
export function sendAway(c: Campaign, kind: StaffKind): Person | null {
  syncStaff(c);
  const p = present(c, kind)[0];
  if (!p) return null;
  p.away = true;
  if (kind === "researcher") c.researchers--; else c.engineers--;
  return p;
}
export function bringBack(c: Campaign, kind: StaffKind) {
  const p = (c.people ?? []).find(x => x.kind === kind && x.away);
  if (p) p.away = false;
  if (kind === "researcher") c.researchers++; else c.engineers++;
  return p ?? null;
}
/** Research in a branch goes faster while a specialist in that field is on staff. */
export const fieldBoost = (c: Campaign, branch: Branch) =>
  present(c, "researcher").some(p => p.field && FIELDS[p.field].branches.includes(branch)) ? 1 + FIELD_BONUS : 1;
export const hasTrade = (c: Campaign, t: Trade) => present(c, "engineer").some(p => p.trade === t);
/** A name to put on a job: one of the people of that kind at Site-19 now. */
export const someone = (c: Campaign, kind: StaffKind) => { syncStaff(c); const h = present(c, kind); return h.length ? h[Math.floor(Math.random() * h.length)].name : null; };
export function announceHire(c: Campaign, p: Person) {
  log(c, p.kind === "researcher" ? `${p.name} (${FIELDS[p.field!].name.toLowerCase()}) joins the research staff. ${p.bio}` : `${p.name}, ${TRADES[p.trade!].name.toLowerCase()}, joins the engineering staff. ${p.bio}`, "good");
}
