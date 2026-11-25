# Replaceable art

Everything on the strategic screens is drawn in code as a **provisional placeholder**. A finished file placed here
replaces the placeholder at build time (`src/ui/assets.ts`); no code changes are needed, and the build inlines it.

| Folder | File name | Contract |
|---|---|---|
| `weapons/` | the weapon model id from `src/data/weapons.ts` (`m1_garand.webp`, `bar.png`, ...) | Side-on, butt on the left, muzzle on the right, transparent background. The image is fitted to the model's frame in `src/data/mounts.ts`: width = the frame's `length`, height 180 units with the bore line at the vertical centre. Mount points (optic, muzzle, lug, magazine, butt, trigger) are the frame's coordinates, so attachments still draw in the right places over the art. |
| `backdrops/` | `staging.webp` | The pre-mission staging area behind the deployment screen. 1600 × 900, the floor line at y = 760, nothing important in the bottom 140 units (soldiers stand there). |

Rules:

- No AI-generated images as production assets. Placeholders stay code-drawn until professional art exists.
- Era matters: art must fit 1951 unless the file is for a later era's variant (see `docs/ART_DIRECTION.md`).
- Keep files under 400 KB each; the game ships as one HTML file.
