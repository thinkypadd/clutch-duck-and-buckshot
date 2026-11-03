// Integer pixel-art primitives for a crisp low-res 2D canvas (zero anti-aliased blur)

const FONT_3X5 = {
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b010, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b011],
  D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111],
  F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b011, 0b100, 0b101, 0b101, 0b011],
  H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  J: [0b001, 0b001, 0b001, 0b101, 0b010],
  K: [0b101, 0b101, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101],
  N: [0b110, 0b101, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b010],
  P: [0b110, 0b101, 0b110, 0b100, 0b100],
  Q: [0b010, 0b101, 0b101, 0b011, 0b001],
  R: [0b110, 0b101, 0b110, 0b101, 0b101],
  S: [0b011, 0b100, 0b010, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  V: [0b101, 0b101, 0b101, 0b101, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101],
  X: [0b101, 0b101, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b010, 0b100, 0b111],
  ':': [0b000, 0b010, 0b000, 0b010, 0b000],
  '.': [0b000, 0b000, 0b000, 0b000, 0b010],
  '/': [0b001, 0b001, 0b010, 0b100, 0b100],
  '-': [0b000, 0b000, 0b111, 0b000, 0b000],
  '+': [0b000, 0b010, 0b111, 0b010, 0b000],
  '!': [0b010, 0b010, 0b010, 0b000, 0b010],
  '%': [0b101, 0b001, 0b010, 0b100, 0b101],
  '$': [0b011, 0b110, 0b010, 0b011, 0b110],
  '<': [0b001, 0b010, 0b100, 0b010, 0b001],
  '>': [0b100, 0b010, 0b001, 0b010, 0b100],
  '(': [0b010, 0b100, 0b100, 0b100, 0b010],
  ')': [0b010, 0b001, 0b001, 0b001, 0b010],
  '&': [0b010, 0b101, 0b010, 0b101, 0b011],
  "'": [0b010, 0b010, 0b000, 0b000, 0b000],
  '?': [0b111, 0b001, 0b011, 0b000, 0b010],
  '|': [0b010, 0b010, 0b010, 0b010, 0b010],
  ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
};

export function pxRect(ctx, x, y, w, h, color) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
}

export function pxOutlineRect(ctx, x, y, w, h, fill, border) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(rx, ry, rw, rh);
  }
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(rx, ry, rw, 1);
    ctx.fillRect(rx, ry + rh - 1, rw, 1);
    ctx.fillRect(rx, ry, 1, rh);
    ctx.fillRect(rx + rw - 1, ry, 1, rh);
  }
}

export function pxDitherRect(ctx, x, y, w, h, colorA, colorB, step = 2) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = colorA;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = colorB;
  for (let py = 0; py < rh; py += 1) {
    for (let px = (py % step); px < rw; px += step) {
      ctx.fillRect(rx + px, ry + py, 1, 1);
    }
  }
}

export function pxLine(ctx, x0, y0, x1, y1, color, thickness = 1) {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const sx = ix0 < ix1 ? 1 : -1;
  const dy = -Math.abs(iy1 - iy0);
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx + dy;
  const half = Math.floor(thickness / 2);
  ctx.fillStyle = color;

  while (true) {
    ctx.fillRect(ix0 - half, iy0 - half, thickness, thickness);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      ix0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

export function pxFillCircle(ctx, cx, cy, r, color) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const ir = Math.round(r);
  if (ir <= 0) return;
  ctx.fillStyle = color;
  const r2 = ir * ir + ir * 0.4;
  for (let dy = -ir; dy <= ir; dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
    ctx.fillRect(icx - span, icy + dy, span * 2 + 1, 1);
  }
}

export function pxRing(ctx, cx, cy, rOuter, rInner, color) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const ro = Math.round(rOuter);
  const ri = Math.max(0, Math.round(rInner));
  ctx.fillStyle = color;
  const ro2 = ro * ro + ro * 0.35;
  const ri2 = ri * ri - ri * 0.25;
  for (let dy = -ro; dy <= ro; dy++) {
    const dy2 = dy * dy;
    const outerSpan = Math.floor(Math.sqrt(Math.max(0, ro2 - dy2)));
    if (dy2 >= ri2) {
      ctx.fillRect(icx - outerSpan, icy + dy, outerSpan * 2 + 1, 1);
    } else {
      const innerSpan = Math.floor(Math.sqrt(Math.max(0, ri2 - dy2)));
      const segW = outerSpan - innerSpan;
      if (segW > 0) {
        ctx.fillRect(icx - outerSpan, icy + dy, segW, 1);
        ctx.fillRect(icx + innerSpan + 1, icy + dy, segW, 1);
      }
    }
  }
}

export function pxPoly(ctx, points, color) {
  if (points.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const yStart = Math.round(minY);
  const yEnd = Math.round(maxY);
  ctx.fillStyle = color;
  const nodes = [];

  for (let y = yStart; y <= yEnd; y++) {
    nodes.length = 0;
    const sampleY = y + 0.5;
    let j = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      const yi = points[i][1];
      const yj = points[j][1];
      if ((yi < sampleY && yj >= sampleY) || (yj < sampleY && yi >= sampleY)) {
        const xi = points[i][0];
        const xj = points[j][0];
        nodes.push(xi + ((sampleY - yi) / (yj - yi)) * (xj - xi));
      }
      j = i;
    }
    nodes.sort((a, b) => a - b);
    for (let k = 0; k < nodes.length - 1; k += 2) {
      const xStart = Math.round(nodes[k]);
      const xStop = Math.round(nodes[k + 1]);
      if (xStop >= xStart) {
        ctx.fillRect(xStart, y, Math.max(1, xStop - xStart), 1);
      }
    }
  }
}

export function pxText(ctx, text, x, y, color = '#f4efe6', scale = 1, align = 'left') {
  const str = String(text).toUpperCase();
  const charW = 3 * scale;
  const stepX = 4 * scale;
  const totalW = str.length * stepX - scale;
  let cursorX = Math.round(
    align === 'center' ? x - totalW / 2 : align === 'right' ? x - totalW : x
  );
  const baseY = Math.round(y);
  ctx.fillStyle = color;

  for (let idx = 0; idx < str.length; idx++) {
    const glyph = FONT_3X5[str[idx]] || FONT_3X5[' '];
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 3; col++) {
        if ((bits >> (2 - col)) & 1) {
          ctx.fillRect(cursorX + col * scale, baseY + row * scale, scale, scale);
        }
      }
    }
    cursorX += stepX;
  }
  return totalW;
}
