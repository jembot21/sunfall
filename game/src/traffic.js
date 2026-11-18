/**
 * Sunfall — Ambient Traffic Subsystem
 *
 * Simulates city vehicular traffic:
 * - Ambient cars cruising along the road network lanes.
 * - Intersection decision-making (straight, left, right) using deterministic PRNG.
 * - Obstacle collision avoidance (stopping when blocked by other vehicles or player).
 * - Distance-based despawning and respawning around the player.
 * - SF.traffic: { group, cars, update(dt) }.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var group = new THREE.Group();
  group.name = 'traffic';

  var trafficCars = [];
  var MAX_TRAFFIC = 20;
  var LANE_OFFSET = 4.0;
  var DESPAWN_DIST = 190.0;
  var SPAWN_MIN_DIST = 75.0;
  var SPAWN_MAX_DIST = 135.0;

  var ROAD_X = (SF.world && SF.world.roadCenters && SF.world.roadCenters.x) || [0, 90, 180, 270, 360, 450, 540, 630, 720];
  var ROAD_Z = (SF.world && SF.world.roadCenters && SF.world.roadCenters.z) || [-360, -270, -180, -90, 0, 90, 180, 270, 360];

  function pickRandom(arr) {
    if (SF.random && SF.random.pick) return SF.random.pick(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomRange(min, max) {
    if (SF.random && SF.random.range) return SF.random.range(min, max);
    return min + Math.random() * (max - min);
  }

  function randomChance(prob) {
    if (SF.random && SF.random.chance) return SF.random.chance(prob);
    return Math.random() < prob;
  }

  function TrafficVehicle() {
    this.car = SF.vehicles.createCar({
      name: 'Sedan',
      isParked: false,
      isOccupied: false
    });

    // Remove from default scene add and place inside traffic group
    if (this.car.mesh.parent) {
      this.car.mesh.parent.remove(this.car.mesh);
    }
    group.add(this.car.mesh);

    this.axis = 'z';           // 'x' for East-West streets, 'z' for North-South avenues
    this.roadCoord = 0;        // Coordinate of the current road centerline
    this.dir = 1;              // +1 or -1
    this.targetSpeed = 14.0;   // Cruising speed
    this.currentSpeed = 12.0;
    this.blocked = false;
    this.lastTurnDist = 999;

    this.resetNearPlayer(true);
  }

  TrafficVehicle.prototype.resetNearPlayer = function (forceRandom) {
    var playerPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 90, y: 0, z: 0 };

    this.axis = randomChance(0.5) ? 'z' : 'x';
    this.dir = randomChance(0.5) ? 1 : -1;
    this.targetSpeed = randomRange(12.0, 18.0);
    this.currentSpeed = this.targetSpeed * 0.8;
    this.lastTurnDist = 999;

    var spawnX, spawnZ, heading;

    if (this.axis === 'z') {
      // Traveling along North-South avenue
      this.roadCoord = pickRandom(ROAD_X);
      spawnX = this.roadCoord + (this.dir === 1 ? LANE_OFFSET : -LANE_OFFSET);

      if (forceRandom) {
        spawnZ = pickRandom(ROAD_Z) + randomRange(-40, 40);
      } else {
        var offsetZ = randomRange(SPAWN_MIN_DIST, SPAWN_MAX_DIST) * (randomChance(0.5) ? 1 : -1);
        spawnZ = playerPos.z + offsetZ;
      }
      heading = (this.dir === 1) ? 0 : Math.PI;
    } else {
      // Traveling along East-West street
      this.roadCoord = pickRandom(ROAD_Z);
      spawnZ = this.roadCoord + (this.dir === 1 ? -LANE_OFFSET : LANE_OFFSET);

      if (forceRandom) {
        spawnX = pickRandom(ROAD_X) + randomRange(-40, 40);
      } else {
        var offsetX = randomRange(SPAWN_MIN_DIST, SPAWN_MAX_DIST) * (randomChance(0.5) ? 1 : -1);
        spawnX = playerPos.x + offsetX;
      }
      heading = (this.dir === 1) ? (Math.PI / 2) : (-Math.PI / 2);
    }

    // Clamp coordinates within world bounds
    var bounds = (SF.world && SF.world.bounds) || { minX: -9, maxX: 729, minZ: -369, maxZ: 369 };
    spawnX = Math.max(bounds.minX + 8, Math.min(bounds.maxX - 8, spawnX));
    spawnZ = Math.max(bounds.minZ + 8, Math.min(bounds.maxZ - 8, spawnZ));

    this.car.pos.set(spawnX, (SF.world && SF.world.groundY ? SF.world.groundY(spawnX, spawnZ) : 0), spawnZ);
    this.car.heading = heading;
    this.car.mesh.rotation.y = heading;
    this.car.speed = this.currentSpeed;
  };

  TrafficVehicle.prototype.checkObstacleAhead = function () {
    var myPos = this.car.pos;
    var fwdX = Math.sin(this.car.heading);
    var fwdZ = Math.cos(this.car.heading);
    var checkDist = 8.0 + this.currentSpeed * this.currentSpeed / 52.0;
    this.aheadDistance = Infinity;

    // Check against player
    if (SF.player && SF.player.pos) {
      var pdx = SF.player.pos.x - myPos.x;
      var pdz = SF.player.pos.z - myPos.z;
      var fwdProj = pdx * fwdX + pdz * fwdZ;
      if (fwdProj > 0 && fwdProj < checkDist) {
        var perpDist = Math.abs(-pdx * fwdZ + pdz * fwdX);
        if (perpDist < 2.5) {
          this.aheadDistance = Math.min(this.aheadDistance, fwdProj);
        }
      }
    }

    // Check against other traffic vehicles
    for (var i = 0; i < trafficCars.length; i++) {
      var other = trafficCars[i];
      if (other === this) continue;

      var odx = other.car.pos.x - myPos.x;
      var odz = other.car.pos.z - myPos.z;
      var proj = odx * fwdX + odz * fwdZ;

      if (proj > 0.5 && proj < checkDist) {
        var perp = Math.abs(-odx * fwdZ + odz * fwdX);
        if (perp < 2.4) {
          this.aheadDistance = Math.min(this.aheadDistance, proj);
        }
      }
    }

    return this.aheadDistance < checkDist;
  };

  TrafficVehicle.prototype.handleIntersections = function () {
    var myPos = this.car.pos;
    var crossingList = (this.axis === 'z') ? ROAD_Z : ROAD_X;
    var currentCoord = (this.axis === 'z') ? myPos.z : myPos.x;

    // Find nearest crossing road
    for (var i = 0; i < crossingList.length; i++) {
      var cross = crossingList[i];
      var dist = Math.abs(currentCoord - cross);

      if (dist < 4.0 && this.lastTurnDist > 14.0) {
        this.lastTurnDist = dist;

        // Roll decision: 65% straight, 17.5% turn right, 17.5% turn left
        var roll = SF.random && SF.random.range ? SF.random.range(0, 1) : Math.random();

        if (roll < 0.35) {
          // Perform turn at intersection
          var turnRight = roll < 0.175;

          if (this.axis === 'z') {
            // Currently on N-S avenue, turning onto E-W street
            this.axis = 'x';
            this.roadCoord = cross;

            if (this.dir === 1) { // Moving +Z
              this.dir = turnRight ? -1 : 1;
            } else {              // Moving -Z
              this.dir = turnRight ? 1 : -1;
            }

            this.car.heading = (this.dir === 1) ? (Math.PI / 2) : (-Math.PI / 2);
            myPos.z = this.roadCoord + (this.dir === 1 ? -LANE_OFFSET : LANE_OFFSET);
          } else {
            // Currently on E-W street, turning onto N-S avenue
            this.axis = 'z';
            this.roadCoord = cross;

            if (this.dir === 1) { // Moving +X
              this.dir = turnRight ? 1 : -1;
            } else {              // Moving -X
              this.dir = turnRight ? -1 : 1;
            }

            this.car.heading = (this.dir === 1) ? 0 : Math.PI;
            myPos.x = this.roadCoord + (this.dir === 1 ? LANE_OFFSET : -LANE_OFFSET);
          }

          this.car.mesh.rotation.y = this.car.heading;
          return;
        }
      }
    }

    this.lastTurnDist += 0.5;
  };

  TrafficVehicle.prototype.update = function (dt) {
    var playerPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 90, y: 0, z: 0 };
    var dx = this.car.pos.x - playerPos.x;
    var dz = this.car.pos.z - playerPos.z;
    var distToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Despawn and recycle if out of range or past city limits
    var bounds = (SF.world && SF.world.bounds) || { minX: -10, maxX: 730, minZ: -370, maxZ: 370 };
    if (distToPlayer > DESPAWN_DIST ||
        this.car.pos.x < bounds.minX || this.car.pos.x > bounds.maxX ||
        this.car.pos.z < bounds.minZ || this.car.pos.z > bounds.maxZ) {
      this.resetNearPlayer(false);
      return;
    }

    // Collision sensor check ahead
    this.blocked = this.checkObstacleAhead();

    // Speed adjustment
    if (this.blocked) {
      this.currentSpeed = Math.max(0, this.currentSpeed - 26.0 * dt);
    } else {
      if (this.currentSpeed < this.targetSpeed) {
        this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + 14.0 * dt);
      }
    }

    // Leave at least 8m center-to-center, even on a slow frame.
    if (dt > 0) this.currentSpeed = Math.min(this.currentSpeed, Math.max(0, this.aheadDistance - 8.0) / dt);
    this.car.speed = this.currentSpeed;

    // Advance vehicle along lane
    var fwdX = Math.sin(this.car.heading);
    var fwdZ = Math.cos(this.car.heading);
    this.car.pos.x += fwdX * this.car.speed * dt;
    this.car.pos.z += fwdZ * this.car.speed * dt;

    if (SF.world && SF.world.groundY) {
      this.car.pos.y = SF.world.groundY(this.car.pos.x, this.car.pos.z);
    }

    // Animate wheels
    var wheelSpin = (this.car.speed / 0.38) * dt;
    for (var w = 0; w < this.car.wheels.length; w++) {
      this.car.wheels[w].rotation.x += wheelSpin;
    }

    // Intersection branch logic
    this.handleIntersections();
  };

  function initTraffic() {
    if (SF.render && SF.render.scene) {
      SF.render.scene.add(group);
    }
    for (var i = 0; i < MAX_TRAFFIC; i++) {
      trafficCars.push(new TrafficVehicle());
    }
  }

  function update(dt) {
    for (var i = 0; i < trafficCars.length; i++) {
      trafficCars[i].update(dt);
    }
  }

  initTraffic();

  SF.traffic = {
    group: group,
    cars: trafficCars,
    update: update
  };
})();
