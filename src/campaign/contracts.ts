// Council contracts (Phase 4E): paid, noncombat work other parts of the Foundation need done, offered two at a time.
// Taking one sends Site-19's own people away for a while; they come back with the pay. It gives Site-19 something
// useful to do while squads recover, without being a source of unlimited money.
import { RANKS, log, type Campaign, type Operative } from "./campaign";
import { earn } from "./ledger";
import { FIELDS, TRADES, bringBack, present, sendAway, syncStaff } from "./people";
import { engineersFree } from "./base";
import { researchersFree } from "./research";
import { guardsReady } from "./security";
import { injure } from "./condition";

export type ContractKind = "engineers" | "consult" | "cadre" | "security" | "courier";
export const CONTRACTS: Record<ContractKind, { name: string; client: string[]; days: number; pay: number; need: string; desc: string; risk?: number }> = {
  engineers: { name: "Engineering secondment", client: ["Site-17", "Site-23", "Area-12"], days: 10, pay: 50, need: "2 free engineers", desc: "Two engineers help another site refit its cells." },
  consult: { name: "Research consultancy", client: ["Site-17", "Site-23", "the Ethics Committee"], days: 12, pay: 45, need: "1 unassigned researcher", desc: "A researcher reviews another site's test protocols." },
  cadre: { name: "Training cadre", client: ["Site-17", "Area-12", "MTF Alpha-1's depot"], days: 14, pay: 60, need: "1 fit operative", desc: "An operative trains another site's security force, and learns a little doing it (+1 XP)." },
  security: { name: "Security detail", client: ["Site-17", "Site-23", "a Foundation front"], days: 10, pay: 40, need: "2 guards", desc: "Two guards secure a sensitive delivery elsewhere." },
  courier: { name: "Courier escort", client: ["the O5 Council", "Site-23", "Area-12"], days: 6, pay: 50, need: "1 fit operative", desc: "An operative carries sealed documents between sites. 15% chance they come back hurt.", risk: 0.15 },
};
export const CONTRACT = { offers: 2, open: 10, yearRaise: 0.1 };

export interface Contract { id: string; kind: ContractKind; client: string; pay: number; until: number; due?: number; who?: string[] }
export interface ContractState { offers: Contract[]; active: Contract[]; next: number }
export const newContracts = (): ContractState => ({ offers: [], active: [], next: 1 });

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const fitOps = (c: Campaign) => c.roster.filter(o => o.alive && o.hp >= o.maxHp && !o.busy && !(o.injury && o.injury.until > c.day) && (o.fatigue ?? 0) < 40);
/** The operative a contract would take: the least experienced fit one, so the veterans stay home. */
export const contractOperative = (c: Campaign): Operative | null => fitOps(c).sort((a, b) => a.xp - b.xp)[0] ?? null;
const pay = (c: Campaign, kind: ContractKind) => Math.round(CONTRACTS[kind].pay * (1 + CONTRACT.yearRaise * Math.floor((c.day - 1) / 365)) / 5) * 5;

function offer(c: Campaign) {
  const k = (c.contracts ??= newContracts());
  const taken = new Set([...k.offers, ...k.active].map(x => x.kind));
  const kinds = (Object.keys(CONTRACTS) as ContractKind[]).filter(x => !taken.has(x));
  if (!kinds.length) return;
  const kind = pick(kinds);
  k.offers.push({ id: "k" + k.next++, kind, client: pick(CONTRACTS[kind].client), pay: pay(c, kind), until: c.day + CONTRACT.open });
}

/** How many people of what sort a contract takes. */
export const NEEDS: Record<ContractKind, { kind: "engineer" | "researcher" | "guard" | "operative"; n: number }> = {
  engineers: { kind: "engineer", n: 2 }, consult: { kind: "researcher", n: 1 }, security: { kind: "guard", n: 2 }, cadre: { kind: "operative", n: 1 }, courier: { kind: "operative", n: 1 },
};
/** Who could be sent on a contract of this kind: [id, label] pairs. */
export function contractPool(c: Campaign, kind: ContractKind): [string, string][] {
  const need = NEEDS[kind];
  if (need.kind === "engineer" || need.kind === "researcher") { syncStaff(c); return present(c, need.kind).map(p => [p.id, `${p.name}${p.field ? ` (${FIELDS[p.field].name.toLowerCase()})` : p.trade ? ` (${TRADES[p.trade].name.toLowerCase()})` : ""}`]); }
  if (need.kind === "guard") return guardsReady(c).map(g => [g.id, g.name]);
  return fitOps(c).map(o => [o.id, `${o.call} ${o.name} (${RANKS[o.rank]})`]);
}
export function canAcceptContract(c: Campaign, x: Contract, pick?: string[]): string | null {
  const need = NEEDS[x.kind];
  if (x.kind === "engineers" && engineersFree(c) < 2) return "Needs 2 free engineers.";
  if (x.kind === "consult" && researchersFree(c) < 1) return "Needs an unassigned researcher.";
  const pool = contractPool(c, x.kind);
  if (pool.length < need.n) return need.kind === "guard" ? "Needs 2 guards fit for duty." : need.kind === "operative" ? "Needs a fit operative with nothing else to do." : `Needs ${need.n} ${need.kind}${need.n > 1 ? "s" : ""}.`;
  if (pick) {
    const ids = new Set(pool.map(([id]) => id)), chosen = [...new Set(pick)].filter(id => ids.has(id));
    if (chosen.length !== need.n) return `Choose ${need.n === 1 ? "who goes" : `${need.n} to send`}.`;
  }
  return null;
}
/** Take a contract, sending exactly the people the player chose (or the obvious ones if none were chosen). */
export function acceptContract(c: Campaign, id: string, pick?: string[]) {
  const k = c.contracts; const x = k?.offers.find(o => o.id === id);
  if (!k || !x || canAcceptContract(c, x, pick)) return;
  const d = CONTRACTS[x.kind], need = NEEDS[x.kind];
  const ids = (pick && pick.length ? [...new Set(pick)] : contractPool(c, x.kind).map(([i]) => i)).slice(0, need.n);
  x.due = c.day + d.days; x.who = [];
  if (need.kind === "engineer" || need.kind === "researcher") { for (const pid of ids) { const p = sendAway(c, need.kind, pid); if (p) x.who.push(p.id); } }
  else if (need.kind === "guard") { for (const g of c.guards.filter(g => ids.includes(g.id))) { g.away = x.due; x.who.push(g.id); } }
  else { const o = c.roster.find(r => r.id === ids[0])!; o.busy = { kind: "contract", daysLeft: d.days }; x.who.push(o.id); }
  k.offers = k.offers.filter(o => o !== x); k.active.push(x);
  log(c, `${d.name} for ${x.client} accepted: ${whoText(c, x)} away for ${d.days} days, $${x.pay}k on their return.`, "key");
  offer(c);
}
export function whoText(c: Campaign, x: Contract) {
  const need = NEEDS[x.kind];
  if (need.kind === "guard") return x.who!.map(id => c.guards.find(g => g.id === id)?.name ?? "a guard").join(" and ");
  if (need.kind === "operative") { const o = c.roster.find(r => r.id === x.who![0]); return o ? `${o.call} ${o.name}` : "an operative"; }
  return x.who!.map(id => (c.people ?? []).find(p => p.id === id)?.name ?? id).join(" and ") || "staff";
}

/** Every day: offers lapse and are replaced, finished contracts pay and their people come home. */
export function tickContracts(c: Campaign) {
  const k = (c.contracts ??= newContracts());
  k.offers = k.offers.filter(x => x.until > c.day);
  for (const x of k.active.filter(a => (a.due ?? 0) <= c.day)) {
    const d = CONTRACTS[x.kind];
    let note = "";
    if (x.kind === "engineers") for (const pid of x.who!) bringBack(c, "engineer", pid);
    else if (x.kind === "consult") for (const pid of x.who!) bringBack(c, "researcher", pid);
    else if (x.kind === "security") for (const g of c.guards) { if (x.who!.includes(g.id)) g.away = undefined; }
    else {
      const o = c.roster.find(r => r.id === x.who![0]);
      if (o) {
        if (o.busy?.kind === "contract") o.busy = undefined;
        if (x.kind === "cadre" && o.alive) o.xp += 1;
        if (d.risk && o.alive && Math.random() < d.risk) note = ` ${o.name} came back hurt: ${injure(c, o)}.`;
      }
    }
    earn(c, x.pay, "contracts", `${d.name} for ${x.client}`);
    log(c, `${d.name} for ${x.client} done: ${whoText(c, x)} ${x.who!.length > 1 ? "are" : "is"} back, and $${x.pay}k is paid.${note}`, note ? "key" : "good");
  }
  k.active = k.active.filter(a => (a.due ?? 0) > c.day);
  while (k.offers.length < CONTRACT.offers && k.offers.length + k.active.length < Object.keys(CONTRACTS).length) { const n = k.offers.length; offer(c); if (k.offers.length === n) break; }
}
