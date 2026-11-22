// Tactical battlefield & HUD overhaul: the map is the whole screen, the HUD sits on its edges, the camera turns
// pointers into the right tiles at any zoom, figures follow facing and loadout, and the action bar shows costs.
// Runs a real mission at 1280×720, 1440×900 and 1920×1080, and the specialty trial for techniques and kit.
const { chromium } = require('playwright');
const path = require('path');
const L = require('./lib.cjs');

async function mission(b, w, h, map = 'wingC', kind = 'breach') {
  const s = await L.fresh(b, { width: w, height: h });
  await s.p.waitForTimeout(300);
  await s.E(([map, kind]) => { const c = window.__site19.campaign; c.inventory = { frag: 2, smoke: 1 }; c.scps[0].status = 'breach';
    c.incidents.push({ id: 'incT', kind, scpId: '173', title: 'Incident 902: test', appeared: c.day, expires: c.day, insurgents: 3, region: 'east_us', map }); }, [map, kind]);
  await s.p.click('[data-tab=site]'); await s.p.click('[data-tab=command]'); await L.planIncident(s.p, 'incT');
  await s.p.click('#launchBtn'); await s.p.waitForTimeout(500); await L.dbg(s.p, 'arrive');
  await s.p.click('#coachSkip').catch(() => {});
  return s;
}
const boxes = p => p.evaluate(() => {
  const r = sel => { const e = document.querySelector(sel); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; };
  return { vw: innerWidth, vh: innerHeight, cv: r('#cv'), top: r('.hud-top'), obj: r('.hud-obj'), roster: r('.hud-roster'), right: r('.hud-right'), bar: r('#actionBar'), sel: r('#selPanel'), end: r('#endBtn'), acts: r('#actionBar .actions') };
});
const overlap = (a, b) => a && b && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
const inside = (a, vw, vh) => a && a.x >= -1 && a.y >= -1 && a.x + a.w <= vw + 1 && a.y + a.h <= vh + 1;

(async () => {
  const b = await chromium.launch();
  const R = L.reporter(), check = (n, ok, d) => R.check(n, !!ok, ok ? undefined : d);

  for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080]]) {
    const { p, errs, E } = await mission(b, w, h);
    const bx = await boxes(p);
    check(`${w}×${h} 1-2. the battlefield canvas is the whole viewport, with no frame around it`, bx.cv && Math.abs(bx.cv.x) < 1 && Math.abs(bx.cv.y) < 1 && Math.abs(bx.cv.w - w) < 2 && Math.abs(bx.cv.h - h) < 2, bx.cv);
    const panels = ['top', 'obj', 'roster', 'right', 'bar'].map(k => bx[k]);
    check(`${w}×${h} 3/23. HUD overlays sit inside the screen`, panels.every(x => !x || inside(x, w, h)) && bx.end && inside(bx.end, w, h), bx);
    check(`${w}×${h} 24. HUD regions don't overlap each other`, !overlap(bx.obj, bx.roster) && !overlap(bx.obj, bx.right) && !overlap(bx.roster, bx.bar) && !overlap(bx.right, bx.bar) && !overlap(bx.top, bx.obj), bx);
    // the screen beyond the map is ground, not a black void: sample the canvas well outside the map
    const px = await E(() => { const cv = document.querySelector('#cv'), cam = window.__site19.camera.cam; const g = cv.getContext('2d');
      const k = cv.width / cv.clientWidth, sx = Math.max(2, Math.floor((window.__site19.camera.worldToScreen(cam.bx0, cam.by0)[0] - 30) * k)), sy = Math.floor(cv.height / 2);
      const d = sx > 4 ? g.getImageData(sx, sy, 1, 1).data : [20, 20, 20]; return [d[0], d[1], d[2], sx]; });
    check(`${w}×${h} 4. no black void beyond the map's edge`, px[3] <= 4 || px[0] + px[1] + px[2] > 12, px);
    if (w === 1440) {
      // 5-7. camera: zoom, pan, focus on the selected operative
      const c0 = await E(() => ({ ...window.__site19.camera.cam }));
      await p.mouse.move(w / 2, h / 2); await p.mouse.wheel(0, -400); await p.waitForTimeout(400);
      const c1 = await E(() => ({ ...window.__site19.camera.cam }));
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
      const c2 = await E(() => ({ ...window.__site19.camera.cam }));
      check('5. the mouse wheel zooms and the arrow keys pan', c1.z > c0.z * 1.15 && Math.abs(c2.x - c1.x) > 20, { z0: c0.z, z1: c1.z, x1: c1.x, x2: c2.x });
      const far = await E(() => { const S = window.__site19.mission, cam = window.__site19.camera; cam.zoomBy(2); cam.pan(4000, 4000, true);
        const u = S.units.find(u => u.side === 'mtf' && !u.guard && u.alive && !u.downed); return u.id; });
      await p.click(`.op[data-id="${far}"]`); await p.waitForTimeout(700);
      const foc = await E(id => { const S = window.__site19.mission, u = S.units.find(x => x.id === id), [sx, sy] = window.__site19.camera.worldToScreen(u.x * 32 + 16, u.y * 32 + 16); return { sx, sy, vw: innerWidth, vh: innerHeight }; }, far);
      check('6. selecting an operative brings the camera to them', foc.sx > 100 && foc.sx < foc.vw - 100 && foc.sy > 60 && foc.sy < foc.vh - 120, foc);
      // 7. real mouse hover at two zoom levels lands on the right tile
      const hits = [];
      for (const z of [0.8, 1.9]) {
        const t = await E(z => { const S = window.__site19.mission, cam = window.__site19.camera, u = S.selected; cam.cam.tz = cam.cam.zFit * z; cam.focus(u.x * 32 + 16, u.y * 32 + 16, true); return { x: u.x + 1, y: u.y }; }, z);
        await p.waitForTimeout(600);
        const xy = await L.tileXY(p, t.x, t.y); await p.mouse.move(xy[0], xy[1]); await p.waitForTimeout(150);
        hits.push(await E(t => { const h = window.__site19.mission.hover; return { want: t, got: h && { x: h.x, y: h.y } }; }, t));
      }
      check('7. mouse targeting stays exact at different zoom levels', hits.every(x => x.got && x.got.x === x.want.x && x.got.y === x.want.y), hits);
      // 8. selection and a move through the camera
      const mv = await E(() => { const S = window.__site19.mission, u = S.selected; u.ap = 2; const R = window.__site19.reach(u); let best = null;
        for (let i = 0; i < R.dist.length; i++) if (R.dist[i] === 2) { best = [i % window.__site19.grid.W, Math.floor(i / window.__site19.grid.W)]; break; } return { id: u.id, from: [u.x, u.y], to: best }; });
      if (mv.to) await L.clickTile(p, mv.to[0], mv.to[1]);
      await p.waitForTimeout(900);
      const moved = await E(id => { const u = window.__site19.mission.units.find(x => x.id === id); return [u.x, u.y]; }, mv.id);
      check('8. selecting and moving an operative works through the camera', mv.to && moved[0] === mv.to[0] && moved[1] === mv.to[1], { mv, moved });
      // 9. the figure faces the way the rules say it faces
      const face = await E(id => { const S = window.__site19.mission, u = S.units.find(x => x.id === id); u.facing = 4; return id; }, mv.id);
      await p.waitForTimeout(700);
      const ang = await E(id => { const a = window.__site19.sprites.animOf(id), u = window.__site19.mission.units.find(x => x.id === id); return { ang: a.ang, facing: u.facing }; }, face);
      check('9. the drawn facing matches the tactical facing', Math.abs(Math.cos(ang.ang) - Math.cos(ang.facing * Math.PI / 4)) < 0.05 && Math.abs(Math.sin(ang.ang) - Math.sin(ang.facing * Math.PI / 4)) < 0.05, ang);
      await p.screenshot({ path: path.join(L.OUT, 'tactical-1440.png') });
    } else await p.screenshot({ path: path.join(L.OUT, `tactical-${w}.png`) });
    check(`${w}×${h} no page errors`, !errs.length, errs);
    await p.close();
  }

  // a big outdoor map: the camera opens at a readable zoom and the edge is ground
  {
    const { p, errs, E } = await mission(b, 1440, 900, 'town', 'strike');
    const cam = await E(() => { const c = window.__site19.camera.cam; return { z: c.z, zFit: c.zFit, W: window.__site19.grid.W, H: window.__site19.grid.H }; });
    check('multiple map sizes: a large map opens at a readable zoom, never below fitting the whole map', cam.z >= cam.zFit - 0.001 && cam.z * 32 >= 30, cam);
    await p.screenshot({ path: path.join(L.OUT, 'tactical-town.png') });
    check('town map without page errors', !errs.length, errs);
    await p.close();
  }

  // the specialty trial: loadout-driven figures, technique buttons with costs and cooldowns, placed kit on its tile
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const E = (f, a) => p.evaluate(f, a);
    await p.goto(L.GAME_URL.replace('?legacy', '#lab')); await p.waitForTimeout(400);
    await p.selectOption('#labTrialSp', 'breach'); await p.click('#labTrialGo'); await p.waitForTimeout(300);
    const look = await E(() => { const A = window.__site19, S = A.mission, t = S.units.filter(u => u.side === 'mtf');
      t[0].items = [{ id: 'flamer', uses: 1 }]; t[1].armorKind = 'armor_heavy'; t[2].armorKind = 'contsuit'; t[3].items = [{ id: 'stretcher', uses: 1 }];
      const L0 = A.sprites.lookFor; S.setup.year = 1951; A.sprites.setEra(1951); const a = L0(t[0]), b = L0(t[1]), c = L0(t[2]), d = L0(t[3]);
      A.sprites.setEra(2020); const e = L0(t[1].armorKind ? t[3] : t[3]); A.sprites.setEra(1951);
      return { flamer: a.back, heavy: b.vest, bulky: b.bulky, suit: c.head, suitHelmet: c.helmet, stretcher: d.back, helm1951: a.helmet, helm2020: e.helmet }; });
    check('10. figures follow the loadout and the era (flamer tanks, heavy plate, sealed suit, stretcher; M1 in 1951, modern in 2020)', look.flamer === 'tanks' && look.heavy === 'plate' && look.bulky && look.suit === 'mask' && !look.suitHelmet && look.stretcher === 'stretcher' && look.helm1951 === 'm1' && look.helm2020 === 'modern', look);
    // technique buttons: cost pips and the reason they're disabled
    await p.click('[data-tool="play"]');
    await E(() => { const A = window.__site19, S = A.mission, u = S.units.find(u => u.side === 'mtf'); u.items = [{ id: 'breach_charge', uses: 2, shared: true }]; u.x = 7; u.y = 7; u.ap = 2; S.selected = u; A.computeVis(); });
    await p.click('.op').catch(() => {}); await p.waitForTimeout(150);
    const firstId = await E(() => window.__site19.mission.units.find(u => u.side === 'mtf').id);
    await p.click(`.op[data-id="${firstId}"]`); await p.waitForTimeout(200);
    const bar = await E(() => [...document.querySelectorAll('#abSpec button')].map(b => ({ t: b.textContent.trim(), pips: b.querySelectorAll('.cost i').length, dis: b.disabled, title: b.title })));
    const ce = bar.find(x => /Coordinated entry/.test(x.t)), set = bar.find(x => /Set breaching charge/.test(x.t));
    const want = await E(id => { const A = window.__site19, u = A.mission.units.find(x => x.id === id); return { ce: A.squadtech.techCost(u, 'sq_coordinated_entry'), cb: A.squadtech.techCost(u, 'sq_controlled_breach') }; }, firstId);
    check('11-12. specialist actions sit in their own group with the right action cost, and say why they are unavailable', ce && set && ce.pips === want.ce && set.pips === want.cb && (!ce.dis || ce.title.length > 5), { bar, want });
    // 13-14. use a technique from the bar: the charge goes on the door tile next to them and blows it
    const door = await E(id => { const A = window.__site19, S = A.mission, G = A.gridMod, Lv = A.grid, u = S.units.find(x => x.id === id), i = (u.y) * Lv.W + u.x + 1;
      Lv.grid[u.y][u.x + 1] = G.FLOOR; Lv.doors.add(i); Lv.door.set(i, { kind: 'standard', state: 'closed' }); G.bump(); A.computeVis(); return [u.x + 1, u.y]; }, firstId);
    await p.click('#abSpec [data-item]'); await p.waitForTimeout(150);
    await L.clickTile(p, door[0], door[1]); await p.waitForTimeout(300);
    const after = await E(([x, y]) => { const A = window.__site19, Lv = A.grid; return { state: Lv.door.get(y * Lv.W + x)?.state, used: A.mission.techUsed }; }, door);
    check('13-14. a technique used from the action bar acts on the tile chosen on the map', after.state === 'destroyed' && after.used.includes('sq_controlled_breach'), after);
    // cooldown badge after coordinated entry
    const cd = await E(id => { const A = window.__site19, S = A.mission, u = S.units.find(x => x.id === id); S.squadCd = { [`${u.squadId}:sq_coordinated_entry`]: S.turn + 2 }; u.ap = 2; window.__site19.mission.log.push({ t: 0, text: '', kind: '' }); return true; }, firstId);
    await p.click(`.op[data-id="${firstId}"]`); await p.waitForTimeout(200);
    const cdShown = await E(() => [...document.querySelectorAll('#abSpec button')].map(b => ({ t: b.textContent, cd: b.querySelector('.cd')?.textContent, dis: b.disabled, title: b.title })).find(x => /Coordinated/.test(x.t)));
    check('12b. a squad cooldown shows on the button and disables it with the reason', cd && cdShown && cdShown.cd === '2' && cdShown.dis && /again in 2/.test(cdShown.title), cdShown);
    // unfinished techniques stay marked
    await p.selectOption('#labTrialSp', 'quarantine'); await p.click('#labTrialGo'); await p.waitForTimeout(300);
    const qid = await E(() => window.__site19.mission.units.find(u => u.side === 'mtf').id);
    await p.click(`.op[data-id="${qid}"]`); await p.waitForTimeout(200);
    const nb = await E(() => [...document.querySelectorAll('#abSpec button')].map(b => ({ t: b.textContent, nb: !!b.querySelector('.nb'), dis: b.disabled })).find(x => /Controlled crossing/.test(x.t)));
    check('unfinished techniques are labelled "not built" and disabled', nb && nb.nb && nb.dis, nb);
    // 19. the isolation line on the map matches the cordon tiles in the rules
    await E(() => { const A = window.__site19, S = A.mission, u = S.units.find(u => u.side === 'mtf'); const c = u.items.find(i => i.id === 'cordon_kit'); u.x = 6; u.y = 7; u.ap = 2; A.computeVis(); A.squadtech.place(u, c, 6, 6); S.units.filter(v => v.side === 'mtf').forEach((v, i) => { if (v.y < 10) { v.x = 2 + i; v.y = 12; } }); A.computeVis(); });
    await p.waitForTimeout(200);
    const cord = await E(() => { const S = window.__site19.mission, cv = document.querySelector('#cv'), g = cv.getContext('2d'), k = cv.width / cv.clientWidth;
      return [...S.cordon].map(i => { const x = i % window.__site19.grid.W, y = Math.floor(i / window.__site19.grid.W), [sx, sy] = window.__site19.camera.worldToScreen(x * 32 + 16, y * 32 + 16 - 6); const d = g.getImageData(Math.round(sx * k), Math.round(sy * k), 1, 1).data; return { x, y, rgb: [d[0], d[1], d[2]] }; }); });
    check('19. the isolation line is drawn on exactly the cordoned tiles (tape-yellow at each stake)', cord.length === 3 && cord.every(c => c.rgb[0] > 150 && c.rgb[1] > 120 && c.rgb[2] < 120), cord);
    await p.screenshot({ path: path.join(L.OUT, 'tactical-trial.png') });
    check('trial without page errors', !errs.length, errs);
    await p.close();
  }
  // deployment card, art pipeline, placed-kit art, animations, era dressing, debrief transition
  {
    const { p, errs, E } = await mission(b, 1440, 900);
    // the deployment card was shown and has gone; the HUD is back
    const intro = await E(() => ({ card: !!document.querySelector('.intro'), deploying: document.querySelector('main.tac').classList.contains('deploying') }));
    await p.waitForTimeout(2400);
    const intro2 = await E(() => ({ card: !!document.querySelector('.intro'), deploying: document.querySelector('main.tac').classList.contains('deploying'), hud: getComputedStyle(document.querySelector('#actionBar')).opacity }));
    check('transition: a deployment card opens the mission and clears, the HUD fading up after it', !intro2.card && !intro2.deploying && intro2.hud === '1', { intro, intro2 });
    // the art pipeline: a figure image registered under its key replaces the drawn stand-in
    const art = await E(async () => {
      const A = window.__site19, S = A.mission, u = S.units.find(u => u.side === 'mtf' && !u.guard && u.alive && !u.downed);
      S.selected = null; A.camera.cam.tz = 2; A.camera.focus(u.x * 32 + 16, u.y * 32 + 16, true);
      const c = document.createElement('canvas'); c.width = 32; c.height = 48; const g = c.getContext('2d'); g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 32, 48);
      const look = A.sprites.lookFor(u);
      A.registerArt(`tactical/figure/${look.sprite}`, c.toDataURL());
      await new Promise(r => setTimeout(r, 900));
      const cv = document.querySelector('#cv'), k = cv.width / cv.clientWidth, [sx, sy] = A.camera.worldToScreen(u.x * 32 + 16, u.y * 32 + 16 - 14);
      const d = cv.getContext('2d').getImageData(Math.round(sx * k), Math.round(sy * k), 1, 1).data;
      return { key: look.sprite, rgb: [d[0], d[1], d[2]] };
    });
    check('asset pipeline: a figure image dropped in under its loadout key is drawn instead of the stand-in', art.rgb[0] > 200 && art.rgb[1] < 60 && art.rgb[2] > 200, art);
    // placed kit is drawn as what it is, on its tile; a prop image replaces it the same way
    const kit = await E(async () => {
      const A = window.__site19, S = A.mission, G = A.gridMod, Lv = A.grid, u = S.units.find(u => u.side === 'mtf' && !u.guard && u.alive && !u.downed);
      Object.assign(u, { specialty: 'engineering', stage: 1, qualified: true, squadId: 'T', ap: 2 });
      const opts = [...A.squadtech.placeOptions(u, 'sandbags')]; const i = opts.find(k => Lv.grid[Math.floor(k / Lv.W)][k % Lv.W] === G.FLOOR);
      const x = i % Lv.W, y = Math.floor(i / Lv.W); A.squadtech.place(u, { id: 'sandbags', uses: 1 }, x, y);
      const placed = S.placedKit?.get(i), cue = S.effects.some(e => e.type === 'cue' && e.cue === 'place');
      await new Promise(r => setTimeout(r, 120));
      const kneel = performance.now() - A.sprites.animOf(u.id).place < 1000;
      const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#00ffff'; g.fillRect(0, 0, 32, 32);
      A.registerArt('tactical/prop/sandbags', c.toDataURL());
      u.x = 1; u.y = 1; A.computeVis(); S.vis.fill(1);
      await new Promise(r => setTimeout(r, 900));
      const cv = document.querySelector('#cv'), k = cv.width / cv.clientWidth, [sx, sy] = A.camera.worldToScreen(x * 32 + 26, y * 32 + 28);
      const d = cv.getContext('2d').getImageData(Math.round(sx * k), Math.round(sy * k), 1, 1).data;
      return { placed, cue, kneel, tile: Lv.grid[y][x] === G.FULL, rgb: [d[0], d[1], d[2]] };
    });
    check('placed kit: sandbags are recorded on their tile, drawn there, and the operative kneels to set them', kit.placed === 'sandbags' && kit.tile && kit.cue && kit.kneel && kit.rgb[0] < 60 && kit.rgb[1] > 180 && kit.rgb[2] > 180, kit);
    // going down is animated, not cut to
    const fall = await E(async () => { const A = window.__site19, S = A.mission, u = S.units.find(u => u.side === 'mtf' && !u.guard && u.alive && !u.downed && u.x !== 1); u.downed = true; u.bleed = 3;
      const now = performance.now(), a = A.sprites.fallOf(u, now); await new Promise(r => setTimeout(r, 500)); const b2 = A.sprites.fallOf(u, performance.now()); u.downed = false; return [a, b2]; });
    check('animation: falling down plays out over a moment', fall[0] < 0.2 && fall[1] === 1, fall);
    // era: the same corridor is built differently in 1951 and 2015, and the rules' map is untouched by the dressing
    const era = await E(async () => {
      const A = window.__site19, S = A.mission, Lv = A.grid, grid0 = JSON.stringify(Lv.grid);
      const sample = () => { const cv = document.querySelector('#cv'), k = cv.width / cv.clientWidth; let wx = 0, wy = 0; for (let y = 1; y < Lv.H - 1 && !wx; y++) for (let x = 1; x < Lv.W - 1; x++) if (Lv.grid[y][x] === 0 && Lv.grid[y + 1][x] === 1 && Lv.grid[y - 1][x] === 0) { wx = x; wy = y; break; }
        A.camera.focus(wx * 32 + 16, wy * 32 + 16, true); return [wx, wy]; };
      const [wx, wy] = sample(); S.vis.fill(1); S.explored.fill(1);
      const px = async y => { S.setup.year = y; await new Promise(r => setTimeout(r, 700)); const cv = document.querySelector('#cv'), k = cv.width / cv.clientWidth, [sx, sy] = A.camera.worldToScreen(wx * 32 + 16, wy * 32 + 8); const d = cv.getContext('2d').getImageData(Math.round(sx * k), Math.round(sy * k), 1, 1).data; return d[0] + d[1] + d[2]; };
      const a = await px(1951), b2 = await px(2015); S.setup.year = 1951;
      return { a, b: b2, same: JSON.stringify(Lv.grid) === grid0 };
    });
    check('era: Foundation walls are built from a different palette in 2015 than in 1951, and dressing never changes the grid', era.b > era.a + 30 && era.same, era);
    // debrief: the field dims behind the report
    await L.dbg(p, 'win'); await p.waitForTimeout(500);
    const end = await E(() => ({ ended: document.querySelector('main.tac')?.classList.contains('ended'), overlay: !document.querySelector('#overlay')?.hidden }));
    check('transition: winning dims the battlefield behind the debrief', end.ended && end.overlay, end);
    check('environment and transition run without page errors', !errs.length, errs);
    await p.close();
  }
  // an outbreak and an Insurgency-held building are dressed for what they are
  {
    const { p, errs, E } = await mission(b, 1440, 900, 'town', 'outbreak');
    await p.waitForTimeout(400);
    const ob = await E(() => { const S = window.__site19.mission; return { kind: S.setup.kind, flesh: S.flesh.size }; });
    await p.screenshot({ path: path.join(L.OUT, 'tactical-outbreak.png') });
    check('outbreak mission renders with its dressing and growth', ob.kind === 'outbreak' && ob.flesh > 0 && !errs.length, { ob, errs });
    await p.close();
  }
  R.done(); await b.close();
})();
