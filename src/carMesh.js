import * as THREE from 'three';
import { createPsxMaterial } from './psx.js';

const DEFAULT_PARTS = {
  block: 0,
  intake: 0,
  cooling: 0,
  trans: 0,
  nitro: 0,
  trunk: 0,
  armor: 0,
  bumper: 0,
  tires: 0,
};

export function buildVehicle3D(spec, rawParts = DEFAULT_PARTS, overridePaint = null) {
  const parts = { ...DEFAULT_PARTS, ...(rawParts || {}) };
  const group = new THREE.Group();
  const id = spec.id || 'junker';

  const bodyCol = overridePaint ?? spec.bodyColor;
  const trimCol = spec.trimColor ?? 0x22262e;

  const bodyMat = createPsxMaterial({ color: bodyCol });
  const trimMat = createPsxMaterial({ color: trimCol });
  const rustMat = createPsxMaterial({ color: 0x6e432c });
  const darkBayMat = createPsxMaterial({ color: 0x15181f });
  const chromeMat = createPsxMaterial({ color: 0xd6deeb });
  const steelMat = createPsxMaterial({ color: 0x5c6473 });
  const glassMat = createPsxMaterial({ color: 0x1b2430 });
  const tireMat = createPsxMaterial({ color: 0x16181c });
  const rimCol =
    parts.tires >= 3
      ? 0x7b8496
      : parts.tires === 2
      ? 0xe8b944
      : parts.tires === 1
      ? 0xebe6dc
      : 0x565c69;
  const rimMat = createPsxMaterial({ color: rimCol });
  const tailMat = createPsxMaterial({ color: 0xff3b2f, emissive: 0xb81d13 });
  const headMat = createPsxMaterial({ color: 0xfff0c2, emissive: 0x8a7540 });
  const redMat = createPsxMaterial({ color: 0xd62e24, emissive: 0x3b0806 });
  const blueMat = createPsxMaterial({ color: 0x2d82e6 });
  const goldMat = createPsxMaterial({ color: 0xe3af2b });
  const greenMat = createPsxMaterial({ color: 0x34b84c });

  const zHalf =
    id === 'rally'
      ? 1.98
      : id === 'buggy'
      ? 1.95
      : id === 'junker'
      ? 2.12
      : id === 'hyper'
      ? 2.34
      : id === 'truck'
      ? 2.38
      : id === 'muscle'
      ? 2.32
      : 2.18;

  const xHalf = id === 'truck' || id === 'hyper' ? 1.12 : id === 'muscle' ? 1.08 : 1.02;
  const hoodY = id === 'truck' ? 1.06 : id === 'hyper' ? 0.82 : id === 'buggy' ? 0.86 : 0.92;
  const trunkY = id === 'truck' ? 0.98 : id === 'hyper' ? 0.88 : 0.92;

  // 1. Lower Chassis Tub (with recessed Engine Bay, Cabin Well, and Trunk Well)
  const chassisTub = new THREE.Mesh(
    new THREE.BoxGeometry(xHalf * 2, 0.44, zHalf * 2),
    id === 'junker' ? bodyMat : darkBayMat
  );
  chassisTub.position.y = 0.46;
  group.add(chassisTub);

  // Left & Right Front Fenders flanking the Engine Bay
  const fenderLen = zHalf - 0.78;
  for (const side of [-1, 1]) {
    const fMat = id === 'junker' && side === 1 ? rustMat : bodyMat;
    const frontFender = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, hoodY - 0.42, fenderLen),
      fMat
    );
    frontFender.position.set(side * (xHalf - 0.18), 0.44 + (hoodY - 0.42) * 0.5, -(0.78 + fenderLen * 0.5));
    group.add(frontFender);

    const rearQuarter = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, trunkY - 0.42, zHalf - 0.82),
      bodyMat
    );
    rearQuarter.position.set(side * (xHalf - 0.18), 0.44 + (trunkY - 0.42) * 0.5, 0.82 + (zHalf - 0.82) * 0.5);
    group.add(rearQuarter);
  }

  // Right Passenger Door (closed) + Cabin Roof & Glass Pillars
  const rightDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, hoodY - 0.36, 1.56),
    bodyMat
  );
  rightDoor.position.set(xHalf - 0.08, 0.44 + (hoodY - 0.36) * 0.5, 0.02);
  group.add(rightDoor);

  if (id === 'buggy') {
    // Open-cage desert tube buggy rollbars instead of sealed glass box
    const barGeo = new THREE.BoxGeometry(0.1, 0.72, 0.1);
    for (const [bx, bz] of [
      [-0.78, -0.68],
      [0.78, -0.68],
      [-0.78, 0.72],
      [0.78, 0.72],
    ]) {
      const post = new THREE.Mesh(barGeo, trimMat);
      post.position.set(bx, 1.18, bz);
      group.add(post);
    }
    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.08, 1.52), bodyMat);
    roofPlate.position.set(0, 1.54, 0.02);
    group.add(roofPlate);
  } else {
    const roofH = id === 'truck' ? 0.68 : id === 'hyper' ? 0.46 : 0.56;
    const cabZ = id === 'truck' ? -0.22 : id === 'hyper' ? -0.05 : 0.08;
    const cabLen = id === 'truck' ? 1.55 : id === 'rally' ? 2.05 : 1.88;

    // Windshield & rear glass frame (leaving left doorway openable)
    const frontWindshield = new THREE.Mesh(
      new THREE.BoxGeometry(xHalf * 1.66, roofH, 0.14),
      glassMat
    );
    frontWindshield.position.set(0, hoodY + roofH * 0.46, -0.74);
    frontWindshield.rotation.x = 0.38;
    group.add(frontWindshield);

    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(xHalf * 1.62, roofH, 0.14),
      glassMat
    );
    rearGlass.position.set(0, trunkY + roofH * 0.46, cabZ + cabLen * 0.46);
    rearGlass.rotation.x = -0.35;
    group.add(rearGlass);

    const rightGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, roofH * 0.88, cabLen * 0.82),
      glassMat
    );
    rightGlass.position.set(xHalf * 0.8, hoodY + roofH * 0.46, cabZ);
    group.add(rightGlass);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(xHalf * 1.62, 0.1, cabLen * 0.86),
      bodyMat
    );
    roof.position.set(0, hoodY + roofH * 0.92, cabZ);
    group.add(roof);

    if (id === 'rally') {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.48), trimMat);
      scoop.position.set(0, hoodY + roofH + 0.02, -0.18);
      group.add(scoop);
    }
    if (id === 'muscle' || id === 'rotary') {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, cabLen * 0.87), trimMat);
      stripe.position.set(0, hoodY + roofH * 0.93, cabZ);
      group.add(stripe);
    }
  }

  // 2. DETAILED 3D INTERIOR CABIN (Revealed when Driver Door swings open!)
  const interiorGroup = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.52), trimMat);
  seat.position.set(-0.42, 0.82, 0.22);
  const dashBlock = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 1.6, 0.34, 0.38), darkBayMat);
  dashBlock.position.set(0, 0.88, -0.58);
  const wheel3d = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8), steelMat);
  wheel3d.rotation.x = Math.PI * 0.38;
  wheel3d.position.set(-0.42, 0.96, -0.34);

  // 3D Center H-Shifter Stick & Gate
  const gateCol = parts.trans >= 3 ? goldMat : parts.trans >= 1 ? chromeMat : steelMat;
  const gateBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.28), gateCol);
  gateBase.position.set(0.0, 0.68, -0.12);
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), chromeMat);
  stick.position.set(0.0, 0.84, -0.12);
  const knobMat = parts.trans >= 3 ? goldMat : parts.trans >= 1 ? redMat : steelMat;
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), knobMat);
  knob.position.set(0.0, 0.98, -0.12);
  interiorGroup.add(seat, dashBlock, wheel3d, gateBase, stick, knob);

  // 3D Passenger N2O Bottle Rig inside Cabin (empty when nitro === 0!)
  if (parts.nitro >= 1) {
    const nMat = parts.nitro === 1 ? greenMat : parts.nitro === 2 ? blueMat : goldMat;
    const cylGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.52, 6);
    cylGeo.rotateX(Math.PI * 0.42);
    const b1 = new THREE.Mesh(cylGeo, nMat);
    b1.position.set(0.38, 0.76, 0.05);
    interiorGroup.add(b1);
    if (parts.nitro >= 3) {
      const b2 = new THREE.Mesh(cylGeo, redMat);
      b2.position.set(0.56, 0.76, 0.05);
      interiorGroup.add(b2);
    }
  }
  group.add(interiorGroup);

  // Hinged Left Driver Door (`doorLeftPivot` at front-left A-pillar)
  const doorLeftPivot = new THREE.Group();
  doorLeftPivot.position.set(-(xHalf - 0.08), 0.44, -0.74);
  const doorSlab = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, hoodY - 0.36, 1.54),
    id === 'junker' ? rustMat : bodyMat
  );
  doorSlab.position.set(0, (hoodY - 0.36) * 0.5, 0.77);
  doorLeftPivot.add(doorSlab);
  if (parts.armor >= 2) {
    const armorDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 1.44), steelMat);
    armorDoorL.position.set(-0.1, 0.28, 0.77);
    doorLeftPivot.add(armorDoorL);
  }
  group.add(doorLeftPivot);

  // 3. DETAILED 3D ENGINE BAY (Revealed when Hood swings up!)
  const engineBay = new THREE.Group();
  const bayW = xHalf * 2 - 0.76;

  // 3A. Engine Block (`parts.block`: 0=Iron I4, 1=Red I6, 2=Gold V8, 3=Chrome Race V10 + Headers)
  const blkMat =
    parts.block === 3
      ? chromeMat
      : parts.block === 2
      ? goldMat
      : parts.block === 1
      ? redMat
      : rustMat;
  const blkCore = new THREE.Mesh(
    new THREE.BoxGeometry(parts.block >= 2 ? 0.62 : 0.42, 0.36, parts.block >= 1 ? 0.76 : 0.58),
    blkMat
  );
  blkCore.position.set(0, 0.74, -1.32);
  engineBay.add(blkCore);

  if (parts.block >= 2) {
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.72), blkMat);
      bank.position.set(side * 0.26, 0.88, -1.32);
      bank.rotation.z = side * -0.45;
      engineBay.add(bank);
    }
  }
  if (parts.block >= 3) {
    const hdrMat = createPsxMaterial({ color: 0xd9822b, emissive: 0x451a05 });
    for (const side of [-1, 1]) {
      const hdr = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.74), hdrMat);
      hdr.position.set(side * 0.42, 0.78, -1.32);
      engineBay.add(hdr);
    }
  }

  // 3B. Forced Induction (`parts.intake`: 0=Airbox, 1=Cone+Strut, 2=Twin Turbos+Blue Pipes, 3=Chrome Bugcatcher!)
  if (parts.intake === 0) {
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), darkBayMat);
    airbox.position.set(0.22, 0.92, -1.48);
    engineBay.add(airbox);
  } else if (parts.intake === 1) {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.28, 6), redMat);
    cone.rotation.z = Math.PI * 0.5;
    cone.position.set(0.28, 0.94, -1.56);
    const strutBar = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.12, 0.06, 0.08), redMat);
    strutBar.position.set(0, hoodY + 0.02, -1.26);
    engineBay.add(cone, strutBar);
  } else if (parts.intake === 2) {
    for (const side of [-1, 1]) {
      const snail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 8), chromeMat);
      snail.rotation.z = Math.PI * 0.5;
      snail.position.set(side * 0.34, 0.94, -1.46);
      const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.56), blueMat);
      pipe.position.set(side * 0.38, 0.88, -1.72);
      engineBay.add(snail, pipe);
    }
    const intercooler = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.28, 0.12), chromeMat);
    intercooler.position.set(0, 0.62, -zHalf - 0.02);
    group.add(intercooler);
  } else if (parts.intake >= 3) {
    // Towering Chrome Supercharger + 3-Butterfly Red Bugcatcher protruding above hood!
    const manifold = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.82), chromeMat);
    manifold.position.set(0, hoodY + 0.1, -1.32);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.7), chromeMat);
    hat.position.set(0, hoodY + 0.34, -1.32);
    const catcher = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.14), redMat);
    catcher.position.set(0, hoodY + 0.36, -1.68);
    engineBay.add(manifold, hat, catcher);
  }

  // 3C. Cooling & ECU (`parts.cooling`: 0=Brass Rad, 1=Alum Rad+Red Batt, 2=Dual Fans, 3=ECU+Yellow Coils)
  const radMat = parts.cooling >= 1 ? chromeMat : rustMat;
  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(bayW * 0.88, 0.34, parts.cooling >= 1 ? 0.14 : 0.08),
    radMat
  );
  radiator.position.set(0, 0.74, -zHalf + 0.22);
  const battery = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.2, 0.2),
    parts.cooling >= 1 ? redMat : darkBayMat
  );
  battery.position.set(-bayW * 0.34, 0.8, -zHalf + 0.45);
  engineBay.add(radiator, battery);

  if (parts.cooling >= 2) {
    for (const side of [-1, 1]) {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 6), blueMat);
      fan.rotation.x = Math.PI * 0.5;
      fan.position.set(side * 0.22, 0.74, -zHalf + 0.31);
      engineBay.add(fan);
    }
  }
  if (parts.cooling >= 3) {
    const ecu = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.22), blueMat);
    ecu.position.set(bayW * 0.32, 0.84, -1.05);
    const coils = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.48), goldMat);
    coils.position.set(0, 0.96, -1.32);
    engineBay.add(ecu, coils);
  }
  group.add(engineBay);

  // Hinged Hood (`hoodPivot` at cowl z = -0.80, lifts nose UP when rotation.x > 0!)
  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(0, hoodY, -0.8);
  const hoodLen = zHalf - 0.82;
  if (parts.intake >= 3) {
    // Split hood panels around protruding Chrome Bugcatcher!
    for (const side of [-1, 1]) {
      const halfHood = new THREE.Mesh(
        new THREE.BoxGeometry((bayW - 0.58) * 0.5, 0.07, hoodLen),
        bodyMat
      );
      halfHood.position.set(side * (0.31 + (bayW - 0.58) * 0.25), 0, -hoodLen * 0.5);
      hoodPivot.add(halfHood);
    }
  } else {
    const hoodLid = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.04, 0.07, hoodLen), bodyMat);
    hoodLid.position.set(0, 0, -hoodLen * 0.5);
    hoodPivot.add(hoodLid);
    if (parts.intake === 1) {
      const miniScoop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.72), steelMat);
      miniScoop.position.set(0, 0.09, -hoodLen * 0.52);
      hoodPivot.add(miniScoop);
    }
  }
  const propRod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.04), goldMat);
  propRod.position.set(-bayW * 0.38, 0.82, -zHalf + 0.48);
  propRod.visible = false;
  group.add(hoodPivot, propRod);

  // 4. DETAILED 3D TRUNK COUNTERMEASURE BAY (Revealed when Trunk Lid swings open!)
  const trunkBay = new THREE.Group();
  const trunkZ = 0.88 + (zHalf - 0.88) * 0.5;
  if (parts.trunk === 0) {
    // Stock Spare Tire lying flat
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 8), tireMat);
    spare.position.set(0, 0.72, trunkZ);
    trunkBay.add(spare);
  } else if (parts.trunk === 1) {
    // 55-Gal Yellow Oil Drum + Spray Bar
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.68, 8), goldMat);
    drum.rotation.z = Math.PI * 0.5;
    drum.position.set(0, 0.82, trunkZ);
    const sprayBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), steelMat);
    sprayBar.position.set(0, 0.42, zHalf + 0.08);
    trunkBay.add(drum, sprayBar);
  } else if (parts.trunk === 2) {
    // Steel Caltrop Spike Hopper
    const hopper = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.36, 0.64), steelMat);
    hopper.position.set(0, 0.82, trunkZ);
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.24), chromeMat);
    chute.position.set(0, 0.46, zHalf + 0.06);
    trunkBay.add(hopper, chute);
  } else if (parts.trunk === 3) {
    // Blinking Red Proximity Mine Rack
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.68), darkBayMat);
    rack.position.set(0, 0.76, trunkZ);
    trunkBay.add(rack);
    for (let m = -1; m <= 1; m++) {
      const mine = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 8), redMat);
      mine.position.set(m * 0.28, 0.92, trunkZ);
      trunkBay.add(mine);
    }
  } else if (parts.trunk >= 4) {
    // Twin Pressurized Napalm Tanks + Igniter Nozzle
    const tankGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.72, 8);
    tankGeo.rotateX(Math.PI * 0.5);
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(tankGeo, redMat);
      tank.position.set(side * 0.24, 0.82, trunkZ);
      trunkBay.add(tank);
    }
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.28, 6), goldMat);
    nozzle.rotation.x = Math.PI * 0.5;
    nozzle.position.set(0, 0.52, zHalf + 0.12);
    trunkBay.add(nozzle);
  }
  group.add(trunkBay);

  // Hinged Trunk Lid (`trunkPivot` at z = +0.86, lifts rear UP when rotation.x < 0!)
  const trunkPivot = new THREE.Group();
  trunkPivot.position.set(0, trunkY, 0.86);
  const trunkLen = zHalf - 0.88;
  const trunkLid = new THREE.Mesh(
    new THREE.BoxGeometry(bayW + 0.04, 0.07, trunkLen),
    id === 'truck' ? trimMat : bodyMat
  );
  trunkLid.position.set(0, 0, trunkLen * 0.5);
  trunkPivot.add(trunkLid);

  // GT Wing or Ducktail mounts onto trunk lid so it lifts cleanly with the trunk!
  if (parts.tires === 2) {
    const ducktail = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 1.88, 0.16, 0.22), trimMat);
    ducktail.position.set(0, 0.1, trunkLen - 0.08);
    trunkPivot.add(ducktail);
  } else if (parts.tires >= 3 || id === 'rally' || id === 'hyper') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 1.98, 0.09, 0.42), trimMat);
    wing.position.set(0, 0.44, trunkLen - 0.14);
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.24), steelMat);
      strut.position.set(side * 0.68, 0.22, trunkLen - 0.14);
      trunkPivot.add(strut);
    }
    trunkPivot.add(wing);
  }
  group.add(trunkPivot);

  // 5. EXTERIOR ARMOR, FRONT BUMPER/PLOW & LIGHTS
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.1), tailMat);
    tail.position.set(side * (xHalf - 0.34), 0.72, zHalf + 0.02);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.1), headMat);
    head.position.set(side * (xHalf - 0.34), 0.68, -zHalf - 0.02);
    group.add(tail, head);
  }

  if (parts.armor >= 1) {
    const cageHoop = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 1.72, 0.12, 0.14), chromeMat);
    cageHoop.position.set(0, hoodY + 0.62, 0.42);
    group.add(cageHoop);
  }
  if (parts.armor >= 2) {
    const armorDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 1.44), steelMat);
    armorDoorR.position.set(xHalf + 0.04, 0.72, 0.02);
    group.add(armorDoorR);
  }
  if (parts.armor >= 3) {
    const visorLouvers = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 1.68, 0.22, 0.14), steelMat);
    visorLouvers.position.set(0, hoodY + 0.36, -0.82);
    group.add(visorLouvers);
  }

  // Front Bumper / Plow (`parts.bumper`: 0..3)
  if (parts.bumper === 1) {
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 2.04, 0.42, 0.24), steelMat);
    pushBar.position.set(0, 0.58, -zHalf - 0.14);
    group.add(pushBar);
  } else if (parts.bumper === 2) {
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 1.12, 0.48, 0.22), steelMat);
      blade.position.set(side * xHalf * 0.48, 0.52, -zHalf - 0.24);
      blade.rotation.y = side * -0.34;
      group.add(blade);
    }
  } else if (parts.bumper >= 3) {
    const catcherBar = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 2.14, 0.48, 0.28), steelMat);
    catcherBar.position.set(0, 0.54, -zHalf - 0.18);
    group.add(catcherBar);
    const spikeGeo = new THREE.ConeGeometry(0.1, 0.42, 4);
    spikeGeo.rotateX(-Math.PI * 0.5);
    for (let s = -3; s <= 3; s++) {
      const sp = new THREE.Mesh(spikeGeo, chromeMat);
      sp.position.set(s * 0.3, 0.52, -zHalf - 0.46);
      group.add(sp);
    }
  }

  // Tires, Rims, Splitters & Exhaust Pipes (`parts.tires`: 0..3)
  if (parts.tires >= 2 && parts.bumper === 0) {
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(xHalf * 2.06, 0.08, 0.34), trimMat);
    splitter.position.set(0, 0.28, -zHalf - 0.1);
    group.add(splitter);
  }
  if (parts.tires === 1) {
    const sidePipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
    sidePipeGeo.rotateX(Math.PI * 0.5);
    for (const side of [-1, 1]) {
      const sp = new THREE.Mesh(sidePipeGeo, chromeMat);
      sp.position.set(side * (xHalf + 0.06), 0.32, 0.1);
      group.add(sp);
    }
  } else if (parts.tires >= 3 || id === 'rotary' || id === 'hyper') {
    const quadGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.48, 6);
    quadGeo.rotateX(Math.PI * 0.5);
    for (const off of [-0.62, -0.42, 0.42, 0.62]) {
      const p = new THREE.Mesh(quadGeo, goldMat);
      p.position.set(off, 0.34, zHalf + 0.12);
      group.add(p);
    }
  }

  const wheelRadius = parts.tires === 1 || id === 'buggy' || id === 'truck' ? 0.44 : 0.4;
  const wheelWidth = parts.tires >= 2 ? 0.42 : 0.32;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 8);
  wheelGeo.rotateZ(Math.PI * 0.5);
  const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, wheelWidth + 0.03, 6);
  hubGeo.rotateZ(Math.PI * 0.5);
  const zWheel = zHalf * 0.62;
  const xWheel = xHalf + (id === 'buggy' ? 0.14 : 0.02);

  for (const [wx, wz] of [
    [-xWheel, -zWheel],
    [xWheel, -zWheel],
    [-xWheel, zWheel],
    [xWheel, zWheel],
  ]) {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(wx, wheelRadius, wz);
    const hub = new THREE.Mesh(hubGeo, rimMat);
    hub.position.set(wx, wheelRadius, wz);
    group.add(tire, hub);
    if (parts.tires >= 3) {
      const spinner = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.22, 4).rotateZ(wx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5),
        chromeMat
      );
      spinner.position.set(wx + Math.sign(wx) * (wheelWidth * 0.5 + 0.08), wheelRadius, wz);
      group.add(spinner);
    }
  }

  group.userData.pivots = {
    hood: hoodPivot,
    doorLeft: doorLeftPivot,
    trunk: trunkPivot,
    propRod,
  };

  return group;
}

export function updateVehiclePanels(vehicleGroup, panelState, dt) {
  const pivots = vehicleGroup?.userData?.pivots;
  if (!pivots) return;
  const rate = Math.min(1, dt * 8.5);
  const targetHood = panelState.hood ? 0.92 : 0;
  const targetDoor = panelState.door ? -1.06 : 0;
  const targetTrunk = panelState.trunk ? -0.95 : 0;

  pivots.hood.rotation.x += (targetHood - pivots.hood.rotation.x) * rate;
  pivots.doorLeft.rotation.y += (targetDoor - pivots.doorLeft.rotation.y) * rate;
  pivots.trunk.rotation.x += (targetTrunk - pivots.trunk.rotation.x) * rate;
  pivots.propRod.visible = pivots.hood.rotation.x > 0.55;
}
