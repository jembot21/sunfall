(function (SF) {
  'use strict';
  const T = globalThis.THREE;
  const keys = Object.create(null);
  const palettes = {
    skins: [0x754a39, 0x9b6448, 0xc28c67, 0xe1b48e, 0x573c34],
    shirts: [0xd94c3b, 0x287b77, 0xd3a13b, 0x3c5978, 0xe8dfc8, 0x793c78, 0x65a16d],
    pants: [0x273548, 0x393a39, 0x59615d, 0x725642, 0x334b50]
  };
  // Warm the finite actor palette before any pedestrian/figure loop.
  [...Object.values(palettes).flat(), 0xe1b05b, 0x273849, 0xb87a55, 0x29201e,
    0x261d1a, 0x24272a, 0x24394d, 0x171f28, 0x9a6849].forEach(color => SF.assets.standard({ color, roughness: 0.72 }));
  const player = SF.player = {
    mesh: null, health: 100, cash: 250, vehicle: null, speed: 0,
    heading: 0, running: false, dead: false, keys, radius: 0.38,
    position: T ? new T.Vector3() : { x: 0, y: 0, z: 0 },
    velocity: T ? new T.Vector3() : null
  };
  // Actor modules use these adapters; the world owns the actual layout.
  const helpers = player.helpers = {
    palettes,
    random() {
      const r = SF.random;
      const value = typeof r === 'function' ? r() :
        r && typeof r.float === 'function' ? r.float(0, 1) :
        r && typeof r.random === 'function' ? r.random() :
        r && typeof r.next === 'function' ? r.next() : Math.random();
      return Math.max(0, Math.min(0.999999, Number(value) || 0));
    },
    pick(list) { return list[Math.floor(helpers.random() * list.length)]; },
    bounds() {
      const b = SF.city && SF.city.bounds || SF.world && SF.world.bounds || {};
      const c = SF.CONFIG || {};
      const half = Number(c.CITY_SIZE || c.WORLD_SIZE || 1000) / 2;
      return { minX: b.minX ?? b.min?.x ?? -half, maxX: b.maxX ?? b.max?.x ?? half,
        minZ: b.minZ ?? b.min?.z ?? -half, maxZ: b.maxZ ?? b.max?.z ?? half };
    },
    streets() {
      const g = SF.city && (SF.city.streetGrid || SF.city.grid || SF.city.streets) ||
        SF.world && (SF.world.streetGrid || SF.world.streets) || {};
      const coords = a => Array.isArray(a) ? a.map(v => typeof v === 'number' ? v : v.coordinate ?? v.position ?? v.x ?? v.z).filter(Number.isFinite) : [];
      let x = coords(g.x || g.xs || g.vertical || g.roadsX);
      let z = coords(g.z || g.zs || g.horizontal || g.roadsZ);
      if (Array.isArray(g)) {
        x = g.filter(s => s.axis === 'z' || s.orientation === 'vertical').map(s => s.x ?? s.position?.x).filter(Number.isFinite);
        z = g.filter(s => s.axis === 'x' || s.orientation === 'horizontal').map(s => s.z ?? s.position?.z).filter(Number.isFinite);
      }
      const b = helpers.bounds();
      if (!x.length) for (let p = b.minX + 60; p < b.maxX - 30; p += 90) x.push(p);
      if (!z.length) for (let p = b.minZ + 60; p < b.maxZ - 30; p += 90) z.push(p);
      return { x: [...new Set(x)].sort((a, b) => a - b), z: [...new Set(z)].sort((a, b) => a - b) };
    },
    box(w, h, d, color, parent, x = 0, y = 0, z = 0) {
      const m = new T.Mesh(SF.assets.box, SF.assets.standard({ color, roughness: 0.72 }));
      m.scale.set(w, h, d);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      parent.add(m); return m;
    },
    figure(options = {}) {
      const root = new T.Group();
      const shirt = options.shirt ?? 0xe1b05b, pants = options.pants ?? 0x273849;
      const skin = options.skin ?? 0xb87a55;
      helpers.box(0.48, 0.59, 0.27, shirt, root, 0, 1.16, 0);
      helpers.box(0.29, 0.32, 0.28, skin, root, 0, 1.64, 0);
      helpers.box(0.31, 0.10, 0.29, options.hair ?? 0x29201e, root, 0, 1.82, -0.01);
      const arms = [], legs = [];
      for (const side of [-1, 1]) {
        const arm = new T.Group(); arm.position.set(side * 0.32, 1.41, 0); root.add(arm);
        helpers.box(0.16, 0.30, 0.18, shirt, arm, 0, -0.15, 0);
        const elbow = new T.Group(); elbow.position.y = -0.30; arm.add(elbow);
        helpers.box(0.14, 0.28, 0.15, skin, elbow, 0, -0.14, 0);
        helpers.box(0.15, 0.14, 0.17, skin, elbow, 0, -0.34, 0);
        arm.userData.elbow = elbow; arms.push(arm);
        const leg = new T.Group(); leg.position.set(side * 0.135, 0.89, 0); root.add(leg);
        helpers.box(0.21, 0.40, 0.23, pants, leg, 0, -0.20, 0);
        const knee = new T.Group(); knee.position.y = -0.40; leg.add(knee);
        helpers.box(0.19, 0.36, 0.21, pants, knee, 0, -0.18, 0);
        helpers.box(0.22, 0.13, 0.35, 0x24272a, knee, 0, -0.40, 0.06);
        leg.userData.knee = knee; legs.push(leg);
      }
      root.userData.arms = arms; root.userData.legs = legs;
      root.userData.phase = helpers.random() * Math.PI * 2;
      return root;
    },
    animate(mesh, dt, speed, running = false) {
      const u = mesh.userData;
      u.phase += dt * (speed > 0.1 ? running ? 12 : 8 : 1.8);
      const amplitude = speed > 0.1 ? running ? 0.9 : 0.55 : 0.025;
      u.arms.forEach((a, i) => {
        a.rotation.x = Math.sin(u.phase + i * Math.PI) * amplitude;
        a.userData.elbow.rotation.x = -0.12 - (running ? 0.55 : 0.12);
      });
      u.legs.forEach((l, i) => {
        const wave = Math.sin(u.phase + i * Math.PI);
        l.rotation.x = -wave * amplitude;
        l.userData.knee.rotation.x = Math.max(0, wave) * amplitude * 0.9;
      });
      mesh.scale.y = 1 + Math.sin(u.phase) * (speed > 0.1 ? 0.008 : 0.006);
    },
    clamp(position, margin = 1) {
      const b = helpers.bounds();
      position.x = Math.max(b.minX + margin, Math.min(b.maxX - margin, position.x));
      position.z = Math.max(b.minZ + margin, Math.min(b.maxZ - margin, position.z));
      return position;
    }
  };
  let bound = false;
  player.init = function (options = {}) {
    if (player.mesh) return player;
    if (!T || !SF.render?.scene) return player;
    player.mesh = helpers.figure(); player.mesh.name = 'Sunfall player';
    const spawn = options.position || SF.world?.playerSpawn || SF.city?.playerSpawn || SF.world?.spawn;
    if (spawn) {
      player.position.set(spawn.x ?? 0, spawn.y ?? 0, spawn.z ?? 0);
      player.heading = options.heading ?? spawn.heading ?? player.heading;
      if (SF.input && Number.isFinite(player.heading)) SF.input.yaw = player.heading + Math.PI;
    }
    player.mesh.position.copy(player.position); SF.render.scene.add(player.mesh);
    player.mesh.rotation.y = player.heading;
    if (!bound && typeof window !== 'undefined') {
      bound = true;
      window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyE' && !e.repeat) player.interact();
      });
      window.addEventListener('keyup', e => { keys[e.code] = false; });
      window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    }
    return player;
  };
  player.enterVehicle = function (car) {
    if (!car || car.locked || car.driver === player || player.dead) return false;
    if (player.position.distanceTo(car.mesh.position) > 4.5) return false;
    SF.vehicles?.steal(car);
    car.driver = player; player.vehicle = car; player.mesh.visible = false;
    player.position.copy(car.mesh.position); return true;
  };
  player.exitVehicle = function () {
    const car = player.vehicle; if (!car) return false;
    // Refuse a moving exit rather than launching the player through traffic.
    if (Math.abs(car.speed) > 4) return false;
    const choices = SF.vehicles.entryPoints(car);
    const b = helpers.bounds();
    const p = choices.find(p => p.x > b.minX + 1 && p.x < b.maxX - 1 && p.z > b.minZ + 1 && p.z < b.maxZ - 1);
    if (!p) return false;
    player.position.copy(p); player.position.y = 0;
    car.driver = null; player.vehicle = null; player.mesh.visible = true;
    player.mesh.position.copy(player.position); return true;
  };
  player.interact = function () {
    if (player.vehicle) return player.exitVehicle();
    const car = SF.vehicles?.nearest(player.position, 4.5);
    return car ? player.enterVehicle(car) : false;
  };
  player.damage = function (amount) {
    player.health = Math.max(0, player.health - Math.max(0, amount));
    player.dead = player.health === 0;
    return player.health;
  };
  player.addCash = amount => (player.cash = Math.max(0, player.cash + amount));
  player.update = function (dt, input = {}) {
    player.init(); if (!player.mesh) return;
    dt = Math.min(0.05, Math.max(0, dt || 0));
    if (player.vehicle) {
      player.position.copy(player.vehicle.mesh.position);
      player.speed = Math.abs(player.vehicle.speed); return;
    }
    player.running = !!(input.run ?? (keys.ShiftLeft || keys.ShiftRight));
    let x = input.x ?? ((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0));
    let z = input.z ?? ((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0));
    const n = Math.hypot(x, z); if (n > 1) { x /= n; z /= n; }
    const camera = SF.render.camera;
    const yaw = input.cameraYaw ?? (camera ? Math.atan2(camera.position.x - player.position.x, camera.position.z - player.position.z) : 0);
    const speed = player.dead ? 0 : player.running ? 7.5 : 3.4;
    player.velocity.set((x * Math.cos(yaw) - z * Math.sin(yaw)) * speed, 0,
      (-x * Math.sin(yaw) - z * Math.cos(yaw)) * speed);
    player.position.addScaledVector(player.velocity, dt); helpers.clamp(player.position, player.radius);
    player.speed = player.velocity.length();
    if (player.speed > 0.1) player.heading = Math.atan2(player.velocity.x, player.velocity.z);
    player.mesh.position.copy(player.position); player.mesh.rotation.y = player.heading;
    helpers.animate(player.mesh, dt, player.speed, player.running);
  };
})(globalThis.SF = globalThis.SF || {});
