import * as THREE from 'three';

function makePixelLayer(width, height, geoW, geoH) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(geoW, geoH), mat);
  return { canvas, ctx, tex, mesh, width, height, geoW, geoH };
}

export function createCabin3DRig(rearMirrorTexture) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.08, 12.0);
  camera.position.set(0, 0, 0);

  const raycaster = new THREE.Raycaster();
  const mathPlane = new THREE.Plane();
  const worldHit = new THREE.Vector3();
  const localHit = new THREE.Vector3();
  const normalVec = new THREE.Vector3();

  // 1. Sealed Roof & Floor Liner Planes
  const roofMat = new THREE.MeshBasicMaterial({ color: 0x161920, side: THREE.DoubleSide });
  const roofMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.92, 2.45), roofMat);
  roofMesh.position.set(0, 0.79, -0.3);
  roofMesh.rotation.x = Math.PI * 0.5;
  scene.add(roofMesh);

  const floorMat = new THREE.MeshBasicMaterial({ color: 0x0d0f14, side: THREE.DoubleSide });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.92, 2.45), floorMat);
  floorMesh.position.set(0, -0.78, -0.3);
  floorMesh.rotation.x = -Math.PI * 0.5;
  scene.add(floorMesh);

  // 2. Exterior Hood & Protruding Engine Intake Plane (furthest forward, sloped horizontally)
  const hood = makePixelLayer(360, 110, 3.1, 0.95);
  hood.mesh.position.set(0, -0.31, -1.88);
  hood.mesh.rotation.x = -0.32;
  hood.mesh.renderOrder = 1;
  scene.add(hood.mesh);

  // 3. Left & Right 3D Perspective Side Doors (angled along +/-X so head rotation faces them!)
  const leftDoor = makePixelLayer(384, 256, 2.24, 1.54);
  leftDoor.mesh.position.set(-1.38, -0.01, -0.28);
  leftDoor.mesh.rotation.y = Math.PI * 0.485;
  leftDoor.mesh.renderOrder = 2;
  scene.add(leftDoor.mesh);

  const rightDoor = makePixelLayer(384, 256, 2.24, 1.54);
  rightDoor.mesh.position.set(1.38, -0.01, -0.28);
  rightDoor.mesh.rotation.y = -Math.PI * 0.485;
  rightDoor.mesh.renderOrder = 2;
  scene.add(rightDoor.mesh);

  // 4. Forward Windshield, A-Pillars, Overhead Trunk Switch, Rearview Bezel & Sun Visor
  const windshield = makePixelLayer(480, 270, 2.84, 1.6);
  windshield.mesh.position.set(0, 0, -1.35);
  windshield.mesh.renderOrder = 3;
  scene.add(windshield.mesh);

  // 4B. Live 3D PSX Rearview Mirror Quad (aligned inside windshield bezel x=146..254, y=24..58)
  const mirrorMat = new THREE.ShaderMaterial({
    uniforms: {
      tRear: { value: rearMirrorTexture },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tRear;
      varying vec2 vUv;
      void main() {
        vec2 mUv = vec2(1.0 - vUv.x, vUv.y);
        vec3 col = texture2D(tRear, clamp(mUv, 0.01, 0.99)).rgb;
        col = floor(col * 28.0 + 0.5) / 28.0;
        col *= vec3(0.96, 1.02, 0.98);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthTest: true,
    depthWrite: false,
  });
  const mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.639, 0.2015), mirrorMat);
  mirrorMesh.position.set(-0.2367, 0.557, -1.345);
  mirrorMesh.renderOrder = 4;
  scene.add(mirrorMesh);

  // Also mount a small live Rear-Left Driver Exterior Side Mirror glass on leftDoor!
  const sideMirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), mirrorMat);
  sideMirrorMesh.position.set(-1.31, -0.05, -1.16);
  sideMirrorMesh.rotation.y = Math.PI * 0.36;
  sideMirrorMesh.renderOrder = 4;
  scene.add(sideMirrorMesh);

  // 5. Sloped Dashboard, Binnacle, Dynamic 3..8 H-Shifter, Gimmick & Passenger N2O Bottle
  const dash = makePixelLayer(480, 140, 2.5, 0.73);
  dash.mesh.position.set(0, -0.345, -1.18);
  dash.mesh.rotation.x = -0.12;
  dash.mesh.renderOrder = 5;
  scene.add(dash.mesh);

  // 6. Foreground Steering Wheel & Short-Throw Nitro Pull-Handle (closest depth layer!)
  const wheelPull = makePixelLayer(480, 140, 2.14, 0.625);
  wheelPull.mesh.position.set(0, -0.32, -1.0);
  wheelPull.mesh.rotation.x = -0.08;
  wheelPull.mesh.renderOrder = 6;
  scene.add(wheelPull.mesh);

  const layers = { hood, leftDoor, rightDoor, windshield, dash, wheelPull };

  function updateCamera(viewYaw, panX, panY, smoothRoll, shakeX, shakeY) {
    camera.position.set(shakeX * 0.0022, -shakeY * 0.0022, 0);
    const headYawRad = viewYaw * 1.38 + panX * 0.11;
    const lookVec = new THREE.Vector3(
      Math.sin(headYawRad),
      -panY * 0.055,
      -Math.cos(headYawRad)
    ).normalize();

    camera.up.set(0, 1, 0);
    camera.lookAt(camera.position.clone().add(lookVec));
    camera.rotateZ(smoothRoll * 0.45);
    camera.updateMatrixWorld();
  }

  function projectToLayer(layerName, ndcX, ndcY) {
    const layer = layers[layerName];
    if (!layer) return null;
    layer.mesh.updateMatrixWorld();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    normalVec.set(0, 0, 1).transformDirection(layer.mesh.matrixWorld);
    mathPlane.setFromNormalAndCoplanarPoint(normalVec, layer.mesh.position);

    const hit = raycaster.ray.intersectPlane(mathPlane, worldHit);
    if (!hit) return null;

    localHit.copy(worldHit);
    layer.mesh.worldToLocal(localHit);

    const u = localHit.x / layer.geoW + 0.5;
    const v = localHit.y / layer.geoH + 0.5;
    return {
      x: u * layer.width,
      y: (1 - v) * layer.height,
      inBounds: u >= -0.04 && u <= 1.04 && v >= -0.04 && v <= 1.04,
    };
  }

  function markAllUpdated() {
    hood.tex.needsUpdate = true;
    leftDoor.tex.needsUpdate = true;
    rightDoor.tex.needsUpdate = true;
    windshield.tex.needsUpdate = true;
    dash.tex.needsUpdate = true;
    wheelPull.tex.needsUpdate = true;
  }

  return {
    scene,
    camera,
    layers,
    updateCamera,
    projectToLayer,
    markAllUpdated,
  };
}
