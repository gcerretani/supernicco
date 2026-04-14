// ── UI / HUD / Screens ─────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Confetti ───────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#0066cc','#0099ff','#003d99',
  '#ffffff','#ffd700','#00ccff',
  '#ff6699','#66ff66',
];

function spawnConfetti() {
  const box = $('confetti-box');
  box.innerHTML = '';
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div');
    el.className = 'confetto';
    el.style.left    = Math.random() * 100 + 'vw';
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.width   = (6 + Math.random() * 8) + 'px';
    el.style.height  = (8 + Math.random() * 10) + 'px';
    el.style.animationDuration = (1.8 + Math.random() * 2.2) + 's';
    el.style.animationDelay   = (Math.random() * 1.5) + 's';
    box.appendChild(el);
  }
}

// ── Show / hide helpers ────────────────────────────────────────────────────
export function showStartScreen() {
  $('screen-start').style.display = 'flex';
  $('screen-over').classList.add('hidden');
  $('screen-win').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('zone-joy').classList.add('hidden');
  $('btn-jump').classList.add('hidden');
}

export function hideStartScreen() {
  $('screen-start').style.display = 'none';
}

export function showHUD() {
  $('hud').classList.remove('hidden');
}

export function hideHUD() {
  $('hud').classList.add('hidden');
}

export function updateBalls(n) {
  $('balls').textContent = n;
}

export function updateTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  $('timer').textContent = m + ':' + String(s).padStart(2, '0');
  if (seconds <= 30) {
    $('h-timer').classList.add('urgent');
  } else {
    $('h-timer').classList.remove('urgent');
  }
}

export function showGameOver() {
  $('screen-over').classList.remove('hidden');
  $('hud').classList.add('hidden');
}

export function showWinCard(elapsedSeconds, ballCount) {
  const m = Math.floor(elapsedSeconds / 60);
  const s = Math.floor(elapsedSeconds % 60);
  const timeStr = m + ':' + String(s).padStart(2, '0');
  const msg = ballCount >= 5
    ? `Hai completato il Chianti in ${timeStr} raccogliendo TUTTI e 5 i palloni! Sei un campione assoluto! 🏆`
    : `Hai completato il Chianti in ${timeStr} raccogliendo ${ballCount}/5 palloni. Grande, campione!`;
  $('win-msg').textContent = msg;
  $('screen-win').classList.remove('hidden');
  spawnConfetti();
}

export function onPlayClick(cb) {
  $('btn-play').addEventListener('click', cb);
}

export function onRestart(cb) {
  // Both restart buttons
  document.querySelectorAll('.btn-restart').forEach(btn => {
    btn.addEventListener('click', cb);
  });
}

export function initMobileDetect() {
  // Show mobile controls on touch devices or small screens
  return ('ontouchstart' in window) || (window.innerWidth < 800);
}
