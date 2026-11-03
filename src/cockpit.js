import { NITRO_STAGE_COLORS } from './catalog.js';
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
  triggerHydroJump,
  triggerBackfire,
  deployTrunkHazard,
  formatOrdinal,
} from './logic.js';
import {
  pxRect,
  pxOutlineRect,
  pxLine,
  pxFillCircle,
  pxRing,
  pxPoly,
  pxText,
} from './pixel.js';
import {
  HOLSTER_LOCAL,
  POUCH_SLOTS_LOCAL_X,
  POUCH_LOCAL_Y,
  SAWED_CHAMBERS_LOCAL,
  THUMPER_CHAMBER_LOCAL,
  REV_CYLINDER_LOCAL,
  REV_EJECT_LOCAL,
  MAG_DROP_LOCAL,
  MAG_WELL_LOCAL,
  SLIDE_RACK_LOCAL,
  TUBE_GATE_LOCAL,
  DUAL_SWAP_LOCAL,
  drawAmmoItem,
  drawVisorWeaponStation,
  drawEquippedWeaponFP,
} from './weaponArt.js';

export const COCKPIT_W = 480;
export const COCKPIT_H = 270;

// Plane-local coordinates:
// 1. Windshield Plane (480 x 270)
const TRUNK_BTN = { x: 56, y: 15, w: 82, h: 29 };
const MIRROR_BEZEL = { x: 146, y: 14, w: 108, h: 30 };
const MIRROR_CUTOUT = { x: 150, y: 17, w: 100, h: 24 };
const VISOR_ORIGIN = { x: 266, y: 11 };

// 2. Dash Plane (480 x 140)
const SHIFTER_BOX = { x: 208, y: 50, w: 92, h: 78 };
const GIMMICK_BTN = { x: 208, y: 20, w: 92, h: 25 };
const DRIFT_LEVER = { x: 184, y: 34, w: 19, h: 68 };

// 3. Foreground Wheel & Pull-Handle Plane (480 x 140)
const WHEEL_HUB = { x: 114, y: 84, rOuter: 48, rInner: 36 };
const NITRO_TRACK = { x: 350, yTop: 38, yBot: 78, handleW: 54, handleH: 18 };

export function getHGateLayout(maxGears = 3, box = SHIFTER_BOX) {
  const n = Math.max(3, Math.min(8, maxGears));
  const cols = Math.ceil((n + 1) / 2);
  const padX = cols >= 5 ? 11 : 14;
  const usableW = box.w - padX * 2;
  const stepX = cols > 1 ? usableW / (cols - 1) : 0;
  const yTop = box.y + 16;
  const yMid = box.y + Math.round(box.h * 0.5);
  const yBot = box.y + box.h - 15;

  const colXs = [];
  for (let c = 0; c < cols; c++) {
    colXs.push(Math.round(box.x + padX + c * stepX));
  }

  const pockets = [];
  for (let g = 1; g <= n; g++) {
    const col = Math.floor((g - 1) / 2);
    const isTop = g % 2 === 1;
    pockets.push({
      gear: g,
      x: colXs[col],
      y: isTop ? yTop : yBot,
      label: String(g),
      col,
      isTop,
    });
  }
  pockets.push({
    gear: -1,
    x: colXs[cols - 1],
    y: yBot,
    label: 'R',
    col: cols - 1,
    isTop: false,
  });

  return { pockets, colXs, yTop, yMid, yBot, maxGears: n };
}

export function drawHGatePreviewCanvas(canvas, maxGears = 5, transTier = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;
  pxRect(ctx, 0, 0, w, h, '#0d1015');

  const box = { x: 6, y: 6, w: w - 12, h: h - 12 };
  const plateFill =
    transTier >= 3 ? '#5d6678' : transTier === 2 ? '#343b49' : transTier === 1 ? '#252a34' : '#141820';
  const plateBorder = transTier >= 3 ? '#e8b944' : '#4f586b';
  pxOutlineRect(ctx, box.x, box.y, box.w, box.h, plateFill, plateBorder);

  const layout = getHGateLayout(maxGears, box);
  pxRect(
    ctx,
    layout.colXs[0] - 2,
    layout.yMid - 2,
    layout.colXs[layout.colXs.length - 1] - layout.colXs[0] + 5,
    4,
    '#08090c'
  );
  for (let c = 0; c < layout.colXs.length; c++) {
    const cx = layout.colXs[c];
    const hasTop = layout.pockets.some((p) => p.col === c && p.isTop);
    const hasBot = layout.pockets.some((p) => p.col === c && !p.isTop);
    const y0 = hasTop ? layout.yTop : layout.yMid;
    const y1 = hasBot ? layout.yBot : layout.yMid;
    pxRect(ctx, cx - 2, y0, 4, y1 - y0 + 2, '#08090c');
  }
  for (const p of layout.pockets) {
    const ly = p.isTop ? p.y - 9 : p.y + 5;
    pxText(ctx, p.label, p.x, ly, p.gear === -1 ? '#ff7b70' : '#f4efe6', 1, 'center');
  }
  const p1 = layout.pockets[0];
  const knobCol = transTier >= 3 ? '#e8b944' : transTier >= 1 ? '#d63629' : '#3a4252';
  pxFillCircle(ctx, p1.x, p1.y, 3, '#101216');
  pxLine(ctx, p1.x, p1.y, p1.x - 2, p1.y - 8, '#adb8cc', 2);
  pxFillCircle(ctx, p1.x - 2, p1.y - 8, 4, knobCol);
}

export function createCockpitController(overlayCanvas, cabin3D, sound, callbacks) {
  overlayCanvas.width = COCKPIT_W;
  overlayCanvas.height = COCKPIT_H;
  const overlayCtx = overlayCanvas.getContext('2d');
  overlayCtx.imageSmoothingEnabled = false;

  const pointer = {
    x: COCKPIT_W * 0.48,
    y: COCKPIT_H * 0.72,
    ndcX: -0.04,
    ndcY: -0.44,
    down: false,
    panX: 0,
    panY: 0,
    viewYaw: 0,
  };

  let activeHold = null;
  let wheelGrabPrevAngle = 0;
  let shifterKnobPos = { x: 224, y: 66 };
  let shifterGrabOffset = { x: 0, y: 0 };
  let dragIndex = -1;
  let dragOrigin = { x: 0, y: 0 };

  const fallingBrass = [];
  const smokePuffs = [];
  const bulletCracks = []; // { side: 'front' | 'left' | 'right', x, y, seed }
  let statusBanner = { text: 'SHIFT GEARS TO ACCELERATE', timer: 3.5, color: '#ffb020' };
  let animTime = 0;

  function setStatus(text, color = '#ffb020', duration = 2.0) {
    statusBanner = { text, timer: duration, color };
  }

  function syncKnobToGear(gear, maxGears = 3) {
    const layout = getHGateLayout(maxGears, SHIFTER_BOX);
    const pocket = layout.pockets.find((p) => p.gear === gear);
    if (pocket) {
      shifterKnobPos.x = pocket.x;
      shifterKnobPos.y = pocket.y;
    } else {
      shifterKnobPos.x = layout.colXs[0];
      shifterKnobPos.y = layout.yMid;
    }
  }

  function resetCabinEffects(initialGear = 1, maxGears = 3) {
    bulletCracks.length = 0;
    fallingBrass.length = 0;
    smokePuffs.length = 0;
    syncKnobToGear(initialGear, maxGears);
  }

  function addBulletCrack(side = 'front') {
    if (bulletCracks.length > 16) bulletCracks.shift();
    if (side === 'left' || side === 'right') {
      bulletCracks.push({
        side,
        x: 65 + Math.random() * 240,
        y: 38 + Math.random() * 96,
        seed: Math.floor(Math.random() * 1000),
      });
    } else {
      bulletCracks.push({
        side: 'front',
        x: 72 + Math.random() * 336,
        y: 58 + Math.random() * 88,
        seed: Math.floor(Math.random() * 1000),
      });
    }
  }

  function clientToPixel(clientX, clientY) {
    const rect = overlayCanvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * COCKPIT_W;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * COCKPIT_H;
    const cx = Math.max(0, Math.min(COCKPIT_W, x));
    const cy = Math.max(0, Math.min(COCKPIT_H, y));
    return {
      x: cx,
      y: cy,
      ndcX: (cx / COCKPIT_W) * 2 - 1,
      ndcY: -((cy / COCKPIT_H) * 2 - 1),
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

  function spawnFallingItem(x, y, gunId, loaderTier, ammoTier = 0) {
    fallingBrass.push({
      x,
      y,
      vx: -22 + (Math.random() - 0.5) * 40,
      vy: -30 - Math.random() * 25,
      gunId,
      loaderTier,
      ammoTier,
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
    syncKnobToGear(car.gear, car.maxGears);
  }

  function triggerWeaponShot(wep, screenX, screenY) {
    const res = fireWeapon(wep);
    if (res.fired) {
      const suppressed =
        (wep.id === 'smg' || wep.id === 'm1911' || wep.id === 'ak_shorty') &&
        wep.stats.parts.barrel >= 3;
      sound.playWeaponFire(wep.id, suppressed);
      spawnGunSmoke(
        screenX,
        screenY + 14,
        wep.id === 'sawed_off' || wep.id === 'pump_shotgun' || wep.id === 'thumper' ? 6 : 3
      );
      const ndcX = (screenX / COCKPIT_W) * 2 - 1;
      const ndcY = -((screenY / COCKPIT_H) * 2 - 1);
      callbacks.onWeaponFired(ndcX, ndcY, wep.stats);
    } else if (res.dryFire) {
      sound.playDryFire();
      setStatus('EMPTY! RACK GUN ON VISOR', '#ff5242', 1.8);
    }
  }

  function getLayerHits(ndcX, ndcY) {
    return {
      wind: cabin3D.projectToLayer('windshield', ndcX, ndcY),
      dash: cabin3D.projectToLayer('dash', ndcX, ndcY),
      wp: cabin3D.projectToLayer('wheelPull', ndcX, ndcY),
    };
  }

  function handlePointerDown(e) {
    if (!callbacks.isInteractive()) return;
    if (e.button !== undefined && e.button !== 0) return;

    const pt = clientToPixel(e.clientX, e.clientY);
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.ndcX = pt.ndcX;
    pointer.ndcY = pt.ndcY;
    pointer.down = true;

    sound.init();

    const { car, nitro, loadout, carStats } = callbacks.getState();
    const wep = getActiveWeapon(loadout);
    const hits = getLayerHits(pt.ndcX, pt.ndcY);
    const windPt = hits.wind;
    const dashPt = hits.dash;
    const wpPt = hits.wp;

    const vLocalX = windPt ? windPt.x - VISOR_ORIGIN.x : -999;
    const vLocalY = windPt ? windPt.y - VISOR_ORIGIN.y : -999;

    // Dual-holster hot-swap tab on Iron Mule Ute
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

    // 1. If weapon is EQUIPPED, your 1 hand holds the gun!
    if (wep.mode === 'EQUIPPED') {
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

      const touchingWheel =
        wpPt && Math.hypot(wpPt.x - WHEEL_HUB.x, wpPt.y - WHEEL_HUB.y) <= WHEEL_HUB.rOuter;
      const touchingShifter = dashPt && inRect(dashPt.x, dashPt.y, SHIFTER_BOX, 4);
      if (touchingWheel || touchingShifter) {
        sound.playDryFire();
        wep.holsterAlert = 1.0;
        setStatus('HOLSTER GUN TO DRIVE!', '#ff5242', 1.6);
        return;
      }

      triggerWeaponShot(wep, pt.x, pt.y);
      return;
    }

    // 2. Hand is FREE! Check Overhead Trunk Countermeasure Switch next to Rearview Mirror
    if (windPt && inRect(windPt.x, windPt.y, TRUNK_BTN, 3)) {
      const dep = deployTrunkHazard(car, carStats);
      if (dep.deployed) {
        callbacks.onTrunkDeployed(dep.type);
      } else if (dep.reason === 'empty') {
        sound.playDryFire();
        setStatus('TRUNK EMPTY! UPGRADE AT MECHANIC', '#cbc1ab', 1.7);
      } else {
        sound.playLowPsi();
        setStatus('TRUNK RECHARGING!', '#ffb020', 1.3);
      }
      return;
    }

    // 3. Check Passenger Sun Visor Weapon & Tactile Reload Station
    if (wep.mode === 'HOLSTERED_READY') {
      if (
        wep.ammo < wep.maxAmmo &&
        vLocalX >= 74 &&
        vLocalX <= 122 &&
        vLocalY >= 0 &&
        vLocalY <= 15
      ) {
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
          wep.stats.isAuto
            ? 'HOLD CLICK: FULL-AUTO! (A/D OR Q/E)'
            : 'AIM & FIRE! (A/D PEEK, Q/E LOCK)',
          '#ffb020',
          1.9
        );
        return;
      }
    } else if (wep.mode === 'HOLSTERED_OPEN') {
      const rType = wep.stats.spec.reloadType;

      // 3A. Break-action spent hull drag-out (Sawed-Off 2-chamber or M79 Thumper 1-chamber)
      if (rType === 'break_2' || rType === 'break_1') {
        const chList = rType === 'break_1' ? [THUMPER_CHAMBER_LOCAL] : SAWED_CHAMBERS_LOCAL;
        for (let c = 0; c < chList.length; c++) {
          if (wep.chambers[c] === 'spent') {
            const ch = chList[c];
            if (Math.hypot(vLocalX - ch.x, vLocalY - ch.y) <= ch.r + 6) {
              activeHold = 'spent_hull';
              dragIndex = c;
              dragOrigin = { x: vLocalX, y: vLocalY };
              return;
            }
          }
        }
      }

      // 3B. Revolver ejector rod click
      if (rType === 'cylinder' && inRect(vLocalX, vLocalY, REV_EJECT_LOCAL, 5)) {
        if (ejectChamber(wep)) {
          sound.playShellEject();
          for (let k = 0; k < 3; k++) {
            spawnFallingItem(pt.x + k * 6, pt.y, 'revolver', 0, wep.stats.parts.ammo);
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

      // 3C. Magazine guns (M1911, SMG, Draco AK): Drop mag or Rack slide/bolt
      if (rType === 'mag_slide') {
        if (wep.reloadStage === 'mag_spent' && inRect(vLocalX, vLocalY, MAG_DROP_LOCAL, 6)) {
          dropMagazine(wep);
          sound.playShellEject();
          spawnFallingItem(pt.x, pt.y + 10, wep.id, wep.stats.parts.loader, wep.stats.parts.ammo);
          setStatus('DRAG FRESH MAG INTO GRIP', '#ffb020', 1.8);
          return;
        }
        if (wep.reloadStage === 'mag_in' && inRect(vLocalX, vLocalY, SLIDE_RACK_LOCAL, 6)) {
          activeHold = 'slide_rack';
          dragOrigin = { x: vLocalX, y: vLocalY };
          return;
        }
      }

      // 3D. Tube Pump Shotgun / Mare's Leg Lever Rifle: Rack pump or cycle lever
      if (
        (rType === 'tube_pump' || rType === 'lever_gate') &&
        wep.ammo >= 1 &&
        inRect(vLocalX, vLocalY, { x: 8, y: 6, w: 66, h: 19 }, 4)
      ) {
        activeHold = 'slide_rack';
        dragOrigin = { x: vLocalX, y: vLocalY };
        return;
      }

      // 3E. Grab fresh ammo / mag / speedloader / 40mm shell from Visor Pouch
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
            (rType === 'break_2' || rType === 'break_1') &&
            countWeaponChambers(wep, 'spent') > 0 &&
            countWeaponChambers(wep, 'empty') === 0
          ) {
            sound.playDryFire();
            setStatus('DRAG SPENT HULL OUT FIRST!', '#ff5242', 1.6);
            return;
          }
          activeHold = 'fresh_ammo';
          dragIndex = s;
          return;
        }
      }

      // 3F. Click open Break-Action / Revolver to snap shut once loaded
      if (
        (rType === 'break_2' || rType === 'break_1' || rType === 'cylinder') &&
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

    // 4. Foreground Passenger Nitro Pull-Handle (ONLY if Nitro is installed!)
    if (nitro.installed && wpPt) {
      const handleY =
        NITRO_TRACK.yTop + nitro.handlePos * (NITRO_TRACK.yBot - NITRO_TRACK.yTop);
      const handleRect = {
        x: NITRO_TRACK.x - NITRO_TRACK.handleW / 2,
        y: handleY - NITRO_TRACK.handleH / 2,
        w: NITRO_TRACK.handleW,
        h: NITRO_TRACK.handleH,
      };
      if (inRect(wpPt.x, wpPt.y, handleRect, 7)) {
        activeHold = 'nitro';
        nitro.dragging = true;
        nitro.latchedThisDrag = false;
        return;
      }
    }

    // 5. Foreground Left Driver Steering Wheel
    if (wpPt && Math.hypot(wpPt.x - WHEEL_HUB.x, wpPt.y - WHEEL_HUB.y) <= WHEEL_HUB.rOuter + 7) {
      activeHold = 'wheel';
      car.wheelHeld = true;
      wheelGrabPrevAngle = Math.atan2(wpPt.y - WHEEL_HUB.y, wpPt.x - WHEEL_HUB.x);
      return;
    }

    // 6. Dash Plane: All 8 Car Gimmicks & Dynamic 3..8-Speed H-Shifter
    if (dashPt) {
      const gType = carStats.spec.gimmickType;

      if (gType === 'drift_purple' && inRect(dashPt.x, dashPt.y, DRIFT_LEVER, 5)) {
        activeHold = 'drift';
        car.driftHeld = true;
        setStatus('DRIFT HANDBRAKE!', '#ffb020', 1.0);
        return;
      }

      if (inRect(dashPt.x, dashPt.y, GIMMICK_BTN, 4)) {
        if (gType === 'choke') {
          if (car.gimmickHeat < 0.92 || car.chokeActive) {
            car.chokeActive = !car.chokeActive;
            sound.playBreechSnap(!car.chokeActive);
            setStatus(
              car.chokeActive ? 'CHOKE SURGE ON!' : 'CHOKE OFF',
              car.chokeActive ? '#ffb020' : '#cbc1ab',
              1.5
            );
          } else {
            sound.playLowPsi();
            setStatus('ENGINE TOO HOT!', '#ff5242', 1.4);
          }
          return;
        }
        if (gType === 'vcam') {
          car.vcamActive = !car.vcamActive;
          sound.playBreechSnap(!car.vcamActive);
          setStatus(
            car.vcamActive ? 'REDLINE V-CAM ARMED!' : 'V-CAM STANDARD',
            car.vcamActive ? '#6be36b' : '#cbc1ab',
            1.5
          );
          return;
        }
        if (gType === 'hydro_jump') {
          if (triggerHydroJump(car)) {
            sound.playHydroJump();
            setStatus('HYDRO-JUMP! VAULT WRECKS!', '#ffeb75', 1.5);
          } else {
            sound.playLowPsi();
            setStatus('SHOCKS RECHARGING!', '#ffb020', 1.2);
          }
          return;
        }
        if (gType === 'blower') {
          if (car.gimmickHeat < 0.92 || car.blowerActive) {
            car.blowerActive = !car.blowerActive;
            sound.playBreechSnap(!car.blowerActive);
            setStatus(
              car.blowerActive ? 'BLOWER OVERDRIVE ON!' : 'BLOWER COOLING',
              car.blowerActive ? '#ff7b1c' : '#cbc1ab',
              1.6
            );
          } else {
            sound.playLowPsi();
            setStatus('BLOWER OVERHEATED!', '#ff5242', 1.4);
          }
          return;
        }
        if (gType === 'backfire') {
          if (triggerBackfire(car)) {
            callbacks.onRotaryBackfire();
          } else {
            sound.playLowPsi();
            setStatus('EXHAUST BUILDING FUEL...', '#ffb020', 1.2);
          }
          return;
        }
        if (gType === 'active_aero') {
          car.aeroSlipMode = !car.aeroSlipMode;
          sound.playBreechSnap(false);
          setStatus(
            car.aeroSlipMode ? 'AERO: SLIP (+TOP MPH)' : 'AERO: GRIP (+35% TURN)',
            '#6be36b',
            1.6
          );
          return;
        }
      }

      const shifterHitBox = {
        x: SHIFTER_BOX.x - 4,
        y: SHIFTER_BOX.y - 10,
        w: SHIFTER_BOX.w + 8,
        h: SHIFTER_BOX.h + 14,
      };
      if (inRect(dashPt.x, dashPt.y, shifterHitBox, 2)) {
        activeHold = 'shifter';
        const layout = getHGateLayout(carStats.maxGears, SHIFTER_BOX);
        const curPocket = layout.pockets.find((p) => p.gear === car.gear);
        const curBaseX = curPocket?.x ?? layout.colXs[0];
        const curBaseY = curPocket?.y ?? layout.yMid;
        const curKnobX =
          curBaseX - 3 + (curBaseX - (SHIFTER_BOX.x + SHIFTER_BOX.w * 0.5)) * 0.16;
        const curKnobY = curBaseY - 12;

        if (Math.hypot(dashPt.x - curKnobX, dashPt.y - curKnobY) <= 13) {
          shifterGrabOffset.x = curBaseX - dashPt.x;
          shifterGrabOffset.y = curBaseY - dashPt.y;
          shifterKnobPos.x = curBaseX;
          shifterKnobPos.y = curBaseY;
        } else {
          shifterGrabOffset.x = 0;
          shifterGrabOffset.y = 0;
          updateShifterFromPoint(dashPt.x, dashPt.y, car, carStats);
        }
      }
    }
  }

  function updateShifterFromPoint(dx, dy, car, carStats) {
    shifterKnobPos.x = Math.max(
      SHIFTER_BOX.x + 8,
      Math.min(SHIFTER_BOX.x + SHIFTER_BOX.w - 8, dx + shifterGrabOffset.x)
    );
    shifterKnobPos.y = Math.max(
      SHIFTER_BOX.y + 8,
      Math.min(SHIFTER_BOX.y + SHIFTER_BOX.h - 8, dy + shifterGrabOffset.y)
    );

    const layout = getHGateLayout(carStats.maxGears, SHIFTER_BOX);
    const snapRadius = 10.5 + (carStats.parts.trans || 0) * 2.2;

    for (const pocket of layout.pockets) {
      if (Math.hypot(shifterKnobPos.x - pocket.x, shifterKnobPos.y - pocket.y) <= snapRadius) {
        const oldGear = car.gear;
        if (shiftGear(car, pocket.gear, carStats.maxGears)) {
          sound.playGearShift(pocket.gear < oldGear);
          const lbl = pocket.gear === -1 ? 'REVERSE' : `GEAR ${pocket.gear}/${carStats.maxGears}`;
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
    pointer.ndcX = pt.ndcX;
    pointer.ndcY = pt.ndcY;

    if (!callbacks.isInteractive() || !pointer.down || !activeHold) return;

    const { car, nitro, loadout, carStats } = callbacks.getState();
    const wep = getActiveWeapon(loadout);
    const hits = getLayerHits(pt.ndcX, pt.ndcY);
    const windPt = hits.wind;
    const dashPt = hits.dash;
    const wpPt = hits.wp;

    const vLocalX = windPt ? windPt.x - VISOR_ORIGIN.x : -999;
    const vLocalY = windPt ? windPt.y - VISOR_ORIGIN.y : -999;

    if (activeHold === 'wheel' && wpPt) {
      const dx = wpPt.x - WHEEL_HUB.x;
      const dy = wpPt.y - WHEEL_HUB.y;
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
    } else if (activeHold === 'shifter' && dashPt) {
      updateShifterFromPoint(dashPt.x, dashPt.y, car, carStats);
    } else if (activeHold === 'nitro' && wpPt) {
      const norm = (wpPt.y - NITRO_TRACK.yTop) / (NITRO_TRACK.yBot - NITRO_TRACK.yTop);
      const res = updateNitroDrag(nitro, norm);
      if (res.triggered) {
        sound.playNitroTrigger(res.stacks);
        setStatus(`NITRO ${res.stageName} BOOST!`, res.stageColor, 1.6);
        activeHold = null;
      } else if (res.lowPsi) {
        sound.playLowPsi();
        setStatus('LOW NITRO PSI!', '#ff5242', 1.3);
        activeHold = null;
      }
    } else if (activeHold === 'spent_hull' && dragIndex !== -1 && windPt) {
      if (Math.hypot(vLocalX - dragOrigin.x, vLocalY - dragOrigin.y) >= 20) {
        if (ejectChamber(wep, dragIndex)) {
          sound.playShellEject();
          spawnFallingItem(pt.x, pt.y, wep.id, wep.stats.parts.loader, wep.stats.parts.ammo);
          const rem = countWeaponChambers(wep, 'spent');
          setStatus(rem > 0 ? 'PULL 2ND HULL OUT' : 'DRAG SHELL IN', '#ffb020', 1.6);
        }
        activeHold = null;
        dragIndex = -1;
      }
    } else if (activeHold === 'fresh_ammo' && dragIndex !== -1 && windPt) {
      const rType = wep.stats.spec.reloadType;
      let inDropZone = false;
      if (rType === 'break_2' || rType === 'break_1') {
        inDropZone = Math.hypot(vLocalX - 53, vLocalY - 38) <= 32;
      } else if (rType === 'cylinder') {
        inDropZone =
          Math.hypot(vLocalX - REV_CYLINDER_LOCAL.x, vLocalY - REV_CYLINDER_LOCAL.y) <= 30;
      } else if (rType === 'mag_slide') {
        inDropZone = inRect(vLocalX, vLocalY, MAG_WELL_LOCAL, 10);
      } else if (rType === 'tube_pump' || rType === 'lever_gate') {
        inDropZone = inRect(vLocalX, vLocalY, TUBE_GATE_LOCAL, 12);
      }

      if (inDropZone) {
        const res = insertAmmoFromPouch(wep, dragIndex);
        if (res.loaded) {
          sound.playShellLoad();
          if (rType === 'mag_slide') {
            setStatus(wep.id === 'm1911' ? 'RACK SLIDE >' : 'PULL BOLT >', '#6be36b', 1.8);
          } else if (rType === 'tube_pump' || rType === 'lever_gate') {
            setStatus(
              wep.ammo >= wep.maxAmmo
                ? rType === 'tube_pump'
                  ? 'FULL! RACK PUMP!'
                  : 'FULL! CYCLE LEVER!'
                : `LOADED ${wep.ammo}/${wep.maxAmmo}`,
              '#6be36b',
              1.6
            );
          } else if (wep.ammo === wep.maxAmmo) {
            setStatus('CLICK GUN TO CLOSE!', '#6be36b', 1.8);
          }
          activeHold = null;
          dragIndex = -1;
        }
      }
    } else if (activeHold === 'slide_rack' && windPt) {
      if (
        vLocalX - dragOrigin.x >= 12 ||
        Math.hypot(vLocalX - dragOrigin.x, vLocalY - dragOrigin.y) >= 15
      ) {
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

  overlayCanvas.addEventListener('pointerdown', (e) => {
    overlayCanvas.setPointerCapture?.(e.pointerId);
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
    pointer.viewYaw += (lookDirInput - pointer.viewYaw) * Math.min(1, dt * 12);

    // Full-Auto / Slam-Fire hold-click loop (never spams dry-fire when empty!)
    if (callbacks.isInteractive() && pointer.down && !activeHold) {
      const { loadout } = callbacks.getState();
      const wep = getActiveWeapon(loadout);
      if (wep.mode === 'EQUIPPED' && wep.stats.isAuto && wep.ammo > 0 && wep.fireCooldown <= 0) {
        const windPt = cabin3D.projectToLayer('windshield', pointer.ndcX, pointer.ndcY);
        const overHolster =
          windPt &&
          inRect(
            windPt.x - VISOR_ORIGIN.x,
            windPt.y - VISOR_ORIGIN.y,
            HOLSTER_LOCAL,
            6
          );
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

  function drawBulletSpiderweb(ctx, cx, cy, seed) {
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
        'rgba(220, 232, 248, 0.78)',
        1
      );
    }
    pxRing(ctx, cx, cy, 6, 5, 'rgba(200, 215, 235, 0.55)');
  }

  function paintHoodLayer(car, carStats) {
    const { ctx, width, height } = cabin3D.layers.hood;
    ctx.clearRect(0, 0, width, height);

    const hoodTilt = -(car.wheelAngle / MAX_WHEEL_RAD) * 3;
    pxPoly(
      ctx,
      [
        [18, 48 + hoodTilt],
        [width / 2, 36],
        [width - 18, 48 - hoodTilt],
        [width - 4, height],
        [4, height],
      ],
      carStats.spec.hoodColor
    );
    // Center hood crease
    pxLine(ctx, width / 2, 38, width / 2, height - 4, 'rgba(255,255,255,0.12)', 2);

    const intakeTier = carStats.parts.intake || 0;
    if (intakeTier === 1) {
      const vib = Math.sin(animTime * 42) * (0.4 + car.rpm * 0.8);
      pxOutlineRect(ctx, width / 2 - 36, 26 + vib, 72, 20, '#39404d', '#15181e');
      pxRect(ctx, width / 2 - 28, 30 + vib, 56, 7, '#1a0b0a');
      pxRect(ctx, width / 2 - 26, 31 + vib, 18, 5, '#c9302c');
      pxRect(ctx, width / 2 + 8, 31 + vib, 18, 5, '#c9302c');
    } else if (intakeTier === 2) {
      // Twin-turbo intercooler hood vents + blue blow-off caps
      for (const side of [-1, 1]) {
        const vx = width / 2 + side * 44 - 22;
        pxOutlineRect(ctx, vx, 38, 44, 18, '#232833', '#111419');
        pxFillCircle(ctx, vx + 22, 46, 5, '#2d82e6');
      }
    } else if (intakeTier >= 3) {
      const vib = Math.sin(animTime * 48) * (0.6 + car.rpm * 1.4 + (car.blowerActive ? 1.2 : 0));
      const bx = width / 2 - 42 + vib;
      const by = 6;
      pxOutlineRect(ctx, bx + 6, by + 20, 72, 24, '#9aa6bd', '#1a1e26');
      pxRect(ctx, bx + 10, by + 24, 64, 5, '#dce5f5');
      pxOutlineRect(ctx, bx, by, 84, 22, '#c5d0e6', '#1a1e26');
      pxRect(ctx, bx + 5, by + 4, 74, 13, '#2b0d0b');
      const openH = Math.max(2, Math.round(10 * (1 - car.rpm * 0.7)));
      for (let v = 0; v < 3; v++) {
        pxFillCircle(ctx, bx + 18 + v * 24, by + 10, 6, '#140808');
        pxRect(ctx, bx + 13 + v * 24, by + 10 - openH / 2, 10, openH, '#e03e2d');
      }
    }
  }

  function paintSideDoors(carStats) {
    const armorTier = carStats.parts.armor || 0;
    const { leftDoor, rightDoor } = cabin3D.layers;
    const doorCardY = 178;

    // Left Driver Door (u=1 / x=width is FRONT A-pillar & Side Mirror; u=0 / x=0 is REAR B-pillar)
    {
      const ctx = leftDoor.ctx;
      const w = leftDoor.width;
      const h = leftDoor.height;
      ctx.clearRect(0, 0, w, h);

      // Top roof rail + wide rear B-pillar + front A-pillar edge
      pxRect(ctx, 0, 0, w, 18, '#181b22');
      pxRect(ctx, 0, 0, 48, h, '#191c24');
      pxRect(ctx, 46, 18, 3, doorCardY - 18, '#2d3340');
      pxRect(ctx, w - 20, 0, 20, h, '#1e222b');

      // Lower driver door card & armrest (tucked low so side window is tall!)
      pxOutlineRect(ctx, 0, doorCardY, w, h - doorCardY, '#1b1e26', '#353b47');
      pxOutlineRect(ctx, 56, doorCardY + 18, w - 104, 22, '#272c38', '#111317');
      pxOutlineRect(ctx, w - 82, doorCardY + 10, 24, 10, '#7c8496', '#111317');
      pxText(ctx, 'DRIVER WINDOW', w / 2 + 8, doorCardY + 6, '#8d97ad', 1, 'center');

      // Exterior Driver Side-View Mirror housing (cutout x=307..355, y=139..167 reveals sideMirrorMesh!)
      pxOutlineRect(ctx, w - 82, 134, 58, 38, '#232833', '#0e1014');
      ctx.clearRect(w - 77, 139, 48, 28);
      pxOutlineRect(ctx, w - 78, 138, 50, 30, null, '#8b97ad');

      if (armorTier >= 1) {
        pxLine(ctx, 48, 18, w - 20, 18, '#7c879c', 5);
        pxLine(ctx, 48, 18, 48, doorCardY, '#7c879c', 6);
      }
      if (armorTier >= 2) {
        pxOutlineRect(ctx, 20, doorCardY + 2, w - 40, 18, '#3c4352', '#15181e');
        for (let rx = 30; rx < w - 30; rx += 24) pxRect(ctx, rx, doorCardY + 9, 3, 3, '#aebad1');
      }
      if (armorTier >= 3) {
        pxOutlineRect(ctx, 48, 20, w - 68, 12, '#3c4352', '#15181e');
        pxOutlineRect(ctx, 48, 54, w - 68, 9, '#3c4352', '#15181e');
      }

      for (const cr of bulletCracks) {
        if (cr.side === 'left') drawBulletSpiderweb(ctx, cr.x, cr.y, cr.seed);
      }
    }

    // Right Passenger Door (u=0 / x=0 is FRONT A-pillar; u=1 / x=width is REAR B-pillar)
    {
      const ctx = rightDoor.ctx;
      const w = rightDoor.width;
      const h = rightDoor.height;
      ctx.clearRect(0, 0, w, h);

      pxRect(ctx, 0, 0, w, 18, '#181b22');
      pxRect(ctx, 0, 0, 20, h, '#1e222b');
      pxRect(ctx, w - 48, 0, 48, h, '#191c24');
      pxRect(ctx, w - 49, 18, 3, doorCardY - 18, '#2d3340');

      pxOutlineRect(ctx, 0, doorCardY, w, h - doorCardY, '#1b1e26', '#353b47');
      pxOutlineRect(ctx, 48, doorCardY + 18, w - 104, 22, '#272c38', '#111317');
      pxText(ctx, 'PASSENGER WINDOW', w / 2 - 8, doorCardY + 6, '#8d97ad', 1, 'center');

      if (armorTier >= 1) {
        pxLine(ctx, 20, 18, w - 48, 18, '#7c879c', 5);
        pxLine(ctx, w - 48, 18, w - 48, doorCardY, '#7c879c', 6);
      }
      if (armorTier >= 2) {
        pxOutlineRect(ctx, 20, doorCardY + 2, w - 40, 18, '#3c4352', '#15181e');
        for (let rx = 30; rx < w - 30; rx += 24) pxRect(ctx, rx, doorCardY + 9, 3, 3, '#aebad1');
      }
      if (armorTier >= 3) {
        pxOutlineRect(ctx, 20, 20, w - 68, 12, '#3c4352', '#15181e');
        pxOutlineRect(ctx, 20, 54, w - 68, 9, '#3c4352', '#15181e');
      }

      for (const cr of bulletCracks) {
        if (cr.side === 'right') drawBulletSpiderweb(ctx, cr.x, cr.y, cr.seed);
      }
    }
  }

  function paintRearBulkhead(carStats) {
    const rearLayer = cabin3D.layers.rearWall;
    if (!rearLayer) return;
    const { ctx, width: w, height: h } = rearLayer;
    const armorTier = carStats.parts.armor || 0;

    // Fully opaque rear cabin interior (C-pillars, rear parcel deck, tinted rear glass & bucket seats)
    pxRect(ctx, 0, 0, w, h, '#14171f');
    pxRect(ctx, 0, 0, w, 24, '#181b22');
    pxRect(ctx, 0, 0, 56, h, '#191c24');
    pxRect(ctx, w - 56, 0, 56, h, '#191c24');

    // Tinted rear glass slit (with defroster lines)
    pxOutlineRect(ctx, 56, 26, w - 112, 86, '#1c2430', '#2f3645');
    for (let dy = 38; dy < 106; dy += 14) {
      pxLine(ctx, 60, dy, w - 60, dy, 'rgba(212, 155, 53, 0.22)', 1);
    }

    if (armorTier >= 1) {
      // Rear X-brace rollcage bar across rear bulkhead
      pxLine(ctx, 58, 28, w - 58, 110, '#687285', 6);
      pxLine(ctx, w - 58, 28, 58, 110, '#687285', 6);
    }

    // Rear parcel shelf & trunk firewall
    pxOutlineRect(ctx, 0, 112, w, h - 112, '#181b22', '#2f3542');

    // Driver & Passenger Racing Bucket Seatbacks + Headrests
    for (const sx of [96, w - 96]) {
      pxOutlineRect(ctx, sx - 44, 116, 88, h - 116, '#202530', '#0e1015');
      pxOutlineRect(ctx, sx - 30, 124, 60, h - 128, '#282e3b', '#14171e');
      // Headrest + harness pass-through slots
      pxOutlineRect(ctx, sx - 24, 72, 48, 48, '#232834', '#0e1015');
      pxRect(ctx, sx - 16, 102, 11, 8, '#0c0e12');
      pxRect(ctx, sx + 5, 102, 11, 8, '#0c0e12');
    }
  }

  function paintWindshieldLayer(
    car,
    loadout,
    carStats,
    rank,
    aliveRivals,
    totalRacers,
    totalLaps,
    tailgaterClose,
    windPt,
    pulse
  ) {
    const { ctx, width, height } = cabin3D.layers.windshield;
    ctx.clearRect(0, 0, width, height);

    const armorTier = carStats.parts.armor || 0;
    const wep = getActiveWeapon(loadout);
    const gunEquipped = wep.mode === 'EQUIPPED';

    // Compact Top Roof Header & Slim Angled A-Pillars (leaves ~68% windshield clear!)
    pxRect(ctx, 0, 0, width, 13, '#181a20');
    pxRect(ctx, 0, 12, width, 2, '#2d323d');

    pxPoly(
      ctx,
      [
        [0, 12],
        [24, 12],
        [14, 215],
        [0, 215],
      ],
      '#1e222b'
    );
    pxPoly(
      ctx,
      [
        [width - 24, 12],
        [width, 12],
        [width, 215],
        [width - 14, 215],
      ],
      '#1e222b'
    );

    if (armorTier >= 1) {
      pxLine(ctx, 24, 14, 14, 206, '#7c879c', 5);
      pxLine(ctx, width - 24, 14, width - 14, 206, '#7c879c', 5);
      pxRect(ctx, 22, 12, width - 44, 4, '#687285');
    }
    if (armorTier >= 3) {
      pxOutlineRect(ctx, 22, 74, width - 44, 8, '#3c4352', '#15181e');
      for (let rx = 34; rx < width - 34; rx += 32) {
        pxRect(ctx, rx, 77, 3, 3, '#9aa6bd');
      }
    }

    for (const cr of bulletCracks) {
      if (cr.side === 'front') drawBulletSpiderweb(ctx, cr.x, cr.y, cr.seed);
    }

    // Compact Top Rally Trip Bar (leaves top-left 0..52 free for corner settings cog!)
    pxOutlineRect(ctx, 56, 1, 198, 12, '#0e1014', '#4d5463');
    pxText(ctx, `POS ${formatOrdinal(rank)}/${totalRacers}`, 61, 4, '#ffb020', 1);
    const dispLap = Math.max(1, Math.min(totalLaps, car.lap || 1));
    pxText(ctx, `LAP ${dispLap}/${totalLaps}`, 132, 4, '#f4efe6', 1);
    pxText(ctx, `FOES:${aliveRivals}`, 249, 4, '#6be36b', 1, 'right');

    // Compact Overhead Trunk Countermeasure Switch beside Rearview Mirror
    const trunkType = carStats.trunkType;
    const trunkHover = !gunEquipped && windPt && inRect(windPt.x, windPt.y, TRUNK_BTN, 2);
    if (trunkType === 'none') {
      pxOutlineRect(ctx, TRUNK_BTN.x, TRUNK_BTN.y, TRUNK_BTN.w, TRUNK_BTN.h, '#14171d', '#39404f');
      pxText(ctx, 'TRUNK BAY', TRUNK_BTN.x + 41, TRUNK_BTN.y + 6, '#7d879c', 1, 'center');
      pxText(ctx, 'EMPTY', TRUNK_BTN.x + 41, TRUNK_BTN.y + 17, '#586175', 1, 'center');
    } else {
      const ready = car.trunkCooldown <= 0;
      const labels = {
        oil: 'DROP OIL',
        spikes: 'CALTROPS',
        mine: 'DROP MINE',
        napalm: 'NAPALM!',
      };
      const borderCol =
        ready && tailgaterClose && pulse
          ? '#ff5242'
          : trunkHover
          ? '#ffeb75'
          : ready
          ? '#6be36b'
          : '#ffb020';
      pxOutlineRect(
        ctx,
        TRUNK_BTN.x,
        TRUNK_BTN.y,
        TRUNK_BTN.w,
        TRUNK_BTN.h,
        ready ? '#1c291e' : '#241d17',
        borderCol
      );
      pxText(
        ctx,
        labels[trunkType] || 'DEPLOY',
        TRUNK_BTN.x + 41,
        TRUNK_BTN.y + 4,
        ready ? '#ffeb75' : '#cbc1ab',
        1,
        'center'
      );
      const frac = ready
        ? 1
        : Math.max(0, 1 - car.trunkCooldown / Math.max(0.1, car.trunkMaxCooldown));
      pxOutlineRect(ctx, TRUNK_BTN.x + 6, TRUNK_BTN.y + 14, TRUNK_BTN.w - 12, 10, '#0b0d10', '#485061');
      pxRect(
        ctx,
        TRUNK_BTN.x + 8,
        TRUNK_BTN.y + 16,
        Math.round(frac * (TRUNK_BTN.w - 16)),
        6,
        ready ? '#3bd156' : '#ffb020'
      );
      if (ready) {
        pxText(ctx, 'ARMED', TRUNK_BTN.x + 41, TRUNK_BTN.y + 16, '#0b0d10', 1, 'center');
      }
    }

    // Live 3D Rearview Mirror Bezel & Roof Mounting Stalk (cutout reveals 3D mirrorMesh!)
    pxRect(ctx, 196, 10, 8, 6, '#2d3340');
    const mirBorder = tailgaterClose && pulse ? '#ff5242' : '#586275';
    pxOutlineRect(
      ctx,
      MIRROR_BEZEL.x,
      MIRROR_BEZEL.y,
      MIRROR_BEZEL.w,
      MIRROR_BEZEL.h,
      '#161920',
      mirBorder
    );
    ctx.clearRect(MIRROR_CUTOUT.x, MIRROR_CUTOUT.y, MIRROR_CUTOUT.w, MIRROR_CUTOUT.h);
    pxOutlineRect(
      ctx,
      MIRROR_CUTOUT.x - 1,
      MIRROR_CUTOUT.y - 1,
      MIRROR_CUTOUT.w + 2,
      MIRROR_CUTOUT.h + 2,
      null,
      '#0b0d10'
    );
    if (tailgaterClose) {
      pxOutlineRect(ctx, MIRROR_BEZEL.x + 24, MIRROR_BEZEL.y + 28, 60, 10, '#3d1412', '#ff5242');
      pxText(ctx, 'TAILGATER!', MIRROR_BEZEL.x + 54, MIRROR_BEZEL.y + 31, '#ffeb75', 1, 'center');
    }

    // Passenger Sun Visor Weapon Holster & Tactile Reload Station
    const vLocalX = windPt ? windPt.x - VISOR_ORIGIN.x : -999;
    const vLocalY = windPt ? windPt.y - VISOR_ORIGIN.y : -999;
    drawVisorWeaponStation(
      ctx,
      VISOR_ORIGIN.x,
      VISOR_ORIGIN.y,
      loadout,
      vLocalX,
      vLocalY,
      activeHold,
      dragIndex,
      pulse
    );
  }

  function paintDashLayer(car, nitro, loadout, carStats, dashPt, pulse, godMode) {
    const { ctx, width, height } = cabin3D.layers.dash;
    ctx.clearRect(0, 0, width, height);

    const wep = getActiveWeapon(loadout);
    const gunEquipped = wep.mode === 'EQUIPPED';
    const dpx = dashPt ? dashPt.x : -999;
    const dpy = dashPt ? dashPt.y : -999;

    // Dashboard top pad & lower fascia
    pxRect(ctx, 6, 12, width - 12, 14, '#292e38');
    pxRect(ctx, 6, 12, width - 12, 2, '#4a5263');
    pxRect(ctx, 6, 26, width - 12, height - 26, carStats.spec.dashColor);

    // 1. Driver Instrument Cluster Binnacle (behind left wheel!)
    const bx = 46;
    const by = 4;
    pxOutlineRect(ctx, bx, by, 136, 58, '#0c0e12', '#4c5466');

    const tachX = bx + 24;
    const tachY = by + 29;
    pxFillCircle(ctx, tachX, tachY, 17, '#151820');
    pxRing(ctx, tachX, tachY, 18, 16, car.shiftLight && pulse ? '#ff4436' : '#525a6b');
    const rpmAng = Math.PI * 0.78 + car.rpm * Math.PI * 1.44;
    pxLine(
      ctx,
      tachX,
      tachY,
      tachX + Math.cos(rpmAng) * 14,
      tachY + Math.sin(rpmAng) * 14,
      '#ffb020',
      2
    );
    pxText(ctx, 'RPM', tachX, tachY + 9, '#cbc1ab', 1, 'center');

    const mph = Math.round(Math.abs(car.speed) * 3.0);
    pxText(ctx, String(mph).padStart(3, '0'), bx + 68, by + 6, '#ffb020', 2, 'center');
    pxText(ctx, 'MPH', bx + 68, by + 18, '#cbc1ab', 1, 'center');

    const gearChar = car.gear === -1 ? 'R' : car.gear === 0 ? 'N' : String(car.gear);
    pxOutlineRect(
      ctx,
      bx + 57,
      by + 26,
      22,
      16,
      car.shiftLight && pulse ? '#591c18' : '#181c24',
      car.shiftLight ? '#ff5242' : '#586175'
    );
    pxText(ctx, gearChar, bx + 68, by + 29, '#6be36b', 2, 'center');
    pxText(ctx, `/${carStats.maxGears}SPD`, bx + 68, by + 45, '#8d97ad', 1, 'center');

    pxText(
      ctx,
      car.shiftLight ? 'SHIFT!' : godMode ? 'GOD HP' : 'ARMOR',
      bx + 110,
      by + 8,
      car.shiftLight && pulse ? '#ff5242' : godMode ? '#6be36b' : '#cbc1ab',
      1,
      'center'
    );
    pxOutlineRect(ctx, bx + 90, by + 18, 40, 10, '#08090c', '#4c5466');
    const armorFrac = Math.max(0, car.armor / Math.max(1, car.maxArmor));
    const armorCol =
      godMode || armorFrac > 0.5 ? '#6be36b' : armorFrac > 0.25 ? '#ffb020' : '#ff4436';
    pxRect(ctx, bx + 92, by + 20, Math.round(armorFrac * 36), 6, armorCol);
    pxText(ctx, `${Math.ceil(car.armor)}HP`, bx + 110, by + 32, armorCol, 1, 'center');

    // 2. Center Console Sloped Bezel + All 8 Car Gimmicks + Dynamic 3..8-Speed H-Shifter
    pxOutlineRect(ctx, 202, 16, 104, 118, '#13161d', '#3e4554');

    const gType = carStats.spec.gimmickType;
    const hoverGim = !gunEquipped && inRect(dpx, dpy, GIMMICK_BTN, 2);

    if (gType === 'drift_purple') {
      pxOutlineRect(ctx, DRIFT_LEVER.x, DRIFT_LEVER.y, DRIFT_LEVER.w, DRIFT_LEVER.h, '#14171e', '#4c5466');
      const pullOff = car.driftHeld ? 16 : 0;
      pxOutlineRect(
        ctx,
        DRIFT_LEVER.x + 3,
        DRIFT_LEVER.y + 6 + pullOff,
        13,
        34,
        car.driftHeld ? '#e03e2d' : '#d48a1e',
        '#ffeb75'
      );
      pxText(ctx, 'DRF', DRIFT_LEVER.x + 10, DRIFT_LEVER.y + 54, '#ffb020', 1, 'center');
    }

    if (gType === 'choke' || gType === 'blower') {
      const isOn = gType === 'choke' ? car.chokeActive : car.blowerActive;
      const lbl = gType === 'choke' ? (isOn ? 'CHOKE: ON' : 'CHOKE: OFF') : isOn ? 'BLOWER: ON' : 'BLOWER: OFF';
      pxOutlineRect(
        ctx,
        GIMMICK_BTN.x,
        GIMMICK_BTN.y,
        GIMMICK_BTN.w,
        GIMMICK_BTN.h,
        isOn ? '#522018' : '#1d212b',
        isOn ? '#ff7b1c' : hoverGim ? '#ffb020' : '#525a6b'
      );
      pxText(ctx, lbl, GIMMICK_BTN.x + 46, GIMMICK_BTN.y + 5, isOn ? '#ffeb75' : '#f4efe6', 1, 'center');
      pxRect(
        ctx,
        GIMMICK_BTN.x + 6,
        GIMMICK_BTN.y + 17,
        Math.round(car.gimmickHeat * (GIMMICK_BTN.w - 12)),
        4,
        '#ff5242'
      );
    } else if (gType === 'vcam') {
      pxOutlineRect(
        ctx,
        GIMMICK_BTN.x,
        GIMMICK_BTN.y,
        GIMMICK_BTN.w,
        GIMMICK_BTN.h,
        car.vcamActive ? '#173020' : '#1d212b',
        car.vcamActive ? '#6be36b' : hoverGim ? '#ffb020' : '#525a6b'
      );
      pxText(
        ctx,
        car.vcamActive ? 'V-CAM: ARMED' : 'V-CAM: OFF',
        GIMMICK_BTN.x + 46,
        GIMMICK_BTN.y + 9,
        car.vcamActive ? '#6be36b' : '#f4efe6',
        1,
        'center'
      );
    } else if (gType === 'hydro_jump') {
      const ready = car.jumpCooldown <= 0 && car.jumpY <= 0.05;
      pxOutlineRect(
        ctx,
        GIMMICK_BTN.x,
        GIMMICK_BTN.y,
        GIMMICK_BTN.w,
        GIMMICK_BTN.h,
        ready ? '#332912' : '#1a1d24',
        hoverGim ? '#ffeb75' : ready ? '#ffb020' : '#485061'
      );
      pxText(
        ctx,
        ready ? 'HYDRO-JUMP!' : 'SHOCKS...',
        GIMMICK_BTN.x + 46,
        GIMMICK_BTN.y + 9,
        ready ? '#ffeb75' : '#8d97ad',
        1,
        'center'
      );
    } else if (gType === 'backfire') {
      const ready = car.backfireCooldown <= 0;
      pxOutlineRect(
        ctx,
        GIMMICK_BTN.x,
        GIMMICK_BTN.y,
        GIMMICK_BTN.w,
        GIMMICK_BTN.h,
        ready ? '#3b1822' : '#1a1d24',
        hoverGim ? '#ffeb75' : ready ? '#ff5242' : '#485061'
      );
      pxText(
        ctx,
        ready ? 'BACKFIRE!' : 'BUILDING...',
        GIMMICK_BTN.x + 46,
        GIMMICK_BTN.y + 9,
        ready ? '#ffeb75' : '#8d97ad',
        1,
        'center'
      );
    } else if (gType === 'active_aero') {
      pxOutlineRect(
        ctx,
        GIMMICK_BTN.x,
        GIMMICK_BTN.y,
        GIMMICK_BTN.w,
        GIMMICK_BTN.h,
        '#172430',
        hoverGim ? '#ffeb75' : '#6be36b'
      );
      pxText(
        ctx,
        car.aeroSlipMode ? 'AERO: SLIP' : 'AERO: GRIP',
        GIMMICK_BTN.x + 46,
        GIMMICK_BTN.y + 9,
        '#6be36b',
        1,
        'center'
      );
    } else {
      pxOutlineRect(ctx, GIMMICK_BTN.x, GIMMICK_BTN.y, GIMMICK_BTN.w, GIMMICK_BTN.h, '#0b0e10', '#3a4640');
      const txt =
        statusBanner.timer > 0
          ? statusBanner.text.slice(0, 16)
          : car.shiftLight
          ? 'SHIFT UP GEAR!'
          : `BOUNTY $${loadout.bountyEarned}`;
      pxText(
        ctx,
        txt,
        GIMMICK_BTN.x + 46,
        GIMMICK_BTN.y + 9,
        statusBanner.timer > 0 ? statusBanner.color : '#6be36b',
        1,
        'center'
      );
    }

    // Dynamic 3..8-Speed + R H-Pattern Shifter
    const transTier = carStats.parts.trans || 0;
    const plateFill =
      transTier >= 3 ? '#5d6678' : transTier === 2 ? '#343b49' : transTier === 1 ? '#252a34' : '#12151a';
    const plateBorder = transTier >= 3 ? '#e8b944' : '#4a5263';
    pxOutlineRect(
      ctx,
      SHIFTER_BOX.x,
      SHIFTER_BOX.y,
      SHIFTER_BOX.w,
      SHIFTER_BOX.h,
      plateFill,
      plateBorder
    );
    if (transTier >= 3) {
      for (const [bx2, by2] of [
        [SHIFTER_BOX.x + 3, SHIFTER_BOX.y + 3],
        [SHIFTER_BOX.x + SHIFTER_BOX.w - 5, SHIFTER_BOX.y + 3],
        [SHIFTER_BOX.x + 3, SHIFTER_BOX.y + SHIFTER_BOX.h - 5],
        [SHIFTER_BOX.x + SHIFTER_BOX.w - 5, SHIFTER_BOX.y + SHIFTER_BOX.h - 5],
      ]) {
        pxRect(ctx, bx2, by2, 2, 2, '#14171c');
      }
    }

    const layout = getHGateLayout(carStats.maxGears, SHIFTER_BOX);
    pxRect(
      ctx,
      layout.colXs[0] - 2,
      layout.yMid - 2,
      layout.colXs[layout.colXs.length - 1] - layout.colXs[0] + 5,
      5,
      '#090a0d'
    );
    for (let c = 0; c < layout.colXs.length; c++) {
      const cx = layout.colXs[c];
      const hasTop = layout.pockets.some((p) => p.col === c && p.isTop);
      const hasBot = layout.pockets.some((p) => p.col === c && !p.isTop);
      const y0 = hasTop ? layout.yTop : layout.yMid;
      const y1 = hasBot ? layout.yBot : layout.yMid;
      pxRect(ctx, cx - 2, y0, 5, y1 - y0 + 2, '#090a0d');
    }

    for (const p of layout.pockets) {
      const active = car.gear === p.gear;
      const ly = p.isTop ? p.y - 10 : p.y + 6;
      pxText(
        ctx,
        p.label,
        p.x,
        ly,
        active ? '#6be36b' : p.gear === -1 ? '#ff7b70' : '#f4efe6',
        1,
        'center'
      );
    }

    // Entire stick + rubber shift boot slides THROUGH the H-gate slot into each gear!
    const curPocket = layout.pockets.find((p) => p.gear === car.gear);
    const stickBaseX = activeHold === 'shifter' ? shifterKnobPos.x : curPocket?.x ?? layout.colXs[0];
    const stickBaseY = activeHold === 'shifter' ? shifterKnobPos.y : curPocket?.y ?? layout.yMid;
    const knobX = Math.round(
      stickBaseX - 3 + (stickBaseX - (SHIFTER_BOX.x + SHIFTER_BOX.w * 0.5)) * 0.16
    );
    const knobY = Math.round(stickBaseY - 12);

    // Rubber shift-boot collar seated directly in the active slot channel
    pxFillCircle(ctx, stickBaseX, stickBaseY, 4, '#181c24');
    pxFillCircle(ctx, stickBaseX, stickBaseY, 2, '#343b49');

    // Rigid chrome/titanium shaft rising from the slot up to the shift knob
    pxLine(ctx, stickBaseX, stickBaseY, knobX, knobY, '#14171e', 5);
    pxLine(
      ctx,
      stickBaseX,
      stickBaseY,
      knobX,
      knobY,
      transTier >= 3 ? '#f0ca62' : '#c7d2e6',
      3
    );

    const hoverKnob =
      !gunEquipped &&
      (Math.hypot(dpx - knobX, dpy - knobY) <= 12 || inRect(dpx, dpy, SHIFTER_BOX, 4));
    const knobCol =
      transTier >= 3
        ? '#e8b944'
        : transTier === 2
        ? '#f4efe6'
        : transTier === 1
        ? '#d63629'
        : '#2d3340';
    pxFillCircle(
      ctx,
      knobX,
      knobY,
      7,
      activeHold === 'shifter' || hoverKnob ? '#ffeb75' : '#0e1014'
    );
    pxFillCircle(ctx, knobX, knobY, 5, knobCol);
    pxFillCircle(ctx, knobX - 1, knobY - 2, 2, '#ffffff');

    // Status ticker banner when car uses GIMMICK_BTN for an active switch
    if (statusBanner.timer > 0 && gType !== 'dual_gun') {
      pxOutlineRect(ctx, 46, 66, 136, 14, '#0c0e12', statusBanner.color);
      pxText(ctx, statusBanner.text.slice(0, 22), 114, 70, statusBanner.color, 1, 'center');
    }

    // 3. Passenger Nitrous Bay: Empty Mount at Tier 0 vs Pure Color Stage Blocks (NO 1X/2X/3X text!)
    const nitroTier = carStats.parts.nitro || 0;
    const npx = 312;
    const npy = 88;

    if (!nitro.installed || nitroTier === 0) {
      pxOutlineRect(ctx, npx, 68, 142, 58, '#12151c', '#353c4a');
      pxRect(ctx, npx + 14, 76, 114, 6, '#232833');
      pxRect(ctx, npx + 14, 112, 114, 6, '#232833');
      pxText(ctx, 'N2O MOUNT EMPTY', npx + 71, 88, '#7d879c', 1, 'center');
      pxText(ctx, 'BUY IN MECHANIC', npx + 71, 99, '#586175', 1, 'center');
    } else {
      pxOutlineRect(ctx, npx, npy, 84, 40, '#0e1015', '#424959');
      pxOutlineRect(ctx, npx + 5, npy + 5, 74, 9, '#07080a', '#525a6b');
      const psiW = Math.round((nitro.meter / 100) * 70);
      pxRect(
        ctx,
        npx + 7,
        npy + 7,
        psiW,
        5,
        nitro.lowPsiFlash > 0 ? '#ff5242' : nitro.meter >= 30 ? '#45c4d6' : '#8a6626'
      );

      // Pure Color Boost Blocks (Green -> Blue -> Red -> Purple, ZERO numeric 1X/2X/3X text!)
      const maxSt = nitro.maxStacks;
      const gap = 3;
      const blockW = Math.floor((74 - (maxSt - 1) * gap) / maxSt);
      for (let s = 1; s <= maxSt; s++) {
        const lx = npx + 5 + (s - 1) * (blockW + gap);
        const active = nitro.stacks >= s;
        const stCol = NITRO_STAGE_COLORS[s - 1];
        pxOutlineRect(
          ctx,
          lx,
          npy + 18,
          blockW,
          15,
          active ? stCol : '#181c24',
          active ? '#ffffff' : stCol
        );
        if (active) {
          pxRect(ctx, lx + 2, npy + 20, blockW - 4, 3, 'rgba(255,255,255,0.45)');
        }
      }

      // Visible Passenger N2O Bottle(s) matching tier!
      const btx = 400;
      const bty = 48;
      if (nitroTier === 1) {
        pxOutlineRect(ctx, btx + 12, bty + 8, 24, 68, '#289c44', '#101812');
        pxRect(ctx, btx + 16, bty + 10, 6, 62, '#5ae078');
        pxRect(ctx, btx + 19, bty, 10, 9, '#9aa4b8');
        pxText(ctx, 'N2O', btx + 24, bty + 36, '#0d140e', 1, 'center');
      } else if (nitroTier === 2) {
        pxLine(ctx, btx + 23, bty + 4, btx - 8, bty + 16, '#b8c2d6', 3);
        pxOutlineRect(ctx, btx + 8, bty + 6, 30, 72, '#226bc2', '#10141c');
        pxRect(ctx, btx + 13, bty + 8, 7, 66, '#58a6ff');
        pxFillCircle(ctx, btx + 23, bty + 20, 5, '#f4efe6');
        pxText(ctx, 'PURGE', btx + 23, bty + 44, '#ffeb75', 1, 'center');
      } else {
        pxLine(ctx, btx + 12, bty + 4, btx - 10, bty + 18, '#d4deed', 3);
        pxLine(ctx, btx + 36, bty + 4, btx - 10, bty + 24, '#d4deed', 3);
        pxOutlineRect(ctx, btx + 2, bty + 6, 22, 72, '#c92a22', '#171010');
        pxRect(ctx, btx + 6, bty + 8, 5, 66, '#ff7369');
        pxOutlineRect(
          ctx,
          btx + 26,
          bty + 6,
          22,
          72,
          carStats.spec.purpleNitroCapable ? '#7d2bc9' : '#c99722',
          '#17140d'
        );
        pxRect(
          ctx,
          btx + 30,
          bty + 8,
          5,
          66,
          carStats.spec.purpleNitroCapable ? '#cf8cff' : '#ffe07d'
        );
      }
    }
  }

  function paintWheelPullLayer(car, nitro, loadout, carStats, wpPt) {
    const { ctx, width, height } = cabin3D.layers.wheelPull;
    ctx.clearRect(0, 0, width, height);

    const wep = getActiveWeapon(loadout);
    const gunEquipped = wep.mode === 'EQUIPPED';
    const wpx = wpPt ? wpPt.x : -999;
    const wpy = wpPt ? wpPt.y : -999;

    // Left Driver Steering Column & Wheel
    pxOutlineRect(ctx, WHEEL_HUB.x - 20, WHEEL_HUB.y - 6, 40, 68, '#13161c', '#2b303d');
    const wheelHover = Math.hypot(wpx - WHEEL_HUB.x, wpy - WHEEL_HUB.y) <= WHEEL_HUB.rOuter + 5;

    const cx = WHEEL_HUB.x;
    const cy = WHEEL_HUB.y;
    const ro = WHEEL_HUB.rOuter;
    const ri = WHEEL_HUB.rInner;

    pxRing(ctx, cx + 2, cy + 4, ro, ri, 'rgba(0,0,0,0.45)');
    const spokeAngles = [
      car.wheelAngle + Math.PI * 0.96,
      car.wheelAngle + Math.PI * 0.04,
      car.wheelAngle + Math.PI * 0.5,
    ];
    for (const sa of spokeAngles) {
      const sx = cx + Math.cos(sa) * (ri + 2);
      const sy = cy + Math.sin(sa) * (ri + 2);
      pxLine(ctx, cx, cy, sx, sy, '#4c525e', 7);
      pxLine(ctx, cx, cy, sx, sy, '#7c8494', 3);
      pxFillCircle(ctx, cx + Math.cos(sa) * 22, cy + Math.sin(sa) * 22, 2, '#17191d');
    }

    const rimBorder = car.wheelHeld
      ? '#ffb020'
      : wheelHover && !gunEquipped
      ? '#d9a441'
      : '#2e323b';
    pxRing(ctx, cx, cy, ro + 1, ro, rimBorder);
    pxRing(ctx, cx, cy, ro, ri, '#20232a');
    pxRing(ctx, cx, cy, ro - 2, ri + 3, '#323742');

    const topAng = car.wheelAngle - Math.PI * 0.5;
    const tx = cx + Math.cos(topAng) * ((ro + ri) * 0.5);
    const ty = cy + Math.sin(topAng) * ((ro + ri) * 0.5);
    pxFillCircle(ctx, tx, ty, 5, '#e03e2d');
    pxFillCircle(ctx, tx, ty, 2, '#ff8a7a');

    pxFillCircle(ctx, cx, cy, 12, '#191b20');
    pxFillCircle(ctx, cx, cy, 8, '#2c303a');
    pxFillCircle(ctx, cx, cy, 3, '#ffb020');

    // Foreground Passenger Short-Throw Nitro Pull-Handle (ONLY when Nitro is installed!)
    if (nitro.installed && nitro.maxStacks > 0) {
      const ntx = NITRO_TRACK.x;
      const ntyTop = NITRO_TRACK.yTop;
      const ntyBot = NITRO_TRACK.yBot;
      pxOutlineRect(ctx, ntx - 31, ntyTop - 13, 62, ntyBot - ntyTop + 26, '#13161c', '#454c5c');
      pxText(ctx, 'N2O PULL', ntx, ntyTop - 9, '#ffb020', 1, 'center');
      pxOutlineRect(ctx, ntx - 5, ntyTop, 10, ntyBot - ntyTop + 6, '#090a0d', '#3a404f');

      const curHandleY = ntyTop + nitro.handlePos * (ntyBot - ntyTop);
      const handleHover =
        !gunEquipped &&
        inRect(
          wpx,
          wpy,
          {
            x: ntx - NITRO_TRACK.handleW / 2,
            y: curHandleY - NITRO_TRACK.handleH / 2,
            w: NITRO_TRACK.handleW,
            h: NITRO_TRACK.handleH,
          },
          6
        );
      pxRect(ctx, ntx - 2, ntyTop + 2, 4, Math.max(3, curHandleY - ntyTop), '#adb8cc');

      const nextStageIdx = Math.min(
        NITRO_STAGE_COLORS.length - 1,
        Math.max(0, nitro.stacks < nitro.maxStacks ? nitro.stacks : nitro.maxStacks - 1)
      );
      const handleCol = NITRO_STAGE_COLORS[nextStageIdx];
      pxOutlineRect(
        ctx,
        ntx - NITRO_TRACK.handleW / 2,
        curHandleY - NITRO_TRACK.handleH / 2,
        NITRO_TRACK.handleW,
        NITRO_TRACK.handleH,
        handleCol,
        handleHover || nitro.dragging ? '#ffffff' : '#101216'
      );
      pxText(ctx, 'BOOST', ntx, curHandleY - 2, '#0c0e12', 1, 'center');
    }
  }

  function drawDriverHand(ctx, x, y, grabbing, holdType, wep) {
    if (holdType === 'spent_hull') {
      drawAmmoItem(
        ctx,
        x - 4,
        y - 18,
        wep.id,
        wep.stats.parts.loader,
        wep.stats.parts.ammo,
        true,
        true
      );
    } else if (holdType === 'fresh_ammo') {
      drawAmmoItem(
        ctx,
        x - 4,
        y - 20,
        wep.id,
        wep.stats.parts.loader,
        wep.stats.parts.ammo,
        false,
        true
      );
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
    countdownText,
    threatLeft,
    threatRight,
    tailgaterClose,
    lockedView,
    godMode,
    smoothRoll,
    shakeX,
    shakeY,
  }) {
    // 1. Update 3D Cabin Camera Perspective BEFORE raycasting hover coordinates
    cabin3D.updateCamera(
      pointer.viewYaw,
      pointer.panX,
      pointer.panY,
      smoothRoll,
      shakeX,
      shakeY
    );

    const pulse = Math.floor(animTime * 5.8) % 2 === 0;
    const hits = getLayerHits(pointer.ndcX, pointer.ndcY);

    // 2. Paint all 7 modular 3D cabin canvases & upload textures
    paintHoodLayer(car, carStats);
    paintSideDoors(carStats);
    paintRearBulkhead(carStats);
    paintWindshieldLayer(
      car,
      loadout,
      carStats,
      rank,
      aliveRivals,
      totalRacers,
      totalLaps,
      tailgaterClose,
      hits.wind,
      pulse
    );
    paintDashLayer(car, nitro, loadout, carStats, hits.dash, pulse, godMode);
    paintWheelPullLayer(car, nitro, loadout, carStats, hits.wp);
    cabin3D.markAllUpdated();

    // 3. Paint crisp 2D Foreground Overlay (Nitro speed lines, smoke, brass, cues, weapon/glove)
    overlayCtx.clearRect(0, 0, COCKPIT_W, COCKPIT_H);

    if (nitro.stacks > 0 && Math.abs(pointer.viewYaw) < 0.45) {
      const stageCol = NITRO_STAGE_COLORS[Math.min(NITRO_STAGE_COLORS.length - 1, nitro.stacks - 1)];
      const lineCount = nitro.stacks * 4;
      for (let i = 0; i < lineCount; i++) {
        const ang = (i * 2.399 + Math.floor(animTime * 22)) % 6.28;
        const r0 = 88 + (i % 3) * 16;
        const r1 = 155 + nitro.stacks * 24;
        const sx = 240 + Math.cos(ang) * r0;
        const sy = 96 + Math.sin(ang) * r0 * 0.55;
        const ex = 240 + Math.cos(ang) * r1;
        const ey = 96 + Math.sin(ang) * r1 * 0.55;
        if (sy < 156 && ey < 158) {
          pxLine(overlayCtx, sx, sy, ex, ey, stageCol, 1);
        }
      }
    }

    for (const sm of smokePuffs) {
      pxFillCircle(overlayCtx, sm.x, sm.y, sm.r, 'rgba(195, 192, 185, 0.52)');
    }

    for (const b of fallingBrass) {
      drawAmmoItem(overlayCtx, b.x - 4, b.y - 10, b.gunId, b.loaderTier, b.ammoTier, true, false);
    }

    // Side-window threat & Q/E lock indicators
    if (pointer.viewYaw > -0.5 && (threatLeft || Math.abs(pointer.viewYaw) < 0.12)) {
      const alertL = threatLeft && pulse;
      pxOutlineRect(
        overlayCtx,
        6,
        122,
        alertL ? 54 : 36,
        14,
        alertL ? 'rgba(120,24,18,0.88)' : 'rgba(15,17,22,0.74)',
        alertL ? '#ff5242' : '#4a5263'
      );
      pxText(
        overlayCtx,
        alertL ? '< FOE A' : '< A/Q',
        alertL ? 33 : 24,
        126,
        alertL ? '#ffeb75' : '#cbc1ab',
        1,
        'center'
      );
    }
    if (pointer.viewYaw < 0.5 && (threatRight || Math.abs(pointer.viewYaw) < 0.12)) {
      const alertR = threatRight && pulse;
      const bw = alertR ? 54 : 36;
      pxOutlineRect(
        overlayCtx,
        COCKPIT_W - bw - 6,
        122,
        bw,
        14,
        alertR ? 'rgba(120,24,18,0.88)' : 'rgba(15,17,22,0.74)',
        alertR ? '#ff5242' : '#4a5263'
      );
      pxText(
        overlayCtx,
        alertR ? 'D FOE >' : 'D/E >',
        COCKPIT_W - bw / 2 - 6,
        126,
        alertR ? '#ffeb75' : '#cbc1ab',
        1,
        'center'
      );
    }

    if (lockedView !== 0) {
      pxOutlineRect(overlayCtx, 182, 248, 116, 15, 'rgba(14,16,22,0.86)', '#ffb020');
      pxText(
        overlayCtx,
        lockedView < 0 ? 'LEFT LOCK (W FWD)' : 'RIGHT LOCK (W FWD)',
        240,
        253,
        '#ffeb75',
        1,
        'center'
      );
    }

    if (countdownText) {
      pxOutlineRect(overlayCtx, 184, 68, 112, 34, 'rgba(15,17,20,0.88)', '#ffb020');
      pxText(
        overlayCtx,
        countdownText,
        240,
        76,
        countdownText === 'GO!' ? '#6be36b' : '#ffb020',
        3,
        'center'
      );
    }

    const wep = getActiveWeapon(loadout);
    if (wep.mode === 'EQUIPPED') {
      drawEquippedWeaponFP(
        overlayCtx,
        wep,
        pointer.x,
        pointer.y,
        COCKPIT_W,
        COCKPIT_H,
        shakeX,
        shakeY,
        animTime
      );
    } else {
      drawDriverHand(
        overlayCtx,
        pointer.x,
        pointer.y,
        pointer.down && activeHold !== null,
        activeHold,
        wep
      );
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
