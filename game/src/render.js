/* No postprocessing. One shadowed sun, one restrained sky fill, one shared flare. */
(function () {
  'use strict';
  var SF = window.SF, T = window.THREE, C = SF.CONFIG, tuning = C.tuning;
  var render = SF.render = { renderer: null, scene: null, camera: null, cameraRig: null,
    mode: 'title', ready: false, running: false, elapsed: 0, frame: 0, flareTexture: null };
  var lastTime = 0, resumeAfterHidden = false;
  var target = new T.Vector3(), desired = new T.Vector3(), sunOffset = new T.Vector3(-180, 80, -120);
  function error(message) {
    document.getElementById('render-error-text').textContent = message;
    document.getElementById('render-error').hidden = false;
  }
  function flareTexture() {
    if (render.flareTexture) return render.flareTexture;
    var canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    var g = canvas.getContext('2d'), gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.12, 'rgba(255,246,218,.85)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,.22)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
    render.flareTexture = new T.CanvasTexture(canvas); return render.flareTexture;
  }
  var flareMaterials = {};
  render.makeFlare = function (colorHex, size) {
    var key = String(colorHex);
    if (!flareMaterials[key]) flareMaterials[key] = new T.SpriteMaterial({ map: flareTexture(), color: colorHex,
      blending: T.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, toneMapped: false });
    var sprite = new T.Sprite(flareMaterials[key]); sprite.scale.set(size, size, 1); return sprite;
  };
  function sky(scene) {
    var material = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { topColor: { value: new T.Color(C.palette.skyTop) }, midColor: { value: new T.Color(C.palette.skyMiddle) }, horizon: { value: new T.Color(C.palette.horizon) } },
      vertexShader: 'varying vec3 vDirection; void main(){vDirection=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww;}',
      fragmentShader: 'uniform vec3 topColor;uniform vec3 midColor;uniform vec3 horizon;varying vec3 vDirection;void main(){float h=normalize(vDirection).y;vec3 c=mix(horizon,midColor,smoothstep(0.0,0.32,h));c=mix(c,topColor,smoothstep(0.24,0.9,h));gl_FragColor=vec4(c,1.0);}'
    });
    var dome = new T.Mesh(new T.SphereGeometry(1100, 24, 16), material); dome.name = 'Amber coral violet sky'; dome.renderOrder = -10; dome.frustumCulled = false;
    scene.add(dome); render.sky = dome;
    var sun = render.makeFlare(C.palette.sun, 125); sun.material.fog = false;
    sun.position.set(-780, 345, -520); scene.add(sun); render.sunSprite = sun;
  }
  render.init = function () {
    if (render.ready) return render;
    var renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch (e) { error('This browser could not start WebGL. Enable hardware acceleration or try a WebGL-capable browser.'); return null; }
    render.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tuning.pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = tuning.exposure;
    if ('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    else renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(C.palette.horizon);
    renderer.domElement.setAttribute('aria-label', 'Golden hour over Solano Bay');
    document.getElementById('game-container').appendChild(renderer.domElement);
    var scene = render.scene = new T.Scene();
    scene.fog = new T.Fog(C.palette.horizon, tuning.fogNear, tuning.fogFar);
    var camera = render.camera = new T.PerspectiveCamera(57, window.innerWidth / window.innerHeight, 0.2, tuning.farClip);
    render.cameraRig = new T.Group(); render.cameraRig.name = 'Third person camera rig'; render.cameraRig.add(camera); scene.add(render.cameraRig);
    camera.position.set(-650, 90, 340);
    var fill = new T.HemisphereLight('#e8b4a0', '#4a3038', 0.52); scene.add(fill); render.hemisphere = fill;
    var sun = render.sun = new T.DirectionalLight(C.palette.sun, 2.6); sun.castShadow = true;
    sun.shadow.mapSize.set(tuning.shadowMapSize, tuning.shadowMapSize);
    sun.shadow.camera.left = -145; sun.shadow.camera.right = 145; sun.shadow.camera.top = 145; sun.shadow.camera.bottom = -145;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 430; sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.045; sun.shadow.radius = 2;
    scene.add(sun); scene.add(sun.target);
    sky(scene); SF.world.build(scene);
    render.ready = true;
    renderer.domElement.addEventListener('webglcontextlost', function (event) {
      event.preventDefault(); render.stop(); error('The graphics context was interrupted. Reload the city to restore the view.');
    });
    renderer.domElement.addEventListener('webglcontextrestored', function () { error('Graphics are available again. Reload to rebuild the city safely.'); });
    window.addEventListener('resize', render.resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { resumeAfterHidden = render.running; render.stop(); }
      else if (resumeAfterHidden) { resumeAfterHidden = false; render.start(); }
    });
    render.titleSweep(0); return render;
  };
  render.resize = function () {
    if (!render.ready) return;
    render.camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1); render.camera.updateProjectionMatrix();
    render.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tuning.pixelRatioCap));
    render.renderer.setSize(window.innerWidth, window.innerHeight);
  };
  render.titleSweep = function (time) {
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var a = calm ? 0 : time * 0.025;
    render.camera.position.set(-635 + Math.sin(a) * 75, 66 + Math.sin(a * 0.6) * 12, 285 + Math.cos(a) * 95);
    target.set(-440, 10, 195 + Math.sin(a * 0.4) * 40); render.camera.lookAt(target);
  };
  // heading=0 looks along +Z; pass a THREE.Vector3 or plain {x,y,z}.
  render.follow = function (position, heading, dt, speed) {
    render.mode = 'follow';
    var distance = tuning.cameraDistance + Math.min(Math.abs(speed || 0) * 0.07, 4);
    desired.set(position.x - Math.sin(heading) * distance, position.y + tuning.cameraHeight, position.z - Math.cos(heading) * distance);
    var alpha = 1 - Math.exp(-tuning.cameraSmoothing * Math.min(Math.max(dt, 0), 0.1));
    render.camera.position.lerp(desired, alpha);
    target.set(position.x + Math.sin(heading) * 3, position.y + 1.3, position.z + Math.cos(heading) * 3);
    render.camera.lookAt(target);
  };
  render.update = function (dt, elapsed) {
    if (!render.ready) return;
    if (render.mode === 'title') render.titleSweep(elapsed);
    SF.world.update(elapsed, dt);
    // Snap the shadow footprint to texels to reduce crawling during camera motion.
    var unit = 290 / tuning.shadowMapSize;
    var x = Math.round(target.x / unit) * unit, z = Math.round(target.z / unit) * unit;
    render.sun.target.position.set(x, 0, z); render.sun.position.copy(render.sun.target.position).add(sunOffset);
    render.sky.position.copy(render.camera.position);
    render.renderer.render(render.scene, render.camera);
  };
  function tick(time) {
    if (!render.running) return;
    var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0; lastTime = time; render.elapsed += dt;
    render.update(dt, render.elapsed); render.frame = requestAnimationFrame(tick);
  }
  render.start = function () { if (render.ready && !render.running) { render.running = true; lastTime = 0; render.frame = requestAnimationFrame(tick); } };
  render.stop = function () { render.running = false; cancelAnimationFrame(render.frame); lastTime = 0; };
  // Only supply the title-view loop while the later runtime/main modules are absent.
  window.addEventListener('DOMContentLoaded', function () {
    if (!SF.runtime && !render.ready && render.init()) render.start();
  });
}());
