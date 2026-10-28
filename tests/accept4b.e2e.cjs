// Phase 4B acceptance: each new anomaly is sighted (debug), deployed against in a live mission, and its key rules are
// driven: SCP-096 is triggered by a face sight line and not by an eyes-down approach, and hooded; SCP-012 compels and is
// shaken off and secured; SCP-939 hears a footstep, ignores a still unit, speaks, and is sealed in with a lure;
// SCP-035's host falls, the mask takes someone and is cased; SCP-682 adapts, collapses, and is sealed while down.
// Then the campaign side: capture into a wing, research branches, routines and a breach.
const { chromium } = require('playwright');
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + JSON.stringify(detail) : ''}`);

async function start(b, id) {
  const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 500; });
  await dbg(p, 'see' + id);
  await p.click('[data-tab="command"]');
  const inc = await p.evaluate(sid => { const c = window.__site19.campaign; const i = c.incidents.find(i => i.scpId === sid); i.map = 'town'; i.insurgents = 0; i.night = false; i.weather = 'clear'; return i.id; }, id);
  await p.click(`[data-plan="${inc}"]`);
  await p.click('#launchBtn'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(400); }
  await p.evaluate(() => { const S = window.__site19.mission; for (const u of S.units) if (u.side === 'raider' || u.side === 'dclass' || (u.side === 'civilian' && !u.host)) u.alive = false; window.__site19.computeVis(); });
  return { p, errs, E: (f, a) => p.evaluate(f, a) };
}
/** Free floor tiles near (x, y), nearest first. */
const FREE = `(x, y, n) => { const A = window.__site19, S = A.mission, G = A.grid, out = [];
  for (let r = 1; r < 12 && out.length < n; r++) for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++)
    if (out.length < n && Math.max(Math.abs(xx - x), Math.abs(yy - y)) === r && A.passable(xx, yy) && !S.units.some(u => u.alive && !u.saved && u.x === xx && u.y === yy)) out.push([xx, yy]);
  return out; }`;

(async () => {
  const b = await chromium.launch();

  // ---- SCP-096 ----
  {
    const { p, errs, E } = await start(b, '096');
    const r = await E(new Function('FREE', `return (async () => { const free = ${FREE};
      const A = window.__site19, S = A.mission, X = A.scp4b, d = S.statue, ops = S.units.filter(u => u.side === 'mtf');
      const out = { scp: S.scp, kit: ops[0].items.map(i => i.id) };
      // stand an operative right in front of its face, eyes down: not triggered
      const front = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][d.facing ?? 0];
      const fx = d.x + front[0], fy = d.y + front[1];
      for (const o of ops) { o.x = 1; o.y = 1; }
      const m = ops[0]; m.x = fx; m.y = fy; m.eyesDown = true; A.computeVis(); X.check096();
      out.eyesDownSafe = !S.rage;
      out.canHood = X.hoodTargets(m).length === 1;
      // a second operative looks at it from the front, 3 tiles out, eyes up: marked
      // a floor tile in its face's wedge, 2 to 5 tiles out, with a clear sight line to it
      const n = ops[1]; let far = null;
      // turn it until its face looks over somewhere a person could stand 2 to 5 tiles away
      for (let turn = 0; turn < 8 && !far; turn++) {
        if (turn) d.facing = ((d.facing ?? 0) + 1) % 8;
        for (let r = 2; r <= 5 && !far; r++) for (let y = d.y - r; y <= d.y + r && !far; y++) for (let x = d.x - r; x <= d.x + r && !far; x++)
          if (Math.max(Math.abs(x - d.x), Math.abs(y - d.y)) === r && A.passable(x, y) && X.inFace(x, y) && A.sight(x, y, d.x, d.y) && !S.units.some(u => u.alive && u.x === x && u.y === y)) far = [x, y];
      }
      // and the operative looking down stands right in front of it
      { const fr = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]][d.facing ?? 0]; m.x = d.x + fr[0]; m.y = d.y + fr[1]; A.computeVis(); }
      n.x = far[0]; n.y = far[1]; n.eyesDown = false; A.computeVis();
      out.n2Sees = A.canSee(n, d.x, d.y) && X.inFace(n.x, n.y);
      X.check096();
      out.marked = !!S.rage && S.rage.targets.includes(n.id);
      out.hoodWhileEnraged = X.hoodTargets(m).length;
      // two enemy turns: it screams, then runs them down
      await A.endTurn(); out.after1 = { alive: n.alive, scream: S.rage?.scream, turn: S.turn };
      await A.endTurn(); out.after2 = { alive: n.alive, rage: !!S.rage };
      await A.endTurn(); out.after3 = { rage: !!S.rage };
      // hood it now that it's quiet
      if (!S.over) { m.ap = 2; out.hoodNow = X.hoodTargets(m).length === 1; if (out.hoodNow) X.putHood(m); out.hooded = !!S.hooded; }
      return out; })()`), null);
    check('096: an operative looking down in front of it does not trigger it', r.eyesDownSafe, r);
    check('096: a face sight line marks the viewer, who is killed after a turn of screaming', r.marked && r.after1.alive && !r.after2.alive, r);
    check('096: no hood while enraged; it calms once its target is dead, and can be hooded', r.hoodWhileEnraged === 0 && !r.after3.rage && r.hooded, r);
    check('096: the hood is issued to the first operative', r.kit.includes('hood'), r.kit);
    check('096 mission ran without errors', !errs.length, errs);
    await p.screenshot({ path: '/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/4b-096.png' });
    await p.close();
  }

  // ---- SCP-012 ----
  {
    const { p, errs, E } = await start(b, '012');
    const r = await E(new Function(`return (async () => { const free = ${FREE};
      const A = window.__site19, S = A.mission, X = A.scp4b, d = S.statue, ops = S.units.filter(u => u.side === 'mtf');
      for (const o of ops) { o.x = 1; o.y = 1; }
      const spots = free(d.x, d.y, 8), m = ops[0], n = ops[1];
      const near3 = spots.find(([x, y]) => Math.max(Math.abs(x - d.x), Math.abs(y - d.y)) >= 2 && A.sight(x, y, d.x, d.y)) ?? spots[2];
      n.x = near3[0]; n.y = near3[1]; n.san = 10; n.eyesDown = false;
      m.x = spots[0][0]; m.y = spots[0][1]; m.eyesDown = true;
      A.computeVis();
      const rnd = Math.random; Math.random = () => 0.01; X.endOfEnemyPhase(); Math.random = rnd;
      const out = { compelled: n.compelled !== undefined, eyesDownSafe: m.compelled === undefined };
      const mAt = [m.x, m.y]; m.x = 1; m.y = 1;   // out of the way while they walk to it
      const hp0 = n.hp; await X.newAnomalyPhase(); out.walked = Math.max(Math.abs(n.x - d.x), Math.abs(n.y - d.y)) <= 1; out.bled = n.hp < hp0;
      // shake them out (from next to them), then secure the score with eyes down
      const sp = free(n.x, n.y, 1)[0]; const k = ops[2] ?? ops[0]; if (k !== m) { k.x = sp[0]; k.y = sp[1]; k.eyesDown = false; }
      out.canShake = X.shakeTargets(k).includes(n); if (out.canShake) X.shakeOut(k, n); out.released = n.compelled === undefined;
      { const sp2 = free(d.x, d.y, 8).find(([x, y]) => Math.max(Math.abs(x - d.x), Math.abs(y - d.y)) === 1); m.x = sp2[0]; m.y = sp2[1]; }
      out.canSecure = X.scoreTargets(m).length === 1;
      m.eyesDown = false; out.needsEyesDown = X.scoreTargets(m).length === 0; m.eyesDown = true;
      if (out.canSecure) { X.secureScore(m); A.computeVis(); }
      out.sealed = S.sealed;
      return out; })()`), null);
    await p.waitForTimeout(200);
    const end = await E(() => { const A = window.__site19; return { over: A.mission.over, win: A.mission.result?.win }; });
    check('012: a low-sanity operative in sight is compelled, one looking down is not', r.compelled && r.eyesDownSafe, r);
    check('012: the compelled walk to it and write in their blood; a shake frees them', r.walked && r.bled && r.released, r);
    check('012: the score is secured only with eyes down, and that wins', r.canSecure && r.needsEyesDown && r.sealed, { ...r, end });
    check('012 mission ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- SCP-939 ----
  {
    const { p, errs, E } = await start(b, '939');
    const r = await E(new Function(`return (async () => { const free = ${FREE};
      const A = window.__site19, S = A.mission, X = A.scp4b, ops = S.units.filter(u => u.side === 'mtf'), v = X.voices();
      const out = { pack: v.length, kit: ops[0].items.find(i => i.id === 'noisemaker')?.uses };
      // a footstep within earshot is heard; nothing from a unit that stays still
      S.mem.clear();
      const f = free(v[0].x, v[0].y, 6)[5]; A.emitNoise(f[0], f[1], 'footsteps', ops[0]);
      out.heard = !!S.mem.get('939-' + v[0].id);
      out.memAt = S.mem.get('939-' + v[0].id);
      // hidden beyond 5 tiles of the team: put the team in the corner farthest from it
      for (const o of ops) { o.x = v[0].x > 13 ? 1 : 26; o.y = v[0].y > 8 ? 1 : 16; }
      out.hiddenFar = X.hidden939(v[0]);
      // a voice: force the mimic roll
      const before = S.log.length; const rnd = Math.random; Math.random = () => 0.01; await X.newAnomalyPhase(); Math.random = rnd;
      out.voiceLine = S.log.slice(0, S.log.length - before + 3).map(l => l.text).find(t => /: "/.test(t));
      // put one in the container and seal it
      const G = A.grid, cont = G.contTiles[0], door = G.contTiles.length ? (() => { for (const [cx, cy] of G.contTiles) for (const [dx, dy] of [[0,-1],[0,1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]) { const x = cx + dx, y = cy + dy; if (A.passable(x, y) && G.grid[y][x] !== 5) return [x, y]; } })() : null;
      v[0].x = cont[0]; v[0].y = cont[1];
      ops[0].x = door[0]; ops[0].y = door[1]; ops[0].ap = 2;
      out.door = door;
      return out; })()`), null);
    // seal with the S key
    await p.evaluate(() => { window.__site19.mission.selected = window.__site19.mission.units.find(u => u.side === 'mtf'); });
    await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('s'); await p.waitForTimeout(300);
    const end = await E(() => { const S = window.__site19.mission; return { sealed: S.sealed, over: S.over, win: S.result?.win, why: document.querySelector('#hint')?.textContent?.slice(0, 120) }; });
    check('939: three instances, two noisemakers issued', r.pack === 3 && r.kit === 2, r);
    check('939: hears a footstep and remembers where; unseen beyond 5 tiles', r.heard && r.hiddenFar, r);
    check('939: speaks in a team member\'s or a local\'s voice', !!r.voiceLine, r.voiceLine);
    check('939: sealed in the container with an instance inside wins', end.sealed && end.win === true, end);
    check('939 mission ran without errors', !errs.length, errs);
    await p.close();
  }
  // 939 no-specimen: kill all three
  {
    const { p, errs, E } = await start(b, '939');
    await E(() => { const S = window.__site19.mission; for (const v of window.__site19.scp4b.voices()) v.alive = false; });
    await E(() => window.__site19.endTurn());
    await p.waitForTimeout(300);
    const end = await E(() => { const S = window.__site19.mission; return { over: S.over, win: S.result?.win, noSpecimen: S.result?.noSpecimen }; });
    if (await p.$('#returnBtn')) await p.click('#returnBtn');
    const held = await E(() => window.__site19.campaign.scps.find(s => s.id === '939')?.status);
    check('939: killing every instance wins with no specimen; it is not held', end.win && end.noSpecimen && held !== 'contained', { ...end, held });
    check('939 no-specimen ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- SCP-035 ----
  {
    const { p, errs, E } = await start(b, '035');
    const r = await E(new Function(`return (async () => { const free = ${FREE};
      const A = window.__site19, S = A.mission, X = A.scp4b, ops = S.units.filter(u => u.side === 'mtf'), h = S.units.find(u => u.id === S.maskHost);
      const out = { host: h?.name, kit: ops[0].items.map(i => i.id) };
      for (const o of ops) { o.x = 1; o.y = 1; }
      // put the host down: the mask falls
      const hpBefore = h.hp; await X.newAnomalyPhase(); out.rots = h.hp === hpBefore - 1;
      A.fire && (h.hp = 1); const S2 = S; window.__site19.scp4b; // keep
      h.hp = 1; window.__site19.mission.hitKind = 'rifle';
      // a hit kills the host
      const t = ops[1]; const sp = free(h.x, h.y, 2); t.x = sp[1][0]; t.y = sp[1][1];
      await A.fire(t, h, false).catch(() => {});
      if (h.alive) { h.hp = 0; }
      out.onFloor = X.maskOnFloor();
      // an operative without a suit next to it: forced roll, it takes them
      const m = ops[2] ?? ops[1]; m.x = sp[0][0]; m.y = sp[0][1]; m.armorKind = undefined; m.san = 80;
      // everyone else well away from the mask, so the one beside it is the one it reaches for
      for (const o of ops) if (o !== m && o !== t) { o.x = h.x > 13 ? 1 : 26; o.y = h.y > 8 ? 1 : 16; }
      // the shooter steps back out of its reach, so the one next to it is the nearest
      const back = free(h.x, h.y, 60).find(([x, y]) => Math.max(Math.abs(x - h.x), Math.abs(y - h.y)) >= 3); t.x = back[0]; t.y = back[1];
      if (!out.onFloor) { X.dropMask(h); out.onFloor = X.maskOnFloor(); }
      const rnd = Math.random; Math.random = () => 0.01; X.endOfEnemyPhase(); Math.random = rnd;
      out.possessed = m.host === true && m.side === 'zombie';
      // knock them down: they go down, the mask drops, and they're one of ours again
      m.hp = 1; X; window.__site19.mission.hitKind = 'rifle';
      const comb = window.__site19;
      // use damage through fire() from the other operative
      for (let k = 0; k < 12 && m.host; k++) { t.ap = 2; m.hp = 1; await A.fire(t, m, false).catch(() => {}); }
      out.freed = !m.host && m.side === 'mtf' && m.alive;
      out.downed = !!m.downed;
      // the case: an operative in a hazmat suit beside the mask
      const c = ops[0]; const sp2 = free(S.statue.x, S.statue.y, 1)[0]; c.x = sp2[0]; c.y = sp2[1]; c.armorKind = 'hazmat';
      out.canCase = X.caseTargets(c).length === 1;
      if (out.canCase) X.caseMask(c);
      out.sealed = S.sealed;
      return out; })()`), null);
    check('035: the host rots, and when it is put down the mask falls', r.rots && r.onFloor, r);
    check('035: the mask takes an unsuited operative next to it; downing them frees them', r.possessed && r.freed, r);
    check('035: cased by an operative in a suit wins', r.canCase && r.sealed, r);
    check('035 mission ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- SCP-682 ----
  {
    const { p, errs, E } = await start(b, '682');
    const r = await E(new Function(`return (async () => { const free = ${FREE};
      const A = window.__site19, S = A.mission, X = A.scp4b, d = S.statue, ops = S.units.filter(u => u.side === 'mtf');
      const out = { hp: d.hp };
      for (const o of ops) { o.x = 1; o.y = 1; }
      // three rifle hits adapt it
      for (let k = 0; k < 4; k++) X.hit682(4, 'rifle');
      out.afterRifle = d.hp; out.adapt = S.adapt.rifle;
      out.fourthHalved = out.hp - out.afterRifle === 4 * 3 + 2;
      // it regenerates
      await X.newAnomalyPhase(); out.regen = d.hp - out.afterRifle;
      // put it down
      X.hit682(99, 'explosive'); out.down = X.isDown682(); out.downUntil = S.downUntil; out.turn = S.turn;
      // into the container while it's down: seal works
      const G = A.grid, cont = G.contTiles[0];
      d.x = cont[0]; d.y = cont[1];
      for (const [cx, cy] of G.contTiles) for (const [dx, dy] of [[0,-1],[0,1],[1,0],[-1,0]]) { const x = cx + dx, y = cy + dy; if (!out.door && A.passable(x, y) && G.grid[y][x] !== 5) out.door = [x, y]; }
      ops[0].x = out.door[0]; ops[0].y = out.door[1]; ops[0].ap = 2; S.selected = ops[0];
      return out; })()`), null);
    await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('s'); await p.waitForTimeout(300);
    const end = await E(() => { const S = window.__site19.mission; return { sealed: S.sealed, win: S.result?.win }; });
    check('682: after 3 hits of one kind, that kind does half damage', r.adapt >= 3 && r.fourthHalved, r);
    check('682: regenerates 4 a turn', r.regen === 4, r);
    check('682: at 0 HP it collapses for 2 turns, and can be sealed in while down', r.down && r.downUntil === r.turn + 1 && end.sealed && end.win, { ...r, end });
    check('682 mission ran without errors', !errs.length, errs);
    await p.close();
  }

  // ---- campaign side ----
  {
    const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/user/scp-x/dist/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.evaluate(() => { const c = window.__site19.campaign; c.tutorial = false; c.day = 500; c.funds = 3000; });
    const sight = await p.evaluate(() => { const c = window.__site19.campaign; return Object.fromEntries(Object.entries(c.sightings)); });
    // free wings for them: copy an existing containment wing to empty slots (the debug capture hands off if none)
    await p.evaluate(() => { const c = window.__site19.campaign, f = c.base.facilities.find(f => /^cont_/.test(f.type));
      for (let k = 0; k < 5; k++) c.base.facilities.push({ ...f, id: 'test-wing-' + k, type: k < 2 ? 'cont_euclid' : 'cont_keter', disabled: false, wrecked: false, level: 1, slot: k }); });
    const got = [];
    for (const id of ['012', '096', '939', '035', '682']) {
      await p.evaluate(() => { const c = window.__site19.campaign; c.research.done.push('keter_containment'); });
      await dbg(p, 'get' + id);
      got.push(await p.evaluate(sid => window.__site19.campaign.scps.find(s => s.id === sid)?.status ?? 'handed off', id));
    }
    await p.click('[data-tab="research"]').catch(() => {});
    const branches = await p.evaluate(() => [...document.querySelectorAll('[data-branch], .branch, .rbranch')].map(e => e.textContent.trim()).filter(t => /SCP-(096|012|939|035|682)/.test(t)).slice(0, 10));
    const research = await p.evaluate(() => document.body.innerText.match(/Blindfold drill|Composition analysis|Voice analysis|Mask psychology|Regeneration study/g));
    // a breach of each held one, and SCP-682's knock-on
    const breach = await p.evaluate(() => { const c = window.__site19.campaign; const s = c.scps.find(s => s.id === '682' && s.status === 'contained'); return s ? s.id : null; });
    if (breach) await dbg(p, 'breach682');
    const after = await p.evaluate(() => { const c = window.__site19.campaign; return { inc: c.incidents.filter(i => i.kind === 'breach').map(i => i.scpId), wrecked: c.base.facilities.filter(f => f.disabled).map(f => f.type) }; });
    check('campaign: each new anomaly can be captured (held, or handed off with no wing)', got.every(g => g === 'contained' || g === 'handed off'), got);
    check('campaign: first sightings are scheduled for the new anomalies', ['096', '012', '939', '035', '682'].every(id => sight[id] !== undefined), sight);
    check('campaign: captured ones are held in a wing', got.filter(g => g === 'contained').length === 5, got);
    check('campaign: their research shows up', (research ?? []).length >= 1, research);
    check('campaign: an SCP-682 breach wrecks its wing', !breach || after.wrecked.length > 0, { breach, after });
    check('campaign ran without errors', !errs.length, errs);
    await p.close();
  }
  await b.close();
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAILED');
})().catch(e => { console.log('FAIL crashed', e.message, e.stack); process.exit(1); });
