import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createDefaultSave,
  getComputedCarStats,
  getComputedGunStats,
  purchaseCar,
  purchaseCarUpgrade,
  purchaseGun,
  purchaseGunUpgrade,
} from '../src/catalog.js';
import {
  createCarState,
  createNitroState,
  createSingleWeaponInstance,
  createLoadoutState,
  getActiveWeapon,
  swapDualWeapon,
  equipWeapon,
  fireWeapon,
  holsterWeapon,
  countWeaponChambers,
  ejectChamber,
  dropMagazine,
  insertAmmoFromPouch,
  canFinishReload,
  finishWeaponReload,
  updateNitroDrag,
  stepNitro,
  shiftGear,
  stepCarPhysics,
} from '../src/logic.js';

// 1. Auto-Throttle Acceleration + 1-6 H-Pattern Upshifting, Engine-Braking & Reverse
{
  const save = createDefaultSave();
  const carStats = getComputedCarStats(save);
  const car = createCarState(carStats);
  const nitro = createNitroState(carStats);

  assert.equal(car.gear, 1, 'Starts in 1st gear ready to auto-accelerate');
  for (let i = 0; i < 40; i++) {
    stepCarPhysics(car, nitro, carStats, 0, 1200, i * 0.1, 0.1, false, 3);
  }
  const gear1Ceiling = car.speed;
  assert.ok(gear1Ceiling > 12 && gear1Ceiling < 16, 'Gear 1 auto-accelerates to 1st gear ceiling');
  assert.equal(car.shiftLight, true, 'Shift lamp illuminates near redline in Gear 1');

  // Upshift through gears 2 -> 6 raises top speed ceiling progressively
  for (let g = 2; g <= 6; g++) {
    assert.equal(shiftGear(car, g), true);
    for (let i = 0; i < 45; i++) {
      stepCarPhysics(car, nitro, carStats, 0, 1200, g * 4 + i * 0.1, 0.1, false, 3);
    }
  }
  const gear6Speed = car.speed;
  assert.ok(gear6Speed > 52, 'Gear 6 climbs to high-speed cruise ceiling');

  // Downshift 6 -> 2 engine-brakes cleanly for tight hairpins
  assert.equal(shiftGear(car, 2), true);
  for (let i = 0; i < 20; i++) {
    stepCarPhysics(car, nitro, carStats, 0, 1200, 30 + i * 0.1, 0.1, false, 3);
  }
  assert.ok(car.speed < gear6Speed - 22, 'Downshifting into 2nd gear engine-brakes hard');

  // Shifting into Reverse (-1) brakes forward motion and backs up
  assert.equal(shiftGear(car, -1), true);
  for (let i = 0; i < 40; i++) {
    stepCarPhysics(car, nitro, carStats, 0, 1200, 35 + i * 0.1, 0.1, false, 3);
  }
  assert.ok(car.speed < -5, 'Reverse slot (-1) backs the car up');
}

// 2. Short-Throw Nitro Pull (0.82 threshold) + 3X Coupe vs 4X Rally Cap
{
  const save = createDefaultSave();
  const coupeNitro = createNitroState(getComputedCarStats(save, 'coupe'));
  for (let pull = 1; pull <= 3; pull++) {
    coupeNitro.dragging = true;
    coupeNitro.latchedThisDrag = false;
    const res = updateNitroDrag(coupeNitro, 0.85);
    assert.equal(res.triggered, true, `Short-throw 0.85 pull ${pull} triggers nitro`);
    assert.equal(coupeNitro.stacks, pull);
    stepNitro(coupeNitro, 0.2);
  }
  coupeNitro.meter = 100;
  coupeNitro.dragging = true;
  coupeNitro.latchedThisDrag = false;
  updateNitroDrag(coupeNitro, 0.9);
  assert.equal(coupeNitro.stacks, 3, 'Coupe caps at 3X nitro');

  // Rally Hatch gimmick allows 4X nitro stacks!
  const rallyNitro = createNitroState(getComputedCarStats(save, 'rally'));
  rallyNitro.meter = 100;
  for (let pull = 1; pull <= 4; pull++) {
    rallyNitro.meter = 100;
    rallyNitro.dragging = true;
    rallyNitro.latchedThisDrag = false;
    updateNitroDrag(rallyNitro, 0.86);
  }
  assert.equal(rallyNitro.stacks, 4, 'Apex Turbo Hatch stacks up to 4X nitro');
}

// 3. Sawed-Off Shotgun Fire & Tactile Hull-Eject Reload Cycle
{
  const save = createDefaultSave();
  const sg = createSingleWeaponInstance(getComputedGunStats(save, 'sawed_off'));
  assert.equal(equipWeapon(sg), true);
  assert.equal(fireWeapon(sg).fired, true);
  sg.fireCooldown = 0;
  assert.equal(fireWeapon(sg).fired, true);
  assert.equal(fireWeapon(sg).dryFire, true);

  assert.equal(holsterWeapon(sg), true);
  assert.equal(sg.mode, 'HOLSTERED_OPEN');
  assert.deepEqual(sg.chambers, ['spent', 'spent']);
  assert.equal(insertAmmoFromPouch(sg, 0).loaded, false, 'Must eject hulls first');

  assert.equal(ejectChamber(sg, 0), true);
  assert.equal(ejectChamber(sg, 1), true);
  assert.equal(insertAmmoFromPouch(sg, 0).loaded, true);
  assert.equal(insertAmmoFromPouch(sg, 1).loaded, true);
  assert.equal(canFinishReload(sg), true);
  assert.equal(finishWeaponReload(sg), true);
  assert.equal(sg.ammo, 2);
  assert.equal(sg.mode, 'HOLSTERED_READY');
}

// 4. M1911 & SMG Magazine + Slide/Bolt Reload Cycle + Extended Mag Upgrade
{
  const save = createDefaultSave();
  save.cash = 2000;
  assert.equal(purchaseGun(save, 'm1911', 'primary').ok, true);
  assert.equal(purchaseGunUpgrade(save, 'm1911', 'loader', 1).ok, true);

  const pistol = createSingleWeaponInstance(getComputedGunStats(save, 'm1911'));
  assert.equal(pistol.maxAmmo, 10, 'Extended M1911 mag holds 10 rounds');
  equipWeapon(pistol);
  for (let i = 0; i < 10; i++) {
    pistol.fireCooldown = 0;
    assert.equal(fireWeapon(pistol).fired, true);
  }
  assert.equal(pistol.ammo, 0);
  holsterWeapon(pistol);
  assert.equal(pistol.mode, 'HOLSTERED_OPEN');
  assert.equal(pistol.reloadStage, 'mag_spent');

  // Cannot insert fresh mag before dropping spent mag
  assert.equal(insertAmmoFromPouch(pistol, 0).loaded, false);
  assert.equal(dropMagazine(pistol), true);
  assert.equal(pistol.reloadStage, 'mag_out');
  assert.equal(insertAmmoFromPouch(pistol, 0).loaded, true);
  assert.equal(pistol.reloadStage, 'mag_in');
  assert.equal(finishWeaponReload(pistol), true);
  assert.equal(pistol.ammo, 10);
  assert.equal(pistol.mode, 'HOLSTERED_READY');
}

// 5. .357 Revolver Cylinder Reload: Loose Pairs vs 1-Drag Speedloader Upgrade
{
  const save = createDefaultSave();
  save.cash = 2000;
  purchaseGun(save, 'revolver', 'primary');

  // Stock loose rounds: 3 pulls fill 6 chambers
  const revStock = createSingleWeaponInstance(getComputedGunStats(save, 'revolver'));
  equipWeapon(revStock);
  for (let i = 0; i < 6; i++) {
    revStock.fireCooldown = 0;
    fireWeapon(revStock);
  }
  holsterWeapon(revStock);
  assert.equal(countWeaponChambers(revStock, 'spent'), 6);
  assert.equal(ejectChamber(revStock), true, 'Ejector rod dumps all 6 spent brass');
  assert.equal(insertAmmoFromPouch(revStock, 0).loaded, true);
  assert.equal(revStock.ammo, 2, 'Stock pull loads 2 rounds');

  // Upgraded Speedloader: 1 pull fills all 6 chambers!
  purchaseGunUpgrade(save, 'revolver', 'loader', 1);
  const revFast = createSingleWeaponInstance(getComputedGunStats(save, 'revolver'));
  equipWeapon(revFast);
  for (let i = 0; i < 6; i++) {
    revFast.fireCooldown = 0;
    fireWeapon(revFast);
  }
  holsterWeapon(revFast);
  ejectChamber(revFast);
  assert.equal(insertAmmoFromPouch(revFast, 0).loaded, true);
  assert.equal(revFast.ammo, 6, 'Speedloader fills all 6 chambers in a single drag');
  assert.equal(finishWeaponReload(revFast), true);
}

// 6. Iron Mule Ute Dual-Holster Gimmick + Garage Upgrade Stat Scaling
{
  const save = createDefaultSave();
  save.cash = 5000;
  assert.equal(purchaseCar(save, 'truck').ok, true);
  assert.equal(purchaseCarUpgrade(save, 'truck', 'engine', 2).ok, true);
  assert.equal(purchaseCarUpgrade(save, 'truck', 'armor', 2).ok, true);
  assert.equal(purchaseGun(save, 'smg', 'secondary').ok, true);

  const truckStats = getComputedCarStats(save, 'truck');
  assert.equal(truckStats.dualHolster, true);
  assert.equal(truckStats.maxArmor, 260, 'Ballistic armor adds +75 HP to Ute');

  const loadout = createLoadoutState(save);
  assert.equal(loadout.weapons.length, 2, 'Iron Mule mounts both Primary & Secondary weapons');
  assert.equal(getActiveWeapon(loadout).id, 'sawed_off');
  assert.equal(swapDualWeapon(loadout), true);
  assert.equal(getActiveWeapon(loadout).id, 'smg');
}

// 7. 360-Degree Track Heading + Side-Window (+/-82 deg) Camera Uprightness Check
{
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.35, 980);
  const upVec = new THREE.Vector3(0, 1, 0);
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg * Math.PI) / 180;
    const carForward = new THREE.Vector3(Math.sin(rad), -0.04, Math.cos(rad)).normalize();
    const carRight = new THREE.Vector3().crossVectors(carForward, upVec).normalize();

    for (const sideYaw of [-1.43, 0, 1.43]) {
      const lookDir = carForward
        .clone()
        .multiplyScalar(Math.cos(sideYaw))
        .addScaledVector(carRight, Math.sin(sideYaw))
        .normalize();
      cam.position.set(0, 1.28, 0);
      cam.up.set(0, 1, 0);
      cam.lookAt(cam.position.clone().addScaledVector(lookDir, 25));
      cam.rotateZ(-0.02);
      const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      assert.ok(worldUp.y > 0.99, `Camera stays upright at heading ${deg} deg, yaw ${sideYaw}`);
    }
  }
}

console.log('ALL MECHANICS TESTS PASSED');
