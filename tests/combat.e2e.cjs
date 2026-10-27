// Combat regression: shooting, frag grenades, wounded Insurgents, run through the guards-first breach flow.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1300, height: 1400 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../dist/index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { const c = window.__site19.campaign; c.inventory = { frag: 2 };
    c.scps[0].status = 'breach'; c.incidents.push({ id: 'incX', kind: 'breach', scpId: '173', title: 'Incident 900: SCP-173 breach, test', appeared: c.day, expires: c.day, insurgents: 3, region: 'east_us', map: 'wingC' }); });
  await p.click('[data-tab=site]'); await p.click('[data-tab=command]'); await p.click('[data-plan="incX"]');
  await p.selectOption('#gear-op1-0', 'frag');
  await p.click('#launchBtn'); await p.waitForTimeout(400);
  // bring Epsilon-11 in now through the debug menu, then stage everyone where the old test expects them
  await p.keyboard.press('`'); await p.click('[data-dbg="arrive"]'); await p.click('[data-dbg="freeze"]'); await p.click('[data-dbg="close"]');
  const ids = await p.evaluate(() => {
    const S = window.__site19.mission, id = {};
    const spots = { op1: [2, 12], op2: [4, 12], op3: [6, 14], op4: [7, 12] };
    let gx = 19;
    for (const u of S.units.filter(u => u.side === 'mtf')) {
      if (u.guard) { u.x = gx++; u.y = 8; continue; }
      [u.x, u.y] = spots[u.opId]; id[u.opId] = u.id;
    }
    S.units.filter(u => u.side === 'dclass').forEach((u, i) => { u.x = 10 + i; u.y = 9; });
    const rs = S.units.filter(u => u.side === 'raider'); rs[0].x = 6; rs[0].y = 12; rs[0].hp = 1; rs[1].x = 1; rs[1].y = 14; rs[2].x = 2; rs[2].y = 14;
    return id;
  });
  console.log('operatives on the map:', JSON.stringify(ids));
  const box = await (await p.$('#cv')).boundingBox(); const at = (x, y) => p.mouse.click(box.x + (x + .5) * box.width / 28, box.y + (y + .5) * box.height / 18);
  const sel = id => p.click(`.op[data-id=${id}]`);
  await sel(ids.op4); await at(8, 12); await p.waitForTimeout(400);
  await sel(ids.op2); await at(6, 12); await p.waitForTimeout(700);
  const shot = await p.evaluate(id => { const S = window.__site19.mission; const m = S.units.find(u => u.id === id); return { ammo: m.gun.ammo, ap: m.ap, log: S.log.slice(0, 2).map(l => l.text) }; }, ids.op2);
  console.log('shot:', JSON.stringify(shot));
  await sel(ids.op1); await p.keyboard.press('1'); await at(1, 13); await p.waitForTimeout(400);
  const frag = await p.evaluate(() => { const S = window.__site19.mission; return { log: S.log.slice(0, 4).map(l => l.text), raiders: S.units.filter(u => u.side === 'raider').map(u => `${u.hp}${u.downed ? 'D' : ''}${u.alive ? '' : 'X'}`) }; });
  console.log('frag:', JSON.stringify(frag));
  const ok = shot.ammo < 5 && frag.log.some(l => /frag/.test(l)) && !errs.length;
  
  console.log(ok ? 'PASS' : 'FAIL', 'errors', errs); await b.close(); process.exit(ok ? 0 : 1);
})();
