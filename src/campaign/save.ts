// Campaign saves live in this browser only. Storage can be unavailable (private windows,
// blocked site data), so every access is guarded and the game still runs without it.
import type { Campaign } from "./campaign";

import { newResearch } from "./research";
import { HOME } from "../data/regions";
import { newRegions } from "./world";
import { startingModels } from "../data/weapons";

const KEY = "site19-campaign-v2";

/** Loads the saved campaign, bringing older saves up to date. Pass-one saves (v1) can't be carried over. */
export function loadCampaign(): Campaign | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { version: number } | null;
    if (!c) return null;
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
    return c.version === 6 ? (c as unknown as Campaign) : null;
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
