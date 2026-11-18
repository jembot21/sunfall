# Sunfall
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jembot21/sunfall/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jembot21/sunfall/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunfall is an original browser crime-and-driving adventure set in Solano Bay. Dario Venn begins with $80, a borrowed car, and one delivery. Work jobs across a sunset city, avoid the police, and decide whether to keep the roads quiet or make your own opportunities.

## Play
Open `game/index.html` in desktop Chrome, or run `node serve.ts` and visit http://localhost:8080. Click the start screen to begin. Continue uses the local browser save when available; a new game starts Dario with $80.

## Controls
| Action | Control |
|---|---|
| Walk / drive | WASD |
| Sprint | Shift |
| Enter or exit vehicle | E |
| Handbrake | Space |
| Punch / fire pistol | Click or F |
| Equip / holster pistol | Q after mission 1 |
| Meal / save | R near the food stand or safehouse |
| Pause | Esc or P |
| Camera | Mouse; click the world to capture the mouse |

## Story and free roam
The live minimap tracks roads, objectives, and police, while the police heat system turns trouble into pursuit and rewards losing your tail.
The intro delivery leads into five story missions with changing objectives: meet contacts, make deliveries, escape a wanted level, race the coast road, and bring the final envelope home. After the story, taxi fares and package runs remain available. Police pursuit, wanted heat, pedestrians, traffic, healing meals, and safehouse saving make the city reactive between missions.

## Tech
Sunfall uses vendored Three.js, classic browser scripts, and no build step or network dependency. Saves use localStorage and audio is synthesized with WebAudio.

<sub>Entered on [make.fun](https://make.fun/?ref=gta6-01&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
