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

- **Changed later (user decisions during 4I):** Eta-10 is a separate roster: a recruit is hired into Epsilon-11 or
  Eta-10 and stays there for good (no reassigning), Eta-10 numbers its own callsigns (E10-1, E10-2…; older saves are renumbered on load), and the Personnel tab
  shows the two rosters apart. Each task force brings its own bonus (Epsilon-11 +5 aim; Eta-10 video goggles). Squads
  never mix: the deploy panel picks which task force goes, the player plays one, and a hands-off team is also a single
  task force. With Eta-10 formed, a second incident can be answered at the same time, but only
  hands-off, like leaving a breach to Site Security: "Send them without you" on the deploy panel (anomaly recoveries,
  cover-ups, strikes, attacks on towns, lost teams and site emergencies; 2 to 4 fit operatives from either roster)
  shows the odds (0.3 + 0.12 per operative's weight by rank, aim and class − 0.07 per Insurgent, harder for recoveries,
  emergencies and rescues, easier for cover-ups; 10% to 90%). The team flies out, the outcome is rolled on arrival and
  goes through the ordinary debrief (rewards or failure, wounds, deaths, sanity, experience, salvage). From a group
  where only one can be answered, the second answer must be hands-off; once two are answered the rest close
  (src/campaign/autoteam.ts; the per-group count is kept on the campaign). The original text below is kept for history.
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

### Usability and raid follow-up (done; verified in source and in-game)

- **Starting over a filled slot** works in the claude.ai viewer, which blocks browser confirm boxes: Start (and slot
  delete, and sending an anomaly away) now asks on the button itself and acts on the second click.
- **Equipment, XCOM style:** each operative's file shows a slot grid (primary weapon, attachment, ammunition, armor,
  uniform, sidearm, utility slots). Clicking a slot opens it below with its stats and what can go in it; the weapon
  view lists its fitted attachment and ammunition with a shortcut to change each. Choices are kept on the operative.
- **Research tabs:** Anomalies, Weapons and armor, Gear (flashbangs and other items), Facilities and power, Personnel
  and Insurgency, each with a count of open projects. The list and the test log scroll inside their own panels, so
  the page itself doesn't.
- **Site-19 tab:** an anomaly's containment file appears only in the panel of the wing that holds it.
- **Tactical action bar:** the selected unit's hint, actions, items, Next and End turn sit in a bar pinned to the
  bottom of the screen. On a wide screen the map shrinks to fit above it and the side column scrolls on its own.
- **Insurgency timing:** operations, raids included, are shown as a window ("sometime in the next 5 to 18 days", then
  "any day now") that holds the real date somewhere inside it; a located cell's mission closes at the window's start.
- **A lost raid is a breach:** when the guards lose a raid (or the raid mission fails), the raiders free any prisoners
  and then go down the lift and open the most dangerous contained anomaly's cell (Keter first), leaving about half
  their number inside. It plays as an ordinary breach caused by sabotage, answered with whichever team the player
  sends. With nothing contained they take the payroll and wreck a level-1 building, as before.

## Phase 3 completion gate (not a campaign ending)

- Play a stable long-term campaign from Site-19 through the interactive Geoscape, deploy to readable 2D tactical missions, recover/contain/research SCPs, manage persistent operatives, respond to independent facilities, engage with O5 choices and a global Insurgency, and observe consistent world/facility consequences.
- Confirm implemented/partial/missing status against source **and** in-game behavior before declaring an item done. Campaign victory/final mission and 3D presentation are deliberately deferred.

## Phase 4: immersion, depth and gameplay fun (2D)

**Purpose:** make the existing XCOM-style 2D game more fun, alive, immersive and rewarding. Phase 3 systems are
foundations to deepen, not rebuild. Phase 5 remains the 3D conversion. Phase 4 addresses several problems, not just
tactical presentation. This section separates agreed requirements from proposals still awaiting discussion. A roadmap
completion label is not independent playtest verification.

The original Phase 4 (moving to 3D) is now Phase 5: it's too early in the project for 3D. Phase 4 deepens the 2D game
first. The Phase 3 implementation rules still apply (explicit specification, status is not proof, expand rather than
recreate, shared consequences).

### Agreed design rules for Phase 4
- Retain Site-19 as a fixed headquarters; do **not** copy XCOM 2's Avenger-based travel-and-scan timer or invent an
  equivalent aircraft parking requirement.
- Keep other Foundation sites independent; they can request help but are not player-managed secondary bases.
- Extend existing regional fronts, intelligence, covert operations and task force systems; do not create redundant
  intelligence departments or duplicate already implemented combat mechanics.
- Dynamic World Map opportunities arise naturally as time advances; not every activity is combat, and the player should
  not need to manually generate every opportunity.
- Every agreed feature must be explicitly specified in this roadmap, including behaviour, consequences, boundaries and
  completion checks. Do not silently treat brainstorming as approved scope.

### 4A: art and sound (done)
Decided: all art is drawn in code (canvas and SVG, like the portraits), and all sound is synthesized in the browser,
so there are no asset files or licences to track. Both layers get art; nothing in the strategic layer is left as a
bare text box where a picture would help.

- **Tactical maps:** designed tile art for every map instead of flat fills: walls with depth and material (concrete,
  brick, timber, steel bulkheads), floors per room (lab tile, office boards, asphalt, grass, mud, steel decking),
  doors that read as doors, and cover drawn as what it is (desks, crates, sandbags, vehicles, filing cabinets, pews,
  hay bales) so half and full cover are recognisable by shape. Props and decals per map (lights, stains, signage,
  vents, wiring). Containment cells, the transport container, hatches and lifts get their own art.
- **Tactical sprites and animation:** top-down sprites for operatives (by class and armor), guards, D-Class,
  researchers, civilians, Insurgents (by role), the Insurgency commander, Nu-7, and each anomaly, facing where they
  last moved or shot. Movement slides tile to tile; firing has muzzle flash and tracers; hits flinch; the downed and
  dead fall. Signature moves: SCP-173's blink jump, SCP-106 sinking into and rising from the floor, SCP-049's touch,
  SCP-610's spreading flesh. Existing markers (slot numbers, role letters, rings, health bars, tags) stay readable on top.
- **Strategic layer art:** the World Map (drawn coastlines and terrain, region shading, illustrated markers for each
  incident type, the plane, Site-19 and partner sites, weather); the Site-19 cross-section (rock strata, each facility
  drawn as its room with its function visible, power and damage states); illustrations or icons for research projects,
  workshop items, weapons and armor, anomalies' file photos, Council and Insurgency cards, and the History tab.
- **Portraits:** a better portrait style built on the existing look data (operatives, staff, commanders).
- **Sound:** synthesized effects for shots by weapon type, hits, misses, grenades, doors, the blink tick, SCP-173's
  scrape, SCP-106's corrosion, alarms and sirens; interface sounds (clicks, tab changes, notices); transitions (deploy,
  take-off and landing, mission start, victory and defeat, returning to Site-19, the month ticking over); a small
  ambient score for the World Map, Site-19 and missions. Volume per channel and mute, remembered per viewer.

Built in this order: (1) tactical map art, (2) tactical sprites and animation, (3) sound engine with tactical and
transition sounds, (4) World Map art, (5) Site-19 and the other strategic tabs, (6) portraits and the score.

#### As built so far
- **(1) Tactical map art (done, src/ui/tiles.ts):** each map is painted once into an offscreen layer and repainted only
  when the grid changes. Materials per map: Site-19 concrete with a painted wall band and hazard-striped blast doors,
  brick on Main Street, timber on the farm, corrugated metal at the port, concrete with chain-link and wire around
  the surface compound, hedges round the fields. Walls show a south face and cast shadows. Floors by room (lab tile,
  boards, slabs, diamond plate, asphalt with a centre line, grass, straw). Cover is drawn as what it is, chosen by room:
  desks, lab benches, restraint tables, cots, washers, pews, shelves, sofas, lockers, hay bales, sandbags, park
  benches, carts and crates for half cover; pillars, trees, crate stacks, instrument cabinets, bookcases and iceboxes
  for full cover, and parked trucks where two stand together. Fuel drums, exits with chevrons, the container or truck
  bed, the surface lift, room names stencilled on the floor, ceiling light pools, decals (SCP-173's cell floor, papers,
  oil, drains), debris where cover was blown apart, and puddles or snow on open ground in bad weather.
- **(2) Sprites and animation (done, src/ui/sprites.ts):** top-down figures for every unit, by side, armor (heavy,
  hazmat, lead, containment suit), weapon type, class (medic armband, containment pack), Eta-10 goggles, Nu-7 gas
  masks, guards' caps, Insurgent roles (commander's beret, sniper's hood, sapper's satchel), researchers' coats,
  civilians, D-Class, SCP-049-2, SCP-610 instances, rioters, the radio set and the records crate. The side shapes
  (circle, rounded square, diamond, square) are kept as rings with the slot or role badge. Units face where they last
  moved or fired, slide from tile to tile, flash when they fire, flinch red when hit, and fall where they die
  (downed figures lie with a bleed counter). SCP-049 is drawn from above with its mask pointing ahead, SCP-106 sinks
  into and rises from its puddle, SCP-173 throws up grit where it lands.
- **(3) Sound (done, src/ui/audio.ts):** all synthesized with Web Audio, starting on the first click. Shots by weapon
  type (machine guns and SMGs fire bursts), hits, ricochets, explosions, sealing doors, the blink tick, SCP-173's stone
  scrape, SCP-106's corrosion, the radio click each turn and a low pulse when the enemy moves. Interface clicks, tab
  changes, a refusal buzz on disabled buttons, a typewriter-and-bell for notices and a longer one for a new month,
  the alarm when Site-19 has a breach or raid. Transitions: take-off, landing, mission start, victory, defeat and the
  ride back down to Site-19. A generative ambient score per scene (World Map, Site-19, missions, tense for breaches
  and raids). A Sound button in both headers sets master, effects, interface and music volume and mute, remembered
  per viewer.
- **(4) and (5) The strategic layer, every tab (done, src/ui/art.ts, src/ui/icons.ts):** the user asked that nothing in
  the strategic layer look like a placeholder, so steps 4 and 5 were done together.
  - Header: a Site-19 seal (drawn for this game, not the wiki logo) and an icon on every resource pill and tab.
  - Site-19 tab: the surface compound above the cross-section (sky by the hour, wire, gatehouse, offices, the lift
    head, the flag, lit windows at night, a red pulse during a breach or raid), rock strata around the levels, and
    every slot drawn as its room seen from the side: command's wall map and radio dials, the generator, bunks,
    lockers and rifle rack, the medical bay, the psychologist's couch, the lab, the workshop with sparks, the range,
    holding cells, the amnestics pharmacy, and containment wings with an observation window, a vault door and the
    grade's colour, the anomaly visible inside. Empty slots are bare rock cavities; building shows scaffolding;
    damage shows cracks, rubble and smoke; a breach flashes red. The selected facility's panel opens with its room large.
  - Command tab: the O5 Council's thirteen-seat seal, the Insurgency's mark as Site-19's analysts drew it, a clipped
    file photo on each anomaly's card, and a field photograph for every incident by kind (breach, manhunt, cover-up,
    strike, ambush, retaliation, outbreak, riot, raid, lost team, site emergency).
  - World Map: Natural Earth coastlines (public domain, credited) instead of rough outlines, a lit sea with wave
    texture, a coastal glow, textured land, a compass rose, each incident's icon in its marker, Site-19's seal,
    facilities as buildings, and planes drawn as aircraft.
  - Research: an icon on each category tab and project; SCP-173's file photo on the test log.
  - Personnel: each equipment slot shows its weapon (by type), armor, suit, uniform, pistol, attachment, ammunition or
    item drawn side-on.
  - History: an icon per category.
- **(6) Portraits (done):** a lit backdrop with measuring marks, shading on the face and neck, ears, eyes with whites,
  a nose, collar lapels and a rank bar, and a vignette, still built from the same look data.

### 4B: more anomalies (existing proposal, details pending)
- **5 to 8 new SCPs**, each with its own tactical behaviour, containment routine and procedure, research line and
  capture method, in the way SCP-173, 049, 106 and 610 differ (candidates: SCP-096, SCP-939, SCP-008, SCP-012,
  SCP-035, and SCP-682 as a long-term Keter threat that can't be killed, only held). Every one credited to its author
  under CC BY-SA 3.0, checked against the SCP Wiki page.
- **Sightings, transfers and breaches** reuse the existing systems; new Safe-class objects can join the transfer pool.
- **Anomaly interactions:** some anomalies affect others or the site (for example a breach in one wing raising the
  risk next door in specific ways).

### 4C: maps and mission variety (existing proposal, details pending)
- **More maps:** new field and facility maps (rail yard, church, research lab, ship, Site-19 levels for base defence).
- **Generated layouts:** maps assembled from room pieces so missions don't repeat, keeping cover, exits and objective
  placement fair.
- **Multiple floors in 2D:** stairs and lifts between floors on one map, with a floor switcher, before true elevation in
  Phase 5.
- **New mission types:** fighting GOC strike teams and GRU-P units tactically; Site-19 base defence across levels;
  escorting a transfer through a hostile town; investigating a site gone quiet.

### 4D: campaign story and endgame (existing proposal, details pending)
- **A campaign arc:** the Chaos Insurgency's agenda, the O5 Council and the anomalies build toward a defined climax
  instead of running forever. Story beats unlock at milestones (years passed, anomalies held, the agenda's steps,
  commanders defeated), each with a briefing and a real choice.
- **Victory:** a final operation (several linked missions, Avenger-assault style) that becomes available once Site-19
  meets clear conditions, shown on the Command tab as a checklist so the player can see how close they are.
- **Defeat:** the existing losses (fronts collapsed, standing gone) plus the agenda completing too many times; each ends
  with an epilogue built from the campaign history.
- **Epilogue and record:** a closing report drawn from the History tab: operatives who served, who fell, anomalies held
  and lost, the Council's verdict.

### 4E: economy overhaul (agreed, priority)

**Problem:** Too few ways to earn funding, and existing income is consumed too quickly by expenses; prolonged waits make the game less fun.

- **Primary income: Foundation funding.** Provide reliable monthly baseline support, adjusted by O5 Council standing and campaign progression. Make the next payment date and expected amount visible. This is the principal source of income, not tactical mission grinding.
- **Supplementary income:** (1) regional fronts and their recurring contributions; (2) optional paid Council contracts; (3) research milestone grants; (4) recoverable mission assets and salvage; (5) selective mission funding rewards; (6) sales of surplus equipment through existing trading channels; (7) emergency O5 funding requests with explicit political or future-budget consequences. Preserve meaningful noncash mission rewards such as personnel, gear, Intel, and research.
- **Rebalance expenses:** review recruitment, standard loadouts, early research, facility upkeep, and damage repair against expected monthly income. Routine operation and occasional casualty replacement should be sustainable for a reasonably successful player; advanced projects and major losses should still require tradeoffs.
- **Financial overview:** show current cash, recurring funding by source, upkeep by category, one-off costs, next Council payment, net monthly projection, and why income changed. Show costs and projected remaining cash before purchase.
- **Pacing:** avoid dead periods where the only useful action is waiting for a paycheck. Ensure accessible lower-cost options and worthwhile opportunities during recovery periods, without giving unlimited money.
- **Completion check:** playtest early and midgame campaigns: a reasonably successful player can maintain Site-19, replace occasional losses, and steadily progress without repetitive waiting, but cannot buy every upgrade immediately. Balance using actual costs and reward rates, not arbitrary across-the-board increases.

#### 4E as specified (before building; numbers are for Agent difficulty)
Measured before the change: a campaign that only lets time run loses about $40k a month. The Council grant ($110k at
standing 50) barely covers facility upkeep and salaries (about $145k at the start), and the starting $400k is
effectively the only spending money until missions pay out.
- **Ledger:** every change to funds goes through one function with a category and a reason. The campaign keeps this
  month's and last month's totals by category and the last 40 entries. Income categories: Council grant, fronts,
  contracts, research grants, mission rewards, salvage, sales, emergency funding, other. Spending categories: facility
  upkeep, salaries, alert level, construction and repairs, research, workshop, recruitment and hiring, field
  operations, staff care and training, losses, other.
- **Council grant (primary income):** 100 + 1.5 × standing + 15 for each anomaly Site-19 holds that can breach (up to
  4) + 10 for each full year of the campaign (up to 5) + any granted increase + the difficulty's adjustment, minus
  any emergency-funding repayment due; never below 40. At standing 50 with SCP-173 held this is $190k (was $110k).
- **Fronts:** each established front sends max(5, 45 − 0.3 × its region's exposure) a month (was max(3, 33 −
  0.25 × exposure)), halved while an Insurgency infiltration runs there, as before.
- **Council contracts (new, noncombat):** two paid contracts are on offer at a time, each open for 10 days, with a
  new one arriving as one is taken or lapses. Accepting one sends people away for its length; they come back paid.
  Kinds: engineering secondment (2 engineers, 10 days, $50k); research consultancy (1 researcher, 12 days, $45k);
  training cadre (1 fit operative, 14 days, $60k, +1 XP); security detail (2 guards, 10 days, $40k); courier escort
  (1 fit operative, 6 days, $50k, 15% chance they come back wounded). Pay rises 10% per campaign year. People away
  can't be used, as with any absence.
  Changed later (user decision): the player picks exactly who goes: the operative, the two engineers, the researcher
  or the two guards, from those free, with the obvious choices preselected.
- **Research grants:** finishing an anomaly, object or Insurgency project earns a $25k Council research grant;
  finishing a breakthrough earns $40k.
- **Salvage:** after a tactical mission, $5k for each Insurgent put down or captured (weapons and kit recovered
  beyond what research keeps); a broken Insurgency cell's stores add $20k.
- **Mission rewards:** the existing per-kind bonuses stay; they are shown in the ledger as mission rewards.
- **Sales:** surplus stores (armor, items, attachments, special ammunition) can be sold back from the workshop for
  half their cost. Captured weapons still sell to partner sites as before.
- **Emergency appropriation:** available from standing 15 (was 35): $120k at once and −10 standing, and the next two
  Council grants are each $30k smaller. Shown on the request and in the finances card while repayment runs.
- **Expense rebalance:** recruits $70k / $110k / $160k (was 100 / 140 / 190); researchers $50k (was 60); upkeep of
  the research lab and the Euclid wing $15k (was 20), Security station $10k (was 15). Construction, research and
  workshop prices stay, so a player still has to choose.
- **Finances card (Command tab):** cash; the next Council payment's date and expected amount with its parts; income by
  source and upkeep by category per month; net monthly projection; last month's actual totals by category; why the
  grant changed since last month (standing, anomalies held, years, repayment); the latest entries.
- **Cost preview:** hovering or focusing any button that spends money shows the cash left afterwards.
- **Pacing:** contracts, sales and salvage give useful things to do while squads recover, and none is unlimited.
- **Completion check:** a scripted year of play (missions won at a steady rate, a facility or research project bought
  whenever affordable, losses replaced) ends with Site-19 maintained and growing but not everything bought; a passive
  year no longer bleeds money to zero, yet doesn't pile up cash either. Results recorded under "As built".

#### 4E as built (done; verified in source and in-game)
Everything in the specification above is in, with the grant base set to 100 rather than 120 after the first test
showed a passive player gaining about $100k a month. Files: src/campaign/ledger.ts (the books), contracts.ts
(Council contracts), grantParts in council.ts, upkeepParts in base.ts, the research grant and store sales in
research.ts, salvage in campaign.ts; the Finances and Council contracts cards and the cost preview in hubView.ts.
All 56 places that changed funds now go through the ledger.

Measured:
- **Start of a campaign (standing 50, SCP-173 held, one front):** the next payment shows $190k from the Council and
  $42k from the front, against $120k of upkeep and pay: +$112k a month before anything is bought (was about −$10k).
- **Passive play** (time runs, nothing answered): standing sinks to the 20s and the grant falls with it; funds creep
  up by roughly $60k a month while the inspector's audits and the Council's displeasure build.
- **Scripted active year** (answers incidents through the real deploy and debug-win flow, keeps researchers busy,
  builds when over $450k, replaces losses): in the months it kept up, it bought research steadily ($110k to $260k a
  month) and a facility, and stayed roughly level, with income $250k to $340k a month. The script only managed 15
  missions in the year (squads tired or flying home), so incidents went unanswered, standing hit 0 by month 7 and the
  O5 inspector's fines ($100k to $200k a month) drove funds below zero. That is the standing system working as
  designed against a player who ignores incidents, not the economy failing a successful one; a better scripted player
  is needed to confirm the late game.
- Contracts tested end to end: two on offer, accepting sends the named people away, they return on the due day and
  the pay lands in the ledger. Emergency funding: $120k at standing 20, repaid $30k from each of the next two grants.

### Insurgency operations as a choice of missions (requested during 4E; agreed)
Like XCOM 2's guerrilla operations against Dark Events. Before, the month's three Insurgency operations were mostly
answered with Intel (Disrupt), one was hidden, and only one came with a cell to strike.
- **Three missions:** on the first of each month all three operations are identified, and each comes with a strike
  mission against the cell running it, in the operation's region (or near Site-19 where there's no front). The three
  arrive as one group, open until the earliest operation's window starts.
- **Choose one:** committing a squad to one of them closes the other two. Winning the mission breaks that operation; losing it lets it go ahead.
- **The rest are guaranteed:** operations whose missions were passed over or lapsed are marked as going ahead and will
  happen within their window. They can no longer be disrupted with Intel. Passing them over doesn't cost standing or
  count as an unanswered incident; the cost is the operation itself.
- **Intel still works first:** before the choice is made, any of the three can be disrupted with Intel as before,
  which also removes its mission.
- **Shown:** the Insurgency card lists each operation with its mission (open, chosen, going ahead or broken); the
  monthly log says the three missions are in and only one can be answered.
- **As built (done; verified in source and in-game):** newPlans in chaos.ts identifies all three operations and
  creates a strike mission for each (port, town or farm map) in one group; lockPlan marks the passed-over and lost ones
  as going ahead; the strike expiry in world.ts locks instead of raising the agenda; applyResult locks on a loss. Test:
  three missions appeared together, committing a squad to one closed the other two, winning disrupted that operation,
  the other two were logged as going ahead, and the card shows them as Going ahead without a Disrupt button.

### 4F: dynamic Geoscape activity (agreed, priority)

- **Events appear with time:** time-limited supply and equipment recovery, Intel leads, Council assignments, covert opportunities, resource discoveries, and hostile preparations appear dynamically, influenced by campaign state and regional contacts.
- **Interaction from the World Map:** each marker presents a location, deadline, known risks, potential rewards, available actions, and expected duration. Actions include dispatching an existing team, assigning covert personnel, investigating, accepting a Council task, or declining/ignoring the opportunity.
- **No Avenger-style scan loop:** do not force the player to move Site-19 or idle an aircraft over a location for days to claim a reward. Aircraft transport field teams; intelligence work uses existing regional fronts, surveillance, SIGINT, and covert systems.
- **Meaningful choices:** some opportunities compete for personnel, travel time, resources, or attention. Unanswered events expire or evolve with visible consequences. Not all events require a tactical mission; noncombat assignments have risks and outcomes.
- **Keep the map alive:** show incident updates, faction activity, travel, new leads, and resolved operations without overwhelming the player with repetitive notifications.
- **Completion check:** during a normal campaign month, players see varied optional activities and can make useful strategic choices while squads recover, without introducing a duplicate Intel economy or artificial scanning timer.

#### 4F as specified (before building)
What exists: incidents (anomalies, cover-ups, cells, attacks, emergencies), field operations the player starts by
hand with agents, Council orders, offers and contracts. What's missing: opportunities that turn up on their own,
on the map, that aren't all fights. 4F adds **leads**: a new kind of World Map marker.
- **Kinds (each with a deadline and its own actions):**
  - *Supply recovery*: a crashed Insurgency truck or an abandoned army dump. Send an agent (3 days, $10k, 75%:
    two workshop items or captured weapons; 15% the agent is hurt) or send Epsilon-11 (a recovery mission on the
    map, guaranteed haul plus salvage).
  - *Intel lead*: a defector, a talkative clerk, an intercepted courier. Agent meeting (3 days: +3 Intel; 15% a trap,
    the agent is hurt) or buy the papers ($40k: +2 Intel at once).
  - *Council assignment*: the O5 Council wants something checked in person. Agent (4 days: +4 standing and $30k;
    10% the agent is hurt) or decline (−2 standing).
  - *Covert opportunity*: an Insurgency safehouse is lightly held. Agent surveillance (5 days: +2 Intel and the
    Insurgency agenda −3) or a strike by Epsilon-11 (a strike mission with a reward attached).
  - *Resource discovery*: a university lab closing, a contractor folding, a surplus sale. Hire a researcher ($25k)
    or two engineers ($60k) at once, or buy two workshop items at half price.
  - *Hostile preparation*: Insurgents gathering near a town. Pre-emptive strike by Epsilon-11 (a strike mission),
    have the front quietly disrupt it ($50k, 60%), or ignore it; ignored or failed, it becomes an attack on that town
    (the existing retaliation incident) on its deadline.
- **How they appear:** roughly one every week (3 to 5 a month), at most four on the map at once, weighted by the
  campaign: regions with a front produce most of them (the fronts hear things); the Insurgency's agenda makes hostile
  preparations and covert opportunities likelier; higher standing brings more Council assignments. No region gets two
  at once. Each is open for 5 to 12 days.
- **On the map:** a teal marker with the kind's icon. Selecting it shows the place, the deadline, what's known of the
  risk, the possible rewards, each action with its cost, duration and chance, and Decline. Agent actions need a free
  field agent (shared with field operations); Epsilon-11 actions use the existing deploy panel and travel time.
- **Consequences:** an agent action shows as under way on the marker until its result; a declined or lapsed lead
  disappears, except hostile preparations, which turn into attacks. Results are logged once, without pausing time.
- **No scan loop:** nothing requires parking a plane or waiting at a location; agents and the fronts do the legwork.
- **Completion check:** a test month shows several leads of different kinds; each action resolves with its stated
  outcomes; an ignored hostile preparation becomes an attack; agents are shared correctly with field operations.

#### 4F as built (done; verified in source and in-game)
src/campaign/leads.ts holds the six kinds, their actions and outcomes, spawning and the daily tick; the World Map
draws leads as teal hexagon markers with the kind's icon and days left (or "agent" while one is working it), lists
them under the incidents in the side panel, has a Leads filter, and opens a briefing with the place, deadline, risk,
reward and each action's cost, duration and odds. Agents on leads count against field operations (agentsFree).
Squad actions turn the lead into a strike mission with its reward attached (gear for supply, 3 Intel for covert) or,
for hostile preparations, a strike whose failure or lapse still brings the attack. The debug menu can spawn each kind
and bring results and deadlines forward. Spawning is about one every five days, never two days running, and always
one after ten quiet days, so a month shows three to five.

Tested: every action of every kind resolved as stated (supply by agent; intel by agent +3 Intel and by purchase
+2 Intel for $40k; Council assignment +4 standing and $30k, declined −2 standing; covert surveillance +2 Intel and
agenda −3, with the agent hurt on that run; covert strike created a strike with an Intel reward; a researcher hired
from a closing lab for $25k; the front's disruption failing and scheduling the attack; a declined hostile preparation
scheduling the attack; supply by squad creating a strike with a gear reward); a lead in progress reduced the free
agents; 60 days of play produced 8 leads of four kinds.

### 4G: tactical combat life and presentation (agreed, priority)

**Problem:** tactical combat currently feels underwhelming and lifeless despite existing rules such as overwatch, suppression, flanking, critical hits, and status effects. Improve their *presentation* rather than reimplementing them.

- **Weapons and impact:** distinct muzzle flashes, shot/burst timing, tracers or projectile cues, recoil, ricochets, debris, hit reactions, critical-hit emphasis, explosion and impact effects, and clear audio differences by weapon type. Keep accuracy and damage readable; effects must not obscure tiles or targets.
- **Operative animation:** readable movement transitions, facing, taking cover/crouching, weapon readiness, firing, reloading where applicable, reacting to near misses and hits, being wounded/downed, and visible equipment differences. Respect existing animation and sprite work from completed 4A; this is a refinement pass, not a restart.
- **Living environments:** contextual alarms, flashing/failing lights, smoke, fire, weather, damaged cover, machinery, containment equipment, environmental sound, and localized effects tied to actual mission state. Distinguish facilities, towns, farms, ports, and containment spaces.
- **Camera and pacing:** restrained camera framing, screen feedback, and short highlights for consequential actions such as critical hits, major SCP abilities, and mission turning points; routine turns remain fast and skippable. Do not force repetitive cinematics.
- **SCP-specific presence:** anomalies should communicate unique behavior through movement, sounds, effects, and environmental reactions, not merely unique stat blocks. Preserve readability and existing SCP mechanics.
- **Combat information:** make selection, movement, cover, line of sight, reaction fire, threat positions, action points, and reasons for hits/misses clear. Include an accessible combat log; animations must not conceal underlying outcomes.
- **Completion check:** compare before/after tactical sessions for clarity, responsiveness, perceived impact, and time per turn; effects must improve atmosphere without slowing down normal play or reducing accessibility.

#### 4G as specified (before building; a refinement of 4A's sprites and effects, no rule changes)
Open questions settled for now (change them any time): the camera does not move, since the whole map is on screen;
consequential moments get a short screen shake and an edge flash, behind an "Action highlights" toggle (on by
default); enemy turns have a Normal/Fast setting. Both settings sit in the Sound panel and are remembered per viewer.
- **Weapons and impact:** each shot is a visible round travelling from the muzzle to where it lands (a bright head and a
  fading trail), with bursts for machine guns and SMGs timed to their sound; the shooter's sprite kicks back; hits
  throw a puff at the target (blood for people, dark ichor for SCP-049-2 and SCP-610, sparks off armor); misses land
  beside the target with sparks and dust, and a miss that cover caught throws chips off that cover; criticals get a
  larger "CRITICAL" callout. Explosions: a fireball, a shockwave ring, flying debris, and smoke that lingers, leaving a
  scorch mark on the floor for the rest of the mission. All effects are under about 0.7 s and drawn translucent.
- **Operatives:** units in cover show XCOM-style shield badges (half or full, against the threats they can see);
  overwatch shows the weapon raised; reloading shows a callout and a brief weapon swap; a near miss makes them flinch;
  anyone under half health shows blood on their uniform; the downed bleed as before.
- **Living environments:** Site-19's maps flash red alarm lights along the walls while the siren sounds, and lights
  flicker where power is out; consoles and instrument cabinets blink; the surface compound has a searchlight sweeping
  at night; towns have street lamps at night; smoke drifts; fire has flames, embers and rising smoke. An ambient bed of
  sound per kind of map (the hum of Site-19, a town, wind and insects on the farm, water at the port) plays under the
  score.
- **Highlights and pacing:** a critical hit, a kill, an explosion, SCP-173 killing, SCP-106 rising, SCP-049 raising a
  body, and reinforcements arriving give a short shake or edge flash; mission turning points (reinforcements,
  the anomaly escaping, the objective done) show a banner across the map for about a second without blocking play.
  Fast enemy turns cut the pauses between enemy actions to a third.
- **SCP presence:** SCP-173's kill is a hard crack with a red flash; anyone blinking near it darkens the screen edge for
  an instant; SCP-049 leaves a faint mist and raises bodies with a pale flash; SCP-106 brings a low rumble and bubbles
  in its puddle before it rises; SCP-610's flesh pulses like a heartbeat.
- **Combat information:** action-point pips over each team member; the shield badges; floating "MISS", "COVER" or
  "GRAZE" text that says why; and a one-line summary of what happened in the enemy turn in the action bar. The incident
  log keeps every outcome in words, so nothing depends on seeing an animation.
- **Completion check:** before/after screenshots of the same mission; enemy-turn time measured at Normal and Fast (Fast
  must be faster than before 4G); a turn of play with highlights off shows no shake.

#### 4G as built (done; verified in source and in-game)
- **Effects (src/game/types.ts, src/ui/fxdraw.ts):** the rules emit effects and the renderer draws them; no rule
  changed. A shot is a tracer with a bright head and fading trail travelling at about 1.5 px/ms (60 to 240 ms); machine
  guns fire a 4-round burst 75 ms apart and SMGs 3 rounds 60 ms apart, matching their sound. The shooter kicks back
  for 140 ms. Where it lands: blood for people, dark ichor for SCP-049-2 and SCP-610 instances, sparks off armor or an
  anomaly, dust and sparks for a miss, and chips thrown back off the cover for a miss the cover caught (a miss whose
  roll fell inside the cover penalty strikes the cover tile facing the shooter). The damage number and the
  MISS/COVER/GRAZE text appear when the round arrives, with a ricochet sound off cover. Criticals add a larger
  "CRITICAL" callout. Explosions (grenades, rockets, sapper charges, fuel drums) draw a fireball, shockwave ring and
  debris, leave smoke for about 6 s and a scorch mark for the rest of the mission.
- **Operatives (src/ui/sprites.ts, render.ts):** shield badges by each operative (blue full, amber half, red "!"
  flanked) against the hostiles in sight that can see them, or the best adjacent cover when none are; overwatch holds
  the weapon raised; Reload shows "RELOADING" with the weapon dipped and a magazine in the off hand; a MISS or COVER
  makes the target duck aside; anyone under half health has blood on their uniform; action-point pips over every team
  member during the player's turn.
- **Living environments (src/ui/living.ts):** lab and control-room cabinets and the Site-19 panel blink; on Site-19
  maps during a breach or riot about 40% of ceiling lamps stutter in bursts; red beacons along the walls turn while the
  breach siren sounds; the town's street lamps light at night along the kerbs; the surface compound's watchtower
  searchlight sweeps the yard at night; canister smoke rolls and drifts; fire has flame tongues, embers and rising
  smoke; SCP-610's flesh beats (a strong and a weak pulse, about once a second). Ambient beds per map
  (src/ui/audio.ts `ambience`): Site-19 hum with ventilation knocks, a town murmur, farm wind with insect chirps, water
  at the port, wind at the compound; they stop when the squad returns.
- **Highlights and pacing:** `highlight()` (shake plus a coloured edge flash) on a critical, a kill (a team death
  shakes harder and flashes red), any explosion, SCP-173 killing, SCP-106 rising and SCP-049 raising a body.
  `banner()` across the map for 1.3 s on: Insurgent reinforcements landing, Site Security or Epsilon-11 arriving,
  SCP-173 escaping, the commander escaping, the radio cut, and the anomaly contained; each plays a short brass sting.
  The shake moves in whole pixels. The Sound panel gained "Action highlights" (on by default) and "Enemy turns:
  Normal/Fast", saved with the volumes; Fast divides every pause outside the player's turn by three (`pace` in
  src/game/state.ts).
- **SCP presence:** SCP-173's kill is a crack sound, red flash, fracture lines and a red edge flash; a blink by anyone
  within 6 tiles of it darkens the screen edge for a quarter second; SCP-049 trails a faint mist and raising a body is a
  pale flash with a rising whine; SCP-106 bubbles in its puddle while under the floor and rises with a rumble and a
  spreading dark ring. (Fixed in passing: SCP-049's and SCP-106's flashes were drawn at tile numbers instead of pixels,
  in the map's top-left corner.)
- **Combat information:** the action bar opens each player turn with a one-line summary of the enemy turn (shots at
  the team and hits, damage taken by name, anyone lost, hostiles that moved in sight). The incident log is unchanged
  and still records every outcome in words.
- **Completion check (tests/accept4g.e2e.cjs, 11 checks pass):** before/after screenshots of the same staged wing C
  strike, taken mid-shot against a build of the commit before 4G; the shot produces a travelling tracer with an impact
  and a reason text; the enemy-turn summary appears; with seeded dice and the Insurgents engaging, enemy turns averaged
  823 ms before 4G, 857 ms at Normal and 311 ms at Fast; the speed setting is saved; with highlights on a jolt shakes
  the map (control), and with highlights off a turn of play including shots, a jolt and an explosion moves the canvas
  0 times.

### 4H: combat variety, mission pacing, and progression (agreed direction, specifics to design together)

- **Encounter variety:** build on existing enemy roles and anomalies with different tactical situations, reinforcements, changing objectives, optional goals, and environmental complications. Do not merely add hit-point-heavy enemies.
- **Mission variety:** diversify maps, objectives, and mid-mission developments; include recovery, rescue, containment, defense, disruption, and extraction variants using existing systems where possible.
- **Progression that changes play:** new equipment, armor, abilities, research, and task force options should enable visibly different tactics, not just small numerical bonuses. Ensure useful rewards arrive regularly.
- **Gameplay rhythm:** support a loop of mission → tangible reward → meaningful upgrade/decision → next opportunity. Keep downtime strategically useful rather than mandatory inactivity.
- **Completion check:** repeated missions should require different decisions and grant meaningful progress; playtest for repetition and downtime.

### 4I: tactical map geometry, visibility, facing, firing, and sound (agreed, priority)

**Scope and map size:** Keep current tactical map dimensions for Phase 4. Increase environmental density and believable detail, not map area. Preserve existing tactical rules where sound; repair the geometry and perception foundation rather than layering cosmetic fixes over broken sight lines.

#### Environment detail, openings, and destruction
- Distinct, purpose-built rooms and regions: furnished Foundation laboratories, checkpoints, containment areas, offices, urban streets/interiors, outdoor terrain, and damaged breach sites. Place functional props coherently, respecting navigation, cover, objectives, and sight lines. Animate relevant lights, monitors, machinery, weather, smoke, and alarms without obscuring gameplay.
- **Doors:** standard, security, reinforced containment, emergency, and damaged variants with meaningful open/closed/locked/breached/destroyed states. Doors must affect navigation, visibility, sound propagation, cover, and firing according to material and state. Open doors create actual geometric openings.
- **Windows:** ordinary, reinforced observation, and broken variants. Transparent panes permit appropriate sight lines but may block projectiles or movement; glass can shatter and persist as broken. Windows must be placed logically in the layout.
- **XCOM-style selective destruction:** appropriate cover, furniture, doors, windows, and designated walls/partitions can be damaged or destroyed by suitable weapons/explosives. Reinforced structural and containment walls resist ordinary attacks. Destruction persists, changes cover and routes, and is recognized by AI. Not every decorative object or structural surface must be destructible.
- Separate logical terrain, structure, functional props, decoration, and presentation layers so visual detail never silently changes collision or cover; retain compatibility with the planned Phase 5 3D conversion.

#### Geometrically correct vision and line of fire
- Replace arbitrary short tile-radius sight cutoffs. In clear conditions, units can potentially see across the entire tactical map; detection/identification quality may vary with distance, lighting, weather, smoke, concealment, and equipment.
- Calculate visibility against actual obstruction geometry, including corners, partial cover, windows, door openings, and destructible geometry. Do not let solid walls block valid diagonal sight through an opening, or permit sight through opaque surfaces.
- **Side-of-entryway test:** a unit immediately beside an open doorway can see diagonally into the room when a physically unobstructed sight ray passes through the opening, including broad angles around 90 degrees or more when geometry permits. Do not impose an arbitrary 90/120-degree doorway cap or require standing directly in front of the door. Model plausible peeking/leaning where necessary, with corresponding exposure.
- Separate **visibility**, **identification/awareness**, **current facing**, and **weapon line of fire**. A visible enemy is not necessarily shootable. Trace shots from a valid weapon/lean firing position, not a tile-center shortcut that lets bullets pass through solid walls. Account for cover, transparent-but-ballistic-resistant materials, partial exposure, and changed geometry. Return fire must respect any exposure created by peeking or shooting.
- Player and ordinary human AI follow the same visibility and firing rules. SCP-specific perception exceptions must be explicit and anomaly-specific. Fog of war retains explored terrain and last-known positions without revealing currently unseen enemies.

#### Automatic facing with manual override (confirmed)
- Preserve **XCOM-like broad/360-degree environmental awareness**: a unit does not have to face directly toward an unobstructed enemy to notice them. Facing influences animation, attention, and applicable reaction behavior; it is **not** a rigid visibility cone that makes enemies behind a unit disappear.
- Units automatically orient toward movement, aiming, interaction, and relevant threats. Players may freely set a preferred facing direction during their turn, without spending action points; that direction persists as the resting orientation until changed.
- Transient reactions (such as glancing toward a sound) may temporarily override facing, then return to the stored preferred orientation if no threat is visually confirmed. Clearly display facing and allow players to set it without excessive micromanagement.

#### Auditory detection and context-sensitive reactions (confirmed)
- Model footsteps, running, doors, glass, gunfire, explosions, alarms, and relevant SCP sounds. Propagate audible events with approximate direction and confidence, accounting for distance, loudness, intervening walls/doors, and ambient noise.
- Show **subtle, approximate directional sound indicators** and contextual voice/text callouts; hearing does not disclose exact unit coordinates or reveal enemies through walls.
- **Footstep acceptance test:** on hearing nearby footsteps, an operative briefly turns toward the estimated source and checks for visible threats. If none is seen, the operative returns to the previous preferred facing. If a threat is visually confirmed, the operative keeps attention on it. Stronger or more dangerous sounds trigger proportionate alert reactions rather than the same animation for every sound.
- Distinguish **visual contact**, **auditory contact**, and **last-known position** in UI and AI decision-making. Human opponents investigate sounds under the same underlying rules; anomalies can have explicitly defined exceptions.

#### Acceptance and regression tests
1. A clear, unobstructed long-distance sight line across the existing map reveals a detectable target; introducing an opaque wall blocks it.
2. A unit positioned immediately left or right of a doorway can see diagonally through the opening, including at steep angles, but cannot see through the adjacent solid wall.
3. A unit behind full cover cannot fire through an intact solid wall; firing around a corner requires a valid exposed firing point and permits appropriate return fire.
4. Open/closed/broken doors and windows change sight, sound, movement, and projectile behavior according to their actual properties.
5. Destroying eligible cover or a designated partition updates navigation, cover, visibility, firing, and enemy pathing without requiring a reload.
6. A manually oriented unit hearing footsteps turns to investigate, receives a non-exact sound cue, and resumes preferred facing if no threat is found.
7. A visible enemy behind the operative can still be detected under general XCOM-style awareness; facing does not impose an arbitrary blind sector.
8. New map props and effects do not create misleading cover, block objectives, or degrade tactical readability; map dimensions remain unchanged.

#### 4I as built (done; verified in source and in-game)
- **Structure layer (src/core/grid.ts):** doors have a kind (standard; security inside Site-19; containment into a cell)
  and a state (open, closed, locked, breached, destroyed). Cell doors start shut; the rest are found open (47%), shut
  (47%) or already kicked in (6%), randomly each mission (user decision). New tiles: windows (`w` ordinary, `W`
  reinforced observation glass, intact or broken) and partitions (`p`). Opaque = walls, full cover, steel, partitions
  and shut doors; windows are transparent. Passable = floor, exits, container, open/closed/breached/destroyed doors
  (not locked doors, windows or partitions). A separate "stops a shot" test adds intact reinforced glass. A version
  number goes up on every structural change and clears the sight caches and the map's art.
- **Vision (src/core/sight.ts):** no fixed radius. Clear daylight sees the whole map; rain caps sight at 14 tiles,
  snow 12, storm 10, fog 6, night 6 (4 at night in bad weather), Keen eyes and research add to a cap; flares still let
  the lit area be seen from 30. Rays run against the real geometry; the 30° doorway limit is gone, and a ray grazing
  a single wall corner passes while two walls touching at a corner still block. Leaning out past a wall edge stays.
- **Line of fire (src/game/combat.ts):** lineOfFire picks a spot the shooter can fire from (own tile or a lean spot)
  with a clear ballistic line to the target (or to where the target leaned out this turn). Seeing isn't shooting:
  through reinforced glass you can watch but not fire. Leaning out to fire leaves the shooter exposed at that spot
  for the reply. Ordinary glass the shot passes through shatters and stays broken. All player, overwatch and AI
  shooting use it; the target tooltip and percentages show only shootable enemies.
- **Doors and destruction:** walking through a shut door opens it (and makes a noise). Grenades take half cover,
  doors, partitions and glass; rockets and breaching charges also take ordinary interior walls, but never Site-19's
  reinforced walls or the map edge. The sapper's charge now opens partitions, shut doors or ordinary walls only.
  Everything changed updates pathing, cover, sight and fire immediately.
- **Maps:** reinforced observation windows from wing C's corridor into SCP-173's cell; partitions between the records
  room and the canteen; the D-Class block's guard room overlooks the cell corridor through reinforced glass; shop and
  house windows on Main Street; farmhouse, port office, gatehouse, office and barracks windows; a storeroom partition at
  the port. Wing C and the D-Class block are marked reinforced. Map sizes are unchanged.
- **Facing (src/game/noise.ts):** units face where they last moved, fired or glanced; the Face button (F) sets a
  resting direction for free. Facing is not a sight cone: anyone behind is still seen. A reaction shot at someone more
  than 90° off the shooter's facing takes −10 ("Turning to fire").
- **Hearing:** footsteps 7 tiles, doors 9, SCP-173's scrape 9, breaking glass 12, gunfire 24, explosions 32; −1 per
  tile, −5 per wall or partition, −3 per shut door, less in a storm, rain or under the siren. The team hears only what
  it can't already see: each listener gets a direction, rougher the fainter it was, drawn as an arc and arrow by them,
  a one-line callout ("E11-03 hears footsteps to the north"), and a glance; at the start of the next turn they turn
  back to their resting direction unless an enemy is in sight, in which case they face the nearest. Insurgents hear by
  the same rules, remember a rough spot, and send the pod to look. Suppressed weapons make no gunfire noise; Quiet
  steps makes no footstep noise.
- **The AI plays fair:** Insurgents move on where they can see team members, where they last saw them (two turns), and
  what they heard, not on the team's true positions (except on raids, ambushes and attacks, where they know their goal).
  Enemies that drop out of sight leave a "last seen T#" ghost marker until seen again.
- **Tests (tests/accept4i.e2e.cjs, on wing C in a live mission), all 8 passing:** (1) a 25-tile corridor sight line,
  blocked by a wall; (2) from beside a doorway, sight into the room at steep angles through the opening and not
  through the wall beside it; (3) no shot through a wall, and a corner shot only from the lean spot; (4) closed, open,
  locked and destroyed doors and intact/broken reinforced glass each change sight, movement and fire correctly;
  (5) a partition blown open changes sight and movement at once, while a rocket against a reinforced wall does nothing;
  (6) footsteps behind a shut door are heard with a rough direction, the listener glances north and turns back to east;
  (7) an enemy straight behind is still seen; (8) map size unchanged and every window sits in a wall line.

### Open planning questions (NOT approved feature specifications)

- Which visual problem dominates tactical combat: stiff character motion, weak weapon impacts, lifeless environments, or insufficient enemy activity? Decide the order after looking at actual gameplay.
- How much camera movement is desirable in a 2D tactical game, and should cinematic highlights have a toggle?
- What exact funding amounts, upkeep targets, and event frequency produce healthy campaign pacing? Determine through campaign testing.
- Which additional SCPs, mission types, and progression systems belong in the final Phase 4 scope beyond the existing 4B–4D proposals?

## Phase 4 order

Priority by priority; each part is finished and verified before the next starts. Decided by the user (4F moved ahead
of 4I and 4G after 4E):
1. 4A art and sound (done).
2. 4E economy overhaul (done).
3. 4F dynamic World Map activity (done).
4. 4I tactical map geometry, visibility, facing, firing and sound (done; the foundation 4G builds on).
5. 4G tactical combat life and presentation (done).
6. Next: 4B more anomalies, 4C maps and mission variety, 4H combat variety and progression.
7. 4D campaign story and endgame last.

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
