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

// Rough continent outlines as [longitude, latitude] points, drawn in equirectangular projection.
export const LAND: [number, number][][] = [
  // North and Central America
  [[-168, 66], [-162, 70], [-140, 70], [-125, 72], [-95, 75], [-80, 73], [-62, 66], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-82, 29], [-90, 30], [-97, 26], [-97, 21], [-92, 18], [-88, 21], [-87, 15], [-83, 9], [-79, 9], [-80, 8], [-85, 11], [-92, 15], [-105, 20], [-110, 23], [-115, 30], [-117, 33], [-123, 38], [-124, 46], [-130, 55], [-145, 60], [-155, 58], [-165, 60]],
  // Greenland
  [[-55, 60], [-45, 60], [-20, 70], [-20, 80], [-60, 82], [-72, 78], [-55, 70]],
  // South America
  [[-80, 9], [-75, 11], [-62, 11], [-50, 0], [-35, -5], [-39, -15], [-48, -26], [-58, -38], [-65, -42], [-68, -52], [-72, -53], [-75, -46], [-73, -36], [-71, -18], [-76, -14], [-81, -5], [-80, 1]],
  // Europe and Asia
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [5, 58], [10, 63], [20, 70], [30, 71], [42, 68], [60, 70], [80, 73], [100, 77], [120, 73], [140, 72], [160, 70], [180, 68], [180, 65], [170, 60], [162, 58], [156, 51], [142, 54], [140, 47], [132, 43], [127, 40], [126, 35], [121, 31], [122, 25], [115, 22], [108, 21], [106, 10], [100, 13], [100, 3], [104, 1], [98, 8], [94, 16], [90, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [52, 27], [48, 30], [56, 24], [59, 22], [52, 16], [43, 12], [39, 20], [35, 28], [34, 31], [36, 36], [28, 36], [26, 40], [23, 36], [20, 40], [16, 38], [12, 44], [13, 45], [9, 44], [3, 43], [-1, 37], [-6, 36]],
  // Africa
  [[-17, 21], [-17, 15], [-12, 7], [-8, 4], [5, 6], [9, 4], [10, -2], [13, -12], [12, -18], [15, -27], [18, -34], [26, -34], [33, -27], [35, -20], [40, -15], [40, -5], [43, -1], [51, 11], [43, 12], [37, 19], [33, 31], [25, 32], [20, 31], [10, 37], [0, 36], [-6, 36], [-10, 30], [-16, 25]],
  // Australia
  [[114, -22], [122, -17], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [135, -34], [129, -32], [115, -34]],
  // Britain and Ireland
  [[-5, 50], [1, 51], [2, 53], [-3, 58], [-6, 57], [-5, 54]],
  [[-10, 52], [-6, 52], [-6, 55], [-9, 54]],
  // Japan
  [[130, 31], [135, 34], [141, 38], [142, 45], [140, 41], [136, 36]],
  // Madagascar and the islands of Southeast Asia
  [[44, -25], [47, -25], [50, -15], [49, -12]],
  [[95, 5], [106, -6], [115, -8], [118, 0], [110, 2], [100, 2]],
  [[131, -1], [141, -3], [150, -10], [143, -9], [135, -4]],
];
export const project = (lon: number, lat: number): [number, number] => [lon + 180, 90 - lat];
