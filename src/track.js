import * as THREE from 'three';
import { createPsxMaterial } from './psx.js';

export function buildShowroomStage(scene, textures) {
  const group = new THREE.Group();

  const floorMat = createPsxMaterial({ map: textures.showroomFloor, affine: 0.5 });
  const floorGeo = new THREE.PlaneGeometry(46, 46, 8, 8);
  floorGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < floorGeo.attributes.uv.count; i++) {
    floorGeo.attributes.uv.setXY(
      i,
      floorGeo.attributes.uv.getX(i) * 8,
      floorGeo.attributes.uv.getY(i) * 8
    );
  }
  const floor = new THREE.Mesh(floorGeo, floorMat);
  group.add(floor);

  // Turntable plinth
  const plinthMat = createPsxMaterial({ color: 0x262b36 });
  const rimMat = createPsxMaterial({ color: 0xffb020, emissive: 0x664008 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.75, 0.22, 16), plinthMat);
  plinth.position.y = 0.11;
  const plinthRim = new THREE.Mesh(new THREE.CylinderGeometry(3.78, 3.78, 0.08, 16), rimMat);
  plinthRim.position.y = 0.05;
  group.add(plinth, plinthRim);

  // Garage background pillars & light bars
  const pillarMat = createPsxMaterial({ color: 0x333947 });
  const lampMat = createPsxMaterial({ color: 0xfff2cc, emissive: 0x8f7a4a });
  for (let i = -2; i <= 2; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7.0, 0.7), pillarMat);
    p.position.set(i * 4.8, 3.5, -8.5);
    group.add(p);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 0.8), pillarMat);
  beam.position.set(0, 6.2, -8.5);
  const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.18, 0.4), lampMat);
  lightStrip.position.set(0, 4.9, -1.2);
  group.add(beam, lightStrip);

  const turntable = new THREE.Group();
  turntable.position.y = 0.22;
  group.add(turntable);

  scene.add(group);
  return { group, turntable };
}

export function buildCircuit(scene, textures, trackId = 'canyon') {
  const group = new THREE.Group();
  const isOpenWorld = trackId === 'badlands';

  const controlPoints = isOpenWorld
    ? [
        // Wide-open ~1,840m Badlands Desert Checkpoint Loop
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-18, 1.5, -185),
        new THREE.Vector3(55, 6.0, -370),
        new THREE.Vector3(215, 3.0, -455),
        new THREE.Vector3(395, -2.0, -375),
        new THREE.Vector3(465, 0.0, -195),
        new THREE.Vector3(385, 5.5, -20),
        new THREE.Vector3(440, 8.5, 165),
        new THREE.Vector3(315, 2.0, 315),
        new THREE.Vector3(135, -1.5, 285),
        new THREE.Vector3(22, 0.0, 155),
      ]
    : [
        // Classic Canyon Asphalt Circuit
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.5, -135),
        new THREE.Vector3(38, 4.5, -260),
        new THREE.Vector3(145, 7.5, -320),
        new THREE.Vector3(260, 4.0, -275),
        new THREE.Vector3(305, 0.0, -165),
        new THREE.Vector3(245, -2.5, -65),
        new THREE.Vector3(295, 1.5, 45),
        new THREE.Vector3(265, 6.0, 165),
        new THREE.Vector3(155, 3.5, 225),
        new THREE.Vector3(48, 0.0, 185),
        new THREE.Vector3(4, 0.0, 95),
      ];

  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.45);
  const totalLength = curve.getLength();

  const segments = isOpenWorld ? 400 : 360;
  const samples = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const s = (i % segments) / segments;
    const pos = curve.getPointAt(s);
    const tan = curve.getTangentAt(s).normalize();
    const flatTan = new THREE.Vector3(tan.x, 0, tan.z).normalize();
    const right = new THREE.Vector3().crossVectors(flatTan, up).normalize();
    samples.push({ s: i / segments, pos, tan, flatTan, right, curvature: 0 });
  }

  const dsLen = totalLength / segments;
  for (let i = 0; i <= segments; i++) {
    const prev = samples[(i - 1 + segments) % segments];
    const next = samples[(i + 1) % segments];
    const dTan = new THREE.Vector3().subVectors(next.flatTan, prev.flatTan).divideScalar(2 * dsLen);
    samples[i].curvature = dTan.dot(samples[i].right);
  }

  function buildRibbon(latA, hA, latB, hB, uScale, vRepeatPerMeter, material) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const cols = Math.abs(latB - latA) > 12 ? 5 : 1;

    for (let i = 0; i <= segments; i++) {
      const smp = samples[i];
      const vCoord = i * dsLen * vRepeatPerMeter;
      for (let c = 0; c <= cols; c++) {
        const frac = c / cols;
        const lat = latA + (latB - latA) * frac;
        const h = hA + (hB - hA) * frac;
        positions.push(
          smp.pos.x + smp.right.x * lat,
          smp.pos.y + h,
          smp.pos.z + smp.right.z * lat
        );
        if (Math.abs(hB - hA) > 0.4 && Math.abs(latB - latA) < 0.4) {
          const sign = latA > 0 ? -1 : 1;
          normals.push(smp.right.x * sign, 0.25, smp.right.z * sign);
        } else {
          normals.push(0, 1, 0);
        }
        uvs.push(frac * uScale, vCoord);
      }
    }

    const stride = cols + 1;
    for (let i = 0; i < segments; i++) {
      for (let c = 0; c < cols; c++) {
        const a = i * stride + c;
        const b = a + 1;
        const d = (i + 1) * stride + c;
        const e = d + 1;
        indices.push(a, b, d, b, e, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, material);
    group.add(mesh);
    return mesh;
  }

  const bannerMat = createPsxMaterial({ map: textures.checkered, side: THREE.DoubleSide });
  const chevLeftMat = createPsxMaterial({ map: textures.chevronLeft, side: THREE.DoubleSide });
  const chevRightMat = createPsxMaterial({ map: textures.chevronRight, side: THREE.DoubleSide });

  if (isOpenWorld) {
    // LEVEL 2: BADLANDS FLATS (OPEN DESERT CHECKPOINT CIRCUIT)
    const trailHalf = 26.0;
    const trailMat = createPsxMaterial({ map: textures.badlandsTrail, affine: 0.72 });
    const sandMat = createPsxMaterial({ map: textures.badlandsSand, affine: 0.78 });
    const mesaMat = createPsxMaterial({ color: 0x8c442b });
    const rustMat = createPsxMaterial({ color: 0x59362a });
    const beaconMat = createPsxMaterial({ color: 0xffb020, emissive: 0xcc6600 });
    const scrubMat = createPsxMaterial({ color: 0x5c6635 });

    // 52m wide desert trail + massive open driveable sand flats out to +-115m!
    buildRibbon(-trailHalf, 0.04, trailHalf, 0.04, 2.0, 0.05, trailMat);
    buildRibbon(-118, 0.0, -trailHalf, 0.03, 5.0, 0.04, sandMat);
    buildRibbon(trailHalf, 0.03, 118, 0.0, 5.0, 0.04, sandMat);
    // Outer canyon rim walls at +-118m
    buildRibbon(-135, 16.0, -118, 0.0, 1.0, 0.03, mesaMat);
    buildRibbon(118, 0.0, 135, 16.0, 1.0, 0.03, mesaMat);

    const desertFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400, 12, 12).rotateX(-Math.PI / 2),
      createPsxMaterial({ color: 0x734229, affine: 0.2 })
    );
    desertFloor.position.set(200, -5.5, -60);
    group.add(desertFloor);

    // 8 Giant Checkpoint Gates (including Start/Finish Gantry at i = 0)
    const gateCount = 8;
    const postGeo = new THREE.BoxGeometry(1.8, 12.0, 1.8);
    const crossGeo = new THREE.BoxGeometry(58.0, 1.8, 1.4);
    const beaconGeo = new THREE.BoxGeometry(2.4, 2.4, 2.4);

    for (let g = 0; g < gateCount; g++) {
      const idx = Math.floor((g / gateCount) * segments);
      const smp = samples[idx];
      const gate = new THREE.Group();
      gate.position.copy(smp.pos);
      gate.rotation.y = Math.atan2(-smp.flatTan.x, -smp.flatTan.z);

      const pL = new THREE.Mesh(postGeo, rustMat);
      pL.position.set(-28, 6.0, 0);
      const pR = new THREE.Mesh(postGeo, rustMat);
      pR.position.set(28, 6.0, 0);
      gate.add(pL, pR);

      const bL = new THREE.Mesh(beaconGeo, beaconMat);
      bL.position.set(-28, 13.0, 0);
      const bR = new THREE.Mesh(beaconGeo, beaconMat);
      bR.position.set(28, 13.0, 0);
      gate.add(bL, bR);

      if (g === 0) {
        const arch = new THREE.Mesh(crossGeo, bannerMat);
        arch.position.set(0, 10.6, 0);
        const startLine = new THREE.Mesh(
          new THREE.PlaneGeometry(52, 3.2).rotateX(-Math.PI / 2),
          bannerMat
        );
        startLine.position.y = 0.08;
        gate.add(arch, startLine);
      } else {
        const beam = new THREE.Mesh(crossGeo, rustMat);
        beam.position.set(0, 11.2, 0);
        gate.add(beam);
      }
      group.add(gate);
    }

    // Scattered natural desert mesas, rock arches & saguaro cacti across the open flats
    const butteGeo = new THREE.CylinderGeometry(7, 13, 18, 6);
    const boulderGeo = new THREE.DodecahedronGeometry(3.6, 0);
    const cactusStem = new THREE.BoxGeometry(0.75, 4.8, 0.75);

    for (let i = 8; i < segments - 8; i += 5) {
      const smp = samples[i];
      const side = (i % 10 === 0 ? 1 : -1) * (i % 3 === 0 ? -1 : 1);
      const dist = 34 + ((i * 23) % 52);

      if (i % 20 === 0) {
        const butte = new THREE.Mesh(butteGeo, mesaMat);
        butte.position.copy(smp.pos).addScaledVector(smp.right, side * (dist + 16));
        butte.position.y += 7.5;
        butte.scale.set(1 + (i % 3) * 0.35, 1 + (i % 4) * 0.3, 1.2);
        group.add(butte);
      } else if (i % 10 === 5) {
        const rock = new THREE.Mesh(boulderGeo, mesaMat);
        rock.position.copy(smp.pos).addScaledVector(smp.right, side * dist);
        rock.position.y += 1.2;
        rock.rotation.set(i * 0.4, i * 0.8, 0);
        group.add(rock);
      } else {
        const cactus = new THREE.Mesh(cactusStem, scrubMat);
        cactus.position.copy(smp.pos).addScaledVector(smp.right, side * dist);
        cactus.position.y += 2.2;
        group.add(cactus);
      }
    }
  } else {
    // LEVEL 1: CANYON ASPHALT CIRCUIT (widened to 21m for clean side-window drive-bys)
    const roadHalf = 10.5;
    const curbW = 1.4;
    const railLat = 14.2;

    const roadMat = createPsxMaterial({ map: textures.road, affine: 0.72 });
    const curbMat = createPsxMaterial({ map: textures.curb, affine: 0.85 });
    const turfMat = createPsxMaterial({ map: textures.terrain, affine: 0.85 });
    const railMat = createPsxMaterial({
      map: textures.guardrail,
      side: THREE.DoubleSide,
      affine: 0.9,
    });
    const pillarMat = createPsxMaterial({ color: 0xc8bfae });
    const trunkMat = createPsxMaterial({ color: 0x4f3624 });
    const pineMat = createPsxMaterial({ map: textures.treeFoliage });
    const rockMat = createPsxMaterial({ color: 0x5c4b45 });

    buildRibbon(-roadHalf, 0.02, roadHalf, 0.02, 1.0, 0.09, roadMat);
    buildRibbon(-(roadHalf + curbW), 0.05, -roadHalf, 0.03, 1.0, 0.22, curbMat);
    buildRibbon(roadHalf, 0.03, roadHalf + curbW, 0.05, 1.0, 0.22, curbMat);
    buildRibbon(-52, -1.8, -(roadHalf + curbW), 0.02, 4.0, 0.06, turfMat);
    buildRibbon(roadHalf + curbW, 0.02, 52, -1.8, 4.0, 0.06, turfMat);
    buildRibbon(-railLat, 0.0, -railLat, 1.08, 1.0, 0.25, railMat);
    buildRibbon(railLat, 0.0, railLat, 1.08, 1.0, 0.25, railMat);

    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 1500, 12, 12).rotateX(-Math.PI / 2),
      createPsxMaterial({ color: 0x3b4029, affine: 0.2 })
    );
    groundMesh.position.set(140, -5.5, -40);
    group.add(groundMesh);

    const startSmp = samples[0];
    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(startSmp.pos);
    gantryGroup.rotation.y = Math.atan2(-startSmp.flatTan.x, -startSmp.flatTan.z);

    const pGeo = new THREE.BoxGeometry(1.2, 7.5, 1.2);
    const lP = new THREE.Mesh(pGeo, pillarMat);
    lP.position.set(-13.2, 3.75, 0);
    const rP = new THREE.Mesh(pGeo, pillarMat);
    rP.position.set(13.2, 3.75, 0);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(27.6, 2.1, 0.8), bannerMat);
    banner.position.set(0, 6.8, 0);
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(roadHalf * 2, 2.4).rotateX(-Math.PI / 2),
      bannerMat
    );
    strip.position.y = 0.05;
    gantryGroup.add(lP, rP, banner, strip);
    group.add(gantryGroup);

    const signGeo = new THREE.PlaneGeometry(3.2, 1.5);
    const postGeo = new THREE.BoxGeometry(0.22, 2.0, 0.22);
    const coneGeo = new THREE.ConeGeometry(3.2, 8.5, 5);
    const trunkGeo = new THREE.CylinderGeometry(0.45, 0.65, 2.6, 5);
    const rockGeo = new THREE.DodecahedronGeometry(5.5, 0);

    for (let i = 0; i < segments; i += 4) {
      const smp = samples[i];
      const lookAhead = samples[(i + 6) % segments];

      if (Math.abs(lookAhead.curvature) > 0.011 && i % 8 === 0) {
        const turningRight = lookAhead.curvature > 0;
        const sideSign = turningRight ? -1 : 1;
        const signGroup = new THREE.Group();
        signGroup.position.copy(smp.pos).addScaledVector(smp.right, sideSign * (railLat + 0.8));
        signGroup.rotation.y = Math.atan2(-smp.flatTan.x, -smp.flatTan.z);
        const post = new THREE.Mesh(postGeo, pillarMat);
        post.position.y = 1.0;
        const board = new THREE.Mesh(signGeo, turningRight ? chevRightMat : chevLeftMat);
        board.position.y = 2.1;
        signGroup.add(post, board);
        group.add(signGroup);
      }

      if (i % 6 === 0 && i > 6 && i < segments - 6) {
        const side = (i / 6) % 2 === 0 ? 1 : -1;
        const dist = 20 + ((i * 17) % 19);
        const tree = new THREE.Group();
        tree.position.copy(smp.pos).addScaledVector(smp.right, side * dist);
        tree.position.y -= 0.6;
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.3;
        const crown = new THREE.Mesh(coneGeo, pineMat);
        crown.position.y = 6.2;
        tree.scale.setScalar(0.85 + ((i * 7) % 5) * 0.14);
        tree.add(trunk, crown);
        group.add(tree);
      }

      if (i % 24 === 12) {
        const side = (i / 24) % 2 === 0 ? -1 : 1;
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.copy(smp.pos).addScaledVector(smp.right, side * 36);
        rock.position.y += 1.5;
        rock.rotation.set(i * 0.3, i * 0.7, 0);
        rock.scale.set(1.6, 2.2, 1.4);
        group.add(rock);
      }
    }

    const mountainMat = createPsxMaterial({ color: 0x382b34, affine: 0.1 });
    for (let m = 0; m < 18; m++) {
      const ang = (m / 18) * Math.PI * 2;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(55 + (m % 3) * 22, 65 + (m % 4) * 18, 4),
        mountainMat
      );
      peak.position.set(140 + Math.cos(ang) * 440, 22, -40 + Math.sin(ang) * 440);
      peak.rotation.y = ang;
      group.add(peak);
    }
  }

  scene.add(group);

  function sampleTrack(sNorm) {
    const wrapped = (((sNorm % 1) + 1) % 1);
    const f = wrapped * segments;
    const i0 = Math.floor(f) % segments;
    const i1 = (i0 + 1) % segments;
    const alpha = f - Math.floor(f);

    const a = samples[i0];
    const b = samples[i1];

    return {
      pos: new THREE.Vector3().lerpVectors(a.pos, b.pos, alpha),
      tan: new THREE.Vector3().lerpVectors(a.tan, b.tan, alpha).normalize(),
      flatTan: new THREE.Vector3().lerpVectors(a.flatTan, b.flatTan, alpha).normalize(),
      right: new THREE.Vector3().lerpVectors(a.right, b.right, alpha).normalize(),
      curvature: a.curvature + (b.curvature - a.curvature) * alpha,
    };
  }

  return {
    group,
    curve,
    totalLength,
    sampleTrack,
    isOpenWorld,
    dispose: () => scene.remove(group),
  };
}
