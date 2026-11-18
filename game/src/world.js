// Builds immediately after render.js. Coordinates: Y up, west = -X, ground = 0.
// SF.world: group, isRoad(x,z), isWater(x,z), groundY(x,z), update(dt),
// bounds {min,max}, roadCenters[], coastX, mapCanvas (north is negative Z).
// Roads are centered at multiples of CONFIG.city.block, including boundary roads.
(function (SF) {
  'use strict';
  const T = THREE, C = SF.CONFIG, grid = C.city;
  const half = grid.blocks * grid.block / 2;
  const coastX = grid.west;
  const group = new T.Group();
  group.name = 'Solano Bay terrain';
  SF.render.scene.add(group);
  const roadCenters = Array.from({length: grid.blocks + 1}, (_, i) => -half + i * grid.block);
  function plane(width, depth, x, y, z, material) {
    const mesh = new T.Mesh(new T.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  const land = new T.MeshStandardMaterial({color: C.colors.sand, roughness: 1});
  plane(half * 2 + 110, half * 2 + 180, -35, -.04, 0, land);
  // A single local canvas carries the asphalt, curbs, block yards and lane dashes.
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = mapCanvas.height = 2048;
  const ctx = mapCanvas.getContext('2d');
  const extent = half + grid.road / 2;
  const scale = 2048 / (extent * 2);
  const px = v => (v + extent) * scale;
  const rect = (x, z, w, d, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px(x), px(z), w * scale, d * scale);
  };
  ctx.fillStyle = '#68655b'; ctx.fillRect(0, 0, 2048, 2048);
  for (const c of roadCenters) {
    rect(c - grid.road / 2 - 4, -extent, grid.road + 8, extent * 2, '#b4a38c');
    rect(-extent, c - grid.road / 2 - 4, extent * 2, grid.road + 8, '#b4a38c');
  }
  for (const c of roadCenters) {
    rect(c - grid.road / 2, -extent, grid.road, extent * 2, '#30353c');
    rect(-extent, c - grid.road / 2, extent * 2, grid.road, '#30353c');
  }
  for (const c of roadCenters) {
    for (let k = -half; k < half; k += 9) {
      const nearest = Math.abs(k - Math.round(k / grid.block) * grid.block);
      if (nearest < grid.road / 2 + 5) continue;
      rect(c - .16, k, .32, 4.5, '#e7bb68');
      rect(k, c - .16, 4.5, .32, '#e7bb68');
    }
  }
  const texture = new T.CanvasTexture(mapCanvas);
  texture.encoding = T.sRGBEncoding;
  texture.anisotropy = Math.min(4, SF.render.renderer.capabilities.getMaxAnisotropy());
  plane(extent * 2, extent * 2, 0, 0, 0,
    new T.MeshStandardMaterial({map: texture, roughness: .95}));
  // Raised sidewalk ribbons, instanced as one draw call; no geometry at intersections.
  const sidewalk = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1),
    new T.MeshStandardMaterial({color: C.colors.sidewalk, roughness: 1}), grid.blocks * grid.blocks * 4);
  const dummy = new T.Object3D();
  let index = 0;
  function curb(x, z, w, d) {
    dummy.position.set(x, .08, z); dummy.scale.set(w, .16, d);
    dummy.updateMatrix(); sidewalk.setMatrixAt(index++, dummy.matrix);
  }
  const inner = grid.block - grid.road;
  for (let ix = 0; ix < grid.blocks; ix++) for (let iz = 0; iz < grid.blocks; iz++) {
    const x = -half + (ix + .5) * grid.block, z = -half + (iz + .5) * grid.block;
    curb(x - inner / 2 + 2, z, 4, inner);
    curb(x + inner / 2 - 2, z, 4, inner);
    curb(x, z - inner / 2 + 2, inner - 8, 4);
    curb(x, z + inner / 2 - 2, inner - 8, 4);
  }
  sidewalk.receiveShadow = true; group.add(sidewalk);
  plane(-half - grid.road / 2 - coastX, half * 2 + 180,
    (coastX - half - grid.road / 2) / 2, -.02, 0, land);
  const oceanCanvas = document.createElement('canvas');
  oceanCanvas.width = 256; oceanCanvas.height = 1;
  const oceanCtx = oceanCanvas.getContext('2d');
  const gradient = oceanCtx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#205260'); gradient.addColorStop(1, '#398b8d');
  oceanCtx.fillStyle = gradient; oceanCtx.fillRect(0, 0, 256, 1);
  const oceanTexture = new T.CanvasTexture(oceanCanvas);
  oceanTexture.encoding = T.sRGBEncoding;
  const ocean = plane(2000, 3000, coastX - 1000, -.22, 0,
    new T.MeshStandardMaterial({map: oceanTexture, transparent: true, opacity: .94, roughness: .32, metalness: .25}));
  plane(5, half * 2 + 180, coastX + 2.5, -.005, 0,
    new T.MeshStandardMaterial({color: 0x9a704d, roughness: .95}));
  const waveCanvas = document.createElement('canvas'); waveCanvas.width = waveCanvas.height = 128;
  const wctx = waveCanvas.getContext('2d');
  wctx.strokeStyle = '#bfe4d5'; wctx.lineWidth = 1;
  for (let j = 0; j < 128; j += 16) {
    wctx.beginPath();
    for (let i = 0; i <= 128; i++) {
      const y = j + Math.sin(i * Math.PI / 32) * 2;
      if (!i) wctx.moveTo(i, y); else wctx.lineTo(i, y);
    }
    wctx.stroke();
  }
  const waves = new T.CanvasTexture(waveCanvas);
  waves.wrapS = waves.wrapT = T.RepeatWrapping; waves.repeat.set(30, 45);
  plane(2000, 3000, coastX - 1000, -.20, 0,
    new T.MeshBasicMaterial({map: waves, transparent: true, opacity: .14, depthWrite: false}));
  SF.world = {
    group, bounds: {min: -half, max: half}, roadCenters, coastX, mapCanvas,
    isRoad(x, z) {
      if (Math.abs(x) > extent || Math.abs(z) > extent) return false;
      const near = v => Math.abs(v - Math.round(v / grid.block) * grid.block) <= grid.road / 2;
      return near(x) || near(z);
    },
    isWater(x, z) { return x < coastX; },
    groundY(x, z) { return x < coastX ? -.22 : 0; },
    update(dt) {
      waves.offset.y = (waves.offset.y + dt * .018) % 1;
      waves.offset.x = (waves.offset.x + dt * .006) % 1;
      ocean.material.opacity = .94;
    }
  };
})(window.SF);
