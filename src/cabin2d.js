import { pxRect, pxPoly, pxLine } from './pixel.js';
import { cabinLayout, createQuadPainter, quadTransform, FRONT_STATIONS } from './cabinPerspective.js';

export const CABIN_PATCHES = [
  { name: 'console', layer: 'dash', crop: [202, 16, 104, 118] },
  { name: 'drift', layer: 'dash', crop: [184, 34, 19, 68], padding: 5 },
  { name: 'nitroBay', layer: 'dash', crop: [308, 44, 152, 90] },
  { name: 'instruments', layer: 'dash', crop: [46, 4, 136, 58] },
  { name: 'wheelPull', layer: 'wheelPull', crop: [0, 0, 480, 140] },
  { name: 'trunk', layer: 'windshield', crop: [56, 15, 82, 29], padding: 3 },
  { name: 'header', layer: 'windshield', crop: [0, 0, 480, 14], target: [0, 0, 480, 14] },
  { name: 'mirror', layer: 'windshield', crop: [146, 14, 108, 30] },
  { name: 'visor', layer: 'windshield', crop: [264, 0, 192, 88] },
];

function pixelLayer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, width, height };
}

export function createCabin2D(mirrorCanvas = null) {
  const layers = {
    hood: pixelLayer(360, 110), windshield: pixelLayer(480, 270),
    leftDoor: pixelLayer(384, 256), rightDoor: pixelLayer(384, 256),
    dash: pixelLayer(480, 140), wheelPull: pixelLayer(480, 140),
  };
  const front = pixelLayer(480, 270);
  const glass = pixelLayer(480, 270);
  const drawQuad = createQuadPainter();
  const capturedPatches = {};
  let layout = cabinLayout(0);
  let inverse = quadTransform(layout.cabin);
  let dx = 0, dy = 0, roll = 0;
  let drift = false;

  function updateCamera(viewYaw, panX = 0, panY = 0, smoothRoll = 0, shakeX = 0, shakeY = 0) {
    layout = cabinLayout(viewYaw + panX * 0.03);
    inverse = quadTransform(layout.cabin);
    dx = shakeX - panX * 3;
    dy = shakeY - panY * 2;
    // Rotating artwork is the inverse of rolling the world camera.
    roll = -smoothRoll;
  }

  function sourcePoint(patch, x, y) {
    const [tx, ty, tw, th] = patch.target || FRONT_STATIONS[patch.name];
    const [sx, sy, sw, sh] = patch.crop;
    return { x: sx + (x - tx) * sw / tw, y: sy + (y - ty) * sh / th,
      inBounds: x >= tx && x < tx + tw && y >= ty && y < ty + th };
  }

  function projectToLayer(layerName, ndcX, ndcY, captured = false) {
    if (!captured && (Math.abs(ndcX) > 1 || Math.abs(ndcY) > 1)) return null;
    const sx = ndcX * 240 - dx, sy = -ndcY * 135 - dy;
    const cos = Math.cos(roll), sin = Math.sin(roll);
    const [u, v] = inverse.unproject(sx * cos + sy * sin + 240, -sx * sin + sy * cos + 135);
    const x = u * 480, y = v * 270;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (captured && capturedPatches[layerName]) return sourcePoint(capturedPatches[layerName], x, y);
    if (x < 0 || x >= 480 || y < 0 || y >= 270) return null;
    for (let i = CABIN_PATCHES.length - 1; i >= 0; i--) {
      const patch = CABIN_PATCHES[i];
      if (patch.name === 'drift' && !drift) continue;
      const [tx, ty, tw, th] = patch.target || FRONT_STATIONS[patch.name];
      const pad = patch.padding || 0;
      if (x < tx - pad || x >= tx + tw + pad || y < ty - pad || y >= ty + th + pad) continue;
      const point = sourcePoint(patch, x, y);
      if (patch.layer === layerName) {
        capturedPatches[layerName] = patch;
        return point;
      }
      const layer = layers[patch.layer];
      const wheelInterior = patch.name === 'wheelPull' && Math.hypot(point.x - 114, point.y - 84) <= 48;
      if (wheelInterior || (point.inBounds && layer.ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data[3] > 127)) return null;
    }
    return null;
  }

  function paintMirror(ctx, x, y, w, h) {
    pxRect(ctx, x, y, w, h, '#0b0d10');
    if (mirrorCanvas) ctx.drawImage(mirrorCanvas, x, y, w, h);
  }

  function draw(ctx, carStats, tailgaterClose = false) {
    drift = carStats.spec.gimmickType === 'drift_purple';
    const armorTier = carStats.parts?.armor || 0;
    const interior = front.ctx;
    interior.clearRect(0, 0, 480, 270);
    glass.ctx.clearRect(0, 0, 480, 270);
    glass.ctx.drawImage(layers.windshield.canvas, 0, 0);
    for (const rect of [[0, 0, 480, 14], [54, 14, 86, 34], [146, 14, 108, 40],
      [264, 0, 192, 88], [0, 0, 26, 270], [454, 0, 26, 270]]) glass.ctx.clearRect(...rect);
    if (armorTier >= 3) glass.ctx.drawImage(layers.windshield.canvas, 26, 78, 428, 5, 26, 78, 428, 5);
    interior.drawImage(glass.canvas, 0, 0);
    interior.drawImage(layers.hood.canvas, 60, 92);
    pxRect(interior, 0, 156, 480, 114, carStats.spec.dashColor);
    pxRect(interior, 0, 152, 480, 10, '#343a43');
    pxRect(interior, 0, 152, 480, 2, '#4a5263');
    for (const patch of CABIN_PATCHES) {
      if (patch.name === 'drift' && !drift) continue;
      const target = patch.target || FRONT_STATIONS[patch.name];
      if (patch.name === 'mirror') paintMirror(interior, target[0] + 4, target[1] + 3, 100, 24);
      interior.drawImage(layers[patch.layer].canvas, ...patch.crop, ...target);
    }
    if (tailgaterClose) interior.drawImage(layers.windshield.canvas, 170, 42, 60, 10, 190, 38, 60, 10);
    paintMirror(layers.leftDoor.ctx, 307, 139, 48, 28);

    ctx.save();
    ctx.translate(240 + dx, 135 + dy);
    ctx.rotate(roll);
    ctx.translate(-240, -135);
    pxRect(ctx, -32, 188, 544, 114, '#14171f');
    const side = layout.side[0][0] < 0 ? layers.leftDoor : layers.rightDoor;
    drawQuad(ctx, side.ctx.getImageData(0, 0, side.width, side.height), layout.side);
    const [tl, tr, br, bl] = layout.front;
    for (const [top, bottom] of [[tl, bl], [tr, br]]) {
      pxPoly(ctx, [[top[0] - 7, top[1] - 2], [top[0] + 7, top[1] - 2],
        [bottom[0] + 8, bottom[1] + 4], [bottom[0] - 8, bottom[1] + 4]], '#1e222b');
      pxLine(ctx, top[0] + 3, top[1], bottom[0] + 3, bottom[1], armorTier >= 1 ? '#7c879c' : '#424b59', armorTier >= 1 ? 5 : 2);
    }
    if (armorTier >= 1) pxLine(ctx, tl[0], tl[1], tr[0], tr[1], '#687285', 4);
    pxRect(ctx, -32, -32, 544, 46, '#181a20');
    pxRect(ctx, -32, 0, 32, 270, '#1e222b');
    pxRect(ctx, 480, 0, 32, 270, '#1e222b');
    drawQuad(ctx, interior.getImageData(0, 0, 480, 270), layout.cabin);
    ctx.restore();
  }

  return { layers, updateCamera, projectToLayer, draw };
}
