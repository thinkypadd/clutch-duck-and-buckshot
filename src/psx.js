import * as THREE from 'three';

export const PSX_WIDTH = 320;
export const PSX_HEIGHT = 180;
export const FOG_COLOR = new THREE.Color(0x281f26);

const PSX_VERT = /* glsl */ `
  uniform vec2 uSnapRes;
  uniform float uAffineMix;
  uniform vec3 uSunDir;

  varying vec2 vUvPersp;
  varying vec2 vUvAffineW;
  varying float vClipW;
  varying vec3 vLight;
  varying float vFogDepth;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 mvPos = viewMatrix * worldPos;
    vec4 clip = projectionMatrix * mvPos;

    // PS1 clip-space integer vertex snapping (characteristic polygon jitter)
    if (clip.w > 0.05) {
      vec2 ndc = clip.xy / clip.w;
      vec2 snapped = floor(ndc * uSnapRes + 0.5) / uSnapRes;
      clip.xy = snapped * clip.w;
    }

    gl_Position = clip;

    // Screen-space affine UV trick: dividing (uv * w) by interpolated (w) recovers linear screen barycentrics
    float safeW = max(0.25, clip.w);
    vUvPersp = uv;
    vUvAffineW = uv * safeW;
    vClipW = safeW;

    // Per-vertex Gouraud lighting (authentic PS1 faceted shading)
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    float ndl = max(0.0, dot(worldNormal, uSunDir));
    float hemi = 0.5 + 0.5 * worldNormal.y;
    vec3 ambient = mix(vec3(0.30, 0.25, 0.30), vec3(0.58, 0.50, 0.44), hemi);
    vLight = ambient + vec3(0.95, 0.78, 0.58) * ndl * 0.72;

    vFogDepth = -mvPos.z;
  }
`;

const PSX_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uAffineMix;
  uniform float uAlphaCutoff;

  varying vec2 vUvPersp;
  varying vec2 vUvAffineW;
  varying float vClipW;
  varying vec3 vLight;
  varying float vFogDepth;

  void main() {
    vec2 affineUv = vUvAffineW / max(0.25, vClipW);
    // Blend toward perspective only right against the near clip plane to prevent near-plane wrap tearing
    float nearGuard = smoothstep(1.2, 4.5, vClipW) * uAffineMix;
    vec2 finalUv = mix(vUvPersp, affineUv, nearGuard);

    vec4 texel = vec4(1.0);
    if (uHasMap > 0.5) {
      texel = texture2D(uMap, finalUv);
      if (texel.a < uAlphaCutoff) discard;
    }

    vec3 lit = texel.rgb * uColor * vLight + uEmissive;
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    vec3 col = mix(lit, uFogColor, fogFactor);

    gl_FragColor = vec4(col, texel.a);
  }
`;

const SUN_DIR = new THREE.Vector3(0.52, 0.74, -0.42).normalize();

export function createPsxMaterial({
  map = null,
  color = 0xffffff,
  emissive = 0x000000,
  affine = 0.85,
  snapScale = 1.0,
  side = THREE.FrontSide,
  alphaCutoff = 0.0,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uHasMap: { value: map ? 1.0 : 0.0 },
      uColor: { value: new THREE.Color(color) },
      uEmissive: { value: new THREE.Color(emissive) },
      uFogColor: { value: FOG_COLOR.clone() },
      uFogNear: { value: 65.0 },
      uFogFar: { value: 235.0 },
      uSnapRes: { value: new THREE.Vector2(150 * snapScale, 86 * snapScale) },
      uAffineMix: { value: affine },
      uSunDir: { value: SUN_DIR },
      uAlphaCutoff: { value: alphaCutoff },
    },
    vertexShader: PSX_VERT,
    fragmentShader: PSX_FRAG,
    side,
  });
}

// Post-processing pass: 320x180 nearest-neighbor + 4x4 Bayer ordered dithering + 15-bit RGB555 color quantization
export function createPsxPostPass() {
  const target = new THREE.WebGLRenderTarget(PSX_WIDTH, PSX_HEIGHT, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });

  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const postMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: target.texture },
      uResolution: { value: new THREE.Vector2(PSX_WIDTH, PSX_HEIGHT) },
      uFlash: { value: 0.0 },
      uNitroWarp: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uFlash;
      uniform float uNitroWarp;
      varying vec2 vUv;

      float bayer4x4(vec2 pos) {
        int x = int(mod(pos.x, 4.0));
        int y = int(mod(pos.y, 4.0));
        int idx = y * 4 + x;
        if (idx == 0) return 0.0 / 16.0;
        if (idx == 1) return 8.0 / 16.0;
        if (idx == 2) return 2.0 / 16.0;
        if (idx == 3) return 10.0 / 16.0;
        if (idx == 4) return 12.0 / 16.0;
        if (idx == 5) return 4.0 / 16.0;
        if (idx == 6) return 14.0 / 16.0;
        if (idx == 7) return 6.0 / 16.0;
        if (idx == 8) return 3.0 / 16.0;
        if (idx == 9) return 11.0 / 16.0;
        if (idx == 10) return 1.0 / 16.0;
        if (idx == 11) return 9.0 / 16.0;
        if (idx == 12) return 15.0 / 16.0;
        if (idx == 13) return 7.0 / 16.0;
        if (idx == 14) return 13.0 / 16.0;
        return 5.0 / 16.0;
      }

      void main() {
        vec2 uv = vUv;
        if (uNitroWarp > 0.01) {
          vec2 centered = uv - 0.5;
          float r2 = dot(centered, centered);
          uv -= centered * r2 * (0.12 * uNitroWarp);
        }

        vec3 col = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
        col += vec3(1.0, 0.86, 0.55) * uFlash;

        vec2 pix = floor(vUv * uResolution);
        float dither = (bayer4x4(pix) - 0.5) / 28.0;
        // 5-bit per channel PS1 framebuffer quantization (32 levels)
        col = floor(clamp(col + dither, 0.0, 1.0) * 31.0 + 0.5) / 31.0;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
  postScene.add(quad);

  return { target, postScene, postCamera, postMaterial };
}

function makeDataTex(w, h, drawFn) {
  const data = new Uint8Array(w * h * 4);
  const setPx = (x, y, r, g, b, a = 255) => {
    const ix = ((x % w) + w) % w;
    const iy = ((y % h) + h) % h;
    const o = (iy * w + ix) * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  };
  drawFn(setPx, w, h);
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function hash2d(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

export function buildPsxTextures() {
  const road = makeDataTex(64, 64, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const grain = (hash2d(x, y) - 0.5) * 18;
        // Dark worn tire grooves in both lanes
        const laneDist = Math.min(Math.abs(x - 18), Math.abs(x - 46));
        const wear = laneDist < 7 ? -8 : 0;
        let r = 56 + grain + wear;
        let g = 55 + grain + wear;
        let b = 60 + grain + wear;

        // Solid crisp white shoulder lines
        if (x === 2 || x === 3 || x === 60 || x === 61) {
          r = 216;
          g = 208;
          b = 192;
        }
        // Dashed warm amber center line
        if ((x === 31 || x === 32) && y % 32 < 18) {
          r = 235;
          g = 172;
          b = 42;
        }
        setPx(x, y, r, g, b);
      }
    }
  });

  const curb = makeDataTex(16, 32, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      const redBand = y < 16;
      for (let x = 0; x < w; x++) {
        const n = (hash2d(x, y) - 0.5) * 20;
        if (redBand) {
          setPx(x, y, 205 + n, 44 + n * 0.4, 38 + n * 0.4);
        } else {
          setPx(x, y, 232 + n, 224 + n, 206 + n);
        }
      }
    }
  });

  const guardrail = makeDataTex(32, 16, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wave = Math.sin((y / h) * Math.PI * 3) * 26;
        const post = x < 3 ? -32 : 0;
        const n = (hash2d(x, y) - 0.5) * 14;
        const v = Math.max(40, Math.min(220, 138 + wave + post + n));
        setPx(x, y, v, v - 2, v + 4);
      }
    }
  });

  const terrain = makeDataTex(64, 64, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = hash2d(x, y);
        if (n > 0.68) {
          setPx(x, y, 76, 84, 48);
        } else if (n > 0.32) {
          setPx(x, y, 62, 70, 42);
        } else {
          setPx(x, y, 88, 72, 46);
        }
      }
    }
  });

  const checkered = makeDataTex(64, 16, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = ((x >> 3) + (y >> 3)) & 1;
        if (cell) {
          setPx(x, y, 240, 234, 218);
        } else {
          setPx(x, y, 22, 22, 26);
        }
      }
    }
  });

  const chevronLeft = makeDataTex(32, 16, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dy = Math.abs(y - 8);
        const stripe = ((x + dy) >> 3) & 1;
        if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
          setPx(x, y, 30, 30, 34);
        } else if (stripe) {
          setPx(x, y, 245, 176, 28);
        } else {
          setPx(x, y, 20, 20, 24);
        }
      }
    }
  });

  const chevronRight = makeDataTex(32, 16, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dy = Math.abs(y - 8);
        const stripe = ((w - x + dy) >> 3) & 1;
        if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
          setPx(x, y, 30, 30, 34);
        } else if (stripe) {
          setPx(x, y, 245, 176, 28);
        } else {
          setPx(x, y, 20, 20, 24);
        }
      }
    }
  });

  const treeFoliage = makeDataTex(32, 32, (setPx, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = hash2d(x, y);
        const shade = n > 0.55 ? 14 : -10;
        setPx(x, y, 42 + shade, 66 + shade, 44 + shade);
      }
    }
  });

  return {
    road,
    curb,
    guardrail,
    terrain,
    checkered,
    chevronLeft,
    chevronRight,
    treeFoliage,
  };
}
