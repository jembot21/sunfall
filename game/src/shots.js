/* Reproducible photo setups, using the same actors as ordinary play. */
(function () {
  'use strict';
  const SF = window.SF;
  const setups = {
    cover: { x: -294, z: -214, heading: 0, wanted: 4, car: 5, speed: 22 },
    street: { x: -336, z: -157.5, heading: Math.PI / 2, wanted: 0 },
    drive: { x: 0, z: -252, heading: Math.PI / 2, wanted: 0, car: 5, speed: 19 },
    mission: { x: -304, z: -241, heading: Math.PI / 2, wanted: 0 }
  };
  let staged = null;

  function place(actor, x, y, z, heading = 0) {
    const mesh = actor.mesh || actor;
    mesh.position.set(x, y, z); mesh.rotation.y = heading;
    if (actor === SF.player) SF.player.position.set(x, y, z);
    if ('heading' in actor) actor.heading = heading;
    return actor;
  }

  function apply(name) {
    const setup = setups[name];
    if (!setup) throw new Error(`Unknown Sunfall shot: ${name}`);
    if (!SF.player?.mesh || !SF.render?.scene || !SF.runtime) return false;
    if (staged === name) return true;
    if (SF.state.mode === 'menu') SF.runtime.start();
    SF.state.mode = 'play'; SF.shots.current = name;
    SF.missions.reset(); SF.phone.clear();
    if (SF.player.vehicle) {
      SF.player.vehicle.speed = 0;
      SF.player.exitVehicle();
    }
    place(SF.player, setup.x, 0.55, setup.z, setup.heading);
    SF.input.yaw = setup.heading; SF.input.pitch = -0.06;
    SF.player.health = 100; SF.player.cash = 2480;
    if (setup.car !== undefined) {
      const type = SF.vehicles.types[setup.car];
      const car = SF.vehicles.create(type);
      place(car, setup.x, 0, setup.z, setup.heading);
      SF.player.enterVehicle(car); car.speed = setup.speed;
    }
    SF.police.setWanted(setup.wanted);
    SF.police.reconcile();
    if (name === 'cover' || name === 'drive') {
      for (let i = 0; i < (name === 'cover' ? 10 : 6); i++) {
        const distance = i < 2 ? -28 - i * 17 : 24 + (i - 2) * 17;
        SF.traffic.spawn({
          x: setup.x + Math.sin(setup.heading) * distance + Math.cos(setup.heading) * (i % 2 ? 3 : -3),
          z: setup.z + Math.cos(setup.heading) * distance - Math.sin(setup.heading) * (i % 2 ? 3 : -3),
          heading: setup.heading
        });
      }
    }
    if (name === 'cover') {
      SF.missions.setObjective('Lose the patrol · Get the ledger across the bay');
    }
    if (name === 'mission') {
      SF.missions.startStory(0);
      const first = SF.missions.story[0];
      SF.phone.call(first.contact, first.stages[0].line);
      const marco = SF.peds.create({ x: setup.x + 3, z: setup.z - 1,
        shirt: 0x273849, pants: 0x29201e, idle: true, heading: -Math.PI / 2 });
      marco.mesh.name = 'Marco Reyes'; marco.mesh.position.y = 0.36;
    }
    // Populate the actual sidewalk actors near the lens, rather than photo-only extras.
    if (name === 'street' || name === 'mission' || name === 'cover') {
      for (let i = 0; i < 12; i++) {
        const ped = SF.peds.create({ x: setup.x + 5 + i * 3,
          z: name === 'cover' ? -157.5 : setup.z + (i % 2 ? 0.6 : -0.6),
          heading: Math.PI / 2, speed: 0.4, idle: i % 3 === 0 });
        ped.mesh.position.y = 0.36;
      }
    }
    if (name === 'street') {
      // Reuse the parked fleet; the mid-block curb is not left to random fill.
      SF.vehicles.parked.slice(0, 4).forEach((car, i) =>
        place(car, setup.x - 3 + i * 9, 0, -161.6, Math.PI / 2));
    }
    const sun = SF.render.sun;
    if (sun?.position) {
      sun.target.position.set(setup.x, 0, setup.z);
      sun.position.set(setup.x - 160, 100, setup.z - 220);
    }
    SF.state.district = SF.city.districtAt(setup.x, setup.z);
    staged = name;
    SF.hud.update();
    return true;
  }

  // Main owns the only frame loop; staged camera transforms happen before its one render.
  function updateCamera() {
    if (!staged) return;
    const player = SF.player, car = player.vehicle;
    const p = (car?.mesh || player.mesh).position;
    const camera = SF.render.camera;
    if (!camera) return;
    if (staged === 'cover') {
      // Choreograph the real units each frame so pursuit AI cannot move the
      // cast out of the shot while the coordinator waits for the HUD.
      let ground = 0, block = 0;
      for (const unit of SF.police.units) {
        const actor = unit.car || unit.mesh;
        if (!actor) continue;
        if (unit.kind === 'air') place(actor, p.x + 4, 12, p.z + 28, Math.PI);
        else if (unit.kind === 'roadblock') {
          place(actor, p.x + (block++ ? 3 : -3), 0, p.z + 43, Math.PI / 2);
        } else {
          const i = ground++;
          place(actor, p.x + (i % 2 ? 4.2 : -4.2), 0,
            p.z + (i < 2 ? -1 + i * 3 : 18 + (i - 2) * 10), 0);
        }
        const position = (actor.mesh || actor).position;
        unit.dist = Math.round(Math.hypot(position.x - p.x, position.z - p.z) * 10) / 10;
        if (unit.officer) unit.officer.position.set(position.x + 2.6, 0.36, position.z);
      }
      camera.position.set(p.x + 0.6, 3.6, p.z - 12);
      camera.lookAt(p.x, 2.8, p.z + 18);
      SF.hud.update();
    } else if (staged === 'drive') {
      const heading = car?.heading ?? player.heading, fx = Math.sin(heading), fz = Math.cos(heading);
      camera.position.set(p.x - fx * 10, p.y + 3.4, p.z - fz * 10);
      camera.lookAt(p.x + fx * 18, p.y + 1.8, p.z + fz * 18);
    } else if (staged === 'street') {
      camera.position.set(p.x - 5, 2.9, p.z + 1);
      camera.lookAt(p.x + 9, 1.5, p.z - 9);
    } else {
      camera.position.set(p.x - 1, 3, p.z + 7);
      camera.lookAt(p.x + 5, 1.3, p.z - 9);
    }
  }

  SF.shots = { apply, current: null, updateCamera };
})();
