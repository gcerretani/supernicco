// Keyboard + on-screen D-pad controls (no external dependencies)

const keys = new Set();
const dpad = { up: false, down: false, left: false, right: false };
let _touchJump = false;
let _jumpConsumed = false;

// ── Keyboard ───────────────────────────────────────────────────────────────
export function initKeyboard() {
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
}

// ── D-pad buttons ──────────────────────────────────────────────────────────
function bindBtn(id, flag) {
  const el = document.getElementById(id);
  if (!el) return;
  const press   = e => { e.preventDefault(); dpad[flag] = true;  el.classList.add('pressed'); };
  const release = e => { e.preventDefault(); dpad[flag] = false; el.classList.remove('pressed'); };
  el.addEventListener('touchstart',  press,   { passive: false });
  el.addEventListener('touchend',    release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
  // Also mouse (for desktop testing)
  el.addEventListener('mousedown',  press);
  el.addEventListener('mouseup',    release);
  el.addEventListener('mouseleave', release);
}

export function initMobileControls() {
  bindBtn('dp-up',    'up');
  bindBtn('dp-down',  'down');
  bindBtn('dp-left',  'left');
  bindBtn('dp-right', 'right');

  const jump = document.getElementById('btn-jump');
  if (jump) {
    const jPress   = e => { e.preventDefault(); _touchJump = true; };
    const jRelease = e => { e.preventDefault(); _touchJump = false; };
    jump.addEventListener('touchstart',  jPress,   { passive: false });
    jump.addEventListener('touchend',    jRelease, { passive: false });
    jump.addEventListener('touchcancel', jRelease, { passive: false });
    jump.addEventListener('mousedown',  jPress);
    jump.addEventListener('mouseup',    jRelease);
    jump.addEventListener('mouseleave', jRelease);
  }
}

// ── Unified input ──────────────────────────────────────────────────────────
export function getInput() {
  let mx = 0, mz = 0;

  // Keyboard
  if (keys.has('ArrowLeft')  || keys.has('KeyA')) mx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) mx += 1;
  if (keys.has('ArrowUp')    || keys.has('KeyW')) mz -= 1;
  if (keys.has('ArrowDown')  || keys.has('KeyS')) mz += 1;

  // D-pad
  if (dpad.left)  mx -= 1;
  if (dpad.right) mx += 1;
  if (dpad.up)    mz -= 1;
  if (dpad.down)  mz += 1;

  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 1) { mx /= len; mz /= len; }

  const jumpHeld = keys.has('Space') || _touchJump;
  return { x: mx, z: mz, jumpHeld };
}

/** Returns true only on the leading edge of a jump press. */
export function consumeJump() {
  const { jumpHeld } = getInput();
  if (jumpHeld && !_jumpConsumed) {
    _jumpConsumed = true;
    return true;
  }
  if (!jumpHeld) _jumpConsumed = false;
  return false;
}
