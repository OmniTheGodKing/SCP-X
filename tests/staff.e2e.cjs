// Strategic overhaul D1: the researchers caught in a breach are Site-19's own named staff. One killed in the mission
// is gone from the staff list afterwards and remembered among the lost; the survivors stay on staff.
const { chromium } = require('playwright');
const { fresh, close, dbg, reporter } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const { p, errs, E } = await fresh(b, { width: 1300, height: 1200 });
  await p.waitForTimeout(300); await close(p);
  await dbg(p, 'researchers');   // four researchers on staff, so a breach catches up to three
  await E(() => { const c = window.__site19.campaign;
    c.scps[0].status = 'breach'; c.incidents.push({ id: 'incS', kind: 'breach', scpId: '173', title: 'Incident 901: SCP-173 breach, staff test', appeared: c.day, expires: c.day, insurgents: 0, region: 'east_us', map: 'wingC' }); });
  await p.click('[data-tab=site]'); await p.click('[data-tab=command]'); await p.click('[data-plan="incS"]');
  await p.click('#launchBtn'); await p.waitForTimeout(400); await close(p);
  const staff = await E(() => window.__site19.campaign.people.filter(x => x.kind === 'researcher' && !x.away).map(x => x.name));
  const inWing = await E(() => window.__site19.mission.units.filter(u => u.researcher).map(u => u.name));
  const objective = await E(() => document.body.innerText);
  check('D1: the breach has researchers in the wing', inWing.length > 0, inWing);
  check('D1: every researcher in the wing is a named member of Site-19\'s staff', inWing.length > 0 && inWing.every(n => staff.includes(n)), { inWing, staff });
  check('D1: the optional objective names them', inWing.every(n => objective.includes(n)), inWing);

  // one of them dies in the wing; the mission is then won (the rest come out)
  const victim = inWing[0];
  await E(n => { const u = window.__site19.mission.units.find(x => x.researcher && x.name === n); u.alive = false; u.hp = 0; }, victim);
  await dbg(p, 'win'); await p.waitForTimeout(300);
  if (await p.$('#returnBtn')) await p.click('#returnBtn');
  await p.waitForTimeout(300); await close(p);
  const after = await E(() => { const c = window.__site19.campaign; return { staff: c.people.filter(x => x.kind === 'researcher').map(x => x.name), count: c.researchers, lost: (c.staffLost ?? []).map(l => l.name), log: c.log.slice(0, 12).map(l => l.text).join(' | ') }; });
  check('D1: the researcher killed in the mission is gone from the staff list', !after.staff.includes(victim), { victim, staff: after.staff });
  check('D1: and remembered among the lost', after.lost.includes(victim), after.lost);
  check('D1: the researcher count matches the people on staff', after.count === after.staff.length, after);
  check('D1: the others in the wing are still on staff', inWing.slice(1).every(n => after.staff.includes(n)), { inWing, staff: after.staff });
  check('D1: a dead researcher is not counted as a civilian death (no exposure for it)', !/civilians? died/.test(after.log), after.log);
  check('D1: the site log names who was lost', after.log.includes(victim), after.log);
  const inv = await E(() => window.__site19.invariants());
  check('D1: campaign invariants hold after the mission', inv.length === 0, inv);
  check('D1 ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
