import {
  MAX_WHEEL_RAD,
  getActiveWeapon,
  swapDualWeapon,
  equipWeapon,
  fireWeapon,
  holsterWeapon,
  openWeaponForReload,
  countWeaponChambers,
  ejectChamber,
  dropMagazine,
  insertAmmoFromPouch,
  canFinishReload,
  finishWeaponReload,
  updateNitroDrag,
  shiftGear,
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
import {
  VISOR_W,
  VISOR_H,
  HOLSTER_LOCAL,
  POUCH_SLOTS_LOCAL_X,
  POUCH_LOCAL_Y,
  SAWED_CHAMBERS_LOCAL,
  REV_CYLINDER_LOCAL,
  REV_EJECT_LOCAL,
  MAG_DROP_LOCAL,
  MAG_WELL_LOCAL,
  SLIDE_RACK_LOCAL,
  DUAL_SWAP_LOCAL,
  drawAmmoItem,
  drawVisorWeaponStation,
  drawEquippedWeaponFP,
} from './weaponArt.js';

export const COCKPIT_W = 480;
export const COCKPIT_H = 270;

// Authentic Left-Hand-Drive Station Coordinates (in forward-facing cabin space [0..480])
const WHEEL_HUB = { x: 118, y: 214, rOuter: 53, rInner: 40 }; // Left Driver Side!
const SHIFTER_BOX = { x: 210, y: 194, w: 78, h: 66 }; // Center Console H-Pattern!
const GIMMICK_BTN = { x: 210, y: 164, w: 78, h: 24 }; // Center Console Gimmick Switch
const DRIFT_LEVER = { x: 186, y: 168, w: 20, h: 66 }; // Rally Hydraulic Handbrake
const NITRO_TRACK = { x: 344, yTop: 176, yBot: 212, handleW: 52, handleH: 17 }; // Compact 36px Passenger Pull!
const VISOR_ORIGIN = { x: 264, y: 14 }; // Passenger Sun Visor

// 6-Speed + Reverse H-Gate Pocket Coordinates (inside SHIFTER_BOX)
const HGATE_POCKETS = [
  { gear: 1, x: 221, y: 207, label: '1' },
  { gear: 2, x: 221, y: 247, label: '2' },
  { gear: 3, x: 241, y: 207, label: '3' },
  { gear: 4, x: 241, y: 247, label: '4' },
  { gear: 5, x: 261, y: 207, label: '5' },
  { gear: 6, x: 261, y: 247, label: '6' },
  { gear: -1, x: 279, y: 247, label: 'R' },
];
const HGATE_NEUTRAL_Y = 227;

export function createCockpitController(canvas, sound, callbacks) {
  canvas.width = COCKPIT_W;
  canvas.height = COCKPIT_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const pointer = {
    x: COCKPIT_W * 0.48,
    y: COCKPIT_H * 0.72,
    down: false,
    panX: 0,
    panY: 0,
    viewYaw: 0, // -1 = Left Driver Window, 0 = Forward Windshield, +1 = Right Passenger Window
  };

  let activeHold = null; // 'wheel' | 'shifter' | 'drift' | 'nitro' | 'spent_hull' | 'fresh_ammo' | 'slide_rack' | null
  let wheelGrabPrevAngle = 0;
  let shifterKnobPos = { x: 221, y: 207 };
  let dragIndex = -1;
  let dragOrigin = { x: 0, y: 0 };

  const fallingBrass = [];
  const smokePuffs = [];
  const bulletCracks = [];
  let statusBanner = { text: 'SHIFT UP 1-6 TO ACCELERATE', timer: 3.5, color: '#ffb020' };
  let animTime = 0;

  function setStatus(text, color = '#ffb020', duration = 2.0) {
    statusBanner = { text, timer: duration, color };
  }

  function resetCabinEffects(initialGear = 1) {
    bulletCracks.length = 0;
    fallingBrass.length = 0;
    smokePuffs.length = 0;
    syncKnobToGear(initialGear);
  }

  function addBulletCrack(side = 'front') {
    if (bulletCracks.length > 14) bulletCracks.shift();
    let cx = 85 + Math.random() * 290;
    if (side === 'left') cx = -210 + Math.random() * 160;
    else if (side === 'right') cx = 500 + Math.random() * 170;
    bulletCracks.push({
      cabinX: cx,
      cabinY: 42 + Math.random() * 92,
      seed: Math.floor(Math.random() * 1000),
    });
  }

  function syncKnobToGear(gear) {
    const pocket = HGATE_POCKETS.find((p) => p.gear === gear);
    if (pocket) {
      shifterKnobPos.x = pocket.x;
      shifterKnobPos.y = pocket.y;
    } else {
      shifterKnobPos.x = 241;
      shifterKnobPos.y = HGATE_NEUTRAL_Y;
    }
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
    const yawShift = -pointer.viewYaw * 265;
    return {
      l0: { x: yawShift - pointer.panX * 4 + shakeX * 0.6, y: -pointer.panY * 3 + shakeY * 0.6 },
      l1: { x: yawShift - pointer.panX * 8 + shakeX, y: -pointer.panY * 5 + shakeY },
      l2: { x: yawShift - pointer.panX * 12 + shakeX * 1.2, y: -pointer.panY * 6 + shakeY * 1.2 },
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

  function spawnFallingItem(x, y, gunId, loaderTier) {
    fallingBrass.push({
      x,
      y,
      vx: -22 + (Math.random() - 0.5) * 40,
      vy: -30 - Math.random() * 25,
      gunId,
      loaderTier,
      life: 1.1,
    });
  }

  function spawnGunSmoke(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      smokePuffs.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -16 - Math.random() * 18,
        r: 3 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.25,
      });
    }
  }

  function releaseAllHolds(car, nitro) {
    activeHold = null;
    car.wheelHeld = false;
    car.driftHeld = false;
    nitro.dragging = false;
    dragIndex = -1;
    syncKnobToGear(car.gear);
  }

  function triggerWeaponShot(wep, screenX, screenY) {
    const res = fireWeapon(wep);
    if (res.fired) {
      const suppressed = wep.id === 'smg' && wep.stats.parts.barrel === 2;
      sound.playWeaponFire(wep.id, suppressed);
      spawnGunSmoke(screenX, screenY + 14, wep.id === 'sawed_off' ? 6 : 3);
      const ndcX = (screenX / COCKPIT_W) * 2 - 1;
      const ndcY = -((screenY / COCKPIT_H) * 2 - 1);
      callbacks.onWeaponFired(ndcX, ndcY, wep.stats);
    } else if (res.dryFire) {
      sound.playDryFire();
      setStatus('EMPTY! RACK GUN ON VISOR', '#ff5242', 1.8);
    }
  }

  function handlePointerDown(e) {
    if (!callbacks.isInteractive()) return;
    if (e.button !== undefined && e.button !== 0) return;

    // Ignore clicks on top-left corner settings button zone
    const pt = clientToPixel(e.clientX, e.clientY);
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.down = true;

    sound.init();

    const { car, nitro, loadout, carStats } = callbacks.getState();
    const wep = getActiveWeapon(loadout);
    const layers = getLayerOffsets(0, 0);
    const p1x = pt.x - layers.l1.x;
    const p1y = pt.y - layers.l1.y;
    const p2x = pt.x - layers.l2.x;
    const p2y = pt.y - layers.l2.y;

    const vLocalX = p2x - VISOR_ORIGIN.x;
    const vLocalY = p2y - VISOR_ORIGIN.y;

    // Dual-holster hot-swap button on Iron Mule Ute!
    if (
      loadout.weapons.length > 1 &&
      vLocalX >= DUAL_SWAP_LOCAL.x &&
      vLocalX <= DUAL_SWAP_LOCAL.x + DUAL_SWAP_LOCAL.w + 22 &&
      vLocalY >= DUAL_SWAP_LOCAL.y - 2 &&
      vLocalY <= DUAL_SWAP_LOCAL.y + DUAL_SWAP_LOCAL.h + 2
    ) {
      swapDualWeapon(loadout);
      sound.playBreechSnap(false);
      const nowWep = getActiveWeapon(loadout);
      setStatus(`ACTIVE: ${nowWep.stats.spec.name}`, '#ffb020', 1.6);
      return;
    }

    // 1. If weapon is EQUIPPED, hand is occupied!
    if (wep.mode === 'EQUIPPED') {
      // Check clicking Visor Holster to return gun
      if (
        vLocalX >= HOLSTER_LOCAL.x - 6 &&
        vLocalX <= HOLSTER_LOCAL.x + HOLSTER_LOCAL.w + 6 &&
        vLocalY >= HOLSTER_LOCAL.y - 6 &&
        vLocalY <= HOLSTER_LOCAL.y + HOLSTER_LOCAL.h + 6
      ) {
        const wasEmpty = wep.ammo === 0;
        holsterWeapon(wep);
        sound.playBreechSnap(wasEmpty);
        setStatus(wasEmpty ? 'RELOAD ON VISOR' : 'WEAPON HOLSTERED', '#ffb020', 1.8);
        return;
      }

      // Clicking cabin controls while holding gun reminds player their 1 hand holds the gun
      const touchingCabin =
        Math.abs(pointer.viewYaw) < 0.35 &&
        pt.y > 165 &&
        (Math.hypot(p2x - WHEEL_HUB.x, p2y - WHEEL_HUB.y) <= WHEEL_HUB.rOuter ||
          inRect(p1x, p1y, SHIFTER_BOX, 4));
      if (touchingCabin) {
        sound.playDryFire();
        wep.holsterAlert = 1.0;
        setStatus('HOLSTER GUN TO DRIVE!', '#ff5242', 1.6);
        return;
      }

      triggerWeaponShot(wep, pt.x, pt.y);
      return;
    }

    // 2. Hand is FREE! Check Sun Visor Weapon & Reload interactions
    if (wep.mode === 'HOLSTERED_READY') {
      // Early [RELOAD] button if partial ammo
      if (wep.ammo < wep.maxAmmo && vLocalX >= 74 && vLocalX <= 122 && vLocalY >= 0 && vLocalY <= 15) {
        openWeaponForReload(wep);
        sound.playBreechSnap(true);
        setStatus('WEAPON OPEN FOR RELOAD', '#ffb020', 1.8);
        return;
      }
      if (
        vLocalX >= HOLSTER_LOCAL.x - 4 &&
        vLocalX <= HOLSTER_LOCAL.x + HOLSTER_LOCAL.w + 4 &&
        vLocalY >= HOLSTER_LOCAL.y - 4 &&
        vLocalY <= HOLSTER_LOCAL.y + HOLSTER_LOCAL.h + 4
      ) {
        equipWeapon(wep);
        sound.playBreechSnap(false);
        setStatus(
          wep.stats.spec.auto ? 'HOLD CLICK: FULL-AUTO!' : 'AIM & CLICK TO FIRE (A/D SIDE)',
          '#ffb020',
          1.9
        );
        return;
      }
    } else if (wep.mode === 'HOLSTERED_OPEN') {
      const rType = wep.stats.spec.reloadType;

      // 2A. Sawed-off spent shells drag-out
      if (rType === 'break_2') {
        for (let c = 0; c < 2; c++) {
          if (wep.chambers[c] === 'spent') {
            const ch = SAWED_CHAMBERS_LOCAL[c];
            if (Math.hypot(vLocalX - ch.x, vLocalY - ch.y) <= ch.r + 6) {
              activeHold = 'spent_hull';
              dragIndex = c;
              dragOrigin = { x: vLocalX, y: vLocalY };
              return;
            }
          }
        }
      }

      // 2B. Revolver ejector rod click
      if (rType === 'cylinder' && inRect(vLocalX, vLocalY, REV_EJECT_LOCAL, 5)) {
        if (ejectChamber(wep)) {
          sound.playShellEject();
          for (let k = 0; k < 3; k++) {
            spawnFallingItem(pt.x + k * 6, pt.y, 'revolver', 0);
          }
          setStatus(
            wep.stats.hasSpeedloader ? 'DRAG SPEEDLOADER IN!' : 'DRAG .357 ROUNDS IN!',
            '#ffb020',
            1.8
          );
        } else {
          sound.playDryFire();
        }
        return;
      }

      // 2C. M1911 / SMG: Drop empty magazine OR Rack slide/bolt!
      if (rType === 'mag_slide') {
        if (wep.reloadStage === 'mag_spent' && inRect(vLocalX, vLocalY, MAG_DROP_LOCAL, 6)) {
          dropMagazine(wep);
          sound.playShellEject();
          spawnFallingItem(pt.x, pt.y + 10, wep.id, wep.stats.parts.loader);
          setStatus('DRAG FRESH MAG INTO GRIP', '#ffb020', 1.8);
          return;
        }
        if (wep.reloadStage === 'mag_in' && inRect(vLocalX, vLocalY, SLIDE_RACK_LOCAL, 6)) {
          activeHold = 'slide_rack';
          dragOrigin = { x: vLocalX, y: vLocalY };
          return;
        }
      }

      // 2D. Grab fresh ammo / mag / speedloader from Visor Pouch
      for (let s = 0; s < POUCH_SLOTS_LOCAL_X.length; s++) {
        if (!wep.pouchSlots[s]) continue;
        const sx = POUCH_SLOTS_LOCAL_X[s];
        if (
          vLocalX >= sx - 3 &&
          vLocalX <= sx + 11 &&
          vLocalY >= POUCH_LOCAL_Y - 4 &&
          vLocalY <= POUCH_LOCAL_Y + 40
        ) {
          if (rType === 'mag_slide' && wep.reloadStage === 'mag_spent') {
            sound.playDryFire();
            setStatus('CLICK DROP MAG FIRST!', '#ff5242', 1.6);
            return;
          }
          if (rType === 'cylinder' && countWeaponChambers(wep, 'spent') > 0) {
            sound.playDryFire();
            setStatus('CLICK EJECT ROD FIRST!', '#ff5242', 1.6);
            return;
          }
          if (
            rType === 'break_2' &&
            countWeaponChambers(wep, 'spent') > 0 &&
            countWeaponChambers(wep, 'empty') === 0
          ) {
            sound.playDryFire();
            setStatus('DRAG SPENT HULLS OUT!', '#ff5242', 1.6);
            return;
          }
          activeHold = 'fresh_ammo';
          dragIndex = s;
          return;
        }
      }

      // 2E. Click open Sawed-off / Revolver to snap closed once loaded
      if (
        (rType === 'break_2' || rType === 'cylinder') &&
        inRect(vLocalX, vLocalY, { x: 2, y: 6, w: 116, h: 58 }, 2)
      ) {
        if (canFinishReload(wep)) {
          finishWeaponReload(wep);
          sound.playBreechSnap(false);
          setStatus('LOCKED & LOADED!', '#6be36b', 1.5);
        } else {
          sound.playDryFire();
        }
        return;
      }
    }

    // 3. Check Passenger Compact Nitro Pull-Handle (Layer 2)
    const handleY =
      NITRO_TRACK.yTop + nitro.handlePos * (NITRO_TRACK.yBot - NITRO_TRACK.yTop);
    const handleRect = {
      x: NITRO_TRACK.x - NITRO_TRACK.handleW / 2,
      y: handleY - NITRO_TRACK.handleH / 2,
      w: NITRO_TRACK.handleW,
      h: NITRO_TRACK.handleH,
    };
    if (inRect(p2x, p2y, handleRect, 7)) {
      activeHold = 'nitro';
      nitro.dragging = true;
      nitro.latchedThisDrag = false;
      return;
    }

    // 4. Check Vehicle Gimmick Controls (Center Console, Layer 1)
    if (carStats.spec.gimmickType === 'blower' && inRect(p1x, p1y, GIMMICK_BTN, 4)) {
      if (car.blowerHeat < 0.92 || car.blowerActive) {
        car.blowerActive = !car.blowerActive;
        sound.playBreechSnap(!car.blowerActive);
        setStatus(
          car.blowerActive ? 'BLOWER OVERDRIVE ON!' : 'BLOWER COOLING',
          car.blowerActive ? '#ff7b1c' : '#cbc1ab',
          1.6
        );
      } else {
        sound.playLowPsi();
        setStatus('BLOWER HOT! WAIT', '#ff5242', 1.4);
      }
      return;
    }

    if (carStats.spec.gimmickType === 'drift_4x' && inRect(p1x, p1y, DRIFT_LEVER, 5)) {
      activeHold = 'drift';
      car.driftHeld = true;
      setStatus('DRIFT HANDBRAKE!', '#ffb020', 1.0);
      return;
    }

    // 5. Check Center Console 1-6 + R H-Pattern Gear Shifter (Layer 1)
    if (inRect(p1x, p1y, SHIFTER_BOX, 6)) {
      activeHold = 'shifter';
      updateShifterFromPoint(p1x, p1y, car, carStats);
      return;
    }

    // 6. Check Left Driver Steering Wheel (Layer 2)
    const wheelDist = Math.hypot(p2x - WHEEL_HUB.x, p2y - WHEEL_HUB.y);
    if (wheelDist <= WHEEL_HUB.rOuter + 7) {
      activeHold = 'wheel';
      car.wheelHeld = true;
      wheelGrabPrevAngle = Math.atan2(p2y - WHEEL_HUB.y, p2x - WHEEL_HUB.x);
    }
  }

  function updateShifterFromPoint(p1x, p1y, car, carStats) {
    shifterKnobPos.x = Math.max(SHIFTER_BOX.x + 8, Math.min(SHIFTER_BOX.x + SHIFTER_BOX.w - 8, p1x));
    shifterKnobPos.y = Math.max(SHIFTER_BOX.y + 8, Math.min(SHIFTER_BOX.y + SHIFTER_BOX.h - 8, p1y));

    // Upgraded short-throw shifter has an even more generous magnetic gate snap radius
    const snapRadius = 11.5 + carStats.parts.trans * 2.5;
    for (const pocket of HGATE_POCKETS) {
      if (Math.hypot(shifterKnobPos.x - pocket.x, shifterKnobPos.y - pocket.y) <= snapRadius) {
        const oldGear = car.gear;
        if (shiftGear(car, pocket.gear)) {
          sound.playGearShift(pocket.gear < oldGear);
          const lbl = pocket.gear === -1 ? 'REVERSE' : `GEAR ${pocket.gear}`;
          setStatus(
            pocket.gear > 0 && pocket.gear < oldGear ? `${lbl} ENGINE BRAKE` : lbl,
            '#6be36b',
            1.1
          );
        }
        shifterKnobPos.x = pocket.x;
        shifterKnobPos.y = pocket.y;
        return;
      }
    }
  }

  function handlePointerMove(e) {
    const pt = clientToPixel(e.clientX, e.clientY);
    const prevX = pointer.x;
    pointer.x = pt.x;
    pointer.y = pt.y;

    if (!callbacks.isInteractive() || !pointer.down || !activeHold) return;

    const { car, nitro, loadout, carStats } = callbacks.getState();
    const wep = getActiveWeapon(loadout);
    const layers = getLayerOffsets(0, 0);
    const p1x = pt.x - layers.l1.x;
    const p1y = pt.y - layers.l1.y;
    const p2x = pt.x - layers.l2.x;
    const p2y = pt.y - layers.l2.y;
    const vLocalX = p2x - VISOR_ORIGIN.x;
    const vLocalY = p2y - VISOR_ORIGIN.y;

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
        car.wheelAngle = Math.max(
          -MAX_WHEEL_RAD,
          Math.min(MAX_WHEEL_RAD, car.wheelAngle + (pt.x - prevX) / 36)
        );
        wheelGrabPrevAngle = Math.atan2(dy, dx);
      }
    } else if (activeHold === 'shifter') {
      updateShifterFromPoint(p1x, p1y, car, carStats);
    } else if (activeHold === 'nitro') {
      const norm = (p2y - NITRO_TRACK.yTop) / (NITRO_TRACK.yBot - NITRO_TRACK.yTop);
      const res = updateNitroDrag(nitro, norm);
      if (res.triggered) {
        sound.playNitroTrigger(res.stacks);
        setStatus(`NITRO ${res.stacks}X BOOST!`, '#ff7b1c', 1.6);
        activeHold = null;
      } else if (res.lowPsi) {
        sound.playLowPsi();
        setStatus('LOW NITRO PSI!', '#ff5242', 1.3);
        activeHold = null;
      }
    } else if (activeHold === 'spent_hull' && dragIndex !== -1) {
      if (Math.hypot(vLocalX - dragOrigin.x, vLocalY - dragOrigin.y) >= 22) {
        if (ejectChamber(wep, dragIndex)) {
          sound.playShellEject();
          spawnFallingItem(pt.x, pt.y, 'sawed_off', wep.stats.parts.loader);
          const rem = countWeaponChambers(wep, 'spent');
          setStatus(rem > 0 ? 'PULL 2ND HULL OUT' : 'DRAG SHELLS IN', '#ffb020', 1.6);
        }
        activeHold = null;
        dragIndex = -1;
      }
    } else if (activeHold === 'fresh_ammo' && dragIndex !== -1) {
      const rType = wep.stats.spec.reloadType;
      let inDropZone = false;
      if (rType === 'break_2') {
        inDropZone = Math.hypot(vLocalX - 53, vLocalY - 38) <= 30;
      } else if (rType === 'cylinder') {
        inDropZone =
          Math.hypot(vLocalX - REV_CYLINDER_LOCAL.x, vLocalY - REV_CYLINDER_LOCAL.y) <= 30;
      } else if (rType === 'mag_slide') {
        inDropZone = inRect(vLocalX, vLocalY, MAG_WELL_LOCAL, 10);
      }

      if (inDropZone) {
        const res = insertAmmoFromPouch(wep, dragIndex);
        if (res.loaded) {
          sound.playShellLoad();
          if (rType === 'mag_slide') {
            setStatus(
              wep.id === 'smg' ? 'PULL TOP BOLT ->' : 'RACK TOP SLIDE ->',
              '#6be36b',
              1.9
            );
          } else if (wep.ammo === wep.maxAmmo) {
            setStatus('CLICK GUN TO CLOSE!', '#6be36b', 1.9);
          }
          activeHold = null;
          dragIndex = -1;
        }
      }
    } else if (activeHold === 'slide_rack') {
      if (vLocalX - dragOrigin.x >= 12 || Math.hypot(vLocalX - dragOrigin.x, vLocalY - dragOrigin.y) >= 15) {
        if (finishWeaponReload(wep)) {
          sound.playBreechSnap(false);
          setStatus('CHAMBERED & READY!', '#6be36b', 1.6);
        }
        activeHold = null;
      }
    }
  }

  function handlePointerUp() {
    if (activeHold === 'slide_rack') {
      // Allow quick tap-rack on slide as well as drag-rack so combat stays fluid
      const { loadout } = callbacks.getState();
      const wep = getActiveWeapon(loadout);
      if (finishWeaponReload(wep)) {
        sound.playBreechSnap(false);
        setStatus('CHAMBERED & READY!', '#6be36b', 1.5);
      }
    }
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

  function update(dt, lookDirInput = 0) {
    animTime += dt;
    const targetPanX = (pointer.x / COCKPIT_W) * 2 - 1;
    const targetPanY = (pointer.y / COCKPIT_H) * 2 - 1;
    pointer.panX += (targetPanX - pointer.panX) * Math.min(1, dt * 10);
    pointer.panY += (targetPanY - pointer.panY) * Math.min(1, dt * 10);
    pointer.viewYaw += (lookDirInput - pointer.viewYaw) * Math.min(1, dt * 13);

    // Full-Auto firing while holding Left-Click with SMG!
    if (callbacks.isInteractive() && pointer.down && !activeHold) {
      const { loadout } = callbacks.getState();
      const wep = getActiveWeapon(loadout);
      if (wep.mode === 'EQUIPPED' && wep.stats.spec.auto && wep.ammo > 0 && wep.fireCooldown <= 0) {
        const overHolster = pointer.x > 256 && pointer.y < 88 && pointer.viewYaw > -0.3;
        if (!overHolster) {
          triggerWeaponShot(wep, pointer.x, pointer.y);
        }
      }
    }

    if (statusBanner.timer > 0) {
      statusBanner.timer = Math.max(0, statusBanner.timer - dt);
    }

    for (let i = fallingBrass.length - 1; i >= 0; i--) {
      const b = fallingBrass[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 260 * dt;
      if (b.life <= 0 || b.y > COCKPIT_H + 30) fallingBrass.splice(i, 1);
    }

    for (let i = smokePuffs.length - 1; i >= 0; i--) {
      const sm = smokePuffs[i];
      sm.life -= dt;
      sm.x += sm.vx * dt;
      sm.y += sm.vy * dt;
      sm.r += 8 * dt;
      if (sm.life <= 0) smokePuffs.splice(i, 1);
    }
  }

  function drawSteeringWheel(cx, cy, angle, hovered, held, occupiedByGun) {
    const ro = WHEEL_HUB.rOuter;
    const ri = WHEEL_HUB.rInner;

    pxRing(ctx, cx + 2, cy + 4, ro, ri, 'rgba(0,0,0,0.45)');

    // 3 classic 9-3-6 rally spokes leaving top arch completely open to read the gauge cluster!
    const spokeAngles = [angle + Math.PI * 0.96, angle + Math.PI * 0.04, angle + Math.PI * 0.5];
    for (const sa of spokeAngles) {
      const sx = cx + Math.cos(sa) * (ri + 2);
      const sy = cy + Math.sin(sa) * (ri + 2);
      pxLine(ctx, cx, cy, sx, sy, '#4c525e', 7);
      pxLine(ctx, cx, cy, sx, sy, '#7c8494', 3);
      pxFillCircle(ctx, cx + Math.cos(sa) * 23, cy + Math.sin(sa) * 23, 2, '#17191d');
    }

    const rimBorder = held ? '#ffb020' : hovered && !occupiedByGun ? '#d9a441' : '#2e323b';
    pxRing(ctx, cx, cy, ro + 1, ro, rimBorder);
    pxRing(ctx, cx, cy, ro, ri, '#20232a');
    pxRing(ctx, cx, cy, ro - 2, ri + 3, '#323742');

    const topAng = angle - Math.PI * 0.5;
    const tx = cx + Math.cos(topAng) * ((ro + ri) * 0.5);
    const ty = cy + Math.sin(topAng) * ((ro + ri) * 0.5);
    pxFillCircle(ctx, tx, ty, 5, '#e03e2d');
    pxFillCircle(ctx, tx, ty, 2, '#ff8a7a');

    pxFillCircle(ctx, cx, cy, 12, '#191b20');
    pxFillCircle(ctx, cx, cy, 8, '#2c303a');
    pxFillCircle(ctx, cx, cy, 3, '#ffb020');
  }

  function drawHPatternShifter(l1x, l1y, car, carStats, p1x, p1y, gunEquipped) {
    const sx = SHIFTER_BOX.x + l1x;
    const sy = SHIFTER_BOX.y + l1y;
    const transTier = carStats.parts.trans;

    // Shifter bezel (Stock matte -> Alloy rally -> Billet gated plate!)
    const plateFill = transTier === 2 ? '#5d6678' : transTier === 1 ? '#292e38' : '#12151a';
    const plateBorder = transTier === 2 ? '#e8b944' : '#4a5263';
    pxOutlineRect(ctx, sx, sy, SHIFTER_BOX.w, SHIFTER_BOX.h, plateFill, plateBorder);
    if (transTier === 2) {
      // Corner hex bolts on billet gated plate
      for (const [bx, by] of [
        [sx + 3, sy + 3],
        [sx + SHIFTER_BOX.w - 5, sy + 3],
        [sx + 3, sy + SHIFTER_BOX.h - 5],
        [sx + SHIFTER_BOX.w - 5, sy + SHIFTER_BOX.h - 5],
      ]) {
        pxRect(ctx, bx, by, 2, 2, '#14171c');
      }
    }

    // Draw H-Gate neutral horizontal channel + 4 vertical gate slots (1-2, 3-4, 5-6, R)
    const ny = HGATE_NEUTRAL_Y + l1y;
    pxRect(ctx, l1x + 219, ny - 2, 62, 5, '#090a0d');
    for (const colX of [221, 241, 261]) {
      pxRect(ctx, l1x + colX - 2, l1y + 205, 5, 44, '#090a0d');
    }
    // Reverse slot on bottom-right
    pxRect(ctx, l1x + 279 - 2, ny - 2, 5, 24, '#090a0d');

    // Gate labels
    for (const p of HGATE_POCKETS) {
      const active = car.gear === p.gear;
      const ly = p.y < HGATE_NEUTRAL_Y ? p.y - 10 : p.y + 6;
      pxText(
        ctx,
        p.label,
        l1x + p.x,
        l1y + ly,
        active ? '#6be36b' : p.gear === -1 ? '#ff7b70' : '#f4efe6',
        1,
        'center'
      );
    }

    // Shifter shaft + spherical knob
    const kx = l1x + (activeHold === 'shifter' ? shifterKnobPos.x : (HGATE_POCKETS.find((p) => p.gear === car.gear)?.x ?? 241));
    const ky = l1y + (activeHold === 'shifter' ? shifterKnobPos.y : (HGATE_POCKETS.find((p) => p.gear === car.gear)?.y ?? HGATE_NEUTRAL_Y));

    pxLine(ctx, sx + SHIFTER_BOX.w / 2, ny + 4, kx, ky, '#9aa4b8', 3);

    const hoverKnob = !gunEquipped && inRect(p1x, p1y, SHIFTER_BOX, 4);
    const knobCol =
      transTier === 2 ? '#e8b944' : transTier === 1 ? '#d63629' : '#2d3340';
    pxFillCircle(ctx, kx, ky, 7, activeHold === 'shifter' || hoverKnob ? '#ffeb75' : '#0e1014');
    pxFillCircle(ctx, kx, ky, 5, knobCol);
    pxFillCircle(ctx, kx - 1, ky - 2, 2, '#ffffff');
  }

  function drawBulletSpiderweb(cx, cy, seed) {
    pxFillCircle(ctx, cx, cy, 2, '#e8eef7');
    for (let r = 0; r < 6; r++) {
      const ang = (r / 6) * Math.PI * 2 + (seed % 7) * 0.2;
      const len = 8 + ((seed + r * 13) % 14);
      pxLine(
        ctx,
        cx,
        cy,
        cx + Math.cos(ang) * len,
        cy + Math.sin(ang) * len,
        'rgba(220, 232, 248, 0.75)',
        1
      );
    }
    pxRing(ctx, cx, cy, 6, 5, 'rgba(200, 215, 235, 0.55)');
  }

  function drawDriverHand(x, y, grabbing, holdType, wep) {
    if (holdType === 'spent_hull') {
      drawAmmoItem(ctx, x - 4, y - 18, 'sawed_off', wep.stats.parts.loader, true, true);
    } else if (holdType === 'fresh_ammo') {
      drawAmmoItem(ctx, x - 4, y - 20, wep.id, wep.stats.parts.loader, false, true);
    }

    const gx = Math.round(x);
    const gy = Math.round(y);

    if (grabbing) {
      pxOutlineRect(ctx, gx - 9, gy - 7, 19, 16, '#232730', '#0c0d10');
      pxRect(ctx, gx - 7, gy - 6, 15, 5, '#3b4252');
      pxRect(ctx, gx - 5, gy - 4, 2, 2, '#d49b35');
      pxRect(ctx, gx, gy - 4, 2, 2, '#d49b35');
      pxRect(ctx, gx + 5, gy - 4, 2, 2, '#d49b35');
      pxOutlineRect(ctx, gx - 7, gy + 8, 15, 7, '#191c22', '#0c0d10');
      pxRect(ctx, gx - 6, gy + 10, 13, 2, '#ffb020');
    } else {
      for (let f = 0; f < 4; f++) {
        const fx = gx - 7 + f * 4;
        const fh = f === 1 || f === 2 ? 9 : 7;
        pxOutlineRect(ctx, fx, gy - fh - 2, 4, fh, '#2e3440', '#0c0d10');
      }
      pxOutlineRect(ctx, gx - 12, gy - 3, 6, 8, '#2e3440', '#0c0d10');
      pxOutlineRect(ctx, gx - 8, gy - 3, 17, 13, '#232730', '#0c0d10');
      pxRect(ctx, gx - 5, gy, 2, 2, '#d49b35');
      pxRect(ctx, gx, gy, 2, 2, '#d49b35');
      pxRect(ctx, gx + 5, gy, 2, 2, '#d49b35');
      pxOutlineRect(ctx, gx - 6, gy + 9, 13, 6, '#181a20', '#0c0d10');
      pxRect(ctx, gx - 5, gy + 11, 11, 2, '#ffb020');
    }
  }

  function render({
    car,
    nitro,
    loadout,
    carStats,
    rank,
    aliveRivals,
    totalRacers,
    totalLaps,
    raceTime,
    countdownText,
    threatLeft,
    threatRight,
    shakeX,
    shakeY,
  }) {
    ctx.clearRect(0, 0, COCKPIT_W, COCKPIT_H);

    const pulse = Math.floor(animTime * 5.8) % 2 === 0;
    const layers = getLayerOffsets(shakeX, shakeY);
    const l0 = layers.l0;
    const l1 = layers.l1;
    const l2 = layers.l2;

    const p1x = pointer.x - l1.x;
    const p1y = pointer.y - l1.y;
    const p2x = pointer.x - l2.x;
    const p2y = pointer.y - l2.y;

    const wep = getActiveWeapon(loadout);
    const gunEquipped = wep.mode === 'EQUIPPED';
    const engineTier = carStats.parts.engine;
    const armorTier = carStats.parts.armor;
    const nitroTier = carStats.parts.nitro;

    // Nitro speed lines
    if (nitro.stacks > 0 && Math.abs(pointer.viewYaw) < 0.4) {
      const lineCount = nitro.stacks * 4;
      for (let i = 0; i < lineCount; i++) {
        const ang = (i * 2.399 + Math.floor(animTime * 22)) % 6.28;
        const r0 = 88 + (i % 3) * 16;
        const r1 = 155 + nitro.stacks * 24;
        const sx = 240 + Math.cos(ang) * r0;
        const sy = 94 + Math.sin(ang) * r0 * 0.55;
        const ex = 240 + Math.cos(ang) * r1;
        const ey = 94 + Math.sin(ang) * r1 * 0.55;
        if (sy < 154 && ey < 156) {
          pxLine(ctx, sx, sy, ex, ey, nitro.stacks >= 3 ? '#ffeb75' : '#e8dfd1', 1);
        }
      }
    }

    // === LAYER 0: PANORAMIC HOOD, ENGINE BLOWER, A/B-PILLARS, SIDE DOORS & WINDOWS ===
    // 0A. Car Hood + Visible Engine Intake Upgrade through Windshield!
    const hoodTilt = -(car.wheelAngle / MAX_WHEEL_RAD) * 3.5;
    pxPoly(
      ctx,
      [
        [l0.x + 28, l0.y + 150 + hoodTilt],
        [l0.x + 240, l0.y + 143],
        [l0.x + 452, l0.y + 151 - hoodTilt],
        [l0.x + 464, l0.y + 168],
        [l0.x + 16, l0.y + 168],
      ],
      carStats.spec.hoodColor
    );

    if (engineTier === 1) {
      // Twin-Carb Hood Scoop visible outside windshield!
      const vib = Math.sin(animTime * 42) * (0.4 + car.rpm * 0.8);
      pxOutlineRect(ctx, l0.x + 206, l0.y + 132 + vib, 68, 16, '#39404d', '#15181e');
      pxRect(ctx, l0.x + 212, l0.y + 135 + vib, 56, 6, '#1a0b0a');
      pxRect(ctx, l0.x + 214, l0.y + 136 + vib, 16, 4, '#c9302c');
      pxRect(ctx, l0.x + 248, l0.y + 136 + vib, 16, 4, '#c9302c');
    } else if (engineTier >= 2) {
      // Towering Chrome Supercharger & 3-Butterfly Red Bugcatcher!
      const vib = Math.sin(animTime * 48) * (0.6 + car.rpm * 1.4 + (car.blowerActive ? 1.2 : 0));
      const bx = l0.x + 202 + vib;
      const by = l0.y + 114;
      // Ribbed blower case
      pxOutlineRect(ctx, bx + 6, by + 16, 64, 18, '#9aa6bd', '#1a1e26');
      pxRect(ctx, bx + 10, by + 19, 56, 4, '#dce5f5');
      // Chrome bugcatcher scoop hat
      pxOutlineRect(ctx, bx, by, 76, 18, '#c5d0e6', '#1a1e26');
      pxRect(ctx, bx + 4, by + 4, 68, 10, '#2b0d0b');
      // 3 Red Butterfly Valves opening wider with RPM!
      const openH = Math.max(2, Math.round(9 * (1 - car.rpm * 0.7)));
      for (let v = 0; v < 3; v++) {
        pxFillCircle(ctx, bx + 18 + v * 20, by + 9, 6, '#140808');
        pxRect(ctx, bx + 13 + v * 20, by + 9 - openH / 2, 10, openH, '#e03e2d');
      }
    }

    // Continuous Panoramic Roof Header (-320..+800)
    pxRect(ctx, l0.x - 320, -24, 1140, 42 + l0.y, '#181a20');
    pxRect(ctx, l0.x - 320, 16 + l0.y, 1140, 4, '#2d323d');

    // Left Driver Door Window Frame & Door Card (x: -275..28 in cabin space)
    // B-pillar on far left
    pxRect(ctx, l0.x - 295, 0, 38, COCKPIT_H + 20, '#191c22');
    // Driver Door Panel below window sill (y: 180..275)
    pxOutlineRect(ctx, l0.x - 265, l0.y + 180, 290, 98, '#1b1e26', '#353b47');
    pxOutlineRect(ctx, l0.x - 235, l0.y + 198, 195, 22, '#272c38', '#111317'); // Armrest
    pxText(ctx, 'DRIVER WINDOW', l0.x - 140, l0.y + 186, '#7d879c', 1, 'center');
    // Driver Side-View Mirror housing just outside left A-pillar!
    pxOutlineRect(ctx, l0.x - 26, l0.y + 134, 34, 24, '#242933', '#0e1014');
    pxOutlineRect(ctx, l0.x - 22, l0.y + 138, 26, 16, '#3e4c5e', '#788499');

    // Right Passenger Door Window Frame & Door Card (x: 452..755 in cabin space)
    pxRect(ctx, l0.x + 722, 0, 44, COCKPIT_H + 20, '#191c22');
    pxOutlineRect(ctx, l0.x + 455, l0.y + 180, 275, 98, '#1b1e26', '#353b47');
    pxOutlineRect(ctx, l0.x + 485, l0.y + 198, 195, 22, '#272c38', '#111317');
    pxText(ctx, 'PASSENGER WINDOW', l0.x + 585, l0.y + 186, '#7d879c', 1, 'center');

    // Left A-Pillar separating Driver Side Window and Windshield
    pxPoly(
      ctx,
      [
        [l0.x + 12, 16 + l0.y],
        [l0.x + 38, 16 + l0.y],
        [l0.x + 24, 182 + l0.y],
        [l0.x - 4, 182 + l0.y],
      ],
      '#1e222b'
    );
    // Right A-Pillar separating Windshield and Passenger Side Window
    pxPoly(
      ctx,
      [
        [l0.x + 442, 16 + l0.y],
        [l0.x + 468, 16 + l0.y],
        [l0.x + 484, 182 + l0.y],
        [l0.x + 456, 182 + l0.y],
      ],
      '#1e222b'
    );

    // VISIBLE ARMOR UPGRADES IN CABIN (Rollcage Tubes + Ballistic Window Louvers!)
    if (armorTier >= 1) {
      // Heavy welded steel rollcage bars + bolted gussets along A-pillars & roof!
      pxLine(ctx, l0.x + 38, l0.y + 20, l0.x + 25, l0.y + 164, '#7c879c', 6);
      pxLine(ctx, l0.x + 442, l0.y + 20, l0.x + 455, l0.y + 164, '#7c879c', 6);
      pxRect(ctx, l0.x + 36, l0.y + 18, 408, 6, '#687285');
    }
    if (armorTier >= 2) {
      // Riveted steel ballistic window armor slats across top/bottom of windshield & side windows!
      pxOutlineRect(ctx, l0.x - 255, l0.y + 20, 975, 11, '#3c4352', '#171a20');
      for (let rx = -240; rx < 710; rx += 28) {
        pxRect(ctx, l0.x + rx, l0.y + 24, 3, 3, '#9aa6bd');
      }
      pxOutlineRect(ctx, l0.x - 255, l0.y + 168, 250, 12, '#3c4352', '#171a20');
      pxOutlineRect(ctx, l0.x + 485, l0.y + 168, 235, 12, '#3c4352', '#171a20');
    }

    // Bullet impact spiderwebs on glass
    for (const cr of bulletCracks) {
      drawBulletSpiderweb(l0.x + cr.cabinX, l0.y + cr.cabinY, cr.seed);
    }

    // Top Rally Trip Bar (centered above windshield)
    const tripX = l0.x + 68;
    const tripY = l0.y + 3;
    pxOutlineRect(ctx, tripX, tripY, 188, 15, '#0e1014', '#4d5463');
    pxText(ctx, `POS ${formatOrdinal(rank)}/${totalRacers}`, tripX + 5, tripY + 4, '#ffb020', 1);
    const dispLap = Math.max(1, Math.min(totalLaps, car.lap || 1));
    pxText(ctx, `LAP ${dispLap}/${totalLaps}`, tripX + 74, tripY + 4, '#f4efe6', 1);
    pxText(ctx, `FOES:${aliveRivals}`, tripX + 183, tripY + 4, '#6be36b', 1, 'right');

    // Gunsmoke puffs
    for (const sm of smokePuffs) {
      pxFillCircle(ctx, sm.x, sm.y, sm.r, 'rgba(195, 192, 185, 0.52)');
    }

    // === LAYER 1: REALISTIC LHD DASHBOARD, GAUGE BINNACLE, CENTER H-SHIFTER, NITRO BOTTLE ===
    // Dash top pad + main fascia spanning windshield width (x: 10..470)
    pxRect(ctx, l1.x + 8, l1.y + 154, 464, 14, '#292e38');
    pxRect(ctx, l1.x + 8, l1.y + 154, 464, 2, '#4a5263');
    pxRect(ctx, l1.x + 8, l1.y + 168, 464, 114, carStats.spec.dashColor);

    // 1A. Driver Instrument Cluster Binnacle (x: 50..186, y: 146..202) - RIGHT BEHIND THE LEFT WHEEL!
    const bx = l1.x + 50;
    const by = l1.y + 146;
    pxOutlineRect(ctx, bx, by, 136, 56, '#0c0e12', '#4c5466');

    // Left Binnacle Dial: Tachometer (RPM)
    const tachX = bx + 24;
    const tachY = by + 27;
    pxFillCircle(ctx, tachX, tachY, 17, '#151820');
    pxRing(ctx, tachX, tachY, 18, 16, car.shiftLight && pulse ? '#ff4436' : '#525a6b');
    const rpmAng = Math.PI * 0.78 + car.rpm * Math.PI * 1.44;
    pxLine(ctx, tachX, tachY, tachX + Math.cos(rpmAng) * 14, tachY + Math.sin(rpmAng) * 14, '#ffb020', 2);
    pxText(ctx, 'RPM', tachX, tachY + 9, '#cbc1ab', 1, 'center');

    // Center Binnacle Digital Readout: MPH + Gear + Shift Lamp + Armor Bar
    const mph = Math.round(Math.abs(car.speed) * 3.0);
    pxText(ctx, String(mph).padStart(3, '0'), bx + 68, by + 6, '#ffb020', 2, 'center');
    pxText(ctx, 'MPH', bx + 68, by + 18, '#cbc1ab', 1, 'center');

    const gearChar = car.gear === -1 ? 'R' : car.gear === 0 ? 'N' : String(car.gear);
    pxOutlineRect(
      ctx,
      bx + 57,
      by + 25,
      22,
      16,
      car.shiftLight && pulse ? '#591c18' : '#181c24',
      car.shiftLight ? '#ff5242' : '#586175'
    );
    pxText(ctx, gearChar, bx + 68, by + 28, '#6be36b', 2, 'center');

    // Right Binnacle Section: Vehicle ARMOR Bar + Shift Alert
    pxText(
      ctx,
      car.shiftLight ? 'SHIFT!' : 'ARMOR',
      bx + 110,
      by + 8,
      car.shiftLight && pulse ? '#ff5242' : '#cbc1ab',
      1,
      'center'
    );
    pxOutlineRect(ctx, bx + 90, by + 18, 40, 10, '#08090c', '#4c5466');
    const armorFrac = Math.max(0, car.armor / Math.max(1, car.maxArmor));
    const armorCol = armorFrac > 0.5 ? '#6be36b' : armorFrac > 0.25 ? '#ffb020' : '#ff4436';
    pxRect(ctx, bx + 92, by + 20, Math.round(armorFrac * 36), 6, armorCol);
    pxText(ctx, `${Math.ceil(car.armor)}HP`, bx + 110, by + 31, armorCol, 1, 'center');

    // 1B. Center Console Sloped Bezel (x: 202..298, y: 160..268)
    pxOutlineRect(ctx, l1.x + 202, l1.y + 160, 96, 108, '#13161d', '#3e4554');

    // Car-Specific Gimmick Widget above Shifter!
    const gType = carStats.spec.gimmickType;
    if (gType === 'blower') {
      const hoverSw = !gunEquipped && inRect(p1x, p1y, GIMMICK_BTN, 3);
      pxOutlineRect(
        ctx,
        l1.x + GIMMICK_BTN.x,
        l1.y + GIMMICK_BTN.y,
        GIMMICK_BTN.w,
        GIMMICK_BTN.h,
        car.blowerActive ? '#522018' : '#1d212b',
        car.blowerActive ? '#ff7b1c' : hoverSw ? '#ffb020' : '#525a6b'
      );
      pxText(
        ctx,
        car.blowerActive ? 'BLOWER: ON' : 'BLOWER: OFF',
        l1.x + 249,
        l1.y + 168,
        car.blowerActive ? '#ffeb75' : '#f4efe6',
        1,
        'center'
      );
      // Heat bar
      pxRect(ctx, l1.x + 214, l1.y + 181, Math.round(car.blowerHeat * 70), 4, '#ff5242');
    } else if (gType === 'drift_4x') {
      // Hydraulic Drift Lever beside console + 4X badge
      const dlx = l1.x + DRIFT_LEVER.x;
      const dly = l1.y + DRIFT_LEVER.y;
      pxOutlineRect(ctx, dlx, dly, DRIFT_LEVER.w, DRIFT_LEVER.h, '#14171e', '#4c5466');
      const pullOff = car.driftHeld ? 16 : 0;
      pxOutlineRect(
        ctx,
        dlx + 3,
        dly + 6 + pullOff,
        14,
        34,
        car.driftHeld ? '#e03e2d' : '#d48a1e',
        '#ffeb75'
      );
      pxText(ctx, 'DRF', dlx + 10, dly + 54, '#ffb020', 1, 'center');

      pxOutlineRect(ctx, l1.x + 210, l1.y + 165, 78, 22, '#0e1116', '#454d5e');
      pxText(
        ctx,
        statusBanner.timer > 0 ? statusBanner.text.slice(0, 14) : '4X NITRO SPEC',
        l1.x + 249,
        l1.y + 173,
        '#ffb020',
        1,
        'center'
      );
    } else {
      // Tactical Status Readout above Shifter
      pxOutlineRect(ctx, l1.x + 210, l1.y + 165, 78, 22, '#0b0e10', '#3a4640');
      const txt =
        statusBanner.timer > 0
          ? statusBanner.text.slice(0, 15)
          : car.shiftLight
          ? 'SHIFT UP GEAR!'
          : `BOUNTY $${loadout.bountyEarned}`;
      pxText(
        ctx,
        txt,
        l1.x + 249,
        l1.y + 173,
        statusBanner.timer > 0 ? statusBanner.color : '#6be36b',
        1,
        'center'
      );
    }

    // Center 1-6 + R H-Pattern Gear Shifter
    drawHPatternShifter(l1.x, l1.y, car, carStats, p1x, p1y, gunEquipped);

    // 1C. Passenger Nitro PSI Gauge, Stack Lamps (3X or 4X) & Visible N2O Bottle Rig!
    const npx = l1.x + 306;
    const npy = l1.y + 230;
    pxOutlineRect(ctx, npx, npy, 82, 36, '#0e1015', '#424959');
    pxOutlineRect(ctx, npx + 5, npy + 5, 72, 9, '#07080a', '#525a6b');
    const psiW = Math.round((nitro.meter / 100) * 68);
    pxRect(
      ctx,
      npx + 7,
      npy + 7,
      psiW,
      5,
      nitro.lowPsiFlash > 0 ? '#ff5242' : nitro.meter >= 30 ? '#45c4d6' : '#8a6626'
    );

    const maxSt = nitro.maxStacks;
    const lampW = maxSt === 4 ? 16 : 22;
    const lampStep = maxSt === 4 ? 18 : 25;
    const stackCols = ['#ffb020', '#ff7b1c', '#ff3b2f', '#e048ff'];
    for (let s = 1; s <= maxSt; s++) {
      const lx = npx + 5 + (s - 1) * lampStep;
      const active = nitro.stacks >= s;
      pxOutlineRect(
        ctx,
        lx,
        npy + 17,
        lampW,
        14,
        active ? stackCols[s - 1] : '#1a1e26',
        active ? '#fff2b2' : '#404654'
      );
      pxText(ctx, `${s}X`, lx + lampW / 2, npy + 21, active ? '#111315' : '#6c7487', 1, 'center');
    }

    // Visible Passenger N2O Bottle Rig (x: 394..448, y: 184..266) - upgrades visibly!
    const btx = l1.x + 396;
    const bty = l1.y + 188;
    if (nitroTier === 0) {
      // Stock single blue bottle
      pxOutlineRect(ctx, btx + 12, bty + 10, 24, 62, '#24588f', '#10141c');
      pxRect(ctx, btx + 16, bty + 12, 6, 56, '#4580bf');
      pxRect(ctx, btx + 19, bty + 2, 10, 9, '#9aa4b8');
      pxText(ctx, 'N2O', btx + 24, bty + 34, '#f4efe6', 1, 'center');
    } else if (nitroTier === 1) {
      // Anodized crimson high-flow purge bottle + brass valve + braided hose
      pxLine(ctx, btx + 24, bty + 4, btx - 8, bty + 16, '#b8c2d6', 3);
      pxOutlineRect(ctx, btx + 8, bty + 6, 30, 68, '#b82824', '#141010');
      pxRect(ctx, btx + 13, bty + 8, 7, 62, '#e84c46');
      pxFillCircle(ctx, btx + 23, bty + 20, 5, '#f4efe6'); // Pressure dial
      pxText(ctx, 'PURGE', btx + 23, bty + 42, '#ffeb75', 1, 'center');
    } else {
      // Twin Gold Race N2O Rig + dual braided steel lines!
      pxLine(ctx, btx + 12, bty + 4, btx - 10, bty + 18, '#d4deed', 3);
      pxLine(ctx, btx + 36, bty + 4, btx - 10, bty + 24, '#d4deed', 3);
      for (const off of [2, 26]) {
        pxOutlineRect(ctx, btx + off, bty + 6, 22, 68, '#c99722', '#17140d');
        pxRect(ctx, btx + off + 4, bty + 8, 5, 62, '#ffe07d');
        pxRect(ctx, btx + off - 1, bty + 28, 24, 5, '#2b303b'); // Billet bracket
      }
    }

    // === LAYER 2: LEFT DRIVER STEERING WHEEL, SHORT-THROW NITRO HANDLE, SUN VISOR ===
    // Steering column shroud on left driver side
    pxOutlineRect(ctx, l2.x + 98, l2.y + 206, 40, 66, '#13161c', '#2b303d');
    const wheelHover = Math.hypot(p2x - WHEEL_HUB.x, p2y - WHEEL_HUB.y) <= WHEEL_HUB.rOuter + 5;
    drawSteeringWheel(
      WHEEL_HUB.x + l2.x,
      WHEEL_HUB.y + l2.y,
      car.wheelAngle,
      wheelHover,
      car.wheelHeld,
      gunEquipped
    );

    // Compact Short-Throw Passenger Nitro Pull-Handle (only 36px throw!)
    const ntx = NITRO_TRACK.x + l2.x;
    const ntyTop = NITRO_TRACK.yTop + l2.y;
    const ntyBot = NITRO_TRACK.yBot + l2.y;
    pxOutlineRect(ctx, ntx - 30, ntyTop - 13, 60, ntyBot - ntyTop + 26, '#13161c', '#454c5c');
    pxText(ctx, 'N2O PULL', ntx, ntyTop - 9, '#ffb020', 1, 'center');
    pxOutlineRect(ctx, ntx - 5, ntyTop, 10, ntyBot - ntyTop + 6, '#090a0d', '#3a404f');

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
        6
      );
    pxRect(ctx, ntx - 2, ntyTop + 2, 4, Math.max(3, curHandleY - ntyTop), '#adb8cc');
    pxOutlineRect(
      ctx,
      ntx - NITRO_TRACK.handleW / 2,
      curHandleY - NITRO_TRACK.handleH / 2,
      NITRO_TRACK.handleW,
      NITRO_TRACK.handleH,
      nitroTier >= 2 ? '#e0a92b' : nitro.dragging ? '#ff5242' : '#c9302c',
      handleHover || nitro.dragging ? '#ffeb75' : '#1e1010'
    );
    pxText(ctx, 'BOOST', ntx, curHandleY - 2, '#111315', 1, 'center');

    // Passenger Sun Visor Weapon Holster & Tactile Reload Rig
    drawVisorWeaponStation(
      ctx,
      VISOR_ORIGIN.x + l2.x,
      VISOR_ORIGIN.y + l2.y,
      loadout,
      p2x - VISOR_ORIGIN.x,
      p2y - VISOR_ORIGIN.y,
      activeHold,
      dragIndex,
      pulse
    );

    // Falling spent brass / dropped magazines
    for (const b of fallingBrass) {
      drawAmmoItem(ctx, b.x - 4, b.y - 10, b.gunId, b.loaderTier, true, false);
    }

    // === SCREEN-SPACE SIDE-WINDOW GLANCE CUES & COUNTDOWN ===
    if (pointer.viewYaw > -0.5 && (threatLeft || Math.abs(pointer.viewYaw) < 0.1)) {
      const alertL = threatLeft && pulse;
      pxOutlineRect(
        ctx,
        6,
        122,
        alertL ? 52 : 34,
        14,
        alertL ? 'rgba(120,24,18,0.88)' : 'rgba(15,17,22,0.72)',
        alertL ? '#ff5242' : '#4a5263'
      );
      pxText(
        ctx,
        alertL ? '< FOE A' : '< A/Q',
        alertL ? 32 : 23,
        126,
        alertL ? '#ffeb75' : '#cbc1ab',
        1,
        'center'
      );
    }
    if (pointer.viewYaw < 0.5 && (threatRight || Math.abs(pointer.viewYaw) < 0.1)) {
      const alertR = threatRight && pulse;
      const bw = alertR ? 52 : 34;
      pxOutlineRect(
        ctx,
        COCKPIT_W - bw - 6,
        122,
        bw,
        14,
        alertR ? 'rgba(120,24,18,0.88)' : 'rgba(15,17,22,0.72)',
        alertR ? '#ff5242' : '#4a5263'
      );
      pxText(
        ctx,
        alertR ? 'D FOE >' : 'D/E >',
        COCKPIT_W - bw / 2 - 6,
        126,
        alertR ? '#ffeb75' : '#cbc1ab',
        1,
        'center'
      );
    }

    if (countdownText) {
      pxOutlineRect(ctx, 184, 62, 112, 34, 'rgba(15,17,20,0.88)', '#ffb020');
      pxText(
        ctx,
        countdownText,
        240,
        70,
        countdownText === 'GO!' ? '#6be36b' : '#ffb020',
        3,
        'center'
      );
    }

    // === FOREGROUND EQUIPPED WEAPON OR RACING GLOVE ===
    if (gunEquipped) {
      drawEquippedWeaponFP(ctx, wep, pointer.x, pointer.y, COCKPIT_W, COCKPIT_H, shakeX, shakeY, animTime);
    } else {
      drawDriverHand(pointer.x, pointer.y, pointer.down && activeHold !== null, activeHold, wep);
    }
  }

  return {
    pointer,
    setStatus,
    resetCabinEffects,
    addBulletCrack,
    releaseAllHolds,
    update,
    render,
  };
}
