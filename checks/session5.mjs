// Run: node --experimental-vm-modules checks/session5.mjs
import assert from 'node:assert/strict';
import { harness, THREE } from './harness.mjs';

const storage = new Map();
const h = await harness('?seed=1337', { storage });
h.start();
const g = h.game;
h.tap('Digit3');
assert.equal(g.weapons.weapon.id, 'fists', 'a locked preview cannot equip');
g.player.position.set(-7, 0, 58);
h.step();
assert(g.weapons.owned.has('carbine'));
assert.equal(g.cash, 50);
h.tap('Digit2');
assert.equal(g.weapons.owned.has('sidearm'), false, 'insufficient cash cannot purchase a locked weapon');
assert.equal(g.weapons.weapon.id, 'carbine');
const resumed = await harness('?seed=1337', { storage });
assert.equal(resumed.elements.get('continue-button').hidden, false);
resumed.elements.get('continue-button').dispatchEvent(new Event('click'));
resumed.step();
assert(resumed.game.weapons.owned.has('carbine'), 'purchased carbine survives reload + Continue');
assert.equal(resumed.game.weapons.weapon.id, 'carbine');
assert.equal(resumed.game.cash, 50);

g.weapons.select(1);
g.player.position.set(-10, 0, 90);
g.player.rotation.y = 0;
const count = g.peds.crimeEvents.length;
g.weapons.update(1, { attack: true }, null);
assert.equal(g.peds.crimeEvents.length, count, 'empty fists report nothing');
assert.equal(g.police.stars, 0);
const ped = g.peds.all[5];
ped.position.set(-10, 0, 91.5);
g.weapons.update(1, { attack: true }, null);
assert(g.police.stars >= 1, 'a fist victim establishes a crime');
g.weapons.select(3);
ped.position.set(-10, 0, 105);
ped.health = 60;
g.camera.position.set(-10, 2, 80);
g.camera.lookAt(-10, 2, 110);
g.weapons.update(1, { attack: true }, null);
ped.position.set(-10, 0, 105);
g.weapons.update(1, { attack: true }, null);
assert(ped.fallen > 0, 'gun hits cause pedestrians to fall');
g.police.reset();
const officer = { id: 'CHECK-OFFICER', kind: 'officer', position: new THREE.Vector3(-10, 0, 108),
  mesh: g.player.clone(), status: 'pursuing' };
officer.mesh.position.copy(officer.position);
g.scene.add(officer.mesh);
g.police.units.push(officer);
ped.fallen = 12;
g.weapons.update(1, { attack: true }, null);
assert(g.police.stars >= 3, 'shooting police is a serious crime');
g.police.reset();

const world = await h.module('world');
const { FINALE, STORY_MISSIONS } = await h.module('missions');
const vanResources = [];
function moveTo(at) {
  if (g.drivenCar) {
    g.drivenCar.position.set(at.x, world.getGroundHeight(at), at.z);
    g.drivenCar.speed = 0;
  }
  g.player.position.set(at.x, at.y ?? world.getGroundHeight(at), at.z);
}
function enterCar() {
  if (g.drivenCar) return;
  const car = g.vehicles.hero;
  car.position.set(8, 0, 24);
  car.heading = 0;
  car.speed = 0;
  car.health = 100;
  car.occupied = false;
  car.owned = true;
  g.player.position.set(10.7, 0, 24);
  h.tap('KeyF');
  assert.equal(g.drivenCar, car);
}
function exitCar() {
  if (!g.drivenCar) return;
  g.drivenCar.position.set(8, 0, 24);
  g.drivenCar.speed = 0;
  h.tap('KeyF');
  assert.equal(g.drivenCar, null);
}

// Exercise every story objective through the same movement modes and mission update used by main.js.
for (let index = 0; index < 8; index += 1) {
  exitCar();
  moveTo(g.safehouse);
  h.tap('KeyE');
  assert.equal(g.missions.active.index, index);
  let guard = 0;
  while (g.missions.active && ++guard < 20) {
    const stage = g.missions.stage;
    assert(world.isNavigable(stage.at.x, stage.at.z), `${STORY_MISSIONS[index].name}: reachable marker`);
    if (stage.kind === 'tail') {
      enterCar();
      const van = g.vehicles.all.find((car) => car.mesh.name === 'quiet-company-van');
      vanResources.push(van);
      for (let frame = 0; frame < 2400 && g.missions.active; frame += 1) {
        moveTo({ x: van.position.x, z: van.position.z + 24 });
        g.missions.update(1 / 60, g.drivenCar);
      }
      assert.equal(g.missions.active, null, 'tailing the van to the port completes the job');
    } else if (stage.elevated) {
      exitCar();
      // Walk the actual ramp continuously, then reach the roof at its real height.
      for (let z = 112; z <= 145; z += 0.1) {
        assert(world.isNavigable(-9, z));
        moveTo({ x: -9, z });
        g.missions.update(1 / 60, null);
      }
    } else {
      if (stage.driving || ['deliver', 'timed'].includes(stage.kind)) enterCar();
      else exitCar();
      moveTo(stage.at);
      g.missions.update(1 / 60, g.drivenCar);
    }
  }
  assert(guard < 20, `mission ${index + 1} completes`);
  assert.equal(g.missions.progress, index + 1);
}
assert(vanResources.every((van) => !g.vehicles.all.includes(van)), 'mission van is cleaned up');

exitCar();
moveTo(g.safehouse);
h.tap('KeyE');
assert.equal(g.missions.active.index, 8);
assert.equal(g.police.stars, 4);
g.reportCrime('policeShot', g.player.position);
assert.equal(g.police.stars, 4, 'Last Wave pins stars even for serious crimes');
enterCar();
moveTo({ x: FINALE.tollX + 5, z: -96 });
g.missions.update(1 / 60, g.drivenCar);
moveTo({ x: FINALE.tollX - 5, z: -96 });
g.missions.update(1 / 60, g.drivenCar);
assert.equal(g.missions.active.stage, 1);
assert.equal(g.missions.lock, 0, 'crossing under the toll breaks AIR ONE lock');
moveTo({ x: FINALE.spikeX + 3, z: FINALE.gapZ });
g.missions.update(1 / 60, g.drivenCar);
moveTo({ x: FINALE.spikeX - 3, z: FINALE.gapZ });
g.missions.update(1 / 60, g.drivenCar);
assert.equal(g.missions.active.stage, 2);
assert.equal(g.missions.tyresDamaged, false);
assert.equal(g.missions.crew.Dre, 'WAITING AT BOAT');
// The actual car physics must clear the marked side gap; no position jump over the roadblock.
const car = g.drivenCar;
car.position.set(FINALE.roadblockX + 28, 0, -85.5);
car.heading = -Math.PI / 2;
car.speed = 22;
const { driveVehicle } = await h.module('vehicles');
moveTo(car.position);
car.speed = 22;
g.missions.update(1 / 60, car);
for (let frame = 0; frame < 140 && g.missions.active.stage === 2; frame += 1) {
  driveVehicle(car, { throttle: 1 }, 1 / 60, g.vehicles.all, (event) => g.missions.collide(event));
  g.player.position.copy(car.position);
  g.missions.update(1 / 60, car);
}
assert.equal(g.missions.active.stage, 3, 'driving the real side gap clears the roadblock');
// Leave the car on land, follow the dock over water, and arrive at the boat on foot.
exitCar();
const cashBeforeFinale = g.cash;
for (let x = world.marinaDock.x - 56; x <= world.marinaDock.x; x += 0.25) {
  assert(world.isNavigable(x, world.marinaDock.z, 0.35), 'dock is walkable all the way to the boat');
  moveTo({ x, z: world.marinaDock.z });
  g.missions.update(1 / 60, null);
}
assert.equal(g.missions.progress, 9);
assert.equal(g.missions.storyComplete, true);
assert.equal(g.cash, cashBeforeFinale + 6000);
assert.equal(g.police.stars, 0);
assert.equal(g.missions.name, 'Bridge Run');
moveTo(g.safehouse);
h.tap('KeyE');
assert.equal(g.missions.active.replay, true);
assert.equal(g.missions.name, 'Bridge Run');
g.missions.fail('test retry');

// A separate attempt verifies both the speed penalty and the alternative high-speed ram.
g.missions.start(8);
enterCar();
for (const at of [pointAt(FINALE.tollX + 5), pointAt(FINALE.tollX - 5), pointAt(FINALE.spikeX + 3), pointAt(FINALE.spikeX - 3)]) {
  moveTo(at); g.missions.update(1 / 60, g.drivenCar);
}
assert.equal(g.missions.tyresDamaged, true);
assert.equal(car.missionSpeedLimit, 14);
car.speed = 35;
driveVehicle(car, { throttle: 1 }, 1 / 60, g.vehicles.all);
assert(Math.abs(car.speed) <= 14, 'spikes impose a lasting actual speed cap');
g.missions.fail('retry');
assert.equal(car.missionSpeedLimit, undefined);
g.missions.start(8);
car.position.set(FINALE.roadblockX + 15, 0, -96);
car.heading = -Math.PI / 2;
car.speed = 24;
for (let frame = 0; frame < 120; frame += 1) driveVehicle(car, { throttle: 1 }, 1 / 60, g.vehicles.all, (event) => g.missions.collide(event));
assert(car.position.x < FINALE.roadblockX - 12, 'ramming at speed opens a physical path through both cruisers');
g.missions.fail('retry');
g.missions.start(8);
g.missions.update(FINALE.seconds + 1, car);
assert.equal(g.missions.active, null, 'lockdown expiry fails the mission');

const finalReload = await harness('?seed=1337', { storage });
finalReload.elements.get('continue-button').dispatchEvent(new Event('click'));
assert.equal(finalReload.game.missions.storyComplete, true);
assert.equal(finalReload.game.missions.progress, 9);
assert(finalReload.game.weapons.owned.has('carbine'));

const custody = await harness();
custody.start();
const c = custody.game;
c.missions.start(0);
c.player.position.copy(c.vehicles.hero.position).add(new THREE.Vector3(1.8, 0, 0));
custody.tap('KeyF');
for (let frame = 0; frame < 2400 && c.mode !== 'busted'; frame += 1) custody.step();
assert.equal(c.mode, 'busted', 'police can still arrest a stationary driver during a job');
assert.equal(c.missions.active, null, 'BUSTED aborts the active job');
custody.step(240);
assert.equal(c.mode, 'play');
assert.equal(c.drivenCar, null);
assert.equal(c.police.units.length, 0);
assert.equal(c.player.position.x, c.safehouse.x);
assert.equal(c.missions.progress, 0, 'interrupted jobs remain retryable');

for (const mode of ['bridge', 'face', 'drive', 'start']) {
  const a = await harness(`?shot=${mode}&seed=1`);
  const b = await harness(`?shot=${mode}&seed=999`);
  a.step(3); b.step(120);
  assert.deepEqual(a.game.camera.position.toArray(), b.game.camera.position.toArray());
  assert.deepEqual(a.game.player.position.toArray(), b.game.player.position.toArray());
  assert.equal(a.game.elapsed, b.game.elapsed);
  assert.equal(a.window.__shotReady, true);
  if (mode === 'bridge') {
    assert.equal(a.game.police.stars, 4);
    assert(a.game.police.helicopter.disc.visible);
    assert.equal(a.elements.get('speed-value').textContent, '101');
    assert.equal(a.game.missions.active.index, 8);
  }
}
console.log('Session 5 PASS: weapons, purchase + Continue, all nine jobs, rooftop and dock access, lock, spike gap/damage, roadblock gap/ram, boat payout, replay, timeout, and four frozen shots.');

function pointAt(x) { return { x, z: -96 }; }
