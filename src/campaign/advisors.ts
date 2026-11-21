// Site-19's department heads: Dr. Catherine Bell (Research), Vincent Russo (Engineering) and Krista Carter (Operations).
// What each one says is read from the campaign as it stands: recent deaths and mission results from the history,
// finished research from the site log, open incidents, idle staff, power, damage and the workshop queue. Nothing
// here changes the campaign; each remark can point the player at the place to act on it.
import type { Campaign } from "./campaign";
import { dateText, fieldName, pendingBreach } from "./campaign";
import { FACILITIES, engineersFree, powerShort } from "./base";
import { unpowered } from "./containment";
import { geoOf } from "./org";
import { ATTACHMENTS, AMMO } from "../data/weapons";
import { ITEMS, PROJECTS, has, offered, projectDays, researchersFree } from "./research";

export type AdvisorId = "bell" | "russo" | "carter";
export interface Advisor { id: AdvisorId; name: string; title: string; dept: string; }
export const ADVISORS: Record<AdvisorId, Advisor> = {
  bell: { id: "bell", name: "Dr. Catherine Bell", title: "Director of Research", dept: "Research" },
  russo: { id: "russo", name: "Vincent Russo", title: "Chief Engineer", dept: "Engineering" },
  carter: { id: "carter", name: "Krista Carter", title: "Chief of Operations", dept: "Operations" },
};

/** A remark, how pressing it is, and where to go about it (a hub tab, or an incident to plan). */
export interface Remark { text: string; tone: "urgent" | "grave" | "good" | "plain"; goto?: string; plan?: string; label?: string; }

const recent = (c: Campaign, days: number) => (c.history ?? []).filter(h => c.day - h.day <= days);
const recentLog = (c: Campaign, days: number) => (c.log ?? []).filter(l => c.day - l.day <= days);

export function remark(c: Campaign, who: AdvisorId): Remark {
  switch (who) {
    case "carter": {
      const b = pendingBreach(c);
      if (b) return { text: `${b.title.split(":")[0]} is live inside the site. Epsilon-11 goes now or Site Security holds it alone.`, tone: "urgent", plan: b.id, label: "Plan the response" };
      const m = c.mtfs?.[0];
      if (m && c.day - m.founded <= 6 && !c.incidents.length) return { text: `${m.designation} has its charter and two squads: ${m.squads.map(q => q.name).join(" and ")}. Epsilon\u201111 won't be there next time. Get them drilled and kitted before the first call.`, tone: "plain", goto: "personnel", label: "Barracks" };
      const dead = recent(c, 10).filter(h => h.cat === "casualty");
      if (dead.length) {
        const fallen = c.roster.filter(o => !o.alive && o.diedDay !== undefined && c.day - o.diedDay <= 10);
        const names = fallen.map(o => fieldName(o)).slice(0, 2);
        return { text: names.length ? `We buried ${names.join(" and ")}${fallen.length > 2 ? ` and ${fallen.length - 2} more` : ""} this week. Rotate the tired ones out before the next call comes.` : `We lost people this week. Rotate the tired ones out before the next call comes.`, tone: "grave", goto: "personnel", label: "Barracks" };
      }
      const open = [...c.incidents].sort((a, z) => a.expires - z.expires);
      if (open.length) {
        const first = open[0];
        return { text: open.length === 1 ? `One incident on the board: ${first.title}. The window closes ${dateText(first.expires)}.` : `${open.length} incidents on the board. ${first.title} closes first, on ${dateText(first.expires)}.`, tone: "plain", plan: first.id, label: "Plan it" };
      }
      const won = recent(c, 7).filter(h => h.cat === "deployment");
      if (won.length) return { text: `${won[won.length - 1].text} The squad's back and the board is clear for now.`, tone: "good", goto: "world", label: "World map" };
      if (c.exposure >= 60) return { text: `Exposure is at ${c.exposure}. Another public incident and a front could fold. Cover-ups take priority.`, tone: "urgent", goto: "world", label: "World map" };
      if (c.council.standing < 40) return { text: `The Council's patience is thin, standing ${c.council.standing}. We need a clean result to show them.`, tone: "grave", label: "Council orders" };
      return { text: "Board's clear. Let the clock run on the world map; something will surface.", tone: "plain", goto: "world", label: "World map" };
    }
    case "bell": {
      if (c.site && c.day - c.site.founded <= 10 && c.research.done.length === 0 && researchersFree(c) > 0) return { text: `The instance from ${"Provisional Site-11"} is in our wing now, and nobody here has studied one closely yet. I'd start with its containment research before anything else.`, tone: "plain" };
      const done = recentLog(c, 7).filter(l => l.text.startsWith("Research complete:"));
      if (done.length) {
        const name = done[done.length - 1].text.replace("Research complete: ", "").split(".")[0];
        return { text: `${name} is finished and written up. ${researchersFree(c) > 0 ? "That frees hands for the next project." : "The team has already moved on."}`, tone: "good" };
      }
      const offer = c.research.offer;
      if (offer && !has(c, offer.id) && offered(c, offer.id)) return { text: `There's a breakthrough within reach: ${PROJECTS[offer.id].name}. The window closes ${dateText(offer.until)}.`, tone: "urgent" };
      if (c.research.testing) return { text: "A test is running in SCP-173's cell. Nobody in that room blinks without calling it.", tone: "plain" };
      const idle = researchersFree(c);
      if (idle > 0 && c.researchers) return { text: `${idle === c.researchers ? "My whole department is" : idle === 1 ? "One of my researchers is" : `${idle} of my researchers are`} sitting idle. Give them a project.`, tone: "urgent" };
      const fresh = recent(c, 14).filter(h => h.cat === "anomaly");
      if (fresh.length) return { text: `${fresh[fresh.length - 1].text} I want my people on it before anyone else touches it.`, tone: "plain" };
      const active = Object.entries(c.research.assigned).filter(([, n]) => n > 0).map(([id]) => id);
      if (active.length) {
        const id = active.sort((a, z) => (c.research.progress[z] ?? 0) / projectDays(c, z) - (c.research.progress[a] ?? 0) / projectDays(c, a))[0];
        const left = Math.max(0, projectDays(c, id) - (c.research.progress[id] ?? 0));
        return { text: `${PROJECTS[id]?.name ?? id} is closest: about ${Math.ceil(left / Math.max(1, c.research.assigned[id]))} more days with the people on it now.`, tone: "plain" };
      }
      return { text: "Every bench is covered. Hire more staff at a research lab if you want more at once.", tone: "plain", goto: "site", label: "Site-19" };
    }
    case "russo": {
      if (c.site && c.day - c.site.founded <= 10 && !c.base.facilities.some(f => f.type === "workshop")) {
        const g = geoOf(c);
        return { text: `${c.site.designation} is a hole in the ground with a generator in it. ${g && g.remoteness > 0.6 ? `Every crate comes up from ${g.hub}, so supplies cost us more out here.` : g ? `${g.hub} is close, which keeps supplies cheap.` : ""} A workshop first, then barracks space and a training range.`, tone: "plain", goto: "site", label: "Site-19" };
      }
      if (powerShort(c)) return { text: `We're drawing more power than the generators make. ${unpowered(c) ? "Containment wings are running on prayer." : "The backups are holding containment, for now."} Build or refit a generator.`, tone: "urgent", goto: "site", label: "Site-19" };
      const broken = c.base.facilities.filter(f => f.disabled && !(f.repairDays > 0));
      if (broken.length) return { text: `${FACILITIES[broken[0].type].name}${broken.length > 1 ? ` and ${broken.length - 1} more` : ""} took damage and nobody's on the repair yet.`, tone: "urgent", goto: "site", label: "Site-19" };
      const order = [...c.orders].sort((a, z) => a.daysLeft - z.daysLeft)[0];
      const building = c.base.facilities.filter(f => f.daysLeft > 0).sort((a, z) => a.daysLeft - z.daysLeft)[0];
      if (building) return { text: `${FACILITIES[building.type].name} on level ${building.level + 1}: ${building.daysLeft} more day${building.daysLeft === 1 ? "" : "s"} of pouring and wiring.${order ? ` The workshop's busy too.` : ""}`, tone: "plain", goto: "site", label: "Site-19" };
      if (order) {
        const what = order.item ? ITEMS[order.item].name : order.attachment ? ATTACHMENTS[order.attachment].name : order.ammo ? AMMO[order.ammo].name : "the refit";
        return { text: `${what} comes off the bench in ${order.daysLeft} day${order.daysLeft === 1 ? "" : "s"}.${c.orders.length > 1 ? ` ${c.orders.length - 1} more in the queue behind it.` : ""}`, tone: "plain", goto: "armory", label: "Armory" };
      }
      if (c.engineers && engineersFree(c) <= 0) return { text: "Every engineer I have is on a job. New work waits until someone's free.", tone: "plain" };
      return { text: `${engineersFree(c)} engineer${engineersFree(c) === 1 ? "" : "s"} free and nothing on the bench. Give us something to build.`, tone: "plain", goto: "site", label: "Site-19" };
    }
  }
}
