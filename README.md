# Sunfall

Solano Bay glows beneath a permanent coastal sunset. As Dario Venn, leave your Palma Strand flat, steal a ride, meet a crew, and build a reputation across a vivid city of beachfront roads, harbour yards, markets, towers, and hillside streets. Explore on foot or by car, take repeatable jobs, and survive the Bay Patrol while working toward the final score.

- Eight districts: Palma Strand, Old Port, Downtown, Marina, Market Row, The Hills, Airport Flats, and North Beach.
- Eight sequential story missions with Marco Reyes, Lena Voss, and Tia Navarro, plus courier, street race, stash, and passenger jobs.
- Six stealable vehicle types, fixed-substep driving, ambient traffic, and pedestrians who flee and witness crimes.
- Fists, P9 Sidearm, Hornet SMG, Bulldog Scatter, and Longshot Rifle; weapon unlocks, ammunition, and a Market Row gun shop.
- Five wanted levels, patrol cars, officers, roadblocks, helicopter pursuit, and line-of-sight escapes.
- Three original synthesized radio stations, synthesized effects, minimap, city map, vehicle dashboard, and crew dialogue.
- Cash, reputation ranks, safehouse progression, local saves, and recovery after arrest or injury.

| Control | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| Mouse | Look / aim |
| Left mouse | Fire / punch |
| Shift | Sprint |
| Space | Jump / handbrake |
| E | Enter / exit vehicle, start nearby job, shop, recover |
| 1–5 | Equip weapon |
| R | Reload |
| N | Next radio station while driving |
| M | Toggle north-up city map (world continues) |
| Esc / P | Pause / resume |
| Shop 1–4 / 5–8 | Buy weapons / ammunition |

Run `node serve.ts --port 8080` with Node 22.18+ and open `http://127.0.0.1:8080`. Alternatively, serve the `game` directory with any static HTTP server. Click the start screen to enable mouse capture and audio. Use the pause menu to save manually. Jobs and purchases save automatically. Progress is stored locally under `sunfall-save-v1`; screenshot modes do not load or write your save.

There is no build step. The game uses classic JavaScript scripts, vendored Three.js r149, procedural geometry, canvas textures, and WebAudio synthesis. All runtime resources are local; the game makes no external network requests. Audio starts only after a user gesture. Desktop keyboard and mouse are required. A VM smoke test validates module loading and core state, but does not establish real browser rendering, audio quality, or GPU performance.

Run `node tests/smoke.cjs` for module, boot, screenshot-state, input, save, and mission-engine checks. Run `node --check game/src/FILE.js` for syntax checks. `main.ts` packages the game for the bounty environment; it is separate from the browser entry point `game/src/main.js`.

For deterministic capture staging, open `?shot=0` (on foot in Market Row), `?shot=1` (fast stolen-car drive Downtown), `?shot=2` (four-star pursuit with helicopter), or `?shot=3` (armed mission moment with Lena dialogue). These modes freeze a staged scene with its full HUD so the four views are reproducible. Ordinary play has no query parameter.

Sunfall's setting, characters, story, vehicles, brands, music patterns, geometry, and presentation are original. It contains no Rockstar or Grand Theft Auto assets, names, characters, maps, or audio. Three.js retains its upstream license in the vendored distribution.
