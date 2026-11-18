// SF.input: isDown(action), pressed(action) (consumes an edge), endFrame(), clear(),
// mouse {x,y,dx,dy} (normalized coordinates and frame motion), started, paused.
// Actions: forward/back/left/right/run/use/fire/aim/handbrake/pause/start.
// E=use, F or left mouse=fire, Space=handbrake, right mouse=aim. Pause toggles
// here; main must skip simulation when !started || paused and call endFrame().
// DOM emits sf:start and sf:pause (detail is paused boolean). Pointer lock optional.
(function (SF) {
  'use strict';
  const keys = new Set(), edges = new Set();
  const mapping = {
    forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    run: ['ShiftLeft', 'ShiftRight'], use: ['KeyE'], fire: ['KeyF', 'Mouse0'],
    aim: ['Mouse2'], handbrake: ['Space'], pause: ['Escape', 'KeyP'], start: ['Enter', 'NumpadEnter']
  };
  const start = document.getElementById('start'), pause = document.getElementById('pause');
  const host = document.getElementById('game');
  const startHint = start.querySelector?.('p');
  if (startHint) startHint.textContent = 'Click or press Enter to play';
  const mouse = {x: 0, y: 0, dx: 0, dy: 0};
  let started = false, paused = false;
  function clear() { keys.clear(); edges.clear(); mouse.dx = mouse.dy = 0; }
  function setPaused(value) {
    if (!started || paused === Boolean(value)) return;
    paused = Boolean(value); clear(); pause.classList.toggle('hidden', !paused);
    if (paused && document.pointerLockElement) document.exitPointerLock();
    window.dispatchEvent(new CustomEvent('sf:pause', {detail: paused}));
  }
  function begin() {
    if (started) return;
    started = true; clear(); start.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('sf:start'));
  }
  window.addEventListener('keydown', event => {
    if (!Object.values(mapping).some(list => list.includes(event.code))) return;
    event.preventDefault();
    if (event.repeat || keys.has(event.code)) return;
    if (mapping.start.includes(event.code) && !started) { begin(); return; }
    if (mapping.pause.includes(event.code)) {
      setPaused(!paused); keys.add(event.code); edges.add(event.code); return;
    }
    if (started && !paused) { keys.add(event.code); edges.add(event.code); }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { clear(); setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  start.addEventListener('click', begin);
  pause.addEventListener('click', () => setPaused(false));
  host.addEventListener('mousedown', event => {
    if (!started || paused) return;
    const code = 'Mouse' + event.button;
    if (!keys.has(code)) edges.add(code);
    keys.add(code);
  });
  window.addEventListener('mouseup', event => keys.delete('Mouse' + event.button));
  window.addEventListener('mousemove', event => {
    if (document.pointerLockElement) {
      mouse.x = Math.max(-1, Math.min(1, mouse.x + event.movementX / innerWidth * 2));
      mouse.y = Math.max(-1, Math.min(1, mouse.y - event.movementY / innerHeight * 2));
    } else {
      mouse.x = event.clientX / innerWidth * 2 - 1;
      mouse.y = 1 - event.clientY / innerHeight * 2;
    }
    mouse.dx += event.movementX || 0; mouse.dy += event.movementY || 0;
  });
  host.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
  }, {capture: true});
  SF.input = {
    mouse, clear, setPaused,
    get started() { return started; }, get paused() { return paused; },
    isDown(action) { return (mapping[action] || []).some(key => keys.has(key)); },
    pressed(action) {
      const list = mapping[action] || [], hit = list.some(key => edges.has(key));
      list.forEach(key => edges.delete(key)); return hit;
    },
    endFrame() { edges.clear(); mouse.dx = mouse.dy = 0; },
    requestPointerLock() {
      if (host.requestPointerLock) {
        try { const pending = host.requestPointerLock(); if (pending) pending.catch(() => {}); } catch (_) {}
      }
    }
  };
})(window.SF);
