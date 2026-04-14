// Keyboard + NippleJS touch controls

const keys = new Set();
const joy = { x: 0, z: 0 };
let _touchJump = false;
let _jumpConsumed = false;

export function initKeyboard() {
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    // Prevent spacebar from scrolling
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
}

export function initMobileControls() {
  const joyZone = document.getElementById('zone-joy');
  const jumpBtn = document.getElementById('btn-jump');
  joyZone.classList.remove('hidden');
  jumpBtn.classList.remove('hidden');

  const manager = nipplejs.create({
    zone: joyZone,
    mode: 'static',
    position: { left: '70px', bottom: '70px' },
    size: 120,
    color: 'rgba(0,102,204,0.55)',
    fadeTime: 0,
  });

  manager.on('move', (_, data) => {
    if (data.vector) {
      joy.x = data.vector.x;
      joy.z = -data.vector.y; // nipplejs Y is inverted
    }
  });
  manager.on('end', () => { joy.x = 0; joy.z = 0; });

  jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); _touchJump = true; }, { passive: false });
  jumpBtn.addEventListener('touchend',   e => { e.preventDefault(); _touchJump = false; }, { passive: false });
}

/** Returns current movement vector (normalized) and whether jump is held. */
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

/**
 * Returns true only on the leading edge of a jump press.
 * Must be called every frame.
 */
export function consumeJump() {
  const { jumpHeld } = getInput();
  if (jumpHeld && !_jumpConsumed) {
    _jumpConsumed = true;
    return true;
  }
  if (!jumpHeld) _jumpConsumed = false;
  return false;
}
