(function () {
  'use strict';
  var scene = SF.render.scene, unitList = [], thresholds = SF.CONFIG.wantedThresholds;
  var grid = SF.vehicles.step, edge = SF.vehicles.half + 14;
  var box = new THREE.BoxGeometry(1, 1, 1);
  var navy = new THREE.MeshStandardMaterial({color: 0x242e4b, roughness: 0.58});
  var canopy = new THREE.MeshStandardMaterial({color: 0x63929f, roughness: 0.24, metalness: 0.46});
  var patrolIvory = new THREE.MeshStandardMaterial({color: 0xe8ddc5, roughness: 0.64});
  var red = new THREE.MeshBasicMaterial({color: 0xff3552}), blue = new THREE.MeshBasicMaterial({color: 0x46a8ff});
  var drive = {throttle: 0, steer: 0, brake: false, handbrake: false};
  var frame = 0, siren = false, clock = 0, unseen = 0;
  function block(parent, paint, x, y, z, a, b, c) {
    var m = new THREE.Mesh(box, paint);
    m.position.set(x, y, z); m.scale.set(a, b, c); parent.add(m); return m;
  }
  function groundUnit(i, car, roadblock) {
    var mesh = car ? car.mesh : SF.peds.buildFigure({skin: i % 2 ? 0x9b684e : 0xe1a581,
      shirt: 0x25375d, pants: 0x212c44, hat: 0x263255});
    var u = {label: 'UNIT-' + (i + 1), car: car, mesh: mesh, pos: mesh.position,
      roadblock: roadblock, active: false, health: 100, tactic: 'PURSUIT', phase: 0, dt: 0,
      fireT: 0, stuckT: 0, waypointT: 0, wx: 0, wz: 0, cooldown: 0, lightA: null, lightB: null};
    if (car) {
      car.driver = 'cop'; car.active = false;
      block(mesh, patrolIvory, -0.94, 0.92, -0.03, 0.045, 0.42, 1.46);
      block(mesh, patrolIvory, 0.94, 0.92, -0.03, 0.045, 0.42, 1.46);
      u.lightA = block(mesh, red, -0.36, 1.88, -0.26, 0.59, 0.13, 0.22);
      u.lightB = block(mesh, blue, 0.36, 1.88, -0.26, 0.59, 0.13, 0.22);
      block(mesh, navy, 0, 0.77, -0.1, 1.88, 0.29, 1.36);
    } else scene.add(mesh);
    mesh.visible = false; unitList.push(u);
  }
  for (var i = 0; i < 5; i++) groundUnit(i, SF.vehicles.create(0, 0, 0, 1), i >= 3);
  for (var j = 5; j < 9; j++) groundUnit(j, null, false);
  var airMesh = new THREE.Group(), rotor = new THREE.Group();
  block(airMesh, navy, 0, 0, 0, 2.6, 1.55, 4.2);
  block(airMesh, canopy, 0, 0.17, 1.62, 2.25, 1.08, 1.28);
  block(airMesh, navy, 0, 0.31, -3.65, 0.49, 0.52, 4.1);
  block(airMesh, navy, 0, 0.85, -5.55, 0.2, 1.42, 0.83);
  block(airMesh, navy, -1.14, -1.08, 0, 0.15, 0.14, 3.7);
  block(airMesh, navy, 1.14, -1.08, 0, 0.15, 0.14, 3.7);
  block(rotor, navy, 0, 0, 0, 10, 0.07, 0.24);
  block(rotor, navy, 0, 0, 0, 0.24, 0.07, 10);
  rotor.position.y = 1.25; airMesh.add(rotor); scene.add(airMesh);
  var beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 18, 1, true),
    new THREE.MeshBasicMaterial({color: 0xffedb0, opacity: 0.11, transparent: true, side: THREE.DoubleSide, depthWrite: false}));
  var spot = new THREE.SpotLight(0xffedb0, 0, 95, 0.21, 0.76, 1);
  scene.add(beam, spot, spot.target);
  beam.visible = airMesh.visible = false;
  var beamDirection = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  var air = {label: 'AIR-1', pos: airMesh.position, mesh: airMesh, active: false, health: 100, tactic: 'INTERCEPT', cooldown: 0};
  var views = [[]];
  var ranks = new Array(5), distances = new Float64Array(5);
  for (var n = 1; n <= 5; n++) {
    var rowBucket = [];
    for (var v = 0; v < n; v++) rowBucket.push({label: '', dist: 0, tactic: ''});
    views.push(rowBucket);
  }
  function clearSight(x, z, tx, tz) {
    var dx = tx - x, dz = tz - z, den = dx * dx + dz * dz;
    if (den < 0.0001) return true;
    var cs = SF.city.colliders;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i], f = ((c.x - x) * dx + (c.z - z) * dz) / den;
      if (f <= 0 || f >= 1) continue;
      var a = x + dx * f - c.x, b = z + dz * f - c.z;
      if (a * a + b * b < c.r * c.r) return false;
    }
    return true;
  }
  function lane(a) { return Math.max(-205, Math.min(205, (Math.floor(a / grid) + 0.5) * grid)); }
  function activate(u, index, p) {
    var x, z, h;
    if (u.roadblock) {
      var heading = p.inCar ? p.inCar.heading : p.heading;
      var alongZ = Math.abs(Math.cos(heading)) >= Math.abs(Math.sin(heading));
      var dir = (alongZ ? Math.cos(heading) : Math.sin(heading)) < 0 ? -1 : 1;
      var offset = index === 3 ? -4 : 4;
      x = alongZ ? lane(p.pos.x) + offset : Math.max(-284, Math.min(284, p.pos.x + dir * 58));
      z = alongZ ? Math.max(-284, Math.min(284, p.pos.z + dir * 58)) : lane(p.pos.z) + offset;
      h = alongZ ? Math.PI / 2 : 0;
    } else {
      var side = (p.pos.x < -135 ? 3 : p.pos.x > 135 ? 1 : p.pos.z > 0 ? 2 : 0);
      if (index % 2) side = (side + (p.pos.z > 0 ? 2 : 1)) % 4;
      var nudge = ((index % 3) - 1) * 7;
      x = side === 1 ? edge : side === 3 ? -edge : lane(p.pos.x) + nudge;
      z = side === 0 ? -edge : side === 2 ? edge : lane(p.pos.z) + nudge;
      h = Math.atan2(p.pos.x - x, p.pos.z - z);
    }
    if (u.car) { u.car.reset(x, z, h); u.car.driver = 'cop'; }
    else u.pos.set(x, SF.world.groundY(x, z), z);
    u.active = u.mesh.visible = true; u.health = 100;
    u.dt = u.stuckT = u.waypointT = 0; u.fireT = 1.1;
    u.tactic = u.roadblock ? 'ROADBLOCK' : 'PURSUIT'; u.mesh.rotation.set(0, h, 0);
  }
  function deactivate(u) {
    u.active = u.mesh.visible = false;
    if (u.car) u.car.active = false;
  }
  function tickUnit(u, p, dt, d, visible) {
    var car = u.car, pos = u.pos, target = p.pos, x = target.x, z = target.z;
    if (!u.roadblock) {
      var heading = p.inCar ? p.inCar.heading : p.heading;
      if (car && p.inCar && d < 16 && visible) {
        u.tactic = 'RAMMING';
        var side = (pos.x - x) * Math.cos(heading) - (pos.z - z) * Math.sin(heading) > 0 ? 1 : -1;
        x += Math.cos(heading) * side * 0.85; z -= Math.sin(heading) * side * 0.85;
      } else if (p.inCar && d > 28 && d < 135 && Math.abs(p.inCar.speed) > 8) {
        u.tactic = 'INTERCEPT';
        x += Math.sin(heading) * p.inCar.speed * 1.05; z += Math.cos(heading) * p.inCar.speed * 1.05;
      } else u.tactic = 'PURSUIT';
      u.waypointT = Math.max(0, u.waypointT - dt);
      if (!visible && !u.waypointT) {
        var cx = lane(pos.x), cz = lane(pos.z);
        var tx = lane(x), tz = lane(z);
        u.wx = cx; u.wz = cz;
        if (Math.abs(pos.x - cx) < 6 && (Math.abs(pos.z - cz) > 6 || cz !== tz)) {
          u.wz = Math.abs(pos.z - cz) > 6 ? cz : cz + Math.sign(tz - cz) * grid;
        } else if (Math.abs(pos.z - cz) < 6) {
          u.wx = Math.abs(pos.x - cx) > 6 ? cx : cx + Math.sign(tx - cx) * grid;
        }
        u.waypointT = 0.8;
      }
      if (!visible && Math.hypot(pos.x - u.wx, pos.z - u.wz) > 3) { x = u.wx; z = u.wz; }
      if (car) {
        var desired = Math.atan2(x - pos.x, z - pos.z), angle = desired - car.heading;
        angle = Math.atan2(Math.sin(angle), Math.cos(angle));
        var goal = u.tactic === 'RAMMING' ? 29 : d > 24 ? 33 : p.inCar ? 13 : 6;
        u.stuckT = Math.abs(car.speed) < 1.8 && d > 6 ? u.stuckT + dt : u.stuckT;
        if (u.stuckT >= 2.45) u.stuckT = 0;
        drive.steer = Math.max(-1, Math.min(1, angle * 1.75));
        drive.throttle = u.stuckT > 1.6 ? -1 : angle > 1.15 || angle < -1.15 ? 0.47 : 1;
        if (drive.throttle < 0) drive.steer = -drive.steer || 1;
        drive.brake = drive.throttle > 0 && (car.speed > goal || (!p.inCar && d < 1.9));
        car.update(dt, drive);
        if (u.tactic === 'RAMMING' && d < 3.25 && p.inCar && u.fireT <= 0) {
          p.inCar.health = Math.max(0, p.inCar.health - 10);
          p.inCar.speed *= 0.74; car.speed *= 0.58; u.fireT = 1.05;
        }
      } else {
        var a = Math.atan2(x - pos.x, z - pos.z), stride = Math.min(dt * 5.3, Math.max(0, d - 1.3));
        var nx = pos.x + Math.sin(a) * stride, nz = pos.z + Math.cos(a) * stride;
        if (SF.vehicles.clear(nx, nz, 0.4)) {
          pos.set(nx, SF.world.groundY(nx, nz), nz); u.mesh.rotation.y = a;
          if (stride > 0.005) u.phase += dt * 12;
        }
        SF.peds.animate(u.mesh, u.phase, stride > 0.005 ? 0.73 : 0, false);
        if (visible && d < 23 && d > 2.2 && u.fireT <= 0 && !p.inCar) {
          p.damage(6, pos); u.fireT = 1.6;
        }
      }
    }
    if (u.lightA) {
      var blink = (Math.floor(clock * 7) & 1) === 0;
      u.lightA.visible = blink; u.lightB.visible = !blink;
    }
    u.fireT -= dt;
  }
  function fly(p, dt) {
    var v = air.pos;
    if (!air.active) { v.set(p.pos.x + 30, 69, p.pos.z + 18); air.active = airMesh.visible = beam.visible = true; air.health = 100; }
    var blend = 1 - Math.exp(-dt * 0.75);
    // A finite pursuit speed lets a committed fast drive break the search cone.
    // Exponential following alone made the van escape stage impossible.
    var chaseX = p.pos.x + Math.sin(clock * 0.55) * 13 - v.x;
    var chaseZ = p.pos.z + Math.cos(clock * 0.55) * 13 - v.z;
    var travel = Math.min(blend, dt * 24 / Math.max(0.001, Math.hypot(chaseX, chaseZ)));
    v.x += chaseX * travel;
    v.z += chaseZ * travel;
    v.y = (air.altitude || 76) + Math.sin(clock * 0.82) * 2;
    airMesh.rotation.y = Math.atan2(p.pos.x - v.x, p.pos.z - v.z);
    rotor.rotation.y += dt * 32;
    spot.position.copy(v); spot.position.y -= 1; spot.target.position.copy(p.pos); spot.intensity = 26;
    beamDirection.subVectors(spot.position, spot.target.position);
    var length = beamDirection.length();
    beam.position.copy(spot.position).lerp(spot.target.position, 0.5);
    beam.quaternion.setFromUnitVectors(up, beamDirection.multiplyScalar(1 / Math.max(length, 0.001)));
    beam.scale.set(length * 0.21, length, length * 0.21);
    var dx = p.pos.x - v.x, dz = p.pos.z - v.z;
    return dx * dx + dz * dz < 60 * 60;
  }
  function hideAir() { air.active = airMesh.visible = beam.visible = false; spot.intensity = 0; }
  function update(dt) {
    var p = SF.player;
    if (!p) return;
    clock += dt; frame = (frame + 1) % 20;
    var wanted = api.wanted, pursuitCars = wanted >= 4 ? 3 : wanted >= 3 ? 2 : wanted > 0 ? 1 : 0;
    var onFoot = wanted ? Math.min(4, wanted + (p.inCar ? 0 : 1)) : 0;
    var seen = false, close = false, target = p.pos;
    for (var i = 0; i < unitList.length; i++) {
      var u = unitList[i], need = i < 3 ? i < pursuitCars : i < 5 ? wanted >= 3 : i - 5 < onFoot;
      u.cooldown = Math.max(0, u.cooldown - dt);
      if (!need) { if (u.active) deactivate(u); continue; }
      if (u.active && (u.health <= 0 || (u.car && u.car.health <= 0))) { deactivate(u); u.cooldown = 10; }
      if (!u.active) { if (!u.cooldown) activate(u, i, p); else continue; }
      var d2 = u.pos.distanceToSquared(target);
      if (d2 > 350 * 350) {
        u.dt = 0;
        // Reposition near the player without simulating the distant unit.
        deactivate(u); u.cooldown = 1;
        continue;
      }
      var d = Math.sqrt(d2), visible = d <= 90 && clearSight(u.pos.x, u.pos.z, target.x, target.z);
      seen = seen || visible;
      close = close || (visible && d < 2.2 && (!p.inCar || Math.abs(p.inCar.speed) < 3));
      u.dt = Math.min(0.2, u.dt + dt);
      var stride = d > 190 ? 5 : d > 100 ? 4 : 1;
      if ((frame + i) % stride === 0) { tickUnit(u, p, u.dt, d, visible); u.dt = 0; }
    }
    air.cooldown = Math.max(0, air.cooldown - dt);
    if (air.active && air.health <= 0) { hideAir(); air.cooldown = 14; }
    if (wanted >= 4 && !air.cooldown) seen = fly(p, dt) || seen;
    else if (air.active) hideAir();
    api.seenPlayer = seen;
    api.pressure = Math.max(0, Math.min(1, api.pressure + dt * (close ? 0.72 : -0.95)));
    if (seen) unseen = 0;
    else {
      unseen += dt;
      if (wanted && unseen >= 6) { api.heat = thresholds[wanted - 1]; unseen -= 6; }
      else if (!wanted) api.heat = Math.max(0, api.heat - dt * 0.55);
    }
    var isSiren = api.wanted > 0;
    if (typeof SF.audio !== 'undefined' && typeof SF.audio.siren === 'function' && siren !== isSiren) {
      SF.audio.siren(isSiren);
      siren = isSiren;
    }
  }
  function report() {
    var p = SF.player, count = 0;
    if (!p) return views[0];
    for (var i = 0; i <= unitList.length; i++) {
      var u = i === unitList.length ? air : unitList[i];
      if (!u.active) continue;
      var d = u.pos.distanceToSquared(p.pos), place = count;
      while (place > 0 && d < distances[place - 1]) place--;
      if (place === 5) continue;
      count = Math.min(5, count + 1);
      for (var j = count - 1; j > place; j--) { ranks[j] = ranks[j - 1]; distances[j] = distances[j - 1]; }
      ranks[place] = u; distances[place] = d;
    }
    var view = views[count];
    for (var k = 0; k < count; k++) {
      view[k].label = ranks[k].label; view[k].dist = Math.round(Math.sqrt(distances[k])); view[k].tactic = ranks[k].tactic;
    }
    return view;
  }
  var api = {
    heat: 0, seenPlayer: false, pressure: 0, units: unitList, air: air, clearSight: clearSight,
    get wanted() {
      for (var i = 5; i > 0; i--) if (this.heat >= thresholds[i]) return i;
      return 0;
    },
    addHeat: function (n) {
      if (n > 0) unseen = 0;
      this.heat = Math.min(thresholds[5] + 35, Math.max(0, this.heat + n));
    },
    reset: function () {
      this.heat = this.pressure = unseen = 0; this.seenPlayer = false;
      for (var i = 0; i < unitList.length; i++) { deactivate(unitList[i]); unitList[i].cooldown = 0; }
      hideAir(); air.cooldown = 0;
    },
    update: update, report: report
  };
  SF.police = api;
  SF.peds.onCrime = function (heat) { api.addHeat(heat); };
}());
