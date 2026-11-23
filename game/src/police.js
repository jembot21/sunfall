import { MAX_WANTED_STARS } from './config.js';
import { createFigure, poseWalk } from './figure.js';
import { canDrive, createVehicle, syncVehicle } from './vehicles.js';
import { struckBy } from './peds.js';
import { getGroundHeight, hasLineOfSight, isGroundPathClear, isNavigable } from './world.js';
import { createRandom } from './random.js';

const THREE = window.THREE;
const CRIMES = Object.freeze({ carTheft: 1, vehicleTheft: 1, assault: 1, pedHit: 1,
  vehicleHit: 2, shot: 1, shooting: 1, policeRam: 2, policeShot: 3, policeAssault: 2 });
export const POLICE_RULES = Object.freeze({ spawnMin: 150, spawnMax: 270, sightRange: 135,
  loseSightDelay: 16, decaySeconds: 16, bustSeconds: 3.4, despawnDistance: 145 });
export let wantedStars = 0;
let activeSystem = null;

// This entry point accepts an established crime. Callers must first establish a witness or victim.
export function reportCrime(kind, position) {
  return activeSystem?.reportCrime(kind, position) ?? false;
}

class Heap {
  items = [];
  push(item) {
    let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].f <= item.f) break;
      this.items[i] = this.items[parent];
      i = parent;
    }
    this.items[i] = item;
  }
  pop() {
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].f < this.items[child].f) child += 1;
        if (this.items[child].f >= last.f) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}

// A cached ground grid routes around footprints and across the actual bridge, never across water.
function createNavigator() {
  const cell = 4;
  const cache = new Map();
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function clear(x, z, radius) {
    const key = `${radius}:${x}:${z}`;
    if (!cache.has(key)) cache.set(key, isNavigable(x * cell, z * cell, radius));
    return cache.get(key);
  }
  function anchor(position, radius, connect) {
    const x = Math.round(position.x / cell);
    const z = Math.round(position.z / cell);
    let best = null;
    let distance = Infinity;
    for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) {
      const point = { x: (x + dx) * cell, z: (z + dz) * cell };
      const d = Math.hypot(point.x - position.x, point.z - position.z);
      if (d >= distance || !clear(x + dx, z + dz, radius)) continue;
      if (connect && !isGroundPathClear(position, point, radius)) continue;
      best = { x: x + dx, z: z + dz, key: `${x + dx}:${z + dz}` };
      distance = d;
    }
    return best;
  }
  return (from, to, radius) => {
    if (isGroundPathClear(from, to, radius)) return [new THREE.Vector3(to.x, getGroundHeight(to), to.z)];
    const start = anchor(from, radius, true);
    const end = anchor(to, radius, false);
    if (!start || !end) return [];
    const open = new Heap();
    const costs = new Map([[start.key, 0]]);
    const parents = new Map();
    const heuristic = (x, z) => Math.hypot(x - end.x, z - end.z);
    open.push({ ...start, g: 0, f: heuristic(start.x, start.z) });
    let found = false;
    for (let visited = 0; open.items.length && visited < 18000; visited += 1) {
      const current = open.pop();
      if (current.g !== costs.get(current.key)) continue;
      if (current.key === end.key) { found = true; break; }
      for (const [dx, dz] of directions) {
        const x = current.x + dx;
        const z = current.z + dz;
        if (!clear(x, z, radius)) continue;
        if (dx && dz && (!clear(current.x + dx, current.z, radius) || !clear(current.x, current.z + dz, radius))) continue;
        const key = `${x}:${z}`;
        const g = current.g + Math.hypot(dx, dz);
        if (g >= (costs.get(key) ?? Infinity)) continue;
        costs.set(key, g);
        parents.set(key, current.key);
        open.push({ x, z, key, g, f: g + heuristic(x, z) });
      }
    }
    if (!found) return [];
    const path = [];
    for (let key = end.key; key; key = parents.get(key)) {
      const [x, z] = key.split(':').map(Number);
      path.unshift(new THREE.Vector3(x * cell, getGroundHeight(x * cell, z * cell), z * cell));
    }
    if (isGroundPathClear(path[path.length - 1], to, radius)) path.push(new THREE.Vector3(to.x, getGroundHeight(to), to.z));
    const result = [];
    let previous = from;
    for (let i = 0; i < path.length;) {
      let next = path.length - 1;
      while (next > i && !isGroundPathClear(previous, path[next], radius)) next -= 1;
      if (!isGroundPathClear(previous, path[next], radius)) return [];
      result.push(path[next]);
      previous = path[next];
      i = next + 1;
    }
    return result;
  };
}

function helicopterModel() {
  const container = new THREE.Group();
  container.name = 'air-one-response';
  const model = new THREE.Group();
  model.name = 'AIR ONE';
  container.add(model);
  const paint = new THREE.MeshStandardMaterial({ color: '#172c40', metalness: 0.45, roughness: 0.45 });
  const white = new THREE.MeshStandardMaterial({ color: '#e5e9df', roughness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: '#81b7c9', metalness: 0.4, roughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: '#151c26', metalness: 0.5, roughness: 0.6 });
  function part(parent, name, size, at, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...at);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), paint);
  body.name = 'helicopter-body';
  body.scale.set(1.8, 1.6, 3.1);
  body.castShadow = true;
  model.add(body);
  part(model, 'cockpit', [2.8, 1.15, 1.6], [0, 0.25, 2.1], glass);
  part(model, 'white-belly', [2.6, 0.6, 3.8], [0, -1.1, 0.25], white);
  part(model, 'tail-boom', [0.5, 0.5, 6], [0, 0.25, -5], paint).rotation.x = -0.08;
  part(model, 'tail-fin', [0.22, 2.4, 1.4], [0, 1.1, -7.7], white).rotation.x = -0.25;
  for (const side of [-1, 1]) {
    part(model, 'landing-skid', [0.18, 0.18, 6], [side * 1.8, -2.2, 0], dark);
    for (const z of [-1.4, 1.4]) part(model, 'skid-strut', [0.15, 1.4, 0.15], [side * 1.5, -1.6, z], white).rotation.z = side * -0.4;
    part(model, 'pd-stripe', [0.08, 0.35, 3], [side * 1.77, -0.3, 0], white);
  }
  part(model, 'rotor-mast', [0.25, 1.5, 0.25], [0, 1.9, 0], dark);
  const rotor = new THREE.Group();
  rotor.name = 'main-rotor';
  rotor.position.y = 2.6;
  model.add(rotor);
  part(rotor, 'rotor-blade', [13, 0.09, 0.27], [0, 0, 0], dark);
  part(rotor, 'rotor-blade', [0.27, 0.09, 13], [0, 0, 0], dark);
  const tailRotor = new THREE.Group();
  tailRotor.name = 'tail-rotor';
  tailRotor.position.set(0.4, 0.5, -7.7);
  model.add(tailRotor);
  part(tailRotor, 'tail-blade', [0.1, 2.4, 0.16], [0, 0, 0], dark);
  part(tailRotor, 'tail-blade', [0.1, 0.16, 2.4], [0, 0, 0], dark);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#ff354f', toneMapped: false }));
  beacon.position.set(0, 2.4, -7.7);
  model.add(beacon);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), new THREE.MeshBasicMaterial({
    color: '#fff1cf', transparent: true, opacity: 0.04, side: THREE.FrontSide,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  }));
  cone.name = 'air-one-spotlight-cone';
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; float a = (1.0 - smoothstep(0.15, 1.0, r)) * 0.4; gl_FragColor = vec4(1.0, 0.9, 0.65, a); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  disc.name = 'air-one-ground-light';
  disc.rotation.x = -Math.PI / 2;
  const spotlight = new THREE.SpotLight('#fff1d3', 3, 250, 0.21, 0.8, 1);
  spotlight.name = 'air-one-spotlight';
  spotlight.target = disc;
  container.add(cone, disc, spotlight);
  return { container, model, rotor, tailRotor, cone, disc, spotlight };
}

export function createPolice({ player, vehicles, random = createRandom(), onBusted = () => {} }) {
  const group = new THREE.Group();
  group.name = 'solano-police';
  const units = [];
  const navigate = createNavigator();
  const lastCrimePosition = player.position.clone();
  let stars = 0;
  let bust = 0;
  let hiddenFor = 0;
  let decay = 0;
  let seen = false;
  let arrested = false;
  let spawnTimer = 0;
  let nextId = 1;
  let air = null;
  let pinnedStars = null;
  let airLockBlocked = false;

  function setStars(value) { stars = value; if (activeSystem === api) wantedStars = stars; }
  function register(unit) {
    Object.defineProperties(unit, {
      distanceToPlayer: { enumerable: true, get: () => unit.position.distanceTo(player.position) },
      distance: { enumerable: true, get: () => unit.position.distanceTo(player.position) },
    });
    units.push(unit);
    return unit;
  }
  function remove(unit) {
    const index = units.indexOf(unit);
    if (index !== -1) units.splice(index, 1);
    unit.mesh.visible = false;
    group.remove(unit.container ?? unit.mesh);
    if (unit.car) {
      vehicles.removeExternal(unit.car);
      for (const light of unit.car.emergencyLights) light.surface.dispose();
    }
    if (unit === air) {
      const resources = new Set();
      unit.container.traverse((object) => {
        if (object.geometry) resources.add(object.geometry);
        if (object.material) resources.add(object.material);
      });
      for (const resource of resources) resource.dispose();
      air = null;
    }
  }
  function roadSpawn() {
    const candidates = [];
    const distant = [];
    for (const edge of vehicles.network.edges) {
      const length = edge.length - vehicles.network.junctionDistance * 2;
      const projection = (player.position.x - edge.start.x) * edge.dx + (player.position.z - edge.start.z) * edge.dz;
      for (const d of [random() * length, projection - 190, projection + 190, length * 0.5]) {
        const along = THREE.MathUtils.clamp(d, 4, length - 4);
        const position = { x: edge.start.x + edge.dx * along, z: edge.start.z + edge.dz * along };
        const distance = Math.hypot(position.x - player.position.x, position.z - player.position.z);
        if (distance < POLICE_RULES.spawnMin) continue;
        if (!isNavigable(position.x, position.z, 2.7)) continue;
        if (vehicles.all.some((car) => Math.hypot(car.position.x - position.x, car.position.z - position.z) < 11)) continue;
        const candidate = { position, heading: edge.heading, distance };
        if (distance <= POLICE_RULES.spawnMax) candidates.push(candidate);
        else distant.push(candidate);
      }
    }
    // Remote marina ground can be farther from any road than the ideal spawn band.
    if (!candidates.length) candidates.push(...distant.sort((a, b) => a.distance - b.distance).slice(0, 8));
    return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
  }
  function spawnCruiser() {
    const spawn = roadSpawn();
    if (!spawn) return false;
    const car = createVehicle({ police: true, ...spawn });
    car.occupied = true;
    const unit = register({ id: `PD-${String(nextId++).padStart(2, '0')}`, kind: 'cruiser', status: 'pursuing',
      mesh: car.mesh, position: car.position, car, home: car.position.clone(), officers: [], route: [],
      routeTarget: new THREE.Vector3(Infinity, 0, Infinity), replan: 0, stuck: 0 });
    group.add(car.mesh);
    vehicles.addExternal(car);
    return unit;
  }
  function deploy(cruiser) {
    cruiser.status = 'deployed';
    cruiser.car.speed = 0;
    cruiser.car.occupied = false;
    if (cruiser.officers.length) {
      const driver = cruiser.officers[0];
      if (!units.includes(driver)) { driver.mesh.visible = true; registerAgain(driver); }
      driver.position.copy(vehicles.exitPosition(cruiser.car) ?? cruiser.position);
      driver.status = 'pursuing';
      driver.route = [];
      return;
    }
    for (let i = 0; i < 2; i += 1) {
      const figure = createFigure({ shirtColor: '#1d3047', trouserColor: '#172234',
        skinTone: i ? '#8c604b' : '#d6a67c', faceVariant: 'stern' });
      figure.name = `${cruiser.id}-${i ? 'B' : 'A'}`;
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.035),
        new THREE.MeshStandardMaterial({ color: '#f0cf7b', metalness: 0.6, roughness: 0.4 }));
      badge.name = 'officer-badge';
      badge.position.set(-0.13, 1.3, 0.18);
      figure.add(badge);
      figure.position.copy(vehicles.exitPosition(cruiser.car) ?? cruiser.position);
      if (i) {
        const x = figure.position.x + Math.sin(cruiser.car.heading) * 1.3;
        const z = figure.position.z + Math.cos(cruiser.car.heading) * 1.3;
        if (isNavigable(x, z)) figure.position.set(x, getGroundHeight(x, z), z);
      }
      group.add(figure);
      const officer = register({ id: figure.name, kind: 'officer', status: 'pursuing', mesh: figure,
        position: figure.position, cruiser, route: [], routeTarget: new THREE.Vector3(Infinity, 0, Infinity),
        replan: 0, phase: 0, stunned: 0, hitCooldown: 0 });
      cruiser.officers.push(officer);
    }
  }
  function registerAgain(unit) { units.push(unit); group.add(unit.mesh); }
  function waypoint(unit, destination, radius, delta) {
    unit.replan -= delta;
    const moved = Math.hypot(destination.x - unit.routeTarget.x, destination.z - unit.routeTarget.z);
    if (unit.replan <= 0 && (moved > 4 || !unit.route.length)) {
      unit.route = navigate(unit.position, destination, radius);
      unit.routeTarget.copy(destination);
      unit.replan = 0.65;
    }
    // The final leg always targets the current player, including after they move past a unit.
    if (isGroundPathClear(unit.position, destination, radius)) {
      unit.route = [destination.clone()];
      unit.routeTarget.copy(destination);
    }
    while (unit.route.length > 1 && Math.hypot(unit.route[0].x - unit.position.x, unit.route[0].z - unit.position.z) < 2.8) unit.route.shift();
    return unit.route[0] ?? null;
  }
  function updateCruiser(unit, delta) {
    const car = unit.car;
    car.siren = stars > 0;
    if (unit.roadblock) { car.speed = 0; syncVehicle(car, delta); return; }
    car.previousPosition.copy(car.position);
    car.previousHeading = car.heading;
    if (!stars && unit.distance > POLICE_RULES.despawnDistance) { remove(unit); return; }
    const aboard = (stars ? unit.officers.slice(0, 1) : unit.officers).every((officer) => !units.includes(officer));
    if (unit.status === 'deployed') {
      if (stars && unit.distance > 42) unit.officers[0].status = 'boarding';
      if (!aboard) { syncVehicle(car, delta); return; }
      unit.status = stars ? 'pursuing' : 'withdrawing';
      car.occupied = true;
    }
    if (stars && unit.distance < 13) { deploy(unit); syncVehicle(car, delta); return; }
    if (!stars && !aboard) { syncVehicle(car, delta); return; }
    unit.status = stars ? 'pursuing' : 'withdrawing';
    if (!stars && unit.home.distanceTo(player.position) < 150) {
      const escape = roadSpawn();
      if (escape) unit.home.set(escape.position.x, getGroundHeight(escape.position), escape.position.z);
    }
    const destination = stars ? player.position : unit.home;
    const nextTarget = waypoint(unit, destination, 2.7, delta);
    if (!nextTarget) {
      unit.stuck += delta;
      car.speed = 0;
    } else {
      const dx = nextTarget.x - car.position.x;
      const dz = nextTarget.z - car.position.z;
      const distance = Math.hypot(dx, dz);
      const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - car.heading), Math.cos(Math.atan2(dx, dz) - car.heading));
      const desiredSpeed = Math.min(stars ? 24 + stars * 2 : 12, Math.max(4, distance * 1.6)) / (1 + Math.abs(angle) * 2.5);
      car.speed = THREE.MathUtils.lerp(car.speed, desiredSpeed, 1 - Math.exp(-delta * 3));
      car.heading += THREE.MathUtils.clamp(angle, -2.5 * delta, 2.5 * delta);
      car.steerAngle = THREE.MathUtils.clamp(angle, -0.55, 0.55);
      const travel = Math.min(distance, car.speed * delta);
      const next = car.position.clone();
      next.x += Math.sin(car.heading) * travel;
      next.z += Math.cos(car.heading) * travel;
      if (travel > 0.001 && canDrive(car, next, car.heading, vehicles.all)) {
        car.position.copy(next);
        unit.stuck = 0;
      } else { car.speed *= 0.5; unit.stuck += delta; }
    }
    // Traffic or an inaccessible curb causes a real foot pursuit, never a permanent standoff.
    if (stars && unit.stuck > 1.2) { deploy(unit); unit.stuck = 0; }
    syncVehicle(car, delta);
  }
  function updateOfficer(unit, delta, drivenCar) {
    if (unit.fallen) {
      unit.fallen = Math.max(0, unit.fallen - delta);
      unit.mesh.rotation.z = Math.PI / 2;
      unit.status = 'down';
      if (!unit.fallen) { unit.health = 70; unit.mesh.rotation.z = 0; }
      return;
    }
    unit.stunned = Math.max(0, unit.stunned - delta);
    unit.hitCooldown = Math.max(0, unit.hitCooldown - delta);
    if (drivenCar && !unit.hitCooldown && struckBy(unit, drivenCar)) {
      unit.stunned = 2;
      unit.hitCooldown = 3;
      api.reportCrime('vehicleHit', unit.position);
    }
    if (!stars && unit.distance > POLICE_RULES.despawnDistance) { remove(unit); return; }
    const boarding = !stars || unit.status === 'boarding';
    unit.status = unit.stunned ? 'recovering' : boarding ? 'boarding' : 'pursuing';
    const destination = boarding ? unit.cruiser.position : player.position;
    if (boarding && unit.position.distanceTo(destination) < 3) { remove(unit); return; }
    const next = waypoint(unit, destination, 0.35, delta);
    let moving = false;
    if (next && !unit.stunned) {
      const dx = next.x - unit.position.x;
      const dz = next.z - unit.position.z;
      const distance = Math.hypot(dx, dz);
      const travel = Math.min(distance, (6.3 + stars * 0.4) * delta);
      if (distance > 0.05 && travel > 0) {
        const x = unit.position.x + dx / distance * travel;
        const z = unit.position.z + dz / distance * travel;
        if (isGroundPathClear(unit.position, { x, z }, 0.35)) {
          unit.position.set(x, getGroundHeight(x, z), z);
          const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - unit.mesh.rotation.y), Math.cos(Math.atan2(dx, dz) - unit.mesh.rotation.y));
          unit.mesh.rotation.y += angle * Math.min(1, delta * 12);
          moving = true;
        } else { unit.route = []; unit.replan = 0; }
      }
    }
    unit.phase += delta * 12;
    poseWalk(unit.mesh, unit.phase, moving ? 1 : 0);
    unit.mesh.rotation.z = unit.stunned ? 0.3 : 0;
  }
  function updateAir(delta) {
    if (!air && stars >= 3) {
      const visuals = helicopterModel();
      visuals.model.position.copy(player.position).add(new THREE.Vector3(220, 72, 140));
      air = register({ id: 'AIR ONE', kind: 'helicopter', status: 'arriving', mesh: visuals.model,
        position: visuals.model.position, ...visuals, phase: 0 });
      group.add(visuals.container);
    }
    if (!air) return;
    const unit = air;
    unit.phase += delta * 0.28;
    const destination = player.position.clone().add(stars >= 3
      ? new THREE.Vector3(Math.cos(unit.phase) * 36, 58, Math.sin(unit.phase) * 36)
      : new THREE.Vector3(380, 110, 280));
    unit.position.lerp(destination, 1 - Math.exp(-delta * 0.55));
    unit.mesh.rotation.y = Math.atan2(player.position.x - unit.position.x, player.position.z - unit.position.z);
    unit.status = stars < 3 ? 'departing' : airLockBlocked ? 'lock lost' : unit.position.distanceTo(destination) > 16 ? 'arriving' : 'tracking';
    unit.rotor.rotation.y += delta * 42;
    unit.tailRotor.rotation.x += delta * 58;
    if (!airLockBlocked) unit.disc.position.set(player.position.x, getGroundHeight(player.position) + 0.21, player.position.z);
    unit.spotlight.position.copy(unit.position).add(new THREE.Vector3(0, -1.6, 1));
    const direction = unit.disc.position.clone().sub(unit.spotlight.position);
    unit.cone.position.copy(unit.spotlight.position).addScaledVector(direction, 0.5);
    unit.cone.scale.set(7, direction.length(), 7);
    unit.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.normalize());
    unit.cone.visible = unit.disc.visible = unit.spotlight.visible = stars >= 3;
    if (stars < 3 && unit.distance > 300) remove(unit);
  }
  function canSee(unit, position, radius) {
    if (unit.kind === 'cruiser' && !unit.car.occupied) return false;
    if (unit.stunned || unit.fallen || unit.status === 'departing' || (unit.kind === 'helicopter' && airLockBlocked)) return false;
    return unit.position.distanceTo(position) < radius && hasLineOfSight(unit.position, position, unit.kind === 'helicopter' ? 0 : 1.5);
  }
  const api = {
    group, units, liveUnits: units, lastCrimePosition,
    get stars() { return stars; },
    get wantedStars() { return stars; },
    get bustProgress() { return bust; },
    get hiddenFor() { return hiddenFor; },
    get seen() { return seen; },
    get decayProgress() { return Math.min(1, Math.max(0, hiddenFor - POLICE_RULES.loseSightDelay) / POLICE_RULES.decaySeconds); },
    get state() { return arrested ? 'busted' : stars ? 'wanted' : 'clear'; },
    get helicopter() { return air; },
    canWitness(position, radius = 60) { return units.some((unit) => canSee(unit, position, radius)); },
    pinWanted(value = null) {
      pinnedStars = value === null ? null : THREE.MathUtils.clamp(Math.round(value), 0, MAX_WANTED_STARS);
      if (pinnedStars !== null) setStars(pinnedStars);
    },
    blockAirLock(value) { airLockBlocked = Boolean(value); },
    addRoadblock(position, heading = 0) {
      const car = createVehicle({ police: true, position, heading });
      car.occupied = true;
      const unit = register({ id: `TOLL-${String(nextId++).padStart(2, '0')}`, kind: 'cruiser', status: 'roadblock',
        mesh: car.mesh, position: car.position, car, roadblock: true });
      group.add(car.mesh);
      vehicles.addExternal(car);
      return unit;
    },
    removeUnit: remove,
    hitOfficer(unit, damage = 15) {
      if (unit.kind !== 'officer' || !units.includes(unit)) return false;
      unit.stunned = 1.5;
      unit.health = Math.max(0, (unit.health ?? 70) - damage);
      if (!unit.health) unit.fallen = 12;
      return true;
    },
    reportCrime(kind, position) {
      if (arrested || !CRIMES[kind] || !Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false;
      setStars(pinnedStars ?? Math.min(MAX_WANTED_STARS, stars + CRIMES[kind]));
      lastCrimePosition.set(position.x, position.y ?? getGroundHeight(position), position.z);
      hiddenFor = decay = 0;
      spawnTimer = 0;
      return true;
    },
    clearWanted() { setStars(0); bust = hiddenFor = decay = 0; seen = false; },
    reset() {
      pinnedStars = null;
      airLockBlocked = false;
      api.clearWanted();
      arrested = false;
      for (const unit of [...units]) remove(unit);
      spawnTimer = 0;
    },
    update(delta, drivenCar = null) {
      if (arrested) return;
      if (pinnedStars !== null) setStars(pinnedStars);
      spawnTimer -= delta;
      if (stars && spawnTimer <= 0 && units.filter((unit) => unit.kind === 'cruiser').length < stars + 1) {
        spawnCruiser();
        spawnTimer = 2.5;
      }
      for (const unit of [...units]) {
        if (unit.kind === 'cruiser') updateCruiser(unit, delta);
        else if (unit.kind === 'officer') updateOfficer(unit, delta, drivenCar);
      }
      updateAir(delta);
      seen = stars > 0 && units.some((unit) => canSee(unit, player.position, unit.kind === 'helicopter' ? 210 : POLICE_RULES.sightRange));
      if (stars) {
        if (seen) hiddenFor = decay = 0;
        else {
          const previousHidden = hiddenFor;
          hiddenFor += delta;
          decay += Math.max(0, hiddenFor - POLICE_RULES.loseSightDelay) - Math.max(0, previousHidden - POLICE_RULES.loseSightDelay);
          if (pinnedStars === null && decay >= POLICE_RULES.decaySeconds) { setStars(stars - 1); decay = 0; hiddenFor = POLICE_RULES.loseSightDelay; }
        }
        const close = units.some((unit) => unit.kind !== 'helicopter' && unit.status === 'pursuing'
          && canSee(unit, player.position, drivenCar ? 4.4 : 2.6));
        bust = THREE.MathUtils.clamp(bust + delta * (close ? 1 / POLICE_RULES.bustSeconds : -0.65), 0, 1);
        if (bust >= 1) {
          const arrestedStars = stars;
          arrested = true;
          setStars(0);
          seen = false;
          for (const unit of units) { unit.status = 'arrest'; if (unit.car) unit.car.speed = 0; }
          onBusted({ stars: arrestedStars });
        }
      } else bust = Math.max(0, bust - delta * 0.65);
    },
  };
  activeSystem = api;
  wantedStars = 0;
  return api;
}
