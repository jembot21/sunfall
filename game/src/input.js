(function () {
  var keys = Object.create(null);
  var edges = Object.create(null);
  var lookDX = 0;
  var lookDY = 0;
  var locked = false;
  var canvas = document.getElementById('game');
  var codes = {
    forward: ['KeyW','ArrowUp'], back: ['KeyS','ArrowDown'], left: ['KeyA','ArrowLeft'], right: ['KeyD','ArrowRight'],
    sprint: ['ShiftLeft','ShiftRight'], jump: ['Space'], enter: ['KeyE','KeyF'], attack: [], reload: ['KeyR'],
    weapon1: ['Digit1'], weapon2: ['Digit2'], weapon3: ['Digit3'], weapon4: ['Digit4'], weapon5: ['Digit5'],
    radio: ['KeyN'], map: ['KeyM'], pause: ['Escape','KeyP']
  };
  var reverse = Object.create(null);
  Object.keys(codes).forEach(function (action) { codes[action].forEach(function (code) { reverse[code] = action; }); });
  function prevent(code) { return !!reverse[code] || code === 'Space'; }
  window.addEventListener('keydown', function (event) {
    var action = reverse[event.code];
    if (prevent(event.code)) event.preventDefault();
    if (action && !keys[action]) edges[action] = true;
    if (action) keys[action] = true;
  });
  window.addEventListener('keyup', function (event) {
    var action = reverse[event.code];
    if (action) keys[action] = false;
  });
  canvas.addEventListener('click', function () {
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock) canvas.requestPointerLock();
  });
  document.getElementById('start-screen').addEventListener('click', function () {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  });
  canvas.addEventListener('mousedown', function (event) {
    if (event.button === 0 && document.pointerLockElement === canvas) {
      if (!keys.attack) edges.attack = true;
      keys.attack = true;
    }
  });
  window.addEventListener('mouseup', function (event) { if (event.button === 0) keys.attack = false; });
  window.addEventListener('blur', function () { Object.keys(keys).forEach(function (action) { keys[action] = false; }); });
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  document.addEventListener('mousemove', function (event) {
    if (document.pointerLockElement === canvas) { lookDX += event.movementX || 0; lookDY += event.movementY || 0; }
  });
  document.addEventListener('pointerlockchange', function () { locked = document.pointerLockElement === canvas; });
  document.addEventListener('pointerlockerror', function () { locked = false; });
  SF.input = {
    // Support action names and the physical codes used by the player module.
    isDown: function (action) { return !!keys[reverse[action] || action]; },
    pressed: function (action) { action = reverse[action] || action; var wasPressed = !!edges[action]; edges[action] = false; return wasPressed; },
    get lookDX() { return lookDX; },
    get lookDY() { return lookDY; },
    get locked() { return locked; },
    clearLook: function () { lookDX = 0; lookDY = 0; }
  };
}());
