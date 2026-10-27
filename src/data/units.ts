// Where Epsilon-11 recruits come from: special forces units around the world, each opening in the year
// it existed, with a small lean that shows in the field (XCOM 2's recruits by way of the 1950s).
export type UnitId = "rangers" | "udt" | "commando" | "sas" | "legion" | "gurkha" | "sbs" | "sf" | "nzsas" | "matkal" | "sasr" | "jaeger" | "seals";
export type Lean = "aim" | "san" | "hp" | "move";
export const LEANS: Record<Lean, string> = { aim: "+6 aim", san: "+15 max sanity", hp: "+1 max HP", move: "+1 move" };

/** `liaison`: only lends people once Allied liaison research is done. */
interface UnitDef { name: string; country: string; from: number; lean: Lean; names: string; homes: string[]; stories: string[]; liaison?: boolean }
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
  legion: { name: "French Foreign Legion paratroopers", country: "France", from: 1951, lean: "san", names: "legion", liaison: true,
    homes: ["Sidi Bel Abbès, Algeria", "Marseille, France", "Lyon, France", "Barcelona, Spain", "Budapest, Hungary"],
    stories: ["Legion paratrooper from Indochina. Joined under a name that wasn't theirs.", "A legionnaire who has already seen what war does to people, and stopped flinching."] },
  gurkha: { name: "Brigade of Gurkhas", country: "Nepal", from: 1951, lean: "san", names: "gurkha", liaison: true,
    homes: ["Gorkha, Nepal", "Pokhara, Nepal", "Dharan, Nepal", "Dehradun, India"],
    stories: ["Gurkha rifleman from the Malayan Emergency. Unshakeable.", "From a family that has served in the Gurkha regiments for three generations."] },
  sbs: { name: "Special Boat Service", country: "United Kingdom", from: 1951, lean: "move", names: "uk",
    homes: ["Poole, England", "Falmouth, England", "Aberdeen, Scotland", "Swansea, Wales"],
    stories: ["SBS canoeist who raided Korean coastal railways from the sea.", "Went in by folding canoe on raids in the Aegean during the war."] },
  sf: { name: "US Army Special Forces", country: "United States", from: 1952, lean: "aim", names: "us",
    homes: ["Fort Bragg, North Carolina", "Spokane, Washington", "Toledo, Ohio", "Pueblo, Colorado"],
    stories: ["One of the first Green Berets of the 10th Special Forces Group.", "Former OSS Jedburgh, now Special Forces."] },
  nzsas: { name: "New Zealand SAS", country: "New Zealand", from: 1955, lean: "aim", names: "anz",
    homes: ["Auckland, New Zealand", "Wellington, New Zealand", "Rotorua, New Zealand"],
    stories: ["New Zealand SAS trooper who served in the Malayan jungle.", "A tracker from the New Zealand SAS who can follow anything that leaves a mark."] },
  matkal: { name: "Sayeret Matkal", country: "Israel", from: 1957, lean: "move", names: "il", liaison: true,
    homes: ["Haifa, Israel", "Tel Aviv, Israel", "Jerusalem, Israel"],
    stories: ["From Sayeret Matkal's first intake. Says very little about it.", "A reconnaissance soldier who crossed borders on foot by night."] },
  sasr: { name: "Australian SAS", country: "Australia", from: 1957, lean: "aim", names: "anz",
    homes: ["Perth, Australia", "Townsville, Australia", "Sydney, Australia"],
    stories: ["Australian SAS from the regiment's first years in Perth.", "Patrolled the Borneo jungle with the Australian SAS."] },
  jaeger: { name: "Danish Jægerkorps", country: "Denmark", from: 1961, lean: "san", names: "dk", liaison: true,
    homes: ["Aalborg, Denmark", "Copenhagen, Denmark", "Aarhus, Denmark"],
    stories: ["Jæger from Denmark's new long-range patrol corps.", "Trained in the Danish winter until the cold stopped mattering."] },
  seals: { name: "US Navy SEALs", country: "United States", from: 1962, lean: "move", names: "us",
    homes: ["Coronado, California", "Little Creek, Virginia", "Mobile, Alabama"],
    stories: ["One of the first SEAL team plank owners.", "A SEAL from the Mekong Delta, hard to surprise."] },
};

const NAMES: Record<string, string[]> = {
  us: ["Callahan", "Rourke", "Dawson", "Whitfield", "Kaminski", "Ortega", "Bishop", "Hollis", "Mercer", "Tanaka", "Jefferson", "Lacroix", "Pruitt", "Navarro", "Keane"],
  uk: ["Ashworth", "Pembroke", "MacLeod", "Fairbairn", "Hartley", "Pryce", "Doyle", "Whitaker", "Stirling", "Carr", "Bowen", "Fraser"],
  legion: ["Moreau", "Reinholt", "Vásquez", "Kovács", "Lefèvre", "Brandt", "Duval", "Petrov", "Santoro", "Abadie"],
  gurkha: ["Gurung", "Rai", "Limbu", "Thapa", "Pun", "Magar", "Tamang", "Rana"],
  anz: ["Ngata", "Harland", "McAlister", "Tupara", "Doherty", "Beaumont", "Kerr", "Walsh"],
  il: ["Ben-Ami", "Levin", "Shapira", "Golan", "Avidan", "Mizrahi"],
  dk: ["Kjær", "Lindholm", "Mortensen", "Rasmussen", "Holm", "Sørensen"],
};

export const QUALITY = [
  { name: "Standard", cost: 100, desc: "" },
  { name: "Veteran", cost: 140, desc: "Arrives as a Private First Class." },
  { name: "Elite", cost: 190, desc: "Arrives as a Private First Class, known for steady nerves." },
];

export interface Candidate { id: string; name: string; unit: UnitId; quality: number; sex: "m" | "f"; aimBase: number; home: string; age: number; story: string; }

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const unitsOpen = (year: number, liaison = false) => (Object.keys(UNITS) as UnitId[]).filter(u => UNITS[u].from <= year && (liaison || !UNITS[u].liaison));

/** A fresh candidate from one of the units recruiting this year. Names already in use are skipped where possible. */
export function rollCandidate(id: string, year: number, used: Set<string>, liaison = false, better = false): Candidate {
  const unit = pick(unitsOpen(year, liaison)), u = UNITS[unit];
  const pool = NAMES[u.names].filter(n => !used.has(n));
  const name = pool.length ? pick(pool) : `${pick(NAMES[u.names])}-${id.slice(-2)}`;
  used.add(name);
  const r = Math.random(), quality = r < (better ? 0.35 : 0.6) ? 0 : r < (better ? 0.8 : 0.9) ? 1 : 2;
  return { id, name, unit, quality, sex: Math.random() < 0.35 ? "f" : "m", aimBase: 62 + Math.floor(Math.random() * 13),
    home: pick(u.homes), age: 22 + Math.floor(Math.random() * 15), story: pick(u.stories) };
}
