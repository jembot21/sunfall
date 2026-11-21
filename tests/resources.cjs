// Real three.js scene audit; deliberately creates no WebGL context or browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const THREE = require('../game/vendor/three.min.js');
const context2d = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (o, k) => o[k] || (() => {}) });
const events = { addEventListener() {}, removeEventListener() {} };
let canvases = 0;
const document = { ...events, createElement() {
  canvases++;
  return { ...events, width: 0, height: 0, getContext: () => context2d };
} };
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
}
const allocations = { textures: 0, geometries: 0, materials: 0, targets: 0 };
const instrumented = { ...THREE, WebGLRenderer: Renderer };
for (const [name, Constructor] of Object.entries(THREE)) {
  const category = /Texture$/.test(name) ? 'textures' : /Geometry$/.test(name) ? 'geometries' :
    /Material$/.test(name) ? 'materials' : /RenderTarget$/.test(name) ? 'targets' : null;
  if (category && typeof Constructor === 'function') instrumented[name] = new Proxy(Constructor, {
    construct(Target, args) { allocations[category]++; return Reflect.construct(Target, args); }
  });
}
const sandbox = vm.createContext({ THREE: instrumented, document,
  console, performance, innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1, ...events });
sandbox.window = sandbox;
for (const file of ['config', 'random', 'city', 'world', 'render', 'player', 'vehicles', 'traffic', 'peds', 'police']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/src', file + '.js'), 'utf8'), sandbox);
}
const SF = sandbox.SF;
SF.world.build(SF.render.scene);
SF.player.init(); SF.vehicles.init(); SF.traffic.init(); SF.peds.init(); SF.police.init();
function snapshot(label) {
  SF.render.prepare?.();
  const geometry = new Set(), material = new Set(), texture = new Set();
  let nodes = 0, meshes = 0, lights = 0, instances = 0, textureBytes = 0;
  SF.render.scene.traverse(o => {
    nodes++;
    if (o.isMesh || o.isSprite) meshes++;
    if (o.isPointLight) lights++;
    if (o.isInstancedMesh) instances += o.count;
    if (o.geometry) geometry.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      material.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) texture.add(v);
    }
  });
  for (const t of texture) textureBytes += t.image.width * t.image.height * 4 * (t.generateMipmaps ? 4 / 3 : 1);
  const result = { label, nodes, meshes, instances, geometries: geometry.size, materials: material.size,
    textures: texture.size, canvases, textureBytes: Math.ceil(textureBytes), pointLights: lights,
    cars: SF.vehicles.all.length, pedestrians: SF.peds.all.length, allocations: { ...allocations } };
  console.log(JSON.stringify(result));
  return result;
}
const boot = snapshot('boot');
SF.police.setWanted(5);
const wanted = snapshot('wanted-5');
if (process.argv.includes('--baseline')) process.exit(0);
assert.ok(boot.nodes < 1500 && wanted.nodes < 1500, 'scene graph budget');
assert.ok(wanted.geometries < 20, 'shared geometry budget');
assert.ok(wanted.materials < 160, 'shared material budget');
assert.ok(wanted.textures <= 10 && canvases <= 10, 'fixed texture set');
assert.equal(wanted.pointLights, 8, 'fixed light budget');
assert.equal(allocations.targets, 0, 'no render targets');
assert.equal(allocations.textures, 10, 'all live and cached textures counted');
assert.equal(boot.instances, 49860, 'all 41,552 city parts and 8,308 actor parts retained');

function actorInstances() {
  return SF.render.scene.children.filter(o => o.userData.dynamicActors);
}
function represented(part) {
  const expected = part.matrixWorld.elements.map(Math.fround);
  return actorInstances().some(batch => batch.geometry === part.geometry && batch.material === part.material &&
    Array.from({ length: batch.count }, (_, i) => i).some(i =>
      expected.every((value, j) => batch.instanceMatrix.array[i * 16 + j] === value)));
}
const car = SF.vehicles.parked[0], ped = SF.peds.all[0];
car.mesh.position.x += 5; car.mesh.rotation.y += 0.4;
car.wheels[0].pivot.rotation.y = 0.2; car.wheels[0].tire.rotation.x += 0.7;
SF.player.helpers.animate(ped.mesh, 0.1, 3.6, true);
SF.render.prepare();
assert.ok(represented(car.wheels[0].tire), 'wheel steering and rolling reach the batch');
assert.ok(represented(ped.mesh.userData.arms[0].children[0]), 'articulated pedestrian pose reaches the batch');
const ray = new THREE.Raycaster(new THREE.Vector3(car.mesh.position.x, 10, car.mesh.position.z), new THREE.Vector3(0, -1, 0));
assert.ok(ray.intersectObject(car.mesh, true).length, 'detached car keeps its exact raycast hierarchy');
const beforeHide = actorInstances().reduce((n, b) => n + b.count, 0);
ped.mesh.visible = false; SF.render.prepare();
assert.equal(actorInstances().reduce((n, b) => n + b.count, 0), beforeHide - 15, 'hidden pedestrian removes every rendered part');
ped.mesh.visible = true;
const second = SF.vehicles.parked[1];
car.braking = true; second.braking = false;
SF.vehicles.update(0);
assert.notEqual(car.brakeLights[0].material, second.brakeLights[0].material, 'braking cannot change another car');
assert.equal(car.brakeLights[0].material.emissiveIntensity, 2.4);
assert.equal(second.brakeLights[0].material.emissiveIntensity, 0.35);

const warmed = { ...allocations };
for (let i = 0; i < 12; i++) SF.peds.create({ x: -335 + i * 3, z: -241 });
for (let cycle = 0; cycle < 20; cycle++) {
  SF.police.setWanted(0); SF.police.setWanted(5);
  for (const type of SF.vehicles.types) {
    const extra = SF.vehicles.create(type, { traffic: true });
    SF.render.prepare();
    SF.vehicles.remove(extra);
  }
  SF.render.prepare();
}
assert.deepEqual(allocations, warmed, 'repeated spawns allocate no texture, geometry, or material');
const churned = snapshot('after-20-pursuit-and-traffic-cycles');
assert.ok(churned.nodes < 1500 && churned.cars === wanted.cars, 'removed vehicles and patrols leave no scene leak');
console.log('PASS Sunfall resource budgets, transforms, hit targets, visibility, independent lamps, and spawn reuse');
