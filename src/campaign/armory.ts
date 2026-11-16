// Presentation overhaul P4: the armory's rules. Which attachments a weapon can take comes from data (src/data/
// mounts.ts) and is enforced here and in fitAttachment, so the bench can't show a fit the rules wouldn't allow.
// weaponStats mirrors what combat applies (src/game/combat.ts): the preview's numbers are the game's numbers.
import { fitAttachment, gunFor, weaponOf, type Campaign, type Operative } from "./campaign";
import { ATTACHMENT_COST, unlockedAttachments, PROJECTS } from "./research";
import { ATTACHMENTS, TYPES, model, type AttachmentId } from "../data/weapons";
import { FITS, MOUNT_OF, fits, type MountId } from "../data/mounts";

export const modelOf = (c: Campaign, o: Operative) => c.models[weaponOf(o)];
/** The mounts this operative's weapon has (only those some attachment can use). */
export const mountsOf = (c: Campaign, o: Operative): MountId[] => [...new Set((FITS[modelOf(c, o)] ?? []).map(a => MOUNT_OF[a]))];
/** The attachments for one mount of this weapon. */
export const attachmentsFor = (c: Campaign, o: Operative, m: MountId): AttachmentId[] => (FITS[modelOf(c, o)] ?? []).filter(a => MOUNT_OF[a] === m);

/** Why an attachment can't be fitted to this operative's weapon right now ("" removes the fitted one). */
export function canFitAttachment(c: Campaign, o: Operative, a: AttachmentId | ""): string | null {
  if (!o.alive) return "They are dead.";
  if (o.busy && (o.busy.kind === "travel" || o.busy.kind === "contract")) return "They are away from Site-19.";
  if (a === "") return o.attachment ? null : "Nothing is fitted.";
  if (o.attachment === a) return "Already fitted.";
  const m = model(modelOf(c, o));
  if (!fits(m.id, a)) { const n = ATTACHMENTS[a].name.toLowerCase(); return `The ${m.name} can't take ${/^[aeiou]/.test(n) ? "an" : "a"} ${n}.`; }
  if (!unlockedAttachments(c).includes(a)) { const p = Object.values(PROJECTS).find(x => x.attachment === a); return `Not researched yet${p ? ` (${p.name})` : ""}.`; }
  if (!(c.attachments[a] ?? 0)) return `None in stores. The workshop builds one for $${ATTACHMENT_COST.cost}k in ${ATTACHMENT_COST.days} days.`;
  return null;
}
export function fitTo(c: Campaign, o: Operative, a: AttachmentId | "") { if (!canFitAttachment(c, o, a)) fitAttachment(c, o, a); }

export interface WeaponStats { name: string; dmg: [number, number]; mag: number; aim: number; crit: number; notes: string[] }
/** The weapon's figures with a given attachment (the fitted one when omitted), as combat would use them. */
export function weaponStats(c: Campaign, o: Operative, att?: AttachmentId | ""): WeaponStats {
  const g = gunFor(c, o), a = att === undefined ? o.attachment : att || undefined;
  const base = g.attachment === "extmag" ? g.mag - 1 : g.mag;
  const notes: string[] = [];
  if (a === "stock") notes.push("A miss still does 1 damage");
  if (a === "suppressor") notes.push("Shots make no noise");
  if (a === "bayonet") notes.push("3-damage thrust against an adjacent enemy, no ammo");
  return {
    name: g.name, dmg: g.dmg, mag: base + (a === "extmag" ? 1 : 0),
    aim: g.aim + (a === "scope" ? 5 : a === "sights" ? 10 : 0),
    crit: TYPES[g.type].crit + (a === "trigger" ? 10 : 0), notes,
  };
}
