// Rendering owns the one scene, camera and renderer. Main attaches world/actor groups.
import { CAMERA, PALETTE, RENDER, WORLD } from './config.js';

const THREE = window.THREE;
if (!THREE) throw new Error('Sunfall needs the vendored vendor/three.min.js.');
const container = document.getElementById('game');

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.domElement.className = 'renderer-canvas';
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Sunfall: WASD to walk, drag the mouse to orbit, scroll to zoom.');
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = RENDER.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.skyHorizon).convertSRGBToLinear();
scene.fog = new THREE.Fog(PALETTE.fog, WORLD.fogNear, WORLD.fogFar);
scene.fog.color.convertSRGBToLinear();
export const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2200, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(PALETTE.skyTop).convertSRGBToLinear() },
      horizonColor: { value: new THREE.Color(PALETTE.skyHorizon).convertSRGBToLinear() },
      bottomColor: { value: new THREE.Color(PALETTE.skyBottom).convertSRGBToLinear() },
      sunDirection: { value: new THREE.Vector3(-1400, 135, -1300).normalize() },
    },
    vertexShader: `
      varying vec3 skyDirection;
      void main() {
        skyDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDirection;
      varying vec3 skyDirection;
      void main() {
        float h = normalize(skyDirection).y;
        vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.03, h));
        color = mix(color, topColor, smoothstep(0.03, 0.7, h));
        float glow = pow(max(0.0, dot(normalize(skyDirection), sunDirection)), 36.0);
        color += vec3(0.32, 0.095, 0.018) * glow;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  }),
);
sky.name = 'golden-hour-sky';
sky.frustumCulled = false;
sky.renderOrder = -10;
scene.add(sky);
const sunDisk = new THREE.Mesh(
  new THREE.SphereGeometry(58, 32, 16),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.sun).convertSRGBToLinear(), fog: false, toneMapped: false }),
);
sunDisk.name = 'orange-setting-sun';
sunDisk.position.set(-1400, 135, -1300);
sky.add(sunDisk);

scene.add(new THREE.HemisphereLight(PALETTE.ambient, PALETTE.ground, 1.15));
scene.add(new THREE.AmbientLight(PALETTE.ambient, 0.22));
const sunlight = new THREE.DirectionalLight(PALETTE.sunlight, 2.65);
sunlight.name = 'sunset-sun';
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(RENDER.shadowMapSize, RENDER.shadowMapSize);
Object.assign(sunlight.shadow.camera, { left: -115, right: 115, top: 115, bottom: -115, near: 1, far: 800 });
sunlight.shadow.bias = -0.0003;
sunlight.shadow.normalBias = 0.06;
scene.add(sunlight, sunlight.target);
const sunOffset = new THREE.Vector3(-280, 48, -245);
// Light reflected from the bay keeps faces, glass and copper paint readable in shade.
const bayBounce = new THREE.DirectionalLight('#f0ccba', 0.65);
bayBounce.name = 'warm-bay-bounce';
const bounceOffset = new THREE.Vector3(140, 75, 95);
scene.add(bayBounce, bayBounce.target);

// Keep the sky centred and the finite shadow map around the current subject.
export function updateLighting(subject) {
  sky.position.copy(camera.position);
  sunlight.target.position.copy(subject);
  sunlight.position.copy(subject).add(sunOffset);
  bayBounce.target.position.copy(subject);
  bayBounce.position.copy(subject).add(bounceOffset);
}

export function resize() {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(container);
resize();
