window.SF = window.SF || {};
SF.CONFIG = {
  version: 2,
  city: { name: 'Solano Bay', sunset: '19:24', gridStep: 82, cityEdge: 287, coastX: -260 },
  grid: { block: 64, road: 18, blocks: 7, coastX: -260, halfCity: 287 },
  palette: {
    sky: { top: '#44365e', mid: '#bd6965', horizon: '#e99c55', fog: '#d38b70', sun: '#ffd08a' },
    buildings: ['#c48a69','#e0b080','#d78d72','#94aaa2','#a9afa4','#cf9e77','#828c91','#d3a276','#8d817d','#a9c0b8','#dfc08c'],
    cars: ['#bd5145','#e5a84f','#2a9d9a','#5d7188','#637d69','#e7ddc8','#b87b58','#f1c45e'],
    sand: '#e5c48d', asphalt: '#5a5149', marking: '#f0dfbd', sidewalk: '#c7b39a', ocean: '#247f87', palm: '#48775a',
    teal: '#42d8cc', coral: '#f26357', amber: '#f4b75e'
  },
  districts: [
    { name: 'Palma Strand', x1: -420, x2: -220, z1: -320, z2: 320 },
    { name: 'Marina', x1: -220, x2: -30, z1: -320, z2: 65 },
    { name: 'Old Town', x1: -220, x2: -30, z1: 65, z2: 320 },
    { name: 'Downtown', x1: -30, x2: 105, z1: -320, z2: 320 },
    { name: 'Hillcrest', x1: 105, x2: 290, z1: -320, z2: 95 },
    { name: 'Ironworks Port', x1: 105, x2: 290, z1: 95, z2: 320 }
  ],
  wantedThresholds: [0, 18, 44, 82, 132, 205],
  bustedFee: 450, wastedFee: 280,
  prices: { pistol: 450, smg: 1250, shotgun: 1800, rifle: 3200, ammo: 75, armour: 250, repair: 180 },
  repLevels: [
    { name: 'New Face', threshold: 0 }, { name: 'Runner', threshold: 100 },
    { name: 'Hustler', threshold: 300 }, { name: 'Operator', threshold: 700 },
    { name: 'Shot Caller', threshold: 1400 }, { name: 'Bay Legend', threshold: 2600 }
  ],
  safehouses: [{ name: 'Palma Strand Flat', x: -272, z: 42 }, { name: 'Old Town Warehouse', x: -117, z: 123 }]
};
