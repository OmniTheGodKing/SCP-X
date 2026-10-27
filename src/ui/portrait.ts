// Flat drawn portraits built from an operative's look. Everything is layered SVG shapes in a 64×64 box, so
// replacing the style later means replacing this file only.
import { HAIR_COLORS, HEADGEAR, SKIN, type Look } from "../data/looks";
import type { UnitId } from "../data/units";

const UNIFORM: Partial<Record<UnitId, string>> = { legion: "#7a7155", gurkha: "#6a6448", udt: "#2e3d4f", seals: "#2b3540", sbs: "#4d5a46" };

export function portraitSvg(look: Look, unit: UnitId | undefined, size = 56, fallen = false) {
  const skin = SKIN[look.skin], hair = HAIR_COLORS[look.hairColor], gear = unit && look.headgear ? HEADGEAR[unit] : undefined;
  const coat = (unit && UNIFORM[unit]) || "#58603f";
  const hairShape = [
    `<path d="M20 25 Q21 13 32 13 Q43 13 44 25 Q40 18 32 18 Q24 18 20 25Z" fill="${hair}"/>`,                      // crew cut
    `<path d="M19 27 Q19 12 33 12 Q45 13 45 26 Q42 17 30 19 Q24 20 19 27Z" fill="${hair}"/>`,                      // side part
    `<path d="M19 26 Q18 11 32 11 Q46 11 45 26 Q44 15 32 15 Q21 15 19 26Z" fill="${hair}"/>`,                      // swept back
    `<path d="M21 23 Q22 15 32 15 Q42 15 43 23 Q38 19 32 19 Q26 19 21 23Z" fill="${hair}" opacity=".35"/>`,         // shaved
    `<path d="M19 28 Q18 12 32 12 Q46 12 45 28 Q43 17 32 17 Q21 17 19 28Z" fill="${hair}"/><circle cx="32" cy="11" r="5" fill="${hair}"/>`,   // bun
    `<path d="M18 36 Q16 12 32 12 Q48 12 46 36 L43 36 Q44 19 32 18 Q20 19 21 36Z" fill="${hair}"/>`,                // bob
  ][look.hair] ?? "";
  const facial = [
    "",
    `<path d="M26 37 Q32 34 38 37 Q32 36 26 37Z" fill="${hair}" stroke="${hair}" stroke-width="1.5"/>`,
    `<path d="M21 31 Q22 45 32 46 Q42 45 43 31 Q41 41 32 41 Q23 41 21 31Z" fill="${hair}"/>`,
    `<path d="M22 33 Q24 44 32 45 Q40 44 42 33 Q40 41 32 42 Q24 41 22 33Z" fill="${hair}" opacity=".3"/>`,
  ][look.facial] ?? "";
  const hat = !gear ? "" : gear[0].includes("kepi")
    ? `<rect x="21" y="7" width="22" height="11" rx="2" fill="${gear[1]}"/><rect x="19" y="17" width="26" height="3" rx="1" fill="#2a2a2a"/>`
    : gear[0].includes("slouch") ? `<ellipse cx="32" cy="17" rx="19" ry="4" fill="${gear[1]}"/><path d="M22 17 Q23 8 32 8 Q41 8 42 17Z" fill="${gear[1]}"/>`
    : gear[0].includes("cap") ? `<path d="M20 20 Q20 9 32 9 Q44 9 44 20Z" fill="${gear[1]}"/>${gear[0].includes("patrol") ? `<rect x="19" y="18" width="26" height="3" fill="${gear[1]}"/>` : ""}`
    : `<path d="M18 19 Q17 9 33 9 Q48 10 46 18 Q40 15 30 16 Q22 17 18 19Z" fill="${gear[1]}"/><circle cx="24" cy="15" r="1.6" fill="#c9a45c"/>`;   // beret, badge over the left eye
  return `<svg class="portrait${fallen ? " fallen" : ""}" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Portrait">
    <rect width="64" height="64" fill="#1c2329"/>
    <path d="M6 64 Q8 49 32 48 Q56 49 58 64Z" fill="${coat}"/><path d="M27 48 L32 56 L37 48Z" fill="#d8d2c2" opacity=".5"/>
    <rect x="27" y="38" width="10" height="11" fill="${skin}"/>
    <ellipse cx="32" cy="29" rx="12" ry="14" fill="${skin}"/>
    ${look.hair === 5 ? "" : hairShape}
    <circle cx="27" cy="29" r="1.3" fill="#1b1b1b"/><circle cx="37" cy="29" r="1.3" fill="#1b1b1b"/>
    <path d="M24.5 26 L29 25.5 M35 25.5 L39.5 26" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M29 37.5 Q32 38.5 35 37.5" stroke="#5a3a2a" stroke-width="1" fill="none" opacity=".7"/>
    ${facial}
    ${look.scar ? `<path d="M38 27 L42 35" stroke="#b5675a" stroke-width="1.2" opacity=".85"/>` : ""}
    ${look.hair === 5 ? hairShape : ""}
    ${hat}
  </svg>`;
}
