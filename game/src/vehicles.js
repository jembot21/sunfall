// Cars use +Z as forward. All actors share the same collision helpers.
(function (SF) {
  'use strict';
  const C = SF.CONFIG, group = new THREE.Group(), parked = [], all = [];
  SF.render.scene.add(group);
  const roads = SF.world.roadCenters = SF.world.roadCenters || Array.from({ length: C.city.blocksAcross }, (_, i) => (i - (C.city.blocksAcross - 1) / 2) * C.city.blockSize);
  SF.world.bounds = SF.world.bounds || { minX: C.city.coastX + 8, maxX: 550, minZ: -550, maxZ: 550 };
  SF.world.coastX = C.city.coastX;
  const palette = [0xd76b48, 0xe8b95f, 0x568c94, 0x8d6085, 0xd9ccc0, 0x394456];
  function box(parent, w, h, d, x, y, z, color, glow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, emissive: glow ? color : 0, emissiveIntensity: glow ? 1.4 : 0 }));
    m.position.set(x, y, z); m.castShadow = !glow; parent.add(m); return m;
  }
  function createCar(color) {
    const mesh = new THREE.Group(), wheels = [];
    color = color === undefined ? SF.random.pick(palette) : color;
    box(mesh, 2.7, 0.85, 5.2, 0, 0.95, 0, color);
    box(mesh, 2.25, 0.92, 2.6, 0, 1.78, -0.2, 0x243745);
    box(mesh, 2.35, 0.16, 2.7, 0, 2.28, -0.2, color);
    box(mesh, 2.8, 0.23, 0.25, 0, 0.68, 2.65, 0xbab8aa);
    box(mesh, 2.8, 0.23, 0.25, 0, 0.68, -2.65, 0xbab8aa);
    for (const x of [-0.87, 0.87]) {
      box(mesh, 0.55, 0.28, 0.12, x, 1.1, 2.64, 0xffe1a1, true);
      box(mesh, 0.55, 0.25, 0.12, x, 1.1, -2.64, 0xe94c43, true);
    }
    const tire = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 10), rubber = new THREE.MeshStandardMaterial({ color: 0x17191d });
    for (const x of [-1.4, 1.4]) for (const z of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(tire, rubber); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.55, z); mesh.add(wheel); wheels.push(wheel);
    }
    const car = { mesh, pos: mesh.position, speed: 0, heading: 0, radius: 2.2, wheels, occupied: false, kind: 'parked', crashCooldown: 0 };
    group.add(mesh); all.push(car); return car;
  }
  function resolve(pos, radius) {
    const b = SF.world.bounds; let hit = false;
    const x = pos.x, z = pos.z;
    pos.x = Math.max(b.minX + radius, Math.min(b.maxX - radius, pos.x));
    pos.z = Math.max(b.minZ + radius, Math.min(b.maxZ - radius, pos.z));
    hit = x !== pos.x || z !== pos.z;
    for (const c of SF.city.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + radius;
      if (d < r) { pos.x = c.x + (d > 0.001 ? dx / d : 1) * r; pos.z = c.z + (d > 0.001 ? dz / d : 0) * r; hit = true; }
    }
    return hit;
  }
  function step(car, dt, throttle, steer, brake, collide) {
    const oldSpeed = car.speed;
    car.speed += throttle * C.physics.acceleration * dt;
    car.speed *= Math.exp(-(brake ? 3.2 : throttle ? 0.13 : 0.7) * dt);
    car.speed = Math.max(-12, Math.min(C.physics.vehicleSpeed, car.speed));
    car.heading += steer * C.physics.turnRate * Math.min(1, Math.abs(car.speed) / 12) * Math.sign(car.speed) * dt * (brake ? 1.6 : 1);
    car.drift = (car.drift || 0) + (car.heading - (car.drift || 0)) * Math.min(1, dt * (brake ? 2.5 : 12));
    car.pos.x += Math.sin(car.drift) * car.speed * dt; car.pos.z += Math.cos(car.drift) * car.speed * dt;
    car.crashCooldown = Math.max(0, car.crashCooldown - dt);
    let hit = collide !== false && resolve(car.pos, car.radius);
    if (collide !== false) for (const other of all) {
      if (other === car || !other.mesh.visible) continue;
      const dx = car.pos.x - other.pos.x, dz = car.pos.z - other.pos.z, d = Math.hypot(dx, dz);
      if (d < 4.3) { car.pos.x += (dx / (d || 1)) * (4.3 - d); car.pos.z += (dz / (d || 1)) * (4.3 - d); hit = true; }
    }
    if (hit) {
      car.speed *= -0.25;
      if (Math.abs(oldSpeed) > 9 && car.crashCooldown === 0) {
        car.crashCooldown = 1; if (SF.peds) SF.peds.scare(car.pos.x, car.pos.z, 35);
        if (SF.player && SF.player.inCar === car) { SF.player.hurt(Math.abs(oldSpeed) * 0.4); SF.police.addHeat(1); }
      }
    }
    car.mesh.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 1.8;
  }
  function update(dt) {
    for (const car of parked) {
      if (SF.player && SF.player.inCar === car) {
        const i = SF.input;
        step(car, dt, Number(i.isDown('forward')) - Number(i.isDown('back')), Number(i.isDown('left')) - Number(i.isDown('right')), i.isDown('handbrake'));
      } else if (Math.abs(car.speed) > 0.05) step(car, dt, 0, 0, true);
    }
  }
  // Curb parking avoids the existing city's unusually wide collision circles.
  for (let i = 0; i < 16; i++) {
    const car = createCar(); car.pos.set(roads[i % roads.length] + 7, 0, (Math.floor(i / roads.length) * 2 - 1) * 46);
    resolve(car.pos, car.radius); parked.push(car);
  }
  SF.vehicles = { group, createCar, update, parked, all, resolve, step, box };
})(window.SF);
