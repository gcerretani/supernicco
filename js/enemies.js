import * as THREE from 'three';

// ── JuveFan – bianco/nero patrol enemy ─────────────────────────────────────
function buildJuveFan() {
  const g = new THREE.Group();

  // Body blob (sphere-ish)
  const bodyGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  g.add(body);

  // Black stripes (horizontal bands)
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  [-0.18, 0.18].forEach(y => {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 12), stripeMat);
    stripe.position.y = y;
    stripe.rotation.x = Math.PI / 2;
    g.add(stripe);
  });

  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
  [-0.18, 0.18].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), eyeMat);
    eye.position.set(ex, 0.18, 0.5);
    g.add(eye);
  });

  // Scarf (bianco/nero)
  const scarfMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 5, 10), scarfMat);
  scarf.position.y = -0.4;
  g.add(scarf);

  return g;
}

// ── BarrelEnemy – rolling barrel ───────────────────────────────────────────
function buildBarrel() {
  const g = new THREE.Group();
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0x7a4a1e });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 8), barrelMat);
  barrel.rotation.z = Math.PI / 2; // lay on side
  barrel.castShadow = true;
  g.add(barrel);
  // Metal hoops
  const hoopMat = new THREE.MeshLambertMaterial({ color: 0x555544 });
  [-0.25, 0, 0.25].forEach(x => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 5, 10), hoopMat);
    hoop.rotation.y = Math.PI / 2;
    hoop.position.x = x;
    g.add(hoop);
  });
  return g;
}

// ── Generic AABB helper ─────────────────────────────────────────────────────
function overlaps(pa, ha, pb, hb) {
  return (
    Math.abs(pa.x - pb.x) < ha.x + hb.x &&
    Math.abs(pa.y - pb.y) < ha.y + hb.y &&
    Math.abs(pa.z - pb.z) < ha.z + hb.z
  );
}

// ── JuveFan class ────────────────────────────────────────────────────────────
export class JuveFan {
  constructor(scene, x, z, patrolRange, getHeightAt) {
    this.mesh = buildJuveFan();
    this.getH  = getHeightAt;
    this._baseX = x;
    this._baseZ = z;
    this._range = patrolRange;
    this._dir   = 1;
    this._speed = 2.2;
    this._time  = 0;
    this.dead   = false;
    this.enemyType = 'juve';

    const h = getHeightAt(x, z);
    this.mesh.position.set(x, h + 0.55, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this.hx = 0.58; this.hy = 0.55; this.hz = 0.58;
  }

  update(dt) {
    if (this.dead) return;
    this._time += dt;

    this.mesh.position.z += this._dir * this._speed * dt;
    const h = this.getH(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y = h + 0.55;

    if (this.mesh.position.z > this._baseZ + this._range) {
      this._dir = -1;
      this.mesh.rotation.y = Math.PI;
    } else if (this.mesh.position.z < this._baseZ - this._range) {
      this._dir = 1;
      this.mesh.rotation.y = 0;
    }

    // Wobble
    this.mesh.rotation.z = Math.sin(this._time * 5) * 0.15;
  }

  checkPlayer(player) {
    if (this.dead) return null;
    const pp = player.position;
    const ep = this.mesh.position;
    const ph = { x: player.hx, y: player.hy, z: player.hz };
    const eh = { x: this.hx,   y: this.hy,   z: this.hz };

    if (!overlaps(pp, ph, ep, eh)) return null;

    // Stomp? Player bottom must be above enemy centre
    const playerBottom = pp.y - player.hy;
    if (playerBottom > ep.y + 0.05 && player.velocity.y < 0) {
      return 'stomp';
    }
    return 'hit';
  }

  die(scene) {
    this.dead = true;
    scene.remove(this.mesh);
  }
}

// ── BarrelEnemy class ─────────────────────────────────────────────────────────
export class BarrelEnemy {
  constructor(scene, x, z, getHeightAt) {
    this.mesh  = buildBarrel();
    this.getH  = getHeightAt;
    this._startZ = z;
    this._speed  = 4.5;
    this.dead    = false;
    this.enemyType = 'barrel';

    const h = getHeightAt(x, z);
    this.mesh.position.set(x, h + 0.38, z);
    scene.add(this.mesh);

    this.hx = 0.42; this.hy = 0.38; this.hz = 0.42;
  }

  update(dt, playerZ) {
    if (this.dead) return;

    // Roll toward player (negative Z direction generally)
    this.mesh.position.z -= this._speed * dt;
    const h = this.getH(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y = h + 0.38;

    // Spin as it rolls
    this.mesh.rotation.x -= this._speed * dt * 1.5;

    // Reset if it rolls past the player or off-map
    if (this.mesh.position.z > playerZ + 10 || this.mesh.position.z < -220) {
      this.mesh.position.z = this._startZ;
    }
  }

  checkPlayer(player) {
    if (this.dead) return null;
    const pp = player.position;
    const ep = this.mesh.position;
    const ph = { x: player.hx, y: player.hy, z: player.hz };
    const eh = { x: this.hx,   y: this.hy,   z: this.hz };
    if (!overlaps(pp, ph, ep, eh)) return null;

    const playerBottom = pp.y - player.hy;
    if (playerBottom > ep.y + 0.05 && player.velocity.y < 0) return 'stomp';
    return 'hit';
  }

  die(scene) {
    this.dead = true;
    scene.remove(this.mesh);
  }
}
