// Shared helpers for the browser tests: where the built game is, where screenshots go, and the small
// page helpers every suite uses. Paths are relative to the repository, so the tests run from any checkout.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const GAME_URL = 'file://' + path.join(ROOT, 'dist', 'index.html') + '?legacy';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
/** Dismiss every notice dialog that's showing. */
const close = async p => { while (await p.$('#noticeOk')) await p.click('#noticeOk').catch(() => {}); };
/** Press a button in the debug panel (backtick opens it). */
const dbg = async (p, k) => { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('`'); await p.click(`[data-dbg="${k}"]`); await p.click('[data-dbg="close"]').catch(() => {}); await close(p); };
/** A fresh game in a new page, local storage cleared. */
async function fresh(b, viewport = { width: 1300, height: 1000 }) {
  const p = await b.newPage({ viewport });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
  await p.goto(GAME_URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  return { p, errs, E: (f, a) => p.evaluate(f, a) };
}
function reporter() {
  const results = [];
  return {
    check: (name, ok, detail) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail) : ''}`),
    done() { console.log(results.join('\n')); const ok = results.every(r => r.startsWith('PASS')); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); if (!ok) process.exitCode = 1; },
  };
}
/** Environment-first interface: open an object's panel in the room on screen (its object-bar button). */
const openTarget = async (p, id) => { if (!(await p.$(`.objbar [data-target="${id}"][aria-pressed="true"]`))) await p.click(`.objbar [data-target="${id}"]`); await p.waitForTimeout(80); };
/** An incident's Respond button: in Command's alerts strip, else in the communications console's panel. */
async function planIncident(p, id) {
  if (!(await p.$(`[data-plan="${id}"]`))) await openTarget(p, 'comms');
  await p.click(`[data-plan="${id}"]`);
}
/** Open a tab and go into its room: Command and Research through the department room's entry button, the
 *  quarters through the Site-19 surface (the Barracks and Armory tabs show their own rooms). */
async function openRoomTab(p, t) {
  if (t === 'personnel') { await p.click('[data-tab="site"]'); await p.waitForTimeout(60); await p.click('[data-enter="surface:quarters"]'); await p.waitForTimeout(120); return; }
  await p.click(`[data-tab="${t}"]`); await p.waitForTimeout(60);
  if (t === 'command' || t === 'research') { const b = await p.$('.dept [data-enter]'); if (b) { await b.click(); await p.waitForTimeout(120); } }
}
/** Tactical camera: where a tile's centre is on screen (client px), and a click or hover on that tile sent to the
 *  battlefield canvas itself (the HUD may cover part of the map; the camera conversion is what's under test). */
const tileXY = (p, x, y) => p.evaluate(([x, y]) => window.__site19.tileToScreen(x, y), [x, y]);
async function clickTile(p, x, y) {
  await p.evaluate(([x, y]) => { const [cx, cy] = window.__site19.tileToScreen(x, y), cv = document.querySelector('#cv'), o = { clientX: cx, clientY: cy, bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1 };
    cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o)); cv.dispatchEvent(new MouseEvent('click', o)); }, [x, y]);
}
async function hoverTile(p, x, y) {
  await p.evaluate(([x, y]) => { const [cx, cy] = window.__site19.tileToScreen(x, y); document.querySelector('#cv').dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy, bubbles: true, pointerType: 'mouse', pointerId: 1, buttons: 0 })); }, [x, y]);
}
module.exports = { tileXY, clickTile, hoverTile, ROOT, GAME_URL, OUT, close, dbg, fresh, reporter, openTarget, planIncident, openRoomTab };
