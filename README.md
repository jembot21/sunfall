# Sunfall
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jembot21/sunfall/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jembot21/sunfall/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Sunfall** is an original low-poly, sunset-drenched open-world action game set in the coastal metropolis of Solano Bay. You play as Dario Venn, arriving with $80 in his pocket and a borrowed orange Torino GT parked on Ocean Boulevard. Navigate the neon-lit avenues, take on high-stakes syndicate courier runs, avoid relentless police cruisers, and build your criminal empire across the palm-fringed coast.

---

## Play

To play Sunfall locally:

1. **Option A (Local Static File):**
   Open `game/index.html` directly in desktop Google Chrome or any modern WebGL-compatible browser.

2. **Option B (Local Web Server):**
   Run the included TypeScript local server:
   ```bash
   node serve.ts
   ```
   or with `ts-node` / `npx tsx serve.ts`, then navigate your browser to `http://localhost:8080`.

- **Start / Continue:**
  Click the title screen to capture pointer lock and begin playing. Your progress, cash, weapons, and completed missions are automatically saved to `localStorage` when visiting the Solano Safehouse or finishing story milestones. Returning players automatically resume with their saved cash and unlocks.

---

## Controls

| Action | Control |
| :--- | :--- |
| **Walk / Drive** | `W` `A` `S` `D` / Arrow Keys |
| **Sprint** | Hold `Left Shift` / `Right Shift` |
| **Look / Aim** | Mouse (Click anywhere to capture pointer lock) |
| **Melee Punch** | `Left Click` or `F` (when on foot with pistol holstered) |
| **Equip / Holster Pistol** | `Q` (Unlocked after Story Mission 1) |
| **Shoot Pistol** | `Left Click` (when pistol is equipped) |
| **Enter / Exit Vehicle** | `E` or `F` (Enter near any car; Exit only when traveling < 15 MPH) |
| **Handbrake / Drift** | `Space` (while driving) |
| **Buy Food / Save Game** | `R` (Press near Solano Diner to heal for $25, or near Safehouse to save) |
| **Pause Game** | `Escape` or `P` |

---

## Story and Free Roam

The live minimap tracks roads, objectives, services, and nearby police while the police heat system escalates pursuits as your wanted level rises.

### The Narrative
- **Intro: Solano Welcome** — Get behind the wheel of the borrowed Torino GT and meet Rico at the 3rd Avenue Garage. Unlocks the 9mm pistol and earns $150.
- **Mission 1: The Courier** — Pick up a sealed contraband briefcase at North Marina Docks and race against the 90-second countdown to the South Pier drop.
- **Mission 2: Heatwave** — Syndicate setup! Police ambush the exchange. Break line-of-sight around Solano skyscrapers to shake off a 2-star wanted level and lay low at the safehouse.
- **Mission 3: Marina Heist** — Infiltrate the Marina impound yard, commandeer the impounded sports coupe, and deliver it to an overseas buyer in the Financial District.
- **Mission 4: Downtown Reckoning** — Intercept the syndicate convoy at Downtown Plaza, take down the corrupt enforcer, and deliver the syndicate payroll to the Coastal Penthouse.
- **Mission 5: Sunset Kingpin** — Storm the syndicate headquarters tower, survive a citywide 4-star manhunt, and reach the Solano Bay Helipad to take control of the city.

### Free Roam & Repeatable Jobs
After completing the story (or between missions), explore Solano Bay at your own pace:
- **Solano Taxi Fares:** Pick up waiting passengers across the city and speed them to their destinations before time expires.
- **Midnight Contraband Runs:** High-payout package drops through heavy traffic and police patrols.
- **Solano Diner & Safehouse:** Visit the beachfront diner on Ocean Boulevard for a $25 healing Cuban sandwich, or save your progress at the hideout.
- **Wanted Heat System:** Punching citizens, stealing cars, firing weapons, or hitting pedestrians increases police heat up to 5 stars. High-speed police cruisers deploy roadblocks and box you in. If trapped while stopped, Dario is **BUSTED** and loses up to $150.

---

## Tech

- **Pure Three.js & Vanilla JS:** Built with Three.js r147 vendored locally in `game/vendor/three.min.js`.
- **Zero Build Step:** Runs directly in the browser with classic ES5/ES6 scripts loaded in strict order.
- **100% Offline:** No external CDN requests, fonts, images, or remote assets (`http://` / `https://` completely absent from game source).
- **Procedural Audio:** Assetless WebAudio synthesizer providing real-time engine hum, sirens, punch impacts, gunshots, and victory fanfare.
- **Deterministic Visuals:** Seeded Mulberry32 PRNG ensures deterministic automated screenshot generation (`?shot=<name>&seed=<n>`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=gta6-01&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
