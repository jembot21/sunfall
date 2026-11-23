// Pedestrians stay on pavement loops. Only explicit violent events create witnesses.
import { createFigure, poseWalk } from './figure.js';
import { getGroundHeight, hasLineOfSight } from './world.js';
import { createRandom } from './random.js';

const THREE = window.THREE;
const SHIRTS = ['#df9775', '#688da0', '#e4c67e', '#a47797', '#70907a', '#d1c5b3', '#846e93'];
const SKINS = ['#e5b596', '#bf8b69', '#8c604b', '#674838', '#d6a67c'];
const TROUSERS = ['#303442', '#5e5b61', '#6e797c', '#5c4e48'];
const FACES = ['neutral', 'smile', 'stern', 'glasses'];
const EVENTS = new Set(['assault', 'shot', 'vehicleHit', 'carTheft']);
const clamp = THREE.MathUtils.clamp;

function pavementLoop(x0, x1, z0, z1, height = 0.17) {
  const points = [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }];
  let length = 0;
  const segments = points.map((from, index) => {
    const to = points[(index + 1) % points.length];
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const segment = { from, length: distance, start: length,
      dx: (to.x - from.x) / distance, dz: (to.z - from.z) / distance };
    length += distance;
    return segment;
  });
  return { segments, length, height };
}

function pathPose(ped) {
  const segment = ped.path.segments.find((entry) => ped.distance < entry.start + entry.length)
    ?? ped.path.segments[ped.path.segments.length - 1];
  const distance = ped.distance - segment.start;
  ped.position.set(segment.from.x + segment.dx * distance, ped.path.height,
    segment.from.z + segment.dz * distance);
  return { dx: segment.dx * ped.direction, dz: segment.dz * ped.direction };
}

export function struckBy(ped, car) {
  if (Math.abs(car.speed) < 2 || Math.abs(car.position.y - ped.position.y) > 2) return false;
  const travel = car.position.distanceTo(car.previousPosition);
  if (travel < 0.01) return false;
  const turn = Math.atan2(Math.sin(car.heading - car.previousHeading), Math.cos(car.heading - car.previousHeading));
  const steps = Math.max(1, Math.ceil(travel / 0.6));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = car.previousPosition.x + (car.position.x - car.previousPosition.x) * t;
    const z = car.previousPosition.z + (car.position.z - car.previousPosition.z) * t;
    const heading = car.previousHeading + turn * t;
    const dx = ped.position.x - x;
    const dz = ped.position.z - z;
    const across = dx * Math.cos(heading) - dz * Math.sin(heading);
    const along = dx * Math.sin(heading) + dz * Math.cos(heading);
    if (Math.abs(across) < car.spec.width / 2 + 0.28 && Math.abs(along) < car.spec.length / 2 + 0.28) return true;
  }
  return false;
}

export function createPeds(network, random = createRandom(), { count = 76 } = {}) {
  const group = new THREE.Group();
  group.name = 'solano-pedestrians';
  const all = [];
  const paths = [];
  const crimeEvents = [];
  const listeners = new Set();
  const { xs, zs } = network;
  for (let col = 0; col < xs.length - 1; col += 1) for (let row = 0; row < zs.length - 1; row += 1) {
    paths.push(pavementLoop(xs[col] + 11, xs[col + 1] - 11, zs[row] + 11, zs[row + 1] - 11));
  }
  const waterfront = pavementLoop(-15, -4, 12, 84, 0.08);
  const nearby = paths.filter((path) => path.segments[0].from.x < xs[0] + 100
    && Math.abs(path.segments[0].from.z) < 110);
  for (let index = 0; index < count; index += 1) {
    const figure = createFigure({ shirtColor: SHIRTS[index % SHIRTS.length], skinTone: SKINS[Math.floor(random() * SKINS.length)],
      trouserColor: TROUSERS[Math.floor(random() * TROUSERS.length)], faceVariant: FACES[index % FACES.length] });
    figure.name = `pedestrian-${index}`;
    const pool = index < 12 ? nearby : paths;
    const path = index < 4 ? waterfront : pool[Math.floor(random() * pool.length)];
    const ped = { id: index, figure, position: figure.position, path, distance: random() * path.length,
      direction: random() < 0.5 ? -1 : 1, speed: 0.85 + random() * 0.5,
      phase: random() * Math.PI * 2, fleeTime: 0, hitCooldown: 0, stumble: 0, threat: null, health: 60, fallen: 0 };
    // One face is immediately visible beside the player's starting street.
    if (index === 0) { ped.distance = 11 + 12; ped.direction = 1; }
    const tangent = pathPose(ped);
    figure.rotation.y = Math.atan2(tangent.dx, tangent.dz);
    figure.userData.ped = ped;
    all.push(ped);
    group.add(figure);
  }

  function flee(ped, position) {
    const tangent = pathPose(ped);
    if (tangent.dx * (ped.position.x - position.x) + tangent.dz * (ped.position.z - position.z) < 0) ped.direction *= -1;
    ped.threat = new THREE.Vector3(position.x, position.y ?? getGroundHeight(position), position.z);
    ped.fleeTime = 5 + random() * 3;
  }

  // Call only when an event really happens; proximity to the player is deliberately absent.
  function witnessCrime(position, { type = 'assault', radius = type === 'shot' ? 60 : type === 'carTheft' ? 28 : 36,
    victim = null, source = null } = {}) {
    if (!EVENTS.has(type)) return null;
    const location = new THREE.Vector3(position.x, position.y ?? getGroundHeight(position), position.z);
    const witnesses = [];
    for (const ped of all) {
      if (ped === victim || (ped.position.distanceTo(location) <= radius && hasLineOfSight(ped.position, location))) {
        flee(ped, location);
        witnesses.push(ped.id);
      }
    }
    const event = { type, position: location, witnesses, source, victim: victim?.id ?? null };
    crimeEvents.push(event);
    if (crimeEvents.length > 24) crimeEvents.shift();
    for (const listener of listeners) listener(event);
    return event;
  }

  return {
    group, all, paths, crimeEvents, witnessCrime,
    hit(ped, source, type = 'assault', damage = 15) {
      if (!all.includes(ped)) return false;
      ped.stumble = 0.5;
      ped.hitCooldown = 3;
      ped.health = Math.max(0, ped.health - damage);
      if (!ped.health) ped.fallen = 12;
      witnessCrime(ped.position, { type, victim: ped, source });
      return true;
    },
    onCrime(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    update(delta, vehicles = []) {
      for (const ped of all) {
        if (ped.fallen) {
          ped.fallen = Math.max(0, ped.fallen - delta);
          ped.figure.rotation.z = Math.PI / 2;
          if (!ped.fallen) { ped.health = 60; ped.figure.rotation.z = 0; }
          continue;
        }
        ped.fleeTime = Math.max(0, ped.fleeTime - delta);
        ped.hitCooldown = Math.max(0, ped.hitCooldown - delta);
        ped.stumble = Math.max(0, ped.stumble - delta);
        const fleeing = ped.fleeTime > 0;
        const speed = ped.stumble ? 0 : fleeing ? 3.8 : ped.speed;
        ped.distance = ((ped.distance + speed * ped.direction * delta) % ped.path.length + ped.path.length) % ped.path.length;
        const tangent = pathPose(ped);
        const heading = Math.atan2(tangent.dx, tangent.dz);
        const turn = Math.atan2(Math.sin(heading - ped.figure.rotation.y), Math.cos(heading - ped.figure.rotation.y));
        ped.figure.rotation.y += turn * Math.min(1, delta * 9);
        ped.phase += delta * (fleeing ? 13 : 6);
        poseWalk(ped.figure, ped.phase, fleeing ? 1 : 0.45);
        ped.figure.rotation.z = ped.stumble ? 0.25 : 0;
        if (!ped.hitCooldown) {
          const car = vehicles.find((vehicle) => struckBy(ped, vehicle));
          if (car) {
            ped.hitCooldown = 3;
            car.health = Math.max(0, car.health - 1);
            witnessCrime(ped.position, { type: 'vehicleHit', victim: ped, source: car });
          }
        }
      }
    },
  };
}
