// Raids on the surface compound: who is on station depends on the alert level. Full alert: the whole squad comes up
// the lift. Heightened: half up the lift, half drive in through the motor pool gate on the breach timing. Normal: all
// off duty, all by the gate on the breach timing (playtest change after 4G).
const { chromium } = require('playwright');
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1500 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const out = {};
  for (const alert of ['full', 'heightened', 'normal']) {
    await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.evaluate(a => { const c = window.__site19.campaign; c.day = 400; c.tutorial = false; c.alert = a; }, alert);
    await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click('[data-dbg="raid"]'); await p.click('[data-dbg="close"]'); await close(p);
    await p.click('[data-tab="command"]');
    const id = await p.evaluate(() => window.__site19.campaign.incidents.find(i => i.kind === 'raid').id);
    await p.click(`[data-plan="${id}"]`);
    const panel = await p.evaluate(() => [...document.querySelectorAll('.card.plan p')].map(e => e.textContent).find(t => /Site Security/.test(t)));
    await p.click('#launchBtn'); await p.waitForTimeout(400);
    out[alert] = await p.evaluate(() => { const S = window.__site19.mission; return { reinforce: S.reinforce.map(r => ({ turn: r.turn, n: r.members.length, road: !!r.road, guard: !!r.members[0]?.guard })), brief: S.log.find(l => /coming through the wire/.test(l.text))?.text.match(/Site Security holds[^.]*\./)?.[0] }; });
    out[alert].panel = panel?.match(/On [a-z]+ alert[^]*$/)?.[0];
  }
  // play the normal-alert raid forward to the gate arrival: they appear by the motor pool gate in the south wall
  const arrived = await p.evaluate(async () => {
    const A = window.__site19, S = A.mission, road = S.reinforce.find(r => r.road);
    const keep = S.units.find(u => u.side === 'raider');
    for (const u of S.units) if (u.side === 'raider' && u !== keep) u.alive = false;
    keep.x = 1; keep.y = 1; keep.hp = keep.maxHp = 99; S.activePods = [];
    road.turn = S.turn + 1; S.setup.reinforce = 0;
    await A.endTurn();
    return S.units.filter(u => u.side === 'mtf' && !u.guard).map(u => [u.x, u.y]);
  });
  const atGate = arrived.length === 4 && arrived.every(([x, y]) => y >= 14 && x >= 7 && x <= 13);
  console.log(atGate ? 'PASS' : 'FAIL', 'off-duty squad drives in at the motor pool gate ::', JSON.stringify(arrived));
  const ok = out.full.reinforce.filter(r => !r.guard).every(r => !r.road) && out.heightened.reinforce.some(r => r.road) && out.heightened.reinforce.some(r => !r.road && !r.guard) && out.normal.reinforce.filter(r => !r.guard).every(r => r.road);
  console.log(ok ? 'PASS' : 'FAIL', 'arrivals follow the alert level ::', JSON.stringify(out, null, 1));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
