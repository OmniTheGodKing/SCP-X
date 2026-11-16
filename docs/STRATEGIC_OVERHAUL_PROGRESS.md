# Strategic Overhaul: Progress

The working record for the strategic overhaul (XCOM 2-inspired strategy, SCP Foundation identity, professional UI,
future 3D compatibility). It is kept current as work lands, so a later session can resume from it.

**Rules:**
- Local commits only: no pushing or publishing without the owner's permission.
- Nothing is marked complete unless it is tested.

Status keys:
- `[x]` complete and tested
- `[~]` partially complete (see notes)
- `[ ]` not started
- `[!]` blocked

## Baseline (before any change)

- **Commit:** `d1145d0` (end of the tactical overhaul), branch `main`, working tree clean.
- **Build:** passes.
- **Tests:** 14 of 15 suites pass. 57 headless tests pass. The one failure is the known rare accept4c flake ("GRU-P
  left alone…", a carrier stall caused by random placement; it predates this work).
- **Screens:** the strategic screens before the overhaul are captured at 1440×900 and 1920×1080 by
  `node tests/out/shots.cjs tests/out/before`. Screenshots go to `tests/out`, which is git-ignored.
- **Save format:** version 24, with migrations from 2. The fixtures `tests/fixtures/save-v24-*.json` load and
  round-trip.

## A1. Audit of the strategic layer (what the code does today)

| System | Where | What exists | Gaps and problems |
|---|---|---|---|
| Campaign time | `campaign.ts` `advanceDay`; the clock in `hubView.ts` | One daily tick drives construction, research, healing, guards, morale, raids, containment, world, council, Chaos, contracts, leads and staff. The UI clock adds hours and calls `advanceDay` at 24. Breaches and outbound arrivals pause it. | The clock lives in the view (time only runs while the World tab is open). Pauses are spread across the code (`notices`, `pendingBreach`, `clockBlocked`). |
| Commands and validation | `canX`/`X` pairs in each campaign module (`canBuild`/`build`, `canRepair`/`repair`, `assign`, `canHire`/`hireCandidate`…) | Every action is validated by its `can*` function before it applies. | No single command entry point. The view calls the functions directly. No record of what was done. |
| Events and notifications | `log(c, text, kind, pauseTab)`, `c.notices` | A bounded site log (100 entries). Notices pop up and stop the clock. | No severity model beyond `kind` strings. No "why it matters / what to do / where to go". No decision queue. |
| Facilities | `base.ts` | Typed facilities with stable ids, level and slot positions, construction, upgrades, repairs, demolition, power tiers, adjacency, damage and wrecks. | Data is renderer-independent (good for 3D). The cross-section is small and the side panel mostly empty. |
| Containment | `containment.ts`, `procedures.ts` | Breach risk from maintenance, depth, power, staff, alert and the grade fit; routines per anomaly; knock-on effects; inert objects; transfers. | Distinct per anomaly. Untested end to end before this overhaul. |
| Research | `research.ts` | 111 projects in 15 branches; researchers assigned per project; breakthroughs, inspirations, tests on anomalies; field specialists (+25%). | About 68 of 111 projects are numeric bonuses. Idle researchers are common (see the simulations). |
| Engineering | `research.ts` (orders, refits), `base.ts` (engineers) | Workshop orders with cost and days; refits; trades (mason, electrician, machinist, rigger) give a chance of extra progress. | No per-job engineer assignment; manufacturing is a queue with a fixed engineer each. |
| Personnel (MTF) | `campaign.ts`, `condition.ts` | Ranks, classes, perks, traits, bonds, fatigue, injuries, therapy, medals, a memorial. | Strong. |
| Personnel (staff) | `people.ts` | Named researchers and engineers with faces, fields, trades and bios. The counts stay the rules' truth. | Researchers caught in a breach mission are anonymous (`setup.researchers` is a count). A staff member's tactical death doesn't propagate to a named person. |
| Economy | `ledger.ts`, `council.ts` grant, `world.ts` fronts | Monthly grant, fronts, upkeep, salaries, a ledger by category. | The simulations show tight money for active play and debt for neglect (see A4). |
| O5 Council | `council.ts` | Standing tiers, directives, requests, offers, transfers, crises, audits. | Works. Standing falls to 0 under passive play by day 90 to 180. |
| World and incidents | `geo.ts`, `world.ts`, `taskforces.ts`, `leads.ts`, `contracts.ts` | Regions, exposure, collapse, travel, weather, night, investigation, field ops, cover stories. | Incident spawning is mostly random rolls each day. |
| Chaos Insurgency | `chaos.ts` | Agenda with steps, plans the player can disrupt, moles, sabotage, inquiries, threat. | Plans are chosen by weighted rolls, not by reading Site-19's weaknesses. |
| GOC, GRU-P | `containment.ts` `gocMaybe`, `rivals.ts` | Appear on recoveries, compete tactically. | No strategic presence of their own. |
| Save and load | `save.ts` | Three slots, export and import, migrations 2→24. | Pre-v24 fixtures don't exist (only the migration code). |
| Strategic UI | `hubView.ts` (1,787 lines of string templates), `styles.css` | Six tabs; resources as two rows of pill chips; long text panels. | Weak hierarchy, a lot of scrolling, small centrepieces, a dashboard feel. |
| Tactical integration | `buildSetup` → `MissionSetup`; `missionResult` → `applyResult` | A clean data hand-off both ways. Deaths, wounds, XP, gear, exposure, standing and anomalies all carry over. | Breach researchers are anonymous (see above). |

**Renderer independence:** `src/campaign/*` imports nothing from `src/ui`, and nothing in it touches the DOM except
`localStorage` in `save.ts`, which is guarded. The new simulator below runs the whole campaign in Node.

## A4. Strategy simulations (`src/sim/campaignSim.ts`, `tests/unit/sim.test.ts`)

Seven scripted strategies (balanced, research, security, economy, aggressive, minimal, poor) run the real campaign
code for 30, 90 and 180 days with a fixed seed, checking the invariants (`src/campaign/invariants.ts`) every day.
Results at seed 7, before any balance change:

```
balanced   180d  funds  99 (min 24)    standing 51  exposure 20  threat 3   breaches 2  incidents 35 (missed 0)  research 23  idle-res-days 382  quiet 147
research   180d  funds  49 (min -187)  standing 40  exposure 34  threat 0   breaches 6  research 17
security   180d  funds 174             standing 54  exposure 32  threat 0   breaches 3
economy    180d  funds 1128            standing 34  exposure 32  threat 0   breaches 2  research 0
aggressive 180d  funds 74              standing 98  exposure 12  threat 0   breaches 0  research 26
minimal    180d  funds 91              standing 0   exposure 41  threat 82  breaches 8  missed 9
poor       180d  funds -347            standing 0   exposure 83  threat 84  breaches 9  missed 21
```

**Findings:**
1. **Idle waiting dominates.** About 80% of days produce no log entry at all ("quiet" days), under every strategy.
2. **Researchers sit idle a lot** (idle researcher-days in the hundreds), mostly because starting a project costs
   money the active strategies don't have.
3. **Money:** active play runs close to zero; neglect runs into debt; hoarding (the economy strategy) accumulates with
   nothing to spend it on.
4. **Pressure works:** passive play loses standing (0) and lets threat climb to over 80; the aggressive strategy keeps
   threat at 0 and standing near 100.
5. **A bug, found by the invariant check:** after a researcher was lost or sent away, more researchers stayed
   assigned than were on staff until the next day's tick. Fixed with `fitAssignments`, called wherever staff leave.

## Tasks

| # | Task | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|
| S-A1 | Audit | none | The table above | [x] |
| S-A2 | Baseline tests and screens | none | Recorded above | [x] |
| S-A4 | Headless strategy simulations, 30/90/180 days, 7 strategies | none | Run in `npm test`; invariants clean | [x] |
| S-L1 | Campaign invariants | none | Checked daily in the simulations | [x] |
| S-B1 | Command layer with validation and gameplay events | none | Hub actions go through `dispatch()`; rejected commands change nothing; tested headless | [x] |
| S-H1 | Notification severity (routine, important, critical) with what, why, what changed, where | S-B1 | Critical events pause; tested | [x] |
| S-H2 | Director's Briefing: decision queue derived from state | S-B1 | Items by urgency, each opening its screen; no stale entries; tested | [x] |
| S-C1 | Visual style guide and design tokens | none | `docs/UI_STYLE_GUIDE.md`; tokens in CSS | [x] |
| S-C2 | Representative screen: Site-19 cross-section centrepiece | S-C1 | Functional build, repair, staff and containment from the screen; browser test | [x] |
| S-D1 | Persistent staff identities in tactical missions | none | Named researchers in breach missions; deaths propagate; tested | [x] |
| S-D2 | Research and engineering depth (assignments, specialties, experiments) | S-B1 | See notes | [~] |
| S-D3 | Economy transparency and Council tradeoffs | S-B1 | Ledger and upcoming obligations visible; tested | [x] |
| S-D4 | Goal-driven Chaos Insurgency and GOC | none | Plans chosen from Site-19's weaknesses and their own resources; tested | [x] |
| S-E1 | Screen redesigns: Command, World, Research, Engineering, Personnel, History, Credits | S-C2 | Browser workflow tests | [ ] |
| S-E2 | Onboarding with Krista Carter | S-E1 | Persisted steps; skippable; tested | [ ] |
| S-E3 | Strategic inspector (developer tools) | S-L1 | Debug panel shows state, risks, faction plans, invariants | [ ] |
| S-E4 | End-to-end campaign test | all | The 17-step sequence in the brief | [ ] |
| S-K | Balance and pacing from simulations | S-A4 | Documented changes and re-run results | [ ] |

## Architectural decisions

- **SD1:** the campaign layer stays plain data plus functions (no framework). The commands added in S-B1 are thin
  validated wrappers over the existing `can*`/`*` pairs, not a rewrite.
- **SD2:** facilities keep their stable ids and their (level, slot) positions as the logical layout. Any renderer,
  2D or 3D, draws from that.

## Log

- A1, A2, A4 and L1 done. Files:
  - `src/sim/campaignSim.ts`
  - `src/campaign/invariants.ts`
  - `tests/unit/sim.test.ts`
  - `fitAssignments` in `research.ts`, called from `people.ts`

- B1, H1 and H2 done (commit "Strategic overhaul B"):
  - `src/campaign/commands.ts`: `dispatch()` validates with the existing `can*` checks; a rejected command changes nothing.
  - `src/campaign/briefing.ts`: the Director's Briefing, derived from state each time it is shown.
  - Log entries carry a severity (routine, important, critical) and the screen they belong to.
- C1 and C2 done:
  - `docs/UI_STYLE_GUIDE.md` and `src/ui/hub.css` (tokens, panels, readouts, lamps, meters, briefing items).
  - Header: one readout strip; campaigns, saves, sound and credits moved into a System menu.
  - Site-19: the cross-section takes about two-thirds of the width; with nothing selected the side panel shows site
    operations, containment risk over 30 days per wing, and work in progress.
  - Command: the Director's Briefing leads; each item opens its screen. Situation, Council, finances and a
    severity-marked site log sit beside it.
  - Credits and licences screen (`src/ui/credits.ts`): SCP authors where confirmed, the rest marked "to be confirmed".
  - `tests/strategic.e2e.cjs`: header, briefing order and navigation, site overview, build and repair from the
    screen, a rejected command leaving the campaign unchanged, credits, no horizontal scroll at 1280 and 1920.
  - The test hook (`window.__site19`) exposes `dispatch`, `briefing` and `invariants`.
- D1 done:
  - A breach's setup names the Site-19 researchers in the wing (`inTheWing` in `campaign.ts`): researchers whose field
    studies that anomaly first, then the longest-serving, with no dice.
  - The mission uses those names, and the optional objective lists them. The result reports who was lost by name,
    and `applyResult` removes exactly those people and records them among the lost.
  - Fix: a researcher, survivor or record destroyed in a mission no longer counts as a civilian death, which used to
    add regional exposure.
  - `tests/staff.e2e.cjs`.
- D3 done:
  - `src/campaign/forecast.ts`: `obligations(c, days)` lists scheduled money (each monthly settlement's grant, fronts
    and upkeep, emergency repayments ending, contract pay, the O5 inspection's result as things stand) and
    `projection(c, days)` gives the balance after each settlement and the first day of projected debt. Pure.
  - The Finances panel shows the next 90 days, one row per date, with the parts of each settlement underneath and
    a bar per settlement for the projected balance.
  - The Director's Briefing warns "Debt projected by …" when the scheduled money alone runs out within 90 days.
  - Council tradeoffs already exist (emergency appropriation for standing, offers and transfers); the forecast now
    shows what an appropriation's repayment does to the next grants.
  - `tests/unit/forecast.test.ts`: agrees with the settlement the books record (within $3k, since standing and
    exposure can drift during the same day), repayments end on schedule, debt is projected, purity, briefing warning.
- D2 (experiments) done; engineering depth still open:
  - Experiments are distinct from research: one at a time across Site-19, run on the anomaly's own cell with
    D-Class and chosen watchers, paid up front. Seven new ones, one for each of SCP-049, 106, 096, 012, 939, 035
    and 682, each with its own way of going wrong (`TestDef.fail`, passed to `cellWork`).
  - A finished experiment on an anomaly speeds every project in its research branch by 25% (`studyBoost`),
    stacking with the field specialist bonus. SCP-173's three tests still open projects instead.
  - The Research tab's test log lists the experiments for each anomaly held.
  - `tests/unit/experiments.test.ts`.
- Determinism fix: `newCampaign` reseeded from `Math.random()`, so "seeded" simulations and tests began from a
  different campaign every run. It now takes `seed`; the simulator and the tests pass one. `sim.test.ts` checks
  that the same seed gives the same run, and runs 15 scattered seeds for every strategy.
- Bug found by a 1,050-run seed sweep: losing an engineer mid-job left more engineers busy than on staff, and the
  header showed a negative count. Now short-handed work slows (it moves on a day with the chance of engineers there
  over engineers needed), nothing new can start, the header shows "short N", and the briefing explains it.
- D4 done:
  - The Insurgency's monthly operations are chosen by `planScores(c)` (pure): each operation is scored from
    Site-19's weaknesses and the Insurgency's strength, with a reason. For example:
    - a raid scores higher with few guards posted, Epsilon-11 away, normal alert or a high agenda;
    - sabotage scores higher with occupied wings, a power shortage or moles inside;
    - agitation scores higher with low D-Class morale;
    - infiltration goes after the richest front.
  - The top three are taken after a random weighting, so the choice is not certain.
  - Known operations show the analysts' reading of why they were chosen.
  - The GOC's chance of turning up for an anomaly (`gocInterest`) follows the region's exposure, 10% to 40%.
  - `tests/unit/factions.test.ts`.

## Known issues

- The accept4c GRU-P flake (pre-existing).
- accept4b fails intermittently (SCP-035 possession, SCP-012, a crash reading a spawn point): 3 of 6 runs failed on
  the tactical-overhaul commit d1145d0 too, so it predates this work. The tests place units on generated maps that
  differ between runs.
