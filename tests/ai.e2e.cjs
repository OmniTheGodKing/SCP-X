// Tactical overhaul T5: the enemy AI in real missions. Over a few enemy turns on real maps, Insurgents that know where
// the team is should mostly end their turns in cover against it or on a flank, the enemy turn should stay quick, and
// nothing should throw.
const { chromium } = require('playwright');
const { fresh, dbg, reporter } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const { check, done } = reporter();
  for (const map of ['town', 'wingC', 'farm', 'port']) {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
    await dbg(p, 'strike'); await p.click('[data-tab="command"]');
    const id = await E(m => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.kind === 'strike'); i.map = m; i.night = false; i.weather = 'clear'; i.insurgents = 5; return i.id; }, map);
    await p.click(`[data-plan="${id}"]`); await p.click('#launchBtn'); await p.waitForTimeout(300);
    if (await E(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
    const r = await E(async () => {
      const A = window.__site19, S = A.mission; A.pace.headless = true;
      // the team is spotted: every pod wakes, and the team stays put (invulnerable, so the test runs its turns)
      S.activePods = [0, 1, 2, 3, 4, 5]; S.concealed = false;
      for (const m of S.units.filter(u => u.side === 'mtf')) { m.hp = m.maxHp = 999; }
      let ends = 0, good = 0, ms = 0;
      for (let k = 0; k < 3 && !S.over; k++) {
        const t0 = performance.now(); await A.endTurn(); ms = Math.max(ms, performance.now() - t0);
        const team = S.units.filter(u => u.side === 'mtf' && u.alive);
        for (const r of S.units.filter(u => u.side === 'raider' && u.alive && !u.downed)) {
          const near = team.filter(m => A.canSee(r, m.x, m.y));
          if (!near.length) continue;
          ends++;
          const covered = near.every(m => A.coverAgainst(r.x, r.y, m.x, m.y) > 0), flank = near.some(m => A.canShoot(r, m) && A.coverAgainst(m.x, m.y, r.x, r.y) === 0);
          if (covered || flank || r.hunkerUntil >= S.turn - 1) good++;
        }
      }
      return { ends, good, ms: Math.round(ms), log: S.log.slice(0, 6).map(l => l.text) };
    });
    check(`${map}: Insurgents in contact end their turns in cover or on a flank (most of the time)`, r.ends === 0 || r.good / r.ends >= 0.6, r);
    check(`${map}: an enemy turn takes under 3 s of computing`, r.ms < 3000, r.ms);
    check(`${map} ran without errors`, !errs.length, errs);
    await p.close();
  }
  await b.close(); done();
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
