// Renderer contract: SF.render = {renderer, scene, camera, sunLight, update(dt), resize()}.
// The world follows the player by retargeting the single low-sun shadow camera.
(function (SF) {
  'use strict';
  const T = THREE, C = SF.CONFIG;
  const renderer = new T.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, C.perf.pixelRatio));
  renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08; renderer.outputEncoding = T.sRGBEncoding;
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color(C.colors.sky);
  scene.fog = new T.Fog(C.colors.sky, 220, 1250);
  const camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, .1, 1800);
  camera.position.set(0, 24, 32);
  const hemi = new T.HemisphereLight(0xffd6b2, 0x49463f, .82); scene.add(hemi);
  const sunLight = new T.DirectionalLight(0xffbc72, 2.25);
  sunLight.position.set(-120, 90, -110); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, {left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 420});
  sunLight.shadow.bias = -.0006; scene.add(sunLight, sunLight.target);
  const disc = new T.Mesh(new T.CircleGeometry(50, 64),
    new T.MeshStandardMaterial({color: 0xffbd68, emissive: 0xffa347,
      emissiveIntensity: 1.4, fog: false, toneMapped: false}));
  disc.position.set(-800, 180, -680); scene.add(disc);
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  SF.render = {renderer, scene, camera, sunLight, update(dt) {
    const position = SF.player && SF.player.position;
    if (position) {
      sunLight.target.position.copy(position); sunLight.position.copy(position).add(new T.Vector3(-120, 90, -110));
    }
    disc.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
  }, resize};
  window.addEventListener('resize', resize);
})(window.SF);
