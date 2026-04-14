import * as THREE from 'three';

let renderer, scene, camera, clock;

export function initScene() {
  const canvas = document.getElementById('c');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEFA);
  scene.fog = new THREE.Fog(0x87CEFA, 60, 160);

  // Warm Tuscan sunlight
  const sun = new THREE.DirectionalLight(0xfffbe0, 1.4);
  sun.position.set(30, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xc8d8f0, 0.65);
  scene.add(ambient);

  // Camera (third-person, controlled externally)
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 12, 14);

  clock = new THREE.Clock(false);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return { renderer, scene, camera, clock };
}

export function render() {
  renderer.render(scene, camera);
}

export { scene, camera, clock, renderer };
