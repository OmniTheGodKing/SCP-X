// Presentation overhaul P4: attachments only go where the weapon can take them, through the command layer; a fit the
// weapon can no longer take goes back to stores; the bench's figures are the ones combat uses.
import { test, eq, ok } from "./harness";
import { newCampaign, gunFor, weaponOf, reconcileAttachments } from "../../src/campaign/campaign";
import { dispatch } from "../../src/campaign/commands";
import { canFitAttachment, mountsOf, attachmentsFor, weaponStats } from "../../src/campaign/armory";
import { parseCampaign } from "../../src/campaign/save";
import { FITS, FRAMES, MOUNT_OF } from "../../src/data/mounts";
import { MODELS } from "../../src/data/weapons";
import { checkInvariants } from "../../src/campaign/invariants";

function armed() {
  const c = newCampaign({ difficulty: "agent", ironman: false, tutorial: false, seed: 41 });
  c.research.done.push("att_scope", "att_extmag", "att_bayonet", "att_trigger");
  c.attachments = { scope: 2, extmag: 2, bayonet: 1, trigger: 1 };
  const o = c.roster.find(x => weaponOf(x) === "rifle")!;
  return { c, o };
}

test("armory: every model has a frame and a fit list, and every fit has a mount", () => {
  for (const m of MODELS) { ok(!!FRAMES[m.id], `${m.id} frame`); ok((FITS[m.id] ?? []).length > 0, `${m.id} fits`); for (const a of FITS[m.id]) ok(!!MOUNT_OF[a], a); }
});

test("armory: the Garand takes a scope but not an extended magazine (en-bloc clip)", () => {
  const { c, o } = armed();
  eq(c.models.rifle, "m1_garand", "issued the Garand");
  ok(/can't take/.test(canFitAttachment(c, o, "extmag") ?? ""), "no extended magazine");
  eq(canFitAttachment(c, o, "scope"), null, "a scope is fine");
  ok(!mountsOf(c, o).includes("magazine"), "no magazine mount offered");
  ok(attachmentsFor(c, o, "optic").includes("scope"), "the optic mount takes the scope");
  const r = dispatch(c, { type: "fitAttachment", opId: o.id, attachment: "extmag" });
  ok(!r.ok, "the command refuses it");
  eq(o.attachment, undefined, "nothing fitted");
  eq(c.attachments.extmag, 2, "stores untouched");
});

test("armory: fitting takes one from stores, replacing returns the old one, removing returns it", () => {
  const { c, o } = armed();
  ok(dispatch(c, { type: "fitAttachment", opId: o.id, attachment: "scope" }).ok, "fit the scope");
  eq([o.attachment, c.attachments.scope], ["scope", 1], "fitted, one fewer in stores");
  ok(dispatch(c, { type: "fitAttachment", opId: o.id, attachment: "bayonet" }).ok, "swap for a bayonet");
  eq([o.attachment, c.attachments.scope, c.attachments.bayonet], ["bayonet", 2, 0], "scope back in stores");
  ok(dispatch(c, { type: "fitAttachment", opId: o.id, attachment: "" }).ok, "remove");
  eq([o.attachment, c.attachments.bayonet], [undefined, 1], "bayonet back");
  eq(checkInvariants(c), [], "consistent");
});

test("armory: the preview's figures match what combat uses", () => {
  const { c, o } = armed();
  const plain = weaponStats(c, o, ""), scoped = weaponStats(c, o, "scope"), trig = weaponStats(c, o, "trigger");
  eq(scoped.aim - plain.aim, 5, "scope +5 aim");
  eq(trig.crit - plain.crit, 10, "trigger +10% crit");
  dispatch(c, { type: "fitAttachment", opId: o.id, attachment: "scope" });
  eq(weaponStats(c, o).aim, plain.aim + 5, "fitted scope shows");
  eq(gunFor(c, o).attachment, "scope", "and the mission gun carries it");
});

test("armory: a new issued model that can't take the fit sends it back to stores", () => {
  const { c, o } = armed();
  c.models.rifle = "m14";
  ok(dispatch(c, { type: "fitAttachment", opId: o.id, attachment: "extmag" }).ok, "the M14 takes a magazine");
  c.models.rifle = "m1_garand";   // as if reissued the Garand
  eq(gunFor(c, o).attachment, undefined, "combat ignores a fit the weapon can't take");
  const back = reconcileAttachments(c);
  eq(back.length, 1, "returned");
  eq([o.attachment, c.attachments.extmag], [undefined, 2], "back in stores, nothing lost");
});

test("armory: an older save with an impossible fit loads with it back in stores", () => {
  const { c, o } = armed();
  o.attachment = "extmag"; c.attachments.extmag = 1;     // written before compatibility existed
  const loaded = parseCampaign(JSON.stringify(c))!;
  const lo = loaded.roster.find(x => x.id === o.id)!;
  eq([lo.attachment, loaded.attachments.extmag], [undefined, 2], "returned on load");
});
