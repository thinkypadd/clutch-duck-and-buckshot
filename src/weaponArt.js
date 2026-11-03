import { countWeaponChambers, canFinishReload } from './logic.js';
import {
  pxRect,
  pxOutlineRect,
  pxLine,
  pxFillCircle,
  pxRing,
  pxPoly,
  pxText,
} from './pixel.js';

// Shared visor hitboxes in Visor-local coordinates (top-left = 0,0, size = 186x66)
export const VISOR_W = 186;
export const VISOR_H = 66;
export const HOLSTER_LOCAL = { x: 4, y: 8, w: 114, h: 54 };
export const POUCH_SLOTS_LOCAL_X = [126, 137, 148, 159, 170];
export const POUCH_LOCAL_Y = 14;
export const SAWED_CHAMBERS_LOCAL = [
  { x: 42, y: 38, r: 8 },
  { x: 64, y: 38, r: 8 },
];
export const THUMPER_CHAMBER_LOCAL = { x: 52, y: 38, r: 11 };
export const REV_CYLINDER_LOCAL = { x: 52, y: 38, r: 13 };
export const REV_EJECT_LOCAL = { x: 8, y: 26, w: 28, h: 16 };
export const MAG_DROP_LOCAL = { x: 64, y: 34, w: 40, h: 24 };
export const MAG_WELL_LOCAL = { x: 56, y: 22, w: 46, h: 36 };
export const SLIDE_RACK_LOCAL = { x: 14, y: 10, w: 72, h: 20 };
export const TUBE_GATE_LOCAL = { x: 38, y: 22, w: 48, h: 28 };
export const PUMP_RACK_LOCAL = { x: 10, y: 18, w: 68, h: 28 };
export const DUAL_SWAP_LOCAL = { x: 4, y: -12, w: 112, h: 12 };

function getAmmoTipColor(ammoTier) {
  if (ammoTier === 3) return '#ff5926'; // Incendiary orange-red tip
  if (ammoTier === 2) return '#42a5ff'; // Armor-Piercing tungsten-blue tip
  if (ammoTier === 1) return '#ffd24d'; // Hollow-point / Magnum brass
  return '#b88248'; // Standard lead/copper
}

export function drawAmmoItem(
  ctx,
  x,
  y,
  gunId,
  loaderTier = 0,
  ammoTier = 0,
  spent = false,
  highlight = false
) {
  const tipCol = getAmmoTipColor(ammoTier);

  if (gunId === 'sawed_off' || gunId === 'pump_shotgun') {
    if (highlight) pxRect(ctx, x - 1, y - 1, 10, 32, '#ffeb75');
    const brassCol = spent ? '#756236' : loaderTier > 0 ? '#ffd24d' : '#d9ab3b';
    const hullCol = spent
      ? '#5e2422'
      : ammoTier === 3
      ? '#e0531f'
      : ammoTier === 2
      ? '#24588f'
      : '#cf2d23';
    pxRect(ctx, x, y, 8, 9, brassCol);
    pxRect(ctx, x, y + 9, 8, 21, hullCol);
    pxRect(ctx, x + 6, y + 9, 2, 21, 'rgba(0,0,0,0.3)');
  } else if (gunId === 'thumper') {
    // Fat 40mm Grenade Cartridge!
    if (highlight) pxRect(ctx, x - 2, y, 12, 30, '#ffeb75');
    pxOutlineRect(ctx, x - 1, y + 10, 10, 19, spent ? '#756236' : '#e0b341', '#14120e');
    if (!spent) {
      pxFillCircle(ctx, x + 4, y + 9, 5, ammoTier === 3 ? '#ff4422' : ammoTier >= 1 ? '#d4a12a' : '#586e4a');
      pxRect(ctx, x + 2, y + 5, 4, 3, tipCol);
    }
  } else if (gunId === 'revolver' || gunId === 'lever_rifle') {
    if (gunId === 'revolver' && loaderTier >= 2 && !spent) {
      // 6-Shot Circular Speedloader Pod
      if (highlight) pxFillCircle(ctx, x + 4, y + 15, 8, '#ffeb75');
      pxFillCircle(ctx, x + 4, y + 15, 6, '#232730');
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        pxRect(ctx, x + 3 + Math.cos(ang) * 4, y + 14 + Math.sin(ang) * 4, 2, 2, tipCol);
      }
      pxFillCircle(ctx, x + 4, y + 15, 2, '#c9302c');
    } else {
      const h = gunId === 'lever_rifle' ? 22 : 17;
      if (highlight) pxRect(ctx, x - 1, y + 1, 9, h + 9, '#ffeb75');
      pxRect(ctx, x, y + 2, 7, h, spent ? '#756236' : '#e0b341');
      if (!spent) pxRect(ctx, x + 1, y + 2 + h, 5, 6, tipCol);
    }
  } else {
    // Magazine guns: m1911, smg, ak_shorty
    const isDrum = loaderTier >= 2;
    if (isDrum && !spent) {
      if (highlight) pxFillCircle(ctx, x + 4, y + 18, 9, '#ffeb75');
      pxFillCircle(ctx, x + 4, y + 18, 7, '#2d3340');
      pxRing(ctx, x + 4, y + 18, 7, 5, '#ffb020');
      pxRect(ctx, x + 1, y + 4, 6, 10, '#3d4452');
      pxRect(ctx, x + 2, y + 3, 4, 3, tipCol);
    } else {
      const h = loaderTier === 1 ? 34 : 26;
      if (highlight) pxRect(ctx, x - 1, y - 1, 10, h + 2, '#ffeb75');
      const magCol =
        gunId === 'ak_shorty' && !spent
          ? '#a85624' // Bakelite AK mag!
          : loaderTier >= 1 && !spent
          ? '#4b5466'
          : '#2d3340';
      pxOutlineRect(ctx, x, y, 8, h, magCol, '#101215');
      if (!spent) pxRect(ctx, x + 2, y + 1, 4, 3, tipCol);
      if (loaderTier >= 1) pxRect(ctx, x - 1, y + h - 4, 10, 4, '#ffb020');
    }
  }
}

export function drawHolsteredSideProfile(ctx, x, y, id, rawParts = {}, scale = 1) {
  const s = scale;
  const barrelTier = rawParts.barrel || 0;
  const loaderTier = rawParts.loader || 0;
  const ammoTier = rawParts.ammo || 0;
  const sightTier = rawParts.sight || 0;
  const actionTier = rawParts.action || 0;

  const gripCol = actionTier >= 1 ? '#22262e' : '#6b3e23';
  const trigCol = actionTier >= 2 ? '#ffd24d' : '#7b8496';

  if (id === 'sawed_off' || id === 'pump_shotgun') {
    const isPump = id === 'pump_shotgun';
    const bLen = ((isPump ? 66 : 56) + barrelTier * 9) * s;
    const recX = x + 72 * s;
    // Barrel
    pxOutlineRect(ctx, recX - bLen, y + 13 * s, bLen, (isPump ? 8 : 11) * s, '#232832', '#0f1115');
    pxRect(ctx, recX - bLen + 2 * s, y + 15 * s, bLen - 4 * s, 3 * s, '#5f6b80');
    // Under-barrel tube on pump shotgun
    if (isPump) {
      const tubeLen = (42 + loaderTier * 11) * s;
      pxOutlineRect(ctx, recX - tubeLen, y + 20 * s, tubeLen, 6 * s, '#3b4250', '#0f1115');
      // Pump forend
      pxOutlineRect(ctx, recX - 38 * s, y + 19 * s, 24 * s, 9 * s, gripCol, '#121418');
    } else {
      pxRect(ctx, recX - 36 * s, y + 23 * s, 28 * s, 7 * s, gripCol);
    }
    // Muzzle mod
    if (barrelTier >= 2) {
      pxOutlineRect(
        ctx,
        recX - bLen - 8 * s,
        y + 12 * s,
        9 * s,
        12 * s,
        barrelTier === 3 ? '#1a1e24' : '#9aa6bd',
        '#0f1115'
      );
    }
    // Receiver & grip
    pxOutlineRect(ctx, recX, y + 14 * s, 18 * s, 14 * s, '#464e5e', '#12151a');
    pxRect(ctx, recX + 10 * s, y + 28 * s, 3 * s, 5 * s, trigCol);
    pxPoly(
      ctx,
      [
        [recX + 15 * s, y + 18 * s],
        [recX + 36 * s, y + 32 * s],
        [recX + 30 * s, y + 45 * s],
        [recX + 11 * s, y + 29 * s],
      ],
      gripCol
    );
  } else if (id === 'm1911') {
    const slideX = x + 28 * s;
    const bExtra = barrelTier * 6 * s;
    pxOutlineRect(ctx, slideX - bExtra, y + 13 * s, 54 * s + bExtra, 12 * s, '#4c5566', '#14171d');
    pxRect(ctx, slideX - bExtra + 4 * s, y + 15 * s, 46 * s + bExtra, 3 * s, '#7b879e');
    if (barrelTier >= 2) {
      const cw = (barrelTier === 3 ? 16 : 9) * s;
      pxOutlineRect(
        ctx,
        slideX - bExtra - cw,
        y + 13 * s,
        cw + 1,
        12 * s,
        barrelTier === 3 ? '#1c2026' : '#aebad1',
        '#111317'
      );
    }
    pxRect(ctx, slideX + 14 * s, y + 24 * s, 40 * s, 6 * s, '#343b47');
    pxRect(ctx, slideX + 34 * s, y + 29 * s, 3 * s, 5 * s, trigCol);
    pxPoly(
      ctx,
      [
        [slideX + 40 * s, y + 24 * s],
        [slideX + 54 * s, y + 24 * s],
        [slideX + 61 * s, y + 45 * s],
        [slideX + 46 * s, y + 45 * s],
      ],
      gripCol
    );
    if (loaderTier === 1) {
      pxOutlineRect(ctx, slideX + 47 * s, y + 44 * s, 15 * s, 7 * s, '#ffb020', '#14171d');
    } else if (loaderTier >= 2) {
      pxFillCircle(ctx, slideX + 54 * s, y + 48 * s, 8 * s, '#2b313d');
      pxRing(ctx, slideX + 54 * s, y + 48 * s, 8 * s, 6 * s, '#ffb020');
    }
  } else if (id === 'revolver') {
    const bLen = (38 + barrelTier * 9) * s;
    const cylX = x + 62 * s;
    pxOutlineRect(ctx, cylX - bLen, y + 13 * s, bLen, 9 * s, '#748096', '#161920');
    if (barrelTier >= 1) {
      pxRect(ctx, cylX - bLen, y + 21 * s, bLen - 4 * s, 4 * s, '#4c5463');
    }
    pxOutlineRect(ctx, cylX, y + 13 * s, 20 * s, 16 * s, '#454d5c', '#14171d');
    pxRect(ctx, cylX + 14 * s, y + 29 * s, 3 * s, 5 * s, trigCol);
    pxPoly(
      ctx,
      [
        [cylX + 18 * s, y + 18 * s],
        [cylX + 31 * s, y + 22 * s],
        [cylX + 38 * s, y + 46 * s],
        [cylX + 23 * s, y + 46 * s],
      ],
      gripCol
    );
  } else if (id === 'smg' || id === 'ak_shorty') {
    const isAk = id === 'ak_shorty';
    const rx = x + 32 * s;
    pxOutlineRect(ctx, rx, y + 12 * s, 56 * s, 15 * s, isAk ? '#333842' : '#262b36', '#0e1014');
    if (isAk) {
      // Wood/poly handguard ahead of receiver
      pxOutlineRect(ctx, rx - 18 * s, y + 13 * s, 19 * s, 12 * s, gripCol, '#111317');
    }
    const muzW = (8 + barrelTier * 8) * s;
    const muzStart = isAk ? rx - 18 * s - muzW : rx - muzW;
    pxOutlineRect(
      ctx,
      muzStart,
      y + (barrelTier === 3 ? 13 : 15) * s,
      muzW + 1,
      (barrelTier === 3 ? 11 : 7) * s,
      barrelTier === 3 ? '#1a1e24' : '#6d788c',
      '#0e1014'
    );
    // Magazine: stick / banana / drum!
    if (loaderTier >= 2) {
      pxFillCircle(ctx, rx + 26 * s, y + 38 * s, 10 * s, '#2e3440');
      pxRing(ctx, rx + 26 * s, y + 38 * s, 10 * s, 8 * s, '#ffb020');
    } else {
      const mLen = (18 + loaderTier * 9) * s;
      const mCol = isAk ? '#a85624' : loaderTier === 1 ? '#c49329' : '#3a4150';
      if (isAk) {
        pxPoly(
          ctx,
          [
            [rx + 20 * s, y + 26 * s],
            [rx + 30 * s, y + 26 * s],
            [rx + 22 * s, y + 26 * s + mLen],
            [rx + 12 * s, y + 24 * s + mLen],
          ],
          mCol
        );
      } else {
        pxOutlineRect(ctx, rx + 26 * s, y + 26 * s, 10 * s, mLen, mCol, '#101216');
      }
    }
    pxRect(ctx, rx + 40 * s, y + 27 * s, 3 * s, 5 * s, trigCol);
    pxOutlineRect(ctx, rx + 44 * s, y + 26 * s, 11 * s, 18 * s, gripCol, '#101216');
  } else if (id === 'lever_rifle') {
    const recX = x + 66 * s;
    const bLen = (48 + barrelTier * 8) * s;
    const tubeLen = (32 + loaderTier * 10) * s;
    // Octagon barrel + brass magazine tube
    pxOutlineRect(ctx, recX - bLen, y + 12 * s, bLen, 7 * s, '#363d4a', '#0f1115');
    pxOutlineRect(ctx, recX - tubeLen, y + 18 * s, tubeLen, 5 * s, '#d4a12a', '#14120e');
    pxOutlineRect(ctx, recX - 28 * s, y + 17 * s, 24 * s, 8 * s, gripCol, '#121418');
    // Brass receiver + lever loop!
    pxOutlineRect(ctx, recX, y + 12 * s, 22 * s, 15 * s, '#d9ab3b', '#17140d');
    pxOutlineRect(ctx, recX + 4 * s, y + 26 * s, 16 * s, 10 * s, null, trigCol);
    pxPoly(
      ctx,
      [
        [recX + 20 * s, y + 15 * s],
        [recX + 42 * s, y + 24 * s],
        [recX + 38 * s, y + 38 * s],
        [recX + 18 * s, y + 26 * s],
      ],
      gripCol
    );
  } else if (id === 'thumper') {
    // M79 40mm Break-Action Grenade Launcher
    const recX = x + 68 * s;
    const bLen = (44 + barrelTier * 7) * s;
    pxOutlineRect(ctx, recX - bLen, y + 11 * s, bLen, 14 * s, '#3e4756', '#0e1014');
    pxRect(ctx, recX - bLen + 3 * s, y + 13 * s, bLen - 6 * s, 4 * s, '#768399');
    pxRect(ctx, recX - 32 * s, y + 24 * s, 28 * s, 7 * s, gripCol);
    pxOutlineRect(ctx, recX, y + 13 * s, 16 * s, 15 * s, '#2b313d', '#0e1014');
    pxPoly(
      ctx,
      [
        [recX + 14 * s, y + 16 * s],
        [recX + 38 * s, y + 28 * s],
        [recX + 32 * s, y + 43 * s],
        [recX + 10 * s, y + 27 * s],
      ],
      gripCol
    );
  }

  // Universal visible Sight & Laser upgrades (`sightTier`: 1=Red Laser, 2=Holo, 3=Scope+Green Laser)
  if (sightTier === 1 || sightTier >= 3) {
    const lCol = sightTier >= 3 ? '#52ff6e' : '#ff3b30';
    pxOutlineRect(ctx, x + 36 * s, y + 25 * s, 14 * s, 6 * s, '#1a1e24', lCol);
    pxRect(ctx, x + 33 * s, y + 27 * s, 3 * s, 2 * s, lCol);
  }
  if (sightTier === 2) {
    pxOutlineRect(ctx, x + 52 * s, y + 5 * s, 16 * s, 8 * s, '#181b22', '#6be36b');
    pxRect(ctx, x + 58 * s, y + 8 * s, 4 * s, 2 * s, '#6be36b');
  } else if (sightTier >= 3) {
    pxOutlineRect(ctx, x + 46 * s, y + 4 * s, 28 * s, 8 * s, '#202630', '#ffb020');
    pxRect(ctx, x + 44 * s, y + 5 * s, 3 * s, 6 * s, '#52ff6e');
  }

  // Subtle ammo payload color pip on receiver
  if (ammoTier > 0) {
    pxRect(ctx, x + 74 * s, y + 16 * s, 5 * s, 4 * s, getAmmoTipColor(ammoTier));
  }
}

export function drawGunWorkbenchPreview(
  canvas,
  gunStats,
  focusRegion = 'all',
  panX = 0,
  panY = 0
) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  pxRect(ctx, 0, 0, w, h, '#101318');
  for (let py = 8; py < h; py += 12) {
    for (let px = 8; px < w; px += 12) {
      pxRect(ctx, px, py, 2, 2, '#1d222c');
    }
  }

  const id = gunStats.spec.id;
  const parts = gunStats.parts;

  // Compute zoom scale & focal offset when inspecting an upgrade slot!
  let scale = 2;
  let drawX = 32 + panX;
  let drawY = 20 + panY;

  if (focusRegion === 'muzzle') {
    scale = 3;
    drawX = 48 + panX;
    drawY = 8 + panY;
  } else if (focusRegion === 'loader') {
    scale = 3;
    drawX = -38 + panX;
    drawY = -18 + panY;
  } else if (focusRegion === 'sight') {
    scale = 3;
    drawX = -16 + panX;
    drawY = 22 + panY;
  } else if (focusRegion === 'grip') {
    scale = 3;
    drawX = -75 + panX;
    drawY = -16 + panY;
  } else if (focusRegion === 'ammo') {
    scale = 2;
    drawX = 12 + panX;
    drawY = 20 + panY;
  }

  drawHolsteredSideProfile(ctx, Math.round(drawX), Math.round(drawY), id, parts, scale);

  // Cartridge inspection stand on right
  const ammoScale = focusRegion === 'ammo' ? 2 : 1;
  ctx.save();
  if (ammoScale > 1) {
    ctx.translate(w - 64, 10);
    ctx.scale(2, 2);
    drawAmmoItem(ctx, 0, 0, id, parts.loader, parts.ammo, false, true);
  } else {
    drawAmmoItem(ctx, w - 34, 24, id, parts.loader, parts.ammo, false, false);
  }
  ctx.restore();

  pxOutlineRect(ctx, 2, 2, w - 4, h - 4, null, '#485061');
  const regionTag = focusRegion === 'all' ? 'DRAG TO PAN' : `ZOOM: ${focusRegion.toUpperCase()}`;
  pxText(ctx, regionTag, 8, h - 11, '#cbc1ab', 1);
  pxText(ctx, `${gunStats.capacity} RD`, w - 8, h - 11, '#ffb020', 1, 'right');
}

export function renderWallGunPlaque(canvas, gunStats, owned, statusText, isSelected) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  pxOutlineRect(
    ctx,
    0,
    0,
    w,
    h,
    isSelected ? '#2c2416' : '#161a22',
    isSelected ? '#ffb020' : owned ? '#6be36b' : '#586278'
  );
  pxOutlineRect(
    ctx,
    3,
    3,
    w - 6,
    h - 6,
    null,
    isSelected ? '#ffdf85' : '#2a303d'
  );

  // Top title header bar (2x bold pixel font for instant wall readability!)
  pxRect(ctx, 4, 4, w - 8, 19, isSelected ? '#3d3018' : '#0f1218');
  pxText(
    ctx,
    gunStats.spec.name.slice(0, 15),
    w / 2,
    8,
    isSelected ? '#ffeb75' : '#f4efe6',
    2,
    'center'
  );

  // Pegboard grid dots & steel hooks
  for (let py = 30; py < h - 28; py += 14) {
    for (let px = 16; px < w - 16; px += 16) {
      pxRect(ctx, px, py, 2, 2, '#282f3d');
    }
  }
  pxRect(ctx, 56, 26, 6, 12, '#8b95a8');
  pxRect(ctx, w - 66, 26, 6, 12, '#8b95a8');

  drawHolsteredSideProfile(ctx, 32, 24, gunStats.spec.id, gunStats.parts, 2);

  // Bottom status / price bar (2x bold pixel font)
  pxRect(ctx, 4, h - 22, w - 8, 18, '#0c0e13');
  pxText(
    ctx,
    statusText,
    w / 2,
    h - 18,
    isSelected ? '#ffeb75' : owned ? '#6be36b' : '#ffb020',
    2,
    'center'
  );
}

export function drawVisorWeaponStation(
  ctx,
  vx,
  vy,
  loadout,
  localPx,
  localPy,
  activeHold,
  dragIndex,
  pulse
) {
  const wep = loadout.weapons[loadout.activeSlot];
  const id = wep.id;
  const parts = wep.stats.parts;
  const rType = wep.stats.spec.reloadType;

  // Dual holster swap tab on Iron Mule Ute
  if (loadout.weapons.length > 1) {
    const other = loadout.weapons[loadout.activeSlot === 0 ? 1 : 0];
    const swapHover =
      localPx >= DUAL_SWAP_LOCAL.x &&
      localPx <= DUAL_SWAP_LOCAL.x + DUAL_SWAP_LOCAL.w &&
      localPy >= DUAL_SWAP_LOCAL.y &&
      localPy <= DUAL_SWAP_LOCAL.y + DUAL_SWAP_LOCAL.h + 2;
    pxOutlineRect(
      ctx,
      vx + DUAL_SWAP_LOCAL.x,
      vy + DUAL_SWAP_LOCAL.y,
      DUAL_SWAP_LOCAL.w,
      13,
      swapHover ? '#38301e' : '#1b1e25',
      '#ffb020'
    );
    pxText(
      ctx,
      `SWAP:${other.stats.spec.name.slice(0, 8)}(${other.ammo})`,
      vx + 60,
      vy - 9,
      '#ffb020',
      1,
      'center'
    );
  }

  // Sun visor canvas body
  pxRect(ctx, vx + 22, vy - 8, 9, 10, '#3a3f47');
  pxRect(ctx, vx + 150, vy - 8, 9, 10, '#3a3f47');
  pxOutlineRect(ctx, vx, vy, VISOR_W, VISOR_H, '#3b352c', '#171512');
  pxRect(ctx, vx + 3, vy + 3, VISOR_W - 6, VISOR_H - 6, '#453e33');

  // Right-side Visor Ammo Rig / Pouch
  pxOutlineRect(ctx, vx + 122, vy + 7, 58, 52, '#261f19', '#14100d');
  const needFresh =
    wep.mode === 'HOLSTERED_OPEN' &&
    ((rType === 'mag_slide' && wep.reloadStage === 'mag_out') ||
      ((rType === 'break_2' || rType === 'break_1') && countWeaponChambers(wep, 'empty') > 0) ||
      (rType === 'cylinder' &&
        countWeaponChambers(wep, 'spent') === 0 &&
        countWeaponChambers(wep, 'empty') > 0) ||
      ((rType === 'tube_pump' || rType === 'lever_gate') && wep.ammo < wep.maxAmmo));

  for (let i = 0; i < POUCH_SLOTS_LOCAL_X.length; i++) {
    const sx = vx + POUCH_SLOTS_LOCAL_X[i];
    const sy = vy + POUCH_LOCAL_Y;
    const avail = wep.pouchSlots[i] && !(activeHold === 'fresh_ammo' && dragIndex === i);
    if (avail) {
      const slotHover =
        wep.mode === 'HOLSTERED_OPEN' &&
        localPx >= POUCH_SLOTS_LOCAL_X[i] - 2 &&
        localPx <= POUCH_SLOTS_LOCAL_X[i] + 10 &&
        localPy >= POUCH_LOCAL_Y - 2 &&
        localPy <= POUCH_LOCAL_Y + 38;
      drawAmmoItem(
        ctx,
        sx,
        sy,
        id,
        parts.loader,
        parts.ammo,
        false,
        (needFresh && pulse) || slotHover
      );
    } else {
      pxOutlineRect(ctx, sx, sy + 4, 8, 24, '#181410', '#362c22');
    }
    pxRect(ctx, sx - 1, sy + 13, 10, 6, '#5c432d');
  }

  const hx = vx + HOLSTER_LOCAL.x;
  const hy = vy + HOLSTER_LOCAL.y;
  pxRect(ctx, hx + 18, hy + 4, 6, 36, '#22252b');
  pxRect(ctx, hx + 72, hy + 4, 6, 36, '#22252b');

  if (wep.mode === 'HOLSTERED_READY') {
    const hover =
      localPx >= HOLSTER_LOCAL.x &&
      localPx <= HOLSTER_LOCAL.x + HOLSTER_LOCAL.w &&
      localPy >= HOLSTER_LOCAL.y &&
      localPy <= HOLSTER_LOCAL.y + HOLSTER_LOCAL.h;
    if (hover) {
      pxOutlineRect(ctx, hx, hy, HOLSTER_LOCAL.w, HOLSTER_LOCAL.h - 2, null, '#ffb020');
    }
    drawHolsteredSideProfile(ctx, hx + 2, hy - 2, id, parts, 1);
    pxText(
      ctx,
      hover ? 'CLICK: DRAW GUN' : `${wep.ammo}/${wep.maxAmmo} READY`,
      hx + 57,
      hy + 44,
      hover ? '#ffb020' : '#f4efe6',
      1,
      'center'
    );
    if (wep.ammo < wep.maxAmmo) {
      pxOutlineRect(ctx, vx + 78, vy + 2, 42, 11, '#232730', '#ffb020');
      pxText(ctx, 'RELOAD', vx + 99, vy + 5, '#ffb020', 1, 'center');
    }
  } else if (wep.mode === 'EQUIPPED') {
    const empty = wep.ammo === 0;
    const hover =
      localPx >= HOLSTER_LOCAL.x - 4 &&
      localPx <= HOLSTER_LOCAL.x + HOLSTER_LOCAL.w + 4 &&
      localPy >= HOLSTER_LOCAL.y - 4 &&
      localPy <= HOLSTER_LOCAL.y + HOLSTER_LOCAL.h + 4;
    const col = empty && pulse ? '#ff5242' : hover || empty ? '#ffb020' : '#7b8496';
    pxOutlineRect(ctx, hx, hy + 2, HOLSTER_LOCAL.w, HOLSTER_LOCAL.h - 6, 'rgba(14,16,20,0.65)', col);
    pxText(
      ctx,
      empty ? 'EMPTY! CLICK RACK' : 'CLICK TO HOLSTER',
      hx + 57,
      hy + 18,
      empty ? '#ffeb75' : '#f4efe6',
      1,
      'center'
    );
    pxText(ctx, empty ? 'TO RELOAD' : 'FREE YOUR HAND', hx + 57, hy + 30, col, 1, 'center');
  } else if (wep.mode === 'HOLSTERED_OPEN') {
    if (rType === 'break_2' || rType === 'break_1') {
      const snapOk = canFinishReload(wep);
      const isSingle40mm = rType === 'break_1';
      pxOutlineRect(ctx, vx + 26, vy + 22, 54, 28, '#2c313b', snapOk ? '#6be36b' : '#ffb020');

      const chList = isSingle40mm ? [THUMPER_CHAMBER_LOCAL] : SAWED_CHAMBERS_LOCAL;
      for (let c = 0; c < chList.length; c++) {
        const cx = vx + chList[c].x;
        const cy = vy + chList[c].y;
        const r = chList[c].r;
        const st = wep.chambers[c];
        pxFillCircle(ctx, cx, cy, r + 1, '#101215');
        if (st === 'spent' && !(activeHold === 'spent_hull' && dragIndex === c)) {
          pxFillCircle(ctx, cx, cy, r + 2, pulse ? '#ffeb75' : '#ffb020');
          pxFillCircle(ctx, cx, cy, r - 1, '#8c7238');
        } else if (st === 'empty') {
          pxRing(ctx, cx, cy, r + 1, r - 1, pulse ? '#6be36b' : '#3a8c4a');
        } else if (st === 'live') {
          pxFillCircle(ctx, cx, cy, r, isSingle40mm ? '#586e4a' : '#d62e24');
          pxFillCircle(ctx, cx, cy, r - 3, '#ffd24d');
        }
      }
      const msg =
        countWeaponChambers(wep, 'spent') > 0
          ? 'DRAG HULL OUT'
          : snapOk
          ? 'CLICK TO SNAP!'
          : 'DRAG SHELL IN';
      pxOutlineRect(ctx, vx + 16, vy + 53, 92, 11, '#111317', snapOk ? '#6be36b' : '#ffb020');
      pxText(ctx, msg, vx + 62, vy + 56, snapOk ? '#6be36b' : '#ffeb75', 1, 'center');
    } else if (rType === 'cylinder') {
      const hasSpent = countWeaponChambers(wep, 'spent') > 0;
      const snapOk = canFinishReload(wep);
      const ejX = vx + REV_EJECT_LOCAL.x;
      const ejY = vy + REV_EJECT_LOCAL.y;
      pxOutlineRect(
        ctx,
        ejX,
        ejY,
        REV_EJECT_LOCAL.w,
        REV_EJECT_LOCAL.h,
        hasSpent ? '#4a241c' : '#1e2229',
        hasSpent && pulse ? '#ffeb75' : '#ffb020'
      );
      pxText(ctx, 'EJECT', ejX + 14, ejY + 5, hasSpent ? '#ffeb75' : '#6c7487', 1, 'center');

      const ccx = vx + REV_CYLINDER_LOCAL.x;
      const ccy = vy + REV_CYLINDER_LOCAL.y;
      pxFillCircle(ctx, ccx, ccy, 15, '#3b4250');
      pxRing(ctx, ccx, ccy, 15, 13, snapOk ? '#6be36b' : '#ffb020');
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const st = wep.chambers[i];
        pxFillCircle(
          ctx,
          ccx + Math.cos(ang) * 8.5,
          ccy + Math.sin(ang) * 8.5,
          3.2,
          st === 'live' ? '#ffd24d' : st === 'spent' ? '#7a3329' : '#0d0f13'
        );
      }
      const msg = hasSpent
        ? 'CLICK EJECT ROD'
        : countWeaponChambers(wep, 'live') === 6
        ? 'CLICK CYLINDER!'
        : wep.stats.hasSpeedloader
        ? 'DRAG SPEEDLOADER'
        : 'DRAG ROUNDS IN';
      pxOutlineRect(ctx, vx + 14, vy + 54, 96, 11, '#111317', snapOk ? '#6be36b' : '#ffb020');
      pxText(ctx, msg, vx + 62, vy + 57, snapOk ? '#6be36b' : '#ffeb75', 1, 'center');
    } else if (rType === 'mag_slide') {
      const stg = wep.reloadStage;
      drawHolsteredSideProfile(ctx, hx + 2, hy - 2, id, parts, 1);
      if (stg === 'mag_spent') {
        const mx = vx + MAG_DROP_LOCAL.x;
        const my = vy + MAG_DROP_LOCAL.y;
        pxOutlineRect(ctx, mx, my, MAG_DROP_LOCAL.w, MAG_DROP_LOCAL.h, 'rgba(90,28,24,0.88)', '#ff5242');
        pxText(ctx, 'DROP', mx + 20, my + 4, '#ffeb75', 1, 'center');
        pxText(ctx, 'MAG', mx + 20, my + 12, '#ffeb75', 1, 'center');
      } else if (stg === 'mag_out') {
        const wx = vx + MAG_WELL_LOCAL.x;
        const wy = vy + MAG_WELL_LOCAL.y;
        pxOutlineRect(ctx, wx, wy, MAG_WELL_LOCAL.w, MAG_WELL_LOCAL.h, null, pulse ? '#6be36b' : '#ffb020');
        pxOutlineRect(ctx, vx + 14, vy + 53, 94, 11, '#111317', '#ffb020');
        pxText(ctx, 'DRAG MAG HERE', vx + 61, vy + 56, '#ffeb75', 1, 'center');
      } else if (stg === 'mag_in') {
        const sx = vx + SLIDE_RACK_LOCAL.x;
        const sy = vy + SLIDE_RACK_LOCAL.y;
        pxOutlineRect(ctx, sx, sy, SLIDE_RACK_LOCAL.w, SLIDE_RACK_LOCAL.h, 'rgba(32,74,42,0.85)', '#6be36b');
        pxText(
          ctx,
          id === 'm1911' ? 'RACK SLIDE >' : 'PULL BOLT >',
          sx + 36,
          sy + 7,
          '#ffffff',
          1,
          'center'
        );
      }
    } else if (rType === 'tube_pump' || rType === 'lever_gate') {
      drawHolsteredSideProfile(ctx, hx + 2, hy - 2, id, parts, 1);
      const full = wep.ammo >= wep.maxAmmo;
      if (!full) {
        pxOutlineRect(
          ctx,
          vx + TUBE_GATE_LOCAL.x,
          vy + TUBE_GATE_LOCAL.y,
          TUBE_GATE_LOCAL.w,
          TUBE_GATE_LOCAL.h,
          'rgba(40,48,32,0.65)',
          pulse ? '#ffeb75' : '#ffb020'
        );
      }
      if (wep.ammo >= 1) {
        pxOutlineRect(
          ctx,
          vx + 10,
          vy + 8,
          62,
          14,
          'rgba(32,74,42,0.88)',
          '#6be36b'
        );
        pxText(
          ctx,
          rType === 'tube_pump' ? 'RACK PUMP!' : 'CYCLE LEVER!',
          vx + 41,
          vy + 12,
          '#ffffff',
          1,
          'center'
        );
      }
      pxOutlineRect(ctx, vx + 14, vy + 53, 96, 11, '#111317', full ? '#6be36b' : '#ffb020');
      pxText(
        ctx,
        full ? `FULL ${wep.ammo}/${wep.maxAmmo}: RACK!` : `LOAD ${wep.ammo}/${wep.maxAmmo} IN GATE`,
        vx + 62,
        vy + 56,
        full ? '#6be36b' : '#ffeb75',
        1,
        'center'
      );
    }
  }
}

export function drawEquippedWeaponFP(
  ctx,
  wep,
  pointerX,
  pointerY,
  screenW,
  screenH,
  shakeX,
  shakeY,
  animTime,
  overHolster
) {
  const aimX = Math.max(20, Math.min(screenW - 20, pointerX));
  const aimY = Math.max(18, Math.min(screenH - 36, pointerY));
  const parts = wep.stats.parts;
  const id = wep.id;

  const recoilKick = wep.recoil * (id === 'smg' ? 10 : id === 'm1911' ? 14 : 21);
  const pivotX = screenW * 0.62 + (aimX - screenW * 0.5) * 0.36 + shakeX + recoilKick * 0.35;
  const pivotY = screenH + 8 + recoilKick;

  const dx = aimX - pivotX;
  const dy = aimY - pivotY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const baseLen = id === 'm1911' ? 76 : id === 'smg' ? 82 : id === 'lever_rifle' ? 102 : 92;
  const barrelLen = baseLen + (parts.barrel || 0) * 7 - wep.recoil * 8;
  const muzzleX = pivotX + ux * barrelLen;
  const muzzleY = pivotY + uy * barrelLen;

  // Laser sight beam (Red for T1, Green for T3!)
  if (wep.stats.laserColor && !overHolster && wep.ammo > 0) {
    pxLine(ctx, muzzleX, muzzleY, aimX, aimY, wep.stats.laserColor, 1);
    pxFillCircle(ctx, aimX, aimY, 2, wep.stats.laserColor);
  }

  // Muzzle flash (fiery crimson-orange when Incendiary ammo equipped!)
  if (wep.muzzleFlash > 0.05) {
    const fr =
      (id === 'thumper' || id === 'sawed_off' || id === 'pump_shotgun' ? 23 : 16) *
      wep.muzzleFlash;
    pxFillCircle(ctx, muzzleX, muzzleY, fr * 1.2, wep.stats.incendiary ? '#ff3b14' : '#ff7b1c');
    pxFillCircle(ctx, muzzleX, muzzleY, fr * 0.8, '#ffe875');
    pxFillCircle(ctx, muzzleX, muzzleY, fr * 0.4, '#ffffff');
    for (let s = 0; s < 5; s++) {
      const sa = (s / 5) * Math.PI * 2 + animTime * 14;
      pxLine(
        ctx,
        muzzleX,
        muzzleY,
        muzzleX + Math.cos(sa) * fr * 1.6,
        muzzleY + Math.sin(sa) * fr * 1.6,
        '#ffd24d',
        2
      );
    }
  }

  // Grip & gloved hand
  const gripCol = (parts.action || 0) >= 1 ? '#22262e' : '#54331d';
  pxLine(ctx, pivotX - ux * 16, pivotY - uy * 16, pivotX + ux * 22, pivotY + uy * 22, gripCol, 16);
  pxFillCircle(ctx, pivotX + ux * 15 - nx * 3, pivotY + uy * 15 - ny * 3, 12, '#232730');
  pxFillCircle(ctx, pivotX + ux * 15 - nx * 3, pivotY + uy * 15 - ny * 3, 9, '#393f4d');

  if (id === 'sawed_off') {
    for (const side of [-1, 1]) {
      const bx0 = pivotX + ux * 18 + nx * 7 * side;
      const by0 = pivotY + uy * 18 + ny * 7 * side;
      const bx1 = muzzleX + nx * 5 * side;
      const by1 = muzzleY + ny * 5 * side;
      pxLine(ctx, bx0, by0, bx1, by1, '#1e2229', 10);
      pxLine(ctx, bx0, by0, bx1, by1, (parts.barrel || 0) >= 2 ? '#8591a6' : '#4f5869', 5);
    }
  } else if (id === 'thumper') {
    const bx0 = pivotX + ux * 16;
    const by0 = pivotY + uy * 16;
    pxLine(ctx, bx0, by0, muzzleX, muzzleY, '#222730', 18);
    pxLine(ctx, bx0, by0, muzzleX, muzzleY, '#5b677a', 11);
    pxFillCircle(ctx, muzzleX, muzzleY, 6, '#0c0d10');
  } else if (id === 'lever_rifle' || id === 'pump_shotgun') {
    const bx0 = pivotX + ux * 16;
    const by0 = pivotY + uy * 16;
    pxLine(ctx, bx0, by0, muzzleX, muzzleY, '#232833', 12);
    pxLine(
      ctx,
      bx0,
      by0,
      muzzleX,
      muzzleY,
      id === 'lever_rifle' ? '#d4a12a' : '#657085',
      6
    );
  } else if (id === 'revolver') {
    const cylX = pivotX + ux * 28;
    const cylY = pivotY + uy * 28;
    pxFillCircle(ctx, cylX, cylY, 11, '#3b4252');
    pxFillCircle(ctx, cylX, cylY, 8, '#5f6a80');
    pxLine(ctx, cylX, cylY, muzzleX, muzzleY, '#262b36', 9);
    pxLine(ctx, cylX, cylY, muzzleX, muzzleY, '#8b97ad', 5);
  } else {
    // m1911, smg, ak_shorty
    const bx0 = pivotX + ux * 14;
    const by0 = pivotY + uy * 14;
    const thick = id === 'm1911' ? 12 : 15;
    pxLine(ctx, bx0, by0, muzzleX, muzzleY, '#1d2129', thick);
    pxLine(
      ctx,
      bx0,
      by0,
      muzzleX,
      muzzleY,
      (parts.barrel || 0) === 3 ? '#2c323d' : '#647085',
      thick - 5
    );
    if ((parts.loader || 0) >= 2) {
      pxFillCircle(ctx, pivotX + ux * 32 - nx * 12, pivotY + uy * 32 - ny * 12, 9, '#ffb020');
    } else if (id !== 'm1911') {
      const mCol = id === 'ak_shorty' ? '#a85624' : '#3a4150';
      pxLine(
        ctx,
        pivotX + ux * 32,
        pivotY + uy * 32,
        pivotX + ux * 32 - nx * 20,
        pivotY + uy * 32 - ny * 20,
        mCol,
        7
      );
    }
  }

  if ((parts.sight || 0) >= 2) {
    const ox = pivotX + ux * 40;
    const oy = pivotY + uy * 40;
    pxOutlineRect(ctx, ox - 7, oy - 13, 14, 10, 'rgba(20,30,24,0.65)', '#6be36b');
  }

  if (!overHolster) {
    const retCol =
      wep.ammo > 0 ? ((parts.sight || 0) > 0 ? '#6be36b' : '#ffb020') : '#ff5242';
    const r = id === 'sawed_off' || id === 'pump_shotgun' || id === 'thumper' ? 14 : 9;
    pxLine(ctx, pointerX - r, pointerY - 3, pointerX - r, pointerY + 3, retCol, 2);
    pxLine(ctx, pointerX + r, pointerY - 3, pointerX + r, pointerY + 3, retCol, 2);
    pxLine(ctx, pointerX - 3, pointerY - r, pointerX + 3, pointerY - r, retCol, 2);
    pxLine(ctx, pointerX - 3, pointerY + r, pointerX + 3, pointerY + r, retCol, 2);
    pxRect(ctx, pointerX - 1, pointerY - 1, 2, 2, '#fff4cc');
    pxText(
      ctx,
      wep.ammo > 0 ? `${wep.ammo}/${wep.maxAmmo}` : 'EMPTY',
      pointerX,
      pointerY + r + 4,
      retCol,
      1,
      'center'
    );
  } else {
    pxOutlineRect(ctx, pointerX - 16, pointerY - 8, 32, 13, '#141619', '#ffb020');
    pxText(ctx, 'RACK', pointerX, pointerY - 4, '#ffb020', 1, 'center');
  }
}
