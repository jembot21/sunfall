/* Deterministic static city. No instance owns geometry, material, or texture. */
(function () {
  'use strict';
  var SF = window.SF, C = SF.CONFIG, S = C.street, T = window.THREE;
  var city = SF.city = {
    streets: [], intersections: [], sidewalks: [], parkingSpots: [], propSpots: [],
    collisions: [], blocks: [], textures: {}, resources: null, root: null,
    bounds: { minX: S.originX - 9, maxX: S.originX + S.gridColumns * S.blockSize + 9,
      minZ: S.originZ - 9, maxZ: S.originZ + S.gridRows * S.blockSize + 9 }
  };
  city.districtAt = function (x, z) {
    var col = (x - S.originX) / S.blockSize, row = (z - S.originZ) / S.blockSize;
    return C.districts.find(function (d) { return col >= d.col[0] && col < d.col[1] && row >= d.row[0] && row < d.row[1]; }) || null;
  };
  function texture(size, draw, repeat) {
    var canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    var map = new T.CanvasTexture(canvas);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.repeat.set(repeat || 1, repeat || 1);
    if ('colorSpace' in map && T.SRGBColorSpace) map.colorSpace = T.SRGBColorSpace;
    else if (T.sRGBEncoding) map.encoding = T.sRGBEncoding;
    return map;
  }
  function makeTextures() {
    var r = SF.random.create(C.seed + 17);
    city.textures.asphalt = texture(256, function (g, n) {
      g.fillStyle = C.palette.asphalt; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 11500; i++) {
        var light = r.int(25, 78); g.fillStyle = 'rgba(' + light + ',' + (light - 3) + ',' + (light - 6) + ',.36)';
        g.fillRect(r.int(0, n), r.int(0, n), r.chance(0.9) ? 1 : 2, 1);
      }
      g.fillStyle = '#15141622';
      [40, 73, 180, 213].forEach(function (x) { g.fillRect(x, 0, 9, n); });
      g.strokeStyle = '#17151666'; g.lineWidth = 0.7;
      for (var j = 0; j < 8; j++) {
        var x = r.range(0, n), y = r.range(0, n); g.beginPath(); g.moveTo(x, y);
        for (var k = 0; k < 5; k++) { x += r.range(-9, 9); y += r.range(4, 12); g.lineTo(x, y); }
        g.stroke();
      }
    });
    city.textures.sidewalk = texture(128, function (g, n) {
      g.fillStyle = '#b6a58d'; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 1400; i++) { g.fillStyle = r.chance(0.5) ? '#ffffff0c' : '#54453812'; g.fillRect(r.int(0, n), r.int(0, n), 1, 1); }
      g.strokeStyle = '#746b5c66'; g.lineWidth = 1;
      g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64); g.strokeRect(64, 0, 64, 64); g.strokeRect(0, 64, 64, 64);
    }, 2);
    city.textures.facades = [0, 1].map(function (variant) {
      return texture(128, function (g, n) {
        g.fillStyle = '#e8dfd1'; g.fillRect(0, 0, n, n);
        for (var y = 8; y < n; y += 24) {
          g.fillStyle = '#9c897b'; g.fillRect(0, y + 17, n, 2);
          for (var x = 8; x < n; x += variant ? 28 : 24) {
            g.fillStyle = '#344749'; g.fillRect(x, y, 11, 14);
            g.fillStyle = '#c5a58a'; g.fillRect(x - 1, y + 14, 14, 2);
          }
        }
      });
    });
    city.textures.water = texture(128, function (g, n) {
      g.fillStyle = '#287e7b'; g.fillRect(0, 0, n, n);
      for (var i = 0; i < 180; i++) {
        g.strokeStyle = r.chance(0.3) ? '#a4d0b137' : '#123e5528';
        var x = r.range(0, n), y = r.range(0, n);
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 9, y - 2, x + 20, y); g.stroke();
      }
    }, 34);
  }
  city.build = function (scene) {
    if (city.root) return city.root;
    makeTextures();
    var r = SF.random.create(C.seed), group = new T.Group(); group.name = 'Solano Bay static city';
    var geometries = {
      box: new T.BoxGeometry(1, 1, 1), cylinder: new T.CylinderGeometry(0.5, 0.5, 1, 7),
      leaf: new T.SphereGeometry(1, 6, 4)
    };
    function material(color, extra) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.9, metalness: 0 }, extra || {})); }
    var mats = {
      road: material('#ffffff', { map: city.textures.asphalt }),
      sidewalk: material('#ffffff', { map: city.textures.sidewalk }),
      curb: material(C.palette.curb), line: material(C.palette.lane),
      facade0: material('#ffffff', { map: city.textures.facades[0] }),
      facade1: material('#ffffff', { map: city.textures.facades[1] }),
      roof: material('#796657'), glow: material('#ffc477', { emissive: '#ffb44f', emissiveIntensity: 0.65 }),
      trunk: material('#826144'), leaves: material('#456e43'), metal: material('#3b4d4d', { metalness: 0.35 }),
      wood: material('#966947'), teal: material('#397b78'), red: material('#b36b4e'),
      glass: material('#496b70', { metalness: 0.25, roughness: 0.35 }),
      sand: material(C.palette.sand), foam: material('#b9cfb1'),
      water: material(C.palette.sea, { map: city.textures.water, metalness: 0.28, roughness: 0.38 })
    };
    var batches = {}, dummy = new T.Object3D();
    function add(kind, mat, x, y, z, w, h, d, angle, color, tilt) {
      var key = kind + ':' + mat;
      if (!batches[key]) batches[key] = { kind: kind, mat: mat, items: [] };
      batches[key].items.push([x, y, z, w, h, d, angle || 0, color, tilt || 0]);
    }
    function box(mat, x, y, z, w, h, d, angle, color) { add('box', mat, x, y, z, w, h, d, angle, color); }
    function collision(x, z, w, d, height, type) {
      city.collisions.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height: height, type: type });
    }
    var B = S.blockSize, R = S.roadWidth, W = S.sidewalkWidth, ox = S.originX, oz = S.originZ;
    function road(x, z, length, axis) {
      var horizontal = axis === 'x', angle = horizontal ? Math.PI / 2 : 0;
      box('road', x, -0.055, z, R, 0.1, length, angle);
      city.streets.push({ id: 'street-' + city.streets.length, axis: axis, x: x, z: z,
        length: length, width: R, lanes: 2, laneWidth: S.laneWidth,
        start: { x: horizontal ? x - length / 2 : x, z: horizontal ? z : z - length / 2 },
        end: { x: horizontal ? x + length / 2 : x, z: horizontal ? z : z + length / 2 } });
      [-1, 1].forEach(function (side) {
        box('line', horizontal ? x : x + side * (R / 2 - 0.7), 0.012,
          horizontal ? z + side * (R / 2 - 0.7) : z, 0.12, 0.018, length - 32, angle);
      });
      for (var t = -length / 2 + 18; t < length / 2 - 18; t += S.dashLength + S.dashGap) {
        box('line', horizontal ? x + t : x, 0.015, horizontal ? z : z + t, 0.16, 0.02, S.dashLength, angle);
      }
    }
    // Segment the roads at junctions so dashed and edge lines never cross a zebra.
    for (var ix = 0; ix <= S.gridColumns; ix++) {
      for (var iz = 0; iz < S.gridRows; iz++) road(ox + ix * B, oz + (iz + 0.5) * B, B, 'z');
    }
    for (var jz = 0; jz <= S.gridRows; jz++) {
      for (var jx = 0; jx < S.gridColumns; jx++) road(ox + (jx + 0.5) * B, oz + jz * B, B, 'x');
    }
    for (var cx = 0; cx <= S.gridColumns; cx++) {
      for (var cz = 0; cz <= S.gridRows; cz++) {
        var px = ox + cx * B, pz = oz + cz * B;
        city.intersections.push({ id: 'junction-' + cx + '-' + cz, x: px, z: pz, radius: R / 2,
          neighbors: [[cx - 1, cz], [cx + 1, cz], [cx, cz - 1], [cx, cz + 1]].filter(function (v) { return v[0] >= 0 && v[0] <= S.gridColumns && v[1] >= 0 && v[1] <= S.gridRows; }).map(function (v) { return 'junction-' + v[0] + '-' + v[1]; }) });
        // Four approach crossings, with clear asphalt between each paint stripe.
        [-1, 1].forEach(function (side) {
          for (var stripe = -7; stripe <= 7; stripe += 2) {
            box('line', px + stripe, 0.023, pz + side * 12, 0.95, 0.025, 3.2);
            box('line', px + side * 12, 0.023, pz + stripe, 3.2, 0.025, 0.95);
          }
        });
      }
    }
    function palm(x, z, height) {
      add('cylinder', 'trunk', x, height / 2, z, 0.5, height, 0.5);
      for (var i = 0; i < 5; i++) {
        var a = i * Math.PI * 2 / 5;
        add('leaf', 'leaves', x + Math.sin(a) * 1.4, height, z + Math.cos(a) * 1.4, 0.65, 0.25, 3.3, a, null, 0.2);
      }
      collision(x, z, 0.6, 0.6, height, 'palm');
    }
    function lamp(x, z, angle) {
      add('cylinder', 'metal', x, 3.4, z, 0.16, 6.8, 0.16);
      box('metal', x + Math.sin(angle) * 0.8, 6.8, z + Math.cos(angle) * 0.8, 0.12, 0.12, 1.8, angle);
      box('glow', x + Math.sin(angle) * 1.5, 6.7, z + Math.cos(angle) * 1.5, 0.55, 0.15, 1.0, angle);
      collision(x, z, 0.3, 0.3, 6.8, 'lamp');
    }
    function prop(type, x, z, angle, district) {
      city.propSpots.push({ type: type, x: x, y: S.curbHeight, z: z, heading: angle, district: district.id });
      var y = S.curbHeight;
      if (type === 'planter') {
        box('curb', x, y + 0.4, z, 1.5, 0.8, 1.5);
        add('leaf', 'leaves', x, y + 1, z, 1.0, 0.65, 1.0);
      } else if (type === 'bench') {
        box('wood', x, y + 0.55, z, 2.5, 0.18, 0.8, angle);
        box('wood', x - Math.sin(angle) * 0.35, y + 1.0, z - Math.cos(angle) * 0.35, 2.5, 0.65, 0.12, angle);
        [-0.8, 0.8].forEach(function (t) { box('metal', x + Math.cos(angle) * t, y + 0.25, z - Math.sin(angle) * t, 0.15, 0.5, 0.65, angle); });
      } else if (type === 'sign') {
        add('cylinder', 'metal', x, y + 1.7, z, 0.08, 3.4, 0.08);
        box('teal', x, y + 3, z, 1.3, 0.35, 0.09, angle);
        box('line', x, y + 3, z + 0.052, 0.8, 0.045, 0.015, angle);
      } else if (type === 'bus') {
        [-1.8, 1.8].forEach(function (t) { box('metal', x + Math.cos(angle) * t, y + 1.3, z - Math.sin(angle) * t, 0.12, 2.6, 0.12, angle); });
        box('teal', x, y + 2.7, z, 4.3, 0.18, 1.9, angle);
        box('glass', x - Math.sin(angle) * 0.65, y + 1.45, z - Math.cos(angle) * 0.65, 3.6, 2.1, 0.08, angle);
        box('wood', x, y + 0.5, z, 3.1, 0.18, 0.65, angle);
      } else if (type === 'barrel') {
        add('cylinder', 'red', x, y + 0.55, z, 0.85, 1.1, 0.85);
        add('cylinder', 'metal', x, y + 0.8, z, 0.88, 0.08, 0.88);
      } else if (type === 'crate') {
        box('wood', x, y + 0.6, z, 1.25, 1.2, 1.25, angle);
        box('roof', x, y + 0.6, z, 1.3, 0.1, 1.3, angle);
      } else {
        box(type === 'news' ? 'red' : 'metal', x, y + 0.6, z, 0.7, 1.2, 0.7, angle);
        box(type === 'news' ? 'glass' : 'roof', x, y + 0.9, z + 0.36, 0.5, 0.35, 0.025, angle);
      }
      // Conservative axis-aligned bounds include a rotated shelter or bench.
      var size = type === 'bus' ? 4.4 : type === 'bench' ? 2.6 : type === 'planter' ? 1.6 : 1.3;
      collision(x, z, size, size, type === 'sign' ? 3.4 : 1.5, type);
    }
    for (var col = 0; col < S.gridColumns; col++) {
      for (var row = 0; row < S.gridRows; row++) {
        var bx = ox + (col + 0.5) * B, bz = oz + (row + 0.5) * B;
        var district = city.districtAt(bx, bz), inner = B - R - W * 2;
        city.blocks.push({ x: bx, z: bz, width: inner, depth: inner, district: district.id });
        // Sidewalk strips leave explicit 5m corner cutouts for the crossings.
        [-1, 1].forEach(function (side) {
          var offset = B / 2 - R / 2 - W / 2, extent = B - R;
          box('sidewalk', bx, S.curbHeight / 2, bz + side * offset, extent, S.curbHeight, W);
          box('sidewalk', bx + side * offset, S.curbHeight / 2, bz, W, S.curbHeight, extent - W * 2);
          box('curb', bx, S.curbHeight, bz + side * (B / 2 - R / 2 - 0.16), extent, 0.16, 0.32);
          box('curb', bx + side * (B / 2 - R / 2 - 0.16), S.curbHeight, bz, 0.32, 0.16, extent);
          ['x', 'z'].forEach(function (axis) {
            var horiz = axis === 'x';
            city.sidewalks.push({ x: horiz ? bx : bx + side * offset, z: horiz ? bz + side * offset : bz,
              axis: axis, length: extent - 10, width: W, y: S.curbHeight, district: district.id });
            for (var t = -24; t <= 24; t += 12) {
              var spotX = horiz ? bx + t : bx + side * (B / 2 - R / 2 + 1.5);
              var spotZ = horiz ? bz + side * (B / 2 - R / 2 + 1.5) : bz + t;
              city.parkingSpots.push({ x: spotX, y: 0, z: spotZ, heading: horiz ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI), district: district.id, occupied: false });
            }
            var angle = horiz ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
            for (var p = -22; p <= 22; p += 22) {
              var sx = horiz ? bx + p : bx + side * offset, sz = horiz ? bz + side * offset : bz + p;
              if (r.chance(district.density * 0.86)) prop(r.pick(district.props), sx, sz, angle, district);
            }
            lamp(horiz ? bx - 32 : bx + side * offset, horiz ? bz + side * offset : bz - 32, angle);
            if (district.id !== 'port') palm(horiz ? bx + 32 : bx + side * offset, horiz ? bz + side * offset : bz + 32, r.range(7, 11));
          });
        });
        // Four perimeter lots plus small rear structures preserve visible alleys.
        var lotSize = inner / 2;
        for (var lx = -1; lx <= 1; lx += 2) {
          for (var lz = -1; lz <= 1; lz += 2) {
            if (!r.chance(0.76 + district.density * 0.24)) continue;
            var w = r.range(21, lotSize - 2), depth = r.range(20, lotSize - 2);
            var h = r.range(district.height[0], district.height[1]);
            var x = bx + lx * (lotSize / 2 + 0.7), z = bz + lz * (lotSize / 2 + 0.7), color = r.pick(district.colors);
            box(r.chance(0.5) ? 'facade0' : 'facade1', x, h / 2, z, w, h, depth, 0, color);
            box('roof', x, h + 0.18, z, w + 0.35, 0.35, depth + 0.35);
            box('metal', x + w * 0.2, h + 0.8, z, 2.5, 1.2, 2);
            collision(x, z, w + 0.35, depth + 0.35, h + 0.35, 'building');
            for (var floor = 3; floor < h - 1; floor += 3.4) {
              for (var win = -w / 2 + 2; win < w / 2 - 1; win += 3.2) {
                if (r.chance(0.36)) {
                  box('glow', x + win, floor, z + depth / 2 + 0.025, 0.85, 1.3, 0.045);
                  box('glow', x + win, floor, z - depth / 2 - 0.025, 0.85, 1.3, 0.045);
                }
              }
              for (var sideWin = -depth / 2 + 2; sideWin < depth / 2 - 1; sideWin += 3.2) {
                if (r.chance(0.3)) {
                  box('glow', x + w / 2 + 0.025, floor, z + sideWin, 0.045, 1.3, 0.85);
                  box('glow', x - w / 2 - 0.025, floor, z + sideWin, 0.045, 1.3, 0.85);
                }
              }
            }
          }
        }
      }
    }
    box('sand', -608, -0.22, 0, 46, 0.3, 1130);
    box('foam', -634, -0.32, 0, 3, 0.05, 1250);
    box('water', -1284, -0.4, 0, 1300, 0.08, 2800);
    // A continuous seafront walkway connects the otherwise gridded coastal blocks.
    box('sidewalk', -592, 0.1, 0, 8, 0.2, 1090);
    for (var coastZ = -510; coastZ <= 510; coastZ += 28) {
      palm(-600, coastZ, r.range(8, 12));
      if (coastZ % 56 === -6) prop('bench', -591, coastZ, Math.PI / 2, C.districts[0]);
    }
    var counts = {};
    Object.keys(batches).forEach(function (key) {
      var batch = batches[key], mesh = new T.InstancedMesh(geometries[batch.kind], mats[batch.mat], batch.items.length);
      mesh.name = key; mesh.castShadow = ['line', 'road', 'sidewalk', 'water', 'foam', 'sand', 'glow'].indexOf(batch.mat) < 0;
      mesh.receiveShadow = batch.mat !== 'glow';
      batch.items.forEach(function (v, index) {
        dummy.position.set(v[0], v[1], v[2]); dummy.rotation.set(v[8], v[6], 0); dummy.scale.set(v[3], v[4], v[5]); dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (v[7]) mesh.setColorAt(index, new T.Color(v[7]));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // Bounds must cover instances, not the unit primitive, on older three releases.
      if (mesh.computeBoundingSphere) mesh.computeBoundingSphere();
      else mesh.frustumCulled = false;
      group.add(mesh); counts[key] = batch.items.length;
    });
    city.resources = { geometries: geometries, materials: mats, instanceCounts: counts,
      textureCount: 5, batchCount: Object.keys(batches).length };
    city.root = group; scene.add(group); return group;
  };
  city.update = function (elapsed, dt) {
    if (!city.textures.water) return;
    city.textures.water.offset.set((elapsed * 0.006) % 1, (elapsed * 0.003) % 1);
  };
}());
