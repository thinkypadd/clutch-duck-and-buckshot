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
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.08, 12.0);
  camera.position.set(0, 0, 0);

  const raycaster = new THREE.Raycaster();
  const mathPlane = new THREE.Plane();
  const worldHit = new THREE.Vector3();
  const localHit = new THREE.Vector3();
  const normalVec = new THREE.Vector3();

  // 1. Hermetically Sealed Roof, Floor & Corner Pillar Trim (extends behind camera to z=+1.35)
  const roofMat = new THREE.MeshBasicMaterial({ color: 0x161920, side: THREE.DoubleSide });
  const roofMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.04, 2.85), roofMat);
  roofMesh.position.set(0, 0.8, -0.1);
  roofMesh.rotation.x = Math.PI * 0.5;
  roofMesh.renderOrder = 1;
  scene.add(roofMesh);

  const floorMat = new THREE.MeshBasicMaterial({ color: 0x0d0f14, side: THREE.DoubleSide });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.04, 2.85), floorMat);
  floorMesh.position.set(0, -0.8, -0.1);
  floorMesh.rotation.x = -Math.PI * 0.5;
  floorMesh.renderOrder = 1;
  scene.add(floorMesh);

  const pillarSealMat = new THREE.MeshBasicMaterial({ color: 0x1a1e26, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    // Seal front A-pillar corners & rear C-pillar corners
    const frontSeal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.66, 0.12), pillarSealMat);
    frontSeal.position.set(sx * 1.41, 0, -1.36);
    frontSeal.renderOrder = 2;
    const rearSeal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.66, 0.14), pillarSealMat);
    rearSeal.position.set(sx * 1.41, 0, 1.16);
    rearSeal.renderOrder = 2;
    scene.add(frontSeal, rearSeal);
  }

  // 2. Exterior Hood & Protruding Engine Intake Plane (lowered so windshield stays wide open!)
  const hood = makePixelLayer(360, 110, 3.05, 0.78);
  hood.mesh.position.set(0, -0.64, -1.88);
  hood.mesh.rotation.x = -0.24;
  hood.mesh.renderOrder = 1;
  scene.add(hood.mesh);

  // 3. Live 3D PSX Mirrors (rendered at order 1.5 just behind door/windshield bezel cutouts)
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

  // Matches windshield MIRROR_CUTOUT (x=150..250, y=17..41 on 480x270 -> geo 2.88x1.62 at z=-1.35)
  const mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.16), mirrorMat);
  mirrorMesh.position.set(-0.24, 0.636, -1.355);
  mirrorMesh.renderOrder = 2;
  scene.add(mirrorMesh);

  // Matches leftDoor exterior side-mirror cutout (x=307..355, y=139..167 on 384x256)
  const sideMirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.195), mirrorMat);
  sideMirrorMesh.position.set(-1.425, -0.158, -1.027);
  sideMirrorMesh.rotation.y = Math.PI * 0.5;
  sideMirrorMesh.renderOrder = 1;
  scene.add(sideMirrorMesh);

  // 4. Left, Right & Rear Cabin Bulkhead Planes (fully encloses 360 degrees!)
  const leftDoor = makePixelLayer(384, 256, 2.56, 1.62);
  leftDoor.mesh.position.set(-1.41, 0, -0.1);
  leftDoor.mesh.rotation.y = Math.PI * 0.5;
  leftDoor.mesh.renderOrder = 2;
  scene.add(leftDoor.mesh);

  const rightDoor = makePixelLayer(384, 256, 2.56, 1.62);
  rightDoor.mesh.position.set(1.41, 0, -0.1);
  rightDoor.mesh.rotation.y = -Math.PI * 0.5;
  rightDoor.mesh.renderOrder = 2;
  scene.add(rightDoor.mesh);

  const rearWall = makePixelLayer(384, 256, 2.88, 1.62);
  rearWall.mesh.position.set(0, 0, 1.16);
  rearWall.mesh.rotation.y = Math.PI;
  rearWall.mesh.renderOrder = 2;
  scene.add(rearWall.mesh);

  // 5. Forward Windshield, A-Pillars, Compact Overhead Trunk Switch, Rearview Bezel & Sun Visor
  const windshield = makePixelLayer(480, 270, 2.88, 1.62);
  windshield.mesh.position.set(0, 0, -1.35);
  windshield.mesh.renderOrder = 3;
  scene.add(windshield.mesh);

  // 6. Compact Lower Dashboard (~30% bottom height so ~68% of windshield stays clear!)
  const dash = makePixelLayer(480, 140, 2.48, 0.48);
  dash.mesh.position.set(0, -0.47, -1.16);
  dash.mesh.rotation.x = -0.08;
  dash.mesh.renderOrder = 5;
  scene.add(dash.mesh);

  // 7. Foreground Steering Wheel & Short-Throw Nitro Pull-Handle (tucked low in bottom ~30%)
  const wheelPull = makePixelLayer(480, 140, 2.14, 0.43);
  wheelPull.mesh.position.set(0, -0.4, -1.0);
  wheelPull.mesh.rotation.x = -0.05;
  wheelPull.mesh.renderOrder = 6;
  scene.add(wheelPull.mesh);

  const layers = { hood, leftDoor, rightDoor, rearWall, windshield, dash, wheelPull };

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
    rearWall.tex.needsUpdate = true;
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
