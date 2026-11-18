(function (SF) {
  'use strict';
  const cars = []; let hiddenTime = 0, clock = 0;
  const police = { wanted: 0, bustedMeter: 0, state: 'clear', cars,
    addHeat(n) { this.wanted = Math.min(5, Math.max(0, this.wanted + n)); hiddenTime = 0; this.state = this.wanted ? 'pursuit' : 'clear'; },
    clear() { this.wanted = 0; this.bustedMeter = 0; hiddenTime = 0; this.state = 'clear'; for (const c of cars) c.mesh.visible = false; },
    spawn(x, z) {
      let c = cars.find(c => !c.mesh.visible);
      if (!c) {
        c = SF.vehicles.createCar(0x161d29); c.kind = 'police';
        SF.vehicles.box(c.mesh, 2.73, 0.55, 2.3, 0, 1.15, 0, 0xeee6d9);
        c.red = SF.vehicles.box(c.mesh, 0.9, 0.25, 0.4, -0.5, 2.55, 0, 0xff334a, true);
        c.blue = SF.vehicles.box(c.mesh, 0.9, 0.25, 0.4, 0.5, 2.55, 0, 0x398dff, true); cars.push(c);
      }
      c.mesh.visible = true; c.pos.set(x, 0, z); SF.vehicles.resolve(c.pos, 2.2); c.speed = 0; c.drift = c.heading = 0; return c;
    },
    update(dt) {
      if (!SF.player || SF.player.recovering) return;
      clock += dt; const p = SF.player.pos;
      if (!this.wanted) { this.bustedMeter = Math.max(0, this.bustedMeter - dt); this.state = 'clear'; for (const c of cars) c.mesh.visible = false; return; }
      const active = cars.filter(c => c.mesh.visible);
      if (active.length < Math.min(6, this.wanted + 1)) {
        const angle = SF.random.range(0, Math.PI * 2); this.spawn(p.x + Math.sin(angle) * 100, p.z + Math.cos(angle) * 100);
      }
      let seen = false, close = false;
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i]; if (!c.mesh.visible) continue;
        let dx = p.x - c.pos.x, dz = p.z - c.pos.z, d = Math.hypot(dx, dz);
        if (d > 330) { c.pos.set(p.x + (i % 2 ? 100 : -100), 0, p.z + 100); SF.vehicles.resolve(c.pos, 2.2); }
        let occluded = false;
        for (const b of SF.city.colliders) {
          const t = Math.max(0, Math.min(1, ((b.x - c.pos.x) * dx + (b.z - c.pos.z) * dz) / (d * d || 1)));
          if (t > 0.05 && t < 0.95 && Math.hypot(c.pos.x + dx * t - b.x, c.pos.z + dz * t - b.z) < b.r * 0.75) { occluded = true; break; }
        }
        if (d < 95 && !occluded) seen = true;
        if (d < 8 && !occluded) close = true;
        const lead = SF.player.inCar;
        dx += lead ? Math.sin(lead.heading) * lead.speed * 0.6 : 0;
        dz += lead ? Math.cos(lead.heading) * lead.speed * 0.6 : 0;
        const target = Math.atan2(dx, dz), delta = Math.atan2(Math.sin(target - c.heading), Math.cos(target - c.heading));
        SF.vehicles.step(c, dt, d > 5 ? 0.85 : -0.3, Math.max(-1, Math.min(1, delta * 2)), Math.abs(delta) > 1.3 && c.speed > 12);
        const blink = SF.CONFIG.wanted.lightbarBlinkRate;
        c.red.material.emissiveIntensity = Math.sin(clock * blink + i) > 0 ? 4 : 0.1;
        c.blue.material.emissiveIntensity = Math.sin(clock * blink + i) > 0 ? 0.1 : 4;
      }
      const slow = !SF.player.inCar || Math.abs(SF.player.inCar.speed) < 4;
      this.bustedMeter = Math.max(0, Math.min(1, this.bustedMeter + (close && slow ? dt / 4 : -dt / 3)));
      if (this.bustedMeter >= 1) { SF.player.respawn('busted'); return; }
      hiddenTime = seen ? 0 : hiddenTime + dt;
      this.state = seen ? 'pursuit' : 'searching';
      if (hiddenTime >= SF.CONFIG.wanted.decaySeconds) { this.wanted--; hiddenTime = 0; }
    }
  };
  SF.police = police;
})(window.SF);
