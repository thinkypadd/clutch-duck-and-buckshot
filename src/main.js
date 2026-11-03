import * as THREE from 'three';
import {
  CARS,
  CAR_UPGRADES,
  GUNS,
  GUN_UPGRADES,
  TRACKS,
  createDefaultSave,
  loadSave,
  persistSave,
  getComputedCarStats,
  getComputedGunStats,
  purchaseCar,
  purchaseCarUpgrade,
  purchaseGun,
  purchaseGunUpgrade,
} from './catalog.js';
import {
  createCarState,
  createNitroState,
  createLoadoutState,
  stepCarPhysics,
  stepNitro,
  stepWeaponTimers,
  formatRaceTime,
  formatOrdinal,
} from './logic.js';
import { SoundEngine } from './audio.js';
import {
  PSX_WIDTH,
  PSX_HEIGHT,
  CANYON_FOG,
  BADLANDS_FOG,
  SHOWROOM_FOG,
  setGlobalPsxFog,
  createPsxPostPass,
  buildPsxTextures,
} from './psx.js';
import { buildVehicle3D } from './carMesh.js';
import { buildShowroomStage, buildCircuit } from './track.js';
import { createRivalManager } from './rivals.js';
import { drawGunWorkbenchPreview } from './weaponArt.js';
import { createCockpitController } from './cockpit.js';

const viewportEl = document.getElementById('viewport');
const glCanvas = document.getElementById('gl-canvas');
const cockpitCanvas = document.getElementById('cockpit-canvas');
const gunPreviewCanvas = document.getElementById('gun-preview-canvas');

const screenLoading = document.getElementById('screen-loading');
const screenError = document.getElementById('screen-error');
const errorMsgEl = document.getElementById('error-message');
const screenHub = document.getElementById('screen-hub');
const screenSettings = document.getElementById('screen-settings');
const screenFinish = document.getElementById('screen-finish');

const btnCornerSettings = document.getElementById('btn-corner-settings');
const btnLaunchRace = document.getElementById('btn-launch-race');
const btnToggleAudio = document.getElementById('btn-toggle-audio');
const btnResetSave = document.getElementById('btn-reset-save');
const btnResume = document.getElementById('btn-resume');
const btnRestartRace = document.getElementById('btn-restart-race');
const btnQuitHub = document.getElementById('btn-quit-hub');
const btnFinishGarage = document.getElementById('btn-finish-garage');
const btnRaceAgain = document.getElementById('btn-race-again');
const btnRetry = document.getElementById('btn-retry');

const hubCashEl = document.getElementById('hub-cash');
const hubLoadoutEl = document.getElementById('hub-loadout-summary');
const turntableCaptionEl = document.getElementById('turntable-caption');
const trackListEl = document.getElementById('track-list');
const showroomListEl = document.getElementById('showroom-car-list');
const showroomDetailEl = document.getElementById('showroom-detail');
const mechanicUpgradesEl = document.getElementById('mechanic-upgrades');
const gunshopListEl = document.getElementById('gunshop-list');
const gunshopDetailEl = document.getElementById('gunshop-detail');
const gunshopUpgradesEl = document.getElementById('gunshop-upgrades');

const pauseRaceStatusEl = document.getElementById('pause-race-status');
const finishHeadingEl = document.getElementById('finish-heading');
const finishRankEl = document.getElementById('finish-rank');
const finishReasonEl = document.getElementById('finish-reason');
const finishTimeEl = document.getElementById('finish-time');
const finishWrecksEl = document.getElementById('finish-wrecks');
const finishPayoutEl = document.getElementById('finish-payout');
const finishBankEl = document.getElementById('finish-bank');

let save = loadSave();
let previewCarId = save.selectedCar;
let previewGunId = save.primaryGun;
let resetConfirmArmed = false;

// Phases: 'HUB' | 'COUNTDOWN' | 'RACING' | 'PAUSED_HUB' | 'PAUSED_RACE' | 'FINISHED' | 'ERROR'
let phase = 'LOADING';
let countdownTimer = 0;
let lastCountdownBeat = 4;
let raceTime = 0;
let screenFlash = 0;
let hurtFlash = 0;
let impactShake = 0;
let smoothRoll = 0;
let bumpSoundCooldown = 0;
let turntableAngle = 0.55;

// Keyboard side-window look state (A/Q = Left -1, D/E = Right +1)
const lookKeys = { left: false, right: false };

const sound = new SoundEngine();
let carStats = getComputedCarStats(save);
let car = createCarState(carStats);
let nitro = createNitroState(carStats);
let loadout = createLoadoutState(save);
let currentTrackSpec = TRACKS[save.selectedTrack] || TRACKS.canyon;
let rivalThreats = { left: false, right: false };

function showOverlayState(mode) {
  screenLoading.classList.add('hidden');
  screenError.classList.toggle('hidden', mode !== 'ERROR');
  screenHub.classList.toggle('hidden', mode !== 'HUB');
  screenSettings.classList.toggle('hidden', mode !== 'SETTINGS');
  screenFinish.classList.toggle('hidden', mode !== 'FINISH');
  viewportEl.classList.toggle('menu-mode', mode === 'HUB');
}

try {
  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(PSX_WIDTH, PSX_HEIGHT, false);
  renderer.setClearColor(SHOWROOM_FOG, 1);

  const scene = new THREE.Scene();

  // Dynamic sky dome supporting Dusk Canyon, Badlands Desert, and Showroom dark ceiling
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uHorizon: { value: new THREE.Color(0x422522) },
      uMid: { value: new THREE.Color(0x1e1824) },
      uZenith: { value: new THREE.Color(0x090b12) },
    },
    vertexShader: /* glsl */ `
      varying float vHeight;
      void main() {
        vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uHorizon;
      uniform vec3 uMid;
      uniform vec3 uZenith;
      varying float vHeight;
      void main() {
        float h = clamp(vHeight, 0.0, 1.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, h));
        col = mix(col, uZenith, smoothstep(0.24, 0.78, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(950, 12, 8), skyMat);
  scene.add(skyMesh);

  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.35, 980);
  const postPass = createPsxPostPass();
  const textures = buildPsxTextures();

  // 3D Showroom Stage & Live Turntable Vehicle
  const showroom = buildShowroomStage(scene, textures);
  let showroomVehicleMesh = null;

  function rebuildShowroomVehicle(carId = previewCarId) {
    if (showroomVehicleMesh) {
      showroom.turntable.remove(showroomVehicleMesh);
    }
    const spec = CARS[carId] || CARS.coupe;
    const parts = save.carParts[carId] || { engine: 0, armor: 0, trans: 0, nitro: 0 };
    showroomVehicleMesh = buildVehicle3D(spec, parts);
    showroom.turntable.add(showroomVehicleMesh);
    turntableCaptionEl.textContent = `${spec.name} | ${
      save.ownedCars[carId] ? 'OWNED' : `$${spec.price}`
    }`;
  }

  let activeTrack = null;
  let activeRivals = null;

  const cockpit = createCockpitController(cockpitCanvas, sound, {
    isInteractive: () => phase === 'COUNTDOWN' || phase === 'RACING',
    getState: () => ({ car, nitro, loadout, carStats }),
    onWeaponFired: (ndcX, ndcY, gunStats) => {
      screenFlash = Math.max(screenFlash, gunStats.spec.id === 'sawed_off' ? 0.45 : 0.22);
      impactShake = Math.max(impactShake, gunStats.spec.id === 'smg' ? 2.4 : 4.6);
      if (phase !== 'RACING' || !activeRivals) return;

      const res = activeRivals.fireWeaponAt(camera, ndcX, ndcY, gunStats);
      if (res.wrecked) {
        loadout.wrecksCount += 1;
        loadout.bountyEarned += currentTrackSpec.wreckBounty;
        sound.playRivalWreck();
        cockpit.setStatus(
          `WRECKED ${res.rivalName} +$${currentTrackSpec.wreckBounty}!`,
          '#6be36b',
          2.4
        );
        // Check instant Last-Car-Standing Wipeout Victory!
        if (activeRivals.getAliveCount() === 0) {
          finishRace('WIPEOUT');
        }
      } else if (res.hit) {
        sound.playCrash(0.6);
        cockpit.setStatus(`HIT ${res.rivalName}!`, '#ffb020', 1.2);
      }
    },
  });

  // === HUB & SHOPS RENDERING ===
  function refreshHubUI() {
    carStats = getComputedCarStats(save);
    hubCashEl.textContent = `$${save.cash}`;
    const gunSummary = carStats.dualHolster
      ? `${GUNS[save.primaryGun].name} + ${GUNS[save.secondaryGun]?.name || 'NONE'}`
      : GUNS[save.primaryGun].name;
    hubLoadoutEl.textContent = `CAR: ${CARS[save.selectedCar].name} | GUN: ${gunSummary}`;

    renderTrackTab();
    renderShowroomTab();
    renderMechanicTab();
    renderGunShopTab();
    rebuildShowroomVehicle(previewCarId);
  }

  function renderTrackTab() {
    trackListEl.innerHTML = '';
    for (const trk of Object.values(TRACKS)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `track-card${save.selectedTrack === trk.id ? ' selected' : ''}`;
      btn.innerHTML = `
        <div class="track-card-title">
          <span>${trk.name}</span>
          <span>1ST: $${trk.firstPrize}</span>
        </div>
        <div class="track-card-sub">${trk.subtitle} | +$${trk.wreckBounty}/WRECK</div>
        <div class="track-card-desc">${trk.desc}</div>
      `;
      btn.addEventListener('click', () => {
        sound.init();
        save.selectedTrack = trk.id;
        persistSave(save);
        renderTrackTab();
      });
      trackListEl.appendChild(btn);
    }
  }

  function renderShowroomTab() {
    showroomListEl.innerHTML = '';
    for (const c of Object.values(CARS)) {
      const owned = !!save.ownedCars[c.id];
      const equipped = save.selectedCar === c.id;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `select-chip${previewCarId === c.id ? ' active' : ''}`;
      chip.innerHTML = `
        <strong>${c.name}</strong>
        <span class="chip-price">${equipped ? 'EQUIPPED' : owned ? 'OWNED' : `$${c.price}`}</span>
      `;
      chip.addEventListener('click', () => {
        sound.init();
        previewCarId = c.id;
        renderShowroomTab();
        rebuildShowroomVehicle(previewCarId);
      });
      showroomListEl.appendChild(chip);
    }

    const pStats = getComputedCarStats(save, previewCarId);
    const spec = pStats.spec;
    const owned = !!save.ownedCars[previewCarId];
    const equipped = save.selectedCar === previewCarId;

    showroomDetailEl.innerHTML = `
      <div class="spec-header">
        <span class="spec-name">${spec.name}</span>
        <span>${owned ? 'IN GARAGE' : `PRICE: $${spec.price}`}</span>
      </div>
      <p class="spec-tagline">${spec.tagline}</p>
      <div class="stat-bars">
        <div class="stat-cell"><span>TOP SPEED</span><strong>${pStats.topMph} MPH</strong></div>
        <div class="stat-cell"><span>ARMOR</span><strong>${pStats.maxArmor} HP</strong></div>
        <div class="stat-cell"><span>NITRO CAP</span><strong>${pStats.maxNitroStacks}X</strong></div>
      </div>
      <div class="gimmick-banner">
        <strong>GIMMICK (${spec.gimmickName}):</strong> ${spec.gimmickDesc}
      </div>
    `;

    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'cta-btn full-width';
    if (equipped) {
      actionBtn.textContent = 'CURRENTLY DRIVING';
      actionBtn.disabled = true;
    } else if (owned) {
      actionBtn.textContent = `DRIVE ${spec.name}`;
      actionBtn.addEventListener('click', () => {
        purchaseCar(save, previewCarId);
        sound.playShopBuy();
        persistSave(save);
        refreshHubUI();
      });
    } else {
      const canAfford = save.cash >= spec.price;
      actionBtn.textContent = canAfford
        ? `BUY & DRIVE ($${spec.price})`
        : `NEED $${spec.price - save.cash} MORE`;
      actionBtn.disabled = !canAfford;
      actionBtn.addEventListener('click', () => {
        if (purchaseCar(save, previewCarId).ok) {
          sound.playShopBuy();
          persistSave(save);
          refreshHubUI();
        }
      });
    }
    showroomDetailEl.appendChild(actionBtn);
  }

  function renderMechanicTab() {
    previewCarId = save.selectedCar;
    mechanicUpgradesEl.innerHTML = '';
    const curCarId = save.selectedCar;
    const curParts = save.carParts[curCarId];

    for (const [slotKey, track] of Object.entries(CAR_UPGRADES)) {
      const grp = document.createElement('div');
      grp.className = 'upgrade-group';
      grp.innerHTML = `<div class="upgrade-group-title">${track.label} (${CARS[curCarId].name})</div>`;
      const row = document.createElement('div');
      row.className = 'tier-row';

      track.tiers.forEach((tier, idx) => {
        const currentTier = curParts[slotKey] || 0;
        const isEq = currentTier === idx;
        const alreadyPaid = idx <= currentTier;
        const canAfford = alreadyPaid || save.cash >= tier.price;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tier-btn${isEq ? ' equipped' : ''}`;
        btn.disabled = !isEq && !canAfford;
        btn.innerHTML = `
          <span><strong>${tier.name}</strong><br/>${tier.desc}</span>
          <span class="tier-cost">${isEq ? 'INSTALLED' : alreadyPaid ? 'FREE' : `$${tier.price}`}</span>
        `;
        btn.addEventListener('click', () => {
          sound.init();
          if (purchaseCarUpgrade(save, curCarId, slotKey, idx).ok) {
            sound.playShopBuy();
            persistSave(save);
            refreshHubUI();
          }
        });
        row.appendChild(btn);
      });

      grp.appendChild(row);
      mechanicUpgradesEl.appendChild(grp);
    }
  }

  function renderGunShopTab() {
    gunshopListEl.innerHTML = '';
    for (const g of Object.values(GUNS)) {
      const owned = !!save.ownedGuns[g.id];
      const isPrim = save.primaryGun === g.id;
      const isSec = carStats.dualHolster && save.secondaryGun === g.id;
      const status = isPrim
        ? 'PRIMARY'
        : isSec
        ? '2ND HOLSTER'
        : owned
        ? 'OWNED'
        : `$${g.price}`;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `select-chip${previewGunId === g.id ? ' active' : ''}`;
      chip.innerHTML = `<strong>${g.name}</strong><span class="chip-price">${status}</span>`;
      chip.addEventListener('click', () => {
        sound.init();
        previewGunId = g.id;
        renderGunShopTab();
      });
      gunshopListEl.appendChild(chip);
    }

    const gStats = getComputedGunStats(save, previewGunId);
    drawGunWorkbenchPreview(gunPreviewCanvas, gStats);

    const spec = gStats.spec;
    const owned = !!save.ownedGuns[previewGunId];
    const isPrim = save.primaryGun === previewGunId;

    gunshopDetailEl.innerHTML = `
      <div class="spec-header">
        <span class="spec-name">${spec.name}</span>
        <span>${spec.auto ? 'FULL-AUTO' : 'SEMI-AUTO'}</span>
      </div>
      <p class="spec-tagline">${spec.tagline}</p>
      <div class="stat-bars">
        <div class="stat-cell"><span>DAMAGE</span><strong>${gStats.damageClose} / ${gStats.damageMid}</strong></div>
        <div class="stat-cell"><span>CAPACITY</span><strong>${gStats.capacity} RDS</strong></div>
        <div class="stat-cell"><span>RANGE</span><strong>${gStats.maxRange}M</strong></div>
      </div>
      <div class="gimmick-banner"><strong>RELOAD:</strong> ${spec.reloadHint}</div>
    `;

    const btnWrap = document.createElement('div');
    btnWrap.className = 'panel-actions';

    const primBtn = document.createElement('button');
    primBtn.type = 'button';
    primBtn.className = 'cta-btn';
    if (isPrim) {
      primBtn.textContent = 'EQUIPPED PRIMARY';
      primBtn.disabled = true;
    } else if (owned) {
      primBtn.textContent = 'EQUIP PRIMARY';
      primBtn.addEventListener('click', () => {
        purchaseGun(save, previewGunId, 'primary');
        sound.playShopBuy();
        persistSave(save);
        refreshHubUI();
      });
    } else {
      const canBuy = save.cash >= spec.price;
      primBtn.textContent = canBuy ? `BUY & EQUIP ($${spec.price})` : `NEED $${spec.price - save.cash} MORE`;
      primBtn.disabled = !canBuy;
      primBtn.addEventListener('click', () => {
        if (purchaseGun(save, previewGunId, 'primary').ok) {
          sound.playShopBuy();
          persistSave(save);
          refreshHubUI();
        }
      });
    }
    btnWrap.appendChild(primBtn);

    if (carStats.dualHolster && owned && !isPrim) {
      const secBtn = document.createElement('button');
      secBtn.type = 'button';
      secBtn.className = 'ctrl-btn';
      const isSec = save.secondaryGun === previewGunId;
      secBtn.textContent = isSec ? 'IN 2ND HOLSTER' : 'SET 2ND HOLSTER';
      secBtn.disabled = isSec;
      secBtn.addEventListener('click', () => {
        purchaseGun(save, previewGunId, 'secondary');
        sound.playShopBuy();
        persistSave(save);
        refreshHubUI();
      });
      btnWrap.appendChild(secBtn);
    }

    gunshopDetailEl.appendChild(btnWrap);

    // Weapon modular upgrades
    gunshopUpgradesEl.innerHTML = '';
    if (owned) {
      const curGParts = save.gunParts[previewGunId];
      for (const [slotKey, track] of Object.entries(GUN_UPGRADES)) {
        const grp = document.createElement('div');
        grp.className = 'upgrade-group';
        grp.innerHTML = `<div class="upgrade-group-title">${track.label}</div>`;
        const row = document.createElement('div');
        row.className = 'tier-row';

        track.tiers.forEach((tier, idx) => {
          const curIdx = curGParts[slotKey] || 0;
          const isEq = curIdx === idx;
          const paid = idx <= curIdx;
          const canAfford = paid || save.cash >= tier.price;

          const tBtn = document.createElement('button');
          tBtn.type = 'button';
          tBtn.className = `tier-btn${isEq ? ' equipped' : ''}`;
          tBtn.disabled = !isEq && !canAfford;
          tBtn.innerHTML = `
            <span><strong>${tier.name}</strong><br/>${tier.desc}</span>
            <span class="tier-cost">${isEq ? 'FITTED' : paid ? 'FREE' : `$${tier.price}`}</span>
          `;
          tBtn.addEventListener('click', () => {
            sound.init();
            if (purchaseGunUpgrade(save, previewGunId, slotKey, idx).ok) {
              sound.playShopBuy();
              persistSave(save);
              refreshHubUI();
            }
          });
          row.appendChild(tBtn);
        });

        grp.appendChild(row);
        gunshopUpgradesEl.appendChild(grp);
      }
    }
  }

  // Hub tab switching
  document.querySelectorAll('.hub-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      sound.init();
      const targetTab = tabBtn.dataset.tab;
      document.querySelectorAll('.hub-tab').forEach((b) => {
        const match = b.dataset.tab === targetTab;
        b.classList.toggle('active', match);
        b.setAttribute('aria-selected', String(match));
      });
      document.getElementById('tab-race').classList.toggle('hidden', targetTab !== 'race');
      document.getElementById('tab-showroom').classList.toggle('hidden', targetTab !== 'showroom');
      document.getElementById('tab-mechanic').classList.toggle('hidden', targetTab !== 'mechanic');
      document.getElementById('tab-gunshop').classList.toggle('hidden', targetTab !== 'gunshop');

      if (targetTab === 'mechanic' || targetTab === 'race') {
        previewCarId = save.selectedCar;
        rebuildShowroomVehicle(previewCarId);
      }
      refreshHubUI();
    });
  });

  // === SCENE TRANSITIONS: ENTER HUB vs START RACE ===
  function enterGarageHub() {
    if (activeTrack) {
      activeTrack.dispose();
      activeTrack = null;
    }
    if (activeRivals) {
      activeRivals.dispose();
      activeRivals = null;
    }
    showroom.group.visible = true;
    renderer.setClearColor(SHOWROOM_FOG, 1);
    setGlobalPsxFog(SHOWROOM_FOG, 18.0, 52.0);
    skyMat.uniforms.uHorizon.value.setHex(0x1b1f2b);
    skyMat.uniforms.uMid.value.setHex(0x11141c);
    skyMat.uniforms.uZenith.value.setHex(0x090a0e);

    sound.suspendEngine();
    lookKeys.left = false;
    lookKeys.right = false;
    previewCarId = save.selectedCar;
    phase = 'HUB';
    refreshHubUI();
    showOverlayState('HUB');
  }

  function startSelectedRace() {
    if (activeTrack) activeTrack.dispose();
    if (activeRivals) activeRivals.dispose();

    showroom.group.visible = false;
    currentTrackSpec = TRACKS[save.selectedTrack] || TRACKS.canyon;

    const fogCol = currentTrackSpec.isOpenWorld ? BADLANDS_FOG : CANYON_FOG;
    renderer.setClearColor(fogCol, 1);
    setGlobalPsxFog(
      fogCol,
      currentTrackSpec.isOpenWorld ? 95.0 : 65.0,
      currentTrackSpec.isOpenWorld ? 360.0 : 245.0
    );

    if (currentTrackSpec.isOpenWorld) {
      skyMat.uniforms.uHorizon.value.setHex(0x7d4227);
      skyMat.uniforms.uMid.value.setHex(0x452424);
      skyMat.uniforms.uZenith.value.setHex(0x171424);
    } else {
      skyMat.uniforms.uHorizon.value.setHex(0x4a2926);
      skyMat.uniforms.uMid.value.setHex(0x211926);
      skyMat.uniforms.uZenith.value.setHex(0x090b14);
    }

    activeTrack = buildCircuit(scene, textures, currentTrackSpec.id);
    activeRivals = createRivalManager(scene, activeTrack, currentTrackSpec.rivalCount);

    carStats = getComputedCarStats(save);
    car = createCarState(carStats);
    nitro = createNitroState(carStats);
    loadout = createLoadoutState(save);
    cockpit.releaseAllHolds(car, nitro);
    cockpit.resetCabinEffects(1);

    raceTime = 0;
    countdownTimer = 2.4;
    lastCountdownBeat = 4;
    screenFlash = 0;
    hurtFlash = 0;
    impactShake = 0;
    smoothRoll = 0;
    rivalThreats = { left: false, right: false };

    phase = 'COUNTDOWN';
    showOverlayState('NONE');
    cockpit.setStatus('AUTO-DRIVE READY: SHIFT 1-6!', '#ffb020', 2.4);
  }

  function finishRace(mode = 'FINISH') {
    cockpit.releaseAllHolds(car, nitro);
    sound.suspendEngine();

    let rank = activeRivals ? activeRivals.getPlayerRank(car.totalProgress) : 1;
    let placementPrize = 0;
    let wipeoutBonus = 0;

    if (mode === 'WIPEOUT') {
      rank = 1;
      placementPrize = currentTrackSpec.firstPrize;
      wipeoutBonus = 200;
      finishHeadingEl.textContent = 'TOTAL WIPEOUT VICTORY';
      finishRankEl.textContent = '1ST PLACE (LAST CAR ALIVE)';
      finishReasonEl.textContent = `Every rival permanently wrecked! +$${wipeoutBonus} Wipeout Bonus.`;
      sound.playLap(true);
      save.totalWins += 1;
    } else if (mode === 'WRECKED') {
      placementPrize = 75;
      finishHeadingEl.textContent = 'CHASSIS WRECKED';
      finishRankEl.textContent = 'DNF - SALVAGE TOW';
      finishReasonEl.textContent = 'Enemy fire & collisions breached your armor. Upgrade armor in the Mechanic Garage!';
      sound.playRivalWreck();
    } else {
      const prizeScale = [1.0, 0.65, 0.45, 0.28, 0.18, 0.12, 0.1];
      placementPrize = Math.round(currentTrackSpec.firstPrize * (prizeScale[rank - 1] ?? 0.1));
      finishHeadingEl.textContent = 'CHECKERED FLAG';
      finishRankEl.textContent = `${formatOrdinal(rank)} PLACE`;
      finishReasonEl.textContent = `Completed ${currentTrackSpec.laps} laps at ${currentTrackSpec.name}.`;
      sound.playLap(true);
      if (rank === 1) save.totalWins += 1;
    }

    const totalEarned = placementPrize + loadout.bountyEarned + wipeoutBonus;
    save.cash += totalEarned;
    save.totalWrecks += loadout.wrecksCount;
    persistSave(save);

    finishTimeEl.textContent = formatRaceTime(raceTime);
    finishWrecksEl.textContent = `${loadout.wrecksCount} (+$${loadout.bountyEarned})`;
    finishPayoutEl.textContent = `+$${totalEarned}`;
    finishBankEl.textContent = `$${save.cash}`;

    phase = 'FINISHED';
    showOverlayState('FINISH');
    btnFinishGarage.focus();
  }

  // === SETTINGS / PAUSE MENU ===
  function openSettingsModal() {
    resetConfirmArmed = false;
    btnResetSave.textContent = 'RESET PROGRESS';

    if (phase === 'RACING' || phase === 'COUNTDOWN') {
      phase = 'PAUSED_RACE';
      cockpit.releaseAllHolds(car, nitro);
      sound.suspendEngine();
      const rank = activeRivals ? activeRivals.getPlayerRank(car.totalProgress) : 1;
      pauseRaceStatusEl.textContent = `${currentTrackSpec.name} | Pos: ${formatOrdinal(rank)} | Lap ${Math.max(1, car.lap || 1)}/${currentTrackSpec.laps}`;
      btnRestartRace.classList.remove('hidden');
      btnQuitHub.classList.remove('hidden');
      btnResume.textContent = 'RESUME RACE';
    } else if (phase === 'HUB') {
      phase = 'PAUSED_HUB';
      pauseRaceStatusEl.textContent = `Garage Bankroll: $${save.cash} | Wins: ${save.totalWins}`;
      btnRestartRace.classList.add('hidden');
      btnQuitHub.classList.add('hidden');
      btnResume.textContent = 'CLOSE SETTINGS';
    } else {
      return;
    }

    showOverlayState('SETTINGS');
    btnResume.focus();
  }

  function closeSettingsModal() {
    if (phase === 'PAUSED_RACE') {
      phase = countdownTimer > 0 ? 'COUNTDOWN' : 'RACING';
      showOverlayState('NONE');
    } else if (phase === 'PAUSED_HUB') {
      phase = 'HUB';
      showOverlayState('HUB');
    }
  }

  btnCornerSettings.addEventListener('click', () => {
    sound.init();
    if (phase === 'PAUSED_RACE' || phase === 'PAUSED_HUB') closeSettingsModal();
    else openSettingsModal();
  });

  btnResume.addEventListener('click', closeSettingsModal);
  btnLaunchRace.addEventListener('click', () => {
    sound.init();
    startSelectedRace();
  });
  btnRestartRace.addEventListener('click', startSelectedRace);
  btnRaceAgain.addEventListener('click', startSelectedRace);
  btnQuitHub.addEventListener('click', enterGarageHub);
  btnFinishGarage.addEventListener('click', enterGarageHub);
  btnRetry.addEventListener('click', () => window.location.reload());

  function toggleAudio() {
    sound.init();
    sound.setMuted(!sound.muted);
    btnToggleAudio.setAttribute('aria-pressed', String(sound.muted));
    btnToggleAudio.textContent = sound.muted ? 'AUDIO: OFF' : 'AUDIO: ON';
  }
  btnToggleAudio.addEventListener('click', toggleAudio);

  btnResetSave.addEventListener('click', () => {
    if (!resetConfirmArmed) {
      resetConfirmArmed = true;
      btnResetSave.textContent = 'CONFIRM WIPE SAVE?';
      return;
    }
    save = createDefaultSave();
    persistSave(save);
    resetConfirmArmed = false;
    btnResetSave.textContent = 'SAVE RESET!';
    enterGarageHub();
  });

  // Keyboard: A/Q & D/E for Left/Right Window Look + Esc + M
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'q') lookKeys.left = true;
    else if (k === 'd' || k === 'e') lookKeys.right = true;
    else if (e.key === 'Escape') {
      if (phase === 'PAUSED_RACE' || phase === 'PAUSED_HUB') {
        e.preventDefault();
        closeSettingsModal();
      } else if (phase === 'RACING' || phase === 'COUNTDOWN' || phase === 'HUB') {
        e.preventDefault();
        openSettingsModal();
      }
    } else if (k === 'm') {
      toggleAudio();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'q') lookKeys.left = false;
    else if (k === 'd' || k === 'e') lookKeys.right = false;
  });

  window.addEventListener('blur', () => {
    lookKeys.left = false;
    lookKeys.right = false;
  });

  const upVec = new THREE.Vector3(0, 1, 0);
  let lastTime = performance.now();

  function updateWorld(dt) {
    // 1. Hub Showroom Turntable Camera
    if (phase === 'HUB' || phase === 'PAUSED_HUB') {
      turntableAngle += dt * 0.55;
      showroom.turntable.rotation.y = turntableAngle;
      camera.up.set(0, 1, 0);
      camera.fov = 52;
      camera.updateProjectionMatrix();
      camera.position.set(2.35, 2.05, 5.45);
      camera.lookAt(-1.15, 0.88, 0);
      skyMesh.position.copy(camera.position);
      postPass.postMaterial.uniforms.uFlash.value = 0;
      postPass.postMaterial.uniforms.uHurtFlash.value = 0;
      postPass.postMaterial.uniforms.uNitroWarp.value = 0;
      return;
    }

    if (!activeTrack || !activeRivals) return;

    const smp = activeTrack.sampleTrack(car.s);

    if (phase === 'COUNTDOWN') {
      countdownTimer -= dt;
      const beat = Math.ceil(countdownTimer / 0.8);
      if (beat !== lastCountdownBeat && beat >= 1 && beat <= 3) {
        lastCountdownBeat = beat;
        sound.playCountdown(false);
      }
      car.rpm = 0.28 + Math.sin(performance.now() * 0.015) * 0.06;
      for (const w of loadout.weapons) stepWeaponTimers(w, dt);
      if (countdownTimer <= 0) {
        phase = 'RACING';
        sound.playCountdown(true);
        cockpit.setStatus('GO! SHIFT UP 1-6!', '#6be36b', 1.5);
      }
    } else if (phase === 'RACING') {
      raceTime += dt;
      const phys = stepCarPhysics(
        car,
        nitro,
        carStats,
        smp.curvature,
        activeTrack.totalLength,
        raceTime,
        dt,
        activeTrack.isOpenWorld,
        currentTrackSpec.laps
      );
      stepNitro(nitro, dt);
      for (const w of loadout.weapons) stepWeaponTimers(w, dt);

      if (phys.hitWall) {
        sound.playCrash(1.0);
        impactShake = Math.max(impactShake, 5.8);
        hurtFlash = Math.max(hurtFlash, 0.24);
        cockpit.setStatus('WALL IMPACT!', '#ff5242', 1.2);
      }

      if (phys.playerWrecked) {
        finishRace('WRECKED');
        return;
      }

      if (phys.lapCompleted) {
        if (car.completedLaps >= currentTrackSpec.laps) {
          finishRace('FINISH');
          return;
        }
        sound.playLap(false);
        cockpit.setStatus(
          car.completedLaps === currentTrackSpec.laps - 1
            ? 'FINAL LAP!'
            : `LAP ${car.lap} OF ${currentTrackSpec.laps}`,
          '#6be36b',
          2.2
        );
      }
    }

    const rStep = activeRivals.update(dt, car, carStats, phase === 'RACING');
    rivalThreats.left = rStep.threatLeft;
    rivalThreats.right = rStep.threatRight;

    bumpSoundCooldown = Math.max(0, bumpSoundCooldown - dt);
    if (rStep.playerBumped && bumpSoundCooldown <= 0) {
      bumpSoundCooldown = 0.32;
      sound.playCrash(0.7);
      impactShake = Math.max(impactShake, 4.2);
    }

    if (rStep.ramWreckedRival) {
      loadout.wrecksCount += 1;
      loadout.bountyEarned += currentTrackSpec.wreckBounty;
      sound.playRivalWreck();
      cockpit.setStatus(
        `RAM-WRECKED ${rStep.ramWreckedRival} +$${currentTrackSpec.wreckBounty}!`,
        '#6be36b',
        2.4
      );
      if (activeRivals.getAliveCount() === 0) {
        finishRace('WIPEOUT');
        return;
      }
    }

    if (rStep.enemyShotDamage > 0 && phase === 'RACING') {
      car.armor = Math.max(0, car.armor - rStep.enemyShotDamage);
      sound.playEnemyShot();
      hurtFlash = Math.max(hurtFlash, 0.36);
      impactShake = Math.max(impactShake, 3.6);
      cockpit.addBulletCrack(rStep.enemyShotSide || 'front');
      cockpit.setStatus(
        rStep.enemyShotSide === 'left' ? 'TAKING FIRE LEFT (A)!' : 'TAKING FIRE RIGHT (D)!',
        '#ff5242',
        1.5
      );
      if (car.armor <= 0) {
        finishRace('WRECKED');
        return;
      }
    }

    sound.updateContinuous({
      rpm: car.rpm,
      nitroStacks: nitro.stacks,
      blowerActive: car.blowerActive,
      drifting: car.driftHeld && car.speed > 12,
      onCurb: car.onCurb && Math.abs(car.speed) > 4,
      offRoad: car.offRoad && Math.abs(car.speed) > 4,
      active: phase === 'RACING' || phase === 'COUNTDOWN',
      carId: carStats.spec.id,
    });

    // Camera Transform with 360-safe Side-Window Yaw (-82 deg Left .. +82 deg Right) + Local Z Roll
    const curSmp = activeTrack.sampleTrack(car.s);
    const worldPos = curSmp.pos.clone().addScaledVector(curSmp.right, car.lateral);

    const surfaceBounce =
      (car.offRoad ? 0.075 : car.onCurb ? 0.04 : 0.01) *
      Math.sin(car.bumpPhase * 3.8) *
      Math.min(1, Math.abs(car.speed) / 18);

    camera.position.set(worldPos.x, worldPos.y + 1.28 + surfaceBounce, worldPos.z);
    skyMesh.position.copy(camera.position);

    const cosH = Math.cos(car.headingOffset);
    const sinH = Math.sin(car.headingOffset);
    const fwdX = curSmp.flatTan.x * cosH + curSmp.right.x * sinH;
    const fwdZ = curSmp.flatTan.z * cosH + curSmp.right.z * sinH;
    const carForward = new THREE.Vector3(fwdX, curSmp.tan.y, fwdZ).normalize();
    const carRight = new THREE.Vector3().crossVectors(carForward, upVec).normalize();

    // Rotate horizontal gaze smoothly up to +-82 degrees when looking out Left/Right doors!
    const headYawRad = cockpit.pointer.viewYaw * 1.43 + cockpit.pointer.panX * 0.12;
    const horizLook = carForward
      .clone()
      .multiplyScalar(Math.cos(headYawRad))
      .addScaledVector(carRight, Math.sin(headYawRad));
    const lookDir = horizLook
      .addScaledVector(upVec, -cockpit.pointer.panY * 0.055)
      .normalize();

    camera.up.set(0, 1, 0);
    camera.lookAt(camera.position.clone().addScaledVector(lookDir, 25));

    const targetRoll = -(car.wheelAngle / 2.2) * Math.min(1, Math.abs(car.speed) / 42) * 0.024;
    smoothRoll += (targetRoll - smoothRoll) * Math.min(1, dt * 10);
    camera.rotateZ(smoothRoll);

    const targetFov = 65 + (Math.abs(car.speed) / 68) * 7 + nitro.stacks * 4.8;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
    camera.updateProjectionMatrix();

    screenFlash = Math.max(0, screenFlash - dt * 3.5);
    hurtFlash = Math.max(0, hurtFlash - dt * 3.2);
    impactShake = Math.max(0, impactShake - dt * 16.0);

    postPass.postMaterial.uniforms.uFlash.value = screenFlash;
    postPass.postMaterial.uniforms.uHurtFlash.value = hurtFlash;
    const targetWarp = nitro.stacks / 4;
    postPass.postMaterial.uniforms.uNitroWarp.value +=
      (targetWarp - postPass.postMaterial.uniforms.uNitroWarp.value) * Math.min(1, dt * 6);
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    const lookInput = (lookKeys.right ? 1 : 0) - (lookKeys.left ? 1 : 0);
    cockpit.update(dt, phase === 'RACING' || phase === 'COUNTDOWN' ? lookInput : 0);
    updateWorld(dt);

    renderer.setRenderTarget(postPass.target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postPass.postScene, postPass.postCamera);

    if (phase !== 'HUB' && phase !== 'PAUSED_HUB' && activeRivals) {
      const speedRatio = Math.min(1, Math.abs(car.speed) / 42);
      const shakeAmp =
        (phase === 'RACING' || phase === 'COUNTDOWN' ? 0.22 : 0) +
        (car.onCurb ? 1.6 * speedRatio : 0) +
        (car.offRoad ? 2.4 * speedRatio : 0) +
        nitro.stacks * nitro.stacks * 0.48 +
        impactShake;
      const shakeX = (Math.random() - 0.5) * 2 * shakeAmp;
      const shakeY = (Math.random() - 0.5) * 2 * shakeAmp;

      let countdownText = '';
      if (phase === 'COUNTDOWN') {
        const b = Math.ceil(countdownTimer / 0.8);
        countdownText = b > 0 ? String(Math.min(3, b)) : 'GO!';
      }

      cockpit.render({
        car,
        nitro,
        loadout,
        carStats,
        rank: activeRivals.getPlayerRank(car.totalProgress),
        aliveRivals: activeRivals.getAliveCount(),
        totalRacers: activeRivals.rivals.length + 1,
        totalLaps: currentTrackSpec.laps,
        raceTime,
        countdownText,
        threatLeft: rivalThreats.left,
        threatRight: rivalThreats.right,
        shakeX,
        shakeY,
      });
    }
  }

  enterGarageHub();
  requestAnimationFrame(animate);
} catch (err) {
  phase = 'ERROR';
  errorMsgEl.textContent =
    err instanceof Error ? err.message : 'Unable to start WebGL renderer.';
  showOverlayState('ERROR');
}
