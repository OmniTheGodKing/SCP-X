// Difficulty presets (Phase 3K), chosen when a campaign starts. Each one shifts the same handful of levers, so what it
// does is easy to read: starting money, the Council's grant, how many Insurgents turn up and how well they shoot, how
// often anomalies breach, and how fast the Insurgency's agenda grows.
export type Difficulty = "recruit" | "agent" | "director" | "overseer";
export interface DiffDef { name: string; desc: string; funds: number; grant: number; insurgents: number; aim: number; breach: number; agenda: number }
export const DIFFICULTIES: Record<Difficulty, DiffDef> = {
  recruit: { name: "Recruit", desc: "For learning the ropes: more money, fewer and worse-aimed Insurgents, rarer breaches, a slower Insurgency.", funds: 150, grant: 20, insurgents: -1, aim: -5, breach: 0.7, agenda: 0.7 },
  agent: { name: "Agent", desc: "The game as designed.", funds: 0, grant: 0, insurgents: 0, aim: 0, breach: 1, agenda: 1 },
  director: { name: "Director", desc: "Less money, an extra Insurgent in every fight, more breaches, a faster Insurgency.", funds: -100, grant: -15, insurgents: 1, aim: 0, breach: 1.3, agenda: 1.3 },
  overseer: { name: "Overseer", desc: "For veterans: little money, larger and sharper Insurgent teams, frequent breaches, a relentless Insurgency.", funds: -200, grant: -30, insurgents: 1, aim: 5, breach: 1.6, agenda: 1.6 },
};
export const diffOf = (c: { difficulty?: Difficulty }) => DIFFICULTIES[c.difficulty ?? "agent"];
export interface NewCampaignOptions { difficulty: Difficulty; ironman: boolean; tutorial: boolean }
