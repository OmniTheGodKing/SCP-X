// An object anomaly (SCP-500) can't escape: its "breach" is Insurgents trying to steal it. The mission is won by putting
// every Insurgent down, and lost if they carry it out, in which case it is gone to the Insurgency.
const { chromium } = require('playwright');
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail) : ''}`);
async function theft(b) {
  const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.day = 400; c.tutorial = false;
    Object.assign(c.scps[0], { id: '500', name: 'SCP-500', title: 'Panacea', cls: 'Safe' }); });
  await dbg(p, 's-breach');
  const camp = await p.evaluate(() => { const c = window.__site19.campaign, i = c.incidents.find(i => i.kind === 'breach');
    return { id: i?.id, title: i?.title, ins: i?.insurgents, log: c.log?.slice?.(-3) }; });
  await p.click('[data-tab="command"]'); await p.click(`[data-plan="${camp.id}"]`); await p.click('#launchBtn'); await p.waitForTimeout(400);
  return { p, errs, camp, E: (f, a) => p.evaluate(f, a) };
}
(async () => {
  const b = await chromium.launch();
  {
    const { p, errs, camp, E } = await theft(b);
    check('an object breach is an Insurgent theft with at least 3 of them', /Insurgents after SCP-500/.test(camp.title) && camp.ins >= 3, camp);
    const s = await E(() => { const S = window.__site19.mission;
      return { scp: S.scp, has173: S.has173, name: S.statue.name, object: !!S.statue.object, alive: S.statue.alive, raiders: S.units.filter(u => u.side === 'raider' && u.alive).length, brief: S.log.map(l => l.text).find(t => /object/.test(t)) ?? document.body.innerText.match(/It's an object[^.]*\./)?.[0] }; });
    check('the mission has SCP-500 as an object, not SCP-173', s.scp === '500' && !s.has173 && s.name === 'SCP-500' && s.object && s.alive && s.raiders >= 3, s);
    await p.screenshot({ path: '/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/theft.png' });
    // put every Insurgent down: the incident is closed and SCP-500 is back in its cell
    const won = await E(async () => { const A = window.__site19, S = A.mission;
      for (const u of S.units) if (u.side === 'raider') u.alive = false;
      await A.endTurn(); return { over: S.over, win: S.result?.win }; });
    await p.waitForTimeout(400); await close(p);
    if (await p.$('#returnBtn')) await p.click('#returnBtn'); await p.waitForTimeout(300); await close(p);
    const after = await E(() => { const c = window.__site19.campaign; return c.scps.find(s => s.id === '500')?.status; });
    check('every Insurgent down wins, and SCP-500 stays held', won.over && won.win === true && after === 'contained', { won, after });
    check('ran without errors (won)', !errs.length, errs);
    await p.close();
  }
  {
    const { p, errs, E } = await theft(b);
    const r = await E(async () => { const A = window.__site19, S = A.mission, d = S.statue;
      // the team holds back in a corner, too tough to be finished off, and doesn't fire on its own
      for (const o of S.units.filter(u => u.side !== 'raider' && u.side !== 'anomaly')) { o.x = 1; o.y = 1; o.hp = o.maxHp = 999; o.overwatch = false; }
      const g = S.units.filter(u => u.side === 'raider' && u.alive);
      const free = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].map(([dx, dy]) => [d.x + dx, d.y + dy]).filter(([x, y]) => A.passable(x, y));
      g.slice(0, 2).forEach((u, i) => { u.x = free[i][0]; u.y = free[i][1]; });
      for (const u of g.slice(2)) u.alive = false;
      S.reinforce = [];
      const log = [];
      for (let k = 0; k < 25 && !S.over; k++) { await A.endTurn(); }
      return { lostTo: S.lostTo, over: S.over, win: S.result?.win, trophy: S.trophy, at: [d.x, d.y], log: S.log.filter(l => /Insurgents|SCP-500/.test(l.text)).slice(0, 5).map(l => l.text) }; });
    await p.waitForTimeout(400); await close(p);
    if (await p.$('#returnBtn')) await p.click('#returnBtn'); await p.waitForTimeout(300); await close(p);
    const gone = await E(() => { const c = window.__site19.campaign; return { held: c.scps.some(s => s.id === '500'), lost: c.lostScps }; });
    check('left alone, the Insurgents carry SCP-500 out and it is lost to them', r.lostTo === 'ci' && r.win === false && !gone.held && gone.lost?.includes('500'), { r, gone });
    check('ran without errors (lost)', !errs.length, errs);
    await p.close();
  }
  await b.close();
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAILED');
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
