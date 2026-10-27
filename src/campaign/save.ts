// Campaign saves live in this browser only. Storage can be unavailable (private windows,
// blocked site data), so every access is guarded and the game still runs without it.
import type { Campaign } from "./campaign";

const KEY = "site19-campaign-v2";

export function loadCampaign(): Campaign | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Campaign;
    return c && c.version === 2 ? c : null;
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
