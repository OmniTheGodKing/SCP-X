// The campaign's history: a lasting record of what happened, when, and who it touched. The site log is a short
// running feed; this keeps everything, links to incident reports and personnel files, and can be searched.
import type { Campaign } from "./campaign";

export type HistCat = "deployment" | "breach" | "anomaly" | "casualty" | "personnel" | "council" | "insurgency" | "region";
export const HIST_CATS: Record<HistCat, string> = {
  deployment: "Deployments", breach: "Breaches", anomaly: "Anomalies", casualty: "Casualties",
  personnel: "Personnel", council: "O5 Council", insurgency: "Insurgency", region: "Regions",
};
export interface HistEntry { day: number; cat: HistCat; text: string; report?: string; op?: string }
const MAX = 2000;

export function chronicle(c: Campaign, cat: HistCat, text: string, link: { report?: string; op?: string } = {}) {
  (c.history ??= []).push({ day: c.day, cat, text, ...link });
  if (c.history.length > MAX) c.history.shift();
}
