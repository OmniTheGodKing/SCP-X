// Phase 5: how a new Full Campaign opens. An SCP-173 instance is loose at Provisional Site-11, a holding facility the
// Foundation already runs, and the player commands a detachment of Epsilon-11, the Foundation-wide response force on
// loan for the incident. After it, Epsilon-11 goes back to wider duty, the recovered instance needs a permanent home,
// and the player founds their own site and their own MTF. Epsilon-11 never joins the player's organization.
import { chronicle } from "./history";
import { log, operativeFrom, refreshRecruits, type Campaign, type Incident, type Loadout } from "./campaign";
import { rollCandidate } from "../data/units";
import { familyOf } from "../data/names";
import { MTF_CONFIG } from "../data/mtf";
import { deployCap } from "./org";

/** Written with a non-breaking hyphen so the display never renames it to the player's MTF. */
export const E11 = "Epsilon‑11";
export const OPENING_SITE = "Provisional Site-11";

/** The historical starts. Only the Full Campaign has its introductory operation built so far; the others are listed
 *  and marked unavailable rather than quietly reusing the 1951 incident. */
export const ERAS = [
  { id: "full", name: "Full Campaign", years: "1951–2026", ready: true, desc: "From the first years of the Foundation's open operations to the present. Opens with an SCP-173 instance loose at a holding facility." },
  { id: "early", name: "Early Cold War", years: "1951–1962", ready: false, desc: "Its own introductory operation isn't built yet." },
  { id: "late", name: "Late Cold War", years: "1979–1991", ready: false, desc: "Its own introductory operation isn't built yet." },
  { id: "modern", name: "Modernization", years: "1992–2008", ready: false, desc: "Its own introductory operation isn't built yet." },
  { id: "now", name: "Contemporary", years: "2009–2026", ready: false, desc: "Its own introductory operation isn't built yet." },
  { id: "custom", name: "Custom Historical Campaign", years: "Any start year", ready: false, desc: "Needs the period introductory operations above." },
] as const;

/** Set up the opening: the loaned detachment and the incident. The campaign's base becomes the player's site later. */
export function beginOpening(c: Campaign) {
  c.phase = "opening";
  for (const o of c.roster) o.loan = true;
  const inc: Incident = {
    id: "inc0", kind: "breach", scpId: "173",
    title: `Incident 000: SCP-173 instance loose at ${OPENING_SITE}`,
    appeared: c.day, expires: c.day, insurgents: 0, region: "east_us", map: "wingC", cause: "accident",
  };
  c.incidents = [inc];
  log(c, `${OPENING_SITE} reports an SCP-173 instance out of its cell. ${E11} is the nearest response force and you have its detachment.`, "key");
  return inc;
}
export const openingIncident = (c: Campaign) => c.incidents.find(i => i.id === "inc0");
/** The detachment's default kit: what it carries in, nothing from the player's (not yet existing) stores. */
export const openingLoadouts = (c: Campaign): Loadout[] => c.roster.filter(o => o.alive && o.loan).slice(0, 4).map(o => ({ opId: o.id, armor: "", items: [] }));

/** After the debrief: Epsilon-11 goes back to Foundation duty, and the site is given its own people to organize. */
export function closeOpening(c: Campaign, won: boolean) {
  const loaned = c.roster.filter(o => o.loan);
  c.loanReturned = { day: c.day, names: loaned.filter(o => o.alive).map(o => `${o.call} ${o.name}`), lost: loaned.filter(o => !o.alive).map(o => `${o.call} ${o.name}`) };
  chronicle(c, "deployment", `${E11}'s detachment ${won ? "recontained" : "fought"} the SCP-173 instance at ${OPENING_SITE}${c.loanReturned.lost.length ? `, losing ${c.loanReturned.lost.join(", ")}` : ""}, and went back to Foundation-wide duty.`);
  c.roster = c.roster.filter(o => !o.loan);
  c.incidents = c.incidents.filter(i => i.id !== "inc0");
  // the people the new site will organize into its MTF: enough for two squads with reserves
  const used = new Set<string>();
  const n = MTF_CONFIG.startSquads * (deployCap(c) + 1) + 2;
  for (let i = 0; i < n; i++) {
    const k = rollCandidate(`found-${i}-${c.day}`, 1951, used);
    used.add(familyOf(k.name));
    const o = operativeFrom(c, { ...k, quality: i < 2 ? 1 : 0, trait: undefined });
    c.roster.push(o);
  }
  refreshRecruits(c);
  c.phase = "site";
}

/** Callsigns for an MTF's people from its designation: Rho-12 gives R12-01, R12-02... */
export function callsignsFor(c: Campaign, designation: string) {
  const m = /^([A-Za-z])[a-z]*-?(\d+)$/.exec(designation.trim().replace(/\s+/g, "-"));
  const pre = m ? `${m[1].toUpperCase()}${m[2]}` : designation.slice(0, 3).toUpperCase();
  let n = 1;
  for (const o of c.roster.filter(x => x.alive && x.squad)) o.call = `${pre}-${String(n++).padStart(2, "0")}`;
}
