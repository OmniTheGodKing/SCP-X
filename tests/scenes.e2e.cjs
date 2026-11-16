// Presentation overhaul P5: the rooms show what they're doing. The lab's board carries the selected project and a
// completion stamp; a containment wing shows its experiment and offers its occupant's tests; the workshop's bench
// carries its order; Command's map pins are the open incidents; Research and Command open on their rooms.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { GAME_URL, ROOT, OUT, close, reporter } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const save = fs.readFileSync(path.join(ROOT, 'tests/fixtures/save-v24-midgame.json'), 'utf8');
  await p.goto(GAME_URL); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('site19-campaign-v2', s); }, save); await p.reload(); await p.waitForTimeout(300);
  await close(p);
  const E = (f, a) => p.evaluate(f, a);

  // Command opens on the operations room; its map has a pin per open incident
  await p.click('[data-tab="command"]'); await p.waitForTimeout(150);
  const cmd = await E(() => ({ banner: !!document.querySelector('.stagebanner svg.interior'), pins: document.querySelectorAll('.stagebanner circle[stroke="#14181c"]').length, incidents: window.__site19.campaign.incidents.length, tele: document.querySelector('.stagebanner')?.textContent ?? '' }));
  check('scenes: Command opens on the operations room', cmd.banner, cmd);
  check('scenes: its map shows a pin for each open incident', cmd.pins === cmd.incidents, cmd);
  const crit = await E(() => window.__site19.briefing().find(b => b.sev === 'critical')?.title?.toUpperCase());
  if (crit) check('scenes: the teletype prints the critical item', cmd.tele.includes(crit.slice(0, 20)), crit);

  // Research opens on the lab; a project's name puts it on the board
  await p.click('[data-tab="research"]'); await p.waitForTimeout(150);
  check('scenes: Research opens on the lab', await E(() => !!document.querySelector('.stagebanner svg.interior')));
  const pid = await E(() => document.querySelector('[data-resfocus]')?.dataset.resfocus);
  await p.click(`[data-resfocus="${pid}"]`); await p.waitForTimeout(100);
  const board = await E(() => document.querySelector('.stagebanner')?.textContent ?? '');
  const pname = await E(id => document.querySelector(`[data-resfocus="${id}"]`).textContent.trim(), pid);
  check('scenes: selecting a project writes it on the lab\'s board', board.includes(pname.slice(0, 20)), { pname });
  await p.screenshot({ path: `${OUT}/scene-research.png` });
  // finishing it stamps the board
  await E(id => { const c = window.__site19.campaign; c.research.done.push(id); }, pid);
  await p.click('[data-tab="command"]'); await p.waitForTimeout(60); await p.click('[data-tab="research"]'); await p.waitForTimeout(120);
  await p.click('.stagebanner [data-enter]'); await p.waitForTimeout(600);
  const inLab = await E(() => ({ room: document.querySelector('.roomview')?.dataset.room, text: document.querySelector('.rv-stage')?.textContent ?? '' }));
  check('scenes: "Into the lab" goes into that lab', !!inLab.room, inLab.room);
  check('scenes: a finished project is stamped COMPLETE on the board', /COMPLETE/.test(inLab.text), inLab.text.slice(0, 120));
  await p.screenshot({ path: `${OUT}/scene-lab.png` });

  // a containment wing: its occupant's experiments, and a test under way drawn in the cell
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const wing = await E(() => { const c = window.__site19.campaign, s = c.scps.find(x => x.id === '173'), f = c.base.facilities.find(x => x.id === s.wingId); s.status = 'contained'; c.research.testing = { id: 'endurance', watchers: [] }; c.research.assigned.test_endurance = 1; return `${f.level},${f.slot}`; });
  await p.click('[data-tab="command"]'); await p.waitForTimeout(60); await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  await p.click(`[data-slot="${wing}"]`); await p.waitForTimeout(600);
  const w = await E(() => ({ stage: document.querySelector('.rv-stage')?.textContent ?? '', tests: document.querySelectorAll('.rv-ctx .test').length }));
  check('scenes: a test under way shows in the cell', /TEST IN PROGRESS/.test(w.stage), w.stage.slice(0, 100));
  check('scenes: the wing offers its occupant\'s experiments', w.tests >= 3, w.tests);
  await p.screenshot({ path: `${OUT}/scene-wing.png` });

  // the workshop: its order on the bench
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const ws = await E(() => { const c = window.__site19.campaign; let f = c.base.facilities.find(x => x.type === 'workshop');
    if (!f) { for (let l = 0; l < c.base.levels && !f; l++) for (let s = 0; s < 6 && !f; s++) if (!c.base.facilities.some(x => x.level === l && x.slot === s)) { f = { id: 'fws', type: 'workshop', level: l, slot: s, daysLeft: 0, disabled: false, repairDays: 0 }; c.base.facilities.push(f); } }
    c.orders = [{ attachment: 'scope', daysLeft: 1 }]; return `${f.level},${f.slot}`; });
  await p.click('[data-tab="command"]'); await p.waitForTimeout(60); await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  await p.click(`[data-slot="${ws}"]`); await p.waitForTimeout(600);
  check('scenes: the workshop bench carries its order', await E(() => /Telescopic sight/.test(document.querySelector('.rv-stage')?.textContent ?? '')));
  await p.screenshot({ path: `${OUT}/scene-workshop.png` });
  check('scenes ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
