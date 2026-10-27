import type { TraitId } from "./classes";
import { fullName, type Culture } from "./names";

// Where Epsilon-11 recruits come from: special forces units around the world, each opening in the year
// it existed, with a small lean that shows in the field (XCOM 2's recruits by way of the 1950s).
export type UnitId = "rangers" | "udt" | "commando" | "sas" | "legion" | "gurkha" | "sbs" | "sf" | "nzsas" | "matkal" | "sasr" | "jaeger" | "seals"
  | "kct" | "scoutrangers" | "paracdo" | "mjk";
export type Lean = "aim" | "san" | "hp" | "move";
export const LEANS: Record<Lean, string> = { aim: "+6 aim", san: "+15 max sanity", hp: "+1 max HP", move: "+1 move" };

/** `liaison`: an allied unit that only lends people once the Allied liaison office is researched. */
interface UnitDef { name: string; country: string; from: number; lean: Lean; names: Culture; homes: string[]; stories: string[]; liaison?: boolean }
export const UNITS: Record<UnitId, UnitDef> = {
  rangers: { name: "US Army Rangers", country: "United States", from: 1951, lean: "hp", names: "us",
    homes: ["Columbus, Georgia", "Butte, Montana", "Scranton, Pennsylvania", "Tulsa, Oklahoma", "Mobile, Alabama"],
    stories: ["Fought with a Ranger company in Korea before the companies were disbanded.", "A Ranger who walked out of a night raid in Korea carrying two men."] },
  udt: { name: "Navy Underwater Demolition Teams", country: "United States", from: 1951, lean: "move", names: "us",
    homes: ["San Diego, California", "Norfolk, Virginia", "Galveston, Texas", "Honolulu, Hawaii"],
    stories: ["A frogman who cleared beach obstacles at Inchon.", "UDT swimmer who mapped Korean harbours by night."] },
  commando: { name: "Royal Marines Commandos", country: "United Kingdom", from: 1951, lean: "hp", names: "uk",
    homes: ["Plymouth, England", "Portsmouth, England", "Glasgow, Scotland", "Cardiff, Wales"],
    stories: ["41 Commando, with the Americans at the Chosin Reservoir.", "A commando from the Malayan jungle, lent to the Foundation and never sent back."] },
  sas: { name: "Special Air Service", country: "United Kingdom", from: 1951, lean: "aim", names: "uk",
    homes: ["Hereford, England", "Leeds, England", "Belfast, Northern Ireland", "Inverness, Scotland"],
    stories: ["Malayan Scouts: months in the jungle hunting insurgent camps.", "Served with the SAS in occupied Europe, then again in Malaya."] },
  legion: { name: "French Foreign Legion paratroopers", country: "France", from: 1951, lean: "san", names: "fr",
    homes: ["Sidi Bel Abbès, Algeria", "Marseille, France", "Lyon, France", "Barcelona, Spain", "Budapest, Hungary", "Stuttgart, West Germany", "Naples, Italy"],
    stories: ["Legion paratrooper from Indochina. Joined under a name that wasn't theirs.", "A legionnaire who has already seen what war does to people, and stopped flinching."] },
  gurkha: { name: "Brigade of Gurkhas", country: "Nepal", from: 1951, lean: "san", names: "gurkha",
    homes: ["Gorkha, Nepal", "Pokhara, Nepal", "Dharan, Nepal", "Dehradun, India"],
    stories: ["Gurkha rifleman from the Malayan Emergency. Unshakeable.", "From a family that has served in the Gurkha regiments for three generations."] },
  sbs: { name: "Special Boat Service", country: "United Kingdom", from: 1951, lean: "move", names: "uk",
    homes: ["Poole, England", "Falmouth, England", "Aberdeen, Scotland", "Swansea, Wales"],
    stories: ["SBS canoeist who raided Korean coastal railways from the sea.", "Went in by folding canoe on raids in the Aegean during the war."] },
  sf: { name: "US Army Special Forces", country: "United States", from: 1952, lean: "aim", names: "us",
    homes: ["Fort Bragg, North Carolina", "Spokane, Washington", "Toledo, Ohio", "Pueblo, Colorado"],
    stories: ["One of the first Green Berets of the 10th Special Forces Group.", "Former OSS Jedburgh, now Special Forces."] },
  nzsas: { name: "New Zealand SAS", country: "New Zealand", from: 1955, lean: "aim", names: "uk",
    homes: ["Auckland, New Zealand", "Wellington, New Zealand", "Rotorua, New Zealand"],
    stories: ["New Zealand SAS trooper who served in the Malayan jungle.", "A tracker from the New Zealand SAS who can follow anything that leaves a mark."] },
  matkal: { name: "Sayeret Matkal", country: "Israel", from: 1957, lean: "move", names: "il",
    homes: ["Haifa, Israel", "Tel Aviv, Israel", "Jerusalem, Israel"],
    stories: ["From Sayeret Matkal's first intake. Says very little about it.", "A reconnaissance soldier who crossed borders on foot by night."] },
  sasr: { name: "Australian SAS", country: "Australia", from: 1957, lean: "aim", names: "uk",
    homes: ["Perth, Australia", "Townsville, Australia", "Sydney, Australia"],
    stories: ["Australian SAS from the regiment's first years in Perth.", "Patrolled the Borneo jungle with the Australian SAS."] },
  jaeger: { name: "Danish Jægerkorps", country: "Denmark", from: 1961, lean: "san", names: "dk",
    homes: ["Aalborg, Denmark", "Copenhagen, Denmark", "Aarhus, Denmark"],
    stories: ["Jæger from Denmark's new long-range patrol corps.", "Trained in the Danish winter until the cold stopped mattering."] },
  // allied units opened by the Allied liaison office
  kct: { name: "Korps Commandotroepen", country: "Netherlands", from: 1951, lean: "aim", names: "nl", liaison: true,
    homes: ["Roosendaal, Netherlands", "Rotterdam, Netherlands", "Utrecht, Netherlands", "Groningen, Netherlands"],
    stories: ["A Dutch commando back from the fighting in Indonesia.", "Trained at Roosendaal; one of the green berets of the Korps Commandotroepen."] },
  scoutrangers: { name: "Philippine Scout Rangers", country: "Philippines", from: 1951, lean: "move", names: "ph", liaison: true,
    homes: ["Manila, Philippines", "Cebu City, Philippines", "Baguio, Philippines", "Davao, Philippines"],
    stories: ["Scout Ranger who hunted Huk guerrillas through the Luzon jungle in five-man teams.", "Moves through jungle without leaving a trail; the Scout Rangers taught them how."] },
  paracdo: { name: "Belgian Paracommandos", country: "Belgium", from: 1952, lean: "hp", names: "be", liaison: true,
    homes: ["Brussels, Belgium", "Antwerp, Belgium", "Liège, Belgium", "Namur, Belgium"],
    stories: ["Fought with the Belgian volunteer battalion in Korea, then joined the Paracommandos.", "Para-commando from the jump school at Schaffen."] },
  mjk: { name: "Norwegian Marinejegerkommandoen", country: "Norway", from: 1953, lean: "san", names: "no", liaison: true,
    homes: ["Bergen, Norway", "Tromsø, Norway", "Stavanger, Norway", "Trondheim, Norway"],
    stories: ["Naval commando trained in the fjords through the Arctic winter.", "Their father ran agents to occupied Norway on the Shetland Bus; they joined the naval commandos."] },
  seals: { name: "US Navy SEALs", country: "United States", from: 1962, lean: "move", names: "us",
    homes: ["Coronado, California", "Little Creek, Virginia", "Mobile, Alabama"],
    stories: ["One of the first SEAL team plank owners.", "A SEAL from the Mekong Delta, hard to surprise."] },
};


export const QUALITY = [
  { name: "Standard", cost: 100, desc: "" },
  { name: "Veteran", cost: 140, desc: "Arrives as a Private First Class." },
  { name: "Elite", cost: 190, desc: "Arrives as a Private First Class." },
];

/** Countries by the last part of a hometown ("Butte, Montana" is in the United States). */
const COUNTRY: Record<string, string> = { England: "United Kingdom", Scotland: "United Kingdom", Wales: "United Kingdom", "Northern Ireland": "United Kingdom",
  Algeria: "France (Algeria)", India: "Nepal" };
const US_STATES = /Georgia|Montana|Pennsylvania|Oklahoma|Alabama|California|Virginia|Texas|Hawaii|North Carolina|Washington|Ohio|Colorado/;
export const nationalityOf = (home: string) => { const last = home.split(", ").pop()!; return US_STATES.test(last) ? "United States" : COUNTRY[last] ?? last; };
/** The naming culture for a candidate: the unit's, except Legionnaires, who are named for where they came from. */
const LEGION_HOMES: Record<string, Culture> = { Spain: "es", Hungary: "hu", "West Germany": "de", Italy: "it" };
const ANZ = ["Auckland", "Wellington", "Rotorua"];
function cultureFor(unit: UnitId, home: string): Culture {
  const last = home.split(", ").pop()!;
  if (unit === "legion") return LEGION_HOMES[last] ?? "fr";
  if ((unit === "nzsas") && ANZ.some(t => home.startsWith(t)) && Math.random() < 0.4) return "maori";
  return UNITS[unit].names;
}

export interface Candidate { id: string; name: string; nationality: string; unit: UnitId; quality: number; sex: "m" | "f"; aimBase: number; home: string; age: number; story: string;
  /** Some candidates come with a trait already, good or bad, shown before you hire them. */
  trait?: TraitId; }
/** Traits a candidate can bring with them (a quarter of candidates have one). */
const START_TRAITS: TraitId[] = ["steady", "hardened", "steady", "twitchy", "nightmares"];

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const unitsOpen = (year: number, liaison = false) => (Object.keys(UNITS) as UnitId[]).filter(u => UNITS[u].from <= year && (liaison || !UNITS[u].liaison));

/** A fresh candidate from one of the units recruiting this year. Family names already in use are skipped where possible. */
export function rollCandidate(id: string, year: number, used: Set<string>, liaison = false, better = false): Candidate {
  const unit = pick(unitsOpen(year, liaison)), u = UNITS[unit];
  const sex: "m" | "f" = Math.random() < 0.35 ? "f" : "m", home = pick(u.homes);
  const r = Math.random(), quality = r < (better ? 0.35 : 0.6) ? 0 : r < (better ? 0.8 : 0.9) ? 1 : 2;
  return { id, name: fullName(cultureFor(unit, home), sex, used), nationality: nationalityOf(home), unit, quality, sex, aimBase: 62 + Math.floor(Math.random() * 13),
    home, age: 22 + Math.floor(Math.random() * 15), story: pick(u.stories),
    trait: quality === 2 ? "steady" : Math.random() < 0.25 ? pick(START_TRAITS) : undefined };
}
