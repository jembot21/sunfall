(function () {
  'use strict';
  var SF = window.SF, C = SF.CONFIG, S = C.street, T = window.THREE;
  var world = SF.world = {
    scene: null, spawn: { x: -516, y: 0.24, z: 276.5, heading: Math.PI / 2, district: 'palma' },
    safehouse: { id: 'palma-safehouse', name: 'Palma Apartment', x: -511, y: 0.24, z: 273.5, district: 'palma' },
    districtTriggers: [], trafficSpawns: [], pedestrianSpawns: [], parkingSpots: [],
    markers: [
      { id: 'crew-meet', kind: 'mission', name: 'The first call', x: -499, y: 0.24, z: 276.5, district: 'palma' },
      { id: 'marina-work', kind: 'activity', name: 'Marina jobs', x: -499, y: 0.24, z: -299.5, district: 'marina' },
      { id: 'oldtown-work', kind: 'activity', name: 'Old Town jobs', x: -211, y: 0.24, z: 180.5, district: 'oldtown' },
      { id: 'downtown-work', kind: 'mission', name: 'Downtown contact', x: -115, y: 0.24, z: -203.5, district: 'downtown' },
      { id: 'hillcrest-work', kind: 'activity', name: 'Hillcrest lookout', x: 365, y: 0.24, z: 372.5, district: 'hillcrest' },
      { id: 'port-work', kind: 'mission', name: 'Port contact', x: 365, y: 0.24, z: -299.5, district: 'port' }
    ]
  };
  world.build = function (scene) {
    if (world.scene) return world;
    world.scene = scene;
    var ground = new T.Mesh(new T.PlaneGeometry(1240, 1160), new T.MeshStandardMaterial({ color: '#88775c', roughness: 1 }));
    ground.name = 'City foundation'; ground.rotation.x = -Math.PI / 2; ground.position.set(20, -0.13, 0); ground.receiveShadow = true; scene.add(ground);
    SF.city.build(scene);
    world.parkingSpots = SF.city.parkingSpots;
    C.districts.forEach(function (d) {
      world.districtTriggers.push({ id: d.id, name: d.name,
        minX: S.originX + d.col[0] * S.blockSize, maxX: S.originX + d.col[1] * S.blockSize,
        minZ: S.originZ + d.row[0] * S.blockSize, maxZ: S.originZ + d.row[1] * S.blockSize,
        weight: d.density, pedestrianTarget: d.pedestrians });
    });
    SF.city.streets.forEach(function (street) {
      var district = SF.city.districtAt(street.x, street.z);
      if (!district) district = SF.city.districtAt(street.x - 1, street.z - 1);
      if (!district) return;
      [-1, 1].forEach(function (direction) {
        var horizontal = street.axis === 'x', lane = S.laneWidth / 2;
        world.trafficSpawns.push({ streetId: street.id, district: district.id, weight: district.density,
          x: street.x + (horizontal ? 0 : -direction * lane), y: 0,
          z: street.z + (horizontal ? direction * lane : 0),
          heading: horizontal ? direction * Math.PI / 2 : (direction > 0 ? 0 : Math.PI), direction: direction });
      });
    });
    SF.city.sidewalks.forEach(function (strip) {
      var d = C.districts.find(function (district) { return district.id === strip.district; });
      [-12, 12].forEach(function (offset) {
        world.pedestrianSpawns.push({ x: strip.x + (strip.axis === 'x' ? offset : 0), y: strip.y,
          z: strip.z + (strip.axis === 'z' ? offset : 0), district: strip.district,
          weight: d.density, axis: strip.axis, length: strip.length });
      });
    });
    return world;
  };
  world.districtAt = function (x, z) { return SF.city.districtAt(x, z); };
  // Runtime systems can use the same weighted tables without consuming the city RNG.
  world.pickSpawn = function (kind, rng) {
    var table = kind === 'traffic' ? world.trafficSpawns : world.pedestrianSpawns;
    if (!table.length) return null;
    rng = rng || SF.random;
    var total = table.reduce(function (sum, item) { return sum + item.weight; }, 0), roll = rng.range(0, total);
    for (var i = 0; i < table.length; i++) { roll -= table[i].weight; if (roll <= 0) return table[i]; }
    return table[table.length - 1];
  };
  world.update = function (elapsed, dt) { SF.city.update(elapsed, dt); };
}());
