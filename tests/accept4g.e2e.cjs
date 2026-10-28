// Phase 4G completion check: before/after screenshots of the same mission, enemy-turn time at Normal and Fast against
// the build before 4G, and a turn of play with Action highlights off showing no shake. Also checks the new effects
// come out of a real shot and the enemy-turn summary appears.
// Usage: node tests/accept4g.e2e.cjs [path to the pre-4G build's index.html]
const { chromium } = require('playwright');
const SP = '/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/';
const AFTER = 'file:///home/user/scp-x/dist/index.html';
const BEFORE = process.argv[2] ? 'file://' + process.argv[2] : null;
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);

// the same dice every run, and a record of any camera shake on the mission canvas
const INIT = () => {
  let s = 1234567; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__shook = 0;
  const st = CanvasRenderingContext2D.prototype.setTransform;
  CanvasRenderingContext2D.prototype.setTransform = function (a, b, c, d, e, f) { if (this.canvas && this.canvas.id === 'cv' && (e || f)) window.__shook++; return st.apply(this, arguments); };
};

/** Opens a strike on wing C with a fixed stage: two operatives facing three active Insurgents across the corridor. */
async function stage(b, url, audio) {
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(INIT);
  await p.goto(url); await p.evaluate(a => { localStorage.clear(); if (a) localStorage.setItem('site19-audio', JSON.stringify(a)); }, audio); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
  await dbg(p, 'strike');
  await p.click('[data-tab="command"]');
  const id = await p.evaluate(() => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.kind === 'strike'); i.map = 'wingC'; i.night = false; i.weather = 'clear'; return i.id; });
  await p.click(`[data-plan="${id}"]`); for (const op of ['op1', 'op2']) await p.click(`[data-pick="${op}"]`).catch(() => {});
  await p.click('#launchBtn'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
  await p.evaluate(() => {
    const S = window.__site19.mission;
    S.concealed = false; S.setup.reinforce = 0;
    const team = S.units.filter(u => u.side === 'mtf'), foes = S.units.filter(u => u.side === 'raider');
    for (const u of S.units) if (!team.includes(u) && !foes.includes(u)) u.alive = false;
    team.forEach((u, i) => { u.x = 3 + i; u.y = 8; u.hp = u.maxHp = 60; });
    foes.forEach((u, i) => { if (i < 3) { u.x = 10 + i * 2; u.y = 8 + (i % 2); u.hp = u.maxHp = 60; u.alive = true; u.downed = false; if (!S.activePods.includes(u.pod ?? 0)) S.activePods.push(u.pod ?? 0); } else u.alive = false; });
    window.__site19.computeVis();
  });
  await p.waitForTimeout(400);
  return { p, errs };
}
const shotNow = p => p.evaluate(() => { const A = window.__site19, S = A.mission; const m = S.units.find(u => u.side === 'mtf' && u.alive), r = S.units.find(u => u.side === 'raider' && u.alive); m.ap = 2; return A.fire(m, r, false).then(() => S.effects.map(e => e.type)); });
const clickShot = async p => {
  // the pre-4G build has no fire handle: shoot through the canvas as a player would
  const xy = await p.evaluate(() => { const S = window.__site19.mission, G = window.__site19.grid, cv = document.querySelector('#cv').getBoundingClientRect();
    const m = S.units.find(u => u.side === 'mtf' && u.alive); S.selected = m; m.ap = 2; const r = S.units.find(u => u.side === 'raider' && u.alive);
    return [cv.x + (r.x + 0.5) * cv.width / G.W, cv.y + (r.y + 0.5) * cv.height / G.H]; });
  await p.mouse.click(xy[0], xy[1]);
};
async function enemyTurns(p, n) {
  const times = [];
  for (let k = 0; k < n; k++) {
    await p.evaluate(() => { for (const u of window.__site19.mission.units) if (u.alive && (u.side === 'mtf' || u.side === 'raider')) u.hp = u.maxHp; });
    const t0 = Date.now();
    await p.evaluate(() => document.activeElement?.blur?.());
    await p.click('#endBtn');
    await p.waitForFunction(() => { const S = window.__site19.mission; return S.over || (S.phase === 'player' && !S.busy); }, null, { timeout: 60000 });
    times.push(Date.now() - t0);
  }
  return times;
}
const avg = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

(async () => {
  const b = await chromium.launch();
  const TURNS = 4;
  // 1. screenshots: the same stage, mid-shot, before and after
  let before = null;
  if (BEFORE) {
    const s = await stage(b, BEFORE);
    await clickShot(s.p); await s.p.waitForTimeout(90);
    await (await s.p.$('#cv')).screenshot({ path: SP + '4g-before.png' });
    await s.p.waitForTimeout(800);
    before = await enemyTurns(s.p, TURNS);
    check('before build ran without errors', !s.errs.length, s.errs.join(' | '));
    await s.p.close();
  }
  {
    const s = await stage(b, AFTER, { highlights: true, fastEnemy: false });
    const p = s.p;
    const kinds = shotNow(p);
    await p.waitForTimeout(90);
    await (await p.$('#cv')).screenshot({ path: SP + '4g-after.png' });
    const k = await kinds;
    const shot = await p.evaluate(() => window.__site19.mission.effects.find(e => e.type === 'line'));
    check('a shot is a travelling tracer that lands with an impact', !!shot && !!shot.impact && shot.rounds >= 1, JSON.stringify(shot && { impact: shot.impact, rounds: shot.rounds, dur: Math.round(shot.dur) }));
    check('the shot says why: a number, MISS, COVER or GRAZE', k.includes('text'), k.join(','));
    // an explosion, frozen mid-blast, for the record
    await p.evaluate(() => { const S = window.__site19.mission; S.effects.push({ type: 'jolt', t0: performance.now(), dur: 380, mag: 5, color: '#ff9a50' }, { type: 'blast', t0: performance.now(), dur: 700, x: 8 * 32 + 16, y: 6 * 32 + 16, r: 1.5 }, { type: 'banner', t0: performance.now(), dur: 1300, text: 'INSURGENT REINFORCEMENTS', color: '#d75b47' }); });
    await p.waitForTimeout(160);
    await (await p.$('#cv')).screenshot({ path: SP + '4g-blast.png' });
    await p.waitForTimeout(1500);
    const shookOn = await p.evaluate(() => window.__shook);
    check('with highlights on, a big moment shakes the map (control)', shookOn > 0, `shake frames ${shookOn}`);
    const normal = await enemyTurns(p, TURNS);
    const hint = await p.$eval('#hint', e => e.textContent);
    check('the action bar sums up the enemy turn', /Enemy turn:/.test(hint), hint.split('\n')[0]);
    // the speed setting lives in the Sound panel and is remembered
    await p.click('.sound summary'); await p.selectOption('[data-sndspeed]', 'fast');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('site19-audio')).fastEnemy);
    check('Fast enemy turns is set from the Sound panel and remembered', saved === true);
    await p.click('.sound summary');
    const fast = await enemyTurns(p, TURNS);
    check('Fast enemy turns are quicker than Normal', avg(fast) < avg(normal) * 0.7, `normal ${normal} avg ${avg(normal)} · fast ${fast} avg ${avg(fast)}`);
    if (before) check('Fast enemy turns are quicker than before 4G', avg(fast) < avg(before), `before ${before} avg ${avg(before)} · fast avg ${avg(fast)}`);
    check('after build ran without errors', !s.errs.length, s.errs.join(' | '));
    await p.close();
  }
  // 3. highlights off: a turn of play, a kill-sized jolt and an explosion, and no shake at all
  {
    const s = await stage(b, AFTER, { highlights: false, fastEnemy: true });
    const p = s.p;
    await shotNow(p); await shotNow(p);
    await p.evaluate(() => { const S = window.__site19.mission; S.effects.push({ type: 'jolt', t0: performance.now(), dur: 380, mag: 6, color: '#d75b47' }, { type: 'blast', t0: performance.now(), dur: 700, x: 300, y: 260, r: 2 }); });
    await p.waitForTimeout(600);
    await enemyTurns(p, 1);
    const shook = await p.evaluate(() => window.__shook);
    check('with highlights off, a turn of play shows no shake', shook === 0, `shake frames ${shook}`);
    check('highlights-off run without errors', !s.errs.length, s.errs.join(' | '));
    await p.close();
  }
  await b.close();
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAILED');
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
