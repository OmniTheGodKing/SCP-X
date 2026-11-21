// A full-body operative, built in layers like a paper doll in a 200 × 320 frame (feet at y 312, centred on x 100):
// back gear, legs and uniform, armor, belt kit, the weapon in their hands, arms, then the head from their saved look.
// Every layer comes from the operative's real state (uniform research, armor slot and vest tier, utility slots,
// weapon model, attachment and refit tier, rank, wounds), so changing any of it in the armory changes the figure.
// Each layer can be replaced by a file in /art (see art/README.md); the drawn layers below are stand-ins.
import type { Look } from "../../data/looks";
import type { UnitId } from "../../data/units";
import type { AttachmentId, WeaponType } from "../../data/weapons";
import { portraitHead, uniformColor } from "../portrait";
import { asset } from "./assets";
import { profileOf, weaponBody } from "./weapon";

export interface FigureSpec {
  id: string;
  look: Look; unit?: UnitId; sex?: "m" | "f";
  uniform: string;              // "" or a uniform research id
  armor: string;                // "" or an armor item id
  armorTier: number;
  items: string[];              // utility slot item ids
  weapon: { model: string; type: WeaponType; attachment?: AttachmentId; tier: number };
  rank: number;
  call: string;
  wounded?: boolean;
}

const SUITS: Record<string, { fill: string; dark: string; trim: string }> = {
  hazmat: { fill: "#b9a84c", dark: "#8a7c33", trim: "#2b2a22" },
  leadsuit: { fill: "#6e737a", dark: "#4b4f55", trim: "#25282c" },
  contsuit: { fill: "#d3cfc0", dark: "#a5a192", trim: "#c8632e" },
};
const tone = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16), ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0"); return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`; };
let fid = 0;

/** The pose: where the weapon sits and where each hand lands on it, worked out from the weapon's own geometry. */
function pose(spec: FigureSpec) {
  const p = profileOf(spec.weapon.model, spec.weapon.type);
  const len = p.muz - p.butt, s = 0.44, ang = (spec.weapon.type === "smg" ? 38 : 50) * Math.PI / 180;
  const bx = spec.weapon.type === "smg" ? 66 : 62, by = spec.weapon.type === "smg" ? 112 : 84;
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const at = (x: number, y: number): [number, number] => [bx + s * (cos * (x - p.butt) - sin * (y - 48)), by + s * (sin * (x - p.butt) + cos * (y - 48))];
  const grip = at((p.grip ?? p.trig + 6) - 2, 66);
  const fore = at(p.guard ? (p.guard[0] + p.guard[1]) / 2 : Math.min(p.rx[1] + 40, p.muz - 30), 56);
  return { transform: `translate(${bx} ${by}) rotate(${ang * 180 / Math.PI}) scale(${s}) translate(${-p.butt} -48)`, grip, fore, len };
}

export function figureSvg(spec: FigureSpec, o: { cls?: string; label?: string } = {}) {
  const id = `f${++fid}`, suit = SUITS[spec.armor];
  const coat = suit ? suit.fill : uniformColor(spec.unit), coatDk = suit ? suit.dark : tone(coat, 0.68), coatLt = suit ? tone(suit.fill, 1.15) : tone(coat, 1.18);
  const trouser = suit ? suit.fill : tone(coat, 0.92);
  const L: string[] = [];
  const layer = (key: string[], drawn: string) => { const a = asset(...key); return a ? `<image href="${a}" x="0" y="0" width="200" height="320"/>` : drawn; };
  const heavy: string[] = spec.items.filter(i => i === "bazooka" || i === "law" || i === "flamer");
  // back gear, behind everything
  L.push(heavy.map(h => layer([`soldier/back/${h}`], h === "flamer"
    ? `<rect x="64" y="70" width="18" height="72" rx="8" fill="#6a3a1e" stroke="#2a160a"/><rect x="118" y="70" width="18" height="72" rx="8" fill="#6a3a1e" stroke="#2a160a"/><rect x="66" y="74" width="14" height="4" fill="#d9a441" opacity=".7"/>`
    : `<g transform="rotate(-28 100 120)"><rect x="${h === "law" ? 24 : 14}" y="96" width="${h === "law" ? 150 : 172}" height="${h === "law" ? 11 : 14}" rx="5" fill="${h === "law" ? "#5e6249" : "#4f5538"}" stroke="#1d2016"/><rect x="${h === "law" ? 160 : 170}" y="94" width="10" height="18" rx="2" fill="#2b2e22"/></g>`)).join(""));
  // legs and boots
  L.push(layer([`soldier/body/${spec.uniform || "base"}`, "soldier/body"], `
    <path d="M76 166 L99 166 L98 292 L80 292 Q76 230 76 166Z" fill="url(#${id}tr)"/>
    <path d="M101 166 L124 166 Q124 230 120 292 L102 292Z" fill="url(#${id}tr)"/>
    <path d="M99 170 L101 170 L100 250Z" fill="${tone(trouser, 0.6)}" opacity=".6"/>
    <path d="M80 210 q9 4 17 0 M103 210 q9 4 17 0" stroke="${tone(trouser, 0.7)}" stroke-width="1.2" fill="none" opacity=".7"/>
    <rect x="79" y="226" width="14" height="16" rx="2" fill="${tone(trouser, 0.85)}" stroke="${tone(trouser, 0.6)}" stroke-width=".8"/>
    <path d="M78 286 L99 286 L101 306 Q101 312 95 312 L70 312 Q68 304 78 300Z" fill="${suit && spec.armor !== "leadsuit" ? "#1f2023" : "#2b2016"}"/>
    <path d="M101 286 L122 286 L122 300 Q132 304 130 312 L105 312 Q99 312 99 306Z" fill="${suit && spec.armor !== "leadsuit" ? "#1f2023" : "#2b2016"}"/>
    ${suit ? "" : `<path d="M78 286 h21 M101 286 h21" stroke="#c8bc9a" stroke-width="3" opacity=".25"/>`}
    <path d="M66 62 Q100 52 134 62 L138 92 L126 104 L124 168 L76 168 L74 104 L62 92Z" fill="url(#${id}co)"/>
    <path d="M100 62 L100 168" stroke="${coatDk}" stroke-width="1.2"/>
    ${suit ? "" : `<path d="M88 58 L100 76 L112 58 L106 56 L100 66 L94 56Z" fill="${coatDk}"/>
    <rect x="78" y="82" width="16" height="14" rx="1.5" fill="${coatLt}" opacity=".35" stroke="${coatDk}" stroke-width=".8"/><rect x="106" y="82" width="16" height="14" rx="1.5" fill="${coatLt}" opacity=".35" stroke="${coatDk}" stroke-width=".8"/>
    <path d="M78 82 h16 v5 h-16Z M106 82 h16 v5 h-16Z" fill="${coatDk}" opacity=".8"/>
    ${[92, 112, 132, 152].map(y => `<circle cx="100" cy="${y}" r="1.3" fill="${coatDk}"/>`).join("")}`}
    ${spec.uniform === "padded_jacket" ? `<path d="${[0, 1, 2, 3, 4, 5].map(i => `M${70 + i * 12} 66 L${66 + i * 12 + 30} 166`).join(" ")} ${[0, 1, 2, 3, 4, 5].map(i => `M${130 - i * 12} 66 L${134 - i * 12 - 30} 166`).join(" ")}" stroke="${coatDk}" stroke-width=".8" opacity=".55"/>` : ""}
    ${spec.uniform === "nylon_liner" ? `<path d="M74 104 h52 M75 126 h50 M76 148 h48" stroke="${coatDk}" stroke-width="1.4" opacity=".55"/>` : ""}
    ${spec.uniform === "plated_undersuit" || spec.uniform === "powered_harness" ? `<path d="M64 64 q8 -6 18 -4 v14 q-10 0 -16 6Z M136 64 q-8 -6 -18 -4 v14 q10 0 16 6Z" fill="#4a5058" stroke="#22262b"/><rect x="80" y="182" width="16" height="20" rx="3" fill="#4a5058" stroke="#22262b"/><rect x="104" y="182" width="16" height="20" rx="3" fill="#4a5058" stroke="#22262b"/>` : ""}
    ${spec.uniform === "powered_harness" ? `<path d="M74 168 L74 286 M126 168 L126 286" stroke="#7d868f" stroke-width="3"/><circle cx="74" cy="168" r="5" fill="#3a4047" stroke="#8d969e"/><circle cx="126" cy="168" r="5" fill="#3a4047" stroke="#8d969e"/><circle cx="74" cy="230" r="4" fill="#3a4047" stroke="#8d969e"/><circle cx="126" cy="230" r="4" fill="#3a4047" stroke="#8d969e"/>` : ""}`));
  // armor
  if (spec.armor && !suit) {
    const t = Math.max(1, spec.armorTier), A = spec.armor;
    const vest = A === "armor_light"
      ? `<path d="M62 64 Q100 54 138 64 L136 188 L64 188Z" fill="url(#${id}cam)" stroke="#2b2e22"/><path d="M84 60 Q100 74 116 60" fill="none" stroke="#2b2e22" stroke-width="3"/>`
      : A === "armor_heavy"
      ? `<path d="M70 62 Q100 54 130 62 L132 176 L68 176Z" fill="#3f4537" stroke="#1d2016"/><rect x="78" y="72" width="44" height="40" rx="4" fill="#545c4a" stroke="#1d2016"/><rect x="80" y="118" width="40" height="34" rx="4" fill="#545c4a" stroke="#1d2016"/><path d="M58 60 q14 -10 26 -4 l-2 22 q-14 -2 -24 8Z M142 60 q-14 -10 -26 -4 l2 22 q14 -2 24 8Z" fill="#4a5242" stroke="#1d2016"/><path d="M84 176 h32 l-4 22 h-24Z" fill="#3f4537" stroke="#1d2016"/>`
      : t >= 3
      ? `<path d="M70 62 Q100 54 130 62 L130 166 L70 166Z" fill="#33382d" stroke="#14160f"/><rect x="80" y="74" width="40" height="52" rx="5" fill="#5a5f63" stroke="#1b1e21"/><path d="M84 80 h32" stroke="#8d969e" stroke-width="1" opacity=".5"/><rect x="74" y="132" width="14" height="18" rx="2" fill="#2b3026"/><rect x="112" y="132" width="14" height="18" rx="2" fill="#2b3026"/>`
      : t === 2
      ? `<path d="M68 60 Q100 52 132 60 L130 162 L70 162Z" fill="#5c6346" stroke="#262a1c"/><path d="M80 56 Q100 72 120 56 L120 50 Q100 62 80 50Z" fill="#4e553b" stroke="#262a1c"/>${[84, 102, 120, 138].map(y => `<path d="M71 ${y} h58" stroke="#262a1c" stroke-width="1" opacity=".55"/>`).join("")}<path d="M100 64 v98" stroke="#262a1c" stroke-width="1.4"/>`
      : `<path d="M66 62 Q100 54 134 62 L132 166 L68 166Z" fill="#4c5236" stroke="#22261a"/>${[76, 90, 104, 118, 132, 146].map(y => `<path d="M69 ${y} h62" stroke="#22261a" stroke-width="1" opacity=".55"/>`).join("")}<path d="M100 62 v104" stroke="#22261a" stroke-width="1.6"/><rect x="72" y="140" width="22" height="18" rx="2" fill="#41462e" stroke="#22261a"/><rect x="106" y="140" width="22" height="18" rx="2" fill="#41462e" stroke="#22261a"/>`;
    L.push(layer([`soldier/armor/${A}-t${t}`, `soldier/armor/${A}`], vest));
  }
  if (suit) L.push(layer([`soldier/armor/${spec.armor}`], `<path d="M76 166 h48" stroke="${suit.trim}" stroke-width="3" opacity=".7"/>${spec.armor === "contsuit" ? `<path d="M100 60 v106 M66 62 l12 30 M134 62 l-12 30" stroke="${suit.trim}" stroke-width="2.4" fill="none"/>` : ""}<rect x="84" y="96" width="32" height="20" rx="3" fill="${suit.dark}" stroke="${suit.trim}" stroke-width=".8"/>`));
  // webbing, belt and the sidearm
  L.push(`<path d="M80 62 L88 154 M120 62 L112 154" stroke="${suit ? suit.dark : "#6a6a4a"}" stroke-width="4" opacity="${spec.armor ? 0.5 : 0.9}"/>
    <rect x="72" y="150" width="56" height="9" rx="1.5" fill="#6d6a4c" stroke="#2f2e20"/><rect x="96" y="150" width="9" height="9" fill="#a99a6a" stroke="#2f2e20"/>
    <path d="M66 156 h14 v26 q-7 6 -14 0Z" fill="#5a3a20" stroke="#24160a"/><path d="M69 160 h8" stroke="#8a6a40" stroke-width="1"/>`);
  // utility kit on the webbing: what's in their slots, where it would hang
  const spots: [number, number][] = [[118, 160], [130, 150], [88, 108]];
  spec.items.filter(i => !heavy.includes(i)).forEach((it, i) => {
    const [x, y] = spots[i] ?? [118 + i * 6, 160];
    const a = asset(`soldier/belt/${it}`);
    if (a) { L.push(`<image href="${a}" x="${x - 10}" y="${y - 4}" width="20" height="24"/>`); return; }
    L.push(it === "frag" ? `<ellipse cx="${x}" cy="${y + 8}" rx="6" ry="7" fill="#4f5538" stroke="#1d2016"/><path d="M${x - 5} ${y + 6} h10 M${x - 5} ${y + 10} h10" stroke="#1d2016" stroke-width=".8"/><rect x="${x - 2}" y="${y - 1}" width="4" height="4" fill="#6a7178"/>`
      : ["smoke", "flashbang", "csgas", "incendiary"].includes(it) ? `<rect x="${x - 5}" y="${y}" width="10" height="17" rx="2" fill="${it === "smoke" ? "#6b6f73" : it === "flashbang" ? "#5d6670" : it === "csgas" ? "#5b6045" : "#7a3b1e"}" stroke="#1b1e21"/><rect x="${x - 5}" y="${y + 5}" width="10" height="3" fill="${it === "smoke" ? "#e8e8e8" : "#d9a441"}"/>`
      : it === "medkit" ? `<rect x="${x - 8}" y="${y}" width="16" height="14" rx="2" fill="#d8d6c8" stroke="#55534a"/><path d="M${x - 1.5} ${y + 3}h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="#b5463b"/>`
      : it === "camera" ? `<rect x="${x - 8}" y="${y}" width="16" height="11" rx="2" fill="#24272a"/><circle cx="${x}" cy="${y + 5.5}" r="3.5" fill="#6a7178"/>`
      : it === "tracker" ? `<rect x="${x - 8}" y="${y - 2}" width="16" height="15" rx="2" fill="#4b555e" stroke="#1b1e21"/><circle cx="${x}" cy="${y + 5}" r="4" fill="#14281c"/><circle cx="${x + 1}" cy="${y + 4}" r="1" fill="#7fd08a"/>`
      : it === "restraints" ? `<circle cx="${x - 3}" cy="${y + 7}" r="4" fill="none" stroke="#9aa4ad" stroke-width="2"/><circle cx="${x + 4}" cy="${y + 7}" r="4" fill="none" stroke="#9aa4ad" stroke-width="2"/>`
      : it === "ward" ? `<circle cx="${x}" cy="${y + 6}" r="5" fill="none" stroke="#b98bd3" stroke-width="1.6"/><circle cx="${x}" cy="${y + 6}" r="1.6" fill="#b98bd3"/>`
      : it === "flare" ? `<rect x="${x - 3}" y="${y - 2}" width="6" height="20" rx="2" fill="#b8463b"/>`
      : `<rect x="${x - 6}" y="${y}" width="12" height="13" rx="2" fill="#5e5a40" stroke="#2f2e20"/>`);
  });
  // the weapon and the arms holding it
  const ps = pose(spec), sleeve = suit ? suit.fill : coat, sleeveDk = suit ? suit.dark : coatDk;
  const hand = suit && spec.armor !== "contsuit" ? "#22252a" : spec.armor === "contsuit" ? "#c8632e" : tone(["#f1d3bc", "#e3b48e", "#c98e63", "#a86b45", "#7c4a2c", "#55321e"][spec.look.skin] ?? "#c98e63", 0.95);
  const arm = (sx: number, sy: number, hx: number, hy: number, out: number) => {
    const mx = (sx + hx) / 2 + out, my = (sy + hy) / 2 + 6;
    return `<path d="M${sx} ${sy} Q${mx} ${my} ${hx} ${hy}" stroke="${sleeve}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M${sx} ${sy} Q${mx} ${my} ${hx} ${hy}" stroke="${sleeveDk}" stroke-width="15" stroke-linecap="round" fill="none" opacity=".25" stroke-dasharray="0 22 400"/>`;
  };
  L.push(`<g transform="${ps.transform}">${weaponBody(spec.weapon.model, spec.weapon.type, { attachment: spec.weapon.attachment, tier: spec.weapon.tier })}</g>`);
  L.push(arm(68, 68, ps.grip[0], ps.grip[1], -18) + arm(132, 68, ps.fore[0], ps.fore[1], 16));
  // rank chevrons on the left sleeve
  if (spec.rank > 0 && !suit) L.push(Array.from({ length: Math.min(3, spec.rank) }, (_, i) => `<path d="M58 ${86 + i * 4} l5 -3 l5 3" stroke="#d2b25c" stroke-width="1.6" fill="none"/>`).join(""));
  L.push(`<circle cx="${ps.grip[0]}" cy="${ps.grip[1]}" r="6.5" fill="${hand}"/><circle cx="${ps.fore[0]}" cy="${ps.fore[1]}" r="6.5" fill="${hand}"/>`);
  if (spec.wounded) L.push(`<path d="M126 76 l14 4 l-2 7 l-14 -4Z" fill="#e8e2d2"/><path d="M131 79 l3 1" stroke="#b5503f" stroke-width="2" opacity=".7"/>`);
  // head
  const cover = suit ? "hood" : spec.armor ? "helmet" : null;
  L.push(`<g transform="translate(63.2 0.6) scale(1.15)">${portraitHead(spec.look, spec.unit, { cover, hoodColor: suit?.fill, bandage: spec.wounded && !cover })}</g>`);
  if (!suit) L.push(`<rect x="106" y="74" width="20" height="5" fill="#d8d2c2" opacity=".75"/><text x="116" y="78" font-size="4" text-anchor="middle" fill="#2a2a2a" font-family="monospace" font-weight="700">${spec.call.replace(/[^\w-]/g, "")}</text>`);
  const camo = `<pattern id="${id}cam" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#5d6247"/><path d="M2 6 q8 -6 14 2 q-4 8 -14 4Z M22 20 q10 -4 14 6 q-8 6 -14 0Z M6 28 q6 -4 10 4 q-6 6 -10 0Z" fill="#3f4430"/><path d="M24 4 q6 -2 8 4 q-4 4 -8 0Z M12 18 q4 -2 6 2 q-3 3 -6 0Z" fill="#7a6a45"/></pattern>`;
  return `<svg class="figure ${o.cls ?? ""}" viewBox="0 0 200 320" role="img" aria-label="${o.label ?? "Operative"}">
    <defs>
      <linearGradient id="${id}co" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${coatLt}"/><stop offset=".55" stop-color="${coat}"/><stop offset="1" stop-color="${coatDk}"/></linearGradient>
      <linearGradient id="${id}tr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${tone(trouser, 1.1)}"/><stop offset="1" stop-color="${tone(trouser, 0.7)}"/></linearGradient>
      ${camo}
    </defs>
    ${L.join("")}
  </svg>`;
}
