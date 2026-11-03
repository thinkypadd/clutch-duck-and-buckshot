# 2D cabin visual study

Run `npm run dev`, then open `/preview/cabin.html` on the development server.

The canvas reuses the current vehicle and weapon painters. The dashboard, wheel, mirror, and visor stay fixed to the front cabin and pass out of view during head turns. The door and side window enter the view. A/D peeks, Q/E locks a side view, and W/S or Escape recenters to reach the driving controls. The five view buttons and slider also work with keyboard or touch.

The trunk switch is on the passenger dashboard, the visor sits farther right, and the main dash edge is lower. Controls retain their native pixel proportions facing forward and naturally foreshorten during turns.

The nitro canisters fit closely beneath the recessed trunk switch. The pressure gauge replaces the separate boost blocks with distinct stage colors: blue at 1X, cyan at 2X, pink at 3X, and purple at 4X overdrive. Use Boost Demo to inspect the stages; select the Apex Turbo Hatch for its existing fourth-stage capability. The demo holds pressure at 65% while showing a boost stage so the hue change is easy to compare.

The exterior uses the game's Three.js Badlands circuit, PSX materials and post-processing, and vehicle meshes. It automatically drives at 28 m/s with neighboring cars. Head turns rotate the world camera; the windshield and door windows expose that same live scene. Pause Drive freezes travel while keeping head turns available. Reduced-motion preferences start the drive paused.

Mirrors still show sample artwork, and in-cabin controls are visual only at this review stage. Preview loadouts do not read or write the player's save. If WebGL is unavailable, the page explicitly reports that it is showing sample scenery.

The game now uses the same cabin renderer, with real control input and live mirrors. This standalone study keeps its visual-only controls and sample mirrors for layout comparison. It is not included in the game's production build.

`npm test` includes mapping, forward pixel proportions, and control visibility checks for all three- through eight-speed H-gates.
