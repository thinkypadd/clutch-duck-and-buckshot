export const MAX_WHEEL_RAD = 2.2;
export const NITRO_PULL_COST = 32;
export const NITRO_STACK_DURATION = 5.2;
export const TOTAL_LAPS = 3;

export function createCarState() {
  return {
    s: 0.985, // Just behind start line on closed [0,1) loop
    lateral: -3.2, // Left grid slot (meters from road center)
    headingOffset: 0, // Angle relative to track tangent (radians)
    speed: 0, // m/s
    wheelAngle: 0, // [-MAX_WHEEL_RAD, MAX_WHEEL_RAD]
    wheelHeld: false,
    gasHeld: false,
    brakeHeld: false,
    gear: 1,
    rpm: 0.18,
    lap: 0, // 0 = pre-cross or lap 1 after crossing 0; tracked via unwrapped progress
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

export function createNitroState() {
  return {
    meter: 100, // 0..100 regenerating tank
    stacks: 0, // 0..3 active stacks
    stackTimer: 0,
    handlePos: 0, // 0 (top rest) .. 1 (bottom latch)
    dragging: false,
    latchedThisDrag: false,
    lowPsiFlash: 0,
  };
}

export function createShotgunState() {
  return {
    mode: 'HOLSTERED_READY', // 'HOLSTERED_READY' | 'EQUIPPED' | 'HOLSTERED_OPEN'
    chambers: ['live', 'live'], // each: 'live' | 'spent' | 'empty'
    strapShells: [true, true, true, true, true],
    strapRefillTimer: 0,
    recoil: 0,
    muzzleFlash: 0,
    holsterAlert: 0,
    wrecksCount: 0,
  };
}

export function countChambers(sg, type) {
  let c = 0;
  if (sg.chambers[0] === type) c++;
  if (sg.chambers[1] === type) c++;
  return c;
}

export function equipShotgun(sg) {
  if (sg.mode !== 'HOLSTERED_READY') return false;
  sg.mode = 'EQUIPPED';
  return true;
}

export function fireShotgun(sg) {
  if (sg.mode !== 'EQUIPPED') return { fired: false, dryFire: false };
  const idx = sg.chambers[0] === 'live' ? 0 : sg.chambers[1] === 'live' ? 1 : -1;
  if (idx === -1) {
    sg.holsterAlert = 1.0;
    return { fired: false, dryFire: true };
  }
  sg.chambers[idx] = 'spent';
  sg.recoil = 1.0;
  sg.muzzleFlash = 1.0;
  const remainingLive = countChambers(sg, 'live');
  if (remainingLive === 0) {
    sg.holsterAlert = 1.0;
  }
  return { fired: true, chamberIndex: idx, remainingLive };
}

export function holsterShotgun(sg) {
  if (sg.mode !== 'EQUIPPED') return false;
  const live = countChambers(sg, 'live');
  if (live === 0) {
    sg.mode = 'HOLSTERED_OPEN';
  } else {
    sg.mode = 'HOLSTERED_READY';
  }
  sg.holsterAlert = 0;
  return true;
}

export function openBreechForReload(sg) {
  if (sg.mode === 'EQUIPPED' && countChambers(sg, 'live') === 0) {
    sg.mode = 'HOLSTERED_OPEN';
    sg.holsterAlert = 0;
    return true;
  }
  if (sg.mode === 'HOLSTERED_READY' && countChambers(sg, 'live') < 2) {
    sg.mode = 'HOLSTERED_OPEN';
    return true;
  }
  return false;
}

export function ejectSpentShell(sg, chamberIndex) {
  if (sg.mode !== 'HOLSTERED_OPEN') return false;
  if (sg.chambers[chamberIndex] !== 'spent') return false;
  sg.chambers[chamberIndex] = 'empty';
  return true;
}

export function loadFreshShell(sg, strapIndex) {
  if (sg.mode !== 'HOLSTERED_OPEN') return { loaded: false };
  if (!sg.strapShells[strapIndex]) return { loaded: false };
  // Must eject spent shell from a chamber before a fresh shell can enter it
  const targetIdx = sg.chambers[0] === 'empty' ? 0 : sg.chambers[1] === 'empty' ? 1 : -1;
  if (targetIdx === -1) return { loaded: false };
  sg.strapShells[strapIndex] = false;
  sg.chambers[targetIdx] = 'live';
  return { loaded: true, chamberIndex: targetIdx };
}

export function canSnapClosed(sg) {
  return (
    sg.mode === 'HOLSTERED_OPEN' &&
    countChambers(sg, 'live') >= 1 &&
    countChambers(sg, 'spent') === 0
  );
}

export function snapShotgunClosed(sg) {
  if (!canSnapClosed(sg)) return false;
  sg.mode = 'HOLSTERED_READY';
  return true;
}

export function stepShotgunTimers(sg, dt) {
  sg.recoil = Math.max(0, sg.recoil - dt * 4.5);
  sg.muzzleFlash = Math.max(0, sg.muzzleFlash - dt * 11.0);
  sg.holsterAlert = Math.max(0, sg.holsterAlert - dt * 1.4);

  const missingIdx = sg.strapShells.indexOf(false);
  if (missingIdx !== -1) {
    sg.strapRefillTimer += dt;
    if (sg.strapRefillTimer >= 3.4) {
      sg.strapRefillTimer = 0;
      sg.strapShells[missingIdx] = true;
    }
  } else {
    sg.strapRefillTimer = 0;
  }
}

export function updateNitroDrag(nitro, normalizedPull) {
  if (!nitro.dragging || nitro.latchedThisDrag) return { triggered: false, lowPsi: false };
  nitro.handlePos = Math.max(0, Math.min(1, normalizedPull));
  if (nitro.handlePos >= 0.92) {
    if (nitro.meter < NITRO_PULL_COST && nitro.stacks < 3) {
      nitro.lowPsiFlash = 1.0;
      nitro.latchedThisDrag = true;
      nitro.dragging = false;
      return { triggered: false, lowPsi: true };
    }
    if (nitro.stacks < 3) {
      nitro.meter = Math.max(0, nitro.meter - NITRO_PULL_COST);
    }
    nitro.stacks = Math.min(3, nitro.stacks + 1);
    nitro.stackTimer = NITRO_STACK_DURATION;
    nitro.latchedThisDrag = true;
    nitro.dragging = false;
    return { triggered: true, stacks: nitro.stacks, lowPsi: false };
  }
  return { triggered: false, lowPsi: false };
}

export function stepNitro(nitro, dt) {
  if (!nitro.dragging) {
    nitro.handlePos = Math.max(0, nitro.handlePos - dt * 6.5);
    nitro.latchedThisDrag = false;
  }
  nitro.lowPsiFlash = Math.max(0, nitro.lowPsiFlash - dt * 2.5);

  const regenRate = nitro.stacks > 0 ? 5.2 : 10.5;
  nitro.meter = Math.min(100, nitro.meter + regenRate * dt);

  if (nitro.stacks > 0) {
    nitro.stackTimer -= dt;
    if (nitro.stackTimer <= 0) {
      nitro.stacks -= 1;
      nitro.stackTimer = nitro.stacks > 0 ? NITRO_STACK_DURATION * 0.72 : 0;
    }
  }
}

export function stepCarPhysics(car, nitro, trackCurvature, trackLength, raceTime, dt, canDrive = true) {
  const baseTopSpeed = 46; // ~138 MPH display
  const nitroBonus = nitro.stacks * 8.5; // up to +25.5 m/s (~214 MPH at 3X)
  const maxSpeed = baseTopSpeed + nitroBonus;

  if (canDrive && car.gasHeld) {
    const accel = 21.5 + nitro.stacks * 9.0;
    car.speed = Math.min(maxSpeed, car.speed + accel * dt);
  } else if (canDrive && car.brakeHeld) {
    if (car.speed > 0.5) {
      car.speed = Math.max(0, car.speed - 34.0 * dt);
    } else {
      car.speed = Math.max(-11.0, car.speed - 12.0 * dt);
    }
  } else {
    // Enviro-Bear momentum coasting: nitro stacks keep pushing even with hand off gas
    if (nitro.stacks > 0 && car.speed < maxSpeed) {
      car.speed = Math.min(maxSpeed, car.speed + nitro.stacks * 11.5 * dt);
    } else {
      const coastDrag = 2.35 + car.speed * 0.028;
      if (car.speed > 0) {
        car.speed = Math.max(0, car.speed - coastDrag * dt);
      } else if (car.speed < 0) {
        car.speed = Math.min(0, car.speed + 6.0 * dt);
      }
    }
  }

  // Wheel self-centering + road bump drift when released
  car.bumpPhase += dt * (2.2 + Math.abs(car.speed) * 0.22);
  if (!car.wheelHeld) {
    const centerStep = 0.78 * dt;
    if (Math.abs(car.wheelAngle) <= centerStep) {
      car.wheelAngle = 0;
    } else {
      car.wheelAngle -= Math.sign(car.wheelAngle) * centerStep;
    }
    const speedFactor = Math.min(1, Math.abs(car.speed) / 30);
    const nitroWobble = 1 + nitro.stacks * 0.85;
    const roadWander =
      (Math.sin(car.bumpPhase * 0.9) * 0.16 + Math.cos(car.bumpPhase * 2.1) * 0.09) *
      speedFactor *
      nitroWobble;
    car.wheelAngle = Math.max(
      -MAX_WHEEL_RAD,
      Math.min(MAX_WHEEL_RAD, car.wheelAngle + roadWander * dt)
    );
  }

  const steerNorm = car.wheelAngle / MAX_WHEEL_RAD; // [-1, 1]
  const lowSpeedRamp = Math.min(1, Math.abs(car.speed) / 8.0) * (car.speed >= 0 ? 1 : -1);
  // Progressive high-speed steering damping keeps the car planted instead of twitch-spinning at top speed
  const highSpeedDamp = 1 / (1 + Math.max(0, Math.abs(car.speed) - 28) * 0.015);
  const steerRate = steerNorm * 1.18 * lowSpeedRamp * highSpeedDamp;

  // Advance along spline
  const forwardSpeed = car.speed * Math.cos(car.headingOffset);
  const lateralSpeed = car.speed * Math.sin(car.headingOffset);

  const ds = forwardSpeed * dt / trackLength;
  // Road curvature induces apparent heading change relative to road tangent
  const curveHeadingDelta = trackCurvature * forwardSpeed * dt;
  car.headingOffset += steerRate * dt - curveHeadingDelta;
  car.headingOffset = Math.max(-1.25, Math.min(1.25, car.headingOffset));

  car.lateral += lateralSpeed * dt;

  // Road half-width = 9.0m, curbs = 9.0..10.3m, grass = 10.3..12.4m, guardrail = 12.4m
  const absLat = Math.abs(car.lateral);
  car.onCurb = absLat >= 8.6 && absLat <= 10.4;
  car.offRoad = absLat > 10.4;

  if (car.offRoad && car.speed > 18) {
    car.speed = Math.max(18, car.speed - 14.0 * dt);
  }

  let hitWall = false;
  car.wallHitCooldown = Math.max(0, car.wallHitCooldown - dt);
  const wallLimit = 12.2;
  if (absLat > wallLimit) {
    const sign = Math.sign(car.lateral);
    car.lateral = sign * wallLimit;
    // Deflect heading back toward road center
    if (sign > 0 && car.headingOffset > -0.08) {
      car.headingOffset = -0.14;
    } else if (sign < 0 && car.headingOffset < 0.08) {
      car.headingOffset = 0.14;
    }
    if (car.wallHitCooldown <= 0 && Math.abs(car.speed) > 12) {
      hitWall = true;
      car.wallHitCooldown = 0.45;
      car.speed *= 0.76;
      if (nitro.stacks >= 2) {
        nitro.stacks -= 1;
      }
    }
  }

  // Update spline s & lap counting
  const prevS = car.s;
  car.s = ((car.s + ds) % 1 + 1) % 1;
  car.totalProgress += ds;

  // Checkpoints at s ~ 0.25, 0.50, 0.75 prevent reverse-across-line lap exploits
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
      car.lap = Math.min(TOTAL_LAPS, car.completedLaps + 1);
      car.lapStartTime = raceTime;
      car.checkpointMask = 0;
      lapCompleted = true;
    }
  }

  // Gear & RPM calculation for gauge & synth
  const mph = Math.abs(car.speed) * 3.0;
  if (car.speed < -0.5) {
    car.gear = 0; // Reverse ('R')
    car.rpm = 0.3 + Math.min(0.65, Math.abs(car.speed) / 12);
  } else {
    const thresholds = [0, 32, 64, 98, 132, 240];
    let g = 1;
    for (let i = 1; i <= 5; i++) {
      if (mph >= thresholds[i - 1]) g = i;
    }
    car.gear = g;
    const low = thresholds[g - 1] * 0.72;
    const high = thresholds[g];
    const span = Math.max(18, high - low);
    const baseRpm = 0.22 + ((mph - low) / span) * 0.72;
    car.rpm = Math.max(0.16, Math.min(0.99, baseRpm + (car.gasHeld ? 0.08 : 0)));
  }

  return { hitWall, lapCompleted };
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
