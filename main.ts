// Sunfall: a static Three.js open-world crime game, with vendored libraries and no build step.
// This entry copies game/ and screenshots/ and writes the game's dossier using make.fun.
// Serve locally with node serve.ts; MAKEFUN_OUTPUT_DIR can select a local output directory.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, canonicalJson } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const description = `# Sunfall

Sunfall is a browser open-world crime game set at sunset in Solano Bay. Explore six districts:
Palma Strand, Port Solano, Old Market, The Flats, Marina District and Airstrip Heights.
Lucia drives, Jason rides shotgun and Dre arranges a nine-mission story of car deliveries,
a rooftop lookout, a van tail, port pickups and a timed airstrip run. The wanted system deploys
cruisers, officers and AIR ONE, with line-of-sight searches, star decay and a BUSTED return to the safehouse.
In mission nine, LAST WAVE, four wanted stars stay pinned during a timed bridge escape: the toll
gantry breaks the helicopter lock, a marked gap avoids spikes, two cruisers block the far shore,
and Dre's marina boat is the final destination. Finishing pays $6,000 and unlocks Bridge Run replays.

Features:
- A seeded sunset city, bay, 980-metre bridge, traffic, pedestrians and faced figures.
- Walking, sprinting, jumping, car entry, driving, handbraking and police pursuits.
- Fists, the $500 9mm Sidearm and the $1,200 Bay Carbine; gun shops, hitscan shots and unlimited ammunition.
- Nine staged missions with markers, objectives, payouts and crew phone dialogue.
- Wanted stars, cash, weapon slots, crew readiness, live PD response, a 180px minimap and actual vehicle speed.
- AIR ONE spotlight and lock meter, spike damage, a breakable roadblock and a lockdown timer.
- Local saves for cash, purchased weapons, mission progress and story completion, restored with Continue.
- Reproducible bridge, face, drive and start screenshot modes; plain ES modules with vendored Three.js.

`;
const dossier = JSON.parse(Buffer.from(buildDossier(out, {
    text_max_bytes: 163840 - Buffer.byteLength(description),
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  })).toString('utf8'));
dossier.text = description + dossier.text;
writeFileSync(join(out, 'dossier.json'), canonicalJson(dossier));
