# SCP-X art drop folder

Anything placed here is bundled automatically and replaces the procedural stand-in drawn in code for the same
key. No code changes are needed. Keys are the path under `art/` without the extension (`.png`, `.webp`, `.jpg`
or `.svg`). More specific keys are tried first, so you can ship one generic file and override per decade later.

## Rooms (back wall plates, drawn behind the 3D floor and the soldiers)

| Key | Frame |
| --- | --- |
| `room/barracks/<era>` then `room/barracks` | 1600 × 600, horizon at 75% height |
| `room/armory/<era>` then `room/armory` | 1600 × 700 |

`<era>` is one of `1950s`, `1960s`, `1970s`, `1980s`.

## Soldier layers (full-body figure, frame 200 × 320, feet at y 312, centred on x 100, facing the viewer)

Layers are drawn bottom to top. A file replaces only its own layer.

| Key | Notes |
| --- | --- |
| `soldier/body/<uniform id>` then `soldier/body` | legs, torso and uniform. Uniform ids: `base`, `padded_jacket`, `nylon_liner`, `plated_undersuit`, `powered_harness` |
| `soldier/armor/<item id>` | `armor`, `armor_light`, `armor_heavy`, `hazmat`, `leadsuit`, `contsuit`; tiered vests also try `soldier/armor/armor-t<tier>` first |
| `soldier/back/<item id>` | slung heavy weapons: `bazooka`, `law`, `flamer` |
| `soldier/belt/<item id>` | pouches and grenades on the webbing |

Faces stay procedural (they come from each operative's saved look) until a head-part set is supplied.

## Weapons (side profile, frame 400 × 120, muzzle to the right)

| Key | Notes |
| --- | --- |
| `weapon/<model id>` | e.g. `weapon/m1_garand`, `weapon/bar`, `weapon/m16` |
| `attachment/<attachment id>` | drawn at the weapon's hardpoint for it (see `src/ui/stage/weapon.ts`, `HARDPOINT_OF`) |

Hardpoints are given per weapon profile in `src/ui/stage/weapon.ts`; a supplied weapon image should keep the
receiver top, muzzle, magazine well, trigger and stock butt near the same points, or those numbers should be
updated alongside it.

## Department heads (waist-up portrait, frame 200 × 240, transparent background)

| Key | Person |
| --- | --- |
| `character/bell` | Dr. Catherine Bell, Director of Research (Research tab) |
| `character/russo` | Vincent Russo, Chief Engineer (Site-19 tab) |
| `character/carter` | Krista Carter, Chief of Operations (Command tab) |

## 3D

The barracks is already a real 3D scene (CSS 3D: a floor, walls and billboarded figures under a camera with yaw,
pitch, zoom and focus). Swapping the figures for rendered sprites or a WebGL layer means replacing
`src/ui/stage/scene.ts`'s entity markup; positions, camera and picking stay as they are.
