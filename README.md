# Sunfall
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jembot21/sunfall/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jembot21/sunfall/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunfall is an original third-person crime drama set in Solano Bay, a coastal city lit by the last orange light of day. Dario Venn has $80, a borrowed car, and one delivery that pulls him into a changing city. Make choices on the road, lose the police when trouble finds you, and build a life beyond the first handoff.

## Play

Open `game/index.html` in desktop Chrome, or run `node serve.ts` from the project directory and visit http://localhost:8080. Select Start to begin a new run. Continue loads locally saved cash, story progress, and pistol access; saving is available near Dario's safehouse. Progress is stored in this browser.

## Controls

| Action | Control |
| --- | --- |
| Walk / drive | WASD |
| Sprint | Shift |
| Enter / exit nearby car | E (exit only at low speed) |
| Handbrake | Space |
| Punch / fire | Click or F |
| Equip / holster pistol | Q (unlocked after story mission 1) |
| Buy healing meal / save | R near the food stand / safehouse |
| Pause / resume | Esc or P |
| Look around | Mouse; click the world to capture the mouse |

## Story and free roam

Follow the gold marker through an intro delivery and five story missions. The minimap marks objectives, the food stand, the safehouse, and active police. After the story, taxi fares and package runs offer repeatable work. Police attention rises with violence and crashes; break line of sight to cool the wanted level. Being busted or losing all health costs up to $150 and sends Dario to the station or hospital.

## Tech

Three.js is vendored in the project. There is no build step and gameplay uses no network assets or services.

<sub>Entered on [make.fun](https://make.fun/?ref=gta6-01&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
