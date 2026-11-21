(function () {
  'use strict';
  var scene = SF.render.scene, list = [];
  var defs = [
    { name: 'Falco GT', kind: 'sports coupe', colors: ['#a94f43','#c17f50','#455d67'], topSpeed: 53, accel: 19, grip: 7, health: 100, cabin: 0.56, length: 4.4 },
    { name: 'Palma Sedan', kind: 'sedan', colors: ['#397a80','#e7ddc8','#a45d54'], topSpeed: 40, accel: 13, grip: 6, health: 100, cabin: 0.74, length: 4.6 },
    { name: 'Brisa Taxi', kind: 'taxi', colors: ['#d7aa58','#eee4cd','#bb744c'], topSpeed: 36, accel: 14, grip: 8, health: 100, cabin: 0.78, length: 3.7 },
    { name: 'Ironworks Hauler', kind: 'truck', colors: ['#b9734f','#667e75','#d0b16f'], topSpeed: 39, accel: 12, grip: 5, health: 120, cabin: 0.88, length: 5.8 },
    { name: 'Solano Van', kind: 'van', colors: ['#71847b','#e5dfd0','#b17862'], topSpeed: 34, accel: 11, grip: 5, health: 110, cabin: 1.18, length: 4.8 },
    { name: 'Sundial RS', kind: 'sports car', colors: ['#d5ad55','#b85750','#438d88'], topSpeed: 63, accel: 24, grip: 9, health: 100, cabin: 0.48, length: 4.3 }
  ];
  var box = new THREE.BoxGeometry(1, 1, 1);
  var tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.29, 10);
  var hubGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.303, 8);
  tireGeo.rotateZ(Math.PI / 2); hubGeo.rotateZ(Math.PI / 2);
  var rubber = new THREE.MeshStandardMaterial({color: 0x22212a, roughness: 0.91});
  var alloy = new THREE.MeshStandardMaterial({color: 0xb2aeb9, metalness: 0.65, roughness: 0.43});
  var glass = new THREE.MeshStandardMaterial({color: 0x35484b, metalness: 0.38, roughness: 0.24});
  var head = new THREE.MeshStandardMaterial({color: 0xfff2c4, emissive: 0xffd99c, emissiveIntensity: 1.4});
  var tail = new THREE.MeshStandardMaterial({color: 0xf14458, emissive: 0xe42142, emissiveIntensity: 0.85});
  var paint = defs.map(function (d) {
    return d.colors.map(function (color) { return new THREE.MeshStandardMaterial({color: color, metalness: 0.38, roughness: 0.34}); });
  });
  var step = SF.CONFIG.grid.block + SF.CONFIG.grid.road, half = SF.CONFIG.grid.halfCity;
  var cellSize = 32, gridStart = -480, gridSize = 32, cells = [];
  for (var i = 0; i < gridSize * gridSize; i++) cells.push([]);
  SF.city.colliders.forEach(function (c) {
    for (var z = cell(c.z - c.r - 3); z <= cell(c.z + c.r + 3); z++) {
      for (var x = cell(c.x - c.r - 3); x <= cell(c.x + c.r + 3); x++) cells[z * gridSize + x].push(c);
    }
  });
  function cell(n) { return Math.min(gridSize - 1, Math.max(0, Math.floor((n - gridStart) / cellSize))); }
  function nearby(x, z) { return cells[cell(z) * gridSize + cell(x)]; }
  function clear(x, z, radius) {
    var obstacles = nearby(x, z);
    for (var i = 0; i < obstacles.length; i++) {
      var c = obstacles[i], dx = x - c.x, dz = z - c.z, r = c.r + radius;
      if (dx * dx + dz * dz < r * r) return false;
    }
    return !SF.world.isWater(x, z);
  }
  function part(parent, material, x, y, z, w, h, l) {
    var mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, l); parent.add(mesh);
    return mesh;
  }
  function simulate(dt, controls) {
    if (!this.active || dt <= 0) return;
    var gas = controls ? controls.throttle || 0 : 0;
    var steer = controls ? controls.steer || 0 : 0;
    var drift = controls && controls.handbrake, brake = controls && controls.brake;
    var d = this.def, h = 1 / 120;
    this.remainder += Math.min(dt, 0.25);
    var slices = Math.floor(this.remainder / h + 1e-8);
    this.remainder = Math.max(0, this.remainder - slices * h);
    var p = this.pos;
    for (var j = 0; j < slices; j++) {
      var braking = brake || (gas && this.speed * gas < -0.1);
      if (braking) {
        var loss = (brake ? 26 : 35) * h;
        this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - loss);
      } else {
        this.speed += gas * d.accel * h * (gas < 0 ? 0.67 : 1);
      }
      this.speed *= Math.exp(-(drift ? 1.85 : gas ? 0.09 : 0.72) * h);
      var top = this.health > 0 ? d.topSpeed : 0;
      this.speed = Math.max(-Math.min(13, top), Math.min(top, this.speed));
      var turn = Math.min(1, Math.abs(this.speed) / 5) / (1 + Math.abs(this.speed) * 0.017);
      this.heading += steer * Math.sign(this.speed) * turn * (drift ? 2.75 : 1.9) * h;
      var blend = 1 - Math.exp(-(drift ? d.grip * 0.23 : d.grip * 2.5) * h);
      this.vx += (Math.sin(this.heading) * this.speed - this.vx) * blend;
      this.vz += (Math.cos(this.heading) * this.speed - this.vz) * blend;
      var x = p.x + this.vx * h, z = p.z + this.vz * h, hit = 0;
      var obstacles = nearby(x, z);
      for (var i = 0; i < obstacles.length; i++) {
        var c = obstacles[i], dx = x - c.x, dz = z - c.z, r = c.r + 1.35;
        if (dx * dx + dz * dz >= r * r) continue;
        var norm = Math.hypot(dx, dz);
        if (norm > 0.00001) { dx /= norm; dz /= norm; } else { dx = 1; dz = 0; }
        x = c.x + dx * (r + 0.001); z = c.z + dz * (r + 0.001);
        var inward = this.vx * dx + this.vz * dz;
        if (inward < 0) { this.vx -= inward * dx; this.vz -= inward * dz; hit = Math.max(hit, -inward); }
      }
      if (this.driver === 'player') {
        for (var k = 0; k < list.length; k++) {
          var other = list[k];
          if (other === this || !other.active) continue;
          var rx = x - other.pos.x, rz = z - other.pos.z;
          if (rx * rx + rz * rz > 16) continue;
          var s = Math.sin(other.heading), co = Math.cos(other.heading);
          var localX = rx * co - rz * s, localZ = rx * s + rz * co;
          var w = 1.72, l = other.def.length / 2 + 0.85;
          var sx = w - Math.abs(localX), sz = l - Math.abs(localZ);
          if (sx <= 0 || sz <= 0) continue;
          var nx, nz, push;
          if (sx < sz) {
            var side = localX < 0 ? -1 : 1;
            nx = co * side; nz = -s * side; push = sx;
          } else {
            var end = localZ < 0 ? -1 : 1;
            nx = s * end; nz = co * end; push = sz;
          }
          x += nx * (push + 0.001); z += nz * (push + 0.001);
          var impact = this.vx * nx + this.vz * nz;
          if (impact < 0) {
            this.vx -= impact * nx; this.vz -= impact * nz; hit = Math.max(hit, -impact);
            other.health = Math.max(0, other.health - Math.max(0, -impact - 6) * 0.34);
          }
        }
      }
      if (SF.world.isWater(x, z)) { x = p.x; this.vx = 0; hit = Math.max(hit, Math.abs(this.speed)); }
      if (hit > 1) {
        this.health = Math.max(0, this.health - Math.max(0, hit - 5) * 0.65);
        this.speed *= Math.max(0, 1 - hit / (Math.abs(this.speed) + 1));
      }
      p.x = x; p.z = z;
      this.spin -= this.speed * h / 0.36;
    }
    p.y = SF.world.groundY(p.x, p.z);
    this.mesh.rotation.y = this.heading;
    for (var w = 0; w < 4; w++) {
      this.wheels[w].rotation.x = this.spin;
      this.wheels[w].parent.rotation.y = w < 2 ? steer * 0.42 : 0;
    }
  }
  function reset(x, z, heading) {
    this.pos.set(x, SF.world.groundY(x, z), z);
    this.heading = this.mesh.rotation.y = heading;
    this.speed = this.vx = this.vz = this.spin = this.remainder = 0;
    this.health = 100; this.stolen = false;
    this.active = this.mesh.visible = true;
  }
  function create(x, z, heading, defIdx) {
    var d = defs[defIdx] || defs[1], colors = paint[defs.indexOf(d)], l = d.length;
    var car = new THREE.Group(), color = colors[Math.floor(SF.random.next() * colors.length)];
    part(car, rubber, 0, 0.46, 0, 1.89, 0.28, l);
    part(car, color, 0, 0.76, 0, 1.85, 0.52, l - 0.05).castShadow = true;
    var cabZ = defIdx === 3 ? 0.46 : -0.28;
    var cabL = defIdx === 4 ? 3.22 : defIdx === 3 ? 1.6 : l * 0.49;
    part(car, glass, 0, 0.98 + d.cabin / 2, cabZ, 1.57, d.cabin, cabL);
    part(car, color, 0, 1 + d.cabin, cabZ - 0.05, 1.54, 0.11, cabL - 0.24);
    if (defIdx === 3) {
      part(car, rubber, 0, 0.95, -1.42, 1.6, 0.16, 2.15);
      part(car, color, -0.79, 1.08, -1.42, 0.08, 0.54, 2.1);
      part(car, color, 0.79, 1.08, -1.42, 0.08, 0.54, 2.1);
    }
    if (defIdx === 2) {
      var roofSign = document.createElement('canvas'); roofSign.width = 128; roofSign.height = 48;
      var signCtx = roofSign.getContext('2d'); signCtx.fillStyle = '#f1bd62'; signCtx.fillRect(0,0,128,48);
      signCtx.fillStyle = '#34403c'; signCtx.font = 'bold 29px system-ui'; signCtx.textAlign = 'center'; signCtx.textBaseline = 'middle'; signCtx.fillText('TAXI',64,25);
      var signTexture = new THREE.CanvasTexture(roofSign); signTexture.encoding = THREE.sRGBEncoding;
      var sign = new THREE.Mesh(new THREE.BoxGeometry(0.76,0.31,0.38), new THREE.MeshStandardMaterial({map:signTexture,emissive:'#d99b44',emissiveIntensity:0.25}));
      sign.position.set(0,1.34+d.cabin,0.05); car.add(sign);
    }
    var wheels = [];
    for (var i = 0; i < 4; i++) {
      var side = i % 2 ? 1 : -1, pivot = new THREE.Group(), wheel = new THREE.Group();
      pivot.position.set(side * 0.9, 0.37, (i < 2 ? 1 : -1) * l * 0.31);
      wheel.add(new THREE.Mesh(tireGeo, rubber), new THREE.Mesh(hubGeo, alloy));
      pivot.add(wheel); car.add(pivot); wheels.push(wheel);
      if (i < 2) {
        part(car, head, side * 0.63, 0.82, l / 2, 0.37, 0.16, 0.065);
        part(car, tail, side * 0.67, 0.83, -l / 2, 0.32, 0.15, 0.065);
      }
    }
    var result = {mesh: car, pos: car.position, heading: heading, speed: 0, health: 100,
      name: d.name, def: d, defIdx: defs.indexOf(d), stolen: false, driver: null,
      locked: false, active: true, spin: 0, vx: 0, vz: 0, remainder: 0, wheels: wheels, update: simulate, reset: reset};
    result.reset(x, z, heading); list.push(result); scene.add(car);
    return result;
  }
  function nearestEnterable(x, z, maxDist) {
    var best = null, limit = maxDist * maxDist;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.active || c.locked || c.health <= 0 || c.driver === 'cop' || c.driver === 'player' || Math.abs(c.speed) > 6) continue;
      var dx = c.pos.x - x, dz = c.pos.z - z, distance = dx * dx + dz * dz;
      if (distance <= limit) { limit = distance; best = c; }
    }
    return best;
  }
  SF.vehicles = {defs: defs, create: create, list: list, nearestEnterable: nearestEnterable,
    clear: clear, nearbyColliders: nearby, step: step, half: half};
  var parked = 0;
  for (var slot = 0; slot < 180 && parked < 29; slot++) {
    var cross = (Math.floor(SF.random.next() * 6) - 3) * step + step / 2;
    var along = (Math.floor(SF.random.next() * 6) - 3) * step + 18 + SF.random.next() * 45;
    var vertical = SF.random.next() < 0.5, side = SF.random.next() < 0.5 ? -1 : 1;
    var x = vertical ? cross + side * 7 : along, z = vertical ? along : cross + side * 7;
    if (!clear(x, z, 1.7) || nearestEnterable(x, z, 8)) continue;
    var defIdx = parked === 8 || parked === 22 ? 5 : Math.floor(SF.random.next() * 5);
    var c = create(x, z, vertical ? (side < 0 ? 0 : Math.PI) : side > 0 ? Math.PI / 2 : -Math.PI / 2, defIdx);
    c.locked = parked === 22; parked++;
  }
}());
