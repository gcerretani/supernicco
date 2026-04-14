// Keyboard + NippleJS touch controls

const keys = new Set();
const joy = { x: 0, z: 0 };
let _touchJump = false;
let _jumpConsumed = false;
let _nippleInited = false;

// ── Keyboard ───────────────────────────────────────────────────────────────
export function initKeyboard() {
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
}

// ── NippleJS joystick (called once, after zone-joy is visible) ─────────────
export function initMobileControls() {
  if (_nippleInited) return;
  _nippleInited = true;

  const joyZone = document.getElementById('zone-joy');
  const jumpBtn = document.getElementById('btn-jump');

  if (joyZone && typeof nipplejs !== 'undefined') {
    const manager = nipplejs.create({
      zone: joyZone,
      mode: 'dynamic',      // appears wherever you touch
      size: 110,
      color: 'rgba(0,102,204,0.65)',
      fadeTime: 200,
    });
    manager.on('move', (_, data) => {
      if (data.vector) {
        joy.x =  data.vector.x;
        joy.z = -data.vector.y; // nipplejs Y axis is inverted
      }
    });
    manager.on('end', () => { joy.x = 0; joy.z = 0; });
  }

  if (jumpBtn) {
    const press   = e => { e.preventDefault(); _touchJump = true; };
    const release = e => { e.preventDefault(); _touchJump = false; };
    jumpBtn.addEventListener('touchstart',  press,   { passive: false });
    jumpBtn.addEventListener('touchend',    release, { passive: false });
    jumpBtn.addEventListener('touchcancel', release, { passive: false });
  }
}

// ── Unified input ──────────────────────────────────────────────────────────
export function getInput() {
  let mx = joy.x;
  let mz = joy.z;

  if (keys.has('ArrowLeft')  || keys.has('KeyA')) mx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) mx += 1;
  if (keys.has('ArrowUp')    || keys.has('KeyW')) mz -= 1;
  if (keys.has('ArrowDown')  || keys.has('KeyS')) mz += 1;

  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 1) { mx /= len; mz /= len; }

  const jumpHeld = keys.has('Space') || _touchJump;
  return { x: mx, z: mz, jumpHeld };
}

/** Returns true only on the leading edge of a jump press. */
export function consumeJump() {
  const { jumpHeld } = getInput();
  if (jumpHeld && !_jumpConsumed) { _jumpConsumed = true; return true; }
  if (!jumpHeld) _jumpConsumed = false;
  return false;
}
