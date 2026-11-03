import * as THREE from 'three';

function makePixelLayer(width, height, geoW) {
  const geoH = geoW * height / width;
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

export function createCabin3DRig(rearMirrorTexture, initialMode = 'classic_25d') {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.08, 12.0);
  camera.position.set(0, 0, 0);

  const raycaster = new THREE.Raycaster();
  const mathPlane = new THREE.Plane();
  const worldHit = new THREE.Vector3();
  let eyeX = 0;
  const pillars = [];

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
    pillars.push(frontSeal, rearSeal);
  }

  // 2. Exterior Hood & Protruding Engine Intake Plane (lowered so windshield stays wide open!)
  const hood = makePixelLayer(360, 110, 3.05);
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

  // 4. Left, Right & Rear Cabin Bulkhead Planes (fully encloses 360 degrees!)
  const leftDoor = makePixelLayer(384, 256, 2.56);
  leftDoor.mesh.position.set(-1.41, 0, -0.1);
  leftDoor.mesh.rotation.y = Math.PI * 0.5;
  leftDoor.mesh.renderOrder = 2;
  scene.add(leftDoor.mesh);

  const rightDoor = makePixelLayer(384, 256, 2.56);
  rightDoor.mesh.position.set(1.41, 0, -0.1);
  rightDoor.mesh.rotation.y = -Math.PI * 0.5;
  rightDoor.mesh.renderOrder = 2;
  scene.add(rightDoor.mesh);

  const rearWall = makePixelLayer(384, 256, 2.88);
  rearWall.mesh.position.set(0, 0, 1.16);
  rearWall.mesh.rotation.y = Math.PI;
  rearWall.mesh.renderOrder = 2;
  scene.add(rearWall.mesh);

  // 5. Forward Windshield, A-Pillars, Compact Overhead Trunk Switch, Rearview Bezel & Sun Visor
  const windshield = makePixelLayer(480, 270, 2.88);
  windshield.mesh.position.set(0, 0, -1.35);
  windshield.mesh.renderOrder = 3;
  scene.add(windshield.mesh);

  // Lower the restored square-texel panels together to preserve the road view.
  const dash = makePixelLayer(480, 140, 2.0);
  dash.mesh.position.set(0, -0.405, -1.16);
  dash.mesh.renderOrder = 5;
  scene.add(dash.mesh);

  const wheelPull = makePixelLayer(480, 140, 2.14);
  wheelPull.mesh.position.set(0, -0.28, -1.0);
  wheelPull.mesh.renderOrder = 6;
  scene.add(wheelPull.mesh);

  const layers = { hood, leftDoor, rightDoor, rearWall, windshield, dash, wheelPull };

  // Panel UVs remain in the shared painter's coordinates, including the angled console.
  dash.mesh.geometry.dispose();
  dash.mesh.geometry = new THREE.PlaneGeometry(dash.geoW, dash.geoH, 3, 1);
  const dashPositions = dash.mesh.geometry.attributes.position;
  const dashUVs = dash.mesh.geometry.attributes.uv;
  const dashCuts = [0, 184, 310, 480];

  function attachMirror(layer, x, y, w, h) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(
      w / layer.width * layer.geoW, h / layer.height * layer.geoH), mirrorMat);
    mesh.position.set((x + w / 2) / layer.width * layer.geoW - layer.geoW / 2,
      layer.geoH / 2 - (y + h / 2) / layer.height * layer.geoH, -0.002);
    mesh.renderOrder = layer.mesh.renderOrder - 1;
    layer.mesh.add(mesh);
  }
  attachMirror(windshield, 150, 17, 100, 24);
  attachMirror(leftDoor, 307, 139, 48, 28);

  function setMode(nextMode) {
    const coupe = nextMode === 'coupe_3d';
    eyeX = coupe ? -0.34 : 0;
    dash.mesh.position.y = coupe ? -0.40 : -0.405;
    windshield.mesh.rotation.x = coupe ? THREE.MathUtils.degToRad(32) : 0;
    for (const [door, side] of [[leftDoor, -1], [rightDoor, 1]]) {
      door.mesh.rotation.set(0, -side * Math.PI / 2, 0);
      door.mesh.rotateX(coupe ? THREE.MathUtils.degToRad(15) : 0);
    }
    roofMesh.position.y = coupe ? 0.70 : 0.8;
    rearWall.mesh.rotation.x = coupe ? -THREE.MathUtils.degToRad(12) : 0;
    for (const pillar of pillars) {
      pillar.rotation.x = coupe ? THREE.MathUtils.degToRad(32) : 0;
    }
    const yaw = coupe ? -THREE.MathUtils.degToRad(14) : 0;
    const scale = dash.geoW / dash.width;
    for (let i = 0; i < dashPositions.count; i++) {
      const px = dashCuts[i % 4];
      const consoleX = Math.min(Math.max(px - 184, 0), 126) * scale;
      const x = (Math.min(px, 184) - 240) * scale + consoleX * Math.cos(yaw)
        + Math.max(px - 310, 0) * scale;
      dashPositions.setX(i, x);
      dashPositions.setZ(i, -consoleX * Math.sin(yaw));
      dashUVs.setX(i, px / 480);
    }
    dashPositions.needsUpdate = true;
    dashUVs.needsUpdate = true;
    dash.mesh.geometry.computeVertexNormals();
    dash.mesh.geometry.computeBoundingSphere();
    for (const layer of Object.values(layers)) layer.dragFace = null;
    scene.updateMatrixWorld(true);
    updateCamera(0, 0, 0, 0, 0, 0);
  }

  function updateCamera(viewYaw, panX, panY, smoothRoll, shakeX, shakeY) {
    camera.position.set(eyeX + shakeX * 0.0022, -shakeY * 0.0022, 0);
    const headYawRad = viewYaw * 1.38 + panX * 0.11;
    const lookVec = new THREE.Vector3(
      Math.sin(headYawRad),
      -panY * 0.055,
      -Math.cos(headYawRad)
    ).normalize();

    camera.up.set(0, 1, 0);
    camera.lookAt(camera.position.clone().add(lookVec));
    camera.rotateZ(smoothRoll);
    camera.updateMatrixWorld();
  }

  function projectToLayer(layerName, ndcX, ndcY, captured = false) {
    const layer = layers[layerName];
    if (!layer) return null;
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const intersections = raycaster.intersectObjects(Object.values(layers).map(l => l.mesh), false);
    const target = intersections.find(hit => hit.object === layer.mesh);
    if (target) {
      if (!captured) {
        const shellHit = raycaster.intersectObjects([roofMesh, floorMesh, ...pillars], false)[0];
        if (shellHit && shellHit.distance < target.distance) return null;
        for (const hit of intersections) {
          if (hit === target) break;
          const blocker = Object.values(layers).find(l => l.mesh === hit.object);
          const alpha = blocker.ctx.getImageData(
            Math.min(blocker.width - 1, Math.floor(hit.uv.x * blocker.width)),
            Math.min(blocker.height - 1, Math.floor((1 - hit.uv.y) * blocker.height)), 1, 1).data[3];
          if (alpha > 127) return null;
        }
      }
      layer.dragFace = target.face;
      return { x: target.uv.x * layer.width, y: (1 - target.uv.y) * layer.height, inBounds: true };
    }
    if (!captured || !layer.dragFace) return null;

    // Continue a captured drag on its actual panel plane after leaving the mesh.
    const { position, uv } = layer.mesh.geometry.attributes;
    const indices = [layer.dragFace.a, layer.dragFace.b, layer.dragFace.c];
    const vertices = indices.map(i => new THREE.Vector3().fromBufferAttribute(position, i)
      .applyMatrix4(layer.mesh.matrixWorld));
    mathPlane.setFromCoplanarPoints(...vertices);
    if (!raycaster.ray.intersectPlane(mathPlane, worldHit)) return null;
    const weights = THREE.Triangle.getBarycoord(worldHit, ...vertices, new THREE.Vector3());
    const u = indices.reduce((sum, i, n) => sum + uv.getX(i) * weights.getComponent(n), 0);
    const v = indices.reduce((sum, i, n) => sum + uv.getY(i) * weights.getComponent(n), 0);
    return {
      x: u * layer.width,
      y: (1 - v) * layer.height,
      inBounds: u >= -0.04 && u <= 1.04 && v >= -0.04 && v <= 1.04,
    };
  }

  setMode(initialMode);

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
    setMode,
    updateCamera,
    projectToLayer,
    markAllUpdated,
  };
}
