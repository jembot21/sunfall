(function (S) {
  'use strict';
  S.createWorld = function (scene) {
    const T = THREE, C = S.Config, G = C.city, P = C.palette;
    const city = S.createCity();
    scene.add(city.group);
    function plane(name, width, depth, x, y, z, color) {
      const mesh = new T.Mesh(new T.PlaneGeometry(width, depth),
        new T.MeshStandardMaterial({ color, roughness: 0.95 }));
      mesh.name = name; mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z); mesh.receiveShadow = true;
      scene.add(mesh); return mesh;
    }
    plane('warm asphalt city bed', 650, 660, 17, -0.015, 0, P.asphalt);
    plane('coastal promenade', 22, 660, -299, 0.02, 0, P.concrete);
    plane('Palma beach', G.beachWidth, 900, -334, -0.35, 0, P.sand);
    // Shader sky uses world height: violet overhead, coral mid-sky, amber horizon.
    const sky = new T.Mesh(new T.SphereGeometry(1300, 32, 20), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { amber: { value: new T.Color(P.skyAmber) }, coral: { value: new T.Color(P.skyCoral) },
        violet: { value: new T.Color(P.skyViolet) } },
      vertexShader: 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 vDirection; uniform vec3 amber; uniform vec3 coral; uniform vec3 violet; void main(){float h=normalize(vDirection).y; vec3 c=mix(amber,coral,smoothstep(-0.05,0.38,h)); c=mix(c,violet,smoothstep(0.25,0.95,h));gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
    }));
    sky.name = 'Solano sunset sky'; sky.frustumCulled = false; scene.add(sky);
    const sun = new T.Mesh(new T.SphereGeometry(22, 24, 16),
      new T.MeshBasicMaterial({ color: 0xffdb91, fog: false }));
    sun.position.set(-950, 235, -550); scene.add(sun);
    // Distant land silhouettes give the bay a horizon without gameplay obstacles.
    const hills = new T.Group(); hills.name = 'distant inland ridge';
    const hillGeometry = new T.SphereGeometry(1, 10, 7);
    const hillMaterial = new T.MeshStandardMaterial({ color: 0x876d79, roughness: 1 });
    const rng = S.Random(C.seed).fork('horizon');
    for (let i = 0; i < 13; i++) {
      const hill = new T.Mesh(hillGeometry, hillMaterial);
      hill.position.set(550 + rng.range(-35, 75), -12, -650 + i * 110);
      hill.scale.set(rng.range(90, 150), rng.range(55, 115), 100); hills.add(hill);
    }
    scene.add(hills);
    const districts = C.districts.map(d => ({
      id: d.id, name: d.name,
      minX: G.minX + d.col[0] * G.block, maxX: G.minX + (d.col[1] + 1) * G.block,
      minZ: G.minZ + d.row[0] * G.block, maxZ: G.minZ + (d.row[1] + 1) * G.block
    }));
    const trafficSpawns = [], pedestrianSpawns = [];
    for (let line = 0; line <= G.columns; line++) {
      const roadX = G.minX + line * G.block;
      for (let segment = 0; segment < G.rows; segment++) {
        const z = G.minZ + (segment + 0.5) * G.block;
        trafficSpawns.push({ x: roadX - 3, y: 0.1, z, heading: 0 },
          { x: roadX + 3, y: 0.1, z, heading: Math.PI },
          { x: z, y: 0.1, z: roadX - 3, heading: Math.PI / 2 },
          { x: z, y: 0.1, z: roadX + 3, heading: -Math.PI / 2 });
        // Pavement edge, outside the building footprints and trunk positions.
        if (line < G.columns) pedestrianSpawns.push({ x: roadX + 8.5, y: 0.24, z });
      }
    }
    const safehouse = { id: 'strand-safehouse', name: 'Strand apartment', x: -224, y: 0.24, z: -240, heading: Math.PI };
    const missionMarkers = [
      { id: 'first-light', name: 'First Light', x: -224, y: 0.24, z: -211, district: 'palma' },
      { id: 'marina-contact', name: 'Marina contact', x: -288, y: 0.24, z: 64, district: 'marina' },
      { id: 'old-debts', name: 'Old debts', x: -32, y: 0.24, z: -160, district: 'oldtown' }
    ];
    const activityMarkers = [
      { id: 'hill-run', type: 'race', x: 160, y: 0.1, z: -224 },
      { id: 'port-delivery', type: 'delivery', x: 288, y: 0.1, z: 192 },
      { id: 'downtown-garage', type: 'garage', x: 32, y: 0.24, z: 85 }
    ];
    const markerGroup = new T.Group(); markerGroup.name = 'foundation location markers';
    const markerMaterial = new T.MeshBasicMaterial({ color: P.objective, transparent: true, opacity: 0.8, depthWrite: false });
    missionMarkers.concat([safehouse]).forEach(point => {
      const ring = new T.Mesh(new T.TorusGeometry(1.4, 0.09, 6, 24), markerMaterial);
      ring.rotation.x = -Math.PI / 2; ring.position.set(point.x, point.y + 0.08, point.z);
      markerGroup.add(ring);
    });
    scene.add(markerGroup);
    const world = {
      city, districts, trafficSpawns, pedestrianSpawns, safehouse,
      missionMarkers, activityMarkers, spawn: Object.assign({}, C.spawn),
      collisions: city.collisions, bounds: city.bounds,
      districtAt: function (position) {
        return districts.find(d => position.x >= d.minX && position.x < d.maxX &&
          position.z >= d.minZ && position.z < d.maxZ) || null;
      },
      update: function (time, position) {
        city.update(time);
        if (!position) return;
        const district = world.districtAt(position);
        const id = district ? district.id : 'coast';
        if (id !== world.currentDistrict) {
          world.currentDistrict = id;
          window.dispatchEvent(new CustomEvent('sunfall:district', {
            detail: { id, name: district ? district.name : 'Solano Coast' }
          }));
        }
      }
    };
    return world;
  };
})(window.Sunfall = window.Sunfall || {});
