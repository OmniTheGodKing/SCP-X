// Seeded randomness for everything that affects play (Tactical overhaul, T0). Two streams: the campaign's, saved
// with the campaign, and a mission's, seeded when the mission starts, so the same seed and the same orders replay the
// same fight. Cosmetic randomness (animation jitter, the shape of a muzzle flash) uses `fxRnd`, which never touches
// either stream, so a different animation can't change a dice roll.

/** mulberry32: small, fast, good enough for game dice. The state is one uint32. */
function next(st: { s: number }) {
  st.s = (st.s + 0x6D2B79F5) | 0;
  let t = st.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const campaign = { s: 1 };
const mission = { s: 1 };
let active: { s: number } = campaign;
let forced: number | null = null;

/** A new seed from outside the game (the only place real entropy comes in). */
export const freshSeed = () => (Math.random() * 4294967296) >>> 0;

/** Gameplay randomness in [0, 1): the mission's stream during a mission, the campaign's otherwise. */
export function rnd() { return forced ?? next(active); }
/** A whole number from a to b inclusive. */
export const rndInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
/** One element of a non-empty array. */
export const rndPick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
/** Cosmetic randomness only. Never use this for anything that changes play. */
export const fxRnd = () => Math.random();

export function setCampaignSeed(s: number) { campaign.s = s | 0; }
export const campaignState = () => campaign.s;
/** A mission starts: its rolls come from its own seed until it ends. */
export function beginMission(seed: number) { mission.s = seed | 0; active = mission; }
export function endMission() { active = campaign; }
export const missionState = () => mission.s;
export const inMission = () => active === mission;
/** Tests and the debug panel: make every roll return v (null to stop). */
export function forceRng(v: number | null) { forced = v; }
