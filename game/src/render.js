(function (S) {
  'use strict';
  S.createRender = function (container) {
    const T = THREE, C = S.Config, R = C.render, K = C.camera;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R.pixelRatio));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = R.exposure;
    // Support both generations of the vendored Three color-management API.
    if ('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    else if (T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Solano Bay city view');
    const scene = new T.Scene();
    scene.fog = new T.Fog(C.palette.fog, R.fogNear, R.fogFar);
    const camera = new T.PerspectiveCamera(R.fov, 1, R.near, R.far);
    const hemisphere = new T.HemisphereLight(0xffcf99, 0x63516b, R.hemisphereIntensity);
    scene.add(hemisphere);
    const sun = new T.DirectionalLight(0xffc18a, R.sunIntensity);
    sun.position.fromArray(R.sunPosition); sun.castShadow = true;
    sun.shadow.mapSize.set(R.shadowSize, R.shadowSize);
    Object.assign(sun.shadow.camera, { left: -R.shadowRange, right: R.shadowRange,
      top: R.shadowRange, bottom: -R.shadowRange, near: 1, far: 600 });
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035;
    scene.add(sun, sun.target);
    const desired = new T.Vector3(), look = new T.Vector3(), smoothedLook = new T.Vector3();
    let initialized = false;
    function resize() {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false); camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();
    function follow(position, heading, dt, snap) {
      desired.set(position.x + Math.sin(heading) * K.distance, position.y + K.height,
        position.z + Math.cos(heading) * K.distance);
      look.set(position.x, position.y + K.lookHeight, position.z);
      const blend = snap || !initialized ? 1 : 1 - Math.exp(-K.followRate * dt);
      camera.position.lerp(desired, blend); smoothedLook.lerp(look, blend);
      // Prevent the follow rig from crossing solid buildings or street furniture.
      const collisionList = api.collisions || [];
      let nearest = 1;
      collisionList.forEach(b => {
        if (b.walkable) return;
        let low = 0, high = 1;
        for (const axis of ['X', 'Y', 'Z']) {
          const key = axis.toLowerCase(), delta = camera.position[key] - look[key];
          const min = b['min' + axis] - 0.3, max = b['max' + axis] + 0.3;
          if (Math.abs(delta) < 0.00001) {
            if (look[key] < min || look[key] > max) { low = 2; break; }
          } else {
            const a = (min - look[key]) / delta, c = (max - look[key]) / delta;
            low = Math.max(low, Math.min(a, c)); high = Math.min(high, Math.max(a, c));
          }
        }
        if (low <= high && low > 0) nearest = Math.min(nearest, Math.max(0.05, low - 0.04));
      });
      if (nearest < 1) camera.position.lerpVectors(look, camera.position, nearest);
      camera.lookAt(smoothedLook); initialized = true;
      // Texel-snapped shadow focus avoids crawling as the target moves.
      const texel = R.shadowRange * 2 / R.shadowSize;
      const x = Math.round(position.x / texel) * texel, z = Math.round(position.z / texel) * texel;
      sun.target.position.set(x, 0, z);
      sun.position.set(x + R.sunPosition[0], R.sunPosition[1], z + R.sunPosition[2]);
    }
    function title(time, reducedMotion) {
      const angle = -1.1 + (reducedMotion ? 0 : Math.sin(time * K.titleSpeed) * 0.45);
      camera.position.set(-110 + Math.sin(angle) * K.titleRadius, K.titleHeight, Math.cos(angle) * K.titleRadius);
      camera.lookAt(-30, 8, 0); initialized = false;
    }
    const api = { renderer, scene, camera, sun, follow, title, collisions: null,
      draw: function () { renderer.render(scene, camera); },
      dispose: function () {
        window.removeEventListener('resize', resize);
        scene.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(m => m.dispose());
          }
        });
        renderer.dispose(); renderer.domElement.remove();
      }
    };
    return api;
  };

  // Foundation preview boot. Later systems can subscribe to the semantic events
  // and take ownership of the target, HUD and simulation without rebuilding the city.
  function boot() {
    const byId = id => document.getElementById(id);
    const container = byId('viewport'), start = byId('start-screen'), hud = byId('hud');
    let rig;
    try {
      rig = S.createRender(container);
      const world = S.createWorld(rig.scene);
      rig.collisions = world.collisions;
      const target = Object.assign({}, world.spawn);
      const app = S.app = { rig, world, target, mode: 'title', paused: false, time: 0 };
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const map = byId('minimap'), context = map.getContext('2d');
      function drawMap() {
        if (!context) return;
        const size = map.width, scale = size / 190;
        context.clearRect(0, 0, size, size); context.save();
        context.beginPath(); context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); context.clip();
        context.fillStyle = '#263537'; context.fillRect(0, 0, size, size);
        const px = x => size / 2 + (x - target.x) * scale;
        const pz = z => size / 2 + (z - target.z) * scale;
        context.fillStyle = '#167f83'; context.fillRect(-1000, -1000, px(S.Config.city.seaX) + 1000, 2000);
        context.fillStyle = '#b88b74';
        world.city.blocks.forEach(b => context.fillRect(px(b.x - 25), pz(b.z - 25), 50 * scale, 50 * scale));
        context.fillStyle = S.Config.palette.objective;
        world.missionMarkers.forEach(m => {
          context.beginPath(); context.arc(px(m.x), pz(m.z), 4, 0, Math.PI * 2); context.fill();
        });
        context.translate(size / 2, size / 2); context.rotate(-target.heading);
        context.fillStyle = '#ffffff'; context.beginPath(); context.moveTo(0, -8);
        context.lineTo(6, 7); context.lineTo(0, 4); context.lineTo(-6, 7); context.closePath(); context.fill();
        context.restore();
      }
      function pause(value) {
        if (app.mode !== 'world') return;
        app.paused = value; byId('pause-overlay').hidden = !value;
        hud.hidden = value;
        if (value) byId('resume-button').focus();
        window.dispatchEvent(new CustomEvent('sunfall:pause', { detail: value }));
      }
      byId('new-game').addEventListener('click', () => {
        app.mode = 'world'; app.paused = false; start.hidden = true; hud.hidden = false;
        rig.follow(target, target.heading, 0, true); drawMap();
        byId('objective-text').textContent = 'Solano Bay · World foundation';
        byId('action-text').textContent = 'City preview · Gameplay arrives in the next build';
        window.dispatchEvent(new CustomEvent('sunfall:new-game', { detail: app }));
      });
      byId('how-button').addEventListener('click', () => { byId('how-overlay').hidden = false; byId('close-how').focus(); });
      byId('close-how').addEventListener('click', () => { byId('how-overlay').hidden = true; byId('how-button').focus(); });
      byId('resume-button').addEventListener('click', () => pause(false));
      byId('title-button').addEventListener('click', () => {
        app.mode = 'title'; app.paused = false; byId('pause-overlay').hidden = true;
        hud.hidden = true; start.hidden = false; byId('new-game').focus();
      });
      window.addEventListener('keydown', event => {
        if (event.repeat) return;
        if (event.code === 'Escape' && !byId('how-overlay').hidden) {
          byId('close-how').click(); return;
        }
        if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); pause(!app.paused); }
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
      window.addEventListener('sunfall:district', event => { byId('district-name').textContent = event.detail.name; });
      let previous = performance.now();
      function frame(now) {
        const dt = Math.min(S.Config.tuning.maxDelta, Math.max(0, (now - previous) / 1000)); previous = now;
        if (!app.paused) {
          app.time += dt; world.update(app.time, app.mode === 'world' ? target : null);
          if (app.mode === 'title') rig.title(app.time, reduceMotion.matches);
          else { rig.follow(target, target.heading, dt); drawMap(); }
        }
        rig.draw(); app.frame = requestAnimationFrame(frame);
      }
      byId('loading-note').textContent = 'A city at the edge of night';
      byId('new-game').disabled = false;
      app.frame = requestAnimationFrame(frame);
    } catch (error) {
      if (rig) rig.dispose();
      byId('loading-note').textContent = 'The city could not start. Enable WebGL and reload to try again.';
      byId('loading-note').setAttribute('role', 'alert');
      console.error('Sunfall foundation could not start:', error);
    }
  }
  // The gameplay runtime owns boot and the single animation loop.
})(window.Sunfall = window.Sunfall || {});
