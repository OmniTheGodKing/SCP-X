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
    `<path d="M19 30 Q18 15 32 15 Q46 15 45 30 Q43 20 32 19 Q21 20 19 30Z" fill="${hair}"/><ellipse cx="24" cy="14" rx="6" ry="4.5" fill="${hair}"/><ellipse cx="40" cy="14" rx="6" ry="4.5" fill="${hair}"/><path d="M19 30 Q17 38 21 40 L22 31Z M45 30 Q47 38 43 40 L42 31Z" fill="${hair}"/>`,   // victory rolls
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
  // a darker and a lighter tone of the skin for shading
  const tone = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16), ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0"); return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`; };
  const shade = tone(skin, 0.8), lit = tone(skin, 1.08), coatDk = tone(coat, 0.75), id = `p${Math.abs([...JSON.stringify(look)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0))}`;
  return `<svg class="portrait${fallen ? " fallen" : ""}" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Portrait">
    <defs><radialGradient id="${id}bg" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#2c3640"/><stop offset="1" stop-color="#141a1f"/></radialGradient>
      <radialGradient id="${id}vg" cx=".5" cy=".45" r=".75"><stop offset=".65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>
    <rect width="64" height="64" fill="url(#${id}bg)"/>
    ${[12, 22, 32, 42, 52].map(y => `<line x1="0" y1="${y}" x2="3" y2="${y}" stroke="#4a5561" stroke-width=".6"/>`).join("")}
    <path d="M5 64 Q7 48 32 47 Q57 48 59 64Z" fill="${coat}"/>
    <path d="M5 64 Q7 52 18 49 L22 64Z" fill="${coatDk}" opacity=".7"/>
    <path d="M24 48 L32 58 L40 48 L37 47 L32 53 L27 47Z" fill="${coatDk}"/>
    <path d="M27.5 47.5 L32 55 L36.5 47.5Z" fill="#d8d2c2" opacity=".55"/>
    <rect x="44" y="54" width="7" height="2" rx=".5" fill="#c9a45c" opacity=".85"/><rect x="13" y="53" width="6" height="4" fill="${coatDk}" opacity=".8"/>
    <path d="M26 37 L26 48 Q32 51 38 48 L38 37Z" fill="${shade}"/>
    <ellipse cx="19.6" cy="30" rx="2.2" ry="3.4" fill="${shade}"/><ellipse cx="44.4" cy="30" rx="2.2" ry="3.4" fill="${shade}"/>
    <ellipse cx="32" cy="29" rx="12" ry="14" fill="${skin}"/>
    <path d="M39 18 Q45 26 42 36 Q38 43 32 43 Q38 40 40 33 Q42 25 39 18Z" fill="${shade}" opacity=".55"/>
    <ellipse cx="28" cy="23" rx="5" ry="3" fill="${lit}" opacity=".35"/>
    ${look.hair === 5 ? "" : hairShape}
    <ellipse cx="27" cy="29.2" rx="2.1" ry="1.3" fill="#e9e4d8"/><ellipse cx="37" cy="29.2" rx="2.1" ry="1.3" fill="#e9e4d8"/>
    <circle cx="27.3" cy="29.3" r="1.05" fill="#2a2018"/><circle cx="37.3" cy="29.3" r="1.05" fill="#2a2018"/>
    <path d="M24.8 28.2 Q27 27.4 29.2 28.2 M34.8 28.2 Q37 27.4 39.2 28.2" stroke="${shade}" stroke-width=".7" fill="none"/>
    <path d="M24.5 26 Q27 24.8 29.3 25.6 M34.7 25.6 Q37 24.8 39.5 26" stroke="${hair}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M32 29.5 L30.6 34.4 Q32 35.3 33.6 34.4" stroke="${shade}" stroke-width=".9" fill="none" stroke-linecap="round"/>
    <path d="M28.8 38 Q32 39.4 35.2 38" stroke="#6a3f30" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>
    ${facial}
    ${look.scar ? `<path d="M38 27 L42 35" stroke="#b5675a" stroke-width="1.2" opacity=".85"/>` : ""}
    ${look.hair === 5 ? hairShape : ""}
    ${hat}
    <rect width="64" height="64" fill="url(#${id}vg)"/>
  </svg>`;
}
