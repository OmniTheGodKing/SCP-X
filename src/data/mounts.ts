// Presentation overhaul P4: where an attachment goes on each weapon, and which attachments each weapon can take.
// Renderer-independent: mount ids are stable names any renderer (the 2D bench, a 3D model's sockets) can resolve,
// and positions are on a common side-view frame: x from the butt (0) toward the muzzle, y up from the bore line,
// in the same units as the weapon's drawn length.
//
// Compatibility follows period practice, so a 1951 armourer couldn't fit what didn't exist for that weapon: the
// Garand's en-bloc clip takes no extended magazine, the trench gun takes its bayonet, the M3 the OSS suppressor.
import type { AttachmentId } from "./weapons";

export type MountId = "optic" | "rearsight" | "muzzle" | "lug" | "magazine" | "butt" | "trigger";
/** Which mount each attachment uses. */
export const MOUNT_OF: Record<AttachmentId, MountId> = {
  scope: "optic", sights: "rearsight", suppressor: "muzzle", bayonet: "lug", extmag: "magazine", stock: "butt", trigger: "trigger",
};
export const MOUNT_NAMES: Record<MountId, string> = {
  optic: "Optic mount", rearsight: "Rear sight", muzzle: "Muzzle", lug: "Bayonet lug", magazine: "Magazine", butt: "Butt", trigger: "Trigger group",
};

/** A weapon's shape, for every renderer: its overall length and the parts' positions on the frame. */
export interface WeaponFrame {
  length: number;
  stock: "rifle" | "pistolgrip" | "wire" | "skeleton" | "bar" | "plastic" | "folding";
  /** Receiver start and end. */
  rx: [number, number];
  /** Where the barrel ends (the muzzle). */
  muzzle: number;
  mag: "none" | "box" | "curved" | "tube" | "belt" | "clip" | "stick";
  magX: number;
  grip: number;
  fore: "wood" | "pump" | "perforated" | "heatshield" | "plastic" | "none";
  wood: string;
  bipod?: boolean;
  carry?: boolean;
  /** Fitted with a scope as issued (the A4 Springfield, the M21). */
  issuedScope?: boolean;
}

export const FRAMES: Record<string, WeaponFrame> = {
  m1_garand:  { length: 960, stock: "rifle", rx: [380, 560], muzzle: 960, mag: "clip", magX: 460, grip: 330, fore: "wood", wood: "#7a4f2a" },
  m14:        { length: 940, stock: "rifle", rx: [370, 550], muzzle: 940, mag: "box", magX: 450, grip: 320, fore: "wood", wood: "#7a5230" },
  m16:        { length: 860, stock: "plastic", rx: [330, 520], muzzle: 860, mag: "box", magX: 430, grip: 340, fore: "plastic", wood: "#2a2a2a", carry: true },
  m1903a4:    { length: 940, stock: "rifle", rx: [360, 520], muzzle: 940, mag: "none", magX: 440, grip: 300, fore: "wood", wood: "#6e4626", issuedScope: true },
  m21:        { length: 960, stock: "rifle", rx: [370, 550], muzzle: 960, mag: "box", magX: 450, grip: 320, fore: "wood", wood: "#5e3f22", issuedScope: true },
  m1897:      { length: 860, stock: "rifle", rx: [330, 470], muzzle: 860, mag: "tube", magX: 600, grip: 290, fore: "heatshield", wood: "#7a4f2a" },
  r870:       { length: 880, stock: "rifle", rx: [330, 480], muzzle: 880, mag: "tube", magX: 600, grip: 290, fore: "pump", wood: "#6a4325" },
  bar:        { length: 980, stock: "bar", rx: [360, 600], muzzle: 980, mag: "box", magX: 470, grip: 330, fore: "wood", wood: "#6e4626", bipod: true },
  m60:        { length: 980, stock: "plastic", rx: [330, 600], muzzle: 980, mag: "belt", magX: 450, grip: 330, fore: "plastic", wood: "#2a2a2a", bipod: true, carry: true },
  m2_carbine: { length: 780, stock: "rifle", rx: [330, 480], muzzle: 780, mag: "curved", magX: 410, grip: 290, fore: "wood", wood: "#7a5230" },
  xm177:      { length: 680, stock: "folding", rx: [270, 450], muzzle: 680, mag: "box", magX: 360, grip: 280, fore: "plastic", wood: "#2a2a2a", carry: true },
  m3:         { length: 640, stock: "wire", rx: [250, 470], muzzle: 640, mag: "stick", magX: 400, grip: 270, fore: "none", wood: "#3a3f45" },
  m45:        { length: 700, stock: "folding", rx: [260, 500], muzzle: 700, mag: "stick", magX: 390, grip: 290, fore: "perforated", wood: "#3a3f45" },
};

/** The attachments each model can take. */
export const FITS: Record<string, AttachmentId[]> = {
  m1_garand:  ["scope", "sights", "trigger", "stock", "bayonet"],
  m14:        ["scope", "sights", "trigger", "extmag", "stock", "bayonet"],
  m16:        ["scope", "sights", "trigger", "extmag", "stock", "bayonet", "suppressor"],
  m1903a4:    ["scope", "trigger", "stock"],
  m21:        ["scope", "trigger", "extmag", "stock", "suppressor"],
  m1897:      ["sights", "extmag", "stock", "bayonet"],
  r870:       ["sights", "extmag", "stock"],
  bar:        ["sights", "trigger", "extmag", "stock"],
  m60:        ["sights", "extmag", "stock"],
  m2_carbine: ["scope", "sights", "extmag", "stock", "bayonet"],
  xm177:      ["scope", "sights", "trigger", "extmag", "stock", "suppressor"],
  m3:         ["sights", "stock", "suppressor"],
  m45:        ["sights", "extmag", "stock", "suppressor"],
};
export const fits = (modelId: string, a: AttachmentId) => (FITS[modelId] ?? []).includes(a);

/** A mount's position on the weapon's side-view frame. */
export function mountAt(modelId: string, m: MountId): [number, number] {
  const f = FRAMES[modelId] ?? FRAMES.m1_garand;
  switch (m) {
    case "optic": return [(f.rx[0] + f.rx[1]) / 2, 44];
    case "rearsight": return [f.rx[1] - 10, 30];
    case "muzzle": return [f.muzzle, 6];
    case "lug": return [f.muzzle - 30, -16];
    case "magazine": return [f.magX, f.mag === "tube" ? -18 : -60];
    case "butt": return [-8, -20];
    case "trigger": return [f.grip + 24, -34];
  }
}
