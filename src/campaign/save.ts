// Campaign saves live in this browser only. Storage can be unavailable (private windows,
// blocked site data), so every access is guarded and the game still runs without it.
import type { Campaign } from "./campaign";

import { newResearch } from "./research";

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
    return c.version === 4 ? (c as unknown as Campaign) : null;
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
