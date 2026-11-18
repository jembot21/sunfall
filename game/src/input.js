// Input contract: SF.input.isDown(action), pressed(action), pointer coordinates and consume().
(function (SF) {
  const held = Object.create(null), edges = Object.create(null);
  const keyMap = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', KeyE: 'interact', KeyF: 'shoot', Space: 'shoot', Escape: 'pause', KeyP: 'pause' };
  const input = { x: 0, y: 0, buttons: 0, locked: false,
    isDown(action) { return !!held[action]; },
    pressed(action) { return !!edges[action]; },
    consume() { for (const key of Object.keys(edges)) delete edges[key]; }
  };
  window.addEventListener('keydown', event => {
    const action = keyMap[event.code];
    if (!action) return;
    if (!held[action]) edges[action] = true;
    held[action] = true;
    event.preventDefault();
  });
  window.addEventListener('keyup', event => { const action = keyMap[event.code]; if (action) held[action] = false; });
  window.addEventListener('blur', () => { for (const key of Object.keys(held)) held[key] = false; });
  window.addEventListener('mousemove', event => { input.x = event.clientX; input.y = event.clientY; });
  window.addEventListener('mousedown', event => { input.buttons = event.buttons; if (event.button === 0) { edges.shoot = true; held.shoot = true; } });
  window.addEventListener('mouseup', event => { input.buttons = event.buttons; if (event.button === 0) held.shoot = false; });
  document.addEventListener('pointerlockchange', () => { input.locked = document.pointerLockElement === document.body; });
  document.getElementById('game').addEventListener('contextmenu', event => event.preventDefault());
  input.bindElement = element => element.addEventListener('click', event => { if (event.target.closest('#start')) { if (document.body.requestPointerLock) document.body.requestPointerLock(); } });
  SF.input = input;
})(window.SF);
