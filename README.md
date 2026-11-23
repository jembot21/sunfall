# sunfall

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jembot21/sunfall/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jembot21/sunfall/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunfall is a browser open-world crime game set at sunset in Solano Bay: Palma Strand, Port Solano, Old Market, The Flats, Marina District and Airstrip Heights. Walk or drive through the city, traffic and pedestrians; police and AIR ONE respond to a five-star wanted system. Lucia, Jason and Dre take on nine staged jobs, ending with the timed "LAST WAVE" bridge escape and Dre’s boat. Three.js is vendored, ES modules run without a build step, and the game works offline through the local server.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 afterwards.

WASD moves or drives, Shift sprints, Space jumps or holds the handbrake, and F enters/exits a car. Right-drag to orbit or aim and scroll to zoom. Click or Q punches/fires. Keys 1/2/3 equip owned weapons or preview locked ones: Fists are free, the 9mm Sidearm costs $500 and the Bay Carbine costs $1,200. Walk into a green gun-shop marker to buy the previewed weapon; ammunition is unlimited. Empty punches report nothing. Witnessed shots, theft, assaults and vehicle strikes raise wanted; shooting police is a serious crime. Break police sight for 16 seconds to start cooling; each star then takes another 16 seconds. Nearby officers fill BUST over 3.4 seconds, followed by a booking fee and return to the safehouse. AIR ONE responds at three stars.

Walk west from the starting car to the Palma Strand safehouse marker and press E for Dre’s first job. Complete each objective, collect the payout, and return for the next job. The rooftop lookout has a walking ramp, and the marina dock can be walked to the boat. LAST WAVE pins wanted at four stars: use the toll canopy to break AIR ONE’s lock, stay in the right spike-strip gap, ram the two cruisers at 60+ km/h or take the side gap, then leave the car and reach Dre’s boat before lockdown. It pays $6,000, completes the story and unlocks "Bridge Run" replays at the safehouse.

Purchases and mission completions save cash, owned weapons, completed jobs and story completion in localStorage. Continue restores those values and places the crew at the safehouse for the next job. The HUD includes weapon ownership and prices, crew readiness, PD callsigns/status/distance, all police minimap blips, actual driving speed, objectives, dialogue and the finale lock/timer.

`window.__sunfall.police` exposes `stars`, `bustProgress`, `seen`, and `units` (every active cruiser, officer and helicopter, with live position, kind, status and distance). Crime sources establish a witness or victim before calling the exported `reportCrime(kind, position)` in `game/src/police.js`.

Run `node --experimental-vm-modules checks/session5.mjs` for the story chain, purchase/Continue regression, attacks, rooftop and dock access, finale obstacles and frozen scene checks. `checks/session4.mjs` covers police pursuit, arrest, cover, wanted decay and AIR ONE. `checks/http-sweep.mjs` sweeps the actual HTTP handler in-process; `checks/dossier.mjs` checks the output plumbing and dossier. `node checks/session5-browser.mjs --headless` verifies real WebGL, reload/Continue and repeated screenshot pixels on a machine that supports Chromium and WebGL.

The city has a low orange sun, warm bay fog and long facade shadows. The toll spike strip, reflective cones, marked escape gaps, timber marina dock and Dre’s moored boat are permanent scenery; the finale activates the spike hazard and parks the two roadblock cruisers. The copper Sunfall GT has clearcoat, blue glass and visible trim beneath AIR ONE’s softer light pool.

`?shot=bridge&seed=1`, `?shot=face&seed=1`, `?shot=drive&seed=1` and `?shot=start&seed=1` stage four reproducible scenes. Their seed, time, positions and HUD state are fixed and simulation freezes safely. `shots.json` lists the four final JPEGs in `screenshots/`. With the server running, `SUNFALL_CHROME=/path/to/chrome-headless-shell node checks/capture.mjs` captures them at 1280×720 with a 7-second virtual-time budget; append one mode to recapture just that scene. `node checks/session6-browser.mjs` checks actual HTTP/WebGL rendering, HUD bounds, camera framing, permanent set pieces, parked finale cruisers and clean startup without taking screenshots. Both scripts also accept `SUNFALL_CHROME` for the browser executable.

`node main.ts` copies `game/` and `screenshots/` and writes the Sunfall dossier; `MAKEFUN_OUTPUT_DIR` can select a local output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8vr38xr3&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
