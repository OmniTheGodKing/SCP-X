// Presentation overhaul P4: the weapons, drawn side-on from their frames (src/data/mounts.ts), with each fitted
// attachment drawn at its mount. One drawing serves the bench in the armory (large) and the figure's hands (small).
// Frame units: x from the butt toward the muzzle; drawn in SVG coordinates (y down), so a mount at frame height h is
// drawn at y = -h.
import { FRAMES, mountAt, type MountId } from "../../data/mounts";
import type { AttachmentId } from "../../data/weapons";

const STEEL = "#3e464d", STEEL_DK = "#262c31", STEEL_LT = "#6c777f", BLUED = "#2e3438";

/** The weapon as an SVG group on its frame (0..length wide, about −90..90 tall, bore at y = 0). */
export function weaponSide(modelId: string, attachment?: string, opts: { ghost?: AttachmentId; highlight?: MountId } = {}) {
  const f = FRAMES[modelId] ?? FRAMES.m1_garand;
  const w = f.wood, wdk = shade(w, 0.72), wlt = shade(w, 1.15);
  const P: string[] = [];
  const [r0, r1] = f.rx, mz = f.muzzle;
  // stock: the butt drops below the bore line (y > 0) and rises to the wrist behind the receiver
  const grip = (fill: string) => `<path d="M${f.grip} 14 L${f.grip - 18} 78 L${f.grip + 12} 82 L${f.grip + 28} 14Z" fill="${fill}"/>`;
  switch (f.stock) {
    case "rifle": case "bar":
      P.push(`<path d="M0 -14 L0 60 Q18 66 36 60 L${f.grip - 6} 30 Q${f.grip + 20} 26 ${f.grip + 40} 22 L${r0 + 12} 18 L${r0 + 12} -12 L${f.grip + 10} -14 L${f.grip - 40} -20 L40 -22 Q12 -22 0 -14Z" fill="${w}"/>`);
      P.push(`<path d="M0 40 L0 60 Q18 66 36 60 L${f.grip - 6} 30 Q${f.grip + 20} 26 ${f.grip + 40} 22 L${f.grip + 40} 14 Q${f.grip + 10} 18 ${f.grip - 14} 22 L30 50Z" fill="${wdk}" opacity=".7"/>`);
      P.push(`<path d="M10 -14 L${f.grip - 40} -16" stroke="${wlt}" stroke-width="3" opacity=".4"/>`);
      if (f.stock === "bar") P.push(`<rect x="0" y="-16" width="10" height="78" fill="${STEEL_DK}"/>`);
      break;
    case "plastic":
      P.push(`<path d="M0 -14 L0 58 L22 60 L${r0 - 10} 18 L${r0} 18 L${r0} -12 L60 -16 Q12 -18 0 -14Z" fill="#2a2c2e"/>${grip("#2a2c2e")}`);
      break;
    case "wire": case "skeleton":
      P.push(`<path d="M10 -6 L10 56 M10 56 L${r0} 16 M10 -6 L${r0} -10" stroke="${STEEL}" stroke-width="7" fill="none"/><rect x="2" y="-10" width="16" height="70" rx="4" fill="${STEEL_DK}"/>${grip(STEEL_DK)}`);
      break;
    case "folding":
      P.push(`<path d="M30 -6 L30 50 L${r0} 16 L${r0} -8Z" fill="none" stroke="${STEEL}" stroke-width="7"/><rect x="22" y="-10" width="14" height="64" rx="3" fill="${STEEL_DK}"/>${grip(f.wood === "#2a2a2a" ? "#2a2c2e" : STEEL_DK)}`);
      break;
    case "pistolgrip": P.push(grip(STEEL_DK)); break;
  }
  // receiver and barrel
  P.push(`<rect x="${r0}" y="-18" width="${r1 - r0}" height="34" rx="3" fill="${BLUED}"/><rect x="${r0}" y="-18" width="${r1 - r0}" height="6" fill="${STEEL_LT}" opacity=".35"/>`);
  P.push(`<rect x="${r1}" y="-5" width="${mz - r1}" height="12" fill="${STEEL}"/><rect x="${r1}" y="-5" width="${mz - r1}" height="3" fill="${STEEL_LT}" opacity=".4"/>`);
  P.push(`<rect x="${r0 + 30}" y="-8" width="${Math.min(70, r1 - r0 - 40)}" height="10" fill="${STEEL_DK}"/>`);   // ejection port / bolt
  if (f.carry) P.push(`<path d="M${r0 + 10} -18 L${r0 + 20} -46 L${r1 - 30} -46 L${r1 - 20} -18" fill="none" stroke="#2a2c2e" stroke-width="10"/>`);
  // fore-end
  const fe0 = r1, fe1 = r1 + (mz - r1) * (f.fore === "pump" ? 0.38 : 0.62);
  switch (f.fore) {
    case "wood": P.push(`<path d="M${fe0} -14 L${fe1} -12 L${fe1} 16 L${fe0} 18Z" fill="${w}"/><path d="M${fe0} 10 L${fe1} 10" stroke="${wdk}" stroke-width="3"/><rect x="${fe0 + 40}" y="-16" width="16" height="34" fill="${STEEL_DK}"/>`); break;
    case "pump": P.push(`<path d="M${fe0 + 60} -2 L${fe1 + 60} -2 L${fe1 + 60} 26 L${fe0 + 60} 26Z" fill="${w}"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${fe0 + 70 + i * 16} 2 v20" stroke="${wdk}" stroke-width="3"/>`).join("")}`); break;
    case "heatshield": P.push(`<rect x="${fe0}" y="-14" width="${fe1 - fe0}" height="28" rx="4" fill="${STEEL_DK}"/>${Array.from({ length: 8 }, (_, i) => `<circle cx="${fe0 + 22 + i * ((fe1 - fe0 - 30) / 7)}" cy="0" r="5" fill="#141618"/>`).join("")}<path d="M${fe0 + 40} 14 L${fe0 + 160} 14 L${fe0 + 160} 34 L${fe0 + 40} 34Z" fill="${w}"/>`); break;
    case "perforated": P.push(`<rect x="${fe0}" y="-12" width="${fe1 - fe0}" height="24" rx="10" fill="${STEEL_DK}"/>${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${fe0 + 22 + i * ((fe1 - fe0 - 30) / 5)}" cy="0" rx="9" ry="5" fill="#141618"/>`).join("")}`); break;
    case "plastic": P.push(`<rect x="${fe0}" y="-16" width="${fe1 - fe0}" height="32" rx="12" fill="#2a2c2e"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${fe0 + 18 + i * ((fe1 - fe0 - 30) / 4)}" y="-10" width="6" height="20" rx="3" fill="#1a1c1e"/>`).join("")}`); break;
    case "none": break;
  }
  // magazine
  const mx = f.magX;
  switch (f.mag) {
    case "box": P.push(`<path d="M${mx - 26} 16 L${mx + 26} 16 L${mx + 30} 84 L${mx - 20} 84Z" fill="${STEEL_DK}"/>`); break;
    case "curved": P.push(`<path d="M${mx - 18} 16 L${mx + 18} 16 Q${mx + 26} 60 ${mx + 40} 98 L${mx + 8} 104 Q${mx - 6} 64 ${mx - 18} 16Z" fill="${STEEL_DK}"/>`); break;
    case "stick": P.push(`<rect x="${mx - 14}" y="16" width="28" height="110" fill="${STEEL_DK}"/><rect x="${mx - 14}" y="16" width="5" height="110" fill="${STEEL_LT}" opacity=".3"/>`); break;
    case "tube": P.push(`<rect x="${r1}" y="14" width="${(mz - r1) * 0.86}" height="14" rx="6" fill="${STEEL}"/>`); break;
    case "belt": P.push(`<rect x="${mx - 30}" y="16" width="60" height="44" rx="4" fill="#4a5038"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${mx - 60 + i * 8}" y="${60 + i * 6}" width="7" height="22" rx="2" fill="#b08a3a" transform="rotate(-20 ${mx - 56 + i * 8} ${70 + i * 6})"/>`).join("")}`); break;
    case "clip": P.push(`<rect x="${mx - 30}" y="-24" width="60" height="8" fill="#b08a3a" opacity=".85"/>`); break;
    case "none": break;
  }
  // trigger and guard, front sight
  P.push(`<path d="M${f.grip + 4} 16 Q${f.grip + 24} 46 ${f.grip + 52} 16" fill="none" stroke="${STEEL}" stroke-width="5"/><path d="M${f.grip + 24} 16 l-6 18" stroke="${attachment === "trigger" ? "#d9a441" : STEEL_LT}" stroke-width="5"/>`);
  P.push(`<path d="M${mz - 26} -5 L${mz - 22} -24 L${mz - 14} -24 L${mz - 12} -5Z" fill="${STEEL_DK}"/>`);
  if (!attachment || attachment !== "sights") P.push(`<rect x="${r1 - 18}" y="-30" width="16" height="12" fill="${STEEL_DK}"/>`);
  if (f.bipod) P.push(`<path d="M${mz - 120} 6 L${mz - 150} 92 M${mz - 120} 6 L${mz - 96} 92" stroke="${STEEL}" stroke-width="5"/>`);
  if (f.issuedScope && attachment !== "scope") P.push(scope(f, "issued"));
  // attachments
  const draw = (a: string, ghost = false) => {
    const g = ghost ? ` opacity=".55" stroke="#9fd0e8" stroke-width="2" stroke-dasharray="6 4"` : "";
    switch (a) {
      case "scope": return `<g${g}>${scope(f, "fitted")}</g>`;
      case "sights": return `<g${g}><path d="M${r1 - 26} -18 L${r1 - 22} -40 L${r1 - 2} -40 L${r1 + 2} -18Z" fill="#4a535a"/><circle cx="${r1 - 12}" cy="-34" r="5" fill="#141618" stroke="#9aa4ad" stroke-width="2"/><path d="M${mz - 28} -24 h20 v-8 h-20z" fill="#4a535a"/></g>`;
      case "suppressor": return `<g${g}><rect x="${mz - 4}" y="-14" width="150" height="30" rx="10" fill="#2a2f33"/><rect x="${mz + 6}" y="-14" width="130" height="5" rx="2" fill="${STEEL_LT}" opacity=".35"/></g>`;
      case "bayonet": return `<g${g}><rect x="${mz - 70}" y="14" width="50" height="12" fill="${STEEL_DK}"/><path d="M${mz - 22} 16 L${mz + 170} 20 L${mz - 22} 26Z" fill="#b9c2c8"/><path d="M${mz - 22} 20 L${mz + 160} 20" stroke="#8a949a" stroke-width="2"/></g>`;
      case "extmag": return f.mag === "tube"
        ? `<g${g}><rect x="${r1 + (mz - r1) * 0.86 - 4}" y="12" width="${(mz - r1) * 0.16 + 12}" height="18" rx="6" fill="#4a535a"/><rect x="${r1 + (mz - r1) * 0.86 + 6}" y="14" width="10" height="14" fill="#b08a3a"/></g>`
        : `<g${g}><path d="M${mx - 26} 80 L${mx + 30} 80 L${mx + 34} 128 L${mx - 18} 128Z" fill="#3a4148"/><rect x="${mx - 22}" y="120" width="54" height="10" fill="#4a535a"/></g>`;
      case "stock": return `<g${g}><rect x="-22" y="-18" width="26" height="82" rx="8" fill="#5a2c1e"/>${[0, 1, 2, 3, 4].map(i => `<path d="M-18 ${-6 + i * 16} h18" stroke="#3a1c12" stroke-width="3"/>`).join("")}</g>`;
      case "trigger": return `<g${g}><rect x="${f.grip + 2}" y="12" width="54" height="10" fill="#d9a441" opacity=".7"/></g>`;
      default: return "";
    }
  };
  if (attachment) P.push(draw(attachment));
  if (opts.ghost && opts.ghost !== attachment) P.push(draw(opts.ghost, true));
  if (opts.highlight) { const [hx, hy] = mountAt(modelId, opts.highlight); P.push(`<circle cx="${hx}" cy="${-hy}" r="30" fill="none" stroke="#6ea9c8" stroke-width="4" class="mountpulse"/>`); }
  return `<g class="weapon">${P.join("")}</g>`;
}

function scope(f: { rx: [number, number] }, kind: "issued" | "fitted") {
  const [r0, r1] = f.rx, cx = (r0 + r1) / 2, len = kind === "issued" ? 260 : 220;
  return `<rect x="${cx - 40}" y="-30" width="12" height="14" fill="#262c31"/><rect x="${cx + 30}" y="-30" width="12" height="14" fill="#262c31"/>
    <rect x="${cx - len / 2}" y="-52" width="${len}" height="22" rx="8" fill="#1d2226"/>
    <rect x="${cx - len / 2 - 14}" y="-58" width="34" height="34" rx="10" fill="#1d2226"/><rect x="${cx + len / 2 - 22}" y="-56" width="30" height="30" rx="9" fill="#1d2226"/>
    <rect x="${cx - len / 2}" y="-52" width="${len}" height="5" rx="2" fill="#6c777f" opacity=".35"/><circle cx="${cx + len / 2 + 8}" cy="-41" r="9" fill="#2f5a70" opacity=".8"/>`;
}
function shade(hex: string, k: number) { const n = parseInt(hex.slice(1), 16), ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0"); return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`; }
