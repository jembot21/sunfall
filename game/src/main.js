/**
 * Sunfall — Master Game Bootstrap & Main Loop
 *
 * Coordinates initialization and per-frame scheduling:
 * - Bootstraps all subsystems (render, world, city, vehicles, traffic, peds, police, player, missions, hud, audio, save).
 * - Implements fixed-step dt clamped requestAnimationFrame main loop.
 * - Handles pause state and cinematic shot capture modes.
 * - Flushes input transitions via SF.input.endFrame() at the conclusion of every frame.
 * - Exposes window.__SF for testing and debugging.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  // Compatibility polyfills on SF namespace
  if (SF.random && !SF.random.next) {
    SF.random.next = SF.random.value;
  }

  if (SF.input) {
    if (!SF.input.endFrame) {
      SF.input.endFrame = SF.input.update;
    }
    if (!SF.input.clear) {
      SF.input.clear = SF.input.reset;
    }
    if (!SF.input.setPaused) {
      SF.input.setPaused = function (b) {
        SF.input.paused = !!b;
      };
    }
  }

  function init() {
    // 1. Load saved game progression
    if (!(SF.shots && SF.shots.isShotMode) && SF.save && SF.save.load) {
      SF.save.load();
    }

    // 2. Start initial story or side mission
    if (SF.missions && SF.missions.start) {
      SF.missions.start();
    }

    // 3. Staging check for automated screenshots
    if (SF.shots && SF.shots.init) {
      SF.shots.init();
    }

    // Expose root namespace for headless testing
    window.__SF = SF;
  }

  var lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  function animate(now) {
    requestAnimationFrame(animate);

    var dt = (now - lastTime) / 1000.0;
    lastTime = now;

    // Clamp dt to avoid huge simulation leaps on frame drops or tab switching
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 1 / 20)) : 0;

    var isPaused = (SF.hud && SF.hud.isPaused) || (SF.input && SF.input.paused);

    var shotMode = SF.shots && SF.shots.isShotMode;
    if (shotMode) SF.shots.update(dt);

    if (!isPaused && !shotMode) {
      // Per-frame gameplay updates in execution order
      if (SF.player && SF.player.update) {
        SF.player.update(dt);
      }

      if (SF.vehicles && SF.vehicles.update) {
        SF.vehicles.update(dt);
      }

      if (SF.traffic && SF.traffic.update) {
        SF.traffic.update(dt);
      }

      if (SF.peds && SF.peds.update) {
        SF.peds.update(dt);
      }

      if (SF.police && SF.police.update) {
        SF.police.update(dt);
      }

      if (SF.missions && SF.missions.update) {
        SF.missions.update(dt);
      }

      if (SF.world && SF.world.update) {
        SF.world.update(dt);
      }

      if (SF.audio && SF.audio.update) {
        SF.audio.update(dt);
      }
    }

    // UI & Rendering updates
    if (SF.hud && SF.hud.update) {
      SF.hud.update(dt);
    }


    if (SF.render && SF.render.update) {
      var target = (SF.player && SF.player.inCar && SF.player.currentCar) ? SF.player.currentCar.pos : (SF.player ? SF.player.pos : null);
      SF.render.update(dt, target);
    }

    // Flush frame input state (pressed / released transitions)
    if (SF.input) {
      if (SF.input.endFrame) {
        SF.input.endFrame();
      } else if (SF.input.update) {
        SF.input.update();
      }
    }
  }

  // Boot on DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
    requestAnimationFrame(animate);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      requestAnimationFrame(animate);
    });
  }
})();
