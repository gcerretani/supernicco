import * as THREE from 'three';

// ── Height function (used by physics AND mesh generation) ──────────────────
// Gentle Chianti rolling hills. Max amplitude ~5 units.
export function getHeightAt(wx, wz) {
  const x = wx * 0.04;
  const z = wz * 0.04;
  let h = Math.sin(x * 1.6 + 0.5) * 2.0;
  h += Math.sin(z * 1.3 + 1.1) * 2.8;
  h += Math.cos(x * 2.4 + z * 1.8) * 1.0;
  h += Math.sin(x * 0.7 + z * 0.9 + 0.6) * 0.8;
  return h;
}

// ── Terrain mesh ──────────────────────────────────────────────────────────
export function createTerrain(scene) {
  const W = 120, D = 280;
  const segW = 48, segD = 112;
  const geo = new THREE.PlaneGeometry(W, D, segW, segD);
  geo.rotateX(-Math.PI / 2);

  // Displace vertices
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i) - 100; // center of terrain is at z=-100
    pos.setY(i, getHeightAt(wx, wz));
  }
  geo.computeVertexNormals();

  // Vertex colours: green → golden based on height
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i);
    const t = (h + 5) / 10; // normalise 0-1
    const r = 0.35 + t * 0.45;
    const g = 0.55 + t * 0.15;
    const b = 0.18 + t * 0.05;
    colors.push(r, g, b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, -100); // centre the terrain over the level
  mesh.receiveShadow = true;
  scene.add(mesh);

  return mesh;
}

// ── Chianti decorations ────────────────────────────────────────────────────
function makeCypress() {
  const g = new THREE.Group();
  // Trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 1.8, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b4226 })
  );
  trunk.position.y = 0.9;
  g.add(trunk);
  // Three stacked cones
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
  [[2.0, 0, 2.4], [1.4, 1.6, 1.8], [0.9, 2.8, 1.3]].forEach(([r, y, h]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), leafMat);
    cone.position.y = y + 1.8;
    g.add(cone);
  });
  return g;
}

function makeVineRow(len) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a7d28 });
  for (let i = 0; i < len; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), new THREE.MeshLambertMaterial({ color: 0x7a5c3a }));
    post.position.set(i * 1.5, 0.6, 0);
    g.add(post);
    const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.4), mat);
    leaves.position.set(i * 1.5, 1.3, 0);
    g.add(leaves);
  }
  return g;
}

export function createDecorations(scene) {
  // Cypress trees scattered alongside the path
  const cypressPositions = [
    [8, -15], [-9, -25], [11, -45], [-8, -60],
    [10, -80], [-11, -95], [9, -115], [-10, -130],
    [12, -150], [-9, -165], [8, -175], [-7, -185],
    [14, -35], [-14, -55], [13, -105], [-13, -140],
  ];
  cypressPositions.forEach(([x, z]) => {
    const c = makeCypress();
    const h = getHeightAt(x, z);
    c.position.set(x, h, z);
    c.castShadow = true;
    scene.add(c);
  });

  // Vine rows decorative — placed outside the playable corridor (x=±8)
  for (let z = -62; z > -100; z -= 10) {
    const row = makeVineRow(5);
    const h = getHeightAt(-8, z);
    row.position.set(-8, h, z);
    scene.add(row);

    const row2 = makeVineRow(5);
    const h2 = getHeightAt(8, z);
    row2.position.set(8, h2, z);
    scene.add(row2);
  }
}
