import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createCarState,
  createNitroState,
  createShotgunState,
  countChambers,
  equipShotgun,
  fireShotgun,
  holsterShotgun,
  ejectSpentShell,
  loadFreshShell,
  canSnapClosed,
  snapShotgunClosed,
  updateNitroDrag,
  stepNitro,
  stepCarPhysics,
  TOTAL_LAPS,
} from '../src/logic.js';

// 1. Hold-to-press Gas & Coasting Momentum (Enviro-Bear 1-hand style)
{
  const car = createCarState();
  const nitro = createNitroState();

  car.gasHeld = true;
  for (let i = 0; i < 30; i++) {
    stepCarPhysics(car, nitro, 0, 1200, i * 0.1, 0.1, true);
  }
  const builtSpeed = car.speed;
  assert.ok(builtSpeed > 30, 'Holding gas builds high speed');

  // Let go of gas to steer/shoot: car coasts smoothly rather than stopping dead
  car.gasHeld = false;
  for (let i = 0; i < 20; i++) {
    stepCarPhysics(car, nitro, 0, 1200, 3 + i * 0.1, 0.1, true);
  }
  assert.ok(
    car.speed > builtSpeed * 0.55 && car.speed < builtSpeed,
    'Releasing gas coasts on momentum'
  );

  // While holding shotgun (canDrive = false), gas pedal cannot accelerate
  car.gasHeld = true;
  const speedBeforeGun = car.speed;
  stepCarPhysics(car, nitro, 0, 1200, 5.2, 0.2, false);
  assert.ok(car.speed < speedBeforeGun, 'Cannot press gas while hand holds shotgun');
}

// 2. Steering Wheel Self-Centering & Drift When Released
{
  const car = createCarState();
  const nitro = createNitroState();
  car.speed = 25;
  car.wheelAngle = 1.6;
  car.wheelHeld = false;

  for (let i = 0; i < 20; i++) {
    stepCarPhysics(car, nitro, 0, 1200, i * 0.1, 0.1, true);
  }
  assert.ok(Math.abs(car.wheelAngle) < 0.4, 'Released steering wheel gradually self-centers');
}

// 3. Nitro T-Handle Drag Down & Up-To-3X Stacking + Regeneration
{
  const nitro = createNitroState();
  for (let pull = 1; pull <= 3; pull++) {
    nitro.dragging = true;
    nitro.latchedThisDrag = false;
    const res = updateNitroDrag(nitro, 0.96);
    assert.equal(res.triggered, true, `Pull ${pull} triggers boost`);
    assert.equal(nitro.stacks, pull, `Stacks reach ${pull}X`);
    stepNitro(nitro, 0.3);
  }

  // 4th pull caps at 3X
  nitro.meter = 100;
  nitro.dragging = true;
  nitro.latchedThisDrag = false;
  updateNitroDrag(nitro, 0.98);
  assert.equal(nitro.stacks, 3, 'Nitro stack caps at 3X');

  // Meter regenerates over time
  nitro.meter = 20;
  stepNitro(nitro, 3.0);
  assert.ok(nitro.meter > 35, 'Nitro meter regenerates over time');
}

// 4. Full Sawed-Off Shotgun Combat & Tactile Visor Reload Cycle
{
  const sg = createShotgunState();
  assert.equal(sg.mode, 'HOLSTERED_READY');
  assert.equal(countChambers(sg, 'live'), 2);

  // Click gun on visor to equip
  assert.equal(equipShotgun(sg), true);
  assert.equal(sg.mode, 'EQUIPPED');

  // Fire barrel 1 & barrel 2
  const shot1 = fireShotgun(sg);
  assert.equal(shot1.fired, true);
  assert.equal(shot1.remainingLive, 1);

  const shot2 = fireShotgun(sg);
  assert.equal(shot2.fired, true);
  assert.equal(shot2.remainingLive, 0);

  // Dry fire when empty
  const shot3 = fireShotgun(sg);
  assert.equal(shot3.fired, false);
  assert.equal(shot3.dryFire, true);

  // Click empty gun back onto visor holster -> docks AND breaks open automatically
  assert.equal(holsterShotgun(sg), true);
  assert.equal(sg.mode, 'HOLSTERED_OPEN');
  assert.deepEqual(sg.chambers, ['spent', 'spent']);

  // Cannot load fresh shell before dragging spent hulls out
  assert.equal(loadFreshShell(sg, 0).loaded, false);
  assert.equal(canSnapClosed(sg), false);

  // Drag both spent shells out
  assert.equal(ejectSpentShell(sg, 0), true);
  assert.equal(ejectSpentShell(sg, 1), true);
  assert.deepEqual(sg.chambers, ['empty', 'empty']);

  // Drag 2 fresh shells from visor strap -> auto-snaps into chambers
  assert.equal(loadFreshShell(sg, 0).loaded, true);
  assert.equal(loadFreshShell(sg, 1).loaded, true);
  assert.deepEqual(sg.chambers, ['live', 'live']);
  assert.equal(sg.strapShells[0], false);
  assert.equal(sg.strapShells[1], false);

  // Click shotgun to snap closed
  assert.equal(canSnapClosed(sg), true);
  assert.equal(snapShotgunClosed(sg), true);
  assert.equal(sg.mode, 'HOLSTERED_READY');
}

// 5. 3-Lap Circuit Checkpoint & Lap Completion
{
  const car = createCarState();
  const nitro = createNitroState();
  car.gasHeld = true;
  let completedEvents = 0;

  // Drive full 3 laps around 300m test loop
  for (let step = 0; step < 900; step++) {
    const res = stepCarPhysics(car, nitro, 0, 300, step * 0.05, 0.05, true);
    if (res.lapCompleted) completedEvents++;
    if (car.completedLaps >= TOTAL_LAPS) break;
  }
  assert.equal(car.completedLaps, TOTAL_LAPS);
  assert.equal(completedEvents, TOTAL_LAPS);
}

// 6. Camera Roll Regression Check Across Full 360-Degree Headings (including +Z South)
{
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.35, 760);
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const lookDir = new THREE.Vector3(Math.sin(rad), -0.05, Math.cos(rad)).normalize();
    cam.position.set(0, 1.26, 0);
    cam.up.set(0, 1, 0);
    cam.lookAt(cam.position.clone().addScaledVector(lookDir, 25));
    cam.rotateZ(-0.025);
    const worldUpOfCam = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    assert.ok(worldUpOfCam.y > 0.99, `Camera stays upright at heading ${deg} deg`);
  }
}

console.log('ALL MECHANICS TESTS PASSED');
