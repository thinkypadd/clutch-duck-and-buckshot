import * as THREE from 'three';
import { createPsxMaterial } from './psx.js';

const RIVAL_SPECS = [
  { name: 'CRIMSON GT', bodyColor: 0xc9302c, stripeColor: 0xf4efe6, baseSpeed: 40.2, lanePref: 2.8 },
  { name: 'COBALT TURBO', bodyColor: 0x2859a8, stripeColor: 0xffb020, baseSpeed: 39.2, lanePref: -2.6 },
  { name: 'OCHRE RALLY', bodyColor: 0xd48a22, stripeColor: 0x1a1c20, baseSpeed: 38.0, lanePref: 3.4 },
  { name: 'JADE INTERCEPT', bodyColor: 0x2d7d52, stripeColor: 0xe8e2d2, baseSpeed: 36.8, lanePref: -3.2 },
  { name: 'IRON COUP', bodyColor: 0x8f96a3, stripeColor: 0xd63629, baseSpeed: 35.5, lanePref: 0.4 },
];

function createRivalMesh(spec) {
  const group = new THREE.Group();

  const bodyMat = createPsxMaterial({ color: spec.bodyColor, snapScale: 1.0 });
  const stripeMat = createPsxMaterial({ color: spec.stripeColor, snapScale: 1.0 });
  const glassMat = createPsxMaterial({ color: 0x1e2836, snapScale: 1.0 });
  const tireMat = createPsxMaterial({ color: 0x17181b, snapScale: 1.0 });
  const tailMat = createPsxMaterial({
    color: 0xff3b2f,
    emissive: 0xb81d13,
    snapScale: 1.0,
  });
  const headMat = createPsxMaterial({
    color: 0xfff0c2,
    emissive: 0x8a7540,
    snapScale: 1.0,
  });

  // Chunky 90s PS1 lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.68, 4.3), bodyMat);
  chassis.position.y = 0.62;
  group.add(chassis);

  // Racing hood/roof stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 4.32), stripeMat);
  stripe.position.y = 0.63;
  group.add(stripe);

  // Greenhouse cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.58, 2.05), glassMat);
  cabin.position.set(0, 1.2, -0.15);
  group.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 1.65), bodyMat);
  roof.position.set(0, 1.5, -0.15);
  group.add(roof);

  // Rear wing spoiler
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.12, 0.36), stripeMat);
  wing.position.set(0, 1.16, 1.92);
  group.add(wing);

  // Glowing twin taillights (+Z is rear of car in local space when facing -Z)
  const tailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.1), tailMat);
  tailLeft.position.set(-0.64, 0.72, 2.16);
  const tailRight = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.1), tailMat);
  tailRight.position.set(0.64, 0.72, 2.16);
  group.add(tailLeft, tailRight);

  const headLeft = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.1), headMat);
  headLeft.position.set(-0.64, 0.66, -2.16);
  const headRight = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.1), headMat);
  headRight.position.set(0.64, 0.66, -2.16);
  group.add(headLeft, headRight);

  // 4 blocky wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 6);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelOffsets = [
    [-1.02, 0.38, -1.32],
    [1.02, 0.38, -1.32],
    [-1.02, 0.38, 1.32],
    [1.02, 0.38, 1.32],
  ];
  for (const [wx, wy, wz] of wheelOffsets) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, wy, wz);
    group.add(w);
  }

  return group;
}

export function createRivalManager(scene, track) {
  const rivals = [];
  const particles = [];

  const fireMat = createPsxMaterial({ color: 0xff9d26, emissive: 0xcc4400 });
  const smokeMat = createPsxMaterial({ color: 0x3a3538 });
  const sparkMat = createPsxMaterial({ color: 0xffe478, emissive: 0xb8860b });
  const cubeGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);

  function spawnBurst(worldPos, count, isFire) {
    for (let i = 0; i < count; i++) {
      const mat = isFire ? (i % 2 === 0 ? fireMat : smokeMat) : sparkMat;
      const p = new THREE.Mesh(cubeGeo, mat);
      p.position.copy(worldPos);
      p.position.y += 0.7 + Math.random() * 0.6;
      const scale = isFire ? 0.8 + Math.random() * 1.1 : 0.45 + Math.random() * 0.4;
      p.scale.setScalar(scale);
      scene.add(p);
      particles.push({
        mesh: p,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          3.5 + Math.random() * 8,
          (Math.random() - 0.5) * 12
        ),
        life: 0.45 + Math.random() * 0.45,
      });
    }
  }

  RIVAL_SPECS.forEach((spec, i) => {
    const mesh = createRivalMesh(spec);
    scene.add(mesh);
    // Stagger grid ahead of player (player starts at s = 0.985, totalProgress = -0.015)
    const startOffset = -0.008 + (5 - i) * 0.0065;
    const s = ((startOffset % 1) + 1) % 1;
    rivals.push({
      id: i,
      name: spec.name,
      mesh,
      s,
      totalProgress: startOffset,
      lateral: i % 2 === 0 ? 3.1 : -3.1,
      targetLateral: spec.lanePref,
      baseSpeed: spec.baseSpeed,
      speed: 0,
      hp: 2,
      wrecked: false,
      wreckTimer: 0,
      spinAngle: 0,
      laneTimer: 1.5 + i * 0.7,
      smokeAccumulator: 0,
      worldPos: new THREE.Vector3(),
      hitFlash: 0,
    });
  });

  function resetRivals() {
    rivals.forEach((r, i) => {
      const startOffset = -0.008 + (5 - i) * 0.0065;
      r.s = ((startOffset % 1) + 1) % 1;
      r.totalProgress = startOffset;
      r.lateral = i % 2 === 0 ? 3.1 : -3.1;
      r.targetLateral = RIVAL_SPECS[i].lanePref;
      r.speed = 0;
      r.hp = 2;
      r.wrecked = false;
      r.wreckTimer = 0;
      r.spinAngle = 0;
      r.mesh.rotation.set(0, 0, 0);
      syncRivalTransform(r);
    });
  }

  function syncRivalTransform(r) {
    const smp = track.sampleTrack(r.s);
    r.worldPos.copy(smp.pos).addScaledVector(smp.right, r.lateral);
    r.mesh.position.copy(r.worldPos);
    const roadYaw = Math.atan2(-smp.flatTan.x, -smp.flatTan.z);
    r.mesh.rotation.set(0, roadYaw + r.spinAngle, 0);
    if (r.wrecked) {
      r.mesh.rotation.z = Math.sin(r.spinAngle * 2) * 0.22;
    }
  }

  function update(dt, playerCar, raceActive) {
    let playerBumped = false;
    const playerSmp = track.sampleTrack(playerCar.s);
    const playerWorldPos = playerSmp.pos.clone().addScaledVector(playerSmp.right, playerCar.lateral);

    for (const r of rivals) {
      if (raceActive) {
        if (r.wrecked) {
          r.wreckTimer -= dt;
          r.speed = Math.max(0, r.speed - 22 * dt);
          r.spinAngle += 9.5 * dt;
          // Slide wrecked hull toward nearest road edge so lane stays passable
          const edgeTarget = r.lateral >= 0 ? 8.2 : -8.2;
          r.lateral += (edgeTarget - r.lateral) * Math.min(1, dt * 2.5);

          r.smokeAccumulator += dt;
          if (r.smokeAccumulator > 0.09) {
            r.smokeAccumulator = 0;
            spawnBurst(r.worldPos, 2, true);
          }

          if (r.wreckTimer <= 0) {
            r.wrecked = false;
            r.hp = 2;
            r.spinAngle = 0;
            r.speed = r.baseSpeed * 0.65;
          }
        } else {
          // Mild rubber-banding keeps rivals in exciting shotgun & overtaking range
          const gap = playerCar.totalProgress - r.totalProgress;
          let rubber = 1.0;
          if (gap > 0.08) rubber = 1.14;
          else if (gap < -0.10) rubber = 0.89;

          const smp = track.sampleTrack(r.s);
          const cornerSlow = Math.abs(smp.curvature) > 0.012 ? 0.84 : 1.0;
          const damageFactor = r.hp === 1 ? 0.86 : 1.0;
          const desiredSpeed = r.baseSpeed * rubber * cornerSlow * damageFactor;

          if (r.speed < desiredSpeed) {
            r.speed = Math.min(desiredSpeed, r.speed + 19.5 * dt);
          } else {
            r.speed = Math.max(desiredSpeed, r.speed - 16.0 * dt);
          }

          r.laneTimer -= dt;
          if (r.laneTimer <= 0) {
            r.laneTimer = 2.0 + Math.random() * 2.6;
            r.targetLateral = (Math.random() - 0.5) * 11.5;
          }
          r.lateral += (r.targetLateral - r.lateral) * Math.min(1, dt * 1.4);

          if (r.hp === 1) {
            r.smokeAccumulator += dt;
            if (r.smokeAccumulator > 0.14) {
              r.smokeAccumulator = 0;
              spawnBurst(r.worldPos, 1, false);
            }
          }
        }

        const ds = (r.speed * dt) / track.totalLength;
        r.s = ((r.s + ds) % 1 + 1) % 1;
        r.totalProgress += ds;
      }

      syncRivalTransform(r);

      // Car-to-car bump check with player (rivals jostle & trade paint, never shoot)
      if (raceActive && !r.wrecked) {
        const distSq = r.worldPos.distanceToSquared(playerWorldPos);
        if (distSq < 9.2) {
          const pushSign = playerCar.lateral >= r.lateral ? 1 : -1;
          playerCar.lateral += pushSign * 14.5 * dt;
          r.lateral -= pushSign * 10.0 * dt;
          if (playerCar.speed > r.speed + 4) {
            playerCar.speed *= 0.92;
            r.speed += 3;
          }
          spawnBurst(r.worldPos, 3, false);
          playerBumped = true;
        }
      }
    }

    // Update debris/smoke/fire cubes
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 9.5 * dt;
      p.mesh.rotation.x += 5 * dt;
      p.mesh.rotation.y += 4 * dt;
    }

    return { playerBumped };
  }

  // Test buckshot cone from camera through normalized screen point (ndcX, ndcY)
  function fireBuckshotAt(camera, ndcX, ndcY) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;

    let bestRival = null;
    let bestDist = Infinity;

    for (const r of rivals) {
      if (r.wrecked) continue;
      const targetCenter = r.worldPos.clone();
      targetCenter.y += 0.95;

      const toTarget = targetCenter.sub(origin);
      const along = toTarget.dot(dir);
      if (along < 1.5 || along > 72) continue;

      const closestOnRay = dir.clone().multiplyScalar(along);
      const perpDist = toTarget.distanceTo(closestOnRay);
      // Sawed-off buckshot spread widens with distance
      const spreadRadius = 1.75 + along * 0.088;

      if (perpDist <= spreadRadius && along < bestDist) {
        bestDist = along;
        bestRival = r;
      }
    }

    if (!bestRival) {
      return { hit: false, wrecked: false, rivalName: null };
    }

    // Close blast (< 30m) wrecks in 1 shot; mid-range (30m..72m) wrecks in 2 hits
    const dmg = bestDist <= 30 ? 2 : 1;
    bestRival.hp -= dmg;

    if (bestRival.hp <= 0) {
      bestRival.wrecked = true;
      bestRival.wreckTimer = 4.8;
      spawnBurst(bestRival.worldPos, 16, true);
      return { hit: true, wrecked: true, rivalName: bestRival.name };
    }

    bestRival.speed *= 0.74;
    bestRival.lateral += (Math.random() > 0.5 ? 1 : -1) * 2.1;
    spawnBurst(bestRival.worldPos, 8, false);
    return { hit: true, wrecked: false, rivalName: bestRival.name };
  }

  function getPlayerRank(playerProgress) {
    let ahead = 0;
    for (const r of rivals) {
      if (r.totalProgress > playerProgress) ahead++;
    }
    return ahead + 1;
  }

  resetRivals();

  return {
    rivals,
    resetRivals,
    update,
    fireBuckshotAt,
    getPlayerRank,
  };
}
