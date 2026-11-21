(function (SF) {
  'use strict';
  const T = globalThis.THREE;
  const vehicles = SF.vehicles = { all: [], parked: [], traffic: [], patrols: [], types: [], initialized: false };
  const fallbackTypes = [
    { name: 'Vireo Coupe', speed: 49, handling: 1.18, size: [1.82, 1.22, 4.15] },
    { name: 'Meridian Sedan', speed: 42, handling: 0.96, size: [1.92, 1.48, 4.7] },
    { name: 'Solano Cab', speed: 38, handling: 0.89, size: [1.95, 1.56, 4.8] },
    { name: 'Hauler Pickup', speed: 35, handling: 0.78, size: [2.12, 1.85, 5.1] },
    { name: 'Cargo Van', speed: 32, handling: 0.67, size: [2.08, 2.12, 5.35] },
    { name: 'Tide Runner GT', speed: 57, handling: 1.3, size: [1.95, 1.2, 4.35] }
  ];
  const palette = () => SF.CONFIG?.palette || {};
  const colors = () => Object.values(palette()).filter(v => typeof v === 'number' || typeof v === 'string');
  const random = () => SF.player?.helpers?.random?.() ?? Math.random();
  const pick = a => a[Math.floor(random() * a.length)];
  const scene = () => SF.render?.scene;
  const vec = p => p?.isVector3 ? p.clone() : new T.Vector3(p?.x ?? 0, p?.y ?? 0, p?.z ?? 0);
  function typeList() {
    const raw = SF.CONFIG?.VEHICLE_TYPES;
    const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : [];
    return (list.length ? list : fallbackTypes).map((v, i) => {
      const base = fallbackTypes[i % fallbackTypes.length];
      const name = typeof v === 'string' ? v : v.displayName || v.name || v.label || base.name;
      return { ...(typeof v === 'object' ? v : {}), name, displayName: name,
        speed: Number(v?.speed || v?.maxSpeed) || base.speed,
        handling: Number(v?.handling) || base.handling,
        size: v?.size || base.size };
    });
  }
  vehicles.types = typeList();
  function material(color, extra = {}) {
    return SF.assets.standard({ color, roughness: 0.52, metalness: 0.22, ...extra });
  }
  function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w, h, d, mat, parent, x = 0, y = 0, z = 0) {
    const m = mesh(SF.assets.box, mat, parent, x, y, z); m.scale.set(w, h, d); return m;
  }
  function plateTexture(code) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.scale(256 / 192, 1);
    ctx.fillStyle = '#e8e4cc'; ctx.fillRect(0, 0, 192, 64);
    ctx.strokeStyle = '#202c35'; ctx.lineWidth = 5; ctx.strokeRect(2, 2, 188, 60);
    ctx.fillStyle = '#183b57'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SOLANO BAY', 96, 18);
    ctx.fillStyle = '#17232c'; ctx.font = 'bold 29px monospace'; ctx.fillText(code, 96, 49);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
  }
  function plateCode() {
    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ', digits = '0123456789';
    return Array.from({ length: 3 }, () => letters[Math.floor(random() * letters.length)]).join('') + '-' +
      Array.from({ length: 3 }, () => digits[Math.floor(random() * 10)]).join('');
  }
  // Eight power-of-two plates, built once. Entity creation only selects a variant.
  const plateCodes = ['SFB-104', 'PAL-219', 'BAY-307', 'SOL-418', 'VRE-526', 'MRD-637', 'TDE-742', 'HBR-853'];
  const plates = plateCodes.map(code => SF.assets.basic({ map: plateTexture(code), side: T.DoubleSide }));
  const brakeOff = material(0x7f1616, { emissive: 0xff1515, emissiveIntensity: 0.35 });
  const brakeOn = material(0x7f1616, { emissive: 0xff1515, emissiveIntensity: 2.4 });
  const barSpecs = [[-0.22, 0xff1825, 0xff0011], [0.22, 0x137bff, 0x064fff]];
  const barOn = barSpecs.map(([, color, emissive]) => material(color, { emissive, emissiveIntensity: 4 }));
  const barOff = barSpecs.map(([, color, emissive]) => material(color, { emissive, emissiveIntensity: 0.35 }));
  // All existing vehicle finishes are palette resources, not entity resources.
  [...colors(), 0xe7e9e7, 0x17191b, 0x20282b, 0x222a30,
    0xb5c1c3, 0x35617c, 0x9b5038, 0xe1d2a0, 0x405b50,
    0x758b91, 0x8d4536, 0x325873, 0xc1ae8a, 0x3d514b,
    0x728b98, 0x9d583d, 0xdbc58c, 0x344f65, 0x414744].forEach(color => material(color));
  material(0x89939a, { metalness: 0.7 });
  material(0x375765, { roughness: 0.19, metalness: 0.5, transparent: true, opacity: 0.87 });
  material(0xe8f5ff, { emissive: 0xa9dfff, emissiveIntensity: 1.2 });
  material(0x1b3b4e, { transparent: true, opacity: 0.85 });
  function makeWheel(car, x, z, front) {
    const pivot = new T.Group(); pivot.position.set(x, 0.43, z); car.mesh.add(pivot);
    const tire = mesh(SF.assets.tire, material(0x17191b), pivot);
    tire.rotation.z = Math.PI / 2;
    const hub = mesh(SF.assets.hub, material(0x89939a, { metalness: 0.7 }), pivot);
    hub.rotation.z = Math.PI / 2; car.wheels.push({ pivot, tire, front });
  }
  function addPointLight(parent, color, intensity, range, x, y, z) {
    SF.render.addVehicleLight(parent, color, intensity, range, x, y, z);
  }
  function addFlare(parent, color, size, position) {
    if (typeof SF.render?.makeFlare !== 'function') return null;
    const sprite = SF.render.makeFlare(color, size);
    if (sprite) { sprite.position.copy(position); parent.add(sprite); }
    return sprite;
  }
  vehicles.create = function (type = vehicles.types[0], options = {}) {
    if (!T || !scene()) return null;
    if (typeof type === 'string') type = vehicles.types.find(t => t.name === type) || vehicles.types[0];
    type ||= vehicles.types[0];
    const size = type.size || [1.9, 1.4, 4.6];
    const patrol = !!options.patrol;
    const color = patrol ? 0xe7e9e7 : options.color ?? pick(colors().length ? colors() : [0xb5c1c3, 0x35617c, 0x9b5038, 0xe1d2a0, 0x405b50]);
    const root = new T.Group(); root.position.copy(vec(options.position)); root.rotation.y = options.heading || 0;
    const body = new T.Group(); root.add(body);
    box(size[0], size[1] * 0.53, size[2], material(color), body, 0, size[1] * 0.62, 0);
    box(size[0] * 0.78, size[1] * 0.51, size[2] * 0.47, material(options.glassColor || 0x375765, {
      roughness: 0.19, metalness: 0.5, transparent: true, opacity: 0.87
    }), body, 0, size[1] * 1.07, 0.02);
    box(size[0] * 0.88, 0.10, size[2] * 0.16, material(color), body, 0, size[1] * 0.85, size[2] * 0.38);
    box(size[0] * 0.9, 0.09, size[2] * 0.1, material(color), body, 0, size[1] * 0.84, -size[2] * 0.42);
    for (const side of [-1, 1]) {
      box(0.045, 0.035, size[2] * 0.42, material(0x20282b), body, side * size[0] * 0.51, size[1] * 0.79, 0);
    }
    const car = {
      type, displayName: patrol ? 'Solano Bay Patrol' : type.displayName || type.name,
      name: patrol ? 'Solano Bay Patrol' : type.name, mesh: root, wheels: [],
      speed: 0, maxSpeed: type.speed * (patrol ? 1.04 : 1), handling: type.handling,
      patrol, locked: !!options.locked, driver: options.driver || null,
      parked: !!options.parked, traffic: !!options.traffic, lights: [], flares: [],
      heading: options.heading || 0, braking: false, plate: plateCode(),
      width: size[0], length: size[2], dead: false
    };
    for (const x of [-size[0] * 0.49, size[0] * 0.49]) {
      makeWheel(car, x, size[2] * 0.31, true); makeWheel(car, x, -size[2] * 0.31, false);
    }
    const headY = size[1] * 0.59;
    for (const x of [-size[0] * 0.36, size[0] * 0.36]) {
      const light = box(0.34, 0.15, 0.09, material(0xe8f5ff, {
        emissive: 0xa9dfff, emissiveIntensity: 1.2
      }), root, x, headY, size[2] * 0.503);
      car.lights.push(light);
      addPointLight(root, 0xd6eaff, 0.55, 18, x, headY, size[2] * 0.57);
      const brake = box(0.35, 0.16, 0.08, brakeOff, root, x, headY, -size[2] * 0.503); car.brakeLights ||= []; car.brakeLights.push(brake);
    }
    const plateIndex = [...car.plate].reduce((n, c) => n + c.charCodeAt(0), 0) % plates.length;
    car.plate = plateCodes[plateIndex];
    const plate = mesh(SF.assets.plane, plates[plateIndex], root,
      0, size[1] * 0.6, -size[2] * 0.507);
    plate.scale.set(0.43, 0.14, 1);
    plate.rotation.y = Math.PI; car.plateMesh = plate;
    addPointLight(root, 0xffdfb8, 0.45, 9, 0, size[1] * 0.9, size[2] * 0.55);
    if (patrol) {
      car.locked = options.locked ?? true;
      box(size[0] * 0.52, 0.09, 0.22, material(0x222a30), root, 0, size[1] * 1.4, 0.02);
      for (const [i, [x, , emissive]] of barSpecs.entries()) {
        const lamp = box(0.25, 0.13, 0.2, barOn[i], root,
          x, size[1] * 1.48, 0.02);
        car.lightbar ||= []; car.lightbar.push(lamp);
        car.flares.push(addFlare(root, emissive, 2.5, new T.Vector3(x, size[1] * 1.5, 0.03)));
      }
      box(size[0] * 1.005, 0.22, size[2] * 0.4, material(0x1b3b4e, { transparent: true, opacity: 0.85 }), root, 0, size[1] * 0.66, 0);
      car.callsign = options.callsign || 'UNIT'; vehicles.patrols.push(car);
    }
    root.userData.vehicle = car;
    if (patrol) scene().add(root); else SF.render.batchActor(root);
    vehicles.all.push(car);
    if (car.parked) vehicles.parked.push(car);
    if (car.traffic) vehicles.traffic.push(car);
    return car;
  };
  vehicles.entryPoints = car => {
    const p = car.mesh.position, a = car.mesh.rotation.y;
    return [-1, 1].map(side => new T.Vector3(p.x + Math.cos(a) * side * (car.width * 0.64), 0,
      p.z - Math.sin(a) * side * (car.width * 0.64)));
  };
  vehicles.nearest = function (position, maxDist = Infinity) {
    let found = null, best = maxDist;
    for (const car of vehicles.all) {
      if (car.dead || car.locked || car.driver === SF.player || car.driver === 'police' && car.locked) continue;
      const d = position.distanceTo(car.mesh.position); if (d < best) { best = d; found = car; }
    }
    return found;
  };
  vehicles.steal = function (car) {
    if (!car || car.stolen) return;
    car.stolen = true; car.locked = false;
    if (car.traffic) {
      car.traffic = false;
      const i = vehicles.traffic.indexOf(car); if (i !== -1) vehicles.traffic.splice(i, 1);
      car.driver = null;
    }
    const police = SF.police;
    if (police && police.nearestCanSee?.(car.mesh.position, 42)) police.crime('VEHICLE THEFT', 1);
    else if (police?.units?.some(u => u.kind === 'ground' && u.dist < 30)) police.crime('VEHICLE THEFT', 1);
  };
  function spots() {
    const raw = SF.world?.parkingSpots || SF.city?.parkingSpots || SF.world?.parking || SF.city?.parking || [];
    return Array.isArray(raw) ? raw : raw.spots || raw.positions || [];
  }
  vehicles.populateParking = function (target = SF.CONFIG?.tuning?.parkedCarFillRate ?? 0.78) {
    const slots = spots(); if (!slots.length) return 0;
    // Detailed interactive cars are costly in software-rendered capture. Keep a
    // citywide spread while preserving enough nearby parked cars for street shots.
    const desired = Math.min(200, Math.ceil(slots.length * Math.min(0.94, target)));
    let count = vehicles.parked.length;
    for (let i = count; i < desired; i++) {
      const spot = slots[Math.floor(i * slots.length / desired)]; if (!spot) break;
      const position = spot.position || spot;
      const type = vehicles.types[i % vehicles.types.length];
      const color = pick(colors().length ? colors() : [0x758b91, 0x8d4536, 0x325873, 0xc1ae8a, 0x3d514b]);
      const car = vehicles.create(type, { position, heading: spot.heading ?? spot.rotation ?? 0, color, parked: true });
      if (car) count++;
    }
    return count;
  };
  vehicles.remove = function (car) {
    if (!car || car.dead && !car.mesh.parent && !car.mesh.userData.batchedActor) return;
    SF.render.unbatchActor(car.mesh); scene()?.remove(car.mesh); car.dead = true;
    for (const list of [vehicles.all, vehicles.parked, vehicles.traffic, vehicles.patrols]) {
      const i = list.indexOf(car); if (i !== -1) list.splice(i, 1);
    }
  };
  vehicles.init = function () {
    if (vehicles.initialized) return vehicles;
    vehicles.initialized = true; vehicles.populateParking(); return vehicles;
  };
  vehicles.update = function (dt) {
    const player = SF.player, input = player?.keys || {};
    for (const car of vehicles.all) {
      if (car.dead) continue;
      if (car.driver === player) {
        const throttle = (input.KeyW || input.ArrowUp ? 1 : 0) - (input.KeyS || input.ArrowDown ? 1 : 0);
        const steer = (input.KeyD || input.ArrowRight ? 1 : 0) - (input.KeyA || input.ArrowLeft ? 1 : 0);
        const brake = !!(input.Space || input.KeyS || input.ArrowDown);
        car.braking = brake;
        car.speed += throttle * car.handling * 25 * dt;
        car.speed *= Math.max(0, 1 - (brake ? 4.5 : 0.55) * dt);
        car.speed = Math.max(-car.maxSpeed * 0.34, Math.min(car.maxSpeed, car.speed));
        car.heading += steer * car.handling * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed || 1) * dt;
        car.mesh.rotation.y = car.heading;
        car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
        car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
        SF.player?.helpers?.clamp(car.mesh.position, car.length * 0.5);
        if (SF.police && Math.abs(car.speed) > 23) SF.peds?.scatterNear?.(car.mesh.position, 8);
      }
      car.wheels.forEach(w => {
        if (w.front) w.pivot.rotation.y = car.driver === player ?
          ((input.KeyD || input.ArrowRight ? 1 : 0) - (input.KeyA || input.ArrowLeft ? 1 : 0)) * 0.38 : 0;
        w.tire.rotation.x += (car.speed || 0) * dt / 0.37;
      });
      car.brakeLights?.forEach(l => { l.material = car.braking ? brakeOn : brakeOff; });
      if (car.lightbar) {
        const t = (globalThis.performance?.now?.() || 0) * 0.012;
        car.lightbar.forEach((l, i) => { l.material = i === (Math.floor(t) % 2) ? barOn[i] : barOff[i]; });
        car.flares.forEach((f, i) => { if (f) f.visible = i === (Math.floor(t) % 2); });
      }
    }
  };
})(globalThis.SF = globalThis.SF || {});
