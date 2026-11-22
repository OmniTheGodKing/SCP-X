// The tactical battlefield's art pipeline. Every drawable on the map (a figure, a floor surface, a wall material, a
// prop, a piece of placed squad kit) asks for an image by key under art/tactical/. A finished file there is drawn
// in place of the stand-in painted in code; with no file, the stand-in is used. Images load once and are cached;
// when one finishes loading, `tacticalArtVersion()` changes so the cached map layer is rebuilt with it.
// Keys and frames are documented in art/tactical/README.md.
import { asset, artVersion } from "./stage/assets";

const cache = new Map<string, HTMLImageElement | null>();
let loaded = 0;

/** A ready image for the first key that has one, or null (draw the stand-in). Starts loading on first ask. */
export function tacImg(...keys: string[]): HTMLImageElement | null {
  for (const k of keys) {
    const url = asset(k);
    if (!url) continue;
    const id = `${k}|${url}`;
    let im = cache.get(id);
    if (im === undefined) {
      im = new Image();
      im.onload = () => { loaded++; };
      im.src = url;
      cache.set(id, im);
    }
    if (im && im.complete && im.naturalWidth) return im;
  }
  return null;
}
/** Changes whenever art is added or finishes loading. */
export const tacticalArtVersion = () => `${artVersion}.${loaded}`;
