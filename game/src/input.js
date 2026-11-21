(function (root) {
  'use strict';
  var SF = root.SF = root.SF || {};
  var down = Object.create(null), pressed = Object.create(null), mousePressed = false;
  var pointer = { locked: false, yaw: 0, pitch: 0, dx: 0, dy: 0, sensitivity: 0.0022 };
  var bound = false;

  function setDown(code, value) {
    if (!code) return;
    if (value && !down[code]) pressed[code] = true;
    down[code] = !!value;
  }
  function onPointerLock() {
    pointer.locked = !!(root.document && root.document.pointerLockElement);
  }
  function bind(target) {
    if (bound || !root.document) return SF.input;
    target = target || root.document;
    root.document.addEventListener('keydown', function (e) {
      setDown(e.code || e.key, true);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
    });
    root.document.addEventListener('keyup', function (e) { setDown(e.code || e.key, false); });
    root.document.addEventListener('mousedown', function () { mousePressed = true; });
    root.document.addEventListener('mouseup', function () { mousePressed = false; });
    root.document.addEventListener('mousemove', function (e) {
      if (!pointer.locked) return;
      var mx = Number(e.movementX) || 0, my = Number(e.movementY) || 0;
      pointer.dx += mx; pointer.dy += my;
      pointer.yaw -= mx * pointer.sensitivity;
      pointer.pitch = Math.max(-1.45, Math.min(1.45, pointer.pitch - my * pointer.sensitivity));
    });
    root.document.addEventListener('pointerlockchange', onPointerLock);
    if (target && target !== root.document && target.addEventListener) {
      target.addEventListener('click', function () {
        if (target.requestPointerLock) target.requestPointerLock();
      });
    }
    bound = true;
    return SF.input;
  }
  function lock(target) {
    target = target || (root.document && root.document.body);
    if (target && target.requestPointerLock) target.requestPointerLock();
  }
  function unlock() {
    if (root.document && root.document.exitPointerLock) root.document.exitPointerLock();
    pointer.locked = false;
  }
  SF.input = {
    get moveX() { return (down.KeyD || down.ArrowRight ? 1 : 0) - (down.KeyA || down.ArrowLeft ? 1 : 0); },
    get moveZ() { return (down.KeyW || down.ArrowUp ? 1 : 0) - (down.KeyS || down.ArrowDown ? 1 : 0); },
    get run() { return !!(down.ShiftLeft || down.ShiftRight); },
    get brake() { return !!down.Space; },
    get interact() { return !!down.KeyF; },
    get attack() { return mousePressed; },
    get aim() { return !!down.KeyQ; },
    get aimHeading() { return pointer.yaw + Math.PI; },
    get weapon() { return down.Digit2 ? 'pistol' : down.Digit1 ? 'melee' : null; },
    get locked() { return pointer.locked; },
    get yaw() { return pointer.yaw; },
    set yaw(v) { pointer.yaw = Number(v) || 0; },
    get pitch() { return pointer.pitch; },
    set pitch(v) { pointer.pitch = Math.max(-1.45, Math.min(1.45, Number(v) || 0)); },
    state: pointer,
    bind: bind,
    lock: lock,
    unlock: unlock,
    isDown: function (code) { return !!down[code]; },
    wasPressed: function (code) { return !!pressed[code]; },
    consumePressed: function (code) { var v = !!pressed[code]; delete pressed[code]; return v; },
    pressed: function (code) { return SF.input.consumePressed(code); },
    mouseDown: function () { return mousePressed; },
    consumeMouse: function () { var v = mousePressed; mousePressed = false; return v; },
    consumeLook: function () { var v = { x: pointer.dx, y: pointer.dy, yaw: pointer.yaw, pitch: pointer.pitch }; pointer.dx = pointer.dy = 0; return v; },
    clearEdges: function () { pressed = Object.create(null); },
    _setDown: setDown
  };
  if (root.document) bind();
})(globalThis);
