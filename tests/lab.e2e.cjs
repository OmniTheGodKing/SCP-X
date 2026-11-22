// Tactical overhaul T6.2: the tactical lab. It opens from #lab, loads presets, paints walls that change sight at once,
// shows the same hit chance as the game's own shot rules, runs the AI, and saves and reloads a scenario.
const { chromium } = require('playwright');
const { GAME_URL, OUT, reporter, clickTile, hoverTile } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const { check, done } = reporter();
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME_URL); await p.evaluate(() => localStorage.clear());
  await p.goto(GAME_URL + '#lab'); await p.reload(); await p.waitForTimeout(400);
  const E = (f, a) => p.evaluate(f, a);
  check('the lab opens from #lab with its panel and a sandbox mission', await E(() => !!document.getElementById('labPanel') && !!window.__site19.mission?.setup.lab));

  // the crates preset: the owner's drawings
  await p.selectOption('#labPreset', 'crates'); await p.waitForTimeout(300);
  const crates = await E(() => { const A = window.__site19, S = A.mission; const m = S.units.find(u => u.side === 'mtf' && u.x === 13 && u.y === 13); return { found: !!m, seesFarBehindRow: A.canSee(m, 13, 2) }; });
  check('crates preset: the operative in the middle of the row can\'t see far behind it', crates.found && !crates.seesFarBehindRow, crates);

  // hover an Insurgent on the open-room preset: the panel's shot equals the rule's
  await p.selectOption('#labPreset', 'room'); await p.waitForTimeout(300);
  const tgt = await E(() => { const S = window.__site19.mission, G = window.__site19.grid; const r = S.units.find(u => u.side === 'raider'); return { x: r.x, y: r.y, W: G.W, H: G.H }; });
  await hoverTile(p, tgt.x, tgt.y); await p.waitForTimeout(250);
  const shot = await E(() => { const A = window.__site19, S = A.mission; const m = S.units.find(u => u.side === 'mtf'), r = S.units.find(u => u.side === 'raider');
    const txt = document.getElementById('labInfo').textContent; return { txt: txt.slice(0, 400), chance: A.canShoot(m, r) ? A.shotInfo(m, r).chance : null }; });
  check('the panel shows the same hit chance as the shot rules', shot.chance === null ? /Shot:\s*none/.test(shot.txt) : shot.txt.includes(`Shot: ${shot.chance}%`), shot);
  await p.screenshot({ path: OUT + '/lab-room.png' });

  // paint a wall line between them: sight goes at once
  const wall = await E(() => { const A = window.__site19, S = A.mission, G = A.grid; const m = S.units.find(u => u.side === 'mtf'), r = S.units.find(u => u.side === 'raider'); return { mx: m.x, my: m.y, rx: r.x, ry: r.y, before: A.canSee(m, r.x, r.y), W: G.W, H: G.H }; });
  await p.click('[data-tool="#"]');
  const wx = Math.floor((wall.mx + wall.rx) / 2);
  for (let y = 1; y < wall.H - 1; y++) await clickTile(p, wx, y);
  const after = await E(w => { const A = window.__site19, S = A.mission; const m = S.units.find(u => u.side === 'mtf'); return A.canSee(m, w.rx, w.ry); }, wall);
  check('painting a wall across the room cuts the line of sight at once', wall.before && !after, { before: wall.before, after });

  // the AI button runs an Insurgent's turn; End turn runs the enemy phase; nothing throws
  await p.selectOption('#labPreset', 'dugin'); await p.waitForTimeout(300);
  await p.click('[data-tool="inspect"]');
  const r1 = await E(() => { const S = window.__site19.mission, G = window.__site19.grid; const r = S.units.find(u => u.side === 'raider'); return { x: r.x, y: r.y, W: G.W, H: G.H }; });
  await clickTile(p, r1.x, r1.y);
  await E(() => { window.__site19.pace.headless = true; });
  await p.click('[data-show="ai"]'); await p.waitForTimeout(200);
  await p.click('#labAI'); await p.waitForTimeout(300);
  const moved = await E(r => { const S = window.__site19.mission; const u = S.units.find(u => u.side === 'raider'); return { x: u.x, y: u.y, ap: u.ap, sup: S.units.some(u => (u.suppressedUntil ?? -1) >= S.turn) }; }, r1);
  check('the AI turn button runs the Insurgent\'s turn', moved.ap === 0 || moved.x !== r1.x || moved.y !== r1.y, moved);
  await p.screenshot({ path: OUT + '/lab-ai.png' });
  await p.click('#labTurn'); await p.waitForTimeout(400);
  check('an enemy phase runs in the lab without ending it', await E(() => !window.__site19.mission.over));

  // save, reload the page, and it comes back
  await p.click('#labSave');
  await p.reload(); await p.waitForTimeout(400);
  const back = await E(() => window.__site19.mission.units.filter(u => u.side === 'raider').length);
  check('a saved scenario comes back on reload', back === 2, back);
  check('the lab ran without errors', !errs.length, errs);
  await b.close(); done();
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
