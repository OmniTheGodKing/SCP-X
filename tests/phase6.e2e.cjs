// Phase 6 acceptance, in the browser: an unknown incident arrives as an investigation; the full-screen tactical view
// shows objectives and evidence without naming the cause; examining SCP-096's photograph marks the examiner and adds
// an objective; the debrief shows the containment outcome and objectives; the campaign carries the mark, the file and
// the encounter that follows; a recovered anomaly with nowhere suitable waits at the dock with placement choices in the
// containment card; save and reload keep it all. Run after `npm run build`: node tests/phase6.e2e.cjs
const { chromium } = require('playwright');
const path = require('path');
const { fresh, reporter, close, OUT } = require('./lib.cjs');
const R = reporter();
(async () => {
  const b = await chromium.launch();
  const { p, errs, E } = await fresh(b, { width: 1440, height: 900 });
  await close(p);
  // a founded site (Phase 5 onwards is when storylines run)
  const setup = await E(() => { const A = window.__site19, c = A.campaign; A.org.foundSite(c, { designation: 'Site-64', name: 'Site-64', lon: -77, lat: 39 }); A.dossier.ensureDossier(c);
    A.containment.firstSighting(c, '096'); const inc = c.incidents.find(i => i.scpId === '096'); A.save();
    return { kind: inc?.kind, id: inc?.id, title: inc?.title, ev: inc?.evidence?.length, ops: c.roster.filter(o => o.alive && !o.busy).slice(0, 3).map(o => o.id) }; });
  R.check('an unknown incident arrives as an investigation, not naming the cause', setup.kind === 'investigation' && !/096/.test(setup.title) && setup.ev >= 3, setup);

  await E(([id, ops]) => window.__site19.launchNow(id, ops), [setup.id, setup.ops]);
  await p.waitForTimeout(1500);
  await close(p);
  const view = await E(() => { const A = window.__site19, S = A.mission, cv = document.querySelector('#cv').getBoundingClientRect();
    return { full: cv.width >= innerWidth - 2 && cv.height >= innerHeight - 2, objs: [...document.querySelectorAll('#optList [data-obj]')].map(d => d.dataset.obj), title: document.querySelector('#mTitle')?.textContent,
      statue: S.statue.name, evidence: S.units.filter(u => u.evidence).length, legend: document.body.innerText.includes('Shy Guy'),
      status: (document.querySelector('#statusLabel')?.textContent ?? '') + ' ' + (document.querySelector('#statusLine')?.textContent ?? '') }; });
  R.check('the battlefield stays full-screen', view.full, view);
  R.check('objectives are listed by tier on the mission screen', view.objs.includes('evidence') && view.objs.includes('identify'), view.objs);
  R.check('evidence is on the map and the cause is not named anywhere', view.evidence >= 3 && view.statue === 'Unidentified entity' && !view.legend && !/096/.test(view.title) && !/096|weeping/i.test(view.status), view);
  await p.screenshot({ path: path.join(OUT, 'phase6-investigation.png') });

  // auto end turn: everyone but one spends their actions; that one moves with both actions; the turn ends by itself
  await p.click('#coachSkip').catch(() => {});
  const auto = await E(async () => { const A = window.__site19, S = A.mission, team = S.units.filter(u => u.side === 'mtf' && u.alive);
    for (const u of team.slice(1)) u.ap = 0; const t0 = S.turn, u = team[0]; u.ap = 1;
    const before = A.outOfActions(); u.ap = 0; A.actionsHook(); const right = A.outOfActions(); return { t0, before, right }; });
  await p.waitForTimeout(2500);
  const autoAfter = await E(() => ({ turn: window.__site19.mission.turn, log: window.__site19.mission.log.slice(0, 8).map(l => l.text).join(' | ') }));
  R.check('the turn ends by itself once nobody has actions left', !auto.before && auto.right && autoAfter.turn === auto.t0 + 1 && /Nobody has any actions left/.test(autoAfter.log), { auto, autoAfter });

  // examine the photograph
  const mark = await E(() => { const A = window.__site19, S = A.mission, photo = S.units.find(u => u.evidence === 'photograph'), a = S.units.find(u => u.side === 'mtf');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (A.passable(photo.x + dx, photo.y + dy) && !S.units.some(v => v.alive && v.x === photo.x + dx && v.y === photo.y + dy)) { a.x = photo.x + dx; a.y = photo.y + dy; break; }
    a.ap = 2; A.computeVis(); A.abilities.useAbility(a, 'examine', photo);
    const b = S.units.filter(u => u.side === 'mtf')[1], t = S.units.find(u => u.evidence === 'testimony');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (A.passable(t.x + dx, t.y + dy) && !S.units.some(v => v.alive && v.x === t.x + dx && v.y === t.y + dy)) { b.x = t.x + dx; b.y = t.y + dy; break; }
    b.ap = 2; A.computeVis(); A.abilities.useAbility(b, 'examine', t);
    return { marked: a.marked, op: a.opId, objective: S.objectives.some(o => o.kind === 'protect_marked' && !o.hidden), arriving: S.arrive096 !== undefined, log: S.log.slice(0, 4).map(l => l.text).join(' | ') }; });
  await p.waitForTimeout(400);
  const dyn = await E(() => [...document.querySelectorAll('#optList [data-obj]')].map(d => d.textContent).join(' / '));
  R.check('looking at the photograph marks the examiner and a dynamic objective appears', mark.marked && mark.objective && mark.arriving && /out of the area/.test(dyn), { mark, dyn });
  R.check('the log does not name the anomaly before identification', !/SCP-096/.test(mark.log), mark.log);
  await p.screenshot({ path: path.join(OUT, 'phase6-marked.png') });

  // everyone leaves; the debrief
  await E(() => { const A = window.__site19, S = A.mission; for (const u of S.units) if (u.side === 'mtf' && u.alive) u.saved = true; A.campaignMod; return true; });
  await E(() => { const A = window.__site19; A.endTurn(); });
  await p.waitForTimeout(2500);
  const deb = await E(() => ({ outcome: document.querySelector('[data-outcome]')?.dataset.outcome, objs: [...document.querySelectorAll('.objectives [data-obj]')].map(d => `${d.dataset.obj}:${d.dataset.status}`), text: document.querySelector('.debrief')?.textContent ?? '' }));
  R.check('the debrief shows the containment outcome and each objective', deb.outcome === 'evidence' && deb.objs.some(o => o === 'evidence:done'), deb);
  R.check('the debrief says the operative is marked', /marked/.test(deb.text), deb.text.slice(0, 300));
  R.check('the debrief does not claim a capture, nor count an evidence body as a civilian death', !/in Foundation hands/.test(deb.text) && !/civilian died/.test(deb.text), deb.text.slice(0, 400));
  R.check('objectives left undone are settled at the end', deb.objs.includes('identify:failed'), deb.objs);
  await p.screenshot({ path: path.join(OUT, 'phase6-debrief.png') });
  const camp = await E(op => { const A = window.__site19, c = A.campaign, f = c.dossier['096'];
    return { marked: (c.marked ?? []).some(m => m.opId === op), enc: c.incidents.some(i => i.scpId === '096' && i.markedOp === op), known: f.known, stage: f.stage, inv: A.invariants() }; }, mark.op);
  R.check('the campaign carries the mark and the encounter on a deadline', camp.marked && camp.enc, camp);
  R.check('the file learned the face and the image hazards', camp.known.includes('face_trigger') && camp.known.includes('image_carrier'), camp.known);
  R.check('campaign invariants hold', !camp.inv.length, camp.inv);

  // a recovered anomaly with nowhere suitable to go waits at the dock with choices
  await E(() => { const A = window.__site19; const btn = document.querySelector('#returnBtn'); if (btn) btn.click(); });
  await p.waitForTimeout(800); await close(p);
  await E(() => { const A = window.__site19, c = A.campaign; c.incidents = c.incidents.filter(i => i.scpId !== '096'); c.marked = []; A.containment.captureNow(c, '096'); A.save(); A.hub(); });
  await p.waitForTimeout(500); await close(p);
  await p.click('[data-tab="site"]').catch(() => {}); await p.waitForTimeout(400); await close(p);
  const dock = await E(() => { const c = window.__site19.campaign, s = c.scps.find(x => x.id === '096'); return { status: s?.status, pending: c.placement?.scpId, opts: window.__site19.dossier.placementOptions(c, '096').map(o => o.kind) }; });
  R.check('recovered SCP-096 waits at the dock: no chamber gives it image screening', dock.status === 'holding' && dock.pending === '096' && dock.opts.includes('transfer'), dock);
  const tr = await E(() => window.__site19.dispatch({ type: 'placeAnomaly', scpId: '096', kind: 'transfer' }));
  const after = await E(() => { const c = window.__site19.campaign; return { held: c.scps.some(x => x.id === '096'), where: c.dossier['096'].holder, canSpawn: window.__site19.dossier.canSpawnAnomaly(c, '096') }; });
  R.check('transfer through the command layer: it goes to Site-17 and is never "found" again', tr.ok && !after.held && after.where === 'Site-17' && !after.canSpawn, { tr, after });

  // save and reload
  await E(() => window.__site19.save());
  await p.reload(); await p.waitForTimeout(800); await close(p);
  const back = await E(() => { const c = window.__site19.campaign; return { file: c.dossier?.['096']?.holder, known: c.dossier?.['096']?.known.length, arc: c.arcs?.['096']?.stage, site: !!c.site }; });
  R.check('save and reload keep the dossier and the storyline', back.file === 'Site-17' && back.known >= 2 && !!back.arc && back.site, back);
  R.check('no page errors', !errs.length, errs);
  await b.close();
  R.done();
})().catch(e => { console.log('FAIL crashed ::', e.message); process.exitCode = 1; });
