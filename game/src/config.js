/* Sunfall foundation. World units are metres; Y is up, the coast is west. */
(function (S) {
  'use strict';
  S.Config = Object.freeze({
    seed: 2047,
    palette: Object.freeze({
      skyAmber: 0xffba68, skyCoral: 0xed796d, skyViolet: 0x554975,
      sea: 0x117f83, seaHighlight: 0x49b5ac, sand: 0xdca96b,
      concrete: 0xc99373, asphalt: 0x51424a, sidewalk: 0xb88b74,
      cash: '#ffc56b', danger: '#ff7069', objective: '#50ebce',
      window: 0xffcf80, ink: '#171b2c', fog: 0xc48079
    }),
    city: Object.freeze({
      columns: 9, rows: 9, block: 64, road: 14, sidewalk: 4,
      minX: -288, maxX: 288, minZ: -288, maxZ: 288,
      coastX: -310, beachWidth: 48, seaX: -358, groundY: 0,
      buildingInset: 10, floorHeight: 3.4, lampSpacing: 64
    }),
    districts: Object.freeze([
      { id: 'palma', name: 'Palma Strand', col: [0, 2], row: [0, 3],
        colors: [0xe3a36e, 0xd57869, 0xc6a05d], height: [7, 16], density: 0.78,
        props: { palms: 0.95, benches: 0.7, crates: 0.05 } },
      { id: 'marina', name: 'Marina', col: [0, 2], row: [4, 8],
        colors: [0xc58371, 0x5e9994, 0xd8ac7b], height: [9, 23], density: 0.88,
        props: { palms: 0.8, benches: 0.7, crates: 0.25 } },
      { id: 'oldtown', name: 'Old Town', col: [3, 5], row: [0, 3],
        colors: [0xc9694f, 0xd59659, 0xa96164], height: [10, 22], density: 0.96,
        props: { palms: 0.4, benches: 0.65, crates: 0.2 } },
      { id: 'downtown', name: 'Downtown', col: [3, 5], row: [4, 8],
        colors: [0x547c86, 0xa06e78, 0x9b826e], height: [25, 78], density: 0.98,
        props: { palms: 0.55, benches: 0.7, crates: 0.1 } },
      { id: 'hillcrest', name: 'Hillcrest', col: [6, 8], row: [0, 3],
        colors: [0xd8a477, 0xbd826b, 0xb39970], height: [7, 18], density: 0.7,
        props: { palms: 0.85, benches: 0.3, crates: 0.05 } },
      { id: 'port', name: 'Ironworks Port', col: [6, 8], row: [4, 8],
        colors: [0x966354, 0x647f7c, 0xb77e48], height: [8, 25], density: 0.88,
        props: { palms: 0.1, benches: 0.1, crates: 0.95 } }
    ]),
    render: Object.freeze({
      fov: 58, near: 0.2, far: 1450, pixelRatio: 1.75,
      fogNear: 170, fogFar: 920, exposure: 0.92,
      shadowSize: 1024, shadowRange: 145, sunIntensity: 1.8,
      hemisphereIntensity: 0.7, sunPosition: [-190, 150, -110]
    }),
    camera: Object.freeze({
      distance: 10, height: 5, lookHeight: 1.5, followRate: 5,
      titleRadius: 410, titleHeight: 175, titleSpeed: 0.025
    }),
    water: Object.freeze({ amplitude: 0.32, speed: 0.7, segments: 60 }),
    spawn: Object.freeze({ x: -224, y: 0.2, z: -249, heading: Math.PI }),
    tuning: Object.freeze({ trafficSpacing: 64, pedestrianSpacing: 32,
      districtCheckInterval: 0.25, markerHeight: 3, maxDelta: 0.05 })
  });
})(window.Sunfall = window.Sunfall || {});
