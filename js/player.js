import * as THREE from 'three';

const GRAVITY     = -22;   // units/s²
const JUMP_FORCE  =  9.5;  // units/s (up)
const MOVE_SPEED  =  8;    // units/s
const PLAYER_H    =  1.8;  // character height
const HALF_H      = PLAYER_H / 2;

// ── Jersey texture (Inter stripes: black & blue) ────────────────────────────
function jerseyTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#000000' : '#0066cc';
    ctx.fillRect(i * 8, 0, 8, 64);
  }
  return new THREE.CanvasTexture(c);
}

// ── Build low-poly Nicco mesh ───────────────────────────────────────────────
function buildNicco() {
  const root = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b49a });

  // Body group (so we can animate arms/legs relative to it)
  const body = new THREE.Group();
  root.add(body);

  // Torso
  const torsoMat = new THREE.MeshLambertMaterial({ map: jerseyTexture() });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.45), torsoMat);
  torso.position.y = 0.7;
  torso.castShadow = true;
  body.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.68), skin);
  head.position.y = 1.52;
  head.castShadow = true;
  body.add(head);

  // Hair – dark castano: main block + front tuft
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x2d1a0e });
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.72), hairMat);
  hairTop.position.set(0, 1.95, 0);
  body.add(hairTop);
  const hairFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.22), hairMat);
  hairFront.position.set(0.06, 1.85, 0.38);
  hairFront.rotation.x = -0.25; // tuft angles forward
  body.add(hairFront);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.3), hairMat);
  hairBack.position.set(0, 1.88, -0.32);
  body.add(hairBack);

  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a0a00 });
  [-0.18, 0.18].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), eyeMat);
    eye.position.set(ex, 1.52, 0.36);
    body.add(eye);
  });

  // Shorts (dark)
  const shortsMat = new THREE.MeshLambertMaterial({ color: 0x111122 });
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.4, 0.47), shortsMat);
  shorts.position.y = 0.22;
  body.add(shorts);

  // Arms (will be rotated for animation)
  const armMat = new THREE.MeshLambertMaterial({ color: 0x0066cc });
  const leftArm  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), armMat);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), armMat);
  leftArm.position.set(-0.54, 0.7, 0);
  rightArm.position.set( 0.54, 0.7, 0);
  leftArm.castShadow = true;
  rightArm.castShadow = true;
  body.add(leftArm);
  body.add(rightArm);

  // Legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0xe8b49a });
  const sockMat = new THREE.MeshLambertMaterial({ color: 0x0066cc });
  const leftLeg  = new THREE.Group();
  const rightLeg = new THREE.Group();

  const legGeo = new THREE.BoxGeometry(0.3, 0.55, 0.3);
  const sockGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
  const bootGeo = new THREE.BoxGeometry(0.32, 0.15, 0.38);
  const bootMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  [leftLeg, rightLeg].forEach((leg, i) => {
    const thigh = new THREE.Mesh(legGeo, legMat);
    thigh.position.y = -0.275;
    leg.add(thigh);
    const sock = new THREE.Mesh(sockGeo, sockMat);
    sock.position.y = -0.675;
    leg.add(sock);
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.88, 0.04);
    leg.add(boot);
    leg.position.set(i === 0 ? -0.22 : 0.22, 0, 0);
    leg.castShadow = true;
    body.add(leg);
  });

  // Store refs for animation
  root.userData = { leftArm, rightArm, leftLeg, rightLeg };

  return root;
}

// ── Player class ─────────────────────────────────────────────────────────────
export class Player {
  constructor(scene) {
    this.mesh = buildNicco();
    this.mesh.position.set(0, 10, 0); // will be corrected on first frame
    scene.add(this.mesh);

    this.velocity   = new THREE.Vector3();
    this.isOnGround = false;
    this.isInvincible = false;
    this._invTimer   = 0;
    this._time       = 0;
    this._facingAngle = 0;
    this._dead       = false;

    // AABB half-extents for collision checks
    this.hx = 0.42;
    this.hy = HALF_H;
    this.hz = 0.42;
  }

  get position() { return this.mesh.position; }

  reset(getHeightAt) {
    const startH = getHeightAt(0, 0);
    this.mesh.position.set(0, startH + HALF_H + 0.1, 0);
    this.velocity.set(0, 0, 0);
    this.isOnGround = false;
    this.isInvincible = false;
    this._invTimer = 0;
    this._dead = false;
  }

  activatePowerup(duration = 5) {
    this.isInvincible = true;
    this._invTimer = duration;
    document.getElementById('h-power').classList.remove('hidden');
  }

  update(dt, input, getHeightAt, consumeJump) {
    if (this._dead) return;
    this._time += dt;

    // ── Movement ──────────────────────────────────────────────────────────
    const speed = MOVE_SPEED;
    const mx = input.x * speed;
    const mz = input.z * speed;

    this.velocity.x = mx;
    this.velocity.z = mz;

    // ── Gravity / jump ────────────────────────────────────────────────────
    this.velocity.y += GRAVITY * dt;

    if (this.isOnGround && consumeJump()) {
      this.velocity.y = JUMP_FORCE;
      this.isOnGround = false;
    }

    // ── Integrate position ────────────────────────────────────────────────
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;

    // Clamp X so player stays on level
    this.mesh.position.x = Math.max(-18, Math.min(18, this.mesh.position.x));

    // ── Terrain collision ─────────────────────────────────────────────────
    const groundY = getHeightAt(this.mesh.position.x, this.mesh.position.z) + HALF_H;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }

    // ── Facing direction ──────────────────────────────────────────────────
    if (Math.abs(mx) > 0.1 || Math.abs(mz) > 0.1) {
      const target = Math.atan2(mx, -mz);
      // Shortest-path angle lerp
      let diff = target - this._facingAngle;
      while (diff >  Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      this._facingAngle += diff * Math.min(1, 12 * dt);
      this.mesh.rotation.y = this._facingAngle;
    }

    // ── Walk animation ────────────────────────────────────────────────────
    const { leftArm, rightArm, leftLeg, rightLeg } = this.mesh.userData;
    const isMoving = Math.abs(mx) > 0.1 || Math.abs(mz) > 0.1;
    const swing = isMoving ? Math.sin(this._time * 9) * 0.65 : 0;
    leftLeg.rotation.x  =  swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x  = -swing * 0.5;
    rightArm.rotation.x =  swing * 0.5;

    // ── Invincibility ─────────────────────────────────────────────────────
    if (this.isInvincible) {
      this._invTimer -= dt;
      // Flicker effect
      this.mesh.visible = Math.sin(this._time * 20) > 0;
      if (this._invTimer <= 0) {
        this.isInvincible = false;
        this.mesh.visible = true;
        document.getElementById('h-power').classList.add('hidden');
      }
    }
  }

  /** Call when an enemy hits the player sideways. */
  getHit() {
    if (this.isInvincible) return false;
    this._dead = true;
    return true; // game over
  }

  /** Call when player stomps an enemy from above. Bounce up. */
  stomp() {
    this.velocity.y = JUMP_FORCE * 0.7;
    this.isOnGround = false;
  }

  /** Snap player onto a platform (top surface). */
  landOnPlatform(topY) {
    if (this.velocity.y <= 0) {
      this.mesh.position.y = topY + HALF_H;
      this.velocity.y = 0;
      this.isOnGround = true;
    }
  }
}
