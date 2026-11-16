// Strategic overhaul M1: the end-to-end campaign sequence from the brief, played through the hub's own controls.
//  1 begin a campaign · 2 review Site-19 · 3 assign personnel · 4 begin research · 5 construct a facility ·
//  6 manufacture equipment · 7 manage containment · 8 advance time · 9 receive an important event ·
// 10 respond through the Director's Briefing · 11 select a global mission · 12 deploy an MTF ·
// 13 complete the tactical mission · 14 return to the strategic layer · 15 verify persistent consequences ·
// 16 save and reload · 17 continue the campaign.
// The tactical fight itself is covered by the tactical suites; here it is ended with the debug "Win now" control.
const { chromium } = require('playwright');
const { fresh, close, dbg, reporter, OUT } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const { p, errs, E } = await fresh(b, { width: 1440, height: 900 });
  await p.waitForTimeout(300); await close(p);
  const C = (f, a) => E(f, a);
  const tab = async t => { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(80); };
  const inv = () => E(() => window.__site19.invariants());
  /** Run the World clock at 4× until cond() is true (closing notices as they come), up to `ms` of real time. */
  async function runUntil(cond, ms = 30000) {
    await tab('world');
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await close(p);
      if (await E(cond)) break;
      const btn = await p.$('[data-speed="4"]:not([disabled])');
      if (btn) await btn.click().catch(() => {});
      await p.waitForTimeout(400);
      if (await p.$('#returnBtn')) break;
    }
    await p.click('[data-speed="0"]').catch(() => {}); await close(p);
    return E(cond);
  }

  // 1 begin a campaign (a first visit starts one; the briefings are switched off for this run)
  const start = await C(() => ({ day: window.__site19.campaign.day, ops: window.__site19.campaign.roster.length }));
  check('1: a campaign begins', start.day === 1 && start.ops >= 4, start);
  if (await p.$('#coachOff')) await p.click('#coachOff');

  // 2 review Site-19
  await tab('site');
  const ov = await C(() => [...document.querySelectorAll('.screen-site .ctx .panel-h b')].map(e => e.textContent));
  check('2: Site-19 shows the cross-section and the site overview', ov.includes('Site operations') && ov.includes('Containment'), ov);

  // 3 assign personnel: post any unposted guard at a Security station
  const sec = await C(() => { const c = window.__site19.campaign; const f = c.base.facilities.find(x => x.type === 'security'); return f ? `${f.level},${f.slot}` : null; });
  if (sec) { await p.click(`[data-slot="${sec}"]`); await p.waitForTimeout(80); }
  const before3 = await C(() => window.__site19.campaign.guards.filter(g => g.stationId).length);
  const postBtn = await p.$('[data-post]');
  if (postBtn) { await postBtn.click(); await p.waitForTimeout(80); }
  const after3 = await C(() => window.__site19.campaign.guards.filter(g => g.stationId).length);
  check('3: personnel assigned (a guard posted, or every guard already at a post)', after3 > before3 || !postBtn, { before3, after3, hadButton: !!postBtn });

  // 4 begin research
  await tab('research');
  await p.click('[data-assign]:not([disabled])'); await p.waitForTimeout(80);
  const res = await C(() => Object.values(window.__site19.campaign.research.assigned).reduce((a, n) => a + n, 0));
  check('4: a researcher is on a project', res >= 1, res);

  // 5 construct a facility. A fresh site has no power to spare, so a generator goes in first, then the workshop
  const facAt = (slot) => C(s => { const [l, k] = s.split(',').map(Number); const f = window.__site19.campaign.base.facilities.find(x => x.level === l && x.slot === k); return f ? { type: f.type, days: f.daysLeft } : null; }, slot);
  const doneAt = (slot) => new Function(`const [l, k] = ${JSON.stringify(slot)}.split(',').map(Number); const f = window.__site19.campaign.base.facilities.find(x => x.level === l && x.slot === k); return !!f && f.daysLeft === 0;`);
  async function buildIn(type) {
    await tab('site');
    if (await p.$('#siteOverview')) await p.click('#siteOverview');
    const slot = await C(() => document.querySelector('.slot.empty')?.dataset.slot);
    await p.click(`[data-slot="${slot}"]`); await p.waitForTimeout(80);
    const btn = await p.$(`[data-build="${type}"]:not([disabled])`);
    const why = btn ? null : await C(t => document.querySelector(`[data-build="${t}"]`)?.getAttribute('title'), type);
    if (btn) { await btn.click(); await p.waitForTimeout(80); await close(p); }
    return { slot, why };
  }
  const ws0 = await C(() => document.querySelector('[data-build="workshop"]')?.getAttribute('title') ?? null);
  const gen = await buildIn('generator');
  const genF = await facAt(gen.slot);
  check('5: construction starts (a generator first, for the power a workshop needs)', !!genF && genF.type === 'generator' && genF.days > 0, { genF, why: gen.why, ws0 });

  // 8 advance time (on the World clock) until the generator is finished
  const day0 = await C(() => window.__site19.campaign.day);
  const advanced = await runUntil(doneAt(gen.slot), 120000);
  const day1 = await C(() => window.__site19.campaign.day);
  check('8: time advances on the World clock and the building finishes', advanced && day1 > day0, { day0, day1, advanced });

  // then the workshop, and time again until it stands
  await C(() => { window.__site19.campaign.funds = Math.max(window.__site19.campaign.funds, 400); });
  const ws = await buildIn('workshop');
  const wsF = await facAt(ws.slot);
  check('5: a workshop goes up once there is power for it', !!wsF && wsF.type === 'workshop', { wsF, why: ws.why });
  const wsDone = await runUntil(doneAt(ws.slot), 150000);   // generous: under a full parallel test run the clock is slower

  // 6 manufacture equipment at the workshop
  if (wsDone) {
    await tab('site');
    await p.click(`[data-slot="${ws.slot}"]`); await p.waitForTimeout(80);
    const sel = '[data-order]:not([disabled]), [data-att]:not([disabled]), [data-ammoorder]:not([disabled])';
    let ord = await p.$(sel);
    if (!ord) { await dbg(p, 'unlockall'); await tab('site'); await p.click(`[data-slot="${ws.slot}"]`); await p.waitForTimeout(80); ord = await p.$(sel); }
    const n0 = await C(() => window.__site19.campaign.orders.length);
    if (ord) { await ord.click(); await p.waitForTimeout(80); await close(p); }
    const n1 = await C(() => window.__site19.campaign.orders.length);
    check('6: an equipment order is placed at the workshop', n1 === n0 + 1, { n0, n1 });
  } else check('6: the workshop finished', false, await facAt(ws.slot));

  // 7 manage containment: clean SCP-173's cell from its wing
  await tab('site');
  const wing = await C(() => { const c = window.__site19.campaign, s = c.scps[0], f = c.base.facilities.find(x => x.id === s.wingId); return f ? `${f.level},${f.slot}` : null; });
  await p.click(`[data-slot="${wing}"]`); await p.waitForTimeout(80);
  const clean0 = await C(() => window.__site19.campaign.scps[0].lastCleaned);
  const cleanBtn = await p.$('[data-clean]:not([disabled])');
  if (cleanBtn) { await cleanBtn.click(); await p.waitForTimeout(120); await close(p); }
  const clean1 = await C(() => ({ last: window.__site19.campaign.scps[0].lastCleaned, day: window.__site19.campaign.day, why: document.querySelector('[data-clean]')?.getAttribute('title') }));
  // the standing order may have cleaned it days ago: then there's nothing to do yet, and that is also managed
  check('7: containment work is done from the wing (or it is already done, or the screen says why not)', clean1.last === clean1.day || (!cleanBtn && (!!clean1.why || clean1.day - clean1.last < 7)), { clean0, clean1 });

  // 9 receive an important event: run time until something lands in the briefing as critical or important
  const got = await runUntil(() => window.__site19.briefing().some(x => x.sev !== 'routine' && (x.tab === 'world' || x.tab === 'command') && !!x.focus && window.__site19.campaign.incidents.some(i => i.id === x.focus)), 90000);
  check('9: an incident arrives and the Director\'s Briefing raises it', got, await C(() => window.__site19.briefing().map(x => `${x.sev}:${x.title}`)));

  // 10 respond through the Director's Briefing
  await tab('command');
  const item = await C(() => { const el = [...document.querySelectorAll('.brief-item [data-brief]')].find(b => /^(world|command)\|/.test(b.dataset.brief) && b.dataset.brief.split('|')[1]); return el?.dataset.brief ?? null; });
  const incId = await C(() => window.__site19.campaign.incidents.find(i => !i.dispatch)?.id);
  if (item) { await p.click(`.brief-item [data-brief="${item}"]`); await p.waitForTimeout(120); }
  const onTab = await C(() => document.querySelector('.tab.on')?.dataset.tab);
  check('10: a briefing item takes the Director to the incident', !!item && (onTab === 'world' || onTab === 'command'), { item, onTab });

  // 11 select a global mission, 12 deploy an MTF
  const target = (item && item.split('|')[1]) || incId;
  await tab('command');
  const planBtn = await p.$(`[data-plan="${target}"]`) ?? await p.$('[data-plan]');
  if (planBtn) { await planBtn.click(); await p.waitForTimeout(150); }
  const planning = await C(() => !!document.querySelector('#launchBtn'));
  check('11: a mission is selected and its deployment screen is open', planning);
  await p.click('#launchBtn').catch(() => {}); await p.waitForTimeout(300); await close(p);
  // a far incident means a flight: land it now
  if (await C(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await tab('world'); await p.click('[data-speed="1"]').catch(() => {}); await p.waitForTimeout(1200); await close(p); }
  const inMission = await C(() => !!window.__site19.mission && !window.__site19.mission.over);
  check('12: Epsilon-11 deploys and the tactical mission starts', inMission);

  // 13 complete it, 14 return to the strategic layer
  const squad = await C(() => window.__site19.mission?.units.filter(u => u.side === 'mtf' && u.opId).map(u => u.opId) ?? []);
  const before15 = await C(() => { const c = window.__site19.campaign; return { won: c.stats.won, inc: c.incidents.length, missions: Object.fromEntries(c.roster.map(o => [o.id, o.missions])), guards: Object.fromEntries(c.guards.map(g => [g.id, g.breaches])) }; });
  await dbg(p, 'win'); await p.waitForTimeout(300);
  check('13: the mission ends in a win', await C(() => window.__site19.mission?.result?.win === true));
  if (await p.$('#returnBtn')) await p.click('#returnBtn');
  await p.waitForTimeout(300); await close(p);
  check('14: back at the hub', !!(await p.$('.hub')));

  // 15 persistent consequences
  const after15 = await C(() => { const c = window.__site19.campaign; return { won: c.stats.won, missions: Object.fromEntries(c.roster.map(o => [o.id, o.missions])), log: c.log.slice(0, 6).map(l => l.text).join(' / ') }; });
  check('15: the win is on the record', after15.won === before15.won + 1, { before: before15.won, after: after15.won });
  // a breach is answered by Site Security first: guards record the breach, operatives the mission
  const service = await C(ids => Object.fromEntries(ids.map(id => { const c = window.__site19.campaign, g = c.guards.find(x => x.id === id), o = c.roster.find(x => x.id === id); return [id, g ? { breaches: g.breaches, alive: g.alive } : o ? { missions: o.missions, alive: o.alive } : null]; })), squad);
  check('15: everyone who went has it on their service record', squad.length > 0 && squad.every(id => { const r = service[id]; return r && (!r.alive || ('breaches' in r ? r.breaches > (before15.guards[id] ?? 0) : r.missions === (before15.missions[id] ?? 0) + 1)); }), { squad, service, before: before15 });
  check('15: invariants hold after the mission', (await inv()).length === 0, await inv());

  // 16 save and reload
  const snap = await C(() => JSON.stringify({ day: window.__site19.campaign.day, funds: window.__site19.campaign.funds, won: window.__site19.campaign.stats.won, orders: window.__site19.campaign.orders.length, people: (window.__site19.campaign.people ?? []).map(x => x.name) }));
  await p.reload(); await p.waitForTimeout(400); await close(p);
  const snap2 = await C(() => JSON.stringify({ day: window.__site19.campaign.day, funds: window.__site19.campaign.funds, won: window.__site19.campaign.stats.won, orders: window.__site19.campaign.orders.length, people: (window.__site19.campaign.people ?? []).map(x => x.name) }));
  check('16: a reload brings back the same campaign', snap === snap2, { snap, snap2 });

  // 17 continue
  const d16 = await C(() => window.__site19.campaign.day);
  await runUntil(new Function(`return window.__site19.campaign.day >= ${d16 + 3};`), 20000);
  const d17 = await C(() => window.__site19.campaign.day);
  check('17: the campaign carries on after the reload', d17 >= d16 + 1, { d16, d17 });
  check('17: invariants still hold', (await inv()).length === 0, await inv());
  await p.screenshot({ path: `${OUT}/campaign-end.png` });
  check('the whole sequence ran without page errors', !errs.length, errs);
  await b.close();
  done();
})();
