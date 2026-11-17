# Sunfall
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jembot21/sunfall/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jembot21/sunfall/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Nothing stays golden.** Dario Venn has eighty dollars, a borrowed car, and one last delivery. A sealed package pulls him into the underworld of Solano Bay, an original coastal city of palms, neon, downtown towers, marina piers and warm sand.

## Play

Open `game/index.html` in desktop Chrome. Everything runs offline, including graphics and sound. Or run `node serve.ts` (Node 22+) and visit `http://localhost:8080`. No install or build step. Start begins a new story; Continue restores cash, completed story jobs and settings. In-progress jobs restart. Local storage must be available for persistent saves.

## Controls

| Input | Action |
| --- | --- |
| W A S D | Walk relative to camera / accelerate, brake, reverse, steer |
| Shift | Sprint on foot |
| Mouse | Third-person camera; click the world to capture mouse |
| E | Enter a nearby parked or stopped vehicle / exit at low speed |
| Space | Handbrake |
| Click | Punch, or fire the equipped pistol |
| F | Punch |
| Q | Equip / holster pistol after the first mission |
| R | Buy a $25 healing meal near the food stand, or save near the safehouse |
| Escape / P | Pause / resume; Escape also releases the mouse |

Gold markers and the minimap show your objective. Green is food, white is home, red blips are police. Police raise 0–5 stars, pursue and detain you when close and slow. Break sight to lose heat one star at a time. Busts and deaths cost up to $150 and respawn Dario at the station or hospital. A failed job can be retried.

## Story and free roam

1. **One Last Delivery** — drive a sealed package across town before the timer ends.
2. **Low Tide** — collect Inez at the marina and deliver her through police attention.
3. **Golden Circuit** — follow five downtown race checkpoints against the clock.
4. **Gilded Cage** — steal the gold Aureole from a guarded lot and deliver it.
5. **The Sun Goes Down** — escape four stars and return home.

Afterward, alternating repeatable timed courier and passenger jobs pay $250. Explore, steal stopped cars, spend mission rewards on meals, and save at home. The city remains open throughout the story.

## Technical notes

Plain JavaScript, ordinary dependency-ordered scripts, vendored Three.js r147 and procedural local assets. No requests to external services. Buildings, windows, palms, lamps, props and citizens use instancing; cars share a merged geometry. One shadow-casting sun and hemisphere ambient, fixed golden-hour atmosphere, animated ocean, capped pixel ratio (1.5), antialiasing, no post-processing. One `setAnimationLoop`, clamped delta, pooled tracers, reduced distant AI decision rates, reusable math objects and precompiled scene materials. HUD updates at 10 Hz; DOM strings and event-driven saves/audio automation are outside the geometry/physics hot path. Audio voices are allocated only on user activation.

Each source file owns its named system. `shots.js` supports `?shot=start`, `?shot=play`, and `?shot=end` for reproducible captures; `window.__shotReady` signals a rendered frame. These are presentation scenes, not save progress.

Package with `MAKEFUN_OUTPUT_DIR=out node main.ts`. The entry copies `game/` and `screenshots/`, then writes the canonical `dossier.json` using the unmodified vendor helper. Its source text contains `<title>Sunfall</title>`; the helper's canonical schema has no separate title property.

The existing LICENSE applies. The world, characters, vehicle designs, geometry, textures, UI and synthesized audio are original.

## Verification

Run `find game -name "*.js" -print0 | xargs -0 -n1 node --check`, `node tests/smoke.cjs`, and `MAKEFUN_OUTPUT_DIR=out node main.ts`. The smoke test uses real Three.js geometry and exercises city construction, car access, driving, the complete mission chain, side work, persistence and 600 integrated simulation frames. It does not validate WebGL rendering. Browser capture was unavailable in the build environment (socket binding denied and managed Chromium WebGL policy required), so the existing screenshots have not been refreshed and are not representative of Sunfall. Capture the three `shots.json` scenes in desktop Chrome before using the packaged screenshots for presentation.
