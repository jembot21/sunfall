(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  const held = new Set(), edges = new Set();
  SF.input = {
    locked: false, yaw: 0, pitch: 0,
    isDown(code) { return held.has(code); },
    pressed(code) { const yes = edges.has(code); edges.delete(code); return yes; },
    edge(code) { return this.pressed(code); },
    endFrame() { edges.clear(); },
    clear() { held.clear(); edges.clear(); },
    lock() { const canvas = SF.renderer?.domElement || document.querySelector('canvas'); const p = canvas?.requestPointerLock?.(); p?.catch?.(() => {}); },
    unlock() { document.exitPointerLock?.(); }
  };
  window.addEventListener('keydown', e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
    if (!held.has(e.code) && !e.repeat) edges.add(e.code);
    held.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', () => SF.input.clear());
  document.addEventListener('pointerlockchange', () => { SF.input.locked = !!document.pointerLockElement; });
  document.addEventListener('mousemove', e => {
    if (!SF.input.locked) return;
    SF.input.yaw -= e.movementX * 0.0022;
    SF.input.pitch = Math.max(-1.05, Math.min(0.72, SF.input.pitch - e.movementY * 0.0022));
  });
  window.addEventListener('mousedown', e => {
    const code = 'Mouse' + e.button;
    if (!held.has(code)) edges.add(code);
    held.add(code);
  });
  window.addEventListener('mouseup', e => held.delete('Mouse' + e.button));
})();
