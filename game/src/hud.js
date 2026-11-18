/**
 * Sunfall — Heads-Up Display (HUD) & Minimap Subsystem
 *
 * Coordinates:
 * - DOM binding: health & armor gauges, cash display, wanted stars (1–5).
 * - Mission briefing banners and notifications with auto-fade timers.
 * - Dynamic speedometer and vehicle title widget.
 * - Start screen, pause overlay, and busted/wasted screen integration.
 * - Circular 2D minimap radar:
 *   - Renders street grid, coastlines, and ocean.
 *   - Player orientation marker (center white chevron).
 *   - Gold glowing objective beacon.
 *   - Green food stand blip, white safehouse blip, and red police patrol blips.
 * - SF.hud: { update(dt), showBanner(title, text), hideBanner(), refreshSaveButtons() }.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  // DOM Elements
  var cashEl = document.getElementById('cash-display');
  var healthFillEl = document.getElementById('health-fill');
  var armorFillEl = document.getElementById('armor-fill');
  var wantedStarsContainer = document.getElementById('wanted-stars');
  var stars = wantedStarsContainer ? wantedStarsContainer.querySelectorAll('.star') : [];

  var missionBannerEl = document.getElementById('mission-banner');
  var missionTitleEl = document.getElementById('mission-title');
  var missionDescEl = document.getElementById('mission-desc');

  var vehicleHudEl = document.getElementById('vehicle-hud');
  var vehicleSpeedEl = document.getElementById('vehicle-speed');
  var vehicleNameEl = document.getElementById('vehicle-name');

  var startScreenEl = document.getElementById('start-screen');
  var pauseOverlayEl = document.getElementById('pause-overlay');
  var wastedOverlayEl = document.getElementById('wasted-overlay');
  var bustedOverlayEl = document.getElementById('busted-overlay');

  var minimapCanvas = document.getElementById('minimap-canvas');
  var ctx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  var bannerTimer = 0;
  var isPaused = false;

  // Food and safehouse world locations
  var FOOD_STAND_POS = { x: 0, z: 0 };
  var SAFEHOUSE_POS = { x: 14.0, z: 32.0 };

  // Setup click to play on start screen
  if (startScreenEl) {
    startScreenEl.addEventListener('click', function () {
      startScreenEl.classList.add('hidden');
      if (SF.audio && SF.audio.init) {
        SF.audio.init();
      }
      if (SF.input && SF.input.requestPointerLock) {
        SF.input.requestPointerLock();
      }
      SF.started = true;
    }, false);
  }

  // Pause key detection (ESC or P)
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (startScreenEl && !startScreenEl.classList.contains('hidden')) return;
      togglePause();
    }
  }, false);

  function togglePause() {
    isPaused = !isPaused;
    if (pauseOverlayEl) {
      if (isPaused) {
        pauseOverlayEl.classList.remove('hidden');
      } else {
        pauseOverlayEl.classList.add('hidden');
      }
    }
    if (SF.input && SF.input.setPaused) {
      SF.input.setPaused(isPaused);
    }
  }

  function showBanner(title, text, duration) {
    if (!missionBannerEl) return;
    if (missionTitleEl) missionTitleEl.textContent = title || 'Mission';
    if (missionDescEl) missionDescEl.textContent = text || '';
    missionBannerEl.classList.remove('hidden');
    bannerTimer = duration || 6.0;
  }

  function hideBanner() {
    if (missionBannerEl) {
      missionBannerEl.classList.add('hidden');
    }
    bannerTimer = 0;
  }

  function formatCash(val) {
    val = Math.max(0, Math.floor(val));
    var str = ('000000' + val).slice(-6);
    return '$' + str;
  }

  /**
   * Draws the circular radar minimap
   */
  function renderMinimap() {
    if (!ctx || !minimapCanvas) return;

    var w = minimapCanvas.width;
    var h = minimapCanvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var radius = cx - 2;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Circular clip path
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark radar background
    ctx.fillStyle = '#100c18';
    ctx.fillRect(0, 0, w, h);

    var player = SF.player;
    var position = player && player.inCar && player.currentCar ? player.currentCar.pos : (player && player.pos);
    var px = position ? position.x : 0;
    var pz = position ? position.z : 0;
    var heading = (player && player.inCar && player.currentCar) ? player.currentCar.heading : ((player && player.heading) || 0);

    // Transform world coordinates relative to player center and rotation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI + heading);

    var scale = 0.58; // Minimap zoom factor (pixels per meter)

    // 1. Draw Ocean along the West
    var bounds = SF.world.bounds;
    var oceanEdge = (-bounds.beachWidth - px) * scale;
    ctx.fillStyle = '#152f4a';
    ctx.fillRect(-800, -800, oceanEdge + 800, 1600);

    // 2. Draw Sandy Shore
    var coastEdge = (0.0 - px) * scale;
    ctx.fillStyle = '#7a6240';
    ctx.fillRect(oceanEdge, -800, Math.max(0, coastEdge - oceanEdge), 1600);

    // 3. Draw Road Grid
    var roadX = SF.world.roadCenters.x;
    var roadZ = SF.world.roadCenters.z;

    ctx.fillStyle = '#666172';
    var roadHalfW = SF.CONFIG.GRID.ROAD_WIDTH * 0.5 * scale;

    // North-South Avenues
    for (var i = 0; i < roadX.length; i++) {
      var rx = (roadX[i] - px) * scale;
      ctx.fillRect(rx - roadHalfW, (bounds.minZ - pz) * scale, roadHalfW * 2, (bounds.maxZ - bounds.minZ) * scale);
    }

    // East-West Streets
    for (var j = 0; j < roadZ.length; j++) {
      var rz = (roadZ[j] - pz) * scale;
      ctx.fillRect((bounds.minX - px) * scale, rz - roadHalfW, (bounds.maxX - bounds.minX) * scale, roadHalfW * 2);
    }

    // 4. Food Stand Blip (Green)
    var fx = (FOOD_STAND_POS.x - px) * scale;
    var fz = (FOOD_STAND_POS.z - pz) * scale;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(fx, fz, 5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Safehouse Blip (White)
    var sx = (SAFEHOUSE_POS.x - px) * scale;
    var sz = (SAFEHOUSE_POS.z - pz) * scale;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sz, 5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Objective Blip (Gold Beacon)
    if (SF.missions && SF.missions.markerPos) {
      var mPos = SF.missions.markerPos;
      var mx = (mPos.x - px) * scale;
      var mz = (mPos.z - pz) * scale;

      // Clamp blip to radar edge if outside screen
      var mDist = Math.sqrt(mx * mx + mz * mz);
      var maxBlipDist = radius - 8;
      if (mDist > maxBlipDist) {
        mx = (mx / mDist) * maxBlipDist;
        mz = (mz / mDist) * maxBlipDist;
      }

      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(mx, mz, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 7. Police Patrol Blips (Red)
    if (SF.police && SF.police.cars) {
      ctx.fillStyle = '#ff3344';
      for (var c = 0; c < SF.police.cars.length; c++) {
        var cop = SF.police.cars[c];
        if (!cop.active) continue;

        var cxPos = (cop.car.pos.x - px) * scale;
        var czPos = (cop.car.pos.z - pz) * scale;
        var cDist = Math.sqrt(cxPos * cxPos + czPos * czPos);
        if (cDist < radius - 4) {
          ctx.beginPath();
          ctx.arc(cxPos, czPos, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // Center Player Chevron (Pointing Up)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff9a3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Outer ring accent
    ctx.restore();
  }

  function update(dt) {
    var player = SF.player;

    // Update Cash
    if (cashEl && player) {
      cashEl.textContent = formatCash(player.cash);
    }

    // Update Health & Armor
    if (healthFillEl && player) {
      healthFillEl.style.width = Math.max(0, Math.min(100, player.health)) + '%';
    }
    if (armorFillEl && player) {
      armorFillEl.style.width = Math.max(0, Math.min(100, player.armor)) + '%';
    }

    // Update Wanted Stars
    var currentWanted = (SF.police && SF.police.wanted) || 0;
    for (var s = 0; s < stars.length; s++) {
      var starNum = parseInt(stars[s].getAttribute('data-star'), 10);
      if (starNum <= currentWanted) {
        stars[s].classList.add('active');
      } else {
        stars[s].classList.remove('active');
      }
    }

    // Update Vehicle HUD
    if (vehicleHudEl && player) {
      if (player.inCar && player.currentCar) {
        vehicleHudEl.style.display = 'block';
        var speedMph = Math.round(Math.abs(player.currentCar.speed) * 2.23694);
        if (vehicleSpeedEl) vehicleSpeedEl.textContent = speedMph + ' MPH';
        if (vehicleNameEl) vehicleNameEl.textContent = player.currentCar.name || 'Torino GT';
      } else {
        vehicleHudEl.style.display = 'none';
      }
    }

    // Auto-fade banner timer
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) {
        hideBanner();
      }
    }

    renderMinimap();
  }

  SF.hud = {
    update: update,
    showBanner: showBanner,
    hideBanner: hideBanner,
    refreshSaveButtons: function () {},
    togglePause: togglePause,
    get isPaused() { return isPaused; }
  };
})();
