(function () {
  'use strict';
  var scene = SF.render.scene, camera = SF.render.camera, input = SF.input;
  var figure = SF.peds.buildFigure({skin: 0xc98d66, shirt: 0x287f7e, pants: 0x293b4a, hat: false});
  scene.add(figure);
  var arm = figure.userData.arms[1];
  var prop = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.12, 0.35),
    new THREE.MeshStandardMaterial({color: 0x393546, roughness: 0.38, metalness: 0.45}));
  prop.position.set(0, -0.415, 0.1); prop.visible = false; arm.add(prop);
  var flash = new THREE.PointLight(0xffbc5e, 0, 7, 2);
  scene.add(flash);
  var flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0),
    new THREE.MeshBasicMaterial({color: 0xffdfa0}));
  flame.scale.z = 2; flame.position.z = 0.24; flame.visible = false; prop.add(flame);
  var sparkGeo = new THREE.OctahedronGeometry(0.085, 0);
  var sparkMat = new THREE.MeshBasicMaterial({color: 0xffd18a});
  var sparks = [];
  for (var i = 0; i < 12; i++) {
    var mesh = new THREE.Mesh(sparkGeo, sparkMat);
    mesh.visible = false; scene.add(mesh);
    sparks.push({mesh: mesh, time: 0, vx: 0, vy: 0, vz: 0});
  }
  var safehouses = SF.CONFIG.safehouses || [
    {name: 'Palma Strand flat', x: -272, z: 42}, {name: 'Old Town warehouse', x: -117, z: 124}
  ];
  var aim = new THREE.Vector3(), ray = new THREE.Vector3(), origin = new THREE.Vector3();
  var cameraGoal = new THREE.Vector3(), focus = new THREE.Vector3();
  var controls = {throttle: 0, steer: 0, handbrake: false};
  var cameraReady = false, flashT = 0, meleeT = 0, gait = 0, sparkNext = 0, vy = 0, immunity = 0;
  var bestT = Infinity, bestObject = null, bestKind = 0;
  var mouseEdge = false, mouseDown = false;
  window.addEventListener('mousedown', function (e) {
    if (e.button === 0 && input.locked) { mouseEdge = true; mouseDown = true; }
  }, true);
  window.addEventListener('mouseup', function (e) { if (e.button === 0) mouseDown = false; }, true);
  window.addEventListener('blur', function () { mouseDown = mouseEdge = false; });
  document.addEventListener('pointerlockchange', function () {
    if (!document.pointerLockElement) mouseDown = mouseEdge = false;
  });
  function pressed(key) { return input.pressed(key); }
  function down(key) { return !!input.isDown(key); }
  function fireHeld() { return input.locked && mouseDown || down('KeyX'); }
  function pressedInteract() { return pressed('KeyE'); }
  function surface(x, z) { return SF.world.groundY(x, z); }
  function damage(amount, fromPos) {
    if (immunity > 0 || player.health <= 0 || amount <= 0) return false;
    var absorbed = Math.min(player.armour, amount * 0.6);
    player.armour -= absorbed; player.health = Math.max(0, player.health - (amount - absorbed));
    immunity = 0.36; player.hurtT = 0.42;
    if (fromPos) player.hurtAngle = Math.atan2(fromPos.x - player.pos.x, fromPos.z - player.pos.z);
    return true;
  }
  function leaveCar(force) {
    var car = player.inCar;
    if (!car) return false;
    var sideX = Math.cos(car.heading), sideZ = -Math.sin(car.heading);
    var x = car.pos.x + sideX * 2.25, z = car.pos.z + sideZ * 2.25;
    if (!SF.vehicles.clear(x, z, 0.55)) {
      x = car.pos.x - sideX * 2.25; z = car.pos.z - sideZ * 2.25;
      if (!SF.vehicles.clear(x, z, 0.55)) {
        x = car.pos.x - Math.sin(car.heading) * 3; z = car.pos.z - Math.cos(car.heading) * 3;
        if (!SF.vehicles.clear(x, z, 0.55) && !force) return false;
      }
    }
    car.driver = null; car.vx = car.vz = car.speed = 0;
    player.heading = car.heading; player.mesh.rotation.y = car.heading;
    player.inCar = null; player.mesh.visible = true; player.pos.set(x, surface(x, z), z);
    return true;
  }
  function enterCar(car) {
    if (!car || player.inCar || car.driver === 'cop' || car.health <= 0) return false;
    var p = player.pos;
    if (!car.driver || car.driver === 'ai') {
      car.stolen = true;
      if (SF.police.seenPlayer || SF.peds.witnessed(p.x, p.z, null)) SF.police.addHeat(1);
    }
    car.driver = 'player'; player.inCar = car; player.heading = car.heading;
    player.pos.copy(car.pos); player.mesh.visible = false; vy = 0;
    return true;
  }
  function respawn(which) {
    if (player.inCar) leaveCar(true);
    var home = typeof which === 'object' && which ? which : safehouses[which] || safehouses[0];
    player.pos.set(home.x, surface(home.x, home.z), home.z);
    player.health = 100; player.armour = 0; player.hurtT = 0;
    player.yaw = player.heading = home.heading || 0; player.pitch = 0.15; vy = 0;
    figure.rotation.y = player.heading; figure.visible = true;
    immunity = 1; cameraReady = false;
    updateCamera(0);
  }
  function facingCamera() {
    var c = Math.cos(player.pitch);
    ray.set(Math.sin(player.yaw) * c, -Math.sin(player.pitch), Math.cos(player.yaw) * c);
  }
  function updateCamera(dt) {
    facingCamera();
    var car = player.inCar, distance = car ? 9.4 : 5.7, p = player.pos;
    focus.copy(p); focus.y += car ? 1.95 : 1.56;
    var height = car ? 2.12 : 1.05;
    // Shorten the camera arm before the first blocked sample along the orbit.
    var used = 0;
    for (var k = 1; k <= 20; k++) {
      var d = distance * k / 20;
      if (!SF.vehicles.clear(focus.x - ray.x * d, focus.z - ray.z * d, 0.34)) break;
      used = d;
    }
    cameraGoal.copy(focus).addScaledVector(ray, -used);
    if (!car) {
      var shoulderX = cameraGoal.x + Math.cos(player.yaw) * 0.64;
      var shoulderZ = cameraGoal.z - Math.sin(player.yaw) * 0.64;
      if (SF.vehicles.clear(shoulderX, shoulderZ, 0.34)) { cameraGoal.x = shoulderX; cameraGoal.z = shoulderZ; }
    }
    cameraGoal.y = Math.max(surface(cameraGoal.x, cameraGoal.z) + 0.8, cameraGoal.y + height * used / distance);
    if (!cameraReady) { camera.position.copy(cameraGoal); cameraReady = true; }
    else {
      camera.position.lerp(cameraGoal, 1 - Math.exp(-dt * 18));
      if (!SF.vehicles.clear(camera.position.x, camera.position.z, 0.28)) camera.position.copy(cameraGoal);
      camera.position.y = Math.max(camera.position.y, surface(camera.position.x, camera.position.z) + 0.8);
    }
    aim.copy(camera.position).addScaledVector(ray, 30);
    camera.lookAt(aim);
  }
  function sphere(pos, y, radius, object, kind) {
    var x = pos.x - origin.x, z = pos.z - origin.z, dy = y - origin.y;
    var forward = x * ray.x + dy * ray.y + z * ray.z;
    var disc = radius * radius - (x * x + dy * dy + z * z - forward * forward);
    if (disc < 0 || forward < 0) return;
    var t = Math.max(0, forward - Math.sqrt(disc));
    if (t < bestT) { bestT = t; bestObject = object; bestKind = kind; }
  }
  function trace(range) {
    bestT = range; bestObject = null; bestKind = 0;
    var cs = SF.city.colliders, horizontal = ray.x * ray.x + ray.z * ray.z;
    if (horizontal > 0.001) {
      for (var n = 0; n < cs.length; n++) {
        var c = cs[n], cx = c.x - origin.x, cz = c.z - origin.z, proj = cx * ray.x + cz * ray.z;
        var disc = proj * proj - horizontal * (cx * cx + cz * cz - c.r * c.r);
        if (disc >= 0 && proj > 0) {
          var t = Math.max(0, (proj - Math.sqrt(disc)) / horizontal);
          if (t < bestT) bestT = t;
        }
      }
    }
    if (ray.y < -0.001) bestT = Math.min(bestT, Math.max(0, (surface(origin.x, origin.z) - origin.y) / ray.y));
    var list = SF.peds.list, cops = SF.police.units, cars = SF.vehicles.list;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.health > 0) {
        sphere(p.pos, p.pos.y + 1.15, 0.43, p, 1);
        sphere(p.pos, p.pos.y + 1.59, 0.21, p, 1);
      }
    }
    for (var j = 0; j < cops.length; j++) {
      var u = cops[j];
      if (u.active && !u.car && u.health > 0) sphere(u.pos, u.pos.y + 1.07, 0.62, u, 2);
    }
    var air = SF.police.air;
    if (air.active && air.health > 0) sphere(air.pos, air.pos.y, 2.1, air, 2);
    for (var k = 0; k < cars.length; k++) {
      var car = cars[k];
      if (car.active && car !== player.inCar && car.health > 0) sphere(car.pos, car.pos.y + 0.97, 1.5, car, 3);
    }
  }
  function hitEffect(x, y, z) {
    for (var i = 0; i < 3; i++) {
      var s = sparks[sparkNext]; sparkNext = (sparkNext + 1) % sparks.length;
      s.mesh.position.set(x, y, z); s.mesh.scale.setScalar(1); s.mesh.visible = true;
      s.time = 0.23;
      s.vx = (SF.random.next() - 0.5) * 4; s.vy = 1 + SF.random.next() * 3;
      s.vz = (SF.random.next() - 0.5) * 4;
    }
  }
  function hit(o, kind, amount) {
    if (kind === 1) SF.peds.registerHit(o, amount);
    else if (o) {
      o.health = Math.max(0, o.health - amount);
      if (kind === 2 || o.driver === 'cop') SF.police.addHeat(12);
    }
  }
  function tryMelee(d) {
    var fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    var x = player.pos.x, z = player.pos.z, near = d.range * d.range, target = null, kind = 1;
    var list = SF.peds.list, cops = SF.police.units;
    for (var i = 0; i < list.length + cops.length; i++) {
      var cop = i >= list.length, p = cop ? cops[i - list.length] : list[i];
      if (p.health <= 0 || (cop && (!p.active || p.car))) continue;
      var dx = p.pos.x - x, dz = p.pos.z - z, dist = dx * dx + dz * dz;
      if (dist < near && dx * fx + dz * fz >= -0.15 && SF.police.clearSight(x, z, p.pos.x, p.pos.z)) {
        near = dist; target = p; kind = cop ? 2 : 1;
      }
    }
    player.heading = Math.atan2(fx, fz); meleeT = 0.34;
    SF.peds.scare(x, z, 9);
    if (target) { hit(target, kind, d.dmg); SF.police.addHeat(3); }
  }
  function attack() {
    var w = SF.weapons, d = w.curDef(), a = w.ammo[w.cur];
    if (player.inCar || player.health <= 0 || w.timeToReady > 0 || w.reloadT > 0) return false;
    if (!w.cur) { w.timeToReady = d.rate; tryMelee(d); return true; }
    if (!a.mag) { w.needsReload = true; return false; }
    w.timeToReady = d.rate; a.mag--; if (!a.mag) w.needsReload = true;
    origin.copy(camera.position);
    camera.getWorldDirection(ray);
    var baseX = ray.x, baseY = ray.y, baseZ = ray.z;
    var pellets = d.pellets || 1;
    player.heading = player.yaw; flashT = 0.071; flame.visible = true; flash.intensity = 7;
    flash.position.set(player.pos.x + Math.sin(player.yaw) * 0.5 - Math.cos(player.yaw) * 0.28,
      player.pos.y + 1.22, player.pos.z + Math.cos(player.yaw) * 0.5 + Math.sin(player.yaw) * 0.28);
    for (var i = 0; i < pellets; i++) {
      if (i) {
        var spread = (SF.random.next() - 0.5) * 0.105;
        ray.set(baseX + Math.cos(player.yaw) * spread, baseY + (SF.random.next() - 0.5) * 0.095,
          baseZ - Math.sin(player.yaw) * spread).normalize();
      }
      trace(d.range);
      if (bestT < d.range) hitEffect(origin.x + bestT * ray.x, origin.y + bestT * ray.y, origin.z + bestT * ray.z);
      if (bestObject) hit(bestObject, bestKind, d.dmg);
    }
    SF.peds.scare(player.pos.x, player.pos.z, 48);
    if (SF.police.seenPlayer || SF.peds.witnessed(player.pos.x, player.pos.z, null)) SF.police.addHeat(9);
    if (SF.audio && typeof SF.audio.shot === 'function') SF.audio.shot(d, w.cur);
    return true;
  }
  function updateEffects(dt) {
    if (flashT > 0) {
      flashT = Math.max(0, flashT - dt);
      if (!flashT) { flash.intensity = 0; flame.visible = false; }
    }
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i]; if (!s.time) continue;
      s.time = Math.max(0, s.time - dt); s.mesh.visible = s.time > 0;
      s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
      s.vy -= 12 * dt; s.mesh.scale.setScalar(s.time * 4);
    }
  }
  function update(dt) {
    dt = Math.max(0, Math.min(dt, 0.12));
    var shootNow = (input.locked && mouseEdge) || pressed('KeyX');
    mouseEdge = false;
    player.hurtT = Math.max(0, player.hurtT - dt); immunity = Math.max(0, immunity - dt);
    meleeT = Math.max(0, meleeT - dt); updateEffects(dt);
    if (input.locked) {
      player.yaw -= (input.lookDX || 0) * 0.00265;
      player.pitch = Math.max(-0.66, Math.min(1.08, player.pitch + (input.lookDY || 0) * 0.00265));
    }
    var forward = Number(down('KeyW') || down('ArrowUp')) - Number(down('KeyS') || down('ArrowDown'));
    var side = Number(down('KeyD') || down('ArrowRight')) - Number(down('KeyA') || down('ArrowLeft'));
    var beganInCar = player.inCar;
    if (player.health > 0 && (pressedInteract() || (beganInCar && pressed('KeyF')))) {
      if (beganInCar) leaveCar(false);
      else if (!input.interactConsumed) enterCar(SF.vehicles.nearestEnterable(player.pos.x, player.pos.z, 3.9));
    }
    if (player.inCar) {
      var car = player.inCar, prev = car.health;
      controls.throttle = player.health > 0 ? forward : 0;
      controls.steer = player.health > 0 ? -side : 0;
      controls.handbrake = down('Space');
      car.update(dt, controls); player.pos.copy(car.pos); player.heading = car.heading;
      if (prev - car.health > 8) damage((prev - car.health) * 0.4, car.pos);
      if (car.health <= 0) { leaveCar(true); damage(18, car.pos); }
    } else if (player.health > 0) {
      var p = player.pos, w = SF.weapons;
      for (var i = 0; i < 5; i++) if (pressed(weaponKeys[i])) w.equip(i);
      if (pressed('KeyR')) w.reload();
      var len = Math.hypot(forward, side);
      var speed = down('ShiftLeft') || down('ShiftRight') ? 8.8 : 5.15;
      if (len > 0) {
        var sine = Math.sin(player.yaw), cosine = Math.cos(player.yaw);
        var dx = (forward * sine - side * cosine) / len, dz = (forward * cosine + side * sine) / len;
        var distance = speed * dt, x = p.x + dx * distance, z = p.z + dz * distance;
        if (Math.abs(z) < 370 && z !== p.z && SF.vehicles.clear(p.x, z, 0.42)) p.z = z;
        if (x < 370 && x !== p.x && SF.vehicles.clear(x, p.z, 0.42)) p.x = x;
        if (!meleeT) player.heading = Math.atan2(dx, dz);
        gait += dt * (speed > 6 ? 13 : 8.5);
      }
      var floor = surface(p.x, p.z);
      if (p.y <= floor + 0.015 && pressed('Space')) vy = 6.4;
      vy -= 17.5 * dt; p.y += vy * dt;
      if (p.y < floor) { p.y = floor; vy = 0; }
      updateCamera(dt);
      if (shootNow || (w.curDef().auto && fireHeld())) attack();
      prop.visible = w.cur > 0;
      if (prop.visible && (flashT || fireHeld())) player.heading = player.yaw;
      SF.peds.animate(figure, gait, len ? speed > 6 ? 0.87 : 0.59 : 0, false);
      if (prop.visible) arm.rotation.x = -1.20 + Math.sin(gait) * 0.085;
      else if (meleeT > 0) {
        arm.rotation.x = -0.3 - Math.sin((1 - meleeT / 0.34) * Math.PI) * 1.75;
        arm.rotation.z = 0.14 + meleeT;
      }
      figure.rotation.y = player.heading;
      return;
    }
    updateCamera(dt);
  }
  var weaponKeys = ['Digit1','Digit2','Digit3','Digit4','Digit5'];
  var player = {name: 'Dario Venn', mesh: figure, pos: figure.position, inCar: null,
    heading: 0, yaw: 0, pitch: 0.15, health: 100, armour: 0, rep: 0, cash: 350,
    hurtT: 0, hurtAngle: 0, safehouses: safehouses, damage: damage, respawn: respawn,
    attack: attack, update: update, updateCamera: updateCamera, enterCar: enterCar, exitCar: leaveCar};
  SF.player = player;
  respawn(0);
}());
