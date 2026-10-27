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

## Phase 3 implementation rules (applies to every section below)

- **Explicit specification:** every agreed feature and its behavior belongs in this roadmap. Do not rely on chat history, vague labels, or implicit XCOM comparisons as implementation instructions.
- **Status is not implementation proof:** "done" means previously reported complete; all new items below are **planned** until source inspection and in-game testing confirm them. Existing features must be expanded rather than recreated.
- **Phase boundary:** finish the playable 2D tactical and strategic foundations in Phase 3. A 3D globe, 3D tactical environments, multi-floor elevation and the campaign's final mission remain outside Phase 3.
- **Integration:** world actions, missions, research, Site-19, personnel, economy, exposure, Council standing and the global Insurgency threat should share consequences. Avoid isolated minigames or duplicate menus.

## Phase 3 priority: interactive 2D World Map / Geoscape (done for Phase 3 scope; later phases add actions to it)

**Purpose:** the World Map is the primary strategic hub and the place the player starts field missions, not merely an exposure dashboard or a separate list of missions.

- **Existing base to retain:** six regions (Eastern US, Western US, Latin America, Western Europe, Africa/Middle East, East Asia), with Site-19 in the Eastern US; regional cover/fronts, funding, exposure, travel times, manhunts, cover-ups, strikes and amnestics. Preserve the running calendar and pause/time-speed controls already associated with the World tab.
- **Interactive geography:** a readable 2D world map with clickable regions and specific locations within them: known Foundation facilities, fronts, towns, incident sites, SCP sightings/outbreaks, Insurgency activity, manhunts, reconnaissance leads and operations. Each marker uses a distinct symbol and state (new, investigated, in progress, urgent, resolved/expired); avoid clutter with toggles/filters.
- **Selection and briefing:** clicking a region shows exposure, Foundation presence/front status, funding context and recent events; clicking a marker shows the location, type of incident, known facts, unknowns, urgency/deadline, estimated travel, likely opposition if known, objectives, possible rewards and consequences of ignoring it. Show which actions are available and why others are locked.
- **Geoscape-first deployment:** choose an incident/location on the map → open briefing → select available task force/operatives → check equipment/loadout and travel → confirm deployment → play tactical mission → debrief → return to the World Map with outcomes reflected. The separate mission list must not remain the primary field-deployment entry point.
- **Time and logistics:** show current date, pause/speeds, travel route, estimated arrival and relevant deadlines; advancing time progresses travel, research, ongoing world operations, incident escalation and enemy plans. Do not invent instantaneous travel for distant missions.
- **Noncombat actions from the map:** investigate leads, scan a region, gather Intel, conduct surveillance, establish regional contacts/fronts, pursue manhunts, execute cover-ups/amnestics, dispatch covert teams, and perform appropriate off-screen recovery or procurement operations. Actions consume suitable time/resources and produce visible results, risks or follow-up missions.
- **Discovery and uncertainty:** initial leads may have incomplete information. Spending time/Intel on reconnaissance can reveal enemy presence, anomaly identity, difficulty, rewards or risks. Intelligence quality should be visible, not hidden behind misleading certainty.
- **Simultaneous world events:** show multiple active incidents with different deadlines and consequences. Until a second team is unlocked, the player may have to choose which to respond to; later task forces enable more than one response where their capabilities permit.
- **Persistent consequences:** ignoring a threat can worsen an outbreak, increase exposure, cost lives/resources, allow a rival to intervene or advance Insurgency plans. Successful actions can recover anomalies/resources, reduce exposure, improve Council standing or uncover new leads.
- **World scope:** other Foundation facilities exist as independent locations. The player manages Site-19, not the global Foundation. Additional regions/sites become accessible through research, contacts, Council standing or discovered intelligence.
- **Visual target:** readable 2D map now; preserve locations, markers, operations and underlying strategic rules for the Phase 4 3D globe.
- **Acceptance:** the player can see the current world situation, inspect an event, choose a response, prepare and launch a mission, advance time, return after debrief and observe world consequences entirely through this hub.

### Built so far

- **Chunk 1 (done):** every incident is a marker at its town (or at Site-19 for breaches, riots and raids), shaped by
  kind (anomaly circle, Insurgency diamond, cover-up square, Site-19 triangle) with a state ring (urgent pulsing, new
  dashed, under way); markers in the same town fan out. Independent facilities (Site-17, Site-23, Area-12) are shown
  and explained as not run by Site-19. Filters toggle each marker type. Selecting a marker opens a briefing: place,
  deadline, travel and arrival (or the turn Epsilon-11 arrives), what is known and unknown (opposition is exact only
  with Insurgency codebooks; a first sighting's anomaly is unidentified), rewards (one shared table with the debrief)
  and what happens if it is ignored, plus a dashed route from Site-19. "Prepare a response" opens team and loadout
  selection on the World tab and launches from there; after the debrief the player returns to the World Map on that
  region. An incident list sorted by urgency sits beside the map. The Command tab's incident cards now open the
  incident on the map instead of planning separately.
- **Chunk 2 (done):** investigate an incident from its briefing (1 Intel now, or a field agent for $15k who reports
  the next day): exact opposition, and a first sighting's anomaly identified. Waiting makes things worse, stated in the
  briefing: Insurgency cells take in another Insurgent every 3 days (up to 3), retaliations cost a civilian and 2
  exposure every 2 days, cover-up witnesses spread the story every 3 days (up to 2 more). Field operations from a
  region's card, shown on the map while they run: Scan for leads ($20k, 4 days: Intel, money, a strong recruit added
  to the pool, or a cell) and Surveillance ($30k, 6 days: usually a cell to strike, else 2 Intel). Squads flying home
  and running operations are listed with the time controls.
- **Refinement pass (done):**
  - Layout: the map leads, with the date, clock and speeds and the marker filters in a bar on top; one side panel beside
    it shows the incident list (name, then kind, place and countdown), a briefing, a region or a facility, with a way
    back; team selection opens full width below the map. On phones the panel follows the map.
  - Zoom and pan: wheel zoom around the cursor, drag to pan, +/− and World buttons; selecting a region frames it.
    Markers, labels and lines keep the same size on screen at any zoom and screen width. Phones get a taller map window.
  - No overlaps: markers close together fan out in a ring with a thin leader line to each true location; region labels
    step aside from markers, facilities and Site-19.
  - Regions are shaded territories (each with its own tint, reddening with exposure, hatched when lost), clickable
    anywhere on their land, labelled with name and exposure. Soviet-bloc land has no front and stays neutral.
  - Each marker shows its countdown; hovering gives the name and deadline.
  - Day and night: the night side of the world is shaded from the date and the clock. Night missions now use the
    local time where the mission is (they used Site-19's clock everywhere), and briefings and routes say "night there".
  - Squads flying home are drawn as a plane along their route; field operations pulse on their region.
  - Fixes: SCP-610 outbreaks show "Ongoing" (not a date in 2225) and sit at a town; cover-ups are named for their
    story and town.
- **Cover-ups without Epsilon-11:** from the briefing, send an amnestics team (a researcher and one dose per witness,
  $10k; they dose everyone on arrival, −10 exposure, the researcher returns after the round trip) or pay the region's
  front to bury the story ($30k + $10k per witness, 70%: −5 exposure, else +6). Sending Epsilon-11 is still possible
  but no longer needed.
- **Belongs to later phases:** establishing contacts and fronts (3H), covert teams and procurement (3J), rivals
  intervening in ignored incidents (3I). The Geoscape is where they will appear.

## Phase 3 priority: tactical map readability and feedback (done)

- **Terrain textures:** use restrained but distinguishable 2D grass, dirt, concrete, asphalt, indoor flooring, water where applicable, and rubble. Texture must not drown out grid or unit information.
- **Geometry and cover:** visibly differentiate traversable floor, impassable walls, doors, windows, low/half cover, full cover, obstacles, hazardous tiles and extraction points. Make cover orientation and blocked routes intelligible.
- **Readable maps:** improve tile-edge contrast, normal-zoom legibility, operative/enemy silhouettes, selected-unit visibility and differentiation of rooms. Give laboratories, offices, storage, containment chambers, corridors and exterior areas recognizable floor patterns and restrained props.
- **Tactical overlays:** display selected operative, reachable/movement tiles, route, movement cost, remaining actions, possible targets and attack range, visible enemies, line of sight, cover direction, flanking opportunities, hazards and objectives. Present these in context so the map does not become visually overloaded.
- **Action previews:** show hit chance, expected damage where applicable, cover/armor modifiers, relevant status effects, and action-point costs before committing. Explain blocked actions and unclear line of sight.
- **Combat explanations:** log shots, misses, critical hits, damage, armor effects, suppression, overwatch/reaction triggers, status changes, movement and deaths. Players should be able to understand why an outcome happened.
- **Do not reimplement existing combat systems:** overwatch and reactions to enemy movement, suppression, flanking bonuses, critical hits and status effects are already believed to exist; verify their actual behavior in source and playtesting, then improve visibility and balance rather than treating them as missing.
- **Phase boundary:** 2D clarity and presentation now; 3D geometry, multi-storey elevation and models in Phase 4.
- **Acceptance:** at normal zoom a new player can identify where they can move, what is cover, which units are threats, what actions are available and why an attack outcome occurred without trial-and-error clicks.

### Verified and built

- **Already present (verified in source, kept):** reachable tiles in two colours (one action blue, two amber), path
  preview, cover pips on the hovered tile (full cover blue, half cover tan), selected-unit ring, overwatch arc,
  Insurgent detection zones while concealed, SCP-173 sight lines and "EYES ON/NO LOS", hazards (fire, flesh, rot),
  the hint panel's full hit-chance breakdown, and log lines with hit chance, crits and armor absorbed. Overwatch,
  suppression, flanking, crits, cover and hunkering exist in combat and were not reimplemented.
- **Terrain surfaces:** every tile's floor comes from its area: asphalt (streets, lots, motor pool, courtyard), grass
  (fields), dirt (barn), concrete (corridors, warehouses, garages, docks), wooden boards (homes, shops, offices,
  barracks, mess halls), lab tile and steel deck (cells). Textures are fixed per tile and kept dark and low-contrast;
  a faint grid marks every tile. No windows exist in the current maps, so none are drawn.
- **Threats at a destination:** hovering a move shows how many visible Insurgents could see that tile, whether any of
  them flank it ("2 CAN SEE · FLANKED" in red), a line from each, or "NOT SEEN".
- **Targets at a glance:** every enemy the selected operative can shoot shows its hit chance under it.
- **Shot preview:** hit chance, the weapon's damage range, crit chance and the target's armor.
- **Combat log reasons:** each shot line ends with the situational modifiers behind the chance (for example
  "95%: flanked +10, close range +15").
- **Moving past squadmates:** the team (operatives, guards and their D-Class) can walk through each other but not stop
  on an occupied tile, so someone standing in a doorway no longer seals it. Enemies still block.
- **Doorway sight:** a sight line can only pass through a doorway within about 30° of square to it (DOOR_SLANT in
  src/core/sight.ts). Someone standing beside a doorway can't see or shoot along the inside of the wall; standing in
  the doorway or squarely in front of it sees normally. Applies to everyone, enemies and anomalies included.

## Weather (done; verified in source and in-game)

- **Regional weather:** each region rolls clear, rain, storm, fog or snow by season and climate
  (src/data/weather.ts), lasting 1 to 3 days. Shown on the World Map region labels (with a Weather filter), in the
  region panel, incident briefings, Command incident cards and the deploy panel.
- **Outdoor maps only** (Site-19's Wing C and D-Block are never affected). Effects stack with night, but sight never
  drops below 3 tiles (MIN_RANGE in src/game/perks.ts):
  - Rain: sight −2; fires burn a turn shorter and spread half as often.
  - Storm: sight −3; shots past 5 tiles take −10 aim; firing doesn't break concealment; flights there take a day longer
    (briefing arrival dates and the deadline check include it). Regions are never closed by weather.
  - Fog: sight −4; unalerted Insurgents only notice the team within 2 tiles instead of 4.
  - Snow: sight −1; move −1.
- **Tactical feedback:** a weather pill beside Turn/Night, a log line at the start, and an animated overlay (rain
  streaks, heavier storm rain with occasional lightning, drifting fog haze, falling snow).
- Weather is read when the squad lands, so it can change while they are in the air.

## Phase 3G: recruiting Epsilon-11 and operative identity (done; verified in source and in-game)

### Recruit pool and historical sources

- **Existing Part A, reported done:** Command-facility recruit pool refreshes monthly with **4–6 candidates**. Recruit pricing and tiers: **Standard $100,000; Veteran $140,000 (starts as PFC); Elite $190,000 (starts as PFC with Steady)**. Unit-based stat leans include **+6 aim, +15 sanity, +1 HP or +1 movement**, as appropriate to the unit. Men and women are eligible. Candidates have unit-fitting hometowns/backstories.
- **Candidate record must explicitly include:** generated **full name** (given name and family name, with culturally appropriate naming conventions), age, nationality, hometown, originating unit, historical background/backstory, recruit tier and cost, stats/unit lean, starting rank and any starting trait. A single-name placeholder is not sufficient.
- **Seven sources available in 1951:** US Army Ranger companies, US Navy Underwater Demolition Teams, Royal Marines Commandos, SAS (Malayan Scouts), French Foreign Legion paratroopers, Gurkha regiments, and Special Boat Service.
- **Additional sources by year:** US Army Special Forces **1952**; New Zealand SAS **1955**; Sayeret Matkal and Australian SASR **1957**; Danish Jægerkorps **1961**; US Navy SEALs **1962**. The year gate must follow the campaign calendar. Preserve meaningful small unit leans (for example Gurkhas steadier, SAS better shots, UDT faster).
- **Liaison research:** research and later O5 Council standing unlock access to additional historical units and better candidates; communicate prerequisites and unlocks in the Command/recruitment interface. Do not bypass historical year gates unintentionally.

### Names, portraits and continuity

- **Full names everywhere:** both new recruits and existing operatives use consistent full names in recruitment, roster, tactical deployment, mission/debrief reports, personnel files, promotions, service histories, medals, retirement/discharge and memorial records. Keep existing player renaming and callsign features; a callsign does not erase the full legal/display name.
- **Individual portraits:** generate a recognizable portrait for **every** operative, not just a generic image per class/unit. Include selectable/editable face, skin tone, hairstyle, hair color where supported, facial hair, scars and unit-appropriate headgear. Appearance should not be randomly replaced after recruitment.
- **Editable appearance:** players can customize these features through an operative-facing UI similar in function to XCOM's soldier customization. Store appearance as **layered 2D character-part data**, not a single baked image, so the identity and choices can carry forward to Phase 4's 3D character models.
- **Memorial persistence:** a fallen operative's full name, callsign (if any), portrait/appearance, original unit, service history and death remain preserved in the memorial even if they are no longer on the active roster. Existing medals, renaming and personnel history remain compatible.
- **Acceptance:** recruit a named operative, edit their appearance, deploy/promote/rename them and view reports; all displays refer to the same persistent person and appearance, including the memorial after death.

### As built

- **Full names:** every operative and guard has a given and family name from a matching culture (src/data/names.ts):
  Gurkha names with Bahadur/Kumari, Dutch "de"/"van" family names, Legionnaires named for their hometown (Spain,
  Hungary, West Germany, Italy, France), Maori names among New Zealand SAS. Older saves gain a culture-fitting given
  name (save version 17). The full name shows in recruitment, the roster, tactical squad cards, logs, reports,
  promotions, medals, retirement and the memorial; the callsign stays separate.
- **Sex field:** every person is explicitly Male or Female (shown on recruit cards and personnel files, and changeable
  in the appearance editor). Women use women's hair styles (bun, bob, victory rolls) and have no facial hair; men use
  men's styles (crew cut, side part, swept back, shaved). Older records without one are set to male.
- **Candidate record:** full name, sex, unit, nationality (from hometown), age, hometown, backstory, tier and cost,
  starting rank (including a trainer's PFC bonus), aim with the unit lean applied, and any starting trait.
- **Sources:** the seven 1951 units and the later units by campaign year exactly as above. The founding team of six is
  drawn from the 1951 units too.
- **Liaison:** Allied liaison office (after 3 wins) opens four further historical units, still gated by their years
  (Korps Commandotroepen and Philippine Scout Rangers 1951, Belgian Paracommandos 1952, Norwegian
  Marinejegerkommandoen 1953) and adds 2 candidates a month; Joint training exchange (after 6 wins) makes Veteran and
  Elite candidates far more common. The recruitment panel shows both projects' status and what they unlock. O5
  standing joins this in Phase 3H.
- **Appearance:** layered part data (src/data/looks.ts) drawn by src/ui/portrait.ts; saved with the person (older
  operatives' faces were saved at migration), so it is never re-rolled. Editable under Appearance on the Personnel tab.
- **Memorial and retirees:** full name, callsign, portrait, former unit, hometown, missions, kills, wounds, seals,
  medals and the date and place of death. Retirees keep their portrait, unit and record too.
- **Acceptance test:** recruited, edited, renamed (with a callsign), deployed and killed one operative; the recruit
  card, squad card, incident report and memorial all showed the same person and the same saved look.

## Phase 3H: O5 Council and strategic choices (done; verified in source and in-game)

- **Monthly O5 orders:** Council issues objectives with visible deadlines and rewards/penalties. Orders should interact with missions, containment and strategic resources rather than being purely decorative.
- **Separate Council standing:** standing is distinct from regional exposure; it changes access to funding, requests, opportunities and scrutiny. Show why it rose or fell.
- **Forced strategic choices:** sometimes several urgent incidents appear at once and the player can respond to only one with the teams available, in the spirit of XCOM 2 guerrilla operations. Unanswered events have consequences.
- **Rewards beyond money:** engineers, researchers, D-Class, recruits, gear and other resources can be earned through missions/Council work.
- **Front establishment:** regions require contact using money and Intel before normal Foundation operations there; show the unlock and ongoing strategic implications on the Geoscape.
- **Council requests:** standing unlocks requests such as increased funding, another MTF and Keter transfers. Failure or repeated poor performance can trigger audits.
- **Inbound anomaly transfers:** the Council can order Site-19 to accept an anomaly from a closing/damaged site, offering funding/standing in return; escort/containment consequences must be playable.
- **Outbound transfers:** the player can move an anomaly away when Site-19 is damaged or another research site offers to receive/pay for it. Transfers should have time, risk and containment implications.
- **Inter-site trades:** exchange held anomalies with independent sites for funding or research; the other sites are partners, not facilities the player directly controls.

### As built (src/campaign/council.ts, objects.ts; fronts in world.ts)

- **Standing** (0 to 100, start 50) is separate from exposure, shown as a top-bar pill and on the Command tab's O5
  Council card with a "why it moved" history. Rises: missions won (+2, +4 for first contacts and outbreaks), orders met
  (+5), fronts established (+3), good inspections, low exposure at month end, transfers taken. Falls: missions failed
  (−4), incidents unanswered (−3), orders failed (−6), a front collapsing (−15), poor inspections, exposure 40+ at month
  end, refusing an ordered transfer (−6), losing a convoy (−8). Tiers: Under review (<25), Adequate, Trusted (60+),
  Favoured (80+).
- **Funding** is now the Council's grant (60 + standing + any raise) plus what each established front passes on.
- **Audits:** below 25 the next inspection is brought forward to 14 days and becomes an audit: no per-check pay,
  double penalty, +10 standing if passed.
- **Monthly orders:** two each month from: close an incident in a region, bring global exposure under a value, take a
  prisoner, finish a research project, establish a new front, let nothing go unanswered, keep every cell cleaned.
  Rewards beyond money: engineer, researcher, D-Class, Intel, amnestics, a veteran operative, or gear.
- **Requests** (spend standing, each with a cooldown): emergency appropriation ($100k, 35+), engineering detail
  (60 days, 50+), veteran transfer (a Corporal, 60+), an object for study (60+), Keter transfer (SCP-106 early, with
  $150k, 75+), a permanent grant raise (+$15k a month, 80+). "Another MTF" is left for 3J's task forces.
- **Forced choices:** every 50 to 80 days, 2 or 3 incidents (cover-up, cell, attack) arrive together with the same
  deadline and their own Council rewards. Deploying Epsilon-11 to one forfeits the others. A cover-up in the group can
  still be handled by an amnestics team or a paid burial instead.
- **Fronts:** a new campaign starts with only the Eastern US. Contact spreads along routes (East US to West US, Europe
  and Latin America; West US to Latin America and East Asia; Europe to Africa; Africa to Latin America and East Asia),
  costs $50k for the second front then +$20k and +1 Intel each, and takes 6 days. Without a front a region sends no
  funding, its exposure never eases, field operations, cover stories, cell hunts and burials can't be run there, cover-ups
  don't arrive from it, and flights there take a day longer. Anomalies still turn up anywhere. Saves from before 3H keep
  every region.
- **Safe-class objects** that only arrive by transfer and never breach or need cleaning: SCP-500 (5 pills; one cures an
  operative's wounds, sanity and bad traits), SCP-914 (once a week refines an item, 1 in 5 failures), SCP-005 (+1 Intel
  per cell broken). Each has a study in the new Objects research branch (Panacea assay, the "Very Fine" setting, Lock
  studies).
- **Transfers:** inbound orders from Site-17, Site-23 or Area-12 (only when a wing is free), sale offers for an anomaly
  Site-19 holds, and swaps; offers lapse after 10 days. Anything can be sent away for good from its cell for $40k to
  $150k by class. Convoys take 3 to 5 days by road; from 1952 one coming in can be ambushed near Site-19 (an escort
  mission any fit operatives can take); losing it costs standing and exposure.

## Phase 3I: global Chaos Insurgency and other groups (done; verified in source and in-game)

- **Single global opponent:** the Chaos Insurgency is **one coordinated worldwide organization** with an overarching agenda, shared strategic threat/doom clock and linked major operations. It can act in multiple regions but must **not** be modeled as independent regional factions with separate autonomous strategic economies or doom clocks.
- **Threat escalation:** leaving cells or operations unchecked advances global threat. Make escalation and its consequences visible on the Geoscape.
- **Counterable plans:** announced or discovered Insurgency operations (akin to XCOM 2 dark events) give the player opportunities to investigate, disrupt or fail to stop them. Some plans can be discovered only through intelligence.
- **Recurring adversary:** a named field commander can escape, return and develop a recognizable campaign history, connected to the global Insurgency.
- **Mission pressure:** long Insurgency strikes may receive reinforcements mid-mission; show reasonable warning/feedback.
- **Enemy roles:** riflemen; sniper with long-range overwatch; demolitions specialist able to breach walls; officer who buffs nearby troops. Some enemies use recoverable one-off anomalous items that can be researched.
- **Global strategic goals:** steal anomalies during transport, recruit D-Class, plant staff moles, infiltrate fronts and conduct raids or sabotage. Regional operations should serve these global plans; success/failure affects future operations.
- **Other factions:** the Global Occult Coalition may destroy an anomaly if the Foundation responds too slowly (preventing capture/exposure but displeasing the Council); GRU Division “P” acts as a Cold War anomalous rival in Europe and East Asia. They are not branches of the Insurgency.
- **Ambiguity:** not every containment breach is Insurgency-caused. Some incidents may initially have unclear causes; evidence can reveal whether the event was accidental, anomalous or deliberate sabotage.

### As built (src/campaign/chaos.ts strategic, src/game/ciTactics.ts tactical)

- **One agenda:** a single global Insurgency meter (0 to 100, starts at 10) on the World Map bar and the Command tab, with
  a "why it moved" list. Up: +1 a month (+1 per hidden mole), cells left alone (+4), attacks unanswered (+3), strikes or
  raids lost, operations carried out (+3), a commander escaping (+2). Down: cells broken (−5), attacks and raids beaten
  (−3), operations disrupted (−6), interrogations finished (−1), moles exposed (−4), commanders killed (−6) or captured
  (−10). Steps: 25 snipers and sappers appear; 40 teams one larger; 55 raids twice as often; 70 teams two larger and
  reinforcements sooner. At 100 the agenda completes: +10 exposure everywhere, a facility wrecked by sleeper charges,
  −20 standing, and the meter resets to 60 (not a campaign loss).
- **Operations (dark events):** three each month toward its global goals: Highway (every anomaly convoy ambushed for a
  month), Open Door (D-Class morale −25), Glass Eye (plant a mole), Paper Mill (a front's funding halved for two months,
  +8 exposure), Iron Gate (a raid), Ashfall (sabotage), Long Arm (larger, better-armed teams for a month). Two are known,
  one is unidentified until 1 Intel is spent or field work in its target region uncovers it. Known ones can be disrupted
  for 2 Intel, and one each month is run from a located cell: breaking that cell stops it. Targeted regions show "CI op"
  on the map.
- **Commander:** a named field commander (Captain, Major or Colonel) leads every cell running an operation and turns up
  in other strikes, raids, attacks and ambushes 30% of the time. 8 HP, armor, steadies nearby troops, and runs for the
  nearest exit at half health. Each escape is remembered on their file; killed or captured, a successor arrives 2 to 4
  months later. Past commanders are listed with their fate.
- **Tactical roles:** riflemen; snipers (scoped rifle, settle into long-range overwatch that fires on the team's
  movement); sappers (blow a hole through a wall between them and the team, 2 damage to anyone beside it); officers
  (+10 aim to Insurgents within 4 tiles). Marked S, X, O and ★ on the map and in the legend; Insurgents on overwatch show
  a red arc. Some carry an anomalous charm that turns the first hit; recovered ones open "Anomalous charms" research,
  which unlocks the warding charm item for operatives.
- **Reinforcements:** in strikes and attacks once the agenda is 30+, a radio warning and a marked drop zone the turn
  before 2 or 3 more Insurgents land at the far edge (turn 7, or 5 at 70+).
- **Moles and ambiguity:** every breach opens an inquiry ("accident, the anomaly itself, or someone inside?") on the
  Command tab; $20k settles it. Moles sabotage now and then and cause some breaches; an inquiry that finds sabotage
  exposes one.
- **Rivals:** first sightings left unanswered may be destroyed by the Global Occult Coalition, or in Europe and East Asia
  taken east by GRU Division "P"; either way the anomaly is gone for good (−5 standing). Half of first sightings in
  Europe and East Asia have GRU-P agents on the ground: the mission's opposition is GRU-P, not the Insurgency, and beating
  them to it earns standing. Briefings warn of all of this.

### Follow-up fixes after 3I

- The World Map's night side now sweeps continuously while time runs (it only redrew at the day change before).
- Drill XP: a quarter of an XP per weekly drill (1 a month), never past Private First Class; missions give the rest.
- Generators: a twin diesel set tier (20 power) between turbocharged diesel and gas turbine; gas turbines (28) from
  1952; compact reactors 40; a 1962 reactor uprate to 55. Saves keep the generators they had refitted.
- Uniform armor line (XCOM's padded to plated to powered), researched once and worn by every operative under any vest:
  padded combat jacket +1 HP; nylon ballistic liner +2 HP (1952); plated undersuit +2 HP and 1 armor (1955, 8 missions
  won); powered combat harness +3 HP and 1 armor (1965, materials test).
- Nicknames: given at Corporal, picked at random from a list of the usual stupid unit nicknames (nothing to do with class; veterans sent by the Council get one too), shown as
  First "Nick" Last on personnel files and in the field, and editable with the name and callsign.

## Phase 3J: task forces, field operations and independent Foundation sites (done; verified in source and in-game)

- **Eta-10 “See No Evil”:** second squad with blindfolds/video goggles, granted by the Council after holding two or more anomalies or meeting a standing threshold; enables responding to two incidents at once where travel and availability permit.
- **Nu-7 “Hammer Down”:** heavy response unit for raids and Keter breaches.
- **Specialists:** field researcher who scans anomalies during missions and amnestics specialist with a distinct support role.
- **Lost-team events:** another site's MTF disappears in the player's region; the Council sends the player to investigate/recover them.
- **Covert actions:** field agents can perform off-screen infiltration, surveillance and procurement with time/resource costs and injury risk. Scan world-map leads for supplies, Intel and recruits.
- **Inter-site cooperation:** requests, transfers, assistance and sale of captured gear to other sites (black-market-style transactions where appropriate).

### Emergency breach response at other Foundation facilities

- **Independence is mandatory:** the player **only directly manages Site-19**. Other Foundation facilities retain their own personnel, command, containment and operations; the player may assist, coordinate, trade or transfer, **not** build/manage their rooms or take them over.
- **Narrative weight:** occasional, high-impact emergency requests rather than a constant stream of generic missions. Show that the Foundation is a larger organization with problems beyond Site-19.
- **Causes:** containment failure, staff error, equipment or power failure, communications blackout, anomalous behavior, sabotage and sometimes Insurgency attacks. Do not attribute every breach to the Insurgency.
- **Geoscape presentation:** selectable incident at a named independent site, with partial emergency report, response deadline, travel time, known hazards, unknowns and available teams.
- **Tactical setting:** distressed facility with damaged containment, disrupted infrastructure, surviving local security/researchers, unsecured rooms, environmental hazards and incomplete intelligence.
- **Objectives:** rescue researchers/guards; restore power or communications; recover classified records, samples or anomalous objects; evacuate survivors; recapture/recontain escaped SCPs; secure a route or hold a position while evacuation proceeds.
- **Partial outcomes:** success is not always all-or-nothing. Saving staff while losing an anomaly, containing the SCP but losing sensitive records, or evacuating only some survivors should produce distinct consequences.
- **Strategic aftermath:** affect Council standing, exposure, inter-site relationships, research opportunities, anomaly custody and later calls for help. Ignored incidents can worsen or be handled by other Foundation teams/rivals at a cost.
- **Implementation scope:** reuse existing anomaly mechanics and mission generation before building bespoke content for every emergency. Keep these sites independent throughout.

### As built (src/campaign/taskforces.ts; tactical pieces in mission.ts, abilities.ts and turn.ts)

- **Eta-10 "See No Evil":** formed for $150k from the O5 Council card once Site-19 holds 2 anomalies or standing reaches
  65. Operatives are assigned on their personnel file; the deploy panel sends one task force or the other, so two
  incidents can be answered at once (a forced choice lets two of its incidents be answered). Eta-10's video goggles:
  staring, they blink half as often and lose half the sanity to sight, at −10 aim.
- **Nu-7 "Hammer Down":** put on call for $200k once Site-19 holds a Keter-class anomaly or standing reaches 70. For
  $30k a call, four heavy troopers with machine guns join a raid or Keter-class breach a turn after Epsilon-11. They are
  not Site-19's to keep.
- **Specialists:** a field researcher (any mission with an anomaly; costs a free researcher, lost if killed) with a
  pistol and "Scan the anomaly" (up to 3 scans, 6 researcher-days each toward its research, or $10k each if there's
  none); an amnestics specialist (cover-ups, needs an amnestics lab) with a dart pistol and 3 doses of their own.
- **Field agents:** Site-19 starts with 2 (hire up to 6 at $50k in the Command facility). Every field operation takes
  one until it's done. New operations: Procurement (supplies, amnestic precursors or cash; low risk) and Infiltration
  (agenda −5, every Insurgency operation identified, +1 Intel; 20% hurt for two weeks, 5% killed). Scans and
  surveillance carry a small risk too.
- **Partner sites (Site-17, Site-23, Area-12):** relations 0 to 100 shown in each site's World Map panel, with what it
  holds from Site-19. Sell captured Insurgency weapons ($15k each); borrow 2 engineers or 2 guards for 30 days (needs
  relations 40, costs 8). Transfers, answered calls and rescued people raise relations; ignored calls lower them.
- **Lost teams:** from 1952, every 150 to 250 days another site's MTF goes quiet in a region with a front. The mission
  (town or farm, Insurgents about) has 2 or 3 survivors hiding (L); reached, they follow and leave with the team. It
  ends once nobody is left to find. Each one saved earns relations and standing, and one may ask to transfer to Site-19
  (a veteran in the next recruit pool).
- **Emergencies at other sites:** from 1952, every 180 to 300 days a site calls for help. The first report gives a
  cause (containment failure, staff error, power failure, blackout, the anomaly itself, or sabotage), not always the
  Insurgency. The hazard is an anomaly Site-19 handed that site (played with its own mechanics), an Insurgency team
  (sabotage), or escaped instances. The wing is dark until power is restored at the panel (both actions); researchers
  (R) are hiding, 2 files of records (F) can be recovered, and the site's own 2 guards fight alongside. The team leaves
  when it chooses: every part counts separately (researchers out, records as Intel, power, the hazard dealt with), and
  an anomaly left loose costs exposure and leaves that site's custody. Ignoring a call costs 15 relations, 4 standing
  and 6 exposure.

## Phase 3K: personnel, mission variety, usability and balance (done; verified in source and in-game)

- **Fatigue:** repeated deployments accumulate fatigue, with understandable performance or availability consequences and recovery over time; encourage squad rotation. Show fatigue and recovery in existing personnel/deployment interfaces.
- **Persistent injuries and recovery:** wounds carry over between missions and require recovery/medical support; injured personnel are not automatically fresh after debrief. Integrate with existing personnel/medical systems.
- **Operative bonds:** relationships develop through shared missions, can grant modest combat/morale benefits and may have consequences when a bonded operative is injured or killed. Preserve relevant bond history in personnel records/memorials. Keep bonuses restrained and legible.
- **Roster usability:** before deployment show rank, class/role, experience, fatigue, injuries, bonds, equipment and availability; make squad composition and loadout comparisons straightforward. Do not add an unnecessary parallel management screen.
- **Varied objectives:** build on existing breach, escort, field recovery, night and retaliation missions. Add document/sample retrieval, missing-operative rescue, disabling alarms/communications/equipment, holding a location for specified turns, timed extraction and optional objectives. Not every mission should be a kill-all; rewards can include research, Intel and Council standing.
- **Mission consequences:** allow partial success and optional-objective failure with differentiated outcomes rather than binary victory/defeat in every mission.
- **Strategic recon:** incomplete briefings can be improved with time/Intel via scanning, surveillance or investigation. Threats can escalate during delays; choices between acting now and learning more must matter.
- **Combat feedback:** the tactical readability section specifies attack previews, overwatch/suppression/flanking/crit/status feedback and event logs; do not duplicate those mechanics.
- **Multiple save slots:** support separate campaigns; preserve existing save export/import and migration from older saves. Warn before irreversible operations or overwriting progress.
- **Tutorial/onboarding:** first-mission guidance explaining selection, movement, cover, reaction fire, objectives, extraction and basic Geoscape deployment/time controls; teach through the game without burying players in text.
- **Difficulty and Ironman:** difficulty presets and optional Ironman after full-loop balance work; clarify their impact. Test economy, recruitment, injury/casualty rates, anomaly capture, travel, deadlines, global threat growth, Council pressure and long-campaign stability.
- **Acceptance:** the player can manage a recognizable roster and run a long 2D campaign with varied missions, understandable risks, persistent consequences, reliable saves and no requirement to complete a final story mission.

### As built

- **Named staff (XCOM-style):** every researcher and engineer is a person with a name, a face, a field (anomalous
  biology, theoretical physics, psychology, materials science, signals) or trade (mason, electrician, machinist, rigger)
  and a line of background. A specialist on staff speeds projects in their field by 25%; each trade sometimes gets its
  work (building, repairs and refits, workshop orders, excavation) a day ahead. They're listed in the lab and workshop
  panels and on the Personnel tab; losses (breaches, SCP-049, field work, quitting) are named and remembered. Field
  researchers sent on missions are real staff members.
- **Fatigue:** +20 per mission (+10 if wounded, +10 if they broke), −4 a day at Site-19 (−6 with psychological
  services). Tired at 40 (−5 aim, −10 sanity going in); exhausted at 70 (can't deploy).
- **Serious injuries:** going down in a mission means a named injury (broken arm, concussion...) and 10 to 32 days off
  the roster, shortened by a medical bay.
- **Bonds:** pairs who come back from missions together become comrades (3), close (6) and inseparable (10): +3, +5 or
  +8 aim with the bondmate within 4 tiles and in sight. A bondmate going down costs sanity; losing one costs more and
  may leave nightmares. Bonds and lost bondmates show on the personnel file.
- **Roster at deployment:** each pick shows rank, class, XP, sanity, fatigue (with the tired penalty) and bonds with
  others already picked; the roster shows injuries, exhaustion, wounds and tiredness first.
- **Optional objectives:** strikes have the cell's ledger (+2 Intel) and a radio to cut before reinforcements are
  called (strikes now always have a radio timer); retaliations: keep half the townspeople alive; manhunts: no civilian
  deaths; cover-ups: dose every witness; ambushes and raids: lose nobody; breaches: every researcher out. Shown live on
  the objective card and in the debrief; each met one has its own reward. Lost-team rescues, site emergencies (power,
  records, holding, partial outcomes) and escorts/raids (holding for set turns) cover the other objective types.
- **Flights on the World Map:** deploying far away puts the squad in the air; the plane crosses the map as time runs and
  the mission starts when it lands (weather and darkness as they are on arrival). Return flights move smoothly too.
- **Campaigns:** three save slots (slot 1 is the original save), a campaigns menu to load, start or delete, with warnings
  before anything is erased. Export and import stay.
- **Difficulty and Ironman:** Recruit, Agent, Director, Overseer, each shown with exactly what it changes (starting
  money, Council grant, Insurgents per fight, enemy aim, breach rate, agenda growth). Ironman blocks importing a save
  over the campaign.
- **Tutorial:** on by default for a first visit and offered for every new campaign: one tip per screen (Command, World,
  deploying, Site-19, Research, Personnel) and six steps through the first mission. Each can be dismissed, or the whole
  thing turned off.

## Phase 3L: anomaly procedures, research, facility consequences and history (done; verified in source and in-game)

- **SCP-specific containment:** every implemented anomaly should have documented requirements, field-capture methods, necessary personnel/equipment, failure triggers, facility containment rules and emergency responses. Avoid a generic “capture” solution that works identically for SCP-173, SCP-049, SCP-106, SCP-610 and future anomalies. Surface these requirements in mission preparation and Site-19.
- **Research from recovery:** recovered anomalies enable experiments, discoveries, specialized equipment, improved containment protocols and tactical/strategic benefits. Show the progression from field recovery → containment → research/test → unlock/use. Extend existing anomaly studies and research rather than duplicating them.
- **Facility damage:** breaches, sabotage, power failures and raids can persistently damage rooms, power, security and containment systems. Show what is disabled, the operational effect, repair costs, required staff/time and competing priorities; repairs are not an instant reset after combat.
- **Reliable vs uncertain intelligence:** label briefing information as confirmed, estimated or unknown. Reconnaissance can improve it; some reports may be outdated, incomplete or deliberately false. Distinguish in-world uncertainty from broken UI; avoid unfair invisible certainty.
- **Campaign history:** chronological searchable log of deployments, containment breaches, anomalies recovered/transferred/lost, casualties, promotions/retirements, major Council decisions, global Insurgency actions and regional events. Link to existing mission incident reports, personnel service records, sites and outcomes rather than recreating their data.
- **Acceptance:** anomalies have distinctive procedures; their capture changes research and containment options; damage has lasting operational costs; players can trace important campaign events and understand what information they knew when decisions were made.

### As built (with the base changes asked for alongside it)

- **Base:** 6 facility slots per level (was 4). Generators are refitted one at a time from their own panel, each tier
  researched first: turbocharged diesel 15 power ($60k, 4 days), gas turbine 22 power (from 1953, $120k, +$5k upkeep),
  compact reactor 35 power (from 1957, after the Army's SM-1, $250k, +$15k upkeep). A generator is offline while it is
  refitted. Saves that had researched efficient generators keep 15 power on every generator.
- **Procedures** (src/data/procedures.ts): each anomaly has its cell requirements, capture method, what to bring, what
  makes containment fail and the emergency orders, shown under its cell on the Site-19 tab and in the deploy panel for
  breaches, recoveries and outbreaks (only once an unknown anomaly has been identified). Routines now differ:
  SCP-173 is cleaned by 3 D-Class every 7 days; SCP-049 is interviewed by a free researcher every 10 days (3% chance it
  "cures" them; overdue, its cell wears twice as fast); SCP-106's cell is relined by 2 engineers for $15k every 14 days,
  and a power cut triples its breach risk instead of doubling it. Objects need no routine. The inspection check and the
  Council order now cover every routine.
- **Progression:** each anomaly's file shows Recovered → Contained → Studied (n of m) → Fully understood, what its
  finished studies do, and what is still to learn. A first-contact briefing names the research capture would open once
  the anomaly is identified.
- **Facility damage** has two levels: damaged (repair $30k, 3 days, 2 engineers) and wrecked (rebuild $90k, 9 days,
  4 engineers). Raids and anomalies tearing through walls wreck; faults and storms damage; a facility hit again before
  it is fixed is wrecked, and any repair under way is lost. Each facility states what stops working while it is down. A
  damage report on the Site-19 tab lists everything out of action with its effect, cost, time and crew, and how many
  engineers are already busy.
- **Intelligence:** briefings sort what is known into Confirmed, Estimated and Unknown. Insurgent numbers come from a
  field report that is right 70% of the time, off by one 20% and badly wrong 10%; it is dated, and cells that grow make
  it stale. Investigating or Insurgency codebooks confirm it (and say if the first report was wrong). The deploy panel
  and incident cards no longer show the true count unless it is confirmed.
- **History tab:** a chronological, searchable record of deployments (with what the briefing said and what was found),
  breaches, anomalies recovered, transferred or lost, casualties, promotions and medals, recruits and retirements,
  Council orders, requests, offers, inspections and audits, Insurgency raids and attacks, and fronts made or lost.
  Entries link to the incident report (the archive now lives on this tab) and to living operatives' personnel files.
  Older saves start it from their incident reports.
- Also fixed: a new anomaly now takes the lowest-grade free wing that can hold it, so a Euclid no longer fills the
  Keter wing.

## Phase 3 completion gate (not a campaign ending)

- Play a stable long-term campaign from Site-19 through the interactive Geoscape, deploy to readable 2D tactical missions, recover/contain/research SCPs, manage persistent operatives, respond to independent facilities, engage with O5 choices and a global Insurgency, and observe consistent world/facility consequences.
- Confirm implemented/partial/missing status against source **and** in-game behavior before declaring an item done. Campaign victory/final mission and 3D presentation are deliberately deferred.

## Phase 4: to be defined

The original Phase 4 (moving to 3D) is now Phase 5: it's too early in the project for 3D. A new Phase 4 will be written
here once its scope is agreed.

## Phase 5: 3D, XCOM style

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
- Elevation and high ground (Phase 4); additional hacking interactions and optional loot expansion beyond Phase 3 mission objectives.
- Room upgrades and staffing facilities for bonuses; one-off experimental items.
- Art to replace the placeholder SCP-173 drawing, and sound.
- (Done) Save export and import: download the campaign as a file and load it back (older saves are upgraded). Phase 3K adds multiple save slots.
- Mission layout on phones.
