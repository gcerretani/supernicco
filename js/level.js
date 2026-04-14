import * as THREE from 'three';
import { JuveFan, BarrelEnemy } from './enemies.js';

// ── AABB helper ────────────────────────────────────────────────────────────
function overlaps(pa, ha, pb, hb) {
  return (
    Math.abs(pa.x - pb.x) < ha.x + hb.x &&
    Math.abs(pa.y - pb.y) < ha.y + hb.y &&
    Math.abs(pa.z - pb.z) < ha.z + hb.z
  );
}

// ── InterBall (bigger: radius 0.65) ───────────────────────────────────────
function makeInterBallMat() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#0066cc';
  [[12,12,40,40],[0,24,64,16],[24,0,16,64]].forEach(([x,y,w,h]) => ctx.fillRect(x,y,w,h));
  return new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) });
}

export class InterBall {
  constructor(scene, x, y, z) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), makeInterBallMat());
    this.mesh.position.set(x, y, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.collected = false;
    this._baseY = y;
    this._time  = Math.random() * Math.PI * 2;
    this.hx = 0.72; this.hy = 0.72; this.hz = 0.72;
  }

  update(dt) {
    if (this.collected) return;
    this._time += dt;
    this.mesh.position.y = this._baseY + Math.sin(this._time * 2) * 0.35;
    this.mesh.rotation.y += dt * 2;
  }

  checkPlayer(player) {
    if (this.collected) return false;
    return overlaps(player.position, { x: player.hx, y: player.hy, z: player.hz },
                    this.mesh.position, { x: this.hx, y: this.hy, z: this.hz });
  }

  collect(scene) { this.collected = true; scene.remove(this.mesh); }
}

// ── InterScarf power-up ────────────────────────────────────────────────────
export class InterScarf {
  constructor(scene, x, y, z) {
    const g = new THREE.Group();
    const mat  = new THREE.MeshLambertMaterial({ color: 0x0066cc });
    const mat2 = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const s  = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), mat);
    g.add(s);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), mat2);
    s2.position.y = -0.2; g.add(s2);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.18),
      new THREE.MeshLambertMaterial({ color: 0xffd700 }));
    star.position.set(0, 0.3, 0); g.add(star);
    this.mesh = g;
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);
    this.collected = false;
    this._baseY = y; this._time = 0;
    this.hx = 0.5; this.hy = 0.5; this.hz = 0.5;
  }

  update(dt) {
    if (this.collected) return;
    this._time += dt;
    this.mesh.position.y = this._baseY + Math.sin(this._time * 1.8) * 0.4 + 0.4;
    this.mesh.rotation.y += dt * 1.5;
  }

  checkPlayer(player) {
    if (this.collected) return false;
    return overlaps(player.position, { x: player.hx, y: player.hy, z: player.hz },
                    this.mesh.position, { x: this.hx, y: this.hy, z: this.hz });
  }

  collect(scene) { this.collected = true; scene.remove(this.mesh); }
}

// ── Hay Bale obstacle (solid, player can't pass through) ──────────────────
function makeHayBale(scene, x, z, getHeightAt) {
  const g = new THREE.Group();
  const hayMat  = new THREE.MeshLambertMaterial({ color: 0xd4a852 });
  const bandMat = new THREE.MeshLambertMaterial({ color: 0x8b6535 });

  // Round bale lying on its side (cylinder along X axis)
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 1.3, 12), hayMat);
  bale.rotation.z = Math.PI / 2;
  bale.position.y = 0.82;
  bale.castShadow = true;
  g.add(bale);

  // Plastic wrap bands
  [-0.38, 0, 0.38].forEach(ox => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.055, 6, 14), bandMat);
    band.rotation.y = Math.PI / 2;
    band.position.set(ox, 0.82, 0);
    g.add(band);
  });

  const groundY = getHeightAt(x, z);
  g.position.set(x, groundY, z);
  scene.add(g);

  return {
    mesh: g,
    x, z,
    groundY,
    topY: groundY + 1.64,
    hw: 0.72,  // half-width X
    hd: 0.72,  // half-depth Z
  };
}

/** Push player out of hay bale if overlapping horizontally. */
export function resolveHayBales(player, hayBales) {
  const playerBottom = player.position.y - player.hy;
  const playerTop    = player.position.y + player.hy;

  for (const bale of hayBales) {
    if (playerBottom > bale.topY || playerTop < bale.groundY) continue; // no vertical overlap

    const dx = player.position.x - bale.x;
    const dz = player.position.z - bale.z;
    const overlapX = (player.hx + bale.hw) - Math.abs(dx);
    const overlapZ = (player.hz + bale.hd) - Math.abs(dz);

    if (overlapX > 0 && overlapZ > 0) {
      if (overlapX < overlapZ) {
        player.position.x += Math.sign(dx) * overlapX;
        player.velocity.x = 0;
      } else {
        player.position.z += Math.sign(dz) * overlapZ;
        player.velocity.z = 0;
      }
    }
  }
}

// ── Road sign ──────────────────────────────────────────────────────────────
function makeRoadSign(scene, x, z, getHeightAt, lines, bgColor = '#2a7a1a') {
  const g = new THREE.Group();
  const groundY = getHeightAt(x, z);

  // Post
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8b6914 })
  );
  post.position.y = 1.6;
  g.add(post);

  // Sign board via canvas texture
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 140;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 140);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 248, 132);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  lines.forEach(({ text, size, y }) => {
    ctx.font = `bold ${size}px Arial`;
    ctx.fillText(text, 128, y);
  });

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.4, 0.1),
    new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })
  );
  board.position.y = 3.6;
  g.add(board);

  g.position.set(x, groundY, z);
  scene.add(g);
}

// ── Medieval tower (goal) ──────────────────────────────────────────────────
function buildTower(scene, x, z, getHeightAt) {
  const groundY = getHeightAt(x, z);
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888880 });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x773322 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x555550 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 14, 8), stoneMat);
  base.position.set(x, groundY + 7, z);
  base.castShadow = true;
  scene.add(base);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.9), stoneMat);
    bat.position.set(x + Math.cos(a) * 2.7, groundY + 14.6, z + Math.sin(a) * 2.7);
    scene.add(bat);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 8), roofMat);
  roof.position.set(x, groundY + 17, z);
  scene.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.5), darkMat);
  door.position.set(x, groundY + 1.25, z + 2.8);
  scene.add(door);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 5),
    new THREE.MeshLambertMaterial({ color: 0x888888 }));
  pole.position.set(x, groundY + 20.5, z);
  scene.add(pole);

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x0066cc, side: THREE.DoubleSide }));
  flag.position.set(x + 0.7, groundY + 21.5, z);
  scene.add(flag);

  return { x, z, groundY, radius: 3.5 };
}

// ── Build entire level ─────────────────────────────────────────────────────
export function buildLevel(scene, getHeightAt) {
  const enemies   = [];
  const balls     = [];
  const hayBales  = [];
  let   scarf     = null;

  // ── Road sign 1: Benvenuto nel Chianti (right side, near start) ────────
  makeRoadSign(scene, 7, -8, getHeightAt, [
    { text: '🍷 BENVENUTO',    size: 26, y: 44 },
    { text: 'NEL CHIANTI',     size: 26, y: 76 },
    { text: '★ Zona Protetta ★', size: 15, y: 110 },
  ], '#2a7a1a');

  // ── Road sign 2: Attenzione Juventini (left side) ─────────────────────
  makeRoadSign(scene, -8, -35, getHeightAt, [
    { text: '⚠ ATTENZIONE!',       size: 22, y: 40 },
    { text: 'ZONA JUVENTINI',       size: 20, y: 70 },
    { text: 'Procedere con cautela', size: 14, y: 104 },
  ], '#bb7700');

  // ── Hay bales as obstacles (solid, player must go around) ─────────────
  const baleDefs = [
    // [x, z]  — placed alongside or across the path
    [ 2,  -22],
    [-2,  -40],
    [ 0,  -58],   // centre of path → player must dodge
    [ 3,  -75],
    [-3,  -90],
    [ 0, -108],
    [ 2, -122],
    [-2, -138],
    [ 0, -155],
    [ 3, -170],
  ];
  baleDefs.forEach(([x, z]) => {
    hayBales.push(makeHayBale(scene, x, z, getHeightAt));
  });

  // ── JuveFan enemies ────────────────────────────────────────────────────
  const juveDefs = [
    [ 0, -30,  4],
    [ 0, -55,  4],
    [ 0, -85,  5],
    [ 0,-115,  4],
    [ 0,-145,  5],
    [ 0,-165,  3],
  ];
  juveDefs.forEach(([x, z, r]) => enemies.push(new JuveFan(scene, x, z, r, getHeightAt)));

  // ── Barrel enemies ─────────────────────────────────────────────────────
  [[-1, -45], [1, -80], [-1,-112], [1,-148]].forEach(([x, z]) => {
    enemies.push(new BarrelEnemy(scene, x, z, getHeightAt));
  });

  // ── InterBalls (5 total, elevated so they're easy to see) ─────────────
  [[-1,-20], [2,-52], [-2,-88], [1,-120], [0,-150]].forEach(([x, z]) => {
    const gy = getHeightAt(x, z);
    balls.push(new InterBall(scene, x, gy + 2.4, z));
  });

  // ── InterScarf power-up ────────────────────────────────────────────────
  const scarfH = getHeightAt(0, -142);
  scarf = new InterScarf(scene, 0, scarfH + 2.8, -142);

  // ── Goal tower ─────────────────────────────────────────────────────────
  const goal = buildTower(scene, 0, -188, getHeightAt);

  // ── Decorative walls leading to tower ─────────────────────────────────
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x999988 });
  for (let wz = -175; wz > -188; wz -= 4) {
    [-5, 5].forEach(wx => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 3.5), wallMat);
      wall.position.set(wx, getHeightAt(wx, wz) + 1.25, wz);
      scene.add(wall);
    });
  }

  return { enemies, balls, hayBales, scarf, goal };
}
