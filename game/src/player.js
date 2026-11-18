/**
 * Sunfall — Dario Venn Character & Player Controller
 *
 * Implements:
 * - Dario character model: sunset floral shirt, jeans, animated limbs, holster/pistol.
 * - Fluid on-foot locomotion (walk, sprint, jump/dodge) relative to 3rd-person camera.
 * - Vehicle hijacking and entering/exiting with speed gating.
 * - Combat system: melee punch and unlockable pistol hitscan tracer line.
 * - Interaction zones: $25 healing food stand and safehouse saving.
 * - Death & arrest cycle with hospital/police station respawns and cash forfeiture.
 * - SF.player namespace.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var mesh = new THREE.Group();
  mesh.name = 'player_dario';

  var pos = mesh.position;
  pos.set(8.0, 0, 20.0); // Starting on Solano Beach boulevard

  var health = 100;
  var armor = 100;
  var cash = 80; // Starts with $80
  var pistolUnlocked = false;
  var pistolEquipped = false;
  var inCar = false;
  var currentCar = null;

  var camYaw = 0;
  var camPitch = 0.22;
  var camDist = 6.2;
  var camTarget = new THREE.Vector3();

  var moveSpeed = 0;
  var charHeading = 0;
  var isPunching = false;
  var punchTimer = 0;
  var shootCooldown = 0;
  var animTimer = 0;
  var isRespawning = false;

  // Interaction locations
  var FOOD_STAND_POS = { x: 0, z: 0 };
  var SAFEHOUSE_POS = { x: 14.0, z: 32.0 };
  var HOSPITAL_POS = { x: 180.0, z: -90.0 };
  var POLICE_STATION_POS = { x: 270.0, z: 90.0 };

  // Limbs references for walking/punching animation
  var torso, head, armL, armR, legL, legR, gunMesh, muzzleFlash;

  function buildDarioModel() {
    // Torso in sunset coral-orange floral shirt
    mesh.scale.setScalar(1.08);
    var torsoGeom = new THREE.BoxGeometry(0.62, 0.68, 0.36);
    var shirtMat = new THREE.MeshStandardMaterial({
      color: 0xff7034, // Sunset orange
      roughness: 0.65
    });
    torso = new THREE.Mesh(torsoGeom, shirtMat);
    torso.position.y = 1.08;
    torso.castShadow = true;
    mesh.add(torso);

    // Head
    var headGeom = new THREE.SphereGeometry(0.22, 10, 10);
    var skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a373, roughness: 0.7 });
    head = new THREE.Mesh(headGeom, skinMat);
    head.position.y = 1.54;
    head.castShadow = true;
    mesh.add(head);

    // Hair
    var hairGeom = new THREE.BoxGeometry(0.42, 0.18, 0.44);
    var hairMat = new THREE.MeshStandardMaterial({ color: 0x1d1a24, roughness: 0.9 });
    var hair = new THREE.Mesh(hairGeom, hairMat);
    hair.position.set(0, 1.66, -0.04);
    mesh.add(hair);

    // Arms
    var armGeom = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    armL = new THREE.Mesh(armGeom, skinMat);
    armL.position.set(-0.42, 0.92, 0);
    armL.castShadow = true;
    mesh.add(armL);

    armR = new THREE.Mesh(armGeom, skinMat);
    armR.position.set(0.42, 0.92, 0);
    armR.castShadow = true;
    mesh.add(armR);

    // Pistol in right hand
    var gunGeom = new THREE.BoxGeometry(0.1, 0.16, 0.32);
    var gunMat = new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 });
    gunMesh = new THREE.Mesh(gunGeom, gunMat);
    gunMesh.position.set(0, -0.32, 0.16);
    gunMesh.visible = false;
    armR.add(gunMesh);

    // Muzzle flash point
    var flashGeom = new THREE.SphereGeometry(0.15, 6, 6);
    var flashMat = new THREE.MeshBasicMaterial({ color: 0xffe277 });
    muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
    muzzleFlash.position.set(0, -0.32, 0.36);
    muzzleFlash.visible = false;
    armR.add(muzzleFlash);

    // Legs in denim blue
    var legGeom = new THREE.BoxGeometry(0.24, 0.82, 0.28);
    var jeansMat = new THREE.MeshStandardMaterial({ color: 0x2a3b5c, roughness: 0.85 });
    legL = new THREE.Mesh(legGeom, jeansMat);
    legL.position.set(-0.16, 0.41, 0);
    legL.castShadow = true;
    mesh.add(legL);

    legR = new THREE.Mesh(legGeom, jeansMat);
    legR.position.set(0.16, 0.41, 0);
    legR.castShadow = true;
    mesh.add(legR);
  }

  buildDarioModel();

  if (SF.render && SF.render.scene) {
    SF.render.scene.add(mesh);
  }

  // Keyboard shortcut listener for Q (equip/holster pistol) and R (eat meal / save)
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyQ') {
      if (pistolUnlocked) {
        pistolEquipped = !pistolEquipped;
        if (gunMesh) gunMesh.visible = pistolEquipped;
        if (SF.hud && SF.hud.showBanner) {
          SF.hud.showBanner('Weapon', pistolEquipped ? '9mm Pistol Drawn' : 'Pistol Holstered');
        }
      }
    } else if (e.code === 'KeyR') {
      handleInteractR();
    }
  }, false);

  function handleInteractR() {
    if (inCar) return;

    // Check food stand
    var fdx = pos.x - FOOD_STAND_POS.x;
    var fdz = pos.z - FOOD_STAND_POS.z;
    if (Math.sqrt(fdx * fdx + fdz * fdz) < 6.0) {
      if (cash >= 25) {
        cash -= 25;
        health = 100;
        if (SF.hud && SF.hud.showBanner) {
          SF.hud.showBanner('Solano Diner', 'Ate a Cuban Sandwich ($25). Health fully restored!');
        }
      } else {
        if (SF.hud && SF.hud.showBanner) {
          SF.hud.showBanner('Solano Diner', 'Need $25 for a meal!');
        }
      }
      return;
    }

    // Check safehouse
    var sdx = pos.x - SAFEHOUSE_POS.x;
    var sdz = pos.z - SAFEHOUSE_POS.z;
    if (Math.sqrt(sdx * sdx + sdz * sdz) < 7.0) {
      if (SF.save && SF.save.store) {
        SF.save.store();
        if (SF.hud && SF.hud.showBanner) {
          SF.hud.showBanner('Solano Hideout', 'Game progress saved successfully.');
        }
      }
    }
  }

  function hurt(amount) {
    if (isRespawning) return;

    if (armor > 0) {
      var armorAbsorb = Math.min(armor, amount * 0.7);
      armor -= armorAbsorb;
      amount -= armorAbsorb;
    }

    health = Math.max(0, health - amount);

    if (health <= 0) {
      respawn('wasted');
    }
  }

  function addCash(amount) {
    cash = Math.max(0, cash + amount);
  }

  function respawn(reason) {
    if (isRespawning) return;
    isRespawning = true;

    // Exit vehicle if inside
    if (inCar && currentCar) {
      currentCar.isOccupied = false;
      inCar = false;
      currentCar = null;
      mesh.visible = true;
    }

    // Cash penalty: up to $150
    var penalty = Math.min(cash, 150);
    cash -= penalty;

    // Reset police heat
    if (SF.police && SF.police.resetHeat) {
      SF.police.resetHeat();
    }

    // Show overlay
    var overlayId = (reason === 'busted') ? 'busted-overlay' : 'wasted-overlay';
    var overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.classList.remove('hidden');
    }

    setTimeout(function () {
      health = 100;
      armor = 50;

      if (reason === 'busted') {
        pos.set(POLICE_STATION_POS.x, (SF.world && SF.world.groundY ? SF.world.groundY(POLICE_STATION_POS.x, POLICE_STATION_POS.z) : 0), POLICE_STATION_POS.z);
      } else {
        pos.set(HOSPITAL_POS.x, (SF.world && SF.world.groundY ? SF.world.groundY(HOSPITAL_POS.x, HOSPITAL_POS.z) : 0), HOSPITAL_POS.z);
      }

      if (overlay) {
        overlay.classList.add('hidden');
      }

      isRespawning = false;
    }, 2800);
  }

  function toggleVehicle() {
    if (inCar) {
      // Exit vehicle only if traveling at low speed
      if (currentCar && Math.abs(currentCar.speed) < 7.0) {
        inCar = false;
        currentCar.isOccupied = false;

        // Place Dario safely outside driver side door
        var sideX = -Math.cos(currentCar.heading) * 2.2;
        var sideZ = Math.sin(currentCar.heading) * 2.2;
        pos.set(currentCar.pos.x + sideX, currentCar.pos.y, currentCar.pos.z + sideZ);

        mesh.visible = true;
        currentCar = null;
      }
    } else {
      // Find nearest parked or stopped vehicle within interaction range
      var bestCar = null;
      var bestDist = 4.2;

      // Check parked cars
      if (SF.vehicles && SF.vehicles.parked) {
        for (var i = 0; i < SF.vehicles.parked.length; i++) {
          var pc = SF.vehicles.parked[i];
          var pdx = pc.pos.x - pos.x;
          var pdz = pc.pos.z - pos.z;
          var pDist = Math.sqrt(pdx * pdx + pdz * pdz);
          if (pDist < bestDist) {
            bestDist = pDist;
            bestCar = pc;
          }
        }
      }

      // Check traffic cars
      if (!bestCar && SF.traffic && SF.traffic.cars) {
        for (var t = 0; t < SF.traffic.cars.length; t++) {
          var tc = SF.traffic.cars[t].car;
          var tdx = tc.pos.x - pos.x;
          var tdz = tc.pos.z - pos.z;
          var tDist = Math.sqrt(tdx * tdx + tdz * tdz);
          if (tDist < bestDist && Math.abs(tc.speed) < 5.0) {
            bestDist = tDist;
            bestCar = tc;
          }
        }
      }

      if (bestCar) enterVehicle(bestCar);
    }
  }

  function enterVehicle(car) {
    if (currentCar) currentCar.isOccupied = false;
    currentCar = car;
    inCar = !!car;
    mesh.visible = !inCar;
    if (car) {
      car.isOccupied = true;
      car.isParked = false;
      pos.copy(car.pos);
      charHeading = car.heading;
    }
  }

  function performPunch() {
    if (isPunching || inCar) return;
    isPunching = true;
    punchTimer = 0.28;

    if (SF.audio && SF.audio.punch) {
      SF.audio.punch();
    }

    // Hit detection forward
    var fwdX = Math.sin(charHeading);
    var fwdZ = Math.cos(charHeading);
    var hitDist = 2.4;

    // Check pedestrians
    if (SF.peds && SF.peds.peds) {
      for (var i = 0; i < SF.peds.peds.length; i++) {
        var ped = SF.peds.peds[i];
        var dx = ped.pos.x - pos.x;
        var dz = ped.pos.z - pos.z;
        var proj = dx * fwdX + dz * fwdZ;

        if (proj > 0 && proj < hitDist) {
          var perp = Math.abs(-dx * fwdZ + dz * fwdX);
          if (perp < 1.4) {
            ped.knockdown();
            if (SF.police && SF.police.addHeat) SF.police.addHeat(40);
            return;
          }
        }
      }
    }
  }

  function performPistolShot() {
    if (shootCooldown > 0 || inCar || !pistolEquipped) return;
    shootCooldown = 0.32;

    if (SF.audio && SF.audio.shot) {
      SF.audio.shot();
    }

    if (muzzleFlash) {
      muzzleFlash.visible = true;
      setTimeout(function () { muzzleFlash.visible = false; }, 60);
    }

    // Scare nearby pedestrians
    if (SF.peds && SF.peds.scare) {
      SF.peds.scare(pos.x, pos.z, 36.0);
    }

    // Tracer line
    var startPos = new THREE.Vector3(pos.x, pos.y + 1.2, pos.z);
    var aimDir = new THREE.Vector3(Math.sin(camYaw), -camPitch * 0.5, Math.cos(camYaw)).normalize();
    var hitTarget = startPos.clone().add(aimDir.clone().multiplyScalar(45.0));

    // Hitscan check against peds
    if (SF.peds && SF.peds.peds) {
      for (var p = 0; p < SF.peds.peds.length; p++) {
        var ped = SF.peds.peds[p];
        var pdx = ped.pos.x - pos.x;
        var pdz = ped.pos.z - pos.z;
        var dot = pdx * aimDir.x + pdz * aimDir.z;
        if (dot > 0 && dot < 45.0) {
          var perp = Math.abs(-pdx * aimDir.z + pdz * aimDir.x);
          if (perp < 1.2) {
            ped.knockdown();
            hitTarget.set(ped.pos.x, ped.pos.y + 1.0, ped.pos.z);
            if (SF.police && SF.police.addHeat) SF.police.addHeat(120);
            break;
          }
        }
      }
    }

    // Temporary tracer beam mesh
    var tracerGeom = new THREE.BufferGeometry().setFromPoints([startPos, hitTarget]);
    var tracerMat = new THREE.LineBasicMaterial({ color: 0xffdd44, linewidth: 2 });
    var tracerLine = new THREE.Line(tracerGeom, tracerMat);
    if (SF.render && SF.render.scene) {
      SF.render.scene.add(tracerLine);
      setTimeout(function () {
        if (SF.render && SF.render.scene) SF.render.scene.remove(tracerLine);
      }, 70);
    }
  }

  function updateCamera(dt) {
    var camera = SF.render ? SF.render.camera : null;
    if (!camera) return;

    // Mouse look rotation
    if (SF.input && SF.input.mouse) {
      var dx = SF.input.mouse.dx || 0;
      var dy = SF.input.mouse.dy || 0;
      var mouseSens = 0.0028;

      camYaw -= dx * mouseSens;
      camPitch = Math.max(-0.25, Math.min(0.85, camPitch + dy * mouseSens));
    }

    var targetPos = inCar && currentCar ? currentCar.pos : pos;

    if (inCar && currentCar) {
      // Smooth camera trailing behind car heading
      var carHeading = currentCar.heading;
      camTarget.lerp(new THREE.Vector3(targetPos.x, targetPos.y + 1.6, targetPos.z), 10.0 * dt);

      var followDist = 8.2;
      var cx = camTarget.x - Math.sin(camYaw) * followDist * Math.cos(camPitch);
      var cz = camTarget.z - Math.cos(camYaw) * followDist * Math.cos(camPitch);
      var cy = camTarget.y + Math.sin(camPitch) * followDist + 1.2;

      camera.position.set(cx, Math.max(1.0, cy), cz);
      camera.lookAt(camTarget.x, camTarget.y + 0.8, camTarget.z);
    } else {
      // Standard 3rd person orbit around Dario
      camTarget.set(targetPos.x, targetPos.y + 1.4, targetPos.z);

      var dist = camDist;
      var ox = camTarget.x - Math.sin(camYaw) * dist * Math.cos(camPitch);
      var oz = camTarget.z - Math.cos(camYaw) * dist * Math.cos(camPitch);
      var oy = camTarget.y + Math.sin(camPitch) * dist + 0.6;

      camera.position.set(ox, Math.max(0.5, oy), oz);
      camera.lookAt(camTarget);
    }
  }

  function update(dt) {
    if (isRespawning) return;

    var input = SF.input;

    // Vehicle enter/exit edge trigger
    if (input && (input.pressed('interact') || (input.pressed && input.pressed('jump') && inCar))) {
      // E or F toggles vehicle
    }
    // We check raw interact trigger
    if (input && input.pressed && input.pressed('interact')) {
      toggleVehicle();
    }

    if (inCar && currentCar) {
      // Vehicle driving controls
      if (input.isDown('forward')) {
        currentCar.accelerate(dt);
      } else if (input.isDown('backward')) {
        currentCar.reverse(dt);
      }

      if (input.isDown('left')) {
        currentCar.steer(-1, dt);
      } else if (input.isDown('right')) {
        currentCar.steer(1, dt);
      }

      if (input.isDown('handbrake')) {
        currentCar.handbrake(dt);
      }

      // Update Dario position to follow car
      pos.copy(currentCar.pos);
      charHeading = currentCar.heading;
    } else {
      // On-foot movement controls
      var fwd = 0;
      var right = 0;

      if (input.isDown('forward')) fwd += 1;
      if (input.isDown('backward')) fwd -= 1;
      if (input.isDown('left')) right -= 1;
      if (input.isDown('right')) right += 1;

      var isMoving = (fwd !== 0 || right !== 0);
      var isSprinting = input.isDown('sprint');
      var targetSpeed = isMoving ? (isSprinting ? 11.5 : 6.0) : 0;

      moveSpeed += (targetSpeed - moveSpeed) * 12.0 * dt;

      if (isMoving) {
        // Compute movement vector relative to camera yaw
        var inputAngle = Math.atan2(right, fwd);
        charHeading = camYaw + inputAngle;

        var stepX = Math.sin(charHeading) * moveSpeed * dt;
        var stepZ = Math.cos(charHeading) * moveSpeed * dt;

        pos.x += stepX;
        pos.z += stepZ;

        // Limb swinging walk animation
        animTimer += dt * (isSprinting ? 18.0 : 10.0);
        var swing = Math.sin(animTimer) * 0.45;
        if (armL) armL.rotation.x = -swing;
        if (armR && !pistolEquipped) armR.rotation.x = swing;
        if (legL) legL.rotation.x = swing;
        if (legR) legR.rotation.x = -swing;
      } else {
        if (armL) armL.rotation.x *= 0.8;
        if (armR && !pistolEquipped) armR.rotation.x *= 0.8;
        if (legL) legL.rotation.x *= 0.8;
        if (legR) legR.rotation.x *= 0.8;
      }

      mesh.rotation.y = charHeading;

      // Ground clamping
      if (SF.world && SF.world.groundY) {
        pos.y = SF.world.groundY(pos.x, pos.z);
      }

      // Building collisions
      if (SF.city && SF.city.colliders) {
        var colls = SF.city.colliders;
        var pRadius = 0.55;
        for (var c = 0; c < colls.length; c++) {
          var col = colls[c];
          var cdx = pos.x - col.x;
          var cdz = pos.z - col.z;
          var minD = col.r + pRadius;
          if (Math.abs(cdx) < minD && Math.abs(cdz) < minD) {
            var dSq = cdx * cdx + cdz * cdz;
            if (dSq < minD * minD && dSq > 0.0001) {
              var d = Math.sqrt(dSq);
              var push = minD - d;
              pos.x += (cdx / d) * push;
              pos.z += (cdz / d) * push;
            }
          }
        }
      }

      // Combat attacks
      if (input.pressed('shoot')) {
        if (pistolEquipped) {
          performPistolShot();
        } else {
          performPunch();
        }
      }

      // Punch cooldown / animation
      if (isPunching) {
        punchTimer -= dt;
        if (armR) armR.rotation.x = -1.2;
        if (punchTimer <= 0) {
          isPunching = false;
          if (armR) armR.rotation.x = 0;
        }
      }

      if (shootCooldown > 0) {
        shootCooldown -= dt;
      }
    }

    updateCamera(dt);
  }

  SF.player = {
    mesh: mesh,
    pos: pos,
    get position() { return pos; },
    get health() { return health; },
    set health(h) { health = Math.max(0, Math.min(100, h)); },
    get armor() { return armor; },
    set armor(a) { armor = Math.max(0, Math.min(100, a)); },
    get cash() { return cash; },
    set cash(c) { cash = Math.max(0, c); },
    get inCar() { return inCar; },
    get currentCar() { return currentCar; },
    get speed() { return moveSpeed; },
    get heading() { return charHeading; },
    enterVehicle: enterVehicle,
    get pistolUnlocked() { return pistolUnlocked; },
    set pistolUnlocked(u) { pistolUnlocked = !!u; },
    get pistolEquipped() { return pistolEquipped; },
    update: update,
    addCash: addCash,
    hurt: hurt,
    respawn: respawn,
    toggleVehicle: toggleVehicle
  };
})();
