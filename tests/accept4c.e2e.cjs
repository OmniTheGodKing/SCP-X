// Phase 4C acceptance: 50 generated towns checked against their rules; each new map starts cleanly; and each new
// mission type is driven to a win and a loss: the GOC destroying an anomaly (and being stopped), GRU-P carrying one off
// (and dropping it when a carrier is shot), a convoy getting through (and being taken), and a site gone quiet (what
// happened there stays hidden until it is seen). Base defence across floors is in tests/floors.e2e.cjs.
const { chromium } = require('playwright');
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail) : ''}`);

async function page(b) {
  const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 900; });
  return { p, errs, E: (f, a) => p.evaluate(f, a) };
}
async function launch(p, incId) {
  await p.click('[data-tab="command"]'); await p.click(`[data-plan="${incId}"]`); await p.click('#launchBtn'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
}
/** A sighting turned into a GOC or GRU mission on the farm: SCP-049 for the GOC, SCP-012 (which can be carried) for GRU-P. */
async function rivalMission(b, who) {
  const { p, errs, E } = await page(b);
  const sid = who === 'gru' ? '012' : '049';
  await dbg(p, 'see' + sid);
  const id = await E(([w, sid]) => { const c = window.__site19.campaign, i = c.incidents.find(i => i.scpId === sid); i.map = 'farm'; i.night = false; i.weather = 'clear'; i.goc = w === 'goc'; i.gru = w === 'gru'; i.insurgents = 3; return i.id; }, [who, sid]);
  await launch(p, id);
  return { p, errs, E };
}

(async () => {
  const b = await chromium.launch();

  // ---- generated towns ----
  {
    const { p, errs, E } = await page(b);
    const r = await E(() => {
      const out = { made: 0, fell: 0, truckOk: 0, bad: [] };
      for (let k = 0; k < 50; k++) {
        const truck = k % 2 === 0, m = window.__site19.generateTown(truck);
        if (!m) { out.fell++; continue; }
        out.made++;
        if (m.rows.length !== 18 || m.rows.some(r => r.length !== 28)) out.bad.push('size');
        if (truck) { if (m.rows.join('').includes('CCC')) out.truckOk++; else out.bad.push('no truck'); }
        if (!m.rows.slice(7, 11).every(r => r[0] === 'E' && r[27] === 'E')) out.bad.push('exits');
        if (m.insurgentRooms.length < 2) out.bad.push('far rooms');
      }
      return out;
    });
    check('50 generated towns pass their checks (size, exits, far rooms, the truck when needed)', r.made + r.fell === 50 && r.made >= 45 && !r.bad.length && r.truckOk >= 20, r);
    check('generated towns ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- GOC ----
  {
    const { p, errs, E } = await rivalMission(b, 'goc');
    const r = await E(async () => { const A = window.__site19, S = A.mission, d = S.statue;
      const g = S.units.filter(u => u.side === 'raider' && u.alive);
      const out = { goc: S.setup.goc, names: [...new Set(g.map(u => u.name))], aim: g[0]?.aim, armor: g[0]?.armor };
      // two of them next to SCP-049 through a whole enemy turn
      for (const o of S.units.filter(u => u.side === 'mtf')) { o.x = 1; o.y = 1; }
      const free = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).filter(([x, y]) => A.passable(x, y));
      g.slice(0, 2).forEach((u, i) => { u.x = free[i][0]; u.y = free[i][1]; });
      for (const u of g.slice(2)) u.alive = false;
      S.calmUntil = 99;   // keep SCP-049 from touching them for the test
      await A.endTurn(); out.after1 = { gocTurn: S.gocTurn, over: S.over };
      await A.endTurn(); out.after2 = { lostTo: S.lostTo, over: S.over, win: S.result?.win };
      return out; });
    check('GOC: their team is GOC, better aimed and armored', r.goc && r.names.includes('GOC operative') && r.aim >= 70 && r.armor >= 1, r);
    check('GOC: two at the anomaly for a whole turn destroy it, and the mission is lost', r.after1.gocTurn !== undefined && !r.after1.over && r.after2.lostTo === 'goc' && r.after2.win === false, r);
    if (await p.$('#returnBtn')) await p.click('#returnBtn');
    const camp = await E(() => { const c = window.__site19.campaign; return { lost: c.lostScps, held: c.scps.some(s => s.id === '049'), sight: c.sightings['049'] }; });
    check('GOC: the anomaly is gone for good (lost list, no sighting, not held)', (camp.lost ?? []).includes('049') && !camp.held && camp.sight === undefined, camp);
    check('GOC mission ran without errors', !errs.length, errs);
    await p.close();
  }
  {
    const { p, errs, E } = await rivalMission(b, 'goc');
    const r = await E(async () => { const A = window.__site19, S = A.mission;
      for (const u of S.units) if (u.side === 'raider') u.alive = false;
      await A.endTurn();
      return { over: S.over, win: S.result?.win, lostTo: S.lostTo }; });
    check('GOC: beating their team leaves the anomaly to be taken', !r.lostTo, r);
    check('GOC (stopped) ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- GRU-P ----
  {
    const { p, errs, E } = await rivalMission(b, 'gru');
    await E(() => { const A = window.__site19, S = A.mission; });
    const r = await E(async () => { const A = window.__site19, S = A.mission;
      // a statue is what they carry: swap the anomaly for a field SCP-173-style object (the score is carriable)
      const d = S.statue;
      const g = S.units.filter(u => u.side === 'raider' && u.alive); for (const u of g) u.eyesDown = true;
      for (const o of S.units.filter(u => u.side === 'mtf')) { o.x = 1; o.y = 1; }
      const free = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).filter(([x, y]) => A.passable(x, y));
      g.slice(0, 2).forEach((u, i) => { u.x = free[i][0]; u.y = free[i][1]; u.hp = u.maxHp = 30; });
      for (const u of g.slice(2)) u.alive = false;
      await A.endTurn(); await A.endTurn();
      const out = { trophy: S.trophy ? [...S.trophy] : null };
      // shoot a carrier: they drop it
      const m = S.units.find(u => u.side === 'mtf'); const c1 = S.units.find(u => u.id === S.trophy?.[0]);
      if (c1) { const sp = [[2,0],[0,2],[-2,0],[0,-2],[3,0],[0,3]].map(([dx, dy]) => [c1.x + dx, c1.y + dy]).find(([x, y]) => A.passable(x, y) && A.sight(x, y, c1.x, c1.y)); if (sp) { m.x = sp[0]; m.y = sp[1]; } m.ap = 2;
        for (let k = 0; k < 6 && S.trophy; k++) { m.ap = 2; await A.fire(m, c1, false); } }
      out.dropped = !S.trophy;
      return out; });
    check('GRU-P: two at it for a whole turn pick it up and carry it', !!r.trophy && r.trophy.length === 2, r);
    check('GRU-P: hitting a carrier makes them drop it', r.dropped, r);
    check('GRU-P mission ran without errors', !errs.length, errs);
    await p.close();
  }
  {
    const { p, errs, E } = await rivalMission(b, 'gru');
    const r = await E(async () => { const A = window.__site19, S = A.mission, d = S.statue;
      const g = S.units.filter(u => u.side === 'raider' && u.alive); for (const u of g) u.eyesDown = true;
      for (const o of S.units.filter(u => u.side === 'mtf')) { o.x = 1; o.y = 1; o.alive = true; }
      const free = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).filter(([x, y]) => A.passable(x, y));
      g.slice(0, 2).forEach((u, i) => { u.x = free[i][0]; u.y = free[i][1]; });
      for (const u of g.slice(2)) u.alive = false;
      for (let k = 0; k < 16 && !S.over; k++) await A.endTurn();
      return { lostTo: S.lostTo, over: S.over, win: S.result?.win }; });
    check('GRU-P: left alone, they carry it off the map and the mission is lost', r.lostTo === 'gru' && r.win === false, r);
    check('GRU-P (carried off) ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- convoy ----
  for (const outcome of ['through', 'taken']) {
    const { p, errs, E } = await page(b);
    await E(() => { const c = window.__site19.campaign; c.incidents.push({ id: 'incC', kind: 'escort', scpId: '173', region: 'east_us', map: 'town', convoy: true, title: 'Incident 999: Convoy through a hostile town', appeared: c.day, expires: c.day, insurgents: 3 }); });
    await launch(p, 'incC');
    const r = await E(async o => { const A = window.__site19, S = A.mission, t = S.units.find(u => u.vehicle);
      const out = { convoy: S.setup.convoy, truck: t && [t.x, t.y] };
      const g = S.units.filter(u => u.side === 'raider');
      if (o === 'through') { for (const u of g) u.alive = false; const keep = g[0]; keep.alive = true; keep.x = 26; keep.y = 2; keep.hp = keep.maxHp = 99; keep.panicUntil = 999; S.activePods = []; for (let k = 0; k < 12 && !S.over; k++) await A.endTurn(); out.end = { out: S.convoyOut, over: S.over, win: S.result?.win, x: t.x }; }
      else { for (const u of g) u.alive = false; const r = g[0]; r.alive = true; r.hp = r.maxHp = 99; r.x = t.x; r.y = t.y - 1; if (!A.passable(r.x, r.y)) r.y = t.y + 1; for (const m of S.units.filter(u => u.side === 'mtf')) { m.x = 1; m.y = 1; } await A.endTurn(); await A.endTurn(); out.end = { stolen: S.stolen, over: S.over, win: S.result?.win, moved: t.x }; }
      return out; }, outcome);
    if (outcome === 'through') check('convoy: the truck drives east and getting it out the far end wins', r.convoy && r.end.out && r.end.win === true, r);
    else check('convoy: an Insurgent at the truck for a whole turn takes it; the truck waits while they are there', r.end.stolen && r.end.win === false && r.end.moved === r.truck[0], r);
    check(`convoy (${outcome}) ran without errors`, !errs.length, errs);
    await p.close();
  }

  // ---- a site gone quiet ----
  {
    const { p, errs, E } = await page(b);
    await E(() => { const c = window.__site19.campaign; c.tf.nextQuiet = c.day; c.tf.nextEmergency = c.day + 999; c.tf.nextLost = c.day + 999; });
    await dbg(p, 'd1');
    const inc = await E(() => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.quiet); return i && { id: i.id, title: i.title, map: i.map, hazard: i.hazard }; });
    check('a quiet site incident appears on the research site map', !!inc && inc.map === 'lab' && /gone quiet/.test(inc.title), inc);
    if (inc) {
      await E(id => { const i = window.__site19.campaign.incidents.find(x => x.id === id); i.hazard = 'insurgents'; i.insurgents = 3; i.scpId = ''; }, inc.id);
      await launch(p, inc.id);
      const r = await E(() => { const A = window.__site19, S = A.mission;
        const before = { revealed: S.revealed, status: document.querySelector('#statusLine')?.textContent };
        const foe = S.units.find(u => u.side === 'raider' && u.alive), m = S.units.find(u => u.side === 'mtf' && u.alive);
        // walk the foe into plain sight of the team
        const sp = [[1,0],[2,0],[0,1],[0,2],[1,1],[3,0]].map(([dx, dy]) => [m.x + dx, m.y + dy]).find(([x, y]) => A.passable(x, y) && !S.units.some(u => u.alive && u.x === x && u.y === y));
        foe.x = sp[0]; foe.y = sp[1]; A.computeVis();
        return { before, floors: A.grid.def.floors?.length };
      });
      await E(() => window.__site19.endTurn());
      const after = await E(() => { const S = window.__site19.mission; return { revealed: S.revealed, log: S.log.find(l => /what happened here/.test(l.text))?.text }; });
      check('quiet site: what happened stays unknown until seen, then is revealed', r.before.revealed === undefined && /Unknown/.test(r.before.status) && after.revealed !== undefined && !!after.log, { ...r, after });
    }
    check('quiet site ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- every new map starts ----
  {
    const { p, errs, E } = await page(b);
    const out = [];
    for (const map of ['rail', 'church', 'lab', 'ship', 'gate']) {
      await p.goto('file:///home/user/scp-x/dist/index.html'); await E(() => localStorage.clear()); await p.reload();
      await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 900; });
      await dbg(p, 'strike');
      const id = await E(m => { const i = window.__site19.campaign.incidents.find(i => i.kind === 'strike'); i.map = m; return i.id; }, map);
      await launch(p, id);
      out.push(await E(() => { const S = window.__site19.mission; return { map: S.setup.map, units: S.units.filter(u => u.alive).length, floors: window.__site19.grid.def.floors?.length ?? 1 }; }));
      await E(() => window.__site19.endTurn());
    }
    check('each new map starts and plays a turn', out.every(o => o.units > 3), out);
    check('new maps ran without errors', !errs.length, errs);
    await p.close();
  }
  await b.close();
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAILED');
})().catch(e => { console.log('FAIL crashed', e.message, e.stack); process.exit(1); });
