// Rendering contract: instantiate renderer/scene/camera now so later classic scripts can attach immediately.
(function (SF) {
  const host = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SF.CONFIG.perf.pixelRatioMax));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe49775);
  scene.fog = new THREE.FogExp2(0xe49775, 0.00155);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1800);
  camera.position.set(0, 9, 16);
  const ambient = new THREE.HemisphereLight(0xffd8b0, 0x343949, 1.35);
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(0xffbd83, 2.2);
  sunLight.position.set(-160, 110, -190);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 360 });
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(19, 32), new THREE.MeshBasicMaterial({ color: SF.CONFIG.colors.sun, fog: false, toneMapped: false }));
  sun.lookAt(camera.position);
  sun.position.set(-430, 135, -620);
  scene.add(sun);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(SF.CONFIG.colors.skyTop) }, horizon: { value: new THREE.Color(SF.CONFIG.colors.skyHorizon) } }, vertexShader: 'varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}', fragmentShader: 'varying vec3 vWorld; uniform vec3 top; uniform vec3 horizon; void main(){float h=normalize(vWorld).y;gl_FragColor=vec4(mix(horizon,top,smoothstep(-0.12,0.5,h)),1.0);}' }));
  scene.add(sky);
  function resize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
  window.addEventListener('resize', resize);
  SF.render = { renderer, scene, camera, sunLight, update(dt, target) { if (target) { sunLight.position.set(target.x - 160, target.y + 110, target.z - 190); sunLight.target.position.set(target.x, target.y, target.z); sunLight.target.updateMatrixWorld(); } renderer.render(scene, camera); } };
})(window.SF);
