// node --experimental-vm-modules checks/session4.mjs [--http]
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { harness, root, THREE } from './harness.mjs';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function assertLiveUnits(game) {
  assert.equal(new Set(game.police.units.map((unit) => unit.id)).size, game.police.units.length);
  for (const unit of game.police.units) {
    assert(unit.mesh.visible, `${unit.id} is a stale blip`);
    assert(game.police.group.getObjectById(unit.mesh.id), `${unit.id} missing from the scene`);
    assert.equal(unit.position, unit.mesh.position);
    assert.equal(unit.distanceToPlayer, unit.position.distanceTo(game.player.position));
    assert(unit.kind && unit.status);
  }
  for (const car of game.vehicles.all.filter((car) => car.policeControlled)) {
    assert(game.police.units.some((unit) => unit.car === car), 'police car missing from live list');
  }
}

const peaceful = await harness();
peaceful.start();
peaceful.game.player.position.set(-7, 0, 58);
peaceful.tap('Digit2');
peaceful.game.player.position.set(-1170, 0, 430);
peaceful.tap('KeyQ');
assert.equal(peaceful.game.police.stars, 0, 'punching air raised wanted');
peaceful.tap('Digit2');
peaceful.key('KeyQ'); peaceful.step(70); peaceful.key('KeyQ', false);
assert.equal(peaceful.game.police.stars, 0, 'unwitnessed firing without a victim raised wanted');
assert(peaceful.game.peds.crimeEvents.filter((event) => event.type === 'shot').every((event) => !event.witnesses.length));
console.log('PASS crime gate: empty punches and unwitnessed, victimless shots stay at zero stars');

const theft = await harness();
theft.start();
const g = theft.game;
const originalCash = g.cash;
g.player.position.copy(g.vehicles.hero.position).add(new THREE.Vector3(1.8, 0, 0));
theft.tap('KeyF');
assert.equal(g.drivenCar, g.vehicles.hero);
assert.equal(g.police.stars, 1);
assert(g.peds.crimeEvents[0].witnesses.length);
const firstCruiser = g.police.units[0];
assert(firstCruiser.home.distanceTo(g.player.position) >= 150, 'spawn popped in beside player');
assert(firstCruiser.car.spec.police && firstCruiser.car.mesh.getObjectByName('light-bar'));
assert.equal(firstCruiser.car.emergencyLights.length, 2);
theft.tap('KeyF'); theft.tap('KeyF');
assert.equal(g.police.stars, 1, 're-entry raised another theft');
let closest = Infinity;
let officersAppeared = false;
let chaseFrames = 0;
for (; chaseFrames < 3600 && g.mode !== 'busted'; chaseFrames += 1) {
  theft.step();
  assertLiveUnits(g);
  for (const unit of g.police.units) {
    if (unit.kind === 'officer') {
      officersAppeared = true;
      assert.equal(unit.mesh.userData.faceVariant, 'stern');
      closest = Math.min(closest, unit.distanceToPlayer);
    }
  }
}
assert.equal(g.mode, 'busted', 'cruisers/officers never reached the stationary driver');
assert(officersAppeared && closest < 1.6, `officers stopped at a standoff: ${closest}m`);
assert.equal(g.police.state, 'busted');
assert.equal(g.police.bustProgress, 1);
assert.equal(g.police.stars, 0);
assert.equal(theft.elements.get('busted-screen').hidden, false);
assert(g.cash < originalCash && originalCash - g.cash <= 150);
theft.step(240);
assert.equal(g.mode, 'play');
assert.equal(g.drivenCar, null);
assert.equal(g.player.visible, true);
assert.equal(distance(g.player.position, g.safehouse), 0);
assert.equal(g.police.units.length, 0);
assert.equal(g.police.state, 'clear');
assert.equal(theft.elements.get('busted-screen').hidden, true);
assertLiveUnits(g);
console.log(`PASS witnessed theft → converging cruisers → officers reached ${closest.toFixed(2)}m → BUSTED in ${(chaseFrames / 60).toFixed(1)}s → cash penalty and safehouse respawn`);

const attacks = await harness();
attacks.start();
const a = attacks.game;
const ped = a.peds.all[0];
a.player.position.copy(ped.position).add(new THREE.Vector3(0, 0, -1.5));
a.player.rotation.y = 0;
attacks.tap('KeyQ');
assert.equal(a.police.stars, 1, 'a real punch victim did not report assault');
assert.equal(a.peds.crimeEvents.at(-1).victim, ped.id);
a.police.reset();
a.player.position.copy(a.vehicles.hero.position).add(new THREE.Vector3(1.8, 0, 0));
attacks.tap('KeyF');
a.police.clearWanted();
const struck = a.peds.all[1];
const driven = a.drivenCar;
driven.heading = driven.previousHeading = 0;
driven.position.copy(struck.position);
driven.previousPosition.copy(driven.position).add(new THREE.Vector3(0, 0, -4));
driven.speed = 10;
a.peds.update(0, [driven]);
assert.equal(a.police.stars, 2, 'a swept strike by the player did not raise wanted');
a.police.reset();
const ambient = a.vehicles.parked.find((car) => car !== driven);
ambient.position.copy(a.peds.all[2].position);
ambient.previousPosition.copy(ambient.position).add(new THREE.Vector3(0, 0, -4));
ambient.speed = 10;
a.peds.update(0, [ambient]);
assert.equal(a.police.stars, 0, 'ambient traffic blamed the player');
a.reportCrime('shot', a.player.position); a.police.update(0); a.police.clearWanted();
const rammed = a.police.units.find((unit) => unit.kind === 'cruiser').car;
rammed.position.set(-700, 12, -96); rammed.heading = 0;
driven.position.set(-700, 12, -100.6); driven.heading = 0; driven.speed = 15;
a.vehicles.update(1 / 60, driven, { throttle: 1 });
assert.equal(a.police.stars, 2, 'actual collision with a police cruiser did not report a ram');
const afterRam = a.police.stars;
a.vehicles.update(1 / 60, driven, { throttle: 1 });
assert.equal(a.police.stars, afterRam, 'one contact repeatedly raised wanted');
console.log('PASS sources: real punch victim, player swept ped strike, ambient strike attribution, police ram and contact cooldown');

const moving = await harness();
moving.start();
const m = moving.game;
m.player.position.set(-640, 12, -96);
m.reportCrime('shot', m.player.position); m.police.update(0);
const pursuer = m.police.units[0];
pursuer.car.position.set(-700, 12, -96); pursuer.car.heading = Math.PI / 2;
for (let i = 0; i < 30; i += 1) m.police.update(1 / 30);
m.player.position.set(-770, 12, -96);
let movedClosest = Infinity;
for (let i = 0; i < 900 && m.police.state !== 'busted'; i += 1) {
  m.police.update(1 / 30);
  for (const unit of m.police.units.filter((unit) => unit === pursuer || unit.cruiser === pursuer)) {
    movedClosest = Math.min(movedClosest, unit.distanceToPlayer);
    assert.equal(unit.position.y, m.getGroundHeight(unit.position));
  }
}
assert(movedClosest < 1.6, `pursuer kept seeking an old position: ${movedClosest}m`);
assert.equal(m.police.state, 'busted');
console.log('PASS moving target: original pursuit turned around, followed CURRENT position across the bridge and reached the player');

const cover = await harness();
cover.start();
const c = cover.game;
const world = await cover.module('world');
c.player.position.set(-19, 0, 24);
c.reportCrime('shot', c.player.position); c.police.update(0);
const blocked = c.police.units[0];
blocked.car.position.set(-39, 0, 24); blocked.car.heading = 0; blocked.stuck = 1.3;
c.police.update(0);
assert(c.police.units.some((unit) => unit.kind === 'officer'));
assert.equal(c.police.seen, false, 'police saw through the safehouse');
assert.equal(c.police.canWitness(c.player.position), false);
let aroundClosest = Infinity;
for (let i = 0; i < 900 && c.police.state !== 'busted'; i += 1) {
  c.police.update(1 / 30);
  for (const unit of c.police.units.filter((unit) => unit.kind === 'officer')) {
    assert(world.isNavigable(unit.position.x, unit.position.z), 'officer walked through a wall or across water');
    aroundClosest = Math.min(aroundClosest, unit.distanceToPlayer);
  }
}
assert(aroundClosest < 1.6, 'officers failed to route around a building');
console.log('PASS cover: walls break line of sight; officers route around the building and still reach the player');

const hidden = await harness();
hidden.start();
const d = hidden.game;
d.reportCrime('vehicleHit', d.player.position);
for (let i = 0; i < 6 * 30; i += 1) d.police.update(1 / 30);
assert.equal(d.police.units.filter((unit) => unit.kind === 'cruiser').length, 3);
d.player.position.set(-1170, 0, 430);
for (let i = 0; i < 31 * 30; i += 1) d.police.update(1 / 30);
assert.equal(d.police.stars, 2, 'wanted decayed before the sight-loss grace period and cooling time');
for (let i = 0; i < 2 * 30; i += 1) d.police.update(1 / 30);
assert.equal(d.police.stars, 1, 'wanted did not decay out of police sight');
for (let i = 0; i < 17 * 30; i += 1) d.police.update(1 / 30);
assert.equal(d.police.stars, 0);
console.log('PASS wanted decay: 16s sight-loss grace, slow star cooling, eventual zero after escaping observation');

const response = await harness();
response.start();
const r = response.game;
r.player.position.set(-1000, 12, -96);
for (let i = 0; i < 5; i += 1) r.reportCrime('shot', r.player.position);
for (let i = 0; i < 14 * 30; i += 1) {
  r.player.position.x += 42 / 30;
  r.player.position.y = r.getGroundHeight(r.player.position);
  r.police.update(1 / 30);
}
assert.equal(r.police.stars, 5);
assert.equal(r.police.units.filter((unit) => unit.kind === 'cruiser').length, 6, 'response count did not scale with stars');
assertLiveUnits(r);
console.log('PASS response scaling: six cruisers plus AIR ONE at five stars, every deployed officer and vehicle stays in the live list');

const helicopter = await harness();
helicopter.start();
const e = helicopter.game;
e.player.position.set(-7, 0, 58);
helicopter.tap('Digit2');
helicopter.key('KeyQ'); helicopter.step(40); helicopter.key('KeyQ', false); helicopter.step(2);
assert.equal(e.police.stars, 3, 'three witnessed shots should reach three stars');
assert(e.police.helicopter, 'AIR ONE did not arrive at three stars');
const air = e.police.helicopter;
assert.equal(air.kind, 'helicopter');
for (let i = 0; i < 60; i += 1) e.police.update(1 / 30);
const rotorBefore = air.rotor.rotation.y;
e.player.position.set(8, 0, 64); e.police.update(1 / 30);
assert.equal(air.disc.position.x, e.player.position.x);
assert.equal(air.disc.position.z, e.player.position.z);
assert.equal(air.disc.position.y, e.getGroundHeight(e.player.position) + 0.21);
assert(air.position.y > 40 && air.rotor.rotation.y > rotorBefore);
assert(air.cone.visible && air.disc.visible && air.cone.material.transparent && !air.cone.material.fog);
assert.equal(air.spotlight.target, air.disc);
air.container.updateMatrixWorld(true);
assert(air.cone.localToWorld(new THREE.Vector3(0, 0.5, 0)).distanceTo(air.spotlight.position) < 1e-6, 'cone apex detached from helicopter');
assert(air.cone.localToWorld(new THREE.Vector3(0, -0.5, 0)).distanceTo(air.disc.position) < 1e-6, 'cone aimed away from player');
assertLiveUnits(e);
e.police.clearWanted();
for (let i = 0; i < 360; i += 1) e.police.update(1 / 30);
assert.equal(e.police.helicopter, null, 'AIR ONE did not depart after wanted cleared');
assertLiveUnits(e);
for (let i = 0; i < 8; i += 1) e.reportCrime('shot', e.player.position);
assert.equal(e.police.stars, 5);
assert.equal(e.reportCrime('proximity', e.player.position), false);
e.police.reset();
console.log('PASS AIR ONE: witnessed shots reach 3★, helicopter arrives, both rotors spin, cone and bright disc track exactly, all live units are listed, 5★ cap and departure work');

const frozen = await harness('?shot=bridge&seed=1337');
const airPose = frozen.game.police.helicopter.position.clone();
frozen.step(10);
assert.equal(frozen.window.__shotReady, true);
assert.equal(frozen.game.police.helicopter.position.distanceTo(airPose), 0);
assert.equal(frozen.game.police.stars, 4);
for (const unit of frozen.game.police.units) assert(frozen.elements.get('unit-list').innerHTML.includes(`data-unit="${unit.id}"`));
frozen.game.scene.updateMatrixWorld(true);
frozen.game.camera.updateMatrixWorld(true);
for (const object of [frozen.game.police.helicopter.model, frozen.game.police.helicopter.disc]) {
  const bounds = new THREE.Box3().setFromObject(object);
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).project(frozen.game.camera);
    assert(Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95, 'AIR ONE or the ground spotlight is clipped in the screenshot');
  }
}
console.log('PASS deterministic AIR ONE screenshot: body and ground light fit in frame, complete HUD response list');

if (process.argv.includes('--http')) {
  const paths = ['/', '/index.html', '/vendor/three.min.js',
    ...(await readdir(resolve(root, 'game/src'))).filter((name) => name.endsWith('.js')).map((name) => `/src/${name}`)];
  for (const path of paths) {
    const response = await fetch(`http://localhost:8080${path}`);
    assert.equal(response.status, 200, `HTTP failed for ${path}`);
    assert(response.headers.get('content-type').startsWith(path.endsWith('.js') ? 'text/javascript' : 'text/html'));
    assert((await response.arrayBuffer()).byteLength > 0);
  }
  console.log(`PASS live HTTP 200 sweep: ${paths.length} paths, correct MIME and nonempty content`);
}
