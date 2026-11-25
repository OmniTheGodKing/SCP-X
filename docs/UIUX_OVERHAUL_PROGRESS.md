# UI/UX overhaul: personnel, armory, squad preparation and Geoscape

Directive: turn the strategic screens into scene-driven strategy-game interfaces (XCOM 2 composition, SCP-X's own
1951 Foundation identity), on top of the existing systems. References: four XCOM 2 screenshots supplied with the
brief (squad select, soldier abilities, two Geoscape views), used for composition and hierarchy only.

## Audit and discrepancies with the Master Game Design Context

The design context (Draft 12) describes systems this repository did not have. Recorded here rather than silently
assumed:

| Design context | Repository before this pass | What this pass did |
|---|---|---|
| Custom player MTF, General Containment primary, player-named | Fixed task forces `e11` (Epsilon-11) and `eta10` | Added an MTF record per task force with a player-editable designation and name, primary specialization, squads, founding date (`src/campaign/org.ts`) |
| Two squads per MTF, expansion "tentatively" to four | No squads | Two squads at start, up to four (`ORG.maxSquads`), forming one costs $100k |
| Squad specialty from the primary's pool, separate from soldier class | Soldier classes only | Four General Containment specialties: Breach Response, Containment Security, Recovery & Extraction, Fire Support |
| Specialist equipment needs qualifications; basic kit open to all | Any operative could carry anything in stores | Learned qualifications per operative; specialist kit (stun/CS grenades, heavy plate, restraints, seismic sensor, lead suit, dart pistol, containment suit, flamethrower, bazooka, LAW) needs the matching one. Enforced in the UI and in `buildSetup` |
| Deploy size 4 → 6 → 8 through Foundation-wide research | 4, +1 NCO academy, +1 Command staff (training-range purchases) | Two Personnel research projects, Fire team doctrine (6) and Section command doctrine (8). Saves that bought the old purchases get the projects |
| Epsilon-11 is the tutorial force; the player founds their own MTF afterwards | Epsilon-11 is the player's force throughout | **Not changed.** The player's MTF starts as Epsilon-11 "Nine-Tailed Fox" and can be renamed. The tutorial hand-off is open work |
| Player facility is a placeholder, not Site-19 | "Site-19" throughout | Not changed in this pass |

The four specialties pass the design context's acceptance test through equipment access (what each can bring that
the others can't). None of them adds new tactical actions; those need tactical-layer work (see Remaining work).

## Stage A: shared presentation and the washed-out buttons

Root cause: three separate rules let the scene show through controls.

- `.hub .act.primary` used `rgba(110,169,200,.12)`: a 12% fill, so primary buttons over a room scene or the map
  looked empty.
- `.roomview .objbar .act` and `.act.on` used 78% and 18% fills.
- Every disabled button used `opacity: .4` on the whole element, so over a scene it became a ghost.

Fix: control tokens in `src/styles.css` (`--ctl-bg`, `--ctl-primary-bg`, `--ctl-off-*` and so on). Every
interactive button has an opaque fill; disabled buttons have their own dark fill, dim text and a dashed border instead
of opacity. HUD panels keep their own translucency where it is intentional. `tests/overhaul.e2e.cjs` checks every
visible `button.act` (background alpha and inherited opacity) in the quarters, on the World Map and on the staging
screen.

## Stage B: personnel and armory

- **Personnel inspection** (quarters): the selected operative stands forward at full height with an identity plate
  (callsign, rank, name, class, squad and specialty, MTF, readiness), buttons to step to the previous and next
  operative, and a three-step zoom on the upper body. Front view only: the art has no back or side views, so there
  is no rotation.
- The file opens on a new **Overview** in categories: Assignment (task force, primary, squad picker, specialty,
  class), Condition (readiness, health, sanity, fatigue, injury), Equipment (what is stored on them, with a warning
  for kit they aren't qualified for), Qualifications (learned and in training), Progression, Service. The old
  sections (Loadout, Abilities, Appearance, Service record, Biography) are unchanged.
- **Organization board** (the MTF banner in the quarters): the MTF's designation and name (renamable, with
  established designations such as Nu-7 refused), primary, authorized specialties, deploy size, then each squad
  with its role, trade-off, specialist kit in stores, members with readiness and qualification state, renaming,
  retraining ($40k, 7 days; members keep old qualifications), the reserve, and forming a new squad.
- **Armory bench** additions: weapon identification (type, US service year, Foundation issue), ammunition loaded
  and special rounds in stores, every attachment's status with its real reason (incompatible mount, research
  project, historical date, stores, in production), and the model lineage for the weapon type.
- **Asset pipeline** (`src/ui/assets.ts`, `src/assets/README.md`): a finished file at
  `src/assets/weapons/<model>.webp` replaces the drawn weapon (attachments still draw at the frame's mounts);
  `src/assets/backdrops/staging.webp` replaces the staging hangar. No assets are included; everything is still the
  code-drawn placeholder.

## Stage C: the staging screen

Answering an incident now opens a full staging area in place of the map:

- the operation, place, deadline, travel and night/weather chips across the top;
- **intelligence** on the left: location, deadline, travel, anomaly (or "Unidentified"), hostile faction with
  confirmed and estimated counts kept apart, conditions, then the Confirmed / Estimated / Unknown lines, the
  procedure, and the Intel interception;
- the **team in the hangar**, one figure per chosen operative in the kit they will actually take (unqualified armor
  is left off), standing on numbered marks for every slot; clicking one selects them;
- **readiness** on the right: open slots, unqualified kit, tired or shaken people, missing fire against SCP-610,
  no suit against SCP-106, doses against witnesses, no flare at night, no medkit, outnumbered, unidentified
  anomaly, mixed squads, travel. None of these block deployment;
- a **card per slot** with health, sanity, readiness, the weapon, armor and item selects (unqualified options are
  disabled and labelled), and Stand down;
- the **roster**: the MTF (both task forces when Eta-10 exists), a button per squad that fills the team from that
  squad's fit members, "Whole MTF", and the others in the MTF to attach. Unfit operatives are listed with the
  reason and can't be ticked.

The squad with the most fit members is picked first. Every id the rules and tests use (`data-pick`, `#launchBtn`,
`#gear-*`, `#armor-*`, `#dPlus`) is the same, so the deploy path is unchanged.

## Stage D: the Geoscape

- The map fills the window under the header; its proportions are measured after render and the view refits.
- The pannable area extends into open sea, so "World" fits all the land clear of the operations panel.
- HUD: date, time controls and Insurgency agenda along the top with the marker filters; **Operations** on the left
  (incidents, leads, field operations, funding line, **Task forces** with each squad's readiness and who is in the
  air, the flight out, and **The wire**: the latest Insurgency, regional and Council entries from the chronicle);
  the selected incident, lead, facility or region as a panel on the right with a close button; legend and zoom at
  the bottom.
- Selecting an incident pans its marker into the clear area between the panels.
- Everything shown comes from campaign state; no marker or item is decorative.
- Fixed in passing: links inside manila briefs (the "only one can be answered" links) were light text on paper.

## Tests

- `tests/unit/org.test.ts` (10 tests): new campaign organization, class vs specialty, qualification gating,
  deployment leaving unqualified kit in stores, 4/6/8, old purchases migrating, renaming rules, retraining, recruits
  joining the smallest squad, save and load.
- `tests/overhaul.e2e.cjs` (35 checks): the acceptance tests in the brief, through the UI, from the mid-game save.
- Updated: `combat.e2e.cjs` (sets its four operatives explicitly, since the staging screen now picks by squad),
  `rooms.e2e.cjs` and `environment.e2e.cjs` (open Appearance before changing the look, since Overview is now first).

## Remaining work

- The tutorial hand-off from Epsilon-11 to a player-founded MTF.
- Squad specialties add equipment access only; specialty tactical actions (breach a door, deploy barricades,
  quarantine lines, suppression lanes) need tactical-layer work.
- Additional MTF primary specializations (Biological, Heavy Assault, Reconnaissance) are not implemented.
- Per-weapon condition and maintenance are not modeled, so the armory doesn't show them.
- All art is still code-drawn and provisional. Characters are front-on only; weapons side-on only.
- The Geoscape shows the simulation's existing world activity (Insurgency, fronts, partner sites, Council); a
  world-event director as described in the design context is not built.
- Era-specific interface styling (later Cold War, modernization, contemporary) is not implemented; everything is
  the 1951 look.

## Verification

- `npm run build && npm test`: 24 of 24 suites pass (136 unit tests; `overhaul.e2e.cjs` has 39 checks, including
  solid buttons on the quarters, research, Site-19, Command, World Map, staging and tactical screens).
- Screenshots at 1280×720, 1440×900 and 1920×1080 are in `docs/screenshots/uiux/`. At 1280×720 the header's
  readouts wrap to a second row (unchanged from before), so the staging screen's slot cards sit below the fold and
  the page scrolls to them.
