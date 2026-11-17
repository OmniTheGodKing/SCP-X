# Presentation overhaul: progress record

The directive: turn the strategic screens into a persistent, physical Site-19. Rooms are entered, not opened as
pages; operatives are presented as full figures in their quarters; weapons are inspected and modified on a bench.
Everything is derived from campaign state, and nothing here changes the rules.

## Audit (P0)

| Area | Before this overhaul | Gap against the directive |
|---|---|---|
| Rendering | Inline SVG in HTML string templates (`src/ui/art.ts`, `portrait.ts`, `hubView.ts`) | No scene system: rooms are 120 × 70 vignettes inside cards |
| Rooms | `roomSvg(type, opts)` with a seed per slot | No interiors, no doors or neighbours, no persistent identity beyond the seed |
| Operatives | 64 × 64 head-and-shoulders portraits from `Look` | No full figure; armour and weapon not shown |
| Barracks | The `barracks` facility is the **D-Class block** | Epsilon-11 has no quarters facility |
| Armory | None; loadouts are rows on the Personnel tab | No armory location |
| Weapons | 13 period models, 7 attachments, one attachment per operative, any attachment on any weapon | No mount points, no compatibility, weapons drawn as small icons |
| Navigation | Tabs; selecting a slot shows a side panel | No transition into a room |

### Reference study

- XCOM 2 itself could not be watched or captured here; the interaction sequence below follows the brief's
  description (overview, highlight, camera move, interior, then contextual controls). It is not based on observed
  footage.
- **PixelDoll** (Shilo, MIT): a layered paper-doll studio. Its idea of one base body plus a transparent layer per
  item, all on the same grid and pivot, is adopted for full-body operatives. No code is used.
- **Universal Humanoid Wardrobe** (neymanoff, MIT per its README; the licence file is missing from the repository):
  rigid items such as weapons sit at named skeleton sockets. Adopted as named anchor points (hand, back, head) on
  the figure. No code is used.
- **OpenXcom** (GPL-3.0): its README does not describe base layout; nothing is taken from it.
- **Phaser**: considered and not adopted. The scenes are composed still images with transitions, which SVG and CSS
  already do; adding a canvas engine would create a second renderer for the hub.

### Decisions

- **PD1:** scenes stay SVG/DOM. Each interior is one large SVG drawn from a room layout; HTML carries controls.
- **PD2:** room layouts are pure functions of the campaign (`src/scene/layout.ts`), so a 3D renderer can read the
  same descriptors.
- **PD3:** Epsilon-11's quarters and the armory are fixed locations in the surface compound (the two long buildings
  the surface art has always drawn), not new facilities.
- **PD4:** attachment compatibility is data per weapon model (mount points with stable ids), shared by the rules and
  every renderer.

## Tasks

| # | Task | Status |
|---|---|---|
| P0 | Audit, reference study, art direction (`docs/ART_DIRECTION.md`) | [x] |
| P1 | Persistent room layouts from campaign state | [x] |
| P2 | Interior renderer and enter/leave transitions | [x] |
| P3 | Quarters: full-body operatives and live customization | [x] |
| P4 | Armory: weapon inspection, mount points, visible attachments | [x] |
| P5 | Lab, containment chambers, workshop, command | [x] |
| P6 | Environment-first interface: the rooms are the screens | [x] |

## Log

- P1: `src/scene/layout.ts`. `roomLayout(c, id)` gives a room's:
  - kind, name and designation (L2-B);
  - state (building, damaged, wrecked, repairing, demolishing, upgrading, operational) and whether it has power;
  - side doors (next room, the lift at each level's left end, a sealed bulkhead onto an empty bay, rock);
  - architectural features hashed from its stable id;
  - upgrades, the named people working in it, its occupant, current activity and headcount.

  `allRooms` lists the whole installation. `tests/unit/layout.test.ts` covers: stability and purity, separate
  identities for two rooms of one type, state changes, doors, power, occupants, and the fixed surface locations.
- P2:
  - `src/ui/scene/interior.ts` draws a room as one 1600 x 900 cut-away scene from its layout:
    - the back wall, floor and side walls, with the room's real doors;
    - pipe runs, signage and light fittings from its hashed features;
    - the furnishings for its type, and the named people working there;
    - its state over the top: scaffolding while it's built, cracks, rubble and smoke when damaged, a collapsed
      ceiling when wrecked, scaffolding again under repair, darkness with red emergency lamps without power, and
      beacons in an alarm.
  - Every facility type has an interior. A generator's refit tier changes its machinery, an expanded D-Class block
    gets a fifth bunk row, and the recreation room shows when one is built. Containment wings are dressed for their
    occupant (SCP-173, 049, 106, 096, 012, 939, 682), and the cell grows grime as maintenance falls.
  - People are full figures (`src/ui/scene/figure.ts`): layered on one pivot, with named sockets. Operatives are
    dressed from their saved look, rank, armour, uniform research and weapon (`src/ui/scene/people.ts`).
  - Weapons (`src/ui/scene/weapons.ts`) are drawn side-on from per-model frames in `src/data/mounts.ts`, which also
    holds the mount points and the compatibility table that P4 will enforce.
  - In the hub:
    - Selecting a built room goes into it; empty slots keep the build panel. The armory and Epsilon-11's quarters
      are entered from the surface strip.
    - The room's existing controls are in a panel over the scene (hideable), so every action still works from
      inside.
    - Esc or the Site-19 button leaves; [ and ] step through the rooms in order. The Director's Briefing's Site-19
      items go straight into the room.
  - Transitions (`src/ui/scene/transition.ts`): the room opens out of the slot it was entered from, and closes back
    into it over the live overview. Nothing waits on them: the destination is rendered first. A click or key
    finishes them. Reduced motion, or System, Room transitions, turns them off.
  - The briefing's "N incidents open" item now opens the incident with the least time left.
  - `tests/rooms.e2e.cjs`: entering, leaving, the same room looking the same, stepping, damage and repair from
    inside, the quarters and armory, selecting an operative, the hideable panel, transitions off.
  - Bug found by that test and fixed: the scene's light and vignette layers took clicks meant for people.
- P3:
  - Epsilon-11's quarters show the squad as full figures in their own kit. Selecting one, in the room or the list,
    brings them forward at full height while the rest of the squad steps back into the room's shadow.
  - The file beside them is split into Appearance, Loadout, Abilities, Service record and Biography (`opParts`);
    the Personnel tab still shows the whole file, built from the same parts.
  - Appearance changes redraw the figure at once and are saved with the campaign. Options: sex, skin, hair, hair
    colour, facial hair, scar, headgear, plus three new optional `Look` fields (face shape, jacket, accessory:
    spectacles, cigarette, neck scarf). Older saves read the new fields as their defaults.
  - Armour from the loadout, the uniform research tier, rank stripes, injuries and the weapon with its attachment
    all show on the figure.
  - `tests/rooms.e2e.cjs` covers: bringing an operative forward, five appearance changes each changing the figure,
    the look surviving a reload, every section opening, and returning to the squad.
- P4:
  - Rules (`src/campaign/armory.ts`, `src/data/mounts.ts`): each of the 13 models has a frame, named mount
    points and a fit list from period practice. For example, the Garand takes a scope, improved sights, a match
    trigger, a padded butt or a bayonet, but not an extended magazine (its en-bloc clip); the trench gun takes its
    bayonet; the M3 the OSS suppressor.
  - `fitAttachment` refuses what the issued model can't take. `reconcileAttachments` returns such a fit to stores
    when the weapon changes, when research changes the issued model, and when an older save is loaded; nothing is
    lost. Combat ignores a fit the weapon can't take.
  - New commands `fitAttachment` and `orderAttachment` go through `dispatch`. The Loadout section's picker
    lists only fits and uses the same command.
  - `weaponStats` mirrors combat: scope +5 aim, improved sights +10, match trigger +10% crit, extended magazine +1
    round, and the specials (graze, silence, bayonet thrust).
  - The bench: choose an operative (or take their weapon from the quarters); the weapon lies across the armory bench
    with its mounts marked. Selecting a mount, on the weapon or in the panel, lists what it takes, with research
    and stores. A preview draws the attachment on the weapon (dashed) and shows the figures before and after. Fit
    uses one from stores and says what goes back; Remove returns it; Order at the workshop starts a build. Zoom
    closes in on the selected mount; Cancel discards the preview.
  - There is no rotation: the weapons are drawn side-on, and the brief rules out faking 3D from a flat image.
  - Fixed: the ledger labels for attachment and special-ammunition orders were swapped.
  - Tests: `tests/unit/armory.test.ts` (fits, the command refusing with stores untouched, swap and removal
    returning to stores, figures matching combat, reissue and old-save returns) and `tests/armory.e2e.cjs` (the
    bench, the Garand's missing magazine mount, mount selection, preview, figures, zoom, cancel, fit, refusal,
    persistence, removal).
- P5:
  - Each room's activity is drawn from the campaign (`liveExtras` in the hub, `activity()` in the scene):
    - **Lab:** the chalkboard carries the selected project (its branch, researcher-days, who's on it and a
      progress bar) and a COMPLETE stamp when a project finishes.
    - **Containment wing:** with an experiment under way on its occupant, the D-Class stand at their marks in the
      cell, a researcher watches from the window, and the placard names the test. The wing's panel offers its
      occupant's experiments, with the watcher picker.
    - **Workshop:** the bench carries the first order (an attachment drawn on a rifle, ammunition boxes, or a
      crate) with its progress.
    - **Command:** the operations map's pins are the open incidents, placed by their region's coordinates (red
      and blinking when urgent). The alarm board lights one lamp per critical briefing item; the teletype prints
      the most urgent item; the clock shows the date and hour. The decorative pins the room used to draw are
      gone, since they looked like real incidents.
  - The Research tab opens on the lab and the Command tab on the operations room, each a banner with "Into ..."
    going into that room. Inside the lab, the panel's "On the board" puts any project under way on the board.
  - `tests/scenes.e2e.cjs` covers each of these.
  - campaign.e2e: an incident that must be answered stops the World clock. On this test's fresh random seed that
    can happen early, so the wait now steps the day with the debug control when the clock is blocked.

## Environment-first interface (P6)

Directive: "Environment-first strategic interface overhaul: correct the existing presentation, do not start over."
Commits: `dd1046d` (the interface, tests A to G) and `27670c3` (refinements: panel side, stage height, apparatus,
D-Class crowding, panel widths).

### Architecture reused

- Room interiors are still drawn by `src/ui/scene/interior.ts` from `roomLayout()` (`src/scene/layout.ts`). The
  layout gained `capacity` (D-Class beds across the site) and nothing else; saves are unchanged.
- Every management view is an existing block of `src/ui/hubView.ts`, split out of the old dashboards so it can open
  in a room: `researchCatalog`, `experimentsDossier`, `briefingBlock`, `incidentsBlock`, `inspectionBlock`,
  `situationBlock`, `logBlock`, `personnelRoster`. Their buttons dispatch the same validated commands as before.
- The 3D path is untouched: targets are plain rectangles in scene coordinates, so a 3D renderer can place the same
  ids on its own meshes.

### Navigation

- Research opens the laboratory (the one last picked, else the first operational one, else the first built);
  Command opens the command center; Personnel opens Epsilon-11's quarters. There is no dashboard in between.
- Site-19 shows the cross-section; entering a room from it gives the same room the tab gives (test G).
- World stays the Geoscape and History stays the archive, both unchanged.
- In a room: "← Site-19" leaves, "← (previous room)" returns after a jump (barracks to armory, lab to a chamber),
  the lab selector switches labs, and prev/next walks the level on the Site-19 tab. Esc closes the panel first,
  then leaves the room.
- No lab: the Research tab shows a notice with a button to build one. A lab being built, damaged or without power
  still opens, with its state on the nameplate and its board saying why work has stopped.

### Interaction framework

- `src/scene/targets.ts` (pure): `targetsFor(layout, opts)` lists a room's interactive objects. Each has a stable
  id, a kind (object, person, door, service), an accessible label, the panel it opens and a rectangle in the
  1600x900 scene frame. `signRect` makes the room's nameplate the "Room services" target (build, repair, upgrade).
- `targetLayer()` draws each as a focusable group (`role="button"`, `tabindex="0"`) with a hit area, a ring on
  hover, focus and selection, a pip and a label chip. Enter or Space selects. Only objects that open something are
  targets; there are no decorative hotspots.
- The object bar under the scene lists the same targets as buttons, for keyboard and screen-reader users.
- Unit test `tests/unit/targets.test.ts`: ids unique, every target inside the frame, no two non-person targets
  overlapping by more than 10%.

### Panels and camera

- One contextual panel (`.ctxpanel`) replaces the permanent sidebars. It can be closed (×, Esc) or widened (⇤),
  and holds the full block it replaced, so nothing is lost.
- The panel opens on the side away from the selected object; the camera (`.rv-cam`, scale 1.16) moves the object
  into the free side. Reduced motion turns the move off.
- Command's urgent items run as a ticker along the ceiling (`.cmdstrip`), with Respond buttons for incidents, so
  the briefing's critical lines are on screen without a click.
- The stage fills the window under the header at any size (`--rvh`, kept on resize).

### Rooms

| Room | Targets and what they open |
|---|---|
| Lab | project board (assign researchers, focus), apparatus on the bench (the focused project; drawn by what it makes), records cabinet (experiments dossier, with links to each chamber), researchers (their file) |
| Command | operations display (Director's Briefing, alert level), intelligence clocks, Council teletype, communications console (incidents, Respond), administration, plotting table (to the Geoscape), recruitment desk |
| Quarters | each operative (brought forward full height with customization), roster, armory door |
| Armory | weapon racks (issue), bench (mount points, previews, fit and remove) |
| Workshop | tool board (crews), lathe (orders in production), workbench (what can be built), stores |
| D-Class block | bunks (occupancy, capacity, crowding), orders board (monthly policy, morale) |
| Containment wing | observation window (the anomaly), test console (its experiments), vault door (procedures) |

- Room architecture varies by function: tiled lab, panelled command, ribbed workshop, planked quarters, riveted
  armory, each with its own fixtures.
- People shown: up to four named staff stand at their stations; more appear as "+ N more at work". In the D-Class
  block each figure stands for up to three D-Class (the bunks panel says so), and over 80% of beds the block gets
  floor mattresses and an OVER CAPACITY stencil.

### Tests

- `tests/environment.e2e.cjs`, the directive's tests A to G, clicking objects in the scene itself:
  - A Research: World to Research lands in the lab with no dashboard; the board assigns a researcher (campaign
    changes); closing the panel leaves the lab; the records cabinet opens the dossier; Esc twice returns to Site-19;
    the lab from Site-19 is the same lab with the same board.
  - B Command: Personnel to Command lands in the command center; urgent items are on screen; the operations
    display opens the briefing; changing the alert level changes the campaign; Esc returns to the room.
  - C Personnel: the quarters; an operative comes forward over half the scene's height; a jacket change shows on the
    figure; the look survives leaving and returning.
  - D Armory: the operative's weapon goes on the bench; the scope is previewed, fitted for real, and still fitted
    after a reload.
  - E Engineering: the workbench starts an order; the lathe shows it in production.
  - F D-Class: the bunks show occupancy and capacity; the orders board changes the monthly policy.
  - G The same lab by Site-19 and by the tab, also after a reload.
- Existing suites updated to reach their views through room objects (`openTarget`, `planIncident` in
  `tests/lib.cjs`).
- Result at `27670c3`: `npm test` 23 of 23 suites pass, 126 unit tests.

### Screenshots

Taken at 1280x720, 1440x900 and 1920x1080 with no page errors: the lab, its board, Command and its operations
display, the quarters and an operative, the armory bench, the workshop and its bench, the D-Class block and its
bunks, a containment wing and its observation window. The e2e run also writes `env-*.png` to the test output folder.

### Limitations

- All art is still provisional code-drawn SVG. Final visual fidelity has not been reached.
- The camera is a 2D pan and zoom; there is no 3D camera yet.
- At 1280x720 a zoomed room can slide its painted nameplate under the top bar; at 1920 the bunks panel covers the
  right-hand bunk. Both are presentation only.
- The armory has no weapon rotation.
- The Geoscape and History screens are unchanged.
- Tactical missions still draw operatives as tokens, without the customized figure.

## Remaining work

- The directive arrived cut off in its section 13 (Command center); sections after it were not received.
- Command center: done in P6; the briefing, situation, Council and finances open from the room's stations.
- Next for the environment-first interface: a 3D camera using the same target ids; History as an archive room;
  medical and psychological stations; finished art per `docs/ART_DIRECTION.md`.
- Not done:
  - the History screen as an archive room;
  - the Geoscape;
  - a dedicated engineering room beyond the workshop;
  - medical and psychological interactions beyond their interiors.
- Art: everything is code-drawn and provisional; `docs/ART_DIRECTION.md` specifies the finished look. Characters are
  front-on only, and weapons side-on only, with no rotation.
- Tactical: the tactical renderer still draws operatives as its own tokens; the full figure's look is not carried
  into missions.

## Known limitations

- All art is drawn in code and provisional. `docs/ART_DIRECTION.md` specifies what finished art should be.
