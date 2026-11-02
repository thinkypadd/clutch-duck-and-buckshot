import {
  MAX_WHEEL_RAD,
  countChambers,
  equipShotgun,
  fireShotgun,
  holsterShotgun,
  openBreechForReload,
  ejectSpentShell,
  loadFreshShell,
  canSnapClosed,
  snapShotgunClosed,
  updateNitroDrag,
  formatRaceTime,
  formatOrdinal,
} from './logic.js';
import {
  pxRect,
  pxOutlineRect,
  pxDitherRect,
  pxLine,
  pxFillCircle,
  pxRing,
  pxPoly,
  pxText,
} from './pixel.js';

export const COCKPIT_W = 480;
export const COCKPIT_H = 270;

// Base station coordinates in their respective parallax layers
const PEDAL_BRAKE = { x: 30, y: 217, w: 44, h: 38 }; // Layer 1
const PEDAL_GAS = { x: 82, y: 210, w: 42, h: 46 }; // Layer 1
const WHEEL_HUB = { x: 186, y: 196, rOuter: 48, rInner: 36 }; // Layer 2
const NITRO_TRACK = { x: 378, yTop: 162, yBot: 234, handleW: 56, handleH: 20 }; // Layer 2
const VISOR_BOX = { x: 268, y: 12, w: 188, h: 64 }; // Layer 2
const HOLSTER_ZONE = { x: 272, y: 18, w: 118, h: 62 }; // Layer 2
const BREECH_CHAMBERS = [
  { x: 313, y: 49, r: 9 },
  { x: 336, y: 49, r: 9 },
]; // Layer 2
const STRAP_SLOTS_X = [401, 412, 423, 434, 445]; // Layer 2
const STRAP_Y = 25;
const STRAP_SHELL_W = 8;
const STRAP_SHELL_H = 34;

export function createCockpitController(canvas, sound, callbacks) {
  canvas.width = COCKPIT_W;
  canvas.height = COCKPIT_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const pointer = {
    x: COCKPIT_W * 0.39,
    y: COCKPIT_H * 0.72,
    down: false,
    inside: true,
    panX: -0.2,
    panY: 0.2,
  };

  // Active one-hand interaction ('wheel' | 'gas' | 'brake' | 'nitro' | 'spent_shell' | 'fresh_shell' | null)
  let activeHold = null;
  let wheelGrabPrevAngle = 0;
  let spentDragChamber = -1;
  let spentDragOrigin = { x: 0, y: 0 };
  let freshDragStrapIdx = -1;

  const fallingShells = [];
  const smokePuffs = [];
  let statusBanner = { text: 'HOLD GAS TO LAUNCH', timer: 3.5, color: '#ffb020' };
  let animTime = 0;

  function setStatus(text, color = '#ffb020', duration = 2.0) {
    statusBanner = { text, timer: duration, color };
  }

  function clientToPixel(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * COCKPIT_W;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * COCKPIT_H;
    return {
      x: Math.max(0, Math.min(COCKPIT_W, x)),
      y: Math.max(0, Math.min(COCKPIT_H, y)),
    };
  }

  function getLayerOffsets(shakeX = 0, shakeY = 0) {
    return {
      l0: { x: -pointer.panX * 5 + shakeX * 0.6, y: -pointer.panY * 3 + shakeY * 0.6 },
      l1: { x: -pointer.panX * 10 + shakeX, y: -pointer.panY * 5 + shakeY },
      l2: { x: -pointer.panX * 15 + shakeX * 1.25, y: -pointer.panY * 7 + shakeY * 1.25 },
    };
  }

  function inRect(px, py, r, pad = 0) {
    return (
      px >= r.x - pad &&
      px <= r.x + r.w + pad &&
      py >= r.y - pad &&
      py <= r.y + r.h + pad
    );
  }

  function spawnFallingShell(x, y, spent = true) {
    fallingShells.push({
      x,
      y,
      vx: -25 + (Math.random() - 0.5) * 45,
      vy: -35 - Math.random() * 25,
      rot: 0,
      vrot: (Math.random() > 0.5 ? 1 : -1) * 10,
      spent,
      life: 1.2,
    });
  }

  function spawnGunSmoke(x, y) {
    for (let i = 0; i < 6; i++) {
      smokePuffs.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 22,
        vy: -18 - Math.random() * 20,
        r: 4 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.25,
      });
    }
  }

  function releaseAllHolds(car, nitro) {
    activeHold = null;
    car.wheelHeld = false;
    car.gasHeld = false;
    car.brakeHeld = false;
    nitro.dragging = false;
    spentDragChamber = -1;
    freshDragStrapIdx = -1;
  }

  function handlePointerDown(e) {
    if (!callbacks.isInteractive()) return;
    if (e.button !== undefined && e.button !== 0) return;

    sound.init();
    const pt = clientToPixel(e.clientX, e.clientY);
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.down = true;

    const { car, nitro, shotgun } = callbacks.getState();
    const layers = getLayerOffsets(0, 0);

    // Coordinates in Layer 1 and Layer 2 local spaces
    const p1x = pt.x - layers.l1.x;
    const p1y = pt.y - layers.l1.y;
    const p2x = pt.x - layers.l2.x;
    const p2y = pt.y - layers.l2.y;

    // 1. If shotgun is EQUIPPED, hand is occupied by the gun!
    if (shotgun.mode === 'EQUIPPED') {
      // Check if clicking Visor Holster Rack to put gun back
      if (inRect(p2x, p2y, HOLSTER_ZONE, 6)) {
        const wasEmpty = countChambers(shotgun, 'live') === 0;
        holsterShotgun(shotgun);
        sound.playBreechSnap(wasEmpty);
        setStatus(
          wasEmpty ? 'DRAG 2 SPENT HULLS OUT' : 'SHOTGUN HOLSTERED',
          wasEmpty ? '#ffb020' : '#cbc1ab',
          2.2
        );
        return;
      }

      // If gun is empty and player clicks directly on the held gun's breech receiver near bottom-right, also dock & open!
      const gunBaseX = COCKPIT_W * 0.64 + (pointer.x - COCKPIT_W * 0.5) * 0.35;
      const gunBaseY = COCKPIT_H - 36 + (pointer.y - COCKPIT_H * 0.5) * 0.18;
      if (
        countChambers(shotgun, 'live') === 0 &&
        Math.hypot(pt.x - gunBaseX, pt.y - gunBaseY) < 42
      ) {
        openBreechForReload(shotgun);
        sound.playBreechSnap(true);
        setStatus('DRAG 2 SPENT HULLS OUT', '#ffb020', 2.4);
        return;
      }

      // If player tries clicking wheel/pedals/nitro while holding gun, remind them their 1 hand holds the gun
      const touchingControls =
        inRect(p1x, p1y, PEDAL_GAS, 3) ||
        inRect(p1x, p1y, PEDAL_BRAKE, 3) ||
        Math.hypot(p2x - WHEEL_HUB.x, p2y - WHEEL_HUB.y) <= WHEEL_HUB.rOuter + 4;
      if (touchingControls && pt.y > 162) {
        sound.playDryFire();
        shotgun.holsterAlert = 1.0;
        setStatus('HAND FULL! RACK GUN ON VISOR', '#ff5242', 1.8);
        return;
      }

      // Otherwise fire at windshield aim point!
      const res = fireShotgun(shotgun);
      if (res.fired) {
        sound.playShotgunBlast();
        spawnGunSmoke(pt.x, pt.y + 18);
        const ndcX = (pt.x / COCKPIT_W) * 2 - 1;
        const ndcY = -((pt.y / COCKPIT_H) * 2 - 1);
        callbacks.onShotgunFired(ndcX, ndcY, res.remainingLive);
      } else {
        sound.playDryFire();
        setStatus('EMPTY! CLICK VISOR HOLSTER', '#ff5242', 2.0);
      }
      return;
    }

    // 2. Hand is FREE! Check Visor Shotgun & Shell Strap interactions (Layer 2)
    if (shotgun.mode === 'HOLSTERED_READY') {
      // Optional small [OPEN] tab if 1 shell is spent
      if (
        countChambers(shotgun, 'live') < 2 &&
        p2x >= 344 &&
        p2x <= 388 &&
        p2y >= 14 &&
        p2y <= 28
      ) {
        openBreechForReload(shotgun);
        sound.playBreechSnap(true);
        setStatus('BREECH OPEN: RELOAD SHELLS', '#ffb020', 2.0);
        return;
      }
      if (inRect(p2x, p2y, HOLSTER_ZONE, 4)) {
        equipShotgun(shotgun);
        sound.playBreechSnap(false);
        setStatus('AIM & LEFT-CLICK TO FIRE', '#ffb020', 1.8);
        return;
      }
    } else if (shotgun.mode === 'HOLSTERED_OPEN') {
      // Check grabbing spent shells in either chamber first
      for (let c = 0; c < 2; c++) {
        if (shotgun.chambers[c] === 'spent') {
          const ch = BREECH_CHAMBERS[c];
          if (Math.hypot(p2x - ch.x, p2y - ch.y) <= ch.r + 6) {
            activeHold = 'spent_shell';
            spentDragChamber = c;
            spentDragOrigin = { x: p2x, y: p2y };
            return;
          }
        }
      }

      // Check grabbing a fresh shell from the visor shell strap
      for (let s = 0; s < STRAP_SLOTS_X.length; s++) {
        if (!shotgun.strapShells[s]) continue;
        const sx = STRAP_SLOTS_X[s];
        if (
          p2x >= sx - 3 &&
          p2x <= sx + STRAP_SHELL_W + 3 &&
          p2y >= STRAP_Y - 4 &&
          p2y <= STRAP_Y + STRAP_SHELL_H + 4
        ) {
          if (countChambers(shotgun, 'spent') > 0 && countChambers(shotgun, 'empty') === 0) {
            sound.playDryFire();
            setStatus('DRAG SPENT HULLS OUT FIRST!', '#ff5242', 1.8);
            return;
          }
          activeHold = 'fresh_shell';
          freshDragStrapIdx = s;
          return;
        }
      }

      // Check clicking open shotgun to snap breech closed
      if (inRect(p2x, p2y, { x: 270, y: 20, w: 122, h: 72 }, 2)) {
        if (canSnapClosed(shotgun)) {
          snapShotgunClosed(shotgun);
          sound.playBreechSnap(false);
          setStatus('LOCKED & LOADED!', '#6be36b', 1.6);
        } else if (countChambers(shotgun, 'spent') > 0) {
          sound.playDryFire();
          setStatus('DRAG SPENT HULLS OUT!', '#ffb020', 1.6);
        } else {
          sound.playDryFire();
          setStatus('DRAG SHELLS FROM STRAP!', '#ffb020', 1.6);
        }
        return;
      }
    }

    // 3. Check Passenger Nitro T-Handle (Layer 2)
    const handleY =
      NITRO_TRACK.yTop + nitro.handlePos * (NITRO_TRACK.yBot - NITRO_TRACK.yTop);
    const handleRect = {
      x: NITRO_TRACK.x - NITRO_TRACK.handleW / 2,
      y: handleY - NITRO_TRACK.handleH / 2,
      w: NITRO_TRACK.handleW,
      h: NITRO_TRACK.handleH,
    };
    if (inRect(p2x, p2y, handleRect, 6)) {
      activeHold = 'nitro';
      nitro.dragging = true;
      nitro.latchedThisDrag = false;
      return;
    }

    // 4. Check Steering Wheel (Layer 2)
    const wheelDist = Math.hypot(p2x - WHEEL_HUB.x, p2y - WHEEL_HUB.y);
    if (wheelDist <= WHEEL_HUB.rOuter + 6) {
      activeHold = 'wheel';
      car.wheelHeld = true;
      wheelGrabPrevAngle = Math.atan2(p2y - WHEEL_HUB.y, p2x - WHEEL_HUB.x);
      return;
    }

    // 5. Check Gas & Brake Pedals in Footwell (Layer 1)
    if (inRect(p1x, p1y, PEDAL_GAS, 5)) {
      activeHold = 'gas';
      car.gasHeld = true;
      return;
    }
    if (inRect(p1x, p1y, PEDAL_BRAKE, 5)) {
      activeHold = 'brake';
      car.brakeHeld = true;
      return;
    }
  }

  function handlePointerMove(e) {
    const pt = clientToPixel(e.clientX, e.clientY);
    const prevX = pointer.x;
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.inside = true;

    if (!callbacks.isInteractive() || !pointer.down || !activeHold) return;

    const { car, nitro, shotgun } = callbacks.getState();
    const layers = getLayerOffsets(0, 0);
    const p2x = pt.x - layers.l2.x;
    const p2y = pt.y - layers.l2.y;

    if (activeHold === 'wheel') {
      const dx = p2x - WHEEL_HUB.x;
      const dy = p2y - WHEEL_HUB.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const curAng = Math.atan2(dy, dx);
        let dAng = curAng - wheelGrabPrevAngle;
        while (dAng > Math.PI) dAng -= Math.PI * 2;
        while (dAng < -Math.PI) dAng += Math.PI * 2;
        car.wheelAngle = Math.max(
          -MAX_WHEEL_RAD,
          Math.min(MAX_WHEEL_RAD, car.wheelAngle + dAng)
        );
        wheelGrabPrevAngle = curAng;
      } else {
        // Near hub center, horizontal drag fallback prevents 180-degree atan2 flip
        car.wheelAngle = Math.max(
          -MAX_WHEEL_RAD,
          Math.min(MAX_WHEEL_RAD, car.wheelAngle + (pt.x - prevX) / 36)
        );
        wheelGrabPrevAngle = Math.atan2(dy, dx);
      }
    } else if (activeHold === 'nitro') {
      const norm =
        (p2y - NITRO_TRACK.yTop) / (NITRO_TRACK.yBot - NITRO_TRACK.yTop);
      const res = updateNitroDrag(nitro, norm);
      if (res.triggered) {
        sound.playNitroTrigger(res.stacks);
        setStatus(`NITRO ${res.stacks}X BOOST!`, '#ff7b1c', 1.8);
        activeHold = null;
      } else if (res.lowPsi) {
        sound.playLowPsi();
        setStatus('LOW NITRO PSI!', '#ff5242', 1.4);
        activeHold = null;
      }
    } else if (activeHold === 'spent_shell' && spentDragChamber !== -1) {
      const dragDist = Math.hypot(p2x - spentDragOrigin.x, p2y - spentDragOrigin.y);
      if (dragDist >= 26) {
        if (ejectSpentShell(shotgun, spentDragChamber)) {
          sound.playShellEject();
          spawnFallingShell(pt.x, pt.y, true);
          const remSpent = countChambers(shotgun, 'spent');
          setStatus(
            remSpent > 0 ? 'PULL 2ND HULL OUT' : 'DRAG SHELLS FROM STRAP',
            '#ffb020',
            1.8
          );
        }
        activeHold = null;
        spentDragChamber = -1;
      }
    } else if (activeHold === 'fresh_shell' && freshDragStrapIdx !== -1) {
      // Auto-snaps into open shotgun breech as soon as dragged over chambers
      const breechCenterX = (BREECH_CHAMBERS[0].x + BREECH_CHAMBERS[1].x) * 0.5;
      const breechCenterY = BREECH_CHAMBERS[0].y;
      if (Math.hypot(p2x - breechCenterX, p2y - breechCenterY) <= 30) {
        const res = loadFreshShell(shotgun, freshDragStrapIdx);
        if (res.loaded) {
          sound.playShellLoad();
          const liveNow = countChambers(shotgun, 'live');
          const spentNow = countChambers(shotgun, 'spent');
          if (liveNow === 2) {
            setStatus('CLICK SHOTGUN TO SNAP!', '#6be36b', 2.2);
          } else if (spentNow === 0) {
            setStatus('LOAD 2ND SHELL OR SNAP', '#ffb020', 2.0);
          }
          activeHold = null;
          freshDragStrapIdx = -1;
        }
      }
    }
  }

  function handlePointerUp() {
    pointer.down = false;
    const { car, nitro } = callbacks.getState();
    releaseAllHolds(car, nitro);
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    handlePointerDown(e);
  });
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);

  function update(dt) {
    animTime += dt;
    const targetPanX = (pointer.x / COCKPIT_W) * 2 - 1;
    const targetPanY = (pointer.y / COCKPIT_H) * 2 - 1;
    pointer.panX += (targetPanX - pointer.panX) * Math.min(1, dt * 10);
    pointer.panY += (targetPanY - pointer.panY) * Math.min(1, dt * 10);

    if (statusBanner.timer > 0) {
      statusBanner.timer = Math.max(0, statusBanner.timer - dt);
    }

    for (let i = fallingShells.length - 1; i >= 0; i--) {
      const sh = fallingShells[i];
      sh.life -= dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.vy += 260 * dt;
      sh.rot += sh.vrot * dt;
      if (sh.life <= 0 || sh.y > COCKPIT_H + 20) {
        fallingShells.splice(i, 1);
      }
    }

    for (let i = smokePuffs.length - 1; i >= 0; i--) {
      const sm = smokePuffs[i];
      sm.life -= dt;
      sm.x += sm.vx * dt;
      sm.y += sm.vy * dt;
      sm.r += 9 * dt;
      if (sm.life <= 0) smokePuffs.splice(i, 1);
    }
  }

  function drawShellSprite(x, y, w, h, state, highlight = false) {
    // Vertical 12-gauge shell: brass base on top, plastic hull below
    if (highlight) {
      pxRect(ctx, x - 1, y - 1, w + 2, h + 2, '#ffeb75');
    }
    const brassH = Math.max(4, Math.round(h * 0.28));
    pxRect(ctx, x, y, w, brassH, state === 'spent' ? '#8c7238' : '#e0b341');
    pxRect(ctx, x + 1, y + 1, Math.max(1, w - 3), brassH - 2, state === 'spent' ? '#a68946' : '#ffe082');
    const hullColor = state === 'spent' ? '#6e2826' : '#d62e24';
    const hullShade = state === 'spent' ? '#4a1918' : '#9c1c15';
    pxRect(ctx, x, y + brassH, w, h - brassH, hullColor);
    pxRect(ctx, x + w - 2, y + brassH, 2, h - brassH, hullShade);
  }

  function drawSteeringWheel(cx, cy, angle, hovered, held, occupiedByGun) {
    const rimOuter = WHEEL_HUB.rOuter;
    const rimInner = WHEEL_HUB.rInner;

    // Subtle wheel shadow on dash
    pxRing(ctx, cx + 2, cy + 4, rimOuter, rimInner, 'rgba(0,0,0,0.45)');

    // 3 metallic rally spokes (left, right, bottom) rotated by wheelAngle
    const spokeAngles = [angle + Math.PI, angle, angle + Math.PI * 0.5];
    for (const sa of spokeAngles) {
      const sx = cx + Math.cos(sa) * (rimInner + 2);
      const sy = cy + Math.sin(sa) * (rimInner + 2);
      pxLine(ctx, cx, cy, sx, sy, '#4c525e', 7);
      pxLine(ctx, cx, cy, sx, sy, '#7c8494', 3);
      // Perforated rally spoke hole
      const hx = cx + Math.cos(sa) * 21;
      const hy = cy + Math.sin(sa) * 21;
      pxFillCircle(ctx, hx, hy, 2, '#17191d');
    }

    // Leather steering rim
    const rimHighlight =
      held ? '#ffb020' : hovered && !occupiedByGun ? '#d9a441' : '#2e323b';
    pxRing(ctx, cx, cy, rimOuter + 1, rimOuter, rimHighlight);
    pxRing(ctx, cx, cy, rimOuter, rimInner, '#22252c');
    pxRing(ctx, cx, cy, rimOuter - 2, rimInner + 3, '#333842');

    // Red top-center rally tape marker so wheel angle is readable in 50ms
    const topAng = angle - Math.PI * 0.5;
    const tx = cx + Math.cos(topAng) * ((rimOuter + rimInner) * 0.5);
    const ty = cy + Math.sin(topAng) * ((rimOuter + rimInner) * 0.5);
    pxFillCircle(ctx, tx, ty, 5, '#e03e2d');
    pxFillCircle(ctx, tx, ty, 2, '#ff8a7a');

    // Center horn boss
    pxFillCircle(ctx, cx, cy, 12, '#191b20');
    pxFillCircle(ctx, cx, cy, 9, '#2c303a');
    pxFillCircle(ctx, cx, cy, 4, '#d99b26');
  }

  function drawVisorAndShotgun(ox, oy, shotgun, p2x, p2y, pulse) {
    const vx = VISOR_BOX.x + ox;
    const vy = VISOR_BOX.y + oy;

    // Sun visor flap + metal mounting brackets
    pxRect(ctx, vx + 22, vy - 10, 10, 12, '#3a3f47');
    pxRect(ctx, vx + 150, vy - 10, 10, 12, '#3a3f47');
    pxOutlineRect(ctx, vx, vy, VISOR_BOX.w, VISOR_BOX.h, '#3b352c', '#181614');
    pxDitherRect(ctx, vx + 3, vy + 3, VISOR_BOX.w - 6, VISOR_BOX.h - 6, '#474034', '#3d362c', 2);

    // Visor shell strap on right side (5 vertical shell loops)
    const strapBaseX = ox + 397;
    const strapBaseY = oy + 19;
    pxOutlineRect(ctx, strapBaseX, strapBaseY, 56, 48, '#29211b', '#14100d');
    pxText(ctx, '12G', strapBaseX + 28, strapBaseY + 2, '#cbc1ab', 1, 'center');

    const needFresh =
      shotgun.mode === 'HOLSTERED_OPEN' && countChambers(shotgun, 'empty') > 0;

    for (let i = 0; i < STRAP_SLOTS_X.length; i++) {
      const sx = ox + STRAP_SLOTS_X[i];
      const sy = oy + STRAP_Y;
      const available = shotgun.strapShells[i] && !(activeHold === 'fresh_shell' && freshDragStrapIdx === i);

      if (available) {
        const slotHover =
          shotgun.mode === 'HOLSTERED_OPEN' &&
          p2x >= STRAP_SLOTS_X[i] - 2 &&
          p2x <= STRAP_SLOTS_X[i] + STRAP_SHELL_W + 2 &&
          p2y >= STRAP_Y - 2 &&
          p2y <= STRAP_Y + STRAP_SHELL_H + 2;
        drawShellSprite(sx, sy, STRAP_SHELL_W, STRAP_SHELL_H, 'live', (needFresh && pulse) || slotHover);
      } else {
        pxOutlineRect(ctx, sx, sy + 4, STRAP_SHELL_W, STRAP_SHELL_H - 8, '#1b1612', '#382e25');
      }
      // Leather loop band across middle of shell
      pxRect(ctx, sx - 1, sy + 15, STRAP_SHELL_W + 2, 7, '#5c432d');
      pxRect(ctx, sx - 1, sy + 16, STRAP_SHELL_W + 2, 1, '#7d5c3f');
    }

    // Holster spring-clips on left half of visor
    const hx = ox + HOLSTER_ZONE.x;
    const hy = oy + HOLSTER_ZONE.y;
    pxRect(ctx, hx + 16, hy + 6, 7, 36, '#23262c');
    pxRect(ctx, hx + 68, hy + 6, 7, 36, '#23262c');

    if (shotgun.mode === 'HOLSTERED_READY') {
      const hoverHolster = inRect(p2x, p2y, HOLSTER_ZONE, 3);
      if (hoverHolster) {
        pxOutlineRect(ctx, hx + 2, hy + 4, 114, 50, null, '#ffb020');
      }

      // Twin blued-steel sawed-off barrels
      pxRect(ctx, hx + 6, hy + 16, 68, 12, '#1c2026');
      pxRect(ctx, hx + 6, hy + 17, 68, 3, '#586273');
      pxRect(ctx, hx + 6, hy + 23, 68, 3, '#3b424f');
      // Walnut forend
      pxRect(ctx, hx + 36, hy + 26, 32, 8, '#6e4226');
      pxRect(ctx, hx + 38, hy + 27, 28, 3, '#8f5834');
      // Receiver + walnut sawed-off pistol grip
      pxRect(ctx, hx + 74, hy + 17, 16, 15, '#454c59');
      pxPoly(
        ctx,
        [
          [hx + 86, hy + 20],
          [hx + 112, hy + 34],
          [hx + 106, hy + 49],
          [hx + 82, hy + 32],
        ],
        '#6e4226'
      );
      pxPoly(
        ctx,
        [
          [hx + 88, hy + 22],
          [hx + 108, hy + 34],
          [hx + 104, hy + 42],
          [hx + 86, hy + 29],
        ],
        '#8c5532'
      );

      // Chamber readiness dots + prompt
      for (let c = 0; c < 2; c++) {
        const dotCol = shotgun.chambers[c] === 'live' ? '#e03e2d' : '#555b66';
        pxRect(ctx, hx + 76 + c * 6, hy + 11, 4, 4, dotCol);
      }
      pxText(
        ctx,
        hoverHolster ? 'CLICK: GRAB GUN' : 'SAWED-OFF',
        hx + 56,
        hy + 47,
        hoverHolster ? '#ffb020' : '#cbc1ab',
        1,
        'center'
      );

      // If 1 shell is spent, show small clickable [OPEN] latch above receiver
      if (countChambers(shotgun, 'live') < 2) {
        pxOutlineRect(ctx, ox + 346, oy + 15, 40, 11, '#262a33', '#ffb020');
        pxText(ctx, 'RELOAD', ox + 366, oy + 18, '#ffb020', 1, 'center');
      }
    } else if (shotgun.mode === 'EQUIPPED') {
      // Empty holster dock target! Pulses brightly when shotgun is out of shells
      const emptyGun = countChambers(shotgun, 'live') === 0;
      const hoverDock = inRect(p2x, p2y, HOLSTER_ZONE, 6);
      const borderCol =
        emptyGun && pulse
          ? '#ff5242'
          : hoverDock || emptyGun
          ? '#ffb020'
          : '#7d8594';
      pxOutlineRect(ctx, hx + 2, hy + 6, 114, 48, 'rgba(15,17,20,0.55)', borderCol);
      pxText(
        ctx,
        emptyGun ? 'EMPTY! CLICK HERE' : 'CLICK TO HOLSTER',
        hx + 59,
        hy + 22,
        emptyGun ? '#ffeb75' : '#f4efe6',
        1,
        'center'
      );
      pxText(
        ctx,
        emptyGun ? 'TO OPEN & RELOAD' : 'FREE YOUR HAND',
        hx + 59,
        hy + 34,
        borderCol,
        1,
        'center'
      );
    } else if (shotgun.mode === 'HOLSTERED_OPEN') {
      // Docked on visor & hinged open exposing both circular 12G breech chambers!
      const snapReady = canSnapClosed(shotgun);
      const fullLoaded = countChambers(shotgun, 'live') === 2;

      // Receiver + grip stays in right clip
      pxRect(ctx, hx + 74, hy + 19, 16, 16, '#454c59');
      pxPoly(
        ctx,
        [
          [hx + 86, hy + 22],
          [hx + 112, hy + 36],
          [hx + 106, hy + 50],
          [hx + 82, hy + 34],
        ],
        '#6e4226'
      );

      // Barrels hinged downward-left at ~36 degrees
      pxPoly(
        ctx,
        [
          [hx + 68, hy + 30],
          [hx + 74, hy + 42],
          [hx + 12, hy + 72],
          [hx + 6, hy + 58],
        ],
        snapReady && pulse ? '#59687d' : '#252a33'
      );
      pxLine(ctx, hx + 66, hy + 33, hx + 10, hy + 61, '#687387', 2);

      // Breech block face housing the 2 side-by-side circular 12G chambers
      pxOutlineRect(
        ctx,
        ox + 299,
        oy + 35,
        52,
        28,
        '#2c313b',
        snapReady ? (fullLoaded ? '#6be36b' : '#ffb020') : '#687080'
      );

      for (let c = 0; c < 2; c++) {
        const chX = ox + BREECH_CHAMBERS[c].x;
        const chY = oy + BREECH_CHAMBERS[c].y;
        const r = BREECH_CHAMBERS[c].r;
        const st = shotgun.chambers[c];

        // Dark bore hole
        pxFillCircle(ctx, chX, chY, r + 1, '#101215');

        if (st === 'spent' && !(activeHold === 'spent_shell' && spentDragChamber === c)) {
          // Highlighted spent shell waiting to be dragged out!
          const hiCol = pulse ? '#ffeb75' : '#ffb020';
          pxFillCircle(ctx, chX, chY, r + 2, hiCol);
          pxFillCircle(ctx, chX, chY, r - 1, '#7a2c28');
          pxFillCircle(ctx, chX, chY, 5, '#9e8242');
          pxFillCircle(ctx, chX, chY, 2, '#2b2418'); // Struck primer dent
          // Downward pull cue arrow
          pxLine(ctx, chX, chY + 9, chX, chY + 17, hiCol, 2);
          pxLine(ctx, chX - 3, chY + 14, chX, chY + 17, hiCol, 1);
          pxLine(ctx, chX + 3, chY + 14, chX, chY + 17, hiCol, 1);
        } else if (st === 'empty') {
          // Open empty chamber pulsing for fresh shell drop-in
          pxRing(ctx, chX, chY, r + 1, r - 1, pulse ? '#6be36b' : '#3a8c4a');
          pxFillCircle(ctx, chX, chY, r - 2, '#090a0d');
        } else if (st === 'live') {
          // Fresh loaded 12G brass rim + bright primer!
          pxFillCircle(ctx, chX, chY, r, '#d62e24');
          pxFillCircle(ctx, chX, chY, r - 2, '#e8b944');
          pxFillCircle(ctx, chX, chY, 3, '#fff0b8');
        }
      }

      // Actionable micro-instruction directly under open breech
      let promptTxt = 'DRAG HULLS OUT';
      let promptCol = '#ffeb75';
      if (countChambers(shotgun, 'spent') === 0) {
        if (fullLoaded) {
          promptTxt = 'CLICK TO SNAP!';
          promptCol = '#6be36b';
        } else if (countChambers(shotgun, 'live') === 1) {
          promptTxt = 'LOAD 2ND OR CLICK';
          promptCol = '#ffb020';
        } else {
          promptTxt = 'DRAG FROM STRAP';
          promptCol = '#ffb020';
        }
      }
      pxOutlineRect(ctx, ox + 292, oy + 68, 86, 11, '#121417', promptCol);
      pxText(ctx, promptTxt, ox + 335, oy + 71, promptCol, 1, 'center');
    }
  }

  function drawEquippedShotgun(shotgun, shakeX, shakeY) {
    const aimX = Math.max(36, Math.min(COCKPIT_W - 36, pointer.x));
    const aimY = Math.max(24, Math.min(COCKPIT_H - 55, pointer.y));

    const recoilKick = shotgun.recoil * 22;
    const pivotX = COCKPIT_W * 0.64 + (aimX - COCKPIT_W * 0.5) * 0.34 + shakeX + recoilKick * 0.4;
    const pivotY = COCKPIT_H + 6 + recoilKick;

    const dx = aimX - pivotX;
    const dy = aimY - pivotY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    const barrelLen = 96 - shotgun.recoil * 12;
    const muzzleX = pivotX + ux * barrelLen;
    const muzzleY = pivotY + uy * barrelLen;

    // Muzzle blast star!
    if (shotgun.muzzleFlash > 0.05) {
      const fr = 22 * shotgun.muzzleFlash;
      pxFillCircle(ctx, muzzleX, muzzleY, fr * 1.25, '#ff7b1c');
      pxFillCircle(ctx, muzzleX, muzzleY, fr * 0.85, '#ffe875');
      pxFillCircle(ctx, muzzleX, muzzleY, fr * 0.45, '#ffffff');
      for (let s = 0; s < 6; s++) {
        const sa = (s / 6) * Math.PI * 2 + animTime * 11;
        pxLine(
          ctx,
          muzzleX,
          muzzleY,
          muzzleX + Math.cos(sa) * fr * 1.8,
          muzzleY + Math.sin(sa) * fr * 1.8,
          '#ffd24d',
          3
        );
      }
    }

    // Walnut stock / pistol grip at bottom
    const gripBackX = pivotX - ux * 18;
    const gripBackY = pivotY - uy * 18;
    pxLine(ctx, gripBackX, gripBackY, pivotX + ux * 24, pivotY + uy * 24, '#5e371f', 18);
    pxLine(ctx, gripBackX, gripBackY, pivotX + ux * 22, pivotY + uy * 22, '#85502f', 10);

    // Gloved hand gripping shotgun trigger guard
    pxFillCircle(ctx, pivotX + ux * 16 - nx * 4, pivotY + uy * 16 - ny * 4, 12, '#242730');
    pxFillCircle(ctx, pivotX + ux * 16 - nx * 4, pivotY + uy * 16 - ny * 4, 9, '#393e4a');

    // Twin side-by-side steel barrels foreshortened toward aim reticle
    const sepBase = 7.5;
    const sepTip = 5.2;
    for (const side of [-1, 1]) {
      const bx0 = pivotX + ux * 18 + nx * sepBase * side;
      const by0 = pivotY + uy * 18 + ny * sepBase * side;
      const bx1 = muzzleX + nx * sepTip * side;
      const by1 = muzzleY + ny * sepTip * side;
      pxLine(ctx, bx0, by0, bx1, by1, '#1e2229', 11);
      pxLine(ctx, bx0, by0, bx1, by1, '#4f5869', 6);
      pxLine(ctx, bx0 - nx * 2, by0 - ny * 2, bx1 - nx * 1.5, by1 - ny * 1.5, '#7e899e', 2);
      pxFillCircle(ctx, bx1, by1, 4, '#0c0d10');
    }

    // Brass bead front sight
    pxFillCircle(ctx, muzzleX, muzzleY - 3, 2, '#ffb020');

    // Receiver breech cap + twin shell indicators
    const recX = pivotX + ux * 20;
    const recY = pivotY + uy * 20;
    pxFillCircle(ctx, recX - nx * 5, recY - ny * 5, 3, shotgun.chambers[0] === 'live' ? '#e03e2d' : '#4a4f59');
    pxFillCircle(ctx, recX + nx * 5, recY + ny * 5, 3, shotgun.chambers[1] === 'live' ? '#e03e2d' : '#4a4f59');

    // Pixel buckshot crosshair at pointer
    const live = countChambers(shotgun, 'live');
    const overHolster = pointer.x > 255 && pointer.y < 90;
    if (!overHolster) {
      const retCol = live > 0 ? '#ffb020' : '#ff5242';
      const r = 13;
      pxLine(ctx, pointer.x - r, pointer.y - 4, pointer.x - r, pointer.y + 4, retCol, 2);
      pxLine(ctx, pointer.x + r, pointer.y - 4, pointer.x + r, pointer.y + 4, retCol, 2);
      pxLine(ctx, pointer.x - 4, pointer.y - r, pointer.x + 4, pointer.y - r, retCol, 2);
      pxLine(ctx, pointer.x - 4, pointer.y + r, pointer.x + 4, pointer.y + r, retCol, 2);
      pxRect(ctx, pointer.x - 1, pointer.y - 1, 2, 2, '#fff4cc');
      pxText(
        ctx,
        live > 0 ? `${live}/2` : 'EMPTY',
        pointer.x,
        pointer.y + 16,
        retCol,
        1,
        'center'
      );
    } else {
      // Hand icon cue when hovering over visor rack to return gun
      pxOutlineRect(ctx, pointer.x - 16, pointer.y - 8, 32, 13, '#141619', '#ffb020');
      pxText(ctx, 'RACK', pointer.x, pointer.y - 4, '#ffb020', 1, 'center');
    }
  }

  function drawDriverHandCursor(x, y, grabbing, draggedItem) {
    // Draw dragged shell right inside fingers if reloading!
    if (draggedItem === 'spent_shell') {
      drawShellSprite(x - 5, y - 20, 9, 28, 'spent', true);
    } else if (draggedItem === 'fresh_shell') {
      drawShellSprite(x - 5, y - 22, 9, 30, 'live', true);
    }

    const gx = Math.round(x);
    const gy = Math.round(y);

    // Pixel racing leather glove (dark charcoal + perforated knuckle vents + amber cuff stripe)
    if (grabbing) {
      // Closed fist gripping control
      pxOutlineRect(ctx, gx - 9, gy - 7, 19, 16, '#232730', '#0c0d10');
      pxRect(ctx, gx - 7, gy - 6, 15, 5, '#3b4252'); // Knuckles
      // Knuckle holes
      pxRect(ctx, gx - 5, gy - 4, 2, 2, '#d49b35');
      pxRect(ctx, gx, gy - 4, 2, 2, '#d49b35');
      pxRect(ctx, gx + 5, gy - 4, 2, 2, '#d49b35');
      // Wrist cuff
      pxOutlineRect(ctx, gx - 7, gy + 8, 15, 7, '#191c22', '#0c0d10');
      pxRect(ctx, gx - 6, gy + 10, 13, 2, '#ffb020');
    } else {
      // Open poised racing glove
      // 4 fingers
      for (let f = 0; f < 4; f++) {
        const fx = gx - 7 + f * 4;
        const fh = f === 1 || f === 2 ? 9 : 7;
        pxOutlineRect(ctx, fx, gy - fh - 2, 4, fh, '#2e3440', '#0c0d10');
      }
      // Thumb on left
      pxOutlineRect(ctx, gx - 12, gy - 3, 6, 8, '#2e3440', '#0c0d10');
      // Palm back
      pxOutlineRect(ctx, gx - 8, gy - 3, 17, 13, '#232730', '#0c0d10');
      pxRect(ctx, gx - 5, gy, 2, 2, '#d49b35');
      pxRect(ctx, gx, gy, 2, 2, '#d49b35');
      pxRect(ctx, gx + 5, gy, 2, 2, '#d49b35');
      // Cuff
      pxOutlineRect(ctx, gx - 6, gy + 9, 13, 6, '#181a20', '#0c0d10');
      pxRect(ctx, gx - 5, gy + 11, 11, 2, '#ffb020');
    }
  }

  function render({
    car,
    nitro,
    shotgun,
    rank,
    totalRacers,
    raceTime,
    countdownText,
    shakeX,
    shakeY,
  }) {
    ctx.clearRect(0, 0, COCKPIT_W, COCKPIT_H);

    const pulse = Math.floor(animTime * 5.5) % 2 === 0;
    const layers = getLayerOffsets(shakeX, shakeY);
    const l0 = layers.l0;
    const l1 = layers.l1;
    const l2 = layers.l2;

    const p1x = pointer.x - l1.x;
    const p1y = pointer.y - l1.y;
    const p2x = pointer.x - l2.x;
    const p2y = pointer.y - l2.y;
    const gunEquipped = shotgun.mode === 'EQUIPPED';

    // Speed lines on outer windshield during Nitro stacks
    if (nitro.stacks > 0) {
      const lineCount = nitro.stacks * 5;
      for (let i = 0; i < lineCount; i++) {
        const ang = ((i * 2.399 + Math.floor(animTime * 22)) % 6.28);
        const r0 = 85 + (i % 3) * 18;
        const r1 = 155 + nitro.stacks * 25;
        const cx = COCKPIT_W * 0.45;
        const cy = 96;
        const sx = cx + Math.cos(ang) * r0;
        const sy = cy + Math.sin(ang) * r0 * 0.55;
        const ex = cx + Math.cos(ang) * r1;
        const ey = cy + Math.sin(ang) * r1 * 0.55;
        if (sy < 156 && ey < 158) {
          pxLine(
            ctx,
            sx,
            sy,
            ex,
            ey,
            nitro.stacks === 3 ? '#ffeb75' : '#e8dfd1',
            nitro.stacks === 3 ? 2 : 1
          );
        }
      }
    }

    // === LAYER 0: CABIN ROOF, A-PILLARS, MUSCLE HOOD, RALLY HEADER ===
    // Muscle car hood visible just below windshield wipers
    const hoodTilt = -(car.wheelAngle / MAX_WHEEL_RAD) * 4;
    pxPoly(
      ctx,
      [
        [l0.x + 24, l0.y + 150 + hoodTilt],
        [l0.x + 240, l0.y + 144],
        [l0.x + 456, l0.y + 152 - hoodTilt],
        [l0.x + 466, l0.y + 168],
        [l0.x + 14, l0.y + 168],
      ],
      '#8f241e'
    );
    // Hood power bulge
    pxPoly(
      ctx,
      [
        [l0.x + 158, l0.y + 147],
        [l0.x + 306, l0.y + 147],
        [l0.x + 322, l0.y + 160],
        [l0.x + 144, l0.y + 160],
      ],
      '#6b1915'
    );

    // Roof headliner (oversized beyond [-24..504] so shake/pan never leaks edge pixels)
    pxRect(ctx, -28, -20, COCKPIT_W + 56, 38 + l0.y, '#191b20');
    pxRect(ctx, -28, 16 + l0.y, COCKPIT_W + 56, 4, '#2b2f38');

    // Left A-pillar
    pxPoly(
      ctx,
      [
        [-24, -10],
        [36 + l0.x, 16 + l0.y],
        [20 + l0.x, 166 + l0.y],
        [-24, 174],
      ],
      '#1e2128'
    );
    pxLine(ctx, 35 + l0.x, 18 + l0.y, 20 + l0.x, 164 + l0.y, '#383e4a', 2);

    // Right A-pillar
    pxPoly(
      ctx,
      [
        [COCKPIT_W + 24, -10],
        [446 + l0.x, 16 + l0.y],
        [462 + l0.x, 166 + l0.y],
        [COCKPIT_W + 24, 174],
      ],
      '#1e2128'
    );
    pxLine(ctx, 446 + l0.x, 18 + l0.y, 461 + l0.x, 164 + l0.y, '#383e4a', 2);

    // Rally Trip Computer strip at top-left/center of roof header
    const tripX = 68 + l0.x;
    const tripY = 4 + l0.y;
    pxOutlineRect(ctx, tripX, tripY, 188, 17, '#0f1114', '#4d5463');
    pxText(ctx, `POS ${formatOrdinal(rank)}/${totalRacers}`, tripX + 6, tripY + 4, '#ffb020', 1);
    const dispLap = Math.max(1, Math.min(3, car.lap || 1));
    pxText(ctx, `LAP ${dispLap}/3`, tripX + 78, tripY + 4, '#f4efe6', 1);
    pxText(ctx, formatRaceTime(raceTime), tripX + 182, tripY + 4, '#6be36b', 1, 'right');

    // Big arcade countdown banner on windshield when launching
    if (countdownText) {
      pxOutlineRect(ctx, 184, 66, 112, 34, 'rgba(15,17,20,0.88)', '#ffb020');
      pxText(
        ctx,
        countdownText,
        240,
        74,
        countdownText === 'GO!' ? '#6be36b' : '#ffb020',
        3,
        'center'
      );
    }

    // Gunsmoke puffs in front of windshield
    for (const sm of smokePuffs) {
      pxFillCircle(ctx, sm.x, sm.y, sm.r, 'rgba(195, 192, 185, 0.55)');
    }

    // === LAYER 1: DASHBOARD BODY, GAUGE CLUSTER, FOOTWELL PEDALS, NITRO CONSOLE ===
    // Padded vinyl dash top + steel lower fascia (oversized width for shake/pan safety)
    pxRect(ctx, -28, 156 + l1.y, COCKPIT_W + 56, 14, '#262a33');
    pxRect(ctx, -28, 156 + l1.y, COCKPIT_W + 56, 2, '#454c5c');
    pxRect(ctx, -28, 170 + l1.y, COCKPIT_W + 56, 125, '#17191f');

    // 1A. Left Driver Gauge Pod (x: 24..132, y: 162..205)
    const gx = 24 + l1.x;
    const gy = 162 + l1.y;
    pxOutlineRect(ctx, gx, gy, 108, 43, '#0d0f12', '#464d5c');

    // Analog speedometer dial
    const dialCx = gx + 24;
    const dialCy = gy + 22;
    pxFillCircle(ctx, dialCx, dialCy, 17, '#161920');
    pxRing(ctx, dialCx, dialCy, 18, 16, '#5c6475');
    for (let t = 0; t <= 6; t++) {
      const ta = Math.PI * 0.78 + (t / 6) * Math.PI * 1.44;
      pxRect(
        ctx,
        dialCx + Math.cos(ta) * 14,
        dialCy + Math.sin(ta) * 14,
        2,
        2,
        t >= 5 ? '#e03e2d' : '#cbc1ab'
      );
    }
    const mph = Math.round(Math.abs(car.speed) * 3.0);
    const needleFrac = Math.min(1, mph / 215);
    const needleAng = Math.PI * 0.78 + needleFrac * Math.PI * 1.44;
    pxLine(
      ctx,
      dialCx,
      dialCy,
      dialCx + Math.cos(needleAng) * 14,
      dialCy + Math.sin(needleAng) * 14,
      '#ff5242',
      2
    );
    pxFillCircle(ctx, dialCx, dialCy, 3, '#ffb020');

    // Digital MPH + Gear + RPM LED bar
    pxText(ctx, String(mph).padStart(3, '0'), gx + 48, gy + 6, '#ffb020', 2);
    pxText(ctx, 'MPH', gx + 88, gy + 11, '#cbc1ab', 1);

    const gearStr = car.gear === 0 ? 'R' : String(car.gear);
    pxOutlineRect(ctx, gx + 48, gy + 21, 20, 16, '#191d24', '#525a6b');
    pxText(ctx, gearStr, gx + 58, gy + 24, '#6be36b', 2, 'center');

    // 7-segment RPM strip
    for (let seg = 0; seg < 7; seg++) {
      const lit = car.rpm >= (seg + 1) / 7.4;
      const segCol = !lit
        ? '#232730'
        : seg < 4
        ? '#5fd968'
        : seg < 6
        ? '#ffb020'
        : '#ff4436';
      pxRect(ctx, gx + 72 + seg * 5, gy + 24, 4, 11, segCol);
    }

    // 1B. Left Footwell Cutaway + Pedals (x: 24..132, y: 208..261)
    const fx = 24 + l1.x;
    const fy = 207 + l1.y;
    pxOutlineRect(ctx, fx, fy, 108, 54, '#090a0d', '#343945');
    pxDitherRect(ctx, fx + 2, fy + 2, 104, 50, '#0c0e12', '#151820', 4);

    // BRAKE Pedal
    const brkHover = !gunEquipped && inRect(p1x, p1y, PEDAL_BRAKE, 4);
    const brkPush = car.brakeHeld ? 4 : 0;
    const bx = PEDAL_BRAKE.x + l1.x;
    const by = PEDAL_BRAKE.y + l1.y + brkPush;
    pxRect(ctx, bx + 16, fy + 2, 10, PEDAL_BRAKE.y - 207 + brkPush, '#343945'); // Pedal arm
    pxOutlineRect(
      ctx,
      bx,
      by,
      PEDAL_BRAKE.w,
      PEDAL_BRAKE.h - brkPush,
      car.brakeHeld ? '#59201c' : '#282c36',
      car.brakeHeld ? '#ff5242' : brkHover ? '#ffb020' : '#636b7d'
    );
    for (let rib = 0; rib < 3; rib++) {
      pxRect(ctx, bx + 5, by + 6 + rib * 5, PEDAL_BRAKE.w - 10, 2, '#14171c');
    }
    pxText(
      ctx,
      'BRK',
      bx + PEDAL_BRAKE.w / 2,
      by + PEDAL_BRAKE.h - brkPush - 11,
      car.brakeHeld ? '#ff8a7a' : '#f4efe6',
      1,
      'center'
    );

    // GAS Pedal
    const gasHover = !gunEquipped && inRect(p1x, p1y, PEDAL_GAS, 4);
    const gasPush = car.gasHeld ? 5 : 0;
    const ax = PEDAL_GAS.x + l1.x;
    const ay = PEDAL_GAS.y + l1.y + gasPush;
    pxRect(ctx, ax + 16, fy + 2, 9, PEDAL_GAS.y - 207 + gasPush, '#3e4452'); // Pedal arm
    pxOutlineRect(
      ctx,
      ax,
      ay,
      PEDAL_GAS.w,
      PEDAL_GAS.h - gasPush,
      car.gasHeld ? '#214728' : '#323845',
      car.gasHeld ? '#6be36b' : gasHover ? '#ffb020' : '#7b8499'
    );
    for (let slot = 0; slot < 3; slot++) {
      pxRect(ctx, ax + 8 + slot * 10, ay + 6, 4, PEDAL_GAS.h - gasPush - 20, '#181b22');
    }
    pxText(
      ctx,
      'GAS',
      ax + PEDAL_GAS.w / 2,
      ay + PEDAL_GAS.h - gasPush - 11,
      car.gasHeld ? '#9ef79e' : '#ffb020',
      1,
      'center'
    );

    // 1C. Center Console: Nitro Pressure + 3X Stack Lamps + Tactical Readout
    const cx = 244 + l1.x;
    const cy = 166 + l1.y;
    pxOutlineRect(ctx, cx, cy, 102, 92, '#101216', '#3d4352');

    pxText(ctx, 'NITRO PSI', cx + 6, cy + 6, nitro.lowPsiFlash > 0 ? '#ff5242' : '#cbc1ab', 1);
    pxOutlineRect(ctx, cx + 6, cy + 14, 90, 12, '#090a0d', '#505869');
    const psiW = Math.round((nitro.meter / 100) * 86);
    const psiCol =
      nitro.lowPsiFlash > 0 ? '#ff5242' : nitro.meter >= 32 ? '#45c4d6' : '#8a6626';
    pxRect(ctx, cx + 8, cy + 16, psiW, 8, psiCol);
    // 1-pull threshold notch at 32%
    pxRect(ctx, cx + 8 + Math.round(0.32 * 86), cy + 14, 1, 12, '#f4efe6');

    // 3X Stack Lamps
    const stackColors = ['#ffb020', '#ff7b1c', '#ff3b2f'];
    for (let s = 1; s <= 3; s++) {
      const lx = cx + 6 + (s - 1) * 31;
      const ly = cy + 31;
      const active = nitro.stacks >= s;
      pxOutlineRect(
        ctx,
        lx,
        ly,
        28,
        18,
        active ? stackColors[s - 1] : '#1b1f26',
        active ? '#fff2b2' : '#434957'
      );
      pxText(
        ctx,
        `${s}X`,
        lx + 14,
        ly + 6,
        active ? '#111315' : '#6c7487',
        1,
        'center'
      );
    }

    // Active boost burn-down bar
    if (nitro.stacks > 0) {
      const burnW = Math.max(2, Math.round((nitro.stackTimer / 5.2) * 90));
      pxRect(ctx, cx + 6, cy + 52, burnW, 4, stackColors[nitro.stacks - 1]);
    }

    // Tactical message screen
    pxOutlineRect(ctx, cx + 5, cy + 60, 92, 26, '#0a0d0c', '#334038');
    let msgLine1 = statusBanner.timer > 0 ? statusBanner.text : '';
    let msgCol = statusBanner.color;
    if (!msgLine1) {
      if (gunEquipped) {
        const lv = countChambers(shotgun, 'live');
        msgLine1 = lv > 0 ? `GUN: ${lv} LIVE` : 'EMPTY: RACK GUN';
        msgCol = lv > 0 ? '#ffb020' : '#ff5242';
      } else if (shotgun.mode === 'HOLSTERED_OPEN') {
        msgLine1 = 'VISOR RELOAD';
        msgCol = '#ffb020';
      } else if (car.speed < 3 && !car.gasHeld) {
        msgLine1 = 'HOLD GAS PEDAL';
        msgCol = '#6be36b';
      } else {
        msgLine1 = `WRECKS: ${shotgun.wrecksCount}`;
        msgCol = '#cbc1ab';
      }
    }
    // Split long status text onto 2 lines for clean 3x5 pixel fit
    if (msgLine1.length <= 14) {
      pxText(ctx, msgLine1, cx + 51, cy + 70, msgCol, 1, 'center');
    } else {
      const mid = msgLine1.lastIndexOf(' ', 14);
      const lA = mid > 0 ? msgLine1.slice(0, mid) : msgLine1.slice(0, 14);
      const lB = mid > 0 ? msgLine1.slice(mid + 1) : msgLine1.slice(14);
      pxText(ctx, lA, cx + 51, cy + 64, msgCol, 1, 'center');
      pxText(ctx, lB.slice(0, 15), cx + 51, cy + 74, msgCol, 1, 'center');
    }

    // === LAYER 2: FOREGROUND PROPS (WHEEL, NITRO T-HANDLE, SUN VISOR & SHOTGUN) ===
    // 2A. Steering column shroud + Rotating Steering Wheel
    pxOutlineRect(ctx, l2.x + 166, l2.y + 196, 40, 68, '#13151a', '#2b2f3a');
    const wheelHover =
      Math.hypot(p2x - WHEEL_HUB.x, p2y - WHEEL_HUB.y) <= WHEEL_HUB.rOuter + 5;
    drawSteeringWheel(
      WHEEL_HUB.x + l2.x,
      WHEEL_HUB.y + l2.y,
      car.wheelAngle,
      wheelHover,
      car.wheelHeld,
      gunEquipped
    );

    // 2B. Passenger Nitro Boost Handle (drag down to stack up to 3X!)
    const ntx = NITRO_TRACK.x + l2.x;
    const ntyTop = NITRO_TRACK.yTop + l2.y;
    const ntyBot = NITRO_TRACK.yBot + l2.y;
    pxOutlineRect(ctx, ntx - 34, ntyTop - 14, 68, ntyBot - ntyTop + 34, '#13161c', '#454c5c');
    pxText(ctx, 'PULL 3X', ntx, ntyTop - 10, '#ffb020', 1, 'center');

    // Vertical ratcheted slot + downward chevrons
    pxOutlineRect(ctx, ntx - 6, ntyTop, 12, ntyBot - ntyTop + 8, '#090a0d', '#383e4c');
    for (let r = 0; r < 5; r++) {
      const ry = ntyTop + 10 + r * 14;
      const lit = nitro.handlePos >= (r + 1) / 5.5;
      pxRect(ctx, ntx - 14, ry, 6, 3, lit ? '#ff7b1c' : '#343945');
      pxRect(ctx, ntx + 8, ry, 6, 3, lit ? '#ff7b1c' : '#343945');
    }
    // Bottom latch zone
    pxOutlineRect(ctx, ntx - 24, ntyBot - 2, 48, 12, '#2b1816', '#e03e2d');
    pxText(ctx, 'BOOST', ntx, ntyBot + 2, '#ff8a7a', 1, 'center');

    // T-Handle bar
    const curHandleY = ntyTop + nitro.handlePos * (ntyBot - ntyTop);
    const handleHover =
      !gunEquipped &&
      inRect(
        p2x,
        p2y,
        {
          x: NITRO_TRACK.x - NITRO_TRACK.handleW / 2,
          y:
            NITRO_TRACK.yTop +
            nitro.handlePos * (NITRO_TRACK.yBot - NITRO_TRACK.yTop) -
            NITRO_TRACK.handleH / 2,
          w: NITRO_TRACK.handleW,
          h: NITRO_TRACK.handleH,
        },
        5
      );
    // Chrome shaft
    pxRect(ctx, ntx - 3, ntyTop + 2, 6, Math.max(4, curHandleY - ntyTop), '#9aa3b5');
    // Red anodized T-grip
    pxOutlineRect(
      ctx,
      ntx - NITRO_TRACK.handleW / 2,
      curHandleY - NITRO_TRACK.handleH / 2,
      NITRO_TRACK.handleW,
      NITRO_TRACK.handleH,
      nitro.dragging ? '#ff5242' : '#c9302c',
      handleHover || nitro.dragging ? '#ffeb75' : '#241010'
    );
    pxRect(
      ctx,
      ntx - NITRO_TRACK.handleW / 2 + 4,
      curHandleY - NITRO_TRACK.handleH / 2 + 3,
      NITRO_TRACK.handleW - 8,
      3,
      '#ff8a7a'
    );
    pxText(ctx, 'N2O', ntx, curHandleY - 2, '#111315', 1, 'center');

    // 2C. Passenger Sun Visor, Shotgun Holster, Open Breech & Shell Strap
    drawVisorAndShotgun(l2.x, l2.y, shotgun, p2x, p2y, pulse);

    // Falling ejected brass hulls
    for (const sh of fallingShells) {
      drawShellSprite(sh.x - 4, sh.y - 12, 8, 24, 'spent', false);
    }

    // === FOREGROUND HAND OR EQUIPPED SAWED-OFF SHOTGUN ===
    if (gunEquipped) {
      drawEquippedShotgun(shotgun, shakeX, shakeY);
    } else {
      drawDriverHandCursor(pointer.x, pointer.y, pointer.down && activeHold !== null, activeHold);
    }
  }

  return {
    pointer,
    setStatus,
    releaseAllHolds,
    update,
    render,
  };
}
