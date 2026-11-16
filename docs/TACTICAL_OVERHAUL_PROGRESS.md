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
| T1.1 | Obstacle model derived from map tiles [2.1] | T0 | Every map converts; walkability unchanged; obstacle kinds tested | [x] |
| T1.2 | One trace for sight and fire [2.2] | T1.1 | Headless trace tests on synthetic grids | [x] |
| T1.3 | Geometric step-out peeking [2.3] | T1.2 | The owner's crate drawings hold without tuning constants | [x] |
| T1.4 | Exposure-based visibility [2.4] | T1.3 | Long hallways visible end to end; partial exposure measured | [x] |
| T1.5 | Line of fire on the same eye points and trace; callers migrated [2.5] | T1.4 | Zero "can see but can't shoot" except through reinforced glass (consistency test); all suites pass | [x] |
| T2.1 | Geometric directional cover and flanking [3.1] | T1.5 | Cover matrix tests; windows, partitions and doors count by height | [x] |
| T2.2 | Pathfinding options instead of global flags; AI uses real move and dash [7.4] | T0 | No `setVault`, `setLinkAccess` or `setSlow`; reach unchanged | [x] |
| T2.3 | Central action table: costs and validity [6.1] | T0 | One place decides action costs; UI, commands and AI agree | [x] |
| T3.1 | Light map [4.1] | T1.1 | Lit corridor at night visible end to end; unlit field not | [x] |
| T3.2 | Perception: unseen, detected, identified [4.2] | T1.5, T3.1 | Distance and light ladder tests; concealment still works | [x] |
| T3.3 | Smoke density [4.4] | T3.2 | Thin smoke reduces detection; thick smoke hides | [x] |
| T4.1 | Weapon range curves [5.1] | T0 | Hit-chance-by-distance table per weapon | [x] |
| T4.2 | Exposure term replaces "partly hidden" [5.2] | T1.4 | Hit-chance tests | [x] |
| T4.3 | Grazes, stray rounds hitting cover [5.3, 5.4] | T1.2 | Seeded statistics | [x] |
| T4.4 | Status registry [5.5] | T0 | Same durations; statuses listed | [x] |
| T4.5 | One reaction system: all sides, perceived movement only [6.2] | T3.2, T2.3 | Reaction matrix tests | [x] |
| T4.6 | XCOM 2 suppression [6.3] | T4.5 | Moving while suppressed draws a shot; ends overwatch | [x] |
| T4.7 | Destructible cover with hit points [7.1] | T1.1, T4.3 | Crate degrades by hits; grenade drops full to half | [x] |
| T5.1 | Utility AI on shared rules [7.3] | T2.1, T2.2, T3.2, T4.5, T4.6 | Seeded AI scenarios: takes cover, flanks, avoids overwatch, grenades clusters | [x] |
| T5.2 | Squad coordination and roles | T5.1 | Suppress-and-advance, sniper positions, objective defence | [x] |
| T6.1 | Presentation hooks: rules can run headless [7.2, partial] | T0 | Combat and enemy turns run with no animation waits in tests | [x] `pace.headless`; sandbox missions |
| T6.2 | Tactical lab screen on production rules [1.1] | T1.5, T2.1 | Build scenarios and inspect sight, peeks, fire, cover, hit chance, AI; save and load | [x] |
| T6.3 | Move preview: shields, flanks, overwatch risk; contact markers; suppression indicators [3.2] | T2.1, T3.2 | Preview equals the dice | [x] |
| T7.1 | Golden scenario suite and consistency test [1.2, 1.3] | T1.5 | Hallway, rooms, diagonals, corners, doors, windows, crates, long range, smoke | [x] headless scenarios in `tests/unit/geom`, `perception` and `combat` tests; lab presets; `consistency.e2e` |
| T7.2 | SCP integration checks | all | 173, 049, 610, 096, 939 suites pass; exceptions documented | [x] `scp.e2e`, `accept4b` |
| T7.3 | Strategic compatibility | all | Deployment, results, saves unchanged | [x] `scp.e2e` (win recorded, reload), save fixtures, accept4c, objecttheft |

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

- **T1 and T2.1 done.** Geometry kernel in `src/core/geom.ts`:
  - **Obstacle model:** shape (full tile or thin centre line), height (low, high, wall), what it stops (sight,
    fire), destructible, glass. Derived from the map characters and the live door and glass state.
  - **One trace:** `trace()` for every line question.
  - **Step-out eye points:** `eyePoints()` gives the unit's own tile plus side tiles where the cover ends.
  - **Body exposure:** `exposure()`, 5 sample points on the target's figure.
  - **Thresholds:** `VIS_MIN = 0.6` (3 of 5 points) and `STEP_OUT = 0.75` (lean depth).
  - **`sight.ts`** keeps its old exports as thin wrappers. `lineOfFire` uses `fireView` (same eyes, same trace).
  - **Cover:** `coverOn()` reads cover off the line of fire, so windows, partitions and doors count by height. Shots
    near a corner count both sides.
  - **Also on the kernel:** hunker uses `coverSides`; noise counts walls with the same trace.
  - **Tests:**
    - `tests/unit/geom.test.ts` (15 tests: hallway, walls, kinds, windows, doorway, corner squeeze, the owner's three
      crate diagrams, step-outs, SCP-173 raw sight, a random-map property test, cover matrix).
    - `tests/consistency.e2e.cjs`: 0 "can see but can't shoot" on town, farm, rail, church and wing C, outside
      reinforced glass. The audit measured 62–104 per map before.
  - **Test fixes:** accept4i and window had expectations from the old 10-ray method or relied on random furniture.
    The window test now asserts the real geometric cone through a one-tile window; furniture is cleared where a test
    needs a fixed line.
- **D3 (T1):**
  - Visibility is "enough of the target's body (3 of 5 points) is in view from the best eye point". The eye points
    are the tile centre, or a lean of 0.75 tiles toward a step-out side.
  - These two constants alone reproduce the owner's approved crate diagrams:
    - one crate leaves a 3-tile wedge;
    - three crates seen from the middle leave a large blind area;
    - three crates seen from the end leave about 100° open to that side.
  - The old per-case filter `LEAN_SIGHT` is gone.
- **D4 (T1):** Sight is not forced to be symmetric (owner's instruction). A unit stepping out past cover can see a
  target that can't see it back. Measured asymmetry is reported by the consistency test.

- **T2.2 done.**
  - `bfs` takes a `PathOpts` (vault, links, slow); `setVault`, `setLinkAccess` and `setSlow` are gone.
  - `src/game/movement.ts` holds `moveOf`, `moveCost`, `pathOpts`, `blockerFor` and `reachOf`. Units of the same side
    pass through each other; nobody ends on an occupied tile or a desk.
  - The player's reach uses it. The enemy AI moves onto it in T5, which replaces its fixed 5-tile planning.
- **T2.3 done.** `src/game/actions.ts` decides costs and checks: `fireCheck`, `payFire` (SMG 1 action, marksman 2,
  Double tap), `reloadCheck`/`payReload`, `overwatchCheck`/`payOverwatch`, `payItem`, `payAbility`, `payMove`. The
  player's commands, the overwatch button and abilities use it; the AI moves onto it in T5. Unit tests in
  `tests/unit/actions.test.ts`.

- **T3 done.** `src/game/perception.ts`:
  - **Light map:** day or moonlight outdoors; building lights indoors (out while another site's power is down);
    flares, fires and muzzle flashes add light. "Outdoors" is decided by area name.
  - **Perception states:** unseen, detected (a shape) or identified. Inputs are distance against detect and identify
    ranges set by light (`8 + 52 × light`, `3 + 33 × light`), weather on outdoor lines, partial exposure, thin smoke,
    movement or firing (easier to detect), still in cover (harder), Keen eyes and research. Within 2 tiles, anyone in
    view is identified.
  - **Gameplay wiring:** `canSee` means "at least detected". It drives the fog of war, SCP-173 watching, the AI's
    knowledge and staring moves. `lineOfFire` needs the target detected. `S.perceived` holds the team's best level
    per unit.
  - **UI:** unknown contacts are drawn as `?` silhouettes; the hover panel says "Unknown contact". They can be fired on
    at −10 (Unidentified target), whatever they are.
  - **Smoke** is thick on its first turn (blocks sight) and a thin haze on its last (×0.6 to perception per tile).
  - **Texts:** night and weather descriptions and the help panel are updated.
  - **Tests:** `tests/unit/perception.test.ts` (lit corridor at night end to end, dark field, flare, fog
    outdoors-only, movement, power loss, haze).
- **Spawns:** the spawn rule now checks sight from the whole deployment area and places Insurgents on tiles in their
  room the team can't see (the farm's open fields made every room visible). Spawns pass 0 bad of 90 starts.
- **D5 (T3):** firing at an unknown contact is allowed at −10, and it might be a civilian or a D-Class. This was
  proposed to the owner earlier and not yet answered; it is a one-line change to remove (`fireAt` in `turn.ts`).

- **T4 done.**
  - **Range curves** (`RANGE_CURVES`, `rangeAim`) per weapon class, interpolated: shotgun and SMG close, marksman
    far, rifle and carbine middle, MG steady.
  - **Damage falloff:** shotguns past 6 tiles, SMGs past 9.
  - **Exposure:** the "Leaning out −15" is gone (XCOM doesn't penalise stepping out). "Partly hidden" scales with
    exposure and applies only without cover.
  - **Grazes:** a miss within 10 points grazes for half damage.
  - **Cover hit points** (`damageCover`): misses caught by cover chip it; a crate takes 6 to drop to half cover, half
    cover 3 to go. Grenades drop full cover to half; rockets clear it.
  - **Status registry** (`src/game/status.ts`).
  - **One reaction system** (`reactTo` in `combat.ts`): anyone on overwatch fires at the first hostile movement they
    can make out and shoot. That means team on Insurgents, SCP-049-2, other hostile instances and fighting SCP-682;
    Insurgents (any role) on the team.
  - **XCOM 2 suppression:** pinned through the target's next turn, −30, no overwatch. Moving draws the suppressor's
    shot. It ends when the suppressor moves and costs 2 rounds.
- **D6 (T4) XCOM mutual peeking:**
  - A person standing by cover also shows themselves at its step-outs (`bestView` `targetPeeks`), so a soldier
    behind a crate can be seen and shot from in front at −40.
  - Without this, full cover was invisibility from the front.
  - Tiles and open ground are unaffected, so the crate diagrams still hold. Anomalies, objects and the downed don't
    peek. The spawn rule accounts for it.
- **Sandbox missions** (`src/game/sandbox.ts`): a real mission state from a drawn map and a unit list, used by the
  headless tests (`tests/unit/combat.test.ts`, 12 tests) and by the lab (T6.2).

- **T5 done.** `src/game/ai.ts` is a utility AI on the shared rules.
  - **Position scoring:** each Insurgent scores every tile within its real move (or dash) using the real rules
    (`shotInfo`, `canShoot`, `coverOn`, perception) with itself placed there. The score weighs offense (expected
    damage), risk (expected hits from team members who could shoot that spot), cover against remembered threats,
    flanking the pod's focus, the role's preferred range, clumping, overwatch lanes, staying clear of SCP-173, and the
    mission goal. Weights live in `AI_WEIGHTS` and `ROLE_RANGE`.
  - **Action choice:** reload (moving first if badly exposed), grenade a cluster (one frag per fire team), suppress
    if the pod assigned it, shoot if the shot is good (or move first for a much better one), move, dash when nothing
    is known, overwatch, hunker. Suppressed units don't move.
  - **Pod coordinator** (`planPod`): the focus is the best-covered visible team member; a machine gunner or officer
    suppresses it; the others flank.
  - **Knowledge:** threats are only what Insurgents have made out: seen now, remembered for 2 turns, or heard.
  - **Shared code:** grenades use the shared `blast()` in `src/game/explosive.ts`; suppression uses the shared
    `suppress()`. Scamper on alert uses the same scoring.
  - **Kept:** the mission-goal branches (lift, containment control, truck, GOC and GRU-P).
  - **Tests:**
    - `tests/unit/ai.test.ts` (5 seeded scenarios: takes cover or a flank, suppress and flank, grenades a pair, avoids
      an overwatch lane, knows only what it has made out).
    - `tests/ai.e2e.cjs` (real maps: 100% of Insurgents in contact ended in cover or on a flank in the test run;
      enemy turns about 0.1 s).

- **T6.2 done: the tactical lab** (`src/ui/lab.ts`).
  - **Opening it:** from the debug panel (backtick, then "Open the tactical lab") or `index.html#lab`.
  - **How it runs:** a sandbox mission inside the real mission screen, so moving, shooting, abilities and end turn
    all work by the normal rules ("Play" tool).
  - **Tools:** paint walls, floor, half and full cover, drums, windows (ordinary or reinforced; click again to
    break), partitions, doors (click to cycle open, closed, locked, destroyed), smoke, flares, fire; place
    operatives, Insurgents, civilians and hostile instances with a chosen weapon; remove units; move a unit freely;
    pick the viewer. Night, power-out and weather switches.
  - **Overlays:** the viewer's perception per tile (green identified, amber detected), step-out eye points and the
    line to the hovered tile with every obstacle it crosses (green fire, amber sight only, red none), cover shields on
    every unit, overwatch lanes, the light map, reach, and the AI's position scores for an Insurgent viewer.
  - **Inspection panel:** the hovered tile's obstacle, light, perception (level, distances, reasons), and for a unit
    the full shot breakdown from `shotInfo`.
  - **Buttons:** refill, overwatch, fire, suppress, AI turn, end turn.
  - **Scenarios:** seven presets (open room, long hallway, the owner's crates, doorway and corners, windows and a
    partition, night field, dug-in operative against a pod); save to the browser; export and import JSON.
  - **Tested by** `tests/lab.e2e.cjs`.
- **T6.3 done.** `src/game/preview.ts` (`movePreview`) is the move cursor's source:
  - Insurgents who could shoot the unit at the destination, and which of them flank it.
  - Cover on each side from the kernel (windows, partitions and doors included).
  - The first tile on the path where an Insurgent on overwatch would fire ("OVERWATCH").
  - Also new: a "SUPPRESSED: MOVING DRAWS FIRE" warning, a SUPPRESSED tag on units, and "NO LINE OF FIRE" with the
    blocked line when hovering an enemy that can be seen but not shot.
  - Unknown contacts (T3) are drawn as `?`.
  - `tests/unit/preview.test.ts` checks the preview against the rules, including that a flagged overwatch lane really
    draws the shot.

- **T7.2 and T7.3 done.** `tests/scp.e2e.cjs` runs real missions:
  - SCP-173 stays frozen while watched and moves when nobody can see it;
  - SCP-049 raises a fresh body;
  - SCP-106 sinks when hit;
  - SCP-610's flesh spreads;
  - a won strike is recorded in the campaign with XP, and the campaign reloads with its random stream.
  
  Together with accept4b (096, 012, 939, 035, 682), accept4c (GOC, GRU-P, convoy, generated towns), objecttheft,
  floors, raidarrival and the save fixtures, every anomaly and the main strategic hand-offs are covered.

## Anomaly exceptions to the standard rules (explicit, and tested)

- **SCP-173 doesn't step out to look** (`rawSight`). It stays frozen when anyone can at least make it out (detected).
  So in the dark beyond the detection range it moves, which is the intended horror.
- **SCP-939** is hidden beyond 5 tiles unless lit by a flare (`hidden939`). This stays a special rule on top of
  perception.
- **Anomalies, objects and the downed don't peek** (they don't show themselves at step-outs).
- **What overwatch reacts to:** the team reacts to Insurgents, hostile instances (SCP-049-2, SCP-610 instances,
  rioters) and a fighting SCP-682; Insurgents react to the team.

## Unresolved issues and known limitations

- **J8 elevation:** not built (the last 4J phase, and Phase 5's prerequisite).
- **Rules and presentation are only partly separated.** Rules can run headless (`pace.headless`, sandbox missions),
  but `fire()`, `moveUnit()` and the anomaly phases still call `fx`, `log` and `sleep` directly. The full split
  (rules emit events; the UI plays them) is roadmap task 7.2.
- **Mid-mission save** (roadmap 0.3) and **save migration fixtures for versions before 24** (0.4) were not part of this
  assignment. The v24 fixtures and round-trip tests are.
- **Attribution** for SCP-005, 012, 035, 096, 500, 682, 914 and 939 (roadmap 0.5) is still missing. The author names
  need checking on the SCP Wiki, which this session can't reach.
- **Fallbacks:** `setup.scp ?? "173"` remains in `mission.ts` (roadmap 0.6).
- **Stray rounds** hit cover (and wear it) but never other units in the line.
- **Balance is untested by play.** The AI weights, range curves, light and perception numbers and grazes are
  reasoned and tested for behaviour, not tuned against real campaigns.
- **Firing at unknown contacts** (−10, might be a civilian) is a proposal the owner hasn't confirmed (D5).
- **Rare flakes in the e2e suites**, all pre-existing in kind and caused by random placement: accept4b (096 and 035
  setups) and accept4c (a GRU-P carrier stall). Not reproduced in the last runs.

## Remaining checklist (next session)

1. J8 elevation: per-tile height on maps that have roofs, catwalks or truck beds; height advantage; low cover not
   protecting from above.
2. Rules and presentation split (roadmap 7.2): move `fx`, `log` and `sleep` out of `fire`, `moveUnit` and the anomaly
   phases into an event queue the UI plays.
3. Phase 0 leftovers: mid-mission save (0.3), older save fixtures (0.4), attribution (0.5), no SCP-173 fallback
   (0.6).
4. Data-driven anomalies and missions (roadmap 8.1, 8.2), before 4H.
5. Playtest and tune: AI weights (`AI_WEIGHTS`, `ROLE_RANGE`), range curves (`RANGE_CURVES`), perception
   (`detectBase`, `identifyBase`, `LIGHT`, `WEATHER_CLARITY`), visibility thresholds (`VIS_MIN`, `STEP_OUT`).
6. Then 4H (combat variety and progression) on the new foundation, and 4D.
