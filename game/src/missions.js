import { STORY_MISSION_COUNT } from './config.js';
import { bridgeEndpoints, bridgeFinale, getGroundHeight, marinaDock, rooftopLookout, safehouse } from './world.js';
import { createVehicle, syncVehicle } from './vehicles.js';
import { createFigure } from './figure.js';

const THREE = window.THREE;
const point = (x, z, y = getGroundHeight(x, z)) => ({ x, y, z });
const job = (kind, objective, at, extra = {}) => ({ kind, objective, at, radius: 10, ...extra });
export const FINALE = Object.freeze({
  ...bridgeFinale,
  seconds: 180,
});
export const STORY_MISSIONS = Object.freeze([
  { name: 'BORROWED SUN', payout: 650, speaker: 'Lucia', line: 'Clean delivery. Dre knows we can drive.', stages: [
    job('deliver', 'Lucia: take any car to the Old Market garage; slow down in the gold marker.', point(392, 96)),
    job('reach', 'Jason: leave the car and meet the contact on the pavement.', point(392, 108), { onFoot: true, radius: 4 }),
  ] },
  { name: 'HIGH TIDE', payout: 750, speaker: 'Jason', line: 'Port cameras mapped. The boathouse roof has the best view.', stages: [
    job('reach', 'Jason: reach the boathouse ramp on Palma Strand, on foot.', point(-9, 113), { onFoot: true, radius: 4 }),
    job('reach', 'Walk up the ramp to the rooftop lookout.', rooftopLookout, { onFoot: true, radius: 4, elevated: true }),
  ] },
  { name: 'QUIET COMPANY', payout: 950, speaker: 'Dre', line: 'That van leads straight to Solano cargo. Keep it quiet.', stages: [
    job('reach', 'Lucia: bring a car to the white cargo van in Palma Strand.', point(203, 96), { driving: true, radius: 22 }),
    job('tail', 'Tail the white van north to Port Solano. Stay 8–65 metres behind it.', point(203, -264)),
  ] },
  { name: 'DOCK RECEIPTS', payout: 1100, speaker: 'Dre', line: 'Three packages, no questions. Our boat fund is growing.', stages: [
    job('collect', 'Dre: collect the first package on foot at Port Solano.', point(8, -384), { radius: 4 }),
    job('collect', 'Collect the warehouse package.', point(104, -480), { radius: 4 }),
    job('collect', 'Collect the last manifest beside the port road.', point(200, -384), { radius: 4 }),
  ] },
  { name: 'RUNWAY WINDOW', payout: 1400, speaker: 'Lucia', line: 'Airstrip handoff made with time to spare.', stages: [
    job('reach', 'Lucia: bring a car to the start marker in Airstrip Heights.', point(296, -288), { driving: true }),
    job('timed', 'Reach the airstrip service gate before the 75-second window closes.', point(488, -480), { seconds: 75 }),
  ] },
  { name: 'SALT MONEY', payout: 1300, speaker: 'Jason', line: 'Marina contact paid up. Dre has a way off the island.', stages: [
    job('collect', 'Jason: pick up the marina envelope on foot.', point(104, 288), { radius: 4 }),
    job('deliver', 'Lucia: drive the envelope to the southern Marina District handoff.', point(200, 480)),
  ] },
  { name: 'FLAT OUT', payout: 1600, speaker: 'Dre', line: 'The Flats stash is ours. One more scout, then we leave.', stages: [
    job('collect', 'Dre: collect the first stash in The Flats on foot.', point(392, 288), { radius: 4 }),
    job('collect', 'Collect the repair-yard stash.', point(488, 384), { radius: 4 }),
    job('deliver', 'Lucia: deliver the stash in any car to the southern Flats garage.', point(392, 480)),
  ] },
  { name: 'BEFORE THE STORM', payout: 1800, speaker: 'Dre', line: 'Toll canopy blinds AIR ONE. Keep right at the spikes. I will be at the boat.', stages: [
    job('reach', 'Lucia: scout the Bay Bridge approach in a car.', point(8, -96), { driving: true }),
    job('reach', 'Scout the first bridge pier. Note the toll canopy ahead.', point(bridgeEndpoints.city.x - 110, -96), { driving: true }),
    job('reach', 'Return to the Palma Strand safehouse for Dre’s final call.', safehouse, { onFoot: true, radius: 5 }),
  ] },
  { name: 'LAST WAVE', payout: 6000, speaker: 'Dre', line: 'Engine off. You made it. Solano Bay is behind us.', stages: [
    job('gantry', 'Lucia: cross the bridge. Drive under the toll gantry to break AIR ONE’s lock.', point(FINALE.tollX - 3, -96)),
    job('spikes', 'Jason: take the marked RIGHT gap through the toll spike strip.', point(FINALE.spikeX - 4, FINALE.gapZ)),
    job('roadblock', 'Lucia: ram the two cruisers at 60+ km/h, or slip through the marked right-side gap.', point(FINALE.roadblockX - 10, -86)),
    job('boat', 'Dre: reach the marina dock, leave the car, and walk to my boat before lockdown.', marinaDock, { radius: 5 }),
  ] },
]);

export function createMissions({ scene, player, vehicles, police, onPayout, onSave, notice }) {
  const group = new THREE.Group();
  group.name = 'story-missions';
  scene.add(group);
  const gold = new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.65 });
  const green = new THREE.MeshBasicMaterial({ color: '#95e2c2', transparent: true, opacity: 0.65 });
  const markerMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.08, 48), gold);
  markerMesh.name = 'mission-objective-marker';
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 6, 8), gold);
  const safeMarker = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.6, 40), green);
  safeMarker.rotation.x = -Math.PI / 2;
  safeMarker.position.set(safehouse.x, 0.14, safehouse.z);
  safeMarker.name = 'safehouse-story-start';
  group.add(markerMesh, beacon, safeMarker);

  // Real walking surfaces, matching world.js heights, make the lookout reachable without a teleport.
  const concrete = new THREE.MeshStandardMaterial({ color: '#aaa58f', roughness: 0.85 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 20), concrete);
  roof.position.set(-9, 4.85, 145);
  roof.name = 'boathouse-rooftop-lookout';
  group.add(roof);
  for (const x of [-16, -2]) for (const z of [137, 153]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), concrete);
    post.position.set(x, 2.5, z);
    group.add(post);
  }
  const rampGeometry = new THREE.BoxGeometry(16, 0.2, 23);
  const vertices = rampGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i += 1) vertices.setY(i, vertices.getY(i) + (vertices.getZ(i) + 11.5) / 23 * 5);
  rampGeometry.computeVertexNormals();
  const ramp = new THREE.Mesh(rampGeometry, concrete);
  ramp.position.set(-9, -0.1, 123.5);
  ramp.name = 'lookout-access-ramp';
  group.add(ramp);

  const finaleGroup = new THREE.Group();
  finaleGroup.name = 'last-wave-obstacles';
  finaleGroup.visible = false;
  group.add(finaleGroup);
  const dre = createFigure({ shirtColor: '#5f9287', skinTone: '#674838', faceVariant: 'glasses' });
  dre.name = 'Dre-at-boat';
  dre.position.set(marinaDock.x + 1.5, marinaDock.y, marinaDock.z);
  dre.rotation.y = -Math.PI / 2;
  finaleGroup.add(dre);

  let progress = 0;
  let storyComplete = false;
  let active = null;
  let timer = null;
  let lock = 1;
  let lockLostFor = 0;
  let tyresDamaged = false;
  let banner = '';
  let bannerTime = 0;
  let dialogue = 'Dre: meet me at the green safehouse marker. Press E to take a job.';
  let dialogueTime = 14;
  let tailProgress = 0;
  let van = null;
  const blockers = [];
  const slowedCars = new Set();
  const lastPosition = player.position.clone();

  function announce(text, line) {
    banner = text;
    bannerTime = 5;
    if (line) { dialogue = line; dialogueTime = 12; }
  }
  function cleanup() {
    for (const unit of blockers.splice(0)) if (police.units.includes(unit)) police.removeUnit(unit);
    for (const car of slowedCars) delete car.missionSpeedLimit;
    slowedCars.clear();
    if (van) { group.remove(van.mesh); vehicles.removeExternal(van); van = null; }
    finaleGroup.visible = false;
    police.pinWanted(null);
    police.blockAirLock(false);
    timer = null;
  }
  function updateMarker() {
    const at = active ? activeStage().kind === 'tail' && van ? van.position : activeStage().at : safehouse;
    markerMesh.position.set(at.x, getGroundHeight(at.x, at.z) + 0.16, at.z);
    if (activeStage()?.elevated) markerMesh.position.y = at.y + 0.16;
    beacon.position.copy(markerMesh.position).y += 3;
    markerMesh.material = active ? gold : green;
    beacon.material = markerMesh.material;
  }
  function activeMission() { return active && STORY_MISSIONS[active.index]; }
  function activeStage() { return activeMission()?.stages[active.stage]; }
  function enterStage() {
    const stage = activeStage();
    if (stage.kind === 'timed') timer = stage.seconds;
    if (stage.kind === 'tail') { tailProgress = 0; van.speed = 10; }
    announce(`${api.name} · ${active.stage + 1}/${activeMission().stages.length}`, stage.objective);
    updateMarker();
  }
  function start(index = progress >= STORY_MISSION_COUNT ? 8 : progress) {
    if (active || index < 0 || index >= STORY_MISSION_COUNT) return false;
    cleanup();
    active = { index, stage: 0, replay: storyComplete && index === 8 };
    lock = 1;
    lockLostFor = 0;
    tyresDamaged = false;
    lastPosition.copy(player.position);
    if (index === 2) {
      van = createVehicle({ style: 'van', colour: '#e5dfcf', position: point(203, 96), heading: Math.PI });
      van.occupied = true;
      van.policeControlled = true; // Mission owns movement, so ambient traffic leaves it alone.
      van.mesh.name = 'quiet-company-van';
      vehicles.addExternal(van);
      group.add(van.mesh);
    }
    if (index === 8) {
      timer = FINALE.seconds;
      finaleGroup.visible = true;
      police.pinWanted(4);
      for (const offset of [-4, 2]) blockers.push(police.addRoadblock(point(FINALE.roadblockX, -96 + offset)));
      // A serviceable getaway car is always available at the safehouse for a new attempt.
      if (!vehicles.hero.occupied) {
        vehicles.hero.position.set(1.5, 0, 24);
        vehicles.hero.heading = Math.PI;
        vehicles.hero.health = 100;
        vehicles.hero.owned = true;
        vehicles.hero.speed = 0;
        syncVehicle(vehicles.hero, 0);
      }
    }
    enterStage();
    return true;
  }
  function finishStage() {
    active.stage += 1;
    if (active.stage < activeMission().stages.length) { enterStage(); return; }
    const mission = activeMission();
    const completedName = api.name;
    const finale = active.index === 8;
    progress = Math.max(progress, active.index + 1);
    if (finale) storyComplete = true;
    active = null;
    cleanup();
    if (finale) police.reset();
    onPayout(mission.payout);
    onSave();
    announce(`${completedName} COMPLETE · +$${mission.payout.toLocaleString('en-US')}`,
      `${mission.speaker}: ${mission.line}${finale ? ' STORY COMPLETE · Bridge Run is now available at the safehouse.' : ' Next job: Palma Strand safehouse.'}`);
    updateMarker();
  }
  function fail(reason = 'Job interrupted. Return to the safehouse to retry.') {
    if (!active) return;
    active = null;
    cleanup();
    announce('MISSION FAILED', `Dre: ${reason}`);
    updateMarker();
  }
  function crossed(x) {
    if (!(lastPosition.x > x && player.position.x <= x)) return null;
    const t = (lastPosition.x - x) / Math.max(0.001, lastPosition.x - player.position.x);
    const z = THREE.MathUtils.lerp(lastPosition.z, player.position.z, t);
    return Math.abs(z + 96) <= 13 ? z : null;
  }

  const api = {
    group, start, fail, blockers, finaleGroup,
    get progress() { return progress; },
    get storyComplete() { return storyComplete; },
    get active() { return active; },
    get stage() { return activeStage(); },
    get name() { return active ? active.replay ? 'Bridge Run' : activeMission().name : storyComplete ? 'Bridge Run' : STORY_MISSIONS[progress]?.name ?? 'Sunfall'; },
    get objective() {
      if (!active) return 'Return to Palma Strand safehouse · E to start ' + (storyComplete ? 'Bridge Run' : `job ${progress + 1}/9`);
      const suffix = timer !== null ? ` · ${Math.max(0, Math.ceil(timer))}s` : activeStage().kind === 'tail' ? ` · ${Math.floor(tailProgress / 18 * 100)}%` : '';
      return activeStage().objective + suffix;
    },
    get marker() { return activeStage()?.kind === 'tail' && van ? van.position : activeStage()?.at ?? safehouse; },
    get banner() { return bannerTime > 0 ? banner : ''; },
    get dialogue() { return dialogueTime > 0 ? dialogue : ''; },
    get timer() { return timer; },
    get lock() { return lock; },
    get tyresDamaged() { return tyresDamaged; },
    get isFinale() { return active?.index === 8; },
    get crew() {
      return { Lucia: 'READY', Jason: api.isFinale && active.stage === 0 ? 'ON CALL' : 'READY',
        Dre: api.isFinale && active.stage >= 2 ? 'WAITING AT BOAT' : 'ON CALL' };
    },
    interact(drivenCar) {
      if (active || drivenCar || player.position.distanceTo(new THREE.Vector3(safehouse.x, 0, safehouse.z)) > 5) return false;
      return start();
    },
    restore(save = {}) {
      active = null;
      cleanup();
      progress = Math.max(0, Math.min(9, save.missionProgress ?? 0));
      storyComplete = save.storyComplete === true || progress === 9;
      if (storyComplete) progress = 9;
      updateMarker();
    },
    collide(event) {
      if (!api.isFinale || event.speed < 60 / 3.6 || !blockers.some((unit) => unit.car === event.other)) return;
      for (let i = 0; i < blockers.length; i += 1) {
        const unit = blockers[i];
        unit.position.x = FINALE.roadblockX + 12;
        unit.position.z = -96 + (i ? 9 : -9);
        unit.car.roadblockCleared = true;
        unit.status = 'rammed';
        syncVehicle(unit.car, 0);
      }
      notice('Roadblock breached · Keep driving to Dre’s dock');
    },
    stageShot() {
      start(8);
      active.stage = 2;
      lock = 0.72;
      timer = 92;
      enterStage();
      announce('09 / LAST WAVE', 'Jason: AIR ONE has us. Keep your speed up; Dre is waiting at the boat.');
    },
    update(delta, drivenCar) {
      bannerTime = Math.max(0, bannerTime - delta);
      dialogueTime = Math.max(0, dialogueTime - delta);
      if (!active) { updateMarker(); lastPosition.copy(player.position); return; }
      if (timer !== null) {
        timer = Math.max(0, timer - delta);
        if (!timer) { fail('Lockdown closed the route. Return to the safehouse for another attempt.'); return; }
      }
      if (api.isFinale) {
        lockLostFor = Math.max(0, lockLostFor - delta);
        const underCanopy = Math.abs(player.position.x - FINALE.tollX) < 7 && Math.abs(player.position.z + 96) < 13;
        if (underCanopy) { lock = 0; lockLostFor = 8; }
        else if (lockLostFor > 0) lock = 0;
        else lock = Math.min(1, lock + delta * 0.15);
        police.blockAirLock(underCanopy || lockLostFor > 0);
        if (tyresDamaged && drivenCar) {
          drivenCar.missionSpeedLimit = 14;
          slowedCars.add(drivenCar);
          drivenCar.speed = THREE.MathUtils.clamp(drivenCar.speed, -14, 14);
        }
      }
      const stage = activeStage();
      const distance = Math.hypot(player.position.x - stage.at.x, player.position.z - stage.at.z);
      if (stage.kind === 'tail') {
        // The van pauses if the player falls behind: a short, playable tail instead of an unwinnable chase.
        const behind = player.position.z - van.position.z;
        const separation = player.position.distanceTo(van.position);
        if (drivenCar && behind > 8 && separation < 65) tailProgress = Math.min(18, tailProgress + delta);
        if (drivenCar && separation < 65 && behind > 8 && van.position.z > -264) van.position.z = Math.max(-264, van.position.z - delta * 10);
        van.speed = drivenCar && behind > 8 && separation < 65 && van.position.z > -264 ? 10 : 0;
        syncVehicle(van, delta);
        if (tailProgress >= 18 && van.position.z <= -263) finishStage();
      } else if (stage.kind === 'gantry') {
        if (drivenCar && crossed(FINALE.tollX - 3) !== null) {
          lock = 0;
          lockLostFor = 8;
          police.blockAirLock(true);
          finishStage();
          notice('TOLL CANOPY · AIR ONE LOCK BROKEN');
        }
      } else if (stage.kind === 'spikes') {
        const crossZ = drivenCar && crossed(FINALE.spikeX);
        if (crossZ !== null && crossZ !== false) {
          const clearance = FINALE.gapWidth / 2 - drivenCar.spec.width / 2 - 0.1;
          if (Math.abs(crossZ - FINALE.gapZ) > clearance) {
            tyresDamaged = true;
            drivenCar.missionSpeedLimit = 14;
            slowedCars.add(drivenCar);
            drivenCar.speed = Math.min(drivenCar.speed, 14);
            notice('SPIKES HIT · Tyres damaged · 50 km/h limit for the rest of this mission');
          } else notice('Spike strip cleared through the marked gap');
          finishStage();
        }
      } else if (stage.kind === 'roadblock') {
        if (drivenCar && crossed(FINALE.roadblockX - 10) !== null) finishStage();
      } else if (stage.kind === 'boat') {
        if (!drivenCar && distance <= stage.radius && Math.abs(player.position.y - marinaDock.y) < 2) finishStage();
      } else if (stage.kind === 'deliver' || stage.kind === 'timed') {
        if (drivenCar && distance <= stage.radius && Math.abs(drivenCar.speed) < 7) finishStage();
      } else if (stage.kind === 'collect' || stage.kind === 'reach') {
        if (distance <= stage.radius && (!stage.onFoot && stage.kind !== 'collect' || !drivenCar)
          && (!stage.driving || drivenCar) && (!stage.elevated || Math.abs(player.position.y - stage.at.y) < 1)) finishStage();
      }
      updateMarker();
      lastPosition.copy(player.position);
    },
  };
  updateMarker();
  return api;
}
