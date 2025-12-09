/**
 * Player State and Input Handling
 * Manages player position, movement, and input processing
 */

import { 
  MOVE_SPEED, 
  ROTATION_SPEED, 
  SPAWN_X, 
  SPAWN_Y, 
  SPAWN_ANGLE 
} from './config.js';
import { isWall, getTileValue } from './world.js';

// =============================================================================
// PLAYER STATE
// =============================================================================

/** Player position and orientation */
export let px = SPAWN_X;
export let py = SPAWN_Y; 
export let pa = SPAWN_ANGLE;

/**
 * Set player position (used for teleporting or respawning)
 * @param {number} x - New X coordinate
 * @param {number} y - New Y coordinate
 * @param {number} angle - New angle in radians
 */
export function setPlayerPosition(x, y, angle = pa) {
  px = x;
  py = y;
  pa = angle;
}

/**
 * Get current player position
 * @returns {{x: number, y: number, angle: number}} Player state
 */
export function getPlayerPosition() {
  return { x: px, y: py, angle: pa };
}

// =============================================================================
// INPUT STATE MANAGEMENT
// =============================================================================

/** Input state tracking */
const keys = {};

// timers for short one-step presses from remoteMove/remoteLook
const holdTimers = {};

function pressKey(key, ms = 120) {
  const k = key.toLowerCase();
  keys[k] = true;
  if (holdTimers[k]) clearTimeout(holdTimers[k]);
  holdTimers[k] = setTimeout(() => {
    keys[k] = false;
    holdTimers[k] = null;
  }, ms);
}

/**
 * One step movement from controller (tap)
 * @param {'up'|'down'|'left'|'right'} dir
 */
export function remoteMove(dir) {
  if (dir === 'up') pressKey('w');
  else if (dir === 'down') pressKey('s');
  else if (dir === 'left') pressKey('a');
  else if (dir === 'right') pressKey('d');
}

/**
 * One step look from controller (tap)
 * @param {'left'|'right'} dir
 */
export function remoteLook(dir) {
  if (dir === 'left') pressKey('q');
  if (dir === 'right') pressKey('e');
}

/**
 * Hold based remote movement (start or stop)
 */
export function remoteMoveHold(dir, isDown) {
  if (dir === 'up') keys['w'] = isDown;
  else if (dir === 'down') keys['s'] = isDown;
  else if (dir === 'left') keys['a'] = isDown;
  else if (dir === 'right') keys['d'] = isDown;
}

/**
 * Hold based remote look (start or stop)
 */
export function remoteLookHold(dir, isDown) {
  if (dir === 'left') keys['q'] = isDown;
  else if (dir === 'right') keys['e'] = isDown;
}
/**
 * Check if a key is currently pressed
 * @param {string} key - Key name (lowercase)
 * @returns {boolean} True if pressed
 */
export function isKeyPressed(key) {
  return !!keys[key.toLowerCase()];
}

/**
 * Clear all movement keys to prevent stuck movement
 * Called when window loses focus or visibility changes
 */
export function clearMovementKeys() {
  keys['w'] = keys['arrowup'] = false;
  keys['s'] = keys['arrowdown'] = false;
  keys['a'] = keys['d'] = false;
  keys['q'] = keys['e'] = false;
  keys['arrowleft'] = keys['arrowright'] = false;
}

// =============================================================================
// INPUT EVENT HANDLERS
// =============================================================================

addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

// Prevent stuck movement when focus is lost
window.addEventListener('blur', clearMovementKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearMovementKeys();
});

// =============================================================================
// MOVEMENT PROCESSING
// =============================================================================

/**
 * Process player movement input and update position
 * @param {number} dt - Delta time multiplier
 * @returns {boolean} True if player moved (for cache invalidation)
 */
export function updateMovement(dt) {
<<<<<<< HEAD
  // Process input
  const forward = (keys['w'] || keys['arrowup']) ? 1 : 
                 (keys['s'] || keys['arrowdown']) ? -1 : 0;
  const strafe = keys['a'] ? -1 : keys['d'] ? 1 : 0;
  const turn = (keys['q'] || keys['arrowleft']) ? -1 : 
              (keys['e'] || keys['arrowright']) ? 1 : 0;

  let moved = false;

  // Update player rotation
=======
  const forward = (keys['w'] || keys['arrowup']) ? 1 :
                  (keys['s'] || keys['arrowdown']) ? -1 : 0;
  const strafe  = keys['a'] ? -1 : keys['d'] ? 1 : 0;
  const turn    = (keys['q'] || keys['arrowleft']) ? -1 :
                  (keys['e'] || keys['arrowright']) ? 1 : 0;

  let moved = false;

  // rotation
>>>>>>> electromalina/main
  if (turn !== 0) {
    pa += turn * ROTATION_SPEED * dt;
    moved = true;
  }

  // movement
  if (forward !== 0 || strafe !== 0) {
    const dx = Math.cos(pa);
    const dy = Math.sin(pa);
    const mx = (dx * forward + Math.cos(pa + Math.PI / 2) * strafe) * MOVE_SPEED * dt;
    const my = (dy * forward + Math.sin(pa + Math.PI / 2) * strafe) * MOVE_SPEED * dt;

    const nx = px + mx;
    const ny = py + my;
    if (!isWall(nx, py)) {
      px = nx;
      moved = true;
    }
    if (!isWall(px, ny)) {
      py = ny;
      moved = true;
    }
  }

  return moved;
}

// =============================================================================
// INTERACTION HANDLING
// =============================================================================

/**
 * Handle floor item interactions (F key)
 * @param {HTMLCanvasElement} canvas - Canvas element for focus restoration
 * @returns {boolean} True if interaction occurred
 */
export function handleFloorInteractions(canvas) {
  if (!keys['f']) return false;

  const tileValue = getTileValue(px, py);
  
  if (tileValue === 2) {
    window.open('https://example.com', '_blank');
  } else if (tileValue === 3) {
    alert('Trigger different app here (Electron/Node needed for local executable).');
  }
  
  canvas.focus && canvas.focus();
  keys['f'] = false;
  
  return tileValue === 2 || tileValue === 3;
}
