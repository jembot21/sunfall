(function (SF) {
  'use strict';
  const group = new THREE.Group(), cars = [], roads = SF.world.roadCenters;
  SF.render.scene.add(group);
  function spawn(car, near) {
    car.axis = SF.random.chance(0.5) ? 'x' : 'z'; car.dir = SF.random.chance(0.5) ? 1 : -1;
    car.road = SF.random.pick(roads); car.lastIntersection = null;
    const along = near ? SF.random.range(-400, 400) : SF.random.pick([-490, 490]);
    car.pos.set(car.axis === 'x' ? along : car.road + car.dir * 4, 0, car.axis === 'z' ? along : car.road - car.dir * 4);
    car.speed = 0; car.heading = car.axis === 'x' ? car.dir * Math.PI / 2 : car.dir > 0 ? 0 : Math.PI;
    car.mesh.rotation.y = car.heading;
  }
  for (let i = 0; i < SF.CONFIG.perf.maxTraffic; i++) {
    const car = SF.vehicles.createCar(); car.kind = 'traffic'; group.add(car.mesh); spawn(car, true); cars.push(car);
  }
  function update(dt) {
    const player = SF.player;
    for (const c of cars) {
      if (player && player.inCar === c) continue;
      const along = c.axis === 'x' ? c.pos.x : c.pos.z;
      if (Math.abs(along) > 525 || (player && c.pos.distanceTo(player.pos) > 720)) { spawn(c, false); continue; }
      const intersection = roads.find(r => Math.abs(along - r) < 1.8);
      if (intersection !== undefined && c.lastIntersection !== intersection) {
        c.lastIntersection = intersection;
        if (SF.random.chance(0.32)) {
          const oldRoad = c.road; c.road = intersection; c.axis = c.axis === 'x' ? 'z' : 'x'; c.dir = SF.random.chance(0.5) ? 1 : -1;
          if (c.axis === 'x') c.pos.set(oldRoad + c.dir * 5, 0, c.road - c.dir * 4);
          else c.pos.set(c.road + c.dir * 4, 0, oldRoad + c.dir * 5);
        }
      }
      if (intersection === undefined) c.lastIntersection = null;
      c.heading = c.axis === 'x' ? c.dir * Math.PI / 2 : c.dir > 0 ? 0 : Math.PI;
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      let blocked = false;
      for (const other of SF.vehicles.all) {
        if (other === c || !other.mesh.visible) continue;
        const dx = other.pos.x - c.pos.x, dz = other.pos.z - c.pos.z;
        const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (ahead > 0 && ahead < 11 && side < 3.2) { blocked = true; break; }
      }
      if (player && !player.inCar) {
        const dx = player.pos.x - c.pos.x, dz = player.pos.z - c.pos.z;
        if (dx * fx + dz * fz > 0 && dx * fx + dz * fz < 10 && Math.abs(dx * fz - dz * fx) < 3) blocked = true;
      }
      c.speed += ((blocked ? 0 : 12) - c.speed) * Math.min(1, dt * 4);
      c.pos.x += fx * c.speed * dt; c.pos.z += fz * c.speed * dt;
      const lane = c.road + (c.axis === 'z' ? 1 : -1) * c.dir * 4;
      if (c.axis === 'x') c.pos.z += (lane - c.pos.z) * Math.min(1, dt * 5); else c.pos.x += (lane - c.pos.x) * Math.min(1, dt * 5);
      c.mesh.rotation.y = c.heading;
      for (const w of c.wheels) w.rotation.x += c.speed * dt;
    }
  }
  SF.traffic = { group, cars, update };
})(window.SF);
