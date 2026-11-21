(function (S) {
  'use strict';
  S.createCity = function () {
    const T = THREE, C = S.Config, G = C.city, P = C.palette;
    const random = S.Random(C.seed), root = new T.Group();
    root.name = 'Solano Bay city';
    const collisions = [], blocks = [], batches = {};
    const cube = new T.BoxGeometry(1, 1, 1);
    const cylinder = new T.CylinderGeometry(1, 1, 1, 7);
    const leaf = new T.SphereGeometry(1, 6, 4);
    const material = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.88 }, extra));
    function batch(name, geometry, mat) {
      batches[name] = { geometry, material: mat, entries: [] };
    }
    batch('buildings', cube, material(0xffffff));
    batch('roofs', cube, material(0x735659));
    batch('windows', cube, material(P.window, { emissive: P.window, emissiveIntensity: 0.65 }));
    batch('sidewalks', cube, material(P.sidewalk));
    batch('markings', cube, material(0xe7c18d));
    batch('trunks', cylinder, material(0x896148));
    batch('fronds', leaf, material(0x3d785c));
    batch('lampPosts', cylinder, material(0x45474e, { metalness: 0.4 }));
    batch('lampArms', cube, material(0x45474e));
    batch('lampBulbs', cube, material(0xffda90, { emissive: 0xffb85c, emissiveIntensity: 1.5 }));
    batch('benches', cube, material(0x955740));
    batch('crates', cube, material(0xb5804e));
    batch('containers', cube, material(0xffffff));
    function add(name, x, y, z, sx, sy, sz, color, rotation) {
      batches[name].entries.push({ x, y, z, sx, sy, sz, color, rotation: rotation || 0 });
    }
    function bound(x, z, w, d, height, kind) {
      collisions.push({ minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2, minY: 0, maxY: height, kind });
    }
    function palm(x, z, rng) {
      const h = rng.range(8, 12), angle = rng.range(0, Math.PI * 2);
      add('trunks', x, h / 2, z, 0.23, h, 0.23);
      for (let i = 0; i < 5; i++) {
        const a = angle + i * Math.PI * 0.4;
        add('fronds', x + Math.sin(a) * 1.8, h, z + Math.cos(a) * 1.8,
          0.65, 0.32, 3.1, undefined, a);
      }
      bound(x, z, 0.5, 0.5, h, 'palm');
    }
    function lamp(x, z, angle) {
      add('lampPosts', x, 3.7, z, 0.12, 7.4, 0.12);
      add('lampArms', x + Math.sin(angle), 7.3, z + Math.cos(angle), 0.16, 0.16, 2.2, undefined, angle);
      add('lampBulbs', x + Math.sin(angle) * 2, 7.15, z + Math.cos(angle) * 2, 0.65, 0.16, 1.1, undefined, angle);
      bound(x, z, 0.3, 0.3, 7.5, 'lamp');
    }
    // Streets are the continuous ground; raised islands define each walkable block.
    const island = G.block - G.road;
    for (let row = 0; row < G.rows; row++) {
      for (let col = 0; col < G.columns; col++) {
        const x = G.minX + (col + 0.5) * G.block;
        const z = G.minZ + (row + 0.5) * G.block;
        const district = C.districts.find(d => col >= d.col[0] && col <= d.col[1] && row >= d.row[0] && row <= d.row[1]);
        const rng = random.fork(col + ':' + row);
        blocks.push({ x, z, district: district.id });
        add('sidewalks', x, 0.12, z, island, 0.24, island);
        for (let slot = 0; slot < 4; slot++) {
          if (!rng.chance(district.density)) continue;
          const bx = x + (slot % 2 ? 1 : -1) * 10.5;
          const bz = z + (slot < 2 ? -1 : 1) * 10.5;
          const w = rng.range(13, 18), d = rng.range(13, 18);
          const h = rng.range(district.height[0], district.height[1]);
          add('buildings', bx, h / 2 + 0.24, bz, w, h, d, rng.pick(district.colors));
          add('roofs', bx, h + 0.45, bz, w + 0.3, 0.4, d + 0.3);
          add('roofs', bx + w * 0.2, h + 1.1, bz, 3, 1.2, 3);
          bound(bx, bz, w, d, h + 1.7, 'building');
          // Window strips on all four faces, with individually seeded dark bays.
          for (let y = 2.4; y < h - 1; y += G.floorHeight) {
            for (let bay = -1; bay <= 1; bay++) {
              if (rng.chance(0.75)) {
                add('windows', bx + bay * w * 0.26, y, bz - d / 2 - 0.03, 1.65, 1.15, 0.06);
                add('windows', bx + bay * w * 0.26, y, bz + d / 2 + 0.03, 1.65, 1.15, 0.06);
              }
              if (rng.chance(0.65)) {
                add('windows', bx - w / 2 - 0.03, y, bz + bay * d * 0.26, 0.06, 1.15, 1.65);
                add('windows', bx + w / 2 + 0.03, y, bz + bay * d * 0.26, 0.06, 1.15, 1.65);
              }
            }
          }
        }
        const edge = island / 2 - 1.8;
        lamp(x - edge, z - edge, -Math.PI / 2);
        if (rng.chance(district.props.palms)) palm(x + edge, z - edge, rng);
        if (rng.chance(district.props.palms)) palm(x - edge, z + edge, rng);
        if (rng.chance(district.props.benches)) {
          add('benches', x + edge, 0.8, z + 5, 1.1, 0.35, 3.2);
          add('benches', x + edge + 0.4, 1.3, z + 5, 0.18, 0.8, 3.2);
          bound(x + edge, z + 5, 1.5, 3.2, 1.7, 'bench');
        }
        if (rng.chance(district.props.crates)) {
          add('crates', x + 3, 1.1, z + edge, 2, 2, 2);
          bound(x + 3, z + edge, 2, 2, 2.1, 'crate');
        }
      }
    }
    // Lane dashes and crosswalks stay in the street corridors.
    for (let i = 0; i <= G.columns; i++) {
      const line = G.minX + i * G.block;
      for (let j = 0; j < G.rows; j++) {
        const center = G.minZ + (j + 0.5) * G.block;
        for (let k = -2; k <= 2; k++) {
          add('markings', line, 0.018, center + k * 9, 0.18, 0.025, 4.5);
          add('markings', center + k * 9, 0.018, line, 4.5, 0.025, 0.18);
        }
        for (let k = -2; k <= 2; k++) {
          add('markings', line + k * 2, 0.02, center - 25, 1.1, 0.025, 2.4);
          add('markings', center - 25, 0.02, line + k * 2, 2.4, 0.025, 1.1);
        }
      }
    }
    for (let z = G.minZ; z <= G.maxZ; z += 24) palm(-304, z, random);
    // Marina piers and industrial quays extend from the coastal promenade.
    const docks = new T.Group();
    for (let i = 0; i < 5; i++) {
      const dock = new T.Mesh(cube, material(0x906d58));
      dock.position.set(-382, -0.1, 20 + i * 43);
      dock.scale.set(104, 1.2, 7); dock.receiveShadow = true;
      docks.add(dock);
      collisions.push({ minX: -434, maxX: -330, minZ: 16.5 + i * 43,
        maxZ: 23.5 + i * 43, minY: -0.7, maxY: 0.5, kind: 'pier', walkable: true });
    }
    root.add(docks);
    // Industrial container yard in the southeast outer strip.
    for (let i = 0; i < 16; i++) {
      const x = 312 + (i % 2) * 9, z = 40 + Math.floor(i / 2) * 24;
      add('containers', x, 1.65, z, 7, 3.3, 16, random.pick([0xa34e41, 0x437f83, 0xbb8b48]));
      bound(x, z, 7, 16, 3.3, 'container');
    }
    const dummy = new T.Object3D(), tint = new T.Color();
    Object.keys(batches).forEach(name => {
      const b = batches[name];
      const mesh = new T.InstancedMesh(b.geometry, b.material, b.entries.length);
      mesh.name = name;
      b.entries.forEach((e, index) => {
        dummy.position.set(e.x, e.y, e.z); dummy.rotation.set(0, e.rotation, 0);
        dummy.scale.set(e.sx, e.sy, e.sz); dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (e.color !== undefined) mesh.setColorAt(index, tint.setHex(e.color));
      });
      mesh.castShadow = !['markings', 'windows', 'sidewalks', 'lampBulbs'].includes(name);
      mesh.receiveShadow = name !== 'windows';
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      root.add(mesh);
    });
    const waterGeometry = new T.PlaneGeometry(1100, 1800, C.water.segments, C.water.segments);
    waterGeometry.rotateX(-Math.PI / 2);
    const water = new T.Mesh(waterGeometry, material(P.sea, { roughness: 0.32, metalness: 0.28 }));
    water.position.set(G.seaX - 550, -1.0, 0); water.name = 'animated bay';
    root.add(water);
    const positions = waterGeometry.attributes.position;
    const shore = new T.Mesh(new T.PlaneGeometry(5, 900), material(P.seaHighlight, { transparent: true, opacity: 0.65 }));
    shore.rotation.x = -Math.PI / 2; shore.position.set(G.seaX - 2, -0.65, 0);
    root.add(shore);
    return {
      group: root, collisions, blocks, water,
      bounds: { minX: G.seaX, maxX: 342, minZ: -330, maxZ: 330 },
      update: function (time) {
        for (let i = 0; i < positions.count; i++) {
          positions.setY(i, Math.sin(positions.getX(i) * 0.035 + time * C.water.speed) *
            Math.cos(positions.getZ(i) * 0.022 + time * 0.3) * C.water.amplitude);
        }
        positions.needsUpdate = true;
        // Small waves use upward normals to avoid per-frame geometry normal work.
        shore.material.opacity = 0.48 + Math.sin(time * 0.65) * 0.12;
      }
    };
  };
})(window.Sunfall = window.Sunfall || {});
