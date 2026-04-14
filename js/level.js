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

// ── Flower Patch (decorative strip — no collision, just visual) ───────────
function makeFlowerPatch(scene, z, getHeightAt) {
  const g = new THREE.Group();
  const rng = (a, b) => a + Math.random() * (b - a);

  // Grass tufts
  const tuftMat = new THREE.MeshLambertMaterial({ color: 0x4db833 });
  for (let i = 0; i < 22; i++) {
    const h = rng(0.22, 0.5);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, h, 4), tuftMat);
    t.position.set(rng(-4.5, 4.5), h / 2, rng(-0.9, 0.9));
    g.add(t);
  }

  // Flowers: stem + round head
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x3a8020 });
  const palette = [0xffcc00, 0xff3333, 0xffffff, 0xff88cc, 0xff8800, 0xcc44ff];
  for (let i = 0; i < 14; i++) {
    const color = palette[Math.floor(rng(0, palette.length))];
    const stemH = rng(0.35, 0.75);
    const stem  = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, stemH, 5),
                                  stemMat);
    stem.position.y = stemH / 2;
    const head  = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4),
                                  new THREE.MeshLambertMaterial({ color }));
    head.position.y = stemH + 0.11;
    const flower = new THREE.Group();
    flower.add(stem, head);
    flower.position.set(rng(-4.5, 4.5), 0, rng(-0.85, 0.85));
    g.add(flower);
  }

  const groundY = getHeightAt(0, z);
  g.position.set(0, groundY, z);
  scene.add(g);
}

// ── Side hedge walls (visual corridor boundaries) ─────────────────────────
function makeSideHedgeWalls(scene, getHeightAt) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
  const segLen = 6;
  for (let z = -4; z > -186; z -= segLen) {
    [-5.2, 5.2].forEach(wx => {
      const groundY = getHeightAt(wx, z - segLen / 2);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, segLen), mat);
      wall.position.set(wx, groundY + 0.7, z - segLen / 2);
      wall.castShadow = true;
      scene.add(wall);
    });
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
  cv.width = 320; cv.height = 200;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 320, 200);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 310, 190);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  lines.forEach(({ text, size, y }) => {
    ctx.font = `bold ${Math.round(size * 1.35)}px Arial`;
    ctx.fillText(text, 160, Math.round(y * 1.38));
  });

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 2.5, 0.12),
    new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })
  );
  board.position.y = 4.45;
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

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xaaaaaa }));
  pole.position.set(x, groundY + 22, z);
  scene.add(pole);

  // Inter flag — big, wavy, striped canvas texture
  const flagW = 4.5, flagH = 2.8;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, 10, 5);
  const fPos = flagGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const u = (fPos.getX(i) + flagW / 2) / flagW; // 0=pole side, 1=free end
    fPos.setZ(i, Math.sin(u * Math.PI * 1.6) * 0.55 * u);
  }
  flagGeo.computeVertexNormals();

  const flagCv  = document.createElement('canvas');
  flagCv.width  = 256; flagCv.height = 160;
  const fCtx    = flagCv.getContext('2d');
  const stripes = 10;
  const sw      = flagCv.width / stripes;
  for (let i = 0; i < stripes; i++) {
    fCtx.fillStyle = i % 2 === 0 ? '#000000' : '#0066cc';
    fCtx.fillRect(i * sw, 0, sw, flagCv.height);
  }
  fCtx.fillStyle = '#ffffff';
  fCtx.font = 'bold 28px Arial';
  fCtx.textAlign = 'center';
  fCtx.fillText('INTER', 128, 72);
  fCtx.font = 'bold 20px Arial';
  fCtx.fillText('★ FORZA ★', 128, 108);

  const flag = new THREE.Mesh(flagGeo,
    new THREE.MeshLambertMaterial({
      map: new THREE.CanvasTexture(flagCv), side: THREE.DoubleSide
    }));
  flag.position.set(x + flagW / 2, groundY + 25 - flagH / 2, z);
  scene.add(flag);

  return { x, z, groundY, radius: 3.5 };
}

// ── Build entire level ─────────────────────────────────────────────────────
export function buildLevel(scene, getHeightAt) {
  const enemies    = [];
  const balls      = [];
  const hayBales   = [];
  let   scarf      = null;

  // ── Side hedge walls (corridor boundaries) ────────────────────────────
  makeSideHedgeWalls(scene, getHeightAt);

  // ── Flower patches (decorative strips along the path) ─────────────────
  [-40, -80, -120, -162].forEach(z => {
    makeFlowerPatch(scene, z, getHeightAt);
  });

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
