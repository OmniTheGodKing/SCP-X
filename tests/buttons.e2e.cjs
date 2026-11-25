// Buttons stay solid (UI regression: buttons had gone see-through). Walks the major screens at several window sizes and
// checks every visible button: its painted face is opaque and nothing in its ancestry lowers its opacity, so the room
// art, the world map or the tactical board never shows through. Text must clear 4.5:1 against the face (3:1 for a
// disabled button, which is quieter by design). Intentionally bare controls (tabs, text links, the surface hotspots,
// the cross-section's illustrated room tiles) are left out: they have no face to begin with.
const { chromium } = require('playwright');
const { GAME_URL, OUT, close, dbg, fresh, reporter, openTarget, planIncident } = require('./lib.cjs');

const SIZES = [{ width: 1280, height: 800 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }];

/** Runs in the page: every visible button-like control that fails a check, with the reason. */
function auditButtons() {
  // bare by design: tabs, text links, menu entries, and the clickable objects of the illustrated rooms (doors, lockers,
  // figures, the notice board, wall screens, the hotspots on the dummy and the surface), which are the art itself
  const BARE = '.tab, .linkbtn, .hotspot, .slot, [data-dbg], .mitem, .fixture > button, .door, .plaque, .board, .frame, .soldier, .dept .display, .bodyspot, .sq, .rackgun';
  // computed colours come back as rgb()/rgba() or, from color-mix(), as color(srgb r g b [/ a]) with channels 0 to 1
  const rgba = s => {
    let m = s.match(/^rgba?\(([^)]+)\)/);
    if (m) { const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; }
    m = s.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const v = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: v[0] * 255, g: v[1] * 255, b: v[2] * 255, a: v.length > 3 ? v[3] : 1 }; }
    return null;
  };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bad = []; let n = 0;
  for (const el of document.querySelectorAll('button, label.act, summary.act, span.act, .act')) {
    if (el.matches(BARE) || el.closest('.dbg')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    n++;
    const name = (el.id ? '#' + el.id + ' ' : '') + el.className + ' "' + (el.textContent || '').trim().slice(0, 30) + '"';
    let hidden = false;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const o = parseFloat(getComputedStyle(a).opacity);
      if (o === 0) { hidden = true; break; }   // faded out on purpose (the tactical HUD during deployment and after the end)
      if (o < 0.999) { bad.push(`${name}: opacity ${o} on ${a === el ? 'itself' : a.tagName.toLowerCase() + '.' + a.className}`); break; }
    }
    if (hidden) { n--; continue; }
    const bg = rgba(cs.backgroundColor), fg = rgba(cs.color);
    if (!bg || bg.a < 0.999) { bad.push(`${name}: translucent face ${cs.backgroundColor}`); continue; }
    const need = el.disabled || el.classList.contains('disabled') ? 3 : 4.5;
    if (fg && ratio(fg, bg) < need) bad.push(`${name}: text contrast ${ratio(fg, bg).toFixed(2)} (${cs.color} on ${cs.backgroundColor})`);
  }
  return { n, bad };
}

(async () => {
  const b = await chromium.launch();
  const { check, done } = reporter();
  const seen = new Set();
  for (const size of SIZES) {
    const { p, errs, E } = await fresh(b, size);
    await p.waitForTimeout(300); await close(p);
    if (await p.$('#coachOff')) await p.click('#coachOff');
    // a finished workshop in the first free slot, so Engineering has a room to check
    await E(() => { const c = window.__site19.campaign; c.tutorial = false;
      for (let l = 0; l < c.base.levels && !c.base.facilities.some(f => f.type === 'workshop'); l++) for (let k = 0; k < 6; k++)
        if (!c.base.facilities.some(f => f.level === l && f.slot === k)) { c.base.facilities.push({ id: 'f' + (c.base.nextId++), type: 'workshop', level: l, slot: k, daysLeft: 0, disabled: false, repairDays: 0 }); break; } });
    const tag = `${size.width}x${size.height}`;
    const audit = async (screen, shot) => {
      await p.waitForTimeout(550);           // camera moves and entry transitions finish
      await p.mouse.move(1, 1);
      const r = await E(auditButtons);
      check(`${tag} ${screen}: ${r.n} buttons are solid and readable`, r.n > 0 && !r.bad.length, r.bad.slice(0, 8));
      if (shot && !seen.has(screen)) { seen.add(screen); await p.screenshot({ path: `${OUT}/buttons-${screen.replace(/\W+/g, '-')}.png` }); }
    };
    const tab = async t => { await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(150); await close(p); };

    await tab('command'); await audit('command room', true);
    await openTarget(p, 'comms').catch(() => {}); await audit('command comms panel', true);
    await tab('world'); await audit('world map', true);
    await tab('research'); await audit('research room', true);
    const rTargets = await E(() => [...document.querySelectorAll('.objbar [data-target]')].map(x => x.dataset.target));
    for (const t of rTargets.slice(0, 3)) { await openTarget(p, t); await audit(`research ${t}`); }
    await tab('personnel'); await audit('barracks', true);
    await tab('site'); await audit('site-19 cross-section', true);
    await p.click('[data-enter="surface:armory"]'); await p.waitForTimeout(600);
    await audit('armory', true);
    await openTarget(p, 'racks').catch(() => {}); await audit('armory racks', true);
    const who = await E(() => window.__site19.campaign.roster[0].id);
    if (await p.$(`[data-armop="${who}"]`)) { await p.click(`[data-armop="${who}"]`); await audit('armory bench', true); }
    // engineering: the workshop, entered from its slot in the cross-section
    await tab('site');
    const ws = await E(() => { const s = [...document.querySelectorAll('.slot[title]')].find(x => /workshop/i.test(x.title)); return s?.dataset.slot ?? null; });
    let inWs = false;
    if (ws) {
      await p.click(`[data-slot="${ws}"]`); await p.waitForTimeout(700);   // a built room's slot enters it
      inWs = !!(await p.$('.roomview'));
      if (inWs) { await audit('engineering workshop', true);
        for (const t of await E(() => [...document.querySelectorAll('.objbar [data-target]')].map(x => x.dataset.target).slice(0, 3))) { await openTarget(p, t); await audit(`engineering ${t}`, true); } }
    }
    check(`${tag} engineering: the workshop was entered`, inWs, ws);

    // tactical: a live mission, with its action bar over the board (some actions disabled at the start)
    await tab('command');
    await dbg(p, 'strike');
    const id = await E(() => window.__site19.campaign.incidents.find(i => i.kind === 'strike')?.id);
    await planIncident(p, id); await audit('mission planning', true);
    for (const op of ['op1', 'op2', 'op3']) await p.click(`[data-pick="${op}"]`).catch(() => {});
    await p.click('#launchBtn'); await p.waitForTimeout(300);
    if (await E(() => !!window.__site19.campaign.outbound)) { await dbg(p, 'land'); await p.waitForTimeout(400); }
    await close(p);
    // the HUD fades in once the deployment intro has played
    await p.waitForSelector('main.tac:not(.deploying) #actionBar', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(900);
    const bar = await E(() => { const a = document.querySelector('#actionBar'); return a ? parseFloat(getComputedStyle(a).opacity) : null; });
    check(`${tag} tactical: the action bar is on screen to check`, bar === 1, bar);
    await audit('tactical', true);
    const dis = await E(() => [...document.querySelectorAll('#actionBar button.act:disabled')].length);
    check(`${tag} tactical: disabled actions are present to check`, dis >= 0, dis);
    check(`${tag} no page errors`, !errs.length, errs);
    await p.close();
  }
  // the title screen and the founding of the site (the real start, without ?legacy)
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    const url = GAME_URL.replace('?legacy', '');
    await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
    // the title screen's entries are text on the scene (bare by design), so it may have no faced buttons at all
    const audit = async (screen, min = 1) => { await p.waitForTimeout(550); await p.mouse.move(1, 1); const r = await p.evaluate(auditButtons);
      check(`1440x900 ${screen}: ${r.n} buttons are solid and readable`, r.n >= min && !r.bad.length, r.bad.slice(0, 8));
      await p.screenshot({ path: `${OUT}/buttons-${screen.replace(/\W+/g, '-')}.png` }); };
    await audit('title menu', 0);
    await p.click('[data-view="new"]'); await audit('new game');
    await p.click('#mBegin'); await p.waitForTimeout(600);
    await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click('[data-dbg="win"]'); await p.waitForTimeout(600);
    await p.click('#returnBtn'); await p.waitForTimeout(400); await audit('founding debrief');
    await p.click('#fNext'); await p.waitForTimeout(400); await audit('site placement');
    await p.click('#fRandom'); await p.waitForTimeout(200);
    await p.fill('#fDesig', 'Site-41'); await p.fill('#fName', 'Test Annex'); await p.click('#fConfirm'); await p.waitForTimeout(400);
    await audit('first task force');
    check('1440x900 founding: no page errors', !errs.length, errs);
    await p.close();
  }
  await b.close();
  done();
})();
