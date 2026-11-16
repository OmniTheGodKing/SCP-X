// Credits and licences (Strategic overhaul I8): every SCP used in the game, its article, and its author where it has
// been confirmed. The SCP Wiki's content is CC BY-SA 3.0, and so is this game. Authors marked "to be confirmed" still
// need checking on the wiki before release: the session that wrote this list could not reach it.
import { esc } from "./util";

export const SCP_CREDITS: [string, string, string][] = [
  ["SCP-173", "Moto42", "https://scpwiki.com/scp-173"],
  ["SCP-049", "Gabriel Jade", "https://scpwiki.com/scp-049"],
  ["SCP-106", "DrGears", "https://scpwiki.com/scp-106"],
  ["SCP-610", "author to be confirmed", "https://scpwiki.com/scp-610"],
  ["SCP-096", "author to be confirmed", "https://scpwiki.com/scp-096"],
  ["SCP-012", "author to be confirmed", "https://scpwiki.com/scp-012"],
  ["SCP-939", "author to be confirmed", "https://scpwiki.com/scp-939"],
  ["SCP-035", "author to be confirmed", "https://scpwiki.com/scp-035"],
  ["SCP-682", "author to be confirmed", "https://scpwiki.com/scp-682"],
  ["SCP-500", "author to be confirmed", "https://scpwiki.com/scp-500"],
  ["SCP-914", "author to be confirmed", "https://scpwiki.com/scp-914"],
  ["SCP-005", "author to be confirmed", "https://scpwiki.com/scp-005"],
];

export function creditsHtml() {
  return `<div class="label">Credits and licences</div>
    <p>The SCP Foundation and its anomalies, Site-19, the O5 Council, Mobile Task Force Epsilon-11, D-Class personnel, the Chaos Insurgency, the Global Occult Coalition and the object classes come from the <a href="https://scpwiki.com" target="_blank" rel="noopener">SCP Wiki</a>, licensed under <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>. This game is shared under the same licence.</p>
    <ul class="why">${SCP_CREDITS.map(([scp, who, url]) => `<li><b>${esc(scp)}</b>: <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace("https://", ""))}</a>, by ${esc(who)}</li>`).join("")}</ul>
    <p class="muted">The SCP-173 figure is an original placeholder drawing; the original sculpture photograph is not covered by the wiki's licence and is not used. All other art is drawn in code for this game.</p>
    <p class="muted">World map coastlines: <a href="https://www.naturalearthdata.com" target="_blank" rel="noopener">Natural Earth</a> (public domain), via the world-atlas package (ISC licence, Mike Bostock). All sound is synthesized in code for this game.</p>`;
}
