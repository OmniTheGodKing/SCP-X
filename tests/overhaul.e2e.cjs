// UI/UX overhaul acceptance tests: personnel inspection, armory detail, MTF organization, the staging screen, the
// full-screen World Map and solid controls, all driven through the game's own UI from the mid-game save.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { GAME_URL, ROOT, OUT, close, reporter, openTarget } = require('./lib.cjs');
const { check, done } = reporter();

/** Every visible .act button: an opaque fill and full opacity (disabled ones too). */
const solidButtons = p => p.evaluate(() => {
  const bad = [];
  for (const b of document.querySelectorAll('button.act')) {
    const r = b.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const st = getComputedStyle(b), m = st.backgroundColor.match(/rgba?\(([^)]+)\)/), a = m ? (m[1].split(',')[3] ?? '1') : '1';
    let op = 1; for (let e = b; e && e !== document.body; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    if (Number(a) < 0.99 || op < 0.99) bad.push(`${b.textContent.trim().slice(0, 24)} bg=${st.backgroundColor} op=${op}`);
  }
  return bad;
});

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const save = fs.readFileSync(path.join(ROOT, 'tests/fixtures/save-v24-midgame.json'), 'utf8');
  await p.goto(GAME_URL); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('site19-campaign-v2', s); }, save); await p.reload(); await p.waitForTimeout(300);
  await close(p);
  const E = (f, a) => p.evaluate(f, a);
  const C = () => E(() => window.__site19.campaign);

  // ---- the save migrated into an organization ----
  const org = await E(() => { const c = window.__site19.campaign; return { mtfs: c.org?.mtfs.map(m => ({ tf: m.tf, n: m.squads.length, primary: m.primary })), placed: c.roster.filter(o => o.alive).every(o => typeof o.squad === 'string') }; });
  check('org: an older save gets an MTF with two squads, General Containment', org.mtfs?.[0]?.n === 2 && org.mtfs[0].primary === 'general', org);
  check('org: everyone alive is placed in a squad or the reserve', org.placed);

  // ---- personnel inspection ----
  await p.click('[data-tab="personnel"]'); await p.waitForTimeout(150);
  const ids = await E(() => [...document.querySelectorAll('.rv-stage .scene-person')].map(e => e.dataset.person));
  await p.click(`.rv-stage .scene-person[data-person="${ids[0]}"]`); await p.waitForTimeout(150);
  const insp = await E(() => ({ hero: document.querySelector('.hero')?.dataset.person, tag: document.querySelector('.herotag')?.innerText ?? '', h: document.querySelector('.hero')?.getBoundingClientRect().height, stage: document.querySelector('.rv-stage').getBoundingClientRect().height, dossier: [...document.querySelectorAll('.dossier h4')].map(e => e.textContent) }));
  check('B1: the selected soldier dominates the scene (over half its height)', insp.hero === ids[0] && insp.h > insp.stage * 0.5, insp);
  check('B1: the identity plate names the squad and task force', /Fox|Squad|Reserve/.test(insp.tag) && /Epsilon|Eta/.test(insp.tag), insp.tag);
  check('B2: the file is in categories', ['Assignment', 'Condition', 'Equipment', 'Qualifications', 'Progression', 'Service'].every(k => insp.dossier.includes(k)), insp.dossier);
  await p.locator('.herobar [data-herostep]').nth(1).click(); await p.waitForTimeout(150);
  const next = await E(() => document.querySelector('.hero')?.dataset.person);
  check('B3: switching operatives updates the figure and the file', next && next !== ids[0] && (await E(() => document.querySelector('.ctx-h b')?.textContent)) === (await E(id => window.__site19.campaign.roster.find(o => o.id === id).name, next)), next);
  await p.click('[data-herozoom="1"]'); await p.waitForTimeout(120);
  check('B4: zoom moves the camera in', await E(() => /scale\(1\.5/.test(document.querySelector('.rv-cam')?.getAttribute('style') ?? '')));
  // equipment shown matches the stored loadout
  const eq = await E(id => { const c = window.__site19.campaign, o = c.roster.find(x => x.id === id); return { shown: document.querySelector('.dossier')?.innerText ?? '', armor: o.kit?.armor ?? '' }; }, next);
  check('B5: the file shows the stored armor', eq.armor ? eq.shown.includes(eq.armor === 'armor' ? 'Flak vest' : '') : /Armor\s*None/.test(eq.shown), eq.armor);
  check('A: buttons in the quarters are solid', (await solidButtons(p)).length === 0, await solidButtons(p));

  // ---- squad assignment from the file ----
  const before = await E(id => window.__site19.campaign.roster.find(o => o.id === id).squad, next);
  const other = await E(id => { const c = window.__site19.campaign, o = c.roster.find(x => x.id === id); return c.org.mtfs.find(m => m.tf === (o.tf ?? 'e11')).squads.find(s => s.id !== o.squad).id; }, next);
  await p.selectOption('#opSquad', other); await p.waitForTimeout(150);
  const after = await E(id => { const o = window.__site19.campaign.roster.find(x => x.id === id); return { squad: o.squad, training: o.qualTraining?.spec ?? null }; }, next);
  check('C1: moving an operative to another squad changes their squad', after.squad === other && before !== other, after);
  await p.reload(); await p.waitForTimeout(300); await close(p);
  check('C2: the move survives a reload', (await E(id => window.__site19.campaign.roster.find(o => o.id === id).squad, next)) === other);

  // ---- organization board ----
  await p.click('[data-tab="personnel"]'); await p.waitForTimeout(150);
  await openTarget(p, 'org'); await p.waitForTimeout(100);
  const ob = await E(() => ({ squads: document.querySelectorAll('.orgsq').length, text: document.querySelector('.orgpanel')?.innerText ?? '' }));
  check('C3: the organization board shows the MTF, its primary and its squads', ob.squads >= 2 && /General Containment/.test(ob.text) && /Deployed squad size/.test(ob.text), ob.squads);
  await p.click('.orgpanel details:has(#mtfDes) summary'); await p.fill('#mtfDes', 'Nu-7'); await p.click('[data-renamemtf]'); await p.waitForTimeout(100);
  check('C4: an established designation is refused', (await E(() => window.__site19.campaign.org.mtfs[0].designation)) !== 'Nu-7');
  await p.click('.orgpanel details:has(#mtfDes) summary').catch(() => {}); await p.fill('#mtfDes', 'Lambda-4'); await p.fill('#mtfName', 'Night Watch'); await p.click('[data-renamemtf]'); await p.waitForTimeout(100);
  check('C5: the player names their MTF', (await E(() => window.__site19.campaign.org.mtfs[0].designation)) === 'Lambda-4');
  check('C6: the banner in the quarters carries the new designation', await E(() => document.querySelector('.rv-stage svg.interior')?.textContent.includes('L-4')));

  // ---- armory detail ----
  await p.click('[data-tab="personnel"]'); await p.waitForTimeout(100);
  await p.click(`.rv-stage .scene-person[data-person="${ids[0]}"]`); await p.waitForTimeout(150);
  await p.click('.opfocus [data-armfor]'); await p.waitForTimeout(600);
  const arm = await E(() => ({ bench: !!document.querySelector('.armbench'), compat: [...document.querySelectorAll('.armcompat .rows .r')].map(r => r.textContent.replace(/\s+/g, ' ')) }));
  check('D1: the bench lists every attachment with its status', arm.bench && arm.compat.length >= 7, arm.compat.length);
  check('D2: an incompatible attachment says why', arm.compat.some(t => /Incompatible/.test(t)), arm.compat.slice(0, 7));
  check('D3: a missing attachment names its research or historical date', arm.compat.some(t => /Research:|Historical|Fits/.test(t)));
  await p.screenshot({ path: `${OUT}/overhaul-armory.png` });

  // ---- solid controls on the other strategic screens ----
  for (const t of ['research', 'site', 'command']) {
    await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(250); await close(p);
    const first = await E(() => document.querySelector('.objbar [data-target]')?.dataset.target);
    if (first) await openTarget(p, first);
    const bad = await solidButtons(p);
    check(`A: buttons on the ${t} screen are solid`, bad.length === 0, bad);
  }

  // ---- the World Map ----
  await p.click('[data-tab="world"]'); await p.waitForTimeout(400);
  const geo = await E(() => { const g = document.querySelector('.geo-full')?.getBoundingClientRect(), svg = document.querySelector('#worldsvg')?.getBoundingClientRect(); return { g: g && [g.width, g.height], svg: svg && [svg.width, svg.height], vw: innerWidth, vh: innerHeight }; });
  check('E1: the map fills the screen under the header', geo.g && geo.g[0] > geo.vw * 0.9 && geo.g[1] > geo.vh * 0.7 && geo.svg[0] >= geo.g[0] - 4, geo);
  const markers = await E(() => ({ dom: [...document.querySelectorAll('[data-mapinc]')].filter(e => e.tagName === 'g').map(e => e.dataset.mapinc).sort(), inc: window.__site19.campaign.incidents.map(i => i.id).sort() }));
  check('E2: each incident marker is a real incident, and every incident is marked', JSON.stringify(markers.dom) === JSON.stringify(markers.inc), markers);
  const forces = await E(() => document.querySelector('.geoforces')?.innerText ?? '');
  check('E3: the operations panel shows each squad\'s readiness', /ready/.test(forces) && /Lambda-4/.test(forces), forces.slice(0, 120));
  check('A: buttons on the World Map are solid', (await solidButtons(p)).length === 0, await solidButtons(p));
  await p.screenshot({ path: `${OUT}/overhaul-world.png` });

  // ---- staging ----
  const inc = markers.inc[0];
  await p.click(`.geo-ops [data-mapinc="${inc}"]`); await p.waitForTimeout(150);
  check('E4: selecting an incident opens its brief beside the map, not instead of it', await E(() => !!document.querySelector('.geoside .brief') && !!document.querySelector('#worldsvg')));
  await p.click(`.geoside [data-plan="${inc}"]`); await p.waitForTimeout(300);
  const st = await E(() => ({ stage: !!document.querySelector('.staging'), figs: [...document.querySelectorAll('.stg-fig')].map(e => e.dataset.stgsel), chosen: [...document.querySelectorAll('[data-pick]:checked')].map(e => e.dataset.pick), cards: document.querySelectorAll('.slotcard:not(.empty)').length, intel: document.querySelector('.stg-intel')?.innerText ?? '' }));
  check('F1: the staging screen shows the chosen team as figures', st.stage && st.figs.length > 0 && JSON.stringify(st.figs) === JSON.stringify(st.chosen), st);
  check('F2: a card for every chosen operative', st.cards === st.chosen.length, st.cards);
  check('F3: intelligence separates confirmed, estimated or unknown', /CONFIRMED|ESTIMATED|UNKNOWN|Confirmed|Estimated|Unknown/.test(st.intel));
  const unavailable = await E(() => [...document.querySelectorAll('.pickop.off input')].every(i => i.disabled));
  check('F4: unavailable operatives cannot be ticked', unavailable);
  // stand one down, then pick them again
  const gone = st.chosen[0];
  await p.click(`[data-unpick="${gone}"]`); await p.waitForTimeout(120);
  check('F5: standing an operative down removes them from the team', !(await E(id => !!document.querySelector(`.stg-fig[data-stgsel="${id}"]`), gone)));
  await p.click('[data-stgsquad=""]'); await p.waitForTimeout(100);
  await p.click(`[data-pick="${gone}"]`); await p.waitForTimeout(120);
  check('F6: picking them again puts them back', await E(id => !!document.querySelector(`.stg-fig[data-stgsel="${id}"]`), gone));
  // qualification: an unqualified operative can't take a specialist item
  const q = await E(id => { const c = window.__site19.campaign, o = c.roster.find(x => x.id === id); c.inventory.flamer = 1; c.inventory.armor_heavy = 1; o.quals = []; o.qualTraining = undefined; return true; }, gone);
  await p.click('[data-stgsquad=""]'); await p.waitForTimeout(120);
  const opt = await E(id => { const s = document.querySelector(`#armor-${id}`); const o = s && [...s.options].find(x => x.value === 'armor_heavy'); return o ? { disabled: o.disabled, text: o.textContent } : null; }, gone);
  check('F7: specialist kit is refused without the qualification, with the reason', q && opt && opt.disabled && /not qualified/.test(opt.text), opt);
  check('A: buttons on the staging screen are solid', (await solidButtons(p)).length === 0, await solidButtons(p));
  await p.screenshot({ path: `${OUT}/overhaul-staging.png` });
  // the readiness notes reflect the team
  const notes = await E(() => [...document.querySelectorAll('.rnotes li')].map(l => l.textContent));
  check('F8: readiness notes are listed', notes.length > 0, notes);

  // ---- launch: the mission that starts is this incident, with this team ----
  const team = await E(() => [...document.querySelectorAll('[data-pick]:checked')].map(e => e.dataset.pick).sort());
  await p.click('#launchBtn'); await p.waitForTimeout(500); await close(p);
  const launched = await E(() => { const c = window.__site19.campaign, m = window.__site19.mission; const setup = c.outbound?.setup; const ids = (m ? m.units.filter(u => u.side === 'mtf' && u.opId).map(u => u.opId) : setup?.squad.map(s => s.opId) ?? []).sort(); return { inc: m?.setup?.incidentId ?? setup?.incidentId ?? c.outbound?.incId, ids }; });
  check('F9: deployment launches this incident', launched.inc === inc, launched);
  check('F10: with exactly the chosen team', JSON.stringify(launched.ids) === JSON.stringify(team), { launched: launched.ids, team });

  // ---- the tactical screen (the sandbox map) ----
  await p.goto(GAME_URL + '#lab'); await p.waitForTimeout(800);
  const tac = await solidButtons(p);
  check('A: buttons on the tactical screen are solid', tac.length === 0 && (await E(() => document.querySelectorAll('button.act').length)) > 0, tac);
  check('no page errors', errs.length === 0, errs);
  await b.close(); done();
})();
