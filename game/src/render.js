(function () {
  'use strict';
  var canvas = document.getElementById('game');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.outputEncoding = THREE.sRGBEncoding;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(SF.CONFIG.palette.sky.fog);
  scene.fog = new THREE.Fog(new THREE.Color(SF.CONFIG.palette.sky.fog), 310, 1050);
  var camera = new THREE.PerspectiveCamera(66, 1, 0.1, 1450);
  camera.position.set(-18, 8, 0);
  var sunLight = new THREE.DirectionalLight('#ffd09a', 2.25);
  sunLight.position.set(22, 82, -30); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -140; sunLight.shadow.camera.right = 140;
  sunLight.shadow.camera.top = 140; sunLight.shadow.camera.bottom = -140;
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 300;
  sunLight.shadow.bias = -0.0002;
  sunLight.target.position.set(0, 0, 0); scene.add(sunLight, sunLight.target);
  scene.add(new THREE.HemisphereLight('#ffd2ae', '#765d50', 0.95));

  var skyGeo = new THREE.SphereGeometry(1150, 40, 24);
  var skyPos = skyGeo.attributes.position, skyColor = [];
  var zenith = new THREE.Color(SF.CONFIG.palette.sky.top);
  var middle = new THREE.Color(SF.CONFIG.palette.sky.mid);
  var horizon = new THREE.Color(SF.CONFIG.palette.sky.horizon);
  var scratch = new THREE.Color();
  for (var i = 0; i < skyPos.count; i++) {
    var t = THREE.MathUtils.clamp((skyPos.getY(i) / 1150 + 0.08) / 0.77, 0, 1);
    if (t < 0.52) scratch.copy(horizon).lerp(middle, t / 0.52);
    else scratch.copy(middle).lerp(zenith, (t - 0.52) / 0.48);
    skyColor.push(scratch.r, scratch.g, scratch.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColor, 3));
  scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  var sunCanvas = document.createElement('canvas'); sunCanvas.width = sunCanvas.height = 128;
  var ctx = sunCanvas.getContext('2d'), glow = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  glow.addColorStop(0, 'rgba(255,244,198,1)'); glow.addColorStop(0.5, 'rgba(255,197,123,.96)');
  glow.addColorStop(0.82, 'rgba(255,137,101,.62)'); glow.addColorStop(1, 'rgba(255,137,101,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
  var sunTexture = new THREE.CanvasTexture(sunCanvas); sunTexture.encoding = THREE.sRGBEncoding;
  var sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture, transparent: true, opacity: 0.96, fog: false, depthWrite: false }));
  sun.position.set(-520, 110, -200); sun.scale.set(100, 100, 1); scene.add(sun);

  function resize() {
    var width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  SF.render = {
    renderer: renderer, scene: scene, camera: camera, sunLight: sunLight, sun: sun,
    update: function (dt, targetPos) {
      if (targetPos) {
        sunLight.position.set(targetPos.x + 80, targetPos.y + 110, targetPos.z - 65);
        sunLight.target.position.set(targetPos.x, targetPos.y, targetPos.z);
        sunLight.shadow.camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    }
  };
}());
