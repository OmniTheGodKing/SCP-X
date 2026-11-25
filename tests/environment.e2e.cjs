// Environment-first interface: the directive's mandatory experience tests A to G. Each main screen is its room; the
// room's objects open management in place; the results are the campaign's own state; rooms keep their identity.
// Objects are clicked in the scene itself (not the shortcut bar) wherever the test is about the environment.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { GAME_URL, ROOT, OUT, close, dbg, reporter, openRoomTab } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const save = fs.readFileSync(path.join(ROOT, 'tests/fixtures/save-v24-midgame.json'), 'utf8');
  await p.goto(GAME_URL); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('site19-campaign-v2', s); }, save); await p.reload(); await p.waitForTimeout(300);
  await close(p);
  const E = (f, a) => p.evaluate(f, a);
  const tab = async t => { await openRoomTab(p, t); await p.waitForTimeout(20); };
  // click the object where people standing at it are least likely to be: its upper-left part
  const obj = async id => { const h = await p.$(`.rv-stage [data-target="${id}"] .hit`); const bb = await h.boundingBox(); await h.click({ position: { x: bb.width * 0.15, y: bb.height * 0.15 } }); await p.waitForTimeout(120); };
  const room = () => E(() => document.querySelector('.roomview')?.dataset.room ?? null);
  const panel = () => E(() => document.querySelector('.ctxpanel')?.innerText ?? null);
  // the lab needs power for its people; give the site a working generator
  await E(() => { const c = window.__site19.campaign; for (const f of c.base.facilities) if (f.type === 'generator') { f.disabled = false; f.wrecked = undefined; } });

  // ---- Test A: Research ----
  await tab('world'); await tab('research');
  const labId = await E(() => window.__site19.campaign.base.facilities.find(f => f.type === 'lab').id);
  check('A1: from World, Research opens the laboratory itself', (await room()) === labId);
  check('A2: no dashboard in between (no catalog, no dossier on screen)', await E(() => !document.querySelector('.hubgrid') && !document.querySelector('.ctxpanel')));
  await obj('board');
  check('A3: the project board, selected in the room, opens research management', /researcher/i.test((await panel()) ?? ''));
  const before = await E(() => JSON.stringify(window.__site19.campaign.research.assigned));
  await p.click('.ctxpanel [data-assign]:not([disabled])'); await p.waitForTimeout(100);
  const after = await E(() => JSON.stringify(window.__site19.campaign.research.assigned));
  check('A4: assigning a researcher changes the campaign', before !== after, { before, after });
  await p.click('#ctxClose'); await p.waitForTimeout(80);
  check('A5: closing the panel leaves the laboratory on screen', (await room()) === labId && !(await panel()));
  await obj('records');
  check('A6: the records cabinet opens the experiments dossier', await E(() => !!document.querySelector('.ctxpanel .file .test')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  check('A7: Esc puts the dossier away, still in the lab', (await room()) === labId && !(await panel()));
  const board1 = await E(() => document.querySelector('.rv-stage').textContent.replace(/\s+/g, ' ').slice(0, 400));
  await p.keyboard.press('Escape'); await p.waitForTimeout(450);
  check('A8: Esc again returns to Site-19', await E(() => !!document.querySelector('.screen-site')));
  const labSlot = await E(id => { const f = window.__site19.campaign.base.facilities.find(x => x.id === id); return `${f.level},${f.slot}`; }, labId);
  await p.click(`[data-slot="${labSlot}"]`); await p.waitForTimeout(500);
  const board2 = await E(() => document.querySelector('.rv-stage').textContent.replace(/\s+/g, ' ').slice(0, 400));
  check('A9: the lab entered from Site-19 is the same lab, with the same project', (await room()) === labId && board1 === board2);
  await p.screenshot({ path: `${OUT}/env-research.png` });

  // ---- Test B: Command ----
  await tab('personnel'); await tab('command');
  const cmdId = await E(() => window.__site19.campaign.base.facilities.find(f => f.type === 'command').id);
  check('B1: from Personnel, Command opens the command center itself', (await room()) === cmdId);
  check('B2: urgent items are on screen without a click', await E(() => document.querySelectorAll('.cmdstrip .cs-item').length > 0));
  await obj('ops');
  check('B3: the operations display opens the Director\'s Briefing', await E(() => document.querySelectorAll('.ctxpanel .brief-item').length > 0));
  const alert0 = await E(() => window.__site19.campaign.alert);
  const other = alert0 === 'heightened' ? 'normal' : 'heightened';
  await p.click(`.ctxpanel [data-alert="${other}"]`); await p.waitForTimeout(100);
  check('B4: an action there changes the campaign (alert level)', (await E(() => window.__site19.campaign.alert)) === other, { alert0, other });
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  check('B5: back to the command center', (await room()) === cmdId && !(await panel()));
  await p.screenshot({ path: `${OUT}/env-command.png` });

  // ---- Test C: Personnel ----
  await tab('personnel');
  check('C1: Personnel opens Epsilon-11\'s quarters', (await room()) === 'surface:quarters');
  const who = await E(() => document.querySelector('.rv-stage .scene-person').dataset.person);
  await p.click(`.rv-stage .scene-person[data-person="${who}"]`); await p.waitForTimeout(150);
  const heroH = await E(() => document.querySelector('.rv-stage .hero')?.getBoundingClientRect().height ?? 0);
  check('C2: the operative comes forward, full height (over half the scene)', heroH > (await E(() => document.querySelector('.rv-stage').getBoundingClientRect().height)) * 0.5, heroH);
  const fig0 = await E(() => document.querySelector('.rv-stage .hero').innerHTML);
  await p.click('.ctxpanel [data-look="coat"][data-d="1"]'); await p.waitForTimeout(100);
  check('C3: changing their jacket changes the figure', fig0 !== (await E(() => document.querySelector('.rv-stage .hero').innerHTML)));
  const look = await E(id => JSON.stringify(window.__site19.campaign.roster.find(o => o.id === id).look), who);
  await tab('world'); await tab('personnel');
  await p.click(`.rv-stage .scene-person[data-person="${who}"]`); await p.waitForTimeout(120);
  check('C4: leaving and returning, they look the same', look === (await E(id => JSON.stringify(window.__site19.campaign.roster.find(o => o.id === id).look), who)));
  await p.screenshot({ path: `${OUT}/env-personnel.png` });

  // ---- Test D: Armory, from the operative ----
  await E(() => { const c = window.__site19.campaign; c.research.done.push('att_scope'); c.attachments.scope = (c.attachments.scope ?? 0) + 1; });
  await p.click('.ctxpanel [data-armfor]'); await p.waitForTimeout(600);
  check('D1: their weapon goes on the armory bench', (await room()) === 'surface:armory' && await E(() => !!document.querySelector('.benchgun')));
  const model = await E(id => { const c = window.__site19.campaign, o = c.roster.find(x => x.id === id); return c.models[o.weapon ?? 'rifle']; }, who);
  const optic = await p.$('.rv-stage .mount[data-mount="optic"] circle');
  if (optic) {
    await optic.click(); await p.waitForTimeout(100);
    await p.click('[data-armprev="scope"]'); await p.waitForTimeout(100);
    check('D2: the scope is previewed on the weapon', await E(() => !!document.querySelector('.benchgun [stroke-dasharray="6 4"]')));
    await p.click('#armFit'); await p.waitForTimeout(120);
    const fit = await E(id => { const c = window.__site19.campaign, o = c.roster.find(x => x.id === id); return o.attachment; }, who);
    check('D3: fitted, for real', fit === 'scope', { fit, model });
    await p.click('#roomBack'); await p.waitForTimeout(200);
    check('D4: back to the quarters', (await room()) === 'surface:quarters');
    await p.reload(); await p.waitForTimeout(400); await close(p);
    check('D5: still fitted after a reload', (await E(id => window.__site19.campaign.roster.find(o => o.id === id).attachment, who)) === 'scope');
  } else check(`D2: the ${model} has an optic mount`, false, model);

  // ---- Test E: Engineering ----
  const wsSlot = await E(() => { const c = window.__site19.campaign; let f = c.base.facilities.find(x => x.type === 'workshop');
    if (!f) for (let l = 0; l < c.base.levels && !f; l++) for (let s = 0; s < 6 && !f; s++) if (!c.base.facilities.some(x => x.level === l && x.slot === s)) { f = { id: 'fws', type: 'workshop', level: l, slot: s, daysLeft: 0, disabled: false, repairDays: 0 }; c.base.facilities.push(f); }
    c.funds = 5000; c.research.done.push('att_extmag'); return `${f.level},${f.slot}`; });
  await tab('command'); await tab('site');
  await p.click(`[data-slot="${wsSlot}"]`); await p.waitForTimeout(500);
  await obj('workbench');
  const orders0 = await E(() => window.__site19.campaign.orders.length);
  const ord = await p.$('.ctxpanel [data-att]:not([disabled]), .ctxpanel [data-order]:not([disabled])');
  if (ord) { await ord.click(); await p.waitForTimeout(120); await close(p); }
  check('E1: the workbench starts a real engineering order', (await E(() => window.__site19.campaign.orders.length)) === orders0 + 1);
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  check('E2: the workshop is still the scene', (await E(() => document.querySelector('.roomview') && !document.querySelector('.ctxpanel'))) === true);
  await obj('lathe');
  check('E3: the lathe shows the order in production', /day/.test((await panel()) ?? ''));
  await p.screenshot({ path: `${OUT}/env-workshop.png` });

  // ---- Test F: D-Class ----
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(450);
  const bSlot = await E(() => { const f = window.__site19.campaign.base.facilities.find(x => x.type === 'barracks'); return `${f.level},${f.slot}`; });
  await p.click(`[data-slot="${bSlot}"]`); await p.waitForTimeout(500);
  await obj('bunks');
  check('F1: the bunks show occupancy and capacity', /of \d+ beds/.test((await panel()) ?? ''));
  await p.keyboard.press('Escape'); await obj('notices');
  const pol0 = await E(() => window.__site19.campaign.dPolicy);
  const pol1 = pol0 === 'retain' ? 'terminate' : 'retain';
  await p.selectOption('.ctxpanel select[data-dpolicy]', pol1); await p.waitForTimeout(100);
  check('F2: the orders board changes the monthly order', (await E(() => window.__site19.campaign.dPolicy)) === pol1, { pol0, pol1 });
  await p.screenshot({ path: `${OUT}/env-dclass.png` });

  // ---- Test G: the same room by either way in, across a reload ----
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(450);
  await p.click(`[data-slot="${labSlot}"]`); await p.waitForTimeout(400);
  const viaSite = await room();
  await tab('research');
  const viaTab = await room();
  check('G1: Site-19 and the Research tab reach the same lab', viaSite === labId && viaTab === labId, { viaSite, viaTab });
  await p.reload(); await p.waitForTimeout(400); await close(p);
  await tab('research');
  check('G2: and after a reload', (await room()) === labId);
  check('environment tests ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
