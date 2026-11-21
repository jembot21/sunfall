'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const store = new Map();
global.localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); }
};
global.__SUNFALL_HEADLESS__ = true;
global.__SUNFALL_STOP_LOOP__ = true;

function fakeElement(tag) {
  const events = Object.create(null);
  return {
    tagName: tag.toUpperCase(), style: {}, children: [], attributes: {}, className: '', textContent: '',
    classList: { add() {}, remove() {} },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); child.parentNode = null; },
    addEventListener(type, callback) { (events[type] ||= []).push(callback); },
    setAttribute(name, value) { this.attributes[name] = value; },
    getContext() { return { clearRect() {}, save() {}, restore() {}, beginPath() {}, arc() {}, clip() {}, fillRect() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, translate() {}, rotate() {}, closePath() {} }; },
    dispatch(type, event = {}) { for (const callback of events[type] || []) callback(event); }
  };
}
global.document = Object.assign(fakeElement('document'), {
  readyState: 'loading',
  body: fakeElement('body'),
  head: fakeElement('head'),
  createElement(tag) { return fakeElement(tag); },
  pointerLockElement: null
});

const modules = [
  'input.js', 'audio.js', 'save.js', 'missions.js', 'hud.js', 'shots.js', 'main.js'
];
for (const file of modules) require(path.join(__dirname, '..', 'game', 'src', file));

const SF = global.SF;
assert.ok(SF, 'SF namespace boots');
assert.equal(SF.missions.districts.length, 6, 'six districts');
assert.equal(SF.missions.story.length, 8, 'eight story missions');
assert.equal(SF.missions.activities.length, 4, 'four repeatable activities');

SF.main.boot({ headless: true, autoLoop: false });
assert.equal(SF.main.state.booted, true, 'main module booted');

document.dispatch('keydown', { code: 'KeyW', preventDefault() {} });
assert.equal(SF.input.isDown('KeyW'), true, 'keyboard state tracks down');
assert.equal(SF.input.wasPressed('KeyW'), true, 'keyboard edge is recorded');
document.dispatch('keyup', { code: 'KeyW' });
assert.equal(SF.input.isDown('KeyW'), false, 'keyboard state tracks release');

SF.save.clear();
SF.save.store({ cash: 1875, storyDone: 3, unlocks: ['harbor-pass'], safehouse: { x: 14, y: 2, z: -8 } });
assert.equal(SF.save.saved, true, 'save sets continue flag');
const loaded = SF.save.load();
assert.equal(loaded.cash, 1875, 'save cash round trip');
assert.equal(loaded.storyDone, 3, 'save progress round trip');
assert.deepEqual(loaded.unlocks, ['harbor-pass'], 'save unlock round trip');
assert.deepEqual(loaded.safehouse, { x: 14, y: 2, z: -8 }, 'safehouse round trip');

const paths = SF.missions.getCampaignPaths();
assert.equal(paths.length, 8, 'campaign path for every story mission');
assert.ok(paths.every((p) => Array.isArray(p) && p.length >= 2 && p.every((m) => Number.isFinite(m.x) && Number.isFinite(m.z))), 'campaign route markers exist');
assert.equal(SF.missions.escapeSatisfied({ wanted: 0, elapsed: 2, distance: 60 }), true, 'patrol escape succeeds after clearing heat and distance');
assert.equal(SF.missions.escapeSatisfied({ wanted: 1, elapsed: 8, distance: 200 }), false, 'patrol escape requires no wanted stars');
assert.equal(SF.missions.escapeSatisfied({ wanted: 0, elapsed: 1, distance: 200 }), false, 'patrol escape requires time');

SF.missions.restore(loaded);
SF.player = { mesh: { position: { x: -365, y: 0, z: -225 } }, inVehicle: false };
SF.missions.begin(0);
assert.equal(SF.missions.active.currentObjective, 'Meet Marco Reyes in Palma Strand', 'first job starts at Marco');
SF.missions.interact({ force: true });
SF.player.inVehicle = true;
SF.missions.interact({ force: true });
SF.missions.interact({ force: true });
SF.player.mesh.position = { x: -365, y: 0, z: -225 };
assert.equal(SF.missions.interact({ wanted: 0, elapsed: 2, distance: 80 }), true, 'campaign completes after patrol escape');
assert.equal(SF.missions.storyDone, 1, 'campaign progress advances');
assert.equal(SF.missions.cash, 2475, 'mission payout updates cash');

assert.deepEqual(SF.shots.names.slice().sort(), ['chase', 'drive', 'mission', 'street'], 'four staged capture states exist');
assert.ok(SF.shots.names.every((name) => SF.shots.scenes[name].player && SF.shots.scenes[name].wanted != null), 'capture states contain a player and wanted level');
for (const name of SF.shots.names) assert.equal(SF.shots.apply(name), true, `${name} capture state applies`);

process.stdout.write('Sunfall smoke: 6 districts, 8 story missions, 4 activities, boot/input/save/routes/escape/captures passed.\n');
