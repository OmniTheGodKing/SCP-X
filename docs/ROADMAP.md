# Roadmap

Work runs in phases. Nothing in a phase is built until it has been laid out and agreed.
Order and contents are open to change.

## Done

- Tactical layer: SCP-173 AI, staring and blinking, dragging, sealing, cover and sight, classes, perks, traits, weapons, armor, grenades, Insurgency AI.
- Site-19: base building, containment, research, workshop, personnel, prisoners and Intel.
- World map: regional exposure, fronts, travel, manhunts, cover-ups, strikes, amnestics.
- Site Security guards, immediate breaches, alert levels, SCP-173 escaping through the hatch.
- Debug menu, running clock with pause and speeds (controls on the World tab).
- Phase 3A: time only passes on the World tab; no D-Class on cover-ups; tighter economy (about $200k funding,
  salaries of $10k per operative and $5k per guard, later research at 1.5× cost); day changes no longer close an
  open dropdown; the debug calendar jump runs one real day so expiries happen.
- Field recovery, and SCP-049, "The Plague Doctor" (Euclid): first sighted at a random point in 1952; kills by touch,
  raises any fresh body it can see as SCP-049-2 in one turn, staggered but not hurt by gunfire, calmed and led into
  containment.
- SCP-106, "The Old Man" (Keter): first sighted at a random point in 1953; walks through walls, leaves rot that costs
  double to cross and deals 1 damage, takes victims to its pocket dimension (25% come back), sinks after a grab or a
  hit. Recontained with bait in the container (the femur breaker). Keter-grade wings now need research.

Design rule: anything done with a facility is done in that facility's panel on the Site-19 tab (guards at their
Security station, training at the range, therapy at psychological services, prisoners at holding cells, D-Class at
the barracks, engineers and building at the workshop, researchers at the lab).

Design rule: context actions (Calm, Dose, Secure, Restrain, Lock the hatch) only appear on the action bar when
they can be used, to keep the bar clear.

Each new anomaly's author is checked on the SCP Wiki and credited under CC BY-SA 3.0.

## Phase 3B (done): research expansion (lined up with XCOM 2 and War of the Chosen)

Part 1 (done): lab projects (psychological screening, field medicine, SCR-300 and AN/PRC-25 radios, AN/PVS-2 night
optics, Class-B amnestics, automated cleaning, cell lock override, front company accounting, signals intelligence);
studies that need mission material like XCOM autopsies (Insurgency weapons, prisoners, Intel gathered, SCP-049-2
tissue, pocket dimension survivors) with a new Insurgency branch; breakthroughs and inspirations; training range
purchases like the Guerrilla Tactics School (squad size 5 and 6, guard training); situational mission actions only
shown when usable, with a first-time hint.

Part 2 (done): weapons
- Tiers like XCOM's conventional, magnetic and beam: service (era models by year), Foundation special issue (+1 damage,
  +5 aim, after captured weapon analysis), experimental electromagnetic "coil" weapons (+2 damage, ignore 1 armor,
  after the SCP-106 electromagnet work).
- Sidearms: an M1911 in a second slot for everyone, used when the main weapon is empty.
- M79 grenade launcher (from 1961): grenadiers throw 4 tiles farther.
- Ammunition built in the workshop, one type per operative: armor-piercing, tracer, hollow-point, sedative (downed
  Insurgents and D-Class are always captured). Incendiary waits for fire.
- Attachments: suppressor (shots don't alert anything), bayonet (3 damage to an adjacent enemy, no roll), improved
  sights (+10 aim).

Part 3 (done): armor and kit
- Heavy weapons (heavy armor only): M20 bazooka, M72 LAW (1963); the M2 flamethrower waits for SCP-610.
- Each armor tier in light (+1 HP, +1 move), medium (the current vest) and heavy (+4 HP, 2 armor, −1 move, carries
  heavy weapons) versions; a hazmat suit (immune to SCP-106's rot) and a later lead-lined suit (SCP-106 needs two turns
  to take the wearer).
- Utility items: medkit, CS gas grenade, field camera (photographing an anomaly gives research progress). Flares wait
  for night missions; the incendiary grenade waits for fire.
- Workshop projects like XCOM's Proving Ground: guard flak vests, restraint kit (Secure and Restrain from 2 tiles,
  +1 Intel per prisoner), amnestic darts (Dose from 4 tiles).
- Facility upgrade: expanded barracks (15 D-Class).

Done alongside part 1
- Tearing down facilities: 1 engineer, half the build time, 25% salvage; not Command or an occupied wing.
- Depth bonus: containment wings are 10% less likely to breach per level below the top, and 5 points less likely to
  escape when the guards handle a breach alone, but Epsilon-11 takes a turn longer per level to arrive.

## Phase 3C (done): tactical depth

From the XCOM 2 comparison, plus harder breaches. Order: (1) harder breaches, hunker down, carrying and exits
(done); (2) concealment and enemy pods (done); (3) maps assembled from room plots (done); (4) night missions, escorts and
retaliation (done); (5) doors and sirens (done).

- Breaches: 1 to 3 researchers are caught in the wing. Walk someone next to one and they follow that person to an exit.
  Dead researchers come off the staff count; each rescue is a small sanity boost.
- Breaches: loose D-Class now matter. Restrain (its own action, 1 action, adjacent, only shown when possible) sends
  them back to holding; killing one removes them from storage; one who reaches an exit is lost and adds +3 exposure in
  the Eastern US. The breach alarm opens the D-Class block, which a Cell lock override project can prevent.
- Escort missions as the second half of distant field captures: the convoy home, with an ambush chance.
- Night missions (set by the hour on the clock): shorter sight range, flares as an item.
- Retaliation: the Insurgency attacks a town where you just captured something, to draw your squad out.
- Blast doors sealed from the Wing C panel (up to 2; SCP-106 ignores them); the breach siren, which blocks quiet-turn
  sanity recovery but hides gunfire from SCP-173 (and will draw sound hunters like SCP-939 later).

- Concealment: strikes and cover-ups start hidden; firing or being seen breaks it. Witnesses only run once it's broken.
- Enemy pods: Insurgents in fire teams that activate together when spotted, then scramble to cover.
- Hunker down: double the cover bonus for a turn.
- Procedural maps built from room plots, so every wing, town, farm and port is different.
- Carrying a downed ally or a body (which also keeps it away from SCP-049).
- Exfiltration through the exit tiles, so a mission can be abandoned partway and whoever gets out survives.

## Phase 3D (done): SCP-610, "The Flesh that Hates" (Keter), and fire

- Fire: burning tiles deal 2 damage a turn (double to SCP-610), spread into desks, crates and flesh, and set off fuel
  drums, which now appear in storerooms. Incendiary grenades and rounds, and the M2 flamethrower (heavy armor).
- SCP-610 on the world map from 1954: an outbreak in one region adds exposure every week and grows a stage every two
  weeks without a mission (up to 5). Each win burns it back a stage; a loss feeds it. Only Epsilon-11 faces it.
- Outbreak missions: flesh spreads from a core each turn; only fire hurts the core. Anyone who ends a turn on the flesh
  without a sealed containment suit is infected, and turns 5 turns later, permanently lost, even if they left. Its
  instances infect with every blow, and tear a containment suit 60% of the time.
- Author credit for SCP-610 still to be confirmed.

## Phase 3E: a living Site-19 (done)

- (Done) Security stations defend their whole level; two ranks above the perk tree. Ranks follow the 1951 US Army
  enlisted ladder: Private, Private First Class, Corporal, Sergeant, Sergeant First Class, Master Sergeant, Sergeant Major.
- (Done) Guards who pass Epsilon-11 selection join as Privates; Selection cadre research makes them Privates First
  Class.
- (Done) Research only appears once everything behind it is in place (finished prerequisites, the test, the anomaly
  held, the first material brought back, the year), and many projects also wait for missions won (2 to 6) or a
  milestone (first power failure, a veteran guard, first Insurgency fight, first fire). New projects get a notice.
  12 projects are open at the start.
- (Done) SCP-173 tests are paid up front ($20k/$30k/$50k) and take researcher-days (5/8/12) like other research; the
  cell work happens on the last day, watched by the guards chosen at the start. One test at a time.
- (Done) D-Class morale: overcrowding, deaths and termination orders lower it, a recreation room raises it, and below
  30 the block can riot. A riot is a guards-only mission on the D-Class block map (restrain or kill the rioters), or
  can be left to Site Security for a few D-Class dead.
- (Done) Monthly D-Class order, set in the barracks panel: terminate (default, canon), keep them all ($2k each), or
  release them (costs amnestics).
- (Done) Staff incidents: about once in two months in three, one of 8 events (a researcher's breakdown, a guard asleep
  on post, an injured engineer, an armoury mole, a researcher's discovery, a letter from home, a short shipment, a
  visiting researcher) comes up on the Command tab with two choices. Unanswered for 7 days, the second is taken.
- (Done) Power failures: generators fail (1% a month, 3% next to a damaged facility, winter storms 2%). While short of
  power, every cell has a 10% chance a day of failing outright. A wrecked containment wing cracks open 20% of the time.
  "Backup generators" research keeps the wings powered.
- (Done) Emergency evacuation from a damaged or unpowered wing: into a free wing ($10k, double the risk), or to Site-17
  for 30 days ($50k) when nothing is free.
- (Done) O5 inspections about every 6 months with 14 days' warning (a live checklist on the Command tab): $20k for
  each of 5 checks passed, $50k docked for failing 3 or more.
- (Done) Era news: 31 real headlines from 1951 to 1970 in the monthly report. The Korean armistice (East Asia funding
  +10% for a year), Sputnik (research 10% cheaper for a year), the Cuban crisis (exposure rises 50% faster in the
  Eastern US and Latin America for 3 months) and the Gulf of Tonkin (weapons research 20% faster from then on).
- (Done) Incident reports in the Foundation's style after every mission, built from what happened, kept in an Archive
  on the Command tab (newest open, older ones folded).
- (Done) Personnel files: hometown, age and a line of backstory, service history (missions, kills, wounds, seals,
  anomalies faced), and renaming operatives and callsigns. Medals with small bonuses: Sealed in, Iron nerve, Purple
  Heart, Survivor, Distinguished service.
- (Done) Retirement: Master Sergeants and Sergeants Major can retire as trainers at a working training range (recruits
  arrive as Privates First Class, at most 2 trainers); anyone else leaves with an honourable discharge. Veterans with 10+ missions may ask
  to retire as a staff incident; talking them out of it risks Nightmares after every mission.

## Phase 3F: defending Site-19 (done)

- (Done) Insurgency raids on Site-19, from early 1952: a new surface compound map (gatehouse, motor pool, offices,
  barracks, and the lift house). Site Security holds the compound; Epsilon-11 comes up the lift (turn 8 at normal
  alert, 5 heightened, 3 full). An Insurgent who spends a turn at the lift doors forces them open; win by stopping
  them all or holding to turn 14. Raids come more often with Insurgents in holding or just after a cell is broken.
  Losing frees the prisoners (or empties the payroll safe), wrecks a surface building and adds exposure. Can be left
  to the guards, with the odds shown.
- (Done) Guard equipment: Guard flak vests (already in), Guard rifles (the squad's service rifle, after the first
  Insurgency fight) and Perimeter alarms (after the first raid: guards start on overwatch, Epsilon-11 2 turns sooner).
- (Done early) Guard posts: each guard is posted to a Security station and hired there.

## Phase 3 priority: interactive World Map / Geoscape

The World Map should become the main strategic screen and the normal starting point for field missions, closer to XCOM's Geoscape. This is an expansion of the existing regional exposure, fronts, travel, manhunts, cover-ups, strikes and amnestics systems, not a replacement for them. Keep it 2D in Phase 3; the 3D globe remains Phase 4.

- **Launch and manage missions from the map.** Select an active incident or location, inspect its briefing, choose a response team and loadout, then deploy directly from that location. After the mission, return to the map with the results and consequences applied.
- **Make locations legible and interactive.** Show regions, known sites, towns, active incidents, anomaly outbreaks, Insurgency activity, manhunts, fronts and discovered leads with distinct icons and status indicators. Selecting a marker opens useful information and available actions.
- **Show time and travel clearly.** Display the current date, time controls, travel routes and estimated arrival/duration where relevant. Missions and operations should have understandable deadlines; advancing time should visibly advance travel, research, incidents and threats.
- **Add world interactions beyond launching combat.** Depending on what is known and unlocked, allow the player to investigate a lead, scan a region, gather intelligence, establish contact, conduct surveillance, send a covert team, cover up an incident, pursue a manhunt, or dispatch a team to recover a lead without necessarily starting a full tactical mission.
- **Give the player meaningful strategic choices.** Some leads should be uncertain or incomplete; spending time or Intel to investigate can reveal threat level, likely opposition, rewards or risks before committing a squad. Acting late should let situations worsen rather than keeping every mission static.
- **Support simultaneous world activity.** Multiple incidents and operations can be active at once, with different deadlines, travel times and consequences. The player should have to choose what to address, consistent with the O5 Council and Insurgency systems.
- **Show regional state at a glance.** Exposure, Foundation presence/front status, active threats and recent activity should be readable without opening several unrelated panels. Provide filters or toggles when the map gets crowded.
- **Preserve strategic continuity.** New sites and regions become available through contact, research, Council requests or discovered leads. World actions should feed into the existing economy, research, exposure, Council standing and faction-threat systems rather than feeling like isolated minigames.
- **Acceptance check:** a player can begin at the World Map, identify what is happening, decide what deserves attention, select and prepare a response, launch it, and understand the consequences on returning, without needing to navigate to a separate mission menu.

## Phase 3 priority: tactical map readability

- Add distinct but restrained 2D terrain textures for interior floors, concrete, grass, dirt, asphalt and rubble as appropriate.
- Clearly distinguish walkable tiles, low/full cover, walls, doors, windows, hazards and extraction points.
- Improve tile boundaries, contrast, unit silhouettes and overlays for selection, movement, line of sight, flanking and available actions.
- Give labs, corridors, offices, storage rooms and containment areas recognizable floor patterns and props.
- Prioritize readability over realistic texture detail; retain map semantics for the Phase 4 3D conversion.
- Acceptance check: players can identify cover, routes, threats and selected units at normal zoom without trial-and-error clicks.

## Phase 3G: recruiting Epsilon-11 (XCOM style) (done)

- (Done) A recruit pool in the Command facility's panel: 4 to 6 candidates a month, men and women, from 13 special
  forces units opening by year (US Army Rangers, Navy UDT, Royal Marines Commandos, SAS, Special Boat Service from 1951;
  US Army Special Forces 1952, New Zealand SAS 1955, Australian SAS 1957, Navy SEALs 1962). Each has a unit-fitting
  hometown and backstory and a unit lean (+6 aim, +15 sanity, +1 HP or +1 move). Standard $100k, Veteran $140k
  (arrives as PFC), Elite $190k (PFC and Steady).
- (Done) Liaison research: Allied liaison office (after 3 wins) opens the French Foreign Legion and the Gurkhas (later
  Sayeret Matkal and the Jægerkorps) and adds 2 candidates a month; Joint training exchange (after 6 wins) makes
  Veteran and Elite candidates far more common. O5 standing can add to this in Phase 3H.
- (Done) Individual designs: a flat, layered SVG portrait for every operative (skin tone, hair style and colour,
  facial hair, scar, headgear by unit: SAS sand berets, green berets, the Legion's white kepi, Gurkha slouch hats).
  Editable on the Personnel tab under Appearance. Built from plain data (src/data/looks.ts) and drawn in one file
  (src/ui/portrait.ts) so the style can be replaced, and the data can dress the 3D models in Phase 4.
- (Done) The memorial keeps each fallen operative's portrait, greyed out.

## Phase 3H: the O5 Council and strategic choices

- Monthly O5 orders (objectives with rewards or penalties).
- Council standing, separate from exposure, that affects funding and requests.
- Several incidents at once where only one can be answered (XCOM 2 guerrilla ops).
- Mission rewards beyond money: engineers, researchers, D-Class, recruits, gear.
- Establishing fronts: regions must be contacted with money and Intel before the Foundation can operate there.
- The director's standing with the Council unlocks requests (more funding, a second MTF, Keter transfers); failures
  bring audits.
- Inbound transfers ordered by the Council (another site closing or damaged): accept for funding and standing, then
  escort it in. Outbound transfers by your choice (a damaged wing, or a research site paying for an anomaly).
- Trading held anomalies with other sites for funding or research.

## Phase 3I: Insurgency threat and other groups

- An Insurgency threat level that grows as cells go unchecked (the doom clock).
- Insurgency operations announced in advance that can be countered (XCOM 2 dark events).
- A recurring named Insurgency field commander who escapes and returns (XCOM 2 Chosen).
- Enemy reinforcements arriving mid-mission on long strikes.
- Insurgency unit types: riflemen, a sniper with long overwatch, a demolitions man who breaches walls, an officer who
  buffs those near him. Some carry one-off anomalous items that can be captured and studied.
- Insurgency goals: stealing anomalies in transit, recruiting D-Class, planting moles among staff.
- The Global Occult Coalition: a rival that destroys anomalies; slow responses let them "resolve" incidents (no exposure,
  no capture, the Council displeased).
- GRU Division "P": the Soviet anomalous unit as a Cold War rival in Europe and East Asia.

### Global Chaos Insurgency model

- The Chaos Insurgency is **one global opponent with a coherent strategic agenda**, not independent regional factions. Its operations may occur in different regions, but pressure, planning and major objectives are coordinated globally.
- Regional incidents, fronts and intelligence leads represent where the global organization is acting; success or failure should influence its overall threat level and future operations.
- Keep the recurring commander and announced operations tied to this global adversary. Avoid creating separate regional doom clocks or autonomous faction economies unless deliberately added later.

## Phase 3J: more task forces, field work and other sites

- MTF Eta-10 "See No Evil" (blindfolds and video goggles) assigned by the Council once you hold two or more anomalies
  or reach a standing threshold: a second squad, so two incidents can be answered at once.
- MTF Nu-7 "Hammer Down": a heavy unit for raids and Keter breaches.
- Specialist detachments: a field researcher who scans anomalies mid-mission; an amnestics specialist.
- A lost team: another site's MTF goes silent in your region, and the Council sends you.
- Covert actions: field agents sent on off-screen jobs (infiltration, surveillance, procurement) with injury risk.
- Scanning leads on the world map for supplies, Intel or recruits.
- Requests, transfers and calls for help from other sites; selling captured gear to them (black market).

### Emergency responses to other Foundation facilities

- Other Foundation facilities remain independent. The player commands Site-19 and can assist, coordinate, trade or transfer with other sites, but does not build or directly manage them.

- Other Foundation sites can request help after a containment breach, communications blackout, sabotage, infrastructure failure or staff error. Not every breach should be caused by the Insurgency.
- Surface these events as urgent, selectable Geoscape incidents with site name, partial situation report, deadline, travel time and known/unknown risks.
- Launch deployments from the Geoscape into distressed facilities. Possible objectives: rescue staff, restore power or communications, recover records or samples, evacuate survivors, and recapture or contain escaped anomalies.
- Use damaged or partially secured facility layouts, local security survivors, changing hazards and uncertain intelligence to distinguish these missions from routine field operations.
- Outcomes affect O5 standing, inter-site relations, exposure, research opportunities and future calls for assistance. Ignored emergencies can escalate or be resolved at a cost by other Foundation teams or rival groups.
- Keep these events relatively rare and narratively significant; use existing anomaly content and mission systems before adding bespoke SCPs for every breach.

## Phase 3K: strategic and tactical cohesion, usability and balance (planned)

- **Geoscape-first mission flow:** launch and prepare field missions from selectable map locations, return to the map after debrief, and keep incident deadlines and travel consistent across the interface. Avoid a disconnected mission list as the primary entry point.
- **Operative fatigue and recovery:** repeated deployments cause fatigue; wounds have recovery periods and meaningful squad-rotation consequences. Integrate these with the existing personnel and medical systems rather than adding duplicate screens.
- **Operative bonds:** relationships form through shared deployments and affect tactical performance or morale in restrained, readable ways. Preserve them in personnel records and memorials.
- **Mission-objective variety:** build on existing breach, escort, recovery and retaliation missions with optional objectives, timed extractions, holdouts, intelligence recovery, disabling infrastructure and partial-success outcomes. Do not make every operation a kill-all mission.
- **Combat and map feedback:** show why actions succeed or fail, including line of sight, cover, flanking, hit chance, armor, status effects, overwatch triggers and action costs. Add a clear combat event log. Existing mechanics should be surfaced, not reimplemented.
- **Strategic intelligence and uncertainty:** reconnaissance can clarify incomplete mission briefings, reveal likely opposition or rewards, and affect the risk of deployment. Unanswered incidents continue to evolve.
- **Save and onboarding quality:** multiple save slots, first-mission guidance, reliable campaign migration, and clear warnings before irreversible deployments or time advances.
- **Difficulty and balancing:** difficulty presets and optional Ironman only after testing the full Phase 3 loop; test economy, travel, threat escalation, recruitment, casualty rates, SCP containment and long-campaign stability.
- **Completion gate:** the player can run a coherent long-term campaign from Site-19 through the Geoscape, with distinct strategic decisions and readable tactical missions, without requiring the Phase 4 3D conversion or a campaign ending.

## Phase 3L: containment depth, facility consequences and campaign records (planned)

- **Anomaly-specific containment procedures:** each implemented SCP should have understandable containment requirements, failure conditions and emergency responses. Let players prepare appropriate personnel, equipment and protocols for field recovery and Site-19 breaches; avoid generic capture rules for every anomaly.
- **Research driven by containment:** recovering and holding an anomaly should enable relevant experiments, discoveries, equipment and containment improvements. Make the chain from field recovery to research to practical strategic/tactical benefit visible, building on existing SCP tests and research rather than duplicating them.
- **Persistent facility damage and repairs:** breaches, sabotage and raids can damage rooms, power, security and containment infrastructure. Show repair time, cost, staffing requirements and temporary consequences; restoring operations should be a strategic choice, not an instant reset after a mission.
- **Intelligence reliability:** distinguish confirmed, estimated and unknown information in briefings. Reconnaissance improves reliability, but some intelligence can be incomplete, outdated or deliberately misleading; ensure the player can tell uncertainty apart from UI errors.
- **Campaign event history:** a searchable chronological record of major breaches, deployments, casualties, anomaly recoveries/transfers, O5 decisions, Insurgency operations and regional incidents. Link entries to relevant personnel, locations and outcomes where feasible, reusing existing incident reports and service histories.
- **Completion gate:** these systems must integrate with the existing Site-19, research, personnel and Geoscape layers; prioritize meaningful choices and clear feedback over new standalone menus.

## Phase 4: 3D, XCOM style

Late in the plan: move both layers from 2D to 3D.
- Tactical: a 3D map with an isometric camera you can rotate and zoom, units and anomalies as models, cover and
  sightlines shown in 3D, multi-storey buildings (which brings elevation and high ground with it).
- Strategic: a 3D globe for the world map, and a cutaway "ant farm" view of Site-19 like the Avenger.
- Likely built on three.js inside the same browser game, keeping the rules code as it is and replacing the drawing.

## Beyond Phase 3: campaign endgame

- Define campaign victory and the final mission after the Phase 3 tactical and strategic foundations are complete. Phase 3 does not end the campaign.

## Later

- More anomalies beyond SCP-106 and SCP-610, starting with SCP-939, "With Many Voices": blind, hunts by sound, fakes
  your operatives' voices in the log to lure them, and is drawn by gunfire (the reverse of SCP-173).
- Additional specialized containment gear, such as a catch-pole for SCP-049 or portable light rigs, as appropriate to individual anomaly procedures.
- Elevation and high ground, hacking objectives, loot from Insurgents.
- Room upgrades and staffing facilities for bonuses; one-off experimental items.
- Art to replace the placeholder SCP-173 drawing, and sound.
- (Done) Save export and import: download the campaign as a file and load it back (older saves are upgraded).
- Mission layout on phones.
