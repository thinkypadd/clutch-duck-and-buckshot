import * as THREE from 'three';
import { CARS } from './catalog.js';
import { buildVehicle3D } from './carMesh.js';
import { createPsxMaterial } from './psx.js';

const RIVAL_ROSTER = [
  {
    name: 'RAZOR V8',
    carKey: 'muscle',
    paint: 0xc9302c,
    parts: { engine: 1, armor: 1, trans: 1, nitro: 1 },
    baseSpeed: 46.5,
    maxHp: 115,
  },
  {
    name: 'COBALT GT',
    carKey: 'coupe',
    paint: 0x2859a8,
    parts: { engine: 1, armor: 0, trans: 2, nitro: 1 },
    baseSpeed: 45.2,
    maxHp: 100,
  },
  {
    name: 'DUST DEVIL',
    carKey: 'rally',
    paint: 0xd48a22,
    parts: { engine: 2, armor: 0, trans: 1, nitro: 1 },
    baseSpeed: 44.4,
    maxHp: 95,
  },
  {
    name: 'WARHOG UTE',
    carKey: 'truck',
    paint: 0x3b6e4c,
    parts: { engine: 1, armor: 2, trans: 0, nitro: 0 },
    baseSpeed: 42.8,
    maxHp: 125,
  },
  {
    name: 'CHROME VIPER',
    carKey: 'coupe',
    paint: 0x8f96a3,
    parts: { engine: 1, armor: 1, trans: 1, nitro: 0 },
    baseSpeed: 41.6,
    maxHp: 100,
  },
  {
    name: 'REDLINE HATCH',
    carKey: 'rally',
    paint: 0xa83256,
    parts: { engine: 0, armor: 1, trans: 1, nitro: 1 },
    baseSpeed: 40.5,
    maxHp: 95,
  },
];

export function createRivalManager(scene, track, count = 5) {
  const group = new THREE.Group();
  scene.add(group);

  const rivals = [];
  const particles = [];

  const fireMat = createPsxMaterial({ color: 0xff9d26, emissive: 0xcc4400 });
  const smokeMat = createPsxMaterial({ color: 0x2a2628 });
  const sparkMat = createPsxMaterial({ color: 0xffe478, emissive: 0xb8860b });
  const muzzleMat = createPsxMaterial({ color: 0xfff3a1, emissive: 0xff8800 });
  const cubeGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);

  function spawnBurst(worldPos, burstCount, mode = 'spark') {
    for (let i = 0; i < burstCount; i++) {
      const mat =
        mode === 'fire'
          ? i % 2 === 0
            ? fireMat
            : smokeMat
          : mode === 'muzzle'
          ? muzzleMat
          : sparkMat;
      const p = new THREE.Mesh(cubeGeo, mat);
      p.position.copy(worldPos);
      p.position.y += mode === 'muzzle' ? 1.15 : 0.75 + Math.random() * 0.6;
      const scale =
        mode === 'fire' ? 0.9 + Math.random() * 1.2 : mode === 'muzzle' ? 0.65 : 0.45 + Math.random() * 0.4;
      p.scale.setScalar(scale);
      group.add(p);
      particles.push({
        mesh: p,
        vel:
          mode === 'muzzle'
            ? new THREE.Vector3((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3)
            : new THREE.Vector3(
                (Math.random() - 0.5) * 13,
                4.0 + Math.random() * 9,
                (Math.random() - 0.5) * 13
              ),
        life: mode === 'muzzle' ? 0.14 : 0.5 + Math.random() * 0.5,
        gravity: mode === 'fire' ? -2.5 : 10.5, // Smoke rises!
      });
    }
  }

  const activeRoster = RIVAL_ROSTER.slice(0, count);
  const lateralSpread = track.isOpenWorld ? 18.0 : 6.2;

  activeRoster.forEach((entry, i) => {
    const carSpec = CARS[entry.carKey] || CARS.coupe;
    const mesh = buildVehicle3D(carSpec, entry.parts, entry.paint);
    group.add(mesh);

    const startOffset = -0.006 + (count - i) * 0.0065;
    const s = (((startOffset % 1) + 1) % 1);
    const startLat = (i % 2 === 0 ? 1 : -1) * (3.4 + (i % 3) * (track.isOpenWorld ? 3.5 : 1.1));

    rivals.push({
      id: i,
      name: entry.name,
      mesh,
      s,
      totalProgress: startOffset,
      lateral: startLat,
      targetLateral: startLat,
      baseSpeed: entry.baseSpeed + (track.isOpenWorld ? 2.5 : 0),
      speed: 0,
      hp: entry.maxHp,
      maxHp: entry.maxHp,
      eliminated: false,
      spinAngle: 0,
      spinVel: 0,
      aggroTimer: 0,
      shotCooldown: 1.8 + Math.random() * 1.4,
      bumpCooldown: 0,
      laneTimer: 1.4 + i * 0.6,
      smokeAccumulator: 0,
      worldPos: new THREE.Vector3(),
    });
  });

  function syncRivalTransform(r) {
    const smp = track.sampleTrack(r.s);
    r.worldPos.copy(smp.pos).addScaledVector(smp.right, r.lateral);
    r.mesh.position.copy(r.worldPos);
    const roadYaw = Math.atan2(-smp.flatTan.x, -smp.flatTan.z);
    r.mesh.rotation.set(0, roadYaw + r.spinAngle, 0);
    if (r.eliminated) {
      r.mesh.rotation.z = 0.16;
    }
  }

  rivals.forEach(syncRivalTransform);

  function update(dt, playerCar, playerStats, raceActive) {
    let playerBumped = false;
    let enemyShotSide = null; // 'left' | 'right' | null
    let enemyShotDamage = 0;
    let ramWreckedRival = null;

    const playerSmp = track.sampleTrack(playerCar.s);
    const playerWorldPos = playerSmp.pos.clone().addScaledVector(playerSmp.right, playerCar.lateral);

    let threatLeft = false;
    let threatRight = false;

    for (const r of rivals) {
      r.bumpCooldown = Math.max(0, r.bumpCooldown - dt);

      if (r.eliminated) {
        // Permanent wreck: spins to a halt on shoulder/flats and burns for the whole race
        if (r.speed > 0.2) {
          r.speed = Math.max(0, r.speed - 24 * dt);
          r.spinAngle += r.spinVel * dt;
          r.spinVel *= Math.max(0, 1 - dt * 1.8);
          const shoulder = track.isOpenWorld
            ? r.lateral >= 0
              ? 22
              : -22
            : r.lateral >= 0
            ? 9.6
            : -9.6;
          r.lateral += (shoulder - r.lateral) * Math.min(1, dt * 1.8);
          const ds = (r.speed * dt) / track.totalLength;
          r.s = (((r.s + ds) % 1) + 1) % 1;
        }
        r.smokeAccumulator += dt;
        if (r.smokeAccumulator > 0.16) {
          r.smokeAccumulator = 0;
          spawnBurst(r.worldPos, 1, 'fire');
        }
        syncRivalTransform(r);
        continue;
      }

      if (raceActive) {
        r.aggroTimer = Math.max(0, r.aggroTimer - dt);

        const gapProgress = playerCar.totalProgress - r.totalProgress;
        const longMeters = gapProgress * track.totalLength;

        // Proximity door-to-door check for side-window indicators & natural late-race rivalry
        if (Math.abs(longMeters) < 16) {
          if (r.lateral < playerCar.lateral - 1.2) threatLeft = true;
          else if (r.lateral > playerCar.lateral + 1.2) threatRight = true;
          if (playerCar.lap >= 2 && Math.abs(longMeters) < 8 && r.aggroTimer <= 0) {
            r.aggroTimer = 4.5;
          }
        }

        let rubber = 1.0;
        if (gapProgress > 0.06) rubber = 1.15;
        else if (gapProgress < -0.09) rubber = 0.88;

        const smp = track.sampleTrack(r.s);
        const cornerSlow = Math.abs(smp.curvature) > 0.012 ? 0.85 : 1.0;
        const dmgSlow = r.hp < r.maxHp * 0.45 ? 0.9 : 1.0;
        const desiredSpeed = r.baseSpeed * rubber * cornerSlow * dmgSlow;

        if (r.speed < desiredSpeed) {
          r.speed = Math.min(desiredSpeed, r.speed + 18.5 * dt);
        } else {
          r.speed = Math.max(desiredSpeed, r.speed - 15.0 * dt);
        }

        // AI Lateral Line + Hostile Retaliation (Ramming & Window Gunfire!)
        if (r.aggroTimer > 0 && Math.abs(longMeters) < 28) {
          // Hostile rival swerves toward player's door to ram or line up a window shot!
          const sideOffset = r.lateral < playerCar.lateral ? -2.3 : 2.3;
          r.targetLateral = playerCar.lateral + (Math.abs(longMeters) < 6 ? sideOffset * 0.35 : sideOffset);

          r.shotCooldown -= dt;
          const dist3D = r.worldPos.distanceTo(playerWorldPos);
          if (r.shotCooldown <= 0 && dist3D < 32) {
            r.shotCooldown = 1.75 + Math.random() * 1.2;
            const winPos = r.worldPos.clone();
            winPos.x += smp.right.x * (r.lateral < playerCar.lateral ? 1.0 : -1.0);
            spawnBurst(winPos, 3, 'muzzle');
            enemyShotSide = r.lateral < playerCar.lateral ? 'left' : 'right';
            const armorMitigation = playerStats.parts.armor === 2 ? 0.62 : playerStats.parts.armor === 1 ? 0.8 : 1.0;
            enemyShotDamage += Math.round(7.5 * armorMitigation);
          }
        } else {
          r.laneTimer -= dt;
          if (r.laneTimer <= 0) {
            r.laneTimer = 1.9 + Math.random() * 2.4;
            r.targetLateral = (Math.random() - 0.5) * 2 * lateralSpread;
          }
        }

        r.lateral += (r.targetLateral - r.lateral) * Math.min(1, dt * 1.65);

        if (r.hp < r.maxHp * 0.6) {
          r.smokeAccumulator += dt;
          if (r.smokeAccumulator > 0.18) {
            r.smokeAccumulator = 0;
            spawnBurst(r.worldPos, 1, 'spark');
          }
        }

        const ds = (r.speed * dt) / track.totalLength;
        r.s = (((r.s + ds) % 1) + 1) % 1;
        r.totalProgress += ds;
      }

      syncRivalTransform(r);

      // Car-to-car collision & mutual ramming combat!
      if (raceActive) {
        const distSq = r.worldPos.distanceToSquared(playerWorldPos);
        if (distSq < 9.6) {
          const pushSign = playerCar.lateral >= r.lateral ? 1 : -1;
          playerCar.lateral += pushSign * 14.0 * dt;
          r.lateral -= pushSign * 12.0 * dt;

          if (r.bumpCooldown <= 0) {
            r.bumpCooldown = 0.42;
            r.aggroTimer = Math.max(r.aggroTimer, 11.0);
            spawnBurst(r.worldPos, 5, 'spark');
            playerBumped = true;

            // Player ramming damage to rival (deadly in V8 Interceptor with Blower active!)
            const blowerBonus = playerCar.blowerActive ? 1.55 : 1.0;
            const ramToRival = Math.round(14 * playerStats.ramMult * blowerBonus);
            r.hp -= ramToRival;

            // Rival ramming damage to player armor
            const armorFactor = playerStats.parts.armor >= 1 ? 0.65 : 1.0;
            playerCar.armor = Math.max(0, playerCar.armor - Math.round(5.5 * armorFactor));

            if (r.hp <= 0 && !r.eliminated) {
              eliminateRival(r);
              ramWreckedRival = r.name;
            }
          }
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        group.remove(p.mesh);
        particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= p.gravity * dt;
      p.mesh.rotation.x += 5 * dt;
      p.mesh.rotation.y += 4 * dt;
    }

    return {
      playerBumped,
      enemyShotSide,
      enemyShotDamage,
      ramWreckedRival,
      threatLeft,
      threatRight,
    };
  }

  function eliminateRival(r) {
    r.eliminated = true;
    r.hp = 0;
    r.spinVel = (Math.random() > 0.5 ? 1 : -1) * 11.5;
    spawnBurst(r.worldPos, 20, 'fire');
  }

  function fireWeaponAt(camera, ndcX, ndcY, gunStats) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;

    let bestRival = null;
    let bestDist = Infinity;

    for (const r of rivals) {
      if (r.eliminated) continue;
      const targetCenter = r.worldPos.clone();
      targetCenter.y += 0.95;

      const toTarget = targetCenter.sub(origin);
      const along = toTarget.dot(dir);
      if (along < 1.2 || along > gunStats.maxRange) continue;

      const closestOnRay = dir.clone().multiplyScalar(along);
      const perpDist = toTarget.distanceTo(closestOnRay);
      const spreadRadius =
        gunStats.spec.spreadBase + gunStats.spreadBonus + along * gunStats.spec.spreadSlope;

      if (perpDist <= spreadRadius && along < bestDist) {
        bestDist = along;
        bestRival = r;
      }
    }

    if (!bestRival) {
      return { hit: false, wrecked: false, rivalName: null };
    }

    // Provoke target & nearby rivals to shoot/ram back!
    bestRival.aggroTimer = 16.0;
    for (const other of rivals) {
      if (!other.eliminated && other.worldPos.distanceTo(bestRival.worldPos) < 22) {
        other.aggroTimer = Math.max(other.aggroTimer, 7.5);
      }
    }

    const dmg = bestDist <= gunStats.closeRange ? gunStats.damageClose : gunStats.damageMid;
    bestRival.hp -= dmg;

    if (bestRival.hp <= 0) {
      eliminateRival(bestRival);
      return { hit: true, wrecked: true, rivalName: bestRival.name };
    }

    // Revolver & Sawed-off shove hit rivals sideways
    const knock = gunStats.spec.id === 'revolver' || gunStats.spec.id === 'sawed_off' ? 2.4 : 0.7;
    bestRival.speed *= 0.92;
    bestRival.lateral += (Math.random() > 0.5 ? 1 : -1) * knock;
    spawnBurst(bestRival.worldPos, 6, 'spark');
    return { hit: true, wrecked: false, rivalName: bestRival.name };
  }

  function getAliveCount() {
    let alive = 0;
    for (const r of rivals) if (!r.eliminated) alive++;
    return alive;
  }

  function getPlayerRank(playerProgress) {
    let ahead = 0;
    for (const r of rivals) {
      if (!r.eliminated && r.totalProgress > playerProgress) ahead++;
    }
    return ahead + 1;
  }

  return {
    rivals,
    update,
    fireWeaponAt,
    getAliveCount,
    getPlayerRank,
    dispose: () => scene.remove(group),
  };
}
