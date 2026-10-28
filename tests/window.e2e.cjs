// Sight through a window at an angle (user report, after 4G): walls in a one-tile wall line are thin, as in XCOM, so
// a unit standing diagonally beside a window sees into the room beyond in a cone, and still can't see through the
// solid wall beside it. Built on wing C's corridor in a live mission.
const { chromium } = require('playwright');
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
  await dbg(p, 'strike'); await p.click('[data-tab="command"]');
  const id = await p.evaluate(() => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.kind === 'strike'); i.map = 'wingC'; return i.id; });
  await p.click(`[data-plan="${id}"]`); for (const op of ['op1', 'op2']) await p.click(`[data-pick="${op}"]`).catch(() => {});
  await p.click('#launchBtn'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
  const r = await p.evaluate(() => {
    const A = window.__site19, G = A.grid;
    // carve a clear 12-by-5 block of floor out of the corridor, rows 6 to 10
    const a = 6;
    for (let y = 6; y <= 10; y++) for (let x = a; x < a + 12; x++) { G.grid[y][x] = 1; G.door.delete(y * G.W + x); G.glass?.delete?.(y * G.W + x); }
    // a wall line along row 8 with one window in it
    const row = 8, win = a + 6;
    for (let dx = 0; dx < 12; dx++) G.grid[row][a + dx] = 0;
    G.grid[row][win] = 8; G.version++;
    const vx = win + 1, vy = row - 1;                 // standing diagonally beside the window, as in the screenshot
    const cone = [[win - 3, row + 2], [win - 2, row + 2], [win - 1, row + 1], [win - 4, row + 2], [win, row + 2], [win - 2, row + 1]];
    const seen = cone.map(([x, y]) => [x, y, A.sight(vx, vy, x, y)]);
    // behind solid wall: the far side well away from the window
    const behind = [[win + 3, row + 2], [win + 4, row + 1], [win + 5, row + 2]].map(([x, y]) => [x, y, A.sight(vx, vy, x, y)]);
    // and a shot through it goes too (ordinary glass)
    const shot = A.fireLine(vx, vy, win - 3, row + 2);
    return { a, win, viewer: [vx, vy], seen, behind, shot };
  });
  const ok = !r.error && r.seen.filter(s => s[2]).length >= 5 && r.behind.every(s => !s[2]) && !!r.shot;
  console.log(ok ? 'PASS' : 'FAIL', 'diagonal sight through a window, none through the wall beside it ::', JSON.stringify(r));
  // after a move, an operative turns to the nearest enemy in sight (not the way they walked)
  const f = await p.evaluate(async () => {
    const A = window.__site19, S = A.mission, m = S.units.find(u => u.side === 'mtf');
    for (const u of S.units) if (u.side === 'raider') u.alive = false;
    const en = S.units.find(u => u.side === 'raider'); en.alive = true; en.downed = false; en.x = 9; en.y = 10;
    m.x = 13; m.y = 6; m.facing = 0; A.computeVis();
    await A.moveUnit(m, [[13, 7]]);
    return { walkedSouth: 2, facing: m.facing, seesEnemy: A.canSee(m, 9, 10) };
  });
  // 0 east, 2 south, 3 south-west (the enemy is 4 west and 3 south)
  console.log(f.seesEnemy && f.facing === 3 ? 'PASS' : 'FAIL', 'faces the enemy after moving ::', JSON.stringify(f));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
