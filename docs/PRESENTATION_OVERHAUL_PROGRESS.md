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
| P4 | Armory: weapon inspection, mount points, visible attachments | [ ] |
| P5 | Lab, containment chambers, workshop, command | [ ] |

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

## Known limitations

- All art is drawn in code and provisional. `docs/ART_DIRECTION.md` specifies what finished art should be.
