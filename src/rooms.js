import * as THREE from 'three';
import { CARS, CAR_UPGRADES, GUNS, getComputedGunStats } from './catalog.js';
import { createPsxMaterial } from './psx.js';
import { buildVehicle3D, updateVehiclePanels } from './carMesh.js';
import { renderWallGunPlaque } from './weaponArt.js';

function shortestYawDelta(from, to) {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createHubRooms(scene, camera, textures) {
  const root = new THREE.Group();
  scene.add(root);

  const raycaster = new THREE.Raycaster();
  const carIds = Object.keys(CARS);
  const gunIds = Object.keys(GUNS);

  // Camera orbit state (ZERO auto-spin; smooth damped transitions + manual drag/wheel)
  const curTarget = new THREE.Vector3(0, 1.0, 0);
  const goalTarget = new THREE.Vector3(0, 1.0, 0);
  let curYaw = -2.4;
  let goalYaw = -2.4;
  let curPitch = 0.26;
  let goalPitch = 0.26;
  let curDist = 5.2;
  let goalDist = 5.2;
  let activeRoom = 'menu';

  // Shared PSX materials
  const wallDarkMat = createPsxMaterial({ color: 0x222630 });
  const wallConcreteMat = createPsxMaterial({ color: 0x353b47 });
  const brickMat = createPsxMaterial({ color: 0x4a2923 });
  const woodMat = createPsxMaterial({ color: 0x4d3423 });
  const steelMat = createPsxMaterial({ color: 0x626b7d });
  const liftYellowMat = createPsxMaterial({ color: 0xd99b26 });
  const toolRedMat = createPsxMaterial({ color: 0xb82925 });
  const lampWarmMat = createPsxMaterial({ color: 0xfff0c2, emissive: 0x997a3d });
  const lampAmberMat = createPsxMaterial({ color: 0xffb020, emissive: 0x804d08 });
  const lampGreenMat = createPsxMaterial({ color: 0x6be36b, emissive: 0x1e5c24 });

  // =========================================================================
  // 1. MAIN MENU FORECOURT (Dusk Garage Exterior + Parked Active Car)
  // =========================================================================
  const menuGroup = new THREE.Group();
  root.add(menuGroup);
  {
    const lotGeo = new THREE.PlaneGeometry(48, 48, 8, 8).rotateX(-Math.PI / 2);
    for (let i = 0; i < lotGeo.attributes.uv.count; i++) {
      lotGeo.attributes.uv.setXY(
        i,
        lotGeo.attributes.uv.getX(i) * 5,
        lotGeo.attributes.uv.getY(i) * 5
      );
    }
    menuGroup.add(new THREE.Mesh(lotGeo, createPsxMaterial({ map: textures.road, affine: 0.5 })));

    // Garage building facade behind parked car
    const facade = new THREE.Mesh(new THREE.BoxGeometry(22, 6.4, 1.2), wallConcreteMat);
    facade.position.set(0, 3.2, -6.2);
    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.45, 1.6), lampAmberMat);
    roofTrim.position.set(0, 6.4, -6.1);
    const bayDoorRecess = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.2, 0.3), wallDarkMat);
    bayDoorRecess.position.set(2.2, 2.1, -5.55);
    const bayLamp = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.22, 0.35), lampWarmMat);
    bayLamp.position.set(2.2, 4.35, -5.4);
    menuGroup.add(facade, roofTrim, bayDoorRecess, bayLamp);

    // Oil drums & tire stack props
    for (let d = 0; d < 3; d++) {
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 1.15, 8),
        d === 1 ? liftYellowMat : toolRedMat
      );
      drum.position.set(-4.6 + d * 0.95, 0.58, -4.6 + (d % 2) * 0.45);
      menuGroup.add(drum);
    }
  }
  const menuCarAnchor = new THREE.Group();
  menuCarAnchor.position.set(0.65, 0, -0.35);
  menuCarAnchor.rotation.y = 2.48; // Nose angled toward camera-right hero stance
  menuGroup.add(menuCarAnchor);
  let menuCarMesh = null;

  // =========================================================================
  // 2. RACE BRIEFING WAR-ROOM (3D Tactical Holographic/Topo Route Table)
  // =========================================================================
  const briefingGroup = new THREE.Group();
  root.add(briefingGroup);
  {
    const floorGeo = new THREE.PlaneGeometry(28, 28, 6, 6).rotateX(-Math.PI / 2);
    briefingGroup.add(new THREE.Mesh(floorGeo, wallDarkMat));

    const tableBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.92, 4.2), wallConcreteMat);
    tableBase.position.set(0, 0.46, 0);
    const tableRim = new THREE.Mesh(new THREE.BoxGeometry(5.85, 0.14, 4.45), steelMat);
    tableRim.position.set(0, 0.94, 0);
    const holoSurface = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.06, 4.0),
      createPsxMaterial({ color: 0x121d24, emissive: 0x071217 })
    );
    holoSurface.position.set(0, 0.99, 0);
    const overheadLight = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 0.5), lampWarmMat);
    overheadLight.position.set(0, 4.2, 0);
    briefingGroup.add(tableBase, tableRim, holoSurface, overheadLight);
  }
  const briefingMapGroup = new THREE.Group();
  briefingMapGroup.position.set(0, 1.04, 0);
  briefingGroup.add(briefingMapGroup);

  function rebuildBriefingTable(trackId, carId, parts) {
    while (briefingMapGroup.children.length > 0) {
      briefingMapGroup.remove(briefingMapGroup.children[0]);
    }
    const isBadlands = trackId === 'badlands';
    const pts = isBadlands
      ? [
          [-1.6, 0, 1.1],
          [-1.8, 0.08, -0.3],
          [-1.1, 0.22, -1.2],
          [0.2, 0.12, -1.45],
          [1.5, 0.02, -1.0],
          [1.95, 0.08, 0.0],
          [1.3, 0.26, 0.95],
          [0.1, 0.05, 1.35],
        ]
      : [
          [-1.4, 0, 1.0],
          [-1.4, 0.06, -0.4],
          [-0.7, 0.22, -1.2],
          [0.5, 0.3, -1.3],
          [1.45, 0.12, -0.6],
          [1.0, 0.0, 0.2],
          [1.4, 0.2, 1.0],
          [0.1, 0.06, 1.25],
        ];
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      true
    );
    const tubeMat = createPsxMaterial({
      color: isBadlands ? 0xffb020 : 0x6be36b,
      emissive: isBadlands ? 0x663800 : 0x164d1a,
    });
    const segs = 40;
    for (let i = 0; i < segs; i++) {
      const a = curve.getPointAt(i / segs);
      const b = curve.getPointAt((i + 1) / segs);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dir = b.clone().sub(a);
      const segMesh = new THREE.Mesh(
        new THREE.BoxGeometry(isBadlands ? 0.22 : 0.16, 0.04, dir.length() + 0.03),
        tubeMat
      );
      segMesh.position.copy(mid);
      segMesh.lookAt(b);
      briefingMapGroup.add(segMesh);
    }
    // Miniature terrain mesas / pines
    const propMat = createPsxMaterial({ color: isBadlands ? 0x8c442b : 0x2f5936 });
    for (let p = 0; p < 6; p++) {
      const ang = (p / 6) * Math.PI * 2 + 0.4;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 5), propMat);
      m.position.set(Math.cos(ang) * 0.72, 0.24, Math.sin(ang) * 0.52);
      briefingMapGroup.add(m);
    }
    // Miniature active car on start gate
    const miniCar = buildVehicle3D(CARS[carId] || CARS.junker, parts);
    miniCar.scale.setScalar(0.18);
    const p0 = curve.getPointAt(0);
    const p1 = curve.getPointAt(0.03);
    miniCar.position.copy(p0).add(new THREE.Vector3(0, 0.03, 0));
    miniCar.lookAt(p1);
    miniCar.rotateY(Math.PI); // buildVehicle3D nose is -Z
    briefingMapGroup.add(miniCar);
  }

  // =========================================================================
  // 3. DEALERSHIP SHOWROOM (8 Stationary Lit Bays + Saved Visual Mods + Raycast)
  // =========================================================================
  const showroomGroup = new THREE.Group();
  root.add(showroomGroup);
  const showroomBays = [];
  const showroomPickMeshes = [];
  {
    const floorGeo = new THREE.PlaneGeometry(64, 44, 10, 8).rotateX(-Math.PI / 2);
    for (let i = 0; i < floorGeo.attributes.uv.count; i++) {
      floorGeo.attributes.uv.setXY(
        i,
        floorGeo.attributes.uv.getX(i) * 12,
        floorGeo.attributes.uv.getY(i) * 8
      );
    }
    showroomGroup.add(
      new THREE.Mesh(floorGeo, createPsxMaterial({ map: textures.showroomFloor, affine: 0.45 }))
    );

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(44, 7.5, 0.8), wallDarkMat);
    backWall.position.set(0, 3.75, -8.5);
    showroomGroup.add(backWall);

    carIds.forEach((cid, idx) => {
      // Gentle 8-bay gallery arc so every car has a clear view and zero occlusion
      const norm = idx - (carIds.length - 1) / 2; // -3.5 .. +3.5
      const bx = norm * 4.15;
      const bz = Math.abs(norm) * 0.55 - 2.2;
      const bayYaw = Math.PI - norm * 0.09; // Nose (-Z) rotated to face +Z gallery aisle!

      const bayRoot = new THREE.Group();
      bayRoot.position.set(bx, 0, bz);
      showroomGroup.add(bayRoot);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.88, 2.0, 0.16, 12),
        wallConcreteMat
      );
      plinth.position.y = 0.08;
      plinth.userData.pickCarId = cid;

      const rimMat = createPsxMaterial({ color: 0x4a5263 });
      const plinthRim = new THREE.Mesh(new THREE.CylinderGeometry(2.03, 2.03, 0.06, 12), rimMat);
      plinthRim.position.y = 0.04;

      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.36), lampWarmMat);
      lightBar.position.set(0, 4.4, 0.3);

      // Invisible hit-box volume around the bay so clicking anywhere on the car selects it cleanly
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 2.2, 4.8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.y = 1.1;
      hitBox.userData.pickCarId = cid;
      showroomPickMeshes.push(hitBox);

      const carAnchor = new THREE.Group();
      carAnchor.position.y = 0.16;
      carAnchor.rotation.y = bayYaw;

      bayRoot.add(plinth, plinthRim, lightBar, hitBox, carAnchor);
      showroomBays.push({ cid, bx, bz, bayYaw, rimMat, carAnchor, mesh: null });
    });
  }

  function rebuildShowroomBays(save) {
    for (const bay of showroomBays) {
      if (bay.mesh) bay.carAnchor.remove(bay.mesh);
      const spec = CARS[bay.cid];
      const parts = save.carParts[bay.cid];
      bay.mesh = buildVehicle3D(spec, parts);
      bay.carAnchor.add(bay.mesh);

      const isSelected = save.selectedCar === bay.cid;
      const isOwned = Boolean(save.ownedCars[bay.cid]);
      bay.rimMat.uniforms.uColor.value.setHex(
        isSelected ? 0xffb020 : isOwned ? 0x6be36b : 0x4a5263
      );
      bay.rimMat.uniforms.uEmissive.value.setHex(
        isSelected ? 0x664008 : isOwned ? 0x164a1b : 0x000000
      );
    }
  }

  function focusShowroomCar(carId) {
    const bay = showroomBays.find((b) => b.cid === carId) || showroomBays[0];
    setCameraGoal({
      target: [bay.bx, 0.96, bay.bz],
      yaw: (bay.bx * -0.04) + 0.34,
      pitch: 0.24,
      dist: 4.65,
    });
  }

  // =========================================================================
  // 4. MECHANIC WORKSHOP BAY (Hydraulic Lift + Hinged Hood/Door/Trunk + Zoom)
  // =========================================================================
  const mechanicGroup = new THREE.Group();
  root.add(mechanicGroup);
  const LIFT_Y = 0.24;
  {
    const shopFloorGeo = new THREE.PlaneGeometry(34, 34, 6, 6).rotateX(-Math.PI / 2);
    mechanicGroup.add(new THREE.Mesh(shopFloorGeo, wallDarkMat));

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 7.0, 0.6), wallConcreteMat);
    backWall.position.set(0, 3.5, -6.6);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.0, 16), wallConcreteMat);
    leftWall.position.set(-8.6, 3.5, -0.5);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.0, 16), wallConcreteMat);
    rightWall.position.set(8.6, 3.5, -0.5);
    mechanicGroup.add(backWall, leftWall, rightWall);

    // Yellow Twin-Post Hydraulic Lift
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.6, 0.34), liftYellowMat);
      post.position.set(side * 1.95, 1.8, 0.05);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 2.8), liftYellowMat);
      arm.position.set(side * 1.25, LIFT_Y - 0.08, 0.05);
      mechanicGroup.add(post, arm);
    }
    const crossPlate = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.05, 0.5), steelMat);
    crossPlate.position.set(0, 0.03, 0.05);
    mechanicGroup.add(crossPlate);

    // Red rolling tool cabinet & work lights
    const toolChest = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.35, 0.8), toolRedMat);
    toolChest.position.set(-4.2, 0.68, -4.5);
    const hoistPost = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.3, 0.22), liftYellowMat);
    hoistPost.position.set(3.8, 1.15, -3.8);
    const hoistBoom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.6), liftYellowMat);
    hoistBoom.position.set(3.8, 2.2, -3.2);
    const ceilingLampA = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 0.5), lampWarmMat);
    ceilingLampA.position.set(0, 4.5, -1.3);
    const ceilingLampB = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 0.5), lampWarmMat);
    ceilingLampB.position.set(0, 4.5, 1.3);
    mechanicGroup.add(toolChest, hoistPost, hoistBoom, ceilingLampA, ceilingLampB);
  }

  const mechanicCarAnchor = new THREE.Group();
  mechanicCarAnchor.position.set(0, LIFT_Y, 0);
  mechanicGroup.add(mechanicCarAnchor);
  let mechanicCarMesh = null;
  const panelState = { hood: false, door: false, trunk: false };

  function rebuildMechanicCar(carId, effectiveParts, preservePanelAngles = true) {
    const prevRot =
      preservePanelAngles && mechanicCarMesh?.userData?.pivots
        ? {
            hood: mechanicCarMesh.userData.pivots.hood.rotation.x,
            door: mechanicCarMesh.userData.pivots.doorLeft.rotation.y,
            trunk: mechanicCarMesh.userData.pivots.trunk.rotation.x,
          }
        : null;

    if (mechanicCarMesh) mechanicCarAnchor.remove(mechanicCarMesh);
    mechanicCarMesh = buildVehicle3D(CARS[carId] || CARS.junker, effectiveParts);
    if (prevRot && mechanicCarMesh.userData.pivots) {
      mechanicCarMesh.userData.pivots.hood.rotation.x = prevRot.hood;
      mechanicCarMesh.userData.pivots.doorLeft.rotation.y = prevRot.door;
      mechanicCarMesh.userData.pivots.trunk.rotation.x = prevRot.trunk;
      mechanicCarMesh.userData.pivots.propRod.visible = prevRot.hood > 0.55;
    }
    mechanicCarAnchor.add(mechanicCarMesh);
  }

  function focusMechanicSlot(slotKey) {
    if (!slotKey || !CAR_UPGRADES[slotKey]) {
      panelState.hood = false;
      panelState.door = false;
      panelState.trunk = false;
      setCameraGoal({
        target: [0, 0.92 + LIFT_Y, -0.05],
        yaw: -2.42,
        pitch: 0.26,
        dist: 4.75,
      });
      return;
    }
    const upg = CAR_UPGRADES[slotKey];
    panelState.hood = upg.panel === 'hood';
    panelState.door = upg.panel === 'door';
    panelState.trunk = upg.panel === 'trunk';

    const cf = upg.camFocus;
    setCameraGoal({
      target: [cf.target[0], cf.target[1] + LIFT_Y, cf.target[2]],
      yaw: cf.yaw,
      pitch: cf.pitch,
      dist: cf.dist,
    });
  }

  function toggleMechanicPanel(panelName) {
    if (panelName === 'overview') {
      focusMechanicSlot(null);
      return false;
    }
    panelState[panelName] = !panelState[panelName];
    const nowOpen = panelState[panelName];
    if (nowOpen) {
      if (panelName === 'hood') {
        setCameraGoal({ target: [0, 0.95 + LIFT_Y, -1.35], yaw: 2.78, pitch: 0.45, dist: 2.55 });
      } else if (panelName === 'door') {
        setCameraGoal({ target: [0.05, 0.95 + LIFT_Y, -0.05], yaw: -1.1, pitch: 0.29, dist: 2.4 });
      } else if (panelName === 'trunk') {
        setCameraGoal({ target: [0, 0.94 + LIFT_Y, 1.48], yaw: 0.28, pitch: 0.42, dist: 2.65 });
      }
    }
    return nowOpen;
  }

  // =========================================================================
  // 5. 3D GUN SHOP ARMORY (Pegboard Wall with All 8 Pixel Gun Plaques + Raycast)
  // =========================================================================
  const gunshopGroup = new THREE.Group();
  root.add(gunshopGroup);
  const gunPlaques = [];
  const gunPickMeshes = [];
  {
    const floorGeo = new THREE.PlaneGeometry(24, 20, 6, 6).rotateX(-Math.PI / 2);
    gunshopGroup.add(new THREE.Mesh(floorGeo, woodMat));

    const pegWall = new THREE.Mesh(new THREE.BoxGeometry(13.5, 6.2, 0.45), brickMat);
    pegWall.position.set(0, 3.1, -3.5);
    const pegBacking = new THREE.Mesh(new THREE.BoxGeometry(10.4, 3.6, 0.14), wallDarkMat);
    pegBacking.position.set(0, 2.35, -3.22);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.96, 1.25), woodMat);
    counter.position.set(0, 0.48, -1.65);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.1, 1.38), steelMat);
    counterTop.position.set(0, 0.98, -1.65);
    const armoryLight = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.18, 0.45), lampWarmMat);
    armoryLight.position.set(0, 4.35, -2.1);
    gunshopGroup.add(pegWall, pegBacking, counter, counterTop, armoryLight);

    // Ammo crates on sides
    for (const side of [-1, 1]) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.85, 0.95),
        createPsxMaterial({ color: 0x455437 })
      );
      crate.position.set(side * 4.4, 0.42, -2.5);
      gunshopGroup.add(crate);
    }

    // Mount all 8 weapons in a 2x4 grid on the 3D Pegboard Wall!
    gunIds.forEach((gid, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = (col - 1.5) * 2.38;
      const py = row === 0 ? 2.98 : 1.75;

      const canvas = document.createElement('canvas');
      canvas.width = 148;
      canvas.height = 68;
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;

      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 0.98), mat);
      plaqueMesh.position.set(px, py, -3.11);
      plaqueMesh.userData.pickGunId = gid;

      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.06, 0.08), steelMat);
      frameMesh.position.set(px, py, -3.16);
      frameMesh.userData.pickGunId = gid;

      gunshopGroup.add(frameMesh, plaqueMesh);
      gunPickMeshes.push(plaqueMesh, frameMesh);
      gunPlaques.push({ gid, px, py, canvas, tex });
    });
  }

  function rebuildGunShopWall(save, selectedGunId, dualHolster = false) {
    for (const pl of gunPlaques) {
      const owned = Boolean(save.ownedGuns[pl.gid]);
      const isPrim = save.primaryGun === pl.gid;
      const isSec = dualHolster && save.secondaryGun === pl.gid;
      const status = isPrim
        ? 'PRIMARY'
        : isSec
        ? '2ND RIG'
        : owned
        ? 'OWNED'
        : `$${GUNS[pl.gid].price}`;
      const gStats = getComputedGunStats(save, pl.gid);
      renderWallGunPlaque(pl.canvas, gStats, owned, status, pl.gid === selectedGunId);
      pl.tex.needsUpdate = true;
    }
  }

  function focusGunPlaque(gunId) {
    const pl = gunPlaques.find((p) => p.gid === gunId) || gunPlaques[0];
    setCameraGoal({
      target: [pl.px * 0.55, 2.15, -3.1],
      yaw: pl.px * 0.03,
      pitch: 0.06,
      dist: 5.15,
    });
  }

  // =========================================================================
  // ROOM ACTIVATION, CAMERA GOALS & INTERACTION
  // =========================================================================
  function setCameraGoal({ target, yaw, pitch, dist }, snap = false) {
    if (target) goalTarget.set(target[0], target[1], target[2]);
    if (yaw !== undefined) goalYaw = curYaw + shortestYawDelta(curYaw, yaw);
    if (pitch !== undefined) goalPitch = Math.max(0.04, Math.min(1.18, pitch));
    if (dist !== undefined) goalDist = Math.max(1.75, Math.min(9.5, dist));
    if (snap) {
      curTarget.copy(goalTarget);
      curYaw = goalYaw;
      curPitch = goalPitch;
      curDist = goalDist;
    }
  }

  function setRoom(roomName, save, previewCarId) {
    activeRoom = roomName;
    root.visible = roomName !== 'none';
    menuGroup.visible = roomName === 'menu';
    briefingGroup.visible = roomName === 'briefing';
    showroomGroup.visible = roomName === 'showroom';
    mechanicGroup.visible = roomName === 'mechanic';
    gunshopGroup.visible = roomName === 'gunshop';

    if (roomName === 'menu') {
      if (menuCarMesh) menuCarAnchor.remove(menuCarMesh);
      menuCarMesh = buildVehicle3D(
        CARS[save.selectedCar] || CARS.junker,
        save.carParts[save.selectedCar]
      );
      menuCarAnchor.add(menuCarMesh);
      setCameraGoal({ target: [0.35, 1.0, -0.35], yaw: 0.26, pitch: 0.22, dist: 5.25 });
    } else if (roomName === 'briefing') {
      rebuildBriefingTable(
        save.selectedTrack,
        save.selectedCar,
        save.carParts[save.selectedCar]
      );
      setCameraGoal({ target: [0, 1.06, 0], yaw: 0.35, pitch: 0.52, dist: 4.5 });
    } else if (roomName === 'showroom') {
      rebuildShowroomBays(save);
      focusShowroomCar(previewCarId || save.selectedCar);
    } else if (roomName === 'mechanic') {
      panelState.hood = false;
      panelState.door = false;
      panelState.trunk = false;
      rebuildMechanicCar(save.selectedCar, save.carParts[save.selectedCar], false);
      focusMechanicSlot(null);
    } else if (roomName === 'gunshop') {
      const dual = CARS[save.selectedCar]?.dualHolster;
      rebuildGunShopWall(save, save.primaryGun, dual);
      focusGunPlaque(save.primaryGun);
    }
  }

  function orbitByPixels(dx, dy) {
    goalYaw -= dx * 0.0075;
    goalPitch = Math.max(0.05, Math.min(1.15, goalPitch + dy * 0.006));
  }

  function zoomByDelta(wheelDeltaY) {
    goalDist = Math.max(1.75, Math.min(9.5, goalDist + wheelDeltaY * 0.0024));
  }

  function pickRoomObject(ndcX, ndcY) {
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    if (activeRoom === 'showroom') {
      const hits = raycaster.intersectObjects(showroomPickMeshes, false);
      if (hits.length > 0 && hits[0].object.userData.pickCarId) {
        return { type: 'car', id: hits[0].object.userData.pickCarId };
      }
    } else if (activeRoom === 'gunshop') {
      const hits = raycaster.intersectObjects(gunPickMeshes, false);
      if (hits.length > 0 && hits[0].object.userData.pickGunId) {
        return { type: 'gun', id: hits[0].object.userData.pickGunId };
      }
    }
    return null;
  }

  function update(dt) {
    if (!root.visible) return;

    if (activeRoom === 'mechanic' && mechanicCarMesh) {
      updateVehiclePanels(mechanicCarMesh, panelState, dt);
    }

    const rate = Math.min(1, dt * 8.2);
    curTarget.lerp(goalTarget, rate);
    curYaw += (goalYaw - curYaw) * rate;
    curPitch += (goalPitch - curPitch) * rate;
    curDist += (goalDist - curDist) * rate;

    camera.up.set(0, 1, 0);
    camera.fov = activeRoom === 'gunshop' ? 46 : 50;
    camera.updateProjectionMatrix();

    const horiz = Math.cos(curPitch) * curDist;
    camera.position.set(
      curTarget.x + Math.sin(curYaw) * horiz,
      curTarget.y + Math.sin(curPitch) * curDist,
      curTarget.z + Math.cos(curYaw) * horiz
    );
    camera.lookAt(curTarget);
  }

  return {
    panelState,
    setRoom,
    setCameraGoal,
    orbitByPixels,
    zoomByDelta,
    pickRoomObject,
    rebuildBriefingTable,
    rebuildShowroomBays,
    focusShowroomCar,
    rebuildMechanicCar,
    focusMechanicSlot,
    toggleMechanicPanel,
    rebuildGunShopWall,
    focusGunPlaque,
    update,
  };
}
