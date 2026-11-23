import { WEAPONS } from './config.js';
import { hasLineOfSight } from './world.js';

const THREE = window.THREE;

// Basic attacks establish real victims/witnesses for the wanted system; Q leaves mouse orbit intact.
export function createCombat({ scene, player, peds, police }) {
  let weapon = WEAPONS[0];
  let cooldown = 0;
  let animation = 0;
  let tracerTime = 0;
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5),
    new THREE.MeshBasicMaterial({ color: '#fff0a5', toneMapped: false, fog: false }));
  tracer.name = 'shot-tracer';
  tracer.visible = false;
  scene.add(tracer);
  const arm = player.getObjectByName('right-shoulder');
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.42),
    new THREE.MeshStandardMaterial({ color: '#293240', metalness: 0.65, roughness: 0.4 }));
  gun.name = 'held-weapon';
  gun.position.set(0, -0.55, 0.16);
  gun.visible = false;
  arm.add(gun);

  function targetInFront() {
    let best = null;
    let nearest = weapon.range;
    const candidates = [...peds.all.map((ped) => ({ kind: 'ped', actor: ped })),
      ...police.units.filter((unit) => unit.kind === 'officer').map((unit) => ({ kind: 'officer', actor: unit }))];
    for (const candidate of candidates) {
      const position = candidate.actor.position;
      const dx = position.x - player.position.x;
      const dz = position.z - player.position.z;
      const along = dx * direction.x + dz * direction.z;
      const across = Math.abs(dx * direction.z - dz * direction.x);
      if (along < 0 || along > nearest || across > (weapon.id === 'fists' ? 0.85 : 0.55)) continue;
      if (Math.abs(position.y - player.position.y) > 1.8 || !hasLineOfSight(player.position, position)) continue;
      best = candidate;
      nearest = along;
    }
    return { target: best, distance: nearest };
  }

  return {
    get weapon() { return weapon; },
    reset() { cooldown = animation = tracerTime = 0; tracer.visible = false; },
    update(delta, controls, drivenCar) {
      cooldown = Math.max(0, cooldown - delta);
      animation = Math.max(0, animation - delta);
      tracerTime = Math.max(0, tracerTime - delta);
      tracer.visible = tracerTime > 0;
      if (controls.weapon) weapon = WEAPONS[controls.weapon - 1];
      gun.visible = weapon.id !== 'fists';
      gun.scale.z = weapon.id === 'carbine' ? 2 : 1;
      if (drivenCar) return;
      if (controls.attack && !cooldown) {
        cooldown = weapon.cooldown;
        animation = 0.22;
        direction.set(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
        const { target, distance } = targetInFront();
        const type = weapon.id === 'fists' ? 'assault' : 'shot';
        if (target?.kind === 'ped') peds.hit(target.actor, player, type);
        else if (target?.kind === 'officer') {
          police.hitOfficer(target.actor);
          peds.witnessCrime(target.actor.position, { type, source: player, victim: target.actor });
        } else if (type === 'shot') {
          // An empty punch emits no event. An empty shot needs a nearby, unobstructed observer.
          peds.witnessCrime(player.position, { type, source: player });
        }
        if (type === 'shot') {
          origin.copy(player.position).add(new THREE.Vector3(0, 1.3, 0));
          tracer.position.copy(origin).addScaledVector(direction, distance / 2);
          tracer.scale.y = Math.max(0.1, distance);
          tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          tracerTime = 0.09;
          tracer.visible = true;
        }
      }
      if (weapon.id !== 'fists' || animation) {
        arm.rotation.x = -Math.PI / 2 + (animation ? 0.12 : 0);
        if (weapon.id === 'carbine') player.getObjectByName('left-shoulder').rotation.x = -1.2;
      }
    },
  };
}
