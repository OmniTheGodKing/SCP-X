// Full names for operatives and guards: a given name and a family name from the same culture, in that culture's
// usual order and forms (Gurkha given names with Bahadur and Kumari, Dutch family names with "de" and "van").
export type Culture = "us" | "uk" | "maori" | "fr" | "es" | "hu" | "de" | "it" | "gurkha" | "il" | "dk" | "nl" | "ph" | "be" | "no"
  | "se" | "pl" | "cz" | "ru" | "pt" | "ng" | "za" | "lb" | "pk";

interface Pool { family: string[]; m: string[]; f: string[] }
export const CULTURES: Record<Culture, Pool> = {
  us: { family: ["Callahan", "Rourke", "Dawson", "Whitfield", "Kaminski", "Ortega", "Bishop", "Hollis", "Mercer", "Tanaka", "Jefferson", "Lacroix", "Pruitt", "Navarro", "Keane"],
    m: ["James", "Robert", "William", "Walter", "Frank", "Harold", "Eugene", "Raymond", "Joseph", "Thomas", "Charles", "Earl"],
    f: ["Dorothy", "Betty", "Helen", "Margaret", "Ruth", "Evelyn", "Jean", "Frances", "Virginia", "Alice", "Lorraine", "June"] },
  uk: { family: ["Ashworth", "Pembroke", "MacLeod", "Fairbairn", "Hartley", "Pryce", "Doyle", "Whitaker", "Stirling", "Carr", "Bowen", "Fraser"],
    m: ["Arthur", "Alan", "Kenneth", "Derek", "Ronald", "Ian", "Colin", "Hugh", "Geoffrey", "Dennis"],
    f: ["Joan", "Margaret", "Patricia", "Brenda", "Sheila", "Eileen", "Audrey", "Doreen"] },
  maori: { family: ["Ngata", "Tupara", "Te Rangi", "Parata"], m: ["Wiremu", "Hemi", "Rawiri", "Tamati"], f: ["Aroha", "Mere", "Huia", "Ngaire"] },
  fr: { family: ["Moreau", "Lefèvre", "Duval", "Abadie", "Garnier", "Roussel"], m: ["Jean", "Pierre", "Michel", "André", "Lucien", "Henri"], f: ["Jeanne", "Simone", "Colette", "Odette", "Yvonne"] },
  es: { family: ["Vásquez", "Ortiz", "Castellanos", "Serrano", "Reyes", "Molina"], m: ["José", "Antonio", "Manuel", "Francisco", "Joaquín"], f: ["Carmen", "Dolores", "Pilar", "Mercedes", "Rosario"] },
  hu: { family: ["Kovács", "Szabó", "Horváth", "Nagy", "Varga"], m: ["László", "István", "Ferenc", "Sándor", "Gábor"], f: ["Erzsébet", "Katalin", "Ilona", "Éva"] },
  de: { family: ["Reinholt", "Brandt", "Weber", "Hoffmann", "Krüger"], m: ["Klaus", "Werner", "Dieter", "Helmut", "Günter"], f: ["Ursula", "Hildegard", "Gisela", "Ingeborg"] },
  it: { family: ["Santoro", "Ricci", "Marino", "Greco", "Esposito"], m: ["Giuseppe", "Salvatore", "Vincenzo", "Mario", "Antonio"], f: ["Giulia", "Rosa", "Teresa", "Anna"] },
  gurkha: { family: ["Gurung", "Rai", "Limbu", "Thapa", "Pun", "Magar", "Tamang", "Rana"],
    m: ["Dil Bahadur", "Lal Bahadur", "Gyan Bahadur", "Man Bahadur", "Tek Bahadur", "Bhim Bahadur"], f: ["Sita Kumari", "Maya Kumari", "Devi Kumari", "Laxmi Kumari"] },
  il: { family: ["Ben-Ami", "Levin", "Shapira", "Golan", "Avidan", "Mizrahi"], m: ["Avraham", "Yosef", "Uri", "Moshe", "Eitan", "Dov"], f: ["Miriam", "Tova", "Rina", "Yael", "Leah"] },
  dk: { family: ["Kjær", "Lindholm", "Mortensen", "Rasmussen", "Holm", "Sørensen"], m: ["Jens", "Søren", "Niels", "Henrik", "Poul"], f: ["Karen", "Inge", "Birgitte", "Lone", "Grethe"] },
  nl: { family: ["de Vries", "Bakker", "Visser", "Smit", "Mulder", "van Dijk", "Achterberg"], m: ["Johannes", "Pieter", "Hendrik", "Willem", "Cornelis"], f: ["Anna", "Maria", "Johanna", "Wilhelmina"] },
  ph: { family: ["Santos", "Bautista", "Ocampo", "Mendoza", "Aquino", "Villanueva"], m: ["Jose", "Ramon", "Eduardo", "Rogelio", "Benigno"], f: ["Corazon", "Maria", "Imelda", "Rosario", "Luzviminda"] },
  be: { family: ["Dubois", "Peeters", "Janssens", "Lambert", "Claes", "Wouters"], m: ["Jean", "Marcel", "Joseph", "Albert", "Willy"], f: ["Marie", "Jeanne", "Simone", "Paula", "Germaine"] },
  no: { family: ["Hansen", "Johansen", "Berg", "Haugen", "Dahl", "Solberg"], m: ["Ole", "Knut", "Arne", "Bjørn", "Sverre"], f: ["Ingrid", "Astrid", "Solveig", "Kari", "Liv"] },
  se: { family: ["Lindqvist", "Lundgren", "Ekström"], m: ["Lars", "Erik", "Gunnar", "Sven"], f: ["Karin", "Astrid", "Birgitta"] },
  pl: { family: ["Kowalski", "Kowalczyk", "Ostrowski", "Zielinski"], m: ["Stanisław", "Jan", "Tadeusz", "Józef"], f: ["Zofia", "Halina", "Irena"] },
  cz: { family: ["Novak", "Dvořák"], m: ["Jan", "Pavel", "Josef", "Karel"], f: ["Marie", "Hana", "Věra"] },
  ru: { family: ["Petrov", "Morozov", "Volkov"], m: ["Ivan", "Nikolai", "Sergei", "Mikhail"], f: ["Olga", "Natalia", "Tatiana", "Vera"] },
  pt: { family: ["Duarte", "Ferreira"], m: ["João", "Manuel", "António"], f: ["Maria", "Ana", "Isabel"] },
  ng: { family: ["Okafor", "Nwosu", "Abara"], m: ["Chukwuemeka", "Obinna", "Nnamdi", "Ikenna"], f: ["Ngozi", "Adaeze", "Chiamaka", "Nkechi"] },
  za: { family: ["Mbeki"], m: ["Thabo", "Sipho", "Mandla"], f: ["Nomvula", "Thandiwe", "Zodwa"] },
  lb: { family: ["Haddad"], m: ["Elias", "Karim", "Fouad"], f: ["Layla", "Nadia", "Samira"] },
  pk: { family: ["Iqbal"], m: ["Muhammad", "Imran", "Tariq"], f: ["Ayesha", "Fatima", "Zainab"] },
};

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
/** The family name: the last word, keeping particles like "de" or "van" and compound Gurkha given names out of it. */
export const familyOf = (name: string) => {
  const words = name.trim().split(/\s+/);
  const i = words.findIndex((w, k) => k > 0 && /^(de|van|Te|Ben-Ami)$/.test(w));
  return i > 0 ? words.slice(i).join(" ") : words[words.length - 1];
};

/** A fresh full name from a culture, avoiding family names already in use where it can. */
export function fullName(culture: Culture, sex: "m" | "f", used: Set<string>): string {
  const p = CULTURES[culture], fresh = p.family.filter(f => !used.has(f));
  const family = fresh.length ? pick(fresh) : pick(p.family);
  used.add(family);
  return `${pick(sex === "f" ? p.f : p.m)} ${family}`;
}

/** Which culture a bare family name belongs to (for giving older surname-only records a given name). */
export function cultureOfFamily(family: string): Culture {
  for (const [k, p] of Object.entries(CULTURES) as [Culture, Pool][]) if (p.family.includes(family)) return k;
  if (/ova$/.test(family)) return "ru";
  return "us";
}
/** A surname-only name with a fitting given name added; the same seed always gives the same given name. */
export function withGivenName(name: string, sex: "m" | "f", seed: string): string {
  if (/\s/.test(name.trim())) return name;
  const p = CULTURES[cultureOfFamily(name)], list = sex === "f" ? p.f : p.m;
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${list[h % list.length]} ${name}`;
}
