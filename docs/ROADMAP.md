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

## Phase 3G: recruiting Epsilon-11 (XCOM style)

- A recruit pool in the Command facility's panel: 4 to 6 candidates, refreshed monthly, men and women. Each has a name,
  age, nationality, home unit, backstory, a stat lean and sometimes a starting trait. Better candidates cost more.
- Recruited from special forces around the world, opening by year: from 1951 US Army Ranger companies, Navy Underwater
  Demolition Teams, Royal Marines Commandos, the SAS (Malayan Scouts), French Foreign Legion paratroopers, Gurkha
  regiments and the Special Boat Service; later US Army Special Forces (1952), New Zealand SAS (1955), Sayeret Matkal
  and the Australian SASR (1957), the Danish Jægerkorps (1961) and Navy SEALs (1962). Each unit gives a small lean
  (Gurkhas steadier, SAS better shots, UDT frogmen faster).
- Individual designs: a generated portrait for every operative (face, skin tone, hair, facial hair, scars, headgear by
  unit), editable as in XCOM. Flat drawn style for now, built from layered parts so the style can be replaced later;
  the same design data carries into the 3D models in Phase 4.
- Liaison research (and later O5 standing) opens more units and better candidates.
- The memorial keeps each fallen operative's portrait and unit.

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
- A campaign ending: what winning looks like, and the final mission.

## Phase 3J: more task forces, field work and other sites

- MTF Eta-10 "See No Evil" (blindfolds and video goggles) assigned by the Council once you hold two or more anomalies
  or reach a standing threshold: a second squad, so two incidents can be answered at once.
- MTF Nu-7 "Hammer Down": a heavy unit for raids and Keter breaches.
- Specialist detachments: a field researcher who scans anomalies mid-mission; an amnestics specialist.
- A lost team: another site's MTF goes silent in your region, and the Council sends you.
- Covert actions: field agents sent on off-screen jobs (infiltration, surveillance, procurement) with injury risk.
- Scanning leads on the world map for supplies, Intel or recruits.
- Requests, transfers and calls for help from other sites; selling captured gear to them (black market).

## Phase 4: 3D, XCOM style

Late in the plan: move both layers from 2D to 3D.
- Tactical: a 3D map with an isometric camera you can rotate and zoom, units and anomalies as models, cover and
  sightlines shown in 3D, multi-storey buildings (which brings elevation and high ground with it).
- Strategic: a 3D globe for the world map, and a cutaway "ant farm" view of Site-19 like the Avenger.
- Likely built on three.js inside the same browser game, keeping the rules code as it is and replacing the drawing.

## Later

- More anomalies beyond SCP-106 and SCP-610, starting with SCP-939, "With Many Voices": blind, hunts by sound, fakes
  your operatives' voices in the log to lure them, and is drawn by gunfire (the reverse of SCP-173).
- Each held anomaly with its own tests that give research and unique items.
- Containment gear as items: a catch-pole for leading SCP-049 from farther away, portable light rigs.
- Soldier bonds, fatigue, renaming operatives and callsigns.
- Elevation and high ground, hacking objectives, loot from Insurgents.
- Room upgrades and staffing facilities for bonuses; one-off experimental items.
- Difficulty levels and an Ironman mode.
- Art to replace the placeholder SCP-173 drawing, and sound.
- (Done) Save export and import: download the campaign as a file and load it back (older saves are upgraded).
- Multiple save slots.
- A tutorial or first-mission walkthrough.
- Mission layout on phones.
