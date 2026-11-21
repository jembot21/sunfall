(function (SF) {
  'use strict';
  const T = globalThis.THREE;
  const weapons = SF.weapons = {
    slots: [{ id: 'fists', name: 'Fists', range: 2.25, damage: 22, cooldown: 0.42, unlocked: true }],
    selected: 0, initialized: false, pointer: { x: 0, y: 0 }, cooldown: 0,
    shots: 0, hit: null, muzzle: null
  };
  const guns = {
    pistol: { name: 'Service Pistol', range: 90, damage: 34, cooldown: 0.32 },
    smg: { name: 'Compact SMG', range: 75, damage: 18, cooldown: 0.095 },
    shotgun: { name: 'Street Shotgun', range: 28, damage: 65, cooldown: 0.8 },
    rifle: { name: 'Patrol Rifle', range: 130, damage: 48, cooldown: 0.48 }
  };
  function camera() {
    const candidates = [SF.render?.camera, SF.render?.activeCamera, SF.render?.cameraRig?.camera,
      SF.render?.cameraRig?.activeCamera, SF.render?.cameraRig];
    return candidates.find(c => c?.isCamera) || null;
  }
  function canvas() { return SF.render?.renderer?.domElement || document.querySelector('canvas'); }
  function allTargets() {
    const objects = [];
    for (const ped of SF.peds?.all || []) if (ped.mesh.visible) objects.push(ped.mesh);
    for (const car of SF.vehicles?.all || []) if (!car.dead) objects.push(car.mesh);
    return objects;
  }
  function applyHit(obj, weapon) {
    let node = obj;
    while (node && !node.userData?.pedestrian && !node.userData?.vehicle) node = node.parent;
    if (!node) return false;
    const ped = node.userData.pedestrian;
    if (ped) {
      ped.health = (ped.health ?? 100) - weapon.damage;
      ped.state = 'HIT'; ped.idle = false;
      const away = ped.mesh.position.clone().sub(SF.player.position);
      if (away.lengthSq() > 0) ped.heading = Math.atan2(away.x, away.z);
      ped.flee = Math.max(ped.flee || 0, 3.5);
      ped.mesh.userData.hitFlash = 0.18;
      if (ped.health <= 0) {
        ped.state = 'DOWN'; ped.mesh.rotation.z = -Math.PI / 2;
        ped.mesh.position.y = -0.38; ped.downUntil = Date.now() + 12000;
      }
      SF.player.lastViolenceAt = Date.now();
      SF.peds.reactToCrime?.(ped.mesh.position, 25);
      return 'pedestrian';
    }
    const car = node.userData.vehicle;
    if (car) {
      car.health = (car.health ?? 200) - weapon.damage;
      car.hitAt = Date.now(); car.speed *= 0.72;
      car.mesh.userData.hitFlash = 0.18;
      if (car.health <= 0) { car.dead = true; car.speed = 0; car.destroyedAt = Date.now(); }
      return 'vehicle';
    }
    return false;
  }
  function muzzleFlash() {
    if (!camera() || !SF.render?.scene) return;
    if (!weapons.muzzle) {
      weapons.muzzle = SF.render.makeFlare?.(0xffbf59, 0.8);
      if (weapons.muzzle) { weapons.muzzle.visible = false; camera().add(weapons.muzzle); }
    }
    const flash = weapons.muzzle;
    if (flash) {
      flash.position.set(0.28, -0.23, -0.85); flash.visible = true;
      flash.material.opacity = 1;
      clearTimeout(weapons.flashTimer);
      weapons.flashTimer = setTimeout(() => { if (flash) flash.visible = false; }, 75);
    }
  }
  weapons.unlock = function (id) {
    const spec = guns[id]; if (!spec) return null;
    let slot = weapons.slots.find(s => s.id === id);
    if (!slot) { slot = { id, ...spec, unlocked: true, ammo: Infinity }; weapons.slots.push(slot); }
    else slot.unlocked = true;
    return slot;
  };
  weapons.select = function (idOrIndex) {
    const i = typeof idOrIndex === 'number' ? idOrIndex : weapons.slots.findIndex(s => s.id === idOrIndex);
    if (i < 0 || i >= weapons.slots.length || !weapons.slots[i].unlocked) return false;
    weapons.selected = i; return weapons.slots[i];
  };
  weapons.current = () => weapons.slots[weapons.selected] || weapons.slots[0];
  weapons.fire = function () {
    const player = SF.player, cam = camera(), weapon = weapons.current();
    if (!player?.mesh || !cam || !weapon || weapons.cooldown > 0 || player.dead) return false;
    weapons.cooldown = weapon.cooldown; weapons.shots++;
    const isGun = weapon.id !== 'fists';
    if (isGun) muzzleFlash();
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2(weapons.pointer.x, weapons.pointer.y), cam);
    ray.far = weapon.range;
    const hits = ray.intersectObjects(allTargets(), true);
    let result = null;
    if (hits.length) {
      result = applyHit(hits[0].object, weapon);
      if (result) weapons.hit = { target: result, at: Date.now(), distance: hits[0].distance };
    }
    const police = SF.police;
    if (isGun && police?.nearestCanSee?.(player.position, 110)) police.crime('GUNFIRE', 1, player.position);
    else if (isGun && police?.wanted > 0 && police.units?.some(u => u.kind === 'ground' && u.dist < 80)) police.crime('GUNFIRE', 1, player.position);
    else if (!isGun && result && police?.nearestCanSee?.(player.position, 60)) police.crime('ASSAULT', 1, player.position);
    return result || true;
  };
  weapons.init = function () {
    if (weapons.initialized || typeof window === 'undefined' || !T) return weapons;
    weapons.initialized = true;
    const el = canvas();
    if (el) {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        weapons.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        weapons.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      });
      el.addEventListener('pointerdown', e => { if (e.button === 0) weapons.fire(); });
    }
    window.addEventListener('keydown', e => {
      if (e.code.startsWith('Digit')) weapons.select(Number(e.code.slice(5)) - 1);
      if (e.code === 'KeyQ' && !e.repeat) weapons.select((weapons.selected + 1) % weapons.slots.length);
    });
    return weapons;
  };
  weapons.update = function (dt) {
    weapons.init(); weapons.cooldown = Math.max(0, weapons.cooldown - Math.max(0, dt || 0));
    for (const ped of SF.peds?.all || []) {
      if (ped.mesh.userData.hitFlash > 0) {
        ped.mesh.userData.hitFlash -= dt;
        if (ped.mesh.userData.hitFlash <= 0 && ped.mesh.material?.emissive) ped.mesh.material.emissive.setHex(0);
      }
      if (ped.state === 'DOWN' && Date.now() > ped.downUntil) {
        ped.mesh.visible = false; ped.respawnAt ||= Date.now() + 3000;
      }
      if (!ped.mesh.visible && ped.respawnAt && Date.now() > ped.respawnAt) {
        ped.mesh.visible = true; ped.mesh.rotation.z = 0; ped.mesh.position.y = 0;
        ped.health = 100; ped.state = 'WALKING'; ped.respawnAt = 0;
      }
    }
    for (const car of SF.vehicles?.all || []) {
      if (car.dead && car.destroyedAt && Date.now() - car.destroyedAt > 12000) SF.vehicles.remove(car);
    }
  };
})(globalThis.SF = globalThis.SF || {});
