import * as THREE from 'three';
import { CARS, LEAGUES } from './catalog.js';
import { buildVehicle3D } from './carMesh.js';
import { createPsxMaterial } from './psx.js';

const RIVAL_TEMPLATES = [
  {
    name: 'TETANUS REX',
    carKey: 'junker',
    paint: 0x6e5c49,
    parts: { block: 0, intake: 0, armor: 0, bumper: 1, tires: 0 },
    baseSpeed: 40.5,
    maxHp: 88,
    armored: false,
  },
  {
    name: 'PRIMER GHOST',
    carKey: 'junker',
    paint: 0x555c63,
    parts: { block: 1, intake: 1, armor: 1, bumper: 0, tires: 0 },
    baseSpeed: 42.0,
    maxHp: 94,
    armored: false,
  },
  {
    name: 'COBALT 86',
    carKey: 'coupe',
    paint: 0x2859a8,
    parts: { block: 1, intake: 1, armor: 0, bumper: 0, tires: 1 },
    baseSpeed: 45.4,
    maxHp: 98,
    armored: false,
  },
  {
    name: 'SAND VIPER',
    carKey: 'buggy',
    paint: 0xd49b24,
    parts: { block: 1, intake: 1, armor: 0, bumper: 1, tires: 1 },
    baseSpeed: 46.8,
    maxHp: 94,
    armored: false,
  },
  {
    name: 'RAZOR V8',
    carKey: 'muscle',
    paint: 0xc9302c,
    parts: { block: 2, intake: 3, armor: 1, bumper: 2, tires: 2 },
    baseSpeed: 50.2,
    maxHp: 128,
    armored: true,
  },
  {
    name: 'WARHOG UTE',
    carKey: 'truck',
    paint: 0x3b6e4c,
    parts: { block: 2, intake: 1, armor: 3, bumper: 3, tires: 1 },
    baseSpeed: 48.0,
    maxHp: 156,
    armored: true,
  },
  {
    name: 'APEX ROTOR',
    carKey: 'rotary',
    paint: 0x992659,
    parts: { block: 2, intake: 2, armor: 1, bumper: 1, tires: 2 },
    baseSpeed: 52.5,
    maxHp: 112,
    armored: false,
  },
  {
    name: 'GROUP-B FURY',
    carKey: 'rally',
    paint: 0xd9821e,
    parts: { block: 3, intake: 2, armor: 2, bumper: 1, tires: 3 },
    baseSpeed: 55.2,
    maxHp: 124,
    armored: true,
  },
  {
    name: 'SILVER VALKYRIE',
    carKey: 'hyper',
    paint: 0xb8c4d4,
    parts: { block: 3, intake: 2, armor: 2, bumper: 2, tires: 3 },
    baseSpeed: 58.0,
    maxHp: 134,
    armored: true,
  },
];

export function createRivalManager(
  scene,
  track,
  count = 5,
  leagueSpec = LEAGUES.scrapyard
) {
  const group = new THREE.Group();
  scene.add(group);

  const rivals = [];
  const particles = [];
  const hazards = [];

  const fireMat = createPsxMaterial({ color: 0xff9d26, emissive: 0xcc4400 });
  const smokeMat = createPsxMaterial({ color: 0x2a2628 });
  const sparkMat = createPsxMaterial({ color: 0xffe478, emissive: 0xb8860b });
  const muzzleMat = createPsxMaterial({ color: 0xfff3a1, emissive: 0xff8800 });
  const oilMat = createPsxMaterial({ color: 0x17141f, emissive: 0x120b1c });
  const spikeSteelMat = createPsxMaterial({ color: 0xb8c4d8 });
  const mineBodyMat = createPsxMaterial({ color: 0x252a33 });
  const mineLedMat = createPsxMaterial({ color: 0xff3b30, emissive: 0xcc140a });
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
      p.position.y += mode === 'muzzle' ? 1.15 : 0.72 + Math.random() * 0.65;
      const scale =
        mode === 'fire'
          ? 0.95 + Math.random() * 1.35
          : mode === 'muzzle'
          ? 0.65
          : 0.45 + Math.random() * 0.4;
      p.scale.setScalar(scale);
      group.add(p);
      particles.push({
        mesh: p,
        vel:
          mode === 'muzzle'
            ? new THREE.Vector3((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3)
            : new THREE.Vector3(
                (Math.random() - 0.5) * 14,
                4.2 + Math.random() * 9.5,
                (Math.random() - 0.5) * 14
              ),
        life: mode === 'muzzle' ? 0.14 : 0.5 + Math.random() * 0.55,
        gravity: mode === 'fire' ? -2.6 : 10.5,
      });
    }
  }

  // Filter roster by league pool and cycle if needed
  const poolTemplates = RIVAL_TEMPLATES.filter((t) =>
    leagueSpec.rosterPool.includes(t.carKey)
  );
  const sourceList = poolTemplates.length > 0 ? poolTemplates : RIVAL_TEMPLATES;
  const lateralSpread = track.isOpenWorld ? 18.0 : 6.2;

  for (let i = 0; i < count; i++) {
    const entry = sourceList[i % sourceList.length];
    const carSpec = CARS[entry.carKey] || CARS.coupe;
    const paint = i >= sourceList.length ? entry.paint ^ 0x223344 : entry.paint;
    const mesh = buildVehicle3D(carSpec, entry.parts, paint);
    group.add(mesh);

    const startOffset = -0.006 + (count - i) * 0.0065;
    const s = (((startOffset % 1) + 1) % 1);
    const startLat =
      (i % 2 === 0 ? 1 : -1) * (3.4 + (i % 3) * (track.isOpenWorld ? 3.5 : 1.1));
    const scaledHp = Math.round(entry.maxHp * leagueSpec.hpScale);

    rivals.push({
      id: i,
      name: i >= sourceList.length ? `${entry.name} II` : entry.name,
      mesh,
      s,
      totalProgress: startOffset,
      lateral: startLat,
      targetLateral: startLat,
      baseSpeed: entry.baseSpeed * leagueSpec.speedScale + (track.isOpenWorld ? 2.2 : 0),
      speed: 0,
      hp: scaledHp,
      maxHp: scaledHp,
      armored: entry.armored,
      eliminated: false,
      spinAngle: 0,
      spinVel: 0,
      oilSpinTimer: 0,
      flatTireTimer: 0,
      burnTimer: 0,
      hazardHitCooldown: 0,
      aggroTimer: 0,
      shotCooldown: 1.8 + Math.random() * 1.4,
      bumpCooldown: 0,
      laneTimer: 1.4 + i * 0.6,
      smokeAccumulator: 0,
      worldPos: new THREE.Vector3(),
    });
  }

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

  function eliminateRival(r) {
    if (r.eliminated) return;
    r.eliminated = true;
    r.hp = 0;
    r.burnTimer = 0;
    r.spinVel = (Math.random() > 0.5 ? 1 : -1) * 11.5;
    spawnBurst(r.worldPos, 22, 'fire');
  }

  function spawnPlayerHazard(playerS, playerLateral, type) {
    const sBehind = (((playerS - 4.8 / track.totalLength) % 1) + 1) % 1;
    const smp = track.sampleTrack(sBehind);
    const worldPos = smp.pos.clone().addScaledVector(smp.right, playerLateral);
    const roadYaw = Math.atan2(-smp.flatTan.x, -smp.flatTan.z);

    const hGroup = new THREE.Group();
    hGroup.position.copy(worldPos);
    hGroup.rotation.y = roadYaw;

    if (type === 'oil') {
      const puddle = new THREE.Mesh(
        new THREE.CylinderGeometry(2.7, 2.9, 0.06, 10),
        oilMat
      );
      puddle.position.y = 0.05;
      hGroup.add(puddle);
    } else if (type === 'spikes') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 0.7), mineBodyMat);
      bar.position.y = 0.08;
      hGroup.add(bar);
      const coneGeo = new THREE.ConeGeometry(0.18, 0.42, 4);
      for (let k = -4; k <= 4; k++) {
        const sp = new THREE.Mesh(coneGeo, spikeSteelMat);
        sp.position.set(k * 0.48, 0.28, (k % 2) * 0.16);
        hGroup.add(sp);
      }
    } else if (type === 'mine') {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 0.22, 8),
        mineBodyMat
      );
      disc.position.y = 0.14;
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.42), mineLedMat);
      beacon.position.y = 0.32;
      hGroup.add(disc, beacon);
    } else if (type === 'napalm') {
      for (let f = -3; f <= 3; f++) {
        const flame = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.9 + Math.abs(f % 2) * 0.4, 0.75),
          fireMat
        );
        flame.position.set(f * 0.72, 0.5, (f % 2) * 0.25);
        hGroup.add(flame);
      }
      spawnBurst(worldPos, 10, 'fire');
    }

    group.add(hGroup);
    hazards.push({
      type,
      mesh: hGroup,
      worldPos,
      life: type === 'napalm' ? 11.0 : 28.0,
      pulseTimer: 0,
    });
  }

  function blastRearFireball(playerCar) {
    const sBehind = (((playerCar.s - 3.6 / track.totalLength) % 1) + 1) % 1;
    const smp = track.sampleTrack(sBehind);
    const blastPos = smp.pos.clone().addScaledVector(smp.right, playerCar.lateral);
    spawnBurst(blastPos, 16, 'fire');

    const wreckedNames = [];
    let hitName = null;
    for (const r of rivals) {
      if (r.eliminated) continue;
      if (r.worldPos.distanceTo(blastPos) <= 13.5) {
        r.aggroTimer = 14.0;
        r.hp -= 44;
        r.burnTimer = Math.max(r.burnTimer, 4.5);
        r.speed *= 0.84;
        if (r.hp <= 0) {
          eliminateRival(r);
          wreckedNames.push(r.name);
        } else {
          hitName = r.name;
        }
      }
    }
    return { hitName, wreckedNames };
  }

  function update(dt, playerCar, playerStats, raceActive, godMode = false) {
    let playerBumped = false;
    let enemyShotSide = null;
    let enemyShotDamage = 0;
    const wreckedNames = [];
    let hazardHitText = null;

    const playerSmp = track.sampleTrack(playerCar.s);
    const playerWorldPos = playerSmp.pos
      .clone()
      .addScaledVector(playerSmp.right, playerCar.lateral);

    let threatLeft = false;
    let threatRight = false;
    let tailgaterClose = false;

    // Step active 3D Trunk Hazards on the road
    for (let hIdx = hazards.length - 1; hIdx >= 0; hIdx--) {
      const hz = hazards[hIdx];
      hz.life -= dt;
      hz.pulseTimer += dt;
      if (hz.type === 'mine' && hz.mesh.children[1]) {
        hz.mesh.children[1].visible = Math.floor(hz.pulseTimer * 7) % 2 === 0;
      } else if (hz.type === 'napalm' && Math.floor((hz.pulseTimer - dt) * 5) !== Math.floor(hz.pulseTimer * 5)) {
        spawnBurst(hz.worldPos, 1, 'fire');
      }
      if (hz.life <= 0) {
        group.remove(hz.mesh);
        hazards.splice(hIdx, 1);
      }
    }

    for (const r of rivals) {
      r.bumpCooldown = Math.max(0, r.bumpCooldown - dt);
      r.hazardHitCooldown = Math.max(0, r.hazardHitCooldown - dt);

      if (r.eliminated) {
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

        // Ground collision with burning wreck unless Baja Buggy vaults over it!
        if (
          raceActive &&
          playerCar.jumpY <= 0.48 &&
          r.worldPos.distanceToSquared(playerWorldPos) < 8.4 &&
          r.bumpCooldown <= 0
        ) {
          r.bumpCooldown = 0.55;
          playerBumped = true;
          playerCar.speed *= 0.82;
          spawnBurst(r.worldPos, 5, 'spark');
        }
        continue;
      }

      if (raceActive) {
        r.aggroTimer = Math.max(0, r.aggroTimer - dt);
        r.flatTireTimer = Math.max(0, r.flatTireTimer - dt);

        if (r.oilSpinTimer > 0) {
          r.oilSpinTimer = Math.max(0, r.oilSpinTimer - dt);
          r.spinAngle += r.spinVel * dt;
          r.spinVel *= Math.max(0, 1 - dt * 2.2);
        } else {
          r.spinAngle *= Math.max(0, 1 - dt * 6.5);
        }

        // Fire Burn DoT (Incendiary Ammo / Rear Napalm / Rotary Backfire)
        if (r.burnTimer > 0) {
          r.burnTimer = Math.max(0, r.burnTimer - dt);
          r.hp -= 8.5 * dt;
          if (Math.random() < dt * 7) spawnBurst(r.worldPos, 1, 'fire');
          if (r.hp <= 0) {
            eliminateRival(r);
            wreckedNames.push(r.name);
            continue;
          }
        }

        // Check collision with deployed 3D Trunk Hazards!
        if (r.hazardHitCooldown <= 0) {
          for (let hIdx = hazards.length - 1; hIdx >= 0; hIdx--) {
            const hz = hazards[hIdx];
            const hitR2 = hz.type === 'napalm' ? 16.0 : hz.type === 'mine' ? 15.0 : 12.2;
            if (r.worldPos.distanceToSquared(hz.worldPos) <= hitR2) {
              r.hazardHitCooldown = 1.25;
              r.aggroTimer = 14.0;
              if (hz.type === 'oil') {
                r.oilSpinTimer = 1.65;
                r.spinVel = (Math.random() > 0.5 ? 1 : -1) * 11.5;
                r.speed *= 0.45;
                r.hp -= 12;
                spawnBurst(r.worldPos, 5, 'spark');
                hazardHitText = `${r.name} SPUN ON OIL!`;
              } else if (hz.type === 'spikes') {
                r.flatTireTimer = 5.5;
                r.speed *= 0.55;
                r.hp -= 34;
                spawnBurst(r.worldPos, 9, 'spark');
                hazardHitText = `${r.name} HIT CALTROPS!`;
              } else if (hz.type === 'mine') {
                spawnBurst(hz.worldPos, 24, 'fire');
                r.hp -= 90;
                r.speed *= 0.5;
                // Splash damage to nearby pack!
                for (const other of rivals) {
                  if (other !== r && !other.eliminated && other.worldPos.distanceTo(hz.worldPos) < 10.5) {
                    other.hp -= 48;
                    if (other.hp <= 0) {
                      eliminateRival(other);
                      wreckedNames.push(other.name);
                    }
                  }
                }
                group.remove(hz.mesh);
                hazards.splice(hIdx, 1);
                hazardHitText = `MINE BLASTED ${r.name}!`;
              } else if (hz.type === 'napalm') {
                r.hp -= 45;
                r.burnTimer = 6.0;
                spawnBurst(r.worldPos, 10, 'fire');
                hazardHitText = `${r.name} IGNITED!`;
              }

              if (r.hp <= 0 && !r.eliminated) {
                eliminateRival(r);
                wreckedNames.push(r.name);
              }
              break;
            }
          }
          if (r.eliminated) continue;
        }

        const gapProgress = playerCar.totalProgress - r.totalProgress;
        const longMeters = gapProgress * track.totalLength;

        if (longMeters > 2 && longMeters < 26 && Math.abs(r.lateral - playerCar.lateral) < 4.5) {
          tailgaterClose = true;
        }

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
        const flatSlow = r.flatTireTimer > 0 ? 0.55 : 1.0;
        const oilSlow = r.oilSpinTimer > 0 ? 0.5 : 1.0;
        const desiredSpeed = r.baseSpeed * rubber * cornerSlow * dmgSlow * flatSlow * oilSlow;

        if (r.speed < desiredSpeed) {
          r.speed = Math.min(desiredSpeed, r.speed + 18.5 * dt);
        } else {
          r.speed = Math.max(desiredSpeed, r.speed - 15.0 * dt);
        }

        if (r.aggroTimer > 0 && Math.abs(longMeters) < 28) {
          const sideOffset = r.lateral < playerCar.lateral ? -2.3 : 2.3;
          r.targetLateral =
            playerCar.lateral + (Math.abs(longMeters) < 6 ? sideOffset * 0.35 : sideOffset);

          r.shotCooldown -= dt;
          const dist3D = r.worldPos.distanceTo(playerWorldPos);
          if (r.shotCooldown <= 0 && dist3D < 32) {
            r.shotCooldown = 1.75 + Math.random() * 1.2;
            const winPos = r.worldPos.clone();
            winPos.x += smp.right.x * (r.lateral < playerCar.lateral ? 1.0 : -1.0);
            spawnBurst(winPos, 3, 'muzzle');
            enemyShotSide = r.lateral < playerCar.lateral ? 'left' : 'right';
            if (!godMode) {
              enemyShotDamage += Math.max(
                1,
                Math.round(7.5 * leagueSpec.aggroDamageScale * playerStats.bulletMitigation)
              );
            }
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

      // Car-to-car collision & mutual ramming combat (bypassed if airborne via Hydro-Jump!)
      if (raceActive && playerCar.jumpY <= 0.48) {
        const distSq = r.worldPos.distanceToSquared(playerWorldPos);
        if (distSq < 9.6) {
          const pushSign = playerCar.lateral >= r.lateral ? 1 : -1;
          playerCar.lateral += pushSign * 14.0 * dt;
          r.lateral -= pushSign * 12.0 * dt;

          if (r.bumpCooldown <= 0) {
            r.bumpCooldown = 0.42;
            r.aggroTimer = Math.max(r.aggroTimer, 11.0);
            spawnBurst(r.worldPos, 6, 'spark');
            playerBumped = true;

            const blowerBonus = playerCar.blowerActive ? 1.5 : 1.0;
            const ramToRival = Math.round(14 * playerStats.ramMult * blowerBonus);
            r.hp -= ramToRival;

            if (!godMode) {
              const armorFactor = playerStats.bulletMitigation;
              playerCar.armor = Math.max(0, playerCar.armor - Math.round(5.5 * armorFactor));
            }

            if (r.hp <= 0 && !r.eliminated) {
              eliminateRival(r);
              wreckedNames.push(r.name);
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
      wreckedNames,
      hazardHitText,
      threatLeft,
      threatRight,
      tailgaterClose,
    };
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

    // M79 40mm Thumper explosive splash blast (detonates on direct hit OR ground impact near pack!)
    if (gunStats.splashRadius > 0) {
      let blastCenter = bestRival ? bestRival.worldPos.clone() : null;
      if (!blastCenter && dir.y < -0.02) {
        const tGround = (origin.y - 1.2) / -dir.y;
        if (tGround > 3 && tGround <= gunStats.maxRange) {
          blastCenter = origin.clone().addScaledVector(dir, tGround);
        }
      }
      if (!blastCenter) {
        return { hit: false, wreckedNames: [], rivalName: null };
      }
      spawnBurst(blastCenter, 22, 'fire');
      const wreckedNames = [];
      let hitAny = null;
      for (const r of rivals) {
        if (r.eliminated) continue;
        const d = r.worldPos.distanceTo(blastCenter);
        if (d <= gunStats.splashRadius) {
          r.aggroTimer = 16.0;
          const falloff = r === bestRival ? 1.0 : Math.max(0.45, 1 - d / (gunStats.splashRadius + 2));
          r.hp -= Math.round(gunStats.damageClose * falloff);
          if (gunStats.incendiary) r.burnTimer = Math.max(r.burnTimer, 5.5);
          if (r.hp <= 0) {
            eliminateRival(r);
            wreckedNames.push(r.name);
          } else {
            r.speed *= 0.82;
            r.lateral += (Math.random() > 0.5 ? 1 : -1) * 3.2;
            hitAny = r.name;
          }
        }
      }
      return {
        hit: Boolean(hitAny || wreckedNames.length > 0),
        wreckedNames,
        rivalName: hitAny || wreckedNames[0] || null,
      };
    }

    if (!bestRival) {
      return { hit: false, wreckedNames: [], rivalName: null };
    }

    bestRival.aggroTimer = 16.0;
    for (const other of rivals) {
      if (!other.eliminated && other.worldPos.distanceTo(bestRival.worldPos) < 22) {
        other.aggroTimer = Math.max(other.aggroTimer, 7.5);
      }
    }

    let dmg = bestDist <= gunStats.closeRange ? gunStats.damageClose : gunStats.damageMid;
    if (bestRival.armored && !gunStats.armorPiercing) {
      dmg = Math.round(dmg * 0.84);
    } else if (bestRival.armored && gunStats.armorPiercing) {
      dmg = Math.round(dmg * 1.15);
    }

    bestRival.hp -= dmg;
    if (gunStats.incendiary) {
      bestRival.burnTimer = Math.max(bestRival.burnTimer, 5.5);
      spawnBurst(bestRival.worldPos, 6, 'fire');
    }

    if (bestRival.hp <= 0) {
      eliminateRival(bestRival);
      return { hit: true, wreckedNames: [bestRival.name], rivalName: bestRival.name };
    }

    const baseKnock =
      gunStats.spec.id === 'revolver' ||
      gunStats.spec.id === 'sawed_off' ||
      gunStats.spec.id === 'pump_shotgun'
        ? 2.4
        : 0.75;
    bestRival.speed *= 0.92;
    bestRival.lateral += (Math.random() > 0.5 ? 1 : -1) * baseKnock * gunStats.shoveBonus;
    spawnBurst(bestRival.worldPos, 6, 'spark');
    return { hit: true, wreckedNames: [], rivalName: bestRival.name };
  }

  function wreckAllRivals() {
    const names = [];
    for (const r of rivals) {
      if (!r.eliminated) {
        eliminateRival(r);
        names.push(r.name);
      }
    }
    return names;
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
    spawnPlayerHazard,
    blastRearFireball,
    wreckAllRivals,
    getAliveCount,
    getPlayerRank,
    dispose: () => scene.remove(group),
  };
}
