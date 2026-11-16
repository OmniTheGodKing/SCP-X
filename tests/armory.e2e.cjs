// Presentation overhaul P4: the armory bench. An operative's weapon is laid out large with its mounts; a mount shows
// what it takes; a preview draws the attachment on the weapon and the figures change; Fit really fits it (stores,
// the mission gun, the save); an impossible fit is refused with the reason; Remove gives it back.
const { chromium } = require('playwright');
const { fresh, close, reporter, OUT } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const { p, errs, E } = await fresh(b, { width: 1440, height: 900 });
  await p.waitForTimeout(300); await close(p);
  if (await p.$('#coachOff')) await p.click('#coachOff');
  // research and stores for the test: a scope and an extended magazine
  const who = await E(() => { const c = window.__site19.campaign; c.research.done.push('att_scope', 'att_extmag'); c.attachments = { scope: 1, extmag: 1 };
    const o = c.roster.find(x => (x.weapon ?? 'rifle') === 'rifle' && c.models.rifle === 'm1_garand') ?? c.roster[0]; return o.id; });
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  await p.click('[data-enter="surface:armory"]'); await p.waitForTimeout(600);
  await p.click(`[data-armop="${who}"]`); await p.waitForTimeout(150);
  const bench = await E(() => ({ gun: !!document.querySelector('.benchgun'), mounts: [...document.querySelectorAll('.rv-stage .mount')].map(m => m.dataset.mount) }));
  check('armory: the weapon goes on the bench with its mounts marked', bench.gun && bench.mounts.length >= 3, bench);
  const model = await E(id => { const c = window.__site19.campaign, o = c.roster.find(x => x.id === id); return c.models[o.weapon ?? 'rifle']; }, who);
  if (model === 'm1_garand') check('armory: the Garand shows no magazine mount (en-bloc clip)', !bench.mounts.includes('magazine'), bench.mounts);
  await p.screenshot({ path: `${OUT}/armory-bench.png` });

  // the optic mount, selected on the weapon itself
  const gun0 = await E(() => document.querySelector('.benchgun').innerHTML);
  await p.click('.rv-stage .mount[data-mount="optic"] circle'); await p.waitForTimeout(100);
  check('armory: selecting a mount highlights it and lists what it takes', await E(() => !!document.querySelector('.rv-stage .mount.on') && document.querySelectorAll('[data-armprev]').length >= 1));
  await p.click('[data-armprev="scope"]'); await p.waitForTimeout(100);
  const prev = await E(() => ({ gun: document.querySelector('.benchgun').innerHTML, aim: [...document.querySelectorAll('.armbench .rows .r')].find(r => /Aim/.test(r.innerText))?.innerText }));
  check('armory: previewing draws the scope on the weapon', prev.gun !== gun0);
  check('armory: and the figures show the change before and after', /→/.test(prev.aim ?? ''), prev.aim);
  await p.click('[data-armzoom="1"]'); await p.waitForTimeout(80);
  check('armory: the view closes in on the mount', await E(() => /scale\((\d+(\.\d+)?)\)/.exec(document.querySelector('.benchgun').getAttribute('transform'))[1] > 1.2));
  await p.screenshot({ path: `${OUT}/armory-preview.png` });
  await p.click('#armCancel'); await p.waitForTimeout(80);
  check('armory: cancel leaves the weapon as it was', await E(id => !window.__site19.campaign.roster.find(o => o.id === id).attachment, who));

  // fit for real
  await p.click('[data-armprev="scope"]'); await p.waitForTimeout(80);
  await p.click('#armFit'); await p.waitForTimeout(120);
  const fitted = await E(id => { const c = window.__site19.campaign; return { att: c.roster.find(o => o.id === id).attachment, stores: c.attachments.scope ?? 0 }; }, who);
  check('armory: Fit fits it and takes it from stores', fitted.att === 'scope' && fitted.stores === 0, fitted);
  check('armory: the weapon on the bench now carries it', await E(() => document.querySelector('.benchgun').innerHTML.length > 0 && !document.querySelector('.benchgun [stroke-dasharray="6 4"]')));

  // an impossible fit: refused with the reason
  if (model === 'm1_garand') {
    const r = await E(id => window.__site19.dispatch({ type: 'fitAttachment', opId: id, attachment: 'extmag' }), who);
    check('armory: the Garand refuses an extended magazine, with the reason', r.ok === false && /can't take/.test(r.reason), r);
  }

  // the operative carries it: in the quarters their figure has the scope, and it survives a reload
  await p.reload(); await p.waitForTimeout(400); await close(p);
  check('armory: the fit is saved', await E(id => window.__site19.campaign.roster.find(o => o.id === id).attachment === 'scope', who));
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  await p.click('[data-enter="surface:armory"]'); await p.waitForTimeout(500);
  await p.click(`[data-armop="${who}"]`); await p.waitForTimeout(100);
  await p.click('#armRemove'); await p.waitForTimeout(100);
  const removed = await E(id => { const c = window.__site19.campaign; return { att: c.roster.find(o => o.id === id).attachment, stores: c.attachments.scope }; }, who);
  check('armory: Remove gives it back to stores', !removed.att && removed.stores === 1, removed);
  check('armory ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
