import type { MapDef } from "../core/grid";

// Heavy Containment Zone, wing C: three north rooms, a long corridor, and three south rooms.
// The transport container sits at the dock in the southwest staging room, open to the north.
export const WING_C: MapDef = {
  reinforced: true,
  name: "Heavy Containment Zone, wing C",
  rows: [
    "############################",
    "#....h....#.......#........#",
    "#.........#...H...#..hh....#",
    "#..h...h..+.......+........#",
    "#.........#...H...#....h...#",
    "#....hh...#.......#........#",
    "###+########W#+#W#####+#####",
    "#..........................#",
    "#..H...h........H......h...#",
    "#.....................H....#",
    "#....h.....h...............#",
    "###+######+####+########+###",
    "#........#.......#.........#",
    "#..hh....#...h...p...H.....#",
    "#........+.......+.........#",
    "#CCCS..H.#...h...p..hh.....#",
    "#CCCS...E#.......#.........#",
    "############################",
  ],
  area(x, y) {
    if (y <= 5) return x <= 9 ? "west office" : x <= 17 ? "containment cell" : "east lab";
    if (y <= 10) return "main corridor";
    return x <= 8 ? "staging room" : x <= 16 ? "records room" : "canteen";
  },
  squadSpawns: [[2, 12], [4, 12], [6, 14], [7, 12]],
  scpRooms: [[1, 1, 9, 5], [11, 1, 17, 5], [19, 1, 26, 5]],
  insurgentRooms: [[19, 1, 26, 5], [18, 12, 26, 16], [1, 1, 9, 5]],
  strayRooms: [[1, 1, 9, 5], [11, 1, 17, 5], [19, 1, 26, 5], [10, 12, 16, 16], [18, 12, 26, 16]],
  hatch: [26, 1],
  panel: [26, 7],
};

// Field maps for missions outside Site-19. Edge tiles marked E are where civilians run.
// A truck's open cargo box stands in for the transport container on the town and farm maps.
export const TOWN: MapDef = {
  name: "Main Street",
  rows: [
    "############################",
    "#....h..#......#...h...h...#",
    "#.......#..H...#...........#",
    "#..h....+......+....hh.....#",
    "#.......#......#...........#",
    "###+#w####+##w######+###w###",
    "E..........................E",
    "E...hh.........hh..........E",
    "E..........H...............E",
    "E.........hh.........hh....E",
    "E..........................E",
    "##w#+####w###+#w###.......##",
    "#.......#.......#..........#",
    "#..hh...#...h...#....H.....#",
    "#.......+.......+....SCCCS.#",
    "#..h..H.#...h...#....SCCCS.#",
    "#.......#.......#....SSSSS.#",
    "############################",
  ],
  area(x, y) {
    if (y <= 4) return x <= 7 ? "diner" : x <= 15 ? "general store" : "church hall";
    if (y <= 10) return "Main Street";
    return x <= 7 ? "garage" : x <= 16 ? "houses" : "truck lot";
  },
  squadSpawns: [[1, 7], [2, 8], [1, 9], [3, 10]],
  scpRooms: [[9, 1, 14, 4], [16, 1, 26, 4], [9, 12, 15, 16]],
  insurgentRooms: [[16, 1, 26, 4], [1, 12, 7, 16], [17, 12, 26, 13]],
  strayRooms: [[1, 1, 7, 4], [9, 1, 14, 4], [16, 1, 26, 4], [4, 6, 24, 10], [9, 12, 15, 16], [1, 12, 7, 16]],
};

export const FARM: MapDef = {
  name: "Farmstead",
  rows: [
    "############################",
    "E....h........h............E",
    "E.........................hE",
    "E..##w###+###w##...........E",
    "E..#...........#....hh.....E",
    "E..#..h....h...+...........E",
    "E..#...........#...........E",
    "E..####+###w##w#......H....E",
    "E..........................E",
    "E....hh.........#####+####.E",
    "E...............#........#.E",
    "E..H............+...hh...#.E",
    "E...............#........#.E",
    "E....SCCCS......##########.E",
    "E....SCCCS.................E",
    "E....SSSSS......hh.........E",
    "E..........................E",
    "############################",
  ],
  area(x, y) {
    if (x >= 3 && x <= 15 && y >= 3 && y <= 7) return "farmhouse";
    if (x >= 16 && x <= 25 && y >= 9 && y <= 13) return "barn";
    return y <= 8 ? "north field" : "south field";
  },
  squadSpawns: [[10, 15], [11, 16], [12, 15], [13, 16]],
  scpRooms: [[4, 4, 14, 6], [17, 10, 24, 12], [18, 1, 26, 6]],
  insurgentRooms: [[18, 1, 26, 6], [1, 8, 10, 12], [17, 10, 24, 12]],
  strayRooms: [[4, 4, 14, 6], [17, 10, 24, 12], [1, 1, 26, 2], [1, 8, 14, 12]],
};

export const PORT: MapDef = {
  name: "Port warehouse",
  rows: [
    "############################",
    "#..........#...............#",
    "#..H....H..#...H.....H.....#",
    "#..........+...............#",
    "#..hh..hh..#...hh....hh....#",
    "#..........#...............#",
    "##+##w##w###...............#",
    "#..........######+##########",
    "#..H...........h...........E",
    "#..........................E",
    "#....hh.........H....hh....E",
    "#..........................E",
    "######+#########+#######+#w#",
    "#........#...........#.....#",
    "#..H..H..p..h.....h..#..H..#",
    "#........+...........+.....#",
    "#..h.....#...........#.....#",
    "############################",
  ],
  area(x, y) {
    if (y <= 6) return x <= 10 ? "shipping office" : "warehouse";
    if (y <= 11) return "dock";
    return x <= 9 ? "storeroom" : x <= 21 ? "loading bay" : "guard post";
  },
  squadSpawns: [[26, 8], [26, 9], [26, 10], [26, 11]],
  scpRooms: [],
  insurgentRooms: [[1, 1, 10, 5], [12, 1, 26, 6], [1, 13, 8, 16], [10, 13, 20, 16], [22, 13, 26, 16]],
  strayRooms: [],
};

// The D-Class block at Site-19: two rows of cells off a corridor, and the mess hall. Riots happen here.
export const DBLOCK: MapDef = {
  reinforced: true,
  name: "D-Class block",
  rows: [
    "############################",
    "#....#....#....#....#......#",
    "#.h..#.h..#..h.#.h..#......#",
    "#....#....#....#....#..hh..#",
    "##+####+####+####+####+#WW##",
    "#..........................E",
    "#..H.......H.......H.......E",
    "#..........................E",
    "##+####+####+####+####+#####",
    "#....#....#....#....#......#",
    "#.h..#..h.#.h..#..h.#..H...#",
    "#....#....#....#....#......#",
    "######################+#####",
    "#..........................#",
    "#..hh..hh..hh..hh..hh......#",
    "#..........................#",
    "#..hh..hh..hh..hh..hh...H..#",
    "############################",
  ],
  area(x, y) {
    if (y <= 3) return x >= 21 ? "guard room" : "north cells";
    if (y <= 7) return "cell corridor";
    if (y <= 11) return x >= 21 ? "laundry" : "south cells";
    return "mess hall";
  },
  squadSpawns: [[26, 5], [26, 6], [26, 7], [25, 6]],
  scpRooms: [],
  insurgentRooms: [[1, 1, 4, 3], [6, 1, 9, 3], [11, 1, 14, 3], [16, 1, 19, 3], [1, 9, 4, 11], [6, 9, 9, 11], [11, 9, 14, 11], [1, 13, 20, 16]],
  strayRooms: [[1, 13, 20, 16], [21, 9, 26, 11]],
};

// Site-19's surface compound: the Insurgency comes through the wire from the west, and the lift down into the
// site is in the lift house on the east side. Epsilon-11 on station comes up the lift; off duty, they drive in through
// the motor pool's vehicle gate in the south wall.
export const GATE: MapDef = {
  name: "Site-19 surface compound",
  rows: [
    "############################",
    "#...h.#.......#.....#.h...##",
    "#.....#####...#.hh..+.....##",
    "#.HH..##h.#...#.....#...h.##",
    "#.....#w..#...#.....#.h...##",
    "#.....###+#...#w#+#w##w#####",
    "#.....#............#########",
    "#...h.......H......#.h..SS##",
    "#..................+.....C##",
    "#.......h.....h....+.....C##",
    "#...h.......H......#.h..SS##",
    "#.....#............#########",
    "#.HH..#..HH...###+##w###w###",
    "#.....#.......#...........##",
    "#.............#.h..h......##",
    "#h....#....D..#.h..h....h.##",
    "#.....#.......#...........##",
    "#########...################",
    // level 1 of Site-19, under the compound: rock between, the lift between
    "############################",
    "############################",
    "############################",
    "#........#.......#.........#",
    "#..h..h..#..H.H..#...hh....#",
    "#........+.......+.........#",
    "#..h..h..#.......#...hh....#",
    "####+######+#####W###+######",
    "#.................#........#",
    "#..H.........H....#.....SS.#",
    "#.................+.....C..#",
    "#.................+.....C..#",
    "#..H.........H....#.....SS.#",
    "#.................#........#",
    "####+#######+######+########",
    "#.......#........#.........#",
    "#..h....#...hh...#...h.h...#",
    "#.......+........+.........#",
    "#..h....#........#...h.h...#",
    "############################",
  ],
  area(x, y) {
    if (y >= 20) {
      const r = y - 20;
      if (r <= 4) return x <= 8 ? "barracks" : x <= 16 ? "armoury" : "containment control";
      if (r <= 11) return x >= 19 ? "lift lobby" : "level 1 corridor";
      return x <= 7 ? "mess" : x <= 17 ? "records vault" : "generator room";
    }
    if (y >= 18) return "rock";
    if (x <= 5) return "approach road";
    if (x >= 7 && x <= 10 && y >= 2 && y <= 5) return "gatehouse";
    if (x >= 14 && y <= 5) return x <= 19 ? "west office" : "records office";
    if (x >= 14 && y >= 12) return "barracks";
    if (x >= 19 && y >= 6 && y <= 11) return "lift house";
    return y >= 11 ? "motor pool" : "courtyard";
  },
  squadSpawns: [[22, 8], [22, 9], [23, 8], [23, 9]],
  // off-duty Epsilon-11 drives in from town through the motor pool's vehicle gate
  roadSpawns: [[9, 17], [10, 17], [11, 17], [10, 16]],
  // Phase 4C: two floors joined by the lift, which only Site-19's people can work until the Insurgency forces it
  floors: [{ name: "Surface", y0: 0, y1: 17 }, { name: "Level 1", y0: 20, y1: 37, under: true }],
  links: [{ a: [25, 8], b: [24, 28], kind: "lift", closed: true }],
  stationSpawns: [[22, 27], [22, 28], [22, 29], [22, 30]],
  control: [18, 21, 26, 24],
  scpRooms: [],
  insurgentRooms: [[1, 1, 5, 5], [1, 6, 5, 11], [1, 12, 5, 16]],
  strayRooms: [],
  fixedFurniture: true,
};


// Phase 4C: new field maps and two-floor maps.
// A rail yard: lines of boxcars across the tracks, a signal box and a goods shed to the north, the platform and
// station office to the south, and a lot with a truck for anything recovered.
export const RAIL: MapDef = {
  name: "Rail yard",
  rows: [
    "############################",
    "#....#w##w#........#######.#",
    "#....#....+..h.....#.....#.#",
    "#....#....#.....h..+..H..#.#",
    "#....######........#.....#.#",
    "#..........................#",
    "E..HHHH..HHHHHH...HHHH.HH..E",
    "E..........................E",
    "E..........................E",
    "E...HHHHHH...HHHH..HHHHH...E",
    "E..........................E",
    "#..........................#",
    "#.hh....hh.....hh......hh..#",
    "#..........................#",
    "##w##+##w##.........SCCCS..#",
    "#.........#.........SCCCS..#",
    "#..h...h..+.........SSSSS..#",
    "############################",
  ],
  area(x, y) {
    if (y <= 4) { if (x >= 6 && x <= 9 && y >= 2 && y <= 3) return "signal box"; if (x >= 20 && x <= 24) return "goods shed"; return "goods yard"; }
    if (y <= 11) return "rail tracks";
    if (y <= 13) return "platform";
    return x <= 10 ? "station office" : "freight lot";
  },
  squadSpawns: [[1, 7], [1, 8], [2, 7], [2, 8]],
  scpRooms: [[20, 2, 24, 4], [6, 2, 9, 3], [11, 14, 19, 16]],
  insurgentRooms: [[20, 2, 24, 4], [11, 1, 18, 4], [11, 14, 19, 16], [1, 15, 9, 16]],
  strayRooms: [[1, 12, 26, 13], [1, 1, 4, 4], [1, 15, 9, 16], [6, 2, 9, 3]],
  fixedFurniture: true,
};

// A village church: the nave with its pews, the bell tower, the rectory, the parish hall, and the graveyard between.
export const CHURCH: MapDef = {
  name: "Village church",
  rows: [
    "############################",
    "#.....#w#w#w#w#w#w#...h....#",
    "#.....#..........#.#.......#",
    "#..h..#.hhh.hhh..#.+...H...#",
    "#.....+.hhh.hhh..+.#.......#",
    "#.....#.hhh.hhh..#.#....h..#",
    "#..H..#..........#.#########",
    "#.....#w#w#+#w#w##.........E",
    "#.......................h..E",
    "E..........................E",
    "E..h.h.h..h.h.h......H.....E",
    "E..........................E",
    "#..h.h.h..h.h.h....SCCCS...#",
    "#..................SCCCS...#",
    "#####w####+####....SSSSS...#",
    "#.........#................#",
    "#..hh..H..+......h.....h...#",
    "############################",
  ],
  area(x, y) {
    if (y <= 6 && x >= 7 && x <= 16) return "nave";
    if (y <= 6 && x <= 5) return "rectory";
    if (y <= 5 && x >= 19) return "bell tower";
    if (y >= 15 && x <= 9) return "parish hall";
    return "graveyard";
  },
  squadSpawns: [[1, 9], [1, 10], [1, 11], [2, 10]],
  scpRooms: [[7, 1, 16, 6], [20, 1, 26, 5], [19, 8, 26, 13]],
  insurgentRooms: [[20, 1, 26, 5], [7, 1, 16, 6], [19, 8, 26, 11], [1, 15, 9, 16]],
  strayRooms: [[1, 1, 5, 6], [7, 1, 16, 6], [1, 15, 9, 16], [3, 8, 16, 13]],
  fixedFurniture: true,
};

// Another Foundation site: the labs above, a containment basement below, joined by a stair and a lift. Containment
// control in the basement has the panel that brings the power back.
export const LAB: MapDef = {
  name: "Research site",
  rows: [
    "############################",
    "#......#......#......#.....#",
    "#..hh..#..hh..#..H...#..h..#",
    "#......+......+......+.....#",
    "#..hh..#..hh..#......#..h..#",
    "###+######+#######+###+#####",
    "E..........................#",
    "E....h........h............#",
    "E..........................#",
    "###+#####W######+####+######",
    "#......#.........#.........#",
    "#..H...#..hh.hh..#...hh....#",
    "#......+.........+.........#",
    "#..h...#..hh.hh..#.........#",
    "#......#.........#.........#",
    "#......#.........#....h....#",
    "#......#.........#.........#",
    "############################",
    "############################",
    "############################",
    "############################",
    "#......#......#......#.....#",
    "#..H...#......#..h...#.....#",
    "#......+......+......+.....#",
    "#......#......#......#.....#",
    "####+#####+#######+#####+###",
    "#..........................#",
    "#..........................#",
    "#..........................#",
    "###+##W##+######+######+####",
    "#.......#.......#..........#",
    "#..hh...#...H...#...hh.....#",
    "#.......+.......+..........#",
    "#..hh...#.......#..........#",
    "#.......#.......#..........#",
    "#.......#.......#..........#",
    "#.......#.......#..........#",
    "############################",
  ],
  area(x, y) {
    if (y >= 20) {
      const r = y - 20;
      if (r <= 4) return "containment cell";
      if (r <= 8) return "maintenance corridor";
      return x <= 7 ? "generator room" : x <= 15 ? "records room" : "containment control";
    }
    if (y >= 18) return "rock";
    if (y <= 4) return x <= 6 ? "biology lab" : x <= 13 ? "chemistry lab" : x <= 20 ? "materials lab" : "radiology lab";
    if (y <= 8) return "main hall";
    return x <= 6 ? "offices" : x <= 16 ? "lecture room" : "lift lobby";
  },
  squadSpawns: [[1, 6], [1, 7], [1, 8], [2, 7]],
  floors: [{ name: "Labs", y0: 0, y1: 17, under: true }, { name: "Basement", y0: 20, y1: 37, under: true }],
  links: [{ a: [22, 7], b: [22, 27], kind: "stairs" }, { a: [22, 13], b: [22, 33], kind: "lift" }],
  panel: [25, 30],
  scpRooms: [[1, 21, 6, 24], [8, 21, 13, 24], [15, 21, 20, 24], [22, 21, 26, 24]],
  insurgentRooms: [[1, 1, 6, 4], [8, 1, 13, 4], [17, 30, 26, 36], [8, 10, 16, 16]],
  strayRooms: [[1, 10, 6, 16], [8, 10, 16, 16], [1, 1, 6, 4], [8, 1, 13, 4], [9, 30, 15, 36], [1, 30, 7, 36]],
  reinforced: true,
  fixedFurniture: true,
};

// A freighter at the quay: container stacks and the bridge on deck, the cargo hold, crew quarters and engine room
// below, two ladders between. The team comes up the gangway on the quay side.
export const SHIP: MapDef = {
  name: "Freighter",
  rows: [
    "############################",
    "############################",
    "###........................#",
    "##..HH..HHH...HH...#w#w#w###",
    "#E..HH..HHH...HH...#.....###",
    "#E.................+..h..###",
    "#E.....h......h....#.....###",
    "##..HH..HHH...HH...#..h..###",
    "###.HH..HHH...HH...###+#####",
    "###........................#",
    "###..h.......h.............#",
    "###.HH..HHH..HHH....HH.....#",
    "###.HH..HHH..HHH....HH.....#",
    "###........................#",
    "###......h.........h.......#",
    "############################",
    "############################",
    "############################",
    "############################",
    "############################",
    "############################",
    "############################",
    "###........#...............#",
    "###..hh....#..HH..HH..HH...#",
    "###........+...............#",
    "###..hh....#..HH..HH..HH...#",
    "###........#...............#",
    "######+#####...............#",
    "###........#..HH..HH..HH...#",
    "###........+...............#",
    "###..H.....#..HH..HH..HH...#",
    "###........#...............#",
    "###........#...............#",
    "###.....h..#.......h.......#",
    "############################",
    "############################",
    "############################",
    "############################",
  ],
  area(x, y) {
    if (y >= 20) return x <= 10 ? (y - 20 <= 6 ? "crew quarters" : "engine room") : "cargo hold";
    if (y >= 18 || y <= 1 || y >= 15) return "sea";
    if (x >= 19 && x <= 24 && y >= 3 && y <= 7) return "bridge";
    return "deck";
  },
  squadSpawns: [[2, 4], [2, 5], [2, 6], [3, 5]],
  floors: [{ name: "Deck", y0: 0, y1: 17 }, { name: "Hold", y0: 20, y1: 37, under: true }],
  links: [{ a: [7, 9], b: [7, 29], kind: "ladder" }, { a: [17, 13], b: [17, 33], kind: "ladder" }],
  scpRooms: [[12, 22, 26, 33], [3, 22, 10, 26]],
  insurgentRooms: [[20, 4, 24, 7], [12, 22, 26, 33], [3, 28, 10, 33], [20, 9, 26, 14]],
  strayRooms: [[3, 22, 10, 26], [20, 4, 24, 7], [3, 9, 18, 14]],
  fixedFurniture: true,
};

export const MAPS = { wingC: WING_C, town: TOWN, farm: FARM, port: PORT, dblock: DBLOCK, gate: GATE, rail: RAIL, church: CHURCH, lab: LAB, ship: SHIP };
export type MapId = keyof typeof MAPS;

/** Phase 4C: the map a field mission is played on. Anything that may need the truck's container (a recovery, an
 *  escort, an outbreak, a rescue) goes to a map that has one; strikes go wherever a cell can hole up. */
type FieldKind = "recovery" | "escort" | "rescue" | "outbreak" | "coverup" | "retaliation" | "strike";
const FIELD_MAPS: Record<FieldKind, (keyof typeof MAPS)[]> = {
  recovery: ["town", "farm", "rail", "church"], escort: ["town", "farm", "rail"], rescue: ["town", "farm", "rail", "church"],
  outbreak: ["town", "farm", "church"], coverup: ["town", "farm", "church", "rail"], retaliation: ["town", "farm", "church", "rail"],
  strike: ["port", "port", "ship", "rail", "church"],
};
export const fieldMap = (kind: FieldKind) => { const m = FIELD_MAPS[kind]; return m[Math.floor(Math.random() * m.length)] as "town"; };

