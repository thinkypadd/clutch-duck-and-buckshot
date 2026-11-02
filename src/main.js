import * as THREE from 'three';
import {
  TOTAL_LAPS,
  createCarState,
  createNitroState,
  createShotgunState,
  stepCarPhysics,
  stepNitro,
  stepShotgunTimers,
  formatRaceTime,
  formatOrdinal,
} from './logic.js';
import { SoundEngine } from './audio.js';
import {
  PSX_WIDTH,
  PSX_HEIGHT,
  FOG_COLOR,
  createPsxPostPass,
  buildPsxTextures,
} from './psx.js';
import { buildCircuit } from './track.js';
import { createRivalManager } from './rivals.js';
import { createCockpitController } from './cockpit.js';

const glCanvas = document.getElementById('gl-canvas');
const cockpitCanvas = document.getElementById('cockpit-canvas');

const screenLoading = document.getElementById('screen-loading');
const screenError = document.getElementById('screen-error');
const errorMsgEl = document.getElementById('error-message');
const screenStart = document.getElementById('screen-start');
const screenPause = document.getElementById('screen-pause');
const screenFinish = document.getElementById('screen-finish');
const panelHelp = document.getElementById('panel-help');

const btnStart = document.getElementById('btn-start');
const btnHelp = document.getElementById('btn-help');
const btnCloseHelp = document.getElementById('btn-close-help');
const btnMute = document.getElementById('btn-mute');
const btnPause = document.getElementById('btn-pause');
const btnResume = document.getElementById('btn-resume');
const btnRestartPause = document.getElementById('btn-restart-pause');
const btnRaceAgain = document.getElementById('btn-race-again');
const btnRetry = document.getElementById('btn-retry');

const pauseStatsEl = document.getElementById('pause-stats');
const finishRankEl = document.getElementById('finish-rank');
const finishTimeEl = document.getElementById('finish-time');
const finishBestEl = document.getElementById('finish-best');
const finishWrecksEl = document.getElementById('finish-wrecks');

let phase = 'LOADING'; // 'LOADING' | 'START' | 'COUNTDOWN' | 'RACING' | 'PAUSED' | 'FINISHED'
let phaseBeforeHelp = null;
let countdownTimer = 0;
let lastCountdownBeat = 4;
let raceTime = 0;
let screenFlash = 0;
let impactShake = 0;
let smoothRoll = 0;
let bumpSoundCooldown = 0;

const sound = new SoundEngine();
let car = createCarState();
let nitro = createNitroState();
let shotgun = createShotgunState();

function showOnlyOverlay(target) {
  for (const el of [screenLoading, screenError, screenStart, screenPause, screenFinish, panelHelp]) {
    el.classList.toggle('hidden', el !== target);
  }
}

try {
  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(PSX_WIDTH, PSX_HEIGHT, false);
  renderer.setClearColor(FOG_COLOR, 1);

  const scene = new THREE.Scene();

  // Dusk PS1 sky dome gradient (warm burnt amber horizon to deep slate zenith)
  const skyGeo = new THREE.SphereGeometry(680, 12, 8);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying float vHeight;
      void main() {
        vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vHeight;
      void main() {
        vec3 horizon = vec3(0.42, 0.25, 0.22);
        vec3 mid = vec3(0.18, 0.15, 0.22);
        vec3 zenith = vec3(0.07, 0.08, 0.13);
        float h = clamp(vHeight, 0.0, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, zenith, smoothstep(0.22, 0.75, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.35, 760);
  const postPass = createPsxPostPass();
  const textures = buildPsxTextures();
  const track = buildCircuit(scene, textures);
  const rivalMgr = createRivalManager(scene, track);

  const cockpit = createCockpitController(cockpitCanvas, sound, {
    isInteractive: () => phase === 'COUNTDOWN' || phase === 'RACING',
    getState: () => ({ car, nitro, shotgun }),
    onShotgunFired: (ndcX, ndcY) => {
      screenFlash = 0.48;
      impactShake = Math.max(impactShake, 5.5);
      // Only damage rivals once countdown GO has dropped
      if (phase !== 'RACING') return;
      const hitRes = rivalMgr.fireBuckshotAt(camera, ndcX, ndcY);
      if (hitRes.wrecked) {
        shotgun.wrecksCount += 1;
        sound.playRivalWreck();
        cockpit.setStatus(`WRECKED ${hitRes.rivalName}!`, '#6be36b', 2.4);
      } else if (hitRes.hit) {
        sound.playCrash(0.75);
        cockpit.setStatus(`SMOKED ${hitRes.rivalName}!`, '#ffb020', 1.8);
      }
    },
  });

  function resetRace() {
    car = createCarState();
    nitro = createNitroState();
    shotgun = createShotgunState();
    rivalMgr.resetRivals();
    cockpit.releaseAllHolds(car, nitro);
    raceTime = 0;
    countdownTimer = 2.6;
    lastCountdownBeat = 4;
    screenFlash = 0;
    impactShake = 0;
    smoothRoll = 0;
    phase = 'COUNTDOWN';
    btnPause.disabled = false;
    btnPause.textContent = 'PAUSE';
    showOnlyOverlay(null);
    cockpit.setStatus('GET READY: HOLD GAS!', '#ffb020', 2.4);
  }

  function enterPause() {
    if (phase !== 'RACING' && phase !== 'COUNTDOWN') return;
    phase = 'PAUSED';
    cockpit.releaseAllHolds(car, nitro);
    sound.suspendEngine();
    const rank = rivalMgr.getPlayerRank(car.totalProgress);
    pauseStatsEl.textContent = `Position: ${formatOrdinal(rank)} of 6 | Lap ${Math.max(1, car.lap || 1)} of ${TOTAL_LAPS} | Time: ${formatRaceTime(raceTime)}`;
    showOnlyOverlay(screenPause);
    btnResume.focus();
  }

  function resumeFromPause() {
    if (phase !== 'PAUSED') return;
    phase = countdownTimer > 0 ? 'COUNTDOWN' : 'RACING';
    showOnlyOverlay(null);
  }

  function finishRace() {
    phase = 'FINISHED';
    cockpit.releaseAllHolds(car, nitro);
    sound.suspendEngine();
    sound.playLap(true);
    btnPause.disabled = true;

    const finalRank = rivalMgr.getPlayerRank(car.totalProgress);
    finishRankEl.textContent = `${formatOrdinal(finalRank)} PLACE`;
    finishTimeEl.textContent = formatRaceTime(raceTime);
    finishBestEl.textContent = Number.isFinite(car.bestLapTime)
      ? formatRaceTime(car.bestLapTime)
      : formatRaceTime(raceTime / TOTAL_LAPS);
    finishWrecksEl.textContent = String(shotgun.wrecksCount);

    showOnlyOverlay(screenFinish);
    btnRaceAgain.focus();
  }

  // UI Event Wiring
  btnStart.addEventListener('click', () => {
    sound.init();
    resetRace();
  });

  btnResume.addEventListener('click', resumeFromPause);
  btnRestartPause.addEventListener('click', resetRace);
  btnRaceAgain.addEventListener('click', resetRace);
  btnRetry.addEventListener('click', () => window.location.reload());

  btnPause.addEventListener('click', () => {
    if (phase === 'PAUSED') resumeFromPause();
    else enterPause();
  });

  btnHelp.addEventListener('click', () => {
    if (!panelHelp.classList.contains('hidden')) {
      closeHelpPanel();
      return;
    }
    phaseBeforeHelp = phase;
    if (phase === 'RACING' || phase === 'COUNTDOWN') {
      cockpit.releaseAllHolds(car, nitro);
      sound.suspendEngine();
      phase = 'PAUSED';
    }
    btnHelp.setAttribute('aria-expanded', 'true');
    showOnlyOverlay(panelHelp);
    btnCloseHelp.focus();
  });

  function closeHelpPanel() {
    btnHelp.setAttribute('aria-expanded', 'false');
    if (phaseBeforeHelp === 'START') {
      phase = 'START';
      showOnlyOverlay(screenStart);
      btnStart.focus();
    } else if (phaseBeforeHelp === 'FINISHED') {
      phase = 'FINISHED';
      showOnlyOverlay(screenFinish);
      btnRaceAgain.focus();
    } else if (phaseBeforeHelp === 'PAUSED') {
      phase = 'PAUSED';
      showOnlyOverlay(screenPause);
      btnResume.focus();
    } else {
      phase = countdownTimer > 0 ? 'COUNTDOWN' : 'RACING';
      showOnlyOverlay(null);
    }
    phaseBeforeHelp = null;
  }

  btnCloseHelp.addEventListener('click', closeHelpPanel);

  function toggleMute() {
    sound.init();
    sound.setMuted(!sound.muted);
    btnMute.setAttribute('aria-pressed', String(sound.muted));
    btnMute.textContent = sound.muted ? 'AUDIO: OFF' : 'AUDIO: ON';
  }

  btnMute.addEventListener('click', toggleMute);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!panelHelp.classList.contains('hidden')) {
        e.preventDefault();
        closeHelpPanel();
      } else if (phase === 'RACING' || phase === 'COUNTDOWN') {
        e.preventDefault();
        enterPause();
      } else if (phase === 'PAUSED') {
        e.preventDefault();
        resumeFromPause();
      }
    } else if (e.key === 'm' || e.key === 'M') {
      if (document.activeElement?.tagName !== 'INPUT') {
        toggleMute();
      }
    }
  });

  const upVec = new THREE.Vector3(0, 1, 0);
  let lastTime = performance.now();

  function updateCameraAndWorld(dt) {
    const smp = track.sampleTrack(car.s);

    if (phase === 'COUNTDOWN') {
      countdownTimer -= dt;
      const beat = Math.ceil(countdownTimer / 0.85);
      if (beat !== lastCountdownBeat && beat >= 1 && beat <= 3) {
        lastCountdownBeat = beat;
        sound.playCountdown(false);
      }
      // Let player rev RPM on gas pedal during countdown without moving forward
      if (car.gasHeld && shotgun.mode !== 'EQUIPPED') {
        car.rpm = Math.min(0.95, car.rpm + dt * 1.4);
      } else {
        car.rpm = Math.max(0.2, car.rpm - dt * 1.1);
      }
      stepShotgunTimers(shotgun, dt);
      if (countdownTimer <= 0) {
        phase = 'RACING';
        sound.playCountdown(true);
        // Launch boost if revved in sweet spot!
        if (car.rpm > 0.55) {
          car.speed = 16;
          cockpit.setStatus('HOT LAUNCH!', '#6be36b', 1.5);
        } else {
          cockpit.setStatus('GO! GO! GO!', '#6be36b', 1.4);
        }
      }
    } else if (phase === 'RACING') {
      raceTime += dt;
      const canDrive = shotgun.mode !== 'EQUIPPED';
      const phys = stepCarPhysics(
        car,
        nitro,
        smp.curvature,
        track.totalLength,
        raceTime,
        dt,
        canDrive
      );
      stepNitro(nitro, dt);
      stepShotgunTimers(shotgun, dt);

      if (phys.hitWall) {
        sound.playCrash(1.0);
        impactShake = Math.max(impactShake, 6.0);
        screenFlash = Math.max(screenFlash, 0.22);
        cockpit.setStatus('GUARDRAIL IMPACT!', '#ff5242', 1.3);
      }

      if (phys.lapCompleted) {
        if (car.completedLaps >= TOTAL_LAPS) {
          finishRace();
          return;
        }
        sound.playLap(false);
        cockpit.setStatus(
          car.completedLaps === TOTAL_LAPS - 1 ? 'FINAL LAP!' : `LAP ${car.lap} OF ${TOTAL_LAPS}`,
          '#6be36b',
          2.5
        );
      }
    }

    const rivalStep = rivalMgr.update(dt, car, phase === 'RACING');
    bumpSoundCooldown = Math.max(0, bumpSoundCooldown - dt);
    if (rivalStep.playerBumped && bumpSoundCooldown <= 0) {
      bumpSoundCooldown = 0.32;
      sound.playCrash(0.65);
      impactShake = Math.max(impactShake, 3.8);
    }

    sound.updateContinuous({
      rpm: car.rpm,
      gasHeld: car.gasHeld && shotgun.mode !== 'EQUIPPED',
      nitroStacks: nitro.stacks,
      onCurb: car.onCurb && Math.abs(car.speed) > 4,
      offRoad: car.offRoad && Math.abs(car.speed) > 4,
      brakingHard: car.brakeHeld && car.speed > 18,
      active: phase === 'RACING' || phase === 'COUNTDOWN',
    });

    // Sync camera to updated player position + subtle head-panning
    const curSmp = track.sampleTrack(car.s);
    const worldPos = curSmp.pos.clone().addScaledVector(curSmp.right, car.lateral);

    const surfaceBounce =
      (car.offRoad ? 0.08 : car.onCurb ? 0.045 : 0.01) *
      Math.sin(car.bumpPhase * 3.8) *
      Math.min(1, Math.abs(car.speed) / 18);

    camera.position.set(worldPos.x, worldPos.y + 1.26 + surfaceBounce, worldPos.z);
    skyMesh.position.copy(camera.position);

    const cosH = Math.cos(car.headingOffset);
    const sinH = Math.sin(car.headingOffset);
    const fwdX = curSmp.flatTan.x * cosH + curSmp.right.x * sinH;
    const fwdZ = curSmp.flatTan.z * cosH + curSmp.right.z * sinH;
    const carForward = new THREE.Vector3(fwdX, curSmp.tan.y, fwdZ).normalize();
    const carRight = new THREE.Vector3().crossVectors(carForward, upVec).normalize();

    const brakePitch = car.brakeHeld && car.speed > 6 ? 0.035 : car.gasHeld ? -0.018 : 0;
    const lookDir = carForward
      .clone()
      .addScaledVector(carRight, cockpit.pointer.panX * 0.15)
      .addScaledVector(upVec, -cockpit.pointer.panY * 0.06 - brakePitch)
      .normalize();

    camera.up.set(0, 1, 0);
    camera.lookAt(camera.position.clone().addScaledVector(lookDir, 25));
    // Post-multiply local Z quaternion via rotateZ; setting Euler rotation.z after lookAt flips 180 deg when facing +Z
    const targetRoll = -(car.wheelAngle / 2.2) * Math.min(1, Math.abs(car.speed) / 40) * 0.025;
    smoothRoll += (targetRoll - smoothRoll) * Math.min(1, dt * 10);
    camera.rotateZ(smoothRoll);

    const targetFov = 64 + (Math.abs(car.speed) / 65) * 7 + nitro.stacks * 5.2;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
    camera.updateProjectionMatrix();

    screenFlash = Math.max(0, screenFlash - dt * 3.4);
    impactShake = Math.max(0, impactShake - dt * 16.0);

    postPass.postMaterial.uniforms.uFlash.value = screenFlash;
    const targetWarp = nitro.stacks / 3;
    postPass.postMaterial.uniforms.uNitroWarp.value +=
      (targetWarp - postPass.postMaterial.uniforms.uNitroWarp.value) * Math.min(1, dt * 6);
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    cockpit.update(dt);
    updateCameraAndWorld(dt);

    // 1. Render PSX 3D world to 320x180 offscreen target, then dither/quantize to glCanvas
    renderer.setRenderTarget(postPass.target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postPass.postScene, postPass.postCamera);

    // 2. Compute physical cabin rattle (engine + curbs + 1X/2X/3X nitro + impacts)
    const speedRatio = Math.min(1, Math.abs(car.speed) / 40);
    const shakeAmp =
      (phase === 'RACING' || phase === 'COUNTDOWN' ? 0.25 : 0) +
      (car.onCurb ? 1.8 * speedRatio : 0) +
      (car.offRoad ? 2.8 * speedRatio : 0) +
      nitro.stacks * nitro.stacks * 0.62 +
      impactShake;
    const shakeX = (Math.random() - 0.5) * 2 * shakeAmp;
    const shakeY = (Math.random() - 0.5) * 2 * shakeAmp;

    let countdownText = '';
    if (phase === 'COUNTDOWN') {
      const b = Math.ceil(countdownTimer / 0.85);
      countdownText = b > 0 ? String(Math.min(3, b)) : 'GO!';
    }

    // 3. Render 2D pixel-art interior & interactive stations over the 3D scene
    cockpit.render({
      car,
      nitro,
      shotgun,
      rank: rivalMgr.getPlayerRank(car.totalProgress),
      totalRacers: rivalMgr.rivals.length + 1,
      raceTime,
      countdownText,
      shakeX,
      shakeY,
    });
  }

  // Transition from LOADING -> START immediately once assets & circuit are built
  phase = 'START';
  showOnlyOverlay(screenStart);
  btnStart.focus();
  requestAnimationFrame(animate);
} catch (err) {
  phase = 'ERROR';
  errorMsgEl.textContent =
    err instanceof Error ? err.message : 'Unable to start WebGL renderer.';
  showOnlyOverlay(screenError);
}
