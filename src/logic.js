import { getComputedCarStats, getComputedGunStats } from './catalog.js';

export const MAX_WHEEL_RAD = 2.2;
export const NITRO_PULL_COST = 30;
export const NITRO_STACK_DURATION = 5.4;

// Normalized top speed fraction of car's 6th-gear ceiling for each gear 1..6
const GEAR_MAX_FRAC = [0, 0.25, 0.43, 0.60, 0.75, 0.88, 1.0];
const GEAR_MIN_FRAC = [0, 0.0, 0.16, 0.32, 0.48, 0.64, 0.78];

export function createCarState(carStats) {
  const maxArmor = carStats ? carStats.maxArmor : 105;
  return {
    s: 0.985,
    lateral: -3.4,
    headingOffset: 0,
    speed: 0,
    wheelAngle: 0,
    wheelHeld: false,
    gear: 1, // 1..6, 0 = Neutral ('N'), -1 = Reverse ('R')
    rpm: 0.22,
    shiftLight: false,
    armor: maxArmor,
    maxArmor,
    blowerActive: false,
    blowerHeat: 0,
    driftHeld: false,
    lap: 0,
    startedFirstLap: false,
    completedLaps: 0,
    checkpointMask: 0,
    totalProgress: -0.015,
    lapStartTime: 0,
    bestLapTime: Infinity,
    offRoad: false,
    onCurb: false,
    wallHitCooldown: 0,
    bumpPhase: 0,
  };
}

export function createNitroState(carStats) {
  return {
    meter: 100,
    stacks: 0,
    maxStacks: carStats ? carStats.maxNitroStacks : 3,
    regenMult: carStats ? carStats.nitroRegenMult : 1,
    durationBonus: carStats ? carStats.nitroDurationBonus : 0,
    stackTimer: 0,
    handlePos: 0,
    dragging: false,
    latchedThisDrag: false,
    lowPsiFlash: 0,
  };
}

export function createSingleWeaponInstance(gunStats) {
  const id = gunStats.spec.id;
  const cap = gunStats.capacity;
  const inst = {
    id,
    stats: gunStats,
    mode: 'HOLSTERED_READY', // 'HOLSTERED_READY' | 'EQUIPPED' | 'HOLSTERED_OPEN'
    ammo: cap,
    maxAmmo: cap,
    fireCooldown: 0,
    recoil: 0,
    muzzleFlash: 0,
    holsterAlert: 0,
    // Sawed-off & Revolver chamber states
    chambers:
      id === 'sawed_off'
        ? ['live', 'live']
        : id === 'revolver'
        ? Array(6).fill('live')
        : [],
    // Mag + slide guns (M1911 & SMG): 'mag_spent' -> 'mag_out' -> 'mag_in' -> 'ready'
    reloadStage: 'ready',
    // Visor ammo pouch slots (infinite slow replenish so long races never softlock)
    pouchSlots: [true, true, true, true, true],
    pouchRefillTimer: 0,
  };
  return inst;
}

export function createLoadoutState(save) {
  const carStats = getComputedCarStats(save);
  const primaryStats = getComputedGunStats(save, save.primaryGun);
  const weapons = [createSingleWeaponInstance(primaryStats)];

  if (carStats.dualHolster) {
    const secId =
      save.ownedGuns[save.secondaryGun] && save.secondaryGun !== save.primaryGun
        ? save.secondaryGun
        : Object.keys(save.ownedGuns).find((k) => save.ownedGuns[k] && k !== save.primaryGun) ||
          save.primaryGun;
    weapons.push(createSingleWeaponInstance(getComputedGunStats(save, secId)));
  }

  return {
    weapons,
    activeSlot: 0,
    wrecksCount: 0,
    bountyEarned: 0,
  };
}

export function getActiveWeapon(loadout) {
  return loadout.weapons[loadout.activeSlot];
}

export function swapDualWeapon(loadout) {
  if (loadout.weapons.length < 2) return false;
  const cur = getActiveWeapon(loadout);
  if (cur.mode === 'EQUIPPED') {
    cur.mode = cur.ammo === 0 ? 'HOLSTERED_OPEN' : 'HOLSTERED_READY';
    if (cur.ammo === 0 && cur.stats.spec.reloadType === 'mag_slide' && cur.reloadStage === 'ready') {
      cur.reloadStage = 'mag_spent';
    }
  }
  loadout.activeSlot = loadout.activeSlot === 0 ? 1 : 0;
  return true;
}

export function equipWeapon(wep) {
  if (wep.mode !== 'HOLSTERED_READY') return false;
  wep.mode = 'EQUIPPED';
  return true;
}

export function fireWeapon(wep) {
  if (wep.mode !== 'EQUIPPED') return { fired: false, dryFire: false };
  if (wep.ammo <= 0) {
    wep.holsterAlert = 1.0;
    return { fired: false, dryFire: true };
  }
  if (wep.fireCooldown > 0) return { fired: false, dryFire: false, cooling: true };

  wep.ammo -= 1;
  wep.fireCooldown = wep.stats.spec.fireInterval;
  wep.recoil = 1.0;
  wep.muzzleFlash = 1.0;

  if (wep.id === 'sawed_off' || wep.id === 'revolver') {
    const idx = wep.chambers.indexOf('live');
    if (idx !== -1) wep.chambers[idx] = 'spent';
  }

  if (wep.ammo === 0) {
    wep.holsterAlert = 1.0;
    if (wep.stats.spec.reloadType === 'mag_slide') {
      wep.reloadStage = 'mag_spent';
    }
  }

  return { fired: true, remainingAmmo: wep.ammo };
}

export function holsterWeapon(wep) {
  if (wep.mode !== 'EQUIPPED') return false;
  wep.holsterAlert = 0;
  if (wep.ammo === 0) {
    wep.mode = 'HOLSTERED_OPEN';
    if (wep.stats.spec.reloadType === 'mag_slide' && wep.reloadStage === 'ready') {
      wep.reloadStage = 'mag_spent';
    }
  } else {
    wep.mode = 'HOLSTERED_READY';
  }
  return true;
}

export function openWeaponForReload(wep) {
  if (wep.mode === 'HOLSTERED_READY' && wep.ammo < wep.maxAmmo) {
    wep.mode = 'HOLSTERED_OPEN';
    if (wep.stats.spec.reloadType === 'mag_slide') {
      wep.reloadStage = 'mag_spent';
    }
    return true;
  }
  if (wep.mode === 'EQUIPPED' && wep.ammo === 0) {
    return holsterWeapon(wep);
  }
  return false;
}

// Sawed-off & Revolver chamber helpers
export function countWeaponChambers(wep, state) {
  let c = 0;
  for (const ch of wep.chambers) if (ch === state) c++;
  return c;
}

export function ejectChamber(wep, index = -1) {
  if (wep.mode !== 'HOLSTERED_OPEN') return false;
  if (wep.id === 'sawed_off') {
    if (wep.chambers[index] !== 'spent') return false;
    wep.chambers[index] = 'empty';
    return true;
  }
  if (wep.id === 'revolver') {
    // Revolver ejector rod dumps all spent casings at once
    let any = false;
    for (let i = 0; i < wep.chambers.length; i++) {
      if (wep.chambers[i] === 'spent') {
        wep.chambers[i] = 'empty';
        any = true;
      }
    }
    return any;
  }
  return false;
}

export function dropMagazine(wep) {
  if (wep.mode !== 'HOLSTERED_OPEN') return false;
  if (wep.stats.spec.reloadType !== 'mag_slide') return false;
  if (wep.reloadStage !== 'mag_spent') return false;
  wep.reloadStage = 'mag_out';
  wep.ammo = 0;
  return true;
}

export function insertAmmoFromPouch(wep, pouchIndex) {
  if (wep.mode !== 'HOLSTERED_OPEN') return { loaded: false };
  if (!wep.pouchSlots[pouchIndex]) return { loaded: false };

  const rType = wep.stats.spec.reloadType;

  if (rType === 'break_2') {
    const emptyIdx = wep.chambers.indexOf('empty');
    if (emptyIdx === -1) return { loaded: false };
    wep.pouchSlots[pouchIndex] = false;
    wep.chambers[emptyIdx] = 'live';
    wep.ammo = countWeaponChambers(wep, 'live');
    return { loaded: true };
  }

  if (rType === 'cylinder') {
    if (countWeaponChambers(wep, 'spent') > 0) return { loaded: false, needEject: true };
    const emptyIdx = wep.chambers.indexOf('empty');
    if (emptyIdx === -1) return { loaded: false };
    wep.pouchSlots[pouchIndex] = false;

    if (wep.stats.hasSpeedloader) {
      // Speedloader drops all 6 rounds into the cylinder in one motion!
      for (let i = 0; i < wep.chambers.length; i++) {
        wep.chambers[i] = 'live';
      }
    } else {
      // Hand-loading pairs of .357 cartridges (2 chambers per grab so 3 brisk pulls fill 6)
      let filled = 0;
      for (let i = 0; i < wep.chambers.length && filled < 2; i++) {
        if (wep.chambers[i] === 'empty') {
          wep.chambers[i] = 'live';
          filled++;
        }
      }
    }
    wep.ammo = countWeaponChambers(wep, 'live');
    return { loaded: true };
  }

  if (rType === 'mag_slide') {
    if (wep.reloadStage !== 'mag_out') return { loaded: false, needDropMag: true };
    wep.pouchSlots[pouchIndex] = false;
    wep.reloadStage = 'mag_in';
    return { loaded: true };
  }

  return { loaded: false };
}

export function canFinishReload(wep) {
  if (wep.mode !== 'HOLSTERED_OPEN') return false;
  const rType = wep.stats.spec.reloadType;
  if (rType === 'break_2' || rType === 'cylinder') {
    return countWeaponChambers(wep, 'live') >= 1 && countWeaponChambers(wep, 'spent') === 0;
  }
  if (rType === 'mag_slide') {
    return wep.reloadStage === 'mag_in';
  }
  return false;
}

export function finishWeaponReload(wep) {
  if (!canFinishReload(wep)) return false;
  if (wep.stats.spec.reloadType === 'mag_slide') {
    wep.ammo = wep.maxAmmo;
    wep.reloadStage = 'ready';
  } else {
    wep.ammo = countWeaponChambers(wep, 'live');
  }
  wep.mode = 'HOLSTERED_READY';
  return true;
}

export function stepWeaponTimers(wep, dt) {
  wep.fireCooldown = Math.max(0, wep.fireCooldown - dt);
  wep.recoil = Math.max(0, wep.recoil - dt * 5.2);
  wep.muzzleFlash = Math.max(0, wep.muzzleFlash - dt * 13.0);
  wep.holsterAlert = Math.max(0, wep.holsterAlert - dt * 1.4);

  const missing = wep.pouchSlots.indexOf(false);
  if (missing !== -1) {
    wep.pouchRefillTimer += dt;
    if (wep.pouchRefillTimer >= 2.8) {
      wep.pouchRefillTimer = 0;
      wep.pouchSlots[missing] = true;
    }
  } else {
    wep.pouchRefillTimer = 0;
  }
}

// Shortened nitro throw: triggers at 82% of a compact 36px pull!
export function updateNitroDrag(nitro, normalizedPull) {
  if (!nitro.dragging || nitro.latchedThisDrag) return { triggered: false, lowPsi: false };
  nitro.handlePos = Math.max(0, Math.min(1, normalizedPull));
  if (nitro.handlePos >= 0.82) {
    if (nitro.meter < NITRO_PULL_COST && nitro.stacks < nitro.maxStacks) {
      nitro.lowPsiFlash = 1.0;
      nitro.latchedThisDrag = true;
      nitro.dragging = false;
      return { triggered: false, lowPsi: true };
    }
    if (nitro.stacks < nitro.maxStacks) {
      nitro.meter = Math.max(0, nitro.meter - NITRO_PULL_COST);
    }
    nitro.stacks = Math.min(nitro.maxStacks, nitro.stacks + 1);
    nitro.stackTimer = NITRO_STACK_DURATION + nitro.durationBonus;
    nitro.latchedThisDrag = true;
    nitro.dragging = false;
    return { triggered: true, stacks: nitro.stacks, lowPsi: false };
  }
  return { triggered: false, lowPsi: false };
}

export function stepNitro(nitro, dt) {
  if (!nitro.dragging) {
    nitro.handlePos = Math.max(0, nitro.handlePos - dt * 7.5);
    nitro.latchedThisDrag = false;
  }
  nitro.lowPsiFlash = Math.max(0, nitro.lowPsiFlash - dt * 2.5);

  const baseRegen = nitro.stacks > 0 ? 5.8 : 11.5;
  nitro.meter = Math.min(100, nitro.meter + baseRegen * nitro.regenMult * dt);

  if (nitro.stacks > 0) {
    nitro.stackTimer -= dt;
    if (nitro.stackTimer <= 0) {
      nitro.stacks -= 1;
      nitro.stackTimer =
        nitro.stacks > 0 ? (NITRO_STACK_DURATION + nitro.durationBonus) * 0.72 : 0;
    }
  }
}

export function shiftGear(car, newGear) {
  if (newGear < -1 || newGear > 6) return false;
  if (car.gear === newGear) return false;
  car.gear = newGear;
  return true;
}

export function stepCarPhysics(
  car,
  nitro,
  carStats,
  trackCurvature,
  trackLength,
  raceTime,
  dt,
  isOpenWorld = false,
  totalLaps = 3
) {
  // Supercharger Blower gimmick heat management (V8 Muscle)
  if (car.blowerActive) {
    car.blowerHeat = Math.min(1, car.blowerHeat + dt * 0.14);
    if (car.blowerHeat >= 1) {
      car.blowerActive = false; // Auto cut-off to cool down
    }
  } else {
    car.blowerHeat = Math.max(0, car.blowerHeat - dt * 0.22);
  }
  const blowerBoost = car.blowerActive ? 1.2 : 1.0;

  const nitroBonusMps = nitro.stacks * 7.8;
  const topCarMps = carStats.topMps * (car.blowerActive ? 1.07 : 1.0);

  // Auto-accelerate based on H-pattern gear!
  if (car.gear === -1) {
    // Reverse slot ('R'): brakes forward motion hard, then reverses up to -11 m/s
    if (car.speed > 0.5) {
      car.speed = Math.max(0, car.speed - 28.0 * dt);
    } else {
      car.speed = Math.max(-11.0, car.speed - 11.5 * dt);
    }
    car.rpm = 0.28 + Math.min(0.65, Math.abs(car.speed) / 11);
    car.shiftLight = false;
  } else if (car.gear === 0) {
    // Neutral ('N'): pure coast
    const drag = 2.4 + Math.abs(car.speed) * 0.03;
    if (car.speed > 0) car.speed = Math.max(0, car.speed - drag * dt);
    else if (car.speed < 0) car.speed = Math.min(0, car.speed + 8.0 * dt);
    car.rpm = Math.max(0.18, car.rpm - dt * 1.5);
    car.shiftLight = false;
  } else {
    // Forward gears 1..6
    const gearMinSpeed = topCarMps * GEAR_MIN_FRAC[car.gear];
    const gearMaxSpeed = topCarMps * GEAR_MAX_FRAC[car.gear] + nitroBonusMps;

    if (car.speed < 0) {
      car.speed = Math.min(0, car.speed + 22.0 * dt);
    } else if (car.speed > gearMaxSpeed + 0.8) {
      // Downshift engine-braking! Pulling from 5th/6th down to 2nd/3rd slows cleanly for corners
      const overSpeed = car.speed - gearMaxSpeed;
      const engineBrake = 16.5 + Math.min(18.0, overSpeed * 0.9);
      car.speed = Math.max(gearMaxSpeed, car.speed - engineBrake * dt);
    } else {
      // Auto-throttle climbs smoothly toward current gear ceiling
      // Shifting way too high at crawl speed lugs slightly (50% torque) while proper gear pulls 100%
      const lugFactor =
        car.speed < gearMinSpeed * 0.78 ? 0.52 : car.speed < gearMinSpeed ? 0.8 : 1.0;
      const gearTorqueScale = 1.18 - (car.gear - 1) * 0.07; // Lower gears pull harder
      const pull =
        (carStats.accel * gearTorqueScale * lugFactor * blowerBoost + nitro.stacks * 10.5) * 0.72;
      car.speed = Math.min(gearMaxSpeed, car.speed + pull * dt);
    }

    // Drift handbrake slightly trims speed to rotate nose into hairpins
    if (car.driftHeld && car.speed > 14) {
      car.speed = Math.max(14, car.speed - 9.5 * dt);
    }

    const bandSpan = Math.max(8, topCarMps * GEAR_MAX_FRAC[car.gear] - gearMinSpeed * 0.7);
    const rawRpm = 0.22 + ((car.speed - gearMinSpeed * 0.7) / bandSpan) * 0.76;
    car.rpm = Math.max(0.18, Math.min(0.99, rawRpm));
    car.shiftLight = car.gear < 6 && car.rpm >= 0.9;
  }

  // Wheel self-centering + road wander when hand is off the wheel
  car.bumpPhase += dt * (2.2 + Math.abs(car.speed) * 0.22);
  if (!car.wheelHeld) {
    const centerStep = 0.82 * dt;
    if (Math.abs(car.wheelAngle) <= centerStep) {
      car.wheelAngle = 0;
    } else {
      car.wheelAngle -= Math.sign(car.wheelAngle) * centerStep;
    }
    const speedFactor = Math.min(1, Math.abs(car.speed) / 32);
    const nitroWobble = 1 + nitro.stacks * 0.7;
    const roadWander =
      (Math.sin(car.bumpPhase * 0.9) * 0.14 + Math.cos(car.bumpPhase * 2.1) * 0.08) *
      speedFactor *
      nitroWobble;
    car.wheelAngle = Math.max(
      -MAX_WHEEL_RAD,
      Math.min(MAX_WHEEL_RAD, car.wheelAngle + roadWander * dt)
    );
  }

  const steerNorm = car.wheelAngle / MAX_WHEEL_RAD;
  const lowSpeedRamp = Math.min(1, Math.abs(car.speed) / 7.5) * (car.speed >= 0 ? 1 : -1);
  const highSpeedDamp = 1 / (1 + Math.max(0, Math.abs(car.speed) - 28) * 0.016);
  const driftTurnMult = car.driftHeld ? 1.52 : 1.0;
  const steerRate =
    steerNorm * carStats.handling * lowSpeedRamp * highSpeedDamp * driftTurnMult;

  const forwardSpeed = car.speed * Math.cos(car.headingOffset);
  const lateralSpeed = car.speed * Math.sin(car.headingOffset);

  const ds = (forwardSpeed * dt) / trackLength;
  const curveHeadingDelta = trackCurvature * forwardSpeed * dt;
  car.headingOffset += steerRate * dt - curveHeadingDelta;
  car.headingOffset = Math.max(-1.25, Math.min(1.25, car.headingOffset));

  car.lateral += lateralSpeed * dt;

  const absLat = Math.abs(car.lateral);
  let hitWall = false;
  car.wallHitCooldown = Math.max(0, car.wallHitCooldown - dt);

  if (isOpenWorld) {
    // Level 2 Badlands Flats: wide compacted trail +-26m, open sand flats out to +-88m!
    car.onCurb = absLat >= 24.5 && absLat <= 28.0;
    car.offRoad = absLat > 28.0;
    if (car.offRoad && car.speed > 34 && nitro.stacks === 0) {
      car.speed = Math.max(34, car.speed - 7.5 * dt);
    }
    const canyonWallLimit = 88.0;
    if (absLat > canyonWallLimit) {
      const sign = Math.sign(car.lateral);
      car.lateral = sign * canyonWallLimit;
      car.headingOffset = sign > 0 ? -0.18 : 0.18;
      if (car.wallHitCooldown <= 0 && Math.abs(car.speed) > 14) {
        hitWall = true;
        car.wallHitCooldown = 0.5;
        car.speed *= 0.75;
      }
    }
  } else {
    // Level 1 Canyon Circuit: widened 21m asphalt road (+-10.5m), curbs 10.5..12.0m, rails at +-14.2m
    car.onCurb = absLat >= 10.2 && absLat <= 12.1;
    car.offRoad = absLat > 12.1;
    if (car.offRoad && car.speed > 22) {
      car.speed = Math.max(22, car.speed - 12.0 * dt);
    }
    const wallLimit = 14.0;
    if (absLat > wallLimit) {
      const sign = Math.sign(car.lateral);
      car.lateral = sign * wallLimit;
      if (sign > 0 && car.headingOffset > -0.08) car.headingOffset = -0.14;
      else if (sign < 0 && car.headingOffset < 0.08) car.headingOffset = 0.14;

      if (car.wallHitCooldown <= 0 && Math.abs(car.speed) > 12) {
        hitWall = true;
        car.wallHitCooldown = 0.45;
        car.speed *= 0.78;
        car.armor = Math.max(0, car.armor - 4);
        if (nitro.stacks >= 2) nitro.stacks -= 1;
      }
    }
  }

  const prevS = car.s;
  car.s = (((car.s + ds) % 1) + 1) % 1;
  car.totalProgress += ds;

  if (car.s > 0.2 && car.s < 0.35) car.checkpointMask |= 1;
  if (car.s > 0.45 && car.s < 0.6) car.checkpointMask |= 2;
  if (car.s > 0.7 && car.s < 0.88) car.checkpointMask |= 4;

  let lapCompleted = false;
  if (prevS > 0.85 && car.s < 0.15 && ds > 0) {
    if (!car.startedFirstLap) {
      car.startedFirstLap = true;
      car.lap = 1;
      car.lapStartTime = raceTime;
      car.checkpointMask = 0;
    } else if (car.checkpointMask === 7) {
      const lapDuration = raceTime - car.lapStartTime;
      if (lapDuration > 3 && lapDuration < car.bestLapTime) {
        car.bestLapTime = lapDuration;
      }
      car.completedLaps += 1;
      car.lap = Math.min(totalLaps, car.completedLaps + 1);
      car.lapStartTime = raceTime;
      car.checkpointMask = 0;
      lapCompleted = true;
    }
  }

  return { hitWall, lapCompleted, playerWrecked: car.armor <= 0 };
}

export function formatRaceTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--.--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds - Math.floor(seconds)) * 100);
  return (
    String(mins).padStart(2, '0') +
    ':' +
    String(secs).padStart(2, '0') +
    '.' +
    String(hundredths).padStart(2, '0')
  );
}

export function formatOrdinal(rank) {
  if (rank === 1) return '1ST';
  if (rank === 2) return '2ND';
  if (rank === 3) return '3RD';
  return `${rank}TH`;
}
