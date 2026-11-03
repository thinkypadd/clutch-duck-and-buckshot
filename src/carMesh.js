import * as THREE from 'three';
import { createPsxMaterial } from './psx.js';

// Shared 3D PSX vehicle builder used for BOTH the Showroom/Garage turntable AND trackside AI Rivals
export function buildVehicle3D(
  spec,
  parts = { engine: 0, armor: 0, trans: 0, nitro: 0 },
  overridePaint = null
) {
  const group = new THREE.Group();
  const id = spec.id || 'coupe';

  const bodyCol = overridePaint ?? spec.bodyColor;
  const trimCol = spec.trimColor ?? 0x22262e;

  const bodyMat = createPsxMaterial({ color: bodyCol });
  const trimMat = createPsxMaterial({ color: trimCol });
  const chromeMat = createPsxMaterial({ color: 0xd6deeb });
  const steelMat = createPsxMaterial({ color: 0x5c6473 });
  const glassMat = createPsxMaterial({ color: 0x1b2430 });
  const tireMat = createPsxMaterial({ color: 0x16181c });
  const rimMat = createPsxMaterial({
    color: parts.trans >= 2 ? 0xe8b944 : parts.trans === 1 ? 0xc4ccd9 : 0x626978,
  });
  const tailMat = createPsxMaterial({ color: 0xff3b2f, emissive: 0xb81d13 });
  const headMat = createPsxMaterial({ color: 0xfff0c2, emissive: 0x8a7540 });
  const redIntakeMat = createPsxMaterial({ color: 0xd62e24, emissive: 0x450b08 });

  // 1. Distinct Base Chassis Silhouette per Car Class
  if (id === 'muscle') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.68, 4.65), bodyMat);
    lower.position.y = 0.62;
    group.add(lower);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.7, 4.67), trimMat);
    stripe.position.y = 0.63;
    group.add(stripe);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.54, 2.05), glassMat);
    cabin.position.set(0, 1.18, 0.12);
    group.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.1, 1.72), bodyMat);
    roof.position.set(0, 1.48, 0.12);
    group.add(roof);
  } else if (id === 'rally') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.66, 3.92), bodyMat);
    lower.position.y = 0.62;
    group.add(lower);

    // Boxy widebody rally fender flares
    const flares = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.34, 3.3), trimMat);
    flares.position.y = 0.52;
    group.add(flares);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.62, 2.18), glassMat);
    cabin.position.set(0, 1.22, 0.25);
    group.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.92), bodyMat);
    roof.position.set(0, 1.55, 0.25);
    group.add(roof);

    const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.5), trimMat);
    roofScoop.position.set(0, 1.64, -0.2);
    group.add(roofScoop);
  } else if (id === 'truck') {
    // Wasteland Armored Ute / Pickup
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.76, 4.75), bodyMat);
    bed.position.y = 0.7;
    group.add(bed);

    const bedWell = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.2, 1.85), trimMat);
    bedWell.position.set(0, 1.05, 1.25);
    group.add(bedWell);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.68, 1.82), glassMat);
    cab.position.set(0, 1.36, -0.35);
    group.add(cab);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.12, 1.68), bodyMat);
    roof.position.set(0, 1.72, -0.35);
    group.add(roof);
  } else {
    // Starter '86 Kuruma Wedge Coupe
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.62, 4.32), bodyMat);
    lower.position.y = 0.58;
    group.add(lower);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.24, 4.34), trimMat);
    skirt.position.y = 0.39;
    group.add(skirt);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.54, 1.98), glassMat);
    cabin.position.set(0, 1.13, 0.05);
    group.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.09, 1.56), bodyMat);
    roof.position.set(0, 1.42, 0.05);
    group.add(roof);
  }

  const zHalf = id === 'rally' ? 1.96 : id === 'muscle' ? 2.32 : id === 'truck' ? 2.37 : 2.16;

  // Headlights & Taillights
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.1), tailMat);
    tail.position.set(side * 0.64, 0.72, zHalf + 0.01);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.1), headMat);
    head.position.set(side * 0.64, 0.68, -zHalf - 0.01);
    group.add(tail, head);
  }

  // 2. VISIBLE MODULAR ENGINE UPGRADES (on hood at z ~ -1.25)
  const hoodY = id === 'truck' ? 1.08 : 0.94;
  if (parts.engine === 1) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.95), steelMat);
    scoop.position.set(0, hoodY + 0.11, -1.18);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.12), redIntakeMat);
    mouth.position.set(0, hoodY + 0.12, -1.64);
    group.add(scoop, mouth);
  } else if (parts.engine >= 2) {
    // Towering Chrome Supercharger + 3-Butterfly Bugcatcher!
    const manifold = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.88), chromeMat);
    manifold.position.set(0, hoodY + 0.14, -1.18);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.74), chromeMat);
    hat.position.set(0, hoodY + 0.38, -1.18);
    const catcher = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.14), redIntakeMat);
    catcher.position.set(0, hoodY + 0.4, -1.56);
    group.add(manifold, hat, catcher);
  }

  // 3. VISIBLE MODULAR ARMOR UPGRADES (Bullbar + Rollcage + Window Louvers)
  if (parts.armor >= 1) {
    // Heavy front steel bullbar
    const barMain = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.44, 0.26), steelMat);
    barMain.position.set(0, 0.62, -zHalf - 0.15);
    const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.34, 0.18), steelMat);
    barTop.position.set(0, 0.92, -zHalf - 0.14);
    group.add(barMain, barTop);

    // Exterior rollbar hoop
    const cageHoop = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.14, 0.16), chromeMat);
    cageHoop.position.set(0, id === 'truck' ? 1.82 : 1.56, 0.55);
    group.add(cageHoop);
  }
  if (parts.armor >= 2) {
    // Riveted steel ballistic window armor slats & side door plates
    const visorArmor = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.22, 0.14), steelMat);
    visorArmor.position.set(0, id === 'truck' ? 1.48 : 1.26, -0.88);
    group.add(visorArmor);

    for (const side of [-1, 1]) {
      const doorPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 2.3), steelMat);
      doorPlate.position.set(side * 1.12, 0.68, 0);
      group.add(doorPlate);
    }
  }

  // 4. VISIBLE TRANSMISSION / AERO UPGRADES (Rims + High-Mount GT Wing)
  if (parts.trans >= 2 || id === 'rally') {
    const wingY = id === 'truck' ? 1.56 : 1.38;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.1, 0.44), trimMat);
    wing.position.set(0, wingY, zHalf - 0.24);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.28), steelMat);
    strutL.position.set(-0.74, wingY - 0.2, zHalf - 0.24);
    const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.28), steelMat);
    strutR.position.set(0.74, wingY - 0.2, zHalf - 0.24);
    group.add(wing, strutL, strutR);
  }

  // 5. VISIBLE NITRO UPGRADES (Oversized Rear N2O Canisters & Exhaust Cannons)
  if (parts.nitro >= 1) {
    const n2oCol = parts.nitro >= 2 ? 0xe8b944 : 0xc9302c;
    const n2oMat = createPsxMaterial({ color: n2oCol });
    const pipeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.6, 6);
    pipeGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const pipe = new THREE.Mesh(pipeGeo, chromeMat);
      pipe.position.set(side * 0.56, 0.36, zHalf + 0.14);
      group.add(pipe);
      if (parts.nitro >= 2) {
        const bottle = new THREE.Mesh(pipeGeo, n2oMat);
        bottle.position.set(side * 0.44, 1.04, zHalf - 0.65);
        group.add(bottle);
      }
    }
  }

  // 4 Wheels + Colored Hub Rims
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.34, 6);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 6);
  hubGeo.rotateZ(Math.PI / 2);
  const zWheel = zHalf * 0.62;
  const xWheel = id === 'truck' ? 1.12 : 1.04;
  for (const [wx, wz] of [
    [-xWheel, -zWheel],
    [xWheel, -zWheel],
    [-xWheel, zWheel],
    [xWheel, zWheel],
  ]) {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(wx, 0.4, wz);
    const hub = new THREE.Mesh(hubGeo, rimMat);
    hub.position.set(wx, 0.4, wz);
    group.add(tire, hub);
  }

  return group;
}
