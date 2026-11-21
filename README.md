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

## Testing

```sh
npm run build && npm test     # everything
npm run test:unit             # headless rule tests (Node, no browser)
npm run test:e2e              # browser suites against dist/index.html
node tests/run.cjs e2e lab    # one suite by name
```

The headless tests (`tests/unit/*.test.ts`) are bundled with the esbuild that comes with Vite and run in Node. The browser suites (`tests/*.e2e.cjs`) use Playwright, which isn't a project dependency: install it globally, or have it on `NODE_PATH`. Gameplay randomness is seeded (`src/core/rng.ts`), so scenarios are reproducible.

## The strategy layer: simulations and the inspector

`src/sim/campaignSim.ts` plays the campaign headless with seven scripted strategies (balanced, research, security,
economy, aggressive, minimal, poor) for 30, 90, 180 and 1,500 days. It checks the campaign invariants
(`src/campaign/invariants.ts`) every day; `npm run test:unit` runs it and prints a report. Runs are deterministic:
`newCampaign({ ..., seed })` fixes the campaign seed.

Press the backtick key on the hub for the debug panel. It opens with a read-only strategic inspector: money and its
forecast, standing, exposure by region, breach risk per anomaly with the reasons, what each Insurgency operation is
worth to it and why, and the invariant results. Looking does not mark the save as a debug save.

The strategic UI's design rules are in `docs/UI_STYLE_GUIDE.md`; the overhaul's record is
`docs/STRATEGIC_OVERHAUL_PROGRESS.md`.

## The tactical lab

A developer screen for building a tactical situation and watching every rule: sight and what each unit makes out, step-out peeks, lines of fire and what they cross, cover, hit chances, overwatch lanes, suppression, light, and how the enemy AI scores its moves. Open it from the debug panel (press the backtick key, then "Open the tactical lab") or go to `index.html#lab`. It runs on the game's own rules; see `docs/TACTICAL_OVERHAUL_PROGRESS.md`.

## Layout

| Path | What it holds |
|---|---|
| `src/core/grid.ts` | Tiles, doors, glass, pathfinding |
| `src/core/geom.ts` | The geometry kernel: obstacles, the one trace, step-out eye points, exposure, cover off the line of fire |
| `src/core/sight.ts` | Sight and line-of-fire helpers over the kernel |
| `src/core/rng.ts` | Seeded gameplay randomness (campaign and mission streams) |
| `src/game/perception.ts` | Light and perception: unseen, detected, identified |
| `src/game/combat.ts`, `actions.ts`, `movement.ts`, `status.ts` | Shots, reactions, suppression; action costs; movement; statuses |
| `src/game/ai.ts` | The enemy's utility AI and pod coordination |
| `src/game/sandbox.ts`, `src/ui/lab.ts` | Sandbox missions and the tactical lab |
| `src/data/maps.ts` | Mission maps and spawn areas |
| `src/game/` | The rest of a tactical mission: state, turn cycle, missions, and each anomaly's and faction's rules (`scp173.ts`, `insurgency.ts`, `dclass.ts`) |
| `src/campaign/` | Site-19 between missions: roster, ranks, days, funding, exposure, incidents, saving |
| `src/campaign/commands.ts` | Validated strategic commands: `dispatch()` checks a command and applies it, or changes nothing |
| `src/campaign/briefing.ts` | Log severity and the Director's Briefing, derived from the campaign each time |
| `src/campaign/forecast.ts`, `crews.ts` | Scheduled money and the projected balance; which engineers are on which job |
| `src/campaign/invariants.ts`, `src/sim/campaignSim.ts` | Campaign invariants; the headless strategy simulations |
| `src/ui/` | The command hub, the mission screen and the map renderer |

Campaign saves are kept in the browser's local storage.

## Credits and license

"SCP-173" was written by Moto42 ([scpwiki.com/scp-173](https://scpwiki.com/scp-173)). "SCP-049" was written by Gabriel Jade ([scpwiki.com/scp-049](https://scpwiki.com/scp-049)). "SCP-106" was written by DrGears ([scpwiki.com/scp-106](https://scpwiki.com/scp-106)). "SCP-610" is credited to its author on the SCP Wiki ([scpwiki.com/scp-610](https://scpwiki.com/scp-610); name to be confirmed). SCP-173, SCP-049, SCP-106, SCP-610 and the other SCP Foundation concepts used here (the Foundation, Site-19, the O5 Council, Mobile Task Force Epsilon-11 "Nine-Tailed Fox", D-Class personnel, the Chaos Insurgency and object classes) come from the [SCP Wiki](https://scpwiki.com) and are licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

This project is shared under CC BY-SA 3.0 as well. Any SCP added later must credit its article's authors here and in-game. The SCP-173 figure is a placeholder drawing; the original sculpture photo is not covered by the wiki's license and must not be used.
