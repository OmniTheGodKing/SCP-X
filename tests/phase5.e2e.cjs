// Phase 5 acceptance: the title screen, the SCP-173 opening, site founding, the first custom MTF, squads and their
// specialist kit, deploy capacity, historical dates, deployments from the World Map, hands-off operations and their
// consequences, and save/load. Run after `npm run build`: node tests/phase5.e2e.cjs
const { chromium } = require('playwright');
const results = [];
const check = (ok, what, detail = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', what, detail ? `:: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + require('path').join(__dirname, '..', 'dist', 'index.html');
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload();
  const C = (f, a) => p.evaluate(f, a);

  // 1. the title screen
  check(await p.isVisible('.menu .mnav') && (await p.textContent('.mnav')).includes('New Game') && (await p.textContent('.mnav')).includes('Load Game') && (await p.textContent('.mnav')).includes('Exit'), '1. the game launches into the main menu');
  await p.click('[data-view="new"]');
  const eras = await C(() => [...document.querySelectorAll('[data-era]')].map(e => [e.dataset.era, e.disabled]));
  check(eras.find(e => e[0] === 'full')[1] === false && eras.filter(e => e[0] !== 'full').every(e => e[1]), 'other historical starts are listed and marked unavailable', eras);

  // 2-4. straight into the SCP-173 opening, commanding Epsilon-11, with no site selection first
  await p.click('#mBegin'); await p.waitForTimeout(600);
  const op = await C(() => { const A = window.__site19, c = A.campaign, S = A.mission; return { phase: c.phase, site: !!c.site, mtfs: !!c.mtfs, scp: S?.scp, kind: S?.setup.kind, team: S?.units.filter(u => u.side === 'mtf' && !u.guard).map(u => u.call ?? u.name), loan: c.roster.every(o => o.loan), mtfTurn: S?.setup.mtfTurn, sitepick: !!document.querySelector('.sitepick') }; });
  check(op.phase === 'opening' && op.kind === 'breach' && op.scp === '173', '2. a new Full Campaign enters the SCP-173 mission immediately', op);
  check(!op.site && !op.mtfs && !op.sitepick, '3. no site selection or MTF before the opening mission', op);
  check(op.loan && op.mtfTurn === 1, '4. the player commands the loaned Epsilon-11 detachment from the first turn', op);

  // 5. finishing it leads to Carter's debrief, then site placement
  await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click('[data-dbg="win"]'); await p.waitForTimeout(600);
  await p.click('#returnBtn'); await p.waitForTimeout(400);
  const deb = await p.isVisible('.found.debrief') && (await p.textContent('.found.debrief')).includes('Krista Carter');
  await p.click('#fNext'); await p.waitForTimeout(400);
  check(deb && await p.isVisible('.found.sitepick'), '5. after the mission: Carter\'s debriefing, then site placement');

  // 9. Epsilon-11 went home
  const e11 = await C(() => { const c = window.__site19.campaign; return { loan: c.roster.filter(o => o.loan).length, returned: c.loanReturned?.names.length, people: c.roster.length }; });
  check(e11.loan === 0 && e11.returned >= 1 && e11.people >= 10, '9. Epsilon-11 does not stay: the detachment returned and the site has its own people', e11);

  // 6-7. land and water
  const at = async (lon, lat) => p.evaluate(([lon, lat]) => { const svg = document.querySelector('.globe'); const pt = svg.createSVGPoint(); pt.x = lon + 180; pt.y = 90 - lat; const q = pt.matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [lon, lat]);
  let [x, y] = await at(-40, 35); await p.mouse.click(x, y); await p.waitForTimeout(200);
  const water = await p.textContent('.mapflash').catch(() => '');
  const geo = await C(() => { const o = window.__site19.org; return { atlantic: o.onLand(-40, 35), pacific: o.onLand(-150, 0), denver: o.onLand(-105, 39), paris: o.onLand(2.3, 48.9), nairobi: o.onLand(36.8, -1.3) }; });
  check(/water/i.test(water) && !geo.atlantic && !geo.pacific && geo.denver && geo.paris && geo.nairobi, '6. placement accepts land and rejects water', { water, geo });
  const rand = await C(() => { const o = window.__site19.org; return Array.from({ length: 60 }, () => o.randomLand()).every(([lo, la]) => o.onLand(lo, la)); });
  check(rand, '7. random placement always lands on land (60 tries)');
  [x, y] = await at(-105, 39); await p.mouse.click(x, y); await p.waitForTimeout(200);
  await p.fill('#fDesig', 'Site-41'); await p.fill('#fName', 'Front Range Annex'); await p.click('#fConfirm'); await p.waitForTimeout(400);

  // 10-13. the first MTF
  const firstSpec = await C(() => document.querySelector('.specbox select') === null && document.querySelector('.specbox b')?.textContent);
  await p.fill('#mName', 'Iron Watch'); await p.press('#mName', 'Tab');
  let names = await p.$$('input[data-sqname]'); await names[0].fill('Vanguard'); await names[0].press('Tab');
  names = await p.$$('input[data-sqname]'); await names[1].fill('Sentinel'); await names[1].press('Tab');
  await p.click('[data-sqspec="1"][data-id="breach"]');
  const specOpts = await C(() => [...document.querySelectorAll('[data-sqspec="0"]')].map(b => b.dataset.id));
  await p.click('#mFound'); await p.waitForTimeout(600);
  const m = await C(() => { const c = window.__site19.campaign; const m = c.mtfs?.[0]; return { phase: c.phase, d: m?.designation, n: m?.name, spec: m?.spec, sq: m?.squads.map(s => [s.name, s.specialty]), site: c.site }; });
  check(firstSpec === 'General Containment' && m.spec === 'general', '10. the first MTF is General Containment, fixed', { firstSpec, spec: m.spec });
  check(m.n === 'Iron Watch' && m.sq?.[0][0] === 'Vanguard' && m.sq?.[1][0] === 'Sentinel' && m.sq.length === 2, '11. the MTF and both squads take the player\'s names', m);
  const restrict = await C(() => { const A = window.__site19, c = A.campaign, o = A.org; const sq = c.mtfs[0].squads[0];
    return { offered: null, retrainBio: o.retrainSquad(c, sq, 'quarantine'), draftBio: o.canFoundMtf(c, { designation: 'Tau-5', name: 'x', spec: 'general', squads: [{ name: 'a', specialty: 'incendiary', members: c.roster.slice(0, 4).map(x => x.id) }, { name: 'b', specialty: 'breach', members: c.roster.slice(4, 8).map(x => x.id) }] }, true) }; });
  check(JSON.stringify(specOpts) === JSON.stringify(['breach', 'security', 'recovery', 'fire']) && !!restrict.retrainBio && /isn't a General Containment specialty/.test(restrict.draftBio), '12. squad specialties are limited to the MTF\'s specialization', { specOpts, restrict });
  check(m.sq[0][1] === 'breach' && m.sq[1][1] === 'breach', '13. two squads can take the same specialty', m.sq);
  const sep = await C(() => { const c = window.__site19.campaign, o = c.roster.find(x => x.squad); return { mtfSpec: c.mtfs[0].spec, squadSpecialty: c.mtfs[0].squads[0].specialty, cls: o.cls ?? null, opHasNoSpec: !('specialty' in o) && !('spec' in o) }; });
  check(sep.mtfSpec === 'general' && sep.squadSpecialty === 'breach' && sep.opHasNoSpec, '14. MTF specialization, squad specialty and soldier class are separate', sep);
  check(m.site?.designation === 'Site-41' && m.site?.region === 'west_us' && m.site?.id !== 'site-19' && !m.phase, '8a. the site is founded with its own id, name and region', m.site);

  // 15-16. deploy capacity
  const cap = await C(() => { const A = window.__site19, c = A.campaign; const a = [A.org.deployCap(c), A.security.squadSize(c)]; c.research.done.push('doctrine_6'); const b6 = A.org.deployCap(c); c.research.done.push('doctrine_8'); const b8 = A.org.deployCap(c); c.research.done = c.research.done.filter(x => !x.startsWith('doctrine')); return { start: a, six: b6, eight: b8, projects: ['doctrine_6', 'doctrine_8'].map(id => A.research.PROJECTS[id].branch) }; });
  check(cap.start[0] === 4 && cap.start[1] === 4, '15. the initial deployment is four', cap);
  check(cap.six === 6 && cap.eight === 8 && cap.projects.every(b => b === 'Personnel'), '16. six and eight come from Foundation-wide research, not per MTF', cap);

  // 18. specialist kit and training
  const kit = await C(() => { const A = window.__site19, c = A.campaign, o = A.org; const [s1, s2] = c.mtfs[0].squads; const a = c.roster.find(x => x.squad === s1.id), r = c.roster.find(x => !x.squad);
    const before = { charge: o.qualifiedFor(c, a, 'breach_charge'), barricade: o.qualifiedFor(c, a, 'barricade'), reserve: r ? o.qualifiedFor(c, r, 'breach_charge') : 'n/a', rifleKit: o.qualifiedFor(c, a, 'frag') };
    const range = { type: 'training', daysLeft: 0, x: -9, y: -9 }; const hadRange = c.base.facilities.some(f => f.type === 'training' && f.daysLeft === 0 && !f.disabled); if (!hadRange) c.base.facilities.push(range); o.retrainSquad(c, s1, 'security'); const during = o.qualifiedFor(c, a, 'barricade'); const d0 = c.day; c.day += 15; o.tickOrg(c); const after = o.qualifiedFor(c, a, 'barricade'); c.day = d0; o.retrainSquad(c, s1, 'breach'); s1.retrainUntil = undefined; if (!hadRange) c.base.facilities.splice(c.base.facilities.indexOf(range), 1);
    return { before, during, after, workshop: A.research.unlockedItems(c).includes('breach_charge') }; });
  check(!kit.before.charge && !!kit.before.barricade && !!kit.before.reserve && !kit.before.rifleKit && !!kit.during && !kit.after && kit.workshop, '18. specialist kit follows squad training and retraining; ordinary kit stays open', kit);

  // 19. historical dates
  const hist = await C(() => { const A = window.__site19, c = A.campaign; const proj = A.research.PROJECTS; return { tracker1951: A.research.projectVisible(c, 'motion_tracker') && !A.research.projectLock(c, 'motion_tracker'), trackerFrom: proj.motion_tracker.from, doctrine8From: proj.doctrine_8.from, models: Object.values(c.models) }; });
  check(!hist.tracker1951 && hist.trackerFrom === 1966 && hist.models.every(id => ['m1_garand', 'm1903a4', 'm1897', 'bar', 'm2_carbine', 'm3'].includes(id)), '19. equipment respects historical dates (1951 issue weapons, no 1966 sensor)', hist);

  // 17, 8b, 26. persistence through save and reload
  await C(() => { const c = window.__site19.campaign; const o = c.roster.find(x => x.squad); o.injury = { name: 'Broken arm', until: c.day + 20 }; o.hp = 2; c.roster.find(x => x.squad && x !== o).alive = false; c.roster.find(x => x.squad && x !== o && x.alive).diedDay = 0; window.__site19.save(); });
  await p.click('[data-tab="command"]'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(300);
  check(await p.isVisible('#mContinue:not([disabled])'), '26a. the menu offers Continue for the saved campaign');
  await p.click('#mContinue'); await p.waitForTimeout(500);
  const per = await C(() => { const c = window.__site19.campaign; return { site: c.site?.designation, name: c.site?.name, mtf: c.mtfs?.[0]?.name, injured: c.roster.filter(o => o.injury && o.injury.until > c.day).length, dead: c.roster.filter(o => !o.alive).length, menu: !!document.querySelector('.menu'), hub: !!document.querySelector('main.hub'), opening: !!window.__site19.mission && c.phase === 'opening' }; });
  check(per.site === 'Site-41' && per.name === 'Front Range Annex' && per.mtf === 'Iron Watch', '8. site location and naming persist through a save', per);
  check(per.injured >= 1 && per.dead >= 1, '17. injuries and deaths persist', per);
  check(per.hub && !per.opening, '26. loading continues the campaign without replaying the opening', per);
  const shown = await p.textContent('main.hub');
  check(shown.includes('Site-41') && !/Site-19 Command/.test(shown), 'the hub shows the player\'s site, not Site-19');

  // 20-24. incidents, deployments and hands-off operations
  const dbg = async k => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
  await dbg('strike');
  // a second incident somewhere else at the same time
  await C(() => { const c = window.__site19.campaign, a = c.incidents.find(i => i.kind === 'strike'); c.incidents.push({ ...a, id: 'inc' + c.nextIncident, title: `Incident ${String(c.nextIncident).padStart(3, '0')}: Insurgency cell, Kleinhausen, West Germany`, region: 'europe' }); c.nextIncident++; window.__site19.save(); });
  const incs = await C(() => window.__site19.campaign.incidents.filter(i => i.kind === 'strike').map(i => i.id));
  check(incs.length >= 2, '23. several incidents can be open at once', incs);
  await p.click('[data-tab="world"]'); await p.waitForTimeout(300);
  await p.click(`[data-mapinc="${incs[0]}"]`); await p.waitForTimeout(300);
  await p.click(`[data-plan="${incs[0]}"]`); await p.waitForTimeout(300);
  const plan = await C(() => ({ panel: !!document.querySelector('#launchBtn'), squads: [...document.querySelectorAll('[data-squadpick]')].length, tab: document.querySelector('.tab.on')?.dataset.tab }));
  check(plan.panel && plan.squads >= 2 && plan.tab === 'world', '20. an incident is selected on the World Map and planned by squad', plan);
  const auto = await C((ids) => { const A = window.__site19, c = A.campaign, at = A.autoteam, o = A.org; const inc = c.incidents.find(i => i.id === ids[1]);
    const [s1, s2] = c.mtfs[0].squads; const team = c.roster.filter(x => x.squad === s2.id && A.org.squadMembers(c, s2.id).includes(x)).filter(x => !x.busy && !(x.injury && x.injury.until > c.day) && x.hp === x.maxHp).slice(0, 4);
    // the same team assessed as different specialties and with different kit
    const breach = at.assessTeam(c, inc, team).primary; const spec0 = s2.specialty; s2.specialty = 'recovery'; const recov = at.assessTeam(c, inc, team).primary; s2.specialty = spec0;
    const out = c.incidents.find(i => i.kind === 'outbreak') ?? { ...inc, id: 'tmp', kind: 'outbreak', scpId: '610' };
    const noFlame = at.assessTeam(c, out, team).primary; c.inventory.flamer = 1; team[0].kit = { armor: '', items: ['flamer', '', ''] }; const flame = at.assessTeam(c, out, team).primary; delete c.inventory.flamer; team[0].kit = { armor: '', items: ['', '', ''] };
    const mixed = at.canDispatch(c, inc, [team[0], c.roster.find(x => x.squad === s1.id)]);
    at.dispatchTeam(c, inc, team);
    return { breach, recov, noFlame, flame, mixed, away: o.squadAway(c, s2.id), busy: team.every(x => x.busy?.out), dispatched: !!inc.dispatch, team: team.length, factors: at.assessTeam(c, inc, team).factors.length };
  }, incs);
  check(auto.dispatched && auto.away && auto.busy, '21. a deployment marks the squad away and its people busy', auto);
  check(auto.breach !== auto.recov && auto.flame > auto.noFlame && !!auto.mixed, '22. hands-off odds depend on squad specialty, equipment and team makeup', auto);
  const res = await C((ids) => { const A = window.__site19, c = A.campaign, inc = c.incidents.find(i => i.id === ids[1]); const before = { hist: (c.history ?? []).length, log: c.log.length, intel: c.intel, exp: c.exposure, fat: c.roster.map(o => o.fatigue ?? 0).reduce((a, b) => a + b, 0) };
    A.autoteam.resolveTeam(c, inc); const after = { hist: (c.history ?? []).length, open: c.incidents.some(i => i.id === ids[1]), last: c.log.find(l => /After-action/.test(l.text))?.text, away: A.org.squadAway(c, c.mtfs[0].squads[1].id) };
    return { before, after }; }, incs);
  check(res.after.hist > res.before.hist && !res.after.open && /After-action/.test(res.after.last ?? '') && !res.after.away, '24. a hands-off outcome is classified, recorded and changes the campaign', res);

  // 26b. save and reload after all that
  await p.reload(); await p.click('#mContinue'); await p.waitForTimeout(400);
  const again = await C(() => { const c = window.__site19.campaign; return { site: c.site?.designation, squads: c.mtfs?.[0]?.squads.length, hist: (c.history ?? []).filter(h => h.cat === 'deployment').length }; });
  check(again.site === 'Site-41' && again.squads === 2 && again.hist >= 2, '26b. campaign progression survives another save and load', again);

  check(errs.length === 0, 'ran without page errors', errs);
  await b.close();
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(results.every(Boolean) ? 0 : 1);
})();
