# Phase 6: anomalous operations and containment systems

Status record for Phase 6. The design brief's master document (`SCP-X_Master_Game_Design_Context.txt`) was not in the
repository on any branch, so this phase follows the continuity already in the code and in `docs/DESIGN.md`,
`docs/ROADMAP.md` and the progress records, and marks every new rule's source in the registry.

## Audit (Stage A)

| System | Found | Phase 6 change |
|---|---|---|
| SCP mechanics | 173 (`scp173.ts`), 049 (`scp049.ts`), 106 (`scp106.ts`), 096/012/939/035/682 (`scp4b.ts`), 610 (`fire.ts`) | Kept; behaviour now described by the registry; 096 marks persist; 106's taken are missing, not dead |
| Anomaly data | Scattered: `SCP_DEFS`, `PROCEDURES`, ids checked inline | `data/anomalies.ts` registry for 173, 049, 096, 106, 610 |
| Containment actions | Abilities (calm, hood, lockdown, doors, pickup...), modes (stare, drag, seal), placed kit | `game/containment-actions.ts` describes each procedure and calls the real control's check |
| Objectives | Per-kind end rules in `turn.ts checkEnd`, optional objectives | `game/objectives.ts`: tiers, hidden, dynamic, partial; used by investigations and variants |
| Investigation | Strategic only: Intel or a field agent reveals the anomaly's name | Tactical investigation missions, evidence, lab analysis, staged identification |
| Site containment | Wings by grade, breach risk with reasons, transfer to Site-17 | Chamber features per anomaly; dock holding with placement choices; temporary holding |
| MTF specialties | Version 12, three techniques marked incomplete | All three built (below) |
| Autonomous ops | Capability tags against kind objectives | Anomaly rules, file knowledge and variant objectives; objective-level outcomes |
| Storylines | None | `campaign/storylines.ts` |
| Save/load | JSON in local storage, versioned migrations | New state is optional and filled in by `ensureDossier`; no version bump needed |

## What is built and playable

- **Registry** (`src/data/anomalies.ts`): object class, threat and difficulty kept apart; source URL; continuity notes
  marked source, adaptation or original; instances (SCP-173 has the article's Site-19 instance and the SCP-X
  Provisional Site-11 instance); properties with evidence and research that reveal them; capabilities; gunfire
  effect; procedures; transport; chamber grade and features; breach factors; mission variants; hands-off needs.
- **Investigation missions** (`kind: "investigation"`): evidence placed in the incident's rooms; *Examine* learns now
  (and SCP-096's photograph marks the examiner); *Recover* bags it unseen for lab analysis; bodies are real bodies
  that SCP-049 can raise and the team can carry out; locals can be questioned; a good look identifies the cause.
  Winnable with no combat. Hidden objective (contain it here) appears on identification; a dynamic objective appears
  when someone is marked. The log, banners, legend and SCP-096's face wedge do not name or reveal an anomaly before
  it is identified or the hazard is known.
- **Knowledge gating**: capture kit is issued only for procedures whose basis is known (no hood without knowing about
  the face). Missions without intel behave as before.
- **Objectives and outcomes**: every mission result carries a tactical outcome (secured, temporary, isolated,
  evacuated, evidence, escaped, failed, abandoned) shown in the debrief with each objective.
- **Variants**: SCP-610 quarantine perimeter (hold the zone edge for 10 turns), survivor evacuation, sample recovery;
  breach with staff trapped (bring them out; the anomaly may be left shut in: temporary containment).
- **Contamination** (`game/contamination.ts`): flesh and residue are dirty ground; people and their kit carry
  contamination; residue tracked onto clean ground can take root while the core lives; dirty kit is incinerated at
  the end unless bagged; contaminated operatives spend 7 days in quarantine.
- **Completed techniques**: Controlled crossing (staffed crossing in an isolation line washes people through),
  Equipment isolation (bags dirty kit on clean ground), Protected advance (partner spends an action covering;
  reaction shots at the mover −20; the partner returns fire on each shooter). The `incomplete` flags are removed.
- **Dossier** (`campaign/dossier.ts`): per-instance knowledge and location, lab analysis time from researcher count,
  research confirming properties, identification stages, history; SCP-106's missing (found by a search operation or
  listed lost after 60 days); SCP-096's marked; uniqueness guard used by sightings.
- **Strategic placement**: a recovered anomaly goes straight to a chamber that meets its grade and features, or waits
  at the loading dock (daily breakout chance) for a decision: temporary or emergency wing, Site-17, or another
  site's help; the Council transfers it after 3 days. Missing chamber features multiply breach risk ×1.5 each, listed
  in the reasons. Placement goes through the command layer (`placeAnomaly`).
- **Storylines** (`campaign/storylines.ts`, founded campaigns only): SCP-049, 096 and 106 open with an investigation;
  outcomes branch into the encounter (with intel), a marked operative's deadline (SCP-096 kills them if not
  contained in time), or the world moving on (missed twice: Site-19's own people take it). SCP-106's missing surface
  as search operations. SCP-610 spawns quarantine, evacuation and sample operations, a held line pauses its growth
  for 30 days, and burned regions see it return.
- **Hands-off**: anomaly gunfire rules and file knowledge change the odds and cap them when no procedure is known;
  investigations, variants and 106 losses produce the same persistent results as played missions.
- **Advisors**: Carter (marked and missing personnel), Bell (evidence in the labs, unknown causes, hazards learned),
  Russo (dock holding, temporary holding, placement) react to these states.

## Auto end turn

Once nobody on the team who can act has an action left, the turn ends by itself after 1.2 seconds, so the last action
is seen and a free action (Face, Eyes down) can still be started. It waits while a follow-up order is open (leading
SCP-049 or a hooded SCP-096, aiming a throw, picking a door), ignores panicked operatives' actions, re-checks when the
timer fires, and is off in the tactical lab. Rules: `outOfActions()` and the after-action hook in `game/turn.ts`;
abilities and squad techniques call the same hook.

## Tests

- `tests/unit/phase6tactical.test.ts` (headless): examine versus bag; a no-combat investigation win; SCP-096's
  photograph marking, the dynamic objective and its arrival; SCP-049 raising an unrecovered evidence body while the
  carried one is denied; dirty ground, residue and the staffed crossing; the three completed techniques; Protected
  advance's −20; knowledge-gated hood.
- `tests/unit/phase6campaign.test.ts` (headless, real buildSetup → createMission → missionResult → applyResult):
  the two SCP-173 instances; investigation instead of a capture order and no duplicate; evidence to file to
  encounter with intel and lab analysis; SCP-096's mark, deadline and death when unanswered; dock holding,
  temporary holding, missing-feature breach risk and the Council's transfer; SCP-106's missing listed lost after 60
  days; SCP-610 variant operations and a held line pausing growth; hands-off odds capped without knowledge; JSON
  round trip.
- `tests/phase6.e2e.cjs` (browser): the full loop from report to debrief to placement and reload, with screenshots
  in `tests/out/phase6-*.png`; checks that nothing names the anomaly before identification.
- Existing suites: the specialty and tactical suites now assert the three techniques are built; `phase5.e2e.cjs`
  had a hard-coded lowercase checkout path and now resolves `dist/` relative to the test.

## Not built in this phase

- A playable SCP-106 pocket dimension. People taken are kept as missing and recovered through search operations.
- Era finales and the full 1951–2026 historical chronology of storylines; only the framework and four arcs.
- Investigation maps are the existing field maps with evidence placed in their rooms, not purpose-built scenes.
- Facility defence, hostile raids, escort and multi-site emergencies were not changed beyond what existed.
- Surveillance-camera contamination for SCP-096 (film evidence exists in the registry; no camera-feed mechanic).
- SCP-173 mission variants beyond the staff-trapped breach.
- Recovery Drill's bleed-out timer (still marked incomplete from Version 12).

## Source conflicts and adaptations

- SCP-049's gunfire stagger and one-turn Calm, SCP-096's face wedge and one-turn scream, SCP-106's turn under the
  floor and one-turn feeding, and SCP-610's tile spread are SCP-X adaptations, marked as such in the registry.
- First-sighting years (049 in 1952, 096 and 106 in 1953) come from the existing SCP-X chronology, not the articles.
- The Provisional Site-11 SCP-173 instance is original to SCP-X; the article's instance stays at Site-19.
