/**
 * Sunfall — Input Handling Subsystem
 *
 * Captures keyboard and mouse events, maps raw keys to high-level game actions,
 * provides edge detection (pressed / released), and supports optional pointer lock.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var ACTION_KEY_MAP = {
    forward: ['KeyW', 'ArrowUp'],
    backward: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyF', 'KeyE'],
    jump: ['Space'],
    handbrake: ['Space'],
    pause: ['Escape', 'KeyP']
  };

  var keyState = {};
  var actionPressed = {};
  var actionReleased = {};
  var actionDown = {};

  var mouseButtons = { 0: false, 1: false, 2: false };
  var mousePressed = { 0: false, 1: false, 2: false };
  var mouseReleased = { 0: false, 1: false, 2: false };

  var mousePos = { x: 0, y: 0, dx: 0, dy: 0 };
  var pointerLocked = false;

  function recomputeActionDown(action) {
    var keys = ACTION_KEY_MAP[action];
    if (!keys) return false;
    for (var i = 0; i < keys.length; i++) {
      if (keyState[keys[i]]) return true;
    }
    return false;
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    var code = e.code;
    keyState[code] = true;

    // Check action edge transitions
    for (var action in ACTION_KEY_MAP) {
      if (ACTION_KEY_MAP.hasOwnProperty(action)) {
        var keys = ACTION_KEY_MAP[action];
        if (keys.indexOf(code) !== -1) {
          if (!actionDown[action]) {
            actionDown[action] = true;
            actionPressed[action] = true;
          }
        }
      }
    }

    // Prevent default scrolling for game keys
    if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    var code = e.code;
    keyState[code] = false;

    // Check action release
    for (var action in ACTION_KEY_MAP) {
      if (ACTION_KEY_MAP.hasOwnProperty(action)) {
        var keys = ACTION_KEY_MAP[action];
        if (keys.indexOf(code) !== -1) {
          var stillDown = recomputeActionDown(action);
          if (!stillDown && actionDown[action]) {
            actionDown[action] = false;
            actionReleased[action] = true;
          }
        }
      }
    }
  }

  function onMouseMove(e) {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    mousePos.dx += e.movementX || 0;
    mousePos.dy += e.movementY || 0;
  }

  function onMouseDown(e) {
    var btn = e.button;
    if (!mouseButtons[btn]) {
      mousePressed[btn] = true;
    }
    mouseButtons[btn] = true;

    // Edge map shoot (left) and aim (right)
    if (btn === 0) {
      if (!actionDown.shoot) {
        actionDown.shoot = true;
        actionPressed.shoot = true;
      }
    } else if (btn === 2) {
      if (!actionDown.aim) {
        actionDown.aim = true;
        actionPressed.aim = true;
      }
    }
  }

  function onMouseUp(e) {
    var btn = e.button;
    if (mouseButtons[btn]) {
      mouseReleased[btn] = true;
    }
    mouseButtons[btn] = false;

    if (btn === 0) {
      actionDown.shoot = false;
      actionReleased.shoot = true;
    } else if (btn === 2) {
      actionDown.aim = false;
      actionReleased.aim = true;
    }
  }

  function onContextMenu(e) {
    // Prevent right-click browser menu to allow seamless aiming
    if (e.target && e.target.tagName === 'CANVAS') e.preventDefault();
  }

  function onPointerLockChange() {
    pointerLocked = (document.pointerLockElement !== null && document.pointerLockElement !== undefined);
  }

  function resetAll() {
    for (var k in keyState) keyState[k] = false;
    for (var a in actionDown) {
      actionDown[a] = false;
      actionPressed[a] = false;
      actionReleased[a] = false;
    }
    for (var b in mouseButtons) {
      mouseButtons[b] = false;
      mousePressed[b] = false;
      mouseReleased[b] = false;
    }
    mousePos.dx = 0;
    mousePos.dy = 0;
  }

  // Bind window listeners immediately
  window.addEventListener('keydown', onKeyDown, false);
  window.addEventListener('keyup', onKeyUp, false);
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('mousedown', onMouseDown, false);
  window.addEventListener('mouseup', onMouseUp, false);
  window.addEventListener('contextmenu', onContextMenu, false);
  window.addEventListener('blur', resetAll, false);
  document.addEventListener('pointerlockchange', onPointerLockChange, false);

  SF.input = {
    // Current continuous state of an action
    isDown: function (action) {
      return !!actionDown[action];
    },

    // Edge detection: true only in the frame the action was triggered
    pressed: function (action) {
      return !!actionPressed[action];
    },

    // Edge detection: true only in the frame the action was released
    released: function (action) {
      return !!actionReleased[action];
    },

    // Mouse query interface
    mouse: {
      get x() { return mousePos.x; },
      get y() { return mousePos.y; },
      get dx() { return mousePos.dx; },
      get dy() { return mousePos.dy; },
      isDown: function (btn) {
        return !!mouseButtons[btn];
      },
      pressed: function (btn) {
        return !!mousePressed[btn];
      },
      released: function (btn) {
        return !!mouseReleased[btn];
      },
      get locked() {
        return pointerLocked;
      }
    },

    // Pointer lock utilities
    requestPointerLock: function (element) {
      var target = element || document.body;
      if (target.requestPointerLock) {
        target.requestPointerLock();
      }
    },

    exitPointerLock: function () {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    },

    isPointerLocked: function () {
      return pointerLocked;
    },

    // Called once at the end of each game frame loop to flush edge transitions
    update: function () {
      for (var a in actionPressed) {
        actionPressed[a] = false;
      }
      for (var r in actionReleased) {
        actionReleased[r] = false;
      }
      for (var b in mousePressed) {
        mousePressed[b] = false;
        mouseReleased[b] = false;
      }
      mousePos.dx = 0;
      mousePos.dy = 0;
    },

    reset: resetAll
  };
})();
