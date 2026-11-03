import * as THREE from 'three';
import { CARS } from '../src/catalog.js';
import { buildCircuit } from '../src/track.js';
import { buildVehicle3D } from '../src/carMesh.js';
import { BADLANDS_FOG, buildPsxTextures, createPsxPostPass, setGlobalPsxFog } from '../src/psx.js';

export function updatePreviewCamera(camera, sample, yaw) {
  camera.position.copy(sample.pos).addScaledVector(sample.right, -3);
  camera.position.y += 1.28;
  const angle = yaw * 1.38;
  const direction = sample.tan.clone().multiplyScalar(Math.cos(angle))
    .addScaledVector(sample.right, Math.sin(angle));
  direction.y -= 0.16;
  camera.up.set(0, 1, 0);
  camera.lookAt(camera.position.clone().add(direction));
  camera.updateMatrixWorld();
}

export function createLiveExterior() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(480, 270, false);
  renderer.setClearColor(BADLANDS_FOG, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.2, 800);
  const track = buildCircuit(scene, buildPsxTextures(), 'badlands');
  const post = createPsxPostPass();
  const traffic = [
    { id: 'muscle', lateral: -7, gap: 0, phase: 0 },
    { id: 'rally', lateral: 1, gap: 1, phase: Math.PI },
    { id: 'truck', lateral: -2, gap: 22, phase: Math.PI / 2 },
  ].map(spec => {
    const mesh = buildVehicle3D(CARS[spec.id]);
    scene.add(mesh);
    return { ...spec, mesh };
  });
  setGlobalPsxFog(BADLANDS_FOG, 95, 360);
  let progress = 0.985;
  let time = 0;

  return {
    canvas,
    render(yaw, dt = 0) {
      time += dt;
      progress = (progress + 28 * dt / track.totalLength) % 1;
      const sample = track.sampleTrack(progress);
      updatePreviewCamera(camera, sample, yaw);
      for (const car of traffic) {
        const gap = car.gap + Math.sin(time * 0.35 + car.phase) * 3;
        const point = track.sampleTrack(progress + gap / track.totalLength);
        car.mesh.position.copy(point.pos).addScaledVector(point.right, car.lateral);
        car.mesh.position.y += 0.03;
        car.mesh.rotation.y = Math.atan2(-point.flatTan.x, -point.flatTan.z);
      }
      renderer.setRenderTarget(post.target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post.postScene, post.postCamera);
      return canvas;
    },
  };
}
