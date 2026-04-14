import * as THREE from 'three';
import { initScene, render } from './scene.js';
import { getHeightAt, createTerrain, createDecorations } from './terrain.js';
import { Player } from './player.js';
import { initKeyboard, initMobileControls, getInput, consumeJump } from './controls.js';
import { buildLevel } from './level.js';
import {
  showStartScreen, hideStartScreen, showHUD, hideHUD,
  updateBalls, updateTimer, showGameOver, showWinCard,
  onPlayClick, onRestart, isMobile,
} from './ui.js';

// ── Game states ────────────────────────────────────────────────────────────
const STATE = { MENU: 0, PLAYING: 1, WIN: 2, OVER: 3 };
let state = STATE.MENU;

// ── Module references ──────────────────────────────────────────────────────
let sceneObjs, player, level;
const TOTAL_TIME = 120; // 2 minutes
let timeLeft = TOTAL_TIME;
let ballCount = 0;
let startTimestamp = 0;

// ── Camera follow ──────────────────────────────────────────────────────────
const camOffset = new THREE.Vector3(0, 9, 13);
const camTarget = new THREE.Vector3();
let camera;

function updateCamera(dt) {
  const p = player.position;
  const desiredX = p.x + camOffset.x;
  const desiredY = p.y + camOffset.y;
  const desiredZ = p.z + camOffset.z;

  camera.position.x += (desiredX - camera.position.x) * 6 * dt;
  camera.position.y += (desiredY - camera.position.y) * 4 * dt;
  camera.position.z += (desiredZ - camera.position.z) * 6 * dt;

  camTarget.set(p.x, p.y + 1.5, p.z - 6);
  camera.lookAt(camTarget);
}

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  sceneObjs = initScene();
  camera = sceneObjs.camera;

  createTerrain(sceneObjs.scene);
  createDecorations(sceneObjs.scene);

  player = new Player(sceneObjs.scene);

  initKeyboard();
  initMobileControls(); // wires D-pad buttons (no-op on desktop, safe to always call)

  showStartScreen();

  onPlayClick(() => startGame());
  onRestart(() => restartGame());

  sceneObjs.clock.start();
  loop();
}

// ── Start / restart ────────────────────────────────────────────────────────
function startGame() {
  // Build level objects fresh
  if (level) {
    // Remove old meshes on restart handled by buildLevel creating new ones
  }
  level = buildLevel(sceneObjs.scene, getHeightAt);

  player.reset(getHeightAt);
  timeLeft  = TOTAL_TIME;
  ballCount = 0;
  startTimestamp = performance.now();

  updateBalls(0);
  updateTimer(TOTAL_TIME);

  hideStartScreen();
  document.getElementById('screen-over').classList.add('hidden');
  document.getElementById('screen-win').classList.add('hidden');
  showHUD(isMobile);

  state = STATE.PLAYING;
}

function restartGame() {
  // Remove existing level meshes by rebuilding scene decorations
  // Simplest: reload the page to clear Three.js scene properly
  window.location.reload();
}

// ── Platform collision ─────────────────────────────────────────────────────
function checkPlatforms() {
  if (!level) return;
  for (const plat of level.platforms) {
    if (plat.checkPlayer(player)) {
      player.landOnPlatform(plat.topY);
    }
  }
}

// ── Collectible collision ──────────────────────────────────────────────────
function checkCollectibles() {
  if (!level) return;
  for (const ball of level.balls) {
    if (!ball.collected && ball.checkPlayer(player)) {
      ball.collect(sceneObjs.scene);
      ballCount++;
      updateBalls(ballCount);
    }
  }
  if (level.scarf && !level.scarf.collected && level.scarf.checkPlayer(player)) {
    level.scarf.collect(sceneObjs.scene);
    player.activatePowerup(6);
  }
}

// ── Enemy collision ────────────────────────────────────────────────────────
function checkEnemies() {
  if (!level) return;
  for (const enemy of level.enemies) {
    if (enemy.dead) continue;
    const result = enemy.checkPlayer(player);
    if (result === 'stomp') {
      enemy.die(sceneObjs.scene);
      player.stomp();
    } else if (result === 'hit') {
      if (player.getHit()) {
        setGameOver();
      }
    }
  }
}

// ── Goal collision ─────────────────────────────────────────────────────────
function checkGoal() {
  if (!level) return;
  const g = level.goal;
  const p = player.position;
  const dx = p.x - g.x;
  const dz = p.z - g.z;
  if (Math.sqrt(dx * dx + dz * dz) < g.radius) {
    setWin();
  }
}

// ── State transitions ──────────────────────────────────────────────────────
function setGameOver() {
  state = STATE.OVER;
  hideHUD();
  showGameOver();
}

function setWin() {
  state = STATE.WIN;
  hideHUD();
  const elapsed = TOTAL_TIME - timeLeft;
  showWinCard(elapsed, ballCount);
}

// ── Game loop ──────────────────────────────────────────────────────────────
let prevTime = 0;

function loop(ts = 0) {
  requestAnimationFrame(loop);

  const dt = Math.min((ts - prevTime) / 1000, 0.05); // cap at 50ms
  prevTime = ts;

  if (state === STATE.PLAYING) {
    const input = getInput();

    // Timer
    timeLeft -= dt;
    updateTimer(Math.max(0, timeLeft));
    if (timeLeft <= 0) {
      setGameOver();
      render();
      return;
    }

    // Update player
    player.update(dt, input, getHeightAt, consumeJump);

    // Update enemies
    for (const enemy of level.enemies) {
      if (enemy.constructor.name === 'BarrelEnemy') {
        enemy.update(dt, player.position.z);
      } else {
        enemy.update(dt);
      }
    }

    // Update collectibles
    for (const ball of level.balls) ball.update(dt);
    if (level.scarf) level.scarf.update(dt);

    // Collisions
    checkPlatforms();
    checkCollectibles();
    checkEnemies();
    checkGoal();

    // Camera
    updateCamera(dt);
  }

  render();
}

// ── Boot ───────────────────────────────────────────────────────────────────
init();
