<div align="center">

# 🏁 CLUTCH & BUCKSHOT 💥
### *1-Hand PSX Combat Racer with 2D Pixel Cockpit*

[![Play Live on GitHub Pages](https://img.shields.io/badge/PLAY_ONLINE-GITHUB_PAGES-ffb020?style=for-the-badge&logo=githubpages&logoColor=141619)](https://thinkypadd.github.io/clutch-duck-and-buckshot/)
[![Three.js](https://img.shields.io/badge/3D_ENGINE-Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/BUNDLER-Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/LICENSE-MIT-2ea44f?style=for-the-badge)](LICENSE)

<br/>

```
      ╔═══════════════════════════════════════════════════════════════╗
      ║   [STEER / GAS / BRK]  ◄─── ONE MOUSE HAND ───►  [BOOST / GUN]  ║
      ║         DRIVE OR SHOOT? EVERY SECOND IS A GAMBLE.             ║
      ╚═══════════════════════════════════════════════════════════════╝
```

<img src="https://raw.githubusercontent.com/thinkypadd/clutch-duck-and-buckshot/main/public/banner.svg" alt="Clutch and Buckshot PSX Style Banner" width="100%"/>

</div>

---

## ⚡ Overview

**CLUTCH & BUCKSHOT** is a first-person 3D retro PSX combat racer built with **Three.js** and layered with a fully interactive **2D pixel-art interior**.

You have **only 1 hand** (the mouse) to juggle every control station inside the car:
- 🏎️ **Drive:** Hold gas pedal for momentum, brake for hairpins, rotate the rally wheel.
- 💨 **Nitro:** Drag passenger T-handle down to stack up to **3X boost** with heavy camera warp & rumble.
- 💥 **Sawed-off Shotgun:** Unholster from passenger visor, blast rivals off the road, eject spent hulls, and reload fresh shells under live fire!

---

## 🎮 Cockpit Stations & Controls

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ [ROOF] TRIP COMPUTER: POS / LAP / TIME                                │
  │                                                                        │
  │                     [WINDSHIELD 3D PSX CIRCUIT]                        │
  │                                           [PASSENGER VISOR]            │
  │                                           ┌───────────────┬──────────┐ │
  │                                           │ 12G SHOTGUN   │ SHELLS   │ │
  │                                           │ [CLICK/RACK]  │ [STRAP]  │ │
  │   [SPEEDO/RPM]                            └───────────────┴──────────┘ │
  │   ┌──────────┐                                                         │
  │   │ 142 MPH  │   (STEERING WHEEL)              [NITRO T-HANDLE]        │
  │   │ GEAR: 4  │     Grab & Rotate                 Drag Down 1X-3X       │
  │   └──────────┘                                    Regenerating PSI     │
  │   [FOOTWELL]                                                           │
  │   [BRK] [GAS]                                                          │
  └────────────────────────────────────────────────────────────────────────┘
```

| Station | Location | Action | Mechanics |
| :--- | :--- | :--- | :--- |
| **Gas Pedal** | Bottom Left | Hold Mouse | Builds speed. Releasing lets you coast on momentum (*Enviro-Bear* style) while moving your hand to other controls. |
| **Brake Pedal** | Bottom Left | Hold Mouse | Aggressive cornering brake; reverse gear when stopped. |
| **Steering Wheel** | Left Side | Grab & Rotate | Releases smoothly back toward center with road vibration & drift. |
| **Nitro T-Handle** | Passenger Side | Drag Down | Springs back per pull; stacks up to **3X** boost with violent cockpit shake. Regenerates pressure automatically. |
| **Visor Holster** | Top Right | Click | Unholster sawed-off shotgun to aim & fire. Left click road to shoot rivals. |
| **Visor Reload** | Top Right | Click Holster / Drag | Click holster to rack open. Drag 2 spent hulls out, drag 2 fresh shells from the visor strap, click to snap shut! |

---

## 🕹️ PSX Retro Graphics Pipeline

- 📐 **Clip-Space Vertex Jitter:** Vertex shader quantizes NDC coordinates to match Sony PlayStation fixed-point geometry wobble.
- 🎨 **Screen-Space Affine Texture Warping:** Mimics hardware UV interpolation without perspective divider.
- 💡 **Per-Vertex Gouraud Shading:** Faceted retro polygon lighting and distant depth fog.
- 📺 **Post-Processing Pass:** Rendered at native `320x180`, passed through a **4x4 Bayer ordered dither matrix**, and quantized to **15-bit RGB555** color depth.
- 🎛️ **Audio Synthesizer:** Realtime Web Audio API procedural engine roar, curb chatter, nitro hiss, and thunderous 12-gauge cannon blasts without external asset lag.

---

## 🚀 Local Development

```bash
# 1. Clone repository
git clone https://github.com/thinkypadd/clutch-duck-and-buckshot.git
cd clutch-duck-and-buckshot

# 2. Install dependencies
npm install

# 3. Run physics & reload cycle unit tests
npm test

# 4. Start local Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🏁 Live Deployment

The game deploys automatically via GitHub Actions to GitHub Pages on every push to `main`:

👉 **[https://thinkypadd.github.io/clutch-duck-and-buckshot/](https://thinkypadd.github.io/clutch-duck-and-buckshot/)**

---

<div align="center">
  <sub>Built with ⚙️ Three.js, Canvas2D, and procedural Web Audio.</sub>
</div>
