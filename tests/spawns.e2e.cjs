// Enemies start away from the team's drop-off and out of its sight (playtest change after 4G): on every field map
// and wing C, a strike starts with no Insurgent visible to the team and none within 8 steps of it.
const { chromium } = require('playwright');
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const rows = [];
  for (const map of ['wingC', 'town', 'farm', 'port', 'dblock', 'gate', 'rail', 'church', 'lab', 'ship']) for (let run = 0; run < 3; run++) {
    await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
    await dbg(p, 'strike'); await p.click('[data-tab="command"]');
    const id = await p.evaluate(([m, r]) => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.kind === 'strike'); i.map = m; i.night = false; i.weather = 'clear'; i.insurgents = r === 2 ? 8 : i.insurgents; return i.id; }, [map, run]);
    await p.click(`[data-plan="${id}"]`);
    await p.click('#launchBtn'); await p.waitForTimeout(300);
    if (await p.evaluate(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
    await (await p.$('#cv')).screenshot({ path: '/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/map-' + map + '.png' });
    rows.push(await p.evaluate(m => {
      const A = window.__site19, S = A.mission, G = A.grid;
      const team = S.units.filter(u => u.side === 'mtf' && u.alive), foes = S.units.filter(u => u.side === 'raider' && u.alive);
      const visible = foes.filter(r => S.vis[r.y * G.W + r.x]).length;
      const d = A.reach ? null : null;
      const steps = foes.map(r => Math.min(...team.map(t => Math.max(Math.abs(t.x - r.x), Math.abs(t.y - r.y)))));
      return { map: m, visible, nearest: Math.min(...steps), foes: foes.length };
    }, map));
  }
  const bad = rows.filter(r => r.visible > 0 || r.nearest < 8);
  for (const r of rows) console.log(JSON.stringify(r));
  console.log(bad.length ? 'FAIL' : 'PASS', 'no Insurgent in sight or within 8 tiles at the start ::', bad.length, 'bad of', rows.length);
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
