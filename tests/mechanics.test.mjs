import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CARS,
  GUNS,
  NITRO_STAGE_COLORS,
  createDefaultSave,
  loadSave,
  persistSave,
  isCarUpgradeOwned,
  isGunUpgradeOwned,
  getComputedCarStats,
  getComputedGunStats,
  purchaseCar,
  getCarTradeInValue,
  sellCar,
  purchaseCarUpgrade,
  purchaseGun,
  purchaseGunUpgrade,
  unlockEverythingDev,
} from '../src/catalog.js';
import {
  getGearBand,
  getNitroStageInfo,
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
  triggerHydroJump,
  triggerBackfire,
  deployTrunkHazard,
  stepCarPhysics,
} from '../src/logic.js';
import { buildVehicle3D, updateVehiclePanels } from '../src/carMesh.js';
import { getHGateLayout } from '../src/cockpit.js';
import { createCabin3DRig } from '../src/cockpit3d.js';

// 1. v3 Starter Economy & Loadout: $0 Cash, 3-Speed Rustbucket, M1911, Uninstalled Nitro & Empty Trunk
{
  const save = createDefaultSave();
  assert.equal(save.cash, 0, 'Starter save begins with $0 cash');
  assert.equal(save.selectedCar, 'junker', 'Starter car is 74 Rustbucket');
  assert.equal(save.primaryGun, 'm1911', 'Starter weapon is M1911 .45 Pistol');
  assert.equal(Boolean(save.ownedGuns.sawed_off), false, 'Sawed-Off 12G requires Gun Shop purchase');

  const stats = getComputedCarStats(save);
  assert.equal(stats.maxGears, 3, '74 Rustbucket starts as a 3-speed');
  assert.equal(stats.maxNitroStacks, 0, 'Starter car has no Nitro installed');
  assert.equal(stats.trunkType, 'none', 'Starter car has an empty trunk bay');

  const nitro = createNitroState(stats);
  assert.equal(nitro.installed, false);
  nitro.dragging = true;
  const pullRes = updateNitroDrag(nitro, 0.95);
  assert.equal(pullRes.triggered, false);
  assert.equal(pullRes.uninstalled, true, 'Pulling uninstalled Nitro reports uninstalled');
}

// 2. Dynamic 3..8-Speed H-Pattern Gearboxes, Auto-Throttle, Engine-Braking & Reverse
{
  for (const gears of [3, 4, 5, 6, 7, 8]) {
    const bandTop = getGearBand(gears, gears);
    assert.equal(bandTop.maxFrac, 1.0, `${gears}-speed top gear reaches 100% top speed`);
    const gate = getHGateLayout(gears);
    assert.equal(gate.pockets.length, gears + 1, `${gears}-speed gate has ${gears} forward pockets + R`);
    assert.equal(gate.pockets[gate.pockets.length - 1].gear, -1);
    assert.equal(gate.pockets[gate.pockets.length - 1].label, 'R');
  }

  const save = createDefaultSave();
  save.cash = 10000;
  assert.equal(purchaseCar(save, 'hyper').ok, true);
  assert.equal(purchaseCarUpgrade(save, 'hyper', 'trans', 2).ok, true);

  const hyperStats = getComputedCarStats(save, 'hyper');
  assert.equal(hyperStats.maxGears, 8, 'Upgraded Valkyrie GT-X unlocks 8-speed titanium gate');

  const car = createCarState(hyperStats);
  const nitro = createNitroState(hyperStats);
  assert.equal(car.gear, 1);

  for (let i = 0; i < 35; i++) {
    stepCarPhysics(car, nitro, hyperStats, 0, 1400, i * 0.1, 0.1, false, 3);
  }
  const gear1Speed = car.speed;
  assert.ok(gear1Speed > 10 && gear1Speed < 18);
  assert.equal(car.shiftLight, true);

  for (let g = 2; g <= 8; g++) {
    assert.equal(shiftGear(car, g, hyperStats.maxGears), true);
    for (let i = 0; i < 35; i++) {
      stepCarPhysics(car, nitro, hyperStats, 0, 1400, g * 4 + i * 0.1, 0.1, false, 3);
    }
  }
  const gear8Speed = car.speed;
  assert.ok(gear8Speed > 65, '8th gear climbs near hypercar top speed');
  assert.equal(shiftGear(car, 9, hyperStats.maxGears), false, 'Cannot shift past maxGears');

  // Downshift 8 -> 2 engine-brakes hard
  assert.equal(shiftGear(car, 2, hyperStats.maxGears), true);
  for (let i = 0; i < 20; i++) {
    stepCarPhysics(car, nitro, hyperStats, 0, 1400, 40 + i * 0.1, 0.1, false, 3);
  }
  assert.ok(car.speed < gear8Speed - 30, 'Downshifting into 2nd gear engine-brakes');

  // Reverse (-1) backs up
  assert.equal(shiftGear(car, -1, hyperStats.maxGears), true);
  for (let i = 0; i < 45; i++) {
    stepCarPhysics(car, nitro, hyperStats, 0, 1400, 50 + i * 0.1, 0.1, false, 3);
  }
  assert.ok(car.speed < -5, 'Reverse slot (-1) backs the vehicle up');
}

// 3. Pure Color Nitro Progression: Green (T1) -> Blue (T2) -> Red (T3) -> Purple (Rally + T3)
{
  const save = createDefaultSave();
  save.cash = 10000;
  purchaseCar(save, 'coupe');

  purchaseCarUpgrade(save, 'coupe', 'nitro', 1);
  const t1Nitro = createNitroState(getComputedCarStats(save, 'coupe'));
  assert.equal(t1Nitro.installed, true);
  assert.equal(t1Nitro.maxStacks, 1);
  t1Nitro.dragging = true;
  const pull1 = updateNitroDrag(t1Nitro, 0.86);
  assert.equal(pull1.triggered, true);
  assert.equal(pull1.stageName, 'GREEN');
  assert.equal(pull1.stageColor, NITRO_STAGE_COLORS[0]);

  purchaseCarUpgrade(save, 'coupe', 'nitro', 3);
  const t3Nitro = createNitroState(getComputedCarStats(save, 'coupe'));
  assert.equal(t3Nitro.maxStacks, 3);
  for (let p = 1; p <= 3; p++) {
    t3Nitro.meter = 100;
    t3Nitro.dragging = true;
    t3Nitro.latchedThisDrag = false;
    updateNitroDrag(t3Nitro, 0.86);
  }
  assert.equal(getNitroStageInfo(t3Nitro.stacks).name, 'RED');

  // Apex Turbo Hatch with Tier 3 N2O unlocks 4th PURPLE stage
  purchaseCar(save, 'rally');
  purchaseCarUpgrade(save, 'rally', 'nitro', 3);
  const rallyNitro = createNitroState(getComputedCarStats(save, 'rally'));
  assert.equal(rallyNitro.maxStacks, 4);
  for (let p = 1; p <= 4; p++) {
    rallyNitro.meter = 100;
    rallyNitro.dragging = true;
    rallyNitro.latchedThisDrag = false;
    updateNitroDrag(rallyNitro, 0.88);
  }
  assert.equal(rallyNitro.stacks, 4);
  assert.equal(getNitroStageInfo(rallyNitro.stacks).name, 'PURPLE');
  assert.equal(getNitroStageInfo(rallyNitro.stacks).color, '#b84dff');
  stepNitro(rallyNitro, 0.25);
  assert.equal(rallyNitro.stacks, 4);
}

// 4. Persistent Upgrade Ownership (Free Downgrade & Re-Equip), Non-Mutating Preview & 70% Car Trade-In
{
  const save = createDefaultSave();
  save.cash = 2500;

  // Previewing Tier 3 intake does NOT buy or mutate save
  const previewStats = getComputedCarStats(save, 'junker', { intake: 3 });
  assert.ok(previewStats.accel > getComputedCarStats(save, 'junker').accel);
  assert.equal(save.carParts.junker.intake, 0, 'Preview leaves equipped tier unchanged');
  assert.equal(isCarUpgradeOwned(save, 'junker', 'intake', 3), false);

  // Buy Tier 2 Trunk (Caltrops $390), downgrade to Empty (0), buy Tier 1 (Oil $240), re-equip Tier 2 for $0
  const beforeCash = save.cash;
  assert.equal(purchaseCarUpgrade(save, 'junker', 'trunk', 2).ok, true);
  const afterBuyT2 = save.cash;
  assert.ok(afterBuyT2 < beforeCash);
  assert.equal(isCarUpgradeOwned(save, 'junker', 'trunk', 2), true);

  // Downgrade to Stock Tier 0 costs $0 and preserves Tier 2 ownership
  const downRes = purchaseCarUpgrade(save, 'junker', 'trunk', 0);
  assert.equal(downRes.ok, true);
  assert.equal(downRes.equippedOnly, true);
  assert.equal(save.cash, afterBuyT2);
  assert.equal(save.carParts.junker.trunk, 0);
  assert.equal(isCarUpgradeOwned(save, 'junker', 'trunk', 2), true);

  // Re-equipping owned Tier 2 costs $0
  const reEquip = purchaseCarUpgrade(save, 'junker', 'trunk', 2);
  assert.equal(reEquip.ok, true);
  assert.equal(reEquip.equippedOnly, true);
  assert.equal(save.cash, afterBuyT2, 'Re-equipping already owned car mod is free');
  assert.equal(save.carParts.junker.trunk, 2);

  // Gun upgrade ownership persists identically
  assert.equal(purchaseGunUpgrade(save, 'm1911', 'ammo', 3).ok, true);
  const cashAfterGunMod = save.cash;
  purchaseGunUpgrade(save, 'm1911', 'ammo', 0);
  assert.equal(isGunUpgradeOwned(save, 'm1911', 'ammo', 3), true);
  purchaseGunUpgrade(save, 'm1911', 'ammo', 3);
  assert.equal(save.cash, cashAfterGunMod, 'Re-equipping owned gun ammo mod is free');

  // Cannot sell your last remaining car
  assert.equal(sellCar(save, 'junker').ok, false);

  // Buy 86 Kuruma Coupe ($450) + Block T1 ($240) = $690 invested -> 70% trade-in = $483
  assert.equal(purchaseCar(save, 'coupe').ok, true);
  assert.equal(purchaseCarUpgrade(save, 'coupe', 'block', 1).ok, true);
  const expectedRefund = Math.round((450 + 240) * 0.7);
  assert.equal(getCarTradeInValue(save, 'coupe'), expectedRefund);
  const cashBeforeSell = save.cash;
  const sellRes = sellCar(save, 'coupe');
  assert.equal(sellRes.ok, true);
  assert.equal(sellRes.refund, expectedRefund);
  assert.equal(save.cash, cashBeforeSell + expectedRefund);
  assert.equal(Boolean(save.ownedCars.coupe), false);
  assert.equal(save.selectedCar, 'junker');

  // Persistence round-trip via mock storage
  const mem = new Map();
  const mockStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
  };
  mockStorage.setItem('clutch_buckshot_save_v3', JSON.stringify(save));
  const reloaded = loadSave(mockStorage);
  assert.equal(isCarUpgradeOwned(reloaded, 'junker', 'trunk', 2), true);
  assert.equal(isGunUpgradeOwned(reloaded, 'm1911', 'ammo', 3), true);
}

// 5. Car Gimmicks, Trunk Countermeasures, Off-Road Immunity & God Mode
{
  const save = createDefaultSave();
  save.cash = 20000;
  purchaseCar(save, 'buggy');
  purchaseCarUpgrade(save, 'buggy', 'trunk', 3); // Proximity Mine

  const buggyStats = getComputedCarStats(save, 'buggy');
  assert.equal(buggyStats.offRoadPenaltyMult, 0, 'Baja Dune Buggy ignores off-road speed drag');
  assert.equal(buggyStats.trunkType, 'mine');

  const buggy = createCarState(buggyStats);
  const nitro = createNitroState(buggyStats);

  assert.equal(triggerHydroJump(buggy), true, 'Hydro-Jump launches vertical shock arc');
  assert.equal(triggerHydroJump(buggy), false, 'Cannot double-jump mid-air');
  stepCarPhysics(buggy, nitro, buggyStats, 0, 1200, 0.2, 0.2, true, 3);
  assert.ok(buggy.jumpY > 0.8, 'Buggy rises >0.8m to clear burning wrecks');

  const dep1 = deployTrunkHazard(buggy, buggyStats);
  assert.equal(dep1.deployed, true);
  assert.equal(dep1.type, 'mine');
  assert.equal(deployTrunkHazard(buggy, buggyStats).deployed, false, 'Trunk respects recharge cooldown');

  // Rotary backfire cooldown
  assert.equal(triggerBackfire(buggy), true);
  assert.equal(buggy.backfireFlash, 1.0);
  assert.equal(triggerBackfire(buggy), false);

  // Iron Mule Ute Dual Visor Holsters
  purchaseCar(save, 'truck');
  purchaseGun(save, 'smg', 'secondary');
  const loadout = createLoadoutState(save);
  assert.equal(loadout.weapons.length, 2, 'Iron Mule mounts Primary + Secondary visor guns');
  assert.equal(getActiveWeapon(loadout).id, 'm1911');
  assert.equal(swapDualWeapon(loadout), true);
  assert.equal(getActiveWeapon(loadout).id, 'smg');
}

// 6. All 6 Weapon Reload Families Across the 8-Gun Arsenal
{
  const save = createDefaultSave();
  unlockEverythingDev(save);
  assert.equal(Object.keys(CARS).length, 8, '8 cars in roster');
  assert.equal(Object.keys(GUNS).length, 8, '8 guns in roster');

  // 6A. Sawed-Off 12G (break_2)
  const sawed = createSingleWeaponInstance(getComputedGunStats(save, 'sawed_off'));
  equipWeapon(sawed);
  fireWeapon(sawed);
  sawed.fireCooldown = 0;
  fireWeapon(sawed);
  holsterWeapon(sawed);
  assert.equal(ejectChamber(sawed, 0), true);
  assert.equal(ejectChamber(sawed, 1), true);
  assert.equal(insertAmmoFromPouch(sawed, 0).loaded, true);
  assert.equal(insertAmmoFromPouch(sawed, 1).loaded, true);
  assert.equal(finishWeaponReload(sawed), true);
  assert.equal(sawed.ammo, 2);

  // 6B. M79 40mm Thumper (break_1 explosive grenade launcher)
  const m79 = createSingleWeaponInstance(getComputedGunStats(save, 'thumper'));
  assert.ok(m79.stats.splashRadius >= 11.5, 'M79 carries AoE blast radius');
  equipWeapon(m79);
  assert.equal(fireWeapon(m79).fired, true);
  assert.equal(fireWeapon(m79).dryFire, true);
  holsterWeapon(m79);
  assert.equal(ejectChamber(m79, 0), true);
  assert.equal(insertAmmoFromPouch(m79, 0).loaded, true);
  assert.equal(finishWeaponReload(m79), true);
  assert.equal(m79.ammo, 1);

  // 6C. Draco 7.62 AK (mag_slide with 45-rd drum loader T2)
  purchaseGunUpgrade(save, 'ak_shorty', 'loader', 2);
  const ak = createSingleWeaponInstance(getComputedGunStats(save, 'ak_shorty'));
  assert.equal(ak.maxAmmo, 45);
  equipWeapon(ak);
  ak.ammo = 1;
  fireWeapon(ak);
  holsterWeapon(ak);
  assert.equal(dropMagazine(ak), true);
  assert.equal(insertAmmoFromPouch(ak, 0).loaded, true);
  assert.equal(finishWeaponReload(ak), true);
  assert.equal(ak.ammo, 45);

  // 6D. .357 Magnum Revolver: Stock loose pairs vs Tier 2 1-Drag Speedloader
  const revStock = createSingleWeaponInstance(getComputedGunStats(save, 'revolver', { loader: 0 }));
  equipWeapon(revStock);
  revStock.ammo = 1;
  revStock.chambers = ['live', 'spent', 'spent', 'spent', 'spent', 'spent'];
  fireWeapon(revStock);
  holsterWeapon(revStock);
  assert.equal(ejectChamber(revStock), true);
  assert.equal(insertAmmoFromPouch(revStock, 0).loaded, true);
  assert.equal(revStock.ammo, 2);

  const revSpeed = createSingleWeaponInstance(getComputedGunStats(save, 'revolver', { loader: 2 }));
  equipWeapon(revSpeed);
  revSpeed.ammo = 1;
  revSpeed.chambers = ['live', 'spent', 'spent', 'spent', 'spent', 'spent'];
  fireWeapon(revSpeed);
  holsterWeapon(revSpeed);
  ejectChamber(revSpeed);
  assert.equal(insertAmmoFromPouch(revSpeed, 0).loaded, true);
  assert.equal(revSpeed.ammo, 6, 'Tier 2 Speedloader fills all 6 chambers in 1 drag');
  assert.equal(finishWeaponReload(revSpeed), true);

  // 6E. Trench Pump 12G (tube_pump + Tier 2 Hair-Trigger Slam-Fire auto)
  const pumpStats = getComputedGunStats(save, 'pump_shotgun', { action: 2, loader: 2 });
  assert.equal(pumpStats.isAuto, true, 'Trench Pump unlocks hold-click Slam-Fire at Action T2');
  const pump = createSingleWeaponInstance(pumpStats);
  equipWeapon(pump);
  pump.ammo = 1;
  fireWeapon(pump);
  holsterWeapon(pump);
  assert.equal(insertAmmoFromPouch(pump, 0).loaded, true);
  assert.equal(pump.ammo, pump.maxAmmo, 'Fast shell caddy fills pump tube');
  assert.equal(canFinishReload(pump), true);
  assert.equal(finishWeaponReload(pump), true);

  // 6F. Mares Leg .45-70 (lever_gate)
  const lever = createSingleWeaponInstance(getComputedGunStats(save, 'lever_rifle', { loader: 0 }));
  equipWeapon(lever);
  lever.ammo = 1;
  fireWeapon(lever);
  holsterWeapon(lever);
  assert.equal(insertAmmoFromPouch(lever, 0).loaded, true);
  assert.equal(lever.ammo, 3);
  assert.equal(finishWeaponReload(lever), true);
  assert.equal(lever.mode, 'HOLSTERED_READY');
}

// 7. Articulated 3D Mechanic Panels (Hood + Prop Rod, Driver Door, Trunk) Across All 8 Cars
{
  for (const cid of Object.keys(CARS)) {
    const mesh = buildVehicle3D(CARS[cid], {
      block: 3,
      intake: 3,
      cooling: 3,
      trans: 3,
      nitro: 3,
      trunk: 4,
      armor: 3,
      bumper: 3,
      tires: 3,
    });
    assert.ok(mesh.userData.pivots.hood, `${cid} has hinged hood pivot`);
    assert.ok(mesh.userData.pivots.doorLeft, `${cid} has hinged driver door pivot`);
    assert.ok(mesh.userData.pivots.trunk, `${cid} has hinged trunk pivot`);

    for (let i = 0; i < 20; i++) {
      updateVehiclePanels(mesh, { hood: true, door: true, trunk: true }, 0.1);
    }
    assert.ok(mesh.userData.pivots.hood.rotation.x > 0.85, `${cid} hood swings open`);
    assert.ok(mesh.userData.pivots.doorLeft.rotation.y < -0.95, `${cid} door swings open`);
    assert.ok(mesh.userData.pivots.trunk.rotation.x < -0.85, `${cid} trunk swings open`);
    assert.equal(mesh.userData.pivots.propRod.visible, true, `${cid} prop rod engages when hood opens`);
  }
}

// 8. 3D Perspective Cabin Ray-Plane Projection & 360-Degree World Camera Uprightness
{
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ imageSmoothingEnabled: false, getImageData: () => ({ data: [0, 0, 0, 0] }) }),
    }),
  };
  try {
    const dummyRearTex = new THREE.Texture();
    const rig = createCabin3DRig(dummyRearTex);

    // Looking straight ahead hits windshield center (240, 135)
    rig.updateCamera(0, 0, 0, 0, 0, 0);
    const fwdHit = rig.projectToLayer('windshield', 0, 0);
    assert.equal(fwdHit.inBounds, true);
    assert.ok(Math.abs(fwdHit.x - 240) < 2 && Math.abs(fwdHit.y - 135) < 2);

    // Looking left (-1) rotates head toward angled leftDoor plane
    rig.updateCamera(-1, 0, 0, 0, 0, 0);
    assert.equal(rig.projectToLayer('leftDoor', 0, 0).inBounds, true);
    assert.equal(rig.projectToLayer('windshield', 0, 0), null);

    // Looking right (+1) rotates head toward angled rightDoor plane, and rearWall seals cabin back
    rig.updateCamera(1, 0, 0, 0, 0, 0);
    assert.equal(rig.projectToLayer('rightDoor', 0, 0).inBounds, true);
    assert.equal(rig.projectToLayer('windshield', 0, 0), null);
    assert.ok(rig.layers.rearWall, 'Rear bulkhead layer seals back of 3D cabin');
    for (const mode of ['classic_25d', 'coupe_3d', 'classic_25d']) {
      rig.setMode(mode);
      const coupe = mode === 'coupe_3d';
      assert.equal(rig.camera.position.x, coupe ? -0.34 : 0);
      assert.equal(rig.layers.windshield.mesh.rotation.x > 0.5, coupe);
      assert.equal(rig.layers.dash.mesh.geometry.attributes.position.getZ(2) > 0.1, coupe);
      const glassTop = rig.layers.windshield.mesh.localToWorld(new THREE.Vector3(0, 0.5, 0));
      const glassBottom = rig.layers.windshield.mesh.localToWorld(new THREE.Vector3(0, -0.5, 0));
      assert.equal(glassTop.z > glassBottom.z, coupe, 'Coupe windshield slopes toward the driver at the roof');
      for (const name of ['leftDoor', 'rightDoor']) {
        const door = rig.layers[name].mesh;
        const top = door.localToWorld(new THREE.Vector3(0, 0.5, 0));
        const bottom = door.localToWorld(new THREE.Vector3(0, -0.5, 0));
        assert.equal(Math.abs(top.x) < Math.abs(bottom.x) - 0.01, coupe,
          'Coupe window tops tilt inward');
      }
      rig.updateCamera(0, 0, 0, 0, 3, 4);
      assert.ok(Math.abs(rig.camera.position.x - (coupe ? -0.34 : 0) - 0.0066) < 1e-8,
        'Shake preserves the driver seat offset');

      for (const layer of Object.values(rig.layers)) {
        assert.ok(Math.abs(layer.geoW / layer.geoH - layer.width / layer.height) < 1e-8,
          `${mode} ${layer.width}x${layer.height} uses square texels`);
      }
      for (const yaw of [-1, -0.5, 0, 0.5, 1]) {
        rig.updateCamera(yaw, 0, 0, 0, 0, 0);
        for (const [name, x, y] of [
          ['windshield', 97, 29], ['windshield', 320, 45],
          ['wheelPull', 114, 84], ['wheelPull', 350, 58],
          ['dash', 245, 32], ['dash', 224, 70], ['dash', 284, 113],
        ]) {
          const layer = rig.layers[name];
          let local = new THREE.Vector3((x / layer.width - 0.5) * layer.geoW,
            (0.5 - y / layer.height) * layer.geoH, 0);
          if (name === 'dash' && coupe) {
            const span = Math.min(Math.max(x - 184, 0), 126) * layer.geoW / layer.width;
            local.x += span * (Math.cos(THREE.MathUtils.degToRad(14)) - 1);
            local.z = span * Math.sin(THREE.MathUtils.degToRad(14));
          }
          const world = layer.mesh.localToWorld(local);
          const cameraLocal = world.clone().applyMatrix4(rig.camera.matrixWorldInverse);
          const ndc = world.project(rig.camera);
          if (cameraLocal.z >= -0.08) continue;
          const hit = rig.projectToLayer(name, ndc.x, ndc.y, true);
          assert.ok(hit, `${mode} ${name} projects at yaw ${yaw}`);
          assert.ok(Math.abs(hit.x - x) < 0.001 && Math.abs(hit.y - y) < 0.001,
            `${mode} ${name} preserves control coordinates at yaw ${yaw}`);
          if (yaw === 0) {
            assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1,
              `${mode} ${name} control is on screen`);
          }
        }
      }

      rig.updateCamera(0, 0, 0, 0, 0, 0);
      const wheel = rig.layers.wheelPull;
      const wheelEdges = [[66, 84], [162, 84], [114, 36], [114, 132]].map(([x, y]) =>
        wheel.mesh.localToWorld(new THREE.Vector3((x / 480 - 0.5) * wheel.geoW,
          (0.5 - y / 140) * wheel.geoH, 0)).project(rig.camera));
      const wheelWidth = (wheelEdges[1].x - wheelEdges[0].x) * 240;
      const wheelHeight = (wheelEdges[2].y - wheelEdges[3].y) * 135;
      assert.ok(Math.abs(wheelWidth - wheelHeight) < 1e-6, 'Forward wheel projects as a circle');
      assert.ok(wheelEdges.every(p => Math.abs(p.x) < 1 && Math.abs(p.y) < 1),
        'The full wheel rim stays on screen');
      const wheelCenter = wheel.mesh.localToWorld(new THREE.Vector3(
        (114 / 480 - 0.5) * wheel.geoW, (0.5 - 84 / 140) * wheel.geoH, 0)).project(rig.camera);
      assert.ok(rig.projectToLayer('wheelPull', wheelCenter.x, wheelCenter.y));
      assert.equal(rig.projectToLayer('wheelPull', 3, -3), null);
      assert.equal(rig.projectToLayer('wheelPull', 3, -3, true).inBounds, false,
        'Captured wheel drag continues beyond panel bounds');

      const dash = rig.layers.dash;
      const dashPoint = dash.mesh.localToWorld(new THREE.Vector3(0, 0, coupe ?
        56 * dash.geoW / 480 * Math.sin(THREE.MathUtils.degToRad(14)) : 0)).project(rig.camera);
      wheel.ctx.getImageData = () => ({ data: [0, 0, 0, 255] });
      assert.equal(rig.projectToLayer('dash', dashPoint.x, dashPoint.y), null,
        'Opaque foreground blocks clicks on the dashboard');
      wheel.ctx.getImageData = () => ({ data: [0, 0, 0, 0] });

      for (const [layer, rect] of [[rig.layers.windshield, [150, 17, 100, 24]],
        [rig.layers.leftDoor, [307, 139, 48, 28]]]) {
        const mirror = layer.mesh.children[0];
        assert.ok(mirror, 'Mirror follows its panel transform');
        assert.ok(Math.abs((mirror.position.x / layer.geoW + 0.5) * layer.width
          - rect[0] - rect[2] / 2) < 1e-6);
        assert.ok(Math.abs((0.5 - mirror.position.y / layer.geoH) * layer.height
          - rect[1] - rect[3] / 2) < 1e-6);
      }
    }
  } finally {
    globalThis.document = prevDoc;
  }

  const cam = new THREE.PerspectiveCamera(64, 16 / 9, 0.35, 980);
  const upVec = new THREE.Vector3(0, 1, 0);
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg * Math.PI) / 180;
    const carForward = new THREE.Vector3(Math.sin(rad), -0.04, Math.cos(rad)).normalize();
    const carRight = new THREE.Vector3().crossVectors(carForward, upVec).normalize();

    for (const sideYaw of [-1.38, 0, 1.38]) {
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

{
  let stored;
  const storage = { getItem: () => stored, setItem: (key, value) => { stored = value; } };
  for (const value of [undefined, null, 'invalid', 1, 'classic_25d', 'coupe_3d']) {
    stored = JSON.stringify({ cash: 1234, cabinMode: value });
    const save = loadSave(storage);
    assert.equal(save.cabinMode, value === 'coupe_3d' ? value : 'classic_25d');
    assert.equal(save.cash, 1234, 'Cabin migration preserves progress');
    persistSave(save, storage);
    assert.equal(loadSave(storage).cabinMode, save.cabinMode);
  }
}

console.log('ALL v3 MECHANICS TESTS PASSED');
