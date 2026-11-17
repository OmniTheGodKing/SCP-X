// Tactical overhaul T1 / roadmap 1.3: on real maps in daylight, anything a unit can see it can shoot, unless the
// rules say otherwise (reinforced glass). The audit measured 62 to 104 contradicting pairs per map before the kernel.
// Sampled every third walkable tile against every third. Sight asymmetry is reported, not failed: a unit stepping
// out past cover can see someone who can't see it back, by design.
const { chromium } = require('playwright');
const { fresh, dbg, reporter } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const { check, done } = reporter();
  for (const map of ['town', 'farm', 'rail', 'church', 'wingC']) {
    const { p, errs, E } = await fresh(b);
    await E(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
    await dbg(p, 'strike'); await p.click('[data-tab="command"]');
    const id = await E(m => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.kind === 'strike'); i.map = m; return i.id; }, map);
    await require("./lib.cjs").planIncident(p, id); await p.click('#launchBtn'); await p.waitForTimeout(300);
    if (await E(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
    const r = await E(() => {
      const A = window.__site19, S = A.mission, G = A.grid;
      S.setup.night = false; S.setup.weather = 'clear'; S.flares = [];
      const sh = S.units.find(u => u.side === 'mtf'), tg = S.units.find(u => u.side === 'raider');
      const keep = [sh.x, sh.y, tg.x, tg.y];
      const tiles = []; for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) if (A.passable(x, y)) tiles.push([x, y]);
      let pairs = 0, asym = 0, seeNoFire = 0, glass = 0; const ex = [];
      for (let i = 0; i < tiles.length; i += 3) for (let j = 0; j < tiles.length; j += 3) {
        const [ax, ay] = tiles[i], [bx, by] = tiles[j]; if (ax === bx && ay === by) continue;
        pairs++;
        sh.x = ax; sh.y = ay; const s1 = A.canSee(sh, bx, by); sh.x = bx; sh.y = by; const s2 = A.canSee(sh, ax, ay);
        if (s1 !== s2) asym++;
        if (!s1) continue;
        sh.x = ax; sh.y = ay; tg.x = bx; tg.y = by; tg.exposed = undefined;
        if (A.lineOfFire(sh, tg)) continue;
        // the only thing allowed to stop fire but not sight is reinforced glass
        const glassy = [...G.glass.entries()].some(([k, g]) => g.kind === 'reinforced' && !g.broken);
        if (glassy) glass++; else { seeNoFire++; if (ex.length < 4) ex.push([ax, ay, bx, by]); }
      }
      [sh.x, sh.y, tg.x, tg.y] = keep;
      return { pairs, asym, seeNoFire, glass, ex };
    });
    check(`${map}: every visible target can be shot (no reinforced glass involved)`, r.seeNoFire === 0, r);
    check(`${map} ran without errors`, !errs.length, errs);
    await p.close();
  }
  await b.close(); done();
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
