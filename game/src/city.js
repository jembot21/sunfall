/**
 * Sunfall — City Architecture & Urban Scenery Subsystem
 *
 * Populates Solano Bay with:
 * - InstancedMesh procedural buildings with varied heights (tall downtown towers,
 *   mid-rise coastal and commercial blocks) and emissive sunset-lit window textures.
 * - Instanced coastal palm trees lining the Solano Bay oceanfront boulevard.
 * - Instanced streetlights with glowing emissive lanterns.
 * - Bounding colliders array exposed for player, pedestrian, and vehicle collision physics.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var group = new THREE.Group();
  group.name = 'city';

  var colliders = [];

  var GRID = (SF.CONFIG && SF.CONFIG.GRID) || {
    BLOCK_SIZE: 72,
    ROAD_WIDTH: 18,
    SIDEWALK_WIDTH: 3.5,
    BLOCKS_X: 8,
    BLOCKS_Z: 8,
    BEACH_WIDTH: 45
  };

  var BLOCK_SIZE = GRID.BLOCK_SIZE;
  var ROAD_WIDTH = GRID.ROAD_WIDTH;
  var HALF_ROAD = ROAD_WIDTH / 2;
  var STRIDE = BLOCK_SIZE + ROAD_WIDTH;
  var BLOCKS_X = GRID.BLOCKS_X;
  var BLOCKS_Z = GRID.BLOCKS_Z;

  var PALETTE = (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.BUILDING_PALETTE) || [
    0x36283b, 0x48333e, 0x2c263d, 0x563842, 0x232130, 0x443038, 0x3b334a
  ];

  // Procedural emissive window texture
  function createWindowTexture(downtown) {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');

    // Dark building surface facade
    ctx.fillStyle = '#17151e';
    ctx.fillRect(0, 0, 128, 128);

    var cols = downtown ? 8 : 5;
    var rows = downtown ? 8 : 5;
    var winW = 8;
    var winH = 9;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = 5 + c * (120 / cols);
        var y = 5 + r * (120 / rows);

        // Variety of lit, sunset-orange, and darkened windows
        var pattern = SF.random.value();
        if (pattern < (downtown ? 0.6 : 0.3)) {
          ctx.fillStyle = '#ffdd77'; // lit warm yellow
        } else if (pattern < (downtown ? 0.8 : 0.5)) {
          ctx.fillStyle = '#ff9a3c'; // sunset reflection orange
        } else {
          ctx.fillStyle = '#100e16'; // unlit window
        }
        ctx.fillRect(x, y, winW, winH);
      }
    }

    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    return tex;
  }

  // --- 1. Buildings Generation ---
  function buildCityBuildings() {
    var windowTex = createWindowTexture(false);

    var mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: windowTex,
      emissive: 0xffaa44,
      emissiveMap: windowTex,
      emissiveIntensity: 0.45,
      roughness: 0.75,
      metalness: 0.2
    });

    var buildingSpecs = [];
    var zHalf = BLOCKS_Z / 2;

    // Downtown center is around blocks X: 3..5, Z: 3..5
    var centerDowntownX = (3.5 * STRIDE) + HALF_ROAD;
    var centerDowntownZ = 0;

    for (var ix = 0; ix < BLOCKS_X; ix++) {
      var bx0 = (ix * STRIDE) + HALF_ROAD;
      for (var iz = 0; iz < BLOCKS_Z; iz++) {
        var bz0 = ((iz - zHalf) * STRIDE) + HALF_ROAD;

        var blockCenterX = bx0 + (BLOCK_SIZE / 2);
        var blockCenterZ = bz0 + (BLOCK_SIZE / 2);

        var distDowntown = Math.hypot(blockCenterX - centerDowntownX, blockCenterZ - centerDowntownZ);
        var downtownFactor = Math.max(0, 1 - (distDowntown / 320));

        // Deterministic building layout for each block
        var layoutSeed = (ix * 13 + iz * 29) % 3;

        if (layoutSeed === 0) {
          // Large central skyscraper + 2 perimeter commercial annexes
          var towerH = 35 + (downtownFactor * 65);
          var towerW = 34 + (downtownFactor * 10);
          var towerD = 34 + (downtownFactor * 10);
          buildingSpecs.push({
            x: blockCenterX,
            z: blockCenterZ,
            w: towerW,
            h: towerH,
            d: towerD,
            color: PALETTE[(ix + iz) % PALETTE.length]
          });

          // Small annexes
          buildingSpecs.push({
            x: blockCenterX - 18,
            z: blockCenterZ + 18,
            w: 16,
            h: 14 + (downtownFactor * 12),
            d: 16,
            color: PALETTE[(ix * 2 + iz) % PALETTE.length]
          });
          buildingSpecs.push({
            x: blockCenterX + 18,
            z: blockCenterZ - 18,
            w: 16,
            h: 16 + (downtownFactor * 10),
            d: 16,
            color: PALETTE[(ix + iz * 3) % PALETTE.length]
          });
        } else if (layoutSeed === 1) {
          // Twin towers or dual blocks
          var h1 = 28 + (downtownFactor * 48);
          var h2 = 24 + (downtownFactor * 42);
          buildingSpecs.push({
            x: blockCenterX - 14,
            z: blockCenterZ,
            w: 24,
            h: h1,
            d: 46,
            color: PALETTE[(ix * 3 + iz) % PALETTE.length]
          });
          buildingSpecs.push({
            x: blockCenterX + 14,
            z: blockCenterZ,
            w: 24,
            h: h2,
            d: 46,
            color: PALETTE[(ix + iz * 2) % PALETTE.length]
          });
        } else {
          // 4 corner residential/office blocks
          var offsets = [
            { dx: -15, dz: -15 },
            { dx: 15, dz: -15 },
            { dx: -15, dz: 15 },
            { dx: 15, dz: 15 }
          ];
          for (var k = 0; k < 4; k++) {
            var bh = 18 + (downtownFactor * 32) + ((k * 7) % 10);
            buildingSpecs.push({
              x: blockCenterX + offsets[k].dx,
              z: blockCenterZ + offsets[k].dz,
              w: 23,
              h: bh,
              d: 23,
              color: PALETTE[(ix + iz + k) % PALETTE.length]
            });
          }
        }
      }
    }

    // Create InstancedMesh for all buildings
    var geom = new THREE.BoxGeometry(1, 1, 1);
    var downtownMat = mat.clone();
    downtownMat.map = downtownMat.emissiveMap = createWindowTexture(true);
    var districtSpecs = [[], []];
    buildingSpecs.forEach(function (b) {
      var downtown = Math.hypot(b.x - centerDowntownX, b.z - centerDowntownZ) < 180;
      districtSpecs[downtown ? 1 : 0].push(b);
    });
    districtSpecs.forEach(function (specs, district) {
    var instMesh = new THREE.InstancedMesh(geom, district ? downtownMat : mat, specs.length);
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;

    var dummy = new THREE.Object3D();
    var colorHelper = new THREE.Color();

    for (var i = 0; i < specs.length; i++) {
      var b = specs[i];

      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();

      instMesh.setMatrixAt(i, dummy.matrix);

      colorHelper.setHex(b.color);
      instMesh.setColorAt(i, colorHelper);

      // Register collision bounding volume
      colliders.push({
        x: b.x,
        z: b.z,
        r: Math.max(b.w, b.d) * 0.55,
        w: b.w,
        d: b.d,
        minX: b.x - (b.w / 2),
        maxX: b.x + (b.w / 2),
        minZ: b.z - (b.d / 2),
        maxZ: b.z + (b.d / 2)
      });
    }

    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    group.add(instMesh);
    });
  }

  // --- 2. Palm Trees along Coast Boulevard ---
  function buildCoastPalmTrees() {
    var zMin = -((BLOCKS_Z / 2) * STRIDE);
    var zMax = ((BLOCKS_Z / 2) * STRIDE);
    var spacing = 16;
    var count = Math.floor((zMax - zMin) / spacing);

    var trunkGeom = new THREE.CylinderGeometry(0.24, 0.38, 7.5, 6);
    trunkGeom.translate(0, 3.75, 0);
    var trunkMat = new THREE.MeshStandardMaterial({
      color: (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.PALM_TRUNK) || 0x544033,
      roughness: 0.9
    });
    var trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, count);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;

    var frondGeom = new THREE.ConeGeometry(3.6, 2.2, 7);
    frondGeom.translate(0, 7.8, 0);
    var frondMat = new THREE.MeshStandardMaterial({
      color: (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.PALM_LEAF) || 0x2f4c28,
      roughness: 0.7
    });
    var frondMesh = new THREE.InstancedMesh(frondGeom, frondMat, count);
    frondMesh.castShadow = true;

    var dummy = new THREE.Object3D();
    var palmX = -HALF_ROAD - 2.5; // Sidewalk edge bordering beach

    for (var i = 0; i < count; i++) {
      var pz = zMin + (i * spacing) + 8;
      var leanAngle = ((i % 5) - 2) * 0.05;

      dummy.position.set(palmX, 0, pz);
      dummy.rotation.set(0, (i * 1.3), leanAngle);
      dummy.updateMatrix();

      trunkMesh.setMatrixAt(i, dummy.matrix);
      frondMesh.setMatrixAt(i, dummy.matrix);
    }

    trunkMesh.instanceMatrix.needsUpdate = true;
    frondMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh);
    group.add(frondMesh);
  }

  // --- 3. Streetlights with Emissive Lanterns ---
  function buildStreetlights() {
    var lampPositions = [];
    var zHalf = BLOCKS_Z / 2;

    // Place streetlamps at block corners and intersection edges
    for (var ix = 0; ix <= BLOCKS_X; ix++) {
      var rx = ix * STRIDE;
      for (var iz = 0; iz <= BLOCKS_Z; iz++) {
        var rz = (iz - zHalf) * STRIDE;

        // 4 corners around each intersection
        lampPositions.push({ x: rx - HALF_ROAD - 1.2, z: rz - HALF_ROAD - 1.2 });
        lampPositions.push({ x: rx + HALF_ROAD + 1.2, z: rz + HALF_ROAD + 1.2 });
      }
    }

    var poleGeom = new THREE.CylinderGeometry(0.12, 0.16, 5.8, 5);
    poleGeom.translate(0, 2.9, 0);
    var poleMat = new THREE.MeshStandardMaterial({
      color: (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.LAMP_POST) || 0x2c2c34,
      metalness: 0.6,
      roughness: 0.4
    });
    var poleMesh = new THREE.InstancedMesh(poleGeom, poleMat, lampPositions.length);
    poleMesh.castShadow = true;

    var headGeom = new THREE.SphereGeometry(0.38, 6, 6);
    headGeom.translate(0, 5.8, 0);
    var headMat = new THREE.MeshBasicMaterial({
      color: (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.LAMP_GLOW) || 0xffe29a
    });
    var headMesh = new THREE.InstancedMesh(headGeom, headMat, lampPositions.length);

    var dummy = new THREE.Object3D();
    for (var i = 0; i < lampPositions.length; i++) {
      var lp = lampPositions[i];
      dummy.position.set(lp.x, 0, lp.z);
      dummy.updateMatrix();

      poleMesh.setMatrixAt(i, dummy.matrix);
      headMesh.setMatrixAt(i, dummy.matrix);
    }

    poleMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    group.add(poleMesh);
    group.add(headMesh);
  }

  // Construct city models
  buildCityBuildings();
  buildCoastPalmTrees();
  buildStreetlights();

  if (SF.render && SF.render.scene) {
    SF.render.scene.add(group);
  }

  SF.city = {
    group: group,
    colliders: colliders,
    update: function (dt) {}
  };
})();
