(() => {
  const SF = globalThis.SF ||= {};
  const down = new Set(), edges = new Set();
  const input = SF.input = {
    locked: false, yaw: 0, pitch: 0, mouseDown: false,
    isDown: code => down.has(code),
    pressed: code => edges.delete(code),
    endFrame: () => edges.clear(),
    lock: (element = document.querySelector('canvas')) => {
      try { element?.requestPointerLock?.()?.catch?.(() => {}); } catch {}
    }
  };
  function release() {
    down.clear();
    edges.clear();
    input.mouseDown = false;
  }
  window.addEventListener('keydown', event => {
    if (!down.has(event.code) && !event.repeat) edges.add(event.code);
    down.add(event.code);
    if (SF.state?.mode === 'play' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', event => down.delete(event.code));
  window.addEventListener('blur', release);
  document.addEventListener('pointerlockchange', () => {
    input.locked = Boolean(document.pointerLockElement);
    if (!input.locked) release();
  });
  document.addEventListener('mousemove', event => {
    if (!input.locked) return;
    input.yaw -= event.movementX * 0.0025;
    input.pitch = Math.max(-1.2, Math.min(1.2, input.pitch - event.movementY * 0.0025));
  });
  document.addEventListener('mousedown', event => {
    if (!input.locked) return;
    down.add('Mouse' + event.button);
    edges.add('Mouse' + event.button);
    if (event.button === 0) input.mouseDown = true;
  });
  document.addEventListener('mouseup', event => {
    down.delete('Mouse' + event.button);
    if (event.button === 0) input.mouseDown = false;
  });
})();
