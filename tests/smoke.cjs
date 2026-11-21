const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const eventTarget = { addEventListener() {}, removeEventListener() {} };
const context2d = new Proxy({
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  measureText: () => ({ width: 10 })
}, { get: (target, key) => target[key] ?? (() => {}) });
class Vector {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z = 0) { Object.assign(this, { x, y, z }); return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new Vector(this.x, this.y, this.z); }
  setScalar(n) { return this.set(n, n, n); }
  normalize() { return this; }
}
class Node {
  constructor() {
    this.position = new Vector();
    this.rotation = new Vector();
    this.scale = new Vector(1, 1, 1);
    this.userData = {};
    this.children = [];
    this.domElement = { ...eventTarget, style: {} };
    this.shadowMap = {};
    this.shadow = { mapSize: new Vector(), camera: {} };
    this.target = { position: new Vector() };
  }
  add(...nodes) { this.children.push(...nodes); }
  remove() {}
  lookAt() {}
  setPixelRatio() {}
  setSize() {}
  setAttribute() { return this; }
  setIndex() { return this; }
  computeVertexNormals() {}
  set() { return this; }
  clone() { return new Node(); }
}
const THREE = new Proxy({
  Vector2: Vector, Vector3: Vector, Euler: Vector,
  MathUtils: {
    clamp: (x, min, max) => Math.min(max, Math.max(min, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    degToRad: degrees => degrees * Math.PI / 180
  }
}, { get: (target, key) => target[key] ?? Node });
const document = {
  ...eventTarget, readyState: 'loading',
  body: { appendChild() {}, append() {} },
  createElement: () => ({ ...eventTarget, style: {}, getContext: () => context2d }),
  querySelector: () => null,
  getElementById: () => null
};
const sandbox = vm.createContext({
  SF: {}, THREE, document, console, performance, URLSearchParams,
  location: { search: '' }, requestAnimationFrame() {}, setTimeout, clearTimeout,
  innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1,
  ...eventTarget
});
sandbox.window = sandbox;
sandbox.self = sandbox;
const files = ['config', 'random', 'city', 'world', 'render', 'input', 'audio', 'save',
  'phone', 'player', 'vehicles', 'traffic', 'peds', 'police', 'weapons', 'missions', 'runtime', 'main'];
for (const file of files) {
  const filename = path.join(__dirname, '..', 'game', 'src', file + '.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
}
const { SF } = sandbox;
assert.ok(SF);
const districts = SF.city?.districts ?? SF.CONFIG?.districts ?? SF.CONFIG?.DISTRICTS ?? SF.world?.districts;
assert.equal(Object.keys(districts ?? {}).length, 6, 'six districts');
const types = SF.vehicles?.types ?? SF.vehicles?.TYPES ?? SF.CONFIG?.VEHICLE_TYPES;
assert.equal(Object.keys(types ?? {}).length, 6, 'six vehicle types');
assert.ok(Object.values(types).every(type => typeof (type?.name ?? type) === 'string'), 'vehicle types have names');
assert.equal(SF.missions.story.length, 8, 'eight story missions');
if (!SF.player.mesh) {
  const scene = new Node();
  if (SF.world && !SF.world.scene) SF.world.scene = scene;
  const init = SF.player.init || SF.player.create || SF.player.build;
  init?.call(SF.player, scene);
}
assert.ok(Object.keys(SF.player.mesh?.userData?.arms ?? {}).length, 'player has animated arms');
assert.ok(Array.isArray(SF.police.units), 'live dispatch list exists');
assert.equal(typeof SF.phone.call, 'function');
console.log('PASS Sunfall smoke: six districts, six named vehicles, eight missions, player arms, dispatch list, phone');
