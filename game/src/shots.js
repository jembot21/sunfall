/**
 * Sunfall — Automated Screenshot & Cinematic Staging Subsystem
 *
 * Staging harness for headless or visual screenshot capture:
 * - Detects ?shot=<name>&seed=<n> URL parameters.
 * - Reseeds PRNG for reproducible deterministic visuals.
 * - Bypasses start screen and interaction gating.
 * - Stages cinematic scenes:
 *     - 'chase': High-speed police cruiser pursuit downtown at sunset.
 *     - 'downtown': Street-level view among towering illuminated skyscrapers with traffic.
 *     - 'coast': Sports car cruising the palm-lined Ocean Boulevard against the setting sun.
 *     - 'end': Dario standing at the Solano Safehouse at dusk.
 * - Sets window.__SHOT_READY = true once rendering stabilizes.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var isShotMode = false;
  var currentShot = null;
  var frameCount = 0;
  var staged = false;

  function getQueryParam(name) {
    if (typeof window === 'undefined' || !window.location || !window.location.search) {
      return null;
    }
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function init() {
    var shot = getQueryParam('shot');
    if (!shot) return;

    isShotMode = true;
    currentShot = shot;

    var seed = getQueryParam('seed') || '1';
    if (SF.random && SF.random.reseed) {
      SF.random.reseed(parseInt(seed, 10) || seed);
    }

    // Dismiss start screen overlay
    var startOverlay = document.getElementById('start-screen');
    if (startOverlay) {
      startOverlay.classList.add('hidden');
    }
    SF.started = true;

    // Hide any unwanted mission text
    var banner = document.getElementById('mission-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  function stageScene() {
    if (staged) return;
    staged = true;

    var player = SF.player;
    var camera = SF.render ? SF.render.camera : null;

    if (currentShot === 'chase') {
      // High-speed downtown police chase
      var car = SF.vehicles.createCar({
        name: 'Torino GT',
        color: 0xe17055,
        x: 360.0,
        z: 30.0,
        heading: 0
      });
      car.speed = 34.0;

      if (player) {
        player.enterVehicle(car);
        player.pos.copy(car.pos);
        if (player.mesh) player.mesh.visible = false;
      }

      if (SF.police) {
        SF.police.wanted = 3;
        SF.police.heat = 650;

        // Stage 2 cruisers in close pursuit
        if (SF.police.cars && SF.police.cars.length >= 2) {
          var cop1 = SF.police.cars[0];
          cop1.active = true;
          cop1.car.mesh.visible = true;
          cop1.car.pos.set(356.5, 0, 20.0);
          cop1.car.heading = 0.08;
          cop1.car.mesh.rotation.y = cop1.car.heading;
          cop1.car.speed = 32.0;

          var cop2 = SF.police.cars[1];
          cop2.active = true;
          cop2.car.mesh.visible = true;
          cop2.car.pos.set(364.0, 0, 12.0);
          cop2.car.heading = -0.06;
          cop2.car.mesh.rotation.y = cop2.car.heading;
          cop2.car.speed = 33.0;
        }
      }

      if (camera) {
        camera.position.set(350.0, 5.5, 48.0);
        camera.lookAt(360.0, 1.0, 23.0);
      }
    } else if (currentShot === 'downtown') {
      // Street-level architecture and traffic
      if (player) {
        player.pos.set(360.0, 0, 5.0);
        player.mesh.rotation.y = 0.3;
        if (player.mesh) player.mesh.visible = true;
      }

      // Add a couple parked/traffic cars nearby
      SF.traffic.cars[0].car.pos.set(356.0, 0, 9.0);
      SF.traffic.cars[0].car.heading = Math.PI;
      SF.traffic.cars[0].car.mesh.rotation.y = Math.PI;
      SF.vehicles.createCar({ color: 0xfdcb6e, x: 364.5, z: 25.0, heading: 0 });

      if (camera) {
        camera.position.set(352.0, 2.4, -7.0);
        camera.lookAt(360.0, 2.2, 8.0);
      }
    } else if (currentShot === 'coast') {
      // Coastal boulevard with palms and ocean at sunset
      var coastCar = SF.vehicles.createCar({
        name: 'Torino GT',
        color: 0x0984e3,
        x: 4.0,
        z: 108.0,
        heading: 0
      });

      if (player) {
        player.enterVehicle(coastCar);
        player.pos.copy(coastCar.pos);
        if (player.mesh) player.mesh.visible = false;
      }

      if (camera) {
        // Looking West-Southwest across car towards palms, beach, and sunset sun
        camera.position.set(14.0, 3.8, 98.0);
        camera.lookAt(-8.0, 2.8, 112.0);
      }
    } else if (currentShot === 'end') {
      // Safehouse at dusk
      if (player) {
        player.enterVehicle(null);
        player.cash = 1240;
        player.pistolUnlocked = true;
        player.pos.set(14.0, 0, 30.0);
        player.mesh.rotation.y = Math.PI;
        if (player.mesh) player.mesh.visible = true;
      }

      SF.missions.enterFreeRoam();
      SF.police.resetHeat();
      var bannerEl = document.getElementById('mission-banner');
      if (bannerEl) bannerEl.classList.add('hidden');

      if (camera) {
        camera.position.set(12.5, 1.9, 23.5);
        camera.lookAt(14.0, 1.4, 30.0);
      }
    }
  }

  function update(dt) {
    if (!isShotMode) return;

    if (!staged) {
      stageScene();
    }

    frameCount++;

    // Wait 4 frames for geometries, textures, and renderer matrices to fully stabilize
    if (frameCount >= 4 && !window.__SHOT_READY) {
      window.__SHOT_READY = true;
    }
  }

  // Automatically check URL parameters on load
  init();

  SF.shots = {
    init: init,
    update: update,
    get isShotMode() { return isShotMode; }
  };
})();
