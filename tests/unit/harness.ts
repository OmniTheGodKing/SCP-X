// A tiny test harness for headless rule tests: `test(name, fn)` registers a test, `run()` executes them all.
// Bundled with esbuild and run in Node by tests/run.cjs; no browser needed.
type Fn = () => void | Promise<void>;
const tests: { name: string; fn: Fn }[] = [];
export function test(name: string, fn: Fn) { tests.push({ name, fn }); }
export class Fail extends Error {}
export function eq<T>(actual: T, expected: T, what = "value") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Fail(`${what}: expected ${e}, got ${a}`);
}
export function ok(cond: unknown, what = "condition") { if (!cond) throw new Fail(`${what} was false`); }
export function near(actual: number, expected: number, tol: number, what = "value") {
  if (Math.abs(actual - expected) > tol) throw new Fail(`${what}: expected ${expected}±${tol}, got ${actual}`);
}
export async function run() {
  let failed = 0;
  for (const t of tests) {
    try { await t.fn(); console.log(`PASS ${t.name}`); }
    catch (e) { failed++; console.log(`FAIL ${t.name} :: ${(e as Error).message}`); }
  }
  console.log(failed ? `SOME FAILED (${failed} of ${tests.length})` : `ALL PASS (${tests.length})`);
  if (failed) process.exitCode = 1;
}
