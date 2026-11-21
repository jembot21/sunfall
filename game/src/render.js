(function () {
  'use strict';
  const SF = window.SF, T = THREE, C = SF.CONFIG;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.15, C.tuning.farDistance);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = C.tuning.exposure;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace; else renderer.outputEncoding = T.sRGBEncoding;
  // Keep the scene on the default framebuffer; there is no offscreen shadow or post pass.
  renderer.shadowMap.enabled = false;
  scene.fog = new T.Fog(C.palette.horizon, 280, 1050); scene.background = new T.Color(C.palette.horizon);
  const sun = new T.DirectionalLight(0xffd4a0, 3.15); sun.position.set(-160, 145, -220);
  sun.castShadow = false;
  scene.add(sun); scene.add(sun.target); scene.add(new T.HemisphereLight(0xb6bacb, 0x44332b, 0.24));
  const flareCanvas = document.createElement('canvas'); flareCanvas.width = flareCanvas.height = 128;
  const ctx = flareCanvas.getContext('2d'), gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.12, 'rgba(255,255,255,.8)'); gradient.addColorStop(0.4, 'rgba(255,255,255,.17)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const flareTexture = new T.CanvasTexture(flareCanvas);
  const standardMaterials = new Map(), basicMaterials = new Map(), spriteMaterials = new Map();
  // Fixed shared primitives. Dimensions belong to transforms, never GPU buffers.
  const assets = SF.assets = {
    box: new T.BoxGeometry(1, 1, 1), plane: new T.PlaneGeometry(1, 1),
    tire: new T.CylinderGeometry(0.37, 0.37, 0.22, 14),
    hub: new T.CylinderGeometry(0.18, 0.18, 0.232, 12),
    helicopter: new T.CapsuleGeometry(0.7, 2.6, 4, 8),
    spotlight: new T.ConeGeometry(3.1, 20, 20, 1, true),
    standard(options) {
      const key = JSON.stringify(options);
      if (!standardMaterials.has(key)) standardMaterials.set(key, new T.MeshStandardMaterial(options));
      return standardMaterials.get(key);
    },
    basic(options) {
      const key = JSON.stringify({ ...options, map: options.map?.uuid });
      if (!basicMaterials.has(key)) basicMaterials.set(key, new T.MeshBasicMaterial(options));
      return basicMaterials.get(key);
    }
  };
  [0xffcf86, 0xff0011, 0x064fff, 0xffe9a0, 0xffbf59].forEach(colorHex => {
    spriteMaterials.set(colorHex, new T.SpriteMaterial({ map: flareTexture, color: colorHex, opacity: colorHex === 0xff0011 || colorHex === 0x064fff ? 0.8 : 1, blending: T.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  });
  function makeFlare(colorHex, size) {
    const sprite = new T.Sprite(spriteMaterials.get(colorHex));
    sprite.scale.set(size, size, 1); return sprite;
  }
  // These hierarchies remain the authoritative animation and raycast targets.
  // Only their shared instance batches enter the render scene.
  const actors = new Map(), batches = new Map(), lightSources = new Map();
  const lightPool = Array.from({ length: 8 }, () => {
    const light = new T.PointLight(0xffffff, 0, 18); scene.add(light); return light;
  });
  function batchActor(root) {
    const parts = [];
    root.traverse(part => { if (part.isMesh) parts.push(part); });
    root.removeFromParent(); actors.set(root, parts);
    root.userData.batchedActor = true;
  }
  function unbatchActor(root) {
    actors.delete(root); lightSources.delete(root); root.userData.batchedActor = false;
  }
  function addVehicleLight(root, color, intensity, range, x, y, z) {
    if (!lightSources.has(root)) lightSources.set(root, []);
    lightSources.get(root).push({ color, intensity, range, local: new T.Vector3(x, y, z), world: new T.Vector3(), distance: 0 });
  }
  function prepare() {
    for (const batch of batches.values()) batch.parts.length = 0;
    for (const [root, parts] of actors) {
      root.updateMatrixWorld(true);
      if (!root.visible) continue;
      for (const part of parts) {
        let visible = true;
        for (let p = part; p; p = p.parent) if (!p.visible) { visible = false; break; }
        if (!visible) continue;
        const key = part.geometry.uuid + ':' + part.material.uuid;
        if (!batches.has(key)) batches.set(key, { parts: [], mesh: null });
        batches.get(key).parts.push(part);
      }
    }
    for (const batch of batches.values()) {
      const count = batch.parts.length;
      if (count && (!batch.mesh || batch.mesh.instanceMatrix.count < count)) {
        if (batch.mesh) { scene.remove(batch.mesh); batch.mesh.dispose(); }
        const capacity = Math.max(16, 2 ** Math.ceil(Math.log2(count)));
        const first = batch.parts[0];
        batch.mesh = new T.InstancedMesh(first.geometry, first.material, capacity);
        batch.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        batch.mesh.userData.dynamicActors = true;
        // Actors can move anywhere; a stale static bounding sphere must never hide them.
        batch.mesh.frustumCulled = false; scene.add(batch.mesh);
      }
      if (!batch.mesh) continue;
      const mesh = batch.mesh, data = mesh.instanceMatrix.array;
      let changed = mesh.count !== count;
      mesh.count = count;
      for (let i = 0; i < count; i++) {
        const elements = batch.parts[i].matrixWorld.elements;
        for (let j = 0; j < 16; j++) {
          const value = Math.fround(elements[j]);
          if (data[i * 16 + j] !== value) { data[i * 16 + j] = value; changed = true; }
        }
      }
      if (changed) mesh.instanceMatrix.needsUpdate = true;
    }
    const nearby = [];
    for (const [root, sources] of lightSources) {
      if (!root.visible) continue;
      // Patrols still use native scene hierarchies; batched actors were updated above.
      if (!actors.has(root)) root.updateMatrixWorld(true);
      for (const source of sources) {
        source.world.copy(source.local).applyMatrix4(root.matrixWorld);
        source.distance = source.world.distanceToSquared(camera.position);
        if (source.distance < (source.range + 25) ** 2) nearby.push(source);
      }
    }
    nearby.sort((a, b) => a.distance - b.distance);
    lightPool.forEach((light, i) => {
      const source = nearby[i];
      light.intensity = source ? source.intensity : 0;
      if (source) { light.position.copy(source.world); light.color.set(source.color); light.distance = source.range; }
    });
  }
  const rig = { mode: 'title', target: new T.Vector3(), heading: 0, distance: 9, height: 4.5, initialized: false };
  const look = new T.Vector3(), desired = new T.Vector3(), focus = new T.Vector3();
  const render = SF.render = { renderer, scene, camera, rig, sun, makeFlare, prepare,
    batchActor, unbatchActor, addVehicleLight,
    follow(position, heading, dt) {
      rig.mode = 'follow'; rig.target.copy(position); rig.heading = heading;
      desired.set(position.x - Math.sin(heading) * rig.distance, position.y + rig.height, position.z - Math.cos(heading) * rig.distance);
      focus.set(position.x, position.y + 1.5, position.z);
      const alpha = 1 - Math.exp(-6 * Math.min(dt, 0.1));
      if (!rig.initialized) { camera.position.copy(desired); look.copy(focus); rig.initialized = true; }
      camera.position.lerp(desired, alpha); look.lerp(focus, alpha); camera.lookAt(look);
      sun.target.position.copy(position); sun.position.set(position.x - 160, position.y + 145, position.z - 220);
    },
    titleSweep(seconds) {
      camera.position.set(-315 + Math.sin(seconds * 0.045) * 85, 83 + Math.sin(seconds * 0.06) * 8, -345 + Math.cos(seconds * 0.045) * 30);
      camera.lookAt(-190, 8, -125); sun.target.position.set(-220, 0, -125); sun.position.set(-380, 145, -345);
    }
  };
  const sunDisc = makeFlare(0xffcf86, 115); sunDisc.position.set(-650, 260, -1100); scene.add(sunDisc);
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
  addEventListener('resize', resize);
}());
