// Personnel files: where an operative comes from and a line of who they were before the Foundation,
// and the medals they can earn. Each medal carries a small permanent bonus.

const US = [
  "Scranton, Pennsylvania", "Duluth, Minnesota", "Mobile, Alabama", "Butte, Montana", "Lowell, Massachusetts", "Tulsa, Oklahoma",
  "Gary, Indiana", "Bakersfield, California", "Toledo, Ohio", "Savannah, Georgia", "Pueblo, Colorado", "Wheeling, West Virginia",
  "Galveston, Texas", "Sioux City, Iowa", "Bangor, Maine", "Flagstaff, Arizona", "Yonkers, New York", "Spokane, Washington",
  "San Juan, Puerto Rico", "Honolulu, Hawaii", "Anchorage, Alaska",
];
const COMMONWEALTH = [
  "Hamilton, Ontario", "Winnipeg, Manitoba", "Leeds, England", "Glasgow, Scotland", "Cardiff, Wales", "Belfast, Northern Ireland",
  "Auckland, New Zealand", "Townsville, Australia", "Cape Town, South Africa",
];
// stories that fit anyone, then ones that only fit an American, then ones that only fit someone from Britain or the Commonwealth
const ANY = [
  "Military police in occupied Berlin; first saw something the Foundation wanted hidden in a bombed-out cellar there.",
  "Trained as a physician, never finished. Patches people up anyway.",
  "Grew up on a dairy farm. Can fix any engine with what's lying around.",
  "Former boxer, twenty-two fights, nineteen wins.",
  "A lineman for the telephone company who climbed a pole in a storm and saw what was standing in the field below.",
  "A sharpshooter at a county fair before the war, a sniper during it.",
  "Merchant marine on the Murmansk run. Survived two sinkings.",
  "Signals corps radio operator who heard a voice on a dead frequency and reported it.",
  "Second-generation Foundation: their father was a guard at Site-19 and never came home from a shift.",
  "Combat engineer who cleared mines across North Africa and Italy.",
];
const US_ONLY = [
  "Landed at Omaha Beach with the 29th Infantry. Doesn't talk about it.",
  "Flew thirty missions over Germany as a B-17 waist gunner.",
  "Marine at Okinawa. Came home and couldn't settle at the family hardware store.",
  "A Navy diver who found something on the bottom of Pearl Harbor that wasn't wreckage.",
  "Smokejumper with the Forest Service until a fire in Idaho behaved wrong.",
  "A state trooper who asked too many questions about a missing family, and was offered a job instead.",
  "Served with the Army in Korea until the Chosin Reservoir. Lost two toes to frostbite.",
  "Studied engineering on the GI Bill. Left halfway through without telling anyone why.",
  "Ran bootleg liquor as a teenager; knows every back road in three states.",
  "A deputy sheriff in a town where people kept going missing. The Foundation came, then recruited them.",
  "Paratrooper with the 101st at Bastogne.",
];
const CW_ONLY = [
  "Ex-Royal Marine commando, lent to the Foundation and never sent back.",
  "A Desert Rat with the Eighth Army from El Alamein to Tunis.",
  "Fought with the Chindits behind Japanese lines in Burma.",
  "Served with the Commonwealth Division in Korea, at the Imjin River.",
];

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
/** A hometown and a story that fits it (a little over two in three are American). */
export function rollBio() {
  const us = Math.random() < 0.7;
  return { home: pick(us ? US : COMMONWEALTH), age: 22 + Math.floor(Math.random() * 17), story: pick([...ANY, ...(us ? US_ONLY : CW_ONLY)]) };
}

export type MedalId = "sealed_in" | "iron_nerve" | "purple_heart" | "survivor" | "distinguished";
export const MEDALS: Record<MedalId, { name: string; how: string; bonus: string }> = {
  sealed_in: { name: "Sealed in", how: "Sealed 3 anomalies into their containers.", bonus: "+5 aim against anomalies and their instances." },
  iron_nerve: { name: "Iron nerve", how: "Stared down an anomaly 10 turns in a row without blinking.", bonus: "−2% blink chance." },
  purple_heart: { name: "Purple Heart", how: "Wounded on 3 missions.", bonus: "+1 max HP." },
  survivor: { name: "Survivor", how: "Came back from SCP-106's pocket dimension.", bonus: "+10 max sanity." },
  distinguished: { name: "Distinguished service", how: "Served on 15 missions.", bonus: "+5 aim." },
};
