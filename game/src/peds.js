(function (SF) {
  'use strict';
  const group = new THREE.Group(), people = []; SF.render.scene.add(group);
  function figure(color) {
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 1, 6), new THREE.MeshLambertMaterial({ color })); body.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xc38b68 })); head.position.y = 1.95;
    mesh.add(body, head);
    for (const x of [-0.19, 0.19]) SF.vehicles.box(mesh, 0.24, 0.75, 0.28, x, 0.4, 0, 0x303b50);
    mesh.traverse(m => { if (m.isMesh) m.castShadow = true; }); return mesh;
  }
  for (let i = 0; i < SF.CONFIG.perf.maxPeds; i++) {
    const mesh = figure(SF.random.pick([0xbc714c, 0x8c7296, 0xd7b86d, 0x628d85]));
    const axis = i % 2 ? 'x' : 'z', road = SF.random.pick(SF.world.roadCenters) + (i % 3 ? 11 : -11);
    mesh.position.set(axis === 'x' ? SF.random.range(-430, 430) : road, 0, axis === 'z' ? SF.random.range(-430, 430) : road);
    SF.vehicles.resolve(mesh.position, 0.6); group.add(mesh);
    people.push({ mesh, pos: mesh.position, axis, dir: i % 2 ? 1 : -1, flee: 0, vx: 0, vz: 0, down: 0, phase: i });
  }
  function scare(x, z, r) {
    for (const p of people) { const dx = p.pos.x - x, dz = p.pos.z - z, d = Math.hypot(dx, dz); if (d < r) { p.flee = 5; p.vx = dx / (d || 1); p.vz = dz / (d || 1); } }
  }
  function update(dt) {
    for (const p of people) {
      if (p.down > 0) { p.down -= dt; p.mesh.rotation.z = Math.PI / 2; if (p.down <= 0) p.mesh.rotation.z = 0; continue; }
      p.phase += dt * (p.flee > 0 ? 12 : 5); p.flee = Math.max(0, p.flee - dt);
      const vx = p.flee ? p.vx * 6 : p.axis === 'x' ? p.dir * 1.6 : 0;
      const vz = p.flee ? p.vz * 6 : p.axis === 'z' ? p.dir * 1.6 : 0;
      p.pos.x += vx * dt; p.pos.z += vz * dt;
      if (SF.vehicles.resolve(p.pos, 0.6) || Math.abs(p.pos.x) > 480 || Math.abs(p.pos.z) > 480) p.dir *= -1;
      if (SF.random.chance(dt * 0.04)) p.dir *= -1;
      p.mesh.rotation.y = Math.atan2(vx, vz); p.pos.y = Math.abs(Math.sin(p.phase)) * 0.08;
      if (SF.player && SF.player.inCar && Math.abs(SF.player.inCar.speed) > 7 && p.pos.distanceTo(SF.player.pos) < 2.8) {
        p.down = 5; scare(p.pos.x, p.pos.z, 35); SF.police.addHeat(2); SF.player.inCar.speed *= 0.7;
      }
    }
  }
  SF.peds = { group, people, figure, update, scare };
})(window.SF);
