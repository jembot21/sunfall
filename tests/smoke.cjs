'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// A deterministic browser/Three stand-in, not a renderer. Counts allocations
// and preserves scene hierarchy so budgets test the actual builders.
function environment() {
  const counts = { textures: 0, instances: [] };
  class Vector {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    setScalar(n) { return this.set(n, n, n); }
    setY(y) { this.y = y; return this; }
    copy(v) { return this.set(v.x, v.y, v.z); }
    clone() { return new Vector(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    subVectors(a, b) { return this.copy(a).sub(b); }
    addVectors(a, b) { return this.copy(a).add(b); }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    lengthSq() { return this.x ** 2 + this.y ** 2 + this.z ** 2; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { return this.multiplyScalar(1 / (this.length() || 1)); }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    distanceToSquared(v) { return this.distanceTo(v) ** 2; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
    applyAxisAngle() { return this; }
    applyQuaternion() { return this; }
    setFromMatrixPosition(m) { return this.copy(m.position || new Vector()); }
  }
  class Color {
    constructor(value) { this.value = value; }
    set(value) { this.value = value; return this; }
    setHex(value) { return this.set(value); }
    setHSL(h, s, l) { this.h = h; this.s = s; this.l = l; return this; }
    clone() { return new Color(this.value); }
    multiplyScalar() { return this; }
    lerp() { return this; }
  }
  class Node {
    constructor(geometry, material) {
      this.geometry = geometry; this.material = material; this.position = new Vector(); this.rotation = new Vector(); this.scale = new Vector(1, 1, 1);
      this.quaternion = { setFromAxisAngle() {}, copy() {}, slerp() {} }; this.children = []; this.userData = {}; this.visible = true;
      this.matrix = {}; this.matrixWorld = {}; this.shadow = { mapSize: { set() {} }, camera: {}, bias: 0 };
    }
    add(...nodes) { for (const n of nodes) if (n) { this.children.push(n); n.parent = this; } return this; }
    remove(n) { this.children = this.children.filter(x => x !== n); }
    traverse(fn) { fn(this); this.children.forEach(n => n.traverse?.(fn)); }
    lookAt() {}
    updateMatrix() { this.matrix = { position: this.position.clone() }; }
    updateMatrixWorld() {}
    updateProjectionMatrix() {}
    getWorldPosition(v) { return v.copy(this.position); }
    localToWorld(v) { return v.add(this.position); }
    clone() { const n = new this.constructor(this.geometry, this.material); n.position.copy(this.position); n.rotation.copy(this.rotation); n.userData = { ...this.userData }; for (const c of this.children) n.add(c.clone()); return n; }
    setRotationFromAxisAngle() {}
  }
  class Geometry {
    constructor() { this.attributes = { position: { count: 24, getX: () => 0, getY: () => 0, getZ: () => 0, setXYZ() {} }, uv: { count: 24, getX: () => 0, getY: () => 0, setXY() {} } }; }
    setAttribute(k, v) { this.attributes[k] = v; return this; }
    getAttribute(k) { return this.attributes[k]; }
    setIndex() { return this; }
    setFromPoints() { return this; }
    rotateX() { return this; } rotateY() { return this; } rotateZ() { return this; }
    translate() { return this; } scale() { return this; } computeVertexNormals() {} dispose() {}
    clone() { return new Geometry(); }
  }
  class Material { constructor(options = {}) { Object.assign(this, options); this.color = new Color(options.color); this.emissive = new Color(options.emissive); } clone() { return new Material(this); } dispose() {} }
  class InstancedMesh extends Node {
    constructor(g, m, count) { super(g, m); this.count = count; this.isInstancedMesh = true; this.instanceMatrix = { setUsage() {} }; this.instanceColor = {}; counts.instances.push(this); }
    setMatrixAt() {} setColorAt() {} computeBoundingSphere() {}
  }
  const context2d = new Proxy({ measureText: text => ({ width: String(text).length * 8 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), getImageData: () => ({ data: new Uint8ClampedArray(16) }) }, { get: (o, k) => k in o ? o[k] : () => {} });
  function element(tag) {
    return { tagName: tag?.toUpperCase(), style: {}, children: [], width: 512, height: 512, classList: { add() {}, remove() {}, toggle() {} }, getContext: () => context2d, appendChild(n) { this.children.push(n); return n; }, addEventListener() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => null, querySelectorAll: () => [], remove() {} };
  }
  const container = element('div');
  const document = { readyState: 'loading', createElement: element, body: element('body'), documentElement: element('html'), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: id => id === 'game-container' ? container : null, exitPointerLock() {} };
  const three = {
    Vector2: Vector, Vector3: Vector, Euler: Vector, Color, Group: Node, Scene: class extends Node { constructor() { super(); this.isScene = true; } }, Object3D: Node, Mesh: Node, Sprite: class extends Node { constructor(material) { super(null, material); } }, InstancedMesh,
    CanvasTexture: class { constructor(canvas) { this.image = canvas; this.repeat = new Vector(); this.offset = new Vector(); counts.textures++; } },
    Matrix4: class { identity() { return this; } compose() { return this; } makeRotationY() { return this; } makeTranslation() { return this; } makeScale() { return this; } multiply() { return this; } copy() { return this; } setPosition() { return this; } },
    Raycaster: class { constructor() { this.ray = { origin: new Vector(), direction: new Vector() }; } set() {} setFromCamera() {} intersectObjects() { return []; } },
    Box3: class { constructor() { this.min = new Vector(-1, -1, -1); this.max = new Vector(1, 1, 1); } setFromObject() { return this; } containsPoint() { return false; } intersectsBox() { return false; } },
    WebGLRenderer: class { constructor() { this.domElement = element('canvas'); this.shadowMap = {}; this.info = { render: {} }; } setPixelRatio() {} setSize() {} setClearColor() {} render() {} },
    MathUtils: { clamp: (x, a, b) => Math.max(a, Math.min(b, x)), lerp: (a, b, t) => a + (b - a) * t, damp: (a, b, l, t) => b + (a - b) * Math.exp(-l * t), degToRad: d => d * Math.PI / 180, randFloat: (a, b) => (a + b) / 2, randInt: (a, b) => Math.floor((a + b) / 2), euclideanModulo: (a, b) => (a % b + b) % b },
    Clock: class { getDelta() { return 1 / 60; } },
  };
  const THREE = new Proxy(three, { get(o, k) {
    if (k in o) return o[k];
    if (/Geometry$|BufferAttribute$|^Shape$|^Path$/.test(k)) return Geometry;
    if (/Material$/.test(k)) return Material;
    if (/Light$|Camera$|Helper$|^Fog/.test(k)) return Node;
    if (/^[A-Z_]+$/.test(k) || /Wrapping$|Filter$|Side$|ShadowMap$|Usage$|ColorSpace$|ToneMapping$|Encoding$|Blending$/.test(k)) return k;
    throw new Error('Missing Three test stub: ' + String(k));
  } });
  const saved = new Map();
  const sandbox = { console, THREE, document, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, navigator: { userAgent: 'node-smoke' }, location: { search: '' }, URLSearchParams, performance: { now: () => 0 }, localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) }, addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, Math, Float32Array, Uint16Array, Uint32Array };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  const files = ['config', 'random', 'input', 'audio', 'city', 'world', 'render', 'player', 'vehicles', 'traffic', 'peds', 'police', 'weapons', 'save', 'phone', 'missions', 'runtime', 'main'];
  for (const name of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/src', name + '.js'), 'utf8'), context, { filename: name + '.js' });
  return { context, SF: sandbox.SF, THREE, counts };
}

function smoke() {
  const env = environment(), { SF } = env;
  assert.ok(SF, 'SF namespace exists');
  SF.main.boot();
  const districts = SF.city?.districts || SF.CONFIG?.districts || SF.CONFIG?.DISTRICTS || SF.districts;
  assert.equal(Object.keys(districts || {}).length, 6, 'six districts');
  const types = SF.vehicles?.types || SF.vehicles?.TYPES || SF.CONFIG?.vehicleTypes || SF.CONFIG?.VEHICLE_TYPES;
  const typeList = Array.isArray(types) ? types : Object.values(types || {});
  assert.equal(typeList.length, 6, 'six vehicle types');
  assert.ok(typeList.every(t => typeof t === 'string' ? t.length > 0 : typeof t.name === 'string' && t.name.length), 'every vehicle type has a name');
  assert.equal(SF.missions.story.length, 8, 'eight story missions');
  const arms = SF.player.mesh?.userData?.arms;
  assert.ok(arms && Object.keys(arms).length > 0, 'player has animated arms');
  assert.ok(Array.isArray(SF.police.units), 'live dispatch units array');
  assert.ok(SF.peds.people.length > 0, 'pedestrian population actually initialized');
  assert.ok(SF.vehicles.parked.length > 0, 'parked vehicles actually initialized');
  assert.ok(SF.traffic.cars.length > 0, 'traffic actually initialized');
  assert.equal(typeof SF.phone.call, 'function');
  SF.phone.clear(); SF.phone.call('Marco', 'First'); SF.phone.call('Lena', 'Second');
  assert.equal(SF.phone.current.line, 'First'); SF.phone.update(6.01);
  assert.equal(SF.phone.current.line, 'Second'); SF.phone.update(6.01); assert.equal(SF.phone.current, null);
  SF.missions.start(); assert.equal(SF.missions.active.title, 'First Favor');
  assert.equal(SF.phone.current.caller, 'Marco Reyes');
  SF.save.store(); assert.equal(SF.save.saved, true); assert.ok(SF.save.load()); SF.save.clear(); assert.equal(SF.save.saved, false);
  SF.runtime.setMode('play'); SF.runtime.update(1 / 60);
  env.context.performance.now = () => 5000;
  SF.weapons.unlock('pistol'); SF.weapons.equip('pistol');
  const p = SF.player.mesh.position;
  SF.peds.people[0].mesh.position.set(p.x + 3, p.y, p.z - 5);
  SF.weapons.shoot(); SF.runtime.update(1 / 60);
  assert.ok(SF.police.stars > 0 && SF.police.units.length > 0, 'witnessed shot creates wanted response and live dispatch');
  SF.missions.reset(); SF.police.wanted = 0;
  SF.player.vehicle = { mesh: SF.player.mesh }; SF.player.cash = 0;
  for (let i = 0; i < 8; i++) {
    SF.phone.clear(); assert.equal(SF.missions.start(i), true);
    const m = SF.missions.story[i];
    assert.equal(SF.phone.current.line, m.intro);
    for (let j = 0; j < m.stages.length; j++) {
      const s = m.stages[j];
      SF.player.mesh.position.set(s.position.x, s.position.y, s.position.z);
      SF.missions.active.elapsed = 2; SF.missions.update(1 / 60);
    }
    assert.equal(SF.missions.storyDone, i + 1, 'mission closes exactly once');
    assert.equal(SF.missions.active, null);
  }
  assert.equal(SF.player.cash, SF.missions.story.reduce((sum, m) => sum + m.payout, 0));
  assert.ok(SF.save.unlocks.includes('crew-finale'));
  SF.player.vehicle = null;
  console.log('PASS smoke: namespace, six districts, six named vehicles, eight missions, arms, populations, dispatch, FIFO phone, saves, live tick, witnessed crime, all story stages and payouts');
}
module.exports = { environment };
if (require.main === module) smoke();
