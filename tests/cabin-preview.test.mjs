import assert from 'node:assert/strict';
import { cabinLayout, quadTransform, FRONT_STATIONS } from '../src/cabinPerspective.js';
import { getHGateLayout } from '../src/cockpit.js';
import * as THREE from 'three';
import { updatePreviewCamera } from '../preview/exterior.js';

for (const yaw of [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]) {
  const layout = cabinLayout(yaw);
  for (const surface of ['front', 'side', 'cabin']) {
    const quad = layout[surface];
    const transform = quadTransform(quad);
    for (const [index, point] of [[0, [0, 0]], [1, [1, 0]], [2, [1, 1]], [3, [0, 1]]]) {
      const projected = transform.project(...point);
      assert.ok(projected.every((value, axis) => Math.abs(value - quad[index][axis]) < 1e-6));
    }
    for (let u = 0.1; u < 1; u += 0.2) {
      for (let v = 0.1; v < 1; v += 0.2) {
        const recovered = transform.unproject(...transform.project(u, v));
        assert.ok(Math.abs(recovered[0] - u) < 1e-6 && Math.abs(recovered[1] - v) < 1e-6,
          `${surface} has an invertible perspective mapping at yaw ${yaw}`);
      }
    }
  }

  const cabin = quadTransform(layout.cabin);
  for (const [x, y] of [[114, 218], [250, 220], [430, 160], [380, 40]]) {
    const projected = cabin.project(x / 480, y / 270);
    const expected = layout.projectFront(x, y);
    assert.ok(projected.every((value, axis) => Math.abs(value - expected[axis]) < 1e-6),
      'The wheel, shifter, trunk switch and visor use the same fixed-cabin projection');
  }
  if (yaw !== 0) continue;

  for (let gears = 3; gears <= 8; gears++) {
    for (const pocket of getHGateLayout(gears).pockets) {
      for (const [dx, dy] of [[-8, -20], [8, 15]]) {
        const [x, y] = layout.projectFront(pocket.x + dx, pocket.y + dy + 136);
        assert.ok(x >= 0 && x < 480 && y >= 0 && y < 270,
          `${gears}-speed gear ${pocket.gear}, including knob and label, is accessible facing forward`);
      }
    }
  }
  for (const [x, y] of [[208, 20], [300, 45], [184, 34], [203, 102]]) {
    const p = layout.projectFront(x, y + 136);
    assert.ok(p[0] > 0 && p[0] < 480 && p[1] > 0 && p[1] < 270,
      'Vehicle switches and drift lever are accessible facing forward');
  }

  for (const [name, [x, y, w, h]] of Object.entries(FRONT_STATIONS)) {
    if (name === 'wheelPull') continue;
    assert.ok(x >= 0 && x + w <= 480 && y >= 0 && y + h <= 270,
      `${name} fits the forward view at its native dimensions`);
  }
}

const forward = quadTransform(cabinLayout(0).cabin);
for (const [x, y] of [[0, 0], [66, 218], [162, 218], [114, 170], [114, 266], [480, 270]]) {
  const p = forward.project(x / 480, y / 270);
  assert.ok(Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1] - y) < 1e-6,
    'Forward pixels, including the complete circular wheel, are drawn at native 1:1 proportions');
}
assert.ok(cabinLayout(-1).projectFront(250, 220)[0] > 480, 'Looking left leaves the shifter offscreen to the right');
assert.ok(cabinLayout(1).projectFront(250, 220)[0] < 0, 'Looking right leaves the shifter offscreen to the left');
assert.ok(FRONT_STATIONS.visor[0] > 264 && FRONT_STATIONS.visor[2] === 192,
  'The visor moves right without being squeezed');
assert.ok(FRONT_STATIONS.trunk[1] >= 156 && FRONT_STATIONS.trunk[2] === 82 && FRONT_STATIONS.trunk[3] === 29,
  'The trunk switch moves to the dashboard without changing size');
assert.throws(() => quadTransform([[0, 0], [0, 0], [0, 0], [0, 0]]), /no area/);
const trapezoid = quadTransform([[0, 0], [100, 0], [80, 100], [20, 100]]);
const middle = trapezoid.project(0.5, 0.5);
assert.ok(Math.abs(middle[0] - 50) < 1e-6 && Math.abs(middle[1] - 62.5) < 1e-6,
  'Perspective foreshortening uses a projective mapping, rather than a flat skew');
console.log('CABIN PREVIEW PERSPECTIVE TESTS PASSED');

{
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.2, 800);
  for (let heading = 0; heading < Math.PI * 2; heading += Math.PI / 4) {
    const tangent = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0));
    const sample = { pos: new THREE.Vector3(120, 4, -80), tan: tangent, right };
    for (const yaw of [-1, -0.5, 0, 0.5, 1]) {
      updatePreviewCamera(camera, sample, yaw);
      const direction = camera.getWorldDirection(new THREE.Vector3());
      const horizontal = direction.clone().setY(0).normalize();
      const expected = tangent.clone().multiplyScalar(Math.cos(yaw * 1.38))
        .addScaledVector(right, Math.sin(yaw * 1.38));
      assert.ok(horizontal.distanceTo(expected) < 1e-6, 'Live exterior turns the camera through the world');
      assert.ok(direction.y < 0, 'The road view looks slightly down to keep road visible above the dashboard');
      assert.ok(camera.position.distanceTo(sample.pos.clone().addScaledVector(right, -3)
        .add(new THREE.Vector3(0, 1.28, 0))) < 1e-6, 'Head turns retain the driver seat position');
      assert.deepEqual(camera.up.toArray(), [0, 1, 0], 'The world stays upright during head turns');
    }
  }
}
