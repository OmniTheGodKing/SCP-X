// The art pipeline for the facility scenes. Every visual part of a scene (a room's back wall, a layer of a
// soldier, a weapon in profile) is asked for by a key such as "weapon/m1_garand" or "soldier/armor/armor_heavy".
// If a file with that key exists under /art (png, webp, jpg or svg), it is bundled and drawn; if not, the
// procedural stand-in drawn in code is used. Dropping finished artwork into /art replaces the stand-in with no
// code changes. See art/README.md for the keys and the frame each layer is drawn in.
const files = import.meta.glob("../../../art/**/*.{png,webp,jpg,svg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

const byKey = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const key = path.replace(/^.*\/art\//, "").replace(/\.(png|webp|jpg|svg)$/, "");
  byKey.set(key, url);
}

/** The bundled file for an art key, or null when the procedural stand-in should be drawn. Keys are tried from
 *  most to least specific, so "room/barracks/1960s" falls back to "room/barracks". */
export function asset(...keys: string[]): string | null {
  for (const k of keys) { const u = byKey.get(k); if (u) return u; }
  return null;
}
export const assetCount = () => byKey.size;

/** The decade the facility is dressed for. Site-19 starts in 1951 and modernises as the campaign runs. */
export type Era = "1950s" | "1960s" | "1970s" | "1980s";
export function eraOf(year: number): Era { return year < 1960 ? "1950s" : year < 1970 ? "1960s" : year < 1980 ? "1970s" : "1980s"; }
