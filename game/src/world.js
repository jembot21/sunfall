/**
 * Sunfall — World & Ground Geometry Subsystem
 *
 * Constructs the city terrain:
 * - A single high-resolution canvas texture combining asphalt roads, sidewalks,
 *   zebra crosswalks, dashed lane markings, and golden beach sand.
 * - Flat 3D sidewalk curb blocks merged into a single BufferGeometry for crisp depth.
 * - An animated two-layer ocean plane along the western coast.
 * - Rapid mathematical spatial queries: isRoad(x, z), isWater(x, z), groundY(x, z).
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var group = new THREE.Group();
  group.name = 'world';

  var oceanGroup = new THREE.Group();
  oceanGroup.name = 'ocean';
  group.add(oceanGroup);

  var GRID = (SF.CONFIG && SF.CONFIG.GRID) || {
    BLOCK_SIZE: 72,
    ROAD_WIDTH: 18,
    SIDEWALK_WIDTH: 3.5,
    BLOCKS_X: 8,
    BLOCKS_Z: 8,
    BEACH_WIDTH: 45,
    OCEAN_WIDTH: 180
  };

  var BLOCK_SIZE = GRID.BLOCK_SIZE;
  var ROAD_WIDTH = GRID.ROAD_WIDTH;
  var HALF_ROAD = ROAD_WIDTH / 2;
  var STRIDE = BLOCK_SIZE + ROAD_WIDTH; // 90m per city block cycle
  var BLOCKS_X = GRID.BLOCKS_X;
  var BLOCKS_Z = GRID.BLOCKS_Z;
  var BEACH_WIDTH = GRID.BEACH_WIDTH;
  var OCEAN_WIDTH = GRID.OCEAN_WIDTH;

  var CITY_MIN_X = -HALF_ROAD;
  var CITY_MAX_X = (BLOCKS_X * STRIDE) + HALF_ROAD;
  var CITY_MIN_Z = -((BLOCKS_Z / 2) * STRIDE) - HALF_ROAD;
  var CITY_MAX_Z = ((BLOCKS_Z / 2) * STRIDE) + HALF_ROAD;

  var MAP_MIN_X = -BEACH_WIDTH - 15;
  var MAP_MAX_X = CITY_MAX_X + 20;
  var MAP_MIN_Z = CITY_MIN_Z - 20;
  var MAP_MAX_Z = CITY_MAX_Z + 20;

  var SPAN_X = MAP_MAX_X - MAP_MIN_X;
  var SPAN_Z = MAP_MAX_Z - MAP_MIN_Z;

  var oceanMaterialBase, oceanMaterialFoam;

  function worldToCanvas(wx, wz, size) {
    return {
      x: ((wx - MAP_MIN_X) / SPAN_X) * size,
      y: ((wz - MAP_MIN_Z) / SPAN_Z) * size
    };
  }

  function generateGroundTexture() {
    var size = 2048;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');

    // 1. Fill default base with asphalt
    ctx.fillStyle = '#222227';
    ctx.fillRect(0, 0, size, size);

    // 2. Beach strip on the west (left edge)
    var beachStart = worldToCanvas(MAP_MIN_X, 0, size).x;
    var beachCoast = worldToCanvas(0, 0, size).x;
    var beachGrad = ctx.createLinearGradient(beachStart, 0, beachCoast, 0);
    beachGrad.addColorStop(0.0, '#a87e49'); // wet shoreline
    beachGrad.addColorStop(0.2, '#cba05f');
    beachGrad.addColorStop(0.7, '#dfb46c'); // dry golden sand
    beachGrad.addColorStop(1.0, '#cf9e5a');

    ctx.fillStyle = beachGrad;
    ctx.fillRect(beachStart, 0, beachCoast - beachStart, size);

    // 3. Draw city blocks (sidewalk slab + lot background)
    var zHalf = BLOCKS_Z / 2;
    for (var ix = 0; ix < BLOCKS_X; ix++) {
      var bx0 = (ix * STRIDE) + HALF_ROAD;
      var bx1 = bx0 + BLOCK_SIZE;

      for (var iz = 0; iz < BLOCKS_Z; iz++) {
        var bz0 = ((iz - zHalf) * STRIDE) + HALF_ROAD;
        var bz1 = bz0 + BLOCK_SIZE;

        var p0 = worldToCanvas(bx0, bz0, size);
        var p1 = worldToCanvas(bx1, bz1, size);
        var bw = p1.x - p0.x;
        var bh = p1.y - p0.y;

        // Sidewalk border / outer curb
        ctx.fillStyle = '#655f5b';
        ctx.fillRect(p0.x, p0.y, bw, bh);

        // Inner building lot
        var inset = (GRID.SIDEWALK_WIDTH / SPAN_X) * size;
        ctx.fillStyle = '#2a2630';
        ctx.fillRect(p0.x + inset, p0.y + inset, bw - (inset * 2), bh - (inset * 2));
      }
    }

    // 4. Paint road markings (Yellow center double lines, white edge lane dashes)
    ctx.lineWidth = Math.max(2, (0.35 / SPAN_X) * size);

    // North-South Avenues (constant X)
    for (var rx = 0; rx <= BLOCKS_X; rx++) {
      var rwx = rx * STRIDE;
      var cp = worldToCanvas(rwx, CITY_MIN_Z, size);
      var ep = worldToCanvas(rwx, CITY_MAX_Z, size);

      // Yellow double center dashed line
      ctx.strokeStyle = '#f4a824';
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(cp.x - 2, cp.y);
      ctx.lineTo(ep.x - 2, ep.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cp.x + 2, cp.y);
      ctx.lineTo(ep.x + 2, ep.y);
      ctx.stroke();

      // White lane dividing dashes
      ctx.strokeStyle = '#dedede';
      ctx.setLineDash([8, 14]);
      var laneOffset = (ROAD_WIDTH * 0.25 / SPAN_X) * size;
      ctx.beginPath();
      ctx.moveTo(cp.x - laneOffset, cp.y);
      ctx.lineTo(ep.x - laneOffset, ep.y);
      ctx.moveTo(cp.x + laneOffset, cp.y);
      ctx.lineTo(ep.x + laneOffset, ep.y);
      ctx.stroke();
    }

    // East-West Streets (constant Z)
    for (var rz = 0; rz <= BLOCKS_Z; rz++) {
      var rwz = (rz - zHalf) * STRIDE;
      var cpx = worldToCanvas(CITY_MIN_X, rwz, size);
      var epx = worldToCanvas(CITY_MAX_X, rwz, size);

      // Yellow center line
      ctx.strokeStyle = '#f4a824';
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(cpx.x, cpx.y);
      ctx.lineTo(epx.x, epx.y);
      ctx.stroke();

      // White lane dashes
      ctx.strokeStyle = '#dedede';
      ctx.setLineDash([8, 14]);
      var laneOffsetZ = (ROAD_WIDTH * 0.25 / SPAN_Z) * size;
      ctx.beginPath();
      ctx.moveTo(cpx.x, cpx.y - laneOffsetZ);
      ctx.lineTo(epx.x, epx.y - laneOffsetZ);
      ctx.moveTo(cpx.x, cpx.y + laneOffsetZ);
      ctx.lineTo(epx.x, epx.y + laneOffsetZ);
      ctx.stroke();
    }

    // 5. White crosswalk zebra bars at intersections
    ctx.setLineDash([]);
    ctx.fillStyle = '#e8e8e8';
    for (var cx = 0; cx <= BLOCKS_X; cx++) {
      var ixw = cx * STRIDE;
      for (var cz = 0; cz <= BLOCKS_Z; cz++) {
        var izw = (cz - zHalf) * STRIDE;

        // 4 crosswalk branches around the intersection box
        var zebraLen = (HALF_ROAD / SPAN_X) * size;
        var barW = Math.max(2, (1.2 / SPAN_X) * size);
        var barGap = Math.max(3, (2.2 / SPAN_X) * size);

        // East & West crosswalks
        var pCenter = worldToCanvas(ixw, izw, size);
        var halfBox = (HALF_ROAD / SPAN_X) * size;

        for (var b = -halfBox + 4; b < halfBox - 4; b += barGap) {
          ctx.fillRect(pCenter.x - halfBox - zebraLen * 0.6, pCenter.y + b, zebraLen * 0.5, barW);
          ctx.fillRect(pCenter.x + halfBox + 2, pCenter.y + b, zebraLen * 0.5, barW);
        }

        // North & South crosswalks
        for (var bx = -halfBox + 4; bx < halfBox - 4; bx += barGap) {
          ctx.fillRect(pCenter.x + bx, pCenter.y - halfBox - zebraLen * 0.6, barW, zebraLen * 0.5);
          ctx.fillRect(pCenter.x + bx, pCenter.y + halfBox + 2, barW, zebraLen * 0.5);
        }
      }
    }

    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function buildGroundPlane() {
    var planeWidth = SPAN_X;
    var planeHeight = SPAN_Z;
    var geom = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
    geom.rotateX(-Math.PI / 2);

    var mat = new THREE.MeshStandardMaterial({
      map: generateGroundTexture(),
      roughness: 0.85,
      metalness: 0.1
    });

    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(
      MAP_MIN_X + (SPAN_X / 2),
      0,
      MAP_MIN_Z + (SPAN_Z / 2)
    );
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  function buildSidewalkCurbs() {
    // Generate merged 3D curbs for tactile depth at road edges
    var curbGeomList = [];
    var zHalf = BLOCKS_Z / 2;
    var curbH = 0.16;

    for (var ix = 0; ix < BLOCKS_X; ix++) {
      var bx = (ix * STRIDE) + HALF_ROAD + (BLOCK_SIZE / 2);

      for (var iz = 0; iz < BLOCKS_Z; iz++) {
        var bz = ((iz - zHalf) * STRIDE) + HALF_ROAD + (BLOCK_SIZE / 2);

        var boxGeom = new THREE.BoxGeometry(BLOCK_SIZE, curbH, BLOCK_SIZE);
        boxGeom.translate(bx, curbH / 2, bz);
        curbGeomList.push(boxGeom);
      }
    }

    if (curbGeomList.length > 0) {
      // In Three.js r147 BufferGeometryUtils is not in core, so we can group them
      // into an InstancedMesh or single mesh. Using an InstancedMesh is 1 draw call:
      var singleBox = new THREE.BoxGeometry(BLOCK_SIZE, curbH, BLOCK_SIZE);
      var curbMat = new THREE.MeshStandardMaterial({
        color: (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.SIDEWALK) || 0x6e6863,
        roughness: 0.9,
        metalness: 0.05
      });

      var instMesh = new THREE.InstancedMesh(singleBox, curbMat, curbGeomList.length);
      instMesh.receiveShadow = true;
      instMesh.castShadow = true;

      var dummy = new THREE.Object3D();
      var idx = 0;
      for (var i = 0; i < BLOCKS_X; i++) {
        var cx = (i * STRIDE) + HALF_ROAD + (BLOCK_SIZE / 2);
        for (var j = 0; j < BLOCKS_Z; j++) {
          var cz = ((j - zHalf) * STRIDE) + HALF_ROAD + (BLOCK_SIZE / 2);
          dummy.position.set(cx, curbH / 2, cz);
          dummy.updateMatrix();
          instMesh.setMatrixAt(idx++, dummy.matrix);
        }
      }
      instMesh.instanceMatrix.needsUpdate = true;
      group.add(instMesh);
    }
  }

  function buildOcean() {
    var oceanW = OCEAN_WIDTH + 80;
    var oceanL = SPAN_Z + 160;

    // Deep water bottom plane
    var deepGeom = new THREE.PlaneGeometry(oceanW, oceanL, 1, 1);
    deepGeom.rotateX(-Math.PI / 2);
    var colors = [];
    var positions = deepGeom.attributes.position;
    for (var v = 0; v < positions.count; v++) {
      var waterColor = new THREE.Color(0x183652).lerp(new THREE.Color(0x397a87), positions.getX(v) / oceanW + 0.5);
      colors.push(waterColor.r, waterColor.g, waterColor.b);
    }
    deepGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    oceanMaterialBase = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.92
    });

    var oceanBase = new THREE.Mesh(deepGeom, oceanMaterialBase);
    oceanBase.position.set(-BEACH_WIDTH - (oceanW / 2) + 6, -0.4, 0);
    oceanBase.receiveShadow = true;
    oceanGroup.add(oceanBase);

    // Surface wave/foam plane slightly above
    var foamGeom = new THREE.PlaneGeometry(oceanW, oceanL, 1, 1);
    foamGeom.rotateX(-Math.PI / 2);

    oceanMaterialFoam = new THREE.MeshBasicMaterial({
      color: (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.OCEAN_FOAM) || 0x6ebbdb,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    var oceanFoam = new THREE.Mesh(foamGeom, oceanMaterialFoam);
    oceanFoam.position.set(-BEACH_WIDTH - (oceanW / 2) + 6, -0.32, 0);
    oceanGroup.add(oceanFoam);
  }

  // --- Spatial Query Methods ---

  function isWater(x, z) {
    return x < -BEACH_WIDTH + 1.5;
  }

  function isRoad(x, z) {
    // Coast road or outside city check
    if (x < -HALF_ROAD || x > CITY_MAX_X || z < CITY_MIN_Z || z > CITY_MAX_Z) {
      return false;
    }

    // Distance to nearest North-South road centerline
    var nearestRoadX = Math.round(x / STRIDE) * STRIDE;
    if (nearestRoadX >= 0 && nearestRoadX <= BLOCKS_X * STRIDE) {
      if (Math.abs(x - nearestRoadX) <= HALF_ROAD) {
        return true;
      }
    }

    // Distance to nearest East-West street centerline
    var zHalf = BLOCKS_Z / 2;
    var relZ = z + (zHalf * STRIDE);
    var nearestRoadZ = Math.round(relZ / STRIDE) * STRIDE - (zHalf * STRIDE);
    if (nearestRoadZ >= CITY_MIN_Z && nearestRoadZ <= CITY_MAX_Z) {
      if (Math.abs(z - nearestRoadZ) <= HALF_ROAD) {
        return true;
      }
    }

    return false;
  }

  function groundY(x, z) {
    if (x < -BEACH_WIDTH) {
      // Water level
      return -0.45;
    }
    if (x < 0) {
      // Gentle slope along beach down to ocean
      var t = (x - (-BEACH_WIDTH)) / BEACH_WIDTH; // 0 at water, 1 at road
      return -0.45 * (1 - t);
    }
    // Flat city surface
    return 0.0;
  }

  var animTimer = 0;
  function update(dt) {
    animTimer += dt;
    // Subtle ocean swell breathing animation
    if (oceanGroup) {
      oceanGroup.position.y = Math.sin(animTimer * 1.4) * 0.08;
    }
  }

  // Build the world geometry on instantiation
  buildGroundPlane();
  buildSidewalkCurbs();
  buildOcean();

  // Add world group to render scene if already initialized
  if (SF.render && SF.render.scene) {
    SF.render.scene.add(group);
  }

  SF.world = {
    group: group,
    isRoad: isRoad,
    isWater: isWater,
    groundY: groundY,
    update: update,
    roadCenters: {
      x: Array.from({ length: BLOCKS_X + 1 }, function (_, i) { return i * STRIDE; }),
      z: Array.from({ length: BLOCKS_Z + 1 }, function (_, i) { return (i - BLOCKS_Z / 2) * STRIDE; })
    },
    coastX: 0,
    bounds: {
      minX: CITY_MIN_X,
      maxX: CITY_MAX_X,
      minZ: CITY_MIN_Z,
      maxZ: CITY_MAX_Z,
      beachWidth: BEACH_WIDTH,
      oceanWidth: OCEAN_WIDTH
    }
  };
})();
