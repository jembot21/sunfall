(function () {
  'use strict';
  const SF = window.SF, T = THREE, C = SF.CONFIG;
  const world = SF.world = {
    spawn: { x: -335, y: 0.55, z: -241, heading: Math.PI / 2 },
    safehouse: { x: -345, y: 0.55, z: -241, district: 'Palma Strand' },
    markers: [
      { id: 'safehouse', kind: 'safehouse', name: 'Palma apartment', x: -345, z: -241 },
      { id: 'crew', kind: 'mission', name: 'Meet the crew', x: -280, z: -241 },
      { id: 'marina', kind: 'activity', name: 'Marina run', x: -30, z: -223 },
      { id: 'port', kind: 'mission', name: 'Port business', x: 280, z: 223 },
      { id: 'garage', kind: 'activity', name: 'Hillcrest garage', x: 20, z: 115 }
    ],
    trafficSpawns: [], pedestrianSpawns: [], districtTriggers: [], parkingSpots: SF.city.parkingSpots
  };
  world.build = function (scene) {
    if (world.scene) return world;
    world.scene = scene;
    const ground = new T.Mesh(SF.assets.plane, SF.assets.standard({ color: 0x9c8965, roughness: 1 }));
    ground.scale.set(1450, 850, 1);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.12, 150); ground.receiveShadow = true; scene.add(ground);
    const beach = new T.Mesh(SF.assets.plane, SF.assets.standard({ color: 0xdcb781, roughness: 1 }));
    beach.scale.set(1100, 90, 1);
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, -0.07, -305); beach.receiveShadow = true; scene.add(beach);
    const waterGeometry = new T.PlaneGeometry(2700, 1550, 100, 70); waterGeometry.rotateX(-Math.PI / 2);
    const water = SF.city.water = new T.Mesh(waterGeometry, SF.assets.standard({ color: C.palette.sea, roughness: 0.32, metalness: 0.32 }));
    water.position.set(0, -0.5, -1120); scene.add(water);
    const positions = waterGeometry.attributes.position, original = new Float32Array(positions.array);
    world.update = function (seconds) {
      for (let i = 0; i < positions.count; i++) { const x = original[i * 3], z = original[i * 3 + 2]; positions.setY(i, Math.sin(x * 0.035 + seconds * 0.8) * 0.22 + Math.sin(z * 0.063 + seconds * 1.1) * 0.14); }
      positions.needsUpdate = true;
      // The small waves retain their near-up normals, avoiding a full normal rebuild each frame.
    };
    // Keep the sky in the renderer's clear/background path. A camera-centered
    // shader dome can cover the full viewport and hide every world object.
    scene.background = new T.Color(C.palette.horizon);
    SF.city.build(scene);
    const rng = SF.random.seeded(C.seed + 2), bounds = SF.city.bounds, block = C.street.blockSize;
    C.districts.forEach((district, i) => {
      const col = i % 3, row = Math.floor(i / 3), minX = bounds.minX + col * block * 3, minZ = bounds.minZ + row * block * 3;
      world.districtTriggers.push({ name: district.name, minX, maxX: minX + block * 3, minZ, maxZ: minZ + block * 3 });
      const strips = SF.city.sidewalks.filter(strip => strip.district === district.name);
      for (let p = 0; p < district.pedestrians; p++) {
        const strip = rng.pick(strips), offset = rng.range(-strip.length / 2 + 4, strip.length / 2 - 4);
        world.pedestrianSpawns.push({ x: strip.x + (strip.axis === 'x' ? offset : 0), y: 0.36, z: strip.z + (strip.axis === 'z' ? offset : 0), district: district.name, weight: district.density, heading: strip.axis === 'z' ? 0 : Math.PI / 2 });
      }
      // Spawn samples live on travel lanes, clear of the parked-car lane and junction mouths.
      for (let p = 0; p < Math.round(24 * district.density); p++) {
        const x = minX + rng.int(0, 2) * block + rng.range(19, block - 19), z = minZ + rng.int(0, 2) * block;
        const side = rng.chance(0.5) ? 1 : -1;
        world.trafficSpawns.push({ x, y: 0.15, z: z + side * 2.5, heading: side > 0 ? Math.PI / 2 : -Math.PI / 2, district: district.name, weight: district.density });
      }
    });
    return world;
  };
}());
