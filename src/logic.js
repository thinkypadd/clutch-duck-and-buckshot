import {
  NITRO_STAGE_COLORS,
  NITRO_STAGE_NAMES,
  getComputedCarStats,
  getComputedGunStats,
} from './catalog.js';

export const MAX_WHEEL_RAD = 2.2;
export const NITRO_PULL_COST = 30;
export const NITRO_STACK_DURATION = 5.4;

// Dynamically compute [minFrac, maxFrac] for any gearbox with 3..8 forward gears!
export function getGearBand(gear, maxGears = 5) {
  const n = Math.max(3, Math.min(8, maxGears));
  const g = Math.max(1, Math.min(n, gear));
  // Smooth curve so low gears have crisp step spacing and top gear reaches 1.0
  const maxFrac = Math.pow(g / n, 0.82);
  const prevMax = g === 1 ? 0 : Math.pow((g - 1) / n, 0.82);
  const minFrac = g === 1 ? 0 : prevMax * 0.78;
  return { minFrac, maxFrac };
}

export function getNitroStageInfo(stacks) {
  if (stacks <= 0) return { active: false, color: '#454c5c', name: 'OFF' };
  const idx = Math.min(NITRO_STAGE_COLORS.length - 1, stacks - 1);
  return {
    active: true,
    color: NITRO_STAGE_COLORS[idx],
    name: NITRO_STAGE_NAMES[idx],
  };
}

export function createCarState(carStats) {
  const maxArmor = carStats ? carStats.maxArmor : 95;
  const maxGears = carStats ? carStats.maxGears : 3;
  return {
    s: 0.985,
    lateral: -3.4,
    headingOffset: 0,
    speed: 0,
    wheelAngle: 0,
    wheelHeld: false,
    gear: 1, // 1..maxGears, 0 = Neutral ('N'), -1 = Reverse ('R')
    maxGears,
    rpm: 0.22,
    shiftLight: false,
    armor: maxArmor,
    maxArmor,
    // Car gimmicks
    chokeActive: false,
    vcamActive: false,
    blowerActive: false,
    gimmickHeat: 0,
    driftHeld: false,
    aeroSlipMode: false,
    jumpY: 0,
    jumpVel: 0,
    jumpCooldown: 0,
    backfireCooldown: 0,
    backfireFlash: 0,
    // Trunk countermeasure
    trunkCooldown: 0,
    trunkMaxCooldown: carStats ? carStats.trunkCooldownSec : 6.0,
    // Race progress
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
  const maxStacks = carStats ? carStats.maxNitroStacks : 0;
  return {
    installed: maxStacks > 0,
    meter: maxStacks > 0 ? 100 : 0,
    stacks: 0,
    maxStacks,
    regenMult: carStats ? carStats.nitroRegenMult : 0,
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
  const rType = gunStats.spec.reloadType;
  const cap = gunStats.capacity;
  const chambers =
    rType === 'break_2'
      ? ['live', 'live']
      : rType === 'break_1'
      ? ['live']
      : rType === 'cylinder'
      ? Array(6).fill('live')
      : [];

  return {
    id,
    stats: gunStats,
    mode: 'HOLSTERED_READY', // 'HOLSTERED_READY' | 'EQUIPPED' | 'HOLSTERED_OPEN'
    ammo: cap,
    maxAmmo: cap,
    fireCooldown: 0,
    recoil: 0,
    muzzleFlash: 0,
    holsterAlert: 0,
    chambers,
    // mag_slide: 'mag_spent' -> 'mag_out' -> 'mag_in' -> 'ready'
    // tube_pump / lever_gate: 'loading_tube' -> 'ready_to_rack' -> 'ready'
    reloadStage: 'ready',
    pouchSlots: [true, true, true, true, true],
    pouchRefillTimer: 0,
  };
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

function enterOpenReloadState(wep) {
  wep.mode = 'HOLSTERED_OPEN';
  const rType = wep.stats.spec.reloadType;
  if (rType === 'mag_slide') {
    wep.reloadStage = 'mag_spent';
  } else if (rType === 'tube_pump' || rType === 'lever_gate') {
    wep.reloadStage = wep.ammo >= wep.maxAmmo ? 'ready_to_rack' : 'loading_tube';
  }
}

export function swapDualWeapon(loadout) {
  if (loadout.weapons.length < 2) return false;
  const cur = getActiveWeapon(loadout);
  if (cur.mode === 'EQUIPPED') {
    if (cur.ammo === 0) enterOpenReloadState(cur);
    else cur.mode = 'HOLSTERED_READY';
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
  wep.fireCooldown = wep.stats.fireInterval;
  wep.recoil = 1.0 * wep.stats.recoilMult;
  wep.muzzleFlash = 1.0;

  if (wep.chambers.length > 0) {
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
    enterOpenReloadState(wep);
  } else {
    wep.mode = 'HOLSTERED_READY';
  }
  return true;
}

export function openWeaponForReload(wep) {
  if (wep.mode === 'HOLSTERED_READY' && wep.ammo < wep.maxAmmo) {
    enterOpenReloadState(wep);
    return true;
  }
  if (wep.mode === 'EQUIPPED' && wep.ammo === 0) {
    return holsterWeapon(wep);
  }
  return false;
}

export function countWeaponChambers(wep, state) {
  let c = 0;
  for (const ch of wep.chambers) if (ch === state) c++;
  return c;
}

export function ejectChamber(wep, index = -1) {
  if (wep.mode !== 'HOLSTERED_OPEN') return false;
  const rType = wep.stats.spec.reloadType;
  if (rType === 'break_2' || rType === 'break_1') {
    const idx = rType === 'break_1' ? 0 : index;
    if (wep.chambers[idx] !== 'spent') return false;
    wep.chambers[idx] = 'empty';
    return true;
  }
  if (rType === 'cylinder') {
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

  if (rType === 'break_2' || rType === 'break_1') {
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
      for (let i = 0; i < wep.chambers.length; i++) wep.chambers[i] = 'live';
    } else {
      const perGrab = (wep.stats.parts.loader || 0) >= 1 ? 3 : 2;
      let filled = 0;
      for (let i = 0; i < wep.chambers.length && filled < perGrab; i++) {
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

  if (rType === 'tube_pump' || rType === 'lever_gate') {
    if (wep.ammo >= wep.maxAmmo) return { loaded: false };
    wep.pouchSlots[pouchIndex] = false;
    const perGrab = wep.stats.fastPackLoad ? wep.maxAmmo : (wep.stats.parts.loader || 0) >= 1 ? 4 : 3;
    wep.ammo = Math.min(wep.maxAmmo, wep.ammo + perGrab);
    if (wep.ammo >= wep.maxAmmo) {
      wep.reloadStage = 'ready_to_rack';
    }
    return { loaded: true };
  }

  return { loaded: false };
}

export function canFinishReload(wep) {
  if (wep.mode !== 'HOLSTERED_OPEN') return false;
  const rType = wep.stats.spec.reloadType;
  if (rType === 'break_2' || rType === 'break_1' || rType === 'cylinder') {
    return countWeaponChambers(wep, 'live') >= 1 && countWeaponChambers(wep, 'spent') === 0;
  }
  if (rType === 'mag_slide') {
    return wep.reloadStage === 'mag_in';
  }
  if (rType === 'tube_pump' || rType === 'lever_gate') {
    return wep.ammo >= 1;
  }
  return false;
}

export function finishWeaponReload(wep) {
  if (!canFinishReload(wep)) return false;
  const rType = wep.stats.spec.reloadType;
  if (rType === 'mag_slide') {
    wep.ammo = wep.maxAmmo;
    wep.reloadStage = 'ready';
  } else if (rType === 'tube_pump' || rType === 'lever_gate') {
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
    if (wep.pouchRefillTimer >= 2.6) {
      wep.pouchRefillTimer = 0;
      wep.pouchSlots[missing] = true;
    }
  } else {
    wep.pouchRefillTimer = 0;
  }
}

export function updateNitroDrag(nitro, normalizedPull) {
  if (!nitro.installed || nitro.maxStacks <= 0) {
    return { triggered: false, lowPsi: false, uninstalled: true };
  }
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
    const stage = getNitroStageInfo(nitro.stacks);
    return {
      triggered: true,
      stacks: nitro.stacks,
      stageName: stage.name,
      stageColor: stage.color,
      lowPsi: false,
    };
  }
  return { triggered: false, lowPsi: false };
}

export function stepNitro(nitro, dt) {
  if (!nitro.installed || nitro.maxStacks <= 0) return;
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

export function shiftGear(car, newGear, maxGears = car.maxGears || 5) {
  if (newGear < -1 || newGear > maxGears) return false;
  if (car.gear === newGear) return false;
  car.gear = newGear;
  return true;
}

export function triggerHydroJump(car) {
  if (car.jumpY > 0.05 || car.jumpCooldown > 0) return false;
  car.jumpVel = 8.4;
  car.jumpCooldown = 2.6;
  return true;
}

export function triggerBackfire(car) {
  if (car.backfireCooldown > 0) return false;
  car.backfireCooldown = 4.2;
  car.backfireFlash = 1.0;
  return true;
}

export function deployTrunkHazard(car, carStats) {
  if (!carStats || carStats.trunkType === 'none') return { deployed: false, reason: 'empty' };
  if (car.trunkCooldown > 0) return { deployed: false, reason: 'cooling' };
  car.trunkCooldown = carStats.trunkCooldownSec;
  car.trunkMaxCooldown = carStats.trunkCooldownSec;
  return { deployed: true, type: carStats.trunkType };
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
  totalLaps = 3,
  godMode = false
) {
  car.maxGears = carStats.maxGears;
  if (car.gear > car.maxGears) car.gear = car.maxGears;

  // Cooldowns & Hydro-Jump vertical arc
  car.jumpCooldown = Math.max(0, car.jumpCooldown - dt);
  car.backfireCooldown = Math.max(0, car.backfireCooldown - dt);
  car.backfireFlash = Math.max(0, car.backfireFlash - dt * 2.8);
  car.trunkCooldown = Math.max(0, car.trunkCooldown - dt);

  if (car.jumpY > 0 || car.jumpVel > 0) {
    car.jumpY += car.jumpVel * dt;
    car.jumpVel -= 19.5 * dt;
    if (car.jumpY <= 0) {
      car.jumpY = 0;
      car.jumpVel = 0;
    }
  }

  // Heat-managed gimmicks (Rustbucket Choke & V8 Interceptor Blower)
  const heatActive = car.blowerActive || car.chokeActive;
  if (heatActive) {
    car.gimmickHeat = Math.min(1, car.gimmickHeat + dt * 0.16 * carStats.heatRateMult);
    if (car.gimmickHeat >= 1) {
      car.blowerActive = false;
      car.chokeActive = false;
    }
  } else {
    car.gimmickHeat = Math.max(0, car.gimmickHeat - dt * (0.24 / carStats.heatRateMult));
  }

  const blowerTorque = car.blowerActive ? 1.22 : 1.0;
  const chokeTorque = car.chokeActive ? (car.gear <= 2 ? 1.32 : 1.14) : 1.0;
  const vcamTorque = car.vcamActive && car.rpm > 0.6 ? 1.18 : 1.0;
  const aeroTopMult =
    carStats.spec.gimmickType === 'active_aero'
      ? car.aeroSlipMode
        ? 1.12
        : 0.98
      : 1.0;
  const aeroGripMult =
    carStats.spec.gimmickType === 'active_aero'
      ? car.aeroSlipMode
        ? 0.9
        : 1.35
      : 1.0;

  const nitroBonusMps = nitro.stacks * 7.8;
  const topCarMps =
    carStats.topMps *
    aeroTopMult *
    (car.blowerActive ? 1.07 : 1.0) *
    (car.vcamActive ? 1.05 : 1.0);

  if (car.gear === -1) {
    if (car.speed > 0.5) {
      car.speed = Math.max(0, car.speed - 28.0 * dt);
    } else {
      car.speed = Math.max(-11.5, car.speed - 11.5 * dt);
    }
    car.rpm = 0.28 + Math.min(0.65, Math.abs(car.speed) / 11.5);
    car.shiftLight = false;
  } else if (car.gear === 0) {
    const drag = 2.4 + Math.abs(car.speed) * 0.03;
    if (car.speed > 0) car.speed = Math.max(0, car.speed - drag * dt);
    else if (car.speed < 0) car.speed = Math.min(0, car.speed + 8.0 * dt);
    car.rpm = Math.max(0.18, car.rpm - dt * 1.5);
    car.shiftLight = false;
  } else {
    const { minFrac, maxFrac } = getGearBand(car.gear, car.maxGears);
    const gearMinSpeed = topCarMps * minFrac;
    const gearMaxSpeed = topCarMps * maxFrac + nitroBonusMps;

    if (car.speed < 0) {
      car.speed = Math.min(0, car.speed + 22.0 * dt);
    } else if (car.speed > gearMaxSpeed + 0.8) {
      const overSpeed = car.speed - gearMaxSpeed;
      const engineBrake = 16.5 + Math.min(19.0, overSpeed * 0.9);
      car.speed = Math.max(gearMaxSpeed, car.speed - engineBrake * dt);
    } else {
      const lugFactor =
        car.speed < gearMinSpeed * 0.78 ? 0.52 : car.speed < gearMinSpeed ? 0.82 : 1.0;
      const gearTorqueScale = 1.2 - ((car.gear - 1) / Math.max(1, car.maxGears - 1)) * 0.34;
      const pull =
        (carStats.accel *
          gearTorqueScale *
          lugFactor *
          blowerTorque *
          chokeTorque *
          vcamTorque +
          nitro.stacks * 10.5) *
        0.74;
      car.speed = Math.min(gearMaxSpeed, car.speed + pull * dt);
    }

    if (car.driftHeld && car.speed > 14) {
      car.speed = Math.max(14, car.speed - 9.2 * dt);
    }

    const bandSpan = Math.max(7, topCarMps * maxFrac - gearMinSpeed * 0.7);
    const rawRpm = 0.22 + ((car.speed - gearMinSpeed * 0.7) / bandSpan) * 0.76;
    car.rpm = Math.max(0.18, Math.min(0.99, rawRpm));
    car.shiftLight = car.gear < car.maxGears && car.rpm >= 0.89;
  }

  car.bumpPhase += dt * (2.2 + Math.abs(car.speed) * 0.22);
  if (!car.wheelHeld) {
    const centerStep = 0.82 * dt;
    if (Math.abs(car.wheelAngle) <= centerStep) {
      car.wheelAngle = 0;
    } else {
      car.wheelAngle -= Math.sign(car.wheelAngle) * centerStep;
    }
    const speedFactor = Math.min(1, Math.abs(car.speed) / 32);
    const nitroWobble = 1 + nitro.stacks * 0.65;
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
  const highSpeedDamp = 1 / (1 + Math.max(0, Math.abs(car.speed) - 30) * 0.015);
  const driftTurnMult = car.driftHeld ? 1.52 : 1.0;
  const steerRate =
    steerNorm * carStats.handling * aeroGripMult * lowSpeedRamp * highSpeedDamp * driftTurnMult;

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
    car.onCurb = car.jumpY < 0.1 && absLat >= 24.5 && absLat <= 28.0;
    car.offRoad = car.jumpY < 0.1 && absLat > 28.0;
    if (car.offRoad && car.speed > 34 && nitro.stacks === 0 && carStats.offRoadPenaltyMult > 0) {
      car.speed = Math.max(34, car.speed - 8.0 * carStats.offRoadPenaltyMult * dt);
    }
    const canyonWallLimit = 88.0;
    if (absLat > canyonWallLimit) {
      const sign = Math.sign(car.lateral);
      car.lateral = sign * canyonWallLimit;
      car.headingOffset = sign > 0 ? -0.18 : 0.18;
      if (car.wallHitCooldown <= 0 && Math.abs(car.speed) > 14) {
        hitWall = true;
        car.wallHitCooldown = 0.5;
        car.speed *= 0.78;
      }
    }
  } else {
    car.onCurb = car.jumpY < 0.1 && absLat >= 10.2 && absLat <= 12.1;
    car.offRoad = car.jumpY < 0.1 && absLat > 12.1;
    if (car.offRoad && car.speed > 22 && carStats.offRoadPenaltyMult > 0) {
      car.speed = Math.max(22, car.speed - 12.5 * carStats.offRoadPenaltyMult * dt);
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
        car.speed *= 0.8;
        if (!godMode) {
          const bumperSave = carStats.parts.bumper >= 1 ? 2 : 4;
          car.armor = Math.max(0, car.armor - bumperSave);
        }
        if (nitro.stacks >= 2) nitro.stacks -= 1;
      }
    }
  }

  if (godMode) car.armor = car.maxArmor;

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

  return { hitWall, lapCompleted, playerWrecked: !godMode && car.armor <= 0 };
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
