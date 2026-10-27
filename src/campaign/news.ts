// The world outside Site-19: real headlines in the monthly report. A few change things for a while.
export type NewsEffect = "armistice" | "sputnik" | "cuba" | "tonkin";
interface Headline { y: number; m: number; text: string; effect?: NewsEffect; note?: string; }

export const NEWS: Headline[] = [
  { y: 1951, m: 9, text: "Japan and the Allies sign the peace treaty in San Francisco." },
  { y: 1952, m: 2, text: "King George VI dies; Elizabeth II is Queen." },
  { y: 1952, m: 11, text: "The United States detonates the first hydrogen bomb at Enewetak Atoll." },
  { y: 1952, m: 11, text: "Eisenhower wins the presidential election." },
  { y: 1953, m: 3, text: "Stalin is dead." },
  { y: 1953, m: 7, text: "An armistice is signed at Panmunjom. The fighting in Korea stops.", effect: "armistice", note: "The Pacific Rim Weather Bureau has money to spare: East Asia's funding is up 10% for a year." },
  { y: 1954, m: 5, text: "Dien Bien Phu falls. The French are finished in Indochina." },
  { y: 1954, m: 5, text: "The Supreme Court rules school segregation unconstitutional." },
  { y: 1955, m: 7, text: "Disneyland opens in Anaheim." },
  { y: 1956, m: 11, text: "Soviet tanks roll into Budapest; the Hungarian uprising is crushed." },
  { y: 1956, m: 11, text: "Britain and France pull out of Suez under American pressure." },
  { y: 1957, m: 10, text: "The Soviets put a satellite in orbit. Sputnik can be heard on any shortwave set.", effect: "sputnik", note: "The space race opens purses: research costs 10% less for a year." },
  { y: 1958, m: 1, text: "Explorer 1, America's first satellite, reaches orbit." },
  { y: 1959, m: 1, text: "Batista flees Cuba. Castro's rebels hold Havana." },
  { y: 1960, m: 5, text: "An American U-2 spy plane is shot down over the Soviet Union; the pilot is alive." },
  { y: 1960, m: 11, text: "Kennedy wins the presidential election." },
  { y: 1961, m: 4, text: "Yuri Gagarin is the first man in space." },
  { y: 1961, m: 4, text: "An invasion of Cuba at the Bay of Pigs fails within three days." },
  { y: 1961, m: 8, text: "East Germany seals the border in Berlin with wire, then concrete." },
  { y: 1962, m: 10, text: "Soviet missiles in Cuba. The world holds its breath for thirteen days.", effect: "cuba", note: "Everyone is watching the skies and the coasts: exposure rises half again as fast in the Eastern US and Latin America for three months." },
  { y: 1963, m: 8, text: "A quarter of a million march on Washington for civil rights." },
  { y: 1963, m: 11, text: "President Kennedy is shot dead in Dallas." },
  { y: 1964, m: 8, text: "Congress passes the Gulf of Tonkin resolution.", effect: "tonkin", note: "Defense money flows: weapons research takes 20% less time from now on." },
  { y: 1964, m: 10, text: "China tests its first atomic bomb." },
  { y: 1965, m: 3, text: "US Marines come ashore at Da Nang." },
  { y: 1967, m: 6, text: "Israel wins a war against its neighbours in six days." },
  { y: 1968, m: 1, text: "The Tet Offensive: fighting in Saigon, and at the US embassy." },
  { y: 1968, m: 4, text: "Martin Luther King Jr. is assassinated in Memphis." },
  { y: 1968, m: 8, text: "Warsaw Pact armies end the Prague Spring." },
  { y: 1969, m: 7, text: "Men walk on the Moon." },
  { y: 1970, m: 5, text: "National Guardsmen fire on students at Kent State." },
];

/** Headlines from a given month (1-12). */
export const newsFor = (y: number, m: number) => NEWS.filter(n => n.y === y && n.m === m);

/** Whether a headline's effect is in force on a date: a year for the armistice and Sputnik, three months for Cuba, for good after Tonkin. */
export function newsActive(date: Date, e: NewsEffect) {
  const h = NEWS.find(n => n.effect === e)!;
  const months = (date.getUTCFullYear() - h.y) * 12 + date.getUTCMonth() + 1 - h.m;
  const length = e === "armistice" || e === "sputnik" ? 12 : e === "cuba" ? 3 : Infinity;
  return months >= 0 && months < length;
}
