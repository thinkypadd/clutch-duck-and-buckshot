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

// Shared visor hitboxes in Visor-local coordinates (top-left of visor = 0,0, size = 186x66)
export const VISOR_W = 186;
export const VISOR_H = 66;
export const HOLSTER_LOCAL = { x: 4, y: 8, w: 114, h: 54 };
export const POUCH_SLOTS_LOCAL_X = [126, 137, 148, 159, 170];
export const POUCH_LOCAL_Y = 14;
export const SAWED_CHAMBERS_LOCAL = [
  { x: 42, y: 38, r: 8 },
  { x: 64, y: 38, r: 8 },
];
export const REV_CYLINDER_LOCAL = { x: 52, y: 38, r: 13 };
export const REV_EJECT_LOCAL = { x: 8, y: 26, w: 28, h: 16 };
export const MAG_DROP_LOCAL = { x: 66, y: 36, w: 38, h: 22 };
export const MAG_WELL_LOCAL = { x: 58, y: 24, w: 42, h: 34 };
export const SLIDE_RACK_LOCAL = { x: 16, y: 12, w: 68, h: 18 };
export const DUAL_SWAP_LOCAL = { x: 4, y: -12, w: 96, h: 12 };

export function drawAmmoItem(ctx, x, y, gunId, loaderTier, spent = false, highlight = false) {
  if (gunId === 'sawed_off') {
    if (highlight) pxRect(ctx, x - 1, y - 1, 10, 32, '#ffeb75');
    const brassCol = spent ? '#7d6735' : loaderTier > 0 ? '#ffd24d' : '#d9ab3b';
    const hullCol = spent ? '#632523' : loaderTier > 0 ? '#242933' : '#cf2d23';
    pxRect(ctx, x, y, 8, 9, brassCol);
    pxRect(ctx, x, y + 9, 8, 21, hullCol);
    pxRect(ctx, x + 6, y + 9, 2, 21, 'rgba(0,0,0,0.3)');
  } else if (gunId === 'revolver') {
    if (loaderTier > 0 && !spent) {
      // 6-shot circular speedloader pod!
      if (highlight) pxFillCircle(ctx, x + 4, y + 15, 8, '#ffeb75');
      pxFillCircle(ctx, x + 4, y + 15, 6, '#232730');
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        pxRect(ctx, x + 3 + Math.cos(ang) * 4, y + 14 + Math.sin(ang) * 4, 2, 2, '#ffd24d');
      }
      pxFillCircle(ctx, x + 4, y + 15, 2, '#c9302c');
    } else {
      if (highlight) pxRect(ctx, x - 1, y + 2, 9, 26, '#ffeb75');
      pxRect(ctx, x, y + 3, 7, 17, spent ? '#756236' : '#e0b341');
      pxRect(ctx, x + 1, y + 20, 5, 6, spent ? '#3b3530' : '#b87333');
    }
  } else if (gunId === 'm1911') {
    const h = loaderTier > 0 ? 34 : 26;
    if (highlight) pxRect(ctx, x - 1, y - 1, 10, h + 2, '#ffeb75');
    pxOutlineRect(ctx, x, y, 8, h, spent ? '#2a2e38' : '#3d4452', '#111317');
    if (!spent) {
      pxRect(ctx, x + 2, y + 2, 4, 3, '#e0b341'); // Top .45 brass cartridge visible
    }
    if (loaderTier > 0) {
      pxRect(ctx, x - 1, y + h - 5, 10, 5, '#ffb020'); // Extended basepad
    }
  } else if (gunId === 'smg') {
    const h = loaderTier > 0 ? 39 : 30;
    if (highlight) pxRect(ctx, x - 1, y - 1, 10, h + 2, '#ffeb75');
    const bodyCol = spent ? '#282c34' : loaderTier > 0 ? '#b88a28' : '#39404f';
    pxOutlineRect(ctx, x, y, 8, h, bodyCol, '#101215');
    if (!spent) pxRect(ctx, x + 2, y + 1, 4, 3, '#ffd24d');
  }
}

function drawHolsteredSideProfile(ctx, x, y, id, parts, scale = 1) {
  const s = scale;
  const barrelTier = parts.barrel || 0;
  const loaderTier = parts.loader || 0;
  const sightTier = parts.sight || 0;

  if (id === 'sawed_off') {
    const bLen = (62 + barrelTier * 11) * s;
    // Twin barrels
    pxRect(ctx, x + 8 * s, y + 14 * s, bLen, 11 * s, '#20252e');
    pxRect(ctx, x + 8 * s, y + 15 * s, bLen, 3 * s, '#5b667a');
    if (barrelTier >= 1) {
      // Ported choke vents / muzzle extensions
      for (let v = 0; v < 3; v++) {
        pxRect(ctx, x + (12 + v * 6) * s, y + 16 * s, 3 * s, 2 * s, '#ffb020');
      }
    }
    if (barrelTier >= 2) {
      pxOutlineRect(ctx, x + 4 * s, y + 13 * s, 10 * s, 13 * s, '#7a8499', '#14171c');
    }
    // Wood forend & pistol grip
    pxRect(ctx, x + 34 * s, y + 24 * s, 30 * s, 7 * s, '#6e4226');
    pxRect(ctx, x + 70 * s, y + 15 * s, 15 * s, 14 * s, '#464e5e');
    pxPoly(
      ctx,
      [
        [x + 82 * s, y + 18 * s],
        [x + 106 * s, y + 32 * s],
        [x + 100 * s, y + 45 * s],
        [x + 78 * s, y + 30 * s],
      ],
      '#6e4226'
    );
    if (sightTier > 0) {
      pxOutlineRect(ctx, x + 58 * s, y + 9 * s, 10 * s, 6 * s, '#181b20', '#ffb020');
    }
  } else if (id === 'm1911') {
    // Classic 1911 slide & frame facing left
    const slideX = x + 22 * s;
    pxOutlineRect(ctx, slideX, y + 12 * s, 58 * s, 12 * s, '#4c5566', '#161920');
    pxRect(ctx, slideX + 4 * s, y + 14 * s, 50 * s, 3 * s, '#7b879e');
    // Slide serrations
    for (let k = 0; k < 4; k++) {
      pxRect(ctx, slideX + (42 + k * 3) * s, y + 14 * s, 1 * s, 8 * s, '#252a33');
    }
    // Barrel compensator upgrade
    if (barrelTier >= 1) {
      const compW = barrelTier === 2 ? 16 * s : 10 * s;
      pxOutlineRect(ctx, slideX - compW, y + 12 * s, compW + 1, 12 * s, '#9da8bd', '#161920');
      pxRect(ctx, slideX - compW + 3 * s, y + 14 * s, 3 * s, 4 * s, '#161920');
    }
    // Frame + trigger guard + grip
    pxRect(ctx, slideX + 16 * s, y + 23 * s, 42 * s, 6 * s, '#343b47');
    pxOutlineRect(ctx, slideX + 34 * s, y + 28 * s, 10 * s, 8 * s, null, '#343b47');
    pxPoly(
      ctx,
      [
        [slideX + 44 * s, y + 24 * s],
        [slideX + 58 * s, y + 24 * s],
        [slideX + 65 * s, y + 46 * s],
        [slideX + 50 * s, y + 46 * s],
      ],
      '#5c3822'
    );
    // Extended magazine basepad upgrade
    if (loaderTier > 0) {
      pxOutlineRect(ctx, slideX + 51 * s, y + 45 * s, 16 * s, 7 * s, '#ffb020', '#161920');
    }
    // Underbarrel laser sight upgrade
    if (sightTier > 0) {
      pxOutlineRect(ctx, slideX + 12 * s, y + 24 * s, 18 * s, 7 * s, '#1f232b', '#e03e2d');
      pxRect(ctx, slideX + 10 * s, y + 26 * s, 3 * s, 3 * s, '#ff3b2f');
    }
  } else if (id === 'revolver') {
    const bLen = (40 + barrelTier * 13) * s;
    const cylX = x + 58 * s;
    // Barrel + ventilated rib
    pxOutlineRect(ctx, cylX - bLen, y + 13 * s, bLen, 9 * s, '#6d788c', '#181b22');
    if (barrelTier >= 1) {
      pxRect(ctx, cylX - bLen, y + 21 * s, bLen - 6 * s, 4 * s, '#4c5463'); // Underlug weight
      for (let v = 0; v < 3 + barrelTier; v++) {
        pxRect(ctx, cylX - bLen + (6 + v * 9) * s, y + 11 * s, 5 * s, 2 * s, '#9aa6bd');
      }
    }
    // 6-shot fluted cylinder
    pxOutlineRect(ctx, cylX, y + 13 * s, 20 * s, 16 * s, '#454d5c', '#14171d');
    pxRect(ctx, cylX + 3 * s, y + 17 * s, 14 * s, 3 * s, '#758199');
    // Frame + walnut revolver grip
    pxPoly(
      ctx,
      [
        [cylX + 18 * s, y + 18 * s],
        [cylX + 32 * s, y + 22 * s],
        [cylX + 40 * s, y + 46 * s],
        [cylX + 24 * s, y + 46 * s],
      ],
      '#6b3e23'
    );
    if (sightTier > 0) {
      pxOutlineRect(ctx, cylX - 6 * s, y + 5 * s, 26 * s, 7 * s, '#20242c', '#ffb020');
      pxRect(ctx, cylX - 8 * s, y + 7 * s, 3 * s, 3 * s, '#ff5242');
    }
  } else if (id === 'smg') {
    // Boxy stamped-steel MAC/Uzi receiver
    const rx = x + 28 * s;
    pxOutlineRect(ctx, rx, y + 11 * s, 56 * s, 16 * s, '#2b303b', '#0f1115');
    pxRect(ctx, rx + 6 * s, y + 14 * s, 44 * s, 4 * s, '#474f61');
    // Suppressor / Barrel shroud upgrade
    const muzzleW = barrelTier === 0 ? 10 * s : barrelTier === 1 ? 20 * s : 30 * s;
    const muzzleH = barrelTier === 2 ? 10 * s : 6 * s;
    pxOutlineRect(
      ctx,
      rx - muzzleW,
      y + (19 - muzzleH / (2 * s)) * s,
      muzzleW + 1,
      muzzleH,
      barrelTier === 2 ? '#1c2026' : '#586275',
      '#0e1014'
    );
    // Grip + protruding vertical stick magazine!
    const magLen = (loaderTier > 0 ? 28 : 19) * s;
    pxOutlineRect(
      ctx,
      rx + 30 * s,
      y + 26 * s,
      11 * s,
      magLen,
      loaderTier > 0 ? '#c49329' : '#3a4150',
      '#101216'
    );
    // Holographic sight upgrade on top rail
    if (sightTier > 0) {
      pxOutlineRect(ctx, rx + 18 * s, y + 3 * s, 18 * s, 9 * s, '#171a20', '#6be36b');
      pxRect(ctx, rx + 25 * s, y + 6 * s, 4 * s, 3 * s, '#6be36b');
    }
  }
}

export function drawGunWorkbenchPreview(canvas, gunStats) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  pxRect(ctx, 0, 0, w, h, '#12151a');
  // Subtle gunsmith pegboard dots
  for (let py = 8; py < h; py += 12) {
    for (let px = 8; px < w; px += 12) {
      pxRect(ctx, px, py, 2, 2, '#1f242e');
    }
  }
  pxOutlineRect(ctx, 2, 2, w - 4, h - 4, null, '#485061');

  const id = gunStats.spec.id;
  const parts = gunStats.parts;
  drawHolsteredSideProfile(ctx, 22, 16, id, parts, 2);

  // Also show matching upgraded ammo item on right side of workbench
  drawAmmoItem(ctx, w - 30, 26, id, parts.loader, false, false);
  pxText(ctx, `${gunStats.capacity} RD`, w - 26, 72, '#ffb020', 1, 'center');
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

  // Dual holster swap tab on Armored Wasteland Ute!
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
      DUAL_SWAP_LOCAL.w + 22,
      13,
      swapHover ? '#38301e' : '#1b1e25',
      '#ffb020'
    );
    pxText(
      ctx,
      `SWAP: ${other.stats.spec.name.slice(0, 9)} (${other.ammo})`,
      vx + 63,
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
      (rType === 'break_2' && countWeaponChambers(wep, 'empty') > 0) ||
      (rType === 'cylinder' &&
        countWeaponChambers(wep, 'spent') === 0 &&
        countWeaponChambers(wep, 'empty') > 0));

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
      drawAmmoItem(ctx, sx, sy, id, parts.loader, false, (needFresh && pulse) || slotHover);
    } else {
      pxOutlineRect(ctx, sx, sy + 4, 8, 24, '#181410', '#362c22');
    }
    pxRect(ctx, sx - 1, sy + 13, 10, 6, '#5c432d');
  }

  // Left-side Holster Cradle
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
    pxText(
      ctx,
      empty ? 'TO RELOAD' : 'FREE YOUR HAND',
      hx + 57,
      hy + 30,
      col,
      1,
      'center'
    );
  } else if (wep.mode === 'HOLSTERED_OPEN') {
    // TACTILE RELOAD VIEW PER WEAPON FAMILY
    if (rType === 'break_2') {
      const snapOk = canFinishReload(wep);
      pxRect(ctx, hx + 72, hy + 14, 15, 14, '#454c59');
      pxPoly(
        ctx,
        [
          [hx + 84, hy + 17],
          [hx + 108, hy + 30],
          [hx + 102, hy + 44],
          [hx + 80, hy + 29],
        ],
        '#6e4226'
      );
      pxPoly(
        ctx,
        [
          [hx + 66, hy + 24],
          [hx + 72, hy + 35],
          [hx + 10, hy + 62],
          [hx + 4, hy + 50],
        ],
        snapOk && pulse ? '#56667d' : '#252a33'
      );
      pxOutlineRect(
        ctx,
        vx + 28,
        vy + 24,
        50,
        26,
        '#2c313b',
        snapOk ? '#6be36b' : '#ffb020'
      );

      for (let c = 0; c < 2; c++) {
        const cx = vx + SAWED_CHAMBERS_LOCAL[c].x;
        const cy = vy + SAWED_CHAMBERS_LOCAL[c].y;
        const r = SAWED_CHAMBERS_LOCAL[c].r;
        const st = wep.chambers[c];
        pxFillCircle(ctx, cx, cy, r + 1, '#101215');
        if (st === 'spent' && !(activeHold === 'spent_hull' && dragIndex === c)) {
          pxFillCircle(ctx, cx, cy, r + 2, pulse ? '#ffeb75' : '#ffb020');
          pxFillCircle(ctx, cx, cy, r - 1, '#7a2c28');
          pxFillCircle(ctx, cx, cy, 4, '#9e8242');
          pxLine(ctx, cx, cy + 8, cx, cy + 15, '#ffeb75', 2);
        } else if (st === 'empty') {
          pxRing(ctx, cx, cy, r + 1, r - 1, pulse ? '#6be36b' : '#3a8c4a');
        } else if (st === 'live') {
          pxFillCircle(ctx, cx, cy, r, parts.loader > 0 ? '#242933' : '#d62e24');
          pxFillCircle(ctx, cx, cy, r - 2, '#ffd24d');
        }
      }

      const msg =
        countWeaponChambers(wep, 'spent') > 0
          ? 'DRAG HULLS OUT'
          : countWeaponChambers(wep, 'live') === 2
          ? 'CLICK TO SNAP!'
          : 'DRAG SHELLS IN';
      pxOutlineRect(ctx, vx + 18, vy + 53, 88, 11, '#111317', snapOk ? '#6be36b' : '#ffb020');
      pxText(ctx, msg, vx + 62, vy + 56, snapOk ? '#6be36b' : '#ffeb75', 1, 'center');
    } else if (rType === 'cylinder') {
      // Revolver swung-open 6-chamber rosette + Ejector Rod button on left!
      const hasSpent = countWeaponChambers(wep, 'spent') > 0;
      const snapOk = canFinishReload(wep);

      // Ejector rod button
      const ejX = vx + REV_EJECT_LOCAL.x;
      const ejY = vy + REV_EJECT_LOCAL.y;
      pxOutlineRect(
        ctx,
        ejX,
        ejY,
        REV_EJECT_LOCAL.w,
        REV_EJECT_LOCAL.h,
        hasSpent ? '#4a241c' : '#1e2229',
        hasSpent && pulse ? '#ffeb75' : hasSpent ? '#ffb020' : '#4a5160'
      );
      pxText(ctx, 'EJECT', ejX + 14, ejY + 5, hasSpent ? '#ffeb75' : '#6c7487', 1, 'center');

      // Revolver grip on right
      pxPoly(
        ctx,
        [
          [vx + 84, vy + 20],
          [vx + 104, vy + 26],
          [vx + 112, vy + 50],
          [vx + 92, vy + 50],
        ],
        '#6b3e23'
      );

      // 6-chamber cylinder face at REV_CYLINDER_LOCAL
      const ccx = vx + REV_CYLINDER_LOCAL.x;
      const ccy = vy + REV_CYLINDER_LOCAL.y;
      pxFillCircle(ctx, ccx, ccy, 15, snapOk && pulse ? '#4f6e54' : '#3b4250');
      pxRing(ctx, ccx, ccy, 15, 13, snapOk ? '#6be36b' : '#ffb020');
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const hxC = ccx + Math.cos(ang) * 8.5;
        const hyC = ccy + Math.sin(ang) * 8.5;
        const st = wep.chambers[i];
        pxFillCircle(
          ctx,
          hxC,
          hyC,
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
      // M1911 & SMG: 1) Click DROP MAG -> 2) Drag fresh mag into well -> 3) Click/pull SLIDE/BOLT!
      const stg = wep.reloadStage; // 'mag_spent' | 'mag_out' | 'mag_in'
      drawHolsteredSideProfile(ctx, hx + 2, hy - 2, id, parts, 1);

      if (stg === 'mag_spent') {
        const mx = vx + MAG_DROP_LOCAL.x;
        const my = vy + MAG_DROP_LOCAL.y;
        pxOutlineRect(
          ctx,
          mx,
          my,
          MAG_DROP_LOCAL.w,
          MAG_DROP_LOCAL.h,
          'rgba(90, 28, 24, 0.85)',
          pulse ? '#ffeb75' : '#ff5242'
        );
        pxText(ctx, 'DROP', mx + 19, my + 4, '#ffeb75', 1, 'center');
        pxText(ctx, 'MAG', mx + 19, my + 12, '#ffeb75', 1, 'center');
      } else if (stg === 'mag_out') {
        const wx = vx + MAG_WELL_LOCAL.x;
        const wy = vy + MAG_WELL_LOCAL.y;
        pxOutlineRect(ctx, wx, wy, MAG_WELL_LOCAL.w, MAG_WELL_LOCAL.h, null, pulse ? '#6be36b' : '#ffb020');
        pxOutlineRect(ctx, vx + 16, vy + 53, 92, 11, '#111317', '#ffb020');
        pxText(ctx, 'DRAG MAG HERE', vx + 62, vy + 56, '#ffeb75', 1, 'center');
      } else if (stg === 'mag_in') {
        const sx = vx + SLIDE_RACK_LOCAL.x;
        const sy = vy + SLIDE_RACK_LOCAL.y;
        pxOutlineRect(
          ctx,
          sx,
          sy,
          SLIDE_RACK_LOCAL.w,
          SLIDE_RACK_LOCAL.h,
          'rgba(32, 74, 42, 0.8)',
          pulse ? '#9ef79e' : '#6be36b'
        );
        pxText(
          ctx,
          id === 'smg' ? 'PULL BOLT ->' : 'RACK SLIDE ->',
          sx + 34,
          sy + 6,
          '#ffffff',
          1,
          'center'
        );
      }
    }
  }
}

export function drawEquippedWeaponFP(ctx, wep, pointerX, pointerY, screenW, screenH, shakeX, shakeY, animTime) {
  const aimX = Math.max(24, Math.min(screenW - 24, pointerX));
  const aimY = Math.max(20, Math.min(screenH - 42, pointerY));
  const parts = wep.stats.parts;
  const id = wep.id;

  const recoilKick = wep.recoil * (id === 'smg' ? 11 : id === 'm1911' ? 14 : 22);
  const pivotX = screenW * 0.62 + (aimX - screenW * 0.5) * 0.36 + shakeX + recoilKick * 0.35;
  const pivotY = screenH + 8 + recoilKick;

  const dx = aimX - pivotX;
  const dy = aimY - pivotY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const baseLen = id === 'm1911' ? 78 : id === 'smg' ? 84 : 94;
  const barrelLen = baseLen + parts.barrel * 8 - wep.recoil * 9;
  const muzzleX = pivotX + ux * barrelLen;
  const muzzleY = pivotY + uy * barrelLen;

  // Laser sight beam when sight upgrade installed!
  const overHolster = pointerX > 258 && pointerY < 86;
  if (parts.sight > 0 && !overHolster && wep.ammo > 0) {
    pxLine(ctx, muzzleX, muzzleY, aimX, aimY, 'rgba(255, 55, 45, 0.55)', 1);
    pxFillCircle(ctx, aimX, aimY, 2, '#ff3b2f');
  }

  // Muzzle flash star
  if (wep.muzzleFlash > 0.05) {
    const fr = (id === 'sawed_off' ? 23 : id === 'revolver' ? 19 : 14) * wep.muzzleFlash;
    pxFillCircle(ctx, muzzleX, muzzleY, fr * 1.2, '#ff7b1c');
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
  pxLine(ctx, pivotX - ux * 16, pivotY - uy * 16, pivotX + ux * 22, pivotY + uy * 22, '#54331d', 16);
  pxFillCircle(ctx, pivotX + ux * 15 - nx * 3, pivotY + uy * 15 - ny * 3, 12, '#232730');
  pxFillCircle(ctx, pivotX + ux * 15 - nx * 3, pivotY + uy * 15 - ny * 3, 9, '#393f4d');

  if (id === 'sawed_off') {
    for (const side of [-1, 1]) {
      const bx0 = pivotX + ux * 18 + nx * 7 * side;
      const by0 = pivotY + uy * 18 + ny * 7 * side;
      const bx1 = muzzleX + nx * 5 * side;
      const by1 = muzzleY + ny * 5 * side;
      pxLine(ctx, bx0, by0, bx1, by1, '#1e2229', 10);
      pxLine(ctx, bx0, by0, bx1, by1, parts.barrel >= 2 ? '#8591a6' : '#4f5869', 5);
      pxFillCircle(ctx, bx1, by1, 4, '#0c0d10');
    }
  } else if (id === 'm1911') {
    const bx0 = pivotX + ux * 16;
    const by0 = pivotY + uy * 16;
    pxLine(ctx, bx0, by0, muzzleX, muzzleY, '#222730', 12);
    pxLine(ctx, bx0, by0, muzzleX, muzzleY, '#68748a', 7);
    if (parts.barrel >= 1) {
      const tipX = muzzleX - ux * 10;
      const tipY = muzzleY - uy * 10;
      pxLine(ctx, tipX, tipY, muzzleX, muzzleY, '#b8c4d9', 9);
    }
    if (parts.loader > 0) {
      pxLine(ctx, pivotX + nx * 8, pivotY + ny * 8, pivotX + nx * 18, pivotY + ny * 18, '#ffb020', 6);
    }
  } else if (id === 'revolver') {
    const cylX = pivotX + ux * 28;
    const cylY = pivotY + uy * 28;
    pxFillCircle(ctx, cylX, cylY, 11, '#3b4252');
    pxFillCircle(ctx, cylX, cylY, 8, '#5f6a80');
    pxLine(ctx, cylX, cylY, muzzleX, muzzleY, '#262b36', 9);
    pxLine(ctx, cylX, cylY, muzzleX, muzzleY, '#8b97ad', 5);
    if (parts.sight > 0) {
      pxOutlineRect(ctx, cylX - 6, cylY - 12, 12, 8, '#171a20', '#ffb020');
    }
  } else if (id === 'smg') {
    const bx0 = pivotX + ux * 14;
    const by0 = pivotY + uy * 14;
    const bodyEndX = pivotX + ux * 58;
    const bodyEndY = pivotY + uy * 58;
    pxLine(ctx, bx0, by0, bodyEndX, bodyEndY, '#1d2129', 16);
    pxLine(ctx, bx0, by0, bodyEndX, bodyEndY, '#3d4554', 11);
    // Suppressor / muzzle
    pxLine(
      ctx,
      bodyEndX,
      bodyEndY,
      muzzleX,
      muzzleY,
      parts.barrel === 2 ? '#16191f' : '#657085',
      parts.barrel === 2 ? 11 : 6
    );
    // Stick mag sticking down/left
    const magLen = parts.loader > 0 ? 26 : 16;
    pxLine(
      ctx,
      pivotX + ux * 32,
      pivotY + uy * 32,
      pivotX + ux * 32 - nx * magLen,
      pivotY + uy * 32 - ny * magLen,
      parts.loader > 0 ? '#d4a12a' : '#2e3440',
      7
    );
    if (parts.sight > 0) {
      const ox = pivotX + ux * 40;
      const oy = pivotY + uy * 40;
      pxOutlineRect(ctx, ox - 7, oy - 13, 14, 10, 'rgba(20,30,24,0.65)', '#6be36b');
    }
  }

  // Reticle
  if (!overHolster) {
    const retCol = wep.ammo > 0 ? (parts.sight > 0 ? '#6be36b' : '#ffb020') : '#ff5242';
    const r = id === 'sawed_off' ? 14 : id === 'smg' ? 11 : 8;
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
