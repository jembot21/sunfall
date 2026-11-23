// Static city geometry is batched by material; seeded generation never uses Math.random.
import { BRIDGE_LENGTH, DISTRICTS, PALETTE, WORLD } from './config.js';
import { createRandom } from './random.js';

const THREE = window.THREE;
const half = WORLD.size / 2;
const streetWidth = 18;
const bridgeZ = -96;
const bridgeWidth = 26;
const deckHeight = 12;
const rampLength = 80;
const cityEndX = WORLD.shorelineX;
const farEndX = cityEndX - BRIDGE_LENGTH;
const farShoreEdge = farEndX + 20;

export const world = new THREE.Group();
world.name = 'solano-bay';
export const roads = [];
// Footprints let mobile actors avoid buildings without raycasting the batched city.
export const buildingBounds = [];
export const safehouse = Object.freeze({ name: 'Palma Strand safehouse', x: -19, y: 0, z: 24 });
export const rooftopLookout = Object.freeze({ x: -9, y: 5, z: 145 });
export const marinaDock = Object.freeze({ x: farShoreEdge + 48, y: 0.73, z: bridgeZ + 108 });
export const bridgeEndpoints = Object.freeze({
  city: Object.freeze({ x: cityEndX, y: 0, z: bridgeZ }),
  farShore: Object.freeze({ x: farEndX, y: 0, z: bridgeZ }),
});
// Shared by permanent scenery, mission collision rules and the screenshot director.
export const bridgeFinale = Object.freeze({
  tollX: cityEndX - 150,
  spikeX: cityEndX - 168,
  roadblockX: farEndX - 18,
  gapZ: bridgeZ + 7.3,
  gapWidth: 5.4,
});
export const bridge = Object.freeze({
  length: BRIDGE_LENGTH, width: bridgeWidth, deckHeight, rampLength, endpoints: bridgeEndpoints,
});

// Zones follow the arterial roads. Palma contains the configured player spawn.
export const districtZones = Object.freeze([
  { name: DISTRICTS[0], minX: cityEndX, maxX: 296, minZ: -192, maxZ: 192,
    colors: ['#c8a084', '#d0b493', '#ad8587'], density: 0.94, minHeight: 9, maxHeight: 36 },
  { name: DISTRICTS[1], minX: cityEndX, maxX: 296, minZ: -half, maxZ: -192,
    colors: ['#88908c', '#a78d7b', '#927f80'], density: 0.78, minHeight: 6, maxHeight: 20 },
  { name: DISTRICTS[2], minX: 296, maxX: half, minZ: -192, maxZ: 192,
    colors: ['#bd8b70', '#aa7774', '#c5a78b'], density: 0.98, minHeight: 8, maxHeight: 32 },
  { name: DISTRICTS[3], minX: 296, maxX: half, minZ: 192, maxZ: half,
    colors: ['#a9a18d', '#9b9294', '#bcaa95'], density: 0.7, minHeight: 4, maxHeight: 17 },
  { name: DISTRICTS[4], minX: cityEndX, maxX: 296, minZ: 192, maxZ: half,
    colors: ['#a4b4af', '#b5a8b7', '#d0bca1'], density: 0.85, minHeight: 16, maxHeight: 66 },
  { name: DISTRICTS[5], minX: 296, maxX: half, minZ: -half, maxZ: -192,
    colors: ['#84929c', '#9b97a9', '#b6b2ac'], density: 0.82, minHeight: 24, maxHeight: 110 },
].map((zone) => Object.freeze({ ...zone, colors: Object.freeze(zone.colors) })));

export function getDistrict(x, z) {
  if (typeof x === 'object') ({ x, z } = x);
  return districtZones.find((zone) => x >= zone.minX && x < zone.maxX && z >= zone.minZ && z < zone.maxZ)?.name
    ?? (x <= farShoreEdge ? 'Solano Marina' : 'Solano Bay');
}

export function isOnBridge(x, z) {
  if (typeof x === 'object') ({ x, z } = x);
  return x <= cityEndX && x >= farEndX && Math.abs(z - bridgeZ) <= bridgeWidth / 2;
}

// Exact roadway surface: zero at both endpoints, linear ramps, then a level deck.
export function getGroundHeight(x, z) {
  if (typeof x === 'object') ({ x, z } = x);
  // A walkable access ramp leads to the boathouse roof; the dock extends over the bay.
  if (x >= -17 && x <= -1 && z >= 112 && z <= 155) return z < 135 ? (z - 112) / 23 * 5 : 5;
  if (x >= farShoreEdge && x <= farShoreEdge + 74 && z >= bridgeZ + 105 && z <= bridgeZ + 111) return 0.73;
  if (!isOnBridge(x, z)) return WORLD.groundY;
  const distance = cityEndX - x;
  return deckHeight * Math.min(1, distance / rampLength, (BRIDGE_LENGTH - distance) / rampLength);
}

export function isOnRoad(x, z) {
  if (typeof x === 'object') ({ x, z } = x);
  return isOnBridge(x, z) || roads.some((road) => x >= road.minX && x <= road.maxX && z >= road.minZ && z <= road.maxZ);
}

// Movement can cross the bridge without the foundation's old shoreline clamp.
export function isWalkable(x, z, radius = 0) {
  if (Math.abs(z) > half - radius) return false;
  if (x >= farShoreEdge - radius && x <= farShoreEdge + 74 - radius
    && z >= bridgeZ + 105 + radius && z <= bridgeZ + 111 - radius) return true;
  if (x >= cityEndX + radius && x <= half - radius) return true;
  if (x <= farShoreEdge - radius && x >= farEndX - 260 + radius) return true;
  return x >= farEndX - radius && x <= cityEndX + radius && Math.abs(z - bridgeZ) <= bridgeWidth / 2 - radius;
}

export function isNavigable(x, z, radius = 0.35) {
  return isWalkable(x, z, radius) && !buildingBounds.some((b) =>
    x > b.minX - radius && x < b.maxX + radius && z > b.minZ - radius && z < b.maxZ + radius);
}

function intersectsBounds(from, to, bounds, radius = 0, heights = false) {
  let near = 0.001;
  let far = 0.999;
  const axes = [[from.x, to.x, bounds.minX - radius, bounds.maxX + radius],
    [from.z, to.z, bounds.minZ - radius, bounds.maxZ + radius]];
  if (heights) axes.push([from.y, to.y, 0, bounds.maxY]);
  for (const [start, end, min, max] of axes) {
    const difference = end - start;
    if (Math.abs(difference) < 0.00001) {
      if (start < min || start > max) return false;
    } else {
      const a = (min - start) / difference;
      const b = (max - start) / difference;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return false;
    }
  }
  return near <= far;
}

// Eye-height rays also work from AIR ONE: a low building does not block a ray above its roof.
export function hasLineOfSight(from, to, fromHeight = 1.4, toHeight = 1.2) {
  const start = { x: from.x, y: (from.y ?? getGroundHeight(from)) + fromHeight, z: from.z };
  const end = { x: to.x, y: (to.y ?? getGroundHeight(to)) + toHeight, z: to.z };
  return !buildingBounds.some((b) => intersectsBounds(start, end, b, 0, true));
}

export function isGroundPathClear(from, to, radius = 0.35) {
  if (buildingBounds.some((b) => intersectsBounds(from, to, b, radius))) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 4));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (!isWalkable(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, radius)) return false;
  }
  return true;
}

let waterMaterial;
let glintMaterial;
export function updateWorld(time) {
  if (waterMaterial) waterMaterial.color.copy(waterBase).lerp(waterGlow, 0.035 + Math.sin(time * 0.45) * 0.02);
  if (glintMaterial) glintMaterial.opacity = 0.23 + Math.sin(time * 0.7) * 0.055;
}
const waterBase = new THREE.Color(PALETTE.water).convertSRGBToLinear();
const waterGlow = new THREE.Color(PALETTE.waterHighlight).convertSRGBToLinear();

function surface(color, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86, ...extra });
  material.color.convertSRGBToLinear();
  material.name = String(color);
  return material;
}

// One material/texture pair per facade palette; UVs repeat at physical window spacing.
function facadeMaterial(color, random) {
  const canvas = document.createElement('canvas');
  const glow = document.createElement('canvas');
  canvas.width = glow.width = 256;
  canvas.height = glow.height = 512;
  const context = canvas.getContext('2d');
  const light = glow.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 256, 512);
  light.fillStyle = '#000000';
  light.fillRect(0, 0, 256, 512);
  const litColors = ['#ffcf88', '#ffe4ad', '#eab16d', '#f6d29b'];
  for (let floor = 0; floor < 16; floor += 1) {
    context.fillStyle = '#46374033';
    context.fillRect(0, floor * 32 + 28, 256, 2);
    for (let column = 0; column < 8; column += 1) {
      const x = column * 32 + 8;
      const y = floor * 32 + 6;
      const lit = random() < 0.57;
      const tint = litColors[Math.floor(random() * litColors.length)];
      context.fillStyle = '#3f3544';
      context.fillRect(x - 2, y - 2, 20, 23);
      context.fillStyle = lit ? tint : '#4d4654';
      context.fillRect(x, y, 16, 19);
      context.fillStyle = '#463841aa';
      context.fillRect(x + 7, y, 2, 19);
      context.fillRect(x, y + 10, 16, 1);
      if (lit) {
        light.fillStyle = tint;
        light.fillRect(x, y, 16, 19);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  const emissiveMap = new THREE.CanvasTexture(glow);
  for (const map of [texture, emissiveMap]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.encoding = THREE.sRGBEncoding;
    map.anisotropy = 4;
  }
  return surface('#ffffff', { map: texture, emissiveMap, emissive: '#ffbd76', emissiveIntensity: 0.55 });
}

// Merge transformed primitives by material, including normals and texture coordinates.
function createBatcher(parent) {
  const batches = new Map();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  function add(geometry, material, matrix, uvScale = [1, 1]) {
    if (!batches.has(material)) batches.set(material, { positions: [], normals: [], uvs: [], indices: [] });
    const data = batches.get(material);
    const offset = data.positions.length / 3;
    const attributes = geometry.attributes;
    normalMatrix.getNormalMatrix(matrix);
    for (let i = 0; i < attributes.position.count; i += 1) {
      point.fromBufferAttribute(attributes.position, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(attributes.normal, i).applyNormalMatrix(normalMatrix);
      data.positions.push(point.x, point.y, point.z);
      data.normals.push(normal.x, normal.y, normal.z);
      data.uvs.push(attributes.uv.getX(i) * uvScale[0], attributes.uv.getY(i) * uvScale[1]);
    }
    if (geometry.index) {
      for (const index of geometry.index.array) data.indices.push(offset + index);
    } else {
      for (let i = 0; i < attributes.position.count; i += 1) data.indices.push(offset + i);
    }
  }
  function finish() {
    for (const [material, data] of batches) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
      geometry.setIndex(data.indices);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `city-batch-${material.name}`;
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    batches.clear();
  }
  return { add, finish };
}

export function createWorld(random = createRandom()) {
  // Rebuilding is supported for future new-game/seed selection.
  const disposable = new Set();
  world.traverse((object) => {
    if (object.geometry) disposable.add(object.geometry);
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        disposable.add(material);
        if (material.map) disposable.add(material.map);
        if (material.emissiveMap) disposable.add(material.emissiveMap);
      }
    }
  });
  for (const resource of disposable) resource.dispose();
  world.clear();
  roads.length = 0;
  buildingBounds.length = 0;
  const batch = createBatcher(world);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(0.7, 1, 1, 7);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const identity = new THREE.Matrix4();
  function primitive(geometry, size, at, material, yaw = 0, uvScale) {
    position.set(...at);
    scale.set(...size);
    rotation.setFromAxisAngle(up, yaw);
    matrix.compose(position, rotation, scale);
    batch.add(geometry, material, matrix, uvScale);
  }
  const box = (size, at, material, yaw = 0) => primitive(cube, size, at, material, yaw);
  function beam(a, b, width, depth, material) {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    scale.set(width, direction.length(), depth);
    position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    rotation.setFromUnitVectors(up, direction.normalize());
    matrix.compose(position, rotation, scale);
    batch.add(cube, material, matrix);
  }

  const ground = surface(PALETTE.ground);
  const promenade = surface(PALETTE.promenade);
  const asphalt = surface(PALETTE.road);
  const marking = surface(PALETTE.roadMarking);
  const concrete = surface('#aaa298');
  const roof = surface('#6d646b');
  const metal = surface('#4a4b57', { metalness: 0.45, roughness: 0.48 });
  const bulb = surface('#ffe3a9', { emissive: '#ffc578', emissiveIntensity: 1.7 });
  const wood = surface('#876045');
  const rust = surface('#9c6650');
  const trunk = surface(PALETTE.palmTrunk);
  const leafMaterial = surface(PALETTE.palmLeaf, { side: THREE.DoubleSide });
  box([half - cityEndX, 0.4, WORLD.size], [(half + cityEndX) / 2, -0.2, 0], ground);
  box([280, 0.4, WORLD.size], [farEndX - 120, -0.2, 0], ground);
  box([36, 0.07, WORLD.size], [cityEndX + 18, 0.035, 0], promenade);
  // Seawall leaves a gap for the bridge approach.
  for (const [z1, z2] of [[-half, bridgeZ - 14], [bridgeZ + 14, half]]) {
    box([1.1, 1.4, z2 - z1], [cityEndX + 0.55, -0.3, (z1 + z2) / 2], concrete);
  }

  waterMaterial = new THREE.MeshPhongMaterial({ color: waterBase, specular: waterGlow, shininess: 85 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(cityEndX - farShoreEdge, WORLD.size + 900), waterMaterial);
  water.name = 'solano-bay-water';
  water.rotation.x = -Math.PI / 2;
  water.position.set((cityEndX + farShoreEdge) / 2, WORLD.waterY, 0);
  world.add(water);
  glintMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.waterHighlight, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 220; i += 1) {
    box([2 + random() * 22, 0.018, 0.15 + random() * 0.45],
      [farShoreEdge + random() * (cityEndX - farShoreEdge), WORLD.waterY + 0.02, -780 + random() * 1560], glintMaterial);
  }

  const streetXs = [];
  const streetZs = [];
  for (let x = 8; x < half; x += 96) streetXs.push(x);
  for (let z = -576; z < half; z += 96) streetZs.push(z);
  function road(minX, maxX, minZ, maxZ, name) {
    roads.push(Object.freeze({ minX, maxX, minZ, maxZ, name }));
    box([maxX - minX, 0.025, maxZ - minZ], [(minX + maxX) / 2, 0.083, (minZ + maxZ) / 2], asphalt);
  }
  for (const x of streetXs) {
    road(x - streetWidth / 2, x + streetWidth / 2, -half, half, x === 8 ? 'Palma Boulevard' : `Solano Avenue ${1 + streetXs.indexOf(x)}`);
    for (const side of [-1, 1]) {
      box([0.16, 0.012, WORLD.size], [x + side * 7.5, 0.102, 0], marking);
    }
    for (let z = -half + 5; z < half; z += 14) {
      if (streetZs.some((crossing) => Math.abs(crossing - z) < 12)) continue;
      box([0.2, 0.012, 5], [x, 0.103, z], marking);
    }
  }
  for (const z of streetZs) {
    road(cityEndX, half, z - streetWidth / 2, z + streetWidth / 2, z === bridgeZ ? 'Bay Bridge Road' : `Calle Solano ${1 + streetZs.indexOf(z)}`);
    // Break markings at intersections, so the grid reads as real streets.
    for (let x = cityEndX + 6; x < half; x += 14) {
      if (streetXs.some((crossing) => Math.abs(crossing - x) < 12)) continue;
      box([5, 0.012, 0.2], [x, 0.112, z], marking);
      for (const side of [-1, 1]) box([12, 0.012, 0.16], [x, 0.112, z + side * 7.5], marking);
    }
  }

  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 1.4, 0.25, -0.55, 3, -0.1, -0.4, 4.6, -1, 0, 3, -0.1, 0.4, 1.4, 0.25, 0.55,
  ], 3));
  leaf.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0.5, 0.3, 0, 0.7, 0, 1, 0.5, 0.7, 1, 0.3, 1], 2));
  leaf.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
  leaf.computeVertexNormals();
  function palm(x, z) {
    const height = 7 + random() * 4;
    primitive(cylinder, [0.26, height, 0.26], [x, height / 2, z], trunk);
    const phase = random() * Math.PI * 2;
    for (let i = 0; i < 8; i += 1) {
      const size = 0.8 + random() * 0.35;
      primitive(leaf, [size, size, size], [x, height, z], leafMaterial, phase + i * Math.PI / 4);
    }
  }
  function lamp(x, z, groundY = 0, facing = 1) {
    box([0.45, 0.28, 0.45], [x, groundY + 0.14, z], concrete);
    box([0.15, 6.8, 0.15], [x, groundY + 3.4, z], metal);
    box([1.9, 0.13, 0.15], [x + facing * 0.85, groundY + 6.75, z], metal);
    box([0.85, 0.16, 0.4], [x + facing * 1.55, groundY + 6.65, z], bulb);
  }

  const facadeSets = new Map(districtZones.map((zone) => [zone.name, zone.colors.map((color) => facadeMaterial(color, random))]));
  // Split a box's walls from its caps. Physical UV repeat avoids stretched windows.
  const walls = cube.clone();
  const caps = cube.clone();
  const wallIndices = [];
  const capIndices = [];
  for (let i = 0; i < cube.index.count; i += 3) {
    const index = cube.index.getX(i);
    const target = Math.abs(cube.attributes.normal.getY(index)) > 0.5 ? capIndices : wallIndices;
    target.push(cube.index.getX(i), cube.index.getX(i + 1), cube.index.getX(i + 2));
  }
  walls.setIndex(wallIndices);
  caps.setIndex(capIndices);
  const wallUV = walls.attributes.uv.array.slice();
  function building(x, z, width, depth, height, material) {
    buildingBounds.push(Object.freeze({ minX: x - width / 2, maxX: x + width / 2,
      minZ: z - depth / 2, maxZ: z + depth / 2, maxY: height + 1.5 }));
    for (let i = 0; i < walls.attributes.position.count; i += 1) {
      const horizontal = Math.abs(walls.attributes.normal.getX(i)) > 0.5 ? depth : width;
      walls.attributes.uv.setXY(i, wallUV[i * 2] * horizontal / 24, wallUV[i * 2 + 1] * height / 48);
    }
    primitive(walls, [width, height, depth], [x, height / 2 + 0.15, z], material);
    primitive(caps, [width, height, depth], [x, height / 2 + 0.15, z], roof);
    box([width + 0.6, 0.45, depth + 0.6], [x, height + 0.2, z], roof);
    box([width + 0.4, 0.18, depth + 0.4], [x, height - 0.25, z], concrete);
    if (random() < 0.65) box([width * 0.25, 1.2, depth * 0.24], [x + width * 0.15, height + 1, z], concrete);
  }
  // The arrest respawn is the front door of this small waterfront home.
  buildingBounds.push(Object.freeze({ minX: -36, maxX: -22, minZ: 16, maxZ: 32, maxY: 6.5 }));
  box([14, 5, 16], [-29, 2.65, 24], surface('#cf9a82'));
  box([15, 0.45, 17], [-29, 5.4, 24], roof);
  box([0.12, 2.8, 1.5], [-21.94, 1.5, 24], surface('#344f55'));
  box([3.5, 0.16, 5], [-20.4, 3.3, 24], surface('#5e8e89'));
  box([0.12, 1.4, 2.4], [-21.92, 2.5, 19], bulb);
  box([0.12, 1.4, 2.4], [-21.92, 2.5, 29], bulb);
  box([4, 0.12, 5], [-19.5, 0.1, 24], promenade);
  let buildingCount = 0;
  for (let col = 0; col < streetXs.length - 1; col += 1) {
    for (let row = 0; row < streetZs.length - 1; row += 1) {
      const x0 = streetXs[col];
      const z0 = streetZs[row];
      const zone = districtZones.find((candidate) => candidate.name === getDistrict(x0 + 48, z0 + 48));
      box([75, 0.16, 75], [x0 + 48, 0.08, z0 + 48], promenade);
      const slots = zone.name === DISTRICTS[1] ? 2 : 3;
      const spacing = 72 / slots;
      for (let i = 0; i < slots; i += 1) {
        for (let j = 0; j < 2; j += 1) {
          if (random() > zone.density) continue;
          const width = spacing * (0.66 + random() * 0.18);
          const depth = 22 + random() * 8;
          const x = x0 + 12 + spacing * (i + 0.5) + (random() - 0.5) * 3;
          const z = z0 + 29 + j * 37 + (random() - 0.5) * 3;
          const height = zone.minHeight + random() ** 1.3 * (zone.maxHeight - zone.minHeight);
          const materials = facadeSets.get(zone.name);
          building(x, z, width, depth, height, materials[Math.floor(random() * materials.length)]);
          buildingCount += 1;
        }
      }
      if (random() < 0.7) palm(x0 + 14, z0 + 14);
      lamp(x0 + 12, z0 + 83, 0, -1);
      if (zone.name === DISTRICTS[1]) {
        for (let i = 0; i < 5; i += 1) {
          const x = x0 + 18 + random() * 57;
          const z = z0 + 44 + random() * 9;
          if (i % 2 === 0) {
            box([1.5, 1.5, 1.5], [x, 0.9, z], wood);
            box([1.55, 0.12, 1.55], [x, 1.25, z], metal);
          } else primitive(cylinder, [0.6, 1.4, 0.6], [x, 0.85, z], rust);
        }
      }
    }
  }
  for (let z = -560; z < half; z += 30) {
    if (Math.abs(z - bridgeZ) < 20) continue;
    palm(-23, z);
    if (Math.round((z + 560) / 30) % 2 === 0) lamp(-8, z, 0, -1);
  }
  // Port warehouses and container stacks alongside the northern waterfront.
  const containerColors = [surface('#80615e'), surface('#5d7d82'), surface('#b69563')];
  for (let i = 0; i < 15; i += 1) {
    box([9, 3, 3.5], [-30, 1.5 + (i % 3) * 3, -250 - Math.floor(i / 3) * 45], containerColors[i % 3]);
  }

  // Full 980m bridge, with exact sloped slabs and a navigable 12m-high deck.
  function slab(x1, x2, y1, y2) {
    const geometry = cube.clone();
    const points = geometry.attributes.position;
    for (let i = 0; i < points.count; i += 1) {
      const t = points.getX(i) + 0.5;
      points.setXYZ(i, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + (points.getY(i) - 0.5) * 1.2, bridgeZ + points.getZ(i) * bridgeWidth);
    }
    geometry.computeVertexNormals();
    batch.add(geometry, asphalt, identity);
    geometry.dispose();
  }
  slab(farEndX, farEndX + rampLength, 0, deckHeight);
  slab(farEndX + rampLength, cityEndX - rampLength, deckHeight, deckHeight);
  slab(cityEndX - rampLength, cityEndX, deckHeight, 0);
  roads.push(Object.freeze({ minX: farEndX, maxX: cityEndX, minZ: bridgeZ - 13, maxZ: bridgeZ + 13, name: 'Solano Bay Bridge' }));
  for (let x = farEndX; x < cityEndX; x += 14) {
    const end = Math.min(x + 5, cityEndX);
    const y1 = getGroundHeight(x, bridgeZ) + 0.025;
    const y2 = getGroundHeight(end, bridgeZ) + 0.025;
    beam([x, y1, bridgeZ], [end, y2, bridgeZ], 0.2, 0.08, marking);
  }
  const spans = [[farEndX, farEndX + 80], [farEndX + 80, cityEndX - 80], [cityEndX - 80, cityEndX]];
  for (const side of [-1, 1]) {
    const z = bridgeZ + side * 12.2;
    for (const [x1, x2] of spans) {
      const y1 = getGroundHeight(x1, bridgeZ);
      const y2 = getGroundHeight(x2, bridgeZ);
      beam([x1, y1 + 0.7, z], [x2, y2 + 0.7, z], 0.32, 0.24, concrete);
      beam([x1, y1 + 1.35, z], [x2, y2 + 1.35, z], 0.14, 0.14, metal);
      beam([x1, y1 + 0.04, bridgeZ + side * 10], [x2, y2 + 0.04, bridgeZ + side * 10], 0.18, 0.06, marking);
    }
    for (let x = farEndX + 6; x < cityEndX; x += 12) box([0.18, 1.3, 0.18], [x, getGroundHeight(x, bridgeZ) + 0.65, z], metal);
    for (let x = farEndX + 35; x < cityEndX - 15; x += 55) lamp(x, bridgeZ + side * 11, getGroundHeight(x, bridgeZ), 1);
  }
  const towerXs = [cityEndX - 290, cityEndX - 690];
  for (const x of towerXs) {
    for (const side of [-1, 1]) {
      box([7, 80, 5], [x, 38, bridgeZ + side * 16], concrete);
      box([12, 3, 9], [x, 0.5, bridgeZ + side * 16], concrete);
      box([8, 2, 6], [x, 78, bridgeZ + side * 16], metal);
    }
    box([7, 4, 37], [x, 66, bridgeZ], concrete);
    box([7, 3, 37], [x, 26, bridgeZ], concrete);
  }
  const anchors = [[farEndX + 80, 14], [towerXs[1], 78], [towerXs[0], 78], [cityEndX - 80, 14]];
  for (const side of [-1, 1]) {
    const z = bridgeZ + side * 16;
    for (let span = 0; span < anchors.length - 1; span += 1) {
      const [x1, y1] = anchors[span];
      const [x2, y2] = anchors[span + 1];
      const segments = Math.ceil((x2 - x1) / 16);
      const sag = span === 1 ? 46 : 12;
      let previous = [x1, y1, z];
      for (let i = 1; i <= segments; i += 1) {
        const t = i / segments;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * sag;
        const next = [x, y, z];
        beam(previous, next, 0.5, 0.5, metal);
        beam([x, deckHeight, bridgeZ + side * 12.5], next, 0.13, 0.13, metal);
        previous = next;
      }
    }
  }
  const tollX = cityEndX - 150;
  for (const offset of [-11, -3.7, 3.7, 11]) {
    box([0.8, 6, 0.8], [tollX, deckHeight + 3, bridgeZ + offset], concrete);
    box([3.8, 2.6, 2.8], [tollX + 5, deckHeight + 1.3, bridgeZ + offset], metal);
  }
  box([12, 0.9, 28], [tollX, deckHeight + 6.2, bridgeZ], surface('#71918a'));
  for (const offset of [-7.3, 0, 7.3]) box([0.15, 0.25, 2.2], [tollX + 6.1, deckHeight + 5.4, bridgeZ + offset], bulb);

  // The escape route is dressed even before a job starts; mission 9 owns only its live cruisers and hazards.
  const dressing = new THREE.Group();
  dressing.name = 'bridge-finale-dressing';
  world.add(dressing);
  const spikeMetal = surface('#ced3cc', { metalness: 0.5, roughness: 0.35 });
  const coneOrange = surface('#f16d21', { roughness: 0.7 });
  const reflectiveWhite = surface('#fff0d4', { emissive: '#efbc85', emissiveIntensity: 0.12 });
  const rubber = surface('#262b32');
  const gapPaint = surface('#a6e3bd', { emissive: '#77ac83', emissiveIntensity: 0.25 });
  function prop(parent, name, geometry, material, at, size) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...at);
    if (size) mesh.scale.set(...size);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const coneGeometry = new THREE.ConeGeometry(0.34, 0.9, 12);
  const bandGeometry = new THREE.CylinderGeometry(0.12, 0.22, 0.24, 12);
  function trafficCone(parent, x, z) {
    const cone = new THREE.Group();
    cone.name = 'reflective-traffic-cone';
    cone.position.set(x, 0, z);
    prop(cone, 'cone-base', cube.clone(), rubber, [0, 0.055, 0], [0.75, 0.11, 0.75]);
    prop(cone, 'orange-cone', coneGeometry, coneOrange, [0, 0.55, 0]);
    prop(cone, 'reflective-band', bandGeometry, reflectiveWhite, [0, 0.64, 0]);
    parent.add(cone);
  }
  function markGap(parent, length) {
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(length, bridgeFinale.gapWidth),
      new THREE.MeshBasicMaterial({ color: '#77c89c', transparent: true, opacity: 0.24, depthWrite: false }));
    gap.name = 'marked-safe-gap';
    gap.rotation.x = -Math.PI / 2;
    gap.position.y = 0.14;
    parent.add(gap);
    for (const side of [-1, 1]) {
      prop(parent, 'gap-edge-marking', cube.clone(), gapPaint, [0, 0.16, side * bridgeFinale.gapWidth / 2], [length, 0.025, 0.1]);
      for (const x of [-length / 2 + 1, length / 2 - 1]) trafficCone(parent, x, side * (bridgeFinale.gapWidth / 2 + 0.4));
      for (const x of [-4, 0, 4]) {
        prop(parent, 'escape-chevron', cube.clone(), gapPaint, [x + 0.15, 0.17, side * 0.45], [1.3, 0.025, 0.18]).rotation.y = -side * Math.PI / 4;
      }
    }
  }
  const spikeStrip = new THREE.Group();
  spikeStrip.name = 'toll-spike-strip';
  spikeStrip.position.set(bridgeFinale.spikeX, deckHeight, bridgeZ);
  dressing.add(spikeStrip);
  const spikeGeometry = new THREE.ConeGeometry(0.19, 0.45, 4);
  for (let offset = -11; offset <= 11; offset += 0.65) {
    if (Math.abs(offset - 7.3) < bridgeFinale.gapWidth / 2) continue;
    prop(spikeStrip, 'toll-spike', spikeGeometry, spikeMetal, [0, 0.25, offset]);
    prop(spikeStrip, 'spike-strip-base', cube.clone(), rubber, [0, 0.05, offset], [0.75, 0.08, 0.65]);
  }
  const tollGap = new THREE.Group();
  tollGap.name = 'toll-escape-gap';
  tollGap.position.set(bridgeFinale.spikeX, deckHeight, bridgeFinale.gapZ);
  markGap(tollGap, 15);
  dressing.add(tollGap);
  const roadblockGap = new THREE.Group();
  roadblockGap.name = 'roadblock-escape-gap';
  roadblockGap.position.set(bridgeFinale.roadblockX, 0, -85.5);
  markGap(roadblockGap, 18);
  dressing.add(roadblockGap);

  road(farEndX - 225, farEndX, bridgeZ - 9, bridgeZ + 9, 'Marina Approach');
  for (let x = farEndX - 220; x < farEndX; x += 14) box([5, 0.012, 0.2], [x, 0.105, bridgeZ], marking);
  const marinaFacade = facadeSets.get(DISTRICTS[4]);
  for (let i = 0; i < 8; i += 1) {
    const x = farEndX - 50 - (i % 4) * 48;
    const z = bridgeZ + (i < 4 ? -42 : 45);
    building(x, z, 22 + random() * 8, 23, 7 + random() * 13, marinaFacade[i % 3]);
    buildingCount += 1;
    palm(x + 18, z + 17);
    lamp(x, bridgeZ + (i < 4 ? -13 : 13));
  }
  // A waterside destination, with piles, a timber dock and a moored cabin boat.
  const dockZ = bridgeZ + 108;
  box([74, 0.45, 6], [farShoreEdge + 32, 0.5, dockZ], wood);
  box([7, 0.45, 40], [farShoreEdge + 65, 0.5, dockZ + 17], wood);
  for (let i = 0; i < 8; i += 1) {
    primitive(cylinder, [0.35, 3, 0.35], [farShoreEdge + i * 9, -0.2, dockZ + (i % 2 ? 3 : -3)], wood);
  }
  const boat = new THREE.Group();
  boat.name = 'marina-moored-boat';
  boat.userData.owner = 'Dre';
  boat.position.set(farShoreEdge + 48, 0, dockZ + 12);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.7, 1.6, 6), surface('#e5d8bd'));
  hull.scale.set(1, 1, 3);
  hull.position.y = 0.25;
  hull.castShadow = true;
  boat.add(hull);
  const cabin = new THREE.Mesh(cube.clone(), surface('#a6b7b7'));
  cabin.scale.set(3.2, 2.5, 4.3);
  cabin.position.set(0, 2, -1.3);
  cabin.castShadow = true;
  boat.add(cabin);
  const glass = new THREE.Mesh(cube.clone(), surface('#344855', { roughness: 0.25 }));
  glass.scale.set(3.25, 0.9, 2.7);
  glass.position.set(0, 2.45, -0.6);
  boat.add(glass);
  prop(boat, 'cabin-roof', cube.clone(), reflectiveWhite, [0, 3.3, -1.3], [3.7, 0.18, 4.8]);
  for (const side of [-1, 1]) {
    prop(boat, 'teal-hull-stripe', cube.clone(), surface('#416d70'), [side * 2.05, 0.62, 0], [0.1, 0.16, 10]);
    prop(boat, 'deck-rail', cube.clone(), reflectiveWhite, [side * 1.75, 1.28, 1.4], [0.07, 0.07, 7.5]);
    for (const z of [-2.2, 1.4, 5]) prop(boat, 'rail-stanchion', cube.clone(), metal, [side * 1.75, 1.03, z], [0.06, 0.5, 0.06]);
  }
  prop(boat, 'outboard-motor', cube.clone(), metal, [0, 0.1, 6.8], [1.1, 1.35, 0.9]);
  prop(boat, 'navigation-mast', cube.clone(), metal, [0, 3.9, -1.5], [0.08, 1.2, 0.08]);
  prop(boat, 'anchor-light', cube.clone(), bulb, [0, 4.55, -1.5], [0.2, 0.2, 0.2]);
  world.add(boat);
  beam([farShoreEdge + 48, 1, dockZ + 8], [farShoreEdge + 48, 0.75, dockZ + 2], 0.06, 0.06, wood);

  batch.finish();
  // Small readable street signs identify all six district zones in the world.
  for (const zone of districtZones) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.fillStyle = '#344e4b';
    context.fillRect(0, 0, 512, 96);
    context.strokeStyle = '#ecd7ac';
    context.lineWidth = 4;
    context.strokeRect(7, 7, 498, 82);
    context.fillStyle = '#fff0cf';
    context.font = 'bold 36px Arial';
    context.textAlign = 'center';
    context.fillText(zone.name.toUpperCase(), 256, 61);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), surface('#ffffff', { map: texture, side: THREE.DoubleSide }));
    sign.name = `district-sign-${zone.name}`;
    const x = zone.minX < 0 ? -3 : zone.minX + 12;
    const z = zone.name === DISTRICTS[0] ? 45 : zone.minZ + 42;
    sign.position.set(x, 3.4, z);
    world.add(sign);
    const post = new THREE.Mesh(cube.clone(), metal);
    post.scale.set(0.13, 3, 0.13);
    post.position.set(x, 1.5, z);
    world.add(post);
  }
  world.userData.buildingCount = buildingCount;
  world.userData.districts = districtZones;
  world.userData.bridge = bridge;
  for (const geometry of [cube, cylinder, walls, caps, leaf]) geometry.dispose();
  return world;
}
