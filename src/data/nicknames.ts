// Nicknames, as XCOM gives its soldiers: handed out when an operative makes Corporal, picked from what they do,
// and changeable on their personnel file.
import type { ClassId } from "./classes";

export const NICKS: Record<ClassId | "any", string[]> = {
  rifleman: ["Deadeye", "Longshot", "Crosshair", "Steady", "Hawk", "Zero", "Trigger", "Range", "Bullseye", "Ghost"],
  breacher: ["Sledge", "Doorknock", "Bulldog", "Rhino", "Tank", "Boom", "Crowbar", "Rampart", "Hammer", "Brick"],
  recon: ["Owl", "Whisper", "Shadow", "Scout", "Lynx", "Radar", "Tracker", "Fox", "Eyes", "Moth"],
  containment: ["Warden", "Lockjaw", "Padlock", "Keeper", "Chain", "Vault", "Shepherd", "Latch", "Gatekeeper", "Bolt"],
  medic: ["Doc", "Patch", "Stitches", "Saint", "Sawbones", "Angel", "Splint", "Mercy", "Tonic", "Iodine"],
  any: ["Lucky", "Ace", "Smokey", "Red", "Tex", "Dutch", "Buck", "Sparky", "Chief", "Mac"],
};
/** A nickname nobody on the roster already has. */
export function pickNick(cls: ClassId | undefined, taken: Set<string>): string {
  const pool = [...(cls ? NICKS[cls] : []), ...NICKS.any].filter(n => !taken.has(n));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : NICKS.any[Math.floor(Math.random() * NICKS.any.length)];
}
/** Given name, nickname in quotes, family name: Robert "Doc" Bishop. */
export function withNick(name: string, nick?: string) {
  if (!nick) return name;
  const i = name.indexOf(" ");
  return i < 0 ? `${name} "${nick}"` : `${name.slice(0, i)} "${nick}"${name.slice(i)}`;
}
