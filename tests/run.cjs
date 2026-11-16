// Runs every test: the headless rule tests (bundled with esbuild, run in Node) and the browser suites
// (Playwright, against the built game in dist/). Usage:
//   npm run build && npm test            everything
//   node tests/run.cjs unit              only the headless rule tests
//   node tests/run.cjs e2e [name ...]    only the browser suites (optionally some of them)
// A suite fails if it exits non-zero or prints a line starting with FAIL.
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const [mode, ...only] = process.argv.slice(2);
const results = [];

function runSuite(name, cmd, args) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const fails = out.split('\n').filter(l => /^FAIL\b/.test(l));
  const ok = r.status === 0 && !fails.length;
  results.push({ name, ok, secs: ((Date.now() - t0) / 1000).toFixed(1), fails, tail: ok ? '' : out.split('\n').slice(-15).join('\n') });
  const summary = out.split('\n').filter(l => /^(ALL PASS|SOME FAILED)/.test(l)).pop() || '';
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${results.at(-1).secs}s) ${summary}`);
  for (const f of fails) console.log('     ' + f.slice(0, 300));
  if (!ok && !fails.length) console.log(results.at(-1).tail);
}

if (!mode || mode === 'unit') {
  const esbuild = require(path.join(ROOT, 'node_modules', 'esbuild'));
  const files = fs.readdirSync(path.join(__dirname, 'unit')).filter(f => f.endsWith('.test.ts')).filter(f => !only.length || only.some(o => f.includes(o)));
  const entry = path.join(OUT, 'unit-entry.ts');
  fs.writeFileSync(entry, files.map(f => `import ${JSON.stringify(path.join(__dirname, 'unit', f))};`).join('\n') + `\nimport { run } from ${JSON.stringify(path.join(__dirname, 'unit', 'harness'))};\nrun();\n`);
  esbuild.buildSync({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(OUT, 'unit.cjs'), logLevel: 'error', target: 'node20' });
  runSuite('unit', process.execPath, [path.join(OUT, 'unit.cjs')]);
}
if (!mode || mode === 'e2e') {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) { console.log('dist/index.html is missing: run npm run build first'); process.exit(1); }
  const suites = fs.readdirSync(__dirname).filter(f => f.endsWith('.e2e.cjs')).filter(f => !only.length || only.some(o => f.includes(o))).sort();
  for (const s of suites) runSuite(s, process.execPath, [path.join(__dirname, s)]);
}
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length} of ${results.length} suites passed.${bad.length ? ' Failed: ' + bad.map(r => r.name).join(', ') : ''}`);
process.exitCode = bad.length ? 1 : 0;
