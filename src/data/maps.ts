import type { MapDef } from "../core/grid";

// Heavy Containment Zone, wing C: three north rooms, a long corridor, and three south rooms.
// The transport container sits at the dock in the southwest staging room, open to the north.
export const WING_C: MapDef = {
  name: "Heavy Containment Zone, wing C",
  rows: [
    "############################",
    "#....h....#.......#........#",
    "#.........#...H...#..hh....#",
    "#..h...h..+.......+........#",
    "#.........#...H...#....h...#",
    "#....hh...#.......#........#",
    "###+##########+#######+#####",
    "#..........................#",
    "#..H...h........H......h...#",
    "#.....................H....#",
    "#....h.....h...............#",
    "###+######+####+########+###",
    "#........#.......#.........#",
    "#..hh....#...h...#...H.....#",
    "#........+.......+.........#",
    "#CCCS..H.#...h...#..hh.....#",
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
};
