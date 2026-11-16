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
| P2 | Interior renderer and enter/leave transitions | [ ] |
| P3 | Quarters: full-body operatives and live customization | [ ] |
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

## Known limitations

- All art is drawn in code and provisional. `docs/ART_DIRECTION.md` specifies what finished art should be.
