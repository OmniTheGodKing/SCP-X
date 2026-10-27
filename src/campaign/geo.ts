// The Geoscape: where everything on the World Map sits, what state it's in, and what the player knows about it.
// Incidents are placed at the town they happened in (or at Site-19 for anything inside the site); independent
// Foundation facilities are shown too, but Site-19 is the only one the player runs.
import { REGIONS, SITE19, type RegionId } from "../data/regions";
import { has } from "./research";
import { travelDays } from "./world";
import { scpName } from "./containment";
import { mtfArrival, raidArrival } from "./security";
import { MISSION_BONUS, dateText, type Campaign, type Incident } from "./campaign";

/** Where each town is (fictional towns placed in their real regions). */
export const TOWN_POS: Record<string, [number, number]> = {
  "Elk Ridge, Pennsylvania": [-77.5, 41], "Harlan Falls, Ohio": [-82.5, 40.2], "Cole Hollow, West Virginia": [-81, 38.3], "Millbrook, Vermont": [-72.7, 44],
  "Dry Wells, Nevada": [-116.5, 38.5], "Copperton, Arizona": [-111.5, 34], "Wapiti, Montana": [-110.5, 46.5], "Saltgrass, Utah": [-112.5, 40.5],
  "San Rafael, Guatemala": [-90.5, 15], "Puerto Viejo, Costa Rica": [-82.8, 9.7], "Itaquera, Brazil": [-46.5, -23.5], "Villa Alta, Mexico": [-96.2, 17.3],
  "Ashby St Ledger, England": [-1.2, 52.3], "Saint-Aubin, France": [0.5, 48], "Kleinhausen, West Germany": [9, 50], "Brugelette, Belgium": [3.85, 50.6],
  "Port Sudan": [37.2, 19.6], "Kano, Nigeria": [8.5, 12], "Kolwezi, Belgian Congo": [25.5, -10.7], "Aqaba, Jordan": [35, 29.5],
  "Taegu, Korea": [128.6, 35.9], "Sasebo, Japan": [129.7, 33.2], "Keelung, Taiwan": [121.7, 25.1], "Okinawa": [127.8, 26.3],
};

/** Other Foundation facilities: independent, with their own staff and command. Shown for context; calls for help
 *  from them arrive in Phase 3J. */
export const FACILITIES_WORLD = [
  { id: "site17", name: "Site-17", region: "west_us" as RegionId, lon: -105, lat: 39, desc: "Holds Safe and Euclid humanoid anomalies. Takes Site-19's anomalies for safekeeping in an emergency." },
  { id: "site23", name: "Site-23", region: "europe" as RegionId, lon: 10.5, lat: 60, desc: "A northern European containment site." },
  { id: "area12", name: "Area-12", region: "east_asia" as RegionId, lon: 139, lat: 36, desc: "A Pacific research and storage area." },
];

/** Where an incident is: its town if the title names one, Site-19 for anything inside the site, else the region. */
export function incidentPlace(inc: Incident): { name: string; lon: number; lat: number } {
  if (inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid") return { name: "Site-19", ...SITE19 };
  const town = REGIONS[inc.region].towns.find(t => inc.title.includes(t.split(",")[0]));
  if (town && TOWN_POS[town]) return { name: town, lon: TOWN_POS[town][0], lat: TOWN_POS[town][1] };
  // no town in the title: a fixed spot near the middle of the region, offset by the incident id
  const d = REGIONS[inc.region], h = [...inc.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return { name: d.name, lon: d.lon + ((h % 9) - 4) * 1.5, lat: d.lat + (((h >> 4) % 7) - 3) * 1.2 };
}

export type MarkerGroup = "anomaly" | "insurgency" | "coverup" | "site";
export const groupOf = (inc: Incident): MarkerGroup =>
  inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid" ? "site"
  : inc.kind === "coverup" ? "coverup"
  : inc.kind === "strike" || inc.kind === "retaliation" || inc.kind === "escort" ? "insurgency" : "anomaly";

/** In progress, urgent (now, or the window closes within 2 days), new (appeared in the last 2 days) or open. */
export function incidentState(c: Campaign, inc: Incident): "active" | "urgent" | "new" | "open" {
  if (c.activeIncident === inc.id) return "active";
  if (inc.expires - c.day <= 2) return "urgent";
  if (c.day - inc.appeared <= 2) return "new";
  return "open";
}

/** What the player knows about an incident, what they don't, and what's at stake, for the briefing panel. */
export function briefing(c: Campaign, inc: Incident) {
  const place = incidentPlace(inc), t = inc.kind === "escort" ? 0 : travelDays(c, inc.region);
  const left = inc.expires - c.day, immediate = inc.kind === "breach" || inc.kind === "riot" || inc.kind === "raid" || inc.kind === "escort";
  const ins = Math.max(0, inc.insurgents - (inc.weakened ?? 0));
  const known: string[] = [], unknown: string[] = [];
  // opposition: exact with codebooks, otherwise only a rough report
  if (inc.kind === "outbreak") known.push("No Insurgents expected; SCP-610 instances and spreading flesh.");
  else if (inc.kind === "riot") known.push("Rioting D-Class, unarmed.");
  else if (has(c, "codebooks") || inc.kind === "raid") known.push(`${ins} Insurgents${inc.kind === "raid" ? " at the wire" : ""}.`);
  else if (ins) unknown.push(`Insurgent numbers: reports say ${ins >= 4 ? "heavy" : ins >= 2 ? "some" : "light"} activity (Insurgency codebooks research gives exact counts).`);
  else known.push("No Insurgency activity reported.");
  // the anomaly
  if (inc.scpId && !inc.first) known.push(`Anomaly: ${scpName(inc.scpId)}.`);
  else if (inc.first) unknown.push("Anomaly: unidentified. Witnesses describe something new.");
  if (inc.witnesses) known.push(`${inc.witnesses} witnesses to dose.`);
  if (inc.civilians) known.push(`${inc.civilians} civilians in the area.`);
  const bonus = MISSION_BONUS[inc.kind] ?? 0;
  const rewards = [bonus ? `$${bonus}k from the O5 Council` : "", inc.kind === "coverup" ? "−10 exposure here" : inc.kind === "riot" || inc.kind === "raid" ? "" : "−5 exposure here",
    inc.kind === "strike" || inc.kind === "retaliation" || inc.kind === "raid" ? "captured Insurgent weapons and prisoners for research" : "",
    inc.first ? "a new anomaly for Site-19 to hold and study" : "", inc.kind === "outbreak" ? "SCP-610 burned back a stage" : ""].filter(Boolean);
  const ignore = inc.kind === "breach" ? "Site Security faces it alone; it may escape or wreck neighbouring facilities."
    : inc.kind === "riot" ? "Leave it to the guards: a few D-Class die."
    : inc.kind === "raid" ? "Leave it to the guards; if they lose, prisoners go free or the payroll is taken and a building is wrecked."
    : inc.kind === "escort" ? "The convoy is lost with its cargo."
    : inc.kind === "coverup" ? "The story gets out: +12 exposure here."
    : inc.kind === "retaliation" ? "People die in the streets: +12 exposure here."
    : inc.kind === "strike" ? "The cell moves on; the Intel spent to find it is wasted."
    : inc.kind === "outbreak" ? "SCP-610 keeps spreading: more exposure every week and a worse stage every two weeks."
    : inc.first ? "It moves on (+10 exposure here) and turns up somewhere else later."
    : "It goes dark again (+15 exposure here) and resurfaces later.";
  const arrivalTurn = inc.kind === "breach" ? mtfArrival(c, inc) : inc.kind === "raid" ? raidArrival(c) : 0;
  return {
    place, travel: t, arrives: c.day + t, deadline: immediate ? "Now" : left <= 0 ? "Last day" : `${dateText(inc.expires)} (${left} day${left === 1 ? "" : "s"})`,
    reachable: inc.kind === "escort" || c.day + t <= inc.expires, known, unknown, rewards, ignore,
    arrival: arrivalTurn ? `Epsilon-11 reaches the scene on turn ${arrivalTurn}.` : t ? `The team lands ${dateText(c.day + t)} after ${t} day${t > 1 ? "s" : ""} in the air.` : "The team goes by road and is there the same day.",
  };
}
