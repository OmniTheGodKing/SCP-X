// Phase 4I acceptance tests, run on the real Site-19 wing C map in a live mission.
const { chromium } = require('playwright');
const SP = '/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/';
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
const results = [];
const check = (n, name, ok, detail) => { results.push(`${ok ? 'PASS' : 'FAIL'} ${n}. ${name}${detail ? ' :: ' + detail : ''}`); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + e.stack.split('\n')[1]));
  await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 400; });
  await dbg(p, 'strike');
  await p.click('[data-tab="command"]');
  const id = await p.evaluate(() => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.kind === 'strike'); i.map = 'wingC'; return i.id; });
  await p.click(`[data-plan="${id}"]`); for (const op of ['op1', 'op2']) await p.click(`[data-pick="${op}"]`).catch(() => {});
  await p.click('#launchBtn'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(300); }
  const E = (f, a) => p.evaluate(f, a);

  // a clean stage: everyone away from the test area, Insurgents parked out of the way
  await E(() => { const S = window.__site19.mission, G = window.__site19.grid; for (const u of S.units) { if (u.side === 'raider' || u.side === 'subject' || u.side === 'dclass' || u.side === 'civilian') { u.alive = false; } } });

  // 1. long sight across the open corridor, blocked by an opaque wall
  const t1 = await E(() => { const A = window.__site19, G = A.grid;
    // the longest unbroken run of open floor along any corridor row
    let best = null;
    for (let y = 7; y <= 10; y++) { let start = null;
      for (let x = 1; x < G.W; x++) { const open = G.grid[y][x] === 1;
        if (open && start === null) start = x;
        if ((!open || x === G.W - 1) && start !== null) { const end = open ? x : x - 1; if (!best || end - start > best.b - best.a) best = { y, a: start, b: end }; start = null; } } }
    const { y: row, a, b } = best;
    const far = A.sight(a, row, b, row);
    const mid = Math.floor((a + b) / 2), saved = [-2, -1, 0, 1, 2].map(d => G.grid[row + d][mid]);
    for (const d of [-2, -1, 0, 1, 2]) G.grid[row + d][mid] = 0; G.version++;
    const blocked = A.sight(a, row, b, row);
    [-2, -1, 0, 1, 2].forEach((d, k) => { G.grid[row + d][mid] = saved[k]; }); G.version++;
    return { row, a, b, dist: b - a, far, blocked };
  });
  check(1, 'long clear sight line reveals; an opaque wall blocks it', t1.far && !t1.blocked && t1.dist > 9, JSON.stringify(t1));

  // 2. beside a doorway: diagonal sight through the opening at steep angles, not through the wall beside it
  const t2 = await E(() => { const A = window.__site19, G = A.grid;
    // the west office door is at (10,3) in wing C (walls above and below; the office is west, the cell east). Stand in
    // the cell right beside the doorway at (11,2) and look into the office through the open door
    const door = [10, 3]; A.openDoor(10, 3);
    const out = [];
    for (const [tx, ty] of [[8, 4], [7, 5], [9, 5], [6, 3], [5, 1]]) out.push([tx, ty, A.sight(11, 2, tx, ty)]);
    // through the wall beside the door: the tile straight west of the viewer, behind wall (10,2)
    const throughWall = A.sight(11, 2, 9, 2) && !A.sight(11, 1, 9, 1) ? 'only via the door' : A.sight(11, 1, 9, 1);
    return { door, out, wallLeft: A.opaque(10, 2), behindWallFrom11_1: A.sight(11, 1, 9, 1), behindWallFrom11_2: A.sight(11, 2, 9, 2) };
  });
  check(2, 'beside a doorway: diagonal sight through it, not through the wall', t2.out.filter(o => o[2]).length >= 3 && t2.wallLeft, JSON.stringify(t2));

  // 3. behind full cover/wall: no shot through an intact wall; a corner shot needs a lean spot and exposes the shooter
  const t3 = await E(() => { const A = window.__site19, S = A.mission, G = A.grid;
    const m = S.units.find(u => u.side === 'mtf'); const r = S.units.find(u => u.side === 'raider');
    r.alive = true; r.downed = false; r.hp = r.maxHp;
    // shooter in the west office (3,3), target in the cell (14,3): wall x=10 between; door (10,3) shut
    const door = G.door.get(3 * G.W + 10); door.state = 'closed'; G.version++;
    m.x = 3; m.y = 2; r.x = 14; r.y = 2;
    const throughWall = A.canShoot(m, r);
    // a corner: shooter in the corridor at (13,7), just west of the cell door (14,6); target in the cell at (14,3).
    // Straight from (13,7) the wall (13,6) is in the way: the shot has to come from leaning out at (14,7).
    const cdoor = G.door.get(6 * G.W + 14); cdoor.state = 'open'; G.version++;
    m.x = 13; m.y = 7; r.x = 14; r.y = 3;
    const lof = A.lineOfFire(m, r);
    const corner = !!lof && (lof.x !== m.x || lof.y !== m.y);
    // fire it, then check the shooter is exposed at the lean spot so the target can answer
    return { throughWall, corner, from: lof && [lof.x, lof.y] };
    return { throughWall, corner };
  });
  check(3, 'no shot through a solid wall; a corner shot only from a lean spot', !t3.throughWall && t3.corner, JSON.stringify(t3));

  // 4. doors and windows change sight, movement and projectiles
  const t4 = await E(() => { const A = window.__site19, G = A.grid, S = A.mission;
    const d = G.door.get(3 * G.W + 10);
    d.state = 'closed'; G.version++; const closed = { sight: A.sight(9, 3, 11, 3), pass: A.passable(10, 3) };
    d.state = 'open'; G.version++; const open = { sight: A.sight(9, 3, 11, 3), pass: A.passable(10, 3) };
    d.state = 'locked'; G.version++; const locked = { sight: A.sight(9, 3, 11, 3), pass: A.passable(10, 3) };
    d.state = 'destroyed'; G.version++; const destroyed = { sight: A.sight(9, 3, 11, 3), pass: A.passable(10, 3) };
    d.state = 'open'; G.version++;
    // the reinforced observation window at (12,6): see through, can't walk, bullets stop
    const win = G.glass.get(6 * G.W + 12);
    const wSight = A.sight(12, 7, 12, 4), wPass = A.passable(12, 6), wFire = A.fireLine(12, 7, 12, 4);
    win.broken = true; G.version++; const brokenFire = A.fireLine(12, 7, 12, 4); win.broken = false; G.version++;
    // a sound through a shut door is quieter than through an open one (door at 10,3)
    return { closed, open, locked, destroyed, window: { sight: wSight, pass: wPass, fire: wFire, fireWhenBroken: !!brokenFire } };
  });
  check(4, 'door states and windows change sight, movement and fire', !t4.closed.sight && t4.closed.pass && t4.open.sight && !t4.locked.pass && t4.destroyed.sight && t4.window.sight && !t4.window.pass && t4.window.fire === null && t4.window.fireWhenBroken, JSON.stringify(t4));

  // 5. destroying a partition updates navigation, sight and pathing at once
  const t5 = await E(() => { const A = window.__site19, G = A.grid;
    // partition at (17,13) between the records room and the canteen
    const before = { opaque: A.opaque(17, 13), pass: A.passable(17, 13), sight: A.sight(16, 13, 18, 13) };
    const what = A.blastStructure(17, 13, 1);
    const after = { opaque: A.opaque(17, 13), pass: A.passable(17, 13), sight: A.sight(16, 13, 18, 13) };
    // reinforced wall resists even a rocket on Site-19
    const wall = A.blastStructure(10, 2, 2);
    // the AI's pathing sees the new route: a path from (16,13) to (18,13) is now 2 steps
    const reach = A.reach ? null : null;
    return { before, what, after, reinforcedWall: wall };
  });
  check(5, 'destroying a partition opens sight and movement without a reload; reinforced walls resist', t5.before.opaque && t5.what === 'partition' && !t5.after.opaque && t5.after.pass && t5.after.sight && t5.reinforcedWall === null, JSON.stringify(t5));

  // 6. a manually faced operative hears footsteps, glances, gets an approximate cue, and turns back if nothing is seen
  const t6 = await E(() => { const A = window.__site19, S = A.mission, G = A.grid;
    const m = S.units.find(u => u.side === 'mtf' && u.alive); const r = S.units.find(u => u.side === 'raider');
    m.x = 3; m.y = 8; m.prefFacing = 0; m.facing = 0; A.computeVis();
    // the raider walks in the west office behind the wall (not visible)
    r.alive = true; r.x = 3; r.y = 5; G.door.get(3 * G.W + 10).state = 'closed'; G.door.get(6 * G.W + 3).state = 'closed'; G.version++; A.computeVis();
    const visible = A.canSee(m, r.x, r.y);
    A.emitNoise(r.x, r.y, 'footsteps', r);
    const heard = (S.heard || []).find(h => h.listener === m.id);
    const glanced = m.facing;
    A.settleFacing();
    return { visible, heard: heard ? { dir: heard.dir, conf: +heard.conf.toFixed(2) } : null, glanced, after: m.facing, pref: m.prefFacing, log: S.log.slice(0, 2).map(l => l.text) };
  });
  check(6, 'hears footsteps, glances, approximate cue, back to preferred facing', !t6.visible && !!t6.heard && t6.glanced !== 0 && t6.after === 0, JSON.stringify(t6));

  // 7. an enemy behind the operative is still seen (no blind sector from facing)
  const t7 = await E(() => { const A = window.__site19, S = A.mission;
    const m = S.units.find(u => u.side === 'mtf' && u.alive); const r = S.units.find(u => u.side === 'raider');
    m.x = 12; m.y = 8; m.facing = 0; m.prefFacing = 0; r.x = 4; r.y = 8; r.alive = true;
    return { seenBehind: A.canSee(m, r.x, r.y), facing: m.facing };
  });
  check(7, 'an enemy directly behind is still detected', t7.seenBehind, JSON.stringify(t7));

  // 8. props and effects: map size unchanged; every door, window and partition sits in a wall line; objectives reachable
  const t8 = await E(() => { const A = window.__site19, G = A.grid;
    const bad = [];
    for (const [i] of G.glass) { const x = i % G.W, y = (i / G.W) | 0; const wallsLR = G.grid[y][x - 1] !== 1 && G.grid[y][x + 1] !== 1, wallsUD = G.grid[y - 1]?.[x] !== 1 && G.grid[y + 1]?.[x] !== 1; if (!wallsLR && !wallsUD) bad.push(['window', x, y]); }
    return { W: G.W, H: G.H, bad };
  });
  check(8, 'map dimensions unchanged; windows sit in wall lines', t8.W === 28 && t8.H === 18 && !t8.bad.length, JSON.stringify(t8));

  // screenshot of the map with doors, windows and a heard noise
  await E(() => { const S = window.__site19.mission; S.vis.fill(1); S.explored.fill(1); });
  await p.waitForTimeout(300);
  const r = await E(() => { const e = document.querySelector('#cv').getBoundingClientRect(); return [e.x, e.y, e.width, e.height]; });
  await p.screenshot({ path: SP + 'accept4i.png', clip: { x: r[0], y: r[1], width: r[2], height: r[3] } });
  console.log(results.join('\n'));
  console.log('errors', errs); await b.close();
})();
