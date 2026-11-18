(function (SF) {
  'use strict';
  const mesh = SF.peds.figure(0xe98b50); mesh.scale.set(1.08, 1.12, 1.08); SF.render.scene.add(mesh);
  mesh.position.copy(SF.vehicles.parked[0].pos).add(new THREE.Vector3(4, 0, 0));
  SF.vehicles.resolve(mesh.position, 0.7);
  const gun = SF.vehicles.box(mesh, 0.18, 0.22, 0.65, -0.48, 1.2, 0.35, 0x24252c); gun.visible = false;
  let cooldown = 0, recovery = 0, phase = 0;
  const tracers = [];
  const player = { mesh, pos: mesh.position, health: 100, cash: 80, inCar: null, pistolUnlocked: false, equipped: false, recovering: false, yaw: Math.PI, pitch: 0.3, speed: 0,
    addCash(n) { this.cash = Math.max(0, Math.round(this.cash + n)); },
    hurt(n) { if (this.recovering) return; this.health = Math.max(0, this.health - n); if (!this.health) this.respawn('wasted'); },
    respawn(reason) {
      if (this.recovering) return;
      this.recovering = true; recovery = 3; this.reason = reason; this.addCash(-Math.min(150, this.cash));
      if (this.inCar) { this.inCar.occupied = false; this.inCar.speed = 0; this.inCar = null; }
      this.mesh.visible = true; this.pos.copy(reason === 'busted' ? new THREE.Vector3(99, 0, 46) : new THREE.Vector3(-85, 0, 46));
      SF.vehicles.resolve(this.pos, 0.7); SF.police.clear();
      if (SF.missions) SF.missions.fail(reason === 'busted' ? 'Impounded. Try the route again.' : 'Take a breath. Try again.');
    },
    attack() {
      if (cooldown > 0 || this.inCar || this.recovering) return;
      const armed = this.equipped && this.pistolUnlocked; cooldown = armed ? 0.3 : 0.55;
      if (SF.audio) SF.audio[armed ? 'shot' : 'punch']();
      const direction = new THREE.Vector3(-Math.sin(this.yaw), -Math.sin(this.pitch) * 0.2, -Math.cos(this.yaw)).normalize();
      const origin = this.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
      let range = armed ? 100 : 3.4, target = null;
      const candidates = SF.peds.people.filter(p => p.down <= 0).map(p => ({ pos: p.pos, radius: 0.9, ped: p })).concat(SF.vehicles.all.map(c => ({ pos: c.pos, radius: 2.7, car: c })));
      for (const b of SF.city.colliders) candidates.push({ pos: new THREE.Vector3(b.x, 0, b.z), radius: b.r });
      for (const t of candidates) {
        const dx = t.pos.x - origin.x, dz = t.pos.z - origin.z, along = dx * direction.x + dz * direction.z;
        if (along < 0 || along > range) continue;
        const side = Math.abs(dx * direction.z - dz * direction.x);
        if (side < t.radius + (armed ? 0 : 0.8)) { range = along; target = t; }
      }
      if (armed) {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, origin.clone().addScaledVector(direction, range)]), new THREE.LineBasicMaterial({ color: 0xffdc87 }));
        SF.render.scene.add(line); tracers.push({ line, life: 0.09 }); SF.police.addHeat(2); SF.peds.scare(this.pos.x, this.pos.z, 65);
      }
      if (target && (target.ped || target.car)) {
        if (target.ped) target.ped.down = 7;
        if (target.car) target.car.speed *= 0.6;
        if (!armed) SF.police.addHeat(1); SF.peds.scare(this.pos.x, this.pos.z, 25);
      }
      mesh.rotation.y = Math.atan2(direction.x, direction.z);
    },
    update(dt) {
      cooldown = Math.max(0, cooldown - dt);
      for (let i = tracers.length - 1; i >= 0; i--) if ((tracers[i].life -= dt) <= 0) { const t = tracers.splice(i, 1)[0]; SF.render.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); }
      if (this.recovering) { recovery -= dt; if (recovery <= 0) { this.health = 100; this.recovering = false; this.reason = ''; } this.camera(dt); return; }
      const input = SF.input;
      if (input.pressed('equip') && this.pistolUnlocked) this.equipped = !this.equipped;
      gun.visible = this.equipped;
      if (input.pressed('interact')) {
        if (this.inCar) {
          if (Math.abs(this.inCar.speed) < 3) { const c = this.inCar; this.pos.copy(c.pos).add(new THREE.Vector3(Math.cos(c.heading) * 3.6, 0, -Math.sin(c.heading) * 3.6)); SF.vehicles.resolve(this.pos, 0.7); c.occupied = false; this.inCar = null; this.mesh.visible = true; }
          else SF.hud.showBanner('SLOW DOWN', 'Stop before getting out.');
        } else {
          const available = SF.vehicles.all.filter(c => c.mesh.visible && c.kind !== 'police' && !c.occupied && Math.abs(c.speed) < 3 && c.pos.distanceTo(this.pos) < 6).sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos));
          if (available.length) { this.inCar = available[0]; this.inCar.occupied = true; if (!SF.vehicles.parked.includes(this.inCar)) SF.vehicles.parked.push(this.inCar); this.mesh.visible = false; }
        }
      }
      if (this.inCar) { this.pos.copy(this.inCar.pos); this.speed = Math.abs(this.inCar.speed); }
      else {
        const x = Number(input.isDown('right')) - Number(input.isDown('left')), z = Number(input.isDown('back')) - Number(input.isDown('forward'));
        const length = Math.hypot(x, z), speed = input.isDown('run') ? SF.CONFIG.physics.runSpeed : SF.CONFIG.physics.walkSpeed;
        this.speed = length ? speed : 0;
        if (length) { const dx = (x * Math.cos(this.yaw) + z * Math.sin(this.yaw)) / length, dz = (-x * Math.sin(this.yaw) + z * Math.cos(this.yaw)) / length; this.pos.x += dx * speed * dt; this.pos.z += dz * speed * dt; mesh.rotation.y = Math.atan2(dx, dz); }
        SF.vehicles.resolve(this.pos, 0.7); phase += dt * this.speed; this.pos.y = length ? Math.abs(Math.sin(phase)) * 0.09 : 0;
        if (input.pressed('shoot') && !input.isDown('handbrake')) this.attack();
      }
      if (SF.world.isWater(this.pos.x, this.pos.z)) this.hurt(30 * dt);
      if (input.pressed('service')) {
        if (this.pos.distanceTo(SF.missions.food) < 12) {
          if (this.cash >= 25 && this.health < 100) { this.addCash(-25); this.health = Math.min(100, this.health + 65); SF.hud.showBanner('HOT MEAL', 'Back on your feet. $25'); }
          else SF.hud.showBanner('FOOD STAND', this.health >= 100 ? 'You are already healthy.' : 'A healing meal costs $25.');
        } else if (this.pos.distanceTo(SF.missions.home) < 14) { SF.save.store(); SF.hud.showBanner('SAVED', 'Your place in Solano Bay is safe.'); }
      }
      this.camera(dt);
    },
    camera(dt) {
      if (SF.shots && SF.shots.active) return;
      const radius = this.inCar ? 12 : 7, height = this.inCar ? 4.8 : 3.2;
      const target = this.pos.clone().add(new THREE.Vector3(Math.sin(this.yaw) * radius * Math.cos(this.pitch), height + Math.sin(this.pitch) * 6, Math.cos(this.yaw) * radius * Math.cos(this.pitch)));
      const cam = SF.render.camera; cam.position.lerp(target, 1 - Math.exp(-dt * 9)); cam.lookAt(this.pos.x, this.pos.y + 1.4, this.pos.z);
    }
  };
  SF.player = player;
})(window.SF);
