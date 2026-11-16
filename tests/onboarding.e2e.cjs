// Strategic overhaul E2: onboarding with Chief of Operations Krista Carter. A first visit starts it; steps with a
// goal close when the goal is met; progress survives a reload; it can be skipped.
const { chromium } = require('playwright');
const { fresh, close, dbg, reporter, OUT } = require('./lib.cjs');
const { check, done } = reporter();

(async () => {
  const b = await chromium.launch();
  const { p, errs, E } = await fresh(b, { width: 1440, height: 900 });
  await p.waitForTimeout(300); await close(p);
  const card = () => E(() => { const el = document.querySelector('.carter'); return el ? { compact: el.classList.contains('compact'), text: el.innerText } : null; });

  await p.click('[data-tab="command"]'); await p.waitForTimeout(100);
  let k = await card();
  check('a first visit opens with Krista Carter\'s welcome on Command', !!k && !k.compact && /Krista Carter/.test(k.text) && /Welcome to Site-19/.test(k.text), k?.text?.slice(0, 120));
  await p.screenshot({ path: `${OUT}/onboarding-welcome.png` });
  await p.click('.carter [data-coach]'); await p.waitForTimeout(100);
  k = await card();
  check('the next step points to the World map from Command', !!k && k.compact && /let time run/i.test(k.text), k?.text);
  await p.click('.carter [data-goto="world"]'); await p.waitForTimeout(150);
  k = await card();
  check('on the World map the step shows in full with its goal', !!k && !k.compact && /Goal: Let three days pass/.test(k.text), k?.text?.slice(0, 160));

  // the goal is met by playing: three days pass
  await dbg(p, 'd7'); await p.waitForTimeout(150);
  k = await card();
  check('letting time run closes that step by itself', !!k && /Answer an incident/.test(k.text), k?.text?.slice(0, 120));

  // progress is saved with the campaign
  const seenBefore = await E(() => window.__site19.campaign.tutorial.seen.filter(s => s.startsWith('ob-')));
  await p.reload(); await p.waitForTimeout(300); await close(p);
  const seenAfter = await E(() => window.__site19.campaign.tutorial.seen.filter(s => s.startsWith('ob-')));
  check('progress survives a reload', JSON.stringify(seenBefore) === JSON.stringify(seenAfter) && seenAfter.includes('ob-time'), { seenBefore, seenAfter });

  // skip a goal step, then meet the build goal through the Site-19 screen
  await p.click('[data-tab="world"]'); await p.waitForTimeout(100);
  await p.click('.carter [data-coach]'); await p.waitForTimeout(100);
  await p.click('[data-tab="site"]'); await p.waitForTimeout(100);
  k = await card();
  check('a goal step can be skipped; the next is building', !!k && /Build something/.test(k.text), k?.text?.slice(0, 80));
  await E(() => { const c = window.__site19.campaign; c.funds = 5000; });
  const empty = await E(() => document.querySelector('.slot.empty')?.dataset.slot);
  await p.click(`[data-slot="${empty}"]`); await p.waitForTimeout(100);
  await p.click('[data-build]:not([disabled])'); await p.waitForTimeout(150); await close(p);
  k = await card();
  check('building from the screen completes the build step', !!k && /put the researchers to work/i.test(k.text), k?.text?.slice(0, 80));

  // switching it off sticks
  await p.click('#coachOff'); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(300); await close(p);
  for (const t of ['command', 'world', 'site', 'research']) { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(60); }
  check('"Skip the briefings" turns them off for good', !(await card()));
  check('onboarding ran without errors', !errs.length, errs);
  await b.close();
  done();
})();
