(function () {
  'use strict';
  const SF = window.SF = window.SF || {};
  SF.CONFIG = {
    seed: 30719,
    palette: { sky: 0xe9a05d, horizon: 0xdb7865, zenith: 0x655475, sea: 0x146d70, asphalt: 0x302923, sidewalk: 0xb9a48b, curb: 0xe5cdb0, cash: '#ffc16a', danger: '#ff766c', objective: '#49e7d2' },
    street: { blockSize: 84, roadWidth: 16, laneWidth: 4, sidewalkWidth: 5, columns: 9, rows: 6 },
    tuning: { ambientTrafficCount: 72, parkedCarFillRate: 0.78, exposure: 0.92, farDistance: 1250 },
    districts: [
      { name: 'Palma Strand', colors: [0xb96940, 0x984c3d, 0xc59860], density: 1.0, pedestrians: 90, heights: [10, 25], props: ['palm', 'bench', 'planter', 'bin', 'bus', 'news'] },
      { name: 'Marina', colors: [0x698e82, 0xb98b58, 0x427d7b], density: 0.8, pedestrians: 64, heights: [12, 32], props: ['palm', 'bench', 'planter', 'sign', 'bin'] },
      { name: 'Old Town', colors: [0x994b32, 0xc09a60, 0x866352], density: 0.87, pedestrians: 72, heights: [12, 27], props: ['bench', 'news', 'planter', 'bin', 'sign'] },
      { name: 'Downtown', colors: [0x89745f, 0x526e70, 0x9c6254], density: 0.91, pedestrians: 78, heights: [30, 94], props: ['bus', 'news', 'bin', 'planter', 'sign'] },
      { name: 'Hillcrest', colors: [0xb18b58, 0x77794e, 0xa66458], density: 0.55, pedestrians: 40, heights: [9, 22], props: ['palm', 'planter', 'bench', 'sign'] },
      { name: 'Ironworks Port', colors: [0x75523c, 0x737367, 0x994e32], density: 0.65, pedestrians: 36, heights: [10, 30], props: ['crate', 'barrel', 'bin', 'sign'] }
    ],
    VEHICLE_TYPES: [
      { name: 'Vireo Coupe', speed: 42, handling: 0.9, color: 0xcd6249 },
      { name: 'Meridian Sedan', speed: 36, handling: 0.78, color: 0x668c91 },
      { name: 'Solano Cab', speed: 35, handling: 0.8, color: 0xe9ae36, taxi: true },
      { name: 'Hauler Pickup', speed: 32, handling: 0.65, color: 0x73876a },
      { name: 'Cargo Van', speed: 28, handling: 0.56, color: 0xdec9a4 },
      { name: 'Tide Runner GT', speed: 56, handling: 1.05, color: 0x28b6a5 }
    ],
    policeCallsigns: { ground: ['PATROL 2', 'PATROL 5', 'UNIT 7', 'UNIT 9', 'UNIT 12'], roadblock: ['BLOCKADE 1', 'BLOCKADE 2'], air: ['AIR ONE'] }
  };
}());
