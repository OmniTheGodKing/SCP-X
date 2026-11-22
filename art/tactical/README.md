# Tactical battlefield art

Files here replace the stand-ins drawn in code on the tactical map. Keys are paths under `art/` without the
extension (png, webp, jpg or svg). The first key that exists wins; anything missing falls back to code.
World units: one tile is 32 × 32. Draw at 2× or 3× for sharpness; files are scaled to the frames below.

## Figures (upright, three-quarter view)

Frame 32 × 48 world units (64 × 96 or 96 × 144 px). Feet at the bottom centre; the figure faces right in `side`.
`side` is mirrored for left-facing units.

| Keys tried, in order | Notes |
| --- | --- |
| `tactical/figure/<sprite>/<view>` | `<view>` is `side`, `front` or `back` |
| `tactical/figure/<sprite>` | one image for every view |
| `tactical/figure/<side>/<view>` | `<side>`: `mtf`, `raider`, `dclass`, `civilian`, `zombie` |

`<sprite>` for operators is `mtf-<helmet>-<vest>-<back>` built from their actual loadout, for example
`mtf-m1-webbing-none`, `mtf-modern-carrier-radio`, `mtf-mask-none-tanks` (sealed suits use `mask`).
Insurgents are `raider-<role>` (`raider-rifle`, `raider-sniper`, `raider-officer`, `raider-commander`, `raider-demo`).

## Ground and structure (drawn into the map layer)

| Key | Frame |
| --- | --- |
| `tactical/floor/<surface>` | 32 × 32 tile; surfaces: `concrete`, `labtile`, `steel`, `wood`, `asphalt`, `grass`, `dirt` |
| `tactical/floor/<surface>/<era>` | same, per era: `1950s` … `2020s` (tried first) |
| `tactical/wall/<material>` | 32 × 32 wall top; materials: `concrete`, `brick`, `timber`, `metal` |
| `tactical/prop/half` · `tactical/prop/full` | generic half and full cover, 32 × 32 |
| `tactical/prop/barricade` · `tactical/prop/sandbags` | squad-placed barrier (half) and sandbag wall (full), 32 × 32 |

Nothing here changes the rules: what blocks, covers or burns is decided by the map grid, never by the picture.
