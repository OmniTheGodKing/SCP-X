// Weather: each region's sky changes every day or two, by season and climate. Outdoors it costs sight (and more),
// adding to the night penalty; indoor maps are unaffected. Storms can hold a flight back a day.
import type { RegionId } from "./regions";

export type Weather = "clear" | "rain" | "storm" | "fog" | "snow";
export interface WeatherDef { name: string; sight: number; desc: string }
/** Phase 4I: how far anyone sees in this weather (clear daylight is the whole map). */
export const WEATHER_SIGHT: Record<string, number> = { clear: 60, rain: 14, storm: 10, fog: 6, snow: 12 };
export const WEATHER: Record<Weather, WeatherDef> = {
  clear: { name: "Clear", sight: 0, desc: "No effect." },
  rain: { name: "Rain", sight: 2, desc: "Nobody sees farther than 14 tiles; fires burn out a turn sooner and spread less." },
  storm: { name: "Storm", sight: 3, desc: "Nobody sees farther than 10 tiles, and shots past 5 tiles take −10 aim; the noise covers gunfire, so firing doesn't break concealment. Flights there take a day longer." },
  fog: { name: "Fog", sight: 4, desc: "Nobody sees farther than 6 tiles, and Insurgents only notice the team from 2 tiles closer." },
  snow: { name: "Snow", sight: 1, desc: "Nobody sees farther than 12 tiles, and everyone moves 1 tile less." },
};

type Odds = Partial<Record<Weather, number>>;
const season = (month: number) => month === 11 || month <= 1 ? "winter" : month >= 5 && month <= 7 ? "summer" : "mild";
/** The chances of each kind of weather in a region in a month (0 = January). */
function climate(r: RegionId, month: number): Odds {
  const s = season(month);
  switch (r) {
    case "east_us": return s === "winter" ? { clear: .45, snow: .25, rain: .15, fog: .1, storm: .05 } : s === "summer" ? { clear: .6, rain: .15, storm: .2, fog: .05 } : { clear: .55, rain: .25, fog: .1, storm: .1 };
    case "west_us": return s === "winter" ? { clear: .55, snow: .25, rain: .1, fog: .1 } : { clear: .75, rain: .1, storm: .1, fog: .05 };
    case "latam": return month >= 4 && month <= 9 ? { clear: .35, rain: .35, storm: .25, fog: .05 } : { clear: .7, rain: .15, storm: .05, fog: .1 };
    case "europe": return s === "winter" ? { clear: .3, rain: .25, fog: .25, snow: .15, storm: .05 } : { clear: .45, rain: .3, fog: .2, storm: .05 };
    case "africa": return month >= 5 && month <= 8 ? { clear: .5, rain: .25, storm: .2, fog: .05 } : { clear: .85, rain: .05, fog: .1 };
    case "east_asia": return month >= 5 && month <= 8 ? { clear: .3, rain: .35, storm: .3, fog: .05 } : s === "winter" ? { clear: .5, snow: .2, rain: .1, fog: .1, storm: .1 } : { clear: .55, rain: .25, fog: .1, storm: .1 };
  }
}
export function rollWeather(r: RegionId, month: number): Weather {
  let x = Math.random();
  for (const [w, p] of Object.entries(climate(r, month)) as [Weather, number][]) { if ((x -= p) < 0) return w; }
  return "clear";
}
