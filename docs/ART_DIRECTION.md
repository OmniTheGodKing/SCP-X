# SCP-X art direction: Site-19 in 1951

The look is a working Cold War installation drawn with a restrained, semi-realistic hand: flat shapes with a few
tones each, hard light from fittings, no outlines heavier than 1px at scene scale, and no gloss. Characters,
weapons and rooms share one palette and one light direction (key light from above, a little to the left).

## Setting rules

- 1951 first. Equipment is US service issue of the late 1940s: M1 Garand, M1903A4, M1897, BAR, M2 carbine, M3
  submachine gun, M1911. Later models appear only when the campaign reaches their year or research brings them.
- Optics are period telescopic sights (a long tube scope, offset mounts on the Garand). No red dots, rails or
  polymer furniture.
- Armour is period: M1951 flak vests, quilted jackets, rubber hazmat suits, lead-lined suits. Foundation ceramic
  plate and the powered harness are research projects and look like experimental 1950s hardware (riveted, painted).
- Uniforms: olive drab herringbone fatigues, field jackets, M1 helmets or the operative's unit headgear.
- Rooms: poured concrete, painted steel (institutional green below a dado line, cream above), riveted bulkheads,
  cage lamps, conduit, stencilled designations, hazard stripes only around containment and machinery.

## Palette

| Use | Colour |
|---|---|
| Concrete wall | `#2e3438` to `#3a4146` |
| Institutional green (dado) | `#3d4a40` |
| Cream paint (upper wall) | `#7d7866` in shadow, `#a39d86` lit |
| Steel | `#56636d`, dark `#3b454e` |
| Olive drab | `#58603f`, dark `#434a30` |
| Lamp light | `#ffe6b0` at 10% to 25% |
| Containment grades | Safe `#7fb08a`, Euclid `#d9a441`, Keter `#c0503f` |
| Paper and dossiers | `#e2d4b1` |

## Composition

- **Rooms** are drawn as a cut-away box: back wall, floor in shallow perspective, side walls with their doors. The
  room's door kinds (next room, lift, sealed bulkhead, rock) come from the facility layout and must match the
  overview.
- **Characters** stand on one baseline, scale 1.0 = 340 scene units tall, built from layers on one pivot: body
  (skin), uniform, armour, face, hair, facial hair, headgear, weapon at the right-hand socket.
- **Weapons** are drawn side-on at bench scale (about 1,000 units long), with mount points at fixed positions per
  model.

## Provisional and finished

Everything currently in the game is provisional code-drawn art. Finished art should keep these rules and replace
the drawing functions one by one: `src/ui/scene/*.ts` for rooms, the figure layers, and the weapon plates. Each
drawing function takes the same layout or equipment descriptor, so replacements need no rule changes.
