// Shared world dimensions are metres; speeds are metres per second.
export const DISTRICTS = Object.freeze([
  'Palma Strand',
  'Port Solano',
  'Old Market',
  'The Flats',
  'Marina District',
  'Airstrip Heights',
]);

export const WEAPONS = Object.freeze([
  Object.freeze({ id: 'fists', name: 'Fists', key: '1', price: 0, damage: 15, range: 2, cooldown: 0.5 }),
  Object.freeze({ id: 'sidearm', name: '9mm Sidearm', key: '2', price: 500, damage: 25, range: 65, cooldown: 0.3 }),
  Object.freeze({ id: 'carbine', name: 'Bay Carbine', key: '3', price: 1200, damage: 35, range: 120, cooldown: 0.12 }),
]);

export const WORLD_SIZE = 1200;
export const BRIDGE_LENGTH = 980;
export const DEFAULT_SEED = 1337;
export const MAX_WANTED_STARS = 5;
export const STORY_MISSION_COUNT = 9;
export const STEP = 1 / 60;
export const MAX_FRAME = 0.05;

export const WORLD = Object.freeze({
  size: WORLD_SIZE,
  bridgeLength: BRIDGE_LENGTH,
  groundY: 0,
  waterY: -0.3,
  shorelineX: -46,
  fogNear: 180,
  fogFar: 1800,
});

export const PLAYER = Object.freeze({
  walkSpeed: 5,
  sprintSpeed: 9,
  height: 1.8,
  radius: 0.35,
  jumpSpeed: 7,
  gravity: 20,
  spawn: Object.freeze({ x: 8, y: 0, z: 24 }),
});

export const CAMERA = Object.freeze({
  fov: 58,
  near: 0.1,
  far: 3200,
  distance: 10,
  minDistance: 4,
  maxDistance: 22,
  yaw: 0.22,
  pitch: 0.34,
  minPitch: 0.12,
  maxPitch: 1.1,
  sensitivity: 0.004,
  followSpeed: 10,
  targetHeight: 1.3,
});

export const TITLE_VIEW = Object.freeze({
  position: Object.freeze([350, 210, 510]),
  target: Object.freeze([-120, 10, -175]),
});

export const PALETTE = Object.freeze({
  skyTop: '#352747',
  skyHorizon: '#f9a065',
  skyBottom: '#be6970',
  fog: '#dc956f',
  sun: '#ff853c',
  sunlight: '#ffbf86',
  ambient: '#bbaec8',
  water: '#444660',
  waterHighlight: '#e9ac73',
  ground: '#b8967d',
  promenade: '#d6b296',
  road: '#403e49',
  roadMarking: '#e6c99e',
  building: '#6a586b',
  palmTrunk: '#55434b',
  palmLeaf: '#354744',
  playerShirt: '#ed916f',
  playerPants: '#303442',
  playerSkin: '#bf8b69',
  panel: '#191724',
  text: '#fff1dd',
});

export const RENDER = Object.freeze({ maxPixelRatio: 2, exposure: 1.08, shadowMapSize: 2048 });
