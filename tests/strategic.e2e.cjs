// Strategic overhaul C: the Command screen and the Site-19 screen, driven through the UI from a mid-game save.
// The Director's Briefing leads Command and each item opens its screen; Site-19's cross-section builds, repairs and
// shows containment risk; rejected commands change nothing.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { GAME_URL, ROOT, close, reporter } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const save = fs.readFileSync(path.join(ROOT, 'tests/fixtures/save-v24-midgame.json'), 'utf8');
  await p.goto(GAME_URL); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('site19-campaign-v2', s); }, save); await p.reload(); await p.waitForTimeout(300);
  await close(p);
  const E = (f, a) => p.evaluate(f, a);

  // ---- header ----
  const hdr = await E(() => ({ ro: [...document.querySelectorAll('.readouts .ro .k')].map(e => e.textContent), sys: !!document.querySelector('.sysmenu') }));
  check('header: one readout strip with funds, standing, exposure and power', ['Funds', 'Standing', 'Exposure', 'Power'].every(k => hdr.ro.includes(k)), hdr.ro);
  check('header: campaigns, saves and sound live in the system menu', hdr.sys);
  const roRows = await E(() => { const r = [...document.querySelectorAll('.readouts .ro')].map(e => e.getBoundingClientRect().top); return new Set(r.map(Math.round)).size; });
  check('header: the readouts fit on one line at 1440px', roRows === 1, roRows);

  // ---- Command: the briefing ----
  await p.click('[data-tab="command"]'); await p.waitForTimeout(100);
  const brief = await E(() => [...document.querySelectorAll('.brief-item')].map(e => ({ sev: [...e.classList].find(k => ['critical', 'important', 'routine'].includes(k)), title: e.querySelector('b')?.textContent, go: e.querySelector('[data-brief]')?.dataset.brief })));
  check('command: the Director\'s Briefing lists items', brief.length > 0, brief.length);
  const order = { critical: 0, important: 1, routine: 2 };
  check('command: briefing items are sorted by severity', brief.every((x, i) => i === 0 || order[brief[i - 1].sev] <= order[x.sev]), brief.map(x => x.sev));
  check('command: every briefing item has a button that opens a screen', brief.every(x => !!x.go), brief.map(x => x.go));
  const cnt = await E(() => document.querySelector('[data-tab="command"] .cnt')?.textContent);
  check('command: the tab counts the non-routine items', Number(cnt) === brief.filter(x => x.sev !== 'routine').length, { cnt, brief: brief.length });
  // following an item to the Site-19 screen
  const siteItem = brief.findIndex(x => x.go.startsWith('site|'));
  if (siteItem >= 0) {
    await p.click(`.brief-item:nth-child(${siteItem + 1}) [data-brief]`); await p.waitForTimeout(100);
    const on = await E(() => document.querySelector('.tab.on')?.dataset.tab);
    check('command: a Site-19 briefing item opens the Site-19 screen', on === 'site', on);
  } else check('command: a Site-19 briefing item exists in the mid-game save', false, brief);

  // ---- Site-19 ----
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  if (await p.$('#siteOverview')) { await p.click('#siteOverview'); await p.waitForTimeout(100); }
  const ov = await E(() => ({ panels: [...document.querySelectorAll('.screen-site .ctx .panel-h b')].map(e => e.textContent), risk: [...document.querySelectorAll('.screen-site .ctx .rows .r .v')].map(e => e.textContent).slice(0, 6) }));
  check('site: with nothing selected the side panel shows the site overview', ['Site operations', 'Containment', 'Work and crews'].every(k => ov.panels.includes(k)), ov.panels);
  check('site: containment rows give a 30-day risk', ov.risk.some(v => /^\d+%$|BREACH/.test(v)), ov.risk);
  const xs = await E(() => { const x = document.querySelector('.screen-site .xsection').getBoundingClientRect(), w = document.querySelector('.screen-site').getBoundingClientRect(); return x.width / w.width; });
  check('site: the cross-section takes most of the width', xs > 0.55, xs);

  // build in an empty slot through the screen
  const empty = await E(() => document.querySelector('.slot.empty')?.dataset.slot);
  if (empty) {
    await p.click(`[data-slot="${empty}"]`); await p.waitForTimeout(100);
    const before = await E(() => ({ funds: window.__site19.campaign.funds, n: window.__site19.campaign.base.facilities.length }));
    const btn = await p.$('[data-build]:not([disabled])');
    if (btn) {
      await btn.click(); await p.waitForTimeout(100); await close(p);
      const after = await E(() => ({ funds: window.__site19.campaign.funds, n: window.__site19.campaign.base.facilities.length }));
      check('site: building from the screen adds a facility and spends funds', after.n === before.n + 1 && after.funds < before.funds, { before, after });
    } else {
      const why = await E(() => document.querySelector('[data-build]')?.getAttribute('title'));
      check('site: unavailable builds say why', !!why, why);
    }
  } else check('site: the mid-game save has an empty slot', false);

  // repair a damaged facility
  const dmg = await E(() => { const c = window.__site19.campaign; const f = c.base.facilities.find(x => x.disabled && x.repairDays === 0); return f ? `${f.level},${f.slot}` : null; });
  if (dmg) {
    await p.click(`[data-slot="${dmg}"]`); await p.waitForTimeout(100);
    const can = await E(() => !!document.querySelector('#repairBtn:not([disabled])'));
    if (can) {
      await p.click('#repairBtn'); await p.waitForTimeout(100); await close(p);
      const rep = await E(s => { const [l, sl] = s.split(',').map(Number); return window.__site19.campaign.base.facilities.find(x => x.level === l && x.slot === sl).repairDays; }, dmg);
      check('site: repair from the screen starts the work', rep > 0, rep);
    } else {
      const why = await E(() => document.querySelector('#repairBtn')?.getAttribute('title'));
      check('site: a repair that cannot start says why', !!why, why);
    }
  }

  // a rejected command changes nothing: excavate with no money
  const rej = await E(() => { const c = window.__site19.campaign; const snap = JSON.stringify(c); const keep = c.funds; c.funds = -500; const pre = JSON.stringify(c); const r = window.__site19.dispatch ? window.__site19.dispatch({ type: 'excavate' }) : null; const same = JSON.stringify(c) === pre; c.funds = keep; return { has: !!r, ok: r?.ok, same, snapOk: !!snap }; });
  if (rej.has) check('commands: a rejected command leaves the campaign unchanged', rej.ok === false && rej.same, rej);

  // research: the tab opens on a category with projects, and project rows keep their layout (a stray .proj rule once
  // broke them)
  await p.click('[data-tab="research"]'); await p.waitForTimeout(100);
  const rs = await E(() => { const rows = [...document.querySelectorAll('.projects .proj')]; return { n: rows.length, tall: rows.slice(0, 3).map(r => Math.round(r.getBoundingClientRect().height)) }; });
  check('research: opens on a category with projects', rs.n > 0, rs);
  check('research: project rows are compact', rs.tall.every(h => h < 180), rs.tall);
  // personnel: an operative is shown without having to pick one
  await p.click('[data-tab="personnel"]'); await p.waitForTimeout(100);
  const op = await E(() => ({ sel: !!document.querySelector('.oprow.sel'), detail: !!document.querySelector('.screen-personnel .col:nth-child(2) .card') }));
  check('personnel: the first operative is selected and shown large', op.sel && op.detail, op);
  // site: work and crews name the engineers
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  if (await p.$('#siteOverview')) { await p.click('#siteOverview'); await p.waitForTimeout(100); }
  const crew = await E(() => document.querySelector('.panel.crew')?.innerText ?? '');
  check('site: the work and crews panel names engineers', /\b[A-Z][a-z]+ [A-Z][a-z]+/.test(crew), crew.slice(0, 200));

  // the strategic inspector in the debug panel: read-only, and it doesn't mark the save
  const dbgBefore = await E(() => !!window.__site19.campaign.debug);
  await E(() => { window.__site19.campaign.debug = false; document.activeElement?.blur?.(); });
  await p.keyboard.press('`'); await p.waitForTimeout(150);
  const insp = await E(() => document.querySelector('.dbg-inspect')?.innerText ?? '');
  check('inspector: shows funds, breach risk, Insurgency scores and invariants', /funds/i.test(insp) && /breach risk/i.test(insp) && /operation/i.test(insp) && /invariants/i.test(insp), insp.slice(0, 200));
  check('inspector: invariants hold on the mid-game save', /invariants hold/i.test(insp), insp.slice(0, 80));
  await p.click('[data-dbg="close"]').catch(() => {}); await p.waitForTimeout(100);
  check('inspector: looking does not mark the save as a debug save', !(await E(() => !!window.__site19.campaign.debug)));
  await E(v => { window.__site19.campaign.debug = v || undefined; }, dbgBefore);

  // credits
  await p.click('.sysmenu > summary'); await p.click('#creditsBtn'); await p.waitForTimeout(100);
  const cred = await E(() => document.body.innerText.includes('Moto42') && document.body.innerText.includes('CC BY-SA'));
  check('credits: the credits list SCP authors and the licence', cred);
  if (await p.$('#creditsClose')) await p.click('#creditsClose');

  // 1920 layout: no horizontal scroll
  await p.setViewportSize({ width: 1920, height: 1080 });
  for (const t of ['command', 'world', 'site', 'research', 'personnel', 'history']) {
    await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(100);
    const sc = await E(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(`layout: ${t} has no horizontal scroll at 1920px`, sc);
  }
  await p.setViewportSize({ width: 1280, height: 800 });
  for (const t of ['command', 'world', 'site', 'research', 'personnel', 'history']) {
    await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(100);
    const sc = await E(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(`layout: ${t} has no horizontal scroll at 1280px`, sc);
  }
  check('strategic screens ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
