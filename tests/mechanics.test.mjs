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
import { createCockpitController, getHGateLayout } from '../src/cockpit.js';
import { createCabin2D } from '../src/cabin2d.js';
import { cabinLayout } from '../src/cabinPerspective.js';

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

// 3. Nitro gauge progression: Blue -> Cyan -> Pink -> Purple Overdrive (Apex + T3)
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
  assert.equal(pull1.stageName, 'BLUE');
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
  assert.equal(getNitroStageInfo(t3Nitro.stacks).name, 'PINK');

  // Apex Turbo Hatch with Tier 3 N2O unlocks overdrive.
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
  assert.equal(getNitroStageInfo(rallyNitro.stacks).name, 'OVERDRIVE');
  assert.equal(getNitroStageInfo(rallyNitro.stacks).color, '#a55cff');
  assert.deepEqual([1, 2, 3, 4].map(stacks => getNitroStageInfo(stacks).color),
    ['#3898ff', '#32e6d2', '#ff5599', '#a55cff']);
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

// 8. Projected 2D Cabin Input & 360-Degree World Camera Uprightness
{
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => new Proxy({
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      }, { get: (target, key) => key in target ? target[key] : () => {} }),
    }),
  };
  try {
    const rig = createCabin2D();
    rig.draw(globalThis.document.createElement('canvas').getContext('2d'),
      { spec: { gimmickType: 'drift_purple', dashColor: '#1d2228' } });
    const controls = [
      ['windshield', 97, 29, 433, 174],
      ['windshield', 320, 45, 342, 45],
      ['windshield', 435, 30, 457, 30],
      ['wheelPull', 114, 84, 114, 218],
      ['wheelPull', 350, 38, 350, 172],
      ['dash', 224, 66, 224, 202],
      ['dash', 245, 32, 245, 168],
      ['dash', 194, 60, 194, 196],
    ];
    for (const yaw of [-1, -0.5, 0, 0.5, 1]) {
      for (const [panX, panY, roll, shakeX, shakeY] of [[0, 0, 0, 0, 0], [0.6, -0.4, 0.02, 2, -3]]) {
        rig.updateCamera(yaw, panX, panY, roll, shakeX, shakeY);
        for (const [layer, sourceX, sourceY, x, y] of controls) {
          const point = cabinLayout(yaw + panX * 0.03).projectFront(x, y);
          const dx = point[0] - 240, dy = point[1] - 135;
          const sx = dx * Math.cos(-roll) - dy * Math.sin(-roll) + 240 + shakeX - panX * 3;
          const sy = dx * Math.sin(-roll) + dy * Math.cos(-roll) + 135 + shakeY - panY * 2;
          const ndcX = sx / 240 - 1, ndcY = 1 - sy / 135;
          const hit = rig.projectToLayer(layer, ndcX, ndcY);
          if (Math.abs(ndcX) > 1 || Math.abs(ndcY) > 1) {
            assert.equal(hit, null, 'Offscreen controls cannot be picked');
          } else {
            assert.ok(hit, layer + ' control is reachable in the visible view');
            assert.ok(Math.abs(hit.x - sourceX) < 1e-6 && Math.abs(hit.y - sourceY) < 1e-6,
              'Drawing and input share the same relocation, perspective, pan, roll and shake');
          }
        }
      }
    }
    rig.updateCamera(0);
    assert.ok(rig.projectToLayer('wheelPull', 114 / 240 - 1, 1 - 218 / 135));
    assert.equal(rig.projectToLayer('wheelPull', 3, -3), null);
    assert.equal(rig.projectToLayer('wheelPull', 3, -3, true).inBounds, false,
      'Captured drags continue beyond the panel edge');
    rig.layers.wheelPull.ctx.getImageData = () => ({ data: [0, 0, 0, 255] });
    assert.equal(rig.projectToLayer('dash', 245 / 240 - 1, 1 - 168 / 135), null,
      'Opaque foreground prevents picking a hidden dashboard control');

    const previousWindow = globalThis.window;
    const windowHandlers = {}, canvasHandlers = {};
    globalThis.window = { addEventListener: (name, fn) => { windowHandlers[name] = fn; } };
    try {
      const overlay = globalThis.document.createElement('canvas');
      overlay.addEventListener = (name, fn) => { canvasHandlers[name] = fn; };
      overlay.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: 270 });
      const save = createDefaultSave();
      save.selectedCar = 'hyper';
      save.carParts.hyper.trans = 3;
      const carStats = getComputedCarStats(save);
      const car = createCarState(carStats), nitro = createNitroState(carStats), loadout = createLoadoutState(save);
      const controller = createCockpitController(overlay, createCabin2D(),
        new Proxy({}, { get: () => () => {} }), {
          isInteractive: () => true, getState: () => ({ car, nitro, loadout, carStats }),
        });
      const gate = getHGateLayout(8);
      const first = gate.pockets[0];
      const knobX = first.x - 3 + (first.x - 254) * 0.16;
      const knobY = first.y - 12;
      const event = (clientX, clientY) => ({ clientX, clientY, button: 0 });
      for (const pocket of gate.pockets) {
        car.gear = 1;
        controller.resetCabinEffects(1, 8);
        controller.render({ car, nitro, loadout, carStats, rank: 1, aliveRivals: 3,
          totalRacers: 4, totalLaps: 3, lockedView: 0, smoothRoll: 0, shakeX: 0, shakeY: 0 });
        canvasHandlers.pointerdown(event(knobX, knobY + 136));
        windowHandlers.pointermove(event(pocket.x - first.x + knobX, pocket.y - first.y + knobY + 136));
        windowHandlers.pointerup();
        assert.equal(car.gear, pocket.gear, 'Overlapping eight-speed pockets snap to the nearest gear');
      }
    } finally {
      globalThis.window = previousWindow;
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
    assert.equal('cabinMode' in save, false, 'Obsolete cabin modes are removed');
    assert.equal(save.cash, 1234, 'Cabin migration preserves progress');
    persistSave(save, storage);
    assert.equal(loadSave(storage).cabinMode, save.cabinMode);
  }
}

console.log('ALL v3 MECHANICS TESTS PASSED');
