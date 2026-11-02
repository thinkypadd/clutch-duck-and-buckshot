import * as THREE from 'three';
import { createPsxMaterial } from './psx.js';

export const ROAD_HALF_WIDTH = 9.0;
export const CURB_WIDTH = 1.3;
export const VERGE_OUTER = 12.5;

export function buildCircuit(scene, textures) {
  // Closed clockwise circuit (~1,380m) with sweeping straights, S-bends, crests, and hairpins
  const controlPoints = [
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

  const segments = 360;
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

  // Helper to build a continuous ribbon strip between lateral offsets [latA, latB] and height offsets [hA, hB]
  function buildRibbon(latA, hA, latB, hB, uScale, vRepeatPerMeter, material) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // Subdivide road across width (3 strips) so PS1 vertex snapping + affine UVs look authentic without wide-poly swim
    const cols = Math.abs(latB - latA) > 8 ? 4 : 1;

    for (let i = 0; i <= segments; i++) {
      const smp = samples[i];
      const vCoord = i * dsLen * vRepeatPerMeter;
      for (let c = 0; c <= cols; c++) {
        const frac = c / cols;
        const lat = latA + (latB - latA) * frac;
        const h = hA + (hB - hA) * frac;
        const vx = smp.pos.x + smp.right.x * lat;
        const vy = smp.pos.y + h;
        const vz = smp.pos.z + smp.right.z * lat;
        positions.push(vx, vy, vz);

        if (Math.abs(hB - hA) > 0.4 && Math.abs(latB - latA) < 0.4) {
          // Vertical wall normal facing road center
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
    scene.add(mesh);
    return mesh;
  }

  const roadMat = createPsxMaterial({ map: textures.road, affine: 0.72 });
  const curbMat = createPsxMaterial({ map: textures.curb, affine: 0.85 });
  const turfMat = createPsxMaterial({ map: textures.terrain, affine: 0.85 });
  const railMat = createPsxMaterial({
    map: textures.guardrail,
    side: THREE.DoubleSide,
    affine: 0.9,
  });

  // Main asphalt road
  buildRibbon(-ROAD_HALF_WIDTH, 0.02, ROAD_HALF_WIDTH, 0.02, 1.0, 0.09, roadMat);

  // Left & right rumble curbs
  buildRibbon(
    -(ROAD_HALF_WIDTH + CURB_WIDTH),
    0.05,
    -ROAD_HALF_WIDTH,
    0.03,
    1.0,
    0.22,
    curbMat
  );
  buildRibbon(
    ROAD_HALF_WIDTH,
    0.03,
    ROAD_HALF_WIDTH + CURB_WIDTH,
    0.05,
    1.0,
    0.22,
    curbMat
  );

  // Wide shoulders + outer hills/banks
  buildRibbon(-48, -1.8, -(ROAD_HALF_WIDTH + CURB_WIDTH), 0.02, 4.0, 0.06, turfMat);
  buildRibbon(ROAD_HALF_WIDTH + CURB_WIDTH, 0.02, 48, -1.8, 4.0, 0.06, turfMat);

  // Guardrails at +-12.5m
  buildRibbon(-VERGE_OUTER, 0.0, -VERGE_OUTER, 1.05, 1.0, 0.25, railMat);
  buildRibbon(VERGE_OUTER, 0.0, VERGE_OUTER, 1.05, 1.0, 0.25, railMat);

  // Ground basin floor so horizon has zero gaps
  const groundGeo = new THREE.PlaneGeometry(1400, 1400, 12, 12);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(
    groundGeo,
    createPsxMaterial({ color: 0x3b4029, affine: 0.2 })
  );
  groundMesh.position.set(140, -5.5, -40);
  scene.add(groundMesh);

  // Start / Finish Gantry Arch at s = 0
  const startSmp = samples[0];
  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startSmp.pos);
  const startYaw = Math.atan2(-startSmp.flatTan.x, -startSmp.flatTan.z);
  gantryGroup.rotation.y = startYaw;

  const pillarMat = createPsxMaterial({ color: 0xc8bfae });
  const bannerMat = createPsxMaterial({ map: textures.checkered, side: THREE.DoubleSide });
  const roadLineMat = createPsxMaterial({ map: textures.checkered });

  const pillarGeo = new THREE.BoxGeometry(1.2, 7.5, 1.2);
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-11.5, 3.75, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(11.5, 3.75, 0);
  gantryGroup.add(leftPillar, rightPillar);

  const bannerGeo = new THREE.BoxGeometry(24.2, 2.1, 0.8);
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 6.8, 0);
  gantryGroup.add(banner);

  const finishStrip = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, 2.4), roadLineMat);
  finishStrip.rotation.x = -Math.PI / 2;
  finishStrip.position.set(0, 0.05, 0);
  gantryGroup.add(finishStrip);
  scene.add(gantryGroup);

  // Corner warning chevrons + low-poly PSX pine trees & rock pillars along trackside
  const chevLeftMat = createPsxMaterial({ map: textures.chevronLeft, side: THREE.DoubleSide });
  const chevRightMat = createPsxMaterial({ map: textures.chevronRight, side: THREE.DoubleSide });
  const trunkMat = createPsxMaterial({ color: 0x4f3624 });
  const pineMat = createPsxMaterial({ map: textures.treeFoliage });
  const rockMat = createPsxMaterial({ color: 0x5c4b45 });

  const signGeo = new THREE.PlaneGeometry(3.2, 1.5);
  const postGeo = new THREE.BoxGeometry(0.22, 2.0, 0.22);
  const coneGeo = new THREE.ConeGeometry(3.2, 8.5, 5);
  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.65, 2.6, 5);
  const rockGeo = new THREE.DodecahedronGeometry(5.5, 0);

  for (let i = 0; i < segments; i += 4) {
    const smp = samples[i];
    const lookAhead = samples[(i + 6) % segments];

    // Place chevron signs on the outside of sharp corners
    if (Math.abs(lookAhead.curvature) > 0.011 && i % 8 === 0) {
      const turningRight = lookAhead.curvature > 0;
      const sideSign = turningRight ? -1 : 1; // Outside shoulder
      const signGroup = new THREE.Group();
      signGroup.position
        .copy(smp.pos)
        .addScaledVector(smp.right, sideSign * (VERGE_OUTER + 0.8));
      signGroup.rotation.y = Math.atan2(-smp.flatTan.x, -smp.flatTan.z);

      const post = new THREE.Mesh(postGeo, pillarMat);
      post.position.y = 1.0;
      const board = new THREE.Mesh(signGeo, turningRight ? chevRightMat : chevLeftMat);
      board.position.y = 2.1;
      signGroup.add(post, board);
      scene.add(signGroup);
    }

    // Trackside trees & low-poly PSX buttes well outside guardrails
    if (i % 6 === 0 && i > 6 && i < segments - 6) {
      const side = (i / 6) % 2 === 0 ? 1 : -1;
      const dist = 18 + ((i * 17) % 19);
      const tree = new THREE.Group();
      tree.position
        .copy(smp.pos)
        .addScaledVector(smp.right, side * dist);
      tree.position.y -= 0.6;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.3;
      const crown = new THREE.Mesh(coneGeo, pineMat);
      crown.position.y = 6.2;
      const scale = 0.85 + ((i * 7) % 5) * 0.14;
      tree.scale.setScalar(scale);
      tree.add(trunk, crown);
      scene.add(tree);
    }

    if (i % 24 === 12) {
      const side = (i / 24) % 2 === 0 ? -1 : 1;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position
        .copy(smp.pos)
        .addScaledVector(smp.right, side * 34);
      rock.position.y += 1.5;
      rock.rotation.set(i * 0.3, i * 0.7, 0);
      rock.scale.set(1.6, 2.2, 1.4);
      scene.add(rock);
    }
  }

  // Distant PS1 horizon mountain ring
  const mountainMat = createPsxMaterial({ color: 0x382b34, affine: 0.1 });
  for (let m = 0; m < 18; m++) {
    const ang = (m / 18) * Math.PI * 2;
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(55 + (m % 3) * 22, 65 + (m % 4) * 18, 4),
      mountainMat
    );
    peak.position.set(140 + Math.cos(ang) * 420, 22, -40 + Math.sin(ang) * 420);
    peak.rotation.y = ang;
    scene.add(peak);
  }

  function sampleTrack(sNorm) {
    const wrapped = ((sNorm % 1) + 1) % 1;
    const f = wrapped * segments;
    const i0 = Math.floor(f) % segments;
    const i1 = (i0 + 1) % segments;
    const alpha = f - Math.floor(f);

    const a = samples[i0];
    const b = samples[i1];

    const pos = new THREE.Vector3().lerpVectors(a.pos, b.pos, alpha);
    const tan = new THREE.Vector3().lerpVectors(a.tan, b.tan, alpha).normalize();
    const flatTan = new THREE.Vector3().lerpVectors(a.flatTan, b.flatTan, alpha).normalize();
    const right = new THREE.Vector3().lerpVectors(a.right, b.right, alpha).normalize();
    const curvature = a.curvature + (b.curvature - a.curvature) * alpha;

    return { pos, tan, flatTan, right, curvature };
  }

  return {
    curve,
    totalLength,
    sampleTrack,
  };
}
