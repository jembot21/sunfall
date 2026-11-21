(function (SF) {
  'use strict';
  const T = globalThis.THREE;
  const traffic = SF.traffic = { cars: [], initialized: false, target: 30, spawnClock: 0 };
  const random = () => SF.player?.helpers?.random?.() ?? Math.random();
  const pick = a => a[Math.floor(random() * a.length)];
  function densityCount() {
    const d = SF.CONFIG?.density || {};
    const n = Number(d.trafficCars ?? d.traffic ?? d.trafficCount ?? d.vehicles);
    return Math.max(20, Math.min(56, n || 32));
  }
  function nearest(a, value) { return a.reduce((best, x) => Math.abs(x - value) < Math.abs(best - value) ? x : best, a[0]); }
  function spawnPosition(playerPosition, radius = 58) {
    const streets = SF.player.helpers.streets(), bounds = SF.player.helpers.bounds();
    if (!streets.x.length || !streets.z.length) return { x: playerPosition.x + 0, y: 0, z: playerPosition.z + radius };
    const vertical = random() < 0.5;
    if (vertical) {
      const x = nearest(streets.x, playerPosition.x + (random() - 0.5) * radius * 1.5) + pick([-1.6, 1.6]);
      const z = Math.max(bounds.minZ + 8, Math.min(bounds.maxZ - 8, playerPosition.z + pick([-1, 1]) * radius));
      return { x, y: 0, z, heading: pick([0, Math.PI]) };
    }
    const z = nearest(streets.z, playerPosition.z + (random() - 0.5) * radius * 1.5) + pick([-1.6, 1.6]);
    const x = Math.max(bounds.minX + 8, Math.min(bounds.maxX - 8, playerPosition.x + pick([-1, 1]) * radius));
    return { x, y: 0, z, heading: pick([Math.PI / 2, -Math.PI / 2]) };
  }
  traffic.spawn = function (position, options = {}) {
    if (!SF.vehicles || !T) return null;
    const type = pick(SF.vehicles.types);
    const palette = Object.values(SF.CONFIG?.palette || {}).filter(v => typeof v === 'number' || typeof v === 'string');
    const car = SF.vehicles.create(type, { ...position, position, traffic: true,
      color: options.color ?? pick(palette.length ? palette : [0x728b98, 0x9d583d, 0xdbc58c, 0x344f65, 0x414744]),
      driver: 'traffic' });
    if (!car) return null;
    car.speed = 7 + random() * 7; car.cruiseSpeed = car.speed; car.turnTimer = random() * 2;
    car.mesh.userData.trafficCar = car; traffic.cars.push(car); return car;
  };
  traffic.init = function () {
    if (traffic.initialized || !SF.player?.mesh) return traffic;
    traffic.initialized = true; traffic.target = densityCount();
    const playerPos = SF.player.position;
    for (let i = 0; i < traffic.target; i++) {
      const p = spawnPosition(playerPos, 38 + (i % 5) * 17);
      traffic.spawn(p);
    }
    return traffic;
  };
  function closeAhead(car) {
    const player = SF.player, p = player?.position;
    if (!p) return 1;
    const dx = p.x - car.mesh.position.x, dz = p.z - car.mesh.position.z;
    const forwardX = Math.sin(car.heading), forwardZ = Math.cos(car.heading);
    const ahead = dx * forwardX + dz * forwardZ;
    const side = Math.abs(dx * forwardZ - dz * forwardX);
    return ahead > 0 && ahead < 18 && side < 3.2 ? 0.24 : 1;
  }
  function crossingSlow(car) {
    const s = SF.player.helpers.streets();
    const x = s.x.length ? nearest(s.x, car.mesh.position.x) : Infinity;
    const z = s.z.length ? nearest(s.z, car.mesh.position.z) : Infinity;
    const onX = Math.abs(x - car.mesh.position.x) < 4;
    const onZ = Math.abs(z - car.mesh.position.z) < 4;
    return onX && onZ ? 0.74 : 1;
  }
  function maybeTurn(car, dt) {
    car.turnTimer -= dt;
    if (car.turnTimer > 0) return;
    car.turnTimer = 1.2 + random() * 2.8;
    const streets = SF.player.helpers.streets();
    const nearX = streets.x.some(x => Math.abs(car.mesh.position.x - x) < 2.3);
    const nearZ = streets.z.some(z => Math.abs(car.mesh.position.z - z) < 2.3);
    if (!nearX || !nearZ || random() > 0.42) return;
    const dir = car.heading;
    const choices = Math.abs(Math.cos(dir)) > 0.7 ? [Math.PI / 2, -Math.PI / 2] : [0, Math.PI];
    car.heading += pick(choices);
    car.mesh.rotation.y = car.heading;
  }
  traffic.update = function (dt) {
    if (!SF.player?.mesh || !SF.vehicles) return;
    traffic.init(); dt = Math.min(0.06, Math.max(0, dt || 0));
    const p = SF.player.position;
    for (const car of traffic.cars) {
      if (car.dead || car.driver === SF.player) continue;
      maybeTurn(car, dt);
      const target = car.cruiseSpeed * Math.min(closeAhead(car), crossingSlow(car));
      car.speed += (target - car.speed) * Math.min(1, dt * 1.4);
      car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
      car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.rotation.y = car.heading;
      car.wheels.forEach(w => { w.tire.rotation.x += car.speed * dt / 0.37; });
      const d = Math.hypot(car.mesh.position.x - p.x, car.mesh.position.z - p.z);
      if (d > 155 || car.mesh.position.x < SF.player.helpers.bounds().minX + 3 ||
          car.mesh.position.x > SF.player.helpers.bounds().maxX - 3 ||
          car.mesh.position.z < SF.player.helpers.bounds().minZ + 3 ||
          car.mesh.position.z > SF.player.helpers.bounds().maxZ - 3) {
        SF.vehicles.remove(car); car.dead = true;
      }
    }
    traffic.cars = traffic.cars.filter(c => !c.dead);
    traffic.spawnClock -= dt;
    if (traffic.cars.length < traffic.target && traffic.spawnClock <= 0) {
      traffic.spawnClock = 0.24;
      const p0 = spawnPosition(p, 48 + random() * 44);
      // Keep respawns outside the immediate play bubble and away from occupied bumpers.
      if (traffic.cars.every(c => c.mesh.position.distanceTo(new T.Vector3(p0.x, 0, p0.z)) > 8)) traffic.spawn(p0);
    }
  };
})(globalThis.SF = globalThis.SF || {});
