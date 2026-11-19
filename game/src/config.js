window.SF = window.SF || {};
SF.CONFIG = {
  grid: { block: 64, road: 18, blocks: 7, coastX: -260, halfCity: 287 },
  palette: {
    sky: { top: '#2a1a5e', mid: '#b23a8c', horizon: '#ff8c42', fog: '#7a4a8c', sun: '#ffb36b' },
    buildings: ['#e4572e','#f2a03d','#17bebb','#e56399','#7fb069','#5b8e7d','#e9c46a','#2a9d8f','#ef476f','#118ab2','#ffd166','#06d6a0','#c77dff','#ff7b54','#4cc9f0'],
    cars: ['#ff5a5f','#ffbd35','#23c6b8','#a56eff','#39a0ed','#ff76bd','#89d84f','#f26a32','#f7f4df','#31d69b'],
    sand: '#e8c07a', asphalt: '#33323e', marking: '#e6d8ad', sidewalk: '#b6a7a2', ocean: '#3b9eae', palm: '#319b67'
  },
  districts: [
    { name: 'Palma Strand', x1: -360, x2: -220, z1: -250, z2: 250 },
    { name: 'Old Port', x1: -220, x2: -30, z1: 65, z2: 290 },
    { name: 'Downtown', x1: -30, x2: 105, z1: -100, z2: 100 },
    { name: 'Marina', x1: -220, x2: -30, z1: -290, z2: 65 },
    { name: 'Market Row', x1: 105, x2: 290, z1: -95, z2: 95 },
    { name: 'The Hills', x1: 105, x2: 290, z1: -290, z2: -95 },
    { name: 'Airport Flats', x1: 105, x2: 290, z1: 95, z2: 290 },
    { name: 'North Beach', x1: -420, x2: -220, z1: -320, z2: -250 }
  ],
  wantedThresholds: [0, 18, 44, 82, 132, 205],
  bustedFee: 450,
  wastedFee: 280,
  prices: { pistol: 450, smg: 1250, shotgun: 1800, rifle: 3200, ammo: 75, armour: 250, repair: 180 },
  repLevels: [
    { name: 'Nobody', threshold: 0 }, { name: 'Runner', threshold: 100 },
    { name: 'Hustler', threshold: 300 }, { name: 'Operator', threshold: 700 },
    { name: 'Shot Caller', threshold: 1400 }, { name: 'Bay Legend', threshold: 2600 }
  ]
};
