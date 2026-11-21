/* Sunfall v3 · round 9 · shared source of truth. World units are metres. */
(function () {
  'use strict';
  var SF = window.SF = window.SF || {};
  SF.CONFIG = {
    version: '3.0.0-r9', seed: 390921,
    palette: {
      skyTop: '#443653', skyMiddle: '#ca6264', horizon: '#f39b58',
      sun: '#ffcb79', sea: '#126c70', seaDeep: '#134954', sand: '#dcb17a',
      asphalt: '#302a29', sidewalk: '#b6a58d', curb: '#e3c8a0',
      lane: '#edd2a0', window: '#ffcb70', foliage: '#3c6949',
      ink: '#121a22', cash: '#ffc46b', danger: '#ff7064', objective: '#45ead3'
    },
    street: {
      blockSize: 96, roadWidth: 18, laneWidth: 4.5, sidewalkWidth: 5,
      curbHeight: 0.22, gridColumns: 12, gridRows: 10, originX: -576,
      originZ: -480, coastX: -620, dashLength: 4, dashGap: 5
    },
    districts: [
      { id: 'palma', name: 'Palma Strand', col: [0, 3], row: [5, 10], density: 1.00,
        colors: ['#e5a26f', '#eec28c', '#cf7a64', '#e4b9a1'], height: [8, 24],
        props: ['planter', 'bench', 'bin', 'news', 'bus', 'sign'], pedestrians: 112 },
      { id: 'marina', name: 'Marina', col: [0, 3], row: [0, 5], density: 0.84,
        colors: ['#e7cbb0', '#d49a76', '#b4bcab', '#e3b48b'], height: [9, 28],
        props: ['planter', 'bench', 'sign', 'bin', 'bus'], pedestrians: 80 },
      { id: 'oldtown', name: 'Old Town', col: [3, 7], row: [5, 10], density: 0.88,
        colors: ['#d49063', '#c47155', '#d9ad73', '#e4be92'], height: [8, 20],
        props: ['news', 'bench', 'planter', 'bin', 'sign'], pedestrians: 88 },
      { id: 'downtown', name: 'Downtown', col: [3, 7], row: [0, 5], density: 0.91,
        colors: ['#b59079', '#b9a898', '#897d7e', '#cca18a'], height: [26, 92],
        props: ['bus', 'news', 'bin', 'planter', 'sign'], pedestrians: 96 },
      { id: 'hillcrest', name: 'Hillcrest', col: [7, 12], row: [5, 10], density: 0.55,
        colors: ['#e2ba91', '#c7ab8a', '#d3ae9c', '#e6c5a4'], height: [7, 17],
        props: ['planter', 'bench', 'sign', 'bin'], pedestrians: 48 },
      { id: 'port', name: 'Ironworks Port', col: [7, 12], row: [0, 5], density: 0.66,
        colors: ['#a17c66', '#8e8980', '#b49475', '#a36d59'], height: [9, 26],
        props: ['crate', 'barrel', 'bin', 'sign', 'bus'], pedestrians: 56 }
    ],
    VEHICLE_TYPES: [
      { id: 'vireo', name: 'Vireo Coupe', speed: 46, handling: 0.86, color: '#bc5748' },
      { id: 'meridian', name: 'Meridian Sedan', speed: 40, handling: 0.72, color: '#426a72' },
      { id: 'cab', name: 'Solano Cab', speed: 39, handling: 0.74, color: '#e8ad39', taxi: true },
      { id: 'hauler', name: 'Hauler Pickup', speed: 35, handling: 0.60, color: '#88775d' },
      { id: 'cargo', name: 'Cargo Van', speed: 30, handling: 0.53, color: '#d5c3a8' },
      { id: 'tide', name: 'Tide Runner GT', speed: 61, handling: 0.95, color: '#2aa49c' }
    ],
    tuning: {
      ambientTrafficCount: 108, parkedCarFillRate: 0.78, maxPedestrians: 480,
      pixelRatioCap: 1.5, shadowMapSize: 2048, exposure: 1.15,
      cameraDistance: 10, cameraHeight: 5.5, cameraSmoothing: 6,
      fogNear: 210, fogFar: 820, farClip: 1350
    },
    police: {
      callsigns: { ground: ['PATROL 2', 'PATROL 5', 'UNIT 7', 'UNIT 9', 'UNIT 12'],
        roadblock: ['BLOCKADE 1', 'BLOCKADE 2'], air: ['AIR ONE'] }
    }
  };
}());
