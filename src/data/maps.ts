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
  ],
  area(x, y) {
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
  scpRooms: [],
  insurgentRooms: [[1, 1, 5, 5], [1, 6, 5, 11], [1, 12, 5, 16]],
  strayRooms: [],
  fixedFurniture: true,
};

export const MAPS = { wingC: WING_C, town: TOWN, farm: FARM, port: PORT, dblock: DBLOCK, gate: GATE };
export type MapId = keyof typeof MAPS;
