# Sunfall v2 — Solano Bay
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jembot21/sunfall/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jembot21/sunfall/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Explore Solano Bay, an original coastal city with six districts, eight story missions, six vehicle kinds, a five-level wanted system, four repeatable side activities, and local saved progress.

Take on jobs for the bay's crew, drive through the evening traffic, and shake the Bay Patrol when a crime draws attention. The game uses procedural city geometry, local assets, and synthesized audio.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| Mouse | Look and aim |
| Left mouse | Fight |
| Shift | Run |
| Space | Jump / handbrake |
| E | Enter or exit a car; accept a nearby job |
| 1–5 | Select a weapon |
| R | Reload |
| N | Change the car radio |
| M | Toggle the city map |
| Esc / P | Pause and resume |

## Mission loop and saves

Find the next crew marker, press E to accept the job, and follow the objective tracker through its stages. Story jobs pay cash and reputation and can unlock weapons and safehouses; side activities can be repeated. Progress and purchases save in the browser's local storage, with manual saving available at unlocked safehouses.

## Run locally

Use Node 22.18 or newer:

```sh
node serve.ts --port 8080
```

Open `http://127.0.0.1:8080`, then click the title screen to enter the city and enable audio. There is no build step. The game loads its scripts and vendored Three.js from `game/` and makes no external runtime requests.

Run `node tests/smoke.cjs` for module, input, save, mission, and staged-capture state checks. `node main.ts` packages `game/`, `screenshots/`, and `dossier.json` into `MAKEFUN_OUTPUT_DIR` (default `/output`).

The four reviewed JPEGs are staged with `?shot=0` through `?shot=3`; ordinary play has no screenshot query parameter. They are captured at 1280×720 from the rendered WebGL game.
