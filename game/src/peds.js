(function () {
  'use strict';
  var list = [], scene = SF.render.scene, frame = 0;
  var box = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.SphereGeometry(1, 10, 7);
  var materials = new Map(), shirts = [0xe84182,0xffb642,0x42caca,0x915fed,0xef6144,0x84cf49,0xf3d6b1];
  var skins = [0xedb28a,0xb27351,0x7c4a39,0xd89665,0xf0c4a2];
  var trousers = [0x382a47,0x244d76,0x594854,0xe1b587];
  function material(color) {
    if (!materials.has(color)) {
      var base = new THREE.MeshStandardMaterial({color: color, roughness: 0.86});
      var fades = [base];
      for (var i = 1; i < 5; i++) {
        var mat = base.clone(); mat.transparent = true; mat.depthWrite = false;
        mat.opacity = 1 - i / 5; fades.push(mat);
      }
      materials.set(color, fades);
    }
    return materials.get(color);
  }
  function limb(parent, geometry, color, x, y, z, w, h, d, parts) {
    var shades = material(color), m = new THREE.Mesh(geometry, shades[0]);
    m.position.set(x, y, z); m.scale.set(w, h, d);
    parent.add(m); parts.push(m); m.userData.shades = shades;
    return m;
  }
  function buildFigure(options) {
    var root = new THREE.Group(), parts = [], a = [], l = [];
    var skin = options.skin ?? 0xc98d66, shirt = options.shirt ?? 0x37c7ba, pants = options.pants ?? 0x294369;
    limb(root, ball, skin, 0, 1.62, 0.014, 0.165, 0.196, 0.161, parts);
    limb(root, box, shirt, 0, 1.12, 0, 0.43, 0.53, 0.25, parts).castShadow = true;
    for (var i = 0; i < 2; i++) {
      var side = i ? 1 : -1;
      var arm = new THREE.Group(); arm.position.set(side * 0.276, 1.34, 0);
      limb(arm, box, shirt, 0, -0.12, 0, 0.142, 0.27, 0.15, parts);
      limb(arm, box, skin, 0, -0.33, 0, 0.114, 0.19, 0.12, parts);
      root.add(arm); a.push(arm);
      var leg = new THREE.Group(); leg.position.set(side * 0.112, 0.89, 0);
      limb(leg, box, pants, 0, -0.41, 0, 0.185, 0.77, 0.203, parts);
      limb(leg, box, 0x302839, 0, -0.838, 0.057, 0.19, 0.105, 0.295, parts);
      root.add(leg); l.push(leg);
    }
    if (options.hat) {
      var cap = options.hat === true ? shirt : options.hat;
      limb(root, ball, cap, 0, 1.751, 0, 0.181, 0.108, 0.173, parts);
      limb(root, box, cap, 0, 1.727, 0.14, 0.26, 0.045, 0.19, parts);
    }
    root.userData.arms = a; root.userData.legs = l; root.userData.parts = parts;
    return root;
  }
  function animate(figure, phase, stride, flee) {
    var u = figure.userData, swing = Math.sin(phase) * stride;
    u.arms[0].rotation.x = flee ? -2.48 + swing * 0.25 : -swing * 0.82;
    u.arms[1].rotation.x = flee ? -2.48 - swing * 0.25 : swing * 0.82;
    u.arms[0].rotation.z = flee ? -0.39 : -0.07;
    u.arms[1].rotation.z = flee ? 0.39 : 0.07;
    u.legs[0].rotation.x = swing; u.legs[1].rotation.x = -swing;
  }
  function shade(p, level) {
    if (p.fade === level) return;
    p.fade = level;
    var parts = p.mesh.userData.parts;
    for (var i = 0; i < parts.length; i++) parts[i].material = parts[i].userData.shades[level];
  }
  function pickPosition(p) {
    var x, z, slot = p.slot, axis = SF.random.next() < 0.5, center, side, along;
    if (slot < 12) {
      x = -339 - 15 * (slot % 3) + SF.random.next() * 4;
      z = -210 + Math.floor(SF.random.next() * 11) * 38;
      axis = true;
    } else if (slot < 22) {
      axis = true; x = -270 - SF.random.next() * 7; z = -228 + SF.random.next() * 455;
    } else {
      center = slot < 35 ? (SF.random.next() < 0.5 ? 123 : 205) : (Math.floor(SF.random.next() * 6) - 2.5) * 82;
      along = slot < 35 ? -92 + SF.random.next() * 184 : -270 + SF.random.next() * 540;
      axis = slot < 35 || axis; side = SF.random.next() < 0.5 ? -1 : 1;
      x = axis ? center + side * 10.5 : along; z = axis ? along : center + side * 10.5;
      if (!SF.vehicles.clear(x, z, 0.5)) { x = center; z = along; axis = true; }
    }
    p.pos.set(x, SF.world.groundY(x, z), z);
    p.axis = axis; p.home = axis ? x : z;
  }
  function revive(p) {
    p.health = 100; p.down = 0; p.fear = 0; p.dt = 0;
    p.mesh.rotation.z = 0; p.mesh.visible = true; shade(p, 0);
    pickPosition(p); p.sign = SF.random.next() < 0.5 ? -1 : 1;
  }
  function choose(colors) { return colors[Math.floor(SF.random.next() * colors.length)]; }
  function spawn(x, z) {
    var mesh = buildFigure({skin: choose(skins), shirt: choose(shirts), pants: choose(trousers), hat: SF.random.next() < 0.27});
    var p = {mesh: mesh, pos: mesh.position, slot: list.length, health: 100, down: 0, fear: 0,
      phase: 0, fade: 0, dt: 0, axis: true, home: x, sign: 1, fleeX: 0, fleeZ: 1, stroll: 1.2 + SF.random.next()};
    revive(p);
    if (Number.isFinite(x) && Number.isFinite(z)) { p.pos.set(x, SF.world.groundY(x, z), z); p.home = p.axis ? x : z; }
    list.push(p); scene.add(mesh); return p;
  }
  function scare(x, z, r) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i], dx = p.pos.x - x, dz = p.pos.z - z, d = Math.hypot(dx, dz);
      if (p.health > 0 && d < r) {
        p.fear = 4.5; p.fleeX = d > 0.01 ? dx / d : 0; p.fleeZ = d > 0.01 ? dz / d : 1;
      }
    }
  }
  function witnessed(x, z, ignore) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i], dx = p.pos.x - x, dz = p.pos.z - z, d2 = dx * dx + dz * dz;
      if (p === ignore || p.health <= 0 || d2 >= 38 * 38) continue;
      if (!SF.police || SF.police.clearSight(x, z, p.pos.x, p.pos.z)) return true;
    }
    return false;
  }
  function registerHit(p, dmg) {
    if (!p || p.health <= 0 || dmg <= 0) return;
    p.health = Math.max(0, p.health - dmg);
    if (!p.health) p.down = 0.01;
    var x = p.pos.x, z = p.pos.z;
    scare(x, z, 21);
    if (SF.peds.onCrime && witnessed(x, z, p)) SF.peds.onCrime(p.health ? 8 : 19);
  }
  function update(dt) {
    var player = SF.player; frame = (frame + 1) % 20;
    for (var i = 0; i < list.length; i++) {
      var p = list[i], v = p.pos, dist = player ? v.distanceToSquared(player.pos) : 0;
      if (dist > 350 * 350) { p.dt = 0; continue; }
      var limit = dist > 140 * 140 ? 5 : dist > 65 * 65 ? 4 : 1;
      p.dt = Math.min(0.24, p.dt + dt);
      if ((frame + i) % limit) continue;
      var h = p.dt; p.dt = 0;
      if (!p.health) {
        p.down += h; p.mesh.rotation.z = Math.min(Math.PI / 2, p.down * 5);
        if (p.down > 3) shade(p, Math.min(4, Math.floor((p.down - 3) * 4)));
        if (p.down >= 4.25) revive(p);
        continue;
      }
      var running = p.fear > 0, speed = running ? 5.5 : p.stroll;
      var dx = running ? p.fleeX : p.axis ? Math.max(-1, Math.min(1, (p.home - v.x) * 0.5)) : p.sign;
      var dz = running ? p.fleeZ : p.axis ? p.sign : Math.max(-1, Math.min(1, (p.home - v.z) * 0.5));
      p.fear = Math.max(0, p.fear - h);
      var x = v.x + dx * speed * h, z = v.z + dz * speed * h;
      if (Math.abs(z) < 290 && x < 290 && SF.vehicles.clear(x, z, 0.4)) {
        v.set(x, SF.world.groundY(x, z), z);
        p.mesh.rotation.y = Math.atan2(dx, dz);
        p.phase += h * (running ? 13 : 7.3);
      } else {
        p.sign *= -1;
        var oldX = p.fleeX; p.fleeX = -p.fleeZ; p.fleeZ = oldX;
      }
      if (!running && SF.random.next() < h * 0.065) p.sign *= -1;
      animate(p.mesh, p.phase, running ? 0.87 : 0.48, running);
    }
  }
  SF.peds = {list: list, buildFigure: buildFigure, spawn: spawn, update: update, scare: scare,
    registerHit: registerHit, witnessed: witnessed, animate: animate, onCrime: null};
  for (var i = 0; i < 46; i++) spawn();
}());
