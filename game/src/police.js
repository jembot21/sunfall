(function (SF) {
  'use strict';
  const T = globalThis.THREE;
  const police = SF.police = { wanted: 0, units: [], heat: 0, initialized: false, searchTimer: 0, decayTimer: 0, serial: 0 };
  const random = () => SF.player?.helpers?.random?.() ?? Math.random();
  const pick = a => a[Math.floor(random() * a.length)];
  const airBody = SF.assets.standard({ color: 0x233b4a, roughness: 0.5 });
  const airTail = SF.assets.standard({ color: 0x21394a });
  const airBlade = SF.assets.standard({ color: 0x161d22 });
  const airRotor = SF.assets.standard({ color: 0x171f24 });
  const airBeam = SF.assets.basic({ color: 0xffefb5, transparent: true, opacity: 0.14, depthWrite: false, side: T.DoubleSide });
  const fallback = {
    ground: ['PATROL 2', 'PATROL 5', 'UNIT 7', 'UNIT 9', 'UNIT 12'],
    roadblock: ['BLOCKADE 1', 'BLOCKADE 2'],
    air: ['AIR ONE']
  };
  function configuredPool(kind) {
    const source = SF.CONFIG?.POLICE_CALLSIGNS || SF.CONFIG?.policeCallsigns || SF.CONFIG?.police?.callsigns ||
      SF.CONFIG?.callsignPools || SF.CONFIG?.callsigns || {};
    const keys = kind === 'roadblock' ? ['roadblock', 'blockade'] : kind === 'patrol' ? ['ground', 'patrol'] : [kind];
    const match = Object.keys(source).find(k => keys.includes(k.toLowerCase().replace(/[^a-z]/g, '')));
    const values = match ? source[match] : source;
    const fallbackKey = kind === 'patrol' ? 'ground' : kind === 'blockade' ? 'roadblock' : kind;
    return Array.isArray(values) && values.length && values.every(x => typeof x === 'string') ? values : fallback[fallbackKey] || fallback.ground;
  }
  function nextCallsign(kind) {
    const pool = configuredPool(kind);
    const used = new Set(police.units.map(u => u.callsign));
    return pick(pool.filter(name => !used.has(name)).length ? pool.filter(name => !used.has(name)) : pool);
  }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function positionAhead(distanceAhead, side = 0) {
    const p = SF.player, heading = p.vehicle?.heading ?? p.heading ?? 0;
    const f = new T.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const s = new T.Vector3(f.z, 0, -f.x);
    return p.position.clone().addScaledVector(f, distanceAhead).addScaledVector(s, side);
  }
  function spawnRoadside(radius = 55) {
    const p = SF.player.position, bounds = SF.player.helpers.bounds(), grid = SF.player.helpers.streets();
    const vertical = random() < 0.5;
    if (vertical && grid.x.length) {
      const x = grid.x.reduce((a, b) => Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a);
      return new T.Vector3(x + pick([-2, 2]), 0, Math.max(bounds.minZ + 5, Math.min(bounds.maxZ - 5, p.z + pick([-1, 1]) * radius)));
    }
    if (grid.z.length) {
      const z = grid.z.reduce((a, b) => Math.abs(b - p.z) < Math.abs(a - p.z) ? b : a);
      return new T.Vector3(Math.max(bounds.minX + 5, Math.min(bounds.maxX - 5, p.x + pick([-1, 1]) * radius)), 0, z + pick([-2, 2]));
    }
    return positionAhead(radius, pick([-4, 4]));
  }
  function createOfficer(at) {
    const officer = SF.player.helpers.figure({ shirt: 0x24394d, pants: 0x171f28, skin: 0x9a6849 });
    officer.scale.setScalar(0.92); officer.position.copy(at); SF.render.scene.add(officer); return officer;
  }
  function createGround() {
    const call = nextCallsign('ground');
    const at = spawnRoadside(48 + random() * 20);
    const car = SF.vehicles.create(SF.vehicles.types[1] || SF.vehicles.types[0], {
      position: at, heading: Math.atan2(SF.player.position.x - at.x, SF.player.position.z - at.z),
      patrol: true, driver: 'police', callsign: call
    });
    if (!car) return null;
    const officer = createOfficer(at.clone().add(new T.Vector3(2.6, 0, 0)));
    const unit = { callsign: call, kind: 'ground', status: 'CLOSING', dist: 0, car, officer, mode: 'pursuit' };
    police.units.push(unit); return unit;
  }
  function createRoadblock() {
    const call = nextCallsign('roadblock');
    const at = positionAhead(36 + random() * 22, 0);
    const heading = (SF.player.vehicle?.heading ?? SF.player.heading ?? 0) + Math.PI / 2;
    const car = SF.vehicles.create(SF.vehicles.types[1] || SF.vehicles.types[0], { position: at,
      heading, patrol: true, driver: 'roadblock', callsign: call });
    if (!car) return null;
    const officer = createOfficer(at.clone().add(new T.Vector3(0, 0, 3.1)));
    const unit = { callsign: call, kind: 'roadblock', status: 'ROADBLOCK', dist: 0, car, officer, mode: 'block' };
    police.units.push(unit); return unit;
  }
  function createAir() {
    const group = new T.Group(); const body = new T.Mesh(SF.assets.helicopter, airBody);
    body.rotation.z = Math.PI / 2; body.castShadow = true; group.add(body);
    const tail = new T.Mesh(SF.assets.box, airTail); tail.scale.set(0.12, 0.22, 3.2);
    tail.position.set(0, 0.05, -2.25); group.add(tail);
    const rotor = new T.Group(); rotor.position.y = 0.68; group.add(rotor);
    for (let i = 0; i < 2; i++) {
      const blade = new T.Mesh(SF.assets.box, airBlade); blade.scale.set(0.13, 0.035, 5.7);
      blade.rotation.y = i * Math.PI / 2; rotor.add(blade);
    }
    const tailRotor = new T.Mesh(SF.assets.box, airRotor); tailRotor.scale.set(0.08, 1.4, 0.08);
    tailRotor.position.set(0, 0, -3.75); group.add(tailRotor);
    const cone = new T.Mesh(SF.assets.spotlight, airBeam);
    cone.position.set(0, -10, 1.8); cone.rotation.x = Math.PI; group.add(cone);
    SF.render.addVehicleLight(group, 0xffe8a0, 2.5, 35, 0, -0.28, 1.1);
    const flare = SF.render?.makeFlare?.(0xffe9a0, 3.6);
    if (flare) { flare.position.set(0, -0.35, 1.1); group.add(flare); }
    SF.render.scene.add(group);
    const call = nextCallsign('air');
    const unit = { callsign: call, kind: 'air', status: 'AIR WATCH', dist: 0,
      mesh: group, rotor, tailRotor, spotlight: cone, flare, orbit: random() * Math.PI * 2 };
    police.units.push(unit); return unit;
  }
  function removeUnit(unit) {
    const scene = SF.render?.scene;
    if (unit.car) SF.vehicles.remove?.(unit.car);
    else if (unit.mesh) { SF.render.unbatchActor(unit.mesh); scene?.remove(unit.mesh); }
    if (unit.officer) scene?.remove(unit.officer);
    const i = police.units.indexOf(unit); if (i !== -1) police.units.splice(i, 1);
  }
  function active(kind) { return police.units.filter(u => u.kind === kind); }
  police.init = function () { police.initialized = true; return police; };
  police.setWanted = function (stars, reason = '') {
    police.wanted = Math.max(0, Math.min(5, Math.round(stars)));
    police.heat = police.wanted; police.lastCrime = reason || police.lastCrime;
    police.decayTimer = 0; police.searchTimer = 0;
    police.reconcile(); return police.wanted;
  };
  police.crime = function (reason = 'CRIME', stars = 1, position = SF.player?.position) {
    if (!position) return 0;
    police.lastCrime = reason; police.lastCrimeAt = Date.now();
    police.wanted = Math.min(5, Math.max(1, police.wanted + Math.max(1, Math.round(stars))));
    police.heat = police.wanted; police.decayTimer = 0; police.searchTimer = 0;
    SF.peds?.reactToCrime?.(position, reason === 'GUNFIRE' ? 42 : 30);
    police.reconcile(); return police.wanted;
  };
  police.nearestCanSee = function (position, range = 90) {
    const target = position?.clone ? position.clone().add(new T.Vector3(0, 1.4, 0)) : position;
    return police.units.some(u => u.kind === 'ground' && u.car && distance(position, u.car.mesh.position) < range &&
      police.lineOfSight(u.car.mesh.position.clone().add(new T.Vector3(0, 1.4, 0)), target));
  };
  police.lineOfSight = function (from, to) {
    if (typeof SF.world?.hasLineOfSight === 'function') return !!SF.world.hasLineOfSight(from, to);
    if (!T || !SF.render?.scene?.children) return true;
    const a = vec3(from), b = vec3(to), ray = new T.Raycaster(a, b.clone().sub(a).normalize(), 0, a.distanceTo(b));
    // Sprite.raycast reads ray.camera.matrixWorld (the sun and light-bar flares
    // are sprites). World-space rays do not get a camera via setFromCamera.
    ray.camera = SF.render.camera;
    const objects = SF.render.scene.children.filter(o => !o.userData?.vehicle && !o.userData?.pedestrian && !o.userData?.dynamicActors && o !== SF.player?.mesh);
    const hit = ray.intersectObjects(objects, true).find(h => {
      if (!h.object.isMesh) return false; // A flare is never a sight blocker.
      let p = h.object; while (p && p !== SF.render.scene) {
        if (p.userData?.vehicle || p.userData?.pedestrian || p === SF.player?.mesh) return false;
        p = p.parent;
      }
      return true;
    });
    return !hit;
  };
  function vec3(p) { return p?.isVector3 ? p.clone() : new T.Vector3(p.x, (p.y || 0) + 1.4, p.z); }
  police.reconcile = function () {
    if (!SF.vehicles || !SF.player?.mesh || !T || !SF.render?.scene) return;
    const stars = police.wanted;
    const groundTarget = stars ? Math.min(5, stars) : 0;
    while (active('ground').length < groundTarget) createGround();
    for (const u of active('ground').slice(groundTarget)) removeUnit(u);
    const roadTarget = stars >= 3 ? Math.min(2, stars - 2) : 0;
    while (active('roadblock').length < roadTarget) createRoadblock();
    for (const u of active('roadblock').slice(roadTarget)) removeUnit(u);
    if (stars >= 3 && !active('air').length) createAir();
    if (stars < 3) for (const u of active('air')) removeUnit(u);
  };
  police.update = function (dt) {
    if (!SF.player?.mesh || !SF.vehicles) return;
    police.init(); dt = Math.min(0.06, Math.max(0, dt || 0));
    const player = SF.player, target = player.vehicle?.mesh.position || player.position;
    let visible = false;
    for (const unit of police.units) {
      if (unit.kind === 'ground') {
        const car = unit.car; if (!car || car.dead) continue;
        const pos = car.mesh.position, d = unit.dist = distance(pos, target);
        const sees = d < 115 && police.lineOfSight(pos.clone().add(new T.Vector3(0, 1.4, 0)), target.clone().add(new T.Vector3(0, 1.2, 0)));
        visible ||= sees;
        if (!sees) { unit.status = 'SEARCHING'; car.speed *= Math.max(0, 1 - dt * 0.8); continue; }
        const angle = Math.atan2(target.x - pos.x, target.z - pos.z);
        const delta = Math.atan2(Math.sin(angle - car.heading), Math.cos(angle - car.heading));
        car.heading += Math.max(-1, Math.min(1, delta)) * dt * 1.6;
        car.mesh.rotation.y = car.heading;
        const ramming = d < 9 && Math.abs(player.vehicle?.speed || 0) > 4;
        unit.status = ramming ? 'RAMMING' : d > 30 ? 'CLOSING' : 'PURSUING';
        car.speed += ((ramming ? 12 : 15) - car.speed) * Math.min(1, dt * 0.55);
        car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
        car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
        if (ramming) {
          if (player.vehicle) player.vehicle.speed *= Math.max(0.5, 1 - dt * 1.1);
          else player.damage?.(3 * dt);
        }
        unit.officer.position.copy(pos).add(new T.Vector3(2.6, 0, 0));
        SF.player.helpers.animate(unit.officer, dt, d < 11 ? 2 : 0, d < 11);
      } else if (unit.kind === 'roadblock') {
        unit.dist = distance(unit.car.mesh.position, target); unit.status = 'ROADBLOCK';
      } else {
        unit.dist = distance(unit.mesh.position, target);
        unit.orbit += dt * 0.24;
        unit.mesh.position.set(target.x + Math.cos(unit.orbit) * 32, 24 + Math.sin(unit.orbit * 1.4) * 2,
          target.z + Math.sin(unit.orbit) * 32);
        unit.mesh.rotation.y = unit.orbit + Math.PI / 2;
        unit.rotor.rotation.y += dt * 26; unit.tailRotor.rotation.x += dt * 31;
        unit.status = 'AIR WATCH';
      }
    }
    if (police.wanted > 0) {
      if (!visible) {
        police.searchTimer += dt;
        for (const u of police.units) if (u.kind === 'ground') u.status = 'SEARCHING';
        if (police.searchTimer > 7) police.decayTimer += dt;
      } else { police.searchTimer = 0; police.decayTimer = 0; }
      if (police.decayTimer > 12) {
        police.decayTimer = 0; police.setWanted(police.wanted - 1, police.lastCrime);
      }
    }
    // Dispatch records remain live and are intentionally safe for direct HUD rendering.
    police.units.forEach(u => { u.dist = Math.round(u.dist * 10) / 10; });
  };
})(globalThis.SF = globalThis.SF || {});
