// The regions the Foundation covers from Site-19, and a simplified map of the Earth.

export type RegionId = "east_us" | "west_us" | "latam" | "europe" | "africa" | "east_asia";

export interface RegionDef {
  name: string;
  front: string;      // the cover company that hides Foundation work there
  travel: number;     // days to reach by C-47 from Site-19
  lon: number;
  lat: number;
  towns: string[];
}

export const HOME: RegionId = "east_us";

export const REGIONS: Record<RegionId, RegionDef> = {
  east_us:   { name: "Eastern United States", front: "Hartwell & Sons Freight", travel: 0, lon: -82, lat: 37, towns: ["Elk Ridge, Pennsylvania", "Harlan Falls, Ohio", "Cole Hollow, West Virginia", "Millbrook, Vermont"] },
  west_us:   { name: "Western United States", front: "Prometheus Mining Co.", travel: 2, lon: -114, lat: 40, towns: ["Dry Wells, Nevada", "Copperton, Arizona", "Wapiti, Montana", "Saltgrass, Utah"] },
  latam:     { name: "Latin America", front: "Compañía Frutera del Sur", travel: 3, lon: -60, lat: -10, towns: ["San Rafael, Guatemala", "Puerto Viejo, Costa Rica", "Itaquera, Brazil", "Villa Alta, Mexico"] },
  europe:    { name: "Western Europe", front: "Albion Insurance Underwriters", travel: 3, lon: 6, lat: 48, towns: ["Ashby St Ledger, England", "Saint-Aubin, France", "Kleinhausen, West Germany", "Brugelette, Belgium"] },
  africa:    { name: "Africa and the Middle East", front: "Trans-Saharan Survey Office", travel: 4, lon: 22, lat: 8, towns: ["Port Sudan", "Kano, Nigeria", "Kolwezi, Belgian Congo", "Aqaba, Jordan"] },
  east_asia: { name: "East Asia", front: "Pacific Rim Weather Bureau", travel: 5, lon: 128, lat: 36, towns: ["Taegu, Korea", "Sasebo, Japan", "Keelung, Taiwan", "Okinawa"] },
};
export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

/** Site-19's location is classified; it is shown somewhere in the eastern United States. */
export const SITE19 = { lon: -78, lat: 40 };

export { LAND } from "./land";
export const project = (lon: number, lat: number): [number, number] => [lon + 180, 90 - lat];
