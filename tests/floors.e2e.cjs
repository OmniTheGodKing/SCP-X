// Phase 4C floors and base defence: the compound's two floors joined by a lift the team can work and the Insurgency
// can't until it forces it; the floor switcher; a forced lift opening the way down instead of ending the raid; and the
// Insurgents winning by holding containment control.
const { chromium } = require('playwright');
const SP = '/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/';
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail) : ''}`);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.day = 400; c.tutorial = false; c.alert = 'full'; });
  await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click('[data-dbg="raid"]'); await p.click('[data-dbg="close"]'); await close(p);
  await p.click('[data-tab="command"]');
  const id = await p.evaluate(() => window.__site19.campaign.incidents.find(i => i.kind === 'raid').id);
  await p.click(`[data-plan="${id}"]`); await p.click('#launchBtn'); await p.waitForTimeout(400);
  const E = (f, a) => p.evaluate(f, a);

  const setup = await E(() => { const A = window.__site19, S = A.mission, G = A.grid;
    return { floors: G.def.floors?.map(f => f.name), links: G.link.size, closed: G.closedLinks.size, station: S.reinforce.filter(r => r.station).map(r => [r.turn, r.members.length]) }; });
  check('the compound has a surface and level 1, joined by a closed lift', JSON.stringify(setup.floors) === '["Surface","Level 1"]' && setup.links === 2 && setup.closed === 2, setup);
  check('on full alert the squad comes out on level 1 by the lift', setup.station.length === 1, setup.station);

  // the floor bar
  const bar = await p.$$eval('#floorBar [data-floor]', e => e.map(x => x.textContent.trim()));
  await p.click('#floorBar [data-floor="1"]'); await p.waitForTimeout(250);
  await (await p.$('#cv')).screenshot({ path: SP + 'floor-level1.png' });
  const onView = await E(() => document.querySelector('#floorBar .on')?.textContent);
  check('the floor bar lists both floors and switches the view', bar.length === 2 && /Level 1/.test(onView), { bar, onView });

  // the team can path through the lift; the Insurgency can't
  const paths = await E(() => { const A = window.__site19, S = A.mission, G = A.grid;
    const m = S.units.find(u => u.side === 'mtf'); const r = S.units.find(u => u.side === 'raider');
    const lk = G.def.links[0], st = G.def.stationSpawns[0];
    m.x = st[0]; m.y = st[1]; m.ap = 2; const res = A.reach(m); const upTo = res && res.dist[lk.a[1] * G.W + lk.a[0]];
    r.alive = true; r.downed = false;
    return { teamReachesSurface: upTo > 0, linkFromClosed: [...G.closedLinks].length }; });
  check('a team member on level 1 can ride the lift to the surface', paths.teamReachesSurface, paths);

  // the Insurgents force the lift: two enemy turns at the doors open it, and the raid goes on
  const forced = await E(async () => { const A = window.__site19, S = A.mission, G = A.grid;
    for (const u of S.units) if (u.side === 'raider') { u.alive = false; }
    const r = S.units.find(u => u.side === 'raider'); r.alive = true; r.downed = false; r.hp = r.maxHp = 50; S.activePods.push(r.pod ?? 0);
    // beside the surface lift doors (mirrored maps put the lift on the other side)
    const lk = G.def.links[0], near = [[-1,0],[1,0],[-1,1],[1,1],[-1,-1],[1,-1],[0,1],[0,-1]].map(([dx, dy]) => [lk.a[0] + dx, lk.a[1] + dy]).find(([x, y]) => A.passable(x, y) && G.grid[y][x] !== 5);
    r.x = near[0]; r.y = near[1];
    const far = G.def.control[0] > 10 ? 2 : 25;
    for (const u of S.units) if (u.side === 'mtf') { u.x = far; u.y = 33; }
    S.reinforce = [];
    await A.endTurn(); await A.endTurn();
    return { liftOpen: !!S.liftOpen, over: S.over, stolen: !!S.stolen, closed: G.closedLinks.size, log: S.log.slice(0, 5).map(l => l.text) }; });
  check('a forced lift opens the way down instead of ending the raid', forced.liftOpen && !forced.over && forced.closed === 0, forced);

  // they head down for containment control, and holding it for a turn wins it for them
  const control = await E(async () => { const A = window.__site19, S = A.mission, G = A.grid;
    const r = S.units.find(u => u.side === 'raider' && u.alive);
    const floors = [];
    for (let k = 0; k < 8 && !S.over; k++) { await A.endTurn(); floors.push([r.x, r.y, r.alive, r.ap, S.liftOpen]); }
    return { floors, reachedLevel1: floors.some(f => f[1] >= 20), over: S.over, win: S.result?.win, controlTurn: S.controlTurn, log: S.log.filter(l => /control|lift/i.test(l.text)).slice(0, 4).map(l => l.text) }; });
  check('the Insurgent goes down the lift and holding containment control loses the raid', control.reachedLevel1 && control.over && control.win === false, control);
  check('ran without errors', !errs.length, errs);
  await b.close();
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAILED');
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
