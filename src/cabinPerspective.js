export function quadTransform(corners) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = corners;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-8) throw new Error('Cabin surface has no area');
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  const inverse = [e - y0 * h, x0 * h - b, b * y0 - x0 * e,
    y0 * g - d, a - x0 * g, x0 * d - a * y0,
    d * h - e * g, b * g - a * h, a * e - b * d];
  return {
    inverse,
    project(u, v) {
      const z = g * u + h * v + 1;
      return [(a * u + b * v + x0) / z, (d * u + e * v + y0) / z];
    },
    unproject(x, y) {
      const z = inverse[6] * x + inverse[7] * y + inverse[8];
      return [(inverse[0] * x + inverse[1] * y + inverse[2]) / z,
        (inverse[3] * x + inverse[4] * y + inverse[5]) / z];
    },
  };
}

export const FRONT_STATIONS = {
  instruments: [6, 130, 136, 58],
  console: [202, 152, 104, 118],
  drift: [184, 170, 19, 68],
  nitroBay: [308, 180, 152, 90],
  wheelPull: [0, 134, 480, 140],
  trunk: [392, 160, 82, 29],
  visor: [286, 0, 192, 88],
  mirror: [166, 10, 108, 30],
};

const FORWARD_WINDOW = [[14, 14], [466, 14], [470, 184], [10, 184]];

export function cabinLayout(yaw) {
  const angle = -Math.max(-1, Math.min(1, yaw)) * 44 * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const projectFront = (x, y) => {
    const lateral = (x - 240) / 400;
    const depth = cos - lateral * sin;
    return [240 + 400 * (lateral * cos + sin) / depth, 100 + (y - 100) / depth];
  };
  const front = FORWARD_WINDOW.map(([x, y]) => projectFront(x, y));
  const side = yaw <= 0
    ? [[-62, 10], [front[0][0] - 9, front[0][1] + 2], [front[3][0] - 10, 225], [-62, 265]]
    : [[front[1][0] + 9, front[1][1] + 2], [542, 10], [542, 265], [front[2][0] + 10, 225]];
  const cabin = [[0, 0], [480, 0], [480, 270], [0, 270]].map(([x, y]) => projectFront(x, y));
  return { side, front, cabin, projectFront };
}

// Inverse sampling keeps transparent window cutouts and pixel edges free of triangle seams.
export function createQuadPainter(width = 480, height = 270) {
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const ctx = buffer.getContext('2d');
  const output = ctx.createImageData(width, height);
  const outputPixels = new Uint32Array(output.data.buffer);
  return function drawQuad(target, pixels, corners) {
    const [a, b, c, d, e, f, g, h, i] = quadTransform(corners).inverse;
    const minX = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0]))));
    const maxX = Math.min(width, Math.ceil(Math.max(...corners.map(p => p[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
    const maxY = Math.min(height, Math.ceil(Math.max(...corners.map(p => p[1]))));
    const inputPixels = new Uint32Array(pixels.data.buffer, pixels.data.byteOffset, pixels.width * pixels.height);
    outputPixels.fill(0);
    for (let y = minY; y < maxY; y++) {
      let uNumerator = a * (minX + 0.5) + b * (y + 0.5) + c;
      let vNumerator = d * (minX + 0.5) + e * (y + 0.5) + f;
      let denominator = g * (minX + 0.5) + h * (y + 0.5) + i;
      for (let x = minX; x < maxX; x++) {
        const u = uNumerator / denominator, v = vNumerator / denominator;
        if (u >= 0 && u < 1 && v >= 0 && v < 1) {
          outputPixels[y * width + x] = inputPixels[Math.floor(v * pixels.height) * pixels.width + Math.floor(u * pixels.width)];
        }
        uNumerator += a;
        vNumerator += d;
        denominator += g;
      }
    }
    ctx.putImageData(output, 0, 0);
    target.drawImage(buffer, 0, 0);
  };
}
