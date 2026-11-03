import { CARS, GUNS, NITRO_STAGE_NAMES, createDefaultSave, getComputedCarStats } from '../src/catalog.js';
import { createCarState, createNitroState, createLoadoutState } from '../src/logic.js';
import { createCockpitController } from '../src/cockpit.js';
import { pxRect, pxPoly, pxLine } from '../src/pixel.js';
import { cabinLayout, createQuadPainter } from '../src/cabinPerspective.js';
import { createCabin2D } from '../src/cabin2d.js';
import { createLiveExterior } from './exterior.js';

const canvas = document.querySelector('#cabin');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const look = document.querySelector('#look');
const direction = document.querySelector('#direction');
const vehicle = document.querySelector('#vehicle');
const weapon = document.querySelector('#weapon');
const boost = document.querySelector('#boost');
const viewButtons = [...document.querySelectorAll('[data-yaw]')];
const driveButton = document.querySelector('#btn-drive');
const exteriorStatus = document.querySelector('#exterior-status');
const drawQuad = createQuadPainter();
const save = createDefaultSave();
save.selectedCar = 'coupe';
const state = {};

function pixelCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, width, height };
}

const previewMirror = pixelCanvas(128, 44);
sampleMirror(previewMirror.ctx, 0, 0, 128, 44);
const cabin = createCabin2D(previewMirror.canvas);
const controller = createCockpitController(document.createElement('canvas'), cabin,
  {}, { isInteractive: () => false, getState: () => state });
controller.setStatus('', '#ffb020', 0);

const frontScene = pixelCanvas(480, 170);
const sideScene = pixelCanvas(480, 270);
let liveExterior;
let drivePaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let sourcePixels;
let yaw = 0;
let targetYaw = 0;
let lockedYaw = 0;
const held = { left: false, right: false };
let frame = null;
let previousFrame;

function sampleExterior(target, side = 0) {
  const { ctx, width, height } = target;
  pxRect(ctx, 0, 0, width, height, '#a98775');
  pxRect(ctx, 0, 58, width, height - 58, '#ac8055');
  pxPoly(ctx, [[0, 77], [0, 47], [53, 26], [79, 32], [124, 61], [184, 42],
    [236, 57], [280, 20], [330, 35], [378, 61], [431, 38], [480, 48], [480, 90]], '#76594a');
  pxPoly(ctx, [[0, 89], [0, 71], [71, 56], [114, 82], [185, 63], [247, 84],
    [321, 56], [387, 82], [455, 66], [480, 72], [480, 102]], '#906847');
  pxRect(ctx, 0, 97, width, height - 97, '#bd915c');
  if (side === 0) {
    pxPoly(ctx, [[213, 86], [250, 86], [441, 170], [23, 170]], '#514b49');
    pxLine(ctx, 213, 86, 23, 170, '#d6b88b', 2);
    pxLine(ctx, 250, 86, 441, 170, '#d6b88b', 2);
    pxPoly(ctx, [[230, 92], [233, 92], [234, 103], [229, 103]], '#e8c77c');
    pxPoly(ctx, [[227, 117], [237, 117], [243, 145], [222, 145]], '#e8c77c');
  } else {
    pxPoly(ctx, [[0, 122], [480, 104], [480, 193], [0, 216]], '#514b49');
    pxLine(ctx, 0, 119, 480, 102, '#d6b88b', 3);
    pxLine(ctx, 0, 213, 480, 190, '#d6b88b', 3);
    for (let x = -30; x < 480; x += 105) pxPoly(ctx,
      [[x, 157], [x + 56, 155], [x + 61, 159], [x + 4, 162]], '#d8bb7b');
    const x = side < 0 ? 94 : 205;
    pxRect(ctx, x + 13, 123, 81, 22, '#23313b');
    pxPoly(ctx, [[x + 7, 143], [x + 22, 119], [x + 72, 115], [x + 99, 137],
      [x + 129, 142], [x + 135, 167], [x, 172], [x - 8, 154]], '#486368');
    pxPoly(ctx, [[x + 27, 124], [x + 68, 120], [x + 86, 138], [x + 18, 141]], '#1d2c35');
    pxRect(ctx, x + 46, 123, 4, 18, '#486368');
    pxRect(ctx, x + 10, 164, 21, 17, '#191b20');
    pxRect(ctx, x + 104, 160, 21, 17, '#191b20');
    pxRect(ctx, x + 15, 168, 11, 8, '#8f9796');
    pxRect(ctx, x + 109, 164, 11, 8, '#8f9796');
    pxRect(ctx, x + 118, 147, 14, 4, '#d9b474');
  }
}

function sampleMirror(target, x, y, w, h) {
  pxRect(target, x, y, w, h, '#a98775');
  pxRect(target, x, y + Math.round(h * 0.4), w, h, '#906847');
  pxPoly(target, [[x + w * 0.4, y + h * 0.4], [x + w * 0.6, y + h * 0.4],
    [x + w * 0.86, y + h], [x + w * 0.14, y + h]], '#514b49');
}

function prepareArt() {
  save.selectedCar = vehicle.value;
  save.primaryGun = weapon.value;
  Object.assign(save.carParts[save.selectedCar], { trans: 3, nitro: 3, trunk: 2 });
  state.carStats = getComputedCarStats(save);
  state.car = createCarState(state.carStats);
  state.car.speed = 28;
  state.car.rpm = 0.58;
  state.nitro = createNitroState(state.carStats);
  for (const option of boost.options) option.disabled = Number(option.value) > state.nitro.maxStacks;
  boost.value = String(Math.min(Number(boost.value), state.nitro.maxStacks));
  state.nitro.stacks = Number(boost.value);
  state.nitro.meter = state.nitro.stacks > 0 ? 65 : 100;
  state.loadout = createLoadoutState(save);
  controller.render({ ...state, rank: 2, aliveRivals: 5, totalRacers: 6, totalLaps: 3,
    lockedView: 0, smoothRoll: 0, shakeX: 0, shakeY: 0 });
  sampleExterior(frontScene);
  sourcePixels = {
    front: frontScene.ctx.getImageData(0, 0, 480, 170),
  };
}

function liveUnavailable(error) {
  liveExterior = null;
  driveButton.disabled = true;
  exteriorStatus.dataset.mode = 'error';
  exteriorStatus.textContent = `Live 3D exterior unavailable: ${error.message}. Showing sample scenery.`;
}

function draw(yawValue, target = ctx, dt = 0) {
  target.imageSmoothingEnabled = false;
  if (liveExterior) {
    try {
      target.drawImage(liveExterior.render(yawValue, drivePaused ? 0 : dt), 0, 0);
    } catch (error) {
      liveUnavailable(error);
    }
  }
  if (!liveExterior) {
    sampleExterior(sideScene, yawValue <= 0 ? -1 : 1);
    target.drawImage(sideScene.canvas, 0, 0);
    drawQuad(target, sourcePixels.front, cabinLayout(yawValue).front);
  }
  cabin.updateCamera(yawValue);
  cabin.draw(target, state.carStats);
}

function viewLabel(value) {
  if (Math.abs(value) < 0.01) return 'Forward';
  return `${value < 0 ? 'Left' : 'Right'} ${Math.round(Math.abs(value) * 100)}%`;
}

function updateLabels() {
  look.value = yaw;
  direction.value = viewLabel(yaw);
  look.setAttribute('aria-valuetext', viewLabel(yaw));
  canvas.setAttribute('aria-label', `Pixel-art cabin preview: ${viewLabel(yaw)}`);
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.yaw) - targetYaw) < 0.001));
}

function setView(value) {
  targetYaw = Math.max(-1, Math.min(1, value));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) yaw = targetYaw;
  scheduleFrame();
}

function scheduleFrame() {
  if (frame !== null) return;
  previousFrame = performance.now();
  frame = requestAnimationFrame(animate);
}

function animate(now) {
  frame = null;
  const dt = Math.min(0.05, (now - previousFrame) / 1000);
  previousFrame = now;
  yaw += (targetYaw - yaw) * (1 - Math.exp(-dt * 16));
  if (Math.abs(targetYaw - yaw) < 0.002) yaw = targetYaw;
  draw(yaw, ctx, dt);
  updateLabels();
  if ((liveExterior && !drivePaused) || yaw !== targetYaw) frame = requestAnimationFrame(animate);
}

driveButton.addEventListener('click', () => {
  drivePaused = !drivePaused;
  updateDriveStatus();
  scheduleFrame();
});

function updateDriveStatus() {
  driveButton.disabled = false;
  driveButton.textContent = drivePaused ? 'Resume drive' : 'Pause drive';
  driveButton.setAttribute('aria-pressed', String(drivePaused));
  exteriorStatus.dataset.mode = 'live';
  exteriorStatus.textContent = drivePaused ? 'Live 3D exterior. Drive paused; head turns still work.'
    : 'Live 3D exterior. Auto-driving the Badlands circuit.';
}

function startLiveExterior() {
  try {
    liveExterior = createLiveExterior();
    liveExterior.render(yaw);
    liveExterior.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      liveUnavailable(new Error('WebGL context lost'));
      scheduleFrame();
    });
    updateDriveStatus();
    draw(yaw);
    scheduleFrame();
  } catch (error) {
    liveUnavailable(error);
  }
}

for (const [id, car] of Object.entries(CARS)) vehicle.add(new Option(car.name, id));
for (const [id, gun] of Object.entries(GUNS)) weapon.add(new Option(gun.name, id));
NITRO_STAGE_NAMES.forEach((name, index) => boost.add(new Option(
  `${index + 1}× ${name}${index === 3 ? ' (Apex Hatch)' : ''}`, String(index + 1))));
vehicle.value = save.selectedCar;
weapon.value = save.primaryGun;
for (const select of [vehicle, weapon, boost]) select.addEventListener('change', () => { prepareArt(); draw(yaw); });
for (const button of viewButtons) button.addEventListener('click', () => {
  lockedYaw = Number(button.dataset.yaw);
  setView(lockedYaw);
});
look.addEventListener('input', () => {
  yaw = targetYaw = lockedYaw = Number(look.value);
  draw(yaw);
  updateLabels();
});
function keyboardView() { setView(held.left === held.right ? lockedYaw : held.left ? -1 : 1); }
window.addEventListener('keydown', event => {
  if (event.target.matches('input, select, textarea') || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (!['a', 'd', 'q', 'e', 'w', 's', 'escape'].includes(key)) return;
  event.preventDefault();
  if (key === 'a') held.left = true;
  if (key === 'd') held.right = true;
  if (key === 'q' && !event.repeat) lockedYaw = lockedYaw === -1 ? 0 : -1;
  if (key === 'e' && !event.repeat) lockedYaw = lockedYaw === 1 ? 0 : 1;
  if (['w', 's', 'escape'].includes(key)) { held.left = held.right = false; lockedYaw = 0; }
  keyboardView();
});
window.addEventListener('keyup', event => {
  if (!['a', 'd'].includes(event.key.toLowerCase())) return;
  held[event.key.toLowerCase() === 'a' ? 'left' : 'right'] = false;
  keyboardView();
});
window.addEventListener('blur', () => { held.left = held.right = false; keyboardView(); });

try {
  prepareArt();
  draw(0);
  requestAnimationFrame(startLiveExterior);
} catch (error) {
  const message = document.querySelector('#preview-error');
  message.hidden = false;
  message.textContent = `Preview could not be drawn: ${error.message}`;
  throw error;
}

// The review sheet uses the same renderer and loadout as the interactive preview.
export function drawReviewSheet() {
  const sheet = pixelCanvas(960, 1200);
  const frame = pixelCanvas(480, 270);
  const exteriorLabel = liveExterior ? 'LIVE 3D EXTERIOR' : 'SAMPLE EXTERIOR';
  const labels = [[0, `FORWARD / 2D CABIN / ${exteriorLabel}`], [-0.5, 'HALF LEFT'],
    [0.5, 'HALF RIGHT'], [-1, 'LEFT WINDOW'], [1, 'RIGHT WINDOW']];
  sheet.ctx.fillStyle = '#11141a';
  sheet.ctx.fillRect(0, 0, 960, 1200);
  for (let i = 0; i < labels.length; i++) {
    const [angle, label] = labels[i];
    draw(angle, frame.ctx);
    const x = i === 0 ? 0 : ((i - 1) % 2) * 480;
    const y = i === 0 ? 30 : 600 + Math.floor((i - 1) / 2) * 300;
    if (i === 0) sheet.ctx.drawImage(frame.canvas, x, y, 960, 540);
    else sheet.ctx.drawImage(frame.canvas, x, y, 480, 270);
    sheet.ctx.fillStyle = '#11141a';
    sheet.ctx.fillRect(x, y - 24, i === 0 ? 960 : 480, 22);
    sheet.ctx.fillStyle = '#f4efe6';
    sheet.ctx.font = '14px sans-serif';
    sheet.ctx.fillText(label, x + 8, y - 8);
  }
  return sheet.canvas;
}

window.CabinPreview = { drawReviewSheet };
