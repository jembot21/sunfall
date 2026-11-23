const KEY_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'KeyE', 'KeyF', 'KeyQ', 'Space', 'ShiftLeft', 'ShiftRight', 'Digit1', 'Digit2', 'Digit3', 'KeyM', 'Escape',
]);

export function createInput(target) {
  const held = new Set();
  const pressed = new Set();
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const mouse = { pointer: null, x: 0, y: 0, yaw: 0, pitch: 0, zoom: 0, attack: false };

  function reset() {
    held.clear();
    pressed.clear();
    if (mouse.pointer !== null && target.hasPointerCapture(mouse.pointer)) {
      target.releasePointerCapture(mouse.pointer);
    }
    mouse.pointer = null;
    mouse.yaw = mouse.pitch = mouse.zoom = 0;
    mouse.attack = false;
  }

  window.addEventListener('keydown', (event) => {
    if (!KEY_CODES.has(event.code) || event.target.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
    event.preventDefault();
    if (!event.repeat && !held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
  }, options);
  window.addEventListener('keyup', (event) => held.delete(event.code), options);
  window.addEventListener('blur', reset, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); }, options);

  target.addEventListener('pointerdown', (event) => {
    if (mouse.pointer !== null || (event.button !== 0 && event.button !== 2)) return;
    if (event.button === 0) mouse.attack = true;
    mouse.pointer = event.pointerId;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    target.setPointerCapture(event.pointerId);
    target.focus({ preventScroll: true });
  }, options);
  target.addEventListener('pointermove', (event) => {
    if (event.pointerId !== mouse.pointer) return;
    mouse.yaw += event.clientX - mouse.x;
    mouse.pitch += event.clientY - mouse.y;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, options);
  function releasePointer(event) {
    if (event.pointerId !== mouse.pointer) return;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    mouse.pointer = null;
  }
  target.addEventListener('pointerup', releasePointer, options);
  target.addEventListener('pointercancel', releasePointer, options);
  target.addEventListener('lostpointercapture', () => { mouse.pointer = null; }, options);
  target.addEventListener('contextmenu', (event) => event.preventDefault(), options);
  target.addEventListener('wheel', (event) => {
    event.preventDefault();
    mouse.zoom += Math.sign(event.deltaY);
  }, { ...options, passive: false });

  const down = (...codes) => codes.some((code) => held.has(code));
  const tapped = (...codes) => codes.some((code) => pressed.has(code));

  return {
    isDown: (code) => held.has(code),
    reset,
    // Call once per frame: held movement persists; presses and orbit deltas are consumed.
    poll() {
      const state = {
        moveX: Number(down('KeyD', 'ArrowRight')) - Number(down('KeyA', 'ArrowLeft')),
        moveZ: Number(down('KeyS', 'ArrowDown')) - Number(down('KeyW', 'ArrowUp')),
        sprint: down('ShiftLeft', 'ShiftRight'),
        jump: tapped('Space'),
        interact: tapped('KeyE', 'KeyF'),
        attack: mouse.attack || down('KeyQ'),
        weapon: tapped('Digit3') ? 3 : tapped('Digit2') ? 2 : tapped('Digit1') ? 1 : null,
        map: tapped('KeyM'),
        pause: tapped('Escape'),
        orbit: { yaw: mouse.yaw, pitch: mouse.pitch, zoom: mouse.zoom },
      };
      pressed.clear();
      mouse.yaw = mouse.pitch = mouse.zoom = 0;
      mouse.attack = false;
      return state;
    },
    dispose() { reset(); listeners.abort(); },
  };
}
