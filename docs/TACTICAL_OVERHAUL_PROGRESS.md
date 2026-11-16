# Tactical Overhaul: Progress

The working record for the XCOM-style tactical overhaul. It follows `SCP_X_XCOM_IMPROVEMENT_ROADMAP.md` (task numbers in
brackets), `SCP_X_COMPREHENSIVE_AUDIT.md` and the 4J plan in `docs/ROADMAP.md`. It is kept up to date as work lands,
so a later session can resume from it.

**Rules for this work:**
- Commit locally at tested checkpoints.
- Don't push or publish without the owner's permission.
- Never mark anything done that isn't done and tested.

**Baseline:** commit `dfa2691`. All 10 browser suites passed before any change.

## How to run the tests

```sh
npm run build && npm test     # everything
npm run test:unit             # headless rule tests only (Node, no browser)
npm run test:e2e              # browser suites only
node tests/run.cjs e2e accept4c   # one suite
```

- **Browser suites:** these use Playwright, resolved from the machine's global install (it's preinstalled in this
  environment). It isn't a project dependency; adding it would need the owner's approval.
- **Headless tests:** these live in `tests/unit/*.test.ts`. They're bundled with the esbuild that ships with Vite and
  run in Node.

## Tasks, dependencies, acceptance criteria

Status: `[x]` done and tested, `[~]` partly done (see notes), `[ ]` not started.

| # | Task | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|
| T0.1 | Portable test runner, `npm test`, shared test helpers, no absolute paths [0.1] | none | `npm test` runs every suite from any checkout; failures are reported and exit non-zero | [x] |
| T0.2 | Headless unit harness | T0.1 | `tests/unit/*.test.ts` run in Node | [x] |
| T0.3 | Seeded gameplay randomness with campaign and mission streams; cosmetic randomness separate [0.2] | none | No `Math.random` in `src/game`, `src/campaign`, `src/data` or `src/core` except `rng.ts` (unit-tested); same seed gives same rolls; old saves get a seed | [x] |
| T0.4 | Save fixtures and compatibility tests [0.4] | T0.2 | v24 fixtures captured from the pre-overhaul build load and round-trip | [x] |
| T1.1 | Obstacle model derived from map tiles [2.1] | T0 | Every map converts; walkability unchanged; obstacle kinds tested | [ ] |
| T1.2 | One trace for sight and fire [2.2] | T1.1 | Headless trace tests on synthetic grids | [ ] |
| T1.3 | Geometric step-out peeking [2.3] | T1.2 | The owner's crate drawings hold without tuning constants | [ ] |
| T1.4 | Exposure-based visibility [2.4] | T1.3 | Long hallways visible end to end; partial exposure measured | [ ] |
| T1.5 | Line of fire on the same eye points and trace; callers migrated [2.5] | T1.4 | Zero "can see but can't shoot" except through reinforced glass (consistency test); all suites pass | [ ] |
| T2.1 | Geometric directional cover and flanking [3.1] | T1.5 | Cover matrix tests; windows, partitions and doors count by height | [ ] |
| T2.2 | Pathfinding options instead of global flags; AI uses real move and dash [7.4] | T0 | No `setVault`, `setLinkAccess` or `setSlow`; reach unchanged | [ ] |
| T2.3 | Central action table: costs and validity [6.1] | T0 | One place decides action costs; UI, commands and AI agree | [ ] |
| T3.1 | Light map [4.1] | T1.1 | Lit corridor at night visible end to end; unlit field not | [ ] |
| T3.2 | Perception: unseen, detected, identified [4.2] | T1.5, T3.1 | Distance and light ladder tests; concealment still works | [ ] |
| T3.3 | Smoke density [4.4] | T3.2 | Thin smoke reduces detection; thick smoke hides | [ ] |
| T4.1 | Weapon range curves [5.1] | T0 | Hit-chance-by-distance table per weapon | [ ] |
| T4.2 | Exposure term replaces "partly hidden" [5.2] | T1.4 | Hit-chance tests | [ ] |
| T4.3 | Grazes, stray rounds hitting cover [5.3, 5.4] | T1.2 | Seeded statistics | [ ] |
| T4.4 | Status registry [5.5] | T0 | Same durations; statuses listed | [ ] |
| T4.5 | One reaction system: all sides, perceived movement only [6.2] | T3.2, T2.3 | Reaction matrix tests | [ ] |
| T4.6 | XCOM 2 suppression [6.3] | T4.5 | Moving while suppressed draws a shot; ends overwatch | [ ] |
| T4.7 | Destructible cover with hit points [7.1] | T1.1, T4.3 | Crate degrades by hits; grenade drops full to half | [ ] |
| T5.1 | Utility AI on shared rules [7.3] | T2.1, T2.2, T3.2, T4.5, T4.6 | Seeded AI scenarios: takes cover, flanks, avoids overwatch, grenades clusters | [ ] |
| T5.2 | Squad coordination and roles | T5.1 | Suppress-and-advance, sniper positions, objective defence | [ ] |
| T6.1 | Presentation hooks: rules can run headless [7.2, partial] | T0 | Combat and enemy turns run with no animation waits in tests | [ ] |
| T6.2 | Tactical lab screen on production rules [1.1] | T1.5, T2.1 | Build scenarios and inspect sight, peeks, fire, cover, hit chance, AI; save and load | [ ] |
| T6.3 | Move preview: shields, flanks, overwatch risk; contact markers; suppression indicators [3.2] | T2.1, T3.2 | Preview equals the dice | [ ] |
| T7.1 | Golden scenario suite and consistency test [1.2, 1.3] | T1.5 | Hallway, rooms, diagonals, corners, doors, windows, crates, long range, smoke | [ ] |
| T7.2 | SCP integration checks | all | 173, 049, 610, 096, 939 suites pass; exceptions documented | [ ] |
| T7.3 | Strategic compatibility | all | Deployment, results, saves unchanged | [ ] |

## Architectural decisions

- **D1 (T0.3) Two random streams.** The campaign has one stream (saved as `Campaign.rng`) and each mission has one
  (seeded from `MissionSetup.seed`). One active stream at a time; `beginMission` and `endMission` switch it.
  Cosmetic randomness uses `fxRnd()`, or `Math.random` in `src/ui`. The save version stays 24 because `rng` is
  optional, so builds from before the overhaul can still read new saves.
- **D2 (T0.3) Forced rolls.** Tests and the debug panel force rolls with `forceRng(v)` (exposed as
  `window.__site19.rng.force`) instead of replacing `Math.random`, which no longer drives gameplay.

## Log

- T0 done. Files:
  - `src/core/rng.ts`
  - every `Math.random` in game, campaign, data and core replaced
  - `tests/lib.cjs`, `tests/run.cjs`, `tests/unit/*`
  - `tests/fixtures/save-v24-*.json`
  - the absolute paths removed from every suite
  - two flaky test setups fixed (accept4b forced rolls, the accept4c convoy raider pinned in a corner)
- Known flaky (pre-existing, not reproduced in 4 runs after T0): accept4c "GRU-P left alone, they carry it off" can
  stall the carriers.

## Unresolved issues

- (none yet)
