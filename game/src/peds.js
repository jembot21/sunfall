(() => {
  'use strict';
  const SF = globalThis.SF ??= {};
  const instances = [];
  const shirts = [0x965354, 0x40757e, 0xab8755, 0x5a597a, 0x4e7553];
  let spawnTimer = 0, grid;

  function districtDensity(point) {
    const district = SF.city?.districtAt?.(point.x, point.z) ?? SF.world?.districtAt?.(point.x, point.z);
    const config = typeof district === 'object' ? district : SF.CONFIG?.districts?.[district];
    return Math.max(0, Math.min(2, config?.pedDensity ?? config?.pedestrianDensity ?? 1));
  }

  function spawn(player) {
    const { random, pick, distance } = SF.traffic;
    grid ??= SF.traffic.axes();
    const axis = random() < .5 ? 'x' : 'z';
    const street = axis === 'x' ? 'z' : 'x';
    const coords = grid[axis];
    const segments=coords.slice(0,-1).map((n,i)=>i).filter(i=>player[axis]>=coords[i]-35 && player[axis]<=coords[i+1]+35);
    const index = pick(segments.length?segments:coords.slice(0,-1).map((n,i)=>i));
    const low = coords[index] + 1, high = coords[index + 1] - 1;
    if (high <= low) return;
    const local = grid[street].filter(n=>Math.abs(n-player[street])<48);
    const point = { [axis]: low + random() * (high - low),
      [street]: pick(local.length?local:grid[street]) + (random() < .5 ? -1 : 1) * (SF.CONFIG?.tuning?.sidewalkOffset ?? 4.4) };
    const gap = distance(player, point);
    if (gap < 9 || gap > 53 || random() * 2 > districtDensity(point)) return;
    const mesh = SF.player.figure({ shirt: pick(shirts), skin: pick([0x754b37, 0xd39871, 0xaf7251, 0xe1ad8e]) });
    mesh.position.set(point.x, 0, point.z);
    SF.player.constrain(mesh.position);
    SF.render.scene.add(mesh);
    instances.push({ mesh, axis, low, high, direction: random() < .5 ? -1 : 1,
      pace: .9 + random() * .8, health: 100, flee: 0, down: 0 });
  }

  function disposeFigure(mesh) {
    mesh.removeFromParent();
    const materials = new Set();
    mesh.traverse(node => {
      node.geometry?.dispose();
      if (node.material) materials.add(node.material);
    });
    for (const material of materials) material.dispose();
  }

  function scare(ped, point, seconds) {
    ped.flee = seconds;
    const value = ped.mesh.position[ped.axis];
    const away = Math.sign(value - point[ped.axis]);
    if (away) ped.direction = away;
  }

  SF.peds = {
    instances, disposeFigure,
    alarm(point, radius = 20) {
      for (const ped of instances) {
        if (ped.health > 0 && SF.traffic.distance(ped.mesh.position, point) < radius) scare(ped, point, 5);
      }
    },
    update(dt) {
      if (!SF.traffic || !SF.player.position) return;
      const player = SF.player.position;
      const car = SF.player.car;
      for (let i = instances.length - 1; i >= 0; i--) {
        const ped = instances[i], p = ped.mesh.position;
        const gap = SF.traffic.distance(p, player);
        if (gap > 67 || ped.down >= 4) {
          disposeFigure(ped.mesh);
          instances.splice(i, 1);
          continue;
        }
        if (ped.health <= 0) {
          ped.down += dt;
          ped.mesh.rotation.z = Math.min(Math.PI / 2, ped.down * 6);
          continue;
        }
        if (car && gap < 10 && Math.abs(car.speed) > 8) scare(ped, player, 3);
        ped.flee = Math.max(0, ped.flee - dt);
        const pace = ped.flee > 0 ? 5.8 : ped.pace;
        const next = p[ped.axis] + ped.direction * pace * dt;
        p[ped.axis] = Math.max(ped.low, Math.min(ped.high, next));
        if (next < ped.low || next > ped.high) ped.direction *= -1;
        SF.player.constrain(p);
        ped.mesh.rotation.y = ped.axis === 'x' ? ped.direction * Math.PI / 2 : ped.direction > 0 ? 0 : Math.PI;
        ped.mesh.userData.animate(dt, pace);
      }
      spawnTimer -= dt;
      if (spawnTimer > 0) return;
      spawnTimer = .3;
      const target = Math.round(19 * districtDensity(player));
      for (let i = 0; i < 5 && instances.length < target; i++) spawn(player);
    }
  };
})();
