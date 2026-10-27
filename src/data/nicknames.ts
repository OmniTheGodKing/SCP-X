// Nicknames, as a unit hands them out: handed over when an operative makes Corporal, owing nothing to their job and
// usually a little stupid. Changeable on their personnel file.
export const NICKS = [
  "Biscuit", "Tadpole", "Sunshine", "Mumbles", "Lefty", "Noodles", "Taters", "Toast", "Hambone", "Goose",
  "Peaches", "Spuds", "Gravy", "Pickles", "Muffin", "Scooter", "Cupcake", "Wrong Way", "Two Socks", "Cornbread",
  "Meatball", "Bambi", "Nugget", "Sleepy", "Chatty", "Squeaky", "Duck", "Pockets", "Crash", "Tiny",
  "Moose", "Beans", "Waffles", "Skillet", "Buttons", "Ketchup", "Dumbo", "Shorty", "Stretch", "Chef",
  "Radio", "Butterfingers", "Snooze", "Pretzel", "Lumpy", "Hiccup", "Sparrow", "Pork Chop", "Frosty", "Grandpa",
  "Kid", "Rookie", "Professor", "Mouse", "Tank", "Bingo", "Jellybean", "Tumbles", "Mittens", "Gopher",
  "Soapy", "Doughboy", "Mothball", "Cheese", "Blinky", "Popcorn", "Bucket", "Lucky", "Crumbs", "Socks",
];
/** A nickname nobody alive on the roster already has. */
export function pickNick(taken: Set<string>): string {
  const pool = NICKS.filter(n => !taken.has(n));
  const from = pool.length ? pool : NICKS;
  return from[Math.floor(Math.random() * from.length)];
}
/** Given name, nickname in quotes, family name: Robert "Biscuit" Bishop. */
export function withNick(name: string, nick?: string) {
  if (!nick) return name;
  const i = name.indexOf(" ");
  return i < 0 ? `${name} "${nick}"` : `${name.slice(0, i)} "${nick}"${name.slice(i)}`;
}
