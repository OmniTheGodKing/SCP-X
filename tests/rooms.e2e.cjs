// Presentation overhaul P2: Site-19 as one place. Selecting a room goes into that room; leaving comes back to the
// same spot on the overview; the same room looks the same each time; rooms reflect their state; the surface
// buildings are rooms too; the room's controls still work from inside it.
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
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);

  // into the lab
  const lab = await E(() => { const f = window.__site19.campaign.base.facilities.find(x => x.type === 'lab'); return { id: f.id, slot: `${f.level},${f.slot}` }; });
  await p.click(`[data-slot="${lab.slot}"]`); await p.waitForTimeout(700);
  const inLab = await E(() => ({ room: document.querySelector('.roomview')?.dataset.room, svg: !!document.querySelector('.rv-stage svg.interior'), title: document.querySelector('.rv-title')?.innerText }));
  check('rooms: selecting the lab goes into that lab', inLab.room === lab.id && inLab.svg, inLab);
  await p.screenshot({ path: `${OUT}/room-lab.png` });
  const art1 = await E(() => document.querySelector('.rv-stage').innerHTML);

  // out again with Esc: the overview, the same room selected
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const back = await E(() => ({ overview: !!document.querySelector('.screen-site'), ghostGone: !document.querySelector('.rv-ghost') }));
  check('rooms: Esc returns to the Site-19 overview', back.overview, back);
  await p.waitForTimeout(400);
  check('rooms: the closing transition cleans up after itself', await E(() => !document.querySelector('.rv-ghost')));

  // the same room is the same room
  await p.click(`[data-slot="${lab.slot}"]`); await p.waitForTimeout(700);
  const art2 = await E(() => document.querySelector('.rv-stage').innerHTML);
  check('rooms: going back into the lab shows the same lab', art1 === art2);

  // step to the next rooms along without the overview
  const ids = [];
  for (let i = 0; i < 3; i++) { await p.keyboard.press(']'); await p.waitForTimeout(80); ids.push(await E(() => document.querySelector('.roomview')?.dataset.room)); }
  check('rooms: ] steps through the installation room by room', new Set(ids).size === 3 && !ids.includes(lab.id), ids);

  // a damaged room shows it, and its repair works from inside
  const dmg = await E(() => { const f = window.__site19.campaign.base.facilities.find(x => x.disabled && x.repairDays === 0); return f ? { id: f.id, slot: `${f.level},${f.slot}` } : null; });
  if (dmg) {
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await p.click(`[data-slot="${dmg.slot}"]`); await p.waitForTimeout(700);
    const st = await E(() => document.querySelector('.rv-state')?.innerText);
    check('rooms: a damaged room says so', /damaged|wrecked/i.test(st), st);
    await p.screenshot({ path: `${OUT}/room-damaged.png` });
    await openTarget(p, 'service');
    if (await p.$('#repairBtn:not([disabled])')) {
      await p.click('#repairBtn'); await p.waitForTimeout(150); await close(p);
      const after = await E(() => document.querySelector('.rv-state')?.innerText);
      check('rooms: repair from inside the room, and the room shows it is under repair', /repair/i.test(after), after);
    }
  }

  // the surface: the armory and Epsilon-11's quarters
  await p.click('[data-tab="site"]'); await p.waitForTimeout(500);
  check('rooms: the Site-19 tab inside a room returns to the overview', await E(() => !!document.querySelector('.screen-site')));
  await p.click('[data-enter="surface:quarters"]'); await p.waitForTimeout(700);
  const q = await E(() => ({ room: document.querySelector('.roomview')?.dataset.room, people: document.querySelectorAll('.scene-person').length }));
  check('rooms: Epsilon-11 quarters, with the operatives in them', q.room === 'surface:quarters' && q.people >= 4, q);
  const who = await E(() => document.querySelectorAll('.scene-person')[1].dataset.person);
  await p.click(`.scene-person[data-person="${who}"]`); await p.waitForTimeout(150);
  const picked = await E(() => ({ hero: document.querySelector('.hero')?.dataset.person, panel: document.querySelector('.ctxpanel')?.innerText.slice(0, 60) }));
  check('quarters: selecting an operative brings them forward, full height, with their file', picked.hero === who, picked);
  await p.screenshot({ path: `${OUT}/room-quarters.png` });

  // live customization: each change redraws the figure at once and is saved with the campaign
  const fig = () => E(() => document.querySelector('.hero')?.innerHTML ?? '');
  const f0 = await fig();
  for (const k of ['skin', 'hair', 'face', 'coat', 'accessory']) {
    const before = await fig();
    await p.click(`[data-look="${k}"][data-d="1"]`); await p.waitForTimeout(80);
    check(`quarters: changing ${k} changes how they look`, (await fig()) !== before);
  }
  const look = await E(id => JSON.stringify(window.__site19.campaign.roster.find(o => o.id === id).look), who);
  await p.reload(); await p.waitForTimeout(400); await close(p);
  const lookAfter = await E(id => JSON.stringify(window.__site19.campaign.roster.find(o => o.id === id).look), who);
  check('quarters: their new look is saved', look === lookAfter && f0 !== '', { look, lookAfter });
  await p.click('[data-tab="site"]'); await p.waitForTimeout(300);
  await p.click('[data-enter="surface:quarters"]'); await p.waitForTimeout(500);
  if (!(await p.$('.hero'))) { await p.click(`.scene-person[data-person="${who}"]`); await p.waitForTimeout(150); }
  for (const sec of ['loadout', 'abilities', 'record', 'bio', 'appearance']) {
    await p.click(`[data-opsec="${sec}"]`); await p.waitForTimeout(60);
    check(`quarters: the ${sec} section opens`, await E(s => document.querySelector(`[data-opsec="${s}"]`)?.getAttribute('aria-selected') === 'true', sec));
  }
  await p.screenshot({ path: `${OUT}/room-quarters-custom.png` });
  await p.click('#squadBtn'); await p.waitForTimeout(100);
  check('quarters: back to the whole squad', await E(() => !document.querySelector('.hero') && document.querySelectorAll('.scene-person').length >= 4));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.click('[data-enter="surface:armory"]'); await p.waitForTimeout(700);
  check('rooms: the armory', await E(() => document.querySelector('.roomview')?.dataset.room === 'surface:armory'));
  await p.screenshot({ path: `${OUT}/room-armory.png` });

  // the panel can be put away
  // the panel belongs to the object: it closes, and the room is left uncovered
  await openTarget(p, 'racks');
  check('rooms: selecting an object opens its panel', await E(() => !!document.querySelector('.ctxpanel')));
  await p.click('#ctxClose'); await p.waitForTimeout(80);
  check('rooms: closing it leaves the room uncovered', await E(() => !document.querySelector('.ctxpanel')));

  // transitions can be switched off and the game still navigates
  await E(() => localStorage.setItem('site19-transitions', 'off'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  check('rooms: with transitions off, leaving is immediate', await E(() => !!document.querySelector('.screen-site') && !document.querySelector('.rv-ghost')));
  check('rooms ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
