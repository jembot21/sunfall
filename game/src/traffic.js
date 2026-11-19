(function () {
  'use strict';
  var fleet = [], cars = SF.vehicles.list, grid = SF.vehicles.step;
  var head = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  var dx = [0, 1, 0, -1], dz = [1, 0, -1, 0];
  var lane = 4, edge = SF.vehicles.half + 22, frame = 0, targetCount = 14;
  function place(state, initial) {
    var car = state.car, dir = Math.floor(SF.random.next() * 4);
    var center = (Math.floor(SF.random.next() * 6) - 3) * grid + grid / 2;
    var along = initial ? (SF.random.next() - 0.5) * 530 : -edge;
    var x = dx[dir] ? dx[dir] * along : center - dz[dir] * lane;
    var z = dz[dir] ? dz[dir] * along : center + dx[dir] * lane;
    car.reset(x, z, head[dir]); car.driver = 'ai';
    state.dir = dir; state.wait = 0; state.blocked = 0; state.dt = 0;
    var cross = dx[dir] ? x : z;
    state.cross = (Math.floor(cross / grid) + 0.5) * grid;
    if ((state.cross - cross) * (dx[dir] || dz[dir]) < 12) state.cross += (dx[dir] || dz[dir]) * grid;
    state.turn = -1; state.cruise = 13 + SF.random.next() * 7;
  }
  for (var n = 0; n < 26; n++) {
    var car = SF.vehicles.create(0, 0, 0, n % 5);
    var slot = {car: car, dir: 0, cross: 0, turn: -1, wait: 0, blocked: 0, dt: 0, cruise: 15};
    fleet.push(slot);
    if (n < targetCount) place(slot, true);
    else car.active = car.mesh.visible = false;
  }
  function gapTo(p, x, z, fx, fz, clearance) {
    var rx = p.x - x, rz = p.z - z, forward = rx * fx + rz * fz;
    return forward > 0 && Math.abs(rx * fz - rz * fx) < 1.95 ? Math.max(0, forward - clearance) : 1e6;
  }
  function drive(slot, dt, player) {
    var car = slot.car, p = car.pos, dir = slot.dir, fx = dx[dir], fz = dz[dir];
    var along = fx ? p.x : p.z, sign = fx || fz;
    var remaining = (slot.cross - along) * sign;
    if (remaining < 23 && slot.turn < 0) {
      var roll = SF.random.next();
      slot.turn = roll < 0.23 ? (dir + 1) % 4 : roll < 0.46 ? (dir + 3) % 4 : dir;
    }
    var target = slot.turn < 0 ? dir : slot.turn;
    var corner = slot.cross + (fx ? -dz[target] : dx[target]) * lane;
    var gap = player && !player.inCar ? gapTo(player.pos, p.x, p.z, fx, fz, 3.4) : 1e6;
    for (var i = 0; i < cars.length; i++) {
      var other = cars[i];
      if (other !== car && other.active) gap = Math.min(gap, gapTo(other.pos, p.x, p.z, fx, fz, 5.4));
    }
    if (gap < 1) {
      slot.wait = 0.48;
      slot.blocked += dt;
      if (slot.blocked > 8 && (!player || p.distanceToSquared(player.pos) > 115 * 115)) { place(slot, false); return; }
    } else { slot.wait = Math.max(0, slot.wait - dt); slot.blocked = 0; }
    var goal = slot.wait ? 0 : Math.min(target !== dir ? 9 : slot.cruise, Math.sqrt(13 * gap));
    car.speed += Math.max(-30 * dt, Math.min(6.5 * dt, goal - car.speed));
    var move = Math.min(gap, car.speed * dt), toCorner = (corner - along) * sign;
    if (remaining < 23 && move >= toCorner) {
      var reach = Math.max(0, toCorner);
      p.x += fx * reach; p.z += fz * reach; move -= reach;
      slot.dir = dir = target; fx = dx[dir]; fz = dz[dir]; sign = fx || fz;
      along = fx ? p.x : p.z;
      slot.cross = (Math.floor(along / grid) + 0.5) * grid;
      if ((slot.cross - along) * sign < 12) slot.cross += sign * grid;
      slot.turn = -1;
    }
    p.x += fx * move; p.z += fz * move;
    p.y = SF.world.groundY(p.x, p.z);
    var angle = head[dir] - car.heading;
    car.heading += Math.atan2(Math.sin(angle), Math.cos(angle)) * Math.min(1, dt * 12);
    car.mesh.rotation.y = car.heading;
    car.vx = fx * car.speed; car.vz = fz * car.speed;
    car.spin -= move / 0.36;
    for (var j = 0; j < 4; j++) car.wheels[j].rotation.x = car.spin;
    if (Math.abs(p.x) > edge + 1 || Math.abs(p.z) > edge + 1) place(slot, false);
  }
  function update(dt) {
    var player = SF.player, count = 0, spare = null;
    frame = (frame + 1) % 20;
    for (var i = 0; i < fleet.length; i++) {
      var slot = fleet[i], car = slot.car;
      if (car.driver !== 'ai') {
        if (!car.active || (car.driver === null && player &&
            (car.health <= 0 || car.stolen) && car.pos.distanceToSquared(player.pos) > 350 * 350)) spare = slot;
        continue;
      }
      count++;
      var dist = player ? car.pos.distanceToSquared(player.pos) : 0;
      if (dist > 350 * 350) { slot.dt = 0; continue; }
      if (car.health <= 0) {
        if (dist > 75 * 75) place(slot, false);
        else car.speed = car.vx = car.vz = 0;
        continue;
      }
      slot.dt = Math.min(0.2, slot.dt + dt);
      var divisor = dist > 200 * 200 ? 5 : dist > 100 * 100 ? 4 : 1;
      if ((frame + i) % divisor) continue;
      drive(slot, slot.dt, player); slot.dt = 0;
    }
    if (count < targetCount && spare) place(spare, false);
  }
  SF.traffic = {update: update, fleet: fleet};
}());
