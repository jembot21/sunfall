(function (SF) {
  'use strict';
  const T = globalThis.THREE;
  const peds = SF.peds = { all: [], initialized: false, target: 0, fleeEvents: [] };
  const random = () => SF.player?.helpers?.random?.() ?? Math.random();
  const pick = a => a[Math.floor(random() * a.length)];
  const { skins: skinTones, shirts, pants } = SF.player.helpers.palettes;
  function districtName(d) { return String(d?.name || d?.id || d?.key || d || ''); }
  function districts() {
    const d = SF.CONFIG?.districts || SF.CONFIG?.DISTRICTS || [];
    return Array.isArray(d) ? d : Object.entries(d).map(([name, value]) => ({ name, ...(typeof value === 'object' ? value : {}) }));
  }
  function density(d) { return Number(d.pedestrians ?? d.pedestrianCount ?? d.pedDensity ?? d.people) || 20; }
  function boundsOf(d) {
    const b = d.bounds || d.rect || d;
    if (b.min && b.max) return { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z };
    return { minX: b.minX ?? b.x ?? -140, maxX: b.maxX ?? (b.x != null ? b.x + (b.width || 280) : 140),
      minZ: b.minZ ?? b.z ?? -140, maxZ: b.maxZ ?? (b.z != null ? b.z + (b.depth || b.height || 280) : 140) };
  }
  function districtAt(x, z) {
    return districts().find(d => {
      const b = boundsOf(d); return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
    }) || districts()[0] || { name: 'Solano Bay' };
  }
  function isPalma(d) { return /palma strand|palma/i.test(districtName(d)); }
  function sidewalkPoint(d, crowded = false) {
    const helpers = SF.player.helpers, grid = helpers.streets(), b = boundsOf(d);
    const xmin = Math.max(b.minX, helpers.bounds().minX + 5), xmax = Math.min(b.maxX, helpers.bounds().maxX - 5);
    const zmin = Math.max(b.minZ, helpers.bounds().minZ + 5), zmax = Math.min(b.maxZ, helpers.bounds().maxZ - 5);
    const useX = random() < 0.5;
    if (useX && grid.x.length) {
      const targetX = xmin + random() * Math.max(1, xmax - xmin);
      const road = grid.x.reduce((best, v) => Math.abs(v - targetX) < Math.abs(best - targetX) ? v : best, grid.x[0]);
      const side = pick([-1, 1]);
      return { x: road + side * (4.6 + random() * (crowded ? 2.8 : 1.2)), y: 0, z: zmin + random() * Math.max(1, zmax - zmin), heading: side < 0 ? 0 : Math.PI };
    }
    if (grid.z.length) {
      const road = pick(grid.z.filter(v => v >= zmin && v <= zmax).length ? grid.z.filter(v => v >= zmin && v <= zmax) : grid.z);
      const side = pick([-1, 1]);
      return { x: xmin + random() * Math.max(1, xmax - xmin), y: 0,
        z: road + side * (4.6 + random() * (crowded ? 2.8 : 1.2)), heading: side < 0 ? Math.PI / 2 : -Math.PI / 2 };
    }
    return { x: xmin + random() * Math.max(1, xmax - xmin), y: 0, z: zmin + random() * Math.max(1, zmax - zmin), heading: random() * Math.PI * 2 };
  }
  function propPositions() {
    const props = SF.world?.props || SF.city?.props || SF.world?.landmarks || [];
    return (Array.isArray(props) ? props : props.items || []).map(o => o.position || o).filter(p => Number.isFinite(p.x) && Number.isFinite(p.z));
  }
  function chooseSpawn(d, index) {
    const palma = isPalma(d);
    const districtBounds = boundsOf(d);
    const anchors = propPositions().filter(a => a.x >= districtBounds.minX && a.x <= districtBounds.maxX &&
      a.z >= districtBounds.minZ && a.z <= districtBounds.maxZ);
    // Palma's promenade and cafe/prop anchors receive compact groups, not one actor per block.
    if (palma && anchors.length && index % 3 !== 2) {
      const a = pick(anchors); return { x: a.x + (random() - 0.5) * 13, y: 0,
        z: a.z + (random() - 0.5) * 13, heading: random() * Math.PI * 2 };
    }
    if (palma && index % 4 === 0) {
      const b = boundsOf(d); return { x: b.minX + random() * (b.maxX - b.minX), y: 0,
        z: b.maxZ - 5 - random() * 8, heading: random() * Math.PI * 2 };
    }
    return sidewalkPoint(d, palma);
  }
  peds.create = function (options = {}) {
    if (!T || !SF.render?.scene) return null;
    const mesh = SF.player.helpers.figure({ shirt: options.shirt ?? pick(shirts), pants: options.pants ?? pick(pants),
      skin: options.skin ?? pick(skinTones), hair: options.hair ?? 0x261d1a });
    mesh.scale.setScalar(options.scale || 0.84 + random() * 0.2);
    mesh.position.set(options.x || 0, 0, options.z || 0);
    if (options.position) mesh.position.set(options.position.x, options.position.y || 0, options.position.z);
    mesh.rotation.y = options.heading ?? random() * Math.PI * 2;
    const ped = { mesh, speed: options.speed ?? 0.65 + random() * 0.55, heading: mesh.rotation.y,
      state: options.idle ? 'IDLE' : 'WALKING', idle: !!options.idle, wait: random() * 4,
      flee: 0, district: options.district || districtAt(mesh.position.x, mesh.position.z),
      home: mesh.position.clone(), calls: 0 };
    mesh.userData.pedestrian = ped; SF.render.batchActor(mesh); peds.all.push(ped); return ped;
  };
  function targetTotal() {
    const ds = districts();
    if (!ds.length) return 120;
    const total = ds.reduce((n, d) => n + density(d), 0);
    return Math.max(90, Math.min(260, total));
  }
  peds.init = function () {
    if (peds.initialized || !SF.player?.mesh || !T) return peds;
    peds.initialized = true;
    const ds = districts(), target = peds.target = targetTotal();
    let assigned = 0;
    ds.forEach((d, di) => {
      let n = Math.round(target * density(d) / ds.reduce((s, x) => s + density(x), 0));
      if (di === ds.length - 1) n = target - assigned; assigned += n;
      for (let i = 0; i < n; i++) {
        const point = chooseSpawn(d, i);
        peds.create({ position: point, district: d, idle: i % (isPalma(d) ? 12 : 18) === 0 });
      }
    });
    // A few stationary people give benches and transit stops a human scale.
    const stops = SF.world?.busStops || SF.city?.busStops || SF.world?.benches || SF.city?.benches || [];
    for (const s of Array.isArray(stops) ? stops.slice(0, 32) : []) {
      const q = s.position || s; peds.create({ position: { x: q.x + 1, z: q.z + 1 }, idle: true });
    }
    return peds;
  };
  peds.scatterNear = function (position, radius = 12, duration = 4) {
    for (const ped of peds.all) {
      const d = ped.mesh.position.distanceTo(position);
      if (d > radius) continue;
      const away = ped.mesh.position.clone().sub(position);
      if (away.lengthSq() < 0.01) away.set(random() - 0.5, 0, random() - 0.5);
      away.normalize(); ped.heading = Math.atan2(away.x, away.z); ped.flee = Math.max(ped.flee, duration);
      ped.state = 'FLEEING'; ped.idle = false;
    }
  };
  peds.reactToCrime = function (position, radius = 36) { peds.scatterNear(position, radius, 7); };
  peds.update = function (dt) {
    if (!SF.player?.mesh || !T) return;
    peds.init(); dt = Math.min(0.06, Math.max(0, dt || 0));
    const player = SF.player, vehicle = player.vehicle;
    if (player.lastViolenceAt && Date.now() - player.lastViolenceAt < 1800) peds.scatterNear(player.position, 32, 6);
    if (vehicle && Math.abs(vehicle.speed) > 24) peds.scatterNear(vehicle.mesh.position, 11, 3.5);
    const bounds = SF.player.helpers.bounds();
    for (const ped of peds.all) {
      if (ped.state === 'DOWN') continue;
      ped.wait -= dt;
      if (ped.flee > 0) ped.flee -= dt;
      else if (ped.state === 'FLEEING') { ped.state = 'WALKING'; ped.speed = 0.75 + random() * 0.4; }
      if (ped.idle && ped.flee <= 0) {
        if (ped.wait <= 0) ped.wait = 1.5 + random() * 5;
        SF.player.helpers.animate(ped.mesh, dt, 0, false); continue;
      }
      if (ped.flee <= 0 && ped.wait <= 0 && random() < dt * 0.12) {
        ped.heading += pick([-1, 1]) * (0.3 + random() * 1.1); ped.wait = 1 + random() * 3;
      }
      const speed = ped.flee > 0 ? 3.6 : ped.speed;
      if (ped.hitReact > 0) {
        ped.hitReact = Math.max(0, ped.hitReact - dt);
        ped.mesh.rotation.x = Math.sin((ped.hitReact / 0.2) * Math.PI) * 0.16;
      } else ped.mesh.rotation.x = 0;
      ped.mesh.position.x += Math.sin(ped.heading) * speed * dt;
      ped.mesh.position.z += Math.cos(ped.heading) * speed * dt;
      if (ped.mesh.position.x < bounds.minX + 2 || ped.mesh.position.x > bounds.maxX - 2 ||
          ped.mesh.position.z < bounds.minZ + 2 || ped.mesh.position.z > bounds.maxZ - 2) {
        ped.heading += Math.PI; ped.mesh.position.clamp(new T.Vector3(bounds.minX + 3, 0, bounds.minZ + 3), new T.Vector3(bounds.maxX - 3, 0, bounds.maxZ - 3));
      }
      ped.mesh.rotation.y = ped.heading;
      SF.player.helpers.animate(ped.mesh, dt, speed, ped.flee > 0);
    }
  };
})(globalThis.SF = globalThis.SF || {});
