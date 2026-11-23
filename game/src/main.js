import { CAMERA, DEFAULT_SEED, MAX_FRAME, PLAYER, TITLE_VIEW } from './config.js';
import { createInput } from './input.js';
import { createRandom, normalizeSeed } from './random.js';
import { camera, renderer, scene, updateLighting } from './render.js';
import { bridgeEndpoints, createWorld, getGroundHeight, isNavigable, isWalkable, safehouse, updateWorld, world } from './world.js';
import { createPlayerFigure, poseWalk } from './figure.js';
import { createVehicles } from './vehicles.js';
import { createPeds } from './peds.js';
import { createPolice, reportCrime } from './police.js';
import { createHUD } from './hud.js';
import { createWeapons } from './weapons.js';
import { createMissions } from './missions.js';
import { readSave, writeSave } from './saves.js';
import { SHOT_SEED, SHOT_TIME, stageShot } from './shots.js';

const THREE = window.THREE;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const shotMode = shot !== null;
const seed = shotMode ? SHOT_SEED : normalizeSeed(params.get('seed') ?? DEFAULT_SEED);
const title = document.getElementById('start-screen');
const hud = document.getElementById('hud');
const status = document.getElementById('status');
const continueButton = document.getElementById('continue-button');
const bustedScreen = document.getElementById('busted-screen');
const bustedDetails = document.getElementById('busted-details');

scene.add(createWorld(createRandom(seed)));
const player = createPlayerFigure();
player.position.set(PLAYER.spawn.x, getGroundHeight(PLAYER.spawn.x, PLAYER.spawn.z), PLAYER.spawn.z);
player.rotation.y = Math.PI;
scene.add(player);
const vehicles = createVehicles(createRandom(`${seed}:vehicles`));
const peds = createPeds(vehicles.network, createRandom(`${seed}:peds`));
scene.add(vehicles.group, peds.group);
const police = createPolice({ player, vehicles, random: createRandom(`${seed}:police`), onBusted: beginBusted });
scene.add(police.group);
const gameHUD = createHUD();
const input = createInput(renderer.domElement);
const clock = new THREE.Clock();
const orbit = { yaw: CAMERA.yaw, pitch: CAMERA.pitch, distance: CAMERA.distance };
const target = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const movement = new THREE.Vector3();
let mode = 'title';
let verticalSpeed = 0;
let walkPhase = 0;
let walkAmount = 0;
let elapsed = 0;
let renderedFrames = 0;
let drivenCar = null;
let drivingLookYaw = 0;
let hint = '';
let hintNotice = '';
let hintUntil = 0;
let cash = 1250;
let bustedTime = 0;
let respawned = false;

const weapons = createWeapons({ scene, player, camera, peds, police,
  getCash: () => cash, spendCash: (amount) => { cash -= amount; }, onPurchase: saveGame, notice: updateHint });
const missions = createMissions({ scene, player, vehicles, police,
  onPayout: (amount) => { cash += amount; }, onSave: saveGame, notice: updateHint });
continueButton.hidden = !readSave();

function saveGame() {
  if (shotMode) return false;
  const saved = writeSave({ cash, ownedWeapons: [...weapons.owned], selectedWeapon: weapons.weapon.id,
    missionProgress: missions.progress, storyComplete: missions.storyComplete });
  continueButton.hidden = !saved;
  if (!saved) updateHint('Browser storage unavailable · Progress lasts for this session');
  return saved;
}

// Ambient traffic does not raise the player's wanted level; victims and observers establish crimes.
peds.onCrime((event) => {
  if (!event.source || (event.source !== player && event.source !== drivenCar)) return;
  const witnessed = event.witnesses.length > 0 || police.canWitness(event.position, event.type === 'carTheft' ? 28 : 60);
  if (event.victim !== null || witnessed) reportCrime(event.type, event.position);
});
vehicles.onCollision((event) => {
  if (event.vehicle !== drivenCar) return;
  missions.collide(event);
  if (event.other.spec.police && event.speed >= 4) reportCrime('policeRam', event.position);
});

function beginBusted({ stars }) {
  mode = 'busted';
  bustedTime = 0;
  respawned = false;
  const penalty = Math.min(cash, 75 + stars * 15);
  cash -= penalty;
  missions.fail('Busted. The job can be retried at the safehouse.');
  saveGame();
  if (drivenCar) drivenCar.speed = 0;
  input.reset();
  weapons.reset();
  bustedScreen.hidden = false;
  bustedScreen.style.opacity = '0';
  bustedDetails.textContent = `$${penalty} booking fee · Returning to Palma Strand safehouse`;
  status.textContent = `Busted. $${penalty} deducted. Returning to Palma Strand safehouse.`;
}

function updateBusted(delta) {
  bustedTime += delta;
  bustedScreen.style.opacity = String(bustedTime < 1.2 ? bustedTime / 1.2 : bustedTime < 2.8 ? 1 : Math.max(0, 1 - (bustedTime - 2.8)));
  if (bustedTime >= 1.3 && !respawned) {
    if (drivenCar) { drivenCar.occupied = false; drivenCar.speed = 0; }
    drivenCar = null;
    player.visible = true;
    player.position.set(safehouse.x, getGroundHeight(safehouse), safehouse.z);
    player.rotation.y = Math.PI / 2;
    verticalSpeed = walkAmount = 0;
    poseWalk(player, 0, 0);
    orbit.yaw = CAMERA.yaw;
    police.reset();
    followCamera(0, true);
    respawned = true;
  }
  if (bustedTime >= 3.8) {
    mode = 'play';
    bustedScreen.hidden = true;
    input.reset();
    updateHint('Palma Strand safehouse · Wanted cleared');
    status.textContent = 'Back at Palma Strand safehouse. Wanted cleared.';
  }
}

function updateHint(message = '') {
  if (message) { hintNotice = message; hintUntil = elapsed + 5; }
  if (elapsed >= hintUntil) hintNotice = '';
  const near = drivenCar ? null : vehicles.nearest(player.position);
  const nearSafehouse = !drivenCar && Math.hypot(player.position.x - safehouse.x, player.position.z - safehouse.z) < 5;
  const shop = !drivenCar && weapons.nearShop;
  hint = hintNotice || (nearSafehouse && !missions.active ? `E · Start ${missions.name}` : shop
    ? `${shop.name} · 2 / 3 Preview · Walk into the green marker to buy`
    : drivenCar ? 'WASD Drive · SPACE Handbrake · F Exit'
      : near ? `F · Enter ${near.spec.name}` : 'WASD Walk · SHIFT Sprint · SPACE Jump · F Enter car · E at safehouse');
}

function interactWithCar() {
  if (drivenCar) {
    const exit = vehicles.exitPosition(drivenCar);
    if (!exit) { updateHint('Exit blocked · Move the car to a clear spot'); return; }
    orbit.yaw = drivenCar.heading + Math.PI + drivingLookYaw;
    drivenCar.occupied = false;
    drivenCar.speed = 0;
    player.position.copy(exit);
    player.rotation.y = drivenCar.heading;
    player.visible = true;
    drivenCar = null;
    verticalSpeed = walkAmount = 0;
    poseWalk(player, 0, 0);
    status.textContent = 'On foot. Press F near a car to enter.';
  } else {
    const car = vehicles.nearest(player.position);
    if (!car) return;
    drivenCar = car;
    car.ai = null;
    car.occupied = true;
    car.speed = 0;
    player.visible = false;
    player.position.copy(car.position);
    drivingLookYaw = 0;
    if (!car.owned) {
      car.owned = true;
      peds.witnessCrime(car.position, { type: 'carTheft', source: car });
    }
    status.textContent = `Driving ${car.spec.name}. W accelerates, S brakes and reverses, A/D steer, Space handbrakes, F exits.`;
  }
  hintNotice = '';
  updateHint();
}

function updateOnFoot(controls, delta) {
  movement.set(controls.moveX * Math.cos(orbit.yaw) + controls.moveZ * Math.sin(orbit.yaw), 0,
    -controls.moveX * Math.sin(orbit.yaw) + controls.moveZ * Math.cos(orbit.yaw));
  const moving = movement.lengthSq() > 0;
  const grounded = player.position.y <= getGroundHeight(player.position) + 0.01;
  if (moving) {
    movement.normalize();
    const speed = controls.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const nextX = player.position.x + movement.x * speed * delta;
    const nextZ = player.position.z + movement.z * speed * delta;
    if (isNavigable(nextX, player.position.z, PLAYER.radius)) player.position.x = nextX;
    if (isNavigable(player.position.x, nextZ, PLAYER.radius)) player.position.z = nextZ;
    const facing = Math.atan2(movement.x, movement.z);
    const turn = Math.atan2(Math.sin(facing - player.rotation.y), Math.cos(facing - player.rotation.y));
    player.rotation.y += turn * Math.min(1, delta * 12);
    walkPhase += delta * (controls.sprint ? 14 : 9);
  }
  const groundY = getGroundHeight(player.position);
  if (grounded) { player.position.y = groundY; verticalSpeed = controls.jump ? PLAYER.jumpSpeed : 0; }
  verticalSpeed -= PLAYER.gravity * delta;
  player.position.y = Math.max(groundY, player.position.y + verticalSpeed * delta);
  if (player.position.y <= groundY) verticalSpeed = 0;
  walkAmount = THREE.MathUtils.lerp(walkAmount, moving ? 1 : 0, Math.min(1, delta * 12));
  poseWalk(player, walkPhase, walkAmount);
}

function followCamera(delta, snap = false) {
  target.copy(player.position).y += drivenCar ? 1.1 : CAMERA.targetHeight;
  const distance = drivenCar ? 12 + Math.min(4, Math.abs(drivenCar.speed) * 0.12) : orbit.distance;
  const yaw = drivenCar ? drivenCar.heading + Math.PI + drivingLookYaw : orbit.yaw;
  const pitch = drivenCar ? Math.max(0.28, orbit.pitch) : orbit.pitch;
  const horizontal = Math.cos(pitch) * distance;
  desiredCamera.set(target.x + Math.sin(yaw) * horizontal, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * horizontal);
  if (snap) camera.position.copy(desiredCamera);
  else camera.position.lerp(desiredCamera, 1 - Math.exp(-CAMERA.followSpeed * delta));
  camera.position.y = Math.max(camera.position.y, getGroundHeight(camera.position) + 0.5);
  camera.lookAt(target);
}

function startGame(continued = false) {
  if (shotMode) return;
  const save = continued ? readSave() : null;
  if (continued && !save) return;
  // Restore ownership before showing HUD or accepting input, including a purchased carbine.
  weapons.restore(save ?? {});
  missions.restore(save ?? {});
  cash = save?.cash ?? 1250;
  police.reset();
  const spawn = continued ? safehouse : PLAYER.spawn;
  player.position.set(spawn.x, getGroundHeight(spawn), spawn.z);
  mode = 'play';
  title.hidden = true;
  hud.hidden = false;
  input.reset();
  clock.getDelta();
  followCamera(0, true);
  renderer.domElement.focus({ preventScroll: true });
  updateHint(continued ? 'Progress restored · Owned weapons ready · E at safehouse for your next job' : 'Dre’s first job · Walk west to the green safehouse marker, then press E');
  status.textContent = 'Playing Sunfall. WASD walk, F for cars, click to attack, 1/2/3 weapons, E at the safehouse for story jobs.';
}
document.getElementById('start-button').addEventListener('click', () => startGame(false));
continueButton.addEventListener('click', () => startGame(true));

function setPaused(paused) {
  mode = paused ? 'paused' : 'play';
  input.reset();
  status.textContent = paused ? 'Paused. Press Escape to resume.' : 'Playing Sunfall.';
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play' && !shotMode) setPaused(true);
});
camera.position.set(...TITLE_VIEW.position);
camera.lookAt(...TITLE_VIEW.target);
status.textContent = 'Sunfall. Start a new story or Continue your saved progress.';
if (shotMode) {
  window.__shotReady = false;
  const staged = stageShot(shot, { player, camera, vehicles, peds, police, weapons, missions });
  mode = staged.mode;
  drivenCar = staged.drivenCar;
  cash = staged.cash;
  elapsed = staged.elapsed;
  hint = staged.hint;
  title.hidden = mode !== 'title';
  title.style.pointerEvents = 'none';
  hud.hidden = mode === 'title';
  continueButton.hidden = true; // A saved browser profile cannot change a deterministic title capture.
}

// Inspection hooks exercise the same game modules and rules as the browser controls.
window.__sunfall = {
  scene, camera, renderer, player, world, seed, shot, input, orbit, vehicles, peds, police, weapons, missions,
  combat: weapons, getGroundHeight, isWalkable, isNavigable, bridgeEndpoints, safehouse, reportCrime, saveGame,
  witnessCrime: (position, event = {}) => peds.witnessCrime(position, { ...event, source: event.source ?? player }),
  get cash() { return cash; },
  get drivenCar() { return drivenCar; },
  get mode() { return mode; },
  get elapsed() { return elapsed; },
};

function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), MAX_FRAME);
  const controls = input.poll();
  if (!shotMode) {
    if (controls.pause && (mode === 'play' || mode === 'paused')) setPaused(mode === 'play');
    if (mode !== 'paused') elapsed += delta;
    if (mode === 'play') {
      if (controls.interact && !missions.interact(drivenCar)) interactWithCar();
      if (drivenCar) {
        drivingLookYaw -= controls.orbit.yaw * CAMERA.sensitivity;
        if (!controls.orbit.yaw) drivingLookYaw *= Math.exp(-delta * 1.8);
      } else orbit.yaw -= controls.orbit.yaw * CAMERA.sensitivity;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + controls.orbit.pitch * CAMERA.sensitivity, CAMERA.minPitch, CAMERA.maxPitch);
      orbit.distance = THREE.MathUtils.clamp(orbit.distance + controls.orbit.zoom, CAMERA.minDistance, CAMERA.maxDistance);
      vehicles.update(delta, drivenCar, { throttle: -controls.moveZ, steering: controls.moveX, handbrake: input.isDown('Space') });
      if (drivenCar) player.position.copy(drivenCar.position);
      else updateOnFoot(controls, delta);
      missions.update(delta, drivenCar);
      police.update(delta, drivenCar);
      peds.update(delta, vehicles.all);
      if (mode === 'play') weapons.update(delta, controls, drivenCar);
      updateHint();
      followCamera(delta);
    } else if (mode === 'busted') updateBusted(delta);
    else if (mode === 'title') { vehicles.update(delta); peds.update(delta, vehicles.all); }
  }
  gameHUD.update({ player, police, cash, weapons, missions, drivenCar, elapsed, mode, hint });
  updateWorld(shotMode ? SHOT_TIME : elapsed);
  updateLighting(player.position);
  renderer.render(scene, camera);
  renderedFrames += 1;
  if (shotMode && renderedFrames >= 2) window.__shotReady = true;
}
requestAnimationFrame(frame);
