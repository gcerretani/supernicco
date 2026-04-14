import * as THREE from 'three';
import { initScene, render } from './scene.js';
import { getHeightAt, createTerrain, createDecorations } from './terrain.js';
import { Player } from './player.js';
import { initKeyboard, initMobileControls, getInput, consumeJump } from './controls.js';
import { buildLevel, resolveHayBales } from './level.js';
import {
  showStartScreen, hideStartScreen, showHUD, hideHUD,
  updateBalls, updateTimer, showGameOver, showWinCard,
  onPlayClick, onRestart, isMobile,
} from './ui.js';

// ── Game states ────────────────────────────────────────────────────────────
const STATE = { MENU: 0, PLAYING: 1, WIN: 2, OVER: 3 };
let state = STATE.MENU;

let sceneObjs, player, level;
const TOTAL_TIME = 120;
let timeLeft = TOTAL_TIME;
let ballCount = 0;
let camera;

// ── Camera follow ──────────────────────────────────────────────────────────
const camTarget = new THREE.Vector3();

function updateCamera(dt) {
  const p = player.position;
  camera.position.x += (p.x      - camera.position.x) * 6 * dt;
  camera.position.y += (p.y + 9  - camera.position.y) * 4 * dt;
  camera.position.z += (p.z + 13 - camera.position.z) * 6 * dt;
  camTarget.set(p.x, p.y + 1.5, p.z - 6);
  camera.lookAt(camTarget);
}

// ── Ball collect animation ─────────────────────────────────────────────────
function spawnCollectFX(scene, x, y, z) {
  [0x0099ff, 0xffd700, 0x0066cc].forEach((color, i) => {
    const geo = new THREE.RingGeometry(0.3, 0.55, 14);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 1 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + i * 0.4, z);
    scene.add(ring);
    let t = 0;
    const step = () => {
      t += 0.05;
      ring.scale.setScalar(1 + t * 6);
      mat.opacity = Math.max(0, 1 - t * 1.8);
      if (t < 0.6) requestAnimationFrame(step);
      else { geo.dispose(); mat.dispose(); scene.remove(ring); }
    };
    setTimeout(step, i * 70);
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  sceneObjs = initScene();
  camera = sceneObjs.camera;

  createTerrain(sceneObjs.scene);
  createDecorations(sceneObjs.scene);

  player = new Player(sceneObjs.scene);

  initKeyboard();  // keyboard always active

  showStartScreen();
  onPlayClick(() => startGame());
  onRestart(() => window.location.reload());

  sceneObjs.clock.start();
  loop();
}

// ── Start game ─────────────────────────────────────────────────────────────
function startGame() {
  level = buildLevel(sceneObjs.scene, getHeightAt);
  player.reset(getHeightAt);
  timeLeft  = TOTAL_TIME;
  ballCount = 0;

  updateBalls(0);
  updateTimer(TOTAL_TIME);

  hideStartScreen();
  document.getElementById('screen-over').classList.add('hidden');
  document.getElementById('screen-win').classList.add('hidden');

  // Show HUD (+ mobile controls if on touch device)
  showHUD(isMobile);

  // Init NippleJS NOW — after zone-joy is visible — so it gets correct dimensions
  if (isMobile) initMobileControls();

  state = STATE.PLAYING;
}

// ── Collision checks ───────────────────────────────────────────────────────
function checkCollectibles() {
  for (const ball of level.balls) {
    if (!ball.collected && ball.checkPlayer(player)) {
      const p = ball.mesh.position;
      ball.collect(sceneObjs.scene);
      ballCount++;
      updateBalls(ballCount);
      spawnCollectFX(sceneObjs.scene, p.x, p.y, p.z);
    }
  }
  if (level.scarf && !level.scarf.collected && level.scarf.checkPlayer(player)) {
    level.scarf.collect(sceneObjs.scene);
    player.activatePowerup(6);
  }
}

function checkEnemies() {
  for (const enemy of level.enemies) {
    if (enemy.dead) continue;
    const result = enemy.checkPlayer(player);
    if (result === 'stomp') {
      enemy.die(sceneObjs.scene);
      player.stomp();
    } else if (result === 'hit') {
      if (player.getHit()) {
        state = STATE.OVER;
        hideHUD();
        showGameOver(enemy.enemyType); // 'juve' or 'barrel'
      }
    }
  }
}

function checkGoal() {
  const g = level.goal;
  const p = player.position;
  if (Math.sqrt((p.x - g.x) ** 2 + (p.z - g.z) ** 2) < g.radius) {
    state = STATE.WIN;
    hideHUD();
    showWinCard(TOTAL_TIME - timeLeft, ballCount);
  }
}

// ── Game loop ──────────────────────────────────────────────────────────────
let prevTime = 0;

function loop(ts = 0) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - prevTime) / 1000, 0.05);
  prevTime = ts;

  if (state === STATE.PLAYING) {
    // Timer
    timeLeft -= dt;
    updateTimer(Math.max(0, timeLeft));
    if (timeLeft <= 0) {
      state = STATE.OVER;
      hideHUD();
      showGameOver('timeout');
      render();
      return;
    }

    const input = getInput();
    player.update(dt, input, getHeightAt, consumeJump);

    // Solid obstacle push-back (hay bales + jump hedges)
    resolveHayBales(player, level.hayBales);

    // Enemies
    for (const e of level.enemies) {
      e.enemyType === 'barrel'
        ? e.update(dt, player.position.z)
        : e.update(dt);
    }

    // Collectibles
    for (const b of level.balls) b.update(dt);
    if (level.scarf) level.scarf.update(dt);

    checkCollectibles();
    checkEnemies();
    checkGoal();
    updateCamera(dt);
  }

  render();
}

// ── Boot ───────────────────────────────────────────────────────────────────
init();
