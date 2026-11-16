# SCP-X: Comprehensive Audit and XCOM Comparison

Audit date: 16 November 2026. Commit audited: `main` at the time of writing (after the object-theft fix and the 4J
plan in `docs/ROADMAP.md`). No gameplay code was changed for this audit.

## 0. How this audit was done, and its limits

**Evidence used, and how it is labelled:**
- **Confirmed (code):** read in the source. File and function are cited.
- **Confirmed (measured):** reproduced by running the built game in headless Chromium through the test handle
  `window.__site19`. Probe scripts are listed in section 9.
- **Suspected:** follows from the code, but was not reproduced.
- **Untested:** nothing in the repository checks it, and I did not play it through.

**Tests run (all in this session, against a fresh `npm run build`):** every suite in `tests/`. All 10 passed:

- `accept4b`
- `accept4c`
- `accept4g`
- `accept4i`
- `combat`
- `floors`
- `objecttheft`
- `raidarrival`
- `spawns`
- `window`

Earlier in this session, two `accept4b` setups (SCP-096, SCP-035) failed on some runs with or without code changes.
They are flaky tests, not fixed bugs.

**Not done:** I did not play a full campaign. Every statement about strategic pacing, balance or fun is a reading of the
rules and numbers, not of play, and is marked as such.

**References:**
- **OpenXcom** (`src/Battlescape`, GPL-3.0): read `TileEngine.h/.cpp` (`visible`, `calculateFOV`, `canTargetUnit`,
  `checkVoxelExposure`, reaction fire) and skimmed `AIModule`.
- **OpenApoc** (GPL-3.0): read the structure of `game/state/tilemap` (collision, separate line-of-fire and
  line-of-sight voxel maps per map part) and `game/state/battle/ai` (layered unit AI with decision objects).
- **Godot Tactical-RPG** (vogitcode, no license file): read the README architecture and `GridLogic.has_line_of_sight`.
- **godot-trpg** (kabuumu, no license file): read `COMBAT_SYSTEM.md`. It is a melee, initiative-order prototype with
  little that applies here.
- **Tactical Revolt** (studied for the earlier 4J plan, no license file): read its cover raycast and AI action
  scoring.
- **Red Blob Games visibility article:** could not be fetched. The host is blocked by this session's network policy.
  Where it is mentioned, it is from prior knowledge of the article (angle-sweep visibility polygons over wall
  segments), and labelled so.
- **XCOM: Enemy Unknown, Enemy Within and XCOM 2** are described from general knowledge of the games, without exact
  numbers where I am not certain of them.

**Licenses:** OpenXcom and OpenApoc are GPL-3.0. SCP-X is CC BY-SA 3.0, which is not GPL-compatible, so no code from
either can be copied. The two Godot projects and Tactical Revolt publish no license, so they are all rights reserved
by default. Only ideas and algorithms (which are not copyrightable) can be taken from any of them.

---

## 1. What the game is

**Engine and stack:**
- TypeScript 5.6 with Vite 5, and `vite-plugin-singlefile` to bundle everything into one HTML page.
- No game engine. Rendering is hand-written Canvas 2D (`src/ui/render.ts`, `tiles.ts`, `sprites.ts`, `fxdraw.ts`) and
  HTML/CSS screens (`hubView.ts`, `missionView.ts`). Audio is the Web Audio API (`audio.ts`).
- Saves go to browser `localStorage`. There is no server.
- The only dependencies are dev dependencies (`typescript`, `vite`, `vite-plugin-singlefile`).

**Size:** about 17,200 lines of TypeScript.

| Folder | Lines | Contents |
|---|---|---|
| `src/campaign` | about 6,700 | Strategy layer |
| `src/game` | about 4,000 | Tactical rules |
| `src/ui` | about 5,200 | Rendering and screens |
| `src/data` | about 1,900 | Maps, weapons, classes, regions |
| `src/core` | 383 | Grid and sight |

**Architecture:**
- **Two global singletons:** `S` (the mission state, `src/game/state.ts`) and `L` (the current map, `src/core/grid.ts`).
  Tactical modules read and write them directly.
- **The campaign** is one large `Campaign` object, mutated by `tick*` functions called from `advanceDay`
  (`src/campaign/campaign.ts:466`).
- **Strategy → tactics:** `buildSetup` (`campaign.ts:737`) produces a `MissionSetup`.
- **Tactics → strategy:** `missionResult` in `src/game/mission.ts` produces a `MissionResult`, which `applyResult`
  (`campaign.ts:837`) applies.
- **The bridge is clean in shape** (two plain data objects) and is the healthiest boundary in the codebase.
- **Inside the tactical layer** there is no separation between rules, AI, presentation and timing. Rules functions
  call `log`, `fx`, `sleep` and `hooks.update` directly (for example `fire` in `combat.ts:123` mixes the dice, damage,
  noise, animation timing and log text).

**Implemented, partially implemented, missing (summary):**

| Area | State |
|---|---|
| Tactical grid, movement, two actions, dash | Implemented, tested indirectly |
| Line of sight (rays, thin walls, leaning) | Implemented, partly tested, internally inconsistent (section 2.5) |
| Detection and identification | Missing (sight is one bit) |
| Lighting | Missing (night is a flat range cap; flares are a special case) |
| Cover, flanking | Implemented as a neighbour-cone test, not geometric; no direct tests |
| Hit chance, crits, armor | Implemented; the dice are untested |
| Overwatch | Implemented for the team; for the enemy only snipers use it |
| Suppression | Partial (an aim debuff only) |
| Destructible environment | Partial (explosions only; gunfire breaks glass) |
| Elevation | Missing (multi-floor maps are flat grids joined by links) |
| Enemy AI | Implemented, heuristic, with no threat or exposure model |
| Anomaly mechanics (13 SCPs) | Implemented, distinct, acceptance-tested for the 4B set |
| Strategy layer (base, research, workshop, staff, council, world, Insurgency, task forces, contracts, leads) | Implemented, broad; balance untested |
| Campaign ending / victory | Missing (4D) |
| Mid-mission save | Missing: closing the page mid-mission counts as a lost mission |
| Automated tests | 10 browser suites in the repo; 118 more scripts exist only in this session's scratch folder |

**Can it support much deeper gameplay without major architectural changes?**
- **Strategy layer:** mostly yes.
- **Tactical layer:** not without one structural change. A single geometry and rules kernel has to sit between the
  map and every system that asks "can A see, hit or reach B". Most of the rest (actions, abilities, missions, SCP
  rules) can stay, if they move onto that kernel.

---

## 2. Tactical combat

Each system has eleven fields:
1. Current implementation
2. Files and functions
3. What works
4. What does not work
5. Missing features
6. Comparison to XCOM
7. Reference implementations
8. Recommendations
9. Dependencies
10. Priority and complexity
11. Tests needed

### 2.1 Map representation and structure

1. **Current implementation:**
   - Each map is an array of strings, and each character becomes one tile kind: wall, floor, half cover, full cover,
     steel, drum, window, partition, container, exit.
   - Doors and glass live in side tables with a state.
   - `L.version` increments whenever structure changes, which invalidates the sight caches.
   - Multi-floor maps stack their floors in one grid, joined by link tiles.
2. **Files:** `src/core/grid.ts` (`Level`, `opaque:116`, `stopsShot:118`, `blastStructure:134`) and
   `src/data/maps.ts`.
3. **What works:** simple and fast. Doors and windows have state, and the version counter is a sound invalidation
   mechanism. Map mirroring and the random town generator (`towngen.ts`) both work (50 of 50 generated towns validated in
   `accept4c`).
4. **What does not work:**
   - A tile is either a full block or nothing. There are no edges, heights, materials or hit points.
   - Thin walls are inferred after the fact (`thin()`, `sight.ts:20`) from the pattern of neighbouring tiles. Whether a
     wall is thin therefore depends on what is next to it, so a corner, a T-junction or a wall end behave differently
     with no visible cue.
   - Half cover is "not opaque". It is never part of a shot's geometry, only of the neighbour check in 2.7.
5. **Missing:**
   - Obstacle height (low, high, structural).
   - Separate sight and fire shapes. OpenApoc gives every map part both a line-of-sight shape and a line-of-fire
     shape.
   - Cover hit points.
   - Per-tile elevation.
6. **XCOM:**
   - XCOM's map pieces have a cover type (none, low, high) and sit on tile edges or fill tiles, and their destruction
     changes cover.
   - Classic X-COM goes further, with a voxel model per tile part (OpenXcom's `calculateLine` traces 16×16×24 voxels per
     tile).
7. **References:**
   - OpenApoc `battlemapparttype.h` (`voxelMapLOF`, `voxelMapLOS`) and `tilemap.cpp` `findCollision(start, end, …,
     useLOS)`: one collision routine, with two shapes per object.
   - OpenXcom `TileEngine::calculateLine`.
   - Godot Tactical-RPG `BaseTile` gives each tile type `blocks_los` and a movement cost. That is simpler, but it is
     declared per type rather than inferred.
8. **Recommendation:**
   - Introduce an obstacle model derived from the existing map characters, so no map has to be rewritten. Each tile
     yields zero or more obstacles, each with:
     - a shape (full tile, or a thin segment on a centre line)
     - a height (low, high, wall)
     - flags (blocks sight, blocks fire, destructible with HP)
   - Thin-wall detection becomes a one-time conversion step with tests, not a runtime guess.
9. **Dependencies:** everything in 2.4 to 2.13 reads this.
10. **Priority:** Critical. Medium complexity.
11. **Tests:** conversion golden tests for every map (obstacle counts and kinds per tile); a round-trip check that
    every existing map converts without changing what can be walked.

### 2.2 Movement and pathfinding

1. **Current implementation:**
   - 8-way breadth-first search with a no-corner-cutting rule (`canStep`), plus a scan-based Dijkstra when slow tiles
     exist.
   - Link tiles act as one step.
   - The move is 5 tiles per action for operatives (`PROFILE.mtf.move`), adjusted by weapon type, perks, carrying and
     snow. A move within `moveOf` costs 1 action and beyond it 2 (a dash).
2. **Files:** `grid.ts` `bfs:166`, `pathTo:207`, `canStep:153`; `turn.ts` `reachFor:30`, `moveOf`, `moveCost`.
3. **What works:** correct reach and path for the team. Blue and amber reach is shown. Team members can pass through
   each other but not stop on each other.
4. **What does not work:**
   - **Fragile flags:** module-level flags `setVault`, `setLinkAccess` and `setSlow` change how `bfs` behaves globally.
     They must be set and reset around every call (`reachFor` does this, the AI does not). Confirmed (code): enemy AI
     calls `bfs` without setting them, so whatever was last set applies. This is safe today only because `reachFor`
     resets them at the end.
   - **Hardcoded enemy reach:** the AI plans within a fixed 5 steps (`insurgency.ts:149`, `bestSpot` calls
     `bfs(…, 5)`) and the GOC/GRU move slices `path.slice(0, 5)`. Neither uses `moveOf`.
   - **Diagonal cost:** a diagonal step costs the same as a straight one. That matches XCOM 2 but makes diagonals
     strictly better on large open maps.
5. **Missing:** a path preview showing what each step risks (overwatch, revealing yourself); the enemy dashing;
   movement-triggered events in one place.
6. **XCOM:** XCOM 2 uses the same move/dash split. Classic X-COM uses time units per step and per turn.
7. **References:** OpenXcom `Pathfinding.cpp`; Godot Tactical-RPG `GridLogic` (stateless BFS and A* that read the grid
   data without side effects); OpenApoc `tilemap/pathfinding.cpp`.
8. **Recommendation:** make `bfs` take an options object instead of global flags. Use `moveOf` for every side. Keep the
   algorithm.
9. **Dependencies:** AI (2.13), overwatch (2.10).
10. **Priority:** High (the global flags are a latent bug source). Low complexity.
11. **Tests:** reach sets per unit type and condition; an AI move-range test.

### 2.3 Turn order and action economy

1. **Current implementation:**
   - Side-by-side turns. The player moves all units, then the anomaly phase, enemy phase, subjects phase and so on
     (`endTurn`, `turn.ts:586`; `anomalyPhase:630`).
   - Each unit has 2 actions. Firing usually ends the turn (SMGs fire for 1 action; marksman rifles need 2).
   - Abilities declare whether they end the turn.
2. **Files:** `turn.ts`, `abilities.ts`.
3. **What works:** recognisably XCOM 2. Free actions exist, as do run-and-gun and double tap.
4. **What does not work:** action costs are written into each command handler (`sel.ap = 0`, `ap -= 1` in many
   places in `turn.ts`) rather than declared per action, so it is hard to see or test the economy as a whole.
   Confirmed (code).
5. **Missing:** a declared cost table; "move then shoot" previews; enemy use of free actions.
6. **XCOM:** consistent with XCOM 2's two-action model.
7. **References:** Tactical Revolt `BaseAction` (each action declares its cost and validity); Godot Tactical-RPG action
   facades.
8. **Recommendation:** one action table (cost, ends turn, target type, validity check, AI value) shared by the UI, the
   rules and the AI. Most of this already exists in `abilities.ts` for abilities. Extend it to move, shoot, reload,
   overwatch and hunker.
9. **Dependencies:** AI (2.13), testing (section 7).
10. **Priority:** Medium. Medium complexity.
11. **Tests:** per action: cost, whether it ends the turn, and the conditions under which it is refused.

### 2.4 Facing and directional vision

1. **Current implementation:**
   - Units have a facing, set by moving, firing, hearing or the Face button.
   - Vision is all-round. Facing only gives −10 to a reaction shot more than 90° off, and drives glances after
     noises.
2. **Files:** `noise.ts` (`faceThreat:94`, `settleFacing:102`); `combat.ts` `shotInfo`.
3. **What works:** readable, and a deliberate design decision recorded in the roadmap (4I).
4. **What does not work:** nothing broken. Facing carries little gameplay weight.
5. **Missing:** nothing required.
6. **XCOM:**
   - **Classic X-COM:** a 90° vision cone. Confirmed (code): OpenXcom `TileEngine::calculateFOV` builds the field of
     view from the unit's direction.
   - **Modern XCOM:** 360° vision.
   - SCP-X follows modern XCOM, which is the right default.
7. **References:** OpenXcom `calculateFOV`.
8. **Recommendation:** keep it. Optionally let perception (2.6) be slightly better in the facing direction (a
   detection bonus, not a cone).
9. **Dependencies:** perception.
10. **Priority:** Low. Low complexity.
11. **Tests:** existing `accept4i` test 7 (an enemy behind is still seen).

### 2.5 Geometric line of sight (long range, doorways, corners, peeking, partial visibility)

1. **Current implementation:**
   - `walk()` (`sight.ts:38`) is an exact grid DDA from point to point with corner and thin-wall rules.
   - **Visibility test:** `visFrac` (`sight.ts:91`) counts how many of 10 rays (centre to centre and the four inset
     corners, both ways) are clear. A tile is visible at 3 or more.
   - **Peeking:** `viewSpots` (`sight.ts:127`) adds side tiles as extra eye points, filtered by rules about adjacent
     cover facing the target. Lean views need 8 of 10 rays (`LEAN_SIGHT`).
   - **Range:** `rangeOf` (`perks.ts:14`): about 60 tiles in daylight (the whole map), 9 at night, 8 to 18 in
     weather.
   - **Smoke** is a hard block.
2. **Files:** `src/core/sight.ts`; `state.ts` `canSee`, `computeVis:72`; `combat.ts` `lineOfFire:48`.
3. **What works:**
   - Clear daylight hallways are seen end to end. Confirmed (measured): `accept4i` test 1, 25 tiles.
   - Thin walls behave as XCOM's edge walls.
   - Diagonal sight through windows works (`window.e2e`).
   - Results are cached per map version.
4. **What does not work:**
   - **Sight is not symmetric.**
     - Confirmed (measured), daylight, clear weather, every third walkable tile paired with every third:

       | Map | Pairs where A sees B but B doesn't see A |
       |---|---|
       | wing C | 482 of 12,210 (3.9%) |
       | town | 418 of 9,900 (4.2%) |
       | farm | 906 of 13,572 (6.7%) |
       | lab | 928 of 49,506 (1.9%) |
       | rail | 956 of 12,432 (7.7%) |

     - **Cause:** eye points depend on the viewer's surroundings, and the extra points (leaning) are chosen per viewer
       and per target direction.
     - XCOM's step-out peeks are also asymmetric in principle, but here the asymmetry falls out of rule filters, not
       from a geometric model the player can predict.
   - **A unit can see but not shoot, with nothing in the way.**
     - Confirmed (measured), same sampling, pairs where `canSee` is true but `lineOfFire` is null:

       | Map | Pairs | Reinforced glass? |
       |---|---|---|
       | town | 67 | none on the map |
       | farm | 104 | none on the map |
       | rail | 62 | none on the map |
       | wing C | 240 | some are legitimate |
       | lab | 286 | some are legitimate |

     - **Cause:** sight passes if any 3 of 10 rays are clear, while firing requires the single centre-to-centre ray to
       be clear (`lineOfFire` → `fireLine`, `sight.ts:70`). The UI even has a message for it ("can see … but has no
       line of fire", `turn.ts`).
   - **The AI uses a different test.** It scores positions with `sightFrom` (`insurgency.ts:157`) while shooting uses
     `lineOfFire`, so it can walk to a spot it believes gives it a shot and then have none. Confirmed (code); the
     frequency was not measured.
   - **SCP-173 uses yet another variant** (`rawSight`, no leaning), as does noise (wall counting, `noise.ts:22`).
     These are intentional, but they are separate code paths.
   - **Peeking is a set of rules tuned until the probe diagrams looked right** (the session history shows three
     rounds of this). It is not derived from where cover is.
5. **Missing:**
   - One trace used by every system.
   - Body exposure (OpenXcom's `checkVoxelExposure` samples the target's body).
   - Smoke density.
   - A geometric visibility polygon for drawing what a unit sees. Red Blob's angle sweep (from prior knowledge) is the
     standard way to draw one.
6. **XCOM:**
   - **Modern XCOM:** line of sight from the tile (with step-out positions when adjacent to high cover) to the target;
     sight radius fixed and generous.
   - **Classic X-COM:** voxel line of sight with a 20-tile maximum, and beyond 9 tiles only to lit tiles for the
     player. Confirmed (code): OpenXcom `TileEngine::visible` (`MAX_VIEW_DISTANCE = 20`, a darkness check beyond 9),
     with smoke attenuating along the trace.
7. **References:** OpenXcom `visible`, `canTargetUnit`, `checkVoxelExposure`; OpenApoc `BattleUnit::hasLineToUnit(…,
   useLOS)` (one routine, a flag for sight or fire); Red Blob angle sweep (from prior knowledge).
8. **Recommendation:**
   - One `trace(a, b)` over the obstacle model (2.1).
   - Eye points from geometry: the tile centre, plus a step-out point at each end of adjacent high cover that is in
     open ground.
   - Visibility as body exposure from the best eye point.
   - Line of fire from the same eye point and the same trace, differing only in which obstacle flags it tests.
   - Symmetric by construction where the rules intend it.
   - Keep `canSee`, `sightFrom`, `rawSight` and `lineOfFire` as thin wrappers so the 58 call sites and the SCP rules
     don't change.
9. **Dependencies:** 2.1. It feeds 2.6, 2.7, 2.8, 2.10, 2.13 and every SCP.
10. **Priority:** Critical. High complexity (it touches everything, but the change can be confined to `src/core`).
11. **Tests:**
    - Golden scenarios: long hallway, open room, diagonal, corner, doorway, window wall, partition, one crate, a row of
      three crates, long range, smoke.
    - Property tests: every visible enemy can be shot unless reinforced glass or the rules say otherwise; symmetry
      where intended.
    - The probe from this audit (section 9), turned into a regression with a target of 0 contradictions.

### 2.6 Perception: detection, identification, concealment, lighting

1. **Current implementation:**
   - **No perception layer.** `S.vis` is one bit per tile; if a tile is seen, everything on it is known.
   - **Concealment** is a fixed rule: unalerted Insurgents notice the team within `DETECT = 4` tiles
     (`insurgency.ts:28`), 2 fewer in fog.
   - **Night** is a range cap (9 tiles).
   - **Flares** make tiles within 2 visible from 30.
   - **Hearing** gives a rough direction (`noise.ts`). It works well and is the closest thing to perception.
2. **Files:** `state.ts` `canSee`, `lit`, `computeVis`; `perks.ts` `rangeOf`; `insurgency.ts` `alarm:46`,
   `detectRange`; `noise.ts`.
3. **What works:** hearing; concealment as a play mode; the AI only acts on what it has seen or heard (`knownTargets`,
   `insurgency.ts:33`).
4. **What does not work:**
   - Distance has no effect on what you learn about a target.
   - Darkness is a hard wall at 9 tiles regardless of light sources. Even a lit Site-19 corridor at night obeys it.
     Confirmed (code): `rangeOf` has no light map, and `lit` only covers flares. The site's power state only matters
     on emergency missions.
5. **Missing:** detected-versus-identified states; a light map; movement and stillness affecting detection; smoke
   density; gear such as binoculars or night vision.
6. **XCOM:**
   - **XCOM 2:** concealment with per-enemy detection radii shown as red tiles. SCP-X already copies this, as a flat
     4-tile radius.
   - **Classic X-COM:** per-tile light and shade, with darkness limiting sight beyond 9 tiles unless the tile is lit
     (confirmed in OpenXcom).
   - **Silhouettes:** neither series separates "seen" from "identified" in the way requested. This is an extension
     beyond XCOM.
7. **References:** OpenXcom `visible` (shade threshold), `calculateFOV`, its lighting passes (`TileEngine` light
   layers); OpenApoc vision blocks (`calculateVisionToLosBlocks`) for performance.
8. **Recommendation:**
   - Perception runs after geometry: a score from distance, light at the target, the target's movement and
     concealment, smoke along the trace, and the observer's traits and gear.
   - **Three states:** unseen, detected (a contact marker), identified.
   - **Light map:** per tile, from map lights (on when power is on), flares, fire and muzzle flashes.
   - Concealment's 4-tile rule becomes this model's "unalerted observer" case.
   - The AI uses the same states.
9. **Dependencies:** 2.5. It feeds AI, overwatch triggers and UI.
10. **Priority:** High. Medium-high complexity.
11. **Tests:**
    - A long-hallway ladder: identified, then detected, then unseen as distance and light change.
    - A lit corridor at night is visible end to end.
    - Smoke density curve.
    - A concealed team approaching unalerted enemies at day, night and in fog.

### 2.7 Cover, directional cover and flanking

1. **Current implementation:**
   - `coverAgainst` (`combat.ts:20`) looks at the target's 8 neighbouring tiles. A wall, full cover or steel gives 40
     if the shooter is within a cone of its face (cosine ≥ 0.5, about ±60°, for a side; ≥ 0.92, about ±23°, for a
     diagonal). Half cover or a drum gives 20.
   - No cover means "Flanked +10" to hit and +40 crit.
   - Hunkering doubles cover.
2. **Files:** `combat.ts` `coverAgainst:20`, `shotInfo:65`, `coverTileFacing:186`; `abilities.ts` `hasCover`.
3. **What works:** half and full values match modern XCOM's convention; hunker; misses blocked by cover visibly
   strike it (4G).
4. **What does not work:**
   - **Cover is not computed from the line of fire.**
     - A wall diagonally behind the target can count as cover if the angle test passes.
     - Windows, partitions and shut doors never count. Confirmed (code): the tile list in `coverAgainst` is
       WALL/FULL/STEEL/HALF/DRUM only, so someone behind a window sill or beside a partition shows as flanked.
     - The cone test is a different notion of direction from the sight rays, so the shield the player expects and
       the number the dice use can differ. Suspected; not measured.
   - **The AI scores cover with the same function** (`bestSpot`), so its mistakes match the player's, but neither
     matches the geometry.
5. **Missing:** cover from obstacles at an edge rather than a tile; per-direction cover shields drawn from the same
   function; low cover not protecting against an elevated shooter.
6. **XCOM:** cover comes from objects adjacent to the target on the side facing the shooter. Flanking is the shooter
   being past the cover's line. Classic X-COM has no cover modifier: bullets physically hit objects.
7. **References:** Tactical Revolt `ShootAction.GetCoverModifier` (a ray from shooter to target, checking what it
   hits); OpenXcom's physical model.
8. **Recommendation:**
   - Cover is the tallest obstacle the shot's trace crosses within the target's own tile or edge band. High gives
     full cover, low gives half.
   - **Flanked** means nothing in that band.
   - The UI shields call the same function.
9. **Dependencies:** 2.1, 2.5.
10. **Priority:** Critical. Medium complexity.
11. **Tests:** a cover matrix for a target beside each obstacle kind, with shooters at 16 bearings; flanked exactly
    when expected; the shield matching the dice.

### 2.8 Accuracy and effective range

1. **Current implementation:**
   - Additive modifiers clamped to 5 to 95 (`shotInfo:65`): aim, weapon, attachments, cover, leaning or partly hidden
     −15, the range table, reaction −15, suppression −30, perks, officer, bonds, sanity, weather, marked, spotter.
   - **Range** is `rangeMod` (`weapons.ts:67`), a step table per weapon type (for example rifles: +10 within 3 tiles,
     −4 per tile beyond 7).
2. **Files:** `combat.ts` `shotInfo`; `data/weapons.ts`.
3. **What works:** a clear breakdown shown on hover and logged on every shot.
4. **What does not work:**
   - **Range steps** are coarse.
   - **Leaning penalty:** −15 is applied for leaning out even though the target can see you just as well.
   - **Partial visibility:** "partly hidden" uses the 10-ray fraction (below 0.5), an artefact of the sampling rather
     than a modelled exposure.
   - **Test coverage:** the dice themselves are untested. `combat.e2e.cjs` checks only that a shot and a grenade run
     without errors.
5. **Missing:** per-weapon range curves; a defense stat; the graze band (XCOM 2); stray rounds hitting what is on the
   line.
6. **XCOM:**
   - **XCOM 2:** per-weapon range tables by tile distance; aim plus modifiers minus defense and cover; a graze band;
     crits.
   - **Classic X-COM:** a spread cone, and the projectile is traced.
7. **References:** OpenXcom `Projectile.cpp` (spread, then trace); XCOM 2 range tables (from knowledge of the game).
8. **Recommendation:** per-weapon range curves; exposure from 2.5 instead of the ray fraction; misses traced onward
   along the same `trace`.
9. **Dependencies:** 2.5, 2.7.
10. **Priority:** High. Medium complexity.
11. **Tests:** a hit-chance table per weapon by distance and cover; seeded Monte Carlo checks that hit rates match the
    displayed chance within tolerance.

### 2.9 Damage, armor, critical hits, status effects

1. **Current implementation:**
   - Damage is a flat roll by weapon model. A crit adds 2 (3 with hollow points).
   - Armor subtracts 1 per point, minus pierce. Shredder removes armor.
   - **Downed and bleeding:** downed operatives bleed out over `BLEED_TURNS` and can be stabilised.
   - **Other statuses:** panic, blinded, burning, suppressed, marked, staggered (SCP-049), compelled (SCP-012).
2. **Files:** `combat.ts` `fire:123`, `damage:200`, `goDown:236`; `abilities.ts`.
3. **What works:** a recognisable XCOM 2 armor model; bleed-out and stabilising; many statuses.
4. **What does not work:**
   - Each status is its own `xxxUntil` field on `Unit`, checked in scattered places. There is no shared duration or
     tick system. Confirmed (code): `Unit` has 97 fields.
5. **Missing:** a status registry (apply, tick, expire, show); damage falloff; bonus vs particular target kinds.
6. **XCOM:** matches modern XCOM in spirit.
7. **References:** Godot Tactical-RPG `StatusEffect` and `TurnEffectProcessor` (a separate system with a receiver per
   unit).
8. **Recommendation:** a small status registry; move existing statuses onto it without changing their numbers.
9. **Dependencies:** 2.10, 2.11.
10. **Priority:** Medium. Medium complexity.
11. **Tests:** apply, tick and expire for each status; crit and armor arithmetic.

### 2.10 Overwatch and reaction fire

1. **Current implementation:**
   - In `moveUnit` (`combat.ts:271`), after every step:
     - team members on overwatch shoot any raider they have a line of fire to;
     - raiders on overwatch (only snipers set it, `insurgency.ts`) shoot team members.
   - Reaction shots take −15 (−5 for machine guns), Covering fire removes the penalty, and a turn penalty applies.
   - Guards are `side: "mtf"` and take part.
2. **Files:** `combat.ts` `moveUnit`; `turn.ts` overwatch command (around line 337); `insurgency.ts` sniper overwatch.
3. **What works:** the basics, multiple shots with Rapid reaction, tracer rounds, and the scamper on alert (XCOM 2
   style) can trigger overwatch.
4. **What does not work:**
   - **Detection:** overwatch fires on line of fire, not on what the watcher perceives (there is no perception, 2.6).
   - **Sides:** only team versus raider. Zombies, SCP-049-2 and SCP-939 instances moving into overwatch draw no
     reaction. Confirmed (code): the loop is `u.side === "raider"`.
   - **Enemy use:** only enemy snipers use overwatch.
5. **Missing:** overwatch cones or zones shown; enemy overwatch as a general tactic; reaction to non-movement actions.
6. **XCOM:**
   - **Modern XCOM:** overwatch fires at the first visible enemy movement, with an aim penalty, and is cancelled by
     suppression and by taking damage in some cases.
   - **Classic X-COM:** a reaction score contest. Confirmed (code): OpenXcom `TileEngine::tryReaction` and
     `getReactionScore`.
7. **References:** OpenXcom reaction fire; XCOM 2 behaviour (from knowledge).
8. **Recommendation:** one reaction system: any unit with a reaction stance reacts to perceived movement of hostiles
   of any side, using the shared trace and perception.
9. **Dependencies:** 2.5, 2.6.
10. **Priority:** High. Medium complexity.
11. **Tests:**
    - Overwatch triggers on each enemy type.
    - It doesn't trigger on undetected movement (once perception exists).
    - Shot counts match Rapid reaction.

### 2.11 Suppression

1. **Current implementation:** the Suppression ability sets `suppressedUntil` on a target; `shotInfo` applies −30.
   Grenades and explosions also suppress (`turn.ts:549`).
2. **Files:** `abilities.ts:167`; `combat.ts:95`.
3. **What works:** the aim penalty.
4. **What does not work:** nothing else happens. A suppressed unit moves freely, isn't pinned, and the suppressor
   gets no reaction shot. Confirmed (code).
5. **Missing:** XCOM 2 suppression (a reaction shot if the target moves, ending its overwatch, an ammo cost); a pinned
   state; AI use of suppression.
6. **XCOM:** in XCOM 2, suppression is a way to lock an enemy in place. Here it is a debuff.
7. **References:** XCOM 2 behaviour (from knowledge).
8. **Recommendation:** build it on the reaction system (2.10).
9. **Dependencies:** 2.10.
10. **Priority:** Medium. Low-medium complexity.
11. **Tests:** a suppressed unit that moves draws a shot; suppression ends overwatch; it expires.

### 2.12 Destructible environment and hazards

1. **Current implementation:**
   - `blastStructure` (`grid.ts:134`): grenades remove half cover, doors, partitions and glass; rockets and breaching
     charges also remove walls outside Site-19.
   - Gunfire breaks ordinary glass.
   - **Hazards:** fire spreads and fuel drums explode (`fire.ts`); SCP-610 flesh spreads; SCP-106 rot; smoke.
   - Insurgent sappers breach walls (`ciTactics.ts` `demoBreach`).
2. **Files:** `grid.ts`, `fire.ts`, `ciTactics.ts`, `turn.ts` (grenades).
3. **What works:** explosions reshape the map, and caches invalidate correctly via `L.version` (`accept4i` test 5).
4. **What does not work:**
   - Full cover (`H`, pillars) cannot be destroyed by anything. Confirmed (code): `blastStructure` handles HALF, doors,
     PART, WINDOW and WALL only.
   - Bullets never damage cover.
   - The ruin state is binary.
5. **Missing:** cover HP and degradation (full to half to rubble); stray rounds; partial wall damage.
6. **XCOM:** destructible cover is central to modern XCOM's explosives game; classic X-COM has armor values per tile
   part.
7. **References:** OpenXcom `TileEngine` explosion handling; OpenApoc `BattleMapPart` (damage, collapse when
   unsupported).
8. **Recommendation:** HP on obstacles in the new model; degrade by steps; stray rounds deal chip damage.
9. **Dependencies:** 2.1, 2.8.
10. **Priority:** Medium. Medium complexity.
11. **Tests:** a crate takes N hits to drop a cover level; a grenade drops full to half; caches update.

### 2.13 Enemy AI and tactical decision-making

1. **Current implementation:**
   - **Pods:** they patrol until alerted (seen, hit, heard, or the breach timer). When alerted they scamper to cover.
   - **Each turn,** `raiderAct` (`insurgency.ts:177`):
     - goes for mission goals (truck, lift, containment control, the anomaly for the GOC and GRU-P);
     - reloads if empty;
     - shoots the best target if the chance is at least 45% (or at least 20% with one action left);
     - otherwise snipers overwatch and sappers breach;
     - otherwise it moves to `bestSpot`.
   - **`bestSpot`** (`insurgency.ts:148`) scores tiles within 5 steps: +12 if it sees a known target, + cover × 1.2,
     +18 per target it would flank, distance near 6, mission goals, and a random term of 0 to 3.
   - **Rivals:** the GOC and GRU-P (`rivals.ts`).
2. **Files:** `insurgency.ts`, `ciTactics.ts`, `rivals.ts`; anomaly AIs in `scp173.ts`, `scp049.ts`, `scp106.ts`,
   `scp4b.ts`, `dclass.ts`.
3. **What works:**
   - Plays fair on knowledge (seen, remembered, heard).
   - Uses cover, seeks flanks, follows mission goals.
   - Pods and scamper.
   - Roles: sniper, sapper, officer, commander.
   - The anomaly AIs are distinctive and rule-driven.
4. **What does not work:**
   - **No exposure or threat model.** A spot's score never considers how many team members could shoot it, from what
     cover, or overwatch lanes.
   - **Different predicates:** it scores with `sightFrom` and `coverAgainst` but shoots with `lineOfFire` (2.5).
   - **Fixed reach:** 5 tiles; it never dashes.
   - **Few options:** no grenades to flush or destroy cover, no suppression, no fallback or retreat beyond the
     commander fleeing.
   - **Random tiebreak:** `Math.random()` with no seed, so behaviour can't be reproduced in tests.
5. **Missing:** utility scoring across actions; squad coordination (one suppresses, one flanks); a threat map.
6. **XCOM:** XCOM 2's AI is a behaviour tree whose movement choices are scored for cover, flanking and distance. It
   uses grenades on clustered or covered targets and suppression.
7. **References:**
   - OpenApoc `game/state/battle/ai`: a tactical (squad) AI plus layered unit AIs (default, behaviour, low morale,
     hardcore) returning prioritised decisions.
   - OpenXcom `AIModule`: an aggression setting, spotting, and evaluation of attack positions.
   - Tactical Revolt `GetEnemyAIAction`: each action returns a value; the best is taken.
   - Godot Tactical-RPG `FactionAIBrain` / `AIContext`.
8. **Recommendation:**
   - A utility AI on the shared kernel. Candidate positions within real move and dash range are scored for:
     - cover against each threat it knows of;
     - the expected incoming damage (exposure);
     - flank opportunities and the objective;
     - role weights.
   - Actions (shoot, overwatch, grenade, suppress, reload, hunker, fall back) are scored by expected value.
   - A seeded RNG.
9. **Dependencies:** 2.2, 2.5, 2.6, 2.7, 2.10, 2.11, and the RNG (section 8).
10. **Priority:** High. High complexity.
11. **Tests:** lab scenarios with fixed seeds:
    - it takes cover against the threat;
    - it flanks when offered a flank;
    - it doesn't stand in an overwatch lane;
    - it throws a grenade at three clustered targets.

### 2.14 Abilities and equipment

1. **Current implementation:**
   - About 30 abilities in one table (`abilities.ts:24-51`) with a target type, uses and a "when" condition.
   - Items: medkits, grenades of several kinds, smoke, flares, eye drops, cameras, restraints, amnestics, the capture
     kit for each anomaly.
   - Six weapon types and 13 models; attachments and special ammo.
2. **What works:** broad, and data-driven for abilities.
3. **What does not work:**
   - Many effects are numeric (+aim, +crit).
   - The tactical effect of most research is untested. A static scan found every research project referenced by game
     logic (the earlier "orphan" hit was a false positive), but whether each effect does what its description says is
     not checked by any test.
4. **Missing:** breaching charge, ballistic shield and mortar (planned in 4H); gear that changes perception
   (binoculars, night vision).
5. **XCOM:** similar breadth to XCOM 2's early and mid game.
6. **References:** none needed.
7. **Recommendation:** after the kernel, give each ability its AI value and its test.
8. **Dependencies:** 2.3.
9. **Priority:** Medium. Low-medium complexity.
10. **Tests:** one per ability (valid targets, cost, effect).

### 2.15 Mission objectives, extraction and mission lifecycle

1. **Current implementation:**
   - About 13 mission kinds with objectives checked in `checkEnd` (`turn.ts:659`): seal the anomaly, neutralise, dose
     witnesses, rescue, raid hold, convoy, emergency, outbreak, riot, object theft.
   - Exits and Exfiltrate; Abort; optional objectives.
2. **What works:** real variety, and acceptance-tested for 4B and 4C.
3. **What does not work:**
   - **Closing the page mid-mission is a lost mission.** `resolveInterrupted` (`campaign.ts:1060`) adds +20 exposure
     and counts a loss. There is no warning on unload (no `beforeunload` handler anywhere) and no mid-mission save.
     Confirmed (code).
   - **Spread-out rules:** win and loss rules are a long chain of `if (k === …)` in `checkEnd`. The codebase has 423
     comparisons of the form `kind === "…"`.
4. **Missing:** a mission definition object (objectives, timers, fail states, reinforcements); a tactical save.
5. **XCOM:** XCOM 2 saves at any time (and autosaves each turn, with Ironman as an option).
6. **References:** OpenXcom saves mid-battle (`SavedBattleGame`).
7. **Recommendation:** serialise `S` and `L` each turn (both are plain data apart from `Set`s and `Map`s); objectives as
   data.
8. **Dependencies:** save system (3.14).
9. **Priority:**
   - **The page-close loss:** Critical for a browser game played on phones. Low-medium complexity.
   - **Objectives as data:** Medium.
10. **Tests:** save and restore a mission mid-turn and get identical state; every mission kind's win and loss paths.

### 2.16 Camera, animation and combat feedback

1. **Current implementation:**
   - The whole map is drawn on one canvas, with no camera.
   - 4G added tracers, impacts, hit and miss text, recoil, flinch, banners and screen highlights.
   - A hover hit-chance breakdown; a log that explains each shot's reasons; noise arcs.
2. **What works:** combat is readable; every shot explains itself.
3. **What does not work:**
   - **No camera:** with no zoom or pan, larger maps won't fit. The roadmap notes the phone layout is still open.
   - **Missing previews:** no line-of-fire or cover preview when hovering a destination tile (XCOM's shields and
     flank markers on the move cursor).
4. **Missing:** a destination preview (cover shields, flank and overwatch warnings, enemies that will be visible);
   overwatch cones.
5. **XCOM:** the move cursor preview is one of XCOM's most important readability tools.
6. **References:** none needed.
7. **Recommendation:** after J2, show the shields from the shared cover function on the move cursor.
8. **Dependencies:** 2.5, 2.7.
9. **Priority:** High (readability). Medium complexity.
10. **Tests:** UI snapshot tests in the lab.

### 2.17 Elevation

1. **Current implementation:** none. Multi-floor maps are flat grids, rock between floors, joined by link tiles
   (`grid.ts` `floorOf`, `linkFrom`).
2. **What works:** multi-floor movement (`floors.e2e`).
3. **What does not work:** no height advantage, no seeing over low cover from above, no falling.
4. **Missing:** everything elevation-related.
5. **XCOM:** a height advantage bonus to hit, and high ground ignores low cover. Classic X-COM is fully 3D.
6. **References:** OpenXcom's z-levels.
7. **Recommendation:** a later phase, using the obstacle heights from 2.1, traced in 2.5D.
8. **Dependencies:** 2.1, 2.5, 2.7.
9. **Priority:** Low (until Phase 5). High complexity.
10. **Tests:** a height-advantage matrix.

---

## 3. Strategic layer

These are read from code. Balance and pacing were not played through, so they are untested.

### 3.1 Facility construction and upgrades
- **Files:** `campaign/base.ts`.
- **Current implementation:**
  - 14 facility types on a grid of levels.
  - Excavation, building, repair, rebuilding and demolition.
  - Upgrades, power tiers and adjacency (`neighbors`).
  - Damaged and wrecked states, and engineers as the build capacity.
- **Works:** wide and coherent; damage from breaches and raids feeds back into it.
- **Weak:** no automated test of build costs, power and capacity limits. A planner can't preview the effect of a
  layout. Untested.
- **XCOM:** comparable to XCOM 2's Avenger rooms and adjacency.
- **Priority:** Medium (tests).

### 3.2 Research and technology
- **Files:** `campaign/research.ts`.
- **Current implementation:**
  - 111 projects across 15 branches (Equipment 28, Weapons 25, Site 17, Personnel 8, per-anomaly 2 to 4,
    Breakthrough 7).
  - Researchers are assigned per project (several in parallel).
  - Field bonuses from staff specialities; monthly breakthroughs and inspirations; tests on anomalies.
- **Works:** every project is referenced by game logic (static scan, this audit).
- **Weak:**
  - About 68 of 111 projects don't unlock equipment, models, armor or attachments. Their effects are mostly numeric
    modifiers.
  - None of the research effects are covered by tests.
  - The roadmap's own 4H note asks for "progression that changes play". Suspected: much of the tree changes numbers,
    not tactics.
- **XCOM:** XCOM 2's tree is smaller and each item tends to change options (new weapon tiers, new items, new
  abilities).
- **Priority:** Medium.

### 3.3 Engineering and manufacturing
- **Files:** `research.ts` (`order`, refits, attachments, ammo, selling).
- **Current implementation:** workshop orders with cost and days; refits on weapon and armor tiers; selling stores.
- **Weak:** manufacturing is a cost-and-time queue, with no engineer allocation per job. Untested beyond costs.
- **XCOM:** XCOM 2 builds instantly with resources; classic X-COM uses engineer hours. Either is fine.
- **Priority:** Low.

### 3.4 Personnel: researchers, engineers, staff
- **Files:** `people.ts`, `staff.ts`, `base.ts`.
- **Current implementation:** named staff with fields and trades; staff events and requests; hiring.
- **Works:** flavour and some mechanical effect (field boosts).
- **Weak:** staff mostly act as capacity numbers. Untested.
- **Priority:** Low.

### 3.5 Mobile Task Force management
- **Files:** `campaign.ts` (ranks, perks, classes, therapy, retraining), `condition.ts` (fatigue, injuries, bonds),
  `security.ts` (guards), `taskforces.ts` (Eta-10, Nu-7, agents).
- **Current implementation:** ranks and XP, class perk choices, traits from experience, bonds with an aim bonus,
  fatigue, injuries, therapy, medals, nicknames, a memorial.
- **Works:** this is SCP-X's strongest XCOM-like system. Permanent loss is real, and attachment is supported by
  history and medals.
- **Weak:** untested end to end.
- **Priority:** Low.

### 3.6 Funding and resources
- **Files:** `ledger.ts`, `council.ts` (grant), `world.ts` (regional funding), 4E economy.
- **Current implementation:** monthly grant by standing and anomalies held; regional pay; salaries and upkeep;
  materials; Intel.
- **Works:** the 4E economy overhaul was checked with simulation scripts during development.
- **Weak:** those scripts live only in this session's scratch folder (`econ*.cjs`) and will be lost when the session
  is reclaimed. No balance test in the repo.
- **Priority:** High (move them into the repository).

### 3.7 World map
- **Files:** `geo.ts`, `world.ts`, `ui/hubView.ts`.
- **Current implementation:** regions with exposure and collapse; travel days; weather; day and night by longitude;
  investigation; field operations; cover stories; amnestic teams.
- **Works:** 4F made it active. Night and weather feed the tactical setup.
- **Priority:** Low.

### 3.8 Global missions and incidents
- **Files:** `world.ts`, `containment.ts`, `council.ts`, `security.ts`, `taskforces.ts`, `leads.ts`, `contracts.ts`.
- **Current implementation:** recoveries, cover-ups, strikes, retaliations, outbreaks, rescues, emergencies, quiet
  sites, convoys, raids, riots, breaches; leads and contracts.
- **Works:** wide variety.
- **Weak:** incidents are generated by random daily rolls (`Math.random`, no seed), so pacing can bunch or starve.
  Suspected, untested.
- **Priority:** Medium.

### 3.9 Chaos Insurgency, GOC, GRU-P
- **Files:** `chaos.ts` (agenda, plans, threat, moles, sabotage, inquiries), `rivals.ts`, `ciTactics.ts`.
- **Works:** an agenda with steps, plans the player can disrupt, moles, inquiries into breaches. The GOC and GRU-P
  appear in tactical play.
- **Weak:** the agenda's endpoint and campaign defeat are part of the missing 4D.
- **Priority:** Medium (with 4D).

### 3.10 O5 Council
- **Files:** `council.ts`.
- **Current implementation:** standing tiers, directives, requests, transfers between sites, partner offers, crises,
  audits.
- **Works:** creates real choices (requests and offers).
- **Weak:** untested end to end.
- **Priority:** Low.

### 3.11 SCP containment management
- **Files:** `containment.ts`, `objects.ts`, `data/procedures.ts`.
- **Current implementation:**
  - Breach risk from maintenance, depth, power, staff and alert.
  - Routines per anomaly (cleaning, interviews, relining); D-Class work with blink risk.
  - Evacuation, moving between wings, transfers; inert objects with uses.
- **Works:** distinct per anomaly, and procedures shape the risk.
- **Weak:**
  - The theft bug fixed this session showed how special cases leak: inert objects were played as SCP-173 because of
    a default. Confirmed and fixed.
  - Similar defaults (`setup.scp ?? "173"`, `mission.ts`) remain.
- **Priority:** Medium (remove the "default to 173" fallbacks).

### 3.12 Facility security and guards
- **Files:** `security.ts`.
- **Current implementation:** guards hired, posted to stations, promoted; alert levels; guards in breach missions; a
  "let the guards handle it" auto-resolve with odds.
- **Works:** guards carry over between missions with traits.
- **Priority:** Low.

### 3.13 Breaches and defensive missions
- **Files:** `containment.ts` (`startBreach`, `breachKnockOn`), `security.ts` (`tickRaids`, `raidLoss`).
- **Works:**
  - Breaches pause time until answered.
  - Knock-on effects per anomaly.
  - Raids can open a cell and cause a breach.
  - A forced lift continues the raid on level 1.
- **Missing:** the raid-loss ending (saved for 4D).
- **Priority:** Medium.

### 3.14 Save and load
- **Files:** `campaign/save.ts`.
- **Current implementation:**
  - Three slots in `localStorage`; export and import.
  - A migration chain from version 2 to 24 (`parseCampaign`). A version other than 24 at the end returns null, so the
    save is discarded.
- **Works:** guarded storage access; migrations exist.
- **Weak:**
  - **Interrupted missions:** a mission interrupted by closing the page is a loss (2.15).
  - **Migrations:** none of the 22 steps has a test. A bug in any step silently discards a player's campaign (null
    is returned and the game starts fresh). Confirmed (code); no repo test.
  - **No integrity check:** saves have no checksum or backup copy.
- **XCOM:** saves anywhere.
- **Priority:** Critical (the page-close loss) and High (migration tests).

### 3.15 Strategic consequences of tactical outcomes
- **Files:** `campaign.ts` `applyResult:837`.
- **Works:**
  - Deaths are permanent and recorded.
  - Wounds, sanity, traits and XP carry over.
  - Exposure, standing, prisoners, Intel and lost anomalies (GOC, GRU-P, Insurgency) follow from the result.
  - Gear comes home.
- **This is solid.**
- **Priority:** Low.

### 3.16 Campaign progression and pacing
- **Current implementation:** time runs day by day. `advanceToEvent` (`campaign.ts:602`) skips up to 400 days until
  something happens.
- **Missing:** victory, a final operation, an epilogue (4D). The campaign runs until defeat or forever.
- **Waiting for timers:** whether the strategic layer is mostly waiting can't be settled without play. Structurally,
  research, building, healing and travel are all timers, and the decision points are monthly (council, chaos,
  research offers) plus incidents.
- **XCOM:** modern XCOM has a doom clock (the Avatar project) that creates pressure. SCP-X's nearest equivalent is the
  Insurgency agenda, which doesn't yet end the campaign.
- **Priority:** High (4D).

---

## 4. SCP-specific gameplay

| Anomaly | Mechanic | Integration | Tests |
|---|---|---|---|
| SCP-173 | Moves only when unseen; per-unit blink rolls; staring costs an action and sanity; dragging while watched; container seal; a hatch escape timer and lockdown panel; it hears gunfire roughly | Uses `canSee` for "watched", so it inherits every sight inconsistency (2.5): an asymmetric line can mean 173 is "watched" by someone it can't see, or the reverse. Suspected; not measured for 173 specifically | `combat.e2e` smoke test; older scripts in scratch only |
| SCP-049 | Lethal touch; raises fresh bodies as SCP-049-2; gunfire only staggers; Calm (sanity cost) and lead | Interacts with downed and dead units through `freshBodies`. Good integration with bleed-out | Scratch scripts only (`breach049.cjs`) |
| SCP-106 | Walks through walls; the pocket dimension; sinks when shot; corrosion; bait in the container | Corrosion uses `setSlow` (a global pathing flag, see 2.2) | Scratch only |
| SCP-610 | Flesh spreads per turn; infection with a 5-turn incubation; only fire kills the core | Fire system shared with drums and incendiaries | Scratch only |
| SCP-096 | Face-sight triggers; eyes down; hood; rips through obstacles | `inFace` uses its own facing and sight check | `accept4b` |
| SCP-012 | Compulsion by sanity and sight; folder with eyes down | Uses `canSee` | `accept4b` |
| SCP-939 | Hunts by sound; voice lures; noisemakers | Uses the hearing system, a good fit | `accept4b` |
| SCP-035 | Possession; rot; lead-lined case | Host is a unit; the mask a state | `accept4b` (flaky setup) |
| SCP-682 | Adapts to damage types; regenerates; collapses; sealing while down | Damage hooks in `damage()` | `accept4b` |
| SCP-500, 914, 005 | Objects; strategic uses; theft missions | Fixed this session | `objecttheft` |

**Assessment:**
- **Strong:** the anomalies are not ordinary enemies; each has rules the player must learn and gear to answer them.
  This is SCP-X's clearest strength over a generic XCOM-like.
- **Weak, structurally:**
  - **One anomaly slot.** Every mission has one "anomaly" unit slot, `S.statue` (65 references), with `S.scp` string
    checks and `has173/has049/has106` flags: 121 such checks across the code. Adding an anomaly means touching many
    files, and missions with two anomalies (a cascade breach) are impossible.
  - **Leaked defaults.** Defaults to SCP-173 (`setup.scp ?? "173"`) have already caused one shipped bug (objects
    treated as 173).
- **Containment procedures, breach escalation, facility consequences:** implemented in the campaign layer and
  connected (knock-on effects, risk boosts, wrecked wings). Untested beyond SCP-682's wing wreck in `accept4b`.

**Attribution (licence compliance):**
- The README credits authors for SCP-173, 049, 106 and 610 only.
- SCP-005, 012, 035, 096, 500, 682, 914 and 939 are in the game with no author credit. In-game, only SCP-173 links to
  its article (`notes.ts`).
- The README itself says "Any SCP added later must credit its article's authors here and in-game". CC BY-SA 3.0
  requires attribution. Confirmed (code). Priority High (legal), complexity Low, but the author names must be checked
  on the SCP Wiki, which this session can't reach.

---

## 5. Player experience compared with modern XCOM

All of this is judged from rules and code, not from play.

- **Tactical depth:**
  - **Good:** cover, flanks, overwatch, grenades, concealment, pods, roles, and the anomaly rules on top.
  - **Undermined by inconsistency:** players can't trust what they see. A visible enemy can be unshootable. A spot
    the AI picked can be useless to it. Cover shields aren't from geometry. XCOM's depth depends on the player
    predicting outcomes; this is the biggest gap.
- **Meaningful choices:** many exist (which anomaly to answer, gear, leaving it to the guards, alert level, council
  requests).
- **Difficulty:** difficulty levels exist (`difficulty.ts`) but have no test or simulation in the repo. Untested.
- **Combat pacing:** two actions and pods give an XCOM 2 rhythm. Enemy turns have animation delays (`sleep`) inside
  rules code, so they can't be sped up or skipped cleanly.
- **Strategic pacing:** timers plus monthly decisions plus random incidents. There is no doom-clock pressure until
  4D. Untested in play.
- **Mission variety:** high (13 kinds, 10 maps, a generated town).
- **Replayability:** randomness everywhere, but no seeds. That suits replay, but makes bugs impossible to reproduce.
- **Progression and rewards:** broad, but numeric-heavy (3.2). 4H was planned to address this.
- **Personnel attachment and loss:** strong (bios, nicknames, bonds, medals, memorial, permanent death).
- **UI clarity and combat readability:** shot breakdowns and logs are excellent. Missing: move-cursor previews,
  overwatch cones, perception states.
- **Feedback:** 4G made shots and impacts readable.
- **Immersion:** strong period and SCP flavour; art is placeholder-level in places (the roadmap says so).
- **Features that exist but add little:**
  - Facing (a minor reaction modifier).
  - The 10-ray partial visibility (it produces "partly hidden −15" from sampling artefacts more than from anything the
    player can read).
  - Staff trades (mostly capacity).
  - Suppression as it stands (a debuff only).

---

## 6. Architectural problems

| # | Problem | Evidence | Status | Impact | Priority |
|---|---|---|---|---|---|
| A1 | No single geometry kernel; four or more line tests | `visFrac`, `fireLine`, `coverAgainst`, `rawSight`, `heardAt`; 58 call sites | Confirmed (code); contradictions measured (2.5) | Visibility, shooting, cover and AI disagree | Critical |
| A2 | Global mutable singletons `S`, `L` and module flags (`setVault`, `setLinkAccess`, `setSlow`, `setSmoke`) | `state.ts`, `grid.ts:108-162`, `sight.ts:10` | Confirmed (code) | Order-dependent bugs; hard to test; no headless simulation of two states | High |
| A3 | Rules mixed with presentation and timing | `fire()` calls `fx`, `log`, `sleep`, `hooks.update` | Confirmed (code) | Can't run combat headless, fast-forward the AI, or unit-test rules | High |
| A4 | Special-case sprawl | 121 SCP checks, 423 `kind ===` comparisons, 65 `S.statue` references; `Unit` has 97 fields | Confirmed (measured by grep) | Every feature touches many files; the object-theft bug | High |
| A5 | No seeded RNG | 175 `Math.random` calls | Confirmed (measured by grep) | Bugs can't be reproduced; AI and balance can't be tested | High |
| A6 | Tests mostly outside the repository | 118 scripts in the session scratch folder versus 10 in `tests/`; repo tests hardcode `/home/user/scp-x/dist/index.html`, and `floors.e2e.cjs` writes screenshots to a session scratch path | Confirmed | They'll be lost when the session ends; no `npm test`; no CI | Critical |
| A7 | Save migrations untested; a failed migration silently discards the save | `save.ts:168` returns null | Confirmed (code) | Possible loss of player campaigns | High |
| A8 | Mid-mission page close is a loss with no warning | `resolveInterrupted`; no `beforeunload` | Confirmed (code) | Player-hostile, especially on phones | Critical |
| A9 | Hardcoded tuning numbers in logic | AI weights (`+12`, `*1.2`, `+18`, `-abs(d-6)*4`), `DETECT = 4`, `bfs(…, 5)`, range tables in code | Confirmed (code) | Hard to balance or expose in the lab | Medium |
| A10 | Performance scaling | `visCache` is an `Int8Array` of size (W·H)², 1.13 M entries for 28×38, about 100 MB at 100×100; `bfs` with slow tiles is O(N²); `computeVis` × team × tiles × eye points | Confirmed (code); fine at current sizes | Blocks larger maps and Phase 5 | Medium (Low now) |
| A11 | Very large UI modules | `hubView.ts` 1,787 lines, `campaign.ts` 1,072 lines | Confirmed | Merge risk; slow to change | Low |
| A12 | Repo clutter | 34 screenshots (up to 380 KB each) committed at the repository root | Confirmed | Noise; bloat | Low |
| A13 | Attribution incomplete | Section 4 | Confirmed | License compliance | High |
| A14 | "Default to SCP-173" fallbacks | `setup.scp ?? "173"` in `mission.ts` | Confirmed (code); caused one shipped bug | Wrong mission for unknown IDs | Medium |

---

## 7. Testing: what exists and what is needed

**Exists (in the repository, all passing on this audit's run):**
- `accept4b`, `accept4c`, `accept4g`, `accept4i`, `floors`, `objecttheft`, `raidarrival`, `spawns`, `window`: browser
  acceptance tests driven through `window.__site19`.
- `combat.e2e.cjs`: a smoke test only (asserts no page errors).

**Exists only in this session's scratch folder:** 118 scripts (economy simulations, earlier acceptance checks, probes).
These will be lost when the session's container is reclaimed.

**Missing:**
1. An `npm test` entry point and relative paths, so tests run anywhere.
2. Headless rule tests that don't need a browser. They need A2, A3 and A5 to be fixed first, or at least seeded
   randomness and rules separated from presentation.
3. Geometry golden scenarios and property tests (2.5, 2.7).
4. Hit-chance and damage tables; seeded Monte Carlo checks.
5. AI scenario tests with fixed seeds.
6. Save round-trip and migration tests from fixtures of each old version.
7. Campaign balance simulations kept in the repository.
8. Continuous integration. None is configured; adding it is an external change and needs the owner's permission.

---

## 8. Root causes, ranked

1. **No single geometry and rules kernel** (A1). Most tactical complaints (sightlines, doorways, cover, AI misplays)
   trace to this.
2. **Rules entangled with UI, timing and global state** (A2, A3). This blocks headless testing, fast AI evaluation and
   mid-mission saves.
3. **No determinism** (A5). This blocks reproducible bugs and AI and balance tests.
4. **Tests not kept with the code** (A6).
5. **Special-case growth instead of data-driven definitions** (A4, A14). The next anomaly or mission kind costs more
   than the last.

---

## 9. Probe scripts used in this audit

Both live in the session scratch folder and will be moved into `tests/` as part of the roadmap if approved:
- `/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/consistency.cjs`: the sight
  symmetry and see-but-can't-shoot counts in 2.5. Daylight, clear weather, flares cleared, every third walkable tile
  sampled on five maps.
- `/tmp/claude-0/-home-user-scp-x/54b8bb60-76e9-5ac7-87cb-a04ccc4cc055/scratchpad/runall.sh`: runs every suite in
  `tests/`.
