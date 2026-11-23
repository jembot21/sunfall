// No dependencies: node --experimental-vm-modules checks/session3.mjs
// Uses real Three.js geometry and gameplay modules; only DOM drawing and WebGL are stubbed.
// --http additionally sweeps a running server at http://localhost:8080.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { Writable } from 'node:stream';

const root = fileURLToPath(new URL('../', import.meta.url));
const THREE = createRequire(import.meta.url)('../game/vendor/three.min.js');
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

class Element extends EventTarget {
  style = {};
  textContent = '';
  hidden = false;
  focus() {}
  hasPointerCapture() { return false; }
  setPointerCapture() {}
  releasePointerCapture() {}
  closest() { return null; }
  getContext() { return new Proxy({}, { get: (target, key) => target[key] ?? (() => {}) }); }
}

async function harness(search = '') {
  let nextFrame;
  const elements = new Map();
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); },
  });
  const window = Object.assign(new EventTarget(), { location: { search },
    THREE: { ...THREE, Clock: class { getDelta() { return 1 / 60; } } } });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1.6, 0.1, 3200);
  const renderer = { domElement: new Element(), render() {} };
  const context = createContext({ window, document, URLSearchParams, AbortController, console,
    requestAnimationFrame(callback) { nextFrame = callback; } });
  const modules = new Map();
  const renderPath = resolve(root, 'game/src/render.js');
  modules.set(renderPath, Promise.resolve(new SyntheticModule(['scene', 'camera', 'renderer', 'updateLighting'], function () {
    this.setExport('scene', scene);
    this.setExport('camera', camera);
    this.setExport('renderer', renderer);
    this.setExport('updateLighting', () => {});
  }, { context, identifier: renderPath })));
  function load(path) {
    if (!modules.has(path)) modules.set(path, readFile(path, 'utf8').then((source) => new SourceTextModule(source, {
      context, identifier: path,
    })));
    return modules.get(path);
  }
  const main = await load(resolve(root, 'game/src/main.js'));
  await main.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
  await main.evaluate();
  return {
    game: window.__sunfall, elements, window,
    step(frames = 1) { for (let i = 0; i < frames; i += 1) nextFrame(); },
    key(code, down = true) {
      const event = new Event(down ? 'keydown' : 'keyup', { cancelable: true });
      Object.assign(event, { code, repeat: false });
      window.dispatchEvent(event);
    },
    async module(name) { return (await load(resolve(root, `game/src/${name}.js`))).namespace; },
  };
}

const h = await harness('?seed=1337');
const { game } = h;
const vehiclesModule = await h.module('vehicles');
const pedsModule = await h.module('peds');
const worldModule = await h.module('world');
const randomModule = await h.module('random');
assert.equal(game.vehicles.parked.length, 38);
assert.equal(game.vehicles.traffic.length, 28);
assert.equal(game.peds.all.length, 76);
for (const ped of game.peds.all) assert(ped.figure.getObjectByName('left-eye') && ped.figure.getObjectByName('mouth'));
for (const name of ['spoiler', 'hood-scoop', 'two-tone-roof']) assert(game.vehicles.hero.mesh.getObjectByName(name));

let turns = 0;
let straightSamples = 0;
for (const seed of [1337, 42, 9001]) {
  const fleet = vehiclesModule.createVehicles(randomModule.createRandom(seed));
  const { traffic } = fleet;
  for (let step = 0; step < 10800; step += 1) {
    const before = traffic.map((car) => ({ position: car.position.clone(), heading: car.heading,
      edge: car.ai.edge, curve: car.ai.curve }));
    fleet.update(1 / 30);
    for (let index = 0; index < traffic.length; index += 1) {
      const car = traffic[index];
      const old = before[index];
      assert(worldModule.isOnRoad(car.position), `traffic left a road: seed ${seed}, tick ${step}`);
      assert.equal(car.position.y, worldModule.getGroundHeight(car.position));
      if (!car.ai.curve) assert(Math.abs(angleDifference(car.heading, car.ai.edge.heading)) < 1e-9);
      if (!old.curve && !car.ai.curve && old.edge === car.ai.edge) {
        const movement = car.position.clone().sub(old.position);
        assert(Math.abs(movement.x * Math.cos(car.heading) - movement.z * Math.sin(car.heading)) < 1e-8,
          'traffic travelled sideways on a straight segment');
        assert(movement.x * Math.sin(car.heading) + movement.z * Math.cos(car.heading) >= -1e-8);
        straightSamples += 1;
      } else if (old.curve && car.ai.curve === old.curve && car.speed > 0.1) {
        const movement = car.position.clone().sub(old.position);
        const motionHeading = Math.atan2(movement.x, movement.z);
        assert(Math.abs(angleDifference(car.heading, motionHeading)) < 0.06, 'junction heading missed its tangent');
      }
      if (old.edge !== car.ai.edge) { assert.equal(old.edge.to, car.ai.edge.from); turns += 1; }
      // Every corner of the car must stay on asphalt, including while turning.
      for (const across of [-car.spec.width / 2, car.spec.width / 2]) {
        for (const along of [-car.spec.length / 2, car.spec.length / 2]) {
          const x = car.position.x + Math.cos(car.heading) * across + Math.sin(car.heading) * along;
          const z = car.position.z - Math.sin(car.heading) * across + Math.cos(car.heading) * along;
          assert(worldModule.isOnRoad(x, z), `traffic footprint left asphalt: seed ${seed}, tick ${step}, ${x},${z}`);
          assert(!worldModule.buildingBounds.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ));
        }
      }
    }
  }
}
assert(turns > 100);
console.log(`PASS traffic: 3 seeds × 6 simulated minutes, ${turns} connected transitions, ${straightSamples} aligned straight samples`);

const { city, farShore } = game.bridgeEndpoints;
const car = vehiclesModule.createVehicle({ hero: true, position: { x: city.x + 12, z: city.z }, heading: -Math.PI / 2 });
let high = 0;
let rampSamples = 0;
for (const destination of [farShore.x - 18, city.x + 12]) {
  const goingWest = destination < car.position.x;
  car.heading = goingWest ? -Math.PI / 2 : Math.PI / 2;
  car.speed = car.steerAngle = 0;
  let steps = 0;
  while (goingWest ? car.position.x > destination : car.position.x < destination) {
    vehiclesModule.driveVehicle(car, { throttle: 1 }, 1 / 60);
    assert.equal(car.position.y, worldModule.getGroundHeight(car.position));
    assert.equal(car.health, 100, 'bridge traversal collided with geometry');
    high = Math.max(high, car.position.y);
    if (car.position.y > 0 && car.position.y < 12) { assert(Math.abs(car.mesh.rotation.x) > 0); rampSamples += 1; }
    assert(++steps < 5000, 'bridge traversal got stuck');
  }
}
assert.equal(high, 12);
assert(rampSamples > 100);
console.log('PASS bridge: GT drove both ramps, full deck and marina, then returned; correct height and slope');

for (const speed of [8, -8]) {
  const steeringCar = vehiclesModule.createVehicle({ position: { x: 8, z: 24 } });
  steeringCar.speed = speed;
  for (let i = 0; i < 4; i += 1) vehiclesModule.driveVehicle(steeringCar, { steering: -1 }, 1 / 30);
  assert(speed * steeringCar.heading > 0, 'reverse steering did not reverse the nose rotation');
  assert(steeringCar.wheels.filter((wheel) => wheel.front).every((wheel) => wheel.pivot.rotation.y > 0));
}
const brakingCar = vehiclesModule.createVehicle({ position: { x: 8, z: 24 } });
brakingCar.speed = 9;
vehiclesModule.driveVehicle(brakingCar, { throttle: -1 }, 1 / 60);
assert(brakingCar.braking && brakingCar.brakeMaterial.emissiveIntensity > 2);
for (let i = 0; i < 80; i += 1) vehiclesModule.driveVehicle(brakingCar, { throttle: -1 }, 1 / 60);
assert(brakingCar.speed < 0, 'S never reached reverse');
brakingCar.speed = 9;
for (let i = 0; i < 30; i += 1) vehiclesModule.driveVehicle(brakingCar, { handbrake: true }, 1 / 60);
assert.equal(brakingCar.speed, 0);
console.log('PASS driving: acceleration, brake/reverse, signed steering, front-wheel visuals and held handbrake');

const walkers = pedsModule.createPeds(game.vehicles.network, randomModule.createRandom(2026));
for (let i = 0; i < 3600; i += 1) {
  walkers.update(1 / 30, game.vehicles.parked);
  for (const ped of walkers.all) {
    assert(!worldModule.isOnRoad(ped.position), 'pedestrian entered asphalt');
    assert(!worldModule.buildingBounds.some((b) => ped.position.x > b.minX && ped.position.x < b.maxX
      && ped.position.z > b.minZ && ped.position.z < b.maxZ), 'pedestrian entered a building');
    assert.equal(ped.fleeTime, 0);
  }
}
assert.equal(walkers.crimeEvents.length, 0);
assert.equal(walkers.witnessCrime(walkers.all[0].position, { type: 'proximity' }), null);
const victim = walkers.all[0];
const hitCar = vehiclesModule.createVehicle({ position: { x: victim.position.x, z: victim.position.z - 3 } });
hitCar.previousPosition.copy(hitCar.position);
hitCar.position.z += 3;
hitCar.speed = 10;
walkers.update(0, [hitCar]);
assert.equal(walkers.crimeEvents.length, 1);
assert.equal(walkers.crimeEvents[0].type, 'vehicleHit');
assert(walkers.crimeEvents[0].witnesses.includes(victim.id) && victim.fleeTime > 0);
walkers.update(0, [hitCar]);
assert.equal(walkers.crimeEvents.length, 1, 'one contact repeatedly generated crimes');
walkers.update(9);
assert.equal(victim.fleeTime, 0);
const b = worldModule.buildingBounds[0];
victim.position.set(b.minX - 2, 0.17, (b.minZ + b.maxZ) / 2);
const hiddenTheft = walkers.witnessCrime({ x: b.maxX + 2, z: victim.position.z }, { type: 'carTheft' });
assert(!hiddenTheft.witnesses.includes(victim.id), 'ped witnessed a theft through a building');
const shot = walkers.witnessCrime(victim.position, { type: 'shot' });
assert(shot.witnesses.includes(victim.id));
console.log('PASS pedestrians: pavement corners and faces, peaceful proximity, swept strikes, temporary fleeing and blocked sightlines');

h.step(5);
assert.equal(game.peds.crimeEvents.length, 0);
h.elements.get('start-button').dispatchEvent(new Event('click'));
assert.equal(game.mode, 'play');
game.player.position.copy(game.vehicles.hero.position).add(new THREE.Vector3(1.8, 0, 0));
h.key('KeyF'); h.step(); h.key('KeyF', false);
assert.equal(game.drivenCar, game.vehicles.hero);
assert.equal(game.player.visible, false);
assert.equal(game.peds.crimeEvents.filter((event) => event.type === 'carTheft').length, 1);
game.drivenCar.position.set(-500, 12, city.z);
game.drivenCar.heading = -Math.PI / 2;
const start = game.drivenCar.position.clone();
h.key('KeyW'); h.step(60); h.key('KeyW', false);
assert(game.drivenCar.speed > 8 && game.drivenCar.position.distanceTo(start) > 3);
const rear = game.camera.position.clone().sub(game.drivenCar.position);
assert(rear.x * Math.sin(game.drivenCar.heading) + rear.z * Math.cos(game.drivenCar.heading) < 0, 'chase camera is ahead of the car');
h.key('KeyA'); h.step(5); h.key('KeyA', false);
assert(game.drivenCar.heading > -Math.PI / 2);
h.key('Space'); h.step(30); h.key('Space', false);
assert.equal(game.drivenCar.speed, 0, 'holding Space did not hold the handbrake');
h.key('KeyF'); h.step(); h.key('KeyF', false);
assert.equal(game.drivenCar, null);
assert.equal(game.player.visible, true);
assert.equal(game.player.position.y, worldModule.getGroundHeight(game.player.position));
h.key('KeyF'); h.step(); h.key('KeyF', false);
assert.equal(game.drivenCar, game.vehicles.hero);
assert.equal(game.peds.crimeEvents.filter((event) => event.type === 'carTheft').length, 1, 're-entering owned car counted as theft');
h.key('KeyF'); h.step(); h.key('KeyF', false);
const crimesBefore = game.peds.crimeEvents.length;
game.player.position.copy(game.peds.all[0].position);
h.step(600);
assert.equal(game.peds.crimeEvents.length, crimesBefore, 'standing near a pedestrian counted as crime');
h.key('KeyW'); h.step(20); h.key('KeyW', false);
assert.equal(game.peds.crimeEvents.length, crimesBefore, 'walking near a pedestrian counted as crime');
h.key('Escape'); h.step(); h.key('Escape', false);
const pausedCar = game.vehicles.traffic[0].position.clone();
h.step(30);
assert.equal(game.mode, 'paused');
assert.equal(game.vehicles.traffic[0].position.distanceTo(pausedCar), 0);
console.log('PASS main/input: F theft/exit/re-entry, W/A driving, held Space, chase camera, peaceful proximity and pause');

const frozen = await harness('?shot=play&seed=1337');
const frozenPositions = frozen.game.vehicles.all.map((vehicle) => vehicle.position.toArray().join(','));
frozen.step(10);
assert.equal(frozen.window.__shotReady, true);
assert.deepEqual(frozen.game.vehicles.all.map((vehicle) => vehicle.position.toArray().join(',')), frozenPositions);
console.log('PASS screenshot mode: actors freeze and shot readiness still works');

// Exercise the actual HTTP handler with real filesystem streams, without opening a socket.
const serverContext = createContext({ console: { log() {}, error: console.error }, process, URL });
let handleRequest;
const serverPath = resolve(root, 'serve.ts');
const serverModule = new SourceTextModule(await readFile(serverPath, 'utf8'), {
  context: serverContext, identifier: serverPath,
  initializeImportMeta(meta) { meta.url = pathToFileURL(serverPath).href; },
});
await serverModule.link(async (specifier) => {
  const exports = specifier === 'node:http' ? {
    createServer(handler) {
      handleRequest = handler;
      return { on() {}, listen(port, host, callback) { callback(); } };
    },
  } : await import(specifier);
  return new SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, { context: serverContext, identifier: specifier });
});
await serverModule.evaluate();
const paths = ['/', '/index.html', '/vendor/three.min.js',
  ...(await readdir(resolve(root, 'game/src'))).filter((name) => name.endsWith('.js')).map((name) => `/src/${name}`)];
for (const path of paths) {
  const chunks = [];
  const response = new Writable({ write(chunk, encoding, done) { chunks.push(chunk); done(); } });
  response.writeHead = (status, headers) => { response.status = status; response.headers = headers; return response; };
  const finished = new Promise((resolveFinished, reject) => { response.on('finish', resolveFinished); response.on('error', reject); });
  await handleRequest({ url: path, method: 'GET' }, response);
  await finished;
  assert.equal(response.status, 200, `HTTP handler failed for ${path}`);
  assert(Buffer.concat(chunks).length > 0);
  assert(response.headers['Content-Type'].startsWith(path.endsWith('.js') ? 'text/javascript' : 'text/html'));
  if (process.argv.includes('--http')) {
    const live = await fetch(`http://localhost:8080${path}`);
    assert.equal(live.status, 200, `live HTTP failed for ${path}`);
    await live.arrayBuffer();
  }
}
console.log(`PASS ${process.argv.includes('--http') ? 'live HTTP + ' : ''}in-process HTTP handler: 200 with correct MIME for page, vendor and all ${paths.length - 3} modules`);
