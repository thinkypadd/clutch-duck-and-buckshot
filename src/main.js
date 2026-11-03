import * as THREE from 'three';
import {
  CARS,
  CAR_SLOT_KEYS,
  CAR_UPGRADES,
  GUNS,
  GUN_SLOT_KEYS,
  GUN_UPGRADES,
  TRACKS,
  LEAGUES,
  NITRO_STAGE_NAMES,
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
  CANYON_FOG,
  BADLANDS_FOG,
  SHOWROOM_FOG,
  setGlobalPsxFog,
  createPsxPostPass,
  buildPsxTextures,
} from './psx.js';
import { buildCircuit } from './track.js';
import { createHubRooms } from './rooms.js';
import { createRivalManager } from './rivals.js';
import { drawGunWorkbenchPreview } from './weaponArt.js';
import { createCabin2D } from './cabin2d.js';
import {
  COCKPIT_W,
  COCKPIT_H,
  drawHGatePreviewCanvas,
  createCockpitController,
} from './cockpit.js';

const viewportEl = document.getElementById('viewport');
const glCanvas = document.getElementById('gl-canvas');
const cockpitCanvas = document.getElementById('cockpit-canvas');
const gunPreviewCanvas = document.getElementById('gun-preview-canvas');
const hgatePreviewCanvas = document.getElementById('hgate-preview-canvas');

const screenLoading = document.getElementById('screen-loading');
const screenError = document.getElementById('screen-error');
const errorMsgEl = document.getElementById('error-message');
const screenHub = document.getElementById('screen-hub');
const screenSettings = document.getElementById('screen-settings');
const screenDev = document.getElementById('screen-dev');
const screenFinish = document.getElementById('screen-finish');

const btnCornerSettings = document.getElementById('btn-corner-settings');
const btnHubBack = document.getElementById('btn-hub-back');
const hubRoomTitleEl = document.getElementById('hub-room-title');
const hubCashEl = document.getElementById('hub-cash');
const hubLoadoutEl = document.getElementById('hub-loadout-summary');

const roomMenuEl = document.getElementById('room-menu');
const roomBriefingEl = document.getElementById('room-briefing');
const roomShowroomEl = document.getElementById('room-showroom');
const roomMechanicEl = document.getElementById('room-mechanic');
const roomGunshopEl = document.getElementById('room-gunshop');

const btnGotoBriefing = document.getElementById('btn-goto-briefing');
const btnGotoShowroom = document.getElementById('btn-goto-showroom');
const btnGotoMechanic = document.getElementById('btn-goto-mechanic');
const btnGotoGunshop = document.getElementById('btn-goto-gunshop');
const btnLaunchRace = document.getElementById('btn-launch-race');

const trackListEl = document.getElementById('track-list');
const leagueListEl = document.getElementById('league-list');
const showroomListEl = document.getElementById('showroom-car-list');
const showroomDetailEl = document.getElementById('showroom-detail');

const mechanicSlotStripEl = document.getElementById('mechanic-slot-strip');
const mechanicTierListEl = document.getElementById('mechanic-tier-list');
const mechanicPreviewInfoEl = document.getElementById('mechanic-preview-info');
const mechanicActionWrapEl = document.getElementById('mechanic-action-wrap');
const btnPanelHood = document.getElementById('btn-panel-hood');
const btnPanelDoor = document.getElementById('btn-panel-door');
const btnPanelTrunk = document.getElementById('btn-panel-trunk');
const btnPanelOverview = document.getElementById('btn-panel-overview');

const gunshopListEl = document.getElementById('gunshop-list');
const gunshopDetailEl = document.getElementById('gunshop-detail');
const gunshopUpgradesWrapEl = document.getElementById('gunshop-upgrades-wrap');
const gunshopSlotStripEl = document.getElementById('gunshop-slot-strip');
const gunshopTierListEl = document.getElementById('gunshop-tier-list');
const gunshopModActionEl = document.getElementById('gunshop-mod-action');

const settingsHeadingEl = document.getElementById('settings-heading');
const btnToggleAudio = document.getElementById('btn-toggle-audio');
const btnResetSave = document.getElementById('btn-reset-save');
const btnResume = document.getElementById('btn-resume');
const btnRestartRace = document.getElementById('btn-restart-race');
const btnQuitHub = document.getElementById('btn-quit-hub');
const btnFinishGarage = document.getElementById('btn-finish-garage');
const btnRaceAgain = document.getElementById('btn-race-again');
const btnRetry = document.getElementById('btn-retry');

const devCashReadoutEl = document.getElementById('dev-cash-readout');
const btnDev1k = document.getElementById('btn-dev-1k');
const btnDev10k = document.getElementById('btn-dev-10k');
const btnDevZero = document.getElementById('btn-dev-zero');
const btnDevUnlock = document.getElementById('btn-dev-unlock');
const btnDevGod = document.getElementById('btn-dev-god');
const btnDevWreck = document.getElementById('btn-dev-wreck');
const btnDevClose = document.getElementById('btn-dev-close');

const pauseRaceStatusEl = document.getElementById('pause-race-status');
const finishHeadingEl = document.getElementById('finish-heading');
const finishRankEl = document.getElementById('finish-rank');
const finishReasonEl = document.getElementById('finish-reason');
const finishTimeEl = document.getElementById('finish-time');
const finishWrecksEl = document.getElementById('finish-wrecks');
const finishPayoutEl = document.getElementById('finish-payout');
const finishBankEl = document.getElementById('finish-bank');

let save = loadSave();

// Hub room & preview-before-buy state
let hubRoom = 'menu'; // 'menu' | 'briefing' | 'showroom' | 'mechanic' | 'gunshop'
let previewCarId = save.selectedCar;
let sellConfirmArmed = false;

let mechanicSlot = 'block';
let mechanicPreviewTier = 0;

let previewGunId = save.primaryGun;
let gunSlot = 'barrel';
let gunPreviewTier = 0;
let gunBenchPan = { x: 0, y: 0 };

let resetConfirmArmed = false;
let devReturnPhase = 'HUB';
let secretClickCount = 0;
let secretClickResetTimer = null;

// Phases: 'LOADING' | 'HUB' | 'COUNTDOWN' | 'RACING' | 'PAUSED_HUB' | 'PAUSED_RACE' | 'DEV_MENU' | 'FINISHED' | 'ERROR'
let phase = 'LOADING';
let countdownTimer = 0;
let lastCountdownBeat = 4;
let raceTime = 0;
let screenFlash = 0;
let hurtFlash = 0;
let impactShake = 0;
let smoothRoll = 0;
let bumpSoundCooldown = 0;

// Side-window controls: Hold A/D for quick peek + Tap Q/E to toggle-lock (W/S resets forward)
const holdLook = { left: false, right: false };
let lockedView = 0;

const sound = new SoundEngine();
let carStats = getComputedCarStats(save);
let car = createCarState(carStats);
let nitro = createNitroState(carStats);
let loadout = createLoadoutState(save);
let currentTrackSpec = TRACKS[save.selectedTrack] || TRACKS.canyon;
let currentLeagueSpec = LEAGUES[save.selectedLeague] || LEAGUES.scrapyard;
let rivalSignals = { left: false, right: false, tailgater: false };

function isRaceBackdropActive() {
  return (
    phase === 'COUNTDOWN' ||
    phase === 'RACING' ||
    phase === 'PAUSED_RACE' ||
    phase === 'FINISHED' ||
    (phase === 'DEV_MENU' && devReturnPhase === 'PAUSED_RACE')
  );
}

function showOverlayState(mode) {
  screenLoading.classList.add('hidden');
  screenError.classList.toggle('hidden', mode !== 'ERROR');
  screenHub.classList.toggle('hidden', mode !== 'HUB');
  screenSettings.classList.toggle('hidden', mode !== 'SETTINGS');
  screenDev.classList.toggle('hidden', mode !== 'DEV');
  screenFinish.classList.toggle('hidden', mode !== 'FINISH');
  viewportEl.classList.toggle('menu-mode', !isRaceBackdropActive());
}

try {
  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.autoClear = false;
  renderer.setClearColor(SHOWROOM_FOG, 1);

  function syncRendererSize() {
    const rect = viewportEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(COCKPIT_W, Math.min(2560, Math.round((rect.width || 1280) * dpr)));
    const h = Math.max(COCKPIT_H, Math.min(1440, Math.round((rect.height || 720) * dpr)));
    if (glCanvas.width !== w || glCanvas.height !== h) {
      renderer.setSize(w, h, false);
    }
  }
  syncRendererSize();
  window.addEventListener('resize', syncRendererSize);

  const scene = new THREE.Scene();

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
  const rearCamera = new THREE.PerspectiveCamera(62, 128 / 44, 0.4, 340);
  const rearTarget = new THREE.WebGLRenderTarget(128, 44, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });

  const postPass = createPsxPostPass();
  const textures = buildPsxTextures();
  const rooms = createHubRooms(scene, camera, textures);
  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = 128;
  mirrorCanvas.height = 44;
  const mirrorCtx = mirrorCanvas.getContext('2d');
  const mirrorImage = mirrorCtx.createImageData(128, 44);
  const mirrorPixels = new Uint8Array(128 * 44 * 4);
  const cabin = createCabin2D(mirrorCanvas);

  let activeTrack = null;
  let activeRivals = null;

  function creditWreckBounties(wreckedNames) {
    if (!wreckedNames || wreckedNames.length === 0) return;
    const perWreck = currentLeagueSpec.wreckBounty;
    loadout.wrecksCount += wreckedNames.length;
    loadout.bountyEarned += perWreck * wreckedNames.length;
    sound.playRivalWreck();
    cockpit.setStatus(
      `WRECKED ${wreckedNames[0]} +$${perWreck * wreckedNames.length}!`,
      '#6be36b',
      2.3
    );
    if (activeRivals && activeRivals.getAliveCount() === 0) {
      finishRace('WIPEOUT');
    }
  }

  const cockpit = createCockpitController(cockpitCanvas, cabin, sound, {
    isInteractive: () => phase === 'COUNTDOWN' || phase === 'RACING',
    getState: () => ({ car, nitro, loadout, carStats }),
    onWeaponFired: (ndcX, ndcY, gunStats) => {
      const heavy =
        gunStats.spec.id === 'thumper' ||
        gunStats.spec.id === 'sawed_off' ||
        gunStats.spec.id === 'pump_shotgun';
      screenFlash = Math.max(screenFlash, heavy ? 0.46 : 0.22);
      impactShake = Math.max(impactShake, gunStats.spec.id === 'smg' ? 2.2 : heavy ? 5.2 : 3.6);
      if (phase !== 'RACING' || !activeRivals) return;

      const res = activeRivals.fireWeaponAt(camera, ndcX, ndcY, gunStats);
      if (res.wreckedNames.length > 0) {
        creditWreckBounties(res.wreckedNames);
      } else if (res.hit) {
        sound.playCrash(0.6);
        cockpit.setStatus(
          gunStats.incendiary ? `IGNITED ${res.rivalName}!` : `HIT ${res.rivalName}!`,
          '#ffb020',
          1.2
        );
      }
    },
    onTrunkDeployed: (hazardType) => {
      sound.playTrunkDeploy(hazardType);
      if (activeRivals) {
        activeRivals.spawnPlayerHazard(car.s, car.lateral, hazardType);
      }
      const names = {
        oil: 'OIL SLICK DEPLOYED BEHIND!',
        spikes: 'CALTROP SPIKES DROPPED!',
        mine: 'PROXIMITY MINE ARMED!',
        napalm: 'REAR NAPALM WALL IGNITED!',
      };
      cockpit.setStatus(names[hazardType] || 'DEPLOYED!', '#6be36b', 1.8);
    },
    onRotaryBackfire: () => {
      sound.playTrunkDeploy('napalm');
      screenFlash = Math.max(screenFlash, 0.35);
      if (!activeRivals) return;
      const res = activeRivals.blastRearFireball(car);
      if (res.wreckedNames.length > 0) {
        creditWreckBounties(res.wreckedNames);
      } else if (res.hitName) {
        cockpit.setStatus(`SCORCHED ${res.hitName}!`, '#ff7b1c', 1.6);
      } else {
        cockpit.setStatus('TWIN-PIPE FIREBALL!', '#ff7b1c', 1.2);
      }
    },
  });

  // =========================================================================
  // 5-ROOM HUB & PREVIEW-BEFORE-BUY SHOPS
  // =========================================================================
  const ROOM_TITLES = {
    menu: 'GARAGE FORECOURT',
    briefing: 'RACE BRIEFING ROOM',
    showroom: 'DEALERSHIP SHOWROOM',
    mechanic: 'MECHANIC WORKSHOP BAY',
    gunshop: 'GUNSMITH ARMORY & BENCH',
  };

  function applyHubAtmosphere(roomName) {
    if (roomName === 'menu') {
      renderer.setClearColor(CANYON_FOG, 1);
      setGlobalPsxFog(CANYON_FOG, 18.0, 58.0);
      skyMat.uniforms.uHorizon.value.setHex(0x4a2926);
      skyMat.uniforms.uMid.value.setHex(0x211926);
      skyMat.uniforms.uZenith.value.setHex(0x090b14);
    } else {
      renderer.setClearColor(SHOWROOM_FOG, 1);
      setGlobalPsxFog(SHOWROOM_FOG, 16.0, 54.0);
      skyMat.uniforms.uHorizon.value.setHex(0x1b1f2b);
      skyMat.uniforms.uMid.value.setHex(0x11141c);
      skyMat.uniforms.uZenith.value.setHex(0x090a0e);
    }
  }

  function updateTopHubBar() {
    carStats = getComputedCarStats(save);
    hubCashEl.textContent = `$${save.cash}`;
    hubRoomTitleEl.textContent = ROOM_TITLES[hubRoom] || 'GARAGE';
    btnHubBack.classList.toggle('hidden', hubRoom === 'menu');

    const gunSummary = carStats.dualHolster
      ? `${GUNS[save.primaryGun].name} + ${GUNS[save.secondaryGun]?.name || 'NONE'}`
      : GUNS[save.primaryGun].name;
    hubLoadoutEl.textContent = `${CARS[save.selectedCar].name} (${carStats.maxGears}-SPD) | ${gunSummary}`;
  }

  function enterHubRoom(roomName) {
    hubRoom = roomName;
    sellConfirmArmed = false;

    roomMenuEl.classList.toggle('hidden', roomName !== 'menu');
    roomBriefingEl.classList.toggle('hidden', roomName !== 'briefing');
    roomShowroomEl.classList.toggle('hidden', roomName !== 'showroom');
    roomMechanicEl.classList.toggle('hidden', roomName !== 'mechanic');
    roomGunshopEl.classList.toggle('hidden', roomName !== 'gunshop');

    applyHubAtmosphere(roomName);

    if (roomName === 'showroom') {
      previewCarId = save.selectedCar;
    } else if (roomName === 'mechanic') {
      mechanicSlot = 'block';
      mechanicPreviewTier = save.carParts[save.selectedCar][mechanicSlot] || 0;
    } else if (roomName === 'gunshop') {
      previewGunId = save.primaryGun;
      gunSlot = 'barrel';
      gunPreviewTier = save.gunParts[previewGunId][gunSlot] || 0;
      gunBenchPan = { x: 0, y: 0 };
    }

    rooms.setRoom(roomName, save, previewCarId);
    if (roomName === 'mechanic') {
      rooms.focusMechanicSlot(mechanicSlot);
      sound.playPanelHinge(true);
    }

    refreshActiveRoomUI();
  }

  function refreshActiveRoomUI() {
    updateTopHubBar();
    if (hubRoom === 'briefing') renderBriefingRoom();
    else if (hubRoom === 'showroom') renderShowroomRoom();
    else if (hubRoom === 'mechanic') renderMechanicRoom();
    else if (hubRoom === 'gunshop') renderGunShopRoom();
  }

  function renderBriefingRoom() {
    trackListEl.innerHTML = '';
    for (const trk of Object.values(TRACKS)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `track-card${save.selectedTrack === trk.id ? ' selected' : ''}`;
      btn.innerHTML = `
        <div class="track-card-title">
          <span>${trk.name}</span>
          <span>${trk.isOpenWorld ? '+15% OPEN BONUS' : 'CIRCUIT'}</span>
        </div>
        <div class="track-card-sub">${trk.subtitle}</div>
        <div class="track-card-desc">${trk.desc}</div>
      `;
      btn.addEventListener('click', () => {
        sound.init();
        save.selectedTrack = trk.id;
        persistSave(save);
        rooms.rebuildBriefingTable(
          save.selectedTrack,
          save.selectedCar,
          save.carParts[save.selectedCar]
        );
        renderBriefingRoom();
      });
      trackListEl.appendChild(btn);
    }

    leagueListEl.innerHTML = '';
    const openBonus = save.selectedTrack === 'badlands' ? 1.15 : 1.0;
    for (const lg of Object.values(LEAGUES)) {
      const prize = Math.round(lg.firstPrize * openBonus);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `track-card${save.selectedLeague === lg.id ? ' selected' : ''}`;
      btn.innerHTML = `
        <div class="track-card-title">
          <span>${lg.name} (${lg.badge})</span>
          <span>1ST: $${prize}</span>
        </div>
        <div class="track-card-sub">+$${lg.wreckBounty} PER WRECK BOUNTY</div>
        <div class="track-card-desc">${lg.desc}</div>
      `;
      btn.addEventListener('click', () => {
        sound.init();
        save.selectedLeague = lg.id;
        persistSave(save);
        renderBriefingRoom();
      });
      leagueListEl.appendChild(btn);
    }
  }

  function renderShowroomRoom() {
    showroomListEl.innerHTML = '';
    for (const c of Object.values(CARS)) {
      const owned = Boolean(save.ownedCars[c.id]);
      const equipped = save.selectedCar === c.id;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `select-chip${previewCarId === c.id ? ' active' : ''}`;
      chip.innerHTML = `
        <strong>${c.name}</strong>
        <span class="chip-price">${equipped ? 'DRIVING' : owned ? 'OWNED' : `$${c.price}`}</span>
      `;
      chip.addEventListener('click', () => {
        sound.init();
        previewCarId = c.id;
        sellConfirmArmed = false;
        rooms.focusShowroomCar(c.id);
        renderShowroomRoom();
      });
      showroomListEl.appendChild(chip);
    }

    const pStats = getComputedCarStats(save, previewCarId);
    const spec = pStats.spec;
    const owned = Boolean(save.ownedCars[previewCarId]);
    const equipped = save.selectedCar === previewCarId;
    const minGear = spec.gearTiers[0];
    const maxGear = spec.gearTiers[spec.gearTiers.length - 1];
    const nitroText =
      pStats.maxNitroStacks === 0
        ? 'NONE'
        : NITRO_STAGE_NAMES[pStats.maxNitroStacks - 1];

    showroomDetailEl.innerHTML = `
      <div class="spec-header">
        <span class="spec-name">${spec.name}</span>
        <span>${owned ? 'IN GARAGE' : `$${spec.price}`}</span>
      </div>
      <p class="spec-tagline">${spec.tagline}</p>
      <div class="stat-bars">
        <div class="stat-cell"><span>GEARS</span><strong>${pStats.maxGears} (${minGear}-${maxGear})</strong></div>
        <div class="stat-cell"><span>TOP MPH</span><strong>${pStats.topMph}</strong></div>
        <div class="stat-cell"><span>ARMOR</span><strong>${pStats.maxArmor} HP</strong></div>
        <div class="stat-cell"><span>NITRO</span><strong>${nitroText}</strong></div>
      </div>
      <div class="gimmick-banner">
        <strong>${spec.gimmickName}:</strong> ${spec.gimmickDesc}
      </div>
    `;

    const actionRow = document.createElement('div');
    actionRow.className = 'panel-actions';

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'cta-btn';
    if (equipped) {
      mainBtn.textContent = 'CURRENTLY DRIVING';
      mainBtn.disabled = true;
    } else if (owned) {
      mainBtn.textContent = `DRIVE ${spec.name}`;
      mainBtn.addEventListener('click', () => {
        purchaseCar(save, previewCarId);
        sound.playShopBuy();
        persistSave(save);
        rooms.rebuildShowroomBays(save);
        refreshActiveRoomUI();
      });
    } else {
      const canAfford = save.cash >= spec.price;
      mainBtn.textContent = canAfford
        ? `BUY & DRIVE ($${spec.price})`
        : `NEED $${spec.price - save.cash} MORE`;
      mainBtn.disabled = !canAfford;
      mainBtn.addEventListener('click', () => {
        if (purchaseCar(save, previewCarId).ok) {
          sound.playShopBuy();
          persistSave(save);
          rooms.rebuildShowroomBays(save);
          refreshActiveRoomUI();
        }
      });
    }
    actionRow.appendChild(mainBtn);

    const ownedCount = Object.keys(save.ownedCars).filter((k) => save.ownedCars[k]).length;
    if (owned && ownedCount >= 2) {
      const refund = getCarTradeInValue(save, previewCarId);
      const sellBtn = document.createElement('button');
      sellBtn.type = 'button';
      sellBtn.className = 'ctrl-btn danger-outline';
      sellBtn.textContent = sellConfirmArmed
        ? `CONFIRM SELL (+$${refund})?`
        : `SELL CAR (+$${refund})`;
      sellBtn.addEventListener('click', () => {
        sound.init();
        if (!sellConfirmArmed) {
          sellConfirmArmed = true;
          renderShowroomRoom();
          return;
        }
        const res = sellCar(save, previewCarId);
        if (res.ok) {
          sellConfirmArmed = false;
          sound.playShopBuy();
          persistSave(save);
          previewCarId = save.selectedCar;
          rooms.rebuildShowroomBays(save);
          rooms.focusShowroomCar(previewCarId);
          refreshActiveRoomUI();
        }
      });
      actionRow.appendChild(sellBtn);
    }

    showroomDetailEl.appendChild(actionRow);
  }

  function syncMechanicPanelButtons() {
    btnPanelHood.classList.toggle('open', rooms.panelState.hood);
    btnPanelDoor.classList.toggle('open', rooms.panelState.door);
    btnPanelTrunk.classList.toggle('open', rooms.panelState.trunk);
  }

  function renderMechanicRoom() {
    const curCarId = save.selectedCar;
    const eqParts = save.carParts[curCarId];
    const eqTier = eqParts[mechanicSlot] || 0;

    // 1. Top 9-subsystem slot pills
    mechanicSlotStripEl.innerHTML = '';
    for (const sKey of CAR_SLOT_KEYS) {
      const track = CAR_UPGRADES[sKey];
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `slot-pill${mechanicSlot === sKey ? ' active' : ''}`;
      pill.textContent = track.shortLabel;
      pill.addEventListener('click', () => {
        sound.init();
        const prevPanel = CAR_UPGRADES[mechanicSlot]?.panel;
        const nextPanel = track.panel;
        mechanicSlot = sKey;
        mechanicPreviewTier = save.carParts[curCarId][sKey] || 0;
        if (prevPanel !== nextPanel) {
          sound.playPanelHinge(nextPanel !== 'none');
        }
        rooms.rebuildMechanicCar(curCarId, save.carParts[curCarId], true);
        rooms.focusMechanicSlot(sKey);
        renderMechanicRoom();
      });
      mechanicSlotStripEl.appendChild(pill);
    }

    syncMechanicPanelButtons();

    // 2. Preview-before-buy Tier Pills (clicking previews 3D part on lift WITHOUT buying!)
    const slotSpec = CAR_UPGRADES[mechanicSlot];
    mechanicTierListEl.innerHTML = '';
    slotSpec.tiers.forEach((tier, idx) => {
      const isEq = eqTier === idx;
      const isPrev = mechanicPreviewTier === idx;
      const owned = isCarUpgradeOwned(save, curCarId, mechanicSlot, idx);

      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = `tier-pill${isPrev ? ' previewing' : ''}${isEq ? ' equipped' : ''}`;
      const badge = isEq ? 'INSTALLED' : owned ? 'OWNED (FREE)' : `$${tier.price}`;
      tBtn.innerHTML = `
        <strong>T${idx}: ${tier.name}</strong>
        <span class="tier-pill-badge">${badge}</span>
      `;
      tBtn.addEventListener('click', () => {
        sound.init();
        mechanicPreviewTier = idx;
        rooms.rebuildMechanicCar(
          curCarId,
          { ...save.carParts[curCarId], [mechanicSlot]: idx },
          true
        );
        renderMechanicRoom();
      });
      mechanicTierListEl.appendChild(tBtn);
    });

    // 3. Stat Delta & Live H-Gate Preview Inset
    const baseStats = getComputedCarStats(save, curCarId);
    const prevStats = getComputedCarStats(save, curCarId, {
      [mechanicSlot]: mechanicPreviewTier,
    });
    const prevTierObj = slotSpec.tiers[mechanicPreviewTier];

    const deltas = [];
    if (prevStats.topMph !== baseStats.topMph) {
      deltas.push(`TOP SPEED: ${baseStats.topMph} -> ${prevStats.topMph} MPH`);
    }
    if (prevStats.maxGears !== baseStats.maxGears) {
      deltas.push(`GEARBOX: ${baseStats.maxGears}-SPD -> ${prevStats.maxGears}-SPD`);
    }
    if (prevStats.maxArmor !== baseStats.maxArmor) {
      deltas.push(`ARMOR: ${baseStats.maxArmor} -> ${prevStats.maxArmor} HP`);
    }
    if (prevStats.maxNitroStacks !== baseStats.maxNitroStacks) {
      const nLbl =
        prevStats.maxNitroStacks === 0
          ? 'NO NITRO'
          : `STAGE: ${NITRO_STAGE_NAMES[prevStats.maxNitroStacks - 1]}`;
      deltas.push(nLbl);
    }
    if (prevStats.trunkType !== baseStats.trunkType) {
      deltas.push(`TRUNK: ${prevStats.trunkType.toUpperCase()}`);
    }

    mechanicPreviewInfoEl.innerHTML = `
      <strong>${slotSpec.label}: ${prevTierObj.name}</strong>
      <div>${prevTierObj.desc}</div>
      <div class="delta-line">${
        deltas.length > 0
          ? deltas.join(' | ')
          : mechanicPreviewTier === eqTier
          ? 'CURRENTLY INSTALLED ON VEHICLE'
          : 'PREVIEWING LIVE ON LIFT'
      }</div>
    `;

    if (mechanicSlot === 'trans') {
      hgatePreviewCanvas.classList.remove('hidden');
      drawHGatePreviewCanvas(hgatePreviewCanvas, prevStats.maxGears, mechanicPreviewTier);
    } else {
      hgatePreviewCanvas.classList.add('hidden');
    }

    // 4. Explicit BUY or FREE EQUIP Commit Button
    mechanicActionWrapEl.innerHTML = '';
    const commitBtn = document.createElement('button');
    commitBtn.type = 'button';
    commitBtn.className = 'cta-btn full-width';

    const alreadyOwned = isCarUpgradeOwned(save, curCarId, mechanicSlot, mechanicPreviewTier);
    if (mechanicPreviewTier === eqTier) {
      commitBtn.textContent = 'INSTALLED';
      commitBtn.disabled = true;
    } else if (alreadyOwned) {
      commitBtn.textContent = 'EQUIP OWNED (FREE)';
      commitBtn.addEventListener('click', () => {
        purchaseCarUpgrade(save, curCarId, mechanicSlot, mechanicPreviewTier);
        sound.playShopBuy();
        persistSave(save);
        rooms.rebuildMechanicCar(curCarId, save.carParts[curCarId], true);
        refreshActiveRoomUI();
      });
    } else {
      const canAfford = save.cash >= prevTierObj.price;
      commitBtn.textContent = canAfford
        ? `BUY & INSTALL ($${prevTierObj.price})`
        : `NEED $${prevTierObj.price - save.cash} MORE`;
      commitBtn.disabled = !canAfford;
      commitBtn.addEventListener('click', () => {
        if (purchaseCarUpgrade(save, curCarId, mechanicSlot, mechanicPreviewTier).ok) {
          sound.playShopBuy();
          persistSave(save);
          rooms.rebuildMechanicCar(curCarId, save.carParts[curCarId], true);
          refreshActiveRoomUI();
        }
      });
    }
    mechanicActionWrapEl.appendChild(commitBtn);
  }

  function redrawGunWorkbench() {
    const owned = Boolean(save.ownedGuns[previewGunId]);
    const gStats = owned
      ? getComputedGunStats(save, previewGunId, { [gunSlot]: gunPreviewTier })
      : getComputedGunStats(save, previewGunId);
    const focusRegion = owned ? GUN_UPGRADES[gunSlot].zoomFocus : 'all';
    drawGunWorkbenchPreview(
      gunPreviewCanvas,
      gStats,
      focusRegion,
      gunBenchPan.x,
      gunBenchPan.y
    );
  }

  function renderGunShopRoom() {
    const dual = carStats.dualHolster;
    rooms.rebuildGunShopWall(save, previewGunId, dual);

    gunshopListEl.innerHTML = '';
    for (const g of Object.values(GUNS)) {
      const owned = Boolean(save.ownedGuns[g.id]);
      const isPrim = save.primaryGun === g.id;
      const isSec = dual && save.secondaryGun === g.id;
      const status = isPrim ? 'PRIMARY' : isSec ? '2ND RIG' : owned ? 'OWNED' : `$${g.price}`;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `select-chip${previewGunId === g.id ? ' active' : ''}`;
      chip.innerHTML = `<strong>${g.name}</strong><span class="chip-price">${status}</span>`;
      chip.addEventListener('click', () => {
        sound.init();
        previewGunId = g.id;
        gunPreviewTier = save.gunParts[g.id][gunSlot] || 0;
        gunBenchPan = { x: 0, y: 0 };
        rooms.focusGunPlaque(g.id);
        renderGunShopRoom();
      });
      gunshopListEl.appendChild(chip);
    }

    const owned = Boolean(save.ownedGuns[previewGunId]);
    const isPrim = save.primaryGun === previewGunId;
    const gStats = owned
      ? getComputedGunStats(save, previewGunId, { [gunSlot]: gunPreviewTier })
      : getComputedGunStats(save, previewGunId);
    const spec = gStats.spec;

    redrawGunWorkbench();

    gunshopDetailEl.innerHTML = `
      <div class="spec-header">
        <span class="spec-name">${spec.name}</span>
        <span>DMG ${gStats.damageClose}/${gStats.damageMid} | CAP ${gStats.capacity} | ${gStats.maxRange}M</span>
      </div>
      <p class="spec-tagline">${spec.tagline} (${spec.reloadHint})</p>
    `;

    const wepActions = document.createElement('div');
    wepActions.className = 'panel-actions';
    const primBtn = document.createElement('button');
    primBtn.type = 'button';
    primBtn.className = 'cta-btn compact-btn';
    if (isPrim) {
      primBtn.textContent = 'EQUIPPED PRIMARY';
      primBtn.disabled = true;
    } else if (owned) {
      primBtn.textContent = 'EQUIP PRIMARY';
      primBtn.addEventListener('click', () => {
        purchaseGun(save, previewGunId, 'primary');
        sound.playShopBuy();
        persistSave(save);
        refreshActiveRoomUI();
      });
    } else {
      const canBuy = save.cash >= spec.price;
      primBtn.textContent = canBuy
        ? `BUY & EQUIP ($${spec.price})`
        : `NEED $${spec.price - save.cash} MORE`;
      primBtn.disabled = !canBuy;
      primBtn.addEventListener('click', () => {
        if (purchaseGun(save, previewGunId, 'primary').ok) {
          sound.playShopBuy();
          persistSave(save);
          gunPreviewTier = save.gunParts[previewGunId][gunSlot] || 0;
          refreshActiveRoomUI();
        }
      });
    }
    wepActions.appendChild(primBtn);

    if (dual && owned && !isPrim) {
      const secBtn = document.createElement('button');
      secBtn.type = 'button';
      secBtn.className = 'ctrl-btn compact-btn';
      const isSec = save.secondaryGun === previewGunId;
      secBtn.textContent = isSec ? 'IN 2ND HOLSTER' : 'SET 2ND HOLSTER';
      secBtn.disabled = isSec;
      secBtn.addEventListener('click', () => {
        purchaseGun(save, previewGunId, 'secondary');
        sound.playShopBuy();
        persistSave(save);
        refreshActiveRoomUI();
      });
      wepActions.appendChild(secBtn);
    }
    gunshopDetailEl.appendChild(wepActions);

    // 5-Slot Gunsmith Workbench Upgrades (Preview-Before-Buy + Subsystem Zoom!)
    gunshopUpgradesWrapEl.classList.toggle('hidden', !owned);
    if (!owned) return;

    const eqTier = save.gunParts[previewGunId][gunSlot] || 0;
    gunshopSlotStripEl.innerHTML = '';
    for (const gsKey of GUN_SLOT_KEYS) {
      const gTrack = GUN_UPGRADES[gsKey];
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `slot-pill${gunSlot === gsKey ? ' active' : ''}`;
      pill.textContent = gTrack.shortLabel;
      pill.addEventListener('click', () => {
        sound.init();
        gunSlot = gsKey;
        gunPreviewTier = save.gunParts[previewGunId][gsKey] || 0;
        gunBenchPan = { x: 0, y: 0 };
        renderGunShopRoom();
      });
      gunshopSlotStripEl.appendChild(pill);
    }

    const gSlotSpec = GUN_UPGRADES[gunSlot];
    gunshopTierListEl.innerHTML = '';
    gSlotSpec.tiers.forEach((tier, idx) => {
      const isEq = eqTier === idx;
      const isPrev = gunPreviewTier === idx;
      const partOwned = isGunUpgradeOwned(save, previewGunId, gunSlot, idx);

      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = `tier-pill${isPrev ? ' previewing' : ''}${isEq ? ' equipped' : ''}`;
      tBtn.innerHTML = `
        <strong>${tier.name}</strong>
        <span class="tier-pill-badge">${isEq ? 'FITTED' : partOwned ? 'OWNED (FREE)' : `$${tier.price}`}</span>
      `;
      tBtn.addEventListener('click', () => {
        sound.init();
        gunPreviewTier = idx;
        renderGunShopRoom();
      });
      gunshopTierListEl.appendChild(tBtn);
    });

    const tierObj = gSlotSpec.tiers[gunPreviewTier];
    const partOwned = isGunUpgradeOwned(save, previewGunId, gunSlot, gunPreviewTier);
    gunshopModActionEl.innerHTML = `<div><strong>${tierObj.name}:</strong> ${tierObj.desc}</div>`;

    const fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.className = 'cta-btn compact-btn';
    if (gunPreviewTier === eqTier) {
      fitBtn.textContent = 'FITTED';
      fitBtn.disabled = true;
    } else if (partOwned) {
      fitBtn.textContent = 'EQUIP OWNED (FREE)';
      fitBtn.addEventListener('click', () => {
        purchaseGunUpgrade(save, previewGunId, gunSlot, gunPreviewTier);
        sound.playShopBuy();
        persistSave(save);
        refreshActiveRoomUI();
      });
    } else {
      const canAfford = save.cash >= tierObj.price;
      fitBtn.textContent = canAfford
        ? `BUY & FIT ($${tierObj.price})`
        : `NEED $${tierObj.price - save.cash}`;
      fitBtn.disabled = !canAfford;
      fitBtn.addEventListener('click', () => {
        if (purchaseGunUpgrade(save, previewGunId, gunSlot, gunPreviewTier).ok) {
          sound.playShopBuy();
          persistSave(save);
          refreshActiveRoomUI();
        }
      });
    }
    gunshopModActionEl.appendChild(fitBtn);
  }

  // Room Navigation Listeners
  btnGotoBriefing.addEventListener('click', () => {
    sound.init();
    enterHubRoom('briefing');
  });
  btnGotoShowroom.addEventListener('click', () => {
    sound.init();
    enterHubRoom('showroom');
  });
  btnGotoMechanic.addEventListener('click', () => {
    sound.init();
    enterHubRoom('mechanic');
  });
  btnGotoGunshop.addEventListener('click', () => {
    sound.init();
    enterHubRoom('gunshop');
  });
  btnHubBack.addEventListener('click', () => {
    sound.init();
    enterHubRoom('menu');
  });

  // Mechanic Manual Panel Hinge Buttons
  [btnPanelHood, btnPanelDoor, btnPanelTrunk, btnPanelOverview].forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.init();
      const pName = btn.dataset.panel;
      const nowOpen = rooms.toggleMechanicPanel(pName);
      sound.playPanelHinge(nowOpen);
      syncMechanicPanelButtons();
    });
  });

  // 3D Viewport Manual Drag-Orbit, Wheel Zoom & 3D Raycast Click Selection
  const orbitDrag = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: 0 };
  glCanvas.addEventListener('pointerdown', (e) => {
    if (phase !== 'HUB') return;
    sound.init();
    glCanvas.setPointerCapture?.(e.pointerId);
    orbitDrag.active = true;
    orbitDrag.startX = e.clientX;
    orbitDrag.startY = e.clientY;
    orbitDrag.lastX = e.clientX;
    orbitDrag.lastY = e.clientY;
    orbitDrag.moved = 0;
  });

  glCanvas.addEventListener('pointermove', (e) => {
    if (!orbitDrag.active || phase !== 'HUB') return;
    const dx = e.clientX - orbitDrag.lastX;
    const dy = e.clientY - orbitDrag.lastY;
    orbitDrag.lastX = e.clientX;
    orbitDrag.lastY = e.clientY;
    orbitDrag.moved += Math.hypot(dx, dy);
    rooms.orbitByPixels(dx, dy);
  });

  glCanvas.addEventListener('pointerup', (e) => {
    if (!orbitDrag.active) return;
    orbitDrag.active = false;
    if (phase === 'HUB' && orbitDrag.moved < 6) {
      const rect = glCanvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      const picked = rooms.pickRoomObject(ndcX, ndcY);
      if (picked?.type === 'car' && hubRoom === 'showroom') {
        previewCarId = picked.id;
        sellConfirmArmed = false;
        rooms.focusShowroomCar(picked.id);
        renderShowroomRoom();
      } else if (picked?.type === 'gun' && hubRoom === 'gunshop') {
        previewGunId = picked.id;
        gunPreviewTier = save.gunParts[picked.id][gunSlot] || 0;
        gunBenchPan = { x: 0, y: 0 };
        rooms.focusGunPlaque(picked.id);
        renderGunShopRoom();
      }
    }
  });

  glCanvas.addEventListener(
    'wheel',
    (e) => {
      if (phase !== 'HUB') return;
      e.preventDefault();
      rooms.zoomByDelta(e.deltaY);
    },
    { passive: false }
  );

  // Gunsmith 2D Pixel Workbench Drag-to-Pan
  let benchDragging = false;
  let benchLast = { x: 0, y: 0 };
  gunPreviewCanvas.addEventListener('pointerdown', (e) => {
    gunPreviewCanvas.setPointerCapture?.(e.pointerId);
    benchDragging = true;
    benchLast = { x: e.clientX, y: e.clientY };
  });
  gunPreviewCanvas.addEventListener('pointermove', (e) => {
    if (!benchDragging) return;
    gunBenchPan.x = Math.max(-90, Math.min(90, gunBenchPan.x + (e.clientX - benchLast.x) * 0.65));
    gunBenchPan.y = Math.max(-36, Math.min(36, gunBenchPan.y + (e.clientY - benchLast.y) * 0.65));
    benchLast = { x: e.clientX, y: e.clientY };
    redrawGunWorkbench();
  });
  gunPreviewCanvas.addEventListener('pointerup', () => {
    benchDragging = false;
  });

  // =========================================================================
  // SCENE TRANSITIONS: HUB <-> RACE
  // =========================================================================
  function enterGarageHub(targetRoom = 'menu') {
    if (activeTrack) {
      activeTrack.dispose();
      activeTrack = null;
    }
    if (activeRivals) {
      activeRivals.dispose();
      activeRivals = null;
    }

    sound.suspendEngine();
    holdLook.left = false;
    holdLook.right = false;
    lockedView = 0;

    phase = 'HUB';
    showOverlayState('HUB');
    enterHubRoom(targetRoom);
  }

  function startSelectedRace() {
    if (activeTrack) activeTrack.dispose();
    if (activeRivals) activeRivals.dispose();

    rooms.setRoom('none', save, save.selectedCar);
    currentTrackSpec = TRACKS[save.selectedTrack] || TRACKS.canyon;
    currentLeagueSpec = LEAGUES[save.selectedLeague] || LEAGUES.scrapyard;

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
    activeRivals = createRivalManager(
      scene,
      activeTrack,
      currentTrackSpec.rivalCount,
      currentLeagueSpec
    );

    carStats = getComputedCarStats(save);
    car = createCarState(carStats);
    nitro = createNitroState(carStats);
    loadout = createLoadoutState(save);
    cockpit.releaseAllHolds(car, nitro);
    cockpit.resetCabinEffects(1, carStats.maxGears);

    holdLook.left = false;
    holdLook.right = false;
    lockedView = 0;
    raceTime = 0;
    countdownTimer = 2.4;
    lastCountdownBeat = 4;
    screenFlash = 0;
    hurtFlash = 0;
    impactShake = 0;
    smoothRoll = 0;
    rivalSignals = { left: false, right: false, tailgater: false };

    phase = 'COUNTDOWN';
    showOverlayState('NONE');
    cockpit.setStatus(`AUTO-DRIVE: SHIFT 1-${carStats.maxGears}!`, '#ffb020', 2.4);
  }

  function finishRace(mode = 'FINISH') {
    cockpit.releaseAllHolds(car, nitro);
    sound.suspendEngine();

    let rank = activeRivals ? activeRivals.getPlayerRank(car.totalProgress) : 1;
    const openBonus = currentTrackSpec.isOpenWorld ? 1.15 : 1.0;
    const baseFirst = Math.round(currentLeagueSpec.firstPrize * openBonus);
    let placementPrize = 0;
    let wipeoutBonus = 0;

    if (mode === 'WIPEOUT') {
      rank = 1;
      placementPrize = baseFirst;
      wipeoutBonus = Math.round(currentLeagueSpec.wreckBounty * 2);
      finishHeadingEl.textContent = 'TOTAL WIPEOUT VICTORY';
      finishRankEl.textContent = '1ST PLACE (LAST CAR ALIVE)';
      finishReasonEl.textContent = `Every rival permanently wrecked! +$${wipeoutBonus} Wipeout Bonus.`;
      sound.playLap(true);
      save.totalWins += 1;
    } else if (mode === 'WRECKED') {
      placementPrize = 65;
      finishHeadingEl.textContent = 'CHASSIS WRECKED';
      finishRankEl.textContent = 'DNF - SALVAGE TOW';
      finishReasonEl.textContent = 'Enemy fire and collisions breached your armor. Reinforce chassis armor in the Mechanic Bay!';
      sound.playRivalWreck();
    } else {
      const prizeScale = [1.0, 0.68, 0.48, 0.34, 0.24, 0.18, 0.14];
      placementPrize = Math.round(baseFirst * (prizeScale[rank - 1] ?? 0.14));
      finishHeadingEl.textContent = 'CHECKERED FLAG';
      finishRankEl.textContent = `${formatOrdinal(rank)} PLACE`;
      finishReasonEl.textContent = `Completed ${currentTrackSpec.laps} laps in ${currentLeagueSpec.name}.`;
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

  // =========================================================================
  // SETTINGS MODAL & SECRET DEV MENU (` OR 5x CLICK ON #settings-heading)
  // =========================================================================
  function openSettingsModal() {
    resetConfirmArmed = false;
    btnResetSave.textContent = 'RESET PROGRESS';

    if (phase === 'RACING' || phase === 'COUNTDOWN') {
      phase = 'PAUSED_RACE';
      cockpit.releaseAllHolds(car, nitro);
      sound.suspendEngine();
      const rank = activeRivals ? activeRivals.getPlayerRank(car.totalProgress) : 1;
      pauseRaceStatusEl.textContent = `${currentTrackSpec.name} (${currentLeagueSpec.name}) | Pos: ${formatOrdinal(rank)} | Lap ${Math.max(1, car.lap || 1)}/${currentTrackSpec.laps}`;
      btnRestartRace.classList.remove('hidden');
      btnQuitHub.classList.remove('hidden');
      btnResume.textContent = 'RESUME RACE';
    } else if (phase === 'HUB') {
      phase = 'PAUSED_HUB';
      pauseRaceStatusEl.textContent = `Bankroll: $${save.cash} | Wins: ${save.totalWins} | Wrecks: ${save.totalWrecks}`;
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

  function refreshDevMenuUI() {
    devCashReadoutEl.textContent = `$${save.cash}`;
    btnDevGod.textContent = `GOD MODE ARMOR: ${save.godMode ? 'ON' : 'OFF'}`;
    btnDevWreck.disabled = !(activeRivals && activeRivals.getAliveCount() > 0);
  }

  function openDevMenu() {
    if (phase === 'LOADING' || phase === 'ERROR' || phase === 'FINISHED') return;
    if (phase !== 'DEV_MENU') {
      if (phase === 'RACING' || phase === 'COUNTDOWN') {
        devReturnPhase = 'PAUSED_RACE';
        cockpit.releaseAllHolds(car, nitro);
        sound.suspendEngine();
      } else if (phase === 'PAUSED_RACE') {
        devReturnPhase = 'PAUSED_RACE';
      } else {
        devReturnPhase = 'HUB';
      }
      phase = 'DEV_MENU';
    }
    refreshDevMenuUI();
    showOverlayState('DEV');
    btnDevClose.focus();
  }

  function closeDevMenu() {
    if (phase !== 'DEV_MENU') return;
    if (devReturnPhase === 'PAUSED_RACE') {
      phase = countdownTimer > 0 ? 'COUNTDOWN' : 'RACING';
      showOverlayState('NONE');
    } else {
      phase = 'HUB';
      showOverlayState('HUB');
      enterHubRoom(hubRoom);
    }
  }

  settingsHeadingEl.addEventListener('click', () => {
    secretClickCount += 1;
    clearTimeout(secretClickResetTimer);
    secretClickResetTimer = setTimeout(() => {
      secretClickCount = 0;
    }, 3500);
    if (secretClickCount >= 5) {
      secretClickCount = 0;
      sound.init();
      sound.playShopBuy();
      openDevMenu();
    }
  });

  btnDev1k.addEventListener('click', () => {
    sound.init();
    save.cash += 1000;
    persistSave(save);
    sound.playShopBuy();
    refreshDevMenuUI();
  });

  btnDev10k.addEventListener('click', () => {
    sound.init();
    save.cash += 10000;
    persistSave(save);
    sound.playShopBuy();
    refreshDevMenuUI();
  });

  btnDevZero.addEventListener('click', () => {
    sound.init();
    save.cash = 0;
    persistSave(save);
    refreshDevMenuUI();
  });

  btnDevUnlock.addEventListener('click', () => {
    sound.init();
    unlockEverythingDev(save);
    persistSave(save);
    sound.playShopBuy();
    btnDevUnlock.textContent = 'ALL UNLOCKED!';
    refreshDevMenuUI();
  });

  btnDevGod.addEventListener('click', () => {
    sound.init();
    save.godMode = !save.godMode;
    if (save.godMode) car.armor = car.maxArmor;
    persistSave(save);
    refreshDevMenuUI();
  });

  btnDevWreck.addEventListener('click', () => {
    if (!activeRivals) return;
    sound.init();
    const names = activeRivals.wreckAllRivals();
    loadout.wrecksCount += names.length;
    loadout.bountyEarned += names.length * currentLeagueSpec.wreckBounty;
    finishRace('WIPEOUT');
  });

  btnDevClose.addEventListener('click', closeDevMenu);

  btnCornerSettings.addEventListener('click', () => {
    sound.init();
    if (phase === 'DEV_MENU') closeDevMenu();
    else if (phase === 'PAUSED_RACE' || phase === 'PAUSED_HUB') closeSettingsModal();
    else openSettingsModal();
  });

  btnResume.addEventListener('click', closeSettingsModal);
  btnLaunchRace.addEventListener('click', () => {
    sound.init();
    startSelectedRace();
  });
  btnRestartRace.addEventListener('click', startSelectedRace);
  btnRaceAgain.addEventListener('click', startSelectedRace);
  btnQuitHub.addEventListener('click', () => enterGarageHub('menu'));
  btnFinishGarage.addEventListener('click', () => enterGarageHub('menu'));
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
    enterGarageHub('menu');
  });

  // Keyboard: Hold A/D peek, Tap Q/E toggle-lock, W/S forward, Backtick Dev Menu, Esc, M
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      e.preventDefault();
      if (phase === 'DEV_MENU') closeDevMenu();
      else openDevMenu();
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'a') holdLook.left = true;
    else if (k === 'd') holdLook.right = true;
    else if (k === 'q' && !e.repeat && (phase === 'RACING' || phase === 'COUNTDOWN')) {
      lockedView = lockedView === -1 ? 0 : -1;
    } else if (k === 'e' && !e.repeat && (phase === 'RACING' || phase === 'COUNTDOWN')) {
      lockedView = lockedView === 1 ? 0 : 1;
    } else if (k === 'w' || k === 's') {
      lockedView = 0;
    } else if (e.key === 'Escape') {
      if (phase === 'DEV_MENU') {
        e.preventDefault();
        closeDevMenu();
      } else if (phase === 'PAUSED_RACE' || phase === 'PAUSED_HUB') {
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
    if (k === 'a') holdLook.left = false;
    else if (k === 'd') holdLook.right = false;
  });

  window.addEventListener('blur', () => {
    holdLook.left = false;
    holdLook.right = false;
  });

  const upVec = new THREE.Vector3(0, 1, 0);
  let lastTime = performance.now();

  function updateWorld(dt) {
    if (phase === 'HUB' || phase === 'PAUSED_HUB' || (phase === 'DEV_MENU' && devReturnPhase === 'HUB')) {
      rooms.update(dt);
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
        cockpit.setStatus(`GO! SHIFT 1-${carStats.maxGears}!`, '#6be36b', 1.5);
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
        currentTrackSpec.laps,
        save.godMode
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

    const rStep = activeRivals.update(
      dt,
      car,
      carStats,
      phase === 'RACING',
      save.godMode
    );
    rivalSignals.left = rStep.threatLeft;
    rivalSignals.right = rStep.threatRight;
    rivalSignals.tailgater = rStep.tailgaterClose;

    if (rStep.hazardHitText) {
      sound.playCrash(0.65);
      cockpit.setStatus(rStep.hazardHitText, '#ffb020', 1.7);
    }

    bumpSoundCooldown = Math.max(0, bumpSoundCooldown - dt);
    if (rStep.playerBumped && bumpSoundCooldown <= 0) {
      bumpSoundCooldown = 0.32;
      sound.playCrash(0.7);
      impactShake = Math.max(impactShake, 4.2);
    }

    if (rStep.wreckedNames.length > 0) {
      creditWreckBounties(rStep.wreckedNames);
      if (phase === 'FINISHED') return;
    }

    if (rStep.enemyShotDamage > 0 && phase === 'RACING') {
      car.armor = Math.max(0, car.armor - rStep.enemyShotDamage);
      sound.playEnemyShot();
      hurtFlash = Math.max(hurtFlash, 0.36);
      impactShake = Math.max(impactShake, 3.6);
      cockpit.addBulletCrack(rStep.enemyShotSide || 'front');
      cockpit.setStatus(
        rStep.enemyShotSide === 'left' ? 'TAKING FIRE LEFT (A/Q)!' : 'TAKING FIRE RIGHT (D/E)!',
        '#ff5242',
        1.5
      );
      if (!save.godMode && car.armor <= 0) {
        finishRace('WRECKED');
        return;
      }
    }

    sound.updateContinuous({
      rpm: car.rpm,
      nitroStacks: nitro.stacks,
      blowerActive: car.blowerActive || car.chokeActive,
      drifting: car.driftHeld && car.speed > 12,
      onCurb: car.onCurb && Math.abs(car.speed) > 4,
      offRoad: car.offRoad && Math.abs(car.speed) > 4,
      airborne: car.jumpY > 0.15,
      active: phase === 'RACING' || phase === 'COUNTDOWN',
      carId: carStats.spec.id,
    });

    // Forward World Camera & Live Rearview Mirror Camera
    const curSmp = activeTrack.sampleTrack(car.s);
    const worldPos = curSmp.pos.clone().addScaledVector(curSmp.right, car.lateral);

    const surfaceBounce =
      car.jumpY > 0.08
        ? 0
        : (car.offRoad ? 0.075 : car.onCurb ? 0.04 : 0.01) *
          Math.sin(car.bumpPhase * 3.8) *
          Math.min(1, Math.abs(car.speed) / 18);

    camera.position.set(
      worldPos.x,
      worldPos.y + 1.28 + car.jumpY + surfaceBounce,
      worldPos.z
    );
    skyMesh.position.copy(camera.position);

    const cosH = Math.cos(car.headingOffset);
    const sinH = Math.sin(car.headingOffset);
    const fwdX = curSmp.flatTan.x * cosH + curSmp.right.x * sinH;
    const fwdZ = curSmp.flatTan.z * cosH + curSmp.right.z * sinH;
    const carForward = new THREE.Vector3(fwdX, curSmp.tan.y, fwdZ).normalize();
    const carRight = new THREE.Vector3().crossVectors(carForward, upVec).normalize();

    // Update backward-facing Rearview Mirror camera
    rearCamera.position.set(
      worldPos.x,
      worldPos.y + 1.46 + car.jumpY,
      worldPos.z
    );
    rearCamera.up.set(0, 1, 0);
    const rearLook = rearCamera.position
      .clone()
      .addScaledVector(carForward, -24)
      .add(new THREE.Vector3(0, -0.45, 0));
    rearCamera.lookAt(rearLook);

    // Update forward/side-window world camera
    const headYawRad = cockpit.pointer.viewYaw * 1.38 + cockpit.pointer.panX * 0.035;
    const horizLook = carForward
      .clone()
      .multiplyScalar(Math.cos(headYawRad))
      .addScaledVector(carRight, Math.sin(headYawRad));
    const lookDir = horizLook
      .addScaledVector(upVec, -0.16 - cockpit.pointer.panY * 0.025)
      .normalize();

    camera.up.set(0, 1, 0);
    camera.lookAt(camera.position.clone().addScaledVector(lookDir, 25));

    const targetRoll = -(car.wheelAngle / 2.2) * Math.min(1, Math.abs(car.speed) / 42) * 0.024;
    smoothRoll += (targetRoll - smoothRoll) * Math.min(1, dt * 10);
    camera.rotateZ(smoothRoll);

    const targetFov = 65 + (Math.abs(car.speed) / 68) * 7 + nitro.stacks * 4.6;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
    camera.updateProjectionMatrix();

    screenFlash = Math.max(0, screenFlash - dt * 3.5);
    hurtFlash = Math.max(0, hurtFlash - dt * 3.2);
    impactShake = Math.max(0, impactShake - dt * 16.0);

    postPass.postMaterial.uniforms.uFlash.value = screenFlash + car.backfireFlash * 0.18;
    postPass.postMaterial.uniforms.uHurtFlash.value = hurtFlash;
    const targetWarp = nitro.stacks / 4;
    postPass.postMaterial.uniforms.uNitroWarp.value +=
      (targetWarp - postPass.postMaterial.uniforms.uNitroWarp.value) * Math.min(1, dt * 6);
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    const holdActive = holdLook.left || holdLook.right;
    const lookInput = holdActive
      ? (holdLook.right ? 1 : 0) - (holdLook.left ? 1 : 0)
      : lockedView;

    const inRaceScene =
      phase === 'COUNTDOWN' ||
      phase === 'RACING' ||
      phase === 'PAUSED_RACE' ||
      phase === 'FINISHED' ||
      (phase === 'DEV_MENU' && devReturnPhase === 'PAUSED_RACE');

    cockpit.update(dt, phase === 'RACING' || phase === 'COUNTDOWN' ? lookInput : 0);
    updateWorld(dt);

    // Pass 1: Live 128x44 PSX Rearview Mirror Render Target (during races)
    if (inRaceScene && activeRivals) {
      renderer.setRenderTarget(rearTarget);
      renderer.clear();
      renderer.render(scene, rearCamera);
      renderer.readRenderTargetPixels(rearTarget, 0, 0, 128, 44, mirrorPixels);
      // WebGL rows start at the bottom; mirrors also reflect horizontally.
      for (let y = 0; y < 44; y++) {
        for (let x = 0; x < 128; x++) {
          const from = ((43 - y) * 128 + 127 - x) * 4;
          const to = (y * 128 + x) * 4;
          mirrorImage.data[to] = mirrorPixels[from];
          mirrorImage.data[to + 1] = mirrorPixels[from + 1];
          mirrorImage.data[to + 2] = mirrorPixels[from + 2];
          mirrorImage.data[to + 3] = 255;
        }
      }
      mirrorCtx.putImageData(mirrorImage, 0, 0);
    }

    // Pass 2: 320x180 PSX World Render Target
    renderer.setRenderTarget(postPass.target);
    renderer.clear();
    renderer.render(scene, camera);

    // Pass 3: Dithered 5-bit RGB PSX Post-Pass onto full-res glCanvas
    syncRendererSize();
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postPass.postScene, postPass.postCamera);

    // Pass 3.5: Crisp Gun Shop Pegboard Plaques (bypasses 320x180 PSX filter so wall text stays sharp!)
    if (!inRaceScene && rooms.gunPlaqueScene.visible) {
      renderer.clearDepth();
      renderer.render(rooms.gunPlaqueScene, camera);
    }

    // Pass 4: Projected 2D cabin and foreground hand/weapon overlay.
    if (inRaceScene && activeRivals) {
      const speedRatio = Math.min(1, Math.abs(car.speed) / 42);
      const shakeAmp =
        (phase === 'RACING' || phase === 'COUNTDOWN' ? 0.22 : 0) +
        (car.onCurb ? 1.6 * speedRatio : 0) +
        (car.offRoad ? 2.4 * speedRatio : 0) +
        nitro.stacks * nitro.stacks * 0.45 +
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
        countdownText,
        threatLeft: rivalSignals.left,
        threatRight: rivalSignals.right,
        tailgaterClose: rivalSignals.tailgater,
        lockedView,
        godMode: save.godMode,
        smoothRoll,
        shakeX,
        shakeY,
      });
    }
  }

  enterGarageHub('menu');
  requestAnimationFrame(animate);
} catch (err) {
  phase = 'ERROR';
  errorMsgEl.textContent =
    err instanceof Error ? err.message : 'Unable to start WebGL renderer.';
  showOverlayState('ERROR');
}
