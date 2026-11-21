# SCP-X Strategic UI: Style Guide

The strategy screens are the Site Director's consoles in a classified installation, built in the 1950s and kept
running since. The benchmark for presentation is XCOM 2's approach: the environment is the centrepiece, and
information sits around it in tight, purposeful panels. The look is SCP-X's own: Foundation military-industrial
(steel, concrete, security markings, surveillance monitors, typed dossiers). It is not a web dashboard.

## Principles

1. **One centrepiece per screen.** The facility cross-section, the world map, the operative, the dossier. Panels
   frame it and never compete with it.
2. **Information density over decoration.** Compact rows of label and value beat cards of prose. Long explanations
   go behind "Details" or into tooltips.
3. **Colour means something.**
   - Cyan: selection and information.
   - Amber: caution.
   - Red: emergency and containment failure.
   - Green: operational and safe.
   - Manila: Foundation paperwork only.
4. **Rectangles, thin rules, strong alignment.** Corners are square or chamfered; no rounded pills, no glass, no
   gradients for decoration.
5. **Motion is feedback, never a gate.** Short transitions on selection and alerts, none of them delaying play.
   `prefers-reduced-motion` turns them off.

## Tokens (`src/ui/hub.css`)

| Token | Value | Use |
|---|---|---|
| `--s-bg` | `#0b0e11` | Page background (near-black charcoal) |
| `--s-surface` | `#12171c` | Panels (graphite) |
| `--s-surface-2` | `#182027` | Rows and inset areas |
| `--s-line` | `#26303a` | Rules and borders |
| `--s-line-2` | `#3a4652` | Emphasised borders, selection frame base |
| `--s-text` | `#d8d3c6` | Body text |
| `--s-dim` | `#88919a` | Secondary text and labels |
| `--s-info` | `#6ea9c8` | Selection, information, links |
| `--s-caution` | `#d3a14a` | Warnings |
| `--s-danger` | `#c9553f` | Emergencies |
| `--s-ok` | `#7fb48a` | Operational, safe |
| `--s-paper` | `#e2d4b1` | Dossiers and Council documents |
| `--s-chamfer` | `8px` | Corner cut on panels and buttons |

**Type:**
- IBM Plex Sans Condensed: body at 14px, panel titles at 13px semibold upper-case.
- IBM Plex Mono: values and labels; labels at 10.5px, tracking 0.08em.
- Special Elite: Foundation documents only (dossiers, reports, the Council).

Headings never exceed 28px.

## Components

| Component | Class | Notes |
|---|---|---|
| Panel | `.panel` with `.panel-h` (title left, meta right) | Square with a chamfered top-left corner; 1px border |
| Readout | `.ro` (`.k` label, `.v` value) in a `.readouts` strip | Header resources: one line, separated by rules, coloured only when it matters |
| Status light | `.lamp.ok`, `.lamp.caution`, `.lamp.danger` | A 7px square indicator, not an icon |
| Meter | `.meter > span` | Thin bar for capacity, standing, progress |
| Row list | `.rows > .r` | Label, value and action in one line |
| Briefing item | `.brief-item.critical`, `.important`, `.routine` | A severity bar on the left, title, one-line reason, a "Go" button |
| Button | `.act` (`.primary`, `.danger`) | Rectangular with a chamfer; primary is cyan-on-dark, not filled neon |
| Navigation | `.tabs .tab` | Full-width strip; the active tab gets a cyan rule underneath |
| System menu | `.sysmenu` (`<details>`) | Campaigns, export and import, sound, credits: out of the header's way |
| Dossier | `.file` | The manila document style, kept for SCP files, reports and Council documents |

## Screen layouts

- **Command:** the Director's Briefing as the main column (the decision queue); the Council and finances as compact
  panels beside it; the site log underneath.
- **World:** the map spans the screen; the incident list and the briefing for the selected incident sit beside it.
- **Site-19:** the illustrated cross-section takes about two-thirds of the width. The context panel shows the
  selected room, or with nothing selected an operational overview: power, engineers, containment risk per wing,
  work in progress.
- **Research:** the projects and the lab; anomaly work stays in the dossier style.
- **Personnel:** the selected operative is large; the roster is a compact list.
- **History:** the Foundation archive.

## Do and don't

- **Do:** one line where one line will do; numbers in mono; say what an action costs on the button itself.
- **Don't:**
  - repeat identical cards in a grid;
  - rely on large border radii, drop shadows, gradients or glows;
  - use emoji;
  - add decorative icons that don't carry information;
  - put walls of always-visible prose under every control.

## Art

Rooms, the surface, the seal and the world map are original SVG drawn in code (`src/ui/art.ts`, `src/ui/icons.ts`).
They are coherent but provisional. Final illustrated art (painted room interiors, portraits) is listed as remaining
work, and no third-party or proprietary artwork is used.
