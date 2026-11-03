<div align="center">

# 🏁 CLUTCH & BUCKSHOT 💥
### *PSX Drive-By Combat Racer with 1-Hand 2D Pixel Cabin & Garage Hub*

[![Play Live on GitHub Pages](https://img.shields.io/badge/PLAY_ONLINE-GITHUB_PAGES-ffb020?style=for-the-badge&logo=githubpages&logoColor=141619)](https://thinkypadd.github.io/clutch-duck-and-buckshot/)
[![Three.js](https://img.shields.io/badge/3D_ENGINE-Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/BUNDLER-Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/LICENSE-MIT-2ea44f?style=for-the-badge)](LICENSE)

<br/>

```
      ╔══════════════════════════════════════════════════════════════════╗
      ║  [WHEEL] ◄── [1-6 H-SHIFTER] ──► [NITRO / VISOR GUNS]            ║
      ║  HOLD [A/Q] OR [D/E] TO LOOK OUT SIDE WINDOWS FOR DRIVE-BYS     ║
      ╚══════════════════════════════════════════════════════════════════╝
```

<img src="https://raw.githubusercontent.com/thinkypadd/clutch-duck-and-buckshot/main/public/banner.svg" alt="Clutch and Buckshot PSX Drive-By Combat Racer Banner" width="100%"/>

</div>

---

## ⚡ Overview

**CLUTCH & BUCKSHOT** pairs a low-res **3D PSX world** in Three.js with a panoramic **2D pixel-art Left-Hand-Drive cabin**.

Your car accelerates automatically up to the speed band of your active gear. You have **1 mouse hand** to steer the wheel, row through the center **1-6 + R H-pattern gearbox**, yank the short-throw **Nitro boost**, and draw/reload weapons from the passenger visor while glancing out your **Left (`A`/`Q`)** and **Right (`D`/`E`)** windows for door-to-door drive-bys.

Wrecked rival cars burn permanently on the track for the rest of the race. Win by crossing the line 1st after 3 laps or by wiping out every rival car on the circuit.

---

## 🎮 Cabin Layout & Controls

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ [⚙]      [POS / LAP / FOES ALIVE]         [PASSENGER SUN VISOR]         │
  │                                           ┌───────────────┬────────────┐ │
  │  ◄ [A/Q] LEFT              3D PSX         │ HOLSTERED GUN │ AMMO POUCH │ │
  │    DRIVER                  WINDSHIELD     │ RELOAD ACTION │ SHELLS/MAG │ │
  │    WINDOW                                 └───────────────┴────────────┘ │
  │                                                      RIGHT WINDOW [D/E] ►│
  │     ┌─────────────────┐     ┌─────────────┐                              │
  │     │ RPM | MPH | HP  │     │ CAR GIMMICK │   [SHORT-THROW]  [N2O RIG]   │
  │     └─────────────────┘     ├─────────────┤   [NITRO PULL]   ┌───┐ ┌───┐ │
  │       (STEERING WHEEL)      │ 1  3  5     │    1X..3X/4X     │N2O│ │N2O│ │
  │        Left Driver Side     │ ├──┼──┼──┐  │                  └───┘ └───┘ │
  │                             │ 2  4  6  R  │                              │
  └─────────────────────────────┴─────────────┴──────────────────────────────┘
```

| Control | Input | Behavior |
| :--- | :--- | :--- |
| **Steering Wheel** | Mouse Drag (Left) | Rotates wheel; self-centers with road chatter when your hand lets go. |
| **1-6 + R H-Shifter** | Mouse Drag (Center) | Auto-throttle climbs to current gear ceiling. Downshift (`5 -> 2`) to engine-brake into corners; `R` reverses. |
| **Nitro Pull-Handle** | Short Mouse Pull (Right) | Quick 36px pull stacks **3X** boost (**4X** in the Rally Hatch) with regenerating PSI. |
| **Side-Window Look** | Hold `A`/`Q` or `D`/`E` | Pans cabin to Driver or Passenger window (`±82°`) to shoot flanking rivals. |
| **Visor Arsenal** | Click & Drag (Top Right) | Unholster gun to fire. Dock empty gun on visor for tactile manual reloads. |

---

## 🏎️ Garage Hub: Vehicles, Guns & Visible Upgrades

Earn prize money from race placements, **Wreck Bounties**, and **Total Wipeout Bonuses** to spend across four tabs in the Main Menu Garage Hub:

### 1. Circuits
- **Canyon Circuit:** Technical dusk asphalt pass with elevation chicanes and guardrails (6 racers).
- **Badlands Flats (Open):** Wide-open desert checkpoint loop with salt flats, red-rock mesas, no guardrails, and 7-car pack ambushes.

### 2. Showroom Vehicles & Cabin Gimmicks
- **'86 Kuruma Coupe:** Balanced starter street wedge with shift-light cluster.
- **V8 Interceptor:** Heavy highway muscle with **2.2X ramming damage** and a center-console **Blower Overdrive** switch.
- **Apex Turbo Hatch:** High-grip rally hatch with **4X Nitro capacity** and a hydraulic **Drift Handbrake** lever.
- **Iron Mule Ute:** Armored wasteland pickup with **Dual Visor Holsters** to carry and hot-swap two loaded guns mid-race.

### 3. Mechanic Garage (Visibly Modded 3D & 2D Parts)
- **Intake & Engine:** Stock flat hood -> Twin-Carb Hood Scoop -> Towering Chrome 3-Butterfly Bugcatcher Blower protruding through the hood inside your windshield and on the 3D Showroom turntable.
- **Chassis & Glass Armor:** Factory pillars -> Welded A-pillar Rollcage & Steel Bullbar -> Riveted Ballistic Window Armor Slats.
- **Gearbox & Shifter:** Iron stick -> Short-Throw Alloy Rally Gate -> Machined Billet Titanium H-Gate & GT Aero Wing.
- **Nitrous System:** Single blue bottle -> Anodized Crimson Purge Bottle -> Twin Gold Braided N2O Race Rig.

### 4. Gun Shop & Tactile 1-Hand Reloads
- **Sawed-Off 12G:** Break open -> drag 2 spent hulls out -> drag 2 fresh shells in -> snap closed.
- **M1911 .45 Pistol:** Dock -> click mag release -> drag fresh mag into grip -> rack top slide (`10 rd` extended mag + compensator + laser upgrades).
- **.357 Magnum Revolver:** Swing cylinder -> click ejector rod -> drag cartridges in (or install the **6-Shot Circular Speedloader** for 1-drag full reloads!).
- **Viper 9mm SMG:** Hold Left-Click full-auto drive-by lead hose (`36 rd` gold extended stick mag + suppressor + reflex sight upgrades).

---

## 🚀 Local Development

```bash
git clone https://github.com/thinkypadd/clutch-duck-and-buckshot.git
cd clutch-duck-and-buckshot
npm install
npm test
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🏁 Live Deployment

GitHub Actions runs `npm test` and `npm run build` on every push to `main` and publishes to GitHub Pages:

👉 **[https://thinkypadd.github.io/clutch-duck-and-buckshot/](https://thinkypadd.github.io/clutch-duck-and-buckshot/)**
