/**
 * Sunfall — Vehicle Subsystem & Arcade Car Controller
 *
 * Provides:
 * - Car factory creating low-poly vehicles: chassis, cabin with tinted windows,
 *   4 rotating wheels, emissive headlights & taillights.
 * - Arcade car physics: acceleration, braking, reverse, speed-sensitive steering,
 *   handbrake drift, collision response against building colliders and map bounds.
 * - Parked car generator placing vehicles along city street curbs.
 * - SF.vehicles namespace: createCar(options), update(dt), parked array.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  // Polyfill road centers on SF.world if not present
  if (!SF.world) SF.world = {};
  if (!SF.world.roadCenters) {
    SF.world.roadCenters = {
      x: [0, 90, 180, 270, 360, 450, 540, 630, 720],
      z: [-360, -270, -180, -90, 0, 90, 180, 270, 360]
    };
    SF.world.coastX = 0;
  }

  var CAR_PALETTE = [
    0xd63031, // Sunset Crimson
    0xe17055, // Coral Orange
    0xfdcb6e, // Warm Gold
    0x0984e3, // Marina Blue
    0x6c5ce7, // Dusk Violet
    0x2d3436, // Obsidian Black
    0xdfe6e9, // Silver Frost
    0x00b894  // Solano Teal
  ];

  var parkedCars = [];
  var activeCars = [];

  // Shared geometries and materials for efficiency
  var wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 12);
  wheelGeom.rotateZ(Math.PI / 2);
  var wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.8, metalness: 0.2 });

  var glassMat = new THREE.MeshStandardMaterial({
    color: 0x111625,
    roughness: 0.1,
    metalness: 0.85
  });

  var headlightMat = new THREE.MeshStandardMaterial({ color: 0xffe8bd, emissive: 0xffe8bd, emissiveIntensity: 1.5 });
  var taillightMat = new THREE.MeshStandardMaterial({ color: 0xb81020, emissive: 0xff1828, emissiveIntensity: 1.2 });

  /**
   * Constructs a 3D car model group
   */
  function buildCarMesh(paintColor, isPolice) {
    var group = new THREE.Group();
    group.name = isPolice ? 'police_car' : 'civilian_car';

    // Body material
    var bodyColor = paintColor || CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
    var bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.35,
      metalness: 0.4
    });

    // Lower chassis
    var chassisGeom = new THREE.BoxGeometry(2.1, 0.65, 4.4);
    var chassis = new THREE.Mesh(chassisGeom, bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Upper cabin
    var cabinGeom = new THREE.BoxGeometry(1.75, 0.55, 2.3);
    var cabin = new THREE.Mesh(cabinGeom, isPolice ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }) : bodyMat);
    cabin.position.set(0, 1.1, -0.2);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    group.add(cabin);

    // Windshield & windows (slightly protruding slabs with glass mat)
    var glassFrontGeom = new THREE.BoxGeometry(1.68, 0.48, 0.08);
    var glassFront = new THREE.Mesh(glassFrontGeom, glassMat);
    glassFront.position.set(0, 1.1, 0.96);
    glassFront.rotation.x = -0.25;
    group.add(glassFront);

    var glassRearGeom = new THREE.BoxGeometry(1.68, 0.48, 0.08);
    var glassRear = new THREE.Mesh(glassRearGeom, glassMat);
    glassRear.position.set(0, 1.1, -1.36);
    glassRear.rotation.x = 0.25;
    group.add(glassRear);

    var glassSideGeom = new THREE.BoxGeometry(1.78, 0.44, 2.0);
    var glassSide = new THREE.Mesh(glassSideGeom, glassMat);
    glassSide.position.set(0, 1.1, -0.2);
    group.add(glassSide);

    // 4 Wheels
    var wheels = [];
    var wheelPositions = [
      { x: -0.98, y: 0.38, z: 1.35 },  // Front Left
      { x: 0.98, y: 0.38, z: 1.35 },   // Front Right
      { x: -0.98, y: 0.38, z: -1.35 }, // Rear Left
      { x: 0.98, y: 0.38, z: -1.35 }   // Rear Right
    ];

    for (var i = 0; i < wheelPositions.length; i++) {
      var wMesh = new THREE.Mesh(wheelGeom, wheelMat);
      wMesh.position.set(wheelPositions[i].x, wheelPositions[i].y, wheelPositions[i].z);
      wMesh.castShadow = true;
      group.add(wMesh);
      wheels.push(wMesh);
    }

    // Headlights (emissive boxes)
    var hlGeom = new THREE.BoxGeometry(0.35, 0.16, 0.1);
    var hlL = new THREE.Mesh(hlGeom, headlightMat);
    hlL.position.set(-0.75, 0.6, 2.22);
    group.add(hlL);

    var hlR = new THREE.Mesh(hlGeom, headlightMat);
    hlR.position.set(0.75, 0.6, 2.22);
    group.add(hlR);

    // Taillights
    var tlGeom = new THREE.BoxGeometry(0.35, 0.14, 0.1);
    var tlL = new THREE.Mesh(tlGeom, taillightMat);
    tlL.position.set(-0.75, 0.62, -2.22);
    group.add(tlL);

    var tlR = new THREE.Mesh(tlGeom, taillightMat);
    tlR.position.set(0.75, 0.62, -2.22);
    group.add(tlR);

    // Police lightbar if specified
    var lightbar = null;
    if (isPolice) {
      lightbar = new THREE.Group();
      var barBaseGeom = new THREE.BoxGeometry(1.2, 0.12, 0.28);
      var barBase = new THREE.Mesh(barBaseGeom, wheelMat);
      barBase.position.set(0, 1.42, -0.2);
      lightbar.add(barBase);

      var lightGeom = new THREE.BoxGeometry(0.48, 0.15, 0.24);
      var redMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
      var blueMat = new THREE.MeshBasicMaterial({ color: 0x1155ff });

      var lightRed = new THREE.Mesh(lightGeom, redMat);
      lightRed.position.set(-0.3, 1.48, -0.2);
      lightbar.add(lightRed);

      var lightBlue = new THREE.Mesh(lightGeom, blueMat);
      lightBlue.position.set(0.3, 1.48, -0.2);
      lightbar.add(lightBlue);

      group.add(lightbar);
      group.policeLightRed = lightRed;
      group.policeLightBlue = lightBlue;
    }

    return {
      mesh: group,
      wheels: wheels,
      bodyMat: bodyMat,
      lightbar: lightbar
    };
  }

  /**
   * Arcade Car Controller
   */
  function Car(options) {
    options = options || {};
    this.color = options.color || CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
    this.isPolice = !!options.isPolice;
    this.name = options.name || (this.isPolice ? 'Police Cruiser' : 'Torino GT');

    var model = buildCarMesh(this.color, this.isPolice);
    this.mesh = model.mesh;
    this.wheels = model.wheels;
    this.lightbar = model.lightbar;

    this.pos = this.mesh.position;
    this.pos.set(options.x || 0, options.y || 0, options.z || 0);

    this.heading = options.heading || 0; // Angle in radians around Y
    this.mesh.rotation.y = this.heading;

    this.speed = 0;            // Forward/backward scalar velocity
    this.steerAngle = 0;       // Steering wheel angle
    this.driftFactor = 0;      // Lateral sliding ratio
    this.pitch = 0;
    this.roll = 0;

    this.radius = 1.6;         // Collision radius
    this.isParked = !!options.isParked;
    this.isOccupied = !!options.isOccupied;

    // Tuning constants from SF.CONFIG.PHYSICS
    var phys = (SF.CONFIG && SF.CONFIG.PHYSICS) || {};
    this.accelRate = phys.VEHICLE_ACCEL || 32.0;
    this.maxSpeed = phys.VEHICLE_MAX_SPEED || 46.0;
    this.reverseMaxSpeed = phys.VEHICLE_REVERSE_SPEED || 14.0;
    this.brakeRate = phys.VEHICLE_BRAKE || 52.0;
    this.steerRate = phys.VEHICLE_STEER_RATE || 2.8;
    this.friction = phys.VEHICLE_FRICTION || 1.2;

    if (SF.render && SF.render.scene) {
      SF.render.scene.add(this.mesh);
    }
  }

  Car.prototype.accelerate = function (dt) {
    if (this.speed < 0) {
      this.speed += this.brakeRate * dt;
      if (this.speed > 0) this.speed = 0;
    } else {
      this.speed += this.accelRate * dt;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    }
  };

  Car.prototype.reverse = function (dt) {
    if (this.speed > 0) {
      this.speed -= this.brakeRate * dt;
      if (this.speed < 0) this.speed = 0;
    } else {
      this.speed -= (this.accelRate * 0.6) * dt;
      if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
    }
  };

  Car.prototype.brake = function (dt) {
    if (this.speed > 0) {
      this.speed -= this.brakeRate * dt;
      if (this.speed < 0) this.speed = 0;
    } else if (this.speed < 0) {
      this.speed += this.brakeRate * dt;
      if (this.speed > 0) this.speed = 0;
    }
  };

  Car.prototype.steer = function (dir, dt) {
    // dir: -1 for left, +1 for right
    var speedRatio = Math.min(1.0, Math.abs(this.speed) / 10.0);
    var highSpeedDamping = Math.max(0.4, 1.0 - (Math.abs(this.speed) / (this.maxSpeed * 1.5)));
    var targetSteer = -dir * this.steerRate * highSpeedDamping;

    // Apply yaw rotation when vehicle is in motion
    var moveSign = this.speed >= 0 ? 1 : -1;
    this.heading += targetSteer * moveSign * speedRatio * dt;
    this.steerAngle = -dir * 0.45;
  };

  Car.prototype.handbrake = function (dt) {
    // Handbrake triggers lateral slip and tight turning
    this.driftFactor = Math.min(1.0, this.driftFactor + 4.0 * dt);
    if (Math.abs(this.speed) > 4.0) {
      this.speed *= (1.0 - 0.9 * dt);
    }
  };

  Car.prototype.update = function (dt) {
    // Decay drift factor when handbrake is released
    this.driftFactor = Math.max(0, this.driftFactor - 3.0 * dt);

    // Natural friction
    if (Math.abs(this.speed) > 0.01) {
      var drag = this.friction * (1.0 + Math.abs(this.speed) * 0.02);
      if (this.speed > 0) {
        this.speed -= drag * dt;
        if (this.speed < 0) this.speed = 0;
      } else {
        this.speed += drag * dt;
        if (this.speed > 0) this.speed = 0;
      }
    } else {
      this.speed = 0;
    }

    // Compute forward motion vector
    var forwardX = Math.sin(this.heading);
    var forwardZ = Math.cos(this.heading);

    this.pos.x += forwardX * this.speed * dt;
    this.pos.z += forwardZ * this.speed * dt;

    // Clamp to terrain surface
    if (SF.world && SF.world.groundY) {
      this.pos.y = SF.world.groundY(this.pos.x, this.pos.z);
    }

    // Apply rotation
    this.mesh.rotation.y = this.heading;

    // Animate wheels
    var wheelSpin = (this.speed / 0.38) * dt;
    for (var i = 0; i < this.wheels.length; i++) {
      this.wheels[i].rotation.x += wheelSpin;
      // Front wheels turn with steer angle
      if (i < 2) {
        this.wheels[i].rotation.y = this.steerAngle;
      }
    }
    // Return steer angle smoothly to center
    this.steerAngle *= Math.max(0, 1.0 - 10.0 * dt);

    // Collision response against city building colliders
    if (SF.city && SF.city.colliders) {
      var colls = SF.city.colliders;
      for (var c = 0; c < colls.length; c++) {
        var col = colls[c];
        var dx = this.pos.x - col.x;
        var dz = this.pos.z - col.z;
        var minDist = col.r + this.radius;

        // Fast bounding box check before distance calculation
        if (Math.abs(dx) < minDist && Math.abs(dz) < minDist) {
          var distSq = dx * dx + dz * dz;
          if (distSq < minDist * minDist && distSq > 0.0001) {
            var dist = Math.sqrt(distSq);
            var overlap = minDist - dist;
            var nx = dx / dist;
            var nz = dz / dist;

            // Push vehicle out of building
            this.pos.x += nx * overlap;
            this.pos.z += nz * overlap;

            // Dampen speed and bounce slightly
            this.speed *= -0.3;
          }
        }
      }
    }

    // World boundary limits
    if (SF.world && SF.world.bounds) {
      var b = SF.world.bounds;
      if (this.pos.x > b.maxX - 4) {
        this.pos.x = b.maxX - 4;
        this.speed = 0;
      }
      if (this.pos.z < b.minZ + 4) {
        this.pos.z = b.minZ + 4;
        this.speed = 0;
      }
      if (this.pos.z > b.maxZ - 4) {
        this.pos.z = b.maxZ - 4;
        this.speed = 0;
      }
      // Ocean boundary
      if (this.pos.x < -38) {
        this.pos.x = -38;
        this.speed *= 0.5;
      }
    }
  };

  /**
   * Spawns a vehicle
   */
  function createCar(options) {
    var car = new Car(options);
    activeCars.push(car);
    return car;
  }

  /**
   * Spawns stationary parked vehicles along curbs across Solano Bay
   */
  function spawnParkedCars() {
    var roadX = (SF.world && SF.world.roadCenters && SF.world.roadCenters.x) || [0, 90, 180, 270, 360, 450, 540, 630, 720];
    var roadZ = (SF.world && SF.world.roadCenters && SF.world.roadCenters.z) || [-360, -270, -180, -90, 0, 90, 180, 270, 360];

    // Dario's starting borrowed car near the safehouse
    var starter = createCar({
      name: 'Torino GT',
      color: 0xe17055, // Coral Orange
      x: 6.5,
      z: 25.0,
      heading: 0,
      isParked: true
    });
    parkedCars.push(starter);

    // Array of curbside parked positions
    var parkSlots = [
      { x: 6.5, z: -110, h: 0, col: 0x0984e3 },
      { x: -6.5, z: 140, h: Math.PI, col: 0xfdcb6e },
      { x: 96.5, z: -35, h: 0, col: 0xd63031 },
      { x: 83.5, z: 65, h: Math.PI, col: 0x6c5ce7 },
      { x: 186.5, z: 120, h: 0, col: 0x2d3436 },
      { x: 173.5, z: -160, h: Math.PI, col: 0x00b894 },
      { x: 276.5, z: 45, h: 0, col: 0xdfe6e9 },
      { x: 263.5, z: -75, h: Math.PI, col: 0xe17055 },
      { x: 366.5, z: 190, h: 0, col: 0xfdcb6e },
      { x: 456.5, z: -210, h: 0, col: 0xd63031 },
      { x: 546.5, z: 80, h: 0, col: 0x0984e3 }
    ];

    for (var i = 0; i < parkSlots.length; i++) {
      var slot = parkSlots[i];
      var car = createCar({
        x: slot.x,
        z: slot.z,
        heading: slot.h,
        color: slot.col,
        isParked: true
      });
      parkedCars.push(car);
    }
  }

  function update(dt) {
    for (var i = 0; i < activeCars.length; i++) {
      if (activeCars[i].isOccupied) {
        activeCars[i].update(dt);
      }
    }
  }

  // Populate parked cars
  spawnParkedCars();

  SF.vehicles = {
    createCar: createCar,
    update: update,
    parked: parkedCars,
    active: activeCars,
    Car: Car
  };
})();
