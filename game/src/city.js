(function () {
  'use strict';
  const SF = window.SF, C = SF.CONFIG, T = THREE, S = C.street;
  const city = SF.city = { streets: [], intersections: [], sidewalks: [], parkingSpots: [], propSpots: [], collisionBounds: [], water: null };
  const step = S.blockSize, west = -step * S.columns / 2, north = -step * S.rows / 2;
  city.bounds = { minX: west, maxX: -west, minZ: north, maxZ: -north };
  city.districtAt = function (x, z) { return C.districts[Math.min(2, Math.max(0, Math.floor((x - west) / (step * 3)))) + (z >= 0 ? 3 : 0)]; };
  for (let x = 0; x <= S.columns; x++) city.streets.push({ axis: 'z', x: west + x * step, z: 0, length: step * S.rows + S.roadWidth, width: S.roadWidth });
  for (let z = 0; z <= S.rows; z++) city.streets.push({ axis: 'x', x: 0, z: north + z * step, length: step * S.columns + S.roadWidth, width: S.roadWidth });
  for (let x = 0; x <= S.columns; x++) for (let z = 0; z <= S.rows; z++) city.intersections.push({ x: west + x * step, z: north + z * step });
  city.build = function (scene) {
    if (city.group) return city.group;
    const rng = SF.random.seeded(C.seed), group = city.group = new T.Group(); scene.add(group);
    const batches = new Map(), dummy = new T.Object3D();
    const materials = {};
    function mat(color, emissive) { const key = color + ':' + (emissive || 0); return materials[key] || (materials[key] = SF.assets.standard({ color, roughness: 0.88, emissive: emissive || 0, emissiveIntensity: 0.7 })); }
    function box(x, y, z, w, h, d, color, emissive, rotation) {
      const material = mat(color, emissive), key = material.uuid;
      if (!batches.has(key)) batches.set(key, { material, items: [] });
      batches.get(key).items.push({ x, y, z, w, h, d, rotation: rotation || 0 });
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#302a26'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) { const v = rng.int(25, 72); ctx.fillStyle = 'rgba(' + v + ',' + (v - 5) + ',' + (v - 9) + ',0.35)'; ctx.fillRect(rng.int(0, 255), rng.int(0, 255), 1, 1); }
    ctx.strokeStyle = '#231f1c'; ctx.lineWidth = 1;
    for (let i = 0; i < 13; i++) { let x = rng.range(0, 256), y = rng.range(0, 256); ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += rng.range(-15, 15); y += rng.range(4, 17); ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.fillStyle = 'rgba(10,8,7,.12)'; [49, 83, 173, 207].forEach(x => ctx.fillRect(x, 0, 12, 256));
    const asphalt = new T.CanvasTexture(canvas); asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping; asphalt.repeat.set(1, 5); if (T.sRGBEncoding) asphalt.encoding = T.sRGBEncoding;
    const roadMaterial = new T.MeshStandardMaterial({ map: asphalt, roughness: 1, color: 0xd1b9a0 });
    city.streets.forEach(road => {
      const vertical = road.axis === 'z';
      // Vertical ribbons own the junction squares: horizontal spans end at their edges.
      // This avoids coplanar asphalt faces and different texture directions flickering.
      const segmentCount = vertical ? 1 : S.columns;
      for (let segment = 0; segment < segmentCount; segment++) {
        const length = vertical ? road.length : step - S.roadWidth;
        const mesh = new T.Mesh(SF.assets.box, roadMaterial);
        mesh.scale.set(S.roadWidth, 0.12, length);
        mesh.position.set(vertical ? road.x : west + (segment + 0.5) * step, 0.015, road.z);
        mesh.rotation.y = vertical ? 0 : Math.PI / 2; mesh.receiveShadow = true; group.add(mesh);
      }
      for (let a = -road.length / 2 + 3; a < road.length / 2; a += 9) {
        const coordinate = a + (vertical ? -north : -west), nearest = Math.abs(coordinate / step - Math.round(coordinate / step)) * step;
        if (nearest < 12) continue;
        box(road.x + (vertical ? 0 : a), 0.09, road.z + (vertical ? a : 0), vertical ? 0.15 : 4.5, 0.025, vertical ? 4.5 : 0.15, 0xe8c98c);
      }
      for (const side of [-1, 1]) {
        // Edge lines stop at junction mouths rather than running across crosswalks.
        const count = vertical ? S.rows : S.columns, start = vertical ? north : west;
        for (let i = 0; i < count; i++) {
          const a = start + (i + 0.5) * step;
          box(vertical ? road.x + side * 7 : a, 0.09, vertical ? a : road.z + side * 7, vertical ? 0.13 : step - 20, 0.025, vertical ? step - 20 : 0.13, 0xd8cbb5);
        }
      }
    });
    city.intersections.forEach(p => {
      for (const side of [-1, 1]) for (let k = -5; k <= 5; k += 2) {
        box(p.x + k, 0.1, p.z + side * 10, 1.15, 0.025, 3.2, 0xe6d8bf);
        box(p.x + side * 10, 0.1, p.z + k, 3.2, 0.025, 1.15, 0xe6d8bf);
      }
    });
    function prop(kind, x, z, angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      const part = (dx, y, dz, w, h, d, color, glow) => box(x + dx * c + dz * s, y, z - dx * s + dz * c, w, h, d, color, glow, angle);
      if (kind === 'palm') {
        part(0, 4.7, 0, 0.45, 9, 0.45, 0x76543a);
        for (let i = 0; i < 6; i++) box(x, 9.1 + (i % 2) * 0.2, z, 6.5, 0.18, 0.85, 0x416d43, 0, i * Math.PI / 3);
      } else if (kind === 'bench') {
        part(0, 0.9, 0, 2.5, 0.18, 0.8, 0x996c46); part(0, 1.4, -0.35, 2.5, 0.8, 0.15, 0x996c46);
        [-0.9, 0.9].forEach(a => part(a, 0.5, 0, 0.15, 0.8, 0.65, 0x353d38));
      } else if (kind === 'planter') { part(0, 0.7, 0, 2.3, 1, 1.3, 0xb7a189); part(0, 1.45, 0, 2, 0.8, 1.05, 0x4b7945); }
      else if (kind === 'bus') {
        [-2, 2].forEach(a => part(a, 1.8, 0, 0.13, 3.2, 0.13, 0x394b49)); part(0, 3.45, 0, 5, 0.2, 2.6, 0x627c73); part(0, 1.8, -1, 4.2, 2.7, 0.12, 0x718f89); part(0, 0.8, 0, 3.5, 0.2, 0.7, 0xb39c72);
      } else if (kind === 'sign') { part(0, 1.8, 0, 0.1, 3.3, 0.1, 0x77796b); part(0, 3.1, 0, 1.8, 0.6, 0.12, 0x397367); }
      else if (kind === 'news') { part(0, 0.95, 0, 0.8, 1.5, 0.75, 0xb65a3a); part(0, 1.2, 0.4, 0.6, 0.45, 0.05, 0xe5d5b6); }
      else if (kind === 'crate') { part(0, 0.9, 0, 1.5, 1.5, 1.5, 0x987447); part(0, 0.9, 0, 1.6, 0.12, 1.6, 0x574b37); }
      else if (kind === 'barrel') { part(0, 0.8, 0, 0.9, 1.2, 0.9, 0x855044); part(0, 0.8, 0, 0.96, 0.12, 0.96, 0x414841); }
      else { part(0, 0.85, 0, 0.7, 1.2, 0.7, 0x3c6258); part(0, 1.5, 0, 0.8, 0.15, 0.8, 0x293e38); }
    }
    for (let ix = 0; ix < S.columns; ix++) for (let iz = 0; iz < S.rows; iz++) {
      const x = west + (ix + 0.5) * step, z = north + (iz + 0.5) * step, district = city.districtAt(x, z), extent = step - S.roadWidth;
      box(x, 0.18, z, extent, 0.36, extent, C.palette.sidewalk);
      for (const side of [-1, 1]) {
        box(x + side * (extent / 2 - 0.16), 0.25, z, 0.32, 0.5, extent, C.palette.curb);
        box(x, 0.25, z + side * (extent / 2 - 0.16), extent, 0.5, 0.32, C.palette.curb);
        city.sidewalks.push({ x: x + side * (extent / 2 - 2.5), z, width: 5, length: extent, axis: 'z', district: district.name });
        city.sidewalks.push({ x, z: z + side * (extent / 2 - 2.5), width: 5, length: extent, axis: 'x', district: district.name });
        for (let offset = -24; offset <= 24; offset += 12) {
          city.parkingSpots.push({ x: x + offset, z: z + side * (extent / 2 + 1.6), heading: side > 0 ? Math.PI / 2 : -Math.PI / 2, district: district.name });
          city.parkingSpots.push({ x: x + side * (extent / 2 + 1.6), z: z + offset, heading: side > 0 ? 0 : Math.PI, district: district.name });
        }
        for (let offset = -24; offset <= 24; offset += 16) {
          const px = x + offset, pz = z + side * (extent / 2 - 2.5), kind = rng.pick(district.props);
          city.propSpots.push({ x: px, z: pz, heading: side > 0 ? 0 : Math.PI, kind, district: district.name }); prop(kind, px, pz, side > 0 ? 0 : Math.PI);
          prop(rng.pick(district.props), x + side * (extent / 2 - 2.5), z + offset, Math.PI / 2);
        }
        const lx = x + side * 27, lz = z + side * 29;
        box(lx, 4.4, lz, 0.16, 8.4, 0.16, 0x484a3d); box(lx, 8.6, lz, 2.4, 0.15, 0.3, 0x484a3d); box(lx + 0.9, 8.45, lz, 0.7, 0.12, 0.4, 0xffd69a, 0xffb35f);
      }
      for (let bx = -1; bx <= 1; bx++) for (let bz = -1; bz <= 1; bz++) {
        if (!rng.chance(district.density)) { prop('planter', x + bx * 17, z + bz * 17, 0); continue; }
        const px = x + bx * 17, pz = z + bz * 17, w = rng.range(12, 16), d = rng.range(12, 16), h = rng.range(...district.heights);
        box(px, h / 2 + 0.36, pz, w, h, d, rng.pick(district.colors)); box(px, h + 0.7, pz, w + 0.5, 0.7, d + 0.5, 0x82654d);
        city.collisionBounds.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, height: h });
        // Facades need no canvases: every window is an instance of the same box,
        // using just the shared lit/unlit finishes across the entire city.
        for (let y = 3; y < h - 1; y += 3.5) for (let a = -4; a <= 4; a += 4) {
          const glow = rng.chance(0.38), color = glow ? 0xd99b53 : 0x233e42;
          for (const side of [-1, 1]) { box(px + a, y, pz + side * (d / 2 + 0.035), 1.4, 1.7, 0.08, color, glow ? 0xd38b43 : 0); box(px + side * (w / 2 + 0.035), y, pz + a, 0.08, 1.7, 1.4, color, glow ? 0xd38b43 : 0); }
        }
      }
    }
    batches.forEach(batch => {
      const mesh = new T.InstancedMesh(SF.assets.box, batch.material, batch.items.length);
      batch.items.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.scale.set(p.w, p.h, p.d); dummy.rotation.set(0, p.rotation, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      // InstancedMesh.setMatrixAt only edits the CPU-side buffer. Mark it dirty so
      // WebGL uploads the transforms instead of drawing every instance at origin.
      if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere?.();
      mesh.castShadow = false; mesh.receiveShadow = true; group.add(mesh);
    });
    return group;
  };
}());
