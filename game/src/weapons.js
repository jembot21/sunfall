import { WEAPONS } from './config.js';
import { getGroundHeight, hasLineOfSight } from './world.js';
import { reportCrime } from './police.js';

const THREE = window.THREE;
export const GUN_SHOPS = Object.freeze([
  Object.freeze({ name: 'Palma Arms', x: -7, z: 58 }),
  Object.freeze({ name: 'Old Market Arms', x: 392, z: 108 }),
]);

// The purchase preview and the equipped weapon are separate: a locked slot can never fire.
export function createWeapons({ scene, player, camera, peds, police, getCash, spendCash, onPurchase, notice }) {
  const owned = new Set(['fists']);
  let equipped = WEAPONS[0];
  let selected = WEAPONS[0];
  let cooldown = 0;
  let animation = 0;
  let effectTime = 0;
  let insideShop = false;
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5),
    new THREE.MeshBasicMaterial({ color: '#fff0a5', toneMapped: false, fog: false }));
  tracer.name = 'shot-tracer';
  tracer.visible = false;
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#fff2bc', toneMapped: false }));
  flash.name = 'muzzle-flash';
  flash.visible = false;
  scene.add(tracer, flash);
  const arm = player.getObjectByName('right-shoulder');
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.42),
    new THREE.MeshStandardMaterial({ color: '#293240', metalness: 0.65, roughness: 0.4 }));
  gun.name = 'held-weapon';
  gun.position.set(0, -0.55, 0.16);
  gun.visible = false;
  arm.add(gun);
  const shopGroup = new THREE.Group();
  shopGroup.name = 'gun-shops';
  for (const shop of GUN_SHOPS) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.08, 40),
      new THREE.MeshBasicMaterial({ color: '#9ce0c0', transparent: true, opacity: 0.65 }));
    marker.position.set(shop.x, getGroundHeight(shop) + 0.15, shop.z);
    marker.name = shop.name;
    shopGroup.add(marker);
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.5, 0.12), marker.material);
    beacon.position.copy(marker.position).y += 1.8;
    shopGroup.add(beacon);
  }
  scene.add(shopGroup);

  function select(slot) {
    const next = WEAPONS[slot - 1];
    if (!next) return;
    selected = next;
    if (owned.has(next.id)) equipped = next;
    else notice(`${next.name} LOCKED · $${next.price.toLocaleString('en-US')} · Walk into a green gun-shop marker`);
  }

  function purchase() {
    if (owned.has(selected.id)) return false;
    if (getCash() < selected.price) {
      notice(`${selected.name} costs $${selected.price.toLocaleString('en-US')} · Earn cash from Dre's jobs`);
      return false;
    }
    spendCash(selected.price);
    owned.add(selected.id);
    equipped = selected;
    onPurchase(); // Persist AFTER adding ownership; Continue restores it before the first frame.
    notice(`${selected.name} purchased · Unlimited ammunition`);
    return true;
  }

  function attack() {
    const gunshot = equipped.id !== 'fists';
    if (gunshot) {
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      player.rotation.y = Math.atan2(direction.x, direction.z);
    } else direction.set(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
    origin.copy(player.position).y += 1.25;
    let distance = equipped.range;
    let hit = null;
    const actors = [...peds.all.map((ped) => ({ kind: 'ped', actor: ped, mesh: ped.figure })),
      ...police.units.filter((unit) => unit.kind === 'officer' || (gunshot && unit.kind === 'cruiser'))
        .map((unit) => ({ kind: 'police', actor: unit, mesh: unit.mesh }))];
    scene.updateMatrixWorld(true);
    raycaster.set(origin, direction);
    raycaster.far = equipped.range;
    for (const candidate of actors) {
      if (candidate.actor.fallen || !candidate.mesh.visible) continue;
      if (!hasLineOfSight(player.position, candidate.actor.position)) continue;
      let along;
      if (gunshot) along = raycaster.intersectObject(candidate.mesh, true)[0]?.distance;
      else {
        const offset = candidate.actor.position.clone().sub(player.position);
        const forward = offset.dot(direction);
        along = forward >= 0 && Math.abs(offset.x * direction.z - offset.z * direction.x) < 0.85
          && Math.abs(offset.y) < 1.8 ? offset.length() : undefined;
      }
      if (along !== undefined && along <= distance) { distance = along; hit = candidate; }
    }
    if (hit?.kind === 'ped') peds.hit(hit.actor, player, gunshot ? 'shot' : 'assault', equipped.damage);
    else if (hit?.kind === 'police') {
      if (hit.actor.kind === 'officer') police.hitOfficer(hit.actor, equipped.damage);
      else hit.actor.car.health = Math.max(0, hit.actor.car.health - equipped.damage);
      reportCrime(gunshot ? 'policeShot' : 'policeAssault', hit.actor.position);
      peds.witnessCrime(hit.actor.position, { type: gunshot ? 'shot' : 'assault', source: player });
    } else if (gunshot) peds.witnessCrime(player.position, { type: 'shot', source: player });
    // No victim, no event, no wanted: an empty fist swing is harmless.
    if (gunshot) {
      // Terminate the visual at the first wall as well as limiting the actual hitscan.
      for (let step = 1; step < distance; step += 1) {
        const point = origin.clone().addScaledVector(direction, step);
        if (!hasLineOfSight(player.position, point, 1.25, 0)) { distance = step; break; }
      }
      tracer.position.copy(origin).addScaledVector(direction, distance / 2);
      tracer.scale.y = Math.max(0.1, distance);
      tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      flash.position.copy(origin).addScaledVector(direction, 0.7);
      effectTime = 0.09;
      tracer.visible = flash.visible = true;
    }
    cooldown = equipped.cooldown;
    animation = 0.22;
  }

  return {
    owned, shops: GUN_SHOPS, shopGroup, select,
    get weapon() { return equipped; },
    get selected() { return selected; },
    get nearShop() { return GUN_SHOPS.find((shop) => Math.hypot(shop.x - player.position.x, shop.z - player.position.z) < 4); },
    restore(save = {}) {
      owned.clear();
      for (const weapon of WEAPONS) if (weapon.id === 'fists' || save.ownedWeapons?.includes(weapon.id)) owned.add(weapon.id);
      equipped = WEAPONS.find((weapon) => weapon.id === save.selectedWeapon && owned.has(weapon.id)) ?? WEAPONS[0];
      selected = equipped;
      insideShop = false;
    },
    reset() { cooldown = animation = effectTime = 0; tracer.visible = flash.visible = false; },
    update(delta, controls, drivenCar) {
      cooldown = Math.max(0, cooldown - delta);
      animation = Math.max(0, animation - delta);
      effectTime = Math.max(0, effectTime - delta);
      tracer.visible = flash.visible = effectTime > 0;
      if (controls.weapon) select(controls.weapon);
      const shop = !drivenCar && GUN_SHOPS.some((entry) => Math.hypot(entry.x - player.position.x, entry.z - player.position.z) <= 2.5);
      if (shop && (!insideShop || controls.weapon)) purchase();
      insideShop = shop;
      gun.visible = !drivenCar && equipped.id !== 'fists';
      gun.scale.z = equipped.id === 'carbine' ? 2 : 1;
      if (drivenCar) return;
      if (controls.attack && !cooldown) attack();
      if (equipped.id !== 'fists' || animation) {
        arm.rotation.x = -Math.PI / 2 + (animation ? 0.12 : 0);
        if (equipped.id === 'carbine') player.getObjectByName('left-shoulder').rotation.x = -1.2;
      }
    },
  };
}
