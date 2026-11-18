/**
 * Sunfall — Pedestrian Subsystem
 *
 * Populates sidewalks with walking citizens:
 * - Low-poly figures with varied sunset-themed clothing colors.
 * - Natural sidewalk wandering and animated walking cadence.
 * - Reactive panic state: fleeing from gunshots, punches, or car crashes.
 * - Collision detection with player vehicles.
 * - SF.peds: { group, update(dt), scare(x, z, r) }.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var group = new THREE.Group();
  group.name = 'peds';

  var pedList = [];
  var MAX_PEDS = 28;
  var DESPAWN_DIST = 130.0;
  var SPAWN_MIN_DIST = 35.0;
  var SPAWN_MAX_DIST = 85.0;

  var SHIRT_COLORS = [
    0xff7675, // Sunset pink
    0x74b9ff, // Sky blue
    0x55efc4, // Mint teal
    0xffeaa7, // Warm cream
    0xfdcb6e, // Gold
    0xa29bfe, // Lavender
    0xe17055, // Terracotta
    0xffffff  // Crisp white
  ];

  var SKIN_TONES = [
    0xedd4b2, 0xd8a373, 0x8c5b3e, 0x56382d
  ];

  var bodyGeom = new THREE.CylinderGeometry(0.26, 0.22, 1.05, 8);
  bodyGeom.translate(0, 0.85, 0);

  var headGeom = new THREE.SphereGeometry(0.2, 8, 8);
  headGeom.translate(0, 1.55, 0);

  var legGeom = new THREE.BoxGeometry(0.38, 0.45, 0.3);
  legGeom.translate(0, 0.22, 0);
  var legMat = new THREE.MeshStandardMaterial({ color: 0x222633, roughness: 0.8 });

  var ROAD_X = (SF.world && SF.world.roadCenters && SF.world.roadCenters.x) || [0, 90, 180, 270, 360, 450, 540, 630, 720];
  var ROAD_Z = (SF.world && SF.world.roadCenters && SF.world.roadCenters.z) || [-360, -270, -180, -90, 0, 90, 180, 270, 360];

  function Pedestrian() {
    this.mesh = new THREE.Group();

    var shirtColor = SF.random.pick(SHIRT_COLORS);
    var skinColor = SF.random.pick(SKIN_TONES);

    var shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    var skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });

    var body = new THREE.Mesh(bodyGeom, shirtMat);
    body.castShadow = true;
    this.mesh.add(body);

    var head = new THREE.Mesh(headGeom, skinMat);
    head.castShadow = true;
    this.mesh.add(head);

    var legs = new THREE.Mesh(legGeom, legMat);
    legs.castShadow = true;
    this.mesh.add(legs);

    group.add(this.mesh);

    this.pos = this.mesh.position;
    this.heading = 0;
    this.speed = 1.8;
    this.state = 'walk'; // 'walk', 'flee', 'down'
    this.fleeTimer = 0;
    this.walkAnimTimer = Math.random() * 10;
    this.isDead = false;

    this.respawn(true);
  }

  Pedestrian.prototype.respawn = function (forceRandom) {
    var playerPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 10, y: 0, z: 10 };

    this.state = 'walk';
    this.fleeTimer = 0;
    this.isDead = false;
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;

    var rx = ROAD_X[Math.floor(Math.random() * ROAD_X.length)];
    var rz = ROAD_Z[Math.floor(Math.random() * ROAD_Z.length)];

    // Place on sidewalk curb offset (approx 11m from road center)
    var isNorthSouth = Math.random() < 0.5;
    var sx, sz;

    if (isNorthSouth) {
      sx = rx + (Math.random() < 0.5 ? 11.0 : -11.0);
      sz = forceRandom ? (rz + (Math.random() * 80 - 40)) : (playerPos.z + (Math.random() * 70 - 35) + (Math.random() < 0.5 ? 45 : -45));
      this.heading = (Math.random() < 0.5) ? 0 : Math.PI;
    } else {
      sz = rz + (Math.random() < 0.5 ? 11.0 : -11.0);
      sx = forceRandom ? (rx + (Math.random() * 80 - 40)) : (playerPos.x + (Math.random() * 70 - 35) + (Math.random() < 0.5 ? 45 : -45));
      this.heading = (Math.random() < 0.5) ? (Math.PI / 2) : (-Math.PI / 2);
    }

    var bounds = (SF.world && SF.world.bounds) || { minX: -10, maxX: 730, minZ: -370, maxZ: 370 };
    sx = Math.max(bounds.minX + 4, Math.min(bounds.maxX - 4, sx));
    sz = Math.max(bounds.minZ + 4, Math.min(bounds.maxZ - 4, sz));

    var sy = (SF.world && SF.world.groundY) ? SF.world.groundY(sx, sz) : 0;
    this.pos.set(sx, sy, sz);
    this.speed = 1.6 + Math.random() * 0.8;
  };

  Pedestrian.prototype.fleeFrom = function (x, z) {
    if (this.isDead) return;
    this.state = 'flee';
    this.fleeTimer = 5.0 + Math.random() * 3.0;

    // Direct heading away from source
    var dx = this.pos.x - x;
    var dz = this.pos.z - z;
    this.heading = Math.atan2(dx, dz);
    this.speed = 5.8 + Math.random() * 1.6;
  };

  Pedestrian.prototype.knockdown = function () {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'down';
    this.speed = 0;

    // Tip figure flat on the ground
    this.mesh.rotation.x = Math.PI / 2;
    this.pos.y = ((SF.world && SF.world.groundY) ? SF.world.groundY(this.pos.x, this.pos.z) : 0) + 0.15;

    // Report criminal heat to police
    if (SF.police && SF.police.addHeat) {
      SF.police.addHeat(90);
    }
  };

  Pedestrian.prototype.update = function (dt) {
    var playerPos = (SF.player && SF.player.pos) ? SF.player.pos : { x: 0, y: 0, z: 0 };
    var dx = this.pos.x - playerPos.x;
    var dz = this.pos.z - playerPos.z;
    var distToPlayer = Math.sqrt(dx * dx + dz * dz);

    if (distToPlayer > DESPAWN_DIST) {
      this.respawn(false);
      return;
    }

    if (this.state === 'down') {
      return;
    }

    if (this.state === 'flee') {
      this.fleeTimer -= dt;
      if (this.fleeTimer <= 0) {
        this.state = 'walk';
        this.speed = 1.8 + Math.random() * 0.6;
      }
    } else {
      // Occasional gentle wander drift
      if (Math.random() < 0.02) {
        this.heading += (Math.random() - 0.5) * 0.4;
      }
    }

    // Step forward
    var fwdX = Math.sin(this.heading);
    var fwdZ = Math.cos(this.heading);

    this.pos.x += fwdX * this.speed * dt;
    this.pos.z += fwdZ * this.speed * dt;

    if (SF.world && SF.world.groundY) {
      this.pos.y = SF.world.groundY(this.pos.x, this.pos.z);
    }

    this.mesh.rotation.y = this.heading;

    // Walk bobbing animation
    this.walkAnimTimer += dt * (this.state === 'flee' ? 16.0 : 8.0);
    this.mesh.position.y += Math.abs(Math.sin(this.walkAnimTimer)) * 0.08;

    // Check collision with player vehicle
    if (SF.player && SF.player.inCar && SF.player.currentCar) {
      var car = SF.player.currentCar;
      var cdx = this.pos.x - car.pos.x;
      var cdz = this.pos.z - car.pos.z;
      var cDist = Math.sqrt(cdx * cdx + cdz * cdz);

      if (cDist < 2.0 && Math.abs(car.speed) > 3.0) {
        this.knockdown();
      }
    }
  };

  function initPeds() {
    if (SF.render && SF.render.scene) {
      SF.render.scene.add(group);
    }
    for (var i = 0; i < MAX_PEDS; i++) {
      pedList.push(new Pedestrian());
    }
  }

  function scare(x, z, r) {
    r = r || 24.0;
    var rSq = r * r;
    for (var i = 0; i < pedList.length; i++) {
      var p = pedList[i];
      var dx = p.pos.x - x;
      var dz = p.pos.z - z;
      if (dx * dx + dz * dz < rSq) {
        p.fleeFrom(x, z);
      }
    }
  }

  function update(dt) {
    for (var i = 0; i < pedList.length; i++) {
      pedList[i].update(dt);
    }
  }

  initPeds();

  SF.peds = {
    group: group,
    peds: pedList,
    update: update,
    scare: scare
  };
})();
