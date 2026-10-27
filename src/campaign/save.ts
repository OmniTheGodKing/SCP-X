// Campaign saves live in this browser only. Storage can be unavailable (private windows,
// blocked site data), so every access is guarded and the game still runs without it.
import { lookOf, newBio, type Campaign } from "./campaign";
import { withGivenName } from "../data/names";

import { newResearch } from "./research";
import { HOME } from "../data/regions";
import { newRegions } from "./world";
import { newGuard } from "./security";
import { firstSightings } from "./containment";
import { issueDirectives, newCouncil } from "./council";
import { startingModels } from "../data/weapons";

const KEY = "site19-campaign-v2";

/** Loads the saved campaign, bringing older saves up to date. Pass-one saves (v1) can't be carried over. */
export function loadCampaign(): Campaign | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  return raw ? parseCampaign(raw) : null;
}

/** Reads a campaign from saved text (this browser's save or an exported file), bringing older saves up to date. */
export function parseCampaign(raw: string): Campaign | null {
  try {
    const c = JSON.parse(raw) as { version: number; roster?: unknown; base?: unknown } | null;
    if (!c || typeof c.version !== "number" || !Array.isArray(c.roster) || !c.base) return null;
    if (c.version === 2) {
      Object.assign(c, { version: 3, researchers: 0, research: newResearch(), inventory: {}, orders: [], knownNotes: [] });
    }
    if (c.version === 3) {
      const old = c as unknown as Campaign;
      for (const o of old.roster) Object.assign(o, { perks: [], traits: [], breakdowns: 0 });
      Object.assign(c, { version: 4 });
    }
    if (c.version === 4) {
      const old = c as unknown as Campaign;
      Object.assign(c, { version: 5, models: startingModels(), armorTier: old.research.done.includes("body_armor") ? 1 : 0, attachments: {}, prisoners: [], intel: 0, cleaningOrder: true });
    }
    if (c.version === 5) {
      const old = c as unknown as Campaign;
      for (const i of old.incidents) Object.assign(i, { region: HOME, map: i.kind === "breach" ? "wingC" : "town", civilians: i.kind === "breach" ? 0 : 3 });
      Object.assign(c, { version: 6, regions: newRegions(old.exposure), amnestics: 4, nextCoverupDay: old.day + 20 });
    }
    if (c.version === 6) {
      const old = c as unknown as Campaign;
      Object.assign(c, { version: 7, guards: [], nextGuard: 1, alert: "normal" });
      for (let i = 0; i < 2; i++) old.guards.push(newGuard(old));
      // breaches used to wait for an answer; now they're dealt with on the spot, so give any open one a fresh day
      for (const i of old.incidents) if (i.kind === "breach") i.expires = old.day;
    }
    if (c.version === 7) {
      const old = c as unknown as Campaign;
      const s = firstSightings();
      // a campaign already past 1952 sees SCP-049 soon instead
      if (s["049"]! <= old.day) s["049"] = old.day + 20 + Math.floor(Math.random() * 60);
      Object.assign(c, { version: 8, sightings: s });
    }
    if (c.version === 8) {
      const old = c as unknown as Campaign;
      if (!old.scps.some(s => s.id === "106")) {
        const d = firstSightings()["106"]!;
        old.sightings["106"] = d > old.day ? d : old.day + 30 + Math.floor(Math.random() * 90);
      }
      Object.assign(c, { version: 9 });
    }
    if (c.version === 9) Object.assign(c, { version: 10, materials: {}, purchases: [] });
    if (c.version === 10) Object.assign(c, { version: 11, ammo: {}, weaponTier: 1 });
    if (c.version === 11) Object.assign(c, { version: 12 });
    if (c.version === 12) {
      // guards get posts at the stations that exist, in order
      const old = c as unknown as Campaign;
      const st = old.base.facilities.filter(f => f.type === "security" && f.daysLeft === 0);
      let i = 0;
      for (const g of old.guards.filter(g => g.alive)) { const f = st[Math.floor(i / 4)]; if (f) g.stationId = f.id; i++; }
      Object.assign(c, { version: 13 });
    }
    if (c.version === 13) {
      const old = c as unknown as Campaign;
      if (old.day < 1310) old.outbreakDay = Math.max(old.day + 30, 945 + Math.floor(Math.random() * 365));
      else old.outbreakDay = old.day + 30 + Math.floor(Math.random() * 90);
      Object.assign(c, { version: 14 });
    }
    if (c.version === 14) Object.assign(c, { version: 15, morale: 60, dPolicy: "terminate" });
    if (c.version === 15) {
      // personnel files for everyone already on the roster
      for (const o of (c as unknown as Campaign).roster) Object.assign(o, { bio: o.bio ?? newBio(), medals: o.medals ?? [], wounds: o.wounds ?? 0, seals: o.seals ?? 0, faced: o.faced ?? [] });
      Object.assign(c, { version: 16 });
    }
    if (c.version === 16) {
      // full names for everyone (given name added to surname-only records) and a saved face, so neither changes again
      const old = c as unknown as Campaign;
      for (const o of old.roster) {
        if (!o.sex) o.sex = /ova$/.test(o.name) ? "f" : "m";
        o.look = lookOf(o);   // the face they've been shown with, fitted to their sex and saved for good
        o.name = withGivenName(o.name, o.sex ?? "m", o.id);
      }
      for (const g of old.guards) { g.sex ??= "m"; g.name = withGivenName(g.name, g.sex, g.id); }
      for (const r of old.retired ?? []) r.name = withGivenName(r.name, r.sex ?? "m", r.call);
      for (const k of old.recruits ?? []) k.name = withGivenName(k.name, k.sex, k.id);
      Object.assign(c, { version: 17 });
    }
    if (c.version === 17) {
      // the O5 Council: a fresh standing of 50. Every region the save already worked in keeps its front.
      const old = c as unknown as Campaign;
      Object.assign(c, { version: 18, council: newCouncil(old.day) });
      issueDirectives(old, false);
    }
    return c.version === 18 ? (c as unknown as Campaign) : null;
  } catch {
    return null;
  }
}

export function saveCampaign(c: Campaign) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* unsaved is fine */ }
}

export function clearCampaign() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
