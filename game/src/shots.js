import { TITLE_VIEW } from './config.js';
import { bridgeEndpoints, bridgeFinale, getGroundHeight, safehouse, world } from './world.js';
import { poseWalk } from './figure.js';
import { syncVehicle } from './vehicles.js';

export const SHOT_SEED = 5109;
export const SHOT_TIME = 6;
export const SHOT_MODES = Object.freeze(['bridge', 'face', 'drive', 'start']);

// These are camera directors for the real world and modules. main.js never advances their simulation.
export function stageShot(name, { player, camera, vehicles, peds, police, weapons, missions }) {
  const mode = SHOT_MODES.includes(name) ? name : 'start';
  police.reset();
  weapons.restore({ ownedWeapons: ['fists', 'sidearm', 'carbine'], selectedWeapon: 'carbine' });
  let drivenCar = null;
  let cash = 8450;
  function driveAt(x, z, speed, heading) {
    const car = vehicles.hero;
    car.position.set(x, getGroundHeight(x, z), z);
    car.heading = heading;
    car.previousHeading = heading;
    car.previousPosition.copy(car.position);
    car.speed = speed;
    car.occupied = car.owned = true;
    car.ai = null;
    car.health = 100;
    syncVehicle(car, 0);
    drivenCar = car;
    player.position.copy(car.position);
    player.rotation.y = heading;
    player.visible = false;
    return car;
  }
  if (mode === 'start') {
    camera.position.set(...TITLE_VIEW.position);
    camera.lookAt(...TITLE_VIEW.target);
    cash = 1250;
    weapons.restore();
  } else if (mode === 'bridge') {
    missions.restore({ missionProgress: 8 });
    missions.stageShot();
    const car = driveAt(bridgeEndpoints.city.x - 485, -98.5, 28, -Math.PI / 2);
    for (let i = 0; i < missions.blockers.length; i += 1) {
      const unit = missions.blockers[i];
      unit.position.set(car.position.x - 38, car.position.y, -96 + (i ? 2 : -4));
      unit.car.heading = 0;
      syncVehicle(unit.car, 0);
    }
    // Bring the actual gap dressing with the roadblock for this mid-span cover composition.
    world.getObjectByName('roadblock-escape-gap').position.set(car.position.x - 38, car.position.y, bridgeFinale.gapZ);
    police.update(0, car);
    for (const unit of [...police.units]) if (!unit.roadblock && unit.kind !== 'helicopter') police.removeUnit(unit);
    const air = police.helicopter;
    air.position.copy(car.position).add(new window.THREE.Vector3(-27, 17, -12));
    air.phase = 1.2;
    air.rotor.rotation.y = 0.65;
    air.tailRotor.rotation.x = 0.4;
    police.update(0, car); // Real spotlight geometry and its pool are positioned by the police module.
    camera.fov = 70;
    camera.updateProjectionMatrix();
    camera.position.set(car.position.x + 14, car.position.y + 8, car.position.z + 12);
    camera.lookAt(car.position.x - 10, car.position.y, car.position.z - 2);
  } else if (mode === 'face') {
    missions.restore({ missionProgress: 1 });
    player.position.set(-7.95, 0, 82);
    player.rotation.y = 0;
    poseWalk(player, 0, 0);
    weapons.restore();
    const cast = peds.all.slice(5, 8); // Smile, stern brows and glasses alongside the player.
    const positions = [[-9.05, 82], [-6.85, 82], [-5.75, 82]];
    for (let i = 0; i < cast.length; i += 1) {
      const ped = cast[i];
      ped.position.set(positions[i][0], 0, positions[i][1]);
      ped.figure.rotation.set(0, 0, 0);
      poseWalk(ped.figure, 0, 0);
    }
    for (const ped of peds.all) if (!cast.includes(ped) && ped.position.distanceTo(player.position) < 18) ped.figure.visible = false;
    camera.position.set(-7.4, 1.7, 86.1);
    camera.lookAt(-7.4, 1.18, 82);
  } else if (mode === 'drive') {
    missions.restore({ missionProgress: 5 });
    const car = driveAt(104, 46, 25, Math.PI);
    for (let i = 0; i < 5; i += 1) {
      const traffic = vehicles.traffic[i];
      traffic.position.set(i % 2 ? 107.2 : 100.8, 0, 20 - i * 17);
      traffic.heading = i % 2 ? Math.PI : 0;
      traffic.speed = 11 + i;
      syncVehicle(traffic, 0);
    }
    camera.position.set(car.position.x - 8, 6, car.position.z + 15);
    camera.lookAt(car.position.x, 1.4, car.position.z - 14);
  }
  return { mode: mode === 'start' ? 'title' : 'play', drivenCar, cash, elapsed: SHOT_TIME,
    hint: mode === 'bridge' ? 'W Accelerate · A/D Steer · Right-side gap ahead · F Exit at dock'
      : mode === 'face' ? 'Lucia · Jason · Solano Bay crew' : 'WASD Drive · SPACE Handbrake · F Exit',
    seed: SHOT_SEED, time: SHOT_TIME, safehouse };
}
