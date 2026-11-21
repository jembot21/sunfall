// Exercise photo setups with real Three.js math, without a browser or WebGL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const THREE = require('../game/vendor/three.min.js');
const context2d = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (o, k) => o[k] || (() => {}) });
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
}
const sandbox = vm.createContext({ THREE: { ...THREE, WebGLRenderer: Renderer },
  document: { createElement: () => ({ getContext: () => context2d }) },
  console, performance, innerWidth: 1024, innerHeight: 768,
  devicePixelRatio: 1, addEventListener() {} });
sandbox.window = sandbox;
function load(file) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game/src', file + '.js'), 'utf8'), sandbox);
}
for (const file of ['config', 'random', 'city', 'world', 'render', 'player', 'vehicles', 'traffic', 'peds', 'police']) load(file);
const SF = sandbox.SF;
SF.world.build(SF.render.scene);
SF.player.init(); SF.vehicles.init(); SF.traffic.init(); SF.peds.init();
SF.state = { mode: 'play' };
SF.input = {};
SF.runtime = {};
SF.hud = { update() {} };
SF.phone = { clear() {}, call() {} };
load('missions'); load('shots');
function inside(position, label) {
  SF.render.camera.updateMatrixWorld(true);
  const p = position.clone().project(SF.render.camera);
  assert.ok(Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95 && p.z > -1 && p.z < 1,
    `${label} is outside frame: ${p.toArray()}`);
}
function openCamera() {
  const p = SF.render.camera.position;
  assert.ok(!SF.city.collisionBounds.some(b => p.x > b.minX && p.x < b.maxX &&
    p.z > b.minZ && p.z < b.maxZ && p.y < b.height), 'camera inside a building');
}
for (const name of ['cover', 'drive', 'street', 'mission']) {
  assert.equal(SF.shots.apply(name), true);
  // Cover used to crash on the first police sight ray against the sun sprite.
  assert.doesNotThrow(() => SF.police.update(1 / 60));
  SF.shots.updateCamera(); SF.render.prepare();
  openCamera();
  const actor = SF.player.vehicle?.mesh || SF.player.mesh;
  inside(actor.position.clone().add(new THREE.Vector3(0, 1, 0)), `${name} player`);
  if (name === 'cover') {
    for (const unit of SF.police.units) {
      const mesh = unit.car?.mesh || unit.mesh;
      inside(mesh.position.clone().add(new THREE.Vector3(0, unit.car ? 1.8 : 0, 0)), unit.callsign);
    }
    // Choreography follows the moving car, including after AI's next update.
    actor.position.z += 20;
    SF.police.update(1 / 60); SF.shots.updateCamera();
    for (const unit of SF.police.units) inside((unit.car?.mesh || unit.mesh).position, unit.callsign);
  }
  if (name === 'drive') assert.ok(SF.render.camera.position.distanceTo(actor.position) > 9,
    'drive camera must clear the car body');
  if (name === 'mission') {
    const marco = SF.peds.all.find(p => p.mesh.name === 'Marco Reyes');
    inside(marco.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 'Marco');
    assert.equal(SF.missions.active.index, 0);
  }
}
console.log('PASS Sunfall staging frustums, open cameras, chase placement, and sprite sight rays');
