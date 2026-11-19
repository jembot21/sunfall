(function () {
  var canvas = document.getElementById('game');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputEncoding = THREE.sRGBEncoding;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color('#7a4a8c');
  scene.fog = new THREE.Fog(0x7a4a8c, 260, 950);
  var camera = new THREE.PerspectiveCamera(68, 1, 0.1, 1300);
  camera.position.set(-18, 7, 0);
  var sunLight = new THREE.DirectionalLight(0xffd2a0, 3.2);
  sunLight.position.set(20, 80, -25);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -130; sunLight.shadow.camera.right = 130;
  sunLight.shadow.camera.top = 130; sunLight.shadow.camera.bottom = -130;
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 280;
  sunLight.shadow.bias = -0.00018;
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight, sunLight.target);
  var hemi = new THREE.HemisphereLight(0xd69bd8, 0xe9aa73, 1.45);
  scene.add(hemi);

  var skyGeo = new THREE.SphereGeometry(1100, 32, 20);
  var skyPos = skyGeo.attributes.position;
  var skyColor = [];
  var zenith = new THREE.Color('#2a1a5e');
  var middle = new THREE.Color('#b23a8c');
  var horizon = new THREE.Color('#ff8c42');
  var scratch = new THREE.Color();
  for (var i = 0; i < skyPos.count; i++) {
    var t = THREE.MathUtils.clamp((skyPos.getY(i) / 1100 + 0.08) / 0.78, 0, 1);
    if (t < 0.48) scratch.copy(horizon).lerp(middle, t / 0.48);
    else scratch.copy(middle).lerp(zenith, (t - 0.48) / 0.52);
    skyColor.push(scratch.r, scratch.g, scratch.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColor, 3));
  var sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(sky);
  var sunCanvas = document.createElement('canvas'); sunCanvas.width = sunCanvas.height = 128;
  var sunContext = sunCanvas.getContext('2d');
  var sunGradient = sunContext.createRadialGradient(64, 64, 4, 64, 64, 62);
  sunGradient.addColorStop(0, 'rgba(255,235,181,1)');
  sunGradient.addColorStop(0.62, 'rgba(255,164,99,0.96)');
  sunGradient.addColorStop(0.88, 'rgba(255,116,89,0.74)');
  sunGradient.addColorStop(1, 'rgba(255,116,89,0)');
  sunContext.fillStyle = sunGradient; sunContext.fillRect(0, 0, 128, 128);
  var sunTexture = new THREE.CanvasTexture(sunCanvas); sunTexture.encoding = THREE.sRGBEncoding;
  var sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture, transparent: true, opacity: 0.95, fog: false, depthWrite: false }));
  sun.position.set(-520, 95, -155);
  sun.scale.set(78, 78, 1);
  scene.add(sun);

  function resize() {
    var width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  SF.render = {
    renderer: renderer, scene: scene, camera: camera, sunLight: sunLight,
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
