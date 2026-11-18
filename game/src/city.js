// Builds immediately using SF.random and SF.world. SF.city = {group, colliders}.
// colliders are conservative building footprint circles {x,z,r}; all units are meters.
(function (SF) {
  'use strict';
  const T = THREE, C = SF.CONFIG, g = C.city, rng = SF.random;
  const group = new T.Group(); group.name = 'Solano Bay buildings';
  SF.render.scene.add(group);
  const buildings = [], colliders = [], half = g.blocks * g.block / 2;
  for (let ix = 0; ix < g.blocks; ix++) for (let iz = 0; iz < g.blocks; iz++) {
    const cx = -half + (ix + .5) * g.block, cz = -half + (iz + .5) * g.block;
    const downtown = Math.max(0, 1 - Math.hypot(cx, cz) / 390);
    for (const dx of [-16, 16]) for (const dz of [-16, 16]) {
      if (rng.chance(.10)) continue;
      const w = rng.range(15, 24), d = rng.range(15, 24);
      const floors = rng.rangeInt(2, 5) + rng.rangeInt(0, Math.floor(downtown * 21));
      const h = floors * 4;
      const x = cx + dx, z = cz + dz;
      const district = downtown > .35 ? 1 : 0;
      buildings.push({x, z, w, d, h, district, color: district && rng.chance(.22) ? 0x587d88 : rng.pick(C.colors.buildings)});
      colliders.push({x, z, r: Math.hypot(w, d) / 2});
    }
  }
  const dummy = new T.Object3D();
  const roof = new T.MeshStandardMaterial({color: 0xa39683, roughness: 1});
  for (const district of [0, 1]) {
  const windows = document.createElement('canvas'); windows.width = windows.height = 128;
  const ctx = windows.getContext('2d');
  ctx.fillStyle = '#151925'; ctx.fillRect(0, 0, 128, 128);
  for (let x = 7; x < 128; x += 16) for (let y = 6; y < 128; y += 16) {
    if (!rng.chance(district ? .95 : .50)) continue;
    ctx.fillStyle = rng.chance(district ? .72 : .42) ? '#ffc37c' : '#29363e';
    ctx.fillRect(x, y, 6, 8);
  }
  const texture = new T.CanvasTexture(windows); texture.encoding = T.sRGBEncoding;
  const wall = new T.MeshStandardMaterial({color: 0xffffff, map: texture,
    emissiveMap: texture, emissive: 0xffb36b, emissiveIntensity: .30, roughness: .82});
  const districtBuildings = buildings.filter(b => b.district === district);
  const boxes = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1),
    [wall, wall, roof, roof, wall, wall], districtBuildings.length);
  districtBuildings.forEach((b, i) => {
    dummy.position.set(b.x, b.h / 2 + .16, b.z); dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix(); boxes.setMatrixAt(i, dummy.matrix);
    boxes.setColorAt(i, new T.Color(b.color));
  });
  boxes.castShadow = boxes.receiveShadow = true; group.add(boxes);
  }
  // One trunk batch and one foliage batch for the entire waterfront promenade.
  const palms = [];
  for (let z = -half; z <= half; z += 28) palms.push({x: -half - 24, z, h: rng.range(9, 14)});
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(.22, .42, 1, 6),
    new T.MeshStandardMaterial({color: 0x806348}), palms.length);
  const fronds = new T.InstancedMesh(new T.SphereGeometry(1, 6, 4),
    new T.MeshStandardMaterial({color: 0x345c46, roughness: 1}), palms.length * 5);
  palms.forEach((p, i) => {
    dummy.position.set(p.x, p.h / 2, p.z); dummy.rotation.set(0, 0, .045);
    dummy.scale.set(1, p.h, 1); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 2 / 5;
      dummy.position.set(p.x + Math.cos(a) * 1.5, p.h, p.z + Math.sin(a) * 1.5);
      dummy.rotation.set(0, -a, -.12); dummy.scale.set(3.5, .35, .85);
      dummy.updateMatrix(); fronds.setMatrixAt(i * 5 + j, dummy.matrix);
    }
  });
  trunks.castShadow = fronds.castShadow = true; group.add(trunks, fronds);
  const lights = [];
  for (const x of SF.world.roadCenters) for (let z = -half + 25; z < half; z += g.block) {
    lights.push({x: x + g.road / 2 + 2, z});
  }
  const poles = new T.InstancedMesh(new T.CylinderGeometry(.13, .18, 7, 5),
    new T.MeshStandardMaterial({color: 0x3e4144}), lights.length);
  const lamps = new T.InstancedMesh(new T.SphereGeometry(.5, 6, 4),
    new T.MeshStandardMaterial({color: 0xffe2b2, emissive: 0xffab48, emissiveIntensity: 2}), lights.length);
  lights.forEach((p, i) => {
    dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
    dummy.position.set(p.x, 3.5, p.z); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 7; dummy.updateMatrix(); lamps.setMatrixAt(i, dummy.matrix);
  });
  group.add(poles, lamps);
  SF.city = {group, colliders};
})(window.SF);
