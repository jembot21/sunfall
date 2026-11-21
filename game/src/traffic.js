(() => {
  'use strict';
  const SF = globalThis.SF ??= {};
  const moving = [], parked = [];
  const vo = ['sportsCoupe', 'sedan', 'taxi', 'truck', 'van', 'sportsCar'];
  let seed = 64351, tick = 0, signals = 0;
  const random = () => typeof SF.random === 'function' ? SF.random() :
    ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pick = list => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  function axes() {
    const grid = SF.city?.streetGrid ?? SF.world?.streetGrid ?? SF.city?.grid ?? SF.world?.grid;
    const values = axis => {
      const source = grid?.[axis] ?? grid?.[axis + 's'] ?? SF.city?.['street' + axis.toUpperCase()];
      if (!Array.isArray(source)) return [];
      return [...new Set(source.map(value => Number.isFinite(value) ? value : value?.[axis])
        .filter(Number.isFinite))].sort((a, b) => a - b);
    };
    const x = values('x'), z = values('z');
    if (x.length > 1 && z.length > 1) return { x, z };
    const min = SF.player.constrain({ x: -Infinity, z: -Infinity });
    const max = SF.player.constrain({ x: Infinity, z: Infinity });
    const spacing = SF.CONFIG?.tuning?.blockSize || 24;
    const fallback = (low, high) => {
      const result = [];
      for (let n = Math.ceil((low + 3) / spacing) * spacing; n < high - 3; n += spacing) result.push(n);
      return result.length > 1 ? result : [low + (high - low) * .25, low + (high - low) * .75];
    };
    return { x: x.length > 1 ? x : fallback(min.x, max.x), z: z.length > 1 ? z : fallback(min.z, max.z) };
  }

  function neighbors(grid, point) {
    const i = grid.x.indexOf(point.x), j = grid.z.indexOf(point.z);
    return [
      ...[grid.x[i - 1], grid.x[i + 1]].filter(Number.isFinite).map(x => ({ x, z: point.z })),
      ...[grid.z[j - 1], grid.z[j + 1]].filter(Number.isFinite).map(z => ({ x: point.x, z }))
    ];
  }

  function lanePoint(a, b, offset) {
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    return { x: a.x + Math.cos(yaw) * offset, z: a.z - Math.sin(yaw) * offset, yaw };
  }

  function spawnNear(player, park, grid) {
    const localX=grid.x.filter(x=>Math.abs(x-player.x)<70), localZ=grid.z.filter(z=>Math.abs(z-player.z)<70);
    const node = { x: pick(localX.length?localX:grid.x), z: pick(localZ.length?localZ:grid.z) };
    const next = pick(neighbors(grid, node));
    const gap = distance(node, player);
    if (gap < 12 || gap > 69 || !next) return;
    const point = lanePoint(node, next, park ? 3.2 : 1.45);
    const progress = park ? .35 + random() * .29 : .14;
    point.x += (next.x - node.x) * progress;
    point.z += (next.z - node.z) * progress;
    if (SF.vehicles.instances.some(car => distance(point, car.mesh.position) < 6)) return;
    const record = { from: node, to: next, progress, crossed: false };
    record.car = SF.vehicles.spawn(pick(vo), point, { heading: point.yaw, driver: park ? null : record });
    if (record.car) (park ? parked : moving).push(record);
  }

  function advance(record, dt, player, grid) {
    const { car, from, to } = record;
    const p = car.mesh.position;
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    const fx = dx / length, fz = dz / length;
    const remaining = length * (1 - record.progress);
    const red = (Math.floor(signals / 5) + (dx !== 0 ? 1 : 0)) % 2 === 0;
    function blocks(point, width) {
      const x = point.x - p.x, z = point.z - p.z;
      const ahead = x * fx + z * fz;
      return ahead > -.5 && ahead < 3.2 + car.speed * .45 && Math.abs(x * fz - z * fx) < width;
    }
    const obstacle = blocks(player, SF.player.car ? 2 : 1.3) ||
      SF.vehicles.instances.some(other => other !== car && blocks(other.mesh.position, 1.75));
    const crossing = !record.crossed && red && remaining < 6;
    const target = obstacle ? 0 : crossing ? Math.max(0, (remaining - 2.8) * 1.4) : car.spec.speed * .41;
    car.brake = target < car.speed - .2 || obstacle || crossing;
    car.speed += Math.max(-14 * dt, Math.min(4 * dt, target - car.speed));
    record.progress += car.speed * dt / length;
    if (remaining < 2.7 && !red) record.crossed = true;
    if (record.progress >= 1) {
      const choices = neighbors(grid, to).filter(point => distance(point, from) > 0);
      record.from = to;
      record.to = choices.length ? pick(choices) : from;
      record.progress = 0;
      record.crossed = false;
    }
    const point = lanePoint(record.from, record.to, 1.45);
    const yawDelta = point.yaw - car.mesh.rotation.y;
    const turn = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
    car.steer = Math.max(-1, Math.min(1, turn));
    car.mesh.rotation.y += turn * Math.min(1, dt * 8);
    const x = point.x + (record.to.x - record.from.x) * record.progress;
    const z = point.z + (record.to.z - record.from.z) * record.progress;
    p.x += (x - p.x) * Math.min(1, dt * 13);
    p.z += (z - p.z) * Math.min(1, dt * 13);
  }

  SF.traffic = {
    moving, parked, axes, pick, random, distance, beamCar: null,
    update(dt) {
      const player = SF.player.position;
      if (!player || !SF.vehicles) return;
      signals += dt;
      tick -= dt;
      const grid = this.grid ??= axes();
      this.beamCar = null;
      let beamDistance = 28;
      for (const records of [moving, parked]) {
        for (let i = records.length - 1; i >= 0; i--) {
          const record = records[i], car = record.car;
          const gap = distance(player, car.mesh.position);
          if (car.driver === SF.player) {
            if (records === moving) {
              parked.push(record);
              records.splice(i, 1);
            }
          }
          else if (gap > 86) {
            SF.vehicles.remove(car);
            records.splice(i, 1);
          } else if (records === moving && car.driver === record) {
            advance(record, dt, player, grid);
            if (gap < beamDistance) {
              beamDistance = gap;
              this.beamCar = car;
            }
          } else if (records === moving) {
            parked.push(record);
            records.splice(i, 1);
          }
        }
      }
      if (tick > 0) return;
      tick = .25;
      for (let i = 0; i < 4; i++) {
        if (moving.length < 12) spawnNear(player, false, grid);
        if (parked.length < 12) spawnNear(player, true, grid);
      }
    }
  };
})();
