/**
 * Sunfall — Render Pipeline & Environment Setup
 *
 * Configures Three.js WebGLRenderer, ACES tone mapping, sunset sky dome,
 * atmospheric fog, low-angled directional sun light with tightly bounded shadow camera,
 * and responsive viewport sizing. No post-processing passes.
 */

(function () {
  'use strict';

  var SF = window.SF = window.SF || {};

  var renderer, scene, camera;
  var sunLight, ambientLight;
  var skyDome, sunSprite;

  // Direction offset vector from target to the low sunset sun (West-Southwest)
  var SUN_DIR_OFFSET = new THREE.Vector3(-100, 48, 25);

  function createSkyTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 512;
    var ctx = canvas.getContext('2d');

    // Vertical sunset gradient: dark violet zenith -> fiery orange/gold horizon
    var grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.00, '#120b20');
    grad.addColorStop(0.35, '#28153c');
    grad.addColorStop(0.65, '#782645');
    grad.addColorStop(0.82, '#c94628');
    grad.addColorStop(0.92, '#ff7034');
    grad.addColorStop(1.00, '#ff9a3c');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 512);

    var tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function createSunDiscTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');

    var grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.00, 'rgba(255, 255, 240, 1.0)');
    grad.addColorStop(0.20, 'rgba(255, 220, 140, 0.95)');
    grad.addColorStop(0.50, 'rgba(255, 140, 50, 0.6)');
    grad.addColorStop(0.80, 'rgba(255, 100, 30, 0.2)');
    grad.addColorStop(1.00, 'rgba(255, 80, 20, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    var tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  function init(container) {
    if (!container) {
      container = document.getElementById('canvas-container') || document.body;
    }

    var width = container.clientWidth || window.innerWidth || 800;
    var height = container.clientHeight || window.innerHeight || 600;

    // WebGLRenderer setup
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    var maxPixelRatio = (SF.CONFIG && SF.CONFIG.PERF && SF.CONFIG.PERF.MAX_PIXEL_RATIO) || 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Enable shadows for the directional sun
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Scene and atmospheric fog
    scene = new THREE.Scene();
    var fogColor = (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.FOG) || 0x361f38;
    scene.background = new THREE.Color(fogColor);
    scene.fog = new THREE.FogExp2(fogColor, 0.0035);

    // Perspective Camera
    camera = new THREE.PerspectiveCamera(62, width / height, 0.5, (SF.CONFIG && SF.CONFIG.PERF && SF.CONFIG.PERF.FAR_PLANE) || 550);
    camera.position.set(0, 15, 25);

    // Sunset Sky Dome
    var skyGeom = new THREE.SphereGeometry(480, 32, 16);
    var skyMat = new THREE.MeshBasicMaterial({
      map: createSkyTexture(),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    });
    skyDome = new THREE.Mesh(skyGeom, skyMat);
    scene.add(skyDome);

    // Solid circular silhouette, independent of sprite texture alpha.
    var sunMat = new THREE.MeshStandardMaterial({
      color: 0xffb85c,
      emissive: 0xff9a3c,
      emissiveIntensity: 1.5,
      fog: false,
      toneMapped: false,
      depthWrite: false
    });
    sunSprite = new THREE.Mesh(new THREE.CircleGeometry(23, 64), sunMat);
    sunSprite.position.set(-420, 80, 60);
    scene.add(sunSprite);

    // Hemisphere Ambient Light (warm sunset upper / deep dusky bounce lower)
    var skyCol = (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.AMBIENT_SKY) || 0xffaf7a;
    var groundCol = (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.AMBIENT_GROUND) || 0x261d2b;
    ambientLight = new THREE.HemisphereLight(skyCol, groundCol, 0.85);
    scene.add(ambientLight);

    // Single Directional Light with tight shadow bounds tracking the player
    var sunCol = (SF.CONFIG && SF.CONFIG.COLORS && SF.CONFIG.COLORS.SUN_GLOW) || 0xffc15e;
    sunLight = new THREE.DirectionalLight(sunCol, 1.7);
    sunLight.position.set(-100, 48, 25);
    sunLight.target.position.set(0, 0, 0);

    sunLight.castShadow = true;
    var shadowMapSize = (SF.CONFIG && SF.CONFIG.PERF && SF.CONFIG.PERF.SHADOW_MAP_SIZE) || 1024;
    sunLight.shadow.mapSize.width = shadowMapSize;
    sunLight.shadow.mapSize.height = shadowMapSize;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 220;

    var camBound = (SF.CONFIG && SF.CONFIG.PERF && SF.CONFIG.PERF.SHADOW_CAMERA_SIZE) || 45;
    sunLight.shadow.camera.left = -camBound;
    sunLight.shadow.camera.right = camBound;
    sunLight.shadow.camera.top = camBound;
    sunLight.shadow.camera.bottom = -camBound;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.02;

    scene.add(sunLight);
    scene.add(sunLight.target);

    // Window resize event handler
    window.addEventListener('resize', onResize, false);

    SF.render.renderer = renderer;
    SF.render.scene = scene;
    SF.render.camera = camera;
    SF.render.sunLight = sunLight;
    SF.render.skyDome = skyDome;
    SF.render.sunSprite = sunSprite;
  }

  function onResize() {
    if (!renderer || !camera) return;
    var container = renderer.domElement.parentElement || document.body;
    var width = container.clientWidth || window.innerWidth;
    var height = container.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    var maxPixelRatio = (SF.CONFIG && SF.CONFIG.PERF && SF.CONFIG.PERF.MAX_PIXEL_RATIO) || 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.setSize(width, height);
  }

  function update(dt, targetPos) {
    if (!targetPos && SF.player && SF.player.position) {
      targetPos = SF.player.position;
    }

    if (targetPos) {
      // Keep shadow frustum centered around active player/target
      sunLight.target.position.set(targetPos.x, targetPos.y, targetPos.z);
      sunLight.position.set(
        targetPos.x + SUN_DIR_OFFSET.x,
        targetPos.y + SUN_DIR_OFFSET.y,
        targetPos.z + SUN_DIR_OFFSET.z
      );
      sunLight.target.updateMatrixWorld();

      // Keep sky dome and sun disc centered with camera so horizon is stable
      if (skyDome) {
        skyDome.position.set(camera.position.x, 0, camera.position.z);
      }
      if (sunSprite) {
        sunSprite.quaternion.copy(camera.quaternion);
        sunSprite.position.set(
          camera.position.x - 420,
          80,
          camera.position.z + 60
        );
      }
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  SF.render = {
    init: init,
    onResize: onResize,
    update: update,
    renderer: null,
    scene: null,
    camera: null,
    sunLight: null,
    skyDome: null,
    sunSprite: null
  };

  // index.html loads this script after the canvas container and before the
  // world/entity builders. Publish the scene now so their meshes can attach.
  init();
})();
