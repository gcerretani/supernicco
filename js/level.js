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

// ── InterBall collectible ──────────────────────────────────────────────────
function makeInterBallMat() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#0066cc';
  // Simple pentagon pattern suggestion
  [[12,12,40,40],[0,24,64,16],[24,0,16,64]].forEach(([x,y,w,h]) => {
    ctx.fillRect(x,y,w,h);
  });
  return new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) });
}

export class InterBall {
  constructor(scene, x, y, z) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), makeInterBallMat());
    this.mesh.position.set(x, y, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.collected = false;
    this._baseY = y;
    this._time  = Math.random() * Math.PI * 2;
    this.hx = 0.4; this.hy = 0.4; this.hz = 0.4;
  }

  update(dt) {
    if (this.collected) return;
    this._time += dt;
    this.mesh.position.y = this._baseY + Math.sin(this._time * 2) * 0.3;
    this.mesh.rotation.y += dt * 2;
  }

  checkPlayer(player) {
    if (this.collected) return false;
    return overlaps(player.position, { x: player.hx, y: player.hy, z: player.hz },
                    this.mesh.position, { x: this.hx, y: this.hy, z: this.hz });
  }

  collect(scene) {
    this.collected = true;
    scene.remove(this.mesh);
  }
}

// ── InterScarf power-up ────────────────────────────────────────────────────
export class InterScarf {
  constructor(scene, x, y, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x0066cc });
    const mat2 = new THREE.MeshLambertMaterial({ color: 0x000000 });
    // Main scarf body
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), mat);
    g.add(s);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), mat2);
    s2.position.y = -0.2;
    g.add(s2);
    // Star
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshLambertMaterial({ color: 0xffd700 }));
    star.position.set(0, 0.3, 0);
    g.add(star);

    this.mesh = g;
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);
    this.collected = false;
    this._baseY = y;
    this._time  = 0;
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

  collect(scene) {
    this.collected = true;
    scene.remove(this.mesh);
  }
}

// ── Platform ────────────────────────────────────────────────────────────────
class Platform {
  constructor(scene, x, y, z, w, h, d) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xc8a96e });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    this.mesh.position.set(x, y, z);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.hw = w / 2; this.hh = h / 2; this.hd = d / 2;
    this.topY = y + h / 2;
  }

  checkPlayer(player) {
    const pp = player.position;
    const ep = this.mesh.position;
    const ph = { x: player.hx, y: player.hy, z: player.hz };
    const eh = { x: this.hw, y: this.hh, z: this.hd };
    if (!overlaps(pp, ph, ep, eh)) return false;
    // Only collide from above
    const playerBottom = pp.y - player.hy;
    return playerBottom >= this.topY - 0.25;
  }
}

// ── Medieval tower (goal) ──────────────────────────────────────────────────
function buildTower(scene, x, z, getHeightAt) {
  const groundY = getHeightAt(x, z);
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888880 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x555550 });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x773322 });

  // Main tower
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 14, 8), stoneMat);
  base.position.set(x, groundY + 7, z);
  base.castShadow = true;
  scene.add(base);

  // Battlements
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const bx = x + Math.cos(angle) * 2.7;
    const bz = z + Math.sin(angle) * 2.7;
    const bat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.9), stoneMat);
    bat.position.set(bx, groundY + 14.6, bz);
    scene.add(bat);
  }

  // Conical roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 8), roofMat);
  roof.position.set(x, groundY + 17, z);
  scene.add(roof);

  // Door arch
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.5), darkMat);
  door.position.set(x, groundY + 1.25, z + 2.8);
  scene.add(door);

  // Flag – Inter colours
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 5),
    new THREE.MeshLambertMaterial({ color: 0x888888 }));
  pole.position.set(x, groundY + 20.5, z);
  scene.add(pole);

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x0066cc, side: THREE.DoubleSide }));
  flag.position.set(x + 0.7, groundY + 21.5, z);
  scene.add(flag);

  // Return goal trigger position & radius
  return { x, z, groundY, radius: 3.5 };
}

// ── Build entire level ─────────────────────────────────────────────────────
export function buildLevel(scene, getHeightAt) {
  const enemies      = [];
  const balls        = [];
  const platforms    = [];
  let   scarf        = null;

  // ── Platforms ──────────────────────────────────────────────────────────
  const platDefs = [
    //  x,  y_above_terrain,  z,   w,  h,   d
    [  0,  3.0,  -28,  7, 0.8, 6],
    [ -2,  4.5,  -50,  6, 0.8, 5],
    [  3,  3.5,  -70,  8, 0.8, 6],
    [ -1,  5.0,  -92,  6, 0.8, 5],
    [  2,  4.0, -112,  7, 0.8, 6],
    [  0,  5.5, -130,  5, 0.8, 5],
    [ -2,  4.0, -150,  7, 0.8, 6],
    [  1,  5.0, -168,  6, 0.8, 5],
  ];
  platDefs.forEach(([px, ydelta, pz, w, h, d]) => {
    const gy = getHeightAt(px, pz);
    platforms.push(new Platform(scene, px, gy + ydelta, pz, w, h, d));
  });

  // ── JuveFan enemies ────────────────────────────────────────────────────
  const juveDefs = [
    [ 0, -32, 5],   // x, z, patrolRange
    [ 0, -58, 4],
    [ 0, -88, 5],
    [ 0,-118, 4],
    [ 0,-148, 5],
    [ 0,-162, 3],
  ];
  juveDefs.forEach(([x, z, r]) => {
    enemies.push(new JuveFan(scene, x, z, r, getHeightAt));
  });

  // ── Barrel enemies ─────────────────────────────────────────────────────
  const barrelDefs = [
    [ 0, -42],
    [ 0, -78],
    [ 0,-105],
    [ 0,-140],
  ];
  barrelDefs.forEach(([x, z]) => {
    enemies.push(new BarrelEnemy(scene, x, z, getHeightAt));
  });

  // ── InterBalls ─────────────────────────────────────────────────────────
  const ballDefs = [
    [-1, -22],
    [ 2, -35],
    [-2, -65],
    [ 1, -98],
    [ 0,-125],
  ];
  ballDefs.forEach(([x, z]) => {
    const gy = getHeightAt(x, z);
    balls.push(new InterBall(scene, x, gy + 2.2, z));
  });

  // ── InterScarf power-up ────────────────────────────────────────────────
  const scarfZ = -142;
  const scarfH = getHeightAt(0, scarfZ);
  scarf = new InterScarf(scene, 0, scarfH + 2.5, scarfZ);

  // ── Goal tower ─────────────────────────────────────────────────────────
  const goal = buildTower(scene, 0, -188, getHeightAt);

  // ── Decorative stone wall leading to tower ─────────────────────────────
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x999988 });
  for (let wz = -175; wz > -188; wz -= 4) {
    [-5, 5].forEach(wx => {
      const wh = getHeightAt(wx, wz);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 3.5), wallMat);
      wall.position.set(wx, wh + 1.25, wz);
      scene.add(wall);
    });
  }

  return { enemies, balls, platforms, scarf, goal };
}
