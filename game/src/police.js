/**
 * Sunfall — Police & Wanted System
 *
 * Simulates Solano Bay law enforcement:
 * - 0–5 Star Wanted levels based on accumulated criminal heat.
 * - Dynamic spawning and pursuit behavior of high-speed police cruisers.
 * - Flashing alternating red/blue roof lightbars and converging roadblock tactics.
 * - Line-of-sight occlusion check against building colliders for heat cooldown.
 * - BUSTED mechanic: meter fills when boxed in or stopped near police.
 * - SF.police: { wanted, heat, addHeat(n), update(dt), bustedMeter, state, cars }.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var group = new THREE.Group();
  group.name = 'police';

  var policeCars = [];
  var MAX_POLICE_UNITS = 5;

  var heat = 0;
  var wanted = 0;
  var bustedMeter = 0;
  var unseenTimer = 0;
  var lightbarTimer = 0;
  var isPlayerBusted = false;

  var THRESHOLDS = (SF.CONFIG && SF.CONFIG.WANTED && SF.CONFIG.WANTED.THRESHOLDS) || [0, 80, 240, 500, 900, 1500];

  function recomputeWantedLevel() {
    var newLevel = 0;
    for (var i = THRESHOLDS.length - 1; i >= 0; i--) {
      if (heat >= THRESHOLDS[i]) {
        newLevel = i;
        break;
      }
    }
    wanted = newLevel;
  }

  function addHeat(amount) {
    heat = Math.min(1800, heat + amount);
    recomputeWantedLevel();
    unseenTimer = 0;
  }

  function PoliceUnit() {
    this.car = SF.vehicles.createCar({
      name: 'Police Cruiser',
      isPolice: true,
      color: 0x111116,
      isParked: false,
      isOccupied: false
    });

    // Custom paint scheme: black body with white side doors
    if (this.car.mesh) {
      var doorGeom = new THREE.BoxGeometry(1.8, 0.58, 1.8);
      var doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      var doorDecal = new THREE.Mesh(doorGeom, doorMat);
      doorDecal.position.set(0, 0.58, 0);
      this.car.mesh.add(doorDecal);
    }

    this.active = false;
    this.car.mesh.visible = false;
    this.targetSpeed = 28.0;
  }

  PoliceUnit.prototype.spawnNearPlayer = function () {
    var playerPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 0, y: 0, z: 0 };
    var angle = Math.random() * Math.PI * 2;
    var dist = 65.0 + Math.random() * 45.0;

    var sx = playerPos.x + Math.cos(angle) * dist;
    var sz = playerPos.z + Math.sin(angle) * dist;

    // Snap to nearest road center if available
    var roadX = (SF.world && SF.world.roadCenters && SF.world.roadCenters.x) || [0, 90, 180, 270, 360];
    var roadZ = (SF.world && SF.world.roadCenters && SF.world.roadCenters.z) || [0, 90, 180, 270, 360];

    // Find nearest road coordinate
    var bestX = roadX[0];
    var bestXDist = 999;
    for (var i = 0; i < roadX.length; i++) {
      var d = Math.abs(sx - roadX[i]);
      if (d < bestXDist) { bestXDist = d; bestX = roadX[i]; }
    }

    var bestZ = roadZ[0];
    var bestZDist = 999;
    for (var j = 0; j < roadZ.length; j++) {
      var dz = Math.abs(sz - roadZ[j]);
      if (dz < bestZDist) { bestZDist = dz; bestZ = roadZ[j]; }
    }

    if (bestXDist < bestZDist) {
      sx = bestX + (Math.random() < 0.5 ? 4.0 : -4.0);
    } else {
      sz = bestZ + (Math.random() < 0.5 ? 4.0 : -4.0);
    }

    this.car.pos.set(sx, (SF.world && SF.world.groundY ? SF.world.groundY(sx, sz) : 0), sz);

    // Face toward player
    var dx = playerPos.x - sx;
    var dz = playerPos.z - sz;
    this.car.heading = Math.atan2(dx, dz);
    this.car.mesh.rotation.y = this.car.heading;
    this.car.speed = 12.0;

    this.active = true;
    this.car.mesh.visible = true;
  };

  PoliceUnit.prototype.despawn = function () {
    this.active = false;
    this.car.mesh.visible = false;
    this.car.speed = 0;
    this.car.pos.set(0, -50, 0);
  };

  PoliceUnit.prototype.update = function (dt, playerPos) {
    if (!this.active) return;

    var dx = playerPos.x - this.car.pos.x;
    var dz = playerPos.z - this.car.pos.z;
    var dist = Math.sqrt(dx * dx + dz * dz);

    // If unit fell far behind, recycle closer to player
    if (dist > 180.0) {
      this.spawnNearPlayer();
      return;
    }

    // Steering toward target player
    var desiredAngle = Math.atan2(dx, dz);
    var angleDiff = desiredAngle - this.car.heading;

    // Normalize angle to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    var steerInput = Math.max(-1, Math.min(1, angleDiff * 2.2));
    this.car.steer(steerInput, dt);

    // Throttle control
    var targetSpeed = 24.0 + (wanted * 2.5);
    if (dist < 6.0) {
      // Ram / roadblock close approach
      if (this.car.speed > 8.0) {
        this.car.brake(dt);
      } else {
        this.car.accelerate(dt);
      }
    } else {
      if (this.car.speed < targetSpeed) {
        this.car.accelerate(dt);
      }
    }

    this.car.update(dt);
  };

  /**
   * Approximate line-of-sight test between two points against building colliders
   */
  function hasLineOfSight(x1, z1, x2, z2) {
    if (!SF.city || !SF.city.colliders) return true;

    var colls = SF.city.colliders;
    var dx = x2 - x1;
    var dz = z2 - z1;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 2.0) return true;

    var dirX = dx / dist;
    var dirZ = dz / dist;

    // Check intersection with each building collider
    for (var i = 0; i < colls.length; i++) {
      var c = colls[i];
      // Vector from p1 to circle center
      var cx = c.x - x1;
      var cz = c.z - z1;
      var t = cx * dirX + cz * dirZ;

      if (t > 0 && t < dist) {
        var perpX = cx - (t * dirX);
        var perpZ = cz - (t * dirZ);
        var perpDistSq = perpX * perpX + perpZ * perpZ;

        if (perpDistSq < (c.r * 0.9) * (c.r * 0.9)) {
          return false; // Line of sight is blocked by building
        }
      }
    }

    return true;
  }

  function initPolice() {
    if (SF.render && SF.render.scene) {
      SF.render.scene.add(group);
    }
    for (var i = 0; i < MAX_POLICE_UNITS; i++) {
      policeCars.push(new PoliceUnit());
    }
  }

  function update(dt) {
    var playerPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 0, y: 0, z: 0 };
    var playerSpeed = SF.player ? (SF.player.inCar && SF.player.currentCar ? Math.abs(SF.player.currentCar.speed) : (SF.player.speed || 0)) : 0;

    // Maintain unit count according to current wanted level
    var requiredUnits = wanted;
    var activeUnits = 0;

    for (var i = 0; i < policeCars.length; i++) {
      if (policeCars[i].active) {
        activeUnits++;
      }
    }

    if (activeUnits < requiredUnits) {
      for (var k = 0; k < policeCars.length; k++) {
        if (!policeCars[k].active) {
          policeCars[k].spawnNearPlayer();
          activeUnits++;
          if (activeUnits >= requiredUnits) break;
        }
      }
    } else if (activeUnits > requiredUnits) {
      for (var m = policeCars.length - 1; m >= 0; m--) {
        if (policeCars[m].active) {
          policeCars[m].despawn();
          activeUnits--;
          if (activeUnits <= requiredUnits) break;
        }
      }
    }

    // Animate lightbars
    lightbarTimer += dt * Math.PI * 2 * SF.CONFIG.WANTED.LIGHTBAR_BLINK_RATE;
    var redBright = (Math.sin(lightbarTimer) > 0);

    for (var u = 0; u < policeCars.length; u++) {
      var unit = policeCars[u];
      if (unit.active) {
        unit.update(dt, playerPos);

        if (unit.car.mesh && unit.car.mesh.policeLightRed) {
          unit.car.mesh.policeLightRed.material.color.setHex(redBright ? 0xff2222 : 0x440000);
          unit.car.mesh.policeLightBlue.material.color.setHex(redBright ? 0x001144 : 0x2266ff);
        }
      }
    }

    // BUSTED check: close to police cruiser while slow or on foot
    var playerCloseToCop = false;
    var copSeesPlayer = false;

    if (wanted > 0) {
      for (var c = 0; c < policeCars.length; c++) {
        var cop = policeCars[c];
        if (!cop.active) continue;

        var cdx = playerPos.x - cop.car.pos.x;
        var cdz = playerPos.z - cop.car.pos.z;
        var distToCop = Math.sqrt(cdx * cdx + cdz * cdz);

        if (distToCop < 6.2) {
          playerCloseToCop = true;
        }

        if (distToCop < 75.0) {
          if (hasLineOfSight(cop.car.pos.x, cop.car.pos.z, playerPos.x, playerPos.z)) {
            copSeesPlayer = true;
          }
        }
      }

      // If boxed in or cornered
      if (playerCloseToCop && playerSpeed < 2.5) {
        bustedMeter += dt * 0.45;
        if (bustedMeter >= 1.0 && !isPlayerBusted) {
          isPlayerBusted = true;
          bustedMeter = 1.0;
          if (SF.player && SF.player.respawn) {
            SF.player.respawn('busted');
          }
        }
      } else {
        bustedMeter = Math.max(0, bustedMeter - dt * 0.5);
      }

      // Heat cooldown logic: when unseen by any officer
      if (!copSeesPlayer) {
        unseenTimer += dt;
        if (unseenTimer > 3.5) {
          heat = Math.max(0, heat - 45.0 * dt);
          recomputeWantedLevel();
        }
      } else {
        unseenTimer = 0;
      }
    } else {
      bustedMeter = 0;
      isPlayerBusted = false;
    }
  }

  initPolice();

  SF.police = {
    get wanted() { return wanted; },
    set wanted(w) { wanted = w; },
    get heat() { return heat; },
    set heat(h) { heat = h; recomputeWantedLevel(); },
    get bustedMeter() { return bustedMeter; },
    get state() { return isPlayerBusted ? 'busted' : (wanted > 0 ? 'pursuit' : 'calm'); },
    addHeat: addHeat,
    resetHeat: function () {
      heat = 0;
      wanted = 0;
      bustedMeter = 0;
      isPlayerBusted = false;
      for (var i = 0; i < policeCars.length; i++) {
        policeCars[i].despawn();
      }
    },
    cars: policeCars,
    update: update
  };
})();
