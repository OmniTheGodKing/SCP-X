// Replaceable art (UI/UX overhaul). Code-drawn SVG is the provisional placeholder for everything; a finished file
// dropped into src/assets/<kind>/<id>.<png|webp|svg> replaces it at build time, with no code change. See
// src/assets/README.md for each kind's contract (framing, origin, size). Unit tests and Node have no import.meta.glob,
// so the lookup is empty there and the placeholders are used.
type Kind = "weapons" | "backdrops";
let files: Record<string, string> = {};
try {
  files = import.meta.glob("../assets/*/*.{png,webp,svg,jpg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
} catch { files = {}; }

/** The URL of a finished asset for this id, or null when only the code-drawn placeholder exists. */
export function assetUrl(kind: Kind, id: string): string | null {
  for (const ext of ["webp", "png", "svg", "jpg"]) { const u = files[`../assets/${kind}/${id}.${ext}`]; if (u) return u; }
  return null;
}
/** Every asset present, for the credits and for tests. */
export const assetList = () => Object.keys(files).map(k => k.replace("../assets/", ""));
