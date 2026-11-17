// The rooms show what they're doing (presentation overhaul P5, now inside the environment-first rooms). Command's map
// pins are the open incidents and its teletype the critical item; the lab's board carries the selected project and a
// completion stamp; a wing shows its experiment; the workshop's bench carries its order.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { GAME_URL, ROOT, OUT, close, reporter, openTarget } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const save = fs.readFileSync(path.join(ROOT, 'tests/fixtures/save-v24-midgame.json'), 'utf8');
  await p.goto(GAME_URL); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('site19-campaign-v2', s); }, save); await p.reload(); await p.waitForTimeout(300);
  await close(p);
  const E = (f, a) => p.evaluate(f, a);

  // Command: the map's pins are the open incidents; the teletype prints the critical item
  await p.click('[data-tab="command"]'); await p.waitForTimeout(150);
  const cmd = await E(() => ({ pins: document.querySelectorAll('.rv-stage circle[stroke="#14181c"]').length, incidents: window.__site19.campaign.incidents.length, tele: document.querySelector('.rv-stage')?.textContent ?? '' }));
  check('scenes: Command\'s map shows a pin for each open incident', cmd.pins === cmd.incidents, cmd.pins + ' / ' + cmd.incidents);
  const crit = await E(() => window.__site19.briefing().find(b => b.sev === 'critical')?.title?.toUpperCase());
  if (crit) check('scenes: the teletype prints the critical item', cmd.tele.includes(crit.slice(0, 20)), crit);

  // the lab: a project chosen on the board is written on it; a finished one is stamped
  await p.click('[data-tab="research"]'); await p.waitForTimeout(150);
  await openTarget(p, 'board');
  const pid = await E(() => document.querySelector('.ctxpanel [data-resfocus]')?.dataset.resfocus);
  await p.click(`.ctxpanel [data-resfocus="${pid}"]`); await p.waitForTimeout(100);
  const pname = await E(id => window.__site19.campaign && document.querySelector(`[data-resfocus="${id}"]`)?.textContent.trim(), pid);
  check('scenes: a project chosen on the board is written on it', (await E(() => document.querySelector('.rv-stage').textContent)).includes((pname ?? '').slice(0, 20)), pname);
  await E(id => window.__site19.campaign.research.done.push(id), pid);
  await p.click('[data-tab="command"]'); await p.waitForTimeout(60); await p.click('[data-tab="research"]'); await p.waitForTimeout(150);
  check('scenes: a finished project is stamped COMPLETE on the board', /COMPLETE/.test(await E(() => document.querySelector('.rv-stage').textContent)));
  await p.screenshot({ path: `${OUT}/scene-lab.png` });

  // a containment wing: a test under way is drawn in the cell; the test console offers its experiments
  const wing = await E(() => { const c = window.__site19.campaign, s = c.scps.find(x => x.id === '173'), f = c.base.facilities.find(x => x.id === s.wingId); s.status = 'contained'; c.research.testing = { id: 'endurance', watchers: [] }; c.research.assigned.test_endurance = 1; return `${f.level},${f.slot}`; });
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  await p.click(`[data-slot="${wing}"]`); await p.waitForTimeout(600);
  check('scenes: a test under way shows in the cell', /TEST IN PROGRESS/.test(await E(() => document.querySelector('.rv-stage').textContent)));
  await openTarget(p, 'console');
  check('scenes: the wing\'s test console offers its occupant\'s experiments', (await E(() => document.querySelectorAll('.ctxpanel .test').length)) >= 3);
  await p.screenshot({ path: `${OUT}/scene-wing.png` });

  // the workshop: its order on the bench
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const ws = await E(() => { const c = window.__site19.campaign; let f = c.base.facilities.find(x => x.type === 'workshop');
    if (!f) { for (let l = 0; l < c.base.levels && !f; l++) for (let s = 0; s < 6 && !f; s++) if (!c.base.facilities.some(x => x.level === l && x.slot === s)) { f = { id: 'fws', type: 'workshop', level: l, slot: s, daysLeft: 0, disabled: false, repairDays: 0 }; c.base.facilities.push(f); } }
    c.orders = [{ attachment: 'scope', daysLeft: 1 }]; return `${f.level},${f.slot}`; });
  await p.click('[data-tab="command"]'); await p.waitForTimeout(60); await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  await p.click(`[data-slot="${ws}"]`); await p.waitForTimeout(600);
  check('scenes: the workshop bench carries its order', await E(() => /Telescopic sight/.test(document.querySelector('.rv-stage')?.textContent ?? '')));
  check('scenes ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
