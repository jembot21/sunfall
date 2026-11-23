// Cars face local +Z. Traffic uses directed lane segments and tangent-aligned junction curves.
import { buildingBounds, bridge, getGroundHeight, isOnBridge, isWalkable, roads } from './world.js';
import { createRandom } from './random.js';

const THREE = window.THREE;
const cube = new THREE.BoxGeometry(1, 1, 1);
const tyreGeometry = new THREE.CylinderGeometry(0.37, 0.37, 0.24, 12);
const hubGeometry = new THREE.CylinderGeometry(0.21, 0.21, 0.255, 8);
const materials = new Map();
const LANE = 3.3;
const JUNCTION = 10;
const COLOURS = ['#bc543f', '#dfb85d', '#488a91', '#657b59', '#d3ccc0', '#394253', '#8d647c'];
const clamp = THREE.MathUtils.clamp;

export const VEHICLE_SPECS = Object.freeze({
  sedan: Object.freeze({ name: 'Solano Sedan', style: 'sedan', width: 1.9, length: 4.5, wheelbase: 2.7,
    topSpeed: 31, acceleration: 9, reverseSpeed: 9 }),
  pickup: Object.freeze({ name: 'Mesa Pickup', style: 'pickup', width: 2.05, length: 4.9, wheelbase: 3,
    topSpeed: 27, acceleration: 7.5, reverseSpeed: 8 }),
  van: Object.freeze({ name: 'Port Courier', style: 'van', width: 2.1, length: 5, wheelbase: 3,
    topSpeed: 24, acceleration: 6.5, reverseSpeed: 7 }),
});
export const HERO_SPEC = Object.freeze({ ...VEHICLE_SPECS.sedan, name: 'Sunfall GT', hero: true,
  topSpeed: 42, acceleration: 12, reverseSpeed: 11 });
export const POLICE_SPEC = Object.freeze({ ...VEHICLE_SPECS.sedan, name: 'Solano PD Cruiser', police: true,
  topSpeed: 37, acceleration: 11, reverseSpeed: 10 });

function material(colour, metalness = 0) {
  const key = `${colour}:${metalness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
    color: new THREE.Color(colour).convertSRGBToLinear(), metalness, roughness: metalness ? 0.38 : 0.8,
  }));
  return materials.get(key);
}

function box(parent, name, size, at, surface) {
  const mesh = new THREE.Mesh(cube, surface);
  mesh.name = name;
  mesh.scale.set(...size);
  mesh.position.set(...at);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createVehicle({ style = 'sedan', colour = COLOURS[0], hero = false, police = false,
  position = { x: 0, z: 0 }, heading = 0 } = {}) {
  const spec = police ? POLICE_SPEC : hero ? HERO_SPEC : VEHICLE_SPECS[style] ?? VEHICLE_SPECS.sedan;
  const mesh = new THREE.Group();
  mesh.name = spec.name;
  mesh.rotation.order = 'YXZ';
  const paint = hero ? new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colour).convertSRGBToLinear(), metalness: 0.16, roughness: 0.34,
    clearcoat: 0.85, clearcoatRoughness: 0.24,
  }) : material(police ? '#162432' : colour, 0.32);
  const trim = material('#252a32');
  const chrome = material('#aaaeb4', 0.7);
  const glass = material(hero ? '#547b8b' : '#324958', hero ? 0.18 : 0.35);
  const white = new THREE.MeshStandardMaterial({ color: '#ffe9b6', emissive: '#ffe3a3', emissiveIntensity: 0.8 });
  const brakeMaterial = new THREE.MeshStandardMaterial({ color: '#b31c28', emissive: '#ff2634', emissiveIntensity: 0.25 });
  const { width: w, length: l, wheelbase } = spec;
  box(mesh, 'chassis', [w * 0.92, 0.22, l * 0.92], [0, 0.45, 0], trim);
  box(mesh, 'body', [w, 0.62, l], [0, 0.83, 0], paint);
  const cabinZ = spec.style === 'pickup' ? 0.38 : -0.22;
  const cabinLength = spec.style === 'van' ? 3.8 : spec.style === 'pickup' ? 1.8 : 2.25;
  const cabinHeight = spec.style === 'van' ? 1.25 : 0.68;
  box(mesh, 'cabin', [w * 0.88, cabinHeight, cabinLength], [0, 1.12 + cabinHeight / 2, cabinZ], paint);
  const windowY = spec.style === 'van' ? 1.83 : 1.48;
  box(mesh, 'windscreen', [w * 0.76, 0.43, 0.035], [0, windowY, cabinZ + cabinLength / 2 + 0.02], glass);
  box(mesh, 'rear-window', [w * 0.72, 0.38, 0.035], [0, windowY, cabinZ - cabinLength / 2 - 0.02], glass);
  for (const side of [-1, 1]) {
    const sideLength = spec.style === 'van' ? 1.65 : cabinLength * 0.84;
    box(mesh, 'side-window', [0.035, 0.41, sideLength], [side * (w * 0.44 + 0.02), windowY,
      spec.style === 'van' ? 0.75 : cabinZ], glass);
    box(mesh, 'window-pillar', [0.05, 0.44, 0.09], [side * (w * 0.44 + 0.04), windowY, cabinZ], paint);
    box(mesh, 'door-handle', [0.045, 0.055, 0.22], [side * (w / 2 + 0.01), 1.03, -0.2], chrome);
    box(mesh, 'mirror', [0.22, 0.13, 0.22], [side * (w / 2 + 0.08), 1.39, cabinZ + cabinLength / 2 - 0.15], trim);
    box(mesh, 'headlight', [0.43, 0.2, 0.045], [side * w * 0.31, 0.93, l / 2 + 0.025], white);
    box(mesh, 'taillight', [0.38, 0.19, 0.045], [side * w * 0.33, 0.9, -l / 2 - 0.025], brakeMaterial);
  }
  box(mesh, 'grille', [w * 0.38, 0.23, 0.05], [0, 0.86, l / 2 + 0.03], trim);
  for (const end of [-1, 1]) box(mesh, 'bumper', [w * 1.02, 0.14, 0.13], [0, 0.59, end * l / 2], chrome);
  box(mesh, 'licence-plate', [0.42, 0.15, 0.03], [0, 0.78, -l / 2 - 0.03], material('#e4d6b8'));
  if (spec.style === 'pickup') {
    box(mesh, 'bed-floor', [w * 0.78, 0.04, 1.45], [0, 1.15, -1.52], trim);
    for (const side of [-1, 1]) box(mesh, 'bed-rail', [0.17, 0.28, 1.5], [side * w * 0.45, 1.24, -1.52], paint);
    box(mesh, 'tailgate', [w, 0.3, 0.15], [0, 1.23, -l / 2 + 0.08], paint);
  } else if (spec.style === 'van') {
    box(mesh, 'rear-door-seam', [0.035, 1.05, 0.04], [0, 1.73, cabinZ - cabinLength / 2 - 0.03], trim);
    for (const side of [-1, 1]) box(mesh, 'cargo-stripe', [0.035, 0.13, 2.2], [side * w * 0.445, 1.46, -0.6], chrome);
  }
  if (hero) {
    const darkPaint = material('#31475c', 0.2);
    box(mesh, 'two-tone-hood', [w * 0.64, 0.035, 0.95], [0, 1.16, 1.68], darkPaint);
    box(mesh, 'two-tone-roof', [w * 0.63, 0.035, cabinLength * 1.02], [0, 1.82, cabinZ], darkPaint);
    box(mesh, 'hood-scoop', [0.65, 0.18, 0.52], [0, 1.25, 1.52], darkPaint);
    box(mesh, 'scoop-intake', [0.48, 0.1, 0.035], [0, 1.26, 1.8], trim);
    for (const side of [-1, 1]) {
      box(mesh, 'spoiler-mount', [0.1, 0.25, 0.12], [side * 0.62, 1.22, -1.87], darkPaint);
      box(mesh, 'side-skirt', [0.1, 0.15, 2.5], [side * w / 2, 0.43, 0], darkPaint);
      box(mesh, 'beltline-trim', [0.035, 0.035, 3.85], [side * (w / 2 + 0.025), 1.08, 0], chrome);
      box(mesh, 'door-seam', [0.035, 0.38, 0.025], [side * (w / 2 + 0.025), 0.83, -0.5], trim);
      box(mesh, 'hood-pinstripe', [0.035, 0.025, 0.98], [side * w * 0.34, 1.175, 1.68], chrome);
    }
    box(mesh, 'spoiler', [w * 1.08, 0.1, 0.34], [0, 1.38, -1.87], darkPaint);
    box(mesh, 'rear-light-bar', [w * 0.65, 0.09, 0.05], [0, 0.94, -l / 2 - 0.035], brakeMaterial);
    box(mesh, 'GT-badge', [0.19, 0.07, 0.045], [w * 0.34, 1.06, -l / 2 - 0.04], chrome);
    for (const side of [-1, 1]) box(mesh, 'exhaust-tip', [0.16, 0.13, 0.22], [side * 0.63, 0.46, -l / 2 - 0.08], chrome);
  }
  const emergencyLights = [];
  if (police) {
    for (const side of [-1, 1]) {
      box(mesh, 'police-white-door', [0.045, 0.56, 2.35], [side * (w / 2 + 0.03), 0.88, -0.2], material('#e4e8e2'));
      box(mesh, 'police-stripe', [0.055, 0.1, 3.75], [side * (w / 2 + 0.06), 0.71, 0], paint);
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 6), material('#eac476', 0.45));
      badge.name = 'police-door-badge';
      badge.rotation.z = Math.PI / 2;
      badge.position.set(side * (w / 2 + 0.07), 0.98, 0.12);
      mesh.add(badge);
    }
    box(mesh, 'police-roof', [w * 0.9, 0.04, cabinLength], [0, 1.82, cabinZ], material('#e4e8e2'));
    box(mesh, 'light-bar', [1.55, 0.12, 0.4], [0, 1.94, -0.18], trim);
    for (const [side, colour] of [[-1, '#ff254a'], [1, '#267dff']]) {
      const surface = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 3, toneMapped: false });
      box(mesh, side < 0 ? 'red-beacon' : 'blue-beacon', [0.65, 0.2, 0.36], [side * 0.42, 2.08, -0.18], surface);
      const light = new THREE.PointLight(colour, 2.8, 12, 2);
      light.position.set(side * 0.65, 2.2, -0.18);
      mesh.add(light);
      emergencyLights.push({ surface, light, side });
    }
    box(mesh, 'push-bar', [w * 0.7, 0.42, 0.16], [0, 0.83, l / 2 + 0.16], trim);
  }
  const wheels = [];
  for (const side of [-1, 1]) for (const front of [false, true]) {
    const pivot = new THREE.Group();
    pivot.name = front ? 'front-wheel-steer' : 'rear-wheel';
    pivot.position.set(side * (w / 2 - 0.07), 0.44, (front ? 1 : -1) * wheelbase / 2);
    const spin = new THREE.Group();
    for (const [geometry, surface] of [[tyreGeometry, trim], [hubGeometry, chrome]]) {
      const wheel = new THREE.Mesh(geometry, surface);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      spin.add(wheel);
    }
    pivot.add(spin);
    mesh.add(pivot);
    wheels.push({ pivot, spin, front });
  }
  mesh.position.set(position.x, getGroundHeight(position), position.z);
  const vehicle = { mesh, position: mesh.position, previousPosition: mesh.position.clone(), heading,
    previousHeading: heading, speed: 0, health: 100, spec, wheels, brakeMaterial,
    emergencyLights, sirenPhase: 0, siren: police, policeControlled: police,
    collisionCooldown: 0, lastContact: null,
    steerAngle: 0, braking: false, occupied: false, owned: false, ai: null };
  mesh.userData.vehicle = vehicle;
  syncVehicle(vehicle, 0);
  return vehicle;
}

export function syncVehicle(vehicle, delta) {
  const { position, heading, spec } = vehicle;
  position.y = getGroundHeight(position);
  const halfAxle = spec.wheelbase / 2;
  const dx = Math.sin(heading) * halfAxle;
  const dz = Math.cos(heading) * halfAxle;
  const slope = (getGroundHeight(position.x + dx, position.z + dz)
    - getGroundHeight(position.x - dx, position.z - dz)) / spec.wheelbase;
  vehicle.mesh.rotation.set(-Math.atan(slope), heading, 0, 'YXZ');
  for (const wheel of vehicle.wheels) {
    wheel.pivot.rotation.y = wheel.front ? vehicle.steerAngle : 0;
    wheel.spin.rotation.x += vehicle.speed * delta / 0.37;
  }
  vehicle.brakeMaterial.emissiveIntensity = vehicle.braking ? 2.8 : 0.25;
  vehicle.sirenPhase += delta;
  for (const { surface, light, side } of vehicle.emergencyLights) {
    const flash = vehicle.siren && (Math.floor(vehicle.sirenPhase * 8) % 2 === (side < 0 ? 0 : 1));
    surface.emissiveIntensity = flash ? 5 : 0.15;
    light.intensity = flash ? 4 : 0;
  }
}

// A SAT footprint check works for both axis-aligned buildings and other rotated cars.
function footprint(position, heading, width, length) {
  return { x: position.x, z: position.z, ax: Math.cos(heading), az: -Math.sin(heading),
    bx: Math.sin(heading), bz: Math.cos(heading), hw: width / 2, hl: length / 2 };
}
function overlaps(a, b) {
  for (const [x, z] of [[a.ax, a.az], [a.bx, a.bz], [b.ax, b.az], [b.bx, b.bz]]) {
    const extent = a.hw * Math.abs(a.ax * x + a.az * z) + a.hl * Math.abs(a.bx * x + a.bz * z)
      + b.hw * Math.abs(b.ax * x + b.az * z) + b.hl * Math.abs(b.bx * x + b.bz * z);
    if (Math.abs((b.x - a.x) * x + (b.z - a.z) * z) >= extent) return false;
  }
  return true;
}
export function canDrive(vehicle, position, heading, vehicles = []) {
  const car = footprint(position, heading, vehicle.spec.width + 0.12, vehicle.spec.length);
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const x = car.x + side * car.ax * car.hw + end * car.bx * car.hl;
    const z = car.z + side * car.az * car.hw + end * car.bz * car.hl;
    if (!isWalkable(x, z) || (isOnBridge(x, z) && Math.abs(z - bridge.endpoints.city.z) > bridge.width / 2 - 1)) return false;
  }
  for (const bounds of buildingBounds) {
    const building = footprint({ x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 }, 0,
      bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
    if (overlaps(car, building)) return false;
  }
  for (const other of vehicles) {
    if (other === vehicle || Math.abs(getGroundHeight(position) - other.position.y) > 2) continue;
    if (overlaps(car, footprint(other.position, other.heading, other.spec.width, other.spec.length))) return false;
  }
  return true;
}

export function driveVehicle(vehicle, controls, delta, vehicles = [], onCollision = null) {
  vehicle.previousPosition.copy(vehicle.position);
  vehicle.previousHeading = vehicle.heading;
  const throttle = clamp(controls.throttle ?? 0, -1, 1);
  const handbrake = Boolean(controls.handbrake);
  const oldSpeed = vehicle.speed;
  vehicle.collisionCooldown = Math.max(0, vehicle.collisionCooldown - delta);
  const opposing = throttle !== 0 && throttle * vehicle.speed < -0.1;
  vehicle.braking = opposing || handbrake;
  if (opposing) {
    const speed = vehicle.speed - Math.sign(vehicle.speed) * 19 * delta;
    vehicle.speed = Math.sign(speed) !== Math.sign(vehicle.speed) ? 0 : speed;
  } else vehicle.speed += throttle * vehicle.spec.acceleration * delta;
  const drag = (handbrake ? 24 : throttle ? 0.35 : 1.5) * delta;
  vehicle.speed = Math.sign(vehicle.speed) * Math.max(0, Math.abs(vehicle.speed) - drag);
  const speedLimit = Math.min(vehicle.spec.topSpeed, vehicle.missionSpeedLimit ?? vehicle.spec.topSpeed);
  vehicle.speed = vehicle.health > 0 ? clamp(vehicle.speed, -Math.min(vehicle.spec.reverseSpeed, speedLimit), speedLimit) : 0;
  const wantedSteer = -(controls.steering ?? 0) * (handbrake ? 0.65 : 0.46) / (1 + Math.abs(vehicle.speed) * 0.035);
  vehicle.steerAngle = THREE.MathUtils.lerp(vehicle.steerAngle, wantedSteer, 1 - Math.exp(-10 * delta));
  // Signed speed makes the nose steer in the opposite direction when reversing.
  const nextHeading = vehicle.heading + vehicle.speed / vehicle.spec.wheelbase * Math.tan(vehicle.steerAngle) * delta;
  const next = vehicle.position.clone();
  next.x += Math.sin(nextHeading) * vehicle.speed * delta;
  next.z += Math.cos(nextHeading) * vehicle.speed * delta;
  if (canDrive(vehicle, next, nextHeading, vehicles)) {
    vehicle.position.copy(next);
    vehicle.heading = nextHeading;
  } else {
    const contact = footprint(next, nextHeading, vehicle.spec.width + 0.12, vehicle.spec.length);
    const other = vehicles.find((car) => car !== vehicle && Math.abs(getGroundHeight(next) - car.position.y) < 2
      && overlaps(contact, footprint(car.position, car.heading, car.spec.width, car.spec.length)));
    if (other && (other !== vehicle.lastContact || !vehicle.collisionCooldown)) {
      onCollision?.({ vehicle, other, position: next.clone(), speed: Math.abs(oldSpeed) });
      vehicle.lastContact = other;
      vehicle.collisionCooldown = 1.5;
    }
    // A mission roadblock may yield during the collision callback; accept the opened path.
    if (other?.roadblockCleared && canDrive(vehicle, next, nextHeading, vehicles)) {
      vehicle.position.copy(next);
      vehicle.heading = nextHeading;
      vehicle.speed = oldSpeed * 0.72;
    } else {
      vehicle.health = Math.max(0, vehicle.health - Math.max(0, Math.abs(oldSpeed) - 3) * 1.5);
      vehicle.speed = -vehicle.speed * 0.12;
      vehicle.braking = true;
    }
  }
  syncVehicle(vehicle, delta);
}

export function createRoadNetwork() {
  const vertical = roads.filter((road) => road.maxZ - road.minZ > road.maxX - road.minX);
  const horizontal = roads.filter((road) => road.maxX - road.minX > road.maxZ - road.minZ
    && road.minX >= bridge.endpoints.city.x);
  const xs = [...new Set(vertical.map((road) => (road.minX + road.maxX) / 2))].sort((a, b) => a - b);
  const zs = [...new Set(horizontal.map((road) => (road.minZ + road.maxZ) / 2))].sort((a, b) => a - b);
  const nodes = [];
  const edges = [];
  const lookup = new Map();
  function node(x, z) {
    const key = `${x}:${z}`;
    if (!lookup.has(key)) {
      const entry = { id: nodes.length, x, z, exits: [] };
      nodes.push(entry);
      lookup.set(key, entry);
    }
    return lookup.get(key);
  }
  function connect(a, b) {
    for (const [from, to] of [[a, b], [b, a]]) {
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      const dx = (to.x - from.x) / length;
      const dz = (to.z - from.z) / length;
      const edge = { id: edges.length, from, to, length, dx, dz, heading: Math.atan2(dx, dz),
        start: { x: from.x + dx * JUNCTION - dz * LANE, z: from.z + dz * JUNCTION + dx * LANE },
        end: { x: to.x - dx * JUNCTION - dz * LANE, z: to.z - dz * JUNCTION + dx * LANE } };
      from.exits.push(edge);
      edges.push(edge);
    }
  }
  for (const x of xs) for (let i = 0; i < zs.length - 1; i += 1) connect(node(x, zs[i]), node(x, zs[i + 1]));
  for (const z of zs) for (let i = 0; i < xs.length - 1; i += 1) connect(node(xs[i], z), node(xs[i + 1], z));
  const { city, farShore } = bridge.endpoints;
  connect(node(xs[0], city.z), node(city.x, city.z));
  // Leave room for a lane-to-lane turnaround at the marina end of the bridge.
  connect(node(city.x, city.z), node(farShore.x + 12, farShore.z));
  return { nodes, edges, xs, zs, laneOffset: LANE, junctionDistance: JUNCTION };
}

function selectExit(edge, random) {
  const forward = edge.to.exits.filter((exit) => exit.to !== edge.from);
  const straight = forward.find((exit) => exit.dx === edge.dx && exit.dz === edge.dz);
  if (straight && random() < 0.6) return straight;
  return forward.length ? forward[Math.floor(random() * forward.length)] : edge.to.exits[0];
}

function curvePoint(curve, t, derivative = false) {
  const u = 1 - t;
  const weights = derivative ? [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t]
    : [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return { x: weights.reduce((sum, weight, i) => sum + curve.points[i].x * weight, 0),
    z: weights.reduce((sum, weight, i) => sum + curve.points[i].z * weight, 0) };
}
function createJunctionCurve(incoming, outgoing) {
  const dot = incoming.dx * outgoing.dx + incoming.dz * outgoing.dz;
  const cross = incoming.dx * outgoing.dz - incoming.dz * outgoing.dx;
  const radius = JUNCTION - Math.sign(cross) * LANE;
  const handle = dot > 0.5 ? JUNCTION * 2 / 3 : dot < -0.5 ? LANE * 4 / 3 : radius * 0.55228475;
  const p0 = incoming.end;
  const p3 = outgoing.start;
  const curve = { points: [p0, { x: p0.x + incoming.dx * handle, z: p0.z + incoming.dz * handle },
    { x: p3.x - outgoing.dx * handle, z: p3.z - outgoing.dz * handle }, p3], samples: [0], length: 0 };
  let previous = p0;
  for (let i = 1; i <= 32; i += 1) {
    const point = curvePoint(curve, i / 32);
    curve.length += Math.hypot(point.x - previous.x, point.z - previous.z);
    curve.samples.push(curve.length);
    previous = point;
  }
  return curve;
}
function poseTraffic(vehicle) {
  const ai = vehicle.ai;
  if (!ai.curve) {
    vehicle.position.x = ai.edge.start.x + ai.edge.dx * ai.distance;
    vehicle.position.z = ai.edge.start.z + ai.edge.dz * ai.distance;
    vehicle.heading = ai.edge.heading;
    vehicle.steerAngle = 0;
  } else {
    const samples = ai.curve.samples;
    let index = 1;
    while (index < 32 && samples[index] < ai.distance) index += 1;
    const t = (index - 1 + (ai.distance - samples[index - 1]) / (samples[index] - samples[index - 1])) / 32;
    const point = curvePoint(ai.curve, clamp(t, 0, 1));
    const tangent = curvePoint(ai.curve, clamp(t, 0, 1), true);
    vehicle.position.x = point.x;
    vehicle.position.z = point.z;
    vehicle.heading = Math.atan2(tangent.x, tangent.z);
    const turn = Math.atan2(Math.sin(vehicle.heading - vehicle.previousHeading), Math.cos(vehicle.heading - vehicle.previousHeading));
    vehicle.steerAngle = clamp(Math.atan(turn * vehicle.spec.wheelbase / Math.max(0.01, ai.travel)), -0.6, 0.6);
  }
}

function updateTraffic(vehicle, delta, vehicles, random) {
  const ai = vehicle.ai;
  const length = ai.curve ? ai.curve.length : ai.edge.length - 2 * JUNCTION;
  const remaining = length - ai.distance;
  if (!ai.curve && !ai.next && remaining < 24) ai.next = selectExit(ai.edge, random);
  const turning = ai.curve || (ai.next && (ai.next.dx !== ai.edge.dx || ai.next.dz !== ai.edge.dz));
  let wanted = turning ? Math.min(ai.cruise, Math.sqrt(3.2 ** 2 + 4 * (ai.curve ? 0 : remaining))) : ai.cruise;
  // Yield to cars ahead in this lane, including a stopped player car.
  const dx = Math.sin(vehicle.heading);
  const dz = Math.cos(vehicle.heading);
  for (const other of vehicles) {
    if (other === vehicle || Math.abs(vehicle.position.y - other.position.y) > 2) continue;
    const rx = other.position.x - vehicle.position.x;
    const rz = other.position.z - vehicle.position.z;
    const ahead = rx * dx + rz * dz;
    const side = Math.abs(rx * dz - rz * dx);
    if (ahead > 0 && ahead < 18 && side < (vehicle.spec.width + other.spec.width) / 2 + 0.35) {
      wanted = Math.min(wanted, Math.max(0, (ahead - 6) * 0.8));
    }
  }
  vehicle.braking = wanted < vehicle.speed - 0.4;
  vehicle.speed += clamp(wanted - vehicle.speed, -9 * delta, 3 * delta);
  ai.travel = vehicle.speed * delta;
  ai.distance += ai.travel;
  while (ai.distance >= (ai.curve ? ai.curve.length : ai.edge.length - 2 * JUNCTION)) {
    if (ai.curve) {
      ai.distance -= ai.curve.length;
      ai.edge = ai.next;
      ai.next = null;
      ai.curve = null;
    } else {
      ai.distance -= ai.edge.length - 2 * JUNCTION;
      ai.next ??= selectExit(ai.edge, random);
      ai.curve = createJunctionCurve(ai.edge, ai.next);
    }
  }
  poseTraffic(vehicle);
  syncVehicle(vehicle, delta);
}

export function createVehicles(random = createRandom(), { parkedCount = 38, trafficCount = 28 } = {}) {
  const group = new THREE.Group();
  group.name = 'solano-vehicles';
  const network = createRoadNetwork();
  const parked = [];
  const traffic = [];
  const all = [];
  const collisionListeners = new Set();
  function add(vehicle, collection) {
    collection.push(vehicle);
    all.push(vehicle);
    group.add(vehicle.mesh);
    return vehicle;
  }
  const hero = add(createVehicle({ hero: true, colour: '#ef943f', position: { x: network.xs[0] - 6.5, z: 24 } }), parked);
  const cityEdges = network.edges.filter((edge) => edge.from.x >= network.xs[0] && edge.to.x >= network.xs[0]);
  for (let attempt = 0; parked.length < parkedCount && attempt < parkedCount * 20; attempt += 1) {
    const edge = cityEdges[Math.floor(random() * cityEdges.length)];
    const distance = JUNCTION + 6 + random() * (edge.length - 2 * JUNCTION - 12);
    const position = { x: edge.from.x + edge.dx * distance - edge.dz * 6.5,
      z: edge.from.z + edge.dz * distance + edge.dx * 6.5 };
    if (all.some((car) => Math.hypot(car.position.x - position.x, car.position.z - position.z) < 9)) continue;
    add(createVehicle({ style: ['sedan', 'pickup', 'van'][Math.floor(random() * 3)],
      colour: COLOURS[Math.floor(random() * COLOURS.length)], position, heading: edge.heading }), parked);
  }
  // The first cars populate the player's boulevard; others spread across the connected grid.
  const nearby = cityEdges.filter((edge) => edge.from.x === network.xs[0] && edge.to.x === network.xs[0]
    && Math.abs(edge.from.z) <= 96 && Math.abs(edge.to.z) <= 96);
  for (let attempt = 0; traffic.length < trafficCount && attempt < trafficCount * 20; attempt += 1) {
    const pool = traffic.length < 3 ? nearby : network.edges;
    const edge = pool[Math.floor(random() * pool.length)];
    const distance = random() * (edge.length - 2 * JUNCTION);
    const position = { x: edge.start.x + edge.dx * distance, z: edge.start.z + edge.dz * distance };
    if (all.some((car) => Math.hypot(car.position.x - position.x, car.position.z - position.z) < 10)) continue;
    const car = add(createVehicle({ style: ['sedan', 'sedan', 'pickup', 'van'][Math.floor(random() * 4)],
      colour: COLOURS[Math.floor(random() * COLOURS.length)], position, heading: edge.heading }), traffic);
    car.ai = { edge, distance, curve: null, next: null, cruise: 5.5 + random() * 3, travel: 0 };
    car.speed = car.ai.cruise;
  }

  return {
    group, all, parked, traffic, hero, network,
    addExternal(car) { if (!all.includes(car)) all.push(car); },
    removeExternal(car) { const index = all.indexOf(car); if (index !== -1) all.splice(index, 1); },
    onCollision(listener) { collisionListeners.add(listener); return () => collisionListeners.delete(listener); },
    nearest(position, range = 4.2) {
      let nearest = null;
      let distance = range;
      for (const car of all) {
        const next = car.position.distanceTo(position);
        if (!car.occupied && !car.policeControlled && Math.abs(car.speed) < 2.5 && next < distance) {
          nearest = car;
          distance = next;
        }
      }
      return nearest;
    },
    exitPosition(car) {
      // Try both doors and rear corners if a curb, wall or neighbouring car blocks one side.
      for (const [side, along] of [[1, 0], [-1, 0], [1, -1.7], [-1, -1.7]]) {
        const across = side * (car.spec.width / 2 + 0.85);
        const position = new THREE.Vector3(car.position.x + Math.cos(car.heading) * across + Math.sin(car.heading) * along,
          0, car.position.z - Math.sin(car.heading) * across + Math.cos(car.heading) * along);
        position.y = getGroundHeight(position);
        if (!isWalkable(position.x, position.z, 0.35)) continue;
        if (buildingBounds.some((b) => position.x > b.minX - 0.35 && position.x < b.maxX + 0.35
          && position.z > b.minZ - 0.35 && position.z < b.maxZ + 0.35)) continue;
        if (all.some((other) => other !== car && Math.abs(other.position.y - position.y) < 2
          && overlaps(footprint(position, 0, 0.7, 0.7), footprint(other.position, other.heading, other.spec.width, other.spec.length)))) continue;
        return position;
      }
      return null;
    },
    update(delta, driven = null, controls = {}) {
      for (const car of all) {
        car.previousPosition.copy(car.position);
        car.previousHeading = car.heading;
      }
      for (const car of traffic) if (car.ai && car !== driven) updateTraffic(car, delta, all, random);
      if (driven) driveVehicle(driven, controls, delta, all, (event) => {
        for (const listener of collisionListeners) listener(event);
      });
      for (const car of all) if (!car.ai && car !== driven && !car.policeControlled) {
        car.speed = 0;
        car.braking = false;
        car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, 0, Math.min(1, delta * 6));
        syncVehicle(car, 0);
      }
    },
  };
}
