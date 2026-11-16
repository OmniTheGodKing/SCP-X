// Tactical overhaul T7.2: the anomalies' own rules still hold on top of the new geometry, perception and combat.
// SCP-173 freezes while watched and moves when nobody can see it; SCP-049 raises the dead; SCP-106 sinks when shot;
// SCP-610's flesh spreads and fire burns its core. Then a strike is won and the campaign records it, and the save
// still loads (strategic compatibility, T7.3).
const { chromium } = require('playwright');
const { fresh, dbg, reporter } = require('./lib.cjs');

async function launchFirst(p, E, kind) {
  await p.click('[data-tab="command"]');
  const id = await E(k => window.__site19.campaign.incidents.find(i => i.kind === k)?.id, kind);
  if (!id) return false;
  await p.click(`[data-plan="${id}"]`); await p.click('#launchBtn'); await p.waitForTimeout(300);
  if (await E(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
  await E(() => { window.__site19.pace.headless = true; });
  return true;
}

(async () => {
  const b = await chromium.launch(); const { check, done } = reporter();

  // ---- SCP-173 ----
  {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 60; });
    await dbg(p, 'breach');
    check('SCP-173: a breach can be launched', await launchFirst(p, E, 'breach'));
    const r = await E(async () => {
      const A = window.__site19, S = A.mission, st = S.statue, G = A.grid;
      // one operative with a clear view of it; everyone else far off in a corner behind walls
      const watcher = S.units.find(u => u.side === 'mtf' && u.alive) ?? S.units.find(u => u.guard && u.alive);
      // a free tile 2 or 3 away with a clear view of it
      const ring = []; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) >= 2) ring.push([st.x + dx, st.y + dy]);
      const spot = ring.find(([x, y]) => A.passable(x, y) && !S.units.some(u => u.alive && u.x === x && u.y === y) && A.sight(x, y, st.x, st.y));
      for (const u of S.units) if (u !== watcher && u !== st && u.side !== 'anomaly') { u.x = 1; u.y = G.H - 2; }
      watcher.x = spot[0]; watcher.y = spot[1];
      A.computeVis();
      const seenNow = A.canSee(watcher, st.x, st.y);
      const before = [st.x, st.y];
      A.rng.force(0.99);   // nobody blinks
      await A.endTurn();
      A.rng.force(null);
      const held = st.x === before[0] && st.y === before[1];
      // now nobody can see it: it moves (or kills)
      for (const u of S.units) if (u !== st && u.side !== 'anomaly' && u.alive) { u.x = 1; u.y = G.H - 2; }
      A.computeVis();
      const watchedNow = S.units.some(u => u.alive && u !== st && u.side !== 'anomaly' && A.canSee(u, st.x, st.y));
      const b2 = [st.x, st.y];
      A.rng.force(0.99); await A.endTurn(); A.rng.force(null);
      return { seenNow, held, watchedNow, moved: st.x !== b2[0] || st.y !== b2[1] || S.units.some(u => !u.alive && u.side !== 'raider') };
    });
    check('SCP-173: it stays frozen while someone can see it', r.seenNow && r.held, r);
    check('SCP-173: it moves when nobody can see it', !r.watchedNow && r.moved, r);
    check('SCP-173 ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- SCP-049 ----
  {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; c.base.facilities.push({ id: 'fz', type: 'cont_euclid', level: 1, slot: 2, daysLeft: 0, disabled: false, repairDays: 0 }); });
    await dbg(p, 'get049'); await dbg(p, 'breach049');
    check('SCP-049: a breach can be launched', await launchFirst(p, E, 'breach'));
    const r = await E(async () => {
      const A = window.__site19, S = A.mission, doc = S.statue;
      // a body right beside it, and nobody else close
      const body = S.units.find(u => u.alive && u.side !== 'anomaly' && !u.guard && u.side !== 'mtf') ?? S.units.find(u => u.alive && u.side === 'mtf');
      const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [doc.x + dx, doc.y + dy]).find(([x, y]) => A.passable(x, y));
      body.x = spot[0]; body.y = spot[1]; body.alive = false; body.hp = 0;
      for (const u of S.units) if (u.alive && u !== doc && u.side !== 'anomaly') { u.x = 1; u.y = 1; }
      S.calmUntil = -1;
      const z0 = S.units.filter(u => u.side === 'zombie' && u.alive).length;
      for (let k = 0; k < 3 && !S.over; k++) await A.endTurn();
      return { z0, z1: S.units.filter(u => u.side === 'zombie' && u.alive).length, cured: !!body.cured };
    });
    check('SCP-049: it raises a fresh body beside it', r.z1 > r.z0 || r.cured, r);
    check('SCP-049 ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- SCP-106 ----
  {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; c.base.facilities.push({ id: 'fk', type: 'cont_keter', level: 2, slot: 2, daysLeft: 0, disabled: false, repairDays: 0 }); });
    await dbg(p, 'get106'); await dbg(p, 'breach106');
    const launched = await launchFirst(p, E, 'breach');
    check('SCP-106: a breach can be launched', launched);
    if (launched) {
      const r = await E(async () => {
        const A = window.__site19, S = A.mission, om = S.statue;
        const m = S.units.find(u => u.side === 'mtf' && u.alive) ?? S.units.find(u => u.guard && u.alive);
        const spot = [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2]].map(([dx, dy]) => [om.x + dx, om.y + dy]).find(([x, y]) => A.passable(x, y) && A.sight(x, y, om.x, om.y));
        m.x = spot[0]; m.y = spot[1]; A.computeVis();
        const can = A.canShoot(m, om);
        A.rng.force(0.01); if (can) await A.fire(m, om, false); A.rng.force(null);
        return { has106: S.has106, can, submerged: !!S.submerged };
      });
      check('SCP-106: a hit drives it under the floor', r.has106 && r.can && r.submerged, r);
    }
    check('SCP-106 ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- SCP-610 ----
  {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
    await dbg(p, 'outbreak');
    const launched = await launchFirst(p, E, 'outbreak');
    check('SCP-610: an outbreak can be launched', launched);
    if (launched) {
      const r = await E(async () => {
        const A = window.__site19, S = A.mission;
        for (const u of S.units) if (u.side === 'zombie') u.alive = false;
        const f0 = S.flesh.size;
        await A.endTurn();
        return { f0, f1: S.flesh.size, core: !!S.core };
      });
      check('SCP-610: the flesh spreads each turn', r.core && r.f1 > r.f0, r);
    }
    check('SCP-610 ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- a strike won, the campaign updated, the save intact ----
  {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
    await dbg(p, 'strike');
    const before = await E(() => { const c = window.__site19.campaign; return { won: c.stats.won, xp: c.roster.map(o => o.xp) }; });
    await launchFirst(p, E, 'strike');
    await E(async () => { const A = window.__site19, S = A.mission; for (const u of S.units) if (u.side === 'raider') { u.alive = false; } await A.endTurn(); });
    await p.waitForTimeout(400);
    if (await p.$('#returnBtn')) await p.click('#returnBtn');
    await p.waitForTimeout(300);
    const after = await E(() => { const c = window.__site19.campaign; return { won: c.stats.won, xp: c.roster.map(o => o.xp), rng: typeof c.rng }; });
    check('a won strike is recorded in the campaign and the squad gains experience', after.won === before.won + 1 && after.xp.some((x, i) => x > before.xp[i]), { before, after });
    await p.reload(); await p.waitForTimeout(300);
    const reload = await E(() => { const c = window.__site19.campaign; return { won: c.stats.won, rng: typeof c.rng }; });
    check('the campaign saves and loads back with its random stream', reload.won === after.won && reload.rng === 'number', reload);
    check('strike and campaign ran without errors', !errs.length, errs);
    await p.close();
  }
  await b.close(); done();
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
