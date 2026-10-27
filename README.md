# Site-19

A turn-based SCP Foundation containment game in the spirit of XCOM. You run Site-19 between incidents and lead Mobile Task Force Epsilon-11 "Nine-Tailed Fox" into containment breaches, where the rules of each anomaly matter more than firepower.

The first anomaly is SCP-173: it cannot move while anyone with their eyes open can see it, and it kills anyone it reaches unseen. Operatives and D-Class hold it with "Do not blink", drag it while someone else watches, and seal it into a transport container, while Chaos Insurgency teams fight from cover.

## Running it

```sh
npm install
npm run dev        # local dev server
npm run build      # type-check, then build dist/index.html (one self-contained page)
```

`npm run build` also writes `dist/artifact.html`, the same page without its `<html>`/`<head>`/`<body>` wrapper, for hosts that add their own.

## Layout

| Path | What it holds |
|---|---|
| `src/core/grid.ts` | Tiles, movement, pathfinding |
| `src/core/sight.ts` | Line of sight: strict corners, partial visibility, leaning |
| `src/data/maps.ts` | Mission maps and spawn areas |
| `src/game/` | One tactical mission: state, combat, turn cycle, and each faction's AI (`scp173.ts`, `insurgency.ts`, `dclass.ts`) |
| `src/campaign/` | Site-19 between missions: roster, ranks, days, funding, exposure, incidents, saving |
| `src/ui/` | The command hub, the mission screen and the map renderer |

Campaign saves are kept in the browser's local storage.

## Credits and license

"SCP-173" was written by Moto42 ([scpwiki.com/scp-173](https://scpwiki.com/scp-173)). "SCP-049" was written by Gabriel Jade ([scpwiki.com/scp-049](https://scpwiki.com/scp-049)). SCP-173, SCP-049 and the other SCP Foundation concepts used here (the Foundation, Site-19, the O5 Council, Mobile Task Force Epsilon-11 "Nine-Tailed Fox", D-Class personnel, the Chaos Insurgency and object classes) come from the [SCP Wiki](https://scpwiki.com) and are licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

This project is shared under CC BY-SA 3.0 as well. Any SCP added later must credit its article's authors here and in-game. The SCP-173 figure is a placeholder drawing; the original sculpture photo is not covered by the wiki's license and must not be used.
